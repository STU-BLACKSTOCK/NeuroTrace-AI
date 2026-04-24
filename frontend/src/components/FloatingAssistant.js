import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, CheckCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function FloatingAssistant() {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const res = await fetch(`${API}/launch-widget`, { method: 'POST' });
      if (res.ok) {
        setLaunched(true);
        setTimeout(() => setLaunched(false), 3000);
      }
    } catch (e) {
      console.error("Failed to launch widget:", e);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {launched && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-dark-surface border border-primary-main/50 text-gray-200 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm"
          >
            <CheckCircle size={16} className="text-green-400" />
            Pop-out launched!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLaunch}
        disabled={isLaunching}
        className="relative flex items-center gap-3 px-5 py-3 rounded-full bg-dark-surface border border-dark-border hover:border-primary-main hover:bg-dark-bg transition-colors shadow-lg group"
      >
        {isLaunching ? (
           <div className="w-5 h-5 border-2 border-primary-main/30 border-t-primary-main rounded-full animate-spin" />
        ) : (
           <ExternalLink size={20} className="text-primary-main group-hover:text-primary-glow transition-colors" />
        )}
        <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">
          Pop-out Mode
        </span>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-primary-main opacity-0 group-hover:opacity-10 blur-md transition-opacity -z-10" />
      </motion.button>
    </div>
  );
}
