import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import {API_URL} from '@env';
import Icon from 'react-native-vector-icons/FontAwesome';
import {getData, getThemeColors} from './Utility';

export default function GradesAnalytics() {
  const isDark = useColorScheme() === 'dark';
  const colors = getThemeColors(isDark);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getData('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/analytics/student/summary`, {
        headers: {Authorization: `Bearer ${token}`},
      });
      setData(response.data);
    } catch (err) {
      console.log('Error fetching student mobile analytics:', err);
      setError('Không thể tải dữ liệu phân tích học tập.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
          Đang tải phân tích học tập...
        </Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, {backgroundColor: colors.bg, padding: 20}]}>
        <Icon name="exclamation-triangle" size={50} color="red" />
        <Text style={[styles.errorText, {color: colors.text}]}>
          {error || 'Đã xảy ra lỗi'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, {backgroundColor: colors.primary}]}
          onPress={fetchAnalytics}>
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    totalCourses,
    averageAttendance,
    totalAbsences,
    gpaProgress = [],
    absencesBreakdown = [],
  } = data;

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.bg}]}
      contentContainerStyle={styles.content}>
      {/* Analytics Title */}
      <View style={styles.header}>
        <Icon
          name="bar-chart"
          size={24}
          color={isDark ? '#38bdf8' : '#8A4C7D'}
        />
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          Phân Tích Học Tập Cá Nhân
        </Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <View
          style={[
            styles.kpiCard,
            {backgroundColor: colors.card, borderColor: colors.border},
          ]}>
          <Text style={[styles.kpiTitle, {color: colors.textSecondary}]}>
            Môn Học
          </Text>
          <Text style={[styles.kpiValue, {color: colors.text}]}>
            {totalCourses}
          </Text>
        </View>
        <View
          style={[
            styles.kpiCard,
            {backgroundColor: colors.card, borderColor: colors.border},
          ]}>
          <Text style={[styles.kpiTitle, {color: colors.textSecondary}]}>
            Chuyên Cần
          </Text>
          <Text
            style={[
              styles.kpiValue,
              {color: averageAttendance >= 80 ? 'green' : 'orange'},
            ]}>
            {averageAttendance}%
          </Text>
        </View>
        <View
          style={[
            styles.kpiCard,
            {backgroundColor: colors.card, borderColor: colors.border},
          ]}>
          <Text style={[styles.kpiTitle, {color: colors.textSecondary}]}>
            Nghỉ Học
          </Text>
          <Text style={[styles.kpiValue, {color: 'red'}]}>{totalAbsences}</Text>
        </View>
      </View>

      {/* GPA Progress List */}
      <View
        style={[
          styles.section,
          {backgroundColor: colors.card, borderColor: colors.border},
        ]}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>
          Tiến Trình Điểm Học Phần
        </Text>
        {gpaProgress.length > 0 ? (
          gpaProgress.map((item, idx) => (
            <View
              key={idx}
              style={[styles.itemRow, {borderBottomColor: colors.border}]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.itemCode, {color: colors.primary}]}>
                  {item.courseCode}
                </Text>
                <Text
                  style={[styles.itemName, {color: colors.text}]}
                  numberOfLines={1}>
                  {item.subject}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemGrade, {color: colors.text}]}>
                  {item.averageGrade.toFixed(1)}
                </Text>
                <Text style={[styles.itemSub, {color: colors.textSecondary}]}>
                  /10đ
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
            Chưa có dữ liệu điểm.
          </Text>
        )}
      </View>

      {/* Absences Breakdown Bar List */}
      <View
        style={[
          styles.section,
          {backgroundColor: colors.card, borderColor: colors.border},
        ]}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>
          Số Buổi Vắng Theo Tháng
        </Text>
        {absencesBreakdown.length > 0 ? (
          absencesBreakdown.map((item, idx) => {
            const maxAbs = Math.max(
              ...absencesBreakdown.map(i => i.absences),
              1,
            );
            const ratio = item.absences / maxAbs;

            return (
              <View key={idx} style={styles.barContainer}>
                <View style={styles.barTextRow}>
                  <Text style={[styles.barLabel, {color: colors.text}]}>
                    {item.month}
                  </Text>
                  <Text style={[styles.barValue, {color: 'red'}]}>
                    {item.absences} buổi
                  </Text>
                </View>
                <View
                  style={[
                    styles.barBg,
                    {backgroundColor: isDark ? '#334155' : '#E2E8F0'},
                  ]}>
                  <View style={[styles.barFill, {width: `${ratio * 100}%`}]} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
            Không có buổi vắng nào.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: 'bold',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flex: 1,
  },
  itemCode: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  itemGrade: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSub: {
    fontSize: 10,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  barContainer: {
    marginBottom: 12,
  },
  barTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  barBg: {
    height: 8,
    borderRadius: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
});
