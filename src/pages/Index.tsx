
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import DashboardOverview from "@/components/DashboardOverview";
import TicketList from "@/components/TicketList";
import UserList from "@/components/UserList";
import Sidebar from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";

import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [userRole, setUserRole] = useState<'admin' | 'agent' | 'customer'>('admin');
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Get tab and filter from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const filterParam = searchParams.get("filter");
    
    if (tabParam) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("overview");
    }
    
    setStatusFilter(filterParam || "");
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    searchParams.set("tab", value);
    setSearchParams(searchParams);
  };

  const switchRole = (newRole: 'admin' | 'agent' | 'customer') => {
    setUserRole(newRole);
    toast({
      title: "Rôle modifié",
      description: `Vous êtes maintenant connecté en tant que ${newRole === 'agent' ? 'agent de support' : newRole === 'admin' ? 'administrateur' : 'client'}.`,
    });
  };

  return (
    <div className="flex h-screen w-full bg-background">
        <Sidebar userRole={userRole} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header userRole={userRole} onSwitchRole={switchRole} />
          
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
                {userRole === 'admin' && (
                  <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="overview">
                <DashboardOverview userRole={userRole} />
              </TabsContent>
              
              <TabsContent value="tickets">
                <div className="min-h-[500px]">
                  <TicketList 
                    userRole={userRole} 
                    initialStatusFilter={statusFilter !== "all" ? statusFilter : ""}
                  />
                </div>
              </TabsContent>

              {userRole === 'admin' && (
                <TabsContent value="users">
                  <UserList userRole={userRole} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
  );
};

export default Index;
