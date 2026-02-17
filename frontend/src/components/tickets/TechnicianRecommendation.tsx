import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import { MapPin, Briefcase, Battery, CheckCircle2, Loader2 } from 'lucide-react';
import { calculateDistance } from '../../utils/helpers';

type TechnicianWorkload = Database['public']['Views']['technician_workload_view']['Row'];

interface TechnicianRecommendationProps {
    branchLat: number | null;
    branchLng: number | null;
    onSelect: (technicianId: string) => void;
    selectedTechId: string;
}

const TechnicianRecommendation: React.FC<TechnicianRecommendationProps> = ({
    branchLat,
    branchLng,
    onSelect,
    selectedTechId
}) => {
    const [technicians, setTechnicians] = useState<(TechnicianWorkload & { distance: number | null; score: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTechs = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('technician_workload_view')
                    .select('*');

                if (error) throw error;

                // enrich with distance and calc score
                const enriched = (data as TechnicianWorkload[] || []).map(t => {
                    let distance = null;
                    if (branchLat && branchLng && t.last_lat && t.last_lng) {
                        distance = calculateDistance(branchLat, branchLng, t.last_lat, t.last_lng);
                    }

                    // Score Logic (Lower is better)
                    // Base score: 0
                    // Distance penalty: +1 per km
                    // Workload penalty: +5 per active ticket
                    // Status check: if checked_out, massive penalty (+1000)

                    let score = 0;
                    if (distance !== null) score += distance; // 1km = 1 point
                    score += (t.active_tickets * 5);
                    if (t.current_status === 'check_out') score += 1000;

                    return { ...t, distance, score };
                });

                // Sort by score
                enriched.sort((a, b) => a.score - b.score);

                setTechnicians(enriched);
            } catch (err) {
                console.error('Error fetching recommendations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTechs();
    }, [branchLat, branchLng]);

    if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-3">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                اقتراحات التعيين الذكي
            </h3>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {technicians.map((tech, idx) => (
                    <div
                        key={tech.technician_id}
                        onClick={() => onSelect(tech.technician_id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between
                            ${selectedTechId === tech.technician_id
                                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                            }
                            ${tech.current_status === 'check_out' ? 'opacity-60 grayscale' : ''}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm
                                ${tech.active_tickets > 3 ? 'bg-red-500' : 'bg-blue-500'}
                            `}>
                                {tech.full_name?.charAt(0) || 'T'}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    {tech.full_name}
                                    {idx === 0 && tech.current_status === 'check_in' && (
                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">الأفضل</span>
                                    )}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span className="flex items-center gap-1" title="التذاكر النشطة">
                                        <Battery className="w-3 h-3" />
                                        {tech.active_tickets} نشط
                                    </span>
                                    {tech.distance !== null && (
                                        <span className="flex items-center gap-1" title="المسافة للفرع">
                                            <MapPin className="w-3 h-3" />
                                            {tech.distance.toFixed(1)} كم
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {selectedTechId === tech.technician_id && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}

                        {tech.current_status === 'check_out' && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">غير متاح</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TechnicianRecommendation;
