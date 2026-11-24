/* Bộ Mô Phỏng Phỏng Vấn Vấn Đáp (30 Câu Hỏi Thực Chiến) & 4 Bài Tập Chấm Điểm Code Review Senior Java Ngân Hàng */

window.INTERVIEW_QUESTIONS = [
  // =========================================================================
  // NHÓM 1: Java Core, JVM & Đa luồng (IV-01 .. IV-05)
  // =========================================================================
  {
    id: "IV-01",
    category: "Java Core, JVM & Đa luồng",
    level: "Senior",
    lessonId: "J1",
    question: "Tại sao trong Core Banking tuyệt đối cấm dùng kiểu `double`/`float` hoặc constructor `new BigDecimal(0.1)` để tính tiền, lãi suất và phí? Khi so sánh hai số tiền `BigDecimal`, dùng `equals()` có bẫy ngầm nào?",
    interviewerIntent: "Kiểm tra nền tảng sống còn về số học tiền tệ chính xác (Exact Decimal Arithmetic), sự hiểu biết về biểu diễn nhị phân IEEE 754 và kinh nghiệm thực tế xử lý làm tròn kế toán (Banker's Rounding).",
    modelAnswer: "Trong chuẩn nhị phân IEEE 754, các phân số thập phân như `0.1` không thể biểu diễn hữu hạn ở hệ cơ số 2 mà mang giá trị xấp xỉ `0.10000000000000000555...`; do đó nếu truyền vào `new BigDecimal(0.1)`, đối tượng `BigDecimal` sẽ sao chép nguyên xi sai số nhị phân đó làm lệch số dư sổ cái khi nhân hàng triệu giao dịch. Chuẩn bắt buộc trong ngân hàng là khởi tạo từ chuỗi `new BigDecimal(\"0.1\")` hoặc `BigDecimal.valueOf(0.1)` kết hợp chỉ định rõ `scale` và `RoundingMode` (thường dùng `HALF_EVEN` cho tính lãi hoặc `HALF_UP` theo quy định sản phẩm) ở mọi phép chia. Đặc biệt, tuyệt đối không dùng `a.equals(b)` để so sánh giá trị tiền tệ vì `equals()` của `BigDecimal` so sánh cả `scale` (`new BigDecimal(\"100.0\").equals(new BigDecimal(\"100.00\"))` trả về `false`!). Mọi phép kiểm tra bằng nhau hoặc đủ số dư bắt buộc phải dùng `a.compareTo(b) == 0` (hoặc `>= 0`), và tốt nhất là đóng gói vào một Value Object `Money(BigDecimal amount, Currency currency)` bất biến chuẩn hóa sẵn `scale` ngay tại constructor.",
    keyPoints: [
      "Chỉ rõ sai số nhị phân IEEE 754 của `double` và sự khác biệt giữa `new BigDecimal(0.1)` với `new BigDecimal(\"0.1\")` / `BigDecimal.valueOf(0.1)`.",
      "Phân biệt rạch ròi `BigDecimal.equals()` (so cả `scale` và `unscaledValue`) với `compareTo() == 0` (chỉ so giá trị đại số).",
      "Luôn truyền tường minh `scale` + `RoundingMode` trong phép `divide()` để tránh nổ `ArithmeticException` khi gặp số thập phân vô hạn tuần hoàn (VD chia 365 ngày tính lãi)."
    ],
    redFlag: "Trả lời rằng 'Dùng `double` rồi lúc hiển thị ra màn hình dùng `Math.round()` làm tròn lại là được' hoặc dùng `equals()` để kiểm tra hai số tiền bằng nhau."
  },
  {
    id: "IV-02",
    category: "Java Core, JVM & Đa luồng",
    level: "Senior",
    lessonId: "J2",
    question: "Dịch vụ Payment Gateway kết nối chuyển mạch NAPAS chạy trên Heap 16GB thỉnh thoảng bị rớt kết nối socket và báo Timeout hàng loạt do chu kỳ Garbage Collection gây Stop-The-World (STW) kéo dài 2,5 giây. Trên Java 21 LTS, bạn chẩn đoán và tối ưu như thế nào?",
    interviewerIntent: "Đánh giá năng lực vận hành JVM tải cao ở tầng sâu: đọc GC Log/JFR, hiểu cơ chế G1GC vs Generational ZGC trên Java 21 và biết phân biệt giữa tinh chỉnh GC với rò rỉ bộ nhớ / cấp phát đối tượng lớn bất thường.",
    modelAnswer: "Trước khi vội đổi tham số JVM, tôi sẽ bật `-Xlog:gc*,safepoint:file=...` và thu thập Java Flight Recorder (JFR) quanh thời điểm khựng 2,5 giây để xác định xem STW đến từ Old Gen Full GC, Humongous Allocation (như parse chuỗi XML/JSON sao kê lớn trên G1GC) hay thậm chí là Safepoint stall do I/O. Về mặt thuật toán thu gom rác cho Payment Gateway yêu cầu độ trễ đuôi cực thấp (P99.9 < 50ms) trên Heap 16GB của Java 21, tôi sẽ chuyển từ G1GC sang **Generational ZGC (`-XX:+UseZGC -XX:+ZGenerational`)** vì ZGC thực hiện quét và dời vùng nhớ đồng thời (concurrent relocation với colored pointers & load barriers), giữ thời gian STW dưới **1 mili-giây** không phụ thuộc kích thước Heap. Song song đó, tôi đặt `-Xms` bằng `-Xmx` (trong khoảng ~70% RAM container để chừa chỗ cho Metaspace/Direct Memory), bật `-XX:+AlwaysPreTouch` lúc khởi động để tránh page fault giờ cao điểm và cấu hình `-XX:+HeapDumpOnOutOfMemoryError` ra ổ đĩa bền vững.",
    keyPoints: [
      "Chẩn đoán bằng dữ liệu trước (GC Log + Safepoint log + JFR / Humongous objects) thay vì đoán mò tham số.",
      "Đề xuất đúng **Generational ZGC (`-XX:+UseZGC -XX:+ZGenerational`)** trên Java 21 cho bài toán Heap lớn cần sub-millisecond pause.",
      "Nhớ ngân sách bộ nhớ Container (không đặt `-Xmx` chạm trần limit Pod gây `OOMKilled 137`) và đồng bộ `-Xms = -Xmx`."
    ],
    redFlag: "Đề xuất gọi `System.gc()` định kỳ bằng Cronjob trong code hoặc tăng Heap từ 16GB lên 64GB trên GC cũ (càng làm thời gian Full GC STW kéo dài lên 8–10 giây!)."
  },
  {
    id: "IV-03",
    category: "Java Core, JVM & Đa luồng",
    level: "Senior",
    lessonId: "J3",
    question: "Vì sao bộ quy chuẩn lập trình tại các ngân hàng cấm tuyệt đối `Executors.newFixedThreadPool()` và `Executors.newCachedThreadPool()`? Khi khởi tạo `ThreadPoolExecutor` tường minh cho luồng gọi đối tác thanh toán và luồng tính phí nội bộ, bạn thiết kế ra sao?",
    interviewerIntent: "Kiểm tra kinh nghiệm thực chiến về Concurrency, quản lý tài nguyên hữu hạn (Bounded Queue), chống hiệu ứng domino (Bulkhead) và hiểu tác động của từng `RejectedExecutionHandler`.",
    modelAnswer: "`newFixedThreadPool()` ngầm sử dụng `LinkedBlockingQueue` không giới hạn dung lượng (`Integer.MAX_VALUE` ~ 2,1 tỷ phần tử), nên khi đối tác chậm, hàng triệu request tồn đọng nhồi vào hàng đợi làm nổ `OutOfMemoryError` sập cả JVM; ngược lại `newCachedThreadPool()` cho phép `maximumPoolSize = Integer.MAX_VALUE`, sẽ đẻ ra hàng chục nghìn Platform Threads làm treo máy chủ vì cạn RAM Stack và bão Context Switching. Chuẩn ngân hàng bắt buộc khởi tạo `new ThreadPoolExecutor(...)` tường minh với **`ArrayBlockingQueue` hữu hạn**, đặt `ThreadFactory` có tên định danh rõ ràng (VD `napas-io-worker-%d`) phục vụ đọc Thread Dump kèm `TaskDecorator` truyền ngữ cảnh Slf4j MDC/`traceId`. Quan trọng nhất là **cô lập Thread Pool riêng biệt (Bulkhead)** cho từng đối tác bên ngoài để một đối tác chết không rút cạn luồng của Core App. Về chính sách từ chối khi đầy hàng đợi: với API thanh toán đối ngoại tôi dùng `AbortPolicy` để fail-fast trả mã `503/429` có kiểm soát ngay lập tức (tuyệt đối cẩn trọng với `CallerRunsPolicy` trên Tomcat HTTP thread vì nó sẽ bắt luồng nhận request của Tomcat đứng chờ mạng đối tác, làm nghẽn toàn bộ Web Server!).",
    keyPoints: [
      "Chỉ đích danh tử huyệt `Integer.MAX_VALUE` của `LinkedBlockingQueue` (trong FixedPool) và `maximumPoolSize` (trong CachedPool).",
      "Khởi tạo `ThreadPoolExecutor` với Bounded Queue + Named ThreadFactory + MDC/OTel Context Propagation + tách Pool theo đối tác (Bulkhead).",
      "Phân tích sắc bén bẫy `CallerRunsPolicy` làm nghẽn luồng Tomcat/Netty chính khi bọc tác vụ mạng chậm."
    ],
    redFlag: "Không biết bên trong `Executors.newFixedThreadPool()` dùng hàng đợi không giới hạn hoặc gộp chung 1 Thread Pool duy nhất cho cả gửi Email, gọi đối tác lẫn hạch toán."
  },
  {
    id: "IV-04",
    category: "Java Core, JVM & Đa luồng",
    level: "Senior",
    lessonId: "J4",
    question: "Khi nâng cấp microservice thẩm định eKYC/AML lên Java 21 và bật Virtual Threads (`spring.threads.virtual.enabled=true`), hệ thống được lợi ở đâu? Trường hợp nào gặp bẫy 'Carrier Thread Pinning' và việc bật Virtual Threads có giúp Database chịu tải gấp 10 lần không?",
    interviewerIntent: "Kiểm tra xem ứng viên có thực sự hiểu bản chất Project Loom dưới nắp máy hay chỉ chạy theo trào lưu bật cờ cấu hình một cách mù quáng.",
    modelAnswer: "Virtual Threads phát huy sức mạnh vượt trội ở các dịch vụ **I/O-bound có độ đồng thời cao** (như dịch vụ eKYC phải gọi đồng thời sang OCR, Face Match, C06/RAR, Sanction Screening): mỗi khi gặp blocking I/O, JVM tự động unmount Virtual Thread khỏi Platform Carrier Thread (chỉ tốn vài KB trên Heap thay vì 1MB OS Stack), giúp vài nhân CPU phục vụ hàng chục nghìn kết nối chờ mạng mà không cần viết code Reactive rối rắm. Tuy nhiên trên Java 21, nếu luồng thực thi gọi blocking I/O bên trong khối **`synchronized`** (hoặc hàm native JNI), Virtual Thread sẽ bị **ghim cứng (Pinned)** lên Carrier Thread khiến ForkJoinPool bị cạn luồng vật lý gây treo hệ thống — cách khắc phục là bật cờ `-Djdk.tracePinnedThreads=short` để rà soát và thay `synchronized` bọc I/O bằng **`ReentrantLock`**. Đặc biệt, Virtual Threads **KHÔNG làm Database nhanh hay khỏe hơn**: nếu bỏ giới hạn để 50.000 Virtual Threads lao thẳng xuống DB sẽ đánh sập PostgreSQL ngay lập tức, nên ta vẫn bắt buộc giữ **HikariCP Connection Pool nhỏ gọn** và dùng **`Semaphore` / Bulkhead** giới hạn mức độ đồng thời gọi xuống tài nguyên hữu hạn!",
    keyPoints: [
      "Hiểu rõ cơ chế mount/unmount của Virtual Threads phù hợp cho bài toán I/O-bound fan-out chứ không tăng tốc CPU-bound.",
      "Nêu đúng nguyên nhân **Carrier Thread Pinning** trên Java 21 (`synchronized` bọc blocking I/O) và giải pháp đổi sang `ReentrantLock`.",
      "Khẳng định rõ Virtual Threads không mở rộng năng lực chịu tải của DB — vẫn cần Semaphore/Connection Pool chặn áp lực ngược (Backpressure)."
    ],
    redFlag: "Tưởng rằng bật Virtual Threads thì xóa được HikariCP Pool cho phép mở 100.000 kết nối thẳng vào Database hoặc giúp vòng lặp tính toán mã hóa CPU chạy nhanh gấp 10 lần."
  },
  {
    id: "IV-05",
    category: "Java Core, JVM & Đa luồng",
    level: "Senior",
    lessonId: "J5",
    question: "Bạn cần thiết kế bộ nhớ đệm cục bộ trong JVM cho bảng Tỷ giá Ngoại tệ (FX Rate Cache) phục vụ 30.000 lượt đọc/giây và cập nhật nguyên tử mỗi 5 giây. Tại sao dùng `HashMap` thường trong Singleton Bean là thảm họa, và bạn cài đặt cấu trúc dữ liệu nào chuẩn nhất?",
    interviewerIntent: "Đánh giá kiến thức sâu về Java Memory Model (`volatile`, `happens-before`), tính bất biến (Immutability) và cơ chế nội tại của `ConcurrentHashMap`.",
    modelAnswer: "Đặt `HashMap` thường vào biến thành viên của một Spring Singleton Bean rồi vừa đọc vừa `put()` từ nhiều luồng sẽ gây mất dữ liệu (ghi đè bucket), đọc phải trạng thái trung gian sai lệch do thiếu quan hệ *happens-before* của JMM, hoặc làm hỏng cấu trúc con trỏ khi `resize()` تحت tải đồng thời. Với bài toán đọc cực lớn (30.000 QPS) và tập tỷ giá nhỏ (~100 cặp tiền tệ) cập nhật định kỳ cả bảng mỗi 5 giây, thiết kế tối ưu và nhanh nhất là dùng **`volatile Map<CurrencyPair, FxQuote> snapshot = Map.of(...)`** (hoặc `AtomicReference<ImmutableMap>`), trong đó `FxQuote` là Java `record` bất biến: luồng cập nhật dựng xong bản đồ bất biến mới hoàn chỉnh rồi mới trỏ tham chiếu `volatile` sang trong 1 phép gán nguyên tử — 30.000 luồng đọc hoàn toàn **Zero-Lock** và luôn nhìn thấy bộ tỷ giá nhất quán tại cùng một thời điểm! Còn nếu cần cập nhật lẻ từng cặp tiền theo sự kiện độc lập, tôi dùng **`ConcurrentHashMap`** kết hợp phương thức nguyên tử `compute()` (tận dụng đọc không khóa + CAS/khóa mức node bucket hẹp), tuyệt đối không tách rời `get()` rồi `put()` bên ngoài.",
    keyPoints: [
      "Giải thích rõ hậu quả Race Condition & Visibility (JMM) khi dùng `HashMap` không đồng bộ trong Singleton Service.",
      "Đề xuất giải pháp **Immutable Snapshot + `volatile` / `AtomicReference`** đạt hiệu năng đọc không khóa (Lock-free Read) và tính nhất quán toàn bảng.",
      "Sử dụng đúng các hàm hợp thành nguyên tử (`compute`, `merge`) trên `ConcurrentHashMap` với Value Object (`record`) bất biến."
    ],
    redFlag: "Bọc từ khóa `synchronized` thô bạo quanh toàn bộ phương thức `getRate()` bắt 30.000 luồng đọc mỗi giây phải xếp hàng chờ nhau tuần tự, hoặc sửa trực tiếp thuộc tính mutable bên trong object đang nằm trong Map."
  },

  // =========================================================================
  // NHÓM 2: Spring Boot, Transaction & JPA (IV-06 .. IV-10)
  // =========================================================================
  {
    id: "IV-06",
    category: "Spring Boot, Transaction & JPA",
    level: "Senior",
    lessonId: "S1",
    question: "Trong `TransferService`, phương thức `public processBatch()` (KHÔNG gắn `@Transactional`) gọi trực tiếp `this.transferSingleItem()` (CÓ gắn `@Transactional` ở mức `public` trong cùng class). Khi `transferSingleItem()` ném `RuntimeException` ở giữa chừng, giao dịch DB có được rollback không? Vì sao?",
    interviewerIntent: "Kiểm tra sự am hiểu tận gốc cơ chế Spring AOP Proxy (CGLIB/JDK Dynamic Proxy) — nguyên nhân gây ra những vụ lệch tiền 'ma ám' khó tìm nhất đối với lập trình viên chưa nắm vững Spring Internals.",
    modelAnswer: "Câu trả lời là **KHÔNG hề có giao dịch chung nào được mở và KHÔNG được rollback** (mỗi câu lệnh `repository.save()` bên trong sẽ tự chạy rồi auto-commit độc lập ngay lập tức, gây lệch tiền nghiêm trọng!). Nguyên nhân nằm ở kiến trúc **Spring AOP Proxy**: Spring kích hoạt `@Transactional` (cũng như `@Async`, `@Cacheable`, `@Retryable`) bằng cách bọc bên ngoài Bean gốc một lớp vỏ Proxy (`TransactionInterceptor`); chỉ những lời gọi đi từ Bean bên ngoài xuyên qua lớp vỏ Proxy mới được mở và quản lý Transaction. Khi `processBatch()` đã đi vào bên trong đối tượng thật (`target`) và gọi `this.transferSingleItem()`, lời gọi `this` đi tắt trực tiếp trong nội bộ object Java, **bỏ qua hoàn toàn lớp Proxy** (lỗi *Self-Invocation*). Cách khắc phục sạch sẽ và đúng kiến trúc nhất là **tách `SingleTransferProcessor` ra một Spring Bean độc lập** để tiêm vào gọi qua Proxy (tránh lạm dụng tự tiêm lại chính mình `@Lazy Self-Injection` hay ép `AopContext.currentProxy()` vốn làm rối thiết kế phụ thuộc).",
    keyPoints: [
      "Khẳng định dứt khoát giao dịch KHÔNG mở / KHÔNG rollback dẫn tới dữ liệu ghi dở dang do auto-commit từng lệnh lẻ.",
      "Giải thích chính xác cơ chế CGLIB Proxy + `TransactionInterceptor` bị đi vòng qua bởi lời gọi nội bộ `this.` (Self-Invocation).",
      "Mở rộng liên hệ sang cả `@Async`, `@Cacheable`, `@PreAuthorize` cũng dính chung bẫy này và nêu cách tách Bean sạch theo SRP."
    ],
    redFlag: "Trả lời rằng 'Miễn phương thức là `public` và ném `RuntimeException` thì chắc chắn Spring sẽ rollback bình thường'."
  },
  {
    id: "IV-07",
    category: "Spring Boot, Transaction & JPA",
    level: "Senior",
    lessonId: "S3",
    question: "Tại sao quy tắc kiến trúc của mọi ngân hàng đều cấm đặt lời gọi HTTP/SOAP/gRPC sang đối tác bên ngoài bên trong một hàm đang mở `@Transactional`? Bạn thiết kế lại biên giới Transaction cho luồng chuyển tiền liên ngân hàng như thế nào?",
    interviewerIntent: "Kiểm tra bài học xương máu về quản lý tài nguyên kết nối CSDL (HikariCP Starvation), thời gian giữ khóa dòng (Row Lock Duration) và tính nhất quán phân tán khi mạng lỗi.",
    modelAnswer: "Đặt lời gọi mạng bên trong `@Transactional` tạo ra 3 thảm họa cùng lúc: (1) `DataSourceTransactionManager` mượn và **giữ chặt kết nối HikariCP trong `ThreadLocal`** suốt thời gian chờ mạng — nếu đối tác lag 10 giây với pool 20 kết nối thì chỉ 2 request/giây đã làm cạn sạch Pool, kéo sập toàn bộ các API khác trong service; (2) Khóa dòng `SELECT FOR UPDATE` trên tài khoản nguồn/tài khoản GL bị ngâm suốt 10 giây gây tắc nghẽn dây chuyền; và (3) Nếu đối tác ĐÃ cộng tiền xong xuôi nhưng bước ghi nhận cuối cùng trong DB của ta gặp lỗi mạng nhỏ dẫn tới rollback, ta mất trắng dấu vết giao dịch đã gửi đi! Tôi luôn tách bằng `TransactionTemplate` (hoặc tách Service Bean) thành **3 pha cực ngắn (< 5ms DB/pha)**: **Pha 1 (`Tx1`)** kiểm tra hạn mức/số dư khả dụng, tạo bản ghi giao dịch `PENDING` và hạch toán khoanh giữ vào `Suspense GL` rồi **commit ngay để nhả kết nối DB**; **Pha 2 (Ngoài Transaction)** gọi HTTP đối tác qua Bulkhead/Timeout; **Pha 3 (`Tx2`)** dựa trên mã phản hồi rõ ràng để tất toán sang `Nostro`, hoàn nhả nếu đối tác từ chối cứng, hoặc giữ `PENDING` chờ tra soát/đối soát nếu gặp Timeout.",
    keyPoints: [
      "Phân tích rõ bài toán toán học cạn kiệt HikariCP Pool (`Pool Size / External Latency`) gây sập dây chuyền cả những API không liên quan.",
      "Chỉ ra rủi ro mất đồng bộ trạng thái (Rollback DB nội bộ trong khi đối tác bên ngoài đã thực thi lệnh không thể thu hồi).",
      "Thiết kế rành mạch mô hình **3 Pha (Tx1 Reserve/Pending -> Non-Tx External Call -> Tx2 Settle/Compensate/Hold)** dùng `TransactionTemplate` hoặc tách lớp."
    ],
    redFlag: "Đề xuất giữ nguyên `@Transactional` trùm toàn bộ hàm rồi chỉ tăng `hikari.maximum-pool-size` lên 500 kết nối cho đỡ thiếu."
  },
  {
    id: "IV-08",
    category: "Spring Boot, Transaction & JPA",
    level: "Senior",
    lessonId: "S3",
    question: "Trong luồng chuyển tiền, khi giao dịch bị từ chối do sai hạn mức hoặc lỗi nghiệp vụ ở bước cuối, toàn bộ bút toán hạch toán phải được rollback sạch sẽ, NHƯNG bản ghi nhật ký kiểm toán `security_audit_logs` (ghi rõ ai thực hiện, thời gian, lý do thất bại) bắt buộc vẫn phải được lưu bền vững vào Database. Bạn xử lý `Propagation` và ngoại lệ như thế nào?",
    interviewerIntent: "Kiểm tra sự hiểu biết sâu về vòng đời vật lý vs logic của Spring Transaction (`REQUIRED` vs `REQUIRES_NEW`), việc tiêu thụ kết nối DB thứ hai và bẫy `UnexpectedRollbackException`.",
    modelAnswer: "Nếu hàm ghi Audit Log dùng mức mặc định `Propagation.REQUIRED`, nó sẽ dùng chung chính giao dịch vật lý của luồng chuyển tiền nên khi luồng chính rollback, bản ghi Audit cũng bị cuốn trôi mất tích. Để giữ lại bản ghi Audit bất chấp luồng ngoài rollback, `AuditLogService.recordFailure()` (nằm ở một Bean riêng biệt) phải cấu hình **`@Transactional(propagation = Propagation.REQUIRES_NEW)`**: Spring sẽ tạm ngưng (suspend) giao dịch đang mở trên `ThreadLocal`, mượn **1 kết nối vật lý thứ 2** từ HikariCP để mở giao dịch độc lập, commit ngay bản ghi Audit rồi mới khôi phục giao dịch cũ để tiến hành rollback bút toán tiền tệ. Tuy nhiên ở cấp Senior cần lưu ý **2 cạm bẫy lớn của `REQUIRES_NEW`**: thứ nhất, mỗi request lúc đó chiếm đồng thời **2 DB connections** trên cùng 1 luồng — nếu Pool nhỏ và nhiều luồng cùng vào nhánh này có thể gây **Self-Deadlock Pool Starvation**; thứ hai, nếu hàm con `REQUIRES_NEW` ném ngoại lệ ra ngoài cũng cần bọc xử lý cẩn thận. Vì vậy ở các hệ thống tải cực cao (> 5.000 TPS), tôi còn cân nhắc đẩy sự kiện Audit thất bại bất đồng bộ qua hàng đợi bền vững để không chiếm gấp đôi kết nối DB chính.",
    keyPoints: [
      "Phân biệt chuẩn xác giao dịch vật lý dùng chung của `REQUIRED` với việc tạm treo và mở kết nối mới commit độc lập của `REQUIRES_NEW`.",
      "Nhớ điều kiện bắt buộc phải gọi sang **Bean khác** (tránh Self-Invocation làm vô hiệu hóa `REQUIRES_NEW`).",
      "Điểm ăn điểm Senior vượt trội: Cảnh báo nguy cơ **Connection Pool Deadlock** khi 1 luồng chiếm giữ đồng thời 2 kết nối HikariCP."
    ],
    redFlag: "Dùng `Propagation.NESTED` (Savepoint) nhưng sau đó vẫn để giao dịch cha bên ngoài rollback toàn cục — khi cha rollback thì toàn bộ Savepoint con của `NESTED` cũng bị hủy sạch chứ không được giữ lại!"
  },
  {
    id: "IV-09",
    category: "Spring Boot, Transaction & JPA",
    level: "Senior",
    lessonId: "S4",
    question: "API lấy danh sách 50 tài khoản doanh nghiệp kèm danh sách hạn mức ủy quyền bị chậm 3 giây vì bắn ra 51 câu SQL (lỗi N+1), đồng thời tiến trình lưu 50.000 dòng sao kê bằng `saveAll()` của Hibernate chạy mất tới 12 phút dù đã bật `hibernate.jdbc.batch_size=500`. Bạn chẩn đoán và tối ưu cả hai vấn đề ra sao?",
    interviewerIntent: "Kiểm tra trình độ làm chủ Hibernate/JPA dưới tầng SQL thực tế thay vì dùng ORM như chiếc hộp đen.",
    modelAnswer: "Ở vấn đề 1 (lỗi N+1 do quan hệ `@OneToMany` tải lười theo từng dòng cha): tôi tuyệt đối không đổi bừa sang `FetchType.EAGER` trên Entity (vì EAGER vẫn sinh N+1 khi truy vấn bằng JPQL!), mà dùng **`JOIN FETCH` / `@EntityGraph`** hoặc với các API chỉ đọc hiển thị Dashboard thì dùng thẳng **DTO / Interface Projection** gom đúng các cột cần thiết trong 1–2 câu SQL gọn nhẹ (không đẩy vào Persistence Context tránh tốn chi phí Dirty Checking, hoặc gắn `@Transactional(readOnly = true)`). Ở vấn đề 2 (bẫy kinh điển làm `saveAll()` mất 12 phút): thủ phạm số 1 là Entity đang dùng khóa chính **`@GeneratedValue(strategy = GenerationType.IDENTITY)`** — với `IDENTITY`, Hibernate buộc phải chạy từng câu `INSERT` đơn lẻ ngay lập tức để lấy ID tự tăng từ DB nên **tự động vô hiệu hóa hoàn toàn JDBC Batching** dù có cấu hình `batch_size=500`! Tôi sẽ chuyển sang dùng **`GenerationType.SEQUENCE` kèm `allocationSize = 50`** trên PostgreSQL/Oracle (hoặc dùng thẳng `JdbcTemplate.batchUpdate` / `COPY` cho khối lượng lớn 50.000 dòng), bật `order_inserts=true`, `reWriteBatchedInserts=true` trên driver Postgres và gọi `entityManager.flush(); entityManager.clear()` sau mỗi chunk 500 dòng để giải phóng bộ nhớ First-level Cache.",
    keyPoints: [
      "Xử lý N+1 bằng `JOIN FETCH` / `@EntityGraph` / DTO Projection + `@Transactional(readOnly = true)`, chỉ rõ bẫy `FetchType.EAGER` không diệt được N+1 của JPQL.",
      "Bắt trúng thủ phạm `GenerationType.IDENTITY` làm tắt ngấm Hibernate Batch Insert -> đổi sang `SEQUENCE` (`allocationSize`) hoặc `JdbcTemplate.batchUpdate` + `reWriteBatchedInserts=true`.",
      "Nhớ `flush()` + `clear()` Persistence Context theo từng lô để tránh nổ RAM và chậm dần cấp số nhân khi giữ 50.000 Entity."
    ],
    redFlag: "Khuyên bật `spring.jpa.open-in-view=true` (OSIV - vốn là anti-pattern giữ kết nối DB tới tận tầng render JSON!) hoặc đổi toàn bộ Entity sang `FetchType.EAGER`."
  },
  {
    id: "IV-10",
    category: "Spring Boot, Transaction & JPA",
    level: "Senior",
    lessonId: "S6",
    question: "Đội phát triển tự hào khoe độ phủ kiểm thử (Code Coverage) đạt 90% nhờ Mock toàn bộ Repository và dùng H2 In-Memory Database, nhưng vừa đưa lên Production ngày đầu tiên đã nổ lỗi cú pháp SQL Partition và lỗi Race Condition trừ âm tiền! Chiến lược Testing chuẩn cho hệ thống Ngân hàng của bạn là gì?",
    interviewerIntent: "Kiểm tra tư duy chất lượng phần mềm thực chất (Testing Fidelity) trong lĩnh vực tài chính, nơi một sai khác nhỏ về hành vi khóa dòng của DB cũng trả giá bằng tiền thật.",
    modelAnswer: "Code Coverage 90% bằng Mock và H2 tạo ra **ảo giác an toàn cực kỳ nguy hiểm** trong ngành ngân hàng: H2 có cơ chế quản lý khóa dòng (`SELECT FOR UPDATE NOWAIT/SKIP LOCKED`), mức cô lập MVCC, kiểu dữ liệu (`JSONB`, `NUMERIC`, Partitioning, `ON CONFLICT`) khác xa PostgreSQL hay Oracle thật, nên những lỗi chết người về Concurrency và Migration sẽ lọt thẳng lên Production! Chiến lược kiểm thử của tôi xoay quanh 4 trụ cột: (1) **Unit Test nhanh không cần Spring** kiểm chứng 100% logic miền nghiệp vụ thuần (làm tròn `BigDecimal`, cân bằng `Debit == Credit`, quy tắc phí); (2) **Integration Test với Testcontainers** khởi chạy **PostgreSQL, Redis và Kafka thật** kết hợp chạy toàn bộ script **Flyway thật**, trong đó bắt buộc có bài test đa luồng (`CountDownLatch` 30–50 luồng rút/chuyển tiền đồng thời chứng minh số dư không bao giờ âm và tổng tiền bảo toàn); (3) **Contract / External Fault Testing với WireMock** giả lập đủ kịch bản đối tác NAPAS trả `HTTP 504`, `ReadTimeout`, `DE39=68`, gói tin lỗi định dạng; và (4) **ArchUnit Test** tự động chặn đứng ngay trên CI nếu có ai viết lời gọi HTTP client bên trong class gắn `@Transactional` hoặc dùng `new BigDecimal(double)`.",
    keyPoints: [
      "Chỉ rõ sự khác biệt hành vi MVCC/Locking/SQL Dialect khiến H2 không đủ tin cậy cho bài toán tiền tệ.",
      "Ứng dụng **Testcontainers (Postgres + Redis + Kafka + Flyway thật)** kèm bài **Concurrency Invariant Test** đa luồng.",
      "Kết hợp **WireMock** kiểm thử nhánh lỗi mạng đối tác và **ArchUnit** cưỡng chế kỷ luật kiến trúc tự động trên CI."
    ],
    redFlag: "Chỉ chăm chăm chạy theo con số % Coverage bằng cách viết test cho các hàm getter/setter/DTO vô nghĩa và mock sạch mọi tương tác Database."
  },

  // =========================================================================
  // NHÓM 3: Database, Locking, Redis & Kafka (IV-11 .. IV-15)
  // =========================================================================
  {
    id: "IV-11",
    category: "Database, Locking, Redis & Kafka",
    level: "Senior",
    lessonId: "D3",
    question: "Kẻ tấn công dùng công cụ bắn đồng thời 20 request rút sạch tiền từ cùng 1 tài khoản ở cùng một mili-giây. Bạn hãy so sánh Optimistic Locking (`@Version`), Pessimistic Locking (`SELECT ... FOR UPDATE`) và Atomic Conditional `UPDATE` trong kịch bản này, đồng thời làm sao tránh Deadlock khi A chuyển cho B cùng lúc B chuyển cho A?",
    interviewerIntent: "Kiểm tra câu hỏi kinh điển nhất của mọi vòng phỏng vấn Ngân hàng & Ví điện tử: khả năng bảo vệ số dư trước Race Condition (Lost Update) và xử lý tranh chấp khóa.",
    modelAnswer: "Nếu code chỉ `SELECT balance` lên Java kiểm tra `if (balance >= amount)` rồi `save()` mà không có khóa, cả 20 luồng đều đọc thấy cùng số dư ban đầu và rút lố gấp 20 lần (**Lost Update**). Khi đặt lên bàn cân 3 cơ chế: (1) **Optimistic Locking (`@Version`)** không giữ khóa khi đọc mà kiểm tra `WHERE id = ? AND version = ?` lúc ghi — rất tốt cho các bản ghi ít đụng độ (như cập nhật hồ sơ khách hàng), nhưng với tài khoản giao dịch liên tục hoặc tài khoản thu hộ nóng, 19/20 luồng hợp lệ sẽ nổ `OptimisticLockingFailureException` gây bão retry lãng phí CPU; (2) **Atomic Conditional `UPDATE`** (`UPDATE accounts SET balance = balance - :amt WHERE id = :id AND balance >= :amt`) cực gọn và an toàn tuyệt đối cho thao tác trừ 1 tài khoản đơn lẻ; (3) **Pessimistic Locking (`SELECT ... FOR UPDATE` kèm `lock_timeout` ngắn)** là lựa chọn chuẩn xác nhất khi giao dịch Core Ledger cần kiểm tra phức hợp nhiều điều kiện và hạch toán đồng bộ nhiều tài khoản trong 1 Journal. Và để triệt tiêu **100% nguy cơ Deadlock** khi A chuyển B đồng thời B chuyển A, tôi luôn áp dụng **Deterministic Lock Ordering**: sắp xếp các `accountId` theo thứ tự tăng dần (`minId` khóa trước, `maxId` khóa sau) ở mọi luồng thực thi!",
    keyPoints: [
      "Hiểu rõ khi nào dùng Optimistic Lock (ít xung đột) vs Pessimistic Lock / Atomic Conditional UPDATE (số dư tài khoản tranh chấp cao).",
      "Nêu câu điều kiện nguyên tử ở tầng DB `WHERE id = :id AND available_balance >= :amt` làm chốt chặn thép.",
      "Giải bài toán Deadlock chuyển khoản chéo bằng quy tắc sắp xếp khóa theo thứ tự ID tăng dần cố định (`Deterministic Lock Ordering`)."
    ],
    redFlag: "Dùng từ khóa `synchronized` trong code Java để khóa số dư tài khoản — hoàn toàn vô tác dụng khi hệ thống chạy từ 2 Pod Kubernetes trở lên!"
  },
  {
    id: "IV-12",
    category: "Database, Locking, Redis & Kafka",
    level: "Senior",
    lessonId: "D5",
    question: "Hệ thống triển khai 1 Primary PostgreSQL và 2 Read Replicas để giảm tải đọc, kèm 20 Pod ứng dụng. Có hai vấn đề phát sinh: (1) Khách vừa chuyển tiền xong quay về màn hình chính đọc trúng Read Replica nên vẫn thấy số dư cũ chưa trừ, tưởng lỗi nên bấm chuyển lại; (2) Mỗi Pod đặt `HikariCP maximum-pool-size = 150` khiến DB liên tục quá tải CPU dù truy vấn nhẹ. Bạn giải quyết cả hai thế nào?",
    interviewerIntent: "Kiểm tra kinh nghiệm vận hành kiến trúc DB High Availability thực tế: bài toán Replication Lag (*Read-your-own-writes*) và công thức định cỡ Connection Pool chuẩn PostgreSQL.",
    modelAnswer: "Ở vấn đề 1, sao chép sang Read Replica luôn tồn tại độ trễ vài chục mili-giây đến vài giây (**Replication Lag**), vi phạm tính chất **Read-Your-Own-Writes Consistency** ngay sau giao dịch tài chính. Cách xử lý chuẩn của chúng tôi là: đối với mọi luồng kiểm tra số dư để quyết định hạch toán BẮT BUỘC luôn đọc từ **Primary**; còn với màn hình hiển thị số dư ngay sau khi khách vừa thực hiện giao dịch ghi, ngay tại thời điểm ghi thành công ta đánh dấu một cờ ngắn hạn trên Redis (`recent_write:{cif}` với TTL = `3–5 giây` hoặc lưu vị trí `pg_current_wal_lsn()`), để bộ định tuyến `AbstractRoutingDataSource` tự động hướng các truy vấn đọc của riêng khách hàng đó về **Primary** trong 5 giây đầu rồi mới trả lại về Read Replica! Ở vấn đề 2: 20 Pod x 150 = **3.000 kết nối vật lý** đổ vào 1 máy chủ PostgreSQL 32 vCPU là phản khoa học — theo công thức chuẩn của HikariCP/PostgreSQL (`connections ≈ core_count * 2 + spindle`), DB đạt thông lượng đỉnh ở khoảng 60–100 kết nối hoạt động, còn 3.000 tiến trình backend sẽ đốt sạch CPU vào OS Context Switching và tranh chấp LWLocks! Tôi sẽ hạ `maximum-pool-size` mỗi Pod xuống **15–20** (kết hợp đặt **PgBouncer** ở chế độ Transaction Pooling phía trước DB nếu có nhiều microservice).",
    keyPoints: [
      "Giải quyết triệt để lỗi *Read-your-own-writes* trên Read Replica bằng định tuyến thông minh theo cửa sổ ghi gần nhất (`recent_write:{cif}` TTL 5s hoặc kiểm tra WAL LSN).",
      "Áp dụng công thức định cỡ HikariCP chuẩn (nhỏ mà nhanh: 15–25 conn/Pod) thay vì cấp hàng trăm kết nối làm sập PostgreSQL vì Context Switching.",
      "Đề xuất tầng **PgBouncer (Transaction Pooling)** khi quy mô số lượng Pod / Microservices mở rộng lớn."
    ],
    redFlag: "Bắt màn hình Frontend `setTimeout` ngủ cứng 5 giây sau mọi giao dịch hoặc tăng thông số `max_connections` của PostgreSQL lên `10000`."
  },
  {
    id: "IV-13",
    category: "Database, Locking, Redis & Kafka",
    level: "Senior",
    lessonId: "D4",
    question: "Ngân hàng áp dụng quy định kiểm soát hạn mức chuyển tiền nhanh tối đa 500 triệu VNĐ/ngày cho mỗi khách hàng cá nhân ở tải hàng nghìn TPS. Nếu dùng Redis bằng cách gọi `GET` lấy tổng đã dùng lên Java, kiểm tra cộng thêm rồi gọi `SET` ghi lại thì gặp lỗi gì? Giải pháp nguyên tử và phương án dự phòng khi Redis gặp sự cố là gì?",
    interviewerIntent: "Kiểm tra kỹ năng sử dụng Redis ở cấp độ tài chính: tính nguyên tử của Lua Script, xử lý hoàn hạn mức khi giao dịch thất bại và tư duy không biến Cache thành Single Point of Failure.",
    modelAnswer: "Mô hình `GET -> Check trong Java -> SET` dính lỗi **Race Condition (TOCTOU)** kinh điển: nếu khách đã tiêu 400 triệu và bắn đồng thời 5 lệnh mỗi lệnh 100 triệu lên 5 Pod, cả 5 Pod cùng đọc thấy `400tr`, cùng cho qua và khách rút lố lên tới **900 triệu VNĐ**! Để kiểm tra và giữ chỗ hạn mức nguyên tử tuyệt đối trong 1 vòng mạng duy nhất dưới 1ms, tôi viết **Redis Lua Script** (vì Redis thực thi trọn vẹn từng Lua Script tuần tự không xen kẽ): script đọc tổng hạn mức ngày `used`, kiểm tra `if used + amount > dailyLimit then return 0`, nếu hợp lệ thì cộng `INCRBY` ngay lập tức, đặt `EXPIREAT` vào mốc `23:59:59` cuối ngày theo múi giờ ngân hàng và lưu mã `txnId` chống cộng trùng (nếu sau đó giao dịch hạch toán thất bại thì gọi script bù trừ trừ trả lại hạn mức). Quan trọng hơn cả, tuân thủ nguyên tắc **Redis không phải nguồn dữ liệu gốc duy nhất**: nếu khóa hạn mức của khách bị Cache Miss hoặc cụm Redis vừa failover trống dữ liệu, hệ thống nạp lại tổng chi tiêu trong ngày từ bảng tổng hợp trên Database (`Cache-Aside Rebuild` có khóa chống Stampede) để không bao giờ cho phép khách vượt rào hạn mức pháp lý!",
    keyPoints: [
      "Chỉ rõ lỗ hổng vượt hạn mức do Race Condition khi tách rời `GET` và `SET`/`INCRBY` giữa ứng dụng và Redis.",
      "Sử dụng **Atomic Redis Lua Script** kết hợp quản lý TTL chốt đúng mốc cuối ngày (`EXPIREAT` midnight) và cơ chế hoàn trả hạn mức (Rollback Reservation) nếu giao dịch lỗi.",
      "Có phương án khôi phục / Fallback tính tổng hạn mức từ Database khi Cache Miss hoặc Redis sự cố."
    ],
    redFlag: "Chỉ lưu hạn mức đã dùng trên mỗi Redis không có khả năng tính lại từ Database (nếu Redis flush hoặc failover mất bản ghi đồng bộ trễ là khách hàng lập tức được reset lại 500 triệu tiêu tiếp!)."
  },
  {
    id: "IV-14",
    category: "Database, Locking, Redis & Kafka",
    level: "Senior",
    lessonId: "M2",
    question: "Khi thiết kế Apache Kafka truyền sự kiện biến động số dư và hạch toán liên dịch vụ trong ngân hàng, bạn cấu hình Producer, Broker và Partition Key như thế nào để đảm bảo **không mất dù 1 bản tin khi Broker sập nguồn** VÀ **giữ đúng thứ tự giao dịch của từng tài khoản**?",
    interviewerIntent: "Kiểm tra chiều sâu cấu hình độ bền dữ liệu (Durability) và thứ tự cục bộ (Ordering) của Kafka chuẩn ngành tài chính thay vì để cấu hình mặc định.",
    modelAnswer: "Về độ bền dữ liệu không mất tin (Zero Data Loss), tôi cấu hình đồng bộ cả hai phía Producer và Topic/Broker: trên Producer đặt **`acks=all`** (`-1`), **`enable.idempotence=true`** (chống ghi trùng do retry mạng nội bộ nhờ `PID` + `Sequence Number`) và giới hạn `max.in.flight.requests.per.connection <= 5`; trên Topic/Broker cấu hình **`replication.factor=3`**, **`min.insync.replicas=2`** và tắt tuyệt đối `unclean.leader.election.enable=false` (không bao giờ bầu replica bị tụt hậu làm Leader gây mất giao dịch đã xác nhận!). Về thứ tự sự kiện: Kafka chỉ đảm bảo thứ tự nghiêm ngặt **bên trong từng Partition đơn lẻ**, nên tôi đặt **Partition Key chính là `accountNo` (hoặc `accountId`)** — nhờ đó mọi biến động cộng/trừ của cùng một tài khoản luôn đi vào đúng 1 Partition và được 1 luồng Consumer trong Group xử lý tuần tự đúng lịch sử (khách không bao giờ nhận tin báo giao dịch thứ 2 trước giao dịch thứ 1). Ngoài ra lưu ý không tự ý tăng số lượng Partition trực tiếp trên Topic đang chạy nóng nếu logic phụ thuộc chặt vào phép băm `murmur2(accountNo) % numPartitions`, nên cần quy hoạch dư số Partition ngay từ đầu (VD 24 hoặc 48 partitions).",
    keyPoints: [
      "Bộ tứ cấu hình chống mất tin chuẩn vàng: `acks=all` + `enable.idempotence=true` + `replication.factor=3` + `min.insync.replicas=2` (+ `unclean.leader.election=false`).",
      "Đặt **Partition Key = `accountNo`** để bảo toàn thứ tự biến động số dư theo từng tài khoản trong khi vẫn mở rộng song song hàng chục Partition cho toàn ngân hàng.",
      "Cảnh báo tác động lệch định tuyến khóa khi thay đổi số lượng Partition lúc hệ thống đang vận hành."
    ],
    redFlag: "Để `acks=1` (Leader vừa ghi RAM xong chưa kịp chép sang Follower đã sập nguồn là mất trắng tin!) hoặc tưởng rằng Kafka đảm bảo thứ tự FIFO toàn cục xuyên qua mọi Partition khi để `key = null`."
  },
  {
    id: "IV-15",
    category: "Database, Locking, Redis & Kafka",
    level: "Senior",
    lessonId: "M3",
    question: "Sau khi Core Ledger thực thi xong giao dịch ghi DB trừ tiền khách hàng, dòng code ngay bên dưới gọi `kafkaTemplate.send()` để báo sang Payment Hub/Notification thì đúng khoảnh khắc đó Pod bị mất mạng hoặc OOMKilled (bài toán Dual-Write). Bạn giải quyết triệt để cả chiều phát lẫn chiều nhận như thế nào?",
    interviewerIntent: "Kiểm tra sự thành thạo về **Transactional Outbox Pattern** và **Idempotent Consumer (Inbox Pattern)** — hai viên gạch nền tảng của kiến trúc Microservices tin cậy.",
    modelAnswer: "Vừa commit PostgreSQL vừa gọi `kafkaTemplate.send()` trực tiếp trên 2 hệ thống hạ tầng rời rạc không có giao dịch nguyên tử chung chắc chắn sẽ dính lỗi **Dual-Write**: nếu commit DB xong mà rớt mạng Kafka thì sự kiện biến mất vĩnh viễn; còn nếu gửi Kafka trước rồi commit DB bị lỗi rollback thì phát đi sự kiện 'ma' chưa hề trừ tiền! Tôi giải quyết triệt để ở chiều phát bằng **Transactional Outbox Pattern**: ngay bên trong **cùng một `@Transactional` ACID của PostgreSQL** ghi bút toán `ledger_postings`, ta `INSERT` luôn bản tin sự kiện vào bảng `outbox_events` — hoặc cả hai cùng thành công, hoặc cả hai cùng rollback 100%! Sau đó tiến trình **Debezium CDC** đọc trực tiếp từ WAL log của Postgres (hoặc Polling Relay dùng `SELECT ... FOR UPDATE SKIP LOCKED`) đẩy sự kiện từ bảng `outbox_events` lên Kafka theo cơ chế *At-Least-Once*. Và vì *At-Least-Once* có thể phát lặp gói tin khi mạng chập chờn hoặc Consumer Group rebalance, ở chiều nhận tôi bắt buộc xây dựng **Idempotent Consumer (Inbox Pattern)**: trong cùng Transaction xử lý nghiệp vụ của dịch vụ đích, thực hiện `INSERT INTO processed_events(event_id)` có ràng buộc khóa chính `UNIQUE` — nếu trùng `event_id` thì bỏ qua an toàn tuyệt đối!",
    keyPoints: [
      "Phân tích gãy gọn cả 2 kịch bản lỗi của Dual-Write (commit DB xong mất Kafka vs gửi Kafka xong rollback DB).",
      "Triển khai **Transactional Outbox Pattern** (ghi chung Local DB Transaction + Debezium CDC hoặc `SKIP LOCKED` Relay).",
      "Ghép đôi bắt buộc với **Idempotent Consumer (`processed_events` UNIQUE constraint)** ở chiều nhận để biến *At-Least-Once* thành *Effectively-Once*."
    ],
    redFlag: "Bọc `try-catch` quanh `kafkaTemplate.send()` rồi dùng `Thread.sleep` retry trong RAM — Pod bị OOMKilled hay sập nguồn là toàn bộ dữ liệu nằm trong RAM mất sạch không còn dấu vết!"
  },

  // =========================================================================
  // NHÓM 4: Nghiệp vụ Core Banking & Thanh toán (IV-16 .. IV-20)
  // =========================================================================
  {
    id: "IV-16",
    category: "Nghiệp vụ Core Banking & Thanh toán",
    level: "Senior",
    lessonId: "B1",
    question: "Hãy giải thích nguyên lý Sổ cái Kế toán Kép (Double-Entry Ledger) trong Core Banking và phân biệt rõ `Ledger Balance` với `Available Balance` qua ví dụ một giao dịch quẹt thẻ / chuyển tiền liên ngân hàng.",
    interviewerIntent: "Đánh giá xem ứng viên có tư duy miền nghiệp vụ Ngân hàng chuẩn mực hay vẫn thiết kế hệ thống tiền tệ kiểu 'trừ cột `balance` trong bảng `users`' như làm game.",
    modelAnswer: "Trong Core Banking, tiền không bao giờ tự nhiên sinh ra hay mất đi mà chỉ dịch chuyển từ tài khoản này sang tài khoản khác theo nguyên lý **Kế toán Kép bất biến (Immutable Double-Entry Accounting)**: mỗi sự kiện tài chính tạo ra 1 chứng từ `Journal` chứa tối thiểu 2 dòng bút toán `Posting` (Nợ `DEBIT` và Có `CREDIT`) luôn thỏa mãn phương trình cứng `SUM(Debit) == SUM(Credit)` (ví dụ khách chuyển 10 triệu + phí 1.100đ sẽ ghi Nợ CASA khách 10.001.100đ đối ứng với Có GL Thanh toán 10.000.000đ + Có GL Doanh thu phí 1.000đ + Có GL Thuế VAT 100đ), và các dòng bút toán đã ghi **chỉ được thêm mới (Append-only), cấm tuyệt đối sửa/xóa**. Bên cạnh đó, hệ thống luôn tách bạch 2 loại số dư: **`Ledger Balance` (Số dư sổ cái)** là số tiền thực tế đã quyết toán trên sổ kế toán, còn **`Available Balance` (Số dư khả dụng = `Ledger Balance - Active Holds + Overdraft Limit`)** là số tiền khách thực sự được phép tiêu lúc này. Ví dụ khi khách quẹt thẻ khách sạn cấp phép trước (Pre-authorization) 5 triệu hoặc lệnh chuyển tiền nhanh đang chờ kết quả đối tác, hệ thống tạo bản ghi `Hold` 5 triệu làm `Available Balance` giảm ngay lập tức để chống khách rút tiêu trùng ở cây ATM, trong khi `Ledger Balance` chỉ biến động khi giao dịch được quyết toán thực sự!",
    keyPoints: [
      "Nắm chắc cấu trúc `Journal` + `Postings` bất biến (Append-only) với bất biến toán học `SUM(Debit) == SUM(Credit)` và hệ thống tài khoản tổng hợp GL / CASA.",
      "Phân biệt chính xác công thức `Available Balance = Ledger Balance - Hold + Overdraft` kèm ví dụ thực tế khoanh giữ tiền (`Hold`).",
      "Mọi điều chỉnh/hoàn trả đều sinh bút toán đảo chiều mới thay vì `UPDATE`/`DELETE` dòng lịch sử."
    ],
    redFlag: "Thiết kế bảng `accounts` chỉ có duy nhất 1 cột `balance` và sửa trực tiếp `SET balance = balance - amount` mà không có bảng bút toán đối ứng hay cơ chế khoanh giữ `Hold`."
  },
  {
    id: "IV-17",
    category: "Nghiệp vụ Core Banking & Thanh toán",
    level: "Senior",
    lessonId: "B2",
    question: "Khi dịch vụ Thanh toán gửi thông điệp chuyển tiền nhanh sang cổng NAPAS (hoặc điện tài chính ISO 8583 MTI `0200`) nhưng hết thời gian chờ nhận về lỗi `ReadTimeoutException` hoặc mã phản hồi `DE39 = 68`, tại sao bạn TUYỆT ĐỐI KHÔNG ĐƯỢC hoàn tiền ngay cho khách hàng? Luồng xử lý chuẩn là gì?",
    interviewerIntent: "Câu hỏi 'sát hạch sinh tử' bắt buộc phải vượt qua khi ứng tuyển vào bất kỳ vị trí Payment Gateway / Core Banking / Ví điện tử nào.",
    modelAnswer: "Trong mạng phân tán liên ngân hàng, lỗi `ReadTimeout` hoặc `ISO 8583 DE39 = 68` không có nghĩa là giao dịch thất bại, mà có nghĩa là **Trạng thái Không xác định (Unknown / Doubtful State)**: gói tin yêu cầu rất có thể ĐÃ sang tới ngân hàng thụ hưởng và tiền ĐÃ nổi trong tài khoản người nhận, chỉ có gói phản hồi chiều về bị đứt mạng! Nếu hệ thống ngây thơ tự động hoàn tiền ngay lập tức ở giây thứ 31, kẻ gian hoặc người dùng sẽ rút/chuyển đi tiếp lần nữa khiến ngân hàng phát hành **mất đứt gấp đôi số tiền** mà không thể đòi lại! Quy trình chuẩn Production mà tôi triển khai gồm 4 bước: (1) Giữ nguyên khoản tiền đã trích/khoanh của khách ở tài khoản treo trung gian **`Suspense GL`** và gắn trạng thái giao dịch là `PENDING_PARTNER`; (2) Hiển thị thông báo minh bạch trên App *'Giao dịch đang chờ xác nhận từ ngân hàng thụ hưởng, quý khách vui lòng không thực hiện lại lệnh mới'* để tránh khách bấm đúp; (3) Đẩy giao dịch vào Worker thực hiện **Truy vấn trạng thái (`Inquiry / Investigation`)** theo lịch lùi mũ (hoặc phát điện Đảo giao dịch `MTI 0420` đúng chuẩn quy định đối với luồng ATM/POS cho phép Reversal); và (4) Chỉ thực sự hoàn tiền về CASA hoặc tất toán sang `Nostro` khi nhận được trạng thái cuối xác thực từ chuyển mạch hoặc sau phiên **Đối soát quyết toán T+0/T+1**!",
    keyPoints: [
      "Khẳng định nguyên tắc sắt đá: **`Timeout / 504 / DE39=68` == `UNKNOWN STATE`**, nghiêm cấm hoàn tiền tự động mù quáng!",
      "Hạch toán treo an toàn tại tài khoản trung gian **`Suspense GL`** và truyền thông rõ trạng thái `PENDING` trên giao diện khách hàng.",
      "Phối hợp nhịp nhàng cơ chế **Status Inquiry / ISO 8583 `0420` Reversal** (tùy quy định kênh thẻ hay IBFT 24/7) và chốt hạ bằng **Đối soát T+0/T+1**."
    ],
    redFlag: "Bọc `catch (ResourceAccessException e)` rồi gọi ngay `refundCustomer()` trả tiền về tài khoản khách hàng ngay tức khắc hoặc tự sinh mã giao dịch mới bắn lại lệnh chuyển tiền lần 2."
  },
  {
    id: "IV-18",
    category: "Nghiệp vụ Core Banking & Thanh toán",
    level: "Senior",
    lessonId: "B3",
    question: "Hãy phân tích luồng nghiệp vụ 2 bước của Chuyển tiền Nhanh NAPAS 24/7 (IBFT) kết hợp mã VietQR động cho đơn hàng thương mại điện tử. Làm thế nào chống gian lận từ khâu quét mã cho tới khâu nhận Webhook báo có gạch nợ đơn hàng?",
    interviewerIntent: "Kiểm tra kinh nghiệm thực tế triển khai VietQR, Tài khoản định danh (Virtual Account - VA) và tích hợp Payment Webhook an toàn tại thị trường Việt Nam.",
    modelAnswer: "Luồng NAPAS 24/7 IBFT chuẩn luôn đi qua 2 chặng: **Bước 1 (`Account Inquiry`)** gửi mã BIN ngân hàng nhận + số tài khoản/số thẻ/VA để xác minh tài khoản tồn tại hợp lệ và lấy tên chủ tài khoản hiển thị cho người chuyển kiểm tra; **Bước 2 (`Fund Transfer`)** thực hiện hạch toán chuyển vốn tức thời (ở phía ngân hàng phát hành, ta ràng buộc phiên `inquiryToken` để chống tráo đổi số tài khoản đích giữa 2 bước). Với thanh toán đơn hàng bằng **VietQR động chuẩn EMVCo**, phương án tối ưu nhất hiện nay tại các ngân hàng Việt Nam là cấp cho mỗi đơn hàng (hoặc mỗi cửa hàng/hóa đơn) một **Tài khoản định danh ảo (Dynamic Virtual Account - VA)** nhúng vào cấu trúc TLV của EMVCo (kèm số tiền ở Tag 54, nội dung đơn hàng ở Tag 62 và mã kiểm tra toàn vẹn **CRC-16/CCITT-FALSE** 4 ký tự Hex ở Tag `6304`). Khi tiền về VA, ngân hàng kiểm tra ngay ở bước Inquiry/Credit của VA (nếu cấu hình VA thu đúng số tiền cố định có thể từ chối thẳng nếu khách cố tình sửa thiếu tiền!), sau đó bắn **Payment Webhook** sang hệ thống bán hàng. Phía nhận Webhook bắt buộc kiểm chứng đủ 4 lớp: **Xác thực chữ ký số JWS/RSA trên body + Chống Replay/Idempotency theo `bankTxnId` + Khớp mã đơn hàng/VA + Kiểm tra `actualPaidAmount >= orderAmount`** rồi mới cho phép xuất hàng!",
    keyPoints: [
      "Nắm vững luồng 2 bước `Inquiry -> Transfer` của NAPAS 24/7 và giải pháp **Virtual Account (VA)** định danh tự động từng hóa đơn.",
      "Hiểu cấu trúc chuỗi EMVCo TLV và thuật toán kiểm tra **CRC-16/CCITT-FALSE** tại Tag `6304` của VietQR.",
      "Chốt chặt 4 điều kiện sống còn khi xử lý Payment Webhook: **Chữ ký số + Idempotency `bankTxnId` + Đúng mã đơn + Đủ số tiền thực nhận**."
    ],
    redFlag: "Cho phép trình duyệt Frontend của người mua tự gọi API `POST /orders/mark-paid` sau khi màn hình quét QR đóng lại hoặc nhận Webhook gạch nợ đơn hàng mà không kiểm tra chữ ký số và số tiền thực chuyển."
  },
  {
    id: "IV-19",
    category: "Nghiệp vụ Core Banking & Thanh toán",
    level: "Senior",
    lessonId: "B4",
    question: "Hệ thống Đối soát Tự động (Automated Reconciliation T+0/T+1) trong ngân hàng hoạt động như thế nào giữa 3 nguồn dữ liệu (Core Ledger - Payment Hub - NAPAS/Đối tác)? Bạn phân loại và xử lý các trường hợp chênh lệch ra sao?",
    interviewerIntent: "Kiểm tra xem ứng viên có hiểu bức tranh khép kín cuối ngày của dòng tiền ngân hàng (Clearing & Settlement) và cách thiết kế Batch xử lý hàng triệu bản ghi hay không.",
    modelAnswer: "Trong ngân hàng, mọi kênh thanh toán kết nối ra ngoài đều bắt buộc có quy trình **Đối soát 3 bên (3-Way Reconciliation)** đối chiếu giữa **Sổ cái Core Banking**, **Nhật ký giao dịch Payment Hub** và **Tệp quyết toán chính thức có chữ ký số của Tổ chức chuyển mạch/Đối tác** (như file quyết toán phiên của NAPAS hoặc sao kê `camt.053`). Về mặt kỹ thuật, để khớp 2–5 triệu giao dịch trong vài chục giây mà không tốn RAM, chúng tôi chuẩn hóa khóa đối soát (`RRN` + `STAN` + `SettlementDate`), sắp xếp hai luồng dữ liệu theo cùng thứ tự khóa và chạy **Streaming Sort-Merge Scan** theo từng chunk trong Spring Batch. Kết quả đối soát luôn phân loại rạch ròi 4 kịch bản lệch để định tuyến xử lý: (1) **`STATUS_MISMATCH` trên các khoản đang treo `Suspense GL`** (ta ghi `PENDING`, file đối tác xác nhận `SUCCESS` -> tự động hạch toán tất toán từ `Suspense GL` sang `Nostro`; nếu file xác nhận không tồn tại/thất bại sau hết cửa sổ quyết toán -> hoàn trả từ `Suspense GL` về `CASA` khách); (2) **`MISSING_IN_PARTNER`** nhưng ta lỡ báo thành công hoặc ngược lại **`MISSING_IN_CORE`** (chiều đến đối tác đã ghi nhận mà Core chưa cộng cho khách) -> sinh bút toán hạch toán bù tự động theo quy tắc được duyệt hoặc tạo hồ sơ tra soát khẩn cấp kèm cảnh báo cho bộ phận Vận hành Thanh toán xử lý ngay đầu giờ sáng.",
    keyPoints: [
      "Trình bày rõ mô hình **Đối soát 3 bên (Core - Payment Hub - Partner Settlement File)** thay vì chỉ nhìn dữ liệu nội bộ.",
      "Sử dụng thuật toán **Streaming Sort-Merge** theo chunk trong Spring Batch (có tính năng Restartability) thay vì nạp toàn bộ vào bộ nhớ.",
      "Phân loại rõ 4 nhóm lệch (`MATCHED`, `MISSING_IN_PARTNER`, `MISSING_IN_CORE`, `AMOUNT/STATUS_MISMATCH`) gắn với quy tắc giải tỏa tài khoản `Suspense GL` và quy trình Maker-Checker."
    ],
    redFlag: "Chỉ viết câu lệnh SQL `SUM(amount)` so tổng tiền cả ngày giữa hai bên mà không khớp chi tiết từng giao dịch theo mã tham chiếu."
  },
  {
    id: "IV-20",
    category: "Nghiệp vụ Core Banking & Thanh toán",
    level: "Senior",
    lessonId: "M4",
    question: "Khi thiết kế luồng Thanh toán Hóa đơn / Mua vé máy bay đi qua nhiều Microservices (Account -> Promotion -> Partner Gateway -> Notification), tại sao ngân hàng không dùng giao dịch phân tán 2PC/XA mà chọn Saga Pattern? Giao dịch bù trừ (Compensating Transaction) trong ngân hàng có điểm gì đặc biệt?",
    interviewerIntent: "Kiểm tra tư duy kiến trúc phân tán thực tiễn: hiểu nhược điểm khóa đồng bộ của 2PC, sự khác nhau giữa Orchestration vs Choreography Saga và tính chất kế toán của bước bù trừ.",
    modelAnswer: "Giao thức **2PC/XA** đòi hỏi một Coordinator khóa chặt tài nguyên đồng bộ trên tất cả các Database tham gia cho tới khi bên chậm nhất phản hồi (nếu Coordinator chết ở pha Prepare sẽ gây treo khóa vô thời hạn), làm sụp đổ thông lượng ở quy mô lớn — và quan trọng nhất là các đối tác bên ngoài như Hãng hàng không hay NAPAS chỉ giao tiếp qua REST/ISO chứ **không bao giờ mở cổng XA Database** cho ta nối vào! Vì vậy với luồng thanh toán phức hợp cần kiểm soát chặt trạng thái, tôi chọn **Orchestration-based Saga** (một State Machine bền vững điều phối rõ ràng từng bước, dễ giám sát và xử lý timeout hơn hẳn Choreography bắn sự kiện chằng chịt). Luồng đi theo mẫu **Semantic Lock (`Try/Reserve -> Confirm -> Cancel`)**: Bước 1 khoanh giữ tiền (`Hold`) + giữ chỗ mã giảm giá; Bước 2 gọi xuất vé tại đối tác; Bước 3 nếu thành công thì cắt tiền thật, nếu đối tác từ chối rõ ràng thì kích hoạt chuỗi **Compensating Transactions** theo thứ tự ngược lại. Điểm đặc thù sống còn trong ngân hàng là: **Bù trừ KHÔNG BAO GIỜ là xóa (`DELETE`) bản ghi đã ghi**, mà là thực thi một nghiệp vụ đảo chiều tường minh (nhả `Hold` hoặc sinh `Reversal/Refund Journal` mới có tính lũy đẳng `Idempotent` để dù bước bù trừ bị retry nhiều lần cũng chỉ hoàn tiền đúng 1 lần duy nhất!).",
    keyPoints: [
      "Nêu rõ 2 lý do loại bỏ 2PC/XA: nghẽn khóa đồng bộ làm tụt TPS/SLA và bất khả thi khi tích hợp qua REST/HTTP với đối tác ngoài.",
      "Ưu tiên **Saga Orchestrator** kết hợp **Semantic Lock (`HOLD` / `PENDING`)** ở bước đầu để cách ly rủi ro thiếu tiền hoặc rút trùng.",
      "Nhấn mạnh bản chất **Compensating Transaction trong ngân hàng**: phải là bút toán đảo chiều bất biến (không `DELETE`) và bắt buộc **Idempotent**."
    ],
    redFlag: "Thiết kế Saga trừ thẳng tiền thật không có trạng thái trung gian/Semantic Lock, hoặc khi bù trừ thì chạy lệnh `DELETE FROM transactions` xóa dấu vết cũ."
  },

  // =========================================================================
  // NHÓM 5: Bảo mật Ngân hàng, Frontend & BFF (IV-21 .. IV-25)
  // =========================================================================
  {
    id: "IV-21",
    category: "Bảo mật Ngân hàng, Frontend & BFF",
    level: "Senior",
    lessonId: "K5",
    question: "Lỗ hổng đứng đầu bảng OWASP API Security Top 10 và hay bị khai thác nhất trên các ứng dụng Ngân hàng là **BOLA / IDOR**. Hãy nêu một kịch bản tấn công thực tế và cách bạn thiết kế chốt chặn kỹ thuật sao cho lập trình viên mới trong team cũng khó lòng viết sót lỗi này?",
    interviewerIntent: "Kiểm tra tư duy bảo mật kiến trúc ở cấp độ hệ thống (Secure-by-Design) thay vì chỉ vá lẻ tẻ từng API mỗi khi bị đội Pentest báo lỗi.",
    modelAnswer: "Kịch bản kinh điển của **BOLA (Broken Object Level Authorization - OWASP API1)** là kẻ tấn công đăng nhập hợp pháp bằng tài khoản thật của hắn (có JWT hợp lệ 100%), sau đó bắt gói tin API `GET /api/v1/accounts/102000555/statements` hoặc `GET /api/v1/loans/{loanId}` rồi đổi số tài khoản trên đường dẫn sang tài khoản của người khác — nếu Backend chỉ kiểm tra *'Đã đăng nhập chưa?'* mà quên kiểm tra *'Tài khoản này có thuộc chủ sở hữu đang đăng nhập không?'*, toàn bộ sao kê khách VIP sẽ bị tuồn sạch! Để phòng thủ hệ thống khiến Junior trong team cũng không dễ làm lọt lỗi, tôi áp dụng 3 lớp khóa: (1) **Tuyệt đối không bao giờ nhận `cif` hay `userId` từ Query/Body của Client**, mà viết một `@CurrentCif` ArgumentResolver trích xuất `cif` trực tiếp từ JWT đã xác thực trong `SecurityContext`; (2) Thiết kế tầng Repository của các miền nhạy cảm **bắt buộc truyền kèm `ownerCif` trong chữ ký hàm** (VD: `findByAccountNoAndOwnerCif(String accNo, String cif)`, xóa bỏ hoặc hạn chế scope hàm `findByAccountNo` trần trụi, kiểm chứng tự động bằng rule **ArchUnit** trên CI); và (3) Áp dụng thêm `@PreAuthorize(\"@accountOwnershipGuard.canAccess(#accountNo, authentication)\")` kèm ghi cảnh báo SIEM tức thời nếu phát hiện 1 CIF cố tình truy vấn sang tài nguyên không thuộc quyền sở hữu!",
    keyPoints: [
      "Phân biệt rạch ròi giữa Authentication (JWT hợp lệ) với Object-Level Authorization (quyền sở hữu đúng tài nguyên cụ thể đó).",
      "Trích xuất `cif` duy nhất từ `SecurityContext` phía Server + ép buộc chữ ký hàm Repository luôn gắn kèm `AndOwnerCif`.",
      "Tự động hóa kiểm soát bằng `@PreAuthorize` Guard Bean, ArchUnit CI rule và cảnh báo SIEM phát hiện hành vi rà quét tài khoản."
    ],
    redFlag: "Chỉ mã hóa Base64 số tài khoản trên URL rồi tin rằng kẻ tấn công không đoán được nên bỏ qua bước kiểm tra quyền sở hữu trên Backend."
  },
  {
    id: "IV-22",
    category: "Bảo mật Ngân hàng, Frontend & BFF",
    level: "Senior",
    lessonId: "K4",
    question: "Khi thiết kế hệ thống liên quan đến Thẻ thanh toán theo tiêu chuẩn **PCI-DSS 4.0**, những trường dữ liệu nào bị cấm tuyệt đối lưu trữ sau bước cấp phép, dữ liệu nào được lưu kèm điều kiện gì, và kiến trúc **Tokenization + CDE** giúp ích như thế nào cho toàn ngân hàng?",
    interviewerIntent: "Kiểm tra kiến thức tuân thủ pháp lý - bảo mật thẻ quốc tế bắt buộc phải biết khi làm việc tại Ngân hàng, Cổng thanh toán (VNPay, Napas, OnePay) hay Ví điện tử.",
    modelAnswer: "PCI-DSS 4.0 chia dữ liệu thẻ thành 2 nhóm với ranh giới sinh tử: Nhóm **SAD (Sensitive Authentication Data)** gồm mã bảo mật **`CVV2/CVC2/CID`**, **`PIN / PIN Block`** và **`Full Magnetic Stripe / Chip Track Data`** bị **CẤM TUYỆT ĐỐI lưu trữ dưới bất kỳ hình thức nào sau khi hoàn tất cấp phép (post-authorization)** — kể cả đã mã hóa bằng AES-256 hay khóa HSM cũng trượt kiểm toán ngay lập tức! Nhóm **CHD (Cardholder Data)** đứng đầu là **số thẻ đầy đủ `PAN` (16 số)**: được phép lưu khi có lý do nghiệp vụ nhưng bắt buộc làm cho không đọc được bằng mã hóa mạnh (AES-256 với khóa quản lý trong **HSM**), băm một chiều có khóa muối mạnh hoặc cắt ngắn, và khi hiển thị ra màn hình/biên lai/log chỉ được phép lộ tối đa **6 số BIN đầu và 4 số cuối** (`411111******1234`). Về kiến trúc, nếu để số `PAN` thật đi qua 30 microservices, cả 30 dịch vụ và cụm Kafka/DB đều bị kéo vào vùng kiểm toán **CDE (Cardholder Data Environment)** cực kỳ tốn kém và rủi ro. Do đó, chúng tôi cô lập duy nhất dịch vụ **Card Vault** bên trong vùng mạng **CDE** khóa chặt tường lửa hai chiều để thực hiện **Payment Tokenization**: đổi `PAN` thật thành một `Card Token` ngẫu nhiên vô nghĩa trả ra cho toàn bộ các dịch vụ App, Giao dịch, Loyalty, Báo cáo bên ngoài sử dụng an toàn!",
    keyPoints: [
      "Thuộc lòng lệnh cấm sắt đá của PCI-DSS: **Không bao giờ lưu `CVV2`, `PIN Block`, `Track Data` sau cấp phép kể cả đã mã hóa**.",
      "Nắm rõ quy tắc bảo vệ `PAN` (mã hóa khóa HSM + che mờ chuẩn **tối đa 6 đầu - 4 cuối**, cài đặt Logback Masking chặn lọt PAN ra log).",
      "Thiết kế tách vùng mạng **CDE** + **Card Vault Tokenization** để giảm 90% phạm vi kiểm toán (PCI Scope Reduction) cho hệ sinh thái Microservices."
    ],
    redFlag: "Trả lời rằng 'Mã CVV2 rất nhạy cảm nên em mã hóa AES-256 lưu vào cột `encrypted_cvv` trong Database để lần sau khách thanh toán 1-click không cần nhập lại'."
  },
  {
    id: "IV-23",
    category: "Bảo mật Ngân hàng, Frontend & BFF",
    level: "Senior",
    lessonId: "K6",
    question: "Tại sao mã SMS OTP hay TOTP 6 số truyền thống bị đánh giá là không đủ an toàn cho các giao dịch chuyển tiền giá trị lớn trước tấn công Phishing / Man-in-the-Browser? Thuật toán **Smart OTP (OCRA - RFC 6287)** giải quyết điểm yếu cốt lõi đó như thế nào?",
    interviewerIntent: "Kiểm tra sự am hiểu về các phương thức xác thực giao dịch hiện đại (Dynamic Linking / Transaction Signing) theo quy định an toàn bảo mật NHNN.",
    modelAnswer: "Điểm yếu chí tử của SMS OTP hay TOTP truyền thống (RFC 6238) là mã 6 số đó **hoàn toàn độc lập với nội dung giao dịch**: nó chỉ phụ thuộc vào khóa hạt giống và thời gian. Nếu khách hàng bị lừa nhập OTP lên trang giả mạo (Real-time Phishing Proxy) hoặc máy tính bị nhiễm mã độc Man-in-the-Browser âm thầm tráo lệnh *'Chuyển 5 triệu cho bạn'* thành *'Chuyển 500 triệu cho tài khoản kẻ gian'*, mã SMS OTP 6 số mà khách vừa gõ vẫn hợp lệ 100% cho lệnh chuyển 500 triệu đã bị đánh tráo! Cơ chế **Smart OTP theo chuẩn OCRA (OATH Challenge-Response Algorithm - RFC 6287)** khắc phục tận gốc bằng nguyên lý **Liên kết động dữ liệu giao dịch (Dynamic Transaction Binding)**: máy chủ tạo mã thách thức gắn liền với `txnId`, đồng thời ứng dụng Smart OTP trên thiết bị đã đăng ký hiển thị rõ trên màn hình tin cậy *'Số tiền: 500.000.000 VNĐ - Tài khoản nhận: 1903xxx'* và băm trực tiếp `HMAC(deviceSecret, serverChallenge | toAccountNo | amount | currency)` để sinh ra mã OTP (hoặc dùng khóa bất đối xứng trong Secure Enclave/Keystore của điện thoại ký số trực tiếp lên payload giao dịch). Chỉ cần 1 ký tự của số tài khoản nhận hay 1 đồng số tiền bị sửa đổi trên đường truyền, kết quả kiểm chứng phía Server sẽ sai khác hoàn toàn và chặn đứng giao dịch ngay tức khắc!",
    keyPoints: [
      "Chỉ rõ lỗ hổng bản chất của SMS OTP / TOTP: không ràng buộc ngữ cảnh người nhận và số tiền (dễ dính Real-time Phishing & MitB).",
      "Giải thích cơ chế **OCRA (RFC 6287) / Dynamic Linking**: đưa `challenge + toAccountNo + amount` vào hàm mật mã học với khóa gắn chặt thiết bị (Device-bound Secret).",
      "Kết hợp hiển thị thông tin giao dịch rõ ràng (What You See Is What You Sign - WYSIWYS) kèm giới hạn số lần nhập sai và tiêu hủy challenge ngay sau 1 lần dùng."
    ],
    redFlag: "Nghĩ rằng Smart OTP chỉ đơn giản là đưa thuật toán Google Authenticator TOTP vào trong App ngân hàng để tiết kiệm tiền cước gửi tin nhắn SMS cho nhà mạng."
  },
  {
    id: "IV-24",
    category: "Bảo mật Ngân hàng, Frontend & BFF",
    level: "Senior",
    lessonId: "F1",
    question: "Ở vai trò Senior thiết kế cổng Web Internet Banking (React/Angular SPA), tại sao lưu `access_token` và `refresh_token` trong `localStorage` luôn bị Khối An toàn Thông tin ngân hàng bác bỏ? Bạn thiết kế mô hình **BFF + Cookie + CORS + CSRF** như thế nào cho chuẩn xác?",
    interviewerIntent: "Đánh giá năng lực Full-Stack Security thực thụ của một Backend Senior: hiểu rõ cơ chế bảo mật trình duyệt (SOP, CORS, Cookie flags, XSS vs CSRF).",
    modelAnswer: "`localStorage` và `sessionStorage` có thể bị đọc tự do bởi bất kỳ đoạn mã JavaScript nào chạy cùng Origin — trong một ứng dụng SPA hiện đại kéo theo hàng trăm thư viện npm, chỉ cần dính một lỗ hổng XSS nhỏ hoặc tấn công chuỗi cung ứng (Supply-chain script) là kẻ tấn công lấy cắp trọn vẹn `refresh_token` dài hạn mang về máy chủ riêng chiếm đoạt tài khoản! Kiến trúc chuẩn OAuth 2.0 cho Web Banking hiện nay là mô hình **BFF (Backend-for-Frontend) Token Handler**: toàn bộ OAuth2 `access_token` và `refresh_token` được giữ kín hoàn toàn ở phía Server BFF (lưu trong Redis mã hóa), còn trình duyệt chỉ nhận duy nhất một Session Cookie đặt tên theo chuẩn tiền tố **`__Host-sess`** với đầy đủ các cờ **`HttpOnly; Secure; Path=/; SameSite=Strict`** (nhờ `HttpOnly`, JavaScript bị XSS cũng không thể trích xuất mang Cookie đi nơi khác được). Để bảo vệ giao tiếp giữa `https://ib.bank.vn` và `https://bff.bank.vn`: tôi cấu hình **CORS Allowlist tường minh đúng Origin `https://ib.bank.vn`** kèm `Allow-Credentials: true` (tuyệt đối cấm dấu `*`), bắt buộc kiểm tra **Anti-CSRF Token** (hoặc custom header kết hợp kiểm chứng `Origin` header) trên mọi request làm thay đổi dữ liệu và khóa chặt **`Content-Security-Policy`** trên trình duyệt!",
    keyPoints: [
      "Giải thích rõ bề mặt tấn công XSS đánh cắp sạch Token dài hạn khi lưu trong `localStorage`/`sessionStorage`.",
      "Thiết kế chuẩn **BFF Token Handler** giữ OAuth2 Token phía Server + cấp Cookie **`__Host-` (`HttpOnly; Secure; SameSite=Strict`)**.",
      "Nắm vững sự phối hợp giữa **Explicit CORS Origin Allowlist** (không bao giờ dùng `*` với Credentials), **CSRF Protection** và **CSP**."
    ],
    redFlag: "Đề xuất cấu hình `Access-Control-Allow-Origin: *` đi kèm `Access-Control-Allow-Credentials: true` (cấu hình sai đặc tả trình duyệt!) hoặc bảo rằng 'Bật HTTPS là chống được XSS đọc `localStorage`'."
  },
  {
    id: "IV-25",
    category: "Bảo mật Ngân hàng, Frontend & BFF",
    level: "Senior",
    lessonId: "F2",
    question: "Trên màn hình Chuyển khoản Web / Quầy giao dịch, khách hàng sốt ruột bấm liên tiếp 3 lần nút 'Xác nhận' khi mạng lag, đồng thời Frontend đang dùng kiểu `Number` của JavaScript nhân tỷ lệ phí `0.0011` để tạo chuỗi ký xác nhận. Hai đầu Frontend và Backend phải phối hợp thiết kế như thế nào để triệt tiêu mọi lỗi?",
    interviewerIntent: "Kiểm tra khả năng thiết kế hợp đồng tích hợp đầu-cuối (End-to-End API Contract) chặt chẽ giữa giao diện người dùng và hệ thống hạch toán lõi.",
    modelAnswer: "Về bài toán số học tiền tệ giữa hai đầu: kiểu `Number` của JavaScript dùng chuẩn IEEE 754 dấu phẩy động 64-bit (chỉ an toàn cho số nguyên tới `Number.MAX_SAFE_INTEGER = 9.007.199.254.740.991` và sai số ngay với phép nhân thập phân như `300 * 0.0011`), nên quy tắc hợp đồng API chuẩn của tôi là **truyền mọi giá trị tiền tệ trong JSON dưới dạng chuỗi thập phân chính xác (`\"150000000\"`)**, phía Backend đóng vai trò **nguồn chân lý duy nhất (Single Source of Truth)** tính sẵn tiền phí, thuế VAT bằng `BigDecimal` trả về qua API tạm tính (`Quote/Fee Preview`) để người dùng xác nhận và ký số (trên Frontend nếu cần tính toán hiển thị chỉ dùng `Decimal.js` hoặc `BigInt`, tuyệt đối không dùng phép nhân `float` của JS). Về bài toán bấm đúp 3 lần khi mạng lag, chúng tôi phòng thủ khép kín cả 2 đầu: (1) Ở **Frontend**, ngay khi mở/chốt biểu mẫu giao dịch thì khởi tạo sẵn **1 mã `Idempotency-Key` duy nhất gắn với ý định giao dịch đó**, dùng trạng thái khóa nút bấm / toán tử **`exhaustMap`** chặn đứng cú click thứ 2 và thứ 3 khi request đầu đang bay, và nếu mạng đứt khách bấm *'Thử lại'* thì **giữ nguyên chính `Idempotency-Key` đó** gửi lại; (2) Ở **Backend**, cổng Idempotency thực thi khóa nguyên tử `INSERT ... ON CONFLICT DO NOTHING` theo `(cif, idempotencyKey)` kèm kiểm tra `payloadHash` để đảm bảo dù có 10 request lọt qua mạng cũng chỉ hạch toán đúng 1 lần duy nhất!",
    keyPoints: [
      "Truyền tiền tệ trong JSON dạng `String` + Backend tính phí chuẩn bằng `BigDecimal` (Frontend dùng `Decimal.js`/`BigInt`, cấm nhân số thực JS `Number`).",
      "Phối hợp nhịp nhàng ở Frontend: khóa nút bấm / `exhaustMap` chặn spam click + **giữ cố định `Idempotency-Key` theo ý định giao dịch (không sinh mã mới khi retry mạng!)**.",
      "Chốt chặn cuối cùng ở Backend: Atomic Idempotency Record (`IN_PROGRESS` / `COMPLETED`) kiểm chứng cả `payloadHash`."
    ],
    redFlag: "Chỉ dùng thuộc tính `disabled` trên nút HTML ở Frontend mà Backend không có `Idempotency-Key`, hoặc mỗi lần gọi hàm `onClick` lại gọi `uuidv4()` tạo mã mới tinh."
  },

  // =========================================================================
  // NHÓM 6: System Design, Sự cố Production & Tình huống (IV-26 .. IV-30)
  // =========================================================================
  {
    id: "IV-26",
    category: "System Design, Sự cố Production & Tình huống",
    level: "Senior",
    lessonId: "A1",
    question: "Bài toán System Design kinh điển: Thiết kế giải pháp cho phép 5.000 người dân trên cả nước cùng chuyển tiền ủng hộ vào **ĐÚNG 1 SỐ TÀI KHOẢN THIỆN NGUYỆN DUY NHẤT** mỗi giây (5.000 TPS trên 1 tài khoản đích) mà không làm nghẽn khóa Database, vẫn đảm bảo sổ cái chính xác tuyệt đối đến từng đồng.",
    interviewerIntent: "Câu hỏi phân định ranh giới rõ rệt nhất giữa Mid-level và Senior/Architect: nhận diện giới hạn vật lý của khóa dòng đơn lẻ (Row Lock Contention) và kỹ thuật chia nhỏ tranh chấp (Account Striping).",
    modelAnswer: "Điểm nghẽn chí mạng ở đây không nằm ở CPU hay dung lượng đĩa của Database, mà nằm ở **Row-level Exclusive Lock Contention**: nếu mỗi giao dịch giữ khóa dòng của tài khoản thiện nguyện mất trung bình `4ms`, thì 1 dòng vật lý duy nhất chỉ có thể xử lý tuần tự tối đa `1000ms / 4ms = 250 TPS` — 4.750 giao dịch/giây còn lại sẽ xếp hàng dài dằng dặc làm nổ Timeout toàn hệ thống! Chìa khóa hóa giải nằm ở tính chất nghiệp vụ: tài khoản thiện nguyện/thu hộ nhận 5.000 lệnh/giây toàn bộ là chiều **Ghi Có cộng thêm (`CREDIT`)** vốn có tính giao hoán, không lo bị rút âm ở chiều nhận! Tôi thiết kế cơ chế **Sub-account Bucketing (Account Striping)** ngay trong Core Ledger: khi một tài khoản được cấu hình (hoặc hệ thống tự phát hiện vượt ngưỡng tranh chấp nóng) là *Hot Credit Account*, sổ cái chia tài khoản đó thành **64 tài khoản phụ nội bộ (`CHARITY_ACC#00` .. `CHARITY_ACC#63`)** trải đều trên các phân vùng. Khi người dân chuyển tiền, tài khoản nguồn của từng người dân vẫn bị khóa kiểm tra số dư khả dụng bình thường (không nghẽn vì là 5.000 người khác nhau!), còn vế Ghi Có sẽ băm `hash(txnId) % 64` ghi vào 1 trong 64 bucket độc lập — đẩy trần thông lượng vọt lên `64 * 250 = 16.000 TPS` giữ nguyên 100% tính ACID! Một tiến trình nền chạy mỗi vài giây sẽ gộp số dư (Sweep/Roll-up) về tài khoản hiển thị chính, và nếu chủ quỹ cần rút chi tiền thì thu gom qua các bucket có kiểm soát.",
    keyPoints: [
      "Tính toán ngay bằng con số vật lý: `Max TPS trên 1 dòng khóa = 1000ms / Lock Hold Time` (~200–250 TPS) để chứng minh tại sao mở rộng phần cứng thường là vô ích.",
      "Tận dụng tính chất giao hoán của chiều Ghi Có (`Credit-only`) để áp dụng **Sub-account Bucketing / Striping (32–64 buckets)** giữ trọn ACID mà không nghẽn khóa.",
      "Giải thích trọn vẹn cách hiển thị tổng số dư (Periodic Roll-up / Cached Sum) và cách xử lý chiều Ghi Nợ (Debit Sweep) khi quỹ rút tiền."
    ],
    redFlag: "Đề xuất bỏ khóa giao dịch cộng tiền trong bộ nhớ tạm của từng Pod rồi cuối ngày mới lưu xuống DB (mất điện Pod nào là bốc hơi tiền quyên góp của hàng vạn người dân!)."
  },
  {
    id: "IV-27",
    category: "System Design, Sự cố Production & Tình huống",
    level: "Senior",
    lessonId: "O5",
    question: "Đúng 09h30 sáng ngày mùng 5 trả lương cao điểm, còi cảnh báo P1 rú vang: dịch vụ Core Transfer vọt P99 latency lên 25 giây, tỷ lệ lỗi `500/504` chạm 40% kèm dòng log `HikariPool-1 - Connection is not available, request timed out after 3000ms`, trong khi CPU của cả Pod ứng dụng lẫn máy chủ PostgreSQL đều chỉ ở mức 12%! Trong 15 phút đầu tiên, bạn chỉ huy xử lý theo trình tự nào?",
    interviewerIntent: "Kiểm tra bản lĩnh thực chiến trực sự cố nghiêm trọng (Incident Response): bình tĩnh phân tích triệu chứng bất đối xứng (Pool cạn nhưng CPU DB thấp), bảo toàn bằng chứng và cầm máu thần tốc.",
    modelAnswer: "Triệu chứng *'HikariCP cạn sạch kết nối nhưng CPU PostgreSQL chỉ 12%'* là dấu hiệu kinh điển chỉ thẳng vào 2 nghi phạm hàng đầu: hoặc **ứng dụng đang giữ rịt DB Connection chờ một lời gọi mạng ngoài bị treo (HTTP gọi đối tác trong `@Transactional`)**, hoặc đang có **khóa chờ dây chuyền (Lock Wait / Idle in Transaction)** trong DB! Trong 15 phút vàng đầu tiên, tôi tuyệt đối ngăn anh em bấm restart mù quáng toàn cụm làm mất dấu vết, mà điều hành song song 3 mũi: **Phút 1–3 (Chẩn đoán nhanh & Lưu hiện trường)**: tách 1 Pod đang nghẽn ra khỏi Service Load Balancer (đổi label/Readiness), chạy ngay `jcmd <pid> Thread.print` chụp 3 bản Thread Dump cách nhau 5s và trên Postgres kiểm tra bảng `pg_stat_activity` (`wait_event_type`, `state = 'idle in transaction'`, `pg_blocking_pids()`) — chưa đầy 60 giây Thread Dump sẽ chỉ đích danh tên hàm Java đang ôm kết nối đứng chờ! **Phút 4–8 (Cầm máu khẩn cấp - Mitigation)**: nếu do một tính năng phụ/cổng đối tác thứ ba bị lag kéo cạn Pool chung, lập tức bật **Feature Kill-Switch / mở Circuit Breaker cưỡng bức** ngắt luồng gọi đối tác đó (hoặc hủy câu lệnh giữ khóa đầu sỏ `pg_terminate_backend` nếu là phiên treo) giúp toàn bộ Pool giải phóng tức khắc trong vài giây! **Phút 9–15**: xác nhận chỉ số P99 và tỷ lệ thành công về xanh bình thường, rà soát xem có giao dịch nào rơi vào trạng thái `PENDING` cần đối soát không, rồi mới họp viết Post-mortem tách `@Transactional` và bổ sung Bulkhead vĩnh viễn.",
    keyPoints: [
      "Đọc vị sắc lẹm triệu chứng *Pool cạn + CPU DB thấp* = giữ Connection chờ I/O ngoài hoặc kẹt Lock (`idle in transaction`), không phải thiếu CPU.",
      "Kỷ luật vàng: **Cô lập 1 Pod chụp Thread Dump (`jcmd`) + soi `pg_stat_activity` trong 60 giây đầu** trước khi động tay restart.",
      "Ưu tiên **Cầm máu (Kill-Switch / Circuit Breaker / cắt luồng phụ gây nghẽn)** khôi phục dịch vụ trong vài phút thay vì ngồi sửa code build lại giữa đám cháy."
    ],
    redFlag: "Ra lệnh xóa khởi động lại toàn bộ các Pod ngay lập tức mà không lấy Thread Dump (2 phút sau toàn bộ Pod mới lại kẹt cứng y hệt mà không ai biết tại sao!)."
  },
  {
    id: "IV-28",
    category: "System Design, Sự cố Production & Tình huống",
    level: "Senior",
    lessonId: "O2",
    question: "Mỗi khi đội triển khai thực hiện `RollingUpdate` phiên bản mới cho dịch vụ Thanh toán trên Kubernetes vào ban ngày, hệ thống luôn xuất hiện khoảng 30–50 giao dịch bị lỗi `502 Bad Gateway` hoặc đứt kết nối ngang xương. Hãy giải thích cơ chế bất đồng bộ bên trong Kubernetes gây ra lỗi này và bộ cấu hình Zero-Downtime hoàn chỉnh.",
    interviewerIntent: "Kiểm tra sự hiểu biết sâu về vòng đời hủy Pod trên Kubernetes (Race Condition giữa `SIGTERM` và cập nhật `EndpointSlice`/Ingress) — kiến thức bắt buộc của Senior vận hành Cloud-native.",
    modelAnswer: "Nhiều người lầm tưởng Kubernetes gỡ IP của Pod khỏi Load Balancer xong xuôi rồi mới gửi tín hiệu tắt ứng dụng, nhưng thực tế hai việc này diễn ra **song song bất đồng bộ**! Ngay khoảnh khắc Pod chuyển sang trạng thái `Terminating`: luồng 1 Kubelet bắn tín hiệu `SIGTERM` thẳng vào JVM làm Spring Boot đóng cổng lắng nghe ngay lập tức, trong khi luồng 2 thông báo gỡ IP của Pod phải đi qua API Server -> EndpointSlice Controller -> `kube-proxy` (cập nhật `iptables`/`IPVS`) và Ingress Controller mất từ **2 đến 5 giây** mới đồng bộ xong! Chính trong khoảng mù 2–5 giây đó, Ingress vẫn vô tư đẩy thêm vài chục giao dịch mới vào cái Pod vừa đóng cửa -> nổ `502 Bad Gateway`, cộng thêm nếu không bật tắt êm thì các giao dịch đang xử lý dở bên trong cũng bị giết ngang xương! Để đạt **Zero-Downtime 100% không rớt dù 1 gói tin**, tôi cấu hình đồng bộ 4 mảnh ghép: (1) Thêm **`lifecycle.preStop: exec: [\"sh\", \"-c\", \"sleep 5\"]`** để trì hoãn việc gửi `SIGTERM` cho tới khi Ingress/kube-proxy cắt sạch lưu lượng mới về Pod; (2) Bật **`server.shutdown=graceful`** kèm `spring.lifecycle.timeout-per-shutdown-phase=30s` (và dừng êm cả Kafka Listener) để xử lý trọn vẹn các giao dịch đang chạy dở; (3) Đặt **`terminationGracePeriodSeconds: 45`** (lớn hơn `5s + 30s`); và (4) Cấu hình chuẩn `readinessProbe` + `PodDisruptionBudget`!",
    keyPoints: [
      "Giải thích trúng bản chất gốc rễ: **Race Condition song song** giữa tín hiệu `SIGTERM` tới Pod và độ trễ lan truyền cập nhật `EndpointSlice` / Ingress Controller.",
      "Đưa ra công thức 4 mảnh ghép chuẩn chỉ: `preStop sleep 5s` + `server.shutdown=graceful (30s)` + `terminationGracePeriodSeconds (45s)` + `readinessProbe`.",
      "Nhắc thêm việc tạm dừng êm các luồng nền như Kafka MessageListenerContainer / Scheduler trước khi đóng DataSource."
    ],
    redFlag: "Chỉ trả lời 'Kubernetes mặc định RollingUpdate là đã tự động Zero-Downtime rồi, lỗi 502 chắc do phần cứng mạng bị hỏng'."
  },
  {
    id: "IV-29",
    category: "System Design, Sự cố Production & Tình huống",
    level: "Senior",
    lessonId: "D6",
    question: "Bạn cần đổi cấu trúc cột dữ liệu và đánh thêm một Index tìm kiếm mới trên bảng `transactions` đang chứa 150 triệu dòng của hệ thống Ngân hàng 24/7 (không được phép dừng hệ thống bảo trì ban đêm). Nếu viết câu lệnh `CREATE INDEX` thường và đổi cột trực tiếp trong Flyway thì hậu quả là gì, và quy trình **Zero-Downtime Schema Migration** chuẩn diễn ra như thế nào?",
    interviewerIntent: "Kiểm tra kinh nghiệm xương máu khi thay đổi CSDL lớn trên Production đang chạy nóng — một câu lệnh DDL thiếu hiểu biết có thể làm tê liệt toàn ngân hàng trong 20 phút!",
    modelAnswer: "Trên bảng 150 triệu dòng đang chịu hàng nghìn TPS, chạy câu lệnh `CREATE INDEX` thông thường sẽ chiếm khóa `SHARE` chặn đứng mọi thao tác `INSERT/UPDATE/DELETE` trong 10–20 phút; nguy hiểm hơn nữa, các câu lệnh `ALTER TABLE ... ALTER COLUMN TYPE` viết lại bảng sẽ đòi khóa **`ACCESS EXCLUSIVE`** — ngay cả khi bản thân nó chờ một truy vấn đang chạy, toàn bộ hàng vạn giao dịch mới đến sau sẽ xếp hàng chết cứng phía sau yêu cầu khóa `ACCESS EXCLUSIVE` đó (**Lock Queue Amplification**), làm sập toàn ngân hàng trong chưa đầy 10 giây! Để triển khai **Zero-Downtime 100%**, tôi luôn tuân thủ mẫu **Expand-and-Contract (Parallel Change)** qua nhiều đợt release nhỏ kèm đặt `SET lock_timeout = '2s'` làm cầu chì an toàn cho mọi script DDL: (1) **Pha Expand**: thêm cột mới cho phép `NULL` (trên Postgres 11+ thao tác này chỉ cập nhật metadata trong vài ms) và tạo chỉ mục bằng **`CREATE INDEX CONCURRENTLY`** (chạy ngoài khối transaction của Flyway `non-transactional` để không khóa ghi bảng); (2) **Pha Dual-Write & Backfill**: deploy code phiên bản trung gian vừa ghi vào cả cột cũ lẫn cột mới, đồng thời chạy Batch Worker cập nhật lấp đầy dữ liệu lịch sử 150 triệu dòng theo từng lô nhỏ 2.000 dòng có nghỉ ngắn tránh ngập WAL/Replica Lag; (3) **Pha Switch Read**: chuyển code đọc hoàn toàn sang cột mới và thêm ràng buộc `CHECK (...) NOT VALID` rồi `VALIDATE CONSTRAINT` không khóa; (4) **Pha Contract**: ở bản release sau cùng mới gỡ bỏ cột cũ khỏi code rồi xóa cột.",
    keyPoints: [
      "Chỉ rõ thảm họa **Lock Queue Amplification (`ACCESS EXCLUSIVE` / `SHARE` lock)** khi chạy DDL truyền thống trên bảng trăm triệu dòng.",
      "Sử dụng `CREATE INDEX CONCURRENTLY` (cấu hình Flyway chạy ngoài transaction), `ADD CONSTRAINT ... NOT VALID` + `VALIDATE CONSTRAINT` và luôn cài cầu chì `SET lock_timeout`.",
      "Triển khai bài bản quy trình 4 bước **Expand -> Dual-Write & Chunked Backfill -> Switch Read -> Contract** đảm bảo tương thích ngược khi Rolling Update."
    ],
    redFlag: "Chạy thẳng `ALTER TABLE transactions MODIFY/ALTER COLUMN` hoặc `UPDATE transactions SET new_col = ...` quét 1 lần toàn bộ 150 triệu dòng trong một giao dịch duy nhất."
  },
  {
    id: "IV-30",
    category: "System Design, Sự cố Production & Tình huống",
    level: "Senior",
    lessonId: "A4",
    question: "Hãy thiết kế hệ thống cho phép khách hàng Doanh nghiệp tìm kiếm sao kê 5 năm gần nhất (lọc theo từ khóa diễn giải bất kỳ, khoảng số tiền, mã đối tác) dưới 150ms VÀ bấm xuất báo cáo sao kê 1 triệu dòng ra file CSV/Excel mà tuyệt đối không làm tăng tải lên Database Core Ledger.",
    interviewerIntent: "Đánh giá tư duy thiết kế toàn diện kết hợp CQRS, CDC, phân tầng lưu trữ dữ liệu lớn (Hot/Warm/Cold), Streaming I/O và bảo mật tải file.",
    modelAnswer: "Nguyên tắc bất khả xâm phạm đầu tiên là **cách ly hoàn toàn tải truy vấn lịch sử/xuất báo cáo khỏi Core OLTP PostgreSQL** (trên Core DB chỉ giữ phân vùng nóng 3–6 tháng gần nhất phục vụ đối chiếu nhanh và tuyệt đối cấm truy vấn `LIKE '%...%'`). Tôi thiết kế theo kiến trúc **CQRS đồng bộ qua CDC**: mọi bút toán mới commit trên Core Ledger được Debezium đọc từ WAL đẩy qua Kafka tới tầng Read Store chuyên biệt — gồm **OpenSearch** (đánh Inverted Index phục vụ tìm kiếm toàn văn nội dung diễn giải kết hợp lọc khoảng tiền/thời gian phản hồi dưới 100ms, chia Index theo tháng với chính sách ILM Hot-Warm) và **ClickHouse / Partitioned Analytical Store** cho tổng hợp báo cáo nhiều năm. Đối với yêu cầu **Xuất báo cáo 1 triệu dòng**, tuyệt đối không xử lý đồng bộ trên HTTP Request: khi khách bấm *'Xuất sao kê'*, API kiểm tra quyền sở hữu tài khoản (`CIF` + `Consent`), tạo bản ghi `ExportJob (PENDING)` trả ngay mã theo dõi, rồi đẩy sự kiện vào **Export Worker Pool**. Worker đọc dữ liệu từ Read Store bằng con trỏ luồng (**Cursor / Scroll Streaming** từng lô 5.000 dòng, giữ RAM phẳng dưới 64MB), nén và đẩy nối trực tiếp (**Multipart Streaming Upload**) lên Object Storage nội bộ (S3/MinIO) có mã hóa Server-side, sau đó bắn thông báo SSE/Email cho khách tải về qua đường dẫn chỉ định thông qua API kiểm tra lại quyền `CIF` cấp **Pre-signed URL sống ngắn hạn 5–10 phút**!",
    keyPoints: [
      "Tách biệt hoàn toàn OLTP Write Store và Analytical/Search Read Store bằng **CQRS + Debezium Kafka CDC** + phân tầng dữ liệu Hot/Warm/Cold.",
      "Xử lý xuất 1 triệu dòng bằng **Async Job + Cursor Streaming + S3 Multipart Upload** (RAM hằng số vài chục MB, không bao giờ dính OOM hay HTTP Timeout).",
      "Bảo mật khâu tải tệp: mã hóa file trên S3/MinIO và kiểm chứng lại quyền sở hữu `CIF` trước khi cấp **Short-lived Pre-signed URL**."
    ],
    redFlag: "Cho API Controller chạy câu lệnh SQL trực tiếp trên DB chính gom 1 triệu dòng vào `List<Transaction>` rồi dùng Apache POI `XSSFWorkbook` dựng toàn bộ file Excel trong RAM (tiêu tốn hàng chục GB Heap làm nổ chết cả cụm Pod ngay lập tức!)."
  }
];

