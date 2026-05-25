import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import ClassManagement from './ClassManagement';
import HomePage from './HomePage';
import ClassDetail from './ClassDetail';
import UploadImageScreen from './UploadImageScreen'; // Import the UploadImageScreen
import ClassDiscussion from './ClassDiscussion';
import GradesAndAttendance from './GradesAndAttendance';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeScreen = () => {
  return <HomePage />;
};

const ClassManagementStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClassManagement"
        component={ClassManagement}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetail}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ClassDiscussion"
        component={ClassDiscussion}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export default function MainPage() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Điểm danh') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'Lớp học của tôi') {
            iconName = focused ? 'book' : 'book';
          } else if (route.name === 'Kết quả học tập') {
            iconName = focused ? 'graduation-cap' : 'graduation-cap';
          } else if (route.name === 'Upload Image') {
            iconName = focused ? 'upload' : 'upload';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}>
      <Tab.Screen name="Điểm danh" component={HomeScreen} />
      <Tab.Screen name="Lớp học của tôi" component={ClassManagementStack} />
      <Tab.Screen name="Kết quả học tập" component={GradesAndAttendance} />
      <Tab.Screen name="Upload Image" component={UploadImageScreen} />
    </Tab.Navigator>
  );
}
