"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Ticket, 
  Search, 
  Filter, 
  MoreVertical,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Tag
} from "lucide-react";

type TicketData = {
  id: string;
  userId: string;
  category: string;
  priority: string;
  status: string;
  claimedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function TicketsClient({ 
  initialTickets,
  stats
}: { 
  initialTickets: TicketData[];
  stats: {
    open: number;
    inProgress: number;
    resolvedToday: number;
    avgResponseMins: number;
  }
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = initialTickets.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch(priority.toLowerCase()) {
      case "urgent": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "high": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "medium": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "low": return "text-green-400 bg-green-400/10 border-green-400/20";
      default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case "open": return "text-green-400";
      case "in progress": return "text-yellow-400";
      case "escalated": return "text-red-400";
      case "closed": return "text-gray-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Ticket className="text-purple-500" size={32} />
            Tickets Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Manage active support tickets, assign staff, and monitor SLA times.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2">
            <Filter size={16} />
            Filter Tickets
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Open Tickets", value: stats.open.toString(), icon: AlertCircle, color: "text-red-400" },
          { label: "In Progress", value: stats.inProgress.toString(), icon: Clock, color: "text-yellow-400" },
          { label: "Resolved Today", value: stats.resolvedToday.toString(), icon: CheckCircle2, color: "text-green-400" },
          { label: "Avg Response", value: `${stats.avgResponseMins}m`, icon: MessageSquare, color: "text-purple-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-[#111116] border border-white/5 relative overflow-hidden group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{stat.value}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity ${stat.color}`} />
          </motion.div>
        ))}
      </div>

      {/* Tickets List */}
      <div className="rounded-2xl bg-[#111116] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search ticket ID, user, or category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Ticket ID</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Priority</th>
                <th className="p-4 font-medium">Assignee</th>
                <th className="p-4 font-medium text-right">Time Elapsed</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No tickets found.
                  </td>
                </tr>
              ) : filteredTickets.map((ticket) => {
                const elapsedMins = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
                const timeStr = elapsedMins < 60 ? `${elapsedMins} mins` : `${Math.floor(elapsedMins/60)} hours`;
                
                return (
                  <motion.tr 
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{ticket.id.split('-')[0]}...</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <User size={12} /> {ticket.userId}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-300 font-medium">{ticket.category}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status).replace('text-', 'bg-')}`} />
                        <span className={`text-sm capitalize ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {ticket.claimedBy ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-purple-900/50 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">
                              {ticket.claimedBy.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-300">{ticket.claimedBy}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-400 text-right whitespace-nowrap">
                      {timeStr} ago
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical size={18} />
                      </button>
                    </td>
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
