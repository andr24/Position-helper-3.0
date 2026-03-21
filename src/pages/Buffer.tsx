import { useState, useEffect } from 'react';
import { getBuffer, moveFromBuffer } from '../api';
import { Layers, Clock, User, Package, ArrowRightToLine } from 'lucide-react';

export default function Buffer() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadBuffer = () => {
    getBuffer().then(data => {
      setItems(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadBuffer();
  }, []);

  const handleMove = async (id: number) => {
    setMovingId(id);
    setMessage(null);
    try {
      const res = await moveFromBuffer(id);
      if (res.success) {
        setMessage({ text: `Successfully moved to ${res.position}`, type: 'success' });
        loadBuffer();
      } else {
        setMessage({ text: res.message || 'Failed to move item', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setMovingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-2xl">Loading Buffer...</div>;

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers size={32} className="text-amber-500" />
          <h2 className="text-3xl font-bold">Buffer Storage</h2>
        </div>
        <div className="bg-amber-100 text-amber-800 px-4 py-1 rounded-full font-bold">
          {items.length} Items Waiting
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl font-bold text-center animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <p className="text-slate-500">
        Items in the buffer must be manually moved to the warehouse when space becomes available.
      </p>

      <div className="flex-1 overflow-auto bg-white rounded-3xl shadow-xl border border-slate-200">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <Package size={64} />
            <span className="text-xl">Buffer is empty</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="p-4 font-bold text-slate-600">Notification ID</th>
                <th className="p-4 font-bold text-slate-600">Part</th>
                <th className="p-4 font-bold text-slate-600">Type</th>
                <th className="p-4 font-bold text-slate-600">Operator</th>
                <th className="p-4 font-bold text-slate-600">Time</th>
                <th className="p-4 font-bold text-slate-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-600">{item.notification_id}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      item.part_group === 'NS' ? 'bg-purple-100 text-purple-700' :
                      item.part_group === 'SUB' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.part_group}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{item.notif_type}</td>
                  <td className="p-4 flex items-center gap-2 text-slate-600">
                    <User size={14} />
                    {item.operator}
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleMove(item.id)}
                      disabled={movingId !== null}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl font-bold transition-all active:scale-95"
                    >
                      {movingId === item.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ArrowRightToLine size={18} />
                      )}
                      Move to Slot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
