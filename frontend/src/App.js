import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { motion } from 'framer-motion';
import { PlayCircle, BrainCircuit } from 'lucide-react';

import LiveAIBrain from './components/LiveAIBrain';
import AISummaryPanel from './components/AISummaryPanel';
import InteractiveTimeline from './components/InteractiveTimeline';
import FloatingAssistant from './components/FloatingAssistant';
import SmartErrorBoundary from './components/SmartErrorBoundary';
import SavedSummaries from './components/SavedSummaries';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  
  const [pinned, setPinned] = useState([]);
  const [pinnedSet, setPinnedSet] = useState(new Set());

  const [activeTab, setActiveTab] = useState("events"); // 'events' | 'saved'

  // Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayLogs, setReplayLogs] = useState([]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    setSummary(null); // Clear old summary for typing effect restart
    try {
      const res = await fetch(`${API}/summary`);
      if (res.ok) {
        setSummary(await res.json());
      } else {
        setError('Failed to generate summary');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/logs?limit=40`);
      if (res.ok) setLogs(await res.json());
    } catch { /* ignore */ }
  }, []);
  
  const fetchPinned = useCallback(async () => {
    try {
      const res = await fetch(`${API}/pinned-summaries`);
      if (res.ok) {
        const data = await res.json();
        setPinned(data);
        setPinnedSet(new Set(data.map(d => d.session_id)));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchPinned();
    const id = setInterval(() => {
        fetchLogs();
        fetchPinned();
    }, 5000);
    return () => clearInterval(id);
  }, [fetchLogs, fetchPinned]);

  const handlePin = async (summaryData) => {
    if (pinnedSet.has(summaryData.session_id)) return;
    try {
      const res = await fetch(`${API}/pin-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: summaryData.summary,
          session_id: summaryData.session_id,
          timestamp: summaryData.time_range?.to || new Date().toISOString()
        })
      });
      if (res.ok) {
        setPinnedSet(new Set([...pinnedSet, summaryData.session_id]));
        fetchPinned();
      }
    } catch (e) {
      console.error("Failed to pin summary", e);
    }
  };

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
      <div className="min-h-screen relative overflow-hidden bg-dark-bg text-gray-200">
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
        <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 space-y-12">
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 border-red-500/30 text-red-400 text-center"
            >
              System Error: {error}
            </motion.div>
          )}

          {/* Top Section: Split Layout */}
          <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center">
            {/* Left: Neural Link Animation */}
            <div className="w-full lg:w-1/2 flex flex-col flex-1">
              <LiveAIBrain isProcessing={loading || isReplaying} />
            </div>

            {/* Right: AI Context Synthesis */}
            <div className="w-full lg:w-1/2 flex flex-col flex-1">
              {summary && <AISummaryPanel data={summary} onPin={handlePin} pinnedSet={pinnedSet} />}
              
              {!summary && !loading && (
                <div className="glass-panel p-8 text-center border-dashed border-dark-border mx-auto w-full h-full flex flex-col justify-center items-center">
                  <BrainCircuit className="mx-auto text-gray-600 mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">Awaiting Neural Context</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Click "Extract Context" to analyze your recent workflow and generate intelligent insights.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Toggle UI */}
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex justify-center mb-6">
              <div className="glass-panel flex p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("events")}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === "events" 
                      ? 'bg-primary-main text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Event Stream
                </button>
                <button
                  onClick={() => setActiveTab("saved")}
                  className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === "saved" 
                      ? 'bg-primary-main text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Saved Summaries
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === "events" ? (
                <InteractiveTimeline logs={displayLogs} />
              ) : (
                <SavedSummaries pinned={pinned} setPinned={setPinned} />
              )}
            </div>
          </div>
        </main>

        <FloatingAssistant />
      </div>
    </SmartErrorBoundary>
  );
}
