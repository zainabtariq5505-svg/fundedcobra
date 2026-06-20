"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Coffee, Play, CheckCircle2, ChevronRight, Send } from "lucide-react";

type WorkState = "not_started" | "working" | "on_lunch" | "clocked_out";

export default function EmployeeEODPage() {
  const [workState, setWorkState] = useState<WorkState>("not_started");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [eodForm, setEodForm] = useState({
    workDone: "",
    ticketsHandled: 0,
    leadsFollowedUp: 0,
    issuesSolved: "",
    blockers: "",
    tomorrowPlan: "",
    notes: ""
  });

  const handleAction = (newState: WorkState) => {
    setWorkState(newState);
    if (newState === "clocked_out") {
      setIsSubmitModalOpen(true);
    }
  };

  const handleSubmitEOD = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitModalOpen(false);
    // In real app, submit to Prisma / API
    console.log("Submitted EOD:", eodForm);
  };

  const getStatusColor = () => {
    switch(workState) {
      case "not_started": return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      case "working": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "on_lunch": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "clocked_out": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    }
  };

  const getStatusText = () => {
    switch(workState) {
      case "not_started": return "Ready to start";
      case "working": return "Currently Working";
      case "on_lunch": return "On Lunch Break";
      case "clocked_out": return "Clocked Out";
    }
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Employee EOD & Attendance</h1>
        <p className="text-gray-400 text-sm mt-1">Clock in, take lunch, and submit your End of Day report.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Status & Controls */}
        <div className="lg:col-span-8 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/5 backdrop-blur-xl p-8 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-lg font-medium text-gray-300 mb-2">Current Status</h2>
                <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${getStatusColor()} transition-colors`}>
                  {workState === "working" && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  {workState === "on_lunch" && <Coffee size={16} />}
                  <span className="font-bold">{getStatusText()}</span>
                </div>
                
                <div className="mt-6 space-y-1">
                  <p className="text-sm text-gray-500">Today's Date: <span className="text-gray-300">{new Date().toLocaleDateString()}</span></p>
                  <p className="text-sm text-gray-500">Logged Hours: <span className="text-white font-mono font-medium">00:00:00</span></p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                {workState === "not_started" && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction("working")}
                    className="col-span-2 py-4 px-8 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]"
                  >
                    <Play size={20} /> Clock In
                  </motion.button>
                )}

                {workState === "working" && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAction("on_lunch")}
                      className="py-4 px-6 rounded-xl bg-white/10 text-white hover:bg-white/15 border border-white/10 font-medium flex flex-col items-center justify-center gap-2 transition-all"
                    >
                      <Coffee size={24} className="text-orange-400" /> 
                      <span className="text-sm">Start Lunch</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAction("clocked_out")}
                      className="py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white font-medium flex flex-col items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(147,51,234,0.4)]"
                    >
                      <CheckCircle2 size={24} /> 
                      <span className="text-sm">Clock Out</span>
                    </motion.button>
                  </>
                )}

                {workState === "on_lunch" && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction("working")}
                    className="col-span-2 py-4 px-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)]"
                  >
                    <Play size={20} /> Back from Lunch
                  </motion.button>
                )}

                {workState === "clocked_out" && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="col-span-2 py-4 px-8 rounded-xl bg-white/10 text-white hover:bg-white/15 border border-white/10 font-bold flex items-center justify-center gap-2"
                  >
                    <Send size={20} className="text-purple-400" /> View / Submit EOD
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Timeline Activity */}
          <div className="bg-white/5 border border-white/5 backdrop-blur-xl p-6 rounded-2xl">
            <h3 className="text-lg font-medium text-white mb-6">Today's Timeline</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {/* Example Timeline item */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-[#111116] text-gray-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  <Clock size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-white/5 shadow">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-gray-300">Shift Started</div>
                    <time className="text-xs font-medium text-purple-400">09:00 AM</time>
                  </div>
                  <div className="text-sm text-gray-500">Clocked in via dashboard.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/5 backdrop-blur-xl p-6 rounded-2xl">
            <h3 className="text-lg font-medium text-white mb-4">Your Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-sm text-gray-400">Tickets Handled</span>
                <span className="font-bold text-white">12</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-sm text-gray-400">Leads Followed</span>
                <span className="font-bold text-white">5</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-sm text-gray-400">Avg Response Time</span>
                <span className="font-bold text-white">4m 12s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EOD Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSubmitModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111116] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Submit EOD Report</h3>
                <button onClick={() => setIsSubmitModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              
              <form onSubmit={handleSubmitEOD} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">What did you do today?</label>
                  <textarea 
                    required
                    value={eodForm.workDone}
                    onChange={(e) => setEodForm({...eodForm, workDone: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none h-24"
                    placeholder="Brief summary of your daily tasks..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tickets Handled</label>
                    <input 
                      type="number" 
                      value={eodForm.ticketsHandled}
                      onChange={(e) => setEodForm({...eodForm, ticketsHandled: parseInt(e.target.value)})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Leads Followed Up</label>
                    <input 
                      type="number" 
                      value={eodForm.leadsFollowedUp}
                      onChange={(e) => setEodForm({...eodForm, leadsFollowedUp: parseInt(e.target.value)})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Blockers / Issues</label>
                  <textarea 
                    value={eodForm.blockers}
                    onChange={(e) => setEodForm({...eodForm, blockers: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none h-20"
                    placeholder="Anything slowing you down?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plan for Tomorrow</label>
                  <textarea 
                    required
                    value={eodForm.tomorrowPlan}
                    onChange={(e) => setEodForm({...eodForm, tomorrowPlan: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none h-20"
                    placeholder="What will you focus on tomorrow?"
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-6 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}