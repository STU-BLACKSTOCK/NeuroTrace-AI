import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, Star, Clock } from 'lucide-react';

export default function SavedSummaries({ pinned, setPinned }) {
  const [expandedId, setExpandedId] = useState(null);
  
  const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  if (!pinned || pinned.length === 0) {
    return (
      <div className="glass-panel p-8 text-center border-dashed border-dark-border">
        <Star className="mx-auto text-gray-600 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Saved Summaries</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Pin insights from the AI Summary Panel to build a repository of your session learnings.
        </p>
      </div>
    );
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/pin-summary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPinned(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete summary:", e);
    }
  };

  const fmtTime = (iso) => {
    try { 
      return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); 
    } catch { 
      return iso; 
    }
  };

  return (
    <div className="space-y-4">
      {pinned.map((item) => {
        const isExpanded = expandedId === item.id;
        // Assume first element of summary array is the title
        const summaryArr = Array.isArray(item.summary) ? item.summary : [item.summary];
        const title = summaryArr[0] || "Pinned Summary";
        
        return (
          <motion.div
            key={item.id}
            layout
            className="glass-panel p-4 overflow-hidden border border-dark-border cursor-pointer transition-all hover:border-primary-main/30"
            onClick={() => setExpandedId(isExpanded ? null : item.id)}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={14} className="text-primary-main fill-primary-main" />
                  <span className="font-semibold text-gray-200 line-clamp-1">{title}</span>
                  {item.auto_generated && (
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ml-2 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      ⚡ Auto Saved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                  <Clock size={12} />
                  {fmtTime(item.timestamp)}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
                <div className="text-gray-500">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-dark-border space-y-2">
                    {summaryArr.map((line, idx) => (
                      <p key={idx} className="text-sm text-gray-300 leading-relaxed flex gap-2">
                        <span className="text-primary-main/50 mt-1">•</span>
                        <span>{line}</span>
                      </p>
                    ))}
                    <div className="mt-3 text-xs text-gray-600 font-mono">
                      Session ID: {item.session_id}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
