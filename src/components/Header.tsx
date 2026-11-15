
import { Bell, Menu, MoonIcon, SunIcon } from "lucide-react";
import { TOGGLE_MOBILE_SIDEBAR_EVENT } from "@/lib/sidebarEvents";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { CheckCheck, Trash2 as TrashIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationItem } from "@/types/notification";
import { 
  getStoredNotifications, 
  saveNotifications, 
  formatNotificationTime,
  clearNotifications 
} from "@/utils/notificationUtils";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

interface HeaderProps {
  userRole: 'admin' | 'agent' | 'customer';
  onSwitchRole: (role: 'admin' | 'agent' | 'customer') => void;
}

export default function Header({ userRole, onSwitchRole }: HeaderProps) {
  const { setTheme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Initial load
    setNotifications(getStoredNotifications());

    // Listen for new notifications
    const handleNewNotif = () => setNotifications(getStoredNotifications());
    window.addEventListener('new-notification', handleNewNotif);
    
    // Periodically update relative times
    const timer = setInterval(() => {
       setNotifications(prev => prev.map(n => {
         const idParts = n.id.split('-');
         if (idParts.length > 1) {
            const timestamp = parseInt(idParts[1]);
            return { ...n, time: formatNotificationTime(timestamp) };
         }
         return n;
       }));
    }, 60000);

    return () => {
      window.removeEventListener('new-notification', handleNewNotif);
      clearInterval(timer);
    };
  }, []);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleClearAll = () => {
    clearNotifications();
    setNotifications([]);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 backdrop-blur-md md:h-20 md:px-6">
        {/* Mobile : bouton menu + logo (sur bureau, le logo est déjà dans le menu latéral) */}
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => window.dispatchEvent(new Event(TOGGLE_MOBILE_SIDEBAR_EVENT))}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <img src="/logo.png" alt="FOCUS NEXT COMPUTING" className="h-9 w-auto min-w-0 rounded object-contain dark:bg-white dark:px-1.5 dark:py-0.5" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 text-foreground">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative group rounded-full hover:border-primary/50 transition-colors" aria-label="Notifications">
                <Bell className="h-5 w-5 group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 animate-in fade-in zoom-in duration-300">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-1.5rem)] p-0 shadow-2xl border-primary/10">
              <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="font-bold text-base">Notifications</h3>
                  <p className="text-xs text-muted-foreground">{unreadCount} non lues</p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" size="sm" 
                    className="h-8 text-[11px] px-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold gap-1" 
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Tout marquer
                  </Button>
                  <Button 
                    variant="ghost" size="sm" 
                    className="h-8 text-[11px] px-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold gap-1" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <TrashIcon className="h-3 w-3" />
                    Nettoyer
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[auto] max-h-[450px] overflow-hidden custom-scrollbar">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-4 transition-colors cursor-pointer group relative ${!notification.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'}`}
                        onClick={(e) => markAsRead(notification.id, e)}
                      >
                        <div className="flex gap-4 items-start">
                          <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                              <AvatarImage src={notification.user.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary">{notification.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {!notification.read && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-primary rounded-full border-2 border-background" />}
                          </div>
                          <div className="flex-1 space-y-1 pr-4">
                            <div className="flex justify-between items-start gap-2">
                               <p className={`text-sm font-semibold leading-tight ${!notification.read ? 'text-primary' : ''}`}>
                                 {notification.title}
                               </p>
                               <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                                 {notification.time}
                               </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-normal italic">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2">
                               <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                               <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                 {notification.user.name}
                               </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <Bell className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground font-medium">Aucune notification pour le moment</p>
                  </div>
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                 <div className="p-2 border-t text-center bg-muted/10">
                   <Button variant="link" className="text-xs text-muted-foreground h-auto p-0 hover:text-primary">
                      Voir toutes les archives
                   </Button>
                 </div>
              )}
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            size="icon"
            className="rounded-full h-10 w-10 border-slate-200 dark:border-slate-800 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm bg-white dark:bg-slate-950"
            onClick={() => {
              const root = document.documentElement;
              const isDark = root.classList.contains("dark");
              setTheme(isDark ? "light" : "dark");
            }}
          >
            <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
            <span className="sr-only">Changer le thème</span>
          </Button>

        </div>
      </header>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes vos notifications seront supprimées de façon permanente. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-rose-600 hover:bg-rose-700">Supprimer tout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
