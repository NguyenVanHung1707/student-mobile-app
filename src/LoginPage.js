import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View, Text, KeyboardAvoidingView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { storeData, getData } from './Utility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HOST, API_URL } from '@env'; 
import axios from 'axios';

export default function LoginPage({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const signIn = (customUsername, customPassword) => {
    const finalUsername = customUsername || username;
    const finalPassword = customPassword || password;

    if (!finalUsername.trim() || !finalPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    console.log('Username:', finalUsername);
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const client_id = "graduation_thesis_ver2";
    const client_secret = "Tj5zNU17UX9Ak1d4lLulx9VcXSSdHJwC";
    const urlencoded = `grant_type=password&client_id=${client_id}&client_secret=${client_secret}&username=${finalUsername}&password=${finalPassword}`;
    
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow"
    };

    const tokenUrl = HOST.includes('thuvienso.io.vn')
      ? `${HOST}/realms/hung2004/protocol/openid-connect/token`
      : `${HOST}:9000/realms/hung2004/protocol/openid-connect/token`;

    setIsLoading(true);
    fetch(tokenUrl, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
        }
        return response.json();
      })
      .then(async (data) => {
        if (!data.access_token) {
          throw new Error('Missing access token');
        }
        
        await AsyncStorage.setItem('accessToken', data.access_token);
        
        // Fetch student profile to verify completed profile status
        try {
          const config = {
            headers: {
              'Authorization': 'Bearer ' + data.access_token
            }
          };
          const profileResponse = await axios.get(`${API_URL}/student/profile`, config);
          const profileData = profileResponse.data;
          console.log('Student Profile Completion status:', profileData?.profileCompleted);
          
          if (profileData && profileData.profileCompleted === false) {
            navigation.replace('CompleteProfile');
          } else {
            navigation.replace('Home');
          }
        } catch (err) {
          console.error('Error fetching student profile status:', err);
          // Fallback to home if check fails
          navigation.replace('Home');
        }
      })
      .catch((error) => {
        console.error(error);
        Alert.alert('Lỗi đăng nhập', 'Tên đăng nhập hoặc mật khẩu không chính xác.');
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
            disabled={isLoading}
          >
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.facebookButton} 
            onPress={() => signIn('facebook_student', 'password')}
            disabled={isLoading}
          >
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
            <TouchableOpacity style={styles.arrowButton} onPress={() => signIn()} disabled={isLoading}>
              <Text style={styles.arrowText}>&rarr;</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.row2Bot}>
          <TouchableOpacity style={styles.signUp} onPress={() => navigation.navigate('SignUp')}>
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
    backgroundColor: "#FEABAE",
    alignItems: "center",
    justifyContent: "center",
  },
  logoZone: {
    flex: 250,
    justifyContent: "center",
    width: '80%',
    paddingLeft: 10,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 50,
    fontWeight: "bold",
    fontFamily: "Futura Hv Bt",
  },
  signInZone: {
    flex: 150,
    justifyContent: "center",
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 1 },
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
    justifyContent: "center",
    width: '80%',
  },
  row1Bot: {
    flex: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
  },
  row2Bot: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
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
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Futura Hv Bt",
  },
});
