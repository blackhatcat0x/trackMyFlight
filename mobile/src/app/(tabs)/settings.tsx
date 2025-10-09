import { useFlightStore } from '@/store/flightStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SettingsScreen() {
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  
  const {
    preferences,
    updatePreferences,
    searchHistory,
    recentFlights,
    trackedFlights,
    alerts,
  } = useFlightStore();

  const handleMapStyleChange = (style: 'light' | 'dark' | 'satellite') => {
    updatePreferences({ mapStyle: style });
  };

  const handleUnitsChange = (units: 'metric' | 'imperial') => {
    updatePreferences({ units });
  };

  const handleClearData = (type: 'search' | 'recent' | 'all') => {
    Alert.alert(
      'Clear Data',
      `Are you sure you want to clear ${type === 'all' ? 'all local data' : type + ' history'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            if (type === 'search') {
              // Clear search history
              updatePreferences({ searchHistory: [] });
            } else if (type === 'recent') {
              // Clear recent flights
              updatePreferences({ recentFlights: [] });
            } else if (type === 'all') {
              // Clear all data
              updatePreferences({
                trackedFlights: [],
                alerts: [],
                searchHistory: [],
                recentFlights: [],
              });
            }
          },
        },
      ]
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the link');
    });
  };

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Map Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Map Style</Text>
            <Text style={styles.settingSubtitle}>
              Current: {preferences.mapStyle.charAt(0).toUpperCase() + preferences.mapStyle.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.mapStyleOptions}>
          {(['light', 'dark', 'satellite'] as const).map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.mapStyleOption,
                preferences.mapStyle === style && styles.mapStyleOptionSelected,
              ]}
              onPress={() => handleMapStyleChange(style)}
            >
              <Text style={[
                styles.mapStyleOptionText,
                preferences.mapStyle === style && styles.mapStyleOptionTextSelected,
              ]}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Show Weather Overlay</Text>
            <Text style={styles.settingSubtitle}>Display weather on flight map</Text>
          </View>
          <Switch
            value={preferences.showWeather}
            onValueChange={(value) => updatePreferences({ showWeather: value })}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-track Nearby</Text>
            <Text style={styles.settingSubtitle}>Automatically track flights near you</Text>
          </View>
          <Switch
            value={preferences.autoTrackNearby}
            onValueChange={(value) => updatePreferences({ autoTrackNearby: value })}
          />
        </View>
      </View>

      {/* Units Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Units</Text>
        
        <View style={styles.unitsOptions}>
          {(['metric', 'imperial'] as const).map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[
                styles.unitOption,
                preferences.units === unit && styles.unitOptionSelected,
              ]}
              onPress={() => handleUnitsChange(unit)}
            >
              <Text style={[
                styles.unitOptionText,
                preferences.units === unit && styles.unitOptionTextSelected,
              ]}>
                {unit.charAt(0).toUpperCase() + unit.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.unitsDescription}>
          {preferences.units === 'metric' 
            ? 'Distances in km, altitude in meters, speed in km/h'
            : 'Distances in miles, altitude in feet, speed in mph'
          }
        </Text>
      </View>

      {/* Search Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Search Radius</Text>
            <Text style={styles.settingSubtitle}>{preferences.searchRadius} km</Text>
          </View>
        </View>
        
        <View style={styles.radiusOptions}>
          {[25, 50, 100, 200].map((radius) => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusOption,
                preferences.searchRadius === radius && styles.radiusOptionSelected,
              ]}
              onPress={() => updatePreferences({ searchRadius: radius })}
            >
              <Text style={[
                styles.radiusOptionText,
                preferences.searchRadius === radius && styles.radiusOptionTextSelected,
              ]}>
                {radius}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        {renderSettingItem(
          'Clear Search History',
          `${searchHistory.length} items`,
          () => handleClearData('search')
        )}
        
        {renderSettingItem(
          'Clear Recent Flights',
          `${recentFlights.length} flights`,
          () => handleClearData('recent')
        )}
        
        {renderSettingItem(
          'Clear All Data',
          'Tracked flights, alerts, history',
          () => handleClearData('all')
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        {renderSettingItem(
          'Privacy Policy',
          'View our privacy policy',
          () => openLink('https://trackmyflight.app/privacy')
        )}
        
        {renderSettingItem(
          'Terms of Service',
          'View our terms of service',
          () => openLink('https://trackmyflight.app/terms')
        )}
        
        {renderSettingItem(
          'Support',
          'Get help with the app',
          () => openLink('https://trackmyflight.app/support')
        )}
        
        {renderSettingItem(
          'Rate App',
          'Rate TrackMyFlight on the App Store',
          () => openLink('https://apps.apple.com/app/trackmyflight')
        )}
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Version</Text>
            <Text style={styles.settingSubtitle}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{trackedFlights.length}</Text>
            <Text style={styles.statLabel}>Tracked Flights</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{searchHistory.length}</Text>
            <Text style={styles.statLabel}>Searches</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mapStyleOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  mapStyleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  mapStyleOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  mapStyleOptionText: {
    fontSize: 14,
    color: '#333',
  },
  mapStyleOptionTextSelected: {
    color: '#fff',
  },
  unitsOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  unitOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  unitOptionTextSelected: {
    color: '#fff',
  },
  unitsDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  radiusOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#333',
  },
  radiusOptionTextSelected: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});