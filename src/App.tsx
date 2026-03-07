import { useState } from 'react';
import Header from './components/Header';
import Home from './pages/Home';
import Store from './pages/Store';
import Pick from './pages/Pick';
import Map from './pages/Map';
import Admin from './pages/Admin';
import { AnimatePresence, motion } from 'motion/react';

export type ViewState = 'home' | 'store' | 'pick' | 'map' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('home');

  const goHome = () => setView('home');

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
