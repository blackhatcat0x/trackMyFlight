import { Flight } from '@/types/flight';
import { formatAltitude, formatSpeed, formatTime } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface FlightCardProps {
  flight: Flight;
  isTracked?: boolean;
  onPress?: () => void;
  onTrack?: () => void;
  compact?: boolean;
}

export default function FlightCard({
  flight,
  isTracked = false,
  onPress,
  onTrack,
  compact = false,
}: FlightCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'departed': return '#4CAF50';
      case 'arrived': return '#2196F3';
      case 'delayed': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'departed': return 'airplane';
      case 'arrived': return 'checkmark-circle';
      case 'delayed': return 'time';
      case 'cancelled': return 'close-circle';
      default: return 'calendar';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        compact && styles.compactContainer,
        isTracked && styles.trackedContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flightInfo}>
          <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
          <Text style={styles.airline}>{flight.airline.name}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(flight.status.status) }]}>
            <Ionicons
              name={getStatusIcon(flight.status.status)}
              size={12}
              color="#fff"
            />
            <Text style={styles.statusText}>{flight.status.status.toUpperCase()}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.trackButton}
            onPress={onTrack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isTracked ? 'star' : 'star-outline'}
              size={20}
              color={isTracked ? '#FFD700' : '#666'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.airport}>
          <Text style={styles.airportCode}>{flight.origin.code}</Text>
          <Text style={styles.airportName}>{flight.origin.city}</Text>
          <Text style={styles.time}>
            {formatTime(flight.status.scheduled.departure)}
          </Text>
        </View>
        
        <View style={styles.routeLine}>
          <View style={styles.line} />
          <Ionicons name="airplane" size={16} color="#007AFF" />
          <View style={styles.line} />
        </View>
        
        <View style={styles.airport}>
          <Text style={styles.airportCode}>{flight.destination.code}</Text>
          <Text style={styles.airportName}>{flight.destination.city}</Text>
          <Text style={styles.time}>
            {formatTime(flight.status.scheduled.arrival)}
          </Text>
        </View>
      </View>

      {/* Current Position (if available) */}
      {flight.currentPosition && !compact && (
        <View style={styles.currentPosition}>
          <View style={styles.positionItem}>
            <Ionicons name="speedometer" size={14} color="#666" />
            <Text style={styles.positionText}>
              {formatSpeed(flight.currentPosition.speed)}
            </Text>
          </View>
          
          <View style={styles.positionItem}>
            <Ionicons name="arrow-up" size={14} color="#666" />
            <Text style={styles.positionText}>
              {formatAltitude(flight.currentPosition.altitude)}
            </Text>
          </View>
          
          <View style={styles.positionItem}>
            <Ionicons name="compass" size={14} color="#666" />
            <Text style={styles.positionText}>
              {Math.round(flight.currentPosition.heading)}°
            </Text>
          </View>
        </View>
      )}

      {/* Aircraft Info */}
      {flight.aircraft && !compact && (
        <View style={styles.aircraft}>
          <Ionicons name="airplane" size={14} color="#666" />
          <Text style={styles.aircraftText}>
            {flight.aircraft.model} ({flight.aircraft.registration})
          </Text>
        </View>
      )}

      {/* Delay Info */}
      {flight.status.delayMinutes && flight.status.delayMinutes > 0 && (
        <View style={styles.delayInfo}>
          <Ionicons name="warning" size={14} color="#FF9800" />
          <Text style={styles.delayText}>
            Delayed by {flight.status.delayMinutes} minutes
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    padding: 12,
  },
  trackedContainer: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  flightInfo: {
    flex: 1,
  },
  flightNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  airline: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  trackButton: {
    padding: 4,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  airport: {
    alignItems: 'center',
    flex: 1,
  },
  airportCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  airportName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  routeLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  currentPosition: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  positionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionText: {
    fontSize: 12,
    color: '#666',
  },
  aircraft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  aircraftText: {
    fontSize: 12,
    color: '#666',
  },
  delayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
  },
  delayText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '500',
  },
});