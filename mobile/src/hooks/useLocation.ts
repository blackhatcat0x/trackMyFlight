import { getCurrentLocation, LocationCoordinates, requestLocationPermission } from '@/utils/location';
import { useCallback, useEffect, useState } from 'react';

interface UseLocationReturn {
  location: LocationCoordinates | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  refreshLocation: () => Promise<void>;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setError('Location permission denied');
        return;
      }
      
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
    } catch (err) {
      setError('Failed to get location');
      console.error('Location error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    await requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    loading,
    error,
    requestLocation,
    refreshLocation,
  };
};