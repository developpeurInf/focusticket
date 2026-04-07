
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AreaChart,
  Area,
  Legend,
  Cell
} from "recharts";
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle2, Monitor } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTickets } from "@/data/ticketService";
import { getAssets } from "@/data/assetService";
import { getUsers } from "@/data/userService";
import { useToast } from "@/components/ui/use-toast";
import { downloadCSV, ticketsToCSV } from "@/utils/exportUtils";
import { useMemo } from "react";



export default function ReportDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Color palette for charts
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  
  // Data fetching
  const { data: ticketsData, isLoading: loadingTickets } = useQuery({ 
    queryKey: ['tickets'], 
    queryFn: () => getTickets({ limit: 5000 }) // Load extensive data for reports
  });
  const tickets = ticketsData?.tickets || [];
  const { data: assetsData, isLoading: loadingAssets } = useQuery({ queryKey: ['assets'], queryFn: () => getAssets({ limit: 5000 }) });
  const assets = assetsData?.assets || [];
  const { data: usersData, isLoading: loadingUsers } = useQuery({ queryKey: ['users'], queryFn: () => getUsers({ limit: 5000 }) });
  const users = usersData?.users || [];


  const stats = useMemo(() => {
    // 1. Tickets by Priority
    const priorityMap: Record<string, number> = {};
    tickets.forEach(t => {
      priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;
    });
    const byPriority = Object.entries(priorityMap).map(([name, value]) => ({ name, value }));

    // 2. Tickets by Status
    const statusMap: Record<string, number> = {};
    tickets.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    const byStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // 3. Asset distribution by Type
    const assetTypeMap: Record<string, number> = {};
    assets.forEach(a => {
      const type = a.type || 'Inconnu';
      assetTypeMap[type] = (assetTypeMap[type] || 0) + 1;
    });
    const byAssetType = Object.entries(assetTypeMap).map(([name, value]) => ({ name, value }));

    // 4. Asset Status (Health of Infrastructure)
    const assetStatusMap: Record<string, number> = {};
    assets.forEach(a => {
      assetStatusMap[a.status] = (assetStatusMap[a.status] || 0) + 1;
    });
    const byAssetStatus = Object.entries(assetStatusMap).map(([name, value]) => ({ 
      name: name === 'in-use' ? 'En service' : name === 'available' ? 'Disponible' : 'En réparation',
      value 
    }));

    // 5. Monthly Trend
    const trendMap: Record<string, { month: string; opened: number; resolved: number }> = {};
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthYear = d.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      trendMap[key] = { month: monthYear, opened: 0, resolved: 0 };
      last6Months.push(key);
    }

    tickets.forEach(t => {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (trendMap[key]) {
        trendMap[key].opened++;
        if (t.status === 'closed') {
          trendMap[key].resolved++;
        }
      }
    });
    const monthlyTrends = last6Months.map(key => trendMap[key]);

    // 6. User performance (technicians)
    const techPerformance = users
      .filter(u => ['tech', 'admin', 'intervenant', 'agent', 'technicien'].includes(u.role?.toLowerCase()))
      .map(u => {
        const resolvedCount = tickets.filter(t => {
          const isAssigned = t.assignedTo === u.name;
          const isResolved = ['resolved', 'Résolu', 'resolu', 'closed', 'Clos', 'clos'].includes(t.status as string);
          return isAssigned && isResolved;
        }).length;
        
        const activeCount = tickets.filter(t => {
          const isAssigned = t.assignedTo === u.name;
          const isActive = ['open', 'Ouvert', 'ouvert', 'in-progress', 'En cours', 'en-cours'].includes(t.status as string);
          return isAssigned && isActive;
        }).length;

        return {
          name: u.name,
          resolved: resolvedCount,
          active: activeCount
        };
      })
      .filter(u => u.resolved > 0 || u.active > 0) // Only show techs with actual work
      .sort((a, b) => b.resolved - a.resolved);

    // 7. General KPI
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'closed').length;
    const slaRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
    const activeAssets = assets.filter(a => a.status === 'in-use' || a.status === 'active').length;

    return { 
      byPriority, 
      byStatus, 
      byAssetType, 
      byAssetStatus, 
      monthlyTrends, 
      techPerformance,
      kpi: { totalTickets, resolvedTickets, slaRate, totalAssets: assets.length, activeAssets }
    };
  }, [tickets, assets, users]);

  const refreshAction = () => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast({ title: "Données actualisées", description: "Le tableau de bord a été mis à jour." });
  };

  const exportCSV = () => {
    const csv = ticketsToCSV(tickets);
    downloadCSV(csv, `stats-export-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Export CSV prêt", description: "Le fichier a été téléchargé." });
  };

  if (loadingTickets || loadingAssets || loadingUsers) {
    return <div className="flex justify-center items-center h-64"><RefreshCw className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analyse Stratégique</h2>
          <p className="text-muted-foreground">Données consolidées du parc informatique et de la maintenance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            Exporter CSV
          </Button>
          <Button onClick={refreshAction} variant="secondary" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Tickets Cumulés</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.kpi.totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Volume total enregistré</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Taux de Résolution</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{stats.kpi.slaRate}%</div>
            <p className="text-xs text-emerald-600/80 mt-1">SLA - Performance globale</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Inventaire Actif</p>
              <Monitor className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-indigo-700">{stats.kpi.activeAssets}</div>
            <p className="text-xs text-indigo-600/80 mt-1">Sur {stats.kpi.totalAssets} équipements</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Alertes Critiques</p>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700">
              {stats.byPriority.find(p => p.name === 'critical' || p.name === 'Critique')?.value || 0}
            </div>
            <p className="text-xs text-amber-600/80 mt-1">Tickets haute priorité</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="tickets">Maintenance</TabsTrigger>
          <TabsTrigger value="assets">Parc Informatique</TabsTrigger>
          <TabsTrigger value="performance">Équipe</TabsTrigger>
        </TabsList>

        {/* MAINTENANCE TAB */}
        <TabsContent value="tickets" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Volume et Résolution</CardTitle>
                <CardDescription>Évolution des requêtes sur les 6 derniers mois.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyTrends}>
                    <defs>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="opened" stroke="#6366f1" fillOpacity={1} fill="url(#colorOpened)" name="Ouverts" />
                    <Area type="monotone" dataKey="resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" name="Résolus" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sévérité des Incidents</CardTitle>
                <CardDescription>Répartition par niveau de priorité.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byPriority}
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.byPriority.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ASSETS TAB */}
        <TabsContent value="assets" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Répartition du Parc</CardTitle>
                <CardDescription>Composition par type d'équipement.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byAssetType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Équipements" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Santé de l'Infrastructure</CardTitle>
                <CardDescription>Disponibilité et état opérationnel.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byAssetStatus}
                      cx="50%" cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {stats.byAssetStatus.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'En service' ? '#10b981' : entry.name === 'Disponible' ? '#6366f1' : '#ef4444'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Efficacité des Techniciens</CardTitle>
              <CardDescription>Nombre de tickets résolus par membre de l'équipe.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stats.techPerformance}
                  layout="vertical"
                  margin={{ left: 40, right: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    allowDecimals={false} 
                    domain={[0, 'dataMax + 1']} // Give some headroom for growth
                  />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" fill="#10b981" name="Tickets Résolus" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="active" fill="#f59e0b" name="En cours" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
    </div>
  );
}
