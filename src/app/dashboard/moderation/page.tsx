"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Ban, 
  VolumeX, 
  MessageSquareWarning, 
  CheckCircle2,
  Clock,
  MoreVertical,
  Gavel,
  ShieldHalf,
  AlertTriangle,
  BrainCircuit
} from "lucide-react";

// Mock data for initial UI
const recentActions = [
  { id: 1, type: "BAN", user: "ToxicPlayer#1234", mod: "AdminSarah", reason: "Repeated slurs in general chat", date: "2 mins ago", active: true },
  { id: 2, type: "MUTE", user: "Spammer99", mod: "ModMike", reason: "Spamming invite links", duration: "24 hours", date: "15 mins ago", active: true },
  { id: 3, type: "WARN", user: "NewGuy_22", mod: "AutoMod", reason: "Caps bypass", date: "1 hour ago", active: false },
  { id: 4, type: "KICK", user: "TrollMaster", mod: "AdminSarah", reason: "Trolling voice channels", date: "3 hours ago", active: false },
];

export default function ModerationCenterPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getActionColor = (type: string) => {
    switch(type) {
      case "BAN": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "MUTE": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "WARN": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "KICK": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getActionIcon = (type: string) => {
    switch(type) {
      case "BAN": return <Ban size={16} />;
      case "MUTE": return <VolumeX size={16} />;
      case "WARN": return <AlertTriangle size={16} />;
      case "KICK": return <MessageSquareWarning size={16} />;
      default: return <ShieldHalf size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-purple-500" size={32} />
            Moderation Center
          </h1>
          <p className="text-gray-400 mt-1">Manage server punishments, view logs, and configure AutoMod settings.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
            <Filter size={16} />
            Filters
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] flex items-center gap-2">
            <Gavel size={16} />
            New Action
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Bans", value: "142", trend: "+5 today", color: "text-red-400" },
          { label: "Active Mutes", value: "38", trend: "-2 today", color: "text-orange-400" },
          { label: "Warnings Given", value: "856", trend: "+12 today", color: "text-yellow-400" },
          { label: "AutoMod Actions", value: "2,401", trend: "+145 today", color: "text-purple-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-current opacity-5 blur-3xl rounded-full ${stat.color} group-hover:opacity-10 transition-opacity`} />
            <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{stat.value}</span>
              <span className={`text-xs ${stat.color}`}>{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
            {['all', 'bans', 'mutes', 'warns'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeTab === tab 
                  ? "bg-purple-600 text-white shadow-lg" 
                  : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by username, ID, or moderator..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          <div className="rounded-2xl bg-[#111116] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Action</th>
                    <th className="p-4 font-medium">Reason</th>
                    <th className="p-4 font-medium">Moderator</th>
                    <th className="p-4 font-medium text-right">Time</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentActions.map((action) => (
                    <motion.tr 
                      key={action.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700" />
                          <span className="font-medium text-gray-200">{action.user}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(action.type)}`}>
                          {getActionIcon(action.type)}
                          {action.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-400 max-w-[200px] truncate">
                        {action.reason}
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        {action.mod}
                      </td>
                      <td className="p-4 text-sm text-gray-400 text-right whitespace-nowrap">
                        {action.date}
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-gray-500 hover:text-white transition-colors">
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

        {/* Right Column - AutoMod & Settings */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111116] border border-white/5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <BrainCircuit className="text-purple-400" size={20} />
              AutoMod Status
            </h3>
            
            <div className="space-y-4">
              {[
                { name: "Anti-Spam", status: "Active", risk: "Strict" },
                { name: "Anti-Raid", status: "Active", risk: "Extreme" },
                { name: "Word Filter", status: "Active", risk: "Custom" },
                { name: "Link Filter", status: "Warning Only", risk: "Moderate" },
              ].map((module, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{module.name}</p>
                    <p className="text-xs text-gray-500">{module.risk}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer ${module.status.includes('Active') ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${module.status.includes('Active') ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors">
              Configure Rules
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20">
            <h3 className="text-lg font-semibold text-purple-100 flex items-center gap-2 mb-2">
              <ShieldHalf size={20} />
              Security Score
            </h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-white">98</span>
              <span className="text-gray-400 mb-1">/ 100</span>
            </div>
            <p className="text-sm text-purple-200/70">
              Your server is highly protected. AutoMod is actively blocking malicious links and spam.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}