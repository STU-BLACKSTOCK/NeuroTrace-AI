import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';

export default function LiveAIBrain({ isProcessing }) {
  return (
    <div className="relative w-full h-64 flex items-center justify-center overflow-hidden rounded-2xl glass-panel mb-8">
      {/* Background glow */}
      <motion.div
        className="absolute w-64 h-64 bg-primary-main/20 rounded-full blur-3xl"
        animate={{
          scale: isProcessing ? [1, 1.2, 1] : 1,
          opacity: isProcessing ? [0.5, 0.8, 0.5] : 0.3,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* AI Brain Icon */}
      <motion.div
        className="relative z-10 text-secondary-main"
        animate={{
          scale: isProcessing ? [1, 1.1, 1] : 1,
          filter: isProcessing ? ["drop-shadow(0 0 10px #22D3EE)", "drop-shadow(0 0 25px #22D3EE)", "drop-shadow(0 0 10px #22D3EE)"] : "drop-shadow(0 0 10px #7C3AED)",
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <BrainCircuit size={80} strokeWidth={1.5} />
      </motion.div>

      {/* Orbiting particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-secondary-main rounded-full"
          animate={{
            rotate: 360,
            x: [100, -100, 100],
            y: [-50, 50, -50],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.5,
          }}
          style={{ originX: 0.5, originY: 0.5 }}
        />
      ))}
      
      {/* Text Indicator */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <motion.span 
          className="text-sm tracking-widest text-primary-glow uppercase font-bold"
          animate={{ opacity: isProcessing ? [0.4, 1, 0.4] : 0.6 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {isProcessing ? "Synthesizing Context..." : "Neural Link Active"}
        </motion.span>
      </div>
    </div>
  );
}
