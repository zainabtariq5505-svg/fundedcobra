const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'stats', title: 'Server Statistics', desc: 'Detailed server metrics and growth data.', icon: 'BarChart3' },
  { path: 'members', title: 'Members', desc: 'View and manage all server members.', icon: 'Users' },
  { path: 'transcripts', title: 'Transcripts', desc: 'View saved ticket transcripts.', icon: 'MessageSquare' },
  { path: 'leads', title: 'Leads / CRM', desc: 'Manage hot leads, sales stages, and follow-ups.', icon: 'Target' },
  { path: 'ai-logs', title: 'AI Logs', desc: 'Monitor bot AI interactions and confidence scores.', icon: 'BrainCircuit' },
  { path: 'knowledge', title: 'Knowledge Base', desc: 'Manage AI knowledge chunks and FAQs.', icon: 'BookOpen' },
  { path: 'giveaways', title: 'Giveaways', desc: 'Create and manage server giveaways.', icon: 'Gift' },
  { path: 'announcements', title: 'Announcements', desc: 'Draft and schedule server announcements.', icon: 'Megaphone' },
  { path: 'social', title: 'Social Notifier', desc: 'Manage YouTube, Twitter, and other social alerts.', icon: 'Share2' },
  { path: 'welcome', title: 'Welcome / Auto Role', desc: 'Configure welcome messages and automatic roles.', icon: 'UserPlus' },
  { path: 'boosters', title: 'Booster System', desc: 'Manage server booster perks and announcements.', icon: 'Zap' },
  { path: 'invites', title: 'Invite Tracker', desc: 'Track valid, left, and fake invites.', icon: 'LinkIcon' },
  { path: 'xp', title: 'XP / Activity', desc: 'Manage leveling system and user activity.', icon: 'Trophy' },
  { path: 'fun', title: 'Fun Commands', desc: 'Configure economy, games, and fun modules.', icon: 'Gamepad2' },
  { path: 'attendance', title: 'Attendance', desc: 'View staff attendance and work hours.', icon: 'CalendarDays' },
  { path: 'performance', title: 'Staff Performance', desc: 'Analyze ticket metrics and conversions.', icon: 'LineChart' },
  { path: 'audit', title: 'Audit Logs', desc: 'Review all sensitive admin dashboard actions.', icon: 'FileText' },
  { path: 'settings', title: 'Bot Settings', desc: 'Configure core bot prefixes, roles, and channels.', icon: 'Settings' },
  { path: 'brand', title: 'Brand Assets', desc: 'Manage server banners, logos, and dashboard theme.', icon: 'Palette' },
  { path: 'admins', title: 'Admin Users', desc: 'Manage dashboard access and staff accounts.', icon: 'UserCog' },
  { path: 'security', title: 'Security', desc: 'View login logs and manage security settings.', icon: 'Lock' }
];

const template = (title, desc, icon) => `"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ${icon}, Search, Filter, Settings2, MoreVertical, Plus } from "lucide-react";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <${icon} className="text-purple-500" size={32} />
            ${title}
          </h1>
          <p className="text-gray-400 mt-1">${desc}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
            <Settings2 size={16} /> Configure
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] flex items-center gap-2">
            <Plus size={16} /> Create New
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Active", value: "24", trend: "+12% this week" },
          { label: "Pending Review", value: "8", trend: "-2% this week" },
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
              placeholder="Search database..." 
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
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Name / Title</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Last Updated</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[1, 2, 3, 4, 5].map((item) => (
                <motion.tr 
                  key={item}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <td className="p-4 text-sm font-medium text-gray-300">#00{item}</td>
                  <td className="p-4 text-sm text-white">System Record {item}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-green-400 bg-green-400/10 border border-green-400/20">
                      Active
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">2 hours ago</td>
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
}`;

const baseDir = path.join(__dirname, 'src', 'app', 'dashboard');

pages.forEach(p => {
  const dir = path.join(baseDir, p.path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'page.tsx'), template(p.title, p.desc, p.icon));
  console.log(`Created premium ${p.path}/page.tsx`);
});
