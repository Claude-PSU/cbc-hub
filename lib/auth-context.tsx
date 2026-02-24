"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Only relevant for email/password users. null = not yet loaded. */
  emailPasswordAccountVerified: boolean | null;
  /** Call this after a successful OTP verification to unblock navigation immediately. */
  markEmailVerified: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  emailPasswordAccountVerified: null,
  markEmailVerified: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailPasswordAccountVerified, setEmailPasswordAccountVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        const isEmailPassword = u.providerData.some((p) => p.providerId === "password");

        try {
          const snap = await getDoc(doc(db, "members", u.uid));
          if (snap.exists()) {
            const data = snap.data();
            // Update last active timestamp
            updateDoc(doc(db, "members", u.uid), {
              lastActive: new Date().toISOString(),
            }).catch((err) => console.debug("Could not update lastActive:", err));

            setEmailPasswordAccountVerified(
              isEmailPassword ? data.emailPasswordAccountVerified === true : true
            );
          } else {
            // No member doc yet — treat as unverified for email/password users
            setEmailPasswordAccountVerified(isEmailPassword ? false : true);
          }
        } catch (err) {
          console.debug("Could not fetch member doc:", err);
          setEmailPasswordAccountVerified(null);
        }
      } else {
        setEmailPasswordAccountVerified(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const markEmailVerified = () => setEmailPasswordAccountVerified(true);

  return (
    <AuthContext.Provider value={{ user, loading, emailPasswordAccountVerified, markEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
