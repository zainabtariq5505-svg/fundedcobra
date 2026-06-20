"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Search, Filter, Settings2, MoreVertical, Plus } from "lucide-react";

type GameStats = {
  id: string;
  guildId: string;
  userId: string;
  game: string;
  wins: number;
  losses: number;
  updatedAt: Date;
};

type CobraCoins = { id: string; guildId: string; userId: string; balance: number; };

export default function FunClient({ games, coins, stats }: { games: GameStats[]; coins: CobraCoins[]; stats: { totalPlayers: number; totalGames: number; totalCoins: number } }) {
  const [searchTerm, setSearchTerm] = useState("");
  const coinMap = new Map(coins.map(c => [c.userId, c]));
  const filtered = games.filter(g => g.userId.toLowerCase().includes(searchTerm.toLowerCase()) || g.game.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Gamepad2 className="text-purple-500" size={32} />
            Fun Commands
          </h1>
          <p className="text-gray-400 mt-1">Configure economy, games, and fun modules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2"><Settings2 size={16} /> Configure</button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] flex items-center gap-2"><Plus size={16} /> Create New</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Players", value: stats.totalPlayers.toString(), trend: "Game stats" },
          { label: "Game Types", value: stats.totalGames.toString(), trend: "Unique games" },
          { label: "Total Coins", value: stats.totalCoins.toString(), trend: "Economy" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[#111116] border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
            <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-bold text-white">{stat.value}</span><span className="text-xs text-purple-400">{stat.trend}</span></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl" />
          </motion.div>
        ))}
      </div>
      <div className="rounded-2xl bg-[#111116] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search by user or game..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-sm" />
          </div>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><Filter size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">User ID</th>
              <th className="p-4 font-medium">Game</th>
              <th className="p-4 font-medium">Wins</th>
              <th className="p-4 font-medium">Losses</th>
              <th className="p-4 font-medium">Coins</th>
              <th className="p-4 font-medium"></th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No game stats found.</td></tr>
              ) : filtered.map((item) => {
                const coin = coinMap.get(item.userId);
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-medium text-white">{item.userId}</td>
                    <td className="p-4 text-sm text-gray-300">{item.game}</td>
                    <td className="p-4 text-sm text-green-400">{item.wins}</td>
                    <td className="p-4 text-sm text-red-400">{item.losses}</td>
                    <td className="p-4 text-sm text-gray-300">{coin ? coin.balance : 0}</td>
                    <td className="p-4 text-right"><button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><MoreVertical size={18} /></button></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
