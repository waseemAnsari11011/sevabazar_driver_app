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
import OTPInputModal from '../components/OTPInputModal';

const PickupScreen = ({ route, navigation }) => {
    const { order } = route.params;
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Extract vendor details from order
    const rawData = order.rawOfferData || {};
    const vendorName = rawData.vendorName || 'Vendor';
    const vendorAddress = rawData.vendorAddress || 'Vendor Address';
    const vendorLocation = rawData.pickupLocation || {};

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
                <Text style={styles.sectionTitle}>Vendor Location</Text>
                <View style={styles.card}>
                    <Text style={styles.vendorNameText}>{vendorName}</Text>
                    <Text style={styles.addressText}>{vendorAddress}</Text>
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
                                {/* Optional: Distance info if needed, similar to screenshot */}
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
                        <Text style={styles.detailLabel}>Total Distance:</Text>
                        <Text style={styles.detailValue}>{order.totalDistance} km</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Your Earning:</Text>
                        <Text style={styles.earningValue}>₹{order.earning}</Text>
                    </View>
                </View>
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
    vendorNameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 16,
        color: '#666',
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
    earningValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
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
    customerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fcfcfc',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    customerNameLarge: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    phoneBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    phoneBadgeText: {
        color: '#2196F3',
        fontWeight: 'bold',
        fontSize: 13,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#eee',
    },
    addressTitle: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    addressTextLarge: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
});

export default PickupScreen;
