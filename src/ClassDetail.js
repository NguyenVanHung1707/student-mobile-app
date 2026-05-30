import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  useColorScheme,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import {API_URL} from '@env';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import {getData, storeData, formatToView, convertTime, getThemeColors} from './Utility';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import ClassDocuments from './ClassDocuments';
import Geolocation from 'react-native-geolocation-service';

export default function ClassDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);
  const Separator = () => <View style={{height: 10}} />;
  const navigation = useNavigation();
  const [attendanceList, setAttendanceList] = useState([]);
  const [courseCode, setCourseCode] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // New features states
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'assessment', or 'document'
  const [classId, setClassId] = useState(null);
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchData = async () => {
    setCourseCode(await getData('currentClassCode'));
    setSubject(await getData('currentClassSubject'));
    setDescription(await getData('currentClassDescription'));
    let currentClassId = await getData('currentClassId');
    setClassId(currentClassId);
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/student/get-my-attendance-in-a-course?courseId=${currentClassId}`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        setAttendanceList(response.data);
      })
      .catch(error => {
        console.log(error);
      });
  };

  const fetchAssessments = async () => {
    setIsAssessmentsLoading(true);
    let currentClassId = await getData('currentClassId');
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/courses/${currentClassId}/assessments`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        setAssessmentsList(response.data);
      })
      .catch(error => {
        console.log(error);
        Alert.alert('Lỗi', 'Không thể lấy danh sách bài thi/bài tập!');
      })
      .finally(() => {
        setIsAssessmentsLoading(false);
      });
  };

  const fetchSubmissionGrades = async submissionId => {
    setIsSubmissionLoading(true);
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/submissions/${submissionId}/grades`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };

    axios
      .request(config)
      .then(response => {
        setSelectedSubmission(response.data);
        setIsModalVisible(true);
      })
      .catch(error => {
        console.log(error);
        Alert.alert('Lỗi', 'Không thể lấy chi tiết điểm thi!');
      })
      .finally(() => {
        setIsSubmissionLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    if (activeTab === 'assessment') {
      fetchAssessments();
    }
  }, [activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      if (activeTab === 'assessment') {
        fetchAssessments();
      }
    }, [activeTab]),
  );

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Quyền vị trí bài thi',
          message: 'Ứng dụng cần quyền định vị GPS để xác thực khoảng cách làm bài thi.',
          buttonPositive: 'Đồng ý',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const getGPSLocation = () =>
    new Promise(async (resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          reject(new Error('Lỗi định vị thiết bị.'));
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });

  const handleStartExam = async (item) => {
    if (item.isCameraRequired) {
      Alert.alert(
        'Không thể làm bài trên điện thoại',
        'Bài thi này yêu cầu giám sát Camera trực tiếp (AI Proctoring) và chỉ có thể thực hiện trên phiên bản WEB (Máy tính). Vui lòng sử dụng máy tính để thực hiện bài thi!',
        [{ text: 'Đã hiểu' }]
      );
      return;
    }

    if (item.submissionStatus === 'IN_PROGRESS' && item.submissionId) {
      navigation.navigate('TakeAssessment', {
        assessmentId: item.id,
        submissionId: item.submissionId,
        courseId: classId,
      });
      return;
    }

    try {
      const token = await getData('accessToken');
      const config = {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      };

      let locationPayload = null;
      if (item.isLocationRequired) {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          Alert.alert('Từ chối định vị', 'Bài thi yêu cầu định vị GPS. Vui lòng cấp quyền để bắt đầu!');
          return;
        }

        const coords = await getGPSLocation();
        locationPayload = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          mockLocationDetected: false,
        };
      }

      const response = await axios.post(
        `${API_URL}/assessments/${item.id}/start`,
        locationPayload,
        config,
      );

      const subData = response.data;
      if (subData && subData.id) {
        navigation.navigate('TakeAssessment', {
          assessmentId: item.id,
          submissionId: subData.id,
          courseId: classId,
        });
      } else {
        throw new Error('Khởi tạo phiên thi thất bại.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi bắt đầu thi', err.response?.data?.message || err.message || 'Không thể bắt đầu làm bài.');
    }
  };

  const renderAssessmentItem = ({item}) => {
    const isDeadlinePassed = item.deadline
      ? new Date(item.deadline) < new Date()
      : false;
    const canTake =
      item.submissionStatus === 'NOT_STARTED' ||
      item.submissionStatus === 'IN_PROGRESS';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.badge, styles.typeBadge(item.type)]}>
            {item.type === 'QUIZ'
              ? 'Trắc nghiệm'
              : item.type === 'MID_TERM'
              ? 'Giữa kỳ'
              : item.type === 'FINAL_EXAM'
              ? 'Cuối kỳ'
              : 'Bài tập'}
          </Text>
          <Text
            style={[styles.badge, styles.statusBadge(item.submissionStatus)]}>
            {item.submissionStatus === 'GRADED'
              ? 'Đã chấm điểm'
              : item.submissionStatus === 'SUBMITTED'
              ? 'Đã nộp bài'
              : item.submissionStatus === 'IN_PROGRESS'
              ? 'Đang làm dở'
              : 'Chưa làm'}
          </Text>
        </View>

        <Text style={styles.assessmentTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.assessmentDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="clock-o" size={14} color="#7F8C8D" />
            <Text style={styles.metaText}>
              {item.durationMinutes
                ? `${item.durationMinutes} phút`
                : 'Không giới hạn'}
            </Text>
          </View>
          {item.deadline ? (
            <View style={styles.metaItem}>
              <Icon
                name="calendar"
                size={14}
                color={isDeadlinePassed ? '#E74C3C' : '#7F8C8D'}
              />
              <Text
                style={[
                  styles.metaText,
                  isDeadlinePassed && styles.deadlinePassedText,
                ]}>
                Hạn: {formatToView(convertTime(item.deadline))}
              </Text>
            </View>
          ) : null}
        </View>

        {item.submissionStatus === 'GRADED' && item.studentScore !== null ? (
          <View style={styles.scoreSummaryRow}>
            <Icon
              name="trophy"
              size={18}
              color="#27AE60"
              style={{marginRight: 6}}
            />
            <Text style={styles.scoreSummaryText}>
              Điểm đạt được: {item.studentScore} / {item.maxScore}đ
            </Text>
          </View>
        ) : null}

        <View style={styles.cardActionRow}>
          {canTake && !isDeadlinePassed ? (
            <TouchableOpacity
              style={styles.takeExamButton}
              onPress={() => handleStartExam(item)}>

              <Icon
                name="play"
                size={14}
                color="#FFF"
                style={{marginRight: 6}}
              />
              <Text style={styles.takeExamButtonText}>
                {item.submissionStatus === 'IN_PROGRESS'
                  ? 'Làm tiếp'
                  : 'Bắt đầu làm'}
              </Text>
            </TouchableOpacity>
          ) : item.submissionStatus === 'GRADED' && item.submissionId ? (
            <TouchableOpacity
              style={styles.viewGradesButton}
              onPress={() => fetchSubmissionGrades(item.submissionId)}
              disabled={isSubmissionLoading}>
              {isSubmissionLoading ? (
                <ActivityIndicator size="small" color="#27AE60" />
              ) : (
                <>
                  <Icon
                    name="eye"
                    size={14}
                    color="#27AE60"
                    style={{marginRight: 6}}
                  />
                  <Text style={styles.viewGradesButtonText}>
                    Xem chi tiết & Nhận xét
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.disabledButton} disabled={true}>
              <Text style={styles.disabledButtonText}>
                Không thể làm (Hết hạn / Đã nộp)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={[styles.classInfoContainer, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <Text style={[styles.classInfoText, {color: theme.text}]}>Mã lớp: {courseCode}</Text>
        <Text style={[styles.classInfoText, {color: theme.text}]}>Môn học: {subject}</Text>
        <Text style={[styles.classInfoText, {color: theme.textSecondary}]}>Mô tả: {description}</Text>
      </View>

      <View style={[styles.activeBar, {backgroundColor: theme.bg}]}>
        <TouchableOpacity
          style={[styles.addButton, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('ClassDiscussion')}>
          <Icon
            name="comments"
            size={16}
            color="#FFFFFF"
            style={{marginRight: 8}}
          />
          <Text style={styles.addButtonText}>Thảo luận lớp học</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Tab Bar */}
      <View style={[styles.tabContainer, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'attendance' && {backgroundColor: theme.primary},
          ]}
          onPress={() => setActiveTab('attendance')}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'attendance' ? {color: '#FFFFFF'} : {color: theme.textSecondary},
            ]}>
            Nhật ký chuyên cần
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'assessment' && {backgroundColor: theme.primary},
          ]}
          onPress={() => {
            setActiveTab('assessment');
            fetchAssessments();
          }}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'assessment' ? {color: '#FFFFFF'} : {color: theme.textSecondary},
            ]}>
            Bài thi & Bài tập
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'document' && {backgroundColor: theme.primary},
          ]}
          onPress={() => {
            setActiveTab('document');
          }}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'document' ? {color: '#FFFFFF'} : {color: theme.textSecondary},
            ]}>
            Tài liệu
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'attendance' ? (
        <>
          <View style={[styles.container, {backgroundColor: theme.bg}]}>
            <Text style={[styles.text1, {color: theme.text}]}>Danh sách buổi điểm danh của bạn</Text>
          </View>
          <View style={[styles.studentList, {backgroundColor: theme.bg}]}>
            <FlatList
              data={attendanceList}
              renderItem={({item}) => (
                <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, elevation: 2, shadowOpacity: 0.03}]}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, {color: theme.text}]}>Thời gian điểm danh:</Text>
                    <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                      {formatToView(convertTime(item.attendanceTime))}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, {color: theme.text}]}>Buổi học số:</Text>
                    <Text style={[styles.infoValue, {color: theme.textSecondary}]}>{item.lectureNumber}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, {color: theme.text}]}>Đi/Vắng:</Text>
                    <Text style={[styles.infoValue, {color: item.isAttendance ? '#10B981' : '#EF4444', fontWeight: 'bold'}]}>
                      {item.isAttendance ? 'Đi học' : 'Vắng mặt'}
                    </Text>
                  </View>
                </View>
              )}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{paddingBottom: 20}}
              ItemSeparatorComponent={Separator}
            />
          </View>
        </>
      ) : activeTab === 'assessment' ? (
        <>
          <View style={[styles.container, {backgroundColor: theme.bg}]}>
            <Text style={[styles.text1, {color: theme.text}]}>Bài thi & Bài tập học phần</Text>
          </View>
          <View style={[styles.studentList, {backgroundColor: theme.bg}]}>
            {isAssessmentsLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{marginTop: 10, color: theme.textSecondary}}>
                  Đang tải bài thi...
                </Text>
              </View>
            ) : assessmentsList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="file-text-o" size={48} color="#BDC3C7" />
                <Text style={styles.emptyText}>
                  Hiện tại chưa có bài tập hoặc đề thi nào được tạo.
                </Text>
              </View>
            ) : (
              <FlatList
                data={assessmentsList}
                renderItem={renderAssessmentItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{paddingBottom: 20}}
                ItemSeparatorComponent={Separator}
              />
            )}
          </View>
        </>
      ) : (
        <ClassDocuments classId={classId} />
      )}

      {/* Graded Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chi tiết kết quả bài làm</Text>
                {selectedSubmission && (
                  <Text style={styles.modalSubTime}>
                    Nộp:{' '}
                    {selectedSubmission.submittedAt
                      ? formatToView(
                          convertTime(selectedSubmission.submittedAt),
                        )
                      : 'Đang xử lý'}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseIcon}>
                <Icon name="times" size={20} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            {selectedSubmission && (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={{paddingBottom: 30}}>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Tổng điểm đạt được</Text>
                  <Text style={styles.scoreValue}>
                    {selectedSubmission.finalScore ?? 0}đ
                  </Text>
                </View>

                {selectedSubmission.teacherFeedback ? (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>
                      Nhận xét của Giảng viên:
                    </Text>
                    <Text style={styles.feedbackText}>
                      "{selectedSubmission.teacherFeedback}"
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.sectionTitle}>Chi tiết từng câu hỏi</Text>
                {selectedSubmission.answers &&
                  selectedSubmission.answers.map((ans, idx) => (
                    <View key={idx} style={styles.answerCard}>
                      <View style={styles.answerCardHeader}>
                        <Text style={styles.answerQuestionNum}>
                          Câu hỏi {idx + 1}
                        </Text>
                        <View style={styles.badgeRow}>
                          {ans.isCorrect === true ? (
                            <Text
                              style={[styles.miniBadge, styles.correctBadge]}>
                              Đúng
                            </Text>
                          ) : ans.isCorrect === false ? (
                            <Text
                              style={[styles.miniBadge, styles.incorrectBadge]}>
                              Sai
                            </Text>
                          ) : (
                            <Text style={[styles.miniBadge, styles.essayBadge]}>
                              Tự luận
                            </Text>
                          )}
                          <Text style={styles.answerScore}>
                            {ans.score !== null ? `${ans.score}đ` : 'Chờ chấm'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.studentAnswerBox}>
                        <Text style={styles.studentAnswerLabel}>
                          Bài làm của bạn:
                        </Text>
                        {ans.selectedChoice ? (
                          <Text style={styles.studentAnswerText}>
                            Lựa chọn:{' '}
                            <Text
                              style={{fontWeight: 'bold', color: '#34568B'}}>
                              {ans.selectedChoice}
                            </Text>
                          </Text>
                        ) : ans.answerText ? (
                          <Text style={styles.studentAnswerText}>
                            {ans.answerText}
                          </Text>
                        ) : (
                          <Text style={styles.studentAnswerPlaceholder}>
                            Không trả lời
                          </Text>
                        )}
                      </View>

                      {ans.teacherComment ? (
                        <View style={styles.teacherCommentContainer}>
                          <Icon
                            name="commenting-o"
                            size={12}
                            color="#D35400"
                            style={{marginRight: 4, marginTop: 2}}
                          />
                          <Text style={styles.teacherCommentText}>
                            Nhận xét: {ans.teacherComment}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  text1: {
    fontSize: 20,
    fontWeight: 'bold',
    position: 'absolute',
    color: '#2C3E50', // Màu văn bản tối để dễ đọc
  },
  studentList: {
    flex: 10,
    width: '100%',
    padding: 15,
    backgroundColor: '#ECF0F1', // Màu nền nhẹ nhàng
  },
  container: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF0F1', // Màu nền sáng và hài hòa
    flexDirection: 'row',
  },
  activeBar: {
    flex: 1.5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ECF0F1', // Màu nền đậm hơn một chút để tạo sự khác biệt
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  addButton: {
    backgroundColor: '#34568B', // Màu xanh tươi sáng cho nút
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  classInfoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    width: '90%',
    alignSelf: 'center',
    borderColor: '#BDC3C7', // Viền nhẹ nhàng để tách biệt
    borderWidth: 1,
    shadowColor: '#000', // Thêm đổ bóng để nổi bật hơn
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  classInfoText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2C3E50', // Màu văn bản đậm để dễ đọc
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center', // Aligns text and icon vertically
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 16,
  },
  // Tab Bar Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 5,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#34568B',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  // Assessment Listing Card Styles
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeBadge: type => {
    switch (type) {
      case 'QUIZ':
        return {backgroundColor: '#E0F2FE', color: '#0369A1'};
      case 'MID_TERM':
        return {backgroundColor: '#FFEAD2', color: '#D35400'};
      case 'FINAL_EXAM':
        return {backgroundColor: '#FCE8E6', color: '#C0392B'};
      default:
        return {backgroundColor: '#E8F8F5', color: '#117A65'};
    }
  },
  statusBadge: status => {
    switch (status) {
      case 'GRADED':
        return {backgroundColor: '#D4EDDA', color: '#155724'};
      case 'SUBMITTED':
        return {backgroundColor: '#CCE5FF', color: '#004085'};
      case 'IN_PROGRESS':
        return {backgroundColor: '#FFF3CD', color: '#856404'};
      default:
        return {backgroundColor: '#E2E8F0', color: '#475569'};
    }
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  assessmentDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
  },
  deadlinePassedText: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  scoreSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4FBF7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4EDDA',
    marginBottom: 12,
  },
  scoreSummaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  cardActionRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  takeExamButton: {
    flex: 1,
    backgroundColor: '#34568B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  takeExamButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  viewGradesButton: {
    flex: 1,
    backgroundColor: '#E8F8F5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#A3E4D7',
  },
  viewGradesButtonText: {
    color: '#27AE60',
    fontWeight: 'bold',
    fontSize: 13,
  },
  disabledButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  loaderContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalSubTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseIcon: {
    padding: 5,
  },
  modalScroll: {
    padding: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#27AE60',
    marginTop: 5,
  },
  feedbackContainer: {
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D35400',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  answerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerQuestionNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
  },
  correctBadge: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  incorrectBadge: {
    backgroundColor: '#FCE8E6',
    color: '#C0392B',
  },
  essayBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  answerScore: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  studentAnswerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  studentAnswerLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentAnswerText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  studentAnswerPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  teacherCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingLeft: 5,
  },
  teacherCommentText: {
    fontSize: 12,
    color: '#D35400',
    flex: 1,
    lineHeight: 16,
  },
});
