import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initNotifications() {
  if (Platform.OS === 'android') {
    // Expo Go's native channel manager can throw here (SDK 53+); a missing custom
    // channel only means Android's fallback channel is used, so keep going.
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C8102E',
      });
    } catch (e) {
      console.warn('Notification channel setup failed:', e?.message ?? e);
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function registerForRemoteNotifications() {
  try {
    // In bare/dev workflow, projectId must be passed explicitly.
    // We attempt to read it from Expo constants; if absent, skip remote push.
    let projectId;
    try {
      const Constants = require('expo-constants').default;
      projectId = Constants.expoConfig?.extra?.eas?.projectId;
    } catch (_) {
      // expo-constants not available
    }

    if (!projectId) {
      console.warn('Push tokens: no EAS projectId configured – skipping remote push registration.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.warn('Failed to get push token:', error);
    return null;
  }
}

export async function pushLocalNotification({ title, body, data = {} }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // trigger immediately
  });
}
