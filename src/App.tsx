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

  const goHome = () => setView('home');

  const handleConnect = async () => {
    const success = await connectFolder();
    if (success) setConnected(true);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-lg w-full">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <FolderOpen size={48} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Select Storage Folder</h1>
          <p className="text-slate-600 mb-8 text-lg">
            Please select a local folder to store the database and position files. 
            <br/><span className="text-sm text-slate-400">(Offline Mode)</span>
          </p>
          <button 
            onClick={handleConnect}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
          >
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
