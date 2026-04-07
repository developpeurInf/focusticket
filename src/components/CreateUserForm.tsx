import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { User } from "@/types/user";
import { createUser, updateUserInfo } from "@/data/userService";

const formSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
  role: z.enum(["admin", "intervenant", "demandeur"], {
    required_error: "Veuillez sélectionner un rôle.",
  }),
  department: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"], {
    required_error: "Veuillez sélectionner un statut.",
  }).default("active"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateUserFormProps {
  onUserCreated?: (user: User) => void;
  onUserUpdated?: (user: User) => void;
  onClose?: () => void;
  initialData?: User;
}

export default function CreateUserForm({ onUserCreated, onUserUpdated, onClose, initialData }: CreateUserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      email: initialData.email,
      role: initialData.role as any,
      department: initialData.department || "",
      status: initialData.status as any,
    } : {
      name: "",
      email: "",
      role: "demandeur",
      department: "",
      status: "active",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        const updated = await updateUserInfo(initialData.id, values);
        toast({ title: "Utilisateur modifié", description: `${values.name} a été mis à jour.` });
        if (onUserUpdated) onUserUpdated(updated);
      } else {
        const newUser = await createUser({
          name: values.name,
          email: values.email,
          role: values.role,
          department: values.department || undefined,
          status: values.status,
        });
        toast({ title: "Utilisateur créé", description: `${values.name} a été ajouté.` });
        if (onUserCreated) onUserCreated(newUser);
      }
      if (onClose) onClose();
      form.reset();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'utilisateur. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <Input placeholder="Nom complet de l'utilisateur" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse Email</FormLabel>
              <FormControl>
                <Input placeholder="email@exemple.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rôle</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="intervenant">Intervenant</SelectItem>
                  <SelectItem value="demandeur">Demandeur</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Département (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="Département" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          {onClose && (
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Traitement..." : (isEditing ? "Enregistrer" : "Créer l'utilisateur")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
