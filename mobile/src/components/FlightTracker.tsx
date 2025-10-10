import { subscribeToFlightUpdates } from '@/services/flightService';
import { Flight, FlightPosition } from '@/types/flight';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

interface FlightTrackerProps {
  flight: Flight;
  showRoute?: boolean;
  onPositionUpdate?: (position: FlightPosition) => void;
}

const { width, height } = Dimensions.get('window');

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

export const FlightTracker: React.FC<FlightTrackerProps> = ({
  flight,
  showRoute = true,
  onPositionUpdate,
}) => {
  const [currentPosition, setCurrentPosition] = useState<FlightPosition | null>(
    flight.currentPosition || null
  );
  const [isTracking, setIsTracking] = useState(true);
  const mapRef = useRef<Mapbox.MapView>(null);
  const planeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTracking) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToFlightUpdates(flight.id, (position) => {
      setCurrentPosition(position);
      onPositionUpdate?.(position);
      
      // Animate plane movement
      animatePlaneMovement();
    });

    return unsubscribe;
  }, [flight.id, isTracking, onPositionUpdate]);

  const animatePlaneMovement = () => {
    Animated.sequence([
      Animated.timing(planeAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(planeAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderRouteLine = () => {
    if (!flight.route?.points || !showRoute) return null;

    return (
      <Mapbox.ShapeSource
        id={`route_${flight.id}`}
        shape={{
          type: 'LineString',
          coordinates: flight.route.points.map(point => [point[1], point[0]]),
        }}
      >
        <Mapbox.LineLayer
          id={`routeLine_${flight.id}`}
          style={{
            lineColor: '#007AFF',
            lineWidth: 3,
            lineCap: 'round',
            lineJoin: 'round',
            lineDasharray: [2, 2],
          }}
        />
      </Mapbox.ShapeSource>
    );
  };

  const renderFlightPath = () => {
    if (!currentPosition || !flight.route?.points) return null;

    // Create path from current position to destination
    const pathToDestination = [
      [currentPosition.longitude, currentPosition.latitude],
      [flight.destination.longitude, flight.destination.latitude],
    ];

    return (
      <Mapbox.ShapeSource
        id={`pathToDest_${flight.id}`}
        shape={{
          type: 'LineString',
          coordinates: pathToDestination,
        }}
      >
        <Mapbox.LineLayer
          id={`pathToDestLine_${flight.id}`}
          style={{
            lineColor: '#4CAF50',
            lineWidth: 2,
            lineCap: 'round',
            lineDasharray: [1, 1],
          }}
        />
      </Mapbox.ShapeSource>
    );
  };

  const getMapBounds = () => {
    if (!currentPosition) {
      return {
        ne: [flight.destination.longitude, flight.destination.latitude],
        sw: [flight.origin.longitude, flight.origin.latitude],
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: 100,
        paddingBottom: 100,
      };
    }

    // Include current position in bounds
    const coordinates = [
      [flight.origin.longitude, flight.origin.latitude],
      [flight.destination.longitude, flight.destination.latitude],
      [currentPosition.longitude, currentPosition.latitude],
    ];

    const lons = coordinates.map(coord => coord[0]);
    const lats = coordinates.map(coord => coord[1]);

    return {
      ne: [Math.min(...lons), Math.min(...lats)],
      sw: [Math.max(...lons), Math.max(...lats)],
      paddingLeft: 40,
      paddingRight: 40,
      paddingTop: 100,
      paddingBottom: 100,
    };
  };

  const renderAircraftMarker = () => {
    if (!currentPosition) return null;

    const rotation = -currentPosition.heading; // Mapbox uses counter-clockwise rotation

    return (
      <Mapbox.PointAnnotation
        id={`aircraft_${flight.id}`}
        coordinate={[currentPosition.longitude, currentPosition.latitude]}
      >
        <Animated.View
          style={[
            styles.aircraftMarker,
            {
              transform: [
                {
                  rotate: `${rotation}deg`,
                },
                {
                  scale: planeAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.aircraftIcon}>
            <Ionicons 
              name="airplane" 
              size={24} 
              color="#007AFF" 
              style={{ transform: [{ rotate: '0deg' }] }}
            />
          </View>
          <View style={styles.aircraftGlow} />
        </Animated.View>
      </Mapbox.PointAnnotation>
    );
  };

  const renderInfoOverlay = () => {
    if (!currentPosition) return null;

    return (
      <View style={styles.infoOverlay}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="speedometer" size={16} color="#666" />
            <Text style={styles.infoText}>
              {Math.round(currentPosition.speed * 1.852)} km/h
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="arrow-up" size={16} color="#666" />
            <Text style={styles.infoText}>
              {Math.round(currentPosition.altitude * 0.3048)} m
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="compass" size={16} color="#666" />
            <Text style={styles.infoText}>
              {Math.round(currentPosition.heading)}°
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.trackingButton, isTracking && styles.trackingActive]}
          onPress={() => setIsTracking(!isTracking)}
        >
          <Ionicons 
            name={isTracking ? "location" : "location-outline"} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Light}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera bounds={getMapBounds()} animationMode={'flyTo'} animationDuration={1000} />
        
        {/* Origin marker */}
        <Mapbox.PointAnnotation
          id={`origin_${flight.id}`}
          coordinate={[flight.origin.longitude, flight.origin.latitude]}
        >
          <View style={styles.originMarker}>
            <Text style={styles.markerText}>{flight.origin.code}</Text>
          </View>
        </Mapbox.PointAnnotation>
        
        {/* Destination marker */}
        <Mapbox.PointAnnotation
          id={`destination_${flight.id}`}
          coordinate={[flight.destination.longitude, flight.destination.latitude]}
        >
          <View style={styles.destinationMarker}>
            <Text style={styles.markerText}>{flight.destination.code}</Text>
          </View>
        </Mapbox.PointAnnotation>
        
        {/* Route line */}
        {renderRouteLine()}
        
        {/* Flight path to destination */}
        {renderFlightPath()}
        
        {/* Aircraft marker */}
        {renderAircraftMarker()}
        
        {/* Current position trail */}
        {currentPosition && (
          <Mapbox.ShapeSource
            id={`trail_${flight.id}`}
            shape={{
              type: 'Point',
              coordinates: [currentPosition.longitude, currentPosition.latitude],
            }}
          >
            <Mapbox.CircleLayer
              id={`trailCircle_${flight.id}`}
              style={{
                circleRadius: 8,
                circleColor: 'rgba(0, 122, 255, 0.3)',
                circleStrokeWidth: 2,
                circleStrokeColor: '#007AFF',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>
      
      {/* Info overlay */}
      {renderInfoOverlay()}
    </View>
  );
};

import { Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  aircraftMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aircraftIcon: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  aircraftGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: 20,
  },
  originMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationMarker: {
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 150,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  trackingButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingActive: {
    backgroundColor: '#007AFF',
  },
});

export default FlightTracker;
