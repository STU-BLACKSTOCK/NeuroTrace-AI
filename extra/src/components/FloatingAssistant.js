import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm observing your neural trace. How can I assist your workflow today?" }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    
    // Simulate AI thinking and replying
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: "I've noted that in your context. My visual nodes are still processing the deeper implications, but I'm here when you need me." 
      }]);
    }, 1500);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary-main text-white shadow-lg shadow-primary-main/40"
            >
              <div className="absolute inset-0 rounded-full bg-primary-main animate-ping opacity-30" />
              <MessageSquare size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute bottom-0 right-0 w-80 h-96 glass-panel flex flex-col shadow-2xl shadow-black overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-surface/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary-main animate-pulse" />
                  <span className="font-semibold text-gray-200">AI Core Assistant</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 hide-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary-main text-white rounded-tr-none' 
                        : 'bg-dark-surface border border-dark-border text-gray-300 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-3 bg-dark-surface/90 border-t border-dark-border">
                <form onSubmit={handleSend} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your session..."
                    className="w-full bg-dark-bg border border-dark-border rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-primary-main transition-colors"
                  />
                  <button type="submit" className="absolute right-2 top-1.5 p-1 text-primary-main hover:text-primary-glow transition-colors">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
