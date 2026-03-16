import React, { useState, useEffect } from 'react';
import { pickItem, getItem, getLogs } from '../api';
import { Position, LogEntry } from '../types';
import { Loader2, CheckCircle, AlertCircle, Search, Package, MapPin, Tag } from 'lucide-react';
import RecentActions from '../components/RecentActions';

interface PickProps {
  onComplete: () => void;
}

export default function Pick({ onComplete }: PickProps) {
  const [notificationId, setNotificationId] = useState('');
  const [userName, setUserName] = useState(localStorage.getItem('kiosk_operator_name') || '');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const handleNameChange = (name: string) => {
    setUserName(name);
    localStorage.setItem('kiosk_operator_name', name);
  };
  const [foundItem, setFoundItem] = useState<Position | null>(null);
  const [result, setResult] = useState<{ success: boolean; message?: string; position?: string } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationId) return;

    setLoading(true);
    setResult(null);
    setFoundItem(null);

    try {
      const res = await getItem(notificationId);
      if (res.success && res.item) {
        if (res.item.status === 'partial') {
          setResult({
            success: false,
            message: `Cannot pick: Store parts are incomplete. The position only contains ${res.item.has_ns ? 'NS' : 'SUB'}, waiting for matching part.`
          });
        } else {
          setFoundItem(res.item);
        }
      } else {
        setResult({ success: false, message: 'Item not found or already picked.' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPick = async () => {
    if (!userName) {
      setResult({ success: false, message: 'Operator name is required to pick.' });
      return;
    }
    setLoading(true);
    try {
      const res = await pickItem(notificationId, userName);
      setResult({
        success: res.success,
        message: res.message,
        position: res.position
      });
      if (res.success) {
        fetchLogs();
      }
    } catch (err) {
      setResult({ success: false, message: 'Network error or server offline.' });
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setFoundItem(null);
    setNotificationId('');
    setResult(null);
  };

  if (result?.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <CheckCircle size={64} />
        </div>
        <h2 className="text-4xl font-bold text-slate-800">Picked Successfully!</h2>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 min-w-[300px]">
          <p className="text-xl text-slate-500 mb-2">Removed Item</p>
          <p className="text-3xl font-mono font-bold text-slate-900">{notificationId}</p>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-lg text-slate-600">Position: <span className="font-bold text-slate-900">{result.position}</span></p>
          </div>
        </div>
        {result.message && (
          <div className="bg-amber-100 text-amber-800 p-4 rounded-xl border border-amber-200 max-w-md font-bold shadow-sm animate-pulse flex items-center gap-3 text-left">
            <AlertCircle className="shrink-0" size={28} />
            <span>{result.message}</span>
          </div>
        )}
        <button
          onClick={onComplete}
          className="mt-8 px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <h2 className="text-3xl font-bold mb-8 text-slate-800">Pick Item</h2>

        {!foundItem ? (
          <form onSubmit={handleSearch} className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Scan or Enter Notification ID</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={notificationId}
                  onChange={e => setNotificationId(e.target.value)}
                  className="w-full text-4xl p-6 pl-16 border-2 border-slate-300 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono"
                  placeholder="12345"
                  autoFocus
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={40} />
              </div>
            </div>

            {result?.success === false && (
              <div className="p-6 bg-red-50 text-red-700 rounded-xl flex items-center gap-4 text-xl">
                <AlertCircle size={32} />
                <span>{result.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !notificationId}
              className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white text-3xl font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
            >
              {loading && <Loader2 className="animate-spin" size={32} />}
              {loading ? 'Searching...' : 'Find Item'}
            </button>
          </form>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <Package size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Notification ID</p>
                  <p className="text-4xl font-mono font-bold text-slate-900">{foundItem.notification_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
                  <MapPin className="text-emerald-500" size={24} />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Position</p>
                    <p className="text-2xl font-bold text-slate-800">{foundItem.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
                  <Tag className="text-orange-500" size={24} />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Group / Type</p>
                    <p className="text-xl font-bold text-slate-800">
                      {foundItem.part_group} <span className="text-slate-400">/</span> {foundItem.notif_type}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-slate-500 text-sm">Stored by <span className="font-medium text-slate-700">{foundItem.user_name}</span> on {new Date(foundItem.timestamp!).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Operator (Required)</label>
              <input
                type="text"
                required
                value={userName}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                placeholder="Operator Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={resetSearch}
                className="py-6 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xl font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPick}
                disabled={loading || !userName}
                className="py-6 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading && <Loader2 className="animate-spin" />}
                {loading ? 'Picking...' : 'Confirm Pick'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <RecentActions logs={logs} type="PICK" title="Recently Picked" />
      </div>
    </div>
  );
}

