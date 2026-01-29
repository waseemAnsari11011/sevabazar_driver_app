import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const MyOrdersScreen = ({ navigation }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            if (!driver?._id) return;

            const response = await apiClient.get(`/driver/orders/${driver._id}`);
            if (response.data.success) {
                setOrders(response.data.orders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            Alert.alert('Error', 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [])
    );

    useEffect(() => {
        const socketService = require('../services/socketService').default;
        socketService.on('order_taken', ({ orderId }) => {
            setOrders(currentOrders => currentOrders.filter(o => o.orderId !== orderId));
        });

        return () => {
            socketService.removeAllListeners('order_taken');
        };
    }, []);

    const handleResume = (order) => {
        if (order.status === 'Shipped') {
            navigation.navigate('Delivery', { order });
        } else {
            navigation.navigate('Pickup', { order });
        }
    };

    const handleAccept = async (item) => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.put(
                `/delivery/order-offer-response/${driver._id}`,
                {
                    orderId: item.orderId,
                    action: 'accept',
                    currentLocation: { latitude: 0, longitude: 0 } // App ideally sends real GPS here
                }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Order accepted successfully');
                fetchOrders(); // Refresh list
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept order');
        }
    };

    const handleReject = async (item) => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.put(
                `/delivery/order-offer-response/${driver._id}`,
                {
                    orderId: item.orderId,
                    action: 'reject'
                }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Order offer rejected');
                fetchOrders(); // Refresh list
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to reject order');
        }
    };

    const renderOrderItem = ({ item }) => (
        <View style={[styles.orderCard, item.isOffer && styles.offerCard]}>
            <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{item.orderId}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.isOffer ? '#2196F3' : (item.status === 'Shipped' ? '#4CAF50' : '#FF9800') }
                ]}>
                    <Text style={styles.statusText}>
                        {item.isOffer ? 'PENDING OFFER' : (item.status === 'Shipped' ? 'Delivering' : 'Picking Up')}
                    </Text>
                </View>
            </View>

            <View style={styles.orderBody}>
                <View style={styles.partnerInfo}>
                    <Text style={styles.vendorName}>🏪 {item.rawOfferData.vendorName || 'Vendor'}</Text>
                    <Text style={styles.customerName}>👤 {item.rawOfferData.customerName || 'Customer'}</Text>
                </View>
                <Text style={styles.address}>📍 {item.rawOfferData.shippingAddress?.address || 'N/A'}</Text>
                <View style={styles.statsRow}>
                    <Text style={styles.stat}>📏 {item.totalDistance} km</Text>
                    <Text style={styles.stat}>💰 ₹{item.earning}</Text>
                    {item.rawOfferData.totalAmount && (
                        <Text style={styles.billStat}>🎫 ₹{item.rawOfferData.totalAmount}</Text>
                    )}
                </View>
            </View>

            {item.isOffer ? (
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleReject(item)}
                    >
                        <Text style={styles.resumeButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAccept(item)}
                    >
                        <Text style={styles.resumeButtonText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.resumeButton}
                    onPress={() => handleResume(item)}
                >
                    <Text style={styles.resumeButtonText}>Resume Task</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF9800" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.orderId}
                renderItem={renderOrderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No active orders found.</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={fetchOrders}
                        >
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    orderId: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    orderBody: {
        marginBottom: 16,
    },
    partnerInfo: {
        marginBottom: 8,
    },
    vendorName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 2,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    address: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    stat: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },
    billStat: {
        fontSize: 13,
        color: '#E91E63',
        fontWeight: 'bold',
    },
    resumeButton: {
        backgroundColor: '#FF9800',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    resumeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    offerCard: {
        borderColor: '#2196F3',
        borderWidth: 1,
        backgroundColor: '#f0f7ff',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    rejectButton: {
        flex: 1,
        backgroundColor: '#F44336',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    refreshButton: {
        padding: 10,
        backgroundColor: '#2196F3',
        borderRadius: 8,
    },
    refreshButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    }
});

export default MyOrdersScreen;
