import { ArrowLeft, Maximize, Minimize, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getServerInfo } from '../api';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

export default function Header({ title, onBack }: HeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ url: string; ips: string[]; port: number } | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    getServerInfo().then(setServerInfo).catch(console.error);
    
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <header className="bg-slate-900 text-white py-4 px-6 flex items-center shadow-md">
      {onBack && (
        <button 
          onClick={onBack}
          className="mr-4 p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
      )}
      <div className="flex-1 flex items-baseline gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {serverInfo && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg text-xs font-mono text-slate-400 border border-slate-700/50">
            <Wifi size={12} className="text-emerald-500" />
            <span className="opacity-60 uppercase tracking-wider font-bold">Connect:</span>
            <span className="text-slate-200">{serverInfo.ips[0] || serverInfo.url.replace(/^https?:\/\//, '')}</span>
            {serverInfo.ips.length > 0 && <span className="text-slate-500">:{serverInfo.port}</span>}
          </div>
        )}
      </div>
      <button 
        onClick={toggleFullscreen}
        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize size={24} className="text-slate-400" /> : <Maximize size={24} className="text-slate-400" />}
      </button>
    </header>
  );
}
