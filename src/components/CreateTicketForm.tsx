import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createTicket, updateTicket } from "@/data/ticketService";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getAssets } from "@/data/assetService";
import { getUsers } from "@/data/userService";
import { Asset as AssetType } from "@/types/asset";
import { User } from "@/types/user";
import { addNotification } from "@/utils/notificationUtils";

const formSchema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1, "Le titre est requis."),
  description: z.string().min(1, "La description est requise."),
  status: z.enum(["open", "in-progress", "resolved", "closed", "archived"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  createdBy: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  equipment: z.string().optional(),
  serialNumber: z.string().optional(),
  site: z.string().optional(),
  actions: z.string().optional(),
  actionPlan: z.string().optional(),
  resolvedAt: z.string().optional().nullable(),
  comment: z.string().optional(),
  createdAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateTicketForm({ ticket, onSuccess }: { ticket?: any, onSuccess?: () => void }) {
  const [dbAssets, setDbAssets] = useState<AssetType[]>([]);
  const [dbUsers, setDbUsers] = useState<User[]>([]);

  useEffect(() => {
    getAssets({ limit: 1000 }).then(res => setDbAssets(res.assets));
    getUsers({ limit: 1000 }).then(res => setDbUsers(res.users));
  }, []);

  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const statusMap: Record<string, string> = {
    'Ouvert': 'open',
    'En cours': 'in-progress',
    'Résolu': 'resolved',
    'Clos': 'closed',
    'Archivé': 'archived'
  };
  
  const priorityMap: Record<string, string> = {
    'Basse': 'low',
    'Moyenne': 'medium',
    'Haute': 'high',
    'Critique': 'critical',
    'Urgent': 'urgent',
    'Urgente': 'urgent'
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: ticket?.id || `TICKET-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: ticket?.subject || ticket?.title || "",
      description: ticket?.description || "",
      status: (statusMap[ticket?.status] || ticket?.status || "open") as any,
      priority: (priorityMap[ticket?.priority] || ticket?.priority || "medium") as any,
      createdBy: ticket?.createdBy || "Utilisateur Actuel",
      assignedTo: ticket?.assignedTo || "",
      assetId: ticket?.assetId || "",
      equipment: ticket?.equipment === 'N/A' ? "" : (ticket?.equipment || ""),
      serialNumber: ticket?.serialNumber === 'N/A' ? "" : (ticket?.serialNumber || ""),
      site: (ticket?.site === 'Non défini' ? 'SAPINO' : (ticket?.site || "SAPINO")),
      actions: ticket?.actions || "",
      actionPlan: ticket?.actionPlan || "",
      resolvedAt: ticket?.resolvedAt || "",
      comment: ticket?.comment || "",
      createdAt: ticket?.createdAt || new Date().toISOString().split('T')[0],
    },
  });

  const handleCreateTicket = async () => {
    const data = form.getValues();
    if (!data.subject || data.subject.trim() === "") {
      toast({ variant: "destructive", title: "Erreur", description: "Le titre du ticket est requis." });
      setStep(1);
      return;
    }
    if (!data.description || data.description.trim() === "") {
      toast({ variant: "destructive", title: "Erreur", description: "La description est requise." });
      setStep(2);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.subject,
        description: data.description,
        priority: data.priority || "medium",
        status: data.status || "open",
        category: "other",
        createdBy: data.createdBy || "",
        assignedTo: data.assignedTo || null,
        equipment: data.equipment || "",
        assetId: data.assetId || null,
        serialNumber: data.serialNumber || "",
        site: data.site || "",
        actions: data.actions || "",
        actionPlan: data.actionPlan || "",
        comment: data.comment || "",
        resolvedAt: data.resolvedAt || null,
        createdAt: data.createdAt || null,
      } as any;

      if (ticket?.id) {
        await updateTicket(ticket.id, payload);
        const ticketNum = ticket.ticketNumber || ticket.id;
        addNotification("Ticket Modifié", `Le ticket ${ticketNum} a été mis à jour par ${data.createdBy || 'un agent'}.`, data.createdBy);
        toast({ title: "Ticket mis à jour", description: "Le ticket a été modifié avec succès." });
      } else {
        const result = await createTicket(payload) as any;
        const ticketNum = result.ticketNumber || "Nouveau";
        addNotification("Nouveau Ticket", `Un nouveau ticket (${ticketNum}) a été créé par ${data.createdBy || 'un demandeur'}.`, data.createdBy);
        toast({ title: "Ticket créé", description: "Le ticket a été créé avec succès." });
        form.reset();
        setStep(1);
      }
      
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      window.dispatchEvent(new Event('tickets-updated'));
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error processing ticket:", error);
      const msg = error?.response?.data?.error || "Un problème est survenu.";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // Basic validation per step could be added here
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>Étape {step} sur 4</span>
          <span>{Math.round((step / 4) * 100)}%</span>
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {/* STEP 1: Informations Générales */}
          <div className={cn("space-y-4", step !== 1 && "hidden")}>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre (Sujet)</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre du problème" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Demandeur</FormLabel>
                    <Select onValueChange={field.onChange} key={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un demandeur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dbUsers.filter(u => u.role === 'demandeur' || u.role === 'user').map(user => (
                          <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <Select onValueChange={field.onChange} key={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SAPINO">SAPINO</SelectItem>
                        <SelectItem value="MARRAKECH">MARRAKECH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} key={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* STEP 2: Technique (Équipement) */}
          <div className={cn("space-y-4", step !== 2 && "hidden")}>
            <FormField
              control={form.control}
              name="equipment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Équipement / Module</FormLabel>
                    <Select onValueChange={(val) => {
                      if (val === "Autre") {
                        form.setValue("assetId", null);
                        form.setValue("equipment", "Autre");
                        return;
                      }
                      
                      const asset = dbAssets.find(a => a.id === val);
                      if (asset) {
                        form.setValue("assetId", asset.id);
                        form.setValue("equipment", asset.name);
                        form.setValue("serialNumber", asset.serialNumber);
                        if (asset.site) {
                          form.setValue("site", asset.site);
                        }
                      }
                    }} 
                    key={form.getValues("assetId") || form.getValues("equipment")}
                    value={form.getValues("assetId") || form.getValues("equipment")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner depuis l'inventaire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dbAssets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.serialNumber || 'S/N vide'})
                        </SelectItem>
                      ))}
                      <SelectItem value="Autre">-- Autre (Saisie manuelle) --</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {form.watch("assetId") === null && form.watch("equipment") === "Autre" && (
                    <Input 
                      className="mt-2" 
                      placeholder="Nom de l'équipement personnalisé" 
                      onChange={(e) => form.setValue("equipment", e.target.value)}
                    />
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de série</FormLabel>
                  <FormControl>
                    <Input placeholder="S/N" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description détaillée du problème</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan d'action initial</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[90px]"
                      placeholder={"Étapes prévues pour traiter le ticket, par exemple :\n1. Diagnostic sur site\n2. Remplacement de la pièce\n3. Tests et validation"}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">
                    Les interventions réalisées s'ajoutent ensuite étape par étape depuis le détail du ticket.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* STEP 3: Suivi (Statut & Attribution) */}
          <div className={cn("space-y-4", step !== 3 && "hidden")}>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="createdAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'ouverture</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    key={field.value} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open">Ouvert</SelectItem>
                      <SelectItem value="closed">Clôturé</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attribué à (Optionnel)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    key={field.value}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un agent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {dbUsers.filter(u => u.role === 'intervenant' || u.role === 'tech' || u.role === 'admin').map(user => (
                        <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* STEP 4: Résolution & Conclusion */}
          <div className={cn("space-y-4", step !== 4 && "hidden")}>
            <FormField
              control={form.control}
              name="actions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action(s) déjà menée(s)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez les actions si applicable" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resolvedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de résolution (si résolu)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire / Note interne</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes supplémentaires..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className={cn(step === 1 && "invisible")}
            >
              Précédent
            </Button>
            
            {step < 4 ? (
              <Button type="button" onClick={nextStep}>
                Suivant
              </Button>
            ) : (
              <Button type="button" onClick={handleCreateTicket} disabled={isSubmitting}>
                {isSubmitting ? (ticket?.id ? "Enregistrement..." : "Création...") : (ticket?.id ? "Mettre à jour" : "Créer le ticket")}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

