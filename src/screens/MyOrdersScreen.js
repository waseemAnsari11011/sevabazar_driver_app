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
    Dimensions,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/currency';
import socketService from '../services/socketService';

const { width } = Dimensions.get('window');

const MyOrdersScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Active'); // 'Active' or 'Pending'
    const [driver, setDriver] = useState(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const driverData = await AsyncStorage.getItem('driverData');
            const driverObj = JSON.parse(driverData);
            setDriver(driverObj);

            if (!driverObj?._id) return;

            const response = await apiClient.get(`/driver/orders/${driverObj._id}`);
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
        const handleOrderTaken = ({ orderId }) => {
            setOrders(currentOrders => currentOrders.filter(o => o.orderId !== orderId));
        };

        socketService.on('order_taken', handleOrderTaken);

        return () => {
            // SocketService uses .off not .removeListener
            socketService.off('order_taken', handleOrderTaken);
        };
    }, []);

    const activeOrders = orders.filter(o => !o.isOffer && !o.isRejected);
    const rejectedOrders = orders.filter(o => o.isRejected === true);
    const currentData = activeTab === 'Active' ? activeOrders : rejectedOrders;

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'Active' && styles.activeTab]}
                onPress={() => setActiveTab('Active')}
            >
                <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'Rejected' && styles.rejectedActiveTab]}
                onPress={() => setActiveTab('Rejected')}
            >
                <Text style={[styles.tabText, activeTab === 'Rejected' && styles.rejectedActiveTabText]}>Rejected</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
                <View style={styles.emptyCircle}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="cube-outline" size={48} color="#2ECC71" />
                    </View>
                </View>
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} orders</Text>
            <Text style={styles.emptySubtitle}>
                Looks like you're all caught up. Tap the button below to fetch new available tasks near you.
            </Text>
            <TouchableOpacity style={styles.fetchButton} onPress={fetchOrders}>
                <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.fetchButtonText}>Check for New Orders</Text>
            </TouchableOpacity>
        </View>
    );

    const renderOrderItem = ({ item }) => {
        const items = item.rawOfferData?.items || [];
        const total = item.rawOfferData?.totalAmount || item.rawOfferData?.orderTotal || 0;
        const firstItem = items[0];
        const extraCount = items.length - 1;

        return (
            <View style={styles.orderCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.orderId}>Order #{item.orderId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Shipped' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.statusBadgeText, { color: item.status === 'Shipped' ? '#27AE60' : '#E67E22' }]}>
                            {item.status === 'Shipped' ? 'DELIVERING' : 'PICKING UP'}
                        </Text>
                    </View>
                </View>

                {/* Product preview */}
                {firstItem ? (
                    <View style={styles.productPreviewRow}>
                        {firstItem.image ? (
                            <Image source={{ uri: firstItem.image }} style={styles.productThumb} resizeMode="cover" />
                        ) : (
                            <View style={[styles.productThumb, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="cube-outline" size={20} color="#94A3B8" />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.productPreviewName} numberOfLines={1}>{firstItem.name}</Text>
                            {(firstItem.variations?.[0]?.attributes?.length > 0) && (
                                <Text style={styles.productVariant} numberOfLines={1}>
                                    {firstItem.variations[0].attributes.map(a => `${a.name}: ${a.value}`).join(' · ')}
                                </Text>
                            )}
                            {extraCount > 0 && (
                                <Text style={styles.moreItems}>+{extraCount} more item{extraCount > 1 ? 's' : ''}</Text>
                            )}
                        </View>
                        <Text style={styles.totalAmount}>₹{total}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        if (item.status === 'Shipped') navigation.navigate('Delivery', { order: item });
                        else navigation.navigate('Pickup', { order: item });
                    }}
                >
                    <Text style={styles.actionButtonText}>Resume Task</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderRejectedItem = ({ item }) => (
        <View style={styles.rejectedCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Order #{item.orderId}</Text>
                <View style={styles.rejectedBadge}>
                    <Text style={styles.rejectedBadgeText}>REJECTED</Text>
                </View>
            </View>

            <View style={styles.vendorRow}>
                <Ionicons name="storefront-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                <Text style={styles.customerName}>{item.rawOfferData?.vendorName || 'Vendor'}</Text>
            </View>

            {item.rejectionReason ? (
                <View style={styles.reasonBox}>
                    <Ionicons name="chatbox-ellipses-outline" size={14} color="#b91c1c" style={{ marginRight: 6 }} />
                    <Text style={styles.reasonText}>Reason: {item.rejectionReason}</Text>
                </View>
            ) : null}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Content Wrap */}
            <View style={[styles.contentWrap, { paddingTop: insets.top }]}>
                {renderTabs()}

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color="#2ECC71" size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={currentData}
                        keyExtractor={item => `${item.orderId}-${item.isRejected}`}
                        renderItem={activeTab === 'Rejected' ? renderRejectedItem : renderOrderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={renderEmptyState}
                        onRefresh={fetchOrders}
                        refreshing={loading}
                    />
                )}
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    profileBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#2ECC71',
        fontWeight: '800',
        fontSize: 14,
    },
    contentWrap: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        marginHorizontal: 24,
        marginVertical: 10,
        padding: 4,
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#2ECC71',
        elevation: 4,
        shadowColor: '#2ECC71',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    rejectedActiveTab: {
        backgroundColor: '#f44336',
        elevation: 4,
        shadowColor: '#f44336',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748B',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    rejectedActiveTabText: {
        color: '#FFFFFF',
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyIllustration: {
        marginBottom: 32,
    },
    emptyCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(46, 204, 113, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 30,
        marginBottom: 20,
        fontWeight: '500',
    },
    fetchButton: {
        flexDirection: 'row',
        backgroundColor: '#2ECC71',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#2ECC71',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    fetchButtonText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 16,
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    orderId: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarMini: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    productPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        gap: 10,
    },
    productThumb: {
        width: 72,
        height: 72,
        borderRadius: 12,
        marginRight: 2,
    },
    productPreviewName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    productVariant: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    moreItems: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
    },
    totalAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#2ECC71',
    },
    actionButton: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '700',
    },
    supportFab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    rejectedCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
    },
    rejectedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#ffebee',
    },
    rejectedBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#f44336',
        letterSpacing: 0.5,
    },
    vendorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    reasonBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    reasonText: {
        fontSize: 13,
        color: '#b91c1c',
        fontWeight: '500',
        flex: 1,
    },
}
);

export default MyOrdersScreen;
