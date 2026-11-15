import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_focus_next_key_2024';

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

// =====================
// 🔒 SÉCURITÉ GLOBALE
// =====================

// 1. Protection des en-têtes HTTP (anti-XSS, Clickjacking, etc.)
app.use(helmet());

// 2. Configuration CORS stricte (Seulement le Frontend de Focus Next)
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://127.0.0.1:5173', 
  'http://127.0.0.1:5174', 
  'http://localhost:3000', 
  'https://focustickets.focus.labs',
  process.env.FRONTEND_URL
].filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par la politique CORS (Cross-Origin)'));
    }
  },
  credentials: true
}));

// 3. Protection anti-DDoS et anti Brute-Force (Rate Limiting)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Fenêtre de 15 minutes
  max: 5000, // Limite augmentée à 5000 pour permettre les imports massifs
  message: { error: 'Trop de requêtes détectées depuis cette adresse IP. Veuillez patienter.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// On applique cette limite globale à toutes les requêtes API
app.use('/api/', apiLimiter);

app.use(express.json());

// =====================
// 🔐 AUTHENTIFICATION & SÉCURITÉ (JWT)
// =====================

export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Jeton d'authentification manquant." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
    if (err) return res.status(403).json({ error: "Jeton expiré ou compromis. Veuillez vous reconnecter." });
    req.user = decodedUser;
    next();
  });
}

// 📌 Route de Connexion (Login)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) return res.status(400).json({ error: "Identifiants manquants." });

    // Accepter la connexion par Email ou Nom d'utilisateur
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: username }, { name: username }] }
    });

    if (!user) return res.status(401).json({ error: "Identifiants incorrects." });

    // Vérification du mot de passe (Compatibilité texte clair temporaire pendant la migration vs haché)
    let isMatch = false;
    if (password === user.password) {
      isMatch = true; // Si l'admin a gardé un ancien mot de passe non crypté temporairerment
    } else {
      isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    }

    if (!isMatch) return res.status(401).json({ error: "Identifiants incorrects." });

    // Génération du JWT (Valable 8h)
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // On ne renvoie jamais le mot de passe, même haché, dans la réponse !!
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur serveur critique." });
  }
});

// =====================
// HELPER: Générer le prochain numéro de ticket (R-000001, R-000002...)
// =====================
async function generateTicketNumber(): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    where: { ticketNumber: { startsWith: "R-" } },
    select: { ticketNumber: true }
  });

  if (tickets.length === 0) return "R-000036";

  // Extraire les nombres et trouver le maximum
  const nums = tickets.map(t => {
    const raw = t.ticketNumber?.replace("R-", "") || "0";
    return parseInt(raw, 10);
  }).filter(n => !isNaN(n));

  const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
  return `R-${String(maxNum + 1).padStart(6, "0")}`;
}

// =====================
// ROUTES TICKETS
// =====================

// Statuts de ticket gérés par l'application
const TICKET_STATUSES = ['open', 'closed', 'archived'];

// Lit un paramètre de requête multi-valeurs : ?x=a&x=b, ?x[]=a&x[]=b ou ?x=a,b
function readListParam(query: any, key: string): string[] {
  const raw = query[key] ?? query[`${key}[]`];
  if (raw === undefined || raw === null || raw === '') return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .flatMap((v: any) => String(v).split(','))
    .map((v: string) => v.trim())
    .filter((v: string) => v !== '');
}

