import * as XLSX from 'xlsx';

export const exportToExcel = (data: Record<string, any>[], fileName: string) => {
    // 1. Convert JSON to Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Set Column Widths (Optional but good for UX)
    const wscols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    worksheet['!cols'] = wscols;

    // 3. Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

    // 4. Write File
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const formatTicketsForExport = (tickets: any[]) => { // Keeping any[] for input flexibility but output is specific
    return tickets.map(t => ({
        'رقم البلاغ': t.id,
        'العنوان': t.title,
        'الحالة': t.status,
        'الأولوية': t.priority,
        'الفرع': t.branch_name || '-',
        'الفني': t.technician_name || '-',
        'التكلفة': t.repair_cost || 0,
        'تاريخ الإنشاء': new Date(t.created_at).toLocaleDateString('ar-EG'),
        'وصف العطل': t.description || '-'
    }));
};
