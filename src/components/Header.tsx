import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

export default function Header({ title, onBack }: HeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
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
      <h1 className="text-3xl font-bold tracking-tight flex-1">{title}</h1>
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
