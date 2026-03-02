import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    ScrollView,
} from 'react-native';
import { formatCurrency } from '../utils/currency';

const { width, height } = Dimensions.get('window');

const REASONS = [
    "Too far",
    "Vehicle issue",
    "Personal emergency",
    "Low pay",
    "Others"
];

const OrderOfferModal = ({ visible, orderData, onAccept, onReject }) => {
    const [showReasons, setShowReasons] = useState(false);
    const [selectedReason, setSelectedReason] = useState(null);
    const [otherReason, setOtherReason] = useState('');

    if (!orderData) return null;

    const { earning, totalDistance, orderId } = orderData;
    const safeOrderId = orderId ? String(orderId) : 'N/A';

    // Safety check for distance: Allow 0 km as it is valid for test environments or nearby deliveries
    const displayDistance = (typeof totalDistance === 'number' && totalDistance >= 0 && totalDistance < 5000)
        ? `${totalDistance} km`
        : 'Calculating...';

    const displayEarning = (typeof earning === 'number' && earning >= 0) ? formatCurrency(earning) : '---';

    const handleRejectClick = () => {
        setShowReasons(true);
    };

    const handleFinalReject = () => {
        const reason = selectedReason === 'Others' ? otherReason : selectedReason;
        if (!reason && showReasons) {
            alert('Please select or enter a reason');
            return;
        }
        onReject(reason);
        // Reset state for next time
        setShowReasons(false);
        setSelectedReason(null);
        setOtherReason('');
    };

    const renderMainContent = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.headerText}>New Order Offer!</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.vendorBox}>
                    <Text style={styles.vendorLabel}>From:</Text>
                    <Text style={styles.vendorName}>{orderData.rawOfferData?.vendorName || 'Vendor'}</Text>
                </View>

                <View style={styles.row}>
                    <View style={[styles.infoCard, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Earning</Text>
                        <Text style={styles.earningValue}>{displayEarning}</Text>
                    </View>

                    <View style={[styles.infoCard, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Distance</Text>
                        <Text style={styles.distanceValue}>{displayDistance.split(' ')[0]}</Text>
                        <Text style={styles.unitText}>km</Text>
                    </View>
                </View>

                {orderData.rawOfferData?.totalAmount && (
                    <View style={styles.billBox}>
                        <Text style={styles.billLabel}>Order Total Bill:</Text>
                        <Text style={styles.billValue}>{formatCurrency(orderData.rawOfferData.totalAmount)}</Text>
                    </View>
                )}

                <View style={styles.orderInfo}>
                    <Text style={styles.orderIdText}>Order #{safeOrderId}</Text>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={handleRejectClick}
                >
                    <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={onAccept}
                >
                    <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderReasonContent = () => (
        <>
            <View style={[styles.header, { backgroundColor: '#f44336' }]}>
                <Text style={styles.headerText}>Reason for Rejection</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.reasonInstruction}>Please tell us why you're rejecting this order:</Text>
                <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
                    {REASONS.map((reason) => (
                        <TouchableOpacity
                            key={reason}
                            style={[
                                styles.reasonItem,
                                selectedReason === reason && styles.selectedReasonItem
                            ]}
                            onPress={() => setSelectedReason(reason)}
                        >
                            <View style={[
                                styles.radioButton,
                                selectedReason === reason && styles.radioButtonSelected
                            ]} />
                            <Text style={[
                                styles.reasonText,
                                selectedReason === reason && styles.selectedReasonText
                            ]}>{reason}</Text>
                        </TouchableOpacity>
                    ))}

                    {selectedReason === 'Others' && (
                        <TextInput
                            style={styles.otherInput}
                            placeholder="Type your reason here..."
                            value={otherReason}
                            onChangeText={setOtherReason}
                            multiline
                        />
                    )}
                </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setShowReasons(false)}
                >
                    <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={handleFinalReject}
                >
                    <Text style={styles.buttonText}>Confirm Reject</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => showReasons ? setShowReasons(false) : onReject()}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {showReasons ? renderReasonContent() : renderMainContent()}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.9,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    header: {
        backgroundColor: '#4CAF50',
        padding: 20,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        padding: 24,
    },
    infoCard: {
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    earningValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    distanceValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    unitText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    vendorBox: {
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    vendorLabel: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    vendorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    billBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        marginBottom: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    billLabel: {
        fontSize: 14,
        color: '#666',
    },
    billValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    orderInfo: {
        alignItems: 'center',
        marginTop: 0,
    },
    orderIdText: {
        fontSize: 14,
        color: '#999',
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#f44336',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#e0e0e0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 18,
        fontWeight: 'bold',
    },
    reasonInstruction: {
        fontSize: 16,
        color: '#333',
        marginBottom: 16,
        fontWeight: '500',
    },
    reasonsList: {
        maxHeight: height * 0.4,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#f9f9f9',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    selectedReasonItem: {
        backgroundColor: '#ffebee',
        borderColor: '#f44336',
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 12,
    },
    radioButtonSelected: {
        borderColor: '#f44336',
        backgroundColor: '#f44336',
    },
    reasonText: {
        fontSize: 16,
        color: '#444',
    },
    selectedReasonText: {
        fontWeight: 'bold',
        color: '#f44336',
    },
    otherInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        marginTop: 8,
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    },
});

export default OrderOfferModal;
