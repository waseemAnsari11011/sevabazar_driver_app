/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { backgroundHandler } from './src/services/notificationService';

// Register background handlers
messaging().setBackgroundMessageHandler(backgroundHandler);
notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[Notifee] Background Event:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);
