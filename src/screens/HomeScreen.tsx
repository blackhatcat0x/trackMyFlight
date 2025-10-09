import { FlightSearch } from '@/components/common/FlightSearch';
import { SearchBar } from '@/components/common/SearchBar';
import { useTheme } from '@/hooks/useTheme';
import { useFlightStore } from '@/store';
import { Flight } from '@/types';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedFlight, setSelectedFlight } = useFlightStore();

  const handleFlightSelect = (flight: Flight) => {
    setSelectedFlight(flight);
  };

  const handleSearch = () => {
    // Handle search submission
    console.log('Searching for:', searchQuery);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          TrackMyFlight
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Real-time flight tracking
        </Text>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search flights, airports..."
        onSubmit={handleSearch}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FlightSearch onFlightSelect={handleFlightSelect} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});