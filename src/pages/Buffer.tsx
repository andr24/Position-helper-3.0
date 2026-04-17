import { useState, useEffect } from 'react';
import { getBuffer } from '../api';
import { Layers, Clock, User, Package } from 'lucide-react';

export default function Buffer() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBuffer().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-2xl">Loading Buffer...</div>;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers size={32} className="text-amber-500" />
          <h2 className="text-3xl font-bold">Buffer Storage</h2>
        </div>
        <div className="bg-amber-100 text-amber-800 px-4 py-1 rounded-full font-bold">
          {items.length} Items Waiting
        </div>
      </div>

      <p className="text-slate-500">
        Items in the buffer will automatically move to the first available position in the warehouse as soon as a slot is freed.
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
