import { PackagePlus, PackageMinus, Map as MapIcon, Settings, Layers } from 'lucide-react';
import { ViewState } from '../App';
import { useState, useEffect } from 'react';
import { getBuffer } from '../api';

interface HomeProps {
  onNavigate: (view: ViewState) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="grid grid-cols-2 gap-8 h-full max-w-5xl mx-auto">
      <button 
        onClick={() => onNavigate('store')}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-6 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <PackagePlus size={80} />
        <span className="text-4xl font-bold">Store Item</span>
      </button>

      <button 
        onClick={() => onNavigate('pick')}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-6 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <PackageMinus size={80} />
        <span className="text-4xl font-bold">Pick Item</span>
      </button>

      <button 
        onClick={() => onNavigate('map')}
        className="bg-slate-700 hover:bg-slate-800 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-6 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <MapIcon size={80} />
        <span className="text-4xl font-bold">View Map</span>
      </button>

      <button 
        onClick={() => onNavigate('admin')}
        className="bg-slate-500 hover:bg-slate-600 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-6 transition-all transform hover:scale-[1.02] active:scale-95"
      >
        <Settings size={80} />
        <span className="text-4xl font-bold">Admin Settings</span>
      </button>
    </div>
  );
}
