import React, { useState, useEffect, useRef } from 'react';
import { storeItem, getLogs } from '../api';
import { Loader2, CheckCircle, AlertCircle, List, User } from 'lucide-react';
import { LogEntry } from '../types';
import RecentActions from '../components/RecentActions';

interface StoreProps {
  onComplete: () => void;
}

export default function Store({ onComplete }: StoreProps) {
  const [storeMode, setStoreMode] = useState<'single' | 'bulk'>('single');
  const [formData, setFormData] = useState({
    notificationId: '',
    bulkNotifications: '',
    partGroup: 'NS',
    notifType: 'OTC',
    userName: localStorage.getItem('kiosk_operator_name') || ''
  });

  const notificationInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus appropriate input based on mode
    if (storeMode === 'single') {
      notificationInputRef.current?.focus();
    } else {
      bulkInputRef.current?.focus();
    }
  }, [storeMode]);

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, userName: name });
    localStorage.setItem('kiosk_operator_name', name);
  };
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; position?: string; bulkResults?: any[] } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLogs();
    fetchSettings();
  }, []);

  const handleNumericInput = (val: string, field: 'notificationId' | 'bulkNotifications') => {
    // Remove any non-numeric characters for single ID
    if (field === 'notificationId') {
      const numericVal = val.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [field]: numericVal }));
    } else {
      // For bulk, keep newlines/commas but we'll clean them on submit
      setFormData(prev => ({ ...prev, [field]: val }));
    }
  };

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
      if (storeMode === 'single') {
        const res = await storeItem({
          notificationId: formData.notificationId,
          partGroup: formData.partGroup,
          notifType: formData.notifType,
          operator: formData.userName
        });
        setResult({
          success: res.success,
          message: res.message,
          position: res.position
        });
        if (res.success) fetchLogs();
      } else {
        // Bulk mode
        const ids = formData.bulkNotifications
          .split(/[\n,]/)
          .map(id => id.trim())
          .filter(id => id.length > 0 && /^\d+$/.test(id));
        
        if (ids.length === 0) {
          setResult({ success: false, message: 'No valid numeric IDs found in list.' });
          setLoading(false);
          return;
        }

        const bulkResults = [];
        for (const id of ids) {
          try {
            const res = await storeItem({
              notificationId: id,
              partGroup: formData.partGroup,
              notifType: formData.notifType,
              operator: formData.userName
            });
            bulkResults.push({ id, success: res.success, position: res.position, message: res.message });
          } catch (err) {
            bulkResults.push({ id, success: false, message: 'Server error' });
          }
        }
        
        setResult({
          success: true,
          bulkResults
        });
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
      <div className="flex flex-col items-center justify-center min-h-full text-center space-y-6 animate-in fade-in zoom-in duration-300 py-8">
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle size={64} />
        </div>
        <h2 className="text-4xl font-bold text-slate-800">
          {storeMode === 'bulk' ? 'Batch Completed' : 'Stored Successfully!'}
        </h2>

        {storeMode === 'single' ? (
          <>
            <div className="space-y-2">
              <p className="text-xl text-slate-500 font-medium uppercase tracking-wider">Notification</p>
              <p className="text-5xl font-mono font-black text-slate-900">{formData.notificationId}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xl text-slate-500 font-medium uppercase tracking-wider">Position</p>
              <p className="text-6xl font-mono font-black text-emerald-600">{result.position}</p>
            </div>
          </>
        ) : (
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-slate-50 p-4 font-bold text-slate-500 border-b border-slate-200">
              <span>Notification</span>
              <span>Position</span>
              <span>Result</span>
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {result.bulkResults?.map((res, i) => (
                <div key={i} className="grid grid-cols-3 p-4 border-b border-slate-100 items-center">
                  <span className="font-mono font-bold">{res.id}</span>
                  <span className="font-mono text-emerald-600 font-bold">{res.position || '-'}</span>
                  <span className={res.success ? 'text-green-600' : 'text-red-500 text-sm'}>
                    {res.success ? 'Success' : res.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => {
              setFormData({ ...formData, notificationId: '', bulkNotifications: '' });
              setResult(null);
            }}
            className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl text-xl hover:bg-emerald-700 transition shadow-lg"
          >
            {storeMode === 'bulk' ? 'Start New Batch' : 'Store Another'}
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
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Store Materials</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStoreMode('single')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${storeMode === 'single' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Single
            </button>
            <button
              onClick={() => setStoreMode('bulk')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${storeMode === 'bulk' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bulk
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {storeMode === 'single' ? (
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Notification ID</label>
              <input
                ref={notificationInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={formData.notificationId}
                onChange={e => handleNumericInput(e.target.value, 'notificationId')}
                className="w-full text-3xl p-4 border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-mono"
                placeholder="Scan or enter notification"
              />
              <p className="text-sm text-slate-400 mt-2">Only numbers allowed</p>
            </div>
          ) : (
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Bulk Notification IDs</label>
              <textarea
                ref={bulkInputRef}
                required
                rows={5}
                value={formData.bulkNotifications}
                onChange={e => handleNumericInput(e.target.value, 'bulkNotifications')}
                className="w-full text-2xl p-4 border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-mono leading-relaxed"
                placeholder="Enter notifications separated by new lines"
              />
              <p className="text-sm text-slate-400 mt-2">Invalid or non-numeric IDs will be ignored</p>
            </div>
          )}

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
              placeholder="Operator"
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
