import AppLayout from "@/components/AppLayout";
import UserList from "@/components/UserList";
import { useAuth } from "@/contexts/AuthContext";

export default function UsersPage() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Accès refusé</div>;
  }

  return (
    <AppLayout>
      <UserList />
    </AppLayout>
  );
}
