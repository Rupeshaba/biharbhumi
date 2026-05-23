import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Send, KeyRound, Loader2, MessageSquare, ClipboardCheck, ArrowRight, Sparkles } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [txToken, setTxToken] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setTxToken(data.token);
        setStep(2);
        setCountdown(60);
      } else {
        setError(data.error || "Failed to dispatch verification code to Telegram.");
      }
    } catch (err) {
      setError("Server communications failed. Verify that Express server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter a valid OTP passcode.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp, token: txToken })
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.sessionToken);
      } else {
        setError(data.error || "Verification failed. Incorrect passcode entered.");
      }
    } catch (err) {
      setError("Authentication network request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      {/* Dynamic graphic backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_45%)]" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.08),transparent_45%)]" />

      {/* Futuristic floating lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10 text-center"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
          <Sparkles className="w-3 h-3 animate-pulse text-emerald-400" />
          Secured Scraper Gateway
        </div>
        
        {/* Main Brand Header */}
        <div className="flex flex-col items-center">
          <div className="relative group mb-6">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-25 blur transition duration-1000 group-hover:opacity-40 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
              <ClipboardCheck className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1 bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
            ई-निबंधन सुरक्षा
          </h2>
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            Bihar Registry Management Scraper
          </p>
        </div>
      </motion.div>

      {/* Main Authentication card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 w-full max-w-md z-10 px-4"
      >
        <div className="relative">
          {/* Card Border glow */}
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-950 opacity-50 blur-sm" />
          
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 py-8 px-6 sm:px-10 shadow-3xl rounded-3xl overflow-hidden">
            {/* Subtle light leak at top */}
            <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

            {/* Error notifications */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-200">संकेत त्रुटि (Authentication Error)</span>
                    <span className="mt-0.5 block opacity-90">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Steps Container */}
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSendOtp}
                  className="space-y-6"
                >
                  <div className="text-center space-y-3">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      This system requires multi-factor authorization. Clicking dispatch sends an instantaneous OTP confirmation passcode to your premium configured Telegram console client.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-950/60 border border-slate-850 rounded-full text-[10px] font-mono text-emerald-400">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      Automatic chat ID transmission
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full group overflow-hidden flex justify-center items-center gap-2.5 py-3.5 px-4 border border-emerald-500/20 text-xs font-semibold rounded-2xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-emerald-950/10 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        डिटेक्टिंग कोड (Dispatching code)...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        Send OTP to Telegram
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  <div>
                    <label htmlFor="otp" className="block text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase mb-2">
                      सुरक्षा पिन प्रविष्ट करें / Enter 6-Digit PIN
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <KeyRound className="h-4 w-4 text-emerald-500" />
                      </div>
                      <input
                        type="text"
                        name="otp"
                        id="otp"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className="block w-full rounded-2xl border border-slate-850 bg-slate-950/90 pl-11 pr-4 py-3.5 text-white placeholder-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 sm:text-sm text-center tracking-[0.5em] font-mono text-xl focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono px-0.5">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={countdown > 0 || loading}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      Resend Code
                    </button>
                    {countdown > 0 && (
                      <span className="text-slate-500 flex items-center gap-1">
                        Retry in <span className="text-emerald-400 font-bold">{countdown}s</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading || otp.length < 4}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-emerald-500/20 text-xs font-semibold rounded-2xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all disabled:opacity-45 disabled:pointer-events-none shadow-xl shadow-emerald-950/10 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <>
                          <span>सत्यापित करें / Authorize Link</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors cursor-pointer"
                    >
                      वापस जाएं (Go Back)
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-12 text-center text-[11px] text-slate-500 font-mono tracking-wider"
      >
        LATEST CRYPTO LINK • BIHAR REGISTRY SERVICES V2.5
      </motion.p>
    </div>
  );
}
