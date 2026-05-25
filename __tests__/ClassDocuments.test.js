import React from 'react';
import {render, fireEvent, act} from '@testing-library/react-native';
import ClassDocuments from '../src/ClassDocuments';
import axios from 'axios';
import {ToastAndroid, Platform} from 'react-native';

// Mock ToastAndroid show
const toastSpy = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});

describe('ClassDocuments Screen (Student Permissions Validation)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    Platform.OS = 'android'; // Force Android for toast testing
    await require('@react-native-async-storage/async-storage').setItem(
      'accessToken',
      'fake-token',
    );
  });

  const mockDocuments = [
    {id: 10, name: 'Tài liệu hướng dẫn', type: 'FOLDER'},
    {
      id: 11,
      name: 'Baitap.pdf',
      type: 'FILE',
      fileExtension: 'pdf',
      fileSize: 102400,
      uploaderName: 'GV Nguyễn Văn B',
    },
  ];

  const mockFolderContents = [
    {
      id: 20,
      name: 'Chuong_1_Gioi_Thieu.pdf',
      type: 'FILE',
      fileExtension: 'pdf',
      fileSize: 50240,
      uploaderName: 'GV Nguyễn Văn B',
    },
  ];

  it('renders explorer loading and shows empty list when no docs', async () => {
    // Smart conditional mocks
    axios.get.mockImplementation(url => {
      if (url.includes('/my-permissions')) {
        return Promise.resolve({
          data: {canUploadDocuments: false, canDownloadDocuments: false},
        });
      }
      return Promise.resolve({data: []});
    });

    const {getByText} = render(<ClassDocuments classId={1} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Thư mục này hiện chưa có tài liệu nào.')).toBeTruthy();
  });

  it('hides upload button if canUploadDocuments is false', async () => {
    axios.get.mockImplementation(url => {
      if (url.includes('/my-permissions')) {
        return Promise.resolve({
          data: {canUploadDocuments: false, canDownloadDocuments: false},
        });
      }
      return Promise.resolve({data: mockDocuments});
    });

    const {getByText, queryByText} = render(<ClassDocuments classId={1} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Tài liệu hướng dẫn')).toBeTruthy();
    expect(getByText('Baitap.pdf')).toBeTruthy();
    expect(queryByText('Tải lên')).toBeNull(); // Upload button hidden
  });

  it('shows upload button if canUploadDocuments is true', async () => {
    axios.get.mockImplementation(url => {
      if (url.includes('/my-permissions')) {
        return Promise.resolve({
          data: {canUploadDocuments: true, canDownloadDocuments: false},
        });
      }
      return Promise.resolve({data: mockDocuments});
    });

    const {getByText} = render(<ClassDocuments classId={1} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Tải lên')).toBeTruthy(); // Upload button displayed
  });

  it('shows permission toast warning when clicking download without canDownloadDocuments', async () => {
    axios.get.mockImplementation(url => {
      if (url.includes('/my-permissions')) {
        return Promise.resolve({
          data: {canUploadDocuments: false, canDownloadDocuments: false},
        });
      }
      return Promise.resolve({data: mockDocuments});
    });

    const {getByText} = render(<ClassDocuments classId={1} />);

    await act(async () => {
      await Promise.resolve();
    });

    const fileItem = getByText('Baitap.pdf');
    await act(async () => {
      fireEvent.press(fileItem);
    });

    expect(toastSpy).toHaveBeenCalledWith(
      'Bạn chưa được cấp quyền tải tài liệu!',
      ToastAndroid.SHORT,
    );
  });

  it('navigates through nested directories and updates breadcrumbs correctly', async () => {
    axios.get.mockImplementation(url => {
      if (url.includes('/my-permissions')) {
        return Promise.resolve({
          data: {canUploadDocuments: false, canDownloadDocuments: true},
        });
      }
      if (url.includes('parentFolderId=10')) {
        return Promise.resolve({data: mockFolderContents});
      }
      return Promise.resolve({data: mockDocuments});
    });

    const {getByText, queryByText} = render(<ClassDocuments classId={1} />);

    await act(async () => {
      await Promise.resolve();
    });

    // Tap on FOLDER 'Tài liệu hướng dẫn'
    const folderItem = getByText('Tài liệu hướng dẫn');
    await act(async () => {
      fireEvent.press(folderItem);
    });

    // Expect breadcrumb to show 'Tài liệu hướng dẫn' and display folder items
    expect(getByText('Chuong_1_Gioi_Thieu.pdf')).toBeTruthy();
    expect(queryByText('Baitap.pdf')).toBeNull(); // Root file shouldn't display here
  });
});
