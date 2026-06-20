"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  BarChart3, 
  ShieldAlert, 
  Users, 
  Ticket, 
  MessageSquare, 
  Target, 
  BrainCircuit, 
  BookOpen, 
  Gift, 
  Megaphone, 
  Share2, 
  UserPlus, 
  Zap, 
  Link as LinkIcon, 
  Trophy, 
  Gamepad2, 
  Clock, 
  CalendarDays, 
  LineChart, 
  FileText, 
  Settings, 
  Palette, 
  UserCog, 
  Lock,
  LogOut,
  Menu,
  X
} from "lucide-react";

const sidebarLinks = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Server Statistics", href: "/dashboard/stats", icon: BarChart3 },
  { name: "Moderation Center", href: "/dashboard/moderation", icon: ShieldAlert },
  { name: "Members", href: "/dashboard/members", icon: Users },
  { name: "Tickets", href: "/dashboard/tickets", icon: Ticket },
  { name: "Transcripts", href: "/dashboard/transcripts", icon: MessageSquare },
  { name: "Leads / CRM", href: "/dashboard/leads", icon: Target },
  { name: "AI Logs", href: "/dashboard/ai-logs", icon: BrainCircuit },
  { name: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen },
  { name: "Giveaways", href: "/dashboard/giveaways", icon: Gift },
  { name: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { name: "Social Notifier", href: "/dashboard/social", icon: Share2 },
  { name: "Welcome / Auto Role", href: "/dashboard/welcome", icon: UserPlus },
  { name: "Booster System", href: "/dashboard/boosters", icon: Zap },
  { name: "Invite Tracker", href: "/dashboard/invites", icon: LinkIcon },
  { name: "XP / Activity", href: "/dashboard/xp", icon: Trophy },
  { name: "Fun Commands", href: "/dashboard/fun", icon: Gamepad2 },
  { name: "Employee EOD", href: "/dashboard/eod", icon: Clock },
  { name: "Attendance", href: "/dashboard/attendance", icon: CalendarDays },
  { name: "Staff Performance", href: "/dashboard/performance", icon: LineChart },
  { name: "Audit Logs", href: "/dashboard/audit", icon: FileText },
  { name: "Bot Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Brand Assets", href: "/dashboard/brand", icon: Palette },
  { name: "Admin Users", href: "/dashboard/admins", icon: UserCog },
  { name: "Security", href: "/dashboard/security", icon: Lock },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed lg:relative z-50 w-72 h-screen bg-[#111116] border-r border-white/5 flex flex-col shrink-0"
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5 justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">FundedCobra</span>
          </div>
          <button 
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <div className="space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? "bg-purple-600/10 text-purple-400 font-medium" 
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-purple-500" : "text-gray-500 group-hover:text-gray-400"} />
                  <span className="text-sm">{link.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-8 bg-purple-500 rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-300 font-bold border border-purple-500/20">
              {session?.user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{session?.user?.name || "Admin"}</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.role || "Owner"}</p>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-medium text-gray-300">
              {sidebarLinks.find(l => l.href === pathname)?.name || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-400">Bot Online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Animated background glows for main content */}
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
