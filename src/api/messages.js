import { db, findUserById, newId } from './mockDb';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';
import { encryptMessage, decryptMessage } from '../security/encryption';
import { decryptField } from '../security/crypto';
import { pushLocalNotification } from '../services/notifications.service';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// List chats for a user (Inbox)
export async function listChats({ actor }) {
  if (!actor?.id) return [];
  if (!useMocks) {
    const rawChats = await gqlList('ListChats');
    return rawChats.map((c) => ({
      other_user: {
        id: c.partnerId,
        full_name: c.partnerName,
        role: c.partnerRole,
        phone_number: c.partnerPhone,
      },
      last_message: c.lastMessage,
      updated_at: c.lastMessageTime,
      unread_count: c.unreadCount,
    }));
  }
  await sleep(80);
  
  const myMessages = db.messages.filter(
    (m) => m.sender_id === actor.id || m.receiver_id === actor.id
  );

  // Group by the "other" user
  const chatMap = new Map();
  
  myMessages.forEach((m) => {
    const otherId = m.sender_id === actor.id ? m.receiver_id : m.sender_id;
    if (!chatMap.has(otherId) || new Date(m.created_at) > new Date(chatMap.get(otherId).created_at)) {
      chatMap.set(otherId, m);
    }
  });

  const chats = [];
  for (const [otherId, lastMsg] of chatMap.entries()) {
    const user = findUserById(otherId);
    if (user) {
      chats.push({
        other_user: {
          id: user.id,
          full_name: user.full_name,
          role: user.role,
          phone_number: decryptField(user.phone_number),
        },
        last_message: decryptMessage(lastMsg.content),
        updated_at: lastMsg.created_at,
        unread_count: db.messages.filter(m => m.sender_id === otherId && m.receiver_id === actor.id && !m.read).length
      });
    }
  }

  return chats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

// Fetch messages for a specific conversation
export async function getMessages({ actor, otherUserId }) {
  if (!actor?.id) return [];
  if (!useMocks) {
    const rawMessages = await gqlList('GetMessages', { otherUserId });
    return rawMessages.map((m) => ({
      id: m.id,
      sender_id: m.senderId,
      receiver_id: m.receiverId,
      content: m.content,
      read: m.isRead,
      created_at: m.createdAt,
    }));
  }
  await sleep(60);

  const thread = db.messages.filter(
    (m) =>
      (m.sender_id === actor.id && m.receiver_id === otherUserId) ||
      (m.sender_id === otherUserId && m.receiver_id === actor.id)
  );

  // Mark as read
  thread.forEach((m) => {
    if (m.receiver_id === actor.id) m.read = true;
  });

  return thread.map(m => ({
    ...m,
    content: decryptMessage(m.content)
  })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// Send a message
export async function sendMessage({ actor, receiverId, text }) {
  if (!actor?.id) return { ok: false, error: 'Not authenticated' };
  if (!useMocks) {
    const res = await gql('SendMessage', { receiverId, text });
    if (!res || !res.ok) {
      return { ok: false, error: res?.error || 'Failed to send message' };
    }
    return {
      ok: true,
      message: {
        id: res.message.id,
        sender_id: res.message.senderId,
        receiver_id: res.message.receiverId,
        content: res.message.content,
        read: res.message.isRead,
        created_at: res.message.createdAt,
      },
    };
  }
  await sleep(100);

  if (!text.trim()) return { ok: false, error: 'Empty message' };

  const encryptedContent = encryptMessage(text);
  
  const msg = {
    id: newId(),
    sender_id: actor.id,
    receiver_id: receiverId,
    content: encryptedContent,
    read: false,
    created_at: new Date().toISOString(),
  };

  db.messages.push(msg);

  // Push local notification to the receiver
  pushLocalNotification({
    title: `New message from ${actor.name || actor.full_name || 'someone'}`,
    body: 'Tap to view your new message.',
    data: { screen: 'ChatList' },
  });

  return { ok: true, message: { ...msg, content: decryptMessage(msg.content) } };
}
