"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Search, Filter, Settings2, MoreVertical, Plus } from "lucide-react";

type TranscriptData = {
  id: string;
  ticketId: string;
  userId: string;
  closedBy: string;
  messageCount: number;
  aiSummary: string | null;
  htmlUrl: string | null;
  createdAt: Date;
};

export default function TranscriptsClient({
  initialTranscripts,
  stats
}: {
  initialTranscripts: TranscriptData[];
  stats: { total: number; aiSummarized: number }
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTranscripts = initialTranscripts.filter(t => 
    t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <MessageSquare className="text-purple-500" size={32} />
            Transcripts
          </h1>
          <p className="text-gray-400 mt-1">View saved ticket transcripts.</p>
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
          { label: "Total Transcripts", value: stats.total.toString(), trend: "Saved permanently" },
          { label: "AI Summarized", value: stats.aiSummarized.toString(), trend: "Auto-analyzed" },
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
              placeholder="Search by ticket ID or user ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
            />
          </div>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
            <Filter size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Ticket ID</th>
                <th className="p-4 font-medium">User ID</th>
                <th className="p-4 font-medium">Closed By</th>
                <th className="p-4 font-medium">Messages</th>
                <th className="p-4 font-medium">Saved At</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTranscripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No transcripts found.
                  </td>
                </tr>
              ) : filteredTranscripts.map((t) => (
                <motion.tr 
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => t.htmlUrl && window.open(t.htmlUrl, '_blank')}
                >
                  <td className="p-4 text-sm font-medium text-white">{t.ticketId.split('-')[0]}...</td>
                  <td className="p-4 text-sm text-gray-300">{t.userId}</td>
                  <td className="p-4 text-sm text-gray-400">{t.closedBy}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20">
                      {t.messageCount} messages
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
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
