"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Settings, Palette, Moon, Sun, User, Monitor,
  MessageSquare, Calendar, Copy, Check, Link2, RefreshCw,
  Download, Keyboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { useAccentTheme } from "@/components/theme-provider";
import { ThemeSelector } from "@/components/theme-selector";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { accentId, setAccentTheme } = useAccentTheme();

  // Integrations state
  const [slackUrl, setSlackUrl] = useState("");
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackSaved, setSlackSaved] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [calCopied, setCalCopied] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Fetch user settings on mount
  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const settings = data.settings || {};
        setSlackUrl(settings.slackWebhookUrl || "");
        setCalendarToken(data.calendarToken || null);
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  const handleSaveSlack = async () => {
    setSlackSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: { slackWebhookUrl: slackUrl.trim() || null } }),
      });
      if (res.ok) {
        setSlackSaved(true);
        setTimeout(() => setSlackSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSlackSaving(false);
    }
  };

  const handleGenerateCalendarToken = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "generate_calendar_token" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarToken(data.calendarToken);
      }
    } catch {
      // ignore
    }
  };

  const handleRevokeCalendarToken = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "revoke_calendar_token" }),
      });
      if (res.ok) {
        setCalendarToken(null);
      }
    } catch {
      // ignore
    }
  };

  const calendarFeedUrl = calendarToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar/ical?token=${calendarToken}`
    : null;

  const copyCalendarUrl = () => {
    if (calendarFeedUrl) {
      navigator.clipboard.writeText(calendarFeedUrl);
      setCalCopied(true);
      setTimeout(() => setCalCopied(false), 2000);
    }
  };

  const handleExportJSON = () => {
    window.open("/api/export?format=json", "_blank");
  };

  const handleExportCSV = () => {
    window.open("/api/export?format=csv", "_blank");
  };

  const themeOptions = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Personalize your Flowly experience</p>
        </div>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 via-pink-500 to-rose-500 text-white font-bold text-lg shadow-lg">
                {session?.user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold">{session?.user?.name || session?.user?.email?.split("@")[0] || "User"}</p>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-all",
                      theme === opt.id
                        ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Accent Color</label>
              <ThemeSelector />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Slack Integration */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Slack Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get notifications in Slack when automations trigger. Paste your Slack incoming webhook URL below.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 h-11"
                disabled={loadingSettings}
              />
              <Button
                onClick={handleSaveSlack}
                disabled={slackSaving || loadingSettings}
                className="gap-2"
              >
                {slackSaved ? (
                  <><Check className="h-4 w-4" /> Saved</>
                ) : (
                  slackSaving ? "Saving..." : "Save"
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Create a webhook at{" "}
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                api.slack.com/messaging/webhooks
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Calendar Feed */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Calendar Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Subscribe to your Flowly tasks in Google Calendar, Apple Calendar, or any app that supports iCal feeds.
            </p>
            {calendarToken ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={calendarFeedUrl || ""}
                    readOnly
                    className="flex-1 text-xs font-mono h-11"
                  />
                  <Button variant="outline" onClick={copyCalendarUrl} className="gap-2 flex-shrink-0 h-11">
                    {calCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {calCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRevokeCalendarToken} className="text-xs text-red-500 hover:text-red-600">
                    Revoke URL
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleGenerateCalendarToken} className="text-xs gap-1">
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </Button>
                </div>
                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">How to subscribe:</p>
                  <p>1. Copy the URL above</p>
                  <p>2. In Google Calendar: Settings &gt; Add calendar &gt; From URL</p>
                  <p>3. Paste the URL and click "Add calendar"</p>
                </div>
              </div>
            ) : (
              <Button onClick={handleGenerateCalendarToken} className="gap-2">
                <Link2 className="h-4 w-4" /> Generate Calendar Feed URL
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Export */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Data Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all your tasks, projects, and data.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleExportJSON} className="gap-2 h-11">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="gap-2 h-11">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { keys: ["Ctrl", "K"], desc: "Command palette" },
                { keys: ["Ctrl", "N"], desc: "New task" },
                { keys: ["Ctrl", "B"], desc: "Board view" },
                { keys: ["Ctrl", ","], desc: "Settings" },
                { keys: ["?"], desc: "Show shortcuts" },
              ].map((shortcut) => (
                <div key={shortcut.desc} className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{shortcut.desc}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="px-2 py-1 text-[10px] font-semibold bg-black/5 dark:bg-white/5 rounded-md border border-black/10 dark:border-white/10"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Flowly</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Flowly" className="h-12 w-12 object-contain" />
              <div>
                <p className="font-semibold">Flowly</p>
                <p className="text-xs text-muted-foreground">Task & Project Management</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Flowly is your elegant task management companion. Organize projects, collaborate with teams, and track your productivity.
            </p>
            <p className="text-xs text-muted-foreground">Version 0.4.0</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
