import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldX, AlertTriangle, CloudRain, Lock, HelpCircle } from "lucide-react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import BackgroundParticles from "./components/BackgroundParticles";

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(
    localStorage.getItem("bihar_scraper_session")
  );
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasConcurrenceAlert, setHasConcurrenceAlert] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/check-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken })
        });
        const data = await res.json();
        if (data.authorized) {
          setAuthorized(true);
        } else {
          // Token invalidated
          localStorage.removeItem("bihar_scraper_session");
          setSessionToken(null);
        }
      } catch (err) {
        console.error("Session verification network failure:", err);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionToken]);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem("bihar_scraper_session", token);
    setSessionToken(token);
    setAuthorized(true);
    setHasConcurrenceAlert(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("bihar_scraper_session");
    setSessionToken(null);
    setAuthorized(false);
  };

  const triggerConcurrenceAlert = () => {
    setHasConcurrenceAlert(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-slate-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-10 h-10 border-2 border-t-emerald-400 border-r-slate-800 border-b-slate-800 border-l-slate-850 rounded-full mb-4"
        />
        <span>Establishing Secured Link...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen relative font-sans text-slate-100 overflow-x-hidden">
      <BackgroundParticles />
      {hasConcurrenceAlert && (
        <div className="bg-rose-650 text-white py-3 px-4 flex items-center justify-between text-xs font-semibold animate-bounce z-50 relative border-b border-rose-500 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />
            <span>SESSION SUPERSEDEMENT: You have been instantly logged out because this dashboard was accessed from an alternative device or tab.</span>
          </div>
          <button
            onClick={() => setHasConcurrenceAlert(false)}
            className="hover:scale-105 active:scale-95 bg-slate-950/30 px-3 py-1.5 rounded-lg border border-white/20 transition-all uppercase text-[10px] tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {authorized && sessionToken ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <Dashboard 
              sessionToken={sessionToken} 
              onLogout={handleLogout} 
              showConcurrenceAlert={triggerConcurrenceAlert}
            />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Login onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
