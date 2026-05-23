import { Text, View, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { useNavigation } from '@react-navigation/native';
import { getData, storeData } from './Utility';

export default function ClassCard(props) {
  const navigation = useNavigation();
  const { classInfo } = props;
  const onPress = async () => {
    console.log(`You pressed ${classInfo.courseCode}`)
    await storeData('currentClassId', classInfo.id.toString());
    await storeData('currentClassCode', classInfo.courseCode);
    await storeData('currentClassSubject', classInfo.subject);
    await storeData('currentClassDescription', classInfo.description ?? '');
    navigation.navigate('ClassDetail', { classInfo: classInfo })
  }
  return (
    <>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <View style={styles.classInfoContainer}>
          <Text style={styles.courseCode}>{`Mã lớp: ${classInfo.courseCode}`}</Text>
          <Text style={styles.subject}>{`Môn học: ${classInfo.subject}`}</Text>
          <Text style={styles.description}>{`Mô tả: ${classInfo.description}`}</Text>
        </View>
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 10,
        paddingTop: 10,
        paddingBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc'   ,
        backgroundColor: '#00ff99',
        borderRadius: 10,
    },
    classInfoContainer: {
        backgroundColor: '#fff', // Set background color
        padding: 15, // Add padding for spacing
        borderRadius: 10, // Add rounded corners
        marginBottom: 10, // Add spacing between class info items
      },
      courseCode: {
        fontSize: 18,
        fontWeight: 'bold',
      },
      subject: {
        fontSize: 15,
        marginTop: 5, // Add margin between course code and subject
      },
      description: {
        fontSize: 15,
        marginTop: 5, // Add margin between subject and description
      },
});