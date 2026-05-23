import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Plus, FileSpreadsheet, Check, CheckCircle2, Star, Settings, FileCode, Landmark, Map, User, Sparkles } from "lucide-react";
import { MsgTemplate } from "../types";

interface TemplateManagerProps {
  templates: MsgTemplate[];
  onSaveTemplate: (tpl: MsgTemplate) => Promise<any>;
}

export default function TemplateManager({ templates, onSaveTemplate }: TemplateManagerProps) {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // New Template properties
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [activeTemplate, setActiveTemplate] = useState<MsgTemplate | null>(null);

  // Structured Placeholders categorised for cleaner user experience
  const placeholderGroups = [
    {
      label: "🏛️ निबंधन कार्यालय विवरण / Portal Meta",
      items: [
        { key: "{{sro_name}}", label: "SRO Name" },
        { key: "{{reg_date}}", label: "Reg Date" },
        { key: "{{deed_type}}", label: "Deed Type" },
        { key: "{{token_no}}", label: "Token No" },
        { key: "{{docket_no}}", label: "Docket No" },
        { key: "{{serial_no}}", label: "Serial No" }
      ]
    },
    {
      label: "👤 पार्टी विवरण / Sellers & Buyers",
      items: [
        { key: "{{executant}}", label: "Seller Name" },
        { key: "{{executant_addr}}", label: "Seller Addr" },
        { key: "{{claimant}}", label: "Buyer Name" },
        { key: "{{claimant_addr}}", label: "Buyer Addr" }
      ]
    },
    {
      label: "🗺️ संपत्ति स्थान व पैमाना / Land coordinates",
      items: [
        { key: "{{khata_no}}", label: "Khata खाता" },
        { key: "{{plot_no}}", label: "Plot खेसरा" },
        { key: "{{extent_dec}}", label: "Acreage रकबा" },
        { key: "{{land_type}}", label: "Class प्रकार" },
        { key: "{{chargeable_value}}", label: "Value मूल्य" }
      ]
    },
    {
      label: "🧱 चहारदीवारी सीमाएं / Boundaries",
      items: [
        { key: "{{b_east}}", label: "East (पूरब)" },
        { key: "{{b_west}}", label: "West (पश्चिम)" },
        { key: "{{b_north}}", label: "North (उत्तर)" },
        { key: "{{b_south}}", label: "South (दक्षिण)" }
      ]
    }
  ];

  const handleInsertPlaceholder = (key: string, isEditing: boolean) => {
    if (isEditing && activeTemplate) {
      setActiveTemplate({
        ...activeTemplate,
        content: activeTemplate.content + " " + key
      });
    } else {
      setContent(content + " " + key);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !content) return;

    setLoading(true);
    const data: MsgTemplate = { id, name, content, isDefault };
    try {
      await onSaveTemplate(data);
      setId("");
      setName("");
      setContent("");
      setIsDefault(false);
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;

    setLoading(true);
    try {
      await onSaveTemplate(activeTemplate);
      setActiveTemplate(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Upper overview card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />
              वार्ता प्रारूप (Template Engine)
            </h3>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
              Customize transaction layouts dispatched to Telegram. Double-bracket markers like <span className="font-mono text-emerald-400">{"{{executant}}"}</span> translate dynamically on transmission.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setActiveTemplate(null);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4.5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-cyan-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Build Custom Layout
          </button>
        </div>

        {/* Template form builder */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              onSubmit={handleAddTemplate}
              className="p-6 bg-slate-950/60 rounded-2xl border border-slate-805 space-y-4 overflow-hidden"
            >
              <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>नया टेलीग्राम प्रारूप तैयार करें (Configure new Messaging format)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">
                    Layout Unique Code (Alphanumeric)
                  </label>
                  <input
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="e.g. alauli_hindi_special"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">
                    Descriptive Layout Name (नाम)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alauli Hindi Special Template"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Categorised variables insert toolbar */}
              <div className="bg-slate-950 border border-slate-855 rounded-2xl p-4.5 space-y-4">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  पिन करने के लिए डेटा चॉइस चुनें / Click items to inject in editor:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {placeholderGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <div className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.items.map((it) => (
                          <button
                            key={it.key}
                            type="button"
                            onClick={() => handleInsertPlaceholder(it.key, false)}
                            className="text-[9px] font-mono font-semibold px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-805 text-slate-300 rounded-md hover:text-cyan-400 transition-colors cursor-pointer"
                          >
                            {it.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">
                  Body Structure (Standard Telegram Markdown format supported)
                </label>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`🔔 *नया भूमि पंजीकरण रिपोर्ट – {{reg_date}}* \n\n👤 *विक्रेता (Seller)* : {{executant}} \n👤 *क्रेता (Buyer)* : {{claimant}} \n📍 *रकबा (Acreage)* : {{extent_dec}} Decimal \n💳 *मूल्य* : ₹{{chargeable_value}}`}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-3 text-xs text-white font-mono leading-relaxed focus:border-cyan-500 focus:outline-[#06b6d4]/10 transition-all"
                />
              </div>

              <div className="flex items-center space-x-2.5 text-xs py-1 select-none">
                <input
                  type="checkbox"
                  id="defaultTplChk"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500/30 bg-slate-900 border-slate-700 h-4.5 w-4.5 cursor-pointer"
                />
                <label htmlFor="defaultTplChk" className="text-slate-300 font-medium cursor-pointer">
                  Make this the standard default messaging layout format. (डिफ़ॉल्ट सेट करें)
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Register Layout Format
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 px-4 py-3 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main interactive grid editor panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: available templates */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-5 lg:col-span-1 space-y-4 shadow-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-40 pl-1">
            Registered Templates
          </h4>

          {templates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              Only primary Default template is available in configurations.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTemplate(t);
                    setShowForm(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between group transition-all text-xs cursor-pointer ${
                    activeTemplate?.id === t.id
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-inner"
                      : "bg-slate-950 border-slate-855 hover:border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-200 group-hover:text-white truncate">
                      {t.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{t.id}</div>
                  </div>
                  {t.isDefault && (
                    <span className="flex items-center gap-1.5 text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 border border-amber-500/20 rounded-full font-mono font-bold shrink-0">
                      <Star className="w-2.5 h-2.5 fill-amber-400" /> Default
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: editing workspace */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
          <AnimatePresence mode="wait">
            {activeTemplate ? (
              <motion.form
                key={activeTemplate.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleUpdateTemplate}
                className="space-y-5"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
                  <div>
                    <h4 className="text-base font-bold text-white">प्रारूप संपादक (Active Layout Workspace)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Modifying layout blueprints: <span className="text-cyan-400 font-mono font-semibold">{activeTemplate.name}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTemplate(null)}
                    className="text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    Clear Workspace
                  </button>
                </div>

                {/* Categorised placeholders insert toolbar for edit */}
                <div className="bg-slate-950 border border-slate-855 rounded-2xl p-4 space-y-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Click items to insert at cursor point:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {placeholderGroups.map((group) => (
                      <div key={group.label} className="space-y-1.5">
                        <div className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                          {group.label}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.items.map((it) => (
                            <button
                              key={it.key}
                              type="button"
                              onClick={() => handleInsertPlaceholder(it.key, true)}
                              className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-805 text-slate-300 rounded hover:text-cyan-400 transition-colors cursor-pointer"
                            >
                              {it.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <textarea
                    rows={10}
                    value={activeTemplate.content}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, content: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-805 rounded-2xl px-4 py-3.5 text-xs text-white font-mono leading-relaxed focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/25"
                  />
                </div>

                <div className="flex items-center space-x-2.5 text-xs select-none">
                  <input
                    type="checkbox"
                    id="editDefaultTpl"
                    checked={activeTemplate.isDefault}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, isDefault: e.target.checked })}
                    className="rounded text-cyan-600 focus:ring-cyan-500/30 bg-slate-900 border-slate-700 h-4.5 w-4.5 cursor-pointer"
                  />
                  <label htmlFor="editDefaultTpl" className="text-slate-300 font-medium cursor-pointer">
                    Apply this template layout as active default configuration for new subscriber notifications.
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white rounded-xl active:scale-[0.98] transition-all shadow-md cursor-pointer"
                  >
                    Update Layout Template
                  </button>
                </div>
              </motion.form>
            ) : (
              <div className="py-24 text-center select-none opacity-80">
                <FileSpreadsheet className="w-14 h-14 text-slate-700 mx-auto mb-4 animate-bounce" />
                <p className="text-slate-400 text-sm font-semibold">Select layout from listing panel to launch editor</p>
                <p className="text-slate-500 text-xs mt-1">(संपादक खोलने के लिए बाईं सूची से टेंपलेट का चयन करें)</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
