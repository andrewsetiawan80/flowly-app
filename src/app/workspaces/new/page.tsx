"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/workspace-context";

const WORKSPACE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#a855f7", "#14b8a6", "#64748b",
];

export default function NewWorkspacePage() {
  const router = useRouter();
  const { refreshWorkspaces, setActiveWorkspaceId } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
      });
      if (res.ok) {
        const data = await res.json();
        await refreshWorkspaces();
        setActiveWorkspaceId(data.workspace.id);
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create Workspace</h1>
          <p className="text-sm text-muted-foreground">Set up a team workspace to collaborate with others</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg space-y-6"
      >
        {/* Preview */}
        <div className="flex items-center gap-4 p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white text-xl font-bold shadow-lg"
            style={{ backgroundColor: color }}
          >
            {name ? name[0].toUpperCase() : "W"}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{name || "Workspace name"}</h3>
            <p className="text-sm text-muted-foreground">{description || "No description"}</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Workspace Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Design Team, Engineering..."
            className="h-12"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this workspace for?"
            rows={3}
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {WORKSPACE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-lg transition-all ${
                  color === c ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
        >
          {creating ? "Creating..." : "Create Workspace"}
        </Button>
      </motion.div>
    </div>
  );
}
