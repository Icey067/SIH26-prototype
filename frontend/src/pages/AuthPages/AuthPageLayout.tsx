import React from "react";
import { Link } from "react-router";
import { Shield, Train, Activity, CheckCircle2, Lock } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

// ─── Animation Orchestration Variants ────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const checklistContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.35,
    },
  },
};

const checklistItemVariants: Variants = {
  hidden: { opacity: 0, x: -14 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative min-h-screen bg-[#070b14] text-white flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500 selection:text-black font-sans"
    >
      {/* Dynamic Background Atmosphere with Breathing Grid and Glowing Vignette */}
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none"
      />
      <motion.div
        animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.45, 0.2], scale: [1.08, 1, 1.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* Top Header Bar */}
      <motion.header
        variants={itemVariants}
        className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md"
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-transform">
            <Train className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-wider text-white">SAMANVAY-AI</span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                CRIS // IR-NCR
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-tight">
              Indian Railways Joint Possession &amp; Corridor Command Gateway
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 font-mono text-xs font-semibold transition-colors"
          >
            <span>← Landing Page</span>
          </Link>
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-white border border-cyan-500/40 font-mono text-xs font-semibold transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Direct Console</span>
          </Link>
          <div className="hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left / Form Section (7 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-7 flex justify-center w-full">
            <div className="w-full max-w-lg bg-zinc-950/80 border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500" />
              {children}
            </div>
          </motion.div>

          {/* Right / Information & Tactical Badge Section (5 cols) */}
          <motion.div variants={itemVariants} className="hidden lg:flex lg:col-span-5 flex-col gap-6">
            <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-white">
                  Mission Tactical Access Control
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Authorized for Indian Railways Section Controllers, Divisional Operations Managers, and Departmental Engineers (TMS Track, SMMS Signals, TDMS Traction).
              </p>

              <motion.div
                variants={checklistContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 pt-2"
              >
                <motion.div variants={checklistItemVariants} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Google OR-Tools CP-SAT</strong> automated conflict resolution engine</span>
                </motion.div>
                <motion.div variants={checklistItemVariants} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Private Number Generation</strong> conforming to G&amp;SR Section 4.14</span>
                </motion.div>
                <motion.div variants={checklistItemVariants} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>3D &amp; 2D Space-Time Matrix</strong> with live FOIS/COA stream</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Division Telemetry Status Card with Live Radar Beacon */}
            <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <motion.span
                    className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400"
                    animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-bold">PRAYAGRAJ DIVISION (NCR)</span>
                  <span className="text-[10px] text-zinc-500">CORRIDOR GZB-TDL-CNB • ACTIVE</span>
                </div>
              </div>
              <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                <Lock className="w-3 h-3" /> CRIS 256-BIT
              </span>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <motion.footer
        variants={itemVariants}
        className="relative z-20 w-full py-3 px-6 text-center text-zinc-500 text-[11px] font-mono border-t border-zinc-800/80 bg-zinc-950/80"
      >
        MINISTRY OF RAILWAYS • CENTRE FOR RAILWAY INFORMATION SYSTEMS (CRIS) • SAMANVAY-AI 2026
      </motion.footer>
    </motion.div>
  );
}
