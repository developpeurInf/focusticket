
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "@/types/user";
import { getUserById } from "@/api/userService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, PenSquare, UserCog } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { mockUsers } from "@/data/mockUsers";

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        // For now, use mock data
        const foundUser = mockUsers.find(u => u.id === userId);
        if (foundUser) {
          setUser(foundUser);
        } else {
          // In a real app, we would fetch from API
          // const response = await getUserById(userId!);
          // setUser(response.data);
          
          toast({
            title: "User not found",
            description: `No user with ID ${userId} exists.`,
            variant: "destructive"
          });
          navigate("/users");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast({
          title: "Error",
          description: "Failed to load user details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, navigate, toast]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { bg: 'bg-purple-100', text: 'text-purple-800' };
      case 'agent':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'customer':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>The requested user could not be found.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate(-1)} variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/users/${userId}/edit`)}
          >
            <PenSquare className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-muted">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadge(user.role).bg} ${getRoleBadge(user.role).text}`}>
                    {user.role}
                  </div>
                  <Badge variant={getStatusBadgeVariant(user.status) as any}>
                    {user.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{user.email}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Basic Information</h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                  <dd className="mt-1">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Department</dt>
                  <dd className="mt-1">{user.department || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Last Active</dt>
                  <dd className="mt-1">{user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}</dd>
                </div>
              </dl>
            </div>

            {(user.role === 'admin' || user.role === 'agent') && (
              <div>
                <h3 className="text-lg font-medium">Performance</h3>
                <Separator className="my-2" />
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Tickets Assigned</dt>
                    <dd className="mt-1">{user.ticketsAssigned || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Tickets Resolved</dt>
                    <dd className="mt-1">{user.ticketsResolved || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Resolution Rate</dt>
                    <dd className="mt-1">
                      {user.ticketsAssigned && user.ticketsAssigned > 0
                        ? `${Math.round((user.ticketsResolved || 0) / user.ticketsAssigned * 100)}%`
                        : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
