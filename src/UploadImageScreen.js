import React, { useEffect, useState } from 'react';
import { 
  View, 
  Image, 
  Alert, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  useColorScheme 
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { API_URL } from '@env'; 
import { getData, getThemeColors } from './Utility'; 

const UploadImageScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Guided Face ID Steps (1: Center, 2: Left, 3: Right)
  const [faceStep, setFaceStep] = useState(1);
  const [stepImages, setStepImages] = useState({ 1: null, 2: null, 3: null });

  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]); 
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getImage = async () => {
    try {
      const token = await getData("accessToken");
      if (!token) return null;

      const myHeaders = new Headers();
      myHeaders.append("Authorization", "Bearer " + token); 

      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      const response = await fetch(`${API_URL}/student/get-my-image`, requestOptions);
      setApiStatus(response.status); 

      if (response.status === 200) {
        const blob = await response.blob();
        const base64Data = await convertBlobToBase64(blob);
        return `data:image/jpeg;base64,${base64Data}`;
      }
      return null;
    } catch (error) {
      console.error("Error fetching image: ", error);
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
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.error('Image Picker Error: ', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setStepImages(prev => ({ ...prev, [faceStep]: asset }));
        setSelectedImage(asset);
      }
    });
  };

  const handleTakePhoto = () => {
    launchCamera({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.error('Camera Error: ', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setStepImages(prev => ({ ...prev, [faceStep]: asset }));
        setSelectedImage(asset);
      }
    });
  };

  const handleNextStep = () => {
    if (faceStep < 3) {
      setFaceStep(prev => prev + 1);
      setSelectedImage(stepImages[faceStep + 1] || null);
    }
  };

  const handlePrevStep = () => {
    if (faceStep > 1) {
      setFaceStep(prev => prev - 1);
      setSelectedImage(stepImages[faceStep - 1]);
    }
  };

  const handleUploadPhoto = async () => {
    if (!stepImages[1] || !stepImages[2] || !stepImages[3]) {
      Alert.alert('Chưa hoàn thành', 'Vui lòng chụp đầy đủ 3 góc khuôn mặt trước khi tải lên.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: stepImages[1].uri,
      name: stepImages[1].fileName || `front_face.jpg`,
      type: stepImages[1].type || 'image/jpeg',
    });

    try {
      const myHeaders = new Headers();
      myHeaders.append('Authorization', 'Bearer ' + await getData('accessToken'));

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: formData,
        redirect: 'follow',
      };

      const response = await fetch(`${API_URL}/student/upload-my-image`, requestOptions);
      if (response.status === 413) {
        Alert.alert('Thất bại', 'Dung lượng ảnh quá lớn. Vui lòng tải lại ảnh nhỏ hơn (<10MB).');
        setLoading(false);
        return;
      }
      Alert.alert('Thành công', 'Hồ sơ nhận dạng Face ID của bạn đã được đăng ký thành công!');
      
      setStepImages({ 1: null, 2: null, 3: null });
      setSelectedImage(null);
      setFaceStep(1);
      loadImage(); 
    } catch (error) {
      console.error('Error uploading photo: ', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên.');
    } finally {
      setLoading(false);
    }
  };

  const getStepInstruction = () => {
    switch (faceStep) {
      case 1: return { text: 'Hãy nhìn THẲNG vào tâm vòng tròn', icon: 'align-center', color: '#3498DB', dir: 'Nhìn thẳng •' };
      case 2: return { text: 'Hãy nghiêng mặt nhẹ sang TRÁI', icon: 'arrow-left', color: '#F39C12', dir: '← Xoay Trái' };
      case 3: return { text: 'Hãy nghiêng mặt nhẹ sang PHẢI', icon: 'arrow-right', color: '#9B59B6', dir: 'Xoay Phải →' };
      default: return { text: 'Nhìn thẳng', icon: 'user', color: '#333', dir: 'Nhìn thẳng' };
    }
  };

  const instruction = getStepInstruction();

  const getDotStyle = (step) => {
    const list = [styles.dot];
    if (faceStep === step) {
      list.push(styles.activeDot);
    } else if (stepImages[step]) {
      list.push(styles.completedDot);
    }
    return list;
  };

  const renderGuidedCard = () => {
    return (
      <View style={styles.guidedCard}>
        <View style={styles.dotsRow}>
          <TouchableOpacity 
            onPress={() => {
              setFaceStep(1);
              setSelectedImage(stepImages[1]);
            }}
            style={getDotStyle(1)}
          />
          <TouchableOpacity 
            onPress={() => {
              setFaceStep(2);
              setSelectedImage(stepImages[2]);
            }}
            style={getDotStyle(2)}
          />
          <TouchableOpacity 
            onPress={() => {
              setFaceStep(3);
              setSelectedImage(stepImages[3]);
            }}
            style={getDotStyle(3)}
          />
        </View>

        <View style={styles.cameraBox}>
          {selectedImage ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.cameraPreview}
              />
              <View style={styles.overlayCircularFrame}>
                <View style={[styles.indicatorArrow, { backgroundColor: instruction.color }]}>
                  <Text style={styles.indicatorText}>{instruction.dir}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.cameraMock, { backgroundColor: colors.bgSecondary }]}>
              <Icon name="camera" size={50} color={colors.textSecondary} />
              <Text style={[styles.cameraMockText, { color: colors.textSecondary }]}>
                Chưa có ảnh góc này
              </Text>
              <View style={[styles.overlayCircularFrameMock, { borderColor: colors.border }]} />
            </View>
          )}
        </View>

        <View style={[styles.instructionBox, { backgroundColor: colors.bgSecondary }]}>
          <Icon name={instruction.icon} size={16} color={instruction.color} style={{ marginRight: 8 }} />
          <Text style={[styles.instructionText, { color: colors.text }]}>{instruction.text}</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={handleChoosePhoto}
          >
            <Icon name="photo" size={14} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Thư viện</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary }]} 
            onPress={handleTakePhoto}
          >
            <Icon name="camera" size={14} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Chụp ảnh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity 
            disabled={faceStep === 1}
            style={[styles.navBtn, faceStep === 1 && styles.disabledBtn]} 
            onPress={handlePrevStep}
          >
            <Icon name="chevron-left" size={12} color="#FFF" />
            <Text style={styles.navBtnText}>Trước</Text>
          </TouchableOpacity>

          {faceStep < 3 ? (
            <TouchableOpacity 
              disabled={!stepImages[faceStep]}
              style={[styles.navBtn, !stepImages[faceStep] && styles.disabledBtn, { backgroundColor: '#3498DB' }]} 
              onPress={handleNextStep}
            >
              <Text style={styles.navBtnText}>Tiếp theo</Text>
              <Icon name="chevron-right" size={12} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              disabled={!stepImages[1] || !stepImages[2] || !stepImages[3]}
              style={[
                styles.navBtn, 
                (!stepImages[1] || !stepImages[2] || !stepImages[3]) && styles.disabledBtn, 
                { backgroundColor: '#2ECC71' }
              ]} 
              onPress={handleUploadPhoto}
            >
              <Text style={styles.navBtnText}>Đăng ký Face ID</Text>
              <Icon name="check-circle" size={12} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderProfileView = () => {
    if (imageUri) {
      return (
        <View style={[styles.imageContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
          />
          <View style={styles.statusBadge}>
            <Icon name="check-circle" size={14} color="#2ECC71" />
            <Text style={styles.statusBadgeText}>Hệ thống đã nhận diện Face ID</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Hồ sơ sinh trắc học đã được xác thực an toàn. Bạn không thể tự thay đổi ảnh hồ sơ.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Đang tải trạng thái nhận dạng...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>Đang kết nối máy chủ Face ID...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {apiStatus === 404 || stepImages[1] || stepImages[2] || stepImages[3] 
        ? renderGuidedCard() 
        : renderProfileView()
      }
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#BDC3C7',
  },
  activeDot: {
    backgroundColor: '#8A4C7D',
    transform: [{ scale: 1.2 }],
  },
  completedDot: {
    backgroundColor: '#2ECC71',
  },
  cameraBox: {
    width: 280,
    height: 280,
    borderRadius: 140,
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
    borderRadius: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorArrow: {
    position: 'absolute',
    bottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
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
    borderRadius: 130,
    opacity: 0.3,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F8C8D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  navBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  }
});

export default UploadImageScreen;
