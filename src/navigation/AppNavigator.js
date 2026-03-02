import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Alert, AppState, DeviceEventEmitter } from 'react-native';
import apiClient from '../api/client';
import Sound from 'react-native-sound';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PickupScreen from '../screens/PickupScreen';
import DeliveryScreen from '../screens/DeliveryScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import EarningsHistoryScreen from '../screens/EarningsHistoryScreen';
import SupportTicketScreen from '../screens/SupportTicketScreen';
import RejectionBlockedScreen from '../screens/RejectionBlockedScreen';
import OrderOfferModal from '../components/OrderOfferModal';
import TabNavigator from './TabNavigator';
import { useAuth } from '../AuthContext';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import socketService from '../services/socketService';
import notificationService from '../services/notificationService';

Sound.setCategory('Playback');

const Stack = createStackNavigator();

const AppNavigator = () => {
    const navigationRef = useRef(null);
    const { authToken, loading, logout } = useAuth();
    const [offerModalVisible, setOfferModalVisible] = useState(false);
    const [currentOffer, setCurrentOffer] = useState(null);
    const isListenersSetup = useRef(false);
    const appState = useRef(AppState.currentState);
    const lastOrderId = useRef(null);

    const handleIncomingOrder = async (orderData) => {
        if (!orderData || !orderData.orderId) return;

        // Avoid duplicate processing for the same order (Socket & FCM might both fire)
        if (lastOrderId.current === orderData.orderId && offerModalVisible) {
            console.log('[AppNavigator] Order already showing, skipping:', orderData.orderId);
            return;
        }

        lastOrderId.current = orderData.orderId;
        console.log('[AppNavigator] Processing Incoming Order:', orderData);

        try {
            notificationService.clearNotifications(); // Only clears the tray icon
            notificationService.playRingtone();
        } catch (e) {
            console.error('[AppNavigator] Ringtone/Notification Error:', e);
        }

        try {
            // If the offer already has calculation data from backend, use it!
            // FCM data comes as strings, so we might need to parse them
            const earning = orderData.earning !== undefined ? Number(orderData.earning) : undefined;
            const totalDistance = orderData.totalDistance !== undefined ? Number(orderData.totalDistance) : undefined;

            if (earning !== undefined && totalDistance !== undefined) {
                setCurrentOffer({
                    orderId: orderData.orderId,
                    earning: earning,
                    totalDistance: totalDistance,
                    rawOfferData: orderData
                });
                setOfferModalVisible(true);
                return;
            }

            // Fallback calculation logic
            const driverData = await AsyncStorage.getItem('driverData');
            if (!driverData) return;
            const driver = JSON.parse(driverData);

            // FCM data only supports strings, so we may need to parse coordinates
            const parseLoc = (loc) => {
                if (typeof loc === 'string') {
                    try {
                        const parsed = JSON.parse(loc);
                        // If it's still a string (e.g. '"{"lat":...}"'), parse again
                        if (typeof parsed === 'string') return JSON.parse(parsed);
                        return parsed;
                    } catch (e) { return loc; }
                }
                return loc;
            };

            const payload = {
                currentLocation: driver.currentLocation,
                pickupLocation: parseLoc(orderData.pickupLocation),
                dropLocation: parseLoc(orderData.dropLocation)
            };

            console.log('[AppNavigator] Recalculating with payload:', payload);
            const response = await apiClient.post('/calculate-delivery', payload);

            setCurrentOffer({
                orderId: orderData.orderId,
                earning: response.data.totalFee || 0,
                totalDistance: response.data.totalDistance || 0,
                rawOfferData: orderData
            });
            setOfferModalVisible(true);
        } catch (error) {
            console.error('[AppNavigator] Error processing order:', error);
            setCurrentOffer({
                orderId: orderData.orderId,
                earning: Number(orderData.earning) || 0,
                totalDistance: Number(orderData.totalDistance) || 0,
                rawOfferData: orderData
            });
            setOfferModalVisible(true);
        }
    };

    const setupSocketListeners = () => {
        if (isListenersSetup.current) return;

        console.log('[AppNavigator] Setting up socket listeners...');
        socketService.on('new_order_offer', (offerData) => {
            console.log('[AppNavigator] ✅ SOCKET OFFER RECEIVED');
            handleIncomingOrder(offerData);
        });

        socketService.on('order_taken', ({ orderId }) => {
            console.log('[AppNavigator] 📢 Order taken by another driver:', orderId);
            setOfferModalVisible(false);
            notificationService.stopRingtone();
            setCurrentOffer(null);
        });

        isListenersSetup.current = true;
    };

    useEffect(() => {
        notificationService.init();
        notificationService.checkAndRequestPermissions();

        // Prompt for overlay permission (Display over other apps)
        // This is needed for the app to jump to foreground automatically
        if (authToken) {
            notificationService.requestOverlayPermission();
        }

        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('[AppNavigator] App Active - Clearing visible notifications and checking for orders');
                notificationService.clearNotifications();

                // Re-check for any initial or pending notifications when coming to foreground
                notifee.getInitialNotification().then((initialNotification) => {
                    const data = initialNotification?.notification?.data;
                    if (data?.type === 'new_order') {
                        console.log('[AppNavigator] Found order data on App Active:', data);
                        handleIncomingOrder(data).catch(err => console.error('[AppNavigator] App Active order failed:', err));
                    }
                }).catch(err => console.error('[AppNavigator] Active state notification check error:', err));
            }
            appState.current = nextAppState;
        };
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Check for initial notification (app opened from killed state)
        notifee.getInitialNotification().then((initialNotification) => {
            const data = initialNotification?.notification?.data;
            if (data?.type === 'new_order') {
                console.log('[AppNavigator] Initial Notification Detected:', data);
                // Give the app some time to load before showing modal
                setTimeout(() => {
                    handleIncomingOrder(data).catch(err => console.error('[AppNavigator] Initial order failed:', err));
                }, 1500);
            }
        }).catch(err => console.error('[AppNavigator] getInitialNotification error:', err));

        // Handle FCM Foreground Messages
        const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
            console.log('[AppNavigator] Foreground FCM message:', remoteMessage);
            if (remoteMessage.data?.type === 'new_order') {
                handleIncomingOrder(remoteMessage.data);
            } else if (remoteMessage.data?.type === 'order_cancelled') {
                console.log('[AppNavigator] Foreground order cancelled push:', remoteMessage.data);

                // Play custom cancellation sound once
                const cancelSound = new Sound('order_cancelled.mp3', Sound.MAIN_BUNDLE, (error) => {
                    if (!error) cancelSound.play(() => cancelSound.release());
                });

                Alert.alert(
                    'Order Cancelled',
                    `Order #${remoteMessage.data.shortId || remoteMessage.data.orderId} has been cancelled by the customer.`,
                    [{ text: 'OK' }]
                );
                if (lastOrderId.current === remoteMessage.data.orderId) {
                    setOfferModalVisible(false);
                    notificationService.stopRingtone();
                    setCurrentOffer(null);
                }
            }
        });

        // Handle Notifee Foreground Events (e.g. Pressing the notification)
        const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
            if (type === notifee.EventType.PRESS || type === notifee.EventType.ACTION_PRESS) {
                const data = detail?.notification?.data;
                console.log('[AppNavigator] Notifee Event:', data);
                if (data?.type === 'new_order') {
                    handleIncomingOrder(data);
                }
            }
        });

        if (authToken) {
            console.log('[AppNavigator] AuthToken present, connecting socket...');
            socketService.connect().then(() => {
                setupSocketListeners();
            });
        }
        return () => {
            unsubscribeForeground();
            unsubscribeNotifee();
            appStateSubscription.remove();
            if (isListenersSetup.current) {
                socketService.removeAllListeners('new_order_offer');
                isListenersSetup.current = false;
            }
        };
    }, [authToken]);

    const handleAcceptOrder = async () => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.put(
                `/delivery/order-offer-response/${driver._id}`,
                {
                    orderId: currentOffer?.orderId,
                    action: 'accept',
                    currentLocation: driver?.currentLocation || { latitude: 0, longitude: 0 }
                }
            );

            if (response.data.success) {
                setOfferModalVisible(false);
                notificationService.stopRingtone();
                navigationRef.current?.navigate('Pickup', { order: currentOffer });
                setCurrentOffer(null);
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept order');
        }
    };

    const handleRejectOrder = async (reason) => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            setOfferModalVisible(false);
            notificationService.stopRingtone();
            const response = await apiClient.put(
                `/delivery/order-offer-response/${driver._id}`,
                {
                    orderId: currentOffer?.orderId,
                    action: 'reject',
                    rejectionReason: reason
                }
            );
            setCurrentOffer(null);

            // Emit real-time update to HomeScreen
            DeviceEventEmitter.emit('rejectionUpdated', {
                rejectionCount: response.data?.rejectionCount || 0,
                isBlocked: response.data?.isBlocked || false,
            });

            // Navigate to blocked screen immediately if driver just got blocked
            if (response.data?.isBlocked) {
                navigationRef.current?.navigate('RejectionBlocked');
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator
                    screenOptions={{
                        headerStyle: {
                            height: 60, // Increased height for better breathing room
                            elevation: 0,
                            shadowOpacity: 0,
                            backgroundColor: '#fff',
                            borderBottomWidth: 1,
                            borderBottomColor: '#f0f0f0',
                        },
                        headerTitleStyle: {
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#333',
                        },
                        headerTitleAlign: 'left',
                        headerBackTitleVisible: false,
                        headerLeftContainerStyle: {
                            paddingLeft: 0,
                        },
                        headerTitleContainerStyle: {
                            marginLeft: -10,
                        },
                    }}
                >
                    {authToken == null ? (
                        <>
                            <Stack.Screen
                                name="Login"
                                component={LoginScreen}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="Register"
                                component={RegisterScreen}
                                options={{ title: 'Driver Registration' }}
                            />
                        </>
                    ) : (
                        <>
                            <Stack.Screen
                                name="MainTabs"
                                component={TabNavigator}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="Pickup"
                                component={PickupScreen}
                                options={{ title: 'Pickup Order' }}
                            />
                            <Stack.Screen
                                name="Delivery"
                                component={DeliveryScreen}
                                options={{ title: 'Deliver Order' }}
                            />
                            <Stack.Screen
                                name="SupportTicket"
                                component={SupportTicketScreen}
                                options={{ title: 'Support & Help' }}
                            />
                            <Stack.Screen
                                name="RejectionBlocked"
                                component={RejectionBlockedScreen}
                                options={{ headerShown: false }}
                            />
                        </>
                    )}
                </Stack.Navigator>
            </NavigationContainer>

            {/* Global Order Offer Modal */}
            <OrderOfferModal
                visible={offerModalVisible}
                orderData={currentOffer}
                onAccept={handleAcceptOrder}
                onReject={handleRejectOrder}
            />
        </>
    );
};

export default AppNavigator;
