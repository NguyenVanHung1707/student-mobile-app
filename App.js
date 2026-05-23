import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import LoginPage from "./src/LoginPage";
import MainPage from "./src/MainPage";
import SignUpPage from "./src/SignUpPage";
import CompleteProfile from "./src/CompleteProfile";


const Stack = createStackNavigator();
export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator initialScreen="Login">
          <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }}/>
          <Stack.Screen name="Home" component={MainPage} options={{ headerShown: false }}/>
          <Stack.Screen name="SignUp" component={SignUpPage} options={{ headerShown: false }}/>
          <Stack.Screen name="CompleteProfile" component={CompleteProfile} options={{ headerShown: false }}/>
        </Stack.Navigator>
      </NavigationContainer>
  );
}