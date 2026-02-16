import { createClient } from '@supabase/supabase-js';

// Define the database types based on our schema
export type Database = {
    public: {
        Tables: {
            brands: {
                Row: { id: string; name_ar: string; logo_url: string | null; created_at: string };
                Insert: { id?: string; name_ar: string; logo_url?: string | null; created_at?: string };
                Update: { id?: string; name_ar?: string; logo_url?: string | null; created_at?: string };
            };
            sectors: {
                Row: { id: string; name_ar: string; created_at: string };
                Insert: { id?: string; name_ar: string; created_at?: string };
                Update: { id?: string; name_ar?: string; created_at?: string };
            };
            areas: {
                Row: { id: string; sector_id: string; name_ar: string; created_at: string };
                Insert: { id?: string; sector_id: string; name_ar: string; created_at?: string };
                Update: { id?: string; sector_id?: string; name_ar?: string; created_at?: string };
            };
            branches: {
                Row: { id: string; area_id: string; brand_id: string; name_ar: string; location_lat: number | null; location_lng: number | null; google_map_link: string | null; created_at: string };
                Insert: { id?: string; area_id: string; brand_id: string; name_ar: string; location_lat?: number | null; location_lng?: number | null; google_map_link?: string | null; created_at?: string };
                Update: { id?: string; area_id?: string; brand_id?: string; name_ar?: string; location_lat?: number | null; location_lng?: number | null; google_map_link?: string | null; created_at?: string };
            };
            profiles: {
                Row: { id: string; full_name: string | null; role: 'admin' | 'manager' | 'technician'; specialization: string | null; assigned_sector_id: string | null; assigned_area_id: string | null; created_at: string };
                Insert: { id: string; full_name?: string | null; role?: 'admin' | 'manager' | 'technician'; specialization?: string | null; assigned_sector_id?: string | null; assigned_area_id?: string | null; created_at?: string };
                Update: { id?: string; full_name?: string | null; role?: 'admin' | 'manager' | 'technician'; specialization?: string | null; assigned_sector_id?: string | null; assigned_area_id?: string | null; created_at?: string };
            };
            fault_categories: {
                Row: { id: string; name_ar: string; created_at: string };
                Insert: { id?: string; name_ar: string; created_at?: string };
                Update: { id?: string; name_ar?: string; created_at?: string };
            };
            category_questions: {
                Row: { id: number; category_id: string; question_text: string; field_type: string; options: string[] | null; is_required: boolean; stage: 'diagnosis' | 'closing'; order_index: number; created_at: string };
                Insert: { id?: number; category_id: string; question_text: string; field_type: string; options?: string[] | null; is_required?: boolean; stage?: 'diagnosis' | 'closing'; order_index?: number; created_at?: string };
                Update: { id?: number; category_id?: string; question_text?: string; field_type?: string; options?: string[] | null; is_required?: boolean; stage?: 'diagnosis' | 'closing'; order_index?: number; created_at?: string };
            };
            tickets: {
                Row: {
                    id: string;
                    branch_id: string;
                    technician_id: string | null;
                    status: 'open' | 'in_progress' | 'closed';
                    priority: 'low' | 'medium' | 'high' | 'urgent';
                    fault_category: string;
                    fault_subcategory: string | null;
                    description: string | null;
                    images_url: string[];
                    created_at: string;
                    updated_at: string;
                    form_data: any;
                    repair_cost: number | null;
                    closed_at: string | null;
                    category_id: string | null;
                    start_work_lat: number | null;
                    start_work_lng: number | null;
                    end_work_lat: number | null;
                    end_work_lng: number | null;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    technician_id?: string | null;
                    status?: 'open' | 'in_progress' | 'closed';
                    priority?: 'low' | 'medium' | 'high' | 'urgent';
                    fault_category: string;
                    fault_subcategory?: string | null;
                    description?: string | null;
                    images_url?: string[];
                    created_at?: string;
                    updated_at?: string;
                    form_data?: any;
                    repair_cost?: number | null;
                    closed_at?: string | null;
                    category_id?: string | null;
                    start_work_lat?: number | null;
                    start_work_lng?: number | null;
                    end_work_lat?: number | null;
                    end_work_lng?: number | null;
                };
                Update: {
                    id?: string;
                    branch_id?: string;
                    technician_id?: string | null;
                    status?: 'open' | 'in_progress' | 'closed';
                    priority?: 'low' | 'medium' | 'high' | 'urgent';
                    fault_category?: string;
                    fault_subcategory?: string | null;
                    description?: string | null;
                    images_url?: string[];
                    created_at?: string;
                    updated_at?: string;
                    form_data?: any;
                    repair_cost?: number | null;
                    closed_at?: string | null;
                    category_id?: string | null;
                    start_work_lat?: number | null;
                    start_work_lng?: number | null;
                    end_work_lat?: number | null;
                    end_work_lng?: number | null;
                };
            };
            ticket_comments: {
                Row: { id: number; ticket_id: string; user_id: string; content: string; created_at: string };
                Insert: { id?: number; ticket_id: string; user_id: string; content: string; created_at?: string };
                Update: { id?: number; ticket_id?: string; user_id?: string; content?: string; created_at?: string };
            };
            spare_parts: {
                Row: { id: number; name_ar: string; part_number: string | null; quantity: number; price: number; minimum_stock: number; created_at: string; updated_at: string };
                Insert: { id?: number; name_ar: string; part_number?: string | null; quantity?: number; price: number; minimum_stock?: number; created_at?: string; updated_at?: string };
                Update: { id?: number; name_ar?: string; part_number?: string | null; quantity?: number; price?: number; minimum_stock?: number; created_at?: string; updated_at?: string };
            };
            inventory_transactions: {
                Row: { id: number; part_id: number; ticket_id: string | null; user_id: string; change_amount: number; transaction_type: 'restock' | 'consumption' | 'adjustment' | 'return'; notes: string | null; created_at: string };
                Insert: { id?: number; part_id: number; ticket_id?: string | null; user_id: string; change_amount: number; transaction_type: 'restock' | 'consumption' | 'adjustment' | 'return'; notes?: string | null; created_at?: string };
                Update: { id?: number; part_id?: number; ticket_id?: string | null; user_id?: string; change_amount?: number; transaction_type?: 'restock' | 'consumption' | 'adjustment' | 'return'; notes?: string | null; created_at?: string };
            };
        };
    };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL or Anon Key is missing. Check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
