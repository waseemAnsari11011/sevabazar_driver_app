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
                        <View style={styles.infoCard}>
                            <Text style={styles.label}>Earning</Text>
                            <Text style={styles.earningValue}>₹{earning}</Text>
                        </View>

                        <View style={styles.infoCard}>
                            <Text style={styles.label}>Total Distance</Text>
                            <Text style={styles.distanceValue}>{totalDistance} km</Text>
                            <Text style={styles.subtext}>
                                (Your location → Pickup → Drop)
                            </Text>
                        </View>

                        <View style={styles.orderInfo}>
                            <Text style={styles.orderIdText}>Order #{orderId}</Text>
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
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    earningValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    distanceValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    subtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
    orderInfo: {
        alignItems: 'center',
        marginTop: 8,
    },
    orderIdText: {
        fontSize: 16,
        color: '#666',
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
