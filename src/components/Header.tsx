import { ArrowLeft, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

export default function Header({ title, onBack }: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white p-6 flex items-center shadow-md">
      {onBack && (
        <button 
          onClick={onBack}
          className="mr-4 p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={32} />
        </button>
      )}
      <h1 className="text-3xl font-bold tracking-tight flex-1">{title}</h1>
      <div className="p-2 bg-slate-800 rounded-full">
        <Menu size={24} className="text-slate-400" />
      </div>
    </header>
  );
}
