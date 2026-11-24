/* Học phần C — Đồ án Thực chiến (Capstone): Xây dựng Mini Digital Core Banking Full-Stack (C1..C6) */
window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  C1: {
    duration: "60 phút",
    difficulty: "Đồ án Thực chiến · Milestone 1",
    codeLang: "sql",
    teacherIntro: "Chào bạn đến với chặng đường quyết định biến kiến thức thành tấm vé vàng bước vào các ngân hàng và công ty Fintech lớn! Khi hội đồng tuyển dụng Senior Java mở GitHub trong CV của bạn, họ đã quá ngán những dự án thương mại điện tử CRUD giỏ hàng thông thường. Ở Milestone 1 này, chúng ta sẽ đặt móng cho hệ thống 'FinBank Mini Digital Core' trên Java 21 + Spring Boot 3.3 + PostgreSQL 16 với lược đồ cơ sở dữ liệu Sổ cái Kế toán Kép (Double-Entry Ledger), bảng chống trùng lặp Idempotency và bảng sự kiện Transactional Outbox có đầy đủ ràng buộc bất biến ngay dưới tầng CSDL.",
    analogy: {
      title: "Bản vẽ kết cấu móng hầm kho tiền ngân hàng",
      body: "Xây hệ thống Core Banking cũng giống như đổ bê tông cốt thép cho hầm kho tiền ngầm dưới lòng đất vậy. Màn hình giao diện bên trên có thể sơn sửa đổi màu bất cứ lúc nào, nhưng nếu kết cấu móng CSDL cho phép số tiền âm vô lý, cho phép sửa xóa lịch sử bút toán hoặc thiếu khóa duy nhất chống trùng giao dịch, thì toàn bộ tòa nhà tài chính bên trên sớm muộn cũng sụp đổ khi chịu tải thật."
    },
    objectives: [
      "Phân tách ranh giới nghiệp vụ theo DDD (Identity, Core Ledger, Payment Hub, Notification) trong dự án Multi-module Maven/Gradle chạy Java 21.",
      "Thiết kế chuẩn xác lược đồ PostgreSQL cho Sổ cái Kép (accounts, journals, postings, account_holds, idempotency_records, outbox_events) kèm ràng buộc toàn vẹn.",
      "Tự động hóa quản trị phiên bản lược đồ CSDL bằng Flyway ngay khi khởi động dịch vụ."
    ],
    flow: [
      {
        step: "1. Phân rã Bounded Contexts",
        detail: "Chia hệ thống thành 4 mô-đun độc lập trách nhiệm: cổng xác thực & BFF, lõi sổ cái giữ số dư, cổng thanh toán liên ngân hàng/VietQR và dịch vụ thông báo/đối soát."
      },
      {
        step: "2. Khóa cứng Bất biến ở tầng SQL",
        detail: "Áp dụng kiểu NUMERIC(19, 4) cho tiền tệ, ràng buộc CHECK (amount > 0), CHECK (available_balance >= 0) và khóa UNIQUE trên idempotency_key."
      },
      {
        step: "3. Thiết kế Sổ cái Append-Only",
        detail: "Tách bảng chứng từ gốc (journals) và chi tiết dòng hạch toán Nợ/Có (postings), thu hồi quyền UPDATE/DELETE trên bảng sổ cái của user ứng dụng."
      },
      {
        step: "4. Khởi tạo Flyway Baseline",
        detail: "Đóng gói kịch bản V1__init_core_ledger.sql chạy tự động cùng Testcontainers PostgreSQL để mọi thành viên mở dự án lên đều chạy khớp 100%."
      }
    ],
    sections: [
      {
        heading: "1. Kiến trúc tổng thể Đồ án FinBank Mini Digital Core",
        paragraphs: [
          "Sai lầm lớn nhất khi làm dự án cá nhân đi phỏng vấn là ôm đồm dựng 15 microservices rỗng tuếch chỉ có CRUD, khiến bạn kiệt sức vì cấu hình hạ tầng mà phần lõi nghiệp vụ lại sơ sài. Một ứng viên Senior khôn ngoan sẽ chọn kiến trúc Modular Monolith hoặc 3–4 Microservices tinh gọn nhưng đi cực sâu vào các bài toán gai góc nhất của ngân hàng: an toàn đồng thời, sổ cái kế toán kép, xử lý treo khi đứt mạng đối tác và đối soát tự động.",
          "Trong đồ án này, chúng ta tổ chức 1 kho mã nguồn Multi-module gồm: (1) gateway-bff (Spring Cloud Gateway + OAuth2/Cookie), (2) core-ledger-service (trái tim quản lý tài khoản CASA/GL, khoanh giữ Hold và ghi sổ cái bất biến), (3) payment-hub-service (điều phối Saga chuyển tiền 24/7, sinh VietQR CRC16, giả lập cổng NAPAS và chạy Spring Batch đối soát T+0), và (4) web-banking-ui (React + TypeScript + TanStack Query)."
        ],
        bullets: [
          "Java 21 LTS + Spring Boot 3.3+: Tận dụng tối đa Virtual Threads cho luồng I/O gọi đối tác, Java Records cho DTO/Command bất biến và ProblemDetail RFC 7807 cho chuẩn lỗi.",
          "Tách biệt Số dư Sổ cái và Số dư Khả dụng: Bảng accounts lưu rõ ledger_balance (tiền thực tế đã quyết toán) và held_amount (tiền đang khoanh giữ chờ đối tác), từ đó suy ra available_balance = ledger_balance - held_amount.",
          "Sẵn sàng cho kiểm toán: Mọi thay đổi số dư đều bắt buộc tham chiếu tới một journal_id hợp lệ gắn mã vết trace_id xuyên suốt từ giao diện xuống DB."
        ]
      },
      {
        heading: "2. Thiết kế ERD Sổ cái Kép & Chống nhân bản giao dịch",
        paragraphs: [
          "Trái tim của core-ledger-service nằm ở 4 bảng cốt lõi: accounts, journals, postings và idempotency_records. Thay vì dùng kiểu FLOAT hay DOUBLE, toàn bộ các cột số tiền bắt buộc dùng NUMERIC(19, 4) (hoặc BIGINT đơn vị đồng/xu tùy loại tiền tệ) để hỗ trợ cả VNĐ lẫn ngoại tệ USD/EUR và phép tính lãi suất lẻ sau dấu phẩy mà không bao giờ mất độ chính xác.",
          "Bảng postings lưu từng chân bút toán với chiều direction chỉ nhận 'DEBIT' hoặc 'CREDIT' và giá trị amount luôn dương. Ở tầng ứng dụng (và cả Trigger kiểm chứng nếu cần), một chứng từ journal chỉ được phép COMMIT khi tổng các dòng DEBIT bằng chính xác tổng các dòng CREDIT."
        ],
        bullets: [
          "Bảng idempotency_records: Lưu khóa duy nhất (client_id, idempotency_key), mã băm SHA-256 của request payload, trạng thái xử lý (PROCESSING, COMPLETED, FAILED) và JSON kết quả phản hồi để trả lại tức thì khi mạng retry.",
          "Bảng account_holds: Quản lý vòng đời từng lệnh phong tỏa tạm thời (ACTIVE -> CAPTURED khi thành công hoặc RELEASED khi hoàn giữ) gắn với mã giao dịch liên ngân hàng.",
          "Bảng outbox_events: Đặt chung trong schema của core-ledger để ghi nhận sự kiện BALANCE_CHANGED trong cùng một DB Transaction với bút toán sổ cái."
        ]
      },
      {
        heading: "3. Đánh chỉ mục (Indexing) thực dụng ngay từ ngày đầu",
        paragraphs: [
          "Khi hội đồng kỹ thuật xem file SQL migration của bạn, họ sẽ nhìn ngay vào cách bạn đánh Index. Nếu chỉ có khóa chính PRIMARY KEY mà thiếu Composite Index phục vụ truy vấn sao kê theo tài khoản và thời gian giảm dần, họ sẽ biết bạn chưa từng vận hành bảng dữ liệu hàng chục triệu dòng.",
          "Ngược lại, chúng ta chỉ tạo đúng các chỉ mục thiết yếu bám sát mẫu truy vấn thật: tra cứu tài khoản theo số tài khoản khách hàng nhìn thấy, tải phân trang sao kê Keyset theo (account_id, created_at DESC, id DESC) và quét nhanh các bản ghi outbox chưa gửi bằng Partial Index."
        ],
        bullets: [
          "Covering/Composite Index cho sao kê: Đặt (account_id, created_at DESC, id DESC) giúp truy vấn 20 giao dịch mới nhất của khách hàng chạy dưới 2ms dù bảng có 50 triệu dòng.",
          "Partial Index cho Outbox Relay: CREATE INDEX ... ON outbox_events (created_at) WHERE published_at IS NULL giữ kích thước cây chỉ mục cực nhỏ trên RAM.",
          "Khóa Version cho lớp phòng thủ kép: Giữ cột version BIGINT NOT NULL DEFAULT 0 trên bảng accounts để hỗ trợ linh hoạt cả Optimistic lẫn Pessimistic Locking."
        ]
      }
    ],
    comparison: {
      title: "So sánh Thiết kế CSDL Đồ án Sinh viên vs Đồ án Chuẩn Senior Ngân hàng",
      headers: ["Hạng mục thiết kế", "Cách làm phổ biến (Dễ rớt vòng CV)", "Chuẩn Senior Ngân hàng (Trong Capstone này)", "Giá trị chứng minh khi phỏng vấn"],
      rows: [
        ["Kiểu dữ liệu & Số dư", "1 cột balance kiểu DOUBLE, cộng trừ đè trực tiếp", "NUMERIC(19,4), tách ledger_balance và held_amount kèm CHECK >= 0", "Hiểu sâu kế toán ngân hàng & an toàn tiền tệ"],
        ["Lịch sử giao dịch", "Bảng transfer_history lưu lỏng lẻo from_acc, to_acc", "Cặp bảng bất biến journals + postings cân bằng Nợ = Có", "Đảm bảo truy vết kiểm toán & đối soát T+0"],
        ["Chống gọi trùng (Retry)", "Không có, bấm 2 lần trừ tiền 2 lần", "Bảng idempotency_records có UNIQUE constraint + payload_hash", "Nắm chắc tính lũy đẳng hệ thống thanh toán"],
        ["Đồng bộ sang Kafka", "Gọi kafka.send() thẳng sau repo.save()", "Bảng outbox_events ghi cùng Transaction + Partial Index", "Triệt tiêu hoàn toàn lỗi Dual-Write mất sự kiện"]
      ]
    },
    codeTitle: "Flyway V1__init_core_ledger.sql — Lược đồ Sổ Cái Kép, Hold, Idempotency & Outbox chuẩn Production",
    code: [
      "CREATE TABLE accounts (",
      "    id                BIGSERIAL PRIMARY KEY,",
      "    account_no        VARCHAR(20) NOT NULL UNIQUE,",
      "    owner_cif         VARCHAR(32) NOT NULL,",
      "    account_type      VARCHAR(16) NOT NULL CHECK (account_type IN ('CASA', 'GL_INTERNAL', 'SUSPENSE')),",
      "    currency          CHAR(3) NOT NULL DEFAULT 'VND',",
      "    ledger_balance    NUMERIC(19, 4) NOT NULL DEFAULT 0,",
      "    held_amount       NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (held_amount >= 0),",
      "    status            VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',",
      "    version           BIGINT NOT NULL DEFAULT 0,",
      "    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),",
      "    CONSTRAINT chk_casa_non_negative CHECK (account_type <> 'CASA' OR (ledger_balance - held_amount) >= 0)",
      ");",
      "",
      "CREATE TABLE journals (",
      "    id                UUID PRIMARY KEY,",
      "    idempotency_key   VARCHAR(64) NOT NULL UNIQUE,",
      "    txn_type          VARCHAR(32) NOT NULL,",
      "    description       VARCHAR(255) NOT NULL,",
      "    trace_id          VARCHAR(64),",
      "    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()",
      ");",
      "",
      "CREATE TABLE postings (",
      "    id                BIGSERIAL PRIMARY KEY,",
      "    journal_id        UUID NOT NULL REFERENCES journals(id),",
      "    account_id        BIGINT NOT NULL REFERENCES accounts(id),",
      "    direction         VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),",
      "    amount            NUMERIC(19, 4) NOT NULL CHECK (amount > 0),",
      "    balance_after     NUMERIC(19, 4) NOT NULL,",
      "    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()",
      ");",
      "",
      "CREATE INDEX idx_postings_acc_cursor ON postings (account_id, created_at DESC, id DESC);",
      "",
      "CREATE TABLE outbox_events (",
      "    id                UUID PRIMARY KEY,",
      "    aggregate_id      VARCHAR(64) NOT NULL,",
      "    event_type        VARCHAR(64) NOT NULL,",
      "    payload           JSONB NOT NULL,",
      "    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),",
      "    published_at      TIMESTAMPTZ",
      ");",
      "CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at) WHERE published_at IS NULL;"
    ].join("\n"),
    codeNotes: [
      "Ràng buộc chk_casa_non_negative đóng vai trò chốt chặn vật lý cuối cùng ngay trong nhân PostgreSQL: dù tầng Java có bug lọt qua thì tài khoản thanh toán của khách hàng (CASA) cũng không bao giờ bị kéo âm số dư khả dụng!",
      "Riêng các tài khoản kế toán nội bộ (GL_INTERNAL) được miễn ràng buộc không âm theo đúng nguyên lý kế toán ngân hàng (vì tài khoản tiền mặt/tài khoản quyết toán mang tính chất Tài sản Nợ).",
      "Chỉ mục idx_postings_acc_cursor khớp hoàn hảo với truy vấn Keyset Pagination lấy sao kê mới nhất, còn idx_outbox_unpublished chỉ đánh trên các sự kiện chưa gửi giúp tiến trình Relay đọc trong dưới 1ms."
    ],
    labGuide: {
      goal: "Khởi tạo khung dự án Java 21 + Spring Boot 3.3 và chạy tự động Flyway V1 trên PostgreSQL 16 Container.",
      steps: [
        "Bước 1: Tạo cấu trúc Maven/Gradle Multi-module gồm common-kernel, core-ledger-service, payment-hub-service và gateway-bff với cấu hình Java 21.",
        "Bước 2: Đưa file V1__init_core_ledger.sql vào src/main/resources/db/migration của core-ledger-service và thêm script V2 tạo sẵn 3 tài khoản GL hệ thống (GL_HOLD, GL_NAPAS_NOSTRO, GL_FEE_REVENUE).",
        "Bước 3: Cấu hình spring.jpa.hibernate.ddl-auto=validate để ép Hibernate đối chiếu chặt chẽ Entity Java với bảng thật do Flyway tạo ra.",
        "Bước 4: Viết 1 bài test @SpringBootTest dùng Testcontainers PostgreSQL xác minh rằng việc cố tình INSERT một dòng CASA có held_amount > ledger_balance bị PostgreSQL chặn đứng ngay lập tức."
      ],
      expectedOutput: "Ứng dụng khởi động sạch sẽ, Flyway báo 'Successfully applied 2 migrations', và bài kiểm thử ràng buộc toàn vẹn CSDL vượt qua xanh 100%."
    },
    examTips: [
      "Điểm cộng lớn khi bảo vệ đồ án: Hãy giải thích vì sao bạn đặt spring.jpa.hibernate.ddl-auto=validate thay vì update — trong ngân hàng không bao giờ cho phép ORM tự ý sửa bảng Production.",
      "Câu hỏi hội đồng hay xoáy: 'Tại sao bảng postings lại lưu thêm cột balance_after?' -> Giúp hiển thị cột 'Số dư sau giao dịch' trên từng dòng sao kê ngay lập tức mà không phải cộng dồn lại từ đầu năm!",
      "Nhớ thu hồi quyền DELETE/UPDATE trên bảng journals và postings đối với database user của ứng dụng để chứng minh tính bất biến thực sự."
    ],
    summaryTakeaways: [
      "Khởi đầu đồ án bằng lược đồ Sổ cái Kép bất biến thay vì CRUD bảng đơn giản.",
      "Luôn dùng NUMERIC(19, 4) và khóa chặt bất biến không âm bằng CHECK constraint dưới DB.",
      "Tích hợp sẵn bảng idempotency_records và outbox_events ngay từ bản thiết kế V1.",
      "Quản lý mọi thay đổi schema bằng Flyway kết hợp chế độ kiểm chứng ddl-auto=validate."
    ],
    lessonQuestions: [
      {
        question: "Trong thiết kế bảng accounts của Milestone 1, vì sao ràng buộc kiểm tra không âm được viết là (ledger_balance - held_amount) >= 0 cho tài khoản CASA thay vì chỉ kiểm tra ledger_balance >= 0?",
        options: [
          "Để làm câu lệnh SQL dài hơn cho đẹp mắt",
          "Vì khi khách hàng có giao dịch đang chờ đối tác xử lý (held_amount > 0), số tiền được phép chi tiêu thực sự chỉ còn là số dư khả dụng (ledger_balance - held_amount); nếu chỉ kiểm tra ledger_balance khách sẽ chi tiêu kép vượt quá số tiền có thật",
          "Vì PostgreSQL không cho phép đặt CHECK trên một cột đơn lẻ",
          "Để tự động xóa tài khoản khi số dư bằng 0"
        ],
        answer: 1,
        explanation: "Khoản tiền đang tạm giữ (held_amount) đã được cam kết cho một giao dịch đang bay trên mạng. Bảo vệ hiệu số (ledger_balance - held_amount) >= 0 đảm bảo không luồng song song nào được phép rút lẹm vào phần tiền đang phong tỏa.",
        wrongReasons: [
          "Mọi ràng buộc trong Core Banking đều nhằm bảo vệ tính toàn vẹn tài chính chứ không phải hình thức.",
          "",
          "PostgreSQL hoàn toàn hỗ trợ CHECK trên một hoặc nhiều cột bất kỳ.",
          "Tài khoản số dư bằng 0 vẫn là tài khoản hợp lệ đang hoạt động bình thường."
        ]
      },
      {
        question: "Tại sao chỉ mục idx_outbox_unpublished trên bảng outbox_events lại sử dụng mệnh đề WHERE published_at IS NULL (Partial Index)?",
        options: [
          "Vì bảng outbox_events chỉ lưu tối đa 10 dòng",
          "Vì 99,99% bản ghi trong bảng outbox đã được đẩy lên Kafka thành công (published_at khác NULL); Partial Index giúp cây chỉ mục chỉ chứa vài chục sự kiện mới phát sinh chưa gửi, giữ tốc độ quét gần như tức thời và tiết kiệm RAM",
          "Để tự động xóa các bản ghi đã gửi sau 1 giây",
          "Vì kiểu UUID không đánh được Index thông thường"
        ],
        answer: 1,
        explanation: "Theo thời gian bảng outbox có hàng chục triệu dòng đã gửi xong. Partial Index lọc riêng published_at IS NULL giúp worker Relay không bao giờ phải duyệt qua dữ liệu lịch sử cũ.",
        wrongReasons: [
          "Bảng outbox trong hệ thống thanh toán ghi nhận hàng triệu sự kiện mỗi ngày.",
          "",
          "Partial Index chỉ lọc phần tử đưa vào cây chỉ mục, hoàn toàn không tự xóa dữ liệu trong bảng.",
          "PostgreSQL hỗ trợ B-Tree Index trên kiểu UUID hoàn toàn bình thường."
        ]
      }
    ]
  },

  C2: {
    duration: "55 phút",
    difficulty: "Đồ án Thực chiến · Milestone 2",
    codeLang: "java",
    teacherIntro: "Có móng hầm kho tiền vững chắc rồi, ở Milestone 2 chúng ta sẽ dựng 'Cổng an ninh hai lớp' cho FinBank! Rất nhiều dự án cá nhân chỉ làm một API /login trả về chuỗi JWT lưu vào localStorage là xong — cách làm đó nếu mang đi phỏng vấn ngân hàng sẽ bị hỏi vặn ngay về rủi ro XSS đánh cắp phiên và tấn công sửa số tài khoản nhận giữa đường. Ở chặng này, bạn sẽ xây dựng API Gateway + BFF cấp phiên bằng HttpOnly Cookie kết hợp cơ chế Smart OTP ký gắn chặt với số tiền và người nhận cho mọi giao dịch chuyển tiền!",
    analogy: {
      title: "Thẻ từ ra vào tòa nhà và Chữ ký tươi trên từng tờ séc",
      body: "Phiên đăng nhập OAuth2/JWT giống như chiếc thẻ từ nhân viên quẹt ở cửa sảnh để chứng minh danh tính khi bước vào ngân hàng. Nhưng có mặt trong sảnh không có nghĩa là tự động được rút két! Mỗi khi xuất tiền khỏi két, bạn phải ký chữ ký số Smart OTP đóng dấu đè lên đúng con số tiền và tên người thụ hưởng in trên tờ lệnh đó — kẻ gian có nhặt được tờ giấy cũng không thể tẩy xóa đổi sang tên hắn."
    },
    objectives: [
      "Triển khai dịch vụ xác thực phát hành JWT ký bất đối xứng RS256 kèm cơ chế thu hồi tức thời (JTI Denylist) trên Redis.",
      "Cấu hình Spring Cloud Gateway đóng vai trò BFF chuyển đổi Cookie HttpOnly bảo mật sang Authorization Bearer Header nội bộ và giới hạn tốc độ (Rate Limiting) theo CIF.",
      "Cài đặt bộ xác thực giao dịch bậc cao (Step-up Transaction Smart OTP) ràng buộc mật mã với tài khoản nhận và số tiền."
    ],
    flow: [
      {
        step: "1. Đăng nhập & Thiết lập Phiên BFF",
        detail: "Người dùng xác thực mật khẩu + thiết bị; BFF lưu Token trên Redis và chỉ trả về trình duyệt Cookie __Host-session gắn cờ HttpOnly, Secure, SameSite=Strict."
      },
      {
        step: "2. Gateway Kiểm soát Lưu lượng & Định danh",
        detail: "Mọi request đi qua Gateway đều được tra cứu phiên, kiểm tra Rate Limit trên Redis, xóa sạch header giả mạo từ ngoài và đính kèm JWT nội bộ chuẩn RS256."
      },
      {
        step: "3. Sinh Thách thức Giao dịch (Challenge)",
        detail: "Khi khách lập lệnh chuyển tiền, hệ thống tạo bản nháp giao dịch và trả về mã thách thức gắn với cặp (toAccount, amount, txnDraftId)."
      },
      {
        step: "4. Kiểm chứng Smart OTP trước Hạch toán",
        detail: "Core Service tính lại mã HMAC/OCRA trên chính dữ liệu sẽ hạch toán; chỉ khi khớp tuyệt đối trong khung thời gian 60 giây mới mở khóa bước ghi sổ cái."
      }
    ],
    sections: [
      {
        heading: "1. Thiết kế cặp khóa RS256 & Quản trị Phiên không lộ Token",
        paragraphs: [
          "Thay vì dùng khóa đối xứng HS256 (nơi mọi microservice đều phải giữ chung một mật khẩu bí mật, chỉ cần 1 service bị lộ là kẻ tấn công tự ký được Token admin), đồ án của bạn sử dụng cặp khóa RSA-2048 bất đối xứng. Chỉ duy nhất Identity Service giữ Private Key để ký phát hành JWT, còn các service khác (Core Ledger, Payment Hub) chỉ đọc Public Key qua chuẩn JWK Set endpoint để xác thực.",
          "Đối với kênh Web Internet Banking, lớp gateway-bff đứng chắn phía trước: trình duyệt tự động gửi Cookie __Host-finbank_sid không thể đọc bằng JavaScript, còn Gateway chịu trách nhiệm đổi phiên đó thành Bearer JWT truyền vào mạng nội bộ kèm mã X-Correlation-Id."
        ],
        bullets: [
          "Access Token ngắn hạn (5 phút): Giảm thiểu cửa sổ rủi ro nếu token nội bộ bị rò rỉ trong mạng.",
          "Khóa khẩn cấp tài khoản (Kill Session): Khi khách hàng báo mất điện thoại hoặc hệ thống chống gian lận phát hiện bất thường, ghi mã jti/cif vào Redis Denylist giúp chặn đứng mọi API ngay lập tức.",
          "Chống giả mạo Header nội bộ: Cấu hình Gateway Strip/Overwrite tuyệt đối các header nhạy cảm như X-Authenticated-Cif nếu client bên ngoài cố tình gửi kèm."
        ]
      },
      {
        heading: "2. Cài đặt Smart OTP gắn chặt ngữ cảnh giao dịch (Dynamic Linking)",
        paragraphs: [
          "Điểm nhấn đắt giá thứ hai trong Milestone 2 là bộ xác thực Smart OTP mô phỏng chuẩn OCRA dùng trong tất cả các ngân hàng thương mại Việt Nam hiện nay. Thay vì sinh 6 chữ số chỉ phụ thuộc vào đồng hồ thời gian (như Google Authenticator thông thường), hàm tạo OTP kết hợp khóa bí mật của thiết bị đã kích hoạt với chuỗi dữ liệu giao dịch chuẩn hóa: draftId + '|' + destAccount + '|' + amount.stripTrailingZeros().toPlainString().",
          "Nhờ vậy, kể cả trong kịch bản giả định trình duyệt của khách bị mã độc can thiệp sửa lén số tài khoản người nhận trên gói tin POST /transfers, thì khi xuống tới Backend, chữ ký OTP lập tức lệch hoàn toàn và giao dịch bị chặn đứng 100%!"
        ],
        bullets: [
          "Chống dò mã vét cạn (Brute-force OTP Lockout): Đếm số lần nhập sai OTP trên Redis; sai liên tiếp 5 lần tự động hủy bản nháp giao dịch và tạm khóa tính năng Smart OTP 15 phút.",
          "Chống dùng lại mã OTP (One-Time Use): Ngay khi một mã Smart OTP xác thực thành công cho draftId, đánh dấu đã tiêu thụ để không thể gửi lại lần hai.",
          "So sánh hằng thời gian (Constant-time Comparison): Sử dụng MessageDigest.isEqual() khi đối chiếu mã băm OTP nhằm triệt tiêu tấn công đo thời gian phản hồi (Timing Attack)."
        ]
      },
      {
        heading: "3. Bảo vệ Cổng bằng Redis Token Bucket Rate Limiter",
        paragraphs: [
          "Một hệ thống tài chính không bao giờ mở cửa thả nổi tốc độ gọi API. Trên Spring Cloud Gateway, chúng ta cấu hình bộ lọc RequestRateLimiter kết nối Redis theo khóa định danh người dùng (CIF khi đã đăng nhập, hoặc địa chỉ IP đối với API công khai như đăng nhập/quên mật khẩu).",
          "Hãy đặt ngưỡng phân tầng hợp lý: API tra cứu sao kê cho phép 20 req/s (burst 40), nhưng API khởi tạo chuyển tiền và xác thực OTP chỉ cho phép tối đa 3 req/s để vừa bảo vệ khách hàng bấm nhầm, vừa chặn bot tự động quét tài khoản."
        ],
        bullets: [
          "Trả chuẩn HTTP 429 kèm Retry-After: Giúp giao diện React hiển thị thông báo lịch sự thay vì báo lỗi hệ thống chung chung.",
          "Gắn Trace ID ngay từ cửa ngõ: Bộ lọc đầu tiên trên Gateway kiểm tra hoặc sinh mới X-Correlation-Id gắn vào cả Request xuống hạ nguồn lẫn Response trả về trình duyệt.",
          "Kiểm tra quyền sở hữu (Anti-BOLA): Truyền cif đã xác thực từ JWT vào ngữ cảnh bảo mật để mọi truy vấn tài khoản bên dưới đều lọc kèm AND owner_cif = :authenticatedCif."
        ]
      }
    ],
    comparison: {
      title: "Phân tầng Bảo mật 3 Lớp trong Đồ án FinBank Capstone",
      headers: ["Tầng bảo vệ", "Công nghệ triển khai", "Mối đe dọa bị chặn đứng", "File / Component trong Đồ án"],
      rows: [
        ["Tầng Trình duyệt ↔ BFF", "Cookie __Host-sid (HttpOnly, Secure, SameSite=Strict) + CSRF Token", "Mã độc XSS đánh cắp JWT lưu trong localStorage", "GatewaySessionFilter.java"],
        ["Tầng Dịch vụ Nội bộ", "OAuth2 Resource Server xác thực JWT RS256 + Ownership Check", "Giả mạo định danh nội bộ & lỗi xem trộm tài khoản (BOLA/IDOR)", "BankingSecurityConfig.java"],
        ["Tầng Phê duyệt Giao dịch", "Transaction-bound Smart OTP (HMAC-SHA256 gắn số tiền + TK nhận)", "Tấn công tráo người thụ hưởng giữa đường (Man-in-the-Browser)", "SmartOtpVerifier.java"]
      ]
    },
    codeTitle: "SmartOtpVerifier.java — Xác thực Smart OTP gắn ngữ cảnh giao dịch & chống Brute-Force trên Redis",
    code: [
      "@Service",
      "public class SmartOtpVerifier {",
      "    private final StringRedisTemplate redis;",
      "",
      "    public SmartOtpVerifier(StringRedisTemplate redis) { this.redis = redis; }",
      "",
      "    public void verifyTransactionOtp(String cif, String deviceSecret, String draftId,",
      "                                     String toAccount, BigDecimal amount, String userOtp) {",
      "        String failKey = \"otp:fail:\" + cif;",
      "        long fails = Optional.ofNullable(redis.opsForValue().increment(failKey)).orElse(1L);",
      "        if (fails == 1L) redis.expire(failKey, Duration.ofMinutes(15));",
      "        if (fails > 5L) {",
      "            throw new BankingSecurityException(\"OTP_LOCKED\", \"Nhập sai quá 5 lần, tạm khóa Smart OTP 15 phút\");",
      "        }",
      "",
      "        long timeSlot = Instant.now().getEpochSecond() / 60; // Cửa sổ hiệu lực 60 giây",
      "        String canonicalTx = draftId + \"|\" + toAccount.trim() + \"|\" + amount.stripTrailingZeros().toPlainString();",
      "        String expectedOtp = computeSixDigitOcra(deviceSecret, canonicalTx + \"|\" + timeSlot);",
      "",
      "        boolean matched = MessageDigest.isEqual(",
      "            expectedOtp.getBytes(StandardCharsets.UTF_8),",
      "            String.valueOf(userOtp).trim().getBytes(StandardCharsets.UTF_8)",
      "        );",
      "        if (!matched) {",
      "            throw new BankingSecurityException(\"INVALID_TXN_OTP\", \"Mã Smart OTP không khớp với thông tin giao dịch\");",
      "        }",
      "",
      "        // Đảm bảo mỗi mã OTP của giao dịch chỉ dùng đúng 1 lần duy nhất",
      "        Boolean firstUse = redis.opsForValue().setIfAbsent(\"otp:used:\" + draftId, \"1\", Duration.ofMinutes(5));",
      "        if (!Boolean.TRUE.equals(firstUse)) {",
      "            throw new BankingSecurityException(\"OTP_REPLAYED\", \"Mã xác thực giao dịch này đã được sử dụng\");",
      "        }",
      "        redis.delete(failKey);",
      "    }",
      "",
      "    private String computeSixDigitOcra(String secret, String challenge) {",
      "        byte[] hash = new HmacUtils(HmacAlgorithms.HMAC_SHA_256, secret).hmac(challenge);",
      "        int offset = hash[hash.length - 1] & 0x0F;",
      "        int binary = ((hash[offset] & 0x7F) << 24) | ((hash[offset + 1] & 0xFF) << 16)",
      "                   | ((hash[offset + 2] & 0xFF) << 8) | (hash[offset + 3] & 0xFF);",
      "        return String.format(\"%06d\", binary % 1_000_000);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Chuỗi canonicalTx dùng amount.stripTrailingZeros().toPlainString() để tránh lỗi biểu diễn khoa học (1E+6) hoặc lệch số 0 thập phân giữa Frontend và Backend khi tính chữ ký.",
      "Hàm MessageDigest.isEqual() so sánh mảng byte trong thời gian hằng số, chặn đứng kỹ thuật đo độ trễ từng ký tự để đoán mã OTP.",
      "Lệnh setIfAbsent('otp:used:' + draftId) nguyên tử trên Redis khóa chặt tính chất dùng một lần (One-Time) ngay cả khi có 2 luồng gửi cùng một mã OTP hợp lệ đến cùng mili-giây."
    ],
    labGuide: {
      goal: "Hoàn thiện luồng Đăng nhập BFF Cookie + Bảo vệ API chống BOLA + Xác thực Smart OTP giao dịch.",
      steps: [
        "Bước 1: Tạo cặp khóa RSA 2048-bit cho môi trường dev, cấu hình Identity endpoint cấp JWT chứa claim cif và jti.",
        "Bước 2: Cấu hình Spring Security trên core-ledger-service kiểm tra chữ ký JWT và viết biểu thức kiểm tra quyền sở hữu tài khoản trước khi trả sao kê.",
        "Bước 3: Cài đặt SmartOtpVerifier cùng 1 API giả lập màn hình Smart OTP trên điện thoại giúp sinh mã 6 số khi truyền vào thông tin lệnh nháp để tiện demo phỏng vấn.",
        "Bước 4: Viết Integration Test thử kịch bản: lấy mã Smart OTP hợp lệ cho lệnh chuyển 1.000.000đ sang TK A, nhưng lúc gọi API thực thi lại đổi thành 9.000.000đ -> xác nhận hệ thống từ chối với mã lỗi INVALID_TXN_OTP."
      ],
      expectedOutput: "API từ chối 100% các hành vi truy cập chéo tài khoản của CIF khác (HTTP 403) và chặn đứng mọi nỗ lực sửa đổi số tiền hoặc tài khoản thụ hưởng sau khi sinh OTP."
    },
    examTips: [
      "Khi demo đồ án trước hội đồng, hãy mở DevTools tab Application -> Cookies chỉ cho họ thấy cờ HttpOnly được tích xanh và thử gõ document.cookie trên Console trả về chuỗi rỗng — hiệu ứng thuyết phục cực mạnh!",
      "Đừng quên giải thích rõ sự khác biệt giữa Authentication (bạn là ai — qua phiên JWT) và Transaction Authorization (bạn có thực sự đồng ý chuyển đúng khoản tiền này không — qua Smart OTP).",
      "Luôn chuẩn hóa định dạng số tiền bằng toPlainString() trước khi đưa vào hàm băm mật mã."
    ],
    summaryTakeaways: [
      "Sử dụng JWT bất đối xứng RS256 nội bộ kết hợp BFF HttpOnly Cookie cho kênh trình duyệt.",
      "Mọi API dữ liệu tài khoản đều phải kiểm tra chủ sở hữu CIF để triệt tiêu lỗ hổng BOLA.",
      "Smart OTP ngân hàng bắt buộc ký gắn chặt với số tài khoản nhận và số tiền giao dịch.",
      "Kết hợp bộ đếm giới hạn sai trên Redis và setIfAbsent để chống cả Brute-force lẫn Replay."
    ],
    lessonQuestions: [
      {
        question: "Trong đoạn code SmartOtpVerifier của đồ án, tại sao phải gọi amount.stripTrailingZeros().toPlainString() thay vì amount.toString() khi ghép chuỗi tính mã OTP?",
        options: [
          "Vì toString() không tồn tại trên lớp BigDecimal",
          "Vì BigDecimal có thể có scale khác nhau (VD 500000 vs 500000.00) hoặc toString() xuất dạng ký hiệu khoa học như 1E+7, làm chuỗi đầu vào hàm băm giữa Client và Server không đồng nhất gây báo sai OTP oan",
          "Để làm tròn số tiền lên hàng triệu",
          "Để mã hóa số tiền thành chữ cái tiếng Việt"
        ],
        answer: 1,
        explanation: "Hàm băm HMAC thay đổi hoàn toàn đầu ra chỉ với 1 ký tự khác biệt ('500000' khác '500000.00' và khác '5E+5'). Chuẩn hóa bằng stripTrailingZeros().toPlainString() đảm bảo cùng một giá trị toán học luôn sinh ra đúng một chuỗi duy nhất.",
        wrongReasons: [
          "BigDecimal vẫn có phương thức toString(), nhưng nó dùng ký hiệu khoa học trong một số trường hợp.",
          "",
          "stripTrailingZeros() chỉ bỏ các chữ số 0 vô nghĩa sau dấu thập phân, không hề làm thay đổi giá trị số tiền.",
          "Phương thức này trả về chuỗi chữ số thập phân thuần túy."
        ]
      },
      {
        question: "Nếu một khách hàng đã đăng nhập hợp lệ (mang Cookie/JWT của CIF_001) nhưng dùng Postman gọi GET /api/v1/accounts/ACC_OF_CIF_002/statements và vẫn lấy được sao kê của người khác, đồ án đang mắc lỗ hổng nghiêm trọng nào?",
        options: [
          "SQL Injection",
          "OWASP API1 — Broken Object Level Authorization (BOLA / IDOR) do thiếu bước đối chiếu chủ sở hữu tài khoản với CIF trong Token",
          "Cross-Site Scripting (XSS)",
          "OutOfMemoryError"
        ],
        answer: 1,
        explanation: "Xác thực JWT hợp lệ chỉ chứng minh người gọi là CIF_001. Nếu câu truy vấn chỉ tìm theo accountNo mà quên kiểm tra owner_cif = 'CIF_001' thì bất kỳ người dùng nào cũng xem trộm được sao kê của toàn ngân hàng.",
        wrongReasons: [
          "Truyền mã tài khoản khác vào tham số chuẩn không phải là tiêm mã SQL.",
          "",
          "XSS là lỗ hổng chèn mã kịch bản độc hại lên trình duyệt.",
          "Đây là lỗi phân quyền truy cập đối tượng dữ liệu, không phải lỗi tràn bộ nhớ."
        ]
      }
    ]
  },

  C3: {
    duration: "65 phút",
    difficulty: "Đồ án Thực chiến · Milestone 3 (Trọng tâm)",
    codeLang: "java",
    teacherIntro: "Chào mừng bạn tới Milestone 3 — phần code 'trái tim' mà mọi Tech Lead Ngân hàng đều sẽ mở ra xem đầu tiên trong kho GitHub của bạn! Ở cột mốc này, chúng ta cài đặt dịch vụ Chuyển khoản Nội bộ & Động cơ Hạch toán Sổ cái Kép (Core Ledger Engine) hội tụ đủ 4 kỹ thuật đỉnh cao: Khử trùng lặp Idempotency nguyên tử, Khóa bi quan theo thứ tự ID chống Deadlock tuyệt đối, Sinh cặp bút toán Nợ/Có cân bằng đến từng đồng, và Ghi sự kiện Outbox trong cùng một Transaction!",
    analogy: {
      title: "Hai thủ quỹ khóa sổ đôi theo đúng thứ tự ngăn tủ",
      body: "Giả sử thủ quỹ Lan cần chuyển vàng từ Tủ số 5 sang Tủ số 2, cùng lúc thủ quỹ Minh cần chuyển vàng từ Tủ số 2 sang Tủ số 5. Nếu ai tiện tay mở tủ gần mình trước rồi đứng chờ tủ kia, cả hai sẽ đứng nhìn nhau khóa cứng đến hết ngày (Deadlock)! Quy định sắt của kho tiền FinBank rất đơn giản: bất kể chuyển xuôi hay ngược, mọi thủ quỹ đều bắt buộc mở Tủ có số thứ tự NHỎ HƠN trước (Tủ 2 rồi mới tới Tủ 5) — nhờ vậy không bao giờ xảy ra kẹt khóa!"
    },
    objectives: [
      "Cài đặt thuật toán khóa dòng Pessimistic Write Lock theo thứ tự ID tăng dần (Consistent Lock Ordering) triệt tiêu 100% Deadlock khi chuyển khoản chéo.",
      "Đảm bảo tính lũy đẳng tuyệt đối qua bảng idempotency_records và phương trình bất biến Tổng Debit == Tổng Credit trên từng Journal.",
      "Viết bài kiểm thử đa luồng (Concurrency Invariant Test) chạy 50 luồng chuyển tiền chéo ngẫu nhiên chứng minh tổng tiền toàn ngân hàng bảo toàn không sai 1 đồng."
    ],
    flow: [
      {
        step: "1. Chốt chặn Idempotency đầu luồng",
        detail: "Kiểm tra hoặc chèn khóa idempotency_key; nếu giao dịch đã hoàn tất trước đó thì lập tức trả lại biên lai đã lưu mà không chạm vào tài khoản."
      },
      {
        step: "2. Sắp xếp & Chiếm khóa SELECT FOR UPDATE",
        detail: "So sánh ID tài khoản nguồn và đích, thực hiện khóa bi quan từ ID nhỏ đến ID lớn với thời gian chờ khóa giới hạn (lock timeout 3 giây)."
      },
      {
        step: "3. Kiểm tra Số dư Khả dụng & Hạch toán Kép",
        detail: "Xác nhận (ledger_balance - held_amount) >= tổng tiền trừ, cập nhật số dư và ghi 1 bản ghi journals kèm các dòng postings Nợ/Có cân bằng."
      },
      {
        step: "4. Ghi Outbox Event & Commit Nguyên tử",
        detail: "Lưu sự kiện LEDGER_POSTED vào bảng outbox_events trong cùng một @Transactional để thông báo biến động số dư không bao giờ thất lạc."
      }
    ],
    sections: [
      {
        heading: "1. Giải quyết trọn vẹn bài toán Đồng thời & Deadlock trong 15 dòng code",
        paragraphs: [
          "Trong môi trường ngân hàng thật, các cặp tài khoản doanh nghiệp đối tác hoặc vợ chồng chuyển tiền qua lại cho nhau cùng một giây diễn ra thường xuyên. Nếu hàm transfer(from, to) khóa dòng from trước rồi mới khóa dòng to, thì hai lệnh ngược chiều transfer(A, B) và transfer(B, A) chạy song song sẽ giữ chéo khóa của nhau và văng lỗi DeadlockLoserDataAccessException.",
          "Bằng cách gom danh sách ID tất cả các tài khoản tham gia vào chứng từ hạch toán (bao gồm tài khoản trích nợ, tài khoản ghi có và tài khoản thu phí nếu có), sắp xếp tăng dần (sorted()) rồi thực thi câu lệnh SELECT ... WHERE id IN (...) ORDER BY id ASC FOR UPDATE, PostgreSQL sẽ luôn khóa các dòng theo một chiều duy nhất trên toàn hệ thống!"
        ],
        bullets: [
          "Đặt Lock Timeout ngắn (3000ms): Không bao giờ để một luồng chờ khóa vô hạn làm treo cứng Worker Thread.",
          "Kiểm tra trạng thái tài khoản sau khi đã giữ khóa: Phải kiểm tra status == 'ACTIVE' và số dư khả dụng bên trong vùng đã khóa (tránh lỗi Time-of-Check to Time-of-Use).",
          "Bảo vệ phép toán BigDecimal: Luôn kiểm tra amount.compareTo(BigDecimal.ZERO) > 0 ngay đầu hàm để chặn lỗ hổng truyền số tiền âm biến lệnh chuyển tiền thành lệnh rút trộm tiền người nhận!"
        ]
      },
      {
        heading: "2. Cài đặt Động cơ Sổ cái Kép (Journal & Postings Engine)",
        paragraphs: [
          "Hãy viết một phương thức dùng chung postBalancedJournal(JournalSpec spec) đóng vai trò cổng duy nhất được phép thay đổi số dư trong toàn bộ dự án. Trước khi lưu xuống bảng postings, hàm này chạy vòng lặp cộng tổng toàn bộ các dòng DEBIT và tổng toàn bộ các dòng CREDIT; nếu totalDebit.compareTo(totalCredit) != 0, hệ thống ném ngay ngoại lệ UnbalancedJournalException và rollback toàn bộ.",
          "Nhờ kiến trúc này, dù giao dịch đơn giản 2 chân (chuyển nội bộ miễn phí) hay giao dịch phức tạp 4 chân (trích khách hàng 5.001.100đ = ghi Có người nhận 5.000.000đ + ghi Có doanh thu phí 1.000đ + ghi Có thuế VAT 100đ), phương trình bảo toàn tiền tệ luôn được thực thi nghiêm ngặt."
        ],
        bullets: [
          "Lưu vết balance_after chính xác: Sau khi cộng/trừ trên đối tượng Account đang giữ khóa, gán ngay giá trị mới đó vào trường balanceAfter của dòng Posting tương ứng.",
          "Kết hợp Idempotency cùng Transaction: Bản ghi trạng thái COMPLETED trong bảng idempotency_records được cập nhật cùng nhịp COMMIT với bút toán sổ cái.",
          "Không gọi bất kỳ API mạng nào ở đây: Toàn bộ Transaction hạch toán nội bộ chỉ làm việc thuần túy với PostgreSQL cục bộ nên hoàn tất trong dưới 5 mili-giây!"
        ]
      },
      {
        heading: "3. Vũ khí tối thượng trên GitHub: Bài Test Đa luồng Bảo toàn Tổng tiền",
        paragraphs: [
          "Làm sao để chứng minh với nhà tuyển dụng rằng code của bạn thực sự chịu tải đa luồng chuẩn xác chứ không phải chỉ nói lý thuyết? Hãy viết class CoreLedgerConcurrencyIT dùng Testcontainers PostgreSQL!",
          "Trong bài test đó, bạn khởi tạo 10 tài khoản, mỗi tài khoản có đúng 10.000.000 VNĐ (tổng tiền toàn ngân hàng = 100.000.000 VNĐ). Sau đó dùng CountDownLatch thả đồng loạt 50 luồng thực hiện 500 lệnh chuyển tiền chéo ngẫu nhiên (kể cả chuyển vượt số dư và chuyển vòng tròn A→B→C→A). Khi tất cả kết thúc, bài test khẳng định 3 điều bất biến: (1) Không có bất kỳ Deadlock nào xảy ra, (2) Không một tài khoản nào có số dư âm, và (3) Tổng số dư của cả 10 tài khoản cộng lại vẫn bằng ĐÚNG 100.000.000,0000 VNĐ!"
        ],
        bullets: [
          "CountDownLatch tạo xung kích đồng thời: Bắt cả 50 luồng đứng chờ tại vạch xuất phát rồi nổ súng cùng một micro-giây để ép lộ mọi lỗi Race Condition tiềm ẩn.",
          "Kiểm tra đối chiếu kép trên Sổ cái: Khẳng định thêm rằng trên bảng postings, SUM(amount WHERE direction='DEBIT') bằng đúng SUM(amount WHERE direction='CREDIT').",
          "Đưa kết quả chạy test này vào README.md: Đây chính là bằng chứng kỹ thuật đanh thép nhất của một Senior thực thụ."
        ]
      }
    ],
    comparison: {
      title: "Kiểm tra 4 Bất biến Vàng trong Động cơ Core Ledger (Milestone 3)",
      headers: ["Bất biến (Invariant)", "Điều kiện toán học bắt buộc", "Nơi kiểm chứng", "Hậu quả nếu thiếu"],
      rows: [
        ["Dương tuyệt đối", "transferAmount.compareTo(ZERO) > 0", "DTO Validation + Domain Guard + SQL CHECK", "Kẻ tấn công truyền -10.000.000đ để hút tiền từ tài khoản đích về mình!"],
        ["Không âm khả dụng", "(ledgerBalance - heldAmount) >= debitTotal", "Bên trong vùng khóa SELECT FOR UPDATE + SQL CHECK", "Rút lố âm tiền khi nhiều kênh giao dịch cùng lúc"],
        ["Cân bằng Sổ cái Kép", "sum(DEBIT).compareTo(sum(CREDIT)) == 0", "LedgerEngine.postBalancedJournal()", "Lệch bảng cân đối kế toán toàn ngân hàng cuối ngày"],
        ["Thứ tự Khóa nhất quán", "lockIds = accountIds.stream().distinct().sorted()", "AccountRepository.lockAllByIdsOrdered()", "Treo cứng Deadlock khi hai khách hàng chuyển tiền qua lại cùng lúc"]
      ]
    },
    codeTitle: "InternalTransferUseCase.java — Hạch toán Sổ Cái Kép Chống Deadlock, Lũy Đẳng & Outbox",
    code: [
      "@Service",
      "public class InternalTransferUseCase {",
      "    private final AccountRepository accountRepo;",
      "    private final JournalRepository journalRepo;",
      "    private final OutboxRepository outboxRepo;",
      "",
      "    public InternalTransferUseCase(AccountRepository accountRepo, JournalRepository journalRepo, OutboxRepository outboxRepo) {",
      "        this.accountRepo = accountRepo; this.journalRepo = journalRepo; this.outboxRepo = outboxRepo;",
      "    }",
      "",
      "    @Transactional(rollbackFor = Exception.class)",
      "    public TransferReceipt execute(TransferCommand cmd) {",
      "        if (cmd.amount().compareTo(BigDecimal.ZERO) <= 0 || cmd.fromAccountId().equals(cmd.toAccountId())) {",
      "            throw new InvalidTransferException(\"Số tiền phải lớn hơn 0 và khác tài khoản nguồn/đích\");",
      "        }",
      "        Optional<Journal> existing = journalRepo.findByIdempotencyKey(cmd.idempotencyKey());",
      "        if (existing.isPresent()) return TransferReceipt.fromJournal(existing.get());",
      "",
      "        // Khóa bi quan theo thứ tự ID tăng dần -> Triệt tiêu 100% nguy cơ Deadlock A<->B!",
      "        List<Long> orderedIds = Stream.of(cmd.fromAccountId(), cmd.toAccountId()).sorted().toList();",
      "        Map<Long, Account> locked = accountRepo.findAllByIdOrderByIdAscForUpdate(orderedIds)",
      "            .stream().collect(Collectors.toMap(Account::getId, Function.identity()));",
      "",
      "        Account sender = locked.get(cmd.fromAccountId());",
      "        Account receiver = locked.get(cmd.toAccountId());",
      "        if (sender.availableBalance().compareTo(cmd.amount()) < 0) {",
      "            throw new InsufficientFundsException(sender.getAccountNo());",
      "        }",
      "",
      "        sender.debitLedger(cmd.amount());",
      "        receiver.creditLedger(cmd.amount());",
      "",
      "        Journal journal = Journal.balanced(cmd.idempotencyKey(), \"INTERNAL_TRANSFER\", List.of(",
      "            Posting.debit(sender.getId(), cmd.amount(), sender.getLedgerBalance()),",
      "            Posting.credit(receiver.getId(), cmd.amount(), receiver.getLedgerBalance())",
      "        ));",
      "        journalRepo.save(journal);",
      "        outboxRepo.save(OutboxEvent.balanceChanged(journal.getId(), sender, receiver, cmd.amount()));",
      "        return TransferReceipt.fromJournal(journal);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Dòng Stream.of(fromId, toId).sorted().toList() kết hợp câu truy vấn SELECT ... ORDER BY id ASC FOR UPDATE đảm bảo dù A chuyển cho B hay B chuyển cho A thì bản ghi có ID nhỏ hơn luôn được khóa trước.",
      "Hàm khởi tạo Journal.balanced(...) tự động kiểm tra tổng các dòng Posting.debit bằng đúng tổng các dòng Posting.credit bằng compareTo() == 0 trước khi cho phép tạo đối tượng.",
      "Cả 3 thao tác (cập nhật số dư 2 tài khoản, ghi sổ cái bất biến và ghi sự kiện Outbox) nằm gọn trong một local DB transaction cực nhanh không chứa bất kỳ lời gọi mạng nào."
    ],
    labGuide: {
      goal: "Cài đặt hoàn chỉnh luồng Chuyển khoản nội bộ và vượt qua bài test đồng thời 50 luồng trên PostgreSQL thật.",
      steps: [
        "Bước 1: Viết câu truy vấn @Lock(LockModeType.PESSIMISTIC_WRITE) kết hợp @QueryHints đặt jakarta.persistence.lock.timeout = 3000 và sắp xếp ORDER BY a.id ASC.",
        "Bước 2: Cài đặt lớp Journal.balanced() ném ngoại lệ ngay nếu danh sách bút toán bị lệch Nợ/Có.",
        "Bước 3: Viết bài test CoreLedgerConcurrencyIT tạo 10 tài khoản x 10 triệu VNĐ, chạy 50 luồng thực hiện 500 giao dịch chéo ngẫu nhiên.",
        "Bước 4: Thêm kịch bản test gửi cùng một idempotencyKey 10 lần đồng thời và xác minh người gửi chỉ bị trừ tiền đúng 1 lần duy nhất."
      ],
      expectedOutput: "500 giao dịch đa luồng hoàn tất trong < 3 giây với 0 lỗi Deadlock, 0 tài khoản âm tiền, và tổng số dư toàn hệ thống bảo toàn chính xác 100.000.000,0000 VNĐ."
    },
    examTips: [
      "Nếu thiếu kiểm tra cmd.amount() > 0, một người dùng ác ý gửi lệnh chuyển -5.000.000đ cho người khác sẽ khiến lệnh trừ biến thành cộng tiền vào tài khoản kẻ tấn công — đây là bài test bảo mật kinh điển!",
      "Lưu ý khi hai luồng gửi trùng cùng một idempotencyKey ở đúng cùng mili-giây: một luồng sẽ thắng, luồng kia gặp lỗi DataIntegrityViolationException do khóa UNIQUE — hãy bắt lỗi này và đọc lại kết quả của luồng thắng trả về êm đẹp.",
      "Đừng quên tách riêng worker đọc bảng outbox_events bằng SELECT ... FOR UPDATE SKIP LOCKED để đẩy sự kiện lên Kafka."
    ],
    summaryTakeaways: [
      "Luôn kiểm tra số tiền dương (> 0) và khác tài khoản nguồn/đích ngay cửa vào Domain.",
      "Khóa các tài khoản tham gia theo thứ tự ID tăng dần để loại bỏ hoàn toàn Deadlock.",
      "Thực thi phương trình cân bằng Nợ = Có trong hàm tạo chứng từ Journal.",
      "Kiểm chứng bằng bài test bất biến tổng tiền dưới tải đa luồng thực tế trên Testcontainers."
    ],
    lessonQuestions: [
      {
        question: "Điều gì sẽ xảy ra nếu một API chuyển tiền chỉ kiểm tra sender.availableBalance >= amount mà QUÊN kiểm tra điều kiện amount > 0?",
        options: [
          "Hệ thống chạy nhanh hơn mà không có rủi ro gì",
          "Kẻ tấn công có thể gửi lệnh chuyển số tiền âm (ví dụ -10.000.000đ) sang tài khoản bất kỳ: điều kiện số dư vẫn thỏa mãn và phép trừ số âm biến thành phép cộng 10.000.000đ vào tài khoản kẻ tấn công (rút trộm tiền từ người nhận)!",
          "PostgreSQL tự động biến số âm thành số 0",
          "Java ném lỗi chia cho 0"
        ],
        answer: 1,
        explanation: "Với balance = 1.000.000đ và amount = -10.000.000đ, biểu thức 1.000.000 >= -10.000.000 là ĐÚNG! Khi thực hiện sender.balance - (-10.000.000), kẻ gửi được cộng thêm 10 triệu lấy từ tài khoản người nhận. Đây là lỗi logic tài chính kinh điển.",
        wrongReasons: [
          "Đây là lỗ hổng nghiệp vụ cực kỳ nguy hiểm từng gây thiệt hại tiền thật ở nhiều ví điện tử nhỏ.",
          "",
          "Cột số dư cho phép phép cộng trừ bình thường nếu không chặn số tiền giao dịch > 0.",
          "Phép cộng trừ không gây lỗi chia cho 0."
        ]
      },
      {
        question: "Trong bài kiểm thử đa luồng 10 tài khoản (mỗi tài khoản 10 triệu VNĐ, tổng 100 triệu VNĐ) thực hiện 500 lệnh chuyển khoản nội bộ miễn phí ngẫu nhiên, tiêu chí nghiệm thu quan trọng nhất chứng minh không có Lost Update là gì?",
        options: [
          "Tất cả 500 lệnh đều phải thành công dù không đủ tiền",
          "Sau khi mọi luồng kết thúc, tổng số dư của cả 10 tài khoản vẫn bằng chính xác 100.000.000 VNĐ, không tài khoản nào bị âm và tổng phát sinh Nợ bằng tổng phát sinh Có trên sổ cái",
          "Thời gian chạy phải lâu hơn 10 phút",
          "Phải xóa hết bảng postings sau khi chạy xong"
        ],
        answer: 1,
        explanation: "Trong hệ thống đóng (chuyển khoản nội bộ không thu phí ngoài), tổng tiền là một đại lượng bảo toàn bất biến. Chỉ cần xảy ra dù 1 lần Race Condition ghi đè mất cập nhật, tổng tiền cuối kỳ sẽ lệch khỏi mốc 100.000.000 VNĐ ngay lập tức.",
        wrongReasons: [
          "Các lệnh vượt quá số dư hiện tại của tài khoản gửi bắt buộc phải bị từ chối an toàn.",
          "",
          "Với khóa dòng tối ưu, 500 giao dịch hoàn tất chỉ trong vài giây.",
          "Sổ cái phải giữ nguyên để đối chiếu tổng Debit == tổng Credit."
        ]
      }
    ]
  },

  C4: {
    duration: "65 phút",
    difficulty: "Đồ án Thực chiến · Milestone 4",
    codeLang: "java",
    teacherIntro: "Nếu chuyển khoản nội bộ ở Milestone 3 nằm trọn trong một Database thì sang Milestone 4, đồ án của bạn bước ra biển lớn: Chuyển tiền Nhanh Liên Ngân Hàng 24/7 (mô phỏng NAPAS IBFT), sinh mã thanh toán động VietQR chuẩn EMVCo CRC-16, điều phối Saga 3 nhánh trạng thái và chạy Job Spring Batch Đối soát cuối ngày (T+0)! Đặc biệt, chúng ta sẽ làm một công tắc cho phép bật giả lập 'Mạng đối tác Timeout' ngay lúc demo phỏng vấn để cho hội đồng thấy tận mắt cách hệ thống treo giao dịch vào tài khoản Suspense rồi tự động đối soát khớp lệnh!",
    analogy: {
      title: " Bưu cục chuyển phát tiền liên tỉnh và Phiên kiểm đếm đối chiếu cuối ca",
      body: "Khi gửi tiền sang ngân hàng khác, tiền không biến mất khỏi sổ sách mà được niêm phong bỏ vào 'Hòm tạm giữ chờ xe liên tỉnh'. Nếu xe báo về đã giao tận tay người nhận, ta gạch sổ quyết toán; nếu xe báo địa chỉ không tồn tại, ta mở hòm trả lại khách ngay. Còn nếu bão lớn làm mất liên lạc bộ đàm với xe (ReadTimeout), tuyệt đối không được vội đền tiền mới cho khách, mà phải chuyển phong bì sang 'Két treo chờ tra soát' đợi cuối ca đối chiếu biên bản giao nhận hai đầu rồi mới chốt!"
    },
    objectives: [
      "Cài đặt bộ sinh & kiểm tra chuỗi mã VietQR động tuân thủ chuẩn EMVCo TLV và thuật toán CRC-16/CCITT-FALSE.",
      "Xây dựng Saga Orchestrator tách bạch 3 pha (Hold → Call Partner ngoài DB Transaction → Capture / Release / Suspense) tuyệt đối không ngâm kết nối HikariCP.",
      "Xây dựng Job Spring Batch Đối soát T+0 đọc file CSV sao kê đối tác, tự động phát hiện giao dịch lệch và sinh bút toán giải tỏa tài khoản Suspense."
    ],
    flow: [
      {
        step: "1. Pha 1 — Đặt Hold ngắn gọn (Local TX #1)",
        detail: "Core Ledger tăng held_amount trên tài khoản khách và ghi bút toán tạm giữ vào GL_HOLD trong 3ms rồi đóng DB Transaction trả kết nối về Pool."
      },
      {
        step: "2. Pha 2 — Gọi Cổng Liên Ngân Hàng (No DB TX)",
        detail: "Payment Hub gọi HTTP/ISO 8583 sang Mock NAPAS Gateway với Timeout rõ ràng và tính năng giả lập kịch bản 00 (OK), 05 (Từ chối), 68 (Timeout)."
      },
      {
        step: "3. Pha 3 — Phân nhánh Quyết toán Saga (Local TX #2)",
        detail: "Nếu 00 -> tất toán Hold sang Nostro NAPAS; nếu 05 -> đảo bút toán hoàn giữ ngay; nếu 68/Timeout -> chuyển sang GL_SUSPENSE chờ đối soát."
      },
      {
        step: "4. Pha 4 — Spring Batch Đối soát T+0",
        detail: "Cuối ngày (hoặc bấm nút trên Back-office), Batch Job đối chiếu bảng giao dịch Payment Hub với file chuẩn của NAPAS để tự động tất toán hoặc hoàn tiền các lệnh treo."
      }
    ],
    sections: [
      {
        heading: "1. Tự tay viết Bộ sinh mã VietQR chuẩn EMVCo + CRC-16",
        paragraphs: [
          "Một tính năng cực kỳ trực quan khi demo đồ án là màn hình tạo mã QR nhận tiền tự động điền sẵn số tài khoản, ngân hàng và số tiền. Bản chất chuỗi nội dung nằm bên trong tấm ảnh VietQR không phải đường link web ngẫu nhiên, mà là chuỗi TLV (Tag - Length - Value) chuẩn EMVCo (ví dụ Tag 00='01', Tag 38 chứa AID A000000727 của NAPAS kèm mã BIN ngân hàng và số tài khoản, Tag 53='704' cho VNĐ, Tag 54 là số tiền, Tag 62 là mã đơn hàng).",
          "Ở cuối chuỗi luôn là Tag '6304' kèm 4 ký tự Hex tính bằng thuật toán đa thức CRC-16/CCITT-FALSE (giá trị khởi tạo 0xFFFF, đa thức 0x1021). Cài đặt hàm này gọn gàng trong 20 dòng Java giúp ứng dụng điện thoại ngân hàng thật quét thử mã QR trên màn hình đồ án của bạn nhận diện ra đúng chuẩn định dạng!"
        ],
        bullets: [
          "Định dạng độ dài luôn đủ 2 chữ số: Ví dụ giá trị '704' có độ dài 3 phải ghép thành '5303704' (Tag 53, Length 03, Value 704).",
          "Kiểm tra chéo CRC16 khi quét QR: Ở chiều người chuyển quét mã QR, Backend kiểm tra lại 4 ký tự cuối trước khi cho phép hiển thị thông tin thanh toán nhằm chặn mã QR bị dán đè sửa đổi.",
          "Gắn mã tham chiếu đơn hàng (Bill Number): Giúp Webhook nhận tiền tự động gạch nợ chính xác mà không cần khách gõ tay nội dung chuyển khoản."
        ]
      },
      {
        heading: "2. Kiến trúc Saga 3 Nhánh & Cổng Mock NAPAS Điều khiển được lỗi",
        paragraphs: [
          "Trong payment-hub-service, tuyệt đối không gắn @Transactional lên hàm điều phối tổng outboundTransfer()! Thay vào đó, hàm này gọi tuần tự: bước 1 gọi ledgerClient.placeHold() (mở và đóng TX1 nhanh), bước 2 gọi napasClient.transfer() hoàn toàn bên ngoài DB Transaction, và bước 3 dựa trên phản hồi để gọi ledgerClient.captureHold(), releaseHold() hoặc moveToSuspense().",
          "Để phục vụ demo phỏng vấn ấn tượng nhất, hãy viết một MockNapasController đọc quy tắc theo số tiền đuôi: ví dụ số tiền kết thúc bằng '...000' trả về thành công mã '00', kết thúc bằng '...404' trả về từ chối mã '05', và kết thúc bằng '...504' chủ động ngủ 4 giây gây ReadTimeout! Bạn có thể biểu diễn cả 3 kịch bản ngay trực tiếp trên giao diện chỉ trong 1 phút!"
        ],
        bullets: [
          "Tách bạch lỗi Tường minh (Definite Failure) và lỗi Mù mờ (Indeterminate Timeout): Chỉ hoàn tiền tức thì khi đối tác xác nhận rõ ràng giao dịch đã bị từ chối và chưa từng ghi Có.",
          "Lưu trạng thái Saga bền vững vào DB: Bảng outbound_transfers ghi lại từng chuyển đổi trạng thái (INIT -> HELD -> SENT -> SETTLED / COMPENSATED / PENDING_RECON) để nếu Pod sập giữa chừng vẫn khôi phục được.",
          "Đính kèm mã RRN / STAN duy nhất: Dùng làm khóa đối chiếu xuyên suốt giữa ngân hàng gửi và chuyển mạch trung gian."
        ]
      },
      {
        heading: "3. Spring Batch Đối soát Tự động T+0 giải quyết dứt điểm giao dịch treo",
        paragraphs: [
          "Mảnh ghép khép kín vòng đời thanh toán chính là Job Spring Batch chạy đối soát. Job đọc danh sách bản ghi từ file đối soát chuẩn của NAPAS theo từng Chunk (ví dụ 500 dòng/lần), tra cứu các giao dịch trong ngày tương ứng trên hệ thống nội bộ để phân loại thành 4 nhóm: MATCHED (Khớp hoàn toàn), MISSING_AT_PARTNER (Nội bộ treo nhưng NAPAS không ghi nhận -> kích hoạt hoàn tiền khách), PARTNER_SUCCESS_LOCAL_PENDING (Nội bộ treo do timeout mạng chiều về nhưng NAPAS đã cộng tiền -> kích hoạt tất toán) và AMOUNT_MISMATCH (Cảnh báo khẩn cấp cho vận hành).",
          "Mỗi quyết định xử lý sau đối soát đều gọi vào Core Ledger sinh bút toán hạch toán từ tài khoản GL_SUSPENSE và lưu biên bản vào bảng reconciliation_reports hiển thị lên màn hình Back-office."
        ],
        bullets: [
          "Tính lũy đẳng khi chạy lại Batch Job: Nếu nhân viên vận hành bấm chạy lại đối soát ngày 24/11 lần thứ hai, các giao dịch đã giải tỏa khỏi trạng thái PENDING_RECON sẽ được bỏ qua an toàn.",
          "Cửa sổ biên lúc 23:59:59 (Cut-off Window): Các giao dịch vừa gửi lúc 23:59:58 chưa kịp sang file ngày hôm nay sẽ được giữ chờ thêm kỳ đối soát kế tiếp thay vì vội kết luận thất bại.",
          "Báo cáo tổng hợp trực quan: Đếm tổng số giao dịch khớp, tổng tiền quyết toán ròng và danh sách các ca đã tự động chữa lành (Auto-healed)."
        ]
      }
    ],
    comparison: {
      title: "Quy tắc Xử lý 3 Nhánh Phản hồi Liên Ngân Hàng trong Saga Orchestrator",
      headers: ["Tình huống phản hồi từ Đối tác", "Trạng thái nghiệp vụ thực sự", "Hành động của Saga Orchestrator", "Bút toán Sổ cái tương ứng"],
      rows: [
        ["HTTP 200 + Mã phản hồi DE39 = '00'", "Ngân hàng bạn đã ghi Có thành công cho người nhận", "Chuyển trạng thái SETTLED, thông báo thành công cho khách", "Nợ GL_HOLD / Có GL_NAPAS_NOSTRO + GL_FEE"],
        ["HTTP 200 + Mã lỗi DE39 = '05' / '14' (Sai TK)", "Đối tác từ chối dứt khoát, chưa hề cộng tiền bên nhận", "Kích hoạt Saga Compensation hoàn giữ ngay lập tức", "Nợ GL_HOLD / Có CASA Khách hàng (Hoàn 100%)"],
        ["ReadTimeout / HTTP 502 / 504 / Mã '68'", "Chưa rõ kết quả (gói tin có thể đã tới đích nhưng rớt chiều về)", "CẤM tự hoàn ngay! Chuyển sang PENDING_RECON chờ đối soát", "Nợ GL_HOLD / Có GL_SUSPENSE (Treo tra soát)"]
      ]
    },
    codeTitle: "VietQrGenerator.java & OutboundTransferSaga.java — Sinh VietQR CRC16 & Điều phối Saga không giữ DB Connection",
    code: [
      "public final class VietQrGenerator {",
      "    public static String generateDynamicQr(String bankBin, String accountNo, long amountVnd, String billId) {",
      "        String beneficiary = tlv(\"00\", bankBin) + tlv(\"01\", accountNo);",
      "        String merchantAcc = tlv(\"00\", \"A000000727\") + tlv(\"01\", beneficiary) + tlv(\"02\", \"QRIBFTTA\");",
      "        String raw = tlv(\"00\", \"01\") + tlv(\"01\", \"12\") + tlv(\"38\", merchantAcc)",
      "                   + tlv(\"53\", \"704\") + tlv(\"54\", String.valueOf(amountVnd))",
      "                   + tlv(\"58\", \"VN\") + tlv(\"62\", tlv(\"01\", billId)) + \"6304\";",
      "        return raw + crc16CcittFalse(raw);",
      "    }",
      "",
      "    private static String tlv(String tag, String val) {",
      "        return String.format(\"%s%02d%s\", tag, val.length(), val);",
      "    }",
      "",
      "    public static String crc16CcittFalse(String input) {",
      "        int crc = 0xFFFF;",
      "        for (byte b : input.getBytes(StandardCharsets.UTF_8)) {",
      "            crc ^= (b & 0xFF) << 8;",
      "            for (int i = 0; i < 8; i++) {",
      "                crc = ((crc & 0x8000) != 0) ? ((crc << 1) ^ 0x1021) : (crc << 1);",
      "            }",
      "        }",
      "        return String.format(\"%04X\", crc & 0xFFFF);",
      "    }",
      "}",
      "",
      "// Trong OutboundTransferSaga (KHÔNG gắn @Transactional ở hàm điều phối tổng!):",
      "public OutboundResult executeInterbank(InterbankCmd cmd) {",
      "    HoldTicket hold = ledgerStepService.placeHoldInShortTx(cmd); // TX 1 (< 5ms)",
      "    try {",
      "        NapasResp resp = napasHttpClient.sendTransfer(cmd, hold.rrn()); // Ngoài DB TX!",
      "        return \"00\".equals(resp.code())",
      "            ? ledgerStepService.captureHoldInShortTx(hold)       // TX 2a: Tất toán",
      "            : ledgerStepService.compensateReleaseInShortTx(hold); // TX 2b: Đảo hoàn giữ",
      "    } catch (ResourceAccessException | TimeoutException unknownErr) {",
      "        return ledgerStepService.parkIntoSuspenseInShortTx(hold); // TX 2c: Treo chờ Đối soát",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Hàm VietQrGenerator tuân thủ đúng đặc tả NAPAS VietQR (AID A000000727, mã dịch vụ chuyển nhanh tới tài khoản QRIBFTTA, mã tiền tệ 704 VNĐ) và kết thúc bằng CRC-16 đa thức 0x1021.",
      "Hàm executeInterbank() cố ý KHÔNG có @Transactional bao ngoài: kết nối PostgreSQL chỉ mở vài mili-giây ở bước placeHoldInShortTx rồi trả ngay về HikariCP trước khi gọi mạng sang napasHttpClient.",
      "Khối catch(TimeoutException) không bao giờ gọi compensateReleaseInShortTx ngay mà đẩy an toàn sang parkIntoSuspenseInShortTx chờ Job đối soát xác minh."
    ],
    labGuide: {
      goal: "Hoàn thiện bộ sinh mã VietQR, luồng Saga liên ngân hàng 3 kịch bản và Job Spring Batch đối soát T+0.",
      steps: [
        "Bước 1: Cài đặt VietQrGenerator kèm Unit Test đối chiếu mã CRC-16 với một chuỗi VietQR mẫu chuẩn của NAPAS.",
        "Bước 2: Dựng MockNapasController giả lập 3 kịch bản phản hồi (00 thành công, 05 tài khoản đóng, và timeout ngủ quá ReadTimeout 3 giây).",
        "Bước 3: Cài đặt OutboundTransferSaga và kiểm chứng HikariCP active connections bằng 0 trong suốt thời gian chờ Mock NAPAS ngủ 4 giây.",
        "Bước 4: Viết Spring Batch ReconciliationJob đọc danh sách giao dịch thực tế từ Mock NAPAS, tự động chuyển các giao dịch đang PENDING_RECON về SETTLED hoặc COMPENSATED chính xác."
      ],
      expectedOutput: "Giao dịch gặp ReadTimeout tự động vào trạng thái Đang tra soát (Suspense); sau khi kích hoạt Job Đối soát T+0, số dư và sổ cái hai bên khớp 100%."
    },
    examTips: [
      "Màn trình diễn 'ăn tiền' nhất khi phỏng vấn: Bấm chuyển 1.000.504đ -> giao diện báo 'Đang xử lý liên ngân hàng' -> Mở màn hình Back-office bấm 'Chạy Đối Soát T+0' -> Giao dịch tự khớp và nổ thông báo hoàn tất!",
      "Nhớ trả lời rõ khi được hỏi: 'Mã 6304 cuối chuỗi VietQR nghĩa là gì?' -> Tag 63 (CRC), độ dài 04 ký tự Hex tính theo CRC-16/CCITT-FALSE trên toàn bộ chuỗi đứng trước nó (bao gồm cả chữ 6304).",
      "Luôn cấu hình cả ConnectTimeout ngắn (2s) và ReadTimeout xác định (5–15s) cho napasHttpClient."
    ],
    summaryTakeaways: [
      "Tách biệt hoàn toàn lời gọi HTTP liên ngân hàng ra khỏi phạm vi DB Transaction.",
      "Phân biệt rạch ròi lỗi Từ chối tường minh (hoàn ngay) và lỗi Timeout mù mờ (treo Suspense chờ đối soát).",
      "Chuỗi VietQR chuẩn EMVCo luôn được bảo vệ toàn vẹn bằng 4 ký tự CRC-16 ở Tag 63.",
      "Đối soát tự động T+0/T+1 là chốt chặn bắt buộc để chữa lành mọi sự cố mạng phân tán."
    ],
    lessonQuestions: [
      {
        question: "Trong OutboundTransferSaga của đồ án, tại sao khi gặp ngoại lệ ReadTimeout từ cổng NAPAS hệ thống lại gọi parkIntoSuspenseInShortTx(hold) thay vì gọi compensateReleaseInShortTx(hold) để hoàn tiền ngay cho khách?",
        options: [
          "Để giữ tiền khách hàng lấy lãi qua đêm",
          "Vì ReadTimeout chỉ có nghĩa là đứt kết nối chiều nhận phản hồi; lệnh chuyển tiền rất có thể đã sang tới ngân hàng đích và cộng tiền cho người nhận rồi — tự ý hoàn tiền ngay sẽ khiến ngân hàng mất tiền hai đầu",
          "Vì Java không cho phép gọi hàm hoàn tiền trong khối catch",
          "Để làm đầy bảng dữ liệu Suspense"
        ],
        answer: 1,
        explanation: "Trong hệ thống phân tán, Timeout là trạng thái bất định (Unknown/Indeterminate). Chỉ sau khi tra soát trực tiếp trạng thái giao dịch hoặc chạy đối soát với dữ liệu chuẩn của NAPAS mới biết chắc chắn cần tất toán hay hoàn trả.",
        wrongReasons: [
          "Mục tiêu hoàn toàn là phòng chống rủi ro thất thoát kép do bất định mạng, không phải giữ tiền lấy lãi.",
          "",
          "Java cho phép gọi bất kỳ phương thức nào trong khối catch.",
          "Tài khoản Suspense chỉ giữ tạm các giao dịch nghi vấn cho tới phiên đối soát gần nhất."
        ]
      },
      {
        question: "Nếu bạn vô tình đặt annotation @Transactional ngay trên hàm executeInterbank() bọc cả lời gọi napasHttpClient.sendTransfer() có ReadTimeout = 15 giây, điều gì sẽ xảy ra khi cổng đối tác bị nghẽn mạng?",
        options: [
          "Database tự động chạy nhanh gấp đôi",
          "Chỉ mất đúng 20 request đồng thời (bằng kích thước HikariCP pool mặc định) để ngâm kín toàn bộ kết nối DB suốt 15 giây, làm tê liệt luôn cả tính năng đăng nhập và chuyển khoản nội bộ của toàn ngân hàng",
          "Giao dịch tự động chuyển sang chạy trên Redis",
          "Không ảnh hưởng gì vì HTTP chạy khác cổng với PostgreSQL"
        ],
        answer: 1,
        explanation: "Khi hàm có @Transactional bắt đầu tương tác DB, luồng đó giữ chặt 1 kết nối vật lý từ HikariCP cho tới tận lúc thoát khỏi hàm. Ngâm kết nối DB để chờ mạng bên ngoài là nguyên nhân số 1 gây sập dây chuyền toàn hệ thống.",
        wrongReasons: [
          "Giữ khóa và kết nối lâu chỉ làm tắc nghẽn chứ không bao giờ làm DB nhanh hơn.",
          "",
          "Spring không tự động chuyển đổi CSDL quan hệ sang Redis.",
          "Dù khác cổng mạng nhưng cùng một luồng xử lý đang giam giữ kết nối DB chưa trả về Pool."
        ]
      }
    ]
  },

  C5: {
    duration: "55 phút",
    difficulty: "Đồ án Thực chiến · Milestone 5",
    codeLang: "typescript",
    teacherIntro: "Một kỹ sư Backend Senior biết dựng thêm một giao diện Frontend tinh gọn, an toàn và mượt mà cho đồ án của mình sẽ có lợi thế cạnh tranh áp đảo trong mọi buổi phỏng vấn! Ở Milestone 5, chúng ta sẽ xây dựng ứng dụng Web kép bằng React + TypeScript + TanStack Query: một mặt là Cổng Internet Banking cho khách hàng (xem số dư khả dụng/số dư thực, quét & sinh VietQR, chuyển tiền chống bấm đúp, nhận popup báo tiền về tức thời qua SSE), mặt kia là Cổng Vận hành Back-office để theo dõi Saga và bấm chạy Đối soát T+0 trực quan!",
    analogy: {
      title: "Quầy giao dịch kính trong suốt và Bảng điện tử nhảy số tức thời",
      body: "Nếu Backend Core Ledger là cỗ máy in chứng từ chính xác tuyệt đối nằm sau tấm kính chống đạn, thì giao diện React chính là bàn giao dịch khang trang kèm màn hình điện tử báo số dư nhảy tức khắc ngay khi tiền vừa chạm tài khoản — giúp cả khách hàng lẫn hội đồng phỏng vấn nhìn thấy tận mắt vẻ đẹp của kiến trúc ngầm bên dưới."
    },
    objectives: [
      "Xây dựng giao diện Chuyển khoản an toàn với TypeScript + TanStack Query, tự động sinh cố định Idempotency-Key cho mỗi ý định giao dịch và khóa chống bấm đúp.",
      "Tích hợp luồng Server-Sent Events (SSE) kết nối qua BFF để đẩy thông báo biến động số dư và cập nhật lại cache số dư tức thời không cần F5.",
      "Dựng màn hình Back-Office Giám sát Saga & Đối soát T+0 hiển thị trực quan bảng chứng từ Nợ/Có của từng giao dịch."
    ],
    flow: [
      {
        step: "1. Tải Dashboard qua BFF Cookie",
        detail: "Ứng dụng React gọi /api/v1/accounts/summary với credentials: 'include', hiển thị rành mạch Số dư khả dụng, Khoản đang tạm giữ và Sao kê phân trang."
      },
      {
        step: "2. Lập lệnh & Khóa Idempotency trên UI",
        detail: "Ngay khi mở bước xác nhận chuyển tiền, Frontend cố định 1 mã UUID Idempotency-Key; nếu rớt mạng bấm 'Thử lại', mã cũ được gửi lại nguyên vẹn."
      },
      {
        step: "3. Polling thông minh cho trạng thái PENDING",
        detail: "Nếu giao dịch liên ngân hàng trả về trạng thái PENDING_RECON, TanStack Query tự động theo dõi nhẹ nhàng mà không khóa cứng màn hình người dùng."
      },
      {
        step: "4. Nhận Push biến động số dư qua SSE",
        detail: "Khi Kafka Outbox phát sự kiện tiền về, BFF đẩy bản tin qua EventSource giúp giao diện nổ thông báo cộng tiền và gọi invalidateQueries làm mới sao kê ngay lập tức."
      }
    ],
    sections: [
      {
        heading: "1. Thiết kế Form Chuyển tiền chuẩn Ngân hàng số trên React + TypeScript",
        paragraphs: [
          "Trên giao diện ngân hàng thật, luồng chuyển tiền luôn chia làm 3 bước rõ ràng (Wizard 3-Step): Bước 1 nhập tài khoản nhận (tự động gọi API Inquiry hiển thị tên chủ tài khoản viết hoa không dấu để chống chuyển nhầm) và số tiền định dạng dấu chấm phân cách hàng nghìn; Bước 2 xem lại thông tin phí + nhập mã Smart OTP 6 số; Bước 3 hiển thị Biên lai điện tử kèm mã tham chiếu.",
          "Điểm kỹ thuật quan trọng nhất ở Bước 2 là quản lý vòng đời Idempotency-Key: mã UUID được khởi tạo đúng lúc người dùng chốt thông tin ở Bước 1 sang Bước 2. Chỉ khi người dùng chủ động bấm 'Tạo giao dịch mới' thì mới sinh mã UUID khác; còn nếu mạng Wi-Fi chập chờn báo timeout và người dùng bấm 'Gửi lại', hook useMutation vẫn dùng đúng mã UUID cũ để đảm bảo an toàn 100%."
        ],
        bullets: [
          "Không tính toán tiền bằng kiểu Number dấu phẩy động: Mọi số tiền gửi xuống API dưới dạng chuỗi thập phân chuẩn ('5000000') khớp với kiểu BigDecimal của Spring Boot.",
          "Khóa nút tức thì bằng mutation.isPending: Vô hiệu hóa nút xác nhận ngay mili-giây đầu tiên người dùng nhấp chuột hoặc nhấn Enter.",
          "Tự động tra vấn tên người nhận (Debounced Account Inquiry): Đợi người dùng ngừng gõ số tài khoản 400ms mới gọi API tra cứu tên để tiết kiệm băng thông."
        ]
      },
      {
        heading: "2. Thông báo Biến động Số dư Thời gian thực với SSE + TanStack Query",
        paragraphs: [
          "Khi bạn mở song song 2 tab trình duyệt (Tab 1 đăng nhập tài khoản Nguyễn Văn A, Tab 2 đăng nhập tài khoản Trần Thị B) rồi thực hiện chuyển 2.000.000đ từ A sang B: ngay khoảnh khắc A bấm xác nhận, bên Tab 2 của B tự động bật thông báo xanh '+2.000.000 ₫ từ NGUYEN VAN A' và con số dư cùng bảng sao kê tự nhảy mới mà không hề bấm tải lại trang!",
          "Để làm được hiệu ứng ấn tượng đó cực kỳ gọn nhẹ, BFF mở endpoint /api/v1/stream/notifications trả về SseEmitter, lắng nghe sự kiện từ Kafka topic ledger.events rồi đẩy xuống kết nối của đúng CIF người nhận. Phía React dùng EventSource bắt sự kiện và gọi queryClient.invalidateQueries({ queryKey: ['accounts'] })."
        ],
        bullets: [
          "Tự động kết nối lại khi rớt mạng: Chuẩn trình duyệt EventSource hỗ trợ sẵn cơ chế tự động kết nối lại kèm Last-Event-ID rất tiện lợi.",
          "Xóa sạch Cache khi Đăng xuất: Bắt buộc gọi queryClient.clear() ngay khi người dùng bấm Logout để không lộ sao kê cũ trên máy tính dùng chung.",
          "Ảo hóa danh sách sao kê dài: Sử dụng phân trang con trỏ (useInfiniteQuery kết hợp Keyset cursor) giúp cuộn hàng nghìn giao dịch mượt ở mức 60 FPS."
        ]
      },
      {
        heading: "3. Trang Back-Office Đối soát & Sổ cái — Điểm nhấn chinh phục Tech Lead",
        paragraphs: [
          "Hãy thêm một tab 'Quản trị Vận hành (Back-office)' ngay trên giao diện đồ án! Tại đây hiển thị trực tiếp bảng Sổ cái Kép (cho thấy rõ từng giao dịch sinh ra các dòng DEBIT/CREDIT nào và tổng bằng 0 ra sao), danh sách các giao dịch liên ngân hàng đang treo ở GL_SUSPENSE và nút bấm 'Chạy Job Đối Soát T+0 ngay'.",
          "Màn hình này biến những khái niệm Backend trừu tượng nhất của bạn thành hình ảnh sống động mà bất kỳ người phỏng vấn nào — từ HR, PM đến Principal Architect — nhìn vào trong 30 giây đều hiểu ngay giá trị vượt trội của hệ thống bạn xây dựng."
        ],
        bullets: [
          "Công tắc Chaos Testing trực quan: Cho phép bật/tắt chế độ giả lập 'NAPAS chậm 5s / Timeout' ngay trên thanh công cụ demo mà không cần sửa code khởi động lại server.",
          "Hiển thị X-Correlation-Id trên từng biên lai: Bấm vào mã giao dịch mở ra toàn bộ nhật ký hành trình từ Gateway -> Core Ledger -> Kafka.",
          "Giao diện Responsive sạch sẽ: Dùng bảng màu xanh đậm - ngọc lục bảo chuẩn ngân hàng, chữ số tiền căn phải dùng font-variant-numeric: tabular-nums thẳng hàng."
        ]
      }
    ],
    comparison: {
      title: "Lựa chọn Công nghệ Giao tiếp Frontend ↔ Backend trong Ngân hàng Số",
      headers: ["Nhu cầu nghiệp vụ", "Giải pháp chọn dùng", "Lý do vượt trội", "Tránh dùng sai"],
      rows: [
        ["Gửi lệnh chuyển khoản / xác thực OTP", "REST POST qua BFF + Idempotency-Key + HttpOnly Cookie", "Chuẩn mực, dễ kiểm soát Rate Limit, WAF và trạng thái lỗi RFC 7807", "Không gửi lệnh chuyển tiền qua WebSocket thiếu ngữ nghĩa HTTP"],
        ["Đẩy thông báo tiền về / kết quả quét VietQR", "Server-Sent Events (SSE - EventSource)", "Một chiều Server -> Client cực nhẹ, chạy chuẩn HTTP, tự kết nối lại", "Không dùng Polling 500ms liên tục cho toàn bộ người dùng đang mở app"],
        ["Quản lý dữ liệu Tài khoản & Sao kê trên React", "TanStack Query (Server State) + Keyset Infinite Scroll", "Tự động quản lý vòng đời cache, làm mới tức thì khi nhận SSE", "Không nhét toàn bộ lịch sử sao kê vào Redux hay localStorage"]
      ]
    },
    codeTitle: "useTransferFlow.ts — Custom Hook Chuyển tiền Giữ Cố Định Idempotency-Key & Đồng bộ SSE",
    code: [
      "import { useEffect, useRef, useState } from 'react';",
      "import { useMutation, useQueryClient } from '@tanstack/react-query';",
      "",
      "export interface TransferPayload {",
      "  fromAccountNo: string;",
      "  toAccountNo: string;",
      "  amountPlain: string; // Chuỗi số nguyên chuẩn '5000000', tránh sai số IEEE 754",
      "  draftId: string;",
      "  smartOtp: string;",
      "}",
      "",
      "export function useBankingTransferAndStream() {",
      "  const queryClient = useQueryClient();",
      "  // Giữ cố định Idempotency-Key suốt vòng đời thử lại của cùng 1 giao dịch",
      "  const idemKeyRef = useRef<string>(crypto.randomUUID());",
      "  const [lastAlert, setLastAlert] = useState<string | null>(null);",
      "",
      "  useEffect(() => {",
      "    const es = new EventSource('/api/v1/stream/notifications', { withCredentials: true });",
      "    es.addEventListener('BALANCE_UPDATED', (ev: MessageEvent) => {",
      "      const data = JSON.parse(ev.data);",
      "      setLastAlert(`Biến động số dư: ${data.sign}${data.amountFormatted} ₫ (${data.memo})`);",
      "      queryClient.invalidateQueries({ queryKey: ['accounts'] });",
      "      queryClient.invalidateQueries({ queryKey: ['statements'] });",
      "    });",
      "    return () => es.close();",
      "  }, [queryClient]);",
      "",
      "  const transferMutation = useMutation({",
      "    mutationFn: async (payload: TransferPayload) => {",
      "      const res = await fetch('/api/v1/transfers', {",
      "        method: 'POST',",
      "        credentials: 'include',",
      "        headers: {",
      "          'Content-Type': 'application/json',",
      "          'Idempotency-Key': idemKeyRef.current,",
      "        },",
      "        body: JSON.stringify(payload),",
      "      });",
      "      if (!res.ok) throw await res.json(); // Chuẩn RFC 7807 ProblemDetail",
      "      return res.json();",
      "    },",
      "    onSuccess: () => {",
      "      queryClient.invalidateQueries({ queryKey: ['accounts'] });",
      "    },",
      "  });",
      "",
      "  const resetForNewTransfer = () => {",
      "    idemKeyRef.current = crypto.randomUUID();",
      "    transferMutation.reset();",
      "  };",
      "",
      "  return { transferMutation, resetForNewTransfer, lastAlert };",
      "}"
    ].join("\n"),
    codeNotes: [
      "Biến idemKeyRef dùng useRef giữ chặt đúng 1 mã UUID xuyên suốt mọi lần bấm Retry khi rớt mạng; chỉ khi người dùng chủ động tạo giao dịch hoàn toàn mới (gọi resetForNewTransfer) thì mã UUID mới được cấp lại.",
      "Cấu hình credentials: 'include' trên cả fetch và EventSource cho phép trình duyệt tự động đính kèm Cookie phiên HttpOnly an toàn lên BFF mà code JS không hề chạm vào bất kỳ chuỗi Token nhạy cảm nào.",
      "Ngay khi nhận sự kiện SSE BALANCE_UPDATED, lời gọi invalidateQueries kích hoạt tải lại ngầm số dư và sao kê mới nhất một cách mượt mà."
    ],
    labGuide: {
      goal: "Xây dựng giao diện Internet Banking + Back-Office Đối soát kết nối trực tiếp với Backend Core.",
      steps: [
        "Bước 1: Khởi tạo dự án Vite + React + TypeScript, cài đặt @tanstack/react-query và cấu hình proxy chuyển /api về cổng gateway-bff (8080).",
        "Bước 2: Xây dựng màn hình Dashboard hiển thị thẻ tài khoản (Số dư thực tế, Khoản tạm giữ Hold, Số dư khả dụng) và mã ảnh QR thanh toán tự sinh từ chuỗi VietQR của Backend.",
        "Bước 3: Xây dựng Wizard Chuyển khoản 3 bước sử dụng hook useBankingTransferAndStream và thử ngắt mạng giữa chừng rồi bấm gửi lại để xác nhận không trừ tiền kép.",
        "Bước 4: Dựng trang Back-office hiển thị bảng đối chiếu bút toán Nợ/Có và nút kích hoạt Job Đối soát T+0."
      ],
      expectedOutput: "Mở 2 cửa sổ trình duyệt chuyển tiền cho nhau thấy số dư và thông báo cập nhật tức thời dưới 500ms mà không cần tải lại trang."
    },
    examTips: [
      "Khi trình bày phần Frontend trước hội đồng Backend, hãy nhấn mạnh 3 điểm giao thoa kiến trúc: (1) Không lộ Token xuống JS nhờ BFF HttpOnly Cookie, (2) Chống nhân bản lệnh từ gốc UI bằng Idempotency-Key cố định, và (3) Truyền tiền tệ dạng chuỗi chuẩn thay vì Number.",
      "Sử dụng thuộc tính CSS font-variant-numeric: tabular-nums cho mọi cột tiền tệ trên bảng sao kê để các chữ số thẳng cột như bảng kế toán chuyên nghiệp.",
      "Đừng quên xử lý đóng kết nối EventSource trong hàm cleanup của useEffect để tránh rò rỉ kết nối khi chuyển trang."
    ],
    summaryTakeaways: [
      "Giữ cố định Idempotency-Key theo ý định giao dịch trên UI cho tới khi người dùng tạo lệnh mới.",
      "Truyền số tiền dưới dạng chuỗi thập phân chuẩn để bảo toàn độ chính xác với BigDecimal phía Java.",
      "Kết hợp SSE và TanStack Query invalidateQueries để cập nhật biến động số dư thời gian thực.",
      "Màn hình Back-office trực quan hóa Sổ cái Kép và Đối soát giúp buổi demo phỏng vấn thuyết phục gấp bội."
    ],
    lessonQuestions: [
      {
        question: "Trong hook useBankingTransferAndStream ở trên, vì sao Idempotency-Key lại được giữ trong useRef và chỉ đổi mới khi người dùng bấm 'Tạo giao dịch mới' thay vì gọi crypto.randomUUID() bên trong hàm mutationFn?",
        options: [
          "Vì hàm crypto.randomUUID() chạy rất tốn pin điện thoại",
          "Vì nếu đặt crypto.randomUUID() bên trong mutationFn, mỗi khi mạng lag người dùng bấm 'Thử lại' sẽ sinh ra một khóa mới tinh khiến Backend tưởng là lệnh chuyển tiền thứ hai và trừ tiền hai lần!",
          "Vì TypeScript cấm gọi hàm ngẫu nhiên trong hàm async",
          "Để mọi khách hàng toàn ngân hàng dùng chung một mã duy nhất"
        ],
        answer: 1,
        explanation: "Mục đích cốt lõi của Idempotency-Key là định danh duy nhất cho MỘT ý định chuyển tiền của người dùng qua nhiều lần thử truyền mạng. Sinh khóa mới ở mỗi lần retry sẽ phá hỏng hoàn toàn cơ chế chống trùng lặp.",
        wrongReasons: [
          "Sinh một chuỗi UUID tốn chưa tới vài micro-giây CPU.",
          "",
          "TypeScript hoàn toàn cho phép gọi crypto.randomUUID() trong hàm async.",
          "Mỗi giao dịch mới đều được cấp UUID riêng qua hàm resetForNewTransfer()."
        ]
      },
      {
        question: "Khi người dùng bấm nút 'Đăng xuất' (Logout) trên ứng dụng React Internet Banking dùng TanStack Query, ngoài việc gọi API hủy phiên trên BFF, thao tác nào phía Client là bắt buộc để bảo mật dữ liệu riêng tư?",
        options: [
          "Tăng thời gian staleTime lên 24 giờ",
          "Gọi queryClient.clear() (và xóa sạch state nhạy cảm trên bộ nhớ) để người dùng tiếp theo ngồi vào cùng máy tính đó không nhìn thấy số dư hay lịch sử sao kê còn lưu trong RAM cache",
          "Lưu lại toàn bộ sao kê vào localStorage để lần sau mở nhanh hơn",
          "Tắt kiểm tra CORS trên trình duyệt"
        ],
        answer: 1,
        explanation: "Trong các ứng dụng Single-Page App (SPA), chuyển về màn hình Login bằng Router không làm làm mới bộ nhớ JS nếu không xóa cache tường minh; gọi queryClient.clear() đảm bảo dọn sạch toàn bộ dữ liệu tài chính phiên cũ.",
        wrongReasons: [
          "Giữ cache lâu sau khi đăng xuất gây lộ thông tin tài khoản giữa các phiên người dùng.",
          "",
          "Lưu sao kê tài chính vào localStorage vi phạm nghiêm trọng nguyên tắc bảo vệ dữ liệu nhạy cảm khách hàng.",
          "Người dùng và ứng dụng web không thể cũng như không bao giờ được tắt cơ chế bảo mật CORS của trình duyệt."
        ]
      }
    ]
  },

  C6: {
    duration: "60 phút",
    difficulty: "Đồ án Thực chiến · Milestone 6 (Hoàn tất & Ứng tuyển)",
    codeLang: "yaml",
    teacherIntro: "Chặng cuối cùng đã tới! Một đồ án xuất sắc đến mấy nhưng nếu người chấm tuyển dụng tải về phải cài đặt thủ công 7 bước bị lỗi thiếu biến môi trường thì họ sẽ đóng lại sau 2 phút. Ở Milestone 6, chúng ta đóng gói toàn bộ hệ sinh thái FinBank (PostgreSQL, Redis, Kafka, Core-Ledger, Payment-Hub, Gateway-BFF, React-UI, OpenTelemetry, Prometheus và Grafana Dashboard) chạy mượt mà chỉ bằng ĐÚNG MỘT LỆNH 'docker compose up -d', đo kiểm tải thực tế bằng k6 và hoàn thiện bộ CV + README chuẩn Kiến trúc sư để bạn tự tin chinh phục mức lương Senior tại bất kỳ ngân hàng hay Fintech nào!",
    analogy: {
      title: "Bàn giao chìa khóa trao tay chi nhánh ngân hàng mẫu kèm biên bản kiểm định tải",
      body: "Thay vì gửi cho hội đồng tuyển dụng một bao tải gạch vữa rời rạc bắt họ tự xây, bạn trao cho họ chiếc chìa khóa bấm nút một chạm là cả chi nhánh ngân hàng sáng đèn vận hành trơn tru, trên tường có sẵn màn hình trung tâm chỉ huy Grafana nhảy thông số TPS và độ trễ P99 theo thời gian thực!"
    },
    objectives: [
      "Viết tệp docker-compose.yml hoàn chỉnh có kiểm tra sức khỏe (healthcheck) thứ tự khởi động chuẩn xác và ngân sách bộ nhớ JVM an toàn.",
      "Tích hợp OpenTelemetry Java Agent nối vết giao dịch đầu-cuối (HTTP → Kafka → PostgreSQL) và cấu hình bảng theo dõi Grafana đo TPS, tỷ lệ lỗi & độ trễ P95/P99.",
      "Thực hiện kịch bản kiểm thử tải k6, viết tài liệu Architecture Decision Records (ADR) trong README.md và hoàn thiện hồ sơ ứng tuyển Senior Java Ngân hàng."
    ],
    flow: [
      {
        step: "1. Đóng gói Container chuẩn Ngân hàng",
        detail: "Xây dựng ảnh Docker Multi-stage chạy non-root user, gắn -XX:MaxRAMPercentage=70.0 và cấu hình Graceful Shutdown cho từng dịch vụ."
      },
      {
        step: "2. Khởi chạy Hạ tầng & Giám sát 1 Lệnh",
        detail: "Dùng Docker Compose dựng đồng bộ Postgres 16, Redis 7, Kafka KRaft, các dịch vụ Java/React cùng bộ sưu tập OpenTelemetry + Prometheus + Grafana."
      },
      {
        step: "3. Bắn tải k6 & Chụp Bằng chứng Hiệu năng",
        detail: "Chạy kịch bản k6 giả lập hàng trăm người dùng đồng thời chuyển khoản và tra cứu sao kê, ghi nhận P99 < 150ms và 0% sai lệch sổ cái."
      },
      {
        step: "4. Đóng gói README Kiến trúc & Luyện Bảo vệ",
        detail: "Trình bày sơ đồ kiến trúc, 5 quyết định thiết kế (ADR), hướng dẫn chạy thử 1 phút và kịch bản demo phỏng vấn trực tiếp."
      }
    ],
    sections: [
      {
        heading: "1. Đóng gói Docker Compose 'Một Lệnh Chạy Ngay' không lỗi vặt",
        paragraphs: [
          "Lỗi kinh điển nhất khi đóng gói Docker Compose là ứng dụng Spring Boot khởi động nhanh hơn PostgreSQL hoặc Kafka nên văng lỗi Connection Refused rồi tắt ngấm! Để giải quyết triệt để, mọi container hạ tầng trong docker-compose.yml bắt buộc khai báo khối healthcheck (dùng pg_isready cho Postgres, redis-cli ping cho Redis) và các dịch vụ Java khai báo depends_on với điều kiện condition: service_healthy.",
          "Đồng thời, hãy sử dụng chế độ Kafka KRaft (không cần cài thêm ZooKeeper cồng kềnh tốn RAM) và thiết lập giới hạn bộ nhớ rõ ràng kèm biến môi trường JAVA_TOOL_OPTIONS chuẩn mực như một môi trường Production thu nhỏ."
        ],
        bullets: [
          "Tạo sẵn dữ liệu mẫu (Seed Data) phục vụ Demo: Khởi tạo sẵn 2 tài khoản khách hàng có số dư 50.000.000 VNĐ để người chấm mở trình duyệt lên là bấm chuyển tiền thử được ngay trong 10 giây.",
          "Tự động nạp Grafana Provisioning Dashboard: Lưu file JSON cấu hình Dashboard vào thư mục đóng gói để mở cổng 3000 lên thấy ngay biểu đồ lưu lượng giao dịch mà không phải kéo thả thủ công.",
          "Không commit bất kỳ khóa bí mật thật nào: Dùng file .env.example rõ ràng kèm script tự sinh cặp khóa RSA mẫu lúc khởi chạy lần đầu."
        ]
      },
      {
        heading: "2. Đo kiểm Hiệu năng bằng k6 & Hoàn thiện README chuẩn Senior",
        paragraphs: [
          "Một trang README.md đạt đẳng cấp Senior Java Ngân hàng không viết kiểu 'Dự án dùng Spring Boot và React', mà được trình bày như một bản Thiết kế Kiến trúc Kỹ thuật (Engineering Design Doc) súc tích gồm 6 mục: (1) Bài toán & Yêu cầu phi chức năng (NFR), (2) Sơ đồ Kiến trúc & Luồng tiền Sổ cái Kép, (3) Các quyết định kiến trúc cốt lõi (ADR: Vì sao chọn Pessimistic Lock có thứ tự? Vì sao tách HTTP khỏi @Transactional? Vì sao dùng Outbox + Saga + Đối soát T+0?), (4) Thiết kế Bảo mật (BFF Cookie, Smart OTP OCRA, Anti-BOLA), (5) Kết quả Load Test k6 & Concurrency Invariant Test, và (6) Hướng dẫn chạy 1 lệnh.",
          "Khi đính kèm ảnh chụp màn hình bảng điều khiển Grafana hiển thị thông lượng ổn định, độ trễ P99 thấp và ảnh kết quả bài test 50 luồng bảo toàn tổng tiền tuyệt đối, hồ sơ của bạn sẽ ngay lập tức nổi bật lên nhóm 5% ứng viên xuất sắc nhất!"
        ],
        bullets: [
          "Viết kịch bản k6 thực tế: Trộn 80% lưu lượng đọc số dư/sao kê và 20% lưu lượng ghi chuyển khoản giống đúng tỷ lệ hoạt động ngân hàng số.",
          "Đo độ trễ P95 và P99 thay vì chỉ nhìn Average: Chứng minh bạn có tư duy vận hành SRE chuyên nghiệp.",
          "Ghi rõ các điểm đánh đổi (Trade-offs) & Hướng mở rộng lên 10.000 TPS: Ví dụ nêu rõ khi gặp tài khoản thu hộ nóng (Hot Account) sẽ nâng cấp sang Sub-account Bucketing như thế nào."
        ]
      },
      {
        heading: "3. Lộ trình 7 ngày nước rút trước ngày Phỏng vấn Ngân hàng / Fintech",
        paragraphs: [
          "Khi đã hoàn thành trọn vẹn 60 bài giảng và 6 cột mốc Capstone trên hệ thống FinJava Senior Academy này, bạn đã nắm trong tay toàn bộ vũ khí từ Java Core/JVM, Spring/Hibernate, PostgreSQL/Redis/Kafka, Nghiệp vụ Sổ cái/ISO 8583/VietQR/Đối soát, Bảo mật PCI-DSS/mTLS/Smart OTP đến Frontend React/Angular/BFF và System Design quy mô lớn!",
          "Trong 7 ngày cuối trước buổi phỏng vấn chính thức, hãy thực hiện quy trình rà soát 3 bước: (1) Làm đủ cả 4 Bộ đề thi tuyển bấm giờ đạt trên 800/1000 điểm và dọn sạch Sổ tay câu sai, (2) Mở mục Phỏng vấn Vấn đáp luyện nói to trôi chảy cả 30 câu hỏi hội đồng không cần nhìn gợi ý, và (3) Tập trình bày luồng chạy của Đồ án Capstone trong đúng 5 phút gãy gọn, sắc bén!"
        ],
        bullets: [
          "Khi phỏng vấn tại Ngân hàng lớn (Vietcombank, Techcombank, MB, VPBank, ACB...): Nhấn mạnh tính toàn vẹn dữ liệu, kiểm soát rủi ro, tuân thủ bảo mật, đối soát và khả năng vận hành ổn định không mất tiền.",
          "Khi phỏng vấn tại Siêu ứng dụng / Fintech (MoMo, VNPay, ZaloPay, Timo, ShopeePay...): Nhấn mạnh thêm thông lượng TPS cao, tối ưu độ trễ P99, Redis Lua, Kafka bất đồng bộ và xử lý Flash-sale / Hot Account.",
          "Luôn chuẩn bị 2–3 câu hỏi ngược thông minh hỏi lại Tech Lead cuối buổi (ví dụ hỏi về quy trình đối soát hoặc cách đội ngũ xử lý zero-downtime deployment hiện tại)."
        ]
      }
    ],
    comparison: {
      title: "Bảng Đối Chiếu Hồ Sơ Ứng Viên Mid-Level vs Senior Java Ngân Hàng",
      headers: ["Tiêu chí đánh giá", "Ứng viên thông thường", "Bạn sau khi hoàn thành FinJava Senior", "Ấn tượng với Hội đồng Tuyển dụng"],
      rows: [
        ["Cách nói về Giao dịch tiền tệ", "Chỉ biết gắn @Transactional và dùng kiểu Double/Long đơn giản", "Phân tích rành mạch BigDecimal HALF_EVEN, Sổ cái Kép, tách HTTP khỏi DB TX và chống Deadlock", "Tin tưởng giao ngay các phân hệ Core quan trọng"],
        ["Xử lý lỗi mạng phân tán", "Retry mù quáng hoặc tự động hoàn tiền ngay khi gặp Timeout", "Áp dụng Idempotency-Key, Outbox Pattern, Saga 3 nhánh và Đối soát tự động T+0 qua TK Suspense", "Tư duy kiến trúc thực chiến già dặn, không sợ sự cố"],
        ["Tầm nhìn Toàn trình (Full-stack & SRE)", "Chỉ biết viết code Java trong phạm vi hàm được giao", "Hiểu thấu từ trình duyệt (CORS, BFF Cookie, React/Angular) xuống K8s Probes, ZGC và OpenTelemetry", "Đủ tầm dẫn dắt nhóm (Tech Lead / Senior toàn diện)"]
      ]
    },
    codeTitle: "docker-compose.yml — Khởi chạy trọn bộ Hệ sinh thái FinBank Core + Kafka KRaft + Observability 1 Lệnh",
    code: [
      "services:",
      "  postgres-ledger:",
      "    image: postgres:16-alpine",
      "    environment:",
      "      POSTGRES_DB: finbank_ledger",
      "      POSTGRES_USER: finbank",
      "      POSTGRES_PASSWORD: ${DB_PASSWORD:-finbank_local_dev}",
      "    ports: [\"5432:5432\"]",
      "    healthcheck:",
      "      test: [\"CMD-SHELL\", \"pg_isready -U finbank -d finbank_ledger\"]",
      "      interval: 5s",
      "      timeout: 3s",
      "      retries: 10",
      "",
      "  redis-guard:",
      "    image: redis:7-alpine",
      "    command: [\"redis-server\", \"--appendonly\", \"yes\"]",
      "    healthcheck:",
      "      test: [\"CMD\", \"redis-cli\", \"ping\"]",
      "      interval: 5s",
      "      retries: 5",
      "",
      "  kafka-kraft:",
      "    image: apache/kafka:3.8.0",
      "    environment:",
      "      KAFKA_NODE_ID: 1",
      "      KAFKA_PROCESS_ROLES: broker,controller",
      "      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093",
      "      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-kraft:9093",
      "      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1",
      "",
      "  core-ledger-service:",
      "    build: ./core-ledger-service",
      "    depends_on:",
      "      postgres-ledger: { condition: service_healthy }",
      "      redis-guard: { condition: service_healthy }",
      "    environment:",
      "      JAVA_TOOL_OPTIONS: \"-XX:+UseZGC -XX:+ZGenerational -XX:MaxRAMPercentage=70.0 -javaagent:/app/opentelemetry-javaagent.jar\"",
      "      OTEL_SERVICE_NAME: core-ledger-service",
      "      SPRING_LIFECYCLE_TIMEOUT_PER_SHUTDOWN_PHASE: 30s",
      "    deploy:",
      "      resources:",
      "        limits: { memory: 1024M }"
    ].join("\n"),
    codeNotes: [
      "Khối depends_on kèm condition: service_healthy đảm bảo core-ledger-service chỉ bắt đầu chạy Flyway sau khi PostgreSQL 16 đã thực sự sẵn sàng nhận kết nối.",
      "Sử dụng ảnh chính thức apache/kafka:3.8.0 ở chế độ KRaft giúp dựng Broker sự kiện gọn nhẹ trong vài giây mà không cần gánh thêm cụm ZooKeeper.",
      "Biến JAVA_TOOL_OPTIONS kết hợp Generational ZGC, ngưỡng bộ nhớ an toàn MaxRAMPercentage=70.0 trong giới hạn container 1024M và gắn tự động OpenTelemetry Java Agent không cần sửa code nghiệp vụ."
    ],
    labGuide: {
      goal: "Đóng gói hoàn chỉnh toàn bộ hệ thống chạy bằng 1 lệnh Docker Compose, kiểm thử tải k6 và hoàn thiện README/CV.",
      steps: [
        "Bước 1: Tạo tệp docker-compose.yml ở thư mục gốc dự án kết nối đầy đủ Postgres, Redis, Kafka KRaft, các dịch vụ Backend, React Web và Grafana/Prometheus.",
        "Bước 2: Chạy docker compose up -d từ trạng thái máy sạch, xác nhận mọi container đều đạt trạng thái Healthy và giao diện Web truy cập mượt mà.",
        "Bước 3: Chạy kịch bản k6 bắn 200 Virtual Users trong 60 giây, chụp ảnh màn hình biểu đồ RPS, P99 Latency trên Grafana lưu vào thư mục docs/images.",
        "Bước 4: Hoàn thiện README.md kèm sơ đồ kiến trúc, 5 mục ADR và cập nhật phần mô tả dự án chuẩn Senior vào CV ứng tuyển của bạn!"
      ],
      expectedOutput: "Bất kỳ Tech Lead nào clone kho GitHub của bạn và gõ 'docker compose up -d' đều trải nghiệm được ngay hệ thống Ngân hàng số Full-stack hoàn chỉnh trong vòng 60 giây."
    },
    examTips: [
      "Luôn kiểm tra thử clone dự án ra một thư mục mới tinh và chạy docker compose up để chắc chắn không bị sót file cấu hình cục bộ trước khi gửi link GitHub trong CV.",
      "Trong buổi phỏng vấn, hãy chủ động đề nghị chia sẻ màn hình 3 phút nếu phỏng vấn online để demo trực tiếp kịch bản Timeout NAPAS -> Treo Suspense -> Đối soát T+0 — tỷ lệ nhận Offer tăng vọt!",
      "Chúc mừng bạn đã hoàn thành trọn vẹn chặng đường 60 bài học — hãy giữ vững tư duy cẩn trọng, hiểu sâu từ gốc rễ của một Senior kỹ sư tài chính thực thụ!"
    ],
    summaryTakeaways: [
      "Sử dụng healthcheck + service_healthy để hệ thống đa container khởi chạy ổn định 100% chỉ với 1 lệnh.",
      "Luôn giới hạn bộ nhớ container song hành với -XX:MaxRAMPercentage=65..70% cho tiến trình JVM.",
      "Gắn OpenTelemetry và chụp biểu đồ kiểm thử tải thực tế đưa vào tài liệu kiến trúc của dự án.",
      "Kết hợp kiến thức sâu của 60 bài giảng, điểm số 4 đề thi tuyển và Đồ án Core Banking để tự tin ứng tuyển mọi Ngân hàng & Fintech."
    ],
    lessonQuestions: [
      {
        question: "Trong tệp docker-compose.yml của đồ án, việc sử dụng depends_on kèm điều kiện { condition: service_healthy } cho postgres-ledger giải quyết triệt để lỗi thực tế nào?",
        options: [
          "Giúp xóa sạch dữ liệu mỗi lần mở máy",
          "Ngăn chặn việc container Spring Boot khởi chạy Flyway/HikariCP quá sớm khi tiến trình PostgreSQL mới chỉ vừa bật container chứ chưa mở cổng nhận kết nối SQL, tránh lỗi sập ứng dụng lúc khởi động",
          "Tự động nâng cấp Java 21 lên Java 25",
          "Thay thế hoàn toàn tường lửa mạng"
        ],
        answer: 1,
        explanation: "Nếu chỉ khai báo depends_on tên dịch vụ đơn thuần, Docker chỉ đợi container Postgres vừa tạo xong tiến trình chứ chưa đợi lệnh pg_isready thành công; kết hợp healthcheck giúp thứ tự khởi động tin cậy tuyệt đối.",
        wrongReasons: [
          "Healthcheck chỉ kiểm tra trạng thái sẵn sàng phục vụ, không xóa dữ liệu.",
          "",
          "Cờ này thuộc về quản lý vòng đời container của Docker Compose, không liên quan phiên bản trình biên dịch.",
          "Healthcheck không đóng vai trò tường lửa bảo mật mạng."
        ]
      },
      {
        question: "Khi trình bày Đồ án Capstone trong CV và buổi phỏng vấn ứng tuyển vị trí Senior Java Backend Ngân hàng, cách tiếp cận nào tạo ấn tượng chuyên nghiệp và thuyết phục nhất?",
        options: [
          "Liệt kê tên 30 thư viện khác nhau nhưng không giải thích được vì sao dùng chúng",
          "Trình bày rõ bài toán tài chính cốt lõi, các bất biến bảo vệ tiền tệ (BigDecimal, Sổ cái Kép, Khóa có thứ tự chống Deadlock), cách xử lý bất định mạng (Idempotency, Outbox, Saga + Đối soát T+0), bảo mật (BFF, Smart OTP, Anti-BOLA) kèm số liệu kiểm thử tải thực tế",
          "Chỉ khoe màu sắc nút bấm trên giao diện đẹp",
          "Nói rằng hệ thống không bao giờ có thể gặp lỗi mạng"
        ],
        answer: 1,
        explanation: "Hội đồng tuyển dụng Senior tìm kiếm người hiểu sâu rủi ro tiền tệ, nắm rõ đánh đổi kiến trúc (trade-offs) và biết cách thiết kế hệ thống tự bảo vệ cũng như tự đối soát khi hạ tầng gặp sự cố.",
        wrongReasons: [
          "Liệt kê công nghệ theo trào lưu (Buzzword-driven) mà không hiểu đánh đổi là dấu hiệu của ứng viên thiếu kinh nghiệm thực tế.",
          "",
          "Với vị trí Backend Senior ngành ngân hàng, độ tin cậy, an toàn tiền tệ và kiến trúc chịu lỗi mới là trọng tâm cốt tử.",
          "Trong hệ thống phân tán, khẳng định mạng không bao giờ lỗi là tư duy ngây thơ; người giỏi luôn thiết kế sẵn phương án sống chung với lỗi mạng."
        ]
      }
    ]
  }
});
