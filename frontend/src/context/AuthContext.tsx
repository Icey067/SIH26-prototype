import React, { createContext, useContext, useState, useEffect } from "react";

export interface OfficerProfile {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  designation: string;
  department: "OPERATING" | "ENGINEERING_TMS" | "SIGNAL_SMMS" | "ELECTRICAL_TDMS" | "DIVISION_HQ";
  division: string;
  zone: string;
  section: string;
  badgeCode: string;
  privateNumberPrefix: string;
  avatarUrl?: string;
}

export const PRESET_OFFICERS: OfficerProfile[] = [
  {
    id: "OFFICER-01",
    name: "Rajesh Kumar Sharma",
    email: "controller.pryj@ncr.railnet.gov.in",
    employeeId: "NCR-PRYJ-88412",
    role: "SECTION_CONTROLLER",
    designation: "Section Controller (GZB-TDL-CNB Mainline)",
    department: "OPERATING",
    division: "Prayagraj Division (PRYJ)",
    zone: "North Central Railway (NCR)",
    section: "NCR-GZB-TDL-UP",
    badgeCode: "NCR-CTRL-098",
    privateNumberPrefix: "NCR-PRYJ-SC",
  },
  {
    id: "OFFICER-02",
    name: "Ananya Deshmukh, IRTS",
    email: "srdom.pryj@ncr.railnet.gov.in",
    employeeId: "NCR-HQ-10294",
    role: "SR_DOM",
    designation: "Senior Divisional Operations Manager",
    department: "DIVISION_HQ",
    division: "Prayagraj Division (PRYJ)",
    zone: "North Central Railway (NCR)",
    section: "ALL_NCR_CORRIDORS",
    badgeCode: "NCR-SRDOM-01",
    privateNumberPrefix: "NCR-PRYJ-DOM",
  },
  {
    id: "OFFICER-03",
    name: "Vikramaditya Rao, IRSE",
    email: "srden.tms@ncr.railnet.gov.in",
    employeeId: "NCR-ENG-55102",
    role: "SR_DEN",
    designation: "Senior Divisional Engineer (Track Machine Specialist)",
    department: "ENGINEERING_TMS",
    division: "Prayagraj Division (PRYJ)",
    zone: "North Central Railway (NCR)",
    section: "ALJN-TDL-ETW Track Section",
    badgeCode: "NCR-TMS-404",
    privateNumberPrefix: "NCR-PRYJ-DEN",
  },
  {
    id: "OFFICER-04",
    name: "Dr. Sandeep Mukherjee, IRSSE",
    email: "srdste.smms@ncr.railnet.gov.in",
    employeeId: "NCR-SIG-77823",
    role: "SR_DSTE",
    designation: "Senior Divisional Signal & Telecom Engineer",
    department: "SIGNAL_SMMS",
    division: "Prayagraj Division (PRYJ)",
    zone: "North Central Railway (NCR)",
    section: "Tundla Jn Interlocking Section",
    badgeCode: "NCR-SMMS-202",
    privateNumberPrefix: "NCR-PRYJ-DSTE",
  },
  {
    id: "OFFICER-05",
    name: "Pooja Singhania, IRSEE",
    email: "srdee.trd@ncr.railnet.gov.in",
    employeeId: "NCR-TRD-99104",
    role: "SR_DEE",
    designation: "Senior Divisional Electrical Engineer (Traction/OHE)",
    department: "ELECTRICAL_TDMS",
    division: "Prayagraj Division (PRYJ)",
    zone: "North Central Railway (NCR)",
    section: "OHE Elementary Sections 14-B to 22-A",
    badgeCode: "NCR-TDMS-303",
    privateNumberPrefix: "NCR-PRYJ-DEE",
  },
];

interface AuthContextType {
  user: OfficerProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string, roleId?: string) => Promise<boolean>;
  signup: (data: Partial<OfficerProfile> & { password?: string }) => Promise<boolean>;
  logout: () => void;
  switchOfficer: (officerId: string) => void;
  presetOfficers: OfficerProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "samanvay_ai_officer_session";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OfficerProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    // Default to Section Controller for instant preview convenience
    return PRESET_OFFICERS[0];
  });

  const isAuthenticated = !!user;

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (email: string, _password?: string, roleId?: string): Promise<boolean> => {
    // Artificial authentic network latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    let matched = PRESET_OFFICERS.find((o) => o.id === roleId);
    if (!matched) {
      matched = PRESET_OFFICERS.find((o) => o.email.toLowerCase() === email.toLowerCase());
    }

    if (!matched) {
      // Create user profile for arbitrary Railnet email
      const nameFromEmail = email.split("@")[0].replace(".", " ").toUpperCase();
      matched = {
        id: `OFFICER-${Date.now().toString().slice(-4)}`,
        name: nameFromEmail || "Railway Duty Officer",
        email: email,
        employeeId: `NCR-EMP-${Math.floor(10000 + Math.random() * 90000)}`,
        role: "SECTION_CONTROLLER",
        designation: "Section Controller // Mission Console",
        department: "OPERATING",
        division: "Prayagraj Division (PRYJ)",
        zone: "North Central Railway (NCR)",
        section: "NCR-GZB-TDL-UP",
        badgeCode: `NCR-AUTH-${Math.floor(100 + Math.random() * 900)}`,
        privateNumberPrefix: "NCR-PRYJ-AUTH",
      };
    }

    setUser(matched);
    return true;
  };

  const signup = async (data: Partial<OfficerProfile> & { password?: string }): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 700));

    const newOfficer: OfficerProfile = {
      id: `OFFICER-${Date.now().toString().slice(-4)}`,
      name: data.name || "Authorized Railway Officer",
      email: data.email || "officer@ncr.railnet.gov.in",
      employeeId: data.employeeId || `NCR-EMP-${Math.floor(10000 + Math.random() * 90000)}`,
      role: data.role || "SECTION_CONTROLLER",
      designation: data.designation || "Section Operations Officer",
      department: data.department || "OPERATING",
      division: data.division || "Prayagraj Division (PRYJ)",
      zone: data.zone || "North Central Railway (NCR)",
      section: data.section || "NCR-GZB-TDL-UP",
      badgeCode: `NCR-${(data.department || "OPS").slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`,
      privateNumberPrefix: `NCR-PRYJ-${(data.department || "OPS").slice(0, 3)}`,
    };

    setUser(newOfficer);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const switchOfficer = (officerId: string) => {
    const target = PRESET_OFFICERS.find((o) => o.id === officerId);
    if (target) {
      setUser(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        signup,
        logout,
        switchOfficer,
        presetOfficers: PRESET_OFFICERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
