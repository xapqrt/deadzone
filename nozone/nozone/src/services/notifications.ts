import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
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

  static async scheduleMessageDelivery(
    messageId: string,
    messageText: string,
    deliverAt: Date
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return null;
      }

      const trigger = deliverAt.getTime() - Date.now();
      if (trigger <= 0) {
        // Message should be delivered immediately
        await this.sendImmediateNotification(messageText);
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Message Delivered',
          body: `"${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
          data: { messageId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.ceil(trigger / 1000),
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  static async sendImmediateNotification(messageText: string): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Message Delivered',
          body: `"${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  static async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  static async sendSyncNotification(syncedCount: number): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Messages Synced',
          body: `${syncedCount} message${syncedCount === 1 ? '' : 's'} synced successfully`,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending sync notification:', error);
    }
  }

  static getNotificationListener() {
    return Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
  }

  static getNotificationResponseListener() {
    return Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });
  }
}
