import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Loader2, KeyRound, UserCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function SignInForm() {
  const navigate = useNavigate();
  const { login, presetOfficers } = useAuth();

  const [email, setEmail] = useState("controller.pryj@ncr.railnet.gov.in");
  const [password, setPassword] = useState("••••••••••••");
  const [selectedPresetId, setSelectedPresetId] = useState("OFFICER-01");
  const [agreedGsr, setAgreedGsr] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authStage, setAuthStage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const officer = presetOfficers.find((o) => o.id === presetId);
    if (officer) {
      setEmail(officer.email);
      setPassword("••••••••••••");
      // Trigger brief 0.4s glowing flash feedback on credential inputs
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 400);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please provide your Railnet Email ID or Employee ID.");
      return;
    }
    if (!agreedGsr) {
      setErrorMsg("You must confirm authorization under Indian Railways G&SR rules.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setAuthStage("Authorizing G&SR Token...");

    try {
      await login(email, password, selectedPresetId);
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to authenticate with CRIS server.");
      setIsLoading(false);
      setAuthStage(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-white">
      {/* Title Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-4 bg-cyan-400 rounded-sm" />
          <h2 className="text-xl font-bold text-white tracking-tight uppercase">
            Railway Officer Sign In
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          Enter your official Railnet credentials or select a quick-access duty profile.
        </p>
      </div>

      {/* 1-Click Fast Duty Preset Selector */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1 text-cyan-400 font-bold">
            <UserCheck className="w-3.5 h-3.5" /> FAST DEMO PROFILES:
          </span>
          <span className="text-[10px] text-zinc-500">1-Click Auto-Fill</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
          {presetOfficers.slice(0, 4).map((officer) => (
            <motion.button
              key={officer.id}
              type="button"
              onClick={() => handlePresetSelect(officer.id)}
              whileHover={{
                scale: 1.02,
                borderColor: "rgba(6, 182, 212, 0.5)",
                boxShadow: "0 0 16px rgba(6, 182, 212, 0.3)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={`text-left p-2 rounded text-[11px] font-mono border flex flex-col justify-between cursor-pointer transition-colors ${
                selectedPresetId === officer.id
                  ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              <div className="font-bold truncate text-white">{officer.name}</div>
              <div className="text-[9px] text-zinc-500 truncate">{officer.designation}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/80 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center justify-between">
            <span>RAILNET EMAIL / EMP ID</span>
            <span className="text-[10px] text-zinc-500">@railnet.gov.in</span>
          </label>
          <motion.input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSelectedPresetId("");
            }}
            animate={
              isFlashing
                ? {
                    borderColor: [
                      "rgba(63, 63, 70, 0.8)",
                      "rgba(6, 182, 212, 1)",
                      "rgba(6, 182, 212, 1)",
                      "rgba(63, 63, 70, 0.8)",
                    ],
                    boxShadow: [
                      "0 0 0px rgba(6, 182, 212, 0)",
                      "0 0 16px rgba(6, 182, 212, 0.6)",
                      "0 0 16px rgba(6, 182, 212, 0.6)",
                      "0 0 0px rgba(6, 182, 212, 0)",
                    ],
                    backgroundColor: [
                      "rgba(24, 24, 27, 0.9)",
                      "rgba(6, 182, 212, 0.15)",
                      "rgba(6, 182, 212, 0.15)",
                      "rgba(24, 24, 27, 0.9)",
                    ],
                  }
                : {
                    borderColor: "rgba(63, 63, 70, 0.8)",
                    boxShadow: "0 0 0px rgba(6, 182, 212, 0)",
                    backgroundColor: "rgba(24, 24, 27, 0.9)",
                  }
            }
            transition={{ duration: 0.4, ease: "easeInOut" }}
            placeholder="officer@ncr.railnet.gov.in"
            className="w-full px-3.5 py-2.5 rounded-lg border text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center justify-between">
            <span>CRIS SECURITY PIN / PASSWORD</span>
            <span className="text-[10px] text-cyan-400 font-mono">256-Bit Encrypted</span>
          </label>
          <div className="relative">
            <motion.input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              animate={
                isFlashing
                  ? {
                      borderColor: [
                        "rgba(63, 63, 70, 0.8)",
                        "rgba(6, 182, 212, 1)",
                        "rgba(6, 182, 212, 1)",
                        "rgba(63, 63, 70, 0.8)",
                      ],
                      boxShadow: [
                        "0 0 0px rgba(6, 182, 212, 0)",
                        "0 0 16px rgba(6, 182, 212, 0.6)",
                        "0 0 16px rgba(6, 182, 212, 0.6)",
                        "0 0 0px rgba(6, 182, 212, 0)",
                      ],
                      backgroundColor: [
                        "rgba(24, 24, 27, 0.9)",
                        "rgba(6, 182, 212, 0.15)",
                        "rgba(6, 182, 212, 0.15)",
                        "rgba(24, 24, 27, 0.9)",
                      ],
                    }
                  : {
                      borderColor: "rgba(63, 63, 70, 0.8)",
                      boxShadow: "0 0 0px rgba(6, 182, 212, 0)",
                      backgroundColor: "rgba(24, 24, 27, 0.9)",
                    }
              }
              transition={{ duration: 0.4, ease: "easeInOut" }}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
            <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* G&SR Rule Checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={agreedGsr}
            onChange={(e) => setAgreedGsr(e.target.checked)}
            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-400 h-4 w-4"
          />
          <span className="text-[11px] text-zinc-400 leading-snug">
            I confirm compliance with <strong>Indian Railways G&amp;SR Section 4.14</strong> governing Block Authorizations and Private Number protocols.
          </span>
        </label>

        {/* Submit Button with Beam Sweep, Spring Arrow, and 600ms Loading Transition */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover="hover"
          whileTap={{ scale: 0.99 }}
          variants={{
            hover: { scale: 1.01 },
          }}
          className="relative overflow-hidden w-full mt-2 py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer disabled:opacity-50"
        >
          {/* Translucent White/Cyan Sweep Beam (sweeps every 4 seconds) */}
          <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-12 pointer-events-none"
            animate={{
              translateX: ["-100%", "250%"],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 2.8,
              ease: "easeInOut",
            }}
          />

          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{authStage || "Authorizing G&SR Token..."}</span>
            </>
          ) : (
            <>
              <span>AUTHORIZE &amp; OPEN MISSION CONSOLE</span>
              <motion.div
                variants={{
                  hover: { x: 5 },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center"
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </>
          )}
        </motion.button>
      </form>

      {/* Switch to SignUp */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
        <span>Need to register new railway officer?</span>
        <Link
          to="/signup"
          className="text-cyan-400 hover:text-cyan-300 font-semibold font-mono underline transition-colors"
        >
          Sign Up / Register Officer →
        </Link>
      </div>
    </div>
  );
}
