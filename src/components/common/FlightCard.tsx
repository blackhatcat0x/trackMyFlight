import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface FlightCardProps {
  flight: {
    callsign: string;
    origin: { iata: string; city: string };
    destination: { iata: string; city: string };
    departure: { scheduled: string; actual?: string };
    arrival: { scheduled: string; actual?: string };
    status: string;
    aircraft: { model: string };
  };
  onPress: () => void;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, onPress }) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return theme.colors.blue;
      case 'delayed': return theme.colors.orange;
      case 'in_flight': return theme.colors.green;
      case 'landed': return theme.colors.gray;
      case 'cancelled': return theme.colors.red;
      default: return theme.colors.gray;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.callsign, { color: theme.colors.cardForeground }]}>
          {flight.callsign}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(flight.status) }]}>
          <Text style={styles.statusText}>{flight.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.airport}>
          <Text style={[styles.airportCode, { color: theme.colors.cardForeground }]}>
            {flight.origin.iata}
          </Text>
          <Text style={[styles.airportCity, { color: theme.colors.muted }]}>
            {flight.origin.city}
          </Text>
        </View>

        <View style={styles.flightPath}>
          <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.plane, { color: theme.colors.primary }]}>✈</View>
        </View>

        <View style={styles.airport}>
          <Text style={[styles.airportCode, { color: theme.colors.cardForeground }]}>
            {flight.destination.iata}
          </Text>
          <Text style={[styles.airportCity, { color: theme.colors.muted }]}>
            {flight.destination.city}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.timeInfo}>
          <Text style={[styles.label, { color: theme.colors.muted }]}>Departure</Text>
          <Text style={[styles.time, { color: theme.colors.cardForeground }]}>
            {flight.departure.actual || flight.departure.scheduled}
          </Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={[styles.label, { color: theme.colors.muted }]}>Arrival</Text>
          <Text style={[styles.time, { color: theme.colors.cardForeground }]}>
            {flight.arrival.actual || flight.arrival.scheduled}
          </Text>
        </View>
      </View>

      <Text style={[styles.aircraft, { color: theme.colors.muted }]}>
        {flight.aircraft.model}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  callsign: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  airport: {
    flex: 1,
    alignItems: 'center',
  },
  airportCode: {
    fontSize: 20,
    fontWeight: '700',
  },
  airportCity: {
    fontSize: 12,
    marginTop: 2,
  },
  flightPath: {
    flex: 2,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    height: 2,
    width: '100%',
    position: 'absolute',
  },
  plane: {
    position: 'absolute',
    fontSize: 16,
    backgroundColor: 'white',
    paddingHorizontal: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeInfo: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
  },
  aircraft: {
    fontSize: 12,
    textAlign: 'center',
  },
});