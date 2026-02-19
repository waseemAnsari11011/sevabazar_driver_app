import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../AuthContext';

const ProfileScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { driver, logout } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        await logout();
                        setLoading(false);
                    }
                }
            ]
        );
    };


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header removed as requested */}

                {/* Preferences Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>PREFERENCES</Text>

                    <View style={styles.menuList}>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconWrapper, { backgroundColor: '#F0F7FF' }]}>
                                <Ionicons name="person" size={20} color="#111" />
                            </View>
                            <Text style={styles.menuTitle}>Account Details</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CCC" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconWrapper, { backgroundColor: '#F9F1FF' }]}>
                                <Ionicons name="notifications" size={20} color="#111" />
                            </View>
                            <Text style={styles.menuTitle}>Notifications</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CCC" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconWrapper, { backgroundColor: '#F0FBF3' }]}>
                                <Ionicons name="car" size={20} color="#111" />
                            </View>
                            <Text style={styles.menuTitle}>Vehicle Info</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CCC" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.iconWrapper, { backgroundColor: '#F8F1FF' }]}>
                                <Ionicons name="shield-checkmark" size={20} color="#111" />
                            </View>
                            <Text style={styles.menuTitle}>Privacy & Security</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CCC" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('SupportTicket')}
                        >
                            <View style={[styles.iconWrapper, { backgroundColor: '#F0F7FF' }]}>
                                <Ionicons name="help-circle" size={22} color="#111" />
                            </View>
                            <Text style={styles.menuTitle}>Support Center</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CCC" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout Action */}
                <TouchableOpacity
                    style={styles.logoutLink}
                    onPress={handleLogout}
                    disabled={loading}
                >
                    <Text style={styles.logoutLinkText}>
                        {loading ? 'Logging Out...' : 'Log Out'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>SevaBazar Driver App v1.0.0</Text>
            </ScrollView >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarCard: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#F7F3F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    innerAvatar: {
        alignItems: 'center',
    },
    partnerTextLabel: {
        fontSize: 12,
        fontFamily: 'serif',
        color: '#8B7E74',
        marginBottom: 2,
    },
    decorationLine: {
        width: 40,
        height: 1,
        backgroundColor: '#DED6D1',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    driverName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1C1E',
        marginRight: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#34C759',
    },
    sectionContainer: {
        width: '100%',
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A1ABB7',
        letterSpacing: 1.2,
        marginBottom: 12,
        paddingLeft: 4,
    },
    menuList: {
        gap: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    iconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1C1E',
    },
    divider: {
        height: 1,
        backgroundColor: '#F2F4F7',
        marginLeft: 58,
    },
    logoutLink: {
        marginTop: 10,
        alignItems: 'center',
        paddingVertical: 8,
    },
    logoutLinkText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#A1ABB7',
    },
    versionText: {
        marginTop: 30,
        textAlign: 'center',
        color: '#D1D5DB',
        fontSize: 11,
        fontWeight: '500',
    }
});

export default ProfileScreen;
