import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface UISchema {
    title: string;
    description?: string;
    steps: {
        id: string;
        label: string;
        fields: {
            id: string;
            label: string;
            type: 'text' | 'number' | 'select' | 'file' | 'coords' | 'textarea';
            required?: boolean;
            options?: { label: string; value: string | number | boolean; parentId?: string | number }[];
            filterBy?: string;
            dataSource?: string;
            placeholder?: string;
            multiple?: boolean;
            accept?: string;
        }[];
    }[];
    list_config?: {
        allowAdd?: boolean;
        columns: {
            key: string;
            label: string;
            type: 'text' | 'date' | 'badge' | 'avatar';
            colors?: Record<string, string>;
        }[];
        actions: {
            id: string;
            label: string;
            icon: string;
            color: string;
        }[];
    };
    widgets?: {
        id: string;
        type: 'kpi_card' | 'bar_chart' | 'pie_chart' | 'line_chart';
        title: string;
        view?: string;
        column?: string;
        agg?: string;
        format?: 'currency' | 'number' | 'percent';
        xKey?: string;
        yKey?: string;
        groupKey?: string;
        countKey?: string;
        color?: string;
        icon?: string;
        link?: string;
    }[];
}

const FALLBACK_SCHEMAS: Record<string, UISchema> = {
    'ticket_maintenance_v1': {
        "title": "بلاغ صيانة (وضع الطوارئ)",
        "steps": [
            {
                "id": "step1",
                "label": "البيانات الأساسية",
                "fields": [
                    { "id": "branch_id", "label": "الفرع", "type": "select", "required": true, "dataSource": "branches" },
                    { "id": "fault_category", "label": "نوع العطل", "type": "text", "required": true },
                    { "id": "description", "label": "وصف العطل", "type": "textarea", "required": true },
                    { "id": "priority", "label": "الأولوية", "type": "select", "options": [{ "label": "عادي", "value": "low" }, { "label": "عاجل", "value": "high" }] }
                ]
            }
        ],
        "list_config": {
            "columns": [
                { "key": "branch.name_ar", "label": "الفرع", "type": "text" },
                { "key": "fault_category", "label": "نوع العطل", "type": "text" },
                { "key": "status", "label": "الحالة", "type": "badge" },
                { "key": "created_at", "label": "التاريخ", "type": "date" }
            ],
            "actions": [
                { "id": "view", "label": "عرض", "icon": "eye", "color": "blue" },
                { "id": "whatsapp", "label": "واتساب", "icon": "message-circle", "color": "green" }
            ]
        }
    },
    'branches_management_v1': {
        "title": "إدارة الفروع",
        "steps": [
            {
                "id": "info",
                "label": "بيانات الفرع",
                "fields": [
                    { "id": "name_ar", "label": "اسم الفرع", "type": "text", "required": true },
                    { "id": "location", "label": "الموقع", "type": "text", "required": true },
                    { "id": "manager_name", "label": "اسم المدير", "type": "text" },
                    { "id": "phone", "label": "رقم الهاتف", "type": "text" }
                ]
            }
        ],
        "list_config": {
            "allowAdd": true,
            "columns": [
                { "key": "name_ar", "label": "اسم الفرع", "type": "text" },
                { "key": "location", "label": "الموقع", "type": "text" },
                { "key": "manager_name", "label": "المدير", "type": "text" },
                { "key": "is_active", "label": "الحالة", "type": "badge", "colors": { "true": "green", "false": "red" } }
            ],
            "actions": [
                { "id": "edit", "label": "تعديل", "icon": "edit", "color": "amber" },
                { "id": "delete", "label": "أرشفة", "icon": "trash", "color": "red" }
            ]
        }
    },
    'inventory_management_v1': {
        "title": "إدارة المخزون السيادية",
        "steps": [
            {
                "id": "basic",
                "label": "البيانات الأساسية",
                "fields": [
                    { "id": "name_ar", "label": "اسم القطعة", "type": "text", "required": true },
                    { "id": "part_number", "label": "رقم القطعة (SKU)", "type": "text" },
                    { "id": "category_id", "label": "التصنيف", "type": "select", "dataSource": "fault_categories" },
                    { "id": "unit_id", "label": "وحدة القياس", "type": "select", "dataSource": "unit_types" }
                ]
            },
            {
                "id": "stock",
                "label": "المخزون والأسعار",
                "fields": [
                    { "id": "quantity", "label": "الكمية الحالية", "type": "number", "required": true },
                    { "id": "min_threshold", "label": "حد الإنذار", "type": "number", "required": true },
                    { "id": "price", "label": "السعر (ج.م)", "type": "number", "required": true },
                    { "id": "location", "label": "موقع التخزين", "type": "text" }
                ]
            }
        ],
        "list_config": {
            "allowAdd": true,
            "columns": [
                { "key": "name_ar", "label": "القطعة", "type": "text" },
                { "key": "part_number", "label": "SKU", "type": "text" },
                { "key": "quantity", "label": "الكمية", "type": "text" },
                { "key": "price", "label": "السعر", "type": "text" },
                { "key": "is_active", "label": "الحالة", "type": "badge", "colors": { "true": "green", "false": "red" } }
            ],
            "actions": [
                { "id": "edit", "label": "تعديل", "icon": "edit", "color": "amber" },
                { "id": "restock", "label": "إعادة تعبئة", "icon": "trending-up", "color": "blue" },
                { "id": "delete", "label": "أرشفة", "icon": "trash", "color": "red" }
            ]

        }
    },
    'staff_management_v1': {
        "title": "إدارة الكوادر السيادية",
        "description": "إدارة الرتب والصلاحيات والتوجيه الميداني",
        "steps": [
            {
                "id": "personal",
                "label": "البيانات الشخصية",
                "fields": [
                    { "id": "full_name", "label": "الاسم الكامل", "type": "text", "required": true },
                    { "id": "specialization", "label": "التخصص / المسمى الوظيفي", "type": "text" },
                    {
                        "id": "role", "label": "الرتبة", "type": "select", "options": [
                            { "label": "مسؤول نظام (Admin)", "value": "admin" },
                            { "label": "مدير (Manager)", "value": "manager" },
                            { "label": "فني (Technician)", "value": "technician" }
                        ], "required": true
                    }
                ]
            },
            {
                "id": "assignment",
                "label": "التوجيه الجغرافي",
                "fields": [
                    { "id": "assigned_sector_id", "label": "القطاع (للمديرين)", "type": "select", "dataSource": "sectors" },
                    { "id": "assigned_area_id", "label": "المنطقة (للفنيين)", "type": "select", "dataSource": "areas" }
                ]
            }
        ],
        "list_config": {
            "columns": [
                { "key": "full_name", "label": "الموظف", "type": "text" },
                { "key": "role", "label": "الرتبة", "type": "badge", "colors": { "admin": "red", "manager": "blue", "technician": "green" } },
                { "key": "specialization", "label": "التخصص", "type": "text" }
            ],
            "actions": [
                { "id": "edit", "label": "تعديل", "icon": "edit", "color": "blue" }
            ]
        }
    },
    'dashboard_analytics_v1': {
        "title": "غرفة القيادة السيادية",
        "description": "مراقبة الأداء والاستهلاك في الوقت الفعلي",
        "steps": [],
        "widgets": [
            {
                "id": "kpi-spending",
                "type": "kpi_card",
                "title": "إجمالي الإنفاق الشهري",
                "view": "v_sovereign_kpis",
                "column": "monthly_spending",
                "format": "currency",
                "icon": "DollarSign",
                "link": "/admin/finance"
            },
            {
                "id": "kpi-low-stock",
                "type": "kpi_card",
                "title": "أصناف منخفضة المخزون",
                "view": "v_sovereign_kpis",
                "column": "low_stock_items",
                "icon": "AlertTriangle",
                "link": "/admin/inventory"
            },
            {
                "id": "kpi-open-tickets",
                "type": "kpi_card",
                "title": "بلاغات مفتوحة",
                "view": "v_sovereign_kpis",
                "column": "open_tickets",
                "icon": "TrendingUp",
                "link": "/admin/tickets"
            },
            {
                "id": "chart-spending-trend",
                "type": "line_chart",
                "title": "اتجاه الإنفاق الشهري",
                "view": "v_branch_maintenance_trend",
                "xKey": "month",
                "yKey": "monthly_cost",
                "color": "#3b82f6"
            },
            {
                "id": "chart-inventory-health",
                "type": "pie_chart",
                "title": "حالة المخزون",
                "view": "v_inventory_health",
                "groupKey": "health_status"
            },
            {
                "id": "chart-tech-perf",
                "type": "bar_chart",
                "title": "أداء الفنيين (بلاغات مغلقة)",
                "view": "v_technician_performance",
                "xKey": "full_name",
                "yKey": "resolved_tickets",
                "color": "#10b981",
                "link": "/admin/staff"
            },
            {
                "id": "chart-predictive-risk",
                "type": "bar_chart",
                "title": "مخاطر تعطل الأصول (التنبؤي)",
                "view": "v_predictive_asset_health",
                "xKey": "asset_name",
                "yKey": "health_percentage",
                "color": "#f87171",
                "link": "/admin/assets"
            }
        ]
    }
};

