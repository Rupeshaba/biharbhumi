import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, UserX, UserCheck, ShieldAlert, Send, Plus, 
  Settings, CheckSquare, Square, Trash2, Edit, MessageSquare, Sparkles, X, UserMinus
} from "lucide-react";
import { BotUser, MsgTemplate } from "../types";

interface BotManagerProps {
  subscribers: BotUser[];
  templates: MsgTemplate[];
  onSaveSubscriber: (sub: BotUser) => Promise<any>;
  onBroadcast: (chatIds: string[], message: string) => Promise<any>;
}

export default function BotManager({ subscribers, templates, onSaveSubscriber, onBroadcast }: BotManagerProps) {
  const [loading, setLoading] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [editingSub, setEditingSub] = useState<BotUser | null>(null);

  // Adding new subscriber drawer
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChatId, setNewChatId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [newMsgType, setNewMsgType] = useState<"new" | "all">("new");

  const [broadcastOutcome, setBroadcastOutcome] = useState<string | null>(null);

  const handleToggleSelectAll = () => {
    if (selectedSubscribers.length === subscribers.length) {
      setSelectedSubscribers([]);
    } else {
      setSelectedSubscribers(subscribers.map((s) => s.chatId));
    }
  };

  const handleToggleSelectOne = (chatId: string) => {
    if (selectedSubscribers.includes(chatId)) {
      setSelectedSubscribers(selectedSubscribers.filter((id) => id !== chatId));
    } else {
      setSelectedSubscribers([...selectedSubscribers, chatId]);
    }
  };

  const handleBlockUnblock = async (sub: BotUser) => {
    const updatedSub = { ...sub, blocked: !sub.blocked };
    await onSaveSubscriber(updatedSub);
  };

  const handleToggleNotify = async (sub: BotUser) => {
    const updatedSub = { ...sub, notifyEnabled: !sub.notifyEnabled };
    await onSaveSubscriber(updatedSub);
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatId) return;

    setLoading(true);
    const subscriberData: BotUser = {
      chatId: newChatId,
      username: newUsername || "Sub",
      blocked: false,
      notifyEnabled: true,
      approved: true,
      templates: newTemplate ? [newTemplate] : [],
      msgType: newMsgType
    };

    try {
      await onSaveSubscriber(subscriberData);
      setNewChatId("");
      setNewUsername("");
      setNewTemplate("");
      setNewMsgType("new");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastMessage = async () => {
    if (selectedSubscribers.length === 0 || !broadcastText) return;
    setLoading(true);
    setBroadcastOutcome(null);
    try {
      const res = await onBroadcast(selectedSubscribers, broadcastText);
      if (res.success) {
        setBroadcastOutcome(`Successfully broadcasted message to ${res.dispatched} subscribers.`);
        setBroadcastText("");
      } else {
        setBroadcastOutcome("Broadcast rejected: " + res.error);
      }
    } catch (err) {
      setBroadcastOutcome("Broadcast network call failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setLoading(true);
    try {
      await onSaveSubscriber(editingSub);
      setEditingSub(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* Broadcast Messaging box */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0" />
          त्वरित प्रसारण (Broadcast Msg)
        </h3>
        <p className="text-slate-400 text-xs mb-5 leading-relaxed">
          Transmit instant alerts or custom layout notices to selected subscribers.
        </p>

        <textarea
          rows={3}
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          placeholder="Compose notification text... (Supports *bold*, _italics_ markdown syntax)"
          className="block w-full rounded-2xl border border-slate-755 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 mb-4 font-mono leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span className="text-[11px] text-slate-400 font-mono bg-slate-950/80 px-3 py-1.5 border border-slate-855 rounded-xl">
            अधिग्रहित लक्षित: <span className="text-emerald-400 font-extrabold">{selectedSubscribers.length}</span> / {subscribers.length} subscribers selected
          </span>
          <button
            onClick={handleBroadcastMessage}
            disabled={loading || selectedSubscribers.length === 0 || !broadcastText}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-2xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Dispatch Broadcast Message
          </button>
        </div>

        {broadcastOutcome && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl font-mono">
            {broadcastOutcome}
          </div>
        )}
      </motion.div>

      {/* Bot Subscribers panel */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400 shrink-0" />
              टेलीग्राम सब्सक्राइबर्स (Telegram Subscribers)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Manage targets, template flows, and dispatch authorizations.</p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Subscriber Profile
          </button>
        </div>

        {/* Create Form Drawer */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35 }}
              onSubmit={handleAddSubscriber}
              className="p-6 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end overflow-hidden"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">TELEGRAM CHAT ID</label>
                <input
                  type="text"
                  required
                  value={newChatId}
                  onChange={(e) => setNewChatId(e.target.value.replace(/[^\d-]/g, ""))}
                  placeholder="e.g. 524029 or -100155"
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">SUBSCRIBER NAME / TITLE</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Alauli SRO Officer Group"
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">NOTIFY PREFERENCES</label>
                <select
                  value={newMsgType}
                  onChange={(e) => setNewMsgType(e.target.value as "new" | "all")}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  <option value="new">Notify Only Newly Discovered Deals</option>
                  <option value="all">Daily PDF Compiled full summary bulletins</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !newChatId}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 px-3 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {subscribers.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm font-mono">
            Direct notifications targeted to configurations chat IDs only. Use options to add.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-slate-300">
                <thead className="bg-slate-950/40 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold w-10">
                      <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-white cursor-pointer">
                        {selectedSubscribers.length === subscribers.length ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Subscriber Chat Specs</th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Notification Setting</th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Active Templates / Delivery</th>
                    <th scope="col" className="px-6 py-4.5 text-right font-semibold">Actions / Block State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                  {subscribers.map((sub) => (
                    <tr key={sub.chatId} className={`hover:bg-slate-850/25 transition-colors ${sub.blocked ? "opacity-50" : ""}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => handleToggleSelectOne(sub.chatId)} className="text-slate-400 hover:text-white cursor-pointer">
                          {selectedSubscribers.includes(sub.chatId) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{sub.username}</span>
                          {sub.approved === false ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              Awaiting Approval
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                              Approved
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">Chat ID: {sub.chatId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleNotify(sub)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer ${
                            sub.notifyEnabled && !sub.blocked
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {sub.notifyEnabled && !sub.blocked ? "Receiving Notices" : "Off / Silent"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-white font-bold">
                          {sub.msgType === "all" ? "📜 PDF Daily compiled bulletins" : "🔔 Individual instant alerts"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Layout: {sub.templates?.[0] ? sub.templates[0] : "System default Layout Template"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-3 text-xs font-mono">
                        {sub.approved === false && (
                          <button
                            onClick={async () => {
                              const updatedSub = { ...sub, approved: true };
                              await onSaveSubscriber(updatedSub);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold font-mono text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg active:scale-[0.97] transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => setEditingSub(sub)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleBlockUnblock(sub)}
                          className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            sub.blocked 
                              ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50" 
                              : "bg-rose-950/40 text-rose-400 hover:bg-rose-900/40"
                          }`}
                        >
                          {sub.blocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                          {sub.blocked ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Grid Cards View */}
            <div className="block md:hidden p-4 space-y-4">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2 px-1">
                <button
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 hover:text-white"
                >
                  {selectedSubscribers.length === subscribers.length ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>Toggle All</span>
                </button>
                <span>Selected: {selectedSubscribers.length}</span>
              </div>

              {subscribers.map((sub) => (
                <div
                  key={sub.chatId}
                  className={`bg-slate-950 border border-slate-855 rounded-2xl p-4 space-y-3.5 relative overflow-hidden transition-all ${
                    sub.blocked ? "opacity-60 border-rose-950" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSelectOne(sub.chatId)}
                        className="text-slate-405 hover:text-white mr-1.5"
                      >
                        {selectedSubscribers.includes(sub.chatId) ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="font-bold text-slate-100">{sub.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Chat ID: {sub.chatId}</div>
                      </div>
                    </div>

                    {sub.approved === false ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        Approved
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-900 pt-3 flex flex-wrap gap-2 justify-between items-center text-xs font-mono text-slate-400">
                    <div className="space-y-1">
                      <div className="text-white font-semibold">
                        {sub.msgType === "all" ? "📜 PDF Bulletins" : "🔔 Instant Alerts"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Layout: {sub.templates?.[0] ? sub.templates[0] : "Default Layout Template"}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleNotify(sub)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                        sub.notifyEnabled && !sub.blocked
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {sub.notifyEnabled && !sub.blocked ? "Enabled" : "Silent"}
                    </button>
                  </div>

                  {/* Actions mobile panel */}
                  <div className="border-t border-slate-900 pt-3 flex gap-2 justify-end">
                    {sub.approved === false && (
                      <button
                        onClick={async () => {
                          const updatedSub = { ...sub, approved: true };
                          await onSaveSubscriber(updatedSub);
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-bold font-mono text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => setEditingSub(sub)}
                      className="px-3 py-1.5 bg-slate-900 text-slate-300 border border-slate-805 text-[10px] font-bold rounded-lg font-mono cursor-pointer"
                    >
                      Modify
                    </button>
                    <button
                      onClick={() => handleBlockUnblock(sub)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg font-mono cursor-pointer ${
                        sub.blocked
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/25"
                          : "bg-rose-950/60 text-rose-400 border border-rose-500/25"
                      }`}
                    >
                      {sub.blocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Editing Dialog Modal */}
      {editingSub && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSaveSubEdits} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h4 className="text-base font-bold text-white mb-1">Subscriber Settings Modification</h4>
              <p className="text-xs text-slate-400 font-mono">Target Chat Specs: {editingSub.chatId}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1.5">User Description / Name</label>
                <input
                  type="text"
                  required
                  value={editingSub.username}
                  onChange={(e) => setEditingSub({ ...editingSub, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1.5">Approval Status</label>
                <select
                  value={editingSub.approved === false ? "false" : "true"}
                  onChange={(e) => setEditingSub({ ...editingSub, approved: e.target.value === "true" })}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="true">Approved & Active (Deliver notifications)</option>
                  <option value="false">Pending Verification (Suppress notifications)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1.5">Notification Mode</label>
                <select
                  value={editingSub.msgType}
                  onChange={(e) => setEditingSub({ ...editingSub, msgType: e.target.value as "new" | "all" })}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="new">Individual alerts on newly discovered records only</option>
                  <option value="all">Daily Compiled full summary bulletins as PDF attachment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1.5">Template Layout Assigned</label>
                <select
                  value={editingSub.templates?.[0] || ""}
                  onChange={(e) => setEditingSub({ ...editingSub, templates: e.target.value ? [e.target.value] : [] })}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="">System default Message Layout Template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white py-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Save Config Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="bg-slate-800 hover:bg-slate-755 text-xs text-slate-300 px-4 py-3 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
