import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CompleteProfile from '../src/CompleteProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Mock Alert to track calls
const alertSpy = jest.spyOn(Alert, 'alert');

describe('CompleteProfile Screen', () => {
  const mockNavigation = {
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all input fields and buttons correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <CompleteProfile navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Họ và tên')).toBeTruthy();
    expect(getByPlaceholderText('Mã số sinh viên (MSSV)')).toBeTruthy();
    expect(getByText('XÁC NHẬN CẬP NHẬT')).toBeTruthy();
    expect(getByText('Đăng xuất')).toBeTruthy();
  });

  it('shows an alert when attempting to submit with empty fields', async () => {
    const { getByText } = render(
      <CompleteProfile navigation={mockNavigation} />
    );

    const submitButton = getByText('XÁC NHẬN CẬP NHẬT');
    
    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Thông báo',
      'Vui lòng nhập đầy đủ họ tên và mã số sinh viên!'
    );
  });

  it('sends API request and navigates to Home on successful submit', async () => {
    // Mock successful axios post request
    axios.request.mockResolvedValueOnce({ status: 200, data: { success: true } });
    
    const { getByPlaceholderText, getByText } = render(
      <CompleteProfile navigation={mockNavigation} />
    );

    const nameInput = getByPlaceholderText('Họ và tên');
    const codeInput = getByPlaceholderText('Mã số sinh viên (MSSV)');
    const submitButton = getByText('XÁC NHẬN CẬP NHẬT');

    fireEvent.changeText(nameInput, 'Nguyen Van Student');
    fireEvent.changeText(codeInput, 'ST0005');

    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(axios.request).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Thành công',
      'Hồ sơ sinh viên đã được cập nhật thành công!'
    );
    expect(mockNavigation.replace).toHaveBeenCalledWith('Home');
  });

  it('performs logout successfully when clicking logout button', async () => {
    const spyRemoveItem = jest.spyOn(AsyncStorage, 'removeItem');

    const { getByText } = render(
      <CompleteProfile navigation={mockNavigation} />
    );

    const logoutButton = getByText('Đăng xuất');

    await act(async () => {
      fireEvent.press(logoutButton);
    });

    expect(spyRemoveItem).toHaveBeenCalledWith('accessToken');
    expect(mockNavigation.replace).toHaveBeenCalledWith('Login');
  });
});