export function useUISchema(formKey: string) {
    const [schema, setSchema] = useState<UISchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchSchema() {
            setLoading(true);
            try {
                console.log(`[Sovereign Debug]: Fetching schema for ${formKey}`);
                const { data, error } = await supabase
                    .from('ui_schemas')
                    .select('schema_definition')
                    .eq('form_key', formKey)
                    .eq('is_active', true)
                    .maybeSingle();

                if (error) {
                    console.warn(`[Sovereign Debug]: Supabase error for ${formKey}, falling back`, error);
                    const fallback = FALLBACK_SCHEMAS[formKey];
                    if (fallback) {
                        setSchema(fallback);
                        toast.error('تم تحميل نموذج احتياطي (خطأ في الخادم)');
                    }
                    return;
                }

                const schemaData = data as { schema_definition: UISchema } | null;
                if (!schemaData?.schema_definition) {
                    console.warn(`[Sovereign Debug]: No schema found for ${formKey}, falling back`);
                    const fallback = FALLBACK_SCHEMAS[formKey];
                    if (fallback) {
                        setSchema(fallback);
                        toast.error('تم تحميل نموذج احتياطي (هيكل غير موجود)');
                    }
                    return;
                }

                setSchema(schemaData.schema_definition);
                setError(null);
            } catch (err) {
                console.error(`[Sovereign Debug]: Fatal error in useUISchema for ${formKey}`, err);
                const fallback = FALLBACK_SCHEMAS[formKey];
                if (fallback) setSchema(fallback);
            } finally {
                setLoading(false);
            }
        }

        fetchSchema();
    }, [formKey]);

    return { schema, loading, error };
}

