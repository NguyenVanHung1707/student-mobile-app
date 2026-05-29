import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {KEYCLOAK_CLIENT_ID, KEYCLOAK_TOKEN_ENDPOINT} from './config';

let Keychain;
try {
  Keychain = require('react-native-keychain');
} catch (e) {
  console.log('react-native-keychain not loaded in this environment');
}

export const isBiometricsAvailable = async () => {
  if (!Keychain) {
    return false;
  }
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    return biometryType !== null;
  } catch (error) {
    console.log('Error checking biometrics support:', error);
    return false;
  }
};

export const enableBiometricAuth = async (username, refreshToken) => {
  if (!Keychain) {
    return false;
  }
  try {
    await Keychain.setGenericPassword(username, refreshToken, {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.setItem('biometricEnabled', 'true');
    return true;
  } catch (error) {
    console.error('Error enabling biometric auth:', error);
    return false;
  }
};

export const disableBiometricAuth = async () => {
  try {
    if (Keychain) {
      await Keychain.resetGenericPassword();
    }
    await AsyncStorage.removeItem('biometricEnabled');
    return true;
  } catch (error) {
    console.error('Error disabling biometric auth:', error);
    return false;
  }
};

export const isBiometricEnabled = async () => {
  try {
    const enabled = await AsyncStorage.getItem('biometricEnabled');
    return enabled === 'true';
  } catch (e) {
    return false;
  }
};

export const authenticateAndGetToken = async () => {
  if (!Keychain) {
    throw new Error('Biometric secure storage not available');
  }
  try {
    const credentials = await Keychain.getGenericPassword({
      authenticationPrompt: {
        title: 'Xác thực sinh trắc học',
        subtitle: 'Vui lòng xác thực vân tay/FaceID để mở khóa ứng dụng',
        description: 'Xác thực vân tay/FaceID bảo mật phối hợp Keycloak SSO',
        cancel: 'Hủy bỏ',
      },
    });
    if (credentials) {
      return {
        username: credentials.username,
        refreshToken: credentials.password,
      };
    }
    return null;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    throw error;
  }
};

export const performSSORefresh = async refreshToken => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', KEYCLOAK_CLIENT_ID);
    params.append('refresh_token', refreshToken);

    const response = await axios.post(
      KEYCLOAK_TOKEN_ENDPOINT,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (response.data && response.data.access_token) {
      const data = response.data;
      await AsyncStorage.setItem('accessToken', data.access_token);
      // Update refreshToken in Keychain as well to keep the rotation fresh!
      if (data.refresh_token) {
        try {
          const credentials = await Keychain.getGenericPassword();
          if (credentials) {
            await Keychain.setGenericPassword(
              credentials.username,
              data.refresh_token,
              {
                accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
                accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
              },
            );
          }
        } catch (keychainError) {
          console.log('Error updating Keychain with rotated token:', keychainError);
        }
      }
      return data.access_token;
    }
    return null;
  } catch (error) {
    console.error('Keycloak SSO refresh token exchange failed:', error);
    throw error;
  }
};
