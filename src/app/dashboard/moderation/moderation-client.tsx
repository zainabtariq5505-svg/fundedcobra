"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Ban, VolumeX, AlertTriangle, Search, ShieldBan, UserMinus, Shield } from "lucide-react";

type Tab = "bans" | "mutes" | "kicks" | "warnings";

export default function ModerationCenterClient({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("bans");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "bans", label: "Bans", icon: Ban },
    { id: "mutes", label: "Mutes / Timeouts", icon: VolumeX },
    { id: "kicks", label: "Kicks", icon: UserMinus },
    { id: "warnings", label: "Warnings", icon: AlertTriangle },
  ] as const;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="text-purple-500" /> Moderation Center
        </h1>
        <p className="text-gray-400 text-sm mt-1">Live MongoDB Data - Manage server punishments.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-xl overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search users or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Table Content */}
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#111116] border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-xs uppercase tracking-wider text-gray-400 font-medium">
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Moderator ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeTab === "bans" && initialData.bans.length > 0 ? initialData.bans.map((ban: any) => (
                <tr key={ban.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <ShieldBan size={14} />
                      </div>
                      <div className="font-medium text-gray-200">{ban.userId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{ban.reason || "No reason"}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">{ban.moderatorId}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{formatDate(ban.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium">
                      {ban.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-purple-600 hover:text-white text-gray-300 rounded-lg transition-colors border border-white/5 hover:border-purple-500">
                      Unban
                    </button>
                  </td>
                </tr>
              )) : activeTab === "bans" && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No active bans found in database.</td>
                </tr>
              )}
              
              {activeTab === "mutes" && initialData.mutes.length > 0 ? initialData.mutes.map((mute: any) => (
                <tr key={mute.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <VolumeX size={14} />
                      </div>
                      <div className="font-medium text-gray-200">{mute.userId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{mute.reason || "No reason"}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">{mute.moderatorId}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{formatDate(mute.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-xs font-medium">
                      {mute.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-orange-600 hover:text-white text-gray-300 rounded-lg transition-colors border border-white/5 hover:border-orange-500">
                      Remove
                    </button>
                  </td>
                </tr>
              )) : activeTab === "mutes" && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No active mutes found in database.</td>
                </tr>
              )}

              {(activeTab === "kicks" || activeTab === "warnings") && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Shield size={32} className="mb-3 opacity-50" />
                      <p className="text-sm">No {activeTab} records found in database.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
