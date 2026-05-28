import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_BASE_URL} from './config';
import {formatToDate, getThemeColors} from './Utility';

const DAYS_MAP = [
  {num: 1, label: 'Thứ Hai', offset: 0},
  {num: 2, label: 'Thứ Ba', offset: 1},
  {num: 3, label: 'Thứ Tư', offset: 2},
  {num: 4, label: 'Thứ Năm', offset: 3},
  {num: 5, label: 'Thứ Sáu', offset: 4},
  {num: 6, label: 'Thứ Bảy', offset: 5},
  {num: 7, label: 'Chủ Nhật', offset: 6},
];

export default function TimetableScreen() {
  const isDark = false; // standard theme matching main app light mode
  const colors = getThemeColors(isDark);

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [loadingSemesters, setLoadingSemesters] = useState(true);

  const [weeks, setWeeks] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(-1);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 7 : new Date().getDay()); // Default to today (1 = Mon, 7 = Sun)
  const [error, setError] = useState(null);

  // 1. Fetch Semesters on Mount
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const token = await AsyncStorage.getItem('accessToken');
        const config = {headers: {Authorization: 'Bearer ' + token}};

        const res = await axios.get(`${API_BASE_URL}/semesters`, config);
        const semestersData = res.data || [];
        setSemesters(semestersData);

        const activeSem = semestersData.find(s => s.isActive);
        if (activeSem) {
          setSelectedSemesterId(activeSem.id);
        } else if (semestersData.length > 0) {
          setSelectedSemesterId(semestersData[0].id);
        }
      } catch (err) {
        console.error('Error fetching semesters:', err);
        setError('Không thể tải danh sách học kỳ.');
      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, []);

  // 2. Fetch Weeks when selectedSemesterId changes
  useEffect(() => {
    if (!selectedSemesterId) return;

    const fetchWeeks = async () => {
      try {
        setLoadingWeeks(true);
        const token = await AsyncStorage.getItem('accessToken');
        const config = {headers: {Authorization: 'Bearer ' + token}};

        const res = await axios.get(`${API_BASE_URL}/semesters/${selectedSemesterId}/weeks`, config);
        const sortedWeeks = (res.data || []).sort((a, b) => a.weekNumber - b.weekNumber);
        setWeeks(sortedWeeks);

        if (sortedWeeks.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let currentWeekIdx = sortedWeeks.findIndex(w => {
            const start = new Date(w.startDate);
            const end = new Date(w.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
          });

          if (currentWeekIdx === -1) {
            currentWeekIdx = 0; // Default to Week 1
          }
          setSelectedWeekIndex(currentWeekIdx);
        }
      } catch (err) {
        console.error('Error fetching weeks:', err);
        setError('Không thể tải danh sách tuần học.');
      } finally {
        setLoadingWeeks(false);
      }
    };

    fetchWeeks();
  }, [selectedSemesterId]);

  // 3. Fetch Timetable Slots when Semester or Week Index changes
  useEffect(() => {
    if (!selectedSemesterId || selectedWeekIndex < 0 || !weeks[selectedWeekIndex]) return;

    const fetchTimetable = async () => {
      try {
        setLoadingSchedules(true);
        const token = await AsyncStorage.getItem('accessToken');
        const config = {headers: {Authorization: 'Bearer ' + token}};
        const activeWeek = weeks[selectedWeekIndex];

        const res = await axios.get(
          `${API_BASE_URL}/timetable?semester_id=${selectedSemesterId}&week_number=${activeWeek.weekNumber}`,
          config,
        );
        const responseData = res.data?.items || [];
        const mapped = responseData.map(slot => ({
          id: slot.scheduleId,
          dayOfWeek: slot.dayOfWeek,
          date: slot.date,
          startTime: slot.startTime?.substring(0, 5),
          endTime: slot.endTime?.substring(0, 5),
          roomName: slot.roomName || 'Chưa xếp phòng',
          courseCode: slot.courseCode,
          subject: slot.subject,
          courseId: slot.courseId,
          teacherName: slot.teacherName,
          status: slot.status,
        }));
        setSchedules(mapped);
      } catch (err) {
        console.error('Error fetching schedules:', err);
        setError('Không thể tải lịch học tuần.');
      } finally {
        setLoadingSchedules(false);
      }
    };

    fetchTimetable();
  }, [selectedSemesterId, selectedWeekIndex, weeks]);

  const activeWeek = selectedWeekIndex >= 0 && selectedWeekIndex < weeks.length ? weeks[selectedWeekIndex] : null;

  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeekIndex < weeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    }
  };

  const getWeekTypeBadgeText = type => {
    switch (type) {
      case 'STUDY':
        return 'Tuần Học';
      case 'MIDTERM_EXAM':
        return 'Thi Giữa Kỳ';
      case 'FINAL_EXAM':
        return 'Thi Cuối Kỳ';
      case 'HOLIDAY':
        return 'Nghỉ Lễ';
      default:
        return type;
    }
  };

  const getWeekTypeBadgeStyle = type => {
    switch (type) {
      case 'STUDY':
        return styles.badgeStudy;
      case 'MIDTERM_EXAM':
        return styles.badgeMidterm;
      case 'FINAL_EXAM':
        return styles.badgeFinal;
      case 'HOLIDAY':
        return styles.badgeHoliday;
      default:
        return styles.badgeDefault;
    }
  };

  const getDayFormattedDate = (baseStr, offsetDays) => {
    if (!baseStr) return '';
    const date = new Date(baseStr);
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
  };

  const checkIsToday = offsetDays => {
    if (!activeWeek) return false;
    const base = new Date(activeWeek.startDate);
    base.setDate(base.getDate() + offsetDays);
    return base.toLocaleDateString('vi-VN') === new Date().toLocaleDateString('vi-VN');
  };

  const renderScheduleItem = ({item}) => (
    <View style={styles.slotCard}>
      <View style={styles.slotAccent} />
      <View style={styles.slotContent}>
        <View style={styles.slotHeader}>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
          <Text style={styles.roomName}>📍 {item.roomName}</Text>
        </View>
        <Text style={styles.subjectName}>{item.subject}</Text>
        <View style={styles.slotFooter}>
          <View style={styles.footerItem}>
            <Icon name="clock-o" size={12} color="#64748b" />
            <Text style={styles.footerText}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          {item.teacherName && (
            <View style={styles.footerItem}>
              <Icon name="user" size={12} color="#64748b" />
              <Text style={styles.footerText} numberOfLines={1}>
                {item.teacherName}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const filteredSchedules = schedules.filter(s => s.dayOfWeek === selectedDay);

  return (
    <View style={styles.container}>
      {/* Header with Semester Selection */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Thời khóa biểu tuần</Text>
          <Text style={styles.headerSubtitle}>Tra cứu phòng học và thời gian lên lớp</Text>
        </View>
      </View>

      {/* Semester Dropdown Simulation */}
      {semesters.length > 0 && (
        <View style={styles.semesterBar}>
          <Icon name="history" size={14} color="#8A4C7D" style={{marginRight: 6}} />
          <Text style={styles.semesterText}>Học kỳ: </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {semesters.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.semChip,
                  selectedSemesterId === s.id && styles.semChipActive,
                ]}
                onPress={() => setSelectedSemesterId(s.id)}>
                <Text
                  style={[
                    styles.semChipText,
                    selectedSemesterId === s.id && styles.semChipTextActive,
                  ]}>
                  {s.code} {s.isActive ? '🔥' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Week Selector */}
      {weeks.length > 0 && activeWeek && (
        <View style={styles.weekSelector}>
          <TouchableOpacity
            onPress={handlePrevWeek}
            disabled={selectedWeekIndex <= 0}
            style={[styles.weekNavButton, selectedWeekIndex <= 0 && styles.disabledButton]}>
            <Icon name="chevron-left" size={14} color={selectedWeekIndex <= 0 ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>
          <View style={styles.weekInfo}>
            <View style={styles.weekRow}>
              <Text style={styles.weekNumberText}>Tuần {activeWeek.weekNumber}</Text>
              <View style={[styles.badge, getWeekTypeBadgeStyle(activeWeek.weekType)]}>
                <Text style={styles.badgeText}>{getWeekTypeBadgeText(activeWeek.weekType)}</Text>
              </View>
            </View>
            <Text style={styles.weekRangeText}>
              Từ {new Date(activeWeek.startDate).toLocaleDateString('vi-VN')} đến{' '}
              {new Date(activeWeek.endDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleNextWeek}
            disabled={selectedWeekIndex >= weeks.length - 1}
            style={[styles.weekNavButton, selectedWeekIndex >= weeks.length - 1 && styles.disabledButton]}>
            <Icon
              name="chevron-right"
              size={14}
              color={selectedWeekIndex >= weeks.length - 1 ? '#cbd5e1' : '#475569'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Day Selector (Mon -> Sun) */}
      {activeWeek && (
        <View style={styles.daySelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorScroll}>
            {DAYS_MAP.map(day => {
              const isSelected = selectedDay === day.num;
              const isToday = checkIsToday(day.offset);
              const formattedDate = getDayFormattedDate(activeWeek.startDate, day.offset);

              return (
                <TouchableOpacity
                  key={day.num}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipActive,
                    isToday && styles.dayChipToday,
                  ]}
                  onPress={() => setSelectedDay(day.num)}>
                  <Text
                    style={[
                      styles.dayChipLabel,
                      isSelected && styles.dayChipLabelActive,
                      isToday && styles.dayChipLabelToday,
                    ]}>
                    {day.label}
                  </Text>
                  <Text
                    style={[
                      styles.dayChipDate,
                      isSelected && styles.dayChipDateActive,
                      isToday && styles.dayChipDateToday,
                    ]}>
                    {formattedDate}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Schedule Detail Panel */}
      {loadingSemesters || loadingWeeks || loadingSchedules ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8A4C7D" />
          <Text style={styles.loadingText}>Đang nạp thời khóa biểu tuần...</Text>
        </View>
      ) : activeWeek?.weekType === 'HOLIDAY' ? (
        <View style={styles.emptyContainer}>
          <Icon name="coffee" size={48} color="#10b981" />
          <Text style={styles.emptyTitle}>Tuần Nghỉ Lễ!</Text>
          <Text style={styles.emptySubtitle}>
            Không có lịch học trên lớp trong tuần nghỉ lễ. Hãy tận hưởng kỳ nghỉ của bạn nhé!
          </Text>
        </View>
      ) : filteredSchedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="calendar-o" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Không có lịch học</Text>
          <Text style={styles.emptySubtitle}>Học viên không có ca lên lớp nào được lên lịch cho ngày này.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSchedules}
          renderItem={renderScheduleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#8A4C7D',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  semesterBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  semesterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  semChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  semChipActive: {
    backgroundColor: '#8A4C7D',
    borderColor: '#8A4C7D',
  },
  semChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  semChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  disabledButton: {
    opacity: 0.4,
  },
  weekInfo: {
    alignItems: 'center',
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNumberText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginRight: 6,
  },
  weekRangeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  badgeStudy: {
    backgroundColor: '#0284c7',
  },
  badgeMidterm: {
    backgroundColor: '#d97706',
  },
  badgeFinal: {
    backgroundColor: '#e11d48',
  },
  badgeHoliday: {
    backgroundColor: '#059669',
  },
  badgeDefault: {
    backgroundColor: '#64748b',
  },
  daySelectorContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  daySelectorScroll: {
    paddingHorizontal: 15,
  },
  dayChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#f8fafc',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 70,
  },
  dayChipActive: {
    backgroundColor: '#8A4C7D',
    borderColor: '#8A4C7D',
    shadowColor: '#8A4C7D',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  dayChipToday: {
    borderColor: '#8A4C7D',
    borderWidth: 1.5,
  },
  dayChipLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  dayChipLabelActive: {
    color: '#ffffff',
  },
  dayChipLabelToday: {
    color: '#8A4C7D',
  },
  dayChipDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  dayChipDateActive: {
    color: '#e2e8f0',
  },
  dayChipDateToday: {
    color: '#8A4C7D',
  },
  listContainer: {
    padding: 15,
  },
  slotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  slotAccent: {
    width: 6,
    backgroundColor: '#8A4C7D',
  },
  slotContent: {
    flex: 1,
    padding: 15,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  roomName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A4C7D',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    lineHeight: 18,
  },
  slotFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    flex: 1,
  },
  footerText: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 5,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
