
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTicketById, updateTicketStatus, assignTicket, getTicketComments, addTicketComment } from "@/api/ticketService";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { addNotification } from "@/utils/notificationUtils";
import TicketDetails from "@/components/TicketDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: ticketData, isLoading: isLoadingTicket, error: ticketError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicketById(id!),
    enabled: !!id
  });
  
  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ['ticketComments', id],
    queryFn: () => getTicketComments(id!),
    enabled: !!id
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, newStatus }: { ticketId: string, newStatus: string }) => 
      updateTicketStatus(ticketId, newStatus),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      addNotification("Statut Modifié", `Le ticket ${id} est passé à : ${variables.newStatus}.`, "Agent");
      toast({
        title: "Status updated",
        description: "The ticket status has been updated successfully."
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "There was a problem updating the ticket status."
      });
    }
  });
  
  const assignTicketMutation = useMutation({
    mutationFn: ({ ticketId, agentId }: { ticketId: string, agentId: string }) => 
      assignTicket(ticketId, agentId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      addNotification("Ticket Assigné", `Le ticket ${id} a été assigné à ${variables.agentId}.`, "Admin");
      toast({
        title: "Ticket assigned",
        description: "The ticket has been assigned successfully."
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to assign ticket",
        description: "There was a problem assigning the ticket."
      });
    }
  });
  
  if (isLoadingTicket) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (ticketError) {
    return (
      <div className="container mx-auto py-6 text-center">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-destructive">Error Loading Ticket</h1>
        <p className="mt-2">There was a problem loading the ticket information.</p>
        <Button onClick={() => navigate("/")} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  const handleStatusChange = (newStatus: string) => {
    if (id) {
      updateStatusMutation.mutate({ ticketId: id, newStatus });
    }
  };
  
  const handleAssign = (agentId: string) => {
    if (id) {
      assignTicketMutation.mutate({ ticketId: id, agentId });
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      {ticketData && (
        <TicketDetails 
          ticket={ticketData.data} 
          comments={commentsData || []}
          isLoadingComments={isLoadingComments}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}
