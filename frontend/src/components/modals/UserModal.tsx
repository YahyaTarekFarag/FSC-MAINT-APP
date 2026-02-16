import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import type { Database } from '../../lib/supabase';

type UserProfile = Database['public']['Tables']['profiles']['Row'];

type UserModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<UserProfile>, password?: string) => Promise<void>;
    user?: UserProfile | null;
    branches: { id: string; name_ar: string }[];
};

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, branches }) => {
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        full_name: '',
        role: 'technician',
        branch_id: '',
        phone: '',
        status: 'active'
    });
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name,
                role: user.role,
                branch_id: user.branch_id || '',
                phone: user.phone || '',
                status: user.status
            });
            setPassword('');
        } else {
            setFormData({
                full_name: '',
                role: 'technician',
                branch_id: '',
                phone: '',
                status: 'active'
            });
            setPassword('');
        }
    }, [user, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData, password);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-900">
                        {user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                        <input
                            required
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الدور الوظيفي</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                            >
                                <option value="technician">فني صيانة</option>
                                <option value="reporter">مبلغ أعطال</option>
                                <option value="manager">مدير فرع</option>
                                <option value="admin">مشرف نظام</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
                            <select
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                                value={formData.branch_id || ''}
                                onChange={e => setFormData({ ...formData, branch_id: e.target.value || null })}
                            >
                                <option value="">بدون فرع</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف</label>
                        <input
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="01xxxxxxxxx"
                        />
                    </div>

                    {!user && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                            <input
                                required
                                type="password"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>
                    )}

                    {user && (
                        <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-yellow-800">حالة الحساب</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'active' })}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${formData.status === 'active' ? 'bg-green-500 text-white' : 'bg-white text-slate-500 border'}`}
                                >
                                    نشط
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'suspended' })}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${formData.status === 'suspended' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 border'}`}
                                >
                                    محظور
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {user ? 'حفظ التغييرات' : 'إنشاء المستخدم'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