// Lit une date de requête (AAAA-MM-JJ). endOfDay inclut toute la journée.
function readDateParam(value: any, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

// Construit le filtre Prisma des tickets à partir des paramètres de requête
function buildTicketWhere(query: any) {
  const and: any[] = [];

  const search = String(query.search || '').trim();
  if (search) {
    and.push({
      OR: [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { equipment: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { site: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  // Statut : les tickets archivés sont masqués sauf s'ils sont demandés explicitement
  const status = readListParam(query, 'status');
  if (status.length > 0) {
    and.push({ status: { in: status } });
  } else if (String(query.includeArchived) !== 'true') {
    and.push({ status: { not: 'archived' } });
  }

  const priority = readListParam(query, 'priority');
  if (priority.length > 0) and.push({ priority: { in: priority } });

  const category = readListParam(query, 'category');
  if (category.length > 0) and.push({ category: { in: category } });

  const site = readListParam(query, 'site');
  if (site.length > 0) and.push({ site: { in: site } });

  // Intervenant : ids d'utilisateurs, ou "none" pour les tickets non attribués
  const assignee = readListParam(query, 'assigneeId');
  if (assignee.length > 0) {
    const ids = assignee.filter(a => a !== 'none');
    const or: any[] = [];
    if (ids.length > 0) or.push({ assigneeId: { in: ids } });
    if (assignee.includes('none')) or.push({ assigneeId: null });
    and.push({ OR: or });
  }

  const creator = readListParam(query, 'creatorId');
  if (creator.length > 0) and.push({ creatorId: { in: creator } });

  const equipment = String(query.equipment || '').trim();
  if (equipment) and.push({ equipment: { contains: equipment, mode: 'insensitive' } });

  const serialNumber = String(query.serialNumber || '').trim();
  if (serialNumber) and.push({ serialNumber: { contains: serialNumber, mode: 'insensitive' } });

  const createdFrom = readDateParam(query.createdFrom);
  const createdTo = readDateParam(query.createdTo, true);
  if (createdFrom || createdTo) {
    and.push({ createdAt: { ...(createdFrom && { gte: createdFrom }), ...(createdTo && { lte: createdTo }) } });
  }

  const resolvedFrom = readDateParam(query.resolvedFrom);
  const resolvedTo = readDateParam(query.resolvedTo, true);
  if (resolvedFrom || resolvedTo) {
    and.push({ resolvedAt: { ...(resolvedFrom && { gte: resolvedFrom }), ...(resolvedTo && { lte: resolvedTo }) } });
  }

  return and.length > 0 ? { AND: and } : {};
}

// GET valeurs disponibles pour les filtres de la page Tickets
app.get('/api/tickets/filter-options', async (_req, res) => {
  try {
    const [sites, categories, priorities, assignees, creators] = await Promise.all([
      prisma.ticket.findMany({ where: { site: { not: null } }, distinct: ['site'], select: { site: true }, orderBy: { site: 'asc' } }),
      prisma.ticket.findMany({ where: { category: { not: null } }, distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } }),
      prisma.ticket.findMany({ distinct: ['priority'], select: { priority: true } }),
      prisma.user.findMany({ where: { assignedTickets: { some: {} } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.user.findMany({ where: { createdTickets: { some: {} } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);

    res.json({
      statuses: TICKET_STATUSES,
      sites: sites.map(s => s.site).filter((s): s is string => !!s && s !== '-'),
      categories: categories.map(c => c.category).filter((c): c is string => !!c),
      priorities: priorities.map(p => p.priority).filter(Boolean),
      assignees,
      creators,
    });
  } catch (error) {
    console.error('Error fetching ticket filter options:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des options de filtre' });
  }
});

// GET tous les tickets avec pagination et filtres
app.get('/api/tickets', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 13,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = buildTicketWhere(req.query);

    // Gestion des tris autorisés
    const validSortFields = ['ticketNumber', 'createdAt', 'resolvedAt', 'priority', 'status'];
    const finalSortBy = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const finalSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: true,
          assignee: true,
          asset: true,
          comments: { include: { author: true } },
          // Les interventions détaillées ne sont chargées que sur demande (export détaillé)
          ...(String(req.query.includeInterventions) === 'true'
            ? { interventions: { orderBy: { stepNumber: 'asc' as const } } }
            : {}),
          _count: { select: { interventions: true } },
        },
        orderBy: { [finalSortBy]: finalSortOrder },
        skip,
        take,
      }),
      prisma.ticket.count({ where })
    ]);

    res.json({
      tickets,
      pagination: {
        total,
        pages: Math.ceil(total / take),
        currentPage: Number(page),
        limit: take
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
  }
});

// POST créer un ticket
app.post('/api/tickets', async (req, res) => {
  const { 
    ticketNumber: providedNumber, title, subject, description, category, priority, 
    status: providedStatus, createdBy, assignedTo, equipment, assetId, site, 
    actions, comment, resolvedAt, createdAt, actionPlan 
  } = req.body;
  
  try {
    // Résoudre ou Créer creatorId (Demandeur)
    let creatorId: string | undefined;
    if (createdBy && createdBy.trim() !== "") {
      const cleanName = createdBy.trim();
      // On cherche par nom ou email avec insensibilité à la casse (PostgreSQL)
      let creator = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { name: { equals: cleanName, mode: 'insensitive' } }, 
            { email: { equals: cleanName, mode: 'insensitive' } }
          ] 
        } 
      });
      
      // Si non trouvé, on le crée automatiquement (Utile pour les imports)
      if (!creator) {
        try {
          creator = await prisma.user.create({
            data: {
              name: cleanName,
              email: `${cleanName.toLowerCase().replace(/\s/g, '.')}@imported.com`, // Email bidon unique
              password: 'imported_user_pw',
              role: 'demandeur' // Demandeur comme demandé
            }
          });
          console.log(`Utilisateur auto-créé: ${cleanName}`);
        } catch (e: any) {
          // Fallback final si email déjà pris par un autre nom
          creator = await prisma.user.findFirst();
        }
      }
      creatorId = creator?.id;
    }
    
    if (!creatorId) {
      const fallback = await prisma.user.findFirst();
      creatorId = fallback?.id;
    }
    
    if (!creatorId) return res.status(400).json({ error: "Aucun utilisateur système disponible." });

    // Résoudre ou Créer assigneeId (Attribué à)
    let assigneeId: string | undefined;
    if (assignedTo && assignedTo !== 'none' && assignedTo !== '' && assignedTo !== '-') {
      const cleanAssignee = assignedTo.trim();
      let assignee = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { name: { equals: cleanAssignee, mode: 'insensitive' } }, 
            { email: { equals: cleanAssignee, mode: 'insensitive' } }
          ] 
        } 
      });
      
      if (!assignee) {
        try {
          assignee = await prisma.user.create({
            data: {
              name: cleanAssignee,
              email: `${cleanAssignee.toLowerCase().replace(/\s/g, '.')}@imported.com`,
              password: 'imported_user_pw',
              role: 'tech' // On assume que l'attribué est un technicien
            }
          });
          console.log(`Technicien auto-créé: ${cleanAssignee}`);
        } catch (e) {
           assignee = null;
        }
      }
      assigneeId = assignee?.id;
    }

    // Résoudre assetId et corriger le nom de l'équipement
    let resolvedAssetId: string | null = null;
    let finalEquipment = equipment;
    let finalSerialNumber = req.body.serialNumber || (req.body.serial ? req.body.serial : null);

    // Si un numéro de série est fourni, il est PRIORITAIRE pour identifier l'actif
    const serialNum = finalSerialNumber;

    if (serialNum && serialNum !== 'N/A' && serialNum !== '-') {
      const asset = await prisma.asset.findFirst({
        where: { serialNumber: serialNum }
      });

      if (asset) {
        resolvedAssetId = asset.id;
        // On remplace le nom de l'équipement par le vrai nom du produit de l'actif
        finalEquipment = asset.produit || asset.name;
        console.log(`Liaison auto via S/N ${serialNum}: Actif trouvé (${finalEquipment})`);
      }
    }

    // Fallback si pas de S/N ou actif non trouvé
    if (!resolvedAssetId) {
      if (assetId && assetId !== 'none') {
        resolvedAssetId = assetId;
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (asset) finalEquipment = asset.produit || asset.name;
      } else if (equipment && equipment !== 'Autre' && equipment !== '' && equipment !== 'N/A') {
        const asset = await prisma.asset.findFirst({ where: { name: equipment } });
        resolvedAssetId = asset?.id || null;
        if (asset) finalEquipment = asset.produit || asset.name;
      }
    }

    // Priorité au numéro fourni (Excel) sinon génération auto
    const ticketNumber = providedNumber || await generateTicketNumber();

    // Map status français si importé
    let status = providedStatus || 'open';
    const sLower = String(status).toLowerCase();
    if (sLower === 'clôturé' || sLower === 'cloturé' || sLower === 'résolu' || sLower === 'resolved' || sLower === 'closed') {
      status = 'closed';
    } else if (sLower === 'en cours' || sLower === 'in-progress') {
      status = 'in-progress';
    } else if (sLower === 'archivé' || sLower === 'archive' || sLower === 'archived') {
      status = 'archived';
    } else {
      status = 'open';
    }

    // Utilisation de upsert pour éviter les erreurs de doublons sur ticketNumber (idempotence)
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: ticketNumber },
      update: {
        title: title || subject || undefined,
        description: description || subject || undefined,
        status: status,
        priority: priority || undefined,
        category: category || undefined,
        equipment: finalEquipment || undefined,
        site: site || undefined,
        actions: actions || undefined,
        actionPlan: actionPlan || undefined,
        assigneeId: assigneeId || null,
        assetId: resolvedAssetId,
        comment: comment || undefined,
        serialNumber: finalSerialNumber || undefined,
        resolvedAt: (resolvedAt && typeof resolvedAt === 'string' && resolvedAt.trim() !== "")
          ? (isNaN(new Date(resolvedAt).getTime()) ? null : new Date(resolvedAt))
          : undefined,
      },
      create: {
        ticketNumber,
        title: title || subject || ticketNumber || 'Ticket sans titre (Importé)',
        description: description || subject || 'Importé de Excel/CSV',
        status: status,
        priority: priority || 'medium',
        category: category || 'other',
        equipment: finalEquipment || 'N/A',
        site: site || null,
        actions: actions || null,
        actionPlan: actionPlan || null,
        creatorId,
        assigneeId: assigneeId || null,
        assetId: resolvedAssetId,
        comment: comment || null,
        serialNumber: finalSerialNumber || null,
        createdAt: (createdAt && !isNaN(new Date(createdAt).getTime())) ? new Date(createdAt) : undefined,
        resolvedAt: (resolvedAt && typeof resolvedAt === 'string' && resolvedAt.trim() !== "")
          ? (isNaN(new Date(resolvedAt).getTime()) ? null : new Date(resolvedAt))
          : null,
      },
    });

    // Si un commentaire initial est fourni, on le crée en base
    if (comment && comment.trim() !== "") {
      console.log(`Création d'un commentaire initial pour le ticket ${ticketNumber}:`, comment);
      await prisma.comment.create({
        data: {
          content: comment,
          ticketId: ticket.id,
          authorId: creatorId,
        }
      });
    } else {
      console.log(`Aucun commentaire initial pour le ticket ${ticketNumber}`);
    }

    res.status(201).json(ticket);
  } catch (error: any) {
    console.error('Erreur création ticket:', error);
    res.status(500).json({ error: 'Erreur lors de la création du ticket', details: error.message });
  }
});

