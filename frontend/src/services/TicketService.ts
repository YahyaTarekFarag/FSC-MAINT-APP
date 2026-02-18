import { supabase } from '../lib/supabase';

export interface ValidationResult {
    valid: boolean;
    message?: string;
    severity?: 'warning' | 'error';
}

export const TicketService = {
    /**
     * Checks if a spare part is compatible with the asset's category.
     * Returns valid: true if compatible or if category info is missing (lenient).
     */
    async validatePartCompatibility(partId: number, assetId: string): Promise<ValidationResult> {
        try {
            // Fetch Part Category
            const { data: part, error: partError } = await supabase
                .from('spare_parts')
                .select('category_id, name_ar')
                .eq('id', partId)
                .single();

            if (partError || !part) throw new Error('Part not found');

            // Fetch Asset Category
            const { data: asset, error: assetError } = await supabase
                .from('maintenance_assets')
                .select('category_id, name')
                .eq('id', assetId)
                .single();

            if (assetError || !asset) throw new Error('Asset not found');

            // If either doesn't have a category, we can't enforce compatibility strictly.
            // Adjust policy as needed: Strict (fail) or Lenient (pass). We choose Lenient + Warning if disjoint.
            if (!part.category_id || !asset.category_id) {
                return { valid: true }; // Cannot validate, assume ok
            }

            if (part.category_id !== asset.category_id) {
                return {
                    valid: false,
                    severity: 'error',
                    message: `⚠️ تنبيه توافق: القطعة "${part.name_ar}" تابعة لتصنيف مختلف عن المعدة "${asset.name}". يرجى التحقق.`
                };
            }


            return { valid: true };

        } catch (error) {
            console.error('Compatibility check failed:', error);
            return { valid: true }; // Fail open to avoid blocking operations on error
        }
    },

    /**
     * Checks if the total repair cost exceeds 50% of the asset's value.
     */
    async checkRepairCostWarning(assetId: string, currentRepairCost: number): Promise<ValidationResult> {
        try {
            const { data: asset, error } = await supabase
                .from('maintenance_assets')
                .select('purchase_price, name')
                .eq('id', assetId)
                .single();

            if (error || !asset) return { valid: true };

            const assetValue = asset.purchase_price || 0;
            if (assetValue <= 0) return { valid: true }; // No value recorded

            const threshold = assetValue * 0.5;

            if (currentRepairCost > threshold) {
                return {
                    valid: false,
                    severity: 'warning',
                    message: `تنبيه: تكلفة الإصلاح (${currentRepairCost}) تتجاوز 50% من قيمة المعدة (${assetValue}). قد يكون الاستبدال خياراً أفضل.`
                };
            }

            return { valid: true };

        } catch (error) {
            console.error('Cost check failed:', error);
            return { valid: true };
        }
    }
};
