import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_BASE_URL} from './config';
import {getData, formatToDate, getThemeColors} from './Utility';

const ProfileScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = await getData('accessToken');
      if (!token) {
        setError('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại!');
        setIsLoading(false);
        return;
      }

      const config = {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      };
      const response = await axios.get(
        `${API_BASE_URL}/student/profile`,
        config,
      );
      setProfile(response.data);
    } catch (err) {
      console.error('Error fetching student profile:', err);
      setError(err.message || 'Lỗi khi tải thông tin sinh viên.');
      Alert.alert('Lỗi', 'Không thể tải thông tin hồ sơ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
      {text: 'Hủy', style: 'cancel'},
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('accessToken');
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (e) {
            console.error('Error logging out:', e);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, {color: colors.primary}]}>Đang tải thông tin hồ sơ...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.center, {backgroundColor: colors.bg}]}>
        <Text style={[styles.errorText, {color: '#ef4444'}]}>{error || 'Đã có lỗi xảy ra!'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, {backgroundColor: colors.bg}]}>
      {/* Dynamic cover block */}
      <View style={[styles.coverImage, {backgroundColor: colors.primary}]} />
      
      <View style={styles.avatarContainer}>
        <View style={[styles.avatarPlaceholder, {backgroundColor: colors.secondary, borderColor: colors.card}]}>
          <Text style={styles.avatarText}>
            {profile.name?.charAt(0)?.toUpperCase() || 'SV'}
          </Text>
        </View>
        <Text style={[styles.name, {color: colors.text}]}>
          {profile.name}
        </Text>
        <Text style={[styles.codeSubtitle, {color: colors.textSecondary}]}>
          MSSV: {profile.studentCode}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={[styles.infoCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <View style={[styles.infoContainer, {borderBottomColor: colors.border}]}>
            <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Địa chỉ Email:</Text>
            <Text style={[styles.infoValue, {color: colors.text}]}>{profile.email || 'Chưa cập nhật'}</Text>
          </View>
          <View style={[styles.infoContainer, {borderBottomColor: colors.border}]}>
            <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Trạng thái Hồ sơ:</Text>
            <Text style={[
              styles.infoValue, 
              styles.statusText,
              profile.profileCompleted ? styles.statusActive : styles.statusPending
            ]}>
              {profile.profileCompleted ? 'Đã hoàn thiện' : 'Chưa hoàn thiện'}
            </Text>
          </View>
          <View style={[styles.infoContainer, {borderBottomColor: colors.border, paddingBottom: 12}]}>
            <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Ngày tham gia hệ thống:</Text>
            <Text style={[styles.infoValue, {color: colors.text}]}>
              {profile.createdAt ? formatToDate(profile.createdAt) : 'Không có dữ liệu'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.changePasswordBtn, {backgroundColor: colors.primary}]}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Icon name="key" size={14} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.changePasswordBtnText}>ĐỔI MẬT KHẨU TÀI KHOẢN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, {borderColor: colors.border}]}
            onPress={handleLogout}
          >
            <Icon name="sign-out" size={14} color="#EF4444" style={styles.btnIcon} />
            <Text style={styles.logoutBtnText}>ĐĂNG XUẤT TÀI KHOẢN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontWeight: '600',
  },
  errorText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  coverImage: {
    height: 140,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -55,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  codeSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  content: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  infoContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusActive: {
    color: '#10b981',
  },
  statusPending: {
    color: '#f59e0b',
  },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
    borderWidth: 1.5,
  },
  btnIcon: {
    marginRight: 2,
  },
  changePasswordBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;
