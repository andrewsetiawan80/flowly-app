"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, Trash2, Power, PowerOff, ChevronRight,
  ArrowRight, Activity, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

// ── Types ──
interface Automation {
  id: string;
  name: string;
  isActive: boolean;
  trigger: { event: string; conditions?: Condition[] };
  action: { type: string; params: Record<string, any> };
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  _count?: { logs: number };
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

// ── Constants ──
const TRIGGER_EVENTS = [
  { value: "task.created", label: "Task created" },
  { value: "task.completed", label: "Task completed" },
  { value: "task.updated", label: "Task updated" },
];

const ACTION_TYPES = [
  { value: "change_status", label: "Change status", paramKey: "status", options: ["TODO", "DOING", "DONE", "CANCELED"] },
  { value: "change_priority", label: "Change priority", paramKey: "priority", options: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
  { value: "send_slack", label: "Send Slack notification", paramKey: "message", type: "text" },
];

const CONDITION_FIELDS = [
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "gte", label: ">=" },
  { value: "lte", label: "<=" },
];

export default function AutomationsPage() {
  const { status: authStatus } = useSession();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder state
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("task.created");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actionType, setActionType] = useState("change_status");
  const [actionParam, setActionParam] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated") fetchAutomations();
    else if (authStatus === "unauthenticated") setLoading(false);
  }, [authStatus]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const actionDef = ACTION_TYPES.find((a) => a.value === actionType);
    const action: { type: string; params: Record<string, any> } = {
      type: actionType,
      params: {},
    };
    if (actionDef?.paramKey && actionParam) {
      action.params[actionDef.paramKey] = actionParam;
    }

    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          trigger: { event: triggerEvent, conditions: conditions.length > 0 ? conditions : undefined },
          action,
        }),
      });
      if (res.ok) {
        resetBuilder();
        await fetchAutomations();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !isActive }),
      });
      await fetchAutomations();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/automations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchAutomations();
    } catch {
      // ignore
    }
  };

  const resetBuilder = () => {
    setShowBuilder(false);
    setName("");
    setTriggerEvent("task.created");
    setConditions([]);
    setActionType("change_status");
    setActionParam("");
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, { field: "priority", operator: "equals", value: "" }]);
  };

  const updateCondition = (index: number, key: keyof Condition, value: string) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)));
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const getEventLabel = (event: string) =>
    TRIGGER_EVENTS.find((e) => e.value === event)?.label || event;
  const getActionLabel = (type: string) =>
    ACTION_TYPES.find((a) => a.value === type)?.label || type;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Automations</h1>
            <p className="text-sm text-muted-foreground">
              Create if-then rules to automate your workflow
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowBuilder(!showBuilder)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Rule</span>
        </Button>
      </motion.div>

      {/* Builder */}
      <AnimatePresence>
        {showBuilder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create Automation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <Input
                  placeholder="Automation name (e.g. Auto-prioritize urgent tasks)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background"
                />

                {/* Trigger */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    When...
                  </label>
                  <select
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    className="w-full h-11 px-3 text-sm rounded-lg border bg-background"
                  >
                    {TRIGGER_EVENTS.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>

                {/* Conditions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      And if... (optional)
                    </label>
                    <Button variant="ghost" size="sm" onClick={addCondition} className="h-10 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add condition
                    </Button>
                  </div>
                  {conditions.map((cond, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <select
                        value={cond.field}
                        onChange={(e) => updateCondition(i, "field", e.target.value)}
                        className="h-11 px-3 text-sm rounded-lg border bg-background"
                      >
                        {CONDITION_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(i, "operator", e.target.value)}
                        className="h-11 px-3 text-sm rounded-lg border bg-background"
                      >
                        {CONDITION_OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCondition(i, "value", e.target.value)}
                        placeholder="Value"
                        className="h-11 bg-background"
                      />
                      <button
                        onClick={() => removeCondition(i)}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Then...
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={actionType}
                      onChange={(e) => {
                        setActionType(e.target.value);
                        setActionParam("");
                      }}
                      className="h-11 px-3 text-sm rounded-lg border bg-background flex-1"
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    {(() => {
                      const actionDef = ACTION_TYPES.find((a) => a.value === actionType);
                      if (!actionDef) return null;
                      if (actionDef.options) {
                        return (
                          <select
                            value={actionParam}
                            onChange={(e) => setActionParam(e.target.value)}
                            className="h-11 px-3 text-sm rounded-lg border bg-background flex-1"
                          >
                            <option value="">Select...</option>
                            {actionDef.options.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        );
                      }
                      if (actionDef.type === "text") {
                        return (
                          <Input
                            value={actionParam}
                            onChange={(e) => setActionParam(e.target.value)}
                            placeholder="Notification message"
                            className="h-11 flex-1 bg-background"
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCreate}
                    disabled={!name.trim() || saving}
                    className="gap-2"
                  >
                    {saving ? "Creating..." : "Create Automation"}
                  </Button>
                  <Button variant="ghost" onClick={resetBuilder}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Automation List */}
      {automations.length === 0 && !showBuilder ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No automations yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first automation to streamline your workflow
          </p>
          <Button onClick={() => setShowBuilder(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Automation
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto, i) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn(
                "transition-all",
                !auto.isActive && "opacity-60"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div className={cn(
                      "mt-1 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                      auto.isActive ? "bg-emerald-500/10" : "bg-muted"
                    )}>
                      <Zap className={cn(
                        "h-4 w-4",
                        auto.isActive ? "text-emerald-500" : "text-muted-foreground"
                      )} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{auto.name}</h3>
                        {auto.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Rule description */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                          {getEventLabel(auto.trigger.event)}
                        </span>
                        {auto.trigger.conditions && auto.trigger.conditions.length > 0 && (
                          <>
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-muted-foreground">
                              {auto.trigger.conditions.length} condition{auto.trigger.conditions.length !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                        <ArrowRight className="h-3 w-3" />
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                          {getActionLabel(auto.action.type)}
                          {auto.action.params && Object.values(auto.action.params)[0] && (
                            <> : {String(Object.values(auto.action.params)[0])}</>
                          )}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {auto.triggerCount} triggers
                        </span>
                        {auto.lastTriggeredAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last: {formatDistanceToNow(new Date(auto.lastTriggeredAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(auto.id, auto.isActive)}
                        className={cn(
                          "p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors",
                          auto.isActive
                            ? "text-emerald-500 hover:bg-emerald-500/10"
                            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                        )}
                        title={auto.isActive ? "Disable" : "Enable"}
                      >
                        {auto.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(auto.id)}
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
