import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <AppNavigator />
        </>
    );
};

export default App;