// PUT modifier un ticket
app.put('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, category, site, actions, assignedTo, assetId, equipment, comment, resolvedAt, actionPlan } = req.body;
  try {
    let assigneeId: string | undefined | null = undefined;
    if (assignedTo === '' || assignedTo === 'none') {
      assigneeId = null;
    } else if (assignedTo) {
      const assignee = await prisma.user.findFirst({ where: { OR: [{ name: assignedTo }, { email: assignedTo }] } });
      assigneeId = assignee?.id;
    }

    let resolvedAssetId: string | undefined | null = undefined;
    if (assetId) {
      resolvedAssetId = assetId;
    } else if (equipment === 'Autre' || equipment === '' || equipment === 'N/A') {
      resolvedAssetId = null;
    } else if (equipment) {
      const asset = await prisma.asset.findFirst({ where: { name: equipment } });
      resolvedAssetId = asset?.id || null;
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) {
      // 'in-progress' et 'resolved' restent acceptés pour les anciens tickets
      if (![...TICKET_STATUSES, 'in-progress', 'resolved'].includes(status)) {
        return res.status(400).json({ error: `Statut invalide : ${status}` });
      }
      data.status = status;
    }
    if (priority !== undefined) data.priority = priority;
    if (category !== undefined) data.category = category;
    if (site !== undefined) data.site = site;
    if (actions !== undefined) data.actions = actions;
    if (actionPlan !== undefined) data.actionPlan = actionPlan || null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (resolvedAssetId !== undefined) data.assetId = resolvedAssetId;
    if (comment !== undefined) data.comment = comment;
    if (resolvedAt !== undefined) {
      if (resolvedAt && typeof resolvedAt === 'string' && resolvedAt.trim() !== "") {
        const date = new Date(resolvedAt);
        data.resolvedAt = isNaN(date.getTime()) ? null : date;
      } else {
        data.resolvedAt = null;
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: data
    });

    // Créer un commentaire si fourni
    if (comment && comment.trim() !== "") {
      // On cherche un admin, sinon n'importe quel utilisateur pour l'ID auteur
      let author = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (!author) author = await prisma.user.findFirst();

      if (author) {
        await prisma.comment.create({
          data: {
            content: comment,
            ticketId: ticket.id,
            authorId: author.id,
          }
        });
      }
    }

    res.json(ticket);
  } catch (error: any) {
    console.error('Erreur modification ticket:', error);
    res.status(500).json({ error: 'Erreur lors de la modification', details: error.message });
  }
});

