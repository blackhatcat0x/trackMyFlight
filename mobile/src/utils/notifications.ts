import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Check current notification permission status
 */
export const getNotificationPermissionStatus = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Schedule a local notification
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string | null> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: trigger || null,
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Schedule a notification for a specific time
 */
export const scheduleNotificationForTime = async (
  title: string,
  body: string,
  scheduledTime: Date,
  data?: any
): Promise<string | null> => {
  const trigger: Notifications.NotificationTriggerInput = {
    date: scheduledTime,
  };
  
  return scheduleNotification(title, body, data, trigger);
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

/**
 * Send an immediate notification
 */
export const sendNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Immediate notification
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Create flight departure notification
 */
export const createDepartureNotification = async (
  flightNumber: string,
  origin: string,
  destination: string,
  scheduledTime: Date
): Promise<string | null> => {
  const title = `Flight ${flightNumber} Departing`;
  const body = `Your flight from ${origin} to ${destination} is scheduled to depart soon.`;
  
  return scheduleNotificationForTime(title, body, scheduledTime, {
    flightId: flightNumber,
    type: 'departure',
  });
};

/**
 * Create flight arrival notification
 */
export const createArrivalNotification = async (
  flightNumber: string,
  origin: string,
  destination: string,
  scheduledTime: Date
): Promise<string | null> => {
  const title = `Flight ${flightNumber} Arriving`;
  const body = `Your flight from ${origin} to ${destination} is scheduled to arrive soon.`;
  
  return scheduleNotificationForTime(title, body, scheduledTime, {
    flightId: flightNumber,
    type: 'arrival',
  });
};

/**
 * Create flight delay notification
 */
export const createDelayNotification = async (
  flightNumber: string,
  delayMinutes: number
): Promise<void> => {
  const title = `Flight ${flightNumber} Delayed`;
  const body = `Your flight is delayed by ${delayMinutes} minutes.`;
  
  await sendNotification(title, body, {
    flightId: flightNumber,
    type: 'delay',
    delayMinutes,
  });
};

/**
 * Create gate change notification
 */
export const createGateChangeNotification = async (
  flightNumber: string,
  newGate: string
): Promise<void> => {
  const title = `Gate Change for ${flightNumber}`;
  const body = `Your flight gate has been changed to ${newGate}.`;
  
  await sendNotification(title, body, {
    flightId: flightNumber,
    type: 'gate_change',
    newGate,
  });
};

/**
 * Create flight cancellation notification
 */
export const createCancellationNotification = async (
  flightNumber: string,
  reason?: string
): Promise<void> => {
  const title = `Flight ${flightNumber} Cancelled`;
  const body = reason 
    ? `Your flight has been cancelled: ${reason}`
    : `Your flight has been cancelled.`;
  
  await sendNotification(title, body, {
    flightId: flightNumber,
    type: 'cancellation',
    reason,
  });
};

/**
 * Set up notification listeners
 */
export const setupNotificationListeners = (
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): void => {
  // Listen for notifications received while app is in foreground
  const subscription1 = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    }
  );

  // Listen for user interactions with notifications
  const subscription2 = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification response:', response);
      onNotificationResponse?.(response);
    }
  );

  // Return cleanup function
  return () => {
    subscription1.remove();
    subscription2.remove();
  };
};

/**
 * Get notification channel information (Android)
 */
export const getNotificationChannel = async (): Promise<Notifications.NotificationChannel | null> => {
  if (Platform.OS !== 'android') return null;
  
  try {
    return await Notifications.getNotificationChannelAsync('flight-alerts');
  } catch (error) {
    console.error('Error getting notification channel:', error);
    return null;
  }
};

/**
 * Create notification channel (Android)
 */
export const createNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  
  try {
    await Notifications.setNotificationChannelAsync('flight-alerts', {
      name: 'Flight Alerts',
      description: 'Notifications for flight status updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lightColor: '#007AFF',
      bypassDnd: false,
    });
  } catch (error) {
    console.error('Error creating notification channel:', error);
  }
};

/**
 * Get badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Clear badge count
 */
export const clearBadgeCount = async (): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error clearing badge count:', error);
  }
};

/**
 * Dismiss all notifications
 */
export const dismissAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error dismissing notifications:', error);
  }
};