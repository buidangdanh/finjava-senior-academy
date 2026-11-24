# 🏦 FinJava Senior Academy — Lộ Trình Trở Thành Java Backend Senior Ngành Tài Chính - Ngân Hàng

Website học tập, mô phỏng giao dịch và luyện thi tuyển dụng **Java Backend Senior** chuyên sâu cho hệ thống **Core Banking, Payment Gateway (NAPAS 24/7, ISO 8583, ISO 20022, VietQR), Bảo mật PCI-DSS/HSM, Frontend Ngân hàng (React/Angular/BFF), Kubernetes & System Design 10.000 TPS**.

## ✨ Điểm nổi bật của hệ thống

1. **60 Bài Giảng Chi Tiết Chuẩn Thực Chiến (10 Học phần `J`, `S`, `D`, `M`, `B`, `K`, `F`, `O`, `A`, `C`):**
   - Mỗi bài đều có **9 phần sư phạm chuyên sâu**: Câu chuyện sự cố thực tế tại Ngân hàng → Liên hệ đời thường dễ hiểu → Sơ đồ kiến trúc 4 bước → Lý thuyết từ gốc rễ & đánh đổi → Bảng quy tắc chọn giải pháp → Code Production tô màu cú pháp & giải thích từng dòng → Bài Lab thực hành cầm tay chỉ việc → Mẹo phỏng vấn Senior → Bài kiểm tra tình huống cuối bài (tổng cộng **120+ câu hỏi cuối bài**).
2. **🏦 Phòng Mô Phỏng Core Banking Trực Quan:**
   - **Mô phỏng Race Condition & Khóa đồng thời:** Trực quan hóa từng mili-giây 2 luồng ATM & Mobile App rút tiền cùng lúc với 4 chế độ (`Không khóa`, `Optimistic @Version`, `Pessimistic SELECT FOR UPDATE`, `Atomic SQL`).
   - **Mô phỏng Sổ Cái Kế Toán Kép (Double-Entry Ledger) & Đối soát T+0:** Xem trực tiếp cách sinh chứng từ Nợ/Có cân bằng tuyệt đối (`∑ Debit == ∑ Credit`) cho giao dịch NAPAS 24/7 thành công, bị từ chối (Saga đảo bút toán) hoặc gặp `ReadTimeout 68` treo tài khoản `Suspense` chờ Job Đối soát.
   - **Thử thách Senior Code Review:** Chấm điểm trực tiếp khả năng bắt lỗi chí mạng trong các Merge Request giả lập thực tế.
3. **✦ Phòng Thi Tuyển Bấm Giờ & Chữa Đề 4 Bước + 🎤 Ngân Hàng Phỏng Vấn Vấn Đáp:**
   - **4 Bộ đề thi tuyển Senior chính thức** (mỗi đề 25 câu tình huống + Case Study kiến trúc Ngân hàng số, thang điểm 100–1000) + **2 Bộ đề phản xạ nhanh** + **Sổ tay câu sai tự động**.
   - **30+ Câu hỏi phỏng vấn vấn đáp hội đồng kỹ thuật** kèm Đáp án mẫu chuẩn Senior và Điểm đỏ (Red Flag) cần tránh.
4. **📲 Dùng Mọi Nơi (PWA Offline + Đồng Bộ Mã Nhanh):**
   - Cài đặt như ứng dụng thật trên iOS / Android / Windows / macOS.
   - Chuyển tiến độ giữa Máy tính và Điện thoại chỉ trong 3 giây bằng **Mã Đồng Bộ Nhanh (`FJS1:...`)** hoặc file JSON.

---

## 🚀 Cách mở học ngay lập tức

- **Cách 1 (Không cần cài đặt bất cứ gì):** Nhấp đúp trực tiếp vào file `index.html` bằng Chrome / Edge / Safari.
- **Cách 2 (Chạy HTTP Server nội bộ & mở trên Điện thoại cùng mạng Wi-Fi):**
  ```powershell
  node server.js
  ```
  Sau đó mở `http://127.0.0.1:8899` trên máy tính (hoặc địa chỉ IP LAN in trên màn hình để học trên điện thoại).

---

## 🌐 Cách đẩy Online miễn phí để học ở mọi nơi (30 giây)

1. **Kéo thả 10 giây (Netlify Drop / Cloudflare Pages):**
   - Truy cập `https://app.netlify.com/drop` hoặc `https://pages.cloudflare.com`, kéo thả nguyên thư mục `java-banking-academy` vào trình duyệt để nhận ngay đường link `https://...` vĩnh viễn.
2. **Chạy công cụ tự động `deploy-online.bat`:**
   - Nhấp đúp `deploy-online.bat` để đẩy lên **Vercel**, **Surge.sh** hoặc **Cloudflare Pages**.
3. **GitHub Pages tự động:**
   - Đẩy thư mục này lên một GitHub Repository — workflow `.github/workflows/deploy-pages.yml` đã cấu hình sẵn để tự động xuất bản lên GitHub Pages.
