import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const IconBrain = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66Z"/>
  </svg>
);

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconList = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconPopout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20"></polyline>
    <polyline points="20 10 14 10 14 4"></polyline>
    <line x1="14" y1="10" x2="21" y2="3"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
);

const IconExpand = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"></polyline>
    <polyline points="9 21 3 21 3 15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
);

const IconMinimize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>Reconstructing context…</span>
    </div>
  );
}

function SummaryCard({ data, animKey, onPin, pinnedSet }) {
  const isPinned = pinnedSet.has(data.session_id);
  const bullets = ['🎯', '⚡', '→'];
  
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedText, setExpandedText] = useState(null);

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

  // Generate Action Buttons
  const actionButtons = [];
  const fullText = data.summary.join(" ");
  
  // File extraction (.py, .js, .tsx, etc)
  const fileMatches = fullText.match(/[A-Za-z0-9_-]+\.(py|js|ts|jsx|tsx|css|html)/g);
  if (fileMatches && fileMatches.length > 0) {
    const uniqueFiles = [...new Set(fileMatches)];
    actionButtons.push({
      label: `📂 Open ${uniqueFiles[0]}`,
      action: () => alert(`Simulated opening of ${uniqueFiles[0]} in your editor...`)
    });
  }
  
  // Search extraction (from last bullet "Next step")
  const nextStepText = data.summary[2] || "";
  if (nextStepText) {
     const cleanQuery = nextStepText.replace(/next:|next step:|try to|check/gi, "").trim();
     actionButtons.push({
       label: `🔍 Search Solution`,
       action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`, '_blank')
     });
  }

  return (
    <div className="summary-card" key={animKey}>
      <div className="card-header">
        <span className="card-label">AI Context Summary</span>
        <div className="card-actions">
          <button 
            className={`pin-btn ${isPinned ? 'active' : ''}`} 
            onClick={() => onPin(data)}
            disabled={isPinned}
          >
            {isPinned ? '⭐ Pinned' : '☆ Pin This'}
          </button>
        </div>
      </div>
      <div className="card-meta" style={{marginBottom: 16}}>
        <span><IconClock /> {fmtTime(data.time_range?.from)} – {fmtTime(data.time_range?.to)}</span>
        <span><IconList /> {data.log_count} events</span>
        <span>Session: {data.session_id}</span>
      </div>
      <ul className="bullets">
        {data.summary.map((line, i) => (
          <li key={i} className="bullet" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="bullet-icon">{bullets[i] || '•'}</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      
      {/* Interaction Layer */}
      <div className="summary-interactions">
         {!expandedText && (
            <button className="explain-more-btn" onClick={handleExpand} disabled={isExpanding}>
              {isExpanding ? "Analyzing..." : "Explain More"}
            </button>
         )}
         
         {expandedText && (
            <div className="expanded-insight">
               <div className="insight-label">Detailed Insight</div>
               <p>{expandedText}</p>
            </div>
         )}
         
         <div className="action-buttons">
            {actionButtons.map((btn, idx) => (
               <button key={idx} className="action-btn" onClick={btn.action}>
                 {btn.label}
               </button>
            ))}
         </div>
      </div>
    </div>
  );
}

function TimelineItem({ log, isExpanded, onToggle }) {
  const [showRaw, setShowRaw] = useState(false);

  const interpretLog = (log) => {
      try {
          const parsed = typeof log.details === 'string' && log.details.startsWith('{') ? JSON.parse(log.details) : null;
          const type = parsed?.type || log.type; 
          const title = parsed?.title || log.title;
          const file = parsed?.file || log.file;
          const snippet = parsed?.snippet;
          
          if (type === 'code' || log.action === 'file_modified' || log.action === 'file_edit') {
            return { type: 'code', emoji: '💻', text: `Modified ${file || log.app}`, data: { file: file || log.app, snippet: snippet } };
          }
          if (type === 'search' || log.action === 'browser_activity') {
             return { type: 'search', emoji: '🔍', text: `Searched: ${title || parsed?.text || log.details}`, data: { query: title || parsed?.text || log.details, source: log.app } };
          }
          if (log.action === 'app_switch') {
             return { type: 'app', emoji: '🔄', text: `Switched to ${log.app}`, data: { app: log.app, action: log.action } };
          }
          if (log.action === 'session_start') {
             return { type: 'info', emoji: '🟢', text: `Session Started`, data: null };
          }
          
          return { type: 'info', emoji: '📝', text: `${log.action} in ${log.app}`, data: null };
      } catch {
          return { type: 'info', emoji: '📝', text: `${log.action} in ${log.app}`, data: null };
      }
  };

  const { type, emoji, text, data } = interpretLog(log);

  return (
    <div className={`timeline-item ${isExpanded ? 'expanded' : ''}`}>
      <div className="timeline-header" onClick={onToggle}>
        <span className="timeline-emoji">{emoji}</span>
        <div className="timeline-title-row">
           <span className="timeline-text">{text}</span>
           <div className="timeline-meta">
              <span className="timeline-time">{fmtTime(log.timestamp)}</span>
              <span className="timeline-toggle-icon">{isExpanded ? '▲' : '▼'}</span>
           </div>
        </div>
      </div>
      
      <div className="timeline-details">
        <div className="details-content">
          {type === 'code' && data?.file && (
            <div className="detail-section">
              <div className="detail-row"><strong>File:</strong> {data.file}</div>
              {data.snippet && (
                <>
                  <div className="detail-row"><strong>Snippet:</strong></div>
                  <pre className="detail-snippet">{data.snippet.slice(0, 300)}{data.snippet.length > 300 ? '...' : ''}</pre>
                </>
              )}
            </div>
          )}
          {type === 'search' && (
            <div className="detail-section">
              <div className="detail-row"><strong>Search Query:</strong> {data.query}</div>
              <div className="detail-row"><strong>Source:</strong> {data.source}</div>
            </div>
          )}
          {type === 'app' && (
            <div className="detail-section">
              <div className="detail-row"><strong>App:</strong> {data.app}</div>
              <div className="detail-row"><strong>Action:</strong> Switched window focus</div>
            </div>
          )}
          {type === 'info' && (
            <div className="detail-section">
              <div className="detail-row"><strong>Event:</strong> {log.action}</div>
            </div>
          )}
          
          <div className="raw-toggle-container">
            <button className="raw-toggle-btn" onClick={(e) => { e.stopPropagation(); setShowRaw(!showRaw); }}>
              {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
            </button>
            {showRaw && (
              <pre className="detail-snippet raw-json">
                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineFeed({ logs }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!logs.length) return null;

  return (
    <div className="timeline-section">
      <div className="section-header">
        <div className="section-title">Session Timeline</div>
      </div>
      <div className="timeline-scroll">
        {logs.slice(-40).reverse().map((log, i) => (
          <TimelineItem 
            key={i} 
            log={log} 
            isExpanded={expandedIndex === i} 
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)} 
          />
        ))}
      </div>
    </div>
  );
}

function SavedInsights({ pinned }) {
  if (!pinned || pinned.length === 0) return null;
  
  return (
    <div className="saved-insights">
      <div className="section-title">Saved Insights</div>
      <div className="pinned-grid">
        {pinned.map((p, i) => (
          <div key={i} className="pinned-card">
            <div className="pinned-header">
              <span className="pinned-date">⭐ {fmtDate(p.timestamp)}</span>
            </div>
            <ul className="bullets small">
              {p.summary.map((line, j) => (
                <li key={j}>
                  <span className="bullet-icon">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [pinnedSet, setPinnedSet] = useState(new Set());
  const [animKey, setAnimKey] = useState(0);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'icon' | 'widget'

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/summary`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const data = await res.json();
      setSummary(data);
      setAnimKey(k => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/logs?limit=40`);
      if (res.ok) setLogs(await res.json());
    } catch { /* ignore */ }
  }, []);

  const handlePin = async (data) => {
    try {
      await fetch(`${API}/pin-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: data.summary,
          timestamp: new Date().toISOString(),
          session_id: data.session_id
        })
      });
      fetchPinned();
    } catch (e) {
      console.error('Failed to pin', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchPinned();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, [fetchLogs, fetchPinned]);

  // Render Icon Mode
  if (viewMode === 'icon') {
    return (
      <div className="app">
        <div className="noise" />
        <button className="floating-icon-btn" onClick={() => setViewMode('widget')} title="Open Assistant">
          <IconBrain />
        </button>
      </div>
    );
  }

  // Render Widget Mode
  if (viewMode === 'widget') {
    return (
      <div className="app">
        <div className="noise" />
        <div className="floating-widget">
          <div className="float-header">
            <span><IconBrain /> NeuroTrace</span>
            <div className="float-actions">
              <button className="close-float" onClick={() => setViewMode('dashboard')} title="Expand to Dashboard">
                <IconExpand />
              </button>
              <button className="close-float" onClick={() => setViewMode('icon')} title="Minimize to Icon">
                <IconMinimize />
              </button>
            </div>
          </div>
          <div className="float-content">
            <button className={`resume-btn float-btn ${loading ? 'loading' : ''}`} onClick={fetchSummary} disabled={loading}>
              {loading ? 'Analyzing...' : '🧠 Resume'}
            </button>
            <div className="float-summary">
              {summary ? (
                <ul className="bullets small">
                  {summary.summary.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              ) : <div style={{opacity: 0.6}}>Click resume to catch up.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard UI
  return (
    <div className="app">
      <div className="noise" />

      <header className="navbar">
        <div className="logo">
          <IconBrain />
          <span>NeuroTrace AI</span>
        </div>
        <div className="nav-actions">
          <button className="popout-btn" onClick={() => setViewMode('icon')} title="Minimize to Floating Icon">
            <IconPopout />
          </button>
          <button className={`resume-btn ${loading ? 'loading' : ''}`} onClick={fetchSummary} disabled={loading}>
            {loading ? <><div className="btn-spinner" /> Analyzing…</> : <><IconPlay /> Resume Session</>}
          </button>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-card"><strong>Error:</strong> {error}</div>}
        
        {loading && <Spinner />}

        <div className="dashboard-grid">
          <div className="main-column">
            {!loading && summary && (
              <SummaryCard data={summary} animKey={animKey} onPin={handlePin} pinnedSet={pinnedSet} />
            )}
            
            {!loading && !summary && !error && (
              <div className="empty-state">
                <div className="empty-icon">◉</div>
                <p>Click <strong>Resume Session</strong> to generate your AI context summary.</p>
              </div>
            )}
            
            <TimelineFeed logs={logs} />
          </div>

          <div className="side-column">
            <SavedInsights pinned={pinned} />
          </div>
        </div>
      </main>
    </div>
  );
}
