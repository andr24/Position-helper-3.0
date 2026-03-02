import * as XLSX from 'xlsx';
import { getDB } from './database';
import { saveDB, isConnected, basePath } from './filesystem';
import { Position, ColumnRule } from '../types';

export async function exportToExcel(): Promise<{ success: boolean; message?: string }> {
    if (!isConnected() || !basePath) {
        return { success: false, message: 'Database folder not connected.' };
    }

    try {
        const db = getDB();
        const wb = XLSX.utils.book_new();

        // Export Positions
        // Format positions for readability
        const formattedPositions = db.positions.map(p => ({
            Position_ID: p.id,
            Column: p.col_id,
            Row: p.row_idx,
            Status: p.is_a_rank ? 'A-Rank' : p.status,
            Notification_ID: p.notification_id || '',
            Part_Group: p.part_group || '',
            Has_NS: p.has_ns ? 'Yes' : 'No',
            Has_SUB: p.has_sub ? 'Yes' : 'No',
            Notif_Type: p.notif_type || '',
            User_Name: p.user_name || '',
            Timestamp: p.timestamp ? new Date(p.timestamp).toLocaleString() : ''
        }));

        const wsPositions = XLSX.utils.json_to_sheet(formattedPositions);
        XLSX.utils.book_append_sheet(wb, wsPositions, "Positions");

        // Export Rules
        const wsRules = XLSX.utils.json_to_sheet(db.column_rules);
        XLSX.utils.book_append_sheet(wb, wsRules, "ColumnRules");

        // Export Logs
        const wsLogs = XLSX.utils.json_to_sheet(db.logs.map(l => ({
            ...l,
            timestamp: new Date(l.timestamp).toLocaleString()
        })));
        XLSX.utils.book_append_sheet(wb, wsLogs, "Logs");

        // File Dialog using Electron
        const electron = window.require('electron');
        const { ipcRenderer } = electron;
        const saveResult = await ipcRenderer.invoke('save-excel-dialog');

        if (saveResult.canceled || !saveResult.filePath) {
            return { success: false, message: 'Export cancelled' };
        }

        // Write file directly using Node.js
        const wbBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const fs = window.require('fs');
        fs.writeFileSync(saveResult.filePath, wbBuffer);

        return { success: true, message: 'Exported successfully to ' + saveResult.filePath };
    } catch (err: any) {
        console.error('Export error:', err);
        return { success: false, message: 'Export failed: ' + err.message };
    }
}

export async function importFromExcel(): Promise<{ success: boolean; message?: string }> {
    if (!isConnected() || !basePath) {
        return { success: false, message: 'Database folder not connected.' };
    }

    try {
        const electron = window.require('electron');
        const { ipcRenderer } = electron;

        const openResult = await ipcRenderer.invoke('open-excel-dialog');
        if (openResult.canceled || !openResult.filePaths || openResult.filePaths.length === 0) {
            return { success: false, message: 'Import cancelled' };
        }

        const filePath = openResult.filePaths[0];
        const fs = window.require('fs');
        const buffer = fs.readFileSync(filePath);

        // Parse the file
        const wb = XLSX.read(buffer, { type: 'buffer' });

        // We expect "Positions" to exist or we just update rules.
        // For safety, let's only import rules or just overwrite db? The plan said "overwrite/update the local JSON database state"
        // To make it simple, let's just warn that this requires careful data mapping, usually people want to restore back what they exported.

        if (!wb.Sheets['Positions']) {
            return { success: false, message: 'Invalid format: Missing Positions sheet' };
        }

        const positionsRaw: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Positions']);

        const db = getDB();

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
            user_name: row.User_Name || undefined,
            timestamp: row.Timestamp ? new Date(row.Timestamp).toISOString() : undefined
        }));

        // Overwrite the DB positions
        db.positions = newPositions;

        // If rules sheet exists, overwrite rules
        if (wb.Sheets['ColumnRules']) {
            db.column_rules = XLSX.utils.sheet_to_json(wb.Sheets['ColumnRules']);
        }

        // Log the import
        db.logs.push({
            id: Date.now(),
            action: 'IMPORT_EXCEL',
            details: `Imported DB from ${filePath}`,
            timestamp: new Date().toISOString()
        });

        await saveDB();

        return { success: true, message: 'Imported successfully. Database updated.' };
    } catch (err: any) {
        console.error('Import error:', err);
        return { success: false, message: 'Import failed: ' + err.message };
    }
}
