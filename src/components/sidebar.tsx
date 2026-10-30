"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Home, CalendarDays, CalendarClock, ListTodo, Columns3, Table2, Calendar, GanttChart, BarChart3, Zap, Plus, Search, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Menu, ChevronRight, Folder, CheckSquare, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { REFRESH_EVENTS } from "@/lib/events";
import { useSidebar } from "@/lib/sidebar-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useGlobal } from "@/components/global-providers";
import { NotificationCenter } from "@/components/notification-center";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Project {
  id: string; name: string; color: string | null; type: string;
  children?: Project[]; taskCount?: number;
}
const sections = [
  { label: "Workspace", items: [
    { href: "/dashboard", label: "Overview", icon: Home },
    { href: "/myday", label: "My day", icon: CalendarDays },
    { href: "/today", label: "Next 7 days", icon: CalendarClock },
    { href: "/tasks", label: "All tasks", icon: ListTodo },
  ] },
  { label: "Plan", items: [
    { href: "/board", label: "Board", icon: Columns3 },
    { href: "/table", label: "Table", icon: Table2 },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/timeline", label: "Timeline", icon: GanttChart },
  ] },
  { label: "Tools", items: [
    { href: "/stats", label: "Insights", icon: BarChart3 },
    { href: "/automations", label: "Automations", icon: Zap },
  ] },
];

