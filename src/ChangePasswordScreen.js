import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import {API_URL} from '@env';
import {getData, getThemeColors} from './Utility';

export default function ChangePasswordScreen({navigation}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ tất cả các trường!');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Xác nhận mật khẩu mới không khớp!');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Thông báo', 'Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = await getData('accessToken');
      const response = await axios.post(
        `${API_URL}/user/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        Alert.alert('Thành công 🎉', 'Đổi mật khẩu thành công!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      console.log('Error changing password:', error);
      const msg = error.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại!';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, {backgroundColor: theme.bg}]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}>
          <View style={[styles.iconContainer, {backgroundColor: theme.primary + '12'}]}>
            <Icon name="lock" size={32} color={theme.primary} />
          </View>

          <Text style={[styles.title, {color: theme.text}]}>ĐỔI MẬT KHẨU</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            Nhập mật khẩu cũ và mật khẩu mới của bạn để cập nhật trên hệ thống bảo mật Keycloak SSO.
          </Text>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.textSecondary}]}>MẬT KHẨU HIỆN TẠI</Text>
            <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
              <Icon name="key" size={14} color={theme.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, {color: theme.inputText}]}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                <Icon name={showCurrent ? 'eye-slash' : 'eye'} size={16} color={theme.placeholder} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.textSecondary}]}>MẬT KHẨU MỚI</Text>
            <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
              <Icon name="lock" size={14} color={theme.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, {color: theme.inputText}]}
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Icon name={showNew ? 'eye-slash' : 'eye'} size={16} color={theme.placeholder} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: theme.textSecondary}]}>XÁC NHẬN MẬT KHẨU MỚI</Text>
            <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
              <Icon name="lock" size={14} color={theme.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, {color: theme.inputText}]}
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Icon name={showConfirm ? 'eye-slash' : 'eye'} size={16} color={theme.placeholder} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, {backgroundColor: theme.primary}, isLoading && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>CẬP NHẬT MẬT KHẨU</Text>
                <Icon name="check" size={14} color="#FFF" style={styles.buttonIcon} />
              </>
            )}
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 14,
    marginTop: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
