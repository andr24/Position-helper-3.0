import { useEffect, useState, useRef } from 'react';
import { getPositions, getRules, relocateItem, verifyPin } from '../api';
import { Position, ColumnRule } from '../types';
import { RefreshCw, X, Info, Search, ArrowRight, Lock, Unlock } from 'lucide-react';

export default function Map() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [rules, setRules] = useState<ColumnRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Lock state
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Drag state
  const dragFromId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [confirmMove, setConfirmMove] = useState<{ from: Position; to: Position } | null>(null);

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

  useEffect(() => { fetchData(); }, []);

  // Calculate Insights
  const totalComplete = positions.filter(p => p.status === 'occupied' && !p.is_a_rank).length;
  const totalARank = positions.filter(p => p.status === 'occupied' && p.is_a_rank).length;
  const totalPartial = positions.filter(p => p.status === 'partial').length;
  const totalOTC = positions.filter(p => p.notif_type === 'OTC' && p.status !== 'free').length;
  const totalExera2 = positions.filter(p => p.notif_type === 'EXERA2' && p.status !== 'free').length;
  const totalExera3 = positions.filter(p => p.notif_type === 'EXERA3' && p.status !== 'free').length;
  const totalFree = positions.filter(p => p.status === 'free').length;

  const searchMatch = searchQuery.trim().toLowerCase();
  const matchedPositions = searchMatch
    ? positions.filter(p => p.notification_id?.toLowerCase().includes(searchMatch))
    : [];

  const grid: Record<string, Position[]> = {};
  for (let i = 0; i < 26; i++) grid[String.fromCharCode(65 + i)] = [];
  positions.forEach(p => { if (grid[p.col_id]) grid[p.col_id].push(p); });
  Object.keys(grid).forEach(col => grid[col].sort((a, b) => a.row_idx - b.row_idx));

  const handleConfirmRelocate = async () => {
    if (!confirmMove) return;
    setRelocating(true);
    try {
      await relocateItem(confirmMove.from.id, confirmMove.to.id);
      setConfirmMove(null);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRelocating(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative gap-1.5">
      {/* Top bar */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ID..."
            className="pl-7 pr-2 py-1 text-sm border border-slate-300 rounded-lg w-32 focus:w-44 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none bg-white"
          />
        </div>

        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          {[
            { label: 'Complete', value: totalComplete, color: 'text-rose-600' },
            { label: 'A-Rank', value: totalARank, color: 'text-purple-600' },
            { label: 'Partial', value: totalPartial, color: 'text-amber-500' },
            { label: 'Free', value: totalFree, color: 'text-emerald-600' },
            { label: 'OTC', value: totalOTC, color: 'text-slate-600' },
            { label: 'EX2', value: totalExera2, color: 'text-slate-600' },
            { label: 'EX3', value: totalExera3, color: 'text-slate-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-md border border-slate-200 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
              <span className={`text-sm font-black ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => editUnlocked ? setEditUnlocked(false) : setShowPinModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors text-sm shrink-0 ${editUnlocked ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
            }`}
        >
          {editUnlocked ? <><Unlock size={14} /> Editing Unlocked</> : <><Lock size={14} /> Unlock to Edit</>}
        </button>

        <button
          onClick={fetchData}
          className="flex items-center gap-1 px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors text-sm shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Map grid */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="flex gap-1.5 min-w-max h-full">
          {Object.keys(grid).map(colId => {
            const rule = rules.find(r => r.col_id === colId);
            const isEnabled = rule ? rule.enabled === 1 : true;
            if (!isEnabled) return null;

            const capacity = rule?.capacity || 8;
            const filled = grid[colId].filter(p => p.status !== 'free').length;
            const fillPct = Math.min(100, (filled / capacity) * 100);

            return (
              <div key={colId} className="w-[72px] flex flex-col gap-0.5">
                <div className="text-center shrink-0">
                  <div className="font-bold text-sm text-slate-500 bg-slate-100 rounded-t-md py-0.5">{colId}</div>
                  <div className="h-1 bg-slate-200 rounded-b-md overflow-hidden">
                    <div
                      className={`h-full transition-all ${fillPct > 80 ? 'bg-rose-500' : fillPct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-0.5">
                  {Array.from({ length: capacity }, (_, i) => i + 1).map(rowIdx => {
                    const pos = grid[colId].find(p => p.row_idx === rowIdx);
                    const isOccupied = pos?.status === 'occupied';
                    const isPartial = pos?.status === 'partial';
                    const isFree = !pos || pos.status === 'free';
                    const isSearchHit = searchMatch && matchedPositions.some(m => m.col_id === colId && m.row_idx === rowIdx);
                    const isDragTarget = dragOver === pos?.id || (isFree && dragOver === `${colId}-${rowIdx}`);

                    const daysStored = pos?.timestamp
                      ? Math.floor((Date.now() - new Date(pos.timestamp).getTime()) / 86400000)
                      : null;

                    let bgClass = 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200';
                    if (isOccupied) {
                      bgClass = pos?.is_a_rank
                        ? 'bg-purple-500 border-purple-600 text-white hover:bg-purple-600 shadow-md'
                        : 'bg-rose-500 border-rose-600 text-white hover:bg-rose-600 shadow-md';
                    } else if (isPartial) {
                      bgClass = 'bg-amber-400 border-amber-500 text-white hover:bg-amber-500 shadow-sm';
                    }

                    const cellId = pos?.id ?? `${colId}-${rowIdx}`;
                    const canDrag = (isOccupied || isPartial) && editUnlocked;
                    const canDrop = isFree && dragFromId.current !== null && editUnlocked;

                    return (
                      <button
                        key={`${colId}-${rowIdx}`}
                        draggable={canDrag}
                        onDragStart={e => {
                          if (!canDrag || !pos) { e.preventDefault(); return; }
                          dragFromId.current = pos.id;
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => { dragFromId.current = null; setDragOver(null); }}
                        onDragOver={e => {
                          if (isFree && dragFromId.current) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOver(cellId);
                          }
                        }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={e => {
                          e.preventDefault();
                          setDragOver(null);
                          if (!isFree || !dragFromId.current) return;
                          const fromPos = positions.find(p => p.id === dragFromId.current);
                          // Build a placeholder for the free target cell
                          const toPos = pos ?? { id: `${colId}-${rowIdx}`, col_id: colId, row_idx: rowIdx, status: 'free', has_ns: false, has_sub: false, is_a_rank: false };
                          if (fromPos) setConfirmMove({ from: fromPos, to: toPos as Position });
                          dragFromId.current = null;
                        }}
                        onClick={() => {
                          if ((isOccupied || isPartial) && pos) setSelectedPos(pos);
                        }}
                        disabled={!canDrag && !canDrop}
                        className={`flex-1 rounded-md flex flex-col items-center justify-center text-xs font-bold border transition-all cursor-pointer disabled:cursor-default
                          ${bgClass}
                          ${isSearchHit ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 z-10' : ''}
                          ${isDragTarget && isFree ? 'ring-2 ring-indigo-500 bg-indigo-100 border-indigo-400 scale-105' : ''}
                          ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                        `}
                      >
                        <span className="text-sm leading-none">{rowIdx}</span>
                        {pos?.is_a_rank && <span className="text-[8px] leading-none opacity-75">(A)</span>}
                        {isPartial && <span className="text-[8px] leading-none opacity-90">{pos?.has_ns ? 'NS' : 'SUB'}</span>}
                        {daysStored !== null && (isOccupied || isPartial) && (
                          <span className={`text-[8px] leading-none font-semibold mt-0.5 ${daysStored > 14 ? 'text-red-200' : daysStored > 7 ? 'text-yellow-200' : 'text-white/70'}`}>{daysStored}d</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="shrink-0 flex gap-4 justify-center py-0.5">
        {[
          { bg: 'bg-emerald-100 border-emerald-200', label: 'Free' },
          { bg: 'bg-amber-400 border-amber-500', label: 'Partial' },
          { bg: 'bg-rose-500 border-rose-600', label: 'Complete' },
          { bg: 'bg-purple-500 border-purple-600', label: 'A-Rank' },
        ].map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${bg} border`}></div>
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
          </div>
        ))}
        <span className="text-[11px] text-slate-400 ml-2 flex items-center gap-1">
          {editUnlocked ? <Unlock size={10} /> : <Lock size={10} />}
          {editUnlocked ? 'Drag to relocate is enabled' : 'Unlock to relocate items'}
        </span>
      </div>

      {/* Confirm Relocate Modal */}
      {showPinModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Unlock Map Editing</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Enter Admin PIN to enable drag-and-drop</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await verifyPin(pin);
              if (res.success) {
                setEditUnlocked(true);
                setShowPinModal(false);
                setPin('');
                setPinError('');
              } else {
                setPinError('Invalid PIN');
                setPin('');
              }
            }}>
              <input
                type="password"
                required
                autoFocus
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full text-center text-3xl tracking-widest p-4 border-2 border-slate-300 rounded-xl focus:border-indigo-500 outline-none mb-2 font-mono"
                maxLength={8}
              />
              {pinError && <p className="text-red-500 text-sm text-center mb-4 font-bold">{pinError}</p>}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowPinModal(false); setPin(''); setPinError(''); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmMove && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Confirm Relocation</h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-black text-slate-700">{confirmMove.from.id}</div>
                <div className="text-xs text-slate-400 font-mono">{confirmMove.from.notification_id}</div>
              </div>
              <ArrowRight size={24} className="text-slate-400 shrink-0" />
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-600">{confirmMove.to.id}</div>
                <div className="text-xs text-slate-400">free</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMove(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRelocate}
                disabled={relocating}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {relocating ? 'Moving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Detail Modal */}
      {selectedPos && !confirmMove && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-100 p-5 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Info size={22} /></div>
                <h3 className="text-xl font-bold text-slate-800">Position {selectedPos.id}</h3>
              </div>
              <button
                onClick={() => setSelectedPos(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Notification ID</p>
                <p className="text-3xl font-mono font-black text-slate-900">{selectedPos.notification_id}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-lg font-bold text-slate-800 capitalize">
                    {selectedPos.is_a_rank ? 'A-Rank' : selectedPos.status}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                  <p className="text-lg font-bold text-slate-800">{selectedPos.notif_type}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stored</p>
                  <p className={`text-lg font-bold ${(() => {
                    const d = selectedPos.timestamp ? Math.floor((Date.now() - new Date(selectedPos.timestamp).getTime()) / 86400000) : 0;
                    return d > 14 ? 'text-red-600' : d > 7 ? 'text-amber-500' : 'text-emerald-600';
                  })()}`}>
                    {selectedPos.timestamp ? `${Math.floor((Date.now() - new Date(selectedPos.timestamp).getTime()) / 86400000)}d` : '—'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parts Present</p>
                <div className="flex gap-2 mt-1">
                  {selectedPos.has_ns ? <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm">NS</span> : <span className="px-3 py-1 bg-slate-200 text-slate-400 font-bold rounded-lg text-sm line-through">NS</span>}
                  {selectedPos.has_sub ? <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-sm">SUB</span> : <span className="px-3 py-1 bg-slate-200 text-slate-400 font-bold rounded-lg text-sm line-through">SUB</span>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-sm text-slate-500">
                <p>Stored by <strong className="text-slate-800">{selectedPos.user_name || 'Unknown'}</strong></p>
                <p className="mt-0.5">On {new Date(selectedPos.timestamp!).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setSelectedPos(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
