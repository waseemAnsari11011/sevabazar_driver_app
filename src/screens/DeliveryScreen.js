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
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import SwipeToComplete from '../components/SwipeToComplete';
import OTPInputModal from '../components/OTPInputModal';

const formatAddress = (addr) => {
    if (!addr) return 'Address not available';
    if (typeof addr === 'string') return addr;

    const parts = [
        addr.landmark,
        addr.addressLine2,
        addr.postalCode
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Address not available';
};

const DeliveryScreen = ({ route, navigation }) => {
    const { order } = route.params;
    const [completing, setCompleting] = useState(false);
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Extract customer details from order
    const rawData = order.rawOfferData || {};
    const shippingAddress = rawData.shippingAddress || {};

    // Construct address string
    const fullAddress = shippingAddress.address || formatAddress(shippingAddress);

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
    const formattedDate = (order.createdAt && !isNaN(new Date(order.createdAt)))
        ? new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        })
        : 'Date not available';

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer Details</Text>
                <View style={[styles.card, { padding: 0 }]}>
                    <View style={styles.customerHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.customerNameLarge}>{customerName}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={callCustomer}
                            style={styles.phoneBadge}
                        >
                            <Text style={styles.phoneBadgeText}>📞 {customerPhone || 'N/A'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Delivery Address</Text>
                                <Text style={styles.addressValue}>{fullAddress}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={openGoogleMaps}
                                style={[styles.phoneBadge, { backgroundColor: '#E1F5FE', borderColor: '#03A9F4' }]}
                            >
                                <Text style={[styles.phoneBadgeText, { color: '#03A9F4' }]}>📍 Map</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                <View style={styles.card}>
                    {/* Order Header */}
                    <View style={styles.orderHeader}>
                        <Text style={styles.orderHeaderText}>🆔 Order ID: {order.orderId}</Text>
                        <Text style={styles.orderHeaderText}>📅 Ordered On: {formattedDate}</Text>
                    </View>
                    <View style={styles.divider} />

                    {rawData.items && rawData.items.length > 0 ? (
                        rawData.items.map((item, index) => {
                            // Extract image safely
                            const productImage = item.image || 'https://via.placeholder.com/60';
                            // Calculate item total if not present (fallback)
                            const itemTotal = item.totalAmount || (item.price * item.quantity);
                            const discount = item.discount || 0;

                            return (
                                <View key={index} style={styles.productContainer}>
                                    <View style={styles.productDetailsContainer}>
                                        <Image
                                            source={{ uri: productImage }}
                                            style={styles.productImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.productInfo}>
                                            <Text style={styles.productName}>📦 Product: {item.name}</Text>

                                            <Text style={styles.productDetails}>⬇️ Quantity: {item.quantity}</Text>
                                            <Text style={styles.productDetails}>💲 Price: ₹{item.price}</Text>
                                            <Text style={styles.productDetails}>% Discount: {discount}%</Text>
                                            <Text style={styles.productDetails}>🔢 Total Amount: ₹{itemTotal}</Text>

                                            {/* Variations */}
                                            {item.variations && item.variations.length > 0 && (
                                                <View style={{ marginTop: 4 }}>
                                                    {item.variations.map((v, vIndex) => (
                                                        <View key={vIndex}>
                                                            {v.attributes?.map((a, aIndex) => (
                                                                <Text key={aIndex} style={styles.productDetails}>
                                                                    🏷️ {a.name}: {a.value}
                                                                </Text>
                                                            ))}
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.noItemsText}>No items data available</Text>
                    )}

                    {/* Payment Breakdown Calculation and Display */}
                    {(() => {
                        let grossTotal = 0;
                        let itemTotal = 0;

                        // Calculate totals from items
                        if (rawData.items) {
                            rawData.items.forEach(item => {
                                const pPrice = item.price || 0;
                                const pQty = item.quantity || 1;
                                const pTotal = item.totalAmount || (pPrice * pQty);

                                grossTotal += (pPrice * pQty);
                                itemTotal += pTotal;
                            });
                        }

                        const discountTotal = grossTotal - itemTotal;
                        const deliveryFee = rawData.deliveryCharge || 0;
                        const shippingFee = rawData.shippingFee || 0;
                        const grandTotal = itemTotal + deliveryFee + shippingFee;

                        return (
                            <View style={styles.breakdownContainer}>
                                <Text style={styles.breakdownTitle}>Payment Details</Text>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>MRP Total</Text>
                                    <Text style={styles.breakdownValue}>₹{grossTotal.toFixed(2)}</Text>
                                </View>
                                {discountTotal > 0 && (
                                    <View style={styles.breakdownRow}>
                                        <Text style={styles.breakdownLabel}>Discount</Text>
                                        <Text style={[styles.breakdownValue, { color: 'green' }]}>-₹{discountTotal.toFixed(2)}</Text>
                                    </View>
                                )}
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Delivery Fee</Text>
                                    <Text style={styles.breakdownValue}>₹{deliveryFee.toFixed(2)}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Shipping Fee</Text>
                                    <Text style={styles.breakdownValue}>₹{shippingFee.toFixed(2)}</Text>
                                </View>
                                <View style={[styles.breakdownRow, styles.totalRow]}>
                                    <Text style={styles.totalLabel}>Grand Total</Text>
                                    <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
                                </View>
                            </View>
                        );
                    })()}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earnings Info</Text>
                <View style={styles.card}>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Total Distance:</Text>
                        <Text style={styles.value}>{order.totalDistance} km</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Your Earning:</Text>
                        <Text style={styles.earningValue}>₹{order.earning}</Text>
                    </View>
                </View>
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
        </ScrollView >
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
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
    },
    customerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fcfcfc',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    customerNameLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    phoneBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    phoneBadgeText: {
        color: '#2196F3',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#eee',
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
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    itemMeta: {
        fontSize: 14,
        color: '#666',
    },
    itemPrice: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
    itemImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    noImagePlaceholder: {
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    noImageText: {
        fontSize: 10,
        color: '#999',
    },
    noItemsText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        padding: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E91E63',
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
    productContainer: {
        marginBottom: 12,
        padding: 8,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    productDetailsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    productImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#ddd',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    productDetails: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    // New Breakdown Styles
    breakdownContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    breakdownTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#666',
    },
    breakdownValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ff6600',
    },
    orderHeader: {
        marginBottom: 8,
    },
    orderHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
});

export default DeliveryScreen;