function ProjectLink({ project, compact, pathname }: { project: Project; compact: boolean; pathname: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = !!project.children?.length;
  const Icon = project.type === "CHECKLIST" ? CheckSquare : Folder;
  return <div>
    <div className="group flex items-center">
      <Link href={`/lists/${project.id}`} title={project.name} aria-label={project.name}
        aria-current={pathname === `/lists/${project.id}` ? "page" : undefined}
        className={cn("flowly-nav flex-1 min-w-0", compact && "justify-center")}>
        <Icon className="h-4 w-4 shrink-0" style={{ color: project.color || undefined }} />
        {!compact && <span className="truncate">{project.name}</span>}
      </Link>
      {!compact && <Link href={`/lists/new?parentId=${project.id}`} aria-label={`Add subproject to ${project.name}`} title="Add subproject" className="rounded p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"><Plus className="h-3.5 w-3.5" /></Link>}
      {!compact && hasChildren && <button className="p-2 rounded-md hover:bg-muted" aria-label={`${expanded ? "Collapse" : "Expand"} ${project.name}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
      </button>}
    </div>
    {!compact && expanded && <div className="ml-4 border-l pl-2">{project.children?.map(child => <ProjectLink key={child.id} project={child} compact={false} pathname={pathname} />)}</div>}
  </div>;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, toggleCollapsed } = useSidebar();
  const { openTaskForm, openSearch } = useGlobal();
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState(false);
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/lists");
      if (!response.ok) throw new Error("Unable to load projects");
      const data = await response.json();
      setProjects(data.projects || []);
      setProjectError(false);
    } catch { setProjectError(true); } finally { setProjectsLoading(false); }
  }, []);
  useEffect(() => {
    if (!session) return;
    fetchProjects();
    window.addEventListener(REFRESH_EVENTS.PROJECTS, fetchProjects);
    window.addEventListener(REFRESH_EVENTS.TASKS, fetchProjects);
    return () => {
      window.removeEventListener(REFRESH_EVENTS.PROJECTS, fetchProjects);
      window.removeEventListener(REFRESH_EVENTS.TASKS, fetchProjects);
    };
  }, [session, fetchProjects]);
  useEffect(() => setMobileOpen(false), [pathname]);

  const content = (compact: boolean, mobile = false) => <>
    <div className={cn("flex h-20 shrink-0 items-center gap-3 px-5", compact && "justify-center px-2")}>
      <Link href="/dashboard" aria-label="Flowly overview" className="flex items-center gap-2.5">
        <img src="/icon.svg" alt="" className="h-9 w-9 object-contain" />
        {!compact && <span className="text-xl font-semibold tracking-tight">flowly<span className="text-primary">.</span></span>}
      </Link>
    </div>
    <div className={cn("px-4 space-y-2", compact && "px-2")}>
      <button onClick={() => { setMobileOpen(false); openTaskForm(); }} aria-label="Add task" title="Add task" className={cn("flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90", compact && "px-2")}>
        <Plus className="h-4 w-4 shrink-0" />{!compact && "Add task"}
      </button>
      <button onClick={() => { setMobileOpen(false); openSearch(); }} aria-label="Search tasks and projects" title="Search tasks and projects" className={cn("flowly-nav w-full", compact && "justify-center")}>
        <Search className="h-4 w-4 shrink-0" />{!compact && <><span>Search anything</span><kbd className="ml-auto text-[11px] text-muted-foreground">⌘K</kbd></>}
      </button>
    </div>
    <nav aria-label="Main navigation" className={cn("flex-1 overflow-y-auto px-4 py-3 space-y-2", compact && "px-2")}>
      {sections.map(section => {
        const links = <div className="space-y-0.5">{section.items.map(item => <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} className={cn("flowly-nav", compact && "justify-center")}>
          <item.icon className="h-[18px] w-[18px] shrink-0" />{!compact && item.label}
        </Link>)}</div>;
        if (section.label === "Workspace" || compact) return <div key={section.label}>{links}</div>;
        return <details key={`${section.label}-${pathname}`} open={section.items.some(item => item.href === pathname)} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">{section.label}<ChevronRight className="h-4 w-4 group-open:rotate-90" /></summary>
          {links}
        </details>;
      })}
      <div>
        {!compact && <div className="flex items-center justify-between px-3 pb-2"><p className="text-xs font-medium text-muted-foreground">Personal projects</p><Link href="/lists/new" aria-label="New project" title="New project" className="rounded p-1 hover:bg-muted"><Plus className="h-4 w-4" /></Link></div>}
        {projects.map(project => <ProjectLink key={project.id} project={project} compact={compact} pathname={pathname} />)}
        {!compact && projectError && <button onClick={fetchProjects} className="px-3 py-2 text-xs text-destructive">Couldn’t load projects. Retry</button>}
        {!compact && !projectsLoading && !projectError && projects.length === 0 && <Link href="/lists/new" className="flowly-nav text-xs">Create your first project <Plus className="h-4 w-4" /></Link>}
      </div>
    </nav>
    <div className={cn("shrink-0 border-t p-3 space-y-1", compact && "p-2")}>
      {!compact && <div className="px-2 pb-2">
        <label htmlFor={mobile ? "mobile-workspace" : "desktop-workspace"} className="sr-only">Workspace</label>
        <select id={mobile ? "mobile-workspace" : "desktop-workspace"} value={activeWorkspace?.id || ""} onChange={event => setActiveWorkspaceId(event.target.value || null)} className="w-full rounded-lg border bg-background p-2 text-sm">
          <option value="">Personal workspace</option>{workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
        </select>
        <div className="flex justify-between pt-2 text-xs text-muted-foreground"><Link href="/workspaces/new" className="hover:text-foreground">New workspace</Link>{activeWorkspace && <Link href={`/workspaces/${activeWorkspace.id}/settings`} className="hover:text-foreground">Manage</Link>}</div>
      </div>}
      <Link href="/settings" aria-label="Settings" title="Settings" aria-current={pathname === "/settings" ? "page" : undefined} className={cn("flowly-nav", compact && "justify-center")}><Settings className="h-4 w-4 shrink-0" />{!compact && "Settings"}</Link>
      <div className={cn("flex items-center gap-1 px-1", compact && "flex-col")}>
        {!compact && <span className="min-w-0 flex-1 truncate px-2 text-xs text-muted-foreground">{session?.user?.name || session?.user?.email?.split("@")[0]}</span>}
        <NotificationCenter />
        <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} title="Toggle appearance" aria-label="Toggle appearance" className="rounded-md p-2 hover:bg-muted">{mounted && resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <button onClick={() => signOut({ callbackUrl: "/signin" })} title="Sign out" aria-label="Sign out" className="rounded-md p-2 hover:bg-muted"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  </>;

  return <>
    <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
      <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 -ml-2 rounded-md hover:bg-muted"><Menu className="h-5 w-5" /></button>
      <Link href="/dashboard" className="font-semibold tracking-tight">flowly<span className="text-primary">.</span></Link>
      <button onClick={openSearch} aria-label="Search tasks and projects" className="p-2 -mr-2 rounded-md hover:bg-muted"><Search className="h-5 w-5" /></button>
    </header>
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <DialogContent aria-describedby={undefined} className="left-0 top-0 h-dvh max-h-none w-[300px] max-w-[88vw] translate-x-0 translate-y-0 rounded-none p-0 gap-0 flex flex-col bg-card">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        {content(false, true)}
      </DialogContent>
    </Dialog>
    <aside className={cn("hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r bg-card transition-[width] duration-200", collapsed ? "w-[76px]" : "w-[256px]")}>
      {content(collapsed)}
      <button onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex justify-center border-t py-3 text-muted-foreground hover:bg-muted">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
    </aside>
  </>;
}
