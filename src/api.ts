import { Position, ColumnRule, StoreResponse, PickResponse } from './types';

export async function getServerInfo(): Promise<{ url: string; ips: string[]; port: number }> {
  const res = await fetch('/api/server-info');
  return res.json();
}

export async function getPositions(): Promise<Position[]> {
  const res = await fetch('/api/positions');
  return res.json();
}

export async function getRules(): Promise<ColumnRule[]> {
  const res = await fetch('/api/admin/rules');
  return res.json();
}

export async function getLogs(): Promise<any[]> {
  const res = await fetch('/api/logs');
  return res.json();
}

export async function saveRules(rules: ColumnRule[]): Promise<{ success: boolean }> {
  const res = await fetch('/api/admin/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules })
  });
  return res.json();
}

export async function verifyPin(pin: string): Promise<{ success: boolean }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  if (!res.ok) return { success: false };
  return res.json();
}

export async function changePin(newPin: string): Promise<{ success: boolean }> {
  const res = await fetch('/api/admin/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPin })
  });
  return res.json();
}

export async function adminSwapPositions(pin: string, fromId: string, toId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/admin/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, fromId, toId })
  });
  return res.json();
}

export async function adminUpdatePosition(pin: string, position: Position): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/admin/position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, position })
  });
  return res.json();
}

export async function getItem(notificationId: string): Promise<{ success: boolean; item?: Position; message?: string }> {
  const res = await fetch(`/api/item/${notificationId}`);
  if (!res.ok) {
    const data = await res.json();
    return { success: false, message: data.message || 'Item not found' };
  }
  return res.json();
}

export async function storeItem(data: {
  notificationId: string;
  partGroup: string;
  notifType: string;
  operator?: string;
}): Promise<StoreResponse> {
  const res = await fetch('/api/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function pickItem(notificationId: string, operator: string): Promise<PickResponse> {
  const res = await fetch('/api/pick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId, operator })
  });
  return res.json();
}

export async function getSettings(): Promise<Record<string, string>> {
  const res = await fetch('/api/admin/settings');
  return res.json();
}

export async function updateSettings(settings: Record<string, string>): Promise<{ success: boolean }> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  });
  return res.json();
}

export async function importData(data: any): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/admin/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
