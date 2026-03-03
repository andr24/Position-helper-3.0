import { useEffect, useRef, useCallback } from 'react';

/**
 * Detects barcode scanner input (rapid keystrokes finishing with Enter).
 * Calls onScan with the scanned value when detected.
 */
export function useBarcodeScanner(onScan: (value: string) => void) {
    const bufferRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if user is focused on an input/textarea (let normal typing work)
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === 'Enter' && bufferRef.current.length >= 3) {
            // Scanner finished — fire callback
            onScan(bufferRef.current);
            bufferRef.current = '';
            if (timerRef.current) clearTimeout(timerRef.current);
            e.preventDefault();
            return;
        }

        // Only accept printable characters
        if (e.key.length === 1) {
            bufferRef.current += e.key;

            // Reset buffer after 100ms of inactivity (scanner is fast, typing is slow)
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                bufferRef.current = '';
            }, 100);
        }
    }, [onScan]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
