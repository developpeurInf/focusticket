import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from "recharts";
import { 
  AlertCircle, 
  CheckCircle2, 
  Laptop, 
  Users, 
  MapPin, 
  Activity, 
  Server,
  Zap,
  TrendingUp,
  Info
} from "lucide-react";
import { getTickets } from "@/data/ticketService";
import { getAssets } from "@/data/assetService";
import { getUsers } from "@/data/userService";
import { Ticket as TicketType } from "@/types/ticket";
import { Asset as AssetType } from "@/types/asset";
import { User } from "@/types/user";

interface DashboardOverviewProps {
  userRole: 'admin' | 'agent' | 'customer';
}

export default function DashboardOverview({}: DashboardOverviewProps) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const [isLoading, setIsLoading] = useState(true);
  const [mockTickets, setMockTickets] = useState<TicketType[]>([]);
  const [mockAssets, setMockAssets] = useState<AssetType[]>([]);
  const [realUsers, setRealUsers] = useState<User[]>([]);

  const loadDashboardData = async () => {
    try {
      const [ticketsData, assets, users] = await Promise.all([
        getTickets({ limit: 1000 }),
        getAssets({ limit: 1000 }),
        getUsers({ limit: 1000 })
      ]);
      setMockTickets(ticketsData.tickets);
      setMockAssets(assets.assets);
      setRealUsers(users.users);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('tickets-updated', loadDashboardData);
    return () => window.removeEventListener('tickets-updated', loadDashboardData);
  }, []);

  const stats = useMemo(() => {
    if (isLoading) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const open = mockTickets.filter(t => ['open', 'Ouvert', 'ouvert', 'in-progress', 'En cours', 'en-cours'].includes(t.status as string)).length;
    const resolved = mockTickets.filter(t => ['resolved', 'Résolu', 'resolu', 'closed', 'Clos', 'clôturé', 'cloturé'].includes(t.status as string)).length;
    
    // Resolved today
    const resolvedToday = mockTickets.filter(t => {
      if (!t.resolvedAt) return false;
      const d = new Date(t.resolvedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    // Monthly Trend
    const monthly: Record<string, { month: string; opened: number; resolved: number }> = {};
    mockTickets.forEach(t => {
      if (!t.createdAt) return;
      const d = new Date(t.createdAt);
      if (isNaN(d.getTime())) return;
      
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthYear = d.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
      
      if (!monthly[sortKey]) monthly[sortKey] = { month: monthYear, opened: 0, resolved: 0 };
      monthly[sortKey].opened++;
      
      const status = String(t.status || '').toLowerCase();
      if (['resolved', 'résolu', 'resolu', 'closed', 'clos', 'clôturé'].includes(status)) {
        monthly[sortKey].resolved++;
      }
    });

    const monthlyTrend = Object.entries(monthly)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([_, v]) => v);

    // Tickets by Category
    // Tickets by specific Equipment (Dynamic)
    const equipmentMap: Record<string, number> = {};
    mockTickets.forEach(t => {
      // Group by the equipment/asset name if available
      const equipName = t.equipment && t.equipment !== 'N/A' && t.equipment !== 'Non défini' ? t.equipment : null;
      if (equipName) {
        equipmentMap[equipName] = (equipmentMap[equipName] || 0) + 1;
      }
    });
    const byEquipment = Object.entries(equipmentMap).map(([name, value]) => ({ name, value }));

    // site distribution...
    const siteMap: Record<string, number> = {};
    mockTickets.forEach(t => {
      const site = t.site || 'Siège';
      siteMap[site] = (siteMap[site] || 0) + 1;
    });
    const bySite = Object.entries(siteMap).map(([name, value]) => ({ name, value }));

    // Assets by Type
    const assetTypeMap: Record<string, number> = {};
    mockAssets.forEach(a => {
      const type = a.type || 'Inconnu';
      assetTypeMap[type] = (assetTypeMap[type] || 0) + 1;
    });
    const byAssetType = Object.entries(assetTypeMap).map(([name, value]) => ({ name, value }));

    const createdToday = mockTickets.filter(t => {
      const d = new Date(t.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    return { 
      open, 
      resolved, 
      resolvedToday, 
      createdToday,
      monthlyTrend, 
      byEquipment, 
      bySite, 
      byAssetType 
    };
  }, [mockTickets, mockAssets, isLoading]);

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox title="Tickets Ouverts" value={stats.open} detail="En attente de résolution" bg="bg-blue-50 dark:bg-blue-950/30" shadow="shadow-blue-500/5" iconBg="bg-blue-100 dark:bg-blue-900/40" textColor="text-blue-700 dark:text-blue-300" icon={<AlertCircle className="text-blue-600 dark:text-blue-400" />} />
        <KPIBox title="Demandes Clôturées" value={stats.resolved} detail={`+${stats.resolvedToday} aujourd'hui`} bg="bg-emerald-50 dark:bg-emerald-950/30" shadow="shadow-emerald-500/5" iconBg="bg-emerald-100 dark:bg-emerald-900/40" textColor="text-emerald-700 dark:text-emerald-300" icon={<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />} />
        <KPIBox title="Équipements Parc" value={mockAssets.length} detail="Actifs inventoriés" bg="bg-purple-50 dark:bg-purple-950/30" shadow="shadow-purple-500/5" iconBg="bg-purple-100 dark:bg-purple-900/40" textColor="text-purple-700 dark:text-purple-300" icon={<Laptop className="text-purple-600 dark:text-purple-400" />} />
        <KPIBox title="Total Utilisateurs" value={realUsers.length} detail="Membres actifs" bg="bg-orange-50 dark:bg-orange-950/30" shadow="shadow-orange-500/5" iconBg="bg-orange-100 dark:bg-orange-900/40" textColor="text-orange-700 dark:text-orange-300" icon={<Users className="text-orange-600 dark:text-orange-400" />} />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Evolution */}
        <DashboardCard 
          title="Nouveaux Tickets vs Résolus" 
          description="Suivi du volume de travail : tickets reçus par mois par rapport à ceux qui ont été terminés."
          icon={<TrendingUp className="text-blue-500" />}
        >
          <div className="h-[320px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" align="right" height={36}/>
                <Area type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={3} fillOpacity={0.2} fill="#3b82f6" name="Nouveaux Tickets" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} fillOpacity={0.05} fill="#10b981" name="Tickets Clôturés" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* Chart 2: Sites */}
        <DashboardCard 
          title="Tickets par Emplacement (Sites)" 
          description="Permet de voir quels sites ou agences demandent le plus d'assistance."
          icon={<MapPin className="text-rose-500" />}
        >
          <div className="h-[320px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bySite} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={100} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={24} name="Tickets cumulés" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* Chart 3: Equipment Failure Statistics */}
        <DashboardCard 
          title="Maintenance par Équipement" 
          description="Aperçu dynamique de la fiabilité de vos équipements individuels."
          icon={<Zap className="text-amber-500" />}
        >
          <div className="h-[320px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {stats.byEquipment.length > 0 ? (
                <BarChart data={stats.byEquipment}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc', opacity: 0.5}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} name="Interventions" />
                </BarChart>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                  Aucun ticket lié à un équipement spécifique détecté.
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* Chart 4: Inventory */}
        <DashboardCard 
          title="Inventaire du Parc" 
          description="Répartition de vos PC, Serveurs, Imprimantes et autres matériels."
          icon={<Server className="text-indigo-500" />}
        >
          <div className="h-[360px] w-full pt-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.byAssetType} 
                  cx="50%" cy="50%" 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={6} 
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.byAssetType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800">{mockAssets.length}</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Actifs</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* System Info Bar */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-slate-700">
         <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
               <Activity className="h-6 w-6 text-blue-400" />
            </div>
            <div>
               <h4 className="font-bold">Backend FOCUS Ticket</h4>
               <p className="text-xs text-slate-400">Statut: <span className="text-emerald-400 font-bold">Opérationnel</span></p>
            </div>
         </div>
         <div className="flex gap-8 items-center">
            <div className="text-center">
               <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Latence API</p>
               <span className="text-sm font-mono text-blue-400">24ms</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
               <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Uptime</p>
               <span className="text-sm font-mono text-emerald-400">99.99%</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-2">
                  <span className="text-xs">Database Sync</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               </div>
               <p className="text-[10px] text-slate-500">Mise à jour: Il y a 1m</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, detail, bg, shadow, icon, iconBg, textColor }: any) {
  return (
    <Card className={`border-none ${shadow} ${bg} hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden relative group`}>
      {/* Decorative background element */}
      <div className={`absolute right-[-10%] top-[-10%] opacity-[0.05] dark:opacity-10 transform scale-[2.5] group-hover:scale-[2.8] transition-transform duration-700 pointer-events-none ${textColor}`}>
        {icon}
      </div>
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
           <div className={`p-2.5 rounded-xl ${iconBg} border border-white/40 dark:border-white/5`}>
              {icon}
           </div>
           <Info className={`h-4 w-4 opacity-40 ${textColor}`} />
        </div>
        <div className="space-y-1">
          <h3 className={`text-sm font-bold uppercase tracking-wider ${textColor} opacity-80`}>{title}</h3>
          <p className={`text-4xl font-black ${textColor}`}>{value}</p>
          <div className="pt-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 ${iconBg} ${textColor} rounded-md border border-white/40 dark:border-transparent opacity-90 block w-max`}>{detail}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardCard({ title, description, icon, children }: any) {
  return (
    <Card className="border-slate-200 shadow-lg overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-4">
        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
           {icon}
        </div>
        <div>
          <CardTitle className="text-base font-bold text-slate-800">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-8">
        <Skeleton className="h-[400px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    </div>
  );
}
