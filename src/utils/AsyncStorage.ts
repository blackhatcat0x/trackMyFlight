import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for web development
const mockAsyncStorage = {
  getItem: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silent fail
    }
  },
  removeItem: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  },
  clear: async () => {
    try {
      localStorage.clear();
    } catch {
      // Silent fail
    }
  },
};

export const AsyncStorage = typeof window !== 'undefined' ? mockAsyncStorage : (AsyncStorage as any);