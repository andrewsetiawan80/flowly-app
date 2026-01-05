"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  List,
  Plus,
  LogOut,
  CalendarDays,
  CalendarClock,
  Flame,
  Moon,
  Sun,
  Gem,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  ShoppingCart,
  CheckSquare,
  Columns3,
  BarChart3,
  Timer,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { REFRESH_EVENTS } from "@/lib/events";

interface Project {
  id: string;
  name: string;
  color: string | null;
  type: "PROJECT" | "CHECKLIST";
  parentId: string | null;
  taskCount?: number;
  childCount?: number;
  children?: Project[];
  _count?: { tasks: number; children: number };
}

// Recursive component to render project tree
function ProjectItem({ 
  project, 
  level = 0, 
  pathname, 
  collapsed,
  expandedProjects,
  toggleExpand,
  onAddSubproject,
}: { 
  project: Project; 
  level?: number;
  pathname: string;
  collapsed: boolean;
  expandedProjects: Set<string>;
  toggleExpand: (id: string) => void;
  onAddSubproject: (parentId: string) => void;
}) {
  const hasChildren = project.children && project.children.length > 0;
  const isExpanded = expandedProjects.has(project.id);
  const isActive = pathname === `/lists/${project.id}`;
  const taskCount = project.taskCount ?? project._count?.tasks ?? 0;

  if (collapsed && level > 0) return null;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200",
          isActive
            ? "bg-black/5 dark:bg-white/5 text-foreground"
            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
        )}
        style={{ paddingLeft: collapsed ? undefined : `${12 + level * 16}px` }}
      >
        {/* Expand/Collapse button */}
        {hasChildren && !collapsed ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleExpand(project.id);
            }}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronDown 
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                !isExpanded && "-rotate-90"
              )} 
            />
          </button>
        ) : !collapsed ? (
          <div className="w-4" />
        ) : null}

        <Link
          href={`/lists/${project.id}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {project.type === "CHECKLIST" ? (
            <ShoppingCart 
              className="h-4 w-4 flex-shrink-0" 
              style={{ color: project.color || "#10b981" }}
            />
          ) : hasChildren ? (
            <FolderOpen 
              className="h-4 w-4 flex-shrink-0" 
              style={{ color: project.color || "#f97316" }}
            />
          ) : (
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || "#f97316" }}
            />
          )}
          {!collapsed && (
            <>
              <span className="flex-1 truncate font-medium">{project.name}</span>
              {taskCount > 0 && (
                <span className="text-xs text-muted-foreground/70 font-medium tabular-nums">
                  {taskCount}
                </span>
              )}
            </>
          )}
        </Link>

        {/* Add sub-project button */}
        {!collapsed && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddSubproject(project.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            title="Add sub-project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && !collapsed && (
        <AnimatePresence>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {project.children!.map((child) => (
              <ProjectItem
                key={child.id}
                project={child}
                level={level + 1}
                pathname={pathname}
                collapsed={collapsed}
                expandedProjects={expandedProjects}
                toggleExpand={toggleExpand}
                onAddSubproject={onAddSubproject}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [flatLists, setFlatLists] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) {
      setCollapsed(JSON.parse(savedCollapsed));
    }
    const savedExpanded = localStorage.getItem("sidebar-expanded-projects");
    if (savedExpanded) {
      setExpandedProjects(new Set(JSON.parse(savedExpanded)));
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setFlatLists(data.lists || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session, fetchProjects]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (session) {
        fetchProjects();
      }
    };

    window.addEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    
    return () => {
      window.removeEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    };
  }, [session, fetchProjects]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/signin" });
  };

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const toggleExpand = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem("sidebar-expanded-projects", JSON.stringify([...next]));
      return next;
    });
  };

  const handleAddSubproject = (parentId: string) => {
    router.push(`/lists/new?parentId=${parentId}`);
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Flame },
    { href: "/myday", label: "My day", icon: CalendarDays },
    { href: "/today", label: "Next 7 days", icon: CalendarClock },
  ];

  const viewItems = [
    { href: "/board", label: "Kanban Board", icon: Columns3 },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/stats", label: "Statistics", icon: BarChart3 },
  ];

  if (!mounted) return null;

  const totalTasks = flatLists.reduce((sum, list) => sum + (list._count?.tasks || 0), 0);

  const sidebarContent = (
    <div className="flex-1 flex flex-col py-6 px-4 space-y-6 overflow-y-auto">
      {/* App Branding */}
      <div className={cn("flex items-center px-2", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <motion.div 
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Flame className="h-5 w-5 text-white" />
          </motion.div>
          {!collapsed && (
            <motion.h1 
              className="text-xl font-bold tracking-tight"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 dark:from-orange-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                Flowly
              </span>
            </motion.h1>
          )}
        </Link>

        {!collapsed && (
          <motion.button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-amber-400" />
            ) : (
              <Sun className="h-4 w-4 text-orange-500" />
            )}
          </motion.button>
        )}
      </div>

      {/* User Profile */}
      {session?.user && !collapsed && (
        <motion.div 
          className="px-2 pb-4 border-b border-black/5 dark:border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 via-pink-500 to-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-500/25">
              {session.user.email?.[0].toUpperCase() || "D"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {session.user.email?.split('@')[0] || "Demo User"}
              </p>
              <p className="text-xs text-muted-foreground/70 font-medium">Free Plan</p>
            </div>
          </div>
        </motion.div>
      )}

      {session?.user && collapsed && (
        <div className="flex justify-center pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 via-pink-500 to-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-500/25">
            {session.user.email?.[0].toUpperCase() || "D"}
          </div>
        </div>
      )}

      {/* Premium CTA */}
      {!collapsed ? (
        <div className="px-2">
          <Button 
            className="w-full h-11 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 rounded-xl"
            onClick={() => router.push("/premium")}
          >
            <Gem className="mr-2 h-4 w-4" />
            Go Premium
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button 
            size="icon"
            className="h-10 w-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl"
            onClick={() => router.push("/premium")}
          >
            <Gem className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-orange-500")} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </Link>
          );
        })}

        <Link
          href="/tasks"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            collapsed && "justify-center px-2",
            pathname === "/tasks"
              ? "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10"
              : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
          )}
          title={collapsed ? "All my tasks" : undefined}
        >
          <List className={cn("h-[18px] w-[18px] flex-shrink-0", pathname === "/tasks" && "text-orange-500")} />
          {!collapsed && (
            <>
              <span className="flex-1">All my tasks</span>
              <span className="text-xs text-muted-foreground/70 font-medium tabular-nums">
                {totalTasks}
              </span>
            </>
          )}
        </Link>

        {/* Views Section */}
        {!collapsed && (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 py-1 mb-1">
              Views
            </h2>
          </div>
        )}
        
        {viewItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/10"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-violet-500")} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Projects Section */}
      {!collapsed && (
        <div className="space-y-2 px-2">
          <div className="flex items-center justify-between px-2 py-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Projects
            </h2>
            <button
              onClick={() => router.push("/lists/new")}
              className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              title="New project"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-0.5">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                pathname={pathname}
                collapsed={collapsed}
                expandedProjects={expandedProjects}
                toggleExpand={toggleExpand}
                onAddSubproject={handleAddSubproject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Collapsed Projects */}
      {collapsed && flatLists.filter(l => !l.parentId).length > 0 && (
        <div className="flex flex-col items-center gap-2 px-2">
          {flatLists.filter(l => !l.parentId).slice(0, 5).map((project) => (
            <Link
              key={project.id}
              href={`/lists/${project.id}`}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={project.name}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: project.color || "#f97316" }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed left-0 top-0 z-50 h-screen w-[280px] max-w-[85vw] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-black/5 dark:border-white/5 flex flex-col safe-area-inset"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
            <div className="border-t border-black/5 dark:border-white/5 p-4 pb-safe">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all active:scale-[0.98]"
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 80 : 288 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed left-0 top-0 z-40 h-screen bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-black/5 dark:border-white/5 flex-col"
      >
        {sidebarContent}
        
        <div className="border-t border-black/5 dark:border-white/5 p-4">
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 shadow-lg hover:scale-110 transition-transform"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </motion.aside>
    </>
  );
}
