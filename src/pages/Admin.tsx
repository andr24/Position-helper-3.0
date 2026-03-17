import React, { useState, useRef, useEffect } from 'react';
import { verifyPin, getRules, saveRules, changePin, getLogs, getSettings, updateSettings } from '../api';
import { exportToExcel, importFromExcel } from '../services/excel';
import { ColumnRule } from '../types';
import { Lock, Save, Loader2, Download, Upload, List, Server, Settings2 } from 'lucide-react';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const [rules, setRules] = useState<ColumnRule[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'settings' | 'logs'>('rules');
  const [newPin, setNewPin] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated]);

  const fetchData = async () => {
    setLoading(true);
    const [rulesData, logsData, settingsData] = await Promise.all([getRules(), getLogs(), getSettings()]);
    setRules(rulesData);
    setLogs(logsData);
    setSettings(settingsData);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyPin(pin);
    if (res.success) {
      setAuthenticated(true);
    } else {
      setError('Invalid PIN');
      setPin('');
    }
  };

  const handleSaveRules = async () => {
    setLoading(true);
    await saveRules(rules);
    setLoading(false);
    alert('Rules saved successfully!');
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await updateSettings(newSettings);
  };

  const handleChangePin = async () => {
    if (newPin.length < 4) return alert('PIN must be at least 4 digits');
    await changePin(newPin);
    alert('PIN changed!');
    setNewPin('');
  };

  const updateRule = (index: number, field: keyof ColumnRule, value: any) => {
    const newRules = [...rules];
    (newRules[index] as any)[field] = value;
    setRules(newRules);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (window.confirm('WARNING: Importing an Excel file will OVERWRITE the current positions and settings. Proceed?')) {
      setLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const res = await importFromExcel(buffer);
        alert(res.message);
        if (res.success) window.location.reload();
      } catch (err) {
        alert('Failed to read file.');
      }
      setLoading(false);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-6">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              className="w-full text-center text-4xl p-4 border-2 border-slate-300 rounded-xl focus:border-slate-500 outline-none font-mono tracking-widest"
              placeholder="0000"
              maxLength={4}
              autoFocus
            />
            {error && <p className="text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold text-lg hover:bg-slate-900"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Admin Settings</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'rules' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
          >
            Column Rules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-2 rounded-lg font-bold ${activeTab === 'logs' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
          >
            Action Logs
          </button>
        </div>
      </div>

      {activeTab === 'rules' && (
        <div className="flex-1 overflow-auto bg-white rounded-2xl shadow border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b">Col</th>
                <th className="p-4 border-b">Enabled</th>
                <th className="p-4 border-b">Priority</th>
                <th className="p-4 border-b">Cap</th>
                {settings.disable_type_logic !== 'true' && (
                  <>
                    <th className="p-4 border-b">NS</th>
                    <th className="p-4 border-b">SUB</th>
                    <th className="p-4 border-b">OTC</th>
                    <th className="p-4 border-b">EXERA2</th>
                    <th className="p-4 border-b">EXERA3</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={rule.col_id} className="hover:bg-slate-50 border-b last:border-0">
                  <td className="p-4 font-bold">{rule.col_id}</td>
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={!!rule.enabled}
                      onChange={e => updateRule(idx, 'enabled', e.target.checked ? 1 : 0)}
                      className="w-6 h-6 accent-emerald-600"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={rule.priority}
                      onChange={e => updateRule(idx, 'priority', parseInt(e.target.value))}
                      className="w-16 p-2 border rounded text-center"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={rule.capacity}
                      onChange={e => updateRule(idx, 'capacity', parseInt(e.target.value))}
                      className="w-16 p-2 border rounded text-center"
                    />
                  </td>
                  {settings.disable_type_logic !== 'true' && (
                    <>
                      <td className="p-4"><input type="checkbox" checked={!!rule.allow_ns} onChange={e => updateRule(idx, 'allow_ns', e.target.checked ? 1 : 0)} className="w-5 h-5" /></td>
                      <td className="p-4"><input type="checkbox" checked={!!rule.allow_sub} onChange={e => updateRule(idx, 'allow_sub', e.target.checked ? 1 : 0)} className="w-5 h-5" /></td>
                      <td className="p-4"><input type="checkbox" checked={!!rule.allow_otc} onChange={e => updateRule(idx, 'allow_otc', e.target.checked ? 1 : 0)} className="w-5 h-5" /></td>
                      <td className="p-4"><input type="checkbox" checked={!!rule.allow_exera2} onChange={e => updateRule(idx, 'allow_exera2', e.target.checked ? 1 : 0)} className="w-5 h-5" /></td>
                      <td className="p-4"><input type="checkbox" checked={!!rule.allow_exera3} onChange={e => updateRule(idx, 'allow_exera3', e.target.checked ? 1 : 0)} className="w-5 h-5" /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 bg-white rounded-2xl shadow p-8 overflow-y-auto">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings2 size={24} /> General Settings</h3>
          <div className="max-w-md mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Disable Type Logic</p>
                <p className="text-sm text-slate-500">Hide Type selection in Store and ignore column type rules.</p>
              </div>
              <button
                onClick={() => handleUpdateSetting('disable_type_logic', settings.disable_type_logic === 'true' ? 'false' : 'true')}
                className={`w-14 h-8 rounded-full transition-colors relative ${settings.disable_type_logic === 'true' ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.disable_type_logic === 'true' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-4">Security</h3>
          <div className="max-w-md mb-8">
            <label className="block mb-2 font-medium">Change Admin PIN</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className="flex-1 p-3 border rounded-lg font-mono"
                placeholder="New PIN"
                maxLength={4}
              />
              <button
                onClick={handleChangePin}
                className="px-6 py-3 bg-slate-800 text-white rounded-lg font-bold"
              >
                Update
              </button>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-4">Server Status</h3>
          <div className="max-w-md">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
              <p className="text-blue-800 font-medium flex items-center gap-2">
                <Server size={20} />
                Connected to Local Server
              </p>
              <p className="text-blue-600 text-sm mt-1">
                Data is being synced in real-time with the host PC database.
              </p>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-4 mt-8">Excel Data Management</h3>
          <div className="max-w-md bg-slate-50 p-6 border border-slate-200 rounded-xl space-y-4">
            <p className="text-slate-600 text-sm mb-4">Export the current database to an Excel file, or restore a previously exported file. Warning: Importing will overwrite the current database.</p>

            <button
              onClick={async () => {
                setLoading(true);
                const res = await exportToExcel();
                setLoading(false);
                if (!res.success) alert(res.message);
              }}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 relative disabled:opacity-50"
            >
              <Download size={20} />
              Export to Excel
            </button>

            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={20} />
              Import from Excel
            </button>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex-1 bg-white rounded-2xl shadow border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2"><List size={24} /> Action Logs</h3>
            <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm font-bold">{logs.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-4 border-b">Timestamp</th>
                  <th className="p-4 border-b">Action</th>
                  <th className="p-4 border-b">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No logs found.</td></tr>}
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-bold">
                      <span className={`px-2 py-1 rounded text-xs ${log.action === 'STORE' ? 'bg-emerald-100 text-emerald-700' : log.action === 'PICK' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveRules}
            disabled={loading}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
