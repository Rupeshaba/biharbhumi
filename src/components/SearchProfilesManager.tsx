import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Sliders, MapPin, Search, Grid, Eye, Check, Sparkles, HelpCircle, X } from "lucide-react";

interface SearchProfilesManagerProps {
  profiles: any[];
  onSaveProfile: (profile: any) => Promise<any>;
}

export default function SearchProfilesManager({ profiles, onSaveProfile }: SearchProfilesManagerProps) {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form properties
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [districtId, setDistrictId] = useState("21"); // Khagaria
  const [sroId, setSroId] = useState("2100"); // Alauli
  const [circleId, setCircleId] = useState("262");
  const [villageId, setVillageId] = useState("20751");
  const [dateFrom, setDateFrom] = useState("01/01/2026");

  const [activeInstructionModal, setActiveInstructionModal] = useState(false);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name) return;

    setLoading(true);
    const data = {
      id,
      name,
      district_id: districtId,
      sro_id: sroId,
      circle_id: circleId,
      village_id: villageId,
      date_from: dateFrom
    };

    try {
      await onSaveProfile(data);
      setId("");
      setName("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Upper informational banner card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-full font-bold uppercase tracking-wider">
                Geographic Presets
              </span>
              <button
                onClick={() => setActiveInstructionModal(true)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="SRO Guides"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400 shrink-0" />
              सर्च प्रोफाइल सूची (SRO Profiles)
            </h3>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
              Define SRO, circle, and village parameters to target scraper query bounds.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-emerald-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Search Profile
          </button>
        </div>

        {/* Create Profile Form Drawer */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              onSubmit={handleCreateProfile}
              className="p-6 bg-slate-950/60 rounded-2xl border border-slate-805 space-y-5 overflow-hidden"
            >
              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>नया भौगोलिक नियम प्रपत्र (Configure coordinates rules)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">
                    Profile ID Code (Alphanumeric, no spaces)
                  </label>
                  <input
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="e.g. khagaria_alauli_east"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-widest block">
                    Descriptive Name (विवरण नाम)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Simraha Circle Ward 4 boundary tracker"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-4 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-1.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">District ID (जिला कोड)</label>
                  <input
                    type="text"
                    required
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white text-center font-mono focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">SRO Code (अनुबंध कोड)</label>
                  <input
                    type="text"
                    required
                    value={sroId}
                    onChange={(e) => setSroId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white text-center font-mono focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Circle Code (अंचल कोड)</label>
                  <input
                    type="text"
                    required
                    value={circleId}
                    onChange={(e) => setCircleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white text-center font-mono focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Village Code (मौजा कोड)</label>
                  <input
                    type="text"
                    required
                    value={villageId}
                    onChange={(e) => setVillageId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white text-center font-mono focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Date From (दिनांक से)</label>
                  <input
                    type="text"
                    required
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-white text-center font-mono focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white py-3 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Register Geographic Rule Profile
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

      {/* Profiles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Simraha Built-In Default Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300 shadow-xl relative overflow-hidden group"
        >
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          
          <div>
            <div className="flex justify-between items-start mb-4 pl-1.5">
              <span className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                <MapPin className="w-5 h-5" />
              </span>
              <span className="text-[9px] font-extrabold font-mono tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full uppercase">
                Active Default
              </span>
            </div>
            <h4 className="text-white text-base font-bold pl-1.5">Simraha Village Center</h4>
            <p className="text-slate-400 text-xs mt-1.5 pl-1.5 leading-relaxed">
              Bihar land registry queries targeting Simraha rural boundaries.
            </p>
          </div>

          <div className="mt-6 border-t border-slate-800/80 pt-4 pl-1.5 grid grid-cols-2 gap-y-2.5 text-[11px] font-mono text-slate-400">
            <span>District (जिला): <span className="text-white font-bold">21</span></span>
            <span>Circle (अंचल): <span className="text-white font-bold">262</span></span>
            <span>SRO ID: <span className="text-white font-bold">2100</span></span>
            <span>Village (मौजा): <span className="text-white font-bold">20751</span></span>
            <span className="col-span-2 mt-1 px-2.5 py-1 bg-slate-950/60 border border-slate-855 rounded-xl text-center">
              Date (दिनांक से): <span className="text-emerald-400 font-bold">01/01/2026</span>
            </span>
          </div>
        </motion.div>

        {/* Custom Scraped Profiles */}
        {profiles.map((p, index) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.05 }}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300 shadow-xl relative overflow-hidden group"
          >
            {/* Accent decoration */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />

            <div>
              <div className="flex justify-between items-start mb-4 pl-1.5">
                <span className="p-2.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wider">
                  ID: {p.id}
                </span>
              </div>
              <h4 className="text-white text-base font-bold pl-1.5">{p.name}</h4>
              <p className="text-slate-400 text-xs mt-1.5 pl-1.5 leading-relaxed">
                Custom query bounds configured for secondary bihar targets.
              </p>
            </div>

            <div className="mt-6 border-t border-slate-800/80 pt-4 pl-1.5 grid grid-cols-2 gap-y-2.5 text-[11px] font-mono text-slate-400">
              <span>District (जिला): <span className="text-white font-bold">{p.district_id}</span></span>
              <span>Circle (अंचल): <span className="text-white font-bold">{p.circle_id}</span></span>
              <span>SRO ID: <span className="text-white font-bold">{p.sro_id}</span></span>
              <span>Village (मौजा): <span className="text-white font-bold">{p.village_id}</span></span>
              <span className="col-span-2 mt-1 px-2.5 py-1 bg-slate-950 border border-slate-855 rounded-xl text-center">
                Date (दिनांक से): <span className="text-cyan-400 font-bold">{p.date_from}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SRO guides help modal */}
      {activeInstructionModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => setActiveInstructionModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-md font-bold text-white mb-2 font-mono flex items-center gap-1.5">
              💡 भौगोलिक कोड गाइड (Geographic Codes Guide)
            </h4>
            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed max-h-[400px] overflow-y-auto pr-2 mt-4 font-sans">
              <p>बिहार संपत्ति निबंधन (Bihar Bhumi Registry) पोर्टल पर प्रत्येक क्षेत्र के विशिष्ट कोड होते हैं:</p>
              <ul className="list-disc pl-5 space-y-2 font-mono text-[11px] text-slate-400">
                <li><span className="text-white">District Code (21)</span>: खगड़िया प्रमंडल</li>
                <li><span className="text-white">SRO ID (2100)</span>: अलौली निबंधन कार्यालय</li>
                <li><span className="text-white">Circle ID (262)</span>: अचल अलौली</li>
                <li><span className="text-white">Village ID (20751)</span>: सिमराहा ग्राम</li>
              </ul>
              <p className="text-slate-400">यदि आप अपनी स्व-निर्मित अनुमंडलीय सीमा खोजना चाहते हैं तो बिहार भूमि रजिस्ट्री पोर्टल के स्रोत कोड (Inspect Element) से जिला/अंचल कोड प्राप्त कर यहाँ नया प्रोफाइल तैयार कर सकते हैं।</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
