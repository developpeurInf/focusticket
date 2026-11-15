import AppLayout from "@/components/AppLayout";
import UserProfile from "@/components/UserProfile";
import { useParams } from "react-router-dom";

export default function UserPage() {
  const { userId } = useParams();

  return (
    <AppLayout>
      <UserProfile userId={userId} />
    </AppLayout>
  );
}
