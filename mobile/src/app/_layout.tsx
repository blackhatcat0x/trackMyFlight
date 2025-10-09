import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1 }}>
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="flight/[id]"
                options={{
                  title: 'Flight Details',
                  presentation: 'modal',
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="search"
                options={{
                  title: 'Search Flights',
                  presentation: 'modal',
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="ar-camera"
                options={{
                  title: 'AR Plane Finder',
                  presentation: 'fullScreenModal',
                  headerShown: false,
                }}
              />
            </Stack>
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}