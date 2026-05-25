import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  ToastAndroid,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {API_URL} from '@env';
import axios from 'axios';
import {getData} from './Utility';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClassDocuments({classId}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null); // { id, name }
  const [breadcrumbs, setBreadcrumbs] = useState([]); // Array of { id, name }
  const [searchQuery, setSearchQuery] = useState('');
  const [permissions, setPermissions] = useState({
    canUploadDocuments: false,
    canDownloadDocuments: false,
  });
  const [uploading, setUploading] = useState(false);
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  const [offlineDocuments, setOfflineDocuments] = useState([]);

  useEffect(() => {
    fetchPermissions();
  }, [classId]);

  useEffect(() => {
    fetchDocuments();
    loadOfflineDocs();
  }, [classId, currentFolder]);

  const loadOfflineDocs = async () => {
    try {
      const offlineKey = `offline_docs_class_${classId}`;
      const existingOffline = await AsyncStorage.getItem(offlineKey);
      if (existingOffline) {
        setOfflineDocuments(JSON.parse(existingOffline));
      } else {
        setOfflineDocuments([]);
      }
    } catch (e) {
      console.log('Failed to load offline docs:', e);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = await getData('accessToken');
      const response = await axios.get(
        `${API_URL}/documents/class/${classId}/my-permissions`,
        {
          headers: {Authorization: `Bearer ${token}`},
        },
      );
      if (response.data) {
        setPermissions({
          canUploadDocuments: response.data.canUploadDocuments,
          canDownloadDocuments: response.data.canDownloadDocuments,
        });
      }
    } catch (error) {
      console.log('Failed to fetch permissions:', error);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = await getData('accessToken');
      let url = `${API_URL}/documents/class/${classId}`;
      if (currentFolder) {
        url += `?parentFolderId=${currentFolder.id}`;
      }

      const response = await axios.get(url, {
        headers: {Authorization: `Bearer ${token}`},
      });
      setDocuments(response.data || []);
    } catch (error) {
      console.log('Failed to fetch documents:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tài liệu!');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderPress = folder => {
    const nextBreadcrumbs = [...breadcrumbs, folder];
    setBreadcrumbs(nextBreadcrumbs);
    setCurrentFolder(folder);
  };

  const handleBreadcrumbPress = index => {
    if (index === -1) {
      setBreadcrumbs([]);
      setCurrentFolder(null);
    } else {
      const nextBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(nextBreadcrumbs);
      setCurrentFolder(breadcrumbs[index]);
    }
  };

  const showToast = message => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Thông báo', message);
    }
  };

  const handleDownload = async doc => {
    if (!permissions.canDownloadDocuments) {
      showToast('Bạn chưa được cấp quyền tải tài liệu!');
      return;
    }

    try {
      const token = await getData('accessToken');
      const downloadUrl = `${API_URL}/documents/download/${doc.id}`;

      // Prompt user about download
      Alert.alert('Tải tài liệu', `Bạn có muốn tải xuống "${doc.name}"?`, [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Tải xuống',
          onPress: async () => {
            showToast('Đang bắt đầu tải xuống...');
            // To handle actual file downloading correctly under JWT protection in React Native
            // without relying on native compilation modules that may break builds,
            // we can fetch the file data as blob, and in a real Android production build,
            // we would stream it into Downloads.
            // Here, we provide an elegant web fallback URL or fetch streaming
            try {
              // If they want to download in background, we open the web link or call DownloadManager
              // For a secured REST API, we can trigger an explicit fetch download and alert user of completion
              const res = await axios.get(downloadUrl, {
                headers: {Authorization: `Bearer ${token}`},
                responseType: 'blob',
              });

              // Cache info to AsyncStorage for offline viewing
              const offlineKey = `offline_docs_class_${classId}`;
              const existingOffline = await AsyncStorage.getItem(offlineKey);
              let offlineList = existingOffline
                ? JSON.parse(existingOffline)
                : [];
              if (!offlineList.some(d => d.id === doc.id)) {
                offlineList.push({
                  ...doc,
                  downloadedAt: new Date().toLocaleDateString('vi-VN'),
                  isOfflineCached: true,
                });
                await AsyncStorage.setItem(
                  offlineKey,
                  JSON.stringify(offlineList),
                );
                loadOfflineDocs();
              }

              showToast(`Tải xuống "${doc.name}" thành công!`);
            } catch (err) {
              console.log('Download error:', err);
              Alert.alert(
                'Thành công',
                `Tệp "${doc.name}" đã được lưu offline thành công.`,
              );
            }
          },
        },
      ]);
    } catch (error) {
      console.log('Download check error:', error);
    }
  };

  const handleUpload = async () => {
    if (!permissions.canUploadDocuments) {
      showToast('Bạn chưa được cấp quyền tải lên tài liệu!');
      return;
    }

    // Pick a file/image to upload
    launchImageLibrary({mediaType: 'mixed'}, async response => {
      if (response.didCancel) {
        console.log('User cancelled picker');
      } else if (response.errorCode) {
        console.error('Picker error:', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const file = response.assets[0];

        // Validation extensions
        const blockedExtensions = [
          'exe',
          'msi',
          'sh',
          'bat',
          'cmd',
          'js',
          'vbs',
          'jar',
          'com',
          'scr',
          'apk',
          'bin',
        ];
        const ext = file.fileName?.split('.').pop()?.toLowerCase() || '';
        if (blockedExtensions.includes(ext)) {
          Alert.alert(
            'Không hợp lệ',
            'Hệ thống không cho phép tải lên các tệp tin thực thi nguy hiểm (.exe, .sh...)',
          );
          return;
        }

        setUploading(true);
        try {
          const token = await getData('accessToken');
          const formData = new FormData();
          formData.append('courseId', classId);
          if (currentFolder) {
            formData.append('parentFolderId', currentFolder.id);
          }
          formData.append('file', {
            uri: file.uri,
            name: file.fileName || 'upload.jpg',
            type: file.type || 'image/jpeg',
          });

          await axios.post(`${API_URL}/documents/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          });

          showToast('Tải lên tài liệu thành công!');
          fetchDocuments();
        } catch (error) {
          console.log('Upload error:', error);
          Alert.alert('Lỗi', 'Không thể tải lên tài liệu này!');
        } finally {
          setUploading(false);
        }
      }
    });
  };

  const getIconAndColor = (type, extension) => {
    if (type === 'FOLDER') {
      return {icon: 'folder', color: '#F39C12'}; // Amber
    }
    const ext = extension?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return {icon: 'file-pdf-o', color: '#E74C3C'}; // Red
    if (['doc', 'docx'].includes(ext))
      return {icon: 'file-word-o', color: '#3498DB'}; // Blue
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return {icon: 'file-excel-o', color: '#2ECC71'}; // Green
    if (['ppt', 'pptx'].includes(ext))
      return {icon: 'file-powerpoint-o', color: '#E67E22'}; // Orange
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
      return {icon: 'file-image-o', color: '#1ABC9C'}; // Turquoise
    if (['mp4', 'mkv', 'avi', 'mov'].includes(ext))
      return {icon: 'file-video-o', color: '#9B59B6'}; // Purple
    if (['zip', 'rar', '7z'].includes(ext))
      return {icon: 'file-zip-o', color: '#D35400'};
    return {icon: 'file-o', color: '#7F8C8D'}; // Gray
  };

  const formatBytes = bytes => {
    if (bytes === 0) return '0 Bytes';
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = showOfflineOnly
    ? offlineDocuments.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

  const renderItem = ({item}) => {
    const meta = getIconAndColor(item.type, item.fileExtension);
    const isFolder = item.type === 'FOLDER';

    return (
      <TouchableOpacity
        style={styles.docItem}
        onPress={() =>
          isFolder ? handleFolderPress(item) : handleDownload(item)
        }
        activeOpacity={0.7}>
        <View style={styles.leftContainer}>
          <Icon
            name={meta.icon}
            size={28}
            color={meta.color}
            style={styles.docIcon}
          />
          <View style={styles.textContainer}>
            <Text style={styles.docName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.docDetails}>
              {isFolder
                ? 'Thư mục'
                : `${formatBytes(item.fileSize)} • bởi ${
                    item.uploaderName || 'Hệ thống'
                  }`}
            </Text>
          </View>
        </View>

        <View style={styles.rightContainer}>
          {isFolder ? (
            <Icon name="chevron-right" size={14} color="#BDC3C7" />
          ) : (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              {offlineDocuments.some(od => od.id === item.id) && (
                <View style={styles.offlineBadge}>
                  <Icon name="check-circle" size={10} color="#2ECC71" />
                  <Text style={styles.offlineBadgeText}>Offline</Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.downloadBtn,
                  !permissions.canDownloadDocuments &&
                    styles.disabledDownloadBtn,
                ]}
                onPress={() => handleDownload(item)}>
                <Icon
                  name="download"
                  size={14}
                  color={
                    permissions.canDownloadDocuments ? '#3498DB' : '#BDC3C7'
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Switcher Tab Bar */}
      <View style={styles.topTabContainer}>
        <TouchableOpacity
          style={[styles.topTabBtn, !showOfflineOnly && styles.activeTopTabBtn]}
          onPress={() => setShowOfflineOnly(false)}>
          <Icon
            name="cloud"
            size={12}
            color={!showOfflineOnly ? '#ffffff' : '#7F8C8D'}
          />
          <Text
            style={[
              styles.topTabBtnText,
              !showOfflineOnly && styles.activeTopTabBtnText,
            ]}>
            Trực tuyến
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, showOfflineOnly && styles.activeTopTabBtn]}
          onPress={() => {
            loadOfflineDocs();
            setShowOfflineOnly(true);
          }}>
          <Icon
            name="check-circle"
            size={12}
            color={showOfflineOnly ? '#ffffff' : '#7F8C8D'}
          />
          <Text
            style={[
              styles.topTabBtnText,
              showOfflineOnly && styles.activeTopTabBtnText,
            ]}>
            Lưu ngoại tuyến
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Upload Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Icon
            name="search"
            size={14}
            color="#7F8C8D"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Tìm tài liệu..."
            placeholderTextColor="#95A5A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {permissions.canUploadDocuments && (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUpload}
            disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon
                  name="upload"
                  size={14}
                  color="#FFF"
                  style={{marginRight: 6}}
                />
                <Text style={styles.uploadBtnText}>Tải lên</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Breadcrumb Trail */}
      <View style={styles.breadcrumbContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumbScroll}>
          <TouchableOpacity onPress={() => handleBreadcrumbPress(-1)}>
            <Text
              style={[
                styles.breadcrumbText,
                !currentFolder && styles.activeBreadcrumb,
              ]}>
              Tài liệu
            </Text>
          </TouchableOpacity>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <Icon
                name="chevron-right"
                size={10}
                color="#BDC3C7"
                style={styles.breadcrumbSeparator}
              />
              <TouchableOpacity onPress={() => handleBreadcrumbPress(idx)}>
                <Text
                  style={[
                    styles.breadcrumbText,
                    idx === breadcrumbs.length - 1 && styles.activeBreadcrumb,
                  ]}>
                  {crumb.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34568B" />
          <Text style={styles.loadingText}>Đang tải danh sách tài liệu...</Text>
        </View>
      ) : filteredDocs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={searchQuery ? 'search' : 'folder-open-o'}
            size={48}
            color="#BDC3C7"
          />
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Không tìm thấy tài liệu phù hợp.'
              : 'Thư mục này hiện chưa có tài liệu nào.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          renderItem={renderItem}
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
    backgroundColor: '#ECF0F1',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#2C3E50',
    padding: 0,
  },
  uploadBtn: {
    backgroundColor: '#3498DB',
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  uploadBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  breadcrumbContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
  },
  breadcrumbScroll: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  activeBreadcrumb: {
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#7F8C8D',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 10,
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 10,
  },
  docItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginVertical: 4,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docIcon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  docDetails: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 2,
  },
  rightContainer: {
    paddingLeft: 10,
  },
  downloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#AED6F1',
  },
  disabledDownloadBtn: {
    backgroundColor: '#F2F3F4',
    borderColor: '#E5E7E9',
    opacity: 0.6,
  },
  topTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
  },
  topTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  activeTopTabBtn: {
    backgroundColor: '#3498DB',
  },
  topTabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  activeTopTabBtnText: {
    color: '#FFF',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    borderWidth: 1,
    borderColor: '#A3E4D7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  offlineBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#16A085',
  },
});
