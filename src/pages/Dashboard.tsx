import React, { useEffect, useState } from 'react';
import { getPositions, getLogs, verifyPin } from '../api';
import { Position } from '../types';
import { BarChart2, Package, PackageMinus, Clock, AlertTriangle, Lock } from 'lucide-react';

interface DailyCount { date: string; stores: number; picks: number; }

function groupByDay(logs: any[]): DailyCount[] {
    const map: Record<string, { stores: number; picks: number }> = {};
    for (const log of logs) {
        const day = new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (!map[day]) map[day] = { stores: 0, picks: 0 };
        const action = (log.action || '').toLowerCase();
        if (action === 'store') map[day].stores++;
        if (action === 'pick') map[day].picks++;
    }
    return Object.entries(map)
        .map(([date, v]) => ({ date, ...v }))
        .slice(-14);
}

export default function Dashboard() {
    const [authenticated, setAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const [positions, setPositions] = useState<Position[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        if (!authenticated) return;
        (async () => {
            setLoading(true);
            try {
                const [pos, lg] = await Promise.all([getPositions(), getLogs()]);
                setPositions(pos);
                setLogs(lg);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [authenticated]);

    if (!authenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-8 text-slate-800">Dashboard Locked</h2>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Enter Admin PIN</label>
                            <input
                                type="password"
                                required
                                autoFocus
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                className="w-full text-center text-4xl tracking-[0.5em] p-4 border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono"
                                maxLength={8}
                            />
                        </div>
                        {error && <p className="text-red-500 text-center font-medium animate-pulse">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const occupied = positions.filter(p => p.status !== 'free');
    const totalStores = logs.filter(l => (l.action || '').toLowerCase() === 'store').length;
    const totalPicks = logs.filter(l => (l.action || '').toLowerCase() === 'pick').length;

    const avgDays = occupied.length > 0
        ? Math.round(occupied.filter(p => p.timestamp).reduce((sum, p) =>
            sum + Math.floor((Date.now() - new Date(p.timestamp!).getTime()) / 86400000), 0
        ) / Math.max(occupied.filter(p => p.timestamp).length, 1))
        : 0;

    const longStored = occupied.filter(p => p.timestamp &&
        Math.floor((Date.now() - new Date(p.timestamp).getTime()) / 86400000) > 14
    );

    const daily = groupByDay(logs);
    const dataMax = Math.max(...daily.map(d => Math.max(d.stores, d.picks)), 1);
    const maxVal = Math.ceil(dataMax / 5) * 5; // Rounds up to nearest 5 for a clean Y-axis scale

    const topOld = [...occupied]
        .filter(p => p.timestamp)
        .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime())
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                <button onClick={() => setAuthenticated(false)} className="text-sm font-bold text-slate-500 hover:text-red-500 transition-colors bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Lock size={14} /> Lock Dashboard
                </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
                {[
                    { icon: <Package size={22} />, label: 'Currently Stored', value: occupied.length, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { icon: <PackageMinus size={22} />, label: 'Total Picks', value: totalPicks, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { icon: <BarChart2 size={22} />, label: 'Total Stores', value: totalStores, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { icon: <Clock size={22} />, label: 'Avg. Days Stored', value: `${avgDays}d`, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(({ icon, label, value, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                        <div className={`${bg} ${color} p-2 rounded-xl`}>{icon}</div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 flex-1 min-h-0">
                {/* Activity chart */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                    <p className="text-sm font-bold text-slate-500 uppercase mb-4 shrink-0">Activity (last 14 days)</p>

                    {daily.length === 0 ? (
                        <p className="text-slate-400 text-sm m-auto">No activity yet</p>
                    ) : (
                        <>
                            {/* Chart container */}
                            <div className="relative flex-1 mt-2 mb-6">

                                {/* Y-axis labels */}
                                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] font-bold text-slate-400 text-right pr-2">
                                    <span>{maxVal}</span>
                                    <span>{Math.round(maxVal / 2)}</span>
                                    <span>0</span>
                                </div>

                                {/* Grid lines */}
                                <div className="absolute left-8 right-0 top-1 bottom-0 flex flex-col justify-between z-0">
                                    <div className="border-t border-slate-100 w-full" />
                                    <div className="border-t border-slate-100 w-full" />
                                    <div className="border-t border-slate-300 w-full" />
                                </div>

                                {/* Bars track */}
                                <div className="absolute left-8 right-0 -top-3 bottom-0 flex gap-2 items-end z-10 pb-1">
                                    {daily.map(d => {
                                        const sPct = (d.stores / maxVal) * 100;
                                        const pPct = (d.picks / maxVal) * 100;

                                        return (
                                            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full relative group">

                                                <div className="flex gap-1 items-end w-full h-full">
                                                    {/* Store bar */}
                                                    <div className="flex-1 flex flex-col items-center justify-end h-full relative">
                                                        {d.stores > 0 && <span className="absolute -top-4 text-[10px] font-bold text-emerald-600 leading-none">{d.stores}</span>}
                                                        <div className="w-full bg-emerald-400 rounded-t-sm transition-all" style={{ height: `${sPct}%`, minHeight: d.stores > 0 ? '4px' : '0' }} />
                                                    </div>

                                                    {/* Pick bar */}
                                                    <div className="flex-1 flex flex-col items-center justify-end h-full relative">
                                                        {d.picks > 0 && <span className="absolute -top-4 text-[10px] font-bold text-blue-600 leading-none">{d.picks}</span>}
                                                        <div className="w-full bg-blue-400 rounded-t-sm transition-all" style={{ height: `${pPct}%`, minHeight: d.picks > 0 ? '4px' : '0' }} />
                                                    </div>
                                                </div>

                                                {/* Date label */}
                                                <span className="absolute -bottom-5 text-[9px] text-slate-400 text-center leading-none w-[150%]">{d.date}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-4 mt-auto shrink-0 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /><span className="text-[11px] font-bold text-slate-500 uppercase">Stores</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400" /><span className="text-[11px] font-bold text-slate-500 uppercase">Picks</span></div>
                            </div>
                        </>
                    )}
                </div>

                {/* Side panel */}
                <div className="w-64 flex flex-col gap-3">
                    {longStored.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 shrink-0">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-red-500" />
                                <p className="text-sm font-bold text-red-700">{longStored.length} item{longStored.length > 1 ? 's' : ''} &gt;14 days</p>
                            </div>
                            <div className="space-y-1">
                                {longStored.slice(0, 4).map(p => {
                                    const d = Math.floor((Date.now() - new Date(p.timestamp!).getTime()) / 86400000);
                                    return (
                                        <div key={p.id} className="flex justify-between text-xs">
                                            <span className="font-bold text-slate-700">{p.id}</span>
                                            <span className="text-red-600 font-semibold">{d}d</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex-1 min-h-0 overflow-auto">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Oldest Items</p>
                        {topOld.length === 0 ? (
                            <p className="text-slate-400 text-sm">No items stored</p>
                        ) : (
                            <div className="space-y-2">
                                {topOld.map(p => {
                                    const d = Math.floor((Date.now() - new Date(p.timestamp!).getTime()) / 86400000);
                                    return (
                                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{p.id}</p>
                                                <p className="text-[10px] text-slate-400">{p.notification_id}</p>
                                            </div>
                                            <span className={`text-sm font-black ${d > 14 ? 'text-red-600' : d > 7 ? 'text-amber-500' : 'text-emerald-600'}`}>{d}d</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
