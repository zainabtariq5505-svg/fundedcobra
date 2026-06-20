"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Search, Filter, Settings2, MoreVertical, Plus } from "lucide-react";

type GuildSettings = {
  id: string;
  guildId: string;
  prefix: string;
  updatedAt: Date;
};

type FeatureToggle = {
  id: string;
  guildId: string;
  moderation: boolean;
  tickets: boolean;
  welcome: boolean;
  xp: boolean;
  updatedAt: Date;
};

export default function SettingsClient({ guildSettings, toggles, stats }: { guildSettings: GuildSettings[]; toggles: FeatureToggle[]; stats: { totalGuilds: number; enabledFeatures: number } }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<'guilds' | 'features'>('guilds');
  const filteredGuilds = guildSettings.filter(g => g.guildId.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredToggles = toggles.filter(t => t.guildId.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Settings className="text-purple-500" size={32} />
            Bot Settings
          </h1>
          <p className="text-gray-400 mt-1">Configure core bot prefixes, roles, and channels.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"><Settings2 size={16} /> Configure</button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] flex items-center gap-2"><Plus size={16} /> Create New</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Guilds", value: stats.totalGuilds.toString(), trend: "Configured" },
          { label: "Moderation On", value: stats.enabledFeatures.toString(), trend: "Enabled" },
          { label: "Features", value: "14", trend: "Per guild" },
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
        <button onClick={() => setTab('guilds')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'guilds' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Guild Settings</button>
        <button onClick={() => setTab('features')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'features' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Feature Toggles</button>
      </div>
      <div className="rounded-2xl bg-[#111116] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search by guild ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-sm" />
          </div>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><Filter size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              {tab === 'guilds' ? (
                <><th className="p-4 font-medium">Guild ID</th><th className="p-4 font-medium">Prefix</th><th className="p-4 font-medium">Updated</th><th className="p-4 font-medium"></th></>
              ) : (
                <><th className="p-4 font-medium">Guild ID</th><th className="p-4 font-medium">Moderation</th><th className="p-4 font-medium">Tickets</th><th className="p-4 font-medium">Welcome</th><th className="p-4 font-medium">XP</th><th className="p-4 font-medium"></th></>
              )}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {tab === 'guilds' ? (
                filteredGuilds.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No guild settings found.</td></tr>
                ) : filteredGuilds.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-medium text-white">{item.guildId}</td>
                    <td className="p-4 text-sm text-gray-300">{item.prefix}</td>
                    <td className="p-4 text-sm text-gray-400">{new Date(item.updatedAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right"><button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><MoreVertical size={18} /></button></td>
                  </motion.tr>
                ))
              ) : (
                filteredToggles.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No feature toggles found.</td></tr>
                ) : filteredToggles.map((item) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-medium text-white">{item.guildId}</td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${item.moderation ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>{item.moderation ? "On" : "Off"}</span></td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${item.tickets ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>{item.tickets ? "On" : "Off"}</span></td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${item.welcome ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>{item.welcome ? "On" : "Off"}</span></td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${item.xp ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>{item.xp ? "On" : "Off"}</span></td>
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
