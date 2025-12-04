import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Trash2, Loader2, UserCheck } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "League name must be at least 3 characters").max(50),
  description: z.string().max(200).optional(),
  is_private: z.boolean(),
  max_members: z.number().min(2).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LeagueSettingsDialogProps {
  leagueId: string;
  currentName: string;
  currentDescription: string | null;
  currentIsPrivate: boolean;
  currentMaxMembers: number | null;
}

export function LeagueSettingsDialog({
  leagueId,
  currentName,
  currentDescription,
  currentIsPrivate,
  currentMaxMembers,
}: LeagueSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentName,
      description: currentDescription || "",
      is_private: currentIsPrivate,
      max_members: currentMaxMembers || 50,
    },
  });

  // Fetch league members for ownership transfer
  const { data: members } = useQuery({
    queryKey: ["league-members-for-transfer", leagueId],
    queryFn: async () => {
      const { data: membersData, error } = await supabase
        .from("league_members")
        .select("user_id, role")
        .eq("league_id", leagueId)
        .neq("role", "owner");

      if (error) throw error;
      if (!membersData || membersData.length === 0) return [];

      const userIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      return membersData.map(m => ({
        userId: m.user_id,
        username: profileMap.get(m.user_id) || "Unknown",
        role: m.role,
      }));
    },
    enabled: open,
  });

  const updateLeague = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase
        .from("leagues")
        .update({
          name: values.name,
          description: values.description,
          is_private: values.is_private,
          max_members: values.max_members,
        })
        .eq("id", leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "League updated",
        description: "Your league settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transferOwnership = useMutation({
    mutationFn: async (newOwnerId: string) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update new owner to 'owner' role
      const { error: newOwnerError } = await supabase
        .from("league_members")
        .update({ role: "owner" })
        .eq("league_id", leagueId)
        .eq("user_id", newOwnerId);

      if (newOwnerError) throw newOwnerError;

      // Update current owner to 'member' role
      const { error: oldOwnerError } = await supabase
        .from("league_members")
        .update({ role: "member" })
        .eq("league_id", leagueId)
        .eq("user_id", user.id);

      if (oldOwnerError) throw oldOwnerError;

      // Update leagues table created_by
      const { error: leagueError } = await supabase
        .from("leagues")
        .update({ created_by: newOwnerId })
        .eq("id", leagueId);

      if (leagueError) throw leagueError;
    },
    onSuccess: () => {
      toast({
        title: "Ownership transferred",
        description: "You are now a member of this league.",
      });
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-membership", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-members", leagueId] });
      setTransferConfirmOpen(false);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLeague = useMutation({
    mutationFn: async () => {
      // First delete all league members
      const { error: membersError } = await supabase
        .from("league_members")
        .delete()
        .eq("league_id", leagueId);
      
      if (membersError) throw membersError;

      // Then delete the league
      const { error } = await supabase
        .from("leagues")
        .delete()
        .eq("id", leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "League deleted",
        description: "The league has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["user-leagues"] });
      setOpen(false);
      navigate("/leagues");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    updateLeague.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>League Settings</DialogTitle>
          <DialogDescription>
            Update your league information and settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>League Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter league name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your league..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description for your league (max 200 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Members</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of members (2-100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_private"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Private League</FormLabel>
                    <FormDescription>
                      Private leagues require an invite code to join
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateLeague.isPending}>
                {updateLeague.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <Separator className="my-6" />

        {/* Transfer Ownership */}
        {members && members.length > 0 && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transfer Ownership</h3>
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Transfer ownership to another member. You'll become a regular member.
                </p>
                <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.username} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AlertDialog open={transferConfirmOpen} onOpenChange={setTransferConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="gap-2"
                      disabled={!selectedNewOwner}
                    >
                      <UserCheck className="h-4 w-4" />
                      Transfer Ownership
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Transfer Ownership?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to transfer ownership to{" "}
                        <strong>{members.find(m => m.userId === selectedNewOwner)?.username}</strong>?
                        You will become a regular member and lose owner privileges.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => transferOwnership.mutate(selectedNewOwner)}
                        disabled={transferOwnership.isPending}
                      >
                        {transferOwnership.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Transferring...
                          </>
                        ) : (
                          "Transfer"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <Separator className="my-6" />
          </>
        )}

        {/* Danger Zone */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div className="space-y-0.5">
              <p className="font-medium">Delete League</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this league and all its data
              </p>
            </div>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{currentName}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the league,
                    remove all members, and delete all associated cards and bets.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteLeague.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteLeague.isPending}
                  >
                    {deleteLeague.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete League"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
