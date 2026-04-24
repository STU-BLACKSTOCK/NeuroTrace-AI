import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X, Minus, BrainCircuit } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function FloatingAssistant() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/summary`);
      if (res.ok) setSummaryData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isWidgetOpen && !isMinimized && !summaryData) {
      fetchSummary();
    }
  }, [isWidgetOpen, isMinimized]);

  const handlePopOut = () => {
    setIsWidgetOpen(true);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsWidgetOpen(false);
  };

  const handleIconClick = () => {
    setIsMinimized(false);
    setIsWidgetOpen(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {!isWidgetOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePopOut}
            className="relative flex items-center gap-3 px-5 py-3 rounded-full bg-dark-surface border border-dark-border hover:border-primary-main hover:bg-dark-bg transition-colors shadow-lg group"
          >
            <ExternalLink size={20} className="text-primary-main group-hover:text-primary-glow transition-colors" />
            <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">
              Pop-out Mode
            </span>
            <div className="absolute inset-0 rounded-full bg-primary-main opacity-0 group-hover:opacity-10 blur-md transition-opacity -z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWidgetOpen && isMinimized && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleIconClick}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="bg-primary-main text-white shadow-lg shadow-primary-main/40"
          >
            <div className="absolute inset-0 rounded-full bg-primary-main animate-ping opacity-30" />
            <span className="text-2xl">🧠</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWidgetOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-0 right-0 w-80 h-96 bg-dark-surface/90 backdrop-blur-md border border-dark-border flex flex-col shadow-2xl shadow-black overflow-hidden rounded-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-dark-border bg-dark-surface">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-primary-main" />
                <span className="font-semibold text-sm text-gray-200">Mini Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleMinimize} className="text-gray-400 hover:text-white transition-colors p-1">
                  <Minus size={16} />
                </button>
                <button onClick={handleClose} className="text-gray-400 hover:text-red-400 transition-colors p-1">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 overflow-y-auto hide-scrollbar flex flex-col">
              {loading ? (
                 <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-3">
                    <div className="w-6 h-6 border-2 border-primary-main/30 border-t-primary-main rounded-full animate-spin" />
                    <span className="text-sm">Fetching context...</span>
                 </div>
              ) : summaryData ? (
                 <ul className="space-y-3 text-sm text-gray-300">
                    {summaryData.summary.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary-main mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                 </ul>
              ) : (
                 <div className="flex flex-col items-center justify-center flex-1 text-gray-500 text-sm">
                    No context available.
                 </div>
              )}
            </div>
            
            <div className="p-3 border-t border-dark-border bg-dark-surface/50 text-center">
               <button onClick={fetchSummary} className="text-xs text-primary-main hover:text-primary-glow font-medium">
                  Refresh Summary
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
