import { EmptyState, ErrorDisplay, LoadingSpinner } from '@/components/ui';
import { useDebounce, useFlightSearch } from '@/hooks';
import { useTheme } from '@/hooks/useTheme';
import React, { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { FlightCard } from './FlightCard';

interface FlightSearchProps {
  onFlightSelect: (flight: any) => void;
}

export const FlightSearch: React.FC<FlightSearchProps> = ({ onFlightSelect }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 500);
  
  const { searchFlights, clearSearch, hasSearched } = useFlightSearch();
  const { searchResults, loading, error } = useFlightStore();

  React.useEffect(() => {
    if (debouncedQuery.trim()) {
      searchFlights(debouncedQuery);
    } else {
      clearSearch();
    }
  }, [debouncedQuery, searchFlights, clearSearch]);

  const renderFlight = ({ item }: { item: any }) => (
    <FlightCard flight={item} onPress={() => onFlightSelect(item)} />
  );

  const renderEmptyState = () => {
    if (loading.isLoading) {
      return <LoadingSpinner message="Searching flights..." />;
    }

    if (error) {
      return (
        <ErrorDisplay
          message={error.message}
          onRetry={() => searchFlights(searchQuery)}
        />
      );
    }

    if (hasSearched && searchResults.length === 0) {
      return (
        <EmptyState
          title="No flights found"
          message="Try searching with a different flight number or airport code"
        />
      );
    }

    if (!hasSearched) {
      return (
        <EmptyState
          title="Search for flights"
          message="Enter a flight number (e.g., AA123) or airport code (e.g., JFK)"
        />
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.input,
              color: theme.colors.inputForeground,
              borderColor: theme.colors.border,
            }
          ]}
          placeholder="Search flights..."
          placeholderTextColor={theme.colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderFlight}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  listContainer: {
    flexGrow: 1,
  },
});