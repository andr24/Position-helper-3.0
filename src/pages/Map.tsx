import { useEffect, useState } from 'react';
import { getPositions, getRules, verifyPin, adminUpdatePosition, adminSwapPositions } from '../api';
import { Position, ColumnRule } from '../types';
import { RefreshCw, X, Info, Lock, Unlock } from 'lucide-react';

export default function Map() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [rules, setRules] = useState<ColumnRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const [globalPin, setGlobalPin] = useState('');
  const [showGlobalPinModal, setShowGlobalPinModal] = useState(false);
  const [tempPin, setTempPin] = useState('');

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
  const enabledRules = rules.filter(r => r.enabled === 1).sort((a, b) => a.col_id.localeCompare(b.col_id));
  const grid: Record<string, Position[]> = {};
  
  enabledRules.forEach(r => {
    grid[r.col_id] = [];
  });

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
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (globalEditMode) {
                setGlobalEditMode(false);
                setGlobalPin('');
                setEditMode(false);
              } else {
                setShowGlobalPinModal(true);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${globalEditMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
          >
            {globalEditMode ? <Unlock size={20} /> : <Lock size={20} />}
            {globalEditMode ? 'Edit Mode: ON' : 'Edit Mode: OFF'}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Insights Dashboard */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">Complete (NS+SUB)</span>
          <span className="text-2xl font-black text-blue-600">{totalComplete}</span>
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
          {enabledRules.map(rule => {
            const colId = rule.col_id;
            const capacity = rule.capacity || 8;

            return (
              <div key={colId} className="w-24 flex flex-col gap-2">
                <div className="text-center font-bold text-xl text-slate-500 bg-slate-100 rounded-lg py-2">
                  {colId}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  {Array.from({ length: capacity }, (_, i) => i + 1).map(rowIdx => {
                    const pos = grid[colId].find(p => p.row_idx === rowIdx);
                    const isOccupied = pos?.status === 'occupied';
                    const isPartial = pos?.status === 'partial';

                    let bgClass = 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200';
                    if (isOccupied) {
                      bgClass = pos?.is_a_rank
                        ? 'bg-purple-500 border-purple-600 text-white hover:bg-purple-600 shadow-md'
                        : 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600 shadow-md';
                    } else if (isPartial) {
                      bgClass = 'bg-amber-400 border-amber-500 text-white hover:bg-amber-500 shadow-sm';
                    }

                    return (
                      <button
                        key={`${colId}-${rowIdx}`}
                        onClick={() => {
                          setSelectedPos(pos!);
                          setEditMode(false);
                        }}
                        draggable={globalEditMode && (isOccupied || isPartial)}
                        onDragStart={(e) => {
                          if (!globalEditMode) return;
                          e.dataTransfer.setData('text/plain', pos!.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          if (!globalEditMode) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          if (!globalEditMode) return;
                          const fromId = e.dataTransfer.getData('text/plain');
                          if (fromId && fromId !== pos!.id) {
                            const res = await adminSwapPositions(globalPin, fromId, pos!.id);
                            if (res.success) {
                              fetchData();
                            } else {
                              alert(res.message || 'Failed to move');
                            }
                          }
                        }}
                        className={`flex-1 min-h-0 rounded-lg flex flex-col items-center justify-center text-sm font-bold border transition-colors cursor-pointer ${bgClass}`}
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
          <div className="w-6 h-6 bg-blue-500 border border-blue-600 rounded"></div>
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
                <h3 className="text-2xl font-bold text-slate-800">Position {selectedPos.id} {editMode && '(Edit)'}</h3>
              </div>
              <button
                onClick={() => setSelectedPos(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            {editMode && editPos ? (
              <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Status</label>
                  <select value={editPos.status} onChange={e => setEditPos({...editPos, status: e.target.value as any})} className="w-full p-3 border rounded-lg bg-white">
                    <option value="free">Free</option>
                    <option value="partial">Partial</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Notification ID</label>
                  <input type="text" value={editPos.notification_id || ''} onChange={e => setEditPos({...editPos, notification_id: e.target.value})} className="w-full p-3 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1">Part Group</label>
                    <select value={editPos.part_group || ''} onChange={e => setEditPos({...editPos, part_group: e.target.value})} className="w-full p-3 border rounded-lg bg-white">
                      <option value="">(None)</option>
                      <option value="NS">NS</option>
                      <option value="SUB">SUB</option>
                      <option value="NS+SUB">NS+SUB</option>
                      <option value="A-Rank">A-Rank</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1">Notif Type</label>
                    <select value={editPos.notif_type || ''} onChange={e => setEditPos({...editPos, notif_type: e.target.value})} className="w-full p-3 border rounded-lg bg-white">
                      <option value="">(None)</option>
                      <option value="OTC">OTC</option>
                      <option value="EXERA2">EXERA2</option>
                      <option value="EXERA3">EXERA3</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editPos.has_ns} onChange={e => setEditPos({...editPos, has_ns: e.target.checked})} className="w-4 h-4" /> NS</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editPos.has_sub} onChange={e => setEditPos({...editPos, has_sub: e.target.checked})} className="w-4 h-4" /> SUB</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editPos.is_a_rank} onChange={e => setEditPos({...editPos, is_a_rank: e.target.checked})} className="w-4 h-4" /> A-Rank</label>
                </div>
              </div>
            ) : (
              <div className="p-8 space-y-6">
                {selectedPos.status === 'free' ? (
                  <div className="text-center py-8">
                    <p className="text-2xl font-bold text-emerald-600 mb-2">Position is Free</p>
                    <p className="text-slate-500">This slot is currently empty and available for storage.</p>
                  </div>
                ) : (
                  <>
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
                        On {selectedPos.timestamp ? new Date(selectedPos.timestamp).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {!editMode && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                {globalEditMode && (
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setEditPos({ ...selectedPos });
                    }}
                    className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors text-lg"
                  >
                    Edit Position
                  </button>
                )}
                <button
                  onClick={() => setSelectedPos(null)}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-lg"
                >
                  Close View
                </button>
              </div>
            )}

            {editMode && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setSaving(true);
                    const res = await adminUpdatePosition(globalPin, editPos!);
                    setSaving(false);
                    if (res.success) {
                      fetchData();
                      setSelectedPos(null);
                    } else {
                      alert(res.message || 'Failed to update');
                    }
                  }}
                  disabled={saving}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global PIN Modal */}
      {showGlobalPinModal && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Enable Edit Mode</h3>
            <p className="text-slate-600 mb-6">Enter Admin PIN to unlock drag-and-drop and position editing.</p>
            
            <input 
              type="password" 
              value={tempPin} 
              onChange={e => setTempPin(e.target.value)} 
              placeholder="Enter Admin PIN" 
              className="w-full p-4 border-2 border-slate-300 rounded-xl text-center font-mono text-xl focus:border-emerald-500 outline-none mb-4"
              autoFocus
            />
            
            <div className="flex gap-4">
              <button
                onClick={() => { setShowGlobalPinModal(false); setTempPin(''); }}
                className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const res = await verifyPin(tempPin);
                  if (res.success) {
                    setGlobalPin(tempPin);
                    setGlobalEditMode(true);
                    setShowGlobalPinModal(false);
                    setTempPin('');
                  } else {
                    alert('Invalid PIN');
                    setTempPin('');
                  }
                }}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
