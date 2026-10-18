# aaba — Đưa lên mạng (khoảng 20 phút, miễn phí)

1. **Tạo dự án Firebase**: vào <https://console.firebase.google.com> → *Add project* → đặt tên (ví dụ `aaba-11a3`). Tắt Google Analytics. Giữ gói **Spark** (không cần thẻ, không billing).
2. **Bật Firestore**: *Build → Firestore Database → Create database* → chế độ *Production* → vị trí **asia-southeast1 (Singapore)**. Vị trí không đổi được sau này.
3. **Bật đăng nhập ẩn danh**: *Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save*.
4. **Thêm Web app**: *Project settings (bánh răng) → Your apps → </> Web* → đặt tên → *Register*. Copy khối `firebaseConfig` rồi dán các giá trị vào `FIREBASE_CONFIG` trong `js/config.js`. (Các giá trị này không phải bí mật.)
5. **Dán luật bảo mật**: *Firestore Database → Rules* → xoá hết, dán toàn bộ nội dung file `firestore.rules` → **Publish**.
6. **Tạo mã đăng nhập khởi tạo bằng tay**: *Firestore Database → Data → Start collection* → Collection ID `invites` → Document ID = **đúng 20 ký tự chữ/số** ngẫu nhiên (ví dụ `k7Qm2xPz9RtB4wLc8NvD`, ghi lại mã này). Thêm các trường:
   `role` (string) = `dev` · `label` (string) = `dev` · `active` (boolean) = `true` · `createdBy` (string) = `bootstrap`.
7. **Chuyển sang Firebase**: trong `js/config.js` đổi `BACKEND = 'firebase'`.
8. **Đẩy lên GitHub**: tạo repo, đẩy toàn bộ thư mục (có file `.nojekyll`) lên nhánh `dev`. Vào *Settings → Pages → Build and deployment → Deploy from a branch → `dev` / `(root)` → Save*. Chờ 1–2 phút, trang sẽ ở `https://<user>.github.io/<repo>/`.
9. **Cho phép tên miền**: Firebase *Authentication → Settings → Authorized domains → Add domain* → `<user>.github.io`.
10. **Vào bằng điện thoại**: mở `https://<user>.github.io/<repo>/#/join/<mã 20 ký tự ở bước 6>` (hoặc mở trang rồi nhập mã). Bạn trở thành **Quản trị (dev)**.
11. **Thay mã khởi tạo**: trong app, *Tôi → Quản lý → Mã đăng nhập & QR* → tạo một mã đăng nhập **dev** mới và cất mã ở nơi an toàn. Sau đó vào Firebase console, sửa tay mã khởi tạo: `active` = `false`. (Đừng bấm "Thu hồi" trong app với mã khởi tạo: app sẽ xoá luôn tài khoản của bạn.)
12. **Chạy trình cài đặt**: *Tôi → Công cụ dev* (tự mở trình cài đặt khi lớp còn trống, hoặc chọn *Thiết lập lớp từ đầu*) → nhập tên lớp, các tổ, danh sách học sinh → hoàn tất. Sau đó tạo mã đăng nhập (QR) cho tổ trưởng, giáo viên và "Mã chung của lớp" cho học sinh.

## Kiểm tra bảo mật thủ công (làm 1 lần sau khi chạy)
- [ ] Vào bằng mã **học sinh**: không có nút Ghi; thử ghi điểm bằng bất kỳ cách nào đều bị từ chối.
- [ ] Vào bằng mã **tổ trưởng**: không ghi được cho tổ khác; điểm cộng vào trạng thái *chờ xác nhận* và không tự xác nhận được điểm của chính mình.
- [ ] Vào bằng mã **Ban cán sự (admin)**: không tạo được mã đăng nhập *admin* hoặc *dev*, và không thấy mã dev trong danh sách.
- [ ] **Thu hồi** một mã đăng nhập trong app → máy dùng mã đó bị đưa về màn hình tham gia và không đọc được dữ liệu nữa.
- [ ] **Xem không cần mã**: sau khi Publish lại `firestore.rules`, vào Quản lý → Cài đặt, bật "Cho phép xem không cần mã" rồi Lưu. Mở link trong cửa sổ ẩn danh: khách xem được xếp hạng, nhật ký, thể lệ, nhưng không có Ghi điểm / Quản lý / Xác nhận và không ghi được gì.
- [ ] Khách **không đọc được** `members` và `invites` (không thấy mã đăng nhập ở bất kỳ đâu).
- [ ] Tắt "Cho phép xem không cần mã" → khách bị đưa về màn hình tham gia và không đọc được dữ liệu nữa (thành viên có mã vẫn dùng bình thường).

Sự cố thường gặp: "Chưa điền FIREBASE_CONFIG" → làm lại bước 4. "Không có quyền" khi tham gia → kiểm tra mã đúng 20 ký tự, mã còn `active: true`, và đã Publish luật (bước 5). Đăng nhập lỗi `auth/unauthorized-domain` → làm lại bước 9.
