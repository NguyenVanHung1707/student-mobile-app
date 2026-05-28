import React, {useEffect, useState} from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
  useColorScheme,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
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
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);

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
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    //check null
    if (!username || !email || !firstName || !lastName || !msgv || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ các trường thông tin');
      return;
    }

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append(
      'Authorization',
      'Bearer ' + (await getData('anonymousToken')),
    );

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
          Alert.alert(
            'Lỗi đăng ký',
            'Tài khoản đăng ký thất bại do email hoặc tên đăng nhập đã tồn tại',
          );
          return;
        }
        //ask user to do you want to login now
        Alert.alert('Đăng ký thành công', 'Bạn có muốn đăng nhập ngay bây giờ?', [
          {
            text: 'Không',
            onPress: () => console.log('No Pressed'),
            style: 'cancel',
          },
          {text: 'Có', onPress: () => navigation.navigate('Login')},
        ]);
      })
      .catch(error => console.error(error));
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: theme.bg}]} behavior="padding">
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={[styles.logoText, {color: theme.text}]}>Đăng Ký</Text>
          <Text style={[styles.tagline, {color: theme.textSecondary}]}>Tạo tài khoản Sinh viên của bạn</Text>
        </View>

        <View style={[styles.formCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
          
          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="user-o" size={16} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Tên đăng nhập"
              placeholderTextColor={theme.placeholder}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="envelope-o" size={16} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Email"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.nameRow}>
            <View style={[styles.inputWrapper, styles.halfInput, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
              <TextInput
                style={[styles.textInput, {color: theme.inputText}]}
                placeholder="Họ"
                placeholderTextColor={theme.placeholder}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <View style={[styles.inputWrapper, styles.halfInput, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
              <TextInput
                style={[styles.textInput, {color: theme.inputText}]}
                placeholder="Tên"
                placeholderTextColor={theme.placeholder}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
          </View>

          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="id-card-o" size={16} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Mã số sinh viên (MSSV)"
              placeholderTextColor={theme.placeholder}
              value={msgv}
              onChangeText={setMsgv}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="lock" size={18} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Mật khẩu"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={securePassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setSecurePassword(!securePassword)} style={styles.eyeIcon}>
              <Icon name={securePassword ? 'eye-slash' : 'eye'} size={16} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
            <Icon name="lock" size={18} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, {color: theme.inputText}]}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={secureConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setSecureConfirmPassword(!secureConfirmPassword)} style={styles.eyeIcon}>
              <Icon name={secureConfirmPassword ? 'eye-slash' : 'eye'} size={16} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.signUpButton, {backgroundColor: theme.primary}]} onPress={signUp}>
            <Text style={styles.signUpButtonText}>Đăng Ký</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.loginButton, {borderColor: theme.secondary}]} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginButtonText, {color: theme.secondary}]}>Quay lại Đăng nhập</Text>
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
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
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
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfInput: {
    width: '48%',
  },
  signUpButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F62FE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  signUpButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
