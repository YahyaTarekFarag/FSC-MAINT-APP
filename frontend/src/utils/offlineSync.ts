import { openDB } from 'idb';
import type { DBSchema } from 'idb';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────
interface ClosureData {
    [key: string]: string | number | boolean | null | string[];
}

interface OfflineDB extends DBSchema {
    closures: {
        key: string;
        value: {
            id: string;
            ticketId: string;
            data: ClosureData;
            timestamp: number;
            retryCount: number;
        };
    };
}

// ─── Constants ──────────────────────────────────────
const DB_NAME = 'maint-app-offline-db';
const STORE_NAME = 'closures';
const MAX_RETRIES = 5;

// ─── Database Init ──────────────────────────────────
export const initDB = async () => {
    return openDB<OfflineDB>(DB_NAME, 2, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            // Version 2: retryCount field added (backwards compatible)
        },
    });
};

// ─── Save (with QuotaExceeded handling) ─────────────
export const saveClosureOffline = async (ticketId: string, data: ClosureData): Promise<string | null> => {
    try {
        const db = await initDB();
        const id = crypto.randomUUID();
        await db.put(STORE_NAME, {
            id,
            ticketId,
            data,
            timestamp: Date.now(),
            retryCount: 0,
        });
        console.log('Saved closure offline:', id);
        return id;
    } catch (err: unknown) {
        // Handle storage quota exceeded
        if (
            err instanceof DOMException &&
            (err.name === 'QuotaExceededError' || err.code === 22)
        ) {
            console.error('Storage quota exceeded:', err);
            toast.error('مساحة التخزين ممتلئة! يرجى حذف بعض البيانات أو الاتصال بالإنترنت لمزامنة البيانات المعلقة.');
            return null;
        }
        console.error('Failed to save offline closure:', err);
        toast.error('فشل حفظ البيانات محلياً');
        return null;
    }
};

// ─── Retrieve ───────────────────────────────────────
export const getOfflineClosures = async () => {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
};

// ─── Remove ─────────────────────────────────────────
export const removeOfflineClosure = async (id: string) => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
};

// ─── Sync with Retry Queue ──────────────────────────
export const syncClosures = async (
    syncFunction: (item: { ticketId: string; data: ClosureData }) => Promise<void>
) => {
    if (!navigator.onLine) return;

    const items = await getOfflineClosures();
    if (items.length === 0) return;

    console.log(`Syncing ${items.length} offline closures...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
        try {
            await syncFunction(item);
            await removeOfflineClosure(item.id);
            successCount++;
            console.log('Synced and removed:', item.id);
        } catch (error) {
            failCount++;
            console.error('Failed to sync item:', item.id, error);

            // Increment retry count
            const currentRetries = item.retryCount || 0;
            if (currentRetries >= MAX_RETRIES) {
                // Max retries reached — remove the item and notify
                await removeOfflineClosure(item.id);
                console.warn(`Item ${item.id} exceeded max retries (${MAX_RETRIES}), removed.`);
                toast.error(`فشل مزامنة بلاغ بعد ${MAX_RETRIES} محاولات. تم حذفه.`);
            } else {
                // Update retry count for next attempt
                try {
                    const db = await initDB();
                    await db.put(STORE_NAME, {
                        ...item,
                        retryCount: currentRetries + 1,
                    });
                } catch (updateErr) {
                    console.error('Failed to update retry count:', updateErr);
                }
            }
        }
    }

    // Show summary toast
    if (successCount > 0) {
        toast.success(`تمت مزامنة ${successCount} بلاغ بنجاح ✅`);
    }
    if (failCount > 0 && failCount < items.length) {
        toast(`${failCount} بلاغ لم تتم مزامنته — ستتم المحاولة مجدداً`, { icon: '⚠️' });
    }
};
