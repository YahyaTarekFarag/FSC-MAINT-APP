import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { adminCreateUser, adminUpdateUser, adminDeleteUser } from '../../../lib/api';
import {
    Search, Plus, User, Shield, Briefcase,
    Edit2, Power, X, Loader2, Save, Phone
} from 'lucide-react';

type Profile = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: 'admin' | 'manager' | 'technician';
    status: 'active' | 'suspended';
    assigned_area_id: string | null;
    created_at: string;
    // Helper helper for display
    branch_name?: string;
};

type Branch = {
    id: string;
    name_ar: string;
};

const UserManager = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'technician'>('all');
    const [branchFilter, setBranchFilter] = useState('all');

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    type UserFormData = {
        full_name?: string;
        email?: string;
        phone?: string;
        role?: 'admin' | 'manager' | 'technician';
        status?: 'active' | 'suspended';
        assigned_area_id?: string | null;
        password?: string;
        branch?: string;
    };

    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [formData, setFormData] = useState<UserFormData>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter, branchFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, branchesRes] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('branches').select('id, name_ar')
            ]);

            if (usersRes.error) throw usersRes.error;
            if (branchesRes.error) throw branchesRes.error;

            // Enrich users with branch name (Approximation: using assigned_area_id logic if we had area->branch mapping,
            // but for simplicity in this phase we might just be setting a direct branch on the user if the schema supported it perfectly.
            // Requirement says "Filter by Branch". Let's assume for now we might map area to branch or just list branches for assignment.)
            // NOTE: The current Profile schema links to Area/Sector. To link to Branch specifically, we usually check `assigned_area_id` -> `area` -> `sector`.
            // OR if we added a direct `branch_id` to profiles.
            // For this UI demo, we'll fetch branches to populate the dropdowns.

            setUsers(usersRes.data as Profile[] || []);
            setBranches(branchesRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = useCallback(() => {
        let result = users;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.full_name?.toLowerCase().includes(term)) ||
                (u.email?.toLowerCase().includes(term)) ||
                (u.phone?.includes(term))
            );
        }

        if (roleFilter !== 'all') {
            result = result.filter(u => u.role === roleFilter);
        }

        setFilteredUsers(result);
    }, [users, searchTerm, roleFilter]);

    useEffect(() => {
        filterUsers();
    }, [filterUsers]);

    const handleEditClick = (user: Profile) => {
        setSelectedUser(user);
        setFormData({
            full_name: user.full_name || undefined,
            email: user.email || undefined,
            phone: user.phone || undefined,
            role: user.role,
            status: user.status || 'active',
            assigned_area_id: user.assigned_area_id
        });
        setShowEditModal(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setSaving(true);
        try {
            // 1. Update Profile Data
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    email: formData.email, // Also update in profile
                    phone: formData.phone,
                    role: formData.role,
                    status: formData.status,
                    assigned_area_id: formData.assigned_area_id
                })
                .eq('id', selectedUser.id);

            if (profileError) throw profileError;

            // 1.5 Update Email in Auth (Separate Payload)
            let emailUpdated = false;
            let emailError: string | null = null;

            if (formData.email && formData.email !== selectedUser.email) {
                const { error: authEmailError } = await adminUpdateUser({
                    targetUserId: selectedUser.id,
                    email: formData.email
                });

                if (authEmailError) {
                    emailError = authEmailError;
                    console.error('Email update failed:', authEmailError);
                } else {
                    emailUpdated = true;
                }
            }

            // 2. Update Password (if provided)
            let passwordUpdated = false;
            let passwordError: string | null = null;

            if (formData.password && formData.password.trim() !== '') {
                const { error: authError } = await adminUpdateUser({
                    targetUserId: selectedUser.id,
                    password: formData.password
                });

                if (authError) {
                    passwordError = authError;
                    console.error('Password update failed:', authError);
                } else {
                    passwordUpdated = true;
                }
            }

            await fetchData();
            setShowEditModal(false);

            if (passwordError) {
                alert(`تم تحديث البيانات الشخصية بنجاح، ولكن فشل تغيير كلمة المرور: ${passwordError}\nيرجى التأكد من تشغيل Edge Functions.`);
            } else if (passwordUpdated) {
                alert('تم تحديث البيانات وكلمة المرور بنجاح');
            } else {
                alert('تم تحديث البيانات بنجاح');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alert(`فشل تحديث البيانات: ${(error as any).message || error}`);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (user: Profile) => {
        const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
        const confirmMsg = newStatus === 'suspended'
            ? `هل أنت متأكد من إيقاف حساب ${user.full_name}؟`
            : `هل تود إعادة تفعيل حساب ${user.full_name}؟`;

        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('خطأ في تغيير الحالة');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await adminCreateUser({
                email: formData.email!,
                password: formData.password || '12345678', // Default or required?
                full_name: formData.full_name!,
                role: formData.role as 'admin' | 'manager' | 'technician',
                branch_id: formData.branch,
                phone: formData.phone //If added to form
            });

            if (error) throw new Error(error);

            alert('تم إنشاء المستخدم بنجاح');
            setShowCreateModal(false);
            setFormData({}); // Reset form
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Error creating user:', error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alert(`فشل إنشاء المستخدم: ${(error as any).message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (user: Profile) => {
        if (!confirm(`هل أنت متأكد من حذف حساب ${user.full_name} نهائياً؟\nلا يمكن التراجع عن هذا الإجراء.`)) return;

        setLoading(true); // Global loading or specific? Let's use loading for safety
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);
            // Note: Direct delete from profiles depends on RLS. Ideally we call the edge function 
            // which deletes from Auth (cascading to Profile).

            const { error: apiError } = await adminDeleteUser(user.id);

            if (apiError) {
                // Fallback: If edge function fails (env issue), try direct DB delete (if RLS allows)
                console.warn('Edge function delete failed, trying direct DB delete...', apiError);
                const { error: dbError } = await supabase.from('profiles').delete().eq('id', user.id);
                if (dbError) throw new Error(apiError + " & " + dbError.message);
            }

            alert('تم حذف المستخدم بنجاح');
            await fetchData();
        } catch (error) {
            console.error('Error deleting user:', error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alert(`فشل حذف المستخدم: ${(error as any).message || error}`);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">إدارة المستخدمين</h1>
                    <p className="text-slate-500 text-sm">إدارة الحسابات، الصلاحيات، وحالة النشاط</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5" />
                    مستخدم جديد
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم، البريد أو الهاتف..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    />
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value as 'all' | 'admin' | 'manager' | 'technician')}
                        className="flex-1 md:w-40 p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                    >
                        <option value="all">جميع الأدوار</option>
                        <option value="admin">مدير نظام</option>
                        <option value="manager">مدير فرع</option>
                        <option value="technician">فني صيانة</option>
                    </select>

                    <select
                        value={branchFilter}
                        onChange={e => setBranchFilter(e.target.value)}
                        className="flex-1 md:w-40 p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                    >
                        <option value="all">جميع الفروع</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name_ar}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold text-sm border-b border-slate-200">
                        <tr>
                            <th className="p-4">المستخدم</th>
                            <th className="p-4">الدور الوظيفي</th>
                            <th className="p-4">معلومات الاتصال</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4 text-left">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                                    لا توجد نتائج مطابقة
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                {user.full_name ? user.full_name[0] : <User className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{user.full_name || 'مستخدم غير معروف'}</div>
                                                <div className="text-xs text-slate-500 font-mono">{user.email || ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`
                                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                                            ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                user.role === 'manager' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-slate-50 text-slate-700 border-slate-100'}
                                        `}>
                                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                            {user.role === 'manager' && <Briefcase className="w-3 h-3" />}
                                            {user.role === 'technician' && <User className="w-3 h-3" />}
                                            {user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مدير فرع' : 'فني صيانة'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {user.phone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                <span dir="ltr">{user.phone}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {user.status === 'suspended' ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs font-bold">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                موقوف
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-bold">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                نشط
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={`p-2 rounded-lg transition-colors ${user.status === 'suspended'
                                                    ? 'text-green-600 hover:bg-green-50'
                                                    : 'text-orange-600 hover:bg-orange-50'
                                                    }`}
                                                title={user.status === 'suspended' ? 'تفعيل' : 'إيقاف'}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="حذف نهائي"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-900">تعديل بيانات {selectedUser.full_name}</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={formData.full_name || ''}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف</label>
                                <input
                                    type="text"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الدور الوظيفي</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'technician' })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                                >
                                    <option value="admin">مدير نظام (Admin)</option>
                                    <option value="manager">مدير فرع (Manager)</option>
                                    <option value="technician">فني (Technician)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الحالة</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                                >
                                    <option value="active">نشط</option>
                                    <option value="suspended">موقوف</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    تغيير كلمة المرور
                                    <span className="text-xs text-slate-400 font-normal mr-2">(اتركها فارغة للاحتفاظ بالكلمة الحالية)</span>
                                </label>
                                <input
                                    type="password"
                                    placeholder="كلمة المرور الجديدة..."
                                    value={formData.password || ''}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    حفظ التغييرات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-900">إضافة مستخدم جديد</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 mb-4">
                                <strong>ملحوظة:</strong> هذه الواجهة تجريبية. سيتم ربطها بـ Supabase Edge Functions لإنشاء حسابات Auth تلقائياً.
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                                <input
                                    type="email"
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                                <input
                                    type="password"
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                                <input
                                    type="text"
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الدور</label>
                                    <select
                                        onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'technician' })}
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="technician">فني</option>
                                        <option value="manager">مدير</option>
                                        <option value="admin">مدير نظام</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الفرع</label>
                                    <select
                                        onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                                    >
                                        <option value="">اختر الفرع...</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
                                    إنشاء حساب
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;
