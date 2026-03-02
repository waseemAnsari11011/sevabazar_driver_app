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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import OTPInputModal from '../components/OTPInputModal';
import { formatCurrency } from '../utils/currency';

const PickupScreen = ({ route, navigation }) => {
    const { order } = route.params;
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Extract vendor details from order
    const rawData = order.rawOfferData || {};
    const vendorName = rawData.businessName || rawData.vendorName || 'Vendor';
    const vendorContactName = rawData.vendorName || 'Vendor';
    const vendorAddress = rawData.vendorAddress || 'Vendor Address';
    const vendorPhone = rawData.vendorPhone || 'N/A';
    const shopPhoto = rawData.vendorShopPhoto;
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

    const handleCallVendor = () => {
        if (vendorPhone === 'N/A') {
            Alert.alert('Error', 'Vendor phone number not available');
            return;
        }
        Linking.openURL(`tel:${vendorPhone}`).catch(err =>
            Alert.alert('Error', 'Unable to make call')
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
                <Text style={styles.sectionTitle}>Vendor information</Text>
                <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
                    {shopPhoto && (
                        <Image
                            source={{ uri: shopPhoto }}
                            style={styles.shopImage}
                            resizeMode="cover"
                        />
                    )}
                    <View style={{ padding: 24 }}>
                        <View style={styles.vendorHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.vendorNameText}>{vendorName}</Text>
                                <Text style={styles.contactNameSubtext}>Owner: {vendorContactName}</Text>
                                <Text style={styles.addressText}>{vendorAddress}</Text>
                                <View style={styles.phoneContainer}>
                                    <Icon name="phone" size={16} color="#4CAF50" />
                                    <Text style={styles.phoneText}>{vendorPhone}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.vendorActions}>
                            <TouchableOpacity style={styles.actionIconButton} onPress={handleCallVendor}>
                                <Icon name="phone" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Call Vendor</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionIconButton, styles.mapButton]} onPress={openGoogleMaps}>
                                <Icon name="map-marker-radius" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Track Location</Text>
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
                                            <Text style={styles.productDetails}>💲 Price: {formatCurrency(item.price)}</Text>
                                            <Text style={styles.productDetails}>% Discount: {discount}%</Text>
                                            <Text style={styles.productDetails}>🔢 Total Amount: {formatCurrency(itemTotal)}</Text>

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
                                <View style={[styles.breakdownRow, styles.totalRow, { marginTop: 0, borderTopWidth: 0 }]}>
                                    <Text style={styles.totalLabel}>Grand Total</Text>
                                    <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
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
                        <Text style={styles.earningValue}>{formatCurrency(order.earning)}</Text>
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
        backgroundColor: '#FFFFFF',
    },
    section: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#888',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    vendorNameText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#111',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    addressText: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 15,
        color: '#888',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#111',
    },
    earningValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#4CAF50',
    },
    productContainer: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    productDetailsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        marginRight: 16,
        backgroundColor: '#EEE',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111',
        marginBottom: 6,
    },
    productDetails: {
        fontSize: 13,
        color: '#666',
        marginBottom: 3,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 16,
    },
    breakdownContainer: {
        marginTop: 12,
    },
    breakdownTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 12,
        color: '#111',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    breakdownValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '700',
    },
    totalRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#ff6600',
    },
    orderHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111',
        marginBottom: 6,
    },
    verifyButton: {
        backgroundColor: '#111',
        margin: 24,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    verifyButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    vendorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#E8F5E9',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    phoneText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '700',
        marginLeft: 6,
    },
    vendorActions: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    actionIconButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    mapButton: {
        backgroundColor: '#2196F3',
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    shopImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#F5F5F5',
    },
    contactNameSubtext: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
        fontWeight: '600',
    },
});

export default PickupScreen;
