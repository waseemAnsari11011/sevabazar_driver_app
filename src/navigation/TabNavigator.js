import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import EarningsHistoryScreen from '../screens/EarningsHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color, size }) => {
    let iconName;

    switch (name) {
        case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
        case 'MyWork':
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            break;
        case 'History':
            iconName = focused ? 'wallet' : 'wallet-outline';
            break;
        case 'Profile':
            iconName = focused ? 'person' : 'person-outline';
            break;
        default:
            iconName = 'help-circle-outline';
    }

    return (
        <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={size || 24} color={color} />
        </View>
    );
};

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => (
                    <TabIcon name={route.name} focused={focused} color={color} size={size} />
                ),
                tabBarActiveTintColor: '#000000',
                tabBarInactiveTintColor: '#999999',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#F0F0F0',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                }}
            />
            <Tab.Screen
                name="MyWork"
                component={MyOrdersScreen}
                options={{
                    tabBarLabel: 'My Work',
                }}
            />
            <Tab.Screen
                name="History"
                component={EarningsHistoryScreen}
                options={{
                    tabBarLabel: 'History',
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 24,
        color: '#000',
        opacity: 0.4,
    },
    iconFocused: {
        opacity: 1,
        color: '#000',
    },
});

export default TabNavigator;
