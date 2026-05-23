import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { API_URL } from '@env';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getData, formatToView, convertTime } from './Utility';

export default function ClassDiscussion() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  
  // Quản lý ô comment cho từng bài viết: { [postId]: commentText }
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({}); // { [postId]: boolean }

  const [currentUserSub, setCurrentUserSub] = useState('');
  const [classId, setClassId] = useState(null);
  const [accessToken, setAccessToken] = useState('');

  const wsRef = useRef(null);

  useEffect(() => {
    initData();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const initData = async () => {
    try {
      const token = await getData('accessToken');
      const curClassId = await getData('currentClassId');
      
      // Phân tích token để lấy claim sub (keycloakId)
      if (token) {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(
          decodeURIComponent(
            atob(payloadBase64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        );
        setCurrentUserSub(decodedPayload.sub || '');
      }

      setAccessToken(token);
      setClassId(curClassId);

      // Fetch danh sách bài viết trang đầu
      await fetchPosts(curClassId, token, 0, true);

      // Thiết lập kết nối WebSockets real-time
      connectWebSocket(curClassId, token);
    } catch (e) {
      console.log('Error initializing discussion:', e);
      setLoading(false);
    }
  };

  const connectWebSocket = (courseId, token) => {
    if (!token || !courseId) return;

    let wsBase = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    if (wsBase.endsWith('/api')) {
      wsBase = wsBase.substring(0, wsBase.length - 4);
    }
    const wsUrl = `${wsBase}/ws/discussion?courseId=${courseId}&token=${token}`;

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected successfully!');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;
        console.log('Received WebSocket event:', type);

        if (type === 'NEW_POST') {
          // Thêm bài viết mới vào đầu feed
          setPosts(prev => {
            // Tránh trùng lặp bài đăng tự tạo đã nhận phản hồi từ REST API
            if (prev.some(p => p.id === data.id)) return prev;
            return [data, ...prev];
          });
        } else if (type === 'NEW_COMMENT') {
          // Thêm bình luận vào bài viết tương ứng
          setPosts(prev =>
            prev.map(post => {
              if (post.id === data.postId) {
                const commentList = post.comments || [];
                if (commentList.some(c => c.id === data.id)) return post;
                return {
                  ...post,
                  commentCount: post.commentCount + 1,
                  comments: [...commentList, data]
                };
              }
              return post;
            })
          );
        } else if (type === 'DELETE_POST') {
          setPosts(prev => prev.filter(p => p.id !== data));
        } else if (type === 'DELETE_COMMENT') {
          const { postId, commentId } = data;
          setPosts(prev =>
            prev.map(post => {
              if (post.id === postId) {
                const filtered = (post.comments || []).filter(c => c.id !== commentId);
                return {
                  ...post,
                  commentCount: Math.max(0, post.commentCount - 1),
                  comments: filtered
                };
              }
              return post;
            })
          );
        } else if (type === 'PIN_POST') {
          const { postId, isPinned } = data;
          setPosts(prev => {
            const updated = prev.map(post => {
              if (post.id === postId) {
                return { ...post, isPinned };
              }
              return post;
            });
            // Sắp xếp lại: Pinned lên đầu, sau đó sắp xếp theo createdAt giảm dần
            return updated.sort((a, b) => {
              const aPinned = a.isPinned ? 1 : 0;
              const bPinned = b.isPinned ? 1 : 0;
              if (aPinned !== bPinned) return bPinned - aPinned;
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
          });
        }
      } catch (err) {
        console.log('Error parsing WS message:', err);
      }
    };

    ws.onerror = (e) => {
      console.log('WebSocket Error:', e.message);
    };

    ws.onclose = (e) => {
      console.log('WebSocket Connection closed:', e.code, e.reason);
      // Tự động kết nối lại sau 5 giây nếu không phải do component unmount
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CLOSED) {
          connectWebSocket(courseId, token);
        }
      }, 5000);
    };
  };

  const fetchPosts = async (courseId, token, pageNum, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await axios.get(
        `${API_URL}/discussion/courses/${courseId}/posts?page=${pageNum}&size=10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const fetchedPosts = response.data.content || [];
      if (isInitial) {
        setPosts(fetchedPosts);
        setPage(0);
        setHasMore(fetchedPosts.length === 10);
      } else {
        setPosts(prev => {
          const combined = [...prev, ...fetchedPosts];
          // Tránh trùng lặp ID
          return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        });
        setPage(pageNum);
        setHasMore(fetchedPosts.length === 10);
      }
    } catch (error) {
      console.log('Error fetching posts:', error);
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu thảo luận lớp học');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setSubmittingPost(true);

    try {
      const response = await axios.post(
        `${API_URL}/discussion/posts`,
        {
          courseId: classId,
          content: newPostContent.trim()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      // Thêm ngay bài đăng vào state của mình (nếu WS chưa kịp phản hồi)
      setPosts(prev => {
        if (prev.some(p => p.id === response.data.id)) return prev;
        return [response.data, ...prev];
      });
      setNewPostContent('');
    } catch (error) {
      console.log('Error creating post:', error);
      Alert.alert('Lỗi', 'Đăng bài viết thất bại. Hãy thử lại!');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleCreateComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    // Clear input ngay lập tức để tạo trải nghiệm nhanh
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    try {
      const response = await axios.post(
        `${API_URL}/discussion/comments`,
        {
          postId,
          content: text.trim()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      // Cập nhật state bài đăng tương ứng
      setPosts(prev =>
        prev.map(post => {
          if (post.id === postId) {
            const commentList = post.comments || [];
            if (commentList.some(c => c.id === response.data.id)) return post;
            return {
              ...post,
              commentCount: post.commentCount + 1,
              comments: [...commentList, response.data]
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.log('Error creating comment:', error);
      Alert.alert('Lỗi', 'Bình luận thất bại');
    }
  };

  const handleDeletePost = (postId) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bài viết này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/discussion/posts/${postId}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            setPosts(prev => prev.filter(p => p.id !== postId));
          } catch (error) {
            console.log('Error deleting post:', error);
            Alert.alert('Lỗi', 'Không thể xóa bài đăng của bạn');
          }
        }
      }
    ]);
  };

  const handleDeleteComment = (commentId, postId) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bình luận này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/discussion/comments/${commentId}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            // Cập nhật UI ngay lập tức
            setPosts(prev =>
              prev.map(post => {
                if (post.id === postId) {
                  const filtered = (post.comments || []).filter(c => c.id !== commentId);
                  return {
                    ...post,
                    commentCount: Math.max(0, post.commentCount - 1),
                    comments: filtered
                  };
                }
                return post;
              })
            );
          } catch (error) {
            console.log('Error deleting comment:', error);
            Alert.alert('Lỗi', 'Không thể xóa bình luận của bạn');
          }
        }
      }
    ]);
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderPostItem = ({ item }) => {
    const isExpanded = expandedComments[item.id];
    const isPostAuthor = item.authorId === currentUserSub;

    return (
      <View style={styles.postCard}>
        {/* Header bài đăng */}
        <View style={styles.cardHeader}>
          <View style={styles.authorInfo}>
            <View style={[styles.avatarPlaceholder, item.authorRole === 'Teacher' && styles.teacherAvatar]}>
              <Text style={styles.avatarText}>
                {item.authorName ? item.authorName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.nameContainer}>
              <View style={styles.row}>
                <Text style={styles.authorNameText}>{item.authorName}</Text>
                {item.authorRole === 'Teacher' && (
                  <View style={styles.teacherBadge}>
                    <Text style={styles.teacherBadgeText}>Giảng viên</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timeText}>{formatToView(convertTime(item.createdAt))}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {item.isPinned && <Icon name="thumb-tack" size={16} color="#E74C3C" style={{ marginRight: 12 }} />}
            {isPostAuthor && (
              <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
                <Icon name="trash" size={18} color="#95A5A6" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nội dung bài đăng */}
        <Text style={styles.postContent}>{item.content}</Text>

        {/* Footer tương tác bài đăng */}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerActionBtn}>
            <Icon name="heart-o" size={16} color="#7F8C8D" />
            <Text style={styles.footerActionText}>Thích</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerActionBtn} onPress={() => toggleComments(item.id)}>
            <Icon name="comment-o" size={16} color={isExpanded ? '#3498DB' : '#7F8C8D'} />
            <Text style={[styles.footerActionText, isExpanded && { color: '#3498DB', fontWeight: 'bold' }]}>
              Bình luận ({item.commentCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Khu vực bình luận trượt mở rộng */}
        {isExpanded && (
          <View style={styles.commentSection}>
            <View style={styles.divider} />
            
            {/* Danh sách bình luận */}
            <FlatList
              data={item.comments || []}
              keyExtractor={c => c.id.toString()}
              renderItem={({ item: comment }) => (
                <View style={styles.commentRow}>
                  <View style={[styles.commentAvatar, comment.authorRole === 'Teacher' && styles.teacherAvatar]}>
                    <Text style={styles.commentAvatarText}>
                      {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <View style={styles.row}>
                        <Text style={styles.commentAuthorName}>{comment.authorName}</Text>
                        {comment.authorRole === 'Teacher' && (
                          <View style={styles.teacherCommentBadge}>
                            <Text style={styles.teacherCommentBadgeText}>GV</Text>
                          </View>
                        )}
                      </View>
                      {comment.authorId === currentUserSub && (
                        <TouchableOpacity onPress={() => handleDeleteComment(comment.id, item.id)}>
                          <Icon name="close" size={12} color="#BDC3C7" style={{ padding: 4 }} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentContentText}>{comment.content}</Text>
                    <Text style={styles.commentTimeText}>{formatToView(convertTime(comment.createdAt))}</Text>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={styles.emptyCommentsText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
              }
            />

            {/* Ô nhập bình luận mới */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Viết câu trả lời của bạn..."
                placeholderTextColor="#95A5A6"
                value={commentInputs[item.id] || ''}
                onChangeText={text => setCommentInputs(prev => ({ ...prev, [item.id]: text }))}
              />
              <TouchableOpacity
                style={styles.sendCommentBtn}
                onPress={() => handleCreateComment(item.id)}
              >
                <Icon name="send" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      fetchPosts(classId, accessToken, page + 1, false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Thanh tiêu đề */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thảo luận lớp học</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#34568B" />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id.toString()}
            renderItem={renderPostItem}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            onRefresh={() => fetchPosts(classId, accessToken, 0, false)}
            refreshing={loading}
            ListHeaderComponent={
              /* Hộp tạo bài viết mới */
              <View style={styles.createPostBox}>
                <TextInput
                  style={styles.createPostInput}
                  placeholder="Chia sẻ nội dung hoặc câu hỏi của bạn với cả lớp..."
                  placeholderTextColor="#95A5A6"
                  multiline
                  numberOfLines={3}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                />
                <TouchableOpacity
                  style={[styles.postSubmitBtn, !newPostContent.trim() && styles.disabledBtn]}
                  onPress={handleCreatePost}
                  disabled={submittingPost || !newPostContent.trim()}
                >
                  {submittingPost ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="pencil" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.postSubmitBtnText}>Đăng bài</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#34568B" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="comments-o" size={48} color="#BDC3C7" />
                <Text style={styles.emptyText}>Chưa có thảo luận nào trong lớp học này</Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  listContainer: {
    padding: 12
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  createPostBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  createPostInput: {
    fontSize: 15,
    color: '#2C3E50',
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  postSubmitBtn: {
    backgroundColor: '#34568B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  postSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  disabledBtn: {
    backgroundColor: '#BDC3C7'
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  teacherAvatar: {
    backgroundColor: '#FADBD8',
    borderColor: '#E74C3C',
    borderWidth: 1
  },
  avatarText: {
    color: '#34568B',
    fontWeight: 'bold',
    fontSize: 16
  },
  nameContainer: {
    marginLeft: 10
  },
  authorNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  teacherBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6
  },
  teacherBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold'
  },
  timeText: {
    fontSize: 11,
    color: '#95A5A6',
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  postContent: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 2
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
    paddingTop: 12,
    justifyContent: 'space-around'
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  footerActionText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginLeft: 6
  },
  commentSection: {
    marginTop: 12
  },
  divider: {
    height: 1,
    backgroundColor: '#ECF0F1',
    marginBottom: 12
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 6
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F3F4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  commentAvatarText: {
    color: '#7F8C8D',
    fontWeight: 'bold',
    fontSize: 13
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  teacherCommentBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    marginLeft: 4
  },
  teacherCommentBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold'
  },
  commentContentText: {
    fontSize: 13,
    color: '#34495E',
    lineHeight: 18
  },
  commentTimeText: {
    fontSize: 9,
    color: '#BDC3C7',
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  emptyCommentsText: {
    fontSize: 13,
    color: '#95A5A6',
    textAlign: 'center',
    marginVertical: 12
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    paddingLeft: 12,
    paddingRight: 4,
    height: 40
  },
  commentTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
    paddingVertical: 0
  },
  sendCommentBtn: {
    backgroundColor: '#34568B',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 10,
    textAlign: 'center'
  }
});
