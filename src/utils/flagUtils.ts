/**
 * Flag utility functions for converting country codes to emoji flags
 */

/**
 * Convert a 2-letter country code to emoji flag
 * @param countryCode - 2 letter ISO country code (e.g., 'GB', 'US', 'FR')
 * @returns Emoji flag or fallback emoji
 */
export function countryToFlag(countryCode: string): string {
  if (!countryCode || typeof countryCode !== 'string') {
    return '🌍';
  }
  
  // If it's already an emoji (contains non-ASCII characters), return as-is
  if (/[^\x00-\x7F]/.test(countryCode)) {
    return countryCode;
  }
  
  // Clean the country code
  const cleanCode = countryCode.toUpperCase().trim();
  
  // Must be exactly 2 letters for valid country code
  if (cleanCode.length !== 2 || !/^[A-Z]{2}$/.test(cleanCode)) {
    return '🌍';
  }
  
  try {
    // Convert each letter to regional indicator symbol
    const codePoints = cleanCode
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    console.warn('Failed to convert country code to flag:', countryCode, error);
    return '🌍';
  }
}

/**
 * Ensure a value is a proper flag emoji
 * @param flag - Could be country code, emoji, or null/undefined
 * @returns Proper flag emoji
 */
export function ensureFlag(flag: string | null | undefined): string {
  if (!flag) return '🌍';
  
  // If it's already an emoji, return as-is
  if (/[^\x00-\x7F]/.test(flag)) {
    return flag;
  }
  
  // Try to convert as country code
  return countryToFlag(flag);
}

/**
 * Map common country name variations to ISO codes
 */
const countryNameToCode: Record<string, string> = {
  'United Kingdom': 'GB',
  'UK': 'GB',
  'United States': 'US',
  'USA': 'US',
  'United Arab Emirates': 'AE',
  'UAE': 'AE',
  'Netherlands': 'NL',
  'Holland': 'NL',
  'Russia': 'RU',
  'Russian Federation': 'RU',
  'South Korea': 'KR',
  'Korea': 'KR',
  'North Korea': 'KP',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Macedonia': 'MK',
  'North Macedonia': 'MK',
  'Swaziland': 'SZ',
  'Eswatini': 'SZ',
  'Turkey': 'TR',
  'Türkiye': 'TR',
};

/**
 * Convert country name or code to flag
 * @param countryNameOrCode - Country name or ISO code
 * @returns Flag emoji
 */
export function countryNameOrCodeToFlag(countryNameOrCode: string): string {
  if (!countryNameOrCode) return '🌍';
  
  const cleaned = countryNameOrCode.trim();
  
  // Check if it's already a valid ISO code
  if (/^[A-Z]{2}$/i.test(cleaned)) {
    return countryToFlag(cleaned);
  }
  
  // Try to map country name to code
  const mappedCode = countryNameToCode[cleaned];
  if (mappedCode) {
    return countryToFlag(mappedCode);
  }
  
  // If we can't convert, return default
  return '🌍';
}
