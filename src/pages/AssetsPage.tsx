import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Laptop,
  Monitor,
  Printer,
  Network,
  Smartphone,
  Database,
  SearchIcon,
  FilterIcon,
  PlusCircle,
  DownloadIcon,
  UploadIcon,
  Server,
  Bot,
  HardDrive,
  Cpu,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getAssets, createAsset, deleteAsset, updateAsset } from "@/data/assetService";
import { assetsToCSV, downloadCSV, processImportedAssets } from "@/utils/exportUtils";
import { Asset, AssetType } from "@/types/asset";
import { useToast } from "@/components/ui/use-toast";
import { addNotification } from "@/utils/notificationUtils";

export default function AssetsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [typeFilter, setTypeFilter] = useState<AssetType[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [userRole] = useState<'admin' | 'agent' | 'customer'>('admin');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    name: '', type: 'computer', serialNumber: '', projet: '', fabricant: '', produit: '', modele: '', site: 'SAPINO'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(13);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, pages: 0 });

  const loadAssets = () => {
    getAssets({ 
      page: currentPage, 
      limit: itemsPerPage,
      search: searchQuery
    }).then(data => {
      setAllAssets(data.assets);
      setPaginationInfo({ total: data.pagination.total, pages: data.pagination.pages });
      setSelectedIds([]);
    });
  };

  useEffect(() => {
    loadAssets();
  }, [currentPage, searchQuery, typeFilter, statusFilter]);

  const handleCreateAsset = async () => {
    try {
      const payload = {
        ...newAsset,
        name: newAsset.produit || newAsset.name || 'Équipement',
      };
      const created = await createAsset(payload);
      addNotification("Nouvel Actif", `L'équipement ${created.serialNumber || created.name} a été ajouté au parc.`, "Admin");
      setAllAssets(prev => [created, ...prev]);
      setIsDialogOpen(false);
      setNewAsset({ name: '', type: 'computer', serialNumber: '', projet: '', fabricant: '', produit: '', modele: '', site: 'SAPINO' });
      toast({ title: "Succès", description: "L'équipement a été ajouté au parc." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter." });
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset) return;
    try {
      const updated = await updateAsset(editingAsset.id, editingAsset);
      addNotification("Actif Modifié", `L'équipement ${updated.serialNumber || updated.name} a été mis à jour.`, "Admin");
      setAllAssets(prev => prev.map(a => a.id === editingAsset.id ? updated : a));
      setIsEditDialogOpen(false);
      setEditingAsset(null);
      toast({ title: "Mis à jour", description: "L'équipement a été modifié avec succès." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier." });
    }
  };

  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      const matchesSearch =
        searchQuery === "" ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter.length === 0 ||
        typeFilter.includes(asset.type);

      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.includes(asset.status);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter, allAssets]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedAssets = await processImportedAssets(file);

      if (parsedAssets.length > 0) {
        toast({
          title: "Importation en cours...",
          description: `Enregistrement de ${parsedAssets.length} équipements dans PostgreSQL. Veuillez patienter...`
        });

        // Persister chaque équipement en base
        for (const asset of parsedAssets) {
          await createAsset({
            serialNumber: asset.serialNumber,
            projet: asset.projet,
            fabricant: asset.fabricant,
            produit: asset.name,
            type: asset.type,
            modele: asset.modele,
            site: asset.site,
            status: asset.status === 'in-use' ? 'active' : asset.status === 'under-repair' ? 'broken' : 'active'
          } as any);
        }

        // Recharger les équipements depuis le serveur
        const updatedAssets = await getAssets();
        setAllAssets(updatedAssets);

        toast({
          title: "Import réussi",
          description: `${parsedAssets.length} équipements importés et sauvegardés avec succès.`,
        });
      } else {
        toast({
          title: "Échec de l'import",
          description: "Aucun équipement valide trouvé dans le fichier.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Asset import error", error);
      toast({
        title: "Erreur persistante",
        description: "Un problème est survenu lors de la sauvegarde des équipements.",
        variant: "destructive",
      });
    }

    e.target.value = '';
  };

  const handleExportAssets = () => {
    const csvData = assetsToCSV(filteredAssets);
    const filename = `assets-export-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvData, filename);

    toast({
      title: "Exportation réussie",
      description: `${filteredAssets.length} équipements exportés vers ${filename}`,
    });
  };

  const toggleTypeFilter = (type: AssetType) => {
    setTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'computer': return <Laptop className="h-4 w-4" />;
      case 'monitor': return <Monitor className="h-4 w-4" />;
      case 'printer': return <Printer className="h-4 w-4" />;
      case 'network': return <Network className="h-4 w-4" />;
      case 'peripheral': return <Smartphone className="h-4 w-4" />;
      case 'software': return <Database className="h-4 w-4" />;
      case 'server': return <Server className="h-4 w-4" />;
      case 'robot': return <Bot className="h-4 w-4" />;
      case 'hmc': return <Cpu className="h-4 w-4" />;
      case 'san': return <HardDrive className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none">Disponible</Badge>;
      case 'in-use': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none">En service</Badge>;
      case 'under-repair': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-none">En réparation</Badge>;
      case 'retired': return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-none">Retiré</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="app-shell relative flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar userRole={userRole} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header userRole={userRole} onSwitchRole={() => { }} />

        <div className="relative flex-1 overflow-auto p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventaire (Parc Informatique)</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Ajouter un Actif
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel équipement</DialogTitle>
                  <DialogDescription>Remplissez les détails de l'équipement.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="sn">Numéro de série</Label>
                      <Input id="sn" placeholder="N/S..." value={newAsset.serialNumber || ''} onChange={e => setNewAsset({ ...newAsset, serialNumber: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="projet">Projet</Label>
                      <Input id="projet" placeholder="Nom du projet" value={newAsset.projet || ''} onChange={e => setNewAsset({ ...newAsset, projet: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="fabricant">Fabricant</Label>
                      <Input id="fabricant" placeholder="Nom du fabricant" value={newAsset.fabricant || ''} onChange={e => setNewAsset({ ...newAsset, fabricant: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="produit">Produit</Label>
                      <Input id="produit" placeholder="Nom du produit" value={newAsset.produit || ''} onChange={e => setNewAsset({ ...newAsset, produit: e.target.value, name: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="type">Type</Label>
                      <select id="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newAsset.type} onChange={e => setNewAsset({ ...newAsset, type: e.target.value as AssetType })}>
                        <option value="computer">Ordinateur</option>
                        <option value="server">Serveur</option>
                        <option value="monitor">Écran</option>
                        <option value="printer">Imprimante</option>
                        <option value="network">Réseau</option>
                        <option value="robot">Robot Physique</option>
                        <option value="hmc">HMC</option>
                        <option value="san">SW SAN</option>
                        <option value="peripheral">Périphérique</option>
                        <option value="software">Logiciel</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="modele">Modèle</Label>
                      <Input id="modele" placeholder="Nom du modèle" value={newAsset.modele || ''} onChange={e => setNewAsset({ ...newAsset, modele: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="site">Site</Label>
                    <select id="site" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newAsset.site || 'SAPINO'} onChange={e => setNewAsset({ ...newAsset, site: e.target.value })}>
                      <option value="SAPINO">SAPINO</option>
                      <option value="MARRAKECH">MARRAKECH</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreateAsset}>Ajouter à l'inventaire</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <CardTitle className="text-xl font-semibold">Tous les Actifs</CardTitle>
                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                  <div className="relative w-full sm:w-64 sm:flex-none">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Chercher un équipement, S/N..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <FilterIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Type d'équipement</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('computer')} onCheckedChange={() => toggleTypeFilter('computer')}>Ordinateurs</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('monitor')} onCheckedChange={() => toggleTypeFilter('monitor')}>Ecrans</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('printer')} onCheckedChange={() => toggleTypeFilter('printer')}>Imprimantes</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('network')} onCheckedChange={() => toggleTypeFilter('network')}>Réseau</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('peripheral')} onCheckedChange={() => toggleTypeFilter('peripheral')}>Périphériques</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('software')} onCheckedChange={() => toggleTypeFilter('software')}>Logiciels</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('server')} onCheckedChange={() => toggleTypeFilter('server')}>Serveur Power</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('robot')} onCheckedChange={() => toggleTypeFilter('robot')}>Robot Physique</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('hmc')} onCheckedChange={() => toggleTypeFilter('hmc')}>HMC</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={typeFilter.includes('san')} onCheckedChange={() => toggleTypeFilter('san')}>SW SAN</DropdownMenuCheckboxItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Statut</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem checked={statusFilter.includes('available')} onCheckedChange={() => toggleStatusFilter('available')}>Disponible</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={statusFilter.includes('in-use')} onCheckedChange={() => toggleStatusFilter('in-progress')}>En service</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={statusFilter.includes('under-repair')} onCheckedChange={() => toggleStatusFilter('under-repair')}>En réparation</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" size="icon" title="Exporter" onClick={handleExportAssets}>
                    <DownloadIcon className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    title="Importer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={handleImport}
                  />
                  {selectedIds.length > 0 && (
                    <Button 
                      variant="destructive" 
                      className="gap-2"
                      onClick={async () => {
                        if (confirm(`Voulez-vous supprimer les ${selectedIds.length} actifs sélectionnés ?`)) {
                          for (const id of selectedIds) {
                            await deleteAsset(id);
                          }
                          toast({ title: "Suppression réussie", description: `${selectedIds.length} équipements ont été supprimés.` });
                          loadAssets();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer ({selectedIds.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-0 sm:px-6">
              <div className="rounded-xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow className="hover:bg-transparent text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={filteredAssets.length > 0 && selectedIds.length === filteredAssets.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(filteredAssets.map(a => a.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Numéro de série</TableHead>
                      <TableHead className="whitespace-nowrap">Projet</TableHead>
                      <TableHead className="whitespace-nowrap">Fabricant</TableHead>
                      <TableHead className="whitespace-nowrap">Produit</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Modèle</TableHead>
                      <TableHead className="whitespace-nowrap">Site</TableHead>
                      <TableHead className="text-right whitespace-nowrap sticky right-0 z-10 bg-muted shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.25)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.length > 0 ? (
                      filteredAssets.map((asset) => (
                      <TableRow 
                        key={asset.id} 
                        className={cn(
                          "group cursor-pointer hover:bg-primary/5 transition-all duration-200 border-b border-border/50 hover:shadow-sm",
                          selectedIds.includes(asset.id) && "bg-primary/5"
                        )}
                      >
                        <TableCell className="w-[50px]">
                          <Checkbox 
                            checked={selectedIds.includes(asset.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(prev => [...prev, asset.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== asset.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{asset.serialNumber}</TableCell>
                          <TableCell>{asset.projet || "-"}</TableCell>
                          <TableCell>{asset.fabricant || "-"}</TableCell>
                          <TableCell className="font-medium">{asset.produit || asset.name}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {asset.type === 'server' ? 'Serveur Power' :
                                asset.type === 'robot' ? 'Robot Physique' :
                                  asset.type === 'hmc' ? 'HMC' :
                                    asset.type === 'san' ? 'SW SAN' :
                                      asset.type === 'computer' ? 'Ordinateur' :
                                        asset.type === 'monitor' ? 'Écran' :
                                          asset.type === 'printer' ? 'Imprimante' :
                                            asset.type === 'network' ? 'Réseau' :
                                              asset.type === 'software' ? 'Logiciel' :
                                                asset.type === 'peripheral' ? 'Périphérique' :
                                                  asset.type}
                            </span>
                          </TableCell>
                          <TableCell>{asset.modele || "-"}</TableCell>
                          <TableCell className="text-sm">{asset.site || "-"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap sticky right-0 z-10 bg-card group-hover:bg-muted transition-colors shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.25)]">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAsset(asset);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`Supprimer l'équipement ${asset.serialNumber || asset.name} ?`)) {
                                    await deleteAsset(asset.id);
                                    addNotification("Actif Supprimé", `L'équipement ${asset.serialNumber || asset.name} a été retiré definitivement.`, "Admin");
                                    loadAssets();
                                    toast({ title: "Supprimé", description: "L'équipement a été retiré de l'inventaire." });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                          Aucun équipement trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination UI */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 mt-4 bg-muted/20 border-t">
                <div className="text-sm text-muted-foreground">
                  Affichage de <span className="font-medium">{filteredAssets.length}</span> sur <span className="font-medium">{paginationInfo.total}</span> actifs
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: paginationInfo.pages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    )).slice(Math.max(0, currentPage - 3), Math.min(paginationInfo.pages, currentPage + 2))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(paginationInfo.pages, prev + 1))}
                    disabled={currentPage === paginationInfo.pages || paginationInfo.pages === 0}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialog de Modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'équipement</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-serial">Numéro de série (S/N)</Label>
              <Input id="edit-serial" value={editingAsset?.serialNumber || ""} onChange={(e) => setEditingAsset(prev => prev ? { ...prev, serialNumber: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-projet">Projet</Label>
              <Input id="edit-projet" value={editingAsset?.projet || ""} onChange={(e) => setEditingAsset(prev => prev ? { ...prev, projet: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fabricant">Fabricant</Label>
              <Input id="edit-fabricant" value={editingAsset?.fabricant || ""} onChange={(e) => setEditingAsset(prev => prev ? { ...prev, fabricant: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-produit">Produit / Nom</Label>
              <Input id="edit-produit" value={editingAsset?.produit || editingAsset?.name || ""} onChange={(e) => setEditingAsset(prev => prev ? { ...prev, produit: e.target.value, name: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type d'actif</Label>
              <select
                id="edit-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editingAsset?.type || "computer"}
                onChange={(e) => setEditingAsset(prev => prev ? { ...prev, type: e.target.value as any } : null)}
              >
                <option value="computer">Ordinateur / Laptop</option>
                <option value="server">Serveur Power</option>
                <option value="robot">Robot</option>
                <option value="hmc">HMC</option>
                <option value="san">Switch SAN</option>
                <option value="monitor">Écran / Moniteur</option>
                <option value="printer">Imprimante</option>
                <option value="network">Équipement Réseau</option>
                <option value="peripheral">Autre Périphérique</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-modele">Modèle</Label>
              <Input id="edit-modele" value={editingAsset?.modele || ""} onChange={(e) => setEditingAsset(prev => prev ? { ...prev, modele: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-site">Site</Label>
              <select
                id="edit-site"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editingAsset?.site || "SAPINO"}
                onChange={(e) => setEditingAsset(prev => prev ? { ...prev, site: e.target.value } : null)}
              >
                <option value="SAPINO">SAPINO</option>
                <option value="MARRAKECH">MARRAKECH</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateAsset}>Enregistrer les modifications</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
