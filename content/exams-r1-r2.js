/* Bộ Đề Thi Tuyển Senior Java Ngân Hàng (Vòng 1 & Vòng 2) — Kèm Chữa Đề Thực Chiến 4 Bước Chuẩn Hội Đồng Kỹ Thuật */
window.EXAM_SETS = window.EXAM_SETS || [];
(function () {
  var caseStudyR1 = {
    title: "Case Study: Nâng cấp Cổng Giao Dịch Lõi FinViet Digital Bank",
    context: "FinViet Digital Bank đang tái kiến trúc cụm dịch vụ Giao dịch Lõi (Core Transfer & FX Service) phục vụ 6 triệu khách hàng cá nhân, với tải đỉnh ngày trả lương và dịp cận Tết đạt 3.500 TPS. Hệ thống chạy trên Java 21 LTS và Spring Boot 3.3 đóng gói trong Kubernetes Pod (cấp phát 16GB Heap mỗi Pod Core), kết nối cơ sở dữ liệu PostgreSQL 16 với giới hạn HikariCP tối đa 25 kết nối trên mỗi Pod. Nghiệp vụ tài chính yêu cầu xử lý đa tiền tệ (VNĐ, USD, EUR, JPY) tuyệt đối chính xác bằng BigDecimal theo chuẩn làm tròn ngân hàng (Banker's Rounding), cam kết không sai lệch dù chỉ 1 đồng giữa chứng từ tổng và các bút toán chi tiết. Khối Vận hành áp đặt SLA nghiêm ngặt: độ trễ đầu-cuối P99 của API chuyển khoản nội bộ và truy vấn tổng quan tài khoản phải dưới 300ms, không chấp nhận hiện tượng Garbage Collector dừng toàn bộ luồng (Stop-The-World) kéo dài gây rớt kết nối từ API Gateway. Trước khi ghi nhận bút toán cuối cùng, mỗi lệnh chuyển tiền phải gọi đồng thời sang Fraud Scoring Engine và cổng định danh eKYC nội bộ qua HTTP, đồng thời với giao dịch liên ngân hàng phải gọi tiếp sang cổng chuyển mạch đối tác có thời gian phản hồi dao động từ 150ms đến 2.500ms. Kiến trúc sư trưởng (Principal Architect) ban hành quy định bắt buộc: tuân thủ Clean/Hexagonal Architecture tách biệt hoàn toàn Domain khỏi Spring/Hibernate, tuyệt đối không giữ kết nối Database trong lúc chờ phản hồi mạng bên ngoài, chuẩn hóa phản hồi lỗi REST theo RFC 7807 và toàn bộ bài kiểm thử tích hợp trên CI/CD phải phản ánh trung thực hành vi khóa dòng lẫn phương ngữ SQL của PostgreSQL thật."
  };

  var examR1 = {
    id: "senior-round-1",
    cert: "Vòng 1 · Core & Spring",
    title: "Đề Thi Tuyển Số 1 — Java Core, JVM, Concurrency & Spring Internals",
    subtitle: "25 câu hỏi tình huống phân loại ứng viên Senior + Case Study FinViet Bank · Chữa đề chi tiết 4 bước",
    durationMinutes: 45,
    passingScore: 700,
    questions: [
      {
        id: "R1-01",
        domain: "Java Core & Tiền tệ",
        lessonId: "J1",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR1,
        question: "Trong module tính lãi hoàn tiền tỷ giá (FX Rebate) của FinViet Digital Bank, một lập trình viên viết đoạn xử lý nhận lãi suất ưu đãi dạng số thực từ cấu hình, chia cho 365 ngày để tính tiền thưởng ngày và đối chiếu với hạn mức phí như sau: `BigDecimal rate = new BigDecimal(0.045); BigDecimal dailyRebate = principal.multiply(rate).divide(BigDecimal.valueOf(365)); if (dailyRebate.equals(feeCap)) { ... }`. Khi chạy kiểm thử với nhiều mức số dư khác nhau, hệ thống liên tục văng lỗi runtime hoặc so sánh sai dù hai số tiền cùng bằng 15.000. Bạn cần refactor đoạn code này theo chuẩn tiền tệ nào để đáp ứng yêu cầu của FinViet Bank?",
        options: [
          "Chuyển sang dùng kiểu nguyên thủy `double` cho bước nhân chia trung gian để tránh lỗi chia số lẻ vô hạn, sau đó chỉ bọc kết quả cuối cùng vào `BigDecimal.valueOf(result)` và dùng toán tử `==` trên `.doubleValue()` để so sánh.",
          "Giữ nguyên `new BigDecimal(0.045)` để bảo toàn độ chính xác 64-bit, thêm `MathContext.UNLIMITED` vào hàm `divide(...)` và sử dụng `Objects.equals(dailyRebate, feeCap)` để tránh `NullPointerException`.",
          "Khởi tạo tỷ lệ từ chuỗi ký tự `new BigDecimal('0.045')` (hoặc `BigDecimal.valueOf(0.045)`), truyền tường minh `scale` theo loại tiền tệ kèm `RoundingMode.HALF_EVEN` vào phép `divide(...)`, và so sánh giá trị bằng `dailyRebate.compareTo(feeCap) == 0` bên trong Value Object `Money` bất biến.",
          "Sử dụng `new BigDecimal(0.045f)` để rút gọn phần thập phân dư thừa của kiểu `double`, dùng `RoundingMode.DOWN` cho mọi phép chia và chuẩn hóa bằng `.toString().equals(...)` trước khi đối chiếu hạn mức."
        ],
        answer: 2,
        walkthrough: {
          keyword: "đa tiền tệ tuyệt đối chính xác bằng BigDecimal theo chuẩn làm tròn ngân hàng (Banker's Rounding) ... không sai lệch dù chỉ 1 đồng",
          whyCorrect: "Chào bạn, câu mở màn này quét trúng trọn bộ 'tam giác tử thần' của `BigDecimal` trong ngân hàng! Thứ nhất, `new BigDecimal(0.045)` truyền trực tiếp literal `double` vốn đã mang sai số nhị phân IEEE 754 (`0.045000000000000001804...`) ngay trước khi vào constructor; bắt buộc phải dùng `new BigDecimal('0.045')` hoặc `BigDecimal.valueOf(0.045)`. Thứ hai, chia cho `365` tạo ra số thập phân tuần hoàn vô hạn, nếu gọi `.divide(365)` không truyền `scale` và `RoundingMode` sẽ nổ ngay `ArithmeticException: Non-terminating decimal expansion`; chuẩn ngân hàng yêu cầu chỉ định rõ `scale` (ví dụ `0` cho VNĐ/JPY, `2` cho USD/EUR) kèm `RoundingMode.HALF_EVEN` (Banker's Rounding giúp triệt tiêu độ lệch thống kê). Thứ ba, `BigDecimal.equals()` so sánh cả `scale` nên `15000.00.equals(15000)` trả về `false` — phải dùng `compareTo(...) == 0` để so sánh giá trị toán học.",
          whyWrong: [
            "Tính toán trung gian bằng `double` sẽ tích lũy sai số dấu phẩy động IEEE 754 (như `0.1 + 0.2 = 0.30000000000000004`), làm lệch bút toán tiền tệ khi nhân với gốc hàng chục tỷ đồng.",
            "`new BigDecimal(0.045)` vẫn giữ nguyên sai số nhị phân, `MathContext.UNLIMITED` tương đương không cho làm tròn nên vẫn ném `ArithmeticException` khi chia không hết cho 365, còn `Objects.equals` vẫn gọi `BigDecimal.equals()` bị sai khác `scale`.",
            "",
            "Ép sang `float` càng làm giảm độ chính xác xuống chỉ còn 23 bit mantissa, còn `.toString().equals(...)` vẫn thất bại hoàn toàn khi so sánh `'15000.00'` với `'15000'` hoặc `'1.5E+4'`."
          ],
          tip: "Nhớ khẩu quyết 3 KHÔNG với BigDecimal ngân hàng: KHÔNG `new BigDecimal(double)`, KHÔNG `.divide()` thiếu `RoundingMode`, KHÔNG `.equals()` để so sánh độ lớn tiền tệ (luôn dùng `compareTo() == 0`)!"
        }
      },
      {
        id: "R1-02",
        domain: "JVM & Đa luồng",
        lessonId: "J2",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR1,
        question: "Khi chạy kiểm thử tải 3.500 TPS cho Core Transfer Pod của FinViet Digital Bank (Java 21, Heap 16GB, cấu hình mặc định `G1GC`), biểu đồ Prometheus ghi nhận định kỳ mỗi vài phút độ trễ P99 vọt lên 520ms–680ms kèm cảnh báo timeout từ API Gateway. Phân tích GC Log cho thấy các đợt Mixed GC Stop-The-World kéo dài hơn 380ms do lượng lớn đối tượng DTO/JSON ngắn hạn tràn sang vùng Old Gen. Bộ tham số JVM nào tối ưu nhất để đáp ứng SLA của FinViet Bank?",
        options: [
          "Chuyển sang `-XX:+UseParallelGC -Xms4g -Xmx16g` để tận dụng tối đa đa nhân CPU dọn rác nhanh nhất và cho phép JVM co giãn bộ nhớ linh hoạt theo lưu lượng giao dịch.",
          "Kích hoạt Generational ZGC với `-XX:+UseZGC -XX:+ZGenerational -Xms16g -Xmx16g -XX:+AlwaysPreTouch -XX:+HeapDumpOnOutOfMemoryError` (cấp đủ trần RAM Pod cho thêm vùng Non-Heap) nhằm giữ thời gian tạm dừng STW dưới 1 mili-giây.",
          "Giữ nguyên `G1GC` nhưng đặt `-XX:MaxGCPauseMillis=5` và gọi chủ động `System.gc()` sau mỗi 10.000 giao dịch chuyển khoản để tránh dồn rác vào giờ cao điểm.",
          "Chuyển sang `-XX:+UseSerialGC -Xms16g -Xmx16g` kết hợp tắt cơ chế SafePoint của JVM để các luồng xử lý giao dịch không bao giờ bị ngắt quãng."
        ],
        answer: 1,
        walkthrough: {
          keyword: "Java 21 LTS ... 16GB Heap ... độ trễ đầu-cuối P99 dưới 300ms, không chấp nhận hiện tượng Garbage Collector dừng toàn bộ luồng (Stop-The-World) kéo dài",
          whyCorrect: "Chào em, với dịch vụ thanh toán lõi chạy trên Java 21 có Heap lớn (16GB) và SLA P99 < 300ms, **Generational ZGC** (`-XX:+UseZGC -XX:+ZGenerational`) chính là vũ khí chuẩn Production! Khác với G1GC vẫn thực hiện sao chép đối tượng trong pha Stop-The-World khiến pause time dễ vọt lên vài trăm ms khi gặp Humongous/Promotion spike, Generational ZGC thực hiện đánh dấu và di dời bộ nhớ đồng thời với luồng ứng dụng nhờ Colored Pointers & Load Barriers, đồng thời tách riêng Young/Old Generation để thu gom cực nhanh các DTO/JSON chết yểu, giữ STW pause ổn định dưới **1ms**. Việc cố định `-Xms16g -Xmx16g` kèm `-XX:+AlwaysPreTouch` giúp cấp phát và chạm sẵn trang nhớ vật lý ngay lúc Pod khởi động, loại bỏ độ trễ xin thêm RAM từ OS giữa giờ cao điểm.",
          whyWrong: [
            "`ParallelGC` tối ưu cho thông lượng Batch (Throughput) chứ không tối ưu độ trễ thấp — các pha Full/Old GC dừng toàn bộ ứng dụng trên Heap 16GB có thể kéo dài hàng giây; ngoài ra đặt `-Xms4g != -Xmx16g` gây giật cục khi JVM phải liên tục resize Heap.",
            "",
            "`MaxGCPauseMillis` chỉ là mục tiêu gợi ý (soft goal) chứ không phải cam kết cứng của G1GC; tệ hơn, gọi `System.gc()` thủ công trên Production sẽ kích hoạt Full GC gây treo cứng toàn bộ luồng giao dịch.",
            "`SerialGC` chỉ dùng 1 luồng đơn thu gom rác dành cho ứng dụng siêu nhỏ vài chục MB RAM, đưa vào Heap 16GB chịu tải 3.500 TPS sẽ làm treo hệ thống hàng chục giây; và JVM không thể tắt SafePoint."
          ],
          tip: "Hễ đề bài nhắc tới Java 21 + Heap lớn (>= 8GB) + SLA P99 khắt khe vài trăm ms / chống rớt kết nối cổng thanh toán -> Chọn ngay **Generational ZGC** (`-XX:+UseZGC -XX:+ZGenerational`) + `-Xms == -Xmx` + `AlwaysPreTouch`!"
        }
      },
      {
        id: "R1-03",
        domain: "JVM & Đa luồng",
        lessonId: "J4",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: caseStudyR1,
        question: "Đội ngũ FinViet Digital Bank bật Java 21 Virtual Threads (`spring.threads.virtual.enabled=true`) và dùng `StructuredTaskScope` để gọi song song sang Fraud Scoring Engine cùng eKYC Service. Tuy nhiên khi tải tăng lên 800 request đồng thời trên Pod 8 vCPU, thông lượng tụt thê thảm và hệ thống gần như đóng băng dù CPU chỉ ở mức 12%. Bật cờ `-Djdk.tracePinnedThreads=full` phát hiện một thư viện client nội bộ bọc lời gọi đọc HTTP socket bên trong khối `synchronized (tokenMonitor) { ... }`. Nguyên nhân sâu xa và giải pháp triệt để là gì?",
        options: [
          "Virtual Threads không hỗ trợ giao thức mạng TCP/HTTP mà chỉ dùng cho tính toán CPU; cần tắt Virtual Threads và quay về `Executors.newCachedThreadPool()` không giới hạn số luồng OS.",
          "Khối `synchronized` làm xóa sạch vùng nhớ Stack của Virtual Thread trên Heap; chỉ cần thêm từ khóa `volatile` cho biến `tokenMonitor` và giữ nguyên khối `synchronized` là hết nghẽn.",
          "Do `StructuredTaskScope` tự động khóa toàn bộ bảng Database của PostgreSQL; cần tăng kích thước `-Xss` lên 16MB cho mỗi Virtual Thread để tránh tràn bộ nhớ.",
          "Thực hiện tác vụ chặn I/O (blocking network read) bên trong khối `synchronized` gây hiện tượng Carrier Thread Pinning: Virtual Thread bị ghim chặt vào OS Carrier Thread của `ForkJoinPool` (chỉ có 8 luồng tương ứng 8 vCPU), làm cạn sạch Carrier Pool; cần thay `synchronized` bằng `ReentrantLock` bọc `try/finally` để Virtual Thread tự động unmount khi chờ mạng."
        ],
        answer: 3,
        walkthrough: {
          keyword: "-Djdk.tracePinnedThreads=full ... bọc lời gọi đọc HTTP socket bên trong khối synchronized ... Pod 8 vCPU thông lượng tụt thê thảm dù CPU chỉ 12%",
          whyCorrect: "Đây là câu phân loại cực gắt về **Project Loom (Java 21 Virtual Threads)**! Cơ chế thần kỳ giúp hàng chục nghìn Virtual Threads chạy mượt trên 8 OS Carrier Threads là khi gặp blocking I/O (như chờ socket HTTP từ Fraud/eKYC), JVM sẽ tháo (unmount) ngăn xếp của Virtual Thread cất vào Heap để trả Carrier Thread đi phục vụ Virtual Thread khác. Tuy nhiên trên Java 21, nếu luồng đang nằm bên trong khối `synchronized` (hoặc gọi hàm native JNI), monitor gắn chặt với OS Carrier Thread khiến JVM **không thể unmount** — gọi là **Carrier Thread Pinning**! Chỉ cần 8 request đồng thời đi vào khối `synchronized` chờ mạng 2 giây là toàn bộ 8 Carrier Threads trên Pod 8 vCPU bị ghim chết cứng, hàng trăm request sau xếp hàng đứng nhìn dù CPU rảnh rỗi 12%. Thay `synchronized` bằng `java.util.concurrent.locks.ReentrantLock` cho phép JVM unmount Virtual Thread bình thường ngay cả khi đang giữ khóa!",
          whyWrong: [
            "Ngược lại hoàn toàn bản chất: Virtual Threads sinh ra chính là để tối ưu các tác vụ Blocking I/O mật độ cao (HTTP, Socket, JDBC), không phải cho tác vụ thuần CPU; còn `newCachedThreadPool()` tạo hàng vạn OS Thread sẽ gây OOM ngay.",
            "`volatile` chỉ đảm bảo tính nhìn thấy (visibility) của tham chiếu biến giữa các luồng, hoàn toàn không giải phóng monitor của khối `synchronized` nên lỗi Pinning vẫn còn nguyên.",
            "`StructuredTaskScope` chỉ quản lý vòng đời các nhánh tác vụ con trong bộ nhớ chứ không liên quan tới khóa DB, và Virtual Thread dùng stack co giãn động trên Heap chứ không cấp cố định 16MB OS stack.",
            ""
          ],
          tip: "Trên Java 21 Virtual Threads, thấy hiện tượng 'CPU thấp + throughput tụt thảm + có `synchronized` bọc gọi mạng/DB' -> Bắt bệnh ngay **Carrier Thread Pinning** và thay `synchronized` bằng **`ReentrantLock`**!"
        }
      },
      {
        id: "R1-04",
        domain: "Spring IoC & Transaction",
        lessonId: "S3",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR1,
        question: "Trong luồng chuyển tiền liên ngân hàng của FinViet Digital Bank, hàm `processInterbankTransfer()` đang đặt `@Transactional` bao trùm từ đầu đến cuối: (1) kiểm tra số dư và ghi bút toán giữ tiền trên PostgreSQL, (2) gọi HTTP đồng bộ sang Fraud Engine và cổng chuyển mạch đối tác (mất tới 2.500ms khi đối tác nghẽn), (3) cập nhật trạng thái hoàn tất. Với HikariCP tối đa 25 kết nối/Pod, mỗi khi đối tác chậm 2,5 giây, chỉ cần trên 10 giao dịch/giây là toàn bộ Pod báo lỗi `Connection is not available, request timed out after 3000ms`, kéo sập cả API xem số dư nội bộ! Bạn phải tái cấu trúc ranh giới giao dịch như thế nào?",
        options: [
          "Tách nhỏ ranh giới giao dịch bằng `TransactionTemplate` (hoặc tách sang Bean riêng): Giao dịch DB 1 mở cực ngắn vài mili-giây để kiểm tra số dư, đặt trạng thái `PENDING`/`HOLD` rồi commit nhả ngay kết nối về HikariCP; thực hiện toàn bộ lời gọi HTTP bên ngoài không giữ kết nối DB; sau đó mở Giao dịch DB 2 cực ngắn để hạch toán kết quả cuối cùng hoặc treo đối soát.",
          "Giữ nguyên `@Transactional` bao trùm toàn hàm để code gọn gàng, nhưng tăng `spring.datasource.hikari.maximum-pool-size` từ 25 lên 1.500 kết nối cho mỗi Pod để đủ chỗ chờ đối tác phản hồi.",
          "Thêm thuộc tính `@Transactional(readOnly = true, timeout = 30)` lên đầu hàm `processInterbankTransfer()` để PostgreSQL tự động chuyển kết nối sang chế độ chia sẻ không tốn slot trong HikariCP.",
          "Đặt chú thích `@Async` chồng lên cùng hàm `@Transactional` để Spring vừa giữ giao dịch Database mở ngầm vừa trả kết quả thành công ngay lập tức cho khách hàng trong 10ms."
        ],
        answer: 0,
        walkthrough: {
          keyword: "HikariCP tối đa 25 kết nối/Pod ... cổng chuyển mạch đối tác dao động 150ms đến 2.500ms ... tuyệt đối không giữ kết nối Database trong lúc chờ phản hồi mạng bên ngoài",
          whyCorrect: "Chào bạn, theo Định luật Little (`Concurrency = Throughput × HoldTime`), nếu giữ kết nối DB suốt 2,5 giây chờ mạng đối tác thì chỉ với `10 TPS × 2,5s = 25 kết nối`, toàn bộ HikariCP Pool cạn sạch sành sanh! Trong khi đó, thời gian thực thi câu lệnh SQL trên PostgreSQL chỉ mất tổng cộng 3–5ms (`25 / 0.005s = 5.000 TPS`!). Do đó, kiến trúc chuẩn Core Banking bắt buộc chia thành 2 pha giao dịch DB ngắn gọn tách rời: **Pha 1** mở Transaction 1 ghi nhận lệnh `PENDING` + phong tỏa số dư khả dụng (`HOLD`), commit ngay lập tức trong 3ms để trả kết nối DB về hồ HikariCP; **Pha giữa** gọi HTTP sang Fraud/NAPAS hoàn toàn bên ngoài DB Transaction; **Pha 2** nhận kết quả rồi mới mượn lại kết nối mở Transaction 2 trong 3ms để tất toán (`COMPLETED`), hoàn giữ (`COMPENSATED` khi bị từ chối rõ ràng) hoặc treo `SUSPENSE` khi timeout.",
          whyWrong: [
            "",
            "Tăng HikariCP lên 1.500 kết nối/Pod nhân với 10 Pod = 15.000 tiến trình backend trên PostgreSQL sẽ đánh sập hoàn toàn Database Server vì tràn RAM và bão Context Switching của CPU.",
            "`readOnly = true` không cho phép ghi bút toán chuyển tiền (sẽ văng lỗi `cannot execute INSERT/UPDATE in a read-only transaction`), và kết nối `readOnly` vẫn chiếm nguyên 1 slot vật lý trong HikariCP Pool.",
            "Trả kết quả 'Chuyển tiền thành công' giả trước khi trừ tiền thật và trước khi đối tác xác nhận là vi phạm nghiệp vụ nghiêm trọng, đồng thời luồng `@Async` vẫn ngâm cứng kết nối HikariCP suốt 2,5 giây y hệt cũ."
          ],
          tip: "Nguyên tắc sắt đá trong Ngân hàng: **DB Transaction chỉ bọc SQL (tính bằng ms), TUYỆT ĐỐI KHÔNG bọc Remote I/O (REST/SOAP/gRPC đối tác)**! Hãy dùng mô hình 2 giao dịch ngắn: `Tx1 (Hold/Pending) -> External Call -> Tx2 (Settle/Compensate)`."
        }
      },
      {
        id: "R1-05",
        domain: "Spring IoC & Transaction",
        lessonId: "S1",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: caseStudyR1,
        question: "Khi review code dịch vụ tỷ giá của FinViet Digital Bank, bạn thấy class `FxExchangeService` có hàm public `exchangeCurrency(FxCmd cmd)` (không gắn `@Transactional`) thực hiện kiểm tra đầu vào, sau đó gọi nội bộ `this.commitLedgerPostings(cmd)` (có gắn `@Transactional(rollbackFor = Exception.class)`) và `this.sendAuditLogAsync(cmd)` (có gắn `@Async`). Kết quả thực tế trên môi trường Staging là: khi ném lỗi ở giữa `commitLedgerPostings`, dữ liệu không hề rollback hết về đầu hàm đó, và `sendAuditLogAsync` vẫn chạy đồng bộ chặn ngay trên luồng HTTP chính làm chậm SLA! Nguyên nhân gốc rễ và cách khắc phục chuẩn nhất là gì?",
        options: [
          "Do Spring Boot 3 bỏ hỗ trợ CGLIB Proxy mặc định; cần đổi hai hàm `commitLedgerPostings` và `sendAuditLogAsync` sang phạm vi `private` để Spring Bytecode Weaving tự động kích hoạt.",
          "Do lời gọi nội bộ `this.method()` đi thẳng vào đối tượng đích (`target instance`) mà bỏ qua lớp vỏ bọc Spring AOP Proxy (bẫy Self-Invocation), khiến cả `@Transactional` lẫn `@Async` đều bị vô hiệu hóa hoàn toàn; cần tách phần ghi sổ cái và phần gửi audit sang các Spring Bean độc lập (`LedgerPostingService`, `AuditAsyncPublisher`) tiêm qua Constructor.",
          "Do thiếu từ khóa `synchronized` trên hàm `exchangeCurrency`; chỉ cần thêm `@Scope('prototype')` lên đầu `FxExchangeService` là mọi lời gọi `this.` sẽ tự động tạo giao dịch mới.",
          "Do `@Async` xung đột với `BigDecimal` khi serialize tham số trong cùng một class; cần chuyển tất cả tham số của hàm sang kiểu `String` rồi gọi lại `this.sendAuditLogAsync(...)`."
        ],
        answer: 1,
        walkthrough: {
          keyword: "gọi nội bộ this.commitLedgerPostings(cmd) ... và this.sendAuditLogAsync(cmd) ... dữ liệu không hề rollback ... vẫn chạy đồng bộ chặn ngay trên luồng HTTP chính",
          whyCorrect: "Chào em, đây chính là **Bẫy Self-Invocation (Tự gọi nội bộ)** nổi tiếng nhất trong mọi buổi phỏng vấn Spring Senior! Khi Spring khởi tạo một Bean có `@Transactional` hoặc `@Async`, IoC Container bọc ngoài đối tượng thật bằng một **CGLIB Proxy**. Mọi logic mở/đóng DB Transaction hay đẩy tác vụ sang ThreadPool của `@Async` đều nằm ở lớp Interceptor của Proxy này. Khi Controller bên ngoài gọi `fxExchangeService.exchangeCurrency()`, lời gọi đi qua Proxy; nhưng khi vào bên trong hàm đó và gọi `this.commitLedgerPostings()`, từ khóa `this` trỏ thẳng tới đối tượng Java trần trụi (raw target object) chứ không đi vòng ra ngoài Proxy nữa! Hệ quả là toàn bộ `@Transactional`, `@Async`, `@Cacheable`, `@Retry` trên hàm bị gọi qua `this.` đều biến thành vô hình. Cách chuẩn kiến trúc Clean Code & SRP nhất là tách trách nhiệm ra các Bean chuyên biệt (`LedgerPostingService`, `AuditAsyncPublisher`) và inject qua Constructor.",
          whyWrong: [
            "Spring Boot 3 vẫn dùng CGLIB Proxy mặc định cho `@Service`; đặc biệt CGLIB hoạt động bằng cơ chế kế thừa (subclassing) nên không bao giờ override được hàm `private` hay `final` — đổi sang `private` càng chắc chắn 100% mất tác dụng AOP!",
            "",
            "`@Scope('prototype')` chỉ tạo instance mới mỗi lần inject Bean chứ không thay đổi bản chất `this.` gọi trực tiếp bên trong cùng một instance.",
            "`@Async` truyền tham chiếu đối tượng trực tiếp trong bộ nhớ Heap giữa các luồng cùng JVM chứ không hề serialize mạng hay xung đột với `BigDecimal`."
          ],
          tip: "Trong Spring AOP (CGLIB/JDK Proxy), nhớ kỹ 2 điều làm chết `@Transactional` / `@Async`: **1. Gọi nội bộ `this.hamCon()` trong cùng class**, và **2. Đặt annotation lên hàm `private` / `final`**!"
        }
      },
      {
        id: "R1-06",
        domain: "Spring IoC & Transaction",
        lessonId: "S2",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR1,
        question: "Đội Mobile App và Kiểm toán An ninh của FinViet Digital Bank phản ánh hai vấn đề trên hệ thống API cũ: (1) Mọi lỗi nghiệp vụ như không đủ số dư hay vượt hạn mức đều trả về `HTTP 200 OK` kèm chuỗi tự chế, trong khi lỗi bất ngờ lại phơi bày nguyên tên bảng SQL ra JSON; (2) API xem lịch sử giao dịch dùng phân trang `OFFSET 40000 LIMIT 20` khiến tài khoản doanh nghiệp giao dịch nhiều bị vọt độ trễ lên 1.400ms (vỡ SLA P99 < 300ms). Thiết kế API nào giải quyết trọn vẹn cả hai vấn đề theo chuẩn ngân hàng hiện đại?",
        options: [
          "Đổi tất cả các lỗi nghiệp vụ sang trả về `HTTP 500 Internal Server Error` để cổng API Gateway dễ đếm lỗi, và tăng kích thước mỗi trang từ `LIMIT 20` lên `LIMIT 5000` để khách hàng ít phải bấm sang trang tiếp theo.",
          "Tiếp tục trả `HTTP 200 OK` cho mọi trường hợp nhưng mã hóa toàn bộ thông báo lỗi bằng Base64, kết hợp lưu toàn bộ sao kê 5 năm của mọi khách hàng lên biến `HttpSession` trên RAM của Pod.",
          "Chuẩn hóa xử lý ngoại lệ tập trung qua `@RestControllerAdvice` trả về đối tượng `ProblemDetail` chuẩn RFC 7807 / RFC 9457 với HTTP Status đúng ngữ nghĩa (`422 Unprocessable Entity`, `409 Conflict`), mã lỗi nghiệp vụ định danh (`errorCode`, `traceId`) che kín chi tiết SQL nội bộ; đồng thời chuyển phân trang sao kê sang Keyset/Seek Pagination (`WHERE account_id = :id AND (booking_date, txn_id) < (:lastDate, :lastId) ORDER BY booking_date DESC, txn_id DESC LIMIT 20`).",
          "Dùng `try/catch` trong từng Controller trả về trang lỗi HTML tĩnh, và thay `OFFSET 40000` bằng con trỏ `ResultSet.TYPE_SCROLL_SENSITIVE` giữ mở kết nối Database xuyên suốt giữa các lần khách vuốt màn hình trên điện thoại."
        ],
        answer: 2,
        walkthrough: {
          keyword: "chuẩn hóa phản hồi lỗi REST theo RFC 7807 ... độ trễ P99 dưới 300ms ... phơi bày tên bảng SQL ... OFFSET 40000 LIMIT 20 chậm 1.400ms",
          whyCorrect: "Chào bạn, câu này kết hợp hai kỹ năng thiết kế REST API thực chiến bậc nhất tại các ngân hàng số! Về chuẩn lỗi: Spring Boot 3 tích hợp sẵn class `ProblemDetail` tuân thủ **RFC 7807 / RFC 9457**, trả về cấu trúc chuẩn (`type`, `title`, `status`, `detail`, `instance`) kèm thuộc tính mở rộng như `errorCode: 'INSUFFICIENT_FUNDS'` và `traceId` để tra cứu log tập trung mà tuyệt đối không lộ `SQLException` hay tên bảng nội bộ, đồng thời dùng đúng HTTP Status (`422` cho vi phạm quy tắc nghiệp vụ, `409` cho trùng khóa/xung đột trạng thái) để API Gateway và Prometheus giám sát chính xác tỷ lệ lỗi hệ thống `5xx`. Về phân trang sao kê: câu lệnh `OFFSET 40000 LIMIT 20` bắt PostgreSQL phải đọc, sắp xếp rồi vứt bỏ 40.000 dòng đầu tiên mới lấy 20 dòng tiếp theo (`O(N)` chậm dần đều); chuyển sang **Keyset (Seek/Cursor) Pagination** nhảy thẳng vào vị trí con trỏ `(lastDate, lastId)` trên B-Tree Index giúp trang thứ 1 hay trang thứ 5.000 đều nhanh ổn định dưới **5ms**!",
          whyWrong: [
            "Trả `HTTP 500` cho lỗi khách nhập vượt số dư sẽ làm báo động giả toàn bộ hệ thống cảnh báo SRE và làm mở nhầm Circuit Breaker ở phía Gateway; còn `LIMIT 5000` làm nổ băng thông mạng và chậm hơn nữa.",
            "Base64 không phải mã hóa bảo mật, trả `200 OK` khi giao dịch thất bại là phản mẫu REST tai hại, và nhồi sao kê vào `HttpSession` vừa vi phạm Stateless REST vừa gây tràn Heap OOM ngay lập tức.",
            "",
            "Giữ con trỏ JDBC mở chờ người dùng vuốt màn hình điện thoại sẽ ngâm chết toàn bộ kết nối HikariCP trong vài giây, làm sập toàn cổng giao dịch."
          ],
          tip: "Thiết kế API Ngân hàng trên Spring Boot 3 nhớ cặp bài trùng: **Báo lỗi chuẩn `ProblemDetail` (RFC 7807) không lộ SQL** + **Sao kê lớn dùng Keyset Pagination `(booking_date, id) < (:cursor)` thay cho `OFFSET`**!"
        }
      },
      {
        id: "R1-07",
        domain: "JPA & Testing",
        lessonId: "S4",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: caseStudyR1,
        question: "Để tối ưu API tổng quan tài khoản kèm các giao dịch gần đây cho FinViet Digital Bank (SLA P99 < 300ms), một lập trình viên diệt lỗi N+1 bằng cách viết câu truy vấn Spring Data JPA: `@Query('SELECT a FROM Account a LEFT JOIN FETCH a.postings WHERE a.customerCif = :cif') Page<Account> findAccountsWithPostings(String cif, Pageable pageable);`. Khi lên môi trường tải thử nghiệm, log xuất hiện cảnh báo `HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory!`, RAM của Pod tăng vọt và P99 vọt lên 1.100ms! Vì sao xảy ra hiện tượng này và cách xử lý đúng chuẩn Hibernate là gì?",
        options: [
          "Khi kết hợp `JOIN FETCH` trên quan hệ một-nhiều (`@OneToMany postings`) cùng phân trang `Pageable`, số dòng bản ghi SQL bị nhân bản theo số giao dịch con khiến Hibernate không thể gắn `LIMIT/OFFSET` xuống SQL mà phải kéo TOÀN BỘ kết quả join vào bộ nhớ RAM của JVM rồi mới cắt trang; cần tách thành Truy vấn 2 bước (Bước 1 phân trang lấy `List<Long> accountIds`, Bước 2 `JOIN FETCH` với `WHERE a.id IN :accountIds`) hoặc dùng DTO Projection / `@BatchSize`.",
          "Do `LEFT JOIN FETCH` không hoạt động trên PostgreSQL 16; chỉ cần đổi từ khóa thành `RIGHT JOIN FETCH` và thêm từ khóa `DISTINCT` vào câu JPQL là Hibernate sẽ tự gắn `LIMIT` xuống Database.",
          "Do thiếu cấu hình `spring.jpa.open-in-view=true` trên Spring Boot 3; bật tính năng này lên sẽ giúp Hibernate chia nhỏ kết quả phân trang trực tiếp tại tầng Controller mà không tốn RAM.",
          "Do `Page<Account>` bắt buộc thực thi câu lệnh đếm `COUNT(*)` gây khóa độc quyền toàn bảng; chỉ cần chuyển kiểu trả về sang `ArrayList<Account>` và vẫn truyền `PageRequest.of(0, 10)` giữ nguyên `JOIN FETCH` là hết cảnh báo."
        ],
        answer: 0,
        walkthrough: {
          keyword: "JOIN FETCH a.postings ... Page<Account> ... HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory!",
          whyCorrect: "Chào em, cảnh báo `HHH90003004` là một cái bẫy chết người trên Production mà rất nhiều lập trình viên tưởng mình đã tối ưu xong N+1 nhưng thực ra vừa cài bom hẹn giờ OOM! Hãy hình dung: 1 tài khoản `Account` có 500 dòng `postings`. Khi SQL thực hiện `JOIN`, 1 `Account` nở ra thành 500 dòng kết quả phẳng. Nếu Hibernate ngây thơ gắn `LIMIT 10` xuống SQL, Database chỉ trả về 10 dòng `postings` đầu tiên của đúng 1 tài khoản thứ nhất thay vì đủ dữ liệu của 10 tài khoản! Vì không muốn trả thiếu dữ liệu con, Hibernate âm thầm **bỏ hoàn toàn `LIMIT` khỏi câu SQL**, kéo sạch hàng chục nghìn dòng join từ PostgreSQL lên bộ nhớ Heap của Java rồi mới tự đếm cắt trang trên RAM! Cách giải quyết chuẩn Senior là **Two-Step Query**: Truy vấn 1 chỉ lấy `Page<Long>` danh sách ID tài khoản (SQL `LIMIT` chuẩn xác, siêu nhẹ); Truy vấn 2 mới `SELECT a FROM Account a LEFT JOIN FETCH a.postings WHERE a.id IN :ids` (chạy đúng 2 câu SQL gọn ghẽ, không tốn 1 byte RAM thừa!).",
          whyWrong: [
            "",
            "PostgreSQL hỗ trợ `LEFT JOIN` hoàn hảo; thêm `DISTINCT` hay đổi loại join vẫn không giải quyết được nghịch lý nhân bản số dòng ở tầng SQL nên Hibernate vẫn cắt trang trên RAM.",
            "`spring.jpa.open-in-view=true` (OSIV) là phản mẫu giữ kết nối DB mở tới tận lúc render JSON và dễ phát sinh N+1 ngầm ở tầng View, hoàn toàn không chữa được lỗi `HHH90003004`.",
            "Kể cả đổi `Page<Account>` sang `Slice<Account>` hay `List<Account>` mà vẫn truyền `Pageable` đi kèm collection `JOIN FETCH`, Hibernate vẫn áp dụng `maxResults` trên bộ nhớ RAM y hệt."
          ],
          tip: "Thấy cặp đôi **`@OneToMany JOIN FETCH` + `Pageable`** trong JPA -> Phản xạ ngay lỗi **`HHH90003004` (phân trang trên RAM gây OOM)**! Chữa dứt điểm bằng **Two-Step ID Query** (lấy list ID có `LIMIT` trước, `JOIN FETCH WHERE id IN (:ids)` sau)."
        }
      },
      {
        id: "R1-08",
        domain: "Java Core & Tiền tệ",
        lessonId: "J6",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR1,
        question: "Theo quy định bắt buộc về Clean / Hexagonal Architecture của Principal Architect tại FinViet Digital Bank, bạn được giao rà soát cấu trúc module `core-transfer`. Hiện tại class `domain.Account` đang gắn đầy `@Entity`, `@Table`, `@JsonIgnore`, có sẵn tất cả các hàm `setBalance(...)` công khai, trong khi toàn bộ quy tắc kiểm tra số dư tối thiểu và tính phí chuyển tiền lại viết rải rác trong `TransferRestController` và `JpaAccountAdapter`. Bạn cần tái cấu trúc module này như thế nào để đạt chuẩn DDD & Hexagonal?",
        options: [
          "Giữ nguyên các annotation `@Entity` và public setter trong `domain.Account` cho tiện ánh xạ bảng, chỉ cần đổi tên các package thành `ports` và `adapters` là tự động đạt chuẩn Hexagonal Architecture.",
          "Chuyển toàn bộ logic kiểm tra số dư và trừ tiền xuống viết bằng Stored Procedure PL/pgSQL trong PostgreSQL, còn tầng Java chỉ giữ lại một class DTO rỗng chuyển tiếp JSON từ Controller xuống thẳng JDBC.",
          "Gộp chung `Controller`, `UseCase`, `Domain` và `Repository` vào một package phẳng duy nhất nhưng đánh dấu tất cả các class là `package-private` để ngăn module khác truy cập.",
          "Làm sạch tầng `domain` thành Pure Java (Rich Domain Model `Account`, Value Object `Money` bất biến đóng gói chặt quy tắc nghiệp vụ qua các hành vi như `debit(Money amount)`, không phụ thuộc Spring/Hibernate/Jackson) cùng các interface Outbound/Inbound Ports; đặt UseCase điều phối ở tầng `application`; và cô lập REST Controller, JPA Entity/Mapper, HTTP Client đối tác ở tầng `infrastructure` Adapters phụ thuộc ngược vào trong."
        ],
        answer: 3,
        walkthrough: {
          keyword: "tuân thủ Clean/Hexagonal Architecture tách biệt hoàn toàn Domain khỏi Spring/Hibernate ... Rich Domain Model",
          whyCorrect: "Chào bạn, trái tim của **Hexagonal Architecture (Ports & Adapters)** kết hợp **Domain-Driven Design (DDD)** trong Core Banking nằm ở **Dependency Rule (Quy tắc phụ thuộc hướng tâm)** và **Rich Domain Model**: mọi vòng ngoài (`infrastructure`: Web Controller, Hibernate `@Entity`, Feign/RestClient gọi Fraud/eKYC) phải phụ thuộc vào vòng trong (`application` -> `domain`), tuyệt đối không có chiều ngược lại! Khi `domain.Account` không dính bất kỳ thư viện hạ tầng nào và khóa chặt các setter tuỳ tiện, mọi quy tắc cốt lõi (không cho rút quá số dư khả dụng, cộng phí đúng loại tiền tệ, kiểm tra trạng thái phong tỏa) đều nằm tập trung trong phương thức nghiệp vụ `account.debit(amount, fee)` và có thể chạy hàng nghìn Unit Test thuần Java trong **0.2 giây** mà không cần bật Spring Context hay Database!",
          whyWrong: [
            "Chỉ đổi tên thư mục mà bên trong `domain` vẫn import `jakarta.persistence.*`, `com.fasterxml.jackson.*` và mở toang `setBalance()` (Anemic Domain Model) thì vẫn vi phạm hoàn toàn bản chất tách biệt của Hexagonal.",
            "Nhồi toàn bộ nghiệp vụ vào Stored Procedure làm hệ thống cực khó kiểm thử tự động, khó quản lý phiên bản, không thể scale ngang tầng xử lý và khóa chặt ngân hàng vào một hệ quản trị CSDL duy nhất.",
            "Gộp chung Controller, SQL/JPA và quy tắc tiền tệ vào một khối không tách Port/Adapter khiến mọi thay đổi nhỏ ở giao thức REST hay cấu trúc bảng DB đều làm gãy trực tiếp logic nghiệp vụ lõi.",
            ""
          ],
          tip: "Kiểm tra nhanh kiến trúc Hexagonal chuẩn Senior: Mở file trong package `domain` ra nhìn phần `import` — nếu thấy `org.springframework.*` hay `jakarta.persistence.*` là sai kiến trúc ngay (ArchUnit sẽ chặn đỏ pipeline)!"
        }
      },
      {
        id: "R1-09",
        domain: "JPA & Testing",
        lessonId: "S6",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR1,
        question: "Bộ pipeline CI/CD hiện tại của FinViet Digital Bank chạy 150 bài kiểm thử tích hợp xanh mượt bằng cơ sở dữ liệu nhúng H2 (`MODE=PostgreSQL`) và đặt `@Transactional` ngay trên class `@SpringBootTest` để tự động dọn dữ liệu sau mỗi bài test. Thế nhưng vừa triển khai lên Staging dùng PostgreSQL 16 thật, hệ thống nổ hàng loạt lỗi cú pháp toán tử `JSONB`, sai hành vi khóa `SELECT ... FOR UPDATE NOWAIT` và văng `LazyInitializationException` khi serialize phản hồi! Chiến lược kiểm thử nào khắc phục triệt để tình trạng 'test xanh giả tạo' này?",
        options: [
          "Viết thêm các hàm `if (isH2Database())` rải rác trong code nghiệp vụ Production để rẽ nhánh bỏ qua khóa `FOR UPDATE NOWAIT` và cột `JSONB` mỗi khi chạy test trên CI/CD.",
          "Thay thế H2 bằng Singleton Container `PostgreSQLContainer` (`postgres:16-alpine`) của Testcontainers chạy đúng bộ script Flyway thật, gỡ bỏ `@Transactional` khỏi class test tích hợp để kiểm chứng trọn vẹn quá trình commit thật lẫn ranh giới Persistence Context (làm sạch dữ liệu giữa các bài test bằng `TRUNCATE` hoặc dữ liệu cô lập), kết hợp WireMock giả lập độ trễ cổng đối tác và ArchUnit kiểm tra kiến trúc.",
          "Xóa toàn bộ bài kiểm thử tích hợp khỏi CI/CD và chỉ giữ lại Unit Test dùng `@Mock` cho tất cả các interface Repository để pipeline không bao giờ gặp sai khác giữa H2 và PostgreSQL.",
          "Giữ nguyên H2 in-memory và vẫn gắn `@Transactional` trên class test, nhưng bật thêm `spring.jpa.properties.hibernate.enable_lazy_load_no_trans=true` trên môi trường Production để che giấu lỗi `LazyInitializationException`."
        ],
        answer: 1,
        walkthrough: {
          keyword: "kiểm thử tích hợp trên CI/CD phải phản ánh trung thực hành vi khóa dòng lẫn phương ngữ SQL của PostgreSQL thật ... LazyInitializationException",
          whyCorrect: "Chào em, đây là bài học xương máu của mọi team làm tài chính! Có hai nguyên nhân gây ra 'màu xanh lừa dối' ở đây: Thứ nhất, H2 dù bật cờ `MODE=PostgreSQL` vẫn chỉ mô phỏng bề nổi, khác xa PostgreSQL 16 thật về cơ chế MVCC, khóa đồng thời `FOR UPDATE NOWAIT / SKIP LOCKED`, Partitioning và kiểu `JSONB`. Dùng **Testcontainers** (khởi tạo theo mẫu Singleton Container dùng chung cho cả đợt chạy test chỉ mất vài giây startup) đảm bảo test chạy trên engine PostgreSQL 16 thật 100% khớp từng bản migration Flyway. Thứ hai, gắn `@Transactional` lên đầu hàm/class `@SpringBootTest` làm toàn bộ bài test và code nghiệp vụ dùng chung một Hibernate Session mở suốt từ đầu tới cuối rồi cuối cùng... rollback bỏ đi không bao giờ thực sự `COMMIT`! Điều này che giấu hoàn toàn lỗi `LazyInitializationException` sau khi đóng Session cũng như các ràng buộc `DEFERRED` chỉ kiểm tra lúc commit thật.",
          whyWrong: [
            "Đưa nhánh `if (isH2Database())` vào code nghiệp vụ Production là phản mẫu cực kỳ nguy hiểm: nhánh code chạy thật trên Production lại chính là nhánh không bao giờ được test trên CI!",
            "",
            "Mock toàn bộ Repository chỉ kiểm tra được logic Java trên giấy, hoàn toàn mù tịt trước lỗi câu lệnh `@Query` sai cú pháp, thiếu Index, Deadlock hay sai ánh xạ cột Database.",
            "Cờ `enable_lazy_load_no_trans=true` tự động mở ngầm một kết nối tạm thời mới cho mỗi thuộc tính lazy chưa nạp, gây bão kết nối HikariCP và lỗi N+1 nghiêm trọng dưới tải cao."
          ],
          tip: "Chuẩn Testing Ngân hàng: **Không dùng H2 test khóa/SQL đặc thù Postgres (hãy dùng Testcontainers Singleton)** + **Không gắn `@Transactional` lên bài `@SpringBootTest` đầu-cuối (để kiểm chứng commit thật & bắt sớm `LazyInitializationException`)**!"
        }
      },
      {
        id: "R1-10",
        domain: "Java Core & Tiền tệ",
        lessonId: "J1",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Hệ thống Core Lending cần chia đều khoản phí thẩm định `10.000.000 VNĐ` (đơn vị tiền tệ không có xu lẻ, `scale = 0`) cho 3 đồng chủ khoản vay để hạch toán vào Sổ cái Kép. Nếu lập trình viên tính mỗi phần bằng `total.divide(BigDecimal.valueOf(3), 0, RoundingMode.HALF_EVEN)` thì mỗi người chịu `3.333.333 VNĐ`, tổng 3 dòng Nợ chỉ bằng `9.999.999 VNĐ`, lệch mất `1 VNĐ` so với dòng Có `10.000.000 VNĐ` khiến hệ thống ném lỗi `UnbalancedJournalException`! Thuật toán phân bổ tiền lẻ (Penny Allocation) chuẩn nhất trong `Money` Value Object xử lý bài toán này như thế nào?",
        options: [
          "Tăng `scale` của đồng VNĐ trong cơ sở dữ liệu lên 8 chữ số thập phân để lưu `3333333.33333333`, rồi bỏ qua bước kiểm tra cân bằng tổng Nợ = tổng Có khi chênh lệch nhỏ hơn 5 VNĐ.",
          "Dùng `RoundingMode.UP` cho cả 3 phần để mỗi người chịu `3.333.334 VNĐ`, sau đó ngân hàng tự động ghi nhận phần dư `2 VNĐ` thu thừa vào doanh thu khác mà không cần thông báo.",
          "Thực hiện phép chia lấy phần nguyên và phần dư trên đơn vị nhỏ nhất (`divideAndRemainder`), gán thương cơ sở `3.333.333 VNĐ` cho cả 3 phần, sau đó phân bổ lần lượt từng `1 VNĐ` của phần dư (`remainder = 1`) vào các phần đầu tiên theo quy tắc xác định trước (kết quả `[3.333.334, 3.333.333, 3.333.333]`) để tổng các phần phân bổ luôn bằng chính xác tuyệt đối `10.000.000 VNĐ`.",
          "Sinh ngẫu nhiên bằng `Math.random()` xem ai chịu phần lẻ trong mỗi lần truy vấn báo cáo sao kê mà không lưu kết quả phân bổ cố định xuống Sổ cái."
        ],
        answer: 2,
        walkthrough: {
          keyword: "chia đều 10.000.000 VNĐ (scale = 0) cho 3 ... lệch mất 1 VNĐ khiến hệ thống ném lỗi UnbalancedJournalException ... Penny Allocation",
          whyCorrect: "Chào bạn, đây chính là **Bài toán đồng xu lẻ của Martin Fowler (FoEAA Money Allocation Pattern)** xuất hiện trong mọi hệ thống Chia phí, Trả góp kỳ cuối và Phân bổ chiết khấu hóa đơn! Trong kế toán ngân hàng, tiền không bao giờ được phép tự sinh thêm hay tự bốc hơi dù chỉ 1 đồng, và tiền thực thanh toán bằng VNĐ không tồn tại tờ 0,33 đồng. Thuật toán `Money.allocate(int targets)` chuẩn mực thực hiện chia nguyên trên lượng tiền đơn vị tối thiểu: `10.000.000 / 3` được thương `3.333.333` và số dư `remainder = 1`. Vòng lặp rải đều từng `1` đơn vị của `remainder` cho `remainder` phần tử đầu tiên (hoặc dồn vào kỳ trả góp cuối cùng theo hợp đồng), thu được mảng bất biến `[3.333.334, 3.333.333, 3.333.333]`. Tổng cộng lại khớp khít `10.000.000 VNĐ` 100%, vừa công bằng tối đa (chênh lệch giữa các phần không bao giờ vượt quá 1 đơn vị nhỏ nhất) vừa giữ vững phương trình bất biến `Tổng Debit == Tổng Credit`!",
          whyWrong: [
            "Nới lỏng kiểm tra `Tổng Nợ = Tổng Có` là điều cấm kỵ tuyệt đối trong Sổ cái Core Banking: một kẽ hở bỏ qua 5 VNĐ lặp lại hàng triệu giao dịch bằng thuật toán Salami Slicing có thể rút ruột hàng tỷ đồng.",
            "Dùng `RoundingMode.UP` thu tổng `10.000.002 VNĐ` là thu lố tiền khách hàng trái hợp đồng và vẫn làm tổng dòng Nợ vượt quá giá trị gốc `10.000.000 VNĐ`.",
            "",
            "Tính ngẫu nhiên mỗi lần xem báo cáo mà không lưu bút toán cố định sẽ khiến sao kê hôm nay khác sao kê ngày mai, vi phạm nghiêm trọng tính tất định (determinism) của tài chính."
          ],
          tip: "Khi gặp bài toán **Chia tiền / Phân bổ chiết khấu / Chia kỳ trả góp** trong phỏng vấn Live Coding: Đừng chỉ `.divide()` từng phần độc lập — hãy nhắc ngay tới **Fowler's Money Allocation (`divideAndRemainder` + phân bổ phần dư 1 đơn vị)** để bảo toàn tổng 100%!"
        }
      },
      {
        id: "R1-11",
        domain: "JVM & Đa luồng",
        lessonId: "J2",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Một dịch vụ Cổng chuyển mạch thẻ ISO 8583 sử dụng Netty đọc gói tin nhị phân kết hợp biên dịch động công thức tính phí bằng `GroovyClassLoader.parseClass(scriptText)` trên mỗi giao dịch. Dịch vụ chạy trong container giới hạn 4GB RAM với `-Xms2g -Xmx2g`. Biểu đồ giám sát cho thấy vùng Heap luôn ổn định quanh mức 900MB (chưa bao giờ chạm trần 2GB), nhưng cứ sau 48 giờ chạy liên tục, JVM lại sập với lỗi `java.lang.OutOfMemoryError: Metaspace` hoặc bị Linux Kernel giết tiến trình (`Exit Code 137`)! Chẩn đoán và hướng xử lý nào đúng bản chất bộ nhớ JVM?",
        options: [
          "Mỗi lần gọi `GroovyClassLoader.parseClass()` tạo ra một Class metadata mới nạp liên tục vào vùng Non-Heap `Metaspace` (mặc định không giới hạn cứng cho tới khi ăn cạn RAM vật lý của container), cộng thêm nguy cơ rò rỉ `DirectByteBuffer` ngoài Heap của Netty nếu quên giải phóng `ByteBuf`; cần cache kết quả biên dịch script theo mã băm nội dung, đảm bảo `ReferenceCountUtil.release(byteBuf)`, và đặt trần bảo vệ `-XX:MaxMetaspaceSize=256m -XX:MaxDirectMemorySize=512m`.",
          "Do `-Xmx2g` quá lớn so với 900MB đang dùng khiến vùng Eden không bao giờ dọn dẹp `Metaspace`; chỉ cần giảm `-Xmx` xuống `1024m` là Garbage Collector sẽ tự xóa toàn bộ class Groovy mỗi giây.",
          "Do `Metaspace` nằm bên trong vùng Young Generation của Heap nhưng bị phân mảnh; chỉ cần tăng kích thước ngăn xếp luồng `-Xss` từ 1MB lên 8MB là hết lỗi `OutOfMemoryError: Metaspace`.",
          "Do Linux Kernel luôn tự động giết mọi tiến trình Java sau 48 giờ nếu không cấu hình swap file 32GB trên ổ cứng của Kubernetes Worker Node."
        ],
        answer: 0,
        walkthrough: {
          keyword: "GroovyClassLoader.parseClass(scriptText) trên mỗi giao dịch ... Netty ... Heap ổn định 900MB nhưng sập OutOfMemoryError: Metaspace hoặc Exit Code 137",
          whyCorrect: "Chào em, câu hỏi này bóc tách trực diện sự ngộ nhận kinh điển: **Bộ nhớ của tiến trình JVM KHÔNG CHỈ CÓ HEAP (`-Xmx`)**! Tổng RAM thực tế (`RSS`) của JVM bằng: `Heap + Metaspace + Direct Memory (Off-Heap Netty NIO) + Thread Stacks + CodeCache + Native GC overhead`. Khi gọi `parseClass(script)` trên từng giao dịch mà không cache, mỗi lần gọi sinh ra một class mới tinh dưới một ClassLoader riêng lẻ, bơm metadata thẳng vào **Metaspace** (nằm ở Native Memory ngoài Heap). Nếu không giới hạn `-XX:MaxMetaspaceSize`, Metaspace cứ phình to mãi cho tới khi tổng `RSS` vượt trần 4GB của container và bị Linux cgroups OOMKiller chém bay bằng `SIGKILL (Exit Code 137)` dù biểu đồ Heap 900MB trông cực kỳ bình yên! Tương tự, Netty dùng Pooled Direct ByteBuffer nằm ngoài Heap — quên `.release()` trong handler ngoại lệ cũng gây rò rỉ Off-Heap y hệt.",
          whyWrong: [
            "",
            "Thu nhỏ `-Xmx` không ngăn được việc sinh mới hàng triệu class động mỗi ngày nếu các `ClassLoader` hoặc tham chiếu vẫn tiếp tục được khởi tạo liên tục trên từng request.",
            "`Metaspace` hoàn toàn KHÔNG nằm trong Young Generation của Heap (từ Java 8 trở đi nó nằm ở Native Memory), và tăng `-Xss` lên 8MB chỉ làm tốn thêm hàng trăm MB Native RAM cho các Thread Stack khiến container chết OOMKilled nhanh hơn!",
            "Linux Kernel không hề có bộ đếm giết tiến trình sau 48 giờ, và Kubernetes chuẩn Production luôn tắt hoàn toàn Swap (`swapoff -a`) để đảm bảo tính dự đoán tài nguyên."
          ],
          tip: "Gặp triệu chứng **'Biểu đồ Heap vẫn thấp đẹp nhưng Pod vẫn chết OOM / Exit 137'** -> Kiểm tra ngay 3 thủ phạm Non-Heap: **1. Metaspace (sinh class/proxy động)**, **2. Direct Memory (Netty ByteBuf quên release)**, **3. Số lượng OS Thread × `-Xss`**!"
        }
      },
      {
        id: "R1-12",
        domain: "JVM & Đa luồng",
        lessonId: "J3",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Để xử lý luồng gửi mã xác thực Smart OTP ưu tiên cao, một ứng viên cấu hình `ThreadPoolExecutor` tường minh như sau: `new ThreadPoolExecutor(4, 32, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(2000), namedFactory, new ThreadPoolExecutor.CallerRunsPolicy())`. Ứng viên kỳ vọng khi có 20 khách hàng yêu cầu OTP cùng lúc, pool sẽ lập tức mở rộng từ 4 luồng lên 20 luồng để gửi đi song song tức thì. Tuy nhiên trên thực tế, khi hàng đợi đang tồn đọng 500 yêu cầu OTP bị trễ, số luồng đang chạy (`activeCount`) vẫn dậm chân tại đúng con số 4! Giải thích nào đúng với cơ chế nội tại của `ThreadPoolExecutor` trong JDK?",
        options: [
          "Do `CallerRunsPolicy` khóa cứng số lượng luồng ở mức `corePoolSize = 4` ngay từ lúc khởi tạo; phải đổi sang `DiscardOldestPolicy` thì pool mới mở rộng lên 32 luồng.",
          "Do `TimeUnit.SECONDS` quá dài nên JVM phải chờ hết 60 giây đầu tiên mới được phép cấp phát luồng thứ 5 trong `ThreadPoolExecutor`.",
          "Do lớp `LinkedBlockingQueue` chỉ hỗ trợ chế độ đơn luồng (single-threaded consumer) nên 28 luồng phụ còn lại không thể lấy phần tử ra khỏi hàng đợi.",
          "Theo thứ tự ưu tiên nội tại của `ThreadPoolExecutor` chuẩn trong JDK: khi số luồng đạt `corePoolSize` (4), mọi tác vụ mới đều bị đẩy vào `workQueue` trước tiên; pool CHỈ tạo thêm luồng vượt quá `corePoolSize` tiến tới `maximumPoolSize` (32) sau khi hàng đợi `LinkedBlockingQueue(2000)` đã ĐẦY TRÀN cả 2.000 chỗ! Với tác vụ OTP nhạy cảm độ trễ, nên đặt `corePoolSize` cao tương xứng tải thực (ví dụ `core = max = 32` kèm `allowCoreThreadTimeOut` nếu cần) và giữ hàng đợi nhỏ hợp lý."
        ],
        answer: 3,
        walkthrough: {
          keyword: "corePoolSize = 4, maximumPoolSize = 32, LinkedBlockingQueue<>(2000) ... hàng đợi tồn đọng 500 yêu cầu nhưng số luồng vẫn dậm chân tại 4",
          whyCorrect: "Chào bạn, 8 trên 10 ứng viên đi phỏng vấn Java Concurrency đều sập chiếc bẫy quy tắc vận hành của `java.util.concurrent.ThreadPoolExecutor` này! Đa số lầm tưởng rằng khi 4 core threads bận hết thì task thứ 5 sẽ đẻ ngay thread thứ 5 (giống kiểu Tomcat Connector thread pool đã tuỳ biến riêng), hết 32 threads mới xếp vào queue. **KHÔNG HỀ!** Trong JDK chuẩn, thứ tự của `ThreadPoolExecutor.execute()` là: **Bước 1:** Nếu `< corePoolSize` (4) -> tạo core thread mới; **Bước 2:** Nếu đủ 4 core threads -> nhét task vào `workQueue.offer(task)` cho tới khi đầy khít 2.000 chỗ; **Bước 3:** CHỈ KHI `workQueue.offer()` trả về `false` (đã ứ 2.000 OTP trong queue!), nó mới tạo thêm non-core thread thứ 5..32; **Bước 4:** Đầy cả 2.000 queue lẫn 32 max threads mới gọi `RejectedExecutionHandler`. Thành ra đặt `core=4, max=32, queue=2000` khiến 500 khách hàng phải xếp hàng chờ chỉ 4 luồng cày cuốc làm OTP hết hạn!",
          whyWrong: [
            "`CallerRunsPolicy` chỉ được kích hoạt ở Bước 4 khi cả `maximumPoolSize` lẫn `workQueue` đều đã kịch trần, hoàn toàn không chặn việc mở rộng luồng; còn `DiscardOldestPolicy` âm thầm vứt bỏ mã OTP của khách đến trước là lỗi mất tin nhắn nghiêm trọng!",
            "`keepAliveTime = 60s` là thời gian rảnh tối đa trước khi thu hồi các luồng dư ra ngoài `corePoolSize`, không phải độ trễ chờ tạo luồng mới.",
            "`LinkedBlockingQueue` hoàn toàn an toàn đa luồng (sử dụng cặp khóa tách biệt `takeLock` và `putLock`) cho phép hàng chục consumer lấy dữ liệu song song.",
            ""
          ],
          tip: "Thuộc lòng thứ tự 4 bước của JDK `ThreadPoolExecutor`: **`Core Threads -> Đầy Queue -> Mới nở lên Max Threads -> RejectionPolicy`**! (Đừng nhầm với `EagerThreadPool` đã độ chế riêng của Tomcat/Dubbo)."
        }
      },
      {
        id: "R1-13",
        domain: "JVM & Đa luồng",
        lessonId: "J3",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Màn hình 'Tổng hợp Tài sản 360' của ngân hàng sử dụng `CompletableFuture.supplyAsync(() -> cardPartnerClient.fetchCreditSummary(cif))` (không truyền tham số `Executor` thứ hai) để gọi đồng thời 4 hệ thống vệ tinh. Vào chiều thứ Sáu, hệ thống Quản lý Thẻ đối tác bị nghẽn mạng phản hồi chậm 12 giây. Kỳ lạ thay, không chỉ màn hình Tài sản 360 bị chậm mà cả tính năng tính biểu phí nội bộ dùng `parallelStream()` ở một module khác trong cùng JVM trên Pod 8 vCPU cũng bị treo cứng theo! Đâu là nguyên nhân gốc rễ và cách khắc phục chuẩn Production?",
        options: [
          "Do `CompletableFuture` dùng khóa toàn cục cấp JVM (`JVM Global Lock`) cho mọi biểu thức lambda; cần viết lại toàn bộ bằng lớp `java.util.Timer` cổ điển.",
          "Khi gọi `CompletableFuture.supplyAsync(Supplier)` không chỉ định `Executor` riêng, toàn bộ tác vụ mặc định dùng chung `ForkJoinPool.commonPool()` duy nhất của toàn JVM (chỉ có `vCPU - 1 = 7` luồng trên Pod 8 core, vốn thiết kế cho tính toán CPU ngắn hạn và cũng là nơi `parallelStream()` chạy); 7 lời gọi mạng bị treo 12 giây sẽ làm nghẽn sạch Common Pool toàn cục! Phải truyền tường minh một `Executor` riêng biệt có giới hạn theo từng đối tác (Bulkhead isolation) kèm `.orTimeout(2, TimeUnit.SECONDS)`.",
          "Do biến `cif` truyền vào lambda bị thay đổi địa chỉ bộ nhớ giữa chừng; chỉ cần ép kiểu `(final String cif)` là `ForkJoinPool` tự động nhân bản lên 500 luồng.",
          "Do `parallelStream()` tự động mở giao dịch 2PC sang hệ thống Quản lý Thẻ đối tác; chỉ cần đổi `supplyAsync` thành `runAsync` không tham số Executor là tự tách khỏi `commonPool`."
        ],
        answer: 1,
        walkthrough: {
          keyword: "CompletableFuture.supplyAsync(...) không truyền tham số Executor thứ hai ... Pod 8 vCPU ... cả parallelStream() ở module khác trong cùng JVM cũng treo cứng theo",
          whyCorrect: "Chào em, đây là sự cố dây chuyền (Cascading Starvation) cực kỳ phổ biến khi dev dùng `CompletableFuture` theo thói quen viết tắt! Hàm `CompletableFuture.supplyAsync(supplier)` 1 tham số sẽ đẩy thẳng công việc vào **`ForkJoinPool.commonPool()`** dùng chung cho toàn bộ tiến trình JVM, có kích thước mặc định bằng `Runtime.getRuntime().availableProcessors() - 1` (trên Pod 8 vCPU chỉ có đúng **7 worker threads**!). `ForkJoinPool` được tối ưu cho các bài toán chia để trị thuần CPU không bị chặn, và cũng chính là hồ luồng mặc định phục vụ mọi `.parallelStream()`. Khi nhét tác vụ Blocking HTTP I/O treo 12 giây vào đây, chỉ cần 2 request của khách hàng (`2 × 4 nhánh = 8 tác vụ`) đã lấp kín sạch 7 luồng của `commonPool`, làm tê liệt mọi tác vụ bất đồng bộ khác trong toàn ứng dụng! Chuẩn Senior bắt buộc luôn dùng hàm 2 tham số `supplyAsync(supplier, dedicatedPartnerExecutor)` kết hợp `.orTimeout(...)` và `.exceptionally(...)`!",
          whyWrong: [
            "`CompletableFuture` hoàn toàn không có khóa toàn cục cho lambda, còn `java.util.Timer` chỉ có duy nhất 1 luồng chạy tuần tự — một task treo là chết đứng toàn bộ lịch trình!",
            "",
            "Biến bắt giữ trong lambda vốn dĩ đã phải `effectively final`, việc ghi thêm từ khóa `final` không làm thay đổi kích thước cố định của `ForkJoinPool.commonPool()`.",
            "Cả `runAsync(Runnable)` 1 tham số lẫn `supplyAsync(Supplier)` 1 tham số đều chạy trên cùng `ForkJoinPool.commonPool()` mặc định như nhau."
          ],
          tip: "Luật bất thành văn khi Code Review Java: **CẤM dùng `CompletableFuture.supplyAsync(fn)` / `runAsync(fn)` 1 tham số cho I/O**! Luôn bắt buộc truyền `Executor` chuyên biệt ở tham số thứ 2 + gắn `.orTimeout(...)`."
        }
      },
      {
        id: "R1-14",
        domain: "JVM & Đa luồng",
        lessonId: "J4",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Một cổng Open Banking Gateway vừa nâng cấp từ Tomcat Thread Pool truyền thống (200 luồng cố định tái sử dụng) sang Java 21 `Executors.newVirtualThreadPerTaskExecutor()` xử lý 15.000 request/giây. Chỉ sau 10 phút chịu tải, dung lượng bộ nhớ cấp phát tăng vọt bất thường gây áp lực GC dữ dội. Kiểm tra code cũ thấy một lớp tiện ích dùng `private static final ThreadLocal<SimpleDateFormat> DF` và `ThreadLocal<byte[]>` (bộ đệm mã hóa 128KB) để tái sử dụng đối tượng đắt đỏ trên từng luồng. Vì sao kỹ thuật cũ này phản tác dụng nặng nề trên Virtual Threads và nên sửa thế nào?",
        options: [
          "Virtual Threads KHÔNG được gom hồ để tái sử dụng (mỗi request tạo mới một Virtual Thread dùng 1 lần rồi hủy), nên lưu các đối tượng nặng như mảng đệm 128KB hay `SimpleDateFormat` vào `ThreadLocal` khiến JVM phải khởi tạo mới 15.000 bản sao/giây (~1,9 GB rác mỗi giây!) thay vì 200 bản cố định như trước; cần thay `SimpleDateFormat` bằng `DateTimeFormatter` bất biến dùng chung toàn cục (`static final`), bỏ thói quen dùng `ThreadLocal` làm object pool và ưu tiên truyền ngữ cảnh bất biến gọn nhẹ (hoặc `ScopedValue`).",
          "Do lớp `ThreadLocal` đã bị xóa hoàn toàn khỏi thư viện chuẩn của Java 21 nên JVM phải dùng Reflection tạo lại lớp giả lập tốn gấp 100 lần RAM.",
          "Do `SimpleDateFormat` tự động mở kết nối mạng NTP ra Internet mỗi khi chạy trên Virtual Thread; chỉ cần bọc thêm `synchronized` quanh `ThreadLocal.get()` là giảm được 99% RAM.",
          "Do `newVirtualThreadPerTaskExecutor()` giới hạn tối đa chỉ 16 luồng chạy đồng thời nên 15.000 request bị xếp vào `LinkedBlockingQueue` gây tràn bộ nhớ."
        ],
        answer: 0,
        walkthrough: {
          keyword: "chuyển từ 200 luồng cố định tái sử dụng sang newVirtualThreadPerTaskExecutor() 15.000 request/giây ... ThreadLocal<SimpleDateFormat> và ThreadLocal<byte[]> 128KB",
          whyCorrect: "Chào bạn, câu này chạm đúng cạm bẫy chuyển giao thế hệ từ Java 8/11 sang Java 21 mà chính tài liệu JEP 444 của Oracle đặc biệt cảnh báo! Thời Platform Thread Pool (200 luồng Tomcat sống dai từ lúc bật server tới lúc tắt), nhét `SimpleDateFormat` hay buffer `128KB` vào `ThreadLocal` rất hiệu quả vì cả đời server chỉ tạo đúng `200 × 128KB = 25MB`, rồi hàng triệu request cứ mượn đi mượn lại trên 200 luồng đó. Nhưng triết lý của **Virtual Threads** là **mỗi tác vụ tạo 1 Virtual Thread mới tinh, chạy xong vứt bỏ luôn, tuyệt đối không pool Virtual Threads**! Khi đó `ThreadLocal` mất hoàn toàn tác dụng tái sử dụng mà biến thành máy xả rác khổng lồ: `15.000 req/s × 128KB ≈ 1,92 GB/s` cấp phát liên tục trên Heap! Giải pháp chuẩn hiện đại là dùng các class **Thread-Safe Immutable** dùng chung duy nhất 1 bản như `java.time.format.DateTimeFormatter`, và nếu chỉ cần truyền ngữ cảnh định danh (`traceId`, `callerCif`) theo cây lời gọi thì dùng đối tượng bất biến siêu nhẹ hoặc `ScopedValue`.",
          whyWrong: [
            "",
            "`ThreadLocal` vẫn tồn tại đầy đủ và hoạt động đúng ngữ nghĩa trên Java 21 để đảm bảo tính tương thích ngược cho Spring Security / MDC, chỉ là không còn phù hợp để cache đối tượng nặng nữa.",
            "`SimpleDateFormat` không hề gọi mạng NTP, còn bọc thêm `synchronized` không những không giảm cấp phát RAM cho từng luồng mới mà còn có nguy cơ gây nghẽn đồng bộ.",
            "`newVirtualThreadPerTaskExecutor()` không dùng hàng đợi giới hạn 16 luồng mà tạo trực tiếp một Virtual Thread mới cho mỗi tác vụ được gửi vào."
          ],
          tip: "Lên Java 21 Virtual Threads, nhớ 2 điều cần dọn dẹp ngay khi review code cũ: **1. Thay `synchronized` quanh I/O bằng `ReentrantLock`**, và **2. Dẹp bỏ `ThreadLocal` dùng làm chỗ cache Object nặng (`SimpleDateFormat`, `byte[]`, `Marshaller`)**!"
        }
      },
      {
        id: "R1-15",
        domain: "Java Core & Tiền tệ",
        lessonId: "J5",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Trong dịch vụ Bảng phí & Tỷ giá Ngoại hối (FX Treasury), bạn phát hiện hai lỗi tiềm ẩn trong cấu trúc dữ liệu bộ nhớ: (1) Bộ đệm tỷ giá viết `if (!fxMap.containsKey(pair)) { fxMap.put(pair, loadRate(pair)); }` trên `ConcurrentHashMap<String, FxRate> fxMap`, dẫn đến khi bộ đệm vừa hết hạn có hàng chục luồng cùng gọi trùng API Reuters tính phí đắt đỏ và ghi đè lộn xộn tỷ giá cũ lên tỷ giá mới; (2) Một bảng bậc phí `Map<BigDecimal, BigDecimal> feeByThreshold = new HashMap<>()` nạp khóa `new BigDecimal('1000000')`, nhưng khi tra cứu bằng số tiền `new BigDecimal('1000000.00')` từ JSON gửi lên thì `feeByThreshold.get(amount)` trả về `null`! Phân tích và cách sửa nào chính xác cho cả hai lỗi?",
        options: [
          "Đổi `ConcurrentHashMap` sang `Hashtable` để tự động gộp hai lệnh `containsKey` và `put` thành một giao dịch nguyên tử; và đổi khóa của `HashMap` sang `Double` để không còn phụ thuộc vào chữ số thập phân.",
          "Tổ hợp kiểm tra-rồi-hành-động (`containsKey` + `put`) gồm 2 lời gọi tách rời trên `ConcurrentHashMap` KHÔNG có tính nguyên tử giữa hai bước nên bị Race Condition — cần thay bằng thao tác nguyên tử trên bucket như `fxMap.computeIfAbsent(pair, k -> ...)` / `compute(...)`; đồng thời `HashMap` tra cứu dựa trên `hashCode()` và `equals()` mà trong `BigDecimal` thì `'1000000'` (`scale=0`) có `hashCode/equals` KHÁC `'1000000.00'` (`scale=2`), nên phải chuẩn hóa khóa bằng `.stripTrailingZeros()` trước khi đưa vào/tra cứu hoặc dùng `TreeMap<BigDecimal, BigDecimal>` (so khớp bằng `compareTo`).",
          "Chỉ cần thêm từ khóa `volatile` trước khai báo `ConcurrentHashMap` là gộp được hai hàm thành nguyên tử; còn lỗi `HashMap<BigDecimal, ...>` là do `BigDecimal` không cài đặt hàm `hashCode()` trong JDK.",
          "Dùng `WeakHashMap` thay cho cả hai cấu trúc dữ liệu trên để Garbage Collector tự động đồng bộ khóa theo giá trị tiền tệ khi có nhiều luồng truy cập."
        ],
        answer: 1,
        walkthrough: {
          keyword: "if (!fxMap.containsKey(pair)) { fxMap.put(...) } trên ConcurrentHashMap ... HashMap<BigDecimal, BigDecimal> nạp '1000000' nhưng get('1000000.00') trả về null",
          whyCorrect: "Chào em, đây là câu hỏi kép kiểm tra độ hiểu sâu tận ruột `java.util.concurrent` và hợp đồng `equals/hashCode`! Ở ý (1): rất nhiều dev nghĩ 'dùng `ConcurrentHashMap` là an toàn đa luồng tuyệt đối rồi'. Đúng là từng hàm đơn lẻ `containsKey()` hay `put()` không làm hỏng cấu trúc cây nội bộ, nhưng giữa khoảnh khắc hàm `containsKey()` trả về `false` tới lúc gọi `put()`, 20 luồng khác cũng vừa đi qua cửa `containsKey() == false`! Muốn nguyên tử phải gom vào phương thức tính toán đơn lẻ khóa mức node/bucket của `ConcurrentHashMap` như `computeIfAbsent` hoặc `compute` (lưu ý không lồng đệ quy cùng bảng và giữ hàm nạp ngắn gọn có timeout). Ở ý (2): `HashMap` băm khóa bằng `key.hashCode()` rồi so khớp bằng `key.equals()`. Với `BigDecimal`, `new BigDecimal('1000000').hashCode()` bằng `31000000` trong khi `new BigDecimal('1000000.00').hashCode()` khác hẳn vì tính cả `scale=2`! Do đó muốn dùng `BigDecimal` làm khóa Map, hoặc chuẩn hóa `key.stripTrailingZeros()` ở mọi điểm đọc/ghi, hoặc dùng `TreeMap` vốn định vị khóa dựa trên `Comparable.compareTo()` (`compareTo == 0` bất chấp khác `scale`)!",
          whyWrong: [
            "`Hashtable` cũng chỉ khóa `synchronized` trên từng lời gọi hàm riêng lẻ — viết tách rời `if (!table.containsKey(k)) table.put(k, v)` trên `Hashtable` VẪN bị Race Condition y hệt! Còn dùng `Double` làm khóa tiền tệ bị lỗi sai số nhị phân.",
            "",
            "`volatile` trên biến tham chiếu Map không biến hai lời gọi hàm liên tiếp thành giao dịch nguyên tử; và `BigDecimal` có cài đặt đầy đủ `hashCode()` khớp chặt với `equals()` theo đúng đặc tả JDK.",
            "`WeakHashMap` không an toàn đa luồng (sẽ làm hỏng cấu trúc hoặc vòng lặp vô tận khi ghi đồng thời) và sẽ bị GC xóa mất bảng bậc phí bất cứ lúc nào khóa không còn tham chiếu mạnh."
          ],
          tip: "Hai bẫy Collections cực hay ra đề thi Ngân hàng: **1. `ConcurrentHashMap` + `if (!containsKey) put` = VẪN dính Race Condition (phải dùng `computeIfAbsent`/`compute`)**; **2. Tuyệt đối cẩn thận khi lấy `BigDecimal` chưa `stripTrailingZeros()` làm key của `HashMap`/`HashSet`**!"
        }
      },
      {
        id: "R1-16",
        domain: "Java Core & Tiền tệ",
        lessonId: "J5",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Bộ lọc Chống Rửa Tiền (AML Sanction Screening) đặt ngay trên luồng thanh toán cần đối chiếu tên và số giấy tờ của người nhận với danh sách đen gồm 120.000 cá nhân/tổ chức bị cấm vận trên mỗi giao dịch (tải đọc 5.000 lần/giây, yêu cầu độ trễ < 1ms). Danh sách này chỉ cập nhật định kỳ 15 phút một lần từ nguồn dữ liệu Ngân hàng Nhà nước. Trước đó, một lập trình viên thử dùng `CopyOnWriteArrayList` và gọi `.add(item)` trong vòng lặp 120.000 lần mỗi đợt cập nhật khiến CPU vọt lên 100% và tràn bộ nhớ tạm! Giải pháp thiết kế cấu trúc dữ liệu đa luồng nào tối ưu nhất cho bài toán Đọc cực lớn – Cập nhật theo đợt (Read-Heavy, Periodic Snapshot Refresh) này?",
        options: [
          "Dùng `ArrayList` thường không có bất kỳ cơ chế đồng bộ nào để đạt tốc độ đọc nhanh nhất, vì xác suất luồng cập nhật 15 phút/lần đụng trúng luồng đọc là rất nhỏ.",
          "Chuyển sang `Collections.synchronizedSet(new HashSet<>())` và dùng khóa độc quyền chặn toàn bộ 5.000 giao dịch/giây đứng chờ mỗi khi luồng nền nạp lại 120.000 dòng danh sách đen.",
          "Dựng mới hoàn toàn một cấu trúc tra cứu bất biến (`Map.copyOf(...)` / `Set.copyOf(...)` lập chỉ mục theo mã giấy tờ và khóa chuẩn hóa) ở luồng nền hoàn toàn tách biệt, sau đó hoán đổi nguyên tử con trỏ chỉ bằng một lệnh `AtomicReference<SanctionSnapshot>.set(newSnapshot)` (hoặc biến `volatile`): luồng thanh toán đọc `snapshotRef.get()` hoàn toàn không khóa (zero-lock, `O(1)`), còn luồng cập nhật chỉ cấp phát đúng 1 bản chụp mỗi 15 phút.",
          "Tiếp tục dùng `CopyOnWriteArrayList` nhưng chèn `Thread.sleep(10)` sau mỗi lệnh `.add(item)` để rải việc sao chép mảng ra suốt 20 phút."
        ],
        answer: 2,
        walkthrough: {
          keyword: "120.000 mục danh sách đen ... tải đọc 5.000 lần/giây (< 1ms), cập nhật định kỳ 15 phút/lần ... CopyOnWriteArrayList gọi .add(item) 120.000 lần làm CPU 100%",
          whyCorrect: "Chào bạn, hãy nhìn thấu độ phức tạp toán học để thấy vì sao `CopyOnWriteArrayList` nổ tung ở đây: mỗi một lệnh `.add()` trên `CopyOnWriteArrayList` đều cấp phát và `Arrays.copyOf` toàn bộ mảng cũ sang mảng mới! Gọi `.add()` 120.000 lần trong vòng lặp đồng nghĩa với `1 + 2 + ... + 120.000 ≈ 7,2 tỷ` phép chép phần tử mỗi đợt làm mới, lại còn tra cứu tuyến tính `O(N)` chậm chạp! Trong khi đó, mẫu thiết kế **Immutable Snapshot + AtomicReference Swap (Copy-On-Publish)** là tuyệt kỹ của các hệ thống tài chính độ trễ thấp: luồng nền âm thầm đọc file mới vào một `HashMap`/`HashSet` cục bộ, bọc bất biến bằng `Set.copyOf` / `Map.copyOf` vào đối tượng `SanctionSnapshot`, rồi phất cờ tráo tham chiếu trong 1 nano-giây bằng `atomicRef.set(newSnapshot)`! Hàng nghìn luồng thanh toán đang chạy dở với snapshot cũ vẫn hoàn tất an toàn tuyệt đối (nhờ tính bất biến), các luồng mới lập tức thấy snapshot mới với tốc độ băm `O(1)` tốn chưa tới vài micro-giây mà **không hề tồn tại bất kỳ một chiếc khóa (lock) nào**!",
          whyWrong: [
            "Đọc/ghi đồng thời lên `ArrayList` hoặc `HashMap` không đồng bộ vi phạm Java Memory Model (Data Race): luồng đọc có thể nhìn thấy trạng thái mảng đang dở dang, ném `ArrayIndexOutOfBoundsException`, đọc phần tử `null` lọt lưới rửa tiền hoặc treo vòng lặp.",
            "`synchronizedSet` bắt mọi luồng thanh toán phải tranh nhau 1 chiếc khóa monitor duy nhất (5.000 lần/giây) và đóng băng toàn bộ luồng chuyển tiền trong lúc nạp lại 120.000 bản ghi.",
            "",
            "Ngủ 10ms × 120.000 lần mất đúng 20 phút (lâu hơn cả chu kỳ cập nhật 15 phút!), vẫn tạo ra hàng chục GB mảng rác trên Heap và tra cứu trên List 120.000 phần tử mất `O(N)` không đạt yêu cầu `< 1ms`."
          ],
          tip: "Gặp bài toán **Cache cấu hình / Bảng phí / Danh sách AML đọc hàng nghìn lần/giây, cập nhật định kỳ theo lô** -> Dùng ngay mẫu **Immutable Map/Set Snapshot + `AtomicReference` (hoặc `volatile` reference swap)**, nhanh gấp vạn lần khóa đồng bộ!"
        }
      },
      {
        id: "R1-17",
        domain: "Java Core & Tiền tệ",
        lessonId: "J6",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Trong module Quản lý Hợp đồng Tín dụng thiết kế theo Domain-Driven Design (DDD), Aggregate Root `LoanContract` chứa danh sách kỳ trả nợ `private List<Installment> installments` cùng quy tắc bất biến (Invariant): 'Tổng dư nợ gốc của các kỳ chưa thanh toán phải luôn bằng đúng `outstandingPrincipal` của hợp đồng, và tiền khách trả phải gạch nợ lãi quá hạn trước rồi mới trừ vào gốc'. Hiện tại `LoanContract` có hàm `public List<Installment> getInstallments() { return this.installments; }` và class `Installment` mở sẵn `public void setPaidPrincipal(BigDecimal amt)`. Rủi ro thiết kế nghiêm trọng nào đang tồn tại và cần sửa ra sao?",
        options: [
          "Việc trả thẳng tham chiếu `ArrayList` nội bộ kèm setter công khai trên thực thể con phá vỡ ranh giới đóng gói của Aggregate Root: bất kỳ Service bên ngoài nào cũng có thể gọi `contract.getInstallments().get(2).setPaidPrincipal(...)` hoặc `.clear()` đi vòng qua `LoanContract`, làm lệch `outstandingPrincipal` và phá vỡ thứ tự ưu tiên thu nợ! Cần xóa public setter trên thực thể con, trả về bản sao bất biến/chỉ đọc (`List.copyOf(installments)` hoặc View DTO) ở hàm đọc, và buộc mọi thay đổi phải đi qua hành vi nghiệp vụ trên Aggregate Root như `contract.applyRepayment(Money amount, LocalDate paidDate)`.",
          "Chỉ cần thêm từ khóa `final` trước biến `private final List<Installment> installments` là không một class bên ngoài nào có thể thêm xóa phần tử hay sửa dữ liệu bên trong `Installment` nữa.",
          "Tách `Installment` thành một Aggregate Root độc lập hoàn toàn và cho phép Controller sửa trực tiếp từng dòng `Installment` mà không cần thông qua `LoanContract`, cuối tháng mới chạy script cộng lại `outstandingPrincipal`.",
          "Chuyển danh sách `List<Installment>` sang biến `public static` để mọi hàm tiện ích đều truy cập thống nhất vào cùng một vùng nhớ."
        ],
        answer: 0,
        walkthrough: {
          keyword: "Aggregate Root LoanContract ... trả thẳng return this.installments kèm public setPaidPrincipal ... phá vỡ Invariant tổng dư nợ gốc và thứ tự gạch nợ",
          whyCorrect: "Chào em, trong DDD cho Core Banking, **Aggregate Root** chính là 'người gác cổng tính toàn vẹn giao dịch' (Transactional Consistency Guardian)! Mọi quy tắc bất biến liên kết giữa cha (`LoanContract.outstandingPrincipal`) và các con (`List<Installment>`) chỉ được bảo vệ nếu bên ngoài không thể thò tay sửa lén phần tử con. Việc lộ `return this.installments` (thiếu **Defensive Copy / Unmodifiable View**) kết hợp public setter trên `Installment` biến Aggregate thành một túi dữ liệu rỗng tuếch (Anemic Model) ai đi ngang cũng chọc ngoáy sửa gốc trước lãi hay xóa kỳ nợ mà `outstandingPrincipal` không hề hay biết! Áp dụng nguyên lý **Tell, Don't Ask**: khóa chặt trạng thái thay đổi bên trong package/Aggregate, hàm getter chỉ trả bản sao bất biến `Collections.unmodifiableList(...)` / `List.copyOf(...)`, và cung cấp phương thức giàu ngữ nghĩa `contract.applyRepayment(amount, date)` tự thực thi thứ tự gạch phí -> lãi quá hạn -> lãi trong hạn -> gốc rồi cập nhật `outstandingPrincipal` nhất quán trong một khối nguyên tử!",
          whyWrong: [
            "",
            "Từ khóa `final` trên biến `private final List<Installment> installments` chỉ ngăn việc gán biến đó sang một đối tượng `List` khác (`this.installments = otherList`), chứ bên ngoài nhận được tham chiếu vẫn gọi `.clear()`, `.remove(0)` hay `.get(0).setPaidPrincipal(...)` thoải mái!",
            "Nếu quy tắc nghiệp vụ yêu cầu `outstandingPrincipal` và thứ tự gạch nợ phải đúng ngay lập tức trong cùng một giao dịch mà lại xé lẻ `Installment` cho sửa tự do không qua `LoanContract`, dữ liệu dư nợ sẽ sai lệch suốt cả tháng.",
            "Biến `public static` chia sẻ chung một danh sách kỳ nợ cho toàn bộ hàng triệu khách hàng của ngân hàng là thảm họa lộ và ghi đè dữ liệu chéo!"
          ],
          tip: "Khi thiết kế **Aggregate Root / Immutable Object** trong Java Ngân hàng: Nhớ kiểm tra **Defensive Copy (`List.copyOf`) ở cả Constructor lẫn Getter**, và tuyệt đối không mở public setter trên Child Entity bên trong Aggregate!"
        }
      },
      {
        id: "R1-18",
        domain: "Spring IoC & Transaction",
        lessonId: "S1",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Sự cố nghiêm trọng cấp độ Sev-1 vừa xảy ra trên cổng Nộp Thuế Điện Tử: Khách hàng A bấm nộp thuế TNCN 5.000.000 VNĐ, nhưng biên lai trả về và bút toán gửi sang Kho bạc lại ghi mã số thuế của Khách hàng B với số tiền 180.000.000 VNĐ vừa bấm cùng giây đó! Kiểm tra mã nguồn `TaxSubmissionService` (đánh dấu `@Service` mặc định của Spring) thấy lập trình viên khai báo hai biến trường của class: `private String currentTaxCode;` và `private Money payableAmount;` được gán giá trị ở đầu hàm `submitTax(TaxReq req)` rồi đọc lại ở 3 hàm hỗ trợ phía dưới để sinh biên lai. Nguyên nhân và cách sửa triệt để là gì?",
        options: [
          "Do Spring Boot cấu hình nhầm bộ đệm HTTP Response tại tầng Tomcat; cần thêm header `Cache-Control: no-store` vào Controller và giữ nguyên hai biến trường trong `TaxSubmissionService`.",
          "Do thiếu từ khóa `volatile` trên hai biến `currentTaxCode` và `payableAmount`; thêm `volatile` vào sẽ giúp mỗi luồng HTTP nhìn thấy riêng giá trị của khách hàng thuộc luồng đó.",
          "Mặc định mọi `@Service`, `@Component`, `@RestController` trong Spring IoC Container đều có vòng đời **Singleton** (chỉ duy nhất 1 instance dùng chung cho hàng trăm luồng request chạy đồng thời); việc lưu trạng thái dữ liệu của từng request vào biến instance (stateful field) gây lỗi ghi đè chéo dữ liệu (Race Condition) giữa Khách hàng A và Khách hàng B! Phải giữ Singleton Bean hoàn toàn **Stateless** bằng cách xóa ngay các biến trường chứa dữ liệu giao dịch và truyền ngữ cảnh qua tham số hàm (ví dụ đóng gói trong một `record TaxExecutionContext` cục bộ trên Stack của từng luồng).",
          "Do Garbage Collector dọn nhầm vùng nhớ của Khách hàng A sang Khách hàng B; cần đổi kiểu `String currentTaxCode` sang `StringBuffer` để tự động tách vùng nhớ theo người dùng."
        ],
        answer: 2,
        walkthrough: {
          keyword: "TaxSubmissionService (@Service mặc định) khai báo biến trường private String currentTaxCode; private Money payableAmount ... Khách hàng A bị ghi nhầm mã số thuế và tiền của Khách hàng B",
          whyCorrect: "Chào bạn, đây là lỗi **Stateful Singleton Bean** gây rò rỉ dữ liệu chéo (Cross-Customer Data Leakage) đáng sợ bậc nhất trong ngành ngân hàng! Trong Spring IoC, phạm vi mặc định của `@Service` là **Singleton**: toàn bộ ứng dụng từ lúc bật tới lúc tắt chỉ tạo đúng **1 đối tượng `TaxSubmissionService` duy nhất trên Heap**. Khi Luồng 1 (Khách A - 5 triệu) vừa chạy dòng `this.currentTaxCode = 'MST_A';` và đang chờ kiểm tra mã cơ quan thuế mất 20ms, Luồng 2 (Khách B - 180 triệu) nhảy vào cùng đối tượng đó ghi đè `this.currentTaxCode = 'MST_B'; this.payableAmount = 180M;`! Tới khi Luồng 1 tỉnh dậy gọi hàm sinh biên lai bên dưới đọc `this.currentTaxCode`, nó bốc trọn dữ liệu của Khách B! Biến cục bộ và tham số phương thức nằm riêng biệt trên **Thread Stack** của từng luồng nên an toàn tuyệt đối 100% — vì vậy mọi Spring Singleton Service bắt buộc phải **Stateless** (chỉ giữ các trường `private final` là dependency không đổi)!",
          whyWrong: [
            "Lỗi xảy ra ngay từ lúc dựng bút toán gửi sang Kho bạc bên trong Backend chứ không phải do trình duyệt hay proxy cache nhầm HTTP response.",
            "Ngược lại hoàn toàn! `volatile` bắt mọi luồng phải đọc/ghi trực tiếp vào CÙNG một ô nhớ chung trên Heap nhanh hơn nữa, nên Luồng B ghi đè xong là Luồng A lập tức đọc trúng dữ liệu của Luồng B ngay tức khắc!",
            "",
            "`StringBuffer` chỉ đồng bộ hóa việc nối chuỗi trên cùng một biến chung chứ không tách dữ liệu theo từng luồng khách hàng — thậm chí sẽ nối chuỗi mã số thuế của A và B dính chùm vào nhau!"
          ],
          tip: "Khi đi thi Review Code ở Ngân hàng, liếc ngay lên đầu các class `@RestController` / `@Service`: nếu thấy bất kỳ biến trường (field) nào **KHÔNG PHẢI `static final` hằng số hoặc `final` dependency** (mà là biến lưu tạm `cif`, `amount`, `sdf`, `list`...) -> Khoanh đỏ ngay lỗi chí mạng **Stateful Singleton Race Condition**!"
        }
      },
      {
        id: "R1-19",
        domain: "Spring IoC & Transaction",
        lessonId: "S2",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Bạn đang thiết kế cơ chế chống trừ tiền kép (Idempotency) dựa trên header `Idempotency-Key` cho API `POST /api/v1/transfers`. Kịch bản khó nhất ngoài đời thực là khi khách hàng đi vào thang máy mạng 4G chập chờn: ứng dụng Mobile vừa gửi gói tin lần 1 (Server đang xử lý dở ở mili-giây thứ 50, chưa kịp trả kết quả) thì SDK mạng tự động bắn lại gói tin lần 2 với cùng `Idempotency-Key` ở mili-giây thứ 80! Nếu code chỉ kiểm tra `SELECT` xem khóa đã tồn tại trong bảng `idempotency_records` ở đầu hàm rồi tới cuối hàm mới `INSERT` kết quả thì CẢ HAI luồng đều thấy `SELECT` rỗng ở đầu hàm và cùng trừ tiền 2 lần! Thiết kế nào chặn đứng hoàn toàn lỗ hổng đồng thời này?",
        options: [
          "Cho phép cả hai request cứ trừ tiền bình thường trên Database, sau đó viết một cronjob chạy vào 12 giờ trưa hôm sau quét tìm các giao dịch có số tiền giống nhau trong vòng 5 giây để tự động hoàn lại một giao dịch.",
          "Chỉ chặn bấm đúp nút gửi ở giao diện Mobile App bằng JavaScript/React và không cần kiểm tra `Idempotency-Key` ở phía Backend để giảm tải cho Database.",
          "Lưu tạm `Idempotency-Key` vào một `HashSet<String>` cục bộ trên RAM của từng Pod Kubernetes rồi xóa đi ngay sau 1 giây.",
          "Thực hiện chèn bản ghi khóa lũy đẳng ngay bước đầu tiên với ràng buộc `UNIQUE (client_id, idempotency_key)` trên Database (ví dụ `INSERT ... ON CONFLICT DO NOTHING`), lưu kèm mã băm nội dung `request_hash` và trạng thái `IN_PROGRESS`: chỉ duy nhất luồng chèn thành công (`rowsAffected == 1`) mới được đi tiếp xử lý giao dịch rồi cập nhật bản ghi sang `COMPLETED` kèm snapshot phản hồi; luồng trùng đến sau nếu khác `request_hash` trả `422 Unprocessable Entity`, nếu đang `IN_PROGRESS` trả `409 Conflict` (báo client đang xử lý, không thực thi lại), và nếu đã `COMPLETED` thì trả nguyên vẹn kết quả đã lưu."
        ],
        answer: 3,
        walkthrough: {
          keyword: "gói tin lần 1 đang xử lý dở chưa trả kết quả thì gói tin lần 2 cùng Idempotency-Key bay tới ... SELECT đầu hàm rồi cuối hàm mới INSERT bị lọt cả hai",
          whyCorrect: "Chào em, đây chính là bài kiểm tra phân biệt người mới đọc lý thuyết Idempotency trên blog với người đã từng vận hành cổng thanh toán thật! Kiểm tra `SELECT` ở đầu rồi cuối mới `INSERT` dính đúng lỗi **TOCTOU (Time-of-Check to Time-of-Use)** khi hai request song song bay vào cách nhau vài chục mili-giây. Để khóa kín kẽ hở này, bạn phải chiếm quyền thực thi ngay từ cửa bằng ràng buộc `UNIQUE` nguyên tử của Database (`INSERT INTO idempotency_records(scope, idem_key, request_hash, status) VALUES (..., 'IN_PROGRESS') ON CONFLICT DO NOTHING`): PostgreSQL đảm bảo 100% ở mức vật lý chỉ có **đúng 1 luồng** nhận được `1 row inserted` để đi vào luồng trừ tiền! Đặc biệt, lưu kèm `request_hash` (SHA-256 của người nhận + số tiền + tiền tệ) theo đúng chuẩn IETF/Stripe giúp chặn luôn lỗi client vô tình dùng lại cùng một `Idempotency-Key` cho một giao dịch khác hẳn số tiền!",
          whyWrong: [
            "Trừ đúp làm âm hoặc hụt số dư thật của khách hàng suốt cả ngày, còn cronjob quét theo 'cùng số tiền trong 5 giây' sẽ hoàn tiền nhầm cho khách hàng thực sự muốn chuyển 2 khoản bằng nhau liên tiếp!",
            "Khóa nút bấm ở UI là cần thiết cho UX nhưng không bao giờ thay thế được Backend Idempotency: kẻ tấn công gọi thẳng API, mạng retry ở tầng TCP/HTTP proxy hoặc người dùng mở 2 thiết bị sẽ xuyên thủng hoàn toàn lớp chặn Frontend.",
            "Trong cụm K8s chạy 10 Pod phía sau Load Balancer, request lần 1 rơi vào Pod A còn request retry lần 2 rơi vào Pod B nên `HashSet` cục bộ trên RAM từng Pod hoàn toàn vô dụng, và xóa sau 1 giây cũng không chống được retry trễ.",
            ""
          ],
          tip: "Thiết kế **Idempotency-Key chuẩn Production** nhớ 3 mảnh ghép: **1. Chiếm khóa trước bằng `INSERT ... UNIQUE` trạng thái `IN_PROGRESS`** -> **2. Đối chiếu `request_hash` chống dùng nhầm key cho lệnh khác** -> **3. Lưu snapshot HTTP Status + Response khi `COMPLETED` để phát lại**!"
        }
      },
      {
        id: "R1-20",
        domain: "Spring IoC & Transaction",
        lessonId: "S3",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Câu hỏi 'sát thủ' vòng kỹ thuật Spring `@Transactional`! Dịch vụ `BillPaymentService.payBill()` được đánh dấu `@Transactional` (mặc định `Propagation.REQUIRED`). Bên trong hàm này, sau khi chuẩn bị chứng từ thanh toán hóa đơn điện, hệ thống gọi sang một Bean khác là `LoyaltyPointService.tryAddBonusPoints()` cũng đánh dấu `@Transactional` (`Propagation.REQUIRED`), và bọc lời gọi này cẩn thận trong khối `try { loyaltyPointService.tryAddBonusPoints(cif, billAmt); } catch (BonusCampaignQuotaExceededException ex) { log.warn('Hết ngân sách điểm thưởng, vẫn tiếp tục thanh toán hóa đơn điện bình thường'); }`. Hàm `payBill()` chạy hết đến dòng cuối cùng không ném bất kỳ lỗi nào, nhưng ngay khoảnh khắc thoát khỏi hàm, Spring ném ra `UnexpectedRollbackException: Transaction silently rolled back because it has been marked as rollback-only` làm hỏng luôn cả giao dịch đóng tiền điện! Giải thích nào đúng cơ chế ngầm của Spring?",
        options: [
          "Do khối `try/catch` trong Java không bắt được các ngoại lệ kế thừa từ `RuntimeException` khi chạy bên trong Spring Boot.",
          "Với `Propagation.REQUIRED` mặc định, `tryAddBonusPoints()` gia nhập vào CÙNG một giao dịch vật lý đang mở của `payBill()`. Khi `BonusCampaignQuotaExceededException` (một `RuntimeException`) văng ra khỏi ranh giới AOP Proxy của `LoyaltyPointService` trước khi tới khối `catch` bên ngoài, Interceptor của Spring đã lập tức đánh dấu cờ `rollbackOnly = true` lên giao dịch vật lý chung đó; tới cuối `payBill()` dù không có lỗi nhưng Spring định `COMMIT` một giao dịch đã bị đóng dấu `rollbackOnly` nên nổ `UnexpectedRollbackException`! Để nhánh tích điểm phụ thất bại độc lập không làm hỏng giao dịch thanh toán chính, cần cấu hình `@Transactional(propagation = Propagation.REQUIRES_NEW)` (hoặc tách bất đồng bộ sau commit) cho `tryAddBonusPoints()`.",
          "Do `log.warn(...)` bên trong khối `catch` tự động gửi tín hiệu hủy giao dịch xuống trình điều khiển JDBC của PostgreSQL.",
          "Do tên hàm bắt đầu bằng tiền tố `try...` là từ khóa cấm của Hibernate Transaction Manager khiến mọi câu lệnh SQL đều tự hủy."
        ],
        answer: 1,
        walkthrough: {
          keyword: "hai Bean cùng Propagation.REQUIRED ... bọc lời gọi Bean trong bằng try/catch ở Bean ngoài ... văng UnexpectedRollbackException: marked as rollback-only lúc thoát hàm",
          whyCorrect: "Chào bạn, rất nhiều lập trình viên 4–5 năm kinh nghiệm vẫn ngơ ngác trước lỗi `UnexpectedRollbackException` này trên Production: 'Rõ ràng em đã `try/catch` êm ru rồi cơ mà, sao lúc `return` lại nổ?!'. Hãy lần theo đường đi của luồng thực thi qua **2 lớp AOP Proxy**: `Proxy(BillPayment)` mở Giao dịch Vật lý `Tx#1`. Khi gọi sang `Proxy(LoyaltyPoint)` có `Propagation.REQUIRED`, nó không mở giao dịch mới mà dùng chung luôn `Tx#1`. Khi bên trong `tryAddBonusPoints()` ném `RuntimeException`, quả bóng ngoại lệ phải bay xuyên qua **vỏ `Proxy(LoyaltyPoint)` trước** rồi mới bay ra tới khối `catch` nằm bên trong `BillPaymentService`! Ngay tại vỏ `Proxy(LoyaltyPoint)`, `TransactionInterceptor` bắt gặp `RuntimeException` liền gọi `txStatus.setRollbackOnly()` đóng dấu tử hình lên `Tx#1`, rồi ném tiếp ngoại lệ ra ngoài. Khối `catch` của `BillPaymentService` nuốt mất ngoại lệ và chạy tiếp tưởng như êm đẹp, tới lúc chạm vỏ `Proxy(BillPayment)` gọi `txManager.commit(Tx#1)`, Transaction Manager thấy lá cờ `rollbackOnly == true` bèn rollback sạch toàn bộ và ném `UnexpectedRollbackException` cảnh báo! Muốn nhánh phụ độc lập hoàn toàn thì nhánh phụ phải chạy trên giao dịch vật lý riêng bằng `REQUIRES_NEW` (hoặc tốt hơn nữa với tích điểm thưởng là bắn sự kiện bất đồng bộ sau khi đóng tiền điện thành công).",
          whyWrong: [
            "Khối `try/catch` của Java bắt `RuntimeException` hoàn toàn bình thường; vấn đề nằm ở chỗ AOP Proxy của Bean bên trong đã kịp đánh dấu cờ `rollbackOnly` trước khi ngoại lệ bay ra tới khối `catch` bên ngoài.",
            "",
            "Ghi log bằng SLF4J/Logback hoàn toàn không có bất kỳ tương tác nào với `PlatformTransactionManager` hay kết nối JDBC.",
            "Spring và Hibernate không hề có quy ước cấm đặt tên hàm bắt đầu bằng `try`."
          ],
          tip: "Gặp tình huống **`BeanA (@Transactional REQUIRED)` bọc `try/catch` quanh lời gọi `BeanB (@Transactional REQUIRED)` ném RuntimeException** -> Chắc chắn 100% nổ **`UnexpectedRollbackException (rollback-only)`** lúc kết thúc `BeanA`! Muốn cô lập lỗi nhánh phụ phải dùng **`REQUIRES_NEW`** (lưu ý tốn 2 kết nối HikariCP cùng lúc) hoặc tách Event bất đồng bộ."
        }
      },
      {
        id: "R1-21",
        domain: "Spring IoC & Transaction",
        lessonId: "S3",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Trong module Tất toán Sổ tiết kiệm, bạn cần giải quyết đồng thời 3 yêu cầu thực tế về quản trị giao dịch của Spring: (1) Hàm `closeSavingsAccount()` có trừ gốc sổ tiết kiệm xong ném ra Checked Exception `InvalidDigitalSignatureException extends Exception`, hiện tại chỉ gắn `@Transactional` trống trơn khiến lệnh trừ sổ tiết kiệm VẪN BỊ COMMIT xuống DB dù chữ ký số không hợp lệ! (2) Dù giao dịch tất toán chính bị rollback vì sai chữ ký, bản ghi cảnh báo an ninh vào bảng `security_violation_logs` bắt buộc phải được lưu thành công không mất dấu vết; (3) Tin nhắn SMS thông báo 'Tất toán thành công' chỉ được phép phát đi SAU KHI giao dịch DB chính đã thực sự `COMMIT` an toàn xuống đĩa cứng PostgreSQL. Tổ hợp kỹ thuật nào đáp ứng chính xác cả 3 yêu cầu?",
        options: [
          "Khai báo `@Transactional(rollbackFor = Exception.class)` trên hàm chính để tự động rollback cho cả Checked Exception; tách hàm ghi bảng `security_violation_logs` sang một Bean riêng gắn `@Transactional(propagation = Propagation.REQUIRES_NEW)` để commit trên kết nối độc lập bất chấp giao dịch ngoài rollback; và phát Domain Event xử lý bởi `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` để chỉ gửi SMS khi DB đã commit thành công.",
          "Giữ nguyên `@Transactional` mặc định nhưng bọc `InvalidDigitalSignatureException` vào khối `finally`, ghi `security_violation_logs` bằng `Propagation.MANDATORY` và gọi thẳng API gửi SMS ở dòng cuối cùng bên trong hàm `closeSavingsAccount()`.",
          "Đặt `@Transactional(noRollbackFor = Exception.class)` lên hàm chính, dùng `Propagation.SUPPORTS` cho hàm ghi log vi phạm và dùng `@EventListener` thường để gửi SMS ngay khi sự kiện vừa được `publishEvent()`.",
          "Tắt chế độ `autoCommit = false` của HikariCP để từng câu lệnh `INSERT/UPDATE` tự động commit riêng lẻ ngay khi chạy xong mà không cần `@Transactional`."
        ],
        answer: 0,
        walkthrough: {
          keyword: "ném Checked Exception InvalidDigitalSignatureException vẫn bị COMMIT ... lưu security_violation_logs bất chấp rollback ... chỉ gửi SMS SAU KHI giao dịch DB thực sự COMMIT",
          whyCorrect: "Chào em, câu hỏi tổng hợp này kiểm tra trọn vẹn 3 mảnh ghép cốt lõi mà mọi Senior Backend Ngân hàng đều phải viết đúng ngay từ dòng đầu tiên! **Mảnh ghép 1:** Theo thiết kế lịch sử kế thừa từ EJB, `@Transactional` mặc định của Spring **CHỈ tự động rollback cho `RuntimeException` và `Error`**, còn gặp Checked Exception (`extends Exception`) nó coi là kết quả nghiệp vụ dự tính trước và... **COMMIT thẳng tay**! Vì vậy trong code ngân hàng luôn bắt buộc ghi rõ `@Transactional(rollbackFor = Exception.class)` (hoặc `Throwable.class`). **Mảnh ghép 2:** Để giữ lại bằng chứng gian lận/sai OTP/sai chữ ký khi giao dịch chính rollback, Bean ghi `security_violation_logs` phải dùng `Propagation.REQUIRES_NEW` để tạm treo giao dịch ngoài, mượn kết nối mới commit ngay vết an ninh xuống đĩa rồi mới trả về cho giao dịch ngoài rollback. **Mảnh ghép 3:** Nếu gọi gửi SMS ngay dòng cuối bên trong `@Transactional` (hoặc dùng `@EventListener` đồng bộ thông thường), khách vừa nhận tin 'Tiền đã về tài khoản' trên điện thoại thì mili-giây sau câu lệnh `COMMIT` xuống PostgreSQL lại văng lỗi ràng buộc `DEFERRED` hoặc rớt mạng DB! Dùng `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` đảm bảo chắc chắn 100% chỉ phát tin khi PostgreSQL đã xác nhận commit thành công (hoặc kết hợp Transactional Outbox nếu cần đảm bảo không mất tin khi sập Pod ngay sau commit).",
          whyWrong: [
            "",
            "`Propagation.MANDATORY` bắt buộc tham gia vào giao dịch đang có nên khi giao dịch chính rollback thì bản ghi log an ninh cũng bay màu theo sạch sẽ; còn gọi SMS ngay trong hàm `@Transactional` vẫn gửi tin trước thời điểm DB thực sự commit.",
            "`noRollbackFor = Exception.class` làm tắt hoàn toàn cơ chế rollback cho mọi lỗi khiến dữ liệu hỏng nặng hơn, còn `@EventListener` thường chạy đồng bộ ngay lập tức trước khi giao dịch DB kịp commit.",
            "Bật tự động commit từng câu SQL đơn lẻ phá tan tính nguyên tử ACID — trừ tiền sổ tiết kiệm xong mà cộng sang tài khoản thanh toán bị lỗi là khách mất trắng tiền!"
          ],
          tip: "Bộ ba chuẩn mực trong mọi Service tài chính dùng Spring: **1. Luôn ghi `@Transactional(rollbackFor = Exception.class)`**; **2. Lưu vết thất bại bằng Bean riêng `REQUIRES_NEW`**; **3. Hành động hậu giao dịch dùng `AFTER_COMMIT` / Outbox**!"
        }
      },
      {
        id: "R1-22",
        domain: "JPA & Testing",
        lessonId: "S4",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Hai hiện tượng 'bí ẩn' với Hibernate/JPA vừa được đội Vận hành phát hiện trên Core Fee Service: (1) Trong hàm xem thử biểu phí `previewDiscount()` có gắn `@Transactional`, lập trình viên tải `CustomerTier tier = tierRepo.findById(id).orElseThrow()`, sau đó gọi tạm `tier.setFeeRate(BigDecimal.ZERO)` để truyền đối tượng này vào bộ công thức tính nháp rồi trả DTO về cho khách xem mà TUYỆT ĐỐI KHÔNG gọi `tierRepo.save(tier)` — thế nhưng ngay sau đó khách hàng đó được miễn phí 0% thật luôn trên Database! (2) Luồng chốt sổ phí cuối ca gọi `feeSettlementRepo.saveAll(tenThousandRows)` dù đã bật `spring.jpa.properties.hibernate.jdbc.batch_size=50`, nhưng Hibernate vẫn bắn lẻ tẻ đúng 10.000 câu lệnh `INSERT` qua mạng mất 25 giây vì khóa chính đang khai báo `@GeneratedValue(strategy = GenerationType.IDENTITY)`. Giải thích và cách sửa nào đúng chuẩn Hibernate Internals?",
        options: [
          "Do `tierRepo.findById()` trên PostgreSQL luôn tự động sao lưu mọi thay đổi ở tầng trình điều khiển mạng; chỉ cần xóa hàm `equals()` trên Entity `CustomerTier` và tăng `batch_size` lên `10000` giữ nguyên `IDENTITY` là chạy gộp được.",
          "Ở hiện tượng (1) là do lỗi của Jackson JSON Serializer tự gọi `tierRepo.save()` ngầm; ở hiện tượng (2) chỉ cần đổi `IDENTITY` sang `GenerationType.TABLE` khóa cứng một bảng đếm duy nhất cho toàn ngân hàng là nhanh gấp 100 lần.",
          "Do hàm `saveAll()` của Spring Data JPA thực chất chỉ là hàm rỗng không hỗ trợ JDBC Batching cho bất kỳ chiến lược sinh khóa nào; bắt buộc phải gỡ bỏ hoàn toàn Hibernate mới gộp lô được.",
          "Ở hiện tượng (1), thực thể `tier` đang ở trạng thái **Managed** trong Persistence Context (First-Level Cache), nên lúc kết thúc `@Transactional`, cơ chế **Dirty Checking** của Hibernate tự động đối chiếu bản gốc và phát lệnh `UPDATE` xuống DB dù không hề gọi `save()` — cần dùng `@Transactional(readOnly = true)` / DTO Projection và tính nháp trên biến cục bộ không sửa thực thể Managed; ở hiện tượng (2), `GenerationType.IDENTITY` buộc Hibernate phải chạy từng lệnh `INSERT` ngay lập tức để lấy ID tự tăng từ DB nên vô hiệu hóa hoàn toàn JDBC Batching — cần chuyển sang `GenerationType.SEQUENCE` (khớp `allocationSize = 50` và bật `order_inserts=true`) trên PostgreSQL!"
        ],
        answer: 3,
        walkthrough: {
          keyword: "sửa thuộc tính trên Entity vừa findById trong @Transactional không gọi save() nhưng DB vẫn tự UPDATE ... GenerationType.IDENTITY làm tắt hibernate.jdbc.batch_size=50",
          whyCorrect: "Chào bạn, nắm vững hai cơ chế ngầm này là dấu ấn rõ nét của một Senior làm chủ **Hibernate Internals**! **Thứ nhất — Automatic Dirty Checking:** Khi tải một `@Entity` trong phạm vi `@Transactional` (đọc-ghi), Hibernate cất một bản chụp trạng thái ban đầu (loaded state snapshot) vào Persistence Context. Tới pha `flush()` trước khi commit, Hibernate quét so sánh từng trường hiện tại của mọi thực thể Managed với bản chụp gốc: thấy `feeRate` đổi sang `0`, nó tự động sinh và bắn lệnh `UPDATE customer_tiers SET fee_rate = 0` xuống DB mà chẳng cần bạn gọi `.save()`! Với API chỉ đọc/tính thử, luôn dùng `@Transactional(readOnly = true)` (tắt snapshot Dirty Checking của Hibernate, giảm một nửa RAM First-Level Cache) hoặc lấy thẳng DTO/Record Projection và tuyệt đối không mutate thực thể Managed. **Thứ hai — Bẫy `IDENTITY` giết chết Batch Insert:** Để hoãn và gom 50 dòng vào một gói `PreparedStatement.addBatch()`, Hibernate cần biết trước khóa chính `id` ngay trên RAM (nhằm quản lý Persistence Context). Nhưng `IDENTITY` (`BIGSERIAL`) chỉ sinh ra `id` SAU KHI từng dòng đã thực thi trên DB, buộc Hibernate phải tắt sạch JDBC Batching! Đổi sang `GenerationType.SEQUENCE` kết hợp thuật toán `pooled-lo` (`allocationSize = 50`) giúp Hibernate lấy sẵn 50 ID chỉ trong 1 lần hỏi sequence rồi bắn vèo gói Batch 50 dòng `INSERT` xuống PostgreSQL nhanh gấp 10–15 lần!",
          whyWrong: [
            "JDBC Driver hoàn toàn không tự sinh lệnh `UPDATE` từ đối tượng Java trên Heap, và giữ nguyên `GenerationType.IDENTITY` thì dù đặt `batch_size = 10000` Hibernate vẫn tắt tính năng gom lô.",
            "Jackson không bao giờ gọi Repository, còn `GenerationType.TABLE` mô phỏng sequence bằng cách khóa dòng trên một bảng phụ (mỗi lần cấp ID phải mở giao dịch riêng `REQUIRES_NEW`) gây nghẽn cổ chai thảm khốc dưới tải cao!",
            "`saveAll()` hoàn toàn hỗ trợ JDBC Batch Insert cực nhanh khi đi cùng khóa `SEQUENCE` hoặc khóa tự sinh phía ứng dụng (như UUIDv7 / TSID kèm `Persistable`).",
            ""
          ],
          tip: "Nhớ kỹ 2 bí mật của Hibernate: **1. Đã là Managed Entity trong `@Transactional`, gọi `entity.setX()` = TỰ ĐỘNG `UPDATE` xuống DB không cần `.save()` (Dirty Checking)**; **2. Muốn chạy Hibernate Batch Insert trên Postgres/Oracle, dẹp `IDENTITY` đi và dùng `SEQUENCE`!**"
        }
      },
      {
        id: "R1-23",
        domain: "JPA & Testing",
        lessonId: "S5",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Một dịch vụ Cổng Tích Hợp Fintech viết trên **Spring WebFlux** (sử dụng Netty Event-Loop mặc định gồm 8 luồng `reactor-http-nio` trên máy chủ 8 nhân CPU). Một lập trình viên mới quen tay viết trong hàm xử lý Reactive như sau: gọi một dòng rời rạc `reactiveAuditRepo.save(auditEntry);` (không nối vào chuỗi trả về), sau đó bên trong `.map(...)` lại gọi trực tiếp `legacyJdbcTemplate.queryForObject(...)` và `webClient.get()...retrieve().bodyToMono(Dto.class).block()`. Khi đưa lên chạy thật: (1) Không có bất kỳ dòng `auditEntry` nào được lưu vào CSDL, và (2) Khi Database cũ chậm 3 giây, chỉ cần 8 request bay vào là toàn bộ cổng WebFlux tê liệt hoàn toàn, kể cả các API thuần bộ nhớ không chạm tới DB cũ cũng treo chết! Giải thích nào hoàn toàn chính xác?",
        options: [
          "Do `reactiveAuditRepo.save()` mặc định chỉ lưu vào ổ cứng tạm `/tmp` của container; còn `.block()` là phương thức tối ưu hiệu năng được khuyến khích gọi trực tiếp bên trong `.map()` của WebFlux.",
          "Do Netty không tương thích với hệ điều hành Linux 64-bit khi chạy quá 8 kết nối đồng thời; chỉ cần thêm từ khóa `synchronized` quanh `.block()` là Netty tự sinh thêm 200 luồng Event-Loop mới.",
          "Trong Project Reactor, `Mono`/`Flux` là các luồng dữ liệu lười (Cold/Lazy Publishers) — 'không có gì xảy ra cho tới khi có `subscribe`' nên viết dòng rời rạc `reactiveAuditRepo.save(...)` không nối vào chuỗi `flatMap`/`then` trả về cho WebFlux tương đương tạo ra công thức rồi vứt đi không bao giờ thực thi; đồng thời gọi tác vụ chặn đồng bộ (`JdbcTemplate`, `.block()`) ngay trên luồng Netty Event-Loop sẽ khóa cứng toàn bộ 8 luồng phục vụ hàng vạn kết nối ghép kênh! Phải nối chuỗi Reactive không đứt mạch (tuyệt đối không `.block()`, bật BlockHound trên test để bắt tự động) và nếu bắt buộc gọi thư viện blocking cũ thì phải đẩy sang `Schedulers.boundedElastic()`.",
          "Do thiếu lệnh `Thread.sleep(100)` sau câu lệnh `reactiveAuditRepo.save(auditEntry);` để chờ dữ liệu kịp ghi xuống đĩa."
        ],
        answer: 2,
        walkthrough: {
          keyword: "Spring WebFlux 8 luồng reactor-http-nio ... dòng rời rạc reactiveAuditRepo.save() không lưu gì ... gọi JdbcTemplate và .block() làm tê liệt toàn bộ cổng WebFlux",
          whyCorrect: "Chào em, câu này tổng kết trọn vẹn hai cú vấp ngã đau đớn nhất khi một lập trình viên Imperative bước sang thế giới Reactive **Spring WebFlux**! **Thứ nhất — 'Nothing happens until you subscribe':** Gọi `reactiveAuditRepo.save(entry);` chỉ mới khởi tạo ra một đối tượng mô tả luồng `Mono<AuditEntry>` trên bộ nhớ chứ **chưa hề bắn bất kỳ gói tin nào xuống DB**! Nếu bạn bỏ lửng dòng đó mà không nối nó vào dòng chảy trả về cho Spring WebFlux subscribe (bằng `.flatMap(...)` hoặc `.then(...)`), đối tượng `Mono` đó bị GC dọn sạch mà không chạy 1 dòng SQL nào! **Thứ hai — Luật vàng 'Never Block the Event Loop':** Khác với Tomcat (1 request = 1 thread), Netty chỉ dùng đúng số luồng bằng số nhân CPU (8 luồng `reactor-http-nio`) xoay vòng không ngừng để phục vụ ghép kênh (multiplexing) hàng chục nghìn kết nối non-blocking. Trên phiên bản Reactor hiện đại, gọi `.block()` trên luồng `NonBlocking` thậm chí ném thẳng `IllegalStateException` hoặc nếu gọi hàm chặn ngầm như `JdbcTemplate` / `Thread.sleep()` thì chỉ 8 request chậm 3 giây đã bịt kín 100% đường thở của cả server! Nếu buộc phải gọi JDBC cũ từ WebFlux, phải bọc `Mono.fromCallable(() -> jdbc...).subscribeOn(Schedulers.boundedElastic())`.",
          whyWrong: [
            "Gọi `.block()` bên trong toán tử Reactive là phản mẫu cấm kỵ số 1 trong tài liệu chính thức của Project Reactor & Spring WebFlux.",
            "Netty là nền tảng I/O bất đồng bộ hiệu năng cao bậc nhất trên Linux (`epoll`), và số luồng Event-Loop là cố định không bao giờ tự phình lên 200 nhờ `synchronized`.",
            "",
            "Thêm `Thread.sleep(100)` ngay trên luồng Event-Loop không làm `Mono` chưa subscribe tự chạy mà còn chặn đứng luôn luồng Event-Loop suốt 100ms trên mỗi request!"
          ],
          tip: "Làm việc với **Spring WebFlux**, nhớ 2 quy tắc sống còn: **1. Mọi `Mono`/`Flux` sinh ra phải được nối mạch (`flatMap`/`then`/`zip`) trả về cuối hàm (đừng để rơi lửng lơ)**; **2. Cài `BlockHound` vào bộ JUnit để bắt chết mọi lời gọi blocking lọt vào Event-Loop!**"
        }
      },
      {
        id: "R1-24",
        domain: "JPA & Testing",
        lessonId: "S5",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Hội đồng Kiến trúc Ngân hàng đang họp chọn nền tảng công nghệ cho phân hệ **Khởi tạo & Thẩm định Khoản vay Mới (Loan Origination System)** triển khai năm nay trên Java 21 và Spring Boot 3. Đặc thù dự án: nghiệp vụ phức tạp nhiều quy tắc rẽ nhánh, dữ liệu lưu trên PostgreSQL dùng nhiều quan hệ **Spring Data JPA / Hibernate**, tích hợp hàng đợi **IBM MQ (JMS)** của hệ thống Core cũ và gọi 4 API REST thẩm định tín dụng CIC; đội ngũ gồm 14 kỹ sư Java mạnh về lập trình tuần tự và gỡ lỗi qua Stack Trace. Giữa **Spring WebFlux (Reactive toàn diện)** và **Spring MVC + Java 21 Virtual Threads**, đâu là lựa chọn kiến trúc chuẩn xác nhất kèm lập luận đúng đắn?",
        options: [
          "Bắt buộc dùng Spring WebFlux kết hợp trực tiếp với Spring Data JPA/Hibernate và JMS cổ điển trên cùng luồng Netty Event-Loop vì hễ có chữ Reactive là mọi thư viện blocking bên dưới đều tự động biến thành non-blocking.",
          "Chọn **Spring MVC kết hợp Java 21 Virtual Threads** (`spring.threads.virtual.enabled=true`): vì cả JPA/Hibernate (JDBC) lẫn IBM MQ (JMS) đều có bản chất Blocking I/O không tương thích tự nhiên với chuỗi Reactive thuần túy; Virtual Threads giúp giải phóng hoàn toàn nút thắt chờ I/O mạng/DB/MQ ở quy mô hàng nghìn kết nối đồng thời, trong khi vẫn giữ nguyên mã nguồn tuần tự dễ đọc, dùng trọn vẹn sức mạnh `@Transactional` của JPA, gỡ lỗi Stack Trace rõ ràng và phù hợp tuyệt đối năng lực đội ngũ (chỉ ưu tiên WebFlux cho tầng API Gateway, Streaming SSE hoặc hệ thống thuần non-blocking từ đầu tới cuối).",
          "Không dùng cả hai mà viết lại toàn bộ máy chủ HTTP từ con số 0 bằng `java.net.ServerSocket` thuần trên Java 8 để kiểm soát từng byte gói tin cho dự án thẩm định vay.",
          "Bắt buộc dùng Spring WebFlux và ép toàn bộ 14 kỹ sư tự viết lại ORM thay thế Hibernate trên R2DBC trong vòng 2 tuần dù R2DBC không hỗ trợ đầy đủ Lazy Loading, Dirty Checking hay quan hệ phức tạp của JPA."
        ],
        answer: 1,
        walkthrough: {
          keyword: "nghiệp vụ phức tạp dùng nhiều Spring Data JPA/Hibernate (JDBC) + IBM MQ (JMS) + 4 API REST ... đội ngũ 14 kỹ sư quen gỡ lỗi Stack Trace ... chọn WebFlux hay Spring MVC + Virtual Threads",
          whyCorrect: "Chào bạn, đây chính là câu hỏi bản lĩnh **Architectural Trade-off** mà các CTO / Head of Engineering Ngân hàng cực thích hỏi ứng viên Senior/Lead! Một Senior thực thụ không chạy theo trào lưu mù quáng mà nhìn thẳng vào hệ sinh thái phụ thuộc: **Spring Data JPA / Hibernate chạy trên JDBC (Blocking)** và **IBM MQ JMS chuẩn cũ cũng là Blocking**! Nếu cố ép lên Spring WebFlux, bạn hoặc là vi phạm luật chặn Event-Loop, hoặc phải bọc mọi câu truy vấn DB/MQ vào `Schedulers.boundedElastic()` vô cùng rườm rà, mất sạch lợi thế non-blocking đầu-cuối, lại làm Stack Trace đứt đoạn hàng chục dòng `MonoFlatMap` cực kỳ khổ sở khi điều tra sự cố tiền bạc lúc 2 giờ sáng! Với **Spring Boot 3.2+ và Java 21 Virtual Threads**, mỗi request chạy trên một Virtual Thread siêu nhẹ (~vài KB): khi chạm JDBC, JMS hay `RestClient` chờ CIC, Virtual Thread tự động unmount nhường CPU, đạt thông lượng đồng thời cao tương đương mô hình bất đồng bộ mà vẫn giữ trọn vẹn sự trong sáng của code tuần tự, `@Transactional`, MDC `traceId` và toàn bộ hệ sinh thái Hibernate!",
          whyWrong: [
            "Đặt thư viện Blocking (JDBC/Hibernate/JMS) bên dưới WebFlux KHÔNG HỀ biến chúng thành non-blocking — trái lại nó làm nghẽn chết Netty Event-Loop như ở câu trước!",
            "",
            "Tự viết lại HTTP Server trên `ServerSocket` Java 8 bỏ qua bảo mật, HTTP/2, Observability, Spring Security là sự lãng phí và rủi ro kỹ thuật không tưởng trong doanh nghiệp.",
            "R2DBC theo triết lý thiết kế đã chủ đích không cài đặt các tính năng ORM phức tạp như First-Level Cache Dirty Checking, Lazy Loading ngầm hay kế thừa đa bảng của Hibernate; ép viết lại trong 2 tuần cho hệ thống nghiệp vụ dày đặc là tự sát tiến độ dự án."
          ],
          tip: "Khi trả lời phỏng vấn so sánh **WebFlux vs Spring MVC + Virtual Threads (Java 21)**: Hãy nêu rõ nguyên tắc **'Có JDBC/JPA/JMS blocking + nghiệp vụ phức tạp -> Chọn Spring MVC + Virtual Threads; Làm API Gateway (Spring Cloud Gateway) / Streaming / Backpressure luồng sự kiện -> Chọn WebFlux'**!"
        }
      },
      {
        id: "R1-25",
        domain: "JPA & Testing",
        lessonId: "S6",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Bạn được giao viết bài kiểm thử tự động chứng minh hàm `withdraw(accountId, amount)` chống rút âm tiền tuyệt đối: Tài khoản ban đầu có đúng `1.000.000 VNĐ`, cho 20 luồng đồng thời cùng rút `600.000 VNĐ` một lúc, kỳ vọng duy nhất 1 luồng thành công (số dư cuối bằng `400.000 VNĐ`) và 19 luồng còn lại phải nhận ngoại lệ `InsufficientFundsException`. Một đồng nghiệp viết vòng lặp `for (int i = 0; i < 20; i++) { new Thread(() -> service.withdraw(id, 600_000)).start(); }` nhưng do chi phí khởi tạo từng OS Thread tuần tự, Luồng 0 đã chạy xong SQL trước cả khi Luồng 1 kịp khởi động nên bài test lúc nào cũng xanh dù hàm `withdraw()` quên khóa dòng! Kỹ thuật viết Concurrency Integration Test nào ép cả 20 luồng nổ súng tranh chấp cùng một micro-giây trên PostgreSQL Testcontainers?",
        options: [
          "Chạy vòng lặp `for` tuần tự trên duy nhất luồng `main` 20 lần liên tiếp mà không tạo luồng phụ nào để tránh phụ thuộc vào bộ lập lịch của hệ điều hành.",
          "Thêm `Thread.sleep(500 * i)` vào trước mỗi luồng thứ `i` để các luồng cách đều nhau nửa giây, giúp log in ra màn hình thẳng hàng dễ đọc.",
          "Dùng `@MockBean` giả lập kết quả trả về của `AccountRepository` sao cho lần gọi thứ nhất trả về thành công, 19 lần sau ném `InsufficientFundsException` mà không cần chạm tới Database.",
          "Sử dụng `ExecutorService` 20 luồng kết hợp hai chốt đồng bộ `CountDownLatch readyAndStartGate` (hoặc `CyclicBarrier(20)`) và `CountDownLatch doneGate = new CountDownLatch(20)` chạy trên `PostgreSQLContainer` thật: cả 20 worker thread sau khi sẵn sàng đều đứng chờ sát vạch xuất phát tại `startGate.await()`, luồng chính bấm còi `startGate.countDown()` giải phóng đồng loạt cả 20 luồng đập thẳng vào PostgreSQL cùng một khoảnh khắc, chờ `doneGate.await()`, rồi kiểm chứng `successCount.get() == 1`, `insufficientCount.get() == 19` và số dư đọc mới từ DB bằng đúng `400.000 VNĐ`."
        ],
        answer: 3,
        walkthrough: {
          keyword: "chứng minh 20 luồng đồng thời rút 600.000 VNĐ trên số dư 1.000.000 VNĐ ... vòng lặp new Thread().start() tuần tự làm Luồng 0 xong trước khi Luồng 1 kịp chạy",
          whyCorrect: "Chào em, kết thúc Đề số 1 là một kỹ thuật viết **Concurrency Invariant Test** mà hễ đưa vào đồ án hay bài test tuyển dụng là các Sếp Kỹ thuật Ngân hàng gật gù chấm điểm tuyệt đối ngay! Khởi tạo OS Thread bằng `new Thread().start()` tốn thời gian cấp phát tài nguyên kernel nên Luồng 0 thường đã chạy xong câu SQL 2ms trước khi vòng lặp `for` kịp tạo ra Luồng 5 — thành ra 20 luồng chạy nối đuôi nhau chứ không hề va chạm đồng thời! Bằng cách nạp sẵn 20 tác vụ vào `ExecutorService(20)` và cho tất cả gọi `readyLatch.countDown(); startGate.await();`, cả 20 luồng đều đã khởi động nóng máy, xếp hàng ngang bằng tăm tắp ngay trước dòng `service.withdraw(...)`. Khoảnh khắc luồng test chính gọi `startGate.countDown()`, cả 20 luồng lao vút vào Database trong cùng một micro-giây! Nếu `withdraw()` thiếu khóa dòng hay thiếu `UPDATE ... WHERE balance >= :amt`, bài test này lập tức bắt sống số dư bị tụt xuống `-11.000.000 VNĐ` chỉ trong chưa đầy 1 giây chạy!",
          whyWrong: [
            "Chạy tuần tự trên 1 luồng `main` chỉ kiểm tra được logic `if (balance >= amount)` đơn luồng, hoàn toàn bất lực trước lỗi Race Condition / Lost Update khi nhiều giao dịch tới cùng lúc.",
            "Chèn `sleep(500 * i)` cố tình tách rời từng giao dịch cách nhau 500ms, đảm bảo 100% không bao giờ xảy ra tranh chấp đồng thời nên lọt toàn bộ lỗi rút âm tiền lên Production!",
            "Mock luôn `AccountRepository` thì bạn chỉ đang test chính kịch bản giả lập bạn tự viết ra trong Mockito chứ không hề kiểm chứng cơ chế khóa dòng hay tính nguyên tử trên PostgreSQL thật.",
            ""
          ],
          tip: "Muốn viết **Integration Test bắt lỗi Race Condition / Rút âm tiền / Trùng Idempotency**: Luôn dùng công thức **`Testcontainers Postgres thật` + `ExecutorService(N)` + `CountDownLatch startGate` (còi xuất phát đồng loạt) + `AtomicInteger` đếm số luồng thành công/thất bại**!"
        }
      }
    ]
  };

  var caseStudyR2 = {
    title: "Case Study: Kiến trúc Chuyển tiền 24/7, Sổ Cái & Ví Điện Tử 15 Triệu Khách Hàng",
    context: "Ngân hàng số VietPayCore vận hành hệ sinh thái Tài khoản Thanh toán (CASA) và Ví Điện Tử phục vụ 15 triệu khách hàng cá nhân cùng 350.000 điểm chấp nhận thanh toán VietQR, chịu tải đỉnh 6.000 TPS vào khung giờ ăn trưa và tối cuối tuần. Trái tim dữ liệu là cụm PostgreSQL 16 gồm 1 Primary kết hợp 2 Async Read Replicas chạy trên Kubernetes (40 Pod xử lý ví), trong đó bảng bút toán sổ cái `ledger_entries` đã cán mốc 2,2 tỷ bản ghi và tăng thêm 45 triệu dòng mỗi ngày. Mọi giao dịch rút/chuyển tiền bắt buộc đảm bảo tuyệt đối không bao giờ phát sinh số dư âm hoặc Deadlock dây chuyền khi hai khách hàng chuyển tiền chéo cho nhau cùng lúc. Cụm Redis 7 Cluster được dùng để kiểm soát nguyên tử hạn mức chuyển khoản tối đa 500.000.000 VNĐ/ngày trên từng khách hàng và giảm tải đọc danh mục cấu hình nóng. Để đồng bộ biến động số dư sang dịch vụ Thông báo (SLA < 2s), Chống gian lận và Tích điểm, hệ thống triển khai Apache Kafka 3.7 (3 Brokers, `replication.factor=3`) kết hợp mẫu Transactional Outbox cam kết không mất sự kiện và giữ đúng thứ tự thời gian từng tài khoản. Đối với luồng chuyển tiền nhanh liên ngân hàng NAPAS 24/7 và thanh toán hóa đơn điện/nước, bộ điều phối Saga Orchestrator quản lý vòng đời giữ tiền tạm thời (`HOLD`), xử lý bù trừ bất biến trên sổ cái và cô lập lỗi đối tác bằng Resilience4j. Cuối mỗi ngày trong khung giờ hẹp 00:15 – 01:00 (45 phút), hệ thống phải chạy lô Spring Batch tính và hạch toán lãi không kỳ hạn (EOD Interest Accrual) cho toàn bộ 15 triệu tài khoản đảm bảo khả năng chạy tiếp an toàn nếu sập Pod giữa chừng."
  };

  var examR2 = {
    id: "senior-round-2",
    cert: "Vòng 2 · Data & Microservices",
    title: "Đề Thi Tuyển Số 2 — Database Locking, Redis, Kafka, Saga & Chịu Lỗi Cao",
    subtitle: "25 câu hỏi kiến trúc dữ liệu & hệ thống phân tán ngân hàng + Case Study 15 triệu user · Chữa đề 4 bước",
    durationMinutes: 50,
    passingScore: 700,
    questions: [
      {
        id: "R2-01",
        domain: "PostgreSQL & Locking",
        lessonId: "D2",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR2,
        question: "Bảng `ledger_entries` 2,2 tỷ dòng của VietPayCore được chia phân vùng theo tháng bằng `PARTITION BY RANGE (booking_date)`. Màn hình chính ứng dụng Mobile gọi truy vấn lấy 20 biến động gần nhất của một tài khoản để hiển thị cột `booking_date`, `amount`, `balance_after` và `narrative`. Tuy nhiên, đội DBA phát hiện một số API tra cứu chỉ truyền `WHERE account_id = :accId ORDER BY booking_date DESC LIMIT 20` (thiếu điều kiện lọc trên `booking_date`) khiến PostgreSQL phải quét qua toàn bộ 36 phân vùng tháng, đồng thời phát sinh hàng chục lần đọc ngẫu nhiên vào Heap Table làm độ trễ vọt lên 450ms! Thiết kế truy vấn và Index nào hạ độ trễ xuống dưới 5ms?",
        options: [
          "Gỡ bỏ hoàn toàn Range Partitioning gom lại thành 1 bảng đơn khổng lồ 2,2 tỷ dòng và tạo Hash Index trên cột `account_id` để tìm kiếm không cần sắp xếp.",
          "Luôn truyền kèm phạm vi cột phân vùng `booking_date` trong mệnh đề `WHERE` (ví dụ mặc định 30–90 ngày gần nhất, mở rộng thêm khi khách bấm xem cũ hơn) để kích hoạt **Partition Pruning** chỉ chạm đúng 1–3 phân vùng tháng, kết hợp tạo **Covering B-Tree Index** `(account_id, booking_date DESC) INCLUDE (amount, balance_after, narrative)` giúp PostgreSQL thực hiện **Index-Only Scan** trả kết quả ngay từ lá Index mà không cần đọc xuống Heap.",
          "Đánh 5 Index đơn lẻ tách rời trên từng cột `(account_id)`, `(booking_date)`, `(amount)`, `(balance_after)` và `(narrative)` để PostgreSQL tự ghép nối bằng BitmapAnd trên cả 36 phân vùng.",
          "Chuyển câu truy vấn sang dùng `SELECT * FROM ledger_entries WHERE CAST(account_id AS TEXT) LIKE :accId` để tận dụng bộ nhớ đệm chuỗi của hệ điều hành."
        ],
        answer: 1,
        walkthrough: {
          keyword: "ledger_entries 2,2 tỷ dòng PARTITION BY RANGE (booking_date) ... thiếu điều kiện booking_date quét cả 36 phân vùng + đọc ngẫu nhiên Heap",
          whyCorrect: "Chào bạn, câu mở màn Đề số 2 xoáy thẳng vào bí quyết tối ưu bảng tỷ dòng trong Core Banking! Trên bảng phân vùng `PARTITION BY RANGE (booking_date)`, PostgreSQL chỉ có thể cắt tỉa phân vùng (**Partition Pruning**) nếu mệnh đề `WHERE` chứa điều kiện giới hạn trên chính khóa phân vùng `booking_date`! Thiếu nó, bộ lập kế hoạch buộc phải mở cả 36 bảng con của 3 năm ra dò tìm. Hơn nữa, ngay cả trong 1 phân vùng tháng (~45 triệu × 30 ngày), nếu chỉ đánh Index `(account_id, booking_date DESC)`, PostgreSQL tìm được 20 vị trí dòng rồi vẫn phải nhảy ngẫu nhiên 20 lần vào các trang dữ liệu Heap (Random Disk I/O) để nhặt `amount`, `balance_after`, `narrative`. Khi bổ sung mệnh đề `INCLUDE (amount, balance_after, narrative)` tạo **Covering Index** (kết hợp Autovacuum cập nhật Visibility Map đều đặn), toàn bộ dữ liệu cần hiển thị nằm gọn ngay trên lá B-Tree -> kích hoạt **Index-Only Scan** đọc tuần tự trong chưa đầy **2–5ms**!",
          whyWrong: [
            "Gộp 2,2 tỷ dòng vào một bảng duy nhất khiến kích thước B-Tree Index phình vượt quá RAM Shared Buffers, làm chậm cả INSERT lẫn công tác dọn dẹp/lưu trữ dữ liệu cũ (Archiving); ngoài ra Hash Index không hỗ trợ sắp xếp `ORDER BY booking_date DESC`.",
            "",
            "Đánh 5 Index đơn lẻ không giúp ích cho phép lọc kết hợp sắp xếp trên một tài khoản mà còn làm giảm thê thảm 50–60% tốc độ `INSERT` bút toán ở tải đỉnh 6.000 TPS vì mỗi dòng mới phải cập nhật cả 5 cây Index!",
            "Ép kiểu `CAST(account_id AS TEXT)` làm hỏng hoàn toàn khả năng sử dụng Index trên cột `account_id`, biến câu lệnh thành thảm họa Full Sequential Scan quét toàn bộ 2,2 tỷ dòng!"
          ],
          tip: "Công thức vàng cho bảng Sao kê Tỷ dòng trên PostgreSQL: **`PARTITION BY RANGE (booking_date)`** + **Luôn có `booking_date` trong `WHERE` (Partition Pruning)** + **Covering Index `(account_id, booking_date DESC) INCLUDE (...)` (Index-Only Scan)**!"
        }
      },
      {
        id: "R2-02",
        domain: "PostgreSQL & Locking",
        lessonId: "D3",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: caseStudyR2,
        question: "Trong giờ ăn trưa cao điểm 6.000 TPS tại VietPayCore, hai đồng nghiệp A (`account_id = 1005`) và B (`account_id = 2089`) tình cờ chuyển tiền chia hóa đơn chéo cho nhau (`A -> B` và `B -> A`) trong cùng một mili-giây. Hiện tại hàm chuyển tiền dùng Pessimistic Lock khóa `lockById(fromAccountId)` trước rồi khóa `lockById(toAccountId)` sau trong cùng một `@Transactional`. Hệ thống liên tục văng ngoại lệ `PSQLException: ERROR: deadlock detected`! Giải pháp nào loại bỏ triệt để 100% lỗi Deadlock chéo này mà vẫn chống âm tiền tuyệt đối?",
        options: [
          "Hạ mức cô lập xuống `READ UNCOMMITTED` và bỏ hoàn toàn lệnh `SELECT ... FOR UPDATE` để hai giao dịch ghi đè số dư song song không cần chờ nhau.",
          "Đặt `Thread.sleep((long)(Math.random() * 2000))` trước mọi câu lệnh khóa dòng để hy vọng hai giao dịch lệch thời điểm chạy của nhau.",
          "Tăng cấu hình `deadlock_timeout` của PostgreSQL từ `1s` lên `300s` để Database kiên nhẫn chờ 5 phút thay vì báo lỗi Deadlock.",
          "Áp dụng quy tắc **Thứ tự Chiếm giữ Khóa Nhất quán (Deterministic Lock Ordering)**: luôn sắp xếp định danh hai tài khoản tăng dần (`Long firstId = Math.min(fromId, toId); Long secondId = Math.max(fromId, toId);` hoặc một câu `SELECT ... WHERE id IN (:id1, :id2) ORDER BY id ASC FOR UPDATE`) kết hợp đặt `lock_timeout` ngắn (2–3 giây) để phá vỡ hoàn toàn điều kiện chờ vòng tròn (Circular Wait)."
        ],
        answer: 3,
        walkthrough: {
          keyword: "chuyển tiền chéo A -> B (1005 -> 2089) và B -> A (2089 -> 1005) cùng mili-giây ... khóa fromAccountId trước rồi toAccountId sau ... ERROR: deadlock detected",
          whyCorrect: "Chào em, đây là câu hỏi kinh điển số 1 trong mọi buổi phỏng vấn Core Banking! Hãy nhìn cận cảnh khoảnh khắc xảy ra **AB-BA Deadlock**: Ở mili-giây `t1`, Giao dịch 1 (`1005 -> 2089`) khóa thành công dòng `1005`, cùng lúc Giao dịch 2 (`2089 -> 1005`) khóa thành công dòng `2089`. Tới mili-giây `t2`, Giao dịch 1 xin khóa dòng `2089` (đang bị Giao dịch 2 giữ) nên đứng chờ; còn Giao dịch 2 lại xin khóa dòng `1005` (đang bị Giao dịch 1 giữ) nên cũng đứng chờ -> tạo thành vòng tròn chờ đợi khép kín (**Circular Wait**)! Theo lý thuyết hệ điều hành của Coffman, chỉ cần bẻ gãy điều kiện Circular Wait bằng **Lock Ordering** — ép MỌI giao dịch trên đời bất kể ai gửi ai nhận đều phải xin khóa ID nhỏ (`1005`) trước rồi mới xin khóa ID lớn (`2089`) sau: Giao dịch 1 chiếm được `1005` trước, Giao dịch 2 cũng xin `1005` đầu tiên nên ngoan ngoãn xếp hàng đợi 2ms, Giao dịch 1 lấy tiếp `2089` chạy vèo xong commit nhả cả hai khóa cho Giao dịch 2 chạy tiếp -> **Không bao giờ có thể xảy ra Deadlock chéo nữa**!",
          whyWrong: [
            "Bỏ khóa dòng khi đọc-kiểm-tra-ghi số dư sẽ gây lỗi **Lost Update** dẫn đến rút âm tiền và mất tiền ngay lập tức (nhân tiện trong PostgreSQL, `READ UNCOMMITTED` thực chất hoạt động giống hệt `READ COMMITTED`).",
            "`Thread.sleep` ngẫu nhiên vừa phá nát SLA độ trễ (tốn oan tới 2 giây giữ kết nối HikariCP!), vừa chỉ giảm xác suất chứ không bao giờ triệt tiêu được Deadlock dưới tải 6.000 TPS.",
            "`deadlock_timeout` chỉ là thời gian PostgreSQL chờ trước khi chạy thuật toán dò đồ thị Deadlock: khi đã dính Deadlock thật thì dù chờ 5 phút hay 5 năm hai luồng cũng không tự gỡ được mà chỉ làm ngâm chết sạch kết nối DB!",
            ""
          ],
          tip: "Hễ gặp bài toán **Khóa nhiều bản ghi (Chuyển tiền A<->B, Gộp ví, Đổi chéo ngoại tệ)**: Phản xạ trong 1 giây -> **Sắp xếp khóa theo thứ tự cố định (`ORDER BY account_id ASC` / `Math.min -> Math.max`)** để triệt tiêu 100% AB-BA Deadlock!"
        }
      },
      {
        id: "R2-03",
        domain: "Redis & Sharding",
        lessonId: "D4",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR2,
        question: "VietPayCore quy định mỗi khách hàng chỉ được chuyển tối đa `500.000.000 VNĐ/ngày`, kiểm tra nhanh trên cụm Redis 7 Cluster. Phiên bản hiện tại viết trong Java gồm 3 lệnh gọi Redis nối tiếp nhau: (1) `long used = redis.get('quota:' + cif + ':' + today)`, (2) kiểm tra `if (used + amount > 500_000_000) throw LimitExceeded()`, (3) `redis.incrBy(key, amount); redis.expire(key, 86400);`. Đội Pentest vừa biểu diễn dùng tool bắn đồng thời 10 lệnh chuyển `450.000.000 VNĐ` trên cùng 1 tài khoản từ 10 luồng: cả 10 luồng đều đọc thấy `used == 0` ở bước (1) và chuyển trót lọt tổng cộng `4,5 tỷ VNĐ` (gấp 9 lần trần quy định!), chưa kể nếu Pod sập ngay giữa `incrBy` và `expire` thì khóa sống vĩnh viễn! Bạn phải thiết kế lại như thế nào?",
        options: [
          "Gói toàn bộ bước kiểm tra và cộng dồn vào một **Redis Lua Script nguyên tử** (`EVALSHA`) thực thi đơn luồng ngay trên node Redis chứa khóa `quota:{cif}:yyyyMMdd`: đọc tổng đã dùng, nếu `used + amount > limit` thì trả về `0` từ chối ngay không sửa dữ liệu, ngược lại thực hiện `INCRBY` và đặt `EXPIRE` (khi mới tạo khóa) trong cùng 1 lần chạy không thể xen ngang; đồng thời chuẩn bị sẵn Lua Script hoàn lại hạn mức (`DECRBY` không âm) nếu bước trừ tiền Database ngay sau đó thất bại.",
          "Bọc đoạn code Java gọi 3 lệnh Redis vào khối `synchronized (this)` bên trong Pod xử lý ví để các luồng phải xếp hàng từng người một.",
          "Dùng lệnh `MULTI` và `EXEC` của Redis để có thể viết câu điều kiện `if (used + amount <= limit)` rẽ nhánh động ngay bên trong khối `MULTI/EXEC` mà không cần Lua.",
          "Tắt kiểm tra hạn mức thời gian thực trên luồng thanh toán và chuyển sang chạy câu lệnh `SUM(amount)` cuối ngày để gửi email nhắc nhở khách hàng nếu hôm đó lỡ chuyển vượt 500 triệu."
        ],
        answer: 0,
        walkthrough: {
          keyword: "kiểm soát nguyên tử hạn mức 500.000.000 VNĐ/ngày trên Redis 7 Cluster ... bắn đồng thời 10 lệnh 450 triệu vượt trần lên 4,5 tỷ + sập giữa incrBy và expire",
          whyCorrect: "Chào bạn, câu này lột tả đúng bản chất lỗ hổng **Race Condition xuyên mạng** mà hacker tài chính cực kỳ ưa thích khai thác (gọi là **Limit Bypass / Race-the-Quota Attack**)! Dù từng lệnh `GET` hay `INCRBY` của Redis chạy đơn luồng rất nhanh, nhưng khi tách thành 3 vòng mạng từ 40 Pod K8s khác nhau gửi vào, 10 gói tin `GET` hoàn toàn chạy xong hết trả về `0` trước khi gói `INCRBY` đầu tiên kịp tới! Giải pháp chuẩn mực tuyệt đối trên Redis là **Atomic Lua Script**: Redis đảm bảo toàn bộ kịch bản Lua chạy trọn vẹn từ dòng đầu đến dòng cuối như một câu lệnh đơn duy nhất không một lệnh nào khác chen ngang được (`Read -> Check <= 500M -> INCRBY -> EXPIRE if TTL < 0`, tất cả chỉ tốn **1 vòng mạng RTT ~0.5ms**!). Lưu ý thêm chi tiết Senior rất đắt giá: đặt `{cif}` trong Hash Tag `quota:{cif}:yyyyMMdd` nếu cần thao tác đa khóa cùng khách hàng trên Redis Cluster, và nhớ hoàn trả quota bằng Lua bảo vệ cận dưới `>= 0` khi giao dịch DB phía sau bị từ chối!",
          whyWrong: [
            "",
            "`synchronized (this)` chỉ khóa các luồng bên trong **1 Pod duy nhất**, trong khi VietPayCore đang chạy **40 Pod song song** — kẻ tấn công bắn 10 request rơi vào 10 Pod khác nhau vẫn xuyên thủng hạn mức 4,5 tỷ đồng dễ như trở bàn tay!",
            "Khối `MULTI/EXEC` của Redis chỉ xếp hàng lệnh gửi đi một lượt chứ KHÔNG hỗ trợ đọc kết quả lệnh trước để viết `if/else` rẽ nhánh cho lệnh sau ở phía Server (nếu dùng `WATCH` lạc quan thì 9/10 request hợp lệ nhỏ lẻ cùng lúc cũng bị hủy oan).",
            "Hạn mức giao dịch ngày theo quy định Quản trị Rủi ro & Ngân hàng Nhà nước là chốt chặn phòng chống chiếm đoạt tài khoản (Account Takeover), bắt buộc phải chặn trước khi tiền rời đi (Pre-check) chứ không thể để mất 4,5 tỷ rồi tối mới gửi email!"
          ],
          tip: "Hễ bài toán yêu cầu **Kiểm tra điều kiện + Cập nhật bộ đếm + Gắn TTL trên Redis** (Hạn mức ngày, Flash-sale voucher, Rate Limiter, Chống Replay): Chỉ có một đáp án chuẩn Senior duy nhất là **Atomic Redis Lua Script (`EVALSHA`)**!"
        }
      },
      {
        id: "R2-04",
        domain: "Redis & Sharding",
        lessonId: "D5",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: caseStudyR2,
        question: "VietPayCore vận hành cụm PostgreSQL 16 gồm 1 Primary + 2 Async Read Replicas cùng 40 Pod dịch vụ Ví. Hai sự cố xảy ra liên tiếp: (1) Khách hàng vừa chuyển đi 2.000.000 VNĐ báo thành công (`POST /transfers` ghi vào Primary), ứng dụng Mobile lập tức chuyển về màn hình Trang chủ gọi `GET /wallets/me` (đang định tuyến sang Async Read Replica nhờ `@Transactional(readOnly = true)`) ở mili-giây thứ 60 sau khi chuyển, nhưng màn hình vẫn hiện nguyên số dư cũ chưa trừ tiền khiến khách tưởng lỗi bấm chuyển thêm lần nữa! (2) Mỗi Pod đang cấu hình `hikari.maximum-pool-size = 50`, khi cả 40 Pod chịu tải cao đồng loạt mở đủ `40 × 50 = 2.000` kết nối vật lý làm Primary PostgreSQL quá tải CPU và từ chối kết nối (`too many clients already`)! Giải pháp kiến trúc nào xử lý triệt để cả hai vấn đề?",
        options: [
          "Chuyển cả 2 Read Replicas thành Primary chạy ghi đa chiều tự do không cần đồng bộ, và tăng `max_connections` của PostgreSQL lên `50.000` kết nối.",
          "Bắt Mobile App dừng màn hình trắng xoay vòng `sleep(5000)` sau mỗi giao dịch chuyển tiền để chờ Read Replica đuổi kịp, đồng thời đặt `hikari.maximum-pool-size = 1` trên mỗi Pod.",
          "Giải quyết độ trễ **Read-Your-Own-Writes** bằng cách định tuyến thông minh: sau khi khách vừa phát sinh giao dịch ghi, gắn cờ ngắn hạn `recent_write:{cif}` trên Redis (TTL `3–5s`) hoặc đối chiếu vị trí `pg_current_wal_lsn()` để các lệnh đọc của chính khách đó trong vài giây đầu trỏ thẳng vào **Primary** (và mọi lệnh kiểm tra số dư trước khi trừ tiền luôn bắt buộc đọc từ Primary); đồng thời thu gọn HikariCP về mức chuẩn (`10–15` kết nối/Pod) kết hợp tầng **PgBouncer (Transaction Pooling)** phía trước PostgreSQL để hàng chục Pod chia sẻ mượt mà vài trăm kết nối DB thực.",
          "Xóa hoàn toàn 2 Read Replicas và lưu toàn bộ số dư gốc chỉ trên bộ nhớ RAM của Redis Cluster mà không ghi xuống PostgreSQL trong giờ hành chính."
        ],
        answer: 2,
        walkthrough: {
          keyword: "1 Primary + 2 Async Read Replicas + 40 Pod ... vừa chuyển tiền xong 60ms về Trang chủ vẫn thấy số dư cũ ... 40 Pod × 50 kết nối = 2.000 kết nối làm sập Postgres",
          whyCorrect: "Chào em, đây là hai bài toán vận hành kinh điển khi hệ thống ngân hàng bước lên quy mô hàng chục Pod và tách luồng Đọc/Ghi! **Vấn đề 1 — Replication Lag & Read-Your-Own-Writes Consistency:** Với Async Replication, WAL từ Primary đẩy sang Replica và phát lại (replay) thường trễ từ vài chục ms đến vài trăm ms lúc tải đỉnh. Nếu khách vừa ghi vào Primary xong mà 60ms sau lại đọc từ Replica, họ sẽ nhìn thấy 'quá khứ' trước khi chuyển tiền! Gắn một dấu ấn ngắn hạn `recent_write:{cif}` (TTL 3–5 giây) tại tầng `AbstractRoutingDataSource` giúp riêng người dùng vừa giao dịch xong được đọc thẳng từ Primary đảm bảo thấy ngay số dư mới nhất 100%, trong khi 98% lưu lượng mở app xem thông thường vẫn tải nhẹ trên Read Replicas! **Vấn đề 2 — HikariCP Sizing & PgBouncer:** PostgreSQL cấp phát 1 tiến trình hệ điều hành riêng (`postgres` backend process ~10MB RAM) cho mỗi kết nối; mở 2.000 kết nối hoạt động trên máy chủ 32–64 nhân CPU làm hệ điều hành kiệt sức vì Context Switching & tranh chấp khóa LWLock! Theo công thức vàng của HikariCP (`connections = core_count * 2 + spindle`), tổng kết nối hoạt động vào Postgres chỉ nên giữ vài trăm, nên với 40–100 Pod K8s ta thu gọn pool mỗi Pod vừa đủ (`10–15`) và đặt **PgBouncer chế độ Transaction Pooling** ở giữa để ghép kênh hàng nghìn kết nối ứng dụng vào ~150–200 kết nối PostgreSQL vật lý cực ngọt!",
          whyWrong: [
            "PostgreSQL chuẩn không hỗ trợ Multi-Master ghi tự do không xung đột cho cùng tài khoản tiền tệ (sẽ xung đột số dư thảm khốc), và `max_connections = 50000` sẽ làm sập RAM máy chủ DB ngay khi có bão tải.",
            "Bắt mọi khách hàng chờ cứng 5 giây màn hình trắng phá hỏng hoàn toàn trải nghiệm ngân hàng số hiện đại, còn `pool-size = 1` làm nghẽn toàn bộ Pod chỉ vì 1 truy vấn hơi chậm.",
            "",
            "Dùng Redis làm nơi lưu trữ duy nhất của số dư tiền tệ mà không ghi ACID xuống Database bền vững vi phạm nghiêm trọng an toàn tài chính (mất trắng tiền khi cụm Redis gặp sự cố)."
          ],
          tip: "Nhớ cặp quy tắc HA & Connection Pool trên PostgreSQL: **1. Có Async Read Replica thì phải xử lý `Read-Your-Own-Writes` (ghim tạm user vừa ghi về Primary 3–5s)**; **2. Nhiều K8s Pods (> 20 pods) -> Giữ HikariCP nhỏ gọn + đặt `PgBouncer (Transaction Mode)` chắn trước Postgres!**"
        }
      },
      {
        id: "R2-05",
        domain: "Kafka & Outbox",
        lessonId: "M2",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR2,
        question: "Tại VietPayCore, topic `ledger.balance.changed` (24 Partitions trên 3 Kafka Brokers, `replication.factor=3`) đẩy sự kiện biến động số dư sang dịch vụ Thông báo. Hiện tại đang gặp 2 lỗi nghiêm trọng: (1) Khách hàng vừa được nhận lương `+25.000.000` rồi mới chuyển tiền nhà `-8.000.000`, nhưng điện thoại lại nhận thông báo biến động trừ tiền nhà TRƯỚC rồi 2 giây sau mới nhận tin nhận lương khiến số dư hiển thị trên thông báo lộn ngược khó hiểu! (2) Đêm qua khi khởi động lại 1 Broker đang giữ vai trò Leader, có 9 thông báo biến động đã ghi sổ thành công bị mất dấu trên Kafka vì Producer đang để `acks=1`. Cấu hình Kafka nào giải quyết triệt để cả hai lỗi?",
        options: [
          "Rút số lượng Partition của topic từ 24 về còn đúng 1 Partition duy nhất cho toàn bộ 6.000 TPS của 15 triệu khách hàng, và đặt `acks=0` để tăng tốc độ bắn tin.",
          "Vẫn để khóa bản tin `key = null` (chia ngẫu nhiên Round-Robin vào 24 Partitions) nhưng gắn số thứ tự vào JSON để dịch vụ Thông báo giữ mọi tin nhắn lại trên RAM chờ 60 giây sắp xếp lại trước khi gửi.",
          "Bật `unclean.leader.election.enable=true` để khi Leader sập thì bất kỳ Broker nào còn sống cũng lập tức lên làm Leader không cần đồng bộ dữ liệu, kèm `max.in.flight.requests.per.connection=20` với `enable.idempotence=false`.",
          "Chỉ định `accountId` làm **Kafka Partition Key** khi gửi bản tin để mọi biến động của CÙNG một tài khoản luôn băm cố định vào đúng một Partition duy nhất (bảo toàn thứ tự FIFO tuyệt đối theo từng tài khoản mà vẫn song song hóa trên 24 Partitions); đồng thời cấu hình Producer `acks=all`, `enable.idempotence=true` (`max.in.flight.requests.per.connection <= 5`) kết hợp Topic `min.insync.replicas=2` và `unclean.leader.election.enable=false`."
        ],
        answer: 3,
        walkthrough: {
          keyword: "topic 24 Partitions trên 3 Brokers, replication.factor=3 ... tin nhắn cùng tài khoản bị đảo thứ tự + mất 9 bản tin khi khởi động lại Leader vì acks=1",
          whyCorrect: "Chào bạn, câu này tóm gọn trọn vẹn kiến thức cốt lõi nhất để vận hành **Apache Kafka cấp độ Tài chính (Financial-grade Kafka)**! **Thứ nhất — Thứ tự sự kiện:** Kafka chỉ đảm bảo thứ tự nghiêm ngặt **bên trong phạm vi từng Partition**, không đảm bảo thứ tự xuyên qua nhiều Partitions. Chúng ta KHÔNG cần giao dịch của ông A phải xếp thứ tự với bà B, mà chỉ cần mọi biến động của **riêng tài khoản ông A** giữ đúng thứ tự trước-sau! Truyền `accountId` làm `key` (`kafkaTemplate.send(topic, accountId, payload)`) giúp hàm băm `murmur2(accountId) % 24` luôn đưa 100% sự kiện của tài khoản đó vào cùng 1 Partition, vừa đúng thứ tự tuyệt đối vừa ăn trọn sức mạnh xử lý song song của 24 Partitions! **Thứ hai — Không mất dữ liệu & Không đảo thứ tự khi retry:** Với `acks=1`, Leader vừa ghi vào bộ nhớ đệm của riêng nó đã báo OK, nếu nó sập tích tắc trước khi Follower kịp chép sang thì mất trắng bản tin! Bộ tứ bất khả xâm phạm của ngân hàng là: `replication.factor=3` + `min.insync.replicas=2` + `acks=all` (ít nhất 2 Broker đồng bộ xác nhận đã ghi an toàn) + `enable.idempotence=true` (gắn Sequence Number chống ghi trùng lẫn chống đảo thứ tự khi mạng retry với tối đa 5 gói in-flight) + `unclean.leader.election.enable=false`!",
          whyWrong: [
            "Ép toàn bộ 6.000 TPS của cả ngân hàng vào 1 Partition duy nhất sẽ khóa cứng tối đa chỉ 1 Consumer trong nhóm được phép đọc, gây nghẽn cổ chai nghiêm trọng phá vỡ SLA < 2 giây; còn `acks=0` là chế độ 'bắn và quên' mất dữ liệu nhiều nhất.",
            "Chờ 60 giây trên RAM làm vi phạm hoàn toàn SLA thông báo biến động số dư `< 2 giây` trong đề bài và mất sạch hàng chờ nếu Pod Notification khởi động lại.",
            "`unclean.leader.election.enable=true` cho phép một Follower bị tụt hậu dữ liệu nhảy lên làm Leader xóa sạch các bản tin đã commit trước đó; còn tắt idempotence mà để `in.flight=20` sẽ làm đảo lộn thứ tự bản tin ngay khi gói thứ nhất bị lỗi mạng retry!",
            ""
          ],
          tip: "Thuộc nằm lòng công thức **Kafka Ngân hàng chuẩn**: **`Partition Key = accountId`** (đúng thứ tự từng tài khoản) + **`acks=all` + `enable.idempotence=true` + `RF=3` + `min.insync.replicas=2` + `unclean.leader.election=false`**!"
        }
      },
      {
        id: "R2-06",
        domain: "Kafka & Outbox",
        lessonId: "M3",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR2,
        question: "Trong giai đoạn đầu phát triển VietPayCore, hàm hạch toán viết trực tiếp `ledgerRepo.save(entry); kafkaTemplate.send('ledger.events', event);` bên trong một `@Transactional`. Đội kiểm toán phát hiện hai sự cố lệch dữ liệu: (1) Đôi khi PostgreSQL vừa commit xong thì Pod bị mạng chập chờn không gửi được lên Kafka khiến dịch vụ Tích điểm & Thông báo bị mất sự kiện (hoặc ngược lại `send()` chạy xong trước nhưng câu lệnh commit DB ở mili-giây cuối bị lỗi làm phát tán sự kiện ma!); (2) Khi chuyển sang dùng tiến trình đọc bảng Outbox đẩy lại tin lúc mạng chập chờn, dịch vụ Tích điểm nhận bản tin 2 lần và cộng đúp điểm thưởng cho khách! Kiến trúc đầu-cuối nào giải quyết triệt để 100% cả hai phía?",
        options: [
          "Bật giao dịch phân tán XA / Two-Phase Commit (2PC) khóa đồng bộ cùng lúc cả PostgreSQL lẫn cụm Kafka Broker trên mọi lệnh chuyển tiền 6.000 TPS.",
          "Kết hợp cặp mẫu **Transactional Outbox** ở phía phát và **Idempotent Consumer (Inbox Pattern)** ở phía nhận: Phía phát ghi đồng thời bản ghi `ledger_entries` VÀ bản ghi `outbox_events` (có `event_id` duy nhất) trong CÙNG một giao dịch ACID cục bộ của PostgreSQL, sau đó dùng Debezium CDC (đọc WAL) hoặc Outbox Poller đẩy lên Kafka theo cơ chế At-least-once; Phía nhận (Tích điểm) chèn `event_id` vào bảng `processed_inbox` có ràng buộc `UNIQUE (event_id)` trong cùng giao dịch cộng điểm để tự động loại bỏ mọi bản tin trùng lặp.",
          "Đảo thứ tự gọi `kafkaTemplate.send(...).get()` chờ Kafka nhận xong xuôi rồi mới gọi `ledgerRepo.save(entry)` mà không cần bảng Outbox hay bảng Inbox.",
          "Bỏ qua Kafka và cho dịch vụ Tích điểm mở kết nối JDBC trực tiếp chọc sang đọc trộm bảng `ledger_entries` của dịch vụ Sổ cái mỗi 100 mili-giây."
        ],
        answer: 1,
        walkthrough: {
          keyword: "ledgerRepo.save() + kafkaTemplate.send() bị lệch Dual-Write ... tiến trình Outbox gửi lại làm dịch vụ Tích điểm cộng đúp 2 lần",
          whyCorrect: "Chào em, đây là bức tranh hoàn chỉnh từ A đến Z về giao tiếp bất đồng bộ tin cậy trong Microservices! Lỗi gọi trực tiếp cả DB lẫn Kafka trong một hàm gọi là **Dual-Write Anti-Pattern**: hai hệ thống hạ tầng rời nhau không thể đảm bảo commit nguyên tử chỉ bằng `@Transactional` của DB. **Transactional Outbox** biến bài toán ghi lên 2 hệ thống thành ghi vào 2 bảng (`ledger_entries` + `outbox_events`) nằm trong **cùng 1 Database, cùng 1 ACID Transaction**: hễ bút toán có mặt trên sổ cái thì chắc chắn 100% sự kiện có mặt trong `outbox_events`; hễ sổ cái rollback thì `outbox_events` cũng biến mất sạch sẽ! Tiếp theo, vì tiến trình Relay / Debezium đẩy từ Outbox lên Kafka hoạt động theo ngữ nghĩa **At-least-once** (nếu đẩy xong mà rớt mạng chưa kịp nhận ACK thì sẽ đẩy lại lần 2), mọi Consumer tài chính ở đầu bên kia BẮT BUỘC phải là **Idempotent Consumer**! Ghi `INSERT INTO processed_inbox(event_id, processed_at) VALUES (:eventId, now())` có khóa `UNIQUE` chung giao dịch với lệnh cộng điểm giúp lần nhận trùng thứ 2 bị chặn ngay lập tức, đạt hiệu quả tương đương *Effectively-Once* đầu-cuối!",
          whyWrong: [
            "Kafka không hỗ trợ chuẩn JTA/XA 2PC cổ điển ghép chung với PostgreSQL JDBC, và giao thức khóa 2 pha liên hệ thống sẽ bóp nghẹt hoàn toàn thông lượng 6.000 TPS.",
            "",
            "Gửi Kafka xong rồi mới lưu DB vẫn dính nguyên lỗi Dual-Write theo chiều ngược lại: Kafka đã nhận và dịch vụ Tích điểm đã cộng tiền thưởng xong, nhưng bước `ledgerRepo.save()` ngay sau đó lại lỗi mạng/ràng buộc DB làm rollback giao dịch gốc -> ngân hàng mất tiền thưởng khống!",
            "Cho microservice khác chọc thẳng vào bảng nội bộ của Sổ cái phá nát nguyên lý đóng gói Database-per-Service (Shared Database coupling) và dồn tải quét liên tục lên Primary DB."
          ],
          tip: "Công thức bất bại cho **Event-Driven Microservices Ngân hàng**: **Đầu phát dùng `Transactional Outbox` (chống mất/thừa sự kiện ma)** + **Đầu nhận dùng `Idempotent Inbox UNIQUE(event_id)` (chống xử lý đúp khi Kafka phát lại At-least-once)**!"
        }
      },
      {
        id: "R2-07",
        domain: "Saga, Resilience & Batch",
        lessonId: "M4",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR2,
        question: "Trong luồng Thanh toán Hóa đơn Điện lực trên VietPayCore điều phối bởi **Saga Orchestrator**: Bước 1 phong tỏa số tiền thanh toán trên ví khách hàng (`HOLD` / hạch toán tài khoản trung gian), Bước 2 gọi cổng Nhà cung cấp Điện lực để gạch nợ mã khách hàng điện, Bước 3 tất toán. Khi Bước 2 trả về mã lỗi xác nhận rõ ràng từ phía Điện lực là `CUSTOMER_CODE_LOCKED` (hóa đơn không thể gạch nợ, chưa thu tiền), một lập trình viên viết hàm bù trừ Saga bằng câu lệnh `DELETE FROM ledger_entries WHERE saga_id = :id` và sửa đè cột số tiền giao dịch gốc về `0`. Vì sao Hội đồng Kiểm toán Nội bộ bác bỏ thẳng thừng cách làm này và yêu cầu sửa như thế nào?",
        options: [
          "Sổ cái kế toán ngân hàng tuân thủ nguyên tắc **Bất biến Chỉ ghi nối thêm (Immutable Append-Only Ledger)**: nghiêm cấm tuyệt đối lệnh `DELETE` hoặc `UPDATE` xóa dấu vết bút toán đã phát sinh! Khi nhận phản hồi từ chối tường minh từ đối tác, Saga Orchestrator phải thực thi **Giao dịch Bù trừ (Compensating Transaction)** bằng cách giữ nguyên bút toán gốc để lưu vết kiểm toán, đồng thời sinh mới một **Bút toán Đảo chiều / Giải tỏa tạm giữ (Reversal / Release-Hold Entry)** có cùng số tiền theo chiều Nợ/Có ngược lại gắn mã tham chiếu tới giao dịch gốc, rồi chuyển trạng thái Saga sang `COMPENSATED`.",
          "Hội đồng bác bỏ chỉ vì lệnh `DELETE` chạy chậm hơn lệnh `TRUNCATE TABLE ledger_entries`; nên gom các giao dịch lỗi lại xóa trắng bảng vào cuối tuần.",
          "Thay vì xóa bản ghi, chỉ cần đổi `account_id` trên dòng bút toán lỗi đó sang một tài khoản rác `account_id = -999` để khách hàng không nhìn thấy trên sao kê.",
          "Trong kiến trúc Saga không bao giờ được phép hoàn lại tiền cho khách bằng tự động hóa mà phải bắt khách hàng mang căn cước công dân ra quầy viết giấy tay cho mọi lỗi nhập sai mã hóa đơn điện."
        ],
        answer: 0,
        walkthrough: {
          keyword: "Saga Orchestrator ... Nhà cung cấp Điện lực trả về từ chối rõ ràng ... lập trình viên chạy DELETE FROM ledger_entries và sửa đè về 0",
          whyCorrect: "Chào bạn, hãy khắc cốt ghi tâm câu nói của các Kế toán trưởng Ngân hàng: **'Bút sa gà chết — trong Sổ cái Kế toán không bao giờ tồn tại cục tẩy!'**. Nếu cho phép ứng dụng chạy quyền `DELETE` hoặc `UPDATE amount = 0` trên bảng `ledger_entries`, toàn bộ chuỗi đối chiếu kiểm toán (Audit Trail), tổng phát sinh trong kỳ và chữ ký băm chống sửa đổi đều bị phá hủy, mở toang cánh cửa cho gian lận nội bộ xóa dấu vết rút tiền! Trong kiến trúc **Saga Pattern** kết hợp **Semantic Lock (`HOLD`)**: ở Bước 1 ta giữ tiền (giảm `available_balance` hoặc ghi bút toán Nợ khách hàng / Có tài khoản treo trung gian); khi Bước 2 nhận kết quả **từ chối xác định (Definitive Business Rejection)** từ đối tác, bước **Compensating Transaction** sẽ ghi nối thêm một chứng từ hoàn đảo chiều mới (Nợ tài khoản treo trung gian / Có lại khách hàng hoặc nhả `HOLD`) tham chiếu rõ `original_txn_id`. Nhìn vào sao kê nội bộ thấy rõ ràng cả hai bước 'Tạm giữ -> Hoàn trả do đối tác từ chối', tổng số dư khách quay về nguyên vẹn 100% và kiểm toán minh bạch tuyệt đối!",
          whyWrong: [
            "",
            "`TRUNCATE TABLE ledger_entries` xóa bay toàn bộ 2,2 tỷ bút toán tài sản của 15 triệu khách hàng — đó là thảm họa xóa sổ cả ngân hàng!",
            "Sửa trộm `account_id` của bút toán đã ghi sang tài khoản giả làm lệch cân đối kế toán giữa tài khoản khách hàng với tài khoản tổng hợp GL và vi phạm nghiêm trọng luật kế toán ngân hàng.",
            "Khi đối tác đã trả về mã lỗi **từ chối tường minh** (chắc chắn 100% chưa gạch nợ bên đối tác), Saga hoàn toàn phải tự động bù trừ giải tỏa tiền ngay lập tức trong vài chục mili-giây cho khách hàng (chỉ những ca Timeout không rõ trạng thái mới treo chờ tra soát!)."
          ],
          tip: "Luật bất biến của **Saga Compensation trong Tài chính - Ngân hàng**: **Compensation != `DELETE` bản ghi cũ**; **Compensation == Ghi thêm một Bút toán Đảo chiều (Reversal/Offsetting Posting) mới tinh ngược dấu Nợ/Có**!"
        }
      },
      {
        id: "R2-08",
        domain: "Saga, Resilience & Batch",
        lessonId: "M5",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: caseStudyR2,
        question: "CÂU HỎI BẪY SỐ 1 VÒNG PHỎNG VẤN PAYMENT GATEWAY! Khi dịch vụ Chuyển tiền 24/7 của VietPayCore gửi bản tin hạch toán sang cổng chuyển mạch liên ngân hàng NAPAS, kết nối rơi vào tình trạng quá hạn đọc `SocketTimeoutException: Read timed out` sau 15 giây chờ đợi. Một lập trình viên cấu hình Resilience4j gắn đồng thời `@Retry(maxAttempts = 3)` (mỗi lần thử lại sinh một mã giao dịch `stan/traceId` mới tinh) VÀ `@CircuitBreaker(fallbackMethod = 'refundToSenderImmediately')` tự động hoàn tiền ngay vào ví người gửi khi hết lượt thử. Hậu quả thảm khốc nào sẽ xảy ra ngoài đời thực và quy trình xử lý chuẩn duy nhất của ngân hàng là gì?",
        options: [
          "Cấu hình trên hoàn toàn an toàn vì `SocketTimeoutException` chứng minh chắc chắn 100% gói tin chưa bao giờ rời khỏi card mạng của máy chủ VietPayCore.",
          "Chỉ cần bỏ `@CircuitBreaker` nhưng giữ nguyên `@Retry(maxAttempts = 10)` sinh mã giao dịch mới liên tục cho tới khi nhận được HTTP 200 là đảm bảo khách nhận đúng 1 lần tiền.",
          "Lỗi `ReadTimeout` sau khi đã gửi yêu cầu đi mang bản chất **Trạng thái Không xác định (Unknown / Ambiguous State)** — ngân hàng đích có thể ĐÃ CỘNG TIỀN thành công cho người nhận chỉ là gói tin phản hồi về bị đứt mạng! Tự động Retry bằng mã giao dịch mới sẽ gây **chuyển tiền trùng 2–3 lần**, còn Fallback tự động hoàn tiền ngay lập tức sẽ khiến ngân hàng **mất trắng tiền kép** (người nhận đã rút tiền ở ngân hàng bạn, người gửi lại được hoàn tiền rút nốt ở VietPayCore!). Quy trình chuẩn: **TUYỆT ĐỐI KHÔNG tự hoàn tiền ngay và KHÔNG retry sinh lệnh mới khi ReadTimeout**; phải giữ khoản tiền ở trạng thái treo đối soát (`PENDING` / `SUSPENSE GL`), kích hoạt luồng **Truy vấn Trạng thái (Status Inquiry)** bằng chính mã gốc, và nếu vẫn chưa rõ thì chờ phiên **Đối soát tự động T+0/T+1** phân xử, đồng thời bọc cổng bằng `@Bulkhead` cô lập luồng.",
          "Khi gặp `ReadTimeout`, hệ thống nên tự động cộng tiền cho người nhận và đồng thời cộng hoàn tiền luôn cho người gửi, phần chênh lệch hạch toán vào chi phí Marketing của ngân hàng."
        ],
        answer: 2,
        walkthrough: {
          keyword: "gửi bản tin hạch toán sang NAPAS bị SocketTimeoutException: Read timed out ... gắn @Retry sinh mã mới + fallbackMethod tự động hoàn tiền ngay",
          whyCorrect: "Chào em, nếu đi phỏng vấn Senior Java cho bất kỳ Ngân hàng hay Ví điện tử nào tại Việt Nam mà trả lời sai câu này thì trượt ngay từ vòng gửi xe dù code giỏi đến mấy! Hãy phân biệt sắc lẹm hai loại lỗi mạng: `ConnectTimeoutException` (chưa bắt tay TCP xong -> gói tin chưa đi) khác hoàn toàn với **`SocketTimeoutException: Read timed out`** (đã bắn toàn bộ lệnh chuyển 500 triệu qua cáp quang sang đối tác rồi, đối tác đã chuyển xong và cộng 500 triệu vào tài khoản người nhận ở ngân hàng B rồi, chỉ đúng lúc gửi bản tin trả lời quay về thì rớt mạng!). Trong trạng thái mù mờ (**Indoubt / Unknown State**) này: (1) Nếu Retry với mã STAN mới -> chuyển bay mất 1,5 tỷ (3 lần × 500 triệu)! (2) Nếu Fallback tự hoàn 500 triệu ngay về ví người gửi -> kẻ gian thông đồng giữa người gửi và người nhận rút sạch cả 2 đầu, ngân hàng đền tiền tươi ngay trong đêm! Chuẩn nghiệp vụ NAPAS IBFT 24/7 / ISO 8583 bắt buộc: giữ nguyên tiền trên tài khoản treo **Suspense Account (`PENDING_INVESTIGATION`)**, thông báo cho khách 'Giao dịch đang được tra soát với ngân hàng thụ hưởng', bắn bản tin **Inquiry / Investigation** hỏi lại trạng thái của đúng mã gốc đó; chỉ hoàn tiền khi đối tác xác nhận rõ ràng giao dịch gốc KHÔNG tồn tại hoặc qua file **Đối soát T+0/T+1**!",
          whyWrong: [
            "Nhầm lẫn tai hại giữa `ConnectTimeout` và `ReadTimeout`: khi dính `ReadTimeout`, toàn bộ request HTTP/ISO đã được ghi ra socket gửi sang phía bên kia từ lâu rồi.",
            "Retry lệnh chuyển tiền bằng mã giao dịch mới là cơn ác mộng nhân bản bút toán làm thất thoát hàng chục tỷ đồng chỉ trong vài phút nghẽn mạng.",
            "",
            "Không một ngân hàng nào trên thế giới tồn tại nổi 1 ngày nếu lấy ngân sách đi tặng tiền gấp đôi cho mọi giao dịch bị nghẽn mạng!"
          ],
          tip: "Khắc lên bàn làm việc câu thần chú ngành Thanh toán: **'Gặp `ReadTimeout` ở bước Trừ/Chuyển tiền = Trạng thái UNKNOWN -> CẤM Auto-Refund ngay, CẤM Retry sinh mã mới -> Treo `PENDING/SUSPENSE` + Gọi `Inquiry` tra soát mã gốc + Đối soát T+0/T+1!'**"
        }
      },
      {
        id: "R2-09",
        domain: "Saga, Resilience & Batch",
        lessonId: "M6",
        difficulty: "Thực chiến Senior",
        caseStudy: caseStudyR2,
        question: "Cuối ngày, VietPayCore phải chạy lô **Spring Batch** tính và hạch toán lãi không kỳ hạn (EOD Interest Accrual) cho **15 triệu tài khoản** gọn trong khung 45 phút (00:15 – 01:00). Thử nghiệm trước đó cho thấy: dùng `findAll()` nổ OOM ngay ở phút đầu tiên; còn dùng `JdbcPagingItemReader` đơn luồng phân trang bằng `LIMIT 1000 OFFSET ...` thì 1 triệu dòng đầu chạy rất nhanh nhưng tới dòng thứ 10 triệu chậm như rùa bò mất tổng cộng hơn 4 giờ, và nếu ở phút thứ 30 Pod bị khởi động lại thì chạy lại từ đầu có nguy cơ cộng lãi đúp 2 lần cho các tài khoản đầu! Thiết kế Spring Batch nào chinh phục trọn vẹn bài toán 15 triệu tài khoản trong 45 phút?",
        options: [
          "Tăng Heap của một Pod duy nhất lên 256GB RAM để nạp hết 15 triệu đối tượng `Account` bằng `JpaRepository.findAll()`, tính lãi bằng vòng lặp `for` rồi gọi `saveAll()` trong duy nhất 1 giao dịch DB khổng lồ dài 45 phút.",
          "Thiết kế **Partitioned Step** chia dải `account_id` (`minId..maxId`) thành 16–32 phân đoạn chạy song song trên các Worker; bên trong mỗi phân đoạn dùng **Keyset/Seek `JdbcPagingItemReader`** (hoặc `JdbcCursorItemReader` stream con trỏ, lọc `WHERE id >= :min AND id <= :max AND id > :lastSeenId ORDER BY id ASC LIMIT 2000` không dùng `OFFSET`), xử lý theo lô `chunk(2000)` kết hợp **JDBC Batch Insert / Bulk Update**, lưu tiến độ vào `JobRepository` để tự động chạy tiếp từ chunk dở dang và đặt ràng buộc lũy đẳng `UNIQUE (account_id, accrual_date)` chống cộng lãi đúp tuyệt đối.",
          "Dùng `@Scheduled(cron = '0 15 0 * * *')` bắn đồng loạt 15 triệu message HTTP REST tự gọi vòng lại chính API chuyển khoản lẻ thông thường cùng một giây.",
          "Chạy một câu lệnh `UPDATE accounts SET balance = balance * 1.0001` khóa độc quyền toàn bộ bảng 15 triệu tài khoản suốt 30 phút mà không sinh bất kỳ dòng bút toán chi tiết nào vào `ledger_entries`."
        ],
        answer: 1,
        walkthrough: {
          keyword: "Spring Batch tính lãi cuối ngày 15 triệu tài khoản trong 45 phút ... OFFSET chậm ở dòng thứ 10 triệu + chống cộng lãi đúp khi sập Pod chạy lại",
          whyCorrect: "Chào bạn, hãy làm một phép tính năng lực (Capacity Math) chuẩn Senior ngay tại đây: `15.000.000 tài khoản / (45 phút × 60 giây) ≈ 5.556 tài khoản/giây`! Một luồng đơn lẻ tuần tự kèm `OFFSET` (độ phức tạp `O(N^2)` tổng thể vì mỗi trang sau lại quét bỏ hàng triệu dòng đầu) không bao giờ kịp giờ mở cửa phiên sáng! Kiến trúc **Spring Batch chuẩn Core Banking** giải bài toán này bằng 4 trụ cột: **(1) Partitioning theo dải ID (`minId..maxId`):** Chia 15 triệu tài khoản thành 20 dải ID độc lập không trùng lặp giao cho 20 luồng/Pod Worker cày song song (mỗi luồng chỉ cần đạt ~280 dòng/giây — quá nhẹ nhàng!); **(2) Keyset Paging (`WHERE id > :lastId`):** Mỗi lần đọc 2.000 dòng nhảy thẳng trên Clustered/Primary B-Tree Index tốn `< 2ms` từ dòng đầu tiên tới dòng thứ 15 triệu không hề suy giảm tốc độ; **(3) Chunk Commit (`chunk = 2000`) + JDBC Batch:** Giữ giao dịch DB ngắn gọn, ghi tiến độ `ExecutionContext` sau mỗi 2.000 dòng vào `BATCH_STEP_EXECUTION_CONTEXT` để lỡ sập ở triệu thứ 9 thì bật lên chạy tiếp đúng từ chunk đó; **(4) Idempotent Guard `UNIQUE (account_id, accrual_date)`:** Dù kịch bản xấu nhất chạy lại một đoạn cũng không bao giờ cộng lãi 2 lần trong cùng 1 ngày!",
          whyWrong: [
            "Một giao dịch DB khổng lồ ôm khóa 15 triệu tài khoản suốt 45 phút sẽ làm tê liệt hoàn toàn khả năng chuyển tiền 24/7 ban đêm của toàn ngân hàng, làm tràn WAL và chỉ cần lỗi dòng cuối là rollback công cốc cả 45 phút!",
            "",
            "Dội bom 15 triệu HTTP request cùng lúc vào cổng API online tự gây DDoS đánh sập chính hệ thống giao dịch trực tuyến ban đêm của khách hàng.",
            "Sửa thẳng cột `balance` mà không ghi bút toán `ledger_entries` vi phạm luật Kế toán Kép (tiền tự mọc ra không chứng từ, không tính thuế/sao kê được) và khóa toàn bảng 15 triệu dòng làm chết giao dịch 24/7."
          ],
          tip: "Gặp bài toán **Spring Batch hàng chục triệu bản ghi (EOD Tính lãi / Sao kê / Đối soát)**: Nêu ngay bộ tứ **`Range Partitioning (chia dải ID song song)` + `Keyset Reader (cấm OFFSET)` + `Chunk + JDBC Batch Writer` + `Idempotent UNIQUE(account_id, business_date)`**!"
        }
      },
      {
        id: "R2-10",
        domain: "PostgreSQL & Locking",
        lessonId: "D1",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Một bảng `merchant_wallets` chỉ chứa đúng 1,5 triệu điểm bán hàng (dung lượng dữ liệu thực tế chỉ khoảng 350MB), nhưng sau ngày hội siêu giảm giá cuối tuần có hàng chục triệu lượt cập nhật số dư, dung lượng vật lý trên ổ cứng của bảng này phình to bất thường lên tới **42GB**, CPU của PostgreSQL chạm 95% và mọi câu truy vấn theo khóa chính chậm đi gấp 12 lần! Kiểm tra bảng `pg_stat_activity` phát hiện một phiên làm việc của công cụ báo cáo mở lệnh `BEGIN;` từ 11 tiếng trước rồi bỏ quên ở trạng thái `idle in transaction`. Hãy giải thích cơ chế nội tại của PostgreSQL gây ra thảm họa này và cách xử lý triệt để!",
        options: [
          "Do PostgreSQL lưu trữ toàn bộ lịch sử 10 năm trong cùng trang nhớ RAM nên chỉ cần khởi động lại ứng dụng Java mà không cần đụng tới phiên `idle in transaction` trên Database.",
          "Do tiến trình báo cáo đó đang chiếm giữ khóa độc quyền `ACCESS EXCLUSIVE LOCK` chặn không cho bất kỳ lệnh `UPDATE` nào chạy suốt 11 tiếng.",
          "Do PostgreSQL không có cơ chế tự động thu dọn rác nên bắt buộc DBA phải chạy lệnh `VACUUM FULL merchant_wallets` vào giữa giờ cao điểm buổi trưa mỗi ngày.",
          "Theo kiến trúc **MVCC (Multi-Version Concurrency Control)** của PostgreSQL, mỗi lệnh `UPDATE` không ghi đè tại chỗ mà tạo ra một bản ghi tuple phiên bản mới và đánh dấu bản cũ là **Dead Tuple**; tuy nhiên một phiên nằm chết ở trạng thái `idle in transaction` suốt 11 tiếng sẽ giữ chặt mốc giao dịch cổ nhất (`xmin horizon`), ngăn cản hoàn toàn tiến trình **Autovacuum** thu hồi bất kỳ Dead Tuple nào sinh ra sau thời điểm đó (gây phình trương **Table & Index Bloat** lên 42GB)! Cần ngắt phiên treo, cấu hình chốt chặn `idle_in_transaction_session_timeout = '30s'`, tinh chỉnh `autovacuum_vacuum_scale_factor` nhỏ hơn (như `0.01`) cho bảng cập nhật nóng và tách báo cáo sang Read Replica."
        ],
        answer: 3,
        walkthrough: {
          keyword: "bảng 350MB phình lên 42GB sau hàng chục triệu lượt UPDATE ... pg_stat_activity có phiên treo ở trạng thái idle in transaction 11 tiếng",
          whyCorrect: "Chào em, ai giải thích trôi chảy cơ chế **MVCC + `xmin` Horizon + Autovacuum Bloat** này trước mặt DBA / Principal Architect là được đánh giá trình độ Senior cứng cựa ngay lập tức! Khác với Oracle/MySQL dùng Undo Log tách riêng, **PostgreSQL lưu các phiên bản tuple cũ và mới ngay trong chính file Heap của bảng**: mỗi lần ví merchant nhận thanh toán chạy `UPDATE`, Postgres sinh ra 1 tuple mới tinh và đánh dấu `xmax` cho tuple cũ thành xác chết (**Dead Tuple**). Bình thường **Autovacuum** chạy ngầm dọn các Dead Tuple này để tái sử dụng chỗ trống. NHƯNG nếu có một gã mở giao dịch từ 11 giờ sáng rồi vứt đấy (`idle in transaction`), PostgreSQL nghĩ rằng 'nhỡ đâu gã đó vẫn cần nhìn thấy snapshot dữ liệu cũ từ 11 giờ sáng thì sao?', nên mốc `xmin horizon` bị đóng đinh tại 11 tiếng trước -> **Autovacuum bị trói tay không dọn được bất kỳ xác tuple nào suốt 11 tiếng**! Hàng chục triệu xác chết chất đống thành 42GB rác khiến cả Index lẫn Heap phải lội qua hàng trăm trang chết mới tìm thấy 1 dòng sống! Bật `idle_in_transaction_session_timeout = '30s'` trên PostgreSQL là lá chắn sống còn cho mọi hệ thống ngân hàng!",
          whyWrong: [
            "Khởi động lại ứng dụng Java của cổng thanh toán không đóng được kết nối đang treo từ công cụ báo cáo khác, và 42GB Dead Tuples nằm trên đĩa của PostgreSQL vẫn còn nguyên.",
            "Nếu giữ `ACCESS EXCLUSIVE LOCK` thì toàn bộ giao dịch đã bị chặn đứng ngay từ phút đầu tiên chứ không thể chạy được hàng chục triệu lượt `UPDATE` làm phình bảng.",
            "Chạy `VACUUM FULL` (khác với `VACUUM` thường) sẽ chiếm khóa độc quyền `ACCESS EXCLUSIVE` viết lại toàn bộ bảng 42GB, làm treo chết cứng 100% giao dịch của ngân hàng suốt hàng chục phút giữa trưa!",
            ""
          ],
          tip: "Nhớ mối liên hệ sinh tử của PostgreSQL: **Cập nhật nhiều (`UPDATE` liên tục trên bảng Ví) -> Sinh lắm `Dead Tuples` (MVCC) -> Gặp phiên treo `idle in transaction` giữ `xmin` -> Chết đứng `Autovacuum` -> Phình bảng `Table Bloat` làm sập hiệu năng**! Luôn đặt `idle_in_transaction_session_timeout`!"
        }
      },
      {
        id: "R2-11",
        domain: "PostgreSQL & Locking",
        lessonId: "D1",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Bạn đang đọc kết quả `EXPLAIN (ANALYZE, BUFFERS)` của một câu truy vấn đối soát đang chạy mất 11,2 giây trên bảng `interbank_txns` (120 triệu dòng, đã đánh sẵn B-Tree Index `idx_ib_created_at` trên cột `created_at`): câu truy vấn viết `SELECT id, amount, rrn FROM interbank_txns WHERE DATE(created_at) = '2026-11-15'` và kết quả EXPLAIN báo `Parallel Seq Scan on interbank_txns ... Buffers: shared hit=12040 read=915000`. Cùng lúc đó, một kỹ sư đề xuất tắt `fsync = off` trong `postgresql.conf` để tăng gấp đôi tốc độ ghi bút toán giờ cao điểm. Nhận định và quyết định nào của bạn là chuẩn xác?",
        options: [
          "Việc bọc hàm `DATE(created_at)` quanh cột đã đánh Index làm biểu thức trở nên **Non-SARGable** khiến PostgreSQL không thể tra cứu trên cây B-Tree `idx_ib_created_at` mà phải quét tuần tự toàn bảng đọc gần 915.000 trang đĩa (~7,3GB I/O!) — cần viết lại thành khoảng nửa mở `WHERE created_at >= '2026-11-15 00:00:00' AND created_at < '2026-11-16 00:00:00'` để ăn trọn **Index Scan** trong vài mili-giây; đồng thời **BÁC BỎ TUYỆT ĐỐI** đề xuất `fsync = off` vì khi mất điện hoặc Kernel panic, các giao dịch đã báo thành công cho khách chưa kịp ghi từ OS Page Cache xuống đĩa WAL sẽ mất trắng và làm hỏng (corrupt) toàn bộ cụm CSDL!",
          "Câu truy vấn chậm là do `Parallel Seq Scan` dùng quá ít CPU; cần giữ nguyên `DATE(created_at)` nhưng tăng `max_parallel_workers_per_gather = 64` và đồng ý bật `fsync = off` vì PostgreSQL đã có bản sao trên RAM.",
          "Chỉ số `Buffers: read=915000` nghĩa là PostgreSQL đang đọc hoàn toàn từ bộ nhớ đệm L1 Cache của CPU rất tối ưu, chỉ cần xóa Index `idx_ib_created_at` đi là câu lệnh giảm xuống dưới 1ms.",
          "Hàm `DATE(...)` chỉ làm chậm trên Oracle chứ không ảnh hưởng tới B-Tree Index của PostgreSQL; nguyên nhân duy nhất là thiếu từ khóa `ORDER BY RANDOM()` ở cuối câu truy vấn."
        ],
        answer: 0,
        walkthrough: {
          keyword: "WHERE DATE(created_at) = '2026-11-15' trên cột có Index idx_ib_created_at bị Parallel Seq Scan (read=915000) ... đề xuất tắt fsync = off",
          whyCorrect: "Chào bạn, đọc thành thạo `EXPLAIN (ANALYZE, BUFFERS)` và bảo vệ tính bền vững ACID (`Durability`) là hai phẩm chất bắt buộc của Senior Backend! **Ý thứ nhất:** Cây B-Tree `idx_ib_created_at` sắp xếp các giá trị gốc `timestamp`. Khi bạn bọc cột đó vào bất kỳ hàm hay phép tính nào như `DATE(created_at)`, `EXTRACT(YEAR FROM created_at)` hay `LOWER(code)` (mà không có Expression Index tương ứng), bộ tối ưu hóa không thể tra cây B-Tree được nữa mà đành quét cạn từng dòng trên đĩa (`Seq Scan`, với `read=915000 × 8KB ≈ 7,3GB` đọc từ đĩa/OS!). Chỉ cần đổi sang dạng giữ nguyên cột trần bên vế trái `created_at >= '2026-11-15 00:00:00' AND created_at < '2026-11-16 00:00:00'`, PostgreSQL nhảy thẳng vào nhánh B-Tree đọc vài trăm trang xong ngay! **Ý thứ hai:** Chữ **D (Durability)** trong ACID của PostgreSQL sống nhờ quy tắc **Write-Ahead Logging (WAL) + `fsync = on`**: giao dịch chỉ báo `COMMIT` thành công khi bản ghi WAL đã thực sự ép xuống đĩa vật lý không bay hơi. Đặt `fsync = off` chẳng khác nào tháo phanh xe tải lao đèo — sập nguồn một cái là không chỉ mất giao dịch tiền đã báo thành công mà còn rách trang dữ liệu (torn pages) không thể khởi động lại PostgreSQL!",
          whyWrong: [
            "",
            "Đốt 64 nhân CPU để đọc 7,3GB đĩa cho một câu lệnh đáng lẽ chỉ cần đọc vài MB qua Index sẽ giết sạch I/O của toàn bộ giao dịch khác; còn `fsync = off` là điều cấm kỵ tuyệt đối trên mọi DB Production.",
            "Trong `BUFFERS`, `shared hit` mới là đọc trúng RAM Shared Buffers của Postgres, còn `read=915000` là bị trượt bộ đệm phải gọi xuống tầng đĩa/OS tốn hàng chục giây I/O!",
            "Mọi hệ quản trị CSDL quan hệ dùng B-Tree chuẩn (cả PostgreSQL, Oracle, MySQL, SQL Server) đều mất khả năng dùng B-Tree Index thông thường khi bọc hàm biến đổi trực tiếp lên cột lọc."
          ],
          tip: "Hai phản xạ đọc SQL & DB Config: **1. Không bao giờ bọc hàm `DATE(col)`, `UPPER(col)`, `col + 1` lên cột đang đánh B-Tree Index (hãy đẩy phép biến đổi sang hằng số vế phải!)**; **2. Trong `EXPLAIN (ANALYZE, BUFFERS)`, nhìn ngay vào `read` cao + `Seq Scan` để bắt thủ phạm ngốn I/O, và KHÔNG BAO GIỜ chạm tay tắt `fsync`!**"
        }
      },
      {
        id: "R2-12",
        domain: "PostgreSQL & Locking",
        lessonId: "D2",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Bảng `webhook_deliveries` lưu 400 triệu bản ghi lịch sử gửi thông báo đối tác, trong đó `99,97%` bản ghi ở trạng thái kết thúc `'DELIVERED'`, chỉ có khoảng `5.000` bản ghi đang ở trạng thái `'PENDING_RETRY'` cần tiến trình nền quét mỗi 3 giây bằng câu lệnh: `SELECT id, target_url, payload FROM webhook_deliveries WHERE status = 'PENDING_RETRY' AND next_attempt_at <= now() ORDER BY next_attempt_at ASC LIMIT 200`. Ngoài ra, trang quản trị đối tác hay lọc theo `WHERE partner_id = :pid AND event_type = :type AND created_at >= :fromDate`. Một lập trình viên đánh một Index đầy đủ toàn bảng trên `(status)` và một Composite Index theo thứ tự `(created_at, partner_id, event_type)`. Đánh giá và thiết kế lại nào chuẩn Senior DBA?",
        options: [
          "Thiết kế hiện tại đã tối ưu tuyệt đối vì cột `status` chỉ có ít giá trị phân biệt (low cardinality) nên đánh B-Tree toàn bảng 400 triệu dòng là nhẹ nhất, và đặt cột khoảng `created_at` lên đầu Composite Index giúp lọc nhanh nhất.",
          "Đổi cả hai Index sang kiểu `GIN Full-Text Search Index` để lập chỉ mục từ khóa cho toàn bộ 400 triệu dòng.",
          "Cả hai Index hiện tại đều sai nguyên lý: (1) Với câu quét hàng đợi chỉ chiếm `0,03%` dữ liệu nóng, đánh Index toàn bảng 400 triệu dòng vừa tốn chục GB vừa bắt 99,97% bản ghi `'DELIVERED'` chiếm chỗ — cần thay bằng **Partial Index** siêu nhỏ gọn `CREATE INDEX CONCURRENTLY idx_wh_pending ON webhook_deliveries (next_attempt_at ASC) WHERE status = 'PENDING_RETRY'` (chỉ chứa đúng ~5.000 dòng đang chờ, kích thước vài MB nằm gọn trong RAM!); (2) Với Composite Index có cả phép bằng (`=`) và phép khoảng (`>=`), phải đặt các cột so sánh BẰNG lên trước và cột KHOẢNG ở sau: `(partner_id, event_type, created_at DESC)`.",
          "Xóa hết mọi Index trên bảng `webhook_deliveries` và dùng Materialized View làm mới toàn bộ 400 triệu dòng mỗi 3 giây một lần."
        ],
        answer: 2,
        walkthrough: {
          keyword: "400 triệu dòng có 99,97% là 'DELIVERED', chỉ 5.000 dòng 'PENDING_RETRY' ... lọc thêm partner_id = :pid AND event_type = :type AND created_at >= :fromDate",
          whyCorrect: "Chào em, **Partial Index (Chỉ mục một phần có điều kiện `WHERE`)** chính là 'vũ khí bí mật' đáng tự hào nhất của PostgreSQL cho các bảng giao dịch / hàng đợi ngân hàng! Hãy so sánh: một Index thường trên `(status, next_attempt_at)` phải ôm trọn cả 400 triệu dòng (~12GB trên đĩa và ngốn RAM Shared Buffers vô ích cho 399,995 triệu dòng `'DELIVERED'` không bao giờ quét lại nữa!). Ngược lại, với `CREATE INDEX CONCURRENTLY idx_wh_pending ON webhook_deliveries (next_attempt_at ASC) WHERE status = 'PENDING_RETRY'`, PostgreSQL **chỉ đưa đúng 5.000 dòng đang chờ vào cây Index** (nặng vỏn vẹn **~200KB**!), và ngay khi dòng đó cập nhật thành `'DELIVERED'` nó tự rút khỏi Index này — truy vấn chạy trong **0,1 mili-giây**! Về ý thứ hai — **Quy tắc Equality trước, Range sau (ESR Rule: Equality -> Sort -> Range)**: trên cây B-Tree đa cột, ngay tại cột đầu tiên dùng điều kiện khoảng (`created_at >= :fromDate`), thứ tự các cột phía sau (`partner_id`, `event_type`) bị đứt gãy không còn xếp liền kề nhau nữa! Đặt `(partner_id, event_type, created_at DESC)` giúp thu hẹp thẳng vào đúng 1 nhánh nhỏ của đối tác + loại sự kiện đó rồi đọc trượt mượt mà theo mốc thời gian!",
          whyWrong: [
            "Ngược hoàn toàn nguyên lý B-Tree: cột có độ chọn lọc cực thấp (`status`) đánh toàn bảng cực kỳ lãng phí, còn đặt cột điều kiện khoảng (`created_at >= ...`) lên đầu Composite Index làm mất hiệu quả lọc chính xác trên các cột đứng sau nó.",
            "`GIN Index` dùng cho mảng, `JSONB` nhiều khóa động hoặc tìm kiếm văn bản toàn văn (`tsvector`), không phù hợp và chậm hơn nhiều khi ghi so với B-Tree cho truy vấn trạng thái và khoảng thời gian.",
            "",
            "`REFRESH MATERIALIZED VIEW` quét lại 400 triệu dòng tốn hàng chục phút, không bao giờ có thể làm mới mỗi 3 giây một lần!"
          ],
          tip: "Hai tuyệt chiêu Indexing giúp ghi điểm tối đa vòng Phỏng vấn Data: **1. Bảng hàng đợi/giao dịch trăm triệu dòng chỉ quét `status = 'PENDING'` -> Dùng ngay `Partial Index (WHERE status = 'PENDING')` nhỏ hơn 1.000 lần!**; **2. Composite Index luôn tuân thủ quy tắc `ESR (Equality cột '=' trước -> Sort/Range cột '>, <, BETWEEN' sau)`!**"
        }
      },
      {
        id: "R2-13",
        domain: "PostgreSQL & Locking",
        lessonId: "D3",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Bạn cần chọn cơ chế kiểm soát đồng thời chống sai lệch dữ liệu cho hai nghiệp vụ rất khác nhau trong ngân hàng: **Nghiệp vụ A** là màn hình khách hàng cá nhân tự cập nhật hạn mức thông báo cá nhân trên hồ sơ riêng (hiếm khi có 2 luồng sửa cùng lúc); **Nghiệp vụ B** là Tài khoản Thu hộ Siêu thị lớn nhận đồng thời **300 giao dịch thanh toán QR/giây** cộng/trừ liên tục trên CÙNG một dòng tài khoản! Nếu áp dụng khóa lạc quan `@Version` (Optimistic Locking của JPA) cho cả Nghiệp vụ B thì điều gì xảy ra trên Production và đâu là lựa chọn chuẩn xác cho từng nghiệp vụ?",
        options: [
          "Áp dụng `@Version` cho Nghiệp vụ B (tranh chấp cao 300 lần/giây trên 1 dòng) sẽ gây **Bão Thử lại Khóa Lạc quan (`OptimisticLockException` Retry Storm)**: trong 300 luồng cùng đọc `version = 10`, chỉ 1 luồng commit thành công lên `11` còn **299 luồng kia bị đánh trượt phải rollback và chạy lại liên tục**, làm sập thông lượng và vọt độ trễ! Cần dùng `@Version` cho Nghiệp vụ A (ít đụng độ), còn với Nghiệp vụ B dùng câu lệnh SQL cập nhật nguyên tử có điều kiện `UPDATE accounts SET balance = balance - :amt WHERE id = :id AND balance >= :amt` (hoặc Pessimistic Lock ngắn; và với tài khoản cực nóng hàng nghìn TPS thì tách ngăn **Sub-account Bucketing / Striping**).",
          "Khóa lạc quan `@Version` luôn luôn nhanh hơn mọi giải pháp khác trong mọi mức độ tranh chấp vì không bao giờ phải rollback hay thử lại trên Database.",
          "Dùng `LOCK TABLE accounts IN ACCESS EXCLUSIVE MODE` khóa cứng toàn bộ bảng tài khoản của cả ngân hàng cho cả Nghiệp vụ A lẫn Nghiệp vụ B.",
          "Bỏ cả `@Version` lẫn khóa Database, chuyển sang dùng biến `AtomicReference<BigDecimal>` trên RAM của từng Pod riêng lẻ để cộng trừ cho siêu thị."
        ],
        answer: 0,
        walkthrough: {
          keyword: "Nghiệp vụ A hiếm đụng độ vs Nghiệp vụ B 300 giao dịch/giây trên CÙNG 1 dòng tài khoản ... hậu quả khi dùng @Version Optimistic Locking cho Nghiệp vụ B",
          whyCorrect: "Chào bạn, rất nhiều ứng viên học vẹt câu 'Optimistic Lock nhanh hơn Pessimistic Lock vì không giữ khóa'! Câu đó **CHỈ ĐÚNG khi tỷ lệ đụng độ thấp (Low Contention)** như Nghiệp vụ A! Hãy tưởng tượng Nghiệp vụ B có 300 khách quét VietQR tại quầy siêu thị trong cùng 1 giây: cả 300 luồng hăm hở đọc `version = 1`, tính toán xong xuôi rồi lao vào `UPDATE ... WHERE id = 99 AND version = 1`. Người đầu tiên thắng cuộc đẩy lên `version = 2`; **299 người còn lại nhận `0 rows updated` -> nổ `OptimisticLockingFailureException` -> toàn bộ công sức rollback vứt sọt rác -> cả 299 người lại ùa vào thử lại lần 2, lần 3, lần 10**, đốt cháy sạch CPU của cả App lẫn DB mà thông lượng thực tế tụt thảm hại! Ngược lại, khi dùng câu lệnh SQL nguyên tử trực tiếp `UPDATE accounts SET balance = balance + :amt, updated_at = now() WHERE id = :id` (hoặc `AND balance >= :amt` khi trừ tiền), PostgreSQL tự xếp hàng khóa dòng mức micro-giây ngay tại tầng C engine và cả 300 giao dịch đều thành công ngay trong lần đầu tiên không tốn 1 lần rollback thừa nào! (Và nếu siêu thị/quỹ từ thiện lên tới 5.000–10.000 TPS trên 1 tài khoản, kiến trúc sư sẽ chia thành 16–32 ví con `sub_account_bucket_00..31` để nhân 32 lần thông lượng ghi!).",
          whyWrong: [
            "",
            "Khóa lạc quan không khóa lúc đọc nhưng bắt buộc đánh bại các luồng thua cuộc lúc ghi — khi tranh chấp cao, chi phí rollback + retry đắt gấp hàng chục lần khóa bi quan/nguyên tử trực tiếp.",
            "Khóa độc quyền toàn bảng (`LOCK TABLE`) khiến siêu thị A đang nhận tiền thì 15 triệu khách hàng khác trên cả nước cũng bị đứng hình không chuyển tiền được!",
            "Biến `AtomicReference` trên RAM mỗi Pod không đồng bộ giữa 40 Pod K8s và bay sạch khi Pod tắt."
          ],
          tip: "Khi phỏng vấn câu **'Khi nào chọn Optimistic Lock (`@Version`), khi nào chọn Pessimistic / Atomic SQL?'**: Trả lời dứt khoát theo **Mật độ tranh chấp trên cùng 1 bản ghi (Contention Rate)**: **Ít đụng độ -> Optimistic `@Version`; Tranh chấp cao (Ví nóng, Tồn kho, Hạch toán) -> Atomic Conditional `UPDATE` / `SELECT FOR UPDATE` (+ Sub-account Striping nếu > 1.000 TPS/dòng)**!"
        }
      },
      {
        id: "R2-14",
        domain: "PostgreSQL & Locking",
        lessonId: "D3",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Hai bài toán khóa dòng thực chiến trên PostgreSQL: **(1)** Tài khoản có `10.000.000 VNĐ`, hàm rút tiền gắn `@Transactional` (mức cô lập mặc định `READ COMMITTED` của PostgreSQL, Entity không có `@Version` và không dùng `FOR UPDATE`) viết: `Account a = repo.findById(id).get(); if (a.getBalance().compareTo(eightMillion) >= 0) { a.setBalance(a.getBalance().subtract(eightMillion)); }`. Khi 2 luồng đồng thời cùng rút `8.000.000 VNĐ`, kết quả số dư còn lại trong DB là bao nhiêu và tại sao? **(2)** Khi có 12 Pod Worker cùng quét bảng `outbox_events` lấy 100 dòng `'NEW'` để đẩy đi, mệnh đề khóa SQL nào giúp 12 Pod bốc 12 lô bản ghi hoàn toàn tách biệt mà không chờ đợi lẫn nhau cũng không bốc trùng?",
        options: [
          "Ở (1), mức `READ COMMITTED` tự động chặn luồng thứ hai nên số dư còn `2.000.000 VNĐ` và chỉ 1 luồng rút được; ở (2), dùng `SELECT ... FOR SHARE` để cả 12 Pod cùng đọc chung 100 dòng đầu tiên.",
          "Ở (1), số dư tụt xuống `-6.000.000 VNĐ` vì Hibernate tự dịch phép trừ Java thành phép trừ trên cột SQL; ở (2), dùng `SELECT DISTINCT` là tự động chia đều cho 12 Pod.",
          "Ở (1), PostgreSQL tự động văng lỗi `SerializationFailure` hủy luồng thứ hai ngay ở mức mặc định `READ COMMITTED`; ở (2), dùng `OFFSET podIndex * 100` tĩnh cố định.",
          "Ở (1), xảy ra lỗi kinh điển **Lost Update (Mất cập nhật)**: cả 2 luồng đều đọc thấy bản chụp `10.000.000 VNĐ` hợp lệ, cùng tính trên bộ nhớ Java `10tr - 8tr = 2tr` rồi lần lượt chạy `UPDATE accounts SET balance = 2000000` ghi đè lên nhau — khách rút trót lọt `16.000.000 VNĐ` nhưng tài khoản vẫn còn nguyên `+2.000.000 VNĐ` (ngân hàng mất đứt `8.000.000 VNĐ`!); ở (2), sử dụng `SELECT ... FROM outbox_events WHERE status = 'NEW' ORDER BY id ASC LIMIT 100 FOR UPDATE SKIP LOCKED` để mỗi Pod bỏ qua ngay các dòng Pod khác đang khóa và bốc tức thì 100 dòng rảnh kế tiếp."
        ],
        answer: 3,
        walkthrough: {
          keyword: "mặc định READ COMMITTED không @Version không FOR UPDATE ... tài khoản 10 triệu, 2 luồng cùng rút 8 triệu bằng a.setBalance(10tr - 8tr) ... và 12 Pod quét outbox_events không chờ nhau",
          whyCorrect: "Chào em, hãy nhìn con số đáng rùng mình ở ý (1): **Còn tệ hơn cả âm tiền, số dư trong DB vẫn dương đẹp đẽ `+2.000.000 VNĐ` trong khi kẻ gian đã cầm đi `16.000.000 VNĐ` tiền thật!** Tại sao ư? Vì ở mức mặc định `READ COMMITTED`, lệnh `SELECT` thông thường KHÔNG đặt khóa chặn đọc! Luồng 1 đọc được `10tr`, Luồng 2 đọc cũng được `10tr`. Cả hai đều vượt qua câu `if (10tr >= 8tr)` trong Java, rồi cả hai tính trên RAM của JVM ra con số hằng `2.000.000`. Khi Hibernate Dirty Checking flush ra SQL, nó phát câu lệnh gán giá trị tuyệt đối `UPDATE accounts SET balance = 2000000 WHERE id = ?` (chứ không phải `balance - 8000000`!). Luồng 1 ghi `2tr`, Luồng 2 đi sau cũng ghi đè đúng con số `2tr` lên trên -> toàn bộ vết trừ 8 triệu của Luồng 1 biến mất không tăm tích (**Lost Update**)! Còn ở ý (2), mệnh đề **`FOR UPDATE SKIP LOCKED`** của PostgreSQL là chuẩn mực vàng khi làm hàng đợi trên DB (Outbox Relay, Scheduled Retry Worker): Pod 1 khóa dòng `1..100`, Pod 2 tới cùng tích tắc nhìn thấy `1..100` đang khóa liền nhảy vọt qua không tốn 1ms chờ đợi nào để khóa và bốc ngay dòng `101..200`!",
          whyWrong: [
            "`READ COMMITTED` không hề chặn hai lệnh `SELECT` thường đọc cùng một giá trị, còn `FOR SHARE` cho phép cả 12 Pod cùng đọc chung đúng 100 dòng đầu tiên dẫn đến bắn trùng sự kiện 12 lần!",
            "Hibernate ánh xạ trạng thái đối tượng thành `SET balance = :newVal` (`2.000.000`) chứ không tự dịch toán tử `.subtract()` trên Java thành biểu thức tương đối `balance - 8000000` dưới SQL.",
            "PostgreSQL chỉ tự động phát hiện xung đột đọc-ghi kiểu này và ném lỗi `could not serialize access` khi bạn bật mức cô lập `REPEATABLE READ` hoặc `SERIALIZABLE`, còn mặc định `READ COMMITTED` cho phép ghi đè thẳng tay!",
            ""
          ],
          tip: "Ghi nhớ 2 đòn chí mạng về Khóa PostgreSQL: **1. Đọc Entity lên Java kiểm tra `if (balance >= amt)` rồi `setBalance()` trong `READ COMMITTED` không khóa = Mất tiền vì `Lost Update`!**; **2. Nhiều Pod cùng bốc việc từ bảng DB (Outbox/Queue) = Luôn dùng `FOR UPDATE SKIP LOCKED`!**"
        }
      },
      {
        id: "R2-15",
        domain: "Redis & Sharding",
        lessonId: "D4",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Một lập trình viên tự cài đặt khóa phân tán (Distributed Lock) trên Redis cho luồng Chi lương Lô Doanh nghiệp như sau: chiếm khóa bằng `SET lock:payroll:corp99 'locked' NX EX 10` (hết hạn sau 10 giây), và trong khối `finally` gọi `redisTemplate.delete('lock:payroll:corp99')`. Sáng ngày 25 trả lương, Luồng A trên Pod 1 gặp đợt GC/DB hơi chậm mất 13 giây: ở giây thứ 10 khóa tự hết hạn, Luồng B trên Pod 2 chiếm được khóa `lock:payroll:corp99` bắt đầu chạy; đúng giây thứ 13 Luồng A chạy xong nhảy vào khối `finally` gọi `.delete(...)` **xóa bay mất khóa đang giữ hợp lệ của Luồng B**, khiến Luồng C nhảy vào chạy chồng thêm lần thứ 3! Chưa kể vào đúng 09:00:00 sáng, 200 khóa cache biểu phí toàn hàng hết hạn cùng một giây gây **Cache Avalanche** dội thẳng xuống Core DB! Giải pháp kiến trúc nào xử lý chuẩn xác toàn diện?",
        options: [
          "Tăng thời gian hết hạn `EX` từ 10 giây lên 24 giờ và bỏ khối `finally` không bao giờ xóa khóa trên Redis để tránh xóa nhầm khóa của luồng khác.",
          "Khi dùng khóa phân tán Redis, giá trị khóa phải lưu định danh chủ sở hữu duy nhất (`UUID:threadId`), chỉ mở khóa bằng Lua Script kiểm tra đúng chủ sở hữu và dùng cơ chế **Watchdog tự động gia hạn TTL** khi luồng vẫn đang sống (như `Redisson RLock`); quan trọng hơn, chỉ coi Redis Lock là lớp giảm tranh chấp hiệu năng còn chốt chặn an toàn tiền tệ cuối cùng BẮT BUỘC phải có ràng buộc `UNIQUE` / khóa dòng ACID dưới PostgreSQL! Đồng thời chống **Cache Avalanche / Stampede / Penetration** bằng cộng ngẫu nhiên **TTL Jitter** (`TTL + random`), làm mới sớm bất đồng bộ (Logical Expiration / Mutex) cho khóa siêu nóng và chặn khóa rác không tồn tại bằng Validation + Bloom Filter / Null Cache ngắn.",
          "Dùng lệnh `KEYS *` quét toàn bộ Redis trước mỗi lần mở khóa để kiểm tra có Pod nào khác đang chạy chi lương hay không.",
          "Chuyển toàn bộ khóa phân tán về ghi vào một file text dùng chung qua ổ mạng SMB/FTP để không bao giờ tự hết hạn sau 10 giây."
        ],
        answer: 1,
        walkthrough: {
          keyword: "SET NX EX 10 + finally delete() làm Luồng A xóa nhầm khóa của Luồng B ở giây 13 ... cộng thêm 200 khóa hết hạn cùng giây 09:00:00 gây Cache Avalanche",
          whyCorrect: "Chào bạn, câu hỏi này gói trọn tinh hoa phân tích của Martin Kleppmann về **Distributed Lock trong Tài chính** cùng bộ ba phòng thủ Cache! Tự viết `SET NX EX 10` kèm `DEL` trần trụi dính ngay hai lỗi chết người: (1) TTL cố định quá ngắn thì hết hạn giữa chừng khi luồng còn đang chạy, và (2) `DEL` mù quáng không kiểm tra giá trị `ownerToken` sẽ xóa mất khóa của người đến sau gây hiệu ứng domino mở toang cửa! Sử dụng `Redisson RLock` giải quyết cả hai bằng cơ chế **Watchdog** (cứ mỗi `1/3` thời gian lease ~10s, nếu luồng giữ khóa còn sống thì ngầm gia hạn lại lên 30s; nếu Pod chết thật thì không ai gia hạn nữa nên sau 30s khóa tự nhả an toàn) và mở khóa nguyên tử bằng Lua đối chiếu đúng ID luồng. Tuy nhiên, một **Senior Ngân hàng** còn hiểu sâu hơn 1 bậc: vì sao chép Redis Master -> Replica là bất đồng bộ (nếu Master vừa cấp khóa xong thì sập trước khi đồng bộ sang Replica, Replica lên ngôi sẽ cấp trùng khóa!), nên Redis Lock chỉ là **Efficiency Lock**, còn dưới PostgreSQL vẫn LUÔN PHẢI CÓ **Safety Guard** (`UNIQUE(batch_id)` / `SELECT FOR UPDATE` / `@Version` / Fencing Token) để bảo vệ từng đồng tiền! Kết hợp thêm **TTL Jitter** (`3600 + ThreadLocalRandom.nextInt(600)`) dập tắt gọn ghẽ bão hết hạn đồng loạt lúc 09:00:00!",
          whyWrong: [
            "Đặt TTL 24 giờ và không xóa trong `finally` đồng nghĩa nếu Pod đang giữ khóa bị lỗi hoặc khởi động lại ở giây thứ 2, doanh nghiệp đó bị khóa cứng không thể chi lương lại suốt 24 tiếng đồng hồ!",
            "",
            "Lệnh `KEYS *` có độ phức tạp `O(N)` chặn đứng luồng đơn chính của Redis Server — gõ `KEYS *` trên Redis Production hàng triệu khóa sẽ làm treo toàn bộ hệ thống ngân hàng vài giây!",
            "Khóa qua file mạng chia sẻ vừa chậm chạp vừa không có cơ chế giải phóng tin cậy khi nút mạng bị đứt kết nối (Split-brain)."
          ],
          tip: "Ba câu thần chú về **Redis trong Ngân hàng**: **1. Không tự chế `SETNX + DEL` trần (hãy dùng Redisson Watchdog + Lua check owner)**; **2. Redis Lock chỉ để tối ưu tải, chốt chặn chống chi đúp tiền PHẢI nằm ở PostgreSQL ACID**; **3. Chống sập Cache bằng `TTL Jitter` + `Mutex/Logical Expiry` + `Null Cache/Bloom Filter`**!"
        }
      },
      {
        id: "R2-16",
        domain: "Kafka & Outbox",
        lessonId: "M1",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Cổng **Spring Cloud Gateway** tiếp nhận lưu lượng Mobile/Web bên ngoài rồi gọi vào các dịch vụ nội bộ trong đó luồng chấm điểm rủi ro tốc độ cao dùng **gRPC (Protobuf over HTTP/2)**. Hai sự cố vừa phát sinh: (1) Khi khách hàng bên ngoài ngắt kết nối hoặc hết hạn chờ 2 giây tại Gateway, lời gọi gRPC nội bộ phía dưới không hề có `Deadline` nên vẫn âm thầm chạy tốn CPU/DB suốt 25 giây; tệ hơn, trong đợt Rolling Update không dừng hệ thống, một lập trình viên sửa file `.proto` đổi trường `string currency = 3;` thành `int32 currency_numeric = 3;` (dùng lại đúng số thứ tự tag `= 3` nhưng đổi kiểu dữ liệu) làm các Pod phiên bản cũ và mới giải mã nhị phân lỗi hàng loạt! (2) Bộ giới hạn tốc độ (Rate Limiter) tại Gateway đang cấu hình theo địa chỉ **Client IP**, dẫn đến giờ cao điểm chặn nhầm 3.000 nhân viên văn phòng dùng chung 1 IP NAT công ty nhưng lại để lọt lưới kẻ tấn công xoay vòng 800 IP Proxy dân cư nhắm vào 1 tài khoản! Bạn khắc phục ra sao?",
        options: [
          "Bỏ gRPC quay về SOAP XML cho mọi giao tiếp nội bộ, và tắt hoàn toàn Rate Limiter tại API Gateway để nhân viên văn phòng không bao giờ bị chặn.",
          "Giữ nguyên việc đổi kiểu dữ liệu trên tag `= 3` của Protobuf vì tên biến đã đổi sang `currency_numeric`, chỉ cần xóa cache trình duyệt của khách hàng là hết lỗi.",
          "Thiết lập bắt buộc **gRPC Deadline** trên mỗi lời gọi (`stub.withDeadlineAfter(300, TimeUnit.MILLISECONDS)`) để tự động hủy lan truyền các tác vụ quá hạn, đồng thời tuân thủ nghiêm luật tiến hóa hợp đồng **Protobuf Wire Compatibility**: tuyệt đối KHÔNG tái sử dụng hay đổi kiểu dữ liệu của số tag cũ (đánh dấu `reserved 3; reserved 'currency';` và cấp số tag mới `int32 currency_numeric = 8;`); tại **Spring Cloud Gateway**, cấu hình `RequestRateLimiter` phân tầng theo `KeyResolver` ưu tiên lấy định danh `cif` / `sub` đã xác thực từ JWT (chỉ fallback về IP kết hợp Device Fingerprint cho các API chưa đăng nhập).",
          "Đặt gRPC Deadline bằng 24 giờ cho mọi API và chỉ giới hạn tốc độ theo chuỗi `User-Agent` do trình duyệt tự gửi lên."
        ],
        answer: 2,
        walkthrough: {
          keyword: "gRPC thiếu Deadline chạy lãng phí 25s + sửa Protobuf đổi string currency = 3 thành int32 currency_numeric = 3 lỗi Rolling Update ... Rate Limiter theo IP chặn nhầm công ty NAT",
          whyCorrect: "Chào em, câu hỏi này kiểm chứng kinh nghiệm thực chiến với **API Gateway & Internal gRPC Governance** ở các ngân hàng số lớn! **Ở ý (1):** Khác với JSON truyền tên trường dạng chữ (`'currency'`), giao thức nhị phân **Protobuf hoàn toàn KHÔNG truyền tên trường trên đường dây mạng mà chỉ truyền số thứ tự Tag (`3`) kèm Wire Type**! Do đó, dù bạn có đổi tên thành `currency_numeric` nhưng giữ nguyên số `= 3` và đổi từ `string` (wire type 2) sang `int32` (wire type 0), khi Pod v1 và Pod v2 chạy song song lúc Rolling Update, bộ giải mã đọc trúng tag `3` sẽ giải mã sai hoàn toàn dữ liệu nhị phân! Luật bất di bất dịch của Protobuf là: bỏ trường cũ phải khai báo `reserved 3; reserved 'currency';` và luôn tạo số tag mới tinh `= 8` cho trường mới; kết hợp gắn `.withDeadlineAfter(...)` trên mọi stub gRPC để tự động lan truyền tín hiệu hủy dọc theo chuỗi microservice khi hết ngân sách thời gian. **Ở ý (2):** Tại Việt Nam, hàng nghìn nhân viên một tòa nhà hoặc hàng vạn thuê bao 4G nhà mạng đi chung qua một cổng CGNAT IP công cộng — chặn theo IP tĩnh ở API sau đăng nhập sẽ giết nhầm khách thật hàng loạt! Định danh chuẩn trên `Spring Cloud Gateway` cho API nghiệp vụ là trích xuất `cif` (hoặc `client_id` đối tác Open Banking) từ Token đã xác thực làm khóa cho Redis Token Bucket Rate Limiter!",
          whyWrong: [
            "Quay về SOAP XML làm phình kích thước bản tin gấp 5–10 lần và tăng độ trễ phân tích cú pháp, còn tắt Rate Limiter làm hệ thống phơi mình trước tấn công làm cạn kiệt tài nguyên.",
            "Như đã phân tích, Protobuf định danh trường trên đường truyền hoàn toàn bằng **số Tag (`3`)** chứ không phải tên biến và không liên quan gì tới trình duyệt khách hàng.",
            "",
            "Deadline 24 giờ tương đương không có bảo vệ timeout, còn chuỗi `User-Agent` do kẻ tấn công tự bịa tùy ý trong 1 dòng code nên làm khóa Rate Limit hoàn toàn vô giá trị."
          ],
          tip: "Nhớ 3 nguyên tắc **Gateway & gRPC Microservices**: **1. Mọi lời gọi gRPC PHẢI gắn `withDeadlineAfter(...)`**; **2. Protobuf tiến hóa hợp đồng: CẤM đổi kiểu hay dùng lại số Tag cũ (luôn dùng `reserved`)**; **3. Rate Limit API ngân hàng đã đăng nhập: Khóa theo `CIF / ClientID`, đừng khóa cứng mỗi `IP` (coi chừng CGNAT tòa nhà/4G)!**"
        }
      },
      {
        id: "R2-17",
        domain: "Redis & Sharding",
        lessonId: "D5",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Khi quy mô hệ thống Ví Điện Tử mở rộng lên 50 triệu tài khoản và 20.000 TPS ghi, một cụm Primary PostgreSQL đơn lẻ chạm trần I/O vật lý nên Hội đồng Kiến trúc quyết định phân mảnh ngang (**Horizontal Database Sharding**) ra **16 cụm PostgreSQL Shards độc lập**. Ba phương án chọn **Sharding Key** cho bảng `wallets` và `wallet_postings` được đưa ra bàn thảo: (A) Chia theo `created_year_month`, (B) Chia theo `transaction_id`, (C) Chia theo `account_id` (`hash(account_id) % 16`). Phân tích lựa chọn Sharding Key nào tối ưu nhất và xử lý giao dịch chuyển tiền giữa hai ví nằm trên 2 Shard khác nhau (`Account X` ở Shard 2 chuyển sang `Account Y` ở Shard 14) như thế nào?",
        options: [
          "Chọn **`account_id`** làm Sharding Key cho cả `wallets` lẫn `wallet_postings`: nhờ đó 100% thao tác kiểm tra số dư, khóa dòng trừ tiền và xem sao kê của một khách hàng luôn gom gọn trên đúng 1 Shard duy nhất (tránh lỗi Scatter-Gather quét cả 16 Shards của `transaction_id` và tránh điểm nóng ghi dồn hết vào 1 Shard tháng hiện tại của `created_year_month`); đối với giao dịch chuyển tiền liên phân mảnh (`Shard 2 -> Shard 14`), không dùng khóa 2PC/XA chậm chạp mà dùng **Saga / Outbox Hạch toán Liên Shard** (Giao dịch cục bộ trên Shard 2 trừ ví X + ghi Outbox -> đẩy qua Kafka -> Giao dịch cục bộ lũy đẳng trên Shard 14 cộng ví Y, kèm tài khoản đối ứng trung gian để đối soát cân bằng).",
          "Chọn `created_year_month` làm Sharding Key để toàn bộ 20.000 TPS của tháng này dồn hết vào duy nhất Shard thứ 16, còn 15 Shards của các tháng trước để nghỉ ngơi 0% CPU.",
          "Chọn `transaction_id` làm Sharding Key để các bút toán của cùng một khách hàng rải đều ngẫu nhiên ra cả 16 Shards, mỗi lần khách mở app xem số dư và 20 giao dịch gần nhất sẽ bắn truy vấn quét đồng thời cả 16 Shards rồi cộng lại trên Java.",
          "Dùng `account_id` làm Sharding Key nhưng bắt buộc mở giao dịch `XA Two-Phase Commit` khóa cứng đồng bộ xuyên mạng giữa Shard 2 và Shard 14 cho toàn bộ 20.000 TPS."
        ],
        answer: 0,
        walkthrough: {
          keyword: "Horizontal Sharding 16 cụm PostgreSQL cho 50 triệu ví, 20.000 TPS ... chọn Sharding Key nào giữa created_year_month, transaction_id, account_id và xử lý chuyển tiền khác Shard",
          whyCorrect: "Chào bạn, đây là câu hỏi thiết kế hệ thống phân tán đỉnh cao thường xuất hiện ở vòng cuối phỏng vấn **Staff / Principal / Senior System Design**! Tiêu chí sống còn khi chọn **Sharding Key** là: **1. Phân bố tải đọc/ghi đồng đều (Even Distribution)** và **2. Gom cụm dữ liệu truy cập cùng nhau về một chỗ (Data Locality)**. Nếu chọn `created_year_month`, 95% giao dịch của người dùng mới và bút toán tháng hiện tại đập hết vào 1 Shard mới nhất (**Write Hotspot**), làm mất hoàn toàn ý nghĩa nhân 16 lần năng lực ghi! Nếu chọn `transaction_id`, bút toán của 1 ví bị xé vụn văng tứ tung khắp 16 Shards, mỗi lần xem sao kê phải gọi **Scatter-Gather** hỏi cả 16 cụm DB, chỉ 1 cụm lag là chậm cả hệ thống! Chọn **`account_id`** băm đều ra 16 Shards giúp tải chia phẳng lì `20.000 / 16 = 1.250 TPS/Shard`, và toàn bộ dòng đời của 1 tài khoản nằm gọn trên 1 Shard! Còn khi `Ví X (Shard 2)` chuyển cho `Ví Y (Shard 14)`, ta coi mỗi Shard như một 'chi nhánh kế toán' độc lập: Shard 2 trừ Ví X + ghi Có vào GL Liên-Shard + lưu Outbox trong 3ms ACID; Kafka chuyển sự kiện sang Shard 14 ghi Nợ GL Liên-Shard + cộng Ví Y lũy đẳng trong 3ms tiếp theo -> tổng độ trễ đầu-cuối chỉ ~20–40ms mà không cần bất kỳ chiếc khóa phân tán 2PC nào!",
          whyWrong: [
            "",
            "Chia theo tháng tạo ra điểm nghẽn cổ chai dữ dội nhất trên Shard của tháng hiện hành — 1 Shard gánh gần trọn 20.000 TPS vẫn sập y như khi chưa Sharding!",
            "Rải bút toán cùng tài khoản theo `transaction_id` làm mất khả năng đối chiếu cục bộ và biến mọi câu truy vấn sao kê đơn giản thành bài toán gộp 16 kết quả xuyên mạng cực kỳ đắt đỏ.",
            "Giao thức 2PC/XA khóa tài nguyên xuyên hai máy chủ Database qua mạng rất nhạy cảm với độ trễ và lỗi điều phối viên, làm sụt giảm nghiêm trọng thông lượng dưới tải 20.000 TPS."
          ],
          tip: "Bài toán **Sharding Sổ cái / Ví điện tử**: Luôn chốt **`Sharding Key = account_id` (hoặc `wallet_id`)** để tối ưu Data Locality cho 99% truy vấn tài khoản, và giải quyết chuyển tiền **Cross-Shard bằng `Transactional Outbox + Idempotent Saga`** thay vì 2PC!"
        }
      },
      {
        id: "R2-18",
        domain: "Redis & Sharding",
        lessonId: "D6",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Vào 10:15 sáng thứ Ba (giữa giờ giao dịch cao điểm), một bản triển khai tự động chạy script **Flyway** trên bảng `payment_transactions` (600 triệu dòng) với hai câu lệnh tưởng chừng vô hại: `CREATE INDEX idx_pt_partner_ref ON payment_transactions (partner_ref);` và `ALTER TABLE payment_transactions ADD CONSTRAINT chk_pt_fee CHECK (fee_amount >= 0);`. Chỉ 2 giây sau, toàn bộ lệnh chuyển tiền trên toàn quốc treo cứng 100% suốt 14 phút gây sự cố nghiêm trọng! Bạn hãy chỉ ra chính xác vì sao hai câu lệnh DDL đó làm treo ngân hàng và viết lại quy trình **Zero-Downtime Migration** chuẩn trên PostgreSQL + Flyway!",
        options: [
          "Do Flyway chạy bằng Java nên chậm hơn gõ tay trên DBeaver; chỉ cần copy y nguyên hai câu lệnh đó vào DBeaver bấm chạy lúc 10:30 sáng là không khóa bảng.",
          "Do thiếu lệnh `ANALYZE payment_transactions` ở đầu script; thêm `ANALYZE` vào trước sẽ giúp `CREATE INDEX` thường không khóa dòng ghi.",
          "Do PostgreSQL không cho phép tạo Index hay Constraint khi bảng đã có trên 100 triệu dòng, bắt buộc phải dừng toàn bộ hệ thống lúc 2 giờ sáng mới chạy được.",
          "Lệnh `CREATE INDEX` thường chiếm khóa `SHARE` chặn toàn bộ `INSERT/UPDATE/DELETE` trong suốt quá trình quét 600 triệu dòng, còn `ALTER TABLE ... ADD CONSTRAINT CHECK` thường chiếm khóa độc quyền `ACCESS EXCLUSIVE` chặn cả ĐỌC lẫn GHI và khiến mọi truy vấn đến sau xếp hàng tắc nghẽn dây chuyền (Lock Queue Amplification)! Quy trình Zero-Downtime chuẩn: (1) Cấu hình script Flyway chạy ngoài giao dịch (`executeInTransaction = false`) để dùng `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...`; (2) Tách thêm ràng buộc thành 2 pha: `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...) NOT VALID;` (chỉ sửa metadata trong vài ms) rồi chạy tiếp `ALTER TABLE ... VALIDATE CONSTRAINT ...;` (chỉ giữ khóa nhẹ `SHARE UPDATE EXCLUSIVE` không chặn đọc/ghi); và (3) Luôn đặt chốt an toàn `SET lock_timeout = '2s'` ở đầu mọi script DDL để nếu vướng khóa thì tự hủy ngay thay vì làm treo hàng đợi cả ngân hàng!"
        ],
        answer: 3,
        walkthrough: {
          keyword: "chạy Flyway giờ hành chính trên bảng 600 triệu dòng: CREATE INDEX thường + ADD CONSTRAINT CHECK thường làm treo cứng toàn bộ ngân hàng 14 phút",
          whyCorrect: "Chào em, bất kỳ ai từng trực chiến DBRE / Senior Backend ở ngân hàng đều thuộc lòng bài học trị giá hàng tỷ đồng này! Trên PostgreSQL, có tới **3 cái bẫy khóa DDL** chồng lên nhau ở đây: **Bẫy 1:** `CREATE INDEX` không có từ khóa `CONCURRENTLY` sẽ giữ khóa `SHARE` chặn sạch mọi lệnh ghi bút toán mới suốt 14 phút quét 600 triệu dòng; lưu ý rằng `CREATE INDEX CONCURRENTLY` không được phép chạy bên trong khối `BEGIN...COMMIT`, nên trong Flyway bắt buộc cấu hình thuộc tính script `executeInTransaction=false`! **Bẫy 2:** `ADD CONSTRAINT ... CHECK` mặc định lấy khóa mạnh nhất quả đất là **`ACCESS EXCLUSIVE`** (chặn cả `SELECT` lẫn `INSERT/UPDATE`!) và giữ khóa đó đi quét kiểm tra từng dòng trong 600 triệu dòng! Khi thêm đuôi **`NOT VALID`**, Postgres chỉ ghi định nghĩa kiểm tra cho các dòng mới từ giây đó trở đi (xong trong 2 mili-giây!), sau đó lệnh **`VALIDATE CONSTRAINT`** kiểm tra 600 triệu dòng cũ ở chế độ nền chỉ giữ `SHARE UPDATE EXCLUSIVE` cho phép khách hàng đọc/chuyển tiền bình thường 100%! **Bẫy 3 (Đắt giá nhất):** Nếu lúc `ALTER TABLE` xin khóa mà đang vướng 1 câu truy vấn dài 5 giây chưa xong, lệnh `ALTER TABLE` đứng xếp hàng và **chặn toàn bộ 6.000 TPS đến sau lưng nó đứng chết chùm**! Câu thần chú `SET lock_timeout = '2s';` đảm bảo nếu sau 2 giây chưa mượn được khóa thì script DDL tự nhường đường rút lui an toàn!",
          whyWrong: [
            "Khóa bảng là cơ chế nội tại của engine PostgreSQL đối với câu lệnh SQL đó — chạy qua Flyway, psql hay DBeaver đều khóa cứng bảng y hệt nhau 100%!",
            "`ANALYZE` chỉ cập nhật thống kê phân phối dữ liệu cho Query Planner chứ không làm thay đổi mức độ khóa của `CREATE INDEX` hay `ALTER TABLE`.",
            "PostgreSQL hoàn toàn thực hiện được cả hai thao tác trên bảng hàng tỷ dòng ngay giữa giờ hành chính không rớt 1 giao dịch nào nếu tuân thủ đúng kỹ thuật `CONCURRENTLY` + `NOT VALID / VALIDATE` + `lock_timeout`!",
            ""
          ],
          tip: "Bộ quy tắc sắt đá **Zero-Downtime DDL trên PostgreSQL**: **1. Luôn đặt `SET lock_timeout = '2s';` đầu file migration**; **2. Tạo Index luôn dùng `CREATE INDEX CONCURRENTLY` (`executeInTransaction=false`)**; **3. Thêm Check/Foreign Key trên bảng lớn luôn tách 2 bước `ADD ... NOT VALID` -> `VALIDATE CONSTRAINT`**!"
        }
      },
      {
        id: "R2-19",
        domain: "Redis & Sharding",
        lessonId: "D6",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Hai tình huống vận hành thực tế với tiến hóa lược đồ và CDC thời gian thực: **(1)** Để chuẩn hóa theo ISO 20022, bạn cần đổi tên cột `receiver_name` thành `creditor_name` trên bảng `transfers` trong khi cụm Kubernetes gồm 30 Pod đang triển khai theo kiểu cuốn chiếu **Rolling Update** (trong 5 phút chuyển giao, 15 Pod phiên bản cũ `v1` và 15 Pod phiên bản mới `v2` cùng chạy song song truy cập chung Database!). **(2)** Hệ thống dùng **Debezium CDC** đọc từ **PostgreSQL Logical Replication Slot** đẩy sự kiện sang Kafka; tối thứ Bảy connector Debezium bị lỗi dừng chạy không ai để ý, tới trưa Chủ nhật ổ cứng 2TB chứa thư mục `pg_wal` của Primary PostgreSQL đầy 100% khiến toàn bộ Database sập sang chế độ Read-Only Panic! Bạn xử lý hai bài toán này như thế nào?",
        options: [
          "Ở (1), chạy thẳng lệnh `ALTER TABLE transfers RENAME COLUMN receiver_name TO creditor_name;` ngay lúc bắt đầu Rolling Update; ở (2), viết cronjob xóa tay các file trong thư mục `/var/lib/postgresql/data/pg_wal` bằng lệnh `rm -rf` mỗi tối.",
          "Ở (1), tắt toàn bộ 30 Pod nghỉ bảo trì 2 tiếng mỗi khi đổi tên bất kỳ cột nào; ở (2), tắt tính năng WAL của PostgreSQL khi dùng Debezium.",
          "Ở (1), áp dụng mẫu **Expand-and-Contract (3 Pha)**: Pha 1 (Expand) thêm cột mới `creditor_name` cho phép null, triển khai code ghi kép (Dual-Write vào cả hai cột) và backfill dữ liệu cũ theo lô nhỏ; Pha 2 chuyển toàn bộ luồng đọc sang `creditor_name` khi 100% Pod đã lên bản mới ổn định; Pha 3 (Contract - ở bản release sau) mới gỡ bỏ việc ghi cột cũ và xóa `receiver_name` — đảm bảo tương thích ngược hoàn toàn suốt quá trình Rolling Update! Ở (2), PostgreSQL giữ lại toàn bộ file WAL chưa được Replication Slot tiêu thụ nên khi Debezium chết làm nổ đĩa `pg_wal`: cần giám sát cảnh báo chặt độ trễ byte của `pg_replication_slots`, bật `heartbeat.interval.ms` trên Debezium và cấu hình chốt bảo vệ ổ cứng `max_slot_wal_keep_size` trên PostgreSQL.",
          "Ở (1), tạo thêm một bảng `transfers_v2` sao chép định kỳ mỗi giờ một lần; ở (2), chuyển thư mục `pg_wal` vào bộ nhớ tạm `/dev/shm` trên RAM."
        ],
        answer: 2,
        walkthrough: {
          keyword: "đổi tên cột receiver_name -> creditor_name khi Rolling Update (Pod v1 và v2 chạy chung DB) ... Debezium dừng chạy làm đầy 100% ổ cứng pg_wal gây sập Postgres",
          whyCorrect: "Chào bạn, cả hai tình huống này đều là những 'vết sẹo chiến trường' thực thụ của kiến trúc sư hệ thống lớn! **Ở tình huống (1):** Nhiều bạn nghĩ `RENAME COLUMN` chỉ sửa metadata tích tắc là xong — đúng là không khóa lâu, NHƯNG ngay tích tắc tên cột đổi sang `creditor_name`, toàn bộ 15 Pod `v1` đang chạy câu SQL `INSERT/SELECT receiver_name` sẽ văng lỗi `ERROR: column 'receiver_name' does not exist` chết hàng loạt suốt 5 phút Rolling Update (và nếu `v2` lỗi cần Rollback về `v1` thì tắc đường lui luôn)! Mẫu **Expand-and-Contract (Parallel Change)** tách thay đổi phá vỡ tương thích (Breaking Schema Change) thành các bước cộng thêm tương thích ngược 100% cả lúc nâng cấp lẫn lúc rollback khẩn cấp. **Ở tình huống (2):** Đây là sự cố làm sập Production kinh điển nhất khi mới xài **Debezium / PostgreSQL Logical Replication**! Khi tạo một Replication Slot, PostgreSQL hứa sẽ giữ chặt mọi đoạn nhật ký `pg_wal` trên đĩa cho tới khi Debezium xác nhận đã đọc qua mốc LSN đó. Nếu Debezium chết cuối tuần mà tải giao dịch vẫn 45 triệu dòng/ngày, `pg_wal` phình hàng trăm GB ăn cạn sạch ổ đĩa làm Postgres tự sát để bảo vệ dữ liệu! Phải luôn đặt cảnh báo Prometheus trên `pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)` và bật tham số cứu sinh **`max_slot_wal_keep_size`** (PostgreSQL 13+) để thà hủy slot của Debezium cho chạy snapshot lại còn hơn để chết cứng Primary Database của cả ngân hàng!",
          whyWrong: [
            "Chạy `RENAME COLUMN` trực tiếp làm nổ lỗi hàng loạt trên các Pod `v1` đang chạy song song; còn xóa tay file trong `pg_wal` bằng `rm -rf` sẽ phá hỏng hoàn toàn cơ sở dữ liệu PostgreSQL không thể khôi phục!",
            "Ngân hàng số 24/7 cam kết SLA 99.99% (chỉ cho phép gián đoạn tối đa ~52 phút cả năm!) không thể tắt hệ thống 2 tiếng chỉ để đổi tên một cột; và Debezium sống dựa vào việc đọc WAL nên không thể tắt WAL.",
            "",
            "Sao chép bảng mỗi giờ làm mất dữ liệu giao dịch mới suốt 59 phút, còn đưa `pg_wal` lên `/dev/shm` (RAM) vừa làm bay sạch dữ liệu khi mất điện vừa đầy tràn RAM chỉ trong vài phút!"
          ],
          tip: "Nhớ kỹ: **1. Trên K8s Rolling Update, CẤM `RENAME / DROP COLUMN` trực tiếp trong cùng đợt deploy code (luôn dùng 3 pha `Expand -> Migrate -> Contract`)**; **2. Dùng Debezium trên Postgres BẮT BUỘC giám sát `pg_replication_slots` lag + đặt trần `max_slot_wal_keep_size` chống nổ đĩa `pg_wal`!**"
        }
      },
      {
        id: "R2-20",
        domain: "Kafka & Outbox",
        lessonId: "M1",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Kiến trúc hiện tại của một luồng Mở Thẻ Ảo & Nạp Tiền Đầu Tiên đang bị rơi vào bẫy **Distributed Monolith (Nguyên khối Phân tán)**: 1 request HTTP từ khách hàng phải đi xuyên qua chuỗi gọi REST đồng bộ nối tiếp qua **8 microservices** (`Gateway -> Auth -> Profile -> CardGen -> Limit -> Fraud -> CoreLedger -> Notification -> Loyalty`). Dù mỗi microservice đơn lẻ đều cam kết độ sẵn sàng cao `99,9%` và độ trễ P99 là `60ms`, khách hàng thực tế thường xuyên gặp lỗi gián đoạn và chờ quá 600ms, đồng thời mỗi khi lỗi xảy ra đội vận hành mất 2 giờ mò log rời rạc trên 8 hệ thống mới ghép được 1 giao dịch! Bạn hãy phân tích toán học SLA và đề xuất kiến trúc tái thiết kế chuẩn!",
        options: [
          "Giữ nguyên chuỗi gọi đồng bộ nối tiếp qua cả 8 microservices nhưng chuyển định dạng JSON sang YAML để giảm độ trễ mạng xuống 0ms.",
          "Theo phép nhân xác suất nối tiếp, chuỗi đồng bộ qua 8 dịch vụ có độ sẵn sàng `99,9%` mỗi khâu sẽ làm SLA tổng thể tụt xuống chỉ còn `0,999^8 ≈ 99,20%` (tương đương ngừng trệ gần **5,8 giờ mỗi tháng**!) và độ trễ đuôi P99 cộng dồn vượt xa ngưỡng cho phép; cần tái cấu trúc: đưa xác thực JWT và gắn mã vết chuẩn W3C TraceContext (`traceparent` / `X-Correlation-Id` tự động lan truyền qua OpenTelemetry + MDC Log) về tập trung tại **API Gateway**, rút gọn đường găng đồng bộ (Critical Path) chỉ giữ lại đúng các bước bắt buộc trước khi phản hồi (`CardGen`, `Fraud`, `CoreLedger`), và tách toàn bộ các tác vụ hậu giao dịch (`Notification`, `Loyalty`, đồng bộ báo cáo) sang xử lý bất đồng bộ qua sự kiện **Kafka**.",
          "Gộp chung Database của cả 8 microservices vào 1 schema duy nhất để các dịch vụ giao tiếp ngầm bằng Database Trigger thay cho REST API.",
          "Tăng số lần tự động `@Retry(maxAttempts = 5)` ở tất cả 8 tầng nối tiếp nhau để nâng độ sẵn sàng lên 100%."
        ],
        answer: 1,
        walkthrough: {
          keyword: "chuỗi gọi REST đồng bộ nối tiếp qua 8 microservices (mỗi khâu 99,9%, P99 60ms) ... Distributed Monolith + mất 2 giờ ghép log rời rạc",
          whyCorrect: "Chào em, phép toán nhỏ `0,999^8 = 99,2028%` chính là gáo nước lạnh tỉnh người nhất dành cho những ai chia nhỏ Microservices vô tội vạ rồi nối đuôi nhau bằng REST đồng bộ! Mỗi khâu chỉ cần hắt hơi 0,1% thời gian thôi, nhân qua 8 khâu là xác suất lỗi tăng gấp 8 lần, độ trễ đuôi P99 cộng chồng lên nhau (`8 × 60ms = 480ms` chưa tính mạng và giải mã TLS!), và chỉ cần dịch vụ tích điểm `Loyalty` bảo trì là khách hàng... không mở được thẻ ngân hàng luôn! Kiến trúc sư trưởng giải quyết bài toán này theo nguyên lý **Rút ngắn Đường găng Đồng bộ (Minimize Synchronous Critical Path)**: việc gì khách hàng bắt buộc phải biết kết quả ngay lúc bấm nút (kiểm tra gian lận, cấp thẻ, hạch toán tiền nạp) thì giữ trên đường đồng bộ tối giản; việc gì là hệ quả phía sau (`Notification` gửi email chào mừng, `Loyalty` cộng điểm mở thẻ, `Analytics` ghi nhận phễu) phải cắt đứt khỏi luồng HTTP và đẩy qua **Kafka** (nhờ Outbox)! Kết hợp **OpenTelemetry Distributed Tracing** tự động truyền `traceId` xuyên suốt từ Gateway -> HTTP/gRPC -> Kafka Header -> Log JSON giúp gõ 1 mã `traceId` lên Kibana/Grafana Tempo hiện ra trọn vẹn cây giao dịch trong **2 giây** thay vì mò mẫm 2 giờ!",
          whyWrong: [
            "Đổi JSON sang YAML không hề giảm số chặng mạng hay khắc phục sự phụ thuộc sống còn nối tiếp (thậm chí phân tích cú pháp YAML còn chậm và tiềm ẩn rủi ro bảo mật hơn JSON!).",
            "",
            "Dùng chung 1 Database và giao tiếp bằng Trigger giữa 8 dịch vụ là phản mẫu tồi tệ nhất: mất sạch khả năng triển khai độc lập của Microservices mà vẫn gánh trọn độ phức tạp vận hành phân tán.",
            "Cấu hình Retry lồng nhau ở cả 8 tầng nối tiếp (**Nested Retry Amplification**: `5^8 = 390.625` lần khuếch đại!) là công thức tạo ra **Bão Retry tự sát (Retry Storm)** đánh sập toàn bộ hạ tầng ngay khi tầng cuối cùng hơi chập chờn!"
          ],
          tip: "Khi thiết kế hoặc phản biện Microservices trong phỏng vấn: Hãy tung ngay phép tính **`SLA tổng = SLA_1 × SLA_2 × ... × SLA_n` (`0.999^N`)** và cảnh báo hiểm họa **Nested Retry Storm (`5^N`)** để chứng minh vì sao phải tách các khâu phụ sang bất đồng bộ Kafka!"
        }
      },
      {
        id: "R2-21",
        domain: "Kafka & Outbox",
        lessonId: "M2",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Dịch vụ Xuất Sao Kê PDF Doanh Nghiệp tiêu thụ sự kiện từ topic `corp.statement.requests` với cấu hình mặc định: `max.poll.records = 500`, `max.poll.interval.ms = 300000` (5 phút) và `enable.auto.commit = true`. Mỗi yêu cầu kết xuất file PDF sao kê lớn kèm ký số mất trung bình `1,1 giây` (`500 bản tin × 1,1s = 550 giây > 300 giây`). Đội vận hành hoảng hốt thấy cứ đúng mỗi 5 phút một lần, Kafka báo `CommitFailedException: Offset commit cannot be completed since the consumer is not part of an active group`, các Pod bị đá văng khỏi Consumer Group gây **Bão Rebalance vô tận**, cùng một lô 500 sao kê bị xuất đi xuất lại hàng chục lần trong khi hàng đợi tồn đọng (Consumer Lag) chất cao lên hàng trăm nghìn! Cách cấu hình và xử lý nào chấm dứt hoàn toàn vòng lặp tử thần này?",
        options: [
          "Giảm mạnh `max.poll.records` xuống mức an toàn (ví dụ `10–25` bản tin/lần poll để tổng thời gian xử lý cả lô chỉ ~15–25 giây, thấp hơn rất xa ngưỡng `max.poll.interval.ms`), tắt `enable.auto.commit = false` chuyển sang cơ chế xác nhận thủ công (`AckMode.RECORD` hoặc `AckMode.BATCH`) của Spring Kafka chỉ commit offset SAU KHI đã xử lý và lưu kết quả xong xuôi (kèm kiểm tra lũy đẳng theo `requestId` để chống xuất trùng nếu có rebalance).",
          "Tăng `max.poll.records` từ `500` lên `10.000` bản tin mỗi lần kéo về để giảm số lần gọi mạng tới Kafka Broker.",
          "Giữ nguyên `max.poll.records = 500` nhưng giảm `session.timeout.ms` và `max.poll.interval.ms` xuống còn `1.000ms` (1 giây) để Consumer phát hiện lỗi nhanh hơn.",
          "Bật `enable.auto.commit = true` với `auto.commit.interval.ms = 100` (commit tự động mỗi 0,1 giây ngay cả khi chưa xử lý xong) để không bao giờ bị mất tiến độ."
        ],
        answer: 0,
        walkthrough: {
          keyword: "max.poll.records = 500 × 1,1s = 550s vượt quá max.poll.interval.ms = 300s (5 phút) ... CommitFailedException + Bão Rebalance vô tận xuất trùng sao kê",
          whyCorrect: "Chào bạn, ai đã từng trực đêm cứu hệ thống Kafka Consumer bị kẹt lag đều thấm thía cơ chế hai nhịp tim của Kafka Consumer hiện đại! Từ Kafka 0.10.1+, luồng gửi `heartbeat` đã chạy ngầm riêng (kiểm tra theo `session.timeout.ms`), NHƯNG Group Coordinator vẫn giám sát chặt khoảng cách thời gian giữa hai lần ứng dụng gọi hàm `poll()` liên tiếp thông qua **`max.poll.interval.ms`** (mặc định 5 phút = 300s) để phát hiện luồng xử lý nghiệp vụ bị treo (livelock)! Khi bạn ôm tham 1 lúc `500 bản tin × 1,1s = 550 giây` mới quay lại gọi `poll()` lần tiếp theo: đúng phút thứ 5 (giây 300), Broker tuyên bố 'Pod này treo rồi, đuổi cổ khỏi Group!' và giao lại đúng 500 bản tin đó cho Pod bên cạnh; Pod bên cạnh cũng cày mất 550 giây -> phút thứ 5 lại bị đuổi cổ tiếp -> **Vòng lặp Rebalance vô tận không tiến thêm được 1 offset nào**! Hạ `max.poll.records = 20` (chỉ mất ~22 giây << 300s), tắt `enable.auto.commit = false` để chỉ commit offset sau khi kết xuất xong và kiểm tra lũy đẳng `requestId` sẽ dập tắt cơn bão tức thì!",
          whyWrong: [
            "",
            "Tăng `max.poll.records = 10.000` làm thời gian xử lý 1 đợt kéo dài tới hơn 3 tiếng đồng hồ (`11.000 giây >> 300 giây`), khiến bão Rebalance càng chắc chắn xảy ra 100% ở phút thứ 5!",
            "Giảm `max.poll.interval.ms` xuống 1 giây trong khi xử lý 1 file PDF đã mất 1,1 giây sẽ khiến Consumer bị đá văng khỏi Group ngay ở bản tin đầu tiên!",
            "`auto.commit` của Kafka Client thực chất chỉ chạy đính kèm bên trong lần gọi `poll()` tiếp theo; hơn nữa nếu commit offset trước khi xuất xong PDF mà Pod sập ở bản tin thứ 10 thì 490 yêu cầu sao kê còn lại của khách hàng bị đánh dấu đã đọc và **mất trắng vĩnh viễn**!"
          ],
          tip: "Công thức kiểm tra an toàn cho mọi **Kafka Consumer chạy tác vụ nặng**: **`max.poll.records × Thời_gian_xử_lý_tệ_nhất_1_msg << max.poll.interval.ms`** + Luôn tắt **`enable.auto.commit=false`** để chủ động Ack sau khi lưu DB thành công!"
        }
      },
      {
        id: "R2-22",
        domain: "Kafka & Outbox",
        lessonId: "M3",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Một Consumer xử lý sự kiện đối chiếu phí trên topic `fee.reconciliation` (12 Partitions). Lúc 14:00 chiều, một dịch vụ nguồn bị lỗi phát nhầm **1 bản tin JSON sai cấu trúc (Poison Pill)** vào Partition 3 tại offset `#88201`, phía sau nó có 40.000 bản tin hợp lệ đang nối đuôi chờ xử lý. Nếu cấu hình thử lại vô hạn tại chỗ, bản tin `#88201` văng lỗi `DeserializationException` mãi mãi làm tắc nghẽn toàn bộ 40.000 bản tin hợp lệ phía sau trên Partition 3! Ngược lại, nếu lập trình viên bọc `try { ... } catch (Exception e) { log.error(e); }` nuốt sạch mọi lỗi kể cả lỗi rớt kết nối PostgreSQL tạm thời 2 giây, thì hàng nghìn bút toán phí hợp lệ lúc mạng DB chập chờn sẽ bị bỏ qua mất sạch! Chiến lược phân loại ngoại lệ và Dead Letter Topic (DLT) nào đúng chuẩn ngân hàng?",
        options: [
          "Nuốt sạch mọi ngoại lệ bằng `try/catch` để hệ thống không bao giờ dừng, cuối tháng nhờ kế toán cộng tay lại toàn bộ chênh lệch.",
          "Khi gặp bất kỳ lỗi nào trên 1 bản tin, tự động xóa trắng toàn bộ Partition 3 bằng lệnh quản trị Kafka để giải phóng đường đi cho các bản tin mới.",
          "Phân loại rạch ròi hai nhóm ngoại lệ trong `DefaultErrorHandler` + `ErrorHandlingDeserializer`: **(1) Lỗi Không thể tự phục hồi (Non-Retryable / Poison Pill** như `DeserializationException`, sai Schema, dữ liệu vi phạm định dạng cố định) -> KHÔNG retry vô ích mà chuyển thẳng ngay lập tức sang **Dead Letter Topic (`.DLT`)** đính kèm đầy đủ header nguyên nhân/offset/stacktrace kèm cảnh báo vận hành để thông đường cho 40.000 tin sau; **(2) Lỗi Hạ tầng Tạm thời (Retryable Transient Exceptions** như `TransientDataAccessException`, nghẽn mạng DB ngắn hạn) -> áp dụng **Exponential Backoff Retry** có giới hạn trước khi đẩy vào DLT (lưu ý nếu nghiệp vụ yêu cầu giữ nghiêm ngặt thứ tự từng tài khoản thì dừng chờ ngắn ngay trên partition thay vì nhảy cóc làm đảo thứ tự cùng khóa!).",
          "Dừng toàn bộ cụm Kafka 3 Brokers mỗi khi phát hiện 1 bản tin lỗi JSON cho tới khi lập trình viên sửa code xong."
        ],
        answer: 2,
        walkthrough: {
          keyword: "1 bản tin sai cấu trúc JSON (Poison Pill) ở offset #88201 chặn đứng 40.000 tin hợp lệ phía sau vs lỗi rớt kết nối DB tạm thời 2 giây",
          whyCorrect: "Chào em, đây là câu hỏi cực kỳ thực tế kiểm tra tư duy thiết kế **Fault-Tolerant Kafka Consumer**! Bản chất của lỗi dữ liệu hỏng (**Poison Pill**: sai cú pháp JSON, thiếu trường bắt buộc không bao giờ tự đúng lại được) trái ngược hoàn toàn với lỗi hạ tầng thoáng qua (**Transient Error**: DB failover mất 3 giây, mạng timeout tích tắc rồi sống lại). Trước hết, phải bọc deserializer bằng **`ErrorHandlingDeserializer`** của Spring Kafka (nếu không, lỗi nổ ngay bên trong hàm `poll()` của Kafka client trước cả khi vào code listener gây vòng lặp lỗi vô tận!). Sau đó cấu hình `DefaultErrorHandler` kèm `DeadLetterPublishingRecoverer`: với `DeserializationException` / `ValidationException` -> gắn vào danh sách `addNotRetryableExceptions(...)` để bắn thẳng sang topic `fee.reconciliation.DLT` ngay ở lần đầu tiên (tốn 5ms, lưu nguyên mảng `byte[]` gốc + header lỗi để đội vận hành sửa rồi replay lại sau) giúp 40.000 bản tin phía sau thông suốt tức thì! Còn với lỗi mạng/DB tạm thời -> thử lại với khoảng lùi tăng dần (`ExponentialBackOff`: 1s, 2s, 4s, 8s...) để chờ DB failover xong và xử lý thành công không mất 1 bút toán nào! Điểm cộng cực lớn cho ứng viên Senior là câu lưu ý cuối: nếu dùng Non-blocking `@RetryableTopic` đẩy tin lỗi sang topic retry phụ, các tin đến sau của cùng tài khoản trên topic chính sẽ chạy vượt mặt tin trước — nên với biến động số dư yêu cầu thứ tự khắt khe, phải cân nhắc giữ thứ tự theo khóa!",
          whyWrong: [
            "Nuốt lỗi rớt kết nối DB bằng `try/catch` rồi vẫn commit offset đồng nghĩa vứt bỏ vĩnh viễn dữ liệu tài chính hợp lệ xuống sông xuống biển mà không ai hay biết!",
            "Xóa Partition làm bay màu cả 40.000 bản tin hợp lệ đang xếp hàng chờ xử lý chỉ vì 1 bản tin hỏng.",
            "",
            "Một bản tin hỏng từ 1 đối tác lẻ không bao giờ được phép kéo sập toàn bộ trục sự kiện trung tâm của cả ngân hàng."
          ],
          tip: "Xử lý lỗi **Kafka Consumer chuẩn Production** nhớ 3 mảnh ghép: **1. Luôn bọc `ErrorHandlingDeserializer` chống kẹt vòng lặp `poll()`**; **2. Phân tách rõ `NotRetryable (Poison Pill -> bắn thẳng ra DLT)` vs `Retryable (DB/Network hiccup -> Exponential Backoff)`**; **3. Cảnh giác đảo thứ tự cùng `accountId` khi dùng Non-blocking Retry Topic!**"
        }
      },
      {
        id: "R2-23",
        domain: "Saga, Resilience & Batch",
        lessonId: "M4",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Luồng **Chuyển tiền Quốc tế Chiều đi (Outbound Remittance)** đi qua 6 bước nghiệp vụ phức tạp: `(1) Phong tỏa tiền VNĐ (CASA Hold) -> (2) Chốt tỷ giá ngoại tệ (FX Lock) -> (3) Kiểm tra cấm vận quốc tế (AML/Sanctions) -> (4) Hạch toán cắt tiền & Phát điện SWIFT pacs.008 ra ngân hàng đại lý nước ngoài -> (5) Ghi nhận bút toán phân bổ doanh thu phí nội bộ -> (6) Lưu trữ hồ sơ chứng từ ngoại hối`. Ban đầu đội ngũ thiết kế theo kiểu **Pure Choreography** (6 dịch vụ tự bắn và nghe sự kiện chéo nhau không có nhạc trưởng) khiến không ai theo dõi được một lệnh đang kẹt ở đâu và phát sinh vòng lặp sự kiện! Đặc biệt, sau khi Bước (4) đã phát điện SWIFT ra nước ngoài thành công không thể thu hồi (**Pivot Transaction**), Bước (5) gặp lỗi khóa bảng tạm thời trong nội bộ. Hệ thống phải xử lý Bước (5) như thế nào?",
        options: [
          "Giữ nguyên Choreography và viết một hàm ở Bước (5) tự động hoàn trả lại toàn bộ tiền VNĐ vào tài khoản khách hàng ở Bước (1) mặc dù điện SWIFT ở Bước (4) đã bay sang Mỹ và tiền USD đã về tài khoản người nhận nước ngoài!",
          "Chuyển quy trình 6 bước phức tạp này từ Choreography sang **Saga Orchestrator** lưu máy trạng thái bền vững (`saga_state` trên DB) để kiểm soát tập trung và giám sát timeout rõ ràng; đồng thời xác định Bước (4) Phát điện SWIFT là **Giao dịch Chốt bản lề (Pivot Transaction — Điểm không thể quay đầu)**: mọi bước thất bại TRƯỚC Pivot (1, 2, 3) là **Compensatable Transactions** (được phép bù trừ hủy giữ tiền / nhả tỷ giá), còn mọi bước đứng SAU Pivot (5, 6) BẮT BUỘC là **Retriable Transactions (Forward Recovery)** — phải thử lại tiến về phía trước (kèm hàng đợi cảnh báo vận hành nếu kẹt lâu) cho tới khi hoàn tất 100%, TUYỆT ĐỐI KHÔNG chạy bù trừ hoàn tiền ngược về Bước (1)!",
          "Đặt một giao dịch `Distributed XA Transaction` mở khóa xuyên biên giới từ PostgreSQL nội bộ sang thẳng mạng liên ngân hàng toàn cầu SWIFT cho tới khi Bước (6) chạy xong.",
          "Khi Bước (5) lỗi thì xóa luôn bản ghi giao dịch ở cả 4 bước trước đó để coi như giao dịch chuyển tiền quốc tế này chưa từng diễn ra."
        ],
        answer: 1,
        walkthrough: {
          keyword: "luồng 6 bước chuyển tiền quốc tế ... Choreography rối rắm ... Bước (4) đã phát điện SWIFT ra nước ngoài thành công (Pivot Transaction) nhưng Bước (5) phân bổ phí nội bộ bị lỗi tạm thời",
          whyCorrect: "Chào bạn, khái niệm **Pivot Transaction (Giao dịch Bản lề)** của Chris Richardson chính là đỉnh cao lý thuyết lẫn thực hành của **Saga Pattern** mà rất ít ứng viên phân biệt rành mạch! Một luồng Saga chuẩn luôn chia làm 3 loại bước theo thứ tự: **1. Compensatable Transactions** (các bước có thể hoàn tác sạch sẽ bằng giao dịch bù trừ, như `CASA Hold`, `FX Quote Lock`); **2. Pivot Transaction** (bước quyết định thành bại một đi không trở lại — như phát điện `SWIFT pacs.008` đã thanh quyết toán quốc tế, giải ngân tiền mặt ra khỏi khay ATM, hoặc xuất hóa đơn thuế có mã cơ quan thuế: một khi bước này thành công là Saga ĐÃ THÀNH CÔNG VỀ MẶT NGHIỆP VỤ!); **3. Retriable Transactions** (các bước hậu xử lý nội bộ đứng sau Pivot như ghi phân bổ doanh thu phí chi nhánh, lưu hồ sơ kho chứng từ: các bước này phải được thiết kế đảm bảo chắc chắn thành công khi thử lại — **Forward Recovery**!). Nếu Bước (4) đã bắn tiền USD sang Mỹ rồi mà Bước (5) lỗi mạng nội bộ lại ngây thơ chạy Backward Compensation trả lại tiền VNĐ cho người gửi ở Bước (1) thì khách hàng vừa nhận được USD ở Mỹ vừa cầm lại nguyên cục tiền VNĐ ở Việt Nam! Ngoài ra, với quy trình >= 4–6 bước có rẽ nhánh và SLA phức tạp, **Orchestration** vượt trội hoàn toàn **Choreography** nhờ quản lý State Machine tập trung một chỗ!",
          whyWrong: [
            "Chạy bù trừ trả lại tiền gốc cho khách sau khi tiền thật đã chuyển ra nước ngoài qua mạng SWIFT là lỗi thiết kế gây thất thoát tài sản nghiêm trọng nhất!",
            "",
            "Mạng lưới viễn thông tài chính quốc tế SWIFT hoạt động theo cơ chế truyền thông điệp bất đồng bộ, hoàn toàn không tồn tại khái niệm cho ngân hàng bạn mở khóa `XA 2PC` lên máy chủ SWIFT toàn cầu!",
            "Xóa dấu vết 4 bước trước trong khi tiền thực trên tài khoản Nostro ngân hàng đại lý nước ngoài đã bị trừ sẽ gây lệch đối soát ngoại tệ nghiêm trọng."
          ],
          tip: "Đi phỏng vấn kiến trúc **Saga nâng cao**, hãy vẽ ngay 3 pha: **`[Compensatable Steps (Có thể bù trừ lùi)] -> [PIVOT STEP (Điểm không quay đầu)] -> [Retriable Steps (Bắt buộc Forward Recovery tiến tới đích)]`**, và chốt: **<= 3 bước đơn giản dùng Choreography, >= 4 bước tài chính phức tạp dùng Orchestration**!"
        }
      },
      {
        id: "R2-24",
        domain: "Saga, Resilience & Batch",
        lessonId: "M5",
        difficulty: "Thực chiến Senior",
        caseStudy: null,
        question: "Cổng Ngân hàng Số tích hợp dịch vụ Mua Bảo Hiểm Du Lịch của đối tác ngoài thông qua `InsurancePartnerClient` gắn `@CircuitBreaker(name = 'insurancePartner')` (ngưỡng mở mạch `failureRateThreshold = 50%` trên cửa sổ 100 cuộc gọi). Tuần vừa rồi phát sinh 2 sự cố gây bức xúc lớn: **(1)** Trong chương trình nhập mã ưu đãi, 65% khách hàng gõ sai mã hợp đồng khiến đối tác trả về `HTTP 400 / InvalidPolicyNumberException` — Resilience4j đếm luôn các lỗi nghiệp vụ 4xx này vào tỷ lệ thất bại vượt 50% và nhảy sang **`OPEN` ngắt cầu dao**, chặn đứng luôn cả 35% khách hàng nhập đúng! **(2)** Hôm sau đối tác bảo hiểm bị treo DB phản hồi chậm 28 giây ở mức lỗi 30% (chưa tới ngưỡng 50% để ngắt cầu dao), toàn bộ 200 luồng phục vụ của cổng Ngân hàng Số bị hút cạn vào chờ API bảo hiểm khiến tính năng Chuyển khoản và Xem số dư nội bộ cũng chết chùm! Bạn cấu hình lại Resilience4j như thế nào để triệt tiêu cả hai sự cố?",
        options: [
          "Tăng `failureRateThreshold` lên `100%` để cầu dao không bao giờ mở, và tăng số luồng Tomcat của cổng Ngân hàng Số lên `50.000` luồng.",
          "Gỡ bỏ hoàn toàn Resilience4j vì thư viện này không phân biệt được lỗi khách nhập sai với lỗi sập máy chủ đối tác.",
          "Đặt `@Retry(maxAttempts = 10)` bọc bên ngoài `@CircuitBreaker` cho cả lỗi nhập sai mã hợp đồng và tăng thời gian chờ HTTP `readTimeout` lên 120 giây.",
          "Khai báo danh sách `ignoreExceptions` (như `InvalidPolicyNumberException`, các lỗi nghiệp vụ `4xx`) hoặc bộ lọc `recordExceptionPredicate` trên `@CircuitBreaker` để CHỈ tính các lỗi hạ tầng thực sự (`5xx`, `IOException`, `TimeoutException`) vào tỷ lệ mở mạch; đồng thời áp đặt `connectTimeout` / `readTimeout` ngắn hợp lý (ví dụ `2s–3s`) kết hợp bọc **`@Bulkhead`** (giới hạn tối đa ví dụ 15–20 luồng đồng thời được phép gọi sang đối tác bảo hiểm) để dù đối tác bảo hiểm có treo cứng cũng không bao giờ chiếm quá 10% tài nguyên của cổng Ngân hàng Số!"
        ],
        answer: 3,
        walkthrough: {
          keyword: "khách gõ sai mã trả 400 InvalidPolicyNumberException làm CircuitBreaker nhảy OPEN nhầm ... đối tác chậm 28s hút cạn 200 luồng làm chết chùm Chuyển khoản nội bộ",
          whyCorrect: "Chào em, đây là tình huống kinh điển chứng minh vì sao **chỉ gắn mỗi `@CircuitBreaker` mặc định là CHƯA BAO GIỜ ĐỦ**! Hãy mổ xẻ cả hai vế: **Vế 1:** Mặc định của Resilience4j là *mọi ngoại lệ bay qua đều tính là 1 lần hỏng (failure)*! Nếu khách hàng nhập sai số hợp đồng, không đủ điều kiện mua hay sai ngày sinh (`400`, `404`, `422`), máy chủ đối tác thực chất vẫn đang sống khỏe re 100% — nếu không đưa các ngoại lệ nghiệp vụ này vào **`ignoreExceptions`**, chỉ cần một đợt khách nhập sai mã khuyến mãi là Circuit Breaker tưởng đối tác sập và cắt cầu dao oan ức! **Vế 2 (Sự khác biệt giữa Circuit Breaker và Bulkhead):** Circuit Breaker chỉ ngắt mạch **SAU KHI** đủ số lượng cuộc gọi kết thúc bằng lỗi vượt ngưỡng 50%. Khi đối tác treo lửng lơ 28 giây chưa trả kết quả (hoặc lỗi mấp mé 30%), cầu dao vẫn đóng (`CLOSED`), hàng trăm request cứ ùn ùn lao vào ngâm cứng toàn bộ 200 luồng của server (**Cascading Resource Exhaustion**)! Tấm vách ngăn chống chìm tàu lúc này chính là **Bulkhead Pattern** (`SemaphoreBulkhead` `maxConcurrentCalls = 15` kết hợp HTTP `readTimeout = 3s`): tính năng phụ mua bảo hiểm tối đa chỉ được phép tiêu xài đúng 15 chỗ, 185 luồng còn lại phục vụ Chuyển tiền và Xem số dư của ngân hàng vẫn chạy vèo vèo dưới 50ms hoàn toàn miễn nhiễm!",
          whyWrong: [
            "Đặt ngưỡng mở mạch 100% làm tê liệt tác dụng bảo vệ khi đối tác sập một phần (80–90% lỗi), còn tạo 50.000 OS Threads sẽ làm nổ bộ nhớ Native Stack giết chết Pod ngay lập tức.",
            "Resilience4j hỗ trợ cực kỳ linh hoạt `ignoreExceptions`, `recordExceptions` và `recordExceptionPredicate` — lỗi ở đây là do lập trình viên dùng cấu hình mặc định thiếu hiểu biết.",
            "Retry 10 lần cho lỗi khách gõ sai mã hợp đồng vừa vô nghĩa 100% vừa nhân gấp 10 lần tải thừa sang đối tác, còn `readTimeout = 120s` càng làm luồng bị ngâm chết lâu gấp 4 lần!",
            ""
          ],
          tip: "Bọc kết nối Đối tác Phụ (Bảo hiểm, Vé máy bay, Topup) vào Core App luôn phải đi đủ **Bộ Tam Giáp Sắt**: **`HTTP Timeout ngắn (2-3s)` + `Bulkhead (cô lập trần luồng tránh chết chùm Core)` + `CircuitBreaker (nhớ thêm ignoreExceptions cho mọi lỗi nghiệp vụ 4xx!)`**!"
        }
      },
      {
        id: "R2-25",
        domain: "Saga, Resilience & Batch",
        lessonId: "M6",
        difficulty: "Khó (Bẫy phỏng vấn)",
        caseStudy: null,
        question: "Job **Spring Batch** chốt Sao kê Thẻ Tín dụng & Phát hành Hóa đơn Thuế Điện tử chạy theo lô `chunk(500)`. Hiện tại bên trong `ItemProcessor`, lập trình viên vừa tính phí thường niên, vừa gọi trực tiếp HTTP POST sang cổng **Cơ quan Thuế** để cấp mã hóa đơn điện tử chính thức, rồi sang `ItemWriter` mới lưu 500 bản ghi vào bảng `card_statements`. Đêm qua tại bản ghi thứ `#498` trong một chunk 500 thẻ, có 1 thẻ cũ bị lỗi thiếu mã bưu chính làm ném ngoại lệ `InvalidBillingAddressException`: Spring Batch lập tức **Rollback giao dịch DB của cả chunk 500 dòng**, chuyển sang chế độ quét từng phần tử để cô lập dòng lỗi và chạy lại `ItemProcessor` cho 497 thẻ hợp lệ trước đó — hậu quả là **497 khách hàng bị phát hành trùng 2 tờ hóa đơn thuế hợp pháp** lên Cơ quan Thuế! Bạn cần thiết kế lại kiến trúc Job này như thế nào?",
        options: [
          "Tắt cơ chế Rollback của Spring Batch để khi gặp lỗi vẫn lưu bừa dữ liệu hỏng vào bảng `card_statements` mà không bao giờ chạy lại.",
          "Bọc lời gọi HTTP sang Cơ quan Thuế trong khối `synchronized` bên trong `ItemProcessor` và tăng kích thước chunk từ `500` lên `50.000`.",
          "Tuyệt đối KHÔNG đặt lời gọi HTTP có tác dụng phụ không thể rollback bên ngoài (như phát hành hóa đơn thuế, gửi SMS, trừ tiền cổng ngoài) trực tiếp bên trong `ItemProcessor` của một Chunk giao dịch DB! Cần tách sạch thành 2 bước độc lập: **Step 1** thuần túy tính toán và ghi Batch vào bảng `card_statements` + bảng hàng đợi `pending_tax_invoices` (có `invoice_idempotency_key` gắn theo kỳ sao kê + mã thẻ), cấu hình Fault-Tolerant `.faultTolerant().skip(InvalidBillingAddressException.class).skipLimit(1000)` kèm `SkipListener` ghi các thẻ lỗi dữ liệu sang bảng cách ly `quarantine_records` để xử lý riêng mà không làm gãy Job; **Step 2 (hoặc Worker bất đồng bộ)** đọc `pending_tax_invoices` gọi cổng Cơ quan Thuế kèm khóa lũy đẳng.",
          "Giảm `chunk(500)` xuống còn `chunk(1)` mở và đóng 15 triệu giao dịch Database riêng lẻ cho từng thẻ một và xóa hết mọi kiểm tra địa chỉ."
        ],
        answer: 2,
        walkthrough: {
          keyword: "gọi trực tiếp HTTP POST sang Cơ quan Thuế ngay trong ItemProcessor của chunk(500) ... bản ghi #498 lỗi làm rollback chunk và chạy lại phát hành trùng 497 hóa đơn thuế",
          whyCorrect: "Chào bạn, câu khép lại trọn bộ 50 câu hỏi Tuyển dụng Senior Java Ngân hàng là một cái bẫy thực chiến cực sâu của **Spring Batch Chunk-Oriented Processing**! Nhiều người quên mất cơ chế vận hành nội tại của Spring Batch khi gặp lỗi trong một Chunk: giả sử `chunk(500)` đọc 500 mục -> gọi `ItemProcessor.process()` lần lượt 500 lần -> gom đưa cho `ItemWriter.write()`. Nếu ở mục thứ `#498` ném ngoại lệ (hoặc lúc `write()` gặp 1 dòng vi phạm ràng buộc và bạn bật `skip`), Spring Batch sẽ **Rollback toàn bộ DB Transaction của chunk 500 dòng đó**, rồi khi quét dò lỗi (chunk scanning) hoặc restart step, nó **chạy lại `ItemProcessor` cho cả 497 mục đầu tiên**! Database thì rollback sạch về như chưa có gì, nhưng 497 lời gọi HTTP phát hành hóa đơn sang Cơ quan Thuế đã bay ra ngoài đời thực rồi làm sao mà rollback được?! Do đó, luật sắt của kiến trúc sư Batch là: **Biến `ItemProcessor` thành hàm tính toán thuần khiết (Pure / Side-effect-free Function)**! Tách bước tính sao kê lưu DB (kèm `SkipPolicy` + `SkipListener` đưa các bản ghi bẩn sang bảng `quarantine` cho nghiệp vụ sửa sáng hôm sau mà cả đoàn tàu 99,99% thẻ sạch vẫn về đích đúng giờ) ra khỏi bước phát hành hóa đơn ngoài có gắn `Idempotency-Key`!",
          whyWrong: [
            "Lưu dữ liệu sao kê tính dở dang/sai lệch xuống sổ sách thẻ tín dụng vi phạm nghiêm trọng tính toàn vẹn tài chính.",
            "`synchronized` không ngăn được việc Spring Batch gọi lại `ItemProcessor` sau khi rollback chunk; còn tăng `chunk` lên `50.000` làm hậu quả càng kinh hoàng hơn gấp 100 lần (lỗi dòng `#49.999` sẽ phát hành trùng 49.998 hóa đơn thuế!).",
            "",
            "`chunk(1)` triệt tiêu hoàn toàn hiệu năng Batch Processing (tốn hàng triệu lần fsync commit riêng lẻ làm Job chạy mất cả ngày không xong) và bỏ kiểm tra dữ liệu sẽ bị cổng Cơ quan Thuế từ chối hoặc phạt pháp lý."
          ],
          tip: "Nguyên tắc vàng cuối cùng với **Spring Batch Ngân hàng**: **1. `ItemProcessor` phải Thuần khiết / Lũy đẳng — CẤM gọi HTTP sinh tác dụng phụ ra ngoài bên trong Chunk DB!**; **2. Dữ liệu bẩn lẻ tẻ xử lý bằng `faultTolerant().skip(...)` + `SkipListener` đẩy vào bảng `Quarantine` để không vì 1 dòng lỗi làm trễ giờ mở cửa toàn ngân hàng!**"
        }
      }
    ]
  };

  window.EXAM_SETS.push(examR1, examR2);
})();
