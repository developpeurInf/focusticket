import Sidebar from "@/components/Sidebar";
import UserProfile from "@/components/UserProfile";
import { useParams } from "react-router-dom";

export default function UserPage() {
  const { userId } = useParams();

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-8">
          <UserProfile userId={userId} />
        </div>
      </main>
    </div>
  );
}
