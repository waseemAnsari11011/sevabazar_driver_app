import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../AuthContext';
import { loginDriver } from '../api/auth';

const LoginScreen = ({ navigation }) => {
    const { login } = useAuth();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!phone || !password) {
            Alert.alert('Error', 'Please enter both phone and password');
            return;
        }

        setLoading(true);
        try {
            let deviceToken = null;
            try {
                deviceToken = await messaging().getToken();
                console.log('FCM Token:', deviceToken);
            } catch (tokenError) {
                console.warn('Failed to get FCM token:', tokenError);
            }

            const data = await loginDriver(phone, password, deviceToken, Platform.OS);
            await login(data.token, data.driver);
            // No need for navigation.replace('Home') as AppNavigator will switch stack based on token
        } catch (error) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>SevaBazar Driver</Text>
                <Text style={styles.subtitle}>Welcome back! Please login.</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    placeholderTextColor="#999"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="#999"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.registerLink}
                    onPress={() => navigation.navigate('Register')}
                >
                    <Text style={styles.registerLinkText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    inner: {
        padding: 32,
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#111',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 48,
        fontWeight: '500',
    },
    input: {
        height: 60,
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 16,
        paddingHorizontal: 20,
        marginBottom: 20,
        fontSize: 16,
        color: '#111',
        fontWeight: '500',
    },
    button: {
        height: 60,
        backgroundColor: '#111', // Solid dark for premium feel
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
    },
    registerLink: {
        marginTop: 32,
        alignItems: 'center',
    },
    registerLinkText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LoginScreen;
