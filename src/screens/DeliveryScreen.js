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
import SwipeToComplete from '../components/SwipeToComplete';
import OTPInputModal from '../components/OTPInputModal';

const DeliveryScreen = ({ route, navigation }) => {
    const { order } = route.params;
    const [completing, setCompleting] = useState(false);
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Extract customer details from order
    const rawData = order.rawOfferData || {};
    const shippingAddress = rawData.shippingAddress || {};

    // Construct address string
    const fullAddress = shippingAddress.address
        ? `${shippingAddress.address}, ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postalCode || ''}`
        : 'Address not available';

    const customerPhone = shippingAddress.phone || rawData.customerPhone || '';
    const customerName = shippingAddress.name || rawData.customerName || rawData.name || 'Customer';
    const customerLocation = rawData.dropLocation || rawData.location || {};

    const openGoogleMaps = () => {
        const { latitude, longitude } = customerLocation;
        if (!latitude || !longitude) {
            Alert.alert('Error', 'Customer location not available');
            return;
        }

        const url = `https://maps.google.com/?daddr=${latitude},${longitude}`;
        Linking.openURL(url).catch(err =>
            Alert.alert('Error', 'Unable to open Google Maps')
        );
    };

    const callCustomer = () => {
        if (!customerPhone) {
            Alert.alert('Error', 'Customer phone number not available');
            return;
        }

        const url = `tel:${customerPhone}`;
        Linking.openURL(url).catch(err =>
            Alert.alert('Error', 'Unable to make call')
        );
    };

    const handleCompleteDelivery = async () => {
        setCompleting(true);
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.post('/driver/initiate-delivery-completion', {
                orderId: order.orderId,
                driverId: driver._id,
            });

            if (response.data.success) {
                setOtpModalVisible(true);
            }
        } catch (error) {
            console.error('Error initiating delivery completion:', error);
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to initiate delivery'
            );
        } finally {
            setCompleting(false);
        }
    };

    const handleOTPSubmit = async (otp) => {
        setVerifying(true);
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);

            const response = await apiClient.post('/driver/complete-delivery', {
                orderId: order.orderId,
                driverId: driver._id,
                deliveryOtp: otp,
            });

            if (response.data.success) {
                setOtpModalVisible(false);
                Alert.alert(
                    'Success!',
                    `Delivery completed! You earned ₹${response.data.earned}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.replace('Home')
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error verifying delivery OTP:', error);
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Invalid OTP'
            );
        } finally {
            setVerifying(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Delivery Mode</Text>
                <Text style={styles.orderIdText}>Order #{order.orderId}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer Details</Text>
                <View style={styles.card}>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>{customerName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Phone:</Text>
                        <TouchableOpacity onPress={callCustomer}>
                            <Text style={styles.phoneValue}>📞 {customerPhone || 'N/A'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Address:</Text>
                        <Text style={styles.addressValue}>{fullAddress}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.mapsButton}
                    onPress={openGoogleMaps}
                >
                    <Text style={styles.mapsButtonText}>📍 Navigate to Customer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.callButton}
                    onPress={callCustomer}
                >
                    <Text style={styles.callButtonText}>📞 Call Customer</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Delivery Details</Text>
                <View style={styles.card}>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Distance:</Text>
                        <Text style={styles.value}>{order.totalDistance} km</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Earning:</Text>
                        <Text style={styles.earningValue}>₹{order.earning}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.instructionText}>
                    📦 Deliver the order to the customer
                    {'\n'}✅ Confirm delivery details
                    {'\n'}👆 Swipe to complete delivery
                </Text>
            </View>

            <View style={styles.sliderContainer}>
                <SwipeToComplete
                    onComplete={handleCompleteDelivery}
                    disabled={completing || verifying}
                />
            </View>

            <OTPInputModal
                visible={otpModalVisible}
                onCancel={() => setOtpModalVisible(false)}
                onSubmit={handleOTPSubmit}
                loading={verifying}
                title="Verify Delivery OTP"
                message="Enter the OTP provided by the customer to complete the delivery."
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
        backgroundColor: '#FF9800',
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
    detailRow: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    phoneValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2196F3',
        textDecorationLine: 'underline',
    },
    addressValue: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
    earningValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
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
    callButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        elevation: 3,
    },
    callButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
    sliderContainer: {
        padding: 16,
        paddingBottom: 32,
    },
});

export default DeliveryScreen;
