import { AppNavigator } from '@/navigation/AppNavigator';
import { useFlightStore } from '@/store';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const App: React.FC = () => {
  // Initialize store
  const { setLoading, setError } = useFlightStore();

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
};

export default App;