window.CODE_REVIEW_CHALLENGES = [
  // =========================================================================
  // BÀI 1: CR-01 — Review hàm TransferService.transferMoney() của Junior
  // =========================================================================
  {
    id: "CR-01",
    title: "CR-01 · Review PR: Dịch vụ Chuyển tiền Liên Ngân hàng (TransferService.java)",
    scenario: "Một lập trình viên Junior vừa gửi Merge Request cho tính năng chuyển tiền nhanh liên ngân hàng có thu phí 0,11%. Đoạn code chạy thử 1 luồng trên máy cá nhân thấy 'ra kết quả đúng', nhưng nếu lọt lên Production giờ cao điểm sẽ gây thảm họa âm tiền, lệch sổ cái, chuyển trùng tiền và treo toàn bộ hệ thống! Hãy chọn chính xác 4 lỗi chí mạng thật sự trong đoạn code (cẩn thận 2 nhận định bẫy!).",
    lang: "java",
    code: [
      "@Service",
      "@RequiredArgsConstructor",
      "public class TransferService {",
      "    private final AccountRepository accountRepo;",
      "    private final LedgerRepository ledgerRepo;",
      "    private final RestClient napasRestClient;",
      "",
      "    @Transactional(rollbackFor = Exception.class)",
      "    public TransferReceipt transferMoney(String fromAccNo, String toAccNo, String bankBin, double amount) {",
      "        // 1. Tính phí 0.11% và tổng tiền trích nợ",
      "        BigDecimal transferAmt = new BigDecimal(amount);",
      "        BigDecimal fee = new BigDecimal(amount * 0.0011);",
      "        BigDecimal totalDebit = transferAmt.add(fee);",
      "",
      "        // 2. Kiểm tra số dư và trừ tiền tài khoản nguồn",
      "        Account sender = accountRepo.findByAccountNo(fromAccNo).orElseThrow();",
      "        if (sender.getAvailableBalance().compareTo(totalDebit) < 0) {",
      "            throw new InsufficientFundsException(\"Khong du so du kha dung\");",
      "        }",
      "        sender.setLedgerBalance(sender.getLedgerBalance().subtract(totalDebit));",
      "        accountRepo.save(sender);",
      "",
      "        // 3. Gọi cổng đối tác NAPAS (thử lại tối đa 3 lần nếu mạng chập chờn)",
      "        NapasResponse resp = null;",
      "        for (int attempt = 1; attempt <= 3; attempt++) {",
      "            try {",
      "                String idemKey = UUID.randomUUID().toString();",
      "                resp = napasRestClient.post()",
      "                        .uri(\"/v2/ibft/transfer\")",
      "                        .header(\"Idempotency-Key\", idemKey)",
      "                        .body(new NapasReq(fromAccNo, toAccNo, bankBin, transferAmt))",
      "                        .retrieve()",
      "                        .body(NapasResponse.class);",
      "                break;",
      "            } catch (ResourceAccessException timeoutEx) {",
      "                if (attempt == 3) throw timeoutEx;",
      "            }",
      "        }",
      "",
      "        // 4. Lưu bút toán sổ cái",
      "        ledgerRepo.save(LedgerEntry.debit(fromAccNo, totalDebit, resp.rrn()));",
      "        return new TransferReceipt(resp.rrn(), \"SUCCESS\");",
      "    }",
      "}"
    ].join("\n"),
    issues: [
      {
        id: "i1",
        text: "Nhận số tiền kiểu `double` và truyền vào `new BigDecimal(amount)` / `new BigDecimal(amount * 0.0011)` không chỉ định `RoundingMode`, làm mang nguyên sai số dấu phẩy động nhị phân IEEE 754 vào sổ cái.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Kiểu `double` và constructor `new BigDecimal(double)` tạo ra phần đuôi sai số nhị phân (VD `0.1` thành `0.10000000000000000555...`) và phép nhân phí không chuẩn hóa `scale` + `RoundingMode` sẽ làm lệch tiền lẻ kế toán. Phải nhận tham số kiểu `BigDecimal` (từ chuỗi JSON) và dùng `.multiply(FEE_RATE).setScale(0, RoundingMode.HALF_UP)`."
      },
      {
        id: "i2",
        text: "Khai báo `@Transactional(rollbackFor = Exception.class)` ở dòng 8 là sai đặc tả vì mặc định Spring `@Transactional` vốn đã tự động rollback cho mọi Checked Exception rồi.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Mặc định Spring `@Transactional` CHỈ tự động rollback cho `RuntimeException` và `Error`, hoàn toàn KHÔNG tự rollback cho Checked `Exception` trừ khi ghi rõ `rollbackFor = Exception.class`. Bản thân thuộc tính `rollbackFor` không sai — lỗi thật sự ở đây là đặt biên giới `@Transactional` bao trùm cả lời gọi mạng!"
      },
      {
        id: "i3",
        text: "Đọc tài khoản bằng `findByAccountNo` thường rồi kiểm tra `if` và trừ tiền mà KHÔNG có khóa dòng (`SELECT ... FOR UPDATE`) hoặc câu lệnh `UPDATE` có điều kiện nguyên tử, dẫn tới Race Condition rút âm tiền khi bắn đa luồng.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Nếu kẻ tấn công bắn đồng thời 10 request ở cùng một mili-giây, cả 10 luồng cùng đọc `findByAccountNo` thấy đủ số dư rồi ghi đè lên nhau (Lost Update), rút lố gấp 10 lần số tiền thực có!"
      },
      {
        id: "i4",
        text: "Thực hiện lời gọi mạng đồng bộ `napasRestClient.post()` (kèm vòng lặp retry tối đa 3 lần) ngay bên trong hàm đang mở `@Transactional`, gây ngâm kết nối HikariCP, làm cạn kiệt DB Pool và có nguy cơ rollback mất dấu vết khi đối tác đã cộng tiền.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Nếu cổng đối tác chậm 10s x 3 lần retry = 30s, luồng này ôm chết 1 kết nối DB vật lý và khóa dòng suốt 30 giây làm sập toàn bộ dịch vụ; tệ hơn, nếu lần thứ 3 timeout ném exception gây rollback DB trong khi lần 1 đối tác thực ra ĐÃ chuyển tiền thành công, ngân hàng mất trắng tiền mà không còn bản ghi treo nào để đối soát!"
      },
      {
        id: "i5",
        text: "Dùng `sender.getAvailableBalance().compareTo(totalDebit) < 0` ở dòng 17 để kiểm tra số dư là sai logic Java, bắt buộc phải đổi sang dùng `!sender.getAvailableBalance().equals(totalDebit)`.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Dùng `compareTo(totalDebit) < 0` để kiểm tra số dư khả dụng nhỏ hơn số tiền cần trích là HOÀN TOÀN ĐÚNG chuẩn với `BigDecimal` (bỏ qua khác biệt về `scale`). Ngược lại, dùng `equals()` mới là sai lầm nghiêm trọng vì `equals` so sánh cả `scale` và không kiểm tra được lớn hơn/nhỏ hơn!"
      },
      {
        id: "i6",
        text: "Gọi `UUID.randomUUID().toString()` sinh mã `Idempotency-Key` MỚI TINH ngay bên trong vòng lặp `for` retry khi gặp `ResourceAccessException` (timeout), khiến mỗi lần thử lại biến thành một lệnh chuyển tiền mới gây chuyển tiền 2–3 lần cho người nhận.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Mục đích duy nhất của `Idempotency-Key` là giữ cố định CÙNG MỘT MÃ xuyên suốt các lần retry của cùng 1 giao dịch để phía đối tác nhận ra gói tin lặp. Đặt `UUID.randomUUID()` bên trong vòng `for` làm mỗi lần retry mang một mã mới toanh, vô hiệu hóa 100% cơ chế chống trùng và nhân ba số tiền chuyển đi khi mạng lag!"
      }
    ]
  },

  // =========================================================================
  // BÀI 2: CR-02 — Review API Sao kê & Kiểm tra quyền truy cập
  // =========================================================================
  {
    id: "CR-02",
    title: "CR-02 · Review PR: API Tra cứu Sao kê & Bảo mật Dữ liệu Thẻ (StatementController.java)",
    scenario: "Một thành viên mới viết API phục vụ tra cứu sao kê theo từ khóa và xác nhận thông tin thẻ trên cổng Ngân hàng số. Trước khi đưa qua cổng kiểm toán bảo mật PCI-DSS 4.0 và Pentest OWASP API, bạn hãy rà soát và chỉ ra đúng 4 lỗ hổng bảo mật & hiệu năng nghiêm trọng trong đoạn code dưới đây.",
    lang: "java",
    code: [
      "@Slf4j",
      "@RestController",
      "@RequestMapping(\"/api/v1/accounts\")",
      "@RequiredArgsConstructor",
      "public class StatementController {",
      "    private final EntityManager entityManager;",
      "    private final BranchRepository branchRepo;",
      "    private final FeeDetailRepository feeRepo;",
      "",
      "    public record StatementItemDto(String txnRef, BigDecimal amount, String narrative, String branchName, BigDecimal fee) {}",
      "",
      "    @GetMapping(\"/{accountNo}/statements\")",
      "    public List<StatementItemDto> searchStatements(",
      "            @PathVariable String accountNo,",
      "            @RequestParam(defaultValue = \"\") String keyword,",
      "            @RequestParam(defaultValue = \"50\") int limit,",
      "            @RequestHeader(value = \"X-Card-PAN\", required = false) String cardPan,",
      "            @RequestHeader(value = \"X-Verify-OTP\", required = false) String otpCode,",
      "            Authentication authentication) {",
      "",
      "        log.info(\"User={} querying statement acc={}, cardPAN={}, otp={}\",",
      "                authentication.getName(), accountNo, cardPan, otpCode);",
      "",
      "        String sql = \"SELECT * FROM ledger_transactions WHERE account_no = '\" + accountNo + \"' \"",
      "                   + \"AND narrative LIKE '%\" + keyword + \"%' ORDER BY created_at DESC LIMIT \" + limit;",
      "        @SuppressWarnings(\"unchecked\")",
      "        List<LedgerTransaction> txList = entityManager.createNativeQuery(sql, LedgerTransaction.class)",
      "                .getResultList();",
      "",
      "        List<StatementItemDto> result = new ArrayList<>();",
      "        for (LedgerTransaction tx : txList) {",
      "            String branchName = branchRepo.findByBranchCode(tx.getBranchCode()).getName();",
      "            BigDecimal fee = feeRepo.findFeeByTxnId(tx.getId());",
      "            result.add(new StatementItemDto(tx.getTxnRef(), tx.getAmount(), tx.getNarrative(), branchName, fee));",
      "        }",
      "        return result;",
      "    }",
      "}"
    ].join("\n"),
    issues: [
      {
        id: "i1",
        text: "Lỗ hổng **BOLA / IDOR (OWASP API1)**: API có nhận `Authentication` nhưng lấy thẳng `@PathVariable accountNo` đi truy vấn sao kê mà KHÔNG kiểm tra xem tài khoản `accountNo` đó có thuộc quyền sở hữu `CIF` của người dùng đang đăng nhập hay không.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI NGHIÊM TRỌNG SỐ 1! Bất kỳ khách hàng nào đăng nhập hợp lệ cũng chỉ cần thay `accountNo` trên URL bằng số tài khoản của Tổng Giám đốc hoặc khách hàng khác là đọc trộm toàn bộ lịch sử sao kê của họ. Bắt buộc phải kiểm chứng quyền sở hữu `(accountNo, currentAuthenticatedCif)`!"
      },
      {
        id: "i2",
        text: "Lỗ hổng **SQL Injection** chí mạng khi ghép chuỗi trực tiếp `accountNo` và `keyword` vào câu lệnh `createNativeQuery(sql)` thay vì dùng tham số ràng buộc (`:accountNo`, `:keyword` với `setParameter`).",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Kẻ tấn công chỉ cần truyền `keyword` dạng `%' UNION SELECT ... --` là trích xuất toàn bộ cơ sở dữ liệu ngân hàng ngay lập tức. Mọi tham số đầu vào bắt buộc phải truyền qua Prepared Statement / Named Parameters (và giới hạn trần tối đa cho `limit`!)."
      },
      {
        id: "i3",
        text: "Khai báo `public record StatementItemDto(...)` làm kiểu trả về của Controller sẽ gây lỗi `InvalidDefinitionException` trên Spring Boot 3 vì Jackson không thể serialize `record` thiếu hàm getter `getTxnRef()`.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Jackson trên Spring Boot 3 (Java 17/21) hỗ trợ gốc 100% cho Java `record` mà không cần bất kỳ hàm `getXxx()` truyền thống nào. Dùng `record` bất biến làm DTO trả về thay vì trả thẳng JPA Entity thậm chí là thực hành rất tốt!"
      },
      {
        id: "i4",
        text: "Vi phạm trực tiếp chuẩn **PCI-DSS 4.0** và an toàn thông tin khi ghi thẳng số thẻ đầy đủ `cardPan` (16 số) và mã xác thực `otpCode` dạng rõ vào `log.info(...)` (cùng việc truyền dữ liệu nhạy cảm thô trên Header tùy tiện).",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI RỚT KIỂM TOÁN PCI-DSS NGAY LẬP TỨC! Ghi full PAN 16 số và mã OTP ra hệ thống log tập trung làm lộ dữ liệu thẻ ra ngoài vùng CDE. Tuyệt đối cấm log OTP/PIN/CVV2, còn PAN nếu bắt buộc ghi vết chỉ được phép hiển thị dạng che mờ tối đa 6 số đầu - 4 số cuối!"
      },
      {
        id: "i5",
        text: "Lỗi hiệu năng **N+1 Query** nghiêm trọng trong vòng lặp `for`: với `limit = 50` (hoặc nếu hacker truyền `limit = 10000`), code bắn thêm `2 * N` câu truy vấn lẻ xuống `branchRepo` và `feeRepo` làm nghẽn kết nối Database.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI HIỆU NĂNG NGHIÊM TRỌNG! Với 50 dòng sao kê, hàm này bắn `1 + 50 + 50 = 101` câu SQL (và vì chưa chặn trần `limit`, nếu truyền `limit=5000` sẽ bắn `10.001` câu SQL trên 1 request!). Phải gom bằng `JOIN` / `WHERE id IN (...)` batch fetch kèm cache danh mục chi nhánh và giới hạn `@Max(100)` cho `limit`."
      },
      {
        id: "i6",
        text: "Sử dụng `@GetMapping` cho API tra cứu sao kê có tham số `@RequestParam int limit` là vi phạm giao thức HTTP vì `GET` không được phép chứa Query Parameter.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Theo chuẩn RESTful HTTP, truy vấn đọc danh sách tài nguyên (idempotent & safe) dùng phương thức `GET` đi kèm các tham số phân trang không nhạy cảm như `limit` hay `cursor` trên Query String là hoàn toàn chuẩn mực."
      }
    ]
  },

  // =========================================================================
  // BÀI 3: CR-03 — Review Kafka Consumer & Hạch toán Saga Hoàn tiền
  // =========================================================================
  {
    id: "CR-03",
    title: "CR-03 · Review PR: Kafka Consumer & Bù trừ Saga Hoàn tiền (RefundSagaConsumer.java)",
    scenario: "Đoạn code dưới đây lắng nghe sự kiện giao dịch liên ngân hàng xác nhận thất bại cuối cùng (`payment.ibft.failed.confirmed`) từ Kafka để thực hiện bước bù trừ hoàn tiền trong Saga về lại tài khoản khách hàng. Hãy soi kỹ từng dòng với con mắt của một Kiến trúc sư Core Banking và chọn đúng 4 lỗi nghiêm trọng!",
    lang: "java",
    code: [
      "@Slf4j",
      "@Component",
      "@RequiredArgsConstructor",
      "public class RefundSagaConsumer {",
      "    private final JdbcTemplate jdbcTemplate;",
      "    private final AccountRepository accountRepo;",
      "",
      "    @KafkaListener(topics = \"payment.ibft.failed.confirmed\", groupId = \"core-ledger-refund-grp\")",
      "    @Transactional",
      "    public void onPaymentFailed(RefundEvent event, Acknowledgment ack) {",
      "        // Xác nhận commit offset ngay đầu hàm để Kafka đẩy tin tiếp theo cho nhanh",
      "        ack.acknowledge();",
      "",
      "        try {",
      "            // Xóa sạch bút toán trích nợ cũ khỏi bảng sổ cái cho gọn dữ liệu",
      "            jdbcTemplate.update(",
      "                \"DELETE FROM ledger_postings WHERE txn_ref = ?\", event.txnRef()",
      "            );",
      "",
      "            // Cộng hoàn tiền trực tiếp lại cho khách hàng",
      "            Account acc = accountRepo.lockByAccountNo(event.senderAccountNo());",
      "            acc.setLedgerBalance(acc.getLedgerBalance().add(event.totalAmount()));",
      "            accountRepo.save(acc);",
      "",
      "            log.info(\"Refunded txnRef={} amount={}\", event.txnRef(), event.totalAmount());",
      "        } catch (Exception ex) {",
      "            // Bỏ qua lỗi tạm thời để không làm dừng Consumer",
      "            log.warn(\"Skip failed refund for txnRef={}: {}\", event.txnRef(), ex.getMessage());",
      "        }",
      "    }",
      "}"
    ].join("\n"),
    issues: [
      {
        id: "i1",
        text: "Việc Producer phía trước đặt Partition Key là `senderAccountNo` sẽ làm xáo trộn thứ tự sự kiện của tài khoản; bắt buộc phải sửa thành `key = null` chia Round-Robin mới giữ đúng thứ tự.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Đặt Partition Key là `senderAccountNo` chính là cách ĐÚNG DUY NHẤT trên Kafka để gom mọi sự kiện của cùng một tài khoản vào chung 1 Partition nhằm bảo toàn thứ tự nghiêm ngặt; nếu để `key = null` rải ra nhiều Partition thì mới làm đảo lộn thứ tự!"
      },
      {
        id: "i2",
        text: "Gọi `ack.acknowledge()` commit offset NGAY ĐẦU HÀM trước khi xử lý xong giao dịch DB: nếu quá trình ghi DB gặp sự cố hoặc Pod bị sập nguồn giữa chừng, Kafka coi như tin đã xử lý xong và không gửi lại nữa, làm khách hàng **mất trắng tiền hoàn**!",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Commit offset trước khi hoàn tất công việc biến ngữ nghĩa thành *At-Most-Once* (chấp nhận mất dữ liệu). Với giao dịch tiền tệ, bắt buộc chỉ được `ack.acknowledge()` SAU KHI giao dịch DB đã thực thi và lưu bền vững thành công!"
      },
      {
        id: "i3",
        text: "Thiếu hoàn toàn cơ chế **Idempotent Consumer** (kiểm tra bảng chống trùng `processed_events` hoặc trạng thái đã hoàn của Saga): khi Kafka phát lại gói tin do mạng chập chờn hoặc Consumer Group rebalance, khách hàng sẽ được **cộng hoàn tiền lặp 2–3 lần**!",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Trong môi trường phân tán, Kafka đảm bảo *At-Least-Once* nên một `RefundEvent` hoàn toàn có thể đến 2 lần. Không có khóa chống trùng nguyên tử (`INSERT INTO processed_refunds(txn_ref) ...` trong cùng DB Transaction) chắc chắn sẽ dẫn đến nhân đôi, nhân ba tiền hoàn!"
      },
      {
        id: "i4",
        text: "Chế độ `AckMode.MANUAL` của Spring Kafka không tương thích về mặt kỹ thuật với `@Transactional` của PostgreSQL do thiếu bộ điều phối XA 2PC.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Spring Kafka với `Acknowledgment` thủ công hoạt động hoàn toàn trơn tru cùng `@Transactional` của PostgreSQL (không hề cần XA 2PC) khi kết hợp mẫu Inbox Idempotency trong cùng DB Transaction rồi mới xác nhận offset sau khi DB xử lý xong."
      },
      {
        id: "i5",
        text: "Chạy lệnh `DELETE FROM ledger_postings` xóa vật lý bút toán lịch sử đã ghi sổ — vi phạm nghiêm trọng nguyên tắc **Sổ cái Bất biến (Append-only Immutable Ledger)** và làm gãy cân bằng kế toán thay vì sinh một cặp bút toán đảo chiều (`Reversal Journal`) mới.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI NGHIỆP VỤ NGHIÊM TRỌNG! Trong Core Banking và Saga tài chính, giao dịch bù trừ (Compensation) KHÔNG BAO GIỜ là lệnh `DELETE` xóa dấu vết cũ, mà bắt buộc phải giữ nguyên lịch sử và `INSERT` một chứng từ đảo chiều mới cân bằng Nợ `Suspense GL` / Có `CASA Khách hàng`!"
      },
      {
        id: "i6",
        text: "Khối `catch (Exception ex)` bắt và nuốt trọn ngoại lệ mà không ném lại (để rollback `@Transactional` + kích hoạt cơ chế Retry / đẩy sang **Dead Letter Topic - DLT**), khiến các giao dịch lỗi DB bị chìm nghỉm hoàn toàn không thể phục hồi.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI CHÍ MẠNG! Bắt nuốt `Exception` bên trong hàm `@Transactional` vừa ngăn Spring rollback sạch giao dịch đang dở dang (hoặc gây `UnexpectedRollbackException`), vừa vô hiệu hóa hoàn toàn `DefaultErrorHandler` / `@RetryableTopic` và `DeadLetterPublishingRecoverer`, làm mất dấu giao dịch cần hoàn tiền!"
      }
    ]
  },

  // =========================================================================
  // BÀI 4: CR-04 — Review Frontend Form Chuyển khoản & Cấu hình BFF/CORS
  // =========================================================================
  {
    id: "CR-04",
    title: "CR-04 · Review PR: Form Chuyển khoản TypeScript & Cấu hình CORS trên BFF (TransferForm.tsx)",
    scenario: "Đội phát triển kênh Ngân hàng số gửi PR gồm đoạn xử lý gửi lệnh chuyển khoản trên React/TypeScript kết hợp cấu hình CORS trên dịch vụ BFF. Hãy vận dụng kiến thức Full-Stack Ngân hàng để vạch trần đúng 4 lỗi bảo mật, sai số tiền tệ và bấm đúp giao dịch trong đoạn code này!",
    lang: "typescript",
    code: [
      "// --- PHẦN 1: Cấu hình CORS tại tầng BFF ---",
      "// Phản chiếu lại mọi Origin gửi lên để Web đối tác nào gọi cũng tiện:",
      "// res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');",
      "// res.setHeader('Access-Control-Allow-Credentials', 'true');",
      "",
      "// --- PHẦN 2: Hàm xử lý trên giao diện React + TypeScript ---",
      "export async function onAuthSuccess(tokens: { accessToken: string; refreshToken: string }) {",
      "  // Lưu Refresh Token 30 ngày vào localStorage để mở tab lại không mất phiên",
      "  window.localStorage.setItem('bank_refresh_token', tokens.refreshToken);",
      "  window.localStorage.setItem('bank_access_token', tokens.accessToken);",
      "}",
      "",
      "export async function handleConfirmTransferClick(",
      "  toAccount: string,",
      "  amountInput: string, // VD: '300000' hoặc số thập phân ngoại tệ '19.99'",
      "  otpCode: string",
      ") {",
      "  // Tính phí 0.1% bằng kiểu Number của JS để ghép chuỗi ký xác nhận",
      "  const rawAmount = Number(amountInput);",
      "  const fee = rawAmount * 0.001;",
      "  const total = rawAmount + fee;",
      "",
      "  // Tạo mã Idempotency-Key ngay tại thời điểm mỗi cú click nút Xác nhận",
      "  const idemKey = window.crypto.randomUUID();",
      "",
      "  const response = await fetch('https://bff.omnibank.vn/api/v1/transfers', {",
      "    method: 'POST',",
      "    credentials: 'include',",
      "    headers: {",
      "      'Content-Type': 'application/json',",
      "      'X-Idempotency-Key': idemKey",
      "    },",
      "    body: JSON.stringify({ toAccount, amount: rawAmount, fee, total, otpCode })",
      "  });",
      "  return response.json();",
      "}"
    ].join("\n"),
    issues: [
      {
        id: "i1",
        text: "Cấu hình CORS trên BFF phản chiếu mù quáng mọi `req.headers.origin` gửi lên đi kèm `Access-Control-Allow-Credentials: true`, cho phép bất kỳ trang web độc hại nào thực hiện truy vấn Cross-Origin đính kèm Cookie phiên ngân hàng của nạn nhân để đọc trộm dữ liệu!",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI BẢO MẬT CHÍ MẠNG! Phản chiếu `req.headers.origin` không qua kiểm tra danh sách trắng (Allowlist) kèm `Allow-Credentials: true` còn nguy hiểm hơn cả dấu `*` vì trình duyệt chấp nhận gửi kèm Cookie và cho phép trang `https://hacker.com` đọc toàn bộ nội dung JSON phản hồi của tài khoản nạn nhân!"
      },
      {
        id: "i2",
        text: "Hàm `window.crypto.randomUUID()` của chuẩn Web Crypto dùng thuật toán yếu không an toàn mật mã học nên kẻ tấn công dễ dàng đoán trước được chuỗi UUID tiếp theo.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Hàm chuẩn `crypto.randomUUID()` của trình duyệt sử dụng bộ sinh số ngẫu nhiên an toàn mật mã học (CSPRNG với 122 bit ngẫu nhiên) hoàn toàn không thể đoán trước; lỗi trong bài KHÔNG nằm ở độ ngẫu nhiên của `randomUUID()`, mà nằm ở vị trí gọi nó tạo mới lại ở mỗi cú click!"
      },
      {
        id: "i3",
        text: "Lưu trực tiếp `refreshToken` dài hạn và `accessToken` vào `window.localStorage`: chỉ cần một lỗ hổng XSS nhỏ là mã độc đọc sạch `localStorage` để chiếm đoạt phiên ngân hàng lâu dài.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI BẢO MẬT NGHIÊM TRỌNG! `localStorage` hoàn toàn phơi bày trước JavaScript. Theo chuẩn BFF Token Handler, Refresh/Access Token phải được giữ ở phía Server BFF và chỉ giao tiếp với trình duyệt qua Cookie gắn cờ `HttpOnly; Secure; SameSite=Strict`!"
      },
      {
        id: "i4",
        text: "Tính toán tiền tệ, phí và tổng tiền bằng kiểu số thực dấu phẩy động `Number` của JavaScript (`19.99 * 0.001` hay phép cộng số thực IEEE 754) rồi gửi dạng số thực, gây sai số lẻ nhị phân làm lệch chữ ký/đối chiếu với `BigDecimal` phía Backend.",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI SỐ HỌC TIỀN TỆ! Trong JS, `0.1 + 0.2 === 0.30000000000000004` và phép nhân tỷ lệ trên số thập phân sinh đuôi rác nhị phân. Tiền tệ phải truyền dưới dạng chuỗi thập phân chuẩn xác (`String`), dùng `Decimal.js`/`BigInt` ở Client và để Backend tính phí chuẩn bằng `BigDecimal`!"
      },
      {
        id: "i5",
        text: "Không khóa trạng thái đang gửi (`isSubmitting` / `exhaustMap`) VÀ gọi `crypto.randomUUID()` sinh mới `idemKey` ở mỗi lần chạy hàm click — nếu người dùng bấm đúp 2 lần hoặc bấm thử lại khi mạng lag sẽ tạo ra 2 `X-Idempotency-Key` khác nhau làm trừ tiền 2 lần!",
        isBug: true,
        explain: "CHÍNH XÁC LÀ LỖI TRỪ TIỀN ĐÚP KINH ĐIỂN! Phải khóa nút bấm ngay khi request đang bay, và quan trọng nhất: `idemKey` phải được khởi tạo ở cấp độ phiên/ý định của Form (`useState(() => crypto.randomUUID())`), giữ nguyên không đổi qua các lần bấm thử lại của cùng lệnh chuyển tiền đó!"
      },
      {
        id: "i6",
        text: "Tùy chọn `credentials: 'include'` trong hàm `fetch()` làm trình duyệt tự động hạ cấp kết nối từ giao thức `HTTPS` xuống `HTTP` không mã hóa.",
        isBug: false,
        explain: "NHẬN ĐỊNH BẪY (SAI)! Thuộc tính `credentials: 'include'` chỉ chỉ thị cho trình duyệt đính kèm Cookie (như `HttpOnly` Session Cookie) vào truy vấn sang `https://bff.omnibank.vn`, hoàn toàn KHÔNG làm hạ cấp giao thức HTTPS xuống HTTP!"
      }
    ]
  }
];
