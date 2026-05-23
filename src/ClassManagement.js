import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';
import { API_URL } from '@env';
import ClassCard from './ClassCard';
import { getData } from './Utility';
import { useFocusEffect } from '@react-navigation/native';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);

  const fetchData = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/student/get-my-course`,
      headers: {
        'Authorization': 'Bearer ' + await getData('accessToken')
      }
    };
    axios.request(config)
      .then((response) => {
        setClasses(response.data);
        console.log(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.text1}>Các lớp của bạn</Text>
      </View>
      <View style={styles.classList}>
        <FlatList
          data={classes}
          renderItem={({ item }) => <ClassCard classInfo={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#ECF0F1',
  },
  text1: {
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute'
  },
  classList: {
    flex: 10,
    width: "100%",
    padding: 15
  },
  activeBar: {
    backgroundColor: '#ECF0F1',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#34568B',
    padding: 10,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});