import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useApp } from '../store/AppContext';

import WelcomeScreen        from '../screens/onboarding/WelcomeScreen';
import SetupWalletScreen    from '../screens/onboarding/SetupWalletScreen';
import VerifyCardScreen     from '../screens/VerifyCardScreen';
import WalletScreen         from '../screens/WalletScreen';
import POSScreen            from '../screens/POSScreen';
import PayScreen            from '../screens/PayScreen';
import ActivityScreen       from '../screens/ActivityScreen';
import SettingsScreen       from '../screens/SettingsScreen';
import CustomTabBar         from '../components/ui/CustomTabBar';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Receive" component={POSScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, hasWallet, isCardVerified } = useApp();
  const initialRouteName = !isLoggedIn
    ? 'Welcome'
    : !hasWallet
      ? 'SetupWallet'
      : !isCardVerified
        ? 'VerifyCard'
        : 'Main';

  return (
    <Stack.Navigator
      key={initialRouteName}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SetupWallet" component={SetupWalletScreen} />
      <Stack.Screen name="VerifyCard" component={VerifyCardScreen} />
      <Stack.Screen name="Main" component={HomeTabs} />
    </Stack.Navigator>
  );
}
