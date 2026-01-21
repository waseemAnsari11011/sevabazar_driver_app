import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Linking,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import OTPInputModal from '../components/OTPInputModal';

const PickupScreen = ({ route, navigation }) => {
    const { order } = route.params;
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Extract vendor details from order
    const vendor = order.rawOfferData || {};
    const vendorLocation = vendor.pickupLocation || {};

    const openGoogleMaps = () => {
        const { latitude, longitude } = vendorLocation;
        if (!latitude || !longitude) {
            Alert.alert('Error', 'Vendor location not available');
            return;
        }

        const url = `https://maps.google.com/?daddr=${latitude},${longitude}`;
        Linking.openURL(url).catch(err =>
            Alert.alert('Error', 'Unable to open Google Maps')
        );
    };

    const handleVerifyPickup = () => {
        setOtpModalVisible(true);
    };

    const handleOTPSubmit = async (otp) => {
        setVerifying(true);
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.post('/driver/verify-pickup', {
                orderId: order.orderId,
                pickupOtp: otp,
                driverId: driver._id,
            });

            if (response.data.success) {
                Alert.alert('Success', 'Pickup verified! Order is now out for delivery.');
                setOtpModalVisible(false);
                // Navigate to Delivery Mode screen
                navigation.replace('Delivery', { order: order });
            }
        } catch (error) {
            console.error('Error verifying pickup:', error);
            Alert.alert(
                'Verification Failed',
                error.response?.data?.message || 'Invalid OTP. Please try again.'
            );
        } finally {
            setVerifying(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Pickup Mode</Text>
                <Text style={styles.orderIdText}>Order #{order.orderId}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vendor Location</Text>
                <View style={styles.card}>
                    <Text style={styles.addressText}>
                        Pickup from vendor location
                    </Text>
                    {vendorLocation.latitude && (
                        <Text style={styles.coordsText}>
                            {vendorLocation.latitude.toFixed(4)}, {vendorLocation.longitude.toFixed(4)}
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.mapsButton}
                    onPress={openGoogleMaps}
                >
                    <Text style={styles.mapsButtonText}>📍 Open in Google Maps</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Details</Text>
                <View style={styles.card}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Distance:</Text>
                        <Text style={styles.detailValue}>{order.totalDistance} km</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Earning:</Text>
                        <Text style={styles.detailValue}>₹{order.earning}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.instructionText}>
                    📌 Reach the vendor location and collect the order.
                    {'\n'}🔢 Ask the vendor for the 4-digit pickup OTP.
                    {'\n'}✅ Verify pickup to proceed to delivery.
                </Text>
            </View>

            <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyPickup}
                disabled={verifying}
            >
                {verifying ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.verifyButtonText}>Verify Pickup</Text>
                )}
            </TouchableOpacity>

            <OTPInputModal
                visible={otpModalVisible}
                onSubmit={handleOTPSubmit}
                onCancel={() => setOtpModalVisible(false)}
                loading={verifying}
                title="Enter Pickup OTP"
                message="Ask the vendor for the 4-digit code"
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
    orderIdText: {
        fontSize: 16,
        color: '#fff',
        marginTop: 4,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        elevation: 2,
    },
    addressText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    coordsText: {
        fontSize: 14,
        color: '#666',
    },
    mapsButton: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        elevation: 3,
    },
    mapsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 16,
        color: '#666',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    instructionText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
    },
    verifyButton: {
        backgroundColor: '#4CAF50',
        margin: 16,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default PickupScreen;
