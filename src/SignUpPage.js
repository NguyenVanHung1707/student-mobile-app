import React, {useEffect, useState} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import {getData, storeData} from './Utility';
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

  return (
    <View style={styles.container}>
      <View style={styles.logoZone}>
        <Text style={styles.logoText}>Sign Up</Text>
      </View>
      <View style={styles.signUpZone}>
        <TextInput
          style={styles.textInput}
          placeholder="Tên đăng nhập"
          onChangeText={val => setUsername(val)}
        />
        <TextInput
          style={styles.textInput}
          placeholder="Email"
          onChangeText={val => setEmail(val)}
        />

        <View style={styles.nameContainer}>
          <TextInput
            style={[styles.textInput, styles.nameInput]}
            placeholder="Họ"
            onChangeText={val => setLastName(val)}
          />
          <TextInput
            style={[styles.textInput, styles.nameInput]}
            placeholder="Tên"
            onChangeText={val => setFirstName(val)}
          />
        </View>

        <TextInput
          style={styles.textInput}
          placeholder="MSSV"
          onChangeText={val => setMsgv(val)}
        />
        <TextInput
          style={styles.textInput}
          placeholder="Password"
          secureTextEntry={true}
          onChangeText={val => setPassword(val)}
        />
        <TextInput
          style={styles.textInput}
          placeholder="Confirm Password"
          secureTextEntry={true}
          onChangeText={val => setConfirmPassword(val)}
        />

        <TouchableOpacity style={styles.signUpButton} onPress={signUp}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={goToLoginPage}>
          <Text style={styles.loginButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: 'bold',
  },
  signUpZone: {
    flex: 4,
    justifyContent: 'center',
    width: '80%',
  },
  textInput: {
    height: 60,
    width: '100%',
    padding: 10,
    marginVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
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
    marginTop: 20,
    padding: 15,
    borderRadius: 20,
    backgroundColor: '#8A4C7D',
    alignItems: 'center',
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 20,
    backgroundColor: '#4C8A7D',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