// DELETE supprimer un ticket
app.delete('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.comment.deleteMany({ where: { ticketId: id } });
    await prisma.ticket.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    console.error('Erreur suppression ticket:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression', details: error.message });
  }
});

// =====================
// ROUTES INTERVENTIONS (étapes successives d'un ticket)
// =====================

// Transforme les champs reçus en données d'intervention valides
function parseInterventionBody(body: any) {
  const data: any = {};
  if (body.performedAt !== undefined) {
    const d = new Date(body.performedAt);
    if (!isNaN(d.getTime())) data.performedAt = d;
  }
  if (body.technician !== undefined) data.technician = String(body.technician || '').trim() || null;
  if (body.actions !== undefined) data.actions = String(body.actions || '').trim();
  if (body.result !== undefined) data.result = String(body.result || '').trim() || null;
  if (body.nextSteps !== undefined) data.nextSteps = String(body.nextSteps || '').trim() || null;
  if (body.durationMinutes !== undefined) {
    const n = parseInt(body.durationMinutes, 10);
    data.durationMinutes = isNaN(n) || n < 0 ? null : n;
  }
  if (body.statusAfter !== undefined) {
    data.statusAfter = TICKET_STATUSES.includes(body.statusAfter) ? body.statusAfter : null;
  }
  return data;
}

