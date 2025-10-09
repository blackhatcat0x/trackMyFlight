import { Button, ErrorDisplay, LoadingSpinner } from '@/components/ui';
import { useFlightDetails } from '@/hooks';
import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export const FlightDetailScreen: React.FC<{ route: { params: { flightId: string } } }> = ({ route }) => {
  const theme = useTheme();
  const { flightId } = route.params;
  const { flight, isLoading, clearFlightDetails } = useFlightDetails(flightId);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading flight details..." />
      </SafeAreaView>
    );
  }

  if (!flight) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorDisplay
          message="Flight not found"
          onRetry={() => clearFlightDetails()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          {flight.callsign}
        </Text>
        <Text style={[styles.airline, { color: theme.colors.muted }]}>
          {flight.airline.name}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            Route
          </Text>
          <View style={styles.route}>
            <View style={styles.airport}>
              <Text style={[styles.airportCode, { color: theme.colors.foreground }]}>
                {flight.origin.iata}
              </Text>
              <Text style={[styles.airportName, { color: theme.colors.muted }]}>
                {flight.origin.name}
              </Text>
            </View>
            <Text style={[styles.arrow, { color: theme.colors.primary }]}>→</Text>
            <View style={styles.airport}>
              <Text style={[styles.airportCode, { color: theme.colors.foreground }]}>
                {flight.destination.iata}
              </Text>
              <Text style={[styles.airportName, { color: theme.colors.muted }]}>
                {flight.destination.name}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            Aircraft
          </Text>
          <Text style={[styles.aircraftInfo, { color: theme.colors.cardForeground }]}>
            {flight.aircraft.model}
          </Text>
          <Text style={[styles.registration, { color: theme.colors.muted }]}>
            Registration: {flight.aircraft.registration}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            Status
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(flight.status) }]}>
            <Text style={styles.statusText}>{flight.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Back to Search"
          onPress={clearFlightDetails}
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'scheduled': return '#3b82f6';
    case 'delayed': return '#f59e0b';
    case 'in_flight': return '#10b981';
    case 'landed': return '#6b7280';
    case 'cancelled': return '#ef4444';
    default: return '#6b7280';
  }
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  airline: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airport: {
    flex: 1,
    alignItems: 'center',
  },
  airportCode: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  airportName: {
    fontSize: 14,
    textAlign: 'center',
  },
  arrow: {
    fontSize: 24,
    fontWeight: '700',
  },
  aircraftInfo: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  registration: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});