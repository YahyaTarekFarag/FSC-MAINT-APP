import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const useLocationSync = (userProfile: Profile | null) => {
    useEffect(() => {
        if (!userProfile || userProfile.role !== 'technician') return;

        const updateLocation = async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            try {
                await supabase
                    .from('profiles')
                    .update({
                        last_lat: latitude,
                        last_lng: longitude,
                        last_seen_at: new Date().toISOString()
                    })
                    .eq('id', userProfile.id);
            } catch (error) {
                // Silent fail for background sync
            }
        };

        const handleError = (error: GeolocationPositionError) => {
            // Permission denied or silent error
        };

        // Options: High accuracy, check every 30 seconds max (prevent spam), timeout 10s
        const options: PositionOptions = {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 10000
        };

        const watchId = navigator.geolocation.watchPosition(
            updateLocation,
            handleError,
            options
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [userProfile]);
};
