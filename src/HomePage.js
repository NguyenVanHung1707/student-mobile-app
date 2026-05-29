import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import {API_URL} from '@env';
import {getData, getThemeColors} from './Utility';
import {getVerifiedLocation} from './geofenceLocation';
import {launchCamera} from 'react-native-image-picker';

export default function AttendanceForm() {
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [faceImageBase64, setFaceImageBase64] = useState(null);

  const handleTakeSelfie = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.5,
        includeBase64: true,
        cameraType: 'front',
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorCode) {
          console.log('Camera Error: ', response.errorCode);
          Alert.alert('Lỗi camera', 'Không thể khởi động camera để chụp ảnh.');
        } else if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          setCapturedImageUri(asset.uri);
          setFaceImageBase64(asset.base64);
        }
      },
    );
  };

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã điểm danh!');
      return;
    }
    
    setIsLoading(true);
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/student/get-form-by-code?code=${code.trim()}`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        setFormData(response.data);
        const falseAnswers = response.data.questions.flatMap(question =>
          question.answers.map(answer => ({id: answer.id, isTrue: false})),
        );
        setAnswers(falseAnswers);
      })
      .catch(error => {
        Alert.alert('Lỗi', 'Không thể lấy thông tin phòng điểm danh. Vui lòng kiểm tra mã!');
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleSubmitAnswers = async () => {
    try {
      if (formData?.isFaceVerificationRequired && !faceImageBase64) {
        Alert.alert('Yêu cầu khuôn mặt 📸', 'Vui lòng thực hiện chụp ảnh khuôn mặt selfie của bạn để xác thực chính chủ trước khi nộp điểm danh.');
        return;
      }

      setIsLoading(true);
      const location = formData?.isLocationRequired
        ? await getVerifiedLocation()
        : null;

      let submitData = JSON.stringify({
        code: formData.code,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        mockLocationDetected: false,
        answers: answers.map(answer => ({
          id: answer.id,
          isTrue: answer.isTrue,
        })),
        faceImageBase64: faceImageBase64 || null,
      });
      console.log(submitData);

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${API_URL}/student/submit-answer`,
        headers: {
          Authorization: 'Bearer ' + (await getData('accessToken')),
          'Content-Type': 'application/json',
        },
        data: submitData,
      };

      axios
        .request(config)
        .then(response => {
          if (response.status === 200) {
            Alert.alert('Thành công 🎉', 'Bạn đã điểm danh thành công!');
            setFormData(null);
            setAnswers([]);
            setCode('');
            setCapturedImageUri(null);
            setFaceImageBase64(null);
          }
        })
        .catch(error => {
          console.log(error);
          const message = error.response?.data?.message;
          console.log(error.response?.data);
          if (message === 'Answer is not correct') {
            Alert.alert('Điểm danh thất bại ❌', 'Bạn đã trả lời sai câu hỏi xác thực!');
          } else if (message === 'Bạn không ở trong phạm vi lớp học') {
            Alert.alert('Điểm danh thất bại ❌', 'Bạn không ở trong phạm vi bán kính của lớp học!');
          } else {
            Alert.alert('Điểm danh thất bại ❌', message || 'Nộp điểm danh thất bại!');
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi định vị', error.message || 'Lỗi khi lấy vị trí hiện tại GPS.');
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (answerId) => {
    const updated = answers.map(ans => {
      if (ans.id === answerId) {
        return {...ans, isTrue: !ans.isTrue};
      }
      return ans;
    });
    setAnswers(updated);
  };

  const backToFillCode = () => {
    setFormData(null);
    setAnswers([]);
    setCapturedImageUri(null);
    setFaceImageBase64(null);
  };

  const checkIsTrueFromId = answerId => {
    if (answers && answers.length > 0) {
      for (const answer of answers) {
        if (answer.id === answerId && answer.isTrue) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}>
      {!formData ? (
        <ScrollView contentContainerStyle={styles.centerContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}>
            <View style={[styles.iconContainer, {backgroundColor: theme.primary + '12'}]}>
              <Icon name="qrcode" size={36} color={theme.primary} />
            </View>
            
            <Text style={[styles.title, {color: theme.text}]}>ĐIỂM DANH HỌC PHẦN</Text>
            <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
              Nhập mã điểm danh được cung cấp bởi Giảng viên của bạn để tham gia xác thực có mặt.
            </Text>

            <View style={[styles.inputWrapper, {backgroundColor: theme.inputBg, borderColor: theme.border}]}>
              <Icon name="key" size={16} color={theme.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, {color: theme.inputText}]}
                placeholder="Mã điểm danh (Ví dụ: EXM123)"
                placeholderTextColor={theme.placeholder}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, {backgroundColor: theme.primary}, isLoading && styles.disabledButton]} 
              onPress={handleSubmitCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>VÀO PHÒNG ĐIỂM DANH</Text>
                  <Icon name="arrow-right" size={14} color="#FFF" style={styles.buttonArrow} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.formContainer}>
          {/* Header Banner for Attendance Detail */}
          <View style={[styles.formHeader, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
            <View style={styles.headerTextCol}>
              <Text style={[styles.formHeaderLabel, {color: theme.primary}]}>PHÒNG ĐIỂM DANH</Text>
              <Text style={[styles.formHeaderTitle, {color: theme.text}]}>Xác thực Câu hỏi & GPS</Text>
            </View>
            {formData.isLocationRequired ? (
              <View style={[styles.gpsTag, {backgroundColor: '#D1FAE5'}]}>
                <Icon name="map-marker" size={12} color="#059669" style={{marginRight: 4}} />
                <Text style={styles.gpsTagText}>GPS Yêu Cầu</Text>
              </View>
            ) : null}
          </View>

          <FlatList
            data={formData.questions}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.questionsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              formData.isFaceVerificationRequired ? (
                <View style={[styles.selfieCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
                  <View style={styles.selfieHeader}>
                    <View style={[styles.selfieIconContainer, {backgroundColor: theme.primary + '15'}]}>
                      <Icon name="camera" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.selfieTextContainer}>
                      <Text style={[styles.selfieTitle, {color: theme.text}]}>Xác thực khuôn mặt 📸</Text>
                      <Text style={[styles.selfieSubtitleText, {color: theme.textSecondary}]}>
                        Chụp ảnh khuôn mặt selfie trực tiếp của bạn để hệ thống AI xác thực chính chủ.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.selfiePreviewContainer}>
                    {capturedImageUri ? (
                      <View style={[styles.imageWrapper, {borderColor: theme.primary}]}>
                        <Image source={{uri: capturedImageUri}} style={styles.capturedImage} />
                        <View style={styles.successOverlay}>
                          <Icon name="check-circle" size={12} color="#10B981" style={{marginRight: 4}} />
                          <Text style={styles.successOverlayText}>Ảnh đã chụp</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.placeholderBox, {borderColor: theme.border, backgroundColor: theme.inputBg}]}>
                        <Icon name="user" size={40} color={theme.placeholder} />
                        <Text style={[styles.placeholderText, {color: theme.textSecondary}]}>Chưa chụp ảnh</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.selfieButton, {backgroundColor: capturedImageUri ? theme.primary + '18' : theme.primary}]}
                    onPress={handleTakeSelfie}
                  >
                    <Icon name="camera" size={14} color={capturedImageUri ? theme.primary : '#fff'} style={{marginRight: 8}} />
                    <Text style={[styles.selfieButtonText, {color: capturedImageUri ? theme.primary : '#fff'}]}>
                      {capturedImageUri ? 'Chụp lại ảnh khác' : 'Chụp ảnh Selfie'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            renderItem={({item, index}) => (
              <View style={[styles.questionCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
                <View style={styles.questionCardHeader}>
                  <Text style={[styles.questionNumber, {color: theme.primary}]}>CÂU HỎI {index + 1}</Text>
                  <Text style={[styles.questionContent, {color: theme.text}]}>{item.content}</Text>
                </View>

                <View style={styles.choicesList}>
                  {item.answers.map((answer) => {
                    const isSelected = checkIsTrueFromId(answer.id);
                    return (
                      <TouchableOpacity
                        key={answer.id}
                        style={[
                          styles.choiceItem,
                          {
                            backgroundColor: isSelected ? theme.primary + '10' : theme.inputBg,
                            borderColor: isSelected ? theme.primary : theme.border,
                          }
                        ]}
                        onPress={() => handleAnswerChange(answer.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.choiceText, {color: isSelected ? theme.primary : theme.text}]}>
                          {answer.content}
                        </Text>
                        <View style={[
                          styles.customCheckbox,
                          {
                            borderColor: isSelected ? theme.primary : theme.placeholder,
                            backgroundColor: isSelected ? theme.primary : 'transparent',
                          }
                        ]}>
                          {isSelected ? (
                            <Icon name="check" size={10} color="#FFF" />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          <View style={[styles.actionRow, {backgroundColor: theme.card, borderTopColor: theme.border}]}>
            <TouchableOpacity style={[styles.backButton, {borderColor: theme.border}]} onPress={backToFillCode}>
              <Text style={[styles.backButtonText, {color: theme.textSecondary}]}>Quay lại</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.submitButton, {backgroundColor: theme.primary}]} onPress={handleSubmitAnswers}>
              <Icon name="send" size={12} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.submitButtonText}>Nộp điểm danh</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading && formData ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingOverlayText, {color: theme.text}]}>Đang xác thực tọa độ GPS & bài làm...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    padding: 0,
    fontWeight: '700',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F62FE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    marginLeft: 8,
  },
  formContainer: {
    flex: 1,
  },
  formHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTextCol: {
    flex: 1,
  },
  formHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  gpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gpsTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  questionsList: {
    padding: 16,
    paddingBottom: 100,
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  questionCardHeader: {
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  questionContent: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  choicesList: {
    width: '100%',
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  backButton: {
    flex: 1.2,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F62FE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 14, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  selfieCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  selfieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selfieIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selfieTextContainer: {
    flex: 1,
  },
  selfieTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  selfieSubtitleText: {
    fontSize: 11,
    lineHeight: 15,
  },
  selfiePreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  successOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 14, 23, 0.75)',
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlayText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  placeholderBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  selfieButton: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  selfieButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
