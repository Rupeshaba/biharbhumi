import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Trash2, ShieldAlert, Sparkles, Activity } from "lucide-react";
import { LiveLog } from "../types";

interface TerminalLogsProps {
  logs: LiveLog[];
  onClearLogs: () => Promise<any>;
}

export default function TerminalLogs({ logs, onClearLogs }: TerminalLogsProps) {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 font-sans"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/60 backdrop-blur-md border border-slate-805 px-6 py-5 rounded-2xl gap-4 shadow-xl select-none">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="text-white text-base font-bold flex items-center gap-1.5 leading-none">
              <Terminal className="w-4 h-4 text-emerald-400" /> लाइव लॉग्स (Live Logs)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Activities logged in safety memory. Cycles automatically above 200 items.
            </p>
          </div>
        </div>

        <button
          onClick={onClearLogs}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 rounded-xl active:scale-[0.98] transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Purge Console Logs
        </button>
      </div>

      {/* Terminal Board Container */}
      <div className="bg-slate-950/70 backdrop-blur-md border border-slate-900 rounded-3xl p-5 font-mono text-xs leading-relaxed relative overflow-hidden h-[500px] flex flex-col shadow-2xl">
        {/* Subtle decorative grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 z-10 scrollbar-thin">
          <AnimatePresence>
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-slate-500">
                <Activity className="w-10 h-10 text-slate-800 mb-2 animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider">Establishing telemetry & pipeline streams...</span>
              </div>
            ) : (
              logs.map((log) => {
                let textClass = "text-slate-300";
                let badgeClass = "text-slate-400 border border-slate-800 bg-slate-900/40";

                if (log.level === "success") {
                  textClass = "text-emerald-300";
                  badgeClass = "text-emerald-400 border border-emerald-950 bg-emerald-950/40";
                } else if (log.level === "warning") {
                  textClass = "text-amber-300";
                  badgeClass = "text-amber-400 border border-amber-950 bg-amber-950/40";
                } else if (log.level === "error") {
                  textClass = "text-rose-300 font-bold";
                  badgeClass = "text-rose-400 border border-rose-950 bg-rose-955/40";
                } else if (log.level === "info") {
                  textClass = "text-cyan-300";
                  badgeClass = "text-cyan-400 border border-cyan-950 bg-cyan-950/40";
                }

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 py-1 border-b border-slate-950 hover:bg-slate-900/10"
                  >
                    <span className="text-slate-600 select-none shrink-0 text-[10px] mt-0.5">
                      [{new Date(log.timestamp).toLocaleTimeString("en-IN")}]
                    </span>
                    <span className={`px-2 py-[2px] text-[8px] uppercase font-mono font-bold rounded-md tracking-wider shrink-0 select-none ${badgeClass}`}>
                      {log.level}
                    </span>
                    <span className={`break-all font-mono leading-relaxed ${textClass}`}>{log.message}</span>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
          <div ref={terminalEndRef} />
        </div>
      </div>
    </motion.div>
  );
}
