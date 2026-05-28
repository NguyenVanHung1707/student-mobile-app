import React, {useEffect, useState} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import {getData, storeData, getThemeColors} from './Utility';
import {
  API_BASE_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_TOKEN_ENDPOINT,
} from './config';

export default function SignUpPage({navigation}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [msgv, setMsgv] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  useEffect(() => {
    //get anonymous token
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    const urlencoded = new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username: 'anonymous',
      password: 'anonymous',
    }).toString();

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };

    fetch(KEYCLOAK_TOKEN_ENDPOINT, requestOptions)
      .then(response => response.json())
      .then(async result => {
        await storeData('anonymousToken', result.access_token);
      })
      .catch(error => console.error('Error:', error));
  }, []);

  const signUp = async () => {
    if (password !== confirmPassword) {
      console.error('Passwords do not match');
      return;
    }
    //check null
    if (!username || !email || !firstName || !lastName || !msgv || !password) {
      console.error('Please fill in all fields');
      return;
    }

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append(
      'Authorization',
      'Bearer ' + (await getData('anonymousToken')),
    );
    console.log(myHeaders);

    const raw = JSON.stringify({
      username: username,
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: password,
      studentCode: msgv,
    });

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    fetch(`${API_BASE_URL}/anonymous/sign-up-student`, requestOptions)
      .then(response => {
        response.text();
        console.log(response.status);
        if (response.status === 500) {
          console.error(
            'Sign up failed because email or username already exists',
          );
          Alert.alert(
            'Sign up failed because email or username already exists',
          );
          return;
        }
        //ask user to do you want to login now
        Alert.alert('Sign up successful', 'Do you want to login now?', [
          {
            text: 'No',
            onPress: () => console.log('No Pressed'),
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => navigation.navigate('Login')},
        ]);
      })
      .then(result => console.log(result))
      .catch(error => console.error(error));
    console.log('Sign up successful');
  };

  const goToLoginPage = () => {
    navigation.navigate('Login');
  };

  const textInputStyle = [
    styles.textInput,
    {
      backgroundColor: theme.inputBg,
      color: theme.inputText,
      borderColor: theme.border,
    }
  ];

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}>
      <View style={styles.logoZone}>
        <Text style={[styles.logoText, {color: theme.text}]}>Sign Up</Text>
      </View>
      <View style={styles.signUpZone}>
        <TextInput
          style={textInputStyle}
          placeholder="Tên đăng nhập"
          placeholderTextColor={theme.placeholder}
          onChangeText={val => setUsername(val)}
        />
        <TextInput
          style={textInputStyle}
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
          onChangeText={val => setEmail(val)}
        />

        <View style={styles.nameContainer}>
          <TextInput
            style={[textInputStyle, styles.nameInput]}
            placeholder="Họ"
            placeholderTextColor={theme.placeholder}
            onChangeText={val => setLastName(val)}
          />
          <TextInput
            style={[textInputStyle, styles.nameInput]}
            placeholder="Tên"
            placeholderTextColor={theme.placeholder}
            onChangeText={val => setFirstName(val)}
          />
        </View>

        <TextInput
          style={textInputStyle}
          placeholder="MSSV"
          placeholderTextColor={theme.placeholder}
          onChangeText={val => setMsgv(val)}
        />
        <TextInput
          style={textInputStyle}
          placeholder="Password"
          placeholderTextColor={theme.placeholder}
          secureTextEntry={true}
          onChangeText={val => setPassword(val)}
        />
        <TextInput
          style={textInputStyle}
          placeholder="Confirm Password"
          placeholderTextColor={theme.placeholder}
          secureTextEntry={true}
          onChangeText={val => setConfirmPassword(val)}
        />

        <TouchableOpacity style={[styles.signUpButton, {backgroundColor: theme.primary}]} onPress={signUp}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.loginButton, {borderColor: theme.secondary}]} onPress={goToLoginPage}>
          <Text style={[styles.loginButtonText, {color: theme.secondary}]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -1,
  },
  signUpZone: {
    flex: 4,
    justifyContent: 'center',
    width: '80%',
    marginBottom: 40,
  },
  textInput: {
    height: 52,
    width: '100%',
    paddingHorizontal: 15,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  nameInput: {
    width: '48%',
  },
  signUpButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
