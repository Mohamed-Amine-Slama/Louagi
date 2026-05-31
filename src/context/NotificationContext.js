import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  initNotifications,
  pushLocalNotification,
  registerForRemoteNotifications,
} from '../services/notifications.service';

const NotificationCtx = createContext(null);

export function NotificationProvider({ children, navigationRef }) {
  const [granted, setGranted] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    initNotifications().then(async (allowed) => {
      setGranted(allowed);
      if (allowed) {
        const token = await registerForRemoteNotifications();
        setPushToken(token);
      }
    });

    // Listen for notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification payload data
      if (data?.screen && navigationRef?.isReady?.()) {
        navigationRef.navigate(data.screen, data.params || {});
      }
    });

    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <NotificationCtx.Provider value={{ granted, pushToken, pushLocalNotification }}>
      {children}
    </NotificationCtx.Provider>
  );
}

export const usePush = () => {
  const v = useContext(NotificationCtx);
  if (!v) throw new Error('usePush must be used within NotificationProvider');
  return v;
};
