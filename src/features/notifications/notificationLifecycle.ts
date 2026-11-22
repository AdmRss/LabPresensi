import type { Href } from 'expo-router';

import { getNotificationHref, parseNotificationPayload } from './notificationNavigation';
import type { NotificationPayload } from './types';

type Notification = { request: { content: { data?: unknown } } };
type NotificationResponse = { actionIdentifier: string; notification: Notification };
type Viewer = Parameters<typeof getNotificationHref>[1];

type ExpoNotificationsApi = {
  DEFAULT_ACTION_IDENTIFIER: string;
  setNotificationHandler(handler: {
    handleNotification(notification: Notification): Promise<{
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  } | null): void;
  addNotificationResponseReceivedListener(listener: (response: NotificationResponse) => void): { remove(): void };
  getLastNotificationResponse(): NotificationResponse | null;
  clearLastNotificationResponse(): void;
};

export function connectNotificationLifecycle(
  notifications: ExpoNotificationsApi,
  getState: () => { viewer: Viewer; authLoading: boolean; navigationReady: boolean },
  navigate: (href: Href) => void,
) {
  let pending: NotificationPayload | null = null;
  let handledEventId: string | undefined;

  function flush() {
    const { viewer, authLoading, navigationReady } = getState();
    if (!pending || authLoading || !viewer || !navigationReady) return;

    const href = getNotificationHref(pending, viewer);
    const eventId = pending.eventId;
    if (href && handledEventId !== eventId) {
      try {
        navigate(href);
      } catch {
        return;
      }
      handledEventId = eventId;
    }
    pending = null;
    notifications.clearLastNotificationResponse();
  }

  function handleResponse(response: NotificationResponse) {
    if (response.actionIdentifier !== notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const payload = parseNotificationPayload(response.notification.request.content.data);
    if (!payload) return;

    pending = payload;
    flush();
  }

  notifications.setNotificationHandler({
    async handleNotification(notification) {
      const payload = parseNotificationPayload(notification.request.content.data);
      const { viewer, authLoading } = getState();
      const visible = !authLoading && !!payload && !!getNotificationHref(payload, viewer);
      return { shouldShowBanner: visible, shouldShowList: visible, shouldPlaySound: visible, shouldSetBadge: false };
    },
  });

  const subscription = notifications.addNotificationResponseReceivedListener(handleResponse);
  const lastResponse = notifications.getLastNotificationResponse();
  if (lastResponse) handleResponse(lastResponse);

  return {
    flush,
    disconnect() {
      subscription.remove();
      notifications.setNotificationHandler(null);
      pending = null;
    },
  };
}
