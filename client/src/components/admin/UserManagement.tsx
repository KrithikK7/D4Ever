import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserPrivileges, UserRole } from "@/contexts/AuthContext";

interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  privileges: UserPrivileges;
}

const privilegeLabels: Record<keyof UserPrivileges, string> = {
  canCreateSections: "Create Sections",
  canEditOwnSections: "Edit Own Sections & Pages",
  canEditSections: "Edit All Sections & Pages",
  canDeleteOwnSections: "Delete Own Sections & Pages",
  canDeleteSections: "Delete All Sections & Pages",
};

const privilegeOrder: (keyof UserPrivileges)[] = [
  "canCreateSections",
  "canEditOwnSections",
  "canEditSections",
  "canDeleteOwnSections",
  "canDeleteSections",
];

export function UserManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "reader" as UserRole,
    privileges: {
      canCreateSections: false,
      canEditOwnSections: false,
      canEditSections: false,
      canDeleteOwnSections: false,
      canDeleteSections: false,
    },
  });

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/users"],
  });

  const sortedUsers = useMemo(() => {
    const admins = users
      .filter((user) => user.role === "admin")
      .sort((a, b) => a.username.localeCompare(b.username));
    const others = users
      .filter((user) => user.role !== "admin")
      .sort((a, b) => a.username.localeCompare(b.username));
    return [...admins, ...others];
  }, [users]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/users", {
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        ...newUser.privileges,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateOpen(false);
      setNewUser({
        username: "",
        password: "",
        role: "reader",
        privileges: {
          canCreateSections: false,
          canEditOwnSections: false,
          canEditSections: false,
          canDeleteOwnSections: false,
          canDeleteSections: false,
        },
      });
      toast({ title: "User created" });
    },
    onError: () => {
      toast({
        title: "Failed to create user",
        description: "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated" });
    },
    onError: () => {
      toast({
        title: "Failed to update user",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePrivilegeToggle = (id: string, key: keyof UserPrivileges, value: boolean) => {
    updateMutation.mutate({
      id,
      data: { [key]: value },
    });
  };

  const handleRoleChange = (id: string, role: UserRole) => {
    updateMutation.mutate({
      id,
      data: { role },
    });
  };

  const handleCreateUser = () => {
    if (!newUser.username.trim() || newUser.password.length < 6) {
      toast({
        title: "Invalid input",
        description: "Username and password are required. Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
            User Management
          </h2>
          <p className="font-noto text-sm text-muted-foreground mt-1">
            Create users and assign granular section privileges.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-user">
          Create User
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground font-noto">
            Loading users...
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground font-noto">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedUsers.map((user) => (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="font-myeongjo text-xl">{user.username}</CardTitle>
                  <p className="font-noto text-sm text-muted-foreground">User ID: {user.id}</p>
                </div>
                <div className="w-full sm:w-48">
                  <Label className="font-noto text-xs uppercase text-muted-foreground">Role</Label>
                  <Select value={user.role} onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}>
                    <SelectTrigger data-testid={`select-role-${user.id}`}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reader">Reader</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {privilegeOrder.map((key) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="font-noto text-sm font-medium">{privilegeLabels[key]}</p>
                        <p className="font-noto text-xs text-muted-foreground">
                          {user.privileges[key] ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                      <Switch
                        checked={user.privileges[key]}
                        onCheckedChange={(checked) => handlePrivilegeToggle(user.id, key, checked)}
                        data-testid={`switch-${key}-${user.id}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Invite a collaborator and assign privileges.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Username</Label>
              <Input
                id="new-username"
                value={newUser.username}
                onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole) => setNewUser((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Reader</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="font-noto text-sm text-muted-foreground">Privileges</Label>
              {privilegeOrder.map((key) => (
                <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="font-noto text-sm font-medium">{privilegeLabels[key]}</p>
                    <p className="font-noto text-xs text-muted-foreground">
                      {newUser.privileges[key] ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={newUser.privileges[key]}
                    onCheckedChange={(checked) =>
                      setNewUser((prev) => ({
                        ...prev,
                        privileges: { ...prev.privileges, [key]: checked },
                      }))
                    }
                    data-testid={`switch-create-${key}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
