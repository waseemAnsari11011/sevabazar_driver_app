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
    ActivityIndicator,
    Switch,
    DeviceEventEmitter
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import apiClient from '../api/client';
import Geolocation from 'react-native-geolocation-service';
import { formatCurrency } from '../utils/currency';

const { width } = Dimensions.get('window');

const GOOGLE_MAPS_API_KEY = 'AIzaSyDd-3iQmgrv0Mfpwh-8Y_YHlnTnceshNMA';

const HomeScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { driver, logout, authToken } = useAuth();
    const [floatingCash, setFloatingCash] = useState(0);
    const [isOnline, setIsOnline] = useState(false);
    const [isPaymentOverdue, setIsPaymentOverdue] = useState(false);
    const [overdueCount, setOverdueCount] = useState(0);
    const [overdueAmount, setOverdueAmount] = useState(0);
    const [currentAddress, setCurrentAddress] = useState('Fetching location...');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);
    const [updatingLocation, setUpdatingLocation] = useState(false);
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [todayOrders, setTodayOrders] = useState(0);
    const [todayOnlineTime, setTodayOnlineTime] = useState('0h 0m');
    const [rejectionCount, setRejectionCount] = useState(0);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Listen for real-time rejection count updates from order rejections
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('rejectionUpdated', ({ rejectionCount: count, isBlocked }) => {
            if (!isMounted.current) return;
            setRejectionCount(count);
            if (isBlocked) {
                navigation.navigate('RejectionBlocked');
            }
        });
        return () => sub.remove();
    }, [navigation]);

    // Force offline if payment is overdue
    useEffect(() => {
        if (isPaymentOverdue && isOnline) {
            const forceOffline = async () => {
                try {
                    setIsOnline(false); // Force offline locally
                    await apiClient.patch('/driver/status', { isOnline: false });
                    // Save flag that driver was blocked and should be recovered later
                    await AsyncStorage.setItem('isWasBlocked', 'true');
                } catch (error) {
                    console.error("Failed to force offline due to overdue payment:", error);
                }
            };
            forceOffline();
        } else if (isPaymentOverdue && !isOnline) {
            // Even if already offline, if they are blocked, mark it for recovery
            AsyncStorage.setItem('isWasBlocked', 'true');
        }
    }, [isPaymentOverdue, isOnline]);

    // useFocusEffect calling fetchWalletBalance and handleUpdateLocation is moved below handleUpdateLocation definition

    const handleToggleStatus = async () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus); // Optimistic update
        try {
            await apiClient.patch('/driver/status', { isOnline: newStatus });
            if (newStatus) {
                fetchActiveOrder();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setIsOnline(!newStatus); // Revert on error
            Alert.alert('Error', 'Could not update status');
        }
    };

    const handleRefreshStatus = async () => {
        setLoadingBalance(true);
        try {
            const data = await fetchWalletBalance();
            if (data && data.overdueCount === 0) {
                // Auto-Online
                await apiClient.patch('/driver/status', { isOnline: true });
                setIsOnline(true);
                Alert.alert("Success", "Payments Cleared! You are now Online.");
            } else {
                Alert.alert("Pending", `You still have ${data?.overdueCount || 0} pending payments (Total: ${formatCurrency(data?.overdueAmount || 0)}). Please clear them to resume.`);
            }
        } catch (error) {
            console.error('Refresh status error:', error);
            Alert.alert("Error", "Could not refresh status. Please try again.");
        } finally {
            setLoadingBalance(false);
        }
    };

    const handleResumeTask = () => {
        if (activeOrder) {
            // Navigate to appropriate screen based on status
            if (activeOrder.status === 'Shipped') {
                navigation.navigate('Delivery', { order: activeOrder });
            } else {
                navigation.navigate('Pickup', { order: activeOrder });
            }
        }
    };

    const requestLocationPermission = useCallback(async () => {
        if (Platform.OS === 'ios') return true;
        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            return (
                granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
            );
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
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000,
                showLocationDialog: true,
                forceRequestLocation: true
            }
        );
    }, [requestLocationPermission, driver?._id, authToken]);

    // ... (existing code)

    const fetchActiveOrder = useCallback(async () => {
        if (!driver?._id) return;
        try {
            const response = await apiClient.get(`/driver/active-order/${driver._id}`);
            if (response.data.success && response.data.hasActiveOrder) {
                if (!isMounted.current || !authToken) return;
                setActiveOrder(response.data.order);
            } else {
                setActiveOrder(null);
            }
        } catch (error) {
            console.error('Error fetching active order:', error);
            setActiveOrder(null);
        }
    }, [driver?._id, authToken]);

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
                setIsOnline(response.data.isOnline);
                setIsPaymentOverdue(response.data.isPaymentOverdue || false);
                setOverdueCount(response.data.overdueCount || 0);
                setOverdueAmount(response.data.overdueAmount || 0);
                setTodayEarnings(response.data.todayEarnings || 0);
                setTodayOrders(response.data.todayOrders || 0);
                setTodayOnlineTime(response.data.todayOnlineTime || '0h 0m');
                setRejectionCount(response.data.rejectionCount || 0);

                // Navigate to blocked screen if driver is blocked
                if (response.data.isBlocked) {
                    navigation.navigate('RejectionBlocked');
                    return response.data;
                }

                // Smart Recovery Logic: If was blocked and now clear, auto-online
                if (response.data.overdueCount === 0) {
                    const wasBlocked = await AsyncStorage.getItem('isWasBlocked');
                    if (wasBlocked === 'true') {
                        await apiClient.patch('/driver/status', { isOnline: true });
                        setIsOnline(true);
                        await AsyncStorage.removeItem('isWasBlocked');
                        Alert.alert("Welcome Back!", "Your payments are cleared. You are now Online and ready for orders.");
                    }
                }

                console.log('isOnline set to:', response.data.isOnline);
                console.log('Payment overdue status:', response.data.isPaymentOverdue);
                return response.data;
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
            fetchActiveOrder();
            handleUpdateLocation(false);

            // Periodic refresh every 60 seconds while focused
            const interval = setInterval(() => {
                console.log('Periodic refresh triggered');
                fetchWalletBalance();
                fetchActiveOrder();
            }, 60000);

            return () => clearInterval(interval);
        }, [fetchWalletBalance, fetchActiveOrder, handleUpdateLocation])
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
                        <Text style={[styles.blockingTitle, { fontSize: 48 }]}>🚫</Text>

                        <Text style={[styles.blockingMessage, { fontSize: 24, color: '#FF5252', marginVertical: 10 }]}>
                            Pending: {formatCurrency(overdueAmount)}
                        </Text>
                        <Text style={[styles.blockingSubMessage, { color: '#fff', marginBottom: 15 }]}>
                            Total: {overdueCount} {overdueCount === 1 ? 'Order' : 'Orders'}
                        </Text>
                        <Text style={styles.blockingSubMessage}>
                            Please deposit the cash to the office/admin and ask them to mark payments as "Paid" to resume services.
                        </Text>
                        <View style={{ flexDirection: 'row', marginTop: 15, width: '100%' }}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#4CAF50', flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginRight: 10 }]}
                                onPress={handleRefreshStatus}
                                disabled={loadingBalance}
                            >
                                {loadingBalance ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={[styles.actionTitle, { textAlign: 'center', marginBottom: 0, fontSize: 13 }]}>Refresh</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#FF5252', flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15 }]}
                                onPress={logout}
                            >
                                <Text style={[styles.actionTitle, { textAlign: 'center', marginBottom: 0, fontSize: 13 }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10, backgroundColor: '#FFFFFF', flexGrow: 1 }]}
            >
                {/* ... (Header Section) ... */}
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerTextGroup}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.driverName}>{driver?.name || 'Habibi'}!</Text>
                        <TouchableOpacity
                            style={styles.locationContainer}
                            onPress={() => setShowLocationModal(true)}
                        >
                            <Text style={styles.locationIcon}>📍</Text>
                            <Text style={styles.locationTextSmall} numberOfLines={1}>
                                {currentAddress}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.avatarContainer, { borderColor: isOnline ? '#E8F5E9' : '#F5F5F5' }]}>
                        <Text style={styles.avatarText}>
                            {driver?.name?.[0]?.toUpperCase() || 'D'}
                        </Text>
                    </View>
                </View>

                {/* Wide Status Toggle Card */}
                <View style={styles.toggleCard}>
                    <View style={styles.statusInfo}>
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#888' }]} />
                        <Text style={styles.statusText}>
                            {isOnline ? 'Active Mode' : 'Offline Mode'}
                        </Text>
                    </View>
                    <Switch
                        value={isOnline}
                        onValueChange={handleToggleStatus}
                        trackColor={{ false: '#EEE', true: '#E8F5E9' }}
                        thumbColor={isOnline ? '#4CAF50' : '#FFF'}
                    />
                </View>

                {/* Rejection Warning Banner */}
                {rejectionCount > 0 && (
                    <View style={[
                        styles.rejectionWarning,
                        rejectionCount === 2 && styles.rejectionWarningDanger
                    ]}>
                        <Text style={styles.rejectionWarningIcon}>
                            {rejectionCount === 2 ? '🚨' : '⚠️'}
                        </Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rejectionWarningTitle}>
                                Rejection Warning ({rejectionCount}/3)
                            </Text>
                            <Text style={styles.rejectionWarningText}>
                                {rejectionCount === 2
                                    ? 'Last warning! One more rejection will block your account.'
                                    : `You have ${3 - rejectionCount} rejection${3 - rejectionCount > 1 ? 's' : ''} remaining before your account is blocked.`}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Wallet & Floating Cash Section Row */}
                <View style={{ flexDirection: 'row' }}>
                    {/* Wallet Card */}
                    <View style={[styles.glassCard, { flex: 1, marginRight: 16 }]}>
                        <View style={[styles.cardContent, { backgroundColor: '#E3F2FD', padding: 20, minHeight: 140 }]}>
                            <View style={{ width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ fontSize: 20 }}>💵</Text>
                            </View>
                            <Text style={[styles.cardLabel, { color: '#555' }]}>EARNINGS</Text>
                            <View style={[styles.amountContainer, { marginBottom: 4 }]}>
                                <Text style={[styles.amount, { fontSize: 24, color: '#111' }]}>
                                    {loadingBalance ? '--' : formatCurrency(walletBalance).replace('₹', '')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Floating Cash Card */}
                    <View style={[styles.glassCard, { flex: 1 }]}>
                        <View style={[styles.cardContent, { backgroundColor: '#F3E5F5', padding: 20, minHeight: 140 }]}>
                            <View style={{ width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ fontSize: 20 }}>💰</Text>
                            </View>
                            <Text style={[styles.cardLabel, { color: '#555' }]}>FLOATING CASH</Text>
                            <View style={[styles.amountContainer, { marginBottom: 4 }]}>
                                <Text style={[styles.amount, { fontSize: 24, color: '#111' }]}>
                                    {loadingBalance ? '--' : formatCurrency(floatingCash).replace('₹', '')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* TODAY'S PROGRESS Section */}
                <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>TODAY'S PROGRESS</Text>
                    <View style={styles.progressGrid}>
                        <View style={styles.progressItem}>
                            <Text
                                style={styles.progressValue}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                minimumFontScale={0.7}
                            >
                                {formatCurrency(todayEarnings)}
                            </Text>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressIcon}>₹</Text>
                                <Text style={styles.progressLabel}>Earnings</Text>
                            </View>
                        </View>
                        <View style={styles.progressDivider} />
                        <View style={styles.progressItem}>
                            <Text
                                style={styles.progressValue}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                minimumFontScale={0.7}
                            >
                                {todayOnlineTime}
                            </Text>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressIcon}>🕒</Text>
                                <Text style={styles.progressLabel}>Online time</Text>
                            </View>
                        </View>
                        <View style={styles.progressDivider} />
                        <View style={styles.progressItem}>
                            <Text
                                style={styles.progressValue}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                minimumFontScale={0.7}
                            >
                                {todayOrders}
                            </Text>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressIcon}>🛍️</Text>
                                <Text style={styles.progressLabel}>Orders</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Recent Tasks Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#999', letterSpacing: 1 }}>RECENT TASKS</Text>
                    <TouchableOpacity>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#5C6BC0' }}>VIEW ALL</Text>
                    </TouchableOpacity>
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
        marginBottom: 12,
    },
    headerTextGroup: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        letterSpacing: -0.5,
    },
    driverName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111',
        letterSpacing: -0.5,
        marginTop: -4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    locationIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    locationTextSmall: {
        flex: 1,
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
        marginLeft: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111',
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F7F9FC',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 16,
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4CAF50',
        marginRight: 12,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1C1E',
    },
    glassCard: {
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 0, // Removed border
        elevation: 2, // Added shadow
        backgroundColor: '#fff',
    },
    cardContent: {
        padding: 16,
        minHeight: 120,
    },
    cardLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    currency: {
        fontSize: 24,
        color: '#111', // Dark text
        fontWeight: '600',
        marginBottom: 8,
        marginRight: 4,
    },
    amount: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#111', // Dark text
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#666',
    },
    trendingContainer: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
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
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
    activeOrderCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 2,
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    taskIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    taskIcon: {
        fontSize: 20,
        color: '#2E7D32',
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    taskId: {
        fontSize: 12,
        color: '#666',
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    statusBadgeText: {
        color: '#2E7D32',
        fontSize: 10,
        fontWeight: 'bold',
    },
    resumePrompt: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    resumeText: {
        color: '#1976D2',
        fontSize: 14,
        fontWeight: '600',
    },
    arrowIcon: {
        color: '#1976D2',
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionsGrid: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    actionButton: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
        elevation: 1,
    },
    actionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#F5F5F5',
    },
    actionIcon: {
        fontSize: 20,
        color: '#333',
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    actionSub: {
        fontSize: 12,
        color: '#666',
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        elevation: 1,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    profileSub: {
        fontSize: 12,
        color: '#666',
    },
    logoutIcon: {
        fontSize: 24,
        color: '#D32F2F',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerNote: {
        color: '#888',
        fontSize: 12,
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

    // Today's Progress Styles
    progressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        elevation: 1,
    },
    progressTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 1.2,
    },
    progressGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressItem: {
        flex: 1,
        alignItems: 'center',
    },
    progressValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111',
        marginBottom: 6,
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    progressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressIcon: {
        fontSize: 12,
        marginRight: 4,
        color: '#777',
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#777',
    },
    progressDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F0F0F0',
    },
    rejectionWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFD54F',
        gap: 12,
    },
    rejectionWarningDanger: {
        backgroundColor: '#FFEBEE',
        borderColor: '#EF9A9A',
    },
    rejectionWarningIcon: {
        fontSize: 26,
    },
    rejectionWarningTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#7B6000',
        marginBottom: 2,
    },
    rejectionWarningText: {
        fontSize: 12,
        color: '#5D4037',
        fontWeight: '500',
        lineHeight: 17,
    },
});

export default HomeScreen;
