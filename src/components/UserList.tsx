import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DownloadIcon,
  FilterIcon,
  MoreHorizontal,
  SearchIcon,
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { User } from "@/types/user";
import { useToast } from "@/components/ui/use-toast";
import { downloadCSV } from "@/utils/exportUtils";
import CreateUserForm from "@/components/CreateUserForm";
import { getUsers, deleteUser, updateUserStatus } from "@/data/userService";
import { addNotification } from "@/utils/notificationUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface UserListProps {
  userRole: 'admin' | 'agent' | 'customer';
}

export default function UserList({ userRole }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(13);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, pages: 0 });

  const loadUsers = () => {
    getUsers({
      page: currentPage,
      limit: itemsPerPage,
      search: searchQuery
    }).then(data => {
      setAllUsers(data.users);
      setPaginationInfo({ total: data.pagination.total, pages: data.pagination.pages });
      setSelectedIds([]);
    });
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery, roleFilter, statusFilter]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      // Apply search filter
      const matchesSearch =
        searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase());

      // Apply role filter
      const matchesRole =
        roleFilter.length === 0 ||
        roleFilter.includes(user.role);

      // Apply status filter
      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.includes(user.status);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  const handleRoleToggle = (value: string) => {
    setRoleFilter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  const handleStatusToggle = (value: string) => {
    setStatusFilter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  const clearAllFilters = () => {
    setRoleFilter([]);
    setStatusFilter([]);
    setSearchQuery("");
  };

  const handleUserCreated = (newUser: User) => {
    addNotification("Utilisateur Créé", `L'utilisateur ${newUser.name} (${newUser.role}) a été ajouté.`, "Admin");
    setAllUsers(prev => [newUser, ...prev]);
    setShowCreateDialog(false);
  };

  const handleUserUpdated = (updatedUser: User) => {
    addNotification("Utilisateur Modifié", `Le profil de ${updatedUser.name} a été mis à jour.`, "Admin");
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEditTarget(null);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      addNotification("Utilisateur Supprimé", `L'utilisateur ${deleteTarget.name} a été supprimé.`, "Admin");
      setAllUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      toast({ title: "Utilisateur supprimé", description: `${deleteTarget.name} a été supprimé.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleStatus = async (user: User, newStatus: 'active' | 'inactive') => {
    try {
      await updateUserStatus(user.id, newStatus);
      const action = newStatus === 'active' ? 'activé' : 'désactivé';
      addNotification("Statut Utilisateur", `${user.name} a été ${action}.`, "Admin");
      setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      toast({
        title: newStatus === 'active' ? 'Utilisateur activé' : 'Utilisateur désactivé',
        description: `${user.name} est maintenant ${newStatus === 'active' ? 'actif' : 'inactif'}.`,
      });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nom', 'Email', 'Rôle', 'Département', 'Statut'];
    const rows = filteredUsers.map(user => [
      user.id, `"${user.name}"`, user.email, user.role,
      user.department || 'N/A', user.status
    ].join(','));
    const csvData = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvData, `utilisateurs-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Export réussi", description: `${filteredUsers.length} utilisateurs exportés.` });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return { bg: 'bg-purple-100', text: 'text-purple-800' };
      case 'intervenant': return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'demandeur': return { bg: 'bg-green-100', text: 'text-green-800' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-600';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').toUpperCase();

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle>Utilisateurs ({allUsers.length})</CardTitle>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <div className="relative w-full sm:w-64 sm:flex-none">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Chercher un utilisateur..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon"><FilterIcon className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Filtrer par rôle</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={roleFilter.includes('admin')} onCheckedChange={() => handleRoleToggle('admin')}>Admin</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={roleFilter.includes('intervenant')} onCheckedChange={() => handleRoleToggle('intervenant')}>Intervenant</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={roleFilter.includes('demandeur')} onCheckedChange={() => handleRoleToggle('demandeur')}>Demandeur</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={statusFilter.includes('active')} onCheckedChange={() => handleStatusToggle('active')}>Actif</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={statusFilter.includes('inactive')} onCheckedChange={() => handleStatusToggle('inactive')}>Inactif</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={statusFilter.includes('pending')} onCheckedChange={() => handleStatusToggle('pending')}>En attente</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={clearAllFilters}>Réinitialiser</Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="icon" onClick={handleExportCSV} title="Exporter CSV">
                <DownloadIcon className="h-4 w-4" />
              </Button>

              {selectedIds.length > 0 && (
                <Button 
                  variant="destructive" 
                  className="gap-2"
                  onClick={async () => {
                    if (confirm(`Voulez-vous supprimer les ${selectedIds.length} utilisateurs sélectionnés ?`)) {
                      for (const id of selectedIds) {
                        await deleteUser(id);
                      }
                      toast({ title: "Suppression réussie", description: `${selectedIds.length} utilisateurs ont été supprimés.` });
                      loadUsers();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer ({selectedIds.length})
                </Button>
              )}

              {userRole === 'admin' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un Utilisateur
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="rounded-xl border shadow-sm overflow-hidden border-t-4 border-t-primary bg-card">
                <Table>
                   <TableHeader className="bg-muted">
                    <TableRow className="hover:bg-transparent text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(filteredUsers.map(u => u.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Utilisateur</TableHead>
                      <TableHead className="whitespace-nowrap">Rôle</TableHead>
                      <TableHead className="whitespace-nowrap">Département</TableHead>
                      <TableHead className="whitespace-nowrap">Statut</TableHead>
                      <TableHead className="whitespace-nowrap">Dernière activité</TableHead>
                      {userRole === 'admin' && <TableHead className="text-right whitespace-nowrap sticky right-0 z-10 bg-muted shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.25)]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow 
                          key={user.id} 
                          className={cn(
                            "group hover:bg-primary/5 transition-all duration-200 border-b border-border/50 hover:shadow-sm",
                            selectedIds.includes(user.id) && "bg-primary/5"
                          )}
                        >
                          <TableCell className="w-[50px]">
                            <Checkbox 
                              checked={selectedIds.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedIds(prev => [...prev, user.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeVariant(user.role).bg} ${getRoleBadgeVariant(user.role).text}`}>
                              {user.role}
                            </div>
                          </TableCell>
                          <TableCell>{user.department || '-'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(user.status)}`}>
                              {getStatusLabel(user.status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {user.lastActive ? new Date(user.lastActive).toLocaleDateString('fr-FR') : 'Jamais'}
                          </TableCell>
                          {userRole === 'admin' && (
                            <TableCell className="text-right sticky right-0 z-10 bg-card group-hover:bg-muted transition-colors shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.25)]">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  {user.status === 'active' ? (
                                    <DropdownMenuItem onClick={() => handleToggleStatus(user, 'inactive')}>
                                      <UserX className="h-4 w-4 mr-2" /> Désactiver
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleToggleStatus(user, 'active')}>
                                      <UserCheck className="h-4 w-4 mr-2" /> Activer
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setEditTarget(user)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget(user)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={userRole === 'admin' ? 7 : 6} className="text-center py-10 text-muted-foreground">
                          Aucun utilisateur trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination UI */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-muted/20 mt-4 rounded-xl border">
                <div className="text-sm text-muted-foreground">
                  Affichage de <span className="font-medium">{filteredUsers.length}</span> sur <span className="font-medium">{paginationInfo.total}</span> utilisateurs
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

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel Utilisateur</DialogTitle>
            <DialogDescription className="sr-only">Formulaire pour créer un nouvel utilisateur dans le système.</DialogDescription>
          </DialogHeader>
          <CreateUserForm onUserCreated={handleUserCreated} onClose={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription className="sr-only">Formulaire pour modifier les informations d'un utilisateur existant.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <CreateUserForm
              initialData={editTarget}
              onUserUpdated={handleUserUpdated}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
