# 📱 Ứng Dụng Di Động Học Viên - Student Companion App (React Native Native App)

Ứng dụng di động native dành cho Sinh viên là giải pháp công nghệ tiện ích chạy trên nền tảng **React Native**, mang đến cho người học trải nghiệm học tập, thi cử và điểm danh di động thông minh, bảo mật và trực quan.

Ứng dụng tương thích hoàn toàn với cả iOS và Android, hỗ trợ giao diện thích ứng thông minh theo chế độ Sáng/Tối (Light/Dark mode) và tích hợp các cảm biến bảo mật sinh trắc học phần cứng tiên tiến nhất.

---

## 🌟 Các Tính Năng Nổi Bật (Key Features)

### 1. Đăng Nhập Sinh Trắc Học & Keycloak SSO (FaceID / Fingerprint)
*   **Mở khóa 1 chạm**: Sau lần đăng nhập Keycloak đầu tiên thành công, học viên có thể kích hoạt FaceID hoặc Vân tay để mở khóa ứng dụng tức thì ở các lần truy cập tiếp theo.
*   **Bảo mật phần cứng cao cấp**: Sử dụng thư viện bảo mật native `react-native-keychain` lưu trữ an toàn `refreshToken` vào phân vùng chip bảo mật phần cứng (Android Keystore / iOS Keychain) với chính sách yêu cầu sinh trắc học `BIOMETRY_ANY`.
*   **Quay vòng Token tự động (Token Rotation)**: Cơ chế trao đổi mã khóa quay vòng liên tục giúp gia hạn Access Token tự động từ Keycloak, mang lại khả năng duy trì phiên đăng nhập lâu dài nhưng vẫn đảm bảo an toàn tuyệt đối.

### 2. Thông Báo Đẩy Thông Minh Thời Gian Thực (Firebase FCM)
*   **Không bao giờ bỏ lỡ tin tức**: Tích hợp Firebase Cloud Messaging (FCM) gửi thông báo tự động trước khi bài tập hết hạn, lịch học bị thay đổi đột xuất, hoặc khi có bài thảo luận mới từ bạn bè/thầy cô.
*   **Chuyển hướng sâu linh hoạt (Deep Linking)**: Khi học viên nhấp vào thông báo, ứng dụng tự động khởi động và thực hiện định tuyến chính xác đến màn hình tương ứng (ví dụ: màn hình Thảo luận lớp học, Chi tiết kết quả,...) từ cả trạng thái chạy ngầm (Background) hay khi ứng dụng đã bị tắt hoàn toàn (Killed).

### 3. Điểm Danh Tọa Độ GPS Geofencing & Xác Thực Sinh Trắc Học
*   **Điểm danh định vị**: Học viên thực hiện điểm danh lớp học phần bằng cách nhập mã điểm danh do giảng viên cung cấp, kết hợp với xác thực tọa độ vị trí GPS của thiết bị di động trong bán kính thực tế cho phép của lớp học.
*   **Ngăn chặn gian lận GPS**: Thuật toán kiểm tra và ngăn chặn các ứng dụng giả lập vị trí (Mock Location Detection) nhằm bảo đảm tính trung thực tuyệt đối.

### 4. Giao Diện Làm Bài Thi Tập Trung (Take Assessment)
*   **Distraction-Free Focus**: Màn hình thi được thiết kế tập trung tối đa giúp học viên làm bài trắc nghiệm hoặc tự luận mà không bị phân tâm.
*   **Tự động lưu nháp (Auto-Save)**: Liên tục đồng bộ và lưu trữ bài làm lên server để tránh mất mát dữ liệu khi gặp sự cố mạng đột xuất.
*   **Timer Cảnh Báo khẩn cấp**: Huy hiệu đồng hồ đếm ngược được thiết kế viền đỏ Ruby nổi bật, phát tín hiệu cảnh báo rung nhẹ khi thời gian làm bài thi còn dưới 5 phút.

### 5. Đăng Ký FaceID Từng Bước Trực Quan (Guided Face Capture)
*   **Nhận diện 3 chiều**: Quy trình chụp ảnh khuôn mặt 3 bước trực quan (Nhìn thẳng, Quay trái nhẹ, Quay phải nhẹ) với khung tròn hiển thị chỉ báo động giúp học viên dễ dàng thiết lập hồ sơ FaceID đồng bộ với server AI.

### 6. Phân Tích Kết Quả Học Tập & Thời Khóa Biểu Thông Minh
*   **Thống kê KPI học tập**: Theo dõi điểm trung bình, phần trăm chuyên cần và số buổi vắng thông qua các thẻ đo lường màu xanh Emerald (Đi học) và đỏ Ruby (Vắng học) sắc nét.
*   **Thời khóa biểu trực quan (Timetable)**: Lịch học chia theo từng ca học chi tiết, tích hợp đầy đủ thông tin phòng học, thời gian, tên giảng viên và vị trí bản đồ lớp học.
*   **Đổi mật khẩu tài khoản**: Giao diện đổi mật khẩu tài khoản trực tiếp trên ứng dụng di động bảo mật an toàn, kết hợp kiểm tra xác thực mật khẩu cũ qua cổng Keycloak SSO.

---

## 💎 Ngôn Ngữ Thiết Kế Giao Diện (Aesthetics)
*   **Adaptability**: Phản hồi tức thì với chế độ Sáng/Tối của hệ điều hành, bảo vệ mắt người dùng nhờ các gam màu tối (HSL Slate/Obsidian) hài hòa và tương phản cao.
*   **Modern Components**: Hệ thống nút chọn chip (day chip selector), thẻ ca học bo góc mềm mại, đổ bóng sâu tạo cảm giác Premium và chuyên nghiệp.
