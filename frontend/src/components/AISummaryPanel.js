import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TerminalSquare, Star, Search, FolderOpen, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function AISummaryPanel({ data, onPin, pinnedSet }) {
  const summary = data?.summary;
  const isPinned = data?.session_id && pinnedSet?.has(data.session_id);
  
  const [displayedText, setDisplayedText] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedText, setExpandedText] = useState(null);

  useEffect(() => {
    if (!summary || summary.length === 0) return;
    setDisplayedText([]);
    setCurrentIndex(0);
    setExpandedText(null);
  }, [summary]);

  useEffect(() => {
    if (!summary || currentIndex >= summary.length) return;
    const timer = setTimeout(() => {
      setDisplayedText(prev => [...prev, summary[currentIndex]]);
      setCurrentIndex(prev => prev + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [currentIndex, summary]);

  const handleExpand = async () => {
    setIsExpanding(true);
    try {
      const res = await fetch(`${API}/summary/expand?session_id=${encodeURIComponent(data.session_id)}`);
      if (res.ok) {
        const json = await res.json();
        setExpandedText(json.expanded_summary);
      }
    } catch (e) {
      console.error(e);
      setExpandedText("⚠ Failed to load detailed insight.");
    } finally {
      setIsExpanding(false);
    }
  };

  // Generate Action Buttons based on parsed summary
  const actionButtons = [];
  if (summary && summary.length > 0) {
    const fullText = summary.join(" ");
    const fileMatches = fullText.match(/[A-Za-z0-9_-]+\.(py|js|ts|jsx|tsx|css|html)/g);
    if (fileMatches && fileMatches.length > 0) {
      const uniqueFiles = [...new Set(fileMatches)];
      actionButtons.push({
        label: `Open ${uniqueFiles[0]}`,
        icon: FolderOpen,
        action: () => alert(`Simulated opening of ${uniqueFiles[0]} in your editor...`)
      });
    }
    
    const nextStepText = summary[2] || "";
    if (nextStepText) {
       const cleanQuery = nextStepText.replace(/next:|next step:|try to|check/gi, "").trim();
       actionButtons.push({
         label: `Search Solution`,
         icon: Search,
         action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`, '_blank')
       });
    }
  }

  if (!summary) return null;

  return (
    <div className="glass-panel p-4 relative overflow-hidden flex flex-col mx-auto rounded-xl w-full h-full flex-1" style={{ maxWidth: '600px' }}>
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-main to-secondary-main" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="text-secondary-main animate-pulse-slow" size={24} />
          <h2 className="text-xl font-bold neon-text">AI Context Synthesis</h2>
        </div>
        
        {data?.session_id && (
          <button 
            onClick={() => onPin && onPin(data)}
            disabled={isPinned}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm ${
              isPinned 
                ? 'bg-primary-main/20 border-primary-main/50 text-primary-main' 
                : 'bg-dark-bg border-dark-border hover:border-gray-500 text-gray-400'
            }`}
          >
            <Star size={14} className={isPinned ? 'fill-primary-main' : ''} />
            {isPinned ? 'Pinned' : 'Pin Insight'}
          </button>
        )}
      </div>

      <div className="space-y-4 flex-1">
        <AnimatePresence>
          {displayedText.map((text, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="flex items-start gap-3 p-3 rounded-lg bg-dark-bg/50 border border-primary-main/20 hover:border-primary-main/50 transition-colors"
            >
              <TerminalSquare size={20} className="text-primary-glow mt-0.5 shrink-0" />
              <p className="text-gray-200 leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {currentIndex < summary.length && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2 items-center text-secondary-main text-sm mt-4"
          >
            <div className="w-2 h-2 rounded-full bg-secondary-main animate-ping" />
            Generating insight...
          </motion.div>
        )}
      </div>
      
      {/* Interaction Layer (Appears after typing is done) */}
      {currentIndex >= summary.length && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 pt-6 border-t border-dark-border border-dashed"
        >
          {!expandedText ? (
            <button 
              onClick={handleExpand} 
              disabled={isExpanding}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-secondary-main/40 text-secondary-main hover:bg-secondary-main/10 transition-colors flex items-center gap-2"
            >
              {isExpanding ? (
                <><div className="w-3 h-3 border-2 border-secondary-main/30 border-t-secondary-main rounded-full animate-spin" /> Deep Analyzing...</>
              ) : (
                <><AlertCircle size={16} /> Explain Deeper</>
              )}
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-dark-surface/80 p-4 rounded-xl border-l-2 border-secondary-main text-sm text-gray-300 leading-relaxed mb-4 max-h-48 overflow-y-auto hide-scrollbar"
            >
              <div className="text-xs uppercase tracking-wider text-secondary-main font-bold mb-2 sticky top-0 bg-dark-surface/80 pb-1">Detailed Reasoning</div>
              {expandedText}
            </motion.div>
          )}

          <div className="flex gap-3 mt-4 flex-wrap">
            {actionButtons.map((btn, idx) => {
              const Icon = btn.icon;
              return (
                <button 
                  key={idx} 
                  onClick={btn.action}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border hover:border-gray-500 hover:bg-gray-800 transition-all text-xs text-gray-300"
                >
                  <Icon size={14} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
