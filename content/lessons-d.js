/* FinJava Senior Academy — Học phần D: Database Ngân Hàng, Locking Chống Âm Tiền, Redis & Sharding */
window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  D1: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Senior Core & Data)",
    codeLang: "sql",
    teacherIntro: "Chào em, chào mừng em bước vào Học phần D — chiến tuyến cuối cùng và sinh tử nhất bảo vệ từng đồng tiền của khách hàng! Anh vẫn nhớ như in sáng mùng 5 tháng 9 vài năm trước — ngày trả lương đồng loạt của hàng chục tập đoàn lớn. Đúng 09:05 sáng, hàng trăm nghìn người mở App Mobile Banking xem sao kê lương làm CPU cụm PostgreSQL Core Ledger vọt thẳng lên 99,8%, câu truy vấn lấy 20 dòng biến động số dư vốn chỉ mất 3ms bỗng vọt lên 14,2 giây gây nghẽn toàn bộ HikariCP Pool! Khi anh mở `EXPLAIN (ANALYZE, BUFFERS)` ra mổ xẻ thì phát hiện 2 thủ phạm: một hàm bọc `DATE(created_at)` làm gãy Index buộc DB quét tuần tự (`Seq Scan`) qua 120 triệu dòng, cộng thêm 35 triệu bản ghi rác (`dead tuples` của MVCC) chưa kịp dọn sau đợt Batch trả lương đêm qua. Đáng sợ hơn, trong lúc hoảng loạn có cậu em đề xuất tắt `fsync = off` để giảm I/O — nếu hôm đó anh không chặn kịp thì lần sập nguồn UPS tháng sau đã làm bốc hơi hàng nghìn bút toán đã báo thành công! Bài đầu tiên này, anh sẽ truyền lại cho em toàn bộ nội công thâm hậu nhất về MVCC, WAL và nghệ thuật đọc vị `EXPLAIN ANALYZE`.",
    analogy: {
      title: "Cuốn sổ nhật ký bút bi không tẩy xóa & Tấm ảnh chụp tức thời tại quầy",
      body: "Em hãy hình dung thủ quỹ ngân hàng giữ cuốn sổ cái hàng triệu khách. Nếu mỗi khi cập nhật số dư của ông A, thủ quỹ lấy cục tẩy xóa con số cũ đi để viết đè số mới lên (Update in-place), thì trong suốt lúc đang tẩy xóa dở dang đó, không ai khác được phép ghé mắt nhìn trang sổ ấy, và lỡ cúp điện giữa chừng thì mất luôn cả số cũ lẫn số mới! Thay vào đó, PostgreSQL dùng cơ chế thông minh hơn: trước hết ghi nhanh hành động vào cuốn Nhật ký Giao dịch chống cháy (WAL/Redo Log) bằng bút bi liền mạch một chiều, sau đó giữ nguyên dòng cũ trên sổ và viết thêm một dòng phiên bản mới ở dưới kèm dấu thời gian (MVCC). Khách hàng bước vào thời điểm nào sẽ nhìn thấy đúng dòng phiên bản hợp lệ của thời điểm đó — người đọc không bao giờ chặn người ghi, và người ghi không bao giờ chặn người đọc. Tất nhiên, cuối ca phải có nhân viên dọn dẹp (Autovacuum) đi thu hồi các dòng phiên bản cũ không còn ai nhìn tới nữa!"
    },
    objectives: [
      "Hiểu tận gốc cơ chế MVCC (Multi-Version Concurrency Control) qua `xmin/xmax` trên PostgreSQL so với Undo Tablespace của Oracle, lý giải hiện tượng Dead Tuples / Table Bloat và cách tinh chỉnh Autovacuum cho bảng nóng.",
      "Nắm vững luồng bền vững dữ liệu Write-Ahead Logging (WAL / Redo Log), Checkpoint, `fsync` và `synchronous_commit` để bảo toàn tuyệt đối chữ D (Durability) trong giao dịch tiền tệ.",
      "Đọc hiểu sắc bén đầu ra của `EXPLAIN (ANALYZE, BUFFERS)` để phát hiện `Seq Scan`, `Heap Fetches`, `External Merge Disk`, độ lệch thống kê và hạ thời gian truy vấn sao kê từ hàng chục giây xuống vài mili-giây."
    ],
    flow: [
      {
        step: "1. Ghi Nhật ký Bền vững trước (Write-Ahead Log + fsync)",
        detail: "Khi giao dịch gọi `COMMIT`, PostgreSQL ghi tuần tự các bản ghi thay đổi (XLOG records) từ WAL Buffer xuống ổ đĩa NVMe thông qua lời gọi hệ thống `fsync()` trước khi trả tín hiệu thành công về cho ứng dụng Java."
      },
      {
        step: "2. Sinh Phiên bản Dòng mới trong Bộ nhớ Đệm (MVCC Tuple Versioning)",
        detail: "Trang dữ liệu 8KB trong `shared_buffers` được đánh dấu bẩn (dirty page): với lệnh `UPDATE`, bản ghi cũ được gán `xmax = txid_hiện_tại` và một bản ghi mới mang `xmin = txid_hiện_tại` được chèn vào trang mà chưa cần ghi ngẫu nhiên xuống đĩa ngay."
      },
      {
        step: "3. Đọc Nhất quán theo Ảnh chụp (Snapshot Visibility Check)",
        detail: "Mọi câu lệnh `SELECT` chụp một `Snapshot` chứa danh sách giao dịch đang chạy để tự động lọc ra đúng phiên bản tuple hợp lệ mà không đặt khóa chặn các luồng đang cập nhật số dư song song."
      },
      {
        step: "4. Chẩn đoán Kế hoạch Thực thi & Thu gom Rác (EXPLAIN + Autovacuum)",
        detail: "Tiến trình nền Checkpointer đẩy các dirty pages xuống đĩa theo định kỳ, Autovacuum thu hồi không gian của `dead tuples` cập nhật Visibility Map, còn kỹ sư dùng `EXPLAIN (ANALYZE, BUFFERS)` để kiểm chứng chi phí đọc RAM/Disk thực tế."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu MVCC (Multi-Version Concurrency Control): PostgreSQL Heap vs Oracle Undo",
        paragraphs: [
          "Trong hệ thống Core Banking phục vụ 5.000 lượt xem số dư và 1.000 lệnh chuyển khoản mỗi giây, nếu câu lệnh đọc (`SELECT`) khóa câu lệnh ghi (`UPDATE`) hoặc ngược lại thì toàn bộ ngân hàng sẽ tê liệt ngay lập tức. MVCC giải quyết triệt để bài toán này bằng nguyên lý vàng: *Readers never block Writers, Writers never block Readers*. Trên PostgreSQL, mỗi dòng vật lý (tuple) nằm trong trang dữ liệu 8KB mang theo hai trường ẩn quan trọng là `xmin` (mã giao dịch tạo ra dòng đó) và `xmax` (mã giao dịch xóa hoặc cập nhật đè dòng đó). Khi em chạy câu lệnh `UPDATE accounts SET balance = 900 WHERE id = 10`, PostgreSQL thực chất KHÔNG ghi đè lên chỗ cũ mà thực hiện `DELETE` logic bản ghi cũ (điền `xmax`) kèm theo `INSERT` một bản ghi vật lý hoàn toàn mới mang số dư 900! Các luồng đọc đang chạy từ trước vẫn nhìn bản ghi cũ một cách an toàn, còn luồng mới sẽ thấy bản ghi 900.",
          "Tuy nhiên, thiết kế này sinh ra một hệ quả sống còn mà mọi Senior làm PostgreSQL phải thuộc nằm lòng: **Dead Tuples & Table Bloat** (phình bảng dữ liệu). Tài khoản trung gian hoặc ví thanh toán cập nhật 100.000 lần mỗi giờ sẽ để lại 100.000 xác bản ghi cũ nằm xen kẽ trong các trang 8KB, khiến kích thước bảng phình gấp 5 lần và làm chậm câu truy vấn vì phải đọc qua hàng đống trang rác! Trái ngược lại, **Oracle Database** cập nhật trực tiếp tại chỗ trên Data Block và đẩy bản ảnh cũ sang vùng **Undo Tablespace** riêng — nhờ đó bảng chính không bị phình rác nhưng các câu báo cáo sao kê cuối ngày chạy quá lâu lại dễ nổ lỗi kinh điển `ORA-01555: snapshot too old` khi vùng Undo bị ghi đè! Trên PostgreSQL, để bảo vệ bảng `accounts` và `ledger_entries`, ta bắt buộc hạ ngưỡng `autovacuum_vacuum_scale_factor` từ mặc định 20% xuống còn `0.01` (1%) kết hợp tận dụng cơ chế **HOT Update (Heap-Only Tuple)** bằng cách không đánh Index bừa bãi lên các cột bị cập nhật liên tục như `balance` hay `updated_at`."
        ],
        bullets: [
          "Cơ chế xmin / xmax / ctid: Mỗi lần `UPDATE` trên PostgreSQL sinh ra một tuple vật lý mới có địa chỉ `ctid` mới; nếu cột bị sửa có đánh Index, toàn bộ các Index trên bảng đều phải chèn thêm con trỏ mới.",
          "Tối ưu HOT Update (Heap-Only Tuple): Khi câu `UPDATE` không chạm vào bất kỳ cột nào nằm trong Index và trang 8KB hiện tại còn chỗ trống (`fillfactor = 80`), PostgreSQL nối dây xích ngay trong trang mà không cần cập nhật lại cây Index, tăng gấp đôi tốc độ ghi số dư.",
          "Cạm bẫy Autovacuum mặc định 20%: Bảng `ledger_entries` có 100 triệu dòng sẽ phải chờ phát sinh tới 20 triệu dòng rác mới kích hoạt dọn dẹp gây nghẽn I/O đột ngột; bảng nóng bắt buộc cấu hình riêng ở mức 0.5% – 1% hoặc ngưỡng dòng cố định.",
          "Long-running Transaction giữ chân Vacuum: Chỉ một phiên DBeaver của dev mở `BEGIN` rồi bỏ quên đi ăn trưa sẽ giữ `OldestXmin` đứng yên, khiến Autovacuum không thể dọn bất kỳ dead tuple nào phát sinh trên toàn DB!"
        ]
      },
      {
        heading: "2. Write-Ahead Logging (WAL / Redo Log), Checkpoint và Lằn ranh Sinh tử của fsync",
        paragraphs: [
          "Tại sao khi em `COMMIT` một giao dịch chuyển tiền, Database có thể đảm bảo 100% không mất dữ liệu dù 1 mili-giây sau trung tâm dữ liệu bị cúp điện đột ngột, trong khi vẫn đạt tốc độ hàng nghìn TPS? Bí mật nằm ở kiến trúc **Write-Ahead Logging (WAL trên PostgreSQL / Redo Log trên Oracle)**. Nếu mỗi lần `COMMIT` mà DB phải tìm đúng 5–6 trang dữ liệu 8KB của bảng và các cây B-Tree Index nằm rải rác khắp ổ cứng để ghi ngẫu nhiên (Random I/O), ổ đĩa sẽ nghẽn cứng ngay lập tức. Thay vào đó, DB chỉ sửa dữ liệu trên bộ nhớ RAM (`shared_buffers`), đồng thời ghi mô tả thay đổi siêu gọn (vài trăm bytes) nối đuôi tuần tự (**Sequential Append**) vào tệp WAL trên đĩa thông qua lệnh gọi hệ thống `fsync()`. Ghi tuần tự trên NVMe SSD hiện đại chỉ tốn chưa đầy 0,1 mili-giây! Nếu máy chủ sập nguồn ngay sau đó, lúc khởi động lại DB chỉ cần đọc lại tệp WAL từ điểm `Checkpoint` gần nhất để phát lại (Replay / Crash Recovery) khôi phục nguyên vẹn 100% các trang RAM chưa kịp lưu.",
          "Trong môi trường ngân hàng, anh cấm tuyệt đối hai hành vi tự sát cấu hình sau đây: Thứ nhất là đặt `fsync = off` — khi tắt cờ này, PostgreSQL chỉ đẩy dữ liệu sang bộ đệm RAM của Hệ điều hành Linux rồi báo thành công ngay; nếu sập nguồn vật lý hoặc Kernel Panic, không chỉ mất giao dịch vừa chạy mà tệp dữ liệu còn bị hỏng cấu trúc (**Database Corruption**) không thể khởi động lại! Thứ hai là đặt `synchronous_commit = off` toàn cục trên cụm Core Ledger — dù không làm hỏng DB khi sập nguồn, nó cho phép mất khoảng 200–600ms giao dịch cuối cùng đã lỡ trả mã `00 Thành công` về cho đối tác NAPAS, gây lệch tiền đối soát nghiêm trọng! Em chỉ được phép tắt `synchronous_commit = off` cục bộ ở mức từng phiên (`SET LOCAL synchronous_commit = off`) cho các bảng nhật ký phụ trợ không mang tính tiền tệ như `api_access_logs` hay `login_telemetry`."
        ],
        bullets: [
          "Luật sắt Write-Ahead: Không một trang dữ liệu bẩn (Dirty Page) nào trong RAM được phép ghi xuống tệp bảng vật lý trước khi bản ghi WAL tương ứng của nó đã được `fsync` an toàn xuống đĩa.",
          "Kiểm soát Checkpoint I/O Spike: Đặt `checkpoint_completion_target = 0.9` và `max_wal_size = 16GB..32GB` để rải đều việc xả các trang bẩn ra suốt chu kỳ thay vì dồn cục gây giật độ trễ P99.",
          "Giảm phình WAL với wal_compression: Sau mỗi Checkpoint, lần sửa đầu tiên trên một trang 8KB buộc DB phải ghi nguyên cả trang 8KB vào WAL (`full_page_writes = on` chống lỗi rách trang Torn Page); bật `wal_compression = lz4/zstd` giúp giảm 40–60% băng thông đĩa và mạng Replication.",
          "Phân tách ổ đĩa vật lý: Trên hệ thống On-Premise ngân hàng có tải ghi cực lớn, luôn gắn thư mục `pg_wal` lên phân vùng ổ NVMe độ trễ cực thấp tách rời khỏi phân vùng lưu Data Tablespace."
        ]
      },
      {
        heading: "3. Đọc vị EXPLAIN (ANALYZE, BUFFERS) như một Kiến trúc sư Dữ liệu Thực thụ",
        paragraphs: [
          "Khi nhận được cảnh báo một API tra cứu giao dịch chạy chậm, phản xạ của Junior là đoán mò rồi đánh đại thêm một Index, còn phản xạ của Senior là chạy ngay `EXPLAIN (ANALYZE, BUFFERS)` để nhìn tận mắt bằng chứng thực nghiệm. Lưu ý cực kỳ quan trọng: `EXPLAIN` trơn chỉ cho xem kế hoạch **dự kiến** dựa trên bảng thống kê mẫu, còn `EXPLAIN (ANALYZE, BUFFERS)` sẽ **thực sự chạy câu lệnh đó** và đo thời gian tới từng micro-giây kèm số lượng trang bộ nhớ đã chạm vào! Vì nó thực sự chạy câu lệnh, nếu em đang kiểm tra một câu `UPDATE` hay `DELETE`, bắt buộc phải bọc nó trong khối giao dịch an toàn: `BEGIN; EXPLAIN (ANALYZE, BUFFERS) UPDATE ...; ROLLBACK;` để không làm hỏng dữ liệu thật!",
          "Khi đọc cây kết quả từ trong ra ngoài (nút thụt lề sâu nhất chạy trước), hãy soi ngay 4 chỉ số vàng: (1) **Loại nút quét**: `Seq Scan` trên bảng hàng triệu dòng là còi báo động đỏ (thường do bọc hàm lên cột như `UPPER(ref_code)`, `DATE(created_at)` hoặc lệch kiểu dữ liệu truyền `bigint` vào cột `varchar` làm vô hiệu hóa Index!). (2) **`Buffers: shared hit=X read=Y`**: mỗi đơn vị tương ứng 1 trang 8KB; `hit` là đọc từ RAM cực nhanh, còn `read` là phải lôi từ đĩa/OS Cache lên — nếu lấy 20 dòng sao kê mà `shared hit + read = 185.000` (tương đương quét 1,48 GB dữ liệu!) thì chắc chắn Index đang thiết kế sai. (3) **`Rows Removed by Filter`**: nếu trả về 20 dòng nhưng `Rows Removed by Filter: 2,400,000` nghĩa là Index chỉ lọc được điều kiện đầu, rồi DB phải lôi 2,4 triệu dòng lên lọc thủ công điều kiện sau. (4) **`Sort Method: external merge Disk`**: thiếu cột sắp xếp trong Index khiến phép `ORDER BY` tràn bộ nhớ `work_mem` phải đổ tạm ra ổ cứng chậm gấp hàng trăm lần!"
        ],
        bullets: [
          "So sánh Estimated Rows vs Actual Rows: Nếu dự kiến `rows=12` nhưng thực tế `actual rows=850000`, bảng thống kê của Planner đã lỗi thời nghiêm trọng — cần chạy `ANALYZE ledger_entries;` hoặc tăng `default_statistics_target` cho cột phân phối lệch.",
          "Hiểm họa bọc hàm & Ép kiểu ngầm: Tuyệt đối viết `created_at >= '2026-11-01'::timestamptz AND created_at < '2026-11-02'::timestamptz` thay vì `DATE(created_at) = '2026-11-01'` để bảo toàn khả năng tìm kiếm trên cây B-Tree (SARGable predicate).",
          "Đọc chỉ số Heap Fetches trong Index Only Scan: Nếu kế hoạch hiện `Index Only Scan` nhưng `Heap Fetches: 45000` cao ngất ngưởng, chứng tỏ Visibility Map của bảng đang bẩn do Autovacuum chạy không kịp.",
          "Bật pg_stat_statements bắt buộc trên Production: Đây là 'camera hành trình' ghi lại Top các câu SQL ngốn tổng thời gian CPU (`total_exec_time`) và đọc nhiều trang đĩa (`shared_blks_read`) lớn nhất toàn ngân hàng."
        ]
      }
    ],
    comparison: {
      title: "Đối chiếu Cơ chế Truy xuất & Cấu hình Độ bền Dữ liệu trong CSDL Ngân hàng",
      headers: ["Cơ chế / Cấu hình", "Bản chất Hoạt động Kỹ thuật", "Tác động Hiệu năng & Rủi ro", "Quy chuẩn Áp dụng tại Ngân hàng"],
      rows: [
        [
          "Seq Scan vs Index Scan",
          "`Seq Scan` đọc tuần tự mọi trang 8KB của bảng (kể cả dead tuples); `Index Scan` đi theo cây B-Tree nhảy thẳng tới `ctid` cần lấy.",
          "`Seq Scan` gây bão I/O và đẩy văng dữ liệu nóng khỏi `shared_buffers` khi bảng > 1 triệu dòng.",
          "Truy vấn OLTP giao dịch bắt buộc đạt `Index Scan` hoặc `Index Only Scan` với độ trễ < 10ms."
        ],
        [
          "fsync = on + synchronous_commit = on",
          "Mọi lệnh `COMMIT` chờ ghi tuần tự bản ghi WAL xuống đĩa vật lý hoàn tất trước khi phản hồi thành công cho Java.",
          "Tốn ~0.1–0.5ms I/O trên NVMe SSD mỗi lần commit, nhưng bảo toàn 100% dữ liệu khi mất điện.",
          "BẮT BUỘC 100% cho Core Ledger, Tài khoản, Thanh toán NAPAS/Thẻ và Hồ sơ khách hàng."
        ],
        [
          "SET LOCAL synchronous_commit = off",
          "Ghi vào WAL Buffer trong RAM và trả lời ngay, tiến trình WAL Writer đẩy xuống đĩa mỗi ~200ms định kỳ.",
          "Tăng gấp 3–4 lần thông lượng ghi nhỏ lẻ, không hỏng DB khi sập nguồn nhưng có thể mất ~200ms bản ghi cuối.",
          "Chỉ dùng cục bộ cho bảng Log truy cập, Audit hành vi xem màn hình hoặc Telemetry không gắn tiền tệ."
        ],
        [
          "Autovacuum Mặc định (20%) vs Bảng Nóng (1%)",
          "Mặc định chờ 20% tổng số dòng bị sửa/xóa mới dọn rác; cấu hình bảng nóng hạ xuống 0.5%–1% và tăng `cost_limit`.",
          "Để mặc định trên bảng 100 triệu dòng gây phình bảng nghiêm trọng và tụt hiệu năng `Index Only Scan`.",
          "Bắt buộc cấu hình `ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.01)` cho bảng `accounts` và `transactions`."
        ]
      ]
    },
    codeTitle: "Chẩn đoán EXPLAIN (ANALYZE, BUFFERS), Tối ưu Truy vấn Sao kê & Tinh chỉnh Autovacuum Bảng Nóng",
    code: [
      "-- 1. Chẩn đoán câu truy vấn sao kê bị chậm (14.2s) trong khối ROLLBACK an toàn",
      "BEGIN;",
      "EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)",
      "SELECT entry_id, txn_ref, amount, balance_after, created_at",
      "FROM ledger_entries",
      "WHERE account_id = 1000892341",
      "  AND DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = DATE '2026-11-05' -- LỖI: Bọc hàm làm gãy Index!",
      "ORDER BY created_at DESC LIMIT 20;",
      "ROLLBACK;",
      "",
      "-- 2. Viết lại chuẩn SARGable (Giữ nguyên cột trần bên trái toán tử) + Index đồng bộ thứ tự sắp xếp",
      "CREATE INDEX idx_ledger_acc_created_desc",
      "ON ledger_entries (account_id, created_at DESC);",
      "",
      "EXPLAIN (ANALYZE, BUFFERS)",
      "SELECT entry_id, txn_ref, amount, balance_after, created_at",
      "FROM ledger_entries",
      "WHERE account_id = 1000892341",
      "  AND created_at >= TIMESTAMPTZ '2026-11-05 00:00:00+07'",
      "  AND created_at <  TIMESTAMPTZ '2026-11-06 00:00:00+07'",
      "ORDER BY created_at DESC LIMIT 20;",
      "-- Kết quả mới: Index Scan using idx_ledger_acc_created_desc (Buffers: shared hit=5, Time: 0.18 ms!)",
      "",
      "-- 3. Kiểm tra tỷ lệ Dead Tuples (Bloat) và Tinh chỉnh Autovacuum riêng cho bảng tài khoản nóng",
      "SELECT relname, n_live_tup, n_dead_tup,",
      "       ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,",
      "       last_autovacuum",
      "FROM pg_stat_user_tables",
      "WHERE relname IN ('accounts', 'ledger_entries');",
      "",
      "ALTER TABLE accounts SET (",
      "  fillfactor = 80,                        -- Chừa 20% khoảng trống mỗi trang 8KB để kích hoạt HOT Update",
      "  autovacuum_vacuum_scale_factor = 0.01,  -- Dọn rác ngay khi có 1% dòng thay đổi thay vì chờ 20%",
      "  autovacuum_vacuum_cost_limit = 2000     -- Tăng tốc độ dọn dẹp cho tiến trình Vacuum trên ổ NVMe",
      ");"
    ].join("\n"),
    codeNotes: [
      "Bọc hàm DATE(...) lên cột đánh Index là lỗi kinh điển nhất: Khi viết `DATE(created_at) = ...`, bộ tối ưu PostgreSQL mù hoàn toàn trước cây B-Tree của cột `created_at` (trừ khi đánh Expression Index đúng y hệt biểu thức đó). Chuyển sang khoảng nửa mở `>= đầu_ngày AND < đầu_ngày_hôm_sau` giữ nguyên cột trần nên đi thẳng vào nhánh lá B-Tree.",
      "Đọc chỉ số Buffers thay vì chỉ nhìn mili-giây: Trên môi trường Dev ít tải, dữ liệu nằm sẵn trong RAM nên quét 50.000 buffers có thể chỉ mất 30ms khiến dev chủ quan; nhưng lên Production khi 500 khách gọi đồng thời và phải đọc đĩa (`shared read`), 50.000 buffers đó sẽ biến thành 14 giây treo cứng! Hạ xuống `shared hit = 5` mới là tối ưu tận gốc.",
      "Sự kết hợp giữa fillfactor = 80 và HOT Update trên bảng accounts: Bảng `accounts` cập nhật số dư liên tục nhưng khóa chính `id` và `account_no` không bao giờ đổi. Đặt `fillfactor = 80` chừa sẵn 20% chỗ trống ngay trong cùng trang 8KB giúp phiên bản tuple mới nằm cạnh bản cũ mà không phải sửa cây Index nào.",
      "Cờ WAL trong EXPLAIN (PG 13+): Cho phép nhìn thấy chính xác một câu lệnh `UPDATE/INSERT` sinh ra bao nhiêu bytes WAL và bao nhiêu Full Page Images (`fpi`) để đánh giá chi phí tải nhân bản sang máy chủ Standby."
    ],
    labGuide: {
      goal: "Thực hành tạo lập bảng giao dịch 2 triệu dòng trên PostgreSQL (Docker/Testcontainers), tái hiện sự cố truy vấn sao kê chậm do Seq Scan & Dead Tuples, sau đó đọc EXPLAIN (ANALYZE, BUFFERS) để tối ưu xuống dưới 2 mili-giây.",
      steps: [
        "Bước 1: Khởi chạy container `postgres:16-alpine` có bật extension `pg_stat_statements`, tạo bảng `accounts` (50.000 dòng) và `ledger_entries` (2.000.000 dòng dữ liệu phân bổ bằng hàm `generate_series`).",
        "Bước 2: Chạy câu lệnh `UPDATE accounts SET balance = balance + 1` lặp 3 lần trên tập 20.000 tài khoản khi tạm tắt autovacuum, sau đó truy vấn `pg_stat_user_tables` để quan sát `n_dead_tup` vọt lên 60.000 dòng rác và kích thước bảng phình to.",
        "Bước 3: Chạy `EXPLAIN (ANALYZE, BUFFERS)` cho câu truy vấn sao kê dùng `DATE(created_at)` và chưa có Index ghép; ghi nhận kế hoạch `Parallel Seq Scan`, số lượng `Buffers: shared hit/read` lên tới hàng chục nghìn trang và thời gian thực thi > 400ms.",
        "Bước 4: Viết lại điều kiện lọc khoảng thời gian chuẩn SARGable, đánh Index `(account_id, created_at DESC)`, chạy `VACUUM ANALYZE` và kiểm chứng lại `EXPLAIN (ANALYZE, BUFFERS)` đạt `Index Scan` với `shared hit <= 6` và `Execution Time < 1 ms`."
      ],
      expectedOutput: "Ảnh chụp hoặc log so sánh trước/sau của `EXPLAIN (ANALYZE, BUFFERS)` chứng minh số lượng trang bộ nhớ đọc giảm từ >15.000 pages xuống <= 6 pages, triệt tiêu hoàn toàn `Seq Scan` và `Rows Removed by Filter`, thời gian thực thi đạt ~0.2ms."
    },
    examTips: [
      "Mẹo phỏng vấn Senior #1 (Câu hỏi kinh điển về PostgreSQL UPDATE): Khi hội đồng hỏi 'Tại sao bảng `accounts` chỉ có 1 triệu khách hàng không tăng thêm mà sau 1 tháng ổ cứng lại phình từ 500MB lên 12GB và truy vấn ngày càng chậm?', hãy trả lời ngay bằng cơ chế MVCC sinh Dead Tuples khi `UPDATE` liên tục + kiểm tra xem có Long-running Transaction hoặc Replication Slot bị treo đang chặn Autovacuum thu hồi không gian hay không!",
      "Bẫy chí mạng với EXPLAIN ANALYZE trên Production: Nếu giám khảo hỏi 'Có nên chạy `EXPLAIN ANALYZE DELETE FROM temp_logs WHERE ...` trực tiếp để xem nó có dùng Index không?', phải trả lời KHÔNG được chạy trần vì `ANALYZE` thực thi xóa thật dữ liệu — bắt buộc bọc trong `BEGIN; ... ROLLBACK;`!",
      "Phân biệt rạch ròi fsync vs synchronous_commit: Tắt `fsync` gây hỏng tệp CSDL vật lý (Data Corruption) khi cúp điện — cấm tuyệt đối 100%; còn tắt `synchronous_commit` không làm hỏng cấu trúc DB nhưng vi phạm tính bền vững tức thời của giao dịch tài chính."
    ],
    summaryTakeaways: [
      "MVCC cho phép đọc và ghi diễn ra đồng thời không khóa lẫn nhau thông qua đa phiên bản bản ghi (`xmin/xmax`), nhưng đòi hỏi cấu hình Autovacuum sát sao và `fillfactor` hợp lý trên các bảng cập nhật tần suất cao.",
      "Write-Ahead Logging (WAL) biến thao tác ghi ngẫu nhiên đắt đỏ thành ghi nối đuôi tuần tự cực nhanh kết hợp `fsync()` để bảo đảm không mất dù chỉ 1 đồng khi sập nguồn đột ngột.",
      "Khi tối ưu SQL với `EXPLAIN (ANALYZE, BUFFERS)`, hãy tập trung giảm tổng số trang `Buffers (hit + read)` và loại bỏ `Seq Scan` / `External Merge Disk` thay vì chỉ nhìn con số `cost` ước lượng.",
      "Tuyệt đối giữ cột được đánh Index đứng độc lập một vế trong mệnh đề `WHERE` (không bọc hàm hay ép kiểu ngầm) để tận dụng tối đa cây tìm kiếm B-Tree."
    ],
    lessonQuestions: [
      {
        question: "Tại một ngân hàng số sử dụng PostgreSQL 16 cho hệ thống Core Wallet, bảng `wallets` chỉ chứa đúng 2 triệu tài khoản khách hàng nhưng xử lý khoảng 800 lệnh cộng/trừ số dư (`UPDATE`) mỗi giây. Sau 3 ngày khuyến mãi lớn, đội SRE phát hiện dung lượng vật lý của bảng `wallets` phình từ 600 MB lên 18 GB, tỷ lệ đọc đĩa tăng vọt dù câu lệnh `VACUUM` tự động vẫn báo được kích hoạt nhưng không thu hồi được dòng rác nào (`0dead row versions can be removed`). Nguyên nhân gốc rễ khả dĩ nhất là gì?",
        options: [
          "Bộ nhớ `shared_buffers` được cấp quá lớn khiến PostgreSQL giữ lại toàn bộ lịch sử thay đổi trong tệp bảng vĩnh viễn.",
          "Tồn tại một phiên kết nối mở giao dịch treo dài ngày (`idle in transaction` trên công cụ BI/DBeaver hoặc Prepared Transaction bị mồ côi) giữ mốc `OldestXmin` cũ, ngăn cản Autovacuum dọn dẹp mọi Dead Tuple phát sinh sau thời điểm đó.",
          "PostgreSQL không hỗ trợ cơ chế cập nhật dòng mà luôn nhân bản toàn bộ bảng mỗi khi có câu lệnh `UPDATE`.",
          "Cấu hình `fsync = on` ngăn không cho tiến trình Autovacuum xóa các bản ghi đã hết hiệu lực trên ổ cứng SSD."
        ],
        answer: 1,
        explanation: "Trong kiến trúc MVCC của PostgreSQL, Autovacuum chỉ được phép thu hồi các `dead tuples` có `xmax` nhỏ hơn ngưỡng giao dịch đang mở cũ nhất toàn hệ thống (`OldestXmin`). Chỉ cần 1 kết nối nằm ở trạng thái `idle in transaction` (hoặc Replication Slot có `hot_standby_feedback = on` bị kẹt câu truy vấn dài) suốt nhiều ngày, mọi phiên bản cũ của 800 lệnh `UPDATE`/giây đều bị giữ lại gây phình bảng nghiêm trọng — vì thế trên Production bắt buộc đặt `idle_in_transaction_session_timeout = '60s'`!",
        wrongReasons: [
          "`shared_buffers` là bộ nhớ đệm RAM chứa các trang 8KB nóng và hoàn toàn không ngăn cản tiến trình Vacuum đánh dấu tái sử dụng không gian của các dead tuples.",
          "",
          "PostgreSQL chỉ tạo một phiên bản tuple mới cho đúng dòng bị sửa (không phải nhân bản cả bảng), và không gian cũ sẽ được tái sử dụng bình thường nếu không bị chặn bởi `OldestXmin`.",
          "`fsync = on` chỉ đảm bảo độ bền vững khi ghi WAL và Checkpoint xuống đĩa, hoàn toàn tương thích và không hề khóa cơ chế dọn rác của Autovacuum."
        ]
      },
      {
        question: "Một kỹ sư Backend điều tra API lấy lịch sử giao dịch theo mã tham chiếu đối tác (`external_ref` kiểu `VARCHAR(64)`, đã đánh Index B-Tree `idx_ext_ref`). Trên môi trường Production có 90 triệu dòng, câu truy vấn truyền tham số từ JDBC bị chậm 6,5 giây và `EXPLAIN (ANALYZE, BUFFERS)` hiển thị `Parallel Seq Scan on transactions` kèm bộ lọc `Filter: ((external_ref)::numeric = $1)`. Cách khắc phục nào xử lý trúng đích và an toàn nhất?",
        options: [
          "Tăng số lượng luồng quét song song `max_parallel_workers_per_gather` từ 2 lên 16 để quét hết 90 triệu dòng nhanh hơn.",
          "Tắt cờ `enable_seqscan = off` trên toàn bộ máy chủ PostgreSQL Production để ép mọi câu lệnh phải dùng Index.",
          "Sửa kiểu dữ liệu tham số truyền từ tầng Java/JPA thành đúng kiểu `String` khớp hoàn toàn với cột `VARCHAR(64)` để bỏ phép ép kiểu ngầm `(external_ref)::numeric`, giúp PostgreSQL đi thẳng vào `Index Scan` trên `idx_ext_ref`.",
          "Chạy lệnh `TRUNCATE` bảng mỗi cuối tuần để giảm số lượng bản ghi cần quét tuần tự."
        ],
        answer: 2,
        explanation: "Khi ứng dụng truyền tham số kiểu số (`Long` / `BigDecimal`) để so sánh với cột `VARCHAR`, PostgreSQL buộc phải ép kiểu từng giá trị của cột sang `numeric` (`(external_ref)::numeric = $1`) vì một số giá trị như `'00123'` và `'123'` bằng nhau về mặt số học nhưng nằm ở hai vị trí khác nhau hoàn toàn trên cây B-Tree chữ cái! Truyền đúng kiểu `String` loại bỏ phép ép kiểu hàm lên cột, kích hoạt ngay `Index Scan` trong dưới 1ms.",
        wrongReasons: [
          "Tăng worker quét song song chỉ đốt hết CPU và băng thông đĩa của toàn máy chủ cho một câu lệnh đáng lẽ chỉ cần đọc 4 trang bộ nhớ qua Index.",
          "Đặt `enable_seqscan = off` trên Production là anti-pattern nguy hiểm làm méo mó kế hoạch của các câu báo cáo thực sự cần đọc phần lớn bảng, hơn nữa ép kiểu lệch loại dữ liệu thì B-Tree `VARCHAR` vẫn không thể dùng cho phép so sánh số học!",
          "",
          "Dữ liệu giao dịch ngân hàng bắt buộc lưu trữ toàn vẹn để tra cứu và phục vụ thanh tra, tuyệt đối không thể `TRUNCATE` xóa trắng bảng giao dịch gốc."
        ]
      }
    ]
  },

  D2: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Senior Core & Data)",
    codeLang: "sql",
    teacherIntro: "Chào em, sau khi đã hiểu nội tạng MVCC và WAL ở bài D1, hôm nay anh dẫn em tới bài toán quy mô lớn mà bất kỳ ngân hàng nào cán mốc vài triệu người dùng VietQR cũng đụng mặt: **Bảng bút toán sổ cái `ledger_entries` vượt ngưỡng 1,8 tỷ dòng (~1,4 TB dữ liệu)!** Anh từng trực tiếp giải cứu một hệ thống mà dù đã có Index trên `account_id`, cứ tới giờ ăn trưa người dân quét QR trả tiền cơm là ổ đĩa DB kêu rên ở mức 100% IOPS. Nguyên nhân kép nằm ở chỗ: thứ nhất, cây Index đơn lẻ của bảng 1,8 tỷ dòng đã phình lên 190 GB vượt xa bộ nhớ RAM 128 GB của máy chủ, cộng thêm mỗi lần lấy 30 dòng sao kê DB phải nhảy đĩa ngẫu nhiên 30 lần sang bảng chính (`Heap Fetch`); thứ hai, qua 4 năm làm dự án, cứ mỗi lần một màn hình báo cáo chậm là dev lại xin đánh thêm 1 cái Index mới — tổng cộng bảng gánh tới **11 cái Index**! Mỗi lệnh chuyển tiền ghi 2 dòng bút toán phải cập nhật 22 cây B-Tree làm tốc độ `INSERT` giảm mất 55%! Bài học này sẽ trao cho em bộ vũ khí tối thượng của Data Architect: Composite Covering Index (`INCLUDE`), Partial Index và Declarative Partitioning theo tháng.",
    analogy: {
      title: "Tờ mục lục có in sẵn số tiền & Kho lưu trữ chứng từ đóng thùng theo từng tháng",
      body: "Em hãy tưởng tượng phòng lưu trữ của ngân hàng có 1,8 tỷ tờ biên lai của suốt 5 năm. Nếu đóng tất cả vào một cuốn sổ dày bằng tòa nhà 10 tầng, mỗi lần lật tra cứu đều cực kỳ nặng nề. Thay vào đó, kế toán trưởng đóng riêng chứng từ của mỗi tháng vào một chiếc thùng gọn nhẹ dán nhãn `2026-11`, `2026-10`... (Range Partitioning): khách vào hỏi sao kê tháng 11 thì nhân viên chỉ mở đúng chiếc thùng tháng 11, bỏ qua hoàn toàn 59 thùng cũ! Đỉnh cao hơn nữa, ngay trên tờ giấy mục lục dán ở nắp thùng (Covering Index `INCLUDE`), kế toán ghi kèm luôn cột Số tiền và Số dư sau giao dịch — nhân viên nhìn mục lục đọc to kết quả cho khách ngay lập tức (`Index Only Scan`) mà không cần thò tay lục tìm từng tờ biên lai gốc bên dưới!"
    },
    objectives: [
      "Thiết kế chuẩn xác thứ tự cột trong B-Tree Composite Index theo quy tắc `ESR (Equality → Sort → Range)` và áp dụng Keyset Pagination (Seek Method) thay thế `OFFSET` lớn.",
      "Tận dụng tối đa Covering Index (`INCLUDE`) để đạt `Index Only Scan` (0 Heap Fetch) và Partial Index (`WHERE ...`) để cắt giảm 90–98% dung lượng RAM cho các hàng đợi trạng thái giao dịch.",
      "Kiến trúc bảng tỷ dòng bằng Declarative Monthly Range Partitioning trên PostgreSQL, đảm bảo 100% truy vấn kích hoạt `Partition Pruning` và thực thi lưu trữ lạnh tức thời bằng `DETACH PARTITION CONCURRENTLY`."
    ],
    flow: [
      {
        step: "1. Kiểm toán Mẫu Truy vấn & Cắt tỉa Index Thừa (Write Amplification Audit)",
        detail: "Liệt kê các câu truy vấn thực tế cùng tần suất đọc/ghi thông qua `pg_stat_user_indexes` (`idx_scan = 0`), mạnh dạn gỡ bỏ các Index trùng lặp tiền tố để giải phóng tốc độ `INSERT` bút toán giờ cao điểm."
      },
      {
        step: "2. Thiết kế Bảng Phân vùng Theo Tháng (Monthly Range Partitioning)",
        detail: "Chia bảng `ledger_entries` theo cột ngày hạch toán `booking_date`, đưa cột phân vùng vào khóa chính `(entry_id, booking_date)` để mỗi phân vùng tháng giữ kích thước gọn nhẹ nằm trọn trong bộ nhớ đệm `shared_buffers`."
      },
      {
        step: "3. Đánh Covering Index & Partial Index Tối ưu Chuyên biệt",
        detail: "Tạo Index `(account_id, booking_date DESC, entry_id DESC) INCLUDE (amount, balance_after, narrative)` phục vụ sao kê đọc thẳng từ lá Index, và đánh Partial Index siêu nhỏ riêng cho các giao dịch chờ đối soát."
      },
      {
        step: "4. Vận hành Partition Pruning & Quản trị Vòng đời Nóng - Lạnh",
        detail: "Bắt buộc mọi API tra cứu đính kèm cận thời gian `booking_date` để Planner bỏ qua các phân vùng cũ, đồng thời dùng Job tự động tạo trước phân vùng tháng mới và tách phân vùng quá hạn đưa sang kho lưu trữ lạnh."
      }
    ],
    sections: [
      {
        heading: "1. Quy tắc ESR trong B-Tree Composite Index, Write Amplification & Cái chết của OFFSET",
        paragraphs: [
          "Cây B-Tree (chính xác là biến thể B+Tree theo Lehman-Yao trong PostgreSQL) sắp xếp dữ liệu theo thứ tự từ điển từ cột trái sang cột phải. Đó là nguồn gốc của **Quy tắc Leftmost Prefix (Tiền tố Trái cùng)** và công thức xếp cột kinh điển **ESR (Equality → Sort → Range)**: các cột lọc dấu bằng tuyệt đối (`WHERE account_id = ?`) luôn phải đặt đứng đầu tiên bên trái để thu hẹp ngay phạm vi xuống một nhánh nhỏ; tiếp theo là cột dùng cho `ORDER BY` hoặc lọc khoảng (`booking_date DESC`) để các bản ghi thuộc cùng một tài khoản nằm liền kề nhau theo đúng chiều thời gian giảm dần mà không tốn một giọt CPU nào cho phép Sort! Ngược lại, nếu em đặt cột khoảng (`booking_date`) lên trước `account_id` trong Index `(booking_date, account_id)`, thì khi truy vấn khoảng 30 ngày của 1 khách hàng, cây Index bị đứt thứ tự ngay từ cột đầu tiên và phải quét lan man qua dữ liệu của hàng triệu khách hàng khác trong tháng đó!",
          "Bên cạnh chiều đọc, người kỹ sư Senior luôn tính chi phí chiều ghi (**Write Amplification**): trên bảng giao dịch tiếp nhận 3.000 bút toán/giây, mỗi Index phụ thêm buộc tiến trình DB phải tìm trang lá trên một cây B-Tree khác để chèn con trỏ mới, làm tăng nguy cơ chia tách trang (Page Split), tăng khóa Latch nội bộ và nhân lên gấp bội lượng dữ liệu WAL phải đồng bộ sang máy chủ dự phòng. Cuối cùng, khi phân trang sao kê cho khách hàng doanh nghiệp có 500.000 giao dịch/tháng, tuyệt đối **cấm dùng `LIMIT 20 OFFSET 200000`** — vì `OFFSET 200000` bắt DB phải lôi đủ 200.020 dòng lên đếm rồi vứt bỏ 200.000 dòng đầu! Hãy chuyển sang **Keyset / Cursor Pagination**: truyền cặp móc neo của dòng cuối trang trước `(booking_date, entry_id) < (:lastDate, :lastEntryId)` để nhảy thẳng một bước O(log N) vào đúng trang thứ 10.001 trong 0,3 mili-giây!"
        ],
        bullets: [
          "Một Index ghép thay thế nhiều Index lẻ: Index `(account_id, booking_date DESC)` đã bao hàm hoàn toàn khả năng tìm theo `account_id` đứng riêng — việc giữ thêm một Index đơn `(account_id)` nữa là lãng phí 100% dung lượng và I/O ghi!",
          "Kiểm tra Index vô dụng trên Production: Truy vấn bảng `pg_stat_user_indexes` trên cả Primary và Read Replicas; những Index không phải ràng buộc Unique mà có `idx_scan = 0` suốt 30 ngày cần lên kế hoạch gỡ bỏ.",
          "Không đánh B-Tree đơn thuần cho cột ít giá trị (Low Cardinality): Cột `direction` chỉ có 2 giá trị `'DEBIT'` / `'CREDIT'` hay `currency = 'VND'` chiếm 99% bảng — đánh B-Tree đơn lên đó không bao giờ được Planner chọn vì quét bảng còn rẻ hơn nhảy đĩa ngẫu nhiên.",
          "Keyset Pagination đảm bảo không nhảy dòng / lặp dòng: Ngay cả khi khách hàng vừa phát sinh thêm 3 giao dịch mới trong lúc đang vuốt xem trang 2 sao kê trên điện thoại, Keyset Cursor vẫn giữ danh sách liền mạch không bị xô lệch như `OFFSET`."
        ]
      },
      {
        heading: "2. Covering Index (INCLUDE) và Partial Index — Hai Tuyệt chiêu Tiết kiệm 90% Disk I/O",
        paragraphs: [
          "Hãy giải bài toán hóc búa sau: em đã có Index `(account_id, booking_date DESC)`, nhưng một khách hàng siêu thị có 50 giao dịch rải rác suốt 30 ngày qua (mỗi giao dịch nằm ở một trang 8KB khác nhau trên đĩa). Khi khách bấm xem 50 dòng sao kê gần nhất, DB đi trên cây Index chỉ tốn 2 trang đọc, nhưng lại phải thực hiện **50 cú nhảy ngẫu nhiên sang tệp bảng chính (Heap Table)** chỉ để lấy thêm 3 cột hiển thị lên màn hình App là `amount`, `balance_after` và `narrative`! Từ PostgreSQL 11+, mệnh đề **`INCLUDE (amount, balance_after, narrative)`** cho phép đính kèm các cột dữ liệu tải trọng này nằm gọn ở **tầng lá (Leaf Pages)** của cây Index mà hoàn toàn KHÔNG đưa chúng lên các nút nhánh định hướng bên trên (Non-leaf Branch Pages). Nhờ vậy, chiều cao cây B-Tree vẫn mỏng nhẹ như cũ, kích thước nút nhánh nhỏ gọn nằm trọn trong RAM, còn câu lệnh `SELECT` đọc xong tầng lá là có đủ 100% cột cần thiết trả về luôn qua cơ chế **`Index Only Scan`**!",
          "Vũ khí lợi hại thứ hai trong ngân hàng là **Partial Index (Index một phần có điều kiện `WHERE`)**. Hãy nhìn vào bảng `payment_orders` có 500 triệu đơn chuyển tiền: 99,95% số dòng mang trạng thái cuối `SUCCESS` hoặc `FAILED` không bao giờ cần quét lại theo trạng thái nữa; chỉ có khoảng 2.000 dòng đang nằm ở trạng thái trung gian `PENDING_NAPAS` hoặc `NEED_RECONCILIATION` cần Worker đối soát quét 10 giây một lần. Nếu em đánh Index thường trên `(status, created_at)`, cây Index sẽ chứa cả 500 triệu dòng nặng 18 GB! Nhưng nếu em viết: `CREATE INDEX idx_orders_pending ON payment_orders (created_at) WHERE status IN ('PENDING_NAPAS', 'NEED_RECONCILIATION');`, cây Index chỉ chứa đúng 2.000 dòng đang treo — dung lượng vỏn vẹn **128 KB**, nằm vĩnh viễn trong bộ đệm CPU và tự động xóa con trỏ ngay khoảnh khắc đơn hàng chuyển sang `SUCCESS`!"
        ],
        bullets: [
          "Tại sao dùng INCLUDE thay vì nhét hết cột vào khóa Index: Đưa `narrative` (mô tả giao dịch dài) vào phần khóa chính của Index vừa làm phình các nút nhánh trung gian, vừa tốn CPU so sánh chuỗi mỗi khi duyệt cây; để trong `INCLUDE` chỉ lưu trữ thuần túy ở tầng lá.",
          "Điều kiện để Index Only Scan đạt 0 Heap Fetches: Trang dữ liệu tương ứng phải được đánh dấu sạch (`all-visible`) trong tệp Visibility Map nhờ Autovacuum chạy đều đặn (trên bảng bút toán bất biến chỉ `INSERT` không `UPDATE`, `VACUUM` đánh dấu `all-visible` cực kỳ hiệu quả).",
          "Unique Partial Index bảo vệ nghiệp vụ ngân hàng: Ví dụ quy tắc 'Mỗi khách hàng CIF chỉ được phép có duy nhất 1 tài khoản mặc định nhận tiền QR đang hoạt động (`is_primary_qr = true AND status = ACTIVE`)' được khóa cứng ngay tầng DB bằng `CREATE UNIQUE INDEX ... ON accounts(cif) WHERE is_primary_qr = true AND status = 'ACTIVE'`!",
          "Đồng bộ điều kiện WHERE với Partial Index: Câu lệnh SQL trong Java/JPA bắt buộc phải chứa điều kiện khớp tập con với mệnh đề `WHERE` của Partial Index (tránh truyền tham số động kiểu `WHERE status = :param` nếu dùng Prepared Statement chung chung khiến Planner không dám chọn Partial Index ở lần lập kế hoạch tổng quát)."
        ]
      },
      {
        heading: "3. Declarative Partitioning Bảng Tỷ Dòng & Quản trị Vòng đời Chứng từ 10 Năm",
        paragraphs: [
          "Khi bảng `ledger_entries` vượt mốc 100–200 triệu dòng và tăng thêm 50 triệu dòng mỗi tháng, dù Index có khéo đến đâu thì việc duy trì một bảng vật lý khổng lồ duy nhất cũng làm chậm Autovacuum, kéo dài thời gian Reindex/Backup và làm phân mảnh bộ nhớ đệm `shared_buffers` (vì dữ liệu cũ 3 năm trước nằm trộn lẫn với dữ liệu nóng hôm nay). Giải pháp chuẩn mực của mọi Core Banking là **Declarative Range Partitioning theo thời gian hạch toán** (`PARTITION BY RANGE (booking_date)` chia theo từng tháng, ví dụ `ledger_entries_2026_11`). Khi đó, chỉ có phân vùng của tháng hiện tại và tháng liền trước (~40 GB) là dữ liệu nóng thường xuyên truy cập, nằm gọn gàng 100% trong RAM máy chủ! Có hai quy tắc kỹ thuật bắt buộc trên PostgreSQL: (1) Mọi ràng buộc `PRIMARY KEY` hoặc `UNIQUE` trên bảng phân vùng bắt buộc phải bao gồm cột phân vùng (ví dụ `PRIMARY KEY (entry_id, booking_date)`); (2) Mọi câu truy vấn từ ứng dụng Java (kể cả tìm theo `entry_id` hay `account_id`) **bắt buộc đính kèm điều kiện lọc trên `booking_date`** (ví dụ mặc định trên App hiển thị sao kê 30 ngày gần nhất) để kích hoạt **Partition Pruning** — giúp DB chỉ chạm vào đúng 1 phân vùng duy nhất thay vì quét xuyên cả 60 phân vùng!",
          "Lợi ích rực rỡ nhất của Partitioning tỏa sáng ở khâu **Lưu trữ dữ liệu lịch sử (Data Archiving & Retention)**: Theo quy định pháp luật kế toán - ngân hàng, chứng từ bút toán phải lưu trữ tối thiểu 10 năm, nhưng 99% truy vấn trực tuyến chỉ rơi vào 6 tháng gần nhất. Nếu không chia phân vùng, việc chạy câu lệnh `DELETE FROM ledger_entries WHERE booking_date < '2024-01-01'` xóa 300 triệu dòng sẽ khóa dòng hàng loạt, sinh ra hàng trăm GB WAL làm nghẹt thở đường truyền Replication và để lại một cái vỏ bảng rỗng đầy lỗ thủng Bloat! Với Partitioning, công việc cuối tháng của hệ thống tự động (qua extension `pg_partman` hoặc Cron Orchestrator) chỉ gói gọn trong lệnh siêu dữ liệu chạy mất vài chục mili-giây: tách rời phân vùng cũ ra khỏi bảng mẹ bằng `ALTER TABLE ledger_entries DETACH PARTITION ledger_entries_2024_01 CONCURRENTLY;`, xuất nén sang định dạng Parquet đẩy lên kho đối tượng S3/MinIO phục vụ kiểm toán hoặc gắn sang Cold Storage giá rẻ, rồi `DROP TABLE` phân vùng rời đó sạch sẽ không để lại một byte rác nào!"
        ],
        bullets: [
          "Luôn có giám sát tạo trước phân vùng tương lai (Pre-create Future Partitions): Tự động tạo sẵn tối thiểu 3–6 phân vùng của các tháng tới kèm cảnh báo nếu phân vùng `DEFAULT` có bản ghi lọt vào — tránh thảm họa đêm giao thừa 00:00 ngày 01 đầu tháng mới mọi giao dịch chuyển tiền bị lỗi vì chưa tạo bảng tháng mới!",
          "Cẩn trọng bẫy DEFAULT Partition làm kẹt ADD PARTITION: Nếu có dữ liệu lỡ chui vào phân vùng `DEFAULT`, lệnh thêm phân vùng mới sau này sẽ phải quét khóa toàn bộ `DEFAULT` để kiểm tra xung đột dải ngày.",
          "Tránh Chia quá vụn (Over-partitioning): Đừng chia Partition theo từng giờ hoặc tạo tới 5.000 phân vùng con trên cùng 1 bảng trong PostgreSQL vì chi phí bộ nhớ Catalog và thời gian lập kế hoạch (Planning Time) của mỗi câu SQL sẽ tăng vọt đáng kể; mốc 36–120 phân vùng theo tháng/tuần là điểm ngọt lý tưởng.",
          "Kết hợp BRIN Index cho cột thời gian trên kho lưu trữ: Với các phân vùng lịch sử chỉ đọc có dữ liệu được chèn tuần tự theo thời gian, một Block Range Index (`USING BRIN`) trên `created_at` chỉ tốn vài chục KB thay vì hàng GB của B-Tree!"
        ]
      }
    ],
    comparison: {
      title: "Bảng Chọn Chiến lược Index & Phân vùng cho Hệ thống Dữ liệu Ngân hàng",
      headers: ["Chiến lược Kỹ thuật", "Bài toán Giải quyết Tối ưu nhất", "Đánh đổi Dung lượng & Tốc độ Ghi", "Ứng dụng Chuẩn trong Core Banking"],
      rows: [
        [
          "Composite B-Tree Index (Quy tắc ESR)",
          "Truy vấn lọc chính xác theo khóa kết hợp lọc khoảng và sắp xếp không tốn phép `Sort`.",
          "Tốn dung lượng trung bình; mỗi Index thêm vào làm tăng chi phí `INSERT` và lượng WAL.",
          "`(account_id, booking_date DESC, entry_id DESC)` cho phân trang Keyset lịch sử giao dịch."
        ],
        [
          "Covering Index (Mệnh đề INCLUDE)",
          "Triệt tiêu hoàn toàn thao tác nhảy đĩa ngẫu nhiên sang bảng chính (`Heap Fetches = 0`).",
          "Tầng lá dày hơn đôi chút do mang theo cột phụ, nhưng các tầng nhánh trên vẫn giữ nguyên độ gọn.",
          "Đính kèm `INCLUDE (amount, currency, balance_after)` cho API hiển thị danh sách sao kê nhanh."
        ],
        [
          "Partial Index (Mệnh đề WHERE)",
          "Tăng tốc truy vấn các bản ghi thuộc tập con rất nhỏ (trạng thái treo/lỗi) trên bảng hàng trăm triệu dòng.",
          "Dung lượng siêu nhỏ (< 1% Index thường) và hầu như không tốn phí cập nhật khi bản ghi ở trạng thái hoàn tất.",
          "`WHERE status IN ('PENDING', 'SUSPENSE')` cho Worker đối soát tự động và Retry chuyển mạch."
        ],
        [
          "Monthly Range Partitioning",
          "Giữ kích thước bảng nóng vừa khít RAM, cô lập bảo trì và gỡ lưu trữ dữ liệu cũ không gây Bloat.",
          "Bắt buộc khóa chính phải chứa cột phân vùng và mọi câu truy vấn cần truyền cận thời gian để Pruning.",
          "Chia bảng `ledger_entries`, `audit_trails`, `iso8583_messages` theo tháng hạch toán `booking_date`."
        ]
      ]
    },
    codeTitle: "Thiết kế Bảng Sổ cái Phân vùng Theo Tháng, Covering Index, Partial Index & Keyset Pagination",
    code: [
      "-- 1. Khởi tạo bảng sổ cái tỷ dòng chia phân vùng theo tháng (Monthly Range Partitioning)",
      "CREATE TABLE ledger_entries (",
      "    entry_id       BIGINT GENERATED ALWAYS AS IDENTITY,",
      "    booking_date   DATE           NOT NULL,",
      "    account_id     BIGINT         NOT NULL,",
      "    journal_id     UUID           NOT NULL,",
      "    direction      CHAR(1)        NOT NULL CHECK (direction IN ('D', 'C')),",
      "    amount         NUMERIC(19, 0) NOT NULL CHECK (amount > 0),",
      "    balance_after  NUMERIC(19, 0) NOT NULL,",
      "    recon_status   VARCHAR(16)    NOT NULL DEFAULT 'MATCHED',",
      "    narrative      VARCHAR(140)   NOT NULL,",
      "    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),",
      "    PRIMARY KEY (entry_id, booking_date) -- Bắt buộc chứa cột khóa phân vùng booking_date!",
      ") PARTITION BY RANGE (booking_date);",
      "",
      "-- 2. Tạo phân vùng tháng hiện tại, tháng kế tiếp và phân vùng dự phòng an toàn",
      "CREATE TABLE ledger_entries_2026_11 PARTITION OF ledger_entries",
      "    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');",
      "CREATE TABLE ledger_entries_2026_12 PARTITION OF ledger_entries",
      "    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');",
      "CREATE TABLE ledger_entries_default PARTITION OF ledger_entries DEFAULT;",
      "",
      "-- 3. Covering Index chuẩn ESR + INCLUDE giúp sao kê đạt Index Only Scan (0 Heap Fetch)",
      "CREATE INDEX idx_ledger_stmt_covering ON ledger_entries (account_id, booking_date DESC, entry_id DESC)",
      "    INCLUDE (direction, amount, balance_after, narrative);",
      "",
      "-- 4. Partial Index siêu nhẹ (< 1MB) chỉ đánh cho các bút toán treo chờ đối soát T+0",
      "CREATE INDEX idx_ledger_unmatched_recon ON ledger_entries (booking_date, created_at)",
      "    WHERE recon_status = 'SUSPENSE';",
      "",
      "-- 5. Truy vấn phân trang Keyset (Seek Method) kích hoạt đồng thời Partition Pruning + Index Only Scan",
      "SELECT entry_id, booking_date, direction, amount, balance_after, narrative",
      "FROM ledger_entries",
      "WHERE account_id = 1000892341",
      "  AND booking_date >= DATE '2026-11-01' AND booking_date < DATE '2026-12-01'",
      "  AND (booking_date, entry_id) < (DATE '2026-11-24', 984512009) -- Con trỏ dòng cuối trang trước",
      "ORDER BY booking_date DESC, entry_id DESC",
      "LIMIT 20;"
    ].join("\n"),
    codeNotes: [
      "Kiểu dữ liệu tiền tệ VNĐ chuẩn NUMERIC(19, 0) / NUMERIC(19, 4): Tuyệt đối không dùng `FLOAT` hay `DOUBLE PRECISION` trong SQL cho cột tiền; với VNĐ không có xu lẻ có thể dùng `NUMERIC(19, 0)` hoặc `BIGINT`, còn đa tiền tệ quốc tế dùng `NUMERIC(19, 4)` ánh xạ thẳng sang `java.math.BigDecimal`.",
      "Cấu trúc khóa (account_id, booking_date DESC, entry_id DESC): Đưa thêm `entry_id DESC` làm khóa phân định thứ tự (Tie-breaker) khi có nhiều bút toán phát sinh trong cùng một ngày giúp con trỏ Row-Value `(booking_date, entry_id) < (...)` nhảy chính xác tuyệt đối không bao giờ bỏ sót hay lặp lại bất kỳ dòng nào.",
      "Sức mạnh kép Partition Pruning + Index Only Scan ở câu số 5: Mệnh đề `booking_date >= '2026-11-01' AND booking_date < '2026-12-01'` giúp PostgreSQL cắt bỏ toàn bộ các bảng phân vùng khác, chỉ đọc đúng `ledger_entries_2026_11`, và vì cả 6 cột `SELECT` đều nằm trong khóa hoặc phần `INCLUDE`, DB trả kết quả ngay từ tầng lá Index!",
      "Tách lưu trữ không khóa bảng: Khi phân vùng cũ hết hạn giữ nóng, DBA chỉ cần chạy `ALTER TABLE ledger_entries DETACH PARTITION ledger_entries_2024_01 CONCURRENTLY;` hoàn toàn không chặn giao dịch ghi đang chảy ở tháng hiện tại."
    ],
    labGuide: {
      goal: "Thực hành thiết kế bảng `ledger_entries` phân vùng theo 6 tháng trên PostgreSQL 16, kiểm chứng cơ chế Partition Pruning và đo lường tốc độ vượt trội của Keyset Pagination + Covering Index so với `OFFSET` truyền thống.",
      steps: [
        "Bước 1: Chạy script tạo bảng phân vùng `ledger_entries` gồm 6 phân vùng tháng (`2026_07` đến `2026_12`), chèn 1,2 triệu dòng bút toán giả lập (trong đó chỉ có 500 dòng mang `recon_status = 'SUSPENSE'`).",
        "Bước 2: Tạo `idx_ledger_stmt_covering` (có `INCLUDE`) và `idx_ledger_unmatched_recon` (Partial Index); dùng hàm `pg_size_pretty(pg_relation_size(...))` so sánh dung lượng của Partial Index (~32 KB) so với Index đầy đủ (~28 MB).",
        "Bước 3: Chạy `VACUUM ANALYZE ledger_entries;` rồi thực thi `EXPLAIN (ANALYZE, BUFFERS)` cho câu truy vấn sao kê có và không có điều kiện lọc `booking_date` để thấy sự khác biệt giữa việc chỉ chạm 1 phân vùng (`Subplans Removed: 5`) so với quét cả 6 phân vùng.",
        "Bước 4: Đẩy 100.000 giao dịch cho 1 tài khoản doanh nghiệp lớn, đo thời gian lấy trang thứ 4.000 bằng `OFFSET 80000 LIMIT 20` (~45ms, đọc hàng vạn buffers) so với Keyset Cursor `(booking_date, entry_id) < (...)` (~0.15ms, đọc đúng 4 buffers, `Heap Fetches: 0`)."
      ],
      expectedOutput: "Log thực nghiệm chứng minh `Index Only Scan on ledger_entries_2026_11` với `Heap Fetches: 0`, các phân vùng tháng khác không xuất hiện trong kế hoạch thực thi, và dung lượng Partial Index nhỏ hơn ít nhất 500 lần so với Index toàn bảng."
    },
    examTips: [
      "Mẹo phỏng vấn Senior #1 (Câu bẫy Primary Key trên bảng Partitioned): Nếu người phỏng vấn hỏi 'Anh muốn giữ `entry_id UUID PRIMARY KEY` đơn lẻ trên bảng `ledger_entries` được chia Partition theo `booking_date` có được không?', hãy trả lời dứt khoát: KHÔNG! PostgreSQL bắt buộc mọi ràng buộc Unique/Primary Key toàn cục phải chứa cột Partition Key `(entry_id, booking_date)` vì tính duy nhất chỉ được kiểm tra cục bộ bên trong từng phân vùng độc lập!",
      "Mẹo phỏng vấn Senior #2 (Tại sao đã Partition bảng mà truy vấn theo ID lại chậm hơn trước?): Nếu ứng dụng chạy `SELECT * FROM ledger_entries WHERE entry_id = :id` mà QUÊN truyền kèm khoảng `booking_date`, DB không biết dòng đó nằm ở tháng nào nên phải mở khóa và tìm kiếm trên tất cả 60 phân vùng con cùng lúc! Giải pháp là mã hóa mốc thời gian ngay trong mã giao dịch/Snowflake ID hoặc luôn truyền kèm ngày giao dịch.",
      "Nhận diện bài toán đánh đổi Đọc vs Ghi: Khi đề bài nêu triệu chứng 'Các câu SELECT chạy rất nhanh nhưng giờ cao điểm lệnh INSERT bị nghẽn I/O và WAL tăng đột biến', hãy nghĩ ngay tới việc rà soát gỡ bỏ các Index thừa/trùng tiền tố (Over-indexing)."
    ],
    summaryTakeaways: [
      "Sắp xếp cột trong Composite B-Tree Index theo đúng thứ tự `Equality (=) → Sort/Range (ORDER BY, >=, <)` để vừa lọc thu hẹp nhánh vừa triệt tiêu phép sắp xếp tốn kém.",
      "Dùng mệnh đề `INCLUDE` biến Index thường thành Covering Index đạt `Index Only Scan`, và dùng Partial Index (`WHERE`) cho các tập trạng thái nhỏ chờ xử lý.",
      "Thay thế hoàn toàn phân trang `OFFSET` lớn bằng Keyset / Seek Pagination trên các API lịch sử giao dịch và sao kê ngân hàng.",
      "Declarative Range Partitioning theo tháng giữ dữ liệu nóng gọn trong RAM và cho phép gỡ lưu trữ lịch sử 10 năm bằng `DETACH PARTITION CONCURRENTLY` mà không sinh rác Bloat."
    ],
    lessonQuestions: [
      {
        question: "Bảng `payment_transactions` của ngân hàng có 400 triệu bản ghi với cột `status` phân bổ như sau: 99,9% là `'SUCCESS'` hoặc `'FAILED'`, chỉ có 0,1% là `'RETRY_PENDING'`. Một tiến trình nền Spring Scheduler chạy mỗi 5 giây thực hiện câu truy vấn: `SELECT id, payload FROM payment_transactions WHERE status = 'RETRY_PENDING' ORDER BY next_retry_at ASC LIMIT 100`. Giải pháp đánh Index nào tối ưu nhất về cả tốc độ đọc, dung lượng RAM lẫn tốc độ `INSERT` giao dịch mới?",
        options: [
          "Đánh B-Tree Index đơn trên cột `(status)` và một B-Tree Index đơn khác trên cột `(next_retry_at)`.",
          "Đánh Partial Index: `CREATE INDEX idx_txn_retry_queue ON payment_transactions (next_retry_at ASC) WHERE status = 'RETRY_PENDING';`.",
          "Đánh Hash Index trên cột `(payload)` kết hợp tăng `work_mem` lên 2 GB cho toàn bộ kết nối.",
          "Đánh Full Composite Index trên toàn bộ bảng `(status, next_retry_at, id, payload)` cho tất cả 400 triệu dòng."
        ],
        answer: 1,
        explanation: "Partial Index với điều kiện `WHERE status = 'RETRY_PENDING'` chỉ lập chỉ mục cho đúng 0,1% bản ghi đang chờ thử lại, sắp xếp sẵn theo `next_retry_at ASC`. Nhờ đó kích thước Index giảm đi gần 1.000 lần (chỉ vài chục MB nằm gọn trong RAM), câu lệnh `LIMIT 100` đọc thẳng 100 mục đầu tiên mà không cần Sort, và 99,9% các giao dịch hoàn tất thông thường không làm phình cây Index này!",
        wrongReasons: [
          "Hai Index đơn rời rạc khiến DB phải quét hoặc gộp Bitmap rất tốn kém và vẫn phải gánh chi phí cập nhật Index cho toàn bộ 400 triệu dòng `'SUCCESS'`.",
          "",
          "Hash Index trên `payload` hoàn toàn không hỗ trợ lọc `status` hay sắp xếp `next_retry_at`, còn đặt `work_mem = 2GB` toàn cục trên hệ thống đông kết nối sẽ gây nổ tràn RAM (`Out Of Memory`) máy chủ DB!",
          "Nhồi toàn bộ cột `payload` lớn và 99,9% dòng hoàn tất vào cây B-Tree toàn cục làm phình Index lên hàng chục GB và kéo tụt nghiêm trọng hiệu năng `INSERT/UPDATE`."
        ]
      },
      {
        question: "Đội ngũ Data Architect chuyển đổi bảng `ledger_entries` (1,2 tỷ dòng) sang Declarative Partitioning theo tháng dựa trên cột `booking_date` (gồm 48 phân vùng cho 4 năm). Tuy nhiên, sau khi go-live, API xem chi tiết biên lai đơn lẻ `SELECT * FROM ledger_entries WHERE txn_ref = :ref` lại bị tăng độ trễ gấp 12 lần và tăng số lượng khóa `AccessShareLock` trên mỗi câu truy vấn từ 1 lên 49! Đâu là nguyên nhân và hướng xử lý chuẩn xác?",
        options: [
          "Do PostgreSQL không cho phép đánh Index trên bảng Partitioned nên câu lệnh bị ép chạy Seq Scan.",
          "Vì câu truy vấn chỉ lọc theo `txn_ref` mà thiếu điều kiện trên cột khóa phân vùng `booking_date`, khiến cơ chế Partition Pruning không thể kích hoạt và buộc DB phải mở khóa + tìm kiếm Index trên toàn bộ 48 phân vùng tháng! Cần đính kèm ngày giao dịch (truyền từ UI hoặc trích xuất từ cấu trúc mã `txn_ref` có nhúng `yyyyMMdd`) vào mệnh đề `WHERE booking_date = ...`.",
          "Do chia theo tháng là quá ít phân vùng; cần chia nhỏ tiếp thành 1.460 phân vùng theo từng ngày để giảm số khóa.",
          "Cần gộp ngược 48 phân vùng trở lại thành 1 bảng duy nhất và chuyển sang dùng `OFFSET`."
        ],
        answer: 1,
        explanation: "Khi truy vấn bảng Partitioned mà không cung cấp điều kiện thu hẹp cột khóa phân vùng (`booking_date`), bộ lập kế hoạch không thể loại trừ bất kỳ phân vùng nào (No Partition Pruning), dẫn tới việc phải khóa đọc bảng mẹ + toàn bộ 48 bảng con và tra cứu 48 cây B-Tree cục bộ! Trong ngân hàng, mã tham chiếu giao dịch chuẩn luôn nhúng ngày hạch toán (ví dụ `FT20261124...`), cho phép tầng Service tự trích xuất `booking_date = '2026-11-24'` gắn vào câu SQL để chạm đúng 1 phân vùng duy nhất.",
        wrongReasons: [
          "PostgreSQL hoàn toàn hỗ trợ tạo Index tự động lan truyền xuống mọi phân vùng con (Partitioned Index) từ phiên bản 11 trở lên.",
          "",
          "Chia thành 1.460 phân vùng ngày mà vẫn thiếu điều kiện lọc `booking_date` sẽ càng làm thảm họa tồi tệ hơn gấp 30 lần (phải mở khóa 1.461 bảng cho 1 câu truy vấn!).",
          "Quay lại bảng đơn 1,2 tỷ dòng đánh mất toàn bộ lợi thế cô lập RAM và lưu trữ lạnh trong khi cách sửa chỉ đơn giản là truyền kèm khóa phân vùng sẵn có."
        ]
      }
    ]
  },

  D3: {
    duration: "65 phút",
    difficulty: "Sống còn (Critical Core Banking)",
    codeLang: "java",
    teacherIntro: "Chào em, đây là bài giảng mà anh luôn dặn mọi lứa kỹ sư trong team Core Banking phải in ra dán ngay cạnh màn hình làm việc: **Chống Trừ Tiền Âm & Deadlock!** Anh kể em nghe một vụ tấn công có thật từng làm rúng động giới Ví điện tử & Fintech vài năm trước: Kẻ gian mở một tài khoản, nạp vào đúng 10 triệu đồng thật. Sau đó hắn dùng công cụ bắn 60 HTTP Request rút 10 triệu về tài khoản ngân hàng khác đồng thời trong cùng 1 mili-giây (sử dụng kỹ thuật *Single-Packet Attack* gom các frame HTTP/2 đến Server đúng một tích tắc!). Vì lập trình viên viết code ngây thơ kiểu: đọc `Account` lên -> kiểm tra `if (acc.getBalance().compareTo(amount) >= 0)` trong Java -> gán `acc.setBalance(balance.subtract(amount))` bên trong `@Transactional` mặc định mà không khóa dòng CSDL, cả 12 luồng đầu tiên đều đọc thấy số dư 10 triệu, cùng vượt qua câu `if` và nhả ra 120 triệu đồng tiền thật! Đau đớn chưa dừng lại: ngay sáng hôm sau dev hoảng hốt gắn `SELECT FOR UPDATE` bừa bãi vào hàm chuyển khoản nội bộ, thì tới 10h00 sáng hệ thống nổ hàng loạt lỗi `PSQLException: deadlock detected` khi hai tài khoản đối tác doanh nghiệp chuyển tiền chéo A → B và B → A cùng lúc! Hôm nay thầy trò mình sẽ giải quyết tận gốc cả hai cơn ác mộng này.",
    analogy: {
      title: "Hai thẻ phụ rút tiền cùng một giây & Luật nhường đường qua cây cầu một làn",
      body: "Em hãy tưởng tượng hai người cầm hai chiếc thẻ ATM phụ của chung một tài khoản chỉ còn đúng 5 triệu đồng, đứng trước hai cây ATM sát vách và bấm nút Rút 5 triệu vào đúng tích tắc 10:00:00.000. Nếu mỗi cây ATM chỉ hỏi tổng đài 'Tài khoản còn đủ 5 triệu không?' (cả hai cùng nhận câu trả lời 'Còn!'), rồi cả hai tự tính `5 triệu - 5 triệu = 0` ghi đè vào sổ (Lost Update), thì hai cây ATM sẽ nhả ra tổng cộng 10 triệu đồng! Muốn an toàn tuyệt đối, ngay lúc cây ATM thứ nhất chạm vào tài khoản đó để kiểm tra, sổ cái của tài khoản đó phải được khóa chốt lại (Pessimistic Lock) bắt cây ATM thứ hai đứng chờ 3 mili-giây cho đến khi cây thứ nhất trừ xong về 0 đồng! Còn Deadlock giống hệt hai xe tải đi ngược chiều trên cây cầu hẹp gồm Chốt #1 và Chốt #2: Xe A giữ Chốt #1 đòi Chốt #2, Xe B giữ Chốt #2 đòi Chốt #1 — đứng nhìn nhau vĩnh viễn! Nhưng nếu đặt biển luật sắt: 'Bất kể đi hướng nào, ai cần dùng cả hai chốt đều BẮT BUỘC phải xin thẻ Chốt #1 (số nhỏ hơn) trước rồi mới xin Chốt #2', thì không bao giờ tồn tại cảnh kẹt cứng trên cầu!"
    },
    objectives: [
      "Giải thích rõ tại sao `@Transactional` ở mức cô lập mặc định `READ COMMITTED` hoàn toàn KHÔNG ngăn được lỗi Lost Update / Trừ tiền âm (Check-Then-Act Race Condition) và hiện tượng Write Skew.",
      "Phân định rạch ròi khi nào dùng Optimistic Locking (`@Version`), Pessimistic Locking (`SELECT ... FOR UPDATE`), hoặc Atomic Conditional `UPDATE`, kèm cấu hình `lock.timeout` chống treo dây chuyền.",
      "Cài đặt thành thạo thuật toán **Consistent Lock Ordering (Khóa theo thứ tự ID tăng dần)** trong dịch vụ chuyển tiền Java Spring Boot để triệt tiêu 100% khả năng xảy ra Deadlock vòng tròn."
    ],
    flow: [
      {
        step: "1. Chặn Giao dịch Tự chuyển & Chuẩn hóa Thứ tự Khóa (Lock Ordering)",
        detail: "Kiểm tra `fromAccountId != toAccountId`, sau đó so sánh hai định danh để xác định `firstLockId = min(fromId, toId)` và `secondLockId = max(fromId, toId)` bất kể chiều tiền chảy là A → B hay B → A."
      },
      {
        step: "2. Chiếm Khóa Dòng Bi quan Có Giới hạn Chờ (SELECT FOR UPDATE + Timeout)",
        detail: "Thực thi khóa độc quyền cấp dòng theo đúng thứ tự `firstLockId` rồi tới `secondLockId` (hoặc truy vấn `WHERE id IN (...) ORDER BY id ASC FOR UPDATE`) với `lock.timeout = 3000ms` để luồng sau luôn đọc dữ liệu mới nhất đã commit."
      },
      {
        step: "3. Kiểm chứng Bất biến Nghiệp vụ trong Vùng Khóa (Domain Invariants)",
        detail: "Sau khi đã giữ khóa dòng an toàn, kiểm tra trạng thái tài khoản (`ACTIVE`), loại tiền tệ khớp nhau và số dư khả dụng `fromAccount.getBalance().compareTo(amount) >= 0` bằng `BigDecimal`."
      },
      {
        step: "4. Hạch toán Sổ cái Kép & Giải phóng Khóa Nhanh (< 5ms)",
        detail: "Trừ số dư người gửi, cộng số dư người nhận, chèn cặp bút toán Nợ/Có cân bằng + sự kiện Outbox rồi kết thúc `@Transactional` ngay lập tức (tuyệt đối không gọi API mạng bên trong!)."
      }
    ],
    sections: [
      {
        heading: "1. Ngộ nhận Chết người về @Transactional mặc định và Lỗ hổng Check-Then-Act",
        paragraphs: [
          "Rất nhiều ứng viên đi phỏng vấn Senior khi anh đưa đoạn code chuyển tiền gắn `@Transactional` lên đầu hàm đều gật gù bảo: 'Có `@Transactional` rồi nên các luồng sẽ chạy tuần tự an toàn ạ!'. Đó là ngộ nhận nguy hiểm bậc nhất làm mất tiền thật của ngân hàng! `@Transactional` mặc định sử dụng mức cô lập mặc định của CSDL — trên cả PostgreSQL, Oracle và SQL Server đều là **`READ COMMITTED`**. Ở mức `READ COMMITTED`, câu lệnh `accountRepository.findById(id)` sinh ra câu `SELECT` thường hoàn toàn KHÔNG đặt khóa chặn các luồng khác đọc cùng dòng đó! Khi 10 request rút 10 triệu ập vào cùng tích tắc trên tài khoản có 10 triệu: cả 10 luồng cùng chạy `SELECT` thấy `balance = 10.000.000` trong bộ nhớ Heap của Java, cả 10 luồng cùng vượt qua câu lệnh `if (balance.compareTo(amount) >= 0)` một cách hợp lệ, và khi Hibernate đẩy câu lệnh `UPDATE accounts SET balance = 0 WHERE id = ?` xuống DB, cả 10 lệnh đều thành công êm ru (hiện tượng **Lost Update** kinh điển) — khách rút được 100 triệu mà số dư cuối vẫn đẹp đẽ bằng 0!",
          "Thế nếu em nâng mức cô lập lên `@Transactional(isolation = Isolation.REPEATABLE_READ)` hoặc `SERIALIZABLE` thì sao? Trên PostgreSQL, `REPEATABLE_READ` dùng cơ chế Snapshot Isolation sẽ phát hiện dòng dữ liệu đã bị luồng khác sửa trước khi kịp ghi đè và ném ra ngoại lệ `CannotSerializeTransactionException (SQLSTATE 40001)` đối với 9 luồng đến sau (chống được Lost Update trên cùng 1 dòng, nhưng đổi lại ứng dụng của em phải tự viết vòng lặp `@Retryable` mở lại giao dịch mới từ đầu!). Chưa kể, riêng `REPEATABLE_READ` trên MySQL InnoDB nếu đọc bằng `SELECT` thường rồi cập nhật đè giá trị tính sẵn từ Java vẫn dính Lost Update như thường, và trên PostgreSQL vẫn có thể dính lỗi **Write Skew** khi quy tắc kiểm tra nằm vắt ngang 2 dòng khác nhau (ví dụ: tổng thấu chi của 2 tài khoản con không quá 50 triệu — Luồng 1 sửa dòng A, Luồng 2 sửa dòng B, không đụng chung dòng nên cả hai cùng lọt!). Vì vậy, với giao dịch tiền tệ cốt lõi, ta không bao giờ phó mặc cho câu `SELECT` trần!"
        ],
        bullets: [
          "Nguyên tắc bất khả xâm phạm #1: Kiểm tra số dư (`if balance >= amount`) trong tầng Java chỉ có giá trị khi và chỉ khi dòng tài khoản đó đang được giữ khóa `FOR UPDATE` hoặc câu lệnh `UPDATE` dưới DB mang điều kiện kiểm tra nguyên tử.",
          "Atomic Conditional UPDATE cho trường hợp trừ 1 tài khoản đơn: Với ví đơn lẻ chỉ trừ tiền, câu SQL `UPDATE wallets SET balance = balance - :amt WHERE id = :id AND balance >= :amt` là nguyên tử tuyệt đối ngay ở mức `READ COMMITTED` (DB tự khóa dòng lúc chạy lệnh `UPDATE`, đánh giá lại `balance >= :amt` trên bản ghi mới nhất và trả về `updatedRows = 0` nếu không đủ tiền!).",
          "Tại sao chuyển khoản 2 tài khoản vẫn ưu tiên SELECT FOR UPDATE: Khi chuyển tiền từ A sang B, ta cần khóa cả A và B để kiểm tra trạng thái hoạt động (không bị phong tỏa pháp lý lúc vừa nhận tiền), lấy đúng `balance_before` và `balance_after` của cả hai bên để ghi vào bảng bút toán sổ cái `ledger_entries`.",
          "Hiện tượng Phantom Read vs Lost Update: Đừng nhầm lẫn lý thuyết sách giáo khoa; thứ giết chết hệ thống thanh toán thực tế 99% là Lost Update do đọc không khóa rồi ghi đè giá trị tính trong bộ nhớ ứng dụng."
        ]
      },
      {
        heading: "2. Optimistic Locking (@Version) vs Pessimistic Locking (SELECT FOR UPDATE): Chọn sao cho chuẩn?",
        paragraphs: [
          "**Optimistic Locking (Khóa lạc quan với `@Version`)** hoạt động dựa trên giả định ít khi có xung đột: ta thêm cột `version BIGINT NOT NULL DEFAULT 0` vào Entity `Account`. Khi đọc lên `version = 5`, lúc lưu xuống Hibernate tự động gắn điều kiện `UPDATE accounts SET balance = ?, version = 6 WHERE id = ? AND version = 5`. Nếu có một luồng nhanh tay hơn đã nâng `version` lên 6 mất rồi, câu lệnh cập nhật trả về `0 rows affected`, JPA lập tức ném `OptimisticLockLockingFailureException` và rollback giao dịch! Khóa lạc quan cực kỳ xuất sắc cho các nghiệp vụ ít đụng độ hoặc có bước người dùng suy nghĩ trên màn hình (như duyệt hồ sơ khoản vay tại quầy, sửa biểu phí cấu hình) vì nó không giữ khóa DB trong lúc chờ. Nhưng hãy tưởng tượng áp dụng `@Version` cho **Tài khoản Nóng (Hot Account)** như tài khoản thu hộ tiền điện EVN hoặc tài khoản quỹ cứu trợ có 300 người chuyển tiền vào mỗi giây: trong 300 luồng chạm vào cùng lúc, chỉ **1 luồng thành công, còn 299 luồng bị nổ Exception và phải rollback chạy lại!** Nếu gắn thêm `@Retryable` cho 299 luồng đó quay lại đập tiếp, em vừa tự tạo ra một cơn bão DDoS nội bộ đốt cháy sạch CPU của cả App lẫn DB!",
          "**Pessimistic Locking (Khóa bi quan với `SELECT ... FOR UPDATE`)** đi theo triết lý ngân hàng thực dụng: ngay khoảnh khắc đọc tài khoản lên để hạch toán, DB đặt khóa độc quyền cấp dòng (`Row-level Exclusive Lock` — chỉ khóa đúng dòng `account_id = 100`, hoàn toàn KHÔNG khóa các khách hàng khác trên bảng!). Nếu có 20 giao dịch cùng chuyển vào hoặc rút ra khỏi tài khoản 100 trong cùng mili-giây, 19 luồng đến sau sẽ xếp hàng trật tự ngay trong hàng đợi khóa siêu nhanh của nhân CSDL; luồng 1 chạy xong trong 2ms `COMMIT` nhả khóa -> luồng 2 lập tức đọc được số dư mới nhất vừa cập nhật và chạy tiếp trong 2ms -> tổng cộng cả 20 luồng đều hoàn tất thành công mượt mà trong 40ms mà không luồng nào bị văng lỗi bắt khách hàng bấm lại! Điều kiện tiên quyết để dùng `SELECT FOR UPDATE` an toàn trên Production là **giữ phạm vi giao dịch siêu mỏng (< 5–10ms)** và **luôn đặt thời gian chờ khóa tối đa (`lock_timeout = 3000ms`)** để lỡ có sự cố kẹt dòng thì hủy nhanh (Fail-fast) chứ không treo hết toàn bộ HikariCP Thread Pool!"
        ],
        bullets: [
          "Khi nào chọn Optimistic Lock (@Version): Cập nhật thông tin hồ sơ khách hàng (CIF), phê duyệt chứng từ Back-office (Maker-Checker), hoặc ví cá nhân tần suất cực thấp có xử lý Retry nhẹ nhàng.",
          "Khi nào chọn Pessimistic Lock (SELECT FOR UPDATE): Hạch toán chuyển tiền Core Ledger giữa các tài khoản, gạch nợ hóa đơn, khoanh giữ số dư khả dụng (Hold Balance) nơi yêu cầu tỷ lệ thành công ngay lần đầu cao nhất.",
          "Biến thể FOR UPDATE NOWAIT & SKIP LOCKED: Dùng `NOWAIT` khi muốn báo lỗi ngay lập tức nếu tài khoản đang có giao dịch khác xử lý (chống spam đồng thời từ cùng 1 khách); dùng `FOR UPDATE SKIP LOCKED` khi xây dựng bảng hàng đợi `outbox_events` có nhiều Pod Worker cùng bốc việc mà không dẫm chân lên nhau!",
          "Giới hạn vật lý của Pessimistic Lock trên Mega-Hot Account: Một dòng dữ liệu đơn lẻ dù nhanh chỉ khoảng 2ms/lần khóa cũng có trần vật lý ~500 TPS tuần tự; nếu tài khoản từ thiện cần chịu 10.000 TPS, ta phải nâng cấp lên kiến trúc **Sub-account Bucketing (Chia 32–64 ví phụ cộng dồn)** sẽ học sâu ở Học phần A!"
        ]
      },
      {
        heading: "3. Giải phẫu Deadlock Chuyển tiền Chéo (A ↔ B) & Định lý Khóa Theo Thứ Tự Tăng Dần",
        paragraphs: [
          "Hãy nhìn vào tai nạn kinh điển nhất khi viết hàm `transfer(fromId, toId, amount)` dùng `SELECT FOR UPDATE`: nếu em luôn khóa `fromId` trước rồi khóa `toId` sau theo đúng thứ tự tham số truyền vào, chuyện gì xảy ra lúc 09:30 sáng khi Công ty A (`id = 101`) chuyển trả tiền hàng cho Công ty B (`id = 205`), và đúng mili-giây đó kế toán Công ty B (`id = 205`) cũng bấm chuyển tiền chiết khấu ngược lại cho Công ty A (`id = 101`)? Luồng 1 thực thi `lock(101)` thành công; cùng lúc đó Luồng 2 thực thi `lock(205)` thành công. Bước tiếp theo, Luồng 1 gọi `lock(205)` -> phải đứng chờ Luồng 2 nhả ra; trong khi Luồng 2 gọi `lock(101)` -> lại phải đứng chờ Luồng 1 nhả ra! Một chu trình chờ khép kín (**Circular Wait**) hình thành! Sau đúng 1 giây (`deadlock_timeout = 1s` mặc định của PostgreSQL), bộ dò tìm đồ thị chờ của DB buộc phải giết chết một trong hai giao dịch bằng ngoại lệ `DeadlockDetected` để giải thoát cho luồng kia!",
          "Trong Khoa học Máy tính, một Deadlock chỉ có thể xảy ra khi hội tụ đủ cả 4 điều kiện Coffman, và cách thanh lịch nhất, chi phí bằng 0 để tiêu diệt vĩnh viễn Deadlock là **phá vỡ điều kiện Chờ Vòng Tròn (Circular Wait) bằng Thứ Tự Toàn Phần Tất Định (Total Lock Ordering)**! Quy tắc cực kỳ đơn giản nhưng hiệu nghiệm 100%: bất kể ai là người gửi và ai là người nhận, trước khi gọi xuống DB lấy khóa, ứng dụng luôn sắp xếp danh sách tất cả các `accountId` tham gia giao dịch theo thứ tự tăng dần (`ORDER BY id ASC`)! Quay lại ví dụ trên: vì `101 < 205`, cả Luồng 1 (101 → 205) lẫn Luồng 2 (205 → 101) đều bắt buộc gọi `lock(101)` đầu tiên! Luồng 1 thắng khóa `101`, Luồng 2 ngoan ngoãn đứng chờ ngay tại cửa `101` (lúc này Luồng 2 CHƯA hề giữ khóa `205`!). Luồng 1 đi tiếp lấy nốt khóa `205` hoàn toàn trống trải, cộng trừ xong xuôi trong 3ms rồi `COMMIT` nhả cả hai khóa cho Luồng 2 bước vào chạy tiếp — vĩnh viễn không bao giờ có vòng tròn Deadlock dù có 1.000 tài khoản chuyển chéo cho nhau!"
        ],
        bullets: [
          "Áp dụng cho cả giao dịch nhiều hơn 2 tài khoản: Nếu một giao dịch chuyển tiền có thu phí cần hạch toán 3 tài khoản (Người gửi + Người nhận + Tài khoản thu phí dịch vụ), hãy gom cả 3 ID vào một `TreeSet` hoặc truy vấn `SELECT * FROM accounts WHERE id IN (:ids) ORDER BY id ASC FOR UPDATE`!",
          "Chặn sớm lỗi tự chuyển cho chính mình (Self-Transfer Bug): Nếu không kiểm tra `if (fromId.equals(toId)) throw ...` ngay đầu hàm, một số đoạn code đọc tách rời hoặc tính toán trên 2 biến tham chiếu có thể vô tình nhân đôi số tiền hoặc treo logic!",
          "Cẩn trọng khóa ngầm do Khóa Ngoại (Foreign Key Share Lock): Khi chèn dòng vào bảng con `ledger_entries` có khai báo `FOREIGN KEY (account_id) REFERENCES accounts(id)`, PostgreSQL tự động đặt `FOR KEY SHARE` lên dòng `accounts` cha — nếu trước đó ta đã khóa `FOR UPDATE` theo đúng thứ tự ID từ đầu thì hoàn toàn miễn nhiễm với xung đột nâng cấp khóa.",
          "Không bao giờ trộn lẫn nhiều tài nguyên khóa ngược chiều: Thứ tự khóa các bảng trong cùng một giao dịch cũng phải nhất quán trên toàn bộ codebase (ví dụ luôn khóa `accounts` trước -> chèn `journals` -> chèn `ledger_entries`)."
        ]
      }
    ],
    comparison: {
      title: "So sánh 4 Chiến lược Chống Race Condition Tiền tệ trong Hệ thống Tài chính",
      headers: ["Chiến lược Đồng thời", "Cơ chế Bảo vệ Dữ liệu", "Ưu / Nhược điểm dưới Tải Cao", "Ngữ cảnh Áp dụng Chuẩn Ngân hàng"],
      rows: [
        [
          "Pessimistic Lock + Ordered ID (SELECT FOR UPDATE)",
          "Khóa độc quyền các dòng tài khoản theo thứ tự ID tăng dần trước khi đọc kiểm tra và hạch toán.",
          "Không bị lỗi mất cập nhật, không bắt khách retry, không Deadlock; giữ khóa DB trong vài mili-giây.",
          "Chuẩn mực số 1 cho Chuyển khoản Nội bộ / Liên ngân hàng và Khoanh giữ số dư Core Ledger."
        ],
        [
          "Atomic Conditional SQL (SET bal = bal - :amt WHERE bal >= :amt)",
          "Đẩy cả phép kiểm tra điều kiện số dư lẫn phép trừ vào cùng 1 câu lệnh `UPDATE` nguyên tử duy nhất.",
          "Độ trễ giữ khóa ngắn nhất vì chỉ có 1 vòng mạng SQL, nhưng khó mở rộng cho quy tắc nghiệp vụ phức tạp đa dòng.",
          "Rất tốt cho trừ tiền Ví đơn lẻ, trừ lượt khuyến mãi hoặc khấu trừ hạn mức đơn giản."
        ],
        [
          "Optimistic Lock (@Version)",
          "So khớp phiên bản bản ghi lúc ghi; nếu có luồng khác sửa xen ngang thì ném lỗi Rollback.",
          "Không giữ khóa lúc đọc, nhưng gây bão lỗi `OptimisticLockException` và tốn CPU nếu nhiều luồng đụng cùng 1 tài khoản.",
          "Cập nhật thông tin định danh khách hàng (KYC), cấu hình sản phẩm, duyệt lệnh Back-office ít xung đột."
        ],
        [
          "Sub-account Striping / Async Ledger Queue",
          "Tách 1 tài khoản siêu nóng thành N ví con (Buckets) cộng dồn hoặc xếp hàng tuần tự theo Partition Key.",
          "Phức tạp hóa việc đọc tổng số dư tức thời, nhưng phá vỡ giới hạn 500 TPS của khóa 1 dòng đơn lẻ.",
          "Tài khoản thu hộ thương mại điện tử lớn, chiến dịch quyên góp từ thiện quốc gia (> 5.000 TPS/tài khoản)."
        ]
      ]
    },
    codeTitle: "Dịch vụ Chuyển tiền Nội bộ Chống Âm Tiền & Triệt tiêu 100% Deadlock (Spring Boot 3 + JPA)",
    code: [
      "public interface AccountRepository extends JpaRepository<AccountEntity, Long> {",
      "    @Lock(LockModeType.PESSIMISTIC_WRITE)",
      "    @QueryHints(@QueryHint(name = \"jakarta.persistence.lock.timeout\", value = \"3000\"))",
      "    @Query(\"SELECT a FROM AccountEntity a WHERE a.id = :id\")",
      "    Optional<AccountEntity> findAndLockById(Long id);",
      "}",
      "",
      "@Service",
      "public class CoreTransferLockingService {",
      "    private final AccountRepository accountRepo;",
      "    private final LedgerJournalWriter journalWriter;",
      "    public CoreTransferLockingService(AccountRepository repo, LedgerJournalWriter writer) {",
      "        this.accountRepo = repo; this.journalWriter = writer;",
      "    }",
      "",
      "    @Transactional(rollbackFor = Exception.class)",
      "    public TransferReceipt transferInternal(Long fromId, Long toId, BigDecimal amount, String idemKey) {",
      "        if (fromId.equals(toId) || amount.compareTo(BigDecimal.ZERO) <= 0) {",
      "            throw new InvalidTransferException(\"Tài khoản trùng nhau hoặc số tiền không hợp lệ\");",
      "        }",
      "        // 1. Khóa theo thứ tự ID tăng dần để TRIỆT TIÊU 100% Deadlock chuyển chéo A <-> B",
      "        Long firstLockId  = fromId < toId ? fromId : toId;",
      "        Long secondLockId = fromId < toId ? toId : fromId;",
      "        AccountEntity first  = accountRepo.findAndLockById(firstLockId).orElseThrow();",
      "        AccountEntity second = accountRepo.findAndLockById(secondLockId).orElseThrow();",
      "        AccountEntity sender   = fromId.equals(first.getId()) ? first : second;",
      "        AccountEntity receiver = toId.equals(first.getId()) ? first : second;",
      "",
      "        // 2. Kiểm tra số dư khả dụng BÊN TRONG miền khóa dòng bằng BigDecimal.compareTo",
      "        if (!sender.isActive() || !receiver.isActive()) throw new AccountFrozenException();",
      "        if (sender.getAvailableBalance().compareTo(amount) < 0) throw new InsufficientFundsException();",
      "",
      "        // 3. Cập nhật số dư & ghi bút toán Nợ/Có cân bằng (tuyệt đối không gọi HTTP ở đây!)",
      "        sender.debit(amount);",
      "        receiver.credit(amount);",
      "        return journalWriter.recordBalancedTransfer(idemKey, sender, receiver, amount);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "rollbackFor = Exception.class là quy chuẩn bắt buộc: Mặc định `@Transactional` của Spring chỉ tự động Rollback với `RuntimeException` và `Error` — nếu một hàm bên dưới ném Checked Exception mà quên khai báo `rollbackFor = Exception.class`, giao dịch vẫn vô tư `COMMIT` trạng thái trừ tiền dở dang!",
      "Cấu hình jakarta.persistence.lock.timeout = 3000: Dịch thành `SET LOCAL lock_timeout = '3000ms'` (hoặc `FOR UPDATE WAIT 3` trên Oracle), đảm bảo nếu một dòng bị nghẽn bất thường quá 3 giây thì ném `PessimisticLockException` giải phóng luồng ngay thay vì treo vô hạn làm sập toàn bộ Thread Pool.",
      "Thuật toán ánh xạ lại sender / receiver sau khi khóa theo thứ tự: Hai câu lệnh `findAndLockById(firstLockId)` rồi `findAndLockById(secondLockId)` luôn lấy khóa từ ID nhỏ đến ID lớn, sau đó gán lại đúng vai trò `sender` và `receiver` để hạch toán Nợ/Có không bao giờ nhầm chiều.",
      "Bảo vệ bằng BigDecimal.compareTo(amount) < 0: Không bao giờ dùng `double` hay `equals()` để kiểm tra tiền tệ; mọi phép cộng trừ `sender.debit(amount)` thực thi trên `BigDecimal` bất biến trong phạm vi dòng đã khóa."
    ],
    labGuide: {
      goal: "Viết bài kiểm thử tích hợp đa luồng (Concurrency Chaos Test) với Testcontainers PostgreSQL 16 để chứng minh code không khóa bị rút âm tiền, code khóa ngược chiều bị nổ Deadlock, và bản code chuẩn vượt qua 100 luồng chuyển chéo bảo toàn tuyệt đối tổng tiền hệ thống.",
      steps: [
        "Bước 1: Dựng Spring Boot Test kết nối `PostgreSQLContainer(\"postgres:16-alpine\")` thật (tuyệt đối không dùng H2!), khởi tạo Tài khoản A = 10.000.000đ và Tài khoản B = 10.000.000đ (tổng tiền bất biến của hệ thống = 20.000.000đ).",
        "Bước 2: Tái hiện lỗi Trừ tiền âm: Dùng `CountDownLatch` và `ExecutorService(20)` bắn đồng thời 20 luồng rút 2.000.000đ từ Tài khoản A trên phiên bản hàm đọc `findById` thường (không khóa) — quan sát số giao dịch thành công vượt quá 5 lần hoặc tổng tiền lệch khỏi mốc ban đầu.",
        "Bước 3: Tái hiện lỗi Deadlock: Viết hàm khóa theo thứ tự tham số `(fromId rồi toId)`, bắn đồng thời 25 luồng chuyển 100.000đ từ `A → B` và 25 luồng chuyển 100.000đ từ `B → A` — bắt tận tay lỗi `CannotAcquireLockException / PSQLException: deadlock detected` trong log.",
        "Bước 4: Chuyển sang `CoreTransferLockingService` áp dụng khóa theo thứ tự ID tăng dần, bắn lại 100 luồng chuyển chéo ngẫu nhiên A ↔ B đồng thời — xác minh `assertEquals(0, exceptions.size())` và `assertEquals(0, accA.getBalance().add(accB.getBalance()).compareTo(new BigDecimal(\"20000000\")))`!"
      ],
      expectedOutput: "Bộ JUnit 5 Integration Test xanh 100%: cả 100 giao dịch chuyển chéo đồng thời hoàn tất dưới 400ms không phát sinh bất kỳ lỗi Deadlock nào, không tài khoản nào âm tiền và tổng số dư toàn hệ thống giữ nguyên đúng 20.000.000đ đến từng đồng."
    },
    examTips: [
      "Mẹo phỏng vấn Live Coding / Code Review số 1: Khi được đưa một class `TransferService` và hỏi 'Tìm các lỗi nghiêm trọng trong đoạn code này', 3 điểm đầu tiên em phải chỉ thẳng ngón tay vào là: (1) Đọc `findById` kiểm tra số dư không có khóa dòng -> Âm tiền; (2) Khóa 2 tài khoản không sắp xếp thứ tự ID -> Deadlock; (3) Gọi API đối tác / gửi Kafka đồng bộ bên trong hàm `@Transactional` đang giữ khóa dòng -> Cạn kiệt Connection Pool!",
      "Bẫy phỏng vấn Hibernate First-Level Cache (Persistence Context): Nếu trong cùng một `@Transactional`, em lỡ gọi `accountRepo.findById(fromId)` (không khóa) ở đầu hàm để kiểm tra tên chủ tài khoản, rồi lát sau mới gọi `findAndLockById(fromId)`, hãy cẩn thận! Dù câu `SELECT ... FOR UPDATE` chạy dưới DB, nếu không `refresh` hoặc gọi khóa ngay từ lần đọc đầu tiên, Entity cũ trong L1 Cache của Hibernate có thể vẫn giữ giá trị `balance` cũ đã đọc từ trước khi có khóa! Do đó: **luôn gọi thẳng `findAndLockById` ngay từ lần chạm đầu tiên!**",
      "Phân biệt Pessimistic Lock trên H2 vs PostgreSQL thật: Rất nhiều dự án chạy Unit Test bằng H2 in-memory không bao giờ phát hiện lỗi khóa hay Deadlock vì cơ chế MVCC/Locking của H2 khác xa PostgreSQL — hãy luôn khẳng định dùng Testcontainers cho bài test tiền tệ."
    ],
    summaryTakeaways: [
      "`@Transactional` với mức cô lập mặc định `READ COMMITTED` không hề khóa dòng khi đọc `SELECT`, do đó kiểm tra `if (balance >= amount)` trong Java mà không khóa DB chắc chắn dẫn tới lỗi rút âm tiền.",
      "Sử dụng `Pessimistic Write Lock (SELECT ... FOR UPDATE)` kèm `lock.timeout` ngắn cho hạch toán chuyển khoản cốt lõi; dành `Optimistic Lock (@Version)` cho dữ liệu ít xung đột ghi đồng thời.",
      "Luôn sắp xếp mọi định danh tài khoản theo thứ tự tăng dần (`ORDER BY id ASC`) trước khi lấy khóa để triệt tiêu 100% hiện tượng Deadlock vòng tròn khi chuyển tiền chéo.",
      "Giữ vùng giữ khóa CSDL mỏng nhất có thể (chỉ tính toán trên RAM và ghi DB), tuyệt đối không đặt bất kỳ lời gọi mạng HTTP/gRPC/SMTP nào bên trong giao dịch đang giữ khóa dòng."
    ],
    lessonQuestions: [
      {
        question: "Trong một buổi Review Code cho tính năng Rút tiền Ví điện tử sang Ngân hàng liên kết, bạn thấy lập trình viên viết trong hàm `@Transactional` như sau: Bước 1 gọi `Wallet w = walletRepo.findById(walletId).orElseThrow()` (không khóa); Bước 2 kiểm tra `if (w.getBalance().compareTo(amt) < 0) throw ...`; Bước 3 gọi tiếp `walletRepo.lockWalletForUpdate(walletId)` (`SELECT ... FOR UPDATE`); Bước 4 gọi `w.setBalance(w.getBalance().subtract(amt))` rồi kết thúc hàm. Giả sử không có lời gọi `entityManager.refresh(w)`. Điều gì sẽ xảy ra khi 2 luồng rút hết toàn bộ 5 triệu đồng chạy vào cùng một mili-giây?",
        options: [
          "Hoàn toàn an toàn vì ở Bước 3 đã gọi `SELECT ... FOR UPDATE` trước khi cập nhật số dư ở Bước 4.",
          "Vẫn bị lỗi Lost Update / Rút lố gấp đôi tiền! Vì cả 2 luồng đều vượt qua Bước 2 trước khi khóa, và nghiêm trọng hơn là đối tượng `w` đã nằm sẵn trong Hibernate First-Level Cache (Persistence Context) từ Bước 1 nên câu lệnh khóa ở Bước 3 không tự ghi đè lại giá trị `w.getBalance()` trong bộ nhớ Java của luồng chờ sau!",
          "PostgreSQL sẽ tự động từ chối lệnh `COMMIT` của luồng thứ hai vì phát hiện `findById` chạy trước `FOR UPDATE`.",
          "Spring Boot sẽ tự động nâng mức cô lập giao dịch lên `SERIALIZABLE` khi thấy hai câu truy vấn trên cùng một Entity."
        ],
        answer: 1,
        explanation: "Đây là cái bẫy cực độc của JPA/Hibernate trên thực tế! Thứ nhất, việc kiểm tra điều kiện số dư ở Bước 2 diễn ra TRƯỚC khi lấy khóa nên luồng thứ 2 đã đi qua chốt chặn `if` từ lúc số dư còn 5 triệu. Thứ hai, vì `w` đã được nạp vào Persistence Context L1 Cache ở Bước 1, theo quy tắc Identity Map của Hibernate, câu truy vấn JPQL ở Bước 3 dù khóa dòng dưới DB vẫn trả về lại chính tham chiếu `w` cũ trong RAM mang `balance = 5 triệu`, khiến `5tr - 5tr = 0` ghi đè mất lần trừ trước! Phải gọi `findAndLockById` ngay từ Bước 1 rồi mới kiểm tra số dư!",
        wrongReasons: [
          "Khóa sau khi đã đọc và đã kiểm tra xong điều kiện `if` hoàn toàn vô nghĩa vì cả dữ liệu trong bộ nhớ Java lẫn kết quả kiểm tra đều đã bị cũ (stale).",
          "",
          "Ở mức `READ COMMITTED`, PostgreSQL hoàn toàn cho phép đọc thường trước rồi khóa dòng và cập nhật sau mà không báo lỗi hệ thống.",
          "Spring Boot và Hibernate không bao giờ tự ý thay đổi mức Isolation của giao dịch CSDL đang mở."
        ]
      },
      {
        question: "Hệ thống Core Payment thực hiện giao dịch chuyển tiền có thu phí gồm 3 bút toán chạm vào 3 tài khoản trong bảng `accounts`: Tài khoản Người gửi (`id = 850`), Tài khoản Người nhận (`id = 120`), và Tài khoản GL Thu phí Ngân hàng (`id = 500`). Để đảm bảo không bao giờ xảy ra Deadlock với bất kỳ giao dịch chuyển khoản nào khác đang chạy đồng thời trên hệ thống, thứ tự gọi khóa `SELECT ... FOR UPDATE` đúng chuẩn là gì?",
        options: [
          "Luôn khóa Tài khoản Người gửi (`850`) trước, sau đó đến Người nhận (`120`), cuối cùng mới khóa Tài khoản Thu phí (`500`) theo đúng trình tự luồng tiền.",
          "Khóa Tài khoản GL Thu phí (`500`) đầu tiên vì đây là tài khoản của ngân hàng, sau đó khóa ngẫu nhiên hai tài khoản khách hàng.",
          "Sắp xếp tất cả các ID tài khoản tham gia theo thứ tự tăng dần nghiêm ngặt và lấy khóa lần lượt: `120` → `500` → `850` (hoặc dùng 1 câu lệnh `WHERE id IN (120, 500, 850) ORDER BY id ASC FOR UPDATE`).",
          "Mở 3 luồng bất đồng bộ `CompletableFuture` khóa đồng thời cả 3 tài khoản cùng một lúc để rút ngắn thời gian."
        ],
        answer: 2,
        explanation: "Nguyên lý Total Lock Ordering yêu cầu mọi giao dịch muốn giữ nhiều khóa thuộc cùng một tập tài nguyên (`accounts`) phải lấy khóa theo cùng một quan hệ thứ tự toàn phần nhất quán (ở đây là thứ tự số nguyên tăng dần `120 < 500 < 850`). Nhờ đó trên đồ thị cấp phát tài nguyên không bao giờ xuất hiện cạnh đi ngược từ số lớn về số nhỏ, triệt tiêu 100% chu trình Deadlock!",
        wrongReasons: [
          "Khóa theo vai trò nghiệp vụ (Người gửi -> Người nhận) sẽ lập tức dính Deadlock khi có giao dịch ngược chiều chuyển từ `120` sang `850` chạy cùng lúc.",
          "Khóa ngẫu nhiên hai tài khoản khách hàng vẫn tạo ra xung đột vòng tròn `120 ↔ 850` sau khi qua chốt `500`.",
          "",
          "Các luồng con trong `CompletableFuture` không chia sẻ chung 1 JDBC Connection / DB Transaction an toàn và việc tranh khóa không thứ tự giữa các luồng càng làm nổ Deadlock nhanh hơn."
        ]
      }
    ]
  },

  D4: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (High-Throughput Fintech)",
    codeLang: "java",
    teacherIntro: "Chào em, bước sang bài D4 hôm nay, anh em mình sẽ làm chủ **Redis ở cấp độ Ngân hàng chịu tải cao** — nơi Redis vừa là thanh gươm tăng tốc độ phản hồi xuống dưới 1 mili-giây, nhưng cũng là con dao hai lưỡi sắc lẹm nếu dùng sai bản chất! Anh từng xử lý hai vụ sự cố lớn liên quan tới Redis: Vụ thứ nhất xảy ra ở module Kiểm soát Hạn mức Chuyển tiền Nhanh (giới hạn 500 triệu VNĐ/ngày cho khách chưa xác thực sinh trắc học Khuôn mặt theo Quyết định 2345 của NHNN). Đội phát triển lưu tổng tiền đã chuyển trong ngày trên Redis, viết code Java gọi `GET` lấy số đã dùng -> kiểm tra `if (used + amount <= 500_000_000)` -> rồi mới gọi `INCRBY` cộng dồn. Chỉ một lỗ hổng 1,5ms độ trễ mạng giữa hai lệnh đó đã đủ để tội phạm công nghệ bắn chùm 5 lệnh x 450 triệu song song rút trót lọt 2,25 tỷ đồng mà không hề bị chặn xác thực khuôn mặt! Vụ thứ hai xảy ra đúng 08:00:00 sáng thứ Hai đầu tuần: bảng cache cấu hình danh mục BIN ngân hàng và biểu phí hết hạn TTL đúng cùng một tích tắc (**Cache Stampede + Avalanche**), khiến 25.000 request từ cổng Mobile lao thẳng xuống Core Database trong 2 giây làm nghẽn sập toàn bộ cụm! Hôm nay anh sẽ chỉ cho em cách dùng **Atomic Lua Script**, **Redisson Lock** và bộ giáp chống sập Cache chuẩn Production.",
    analogy: {
      title: "Cửa xoay một người kèm máy dập dấu liền tay & Giờ tan tầm lệch pha chống vỡ trận",
      body: "Em hãy tưởng tượng quầy đổi ngoại tệ giới hạn mỗi người chỉ được đổi tối đa 1.000 USD/ngày. Nếu nhân viên A ngồi ngoài cửa chỉ liếc sổ thấy khách mới đổi 800 USD rồi cho khách đi vào trong, trong lúc khách chưa kịp ghi thêm 500 USD vào sổ thì người anh em cầm hộ chiếu bản sao ở cửa bên cạnh cũng vừa được nhân viên B liếc sổ thấy con số 800 USD cho lọt qua! Ngược lại, **Redis Lua Script** giống như chiếc cửa xoay tự động một buồng khép kín: một người bước vào, máy quét kiểm tra hạn mức, cộng dồn số tiền mới và đóng dấu giờ hết hạn 23:59:59 diễn ra trọn vẹn trong đúng 1 nhịp xoay duy nhất — người đứng sau bắt buộc chờ buồng xoay mở ra mới tới lượt! Còn chống **Cache Avalanche** giống hệt điều tiết giao thông đô thị: thay vì bấm chuông cho 100 tòa cao ốc cùng tan làm đúng 17:00:00 gây tê liệt ngã tư, ban quản lý lệch giờ ngẫu nhiên từ 17:00 đến 17:15 (TTL Jitter) để dòng xe luôn trôi chảy êm ái!"
    },
    objectives: [
      "Viết và triển khai **Redis Atomic Lua Script** trong Spring Boot để kiểm tra + cộng dồn hạn mức giao dịch ngày + gắn thời điểm hết hạn cuối ngày nguyên tử 100% chỉ trong 1 vòng mạng (1 RTT).",
      "Thiết kế hệ thống phòng thủ trọn vẹn trước 3 thảm họa Cache kinh điển: **Cache Stampede (Hot-key Breakdown)**, **Cache Penetration (Truy vấn xuyên thấu)** và **Cache Avalanche (Tuyết lở hết hạn hàng loạt)**.",
      "Hiểu sâu cơ chế vận hành và giới hạn an toàn của **Redis Distributed Lock (Redisson Watchdog)**, nắm rõ tại sao Redis không bao giờ được làm chốt chặn duy nhất giữ số dư tiền tệ."
    ],
    flow: [
      {
        step: "1. Đóng gói Quy tắc Hạn mức vào Kịch bản Lua Nguyên tử (SHA1 Cached)",
        detail: "Gom toàn bộ bước đọc tổng hạn mức ngày hiện tại, so sánh ngưỡng trần, cộng dồn `INCRBY` và đặt `EXPIREAT` mốc 23:59:59 múi giờ Việt Nam vào một `DefaultRedisScript<Long>` duy nhất sử dụng Hash Tag `{cif}`."
      },
      {
        step: "2. Thực thi Đơn luồng Không Chen ngang trên Redis (EVALSHA)",
        detail: "Ứng dụng Java gọi 1 lệnh mạng duy nhất tới Redis; luồng xử lý chính của Redis chạy trọn vẹn kịch bản Lua trong vài chục micro-giây mà không bất kỳ lệnh song song nào khác chen vào giữa được."
      },
      {
        step: "3. Hạch toán Core DB & Cơ chế Hoàn Hạn mức Bù trừ (Quota Compensation)",
        detail: "Nếu Lua trả về `1 (Được phép)`, ứng dụng tiến hành ghi bút toán xuống PostgreSQL; nếu bước ghi DB hoặc chuyển mạch thất bại xác định, gọi hàm Lua bù trừ trừ ngược lại hạn mức để khách không bị thiệt quota trong ngày."
      },
      {
        step: "4. Bảo vệ Luồng Đọc Danh mục bằng Cache 2 Tầng + Mutex + TTL Jitter",
        detail: "Kết hợp Caffeine L1 + Redis L2 gắn độ nhiễu ngẫu nhiên vào TTL, lưu giá trị đánh dấu rỗng ngắn hạn cho mã không tồn tại và khóa Single-Flight khi nạp lại dữ liệu nóng."
      }
    ],
    sections: [
      {
        heading: "1. Sức mạnh Nguyên tử của Redis Lua Script cho Bài toán Hạn mức & Chống Spam Giao dịch",
        paragraphs: [
          "Tại sao Redis có thể chạy 100.000 thao tác mỗi giây mà không cần khóa phức tạp bên trong? Vì nhân thực thi lệnh dữ liệu cốt lõi của Redis chạy trên kiến trúc **Single-threaded Event Loop** (các luồng phụ chỉ lo đọc/ghi socket mạng I/O). Điều đó có nghĩa là mỗi lệnh đơn lẻ như `INCRBY` là nguyên tử, NHƯNG một chuỗi 2–3 lệnh gửi liên tiếp từ code Java (`GET` -> tính toán `if` trong JVM -> `INCRBY` -> `EXPIRE`) lại bị xé lẻ bởi hàng chục lệnh của các luồng khác chen vào giữa trên đường truyền mạng! Thậm chí ngay cả khi em đổi sang gọi `INCRBY` cộng trước rồi kiểm tra nếu lố hạn mức thì gọi `DECRBY` trừ lại, em vẫn đối mặt với 2 lỗi nghiêm trọng: (1) Nếu Pod K8s bị OOMKilled hoặc rớt mạng ngay sau câu `INCRBY` đầu tiên trước khi kịp gọi `EXPIRE`, key hạn mức đó sẽ mang `TTL = -1` (tồn tại vĩnh viễn trên Redis, khóa chết hạn mức chuyển tiền của khách sang cả ngày hôm sau, tháng sau!); (2) Trong khoảnh khắc vài mili-giây chưa kịp `DECRBY`, một giao dịch nhỏ hợp lệ khác của chính khách hàng đó lại bị từ chối oan!",
          "**Redis Lua Script** giải quyết triệt để 100% các lỗ hổng trên một cách tuyệt đẹp: Redis nhúng sẵn trình thông dịch Lua ngay trong tiến trình bộ nhớ và cam kết rằng **khi một Lua Script đang chạy, không một lệnh hay script nào khác được phép thực thi xen ngang**! Chỉ với 1 vòng mạng (1 Round-Trip Time thông qua cơ chế băm `EVALSHA` không phải truyền lại mã nguồn script), kịch bản Lua vừa kiểm tra `used + amount <= limit`, vừa cộng dồn số tiền, vừa gắn `EXPIREAT` đúng giây cuối cùng của ngày hôm đó nếu key mới tạo! Để vận hành an toàn trên **Redis Cluster** (gồm 16.384 Hash Slots chia ra nhiều Master Shards), em phải nhớ hai quy tắc sắt: (1) Nếu kịch bản Lua chạm vào nhiều `KEYS` (ví dụ vừa kiểm tra hạn mức ngày vừa kiểm tra hạn mức tháng của cùng 1 khách), mọi tên key bắt buộc phải dùng chung **Hash Tag trong ngoặc nhọn `{...}`** như `quota:daily:{CIF8899}:20261124` và `quota:monthly:{CIF8899}:202611` để Redis băm đúng phần bên trong `{CIF8899}` đưa cả hai key về cùng 1 Shard (nếu không sẽ nổ lỗi `CROSSSLOT Keys in request don't hash to the same slot`!); (2) Tuyệt đối viết Lua Script siêu ngắn gọn (< 0,5ms), không bao giờ dùng vòng lặp lớn quét hàng vạn phần tử vì nó sẽ chặn đứng toàn bộ Shard Redis đó!"
        ],
        bullets: [
          "Tính toán mốc EXPIREAT theo đúng múi giờ nghiệp vụ: Hạn mức ngày của khách hàng Việt Nam phải reset lúc `00:00:00 GMT+7` chứ không phải giờ UTC hay trượt lùi 24 tiếng kể từ lúc giao dịch (`EXPIRE 86400`) — do đó hãy tính sẵn Unix Epoch giây của thời điểm nửa đêm `Asia/Ho_Chi_Minh` từ Java truyền vào `ARGV` cho lệnh `EXPIREAT`!",
          "Tự động nạp lại Script khi Redis khởi động (EVALSHA Fallback): `StringRedisTemplate.execute(DefaultRedisScript, keys, args)` của Spring Data Redis tự động gửi `EVALSHA` trước (siêu nhẹ 40 bytes), và nếu Redis mới restart báo `NOSCRIPT` thì tự động gửi lại `EVAL` nạp mã nguồn hoàn toàn trong suốt.",
          "Cơ chế Bù trừ Hạn mức (Compensating Quota): Vì kiểm tra hạn mức trên Redis diễn ra TRƯỚC khi hạch toán Core DB (để cản tải sớm), nếu bước ghi Core DB thất bại chắc chắn (ví dụ tài khoản người nhận bị đóng), khối `catch` phải gọi một Lua Script trừ lùi lại đúng số tiền vừa giữ chỗ (đảm bảo không trừ âm dưới 0).",
          "Ứng dụng mở rộng của Lua trong Ngân hàng: Sliding Window Rate Limiter theo CIF/IP bằng Sorted Set (`ZREMRANGEBYSCORE` + `ZCARD` + `ZADD`), đếm số lần nhập sai mã PIN Smart OTP liên tiếp để khóa tạm thời 15 phút."
        ]
      },
      {
        heading: "2. Phòng thủ Bộ Ba Thảm họa Sập Cache: Stampede, Penetration & Avalanche",
        paragraphs: [
          "Trong kiến trúc ngân hàng số, các dữ liệu đọc cực nhiều nhưng ít thay đổi (bảng tỷ giá ngoại tệ/vàng, danh sách 60 ngân hàng thành viên NAPAS 24/7, biểu phí chuyển khoản, cấu hình bật/tắt tính năng hệ thống) luôn áp dụng mẫu **Cache-Aside**: đọc Redis trước, nếu có trả về ngay trong 0,5ms; nếu không thấy (Cache Miss) mới xuống Database đọc lên rồi nạp vào Redis. Tuy nhiên ở tải 10.000 TPS, mẫu Cache-Aside ngây thơ sẽ sập ngay bởi 3 thảm họa sau. Thứ nhất là **Cache Stampede (hay Hot-key Breakdown / Dog-piling)**: đúng giây key `fx:rates:all` hết hạn TTL, có 8.000 luồng đang gọi đồng thời cùng nhận `null` từ Redis -> cả 8.000 luồng cùng lao thẳng xuống Database chạy câu truy vấn tổng hợp nặng nề và cùng ghi đè lại Redis làm cạn sạch HikariCP Pool! Cách trị tận gốc: kết hợp **Single-Flight / Mutex Lock** (chỉ 1 luồng lấy được khóa ngắn được phép xuống DB nạp lại cache, các luồng còn lại chờ vài chục ms đọc lại) hoặc kỹ thuật **Logical Expiration (Hết hạn Logic)**: key vật lý trên Redis đặt TTL dài hơn thực tế, bên trong JSON lưu kèm trường `logicalExpireAt` — khi thấy quá hạn logic, luồng phát hiện chỉ kích hoạt 1 tiến trình nền bất đồng bộ đi làm mới dữ liệu, còn bản thân nó và 7.999 luồng kia vẫn trả về ngay giá trị cũ chênh vài giây mà không chờ đợi một mili-giây nào!",
          "Thảm họa thứ hai là **Cache Penetration (Đâm xuyên Cache)**: hacker hoặc đối tác viết vòng lặp lỗi bắn hàng vạn request tra cứu các mã tài khoản / mã khuyến mãi không hề tồn tại (`promoCode = 'FAKE_0001'...'FAKE_99999'`). Vì DB không có bản ghi nào nên code thông thường không ghi gì vào Redis -> lần gọi nào cũng đâm xuyên thủng tầng Cache đập thẳng xuống đĩa cứng DB! Vũ khí khắc chế gồm 2 lớp: (1) Lưu một giá trị đánh dấu rỗng (`\"__NULL__\"`) vào Redis với TTL ngắn 30–60 giây khi DB trả về `Optional.empty()`; (2) Nếu kẻ tấn công sinh mã ngẫu nhiên không trùng lặp mỗi lần, đặt một **Bloom Filter** (ví dụ `RBloomFilter` của Redisson tốn vỏn vẹn vài chục MB bộ nhớ cho 50 triệu số tài khoản hợp lệ) ngay đầu cổng để từ chối tức khắc 99,9% mã rác trước khi chạm vào cả Redis lẫn DB! Thảm họa thứ ba là **Cache Avalanche (Tuyết lở Cache)**: khi Job khởi tạo đầu ngày nạp 100.000 key vào Redis cùng đặt cứng `Duration.ofHours(1)`, đúng 60 phút sau toàn bộ 100.000 key bốc hơi cùng một giây kéo sập DB! Phép giải đơn giản nhưng bắt buộc: luôn cộng thêm **TTL Jitter** (`Duration.ofMinutes(60).plusSeconds(ThreadLocalRandom.current().nextInt(30, 360))`) và dựng **Caffeine Local Cache (L1, TTL ngắn 5–10s)** phía trước Redis (L2) làm phao cứu sinh nếu cả cụm Redis gặp sự cố mạng!"
        ],
        bullets: [
          "Xóa Cache thay vì Cập nhật đè Cache khi sửa DB: Khi Admin cập nhật biểu phí trong Database, hãy `COMMIT` giao dịch DB xong rồi gọi `DELETE key` trên Redis (thay vì `SET` giá trị mới) để tránh lỗi thứ tự ghi đè ngược giữa 2 luồng cập nhật đồng thời gây lệch vĩnh viễn giữa Cache và DB.",
          "Tránh BigKey trên Redis Ngân hàng: Không bao giờ nhét một chuỗi JSON hay Hash nặng 10 MB (ví dụ toàn bộ 200.000 chi nhánh/phòng giao dịch gộp 1 key) vì chỉ 1 lệnh đọc/xóa key đó sẽ làm nghẽn băng thông mạng và treo luồng đơn của Redis!",
          "Chống Hot-Key vượt trần 1 node Redis Cluster: Dù dùng Redis Cluster 6 Master Shards, 1 key duy nhất như `campaign:flashsale:banner` vẫn chỉ nằm trên đúng 1 Shard; với key bị đọc > 100.000 lần/giây, việc bọc **Caffeine In-Memory L1 Cache (TTL 3 giây)** ngay trong RAM từng Pod Java giảm 99,9% tải cho Redis!",
          "Cấu hình Eviction Policy cẩn trọng: Instance Redis dùng cho Cache danh mục có thể đặt `allkeys-lru` / `volatile-lfu`, nhưng Instance Redis lưu Hạn mức giao dịch ngày, Nonce chống Replay và Phiên đăng nhập bắt buộc tách riêng hoặc dùng `noeviction` / `volatile-ttl` để không bao giờ bị xóa nhầm key bảo mật khi đầy RAM!"
        ]
      },
      {
        heading: "3. Giải phẫu Redis Distributed Lock (Redisson Watchdog) & Giới hạn An toàn Tiền tệ",
        paragraphs: [
          "Khi cần ngăn chặn người dùng hoặc Webhook đối tác bắn đúp cùng một mã lệnh chuyển tiền `idempotencyKey` vào hai Pod K8s khác nhau trong cùng một mili-giây, ta thường đặt một **Distributed Lock trên Redis** ngay cửa ngõ API. Nếu tự tay cài đặt bằng lệnh thô `SET lock:txn:999 <value> NX EX 10`, lập trình viên rất dễ dính 2 lỗi chí mạng: (1) Quên kiểm tra định danh chủ sở hữu khi mở khóa (`DEL key` trơn) — nếu Pod 1 bị Stop-The-World GC hoặc mạng đối tác ngâm mất 12 giây làm khóa 10 giây tự hết hạn, Pod 2 nhảy vào lấy khóa đang chạy đến giây thứ 2 thì Pod 1 tỉnh dậy gọi `DEL` xóa mất khóa của Pod 2, cho phép Pod 3 nhảy vào tiếp!; (2) Đặt cứng thời gian khóa quá ngắn làm hết hạn giữa chừng hoặc quá dài gây chờ lâu khi Pod chết. Thư viện **Redisson (`RLock`)** giải quyết mượt mà bằng cách lưu cấu trúc Hash gắn `UUID_tiến_trình:threadId` kèm cơ chế **Lock Watchdog**: khi gọi `lock.tryLock(0, TimeUnit.SECONDS)` (chú ý KHÔNG truyền tham số `leaseTime`!), Redisson cấp khóa mặc định 30 giây và cứ mỗi 10 giây (`lockWatchdogTimeout / 3`) một luồng ngầm tự động gia hạn lại lên 30 giây chừng nào luồng nghiệp vụ vẫn còn sống và chưa vào khối `finally { if (lock.isHeldByCurrentThread()) lock.unlock(); }`!",
          "Tuy nhiên, với tư cách một Principal Architect làm ngân hàng, anh buộc phải cảnh báo em **sự thật trần trụi về tính an toàn của Redis Lock**: Nhân bản từ Master sang Replica trong cả Redis Sentinel lẫn Redis Cluster đều là **Bất đồng bộ (Asynchronous Replication)**! Hãy xét kịch bản sau: Pod A xin khóa `lock:txn:999` thành công trên Redis Master -> ngay mili-giây tiếp theo, trước khi gói tin nhân bản kịp truyền sang Redis Replica, máy chủ Master bị mất nguồn điện! Cụm bầu chọn đưa Replica lên làm Master mới (bản Replica này chưa hề có key `lock:txn:999`!) -> Pod B gửi retry đến Master mới và cũng xin được khóa `lock:txn:999` thành công! Cả Pod A và Pod B cùng chạy song song! Do đó, nguyên lý kiến trúc bất di bất dịch trong ngân hàng là: **Redis Lock chỉ đóng vai trò lớp lọc hiệu năng đầu nguồn (cản 99,99% request trùng sớm để bảo vệ DB), còn chốt chặn chân lý cuối cùng (Source of Truth) BẮT BUỘC phải nằm ở ràng buộc `UNIQUE (idempotency_key)` và khóa dòng/phiên bản trong PostgreSQL/Oracle bền vững!**"
        ],
        bullets: [
          "Cạm bẫy vô hiệu hóa Redisson Watchdog: Rất nhiều dev viết `lock.tryLock(2, 10, TimeUnit.SECONDS)` truyền cứng `leaseTime = 10` rồi thắc mắc sao Watchdog không tự gia hạn! Khi truyền `leaseTime > 0` (khác `-1`), Redisson TẮT hoàn toàn Watchdog và mở toang khóa đúng giây thứ 10 bất kể hàm chạy xong hay chưa!",
          "Luôn kiểm tra trước khi unlock trong khối finally: Viết `if (lock.isLocked() && lock.isHeldByCurrentThread()) { lock.unlock(); }` để tránh ném `IllegalMonitorStateException` che khuất ngoại lệ nghiệp vụ chính nếu khóa chẳng may đã mất.",
          "Không bao giờ lưu số dư tiền tệ duy nhất trên Redis: Cơ chế AOF (`appendfsync everysec`) vẫn có thể mất 1 giây dữ liệu và không có giao dịch ACID đa bảng đối chiếu sổ cái kép như RDBMS.",
          "Khái niệm Fencing Token cho tài nguyên ngoài: Khi dùng khóa phân tán điều khiển ghi tệp hoặc hệ thống đích, đính kèm một số thứ tự tăng đơn điệu (Fencing Token) để đích đến từ chối mọi gói tin đến muộn từ luồng giữ khóa cũ đã hết hạn."
        ]
      }
    ],
    comparison: {
      title: "Bảng Đối chiếu Giải pháp Xử lý Đồng thời & Bảo vệ Cache với Redis Ngân hàng",
      headers: ["Bài toán Thực tế", "Cách làm Sai lầm Thường gặp", "Hậu quả trên Production", "Giải pháp Chuẩn Ngân hàng"],
      rows: [
        [
          "Kiểm soát Hạn mức Chuyển tiền Ngày (500tr/ngày)",
          "Đọc `GET` về Java kiểm tra `if` rồi mới gọi `INCRBY` và `EXPIRE` thành nhiều lệnh rời.",
          "Kẻ gian bắn song song vượt gấp nhiều lần trần hạn mức; rớt mạng giữa chừng gây key mất TTL khóa vĩnh viễn.",
          "**Atomic Lua Script** kiểm tra + `INCRBY` + `EXPIREAT` cuối ngày VN gói gọn trong 1 lệnh duy nhất."
        ],
        [
          "Cache Tỷ giá / Danh mục BIN Ngân hàng cực nóng",
          "Đặt cứng chung `TTL = 3600s` và khi Miss cho tất cả các luồng cùng xuống DB truy vấn lại.",
          "Nổ **Cache Stampede & Avalanche** đúng thời điểm hết hạn làm cạn kiệt HikariCP Pool của Core DB.",
          "**Caffeine L1 + Redis L2** kèm **TTL Jitter** ngẫu nhiên và **Single-Flight Mutex / Logical Expiry**."
        ],
        [
          "Tra cứu Tài khoản / Mã Khuyến mãi từ Internet",
          "Khi DB trả về `null` thì bỏ qua không lưu gì vào Cache.",
          "Bị tấn công **Cache Penetration** bằng triệu mã giả đâm xuyên thẳng xuống đĩa cứng CSDL.",
          "Cache giá trị đánh dấu rỗng (`__NULL__`, TTL 45s) kết hợp **Bloom Filter** chặn từ vòng ngoài."
        ],
        [
          "Chống Bấm đúp Giao dịch (Idempotency Lock)",
          "Chỉ dùng duy nhất `SETNX` trên Redis mà không có bảng `idempotency_records` dưới DB.",
          "Khi Redis Master sập Failover sang Replica bất đồng bộ làm mất khóa, gây hạch toán trừ tiền 2 lần!",
          "Dùng **Redisson Lock** cản sớm ở tầng API + khóa cứng `UNIQUE (idempotency_key)` trong cùng Transaction DB."
        ]
      ]
    },
    codeTitle: "Kiểm soát & Bù trừ Hạn mức Chuyển tiền Ngày Nguyên tử bằng Redis Lua Script (Spring Boot 3)",
    code: [
      "@Component",
      "public class DailyTransferQuotaGuard {",
      "    private static final ZoneId VN_ZONE = ZoneId.of(\"Asia/Ho_Chi_Minh\");",
      "    private static final DefaultRedisScript<Long> RESERVE_QUOTA_LUA = new DefaultRedisScript<>(",
      "        \"local current = tonumber(redis.call('GET', KEYS[1]) or '0')\\n\" +",
      "        \"local amount  = tonumber(ARGV[1])\\n\" +",
      "        \"local maxLim  = tonumber(ARGV[2])\\n\" +",
      "        \"if (current + amount) > maxLim then return 0 end\\n\" +",
      "        \"local updated = redis.call('INCRBY', KEYS[1], amount)\\n\" +",
      "        \"if updated == amount then redis.call('EXPIREAT', KEYS[1], tonumber(ARGV[3])) end\\n\" +",
      "        \"return 1\", Long.class);",
      "",
      "    private static final DefaultRedisScript<Long> RELEASE_QUOTA_LUA = new DefaultRedisScript<>(",
      "        \"local cur = tonumber(redis.call('GET', KEYS[1]) or '0')\\n\" +",
      "        \"if cur <= 0 then return 0 end\\n\" +",
      "        \"local refund = math.min(cur, tonumber(ARGV[1]))\\n\" +",
      "        \"return redis.call('DECRBY', KEYS[1], refund)\", Long.class);",
      "",
      "    private final StringRedisTemplate redis;",
      "    public DailyTransferQuotaGuard(StringRedisTemplate redis) { this.redis = redis; }",
      "",
      "    public boolean tryReserveDailyQuota(String cif, long amountVnd, long dailyLimitVnd) {",
      "        ZonedDateTime nowVn = ZonedDateTime.now(VN_ZONE);",
      "        String dateTag = nowVn.format(DateTimeFormatter.BASIC_ISO_DATE);",
      "        long endOfDayEpochSec = nowVn.toLocalDate().plusDays(1).atStartOfDay(VN_ZONE).toEpochSecond();",
      "        String key = \"quota:daily:{\" + cif + \"}:\" + dateTag; // Hash Tag {cif} chuẩn Redis Cluster",
      "        Long allowed = redis.execute(RESERVE_QUOTA_LUA, List.of(key),",
      "                String.valueOf(amountVnd), String.valueOf(dailyLimitVnd), String.valueOf(endOfDayEpochSec));",
      "        return Long.valueOf(1L).equals(allowed);",
      "    }",
      "",
      "    public void compensateQuotaOnFailure(String cif, String dateTag, long amountVnd) {",
      "        String key = \"quota:daily:{\" + cif + \"}:\" + dateTag;",
      "        redis.execute(RELEASE_QUOTA_LUA, List.of(key), String.valueOf(amountVnd));",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Nguyên tử tuyệt đối từ kiểm tra đến gắn hạn hết ngày: Toàn bộ 7 dòng mã Lua trong `RESERVE_QUOTA_LUA` chạy không thể chia cắt trên luồng đơn của Redis — khi 50 request của cùng 1 `cif` ập đến cùng lúc, chúng được xếp hàng kiểm tra chính xác đến từng đồng VNĐ.",
      "Đặt EXPIREAT theo đầu ngày mới múi giờ Asia/Ho_Chi_Minh: Chỉ khi `updated == amount` (tức giao dịch đầu tiên trong ngày tạo mới key), Lua mới gọi `EXPIREAT` trỏ thẳng tới `00:00:00` sáng hôm sau theo giờ Việt Nam, đảm bảo key không bao giờ bị tồn tại vĩnh viễn và tự động mở lại hạn mức mới đúng nửa đêm.",
      "Sử dụng Hash Tag {cif} trong tên key: Định dạng `quota:daily:{CIF123}:20261124` giúp sau này nếu mở rộng kiểm tra đồng thời cả hạn mức ngày lẫn hạn mức tháng `quota:monthly:{CIF123}:202611` trong cùng 1 Lua Script trên Redis Cluster, cả hai key chắc chắn rơi vào cùng một Hash Slot.",
      "Hàm bù trừ RELEASE_QUOTA_LUA an toàn qua ranh giới nửa đêm: Lưu lại `dateTag` tại thời điểm giữ chỗ để nếu giao dịch thất bại lúc `23:59:59.900` và hoàn trả lúc `00:00:00.200`, nó chỉ hoàn vào key ngày cũ (nếu còn) mà không trừ nhầm vào hạn mức của ngày mới vừa sang!"
    ],
    labGuide: {
      goal: "Thực hành kiểm thử áp lực đa luồng (50 luồng bắn đồng thời) lên bộ kiểm soát hạn mức 500 triệu VNĐ/ngày chạy trên Redis 7 container thật, chứng minh phiên bản Java tách lệnh bị lọt vượt trần còn phiên bản Lua Script chặn chính xác tuyệt đối 100%.",
      steps: [
        "Bước 1: Khởi chạy `GenericContainer<>(\"redis:7.2-alpine\")` bằng Testcontainers trong dự án Spring Boot 3 và cấu hình `StringRedisTemplate`.",
        "Bước 2: Viết một hàm đối chứng cố tình làm sai (`naiveCheckAndIncrement`: gọi `opsForValue().get()` -> kiểm tra `<= 500_000_000L` -> gọi `increment()`); dùng `ExecutorService(50)` + `CountDownLatch` bắn đồng thời 50 lệnh x 100.000.000đ cho cùng 1 `CIF` — quan sát có từ 12 đến 35 lệnh lọt qua (tổng tiền lên tới hàng tỷ đồng!).",
        "Bước 3: Đổi sang gọi `DailyTransferQuotaGuard.tryReserveDailyQuota(cif, 100_000_000L, 500_000_000L)` với cùng kịch bản 50 luồng nổ súng đồng thời — kiểm chứng `assertEquals(5, passedCount)` chính xác tuyệt đối không lố dù chỉ 1 lệnh và kiểm tra `TTL` của key trên Redis > 0.",
        "Bước 4: Giả lập 1 trong 5 giao dịch sau đó bị lỗi hạch toán Core DB gọi `compensateQuotaOnFailure`, rồi bắn thêm 1 giao dịch 100 triệu mới — xác minh giao dịch mới được phép đi tiếp đúng 500 triệu trần ngày."
      ],
      expectedOutput: "Bài test chứng minh rõ rệt: hàm tách lệnh rời bị thủng hạn mức nghiêm trọng, trong khi `DailyTransferQuotaGuard` dùng Lua Script chỉ cho phép đúng 5/50 luồng thành công (tổng 500.000.000đ), thời gian thực thi trung bình mỗi lệnh < 0,8ms."
    },
    examTips: [
      "Mẹo phỏng vấn Senior #1 (Câu hỏi bẫy Redis Cluster + Lua Script): Khi người phỏng vấn hỏi 'Viết Lua Script chuyển điểm thưởng từ `wallet:userA` sang `wallet:userB` trên cụm Redis Cluster 6 nodes có chạy được không?', hãy đáp ngay: Sẽ bị lỗi `CROSSSLOT` vì `userA` và `userB` băm ra hai Hash Slot nằm trên hai máy chủ vật lý khác nhau! Lua Script trên Redis Cluster bắt buộc mọi `KEYS` phải thuộc cùng 1 Hash Slot qua `{hash_tag}`!",
      "Mẹo phỏng vấn Senior #2 (Redisson Watchdog): Nhớ kỹ chi tiết ăn điểm: Watchdog của Redisson chỉ tự động gia hạn khóa khi gọi `lock()` hoặc `tryLock(waitTime, unit)` KHÔNG truyền `leaseTime`! Nếu truyền cứng `leaseTime = 10s`, Watchdog bị tắt hoàn toàn!",
      "Khi gặp bài toán System Design 'Hot Key làm quá tải 1 node Redis Cluster dù đã thêm nhiều Shard mới': Đáp án chuẩn Senior là đặt thêm tầng **Near-Cache cục bộ trong RAM của từng Pod Java (Caffeine, TTL ngắn 2–5 giây)** hoặc nhân bản key kèm hậu tố ngẫu nhiên `key#1..key#16` cho dữ liệu chỉ đọc."
    ],
    summaryTakeaways: [
      "Mọi thao tác Đọc - Kiểm tra điều kiện - Cập nhật - Đặt TTL trên Redis bắt buộc gom vào một **Atomic Lua Script** duy nhất để triệt tiêu Race Condition và tránh lỗi mồ côi key vĩnh viễn.",
      "Bảo vệ Database khỏi 3 thảm họa Cache bằng bộ giáp: **TTL Jitter** (chống Avalanche), **Single-Flight Mutex / Logical Expiry + Caffeine L1** (chống Stampede), và **Null Sentinel + Bloom Filter** (chống Penetration).",
      "Khi dùng Redisson Distributed Lock, không truyền cứng `leaseTime` nếu muốn bật Watchdog tự gia hạn, và luôn kiểm tra `isHeldByCurrentThread()` trước khi `unlock()`.",
      "Vì nhân bản Redis là bất đồng bộ, Redis chỉ làm lớp chắn tốc độ cao phía trước chứ **không bao giờ thay thế** ràng buộc `UNIQUE` và giao dịch ACID của Core Database cho dữ liệu tiền tệ."
    ],
    lessonQuestions: [
      {
        question: "Một cổng thanh toán triển khai trên cụm **Redis Cluster 6 Master Shards** sử dụng Lua Script để kiểm tra đồng thời hạn mức giao dịch theo ngày và hạn mức giao dịch theo tháng của cùng một khách hàng trước khi cho phép chuyển tiền. Ở môi trường Dev dùng 1 Redis đơn lẻ mọi thứ chạy hoàn hảo, nhưng vừa đưa lên Staging chạy Redis Cluster thì ném lỗi `ERR CROSSSLOT Keys in request don't hash to the same slot` khi truyền `KEYS[1] = \"limit:day:CIF9001:20261124\"` và `KEYS[2] = \"limit:month:CIF9001:202611\"`. Cách sửa nào đúng chuẩn mà vẫn phân tải đều các khách hàng trên toàn cụm Cluster?",
        options: [
          "Tách kịch bản Lua ra thành 2 lệnh gọi riêng biệt từ Java: kiểm tra ngày trước rồi kiểm tra tháng sau không dùng Lua nữa.",
          "Đặt cặp dấu ngoặc nhọn Hash Tag bao quanh mã định danh khách hàng trên cả hai key: `\"limit:day:{CIF9001}:20261124\"` và `\"limit:month:{CIF9001}:202611\"`.",
          "Đặt chung một Hash Tag cố định `\"{GLOBAL_LIMIT}:day:CIF9001...\"` cho tất cả mọi khách hàng của ngân hàng.",
          "Gộp toàn bộ hạn mức của 5 triệu khách hàng vào trong một Redis Hash duy nhất tên là `ALL_CUSTOMER_LIMITS`."
        ],
        answer: 1,
        explanation: "Trong Redis Cluster, khi tên key có chứa cặp `{...}`, thuật toán CRC16 chỉ băm đúng chuỗi con nằm bên trong cặp ngoặc nhọn đầu tiên để quyết định Hash Slot. Dùng `{CIF9001}` đảm bảo mọi key hạn mức ngày/tháng của cùng khách hàng `CIF9001` luôn nằm chung trên 1 Shard để chạy Lua nguyên tử, đồng thời các khách hàng khác nhau (`CIF9002`, `CIF9003`...) vẫn được phân tán đều khắp cả 6 Master Shards!",
        wrongReasons: [
          "Tách rời khỏi Lua làm mất tính nguyên tử giữa hạn mức ngày và hạn mức tháng, mở lại lỗ hổng Race Condition khi bắn song song.",
          "",
          "Đặt chung hằng số `{GLOBAL_LIMIT}` sẽ ép toàn bộ 100% khách hàng của ngân hàng dồn hết vào duy nhất 1 Shard, biến 5 Master Shards còn lại thành ngồi chơi xơi nước (Hot Shard Skew)!",
          "Nhồi 5 triệu khách vào 1 Hash duy nhất vừa tạo ra BigKey khổng lồ vừa dồn 100% tải vào 1 node duy nhất trên Cluster."
        ]
      },
      {
        question: "Tại thời điểm 09:00:00 sáng mở phiên giao dịch vàng trực tuyến, key Redis `gold:price:sjc` (chứa bảng giá vàng niêm yết cho 200.000 người đang mở màn hình App làm mới mỗi 2 giây) vừa hết hạn TTL đúng lúc phòng Nguồn vốn cập nhật giá mới. Ngay giây đó, 30.000 request cùng gặp Cache Miss và đổ ập xuống Database làm treo nghẽn cả cụm dịch vụ. Kiến trúc tái thiết kế nào giải quyết êm ái nhất bài toán Hot-Key này?",
        options: [
          "Tăng `maximum-pool-size` của HikariCP lên 5.000 kết nối để cả 30.000 request cùng đọc Database một lúc.",
          "Kết hợp Near-Cache cục bộ ngắn hạn trên từng Pod (Caffeine L1 TTL 1–2 giây) + Cơ chế Hết hạn Logic (Logical Expiration) hoặc Single-Flight Lock trên Redis L2 để chỉ duy nhất 1 luồng nền cập nhật lại giá mới trong khi các luồng đọc không bao giờ bị chặn hay đập thẳng xuống DB.",
          "Bỏ hoàn toàn TTL trên Redis và bắt nhân viên vận hành đăng nhập SSH vào máy chủ Redis gõ lệnh sửa tay mỗi khi giá vàng đổi.",
          "Dùng `KEYS *gold*` quét kiểm tra trước mỗi lần đọc để biết key sắp hết hạn hay chưa."
        ],
        answer: 1,
        explanation: "Với một Hot-Key bị hàng vạn người đọc đồng thời mỗi giây, việc kết hợp Caffeine L1 trên từng Pod (gánh 99% lượt đọc ngay trong RAM của JVM không tốn mạng) cùng cơ chế cập nhật chủ động / Logical Expiration trên Redis L2 triệt tiêu hoàn toàn hiện tượng 30.000 luồng cùng lao xuống Database khi hết hạn TTL.",
        wrongReasons: [
          "Mở 5.000 kết nối vật lý xuống Database sẽ đánh sập ngay lập tức máy chủ CSDL vì bão Context Switching.",
          "",
          "Thao tác gõ tay SSH lên Production Redis vi phạm nghiêm trọng quy chuẩn bảo mật và tự động hóa của ngân hàng, dễ gây sai sót con người.",
          "Lệnh `KEYS *` quét toàn bộ không gian khóa trên luồng đơn sẽ làm đóng băng (freeze) hoàn toàn máy chủ Redis trên Production — lệnh này thậm chí phải bị đổi tên/vô hiệu hóa trong `redis.conf`!"
        ]
      }
    ]
  },

  D5: {
    duration: "65 phút",
    difficulty: "Kiến trúc Sư (Principal / Architect)",
    codeLang: "java",
    teacherIntro: "Chào em, hôm nay thầy trò mình bước lên tầm nhìn toàn cục của một Principal Backend Architect quản trị hạ tầng dữ liệu cấp độ Ngân hàng Tier-1: **High Availability (HA), Định cỡ HikariCP, Độ trễ Read Replica và Database Sharding!** Anh kể em nghe hai cú vấp ngã nhớ đời ở quy mô cụm lớn: Cú ngã thứ nhất vào đợt cao điểm cận Tết — khi thấy log báo `HikariPool-1 - Connection is not available`, một kỹ sư vận hành nghĩ đơn giản 'thiếu kết nối thì tăng thêm!', liền sửa cấu hình `maximum-pool-size` từ 20 lên **200** cho 15 Pod Kubernetes của dịch vụ Thanh toán = **3.000 kết nối vật lý** cắm thẳng vào máy chủ PostgreSQL 24 nhân CPU! Vừa rollout xong chưa đầy 2 phút, toàn bộ hệ thống đứng hình hoàn toàn: CPU của DB vọt 100% đỏ rực ở phần nhân hệ điều hành (`%sys` Context Switching), TPS rơi tự do từ 3.200 về con số 40! Cú ngã thứ hai đến ngay sau khi đội kiến trúc tách các hàm đọc sang cụm Read Replica để giảm tải cho Primary: một khách hàng doanh nghiệp vừa bấm chuyển 500 triệu báo thành công, quay ra màn hình danh sách tài khoản đọc trúng con Read Replica đang trễ đồng bộ 900 mili-giây nên vẫn thấy nguyên số dư cũ chưa trừ — kế toán tưởng mạng lag chưa đi tiền liền lập lệnh chuyển tiếp lần 2 mất đứt 1 tỷ đồng! Hôm nay anh sẽ trao cho em công thức toán học và mẫu code hóa giải trọn vẹn những bài toán hóc búa này.",
    analogy: {
      title: "Phòng giao dịch 16 quầy với 3.000 người chen lấn & Chiếc gương chiếu chậm nửa nhịp",
      body: "Em hãy tưởng tượng một chi nhánh ngân hàng có đúng 16 giao dịch viên cực giỏi (16 CPU cores). Nếu bác bảo vệ ngoài cửa (HikariCP + PgBouncer) chỉ mở cửa cho tối đa 35 khách bước vào ngồi ghế làm việc một lúc, còn những người đến sau bấm số chờ ngoài sảnh chỉ tốn 2 mili-giây, thì 16 giao dịch viên làm việc liền mạch vèo vèo giải quyết hàng nghìn hồ sơ mỗi phút! Ngược lại, nếu tháo cửa cho cả 3.000 người ùa vào vây kín bàn (Pool Size quá lớn), giao dịch viên cứ gõ được 1 phím lại bị người bên cạnh kéo áo hỏi ngang (CPU Context Switch) — rốt cuộc không một hồ sơ nào xong nổi! Còn lỗi **Read Replica Lag** giống như việc em vừa rút 10 triệu ở Quầy Chính xong đã chạy ngay sang màn hình Tivi phụ ở phòng chờ để soi số dư: dây tín hiệu truyền sang Tivi phụ chậm mất 1 giây nên trên màn hình vẫn hiện con số cũ lúc chưa rút!"
    },
    objectives: [
      "Tính toán chính xác kích thước HikariCP Connection Pool theo công thức thực nghiệm của PostgreSQL/Hikari kết hợp kiến trúc đa Pod trên Kubernetes và bộ dồn kết nối PgBouncer.",
      "Thiết kế kiến trúc CSDL sẵn sàng cao (Patroni / Oracle Data Guard) đạt mục tiêu **RPO = 0** (không mất giao dịch khi sập DC) và chống hiện tượng não đôi (**Split-Brain**).",
      "Xử lý triệt để lỗi **Read-Your-Own-Writes** do Read Replica Lag bằng kỹ thuật định tuyến thông minh Sticky-Primary, và nắm vững nguyên tắc chọn **Sharding Key** cũng như hạch toán liên Shard khi vượt trần 1 máy chủ ghi."
    ],
    flow: [
      {
        step: "1. Hoạch định Ngân sách Kết nối Toàn cục (Connection Budgeting + PgBouncer)",
        detail: "Xác định ngưỡng Active Connections tối ưu của máy chủ DB theo công thức `(CPU_Cores * 2) + Effective_Spindle`, đặt PgBouncer ở chế độ `transaction pooling` và khóa trần `maximum-pool-size` nhỏ gọn (10–25) trên mỗi Pod K8s."
      },
      {
        step: "2. Dựng Cụm HA Đa Node Bảo toàn RPO = 0 (Quorum Sync Standby)",
        detail: "Triển khai 1 Primary ghi đồng bộ WAL sang tối thiểu 1 Synchronous Standby (`RPO = 0`) trước khi báo Commit, đồng thời sao chép bất đồng bộ sang các Read Replicas gánh luồng đọc lớn."
      },
      {
        step: "3. Định tuyến Đọc Thông minh Chống Số dư Cũ (Sticky-Primary Routing)",
        detail: "Khi khách hàng vừa thực hiện giao dịch ghi, gắn cờ ngắn hạn `rw:cif:{cif}` (TTL 3 giây) trên Redis; `AbstractRoutingDataSource` tự động lái các lượt đọc ngay sau đó của khách ấy về `PRIMARY`, còn lại phân tải sang `REPLICA`."
      },
      {
        step: "4. Phân mảnh Chiều ngang khi Chạm trần Ghi (Horizontal Sharding + Clearing GL)",
        detail: "Khi một Primary duy nhất đã tối ưu hết cỡ vẫn chạm trần IOPS ghi, phân mảnh theo `customer_cif` / `account_id` và xử lý chuyển tiền liên Shard qua Saga + Tài khoản trung gian đối ứng (Internal Clearing GL)."
      }
    ],
    sections: [
      {
        heading: "1. Công thức Định cỡ HikariCP Chuẩn Xác & Cạm bẫy Nhân bản HPA trên Kubernetes",
        paragraphs: [
          "Trực giác thông thường hay đánh lừa lập trình viên rằng: 'Ứng dụng nhận 1.000 request đồng thời thì cần mở 1.000 DB Connections'. Thực tế vật lý ở tầng phần cứng hoàn toàn ngược lại! Mỗi kết nối vật lý vào PostgreSQL là một tiến trình hệ điều hành riêng biệt (`postgres backend process` ngốn ~5–10 MB RAM riêng + bảng quản lý khóa). Nhóm chuyên gia hiệu năng PostgreSQL và tác giả Brett Wooldridge của HikariCP đã chứng minh công thức vàng định cỡ số lượng kết nối hoạt động tối ưu trên một máy chủ DB là: **`Connections = (Core_Count * 2) + Effective_Spindle_Count`**. Với ổ cứng NVMe SSD hiện đại (hệ số spindle xấp xỉ 1–2), một máy chủ Database 16 vCPU đạt thông lượng giao dịch cực đại khi tổng số kết nối đang chạy truy vấn đồng thời chỉ nằm ở khoảng **35 đến 50 kết nối**! Khi em đẩy lên 1.000–3.000 kết nối, bộ lập lịch của nhân Linux phải cắt lát thời gian chuyển đổi ngữ cảnh (Context Switching) liên tục, làm bay sạch bộ nhớ đệm L1/L2/L3 của CPU và gây nghẽn cổ chai nghiêm trọng trên Spinlock / LWLock quản lý `shared_buffers`!",
          "Trong kiến trúc Microservices chạy trên Kubernetes có bật tự động mở rộng Pod (**HPA - Horizontal Pod Autoscaler**), bài toán chia ngân sách kết nối càng sống còn: Giả sử cụm DB giới hạn `max_connections = 500` nhưng em có 8 dịch vụ cùng trỏ vào, mỗi dịch vụ có thể scale tối đa lên 10 Pod = **80 Pod tổng cộng**! Nếu mỗi Pod hồn nhiên để mặc định hoặc đặt `maximum-pool-size = 30`, lúc cao điểm HPA bung hết cỡ sẽ sinh ra `80 * 30 = 2.400` kết nối làm nổ lỗi `FATAL: sorry, too many clients already` đánh sập các Pod mới khởi tạo! Chuẩn kiến trúc Ngân hàng giải bài toán này bằng 2 lớp: (1) Trên từng Pod Spring Boot, đặt Pool kích thước cố định vừa khít (`maximum-pool-size = 15`, `minimum-idle = 15` — không cho co giãn lúc đang bão tải, kèm `connection-timeout = 3000ms` để Fail-fast trong 3 giây thay vì mặc định 30 giây); (2) Đặt một tầng **PgBouncer chạy chế độ `pool_mode = transaction`** phía trước PostgreSQL: PgBouncer nhận giữ hàng nghìn kết nối TCP nhàn rỗi từ 80 Pod Java nhưng chỉ mượn đúng **40–60 kết nối vật lý thực sự** xuống PostgreSQL trong đúng vài mili-giây giao dịch đang chạy SQL!"
        ],
        bullets: [
          "Tại sao HikariCP khuyên đặt minimum-idle bằng maximum-pool-size: Nếu để `minimum-idle = 2` và `max = 20`, đúng khoảnh khắc bão tải ập đến lúc 09:00 sáng, các luồng giao dịch phải đứng chờ bắt tay TCP + TLS + xác thực SCRAM-SHA-256 mở thêm 18 kết nối mới ngay lúc hệ thống căng thẳng nhất!",
          "Thiết lập max-lifetime ngắn hơn ngưỡng cắt của Firewall/PgBouncer: Luôn đặt `spring.datasource.hikari.max-lifetime = 1500000` (25 phút, ngắn hơn ngưỡng 30 phút của Network Firewall / Load Balancer nội bộ) để Hikari chủ động xoay vòng kết nối êm ái, tránh lỗi `Connection reset by peer` giữa giao dịch.",
          "Bật leak-detection-threshold = 5000 trên môi trường UAT/Staging: Tự động in đầy đủ Stacktrace chỉ đích danh dòng code Java nào mượn kết nối quá 5 giây chưa trả (thường do gọi HTTP đối tác bên trong `@Transactional` hoặc quên đóng `Stream` kết quả JPA!).",
          "Tách Pool riêng cho luồng Batch / Báo cáo nội bộ: Không bao giờ cho phép một câu truy vấn xuất báo cáo của nhân viên vận hành chạy chung HikariCP Pool với luồng chuyển tiền 24/7 của khách hàng!"
        ]
      },
      {
        heading: "2. Kiến trúc High Availability (RPO = 0), Chống Split-Brain & Trị dứt điểm Read Replica Lag",
        paragraphs: [
          "Đối với hệ thống tài chính - ngân hàng, Ngân hàng Nhà nước yêu cầu chỉ số **RPO (Recovery Point Objective — Lượng dữ liệu cho phép mất khi thảm họa) phải bằng 0** cho sổ cái giao dịch và **RTO (Recovery Time Objective — Thời gian khôi phục) tính bằng giây/phút**. Nếu chỉ dùng Asynchronous Replication thông thường, khi máy chủ Primary cháy bo mạch hoặc đứt điện phòng máy trước khi kịp đẩy vài MB WAL cuối cùng sang máy phụ, việc nâng cấp máy phụ lên làm Primary mới sẽ làm bốc hơi các giao dịch vừa báo thành công! Vì vậy, cụm CSDL Core Banking (vận hành bằng **Patroni + etcd/Consul** cho PostgreSQL hoặc **Oracle Maximum Availability Architecture / Active Data Guard**) luôn triển khai cấu hình **Quorum Synchronous Replication** tối thiểu 3 nút vật lý trải trên các vùng độc lập: **1 Primary + ít nhất 1 Synchronous Standby + 1..N Async Read Replicas**. Khi bật `synchronous_commit = on` (hoặc `remote_apply`), lệnh `COMMIT` trên Primary chỉ trả kết quả thành công về cho ứng dụng Java sau khi bản ghi WAL đã được ghi bền vững xuống đĩa của cả Primary lẫn Sync Standby! Đồng thời, Patroni sử dụng cơ chế khóa thuê bao có thời hạn (DCS Leader Lease) kết hợp phần cứng cắt nguồn/mạng tự động (**Fencing / Watchdog**) để đảm bảo nếu Primary cũ bị đứt mạng cô lập, nó lập tức tự hạ cấp thành chỉ đọc trước khi Standby mới lên ngôi — ngăn chặn tuyệt đối thảm họa **Split-Brain** (hai máy chủ cùng nhận ghi lệch sổ cái)!",
          "Giờ hãy giải quyết cơn đau đầu thực tế nhất khi tận dụng các **Async Read Replicas** để san sẻ tải đọc: bởi vì dữ liệu truyền từ Primary sang Read Replica và phát lại (WAL Replay) là bất đồng bộ, luôn tồn tại một khoảng trễ **Replication Lag** từ vài mili-giây lúc bình thường đến vài giây khi hệ thống chạy lô lớn. Nếu khách vừa chuyển tiền xong (ghi vào `PRIMARY`), màn hình App gọi liền API `GET /api/v1/accounts/summary` gắn `@Transactional(readOnly = true)` bị lái sang `REPLICA`, khách sẽ nhìn thấy **số dư cũ trước khi chuyển** (vi phạm tính nhất quán **Read-Your-Own-Writes**)! Trong thực chiến ngân hàng, chúng ta hóa giải bài toán này cực kỳ gọn gàng bằng **Mẫu thiết kế Sticky-Primary Window**: (1) Ngay sau khi một khách hàng `CIF` thực hiện bất kỳ giao dịch làm thay đổi dữ liệu thành công trên `PRIMARY`, một Interceptor/Filter tự động đặt một dấu cờ siêu nhẹ trên Redis `SET rw:cif:{CIF} 1 EX 3` (tồn tại trong 3–5 giây — dư sức cho mọi Read Replica bắt kịp!); (2) Trong bộ định tuyến `AbstractRoutingDataSource`, mặc dù hàm gắn `@Transactional(readOnly = true)`, nếu kiểm tra thấy cờ `rw:cif:{CIF}` đang tồn tại (hoặc API thuộc nhóm nhạy cảm yêu cầu đọc tươi 100%), nó tự động định tuyến về `PRIMARY`; hết 3 giây đó, 99% lượt xem thông thường lại êm ái chảy sang `REPLICA`!"
        ],
        bullets: [
          "Sự khác biệt giữa synchronous_commit = on vs remote_apply: Mức `on` đảm bảo WAL đã nằm trên đĩa của Sync Standby (`RPO = 0`), nhưng tiến trình Replay vào RAM của Standby có thể vẫn trễ 1–2ms; mức `remote_apply` chờ tới khi Standby đã áp dụng xong vào bộ nhớ nên đọc ngay trên Sync Standby cũng thấy dữ liệu mới 100% (đổi lại độ trễ ghi nhỉnh hơn một chút).",
          "Tự động rút Read Replica bị trễ cao khỏi Load Balancer: Luôn có Healthcheck đo độ lệch `pg_wal_lsn_diff` hoặc `EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))`; nếu một Replica bị lag vượt quá 5 giây, HAProxy / Proxy tự động ngắt lưu lượng đọc khỏi node đó ngay lập tức!",
          "Trả luôn trạng thái mới nhất trong Response của lệnh Ghi: Trên thiết kế API chuyển tiền, biên lai trả về `TransferReceiptDto` nên đính kèm luôn `newAvailableBalance` vừa tính trực tiếp từ giao dịch ghi trên Primary để giao diện Mobile cập nhật ngay không cần gọi lại API đọc phụ.",
          "Bẫy LazyInitialization và @Transactional(readOnly = true): Trong Spring Boot, `@Transactional(readOnly = true)` vừa báo cho Hibernate tắt cơ chế Dirty Checking giảm 30–40% tốn kém bộ nhớ Heap, vừa là tín hiệu chuẩn để `AbstractRoutingDataSource` chuyển luồng kết nối sang Read Replica."
        ]
      },
      {
        heading: "3. Database Sharding trong Ngân hàng: Khi nào cần và Chọn Sharding Key sao cho không hối hận?",
        paragraphs: [
          "Khi tham gia phỏng vấn System Design vị trí Senior/Lead, rất nhiều ứng viên vừa nghe đề bài 'Thiết kế hệ thống thanh toán 2.000 TPS' đã vội vàng vẽ ngay 16 Database Shards! Anh nhắc em một chân lý từ thực tiễn vận hành Core Banking: **Sharding là phương sách cuối cùng, không phải lựa chọn đầu tiên!** Ngay khi em bẻ một CSDL nguyên khối thành nhiều Shard vật lý độc lập, em đánh mất khả năng `JOIN` liên Shard, đánh mất ràng buộc khóa ngoại toàn cục, đánh mất giao dịch ACID một pha khi chuyển tiền giữa 2 khách hàng khác Shard, và tăng gấp bội độ phức tạp vận hành/migration! Một cụm PostgreSQL 16 hoặc Oracle tinh chỉnh chuẩn trên phần cứng NVMe hiện đại kết hợp Partitioning bảng + Read Replicas + Redis dư sức gánh mượt mà **5.000 – 12.000 TPS ghi sổ cái**! Em chỉ thực sự bước sang **Horizontal Sharding** (dùng Citus, Apache ShardingSphere hoặc tầng định tuyến ứng dụng) khi ngân hàng vượt ngưỡng vài chục triệu khách hàng hoạt động cực kỳ sôi động khiến băng thông ghi WAL/IOPS của 1 máy chủ Primary duy nhất chạm trần vật lý hoặc yêu cầu cô lập vùng thất bại (Blast Radius Isolation — nếu 1 Shard bảo trì chỉ ảnh hưởng 1/16 tập khách hàng thay vì toàn ngân hàng).",
          "Khi đã quyết định Sharding hệ thống tài khoản & sổ cái, việc chọn **Sharding Key (Khóa phân mảnh)** là quyết định kiến trúc không thể quay đầu: tiêu chí số 1 là phải có độ phân tán đều (High Cardinality, không bị lệch tải dồn cục vào 1 Shard như khi băm theo Mã tỉnh thành hay Ngày mở tài khoản) và gom trọn 95% truy vấn của một người dùng vào đúng 1 Shard duy nhất. Trong ngân hàng, khóa chuẩn nhất là **`account_id` hoặc `customer_cif`** (thường nhúng luôn mã `shard_id` 2 chữ số ngay trong cấu trúc số tài khoản nội bộ để nhìn vào số tài khoản là định tuyến thẳng tới đúng Shard mà không cần bảng tra cứu trung gian!). Thế còn bài toán kinh điển: **Khách hàng A (nằm ở Shard #01) chuyển 10 triệu đồng cho Khách hàng B (nằm ở Shard #02)** thì đảm bảo toàn vẹn kế toán kép kiểu gì? Tuyệt đối KHÔNG dùng giao thức khóa hai pha `2PC / XA` vì nó khóa giữ dòng qua mạng giữa các cụm DB gây nghẽn thảm khốc! Thay vào đó, Core Banking xử lý hệt như chuyển tiền liên ngân hàng thông qua **Saga Orchestration + Transactional Outbox + Tài khoản Trung gian Thanh toán Nội bộ (Internal Clearing GL Account)** mở trên mỗi Shard: Bước 1 trên Shard #01 thực hiện 1 DB Transaction cục bộ cân bằng tuyệt đối (`Nợ Tài khoản A: 10tr` / `Có Clearing GL_Shard01: 10tr` + ghi Outbox); Bước 2 Kafka đẩy lệnh sang Shard #02 thực hiện DB Transaction cục bộ thứ hai (`Nợ Clearing GL_Shard02: 10tr` / `Có Tài khoản B: 10tr`) — nếu Shard #02 từ chối vì tài khoản B đã đóng, Saga phát lệnh đảo bút toán hoàn tiền lại cho A trên Shard #01 và tổng số dư toàn bộ các tài khoản `Clearing GL` trên mọi Shard cuối ngày luôn đối soát khớp bằng 0!"
        ],
        bullets: [
          "Thang tiến hóa mở rộng CSDL chuẩn Senior (5 bước): (1) Tối ưu SQL & Covering Index -> (2) Tách Read Replicas + Cache -> (3) Chia bảng Partitioning + Lưu trữ lạnh -> (4) Tách DB theo miền Microservice (Functional Decomposition) -> (5) Cuối cùng mới Horizontal Sharding từng bảng cốt lõi!",
          "Nhúng Shard ID vào định danh nghiệp vụ (Smart ID Routing): Ví dụ cấu trúc mã giao dịch/tài khoản chứa sẵn 2 bit/chữ số định danh Shard giúp cả API xem tài khoản lẫn tra cứu giao dịch đều đi thẳng 1-hop tới đúng Shard mà không bao giờ phải quét mù khắp mọi Shard (`Scatter-Gather`).",
          "Đồng bộ luồng tìm kiếm toàn cục bằng CQRS: Khi dữ liệu đã nằm rải rác trên 16 Shards, màn hình Chăm sóc khách hàng hoặc Kiểm toán muốn tìm theo Số điện thoại / CCCD / Nội dung chuyển khoản sẽ đọc từ kho chỉ mục tổng hợp (OpenSearch / ClickHouse / Lookup Table) được nuôi thời gian thực từ Debezium CDC của cả 16 Shards.",
          "Chiến lược Resharding không dừng hệ thống: Luôn khởi đầu bằng số lượng **Logical Shards** lớn hơn số máy vật lý (ví dụ chia sẵn 64 Logical Schemas đặt trên 4 máy vật lý — mỗi máy giữ 16 schemas); khi cần nhân đôi phần cứng lên 8 máy, chỉ việc sao chép WAL di chuyển nguyên từng Logical Schema sang máy mới mà không phải tính lại hàm băm từng dòng!"
        ]
      }
    ],
    comparison: {
      title: "Ma trận Đánh đổi Kiến trúc Sẵn sàng Cao, Pool Kết nối & Phân mảnh CSDL Ngân hàng",
      headers: ["Giải pháp Kiến trúc", "Độ Nhất quán & RPO", "Tác động Độ trễ & Khả năng Mở rộng", "Ngữ cảnh Áp dụng Chuẩn Ngân hàng"],
      rows: [
        [
          "HikariCP Fixed Small Pool + PgBouncer",
          "Giữ nguyên giao dịch ACID 100% trên Primary.",
          "Triệt tiêu bão Context Switching trên DB, cho phép hàng trăm Pod K8s chia sẻ êm ái 50 kết nối vật lý.",
          "Bắt buộc cho mọi cụm Microservices chạy trên Kubernetes kết nối vào PostgreSQL."
        ],
        [
          "Primary + Quorum Sync Standby (Patroni / DataGuard)",
          "`RPO = 0` tuyệt đối (không mất giao dịch đã Commit khi sập máy chủ chính).",
          "Cộng thêm ~0.3–1.5ms độ trễ mạng LAN giữa các vùng (AZ) cho mỗi lệnh `COMMIT`.",
          "Chuẩn bắt buộc cho Core Ledger, Tài khoản, Thẻ và Cổng Thanh toán Liên ngân hàng."
        ],
        [
          "Async Read Replicas + Sticky-Primary Routing",
          "Đảm bảo **Read-Your-Own-Writes** cho người vừa giao dịch; nhất quán cuối cùng (vài trăm ms) cho người xem khác.",
          "Giải phóng 70–85% tải đọc khỏi Primary mà khách hàng không bao giờ gặp lỗi nhìn thấy số dư cũ.",
          "Màn hình Trang chủ App Mobile Banking, Lịch sử giao dịch, Tra cứu danh mục & Sao kê."
        ],
        [
          "Horizontal Sharding + Clearing GL Saga",
          "ACID tức thời trên từng Shard (nhờ tài khoản đối ứng Clearing GL) và Nhất quán cuối cùng liên Shard.",
          "Mở rộng tuyến tính băng thông ghi lên hàng chục nghìn TPS, nhưng tăng cao độ phức tạp vận hành & đối soát.",
          "Ngân hàng số / Siêu ví quy mô hàng chục triệu người dùng vượt trần ghi của 1 máy chủ vật lý."
        ]
      ]
    },
    codeTitle: "Định tuyến Thông minh Read-Your-Own-Writes chống Replica Lag & Cấu hình HikariCP Chuẩn (Spring Boot 3)",
    code: [
      "public class BankingReadWriteRoutingDataSource extends AbstractRoutingDataSource {",
      "    private final StringRedisTemplate redis;",
      "    public BankingReadWriteRoutingDataSource(StringRedisTemplate redis) { this.redis = redis; }",
      "",
      "    @Override",
      "    protected Object determineCurrentLookupKey() {",
      "        boolean isReadOnlyTx = TransactionSynchronizationManager.isCurrentTransactionReadOnly();",
      "        if (!isReadOnlyTx) {",
      "            markRecentWriteForCurrentCustomer(); // Đánh dấu khách vừa có giao dịch ghi!",
      "            return \"PRIMARY\";",
      "        }",
      "        String cif = SecurityCifContext.currentCifOrNull();",
      "        // Nếu khách vừa chuyển tiền trong 3 giây qua -> ép đọc từ PRIMARY tránh thấy số dư cũ!",
      "        if (cif != null && Boolean.TRUE.equals(redis.hasKey(\"rw:sticky:{\" + cif + \"}\"))) {",
      "            return \"PRIMARY\";",
      "        }",
      "        return \"REPLICA\";",
      "    }",
      "",
      "    private void markRecentWriteForCurrentCustomer() {",
      "        String cif = SecurityCifContext.currentCifOrNull();",
      "        if (cif != null) {",
      "            redis.opsForValue().set(\"rw:sticky:{\" + cif + \"}\", \"1\", Duration.ofSeconds(3));",
      "        }",
      "    }",
      "",
      "    public static HikariDataSource buildTunedBankingPool(String jdbcUrl, String user, String pass) {",
      "        HikariConfig cfg = new HikariConfig();",
      "        cfg.setJdbcUrl(jdbcUrl); cfg.setUsername(user); cfg.setPassword(pass);",
      "        cfg.setMaximumPoolSize(20);          // Nhỏ gọn theo công thức (Cores * 2) chia cho số Pod",
      "        cfg.setMinimumIdle(20);              // Fixed-size pool chống giật độ trễ khi bão tải",
      "        cfg.setConnectionTimeout(3000);      // Fail-fast sau 3s thay vì treo 30s mặc định",
      "        cfg.setMaxLifetime(1_500_000);       // 25 phút (< Firewall/PgBouncer idle timeout)",
      "        return new HikariDataSource(cfg);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Bọc LazyConnectionDataSourceProxy phía ngoài RoutingDataSource trong thực tế: Trong Spring/JPA mặc định, kết nối vật lý thường bị mượn ngay lúc bắt đầu khởi tạo Transaction trước khi cờ `readOnly` kịp gắn xong — vì vậy khi đăng ký Bean `@Primary DataSource`, hãy bọc `new LazyConnectionDataSourceProxy(routingDataSource)` để trì hoãn việc gọi `determineCurrentLookupKey()` tới đúng khoảnh khắc câu SQL thực sự chạy!",
      "Cửa sổ Sticky-Primary 3 giây cân bằng hoàn hảo: Chỉ những khách hàng vừa thực sự bấm giao dịch ghi trong 3 giây gần nhất mới đọc vào `PRIMARY` (đảm bảo 100% trải nghiệm Read-Your-Own-Writes mượt mà), còn 95% khách hàng chỉ mở App xem số dư bình thường vẫn được đẩy sang `REPLICA`.",
      "Xử lý an toàn nếu Redis chậm hoặc lỗi (Fail-open về PRIMARY): Trong code Production đầy đủ, lời gọi `redis.hasKey(...)` được bọc `try/catch` với timeout 20ms — nếu Redis gặp sự cố chập chờn, mặc định trả về `\"PRIMARY\"` để luôn ưu tiên tính đúng đắn dữ liệu tài chính.",
      "Bộ 4 thông số vàng của HikariConfig: `maximumPoolSize = minimumIdle = 20`, `connectionTimeout = 3000ms` và `maxLifetime = 1500000ms` là cấu hình chuẩn mực đã qua thử lửa tại hàng loạt ngân hàng lớn."
    ],
    labGuide: {
      goal: "Thực hành tính toán ngân sách kết nối HikariCP cho cụm 10 Pod K8s và dựng mô phỏng Primary + Read Replica (có độ trễ giả lập 1 giây) để kiểm chứng `BankingReadWriteRoutingDataSource` khắc phục hoàn toàn lỗi thấy số dư cũ sau khi chuyển tiền.",
      steps: [
        "Bước 1: Bài tập tính toán kiến trúc: Cho máy chủ PostgreSQL 16 vCPU NVMe (`max_connections = 300`, ngưỡng tối ưu đồng thời ~40 active connections) phục vụ 2 dịch vụ (`core-ledger` scale tối đa 10 Pod, `account-query` scale tối đa 10 Pod). Thiết lập thông số HikariCP `maximum-pool-size = 12` cho mỗi Pod kết hợp file cấu hình `pgbouncer.ini` (`pool_mode = transaction`, `default_pool_size = 40`, `max_client_conn = 1000`).",
        "Bước 2: Dựng 2 DataSource trong Spring Boot Test (`primaryDs` và `replicaDs`), bọc qua `BankingReadWriteRoutingDataSource` + `LazyConnectionDataSourceProxy`.",
        "Bước 3: Mô phỏng Replication Lag 1 giây (cập nhật số dư tài khoản của `CIF001` từ 10 triệu xuống 8 triệu trên `primaryDs` trong khi `replicaDs` chưa kịp đồng bộ vẫn giữ 10 triệu); gọi ngay hàm `@Transactional(readOnly = true) getBalance()` với ngữ cảnh `CIF001` — kiểm chứng kết quả trả về đúng **8 triệu** nhờ cờ `rw:sticky:{CIF001}` lái sang `PRIMARY`!",
        "Bước 4: Chờ 3,2 giây cho cờ Redis hết hạn (lúc này bản sao đã đồng bộ xong 8 triệu), gọi lại `getBalance()` hoặc gọi bằng `CIF002` (khách không giao dịch ghi) — xác minh qua metric/log câu truy vấn đã được chuyển êm ái sang `REPLICA`."
      ],
      expectedOutput: "Bảng tính định cỡ kết nối không vượt trần dưới kịch bản Full Auto-scaling 20 Pod, cùng bài Integration Test chứng minh khách vừa chuyển tiền đọc lại trong 0–3s luôn nhận số dư mới nhất từ Primary và sau 3s tự động giảm tải sang Replica."
    },
    examTips: [
      "Mẹo phỏng vấn Senior #1 (Câu hỏi kinh điển HikariCP): Khi hội đồng hỏi 'Hệ thống đang chậm, tăng `hikari.maximum-pool-size` từ 20 lên 300 có làm DB chạy nhanh hơn không?', hãy trả lời dứt khoát: KHÔNG, thậm chí làm sập DB nhanh hơn do bão Context Switching và tranh chấp khóa bộ nhớ! Hãy trích dẫn ngay công thức `(CPU_Cores * 2) + Effective_Spindle` và giải pháp tìm câu SQL chậm / rút ngắn thời gian giữ kết nối + dùng PgBouncer.",
      "Mẹo phỏng vấn Senior #2 (Bẫy `LazyConnectionDataSourceProxy` của Spring): Nếu ứng viên nói dùng `AbstractRoutingDataSource` tách Read/Write trong Spring Data JPA, giám khảo cấp Architect rất hay hỏi xoáy: 'Tại sao gắn `@Transactional(readOnly = true)` rồi mà mọi câu lệnh vẫn chui hết vào Primary?'. Trả lời trúng huyệt `JpaTransactionManager` lấy connection sớm trước khi đồng bộ cờ `readOnly`, nên cần bọc `LazyConnectionDataSourceProxy` sẽ khiến hội đồng gật đầu thán phục ngay!",
      "Trong bài thi System Design khi buộc phải Sharding Core Banking: Luôn chủ động nêu phương án giải quyết **Cross-Shard Transfer** bằng **Saga + Outbox + Tài khoản đối ứng Internal Clearing GL** thay vì dùng Distributed Lock / XA 2PC."
    ],
    summaryTakeaways: [
      "Đừng bao giờ đặt HikariCP Pool Size khổng lồ: một máy chủ DB 16 nhân chỉ chạy tối ưu nhất với 35–50 kết nối hoạt động đồng thời; hãy giữ Pool mỗi Pod nhỏ cố định (10–25) và đặt PgBouncer phía trước.",
      "Kiến trúc HA Ngân hàng bắt buộc dùng Quorum Synchronous Standby để đảm bảo `RPO = 0` và cơ chế DCS Lease + Fencing để triệt tiêu hiểm họa Split-Brain.",
      "Hóa giải lỗi khách hàng nhìn thấy số dư cũ do Read Replica Lag bằng kỹ thuật Sticky-Primary Window (gắn cờ người dùng vừa ghi trong 3–5 giây đọc thẳng từ Primary).",
      "Chỉ thực hiện Horizontal Sharding ở chặng cuối cùng khi đã khai thác hết Index, Partitioning và Read Replicas; chọn khóa phân mảnh có độ phân tán cao (`account_id`/`cif`) và xử lý giao dịch liên Shard bằng Clearing GL + Saga."
    ],
    lessonQuestions: [
      {
        question: "Một cụm dịch vụ Thanh toán Ngân hàng chạy trên Kubernetes gồm 20 Pod Spring Boot kết nối trực tiếp (không qua PgBouncer) vào một máy chủ PostgreSQL Primary có cấu hình 16 vCPU và ổ cứng NVMe SSD. Trong đợt kiểm thử tải cao, đội ngũ phát hiện mỗi Pod đang cấu hình `spring.datasource.hikari.maximum-pool-size = 150` (tổng 3.000 kết nối mở xuống DB), dẫn đến CPU máy chủ DB luôn kẹt ở mức 99% `sy` (System Kernel Context Switching) và độ trễ P99 vọt lên 9 giây. Phương án tinh chỉnh nào đúng nguyên lý kỹ thuật nhất?",
        options: [
          "Tăng tiếp `maximum-pool-size` lên 300 cho mỗi Pod để các luồng HTTP của Tomcat không phải chờ lấy kết nối.",
          "Hạ `maximum-pool-size` (và `minimum-idle`) của mỗi Pod xuống mức nhỏ gọn (ví dụ 10–15 kết nối) kết hợp triển khai PgBouncer ở chế độ `transaction pooling` giữ khoảng 40–50 kết nối vật lý hoạt động xuống PostgreSQL 16 vCPU, đồng thời đặt `connection-timeout = 3000ms`.",
          "Chuyển toàn bộ các giao dịch ghi trừ tiền sang chạy trên các máy chủ Read Replica để chia tải cho Primary.",
          "Đặt `max-lifetime = 0` (vô hạn) và tắt hoàn toàn Connection Pool để mỗi câu lệnh SQL tự mở một kết nối TCP mới rồi đóng ngay."
        ],
        answer: 1,
        explanation: "Theo công thức thực nghiệm `(core_count * 2) + effective_spindle_count`, máy chủ PostgreSQL 16 vCPU đạt hiệu suất đỉnh ở ngưỡng ~35–50 kết nối thực thi đồng thời. Hạ kích thước Pool từng Pod kết hợp PgBouncer `transaction pooling` giúp hàng trăm luồng từ 20 Pod dùng chung hiệu quả 40–50 tiến trình DB mà không gây bão Context Switching ở nhân hệ điều hành!",
        wrongReasons: [
          "Tăng lên 6.000 kết nối sẽ đánh sập hoàn toàn máy chủ PostgreSQL do tràn RAM cấp phát cho backend processes và nghẽn cứng Spinlock.",
          "",
          "Read Replica chỉ nhận dữ liệu nhân bản một chiều và đang ở chế độ chỉ đọc (`hot_standby`), hoàn toàn không thể tiếp nhận lệnh ghi trừ tiền.",
          "Mở mới kết nối TCP + TLS + xác thực PostgreSQL cho từng câu SQL tốn hàng chục mili-giây mỗi lệnh và làm nổ cạn cổng mạng Ephemeral Ports ngay lập tức."
        ]
      },
      {
        question: "Sau khi tách luồng đọc `@Transactional(readOnly = true)` sang cụm Asynchronous Read Replica, bộ phận Chăm sóc Khách hàng nhận phản ánh: khách hàng vừa hoàn tất chuyển khoản 50 triệu đồng và nhận biên lai thành công, nhưng khi ứng dụng tự động chuyển về màn hình Trang chủ gọi API lấy danh sách số dư ngay lập tức (cách 80ms) thì vẫn hiển thị số dư cũ chưa trừ 50 triệu (do Read Replica trễ 350ms). Giải pháp kiến trúc nào xử lý triệt để vấn đề này mà vẫn giữ được lợi ích giảm tải của Read Replica?",
        options: [
          "Đặt `Thread.sleep(5000)` cứng trong mọi API đọc số dư trên toàn hệ thống để chờ tất cả Replica đồng bộ xong.",
          "Gỡ bỏ hoàn toàn cụm Read Replica và ép 100% lưu lượng đọc của toàn bộ khách hàng quay về đập vào máy chủ Primary mọi lúc.",
          "Áp dụng mẫu **Sticky-Primary cho Read-Your-Own-Writes**: khi một khách hàng `CIF` vừa thực hiện giao dịch ghi thành công, đánh dấu cờ ngắn hạn `rw:sticky:{CIF}` (TTL 3–5 giây) để bộ định tuyến DataSource lái riêng các lượt đọc của khách hàng đó trong 3–5 giây đầu về `PRIMARY` (kết hợp trả kèm số dư mới ngay trong response giao dịch), sau đó tự động quay lại đọc từ `REPLICA`.",
          "Tắt kiểm tra khóa ngoại và tắt WAL trên máy chủ Primary để truyền dữ liệu sang Replica nhanh hơn."
        ],
        answer: 2,
        explanation: "Mẫu thiết kế Sticky-Primary giải quyết chính xác bài toán **Read-Your-Own-Writes Consistency**: chỉ đúng vị khách vừa có thao tác ghi trong vài giây gần nhất mới được định tuyến đọc về Primary (đảm bảo nhìn thấy ngay kết quả giao dịch của chính mình 100%), trong khi đại đa số lưu lượng xem thông thường của hàng triệu khách hàng khác vẫn được san tải sang cụm Read Replica.",
        wrongReasons: [
          "`Thread.sleep(5000)` làm đóng băng luồng xử lý suốt 5 giây cho mọi người dùng, hủy hoại hoàn toàn trải nghiệm khách hàng và làm cạn kiệt Thread Pool.",
          "Bỏ hoàn toàn Read Replica làm lãng phí tài nguyên hạ tầng và đẩy ngược 100% áp lực đọc sao kê/trang chủ đè nặng lên máy chủ ghi cốt lõi.",
          "",
          "Không thể tắt WAL nếu muốn nhân bản dữ liệu sang Replica (vì bản chất Replication truyền chính luồng WAL!), hơn nữa tắt an toàn dữ liệu trên Core DB là điều cấm kỵ tuyệt đối."
        ]
      }
    ]
  },

  D6: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Production SRE & Data)",
    codeLang: "sql",
    teacherIntro: "Chào em, chúng ta đã đi tới bài khép lại Học phần D — một chủ đề mà chỉ những kỹ sư từng trực tiếp bấm nút Deploy lên hệ thống Ngân hàng 24/7 không dừng một giây nào mới thấm thía hết sự khốc liệt của nó: **Zero-Downtime Schema Migration với Flyway & Đồng bộ Thời gian thực CDC!** Anh kể em nghe sự cố lúc 14:15 chiều thứ Ba từng làm cả tầng Công nghệ đứng tim: Một bản release nhỏ thêm tính năng tra cứu giao dịch đối tác mang theo file Flyway `V58__add_ref_index_and_check.sql` gồm hai câu lệnh tưởng như hiền lành nhất quả đất: `CREATE INDEX idx_tx_partner ON transactions(partner_ref);` và `ALTER TABLE transactions ADD CONSTRAINT chk_amt CHECK (amount > 0);`. Trên môi trường UAT có 20.000 dòng, script chạy vèo xong trong 0,05 giây! Nhưng vừa chạm vào Production nơi bảng `transactions` có **85 triệu dòng** đang nhận 1.500 lệnh/giây: câu `CREATE INDEX` thường khóa cứng toàn bộ quyền ghi trên bảng suốt 4 phút, còn câu `ALTER TABLE` đòi quyền khóa tối thượng `ACCESS EXCLUSIVE LOCK` xếp hàng sau một câu báo cáo đang chạy dở — kích hoạt **Hiệu ứng Domino Hàng đợi Khóa** chặn đứng sạch trơn mọi câu lệnh `SELECT` và `INSERT` chuyển tiền của toàn ngân hàng! Chỉ sau 35 giây, toàn bộ App Mobile Banking trên cả nước xoay vòng trắng xóa! Bài học hôm nay sẽ rèn cho em kỷ luật thép để nâng cấp bảng hàng trăm triệu dòng giữa ban ngày mà hệ thống không chớp mắt dù chỉ 1 mili-giây!",
    analogy: {
      title: "Xây làn cầu mới song song khi xe vẫn chạy 100 km/h thay vì rào chắn đại lộ giờ cao điểm",
      body: "Em hãy hình dung cây cầu huyết mạch nối hai bờ thành phố có 10.000 xe cứu thương và xe chở tiền lưu thông mỗi phút không ngừng nghỉ suốt ngày đêm. Nếu đội kỹ sư cầu đường mang rào chắn ra chặn ngang toàn bộ cây cầu lúc 2 giờ chiều để đục mặt đường mở rộng làn (chạy `ALTER TABLE` khóa độc quyền trực tiếp), giao thông toàn thành phố sẽ vỡ trận ngay trong phút đầu tiên! Ngược lại, kỹ thuật **Expand-and-Contract** của các ngân hàng lớn giống hệt việc âm thầm đóng cọc xây thêm một làn cầu mới sát bên cạnh trong khi xe cộ trên cầu cũ vẫn phóng vèo vèo không hề hay biết (**Expand**); xây xong thì mở lối cho xe mới đi sang cả làn mới và chép bù dữ liệu cũ sang từ từ (**Dual-Write & Backfill**); khi 100% xe đã chạy êm trên cầu mới rồi mới tháo dỡ làn cũ vào tuần sau (**Contract**)!"
    },
    objectives: [
      "Hiểu tận gốc hiểm họa **Lock Queue Domino** của `ACCESS EXCLUSIVE LOCK` trên PostgreSQL và áp đặt kỷ luật cầu chì `SET lock_timeout` + `CREATE INDEX CONCURRENTLY` trong mọi kịch bản Flyway.",
      "Thực thi thuần thục quy trình 4 pha **Expand → Dual-Write & Throttled Backfill → Validate (`NOT VALID` constraint) → Contract** để thay đổi cấu trúc bảng tỷ dòng tương thích hoàn toàn với K8s Rolling Update.",
      "Thiết kế kiến trúc **Log-based Change Data Capture (Debezium CDC)** đọc luồng Logical WAL đồng bộ thời gian thực sang Kafka / OpenSearch và phòng chống thảm họa nổ đầy ổ đĩa do **Replication Slot Bloat**."
    ],
    flow: [
      {
        step: "1. Pha Expand (Mở rộng Không Phá vỡ & Đặt Cầu chì lock_timeout)",
        detail: "Bật `SET lock_timeout = '2s'`, chỉ thêm cột mới cho phép `NULL`, tạo chỉ mục bằng `CREATE INDEX CONCURRENTLY` ngoài giao dịch để cả Pod phiên bản cũ `v1` lẫn Pod mới `v2` đều chạy bình thường khi K8s Rolling Update."
      },
      {
        step: "2. Pha Dual-Write & Backfill Phân lô Nhỏ (Throttled Chunking)",
        detail: "Triển khai code `v2` ghi song song vào cả cột cũ lẫn cột mới (vẫn đọc cột cũ), sau đó chạy tiến trình nền cập nhật dữ liệu lịch sử theo từng lô nhỏ 2.000–5.000 dòng có nghỉ nhịp để không nghẽn WAL và Autovacuum."
      },
      {
        step: "3. Pha Siết Ràng buộc Không Khóa Bảng (NOT VALID → VALIDATE)",
        detail: "Thêm ràng buộc kiểm tra/khóa ngoại với cờ `NOT VALID` (chặn dữ liệu mới sai trong 2ms) rồi chạy `VALIDATE CONSTRAINT` ở mức khóa nhẹ `SHARE UPDATE EXCLUSIVE` không chặn bất kỳ lệnh `SELECT/INSERT/UPDATE` nào."
      },
      {
        step: "4. Pha Contract & Phát Luồng Biến động CDC từ WAL",
        detail: "Chuyển ứng dụng `v3` sang đọc hoàn toàn từ cột mới, gỡ bỏ cột cũ ở đợt phát hành kế tiếp, và dùng Debezium đọc `pgoutput` từ WAL đẩy thay đổi thời gian thực ra hệ sinh thái Kafka/CQRS."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Hiệu ứng Domino của ACCESS EXCLUSIVE LOCK & Kỷ luật Sắt trong Flyway",
        paragraphs: [
          "Rất nhiều lập trình viên thắc mắc với anh: 'Anh ơi, câu lệnh `ALTER TABLE transactions ADD COLUMN channel VARCHAR(20)` trên PostgreSQL chỉ sửa siêu dữ liệu catalog tốn có 2 mili-giây chứ đâu có viết lại bảng, sao nó lại làm treo cả ngân hàng suốt 40 giây?'. Câu trả lời nằm ở cơ chế xếp hàng công bằng của **PostgreSQL Lock Manager**! Mọi lệnh `ALTER TABLE` sửa cấu trúc đều yêu cầu quyền khóa cao nhất là **`ACCESS EXCLUSIVE LOCK`** — loại khóa xung đột với TẤT CẢ mọi thao tác khác, kể cả khóa nhẹ nhất `ACCESS SHARE` của một câu lệnh `SELECT` bình thường! Giả sử lúc 14:15:00.000 đang có 1 giao dịch đối soát hoặc 1 câu truy vấn sao kê chạy mất 15 giây giữ khóa đọc trên bảng `transactions`; đúng lúc 14:15:00.100 Flyway vào xin `ACCESS EXCLUSIVE LOCK` -> vì đang vướng câu đọc kia chưa xong nên lệnh `ALTER TABLE` đứng chờ trong hàng đợi khóa (**Lock Queue**). Và đây là khoảnh khắc tử thần: kể từ mili-giây đó trở đi, **100% các câu lệnh `SELECT`, `INSERT`, `UPDATE` của hàng nghìn khách hàng mới ập đến đều phải xếp hàng chờ phía sau lưng câu lệnh `ALTER TABLE` đó!** Toàn bộ bảng bị đông cứng hoàn toàn chỉ vì 1 câu DDL chờ khóa!",
          "Để không bao giờ trở thành tội đồ làm sập Core Banking giờ hành chính, mọi đội ngũ SRE/DBA ngân hàng áp dụng 3 kỷ luật thép trong Flyway/Liquibase: **Thứ nhất**, dòng đầu tiên của mọi script DDL chạm vào bảng hiện hữu trên Production BẮT BUỘC là `SET lock_timeout = '2s';`! Nếu trong vòng 2 giây không lấy ngay được khóa rảnh, câu lệnh DDL tự động rút lui báo lỗi triển khai cho CI/CD chạy lại sau vài giây chứ tuyệt đối không được đứng ngáng cửa làm chết chùm luồng giao dịch khách hàng! **Thứ hai**, tuyệt đối KHÔNG bao giờ gõ `CREATE INDEX` hay `DROP INDEX` thường trên bảng lớn — bắt buộc phải dùng **`CREATE INDEX CONCURRENTLY`** (quét bảng qua 2 pha mà vẫn cho phép `SELECT/INSERT/UPDATE/DELETE` chạy song song 100%). Vì PostgreSQL cấm chạy `CONCURRENTLY` bên trong khối `BEGIN...COMMIT`, trong Flyway em phải đặt chỉ dẫn `-- flyway:executeInTransaction=false` ở dòng đầu file SQL! **Thứ ba**, hiểu rõ ranh giới giữa thao tác Metadata-only và Table-Rewrite: từ PostgreSQL 11+, `ADD COLUMN status VARCHAR(16) DEFAULT 'NEW'` với hằng số tĩnh chạy tức thời trong 1ms không viết lại bảng, nhưng nếu đổi kiểu dữ liệu cột (`ALTER COLUMN amount TYPE NUMERIC(22,4)`) hoặc `DEFAULT` là hàm biến động (`clock_timestamp()`), DB sẽ **khóa cứng và viết lại mới toàn bộ 85 triệu dòng trên đĩa**!"
        ],
        bullets: [
          "Kiểm tra Index bị lỗi INVALID sau khi dùng CONCURRENTLY: Nếu lệnh `CREATE INDEX CONCURRENTLY` chẳng may thất bại giữa chừng (ví dụ gặp Deadlock hoặc dữ liệu trùng khi đánh Unique Index), nó để lại một Index mang cờ `indisvalid = false` (không dùng cho `SELECT` nhưng vẫn làm chậm `INSERT`!) — cần kiểm tra `pg_index` xóa đi bằng `DROP INDEX CONCURRENTLY` rồi chạy lại.",
          "Tuyệt đối bật spring.jpa.hibernate.ddl-auto = validate (hoặc none) trên Production: Cấm tiệt `update` hay `create` của Hibernate trên môi trường thật; 100% thay đổi cấu trúc CSDL phải đi qua script phiên bản hóa Flyway được kiểm duyệt (Peer Review) chặt chẽ.",
          "Không sửa lại file Flyway đã chạy lên Production: Mọi file `V1__...`, `V2__...` đã áp dụng được Flyway lưu mã băm Checksum trong bảng `flyway_schema_history`; muốn thay đổi thêm bắt buộc phải tạo file phiên bản tiếp theo `V59__...`.",
          "Đặt thêm statement_timeout cho phiên Migration: Kết hợp `SET lock_timeout = '2s'` và `SET statement_timeout = '10min'` (riêng cho lệnh tạo Index lớn chạy nền) giúp kiểm soát chặt chẽ vòng đời mọi tác vụ bảo trì."
        ]
      },
      {
        heading: "2. Nghệ thuật 4 Pha Expand-and-Contract & Tuyệt chiêu Ràng buộc NOT VALID",
        paragraphs: [
          "Hãy đặt mình vào bối cảnh thực tế trên Kubernetes: cụm `payment-service` đang chạy 12 Pod phiên bản `v1`. Khi em bấm Rollout phiên bản `v2` kèm script Flyway chạy trước lúc Pod `v2` đầu tiên khởi động, trong suốt 3–5 phút chuyển giao sẽ luôn có cảnh **6 Pod `v1` cũ và 6 Pod `v2` mới cùng đọc/ghi song song vào chung 1 Database!** Chuyện gì xảy ra nếu trong file Flyway của bản `v2`, em chạy lệnh đổi tên cột `ALTER TABLE transfers RENAME COLUMN acct_no TO account_number` hoặc thêm một cột `NOT NULL` không có giá trị mặc định? Ngay tích tắc script Flyway vừa chạy xong, toàn bộ 12 Pod `v1` đang phục vụ khách hàng thật sẽ nổ tung với hàng nghìn lỗi `ERROR: column \"acct_no\" does not exist` hoặc `null value in column violates not-null constraint`! Vì vậy, mọi thay đổi phá vỡ tương thích ngược (Rename column, Split column, Change data type, Drop column) bắt buộc phải tách thành chuỗi phát hành an toàn **Expand-and-Contract**: **Đợt 1 (Expand + Dual-Write)**: Flyway thêm cột mới `account_number VARCHAR(32) NULL`; code `v2` vẫn đọc từ `acct_no` cũ nhưng khi lưu mới/cập nhật thì ghi đồng thời vào cả `acct_no` lẫn `account_number` (hoặc dùng Trigger trước PostgreSQL); **Đợt 2 (Throttled Backfill)**: Chạy Job quét điền dữ liệu lịch sử từ `acct_no` sang `account_number` theo từng lô nhỏ `LIMIT 5000` kèm `Thread.sleep(50)` để không làm nghẽn I/O hay trễ Read Replica; **Đợt 3 (Switch Read)**: Khi 100% dòng đã đầy đủ, deploy code `v3` chuyển sang đọc/ghi trên cột mới và bỏ tham chiếu cột cũ trong JPA Entity; **Đợt 4 (Contract)**: Ở tuần tiếp theo khi chắc chắn không còn Pod cũ hay phương án Rollback về `v2` nữa, chạy Flyway gỡ bỏ cột cũ an toàn!",
          "Một câu hỏi cực hay nữa trong vòng phỏng vấn Kiến trúc sư: *'Sau khi đã Backfill đầy đủ dữ liệu cho bảng 80 triệu dòng rồi, làm sao đặt ràng buộc `NOT NULL` hoặc `FOREIGN KEY` lên cột mới mà không khóa ghi toàn bảng suốt 5 phút để DB quét kiểm tra 80 triệu dòng?'* Nếu chạy thẳng `ALTER TABLE transfers ALTER COLUMN account_number SET NOT NULL;` hay `ADD CONSTRAINT fk_acc FOREIGN KEY ...` thông thường, PostgreSQL sẽ giữ `ACCESS EXCLUSIVE` / `SHARE ROW EXCLUSIVE` chặn ghi toàn bảng trong suốt quá trình quét 80 triệu dòng! Tuyệt chiêu đỉnh cao từ PostgreSQL 12+ giải quyết trong tích tắc không khóa bảng gồm 2 bước: **Bước 1** — Thêm ràng buộc kiểm tra với từ khóa **`NOT VALID`**: `ALTER TABLE transfers ADD CONSTRAINT chk_acc_nn CHECK (account_number IS NOT NULL) NOT VALID;` (kèm `SET lock_timeout = '2s'`). Vì có `NOT VALID`, DB KHÔNG quét dữ liệu cũ nên chạy xong trong **1 mili-giây**, đồng thời bắt đầu chặn ngay mọi lệnh `INSERT/UPDATE` mới cố tình đưa `NULL` vào! **Bước 2** — Chạy `ALTER TABLE transfers VALIDATE CONSTRAINT chk_acc_nn;`. Lệnh `VALIDATE` này âm thầm quét kiểm tra toàn bộ 80 triệu dòng cũ nhưng chỉ giữ mức khóa siêu nhẹ `SHARE UPDATE EXCLUSIVE` — cho phép mọi giao dịch đọc và ghi tiền của khách hàng chảy bình thường 100%! Và điều kỳ diệu ở Bước 3 (trên PostgreSQL 12+): một khi ràng buộc `CHECK (col IS NOT NULL)` đã được `VALIDATE` thành công, lệnh `ALTER TABLE transfers ALTER COLUMN account_number SET NOT NULL;` sau đó sẽ nhìn thấy chứng nhận hợp lệ sẵn có và bật cờ `NOT NULL` chính thức ngay lập tức trong **1 mili-giây** mà không cần quét lại bảng nữa!"
        ],
        bullets: [
          "Áp dụng y hệt cho Khóa Ngoại (Foreign Key) trên bảng lớn: Luôn tạo Index trên cột tham chiếu bằng `CREATE INDEX CONCURRENTLY` trước, sau đó chạy `ADD CONSTRAINT fk_... FOREIGN KEY (...) REFERENCES ... NOT VALID;`, rồi cuối cùng chạy `VALIDATE CONSTRAINT fk_...;` — không bao giờ làm nghẽn bảng cha lẫn bảng con!",
          "Quy tắc Backfill an toàn trên bảng tỷ dòng: Không bao giờ chạy một câu đơn `UPDATE transactions SET new_col = old_col WHERE new_col IS NULL;` cho 80 triệu dòng vì nó giữ khóa dòng khổng lồ suốt 30 phút, sinh 100 GB WAL và tạo 80 triệu Dead Tuples một lúc! Luôn chia thành các giao dịch nhỏ 2.000–5.000 dòng theo dải `id`.",
          "Kiểm tra tương thích ngược trước khi Merge PR: Thử nghiệm bài toán 'Chạy script Flyway mới của nhánh PR này trên DB, nhưng vẫn chạy bộ Integration Test của bản code cũ đang chạy trên Production' — nếu Pass 100% thì bản Migration đó mới thực sự đạt chuẩn Zero-Downtime!",
          "Xóa cột trong Hibernate trước khi xóa cột dưới DB: Luôn gỡ bỏ field khỏi class `@Entity` Java và deploy xong hết 100% Pod trước, sang bản release sau mới được chạy `ALTER TABLE ... DROP COLUMN`."
        ]
      },
      {
        heading: "3. Change Data Capture (CDC) với Debezium đọc WAL Thời gian thực & Hiểm họa Đầy Ổ Cứng",
        paragraphs: [
          "Trong hệ sinh thái ngân hàng hiện đại, một giao dịch vừa ghi vào Core PostgreSQL cần được lan tỏa trong dưới 500 mili-giây tới hàng loạt hệ thống hạ nguồn: đẩy sự kiện từ bảng `outbox_events` sang **Apache Kafka** để bắn thông báo biến động số dư, đồng bộ bút toán sang **OpenSearch / Elasticsearch** cho tính năng tìm kiếm sao kê toàn văn, hoặc rót sang **ClickHouse / Data Lakehouse** cho bảng điều khiển quản trị rủi ro thời gian thực. Nếu dùng cách cũ là chạy Cronjob câu lệnh `SELECT * FROM ledger_entries WHERE updated_at > :lastSync` mỗi 5 giây (**Query-based Polling CDC**), em vừa đè thêm gánh nặng quét Index liên tục lên Core DB, vừa bỏ sót các thao tác xóa hoặc thay đổi trung gian, lại có độ trễ cao. Ngược lại, **Log-based CDC sử dụng Debezium + Kafka Connect** kết nối vào PostgreSQL thông qua giao thức nhân bản logic chuẩn **`pgoutput`** (có sẵn từ PostgreSQL 10+ với `wal_level = logical`) đọc trực tiếp dòng chảy byte từ tệp WAL ngay sau khi giao dịch `COMMIT`! Core Database không tốn thêm bất kỳ câu truy vấn đọc bảng nào, thứ tự các bút toán được bảo toàn chính xác tuyệt đối theo thứ tự LSN của sổ cái, và độ trễ đầu cuối chỉ tính bằng vài chục mili-giây!",
          "Tuy nhiên, anh phải khắc sâu vào trí nhớ em **quả bom nổ chậm nguy hiểm số 1 của Debezium PostgreSQL trên Production** đã từng hạ gục không ít công ty Fintech lớn: đó là **Orphaned / Lagging Replication Slot gây đầy 100% ổ cứng Core DB**! Cơ chế của PostgreSQL Logical Replication Slot (`pg_replication_slots`) được thiết kế để đảm bảo không mất sự kiện cho Debezium: chừng nào Debezium chưa gửi tín hiệu xác nhận đã đọc tới vị trí LSN mới, PostgreSQL sẽ **trung thành giữ lại TOÀN BỘ các tệp nhật ký WAL từ thời điểm đó trở đi trong thư mục `pg_wal` không dám xóa!** Nếu cụm Kafka hoặc Kafka Connect Worker bị lỗi dừng hoạt động vào đêm thứ Bảy mà không ai trực cảnh báo, chỉ sau vài giờ cao điểm phát sinh 200 GB WAL, ổ cứng NVMe của máy chủ Core PostgreSQL chạm mức 100% dung lượng trống -> PostgreSQL lập tức rơi vào trạng thái **`PANIC: could not write to file \"pg_wal/...\": No space left on device`** và sập cứng toàn bộ ngân hàng! Để vận hành Debezium an toàn tuyệt đối trên Production, bắt buộc phải cấu hình đủ 4 chốt bảo hiểm sau:"
        ],
        bullets: [
          "Chốt bảo hiểm #1 — Giới hạn max_slot_wal_keep_size (PG 13+): Cấu hình `max_slot_wal_keep_size = '20GB'` trong `postgresql.conf` — nếu Debezium sập quá lâu làm WAL tồn đọng vượt 20GB, PostgreSQL chủ động hủy Slot của Debezium để tự cứu sống Core Database (sau đó Debezium có thể chạy Snapshot bù lại, còn hơn là chết cả ngân hàng!).",
          "Chốt bảo hiểm #2 — Bắt buộc cấu hình Heartbeat cho bảng ít ghi: Nếu Debezium theo dõi một DB hoặc dùng Publication lọc bảng ít biến động trong khi các bảng khác trên cùng cụm DB ghi rất mạnh, vị trí `confirmed_flush_lsn` của Slot không nhích lên được cũng gây giữ WAL! Phải bật `heartbeat.interval.ms` kèm `heartbeat.action.query` cập nhật một bảng nhịp tim nhỏ định kỳ.",
          "Chốt bảo hiểm #3 — Chỉ tạo PUBLICATION tường minh cho đúng bảng cần lấy: Tuyệt đối dùng `CREATE PUBLICATION dbz_core_pub FOR TABLE outbox_events, ledger_entries;` (kèm `publish_via_partition_root = true` cho bảng Partitioned) thay vì `FOR ALL TABLES` để tránh đẩy nhầm dữ liệu nhạy cảm hoặc rác tạm ra Kafka.",
          "Chốt bảo hiểm #4 — Giám sát Prometheus Alert trên pg_replication_slots: Bắn cảnh báo PagerDuty/Telegram khẩn cấp cho trực ca SRE ngay khi `active = false` quá 3 phút hoặc độ trễ `pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)` vượt ngưỡng 5 GB!"
        ]
      }
    ],
    comparison: {
      title: "Đối chiếu Thao tác Thay đổi CSDL Ngây thơ (Gây Sập Giờ Hành chính) vs Chuẩn Zero-Downtime",
      headers: ["Nhu cầu Thay đổi Schema", "Cách viết Ngây thơ (Cấm kỵ Production)", "Hậu quả Giờ Giao dịch Thực tế", "Quy trình Chuẩn Zero-Downtime Ngân hàng"],
      rows: [
        [
          "Đánh thêm Index mới trên bảng 80 triệu dòng",
          "`CREATE INDEX idx_ref ON txns(ref);` chạy bên trong giao dịch Flyway mặc định.",
          "Giữ `SHARE LOCK` chặn đứng 100% lệnh `INSERT/UPDATE/DELETE` trên bảng suốt nhiều phút.",
          "Khai báo `-- flyway:executeInTransaction=false` + chạy `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...`."
        ],
        [
          "Thêm ràng buộc CHECK hoặc Khóa ngoại (FK)",
          "`ALTER TABLE txns ADD CONSTRAINT ... CHECK (...);` trực tiếp không có cờ `NOT VALID`.",
          "Giữ khóa chặn ghi toàn bảng trong suốt thời gian quét kiểm tra toàn bộ 80 triệu bản ghi cũ.",
          "Đặt `SET lock_timeout = '2s'`, chạy `ADD CONSTRAINT ... NOT VALID` (1ms) rồi chạy `VALIDATE CONSTRAINT`."
        ],
        [
          "Đổi tên cột hoặc Đổi kiểu dữ liệu cột đang dùng",
          "`ALTER TABLE ... RENAME COLUMN` hoặc `ALTER COLUMN ... TYPE` trong 1 lần deploy duy nhất.",
          "Làm nổ lỗi hàng loạt trên các Pod K8s phiên bản cũ đang chạy song song hoặc khóa viết lại toàn bảng.",
          "Thực thi 4 pha **Expand → Dual-Write & Batched Backfill → Switch Read → Contract** qua nhiều đợt release."
        ],
        [
          "Phát sự kiện biến động sang Kafka / Search",
          "Vừa lưu DB vừa gọi `kafkaTemplate.send()` trực tiếp hoặc quét `SELECT WHERE updated_at > ?`.",
          "Lỗi Dual-Write mất gói tin khi rớt mạng hoặc làm quá tải I/O bảng giao dịch gốc.",
          "Ghi bảng `outbox_events` cùng Transaction DB + dùng **Debezium CDC** đọc `pgoutput` từ WAL (có giới hạn `max_slot_wal_keep_size`)."
        ]
      ]
    },
    codeTitle: "Kịch bản Flyway Zero-Downtime Chuẩn Ngân hàng & Khởi tạo Publication cho Debezium CDC",
    code: [
      "-- flyway:executeInTransaction=false",
      "-- File: V20261124_01__expand_fee_currency_and_cdc_pub.sql",
      "",
      "-- 1. Tạo Index mới KHÔNG KHÓA GHI (bắt buộc chạy ngoài khối Transaction nhờ chỉ dẫn dòng 1)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_txns_partner_trace",
      "    ON ledger_entries (narrative) WHERE recon_status = 'SUSPENSE';",
      "",
      "-- 2. Pha EXPAND + Ràng buộc NOT VALID với cầu chì bảo vệ Production lock_timeout = 2 giây",
      "SET lock_timeout = '2s';",
      "SET statement_timeout = '5s';",
      "",
      "ALTER TABLE accounts",
      "    ADD COLUMN IF NOT EXISTS daily_limit_vnd NUMERIC(19, 0);",
      "",
      "-- Áp đặt ràng buộc chặn dữ liệu mới vi phạm trong 1ms mà KHÔNG quét 50 triệu dòng cũ",
      "ALTER TABLE accounts",
      "    ADD CONSTRAINT chk_accounts_daily_limit_pos",
      "    CHECK (daily_limit_vnd IS NULL OR daily_limit_vnd >= 0) NOT VALID;",
      "",
      "RESET statement_timeout;",
      "RESET lock_timeout;",
      "",
      "-- 3. Quét kiểm chứng dữ liệu lịch sử dưới khóa nhẹ SHARE UPDATE EXCLUSIVE (không chặn đọc/ghi!)",
      "ALTER TABLE accounts",
      "    VALIDATE CONSTRAINT chk_accounts_daily_limit_pos;",
      "",
      "-- 4. Cấu hình Publication tường minh cho Debezium CDC đọc Logical WAL (pgoutput)",
      "-- Lưu ý: publish_via_partition_root = true giúp gom mọi phân vùng tháng về chung 1 topic chuẩn!",
      "DO $$",
      "BEGIN",
      "    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'finbank_cdc_pub') THEN",
      "        CREATE PUBLICATION finbank_cdc_pub",
      "            FOR TABLE outbox_events, ledger_entries",
      "            WITH (publish_via_partition_root = true);",
      "    END IF;",
      "END $$;"
    ].join("\n"),
    codeNotes: [
      "Chỉ dẫn -- flyway:executeInTransaction=false ở dòng đầu tiên: Mặc định Flyway gói toàn bộ mỗi file `.sql` vào một giao dịch `BEGIN ... COMMIT`, khiến PostgreSQL từ chối chạy `CREATE INDEX CONCURRENTLY`! Dòng comment cấu hình chuẩn của Flyway tắt chế độ bọc giao dịch tự động riêng cho đúng file này.",
      "Cầu chì sinh tử SET lock_timeout = '2s': Bảo đảm nếu bảng `accounts` đang vướng một câu truy vấn dài, lệnh `ALTER TABLE` sẽ chủ động hủy sau 2 giây thay vì xếp hàng trong Lock Queue chặn đứng hàng nghìn giao dịch thanh toán của khách hàng phía sau.",
      "Sự kết hợp giữa NOT VALID và VALIDATE CONSTRAINT: Tách việc khóa cấu trúc siêu dữ liệu (chỉ 1ms) ra khỏi việc đọc kiểm tra hàng chục triệu dòng trên đĩa (chạy êm ru song song với luồng giao dịch bình thường).",
      "Tham số publish_via_partition_root = true (PostgreSQL 13+): Cực kỳ quan trọng khi dùng Debezium với bảng Partitioned như `ledger_entries` ở bài D2 — nếu thiếu cờ này, mỗi tháng mới Debezium sẽ đẻ ra một Kafka Topic mới (`...ledger_entries_2026_11`, `...2026_12`) làm vỡ luồng Consumer phía sau!"
    ],
    labGuide: {
      goal: "Thực hành kiểm chứng thảm họa Lock Queue Domino trên PostgreSQL 16 khi chạy `ALTER TABLE` không có `lock_timeout`, sau đó thực thi trọn vẹn kịch bản Flyway Zero-Downtime thêm cột + ràng buộc + `CREATE INDEX CONCURRENTLY` trong khi JMeter/luồng nền vẫn bắn giao dịch chuyển tiền liên tục không rớt 1 lệnh nào.",
      steps: [
        "Bước 1: Mở 3 cửa sổ kết nối vào container PostgreSQL 16 có bảng `accounts` 1 triệu dòng: Cửa sổ 1 mở `BEGIN; SELECT COUNT(*) FROM accounts;` rồi giữ nguyên chưa Commit (giả lập báo cáo đang chạy dài).",
        "Bước 2: Ở Cửa sổ 2 chạy `ALTER TABLE accounts ADD COLUMN test_col INT;` (quên đặt `lock_timeout`) -> thấy Cửa sổ 2 đứng chờ; lập tức sang Cửa sổ 3 chạy câu lệnh đơn giản nhất `SELECT balance FROM accounts WHERE id = 1;` -> chứng kiến tận mắt Cửa sổ 3 cũng bị **treo cứng hoàn toàn** vì xếp hàng sau Cửa sổ 2! Sau đó hủy Cửa sổ 2 và thử lại với `SET lock_timeout = '2s';` để thấy cầu chì tự ngắt an toàn sau 2 giây.",
        "Bước 3: Cho một vòng lặp Java bắn liên tục 200 giao dịch chuyển tiền/giây vào DB, đồng thời kích hoạt Flyway chạy file `V20261124_01__expand_fee_currency_and_cdc_pub.sql` ở trên.",
        "Bước 4: Kiểm tra bảng `flyway_schema_history`, xác nhận `indisvalid = true` trong `pg_index` cho Index vừa tạo, `convalidated = true` trong `pg_constraint`, và xác minh luồng giao dịch chuyển tiền đạt 0% tỷ lệ lỗi, độ trễ P99 không vượt quá 15ms trong suốt lúc Migration diễn ra!"
      ],
      expectedOutput: "Trải nghiệm thực tế hiện tượng Lock Queue Domino, cùng kết quả chạy Flyway Zero-Downtime thành công 100% giữa tải giao dịch thực tế với 0 lỗi gián đoạn và Index/Constraint hợp lệ hoàn toàn."
    },
    examTips: [
      "Mẹo phỏng vấn Senior #1 (Câu hỏi sống còn về DDL giờ hành chính): Khi hội đồng hỏi 'Em được giao thêm một cột bắt buộc `NOT NULL` và đánh Index cho cột đó trên bảng giao dịch 100 triệu dòng đang chạy 24/7, em làm từng bước thế nào?', hãy trình bày mạch lạc: (1) Đặt `SET lock_timeout = '2s'`; (2) Expand thêm cột `NULL` trước -> Deploy code Dual-Write -> Backfill theo chunk nhỏ; (3) Thêm `CHECK (col IS NOT NULL) NOT VALID` -> `VALIDATE CONSTRAINT` -> nâng lên `SET NOT NULL` (PG 12+); (4) Đánh Index bằng `CREATE INDEX CONCURRENTLY` ngoài giao dịch!",
      "Mẹo phỏng vấn Senior #2 (Hiểm họa Debezium làm sập Core PostgreSQL): Nếu được hỏi 'Rủi ro vận hành lớn nhất khi bật Debezium CDC trên PostgreSQL là gì?', hãy nêu ngay hiện tượng **Replication Slot giữ chặt các file WAL làm đầy 100% ổ cứng khi Consumer ngừng chạy**, cùng bộ giải pháp `max_slot_wal_keep_size` + Heartbeat Table + Alert độ trễ LSN!",
      "Cẩn trọng bẫy thêm cột có DEFAULT trên các hệ CSDL / phiên bản khác nhau: Trên PostgreSQL 11+ hằng số tĩnh trong `ADD COLUMN ... DEFAULT 'VND'` là tức thời (Metadata-only), nhưng hàm động `DEFAULT random()` hoặc trên một số phiên bản MySQL cũ không dùng `ALGORITHM=INSTANT` sẽ viết lại toàn bảng!"
    ],
    summaryTakeaways: [
      "Mọi lệnh `ALTER TABLE` đòi `ACCESS EXCLUSIVE LOCK` đều có thể kích hoạt hiệu ứng Domino làm đông cứng toàn bộ lệnh đọc/ghi phía sau nếu thiếu cầu chì `SET lock_timeout = '2s'`.",
      "Luôn dùng `CREATE INDEX CONCURRENTLY` (kèm `-- flyway:executeInTransaction=false`) và kỹ thuật hai bước `NOT VALID → VALIDATE CONSTRAINT` trên các bảng lớn của Production.",
      "Mọi thay đổi phá vỡ cấu trúc cột trên môi trường Kubernetes Rolling Update phải tuân thủ quy trình 4 đợt phát hành **Expand → Dual-Write & Throttled Backfill → Switch → Contract**.",
      "Debezium CDC đọc Logical WAL giúp đồng bộ dữ liệu thời gian thực không chạm tải bảng gốc, nhưng bắt buộc giám sát chặt chẽ `pg_replication_slots` và giới hạn `max_slot_wal_keep_size`."
    ],
    lessonQuestions: [
      {
        question: "Giữa giờ hành chính, một lập trình viên chạy script Flyway thực thi lệnh `ALTER TABLE transfers ADD COLUMN trace_id VARCHAR(64);` (không đặt `lock_timeout`) trên PostgreSQL 16. Bản thân lệnh thêm cột `NULL` trên PostgreSQL chỉ mất 1 mili-giây sửa catalog, nhưng ngay lúc chạy đang có 1 câu báo cáo của phòng Kế toán chạy dở từ 20 giây trước trên bảng `transfers`. Điều gì sẽ xảy ra với hàng nghìn khách hàng đang bấm chuyển tiền (`INSERT / SELECT`) trên App Mobile Banking trong 20 giây tiếp theo?",
        options: [
          "Các giao dịch của khách hàng vẫn chạy bình thường 100%, chỉ có riêng lệnh `ALTER TABLE` đứng chờ một mình ở góc riêng.",
          "Toàn bộ hàng nghìn lệnh `SELECT` và `INSERT` mới của khách hàng đến sau lệnh `ALTER TABLE` đều bị **chặn đứng hoàn toàn** trong hàng đợi khóa (Lock Queue Domino) xếp sau yêu cầu `ACCESS EXCLUSIVE LOCK` của lệnh `ALTER TABLE`, làm cạn sạch HikariCP Pool trên toàn hệ thống!",
          "PostgreSQL tự động hủy ngay câu báo cáo của phòng Kế toán trong 1ms để nhường đường cho `ALTER TABLE`.",
          "Lệnh `ALTER TABLE` tự động chuyển sang chạy nền không cần khóa nên hoàn thành ngay lập tức."
        ],
        answer: 1,
        explanation: "Trong PostgreSQL, lệnh `ALTER TABLE` yêu cầu `ACCESS EXCLUSIVE LOCK` (xung đột với cả `ACCESS SHARE` của câu báo cáo `SELECT` đang chạy). Trong lúc lệnh `ALTER TABLE` đứng chờ trong hàng đợi khóa, cơ chế chống đói khóa của Postgres bắt buộc mọi yêu cầu khóa mới đến sau (kể cả `SELECT` đơn giản nhất!) phải xếp hàng sau nó — gây treo toàn bộ bảng ngay tức khắc! Đó là lý do `SET lock_timeout = '2s'` là bắt buộc tuyệt đối.",
        wrongReasons: [
          "PostgreSQL không cho phép các lệnh `SELECT/INSERT` mới nhảy cóc vượt qua một yêu cầu `ACCESS EXCLUSIVE LOCK` đang đứng chờ trong hàng đợi của cùng bảng đó (tránh hiện tượng Lock Starvation).",
          "",
          "PostgreSQL mặc định không bao giờ tự động giết một câu truy vấn đang chạy hợp lệ của người khác để nhường khóa cho câu lệnh DDL mới vào.",
          "Thêm cột vẫn bắt buộc phải lấy được `ACCESS EXCLUSIVE LOCK` trong tích tắc để cập nhật cấu trúc catalog `pg_attribute` của bảng."
        ]
      },
      {
        question: "Ngân hàng triển khai Debezium Connector đọc dữ liệu từ bảng `outbox_events` trên cụm Core PostgreSQL 16 để đẩy sự kiện sang Apache Kafka. Đêm Chủ nhật, cụm Kafka bảo trì kéo dài 6 tiếng làm Debezium ngừng tiêu thụ dữ liệu, nhưng giao dịch chuyển khoản nội bộ trên Core PostgreSQL vẫn hoạt động sôi động. Nếu trước đó DBA quên cấu hình `max_slot_wal_keep_size` và không có cảnh báo giám sát Slot, tai nạn nghiêm trọng nhất nào sẽ xảy ra đối với Core PostgreSQL?",
        options: [
          "PostgreSQL tự động chuyển sang ghi thẳng dữ liệu vào RAM và xóa hết bảng `outbox_events`.",
          "Logical Replication Slot của Debezium giữ chặt không cho PostgreSQL xóa hay tái sử dụng bất kỳ tệp nhật ký WAL nào phát sinh suốt 6 tiếng, làm đầy tràn 100% phân vùng ổ cứng `pg_wal` và khiến máy chủ Core PostgreSQL sập khẩn cấp (`PANIC: No space left on device`)!",
          "Các giao dịch chuyển khoản trên PostgreSQL tự động bị Rollback ngay khi Kafka ngừng hoạt động vì PostgreSQL kiểm tra kết nối Kafka trước mỗi lần Commit.",
          "Không có bất kỳ ảnh hưởng nào vì PostgreSQL chỉ lưu WAL tối đa 64 MB rồi tự xóa bất kể Replication Slot."
        ],
        answer: 1,
        explanation: "Theo thiết kế của PostgreSQL Replication Slot, máy chủ chính cam kết giữ lại toàn bộ các đoạn WAL chưa được trình đọc (Debezium) xác nhận `confirmed_flush_lsn`. Khi Debezium chết nhiều giờ trên một hệ thống giao dịch lớn, hàng trăm GB file WAL ứ đọng sẽ lấp đầy sạch ổ đĩa và gây sập `PANIC` toàn bộ Core Database — do đó bắt buộc phải đặt ngưỡng an toàn `max_slot_wal_keep_size` và cảnh báo dung lượng WAL tồn đọng!",
        wrongReasons: [
          "PostgreSQL không bao giờ tự xóa bảng của người dùng hay bỏ cơ chế ghi đĩa bền vững khi Consumer CDC ngừng đọc.",
          "",
          "Debezium đọc WAL bất đồng bộ một chiều; PostgreSQL hoàn toàn không biết đến sự tồn tại của Kafka lúc xử lý `COMMIT` giao dịch khách hàng.",
          "Khi có Replication Slot đang tồn tại (dù `active = false`) mà không đặt `max_slot_wal_keep_size`, PostgreSQL sẽ giữ lại WAL vượt xa ngưỡng `max_wal_size` thông thường cho tới khi cạn sạch ổ đĩa!"
        ]
      }
    ]
  }
});
