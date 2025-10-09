/**
 * Debounce function to limit function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Generate a unique ID
 */
export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Capitalize the first letter of a string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Truncate string to specified length
 */
export const truncate = (str: string, length: number, suffix: string = '...'): string => {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Check if a string is a valid flight number
 */
export const isValidFlightNumber = (flightNumber: string): boolean => {
  // Basic validation: 2-letter airline code followed by 1-4 digits
  const pattern = /^[A-Z]{2,3}\d{1,4}$/i;
  return pattern.test(flightNumber.replace(/\s+/g, ''));
};

/**
 * Extract airline code from flight number
 */
export const extractAirlineCode = (flightNumber: string): string => {
  const match = flightNumber.match(/^([A-Z]{2,3})/i);
  return match ? match[1].toUpperCase() : '';
};

/**
 * Extract flight number digits
 */
export const extractFlightDigits = (flightNumber: string): string => {
  const match = flightNumber.match(/\d+/);
  return match ? match[0] : '';
};

/**
 * Normalize flight number format
 */
export const normalizeFlightNumber = (flightNumber: string): string => {
  const airlineCode = extractAirlineCode(flightNumber);
  const digits = extractFlightDigits(flightNumber);
  return airlineCode && digits ? `${airlineCode}${digits}` : flightNumber;
};

/**
 * Calculate bearing between two points
 */
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
           Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Convert knots to different speed units
 */
export const convertSpeed = {
  knotsToKmh: (knots: number): number => knots * 1.852,
  knotsToMph: (knots: number): number => knots * 1.151,
  kmhToKnots: (kmh: number): number => kmh / 1.852,
  mphToKnots: (mph: number): number => mph / 1.151,
};

/**
 * Convert feet to different altitude units
 */
export const convertAltitude = {
  feetToMeters: (feet: number): number => feet * 0.3048,
  metersToFeet: (meters: number): number => meters / 0.3048,
};

/**
 * Convert nautical miles to different distance units
 */
export const convertDistance = {
  nmToKm: (nm: number): number => nm * 1.852,
  nmToMiles: (nm: number): number => nm * 1.151,
  kmToNm: (km: number): number => km / 1.852,
  milesToNm: (miles: number): number => miles / 1.151,
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get color based on status
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'scheduled': '#4CAF50',
    'delayed': '#FF9800',
    'cancelled': '#F44336',
    'departed': '#2196F3',
    'arrived': '#4CAF50',
    'diverted': '#9C27B0',
  };
  return colors[status.toLowerCase()] || '#9E9E9E';
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  const pattern = /^\+?[\d\s\-\(\)]+$/;
  return pattern.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Mask sensitive information
 */
export const maskSensitive = (str: string, visibleChars: number = 4): string => {
  if (str.length <= visibleChars) return str;
  return str.substring(0, visibleChars) + '*'.repeat(str.length - visibleChars);
};

/**
 * Retry function with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
};

/**
 * Check if device is connected to internet
 */
export const isOnline = (): boolean => {
  // This would need to be implemented with NetInfo or similar
  return true; // Placeholder
};

/**
 * Get device platform
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  // This would need to be implemented with Platform from React Native
  if (typeof window !== 'undefined') return 'web';
  return 'ios'; // Placeholder
};

/**
 * Generate random color
 */
export const generateRandomColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Clamp number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * clamp(factor, 0, 1);
};
