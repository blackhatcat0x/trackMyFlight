import { FlightTracker } from '@/components/FlightTracker';
import { getFlightDetails } from '@/services/flightService';
import { useFlightStore } from '@/store/flightStore';
import { Flight, FlightPosition } from '@/types/flight';
import { formatAltitude, formatDateTime, formatDuration, formatSpeed } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

export default function FlightDetailScreen() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { trackedFlights, addTrackedFlight, removeTrackedFlight } = useFlightStore();

  useEffect(() => {
    loadFlightDetails();
  }, [id]);

  const loadFlightDetails = async () => {
    try {
      setLoading(true);
      const flightData = await getFlightDetails(id as string);
      setFlight(flightData);
    } catch (error) {
      console.error('Error loading flight details:', error);
      Alert.alert('Error', 'Failed to load flight details');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackFlight = () => {
    if (!flight) return;
    
    if (trackedFlights.find(f => f.id === flight.id)) {
      removeTrackedFlight(flight.id);
      Alert.alert('Removed', 'Flight removed from tracked list');
    } else {
      addTrackedFlight(flight);
      Alert.alert('Added', 'Flight added to tracked list');
    }
  };

  const handleShare = async () => {
    if (!flight) return;
    
    try {
      const shareUrl = `https://trackmyflight.app/flight/${flight.id}`;
      await Share.share({
        message: `Track ${flight.flightNumber} from ${flight.origin.code} to ${flight.destination.code}: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing flight:', error);
    }
  };

  const renderRouteLine = () => {
    if (!flight?.route?.points || !showRoute) return null;
    
    return (
      <Mapbox.ShapeSource
        id="route"
        shape={{
          type: 'LineString',
          coordinates: flight.route.points.map(point => [point[1], point[0]]),
        }}
      >
        <Mapbox.LineLayer
          id="routeLine"
          style={{
            lineColor: '#007AFF',
            lineWidth: 3,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading flight details...</Text>
      </View>
    );
  }

  if (!flight) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Flight not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isTracked = trackedFlights.find(f => f.id === flight.id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
          <Text style={styles.airline}>{flight.airline.name}</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTrackFlight}
          >
            <Ionicons
              name={isTracked ? 'star' : 'star-outline'}
              size={24}
              color={isTracked ? '#FFD700' : '#fff'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Real-time Flight Tracking Map */}
        <View style={styles.mapContainer}>
          <FlightTracker
            flight={flight}
            showRoute={showRoute}
            onPositionUpdate={(position: FlightPosition) => {
              // Update flight data with new position
              setFlight(prev => prev ? {
                ...prev,
                currentPosition: position,
                updatedAt: new Date(),
              } : null);
            }}
          />
          
          <TouchableOpacity
            style={styles.mapToggle}
            onPress={() => setShowRoute(!showRoute)}
          >
            <Ionicons
              name={showRoute ? 'eye-off' : 'eye'}
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>

        {/* Flight Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flight Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: getStatusColor(flight.status.status) }]}>
              {flight.status.status.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Aircraft</Text>
            <Text style={styles.infoValue}>
              {flight.aircraft?.model || 'Unknown'}
            </Text>
          </View>
          
          {flight.aircraft?.registration && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registration</Text>
              <Text style={styles.infoValue}>{flight.aircraft.registration}</Text>
            </View>
          )}
          
          {flight.currentPosition && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Altitude</Text>
                <Text style={styles.infoValue}>
                  {formatAltitude(flight.currentPosition.altitude)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Speed</Text>
                <Text style={styles.infoValue}>
                  {formatSpeed(flight.currentPosition.speed)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Heading</Text>
                <Text style={styles.infoValue}>
                  {Math.round(flight.currentPosition.heading)}°
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          
          <View style={styles.scheduleItem}>
            <View style={styles.scheduleAirport}>
              <Text style={styles.scheduleCode}>{flight.origin.code}</Text>
              <Text style={styles.scheduleName}>{flight.origin.name}</Text>
            </View>
            
            <View style={styles.scheduleTimes}>
              <Text style={styles.scheduleLabel}>Scheduled</Text>
              <Text style={styles.scheduleTime}>
                {formatDateTime(flight.status.scheduled.departure)}
              </Text>
              
              {flight.status.estimated?.departure && (
                <>
                  <Text style={styles.scheduleLabel}>Estimated</Text>
                  <Text style={styles.scheduleTime}>
                    {formatDateTime(flight.status.estimated.departure)}
                  </Text>
                </>
              )}
            </View>
          </View>
          
          <View style={styles.scheduleItem}>
            <View style={styles.scheduleAirport}>
              <Text style={styles.scheduleCode}>{flight.destination.code}</Text>
              <Text style={styles.scheduleName}>{flight.destination.name}</Text>
            </View>
            
            <View style={styles.scheduleTimes}>
              <Text style={styles.scheduleLabel}>Scheduled</Text>
              <Text style={styles.scheduleTime}>
                {formatDateTime(flight.status.scheduled.arrival)}
              </Text>
              
              {flight.status.estimated?.arrival && (
                <>
                  <Text style={styles.scheduleLabel}>Estimated</Text>
                  <Text style={styles.scheduleTime}>
                    {formatDateTime(flight.status.estimated.arrival)}
                  </Text>
                </>
              )}
            </View>
          </View>
          
          {flight.route && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>
                {Math.round(flight.route.distance)} NM
              </Text>
            </View>
          )}
          
          {flight.route && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {formatDuration(flight.route.estimatedDuration)}
              </Text>
            </View>
          )}
        </View>

        {/* Airport Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Airport Information</Text>
          
          <View style={styles.airportSection}>
            <Text style={styles.airportTitle}>Departure</Text>
            <Text style={styles.airportName}>{flight.origin.name}</Text>
            <Text style={styles.airportLocation}>
              {flight.origin.city}, {flight.origin.country}
            </Text>
          </View>
          
          <View style={styles.airportSection}>
            <Text style={styles.airportTitle}>Arrival</Text>
            <Text style={styles.airportName}>{flight.destination.name}</Text>
            <Text style={styles.airportLocation}>
              {flight.destination.city}, {flight.destination.country}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'departed': return '#2196F3';
    case 'arrived': return '#4CAF50';
    case 'delayed': return '#FF9800';
    case 'cancelled': return '#F44336';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  flightNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  airline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  originMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  destinationMarker: {
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentMarker: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 8,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  scheduleItem: {
    marginBottom: 20,
  },
  scheduleAirport: {
    marginBottom: 8,
  },
  scheduleCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  scheduleName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scheduleTimes: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  airportSection: {
    marginBottom: 16,
  },
  airportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  airportName: {
    fontSize: 14,
    color: '#666',
  },
  airportLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
