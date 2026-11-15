import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Bell, 
  Globe, 
  Shield,
  Key, 
  Clock,
  Calendar
} from 'lucide-react';
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<'admin' | 'agent' | 'customer'>('admin');
  
  // App settings state
  const [settings, setSettings] = useState({
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
  });

  // DB config state
  const [dbConfig, setDbConfig] = useState({
    host: window.location.hostname,
    port: '3000',
    database: 'focusticket',
    username: 'postgres',
    password: ''
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  // Update real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update DB config state on input change
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/config/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleDbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDbConfig({ ...dbConfig, [e.target.id]: e.target.value });
  };

  const saveAllSettings = async () => {
    try {
      const response = await fetch(`/api/config/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({ title: "Paramètres sauvegardés", description: "Toutes les modifications ont été enregistrées sur le serveur." });
      } else {
        throw new Error("Erreur serveur lors de la sauvegarde");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const handleSaveDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Test de la connexion en cours...' });

    try {
      const backendUrl = `/api/config/database`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
      });

      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Connexion réussie ! Vos paramètres ont été sauvegardés.' });
        toast({ title: "Configuration sauvegardée", description: "La base de données a été configurée. Le backend va redémarrer." });
      } else {
        throw new Error(data.error || 'Erreur lors du test de connexion');
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
      toast({ variant: "destructive", title: "Erreur de connexion", description: error.message });
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar userRole={userRole} />
      
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header userRole={userRole} onSwitchRole={setUserRole} />
        
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground">Configurez la plateforme, les notifications et la sécurité.</p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex flex-wrap items-center gap-4 sm:gap-6 shadow-sm">
                <div className="flex items-center gap-3 sm:border-r sm:pr-6">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Date système</span>
                    <span className="text-sm font-semibold">{currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Heure actuelle</span>
                    <span className="text-xl font-mono font-bold text-primary tabular-nums">
                      {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={saveAllSettings} className="gap-2 self-start sm:self-auto">
              <Save className="h-4 w-4" /> Sauvegarder tout
            </Button>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4 mb-6">
              <TabsTrigger value="general" className="gap-2">
                <Globe className="h-4 w-4" /> Général
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-2">
                <Database className="h-4 w-4" /> Base de données
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" /> Sécurité
              </TabsTrigger>
            </TabsList>

            {/* Onglet Général */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Identité de la plateforme</CardTitle>
                    <CardDescription>Personnalisez le nom et l'apparence de votre instance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="site-name">Nom du site</Label>
                      <Input 
                        id="site-name" 
                        value={settings.general.siteName} 
                        onChange={(e) => setSettings({...settings, general: {...settings.general, siteName: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Email de support principal</Label>
                      <Input 
                        id="support-email" 
                        type="email" 
                        value={settings.general.supportEmail} 
                        onChange={(e) => setSettings({...settings, general: {...settings.general, supportEmail: e.target.value}})}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={saveAllSettings}>Sauvegarder les modifications</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Localisation & Langue</CardTitle>
                    <CardDescription>Définissez les paramètres régionaux par défaut.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Langue par défaut</Label>
                      <select 
                        id="language" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none"
                        value={settings.general.language}
                        onChange={(e) => setSettings({...settings, general: {...settings.general, language: e.target.value}})}
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuseau horaire</Label>
                      <select 
                        id="timezone" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none"
                        value={settings.general.timezone}
                        onChange={(e) => setSettings({...settings, general: {...settings.general, timezone: e.target.value}})}
                      >
                        <option value="GMT">GMT (Casablanca)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Onglet Base de données */}
            <TabsContent value="database">
              <Card className="border-primary/20 shadow-lg">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Connexion PostgreSQL</CardTitle>
                      <CardDescription>Configuration technique de l'accès aux données persistantes.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSaveDb} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="host">Hôte (IP ou Nom de machine)</Label>
                        <Input
                          id="host"
                          placeholder="ex: 192.168.1.10"
                          value={dbConfig.host}
                          onChange={handleDbChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          placeholder="5432"
                          value={dbConfig.port}
                          onChange={handleDbChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="database">Nom de la base de données</Label>
                        <Input
                          id="database"
                          value={dbConfig.database}
                          onChange={handleDbChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username">Utilisateur</Label>
                        <Input
                          id="username"
                          value={dbConfig.username}
                          onChange={handleDbChange}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="********"
                          value={dbConfig.password}
                          onChange={handleDbChange}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="w-full md:w-auto">
                        {status?.type === 'loading' && (
                          <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                            <RefreshCw className="animate-spin h-5 w-5" />
                            <span className="text-sm font-medium">{status?.message}</span>
                          </div>
                        )}
                        {status?.type === 'success' && (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">{status?.message}</span>
                          </div>
                        )}
                        {status?.type === 'error' && (
                          <div className="flex items-center gap-2 text-rose-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">{status?.message}</span>
                          </div>
                        )}
                      </div>

                      <Button type="submit" disabled={status?.type === 'loading'} className="w-full md:w-auto gap-2">
                        <Save className="h-4 w-4" />
                        Tester & Redémarrer le service
                      </Button>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="bg-amber-50 border-t border-amber-100 text-amber-800 text-xs gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p><strong>Note :</strong> La modification des paramètres de base de données nécessite un redémarrage automatique des services pour prendre effet.</p>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Onglet Notifications */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Canaux de notification</CardTitle>
                  <CardDescription>Choisissez comment les utilisateurs sont informés.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2 border-b pb-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Envoyer un email lors de la création d'un ticket.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.emailNotifications} 
                      onCheckedChange={(val) => setSettings({...settings, notifications: {...settings.notifications, emailNotifications: val}})}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 border-b pb-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Navigateur (Push)</Label>
                      <p className="text-sm text-muted-foreground">Activer les notifications système en temps réel.</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.pushNotifications} 
                      onCheckedChange={(val) => setSettings({...settings, notifications: {...settings.notifications, pushNotifications: val}})}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={saveAllSettings} className="w-full md:w-auto">Enregistrer les préférences</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Onglet Sécurité */}
            <TabsContent value="security">
               <Card>
                <CardHeader>
                  <CardTitle>Sécurité & Accès</CardTitle>
                  <CardDescription>Modifiez votre mot de passe et gérez votre session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Password Change Form */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                      <Key className="h-4 w-4" /> Changer le mot de passe
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-pass">Mot de passe actuel</Label>
                        <Input id="current-pass" type="password" placeholder="••••••••" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-pass">Nouveau mot de passe</Label>
                          <Input id="new-pass" type="password" placeholder="••••••••" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-pass">Confirmer le nouveau mot de passe</Label>
                          <Input id="confirm-pass" type="password" placeholder="••••••••" />
                        </div>
                      </div>
                      <Button size="sm" className="w-full md:w-auto" onClick={() => toast({title: "Mot de passe", description: "Le changement de mot de passe sera effectif sous peu."})}>Mettre à jour le mot de passe</Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Session Timeout */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                      <Clock className="h-4 w-4" /> Session
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Délai d'expiration de session (minutes)</Label>
                      <div className="flex items-center gap-3">
                        <Input 
                          id="session-timeout" 
                          type="number" 
                          className="w-24" 
                          value={settings.security.sessionTimeout}
                          onChange={(e) => setSettings({...settings, security: {sessionTimeout: parseInt(e.target.value)}})}
                        />
                        <span className="text-sm text-muted-foreground">La session expirera après {settings.security.sessionTimeout} minutes d'inactivité.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t rounded-b-lg">
                  <Button onClick={saveAllSettings} variant="outline" className="w-full md:w-auto gap-2">
                    <Save className="h-4 w-4" />
                    Enregistrer les paramètres de sécurité
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
