import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAuth, PRESET_OFFICERS } from "../../context/AuthContext";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout, switchOfficer } = useAuth();
  const navigate = useNavigate();

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleSignOut = () => {
    logout();
    closeDropdown();
    navigate("/signin");
  };

  if (!isAuthenticated || !user) {
    return (
      <Link
        to="/signin"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold hover:bg-primary/20 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        <span>OFFICER SIGN IN</span>
      </Link>
    );
  }

  // Get department accent color
  const getDeptColor = (dept: string) => {
    switch (dept) {
      case "OPERATING":
        return "text-cyan-400 bg-cyan-950/60 border-cyan-500/30";
      case "DIVISION_HQ":
        return "text-purple-400 bg-purple-950/60 border-purple-500/30";
      case "ENGINEERING_TMS":
        return "text-amber-400 bg-amber-950/60 border-amber-500/30";
      case "SIGNAL_SMMS":
        return "text-emerald-400 bg-emerald-950/60 border-emerald-500/30";
      case "ELECTRICAL_TDMS":
        return "text-blue-400 bg-blue-950/60 border-blue-500/30";
      default:
        return "text-primary bg-surface-container border-primary/30";
    }
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-left"
        aria-label="Officer Profile & Authentication"
      >
        <div className="relative">
          <span className="h-9 w-9 rounded-md flex items-center justify-center bg-surface-container-highest text-primary font-mono font-bold text-xs border border-primary/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
            {initials || "IR"}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-container-lowest"></span>
        </div>

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-on-surface line-clamp-1 max-w-[130px]">
              {user.name}
            </span>
            <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${getDeptColor(user.department)}`}>
              {user.badgeCode}
            </span>
          </div>
          <span className="text-[10px] text-on-surface-variant font-mono line-clamp-1 max-w-[170px]">
            {user.designation}
          </span>
        </div>

        <svg
          className={`stroke-on-surface-variant transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-2 flex w-[320px] flex-col rounded-xl border border-surface-container-highest bg-surface-container-lowest p-3 shadow-2xl z-99999 font-sans"
      >
        {/* Officer Card Header */}
        <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-tertiary uppercase font-bold tracking-wider">
                DUTY CONTROLLER ON CONSOLE
              </span>
              <h4 className="font-bold text-sm text-on-surface mt-0.5">{user.name}</h4>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{user.designation}</p>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${getDeptColor(user.department)}`}>
              {user.badgeCode}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-surface-container-high grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-on-surface-variant block">DIV / ZONE</span>
              <span className="text-on-surface font-semibold">{user.division.split(" ")[0]} ({user.zone.split(" ")[0]})</span>
            </div>
            <div>
              <span className="text-on-surface-variant block">EMPLOYEE ID</span>
              <span className="text-primary font-semibold">{user.employeeId}</span>
            </div>
          </div>
        </div>

        {/* Quick Role Switcher for Demo / Multi-department simulation */}
        <div className="mt-3">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-mono uppercase text-on-surface-variant font-bold">
              Switch Officer (Demo Mode)
            </span>
            <span className="text-[9px] font-mono text-primary font-semibold">1-Click</span>
          </div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
            {PRESET_OFFICERS.map((officer) => (
              <button
                key={officer.id}
                onClick={() => {
                  switchOfficer(officer.id);
                  closeDropdown();
                }}
                className={`flex items-center justify-between p-1.5 rounded text-left transition-colors text-xs ${
                  user.id === officer.id
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "hover:bg-surface-container-high text-on-surface"
                }`}
              >
                <div className="flex flex-col truncate pr-2">
                  <span className="font-medium text-[11px] truncate">{officer.name}</span>
                  <span className="text-[9px] text-on-surface-variant font-mono truncate">{officer.role}</span>
                </div>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-container-highest text-on-surface shrink-0">
                  {officer.badgeCode.split("-")[1] || officer.badgeCode}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 pt-2.5 border-t border-surface-container-high flex flex-col gap-1">
          <Link
            to="/signin"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Switch to Full Login Screen
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 transition-colors text-left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            End Duty Shift (Sign Out)
          </button>
        </div>
      </Dropdown>
    </div>
  );
}

