import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, TouchableOpacity, PermissionsAndroid, ActivityIndicator } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import axios from 'axios';
import { API_URL } from '@env';
import { getData } from './Utility';
import Geolocation from 'react-native-geolocation-service';

export default function AttendanceForm() {
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmitCode = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_URL}/student/get-form-by-code?code=${code}`,
      headers: {
        'Authorization': 'Bearer ' + await getData('accessToken')
      }
    };

    axios.request(config)
      .then((response) => {
        setFormData(response.data);
        const falseAnswers = response.data.questions.flatMap(question =>
          question.answers.map(answer => ({ id: answer.id, isTrue: false }))
        );
        setAnswers(falseAnswers);
      })
      .catch((error) => {
        Alert.alert("Có lỗi xảy ra!");
        console.log(error);
      });
  };

  const handleSubmitAnswers = async () => {
    setIsLoading(true);
    const getCurrentLocation = () => {
      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          position => {
            const { latitude, longitude } = position.coords;
            resolve({ latitude, longitude });
          },
          error => {
            reject(error.message);
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );
      });
    };

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Yêu cầu quyền truy cập vị trí',
            message: 'Ứng dụng cần quyền truy cập vị trí để lấy tọa độ địa lý hiện tại.',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Hủy bỏ',
            buttonPositive: 'Đồng ý',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          alert('Quyền truy cập vị trí bị từ chối.');
          return;
        }
      }

      const location = await getCurrentLocation();


      let submitData = JSON.stringify({
        "code": formData.code,
        "latitude": location.latitude, // Gửi latitude
        "longitude": location.longitude, // Gửi longitude
        answers: answers.map((answer) => ({
          id: answer.id,
          isTrue: answer.isTrue
        }))
      });
      console.log(submitData);

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${API_URL}/student/submit-answer`,
        headers: {
          'Authorization': 'Bearer ' + await getData('accessToken'),
          'Content-Type': 'application/json'
        },
        data: submitData
      };
      setIsLoading(false);

      axios.request(config)
        .then((response) => {
          if (response.status === 200) {
            Alert.alert("Success", "Bạn đã điểm danh thành công!");
          }
          if (response.status === 400 && response.data.message === "Answer is not correct") {
            Alert.alert("Fail", "Bạn đã trả lời sai câu hỏi!");
          }
          if (response.status === 400 && response.data.message === "Location is not correct") {
            Alert.alert("Fail", "Bạn không ở trong phạm vi điểm danh!");
          }
        })
        .catch((error) => {
          console.log(error);
          console.log(error.response.data);
          if (error.response.data.message === "Answer is not correct") {
            Alert.alert("Fail", "Bạn đã trả lời sai câu hỏi!");
          }
          if (error.response.data.message === "Location is not correct") {
            Alert.alert("Fail", "Bạn không ở trong phạm vi điểm danh!");
          }
        });

    } catch (error) {
      console.error(error);
      alert('Lỗi khi lấy vị trí hiện tại. Vui lòng kiểm tra lại quyền truy cập vị trí.');
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, answerId) => {
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].id === answerId) {
        answers[i].isTrue = !answers[i].isTrue;
        setAnswers([...answers]);
        return;
      }
    }
  };

  const backToFillCode = () => {
    setFormData(null);
    setAnswers([]);
  };

  const checkIsTrueFromId = (answerId) => {
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
    <View style={styles.container}>
      {!formData ? (
        <>
          <Text style={styles.title}>Nhập mã của bạn</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã"
              value={code}
              onChangeText={setCode}
            />
            <Button title="Gửi" onPress={handleSubmitCode} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.attendanceTitle}>Điểm danh</Text>
          <FlatList
            data={formData.questions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.questionContainer}>
                <Text style={styles.question}>Câu hỏi {index + 1}: {item.content}</Text>
                {item.answers.map((answer, answerIndex) => (
                  <View key={answer.id} style={styles.answerContainer}>
                    <Text style={styles.answerText}>{answer.content}</Text>
                    <CheckBox
                      value={checkIsTrueFromId(answer.id)}
                      onValueChange={() => handleAnswerChange(index, answer.id)}
                      style={styles.checkbox}
                    />
                  </View>
                ))}
              </View>
            )}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleSubmitAnswers}>
              <Text style={styles.buttonText}>Gửi câu trả lời</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={backToFillCode}>
              <Text style={styles.buttonText}>Quay lại điền code khác</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? ( // Render loading indicator if isLoading is true
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007BFF" />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    flex: 1,
    marginRight: 10,
    borderRadius: 5,
  },
  attendanceTitle: {
    fontSize: 28,
    marginBottom: 30,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionContainer: {
    marginBottom: 20,
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    elevation: 2,
  },
  question: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: 'bold',
    color: '#555',
  },
  answerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  answerText: {
    fontSize: 16,
    color: '#333',
  },
  checkbox: {
    marginLeft: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    backgroundColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
