import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  PermissionsAndroid,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import Geolocation from 'react-native-geolocation-service';
import {API_BASE_URL} from './config';
import {getThemeColors} from './Utility';

export default function TakeAssessmentScreen({route, navigation}) {
  const {assessmentId, submissionId, courseId} = route.params;

  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> { selectedChoice, answerText }
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Đã đồng bộ');

  const timerRef = useRef(null);
  const saveTimeoutRef = useRef({});

  // 1. Fetch details on Mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const config = {headers: {Authorization: 'Bearer ' + token}};

        // Fetch submission details (which includes the questions and student's current answers)
        const gradesRes = await axios.get(`${API_BASE_URL}/submissions/${submissionId}/grades`, config);
        const submissionData = gradesRes.data;

        // Initialize answers map
        const ansMap = {};
        submissionData.answers?.forEach(ans => {
          ansMap[ans.questionId] = {
            selectedChoice: ans.selectedChoice || '',
            answerText: ans.answerText || '',
          };
        });
        setAnswers(ansMap);

        // Fetch course assessments to get metadata of this specific assessment (duration, isLocationRequired, etc.)
        const assessmentsRes = await axios.get(`${API_BASE_URL}/courses/${courseId}/assessments`, config);
        const matched = assessmentsRes.data?.find(a => a.id === assessmentId);

        if (matched) {
          setAssessment(matched);
          setQuestions(matched.questions || []);

          if (matched.isCameraRequired) {
            Alert.alert(
              'Yêu cầu giám sát Camera (AI)',
              'Bài thi này yêu cầu bật Camera giám sát góc nhìn thời gian thực. Để làm bài thi có sự giám sát AI tối ưu nhất, vui lòng sử dụng phiên bản WEB để làm bài thi.',
              [{ text: 'Đã hiểu' }]
            );
          }

          // Setup countdown timer
          if (matched.durationMinutes) {
            const startInstant = new Date(submissionData.startedAt).getTime();
            const durationMillis = matched.durationMinutes * 60 * 1000;
            const expiryTime = startInstant + durationMillis;

            const updateTimer = () => {
              const now = Date.now();
              const diff = expiryTime - now;
              if (diff <= 0) {
                setTimeLeft(0);
                clearInterval(timerRef.current);
                handleAutoSubmit();
              } else {
                setTimeLeft(Math.floor(diff / 1000));
              }
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
          }
        }
      } catch (err) {
        console.error('Error loading exam session:', err);
        Alert.alert('Lỗi', 'Không thể khởi động phiên làm bài thi.');
        navigation.goBack();
      }
    };

    loadSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Clear all autosave timers on unmount
      Object.values(saveTimeoutRef.current).forEach(t => clearTimeout(t));
    };
  }, [assessmentId, submissionId, courseId]);

  // 2. Autosave mechanism
  const triggerAutoSave = (questionId, selectedChoice, answerText) => {
    setSyncStatus('Đang tự động lưu...');

    // Clear previous timeout for this question
    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId]);
    }

    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const config = {headers: {Authorization: 'Bearer ' + token}};

        const payload = {
          questionId,
          selectedChoice: selectedChoice || null,
          answerText: answerText || null,
        };

        await axios.post(`${API_BASE_URL}/submissions/${submissionId}/save-draft`, payload, config);
        setSyncStatus('Đã đồng bộ');
      } catch (err) {
        console.error('Error saving draft:', err);
        setSyncStatus('Lỗi đồng bộ (Bài lưu tạm tại máy)');
      }
    }, 1500); // 1.5-second debounce
  };

  const handleChoiceSelect = (qId, choiceKey) => {
    const currentAns = answers[qId] || {selectedChoice: '', answerText: ''};
    const updated = {
      ...answers,
      [qId]: {...currentAns, selectedChoice: choiceKey},
    };
    setAnswers(updated);
    triggerAutoSave(qId, choiceKey, currentAns.answerText);
  };

  const handleTextChange = (qId, text) => {
    const currentAns = answers[qId] || {selectedChoice: '', answerText: ''};
    const updated = {
      ...answers,
      [qId]: {...currentAns, answerText: text},
    };
    setAnswers(updated);
    triggerAutoSave(qId, currentAns.selectedChoice, text);
  };

  // 3. Location retrieval for GPS geofencing
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Quyền truy cập vị trí',
          message: 'Ứng dụng cần định vị GPS để xác thực vị trí khi nộp bài thi.',
          buttonNeutral: 'Hỏi lại sau',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getGPSLocation = () =>
    new Promise(async (resolve, reject) => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        reject(new Error('Quyền định vị GPS bị từ chối!'));
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          reject(new Error(error.message || 'Lỗi định vị thiết bị.'));
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });

  const handleManualSubmit = () => {
    Alert.alert(
      'Nộp bài thi',
      'Bạn có chắc chắn muốn nộp bài thi ngay lập tức? Sau khi nộp sẽ không thể chỉnh sửa đáp án!',
      [
        {text: 'Hủy', style: 'cancel'},
        {text: 'Xác nhận nộp', onPress: () => executeSubmit(false)},
      ],
    );
  };

  const handleAutoSubmit = () => {
    Alert.alert(
      'Hết giờ làm bài!',
      'Hệ thống đang tự động khóa và gửi bài làm của bạn.',
      [{text: 'Đồng ý', onPress: () => executeSubmit(true)}],
      {cancelable: false},
    );
  };

  const executeSubmit = async (isAuto = false) => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const config = {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      };

      let payload = null;
      if (assessment?.isLocationRequired) {
        setSyncStatus('Đang lấy vị trí GPS...');
        const coords = await getGPSLocation();
        payload = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          mockLocationDetected: false,
        };
      }

      await axios.post(`${API_BASE_URL}/submissions/${submissionId}/submit`, payload, config);
      Alert.alert('Thành công', isAuto ? 'Bài thi đã được tự động nộp thành công!' : 'Nộp bài thi thành công!');
      navigation.goBack();
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Lỗi nộp bài', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi nộp bài.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = secs => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!assessment) {
    return (
      <View style={[styles.center, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, {color: colors.textSecondary}]}>Đang tải đề thi & chuẩn bị phiên làm bài...</Text>
      </View>
    );
  }

  const currentQ = questions[currentQIdx];
  const totalQuestions = questions.length;

  return (
    <View style={[styles.container, {backgroundColor: colors.bg}]}>
      {/* Top Header Panel */}
      <View style={[styles.header, {backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.title, {color: colors.text}]} numberOfLines={1}>
              {assessment.title}
            </Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              Số câu: {totalQuestions} câu | {assessment.type}
            </Text>
          </View>
        </View>

        {/* Sync & Timer status */}
        <View style={[styles.statusRow, {borderTopColor: colors.border}]}>
          <View style={styles.syncContainer}>
            <Icon name="cloud-upload" size={12} color={colors.textSecondary} style={{marginRight: 4}} />
            <Text style={[styles.syncText, {color: colors.textSecondary}]}>{syncStatus}</Text>
          </View>

          {timeLeft !== null && (
            <View style={[
              styles.timerBadge,
              {backgroundColor: isDark ? '#10B98115' : '#f0fdf4', borderColor: isDark ? '#10B98140' : '#bfe1d0'},
              timeLeft < 300 && {backgroundColor: isDark ? '#EF444415' : '#fef2f2', borderColor: isDark ? '#EF444440' : '#fca5a5'}
            ]}>
              <Icon
                name="clock-o"
                size={14}
                color={timeLeft < 300 ? '#ef4444' : colors.primary}
                style={{marginRight: 6}}
              />
              <Text style={[
                styles.timerText,
                {color: colors.primary},
                timeLeft < 300 && {color: '#ef4444'}
              ]}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Body Grid */}
      <View style={styles.body}>
        {assessment?.isCameraRequired && (
          <View style={styles.cameraBanner}>
            <Icon name="camera" size={14} color="#d97706" style={{marginRight: 6}} />
            <Text style={styles.cameraBannerText}>
              Bài thi yêu cầu Camera giám sát AI. Nên dùng bản WEB để làm bài.
            </Text>
          </View>
        )}
        {/* Scrollable Question detail */}
        {currentQ ? (
          <ScrollView style={styles.questionPanel} contentContainerStyle={{paddingBottom: 25}}>
            <View style={styles.qHeader}>
              <Text style={[styles.qNumText, {color: colors.primary, backgroundColor: colors.bgSecondary}]}>Câu {currentQIdx + 1}</Text>
              <Text style={[styles.qScoreText, {color: colors.textSecondary}]}>
                [{currentQ.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : currentQ.type === 'SHORT_ANSWER' ? 'Trả lời ngắn' : 'Tự luận'} - {currentQ.score}đ]
              </Text>
            </View>

            <Text style={[styles.qContent, {color: colors.text}]}>{currentQ.content}</Text>

            {/* Answer Controls */}
            {currentQ.type === 'MULTIPLE_CHOICE' && (
              <View style={styles.choicesGrid}>
                {(() => {
                  try {
                     const meta = JSON.parse(currentQ.metadata || '{}');
                     return meta.choices?.map(c => {
                       const isSelected = answers[currentQ.id]?.selectedChoice === c.key;
                       return (
                         <TouchableOpacity
                           key={c.key}
                           style={[
                             styles.choiceCard,
                             {backgroundColor: colors.card, borderColor: colors.border},
                             isSelected && {borderColor: colors.primary, backgroundColor: isDark ? '#0F62FE15' : '#f0f4fa'}
                           ]}
                           onPress={() => handleChoiceSelect(currentQ.id, c.key)}>
                           <View style={[
                             styles.choiceIndex,
                             {backgroundColor: colors.bgSecondary, borderColor: colors.border},
                             isSelected && {backgroundColor: colors.primary, borderColor: colors.primary}
                           ]}>
                             <Text style={[
                               styles.choiceIndexText,
                               {color: colors.textSecondary},
                               isSelected && {color: '#ffffff'}
                             ]}>
                               {c.key}
                             </Text>
                           </View>
                           <Text style={[
                             styles.choiceText,
                             {color: colors.text},
                             isSelected && {color: colors.primary, fontWeight: '700'}
                           ]}>
                             {c.text}
                           </Text>
                         </TouchableOpacity>
                       );
                     });
                  } catch (e) {
                    return <Text style={[styles.errorText, {color: '#ef4444'}]}>Lỗi hiển thị phương án lựa chọn.</Text>;
                  }
                })()}
              </View>
            )}

            {currentQ.type === 'SHORT_ANSWER' && (
              <View style={styles.textInputContainer}>
                <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Nhập đáp án ngắn:</Text>
                <TextInput
                  style={[styles.textInput, {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}]}
                  placeholder="Điền từ khóa đáp án..."
                  placeholderTextColor={colors.placeholder}
                  value={answers[currentQ.id]?.answerText || ''}
                  onChangeText={val => handleTextChange(currentQ.id, val)}
                  autoCapitalize="none"
                />
              </View>
            )}

            {currentQ.type === 'ESSAY' && (
              <View style={styles.textInputContainer}>
                <Text style={[styles.inputLabel, {color: colors.textSecondary}]}>Trình bày bài giải tự luận:</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText}
                  ]}
                  placeholder="Nhập nội dung tự luận chi tiết tại đây..."
                  placeholderTextColor={colors.placeholder}
                  multiline={true}
                  numberOfLines={8}
                  textAlignVertical="top"
                  value={answers[currentQ.id]?.answerText || ''}
                  onChangeText={val => handleTextChange(currentQ.id, val)}
                />
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={[styles.center, {backgroundColor: colors.bg}]}>
            <Text style={[styles.errorText, {color: '#ef4444'}]}>Không tìm thấy câu hỏi!</Text>
          </View>
        )}
      </View>

      {/* Bottom Sticky Navigator & Submit Button */}
      <View style={[styles.footer, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
        {/* Prev / Next buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              {backgroundColor: colors.bgSecondary, borderColor: colors.border},
              currentQIdx === 0 && styles.navButtonDisabled
            ]}
            disabled={currentQIdx === 0}
            onPress={() => setCurrentQIdx(currentQIdx - 1)}>
            <Icon name="chevron-left" size={12} color={currentQIdx === 0 ? colors.placeholder : colors.textSecondary} />
            <Text style={[
              styles.navButtonText,
              {color: colors.textSecondary},
              currentQIdx === 0 && {color: colors.placeholder}
            ]}>
              Trước đó
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridToggleButton, {backgroundColor: isDark ? '#0F62FE15' : '#f0f4fa', borderColor: colors.primary}]}
            onPress={() => {
              // Open modal sheet or alert showing question list mapping
              Alert.alert(
                'Sơ đồ câu hỏi',
                questions
                  .map((q, idx) => {
                    const isAnswered = answers[q.id]?.selectedChoice || answers[q.id]?.answerText;
                    return `Câu ${idx + 1}: ${isAnswered ? '✅ Đã làm' : '❌ Chưa làm'}`;
                  })
                  .join('\n'),
              );
            }}>
            <Icon name="th" size={14} color={colors.primary} />
            <Text style={[styles.gridToggleText, {color: colors.primary}]}>
              {currentQIdx + 1}/{totalQuestions}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              {backgroundColor: colors.bgSecondary, borderColor: colors.border},
              currentQIdx === totalQuestions - 1 && styles.navButtonDisabled
            ]}
            disabled={currentQIdx === totalQuestions - 1}
            onPress={() => setCurrentQIdx(currentQIdx + 1)}>
            <Text style={[
              styles.navButtonText,
              {color: colors.textSecondary},
              currentQIdx === totalQuestions - 1 && {color: colors.placeholder}
            ]}>
              Tiếp theo
            </Text>
            <Icon name="chevron-right" size={12} color={currentQIdx === totalQuestions - 1 ? colors.placeholder : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          disabled={isSubmitting}
          onPress={handleManualSubmit}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="send" size={14} color="#ffffff" style={{marginRight: 8}} />
              <Text style={styles.submitButtonText}>Nộp Bài Thi Ngay</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#34568B',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bfe1d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerUrgent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34568B',
    fontFamily: 'monospace',
  },
  timerTextUrgent: {
    color: '#ef4444',
  },
  body: {
    flex: 1,
  },
  questionPanel: {
    flex: 1,
    padding: 15,
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qNumText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34568B',
    backgroundColor: '#ebf1fa',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  qScoreText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  qContent: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 20,
  },
  choicesGrid: {
    marginTop: 5,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  choiceCardSelected: {
    borderColor: '#34568B',
    backgroundColor: '#f0f4fa',
    shadowColor: '#34568B',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  choiceIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  choiceIndexSelected: {
    backgroundColor: '#34568B',
    borderColor: '#34568B',
  },
  choiceIndexText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  choiceIndexTextSelected: {
    color: '#ffffff',
  },
  choiceText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  choiceTextSelected: {
    color: '#34568B',
    fontWeight: '700',
  },
  textInputContainer: {
    marginTop: 5,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '750',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  textArea: {
    height: 180,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 15,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginHorizontal: 6,
  },
  navButtonTextDisabled: {
    color: '#cbd5e1',
  },
  gridToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34568B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f0f4fa',
  },
  gridToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34568B',
    marginLeft: 6,
  },
  submitButton: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#e11d48',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cameraBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
  },
  cameraBannerText: {
    color: '#b45309',
    fontSize: 11.5,
    fontWeight: 'bold',
    flex: 1,
  },
});
