import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createReminderController, weeklyTime } from '../domain/reminders';

const kind = 'sofra-weekly-menu';
const channelId = 'sofra-menu';
const allowed = (value: Notifications.NotificationPermissionsStatus) =>
  value.granted ||
  value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  value.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
const controller = createReminderController({
  async list() {
    return (await Notifications.getAllScheduledNotificationsAsync()).flatMap((item) => {
      const d = item.content.data;
      return d?.kind === kind &&
        typeof d.owner === 'string' &&
        typeof d.day === 'number' &&
        typeof d.time === 'string'
        ? [{ id: item.identifier, owner: d.owner, day: d.day, time: d.time }]
        : [];
    });
  },
  async permission(request) {
    if (request && Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync(channelId, {
        name: 'Haftalık menü',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    let status = await Notifications.getPermissionsAsync();
    if (request && !allowed(status) && status.canAskAgain)
      status = await Notifications.requestPermissionsAsync();
    return allowed(status);
  },
  async schedule(owner, input) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bu hafta sofranda ne var?',
        body: 'Menünü hazırla, alışveriş listeni gözden geçir.',
        data: { kind, owner, day: input.day, time: input.time },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        ...weeklyTime(input),
        channelId,
      },
    });
  },
  cancel: Notifications.cancelScheduledNotificationAsync,
});
export const localReminders = {
  available: true,
  ...controller,
  observe(open: () => void) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const handle = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.kind === kind) {
        Notifications.clearLastNotificationResponse();
        open();
      }
    };
    const response = Notifications.getLastNotificationResponse();
    if (response) handle(response);
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  },
};
