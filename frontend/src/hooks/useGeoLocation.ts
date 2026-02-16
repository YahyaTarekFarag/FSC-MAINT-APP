import { useState, useCallback } from 'react';

interface GeoLocationState {
    coords: {
        latitude: number;
        longitude: number;
    } | null;
    error: string | null;
    loading: boolean;
}

export const useGeoLocation = () => {
    const [state, setState] = useState<GeoLocationState>({
        coords: null,
        error: null,
        loading: false
    });

    const getCoordinates = useCallback((): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = 'Geolocation is not supported by your browser';
                setState(prev => ({ ...prev, error: err }));
                reject(err);
                return;
            }

            setState(prev => ({ ...prev, loading: true }));

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setState({ coords, error: null, loading: false });
                    resolve(coords);
                },
                (error) => {
                    const errMsg = error.message;
                    setState({ coords: null, error: errMsg, loading: false });
                    reject(errMsg);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }, []);

    /**
     * Calculates the distance between two points on Earth in meters
     * Using the Haversine formula
     */
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Earth radius in meters
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    /**
     * Checks if user is within a specific radius of a target location
     */
    const isWithinRadius = (
        userLat: number,
        userLng: number,
        targetLat: number,
        targetLng: number,
        radiusInMeters: number = 200 // Default to 200m
    ): boolean => {
        const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
        return distance <= radiusInMeters;
    };

    return {
        ...state,
        getCoordinates,
        calculateDistance,
        isWithinRadius
    };
};