// Applique au ticket le statut choisi après l'intervention
async function applyStatusAfter(ticketId: string, statusAfter: string | null | undefined, performedAt?: Date) {
  if (!statusAfter) return;
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status === statusAfter) return;
  const data: any = { status: statusAfter };
  if (statusAfter === 'closed' && !ticket.resolvedAt) data.resolvedAt = performedAt || new Date();
  if (statusAfter === 'open') data.resolvedAt = null;
  await prisma.ticket.update({ where: { id: ticketId }, data });
}

// GET liste des interventions d'un ticket, dans l'ordre des étapes
app.get('/api/tickets/:id/interventions', async (req, res) => {
  try {
    const interventions = await prisma.intervention.findMany({
      where: { ticketId: req.params.id },
      orderBy: { stepNumber: 'asc' },
    });
    res.json(interventions);
  } catch (error) {
    console.error('Erreur lecture interventions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des interventions' });
  }
});

// POST ajouter une intervention (nouvelle étape)
app.post('/api/tickets/:id/interventions', async (req, res) => {
  const { id } = req.params;
  try {
    const data = parseInterventionBody(req.body);
    if (!data.actions) return res.status(400).json({ error: 'Les actions réalisées sont obligatoires.' });

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });

    const last = await prisma.intervention.findFirst({ where: { ticketId: id }, orderBy: { stepNumber: 'desc' } });
    const intervention = await prisma.intervention.create({
      data: { ...data, ticketId: id, stepNumber: (last?.stepNumber ?? 0) + 1 },
    });

    await applyStatusAfter(id, intervention.statusAfter, intervention.performedAt);
    res.status(201).json(intervention);
  } catch (error: any) {
    console.error('Erreur création intervention:', error);
    res.status(500).json({ error: "Erreur lors de l'ajout de l'intervention", details: error.message });
  }
});

