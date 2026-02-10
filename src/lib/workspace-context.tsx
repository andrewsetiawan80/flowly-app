"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  ownerId: string;
  myRole: string;
  _count: { members: number; lists: number };
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspaceId: (id: string | null) => void;
  isPersonalMode: boolean;
  refreshWorkspaces: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspaceId: () => {},
  isPersonalMode: true,
  refreshWorkspaces: async () => {},
  loading: true,
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [mounted, setMounted] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
      // 401 = not authenticated, just keep empty array
    } catch (error) {
      // Network error or unauthenticated - just keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Load saved workspace from localStorage (client-side only)
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem("flowly-active-workspace");
      if (saved && saved !== "null") {
        setActiveWorkspaceId(saved);
      }
    } catch {
      // localStorage not available (SSR)
    }
  }, [mounted]);

  // Save active workspace to localStorage
  const handleSetWorkspace = useCallback((id: string | null) => {
    setActiveWorkspaceId(id);
    if (id) {
      localStorage.setItem("flowly-active-workspace", id);
    } else {
      localStorage.removeItem("flowly-active-workspace");
    }
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspaceId: handleSetWorkspace,
        isPersonalMode: !activeWorkspaceId,
        refreshWorkspaces: fetchWorkspaces,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
