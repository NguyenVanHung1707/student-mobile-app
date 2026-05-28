import React, {useState} from 'react';
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
} from 'react-native';
import {storeData, getData, getThemeColors} from './Utility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  API_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_TOKEN_ENDPOINT,
} from './config';

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

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

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

        // Fetch student profile to verify completed profile status
        try {
          const config = {
            headers: {
              Authorization: 'Bearer ' + data.access_token,
            },
          };
          const axiosLib = require('axios'); // Use standard axios import
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
            // General network error fallback (since role was already validated in JWT)
            navigation.replace('Home');
          }
        }
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
      <View style={styles.logoZone}>
        <Text style={[styles.logoText, {color: theme.text}]}>BKHN</Text>
        <Text style={[styles.subLogoText, {color: theme.primary}]}>Student Portal</Text>
      </View>

      <View style={styles.signInZone}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, {backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border}]}
            placeholder="Your Email / Username"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, {backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border}]}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.socialZone}>
        <Text style={[styles.socialTitle, {color: theme.secondary}]}>Đăng nhập nhanh sinh viên bằng</Text>
        <View style={styles.socialButtonRow}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => signIn('google_student', 'password')}
            disabled={isLoading}>
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.facebookButton}
            onPress={() => signIn('facebook_student', 'password')}
            disabled={isLoading}>
            <Text style={styles.facebookButtonText}>Facebook</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomZone}>
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

        <View style={styles.row2Bot}>
          <TouchableOpacity
            style={styles.signUp}
            onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.signUpText, {color: theme.secondary}]}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.signUpText, {color: theme.textSecondary}]}>Forgot Password</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoZone: {
    flex: 3,
    justifyContent: 'center',
    width: '80%',
    paddingLeft: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -1,
  },
  subLogoText: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'System',
    marginTop: -5,
  },
  signInZone: {
    flex: 2,
    justifyContent: 'center',
    width: '80%',
  },
  textInput: {
    height: 55,
    width: '100%',
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  inputContainer: {
    marginBottom: 12,
  },
  socialZone: {
    flex: 1.5,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  googleButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  googleButtonText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 14,
  },
  facebookButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  facebookButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomZone: {
    flex: 3,
    justifyContent: 'flex-start',
    width: '80%',
    marginTop: 10,
  },
  primaryButton: {
    width: '100%',
    height: 55,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  row2Bot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 5,
  },
  signUp: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPassword: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
