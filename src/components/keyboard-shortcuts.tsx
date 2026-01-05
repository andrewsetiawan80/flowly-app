"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  onNewTask?: () => void;
  onSearch?: () => void;
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command menu / Search", action: "search" },
  { keys: ["⌘", "N"], description: "Create new task", action: "newTask" },
  { keys: ["⌘", "B"], description: "Toggle sidebar", action: "sidebar" },
  { keys: ["G", "H"], description: "Go to Dashboard", action: "goDashboard" },
  { keys: ["G", "T"], description: "Go to All Tasks", action: "goTasks" },
  { keys: ["G", "B"], description: "Go to Board view", action: "goBoard" },
  { keys: ["G", "C"], description: "Go to Calendar", action: "goCalendar" },
  { keys: ["G", "S"], description: "Go to Statistics", action: "goStats" },
  { keys: ["?"], description: "Show keyboard shortcuts", action: "showHelp" },
  { keys: ["Esc"], description: "Close dialog / Cancel", action: "escape" },
];

export function KeyboardShortcutsProvider({
  children,
  onNewTask,
  onSearch,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || 
                      target.tagName === "TEXTAREA" || 
                      target.isContentEditable;

      // Don't handle shortcuts when typing in inputs (except for specific ones)
      if (isInput && !e.metaKey && !e.ctrlKey) {
        setGPressed(false);
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Command/Ctrl + K - Search
      if (cmdKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Command/Ctrl + N - New Task
      if (cmdKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewTask?.();
        return;
      }

      // Command/Ctrl + B - Toggle Sidebar
      if (cmdKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        // Dispatch custom event for sidebar toggle
        window.dispatchEvent(new CustomEvent("toggle-sidebar"));
        return;
      }

      // ? - Show help
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Escape - Close dialogs
      if (e.key === "Escape") {
        setShowHelp(false);
        setGPressed(false);
        return;
      }

      // G + Key navigation
      if (!isInput) {
        if (e.key.toLowerCase() === "g") {
          setGPressed(true);
          setTimeout(() => setGPressed(false), 1000);
          return;
        }

        if (gPressed) {
          setGPressed(false);
          switch (e.key.toLowerCase()) {
            case "h":
              e.preventDefault();
              router.push("/dashboard");
              break;
            case "t":
              e.preventDefault();
              router.push("/");
              break;
            case "b":
              e.preventDefault();
              router.push("/board");
              break;
            case "c":
              e.preventDefault();
              router.push("/calendar");
              break;
            case "s":
              e.preventDefault();
              router.push("/stats");
              break;
          }
        }
      }
    },
    [router, onNewTask, onSearch, gPressed]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {children}

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* General */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">General</h4>
              <div className="space-y-2">
                {SHORTCUTS.filter((s) => 
                  ["search", "newTask", "sidebar", "showHelp", "escape"].includes(s.action)
                ).map((shortcut) => (
                  <div key={shortcut.action} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h4>
              <div className="space-y-2">
                {SHORTCUTS.filter((s) => s.action.startsWith("go")).map((shortcut) => (
                  <div key={shortcut.action} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Press <Badge variant="outline" className="font-mono text-xs mx-1">?</Badge> 
            anytime to show this help
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

