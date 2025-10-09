import FlightCard from '@/components/FlightCard';
import SearchBar from '@/components/SearchBar';
import { searchFlights } from '@/services/flightService';
import { useFlightStore } from '@/store/flightStore';
import { Flight } from '@/types/flight';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function SearchScreen() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  
  const router = useRouter();
  const { recentFlights, trackedFlights, addRecentFlight } = useFlightStore();

  useEffect(() => {
    // Load recent flights on mount
    if (recentFlights.length > 0) {
      setFlights(recentFlights);
      setHasSearched(true);
    }
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setCurrentQuery(query);
    setLoading(true);
    setHasSearched(true);
    
    try {
      const result = await searchFlights(query);
      setFlights(result.flights);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlightSelect = (flight: Flight) => {
    addRecentFlight(flight);
    router.push(`/flight/${flight.id}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (currentQuery) {
      await handleSearch(currentQuery);
    }
    setRefreshing(false);
  };

  const renderFlightItem = ({ item }: { item: Flight }) => {
    const isTracked = trackedFlights.find(f => f.id === item.id);
    
    return (
      <FlightCard
        flight={item}
        isTracked={isTracked}
        onPress={() => handleFlightSelect(item)}
      />
    );
  };

  const renderEmptyState = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Search Flights</Text>
          <Text style={styles.emptyText}>
            Enter a flight number, route, or airline to find flights
          </Text>
        </View>
      );
    }
    
    if (loading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching flights...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>No Results</Text>
        <Text style={styles.emptyText}>
          Try searching with different keywords or check the spelling
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <SearchBar
          onFlightSelect={handleFlightSelect}
          placeholder="Search by flight number, route, or airline..."
        />
      </View>

      {/* Results List */}
      <FlatList
        data={flights}
        renderItem={renderFlightItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          hasSearched && !loading && flights.length > 0 ? (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {flights.length} flight{flights.length !== 1 ? 's' : ''} found
              </Text>
              {currentQuery && (
                <Text style={styles.searchQuery}>for "{currentQuery}"</Text>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  listContainer: {
    padding: 16,
  },
  resultsHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchQuery: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});