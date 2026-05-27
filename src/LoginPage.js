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
} from 'react-native';
import {storeData, getData} from './Utility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'react-native-axios'; // Note: uses standard axios
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
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.logoZone}>
        <Text style={styles.logoText}>Welcome</Text>
      </View>

      <View style={styles.signInZone}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Your Email / Username"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor="#C7C7CD"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#C7C7CD"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.socialZone}>
        <Text style={styles.socialTitle}>Đăng nhập nhanh sinh viên bằng</Text>
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
        <View style={styles.row1Bot}>
          <View style={styles.nothing}>
            {isLoading && <ActivityIndicator size="large" color="#8A4C7D" />}
          </View>
          <View style={styles.signInButtonView}>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => signIn()}
              disabled={isLoading}>
              <Text style={styles.arrowText}>&rarr;</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.row2Bot}>
          <TouchableOpacity
            style={styles.signUp}
            onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nothing1}></TouchableOpacity>
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.signUpText}>Forgot Password</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEABAE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoZone: {
    flex: 250,
    justifyContent: 'center',
    width: '80%',
    paddingLeft: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: 'bold',
    fontFamily: 'Futura Hv Bt',
  },
  signInZone: {
    flex: 150,
    justifyContent: 'center',
    width: '80%',
    paddingHorizontal: 10,
  },
  textInput: {
    height: 55,
    width: '100%',
    padding: 10,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    fontSize: 15,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 12,
  },
  socialZone: {
    flex: 120,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  socialTitle: {
    color: '#8A4C7D',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
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
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: 14,
  },
  facebookButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  facebookButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomZone: {
    flex: 250,
    justifyContent: 'center',
    width: '80%',
  },
  row1Bot: {
    flex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row2Bot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  nothing: {
    flex: 239,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  signInButtonView: {
    flex: 64,
    borderRadius: 20,
    marginRight: 10,
  },
  arrowButton: {
    width: 64,
    height: 64,
    borderRadius: 64,
    backgroundColor: '#8A4C7D',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  arrowText: {
    fontSize: 40,
    color: '#fff',
    position: 'absolute',
    top: -2,
    left: 12,
  },
  signUp: {
    flex: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nothing1: {
    flex: 75,
  },
  forgotPassword: {
    flex: 151,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Futura Hv Bt',
  },
});
