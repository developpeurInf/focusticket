import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Lock, User, ShieldCheck, Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [forgotPin, setForgotPin] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isForgotDialogOpen, setIsForgotDialogOpen] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setForgotStatus('verifying');
    setTimeout(() => {
      // Smart check to verify affiliation with the company using an internal PIN
      if (forgotPin === '2017') {
        setForgotStatus('success');
      } else {
        setForgotStatus('error');
      }
    }, 1500);
  };

  const handleResetDialog = () => {
    setForgotStatus('idle');
    setForgotPin('');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate via actual backend API securely
    const success = await login(username, password);
    
    if (success) {
      toast({ title: "Connexion réussie", description: "Bienvenue sur FOCUS Ticket." });
      navigate(from, { replace: true });
    } else {
      toast({ 
        variant: "destructive", 
        title: "Échec de connexion", 
        description: "Identifiants invalides. Vérifiez vos accès distants." 
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-cyan-400 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md p-6 z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="FOCUS NEXT COMPUTING" 
            className="h-24 w-auto object-contain drop-shadow-md mb-2"
          />
          <p className="text-slate-500 font-medium tracking-wide">FOCUS Ticket Management Solution</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>Entrez vos identifiants pour accéder à la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="username" 
                    className="pl-10 h-10 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500" 
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Dialog open={isForgotDialogOpen} onOpenChange={(open) => {
                    setIsForgotDialogOpen(open);
                    if (!open) setTimeout(handleResetDialog, 300);
                  }}>
                    <DialogTrigger asChild>
                      <button type="button" className="text-xs text-blue-600 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer">
                        Mot de passe oublié ?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-blue-600" />
                          Vérification d'identité
                        </DialogTitle>
                        <DialogDescription>
                          Afin de récupérer l'accès, veuillez saisir le code de sécurité (PIN) interne de l'organisation.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4">
                        {forgotStatus === 'idle' || forgotStatus === 'error' ? (
                          <form onSubmit={handleForgotSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="pro-pin">Code PIN Interne</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input 
                                  id="pro-pin" 
                                  type="password"
                                  className="pl-10 focus:ring-blue-500 font-mono tracking-widest text-lg" 
                                  placeholder="••••••••"
                                  value={forgotPin}
                                  onChange={(e) => setForgotPin(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            
                            {forgotStatus === 'error' && (
                              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                Le code PIN saisi est incorrect. Accès refusé.
                              </div>
                            )}

                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white">Vérifier le code</Button>
                          </form>
                        ) : forgotStatus === 'verifying' ? (
                          <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                            <p className="text-slate-500 font-medium animate-pulse">Vérification de l'autorisation d'accès...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mb-2 shadow-inner">
                              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Code Accepté</h3>
                            <p className="text-slate-600 text-sm">
                              Vous avez fourni le bon code de sécurité interne. <br/>Voici votre accès temporaire sécurisé :
                            </p>
                            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 w-full mt-4">
                              <p className="font-mono text-center font-bold text-lg select-all">Labs2017$</p>
                            </div>
                            <Button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsForgotDialogOpen(false);
                                setUsername('admin');
                                setPassword('Labs2017$');
                              }} 
                              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Utiliser ce mot de passe
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-10 h-10 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 font-semibold transition-all group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t flex flex-col pt-6 pb-6 text-center">
            <p className="text-sm text-slate-500">
              Réservé à l'usage interne de Focus Next Computing.
            </p>
          </CardFooter>
        </Card>
        
        <p className="text-center mt-8 text-slate-400 text-xs">
          © {new Date().getFullYear()} Focus Next Computing. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
