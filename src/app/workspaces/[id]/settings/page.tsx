"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Crown,
  X,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
  invitedBy: { name: string | null; email: string };
}

interface WorkspaceDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  slug: string;
  ownerId: string;
  members: Member[];
  invitations: Invitation[];
  _count: { lists: number; tasks: number };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MEMBER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  VIEWER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { refreshWorkspaces, setActiveWorkspaceId } = useWorkspace();

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "settings">("members");

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Settings state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [copied, setCopied] = useState(false);

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
        setEditName(data.workspace.name);
        setEditDescription(data.workspace.description || "");
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const myMembership = workspace?.members.find(
    (m) => m.user.id === workspace.ownerId || true // We'll check role
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        fetchWorkspace();
      } else {
        const data = await res.json();
        setInviteError(data.error || "Failed to invite");
      }
    } catch {
      setInviteError("Network error");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchWorkspace();
    } catch {
      console.error("Failed to remove member");
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      fetchWorkspace();
    } catch {
      console.error("Failed to change role");
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || null }),
      });
      await refreshWorkspaces();
      fetchWorkspace();
    } catch {
      console.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!confirm("Are you sure you want to delete this workspace? All projects and tasks will be permanently deleted.")) return;
    if (!confirm("This action cannot be undone. Type 'delete' or press OK to confirm.")) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setActiveWorkspaceId(null);
      await refreshWorkspaces();
      router.push("/dashboard");
    } catch {
      console.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />
        <div className="h-64 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold"
            style={{ backgroundColor: workspace.color || "#6366f1" }}
          >
            {workspace.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground">
              {workspace.members.length} members · {workspace._count.lists} projects · {workspace._count.tasks} tasks
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/5 dark:border-white/5">
        {([
          { key: "members" as const, label: "Members", icon: Users },
          { key: "settings" as const, label: "Settings", icon: Building2 },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-6">
          {/* Invite */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Invite Member
            </h3>
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address..."
                className="flex-1 h-10"
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-10 rounded-xl border border-black/10 dark:border-white/10 bg-background px-3 text-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="h-10 bg-primary hover:bg-primary/90"
              >
                <Mail className="h-4 w-4 mr-1.5" />
                {inviting ? "..." : "Invite"}
              </Button>
            </div>
            {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
          </div>

          {/* Pending Invitations */}
          {workspace.invitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Pending Invitations ({workspace.invitations.length})
              </h3>
              {workspace.invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30">
                  <Mail className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <p className="text-[10px] text-muted-foreground">Invited as {ROLE_LABELS[inv.role]}</p>
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", ROLE_COLORS[inv.role])}>
                    {ROLE_LABELS[inv.role]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Current Members */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Members ({workspace.members.length})
            </h3>
            {workspace.members.map((member) => (
              <motion.div
                key={member.id}
                layout
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-semibold">
                  {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user.name || member.user.email.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{member.user.email}</p>
                </div>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", ROLE_COLORS[member.role])}>
                  {member.role === "OWNER" && <Crown className="h-2.5 w-2.5 inline mr-0.5" />}
                  {ROLE_LABELS[member.role]}
                </span>
                {member.role !== "OWNER" && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="h-7 text-[10px] rounded border border-black/10 dark:border-white/10 bg-background px-1"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-lg">
          <div className="space-y-4 p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="p-5 rounded-2xl border-2 border-red-200 dark:border-red-900 space-y-3">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
            <p className="text-xs text-muted-foreground">
              Permanently delete this workspace and all its projects, tasks, and data. This action cannot be undone.
            </p>
            <Button
              variant="outline"
              onClick={handleDeleteWorkspace}
              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Workspace
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
