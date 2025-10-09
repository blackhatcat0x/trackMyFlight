import { searchFlights } from '@/services/flightService';
import { useFlightStore } from '@/store/flightStore';
import { Flight } from '@/types/flight';
import { debounce } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface SearchBarProps {
  onFlightSelect?: (flight: Flight) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const { width } = Dimensions.get('window');

export default function SearchBar({
  onFlightSelect,
  placeholder = 'Search flights...',
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));
  
  const { searchHistory, addToSearchHistory } = useFlightStore();

  // Debounced search function
  const debouncedSearch = debounce(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchFlights(searchQuery);
      setResults(searchResults.flights);
      setShowResults(true);
      
      // Animate results appearance
      Animated.timing(animatedHeight, {
        toValue: Math.min(searchResults.flights.length * 80, 320),
        duration: 200,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(query);
  }, [query]);

  const handleFlightPress = (flight: Flight) => {
    addToSearchHistory(query);
    setQuery('');
    setResults([]);
    setShowResults(false);
    onFlightSelect?.(flight);
    
    // Reset animation
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const renderFlightItem = ({ item }: { item: Flight }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleFlightPress(item)}
    >
      <View style={styles.flightInfo}>
        <Text style={styles.flightNumber}>{item.flightNumber}</Text>
        <Text style={styles.route}>
          {item.origin.code} → {item.destination.code}
        </Text>
        <Text style={styles.airline}>{item.airline.name}</Text>
      </View>
      
      <View style={styles.flightStatus}>
        <Text style={styles.statusText}>{item.status.status}</Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => setQuery(item)}
    >
      <Ionicons name="time" size={16} color="#666" />
      <Text style={styles.historyText}>{item}</Text>
      <Ionicons name="chevron-forward" size={16} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
        
        {loading && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIndicator} />
        )}
      </View>

      {/* Search Results */}
      {showResults && (
        <Animated.View style={[styles.resultsContainer, { height: animatedHeight }]}>
          {results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderFlightItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : query.length >= 2 && !loading ? (
            <View style={styles.noResults}>
              <Ionicons name="search" size={24} color="#CCC" />
              <Text style={styles.noResultsText}>No flights found</Text>
            </View>
          ) : null}
        </Animated.View>
      )}

      {/* Search History */}
      {!showResults && query.length === 0 && searchHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent Searches</Text>
          <FlatList
            data={searchHistory.slice(0, 5)}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => `history-${index}`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  flightInfo: {
    flex: 1,
  },
  flightNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  route: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  airline: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  flightStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
});