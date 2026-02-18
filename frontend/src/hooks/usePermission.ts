import { useSystemSettings } from '../contexts/SystemSettingsContext';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'approve';
export type Resource = 'tickets' | 'users' | 'inventory' | 'reports' | 'settings' | 'forms' | 'assets' | 'dashboard';

// Default matrix if none exists in DB
const DEFAULT_MATRIX: Record<string, Record<string, Action[]>> = {
    admin: {
        tickets: ['view', 'create', 'edit', 'delete', 'manage'],
        users: ['view', 'create', 'edit', 'delete', 'manage'],
        inventory: ['view', 'create', 'edit', 'delete', 'manage'],
        reports: ['view', 'create', 'manage'],
        settings: ['view', 'create', 'edit', 'delete', 'manage'],
        forms: ['view', 'create', 'edit', 'delete', 'manage'],
        assets: ['view', 'create', 'edit', 'delete', 'manage'],
        dashboard: ['view'],
    },
    manager: {
        tickets: ['view', 'create', 'edit', 'approve'],
        users: ['view'],
        inventory: ['view', 'create', 'edit'],
        reports: ['view'],
        assets: ['view', 'create', 'edit'],
        dashboard: ['view'],
    },
    technician: {
        tickets: ['view', 'edit'],
        inventory: ['view'],
        assets: ['view'],
        dashboard: ['view'],
    },
    user: {
        tickets: ['view', 'create'],
    }
};

export function usePermission(userRole?: string) {
    const { getSetting } = useSystemSettings();

    // Get matrix from DB or fallback to default
    // We look for 'permissions_matrix' key in system_settings
    const matrix = getSetting('permissions_matrix', DEFAULT_MATRIX);

    const can = (action: Action, resource: Resource): boolean => {
        if (!userRole) return false;

        // Admin override
        if (userRole === 'admin') return true;

        const rolePermissions = matrix[userRole];
        if (!rolePermissions) return false;

        const resourceActions = rolePermissions[resource];
        if (!resourceActions) return false;

        return resourceActions.includes(action) || resourceActions.includes('manage');
    };

    return { can, matrix };
}
