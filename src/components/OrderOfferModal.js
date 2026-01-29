import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const OrderOfferModal = ({ visible, orderData, onAccept, onReject }) => {
    if (!orderData) return null;

    const { earning, totalDistance, orderId } = orderData;
    const safeOrderId = orderId ? String(orderId) : 'N/A';

    // Safety check for distance: Allow 0 km as it is valid for test environments or nearby deliveries
    const displayDistance = (typeof totalDistance === 'number' && totalDistance >= 0 && totalDistance < 5000)
        ? `${totalDistance} km`
        : 'Calculating...';

    const displayEarning = (typeof earning === 'number' && earning >= 0) ? `₹${earning}` : '---';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onReject}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
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
                                <Text style={styles.billValue}>₹{orderData.rawOfferData.totalAmount}</Text>
                            </View>
                        )}

                        <View style={styles.orderInfo}>
                            <Text style={styles.orderIdText}>Order #{safeOrderId}</Text>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.rejectButton]}
                            onPress={onReject}
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
});

export default OrderOfferModal;
