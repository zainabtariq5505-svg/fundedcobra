"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, Filter, Settings2, MoreVertical, Plus } from "lucide-react";

type Member = {
  id: string;
  userId: string;
  guildId: string;
  joinDate: Date;
  roles: string | null;
  xpLevel: number;
  inviteCount: number;
  ticketsOpened: number;
  warnings: number;
  lastActive: Date | null;
};

export default function MembersClient({ 
  initialMembers, 
  stats 
}: { 
  initialMembers: Member[];
  stats: { total: number; newThisWeek: number }
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = initialMembers.filter(m => 
    m.userId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.roles && m.roles.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="text-purple-500" size={32} />
            Members
          </h1>
          <p className="text-gray-400 mt-1">View and manage all server members.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
            <Settings2 size={16} /> Configure
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: stats.total.toString(), trend: "Server-wide" },
          { label: "New This Week", value: stats.newThisWeek.toString(), trend: "Recent joins" },
          { label: "System Health", value: "99.9%", trend: "Optimal" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[#111116] border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors"
          >
            <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-purple-400">{stat.trend}</span>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl" />
          </motion.div>
        ))}
      </div>

      {/* Main Table Area */}
      <div className="rounded-2xl bg-[#111116] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by User ID or Roles..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">User ID</th>
                <th className="p-4 font-medium">Joined At</th>
                <th className="p-4 font-medium">Level / XP</th>
                <th className="p-4 font-medium">Warnings</th>
                <th className="p-4 font-medium">Tickets</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No members found. (Try interacting with the bot in Discord first!)
                  </td>
                </tr>
              ) : filteredMembers.map((member) => (
                <motion.tr 
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <td className="p-4 text-sm font-medium text-white">{member.userId}</td>
                  <td className="p-4 text-sm text-gray-400">{new Date(member.joinDate).toLocaleDateString()}</td>
                  <td className="p-4 text-sm text-gray-300">Level {member.xpLevel}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${member.warnings > 0 ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                      {member.warnings} Warnings
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{member.ticketsOpened} open</td>
                  <td className="p-4 text-right">
                    <button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
