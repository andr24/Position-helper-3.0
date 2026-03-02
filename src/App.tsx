import { useState } from 'react';
import Header from './components/Header';
import Home from './pages/Home';
import Store from './pages/Store';
import Pick from './pages/Pick';
import Map from './pages/Map';
import Admin from './pages/Admin';
import { AnimatePresence, motion } from 'motion/react';
import { connectFolder, isConnected } from './services/filesystem';
import { FolderOpen } from 'lucide-react';

export type ViewState = 'home' | 'store' | 'pick' | 'map' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true); // Start true for auto-connect

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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      <Header
        title={view === 'home' ? 'Kiosk Inventory' : view.charAt(0).toUpperCase() + view.slice(1)}
        onBack={view !== 'home' ? goHome : undefined}
      />

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-8"
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
              className="absolute inset-0 p-8 overflow-auto"
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
              className="absolute inset-0 p-8 overflow-auto"
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
              className="absolute inset-0 p-8 overflow-auto"
            >
              <Map />
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-8 overflow-auto"
            >
              <Admin />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
