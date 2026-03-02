import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { useAuth } from '../AuthContext';

const RejectionBlockedScreen = ({ navigation }) => {
    const { logout } = useAuth();

    const handleRefresh = async () => {
        try {
            const driverData = await AsyncStorage.getItem('driverData');
            const driver = JSON.parse(driverData);
            const response = await apiClient.get(`/driver/wallet/${driver._id}`);
            if (response.data.success && !response.data.isBlocked) {
                // Unblocked — go back to main app
                navigation.replace('MainTabs');
            } else {
                Alert.alert('Still Blocked', 'Your account is still blocked. Please contact support.');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not refresh status. Try again.');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('driverToken');
                        await AsyncStorage.removeItem('driverData');
                        logout();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconWrapper}>
                <Text style={styles.blockIcon}>🚫</Text>
            </View>

            <Text style={styles.title}>Account Blocked</Text>
            <Text style={styles.subtitle}>
                Your account has been blocked due to 3 or more order rejections.
            </Text>
            <Text style={styles.note}>
                Please contact our support team to get your account unblocked.
            </Text>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>📞 Support: +91-XXXXXXXXXX</Text>
                <Text style={styles.infoText}>📧 support@sevabazar.com</Text>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                    <Text style={styles.refreshBtnText}>🔄 Refresh Status</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFEBEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    blockIcon: {
        fontSize: 56,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#B71C1C',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#555',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
    },
    note: {
        fontSize: 13,
        color: '#888',
        textAlign: 'center',
        marginBottom: 24,
    },
    infoBox: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#FFD54F',
        gap: 6,
    },
    infoText: {
        fontSize: 14,
        color: '#5D4037',
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    refreshBtn: {
        flex: 1,
        backgroundColor: '#1565C0',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    refreshBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 15,
    },
    logoutBtn: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    logoutBtnText: {
        color: '#333',
        fontWeight: '800',
        fontSize: 15,
    },
});

export default RejectionBlockedScreen;
