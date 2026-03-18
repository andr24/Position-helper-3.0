import * as XLSX from 'xlsx';
import { getPositions, getRules, getLogs, importData } from '../api';
import { Position } from '../types';

export async function exportToExcel(): Promise<{ success: boolean; message?: string }> {
    try {
        const [positions, rules, logs] = await Promise.all([getPositions(), getRules(), getLogs()]);
        const wb = XLSX.utils.book_new();

        // Export Positions
        const formattedPositions = positions.map(p => ({
            Position_ID: p.id,
            Column: p.col_id,
            Row: p.row_idx,
            Status: p.is_a_rank ? 'A-Rank' : p.status,
            Notification_ID: p.notification_id || '',
            Part_Group: p.part_group || '',
            Has_NS: p.has_ns ? 'Yes' : 'No',
            Has_SUB: p.has_sub ? 'Yes' : 'No',
            Notif_Type: p.notif_type || '',
            Operator: p.operator || '',
            Timestamp: p.timestamp ? new Date(p.timestamp).toLocaleString() : ''
        }));

        const wsPositions = XLSX.utils.json_to_sheet(formattedPositions);
        XLSX.utils.book_append_sheet(wb, wsPositions, "Positions");

        // Export Rules
        const wsRules = XLSX.utils.json_to_sheet(rules);
        XLSX.utils.book_append_sheet(wb, wsRules, "ColumnRules");

        // Export Logs
        const wsLogs = XLSX.utils.json_to_sheet(logs.map(l => ({
            ...l,
            timestamp: new Date(l.timestamp).toLocaleString()
        })));
        XLSX.utils.book_append_sheet(wb, wsLogs, "Logs");

        // Browser download
        XLSX.writeFile(wb, 'kiosk_inventory_export.xlsx');

        return { success: true, message: 'Exported successfully' };
    } catch (err: any) {
        console.error('Export error:', err);
        return { success: false, message: 'Export failed: ' + err.message };
    }
}

export async function importFromExcel(buffer: ArrayBuffer): Promise<{ success: boolean; message?: string }> {
    try {
        // Parse the file
        const wb = XLSX.read(buffer, { type: 'buffer' });

        if (!wb.Sheets['Positions']) {
            return { success: false, message: 'Invalid format: Missing Positions sheet' };
        }

        const positionsRaw: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Positions']);

        // Process and overwrite positions
        const newPositions: Position[] = positionsRaw.map(row => ({
            id: row.Position_ID || '',
            col_id: row.Column || '',
            row_idx: row.Row || 0,
            status: row.Status === 'A-Rank' ? 'occupied' : (row.Status as 'free' | 'partial' | 'occupied' || 'free'),
            is_a_rank: row.Status === 'A-Rank',
            has_ns: row.Has_NS === 'Yes',
            has_sub: row.Has_SUB === 'Yes',
            notification_id: row.Notification_ID || undefined,
            part_group: row.Part_Group || undefined,
            notif_type: row.Notif_Type || undefined,
            operator: row.Operator || undefined,
            timestamp: row.Timestamp ? new Date(row.Timestamp).toISOString() : undefined
        }));

        let newRules = undefined;
        // If rules sheet exists, overwrite rules
        if (wb.Sheets['ColumnRules']) {
            newRules = XLSX.utils.sheet_to_json(wb.Sheets['ColumnRules']);
        }

        // Send to backend
        const res = await importData({ positions: newPositions, rules: newRules });

        return { success: res.success, message: res.success ? 'Imported successfully. Database updated.' : res.message };
    } catch (err: any) {
        console.error('Import error:', err);
        return { success: false, message: 'Import failed: ' + err.message };
    }
}
