import { useEffect, useState } from 'react';
import { getPositions, getRules } from '../api';
import { Position, ColumnRule } from '../types';
import { RefreshCw, X, Info } from 'lucide-react';

export default function Map() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [rules, setRules] = useState<ColumnRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posData, rulesData] = await Promise.all([getPositions(), getRules()]);
      setPositions(posData);
      setRules(rulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate Insights
  const totalComplete = positions.filter(p => p.status === 'occupied' && !p.is_a_rank).length;
  const totalARank = positions.filter(p => p.status === 'occupied' && p.is_a_rank).length;
  const totalPartial = positions.filter(p => p.status === 'partial').length;
  const totalOTC = positions.filter(p => p.notif_type === 'OTC' && p.status !== 'free').length;
  const totalExera2 = positions.filter(p => p.notif_type === 'EXERA2' && p.status !== 'free').length;
  const totalExera3 = positions.filter(p => p.notif_type === 'EXERA3' && p.status !== 'free').length;
  const totalFree = positions.filter(p => p.status === 'free').length;

  // Organize by column
  const grid: Record<string, Position[]> = {};
  for (let i = 0; i < 26; i++) {
    const col = String.fromCharCode(65 + i);
    grid[col] = [];
  }

  positions.forEach(p => {
    if (grid[p.col_id]) {
      grid[p.col_id].push(p);
    }
  });

  Object.keys(grid).forEach(col => {
    grid[col].sort((a, b) => a.row_idx - b.row_idx);
  });

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Warehouse Map</h2>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Insights Dashboard */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">Complete (NS+SUB)</span>
          <span className="text-2xl font-black text-rose-600">{totalComplete}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">A-Rank</span>
          <span className="text-2xl font-black text-purple-600">{totalARank}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">Partial</span>
          <span className="text-2xl font-black text-amber-500">{totalPartial}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">Open (Free)</span>
          <span className="text-2xl font-black text-emerald-600">{totalFree}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">OTC</span>
          <span className="text-2xl font-black text-slate-700">{totalOTC}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">EXERA2</span>
          <span className="text-2xl font-black text-slate-700">{totalExera2}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">EXERA3</span>
          <span className="text-2xl font-black text-slate-700">{totalExera3}</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {Object.keys(grid).map(colId => {
            const rule = rules.find(r => r.col_id === colId);
            const isEnabled = rule ? rule.enabled === 1 : true;

            return (
              <div key={colId} className={`w-24 flex flex-col gap-2 transition-opacity ${!isEnabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                <div className="text-center font-bold text-xl text-slate-500 bg-slate-100 rounded-lg py-2">
                  {colId}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(rowIdx => {
                    const pos = grid[colId].find(p => p.row_idx === rowIdx);
                    const isOccupied = pos?.status === 'occupied';
                    const isPartial = pos?.status === 'partial';

                    let bgClass = 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200';
                    if (isOccupied) {
                      bgClass = pos?.is_a_rank
                        ? 'bg-purple-500 border-purple-600 text-white hover:bg-purple-600 shadow-md'
                        : 'bg-rose-500 border-rose-600 text-white hover:bg-rose-600 shadow-md';
                    } else if (isPartial) {
                      bgClass = 'bg-amber-400 border-amber-500 text-white hover:bg-amber-500 shadow-sm';
                    }

                    return (
                      <button
                        key={`${colId}-${rowIdx}`}
                        onClick={() => {
                          if (isOccupied || isPartial) setSelectedPos(pos!);
                        }}
                        disabled={!isOccupied && !isPartial}
                        className={`flex-1 rounded-lg flex flex-col items-center justify-center text-sm font-bold border transition-colors cursor-pointer disabled:cursor-default ${bgClass}`}
                      >
                        <span className="text-lg">{rowIdx}</span>
                        {pos?.is_a_rank && <span className="text-[10px] leading-tight opacity-75">(A)</span>}
                        {isPartial && <span className="text-[10px] leading-tight opacity-90">{pos?.has_ns ? 'NS' : 'SUB'}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-6 justify-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-100 border border-emerald-200 rounded"></div>
          <span className="font-medium text-slate-600 text-sm">Free</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-400 border border-amber-500 rounded"></div>
          <span className="font-medium text-slate-600 text-sm">Partial (NS or SUB)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-rose-500 border border-rose-600 rounded"></div>
          <span className="font-medium text-slate-600 text-sm">Complete (NS+SUB)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-500 border border-purple-600 rounded"></div>
          <span className="font-medium text-slate-600 text-sm">A-Rank</span>
        </div>
      </div>

      {/* Position Detail Modal */}
      {selectedPos && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-100 p-6 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Info size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Position {selectedPos.id}</h3>
              </div>
              <button
                onClick={() => setSelectedPos(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Notification ID</p>
                <p className="text-4xl font-mono font-black text-slate-900">{selectedPos.notification_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-xl font-bold text-slate-800 capitalize">
                    {selectedPos.is_a_rank ? 'A-Rank' : selectedPos.status}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stored Type</p>
                  <p className="text-xl font-bold text-slate-800">{selectedPos.notif_type}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parts Present</p>
                  <div className="flex gap-2 mt-2">
                    {selectedPos.has_ns ? <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm">NS</span> : <span className="px-3 py-1 bg-slate-200 text-slate-400 font-bold rounded-lg text-sm line-through">NS</span>}
                    {selectedPos.has_sub ? <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-sm">SUB</span> : <span className="px-3 py-1 bg-slate-200 text-slate-400 font-bold rounded-lg text-sm line-through">SUB</span>}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Stored by <strong className="text-slate-800">{selectedPos.user_name || 'Unknown Operator'}</strong>
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  On {new Date(selectedPos.timestamp!).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setSelectedPos(null)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-lg"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
