import React, {useState, useEffect} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  KeyboardAvoidingView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {storeData, getData, getThemeColors} from './Utility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  API_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_TOKEN_ENDPOINT,
} from './config';
import {
  isBiometricsAvailable,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  authenticateAndGetToken,
  performSSORefresh,
} from './BiometricAuthService';

const {width} = Dimensions.get('window');

const base64Decode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = str.replace(/-/g, '+').replace(/_/g, '/');
  while (buffer.length % 4) {
    buffer += '=';
  }
  
  let result = '';
  for (let i = 0; i < buffer.length; i += 4) {
    const w = chars.indexOf(buffer[i] || '');
    const x = chars.indexOf(buffer[i + 1] || '');
    const y = chars.indexOf(buffer[i + 2] || '');
    const z = chars.indexOf(buffer[i + 3] || '');
    
    const a = (w << 2) | (x >> 4);
    const b = ((x & 15) << 4) | (y >> 2);
    const c = ((y & 3) << 6) | z;
    
    result += String.fromCharCode(a);
    if (y !== 64 && buffer[i + 2] !== '=') result += String.fromCharCode(b);
    if (z !== 64 && buffer[i + 3] !== '=') result += String.fromCharCode(c);
  }
  return result;
};

const decodeJwt = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = base64Decode(parts[1]);
    return JSON.parse(decoded);
  } catch (e) {
    try {
      return JSON.parse(decodeURIComponent(escape(base64Decode(parts[1]))));
    } catch (err) {
      return null;
    }
  }
};

