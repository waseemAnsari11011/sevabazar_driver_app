import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/AuthContext';

const App = () => {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <AppNavigator />
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default App;
