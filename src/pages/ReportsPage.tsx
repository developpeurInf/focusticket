
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ReportDashboard from "@/components/reports/ReportDashboard";
import { useState } from "react";

export default function ReportsPage() {
  const [userRole, setUserRole] = useState<'admin' | 'agent' | 'customer'>('admin');

  const switchRole = (newRole: 'admin' | 'agent' | 'customer') => {
    setUserRole(newRole);
  };

  return (
    <div className="app-shell relative flex h-[100dvh] w-full overflow-hidden bg-background">
        <Sidebar userRole={userRole} />
        
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header userRole={userRole} onSwitchRole={switchRole} />
          
          <div className="relative flex-1 overflow-auto p-4 md:p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rapports & Statistiques</h1>
                <p className="text-muted-foreground">
                  Visualisez les données de support et analysez les performances de votre équipe.
                </p>
              </div>
            </div>
            
            <ReportDashboard />
          </div>
        </main>
      </div>
  );
}
