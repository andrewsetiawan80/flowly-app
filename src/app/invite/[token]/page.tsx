"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";

interface InvitationDetail {
  workspace: { id: string; name: string; color: string | null };
  invitedBy: { name: string | null; email: string };
  email: string;
  role: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { refreshWorkspaces, setActiveWorkspaceId } = useWorkspace();

  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  const fetchInvitation = useCallback(async () => {
    try {
      const res = await fetch(`/api/invitations/${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvitation(data.invitation);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid invitation");
      }
    } catch {
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        await refreshWorkspaces();
        setActiveWorkspaceId(data.workspace.id);
        router.push("/dashboard");
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to accept invitation");
      }
    } catch {
      setError("Network error");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      await fetch(`/api/invitations/${token}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <X className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold">{error}</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-8 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-center space-y-6"
      >
        <div
          className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg"
          style={{ backgroundColor: invitation.workspace.color || "#6366f1" }}
        >
          {invitation.workspace.name[0].toUpperCase()}
        </div>

        <div>
          <h2 className="text-xl font-bold">You&apos;re invited!</h2>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium text-foreground">
              {invitation.invitedBy.name || invitation.invitedBy.email}
            </span>
            {" "}invited you to join
          </p>
          <p className="text-lg font-semibold mt-1">{invitation.workspace.name}</p>
          <p className="text-xs text-muted-foreground mt-1">as {invitation.role}</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDecline}
            className="flex-1"
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Join Workspace
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
