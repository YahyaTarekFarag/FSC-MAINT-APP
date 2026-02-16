import React, { useEffect, useState, useCallback } from 'react';
import {
    Users,
    Search,
    Edit2,
    Shield,
    MapPin,
    Briefcase,
    Loader2,
    Filter,
    User
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/supabase';
import StaffForm from './StaffForm';

type ProfileWithRelations = Database['public']['Tables']['profiles']['Row'] & {
    area: { name_ar: string } | null;
    sector: { name_ar: string } | null;
};

const StaffList: React.FC = () => {
    const [staff, setStaff] = useState<ProfileWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            // Supabase join syntax for profiles -> areas/sectors
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          *,
          area:areas (name_ar),
          sector:sectors (name_ar)
        `)
                .order('full_name');

            if (error) throw error;
            setStaff((data as unknown) as ProfileWithRelations[]);
        } catch (err) {
            console.error('Error fetching staff:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const filteredStaff = staff.filter(s => {
        const matchesSearch = (s.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.specialization || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || s.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const roleConfig = {
        admin: { label: 'مسؤول نظام', color: 'bg-red-50 text-red-600 border-red-100' },
        manager: { label: 'مدير', color: 'bg-blue-50 text-blue-600 border-blue-100' },
        technician: { label: 'فني', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">إدارة الموظفين</h1>
                    <p className="text-slate-500 mt-1">إدارة صلاحيات وتكليفات فرق العمل</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Staff Table Section */}
                <div className={`flex-1 space-y-4 transition-all duration-500 ${isFormOpen ? 'hidden lg:block lg:opacity-50 pointer-events-none' : ''}`}>
                    {/* Search & Filters */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="بحث باسم الموظف أو التخصص..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shrink-0 w-full md:w-auto">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 outline-none p-1"
                            >
                                <option value="all">كل الرتب</option>
                                <option value="admin">مسؤول نظام</option>
                                <option value="manager">مديرين</option>
                                <option value="technician">فنيين</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">الموظف</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest text-center">الرتبة</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">التكليف / النطاق</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center">
                                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">جاري تحميل بيانات الفريق...</p>
                                            </td>
                                        </tr>
                                    ) : filteredStaff.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center space-y-4">
                                                <Users className="w-12 h-12 text-slate-200 mx-auto" />
                                                <p className="text-slate-400 font-bold">لم يتم العثور على نتائج</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStaff.map((person) => (
                                            <tr key={person.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0 border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors overflow-hidden">
                                                            <User className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{person.full_name || 'بانتظار الاسم'}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                                <Briefcase className="w-3 h-3" />
                                                                {person.specialization || 'لا يوجد تخصص'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${roleConfig[person.role].color}`}>
                                                        {roleConfig[person.role].label}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-slate-50 rounded-lg">
                                                            {person.role === 'admin' ? (
                                                                <Shield className="w-4 h-4 text-slate-400" />
                                                            ) : (
                                                                <MapPin className="w-4 h-4 text-blue-500" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-sm">
                                                                {person.role === 'admin' ? 'صلاحيات شاملة' :
                                                                    person.role === 'manager' ? (person.sector?.name_ar || 'غير محدد') :
                                                                        (person.area?.name_ar || 'غير محدد')}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold">
                                                                {person.role === 'manager' ? 'قطاع إشرافي' :
                                                                    person.role === 'technician' ? 'منطقة العمل' : 'إدارة النظام'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center justify-center">
                                                        <button
                                                            onClick={() => {
                                                                setEditingProfile(person);
                                                                setIsFormOpen(true);
                                                            }}
                                                            className="px-4 py-2 bg-white border border-slate-100 text-slate-500 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                            تعديل
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Side Panel Form (Modal Pattern) */}
                {isFormOpen && (
                    <div className="w-full lg:w-[450px] bg-white rounded-4xl border border-blue-100 shadow-2xl shadow-blue-500/10 p-8 h-fit lg:sticky lg:top-24 slide-in-from-left duration-500">
                        <StaffForm
                            profile={editingProfile!}
                            onClose={() => setIsFormOpen(false)}
                            onSuccess={() => {
                                setIsFormOpen(false);
                                fetchStaff();
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffList;
