import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Clock, Save, RotateCcw, Shield
} from 'lucide-react';

interface SLA {
    id: string;
    priority_level: string;
    resolution_hours: number;
    color_code: string;
}

const SLAManager = () => {
    const [policies, setPolicies] = useState<SLA[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sla_policies')
            .select('*')
            .order('resolution_hours', { ascending: true });

        if (data) setPolicies(data);
        setLoading(false);
    };

    const handleUpdate = (id: string, field: keyof SLA, value: any) => {
        setPolicies(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            for (const policy of policies) {
                await supabase
                    .from('sla_policies')
                    .update({
                        resolution_hours: policy.resolution_hours,
                        color_code: policy.color_code
                    })
                    .eq('id', policy.id);
            }
            alert('تم حفظ إعدادات SLA بنجاح');
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">اتفاقية مستوى الخدمة (SLA)</h3>
                    <p className="text-sm text-slate-500">تحديد الزمن المستهدف لإغلاق البلاغات حسب الأولوية</p>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                        <tr>
                            <th className="p-4">درجة الأولوية</th>
                            <th className="p-4">الزمن المستهدف (ساعات)</th>
                            <th className="p-4">لون التميز</th>
                            <th className="p-4">مثال حي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {policies.map(policy => (
                            <tr key={policy.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 uppercase">{policy.priority_level}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={policy.resolution_hours}
                                            onChange={(e) => handleUpdate(policy.id, 'resolution_hours', parseInt(e.target.value))}
                                            className="w-24 p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-mono font-bold text-center"
                                        />
                                        <span className="text-slate-500 text-sm">ساعة</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={policy.color_code}
                                            onChange={(e) => handleUpdate(policy.id, 'color_code', e.target.value)}
                                            className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                                        />
                                        <span className="text-xs font-mono text-slate-400">{policy.color_code}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span
                                        className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: policy.color_code }}
                                    >
                                        {policy.priority_level}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">ملاحظة هامة</h4>
                    <p className="text-blue-700 text-xs mt-1">
                        تغيير هذه الإعدادات سيؤثر على حساب مؤشرات الأداء (KPIs) للبلاغات الجديدة فقط. البلاغات الحالية ستستمر على الإعدادات القديمة لحين إغلاقها.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SLAManager;
