import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

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
  uid?: string;
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
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password?: string, roleId?: string) => Promise<boolean>;
  signup: (data: Partial<OfficerProfile> & { password?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  switchOfficer: (officerId: string) => void;
  presetOfficers: OfficerProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_SESSION_KEY = "samanvay_ai_officer_session";
const PROFILES_STORAGE_KEY = "samanvay_ai_officer_profiles";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<OfficerProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const isAuthenticated = !!user;

  // Persist session to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }, [user]);

  // Helper to load/save profile metadata mapped by email
  const getStoredProfile = (email: string): OfficerProfile | null => {
    try {
      const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (stored) {
        const map = JSON.parse(stored);
        return map[email.toLowerCase()] || null;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const saveStoredProfile = (profile: OfficerProfile) => {
    try {
      const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
      const map = stored ? JSON.parse(stored) : {};
      map[profile.email.toLowerCase()] = profile;
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        // Look up profile in presets or locally stored profile
        let matched: OfficerProfile | null = PRESET_OFFICERS.find(
          (o) => o.email.toLowerCase() === fbUser.email?.toLowerCase()
        ) || null;
        if (!matched) {
          matched = getStoredProfile(fbUser.email);
        }

        if (!matched) {
          const nameFromEmail = (fbUser.displayName || fbUser.email.split("@")[0])
            .replace(".", " ")
            .toUpperCase();
          matched = {
            id: `OFFICER-${fbUser.uid.slice(0, 5)}`,
            name: nameFromEmail || "Railway Duty Officer",
            email: fbUser.email,
            employeeId: `NCR-EMP-${Math.floor(10000 + Math.random() * 90000)}`,
            role: "SECTION_CONTROLLER",
            designation: "Section Controller // Mission Console",
            department: "OPERATING",
            division: "Prayagraj Division (PRYJ)",
            zone: "North Central Railway (NCR)",
            section: "NCR-GZB-TDL-UP",
            badgeCode: `NCR-AUTH-${Math.floor(100 + Math.random() * 900)}`,
            privateNumberPrefix: "NCR-PRYJ-AUTH",
            uid: fbUser.uid,
          };
          saveStoredProfile(matched);
        }

        setUser({ ...matched, uid: fbUser.uid });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatFirebaseError = (error: any): string => {
    const code = error?.code || "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password. Please verify your Railnet credentials.";
      case "auth/invalid-email":
        return "Invalid email address format.";
      case "auth/email-already-in-use":
        return "An officer account with this email address already exists. Please sign in.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/user-disabled":
        return "This railway officer account has been disabled. Contact CRIS administrator.";
      case "auth/too-many-requests":
        return "Access temporarily locked due to multiple failed attempts. Please try again in a few moments.";
      case "auth/network-request-failed":
        return "Network connection error. Please check your internet connection.";
      default:
        return error?.message || "Authentication failed. Please try again.";
    }
  };

  const login = async (email: string, password?: string, roleId?: string): Promise<boolean> => {
    // 1. If a 1-click demo preset is explicitly selected without a custom password:
    if (roleId && (!password || password === "••••••••••••")) {
      const preset = PRESET_OFFICERS.find((o) => o.id === roleId);
      if (preset) {
        setUser(preset);
        return true;
      }
    }

    // 2. Otherwise authenticate directly with Firebase Email/Password
    if (email && password && password !== "••••••••••••") {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCredential.user;

        let profile: OfficerProfile | null = PRESET_OFFICERS.find((o) => o.email.toLowerCase() === email.toLowerCase()) || null;
        if (!profile) {
          profile = getStoredProfile(email);
        }
        if (!profile) {
          const nameFromEmail = (fbUser.displayName || email.split("@")[0]).replace(".", " ").toUpperCase();
          profile = {
            id: `OFFICER-${fbUser.uid.slice(0, 5)}`,
            name: nameFromEmail || "Railway Duty Officer",
            email: email.trim(),
            employeeId: `NCR-EMP-${Math.floor(10000 + Math.random() * 90000)}`,
            role: "SECTION_CONTROLLER",
            designation: "Section Controller // Mission Console",
            department: "OPERATING",
            division: "Prayagraj Division (PRYJ)",
            zone: "North Central Railway (NCR)",
            section: "NCR-GZB-TDL-UP",
            badgeCode: `NCR-AUTH-${Math.floor(100 + Math.random() * 900)}`,
            privateNumberPrefix: "NCR-PRYJ-AUTH",
            uid: fbUser.uid,
          };
          saveStoredProfile(profile);
        }

        setUser({ ...profile, uid: fbUser.uid });
        return true;
      } catch (err: any) {
        throw new Error(formatFirebaseError(err));
      }
    }

    // Fallback preset lookup
    let matched = PRESET_OFFICERS.find((o) => o.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setUser(matched);
      return true;
    }

    throw new Error("Please provide a valid password for email authentication.");
  };

  const signup = async (data: Partial<OfficerProfile> & { password?: string }): Promise<boolean> => {
    if (!data.email || !data.password) {
      throw new Error("Email and password are required.");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email.trim(),
        data.password
      );
      const fbUser = userCredential.user;

      const newOfficer: OfficerProfile = {
        id: `OFFICER-${fbUser.uid.slice(0, 5)}`,
        name: data.name || "Authorized Railway Officer",
        email: data.email.trim(),
        employeeId: data.employeeId || `NCR-EMP-${Math.floor(10000 + Math.random() * 90000)}`,
        role: data.role || "SECTION_CONTROLLER",
        designation: data.designation || "Section Operations Officer",
        department: data.department || "OPERATING",
        division: data.division || "Prayagraj Division (PRYJ)",
        zone: data.zone || "North Central Railway (NCR)",
        section: data.section || "NCR-GZB-TDL-UP",
        badgeCode: `NCR-${(data.department || "OPS").slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`,
        privateNumberPrefix: `NCR-PRYJ-${(data.department || "OPS").slice(0, 3)}`,
        uid: fbUser.uid,
      };

      saveStoredProfile(newOfficer);
      setUser(newOfficer);
      return true;
    } catch (err: any) {
      throw new Error(formatFirebaseError(err));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase signout error:", err);
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem(STORAGE_SESSION_KEY);
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
        firebaseUser,
        isAuthenticated,
        loading,
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
