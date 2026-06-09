import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  initNotifications,
  pushLocalNotification,
  registerForRemoteNotifications,
} from '../services/notifications.service';
import { useAuth } from './AuthContext';
import { messagesApi } from '../api';

const NotificationCtx = createContext(null);

export function NotificationProvider({ children, navigationRef }) {
  const [granted, setGranted] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const prevChatsRef = useRef([]);

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

  // Polling for new messages and unread counts
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      prevChatsRef.current = [];
      return;
    }

    const poll = async () => {
      try {
        const chats = await messagesApi.listChats({ actor: user });
        const totalUnread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadCount(totalUnread);

        const currentRoute = navigationRef?.getCurrentRoute()?.name;
        if (currentRoute !== 'Chat') {
          chats.forEach((chat) => {
            const prevChat = prevChatsRef.current.find((pc) => pc.other_user?.id === chat.other_user?.id);
            if (chat.unread_count > 0) {
              const hasNewMessage = !prevChat || new Date(chat.updated_at) > new Date(prevChat.updated_at);
              if (hasNewMessage) {
                pushLocalNotification({
                  title: `New message from ${chat.other_user?.full_name || 'someone'}`,
                  body: chat.last_message || 'Tap to view your new message.',
                  data: {
                    screen: 'Chat',
                    params: {
                      userId: chat.other_user?.id,
                      userName: chat.other_user?.full_name,
                      phoneNumber: chat.other_user?.phone_number,
                    },
                  },
                });
              }
            }
          });
        }
        prevChatsRef.current = chats;
      } catch (e) {
        console.warn('Failed to poll messages', e);
      }
    };

    // Run immediately, then every 90s. ListChats is heavy (aggregate over
    // messages); polling more often than this just thrashes the DB.
    poll();
    const interval = setInterval(poll, 90000);
    return () => clearInterval(interval);
  }, [user, navigationRef]);

  return (
    <NotificationCtx.Provider value={{ granted, pushToken, pushLocalNotification, unreadCount }}>
      {children}
    </NotificationCtx.Provider>
  );
}

export const usePush = () => {
  const v = useContext(NotificationCtx);
  if (!v) throw new Error('usePush must be used within NotificationProvider');
  return v;
};
