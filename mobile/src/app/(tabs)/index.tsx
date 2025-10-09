import FlightCard from '@/components/FlightCard';
import SearchBar from '@/components/SearchBar';
import { fetchNearbyFlights, subscribeToFlightUpdates } from '@/services/flightService';
import { useFlightStore } from '@/store/flightStore';
import { Flight, FlightPosition } from '@/types/flight';
import { getCurrentLocation, requestLocationPermission } from '@/utils/location';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

const { width, height } = Dimensions.get('window');

export default function TrackScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('light');
  const [showWeather, setShowWeather] = useState(false);
  const [showAR, setShowAR] = useState(false);
  
  const mapRef = useRef<Mapbox.MapView>(null);
  const router = useRouter();
  const { trackedFlights, addTrackedFlight, removeTrackedFlight } = useFlightStore();

  useEffect(() => {
    initializeLocation();
    return () => {
      // Cleanup subscriptions
    };
  }, []);

  const initializeLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Location Required',
          'TrackMyFlight needs location access to show nearby flights.',
          [{ text: 'OK' }]
        );
        return;
      }

      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      loadNearbyFlights(currentLocation);
    } catch (error) {
      console.error('Location initialization error:', error);
      setLoading(false);
    }
  };

  const loadNearbyFlights = async (currentLocation: { latitude: number; longitude: number }) => {
    try {
      setLoading(true);
      const nearbyFlights = await fetchNearbyFlights(
        currentLocation.latitude,
        currentLocation.longitude,
        50 // 50km radius
      );
      setFlights(nearbyFlights);
      
      // Subscribe to real-time updates
      nearbyFlights.forEach(flight => {
        subscribeToFlightUpdates(flight.id, (position: FlightPosition) => {
          setFlights(prev => 
            prev.map(f => 
              f.id === flight.id 
                ? { ...f, currentPosition: position }
                : f
            )
          );
        });
      });
    } catch (error) {
      console.error('Error loading flights:', error);
      Alert.alert('Error', 'Failed to load flight data');
    } finally {
      setLoading(false);
    }
  };

  const handleFlightSelect = (flight: Flight) => {
    setSelectedFlight(flight);
    if (mapRef.current && flight.currentPosition) {
      mapRef.current.setCamera({
        centerCoordinate: [
          flight.currentPosition.longitude,
          flight.currentPosition.latitude
        ],
        zoomLevel: 10,
        animationDuration: 1000,
      });
    }
  };

  const handleTrackFlight = (flight: Flight) => {
    if (trackedFlights.find(f => f.id === flight.id)) {
      removeTrackedFlight(flight.id);
    } else {
      addTrackedFlight(flight);
    }
  };

  const toggleMapStyle = () => {
    setMapStyle(prev => prev === 'light' ? 'dark' : 'light');
  };

  const openARMode = () => {
    router.push('/ar-camera');
  };

  const renderFlightMarkers = () => {
    return flights.map(flight => {
      if (!flight.currentPosition) return null;
      
      const isTracked = trackedFlights.find(f => f.id === flight.id);
      const isSelected = selectedFlight?.id === flight.id;
      
      return (
        <Mapbox.PointAnnotation
          key={flight.id}
          id={flight.id}
          coordinate={[
            flight.currentPosition.longitude,
            flight.currentPosition.latitude
          ]}
          onSelected={() => handleFlightSelect(flight)}
        >
          <View style={[
            styles.markerContainer,
            isSelected && styles.selectedMarker,
            isTracked && styles.trackedMarker
          ]}>
            <Ionicons 
              name="airplane" 
              size={20} 
              color={isSelected ? '#fff' : isTracked ? '#007AFF' : '#666'} 
            />
            <Text style={styles.markerText}>{flight.flightNumber}</Text>
          </View>
        </Mapbox.PointAnnotation>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading flights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={mapStyle === 'light' ? Mapbox.StyleURL.Light : Mapbox.StyleURL.Dark}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          zoomLevel={8}
          centerCoordinate={location ? [location.longitude, location.latitude] : [0, 0]}
        />
        
        {/* User location */}
        {location && (
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={[location.longitude, location.latitude]}
          >
            <View style={styles.userLocationMarker}>
              <Ionicons name="location" size={24} color="#007AFF" />
            </View>
          </Mapbox.PointAnnotation>
        )}
        
        {/* Flight markers */}
        {renderFlightMarkers()}
        
        {/* Weather overlay (placeholder) */}
        {showWeather && (
          <Mapbox.RasterSource
            id="weather-raster"
            tileSize={256}
            url="https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=YOUR_TOKEN"
          >
            <Mapbox.RasterLayer
              id="weather-layer"
              sourceID="weather-raster"
              style={{ opacity: 0.3 }}
            />
          </Mapbox.RasterSource>
        )}
      </Mapbox.MapView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          onFlightSelect={handleFlightSelect}
          placeholder="Search flight number or route..."
        />
      </View>

      {/* Control Buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleMapStyle}
        >
          <Ionicons 
            name={mapStyle === 'light' ? 'moon' : 'sunny'} 
            size={20} 
            color="#333" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowWeather(!showWeather)}
        >
          <Ionicons name="cloud" size={20} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={openARMode}
        >
          <Ionicons name="camera" size={20} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={initializeLocation}
        >
          <Ionicons name="refresh" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Selected Flight Card */}
      {selectedFlight && (
        <View style={styles.flightCardContainer}>
          <FlightCard
            flight={selectedFlight}
            isTracked={trackedFlights.find(f => f.id === selectedFlight.id) !== undefined}
            onTrack={() => handleTrackFlight(selectedFlight)}
            onPress={() => router.push(`/flight/${selectedFlight.id}`)}
          />
        </View>
      )}

      {/* Flight List Toggle */}
      <TouchableOpacity
        style={styles.flightListButton}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="list" size={24} color="#fff" />
        <Text style={styles.flightListText}>
          {flights.length} flights nearby
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  controlButtons: {
    position: 'absolute',
    top: 120,
    right: 16,
    zIndex: 100,
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 40,
  },
  selectedMarker: {
    backgroundColor: '#007AFF',
  },
  trackedMarker: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  markerText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    color: '#333',
  },
  userLocationMarker: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  flightCardContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  flightListButton: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  flightListText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});