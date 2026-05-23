import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Play, RefreshCw, Calendar, MapPin, Scale, Users, 
  HelpCircle, CheckCircle2, AlertTriangle, AlertCircle, Eye, ChevronRight, Sparkles, Filter 
} from "lucide-react";
import { RegistryRecord } from "../types";

interface AdminRecordsProps {
  records: RegistryRecord[];
  onTriggerScrape: (profileId?: string, isInstant?: boolean) => Promise<any>;
  searchProfiles: any[];
}

export default function AdminRecords({ records, onTriggerScrape, searchProfiles }: AdminRecordsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [isInstant, setIsInstant] = useState(false);
  const [outcome, setOutcome] = useState<any | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RegistryRecord | null>(null);

  const handleRunTrigger = async () => {
    setTriggering(true);
    setOutcome(null);
    try {
      const res = await onTriggerScrape(selectedProfile || undefined, isInstant);
      setOutcome(res);
    } catch (err: any) {
      setOutcome({ success: false, error: err.message || "Scraper dispatch failed" });
    } finally {
      setTriggering(false);
    }
  };

  const filtered = records.filter(rec => {
    const term = searchTerm.toLowerCase();
    return (
      (rec.token_no?.toLowerCase().includes(term)) ||
      (rec.docket_no?.toLowerCase().includes(term)) ||
      (rec.executant?.toLowerCase().includes(term)) ||
      (rec.claimant?.toLowerCase().includes(term)) ||
      (rec.village?.toLowerCase().includes(term)) ||
      (rec.khata_no?.toLowerCase().includes(term)) ||
      (rec.plot_no?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* Upper Action/Trigger panel */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-2">
          <span className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-full font-bold uppercase tracking-wider">
            Portal Dispatcher
          </span>
        </div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-emerald-400 shrink-0" />
          मौजा स्क्रैपर (Run Scraper)
        </h3>
        <p className="text-slate-400 text-xs mt-1 mb-5 max-w-2xl leading-relaxed">
          Launch Captcha-decoded search queries to fetch real-time registry notices.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-350 uppercase tracking-widest block">
              सर्च मौजा (Coords Profile)
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="block w-full rounded-2xl border border-slate-805 bg-slate-950 px-4 py-3 text-white text-xs focus:border-emerald-500 focus:outline-none transition-all cursor-pointer font-medium"
            >
              <option value="">Simraha default coords</option>
              {searchProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center h-[46px] space-x-2.5 bg-slate-950 border border-slate-805 rounded-2xl px-4 py-3 select-none">
            <input
              type="checkbox"
              id="instantSearchChk"
              checked={isInstant}
              onChange={(e) => setIsInstant(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-705 h-4 w-4 cursor-pointer bg-slate-900"
            />
            <label htmlFor="instantSearchChk" className="text-xs text-slate-300 cursor-pointer font-bold">
              Instant PDF Dispatch 📜
            </label>
          </div>

          <div>
            <button
              onClick={handleRunTrigger}
              disabled={triggering}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-emerald-500/20 text-xs font-semibold rounded-2xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer hover:shadow-lg hover:shadow-emerald-950/20"
            >
              {triggering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Scraping Portal...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Scraper Now
                </>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {outcome && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 20 }}
              exit={{ height: 0, opacity: 0 }}
              className={`p-4.5 rounded-2xl border flex items-start gap-3 text-xs overflow-hidden ${
                outcome.success 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" 
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              }`}
            >
              {outcome.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <span className="font-bold block text-emerald-200">सफलतापूर्वक पूर्ण (Completed)</span>
                    <span className="mt-1 block leading-relaxed max-w-xl opacity-90 font-mono text-[11px]">
                      listings: {outcome.total || 0} | stored: <span className="underline font-bold text-white">+{outcome.count || 0} newly discovered</span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 animate-pulse" />
                  <div>
                    <span className="font-bold block text-rose-200">त्रुटि (Error)</span>
                    <span className="mt-1 block opacity-90 leading-relaxed font-mono text-[11px]">{outcome.error || "Captcha recognition timed out or portal servers offline."}</span>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Database Viewer panel */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-805 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              भूमि निबंधन डाटाबेस (Registry Records)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Verified Bihar Government property transaction logs</p>
          </div>

          <div className="relative w-full md:w-80 shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="खोजें (Filter by executant, plot...)"
              className="block w-full rounded-2xl border border-slate-805 bg-slate-950 pl-10 pr-4 py-2.5 text-white text-xs focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-550 select-none">
            <Filter className="w-12 h-12 text-slate-800 mx-auto mb-3" />
            <p className="text-slate-450 text-sm font-semibold">No registry records match search keyword</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-805 text-slate-300">
                <thead className="bg-slate-950/40 text-[10px] font-mono uppercase tracking-wider text-slate-450">
                  <tr>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Token / Date</th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Executant (Seller)</th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Claimant (Buyer)</th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Land Coord / Class</th>
                    <th scope="col" className="px-6 py-4.5 text-left font-semibold">Value (मूल्य)</th>
                    <th scope="col" className="px-6 py-4.5 text-right font-semibold">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-805 text-xs font-medium">
                  {filtered.map((rec) => (
                    <tr key={rec.token_no} className="hover:bg-slate-850/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-white font-mono">{rec.token_no}</div>
                        <div className="text-[10px] text-slate-450 flex items-center gap-1 mt-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          {rec.reg_date}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[190px] truncate">
                        <div className="font-bold text-slate-200">{rec.executant}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{rec.executant_addr}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[190px] truncate">
                        <div className="font-bold text-slate-200">{rec.claimant}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{rec.claimant_addr}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[11px] text-emerald-400 font-bold font-mono">
                          खाता: {rec.khata_no} | खेसरा: {rec.plot_no}
                        </div>
                        <div className="text-[10px] text-slate-450 flex items-center gap-1 mt-1 font-mono">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          {rec.extent_dec} Decimal ({rec.village})
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-100 font-mono text-[13px]">
                        ₹{Number(rec.chargeable_value).toLocaleString('en-IN') || rec.chargeable_value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-855 rounded-xl text-[10px] text-emerald-400 font-mono font-bold hover:text-emerald-300 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect (देखें)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Adaptive Grid Cards layout */}
            <div className="block md:hidden p-4 space-y-4">
              {filtered.map((rec) => (
                <div 
                  key={rec.token_no} 
                  className="bg-slate-950 border border-slate-855 rounded-2xl p-4 space-y-3.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-extrabold font-mono text-white tracking-wider">Token ID: {rec.token_no}</span>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        {rec.reg_date}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      ₹{Number(rec.chargeable_value).toLocaleString('en-IN') || rec.chargeable_value}
                    </span>
                  </div>

                  {/* Micro-parties description grid */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-855 space-y-1.5 leading-relaxed">
                    <div className="text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider mr-1">seller (बेचनेवाला):</span>
                      <span className="text-slate-200 font-semibold">{rec.executant}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider mr-1">buyer (खरीदार):</span>
                      <span className="text-slate-200 font-semibold">{rec.claimant}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="space-y-0.5">
                      <div className="text-emerald-400 font-bold"> खाता: {rec.khata_no} | खेसरा: {rec.plot_no} </div>
                      <div className="text-slate-500 text-[10px]"> {rec.village} • {rec.extent_dec} Dec </div>
                    </div>

                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="px-4 py-2 bg-slate-900 border border-slate-805 hover:border-slate-700 text-slate-350 text-[11px] font-bold rounded-xl active:scale-[0.97] transition-all cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Record info sidebar sheet modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex justify-end backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-805 p-6 overflow-y-auto relative h-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-805">
              <div>
                <h4 className="text-md font-bold text-white font-mono flex items-center gap-1.5">
                  🔍 भूमि डाटा रिकॉर्ड (Token {selectedRecord.token_no})
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  विवरण सूची (Complete portal verified registry metadata inspector)
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-452 hover:text-white text-xs border border-slate-805 px-3 py-1.5 rounded-xl hover:border-slate-700 bg-slate-950 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-6 mt-6">
              
              {/* SRO registry identities Card */}
              <div className="bg-slate-950 border border-slate-855 rounded-2xl p-4 space-y-3.5 font-mono text-[11px]">
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">SRO Circle:</span>
                  <span className="text-white text-right font-bold">{selectedRecord.sro_name}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Reg Year / Date:</span>
                  <span className="text-white text-right font-bold">{selectedRecord.reg_year} | {selectedRecord.reg_date}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Docket / Serial:</span>
                  <span className="text-white text-right font-bold">DOCKET: {selectedRecord.docket_no} | SERIAL: {selectedRecord.serial_no}</span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500">Deed / Procedure:</span>
                  <span className="text-white text-right font-bold truncate">{selectedRecord.deed_type} ({selectedRecord.procedure})</span>
                </div>
              </div>

              {/* pricing summary */}
              <div className="p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scale className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-200">Declared Value (मूल्य):</span>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  ₹{Number(selectedRecord.chargeable_value).toLocaleString('en-IN') || selectedRecord.chargeable_value}
                </span>
              </div>

              {/* parties details */}
              <div className="space-y-4">
                <div className="p-4.5 rounded-2xl border border-slate-805 bg-slate-950/40 space-y-3.5">
                  <h5 className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Executant (Seller / बेचने वाला)
                  </h5>
                  <div className="text-xs font-bold text-white leading-relaxed">{selectedRecord.executant}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed font-mono">{selectedRecord.executant_addr}</div>
                </div>

                <div className="p-4.5 rounded-2xl border border-slate-805 bg-slate-950/40 space-y-3.5">
                  <h5 className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" /> Claimant (Buyer / खरीदने वाला)
                  </h5>
                  <div className="text-xs font-bold text-white leading-relaxed">{selectedRecord.claimant}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed font-mono">{selectedRecord.claimant_addr}</div>
                </div>
              </div>

              {/* Land Coordinates */}
              <div className="p-4.5 rounded-2xl border border-slate-805 bg-slate-950/40 space-y-3.5">
                <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">
                  Land Specifications (रकबा विवरण)
                </h5>
                <div className="grid grid-cols-2 gap-y-3 text-xs font-mono">
                  <span className="text-slate-400">Khata No (खाता):</span>
                  <span className="text-white text-right font-bold">{selectedRecord.khata_no}</span>
                  
                  <span className="text-slate-400">Khesra / Plot (खेसरा):</span>
                  <span className="text-white text-right font-bold">{selectedRecord.plot_no}</span>

                  <span className="text-slate-400">Acreage (रकबा):</span>
                  <span className="text-white text-right font-bold">{selectedRecord.extent_dec} Decimal</span>

                  <span className="text-slate-400">Land Type / Class:</span>
                  <span className="text-white text-right font-bold text-emerald-400">{selectedRecord.land_type}</span>

                  <span className="text-slate-400">Rate (MVR):</span>
                  <span className="text-white text-right font-bold">₹{selectedRecord.mvr_rate}</span>

                  <span className="text-slate-400">Area Category:</span>
                  <span className="text-white text-right font-bold">{selectedRecord.urban_rural === "R" ? "Rural" : "Urban"}</span>
                </div>
              </div>

              {/* chahardiwari boundary table */}
              <div className="p-4.5 rounded-2xl border border-slate-805 bg-slate-950/40 space-y-3.5">
                <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">
                  Boundaries (चहारदीवारी सीमाएं)
                </h5>
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3.5 bg-slate-950 border border-slate-855 rounded-xl">
                    <div className="text-slate-500 mb-0.5">East (पूरब)</div>
                    <div className="text-slate-200 font-bold truncate">{selectedRecord.b_east || 'NIJ'}</div>
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-855 rounded-xl">
                    <div className="text-slate-500 mb-0.5">West (पश्चिम)</div>
                    <div className="text-slate-200 font-bold truncate">{selectedRecord.b_west || 'NIJ'}</div>
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-855 rounded-xl">
                    <div className="text-slate-500 mb-0.5">North (उत्तर)</div>
                    <div className="text-slate-200 font-bold truncate">{selectedRecord.b_north || 'NIJ'}</div>
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-855 rounded-xl">
                    <div className="text-slate-500 mb-0.5">South (दक्षिण)</div>
                    <div className="text-slate-200 font-bold truncate">{selectedRecord.b_south || 'NIJ'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
