import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from './services/socketService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadToken = async () => {
            try {
                const token = await AsyncStorage.getItem('driverToken');
                setAuthToken(token);
            } catch (e) {
                console.error('Failed to load token', e);
            } finally {
                setLoading(false);
            }
        };
        loadToken();
    }, []);

    const login = async (token, driverData) => {
        await AsyncStorage.setItem('driverToken', token);
        await AsyncStorage.setItem('driverData', JSON.stringify(driverData));
        setAuthToken(token);
        // Connect socket
        await socketService.connect();
    };

    const logout = async () => {
        try {
            // Import apiClient dynamically to avoid circular dependencies if any
            const apiClient = require('./api/client').default;
            await apiClient.patch('/driver/status', { isOnline: false });
        } catch (e) {
            console.error('Failed to update online status during logout', e);
        }
        await AsyncStorage.multiRemove(['driverToken', 'driverData']);
        setAuthToken(null);
        socketService.disconnect();
    };

    return (
        <AuthContext.Provider value={{ authToken, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
