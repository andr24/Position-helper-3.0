import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Home from './pages/Home';
import Store from './pages/Store';
import Pick from './pages/Pick';
import Map from './pages/Map';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import { AnimatePresence, motion } from 'motion/react';
import { connectFolder, autoBackup } from './services/filesystem';
import { FolderOpen } from 'lucide-react';

export type ViewState = 'home' | 'store' | 'pick' | 'map' | 'admin' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('kiosk_dark_mode') === 'true';
  });

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('kiosk_dark_mode', String(next));
      return next;
    });
  }, []);

  const goHome = () => setView('home');

  // Automatic connection on startup
  useState(() => {
    const init = async () => {
      try {
        const success = await connectFolder();
        if (success) setConnected(true);
      } catch (e) {
        console.error("Startup init failed:", e);
      } finally {
        setIsConnecting(false);
      }
    };
    init();
  });

  // Auto-backup every 1 hour
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      autoBackup();
    }, 60 * 60 * 1000); // 1 hour
    // Run once on connect too
    autoBackup();
    return () => clearInterval(interval);
  }, [connected]);

  // Fullscreen sync
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen error:', e);
    }
  }, []);

  // Apply dark class to html element (must be before early returns)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // F11 → toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      // Escape → go back to home (if not on home)
      if (e.key === 'Escape' && view !== 'home') {
        goHome();
        return;
      }
      // Number keys on Home screen → quick nav
      if (view === 'home') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === '1') setView('store');
        else if (e.key === '2') setView('pick');
        else if (e.key === '3') setView('map');
        else if (e.key === '4') setView('dashboard');
        else if (e.key === '5') setView('admin');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, toggleFullscreen]);

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-emerald-500 font-mono text-xl animate-pulse">INITIALIZING SYSTEM...</p>
      </div>
    );
  }

  if (!connected && !isConnecting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Select Storage Folder</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Please select the offline local folder where the inventory database will be stored.
          </p>
          <button
            onClick={async () => {
              setIsConnecting(true);
              const success = await connectFolder();
              if (success) {
                setConnected(true);
              }
              setIsConnecting(false);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <FolderOpen size={20} />
            Connect Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <Header
        title={view === 'home' ? 'Kiosk Inventory' : view.charAt(0).toUpperCase() + view.slice(1)}
        onBack={view !== 'home' ? goHome : undefined}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isDark={isDark}
        onToggleDark={toggleDark}
      />

      <main className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-6"
            >
              <Home onNavigate={setView} />
            </motion.div>
          )}

          {view === 'store' && (
            <motion.div
              key="store"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-6 overflow-auto"
            >
              <Store onComplete={goHome} />
            </motion.div>
          )}

          {view === 'pick' && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-6 overflow-auto"
            >
              <Pick onComplete={goHome} />
            </motion.div>
          )}

          {view === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-3 flex flex-col"
            >
              <Map />
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-4 overflow-auto"
            >
              <Dashboard />
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-6 overflow-auto"
            >
              <Admin />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
