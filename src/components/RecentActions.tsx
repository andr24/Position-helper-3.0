import React from 'react';
import { LogEntry } from '../types';
import { Clock, Package, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface RecentActionsProps {
  logs: LogEntry[];
  type: 'STORE' | 'PICK';
  title: string;
}

export default function RecentActions({ logs, type, title }: RecentActionsProps) {
  const filteredLogs = logs
    .filter(log => log.action === type)
    .slice(0, 10); // Show last 10

  const getNotificationId = (details: string) => {
    // For STORE: "Stored NS for 12345 at A-1..."
    // For PICK: "Picked 12345 from A-1..."
    const parts = details.split(' ');
    if (type === 'STORE') return parts[3] || 'Unknown';
    if (type === 'PICK') return parts[1] || 'Unknown';
    return 'Unknown';
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-200 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${type === 'STORE' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
          {type === 'STORE' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 italic">
            No recent {type.toLowerCase()} actions
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono font-bold text-slate-900">{getNotificationId(log.details)}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{log.details}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
