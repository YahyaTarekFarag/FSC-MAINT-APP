import { createClient } from '@supabase/supabase-js';

// Define the database types based on our schema
// Define the database types based on our schema
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            brands: {
                Row: { id: string; name_ar: string; logo_url: string | null; created_at: string };
                Insert: { id?: string; name_ar: string; logo_url?: string | null; created_at?: string };
                Update: { id?: string; name_ar?: string; logo_url?: string | null; created_at?: string };
                Relationships: [];
            };
            sectors: {
                Row: { id: string; name_ar: string; created_at: string };
                Insert: { id?: string; name_ar: string; created_at?: string };
                Update: { id?: string; name_ar?: string; created_at?: string };
                Relationships: [];
            };
            areas: {
                Row: { id: string; sector_id: string; name_ar: string; created_at: string };
                Insert: { id?: string; sector_id: string; name_ar: string; created_at?: string };
                Update: { id?: string; sector_id?: string; name_ar?: string; created_at?: string };
                Relationships: [
                    {
                        foreignKeyName: "areas_sector_id_fkey";
                        columns: ["sector_id"];
                        isOneToOne: false;
                        referencedRelation: "sectors";
                        referencedColumns: ["id"];
                    }
                ];
            };
            branches: {
                Row: { id: string; area_id: string; brand_id: string; name_ar: string; location_lat: number | null; location_lng: number | null; google_map_link: string | null; address: string | null; phone: string | null; created_at: string; city: string | null };
                Insert: { id?: string; area_id: string; brand_id: string; name_ar: string; location_lat?: number | null; location_lng?: number | null; google_map_link?: string | null; address?: string | null; phone?: string | null; created_at?: string; city?: string | null };
                Update: { id?: string; area_id?: string; brand_id?: string; name_ar?: string; location_lat?: number | null; location_lng?: number | null; google_map_link?: string | null; address?: string | null; phone?: string | null; created_at?: string; city?: string | null };
                Relationships: [
                    {
                        foreignKeyName: "branches_area_id_fkey";
                        columns: ["area_id"];
                        isOneToOne: false;
                        referencedRelation: "areas";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "branches_brand_id_fkey";
                        columns: ["brand_id"];
                        isOneToOne: false;
                        referencedRelation: "brands";
                        referencedColumns: ["id"];
                    }
                ];
            };
            profiles: {
                Row: {
                    id: string;
                    full_name: string | null;
                    email: string | null;
                    phone: string | null;
                    role: 'admin' | 'manager' | 'technician';
                    specialization: string | null;
                    assigned_sector_id: string | null;
                    assigned_area_id: string | null;
                    branch_id: string | null;
                    status: 'active' | 'suspended';
                    created_at: string;
                    last_lat: number | null;
                    last_lng: number | null;
                    last_seen_at: string | null;
                };
                Insert: {
                    id: string;
                    full_name?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    role?: 'admin' | 'manager' | 'technician';
                    specialization?: string | null;
                    assigned_sector_id?: string | null;
                    assigned_area_id?: string | null;
                    branch_id?: string | null;
                    status?: 'active' | 'suspended';
                    created_at?: string
                };
                Update: {
                    id?: string;
                    full_name?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    role?: 'admin' | 'manager' | 'technician';
                    specialization?: string | null;
                    assigned_sector_id?: string | null;
                    assigned_area_id?: string | null;
                    branch_id?: string | null;
                    status?: 'active' | 'suspended';
                    created_at?: string
                };
                Relationships: [];
            };
            fault_categories: {
                Row: { id: string; name_ar: string; icon: string | null; is_active: boolean; created_at: string };
                Insert: { id?: string; name_ar: string; icon?: string | null; is_active?: boolean; created_at?: string };
                Update: { id?: string; name_ar?: string; icon?: string | null; is_active?: boolean; created_at?: string };
                Relationships: [];
            };
            category_questions: {
                Row: {
                    id: number;
                    category_id: string;
                    question_text: string;
                    field_type: 'text' | 'number' | 'yes_no' | 'photo' | 'select';
                    options: string[] | null;
                    is_required: boolean;
                    stage: 'diagnosis' | 'closing';
                    order_index: number;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    category_id: string;
                    question_text: string;
                    field_type: 'text' | 'number' | 'yes_no' | 'photo' | 'select';
                    options?: string[] | null;
                    is_required?: boolean;
                    stage?: 'diagnosis' | 'closing';
                    order_index?: number;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    category_id?: string;
                    question_text?: string;
                    field_type?: 'text' | 'number' | 'yes_no' | 'photo' | 'select';
                    options?: string[] | null;
                    is_required?: boolean;
                    stage?: 'diagnosis' | 'closing';
                    order_index?: number;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "category_questions_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "fault_categories";
                        referencedColumns: ["id"];
                    }
                ];
            };
            notifications: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    message: string;
                    type: 'info' | 'warning' | 'success' | 'error';
                    is_read: boolean;
                    link: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    message: string;
                    type: 'info' | 'warning' | 'success' | 'error';
                    is_read?: boolean;
                    link?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    message?: string;
                    type?: 'info' | 'warning' | 'success' | 'error';
                    is_read?: boolean;
                    link?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sla_policies: {
                Row: {
                    id: string;
                    priority_level: string;
                    resolution_hours: number;
                    color_code: string;
                    is_active: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    priority_level: string;
                    resolution_hours?: number;
                    color_code: string;
                    is_active?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    priority_level?: string;
                    resolution_hours?: number;
                    color_code?: string;
                    is_active?: boolean;
                    created_at?: string;
                };
                Relationships: [];
            };
            tickets: {
                Row: {
                    id: string;
                    branch_id: string;
                    technician_id: string | null;
                    status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
                    priority: 'low' | 'medium' | 'high' | 'critical';
                    fault_category: string;
                    fault_subcategory: string | null;
                    description: string | null;
                    images_url: string[];
                    created_at: string;
                    updated_at: string;
                    form_data: Json;
                    repair_cost: number | null;
                    closed_at: string | null;
                    category_id: string | null;
                    start_work_lat: number | null;
                    start_work_lng: number | null;
                    end_work_lat: number | null;
                    end_work_lng: number | null;
                    location_lat: number | null;
                    location_lng: number | null;
                    started_at: string | null;
                    repair_duration: number | null;
                    due_date: string | null;
                    asset_id: string | null;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    technician_id?: string | null;
                    status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
                    priority: 'low' | 'medium' | 'high' | 'critical';
                    fault_category: string;
                    description: string | null;
                    created_at?: string;
                    updated_at?: string;
                    repair_cost?: number;
                    form_data?: Json | null;
                    closed_at?: string | null;
                    repair_duration?: number | null;
                    location_lat?: number | null;
                    location_lng?: number | null;
                    started_at?: string | null;
                    due_date?: string | null;
                    asset_id?: string | null;
                };

                Update: {
                    id?: string;
                    branch_id?: string;
                    technician_id?: string | null;
                    status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
                    priority?: 'low' | 'medium' | 'high' | 'critical';
                    fault_category?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    repair_cost?: number;
                    form_data?: Json | null;
                    closed_at?: string | null;
                    repair_duration?: number | null;
                    location_lat?: number | null;
                    location_lng?: number | null;
                    started_at?: string | null;
                    due_date?: string | null;
                    asset_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "tickets_branch_id_fkey";
                        columns: ["branch_id"];
                        isOneToOne: false;
                        referencedRelation: "branches";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "tickets_technician_id_fkey";
                        columns: ["technician_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "tickets_asset_id_fkey";
                        columns: ["asset_id"];
                        isOneToOne: false;
                        referencedRelation: "maintenance_assets";
                        referencedColumns: ["id"];
                    }
                ];
            };

            ticket_comments: {
                Row: { id: number; ticket_id: string; user_id: string; content: string; created_at: string };
                Insert: { id?: number; ticket_id: string; user_id: string; content: string; created_at?: string };
                Update: { id?: number; ticket_id?: string; user_id?: string; content?: string; created_at?: string };
                Relationships: [
                    {
                        foreignKeyName: "ticket_comments_ticket_id_fkey";
                        columns: ["ticket_id"];
                        isOneToOne: false;
                        referencedRelation: "tickets";
                        referencedColumns: ["id"];
                    }
                ];
            };
            spare_parts: {
                Row: { id: number; name_ar: string; part_number: string | null; quantity: number; price: number; minimum_stock: number; min_threshold: number; description: string | null; location: string | null; supplier: string | null; compatible_models: string | null; category_id: string | null; unit_id: number | null; created_at: string; updated_at: string };
                Insert: { id?: number; name_ar: string; part_number?: string | null; quantity?: number; price: number; minimum_stock?: number; min_threshold?: number; description?: string | null; location?: string | null; supplier?: string | null; compatible_models?: string | null; category_id?: string | null; unit_id?: number | null; created_at?: string; updated_at?: string };
                Update: { id?: number; name_ar?: string; part_number?: string | null; quantity?: number; price?: number; minimum_stock?: number; min_threshold?: number; description?: string | null; location?: string | null; supplier?: string | null; compatible_models?: string | null; category_id?: string | null; unit_id?: number | null; created_at?: string; updated_at?: string };
                Relationships: [];
            };
            inventory_transactions: {
                Row: { id: number; part_id: number; ticket_id: string | null; user_id: string; change_amount: number; transaction_type: 'restock' | 'consumption' | 'adjustment' | 'return'; notes: string | null; created_at: string };
                Insert: { id?: number; part_id: number; ticket_id?: string | null; user_id: string; change_amount: number; transaction_type: 'restock' | 'consumption' | 'adjustment' | 'return'; notes?: string | null; created_at?: string };
                Update: { id?: number; part_id?: number; ticket_id?: string | null; user_id?: string; change_amount?: number; transaction_type?: 'restock' | 'consumption' | 'adjustment' | 'return'; notes?: string | null; created_at?: string };
                Relationships: [
                    {
                        foreignKeyName: "inventory_transactions_part_id_fkey";
                        columns: ["part_id"];
                        isOneToOne: false;
                        referencedRelation: "spare_parts";
                        referencedColumns: ["id"];
                    }
                ];
            };
            unit_types: {
                Row: {
                    id: number;
                    name_ar: string;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    name_ar: string;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    name_ar?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            system_config: {
                Row: {
                    key: string;
                    value: string;
                    description: string | null;
                    updated_at: string;
                };
                Insert: {
                    key: string;
                    value?: string;
                    description?: string | null;
                    updated_at?: string;
                };
                Update: {
                    key?: string;
                    value?: string;
                    description?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            area_tech_assignments: {
                Row: {
                    id: string;
                    area_id: string;
                    technician_id: string;
                    assignment_type: 'primary' | 'backup';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    area_id: string;
                    technician_id: string;
                    assignment_type: 'primary' | 'backup';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    area_id?: string;
                    technician_id?: string;
                    assignment_type?: 'primary' | 'backup';
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "area_tech_assignments_area_id_fkey";
                        columns: ["area_id"];
                        isOneToOne: false;
                        referencedRelation: "areas";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "area_tech_assignments_technician_id_fkey";
                        columns: ["technician_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            system_logs: {
                Row: { id: string; user_id: string; action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER'; entity_name: string; details: Json | null; created_at: string };
                Insert: { id?: string; user_id: string; action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER'; entity_name: string; details?: Json | null; created_at?: string };
                Update: { id?: string; user_id?: string; action_type?: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER'; entity_name?: string; details?: Json | null; created_at?: string };
                Relationships: [];
            };
            attendance_logs: {
                Row: {
                    id: number;
                    user_id: string;
                    action_type: 'check_in' | 'check_out';
                    timestamp: string;
                    location_lat: number | null;
                    location_lng: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    user_id: string;
                    action_type: 'check_in' | 'check_out';
                    timestamp?: string;
                    location_lat?: number | null;
                    location_lng?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    user_id?: string;
                    action_type?: 'check_in' | 'check_out';
                    timestamp?: string;
                    location_lat?: number | null;
                    location_lng?: number | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "attendance_logs_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            maintenance_assets: {
                Row: {
                    id: string;
                    branch_id: string;
                    name: string;
                    serial_number: string | null;
                    brand_id: string | null;
                    status: 'Active' | 'Under Repair' | 'Scrapped';
                    purchase_date: string | null;
                    warranty_expiry: string | null;
                    notes: string | null;
                    model_number: string | null;
                    location_details: string | null;
                    technical_specs: Json | null;
                    category_id: string | null;
                    purchase_price: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    name: string;
                    serial_number?: string | null;
                    brand_id?: string | null;
                    status?: 'Active' | 'Under Repair' | 'Scrapped';
                    purchase_date?: string | null;
                    warranty_expiry?: string | null;
                    notes?: string | null;
                    model_number?: string | null;
                    location_details?: string | null;
                    technical_specs?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    branch_id?: string;
                    name?: string;
                    serial_number?: string | null;
                    brand_id?: string | null;
                    status?: 'Active' | 'Under Repair' | 'Scrapped';
                    purchase_date?: string | null;
                    warranty_expiry?: string | null;
                    notes?: string | null;
                    model_number?: string | null;
                    location_details?: string | null;
                    technical_specs?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "maintenance_assets_branch_id_fkey";
                        columns: ["branch_id"];
                        isOneToOne: false;
                        referencedRelation: "branches";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "maintenance_assets_brand_id_fkey";
                        columns: ["brand_id"];
                        isOneToOne: false;
                        referencedRelation: "brands";
                        referencedColumns: ["id"];
                    }
                ];
            };
            maintenance_schedules: {
                Row: {
                    id: string;
                    branch_id: string;
                    title: string;
                    description: string | null;
                    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
                    start_date: string;
                    next_run: string;
                    last_run: string | null;
                    priority: 'low' | 'medium' | 'high' | 'urgent';
                    is_active: boolean;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                    asset_id: string | null;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    title: string;
                    description?: string | null;
                    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
                    start_date: string;
                    next_run: string;
                    last_run?: string | null;
                    priority?: 'low' | 'medium' | 'high' | 'urgent';
                    is_active?: boolean;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    asset_id?: string | null;
                };
                Update: {
                    id?: string;
                    branch_id?: string;
                    title?: string;
                    description?: string | null;
                    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
                    start_date?: string;
                    next_run?: string;
                    last_run?: string | null;
                    priority?: 'low' | 'medium' | 'high' | 'urgent';
                    is_active?: boolean;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    asset_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "maintenance_schedules_branch_id_fkey";
                        columns: ["branch_id"];
                        isOneToOne: false;
                        referencedRelation: "branches";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "maintenance_schedules_asset_id_fkey";
                        columns: ["asset_id"];
                        isOneToOne: false;
                        referencedRelation: "maintenance_assets";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: {
            technician_workload_view: {
                Row: {
                    technician_id: string;
                    full_name: string | null;
                    current_status: 'check_in' | 'check_out';
                    last_lat: number | null;
                    last_lng: number | null;
                    active_tickets: number;
                };
            };
            v_branch_performance: {
                Row: {
                    branch_id: string;
                    branch_name: string;
                    total_tickets: number;
                    closed_tickets: number;
                    total_maintenance_cost: number;
                    avg_downtime_hours: number;
                    avg_asset_health_score: number;
                    monthly_trend: Json;
                };
            };
        };
        Functions: {
            consume_parts: {
                Args: {
                    p_ticket_id: string;
                    p_user_id: string;
                    p_parts: { part_id: number; quantity: number }[];
                };
                Returns: boolean;
            };
            get_dashboard_stats: {
                Args: {
                    current_user_id: string;
                    period_start?: string;
                    period_end?: string;
                };
                Returns: Json;
            };
            get_technician_performance: {
                Args: {
                    period_start?: string;
                    period_end?: string;
                };
                Returns: {
                    technician_id: string;
                    full_name: string;
                    completed_tickets: number;
                    avg_repair_time: number;
                    total_cost: number;
                }[];
            };
            get_spending_trend: {
                Args: {
                    current_user_id: string;
                    period_start: string;
                    period_end: string;
                };
                Returns: {
                    name: string;
                    repairs: number;
                }[];
            };
            generate_scheduled_tickets: {
                Args: Record<string, never>;
                Returns: number;
            };
            get_asset_statistics: {
                Args: { target_asset_id: string };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL or Anon Key is missing. Check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
