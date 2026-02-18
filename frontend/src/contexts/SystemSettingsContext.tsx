import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type SystemSettings = Record<string, any>;

interface SystemSettingsContextType {
    settings: SystemSettings;
    loading: boolean;
    refreshSettings: () => Promise<void>;
    updateSetting: (key: string, value: any) => Promise<void>;
    getSetting: <T>(key: string, defaultValue?: T) => T;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SystemSettings>({});
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value');

            if (error) throw error;

            const settingsMap: SystemSettings = {};
            data?.forEach(item => {
                settingsMap[item.key] = item.value;
            });

            setSettings(settingsMap);
        } catch (error) {
            console.error('Error fetching system settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = async (key: string, value: any) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('system_settings') as any)
                .upsert({
                    key,
                    value,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Optimistic update
            setSettings(prev => ({ ...prev, [key]: value }));
        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            throw error;
        }
    };

    function getSetting<T>(key: string, defaultValue?: T): T {
        return (settings[key] as T) ?? defaultValue as T;
    }

    return (
        <SystemSettingsContext.Provider value={{
            settings,
            loading,
            refreshSettings: fetchSettings,
            updateSetting,
            getSetting
        }}>
            {children}
        </SystemSettingsContext.Provider>
    );
}

export function useSystemSettings() {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
}
