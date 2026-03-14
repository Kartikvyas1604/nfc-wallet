import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useApp } from '../store/AppContext';

import OnboardingScreen from '../screens/OnboardingScreen';
import CreateWalletScreen from '../screens/CreateWalletScreen';
import BalanceScreen from '../screens/BalanceScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import SendScreen from '../screens/SendScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0F0C29', borderTopColor: '#302B63' },
        tabBarActiveTintColor: '#A855F7',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Balance"
        component={BalanceScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💳</Text> }}
      />
      <Tab.Screen
        name="Receive"
        component={ReceiveScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⬇️</Text> }}
      />
      <Tab.Screen
        name="Pay"
        component={SendScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📲</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, hasWallet } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !hasWallet ? (
        <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
      ) : (
        <Stack.Screen name="Home" component={HomeTabs} />
      )}
    </Stack.Navigator>
  );
}
