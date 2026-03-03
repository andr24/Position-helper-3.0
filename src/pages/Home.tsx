import { PackagePlus, PackageMinus, Map as MapIcon, Settings, BarChart2 } from 'lucide-react';
import { ViewState } from '../App';

interface HomeProps {
  onNavigate: (view: ViewState) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="grid grid-cols-2 gap-6 h-full max-w-5xl mx-auto">
      <button
        onClick={() => onNavigate('store')}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <PackagePlus size={72} />
        <span className="text-3xl font-bold">Store Item</span>
      </button>

      <button
        onClick={() => onNavigate('pick')}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <PackageMinus size={72} />
        <span className="text-3xl font-bold">Pick Item</span>
      </button>

      <button
        onClick={() => onNavigate('map')}
        className="bg-slate-700 hover:bg-slate-800 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <MapIcon size={72} />
        <span className="text-3xl font-bold">View Map</span>
      </button>

      <button
        onClick={() => onNavigate('dashboard')}
        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <BarChart2 size={72} />
        <span className="text-3xl font-bold">Dashboard</span>
      </button>

      <button
        onClick={() => onNavigate('admin')}
        className="col-span-2 bg-slate-500 hover:bg-slate-600 text-white rounded-3xl shadow-lg flex flex-row items-center justify-center gap-6 py-6 transition-all transform hover:scale-[1.01] active:scale-95"
      >
        <Settings size={48} />
        <span className="text-3xl font-bold">Admin</span>
      </button>
    </div>
  );
}