// PUT modifier une intervention
app.put('/api/tickets/:id/interventions/:interventionId', async (req, res) => {
  const { id, interventionId } = req.params;
  try {
    const data = parseInterventionBody(req.body);
    if (data.actions === '') return res.status(400).json({ error: 'Les actions réalisées sont obligatoires.' });

    const existing = await prisma.intervention.findFirst({ where: { id: interventionId, ticketId: id } });
    if (!existing) return res.status(404).json({ error: 'Intervention introuvable.' });

    const intervention = await prisma.intervention.update({ where: { id: interventionId }, data });
    if (data.statusAfter !== undefined) await applyStatusAfter(id, intervention.statusAfter, intervention.performedAt);
    res.json(intervention);
  } catch (error: any) {
    console.error('Erreur modification intervention:', error);
    res.status(500).json({ error: "Erreur lors de la modification de l'intervention", details: error.message });
  }
});

// DELETE supprimer une intervention, puis renuméroter les étapes suivantes
app.delete('/api/tickets/:id/interventions/:interventionId', async (req, res) => {
  const { id, interventionId } = req.params;
  try {
    const existing = await prisma.intervention.findFirst({ where: { id: interventionId, ticketId: id } });
    if (!existing) return res.status(404).json({ error: 'Intervention introuvable.' });

    await prisma.$transaction([
      prisma.intervention.delete({ where: { id: interventionId } }),
      prisma.intervention.updateMany({
        where: { ticketId: id, stepNumber: { gt: existing.stepNumber } },
        data: { stepNumber: { decrement: 1 } },
      }),
    ]);
    res.status(204).send();
  } catch (error: any) {
    console.error('Erreur suppression intervention:', error);
    res.status(500).json({ error: "Erreur lors de la suppression de l'intervention", details: error.message });
  }
});

// =====================
// ROUTES ASSETS
// =====================

// GET tous les assets avec pagination
app.get('/api/assets', async (req, res) => {
  try {
    const { page = 1, limit = 13, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { serialNumber: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } },
        { produit: { contains: String(search), mode: 'insensitive' } },
        { projet: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { assignedToUser: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.asset.count({ where })
    ]);

    res.json({
      assets,
      pagination: {
        total,
        pages: Math.ceil(total / take),
        currentPage: Number(page),
        limit: take
      }
    });
  } catch (error) {
    console.error("Fetch assets error:", error);
    res.status(500).json({ error: 'Erreur lors de la récupération des actifs' });
  }
});

// POST créer un actif
app.post('/api/assets', async (req, res) => {
  try {
    const { name, type, serialNumber, projet, fabricant, produit, modele, site, status, purchaseDate } = req.body;
    const newAsset = await prisma.asset.create({
      data: {
        name: name || produit || 'Équipement sans nom',
        type: type || 'computer',
        serialNumber: serialNumber || null,
        projet: projet || null,
        fabricant: fabricant || null,
        produit: produit || null,
        modele: modele || null,
        site: site || null,
        status: status || 'active',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      },
    });
    res.status(201).json(newAsset);
  } catch (error: any) {
    console.error("Erreur création actif:", error);
    res.status(500).json({ error: "Erreur lors de la création de l'équipement", details: error.message });
  }
});

// PUT modifier un actif
app.put('/api/assets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { name, type, serialNumber, projet, fabricant, produit, modele, site, status } = req.body;
    const updated = await prisma.asset.update({
      where: { id },
      data: {
        name: name || produit || undefined,
        type: type || undefined,
        serialNumber: serialNumber || null,
        projet: projet || null,
        fabricant: fabricant || null,
        produit: produit || null,
        modele: modele || null,
        site: site || null,
        status: status || undefined,
      },
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Erreur modification actif:", error);
    res.status(500).json({ error: "Erreur lors de la modification", details: error.message });
  }
});

// DELETE supprimer un actif
app.delete('/api/assets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Détacher les tickets qui référencent cet actif
    await prisma.ticket.updateMany({ where: { assetId: id }, data: { assetId: null } });
    await prisma.asset.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    console.error("Erreur suppression actif:", error);
    res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  }
});

// =====================
// ROUTES UTILISATEURS
// =====================

