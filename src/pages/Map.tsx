import { useEffect, useState } from 'react';
import { getPositions } from '../api';
import { Position } from '../types';
import { Loader2, RefreshCw } from 'lucide-react';

export default function Map() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const data = await getPositions();
      setPositions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // Organize by column
  const grid: Record<string, Position[]> = {};
  // Initialize A-Z
  for (let i = 0; i < 26; i++) {
    const col = String.fromCharCode(65 + i);
    grid[col] = [];
  }
  
  positions.forEach(p => {
    if (grid[p.col_id]) {
      grid[p.col_id].push(p);
    }
  });

  // Sort rows in each column
  Object.keys(grid).forEach(col => {
    grid[col].sort((a, b) => a.row_idx - b.row_idx);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Warehouse Map</h2>
        <button 
          onClick={fetchPositions}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {Object.keys(grid).map(colId => (
            <div key={colId} className="w-24 flex flex-col gap-2">
              <div className="text-center font-bold text-xl text-slate-500 bg-slate-100 rounded-lg py-2">
                {colId}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(rowIdx => {
                  const pos = grid[colId].find(p => p.row_idx === rowIdx);
                  const isOccupied = pos?.status === 'occupied';
                  
                  return (
                    <div 
                      key={`${colId}-${rowIdx}`}
                      className={`
                        flex-1 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm border transition-colors
                        ${isOccupied
                          ? 'bg-red-500 border-red-600 text-white' 
                          : 'bg-emerald-100 border-emerald-200 text-emerald-700'}
                      `}
                      title={isOccupied ? `ID: ${pos?.notification_id}\nUser: ${pos?.user_name}` : 'Free'}
                    >
                      {rowIdx}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-100 border border-emerald-200 rounded"></div>
          <span className="font-medium text-slate-600">Free</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 border border-red-600 rounded"></div>
          <span className="font-medium text-slate-600">Occupied</span>
        </div>
      </div>
    </div>
  );
}
