import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import { PlayCircle, BrainCircuit } from 'lucide-react';

import LiveAIBrain from './components/LiveAIBrain';
import AISummaryPanel from './components/AISummaryPanel';
import InteractiveTimeline from './components/InteractiveTimeline';
import FloatingAssistant from './components/FloatingAssistant';
import SmartErrorBoundary from './components/SmartErrorBoundary';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  
  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayLogs, setReplayLogs] = useState([]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    setSummary(null); // Clear old summary for typing effect restart
    
    // Simulate AI delay
    setTimeout(() => {
      // Generate mock summary based on logs
      let mockSummary = [];
      if (logs && logs.length > 0) {
        const apps = [...new Set(logs.map(l => l.app).filter(Boolean))];
        if (apps.length > 2) {
          mockSummary.push(`You switched frequently between ${apps.slice(0, 3).join(', ')} and other tasks.`);
        } else if (apps.length > 0) {
          mockSummary.push(`Your activity shows consistent focus in ${apps[0]}.`);
        } else {
          mockSummary.push("You resumed your previous work after an interruption.");
        }
        
        mockSummary.push("I detected a few context switches, but your overall neural trace is stable.");
        mockSummary.push("Recommendation: Consider minimizing background applications for deeper focus.");
      } else {
        mockSummary = [
          "You resumed your previous work after an interruption.",
          "Your activity shows consistent focus in the last few minutes.",
          "No major context switches detected. Keep up the good work!"
        ];
      }

      setSummary({ summary: mockSummary });
      setLoading(false);
    }, 2000); // 2 second delay to simulate AI response time
  }, [logs]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/logs?limit=40`);
      if (res.ok) setLogs(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // Handle Replay Session
  const handleReplay = () => {
    if (logs.length === 0 || isReplaying) return;
    setIsReplaying(true);
    setReplayLogs([]);
    
    // Sort logs chronologically for playback
    const sorted = [...logs].reverse();
    
    sorted.forEach((log, index) => {
      setTimeout(() => {
        setReplayLogs(prev => [...prev, log]);
        if (index === sorted.length - 1) {
          setTimeout(() => setIsReplaying(false), 2000);
        }
      }, index * 800); // 800ms delay between events
    });
  };

  const displayLogs = isReplaying ? replayLogs : logs;

  return (
    <SmartErrorBoundary>
      <div className="min-h-screen relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute top-0 left-0 w-full h-96 bg-primary-main/5 blur-[150px] -z-10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-main/5 blur-[150px] -z-10" />

        {/* Top Navbar */}
        <header className="glass-panel mx-6 mt-6 p-4 rounded-2xl flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-dark-bg rounded-xl border border-dark-border">
              <BrainCircuit className="text-secondary-main" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              NEUROTRACE<span className="text-primary-main">.AI</span>
            </h1>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleReplay}
              disabled={isReplaying || logs.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isReplaying 
                  ? 'bg-secondary-main/20 text-secondary-main border border-secondary-main/50' 
                  : 'bg-dark-surface border border-dark-border hover:border-secondary-main/50 text-gray-300'
              }`}
            >
              <PlayCircle size={18} className={isReplaying ? 'animate-pulse' : ''} />
              {isReplaying ? 'Replaying...' : 'Replay Session'}
            </button>

            <button 
              onClick={fetchSummary}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <BrainCircuit size={18} />
                  Extract Context
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 mb-8 border-red-500/30 text-red-400 text-center"
            >
              System Error: {error}
            </motion.div>
          )}

          <LiveAIBrain isProcessing={loading || isReplaying} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              {summary && <AISummaryPanel summary={summary?.summary} />}
              
              {!summary && !loading && (
                <div className="glass-panel p-8 text-center border-dashed border-dark-border mb-8">
                  <BrainCircuit className="mx-auto text-gray-600 mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">Awaiting Neural Context</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Click "Extract Context" to analyze your recent workflow and generate intelligent insights.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <InteractiveTimeline logs={displayLogs} />
            </div>
          </div>
        </main>

        <FloatingAssistant />
      </div>
    </SmartErrorBoundary>
  );
}
