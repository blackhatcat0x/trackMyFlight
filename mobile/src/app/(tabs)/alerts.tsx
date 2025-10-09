import { useFlightStore } from '@/store/flightStore';
import { Flight, FlightAlert } from '@/types/flight';
import { requestNotificationPermission } from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AlertsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const { alerts, trackedFlights, updateAlert, addAlert, preferences, updatePreferences } = useFlightStore();

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestNotificationPermission();
      setNotificationsEnabled(hasPermission);
      updatePreferences({ notifications: hasPermission });
    } catch (error) {
      console.error('Error checking notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && !notificationsEnabled) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Notifications Required',
          'Please enable notifications in your device settings to receive flight alerts.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    setNotificationsEnabled(enabled);
    updatePreferences({ notifications: enabled });
  };

  const createAlertForFlight = (flight: Flight) => {
    const existingAlert = alerts.find(a => a.flightId === flight.id);
    
    if (existingAlert) {
      Alert.alert(
        'Alert Exists',
        'You already have alerts set up for this flight.',
        [{ text: 'OK' }]
      );
      return;
    }

    const newAlert: FlightAlert = {
      id: `alert_${Date.now()}`,
      flightId: flight.id,
      type: 'departure',
      enabled: true,
      threshold: {
        delayMinutes: 15,
      },
      createdAt: new Date(),
    };

    addAlert(newAlert);
    Alert.alert(
      'Alert Created',
      `You'll be notified when ${flight.flightNumber} departs.`,
      [{ text: 'OK' }]
    );
  };

  const toggleAlert = (alertId: string, enabled: boolean) => {
    updateAlert(alertId, { enabled });
  };

  const deleteAlert = (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In a real app, you'd have a removeAlert function
            // For now, we'll just disable it
            updateAlert(alertId, { enabled: false });
          },
        },
      ]
    );
  };

  const renderAlertItem = ({ item }: { item: FlightAlert }) => {
    const flight = trackedFlights.find(f => f.id === item.flightId);
    
    if (!flight) return null;

    return (
      <View style={styles.alertItem}>
        <View style={styles.alertInfo}>
          <Text style={styles.alertFlight}>{flight.flightNumber}</Text>
          <Text style={styles.alertRoute}>
            {flight.origin.code} → {flight.destination.code}
          </Text>
          <Text style={styles.alertType}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Alert
          </Text>
        </View>
        
        <View style={styles.alertControls}>
          <Switch
            value={item.enabled}
            onValueChange={(enabled) => toggleAlert(item.id, enabled)}
          />
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteAlert(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTrackedFlightItem = ({ item }: { item: Flight }) => {
    const hasAlert = alerts.some(a => a.flightId === item.id);
    
    return (
      <View style={styles.flightItem}>
        <View style={styles.flightInfo}>
          <Text style={styles.flightNumber}>{item.flightNumber}</Text>
          <Text style={styles.flightRoute}>
            {item.origin.code} → {item.destination.code}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.createAlertButton,
            hasAlert && styles.alertExistsButton,
          ]}
          onPress={() => createAlertForFlight(item)}
          disabled={hasAlert}
        >
          <Ionicons
            name={hasAlert ? 'checkmark' : 'notifications-outline'}
            size={20}
            color={hasAlert ? '#4CAF50' : '#007AFF'}
          />
          <Text style={[
            styles.createAlertText,
            hasAlert && styles.alertExistsText,
          ]}>
            {hasAlert ? 'Alert Set' : 'Create Alert'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Notifications Settings */}
      <View style={styles.settingsSection}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive alerts for flight status changes
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
          />
        </View>
      </View>

      {/* Active Alerts */}
      {alerts.filter(a => a.enabled).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <FlatList
            data={alerts.filter(a => a.enabled)}
            renderItem={renderAlertItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Tracked Flights */}
      {trackedFlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracked Flights</Text>
          <FlatList
            data={trackedFlights}
            renderItem={renderTrackedFlightItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Empty State */}
      {alerts.length === 0 && trackedFlights.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Alerts Yet</Text>
          <Text style={styles.emptyText}>
            Track flights and set up alerts to stay informed about status changes
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/index')}
          >
            <Text style={styles.browseButtonText}>Browse Flights</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  settingsSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  alertItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertInfo: {
    flex: 1,
  },
  alertFlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  alertRoute: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  alertType: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  alertControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  flightItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flightInfo: {
    flex: 1,
  },
  flightNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  flightRoute: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  createAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    gap: 6,
  },
  alertExistsButton: {
    backgroundColor: '#E8F5E8',
  },
  createAlertText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  alertExistsText: {
    color: '#4CAF50',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});