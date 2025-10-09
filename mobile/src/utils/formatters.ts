import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format time for display
 */
export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

/**
 * Format date and time for display
 */
export const formatDateTime = (date: Date): string => {
  return format(date, 'MMM dd, yyyy HH:mm');
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Format duration in minutes to human readable format
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

/**
 * Format speed from knots to appropriate unit
 */
export const formatSpeed = (knots: number, unit: 'knots' | 'kmh' | 'mph' = 'knots'): string => {
  switch (unit) {
    case 'kmh':
      return `${Math.round(knots * 1.852)} km/h`;
    case 'mph':
      return `${Math.round(knots * 1.151)} mph`;
    default:
      return `${Math.round(knots)} kt`;
  }
};

/**
 * Format altitude from feet to appropriate unit
 */
export const formatAltitude = (feet: number, unit: 'feet' | 'meters' = 'feet'): string => {
  switch (unit) {
    case 'meters':
      return `${Math.round(feet * 0.3048)} m`;
    default:
      if (feet >= 1000) {
        return `${Math.round(feet / 1000)}k ft`;
      }
      return `${Math.round(feet)} ft`;
  }
};

/**
 * Format distance in nautical miles
 */
export const formatDistance = (nauticalMiles: number, unit: 'nm' | 'km' | 'miles' = 'nm'): string => {
  switch (unit) {
    case 'km':
      return `${Math.round(nauticalMiles * 1.852)} km`;
    case 'miles':
      return `${Math.round(nauticalMiles * 1.151)} mi`;
    default:
      return `${Math.round(nauticalMiles)} NM`;
  }
};

/**
 * Format flight status with appropriate styling
 */
export const formatFlightStatus = (status: string): { text: string; color: string } => {
  const statusMap: Record<string, { text: string; color: string }> = {
    'scheduled': { text: 'On Time', color: '#4CAF50' },
    'delayed': { text: 'Delayed', color: '#FF9800' },
    'cancelled': { text: 'Cancelled', color: '#F44336' },
    'departed': { text: 'Departed', color: '#2196F3' },
    'arrived': { text: 'Arrived', color: '#4CAF50' },
    'diverted': { text: 'Diverted', color: '#9C27B0' },
  };
  
  return statusMap[status.toLowerCase()] || { text: status, color: '#9E9E9E' };
};

/**
 * Format delay information
 */
export const formatDelay = (delayMinutes: number): string => {
  if (delayMinutes <= 0) return '';
  
  if (delayMinutes < 60) {
    return `${delayMinutes} min delay`;
  } else {
    const hours = Math.floor(delayMinutes / 60);
    const mins = delayMinutes % 60;
    return `${hours}h ${mins}m delay`;
  }
};

/**
 * Format gate information
 */
export const formatGate = (gate?: string): string => {
  if (!gate) return 'TBD';
  return gate.toUpperCase();
};

/**
 * Format terminal information
 */
export const formatTerminal = (terminal?: string): string => {
  if (!terminal) return 'TBD';
  return terminal.toUpperCase();
};

/**
 * Format baggage claim information
 */
export const formatBaggageClaim = (baggageClaim?: string): string => {
  if (!baggageClaim) return 'TBD';
  return baggageClaim.toUpperCase();
};

/**
 * Format aircraft registration
 */
export const formatRegistration = (registration: string): string => {
  return registration.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

/**
 * Format flight number for display
 */
export const formatFlightNumber = (flightNumber: string): string => {
  // Remove spaces and ensure proper format
  return flightNumber.replace(/\s+/g, '').toUpperCase();
};

/**
 * Calculate and format time remaining until departure/arrival
 */
export const formatTimeRemaining = (targetDate: Date): string => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return 'Departed';
  }
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) {
    return `${diffMins} min`;
  } else if (diffMins < 1440) { // Less than 24 hours
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  } else {
    const days = Math.floor(diffMins / 1440);
    const hours = Math.floor((diffMins % 1440) / 60);
    return `${days}d ${hours}h`;
  }
};

/**
 * Format percentage with appropriate precision
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers with abbreviations
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Format timezone offset
 */
export const formatTimezone = (timezone: string): string => {
  try {
    const now = new Date();
    const targetTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const offset = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const sign = offset >= 0 ? '+' : '';
    return `UTC${sign}${offset}`;
  } catch {
    return timezone;
  }
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lon: number, precision: number = 4): string => {
  return `${lat.toFixed(precision)}°, ${lon.toFixed(precision)}°`;
};

/**
 * Format heading as compass direction
 */
export const formatHeading = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};