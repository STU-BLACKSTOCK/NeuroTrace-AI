import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AI Core Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 glass-panel p-8 text-center border-red-500/30">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-red-400 mb-4"
          >
            <AlertTriangle size={48} />
          </motion.div>
          
          <h2 className="text-xl font-bold text-gray-200 mb-2">Neural Link Interrupted</h2>
          <p className="text-gray-400 mb-6 text-sm max-w-md">
            My cognitive circuits encountered an unexpected anomaly. 
            Don't worry, the core data is safe. Let's try re-establishing the connection.
          </p>
          
          <button 
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/50"
          >
            <RefreshCcw size={16} />
            <span>Reboot Core</span>
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
