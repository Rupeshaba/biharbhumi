import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Plus, Trash2, CheckCircle2, MessageCircle, Clock, Calendar, ToggleLeft, ToggleRight, Sliders, Sparkles, AlertTriangle } from "lucide-react";

interface PresetSettingsProps {
  ocrApis: string[];
  chatIds: string[];
  schedulerEnabled?: boolean;
  schedulerType?: "presets" | "custom";
  schedulerTimes?: string[];
  customCronExpression?: string;
  onSaveConfig: (
    ocr: string[],
    chats: string[],
    schedulerEnabled: boolean,
    schedulerType: "presets" | "custom",
    schedulerTimes: string[],
    customCronExpression: string
  ) => Promise<any>;
}

export default function PresetSettings({
  ocrApis,
  chatIds,
  schedulerEnabled = true,
  schedulerType = "presets",
  schedulerTimes = ["10:00", "18:00"],
  customCronExpression = "30 4 * * *",
  onSaveConfig
}: PresetSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [ocrInput, setOcrInput] = useState("");
  const [chatInput, setChatInput] = useState("");

  const [localOcr, setLocalOcr] = useState<string[]>(ocrApis);
  const [localChats, setLocalChats] = useState<string[]>(chatIds);

  const [localSchedulerEnabled, setLocalSchedulerEnabled] = useState<boolean>(schedulerEnabled);
  const [localSchedulerType, setLocalSchedulerType] = useState<"presets" | "custom">(schedulerType);
  const [localSchedulerTimes, setLocalSchedulerTimes] = useState<string[]>(schedulerTimes);
  const [localCustomCron, setLocalCustomCron] = useState<string>(customCronExpression);

  const [newTimeInput, setNewTimeInput] = useState("");

  useEffect(() => {
    setLocalOcr(ocrApis);
    setLocalChats(chatIds);
    setLocalSchedulerEnabled(schedulerEnabled);
    setLocalSchedulerType(schedulerType);
    setLocalSchedulerTimes(schedulerTimes);
    setLocalCustomCron(customCronExpression);
  }, [ocrApis, chatIds, schedulerEnabled, schedulerType, schedulerTimes, customCronExpression]);

  const executeAutoSave = async (
    ocr: string[],
    chats: string[],
    enabled: boolean,
    type: "presets" | "custom",
    times: string[],
    cron: string
  ) => {
    setLoading(true);
    setSuccessMsg("");
    try {
      await onSaveConfig(ocr, chats, enabled, type, times, cron);
      setSuccessMsg("Changes saved automatically! (स्वचालित रूप से सहेज लिया गया है)");
      setTimeout(() => {
        setSuccessMsg("");
      }, 5000);
    } catch (err) {
      console.error("Auto-save operation details failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOcr = () => {
    if (!ocrInput || localOcr.includes(ocrInput)) return;
    const updated = [...localOcr, ocrInput];
    setLocalOcr(updated);
    setOcrInput("");
    executeAutoSave(updated, localChats, localSchedulerEnabled, localSchedulerType, localSchedulerTimes, localCustomCron);
  };

  const handleRemoveOcr = (key: string) => {
    const updated = localOcr.filter((k) => k !== key);
    setLocalOcr(updated);
    executeAutoSave(updated, localChats, localSchedulerEnabled, localSchedulerType, localSchedulerTimes, localCustomCron);
  };

  const handleAddChat = () => {
    if (!chatInput || localChats.includes(chatInput)) return;
    const updated = [...localChats, chatInput];
    setLocalChats(updated);
    setChatInput("");
    executeAutoSave(localOcr, updated, localSchedulerEnabled, localSchedulerType, localSchedulerTimes, localCustomCron);
  };

  const handleRemoveChat = (id: string) => {
    const updated = localChats.filter((c) => c !== id);
    setLocalChats(updated);
    executeAutoSave(localOcr, updated, localSchedulerEnabled, localSchedulerType, localSchedulerTimes, localCustomCron);
  };

  const commonSchedules = [
    { label: "Morning 10:00 AM", value: "10:00" },
    { label: "Afternoon 12:00 PM", value: "12:00" },
    { label: "Luck 02:00 PM", value: "14:00" },
    { label: "Evening 04:00 PM", value: "16:00" },
    { label: "Closing 06:00 PM", value: "18:00" },
    { label: "Night 08:00 PM", value: "20:00" }
  ];

  const toggleCommonSchedule = (timeStr: string) => {
    const updated = localSchedulerTimes.includes(timeStr)
      ? localSchedulerTimes.filter((t) => t !== timeStr)
      : [...localSchedulerTimes, timeStr].sort();
    
    setLocalSchedulerTimes(updated);
    executeAutoSave(localOcr, localChats, localSchedulerEnabled, localSchedulerType, updated, localCustomCron);
  };

  const handleAddCustomTime = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = newTimeInput.trim();
    if (!clean) return;

    if (/^\d{1,2}$/.test(clean)) {
      clean = `${clean.padStart(2, "0")}:00`;
    } else if (/^\d{3,4}$/.test(clean)) {
      const padded = clean.padStart(4, "0");
      clean = `${padded.slice(0, 2)}:${padded.slice(2)}`;
    }

    if (!clean.includes(":")) return;
    const parts = clean.split(":");
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const formatted = `${hh}:${mm}`;
        if (!localSchedulerTimes.includes(formatted)) {
          const updated = [...localSchedulerTimes, formatted].sort();
          setLocalSchedulerTimes(updated);
          executeAutoSave(localOcr, localChats, localSchedulerEnabled, localSchedulerType, updated, localCustomCron);
        }
        setNewTimeInput("");
      }
    }
  };

  const handleRemoveScheduleTime = (timeStr: string) => {
    const updated = localSchedulerTimes.filter((t) => t !== timeStr);
    setLocalSchedulerTimes(updated);
    executeAutoSave(localOcr, localChats, localSchedulerEnabled, localSchedulerType, updated, localCustomCron);
  };

  const handleToggleSchedulerEnabled = () => {
    const updatedVal = !localSchedulerEnabled;
    setLocalSchedulerEnabled(updatedVal);
    executeAutoSave(localOcr, localChats, updatedVal, localSchedulerType, localSchedulerTimes, localCustomCron);
  };

  const handleSelectSchedulerType = (newType: "presets" | "custom") => {
    setLocalSchedulerType(newType);
    executeAutoSave(localOcr, localChats, localSchedulerEnabled, newType, localSchedulerTimes, localCustomCron);
  };

  const handleSaveConfigs = async () => {
    await executeAutoSave(
      localOcr,
      localChats,
      localSchedulerEnabled,
      localSchedulerType,
      localSchedulerTimes,
      localCustomCron
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans select-none">
      
      {/* Upper overview card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-md border border-slate-805 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400 shrink-0" />
          ग्लोबल कॉन्फ़िगरेशन (System Settings)
        </h3>
        <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
          Set automatic scheduler limits, configure fallback OCR tokens, and secondary broadcast targets.
        </p>

        {/* Floating success banner */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-2xl flex items-center gap-2.5 shadow-md"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 animate-pulse" />
              <span className="font-semibold">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. AUTOMATIC BACKGROUND SCHEDULER SECTION */}
        <div className="p-5.5 bg-slate-950/60 border border-slate-850 rounded-2xl mt-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 rounded-2xl text-indigo-400 shrink-0">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider">
                  स्वचालित शेड्यूलर (Scrape Scheduler)
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Define periodic query times for automatic runs</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSchedulerEnabled}
              className="flex items-center gap-3 text-xs font-bold focus:outline-none transition-all cursor-pointer bg-slate-900 border border-slate-805 px-3.5 py-1.5 rounded-2xl hover:border-slate-700 hover:text-white"
            >
              <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider">
                {localSchedulerEnabled ? "Armed & Active" : "Disabled / Idle"}
              </span>
              {localSchedulerEnabled ? (
                <ToggleRight className="w-9 h-9 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-600" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {localSchedulerEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="border-t border-slate-900 pt-5 space-y-6 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest block mb-2.5">
                      Schedule Time Method (शेड्यूल प्रकार तय करें)
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-855">
                      <button
                        type="button"
                        onClick={() => handleSelectSchedulerType("presets")}
                        className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          localSchedulerType === "presets"
                            ? "bg-slate-800 text-white shadow-md font-extrabold"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        India Time Clocks
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSchedulerType("custom")}
                        className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          localSchedulerType === "custom"
                            ? "bg-slate-800 text-white shadow-md font-extrabold"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        Cron Scheduler Core
                      </button>
                    </div>
                  </div>

                  <div>
                    {localSchedulerType === "presets" ? (
                      <form onSubmit={handleAddCustomTime} className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest block">
                          Add Scrape Clock Time (सक्रिय समय जोड़ें)
                        </label>
                        <div className="flex gap-2.5 items-center">
                          <input
                            type="text"
                            value={newTimeInput}
                            onChange={(e) => setNewTimeInput(e.target.value)}
                            placeholder="e.g. 11:30 or 14"
                            className="bg-slate-950 border border-slate-805 rounded-xl px-4 py-2 text-xs text-white max-w-[150px] font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
                          />
                          <div className="relative flex items-center bg-slate-950 border border-slate-805 rounded-xl px-1">
                            <input
                              type="time"
                              value={newTimeInput.includes(":") && newTimeInput.length === 5 ? newTimeInput : ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setNewTimeInput(e.target.value);
                                }
                              }}
                              className="bg-transparent text-xs text-white p-1.5 h-[34px] font-mono cursor-pointer [color-scheme:dark] border-0 focus:outline-none"
                              title="चुनें"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                          >
                            + Confirm Clock
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest block">
                          Standard Linux Cron Configuration
                        </label>
                        <input
                          type="text"
                          value={localCustomCron}
                          onChange={(e) => setLocalCustomCron(e.target.value)}
                          placeholder="e.g. 30 10 * * *"
                          className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {localSchedulerType === "presets" && (
                  <div className="space-y-5">
                    {/* Common preset times */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                        Toggle Quick Office Hours (प्रायः समय सूची):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {commonSchedules.map((item) => {
                          const isSelected = localSchedulerTimes.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => toggleCommonSchedule(item.value)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 font-bold"
                                  : "bg-slate-950/40 text-slate-500 border-slate-855 hover:border-slate-750"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Schedules */}
                    <div className="border-t border-slate-900/60 pt-4">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-3">
                        Armed Run Clocks (सक्रिय टाइम्स):
                      </span>
                      {localSchedulerTimes.length === 0 ? (
                        <p className="text-xs text-slate-500 italic pl-1">No execution schedule mapped yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                          {localSchedulerTimes.map((time) => (
                            <div
                              key={time}
                              className="flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-855 rounded-xl group hover:border-indigo-500/30 transition-all font-mono text-xs"
                            >
                              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                {time}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveScheduleTime(time)}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer p-0.5"
                                title="Remove clock"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. SECURITY KEYS & PORT INTEGRATION SETTINGS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-6.5 border-t border-slate-805">
          
          {/* OCR solver tokens */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 shrink-0">
                <KeyRound className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
                  OCR.space API Tokens
                </h4>
                <p className="text-[10px] text-slate-500">Captcha solving access tokens list (वैकल्पिक OCR टोकन्स)</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={ocrInput}
                onChange={(e) => setOcrInput(e.target.value)}
                placeholder="Insert OCR Token Key"
                className="flex-1 bg-slate-950 border border-slate-805 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddOcr}
                className="bg-slate-800 font-bold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Add Key
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {localOcr.length === 0 ? (
                <p className="text-[10px] font-mono text-slate-600 pl-1">
                  Using default fallback captcha engines configured in environment files.
                </p>
              ) : (
                localOcr.map((key) => (
                  <div
                    key={key}
                    className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-855 text-[11px] font-mono text-slate-400"
                  >
                    <span className="truncate">Key Hash: ...{key.slice(-12)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOcr(key)}
                      className="text-rose-450 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Backup chat IDs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
                  Backup Broadcast Targets
                </h4>
                <p className="text-[10px] text-slate-500">Secondary Telegram group list (बैकअप ब्रॉडकास्ट)</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="Insert Backup Chat ID"
                className="flex-1 bg-slate-950 border border-slate-805 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChat}
                className="bg-slate-800 font-bold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Add Target
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {localChats.length === 0 ? (
                <p className="text-[10px] font-mono text-slate-600 pl-1">
                  Primary delivery targets direct to subscribers configuration. No backup chat IDs listed.
                </p>
              ) : (
                localChats.map((cid) => (
                  <div
                    key={cid}
                    className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-855 text-[11px] font-mono text-slate-400"
                  >
                    <span>ID Reference: {cid}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChat(cid)}
                      className="text-rose-450 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. PERSISTENCE SAVE ACTION BAR */}
        <div className="flex justify-end pt-5 border-t border-slate-805">
          <button
            onClick={handleSaveConfigs}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white rounded-xl active:scale-[0.98] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Registering settings..." : "Store Configurations & Rearm Scheduler"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
