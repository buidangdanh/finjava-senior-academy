window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  "A1": {
    duration: "70 phút",
    difficulty: "Senior / Principal Architect",
    codeLang: "java",
    teacherIntro: "Chào em, chào mừng em bước vào Học phần A — chặng đường định hình tư duy của một Principal/Senior Java Architect thực thụ trong ngành Ngân hàng. Trong các buổi phỏng vấn vị trí Senior hoặc Tech Lead tại hội sở ngân hàng lớn, đề bài kinh điển nhất luôn là: 'Hãy thiết kế hệ thống Chuyển tiền Nhanh 24/7 chịu tải 10.000 TPS'. 80% ứng viên Mid-level chỉ vẽ được Load Balancer -> Microservices -> PostgreSQL -> Kafka rồi dừng lại. Nhưng hội đồng kiến trúc sư sẽ lập tức hỏi xoáy: 'Nếu ca sĩ hoặc Mặt trận Tổ quốc công bố 1 số tài khoản cứu trợ bão lũ và có 5.000 người bấm chuyển tiền vào ĐÚNG 1 tài khoản đó trong 1 giây thì điều gì xảy ra?'. Hôm nay anh sẽ truyền lại cho em toàn bộ cách bóc tách dung lượng (Capacity Estimation), thiết kế Sharded Ledger và kỹ thuật Sub-account Striping (chia ngăn ví phụ) để hạ gục bài toán Hot Account này.",
    analogy: {
      title: "Trạm thu phí cao tốc 32 làn thay vì 1 cửa thu tiền lẻ duy nhất",
      body: "Em hãy tưởng tượng một tài khoản ngân hàng thông thường giống như một quầy thu ngân có 1 két sắt duy nhất: mỗi lần mở két cộng tiền phải khóa cửa lại (Row-level Lock `SELECT FOR UPDATE` hoặc `UPDATE accounts SET balance = balance + ? WHERE id = ?`). Với tài khoản cá nhân ngày nhận 5 giao dịch thì chẳng sao cả. Nhưng với tài khoản từ thiện quốc gia hay tài khoản thu hộ Điện lực/Sàn TMĐT nhận 5.000 giao dịch/giây, 5.000 xe tải sẽ dồn ứ trước 1 trạm thu phí rộng 3 mét! Giải pháp Sub-account Striping chính là mở rộng trạm thu phí đó thành 32 làn thu tiền độc lập (`bucket_00` đến `bucket_31`). Xe đến làn nào bỏ tiền vào két làn đó không ai dẫm chân ai; khi chủ tài khoản hỏi tổng tiền thì hệ thống cộng nhanh 32 két lại, còn lúc rút tiền chi tiêu mới gom quỹ định kỳ về két chính."
    },
    objectives: [
      "Thực hiện chuẩn xác bước tính toán quy mô tải (Back-of-the-envelope Estimation) cho hệ thống 10.000 TPS về băng thông, IOPS Database, Partition Kafka và dung lượng lưu trữ 5 năm.",
      "Thiết kế kiến trúc chuyển tiền 24/7 đầu-cuối đảm bảo Lũy đẳng (Idempotency), Kế toán kép bất biến (Double-Entry) và định tuyến phân mảnh (Sharded Ledger).",
      "Giải quyết triệt để nút thắt tranh chấp khóa dòng trên tài khoản nóng (Hot Account Row Lock Contention) bằng kỹ thuật Sub-account Striping / Bucketing và Micro-batching."
    ],
    flow: [
      {
        step: "1. Edge & Idempotency Gateway (Chặn trùng & Điều tiết biên)",
        detail: "API Gateway xác thực JWT/Smart OTP, kiểm tra Rate Limit theo CIF và tra cứu `Idempotency-Key` trên cụm Redis Cluster + DB để đảm bảo mạng chập chờn bấm 5 lần vẫn chỉ xử lý đúng 1 lệnh."
      },
      {
        step: "2. Debit Normal Account (Khấu trừ tài khoản nguồn phân tán)",
        detail: "Tài khoản người gửi là tài khoản cá nhân phân tán đều trên các Shard theo `account_id`; hệ thống kiểm tra hạn mức và đặt lệnh trừ tiền nguyên tử có kiểm soát khóa dòng cực ngắn (< 3ms)."
      },
      {
        step: "3. Credit Hot Account via Striping (Ghi Có phân làn 32 Bucket)",
        detail: "Nếu tài khoản đích được gắn cờ `HOT_MERCHANT / CHARITY`, bộ định tuyến băm `txnId` vào 1 trong 32 ngăn số dư phụ (`sub_account_00..31`) để phân tán tải khóa dòng giảm đi 32 lần."
      },
      {
        step: "4. Outbox Kafka & Periodic Sweep (Đồng bộ sự kiện & Gom quỹ)",
        detail: "Bút toán Nợ/Có và bản ghi `outbox_events` được commit cùng 1 Transaction; tiến trình nền định kỳ (Sweeper) kết chuyển số dư từ các ngăn phụ về ngăn chính để sẵn sàng cho lệnh rút tiền lớn."
      }
    ],
    sections: [
      {
        heading: "1. Ước lượng quy mô hệ thống 10.000 TPS (Back-of-the-envelope Math)",
        paragraphs: [
          "Trong phòng phỏng vấn System Design, đừng bao giờ nhảy bổ vào vẽ hộp Kafka hay Redis ngay phút đầu tiên. Người Senior luôn dành 5 phút đầu làm rõ Yêu cầu phi chức năng (NFR): 10.000 TPS ở đây là đỉnh điểm (Peak TPS) giờ cao điểm mùng 1 Tết hay trung bình? Độ trễ P99 mục tiêu là dưới 300ms cho nội bộ và dưới 1.5s cho liên ngân hàng? RPO (dữ liệu cho phép mất khi sập trung tâm dữ liệu) bắt buộc bằng 0 tuyệt đối!",
          "Từ con số 10.000 Peak TPS chuyển tiền, em nhẩm nhanh trên bảng trắng cho hội đồng thấy sự sắc bén thực chiến: Mỗi giao dịch chuyển tiền sinh ra tối thiểu 1 bản ghi `journals`, 2–3 bản ghi `postings` (Nợ người gửi, Có người nhận, Có tài khoản phí), 1 bản ghi `idempotency` và 1 `outbox_event`. Tức là tầng Database thực chất phải gánh khoảng 50.000–60.000 lệnh INSERT/UPDATE mỗi giây! Một cụm PostgreSQL đơn lẻ dù ổ NVMe xịn nhất cũng bắt đầu nghẹt WAL fsync ở ngưỡng 15.000–25.000 write TPS phức tạp, do đó ở quy mô 10.000 TPS giao dịch tài chính, ta bắt buộc phải phân mảnh sổ cái (Application-level Sharding hoặc Citus/Vitess/TiDB) thành ít nhất 8 đến 16 Shard vật lý."
        ],
        bullets: [
          "Tính toán dung lượng lưu trữ: Giả sử trung bình ngày đạt 1.500 TPS (~130 triệu giao dịch/ngày), mỗi giao dịch gồm các bảng liên quan tốn ~2 KB -> Mỗi ngày phát sinh ~260 GB dữ liệu nóng, 1 năm ~95 TB, lưu trữ nóng + ấm 5 năm theo quy định Ngân hàng Nhà nước cần quy hoạch chiến lược Partition theo tháng và nén Cold Storage.",
          "Quy hoạch Kafka Partition: Để đạt thông lượng 10.000 sự kiện/giây với độ trễ mili-giây và dự phòng tăng trưởng gấp 3 lần, các topic cốt lõi như `ledger.postings.v1` nên chia từ 32 đến 64 Partitions với `acks=all` và `min.insync.replicas=2`.",
          "Kết nối HikariCP: Không nhân bừa số Pod! Nếu mỗi Shard PostgreSQL chịu tối đa 300 active connections, và em có 15 Pod Ledger Service kết nối vào mỗi Shard, thì `maximum-pool-size` mỗi Pod trên từng Shard chỉ được đặt tối đa 15–18 kết nối."
        ]
      },
      {
        heading: "2. Giải phẫu thảm họa Hot Account và Kỹ thuật Sub-account Striping",
        paragraphs: [
          "Hãy nhìn sâu vào bên trong PostgreSQL hoặc Oracle khi 5.000 luồng cùng chạy câu lệnh `UPDATE accounts SET balance = balance + :amt WHERE account_id = 'CHARITY_001'`. Do cơ chế khóa độc quyền cấp dòng (Row-level Exclusive Lock), tại một mili-giây chỉ có ĐÚNG 1 giao dịch được giữ khóa cập nhật dòng `'CHARITY_001'` và chờ ghi WAL xuống đĩa (mất trung bình 1ms–2ms). Toán học tàn nhẫn chỉ ra rằng: `1000ms / 2ms = tối đa 500 TPS` trên một dòng duy nhất! 4.500 request còn lại xếp hàng nối đuôi nhau trong trạng thái `LockWait`, làm cạn sạch toàn bộ HikariCP Connection Pool chỉ sau 0.8 giây và kéo sập cả những khách hàng bình thường không hề chuyển tiền từ thiện!",
          "Để phá vỡ giới hạn vật lý của 1 dòng đơn lẻ, các kiến trúc sư Core Banking & Ví điện tử lớn áp dụng mô hình **Sub-account Striping (Chia dải ví phụ)**. Khi một tài khoản được cấu hình (hoặc hệ thống tự động phát hiện đột biến lưu lượng qua Sliding Window Counter) là `HOT_ACCOUNT`, hệ thống tự động khởi tạo `N` ngăn số dư phụ (thường `N = 32` hoặc `64`, lũy thừa của 2). Mọi giao dịch **Ghi Có (Credit - nhận tiền)** vào tài khoản này sẽ không khóa dòng tài khoản cha nữa, mà băm mã giao dịch `Math.floorMod(txnId.hashCode(), 32)` để cộng tiền vào đúng 1 ngăn phụ độc lập. Khả năng chịu tải lập tức nhân lên `32 x 500 = 16.000 TPS` cho riêng một tài khoản!"
        ],
        bullets: [
          "Cách đọc số dư tổng (Aggregated Balance Read): Số dư thực của tài khoản nóng bằng tổng `SELECT COALESCE(SUM(balance), 0) FROM account_buckets WHERE parent_account_id = :id`, kết hợp Cache ngắn hạn 500ms–1s cho màn hình hiển thị công khai sao kê trực tuyến.",
          "Cách xử lý Ghi Nợ (Debit - rút tiền từ Hot Account): Tài khoản thu hộ/từ thiện có đặc trưng 99.99% giao dịch là nhận tiền, rất ít khi rút tiền lẻ từng giây. Khi rút tiền, hệ thống trừ trên `bucket_00` (ngăn chính); nếu `bucket_00` không đủ mới kích hoạt tiến trình gom số dư (Sweep) khóa lần lượt từ `bucket_01` đến `bucket_31` theo thứ tự tăng dần để chuyển dồn về `bucket_00`.",
          "Phương án thay thế Micro-batching Credit: Với các tài khoản doanh nghiệp chấp nhận độ trễ cập nhật số dư 200ms–500ms, có thể ghi nhận ngay bút toán Có vào Kafka Partition riêng và dùng 1 Consumer duy nhất gom 500 giao dịch cộng tổng 1 lần (`UPDATE balance = balance + :sumBatch`) trong 1 câu SQL duy nhất."
        ]
      },
      {
        heading: "3. Giao dịch Xuyên Phân Mảnh (Cross-Shard Transfer) và Chống Mất Tiền",
        paragraphs: [
          "Khi em đã chia sổ cái thành 16 Shard theo `account_id`, câu hỏi hóc búa tiếp theo của hội đồng phỏng vấn chắc chắn là: 'Tài khoản A nằm ở Shard 1 chuyển 10 triệu sang Tài khoản B nằm ở Shard 9 thì đảm bảo tính nguyên tử ACID thế nào khi không còn chung 1 Database?'. Nếu em trả lời dùng XA Distributed Transaction (2PC khóa cứng 2 DB cùng lúc), hội đồng sẽ trừ điểm ngay ở bài toán 10.000 TPS vì 2PC giữ khóa xuyên mạng gây suy giảm thông lượng thê thảm.",
          "Kiến trúc chuẩn ngân hàng hiện đại sử dụng **Local ACID Transaction + Transactional Outbox + Idempotent Credit Saga** thông qua tài khoản trung gian nội bộ (Internal Clearing / Transit GL trên từng Shard). Tại Shard 1, trong 1 giao dịch cục bộ cực nhanh: hệ thống Ghi Nợ tài khoản A 10 triệu và Ghi Có vào tài khoản Trung chuyển Liên Shard (`GL_SHARD_TRANSIT`) 10 triệu (đảm bảo tổng Nợ = tổng Có ngay trên Shard 1!), đồng thời ghi sự kiện `CreditShardCommand` vào bảng `outbox_events`. Tiếp đó, Kafka chuyển tiếp lệnh sang Shard 9 để Ghi Nợ `GL_SHARD_TRANSIT` và Ghi Có cho tài khoản B (có kiểm tra `idempotency_key` chống cộng hai lần)."
        ],
        bullets: [
          "Trạng thái cuối cùng nhất quán an toàn (Safe Eventual Consistency): Tiền đã trừ dứt điểm ở A ngay lập tức để A không thể chi tiêu kép; trong vài chục mili-giây vận chuyển qua Kafka sang Shard 9, khoản tiền nằm an toàn ở tài khoản kế toán `GL_SHARD_TRANSIT` chứ không hề biến mất khỏi bảng cân đối.",
          "Xử lý tài khoản B bị khóa / đóng ở Shard 9: Nếu Shard 9 từ chối ghi Có do tài khoản B vừa bị phong tỏa pháp lý, Shard 9 phát sự kiện bù trừ `CompensateTransferEvent` quay về Shard 1 để sinh bút toán đảo chiều hoàn trả 10 triệu từ `GL_SHARD_TRANSIT` về lại cho A.",
          "Tự động phát hiện Hot Account (Dynamic Hot-Spot Detection): Dùng Count-Min Sketch hoặc bộ đếm trượt trong bộ nhớ JVM để nếu bất kỳ tài khoản cá nhân nào bất ngờ vượt 80 giao dịch nhận tiền/giây thì tự động nâng cấp nóng lên chế độ Multi-bucket mà không cần khởi động lại dịch vụ."
        ]
      }
    ],
    comparison: {
      title: "So sánh 4 chiến lược xử lý cập nhật số dư chịu tải cao trong Ngân hàng",
      headers: ["Chiến lược kỹ thuật", "Thông lượng tối đa / 1 TK", "Ưu điểm cốt lõi", "Đánh đổi & Khi nào áp dụng"],
      rows: [
        [
          "Single-Row Pessimistic Lock (`SELECT FOR UPDATE`)",
          "~300 – 600 TPS",
          "Đơn giản tuyệt đối, đọc/ghi nhất quán tức thì ngay trên 1 dòng dữ liệu",
          "Nghẽn cổ chai nghiêm trọng nếu nhiều người cùng chuyển vào 1 tài khoản; chỉ dùng cho tài khoản cá nhân thường"
        ],
        [
          "Optimistic Lock (`@Version` CAS Retry)",
          "~100 – 300 TPS khi đụng độ cao",
          "Không giữ khóa DB khi đọc, cực nhanh nếu hiếm khi xảy ra xung đột đồng thời",
          "Thảm họa Retry Storm (99% luồng thất bại phải chạy lại) khi gặp Hot Account; tuyệt đối tránh cho tài khoản thu hộ"
        ],
        [
          "Sub-account Striping (Chia 32–64 Bucket)",
          "~10.000 – 25.000 TPS",
          "Giữ nguyên tính tức thời ACID của DB mà nhân thông lượng ghi Có lên N lần theo số ngăn",
          "Cần cộng tổng các ngăn khi đọc số dư thực và có luồng gom quỹ (Sweep) khi rút số tiền lớn"
        ],
        [
          "Kafka Partitioned Micro-batching Credit",
          "~50.000+ TPS",
          "Gom hàng trăm bút toán Có thành 1 lần ghi DB duy nhất, chịu tải cực đại",
          "Số dư người nhận trễ 100ms–500ms (Eventual Credit); rất hợp cho tài khoản Merchant siêu lớn hoặc Sàn TMĐT"
        ]
      ]
    },
    codeTitle: "Cài đặt Sub-account Striping (32 Buckets) giải bài toán Hot Account trong Core Ledger Java 21",
    code: [
      "@Service",
      "public class HotAccountStripedLedgerService {",
      "    private static final int BUCKET_COUNT = 32; // Lũy thừa của 2 để phân tải đồng đều",
      "    private final JdbcTemplate jdbc;",
      "    private final TransactionTemplate txTemplate;",
      "",
      "    public HotAccountStripedLedgerService(JdbcTemplate jdbc, TransactionTemplate txTemplate) {",
      "        this.jdbc = jdbc;",
      "        this.txTemplate = txTemplate;",
      "    }",
      "",
      "    public TransferReceipt transferToAccount(TransferCmd cmd) {",
      "        if (cmd.amount().scale() > 0 || cmd.amount().signum() <= 0) {",
      "            throw new IllegalArgumentException(\"Số tiền VND phải nguyên dương\");",
      "        }",
      "        int targetBucket = cmd.isReceiverHotAccount() ? (cmd.txnId().hashCode() & (BUCKET_COUNT - 1)) : 0;",
      "        return txTemplate.execute(status -> {",
      "            // 1. Trừ tiền tài khoản nguồn nguyên tử (chống âm tiền tuyệt đối ngay tại SQL)",
      "            int debited = jdbc.update(",
      "                \"UPDATE accounts SET balance = balance - ?, updated_at = NOW() WHERE id = ? AND balance >= ?\",",
      "                cmd.amount(), cmd.fromAccountId(), cmd.amount());",
      "            if (debited == 0) throw new InsufficientBalanceException(cmd.fromAccountId());",
      "",
      "            // 2. Cộng tiền vào Bucket tương ứng của tài khoản đích (giảm 32 lần tranh chấp khóa dòng)",
      "            jdbc.update(\"UPDATE account_buckets SET balance = balance + ?, tx_count = tx_count + 1 \" +",
      "                \"WHERE parent_account_id = ? AND bucket_no = ?\", cmd.amount(), cmd.toAccountId(), targetBucket);",
      "",
      "            // 3. Ghi sổ cái kế toán kép bất biến (Tổng Nợ = Tổng Có)",
      "            jdbc.update(\"INSERT INTO ledger_postings(txn_id, account_id, dc, amount, bucket_no) VALUES (?,?,?,?,?), (?,?,?,?,?)\",",
      "                cmd.txnId(), cmd.fromAccountId(), \"DEBIT\", cmd.amount(), 0,",
      "                cmd.txnId(), cmd.toAccountId(), \"CREDIT\", cmd.amount(), targetBucket);",
      "            return new TransferReceipt(cmd.txnId(), targetBucket, Instant.now());",
      "        });",
      "    }",
      "",
      "    public BigDecimal getAggregatedBalance(String accountId) {",
      "        return jdbc.queryForObject(",
      "            \"SELECT COALESCE(SUM(balance), 0) FROM account_buckets WHERE parent_account_id = ?\",",
      "            BigDecimal.class, accountId);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Phép toán bit `cmd.txnId().hashCode() & (BUCKET_COUNT - 1)` với `BUCKET_COUNT = 32` vừa nhanh hơn phép chia lấy dư, vừa không bao giờ trả về số âm khi `hashCode()` âm, lại đảm bảo tính xác định (deterministic) cho cùng một `txnId`.",
      "Câu lệnh trừ tiền `UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?` thực hiện kiểm tra số dư và khấu trừ nguyên tử ngay trong engine PostgreSQL, ngăn chặn 100% lỗi Race Condition rút âm tiền mà không cần đọc ra Java trước.",
      "Nhờ ghi Có vào dòng `(parent_account_id, bucket_no)` thay vì 1 dòng duy nhất, 32 luồng đồng thời có thể giữ khóa trên 32 dòng khác nhau và chạy song song tối đa trên các nhân CPU của Database.",
      "Bảng `ledger_postings` lưu kèm cột `bucket_no` để đội ngũ Kiểm toán và Đối soát cuối ngày truy vết chính xác từng đồng tiền đã chảy vào ngăn số mấy."
    ],
    labGuide: {
      goal: "Benchmark thực nghiệm trên PostgreSQL thật để chứng minh Sub-account Striping 32 ngăn tăng thông lượng chuyển tiền vào 1 tài khoản nóng gấp 15–25 lần so với cập nhật 1 dòng truyền thống.",
      steps: [
        "Bước 1: Khởi chạy PostgreSQL 16 bằng Docker, tạo bảng `accounts` và bảng `account_buckets (parent_account_id, bucket_no, balance)` rồi khởi tạo sẵn 32 dòng (`bucket_no` từ 0 đến 31) cho tài khoản `'MTTQ_RELIEF_01'`.",
        "Bước 2: Viết bài test dùng `Executors.newVirtualThreadPerTaskExecutor()` bắn đồng thời 2.000 lệnh chuyển 50.000đ vào `'MTTQ_RELIEF_01'` theo cách cũ (cập nhật 1 dòng `bucket_no = 0`), đo tổng thời gian hoàn tất và độ trễ P99.",
        "Bước 3: Đổi cờ `isReceiverHotAccount = true` để phân tải đều ra 32 ngăn như code mẫu, chạy lại đúng 2.000 lệnh đồng thời đó và so sánh thời gian hoàn tất cũng như biểu đồ `LockWait` trong `pg_stat_activity`.",
        "Bước 4: Gọi hàm `getAggregatedBalance('MTTQ_RELIEF_01')` xác nhận tổng tiền thu được bằng đúng `2.000 * 50.000 = 100.000.000` đồng không sai lệch một xu."
      ],
      expectedOutput: "Thời gian xử lý 2.000 giao dịch dồn vào 1 tài khoản giảm mạnh từ ~4.2 giây (nghẽn LockWait dày đặc) xuống chỉ còn ~0.25 giây (tăng tốc ~16 lần), P99 dưới 45ms và tổng số dư 32 ngăn khớp tuyệt đối 100.000.000đ."
    },
    examTips: [
      "Khi phỏng vấn bài 10.000 TPS, hãy chủ động hỏi và chốt ngay 3 chỉ số vàng ở 2 phút đầu: Peak TPS vs Average TPS, RPO = 0 (không mất tiền), và tỷ lệ Đọc/Ghi — động thái này lập tức xếp em vào nhóm Senior/Architect.",
      "Tuyệt đối KHÔNG đề xuất dùng `@Version` (Optimistic Locking) cho tài khoản nóng: khi 1.000 người cùng sửa 1 dòng, 999 người sẽ dính `OptimisticLockingFailureException` gây bão retry làm sập CPU.",
      "Nhớ phân biệt rõ chiến lược Ghi Có (Credit - dễ phân mảnh thành nhiều bucket cộng dồn) và Ghi Nợ (Debit - phải kiểm soát tổng số dư khả dụng chặt chẽ để không chi vượt quá tiền thực có)."
    ],
    summaryTakeaways: [
      "Ở quy mô 10.000 TPS chuyển tiền, 1 giao dịch nghiệp vụ tương đương ~5–6 thao tác ghi DB nên bắt buộc phải kết hợp Sharded Ledger theo `account_id` và tối ưu kích thước HikariCP Pool.",
      "Nút thắt chết người nhất của hệ thống chuyển tiền không nằm ở CPU của Java mà nằm ở Row-level Lock Contention khi hàng nghìn người cùng chuyển vào 1 Hot Account.",
      "Sub-account Striping chia 1 tài khoản nóng thành 32–64 ngăn phụ giúp nhân thông lượng ghi Có lên hàng chục lần mà vẫn giữ trọn vẹn tính toàn vẹn ACID của Database.",
      "Giao dịch chuyển tiền khác Shard không dùng 2PC/XA nặng nề mà dùng Local ACID kèm tài khoản trung chuyển `GL_SHARD_TRANSIT`, Outbox Pattern và cơ chế bù trừ bất biến."
    ],
    lessonQuestions: [
      {
        question: "Trong kỳ quyên góp ủng hộ đồng bào vùng lũ, 6.000 khách hàng đồng loạt bấm chuyển khoản vào duy nhất một số tài khoản từ thiện mỗi giây. Hệ thống Core Banking hiện tại dùng câu lệnh UPDATE trực tiếp trên 1 dòng của bảng accounts khiến HikariCP cạn sạch kết nối và treo toàn bộ dịch vụ. Giải pháp kiến trúc nào xử lý triệt để nút thắt này mà vẫn đảm bảo RPO = 0 (không mất giao dịch)?",
        options: [
          "Đổi từ Pessimistic Lock sang Optimistic Lock (@Version) kết hợp vòng lặp while retry 50 lần trong Java Service.",
          "Áp dụng Sub-account Striping: tách tài khoản từ thiện thành 32 hoặc 64 ngăn số dư phụ (buckets) trên Database, băm mã giao dịch để ghi Có song song vào từng ngăn và cộng tổng các ngăn khi truy vấn số dư.",
          "Lưu toàn bộ số dư tiền thật vào Redis RAM (tắt ghi đĩa để chạy nhanh) và mỗi tuần mới chép xuống PostgreSQL một lần.",
          "Tăng cấu hình HikariCP maximum-pool-size của mỗi Pod từ 20 lên 5.000 kết nối để mọi luồng đều vào được Database chờ khóa."
        ],
        answer: 1,
        explanation: "Sub-account Striping giải quyết đúng gốc rễ vật lý là tranh chấp khóa độc quyền trên 1 dòng duy nhất (Single-row Lock Contention). Khi chia thành 32–64 dòng ngăn phụ độc lập trong PostgreSQL, các giao dịch Ghi Có được xử lý song song trên đĩa bền vững (RPO = 0) mà không chèn ép lẫn nhau.",
        wrongReasons: [
          "Optimistic Lock khi gặp 6.000 luồng cùng sửa 1 dòng sẽ làm 99.9% luồng bị lỗi xung đột version và tạo ra cơn bão retry (Retry Storm) đánh sập hệ thống nhanh hơn.",
          "",
          "Lưu tiền thật chỉ trên Redis RAM không ghi đĩa vi phạm nghiêm trọng nguyên tắc RPO = 0 của ngân hàng; nếu sập điện cụm Redis sẽ mất trắng hàng tỷ đồng tiền ủng hộ.",
          "Tăng pool-size lên 5.000 kết nối không làm tăng tốc độ mở khóa của 1 dòng mà chỉ làm PostgreSQL sập ngay lập tức do tràn RAM và quá tải Context Switching."
        ]
      },
      {
        question: "Khi sổ cái ngân hàng được phân mảnh (Sharding) thành 16 cụm PostgreSQL độc lập theo account_id, làm thế nào để thực hiện chuyển tiền từ Tài khoản A (ở Shard 1) sang Tài khoản B (ở Shard 8) vừa đạt thông lượng 10.000 TPS vừa không bao giờ làm lệch bảng cân đối kế toán?",
        options: [
          "Sử dụng giao thức XA Two-Phase Commit (2PC) khóa đồng thời cả Shard 1 và Shard 8 qua mạng cho mọi giao dịch.",
          "Trừ tiền ở Shard 1 xong rồi gọi HTTP trực tiếp sang Shard 8 ngay bên trong khối @Transactional của Shard 1.",
          "Thực hiện Local ACID tại Shard 1 (Ghi Nợ TK A, Ghi Có TK Trung chuyển GL_TRANSIT và ghi bảng outbox_events), sau đó phát sự kiện qua Kafka sang Shard 8 để Ghi Nợ GL_TRANSIT và Ghi Có TK B một cách lũy đẳng (kèm luồng bù trừ nếu B bị khóa).",
          "Bỏ toàn bộ ràng buộc Transaction để hai lệnh UPDATE chạy tự do, cuối năm kiểm toán sửa tay sau."
        ],
        answer: 2,
        explanation: "Kết hợp Local ACID + Tài khoản kế toán trung chuyển (GL_TRANSIT) + Transactional Outbox + Idempotent Saga giúp thời gian giữ khóa ở mỗi Shard chỉ tốn vài mili-giây, không bị nghẽn mạng liên cụm mà tổng Nợ/Có trên toàn hệ thống luôn cân bằng ở mọi thời điểm.",
        wrongReasons: [
          "2PC/XA khóa tài nguyên xuyên mạng giữa các DB phân tán làm độ trễ tăng vọt và sụt giảm nghiêm trọng thông lượng, không thể đáp ứng mức 10.000 TPS.",
          "Gọi HTTP liên mạng bên trong @Transactional giữ chặt DB connection của Shard 1, chỉ cần mạng sang Shard 8 chập chờn 2 giây là cạn sạch Connection Pool.",
          "",
          "Chạy lệnh cập nhật tiền tệ không có Transaction và cơ chế Outbox/Bù trừ sẽ gây mất tiền hoặc nhân đôi tiền ngay khi xảy ra lỗi mạng giữa hai bước."
        ]
      }
    ]
  },

  "A2": {
    duration: "65 phút",
    difficulty: "Senior / Principal Architect",
    codeLang: "java",
    teacherIntro: "Chào em, bài toán System Design thứ hai thường xuyên xuất hiện ở các Ngân hàng số, Ví điện tử và Siêu ứng dụng thanh toán là: 'Đúng 12:00:00 trưa ngày 11/11, ngân hàng tung ra 10.000 mã hoàn tiền (Cashback) 50% tối đa 100.000đ với tổng ngân sách cứng là 1 tỷ đồng; có 1 triệu khách hàng bấm nút Săn Mã trong cùng 1 giây đầu tiên. Thiết kế sao cho P99 < 100ms, mỗi CIF chỉ nhận tối đa 1 mã, và TUYỆT ĐỐI không chi lố ngân sách Marketing dù chỉ 100.000đ!'. Nếu em để 1 triệu request chọc thẳng vào bảng `campaigns` trong PostgreSQL, DB sẽ bốc khói ở giây thứ hai. Anh sẽ chỉ cho em kiến trúc phễu lọc 3 tầng kết hợp Redis Atomic Lua Script và Async Ledger Settlement chuẩn thực chiến.",
    analogy: {
      title: "Phát 10.000 vé cứng đánh số tại cổng sân vận động trước khi vào quầy đổi quà",
      body: "Hãy hình dung nếu 1 triệu cổ động viên cùng ùa thẳng vào phòng kế toán nhỏ xíu để ký sổ nhận tiền thưởng thì phòng kế toán sẽ vỡ trận ngay lập tức. Thay vào đó, ban tổ chức đặt một cổng xoay tự động siêu tốc ngay ngoài sân (Redis Lua in-memory): cổng có sẵn chồng 10.000 cuộn vé đánh số thứ tự, ai quẹt thẻ căn cước (CIF) chưa từng nhận và chồng vé vẫn còn thì cổng nhả vé trong 0.2 mili-giây rồi trừ lùi bộ đếm ngay lập tức; từ người thứ 10.001 cổng bật đèn đỏ 'Hết vé' ngay ngoài cửa mà không hề làm phiền phòng kế toán. Chỉ đúng 10.000 người cầm vé hợp lệ mới được đi thong thả qua hành lang (Kafka) để phòng kế toán ghi sổ cái phát tiền thưởng an toàn!"
    },
    objectives: [
      "Thiết kế kiến trúc phễu giảm tải đa tầng (CDN -> API Gateway Rate Limit -> Redis Atomic Lua -> Kafka Async Settlement) bảo vệ tuyệt đối Core Database.",
      "Viết thành thạo kịch bản Redis Lua Script kiểm tra trùng người dùng, trừ số lượng voucher và trừ ngân sách chiến dịch hoàn toàn nguyên tử trong 1 lượt mạng.",
      "Xử lý bài toán Đối soát ngân sách chiến dịch (Reconciliation) và thu hồi hạn mức (Quota Rollback/Recovery) khi bước ghi DB phía sau hoặc giao dịch thanh toán bị hủy."
    ],
    flow: [
      {
        step: "1. Traffic Shaping & Anti-Bot (Lọc biên & Chống tool tự động)",
        detail: "Tài sản tĩnh (banner, thể lệ, đồng hồ đếm ngược) phục vụ 100% từ CDN; API Gateway chặn IP/Device spam vượt quá 2 req/giây và kiểm tra chữ ký thiết bị chống script cào mã."
      },
      {
        step: "2. Redis Atomic Lua Gatekeeper (Chốt chặn hạn mức nguyên tử)",
        detail: "Thực thi 1 Lua Script duy nhất trên Redis: kiểm tra `SISMEMBER` xem CIF đã săn chưa, kiểm tra tồn kho `stock > 0` và `budget >= amount`, sau đó `DECR` tồn kho + `SADD` CIF trong < 1ms."
      },
      {
        step: "3. Fast-Fail Short Circuit (Ngắt mạch tức thời tại RAM)",
        detail: "Ngay khoảnh khắc voucher về 0 (sau khoảng 150ms đầu), cờ in-memory cục bộ trên từng Pod Java bật `SOLD_OUT = true` trong 2 giây để từ chối 990.000 request đến muộn ngay tại RAM mà không chạm tới cả Redis!"
      },
      {
        step: "4. Kafka Async Voucher & Cashback Ledger (Ghi sổ bất đồng bộ)",
        detail: "Chỉ đúng 10.000 lượt thắng cuộc được đẩy vào Kafka Topic để Worker ghi bền vững vào PostgreSQL (`user_vouchers` / hạch toán từ `GL_MARKETING_EXPENSE` sang ví khách) tốc độ ổn định."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao dùng Redis thường vẫn bị 'Lố Ngân Sách' (Overselling) nếu thiếu Lua?",
        paragraphs: [
          "Rất nhiều lập trình viên dùng Redis nhưng viết trong Java thành 3 lệnh rời rạc: bước 1 gọi `redis.opsForSet().isMember(claimedSet, cif)` thấy trả về `false`; bước 2 gọi `redis.opsForValue().get(budgetKey)` thấy còn `100.000đ`; bước 3 mới gọi `decrBy(budgetKey, 100000)`. Dưới áp lực 100.000 request/giây, trong khoảng hở 0.5ms giữa bước 2 và bước 3, có tới 400 luồng khác cũng vừa đọc thấy ngân sách còn `100.000đ` và cùng nhảy vào trừ! Kết quả là ngân sách chiến dịch âm 40 triệu đồng chỉ trong chớp mắt và phòng Marketing sẽ sang tận bàn làm việc của đội Backend để hỏi chuyện.",
          "Bí quyết của Redis nằm ở mô hình thực thi đơn luồng (Single-threaded Command Execution) cho các lệnh kịch bản: khi em đóng gói toàn bộ logic kiểm tra điều kiện và cập nhật trạng thái vào một **Lua Script (`EVALSHA`)**, Redis cam kết chạy trọn vẹn từ dòng đầu tới dòng cuối của script đó một cách nguyên tử tuyệt đối — không một lệnh nào của bất kỳ client nào khác có thể xen ngang vào giữa! Nhờ đó, cả 3 kiểm tra (chưa nhận mã + còn số lượng + đủ ngân sách) và 3 cập nhật (đánh dấu CIF + giảm số lượng + trừ ngân sách) hoàn tất gọn gàng trong 1 vòng RTT mạng duy nhất (~0.3ms)."
        ],
        bullets: [
          "Hash Tag trên Redis Cluster: Khi chạy Redis Cluster nhiều node, mọi `KEYS[]` truyền vào cùng 1 Lua Script BẮT BUỘC phải nằm trên cùng một Hash Slot bằng cách đặt tên có ngoặc nhọn giống nhau, ví dụ: `promo:{camp2026}:budget`, `promo:{camp2026}:stock`, `promo:{camp2026}:users`.",
          "Local JVM Sold-Out Flag: Khi Lua Script trả về mã `-2` (hết sạch ngân sách), Java Pod có thể lưu vào biến `Caffeine Cache` cục bộ sống 3 giây để 99% request đến sau được trả kết quả 'Đã hết lượt' trong 0.01ms, cứu cả băng thông mạng nội bộ vào Redis.",
          "Tránh Hot Key cực đoan cho chiến dịch 10 triệu voucher: Nếu số lượng mã quá khổng lồ khiến 1 Master Node Redis chạm ngưỡng 120.000 ops/s, ta áp dụng tương tự bài A1: chia ngân sách Redis thành 10 shard key `promo:{camp_0}..promo:{camp_9}` mỗi shard giữ 1/10 tồn kho."
        ]
      },
      {
        heading: "2. Bảo đảm Không Mất Mã Đã Trúng giữa Redis và Kafka/PostgreSQL",
        paragraphs: [
          "Câu hỏi phản biện sắc lẹm mà giám khảo Senior luôn tung ra ngay sau khi em trình bày Redis Lua là: 'Redis vừa trừ tồn kho báo khách trúng mã rồi, nhưng đúng mili-giây sau Pod Java bị sập nguồn (OOM/Crash) trước khi kịp gửi sự kiện lên Kafka để lưu Database thì sao? Khách mất mã mà tổng ngân sách chiến dịch lại bị hụt vĩnh viễn 1 suất!'. Đây chính là điểm phân hóa giữa người chỉ đọc blog và người từng vận hành hệ thống khuyến mãi thật.",
          "Để khép kín lỗ hổng này mà không làm chậm luồng nóng, ngay bên trong chính Lua Script vừa trừ hạn mức thành công, ta không chỉ `SADD` vào tập hợp người dùng đã nhận mà còn ghi luôn một bản ghi nhật ký trúng thưởng vào cấu trúc **Redis Stream (`XADD promo:{camp2026}:wins * cif ... claimId ...`)** hoặc Hash trạng thái chờ `HSET promo:{camp2026}:pending claimId timestamp`! Khi Worker phía sau tiêu thụ từ Kafka và ghi thành công vào PostgreSQL, Worker mới gọi lệnh xác nhận xóa khỏi danh sách `pending`. Một Job đối soát nhẹ chạy mỗi 30 giây sẽ quét các mục `pending` quá 60 giây chưa có trong PostgreSQL để tự động đẩy bù (Replay) lại vào Kafka!"
        ],
        bullets: [
          "Khóa Lũy Đẳng ở PostgreSQL: Bảng `voucher_claims` luôn có ràng buộc cứng `UNIQUE (campaign_id, cif)` và `UNIQUE (claim_id)`, đảm bảo dù Job đối soát có phát bù sự kiện lần thứ hai cũng không bao giờ cấp trùng 2 voucher cho 1 khách.",
          "Hoàn trả hạn mức khi hủy đơn (Cashback Quota Release): Với hình thức hoàn tiền gắn kèm giao dịch thanh toán QR, nếu khách giữ suất hoàn tiền nhưng 10 phút sau không thanh toán hoặc giao dịch thanh toán thất bại, Saga bù trừ sẽ chạy script hoàn lại ngân sách vào Redis (kèm kiểm tra `SREM` cờ giữ chỗ để chống hoàn kép).",
          "Hạch toán Kế toán Kép cho Cashback thật: Khi cộng 50.000đ hoàn tiền vào tài khoản CASA/Ví của khách, tuyệt đối không cộng khống! Hệ thống phải sinh bút toán Nợ tài khoản chi phí khuyến mãi `GL_MKT_CASHBACK_641` và Có tài khoản khách hàng đúng 50.000đ."
        ]
      },
      {
        heading: "3. Phòng chống Gian lận Săn Khuyến Mãi (Promo Abuse & Sybil Attack)",
        paragraphs: [
          "Trong thực tế Fintech tại Việt Nam, mỗi khi tung chương trình tặng tiền mặt hay hoàn tiền 50%, đối thủ lớn nhất của hệ thống không chỉ là lưu lượng người dùng thật mà là các 'nông trại điện thoại' (Phone Farms / Giả lập Android) dùng công cụ bấm tự động ở mili-giây `12:00:00.001` để vét sạch ngân sách trong tích tắc khiến khách hàng thật bức xúc.",
          "Do đó, kiến trúc Flash-Sale ngân hàng luôn tích hợp lớp khiên chống gian lận thời gian thực ngay trước khi chạm tới Redis Lua. Ngoài giới hạn theo `CIF`, hệ thống kiểm tra chéo `Device Fingerprint`, địa chỉ IP / dải ASN, cấp độ định danh `eKYC Level >= 2` (đã xác thực sinh trắc học CCCD gắn chip), và có thể áp dụng cơ chế hàng đợi công bằng có trộn ngẫu nhiên vi mô (Micro-jitter / Challenge Token cấp trước 5 giây có ký HMAC) để triệt tiêu lợi thế của bot bắn trước giờ G."
        ],
        bullets: [
          "Dynamic Time-bound Challenge: Trước giờ mở săn 10 giây, App lấy một `saleToken` đã ký HMAC gắn với `cif + campaignId` từ CDN/Edge; request săn mã không có chữ ký hợp lệ bị chặn thẳng ở tầng Nginx/Gateway không tốn 1 chu kỳ CPU của Backend.",
          "Giới hạn đa chiều (Multi-dimensional Quota): Không chỉ 1 lượt/CIF mà còn tối đa 2 CIF/cùng 1 thiết bị vật lý (`deviceId`) trong suốt chiến dịch để chặn hành vi mượn tài khoản hàng loạt trên một máy đã root/jailbreak.",
          "Kill-Switch Ngân sách Khẩn cấp: Cấu hình cứng mức trần chi phí trên cả tầng Core Ledger (`GL_MKT_CASHBACK` có hạn mức chi tối đa trong ngày = 1 tỷ đồng); kể cả tầng Redis cấu hình nhầm số 0 thì tầng Sổ cái kế toán vẫn từ chối xuất tiền vượt trần ngân sách được duyệt."
        ]
      }
    ],
    comparison: {
      title: "Đối chiếu các phương án kiểm soát tồn kho Voucher / Ngân sách Cashback",
      headers: ["Phương án triển khai", "Độ trễ P99 (1M lượt)", "Nguy cơ chi lố (Oversell)", "Đánh giá chuẩn Production"],
      rows: [
        [
          "PostgreSQL `SELECT FOR UPDATE` trực tiếp",
          "> 15.000 ms (Timeout hàng loạt)",
          "Không lố nhưng sập DB",
          "Cấm kỵ tuyệt đối cho Flash-Sale triệu người bấm cùng giây vì nghẽn khóa dòng duy nhất"
        ],
        [
          "Redis `GET` rồi kiểm tra trong Java rồi `DECR`",
          "~15 ms",
          "CỰC CAO (lố hàng trăm triệu)",
          "Lỗi Race Condition kinh điển do khoảng hở thời gian giữa lệnh đọc và lệnh trừ từ nhiều Pod"
        ],
        [
          "Redis Distributed Lock (Redisson) bọc DB",
          "~3.000 – 8.000 ms",
          "An toàn nhưng quá chậm",
          "Biến hệ thống phân tán thành tuần tự từng người một chờ ghi đĩa DB, trải nghiệm quay vòng rất tệ"
        ],
        [
          "Redis Atomic Lua + Stream Log + Kafka Worker",
          "< 25 ms",
          "0% (Nguyên tử tuyệt đối)",
          "Chuẩn vàng ngành Fintech/E-commerce: nhanh ở biên RAM, bền vững và cân đối kế toán ở hậu phương"
        ]
      ]
    },
    codeTitle: "Dịch vụ Săn Cashback Triệu Lượt dùng Redis Atomic Lua Script + Stream Audit chống mất mã",
    code: [
      "@Service",
      "public class FlashCashbackClaimService {",
      "    private final StringRedisTemplate redis;",
      "    private final KafkaTemplate<String, String> kafka;",
      "    private volatile long soldOutUntilEpochMs = 0L; // Ngắt mạch nhanh tại RAM",
      "",
      "    // KEYS[1]: stock, KEYS[2]: budget, KEYS[3]: usersSet, KEYS[4]: auditStream",
      "    private static final DefaultRedisScript<Long> CLAIM_LUA = new DefaultRedisScript<>(String.join(\"\\n\",",
      "        \"if redis.call('SISMEMBER', KEYS[3], ARGV[1]) == 1 then return -1 end\",",
      "        \"local stock = tonumber(redis.call('GET', KEYS[1]) or '0')\",",
      "        \"local budget = tonumber(redis.call('GET', KEYS[2]) or '0')\",",
      "        \"local amt = tonumber(ARGV[2])\",",
      "        \"if stock <= 0 or budget < amt then return -2 end\",",
      "        \"redis.call('DECR', KEYS[1])\",",
      "        \"redis.call('DECRBY', KEYS[2], amt)\",",
      "        \"redis.call('SADD', KEYS[3], ARGV[1])\",",
      "        \"redis.call('XADD', KEYS[4], '*', 'cif', ARGV[1], 'amt', ARGV[2], 'claimId', ARGV[3])\",",
      "        \"return 1\"), Long.class);",
      "",
      "    public FlashCashbackClaimService(StringRedisTemplate redis, KafkaTemplate<String, String> kafka) {",
      "        this.redis = redis;",
      "        this.kafka = kafka;",
      "    }",
      "",
      "    public ClaimResult claimVoucher(String campId, String cif, long cashbackVnd, String claimId) {",
      "        if (System.currentTimeMillis() < soldOutUntilEpochMs) {",
      "            return ClaimResult.SOLD_OUT;",
      "        }",
      "        String tag = \"promo:{\" + campId + \"}:\"; // Cùng Hash Slot trên Redis Cluster",
      "        List<String> keys = List.of(tag + \"stock\", tag + \"budget\", tag + \"users\", tag + \"wins\");",
      "        Long code = redis.execute(CLAIM_LUA, keys, cif, String.valueOf(cashbackVnd), claimId);",
      "",
      "        if (Long.valueOf(-1L).equals(code)) return ClaimResult.ALREADY_CLAIMED;",
      "        if (Long.valueOf(-2L).equals(code)) {",
      "            soldOutUntilEpochMs = System.currentTimeMillis() + 2_000L;",
      "            return ClaimResult.SOLD_OUT;",
      "        }",
      "        kafka.send(\"promo.cashback.awarded.v1\", cif, campId + \"|\" + cif + \"|\" + cashbackVnd + \"|\" + claimId);",
      "        return ClaimResult.AWARDED;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Cú pháp Hash Tag `promo:{campId}:...` ép cả 4 key (`stock`, `budget`, `users`, `wins`) rơi vào cùng một Hash Slot trên Redis Cluster, tránh lỗi kinh điển `CROSSSLOT Keys in request don't hash to the same slot`.",
      "Lệnh `XADD` ghi thẳng biên lai trúng thưởng vào Redis Stream ngay trong cùng khối nguyên tử với `DECRBY` và `SADD`: kể cả JVM sập nguồn trước dòng `kafka.send(...)`, bản ghi trong Stream vẫn còn nguyên để Job đối soát phát bù.",
      "Biến `volatile soldOutUntilEpochMs` đóng vai trò cầu chì nội bộ siêu nhẹ: một khi chiến dịch chạm đáy ngân sách, hàng trăm nghìn request dội tới trong 2 giây kế tiếp được trả về ngay tại RAM không tốn nổi 1 gói tin TCP sang Redis.",
      "Đối tượng `DefaultRedisScript<Long>` khai báo `static final` giúp Spring Data Redis tự động băm SHA1 một lần và gọi bằng `EVALSHA` tiết kiệm băng thông truyền nội dung script."
    ],
    labGuide: {
      goal: "Mô phỏng cuộc đua Flash-Sale 5.000 người cùng tranh đúng 100 suất hoàn tiền 50.000đ (ngân sách cứng 5.000.000đ) để chứng minh không bị cấp lố dù chỉ 1 suất và không ai nhận trùng 2 lần.",
      steps: [
        "Bước 1: Chạy Redis 7 bằng Docker, nạp dữ liệu khởi tạo cho chiến dịch `11_11`: `SET promo:{11_11}:stock 100` và `SET promo:{11_11}:budget 5000000`.",
        "Bước 2: Dùng `CountDownLatch(1)` giữ 5.000 Virtual Threads tại vạch xuất phát (trong đó cố tình cho 500 luồng dùng trùng lại `cif = 'CIF_VIP_01'` để thử bẫy bấm đúp), sau đó mở chốt đồng loạt.",
        "Bước 3: Đếm kết quả trả về trong Java và kiểm tra trên Redis: xác nhận đúng 100 kết quả `AWARDED`, giá trị `promo:{11_11}:budget` bằng `0` tròn trĩnh (không bao giờ âm), và `SCARD promo:{11_11}:users` bằng đúng `100`.",
        "Bước 4: Chạy lệnh `XLEN promo:{11_11}:wins` trên Redis CLI xác nhận có đúng 100 bản ghi nhật ký trúng thưởng khớp 1-1 với 100 người thắng để sẵn sàng ghi xuống Sổ cái."
      ],
      expectedOutput: "5.000 request hoàn tất trong dưới 180ms, đúng 100 CIF khác nhau nhận được mã, CIF bấm đúp chỉ trúng tối đa 1 lần và các lần sau nhận `ALREADY_CLAIMED`, ngân sách còn lại dừng chính xác ở 0 đồng."
    },
    examTips: [
      "Nếu hội đồng hỏi 'Làm sao dùng Redis Cluster cho Lua Script nhiều key?', câu trả lời ăn điểm tuyệt đối ngay lập tức là **Hash Tags `{campaignId}`** để gom các key về chung một Hash Slot.",
      "Đừng quên nêu phương án phòng vệ kép (Defense in Depth): Redis giữ cổng tốc độ cao ở ngoài, nhưng Database PostgreSQL vẫn phải có `UNIQUE (campaign_id, cif)` và tài khoản kế toán `GL_MARKETING` vẫn phải có trần hạn mức ngày.",
      "Luôn phân biệt rõ 2 pha: 'Giữ suất trúng mã' (xử lý đồng bộ cực nhanh trên Redis < 20ms) và 'Phát hành voucher / Hạch toán hoàn tiền' (xử lý bất đồng bộ êm ái qua Kafka Worker)."
    ],
    summaryTakeaways: [
      "Tuyệt đối không cho lưu lượng đột biến kiểu Flash-Sale triệu lượt va đập trực tiếp vào các dòng ngân sách của Core OLTP Database.",
      "Redis Lua Script đảm bảo kiểm tra trùng người dùng, kiểm tra tồn kho và khấu trừ ngân sách diễn ra nguyên tử tuyệt đối không bị Race Condition.",
      "Ghi kèm sự kiện trúng thưởng vào Redis Stream ngay trong Lua Script kết hợp Job đối soát định kỳ giúp triệt tiêu nguy cơ mất suất khi ứng dụng sập trước bước đẩy Kafka.",
      "Mọi khoản tiền Cashback cộng vào tài khoản khách hàng đều phải đi qua bút toán kế toán kép từ tài khoản chi phí Marketing để minh bạch tài chính."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên cài đặt tính năng săn 1.000 mã hoàn tiền bằng cách trên Java gọi `redis.get('stock')`, kiểm tra `if (stock > 0)` rồi gọi `redis.decrement('stock')`. Khi mở chiến dịch có 50.000 người bấm cùng lúc, hệ thống phát tới 1.420 mã gây thiệt hại ngân sách. Nguyên nhân gốc rễ và cách sửa chuẩn nhất là gì?",
        options: [
          "Do Redis lưu sai số nguyên; cần chuyển sang lưu số lượng mã trong file văn bản trên ổ cứng.",
          "Do hai lệnh GET và DECR tách rời không nguyên tử (Check-Then-Act Race Condition) khiến hàng trăm luồng cùng đọc thấy stock > 0 trước khi kịp trừ; cần gom toàn bộ bước kiểm tra trùng user, kiểm tra tồn kho và trừ ngân sách vào một Redis Lua Script duy nhất.",
          "Do Java chạy quá nhanh; cần thêm Thread.sleep(2000) trước mỗi lệnh gọi Redis.",
          "Chỉ cần bỏ bước kiểm tra if (stock > 0) là hết lỗi."
        ],
        answer: 1,
        explanation: "Tách rời lệnh đọc kiểm tra ở phía ứng dụng và lệnh ghi cập nhật ở phía Redis tạo ra cửa sổ tranh chấp đồng thời giữa các Pod. Đưa toàn bộ điều kiện kiểm tra và lệnh cập nhật vào một Redis Lua Script giúp Redis thực thi nguyên tử trọn gói không lệnh nào xen giữa được.",
        wrongReasons: [
          "Redis xử lý số nguyên 64-bit hoàn toàn chính xác; ghi file văn bản sẽ gây nghẽn I/O nghiêm trọng và càng dễ lỗi đồng thời.",
          "",
          "Thêm Thread.sleep(2000) chỉ làm treo luồng xử lý và gây timeout diện rộng chứ hoàn toàn không ngăn được nhiều luồng cùng lọt qua câu lệnh if.",
          "Bỏ bước kiểm tra tồn kho sẽ khiến bộ đếm trừ thẳng xuống âm hàng chục nghìn và tất cả 50.000 người đều được nhận mã!"
        ]
      },
      {
        question: "Khi triển khai Lua Script thao tác trên 3 key gồm tồn kho, ngân sách và danh sách người dùng của cùng một chiến dịch trên cụm Redis Cluster 6 nodes, quy tắc đặt tên key nào bắt buộc phải tuân thủ để tránh lỗi CROSSSLOT?",
        options: [
          "Đặt tên key hoàn toàn ngẫu nhiên bằng UUID cho mỗi trường.",
          "Sử dụng Hash Tag ngoặc nhọn chứa cùng một định danh chiến dịch, ví dụ `promo:{camp99}:stock`, `promo:{camp99}:budget`, `promo:{camp99}:users` để Redis Cluster băm cả 3 key về cùng một Hash Slot.",
          "Gộp toàn bộ dữ liệu của 10 triệu người dùng thành một chuỗi String JSON khổng lồ duy nhất.",
          "Tắt chế độ Cluster và chỉ chạy Redis trên máy tính cá nhân của lập trình viên."
        ],
        answer: 1,
        explanation: "Trên Redis Cluster, một Lua Script chỉ được phép truy cập các key nằm trên cùng một Hash Slot (cùng một node). Redis chỉ tính hàm băm CRC16 trên phần chuỗi nằm trong cặp ngoặc nhọn `{...}`, nên dùng chung `{camp99}` bảo đảm cả 3 key luôn nằm chung một slot.",
        wrongReasons: [
          "Key ngẫu nhiên sẽ phân tán ra các node khác nhau và bị Redis Cluster từ chối chạy Lua Script với lỗi CROSSSLOT ngay lập tức.",
          "",
          "Nhồi 10 triệu user vào 1 chuỗi JSON và parse lại mỗi lần bấm sẽ làm treo cứng luồng đơn của Redis (Big Key anti-pattern).",
          "Hệ thống ngân hàng Production bắt buộc cần cụm HA/Cluster chịu lỗi chứ không thể chạy đơn lẻ thiếu dự phòng."
        ]
      }
    ]
  },

  "A3": {
    duration: "60 phút",
    difficulty: "Senior / Principal Architect",
    codeLang: "java",
    teacherIntro: "Chào em, đã bao giờ em đứng ở quầy thu ngân siêu thị chờ mã SMS OTP thanh toán ngân hàng mà đồng hồ đếm ngược 60 giây trôi hết sạch vẫn chưa thấy tin nhắn đâu, để rồi 15 phút sau điện thoại mới báo 'ting' kèm một tin nhắn... quảng cáo mở thẻ tín dụng chưa? Trong ngành Ngân hàng, đó là một sự cố kiến trúc nghiêm trọng làm rớt tỷ lệ thanh toán thành công (Conversion Rate) thê thảm! Hôm nay chúng ta giải bài System Design #3: Thiết kế Trung tâm Thông báo Đa kênh (Notification Hub) xử lý hàng chục triệu tin mỗi ngày nhưng đảm bảo tin OTP & Biến động số dư luôn tới tay khách hàng trong dưới 2 giây (SLA < 2s), tự động đảo luồng nhà mạng khi đứt cáp SMS và không bao giờ gửi lặp tin trừ tiền hai lần.",
    analogy: {
      title: "Làn khẩn cấp dành riêng cho xe cứu thương tách biệt khỏi đoàn xe tải chở hàng",
      body: "Em hãy nhìn đường vành đai giờ tan tầm: nếu xe cứu thương cấp cứu (tin nhắn OTP thời hạn 60 giây) phải xếp hàng chung một làn đường độc đạo phía sau 5.000 chiếc xe container chở hàng khuyến mãi siêu thị (chiến dịch Marketing 5 triệu tin lúc 9h sáng), bệnh nhân chắc chắn không kịp tới viện! Một kiến trúc sư giao thông giỏi sẽ xây rào cứng tách riêng 3 làn đường hoàn toàn độc lập: Làn Cấp Cứu (`critical-otp`), Làn Ưu Tiên Cao (`high-balance-alert`) và Làn Xe Tải (`bulk-marketing` bị giới hạn tốc độ bắn), đồng thời chuẩn bị sẵn cả cầu phao dự phòng (Nhà mạng SMS số 2, Push App, OTT Zalo) nếu cây cầu chính đang kẹt."
    },
    objectives: [
      "Thiết kế kiến trúc hàng đợi phân tầng ưu tiên tuyệt đối (Strict Lane Isolation) tách rời tài nguyên Kafka Topic, Consumer Group, Thread Pool và băng thông nhà mạng.",
      "Xây dựng bộ định tuyến thông minh đa nhà cung cấp (Multi-vendor SMS Smart Router) tự động chuyển mạch dự phòng (Failover) dựa trên tỷ lệ lỗi và độ trễ thời gian thực.",
      "Triển khai chiến lược tiết kiệm chi phí Đa kênh (Push App / OTT trước, SMS Fallback sau cho biến động số dư) kết hợp chống gửi lặp tin nhắn (Idempotent Deduplication)."
    ],
    flow: [
      {
        step: "1. Ingestion & Priority Classification (Phân loại SLA ngay cửa ngõ)",
        detail: "Notification API / Outbox phân loại bản tin thành 3 mức cứng: `P0_CRITICAL_OTP` (SLA < 2s, TTL 60s), `P1_BALANCE_ALERT` (SLA < 5s) và `P3_BULK_PROMO` (chấp nhận trễ hàng giờ, có Rate Limit đầu vào)."
      },
      {
        step: "2. Isolated Kafka Lanes & TTL Filter (Làn xử lý cô lập & Lọc hết hạn)",
        detail: "Mỗi mức ưu tiên đi vào Kafka Topic và cụm Pod Worker riêng biệt. Riêng Worker làn OTP kiểm tra `now - createdAt > 45s`: nếu tin nhắn bị kẹt quá hạn thì hủy ngay thay vì gửi mã OTP đã chết cho khách."
      },
      {
        step: "3. Deduplication & Channel Waterfall (Chống lặp & Thác kênh tối ưu phí)",
        detail: "Kiểm tra `msgId` trên Redis tránh bắn đúp; với biến động số dư, ưu tiên bắn In-App Push (FCM/APNs) hoặc OTT miễn phí/rẻ trước, nếu không có ACK nhận tin hoặc khách đăng ký SMS trọn gói mới gọi SMS."
      },
      {
        step: "4. Multi-Vendor SMS Smart Failover (Đảo nhà mạng tự động)",
        detail: "Bộ định tuyến theo dõi sức khỏe từng đầu mối Telco (Viettel, VNPT, Mobifone, cổng dự phòng B): nếu cổng chính Timeout hoặc lỗi > 5% trong 30s, Circuit Breaker lập tức bẻ lái lưu lượng sang cổng dự phòng."
      }
    ],
    sections: [
      {
        heading: "1. Cô lập Tài nguyên theo Cấp độ Ưu tiên (Strict Bulkhead & Lane Isolation)",
        paragraphs: [
          "Sai lầm chí mạng nhất khi thiết kế Notification Hub là dùng chung một Kafka Topic `notifications` có trường JSON `\"priority\": \"HIGH\"` hoặc dùng chung một bảng Database chờ quét. Kafka Partition là hàng đợi tuần tự (FIFO): nếu lúc 09:00:00 phòng Marketing đổ 5 triệu bản tin chúc mừng sinh nhật / khuyến mãi thẻ vào Topic đó, thì bản tin OTP đứng ở vị trí thứ 5.000.001 phải chờ xử lý xong 5 triệu tin kia mới tới lượt — tức là khách hàng nhận được mã OTP sau... 45 phút!",
          "Kiến trúc chuẩn ngân hàng bắt buộc cô lập dọc từ đầu đến cuối (End-to-End Swimlane Isolation): tách riêng **Kafka Topic**, tách riêng **Deployment / Consumer Pod** (để Marketing tăng tải CPU/GC cũng không làm giật lag JVM của cụm OTP), tách riêng **Connection Pool** gọi ra ngoài, và quan trọng nhất là tách riêng **Hạn ngạch TPS trên đường kết nối SMPP/HTTPS với Nhà mạng viễn thông**! Ví dụ nhà mạng cấp tổng băng thông 1.000 SMS/giây cho thương hiệu (Brandname) của ngân hàng, ta cấu hình khóa cứng luồng Marketing chỉ được phép dùng tối đa 300 SMS/giây (và cấm chạy vào khung giờ cao điểm lương 11h–12h, 17h–18h), dành trọn 700 SMS/giây sẵn sàng cho OTP và cảnh báo gian lận."
        ],
        bullets: [
          "TTL Expiration Guard cho OTP: Một mã OTP chỉ sống 60 giây. Nếu nhà mạng vừa hồi phục sau sự cố nghẽn 5 phút, tuyệt đối không xả ồ ạt hàng chục nghìn mã OTP cũ đã quá hạn 45 giây ra đường truyền làm nghẽn tiếp các mã OTP mới.",
          "Bảo mật nội dung OTP trong Log & DB: Khác với tin quảng cáo, nội dung mã 6 số OTP phải được che mờ (`******`) ngay lập tức trong bảng lịch sử gửi tin `notification_logs` và hệ thống Kibana để nhân viên vận hành IT hay CSKH không thể đọc trộm mã OTP đang còn hiệu lực của khách hàng VIP.",
          "Quiet Hours cho Marketing: Bộ lập lịch của làn `P3_BULK_PROMO` bắt buộc có quy tắc tự động tạm dừng từ 21:00 tối đến 08:00 sáng hôm sau theo quy định chống tin nhắn rác viễn thông, trong khi làn `P0` và `P1` hoạt động 24/7/365."
        ]
      },
      {
        heading: "2. Định tuyến Đa Nhà Mạng Thông minh (Multi-Vendor SMS Failover)",
        paragraphs: [
          "Đường truyền SMS Brandname qua các đại lý trung gian (SMS Aggregator / Telco Gateway) trong thực tế thường xuyên gặp hiện tượng nghẽn cục bộ theo từng nhà mạng đích (ví dụ sáng nay tuyến kết nối qua đại lý A tới thuê bao đầu số MobiFone bị treo 8 giây, nhưng gửi sang Viettel vẫn mượt 300ms). Nếu hệ thống chỉ gắn cứng 1 nhà cung cấp SMS duy nhất, mọi khách hàng dùng mạng bị nghẽn đó sẽ tê liệt giao dịch.",
          "Một Senior Architect sẽ thiết kế **Smart Vendor Router theo Cặp (Telco đích x Nhà cung cấp)** kết hợp `Resilience4j CircuitBreaker + SlidingWindowMetrics`. Hệ thống nhận diện nhà mạng của số điện thoại người nhận (có tra bảng chuyển mạng giữ số MNP), chọn cổng ưu tiên số 1 có chi phí tốt và kết nối trực tiếp nhất. Nếu cổng số 1 ném lỗi HTTP 5xx, SMPP Error hoặc độ trễ vượt ngưỡng 1.500ms làm mở Circuit Breaker cho tuyến đó, bộ định tuyến lập tức chuyển hướng (Failover) ngay trong cùng lần xử lý sang Cổng dự phòng số 2 để tin OTP vẫn kịp đến điện thoại khách trong dưới 2 giây."
        ],
        bullets: [
          "Cẩn trọng Retry gây Gửi Lặp khi ReadTimeout: Với tin Biến động số dư ('TK 123456 -50,000,000 VND'), nếu gọi cổng SMS A bị `ReadTimeout` ở 2 giây (không rõ cổng A đã bắn tin đi hay chưa), cần cân nhắc rất kỹ trước khi bắn lại qua cổng B để khách không hoảng hốt tưởng bị trừ 50 triệu hai lần!",
          "Riêng với OTP và Biến động số dư: Nội dung tin biến động số dư luôn kèm `Số dư cuối: ...` và `Mã GD / Giờ chính xác HH:mm:ss` để dù đường truyền viễn thông gửi lặp ở tầng sóng radio thì khách hàng nhìn số dư cuối vẫn yên tâm tiền chỉ trừ 1 lần.",
          "Webhook Delivery Receipt (DLR): Lắng nghe bất đồng bộ bản tin báo phát thành công tới thiết bị (`DELIVRD` / `UNDELIV`) từ nhà mạng để tính toán tỷ lệ nhận tin thực tế (Delivery Rate) chứ không chỉ nhìn HTTP 200 lúc gửi đi."
        ]
      },
      {
        heading: "3. Bài toán Tối ưu Hàng Chục Tỷ Đồng Chi Phí SMS bằng Thác Đa Kênh (Channel Waterfall)",
        paragraphs: [
          "Một ngân hàng có 10 triệu khách hàng hoạt động, mỗi ngày phát sinh 20 triệu thông báo biến động số dư; nếu gửi toàn bộ bằng SMS Brandname (giá trung bình 500đ–800đ/tin tài chính), riêng tiền SMS mỗi năm ngốn mất hàng trăm tỷ đồng! Đó là lý do mọi ngân hàng hiện đại đều chuyển dịch sang kiến trúc **Thác Đa Kênh (Multi-Channel Waterfall)**: App Push Notification (FCM/APNs) -> OTT bảo mật -> SMS.",
          "Cơ chế hoạt động cực kỳ tinh tế: Khi có biến động số dư, hệ thống kiểm tra cấu hình của khách. Nếu khách dùng App ngân hàng bình thường, hệ thống đẩy tin qua FCM/APNs kèm mã hóa payload (chi phí = 0đ, độ trễ ~300ms) đồng thời đẩy vào luồng SSE nếu khách đang mở Web/App. Phía App mobile ngay khi nhận được Push ngầm sẽ tự động bắn một gói tin xác nhận mỏng (`Push-ACK`) ngược về Server. Nếu sau 4 giây Server không nhận được `Push-ACK` (do khách tắt 4G/Wi-Fi ở vùng sâu) VÀ giao dịch đó là giao dịch trừ tiền trọng yếu (ví dụ > 5 triệu đồng hoặc khách mua gói SMS VIP), bộ hẹn giờ Delay Queue mới tự động kích hoạt gửi bù qua kênh SMS!"
        ],
        bullets: [
          "Idempotency Key theo sự kiện nghiệp vụ: Mỗi thông báo mang khóa `notifKey = eventType + ':' + txnId + ':' + channel`. Trước khi gọi nhà cung cấp ngoài, Worker thực hiện `SETNX` trên Redis để nếu Kafka rebalance đọc lại message cũng không bao giờ đốt tiền gửi trùng.",
          "Template Engine an toàn & chuẩn hóa: Tuyệt đối không nối chuỗi tự do từ nội dung chuyển khoản của người gửi vào tin SMS mà không cắt lọc URL lạ — kẻ lừa đảo thường chuyển 1.000đ kèm nội dung chứa link giả mạo `https://bank-verify...` để mượn chính SMS Brandname thật của ngân hàng đi lừa nạn nhân!",
          "Sanitize URL/Phone trong Nội dung Chuyển khoản: Mọi thông báo biến động số dư bắt buộc chạy bộ lọc che mờ hoặc xóa toàn bộ tên miền/đường link (`http`, `.com`, `.vn`, `.xyz`) nằm trong lời nhắn của người chuyển trước khi xuất ra Push/SMS."
        ]
      }
    ],
    comparison: {
      title: "Chiến lược phân luồng & SLA cho Trung tâm Thông báo Ngân hàng",
      headers: ["Phân làn (Swimlane)", "SLA Mục tiêu", "Chiến lược Kênh & Retry", "Cơ chế Bảo vệ Đặc thù"],
      rows: [
        [
          "Làn P0: Smart OTP / SMS OTP",
          "< 2 giây (P99)",
          "Đa cổng SMS Active-Standby Failover tức thì (< 1.2s đổi cổng ngay)",
          "Kiểm tra TTL < 45s trước khi gửi; che mờ mã OTP `******` 100% trong Log & DB"
        ],
        [
          "Làn P1: Biến động số dư & Cảnh báo Fraud",
          "< 5 giây (P99)",
          "App Push + In-App Inbox tức thời; Fallback SMS nếu mất mạng / gói VIP",
          "Partition theo `accountId` giữ đúng thứ tự số dư; lọc sạch link lừa đảo trong lời nhắn"
        ],
        [
          "Làn P2: Sao kê tháng / Biên lai PDF",
          "< 5 phút",
          "Email SMTP / SES bất đồng bộ kèm link tải bảo mật hoặc file PDF mã hóa mật khẩu",
          "Giới hạn kích thước file đính kèm, tự động thử lại theo Exponential Backoff khi hộp thư đầy"
        ],
        [
          "Làn P3: Chiến dịch Quảng cáo (Marketing)",
          "Theo khung giờ (Giờ hành chính)",
          "App Push / OTT lô lớn, Rate Limit nghiêm ngặt (Token Bucket)",
          "Cô lập hoàn toàn Topic & Pod; tự động ngắt (Pause) ngoài khung 08:00–21:00"
        ]
      ]
    },
    codeTitle: "Worker Làn Ưu Tiên P0 (Critical OTP < 2s) có Kiểm tra TTL, Chống Gửi Lặp & Đảo Cổng SMS Tự Động",
    code: [
      "@Service",
      "public class CriticalOtpNotificationDispatcher {",
      "    private static final Duration OTP_MAX_AGE = Duration.ofSeconds(45);",
      "    private final StringRedisTemplate redis;",
      "    private final SmsVendorClient primaryTelco;   // Kết nối trực tiếp cổng chính",
      "    private final SmsVendorClient backupTelco;    // Cổng dự phòng khác hạ tầng",
      "    private final CircuitBreaker primaryBreaker;",
      "",
      "    public CriticalOtpNotificationDispatcher(StringRedisTemplate redis,",
      "            SmsVendorClient primaryTelco, SmsVendorClient backupTelco, CircuitBreakerRegistry cbReg) {",
      "        this.redis = redis;",
      "        this.primaryTelco = primaryTelco;",
      "        this.backupTelco = backupTelco;",
      "        this.primaryBreaker = cbReg.circuitBreaker(\"smsPrimaryOtp\");",
      "    }",
      "",
      "    @KafkaListener(topics = \"notif.p0.critical.otp\", containerFactory = \"otpFastLaneFactory\")",
      "    public void dispatchOtp(OtpDispatchEvent evt) {",
      "        // 1. Chặn xả tin OTP cũ nếu hàng đợi vừa nghẽn xong (tránh gửi mã sắp chết)",
      "        if (Duration.between(evt.createdAt(), Instant.now()).compareTo(OTP_MAX_AGE) > 0) {",
      "            return; // Ghi metric otp_dropped_expired_total",
      "        }",
      "        // 2. Chống gửi lặp (Idempotency) khi Kafka Consumer Rebalance",
      "        Boolean firstAttempt = redis.opsForValue()",
      "                .setIfAbsent(\"notif:dedup:\" + evt.messageId(), \"1\", Duration.ofMinutes(5));",
      "        if (!Boolean.TRUE.equals(firstAttempt)) return;",
      "",
      "        // 3. Gửi qua cổng chính với SLA cứng; tự động bẻ lái sang cổng dự phòng nếu lỗi/mở mạch",
      "        String safeText = sanitizeLinks(evt.templateBody());",
      "        try {",
      "            primaryBreaker.executeRunnable(() -> primaryTelco.sendFastSms(evt.msisdn(), safeText, 1200));",
      "        } catch (Exception primaryEx) {",
      "            backupTelco.sendFastSms(evt.msisdn(), safeText, 1500);",
      "        }",
      "    }",
      "",
      "    private String sanitizeLinks(String raw) {",
      "        // Xóa mọi tên miền/URL giả mạo có thể lọt vào biến tham số để chống Phishing qua Brandname",
      "        return raw.replaceAll(\"(?i)(https?://\\\\S+|\\\\b\\\\w+\\\\.(com|vn|net|xyz|top)\\\\b)\", \"[link-removed]\");",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Thuộc tính `containerFactory = \"otpFastLaneFactory\"` trỏ tới cụm luồng chuyên biệt chỉ đọc topic `notif.p0.critical.otp`, hoàn toàn miễn nhiễm dù phòng Marketing vừa đẩy 10 triệu bản tin vào topic `notif.p3.bulk.promo`.",
      "Chốt chặn `Duration.between(evt.createdAt(), Instant.now()) > 45s` giải quyết triệt để hiện tượng 'bão tin nhắn trễ': khách hàng không bị nhận dồn 5 mã OTP hết hạn gây rối loạn khi đang nhập mã mới nhất.",
      "Cấu trúc `primaryBreaker.executeRunnable(...)` kết hợp timeout ngắn `1200ms` giúp tổng thời gian kể cả khi cổng 1 lỗi và đảo sang cổng 2 vẫn nằm gọn dưới cam kết SLA 2 giây.",
      "Hàm `sanitizeLinks(...)` là chi tiết thực chiến cực kỳ đắt giá trong ngân hàng Việt Nam hiện nay để ngăn kẻ gian lợi dụng SMS Brandname chính chủ của ngân hàng phát tán link giả mạo."
    ],
    labGuide: {
      goal: "Kiểm chứng khả năng cô lập làn ưu tiên (OTP vẫn đạt dưới 500ms khi làn Marketing ngập 100.000 tin) và cơ chế tự động chuyển cổng SMS dự phòng khi cổng chính gặp sự cố.",
      steps: [
        "Bước 1: Dựng 2 Kafka Topic riêng biệt `notif.p0.critical.otp` và `notif.p3.bulk.promo`, cấu hình Consumer của `bulk.promo` bị giới hạn tốc độ chỉ xử lý 50 tin/giây.",
        "Bước 2: Bắn dồn 50.000 bản tin quảng cáo vào `notif.p3.bulk.promo`, ngay lập tức bắn tiếp 20 bản tin OTP vào `notif.p0.critical.otp` và đo độ trễ nhận tin của cả 20 mã OTP.",
        "Bước 3: Bật chế độ giả lập lỗi trên `primaryTelco` (cho ngủ 1.300ms rồi ném `SocketTimeoutException`), gửi 10 tin OTP liên tiếp và quan sát `CircuitBreaker` chuyển sang trạng thái `OPEN` từ tin thứ 5 để đi thẳng sang `backupTelco` không cần chờ 1.3s nữa.",
        "Bước 4: Thử truyền chuỗi nội dung có chứa `Chuyen khoan https://nh-gia-mao.xyz nhan qua` qua hàm `sanitizeLinks` và xác nhận đường link độc hại bị thay thế hoàn toàn bằng `[link-removed]`."
      ],
      expectedOutput: "Cả 20 bản tin OTP đều được gửi thành công dưới 350ms bất chấp 50.000 tin Marketing đang xếp hàng; khi cổng SMS chính sập, hệ thống tự động Failover sang cổng dự phòng giữ tỷ lệ thành công 100% và chặn sạch URL lừa đảo."
    },
    examTips: [
      "Trong phỏng vấn System Design bài Notification, câu đầu tiên phải khẳng định là **Tách Hàng Đợi Theo SLA (Priority Queue Isolation)** — tuyệt đối không bao giờ dùng chung 1 Kafka Topic cho OTP và Quảng cáo.",
      "Nếu giám khảo hỏi 'Làm sao giữ đúng thứ tự tin biến động số dư khi một tài khoản vừa nhận lương xong rút tiền liền sau đó?', hãy trả lời ngay: Đặt **Kafka Partition Key = `accountId`** cho topic `notif.p1.balance`.",
      "Điểm cộng cực lớn khiến giám khảo gật gù: Nhắc tới việc **Che mờ OTP trong log** và **Lọc xóa URL lừa đảo trong nội dung chuyển khoản** trước khi gửi SMS Brandname!"
    ],
    summaryTakeaways: [
      "Cô lập hoàn toàn tài nguyên (Kafka Topic, Worker Pod, hạn ngạch TPS nhà mạng) giữa làn OTP khẩn cấp, làn Biến động số dư và làn Quảng cáo hàng loạt.",
      "Bộ định tuyến SMS đa nhà mạng kết hợp Circuit Breaker giúp tự động chuyển luồng dự phòng trong dưới 2 giây khi một đầu mối viễn thông bị nghẽn.",
      "Mô hình Thác Đa Kênh (App Push có ACK xác nhận trước -> SMS dự phòng sau) giúp ngân hàng tiết kiệm hàng chục tỷ đồng chi phí viễn thông mỗi năm.",
      "Luôn kiểm tra TTL chống gửi OTP quá hạn, chống gửi lặp bằng Redis `SETNX` và lọc sạch đường link lạ trong lời nhắn để bảo vệ khách hàng khỏi Phishing."
    ],
    lessonQuestions: [
      {
        question: "Vào sáng ngày 8/3, phòng Marketing kích hoạt chiến dịch gửi 3 triệu thông báo chúc mừng cho khách hàng nữ. Ngay lập tức tổng đài ngân hàng nhận hàng nghìn cuộc gọi phàn nàn không nhận được mã OTP chuyển tiền khiến giao dịch bị hủy hàng loạt. Nguyên nhân kiến trúc nào dẫn đến sự cố này và cách khắc phục triệt để là gì?",
        options: [
          "Do khách hàng nhập sai mật khẩu đăng nhập đồng loạt.",
          "Do hệ thống dùng chung một hàng đợi Kafka Topic / Worker Pool và chung hạn ngạch kết nối SMS cho cả tin quảng cáo lẫn tin OTP gây hiện tượng Head-of-Line Blocking; cần tách hẳn Topic, cụm Worker và khoanh riêng băng thông nhà mạng ưu tiên tuyệt đối cho làn Critical OTP.",
          "Do cơ sở dữ liệu PostgreSQL không lưu được ký tự tiếng Việt có dấu.",
          "Khắc phục bằng cách tăng thời gian sống của mã OTP từ 60 giây lên 24 giờ."
        ],
        answer: 1,
        explanation: "Dùng chung hàng đợi FIFO khiến các bản tin OTP sinh ra sau phải xếp hàng chờ xử lý hết 3 triệu bản tin Marketing phía trước (Head-of-Line Blocking). Giải pháp chuẩn là cô lập hoàn toàn đường ống xử lý (Swimlane Isolation) và áp Rate Limit lên làn Marketing.",
        wrongReasons: [
          "Sự cố trùng khớp chính xác với thời điểm bắn 3 triệu tin Marketing chứng tỏ nguyên nhân nằm ở tắc nghẽn đường ống thông báo chứ không phải hành vi người dùng.",
          "",
          "Bảng mã UTF-8 không liên quan gì đến việc nghẽn hàng đợi gửi OTP.",
          "Tăng hiệu lực OTP lên 24 giờ vi phạm nghiêm trọng tiêu chuẩn bảo mật ngân hàng và vẫn không giúp khách nhận được mã ngay lúc đang đứng thanh toán."
        ]
      },
      {
        question: "Kẻ gian thực hiện chuyển khoản 2.000đ vào hàng loạt số tài khoản với nội dung chuyển tiền là 'TK cua quy khach bi khoa, truy cap gap bank-hotro.xyz de mo'. Vì sao đây là mối đe dọa nguy hiểm đối với Notification Hub của ngân hàng và tầng kỹ thuật phải chặn như thế nào?",
        options: [
          "Vì số tiền 2.000đ làm tràn kiểu dữ liệu BigDecimal của hệ thống.",
          "Vì Notification Hub lấy nội dung chuyển khoản ghép vào SMS Brandname chính thức của ngân hàng gửi cho nạn nhân, khiến tin nhắn giả mạo xuất hiện ngay trong luồng tin nhắn thật của ngân hàng trên điện thoại; phải cài bộ lọc Sanitize xóa/che mờ mọi URL và tên miền trong nội dung giao dịch trước khi tạo thông báo.",
          "Vì nhà mạng viễn thông tính phí gấp 100 lần cho chữ xyz.",
          "Không cần xử lý vì khách hàng tự chịu trách nhiệm."
        ],
        answer: 1,
        explanation: "Khi SMS được gửi dưới tên định danh chính thức (Brandname) của ngân hàng, điện thoại tự động gom chung vào hộp thư uy tín cùng các mã OTP thật trước đó, khiến nạn nhân rất dễ sập bẫy. Do đó Notification Hub bắt buộc phải lọc bỏ toàn bộ URL/domain trong trường lời nhắn người dùng nhập.",
        wrongReasons: [
          "2.000đ là số nguyên hoàn toàn bình thường trong hệ thống thanh toán.",
          "",
          "Cước SMS tính theo độ dài ký tự và loại tin chứ không tính theo đuôi chữ cái xyz.",
          "Bảo vệ uy tín kênh Brandname và ngăn chặn lừa đảo qua hạ tầng của mình là trách nhiệm bắt buộc về an toàn thông tin của ngân hàng."
        ]
      }
    ]
  },

  "A4": {
    duration: "65 phút",
    difficulty: "Senior / Principal Architect",
    codeLang: "java",
    teacherIntro: "Chào em, bài toán System Design thứ tư đánh thẳng vào khả năng xử lý dữ liệu khổng lồ (Big Data / Data-Intensive Architecture) của một Senior Java Backend: 'Ngân hàng có 15 triệu tài khoản, lưu lịch sử giao dịch 5 năm khoảng 12 tỷ dòng. Khách hàng cá nhân và kế toán doanh nghiệp muốn tìm kiếm sao kê theo từ khóa nội dung bất kỳ (ví dụ gõ chữ `tien nha thang 8`), lọc khoảng tiền, mã đối tác trong dưới 300ms, đồng thời kế toán tập đoàn muốn bấm nút Xuất Sao Kê Excel/CSV 500.000 dòng của cả năm mà không làm OutOfMemoryError Pod Java hay kéo chậm luồng chuyển tiền thật!'. Đây là sân khấu hoàn hảo để em trình diễn kiến trúc CQRS, CDC Kafka, OpenSearch/ClickHouse và Streaming S3 Export.",
    analogy: {
      title: "Tách riêng Quầy Giao Dịch Tiền Mặt tốc độ cao khỏi Phòng Thư Viện Tra Cứu Lưu Trữ",
      body: "Hãy tưởng tượng tại chi nhánh ngân hàng, chị giao dịch viên quầy số 1 đang đếm tiền thu chi từng giây cho hàng dài khách đứng chờ (Core OLTP PostgreSQL). Bỗng nhiên có một kế toán công ty chạy thẳng vào quầy số 1 bắt chị ấy dừng đếm tiền để lật tìm thủ công trong 60 thùng hóa đơn giấy suốt 5 năm qua xem tờ nào có chữ 'mua văn phòng phẩm'! Cả hàng khách phía sau sẽ nổi giận ngay lập tức. Thay vào đó, mỗi khi quầy số 1 in xong biên lai giao dịch, một bản sao tự động chạy qua băng chuyền (Debezium CDC + Kafka) sang Phòng Lưu Trữ Quốc Gia kế bên (OpenSearch + ClickHouse) có mục lục tra cứu chuyên dụng — khách muốn tìm chữ gì hay photo 500.000 trang cứ sang Phòng Lưu Trữ, còn quầy số 1 vẫn thu chi tiền mượt mà không trễ một nhịp!"
    },
    objectives: [
      "Áp dụng nhuần nhuyễn mẫu kiến trúc CQRS (Command Query Responsibility Segregation) tách biệt hoàn toàn tải Ghi giao dịch (OLTP) và tải Tìm kiếm đa tiêu chí / Phân tích (OLAP/Search).",
      "Thiết kế đường ống đồng bộ dữ liệu gần thời gian thực qua Debezium CDC / Outbox -> Kafka -> OpenSearch (tìm kiếm toàn văn) & ClickHouse/Partitioned Store (lưu trữ dài hạn 5 năm).",
      "Xây dựng cơ chế Xuất Báo Cáo Lớn Bất Đồng Bộ (Async Streaming Export) đọc kiểu con trỏ (Cursor/Stream) đẩy thẳng từng mảnh lên S3/MinIO và trả Pre-signed URL, không bao giờ tràn Heap JVM."
    ],
    flow: [
      {
        step: "1. Command Side OLTP ( Tối ưu tuyệt đối cho Ghi Sổ Cái)",
        detail: "PostgreSQL Core chỉ giữ dữ liệu nóng (ví dụ 3–6 tháng gần nhất trên NVMe Partition) với tối thiểu Index cần thiết (Account + BookingDate) để tốc độ INSERT hạch toán đạt mức cực đại."
      },
      {
        step: "2. CDC Streaming Pipeline (Đồng bộ bất biến dưới 1 giây)",
        detail: "Debezium đọc trực tiếp từ PostgreSQL WAL (hoặc bảng Outbox) đẩy dòng bút toán mới qua Kafka sang tầng Read Store mà không gây thêm tải truy vấn lên bảng giao dịch gốc."
      },
      {
        step: "3. Polyglot Read Store (Đọc đúng kho cho đúng nhu cầu)",
        detail: "Truy vấn 20 dòng sao kê mới nhất vừa phát sinh đọc từ Core/Replica có Keyset Pagination; tìm kiếm từ khóa tiếng Việt, lọc đa chiều 5 năm đọc từ OpenSearch / ClickHouse phân vùng theo tháng."
      },
      {
        step: "4. Async Streaming Export + Pre-signed URL (Xuất file 500k dòng)",
        detail: "Yêu cầu xuất file lớn trả về ngay `202 Accepted (jobId)`; Worker nền mở JDBC Stream (`fetchSize=2000`) ghi cuốn chiếu dạng GZIP/CSV thẳng lên MinIO/S3 rồi bắn thông báo kèm link tải có hạn 15 phút."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao chạy `LIKE '%tu_khoa%'` và `OFFSET 200000` trên OLTP sẽ giết chết Core Banking?",
        paragraphs: [
          "Trong PostgreSQL hay Oracle, chỉ mục B-Tree thông thường chỉ hỗ trợ tìm kiếm khớp tiền tố bên trái (`LIKE 'ABC%'`). Ngay khoảnh khắc em viết câu SQL `WHERE account_id = :acc AND narrative ILIKE '%tien nha%'` cho một tài khoản doanh nghiệp có 2 triệu giao dịch trong 5 năm, Database buộc phải đọc từng trang dữ liệu từ ổ cứng lên vùng nhớ `Shared Buffers` để quét chuỗi ký tự, đẩy văng các khối trang dữ liệu nóng của luồng chuyển tiền ra khỏi RAM (Cache Pollution) và ngốn 100% IOPS đĩa!",
          "Nguy hiểm không kém là kiểu phân trang ngây thơ `LIMIT 50 OFFSET 500000`: để trả về 50 dòng ở trang thứ 10.000, Database vẫn phải lôi toàn bộ 500.050 dòng lên sắp xếp rồi vứt bỏ 500.000 dòng đầu! Trong hệ thống ngân hàng chuẩn Senior, mọi API cuộn danh sách sao kê bắt buộc dùng **Keyset / Seek Pagination** dựa trên cặp khóa duy nhất tăng giảm đơn điệu: `WHERE account_id = :acc AND (booking_date, posting_id) < (:lastDate, :lastId) ORDER BY booking_date DESC, posting_id DESC LIMIT 50` — dù khách cuộn tới năm thứ 5 thì thời gian chạy vẫn giữ phẳng lì ở 2 mili-giây!"
        ],
        bullets: [
          "Giải quyết bài toán Read-Your-Own-Writes (Độ trễ đồng bộ CQRS): Khách vừa chuyển khoản xong bấm ngay sang màn hình Lịch sử giao dịch trong 200ms đầu khi OpenSearch chưa kịp index xong thì sao? Giải pháp thực chiến là **Hybrid Merge View**: màn hình mặc định lấy 20 giao dịch mới nhất đọc trực tiếp bằng Keyset Index siêu nhẹ hoặc Redis Recent List của tài khoản đó, chỉ khi khách gõ ô Tìm kiếm nâng cao / Lọc quá 90 ngày mới định tuyến sang OpenSearch!",
          "Chuẩn hóa bộ phân tích tiếng Việt (Vietnamese Folding Analyzer): Trên OpenSearch, cấu hình `asciifolding` + `lowercase` để khách gõ `'tien nha'` không dấu vẫn tìm trúng chính xác bản ghi `'Chuyển tiền nhà tháng 08'`.",
          "Bảo mật phân tách dữ liệu khách hàng trên Search Engine: Mọi truy vấn vào OpenSearch BẮT BUỘC gắn bộ lọc cứng `bool.filter: [{ term: { account_id: authenticatedAccountId } }]` ở tầng Backend (không lấy từ body linh hoạt của client) để triệt tiêu nguy cơ lộ sao kê chéo tài khoản."
        ]
      },
      {
        heading: "2. Phân tầng Lưu trữ Nóng – Ấm – Lạnh (Hot / Warm / Cold Tiering) cho 12 Tỷ Dòng",
        paragraphs: [
          "Quy định pháp luật ngành ngân hàng yêu cầu lưu trữ chứng từ và sao kê tối thiểu 5 năm đến 10 năm (thậm chí lâu hơn tùy loại hồ sơ). Nếu giữ toàn bộ 12 tỷ dòng trên ổ cứng SSD NVMe Enterprise đắt đỏ của cụm Primary PostgreSQL có nhân bản 3 bản sao đồng bộ cả 2 Data Center, chi phí phần cứng và thời gian sao lưu khôi phục (Backup/Restore RTO) sẽ phình to không thể kiểm soát.",
          "Kiến trúc sư dữ liệu giải quyết bằng **Data Lifecycle Management (DLM) theo Range Partition hàng tháng**: Bảng `ledger_postings` chia từng phân vùng độc lập `ledger_postings_2026_11`, `ledger_postings_2026_12`... Dữ liệu 6 tháng gần nhất (chiếm 95% nhu cầu xem sao kê hàng ngày) nằm ở tầng **Hot (NVMe OLTP + Hot OpenSearch Nodes)**; dữ liệu từ tháng thứ 7 đến hết 2 năm nằm ở tầng **Warm (ClickHouse nén cột tỉ lệ 8:1 hoặc OpenSearch Warm Nodes ổ SSD dung lượng cao)**; và dữ liệu từ năm thứ 3 đến năm thứ 10 được tháo phân vùng (`DETACH PARTITION`), xuất thành định dạng cột nén **Apache Parquet bất biến kèm chữ ký băm SHA-256** cất trên Object Storage (S3/MinIO Object Lock WORM - Write Once Read Many)."
        ],
        bullets: [
          "Ưu việt của ClickHouse cho Sao kê & Báo cáo năm: Nhờ lưu trữ hướng cột (Columnar Storage) sắp xếp vật lý theo `(account_id, booking_date)`, ClickHouse nén 12 tỷ dòng nhỏ gọn đáng kinh ngạc và tính tổng phát sinh Nợ/Có cả năm của một tập đoàn 1 triệu giao dịch chỉ trong 40 mili-giây!",
          "Tách phân vùng không gây khóa bảng: Thao tác gỡ phân vùng cũ đã hết giao dịch mới trên PostgreSQL 16 (`ALTER TABLE ledger_postings DETACH PARTITION ... CONCURRENTLY`) diễn ra êm ru mà không chặn luồng chuyển tiền hiện tại.",
          "Tính toàn vẹn pháp lý (WORM Storage): Bật chế độ Object Lock Compliance trên S3/MinIO cho kho lưu trữ lạnh để kể cả quản trị viên hệ thống có quyền cao nhất cũng không thể xóa hay sửa file sao kê lịch sử trước thời hạn luật định."
        ]
      },
      {
        heading: "3. Kỹ thuật Xuất Báo Cáo 500.000 Dòng với Bộ Nhớ Phẳng 30MB RAM (Zero-OOM Streaming)",
        paragraphs: [
          "Hãy hình dung kế toán một chuỗi siêu thị bấm nút 'Xuất sao kê chi tiết quý 4' gồm 500.000 giao dịch. Nếu lập trình viên viết `List<Posting> rows = repo.findAllByAccountAndQuarter(...)` rồi dùng Apache POI `XSSFWorkbook` dựng cây XML Excel trong bộ nhớ: 500.000 đối tượng Entity + cấu trúc DOM XML của `XSSFWorkbook` sẽ nuốt chửng từ **2.5 GB đến 4 GB Heap RAM** cho CHỈ MỘT request! Chỉ cần 2 kế toán bấm xuất file cùng lúc là Pod Java nổ tung `java.lang.OutOfMemoryError: Java heap space`!",
          "Để xử lý 500.000 hay thậm chí 5 triệu dòng mà mức tiêu thụ RAM luôn giữ phẳng lì ở ngưỡng ~30 MB, ta kết hợp 3 mảnh ghép kỹ thuật chuẩn mực: (1) Chuyển API sang mô hình **Bất đồng bộ (`POST /exports` -> trả `jobId`, chạy trên Worker Pod tách riêng khỏi API giao dịch)**; (2) Đọc Database bằng con trỏ phía Server (`setAutoCommit(false)` + `fetchSize = 2000` qua `JdbcTemplate.queryForStream`) để mỗi thời điểm mạng chỉ kéo 2.000 dòng vào RAM; và (3) Ghi cuốn chiếu từng dòng ra luồng nén CSV/GZIP hoặc `SXSSFWorkbook` (Streaming POI chỉ giữ cửa sổ 200 dòng trên RAM) nối ống trực tiếp lên S3 Multipart Upload, cuối cùng tạo **Pre-signed URL có chữ ký hết hạn sau 15 phút** gửi cho đúng chủ tài khoản tải về trực tiếp từ S3!"
        ],
        bullets: [
          "Lưu ý sống còn với PostgreSQL JDBC Driver: Đặt `statement.setFetchSize(2000)` trên PostgreSQL sẽ VÔ TÁC DỤNG (driver vẫn ngầm kéo toàn bộ 500.000 dòng về RAM!) nếu kết nối đang ở chế độ `autoCommit = true`! Bắt buộc phải bọc trong `@Transactional(readOnly = true)` để `autoCommit = false` kích hoạt Server-side Cursor thật sự.",
          "Giới hạn đồng thời xuất báo cáo (Export Quota): Mỗi CIF chỉ được phép có tối đa 1 tiến trình xuất file lớn đang ở trạng thái `PROCESSING` tại một thời điểm để tránh người dùng sốt ruột bấm 10 lần tạo 10 luồng quét lớn.",
          "Chống CSV Formula Injection: Khi xuất nội dung chuyển khoản ra CSV/Excel, nếu chuỗi bắt đầu bằng ký tự `=`, `+`, `-`, `@` (ví dụ kẻ gian chuyển tiền ghi nội dung `=CMD|' /C calc'!A0`), hệ thống bắt buộc chèn dấu nháy đơn `'` đằng trước để Excel không thực thi công thức độc hại trên máy tính kế toán!"
        ]
      }
    ],
    comparison: {
      title: "So sánh kiến trúc truy vấn & xuất dữ liệu sao kê quy mô lớn",
      headers: ["Bài toán thực tế", "Cách làm Sai (Gây sập hệ thống)", "Kiến trúc Chuẩn Senior Ngân hàng", "Độ trễ / Tài nguyên"],
      rows: [
        [
          "Cuộn xem sao kê tới trang sâu",
          "`LIMIT 50 OFFSET 500000` trên bảng gốc",
          "Keyset Pagination `WHERE (booking_date, id) < (:lastDate, :lastId) LIMIT 50`",
          "Phẳng ~2–5ms ở mọi độ sâu trang"
        ],
        [
          "Tìm từ khóa nội dung 5 năm",
          "`WHERE narrative ILIKE '%keyword%'` trên OLTP",
          "CQRS + CDC đồng bộ sang OpenSearch (Vietnamese Folding) lọc cứng theo `account_id`",
          "~30–120ms, 0% tải lên Core OLTP"
        ],
        [
          "Tổng hợp thu/chi triệu giao dịch",
          "Kéo hết Entity lên Java dùng `stream().reduce()`",
          "Truy vấn trực tiếp trên kho cột ClickHouse hoặc bảng tổng hợp ngày (Daily Rollup)",
          "~40ms cho cả triệu dòng"
        ],
        [
          "Xuất file sao kê 500.000 dòng",
          "API đồng bộ giữ HTTP + `XSSFWorkbook` nạp hết RAM",
          "Async Worker + JDBC Cursor (`fetchSize=2000`) + Stream CSV/SXSSF lên S3 Pre-signed URL",
          "RAM phẳng < 40MB, không bao giờ OOM"
        ]
      ]
    },
    codeTitle: "Worker Xuất Sao Kê Triệu Dòng Không Tràn RAM (PostgreSQL Cursor Stream -> GZIP S3 + Chống CSV Injection)",
    code: [
      "@Service",
      "public class StatementStreamingExportWorker {",
      "    private final JdbcTemplate readReplicaJdbc;",
      "    private final S3StoragePort s3Port;",
      "",
      "    public StatementStreamingExportWorker(JdbcTemplate readReplicaJdbc, S3StoragePort s3Port) {",
      "        this.readReplicaJdbc = readReplicaJdbc;",
      "        this.readReplicaJdbc.setFetchSize(2_000); // Kéo cuốn chiếu từng lô 2.000 dòng qua mạng",
      "        this.s3Port = s3Port;",
      "    }",
      "",
      "    // BẮT BUỘC readOnly = true (autoCommit=false) để PostgreSQL JDBC kích hoạt Server-Side Cursor!",
      "    @Transactional(readOnly = true)",
      "    public URI streamYearlyStatementToS3(String jobId, String accountId, LocalDate from, LocalDate to) throws Exception {",
      "        String objectKey = \"statements/\" + accountId + \"/\" + jobId + \".csv.gz\";",
      "        String sql = \"SELECT booking_date, txn_id, dc, amount, balance_after, narrative \" +",
      "                     \"FROM ledger_postings WHERE account_id = ? AND booking_date >= ? AND booking_date < ? \" +",
      "                     \"ORDER BY booking_date ASC, id ASC\";",
      "",
      "        try (OutputStream s3Out = s3Port.openMultipartUploadStream(objectKey, \"application/gzip\");",
      "             GZIPOutputStream gzipOut = new GZIPOutputStream(s3Out, 16_384);",
      "             BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(gzipOut, StandardCharsets.UTF_8));",
      "             Stream<String> csvLines = readReplicaJdbc.queryForStream(sql,",
      "                 (rs, i) -> formatSafeCsvRow(rs), accountId, from, to)) {",
      "",
      "            writer.write(\"BookingDate,TxnId,DebitCredit,AmountVND,BalanceAfter,Narrative\\n\");",
      "            Iterator<String> it = csvLines.iterator();",
      "            while (it.hasNext()) {",
      "                writer.write(it.next());",
      "                writer.newLine();",
      "            }",
      "            writer.flush();",
      "        }",
      "        return s3Port.generatePresignedDownloadUrl(objectKey, Duration.ofMinutes(15));",
      "    }",
      "",
      "    private String formatSafeCsvRow(ResultSet rs) throws SQLException {",
      "        String rawNote = Optional.ofNullable(rs.getString(\"narrative\")).orElse(\"\").replace(\"\\\"\", \"\\\"\\\"\");",
      "        // Chặn CSV Formula Injection nếu lời nhắn bắt đầu bằng =, +, -, @",
      "        String safeNote = (!rawNote.isEmpty() && \"=+-@\".indexOf(rawNote.charAt(0)) >= 0) ? \"'\" + rawNote : rawNote;",
      "        return String.join(\",\", rs.getString(\"booking_date\"), rs.getString(\"txn_id\"),",
      "            rs.getString(\"dc\"), rs.getBigDecimal(\"amount\").toPlainString(),",
      "            rs.getBigDecimal(\"balance_after\").toPlainString(), \"\\\"\" + safeNote + \"\\\"\");",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Chi tiết 'sống còn' phân biệt người từng làm thật trên PostgreSQL: nếu thiếu `@Transactional(readOnly = true)` (tức kết nối để mặc định `autoCommit = true`), PostgreSQL JDBC Driver sẽ phớt lờ hoàn toàn `setFetchSize(2000)` và tải một phát toàn bộ 500.000 dòng vào RAM!",
      "Khối `try-with-resources` nối trực tiếp đường ống `JdbcTemplate.queryForStream` -> `BufferedWriter` -> `GZIPOutputStream` -> `S3 Multipart Stream` giúp bộ nhớ Heap chỉ giữ đúng 2.000 dòng tại mọi thời điểm và tự động đóng con trỏ DB an toàn.",
      "Hàm `formatSafeCsvRow` xử lý triệt để lỗ hổng bảo mật **CSV/Excel Formula Injection** (`=+-@`) rất hay bị kiểm toán Pentest bắt lỗi ở các hệ thống xuất báo cáo ngân hàng.",
      "File xuất xong không đi ngược qua API Gateway của ngân hàng làm nghẽn băng thông, mà trả về `PresignedDownloadUrl` có chữ ký mật mã hiệu lực 15 phút để trình duyệt tải thẳng từ tầng Object Storage."
    ],
    labGuide: {
      goal: "Chứng minh khả năng xuất file sao kê 300.000 dòng trên Pod giới hạn cực chặt `-Xmx128m` (chỉ 128MB Heap!) mà vẫn chạy êm ru không bị OutOfMemoryError.",
      steps: [
        "Bước 1: Dùng câu lệnh `INSERT INTO ledger_postings SELECT generate_series(1, 300000)...` trên PostgreSQL để sinh nhanh 300.000 dòng bút toán cho tài khoản doanh nghiệp `'CORP_VIP_01'`.",
        "Bước 2: Cấu hình JVM chạy ứng dụng với cờ ép chặt bộ nhớ `-Xms128m -Xmx128m`. Thử viết 1 hàm đọc toàn bộ bằng `queryForList` để quan sát JVM nổ lỗi `OutOfMemoryError` ngay lập tức.",
        "Bước 3: Chuyển sang gọi hàm `streamYearlyStatementToS3(...)` sử dụng `fetchSize = 2000` kèm `@Transactional(readOnly = true)` ghi ra luồng nén `.csv.gz` (có thể dùng MinIO container hoặc `FileOutputStream` cục bộ khi test nhanh).",
        "Bước 4: Mở file CSV kết quả xác nhận đủ 300.001 dòng (gồm tiêu đề), kiểm tra một dòng có nội dung `=1+1` đã được bọc thành `'=1+1` an toàn, và theo dõi Heap qua VisualVM/Actuator luôn dưới 75MB."
      ],
      expectedOutput: "Quá trình xuất 300.000 dòng hoàn tất trong ~3.5 giây ngay trong giới hạn khắc nghiệt `-Xmx128m` không hề có hiện tượng tăng vọt bộ nhớ, file nén GZIP chỉ nặng ~6MB và an toàn trước công thức độc hại."
    },
    examTips: [
      "Khi gặp đề bài 'Tìm kiếm toàn văn sao kê + Xuất báo cáo lớn', công thức trả lời chuẩn 10/10 là: **CQRS + CDC Kafka sang OpenSearch/ClickHouse + Keyset Pagination + Async Cursor Streaming lên S3 Pre-signed URL**.",
      "Nhớ nhắc tới cách xử lý **Replication Lag của CQRS**: 20 dòng sao kê mới nhất trên màn hình chính đọc từ kho nóng có Keyset Index để khách vừa chuyển tiền xong thấy ngay lập tức, không bị hoang mang vì độ trễ 1 giây của Search Engine.",
      "Bẫy kỹ thuật PostgreSQL cực hay hỏi ở vòng phỏng vấn sâu: `setFetchSize` bắt buộc phải đi kèm `autoCommit = false` (`@Transactional(readOnly = true)`), nếu không vẫn tràn RAM như thường!"
    ],
    summaryTakeaways: [
      "Tuyệt đối cấm chạy truy vấn tìm kiếm `LIKE '%...%'` hoặc phân trang `OFFSET` lớn trực tiếp trên cơ sở dữ liệu Core OLTP đang xử lý giao dịch tiền tệ.",
      "CQRS kết hợp Debezium CDC / Kafka giúp tách hẳn tải đọc tìm kiếm phức tạp 5 năm sang các kho chuyên dụng như OpenSearch và ClickHouse.",
      "Phân tầng dữ liệu Nóng (NVMe) – Ấm (ClickHouse/SSD) – Lạnh (Parquet trên S3 Object Lock WORM) tối ưu chi phí lưu trữ tỷ dòng mà vẫn tuân thủ luật định 5–10 năm.",
      "Mọi tính năng xuất sao kê hàng trăm nghìn dòng phải chạy bất đồng bộ qua Worker, đọc kiểu Server-side Cursor, chống CSV Injection và trả link tải S3 Pre-signed URL ngắn hạn."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên xây dựng API xuất sao kê năm cho khách hàng doanh nghiệp bằng cách gọi `postingRepository.findByAccountIdAndYear(...)` trả về `List<Posting>` rồi tạo file Excel `XSSFWorkbook` trả trực tiếp trong HTTP Response. Khi 3 doanh nghiệp lớn cùng bấm xuất sao kê (mỗi công ty 400.000 giao dịch), cả cụm Pod ứng dụng bị K8s giết hàng loạt vì OOMKilled. Thiết kế lại như thế nào mới đúng chuẩn Production?",
        options: [
          "Tăng HTTP Timeout lên 30 phút và nâng RAM mỗi Pod lên 64GB.",
          "Chuyển sang mô hình bất đồng bộ: API trả về ngay `202 Accepted` kèm `jobId`; Worker nền mở kết nối Read-Replica với `@Transactional(readOnly = true)` và `fetchSize = 2000` để đọc cuốn chiếu từng lô nhỏ (Stream), ghi thẳng dạng luồng nén CSV / Streaming Excel (`SXSSFWorkbook`) lên S3/MinIO rồi gửi thông báo kèm Pre-signed URL tải về.",
          "Cấm khách hàng doanh nghiệp xuất sao kê quá 100 dòng.",
          "Chạy câu lệnh xóa bớt giao dịch cũ của doanh nghiệp trước khi xuất file."
        ],
        answer: 1,
        explanation: "Xử lý bất đồng bộ kết hợp JDBC Server-side Cursor (`fetchSize` + `readOnly` transaction) và Streaming Upload lên S3 giúp mức tiêu thụ bộ nhớ RAM không phụ thuộc vào tổng số dòng (dù 400.000 hay 5 triệu dòng thì RAM vẫn phẳng vài chục MB) và giải phóng ngay luồng HTTP Web.",
        wrongReasons: [
          "Nâng RAM 64GB vừa cực kỳ lãng phí chi phí hạ tầng vừa vẫn sập như thường khi có 20 doanh nghiệp cùng bấm xuất file.",
          "",
          "Khách hàng doanh nghiệp bắt buộc cần sao kê đầy đủ phục vụ kế toán - kiểm toán thuế, giới hạn 100 dòng là không đáp ứng nghiệp vụ.",
          "Xóa dữ liệu giao dịch của khách hàng là hành vi vi phạm pháp luật ngân hàng nghiêm trọng."
        ]
      },
      {
        question: "Trên PostgreSQL, vì sao lập trình viên đã gọi `jdbcTemplate.setFetchSize(1000)` và dùng `queryForStream(...)` nhưng khi chạy câu truy vấn 1 triệu dòng thì ứng dụng vẫn ngốn sạch nhiều GB RAM ngay ở bước thực thi SQL?",
        options: [
          "Vì con số 1000 là số chẵn, PostgreSQL chỉ nhận số lẻ.",
          "Vì hàm thực thi không nằm trong một Transaction có `autoCommit = false` (ví dụ thiếu `@Transactional(readOnly = true)`), khiến PostgreSQL JDBC Driver bỏ qua `fetchSize` và kéo toàn bộ 1 triệu dòng kết quả vào bộ nhớ đệm của ứng dụng một lần duy nhất.",
          "Vì Java 21 không hỗ trợ Stream API cho cơ sở dữ liệu.",
          "Vì thiếu lệnh `System.gc()` sau mỗi vòng lặp."
        ],
        answer: 1,
        explanation: "Theo đặc tả chính thức của PostgreSQL JDBC Driver, con trỏ phía máy chủ (Server-side Portal Cursor) chỉ tồn tại trong phạm vi một giao dịch đang mở (`autoCommit = false`). Nếu `autoCommit = true`, con trỏ sẽ bị đóng ngay sau câu lệnh đầu tiên nên Driver buộc phải nạp toàn bộ ResultSet vào RAM.",
        wrongReasons: [
          "`fetchSize` nhận bất kỳ số nguyên dương hợp lý nào, hoàn toàn không phân biệt chẵn lẻ.",
          "",
          "Java 21 và Spring `JdbcTemplate.queryForStream` hỗ trợ hoàn hảo việc đọc Stream từ cơ sở dữ liệu.",
          "Khi toàn bộ 1 triệu dòng vẫn đang bị giữ tham chiếu trong bộ đệm của `ResultSet`, gọi `System.gc()` không thể giải phóng được vùng nhớ đó."
        ]
      }
    ]
  },

  "A5": {
    duration: "70 phút",
    difficulty: "Senior / Tech Lead",
    codeLang: "java",
    teacherIntro: "Chào em, ở vòng phỏng vấn kỹ thuật quyết định cho vị trí Senior Java tại các ngân hàng TMCP hàng đầu và công ty Fintech lớn hiện nay, hội đồng rất ít khi bắt em đảo ngược cây nhị phân trên bảng trắng. Thay vào đó, Tech Lead sẽ mở màn hình chia sẻ một đoạn code `TransferService` dài khoảng 40–60 dòng nhìn thoáng qua 'biên dịch chạy ngon lành', rồi nói: 'Em có 20 phút để Review đoạn code này trước khi anh em bấm Merge lên Production, hãy chỉ ra tất cả các lỗ hổng có thể làm ngân hàng mất tiền, treo hệ thống hoặc lộ thông tin!'. Hôm nay anh trao cho em **Bộ Radar 6 Mũi Nhọn Review Code Tài Chính** để nhìn xuyên thấu mọi quả bom nổ chậm chỉ trong 3 phút đầu tiên.",
    analogy: {
      title: "Bác sĩ chẩn đoán hình ảnh đọc phim X-quang tìm vết nứt ngầm",
      body: "Người thường nhìn tấm phim X-quang chỉ thấy khung xương trắng đen bình thường — giống hệt như lập trình viên Junior nhìn đoạn code chạy qua được Happy-path 1 người dùng trên máy local. Nhưng một bác sĩ chuyên khoa giàu kinh nghiệm có quy trình quét mắt tuần tự từ đỉnh phổi xuống tim, xương sườn, mạch máu nên chỉ 30 giây là khoanh tròn ngay vết nứt mảnh như sợi tóc. Bộ Checklist 6 mũi nhọn hôm nay chính là quy trình đọc phim X-quang của một Senior Banking Engineer: Tiền tệ -> Quyền sở hữu & Bảo mật -> Lũy đẳng -> Khóa đồng thời & Deadlock -> Ranh giới Transaction -> Nhật ký kiểm toán che mờ."
    },
    objectives: [
      "Nhận diện tức thời 10 lỗi chí mạng kinh điển trong code giao dịch ngân hàng (double/BigDecimal, BOLA, thiếu Idempotency, Race Condition, Deadlock, gọi HTTP trong @Transactional, nuốt Checked Exception, lộ PII log).",
      "Áp dụng quy trình Refactor từng bước biến một Service thủ tục mong manh thành mã nguồn cấp độ Production an toàn tuyệt đối.",
      "Rèn phong thái giao tiếp Code Review chuẩn Senior/Tech Lead: phân tích rõ kịch bản khai thác lỗi, mức độ thiệt hại nghiệp vụ và đề xuất giải pháp cụ thể."
    ],
    flow: [
      {
        step: "1. Security & Money Sanity (Kiểm tra Chủ sở hữu BOLA & Kiểu Tiền tệ)",
        detail: "Xác minh tài khoản nguồn có thuộc `authenticatedCif` từ SecurityContext không (chặn sửa `fromAccount` sang tài khoản người khác!); kiểm tra `BigDecimal` dương, đúng scale tiền tệ, cấm tuyệt đối `double`."
      },
      {
        step: "2. Idempotency Shield (Chốt chặn Chống Trừ Kép trước khi đụng Sổ Cái)",
        detail: "Bắt buộc kiểm tra và chiếm giữ khóa `Idempotency-Key` gắn kèm mã băm nội dung lệnh (`payloadHash`): nếu trùng key đang chạy trả `409 Conflict`, nếu đã xong trả lại biên lai cũ."
      },
      {
        step: "3. Deterministic Lock & Short DB Tx (Khóa chống Deadlock & Tx cực ngắn)",
        detail: "Sắp xếp thứ tự khóa tài khoản theo ID tăng dần (`firstLock < secondLock`) chống Deadlock chéo A↔B; gói gọn phần DB trong `TransactionTemplate` kèm `rollbackFor`, TUYỆT ĐỐI đẩy lời gọi HTTP ra ngoài Transaction!"
      },
      {
        step: "4. Double-Entry, Outbox & Masked Audit (Sổ cái kép & Log an toàn)",
        detail: "Sinh đủ cặp bút toán Nợ/Có cân bằng + bản ghi `outbox_events` trong cùng DB Transaction; ghi log JSON có `correlationId` nhưng che mờ số thẻ/CCCD/OTP tuân thủ PCI-DSS."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu 'Đoạn Code Tử Thần' hay xuất hiện trong đề thi Code Review",
        paragraphs: [
          "Hãy cùng anh mổ xẻ kịch bản mà 9/10 buổi phỏng vấn Live Coding đưa ra: Một hàm `@Transactional public String transfer(String fromAcc, String toAcc, double amount)` bên trong làm lần lượt: (1) `Account a = repo.findById(fromAcc); Account b = repo.findById(toAcc);`, (2) `if (a.getBalance() >= amount)`, (3) gọi `fraudHttpClient.check(fromAcc, amount)` qua REST mất 800ms, (4) `a.setBalance(a.getBalance() - amount); b.setBalance(b.getBalance() + amount);`, (5) `log.info(\"Transfer ok card=\" + cardPan + \" otp=\" + otp)` và (6) ném `throw new AccountingCheckedException()` khi ghi sổ phụ lỗi!",
          "Nếu một ứng viên chỉ nhận xét: 'Anh ơi tên biến `a`, `b` đặt chưa đẹp theo Clean Code ạ' thì chắc chắn trượt vị trí Senior! Ngược lại, khi em điềm tĩnh chỉ ra **8 quả bom mất tiền thật** nằm ngay trong 10 dòng đó, mắt cả hội đồng sẽ sáng rực lên vì họ biết ngay em là người đã từng lăn lộn giữ an toàn cho hệ thống thật."
        ],
        bullets: [
          "Bom #1 (Mất tiền người khác - BOLA/IDOR): Hàm nhận `fromAcc` từ JSON request nhưng không hề đối chiếu `a.getOwnerCif().equals(SecurityUtils.currentCif())` — kẻ tấn công đăng nhập tài khoản của hắn nhưng truyền `fromAcc` là tài khoản tỷ phú để rút sạch tiền!",
          "Bom #2 & #3 (Sai số dấu phẩy động & Âm tiền từ số âm): Dùng kiểu `double` gây lệch lẻ thập phân IEEE 754, và nguy hiểm hơn là thiếu kiểm tra `amount > 0`! Nếu kẻ gian truyền `amount = -10_000_000`, biểu thức `balance >= -10tr` luôn đúng và phép trừ `balance - (-10tr)` biến thành... cộng thêm 10 triệu vào tài khoản kẻ gian!",
          "Bom #4 & #5 (Race Condition âm tiền & Cạn sạch HikariCP): Đọc `findById` thường không khóa dòng nên 10 luồng song song cùng lọt qua `if (balance >= amount)` rút âm tài khoản; đồng thời đặt `fraudHttpClient.check(...)` nằm lọt thỏm bên trong `@Transactional` làm ngâm kết nối DB suốt thời gian chờ mạng!",
          "Bom #6, #7, #8 (Không Rollback Checked Exception, Thiếu Idempotency & Vi phạm PCI-DSS): Mặc định `@Transactional` KHÔNG rollback khi ném `AccountingCheckedException` khiến tiền vẫn bị trừ dù ghi sổ lỗi; thiếu `Idempotency-Key` làm khách bấm thử lại bị trừ 2 lần; và ghi `cardPan` + `otp` rõ ra log vi phạm thẳng PCI-DSS!"
        ]
      },
      {
        heading: "2. Chiến thuật Sắp xếp Thứ tự Khóa (Lock Ordering) và Cô lập Ranh giới Transaction",
        paragraphs: [
          "Khi em đề xuất sửa lỗi Race Condition bằng khóa bi quan `SELECT ... FOR UPDATE`, người phỏng vấn giỏi sẽ hỏi nối ngay lập tức: 'Thế nếu em khóa `fromAcc` trước rồi khóa `toAcc` sau, đúng lúc đó ở luồng bên cạnh có giao dịch ngược chiều chuyển từ `toAcc` về lại `fromAcc` thì điều gì xảy ra?'. Câu trả lời là **Classic AB-BA Deadlock**: Luồng 1 giữ khóa A chờ B, Luồng 2 giữ khóa B chờ A, cho tới khi Database phát hiện vòng lặp chờ và giết một trong hai giao dịch.",
          "Cách giải quyết kinh điển, gọn đẹp chỉ với 3 dòng code là **Deterministic Lock Ordering (Sắp xếp thứ tự khóa tất định)**: Trước khi truy vấn khóa, so sánh định danh hai tài khoản (`fromAcc.compareTo(toAcc) < 0`), luôn luôn khóa tài khoản có mã nhỏ hơn trước rồi mới khóa tài khoản có mã lớn hơn sau (hoặc dùng `SELECT * FROM accounts WHERE id IN (:id1, :id2) ORDER BY id ASC FOR UPDATE`)! Khi mọi luồng trên đời đều bắt buộc xin khóa A trước rồi mới xin khóa B, chu trình chờ vòng tròn bị chặt đứt vĩnh viễn 100%. Song song đó, thay vì treo `@Transactional` ở đầu hàm lớn, người Senior dùng **`TransactionTemplate`** chỉ bọc đúng phần thao tác Database sau khi mọi lời gọi HTTP thẩm định bên ngoài (Fraud/eKYC) đã hoàn tất ở ngoài Transaction."
        ],
        bullets: [
          "Chặn tự chuyển cho chính mình: Kiểm tra ngay ở đầu hàm `if (fromAcc.equals(toAcc)) throw new InvalidTransferException()` để không rơi vào bẫy cộng trừ chồng chéo trên cùng một tham chiếu đối tượng.",
          "So khớp Payload trên Idempotency-Key: Nếu client gửi lại cùng một `Idempotency-Key` nhưng lại đổi số tiền từ `100.000đ` thành `50.000.000đ`, hệ thống phải phát hiện lệch `requestHash` và ném lỗi `422 Unprocessable Entity` thay vì trả nhầm biên lai cũ!",
          "Luôn ghi Sổ cái Kép thay vì chỉ ghi đè số dư: Bất kỳ sự thay đổi nào của cột `balance` trong bảng `accounts` cũng bắt buộc đi kèm 2 dòng đối ứng Nợ/Có trong bảng `ledger_postings`."
        ]
      },
      {
        heading: "3. Nghệ thuật Giao tiếp khi Thi Live Coding & Code Review trước Hội đồng",
        paragraphs: [
          "Trong buổi thi thực tế, cách em trình bày quan trọng ngang ngửa số lượng lỗi em tìm được. Đừng im lặng gõ bàn phím cạch cạch suốt 15 phút khiến người phỏng vấn không biết em đang nghĩ gì, cũng đừng chê bai đoạn code đề bài bằng giọng điệu gay gắt ('Code này ai viết mà tệ thế ạ' — rất có thể người ngồi đối diện vừa viết đề đó!).",
          "Hãy nói thành tiếng mạch tư duy (Think Aloud) có cấu trúc như một Tech Lead đang hướng dẫn đồng đội: *(1) Nêu tên rủi ro -> (2) Diễn giải kịch bản tấn công/tải cao làm nổ lỗi trên Production -> (3) Đưa ra đoạn code sửa chuẩn xác*. Ví dụ: 'Đầu tiên em kiểm tra ranh giới giao dịch và bảo mật: ở dòng 18 có lời gọi HTTP sang Fraud Service nằm trong `@Transactional`, nếu Fraud Service chậm 3 giây ở mức tải 100 TPS thì chỉ 0.2 giây là cạn sạch pool 20 kết nối HikariCP, nên em sẽ tách bước gọi Fraud ra trước rồi dùng `TransactionTemplate` chỉ mở giao dịch DB cho phần khóa và ghi sổ cái'."
        ],
        bullets: [
          "Ưu tiên mức độ nghiêm trọng (Severity Triage): Luôn chỉ ra các lỗi Mất tiền / Âm tiền / Lộ tài khoản (P0 Critical) trước, tiếp đến là Treo hệ thống / Deadlock / Lệch dữ liệu (P1 High), và cuối cùng mới nhắc tới cấu trúc code, đặt tên và Unit Test (P2).",
          "Đề xuất kiểm thử đi kèm sau khi Refactor: Kết thúc phần sửa code bằng câu chốt vàng: 'Để đảm bảo đoạn code vừa refactor không bao giờ hồi quy, em sẽ viết 1 bài Testcontainers dùng 30 luồng chuyển chéo A↔B kiểm tra tổng số dư hai tài khoản không đổi'.",
          "Xử lý tinh huống chưa nhớ chính xác tên hàm thư viện: Cứ bình tĩnh nói rõ ý đồ kỹ thuật (ví dụ 'Ở đây em dùng `TransactionTemplate` hoặc tách Bean riêng để tránh Self-invocation AOP Proxy') — hội đồng chấm tư duy gốc chứ không chấm trí nhớ tự động hoàn thành của IDE."
        ]
      }
    ],
    comparison: {
      title: "Checklist 6 Mũi Nhọn Refactor Code Giao dịch Ngân hàng (Trước vs Sau)",
      headers: ["Mũi nhọn kiểm tra", "Code lỗi thường gặp (Anti-pattern)", "Code chuẩn Production Senior", "Hậu quả nếu bỏ sót"],
      rows: [
        [
          "1. Tiền tệ & Đầu vào",
          "`double amount`, không chặn số `<= 0` hoặc `from == to`",
          "`BigDecimal` chuẩn scale, bắt buộc `signum() > 0` và `from != to`",
          "Lệch số lẻ kế toán hoặc bị lợi dụng truyền số tiền âm để rút ruột tài khoản"
        ],
        [
          "2. Quyền sở hữu (BOLA)",
          "Tin tưởng mù quáng `request.fromAccount()` gửi từ Client",
          "Đối chiếu cứng `ownerCif` của tài khoản nguồn với `Principal` trong JWT",
          "Kẻ gian chiếm đoạt tiền từ bất kỳ số tài khoản nào hắn biết"
        ],
        [
          "3. Đồng thời & Deadlock",
          "Đọc thường rồi `if (bal >= amt)`, hoặc khóa không theo thứ tự",
          "Khóa bi quan theo thứ tự ID tăng dần (`firstId < secondId`) chống Deadlock",
          "Rút âm tiền khi bắn đa luồng (Race Condition) hoặc treo Deadlock chéo"
        ],
        [
          "4. Ranh giới Transaction",
          "`@Transactional` bọc cả HTTP gọi ngoài & thiếu `rollbackFor`",
          "Gọi HTTP ngoài Tx; dùng `TransactionTemplate` ngắn gọn + Sổ cái kép + Outbox",
          "Cạn sạch HikariCP Connection Pool khi đối tác lag; commit dở dang khi lỗi Checked"
        ]
      ]
    },
    codeTitle: "Bản Refactor Chuẩn Hội Đồng Tech Lead: An toàn BOLA, Lũy đẳng, Khóa chống Deadlock & Short Transaction",
    code: [
      "@Service",
      "public class ProductionSafeTransferUseCase {",
      "    private final AccountRepository accountRepo;",
      "    private final LedgerRepository ledgerRepo;",
      "    private final IdempotencyService idempotency;",
      "    private final FraudCheckClient fraudClient;",
      "    private final TransactionTemplate txTemplate;",
      "",
      "    public ProductionSafeTransferUseCase(AccountRepository accountRepo, LedgerRepository ledgerRepo,",
      "            IdempotencyService idempotency, FraudCheckClient fraudClient, TransactionTemplate txTemplate) {",
      "        this.accountRepo = accountRepo; this.ledgerRepo = ledgerRepo;",
      "        this.idempotency = idempotency; this.fraudClient = fraudClient; this.txTemplate = txTemplate;",
      "    }",
      "",
      "    public TransferReceipt execute(String authCif, String idemKey, TransferRequest req) {",
      "        // 1. Validate chặt tiền tệ: nguyên dương, không tự chuyển cho chính mình",
      "        if (req.amount() == null || req.amount().signum() <= 0 || req.amount().scale() > 0",
      "                || req.fromAcc().equals(req.toAcc())) {",
      "            throw new InvalidTransferCommandException(\"Tham số giao dịch không hợp lệ\");",
      "        }",
      "        // 2. Chốt chặn Lũy đẳng kèm kiểm tra khớp mã băm nội dung lệnh",
      "        return idempotency.executeOnce(authCif, idemKey, req.payloadHash(), () -> {",
      "            // 3. Gọi HTTP thẩm định gian lận BÊN NGOÀI DB Transaction (bảo vệ HikariCP Pool!)",
      "            fraudClient.assertSafe(authCif, req.fromAcc(), req.toAcc(), req.amount());",
      "",
      "            // 4. Mở DB Transaction cực ngắn, khóa theo thứ tự từ điển chống Deadlock A<->B",
      "            String firstLock = req.fromAcc().compareTo(req.toAcc()) < 0 ? req.fromAcc() : req.toAcc();",
      "            String secondLock = req.fromAcc().compareTo(req.toAcc()) < 0 ? req.toAcc() : req.fromAcc();",
      "",
      "            return txTemplate.execute(status -> {",
      "                Account acc1 = accountRepo.findAndLockByAccountNo(firstLock);",
      "                Account acc2 = accountRepo.findAndLockByAccountNo(secondLock);",
      "                Account sender = req.fromAcc().equals(acc1.getNo()) ? acc1 : acc2;",
      "                Account receiver = req.toAcc().equals(acc1.getNo()) ? acc1 : acc2;",
      "",
      "                // 5. Chặn lỗ hổng BOLA: bắt buộc tài khoản nguồn thuộc đúng người đang đăng nhập!",
      "                if (!sender.getOwnerCif().equals(authCif)) throw new AccessDeniedException(\"BOLA Blocked\");",
      "                sender.debit(req.amount());   // Domain method kiểm tra số dư khả dụng >= amount",
      "                receiver.credit(req.amount());",
      "                return ledgerRepo.recordBalancedJournalAndOutbox(idemKey, sender, receiver, req.amount());",
      "            });",
      "        });",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Lời gọi `fraudClient.assertSafe(...)` nằm hoàn toàn bên ngoài `txTemplate.execute(...)`: dù dịch vụ chống gian lận có phản hồi mất 500ms thì cũng không giữ bất kỳ kết nối PostgreSQL nào trong HikariCP Pool.",
      "Hai biến `firstLock` và `secondLock` đảm bảo mọi giao dịch giữa cặp tài khoản `(A, B)` luôn xin khóa theo đúng một chiều duy nhất, triệt tiêu 100% lỗi Deadlock khi hai người chuyển tiền qua lại cùng mili-giây.",
      "Kiểm tra `!sender.getOwnerCif().equals(authCif)` đặt ngay trên bản ghi `sender` vừa truy vấn từ DB chặn đứng lỗ hổng OWASP API1 (BOLA/IDOR) nguy hiểm nhất ngành tài chính.",
      "Logic trừ tiền nằm trong phương thức giàu nghiệp vụ `sender.debit(req.amount())` (Rich Domain Model) đi liền với `recordBalancedJournalAndOutbox(...)` đảm bảo tổng Nợ = tổng Có và sự kiện Kafka không bao giờ thất lạc."
    ],
    labGuide: {
      goal: "Thực hành đóng vai Chủ tịch Hội đồng Code Review: tự tay khai thác làm âm tiền đoạn code lỗi rồi kiểm chứng bản Refactor chịu tải 40 luồng chuyển chéo không lỗi.",
      steps: [
        "Bước 1: Dựng một class `VulnerableTransferService` cố tình viết theo kiểu đọc `findById` thường rồi `if (balance >= amount)` không khóa, khởi tạo Tài khoản A = 1.000.000đ và Tài khoản B = 1.000.000đ.",
        "Bước 2: Viết test bắn đồng thời 10 luồng rút 800.000đ từ A sang B và truyền thêm 1 request có `amount = -500000` để tận mắt chứng kiến số dư A bị rút âm thê thảm hoặc tự dưng tăng vọt phi lý.",
        "Bước 3: Thay thế bằng `ProductionSafeTransferUseCase` như code chuẩn ở trên, cấu hình bài test bắn đồng thời 20 luồng chuyển A -> B (mỗi lệnh 50.000đ) VÀ 20 luồng chuyển ngược B -> A (mỗi lệnh 30.000đ) cùng một khoảnh khắc.",
        "Bước 4: Xác nhận không có bất kỳ lỗi Deadlock nào xảy ra, số dư cuối của A và B chuẩn xác tuyệt đối và tổng tiền `A + B` giữ nguyên đúng `2.000.000đ`."
      ],
      expectedOutput: "Bản code lỗi bị rút âm ngay ở lần chạy đa luồng đầu tiên; bản Refactor xử lý trọn vẹn 40 luồng chuyển chéo ngược chiều với 0 Deadlock, chặn 100% số âm/BOLA và bảo toàn tuyệt đối tổng tiền hệ thống."
    },
    examTips: [
      "Mẹo vàng khi mở đề Code Review: Liếc ngay kiểu dữ liệu của `amount` (có phải `double/float` hay thiếu check `> 0` không?) và tìm xem trong hàm `@Transactional` có dòng nào gọi `RestTemplate / WebClient / FeignClient / KafkaTemplate.send` không — 95% đề thi gài đúng 2 bẫy này!",
      "Đừng bao giờ quên kiểm tra **BOLA (`ownerCif == currentUserCif`)**! Phát hiện ra lỗ hổng BOLA trong bài code chuyển tiền sẽ khiến giám khảo Bảo mật và Tech Lead cộng điểm tối đa ngay lập tức.",
      "Nếu dùng `@Transactional` thay vì `TransactionTemplate`, luôn nhớ chỉ ra việc phải gắn `rollbackFor = Exception.class` và cảnh báo bẫy gọi nội bộ `this.method()` (Self-Invocation bỏ qua Spring Proxy)."
    ],
    summaryTakeaways: [
      "Bộ khung 6 mũi nhọn Review Code Ngân hàng: Tiền tệ (`BigDecimal > 0`) -> Quyền sở hữu (`BOLA`) -> Lũy đẳng (`Idempotency`) -> Khóa có thứ tự (`Lock Ordering`) -> Giao dịch ngắn (`No I/O in Tx`) -> Sổ cái kép & Log che mờ (`PCI-DSS`).",
      "Truyền số tiền âm (`amount < 0`) hoặc tự chuyển cho chính mình (`from == to`) là hai kịch bản biên cực kỳ nguy hiểm phải chặn ngay ở tầng Validation và Domain.",
      "Sắp xếp thứ tự khóa tài khoản nhất quán theo mã định danh tăng dần là chìa khóa triệt tiêu Deadlock cho các giao dịch chuyển chéo hai chiều.",
      "Phong thái Review Code của Senior luôn gắn từng lỗi kỹ thuật với tác động thực tế lên tiền tệ, độ sẵn sàng SLA và tuân thủ an toàn thông tin của ngân hàng."
    ],
    lessonQuestions: [
      {
        question: "Trong bài thi Code Review, bạn thấy đoạn code sau: `@Transactional public void transfer(String fromAcc, String toAcc, BigDecimal amt) { Account a = repo.findById(fromAcc).get(); if (a.getBalance().compareTo(amt) >= 0) { partnerRestClient.notify(fromAcc, amt); a.setBalance(a.getBalance().subtract(amt)); ... } }`. Đâu là nhận định chính xác và đầy đủ nhất của một Senior Java?",
        options: [
          "Đoạn code đã dùng BigDecimal và có @Transactional nên hoàn toàn đạt chuẩn Production 10.000 TPS.",
          "Đoạn code chứa nhiều lỗi chí mạng: (1) thiếu kiểm tra amt > 0 và quyền sở hữu BOLA trên fromAcc; (2) đọc findById không có khóa dòng khiến nhiều luồng cùng lọt qua câu if gây rút âm tiền; (3) gọi partnerRestClient qua mạng ngay bên trong @Transactional làm ngâm kết nối cạn sạch HikariCP Pool.",
          "Chỉ cần đổi BigDecimal sang kiểu double để tính phép trừ nhanh hơn là xong.",
          "Chỉ cần xóa @Transactional đi để mỗi dòng tự commit riêng lẻ là an toàn."
        ],
        answer: 1,
        explanation: "Dù đã dùng BigDecimal và có @Transactional, đoạn code vẫn mắc trọn bộ lỗi nghiêm trọng nhất trong thực tế ngân hàng: lỗ hổng BOLA và số âm, Race Condition Lost Update do đọc không khóa, và giữ kết nối DB trong lúc gọi HTTP đối tác.",
        wrongReasons: [
          "Có @Transactional mức mặc định READ COMMITTED hoàn toàn không ngăn được 2 luồng cùng đọc số dư cũ qua findById() rồi cùng trừ tiền gây âm tài khoản.",
          "",
          "Đổi BigDecimal về double là bước lùi nghiêm trọng gây sai số nhị phân tiền tệ.",
          "Xóa @Transactional khiến bước trừ tiền người gửi và cộng tiền người nhận không còn tính nguyên tử, làm mất tiền ngay khi bước hai gặp lỗi."
        ]
      },
      {
        question: "Giả sử Luồng 1 chuyển tiền từ TK `1001` sang TK `2002`, cùng mili-giây đó Luồng 2 chuyển tiền từ TK `2002` về lại TK `1001`. Nếu cả hai luồng đều áp dụng quy tắc khóa bi quan theo thứ tự mã tài khoản tăng dần thì trình tự xin khóa diễn ra như thế nào?",
        options: [
          "Luồng 1 khóa `1001` trước, Luồng 2 khóa `2002` trước và hai luồng chờ nhau vĩnh viễn.",
          "Cả Luồng 1 lẫn Luồng 2 đều xin khóa `1001` trước rồi mới xin khóa `2002` sau; do đó một luồng sẽ giữ được khóa `1001` và chạy trọn vẹn xong xuôi rồi nhả khóa cho luồng còn lại chạy tiếp, triệt tiêu hoàn toàn Deadlock.",
          "Database sẽ từ chối mọi giao dịch có chiều ngược nhau trong vòng 1 giờ.",
          "Cả hai luồng đều bỏ qua không khóa tài khoản nào cả."
        ],
        answer: 1,
        explanation: "Vì `'1001'.compareTo('2002') < 0`, cả hai luồng bất kể chiều chuyển tiền xuôi hay ngược đều hội tụ về cùng một thứ tự xin tài nguyên: khóa `1001` -> khóa `2002`. Điều kiện chờ vòng tròn (Circular Wait) không thể hình thành nên không bao giờ xảy ra Deadlock.",
        wrongReasons: [
          "Đây là hiện tượng xảy ra khi KHÔNG sắp xếp thứ tự khóa (khóa `fromAcc` trước `toAcc` một cách mù quáng).",
          "",
          "Khóa dòng chỉ giữ vài mili-giây của giao dịch đó chứ không chặn theo giờ.",
          "Bỏ khóa hoàn toàn sẽ dẫn tới lỗi Race Condition làm sai lệch số dư cả hai tài khoản."
        ]
      }
    ]
  },

  "A6": {
    duration: "60 phút",
    difficulty: "Senior / Lead Career",
    codeLang: "yaml",
    teacherIntro: "Chào em, chúng ta đã đi tới bài cuối cùng của Học phần A! Có một sự thật rất đáng tiếc mà anh chứng kiến suốt hơn 12 năm ngồi ghế Hội đồng Tuyển dụng ở các ngân hàng và công ty Fintech: rất nhiều bạn làm kỹ thuật cực giỏi, gánh cả team ở công ty cũ, nhưng khi vào phòng phỏng vấn lại trả lời lan man khiến chỉ được xếp bậc Mid-level thay vì Senior/Lead, thiệt thòi mất 15–25 triệu đồng thu nhập mỗi tháng! Ngược lại, người biết cấu trúc hóa bài trả lời System Design trong 45 phút, biết kể câu chuyện xử lý sự cố Production theo chuẩn STAR + Post-mortem không đổ lỗi, và biết đàm phán Offer dựa trên giá trị giảm thiểu rủi ro tài chính sẽ luôn nhận được mức đãi ngộ xứng tầm nhất. Hôm nay anh truyền lại cho em trọn bộ bí kíp chiến thắng bàn phỏng vấn và bàn đàm phán lương.",
    analogy: {
      title: "Bác sĩ phẫu thuật tim mạch điềm tĩnh giải thích phác đồ điều trị và rủi ro",
      body: "Khi ban giám đốc bệnh viện tuyển Trưởng kíp mổ tim (cũng giống Giám đốc Khối CNTT Ngân hàng tuyển Senior/Lead cầm trịch hệ thống Core Payment), họ không chọn người ba hoa khoe mình biết 50 loại dao mổ mới ra mắt hôm qua. Họ chọn vị bác sĩ có ánh mắt điềm tĩnh, hỏi kỹ tiền sử huyết áp bệnh nhân trước khi mổ (Clarify NFR), nêu rõ phương án A an toàn hơn phương án B ở điểm nào và đánh đổi gì (Trade-offs), từng bình tĩnh cứu sống ca biến chứng trên bàn mổ (Production Incident Post-mortem) và đã lập quy trình để không đàn em nào mắc lại lỗi đó nữa!"
    },
    objectives: [
      "Làm chủ Khung đồng hồ 45 phút giải đề System Design Ngân hàng (4 chặng rõ ràng từ NFR, Ước lượng tải, Kiến trúc tổng thể tới Deep-dive nút thắt & Chống thảm họa).",
      "Xây dựng 3 câu chuyện thực chiến 'đinh' theo công thức STAR + Engineering Post-mortem (Sự cố Production, Tối ưu hiệu năng 10x, Giải quyết bất đồng kỹ thuật).",
      "Nắm vững chiến thuật viết CV định lượng con số tài chính, đặt câu hỏi ngược đẳng cấp cuối buổi phỏng vấn và đàm phán gói tổng thu nhập (Total Compensation) ngành Ngân hàng."
    ],
    flow: [
      {
        step: "1. Phút 00–07: Clarify NFR & Compliance (Khóa chặt đề bài ngân hàng)",
        detail: "Chủ động hỏi rõ quy mô Peak TPS, độ trễ P99, RPO = 0 / RTO < 15p, yêu cầu Kế toán kép, Đối soát T+0/T+1 và tuân thủ PCI-DSS / NHNN trước khi đặt bút vẽ."
      },
      {
        step: "2. Phút 07–13: Capacity Math & API/Data Model (Tính toán & Mô hình cốt lõi)",
        detail: "Nhẩm nhanh Write IOPS, dung lượng 5 năm, định nghĩa API có `Idempotency-Key` và phác thảo các bảng trụ cột (`accounts`, `journals`, `postings`, `outbox_events`)."
      },
      {
        step: "3. Phút 13–28: High-Level End-to-End Flow (Vẽ luồng chuẩn xác từ biên vào lõi)",
        detail: "Trình bày mạch lạc luồng đi qua API Gateway -> Service -> Sharded DB -> Outbox Kafka -> Đối tác ngoài, giải thích rõ cách giữ Transaction ngắn và không mất dữ liệu."
      },
      {
        step: "4. Phút 28–45: Deep-Dive Bottlenecks & Failure Modes (Ăn điểm Senior/Lead)",
        detail: "Chủ động xoáy sâu vào các kịch bản ác mộng: Hot Account, đối tác NAPAS Timeout chưa rõ trạng thái (treo Suspense GL chờ đối soát!), sập 1 DC (DR Failover) và Observability."
      }
    ],
    sections: [
      {
        heading: "1. Khung 45 Phút Chiến Thắng Vòng System Design mà Không Bao Giờ Cháy Giờ",
        paragraphs: [
          "Lỗi phổ biến nhất làm rớt ứng viên giỏi ở vòng System Design là sa đà mất 25 phút đầu để thiết kế chi tiết bảng `users` đăng nhập hay cấu hình lặt vặt của Nginx, đến khi giám khảo muốn nghe phần cốt lõi là Sổ cái chống âm tiền và Xử lý Timeout liên ngân hàng thì... hết giờ! Một ứng viên cấp Senior/Architect làm chủ cuộc hội thoại như một người dẫn dắt: ở mỗi chặng đều tóm tắt ngắn gọn rồi xác nhận với hội đồng ('Phần API và ước lượng tải khoảng 50k write IOPS em chốt như vậy, bây giờ em xin đi sâu vào luồng hạch toán Sổ cái và xử lý Hot Account nhé ạ?').",
          "Điểm khác biệt lớn nhất giữa phỏng vấn System Design ở công ty mạng xã hội và ở Ngân hàng nằm ở **Thái độ với dữ liệu khi xảy ra lỗi (Failure Mode Mindset)**. Ở mạng xã hội, mất 1 lượt Like khi sập server là chấp nhận được; còn ở Ngân hàng, câu thần chú giúp em ghi điểm tuyệt đối là: **'Khi gặp ReadTimeout với đối tác bên ngoài, hệ thống TUYỆT ĐỐI không tự ý coi là thất bại để hoàn tiền ngay, mà phải giữ tiền ở trạng thái PENDING / tài khoản treo `GL_SUSPENSE`, bắn truy vấn tra soát trạng thái (Inquiry) và chốt cuối cùng bằng Job Đối soát T+0/T+1'**."
        ],
        bullets: [
          "Luôn nêu Đánh đổi (Trade-offs) thay vì tôn sùng công nghệ: Đừng nói 'Kafka tốt nhất nên em dùng Kafka cho mọi thứ'; hãy nói 'Luồng trừ tiền nội bộ cần phản hồi đồng bộ tức thì nên em ghi trực tiếp PostgreSQL, còn bước đẩy thông báo và đồng bộ sang kho tìm kiếm sao kê em tách bất đồng bộ qua Outbox + Kafka để giảm độ trễ P99 và cô lập lỗi'.",
          "Chủ động nhắc tới Vận hành & Quan sát (Day-2 Operations): Dành 3 phút cuối chỉ lên sơ đồ nơi đặt OpenTelemetry `traceId`, cảnh báo lệch tổng Nợ/Có theo phút, và công tắc ngắt khẩn cấp `Feature Kill-Switch` khi đối tác gặp sự cố.",
          "Viết CV chuẩn Ngân hàng (Định lượng hóa tác động): Thay vì viết mờ nhạt 'Tham gia phát triển module thanh toán bằng Spring Boot', hãy viết sắc nét: 'Thiết kế lại luồng thanh toán QR trên Java 21 + PostgreSQL + Outbox Kafka, loại bỏ lỗi giữ DB connection khi gọi đối tác, hạ độ trễ P99 từ 1.800ms xuống 95ms ở tải 1.200 TPS và đạt tỷ lệ khớp đối soát 100%'."
        ]
      },
      {
        heading: "2. Nghệ thuật Kể chuyện Sự cố Production theo chuẩn STAR + Blameless Post-mortem",
        paragraphs: [
          "Chắc chắn 100% trong vòng phỏng vấn với Engineering Manager hoặc CTO sẽ có câu hỏi: 'Hãy kể cho anh nghe sự cố Production nghiêm trọng nhất mà em từng trực tiếp tham gia xử lý hoặc từng mắc phải, và em đã rút ra bài học gì?'. Đừng bao giờ trả lời 'Em code cẩn thận lắm nên chưa từng gặp sự cố nào ạ!' — câu trả lời đó chỉ chứng tỏ em chưa từng được chạm vào hệ thống lớn có lưu lượng thật!",
          "Hãy chuẩn bị sẵn 3 câu chuyện có thật (hoặc từ quá trình tải cao / diễn tập chuyên sâu) theo cấu trúc **STAR nâng cấp thành 5 bước Post-mortem chuyên nghiệp**: *(1) Situation & Impact* (Hệ thống gì, quy mô bao nhiêu, triệu chứng cảnh báo là gì, ảnh hưởng bao nhiêu % giao dịch) -> *(2) Immediate Mitigation* (Bước cầm máu tức thời trong 5 phút đầu để cứu khách hàng trước, ví dụ bật Kill-Switch / hạ tải / rollback, lấy Thread Dump trước khi restart) -> *(3) Root Cause Analysis* (Truy tìm nguyên nhân gốc kỹ thuật sâu sắc: HikariCP nghẽn do thiếu timeout HTTP, hay thiếu Index sau khi dữ liệu cán mốc 20 triệu dòng) -> *(4) Permanent Fix* (Giải pháp sửa triệt để về mặt kiến trúc) -> *(5) Systemic Prevention* (Cài đặt ArchUnit rule, Sonar rule hoặc cảnh báo Grafana để cả công ty không ai lặp lại lỗi đó nữa!)."
        ],
        bullets: [
          "Văn hóa Không Đổ Lỗi (Blameless Ownership): Tuyệt đối không nói 'Tại bạn Junior trong team em code ẩu' hay 'Tại đội DBA cấu hình sai'. Hãy nói 'Là Senior trong nhóm, em nhận thấy quy trình Code Review và bộ Integration Test của bọn em lúc đó chưa có chốt chặn tự động bắt lỗi thiếu HTTP Timeout, nên sau sự cố em đã bổ sung ArchUnit test bắt buộc cho toàn bộ HTTP Client'.",
          "Câu chuyện Tối ưu Hiệu năng (Performance Tuning Story): Luôn có con số đo đạc Trước và Sau rõ ràng (ví dụ: đọc `EXPLAIN ANALYZE` phát hiện Seq Scan + Sort 400MB trên đĩa, thêm Covering Index + Keyset Pagination giảm thời gian từ 6.4s xuống 7ms, giảm CPU DB từ 85% về 18%).",
          "Câu chuyện Thuyết phục & Xử lý Bất đồng Kỹ thuật: Thể hiện em thuyết phục đồng nghiệp bằng số liệu Benchmark POC và phân tích rủi ro bảo trì thay vì lấy thâm niên ra áp đặt."
        ]
      },
      {
        heading: "3. Đặt Câu Hỏi Ngược Đẳng Cấp & Đàm Phán Gói Thu Nhập (Total Compensation) Ngành Ngân Hàng",
        paragraphs: [
          "5 phút cuối buổi phỏng vấn khi hội đồng hỏi 'Em có câu hỏi nào cho bên anh không?' là cơ hội vàng để đảo chiều vị thế từ 'người đi xin việc' thành 'chuyên gia đang thẩm định môi trường hợp tác tương lai'. Những câu hỏi sâu sắc về kiến trúc hiện tại, thách thức kỹ thuật 6–12 tháng tới và quy trình xử lý sự cố sẽ khiến Giám đốc Khối ấn tượng cực mạnh.",
          "Đặc biệt, khi bước vào vòng Đàm phán Offer với HR ngân hàng, em cần hiểu rõ cấu trúc thu nhập đặc thù của khối Tài chính - Ngân hàng tại Việt Nam rất khác công ty Outsourcing thuần túy! Ngoài **Lương cứng hàng tháng (Base Salary x 12 hoặc 13 tháng)**, tổng thu nhập năm (**Total Annual Package**) của ngân hàng thường có phần **Thưởng hiệu quả kinh doanh / xếp loại KPI cuối năm (từ 2 đến 6+ tháng lương tùy ngân hàng và kết quả kinh doanh)**, phụ cấp ăn trưa/điện thoại, gói bảo hiểm sức khỏe cao cấp cho cả gia đình, và ưu đãi lãi suất vay mua nhà CBNV. Vì vậy, hãy luôn tính toán và trao đổi chuyên nghiệp trên cả hai con số: **Gross Monthly Base** và **Estimated Total Annual Compensation**."
        ],
        bullets: [
          "3 Câu hỏi ngược ghi điểm tuyệt đối với Tech Lead / Giám đốc Trung tâm Phần mềm: (1) 'Trong 6 tháng tới, bài toán kỹ thuật hoặc dự án chuyển đổi lớn nhất mà team mình cần giải quyết là gì (ví dụ tách Core, nâng tải 24/7 hay chuẩn hóa ISO 20022)?'; (2) 'Hiện tại quy trình phát hành lên Production và cơ chế đối soát / trực vận hành cấp 3 của team đang tổ chức như thế nào ạ?'; (3) 'Theo anh, một Senior Java gia nhập team sau 90 ngày đầu tiên đạt được những cột mốc nào thì được xem là thành công xuất sắc?'.",
          "Nguyên tắc không tiết lộ mức chốt quá sớm và neo giá trị bằng năng lực đặc thù: Kỹ sư vừa giỏi Java 21 / Kafka / PostgreSQL chịu tải cao VỪA hiểu sẵn Sổ cái kép, NAPAS/VietQR, Đối soát và PCI-DSS giúp ngân hàng tiết kiệm ít nhất 4–6 tháng đào tạo nghiệp vụ và tránh được những sự cố sai lệch tiền tệ đắt giá.",
          "Đàm phán lịch sự, dựa trên dữ liệu và phương án Win-Win: Nếu trần lương cứng bậc hiện tại của ngân hàng chênh nhẹ 5–10% so với kỳ vọng, em có thể thương lượng nâng bậc職 danh (ví dụ từ Senior Bậc 1 lên Senior Bậc 2 / Principal Specialist), thưởng ký hợp đồng (Sign-on Bonus) hoặc cam kết kỳ đánh giá xét duyệt sớm sau thử việc dựa trên KPI rõ ràng."
        ]
      }
    ],
    comparison: {
      title: "Sự khác biệt giữa Câu trả lời Mid-level và Senior/Lead trong Phỏng vấn Ngân hàng",
      headers: ["Tình huống phỏng vấn", "Phản xạ của Mid-level (Dễ bị ép bậc)", "Phản xạ của Senior / Tech Lead (Đạt Offer cao)", "Tín hiệu Hội đồng đánh giá"],
      rows: [
        [
          "Giao đề System Design Chuyển tiền",
          "Vẽ ngay Controller -> Service -> MySQL mà không hỏi quy mô hay RPO",
          "Chốt NFR (Peak TPS, P99, RPO=0), tính IOPS, chủ động giải bài Hot Account & Cross-shard",
          "Tư duy kiến trúc toàn diện, biết nhìn trước điểm nghẽn ở quy mô lớn"
        ],
        [
          "Hỏi khi gọi NAPAS bị ReadTimeout",
          "'Em bắt catch TimeoutException rồi cộng trả lại tiền ngay cho khách ạ'",
          "'Tuyệt đối giữ trạng thái PENDING / Suspense GL, gọi API Inquiry tra soát và chốt bằng Đối soát T+0'",
          "Hiểu sâu nghiệp vụ tài chính thực tế, không bao giờ làm ngân hàng mất tiền oan"
        ],
        [
          "Kể về sự cố từng gặp ở dự án cũ",
          "Nói chưa từng gặp lỗi hoặc đổ lỗi cho đồng nghiệp / QA test thiếu",
          "Trình bày mạch lạc: Cầm máu nhanh -> Tìm Root Cause bằng метrics/dump -> Cài chốt chặn hệ thống",
          "Bản lĩnh làm chủ Production, tinh thần trách nhiệm cao và trưởng thành"
        ],
        [
          "Đàm phán lương & Hỏi ngược cuối buổi",
          "Chỉ hỏi giờ giấc chấm công, nhận mức đầu tiên không phân tích gói năm",
          "Hỏi bài toán trọng tâm 6 tháng tới của Khối; bóc tách rõ Base tháng + Thưởng KPI năm + Lộ trình bậc",
          "Chuyên nghiệp, định hướng gắn bó tạo giá trị dài hạn cho tổ chức"
        ]
      ]
    },
    codeTitle: "Khung Sổ Tay System Design & Post-Mortem Chuẩn Senior/Architect Ngân Hàng (Playbook YAML)",
    code: [
      "# senior-banking-interview-playbook.yaml — Khung dẫn dắt 45 phút System Design & STAR Post-mortem",
      "systemDesign45MinFramework:",
      "  phase1_clarifyNfr_7min:",
      "    traffic: { avgTps: 1500, peakTps: 10000, readWriteRatio: \"3:1\" }",
      "    reliability: { sla: \"99.99%\", rpo: \"0_ZERO_DATA_LOSS\", rtoMinutes: 15 }",
      "    latencyTarget: { internalTransferP99Ms: 250, interbankNapasP99Ms: 1500 }",
      "    compliance: [\"Double-Entry Immutable Ledger\", \"PCI-DSS 4.0 Masking\", \"5-Year Retention\"]",
      "",
      "  phase2_capacityMath_6min:",
      "    dbWriteOpsPerSec: \"10,000 TPS * 5 rows (journal, 2 postings, idem, outbox) = 50,000 Write IOPS\"",
      "    shardingPlan: \"16 PostgreSQL Shards (by account_id) + Patroni Sync Standby (RPO=0)\"",
      "    hikariPoolRule: \"maxPoolSize = 16 per Pod per Shard -> never exhaust DB connections\"",
      "    storage5Years: \"130M tx/day * 2KB = 260GB/day -> ~95TB/year -> Hot NVMe (6m) + ClickHouse/S3 WORM\"",
      "",
      "  phase3_coreArchitecture_15min:",
      "    edgeDefense: [\"mTLS / OAuth2 RS256\", \"Transaction-bound Smart OTP\", \"Idempotency-Key Gate\"]",
      "    ledgerEngine: [\"Deterministic Lock Ordering\", \"Short TransactionTemplate\", \"Sub-account Striping (32 buckets)\"]",
      "    asyncBackbone: [\"Transactional Outbox + Debezium\", \"Kafka acks=all min.insync.replicas=2\"]",
      "",
      "  phase4_failureModesAndTradeoffs_17min:",
      "    partnerReadTimeout: \"NEVER auto-refund on timeout -> Hold in GL_SUSPENSE -> Async Inquiry -> T+0 Reconciliation\"",
      "    hotAccountSpike: \"Dynamic promotion to 32-bucket striped credits + periodic sweep to bucket_0\"",
      "    dc1FiberCut: \"Active-Standby synchronous WAL replica in DC2 + DNS/GSLB traffic switch + Feature Kill-Switch\"",
      "    observability: [\"OpenTelemetry traceId end-to-end\", \"Micrometer P99 Histogram\", \"Zero-Sum Ledger Alert\"]",
      "",
      "incidentStoryStarPostMortem:",
      "  situation: \"Payment Hub P99 vọt từ 120ms lên 12s lúc 11:30 ngày trả lương, cảnh báo HikariCP Pending > 80\"",
      "  mitigation5Min: \"Bật CircuitBreaker/Kill-Switch ngắt luồng gọi đối tác phụ bị treo, lấy jcmd Thread Dump trước khi scale\"",
      "  rootCause: \"1 hàm mới đặt WebClient.block() chưa cấu hình responseTimeout nằm bên trong @Transactional\"",
      "  permanentFix: \"Tách hoàn toàn HTTP I/O ra ngoài TransactionTemplate + áp cứng ReadTimeout 2s + Bulkhead\"",
      "  systemicGuardrail: \"Viết ArchUnit Test chặn build CI/CD nếu bất kỳ class @Transactional nào phụ thuộc *HttpClient\"",
      "  businessOutcome: \"Độ trễ P99 ổn định ở 85ms qua 6 kỳ trả lương tiếp theo, 0 sự cố cạn Connection Pool\""
    ].join("\n"),
    codeNotes: [
      "Mục `phase1_clarifyNfr_7min` và `phase2_capacityMath_6min` chính là 'tấm danh thiếp kiến trúc sư': chỉ cần em viết gọn gàng phép nhân `10.000 TPS * 5 rows = 50.000 Write IOPS -> cần 16 Shards` lên bảng trắng, hội đồng lập tức công nhận đẳng cấp thực chiến của em.",
      "Nguyên tắc `partnerReadTimeout: NEVER auto-refund on timeout` là câu hỏi phân loại sống còn trong mọi ngân hàng và cổng thanh toán — nắm chắc điều này giúp em không bao giờ sập bẫy phỏng vấn nghiệp vụ.",
      "Phần `incidentStoryStarPostMortem` kết thúc bằng `systemicGuardrail` (dùng ArchUnit chặn lỗi tự động ngay trên CI/CD) thể hiện tầm nhìn của một Tech Lead biết biến sự cố thành tài sản miễn dịch lâu dài cho cả tổ chức.",
      "Em hãy dùng chính khung YAML này để điền lại 2–3 dự án thực tế trong CV của riêng em trước ngày đi phỏng vấn một tuần."
    ],
    labGuide: {
      goal: "Tập dượt trọn vẹn 1 phiên Mock Interview 45 phút có bấm giờ và hoàn thiện Bản đặc tả CV + 2 câu chuyện STAR Post-mortem sẵn sàng ứng tuyển Senior Java Ngân hàng.",
      steps: [
        "Bước 1: Mở tài liệu trống hoặc bảng vẽ Excalidraw, đặt đồng hồ đếm ngược đúng 45 phút và tự trình bày thành tiếng (ghi âm lại trên điện thoại) bài toán 'Thiết kế Hệ thống Chuyển tiền 24/7 & Thanh toán VietQR 10.000 TPS' theo đúng 4 pha trong Playbook.",
        "Bước 2: Nghe lại bản ghi âm để tự kiểm điểm: em có chốt NFR trước phút thứ 7 không? Có giữ kết nối DB ngoài lệnh gọi HTTP không? Có xử lý Hot Account và kịch bản NAPAS ReadTimeout bằng Suspense + Đối soát không?",
        "Bước 3: Viết ra giấy 2 câu chuyện STAR + Post-mortem (1 bài xử lý nghẽn tải/sự cố, 1 bài tối ưu SQL/kiến trúc) với đầy đủ số liệu Trước – Sau và chốt chặn phòng ngừa hệ thống (`ArchUnit` / `Alert`).",
        "Bước 4: Cập nhật lại 5 gạch đầu dòng quan trọng nhất trong CV theo công thức: `[Hành động kỹ thuật sâu] + [Quy mô TPS / Dữ liệu] + [Kết quả đo lường P99 / Độ chính xác tiền tệ 100%]`."
      ],
      expectedOutput: "Sở hữu bài nói System Design 45 phút trôi chảy đúng nhịp đồng hồ, 2 câu chuyện thực chiến sắc bén theo chuẩn Post-mortem và bản CV nổi bật sẵn sàng chinh phục mức Offer Senior/Lead."
    },
    examTips: [
      "Quy tắc vàng trên bàn phỏng vấn ngân hàng: Khi đứng trước lựa chọn đánh đổi giữa 'Tốc độ cực đại nhưng có 0.01% nguy cơ lệch tiền' và 'Độ trễ tăng thêm 5ms nhưng đảm bảo RPO = 0 và đối soát 100%', hãy LUÔN chọn an toàn tiền tệ tuyệt đối!",
      "Nếu bị hỏi vào một chuẩn chuyên sâu em chưa từng trực tiếp gõ từng byte (ví dụ chi tiết một trường hiếm của ISO 8583), hãy trung thực nói rõ phạm vi mình đã làm và liên hệ sang nguyên lý tương đương (như Idempotency, Reversal, State Machine) — hội đồng rất trọng sự trung thực và tư duy nền tảng chắc.",
      "Khi đàm phán lương ngân hàng, luôn hỏi rõ cơ cấu gói năm (lương tháng 13, thưởng KPI năm trung bình các năm qua, thời điểm xét tăng lương định kỳ) để so sánh công bằng tổng thu nhập thực nhận."
    ],
    summaryTakeaways: [
      "Khung 45 phút System Design chuẩn: 7 phút chốt NFR & RPO=0 -> 6 phút nhẩm tải & Data Model -> 15 phút vẽ kiến trúc lõi -> 17 phút xoáy sâu Hot Account, Timeout Suspense & DR.",
      "Kể chuyện sự cố Production theo 5 bước STAR + Blameless Post-mortem (đặc biệt là bước cài đặt chốt chặn tự động ngăn tái diễn) là vũ khí mạnh nhất ở vòng phỏng vấn Manager/CTO.",
      "CV ứng tuyển ngành Tài chính - Ngân hàng phải nói bằng ngôn ngữ của con số đo lường: TPS, độ trễ P99, tỷ lệ khớp đối soát T+0, bảo toàn sổ cái kép và tuân thủ bảo mật.",
      "Kết hợp năng lực kỹ thuật sâu với đồ án Capstone thực chiến ở Học phần C ngay sau đây sẽ tạo lợi thế cạnh tranh vượt trội giúp em tự tin đàm phán mức đãi ngộ Senior xứng đáng."
    ],
    lessonQuestions: [
      {
        question: "Trong buổi phỏng vấn System Design luồng Chuyển tiền Nhanh 24/7 liên ngân hàng, giám khảo đặt tình huống: 'Dịch vụ Payment Hub của em đã trừ tiền tài khoản nguồn (hoặc đặt Hold), sau đó gửi bản tin thanh toán sang cổng chuyển mạch liên ngân hàng nhưng sau 15 giây nhận về lỗi SocketTimeoutException. Em xử lý ngay lúc đó như thế nào?'. Câu trả lời nào thể hiện đúng đẳng cấp Senior Banking?",
        options: [
          "Lập tức bắt catch SocketTimeoutException, cộng hoàn trả tiền ngay về tài khoản người gửi và báo 'Giao dịch thất bại, mời quý khách bấm chuyển lại!' để khách chuyển lệnh mới ngay.",
          "Giữ nguyên khoản tiền đang khoanh giữ/hạch toán ở tài khoản trung gian treo (`GL_SUSPENSE` / trạng thái `PENDING`), trả thông báo 'Giao dịch đang được xử lý kiểm tra trạng thái' cho khách, kích hoạt luồng truy vấn tra soát tự động (`Inquiry`) sang chuyển mạch và chốt kết quả cuối cùng qua tiến trình Đối soát T+0/T+1.",
          "Dùng vòng lặp for bắn lại lệnh chuyển tiền mới kèm mã giao dịch mới 10 lần liên tiếp cho tới khi thành công.",
          "Xóa bản ghi giao dịch khỏi Database coi như chưa từng có chuyện gì xảy ra."
        ],
        answer: 1,
        explanation: "Lỗi Read/SocketTimeout nghĩa là trạng thái 'Chưa xác định (Unknown)': rất có thể ngân hàng đích đã nhận được lệnh và đã cộng tiền cho người nhận rồi nhưng gói tin phản hồi về bị rớt mạng! Nếu tự ý hoàn tiền ngay để khách bấm chuyển lần nữa thì ngân hàng sẽ mất đứt gấp đôi số tiền. Phải treo ở Suspense/Pending để tra soát và đối soát.",
        wrongReasons: [
          "Tự động hoàn tiền ngay khi gặp Timeout chưa rõ trạng thái bên kia là sai lầm gây thất thoát tiền thật kinh điển nhất khi tích hợp thanh toán!",
          "",
          "Bắn lại lệnh chuyển tiền với mã giao dịch mới sẽ khiến người nhận được cộng tiền nhiều lần (Double/Multiple Spending).",
          "Xóa dấu vết giao dịch đang treo làm mất khả năng đối soát và vi phạm nghiêm trọng nguyên tắc kiểm toán sổ cái."
        ]
      },
      {
        question: "Khi trình bày câu chuyện xử lý sự cố Production nghiêm trọng nhất trước Giám đốc Kỹ thuật (Engineering Director) của ngân hàng, cách tiếp cận nào tạo được niềm tin lớn nhất để được xếp bậc Senior / Tech Lead?",
        options: [
          "Khẳng định bản thân viết code hoàn hảo suốt 5 năm chưa bao giờ có bug và mọi lỗi trước đây đều do đồng nghiệp nhóm khác gây ra.",
          "Kể chi tiết theo cấu trúc STAR + Blameless Post-mortem: nêu rõ tác động đo lường được, bước cô lập cầm máu bảo vệ khách hàng trong vài phút đầu, quá trình đọc Metrics/Thread Dump tìm đúng nguyên nhân gốc rễ, bản sửa kiến trúc triệt để và chốt chặn tự động (như ArchUnit/CI Gate/Alert) đã bổ sung để cả đội không lặp lại lỗi đó.",
          "Chỉ kể về giao diện màu sắc nút bấm bị lệch 2 pixel trên màn hình đăng nhập.",
          "Từ chối trả lời mọi câu hỏi liên quan đến vận hành thực tế."
        ],
        answer: 1,
        explanation: "Hội đồng cấp cao tìm kiếm người có bản lĩnh bình tĩnh cứu hệ thống khi sóng gió, có phương pháp chẩn đoán khoa học thay vì đoán mò, không đổ lỗi cá nhân và biết nâng cấp quy trình/công cụ để ngăn ngừa sự cố ở tầm hệ thống.",
        wrongReasons: [
          "Phủ nhận mọi sự cố hoặc đổ lỗi cho đồng nghiệp là cờ đỏ (Red Flag) lớn nhất về thái độ thiếu trung thực và thiếu tinh thần làm chủ của vị trí Senior.",
          "",
          "Lỗi lệch 2 pixel không phản ánh năng lực xử lý các bài toán độ tin cậy, tải cao và an toàn dữ liệu của Backend Senior.",
          "Vận hành ổn định hệ thống Production là một nửa trách nhiệm cốt lõi của kỹ sư Senior nên từ chối chia sẻ sẽ đánh mất cơ hội chứng minh năng lực."
        ]
      }
    ]
  }
});
