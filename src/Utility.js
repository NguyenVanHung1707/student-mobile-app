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
    bg: isDark ? '#0B0F19' : '#FAFAFA',
    bgSecondary: isDark ? '#161B26' : '#F4F4F5',
    card: isDark ? '#121824' : '#FFFFFF',
    text: isDark ? '#E5E7EB' : '#1F2937',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    textWhite: '#FFFFFF',
    primary: '#2563EB',
    secondary: '#7C3AED',
    border: isDark ? '#1E293B' : '#E4E4E7',
    inputBg: isDark ? '#0F172A' : '#FFFFFF',
    inputText: isDark ? '#F9FAFB' : '#1F2937',
    placeholder: isDark ? '#4B5563' : '#9CA3AF',
  };
};
