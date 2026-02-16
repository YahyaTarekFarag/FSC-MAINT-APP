import React, { useState } from 'react';
import { Layers, Map, Store, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectorManager from './SectorManager';
import AreaManager from './AreaManager';
import BranchManager from './BranchManager';

const OrganizationManager = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'sectors' | 'areas' | 'branches'>('sectors');

    const tabs = [
        { id: 'sectors', label: 'القطاعات', icon: Layers },
        { id: 'areas', label: 'المناطق', icon: Map },
        { id: 'branches', label: 'الفروع', icon: Store },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/console')}
                    className="p-2 bg-white rounded-xl hover:bg-slate-50 border border-slate-200"
                >
                    <ArrowRight className="w-5 h-5 text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">الهيكل التنظيمي</h1>
                    <p className="text-slate-500 text-sm">إدارة القطاعات والمناطق والفروع</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit mb-8 mx-auto md:mx-0">
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                                ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-50'}
                            `}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                {activeTab === 'sectors' && <SectorManager />}
                {activeTab === 'areas' && <AreaManager />}
                {activeTab === 'branches' && <BranchManager />}
            </div>
        </div>
    );
};

export default OrganizationManager;
