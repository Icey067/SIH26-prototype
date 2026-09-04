import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Loader2, KeyRound, Building, User, Mail, Award, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";


export default function SignUpForm() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState<"OPERATING" | "ENGINEERING_TMS" | "SIGNAL_SMMS" | "ELECTRICAL_TDMS" | "DIVISION_HQ">("OPERATING");
  const [division, setDivision] = useState("Prayagraj Division (PRYJ)");
  const [designation, setDesignation] = useState("Section Controller (UP Line)");
  const [password, setPassword] = useState("");
  const [agreedGsr, setAgreedGsr] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [stageMsg, setStageMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDepartmentChange = (dept: any) => {
    setDepartment(dept);
    if (dept === "OPERATING") {
      setDesignation("Section Controller (UP/DN Corridor)");
    } else if (dept === "ENGINEERING_TMS") {
      setDesignation("Assistant Divisional Engineer (TMS Civil Track)");
    } else if (dept === "SIGNAL_SMMS") {
      setDesignation("Senior Section Engineer (SMMS Signal & Interlock)");
    } else if (dept === "ELECTRICAL_TDMS") {
      setDesignation("Divisional Traction Engineer (TDMS OHE)");
    } else {
      setDesignation("Divisional Operations Manager (DOM)");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !employeeId.trim()) {
      setErrorMsg("Please fill in all mandatory officer fields.");
      return;
    }
    if (!agreedGsr) {
      setErrorMsg("You must accept G&SR regulatory conditions to register.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setStageMsg("Registering Railway Officer in CRIS Personnel Database...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStageMsg("Provisioning Private Number Authority Token...");
      await signup({
        name,
        email,
        employeeId,
        department,
        division,
        designation,
        password,
      });
      setStageMsg("Registration Confirmed! Launching Console...");
      await new Promise((resolve) => setTimeout(resolve, 400));
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err?.message || "Registration failed.");
      setIsLoading(false);
      setStageMsg(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-white">
      {/* Title Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-4 bg-emerald-400 rounded-sm" />
          <h2 className="text-xl font-bold text-white tracking-tight uppercase">
            Officer Registration
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          Onboard new Indian Railways officer to the Samanvay-AI Tactical Dispatch matrix.
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/80 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>OFFICER FULL NAME *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Chandra Verma"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>EMPLOYEE ID / PF NUMBER *</span>
            </label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. NCR-PRYJ-49210"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>OFFICIAL RAILNET EMAIL *</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="r.verma@ncr.railnet.gov.in"
            className="w-full px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-cyan-400" />
              <span>DEPARTMENT *</span>
            </label>
            <select
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="OPERATING">Operating (Section Control)</option>
              <option value="ENGINEERING_TMS">Civil Engg (TMS Track)</option>
              <option value="SIGNAL_SMMS">S&amp;T (SMMS Signals)</option>
              <option value="ELECTRICAL_TDMS">Electrical (TDMS Traction)</option>
              <option value="DIVISION_HQ">Division Operations HQ</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-semibold text-zinc-300">
              DIVISION / HEADQUARTERS
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="Prayagraj Division (PRYJ)">Prayagraj Division (PRYJ - NCR)</option>
              <option value="Delhi Division (DLI)">Delhi Division (DLI - NR)</option>
              <option value="Agra Division (AGC)">Agra Division (AGC - NCR)</option>
              <option value="Jhansi Division (JHS)">Jhansi Division (JHS - NCR)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono font-semibold text-zinc-300">
            OFFICIAL DESIGNATION
          </label>
          <input
            type="text"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center justify-between">
            <span>MISSION SECURITY PIN / PASSWORD *</span>
            <span className="text-[10px] text-emerald-400 font-mono">CRIS Authorized</span>
          </label>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create strong security password"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
            <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* G&SR Compliance */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={agreedGsr}
            onChange={(e) => setAgreedGsr(e.target.checked)}
            className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-400 h-4 w-4"
          />
          <span className="text-[11px] text-zinc-400 leading-snug">
            I certify that I am a bonafide Indian Railways officer authorized to access Division Traffic &amp; Possession Operations.
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{stageMsg || "REGISTERING..."}</span>
            </>
          ) : (
            <>
              <span>COMPLETE REGISTRATION &amp; OPEN CONSOLE</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to SignIn */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
        <span>Already have an officer account?</span>
        <Link
          to="/signin"
          className="text-cyan-400 hover:text-cyan-300 font-semibold font-mono underline transition-colors"
        >
          Sign In Here →
        </Link>
      </div>
    </div>
  );
}
