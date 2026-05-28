import {Text, View, TouchableOpacity, StyleSheet, useColorScheme} from 'react-native';
import React from 'react';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {getData, storeData, getThemeColors} from './Utility';

export default function ClassCard(props) {
  const navigation = useNavigation();
  const {classInfo} = props;
  
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  const onPress = async () => {
    console.log(`You pressed ${classInfo.courseCode}`);
    await storeData('currentClassId', classInfo.id.toString());
    await storeData('currentClassCode', classInfo.courseCode);
    await storeData('currentClassSubject', classInfo.subject);
    await storeData('currentClassDescription', classInfo.description ?? '');
    navigation.navigate('ClassDetail', {classInfo: classInfo});
  };

  // Select a contextual icon based on subject
  const getSubjectIcon = (subjectName) => {
    if (!subjectName) return 'book';
    const name = subjectName.toLowerCase();
    if (name.includes('lập trình') || name.includes('web') || name.includes('tin học') || name.includes('phần mềm') || name.includes('code') || name.includes('cấu trúc dữ liệu')) {
      return 'code';
    }
    if (name.includes('toán') || name.includes('giải tích') || name.includes('đại số') || name.includes('thống kê')) {
      return 'calculator';
    }
    if (name.includes('tiếng') || name.includes('ngôn ngữ') || name.includes('anh') || name.includes('english')) {
      return 'language';
    }
    if (name.includes('mạng') || name.includes('hệ điều hành') || name.includes('phần cứng') || name.includes('kiến trúc')) {
      return 'laptop';
    }
    return 'book';
  };

  // Dynamic border/tag color based on course code hash
  const getAccentColor = (code) => {
    if (!code) return theme.primary;
    const charCode = code.charCodeAt(0) || 0;
    return charCode % 2 === 0 ? theme.primary : theme.secondary;
  };

  const accentColor = getAccentColor(classInfo.courseCode);

  return (
    <TouchableOpacity 
      style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.accentLine, {backgroundColor: accentColor}]} />
      
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={[styles.codeTag, {backgroundColor: accentColor + '15'}]}>
            <Text style={[styles.courseCode, {color: accentColor}]}>{classInfo.courseCode}</Text>
          </View>
          <View style={[styles.iconBg, {backgroundColor: theme.bgSecondary}]}>
            <Icon name={getSubjectIcon(classInfo.subject)} size={16} color={accentColor} />
          </View>
        </View>

        <Text style={[styles.subject, {color: theme.text}]}>{classInfo.subject}</Text>
        
        {classInfo.description ? (
          <Text style={[styles.description, {color: theme.textSecondary}]} numberOfLines={2}>
            {classInfo.description}
          </Text>
        ) : (
          <Text style={[styles.descriptionPlaceholder, {color: theme.placeholder}]}>
            Không có mô tả lớp học
          </Text>
        )}
        
        <View style={styles.footerRow}>
          <Text style={[styles.enterText, {color: accentColor}]}>Xem chi tiết</Text>
          <Icon name="chevron-right" size={10} color={accentColor} style={styles.chevron} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  accentLine: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subject: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  descriptionPlaceholder: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  enterText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  chevron: {
    marginTop: 1,
  },
});
