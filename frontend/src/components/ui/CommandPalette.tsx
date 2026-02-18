import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    PlusCircle,
    Users,
    MapPin,
    FileText,
    Search,
    Wrench,
    LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Adjust path if needed

export const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    // Toggle with Cmd+K or Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-200 p-0"
            overlayClassName="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9998]"
        >
            <div className="flex items-center border-b border-slate-100 px-4" dir="rtl">
                <Search className="w-5 h-5 text-slate-400 ml-3" />
                <Command.Input
                    placeholder="ابحث عن صفحة أو إجراء..."
                    className="w-full h-14 outline-none text-slate-700 placeholder:text-slate-400 bg-transparent text-right"
                />
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto p-2" dir="rtl">
                <Command.Empty className="py-6 text-center text-sm text-slate-500">
                    لا توجد نتائج.
                </Command.Empty>

                <Command.Group heading="الصفحات الرئيسية" className="text-xs font-bold text-slate-400 px-2 py-1 mb-1">
                    <CommandItem icon={LayoutDashboard} onSelect={() => runCommand(() => navigate('/dashboard'))}>
                        لوحة التحكم
                    </CommandItem>
                    <CommandItem icon={FileText} onSelect={() => runCommand(() => navigate('/tickets'))}>
                        البلاغات
                    </CommandItem>
                    <CommandItem icon={Users} onSelect={() => runCommand(() => navigate('/staff'))}>
                        الموظفين
                    </CommandItem>
                    <CommandItem icon={MapPin} onSelect={() => runCommand(() => navigate('/branches'))}>
                        الفروع
                    </CommandItem>
                    <CommandItem icon={Wrench} onSelect={() => runCommand(() => navigate('/admin/assets'))}>
                        الأصول
                    </CommandItem>
                </Command.Group>

                <Command.Group heading="إجراءات سريعة" className="text-xs font-bold text-slate-400 px-2 py-1 mb-1 mt-2">
                    <CommandItem icon={PlusCircle} onSelect={() => runCommand(() => navigate('/tickets/new'))} shortcut="N">
                        إنشاء بلاغ جديد
                    </CommandItem>
                    <CommandItem icon={LogOut} onSelect={() => runCommand(async () => {
                        await supabase.auth.signOut();
                        navigate('/login');
                    })}>
                        تسجيل الخروج
                    </CommandItem>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
};

interface CommandItemProps {
    children: React.ReactNode;
    icon: LucideIcon;
    onSelect: () => void;
    shortcut?: string;
}

// Helper Item Component
const CommandItem = ({ children, icon: Icon, onSelect, shortcut }: CommandItemProps) => {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-slate-700 hover:bg-slate-100 cursor-pointer aria-selected:bg-slate-100 transition-colors group"
        >
            <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="flex-1">{children}</span>
            {shortcut && (
                <kbd className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                    {shortcut}
                </kbd>
            )}
        </Command.Item>
    );
};
