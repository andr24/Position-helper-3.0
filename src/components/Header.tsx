import { ArrowLeft, Maximize2, Minimize2, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export default function Header({ title, onBack, isFullscreen, onToggleFullscreen, isDark, onToggleDark }: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white px-5 py-3 flex items-center shadow-md shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          className="mr-3 p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={28} />
        </button>
      )}
      <h1 className="text-2xl font-bold tracking-tight flex-1">{title}</h1>
      <button
        onClick={onToggleDark}
        title={isDark ? 'Light Mode' : 'Dark Mode'}
        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white"
      >
        {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
      </button>
    </header>
  );
}
