import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

const {GeofenceLocation} = NativeModules;

const requestAndroidLocationPermission = async () => {
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);

  const fineGranted =
    result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
    PermissionsAndroid.RESULTS.GRANTED;
  const coarseGranted =
    result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
    PermissionsAndroid.RESULTS.GRANTED;

  if (!fineGranted && !coarseGranted) {
    throw new Error('Vui lòng cấp quyền vị trí trong Cài đặt để tiếp tục.');
  }
};

export const getVerifiedLocation = async () => {
  if (!GeofenceLocation) {
    throw new Error('Thiết bị chưa hỗ trợ module vị trí.');
  }

  if (Platform.OS === 'android') {
    await requestAndroidLocationPermission();
  }

  const location = await GeofenceLocation.getCurrentLocation();
  if (location?.isMockLocation) {
    const error = new Error('Thiết bị đang bật vị trí giả');
    error.mockLocationDetected = true;
    throw error;
  }

  return location;
};
