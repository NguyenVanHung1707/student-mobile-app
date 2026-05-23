import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View, Text, KeyboardAvoidingView, StyleSheet, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import axios from 'axios';
import { getData, storeData, getThemeColors } from './Utility';

export default function CompleteProfile({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim() || !studentCode.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ họ tên và mã số sinh viên!');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getData('accessToken');
      let data = JSON.stringify({
        "studentCode": studentCode.trim(),
        "name": fullName.trim()
      });

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${API_URL}/student/complete-profile`,
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`
        },
        data : data
      };

      const response = await axios.request(config);
      if (response.status === 200) {
        Alert.alert('Thành công', 'Hồ sơ sinh viên đã được cập nhật thành công!');
        navigation.replace('Home');
      } else {
        Alert.alert('Thất bại', 'Không thể cập nhật hồ sơ, vui lòng kiểm tra lại!');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra trong quá trình hoàn thiện hồ sơ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      navigation.replace('Login');
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.bg }]} behavior="padding">
      <View style={styles.logoZone}>
        <Text style={styles.logoText}>Hoàn thiện</Text>
        <Text style={[styles.subLogoText, { color: isDark ? '#F472B6' : '#8A4C7D' }]}>Hồ sơ sinh viên</Text>
        <Text style={styles.description}>
          Tài khoản của bạn thiếu một số thông tin bắt buộc. Vui lòng bổ sung để tiếp tục sử dụng dịch vụ.
        </Text>
      </View>

      <View style={styles.formZone}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
            placeholder="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor={theme.placeholder}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
            placeholder="Mã số sinh viên (MSSV)"
            value={studentCode}
            onChangeText={setStudentCode}
            placeholderTextColor={theme.placeholder}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.bottomZone}>
        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: theme.primary }, isLoading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>XÁC NHẬN CẬP NHẬT</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={[styles.logoutButtonText, { color: isDark ? '#F472B6' : '#8A4C7D' }]}>Đăng xuất</Text>
        </TouchableOpacity>
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
    flex: 4,
    justifyContent: "center",
    width: '80%',
    paddingLeft: 10,
    marginTop: 40,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "bold",
    fontFamily: "Futura Hv Bt",
  },
  subLogoText: {
    color: "#8A4C7D",
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: "Futura Hv Bt",
    marginTop: -5,
  },
  description: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  formZone: {
    flex: 3,
    justifyContent: "center",
    width: '80%',
  },
  textInput: {
    height: 55,
    width: '100%',
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderColor: '#eee',
    borderWidth: 1,
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  bottomZone: {
    flex: 3,
    justifyContent: "flex-start",
    width: '80%',
    marginTop: 20,
  },
  submitButton: {
    width: '100%',
    height: 55,
    borderRadius: 15,
    backgroundColor: '#8A4C7D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoutButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#8A4C7D',
    fontSize: 16,
    fontWeight: "bold",
  },
});
