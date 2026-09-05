import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyRjXN2ifZcv6R8LiyKPvNFE2wm2lTGP0",
  authDomain: "sihproject-82663.firebaseapp.com",
  projectId: "sihproject-82663",
  storageBucket: "sihproject-82663.firebasestorage.app",
  messagingSenderId: "310118016342",
  appId: "1:310118016342:web:e3a8d7594395c08f7422f7",
  measurementId: "G-FF496XTRHL"
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Analytics conditionally for browser environments
export const initAnalytics = async () => {
  if (typeof window !== "undefined" && (await isSupported())) {
    return getAnalytics(app);
  }
  return null;
};
