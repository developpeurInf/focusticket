import Sidebar from "@/components/Sidebar";
import UserList from "@/components/UserList";
import { useAuth } from "@/contexts/AuthContext";

export default function UsersPage() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Accès refusé</div>;
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-8">
          <UserList />
        </div>
      </main>
    </div>
  );
}
