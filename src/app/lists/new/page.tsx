"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Sparkles, ArrowLeft, FolderOpen, ShoppingCart, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { triggerRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";

const colorOptions = [
  { name: "Purple", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Orange", value: "#f97316" },
  { name: "Cyan", value: "#06b6d4" },
];

type ListType = "PROJECT" | "CHECKLIST";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId");
  const typeParam = searchParams.get("type") as ListType | null;
  
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState<ListType>(typeParam === "CHECKLIST" ? "CHECKLIST" : "PROJECT");
  const [selectedColor, setSelectedColor] = useState(
    typeParam === "CHECKLIST" ? "#10b981" : colorOptions[8].value // Green for checklist, Orange for project
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [parentProject, setParentProject] = useState<{ id: string; name: string; color: string | null } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  // Fetch parent project if parentId is provided
  useEffect(() => {
    if (parentId && status === "authenticated") {
      fetchParentProject();
    }
  }, [parentId, status]);

  const fetchParentProject = async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        const parent = data.lists.find((l: any) => l.id === parentId);
        if (parent) {
          setParentProject(parent);
          // Inherit parent's color by default
          setSelectedColor(parent.color || colorOptions[0].value);
        }
      }
    } catch (error) {
      console.error("Failed to fetch parent project:", error);
    }
  };

  const handleTypeChange = (type: ListType) => {
    setSelectedType(type);
    // Set default color based on type
    if (type === "CHECKLIST") {
      setSelectedColor("#10b981"); // Green
    } else {
      setSelectedColor("#f97316"); // Orange
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(`Please enter a ${selectedType === "CHECKLIST" ? "checklist" : "project"} name`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor,
          type: selectedType,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        triggerRefresh('PROJECTS');
        router.push(`/lists/${data.list.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const isSubProject = !!parentId;
  const isChecklist = selectedType === "CHECKLIST";

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 5
            }}
          >
            {isChecklist ? (
              <ShoppingCart className="h-8 w-8 text-emerald-500" />
            ) : (
              <FolderPlus className="h-8 w-8 text-primary" />
            )}
          </motion.div>
          <h1 className={cn(
            "text-3xl font-bold bg-clip-text text-transparent",
            isChecklist 
              ? "bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 dark:from-emerald-400 dark:via-green-400 dark:to-emerald-400"
              : "text-primary"
          )}>
            {isSubProject 
              ? "Create Sub-project" 
              : isChecklist 
                ? "Create New Checklist" 
                : "Create New Project"}
          </h1>
        </div>
        
        {parentProject && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderOpen className="h-4 w-4" style={{ color: parentProject.color || "#f97316" }} />
            <span>Inside: <strong className="text-foreground">{parentProject.name}</strong></span>
          </div>
        )}
        
        <p className="text-muted-foreground">
          {isChecklist 
            ? "Create a simple checklist for shopping, todos, or quick lists"
            : isSubProject 
              ? "Create a sub-project to organize related tasks" 
              : "Organize your tasks by creating a project"}
        </p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-1 rounded-full",
                isChecklist 
                  ? "bg-gradient-to-b from-emerald-500 to-green-500"
                  : "bg-primary"
              )} />
              {isChecklist ? "Checklist" : "Project"} Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection */}
              {!isSubProject && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTypeChange("PROJECT")}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                        selectedType === "PROJECT"
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <FolderOpen className={cn(
                        "h-6 w-6",
                        selectedType === "PROJECT" ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="text-left">
                        <p className={cn(
                          "font-semibold",
                          selectedType === "PROJECT" ? "text-primary" : ""
                        )}>Project</p>
                        <p className="text-xs text-muted-foreground">Tasks with dates & priorities</p>
                      </div>
                    </motion.button>
                    
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTypeChange("CHECKLIST")}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                        selectedType === "CHECKLIST"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <ShoppingCart className={cn(
                        "h-6 w-6",
                        selectedType === "CHECKLIST" ? "text-emerald-500" : "text-muted-foreground"
                      )} />
                      <div className="text-left">
                        <p className={cn(
                          "font-semibold",
                          selectedType === "CHECKLIST" ? "text-emerald-600 dark:text-emerald-400" : ""
                        )}>Checklist</p>
                        <p className="text-xs text-muted-foreground">Simple checkbox items</p>
                      </div>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  {isChecklist ? "Checklist" : "Project"} Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isChecklist ? "e.g., Grocery List, Packing List" : "e.g., Website Redesign, Q4 Goals"}
                  className={cn(
                    "h-12 border-border/50",
                    isChecklist ? "focus:border-emerald-500" : "focus:border-primary"
                  )}
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/50 characters
                </p>
              </div>

              {/* Description (only for projects) */}
              {!isChecklist && (
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this project about?"
                    className="w-full h-24 rounded-xl border border-border/50 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/500 characters
                  </p>
                </div>
              )}

              {/* Color Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Choose a Color
                </Label>
                <div className="grid grid-cols-5 gap-3">
                  {colorOptions.map((color, index) => (
                    <motion.button
                      key={color.value}
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedColor(color.value)}
                      className={`relative rounded-xl h-14 transition-all duration-200 ${
                        selectedColor === color.value
                          ? "ring-4 ring-offset-2 ring-offset-background shadow-lg"
                          : "hover:shadow-md"
                      }`}
                      style={{
                        backgroundColor: color.value,
                      }}
                    >
                      {selectedColor === color.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="bg-white rounded-full p-1">
                            <Sparkles className="h-4 w-4 text-gray-900" />
                          </div>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {colorOptions.find(c => c.value === selectedColor)?.name}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className={cn(
                    "flex-1",
                    isChecklist 
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                      : "bg-primary hover:bg-primary/90"
                  )}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {isChecklist ? (
                        <ShoppingCart className="mr-2 h-4 w-4" />
                      ) : (
                        <FolderPlus className="mr-2 h-4 w-4" />
                      )}
                      Create {isChecklist ? "Checklist" : isSubProject ? "Sub-project" : "Project"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/50">
              {isChecklist ? (
                <ShoppingCart 
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: selectedColor }}
                />
              ) : (
                <FolderOpen 
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: selectedColor }}
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="font-medium block truncate">
                  {name.trim() || (isChecklist ? "Your Checklist Name" : "Your Project Name")}
                </span>
                {description && !isChecklist && (
                  <span className="text-sm text-muted-foreground truncate block">
                    {description}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
