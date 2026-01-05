"use client";

import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useGlobal } from "@/components/global-providers";

export function FloatingAddButton() {
  const { data: session, status } = useSession();
  const { openTaskForm } = useGlobal();

  if (status !== "authenticated") {
    return null;
  }

  return (
    <motion.button
      onClick={openTaskForm}
      className="fixed bottom-6 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 active:scale-95 transition-all"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
      aria-label="Add new task"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Plus className="h-6 w-6" />
    </motion.button>
  );
}
