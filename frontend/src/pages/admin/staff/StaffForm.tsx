import { useEffect, useState } from 'react';
import {
    X,
    Loader2,
    UserCircle2,
    ShieldCheck,
    ChevronDown,
    CheckCircle2,
    AlertCircle,
    Cpu,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Sector = Database['public']['Tables']['sectors']['Row'];
type Area = Database['public']['Tables']['areas']['Row'];
type Skill = Database['public']['Tables']['technician_skills']['Row'];

interface StaffFormProps {
    profile: Profile;
    onClose: () => void;
    onSuccess: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ profile, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [sectors, setSectors] = useState<Sector[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        full_name: profile.full_name || '',
        role: profile.role,
        specialization: profile.specialization || '',
        assigned_sector_id: profile.assigned_sector_id || '',
        assigned_area_id: profile.assigned_area_id || ''
    });

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [sectorsRes, areasRes, skillsRes, profileSkillsRes] = await Promise.all([
                supabase.from('sectors').select('*').order('name_ar'),
                supabase.from('areas').select('*').order('name_ar'),
                (supabase.from('technician_skills') as any).select('*').order('name'),
                (supabase.from('profile_skills') as any).select('skill_id').eq('profile_id', profile.id)
            ]);

            if (sectorsRes.error) throw sectorsRes.error;
            if (areasRes.error) throw areasRes.error;
            if (skillsRes.error) throw skillsRes.error;

            setSectors(sectorsRes.data || []);
            setAreas(areasRes.data || []);
            setAllSkills(skillsRes.data || []);
            setSelectedSkills((profileSkillsRes.data || []).map((ps: any) => ps.skill_id));
        } catch (err) {
            console.error('Error fetching metadata:', err);
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userRole = formData.role?.toLowerCase();
            const updateData: Partial<Profile> = {
                full_name: formData.full_name,
                role: formData.role,
                specialization: formData.specialization,
                // Reset irrelevant assignments based on role
                assigned_sector_id: userRole === 'manager' ? formData.assigned_sector_id : null,
                assigned_area_id: userRole === 'technician' ? formData.assigned_area_id : null
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase
                .from('profiles') as any)
                .update(updateData)
                .eq('id', profile.id);

            if (error) throw error;

            // Sync Skills
            // 1. Delete removed
            await (supabase.from('profile_skills') as any).delete().eq('profile_id', profile.id);
            // 2. Insert new
            if (selectedSkills.length > 0) {
                const skillInserts = selectedSkills.map(sid => ({
                    profile_id: profile.id,
                    skill_id: sid,
                    proficiency_level: 3
                }));
                await (supabase.from('profile_skills') as any).insert(skillInserts);
            }
            // 3. Re-fetch skills to update state after sync
            const profileSkillsRes = await supabase.from('profile_skills').select('*').eq('profile_id', profile.id);
            if (!profileSkillsRes.error && profileSkillsRes.data) {
                setSelectedSkills(profileSkillsRes.data.map((ps: any) => ps.skill_id));
            }

            onSuccess();
        } catch (err: unknown) {
            console.error('Error updating profile:', err);
            const message = err instanceof Error ? err.message : 'خطأ غير معروف';
            alert('خطأ في تحديث بيانات الحساب: ' + message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl">
                        <UserCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    تعديل بيانات الحساب
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">الاسم الكامل</label>
                    <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    />
                </div>

                {/* Role Select */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        الصلاحية (الرتبة)
                    </label>
                    <div className="relative">
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                        >
                            <option value="admin">مسؤول نظام (Admin)</option>
                            <option value="manager">مدير منطقة (Manager)</option>
                            <option value="technician">فني صيانة (Technician)</option>
                        </select>
                        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Specialization / Job Title */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">المسمى الوظيفي / التخصص</label>
                    <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        placeholder="مثال: فني تكييف، مدير قطاع الصعيد..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    />
                </div>

                {/* Dynamic Assignment */}
                {formData.role === 'manager' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-sm font-bold text-slate-700 block">توجيه إلى قطاع (Sector)</label>
                        <div className="relative">
                            <select
                                required
                                value={formData.assigned_sector_id}
                                onChange={(e) => setFormData({ ...formData, assigned_sector_id: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="">اختر القطاع المسؤول عنه...</option>
                                {sectors.map(s => (
                                    <option key={s.id} value={s.id}>{s.name_ar}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {formData.role === 'technician' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-sm font-bold text-slate-700 block">توجيه إلى منطقة (Area)</label>
                        <div className="relative">
                            <select
                                required
                                value={formData.assigned_area_id}
                                onChange={(e) => setFormData({ ...formData, assigned_area_id: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="">اختر المنطقة المسؤول عنها...</option>
                                {areas.map(a => (
                                    <option key={a.id} value={a.id}>{a.name_ar}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                {formData.role === 'admin' && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 text-blue-700">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold leading-relaxed">
                            بصفته مسؤول نظام (Admin)، يتمتع هذا المستخدم بصلاحيات وصول شاملة لجميع القطاعات والفروع دون الحاجة لتوجيه جغرافي محدد.
                        </p>
                    </div>
                )}

                {/* Skill Matrix (Only for Technicians) */}
                {formData.role === 'technician' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-500">
                        <label className="text-sm font-bold text-slate-700 block flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-600" />
                            مصفوفة المهارات (Skill Matrix)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {allSkills.map(skill => (
                                <button
                                    key={skill.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSkills(prev =>
                                            prev.includes(skill.id)
                                                ? prev.filter(id => id !== skill.id)
                                                : [...prev, skill.id]
                                        );
                                    }}
                                    className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${selectedSkills.includes(skill.id)
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                                        }`}
                                >
                                    {skill.name}
                                    {selectedSkills.includes(skill.id) && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                        حفظ وتحديث البيانات
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffForm;