export default function LoginPage({navigation}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  useEffect(() => {
    const checkBiometrics = async () => {
      const available = await isBiometricsAvailable();
      const enabled = await isBiometricEnabled();
      setBioAvailable(available);
      setBioEnabled(enabled);

      if (available && enabled) {
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    };
    checkBiometrics();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      const credentials = await authenticateAndGetToken();
      if (credentials && credentials.refreshToken) {
        const freshAccessToken = await performSSORefresh(credentials.refreshToken);
        if (freshAccessToken) {
          try {
            const {registerFCMTokenWithBackend} = require('./NotificationService');
            await registerFCMTokenWithBackend(API_BASE_URL, freshAccessToken);
          } catch (fcmErr) {
            console.log('Error syncing FCM token during biometric login:', fcmErr);
          }

          const config = {
            headers: {
              Authorization: 'Bearer ' + freshAccessToken,
            },
          };
          const axiosLib = require('axios');
          const profileResponse = await axiosLib.get(
            `${API_BASE_URL}/student/profile`,
            config,
          );
          const profileData = profileResponse.data;
          if (profileData && profileData.profileCompleted === false) {
            navigation.replace('CompleteProfile');
          } else {
            navigation.replace('Home');
          }
        } else {
          Alert.alert('Phiên làm việc hết hạn', 'Vui lòng đăng nhập lại bằng mật khẩu.');
        }
      }
    } catch (err) {
      console.log('Biometric login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = (customUsername, customPassword) => {
    const finalUsername = customUsername || username;
    const finalPassword = customPassword || password;

    if (!finalUsername.trim() || !finalPassword.trim()) {
      Alert.alert(
        'Thông báo',
        'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!',
      );
      return;
    }

    console.log('Username:', finalUsername);
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    const urlencoded = new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username: finalUsername,
      password: finalPassword,
    }).toString();

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };

    setIsLoading(true);
    fetch(KEYCLOAK_TOKEN_ENDPOINT, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
        }
        return response.json();
      })
      .then(async data => {
        if (!data.access_token) {
          throw new Error('Missing access token');
        }

        // Verify client-side role first
        const payload = decodeJwt(data.access_token);
        const roles = payload?.realm_access?.roles || [];
        if (!roles.includes('student')) {
          Alert.alert(
            'Từ chối truy cập',
            'Tài khoản của bạn là Giảng viên/Admin. Vui lòng đăng nhập bằng tài khoản Sinh viên!',
          );
          setIsLoading(false);
          return;
        }

        await AsyncStorage.setItem('accessToken', data.access_token);
        if (data.refresh_token) {
          await AsyncStorage.setItem('refreshToken', data.refresh_token);
        }

        const navigateAfterLogin = async token => {
          try {
            const config = {
              headers: {
                Authorization: 'Bearer ' + token,
              },
            };
            const axiosLib = require('axios');
            const profileResponse = await axiosLib.get(
              `${API_BASE_URL}/student/profile`,
              config,
            );
            const profileData = profileResponse.data;
            console.log(
              'Student Profile Completion status:',
              profileData?.profileCompleted,
            );

            if (profileData && profileData.profileCompleted === false) {
              navigation.replace('CompleteProfile');
            } else {
              navigation.replace('Home');
            }
          } catch (err) {
            console.error('Error fetching student profile status:', err);
            if (err.response?.status === 403) {
              Alert.alert(
                'Từ chối truy cập',
                'Tài khoản của bạn không có quyền truy cập ứng dụng Sinh viên!',
              );
            } else {
              navigation.replace('Home');
            }
          }
        };

        // Sync push notifications token with backend
        try {
          const {registerFCMTokenWithBackend} = require('./NotificationService');
          await registerFCMTokenWithBackend(API_BASE_URL, data.access_token);
        } catch (fcmErr) {
          console.log('Error syncing FCM token:', fcmErr);
        }

        // Ask to enable biometrics if supported and not yet enabled
        const available = await isBiometricsAvailable();
        const enabled = await isBiometricEnabled();
        if (available && !enabled) {
          Alert.alert(
            'Kích hoạt Vân tay/FaceID',
            'Bạn có muốn kích hoạt đăng nhập nhanh bằng sinh trắc học cho những lần sau không?',
            [
              {
                text: 'Bỏ qua',
                style: 'cancel',
                onPress: () => navigateAfterLogin(data.access_token),
              },
              {
                text: 'Kích hoạt',
                onPress: async () => {
                  if (data.refresh_token) {
                    await enableBiometricAuth(finalUsername, data.refresh_token);
                  }
                  navigateAfterLogin(data.access_token);
                },
              },
            ],
            {cancelable: false},
          );
          return;
        }

        navigateAfterLogin(data.access_token);
      })
      .catch(error => {
        console.error(error);
        if (error.message !== 'Missing access token' && !error.message.includes('Từ chối')) {
          Alert.alert(
            'Lỗi đăng nhập',
            'Tên đăng nhập hoặc mật khẩu không chính xác.',
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: theme.bg}]} behavior="padding">
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <View style={[styles.logoIconBg, {backgroundColor: theme.bgSecondary}]}>
            <Icon name="graduation-cap" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.logoText, {color: theme.text}]}>BKHN</Text>
          <Text style={[styles.subLogoText, {color: theme.primary}]}>STUDENT PORTAL</Text>
          <Text style={[styles.tagline, {color: theme.textSecondary}]}>Hệ thống thi & điểm danh AI thông minh</Text>
        </View>

        <View style={[styles.formCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
          <Text style={[styles.formTitle, {color: theme.text}]}>Đăng Nhập</Text>
          
          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="user-o" size={18} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Username / Email"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="lock" size={18} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Mật khẩu"
              secureTextEntry={securePassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setSecurePassword(!securePassword)} style={styles.eyeIcon}>
              <Icon name={securePassword ? 'eye-slash' : 'eye'} size={18} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, {backgroundColor: theme.primary}, isLoading && styles.disabledButton]}
            onPress={() => signIn()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>ĐĂNG NHẬP SSO</Text>
            )}
          </TouchableOpacity>

          {bioAvailable && bioEnabled && (
            <TouchableOpacity
              style={[
                styles.biometricButton,
                {borderColor: theme.primary, borderWidth: 1.5, backgroundColor: isDark ? '#0F62FE15' : '#F0F4FA'},
              ]}
              onPress={handleBiometricLogin}
              disabled={isLoading}>
              <Icon name="fingerprint" size={20} color={theme.primary} style={{marginRight: 10}} />
              <Text style={[styles.biometricButtonText, {color: theme.primary}]}>ĐĂNG NHẬP SINH TRẮC HỌC</Text>
            </TouchableOpacity>
          )}

          <View style={styles.forgotRow}>
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={[styles.forgotText, {color: theme.textSecondary}]}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.socialContainer}>
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, {backgroundColor: theme.border}]} />
            <Text style={[styles.dividerText, {color: theme.textSecondary}]}>HOẶC ĐĂNG NHẬP NHANH BẰNG</Text>
            <View style={[styles.dividerLine, {backgroundColor: theme.border}]} />
          </View>

          <View style={styles.socialButtonRow}>
            <TouchableOpacity
              style={[styles.socialButton, styles.googleBtn, {borderColor: theme.border}]}
              onPress={() => signIn('google_student', 'password')}
              disabled={isLoading}
            >
              <Icon name="google" size={18} color="#EA4335" style={styles.socialIcon} />
              <Text style={styles.googleButtonText}>Google</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.socialButton, styles.facebookBtn]}
              onPress={() => signIn('facebook_student', 'password')}
              disabled={isLoading}
            >
              <Icon name="facebook" size={18} color="#FFFFFF" style={styles.socialIcon} />
              <Text style={styles.facebookButtonText}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, {color: theme.textSecondary}]}>Chưa có tài khoản?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.signUpBtn}>
            <Text style={[styles.signUpText, {color: theme.secondary}]}> Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  logoIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  subLogoText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    padding: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F62FE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  forgotRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotBtn: {
    padding: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  socialContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
  socialButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    marginRight: 8,
  },
  googleButtonText: {
    color: '#1E293B',
    fontWeight: '600',
    fontSize: 14,
  },
  facebookBtn: {
    backgroundColor: '#1877F2',
    marginLeft: 8,
  },
  facebookButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  socialIcon: {
    marginRight: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signUpBtn: {
    paddingVertical: 4,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '700',
  },
  biometricButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
