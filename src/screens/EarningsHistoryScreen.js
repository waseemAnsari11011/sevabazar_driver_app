import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/currency';

const EarningsHistoryScreen = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            if (driverData) {
                const driver = JSON.parse(driverData);
                const response = await apiClient.get(`/driver/completed-orders/${driver._id}`);
                if (response.data.success) {
                    setOrders(response.data.orders);
                }
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Order #{item.orderId}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.customerName}>👤 {item.customerName}</Text>
                <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.earningLabel}>Earned:</Text>
                <Text style={styles.earningValue}>{formatCurrency(item.earning)}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={orders}
                renderItem={renderItem}
                keyExtractor={item => item.orderId}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No completed orders yet.</Text>
                    </View>
                }
                onRefresh={fetchHistory}
                refreshing={loading}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        paddingBottom: 8,
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    date: {
        fontSize: 12,
        color: '#888',
    },
    cardBody: {
        marginBottom: 12,
    },
    customerName: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    address: {
        fontSize: 12,
        color: '#666',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    earningLabel: {
        fontSize: 14,
        color: '#888',
    },
    earningValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
    }
});

export default EarningsHistoryScreen;
