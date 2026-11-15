import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

interface AppLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "agent" | "customer";
}

/**
 * Structure commune des pages : menu latéral (tiroir sur mobile), en-tête et zone de contenu défilante.
 * Identique à celle des pages Tableau de bord, Actifs, FAQ, Rapports et Paramètres.
 */
export default function AppLayout({ children, userRole = "admin" }: AppLayoutProps) {
  return (
    <div className="app-shell relative flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar userRole={userRole} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header userRole={userRole} onSwitchRole={() => { }} />
        <div className="relative flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
