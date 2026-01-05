"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, Mail, Lock, ArrowRight } from "lucide-react";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (!res) {
        setError("Unexpected error. Please try again.");
        setLoading(false);
        return;
      }

      if (res.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard (always use relative URL)
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-[100vh] h-[100vh] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[100vh] h-[100vh] rounded-full bg-gradient-to-tr from-rose-500/15 via-pink-500/10 to-transparent blur-3xl" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="space-y-8 rounded-3xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl border border-black/[0.04] dark:border-white/[0.04] p-10 shadow-2xl shadow-black/10 dark:shadow-black/40">
          <div className="text-center space-y-6">
            <motion.div 
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-xl shadow-orange-500/30"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Flame className="h-9 w-9 text-white" />
            </motion.div>
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 dark:from-orange-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                  Welcome back
                </span>
              </h1>
              <p className="text-muted-foreground font-medium">
                Sign in to your Flowly account
              </p>
            </motion.div>
          </div>
          
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-500" />
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 text-base bg-white/50 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-500" />
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-12 text-base bg-white/50 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] focus:border-orange-500/50 focus:ring-orange-500/20"
              />
            </div>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                className="w-full h-12 text-base font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 transition-all" 
                disabled={loading} 
                type="submit"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Flame className="h-4 w-4" />
                    </motion.div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}
