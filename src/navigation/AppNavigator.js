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
import EarningsHistoryScreen from '../screens/EarningsHistoryScreen';
import OrderOfferModal from '../components/OrderOfferModal';
import { useAuth } from '../AuthContext';
import socketService from '../services/socketService';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const navigationRef = useRef(null);
    const { authToken, loading, logout } = useAuth();
    const [offerModalVisible, setOfferModalVisible] = useState(false);
    const [currentOffer, setCurrentOffer] = useState(null);
    const isListenersSetup = useRef(false);

    const setupSocketListeners = () => {
        if (isListenersSetup.current) return;

        console.log('[AppNavigator] Setting up socket listeners...');
        socketService.on('new_order_offer', async (offerData) => {
            console.log('[AppNavigator] ✅ NEW ORDER OFFER RECEIVED:', offerData);

            try {
                // If the offer already has calculation data from backend, use it!
                // This ensures consistency with the "My Work" section.
                if (offerData.earning !== undefined && offerData.totalDistance !== undefined) {
                    setCurrentOffer({
                        orderId: offerData.orderId,
                        earning: offerData.earning,
                        totalDistance: offerData.totalDistance,
                        rawOfferData: offerData
                    });
                    setOfferModalVisible(true);
                    return;
                }

                // Fallback for older offers without pre-calculated data
                const driverData = await AsyncStorage.getItem('driverData');
                if (!driverData) return;
                const driver = JSON.parse(driverData);

                const payload = {
                    currentLocation: driver.currentLocation,
                    pickupLocation: offerData.pickupLocation,
                    dropLocation: offerData.dropLocation
                };

                if (!payload.currentLocation || !payload.pickupLocation || !payload.dropLocation) {
                    console.warn('[AppNavigator] Missing coordinates for calculation:', payload);
                    setCurrentOffer({
                        orderId: offerData.orderId,
                        earning: offerData.earning || 0,
                        totalDistance: offerData.totalDistance || 0,
                        rawOfferData: offerData
                    });
                    setOfferModalVisible(true);
                    return;
                }

                const response = await apiClient.post('/calculate-delivery', payload);

                setCurrentOffer({
                    orderId: offerData.orderId,
                    earning: response.data.totalFee || 0,
                    totalDistance: response.data.totalDistance || 0,
                    rawOfferData: offerData
                });
                setOfferModalVisible(true);
            } catch (error) {
                console.error('[AppNavigator] Error calculating delivery:', error);
                setCurrentOffer({
                    orderId: offerData.orderId,
                    earning: offerData.earning || 0,
                    totalDistance: offerData.totalDistance || 0,
                    rawOfferData: offerData
                });
                setOfferModalVisible(true);
            }
        });

        socketService.on('order_taken', ({ orderId }) => {
            console.log('[AppNavigator] 📢 Order taken by another driver:', orderId);
            setOfferModalVisible(false);
            setCurrentOffer(null);
        });

        isListenersSetup.current = true;
    };

    useEffect(() => {
        if (authToken) {
            console.log('[AppNavigator] AuthToken present, connecting socket...');
            socketService.connect().then(() => {
                setupSocketListeners();
            });
        }
        return () => {
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
                navigationRef.current?.navigate('Pickup', { order: currentOffer });
                setCurrentOffer(null);
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept order');
        }
    };

    const handleRejectOrder = async () => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            setOfferModalVisible(false);
            const response = await apiClient.put(
                `/delivery/order-offer-response/${driver._id}`,
                {
                    orderId: currentOffer?.orderId,
                    action: 'reject'
                }
            );
            setCurrentOffer(null);
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
                                name="Home"
                                component={HomeScreen}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="MyOrders"
                                component={MyOrdersScreen}
                                options={{ title: 'My Work (Mera Kaam)' }}
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
                                name="EarningsHistory"
                                component={EarningsHistoryScreen}
                                options={{ title: 'Completed Work' }}
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
