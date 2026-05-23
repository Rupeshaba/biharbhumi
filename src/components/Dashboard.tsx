import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building, LogOut, Clock, Activity, FileText, Users, Sliders, Settings, 
  Terminal, ShieldCheck, Heart, AlertTriangle, Sparkles, CheckCircle2, CircleDot, ChevronRight, Menu 
} from "lucide-react";

import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Import components
import AdminRecords from "./AdminRecords";
import BotManager from "./BotManager";
import TemplateManager from "./TemplateManager";
import SearchProfilesManager from "./SearchProfilesManager";
import PresetSettings from "./PresetSettings";
import TerminalLogs from "./TerminalLogs";

import { RegistryRecord, BotUser, MsgTemplate, LiveLog, Stats } from "../types";

// Client-side Firebase startup
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

interface DashboardProps {
  sessionToken: string;
  onLogout: () => void;
  showConcurrenceAlert: () => void;
}

export default function Dashboard({ sessionToken, onLogout, showConcurrenceAlert }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"records" | "bot" | "templates" | "profiles" | "presets" | "logs">("records");
  
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [subscribers, setSubscribers] = useState<BotUser[]>([]);
  const [templates, setTemplates] = useState<MsgTemplate[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [logs, setLogs] = useState<LiveLog[]>([]);
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes session countdown

  // Global Config loaded states
  const [ocrApis, setOcrApis] = useState<string[]>([]);
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean>(true);
  const [schedulerType, setSchedulerType] = useState<"presets" | "custom">("presets");
  const [schedulerTimes, setSchedulerTimes] = useState<string[]>(["10:00", "18:00"]);
  const [customCronExpression, setCustomCronExpression] = useState<string>("30 4 * * *");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Session countdown logout
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setTimeout(() => {
            onLogout();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, [onLogout]);

  // 2. CONCURRENCY EXCLUSION check using Firestore real-time listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", "admin"), (snapshot) => {
      if (snapshot.exists()) {
        const activeToken = snapshot.data().activeToken;
        if (activeToken && activeToken !== sessionToken) {
          console.warn("Session invalidated because of concurrent login elsewhere.");
          setTimeout(() => {
            showConcurrenceAlert();
            onLogout();
          }, 0);
        }
      }
    }, (error) => {
      console.error("Firestore concurrency listener failed:", error);
    });
    return () => unsub();
  }, [sessionToken, onLogout, showConcurrenceAlert]);

  // 3. Periodic pulling of logs & stats
  const pullStatsAndRecords = async () => {
    try {
      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData);

      const recordsRes = await fetch("/api/records");
      const recordsData = await recordsRes.json();
      setRecords(recordsData.records || []);

    } catch (err: any) {
      if (err instanceof TypeError || (err.message && err.message.includes("fetch"))) {
        console.warn("Stats sync paused: Server is temporarily offline or restarting. Retrying...");
      } else {
        console.error("Stats fetching error:", err);
      }
    }
  };

  // 4. Load configuration databases
  const pullConfigAndMetaData = async () => {
    try {
      const subsRes = await fetch("/api/bot-users");
      const subsData = await subsRes.json();
      setSubscribers(subsData.subscribers || []);

      const tplsRes = await fetch("/api/templates");
      const tplsData = await tplsRes.json();
      setTemplates(tplsData.templates || []);

      const profsRes = await fetch("/api/search-profiles");
      const profsData = await profsRes.json();
      setProfiles(profsData.profiles || []);

      const confRes = await fetch("/api/config");
      const confData = await confRes.json();
      setOcrApis(confData.ocrApis || []);
      setChatIds(confData.chatIds || []);
      setSchedulerEnabled(confData.schedulerEnabled !== false);
      setSchedulerType(confData.schedulerType || "presets");
      setSchedulerTimes(confData.schedulerTimes || ["10:00", "18:00"]);
      setCustomCronExpression(confData.customCronExpression || "30 4 * * *");

    } catch (err: any) {
      if (err instanceof TypeError || (err.message && err.message.includes("fetch"))) {
        console.warn("Config sync paused: Server is temporarily offline or restarting. Retrying...");
      } else {
        console.error("Config fetching error:", err);
      }
    }
  };

  const pullLogsOnly = async () => {
    try {
      const logsRes = await fetch("/api/logs");
      const logsData = await logsRes.json();
      setLogs(logsData.logs || []);
    } catch (err: any) {
      if (err instanceof TypeError || (err.message && err.message.includes("fetch"))) {
        console.warn("Logs sync paused: Server is temporarily offline or restarting. Retrying...");
      } else {
        console.error("Logs fetching error:", err);
      }
    }
  };

  useEffect(() => {
    pullStatsAndRecords();
    pullConfigAndMetaData();
    pullLogsOnly();

    const fastInterval = setInterval(pullLogsOnly, 3000); // Stream logs every 3s
    const slowInterval = setInterval(pullStatsAndRecords, 12000); // Stats and records pulled every 12s

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, []);

  // API triggers
  const handleTriggerScrape = async (profileId?: string, isInstant?: boolean) => {
    try {
      const res = await fetch("/api/scraper/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchProfile: profiles.find(p => p.id === profileId), isInstantSearch: isInstant })
      });
      const data = await res.json();
      pullStatsAndRecords();
      pullLogsOnly();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || "Failed scraper connection request" };
    }
  };

  const handleSaveSubscriber = async (sub: BotUser) => {
    try {
      const res = await fetch("/api/bot-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub)
      });
      pullConfigAndMetaData();
      pullStatsAndRecords();
      return await res.json();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcast = async (chatIds: string[], text: string) => {
    const res = await fetch("/api/bot-users/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetChatIds: chatIds, messageText: text })
    });
    return res.json();
  };

  const handleSaveTemplate = async (tpl: MsgTemplate) => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tpl)
    });
    pullConfigAndMetaData();
    pullStatsAndRecords();
    return res.json();
  };

  const handleSaveSearchProfile = async (prof: any) => {
    const res = await fetch("/api/search-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prof)
    });
    pullConfigAndMetaData();
    pullStatsAndRecords();
    return res.json();
  };

  const handleSavePresetConfigs = async (
    ocr: string[],
    chats: string[],
    scEnabled?: boolean,
    scType?: "presets" | "custom",
    scTimes?: string[],
    scCron?: string
  ) => {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ocrApis: ocr,
        chatIds: chats,
        schedulerEnabled: scEnabled !== undefined ? scEnabled : schedulerEnabled,
        schedulerType: scType || schedulerType,
        schedulerTimes: scTimes || schedulerTimes,
        customCronExpression: scCron || customCronExpression
      })
    });
    pullConfigAndMetaData();
    pullStatsAndRecords();
    return res.json();
  };

  const handleClearLogs = async () => {
    await fetch("/api/logs/clear", { method: "POST" });
    pullLogsOnly();
  };

  const formatTimeToken = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Structured menu items for cleaner navigation logic
  const navigationItems = [
    { key: "records", label: "Registry Logs", icon: FileText, desc: "Bihar registry database logs" },
    { key: "bot", label: "Subscribers", icon: Users, desc: "Manage Telegram targets" },
    { key: "templates", label: "Message Formats", icon: FileText, desc: "Blueprints & layouts" },
    { key: "profiles", label: "SRO Profiles", icon: Sliders, desc: "Geographic search parameters" },
    { key: "presets", label: "OCR Configs", icon: Settings, desc: "API keys & fallbacks" },
    { key: "logs", label: "Console Logs", icon: Terminal, desc: "Realtime terminal logs" }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans select-none pb-16 md:pb-0">
      
      {/* Laptop & Desktop Sidebar Navigation */}
      <aside className="w-72 bg-slate-900 border-r border-slate-805 shrink-0 flex-col justify-between hidden md:flex">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-805 flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shrink-0 shadow-lg shadow-emerald-950/25">
              <Building className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider text-white uppercase flex items-center gap-1 leading-none">
                ई-निबंधन <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">Bihar Scraper Gateway</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 pt-6">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full group flex items-start gap-3 px-4 py-3.5 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-200 text-left outline-none cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/30 font-bold" 
                      : "text-slate-400 hover:text-white hover:bg-slate-850/45"
                  }`}
                >
                  <IconComponent className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                  <div>
                    <span className="block font-bold">{item.label}</span>
                    <span className={`text-[9px] font-mono tracking-wide block mt-0.5 ${isActive ? "text-emerald-250 opacity-90" : "text-slate-500 group-hover:text-slate-400"}`}>
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Console Operator Profile footer */}
        <div className="p-4 border-t border-slate-805 space-y-3 bg-slate-950/20">
          <div className="p-4 bg-slate-950/90 border border-slate-855 rounded-2xl space-y-1 text-center">
            <span className="text-[9px] text-slate-500 font-mono tracking-widest block uppercase mb-1">Authorization Link</span>
            <div className="text-white text-xs font-bold font-sans">Operator Administrator</div>
            <div className="text-[10px] font-mono text-emerald-450 mt-1.5 flex items-center justify-center gap-1.5 leading-none">
              <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              Auto-Logout: <span className="font-bold text-white">{formatTimeToken(timeLeft)}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-950 border border-slate-805 text-rose-450 hover:text-rose-400 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] outline-none cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main drive workspace */}
      <main className="flex-1 flex flex-col min-h-screen">
        
        {/* Upper Header Statistics Dashboard Header */}
        <header className="bg-slate-900/40 backdrop-blur-md border-b border-slate-805 px-6 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <h2 className="text-lg font-extrabold tracking-tight font-sans text-white">
              SRO Bihar Bhumi Scraper Center
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Real-time captcha solving and registry broadcast system
            </p>
          </div>

          {/* Core Analytics Cards */}
          <AnimatePresence mode="wait">
            {stats ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto font-mono text-[10px]"
              >
                <div className="p-3 bg-slate-950/60 border border-slate-805 rounded-2xl">
                  <span className="text-slate-500 block font-bold tracking-wider uppercase">Portal Access</span>
                  <span className={`font-extrabold uppercase mt-1.5 flex items-center gap-1.5 text-xs ${stats.lastCheckedStatus === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                    <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                    {stats.lastCheckedStatus || "standby"}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-805 rounded-2xl">
                  <span className="text-slate-500 block font-bold tracking-wider uppercase">Deals Count</span>
                  <span className="font-extrabold text-white mt-1.5 block text-xs">{stats.totalRecords} records</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-805 rounded-2xl">
                  <span className="text-slate-500 block font-bold tracking-wider uppercase">Subscribers</span>
                  <span className="font-extrabold text-white mt-1.5 block text-xs">{stats.totalSubscribers} targets</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-805 rounded-2xl">
                  <span className="text-slate-500 block font-bold tracking-wider uppercase">Latest Discovered</span>
                  <span className="font-extrabold text-emerald-400 mt-1.5 block text-xs">+{stats.lastCheckedCount} deals</span>
                </div>
              </motion.div>
            ) : (
              <div className="text-xs text-slate-500 font-mono tracking-wider flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-slate-700 animate-spin" />
                Syncing system telemetries...
              </div>
            )}
          </AnimatePresence>
        </header>

        {/* Dynamic Inner Tab container */}
        <section className="p-4 sm:p-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "records" && (
                <AdminRecords 
                  records={records} 
                  onTriggerScrape={handleTriggerScrape} 
                  searchProfiles={profiles}
                />
              )}

              {activeTab === "bot" && (
                <BotManager 
                  subscribers={subscribers} 
                  templates={templates}
                  onSaveSubscriber={handleSaveSubscriber}
                  onBroadcast={handleBroadcast}
                />
              )}

              {activeTab === "templates" && (
                <TemplateManager 
                  templates={templates} 
                  onSaveTemplate={handleSaveTemplate}
                />
              )}

              {activeTab === "profiles" && (
                <SearchProfilesManager 
                  profiles={profiles} 
                  onSaveProfile={handleSaveSearchProfile}
                />
              )}

              {activeTab === "presets" && (
                <PresetSettings 
                  ocrApis={ocrApis} 
                  chatIds={chatIds} 
                  schedulerEnabled={schedulerEnabled}
                  schedulerType={schedulerType}
                  schedulerTimes={schedulerTimes}
                  customCronExpression={customCronExpression}
                  onSaveConfig={handleSavePresetConfigs}
                />
              )}

              {activeTab === "logs" && (
                <TerminalLogs 
                  logs={logs} 
                  onClearLogs={handleClearLogs}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* Modern, Bottom Tab Navigation Bar for Mobile Handheld devices */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-805 z-40 px-3 py-1 flex justify-around items-center h-16 shadow-2xl">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all outline-none cursor-pointer"
            >
              <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-emerald-600 text-white" : "text-slate-500"}`}>
                <IconComponent className="w-5 h-5 shrink-0" />
              </div>
              <span className={`text-[8px] font-bold font-sans mt-0.5 max-w-[50px] truncate ${isActive ? "text-emerald-400" : "text-slate-500"}`}>
                {item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
        {/* Quick mobile logout link */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-rose-500 outline-none cursor-pointer"
          title="Logout"
        >
          <div className="p-1.5">
            <LogOut className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[8px] font-bold mt-0.5">Exit</span>
        </button>
      </nav>
    </div>
  );
}
