import React, { useState, useEffect } from 'react';
import { storeItem, getLogs } from '../api';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { LogEntry } from '../types';
import RecentActions from '../components/RecentActions';

interface StoreProps {
  onComplete: () => void;
}

export default function Store({ onComplete }: StoreProps) {
  const [formData, setFormData] = useState({
    notificationId: '',
    partGroup: 'NS',
    notifType: 'OTC',
    userName: localStorage.getItem('kiosk_operator_name') || ''
  });

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, userName: name });
    localStorage.setItem('kiosk_operator_name', name);
  };
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; position?: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLogs();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await fetch('/api/admin/settings').then(r => r.json());
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await storeItem(formData);
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

  if (result?.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle size={64} />
        </div>
        <h2 className="text-4xl font-bold text-slate-800">Stored Successfully!</h2>
        <p className="text-2xl text-slate-600">
          Position: <span className="font-mono font-bold text-slate-900 text-4xl">{result.position}</span>
        </p>

        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => {
              setFormData({ ...formData, notificationId: '' });
              setResult(null);
            }}
            className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl text-xl hover:bg-emerald-700 transition"
          >
            Store Another
          </button>
          <button
            onClick={onComplete}
            className="px-8 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl text-xl hover:bg-slate-300 transition"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <h2 className="text-3xl font-bold mb-8 text-slate-800">Store New Item</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lg font-medium text-slate-700 mb-2">Notification ID</label>
            <input
              type="text"
              required
              value={formData.notificationId}
              onChange={e => setFormData({ ...formData, notificationId: e.target.value })}
              className="w-full text-3xl p-4 border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-mono"
              placeholder="e.g. 12345"
            />
          </div>

          <div className={`grid gap-6 ${settings.disable_type_logic === 'true' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Part Group</label>
              <div className="flex gap-2">
                {['NS', 'SUB', 'A-Rank'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, partGroup: opt })}
                    className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-all ${formData.partGroup === opt
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      } ${opt === 'A-Rank' ? 'text-lg' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {settings.disable_type_logic !== 'true' && (
              <div>
                <label className="block text-lg font-medium text-slate-700 mb-2">Type</label>
                <select
                  value={formData.notifType}
                  onChange={e => setFormData({ ...formData, notifType: e.target.value })}
                  className="w-full text-xl p-4 border-2 border-slate-300 rounded-xl focus:border-emerald-500 outline-none bg-white h-[68px]"
                >
                  <option value="OTC">OTC</option>
                  <option value="EXERA2">EXERA2</option>
                  <option value="EXERA3">EXERA3</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-lg font-medium text-slate-700 mb-2">Operator (Required)</label>
            <input
              type="text"
              required
              value={formData.userName}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
              placeholder="Operator Name"
            />
          </div>

          {result?.success === false && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
              <AlertCircle />
              <span>{result.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Processing...' : 'Find Position & Store'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-1">
        <RecentActions logs={logs} type="STORE" title="Recently Stored" />
      </div>
    </div>
  );
}
