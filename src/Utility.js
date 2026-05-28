import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';

export const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // saving error
    console.error('Error storing data:', e);
  }
};

export const getData = async key => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      // value previously stored
      return value;
    }
  } catch (e) {
    // error reading value
    console.error('Error reading data:', e);
  }
};

export const convertTime = isoDate => {
  // Đặt múi giờ
  const timezone = 'Asia/Ho_Chi_Minh'; // Múi giờ +07:00
  // Chuyển đổi định dạng
  const formattedDate = moment(isoDate)
    .tz(timezone)
    .format('YYYY-MM-DDTHH:mm:ssZ');
  return formattedDate;
};

export const formatToView = dateString => {
  return moment(dateString).format('HH:mm DD/MM/YYYY');
};

export const formatToDate = dateString => {
  return moment(dateString).format('DD/MM/YYYY');
};

export const stringToDate = dateString => {
  // Phân tích chuỗi để lấy ra ngày, tháng, năm
  const parts = dateString.split('/');
  const day = parseInt(parts[0], 10); // Lấy ngày
  const month = parseInt(parts[1], 10) - 1; // Lấy tháng (chú ý: tháng trong JavaScript là từ 0 đến 11)
  const year = parseInt(parts[2], 10); // Lấy năm

  // Tạo đối tượng Date từ ngày, tháng, năm
  return new Date(year, month, day);
};

export const stringToTime = timeString => {
  // Tạo một đối tượng Date với thời gian từ chuỗi
  const parts = timeString.split(':'); // Phân tách giờ và phút từ chuỗi
  const hours = parseInt(parts[0], 10); // Lấy giờ
  const minutes = parseInt(parts[1], 10); // Lấy phút

  const dateObject = new Date(); // Tạo một đối tượng Date
  dateObject.setHours(hours); // Đặt giờ
  dateObject.setMinutes(minutes); // Đặt phút

  return dateObject;
};

export const getThemeColors = isDark => {
  return {
    bg: isDark ? '#0A0E17' : '#F4F6F9',
    bgSecondary: isDark ? '#121824' : '#EAEFF5',
    card: isDark ? '#161D2A' : '#FFFFFF',
    text: isDark ? '#E2E8F0' : '#1E293B',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textWhite: '#FFFFFF',
    primary: '#0F62FE',
    secondary: '#8A3FFC',
    accent: '#00BAB6',
    border: isDark ? '#222E45' : '#DFE5EE',
    inputBg: isDark ? '#0E1420' : '#FFFFFF',
    inputText: isDark ? '#F8FAFC' : '#0F172A',
    placeholder: isDark ? '#475569' : '#94A3B8',
  };
};
