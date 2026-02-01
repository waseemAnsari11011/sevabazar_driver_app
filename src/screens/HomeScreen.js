import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    ScrollView,
    StatusBar,
    Dimensions,
    PermissionsAndroid,
    Platform,
    Modal,
    ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import apiClient from '../api/client';
import Geolocation from '@react-native-community/geolocation';

const { width } = Dimensions.get('window');

const GOOGLE_MAPS_API_KEY = 'AIzaSyDd-3iQmgrv0Mfpwh-8Y_YHlnTnceshNMA';

const HomeScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { driver, logout, authToken } = useAuth();
    const [floatingCash, setFloatingCash] = useState(0);
    const [floatingCashLimit, setFloatingCashLimit] = useState(2000);
    const [isOnline, setIsOnline] = useState(false);
    const [isPaymentOverdue, setIsPaymentOverdue] = useState(false);
    const [overdueCount, setOverdueCount] = useState(0);
    const [currentAddress, setCurrentAddress] = useState('Fetching location...');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);
    const [updatingLocation, setUpdatingLocation] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // useFocusEffect calling fetchWalletBalance and handleUpdateLocation is moved below handleUpdateLocation definition

    const handleToggleStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus); // Optimistic update
        try {
            await apiClient.patch('/driver/status', { isOnline: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
            setIsOnline(!newStatus); // Revert on error
            Alert.alert('Error', 'Could not update status');
        }
    };

    const handleResumeTask = () => {
        if (activeOrder) {
            // Navigate to appropriate screen based on status
            navigation.navigate('DeliveryScreen', { orderId: activeOrder.orderId });
        }
    };

    const requestLocationPermission = useCallback(async () => {
        if (Platform.OS === 'ios') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'Driver App needs access to your location.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }, []);

    const handleUpdateLocation = useCallback(async (manual = false) => {
        if (!driver?._id || !authToken) return; // Don't update if not logged in

        setUpdatingLocation(true);
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            setUpdatingLocation(false);
            if (manual) Alert.alert('Permission Denied', 'Location permission is required.');
            return;
        }

        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // console.log('Location:', latitude, longitude);

                try {
                    // Reverse Geocoding
                    const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
                    );
                    const data = await response.json();

                    if (data.status === 'OK' && data.results.length > 0) {
                        const address = data.results[0].formatted_address;
                        if (!isMounted.current || !authToken) return;
                        setCurrentAddress(address);

                        // Update Backend
                        await apiClient.patch('/driver/location', {
                            latitude,
                            longitude,
                            address
                        });
                    } else {
                        setCurrentAddress('Address not found');
                    }
                } catch (error) {
                    if (isMounted.current) {
                        console.error('Geocoding error:', error);
                        if (manual) Alert.alert('Error', 'Could not fetch address');
                    }
                } finally {
                    if (isMounted.current) {
                        setUpdatingLocation(false);
                    }
                }
            },
            (error) => {
                console.error('Location error:', error);
                setUpdatingLocation(false);
                if (manual) Alert.alert('Error', 'Could not get location. Ensure GPS is on.');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    }, [requestLocationPermission, driver?._id, authToken]);

    // ... (existing code)

    const fetchWalletBalance = useCallback(async () => {
        console.log('fetchWalletBalance called, driver._id:', driver?._id);
        if (!driver?._id) return;

        setLoadingBalance(true);
        try {
            const response = await apiClient.get(`/driver/wallet/${driver._id}`);
            console.log('Wallet Response:', JSON.stringify(response.data));
            if (response.data.success) {
                if (!isMounted.current || !authToken) return;
                setWalletBalance(response.data.balance);
                setFloatingCash(response.data.floatingCash || 0);
                setFloatingCashLimit(response.data.floatingCashLimit || 2000);
                setIsOnline(response.data.isOnline);
                setIsPaymentOverdue(response.data.isPaymentOverdue || false);
                setOverdueCount(response.data.overdueCount || 0);
                console.log('isOnline set to:', response.data.isOnline);
                console.log('Payment overdue status:', response.data.isPaymentOverdue);
            }
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
        } finally {
            setLoadingBalance(false);
        }
    }, [driver?._id]);

    useFocusEffect(
        useCallback(() => {
            console.log('useFocusEffect triggered');
            fetchWalletBalance();
            handleUpdateLocation(false);
        }, [fetchWalletBalance, handleUpdateLocation])
    );

    // ... (existing code)

    return (
        <View style={styles.container}>
            {/* BLOCKING MODAL - Midnight Deadline */}
            <Modal
                visible={isPaymentOverdue}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.blockingOverlay}>
                    <View style={styles.blockingCard}>
                        <Text style={styles.blockingTitle}>🚫 Service Blocked</Text>
                        <Text style={styles.blockingMessage}>
                            You have {overdueCount} pending cash collection(s) from previous day(s).
                        </Text>
                        <Text style={styles.blockingSubMessage}>
                            Please deposit the cash to the office/admin and ask them to mark payments as "Paid" to resume services.
                        </Text>
                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF5252', marginTop: 20 }]} onPress={logout}>
                            <Text style={[styles.actionTitle, { textAlign: 'center' }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
            >
                {/* ... (Header Section) ... */}
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <View style={[styles.avatarContainer, { borderColor: isOnline ? '#4CAF50' : '#FF5252' }]}>
                            <Text style={styles.avatarText}>
                                {driver?.name?.[0]?.toUpperCase() || 'D'}
                            </Text>
                            <View style={[styles.onlineBadge, { backgroundColor: isOnline ? '#4CAF50' : '#FF5252' }]} />
                        </View>
                        <View>
                            <Text style={styles.welcomeText}>Welcome back,</Text>
                            <Text style={styles.driverName}>{driver?.name || 'Habibi'}</Text>
                            <TouchableOpacity
                                style={styles.locationBadge}
                                onPress={() => setShowLocationModal(true)}
                            >
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {currentAddress}
                                </Text>
                                <Text style={styles.arrowIcon}>⌄</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.statusToggle, { borderColor: isOnline ? '#4CAF50' : '#444' }]}
                        onPress={handleToggleStatus}
                    >
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#888' }]} />
                        <Text style={styles.statusLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Wallet & Floating Cash Section Row */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Wallet Card */}
                    <View style={[styles.glassCard, { flex: 1 }]}>
                        <View style={[styles.cardContent, { backgroundColor: 'rgba(76, 175, 80, 0.15)', padding: 15, minHeight: 140 }]}>
                            <Text style={styles.cardLabel}>Earnings</Text>
                            <View style={[styles.amountContainer, { marginBottom: 10 }]}>
                                <Text style={[styles.currency, { fontSize: 18 }]}>₹</Text>
                                <Text style={[styles.amount, { fontSize: 32 }]}>
                                    {loadingBalance ? '--' : walletBalance.toFixed(0)}
                                </Text>
                            </View>
                            <Text style={[styles.footerText, { fontSize: 10 }]}>Available Balance</Text>
                        </View>
                    </View>

                    {/* Floating Cash Card */}
                    <View style={[styles.glassCard, { flex: 1 }]}>
                        <View style={[styles.cardContent, { backgroundColor: 'rgba(255, 82, 82, 0.15)', padding: 15, minHeight: 140 }]}>
                            <Text style={styles.cardLabel}>Floating Cash</Text>
                            <View style={[styles.amountContainer, { marginBottom: 10 }]}>
                                <Text style={[styles.currency, { fontSize: 18 }]}>₹</Text>
                                <Text style={[styles.amount, { fontSize: 32 }]}>
                                    {loadingBalance ? '--' : floatingCash.toFixed(0)}
                                </Text>
                            </View>
                            <Text style={[styles.footerText, { fontSize: 10 }]}>Limit: ₹{floatingCashLimit}</Text>
                            <View style={{ height: 4, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 5, borderRadius: 2 }}>
                                <View style={{
                                    height: '100%',
                                    width: `${Math.min((floatingCash / floatingCashLimit) * 100, 100)}%`,
                                    backgroundColor: floatingCash > floatingCashLimit * 0.9 ? '#FF5252' : '#FFA000',
                                    borderRadius: 2
                                }} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Active Task Section */}
                {activeOrder && (
                    <TouchableOpacity
                        style={styles.activeOrderCard}
                        onPress={handleResumeTask}
                        activeOpacity={0.9}
                    >
                        <View style={styles.activeHeader}>
                            <View style={styles.taskIconContainer}>
                                <Text style={styles.taskIcon}>📦</Text>
                            </View>
                            <View style={styles.taskInfo}>
                                <Text style={styles.taskTitle}>Ongoing Delivery</Text>
                                <Text style={styles.taskId}>#{activeOrder.orderId}</Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusBadgeText}>
                                    {activeOrder.status === 'Shipped' ? 'EN ROUTE' : 'PICKUP'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.resumePrompt}>
                            <Text style={styles.resumeText}>Tap to continue your journey</Text>
                            <Text style={styles.arrowIcon}>→</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Quick Actions */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#1A1D2E' }]}
                        onPress={() => navigation.navigate('MyOrders')}
                    >
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.actionIconBg, { backgroundColor: '#2196F3' }]}>
                                <Text style={styles.actionIcon}>📋</Text>
                            </View>
                            <Text style={styles.actionTitle}>My Work</Text>
                            <Text style={styles.actionSub}>Check orders</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#1E2A1E' }]}
                        onPress={() => navigation.navigate('EarningsHistory')}
                    >
                        <View style={[styles.actionIconBg, { backgroundColor: '#4CAF50' }]}>
                            <Text style={styles.actionIcon}>💰</Text>
                        </View>
                        <Text style={styles.actionTitle}>History</Text>
                        <Text style={styles.actionSub}>Earnings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#2E1A1A' }]}
                        onPress={logout}
                    >
                        <View style={[styles.actionIconBg, { backgroundColor: '#FF5252' }]}>
                            <Text style={styles.actionIcon}>🚪</Text>
                        </View>
                        <Text style={styles.actionTitle}>Logout</Text>
                        <Text style={styles.actionSub}>End session</Text>
                    </TouchableOpacity>
                </View>

                {/* Support/Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerNote}>Need help? Contact partner support</Text>
                </View>
            </ScrollView>

            {/* Location Bottom Sheet */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showLocationModal}
                onRequestClose={() => setShowLocationModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowLocationModal(false)}
                >
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHeader}>
                            <View style={styles.sheetHandle} />
                            <Text style={styles.sheetTitle}>Your Location</Text>
                        </View>

                        <View style={styles.addressContainer}>
                            <Text style={styles.sheetAddressText}>{currentAddress}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.fetchButton, { opacity: updatingLocation ? 0.7 : 1 }]}
                            onPress={() => handleUpdateLocation(true)}
                            disabled={updatingLocation}
                        >
                            {updatingLocation ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.fetchButtonText}>Fetch Location</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A', // Deep dark theme
    },
    // BLOCKING MODAL STYLES
    blockingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        padding: 20
    },
    blockingCard: {
        backgroundColor: '#1A1A1A',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF5252'
    },
    blockingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF5252',
        marginBottom: 10
    },
    blockingMessage: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24
    },
    blockingSubMessage: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 20
    },

    scrollContent: {
        padding: 20,
    },
    // ... (rest of existing styles)
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    profileSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1E1E1E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#4CAF50',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#0A0A0A',
    },
    welcomeText: {
        fontSize: 14,
        color: '#888',
    },
    driverName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#333',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        shadowColor: '#4CAF50',
        shadowRadius: 5,
        shadowOpacity: 0.8,
        elevation: 5,
    },
    statusLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    glassCard: {
        marginBottom: 24,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cardContent: {
        padding: 24,
        minHeight: 180,
    },
    cardLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 8,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        marginBottom: 20,
    },
    currency: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    amount: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    trendingContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    trendingText: {
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: 'bold',
    },
    decorationCurve: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    activeOrderCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(76, 175, 80, 0.3)',
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    taskIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskIcon: {
        fontSize: 20,
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    taskId: {
        fontSize: 12,
        color: '#888',
    },
    statusBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    resumePrompt: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 12,
        borderRadius: 12,
    },
    resumeText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
    arrowIcon: {
        color: '#4CAF50',
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 30,
    },
    actionButton: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionIcon: {
        fontSize: 20,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    actionSub: {
        fontSize: 12,
        color: '#888',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerNote: {
        color: '#555',
        fontSize: 12,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        maxWidth: width * 0.5,
    },
    locationText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '500',
        flexShrink: 1,
    },
    arrowIcon: {
        fontSize: 16,
        color: '#4CAF50',
        marginLeft: 6,
        fontWeight: '900', // Ultra bold
        marginBottom: 4, // Adjust vertical alignment for the chevron
    },
    // Modal & Bottom Sheet Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    addressContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sheetAddressText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 24,
        textAlign: 'center',
    },
    fetchButton: {
        backgroundColor: '#4CAF50',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    fetchButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default HomeScreen;
