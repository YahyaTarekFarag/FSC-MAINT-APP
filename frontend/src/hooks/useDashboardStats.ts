import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TicketWithBranch = Database['public']['Tables']['tickets']['Row'] & {
    branch: Database['public']['Tables']['branches']['Row'] & {
        brand: Database['public']['Tables']['brands']['Row'];
    };
};

export interface DashboardStats {
    total: number;
    open: number;
    emergency: number;
    closedToday: number;
    statusDistribution: { name: string; value: number; key?: string }[];
    categoryDistribution: { name: string; value: number }[];
    recentTickets: TicketWithBranch[];
    loading: boolean;
    error: string | null;
}

const statusLabels: Record<string, string> = {
    open: 'مفتوح',
    in_progress: 'قيد التنفيذ',
    closed: 'مغلق'
};

export const useDashboardStats = (userProfile: Profile | null): DashboardStats => {
    const [stats, setStats] = useState<DashboardStats>({
        total: 0,
        open: 0,
        emergency: 0,
        closedToday: 0,
        statusDistribution: [],
        categoryDistribution: [],
        recentTickets: [],
        loading: true,
        error: null
    });

    const fetchStats = useCallback(async () => {
        if (!userProfile) {
            setStats(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            setStats(prev => ({ ...prev, loading: true }));

            // Build Base Query
            let query = supabase
                .from('tickets')
                .select(`
          *,
          branch:branches!inner(
            *,
            brand:brands(*)
          )
        `);

            // Role-based filtering
            if (userProfile.role === 'technician' && userProfile.assigned_area_id) {
                query = query.eq('branch.area_id', userProfile.assigned_area_id);
            }

            const { data: tickets, error } = await query;
            if (error) throw error;

            const allTickets = (tickets as unknown) as TicketWithBranch[];

            // 1. KPI Calculations
            const total = allTickets.length;
            const open = allTickets.filter(t => t.status === 'open').length;
            const emergency = allTickets.filter(t => t.priority === 'critical' || t.priority === 'high').length;

            const today = new Date().toISOString().split('T')[0];
            const closedToday = allTickets.filter(t =>
                t.status === 'closed' && t.updated_at.startsWith(today)
            ).length;

            // 2. Status Distribution (Pie Chart)
            const statusCounts = allTickets.reduce((acc: Record<string, number>, t) => {
                acc[t.status] = (acc[t.status] || 0) + 1;
                return acc;
            }, {});
            const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
                name: statusLabels[status] || status,
                value: count,
                key: status
            }));

            // 3. Category Distribution (Bar Chart)
            const categoryCounts = allTickets.reduce((acc: Record<string, number>, t) => {
                acc[t.fault_category] = (acc[t.fault_category] || 0) + 1;
                return acc;
            }, {});
            const categoryDistribution = Object.entries(categoryCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            // 4. Recent Tickets
            const recentTickets = [...allTickets]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5);

            setStats({
                total,
                open,
                emergency,
                closedToday,
                statusDistribution,
                categoryDistribution,
                recentTickets,
                loading: false,
                error: null
            });

        } catch (err: any) {
            console.error('Error fetching dashboard stats:', err);
            setStats(prev => ({ ...prev, loading: false, error: err.message }));
        }
    }, [userProfile]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return stats;
};
