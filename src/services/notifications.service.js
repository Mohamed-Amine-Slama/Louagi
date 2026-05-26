import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8102E',
    });
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
    // This requires a physical device and proper Expo config to work with FCM/APNs
    // We fetch the token here as a stub for future remote push integration
    const token = await Notifications.getExpoPushTokenAsync();
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
