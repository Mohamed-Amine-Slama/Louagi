import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { initNotifications, pushLocalNotification } from '../services/notifications.service';

const NotificationCtx = createContext(null);

export function NotificationProvider({ children }) {
  const [granted, setGranted] = useState(false);
  const nav = useNavigation();

  useEffect(() => {
    initNotifications().then(setGranted);

    // Listen for notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification payload data
      if (data?.screen) {
        nav.navigate(data.screen, data.params || {});
      }
    });

    return () => subscription.remove();
  }, [nav]);

  return (
    <NotificationCtx.Provider value={{ granted, pushLocalNotification }}>
      {children}
    </NotificationCtx.Provider>
  );
}

export const usePush = () => {
  const v = useContext(NotificationCtx);
  if (!v) throw new Error('usePush must be used within NotificationProvider');
  return v;
};
