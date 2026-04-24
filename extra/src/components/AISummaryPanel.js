import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TerminalSquare } from 'lucide-react';

export default function AISummaryPanel({ summary }) {
  const [displayedText, setDisplayedText] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!summary || summary.length === 0) return;
    
    // Reset when new summary arrives
    setDisplayedText([]);
    setCurrentIndex(0);
  }, [summary]);

  useEffect(() => {
    if (!summary || currentIndex >= summary.length) return;

    const timer = setTimeout(() => {
      setDisplayedText(prev => [...prev, summary[currentIndex]]);
      setCurrentIndex(prev => prev + 1);
    }, 800); // delay between insights

    return () => clearTimeout(timer);
  }, [currentIndex, summary]);

  if (!summary) return null;

  return (
    <div className="glass-panel p-6 mb-8 relative overflow-hidden">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-main to-secondary-main" />
      
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="text-secondary-main animate-pulse-slow" size={24} />
        <h2 className="text-xl font-bold neon-text">AI Context Synthesis</h2>
      </div>

      <div className="space-y-4">
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
        
        {currentIndex < (summary?.length || 0) && (
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
    </div>
  );
}
