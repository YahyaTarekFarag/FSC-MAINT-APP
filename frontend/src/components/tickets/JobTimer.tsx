import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Play } from 'lucide-react';
import type { Database } from '../../lib/supabase';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export default function JobTimer() {
    const navigate = useNavigate();
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [elapsed, setElapsed] = useState<string>('00:00:00');

    const checkActiveJob = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('tickets') as any)
            .select('*')
            .eq('technician_id', user.id)
            .eq('status', 'in_progress')
            .single();

        if (data) {
            setActiveTicket(data);
        } else {
            setActiveTicket(null);
        }
    }, []);

    useEffect(() => {
        const runCheck = () => {
            checkActiveJob().catch(console.error);
        };

        // Initial check
        runCheck();

        // Poll every 30s
        const interval = setInterval(runCheck, 30000);

        return () => clearInterval(interval);
    }, [checkActiveJob]);

    useEffect(() => {
        if (!activeTicket?.started_at) return;

        const start = new Date(activeTicket.started_at).getTime();

        const tick = setInterval(() => {
            const now = new Date().getTime();
            const diff = now - start;

            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(tick);
    }, [activeTicket?.started_at]);

    if (!activeTicket) return null;

    return (
        <div
            onClick={() => navigate(`/tickets/${activeTicket.id}`)}
            className="fixed bottom-24 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-400/30 flex items-center gap-2 cursor-pointer animate-in slide-in-from-bottom-4 active:scale-95 transition-all md:hidden"
        >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="pr-1 pl-3">
                <p className="text-[10px] opacity-80 font-bold">المهمة النشطة</p>
                <p className="font-mono font-bold text-sm tracking-widest">{elapsed}</p>
            </div>
        </div>
    );
}
