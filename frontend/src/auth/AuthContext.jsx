import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../utils/api";

const AuthContext = createContext(null);

// Fetch the full user object from backend using the Supabase token
async function fetchBackendUser(token) {
  const res = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch /me:", res.status);
    return null;
  }

  return res.json(); // { id, email, role, is_verified }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Shared handler — called on session restore AND on auth state changes
  async function handleSession(session) {
    if (!session) {
      setUser(null);
      return;
    }

    const backendUser = await fetchBackendUser(session.access_token);
    setUser(backendUser); // null if fetch failed — components must handle this
  }

  useEffect(() => {
    // Restore existing session on page load
    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session ?? null);
    });

    // React to login / logout / token refresh
    // Skip backend user resolution for PASSWORD_RECOVERY — the ResetPassword
    // page handles that session directly via its own onAuthStateChange listener.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") return;
        handleSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    // onAuthStateChange fires automatically → handleSession is called → user is set
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange fires with null session → setUser(null)
  };

  const sendPasswordResetEmail = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL || "http://localhost:5173"}/reset-password`,
    });
    if (error) throw error;
  };

  const updateUserPassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, sendPasswordResetEmail, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}