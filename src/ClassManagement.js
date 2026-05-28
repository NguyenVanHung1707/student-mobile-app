import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, FlatList, StyleSheet, useColorScheme, ActivityIndicator} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import ClassCard from './ClassCard';
import {getData, getThemeColors} from './Utility';
import {useFocusEffect} from '@react-navigation/native';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const fetchData = async () => {
    setIsLoading(true);
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/student/get-my-course`,
      headers: {
        Authorization: 'Bearer ' + (await getData('accessToken')),
      },
    };
    axios
      .request(config)
      .then(response => {
        setClasses(response.data);
        console.log(response.data);
      })
      .catch(error => {
        console.error(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}>
      {/* Premium Header Banner */}
      <View style={[styles.headerBanner, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSubtitle, {color: theme.primary}]}>QUẢN LÝ HỌC TẬP</Text>
          <Text style={[styles.headerTitle, {color: theme.text}]}>Lớp Học Học Phần</Text>
        </View>
        <View style={[styles.badgeContainer, {backgroundColor: theme.primary + '15'}]}>
          <Text style={[styles.badgeText, {color: theme.primary}]}>
            {classes.length} lớp học
          </Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {isLoading && classes.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loaderText, {color: theme.textSecondary}]}>Đang tải danh sách lớp...</Text>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, {backgroundColor: theme.bgSecondary}]}>
              <Icon name="university" size={48} color={theme.placeholder} />
            </View>
            <Text style={[styles.emptyTitle, {color: theme.text}]}>Không có lớp học nào</Text>
            <Text style={[styles.emptySubtitle, {color: theme.textSecondary}]}>
              Bạn chưa tham gia lớp học học phần nào trong học kỳ này.
            </Text>
          </View>
        ) : (
          <FlatList
            data={classes}
            renderItem={({item}) => <ClassCard classInfo={item} />}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{height: 4}} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  flatListContent: {
    paddingBottom: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
