import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { useAuth } from '../AuthContext';

const SupportTicketScreen = ({ navigation }) => {
    const { driver } = useAuth();
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const COOLDOWN_DURATION = 5 * 60; // 5 minutes in seconds

    useEffect(() => {
        checkCooldown();
    }, []);

    const checkCooldown = async () => {
        const lastTime = await AsyncStorage.getItem('last_driver_ticket_time');
        if (lastTime) {
            const diff = Math.floor((Date.now() - parseInt(lastTime)) / 1000);
            if (diff < COOLDOWN_DURATION) {
                startCooldown(COOLDOWN_DURATION - diff);
            }
        }
    };

    const startCooldown = (seconds) => {
        setCooldown(seconds);
        const timer = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSubmit = async () => {
        if (!driver?._id) return;
        setLoading(true);
        try {
            const response = await apiClient.post('/tickets/create', {
                driverId: driver._id,
                userType: 'Driver',
                reason: "Driver Support Request"
            });

            if (response.data && response.data.success) {
                await AsyncStorage.setItem('last_driver_ticket_time', Date.now().toString());
                startCooldown(COOLDOWN_DURATION);
                Alert.alert("Success", "Support ticket generated! Our team will contact you soon.");
            } else {
                Alert.alert("Error", response.data?.message || "Failed to generate ticket.");
            }
        } catch (error) {
            console.error("Ticket error:", error);
            Alert.alert("Error", "Something went wrong. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Text style={{ fontSize: 40 }}>🎧</Text>
                </View>
                <Text style={styles.title}>Partner Support</Text>
                <Text style={styles.subtitle}>
                    Experiencing issues with a delivery or your account? Generate a ticket and we'll help you out.
                </Text>

                {cooldown > 0 ? (
                    <View style={styles.cooldownContainer}>
                        <Text style={styles.cooldownText}>
                            Cooldown active: {formatTime(cooldown)}
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>Generate Support Ticket</Text>
                        )}
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SupportTicketScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 40,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#111',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#111',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        elevation: 4,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    cooldownContainer: {
        backgroundColor: '#FFF5F5',
        padding: 20,
        borderRadius: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFEBEB',
    },
    cooldownText: {
        color: '#D32F2F',
        textAlign: 'center',
        fontWeight: '800',
        fontSize: 14,
    },
    backButton: {
        marginTop: 24,
    },
    backButtonText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    }
});
