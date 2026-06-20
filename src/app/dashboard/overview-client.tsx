"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  UserPlus, 
  Ticket, 
  Ban, 
  VolumeX, 
  Target, 
  MessageSquare, 
  BrainCircuit
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

// Mock data for charts until we aggregate it
const activityData = [
  { name: "Mon", joins: 12, leaves: 2, tickets: 5 },
  { name: "Tue", joins: 19, leaves: 3, tickets: 8 },
  { name: "Wed", joins: 15, leaves: 1, tickets: 4 },
  { name: "Thu", joins: 22, leaves: 4, tickets: 12 },
  { name: "Fri", joins: 30, leaves: 2, tickets: 15 },
  { name: "Sat", joins: 45, leaves: 5, tickets: 20 },
  { name: "Sun", joins: 38, leaves: 3, tickets: 18 },
];

const StatCard = ({ title, value, icon: Icon, trend, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white/5 border border-white/5 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-colors"
  >
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-xl text-purple-400">
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </motion.div>
);

export default function DashboardOverviewClient({ initialStats }: { initialStats: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-gray-400 text-sm mt-1">Live data synced from MongoDB.</p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Members" value={initialStats.totalMembers} icon={Users} delay={0.1} />
        <StatCard title="New Joins (24h)" value={initialStats.newJoins} icon={UserPlus} delay={0.2} />
        <StatCard title="Active Tickets" value={initialStats.activeTickets} icon={Ticket} delay={0.3} />
        <StatCard title="Hot Leads" value={initialStats.hotLeads} icon={Target} delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="lg:col-span-2 bg-white/5 border border-white/5 backdrop-blur-xl p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Server Growth & Activity</h3>
            <select className="bg-black/50 border border-white/10 text-sm rounded-lg px-3 py-1.5 text-gray-300 outline-none focus:ring-2 focus:ring-purple-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorJoins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111116', borderColor: '#ffffff10', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="joins" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorJoins)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Secondary Stats */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="bg-white/5 border border-white/5 backdrop-blur-xl p-6 rounded-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">AI Activity</h3>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-400">
                <BrainCircuit size={16} />
                <span className="text-sm">Questions Answered</span>
              </div>
              <span className="text-white font-bold">{initialStats.aiAnswered || 0}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mb-4">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <MessageSquare size={16} />
                <span className="text-sm">Needs Human</span>
              </div>
              <span className="text-yellow-400 font-bold">{initialStats.aiNeedsHuman || 0}</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="bg-white/5 border border-white/5 backdrop-blur-xl p-6 rounded-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">Moderation</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Ban size={16} /></div>
                  <span className="text-sm text-gray-300">Bans Active</span>
                </div>
                <span className="font-bold text-white">{initialStats.activeBans || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><VolumeX size={16} /></div>
                  <span className="text-sm text-gray-300">Active Timeouts</span>
                </div>
                <span className="font-bold text-white">{initialStats.activeTimeouts || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
