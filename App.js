import React, {useEffect} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import LoginPage from './src/LoginPage';
import MainPage from './src/MainPage';
import SignUpPage from './src/SignUpPage';
import CompleteProfile from './src/CompleteProfile';
import ChangePasswordScreen from './src/ChangePasswordScreen';
import {requestUserPermission, initPushNotifications} from './src/NotificationService';

const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

export default function App() {
  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await requestUserPermission();
      if (hasPermission) {
        initPushNotifications({
          navigate: (name, params) => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(name, params);
            }
          },
        });
      }
    };
    setupNotifications();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginPage}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Home"
          component={MainPage}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpPage}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="CompleteProfile"
          component={CompleteProfile}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{
            headerTitle: 'Đổi mật khẩu',
            headerShown: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

