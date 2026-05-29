import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import axios from 'axios';
import {API_URL} from '@env';
import Icon from 'react-native-vector-icons/FontAwesome';
import {getData, getThemeColors} from './Utility';
import GradesAnalytics from './GradesAnalytics';

export default function GradesAndAttendance() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseDetails, setCourseDetails] = useState({});
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [courseActiveTabs, setCourseActiveTabs] = useState({}); // { [courseId]: 'grades' | 'absences' }
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'analytics'

  // Overall Stats states
  const [totalClasses, setTotalClasses] = useState(0);
  const [averageAttendance, setAverageAttendance] = useState(100);
  const [totalAbsences, setTotalAbsences] = useState(0);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = await getData('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // 1. Fetch enrolled courses
      const courseResponse = await axios.get(
        `${API_URL}/student/get-my-course`,
        {
          headers: {Authorization: `Bearer ${token}`},
        },
      );

      const courseList = courseResponse.data || [];
      setCourses(courseList);
      setTotalClasses(courseList.length);

      if (courseList.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Fetch logs and assessments for each course concurrently
      const details = {};
      let totalAbsCount = 0;
      let totalRateSum = 0;

      await Promise.all(
        courseList.map(async course => {
          try {
            // Fetch attendance logs
            const attendanceResponse = await axios.get(
              `${API_URL}/student/get-my-attendance-in-a-course?courseId=${course.id}`,
              {headers: {Authorization: `Bearer ${token}`}},
            );
            const logs = attendanceResponse.data || [];

            // Fetch assessments
            const assessmentsResponse = await axios.get(
              `${API_URL}/courses/${course.id}/assessments`,
              {headers: {Authorization: `Bearer ${token}`}},
            );
            const assessments = assessmentsResponse.data || [];

            const totalSessions = logs.length;
            const presences = logs.filter(l => l.isAttendance).length;
            const absences = logs.filter(l => !l.isAttendance).length;
            const rate =
              totalSessions > 0
                ? Math.round((presences / totalSessions) * 100)
                : 100;

            totalAbsCount += absences;
            totalRateSum += rate;

            const mappedAttendanceLogs = logs
              .map(l => {
                const d = new Date(l.attendanceTime);
                return {
                  id: l.id,
                  date: d.toLocaleDateString('vi-VN'),
                  time: d.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  lectureNumber: l.lectureNumber || 1,
                  isAttendance: l.isAttendance,
                };
              });

            details[course.id] = {
              attendanceLogs: logs,
              mappedAttendanceLogs,
              assessments,
              attendanceRate: rate,
              presences,
              absences,
            };
          } catch (err) {
            console.log(`Lỗi load chi tiết lớp ${course.id}:`, err);
            details[course.id] = {
              attendanceLogs: [],
              mappedAttendanceLogs: [],
              assessments: [],
              attendanceRate: 100,
              presences: 0,
              absences: 0,
            };
          }
        }),
      );

      setCourseDetails(details);

      const avgRate =
        courseList.length > 0
          ? Math.round(totalRateSum / courseList.length)
          : 100;
      setAverageAttendance(avgRate);
      setTotalAbsences(totalAbsCount);

      // Initialize tabs
      const tabs = {};
      courseList.forEach(c => {
        tabs[c.id] = 'grades';
      });
      setCourseActiveTabs(tabs);
    } catch (error) {
      console.log('Lỗi khi tải kết quả học tập:', error);
      Alert.alert(
        'Lỗi',
        'Không thể lấy thông tin kết quả học tập. Vui lòng thử lại sau.',
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchAllData();
    }, []),
  );

  const toggleExpand = courseId => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
    }
  };

  const getAssessmentTypeLabel = type => {
    switch (type) {
      case 'QUIZ':
        return 'Trắc nghiệm';
      case 'MID_TERM':
        return 'Giữa kỳ';
      case 'FINAL_EXAM':
        return 'Cuối kỳ';
      default:
        return 'Bài tập';
    }
  };

  const getStatusLabel = status => {
    switch (status) {
      case 'GRADED':
        return 'Đã chấm';
      case 'SUBMITTED':
        return 'Đã nộp';
      case 'IN_PROGRESS':
        return 'Đang làm';
      default:
        return 'Chưa làm';
    }
  };

  const getStatusStyle = status => {
    switch (status) {
      case 'GRADED':
        return styles.statusGraded;
      case 'SUBMITTED':
        return styles.statusSubmitted;
      case 'IN_PROGRESS':
        return styles.statusInProgress;
      default:
        return styles.statusNotStarted;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: theme.bg}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary}]}>Đang tải kết quả học tập...</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: theme.bg}}>
      {/* Switcher Tab Bar */}
      <View style={[styles.topTabBar, {backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border}]}>
        <TouchableOpacity
          style={[
            styles.topTabButton,
            viewMode === 'list' ? {backgroundColor: theme.primary} : {backgroundColor: 'transparent'},
          ]}
          onPress={() => setViewMode('list')}>
          <Icon
            name="list-alt"
            size={14}
            color={viewMode === 'list' ? '#ffffff' : theme.textSecondary}
          />
          <Text
            style={[
              styles.topTabButtonText,
              viewMode === 'list' ? {color: '#ffffff'} : {color: theme.textSecondary},
            ]}>
            Bảng điểm chi tiết
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.topTabButton,
            viewMode === 'analytics' ? {backgroundColor: theme.primary} : {backgroundColor: 'transparent'},
          ]}
          onPress={() => setViewMode('analytics')}>
          <Icon
            name="bar-chart"
            size={14}
            color={viewMode === 'analytics' ? '#ffffff' : theme.textSecondary}
          />
          <Text
            style={[
              styles.topTabButtonText,
              viewMode === 'analytics' ? {color: '#ffffff'} : {color: theme.textSecondary},
            ]}>
            Phân tích học tập
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'analytics' ? (
        <GradesAnalytics />
      ) : (
        <ScrollView
          style={[styles.container, {backgroundColor: theme.bg}]}
          contentContainerStyle={{paddingBottom: 30}}>
          {/* Stats Summary Board */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1}]}>
              <Icon name="book" size={20} color={theme.primary} />
              <Text style={[styles.statVal, {color: theme.primary}]}>{totalClasses}</Text>
              <Text style={[styles.statLabel, {color: theme.textSecondary}]}>Lớp học</Text>
            </View>

            <View style={[styles.statCard, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1}]}>
              <Icon name="percent" size={18} color="#10B981" />
              <Text style={[styles.statVal, {color: '#10B981'}]}>
                {averageAttendance}%
              </Text>
              <Text style={[styles.statLabel, {color: theme.textSecondary}]}>Chuyên cần</Text>
            </View>

            <View style={[styles.statCard, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1}]}>
              <Icon name="exclamation-circle" size={20} color="#EF4444" />
              <Text style={[styles.statVal, {color: '#EF4444'}]}>
                {totalAbsences}
              </Text>
              <Text style={[styles.statLabel, {color: theme.textSecondary}]}>Nghỉ học</Text>
            </View>
          </View>

          {/* Courses Accordion List */}
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Bảng điểm & Chuyên cần chi tiết
          </Text>

          {courses.length === 0 ? (
            <View style={[styles.emptyContainer, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1}]}>
              <Icon name="graduation-cap" size={50} color={theme.placeholder} />
              <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                Bạn chưa tham gia lớp học nào
              </Text>
            </View>
          ) : (
            courses.map(course => {
              const detail = courseDetails[course.id] || {
                attendanceRate: 100,
                absences: 0,
                presences: 0,
                absentLogs: [],
                assessments: [],
              };
              const isExpanded = expandedCourseId === course.id;
              const activeTab = courseActiveTabs[course.id] || 'grades';

              return (
                <View
                  key={course.id}
                  style={[
                    styles.courseCard,
                    {backgroundColor: theme.card, borderColor: isExpanded ? theme.primary : theme.border},
                  ]}>
                  {/* Header Touchable */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(course.id)}>
                    <View style={{flex: 1}}>
                      <View style={styles.codeRow}>
                        <Text style={[styles.courseCode, {backgroundColor: theme.bgSecondary, color: theme.textSecondary}]}>
                          {course.courseCode}
                        </Text>
                        <View style={styles.rateBadge}>
                          <Text
                            style={[
                              styles.rateBadgeText,
                              {
                                color:
                                  detail.attendanceRate >= 90
                                    ? '#10B981'
                                    : detail.attendanceRate >= 80
                                    ? '#F59E0B'
                                    : '#EF4444',
                              },
                            ]}>
                            Chuyên cần: {detail.attendanceRate}%
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.subjectText, {color: theme.text}]}>{course.subject}</Text>
                    </View>

                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={theme.textSecondary}
                      style={{marginLeft: 10}}
                    />
                  </TouchableOpacity>

                  {/* Progress bar */}
                  <View style={[styles.progressBarBg, {backgroundColor: theme.border}]}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${detail.attendanceRate}%`,
                          backgroundColor:
                            detail.attendanceRate >= 90
                              ? '#10B981'
                              : detail.attendanceRate >= 80
                              ? '#F59E0B'
                              : '#EF4444',
                        },
                      ]}
                    />
                  </View>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <View style={[styles.cardContent, {backgroundColor: theme.bgSecondary, borderColor: theme.border}]}>
                      {/* Nested Tab Switcher */}
                      <View style={[styles.tabBar, {borderColor: theme.border}]}>
                        <TouchableOpacity
                          onPress={() =>
                            setCourseActiveTabs(prev => ({
                              ...prev,
                              [course.id]: 'grades',
                            }))
                          }
                          style={[
                            styles.tabButton,
                            activeTab === 'grades' && {borderBottomColor: theme.primary},
                          ]}>
                          <Text
                            style={[
                              styles.tabButtonText,
                              activeTab === 'grades' ? {color: theme.primary, fontWeight: '700'} : {color: theme.textSecondary},
                            ]}>
                            Bảng điểm ({detail.assessments.length})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            setCourseActiveTabs(prev => ({
                              ...prev,
                              [course.id]: 'absences',
                            }))
                          }
                          style={[
                            styles.tabButton,
                            activeTab === 'absences' && {borderBottomColor: theme.primary},
                          ]}>
                          <Text
                            style={[
                              styles.tabButtonText,
                              activeTab === 'absences' ? {color: theme.primary, fontWeight: '700'} : {color: theme.textSecondary},
                            ]}>
                            Ngày vắng ({detail.absences})
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* TAB CONTENT: GRADES */}
                      {activeTab === 'grades' && (
                        <View style={styles.tabContentContainer}>
                          {detail.assessments.length === 0 ? (
                            <Text style={styles.noDataText}>
                              Chưa có cột điểm/bài thi nào được giao.
                            </Text>
                          ) : (
                            detail.assessments.map(a => (
                              <View key={a.id} style={[styles.gradeItem, {backgroundColor: theme.card, borderColor: theme.border}]}>
                                <View style={{flex: 1}}>
                                  <Text style={[styles.gradeTitle, {color: theme.text}]}>
                                    {a.title}
                                  </Text>
                                  <View style={styles.badgeRow}>
                                    <Text style={[styles.typeText, {backgroundColor: theme.bgSecondary, color: theme.primary}]}>
                                      {getAssessmentTypeLabel(a.type)}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.statusText,
                                        getStatusStyle(a.submissionStatus),
                                      ]}>
                                      {getStatusLabel(a.submissionStatus)}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.scoreBox}>
                                  {a.submissionStatus === 'GRADED' &&
                                  a.studentScore !== null ? (
                                    <Text style={[styles.scoreText, {color: theme.textSecondary}]}>
                                      <Text style={[styles.scoreTextMain, {color: '#10B981'}]}>
                                        {a.studentScore}
                                      </Text>
                                      /{a.maxScore}
                                    </Text>
                                  ) : (
                                    <Text style={[styles.pendingScoreText, {color: theme.placeholder}]}>
                                      --/{a.maxScore}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}

                      {/* TAB CONTENT: ATTENDANCE HISTORY */}
                      {activeTab === 'absences' && (
                        <View style={styles.tabContentContainer}>
                          {detail.mappedAttendanceLogs.length === 0 ? (
                            <Text style={[styles.noDataText, {color: theme.textSecondary}]}>
                              Chưa có buổi học nào được điểm danh.
                            </Text>
                          ) : (
                            detail.mappedAttendanceLogs.map(log => (
                              <View key={log.id} style={[
                                styles.absenceItem,
                                log.isAttendance
                                  ? {borderColor: isDark ? '#10B98140' : '#C8E6C9', backgroundColor: isDark ? '#10B98115' : '#F9FFF9'}
                                  : {borderColor: isDark ? '#EF444440' : '#FFEBEB', backgroundColor: isDark ? '#EF444415' : '#FFFAFA'}
                              ]}>
                                <View style={styles.absenceLeft}>
                                  <Icon
                                    name={log.isAttendance ? "check-circle" : "times-circle"}
                                    size={16}
                                    color={log.isAttendance ? "#10B981" : "#EF4444"}
                                  />
                                  <Text style={[styles.absenceText, {marginLeft: 8, color: theme.text}]}>
                                    Buổi học số {log.lectureNumber}
                                  </Text>
                                  <Text style={{fontSize: 11, color: log.isAttendance ? '#10B981' : '#EF4444', fontWeight: 'bold', marginLeft: 10}}>
                                    ({log.isAttendance ? 'Đi học' : 'Vắng mặt'})
                                  </Text>
                                </View>
                                <Text style={[styles.absenceDate, {color: theme.textSecondary}]}>
                                  {log.date} - {log.time}
                                </Text>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  emptyText: {
    marginTop: 10,
    color: '#888',
    fontWeight: '600',
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    overflow: 'hidden',
  },
  expandedCard: {
    borderColor: 'tomato',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseCode: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#F0F2F5',
    color: '#555',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  rateBadge: {
    marginLeft: 10,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  subjectText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
  },
  progressBarBg: {
    height: 3,
    backgroundColor: '#E8ECF2',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  cardContent: {
    padding: 12,
    backgroundColor: '#FAFCFF',
    borderTopWidth: 1,
    borderColor: '#F0F2F5',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E8ECF2',
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTabButton: {
    borderColor: 'tomato',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: 'tomato',
    fontWeight: 'bold',
  },
  tabContentContainer: {
    paddingVertical: 5,
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    paddingVertical: 15,
    fontStyle: 'italic',
  },
  gradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8ECF2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  gradeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#F0F4FF',
    color: '#3F51B5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  statusGraded: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  statusSubmitted: {
    backgroundColor: '#E3F2FD',
    color: '#2196F3',
  },
  statusInProgress: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
  statusNotStarted: {
    backgroundColor: '#ECEFF1',
    color: '#607D8B',
  },
  scoreBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  scoreText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  scoreTextMain: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '900',
  },
  pendingScoreText: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },
  perfectBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  perfectTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 6,
  },
  perfectSubtitle: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    textAlign: 'center',
  },
  absenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFEBEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  absenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  absenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  absenceDate: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    justifyContent: 'space-around',
  },
  topTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  activeTopTabButton: {
    backgroundColor: '#8A4C7D',
  },
  topTabButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  activeTopTabButtonText: {
    color: '#ffffff',
  },
});
