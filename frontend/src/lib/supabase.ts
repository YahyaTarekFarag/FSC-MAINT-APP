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
            tickets: {
                Row: { id: string; branch_id: string; technician_id: string | null; status: 'open' | 'in_progress' | 'closed'; priority: 'low' | 'medium' | 'high' | 'urgent'; fault_category: string; fault_subcategory: string | null; description: string | null; images_url: string[]; created_at: string; updated_at: string };
                Insert: { id?: string; branch_id: string; technician_id?: string | null; status?: 'open' | 'in_progress' | 'closed'; priority?: 'low' | 'medium' | 'high' | 'urgent'; fault_category: string; fault_subcategory?: string | null; description?: string | null; images_url?: string[]; created_at?: string; updated_at?: string };
                Update: { id?: string; branch_id?: string; technician_id?: string | null; status?: 'open' | 'in_progress' | 'closed'; priority?: 'low' | 'medium' | 'high' | 'urgent'; fault_category?: string; fault_subcategory?: string | null; description?: string | null; images_url?: string[]; created_at?: string; updated_at?: string };
            };
            ticket_comments: {
                Row: { id: number; ticket_id: string; user_id: string; content: string; created_at: string };
                Insert: { id?: number; ticket_id: string; user_id: string; content: string; created_at?: string };
                Update: { id?: number; ticket_id?: string; user_id?: string; content?: string; created_at?: string };
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
