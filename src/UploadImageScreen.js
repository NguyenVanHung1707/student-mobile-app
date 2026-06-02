import React, {useEffect, useState} from 'react';
import {
  View,
  Image,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import {getData, getThemeColors} from './Utility';

const UploadImageScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const convertBlobToBase64 = blob => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getImage = async () => {
    try {
      const token = await getData('accessToken');
      if (!token) return null;

      const myHeaders = new Headers();
      myHeaders.append('Authorization', 'Bearer ' + token);

      const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      };

      const response = await fetch(
        `${API_URL}/student/get-my-image`,
        requestOptions,
      );
      setApiStatus(response.status);

      if (response.status === 200) {
        const blob = await response.blob();
        const base64Data = await convertBlobToBase64(blob);
        return `data:image/jpeg;base64,${base64Data}`;
      }
      return null;
    } catch (error) {
      console.error('Error fetching image: ', error);
      setApiStatus(404); // Prevent loading hang on network errors or connection failures
      return null;
    }
  };

  const loadImage = async () => {
    setLoading(true);
    const uri = await getImage();
    setImageUri(uri);
    setLoading(false);
  };

  useEffect(() => {
    loadImage();
  }, []);

  const handleChoosePhoto = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.error('Image Picker Error: ', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setSelectedImage(asset);
      }
    });
  };

  const handleTakePhoto = () => {
    launchCamera({mediaType: 'photo', quality: 0.8}, response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.error('Camera Error: ', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setSelectedImage(asset);
      }
    });
  };

  const handleUploadPhoto = async () => {
    if (!selectedImage) {
      Alert.alert(
        'Chưa chọn ảnh',
        'Vui lòng chụp hoặc chọn 1 ảnh chân dung nhìn thẳng.',
      );
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: selectedImage.uri,
      name: selectedImage.fileName || `front_face.jpg`,
      type: selectedImage.type || 'image/jpeg',
    });

    try {
      const myHeaders = new Headers();
      myHeaders.append(
        'Authorization',
        'Bearer ' + (await getData('accessToken')),
      );

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: formData,
        redirect: 'follow',
      };

      const response = await fetch(
        `${API_URL}/student/upload-my-image`,
        requestOptions,
      );
      if (response.status === 413) {
        Alert.alert(
          'Thất bại',
          'Dung lượng ảnh quá lớn. Vui lòng tải lại ảnh nhỏ hơn (<10MB).',
        );
        setLoading(false);
        return;
      }
      Alert.alert(
        'Thành công',
        'Hồ sơ nhận dạng Face ID của bạn đã được đăng ký thành công!',
      );

      setSelectedImage(null);
      loadImage();
    } catch (error) {
      console.error('Error uploading photo: ', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên.');
    } finally {
      setLoading(false);
    }
  };

  const renderGuidedCard = () => {
    return (
      <View style={styles.guidedCard}>
        <Text style={[styles.title, {color: colors.text}]}>
          ĐĂNG KÝ FACE ID
        </Text>
        <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
          Cung cấp 1 ảnh chân dung chụp trực diện, rõ khuôn mặt để nhận dạng điểm danh.
        </Text>

        <View style={[styles.cameraBox, {borderColor: colors.primary}]}>
          {selectedImage ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{uri: selectedImage.uri}}
                style={styles.cameraPreview}
              />
              <View style={styles.overlayCircularFrame} />
            </View>
          ) : (
            <View
              style={[
                styles.cameraMock,
                {backgroundColor: colors.bgSecondary},
              ]}>
              <Icon name="camera" size={50} color={colors.textSecondary} />
              <Text
                style={[styles.cameraMockText, {color: colors.textSecondary}]}>
                Chưa có ảnh được chọn
              </Text>
              <View
                style={[
                  styles.overlayCircularFrameMock,
                  {borderColor: colors.border},
                ]}
              />
            </View>
          )}
        </View>

        <View
          style={[
            styles.instructionBox,
            {backgroundColor: colors.bgSecondary},
          ]}>
          <Icon
            name="align-center"
            size={16}
            color={colors.primary}
            style={{marginRight: 8}}
          />
          <Text style={[styles.instructionText, {color: colors.text}]}>
            Hãy nhìn THẲNG vào tâm vòng tròn để chụp ảnh
          </Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {backgroundColor: colors.card, borderColor: colors.border},
            ]}
            onPress={handleChoosePhoto}>
            <Icon name="photo" size={14} color={colors.text} />
            <Text style={[styles.actionBtnText, {color: colors.text}]}>
              Thư viện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, {backgroundColor: colors.primary}]}
            onPress={handleTakePhoto}>
            <Icon name="camera" size={14} color="#FFF" />
            <Text style={[styles.actionBtnText, {color: '#FFF'}]}>
              Chụp ảnh
            </Text>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <TouchableOpacity
            style={[styles.uploadBtn, {backgroundColor: '#2ECC71'}]}
            onPress={handleUploadPhoto}>
            <Text style={styles.uploadBtnText}>ĐĂNG KÝ FACE ID</Text>
            <Icon name="check-circle" size={14} color="#FFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderProfileView = () => {
    if (imageUri) {
      return (
        <View
          style={[
            styles.imageContainer,
            {backgroundColor: colors.card, borderColor: colors.border},
          ]}>
          <Image source={{uri: imageUri}} style={styles.image} />
          <View style={styles.statusBadge}>
            <Icon name="check-circle" size={14} color="#2ECC71" />
            <Text style={styles.statusBadgeText}>
              Hệ thống đã nhận diện Face ID
            </Text>
          </View>
          <Text style={[styles.infoText, {color: colors.textSecondary}]}>
            Hồ sơ sinh trắc học đã được xác thực an toàn. Bạn không thể tự thay
            đổi ảnh hồ sơ.
          </Text>
        </View>
      );
    }

    return (
      <View style={{alignItems: 'center'}}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{color: colors.textSecondary, marginTop: 10}}>
          Đang tải trạng thái nhận dạng...
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.statusText, {color: colors.textSecondary}]}>
          Đang kết nối máy chủ Face ID...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      {apiStatus === 204 || apiStatus === 404 || selectedImage
        ? renderGuidedCard()
        : renderProfileView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  guidedCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
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
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  cameraBox: {
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#8A4C7D',
    marginBottom: 20,
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  overlayCircularFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraMock: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraMockText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
  },
  overlayCircularFrameMock: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderRadius: 120,
    opacity: 0.3,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    minWidth: 120,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    maxWidth: 260,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  imageContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    maxWidth: 320,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F8F5',
    borderWidth: 1,
    borderColor: '#A3E4D7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16A085',
  },
  infoText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 12,
  },
});

export default UploadImageScreen;
