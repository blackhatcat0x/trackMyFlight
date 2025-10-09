import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Request location permission
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Location permission is required to show nearby flights and provide better tracking experience.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => openLocationSettings() },
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current location
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    // Return default location (New York) as fallback
    return {
      latitude: 40.7128,
      longitude: -74.0060,
    };
  }
};

/**
 * Calculate distance between two coordinates in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Calculate bearing between two coordinates
 */
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
    
  const bearing = Math.atan2(y, x);
  return (toDegrees(bearing) + 360) % 360;
};

/**
 * Check if a point is within a given radius
 */
export const isWithinRadius = (
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusKm;
};

/**
 * Open device location settings
 */
const openLocationSettings = () => {
  if (Platform.OS === 'ios') {
    // iOS doesn't have a direct way to open settings, but we can show an alert
    Alert.alert(
      'Location Settings',
      'Please enable location access in Settings > Privacy > Location Services',
      [{ text: 'OK' }]
    );
  } else {
    // Android can open settings directly
    Location.enableNetworkProviderAsync().catch(() => {
      Alert.alert(
        'Location Settings',
        'Please enable location access in your device settings',
        [{ text: 'OK' }]
      );
    });
  }
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 */
const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Get location accuracy description
 */
export const getLocationAccuracyDescription = (accuracy: number): string => {
  if (accuracy < 10) return 'Excellent';
  if (accuracy < 50) return 'Good';
  if (accuracy < 100) return 'Fair';
  if (accuracy < 500) return 'Poor';
  return 'Very Poor';
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (
  latitude: number,
  longitude: number,
  format: 'decimal' | 'dms' = 'decimal'
): string => {
  if (format === 'decimal') {
    return `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
  } else {
    // Degrees, Minutes, Seconds format
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    
    const latAbs = Math.abs(latitude);
    const lonAbs = Math.abs(longitude);
    
    const latDeg = Math.floor(latAbs);
    const latMin = Math.floor((latAbs - latDeg) * 60);
    const latSec = ((latAbs - latDeg) * 60 - latMin) * 60;
    
    const lonDeg = Math.floor(lonAbs);
    const lonMin = Math.floor((lonAbs - lonDeg) * 60);
    const lonSec = ((lonAbs - lonDeg) * 60 - lonMin) * 60;
    
    return `${latDeg}°${latMin}'${latSec.toFixed(1)}"${latDir}, ${lonDeg}°${lonMin}'${lonSec.toFixed(1)}"${lonDir}`;
  }
};