import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Alert } from 'react-native';
import apiClient from '../api/client';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PickupScreen from '../screens/PickupScreen';
import DeliveryScreen from '../screens/DeliveryScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import OrderOfferModal from '../components/OrderOfferModal';
import socketService from '../services/socketService';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const navigationRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Login');
    const [offerModalVisible, setOfferModalVisible] = useState(false);
    const [currentOffer, setCurrentOffer] = useState(null);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await AsyncStorage.getItem('driverToken');
                console.log('[AppNavigator] Token found:', !!token);
                if (token) {
                    setInitialRoute('Home');
                    // Connect socket when driver is logged in
                    console.log('[AppNavigator] Connecting socket...');
                    await socketService.connect();
                    console.log('[AppNavigator] Setting up socket listeners...');
                    setupSocketListeners();
                }
            } catch (e) {
                console.error('[AppNavigator] Failed to load token', e);
            } finally {
                setLoading(false);
            }
        };
        checkToken();

        // Cleanup on unmount
        return () => {
            console.log('[AppNavigator] Cleaning up socket listeners');
            socketService.removeAllListeners('new_order_offer');
        };
    }, []);

    const setupSocketListeners = () => {
        console.log('[AppNavigator] Socket listener registered for new_order_offer');
        socketService.on('new_order_offer', async (offerData) => {
            console.log('[AppNavigator] ✅ NEW ORDER OFFER RECEIVED:', offerData);

            // Calculate earning and distance using the API
            try {
                const driverData = await AsyncStorage.getItem('driverData');
                const driver = JSON.parse(driverData);
                console.log('[AppNavigator] Driver data loaded:', driver._id);

                // Prepare payload for calculate-delivery API
                const payload = {
                    currentLocation: driver.currentLocation || { latitude: 0, longitude: 0 },
                    pickupLocation: offerData.pickupLocation,
                    dropLocation: offerData.dropLocation
                };

                console.log('[AppNavigator] Calling calculate-delivery API...');
                const response = await apiClient.post('/calculate-delivery', payload);
                console.log('[AppNavigator] API response:', response.data);

                setCurrentOffer({
                    orderId: offerData.orderId,
                    earning: response.data.driverEarning || 0,
                    totalDistance: response.data.totalDistance || 0,
                    rawOfferData: offerData
                });
                console.log('[AppNavigator] Opening modal...');
                setOfferModalVisible(true);
            } catch (error) {
                console.error('[AppNavigator] Error calculating delivery:', error);
                // Fallback: show modal with basic data
                setCurrentOffer({
                    orderId: offerData.orderId,
                    earning: 0,
                    totalDistance: 0,
                    rawOfferData: offerData
                });
                console.log('[AppNavigator] Opening modal with fallback data...');
                setOfferModalVisible(true);
            }
        });
    };

    const handleAcceptOrder = async () => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.put(
                `/delivery/accept-order/${driver._id}`,
                {
                    orderId: currentOffer.orderId,
                    currentLocation: driver.currentLocation || { latitude: 0, longitude: 0 }
                }
            );

            if (response.data.success) {
                setOfferModalVisible(false);
                // Navigate to Pickup screen using ref
                navigationRef.current?.navigate('Pickup', { order: currentOffer });
                setCurrentOffer(null);
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept order');
        }
    };

    const handleRejectOrder = () => {
        setOfferModalVisible(false);
        setCurrentOffer(null);
        // Optionally emit rejection event to backend
        socketService.emit('order_rejected', { orderId: currentOffer?.orderId });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator initialRouteName={initialRoute}>
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
                        name="Home"
                        component={HomeScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="MyOrders"
                        component={MyOrdersScreen}
                        options={{ title: 'My Work (Mera Kaam)' }}
                    />
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
