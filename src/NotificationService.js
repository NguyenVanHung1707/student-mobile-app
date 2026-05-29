import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {Alert} from 'react-native';

let messaging;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.log('@react-native-firebase/messaging not loaded in this environment');
}

export const requestUserPermission = async () => {
  if (!messaging) {
    return false;
  }
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error) {
    console.log('Error requesting push notification permission:', error);
    return false;
  }
};

export const getFCMToken = async () => {
  if (!messaging) {
    return null;
  }
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.log('Error getting FCM token:', error);
    return null;
  }
};

export const registerFCMTokenWithBackend = async (apiUrl, accessToken) => {
  try {
    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      return false;
    }
    
    // Save to local async storage to prevent redundant API calls
    const cachedToken = await AsyncStorage.getItem('fcmTokenCached');
    if (cachedToken === fcmToken) {
      console.log('FCM token is already registered and up to date');
      return true;
    }

    const config = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    const payload = {
      fcmToken: fcmToken,
      deviceType: 'MOBILE',
    };

    await axios.post(`${apiUrl}/student/update-fcm-token`, payload, config);
    await AsyncStorage.setItem('fcmTokenCached', fcmToken);
    console.log('FCM registration token synced with backend successfully!');
    return true;
  } catch (error) {
    console.log('Failed to register FCM token with backend:', error.message);
    return false;
  }
};

export const initPushNotifications = (navigation) => {
  if (!messaging) {
    return;
  }

  // 1. Foreground Notification handler
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('Foreground Push Notification received:', remoteMessage);
    const {title, body} = remoteMessage.notification || {};
    Alert.alert(
      title || 'Thông báo mới',
      body || 'Bạn có một tin nhắn mới từ hệ thống.',
      [
        {text: 'Đóng', style: 'cancel'},
        {
          text: 'Xem ngay',
          onPress: () => handleNotificationRouting(remoteMessage, navigation),
        },
      ],
    );
  });

  // 2. Background Notification click handler (when app is running in background)
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('App opened from background state by clicking notification:', remoteMessage);
    handleNotificationRouting(remoteMessage, navigation);
  });

  // 3. Quit/Killed State Notification click handler (when app is completely closed)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from completely killed state by clicking notification:', remoteMessage);
        handleNotificationRouting(remoteMessage, navigation);
      }
    });

  return () => {
    if (unsubscribeForeground) {
      unsubscribeForeground();
    }
  };
};

const handleNotificationRouting = (remoteMessage, navigation) => {
  if (!remoteMessage || !remoteMessage.data) {
    return;
  }

  const {screen, courseId, assessmentId} = remoteMessage.data;
  if (!screen) {
    return;
  }

  try {
    if (screen === 'ClassDiscussion') {
      navigation.navigate('ClassDiscussion', {courseId});
    } else if (screen === 'Timetable') {
      navigation.navigate('Timetable');
    } else if (screen === 'GradesAndAttendance') {
      navigation.navigate('GradesAndAttendance');
    } else if (screen === 'TakeAssessment' && assessmentId) {
      navigation.navigate('TakeAssessment', {assessmentId, courseId});
    } else {
      navigation.navigate(screen);
    }
  } catch (err) {
    console.log('Notification routing failed:', err);
  }
};
