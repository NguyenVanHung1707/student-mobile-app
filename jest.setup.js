import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock React Navigation native module
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: callback => {
      require('react').useEffect(() => {
        callback();
      }, []);
    },
  };
});

// Mock environment variables (@env)
jest.mock(
  '@env',
  () => ({
    HOST: 'https://thuvienso.io.vn',
    API_URL: 'https://thuvienso.io.vn/api',
  }),
  {virtual: true},
);

// Mock Axios
jest.mock('axios', () => {
  return {
    get: jest.fn(() => Promise.resolve({data: {}})),
    post: jest.fn(() => Promise.resolve({data: {}, status: 200})),
    put: jest.fn(() => Promise.resolve({data: {}})),
    delete: jest.fn(() => Promise.resolve({data: {}})),
    request: jest.fn(() => Promise.resolve({data: {}, status: 200})),
    create: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({data: {}})),
      post: jest.fn(() => Promise.resolve({data: {}, status: 200})),
    })),
  };
});

// Mock Native Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => 'MaterialCommunityIcons',
);
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesome');

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(success =>
    success({
      coords: {
        latitude: 21.0285,
        longitude: 105.8542,
      },
    }),
  ),
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
}));

// Mock Geolocation Community
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(success =>
    success({
      coords: {
        latitude: 21.0285,
        longitude: 105.8542,
      },
    }),
  ),
  requestAuthorization: jest.fn(),
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn((options, callback) =>
    callback({
      didCancel: false,
      assets: [
        {
          uri: 'test-uri',
          fileName: 'test-file.jpg',
          type: 'image/jpeg',
          fileSize: 1024,
        },
      ],
    }),
  ),
}));

import {Alert} from 'react-native';
