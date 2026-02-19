import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface GeofenceSettings {
    radius_meters: number;
    enabled: boolean;
}

interface Location {
    lat: number;
    lng: number;
}

export function useGeofence(targetLocation: Location | null) {
    const [isAllowed, setIsAllowed] = useState(false);
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);
    const [maxRadius, setMaxRadius] = useState(200);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Haversine Formula to calculate distance in meters
    const calculateDistance = (loc1: Location, loc2: Location) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (loc1.lat * Math.PI) / 180;
        const φ2 = (loc2.lat * Math.PI) / 180;
        const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
        const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    useEffect(() => {
        let watchId: number | null = null;
        const controller = new AbortController();

        async function initGeofence(signal: AbortSignal) {
            try {
                // 1. Fetch Max Radius from system_config
                const { data: config, error: configError } = await supabase
                    .from('system_config')
                    .select('value')
                    .eq('key', 'geofence_settings')
                    .single();

                if (signal.aborted) return;

                if (configError) throw configError;

                const settings = (config as any)?.value as GeofenceSettings;
                const radius = settings?.radius_meters || 200;
                setMaxRadius(radius);

                if (!settings?.enabled) {
                    setIsAllowed(true);
                    setLoading(false);
                    return;
                }

                if (!navigator.geolocation) {
                    throw new Error('متصفحك لا يدعم خاصية تحديد الموقع');
                }

                if (signal.aborted) return;

                // 2. Watch Position
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        if (!targetLocation) return;

                        const userLoc = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };

                        const distance = calculateDistance(userLoc, targetLocation);
                        setCurrentDistance(Math.round(distance));

                        // Buffer of 5 meters for GPS drift
                        setIsAllowed(distance <= radius + 5);
                        setLoading(false);
                    },
                    (geoError) => {
                        let msg = 'فشل تحديد الموقع';
                        if (geoError.code === 1) msg = 'يرجى السماح بالوصول للموقع للمتابعة';
                        setError(msg);
                        setLoading(false);
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );

            } catch (err: any) {
                if (signal.aborted) return;
                console.error('Geofence Init Error:', err);
                setError(err.message || 'فشل تهيئة نظام الحماية الجغرافي');
                setLoading(false);
            }
        }

        initGeofence(controller.signal);

        return () => {
            controller.abort();
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [targetLocation?.lat, targetLocation?.lng]);

    return { isAllowed, currentDistance, maxRadius, loading, error };
}
