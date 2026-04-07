import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold mb-4">404 - Page Non Trouvée</h1>
      <p className="text-muted-foreground mb-8">La page que vous recherchez n'existe pas.</p>
      <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
    </div>
  );
}
