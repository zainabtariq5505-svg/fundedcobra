"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Search, Filter, Settings2, MoreVertical, Plus } from "lucide-react";

type Watchlist = { id: string; guildId: string; userId: string; reason: string; createdAt: Date; };
type Blacklist = { id: string; guildId: string; userId: string; reason: string; createdAt: Date; };
type ModerationCase = { id: string; guildId: string; userId: string; moderatorId: string; actionType: string; reason: string | null; status: string; createdAt: Date; };

export default function SecurityClient({ watchlist, blacklist, cases, stats }: { watchlist: Watchlist[]; blacklist: Blacklist[]; cases: ModerationCase[]; stats: { totalWatchlist: number; totalBlacklist: number; totalCases: number } }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<'watchlist' | 'blacklist' | 'cases'>('watchlist');
  const filteredWatchlist = watchlist.filter(w => w.userId.toLowerCase().includes(searchTerm.toLowerCase()) || w.reason.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredBlacklist = blacklist.filter(b => b.userId.toLowerCase().includes(searchTerm.toLowerCase()) || b.reason.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCases = cases.filter(c => c.userId.toLowerCase().includes(searchTerm.toLowerCase()) || c.actionType.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Lock className="text-purple-500" size={32} />
            Security
          </h1>
          <p className="text-gray-400 mt-1">View login logs and manage security settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"><Settings2 size={16} /> Configure</button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] flex items-center gap-2"><Plus size={16} /> Create New</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Watchlisted", value: stats.totalWatchlist.toString(), trend: "Monitored" },
          { label: "Blacklisted", value: stats.totalBlacklist.toString(), trend: "Banned" },
          { label: "Mod Cases", value: stats.totalCases.toString(), trend: "Actions taken" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[#111116] border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
            <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-bold text-white">{stat.value}</span><span className="text-xs text-purple-400">{stat.trend}</span></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl" />
          </motion.div>
        ))}
      </div>
      <div className="flex gap-4 mb-2">
        <button onClick={() => setTab('watchlist')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'watchlist' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Watchlist</button>
        <button onClick={() => setTab('blacklist')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'blacklist' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Blacklist</button>
        <button onClick={() => setTab('cases')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'cases' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Cases</button>
      </div>
      <div className="rounded-2xl bg-[#111116] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-sm" />
          </div>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><Filter size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              {tab === 'watchlist' ? (
                <><th className="p-4 font-medium">User ID</th><th className="p-4 font-medium">Reason</th><th className="p-4 font-medium">Guild</th><th className="p-4 font-medium">Created</th><th className="p-4 font-medium"></th></>
              ) : tab === 'blacklist' ? (
                <><th className="p-4 font-medium">User ID</th><th className="p-4 font-medium">Reason</th><th className="p-4 font-medium">Guild</th><th className="p-4 font-medium">Created</th><th className="p-4 font-medium"></th></>
              ) : (
                <><th className="p-4 font-medium">User ID</th><th className="p-4 font-medium">Action</th><th className="p-4 font-medium">Reason</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Created</th><th className="p-4 font-medium"></th></>
              )}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {tab === 'watchlist' ? (
                filteredWatchlist.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No watchlist entries found.</td></tr>
                ) : filteredWatchlist.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-medium text-white">{item.userId}</td>
                    <td className="p-4 text-sm text-gray-300 max-w-xs truncate">{item.reason}</td>
                    <td className="p-4 text-sm text-gray-400">{item.guildId}</td>
                    <td className="p-4 text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right"><button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><MoreVertical size={18} /></button></td>
                  </motion.tr>
                ))
              ) : tab === 'blacklist' ? (
                filteredBlacklist.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No blacklist entries found.</td></tr>
                ) : filteredBlacklist.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-medium text-white">{item.userId}</td>
                    <td className="p-4 text-sm text-gray-300 max-w-xs truncate">{item.reason}</td>
                    <td className="p-4 text-sm text-gray-400">{item.guildId}</td>
                    <td className="p-4 text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right"><button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><MoreVertical size={18} /></button></td>
                  </motion.tr>
                ))
              ) : (
                filteredCases.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No moderation cases found.</td></tr>
                ) : filteredCases.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-medium text-white">{item.userId}</td>
                    <td className="p-4 text-sm text-gray-300">{item.actionType}</td>
                    <td className="p-4 text-sm text-gray-300 max-w-xs truncate">{item.reason || "—"}</td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${item.status === 'active' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>{item.status}</span></td>
                    <td className="p-4 text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right"><button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><MoreVertical size={18} /></button></td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