// GET tous les utilisateurs avec pagination
app.get('/api/users', async (req, res) => {
  try {
    const { page = 1, limit = 13, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { department: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        total,
        pages: Math.ceil(total / take),
        currentPage: Number(page),
        limit: take
      }
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, department, status, password } = req.body;

    // Hachage du mot de passe avant insertion en BD (Sécurité Bcrypt)
    const plainPassword = password || 'default_password';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'demandeur',
        department,
        status: status || 'active'
      },
    });

    const { password: _, ...userSafe } = newUser;
    res.status(201).json(userSafe);
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur", details: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, status } = req.body;
    const updated = await prisma.user.update({ where: { id }, data: { name, email, role, department, status } });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la modification", details: error.message });
  }
});

app.put('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.user.update({ where: { id }, data: { status } });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut", details: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Transaction pour nettoyer les relations avant suppression (éviter les erreurs de contrainte)
    await prisma.$transaction([
      // 1. Désassigner les tickets où l'utilisateur est intervenant
      prisma.ticket.updateMany({
        where: { assigneeId: id },
        data: { assigneeId: null }
      }),
      // 2. Détacher l'utilisateur des actifs
      prisma.asset.updateMany({
        where: { userId: id },
        data: { userId: null }
      }),
      // 3. Supprimer les commentaires de l'utilisateur
      prisma.comment.deleteMany({
        where: { authorId: id }
      }),
      // 4. Supprimer les tickets créés par cet utilisateur (car creatorId est obligatoire)
      prisma.ticket.deleteMany({
        where: { creatorId: id }
      }),
      // 5. Enfin, supprimer l'utilisateur
      prisma.user.delete({
        where: { id }
      })
    ]);

    res.status(204).send();
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur", details: error.message });
  }
});
// =====================
// ROUTES BASE DE CONNAISSANCE
// =====================

// GET tous les articles
app.get('/api/knowledge', async (req, res) => {
  try {
    const articles = await prisma.knowledgeArticle.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
  }
});

// POST créer un article
app.post('/api/knowledge', async (req, res) => {
  try {
    const { title, content, category, author, tags } = req.body;
    const article = await prisma.knowledgeArticle.create({
      data: {
        title: title || 'Sans titre',
        content: content || '',
        category: category || 'Autre',
        author: author || 'Admin',
        tags: tags || [],
      },
    });
    res.status(201).json(article);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'article', details: error.message });
  }
});

// PUT modifier un article
app.put('/api/knowledge/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { title, content, category, author, tags, views } = req.body;
    const updated = await prisma.knowledgeArticle.update({
      where: { id },
      data: { title, content, category, author, tags, views },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la modification', details: error.message });
  }
});

// DELETE supprimer un article
app.delete('/api/knowledge/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.knowledgeArticle.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la suppression', details: error.message });
  }
});

// =====================
// CONFIG DATABASE
// =====================
app.post('/api/config/database', async (req, res) => {
  const { host, port: dbPort, database, username, password } = req.body;
  const newUrl = `postgresql://${username}:${password}@${host}:${dbPort}/${database}?schema=public`;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${newUrl}"`);
    fs.writeFileSync(envPath, envContent);
    res.json({ message: 'Configuration mise à jour.' });
    setTimeout(() => process.exit(0), 1000);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur de configuration', details: error.message });
  }
});

app.get('/', (req, res) => res.send('API Ticketary — Backend opérationnel ✅'));

app.listen(+port, '0.0.0.0', () => {
  console.log(`Serveur backend démarré sur: http://0.0.0.0:${port}`);
  console.log('Connecté à PostgreSQL: 192.168.3.7:5432');
});

// =====================
// PERSISTENT SETTINGS
// =====================
const SETTINGS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../settings.json');

const defaultSettings = {
  general: {
    siteName: "Focus Next Computing - Support",
    supportEmail: "support@focusnext.com",
    language: "fr",
    timezone: "GMT"
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true
  },
  security: {
    sessionTimeout: 60
  }
};

app.get('/api/config/settings', (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json(defaultSettings);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la lecture des paramètres' });
  }
});

app.post('/api/config/settings', (req, res) => {
  try {
    const settings = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({ message: 'Paramètres sauvegardés avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des paramètres' });
  }
});
