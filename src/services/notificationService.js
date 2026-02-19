import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, AndroidCategory, AndroidNotificationSetting, AndroidLaunchActivityFlag } from '@notifee/react-native';
import Sound from 'react-native-sound';
import { Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable playback in silence mode
Sound.setCategory('Playback');

const ORDER_NOTIFICATION_ID = 'ORDR_NOTIF';

class NotificationService {
    constructor() {
        this.ringtone = null;
        this.isRingtonePlaying = false;
    }

    async init() {
        // Create the high-priority channel for order notifications
        await notifee.createChannel({
            id: 'new_order_channel_v4',
            name: 'New Order Alerts',
            importance: AndroidImportance.MAX,
            sound: 'order_call',
            vibration: true,
            vibrationPattern: [300, 500],
        });

        // Request permissions
        await notifee.requestPermission();
    }

    async checkAndRequestPermissions() {
        // Request basic notification permissions
        await notifee.requestPermission();

        // On Android 12+, we need to check if we can show full screen intents
        const settings = await notifee.getNotificationSettings();
        if (settings.android.alarm !== AndroidNotificationSetting.ENABLED) {
            // Optional: Alert the user to enable full-screen intents in settings
        }
    }

    async requestOverlayPermission() {
        if (Platform.OS === 'android') {
            const hasBeenPrompted = await AsyncStorage.getItem('overlay_prompted');
            if (hasBeenPrompted === 'true') return;

            Alert.alert(
                'Important Permission',
                'To see new orders instantly (like a phone call), please ensure "Display over other apps" is enabled in your phone settings.',
                [
                    {
                        text: 'Already Enabled / Cancel',
                        style: 'cancel',
                        onPress: async () => await AsyncStorage.setItem('overlay_prompted', 'true')
                    },
                    {
                        text: 'Open Settings',
                        onPress: async () => {
                            await AsyncStorage.setItem('overlay_prompted', 'true');
                            Linking.openSettings();
                        }
                    }
                ]
            );
        }
    }

    playRingtone() {
        if (this.isRingtonePlaying) return;

        this.ringtone = new Sound('order_call.mp3', Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.log('Failed to load sound', error);
                return;
            }
            this.ringtone.setNumberOfLoops(-1); // Loop indefinitely
            this.ringtone.setVolume(1.0);
            this.ringtone.play((success) => {
                if (!success) {
                    console.log('Playback failed due to audio decoding errors');
                }
            });
            this.isRingtonePlaying = true;
        });
    }

    stopRingtone() {
        if (this.ringtone && this.isRingtonePlaying) {
            this.ringtone.stop();
            this.ringtone.release();
            this.ringtone = null;
            this.isRingtonePlaying = false;
        }
    }

    async displayNotification(title, body, data) {
        // Sanitize data: Notifee only accepts string values in the data object
        const sanitizedData = {};
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key] === null || data[key] === undefined) {
                    sanitizedData[key] = '';
                } else if (typeof data[key] === 'object') {
                    sanitizedData[key] = JSON.stringify(data[key]);
                } else {
                    sanitizedData[key] = String(data[key]);
                }
            });
        }

        await notifee.displayNotification({
            id: ORDER_NOTIFICATION_ID,
            title: 'New Order Available! 📦',
            body: 'Incoming order offer. Tap to view.',
            data: sanitizedData,
            android: {
                channelId: 'new_order_channel_v4',
                importance: AndroidImportance.MAX,
                category: AndroidCategory.CALL, // CALL is most aggressive for wake-up
                priority: 'high',
                ongoing: false,
                autoCancel: true,
                asForegroundService: true,
                fullScreenIntent: {
                    id: 'default',
                    launchActivity: 'com.sevabazar_driver_mobile.MainActivity',
                },
                pressAction: {
                    id: 'default',
                    launchActivity: 'com.sevabazar_driver_mobile.MainActivity',
                },
                launchActivityFlags: [
                    AndroidLaunchActivityFlag.SINGLE_TOP,
                    AndroidLaunchActivityFlag.CLEAR_TOP,
                    AndroidLaunchActivityFlag.NEW_TASK
                ],
                visibility: 1, // AndroidVisibility.PUBLIC
            },
        });
    }

    async clearNotifications() {
        await notifee.cancelNotification(ORDER_NOTIFICATION_ID);
    }
}

const notificationService = new NotificationService();

// Define the background handler
export const backgroundHandler = async (remoteMessage) => {
    console.log('Message handled in the background!', remoteMessage);

    const data = remoteMessage.data;
    if (data?.type === 'new_order' || data?.orderId) {
        const title = data.title || "New Order Available! 📦";
        const body = data.body || "You have a new order offer.";

        // Trigger notification to wake the app
        await notificationService.displayNotification(title, body, data);
    }
};

export default notificationService;
