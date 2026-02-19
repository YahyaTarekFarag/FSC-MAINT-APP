import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGeoLocation } from './useGeoLocation';
import toast from 'react-hot-toast';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'pending_approval';

export function useTicketActions() {
    const [loading, setLoading] = useState<string | null>(null);
    const { getCoordinates } = useGeoLocation();

    const updateStatus = async (ticketId: string, newStatus: TicketStatus, metadata: any = {}) => {
        setLoading(ticketId);
        try {
            let coords = null;
            if (newStatus === 'in_progress' || newStatus === 'resolved' || newStatus === 'closed') {
                try {
                    coords = await getCoordinates();
                } catch (e) {
                    // Coordinates optional
                }
            }

            const updateData: any = {
                status: newStatus,
                updated_at: new Date().toISOString(),
                ...metadata
            };

            if (coords) {
                if (newStatus === 'in_progress') {
                    updateData.start_work_lat = coords.latitude;
                    updateData.start_work_lng = coords.longitude;
                    updateData.started_at = new Date().toISOString();
                } else if (newStatus === 'resolved' || newStatus === 'closed') {
                    updateData.end_work_lat = coords.latitude;
                    updateData.end_work_lng = coords.longitude;
                    if (newStatus === 'resolved') updateData.resolved_at = new Date().toISOString();
                    if (newStatus === 'closed') updateData.closed_at = new Date().toISOString();
                }
            }

            const { error } = await (supabase
                .from('tickets') as any)
                .update(updateData)
                .eq('id', ticketId);

            if (error) throw error;

            toast.success(`تم تحديث الحالة إلى ${newStatus} بنجاح`);
            return true;
        } catch (error: any) {
            toast.error(`فشل تحديث الحالة: ${error.message}`);
            return false;
        } finally {
            setLoading(null);
        }
    };

    return {
        updateStatus,
        loadingAction: loading
    };
}
