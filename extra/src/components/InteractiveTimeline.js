import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Code, Search, RefreshCw, Activity, ChevronRight } from 'lucide-react';

export default function InteractiveTimeline({ logs }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!logs || logs.length === 0) return null;

  const interpretLog = (log) => {
    try {
      const parsed = typeof log.details === 'string' && log.details.startsWith('{') ? JSON.parse(log.details) : null;
      const type = parsed?.type || log.type; 
      const title = parsed?.title || log.title;
      const file = parsed?.file || log.file;
      
      if (type === 'code' || log.action === 'file_modified' || log.action === 'file_edit') 
        return { Icon: Code, color: 'text-secondary-main', bg: 'bg-secondary-main/10', text: `Modified ${file || log.app}` };
      if (type === 'search' || log.action === 'browser_activity') 
        return { Icon: Search, color: 'text-primary-main', bg: 'bg-primary-main/10', text: `Searched: ${title || parsed?.text || log.details}` };
      if (log.action === 'app_switch') 
        return { Icon: RefreshCw, color: 'text-pink-400', bg: 'bg-pink-400/10', text: `Switched to ${log.app}` };
      
      return { Icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10', text: `${log.action} in ${log.app}` };
    } catch {
      return { Icon: Activity, color: 'text-gray-400', bg: 'bg-gray-400/10', text: `${log.action} in ${log.app}` };
    }
  };

  const fmtTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return iso; }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="text-secondary-main" size={24} />
        <h2 className="text-xl font-bold text-white">Event Stream</h2>
      </div>

      <div className="relative border-l border-dark-border ml-3 pl-6 space-y-6">
        <AnimatePresence>
          {logs.slice(-20).reverse().map((log, i) => {
            const { Icon, color, bg, text } = interpretLog(log);
            const isExpanded = expandedId === i;
            
            return (
              <motion.div
                key={`${log.timestamp}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="relative group cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : i)}
              >
                {/* Node on the line */}
                <div className={`absolute -left-[35px] top-1.5 w-5 h-5 rounded-full ${bg} border-2 border-dark-bg flex items-center justify-center transition-transform group-hover:scale-125`}>
                  <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
                </div>

                <div className={`p-4 rounded-xl transition-all duration-300 ${isExpanded ? 'bg-dark-surface border border-primary-main/30' : 'bg-transparent hover:bg-dark-surface/50'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${bg}`}>
                        <Icon className={color} size={18} />
                      </div>
                      <span className="text-gray-200 font-medium">{text}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 font-mono">{fmtTime(log.timestamp)}</span>
                      <ChevronRight size={16} className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 p-3 rounded-md bg-black/40 border border-dark-border font-mono text-xs text-gray-400 overflow-x-auto">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
