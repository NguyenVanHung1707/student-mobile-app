import React from 'react';
import {render, fireEvent, act} from '@testing-library/react-native';
import GradesAndAttendance from '../src/GradesAndAttendance';
import axios from 'axios';

describe('GradesAndAttendance Screen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await require('@react-native-async-storage/async-storage').setItem(
      'accessToken',
      'fake-token',
    );
  });

  const mockCourses = [
    {id: 1, courseCode: 'INT3306', subject: 'Phát triển ứng dụng Web'},
    {id: 2, courseCode: 'INT3401', subject: 'Trí tuệ nhân tạo'},
  ];

  const mockAttendanceCourse1 = [
    {
      id: 101,
      isAttendance: true,
      attendanceTime: '2026-05-20T08:00:00.000Z',
      lectureNumber: 1,
    },
    {
      id: 102,
      isAttendance: false,
      attendanceTime: '2026-05-22T08:00:00.000Z',
      lectureNumber: 2,
    },
  ]; // 50% attendance, 1 absence

  const mockAttendanceCourse2 = [
    {
      id: 201,
      isAttendance: true,
      attendanceTime: '2026-05-21T08:00:00.000Z',
      lectureNumber: 1,
    },
  ]; // 100% attendance, 0 absences

  const mockAssessmentsCourse1 = [
    {
      id: 301,
      title: 'Bài tập 1',
      type: 'ASSIGNMENT',
      submissionStatus: 'GRADED',
      studentScore: 8,
      maxScore: 10,
    },
  ];

  it('renders stats summary cards and empty state when no courses', async () => {
    axios.get.mockImplementation(() => Promise.resolve({data: []}));

    const {getByText} = render(<GradesAndAttendance />);

    // Wait for the async effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Lớp học')).toBeTruthy();
    expect(getByText('Chuyên cần')).toBeTruthy();
    expect(getByText('Nghỉ học')).toBeTruthy();
    expect(getByText('Bạn chưa tham gia lớp học nào')).toBeTruthy();
  });

  it('fetches all data concurrently and renders overall metrics and courses list', async () => {
    // Smart timing-independent implementation
    axios.get.mockImplementation(url => {
      if (url.includes('/student/get-my-course')) {
        return Promise.resolve({data: mockCourses});
      }
      if (url.includes('/student/get-my-attendance-in-a-course')) {
        if (url.includes('courseId=1')) {
          return Promise.resolve({data: mockAttendanceCourse1});
        }
        if (url.includes('courseId=2')) {
          return Promise.resolve({data: mockAttendanceCourse2});
        }
      }
      if (url.includes('/assessments')) {
        if (url.includes('/courses/1/')) {
          return Promise.resolve({data: mockAssessmentsCourse1});
        }
        return Promise.resolve({data: []});
      }
      return Promise.resolve({data: []});
    });

    const {getByText} = render(<GradesAndAttendance />);

    await act(async () => {
      await Promise.resolve();
    });

    // 2 courses
    expect(getByText('2')).toBeTruthy();
    // Avg Attendance: (50% + 100%) / 2 = 75%
    expect(getByText('75%')).toBeTruthy();
    // Total Absences: 1
    expect(getByText('1')).toBeTruthy();

    // Verify course cards are rendered
    expect(getByText('INT3306')).toBeTruthy();
    expect(getByText('Phát triển ứng dụng Web')).toBeTruthy();
    expect(getByText('INT3401')).toBeTruthy();
    expect(getByText('Trí tuệ nhân tạo')).toBeTruthy();
  });

  it('toggles course accordion and switches tabs to view grades and absences', async () => {
    axios.get.mockImplementation(url => {
      if (url.includes('/student/get-my-course')) {
        return Promise.resolve({data: mockCourses});
      }
      if (url.includes('/student/get-my-attendance-in-a-course')) {
        if (url.includes('courseId=1')) {
          return Promise.resolve({data: mockAttendanceCourse1});
        }
        if (url.includes('courseId=2')) {
          return Promise.resolve({data: mockAttendanceCourse2});
        }
      }
      if (url.includes('/assessments')) {
        if (url.includes('/courses/1/')) {
          return Promise.resolve({data: mockAssessmentsCourse1});
        }
        return Promise.resolve({data: []});
      }
      return Promise.resolve({data: []});
    });

    const {getByText, queryByText} = render(<GradesAndAttendance />);

    await act(async () => {
      await Promise.resolve();
    });

    // Click to expand INT3306
    const courseHeader = getByText('INT3306');
    await act(async () => {
      fireEvent.press(courseHeader);
    });

    // Verify detail elements inside the expanded accordion using exact text rendering
    expect(getByText('Bảng điểm (1)')).toBeTruthy();
    expect(getByText('Ngày vắng (1)')).toBeTruthy();

    // Verify default active tab is Bảng Điểm and contains Bài tập 1
    expect(getByText('Bài tập 1')).toBeTruthy();
    expect(getByText('Bài tập')).toBeTruthy(); // type label
    expect(getByText('Đã chấm')).toBeTruthy(); // status label
    expect(getByText('8/10')).toBeTruthy(); // score

    // Switch to Ngày vắng tab
    const absencesTab = getByText('Ngày vắng (1)');
    await act(async () => {
      fireEvent.press(absencesTab);
    });

    // Verify absent logs display
    expect(getByText('Buổi học số 2')).toBeTruthy(); // Lecture Number 2
    expect(queryByText('Bài tập 1')).toBeNull(); // Graded assignment shouldn't show in absences tab
  });
});
