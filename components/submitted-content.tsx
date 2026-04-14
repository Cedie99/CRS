"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export function SubmittedContent() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.05 }}
      >
        <CheckCircle className="h-14 w-14 text-green-500" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.22 }}
        className="mt-4 text-xl font-semibold text-zinc-900"
      >
        Form submitted successfully
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.34 }}
        className="mt-2 max-w-sm text-sm text-zinc-500"
      >
        Thank you! Your information has been received and is now under review.
        Your agent will keep you updated on the progress.
      </motion.p>
    </div>
  );
}
