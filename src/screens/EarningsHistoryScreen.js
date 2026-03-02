import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/currency';
import DateFilter from '../components/DateFilter';
import { getDateRange } from '../utils/dateUtils';

const EarningsHistoryScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const { initialTab } = route?.params || { initialTab: 'Earnings' };
    const [dailyEarnings, setDailyEarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab); // 'Earnings' or 'Cash'

    // Filter states
    const [selectedFilter, setSelectedFilter] = useState('today');
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Drill-down Modal State
    const [selectedDateOrders, setSelectedDateOrders] = useState([]);
    const [showOrdersModal, setShowOrdersModal] = useState(false);
    const [selectedDateLabel, setSelectedDateLabel] = useState('');

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const driverData = await AsyncStorage.getItem('driverData');
            if (driverData) {
                const driver = JSON.parse(driverData);
                const { startDate, endDate } = getDateRange(selectedFilter, customStart, customEnd);

                const params = {};
                if (startDate && endDate) {
                    params.startDate = startDate;
                    params.endDate = endDate;
                }

                const response = await apiClient.get(`/driver/completed-orders/${driver._id}`, { params });
                if (response.data.success) {
                    processOrders(response.data.orders);
                }
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedFilter, customStart, customEnd]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const processOrders = (orders) => {
        // Group by date
        const grouped = orders.reduce((acc, order) => {
            const dateObj = new Date(order.date);
            const date = dateObj.toISOString().split('T')[0];

            if (!acc[date]) {
                acc[date] = {
                    date,
                    totalEarning: 0,
                    totalFloatingCash: 0,
                    count: 0,
                    completedCount: 0,
                    // Track statuses dynamically
                    earningPaidCount: 0,
                    earningPendingCount: 0,
                    cashSettledCount: 0,
                    cashUnsettledCount: 0,
                    orders: [],
                    allSettled: true, // For Cash tab logic
                    allEarningPaid: true // For Earning tab logic
                };
            }

            const earning = order.earning || 0;
            const floatingCash = order.floatingCashAmount || 0;

            acc[date].totalEarning += earning;
            acc[date].totalFloatingCash += floatingCash;
            acc[date].count += 1;

            // Counts for Earnings Tab
            if (order.earningStatus === 'Paid') {
                acc[date].earningPaidCount += 1;
            } else {
                acc[date].earningPendingCount += 1;
                acc[date].allEarningPaid = false;
            }

            // Counts for Cash Tab
            if (order.floatingCashStatus === 'Settled' || order.floatingCashStatus === 'Paid') {
                acc[date].cashSettledCount += 1;
            } else {
                // Assuming anything not Settled/Paid is Unsettled/Pending for Cash
                acc[date].cashUnsettledCount += 1;
                acc[date].allSettled = false;
            }

            acc[date].orders.push(order);
            return acc;
        }, {});

        // Convert to array and sort by date descending
        const earningsArray = Object.values(grouped).sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        setDailyEarnings(earningsArray);
    };

    // Re-process orders when activeTab changes to ensure correct filtering if needed
    useEffect(() => {
        fetchHistory();
    }, [activeTab]);


    const handleFilterChange = (filter) => {
        if (filter === 'custom') {
            setShowRangeModal(true);
        } else {
            setSelectedFilter(filter);
        }
    };

    const applyCustomRange = () => {
        if (!customStart || !customEnd) {
            Alert.alert('Error', 'Please select both start and end dates');
            return;
        }
        setShowRangeModal(false);
        setSelectedFilter('custom');
    };

    const handleCardPress = (item) => {
        setSelectedDateOrders(item.orders);
        setSelectedDateLabel(new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }));
        setShowOrdersModal(true);
    };

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'Earnings' && styles.activeTab]}
                onPress={() => setActiveTab('Earnings')}
            >
                <Text style={[styles.tabText, activeTab === 'Earnings' && styles.activeTabText]}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'Cash' && styles.activeTab]}
                onPress={() => setActiveTab('Cash')}
            >
                <Text style={[styles.tabText, activeTab === 'Cash' && styles.activeTabText]}>Cash</Text>
            </TouchableOpacity>
        </View>
    );

    const getTimeBadge = (dateStr) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (dateStr === today) return 'TODAY';
        if (dateStr === yesterday) return 'YESTERDAY';

        return new Date(dateStr).toLocaleDateString([], { weekday: 'long' }).toUpperCase();
    };

    const renderSummaryCard = ({ item }) => {
        const [yearStr, monthStr, dayStr] = item.date.split('-');
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const month = monthNames[parseInt(monthStr, 10) - 1];
        const day = parseInt(dayStr, 10);

        const isEarnings = activeTab === 'Earnings';
        if (!isEarnings && item.totalFloatingCash <= 0) return null;

        const displayAmount = isEarnings ? item.totalEarning : item.totalFloatingCash;

        // Determine counts and status based on tab
        const paidCount = isEarnings ? item.earningPaidCount : item.cashSettledCount;
        const pendingCount = isEarnings ? item.earningPendingCount : item.cashUnsettledCount;
        const isAllCompleted = isEarnings ? item.allEarningPaid : item.allSettled;

        return (
            <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)} activeOpacity={0.9}>
                <View style={styles.cardUpperRow}>
                    {/* Date Box */}
                    <View style={styles.dateBox}>
                        <View style={styles.dateMonthContainer}>
                            <Text style={styles.dateMonthText}>{month}</Text>
                        </View>
                        <View style={styles.dateDayContainer}>
                            <Text style={styles.dateDayText}>{day}</Text>
                        </View>
                    </View>

                    {/* Middle Info */}
                    <View style={styles.midInfoContainer}>
                        <View style={styles.ordersHeaderRow}>
                            <Text style={styles.ordersCountTitle}>Orders: {item.count}</Text>
                            <View style={[styles.statusBadge, isAllCompleted ? styles.completedBadge : styles.pendingBadge]}>
                                <Icon
                                    name={isAllCompleted ? "check-circle" : "clock-outline"}
                                    size={12}
                                    color={isAllCompleted ? "#4CAF50" : "#ff6600"}
                                />
                                <Text style={[styles.statusBadgeText, { color: isAllCompleted ? "#4CAF50" : "#ff6600" }]}>
                                    {isAllCompleted ? "COMPLETED" : "IN PROGRESS"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                                <Text style={styles.statText}>{paidCount} Paid</Text>
                            </View>
                            <View style={[styles.statItem, { marginLeft: 12 }]}>
                                <View style={[styles.dot, { backgroundColor: pendingCount > 0 ? '#F44336' : '#BDBDBD' }]} />
                                <Text style={styles.statText}>{pendingCount} Pending</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Divider/Spacing */}
                <View style={styles.cardDivider} />

                {/* Bottom Row */}
                <View style={styles.cardBottomRow}>
                    <TouchableOpacity
                        style={styles.viewBillButton}
                        onPress={() => handleCardPress(item)}
                    >
                        <Icon name="receipt-text-outline" size={16} color="#2B6CB0" />
                        <Text style={styles.viewBillText}>View Bill</Text>
                    </TouchableOpacity>

                    <View style={styles.earningsInfoRight}>
                        <Text style={styles.earningsLabel}>{isEarnings ? 'EARNINGS' : 'CASH COLLECTED'}</Text>
                        <Text style={styles.earningsValue}>{formatCurrency(displayAmount)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderOrderListItem = ({ item }) => {
        const isEarnings = activeTab === 'Earnings';
        const displayAmount = isEarnings ? item.earning : item.floatingCashAmount;

        if (!isEarnings && (!item.floatingCashAmount || item.floatingCashAmount <= 0)) return null;

        const status = isEarnings ? item.earningStatus : item.floatingCashStatus;
        const isPaid = status === 'Paid' || status === 'Settled';

        return (
            <View style={styles.orderItem}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.orderIdItem}>#{item.orderId}</Text>
                    <Text style={styles.customerNameItem}>{item.customerName}</Text>
                    <Text style={styles.orderTimeItem}>
                        {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderAmountItem}>{formatCurrency(displayAmount)}</Text>
                    <View style={[styles.miniStatusBadge, { backgroundColor: isPaid ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.miniStatusText, { color: isPaid ? '#2E7D32' : '#E65100' }]}>
                            {status || (isEarnings ? 'Pending' : 'Unsettled')}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <DateFilter
                selectedFilter={selectedFilter}
                onFilterChange={handleFilterChange}
            />

            {renderTabs()}

            {loading ? (
                <View style={[styles.centered, { flex: 1 }]}>
                    <ActivityIndicator size="large" color="#D32F2F" />
                </View>
            ) : (
                <FlatList
                    data={dailyEarnings}
                    keyExtractor={(item) => item.date}
                    renderItem={renderSummaryCard}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No history available for this period.</Text>
                        </View>
                    }
                />
            )}

            {/* Drill-down Modal */}
            <Modal
                visible={showOrdersModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowOrdersModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Orders on {selectedDateLabel}</Text>
                            <TouchableOpacity onPress={() => setShowOrdersModal(false)}>
                                <Icon name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={selectedDateOrders}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={renderOrderListItem}
                            contentContainerStyle={styles.modalList}
                        />
                    </View>
                </View>
            </Modal>

            {/* Range Picker Modal */}
            <Modal
                visible={showRangeModal}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.rangeModalContainer}>
                    <View style={styles.rangeModalContent}>
                        <Text style={styles.rangeModalTitle}>Select Date Range</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowStartPicker(true)}
                        >
                            <Text style={customStart ? styles.dateValue : styles.datePlaceholder}>
                                {customStart || 'Start Date (YYYY-MM-DD)'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowEndPicker(true)}
                        >
                            <Text style={customEnd ? styles.dateValue : styles.datePlaceholder}>
                                {customEnd || 'End Date (YYYY-MM-DD)'}
                            </Text>
                        </TouchableOpacity>

                        <DatePicker
                            modal
                            open={showStartPicker}
                            date={customStart ? new Date(customStart) : new Date()}
                            mode="date"
                            onConfirm={(date) => {
                                setShowStartPicker(false);
                                setCustomStart(date.toISOString().split('T')[0]);
                            }}
                            onCancel={() => {
                                setShowStartPicker(false);
                            }}
                        />

                        <DatePicker
                            modal
                            open={showEndPicker}
                            date={customEnd ? new Date(customEnd) : new Date()}
                            mode="date"
                            onConfirm={(date) => {
                                setShowEndPicker(false);
                                setCustomEnd(date.toISOString().split('T')[0]);
                            }}
                            onCancel={() => {
                                setShowEndPicker(false);
                            }}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowRangeModal(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.applyButton]} onPress={applyCustomRange}>
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5FA',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#F5F5FA',
    },
    // Adding Tab Styles here as they are needed for renderTabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 12,
        padding: 4,
        elevation: 2,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#D32F2F', // Using Red to match the new card style theme
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#757575',
    },
    activeTabText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    // Updated Card Styles
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardUpperRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dateBox: {
        width: 60,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        elevation: 2,
        backgroundColor: '#FFF',
    },
    dateMonthContainer: {
        backgroundColor: '#D32F2F', // Red header
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    dateMonthText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    dateDayContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateDayText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    midInfoContainer: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    ordersHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    ordersCountTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    timeBadgeContainer: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    timeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1976D2',
        textTransform: 'uppercase',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4A5568',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F5F5FA',
        marginBottom: 12,
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    viewBillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5FA',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    viewBillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4A5568',
        marginLeft: 6,
    },
    earningsInfoRight: {
        alignItems: 'flex-end',
    },
    earningsLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#A0AEC0',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    earningsValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1A1A1A',
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#A0AEC0',
        fontWeight: '600',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '75%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    modalList: {
        paddingBottom: 20,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F7FAFC',
    },
    orderIdItem: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A202C',
    },
    customerNameItem: {
        fontSize: 13,
        color: '#4A5568',
        marginVertical: 2,
    },
    orderTimeItem: {
        fontSize: 12,
        color: '#A0AEC0',
    },
    orderAmountItem: {
        fontSize: 16,
        fontWeight: '800',
        color: '#2B6CB0',
        marginBottom: 4,
    },
    miniStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    // Status Badge Styles (Added for new design)
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12, // Rounded corners for badge
        borderWidth: 1,
    },
    completedBadge: {
        backgroundColor: '#E8F5E9',
        borderColor: '#81C784',
    },
    pendingBadge: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FFB74D',
    },
    statusBadgeText: {
        fontSize: 8,
        fontWeight: '800', // Bold text
        marginLeft: 4,
        textTransform: 'uppercase',
    },

    // Range Modal Styles (kept from previous step)
    rangeModalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    rangeModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        elevation: 10,
    },
    rangeModalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A202C',
        marginBottom: 20,
        textAlign: 'center',
    },
    dateInput: {
        backgroundColor: '#F7FAFC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dateValue: {
        fontSize: 15,
        color: '#2D3748',
        fontWeight: '600',
    },
    datePlaceholder: {
        fontSize: 15,
        color: '#A0AEC0',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 12,
    },
    modalButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    cancelButton: {
        backgroundColor: '#EDF2F7',
    },
    applyButton: {
        backgroundColor: '#2B6CB0',
    },
    cancelButtonText: {
        color: '#4A5568',
        fontWeight: '700',
    },
    applyButtonText: {
        color: '#FFF',
        fontWeight: '700',
    },
});

export default EarningsHistoryScreen;
