import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import {useColorScheme} from 'react-native';
import {getThemeColors} from './Utility';
import ClassManagement from './ClassManagement';
import HomePage from './HomePage';
import ClassDetail from './ClassDetail';
import UploadImageScreen from './UploadImageScreen'; // Import the UploadImageScreen
import ClassDiscussion from './ClassDiscussion';
import GradesAndAttendance from './GradesAndAttendance';
import TimetableScreen from './TimetableScreen'; // Import TimetableScreen
import TakeAssessmentScreen from './TakeAssessmentScreen'; // Import TakeAssessmentScreen

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
      <Stack.Screen
        name="TakeAssessment"
        component={TakeAssessmentScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};


export default function MainPage() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Điểm danh') {
            iconName = 'qrcode';
          } else if (route.name === 'Lớp học') {
            iconName = 'university';
          } else if (route.name === 'Lịch học') {
            iconName = 'calendar';
          } else if (route.name === 'Kết quả') {
            iconName = 'bar-chart';
          } else if (route.name === 'FaceID') {
            iconName = 'camera';
          }

          return <Icon name={iconName} size={focused ? size + 2 : size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          paddingBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 62,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -3},
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        headerStyle: {
          backgroundColor: theme.card,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.05,
          shadowRadius: 3,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.5,
        },
      })}>
      <Tab.Screen name="Điểm danh" component={HomeScreen} />
      <Tab.Screen name="Lớp học" component={ClassManagementStack} />
      <Tab.Screen name="Lịch học" component={TimetableScreen} options={{headerShown: false}} />
      <Tab.Screen name="Kết quả" component={GradesAndAttendance} />
      <Tab.Screen name="FaceID" component={UploadImageScreen} />
    </Tab.Navigator>
  );
}

