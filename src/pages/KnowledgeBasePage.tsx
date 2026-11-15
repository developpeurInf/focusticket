import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SearchIcon,
  BookOpen,
  HelpCircle,
  ChevronRight,
  PlusCircle,
  FileText,
  TrendingUp,
  Tag,
  Pencil,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { 
  getKnowledgeArticles, 
  createKnowledgeArticle, 
  updateKnowledgeArticle, 
  deleteKnowledgeArticle,
  KnowledgeArticle as DBArticle
} from "@/data/knowledgeService";
import { KnowledgeCategory } from "@/types/knowledge";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

const categoryLabels: Record<KnowledgeCategory, string> = {
  hardware: "Matériel",
  software: "Logiciel",
  network: "Réseau",
  procedure: "Procédure",
  general: "Général",
};

const EMPTY_ARTICLE: any = {
  title: "",
  category: "general",
  content: "",
  author: "",
  tags: [],
};

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userRole] = useState<'admin' | 'agent' | 'customer'>('admin');
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [viewArticle, setViewArticle] = useState<any | null>(null);
  const [editArticle, setEditArticle] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState(EMPTY_ARTICLE);
  const [tagsInput, setTagsInput] = useState("");

  const categories: KnowledgeCategory[] = ["hardware", "software", "network", "procedure", "general"];

  const loadArticles = async () => {
    setIsLoading(true);
    const data = await getKnowledgeArticles();
    setArticles(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch =
        searchQuery === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || article.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, articles]);

  const openCreate = () => {
    setFormData(EMPTY_ARTICLE);
    setTagsInput("");
    setIsCreating(true);
  };

  const openEdit = (article: any) => {
    setFormData({
      title: article.title,
      category: article.category as KnowledgeCategory,
      content: article.content,
      author: article.author || "",
      tags: article.tags || [],
    });
    setTagsInput((article.tags || []).join(", "));
    setEditArticle(article);
  };

  const handleSaveCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Champs requis", description: "Le titre et le contenu sont obligatoires.", variant: "destructive" });
      return;
    }
    
    try {
      const newArticle = await createKnowledgeArticle({
        ...formData,
        tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      });
      setArticles(prev => [newArticle, ...prev]);
      setIsCreating(false);
      toast({ title: "Article créé", description: `"${newArticle.title}" ajouté avec succès.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer l'article.", variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!editArticle) return;
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Champs requis", description: "Le titre et le contenu sont obligatoires.", variant: "destructive" });
      return;
    }
    
    try {
      const updated = await updateKnowledgeArticle(editArticle.id, {
        ...formData,
        tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      });
      setArticles(prev => prev.map(a => a.id === editArticle.id ? updated : a));
      setEditArticle(null);
      toast({ title: "Article modifié", description: `"${updated.title}" mis à jour.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de modifier l'article.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKnowledgeArticle(deleteTarget.id);
      setArticles(prev => prev.filter(a => a.id !== deleteTarget.id));
      toast({ title: "Article supprimé", description: `"${deleteTarget.title}" a été supprimé.` });
      setDeleteTarget(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'article.", variant: "destructive" });
    }
  };

  const handleView = async (article: any) => {
    try {
      // Incremental view logic (optional: update in DB too)
      const updated = await updateKnowledgeArticle(article.id, { views: (article.views || 0) + 1 });
      setArticles(prev => prev.map(a => a.id === article.id ? updated : a));
      setViewArticle(updated);
    } catch (error) {
      setViewArticle(article);
    }
  };



  return (
    <div className="app-shell relative flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar userRole={userRole} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header userRole={userRole} onSwitchRole={() => { }} />
        <div className="relative flex-1 overflow-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Base de connaissances (FAQ)</h1>
              <p className="text-muted-foreground">Trouvez des solutions rapides à vos problèmes techniques.</p>
            </div>
            {userRole !== 'customer' && (
              <Button className="gap-2" onClick={openCreate}>
                <PlusCircle className="h-4 w-4" />
                Ajouter un Article
              </Button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Chercher une solution (ex: VPN, imprimante, Outlook...)"
              className="pl-10 h-12 text-base shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Catégories</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-col">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`flex items-center justify-between px-6 py-3 text-sm hover:bg-muted transition-colors ${!selectedCategory ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary' : ''}`}
                    >
                      <span>Toutes ({articles.length})</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex items-center justify-between px-6 py-3 text-sm hover:bg-muted transition-colors ${selectedCategory === category ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary' : ''}`}
                      >
                        <span>{categoryLabels[category]} ({articles.filter(a => a.category === category).length})</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Articles Populaires</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3).map(article => (
                    <div
                      key={article.id}
                      className="flex items-start gap-3 cursor-pointer group"
                      onClick={() => handleView(article)}
                    >
                      <TrendingUp className="h-4 w-4 mt-1 text-primary group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">{article.title}</div>
                        <div className="text-xs text-muted-foreground">{article.views || 0} vues</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Articles grid */}
            <div className="lg:col-span-3 space-y-4">
              {filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredArticles.map((article) => (
                    <Card key={article.id} className="hover:shadow-md transition-shadow flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="capitalize text-[10px] h-5 mb-2">
                            {categoryLabels[article.category] || article.category}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleView(article)}
                              title="Voir l'article"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {userRole !== 'customer' && (
                              <>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => openEdit(article)}
                                  title="Modifier"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(article)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base leading-tight cursor-pointer hover:text-primary" onClick={() => handleView(article)}>
                          {article.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {article.content.replace(/[#*`]/g, '')}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.tags.map(tag => (
                            <div key={tag} className="flex items-center text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {tag}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t mt-auto text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {article.author || "Anonyme"}
                          </span>
                          <span className="flex items-center gap-2">
                            <Eye className="h-3 w-3" />
                            {article.views || 0} vues · Mis à jour le {new Date(article.updatedAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Aucun article trouvé</h3>
                  <p className="text-muted-foreground">Essayez d'autres mots-clés ou créez un nouvel article.</p>
                  <Button variant="ghost" className="mt-4" onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}>
                    Réinitialiser tout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Dialog */}
      <FormDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onSave={handleSaveCreate}
        title="Créer un Article"
        formData={formData}
        setFormData={setFormData}
        tagsInput={tagsInput}
        setTagsInput={setTagsInput}
        categories={categories}
        categoryLabels={categoryLabels}
      />

      {/* Edit Dialog */}
      <FormDialog
        open={!!editArticle}
        onClose={() => setEditArticle(null)}
        onSave={handleSaveEdit}
        title="Modifier l'article"
        formData={formData}
        setFormData={setFormData}
        tagsInput={tagsInput}
        setTagsInput={setTagsInput}
        categories={categories}
        categoryLabels={categoryLabels}
      />

      {/* View Dialog */}
      <Dialog open={!!viewArticle} onOpenChange={v => { if (!v) setViewArticle(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{viewArticle && (categoryLabels[viewArticle.category as KnowledgeCategory] || viewArticle.category)}</Badge>
            </div>
            <DialogTitle className="text-xl leading-tight">{viewArticle?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Par {viewArticle?.author || "Anonyme"} · Mis à jour le {viewArticle && new Date(viewArticle.updatedAt).toLocaleDateString('fr-FR')} · {viewArticle?.views || 0} vues
            </p>
          </DialogHeader>
          <div className="py-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4">
              {viewArticle?.content}
            </div>
            {viewArticle && viewArticle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {viewArticle.tags.map(tag => (
                  <div key={tag} className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            {userRole !== 'customer' && viewArticle && (
              <Button variant="outline" onClick={() => { setViewArticle(null); openEdit(viewArticle); }}>
                <Pencil className="h-4 w-4 mr-2" /> Modifier
              </Button>
            )}
            <Button onClick={() => setViewArticle(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'article <strong>"{deleteTarget?.title}"</strong> sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  categories: any[];
  categoryLabels: any;
}

function FormDialog({ 
  open, 
  onClose, 
  onSave, 
  title, 
  formData, 
  setFormData, 
  tagsInput, 
  setTagsInput, 
  categories, 
  categoryLabels 
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Remplissez les informations ci-dessous pour publier votre article dans la base de connaissances.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Titre *</label>
            <Input
              placeholder="Titre de l'article"
              value={formData.title}
              onChange={e => setFormData((p: any) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Catégorie *</label>
              <Select
                value={formData.category}
                onValueChange={v => setFormData((p: any) => ({ ...p, category: v as KnowledgeCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Auteur</label>
              <Input
                placeholder="Nom de l'auteur"
                value={formData.author}
                onChange={e => setFormData((p: any) => ({ ...p, author: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tags (séparés par des virgules)</label>
            <Input
              placeholder="ex: vpn, réseau, télétravail"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Contenu *</label>
            <Textarea
              placeholder="Rédigez le contenu de l'article ici..."
              className="min-h-[200px] font-mono text-sm"
              value={formData.content}
              onChange={e => setFormData((p: any) => ({ ...p, content: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

