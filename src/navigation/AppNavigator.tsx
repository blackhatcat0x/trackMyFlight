import { useTheme } from '@/hooks/useTheme';
import { FlightDetailScreen } from '@/screens/FlightDetailScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.cardForeground,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'TrackMyFlight',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="FlightDetail"
          component={FlightDetailScreen}
          options={{
            title: 'Flight Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};