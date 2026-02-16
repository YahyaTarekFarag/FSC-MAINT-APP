import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ReportTicket {
    id: string;
    ticket_number: number;
    created_at: string;
    closed_at: string | null;
    status: string;
    priority: string;
    category: { name_ar: string } | null;
    branch: { name_ar: string } | null;
    technician: { full_name: string } | null;
    repair_cost: number;
    description: string;
}

export const generateExcelReport = (tickets: ReportTicket[]) => {
    // 1. Map data to Arabic headers
    const data = tickets.map(t => ({
        'رقم البلاغ': t.ticket_number,
        'تاريخ الإنشاء': format(new Date(t.created_at), 'yyyy/MM/dd HH:mm', { locale: ar }),
        'تاريخ الإغلاق': t.closed_at ? format(new Date(t.closed_at), 'yyyy/MM/dd HH:mm', { locale: ar }) : '-',
        'الفرع': t.branch?.name_ar || 'غير محدد',
        'التصنيف': t.category?.name_ar || 'عام',
        'الفني': t.technician?.full_name || 'غير معين',
        'الحالة': getStatusLabel(t.status),
        'الأولوية': getPriorityLabel(t.priority),
        'التكلفة': t.repair_cost || 0,
        'الوصف': t.description
    }));

    // 2. Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. Set Column Widths
    const wscols = [
        { wch: 10 }, // ID
        { wch: 20 }, // Created
        { wch: 20 }, // Closed
        { wch: 20 }, // Branch
        { wch: 15 }, // Category
        { wch: 20 }, // Technician
        { wch: 15 }, // Status
        { wch: 10 }, // Priority
        { wch: 10 }, // Cost
        { wch: 50 }, // Description
    ];
    worksheet['!cols'] = wscols;

    // 4. Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Report');

    // 5. Generate File Name
    const fileName = `Maintenance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    // 6. Download
    XLSX.writeFile(workbook, fileName);
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        open: 'مفتوح',
        in_progress: 'جاري العمل',
        closed: 'مغلق',
        on_hold: 'معلق'
    };
    return labels[status] || status;
};

const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
        low: 'منخفض',
        medium: 'متوسط',
        high: 'عالي',
        critical: 'حرج'
    };
    return labels[priority] || priority;
};
