
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Plus, X, Shield, ShieldCheck } from 'lucide-react';

interface Area {
    id: string;
    name_ar: string;
    sector_id: string;
}

interface Technician {
    id: string;
    full_name: string;
    role: string;
}

interface Assignment {
    id: string;
    area_id: string;
    technician_id: string;
    assignment_type: 'primary' | 'backup';
    technician: Technician; // Joined
}

export default function AssignmentManager() {
    const [areas, setAreas] = useState<Area[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const [selectedTech, setSelectedTech] = useState<string>('');
    const [type, setType] = useState<'primary' | 'backup'>('primary');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [areasRes, techsRes, assignsRes] = await Promise.all([
                supabase.from('areas').select('*').order('name_ar'),
                supabase.from('profiles').select('id, full_name, role').eq('role', 'technician').order('full_name'),
                supabase.from('area_tech_assignments').select('*, technician:profiles(id, full_name, role)')
            ]);

            if (areasRes.error) throw areasRes.error;
            if (techsRes.error) throw techsRes.error;
            if (assignsRes.error) throw assignsRes.error;

            setAreas(areasRes.data || []);
            setTechnicians(techsRes.data || []);
            setAssignments(assignsRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedArea || !selectedTech) return;

        try {
            const { data, error } = await supabase
                .from('area_tech_assignments')
                .insert({
                    area_id: selectedArea,
                    technician_id: selectedTech,
                    assignment_type: type
                })
                .select('*, technician:profiles(id, full_name, role)')
                .single();

            if (error) throw error;
            setAssignments([...assignments, data]);
            setSelectedTech('');
        } catch (err) {
            alert('Error assigning technician (check if already assigned): ' + (err as any).message);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            const { error } = await supabase.from('area_tech_assignments').delete().eq('id', id);
            if (error) throw error;
            setAssignments(assignments.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">إدارة توزيع الفنيين (Workforce Assignments)</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Areas List */}
                <div className="bg-white rounded-lg border p-4 h-[calc(100vh-200px)] overflow-y-auto">
                    <h2 className="font-semibold mb-4 text-slate-700">المناطق ({areas.length})</h2>
                    <div className="space-y-2">
                        {areas.map(area => {
                            const areaAssigns = assignments.filter(a => a.area_id === area.id);
                            const primary = areaAssigns.find(a => a.assignment_type === 'primary');

                            return (
                                <button
                                    key={area.id}
                                    onClick={() => setSelectedArea(area.id)}
                                    className={`w-full text-right p-3 rounded-md border flex justify-between items-center transition-colors ${selectedArea === area.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="font-medium text-slate-800">{area.name_ar}</span>
                                    <div className="flex gap-1">
                                        {primary ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full" title={primary.technician.full_name}>
                                                مغطى
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                                غير مغطى
                                            </span>
                                        )}
                                        {areaAssigns.length > 1 && (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                +{areaAssigns.length - 1}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Assignment Details */}
                <div className="lg:col-span-2 bg-white rounded-lg border p-6">
                    {selectedArea ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800">
                                    تعيينات منطقة: {areas.find(a => a.id === selectedArea)?.name_ar}
                                </h2>
                            </div>

                            {/* Add New Assignment */}
                            <div className="bg-slate-50 p-4 rounded-lg flex items-end gap-3 mb-6 border border-slate-200">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الفني</label>
                                    <select
                                        className="w-full border rounded-md p-2"
                                        value={selectedTech}
                                        onChange={e => setSelectedTech(e.target.value)}
                                    >
                                        <option value="">اختر فني...</option>
                                        {technicians.map(t => (
                                            <option key={t.id} value={t.id}>{t.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الدور</label>
                                    <select
                                        className="w-full border rounded-md p-2"
                                        value={type}
                                        onChange={e => setType(e.target.value as any)}
                                    >
                                        <option value="primary">رئيسي</option>
                                        <option value="backup">احتياطي</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedTech}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    إضافة
                                </button>
                            </div>

                            {/* Active Assignments List */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-600 mb-2">الفنيين المعينين حالياً</h3>
                                {assignments.filter(a => a.area_id === selectedArea).length === 0 ? (
                                    <p className="text-slate-400 text-sm">لا يوجد فنيين معينين لهذه المنطقة بعد.</p>
                                ) : (
                                    assignments.filter(a => a.area_id === selectedArea).map(assign => (
                                        <div key={assign.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${assign.assignment_type === 'primary' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {assign.assignment_type === 'primary' ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{assign.technician.full_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {assign.assignment_type === 'primary' ? 'فني أساسي (Primary)' : 'فني احتياطي (Backup)'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(assign.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                            <p>قم باختيار منطقة من القائمة الجانبية للبدء وتوزيع الفنيين</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
