/* FinJava Senior Academy — Học phần M: Microservices, Apache Kafka, Giao dịch Phân tán Saga & Spring Batch */
window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  M1: {
    duration: "65 phút",
    difficulty: "Senior / Distributed Architecture",
    codeLang: "java",
    teacherIntro: "Chào bạn, bước sang Học phần M là lúc chúng ta rời khỏi ranh giới an toàn của một JVM đơn lẻ để bước vào chiến trường thực sự của Ngân hàng Số hiện đại: Hệ thống Phân tán (Distributed Systems). Anh từng trực tiếp giải cứu một dự án chuyển đổi Core/Digital Banking tách từ Monolith ra 42 microservices. Đội dự án ban đầu rất tự hào vì dịch vụ nào cũng nhỏ gọn, nhưng đến kỳ trả lương ngày 25 đầu tiên, thời gian phản hồi lệnh chuyển tiền nhanh NAPAS 24/7 vọt lên 4,8 giây và rớt hàng loạt! Khi mở Jaeger Tracing ra xem, 1 API chuyển tiền đi qua API Gateway rồi gọi tuần tự đồng bộ bằng REST JSON nối tiếp qua 9 microservices (Auth -> CIF -> Fraud -> Limit -> Fee -> FX -> Ledger -> Notification -> Loyalty). Chỉ cần dịch vụ Loyalty hơi khựng GC 500ms là cả dây chuyền chuyển tiền đứt gãy! Đó không phải Microservices, đó là 'Distributed Monolith' — mang toàn bộ độ trễ mạng của hệ phân tán cộng với sự phụ thuộc cứng nhắc của nguyên khối. Hôm nay, anh sẽ chỉ cho bạn cách thiết kế cổng biên Spring Cloud Gateway, phân rã đúng Bounded Context và dùng gRPC Protobuf + Service Mesh cho giao tiếp nội bộ để giữ độ trễ P99 dưới 80ms.",
    analogy: {
      title: "Nhà ga Sân bay Quốc tế chuẩn An ninh Hàng không",
      body: "Hãy hình dung hệ thống Ngân hàng Số như một sân bay quốc tế lớn. Cổng kiểm soát an ninh & hải quan ngay cửa nhà ga chính là API Gateway (Spring Cloud Gateway): mọi hành khách từ bên ngoài vào chỉ cần xuất trình hộ chiếu (JWT), kiểm tra danh sách cấm bay (Revocation List), soi chiếu tốc độ xếp hàng theo mã hành khách (Rate Limit theo CIF) và dán thẻ hành lý xuyên suốt (X-Correlation-Id) đúng một lần duy nhất. Khi đã vào bên trong đường băng nội bộ (East-West Traffic), các đội kỹ thuật mặt đất, tiếp nhiên liệu và điều phái bay không viết thư tay dài dòng bằng phong bì giấy (REST JSON nặng nề) mà liên lạc trực tiếp qua bộ đàm mã hóa nhị phân tốc độ cao (gRPC Protobuf trên HTTP/2). Còn lớp hệ thống radar, đèn dẫn đường và tần số mã hóa tự động gắn sẵn trên mỗi xe chuyên dụng mà tài xế không cần tự lập trình chính là Service Mesh Sidecar (Envoy/Istio mTLS + Tracing)."
    },
    objectives: [
      "Phân rã hệ thống ngân hàng theo DDD Bounded Context, nhận diện và triệt tiêu phản mẫu Distributed Monolith gây suy giảm SLA dây chuyền.",
      "Thiết kế và cấu hình Spring Cloud Gateway trên nền Reactive Netty: xác thực JWT tập trung, gắn X-Correlation-Id xuyên suốt và giới hạn tốc độ (Rate Limit) chính xác theo CIF khách hàng.",
      "Phân định rõ ranh giới sử dụng REST OpenAPI (Bắc-Nam / Đối ngoại), gRPC Protobuf (Đông-Tây / Nội bộ độ trễ thấp) và Service Mesh mTLS kèm quản trị hợp đồng Schema không gây đứt gãy."
    ],
    flow: [
      {
        step: "1. Edge Ingress & WAF Filtering (Lọc biên & Chống tấn công)",
        detail: "Lưu lượng từ Mobile Banking / Internet Banking đi qua WAF & Load Balancer vào Spring Cloud Gateway chạy trên Netty Event-loop non-blocking để chịu hàng chục nghìn kết nối đồng thời với mức tiêu thụ RAM tối thiểu."
      },
      {
        step: "2. Centralized Auth, Correlation & CIF Rate Limit (Trạm gác API Gateway)",
        detail: "Gateway kiểm chứng chữ ký JWT RS256/ES256, kiểm tra danh sách thu hồi khẩn cấp (jti Denylist trên Redis), sinh hoặc giữ nguyên X-Correlation-Id, và chạy thuật toán Token Bucket trên Redis theo mã CIF khách hàng."
      },
      {
        step: "3. East-West High-Speed RPC (Giao tiếp nội bộ bằng gRPC Protobuf)",
        detail: "Dịch vụ điều phối (Payment Orchestrator / BFF) gọi sang các dịch vụ lõi nội bộ (Account Ledger, Limit Engine, Fraud Scoring) qua gRPC nhị phân trên kênh HTTP/2 Multiplexing giúp giảm 60–80% kích thước gói tin và chi phí parse CPU."
      },
      {
        step: "4. Service Mesh Sidecar Enforcement (Bảo mật mTLS & Quan sát tự động)",
        detail: "Envoy Proxy đi kèm mỗi Pod trong Kubernetes tự động bắt tay mTLS xoay vòng chứng chỉ ngắn hạn, áp dụng chính sách AuthorizationPolicy (chỉ Payment-Hub mới được gọi hàm Debit của Ledger) và đẩy Span về OpenTelemetry."
      }
    ],
    sections: [
      {
        heading: "1. Phân rã Bounded Context Ngân hàng & Cái bẫy chết người mang tên Distributed Monolith",
        paragraphs: [
          "Sai lầm lớn nhất khi thiết kế Microservices ngân hàng là cắt dịch vụ theo bảng cơ sở dữ liệu (CRUD Services) thay vì cắt theo miền nghiệp vụ tự chủ (DDD Bounded Context). Trong một kiến trúc chuẩn tài chính, chúng ta tách theo ranh giới sở hữu dữ liệu và tốc độ thay đổi nghiệp vụ: Identity & Access (đăng nhập, Smart OTP), Party/CIF (hồ sơ khách hàng, eKYC), Core CASA Ledger (sổ cái tài khoản thanh toán & số dư), Payment Hub (điều phối NAPAS/VietQR/CITAD), Card Management (thẻ vùng CDE) và Notification/Loyalty. Mỗi Bounded Context sở hữu hoàn toàn Database Schema riêng — tuyệt đối cấm microservice A viết câu lệnh JOIN hoặc đọc trực tiếp bảng dữ liệu của microservice B.",
          "Hãy luôn làm phép toán xác suất sẵn sàng (Availability Math) trước khi vẽ mũi tên gọi đồng bộ! Giả sử mỗi microservice đạt cam kết SLA 99,9% (rất tốt). Nếu một lệnh chuyển tiền phải gọi đồng bộ nối tiếp qua 9 dịch vụ, độ sẵn sàng tổng thể của API sẽ tụt xuống còn 0,999^9 ≈ 99,1% — nghĩa là mỗi tháng hệ thống chuyển tiền của ngân hàng có thể chết gần 6,5 giờ! Nguyên tắc sống còn của Principal Architect là: trên luồng giao dịch nóng (Hot Path), chỉ giữ lại các bước bắt buộc phải quyết định tức thời (Kiểm tra hạn mức/gian lận -> Giữ/Trừ tiền sổ cái), tối đa 2–3 chặng gọi gRPC nội bộ; toàn bộ các tác vụ phụ trợ (gửi thông báo, cộng điểm thưởng, cập nhật kho phân tích) bắt buộc tách sang luồng bất đồng bộ qua Apache Kafka."
        ],
        bullets: [
          "Database-per-Service không có nghĩa là mỗi service phải thuê một cụm máy chủ vật lý riêng: Có thể dùng riêng PostgreSQL Database/Schema với tài khoản DB cô lập quyền tuyệt đối trên các cụm phân tầng theo mức độ quan trọng (Tier-0 cho Ledger, Tier-2 cho Loyalty).",
          "Chống Chatty I/O: Không bao giờ đặt lời gọi RPC sang dịch vụ khác bên trong vòng lặp for (ví dụ lặp 50 dòng sao kê gọi 50 lần sang CIF Service lấy tên người nhận); phải thiết kế Batch RPC hoặc lưu bản sao dữ liệu tối thiểu cần thiết.",
          "Phân tầng SLA (Tiering): Dịch vụ Tier-0 (Ledger, Payment, Auth) tuyệt đối không được có phụ thuộc cứng đồng bộ (Hard Runtime Dependency) vào dịch vụ Tier-2/Tier-3 (CRM, Khuyến mãi, Báo cáo)."
        ]
      },
      {
        heading: "2. Spring Cloud Gateway: Thiết kế Trạm gác Biên Tập trung trên nền Netty Reactive",
        paragraphs: [
          "Tại sao các ngân hàng hiện đại ưu tiên Spring Cloud Gateway (chạy trên Project Reactor & Netty) thay vì cổng Servlet blocking truyền thống? Vì API Gateway là phễu hứng 100% lưu lượng vào ra của toàn ngân hàng; nếu một đối tác bên dưới phản hồi chậm 2 giây, mô hình thread-per-request cổ điển sẽ nhanh chóng đốt sạch hàng nghìn Platform Threads gây nghẽn toàn cục, trong khi Event-loop non-blocking của Netty chỉ giữ các kết nối dưới dạng sự kiện I/O cực nhẹ. Tại tầng này, ta gom toàn bộ Cross-Cutting Concerns về một mối: xác thực chữ ký OAuth2/JWT, kiểm tra thu hồi phiên khẩn cấp khi khách báo mất điện thoại, chuẩn hóa bảo mật Header và gắn mã truy vết X-Correlation-Id ngay từ mili-giây đầu tiên gói tin chạm biên.",
          "Một kinh nghiệm xương máu trên Production Việt Nam là cấu hình Rate Limiting (Giới hạn tốc độ). Nếu bạn cấu hình Rate Limit trên API Gateway dựa vào địa chỉ IP nguồn (Client IP), bạn sẽ gây thảm họa vào giờ nghỉ trưa: hàng nghìn nhân viên làm việc trong cùng một tòa nhà tập đoàn hoặc người dùng mạng di động 4G đi chung cổng Carrier-Grade NAT có cùng 1 địa chỉ IP Public sẽ bị khóa nhầm hàng loạt! Trong ngân hàng, với các API đã đăng nhập, KeyResolver của thuật toán Token Bucket trên Redis bắt buộc phải lấy theo định danh khách hàng (claim `cif` hoặc `sub` đã xác thực từ JWT), chỉ fallback về IP đối với các API công khai chưa đăng nhập như lấy tỷ giá hay đăng nhập."
        ],
        bullets: [
          "Token Bucket với Redis Lua trên Spring Cloud Gateway: Tham số `replenishRate` quy định tốc độ nạp lại thẻ bài mỗi giây (tải ổn định) và `burstCapacity` cho phép ngưỡng bùng nổ tức thời khi màn hình chính Mobile App vừa mở cần gọi 4–5 API song song.",
          "Chống giả mạo Header nội bộ (Header Spoofing Prevention): Gateway bắt buộc phải XÓA (strip) mọi header nhạy cảm từ Internet gửi vào như `X-Authenticated-Cif`, `X-User-Roles` trước khi tự trích xuất từ JWT hợp lệ và gắn mới để đẩy xuống microservice phía sau.",
          "Tuyệt đối không viết code blocking (JDBC, RestTemplate, Thread.sleep) bên trong `GlobalFilter` của Spring Cloud Gateway vì sẽ làm đóng băng luồng Netty Event-loop của toàn bộ cổng ngân hàng."
        ]
      },
      {
        heading: "3. Giao tiếp Đông-Tây với gRPC Protobuf, Service Mesh mTLS & Quản trị Hợp đồng (Contract Governance)",
        paragraphs: [
          "Ở chiều Bắc-Nam (Mobile/Web/Đối tác Open Banking gọi vào ngân hàng), RESTful JSON kèm OpenAPI 3.1 là vua nhờ tính phổ quát, dễ debug trên trình duyệt và tương thích mọi nền tảng đối tác. Nhưng ở chiều Đông-Tây (các microservice Java/Go bên trong trung tâm dữ liệu gọi nhau hàng chục nghìn lần mỗi giây), việc liên tục serialize/deserialize chuỗi JSON lặp đi lặp lại tên trường dài dòng tốn rất nhiều CPU và băng thông. Chuyển các tuyến nội bộ trọng yếu (Payment Hub <-> Core Ledger, Gateway <-> Fraud Engine) sang gRPC + Protocol Buffers trên nền HTTP/2 giúp gom nhiều request song song trên một kết nối TCP duy nhất (Multiplexing), nén dữ liệu nhị phân nhỏ hơn 5–7 lần và ép kiểu chặt chẽ ngay lúc biên dịch code từ file `.proto`.",
          "Khi quy mô vượt quá 20 microservices, việc tự cấu hình keystore chứng chỉ SSL hai chiều (mTLS) trong từng ứng dụng Spring Boot trở thành cơn ác mộng vận hành mỗi kỳ chứng chỉ hết hạn. Đây là lúc Service Mesh (Istio / Linkerd) phát huy sức mạnh: mỗi Pod ứng dụng được đính kèm một container Sidecar Proxy (Envoy). Ứng dụng Java chỉ gọi localhost thuần túy, còn Envoy tự động mã hóa mTLS giữa các Pod, xoay vòng chứng chỉ mỗi 24 giờ qua SPIFFE/SPIRE và kiểm soát quyền gọi dịch vụ ở tầng L7 (ví dụ cấm tuyệt đối Reporting Service gọi gRPC method `PostDebitEntry` của Core Ledger). Song song đó, mọi thay đổi trên file `.proto` hay OpenAPI phải đi qua cổng kiểm tra tự động trên CI/CD (`buf breaking` / Spring Cloud Contract) để ngăn chặn lỗi đổi kiểu dữ liệu làm sập dịch vụ đang chạy."
        ],
        bullets: [
          "Quy tắc tiến hóa Protobuf bất biến: Không bao giờ tái sử dụng số thứ tự trường (Field Tag Number, ví dụ `= 3;`) đã xóa hoặc đổi kiểu dữ liệu của trường hiện hữu; hãy đánh dấu `reserved 3;` và luôn thêm trường mới với mã số mới để đảm bảo tương thích ngược/xuôi khi Rolling Update.",
          "Biểu diễn Tiền tệ trong Protobuf: Không bao giờ dùng kiểu `double` hoặc `float` trong file `.proto` cho số tiền! Hãy định nghĩa `message Money { string currency = 1; string amount_decimal = 2; }` hoặc cặp `int64 units` + `int32 nanos` để chuyển thành `BigDecimal` chính xác tuyệt đối.",
          "gRPC Load Balancing trên Kubernetes: Vì HTTP/2 giữ kết nối TCP bền vững lâu dài (sticky connection), Load Balancer tầng L4 mặc định của K8s Service sẽ đẩy lệch tải vào một vài Pod cũ; bắt buộc dùng Service Mesh L7 Load Balancing hoặc cấu hình Headless Service kèm client-side round-robin."
        ]
      }
    ],
    comparison: {
      title: "So sánh Chiến lược Giao tiếp Liên Dịch vụ trong Kiến trúc Ngân hàng Số",
      headers: ["Tiêu chí kiến trúc", "REST + JSON (OpenAPI 3.1)", "gRPC + Protobuf (HTTP/2)", "Apache Kafka (Async Event)"],
      rows: [
        [
          "Định dạng & Hiệu năng mạng",
          "Văn bản JSON dễ đọc; tốn băng thông và CPU parse ở tải rất cao",
          "Nhị phân Protobuf gọn nhẹ gấp 5–7 lần; Multiplexing trên 1 kết nối HTTP/2",
          "Log tuần tự theo lô nhị phân/Avro/JSON; thông lượng hàng trăm nghìn msg/giây"
        ],
        [
          "Kiểu ghép nối (Coupling)",
          "Đồng bộ theo thời gian (Temporal coupling); bên đích chết là bên gọi lỗi",
          "Đồng bộ độ trễ cực thấp (1–5ms nội bộ); yêu cầu luôn đặt Deadline rõ ràng",
          "Bất đồng bộ hoàn toàn; bên nhận bảo trì vài phút không làm gián đoạn bên gửi"
        ],
        [
          "Vị trí chuẩn trong Ngân hàng",
          "Bắc-Nam: Mobile/Web <-> BFF/Gateway, Open Banking B2B với đối tác ngoài",
          "Đông-Tây nóng: Payment Hub <-> Core Ledger, chấm điểm Fraud/Limit thời gian thực",
          "Phát sự kiện biến động số dư, đối soát, thông báo SMS/OTT, cộng điểm, CQRS"
        ],
        [
          "Quản trị hợp đồng (Contract)",
          "OpenAPI Specification + Consumer-Driven Contract Testing",
          "File `.proto` tập trung + kiểm tra `buf breaking` tự động trên CI pipeline",
          "Confluent / Apicurio Schema Registry (Avro/Protobuf) ép chế độ BACKWARD/FULL"
        ]
      ]
    },
    codeTitle: "Cấu hình Spring Cloud Gateway: Chống giả mạo Header, Gắn X-Correlation-Id & Rate Limit theo CIF",
    code: [
      "package vn.finbank.gateway.config;",
      "import org.springframework.cloud.gateway.filter.GlobalFilter;",
      "import org.springframework.cloud.gateway.filter.ratelimit.*;",
      "import org.springframework.context.annotation.*;",
      "import org.springframework.core.Ordered;",
      "import org.springframework.core.annotation.Order;",
      "import org.springframework.http.server.reactive.ServerHttpRequest;",
      "import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;",
      "import reactor.core.publisher.Mono;",
      "import java.util.*;",
      "",
      "@Configuration",
      "public class BankingGatewayConfig {",
      "    @Bean",
      "    public RedisRateLimiter transferRateLimiter() {",
      "        return new RedisRateLimiter(5, 10, 1); // 5 req/giây ổn định, burst 10 req mỗi CIF",
      "    }",
      "    @Bean",
      "    public KeyResolver cifKeyResolver() {",
      "        return exchange -> exchange.getPrincipal().ofType(JwtAuthenticationToken.class)",
      "            .map(jwtAuth -> \"cif:\" + jwtAuth.getToken().getClaimAsString(\"cif\"))",
      "            .switchIfEmpty(Mono.fromSupplier(() -> \"ip:\" + Objects.requireNonNull(",
      "                exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress()));",
      "    }",
      "    @Bean @Order(Ordered.HIGHEST_PRECEDENCE)",
      "    public GlobalFilter correlationAndTrustedHeaderFilter() {",
      "        return (exchange, chain) -> {",
      "            String corrId = Optional.ofNullable(exchange.getRequest().getHeaders()",
      "                .getFirst(\"X-Correlation-Id\")).orElseGet(() -> UUID.randomUUID().toString());",
      "            return exchange.getPrincipal().ofType(JwtAuthenticationToken.class)",
      "                .map(auth -> auth.getToken().getClaimAsString(\"cif\")).defaultIfEmpty(\"ANONYMOUS\")",
      "                .flatMap(trustedCif -> {",
      "                    ServerHttpRequest safeReq = exchange.getRequest().mutate()",
      "                        .headers(h -> h.remove(\"X-Authenticated-Cif\")) // Diệt giả mạo từ Internet",
      "                        .header(\"X-Correlation-Id\", corrId).header(\"X-Authenticated-Cif\", trustedCif).build();",
      "                    exchange.getResponse().getHeaders().set(\"X-Correlation-Id\", corrId);",
      "                    return chain.filter(exchange.mutate().request(safeReq).build());",
      "                });",
      "        };",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Lưu ý ở `cifKeyResolver()` (sử dụng `.ofType(JwtAuthenticationToken.class)` của Reactor): ưu tiên định danh `cif` trích xuất từ JWT đã được Spring Security xác thực chữ ký, chỉ fallback sang địa chỉ IP khi request là ẩn danh — tránh triệt để thảm họa khóa nhầm hàng nghìn người dùng chung cổng NAT công ty/viễn thông.",
      "Dòng `.headers(h -> h.remove(\"X-Authenticated-Cif\"))` là chốt chặn an ninh sống còn: nếu quên xóa header cũ trước khi ghi đè hoặc khi request không có token, hacker bên ngoài có thể tự truyền `X-Authenticated-Cif: 000999888` để leo thang đặc quyền ở các microservice phía sau.",
      "Toàn bộ chuỗi xử lý viết thuần Reactive (`Mono` pipeline `flatMap`, `switchIfEmpty`), hoàn toàn không gọi hàm `.block()`, đảm bảo các luồng Netty Event-loop xử lý mượt mà hàng chục nghìn TPS.",
      "`X-Correlation-Id` được gắn vào cả chiều Request đi xuống hạ tầng nội bộ lẫn chiều Response trả ra màn hình lỗi trên Mobile App, giúp đội vận hành L2 chỉ cần nhìn ảnh chụp màn hình của khách là tra ra toàn bộ hành trình gói tin trên Kibana/Jaeger trong 3 giây."
    ],
    labGuide: {
      goal: "Thiết lập cổng Spring Cloud Gateway đứng trước dịch vụ Core Account, kiểm chứng chống giả mạo Header, gắn X-Correlation-Id và giới hạn tốc độ theo CIF trên Redis thật.",
      steps: [
        "Bước 1: Khởi chạy Redis container bằng Docker và cấu hình Spring Cloud Gateway với route `/api/v1/transfers/**` trỏ về dịch vụ chuyển tiền nội bộ kèm bộ lọc `RequestRateLimiter` sử dụng `cifKeyResolver`.",
        "Bước 2: Cố tình dùng `curl` gửi kèm header giả mạo `-H 'X-Authenticated-Cif: VIP-HACK'` cùng JWT của khách hàng CIF `100200` rồi kiểm tra log ở microservice đích để xác nhận giá trị nhận được luôn bị ép đúng thành `100200`.",
        "Bước 3: Chạy kịch bản bắn 15 request liên tiếp trong 1 giây bằng cùng một JWT của CIF `100200`, đồng thời bắn 1 request từ JWT của CIF `100201` từ CÙNG MỘT máy tính (cùng IP).",
        "Bước 4: Quan sát mã phản hồi HTTP và kiểm tra header `X-RateLimit-Remaining` cùng `X-Correlation-Id` trả về trên từng kết quả."
      ],
      expectedOutput: "CIF `100200` thành công 10 request đầu (burstCapacity=10) và nhận HTTP `429 Too Many Requests` ở 5 request tiếp theo, trong khi CIF `100201` ngồi cùng mạng Wi-Fi vẫn giao dịch trả về `200 OK` bình thường kèm mã `X-Correlation-Id` hợp lệ."
    },
    examTips: [
      "Câu hỏi kiến trúc: 'Hệ thống tách thành 25 microservices nhưng mỗi lần deploy dịch vụ A phải deploy lại đồng loạt B, C, D và 1 giao dịch gọi nối tiếp 8 REST API gây P99 > 3s' -> Chẩn đoán ngay phản mẫu **Distributed Monolith**, khắc phục bằng gom lại đúng Bounded Context, tách sự kiện bất đồng bộ qua Kafka và đổi các chặng nóng nội bộ sang gRPC kèm Deadline.",
      "Khi gọi gRPC nội bộ trong ngân hàng, TUYỆT ĐỐI luôn truyền `withDeadlineAfter(800, TimeUnit.MILLISECONDS)` trên mỗi Stub gọi đi; gRPC mặc định không có timeout nên một dịch vụ treo có thể giữ kết nối chờ vô hạn!",
      "Đừng nhầm vai trò API Gateway và Service Mesh: API Gateway bảo vệ ranh giới Bắc-Nam (xác thực người dùng cuối OAuth2, Rate Limit theo khách hàng, định tuyến nghiệp vụ ngoài vào); Service Mesh quản trị giao tiếp Đông-Tây nội bộ (mTLS giữa các Pod, L7 AuthorizationPolicy dịch vụ-gọi-dịch vụ, Telemetry)."
    ],
    summaryTakeaways: [
      "Microservices chuẩn ngân hàng được chia theo ranh giới tự chủ nghiệp vụ và dữ liệu (Bounded Context), hạn chế tối đa số chặng gọi đồng bộ nối tiếp trên luồng tiền nóng.",
      "Spring Cloud Gateway tập trung hóa xác thực JWT, tẩy rửa Header giả mạo từ Internet, sinh mã truy vết xuyên suốt và giới hạn tốc độ theo định danh CIF thay vì chỉ nhìn địa chỉ IP.",
      "Kết hợp REST OpenAPI ở biên đối ngoại với gRPC Protobuf (không dùng float/double cho tiền tệ!) ở lõi nội bộ giúp cân bằng hoàn hảo giữa tính tương thích và hiệu năng cực cao.",
      "Service Mesh tách rời trách nhiệm mã hóa mTLS hai chiều và kiểm soát truy cập liên dịch vụ xuống tầng hạ tầng Sidecar, kết hợp kiểm tra hợp đồng Schema tự động trên CI/CD."
    ],
    lessonQuestions: [
      {
        question: "Một ngân hàng triển khai giới hạn tốc độ (Rate Limiting) 20 requests/phút dựa trên địa chỉ IP nguồn (`X-Forwarded-For`) tại API Gateway cho các API tra cứu số dư và chuyển khoản. Ngay sáng thứ Hai, hàng trăm nhân viên văn phòng của các tập đoàn lớn phản ánh bị chặn giao dịch (`HTTP 429`) dù mỗi người mới mở ứng dụng lần đầu. Giải pháp thiết kế nào chuẩn xác nhất?",
        options: [
          "Tắt hoàn toàn tính năng Rate Limiting trên API Gateway để không bao giờ chặn nhầm khách hàng doanh nghiệp.",
          "Tăng giới hạn theo IP lên 100.000 requests/phút cho mọi địa chỉ IP trên toàn cầu.",
          "Chuyển chiến lược KeyResolver cho các API đã xác thực sang giới hạn theo định danh khách hàng (`cif` hoặc `sub` trong JWT hợp lệ), kết hợp giới hạn tầng IP ở ngưỡng cao hơn riêng cho các endpoint chưa đăng nhập.",
          "Chuyển việc kiểm tra Rate Limit xuống viết bằng câu lệnh `SELECT COUNT(*)` trực tiếp trong bảng lịch sử giao dịch của Core PostgreSQL ở mọi lượt gọi API."
        ],
        answer: 2,
        explanation: "Người dùng trong cùng tòa nhà văn phòng hoặc mạng viễn thông di động thường đi qua cổng NAT chung nên chia sẻ cùng một địa chỉ IP Public. Định danh Rate Limit theo claim `cif` trích xuất từ JWT đã xác thực giúp cô lập hạn ngạch công bằng cho từng cá nhân mà không ảnh hưởng người dùng chung mạng, đồng thời vẫn giữ lớp bảo vệ theo IP ở ngưỡng phù hợp cho các API công khai như `/login`.",
        wrongReasons: [
          "Tắt hoàn toàn Rate Limiting khiến toàn bộ hệ thống lõi phơi mình trước các đợt spam request, lỗi vòng lặp từ client hoặc tấn công cạn kiệt tài nguyên.",
          "Đặt ngưỡng 100.000 req/phút cho mọi IP làm mất tác dụng bảo vệ trước các bot tấn công đơn lẻ nhằm vào một tài khoản cụ thể.",
          "",
          "Chạy `SELECT COUNT(*)` vào Core PostgreSQL ở mỗi request trên toàn ngân hàng sẽ đánh sập Database chính ngay lập tức thay vì dùng bộ đếm nguyên tử cực nhanh trên Redis tại tầng biên."
        ]
      },
      {
        question: "Đội kiến trúc muốn chuyển đổi giao tiếp nội bộ giữa `Payment-Hub` và `Core-Ledger` từ REST JSON sang gRPC Protobuf trên Kubernetes để giảm độ trễ P99. Bộ quy tắc thiết kế nào sau đây bắt buộc phải tuân thủ để đảm bảo an toàn tài chính và không gây lỗi lệch tải?",
        options: [
          "Khai báo trường số tiền giao dịch bằng kiểu `double amount = 1;` trong file `.proto` để tính toán nhanh nhất trên CPU.",
          "Biểu diễn số tiền chính xác không mất độ chính xác (chuỗi thập phân chuẩn hoặc đơn vị nguyên/nanos ánh xạ sang `BigDecimal`), luôn gắn `Deadline` cho mỗi lời gọi Stub, không tái sử dụng Field Tag Number đã xóa và bật cân bằng tải tầng L7 (HTTP/2) qua Service Mesh hoặc Headless Service.",
          "Mỗi tuần đánh số lại toàn bộ các trường trong file `.proto` từ `1..N` cho đẹp đội hình và xóa các trường không dùng nữa mà không cần khai báo `reserved`.",
          "Chỉ cần dùng Load Balancer tầng L4 TCP mặc định của Kubernetes `ClusterIP` là tự động chia đều từng request gRPC sang các Pod mới vừa scale-out."
        ],
        answer: 1,
        explanation: "Trong gRPC tài chính: (1) cấm tuyệt đối `float/double` vì sai số nhị phân IEEE 754; (2) bắt buộc đặt `Deadline` để chống treo kết nối vô hạn; (3) giữ bất biến Field Tag Number và đánh dấu `reserved` cho trường bỏ đi để không hỏng dữ liệu nhị phân khi triển khai không gián đoạn; và (4) cần cân bằng tải tầng L7 do HTTP/2 duy trì kết nối TCP dài hạn khiến L4 TCP Load Balancer không chia tải cho Pod mới.",
        wrongReasons: [
          "Kiểu `double` gây sai số dấu phẩy động nghiêm trọng (ví dụ lệch đồng lẻ khi cộng/nhân phí), vi phạm nguyên tắc sống còn của phần mềm ngân hàng.",
          "",
          "Đánh số lại Field Tag Number trong Protobuf sẽ khiến bản tin nhị phân bị đọc nhầm trường dữ liệu này sang trường dữ liệu khác ngay trong quá trình Rolling Update.",
          "Kubernetes ClusterIP mặc định cân bằng tải ở mức kết nối TCP (L4); vì gRPC dùng lại một kết nối HTTP/2 bền vững để gửi hàng nghìn RPC nên các Pod mới mở thêm sẽ ngồi chơi trong khi Pod cũ tiếp tục quá tải."
        ]
      }
    ]
  },

  M2: {
    duration: "65 phút",
    difficulty: "Senior / Event Streaming Ngân hàng",
    codeLang: "java",
    teacherIntro: "Chào bạn, anh kể bạn nghe một sự cố thực tế từng xảy ra vào dịp cận Tết Nguyên Đán tại một ngân hàng thương mại. Đúng 17h30 chiều 28 Tết, tổng đài Chăm sóc Khách hàng nổ tung vì hàng loạt khách VIP gọi lên mắng: 'Tôi vừa nộp vào 50 triệu rồi chuyển đi 30 triệu, sao App của các anh báo tin trừ 30 triệu (số dư còn 25 triệu) TRƯỚC, rồi 4 giây sau mới báo tin cộng 50 triệu (số dư lên 55 triệu)? Sổ sách ngân hàng bị loạn à?!'. Chưa hết, đêm hôm đó một ổ cứng trên Kafka Broker số 2 bị lỗi đột ngột; vì đội dev để cấu hình mặc định của thư viện cũ (`acks=1`), 18 sự kiện hạch toán sang hệ thống đối soát trung gian đã bốc hơi vĩnh viễn khi Leader sập trước lúc Follower kịp sao chép! Apache Kafka cực kỳ mạnh mẽ, nhưng cấu hình mặc định được thiết kế cho bài toán thu thập log click chuột xem quảng cáo, KHÔNG PHẢI cho bút toán tiền tệ. Trong bài M2 này, anh em mình sẽ siết từng con ốc của Kafka Producer, Broker và Consumer đạt chuẩn độ bền tài chính cấp độ ngân hàng.",
    analogy: {
      title: "Dây chuyền Sổ Nhật ký tại các Quầy Chuyên trách theo Số Tài khoản",
      body: "Hãy tưởng tượng trung tâm lưu trữ biến động số dư có 12 quầy ghi sổ song song (12 Partitions). Nếu khách hàng mỗi lần giao dịch lại chạy bừa vào một quầy đang vắng (không truyền Partition Key -> phân phối xoay vòng), thì tờ phiếu 'Nộp 50 triệu' nằm ở Quầy 1 đang xếp hàng dài, còn tờ phiếu 'Rút 30 triệu' sinh ra sau lại lọt vào Quầy 5 đang vắng nên được đóng dấu gửi tin nhắn trước — thế là loạn thứ tự! Để giữ trật tự tuyệt đối, ngân hàng quy định: hàm băm từ Số Tài Khoản của bạn luôn chỉ định cố định bạn vào đúng Quầy số 4 từ đầu năm đến cuối năm (Partition Key = accountNo). Hơn nữa, Giao dịch viên trưởng ở Quầy 4 (Leader Replica) chỉ được phép đưa biên lai xác nhận cho bạn (`acks=all`) sau khi cả 2 Kiểm soát viên phụ trách sao lưu (In-Sync Replicas - ISR) đã chép y hệt dòng bút toán đó vào sổ két sắt chống cháy (`min.insync.replicas=2`)."
    },
    objectives: [
      "Làm chủ cơ chế Partitioning theo khóa nghiệp vụ (`accountNo`) và Idempotent Producer để bảo toàn tuyệt đối thứ tự biến động số dư mà không bị đảo lộn khi mạng thử lại.",
      "Thiết lập tam giác vàng chống mất dữ liệu (Zero Data Loss): `replication.factor=3`, `min.insync.replicas=2`, `acks=all` và khóa chặt `unclean.leader.election.enable=false`.",
      "Tối ưu Kafka Consumer Group trong ngân hàng: kiểm soát Manual Offset Commit, ngăn chặn bão Rebalance bằng `CooperativeStickyAssignor` và xử lý bài toán lệch tải tài khoản nóng (Hot Account)."
    ],
    flow: [
      {
        step: "1. Deterministic Key Hashing (Định tuyến cố định theo Số Tài khoản)",
        detail: "Producer lấy `accountNo` làm Record Key; thuật toán băm `murmur2(key) % numPartitions` luôn đẩy mọi sự kiện của cùng một tài khoản vào duy nhất một Partition theo thứ tự thời gian phát sinh."
      },
      {
        step: "2. Idempotent Sequence Append (Ghi tuần tự chống trùng tại Leader)",
        detail: "Producer được gắn định danh `ProducerId (PID)` kèm số thứ tự `SequenceNumber` tăng dần cho từng Partition; nếu mạng đứt khiến Producer gửi lại gói tin cũ, Leader Broker nhận diện ngay số Sequence đã ghi và trả ACK mà không ghi đúp lần hai."
      },
      {
        step: "3. Quorum ISR Replication (Nhân bản đồng bộ đa Broker)",
        detail: "Leader ghi sự kiện vào Commit Log đĩa cứng của mình và chờ tối thiểu các Follower nằm trong danh sách đồng bộ kịp thời (ISR >= `min.insync.replicas`) kéo bản sao về thành công rồi mới phản hồi xác nhận `acks=all`."
      },
      {
        step: "4. Ordered Consumption & Manual Commit (Tiêu thụ tuần tự & Chốt Offset an toàn)",
        detail: "Trong một Consumer Group, mỗi Partition tại một thời điểm chỉ giao cho tối đa 1 luồng Consumer xử lý tuần tự; chỉ sau khi lưu kết quả xuống DB đích thành công mới gọi `acknowledgment.acknowledge()` để dịch chuyển con trỏ Offset."
      }
    ],
    sections: [
      {
        heading: "1. Bảo toàn Thứ tự Bút toán: Partition Key và Sự kết hợp thần thánh với Idempotent Producer",
        paragraphs: [
          "Điều đầu tiên bạn cần khắc cốt ghi tâm về Apache Kafka: Kafka KHÔNG đảm bảo thứ tự toàn cục (Global Ordering) trên toàn bộ một Topic nhiều Partition; Kafka chỉ đảm bảo thứ tự nghiêm ngặt **bên trong phạm vi từng Partition riêng lẻ**. May mắn thay, trong 99% nghiệp vụ ngân hàng, chúng ta không cần biết anh Nguyễn Văn A ở Hà Nội giao dịch trước hay chị Trần Thị B ở Đà Nẵng giao dịch trước; thứ chúng ta bắt buộc phải giữ đúng thứ tự 100% là chuỗi sự kiện thuộc về **cùng một tài khoản** (Mở tài khoản -> Nộp tiền -> Giữ tiền -> Trừ tiền -> Đóng tài khoản). Chỉ cần luôn đặt `ProducerRecord` key bằng `accountNo` (hoặc `loanContractId`), toàn bộ vòng đời của tài khoản đó sẽ xếp hàng thẳng tắp trong một Partition duy nhất.",
          "Tuy nhiên, chỉ đặt Partition Key thôi vẫn có một kẽ hở cực hiểm khi mạng chập chờn! Giả sử Producer gửi liên tiếp Bút toán #1 (+50 triệu) và Bút toán #2 (-30 triệu) trên cùng kết nối (`max.in.flight.requests.per.connection > 1`). Nếu Bút toán #1 bị lỗi mạng tạm thời trong khi Bút toán #2 đi trọt lọt vào Broker ngay sau đó, rồi Producer mới tự động retry lại Bút toán #1 -> trên đĩa của Broker thứ tự sẽ biến thành `[#2, #1]` (đảo ngược lịch sử!). Giải pháp chuẩn của Kafka hiện đại là bật `enable.idempotence=true` đi kèm `max.in.flight.requests.per.connection <= 5`: Broker sẽ kiểm tra `SequenceNumber` liền kề của từng lô gửi, nếu thấy lô #2 đến mà lô #1 chưa ghi thành công, Broker sẽ từ chối xếp sai chỗ để ép giữ nguyên thứ tự gốc `[#1, #2]` mà vẫn giữ được thông lượng đường ống cao."
        ],
        bullets: [
          "Cảnh báo tăng số lượng Partition giữa chừng: Công thức định tuyến mặc định dựa trên phép chia lấy dư `% numPartitions`. Nếu Topic đang có 12 Partitions mà bạn nâng nóng lên 24 Partitions, tài khoản `100888` từ Partition 4 có thể nhảy sang Partition 16 trong khi Consumer vẫn chưa đọc hết tin cũ ở Partition 4 -> gây đảo thứ tự tạm thời! Hãy tính dư số Partition ngay từ đầu (ví dụ 24 hoặc 48 Partitions cho các topic lõi).",
          "Không bao giờ để Key = `null` cho sự kiện trạng thái thực thể: Key `null` chỉ dành cho các sự kiện độc lập không phụ thuộc thứ tự như log truy cập kỹ thuật hoặc đo lường hiệu năng.",
          "Đính kèm `sequenceVersion` / `ledgerEntryId` tăng dần trong Payload: Giúp phía Consumer luôn có thêm một lớp kiểm chứng thứ tự nghiệp vụ độc lập ngay cả khi phải phát lại dữ liệu lịch sử."
        ]
      },
      {
        heading: "2. Chống Mất Gói tin Tuyệt đối (Zero Data Loss): Giải phẫu Tam giác Vàng RF=3, min.isr=2, acks=all",
        paragraphs: [
          "Rất nhiều ứng viên đi phỏng vấn Senior khi được hỏi 'Làm sao để Kafka không mất tin?' chỉ trả lời vội vàng: 'Em đặt `acks=all` ở Producer là xong!'. Đây là câu trả lời thiếu một nửa và cực kỳ nguy hiểm trên Production! Tham số `acks=all` (tương đương `-1`) có ý nghĩa chính xác là: Leader chờ **tất cả các bản sao hiện đang nằm trong tập ISR (In-Sync Replicas)** xác nhận đã ghi. Điều gì xảy ra nếu Topic có 3 bản sao trên 3 Broker, nhưng 2 Broker phụ vừa bị nghẽn mạng văng khỏi tập ISR, chỉ còn trơ trọi một mình anh Leader trong ISR? Lúc này, với cấu hình mặc định `min.insync.replicas=1`, `acks=all` vẫn cho ghi thành công vào duy nhất 1 máy Leader đó! Một giây sau ổ cứng máy Leader cháy -> toàn bộ các giao dịch vừa báo thành công mất trắng 100%!",
          "Để đạt chuẩn tài chính (RPO = 0 ở tầng truyền thông điệp), bạn bắt buộc phải khóa chặt đồng thời 4 thông số trên cụm ít nhất 3 máy chủ vật lý/vùng khả dụng khác nhau: `replication.factor=3` (mỗi Partition có 3 bản sao), `min.insync.replicas=2` (tập ISR bắt buộc có tối thiểu 2 Broker sống khỏe gồm 1 Leader + ít nhất 1 Follower), `acks=all` trên Producer, và `unclean.leader.election.enable=false` trên Broker. Khi đó, nếu 1 Broker chết, hệ thống vẫn chạy êm ru 100% không gián đoạn (vẫn còn 2 ISR >= 2). Nếu 2 trên 3 Broker chết cùng lúc, Broker còn lại sẽ ném ngoại lệ `NotEnoughReplicasException` từ chối nhận tin mới (ưu tiên tính Nhất quán & Bền vững CP thay vì nhận bừa rồi mất tiền), kết hợp Outbox ở bài M3 giữ an toàn trong DB cho đến khi cụm Kafka khôi phục."
        ],
        bullets: [
          "Tại sao không đặt `min.insync.replicas=3` khi `replication.factor=3`?: Vì nếu đặt cả hai bằng 3, chỉ cần bạn restart bảo trì định kỳ 1 Broker duy nhất là toàn bộ luồng gửi Kafka của ngân hàng ngừng hoạt động ngay lập tức! Cặp số `(RF=3, min.isr=2)` là điểm cân bằng vàng giữa Độ bền và Độ sẵn sàng cao (HA).",
          "Khóa chặt `unclean.leader.election.enable=false`: Ngăn cấm tuyệt đối việc bầu một Broker đã tụt hậu dữ liệu (Out-of-Sync) lên làm Leader mới khi các ISR chính đang tắt máy, tránh việc cắt cụt (truncate) mất các bút toán đã chốt.",
          "Page Cache & Flush Policy: Kafka dựa vào OS Page Cache kết hợp nhân bản tức thời qua mạng sang nhiều máy chủ độc lập nguồn điện (Rack/Zone awareness) để đạt tốc độ cực cao mà vẫn bền vững trước sự cố sập máy đơn lẻ."
        ]
      },
      {
        heading: "3. Vận hành Consumer Group Thực chiến: Tắt Auto-Commit, Diệt Bão Rebalance & Giải cứu Hot Account",
        paragraphs: [
          "Ở phía đầu đọc (Consumer), cạm bẫy phổ biến nhất gây mất dữ liệu ngầm là giữ nguyên cấu hình mặc định `enable.auto.commit=true`. Khi bật cờ này, cứ mỗi 5 giây luồng nền của thư viện Kafka Client sẽ tự động báo lên Broker rằng 'tôi đã xử lý xong hết các bản ghi vừa poll về rồi' — bất chấp việc luồng Java của bạn đang xử lý đến bản ghi thứ 200 thì gặp lỗi DB hoặc Pod bị Kubernetes tắt! Khi Pod khởi động lại, nó đọc tiếp từ bản ghi 501, bỏ rơi vĩnh viễn 300 biến động số dư ở giữa. Trong hệ thống ngân hàng, bắt buộc đặt `enable.auto.commit=false` và dùng chế độ xác nhận thủ công của Spring Kafka (`AckMode.MANUAL_IMMEDIATE` hoặc `RECORD/BATCH`) chỉ sau khi logic nghiệp vụ và lưu trữ xuống cơ sở dữ liệu đích đã hoàn tất trọn vẹn.",
          "Cạm bẫy thứ hai là hiện tượng **Rebalance Storm (Bão chia lại Partition)**. Giả sử Consumer poll 500 bản tin một lần, nhưng mỗi bản tin lại gọi ra một cổng SMS bên ngoài mất 800ms -> tổng thời gian xử lý hết 500 tin là 400 giây, vượt quá `max.poll.interval.ms` (mặc định 300 giây = 5 phút). Broker tưởng Consumer đó đã chết cứng nên đá nó ra khỏi nhóm và giao Partition đó cho Pod khác đọc lại từ đầu, gây gửi trùng hàng trăm SMS và kích hoạt vòng lặp Rebalance dây chuyền làm tê liệt cả cụm! Cách trị tận gốc là giảm `max.poll.records` xuống mức vừa sức (ví dụ 50–100 bản ghi), áp dụng `CooperativeStickyAssignor` để khi thêm/bớt Pod chỉ chuyển giao những Partition cần thiết thay vì dừng toàn bộ nhóm (Stop-the-world rebalance), và không thực hiện tác vụ I/O treo lâu trực tiếp trên luồng poll."
        ],
        bullets: [
          "Quy luật song song tối đa: Số luồng Consumer hoạt động thực tế trong 1 Consumer Group không bao giờ vượt quá tổng số Partitions của Topic. Có 12 Partitions mà scale lên 20 Pods thì 8 Pods sẽ ngồi rỗi hoàn toàn (`Idle`).",
          "Xử lý Hot Account Skew (Lệch tải tài khoản siêu nóng): Nếu 1 tài khoản thu hộ điện lực/từ thiện phát sinh 40% tổng giao dịch toàn ngân hàng, việc dùng `accountNo` làm Partition Key sẽ dồn 40% tải vào đúng 1 Partition gây trễ cục bộ; giải pháp là tách các luồng không cần thứ tự (như lưu kho đối soát) sang khóa phân tán `txnId`, hoặc áp dụng kỹ thuật Sub-account Bucketing cho tài khoản thu hộ đặc biệt.",
          "Giám sát Consumer Lag theo thời gian thực: Đẩy metric `kafka_consumergroup_lag` ra Prometheus/Grafana; nếu Lag của topic thông báo biến động số dư vượt ngưỡng 5.000 bản ghi trong hơn 30 giây phải kích hoạt cảnh báo SRE và HPA tự động mở rộng số Pod tới chạm trần số Partitions."
        ]
      }
    ],
    comparison: {
      title: "Bảng Đối chiếu Cấu hình Độ bền Kafka theo Cấp độ Rủi ro Nghiệp vụ Ngân hàng",
      headers: ["Cấu hình Producer & Topic", "Thông lượng & Độ trễ", "Hậu quả khi Broker sập đột ngột", "Phạm vi áp dụng trong Ngân hàng"],
      rows: [
        [
          "`acks=0` (Fire-and-forget)",
          "Cao nhất, độ trễ < 1ms (không chờ phản hồi mạng)",
          "Mất dữ liệu ngay khi mạng chập chờn hoặc Broker khởi động lại",
          "CHỈ dùng cho telemetry phụ không quan trọng; CẤM TUYỆT ĐỐI cho dữ liệu nghiệp vụ"
        ],
        [
          "`acks=1`, `RF=3`",
          "Rất nhanh (~2–3ms), chỉ chờ 1 mình Leader ghi Page Cache",
          "Mất trắng các bản tin Leader vừa nhận nhưng chưa kịp nhân bản sang Follower trước khi sập",
          "Log hành vi tìm kiếm giao diện ứng dụng, thống kê lượt xem banner quảng cáo"
        ],
        [
          "`acks=all`, `RF=3`, `min.isr=1`",
          "Nhanh (~4–8ms), nhưng tạo cảm giác an toàn giả tạo",
          "Nếu 2 Follower rớt khỏi ISR trước đó, chỉ còn 1 Leader giữ dữ liệu -> Leader hỏng ổ cứng vẫn mất sạch!",
          "Bẫy cấu hình sai phổ biến cần kiểm toán và loại bỏ ngay trên môi trường Production"
        ],
        [
          "`acks=all`, `RF=3`, `min.isr=2`, `idempotence=true`",
          "Độ trễ ổn định ~5–12ms nội mạng DC; chống ghi trùng & giữ thứ tự",
          "Chịu lỗi chết bất kỳ 1 Broker không mất 1 byte nào; nếu chết >= 2 Broker sẽ chặn ghi an toàn thay vì làm sai lệch sổ",
          "Chuẩn bắt buộc cho Biến động số dư, Sổ cái sự kiện, Lệnh thanh toán Saga, Đối soát & Kiểm toán"
        ]
      ]
    },
    codeTitle: "Cấu hình Kafka Producer & Consumer Chuẩn Tài chính: Không Mất Tin, Giữ Thứ tự theo Tài khoản",
    code: [
      "package vn.finbank.messaging.config;",
      "import org.apache.kafka.clients.consumer.*;",
      "import org.apache.kafka.clients.producer.ProducerConfig;",
      "import org.apache.kafka.common.serialization.*;",
      "import org.springframework.beans.factory.annotation.Value;",
      "import org.springframework.context.annotation.*;",
      "import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;",
      "import org.springframework.kafka.core.*;",
      "import org.springframework.kafka.listener.ContainerProperties;",
      "import java.util.*;",
      "@Configuration",
      "public class FinancialKafkaConfig {",
      "    @Bean",
      "    public ProducerFactory<String, String> bankingProducerFactory(",
      "            @Value(\"${spring.kafka.bootstrap-servers}\") String brokers) {",
      "        return new DefaultKafkaProducerFactory<>(Map.of(",
      "            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, brokers,",
      "            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,",
      "            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class,",
      "            ProducerConfig.ACKS_CONFIG, \"all\", // Chờ toàn bộ tập ISR xác nhận",
      "            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true, // PID + Sequence chống trùng & đảo thứ tự",
      "            ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5,",
      "            ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120_000,",
      "            ProducerConfig.COMPRESSION_TYPE_CONFIG, \"lz4\"));",
      "    }",
      "    @Bean",
      "    public ConcurrentKafkaListenerContainerFactory<String, String> bankingListenerFactory(",
      "            @Value(\"${spring.kafka.bootstrap-servers}\") String brokers) {",
      "        Map<String, Object> props = Map.of(",
      "            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, brokers,",
      "            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,",
      "            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,",
      "            ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false, // Cấm tự commit ngầm!",
      "            ConsumerConfig.ISOLATION_LEVEL_CONFIG, \"read_committed\",",
      "            ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100,",
      "            ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG, List.of(CooperativeStickyAssignor.class));",
      "        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();",
      "        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(props));",
      "        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);",
      "        return factory;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Khi đặt `ENABLE_IDEMPOTENCE_CONFIG = true`, Kafka Client tự động ép cầu hình `retries = Integer.MAX_VALUE` và đảm bảo trên cùng một phiên Producer không bao giờ ghi đúp hoặc làm đảo thứ tự của tối đa 5 lô đang bay trên đường truyền (`MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION = 5`).",
      "Ở phía Broker tạo Topic biến động số dư, cấu hình Java này phải đi đôi với lệnh tạo Topic có `replication-factor=3`, `min.insync.replicas=2` và lúc gửi bắt buộc gọi `kafkaTemplate.send(\"ledger.balance.events\", event.accountNo(), jsonPayload)` (tham số thứ 2 là `accountNo` làm Partition Key).",
      "Phía Consumer tắt hoàn toàn `ENABLE_AUTO_COMMIT_CONFIG = false`, giới hạn `MAX_POLL_RECORDS_CONFIG = 100` để mỗi chu kỳ poll luôn kết thúc gọn trong vài giây (xa ngưỡng phạt 5 phút của `max.poll.interval.ms`), và bật `ISOLATION_LEVEL_CONFIG = \"read_committed\"` để bỏ qua các bản tin giao dịch bị hủy nếu có Producer dùng Kafka Transaction.",
      "`CooperativeStickyAssignor` giúp khi ngân hàng scale-out từ 4 Pods lên 8 Pods giờ cao điểm sáng thứ Hai, các Partition không đổi chủ vẫn tiếp tục đọc mượt mà không bị dừng toàn cục (Stop-the-World)."
    ],
    labGuide: {
      goal: "Kiểm chứng thực tế trên cụm Kafka 3 Brokers bằng Docker Compose: giữ đúng thứ tự 1.000 biến động liên tiếp của một tài khoản và không mất bất kỳ bản tin nào khi giết đột ngột (`docker kill`) Broker đang làm Leader.",
      steps: [
        "Bước 1: Dựng cụm 3 Kafka Brokers (KRaft mode) bằng Docker Compose, tạo topic `banking.balance.events` với `--partitions 6 --replication-factor 3 --config min.insync.replicas=2`.",
        "Bước 2: Viết hàm Producer bắn liên tiếp 1.000 biến động số dư của tài khoản `1900888999` (gắn số thứ tự `seq = 1..1000` vào payload và truyền `\"1900888999\"` làm Record Key).",
        "Bước 3: Đúng lúc Producer gửi đến khoảng bản tin thứ 400, chạy lệnh `kafka-topics --describe` xem Broker nào đang là Leader của Partition chứa tài khoản `1900888999` rồi lập tức gõ `docker kill <leader-container>`.",
        "Bước 4: Kiểm tra bộ đếm và mảng `seq` thu được bên phía Consumer sau khi toàn bộ 1.000 bản tin kết thúc."
      ],
      expectedOutput: "Producer tự động chuyển hướng sang Leader mới được bầu từ tập ISR trong vài trăm mili-giây mà không quăng lỗi ra ngoài; Consumer nhận đủ tất cả các số từ `1` đến `1000` theo thứ tự tăng dần nghiêm ngặt không thiếu một số và không đảo chỗ bất kỳ cặp nào."
    },
    examTips: [
      "Câu hỏi bẫy kinh điển: 'Đã đặt `acks=all` ở Producer nhưng khi hỏng ổ cứng 1 Broker vẫn mất giao dịch đã thành công, tại sao?' -> Kiểm tra ngay `min.insync.replicas` (đang bị để mặc định bằng `1`) hoặc `replication.factor=1` hoặc `unclean.leader.election.enable=true`!",
      "Nếu đề bài hỏi: 'Topic có 8 Partitions, Consumer Group đang chạy 8 instances nhưng vẫn bị lag nặng, sếp bảo tăng lên 16 instances trong cùng Consumer Group có nhanh gấp đôi không?' -> Trả lời dứt khoát **KHÔNG**, 8 instances mới sẽ ngồi không (`Idle`); muốn tăng độ song song đọc phải tăng số Partitions (lưu ý ảnh hưởng thứ tự key) hoặc tối ưu tách bớt I/O chậm bên trong Consumer.",
      "Muốn vừa retry không giới hạn khi rớt mạng vừa giữ nguyên thứ tự gói tin trên cùng Partition trong Kafka -> Bắt buộc bật `enable.idempotence=true` và giữ `max.in.flight.requests.per.connection <= 5`."
    ],
    summaryTakeaways: [
      "Kafka chỉ bảo toàn thứ tự trong phạm vi từng Partition; luôn dùng mã định danh gốc của nghiệp vụ (`accountNo`, `cardId`, `sagaId`) làm Partition Key để xếp hàng tuần tự mọi biến động liên quan.",
      "Bộ tứ bất khả xâm phạm chống mất tin tài chính: `replication.factor=3`, `min.insync.replicas=2`, `acks=all` và `unclean.leader.election.enable=false`.",
      "Luôn bật `enable.idempotence=true` trên Producer để ngăn chặn việc mạng retry sinh bản ghi trùng hoặc làm đảo ngược thứ tự các gói tin đang bay trên đường ống.",
      "Trên Consumer, tắt `enable.auto.commit`, chốt Offset thủ công sau khi lưu kết quả thành công và sử dụng `CooperativeStickyAssignor` cùng `max.poll.records` hợp lý để triệt tiêu bão Rebalance."
    ],
    lessonQuestions: [
      {
        question: "Dịch vụ Core Account phát sự kiện biến động số dư (`CREDIT +10M`, liền sau đó `DEBIT -4M`) lên một Kafka Topic gồm 12 Partitions để dịch vụ Notification gửi OTT/SMS cho khách hàng. Khách hàng liên tục khiếu nại nhận được tin nhắn trừ 4 triệu trước rồi mới nhận tin cộng 10 triệu. Nguyên nhân gốc rễ và cách khắc phục đúng chuẩn là gì?",
        options: [
          "Do Kafka không hỗ trợ giữ thứ tự bản tin ở bất kỳ cấu hình nào; bắt buộc phải gỡ bỏ Kafka và chuyển sang đọc quét bảng Database mỗi phút 1 lần.",
          "Do Producer gửi bản tin với Key bằng `null` (hoặc dùng `randomUUID()` làm Key) khiến 2 sự kiện của cùng một tài khoản rơi vào 2 Partitions khác nhau được đọc bởi 2 luồng Consumer với tốc độ lệch nhau; cần đổi sang dùng `accountNo` làm Partition Key kết hợp bật `enable.idempotence=true`.",
          "Do Topic có quá ít Partition; cần tăng từ 12 Partitions lên 1.200 Partitions và vẫn để Key bằng `null`.",
          "Chỉ cần bật `enable.auto.commit=true` với chu kỳ 100ms trên Consumer là thứ tự giữa các Partitions sẽ tự động đồng bộ."
        ],
        answer: 1,
        explanation: "Khi không truyền Partition Key (hoặc truyền mã ngẫu nhiên mỗi giao dịch), các sự kiện của cùng một tài khoản bị rải sang nhiều Partitions độc lập nên luồng Consumer nào rảnh hơn sẽ xử lý và bắn SMS trước, gây đảo thứ tự. Định tuyến cố định bằng `accountNo` làm Partition Key kết hợp Idempotent Producer đảm bảo mọi biến động của một tài khoản luôn nằm tuần tự trong đúng 1 Partition.",
        wrongReasons: [
          "Kafka đảm bảo thứ tự nghiêm ngặt trong phạm vi từng Partition với hiệu năng rất cao, hoàn toàn không cần quay về quét bảng thủ công.",
          "",
          "Tăng lên 1.200 Partitions mà vẫn để Key `null` càng làm các bản tin phân tán ngẫu nhiên hơn, hoàn toàn không giải quyết được thứ tự theo tài khoản.",
          "`enable.auto.commit` chỉ điều khiển thời điểm lưu con trỏ Offset của Consumer, không liên quan đến thứ tự phân phối bản tin giữa các Partitions và còn gây nguy cơ mất tin."
        ]
      },
      {
        question: "Cụm Kafka Production của ngân hàng gồm 3 Brokers, Topic `payment.settlement` được cấu hình `replication.factor=3`, `min.insync.replicas=2` và Producer cấu hình `acks=all`. Trong đợt sự cố nguồn điện phòng máy, 2 trên tổng số 3 Brokers bị sập nguồn cùng một lúc (chỉ còn 1 Broker đang chạy). Hành vi nào sẽ xảy ra đối với các lệnh gửi sự kiện mới vào Topic này?",
        options: [
          "Broker còn lại tự động hạ `acks=all` xuống `acks=0` để tiếp tục nhận dữ liệu bình thường mà không báo lỗi.",
          "Broker còn lại từ chối yêu cầu ghi với lỗi `NotEnoughReplicasException` (vì số bản sao đồng bộ hiện tại là 1 < `min.insync.replicas=2`), giúp ngăn chặn việc xác nhận giao dịch trên một máy đơn độc có nguy cơ mất trắng dữ liệu; các bản ghi đọc (Consumer) từ dữ liệu đã chốt trên Broker sống vẫn có thể phục vụ.",
          "Toàn bộ dữ liệu lịch sử đã ghi thành công từ tuần trước trên cả 3 Brokers tự động bị xóa sạch.",
          "Producer tự động tạo thêm 2 Topic nháp trên RAM của ứng dụng Spring Boot để thay thế cụm Kafka."
        ],
        answer: 1,
        explanation: "Với `min.insync.replicas=2` và `acks=all`, hệ thống ưu tiên tính Bền vững & Nhất quán dữ liệu (CP): khi chỉ còn 1 Broker sống trong ISR (nhỏ hơn ngưỡng tối thiểu 2), Broker sẽ chủ động ném `NotEnoughReplicasException` thay vì mạo hiểm ghi đơn độc không có bản sao dự phòng. Khi kết hợp với Transactional Outbox (bài M3), các sự kiện vẫn nằm an toàn trong PostgreSQL và tự động đẩy tiếp ngay khi ít nhất 1 trong 2 Broker sập khởi động lại.",
        wrongReasons: [
          "Kafka tuyệt đối không tự ý hạ cấp cam kết độ bền `acks=all` đã cấu hình vì làm vậy sẽ phá vỡ hợp đồng an toàn dữ liệu của hệ thống tài chính.",
          "",
          "Dữ liệu lịch sử đã được nhân bản và chốt trước sự cố vẫn nằm nguyên vẹn trên ổ đĩa bền vững, không hề bị xóa.",
          "Thư viện Kafka Producer không có cơ chế tự sinh Topic nháp trên RAM để qua mặt cấu hình quorum của Broker."
        ]
      }
    ]
  },

  M3: {
    duration: "70 phút",
    difficulty: "Senior / Data Consistency",
    codeLang: "java",
    teacherIntro: "Chào bạn, có một đoạn code nhìn qua tưởng sạch sẽ, chuẩn chỉ đến mức 80% lập trình viên Java từng viết ít nhất một lần trong đời: mở `@Transactional`, gọi `ledgerRepository.save(debitEntry)` để trừ 20 triệu trong PostgreSQL, ngay dòng dưới gọi `kafkaTemplate.send(\"transfer.completed\", event)` để báo cho dịch vụ Chuyển mạch liên ngân hàng đẩy tiền đi! Trên môi trường Dev chạy mượt 10.000 lần không lỗi. Nhưng lên Production tháng thứ 3, đúng khoảnh khắc PostgreSQL vừa `COMMIT` xong ở dòng trên, trước khi gói tin mạng tới được Kafka ở dòng dưới thì Pod ứng dụng bị Kubernetes thu hồi do hết RAM (hoặc mạng Kafka chập chờn 3 giây)! Hậu quả kinh hoàng: khách hàng bị trừ đứt 20 triệu trong sổ cái, nhưng bên dịch vụ Chuyển mạch không nhận được bất kỳ sự kiện nào nên không chuyển tiền cho người nhận — tiền 'bốc hơi' lơ lửng giữa hai dịch vụ cho đến tận sáng hôm sau khách kiện! Ngược lại, nếu bạn đảo dòng `kafkaTemplate.send()` lên trước lệnh `COMMIT` DB, nhỡ Kafka nhận xong mà lệnh `COMMIT` DB bị lỗi trùng khóa quay đầu Rollback -> ngân hàng chuyển khống 20 triệu đi thật dù chưa hề trừ được tiền khách! Đây chính là bài toán **Dual-Write (Ghi kép lên hai hạ tầng không chung giao dịch)** kinh điển nhất ngành phần mềm. Hôm nay, anh sẽ trao cho bạn vũ khí tối thượng giải quyết triệt để 100% bài toán này: **Transactional Outbox + Idempotent Inbox + Dead Letter Topic**.",
    analogy: {
      title: "Khay Thư Đi Nội Bộ Khóa Chung Két Sắt & Sổ Đăng Ký Công Văn Đến",
      body: "Hãy hình dung Giao dịch viên tại chi nhánh sau khi ghi bút toán trừ tiền vào Sổ Cái gốc cần gửi giấy báo sang Trung tâm Thanh toán. Nếu cô giao dịch viên vừa đóng sổ xong lại tự chạy bộ ra bưu điện gửi thư (Dual-Write), dọc đường cô ấy có thể bị trượt chân ngã mất lá thư mà Sổ Cái ở quầy đã trót ghi rồi! Quy trình chuẩn của ngân hàng là: ngay trong cùng một thao tác mở két sắt (1 Local ACID Transaction duy nhất), giao dịch viên vừa ghi dòng trừ tiền vào Sổ Cái, vừa bỏ luôn tờ phiếu thông báo vào 'Khay Thư Đi Nội Bộ' (`outbox_events` nằm trong CÙNG Database đó) rồi khóa két lại — hoặc cả hai cùng nằm trong két, hoặc cả hai cùng hủy, không bao giờ lệch! Sau đó, anh nhân viên văn thư chuyên trách (Debezium CDC hoặc Outbox Relay) liên tục lấy thư trong khay đem phát lên bưu cục Kafka. Còn ở đầu Trung tâm Thanh toán nhận thư, họ có cuốn 'Sổ Đăng Ký Công Văn Đến' (`processed_inbox` có khóa duy nhất `event_id`): nếu anh văn thư cẩn thận phát nhầm lá thư số `#EV-99` hai lần, văn thư đầu nhận tra sổ thấy mã `#EV-99` đã đóng dấu xử lý rồi thì mỉm cười bỏ bản trùng vào sọt rác!"
    },
    objectives: [
      "Hiểu tận gốc tại sao mọi biến thể Dual-Write trực tiếp giữa Database và Message Broker đều chắc chắn gây lệch dữ liệu khi có sự cố mạng hoặc sập tiến trình.",
      "Triển khai hoàn chỉnh Transactional Outbox Pattern (kết hợp Polling `SKIP LOCKED` hoặc Debezium WAL CDC) đi đôi với bảng chống trùng Idempotent Consumer (`Inbox Pattern`) để đạt hiệu quả Đúng Một Lần (Effective Exactly-Once).",
      "Thiết kế chiến lược xử lý bản tin lỗi (Poison Pill), phân tách lỗi tạm thời với lỗi nghiệp vụ cố định qua cơ chế Retry và Dead Letter Topic (DLT) có công cụ Replay vận hành."
    ],
    flow: [
      {
        step: "1. Atomic Local Commit (Ghi Sổ cái + Bảng Outbox trong 1 Giao dịch DB)",
        detail: "Trong cùng một `@Transactional` trên PostgreSQL, dịch vụ nguồn vừa ghi bản ghi nghiệp vụ (`ledger_entries`), vừa `INSERT` sự kiện JSON vào bảng `outbox_events` — tận dụng 100% tính nguyên tử ACID của một Database duy nhất."
      },
      {
        step: "2. Reliable Relay / WAL CDC (Đọc Outbox và Đẩy lên Kafka)",
        detail: "Debezium đọc trực tiếp luồng Write-Ahead Log (WAL) của PostgreSQL (hoặc Worker quét bằng `SELECT ... FOR UPDATE SKIP LOCKED`) đẩy bản tin lên Kafka với khóa phân vùng `aggregate_id` cho tới khi nhận được `acks=all`."
      },
      {
        step: "3. Idempotent Inbox Deduplication (Khử trùng nguyên tử phía Consumer)",
        detail: "Consumer nhận bản tin (chấp nhận tính chất At-Least-Once có thể lặp lại), mở `@Transactional` tại DB đích và chạy lệnh kiểm tra/chèn `event_id` vào bảng `inbox_processed_events` trước khi thực thi nghiệp vụ."
      },
      {
        step: "4. Controlled Retry & Dead Letter Routing (Cách ly bản tin độc ra DLT)",
        detail: "Nếu gặp lỗi hạ tầng tạm thời, bản tin được thử lại theo hàm mũ (Exponential Backoff); nếu vẫn thất bại sau N lần hoặc gặp lỗi định dạng không thể cứu vãn, bản tin được chuyển sang `.DLT` kèm cảnh báo vận hành để tra soát và phát lại."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Tử huyệt Dual-Write & Hai nhánh triển khai Transactional Outbox",
        paragraphs: [
          "Vì sao không dùng Giao dịch Phân tán 2 pha (XA / 2PC) nối thẳng giữa PostgreSQL và Kafka cho nhàn? Thứ nhất, giao thức XA giữ khóa trên bảng DB trong suốt thời gian chờ phối hợp mạng qua nhiều hệ thống làm tụt thông lượng xuống hàng chục lần; thứ hai, bản thân cầu nối XA giữa RDBMS và Kafka không được hỗ trợ đồng bộ chuẩn mực và tạo ra điểm nghẽn thảm khốc ở giờ cao điểm. Transactional Outbox hóa giải bài toán bằng một tư duy cực kỳ thanh thoát: biến thao tác 'gửi tin qua mạng' thành thao tác 'INSERT một dòng vào bảng cục bộ `outbox_events`' chung một kết nối JDBC với bảng nghiệp vụ chính. PostgreSQL cam kết 100%: không bao giờ có chuyện `ledger_entries` được lưu mà `outbox_events` bị thiếu, và cũng không bao giờ có chuyện giao dịch bị Rollback mà dòng `outbox_events` lọt ra ngoài!",
          "Để bốc dữ liệu từ bảng `outbox_events` đẩy lên Kafka, trên Production ngân hàng có hai kiến trúc chủ đạo. Cách 1 là **Polling Publisher với `FOR UPDATE SKIP LOCKED`**: một cụm tiến trình nền quét định kỳ mỗi 100–200ms lấy lô 200 dòng `WHERE status = 'NEW' ORDER BY id ASC LIMIT 200 FOR UPDATE SKIP LOCKED`, gửi lên Kafka xong thì đánh dấu `PUBLISHED`. Cách này cực kỳ dễ vận hành, không cần cài thêm thành phần hạ tầng mới, đủ sức gánh 500–1.500 TPS mượt mà. Cách 2 cho quy mô siêu lớn (5.000–20.000 TPS, độ trễ < 20ms) là **Log-Based CDC với Debezium**: ứng dụng chỉ cần `INSERT` vào bảng Outbox (thậm chí xóa ngay hoặc dùng Partition theo ngày tự drop mà không cần câu lệnh `SELECT` quét bảng gây tải đọc), còn Debezium nối vào khe Replication Slot đọc luồng WAL nhị phân của PostgreSQL để bắn thẳng lên Kafka theo thời gian thực."
        ],
        bullets: [
          "Cấu trúc chuẩn bảng `outbox_events`: Gồm `id` (UUIDv7 hoặc BIGSERIAL giữ thứ tự), `aggregate_type` (VD: `'ACCOUNT'`), `aggregate_id` (số tài khoản -> dùng làm Kafka Partition Key!), `event_type`, `payload` (JSONB), `trace_id` (giữ mạch OpenTelemetry xuyên qua Outbox!) và `created_at`.",
          "Quản trị dung lượng bảng Outbox (Housekeeping): Bảng Outbox phình rất nhanh (vài chục triệu dòng/ngày); bắt buộc thiết kế Range Partition theo ngày (`PARTITION BY RANGE (created_at)`) để ban đêm chỉ cần `DROP TABLE outbox_events_2026_11_20` các phân vùng đã gửi hết trong 1 mili-giây thay vì chạy `DELETE` gây rác Vacuum (bloat)!",
          "Theo dõi Replication Slot khi dùng Debezium: Nếu Kafka Connect / Debezium bị chết nhiều giờ không đọc WAL, PostgreSQL sẽ giữ lại toàn bộ file WAL chưa đọc làm đầy 100% ổ cứng DB chính! Luôn cài đặt cảnh báo dung lượng `pg_replication_slots` và giới hạn `max_slot_wal_keep_size`."
        ]
      },
      {
        heading: "2. Idempotent Consumer (Inbox Pattern): Mảnh ghép bắt buộc để hoàn thiện phương trình Không Trùng Lặp",
        paragraphs: [
          "Hãy suy ngẫm kỹ tình huống này: tiến trình Outbox Relay đọc sự kiện `#EV-105` từ DB, gửi lên Kafka thành công và Broker đã ghi đĩa xong xuôi, nhưng đúng lúc gói phản hồi ACK quay về hoặc trước khi Relay kịp cập nhật `status = 'PUBLISHED'` trong DB thì Pod Relay bị tắt nguồn! Khi khởi động lại, Relay thấy `#EV-105` vẫn đang mang trạng thái `'NEW'` nên cần mẫn gửi lên Kafka thêm một lần nữa. Điều này chứng minh một chân lý bất biến trong hệ thống phân tán: **Outbox đảm bảo tính chất At-Least-Once (Ít nhất một lần, không bao giờ mất), chứ tự nó KHÔNG ngăn được bản tin xuất hiện 2 lần trên Kafka!** Ngay cả tính năng `enable.idempotence=true` của Kafka ở bài M2 cũng chỉ chống trùng trong cùng một phiên gửi mạng của Producer, không chống được việc ứng dụng đọc Outbox tạo ra một `ProducerRecord` mới lần hai.",
          "Do đó, mọi Kafka Consumer trong ngân hàng có tác động làm thay đổi trạng thái hoặc phát sinh hành động ra ngoài **bắt buộc 100% phải Lũy đẳng (Idempotent)**. Cách cài đặt chuẩn Production an toàn nhất gọi là **Transactional Inbox Pattern**: tại Database của dịch vụ nhận (Consumer), ta tạo bảng `inbox_events (event_id VARCHAR(64) PRIMARY KEY, consumer_group VARCHAR(64), processed_at TIMESTAMPTZ)`. Khi nhận một bản tin từ Kafka, Consumer mở một `@Transactional` duy nhất thực hiện ngay bước đầu tiên: `INSERT INTO inbox_events (event_id, ...) VALUES (:id, ...) ON CONFLICT (event_id) DO NOTHING`. Nếu số dòng chèn thành công trả về bằng `0`, nghĩa là sự kiện này đã được xử lý trước đó rồi — Consumer lập tức kết thúc hàm êm đẹp và `ack` con trỏ Kafka mà không cộng tiền/cộng điểm lần hai! Nhờ phép kết hợp **Transactional Outbox (At-Least-Once) + Transactional Inbox (Idempotent Deduplication)**, toàn hệ thống đạt được trạng thái **Effective Exactly-Once** vững như bàn thạch."
        ],
        bullets: [
          "Tại sao không kiểm tra trùng bằng Redis `GET/SET` thông thường trước khi lưu DB?: Vì nếu lưu DB xong mà rớt mạng chưa kịp ghi Redis (lại dính lỗi Dual-Write ở chiều ngược lại!), lần thử lại vẫn bị xử lý đúp. Đặt bảng `inbox_events` nằm CHUNG Database và CHUNG `@Transactional` với nghiệp vụ của Consumer mới khóa chặt 100% tính nguyên tử!",
          "Khử trùng cho tác vụ gọi bên thứ ba không có DB cục bộ (như gửi SMS): Sử dụng trạng thái khóa nguyên tử `CLAIMING -> SENT` trong DB của Notification Service kèm truyền mã `clientMessageId = eventId` sang cổng nhà mạng hỗ trợ chống gửi trùng.",
          "Dọn dẹp bảng `inbox_events`: Lưu giữ `event_id` tối thiểu dài hơn thời gian lưu trữ của Kafka Topic (ví dụ Topic giữ 7 ngày thì bảng Inbox giữ 14–30 ngày rồi dọn phân vùng cũ)."
        ]
      },
      {
        heading: "3. Xử lý Bản tin Độc (Poison Pill), Chiến lược Retry & Dead Letter Topic (DLT)",
        paragraphs: [
          "Điều gì xảy ra nếu một lập trình viên lỡ đẩy lên Kafka một bản tin thiếu trường bắt buộc gây lỗi `JsonProcessingException` (gọi là **Poison Pill - Bản tin độc**), mà Consumer của bạn cứ gặp lỗi là không commit offset để đọc đi đọc lại mãi? Toàn bộ Partition chứa bản tin độc đó sẽ bị kẹt cứng tại chỗ — hàng chục nghìn giao dịch hợp lệ xếp phía sau nó bị chặn đứng hoàn toàn! Để hệ thống tự phục hồi mà không mất dữ liệu lỗi, ta phải phân loại rạch ròi 2 nhóm ngoại lệ: (1) **Non-Retryable Exceptions** (lỗi cú pháp JSON, dữ liệu không hợp lệ vĩnh viễn) -> không bao giờ retry vô ích, đẩy thẳng sang Dead Letter Topic (`.DLT`) ngay lập tức; và (2) **Transient / Retryable Exceptions** (DB đích đang nghẽn kết nối tạm thời, dịch vụ hạ tầng đang restart) -> thực hiện thử lại có giãn cách mũ (ví dụ sau 1s -> 5s -> 30s -> 2 phút).",
          "Một lưu ý đẳng cấp Senior cực kỳ quan trọng khi dùng `@RetryableTopic` (Non-blocking Retry qua các topic phụ `.retry-0`, `.retry-1` của Spring Kafka): cơ chế này không làm nghẽn Partition chính vì bản tin lỗi được chuyển sang topic phụ chờ đến giờ thử lại, rất tuyệt vời cho các luồng độc lập như gửi Email, tích điểm Loyalty hay đẩy kho tìm kiếm. TUY NHIÊN, đối với các luồng đòi hỏi **giữ nghiêm ngặt thứ tự trạng thái trên cùng một tài khoản** (ví dụ đồng bộ số dư tuần tự), nếu bản tin #1 bị chuyển sang topic `.retry` chờ 30 giây trong khi bản tin #2 của cùng tài khoản đó lại chạy thẳng qua ở topic chính ngay lập tức -> bạn sẽ bị đảo thứ tự trạng thái! Với luồng yêu cầu thứ tự khắt khe, hãy dùng `DefaultErrorHandler` kèm `ExponentialBackOff` giữ nguyên tại chỗ vài nhịp ngắn hoặc đánh dấu tài khoản đó đang có sự kiện treo chờ xử lý theo lô tuần tự."
        ],
        bullets: [
          "Không để `.DLT` biến thành 'nghĩa địa bị lãng quên': Mọi bản tin rơi vào Dead Letter Topic phải tự động bắn cảnh báo mức HIGH lên Slack/PagerDuty cho ca trực vận hành kèm lưu vào bảng quản trị trên Back-Office để kỹ sư xem lỗi, sửa nguyên nhân và bấm nút **Replay** phát lại an toàn.",
          "Lưu kèm Metadata chẩn đoán trong Header của bản tin DLT: Spring Kafka tự động đính kèm `kafka_dlt-exception-fqcn`, `kafka_dlt-exception-message`, `kafka_dlt-original-topic`, `kafka_dlt-original-partition` và `kafka_dlt-original-offset` rất hữu ích khi điều tra sự cố.",
          "Vì có cơ chế Replay từ DLT, bản thân Consumer chính càng bắt buộc phải có Inbox Idempotency để khi vận hành bấm phát lại một lô bản tin không gây tác động trùng lặp lên các bản ghi đã chạy thành công."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Mô hình Đồng bộ Trạng thái Dữ liệu & Phát Sự kiện trong Ngân hàng",
      headers: ["Mô hình triển khai", "Đảm bảo Nhất quán khi Sập mạng/Pod", "Độ trễ & Chi phí Hạ tầng", "Đánh giá Chuẩn Kiến trúc Ngân hàng"],
      rows: [
        [
          "Dual-Write trực tiếp (`repo.save()` rồi `kafka.send()`)",
          "KHÔNG đảm bảo — mất sự kiện nếu Pod sập sau khi commit DB hoặc phát sự kiện ma nếu gửi trước khi commit",
          "Độ trễ thấp, không tốn bảng phụ nhưng tiềm ẩn rủi ro lệch sổ ngầm",
          "CẤM SỬ DỤNG cho mọi luồng liên quan đến tiền tệ, số dư, hạn mức và trạng thái đơn hàng"
        ],
        [
          "Distributed 2PC / XA giữa DB & Broker",
          "Nhất quán mạnh về lý thuyết nhưng dễ treo giao dịch phân tán (In-doubt TX) khi Coordinator đứt kết nối",
          "Rất chậm, khóa dòng DB lâu, thông lượng kém và hỗ trợ kém trên Kafka hiện đại",
          "Không phù hợp cho kiến trúc Microservices chịu tải hàng nghìn TPS"
        ],
        [
          "Outbox Table + Polling Relay (`FOR UPDATE SKIP LOCKED`)",
          "Đảm bảo 100% At-Least-Once; kết hợp Inbox Consumer đạt Effective Exactly-Once",
          "Độ trễ ~100–300ms; cài đặt gọn nhẹ ngay trong hệ sinh thái Spring Boot + PostgreSQL",
          "Khuyến nghị hàng đầu cho phần lớn các dịch vụ ngân hàng quy mô vừa đến lớn (< 1.500 TPS)"
        ],
        [
          "Outbox Table + Debezium WAL CDC",
          "Đảm bảo 100% At-Least-Once trực tiếp từ Nhật ký WAL mà không tốn câu lệnh SELECT quét bảng",
          "Độ trễ gần thời gian thực (10–50ms); cần vận hành thêm cụm Kafka Connect & giám sát WAL Slot",
          "Chuẩn mực cho Core Ledger / Payment Hub siêu tải cao (> 2.000–10.000 TPS)"
        ]
      ]
    },
    codeTitle: "Triển khai Transactional Outbox phía Ghi Sổ Cái & Idempotent Inbox phía Consumer (Java 21)",
    code: [
      "package vn.finbank.ledger.outbox;",
      "import org.apache.kafka.clients.consumer.ConsumerRecord;",
      "import org.springframework.jdbc.core.JdbcTemplate;",
      "import org.springframework.kafka.annotation.*;",
      "import org.springframework.retry.annotation.Backoff;",
      "import org.springframework.stereotype.Service;",
      "import org.springframework.transaction.annotation.Transactional;",
      "import java.util.UUID;",
      "",
      "@Service",
      "public class OutboxAndInboxBankingFlow {",
      "    private final LedgerEntryRepository ledgerRepo;",
      "    private final OutboxEventRepository outboxRepo;",
      "    private final JdbcTemplate jdbc;",
      "    public OutboxAndInboxBankingFlow(LedgerEntryRepository l, OutboxEventRepository o, JdbcTemplate j) {",
      "        this.ledgerRepo = l; this.outboxRepo = o; this.jdbc = j;",
      "    }",
      "    @Transactional(rollbackFor = Exception.class) // 1. PRODUCER: Ghi Sổ cái + Outbox chung 1 DB TX",
      "    public UUID commitDebitAndEnqueueEvent(LedgerEntry debitEntry, String eventJson, String traceId) {",
      "        ledgerRepo.save(debitEntry);",
      "        UUID eventId = UUID.randomUUID();",
      "        outboxRepo.save(new OutboxEvent(eventId, \"ACCOUNT\", debitEntry.getAccountNo(),",
      "            \"LEDGER_DEBITED\", eventJson, traceId, \"NEW\"));",
      "        return eventId; // Tuyệt đối KHÔNG gọi kafkaTemplate.send() trực tiếp ở đây!",
      "    }",
      "    @RetryableTopic(attempts = \"4\", backoff = @Backoff(delay = 1000, multiplier = 3.0),",
      "                    exclude = {IllegalArgumentException.class})",
      "    @KafkaListener(topics = \"ledger.events\", groupId = \"loyalty-cashback-cg\")",
      "    @Transactional(rollbackFor = Exception.class) // 2. CONSUMER: Khử trùng Inbox nguyên tử",
      "    public void onLedgerDebited(ConsumerRecord<String, String> record) {",
      "        String eventId = new String(record.headers().lastHeader(\"X-Event-Id\").value());",
      "        int inserted = jdbc.update(",
      "            \"INSERT INTO inbox_events(event_id, consumer_group) VALUES (?, ?) ON CONFLICT DO NOTHING\",",
      "            eventId, \"loyalty-cashback-cg\");",
      "        if (inserted > 0) awardCashbackPoints(record.key(), record.value());",
      "    }",
      "    @DltHandler",
      "    public void handlePoisonMessage(ConsumerRecord<String, String> failed) {",
      "        jdbc.update(\"INSERT INTO dlt_quarantine(topic, event_key, payload) VALUES (?, ?, ?)\",",
      "            failed.topic(), failed.key(), failed.value());",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Hàm `commitDebitAndEnqueueEvent` đạt tính nguyên tử tuyệt đối vì cả `ledgerRepo.save()` và `outboxRepo.save()` chạy trên cùng một kết nối JDBC của một Transaction Manager duy nhất; dù điện cúp ở bất kỳ dòng lệnh nào cũng không bao giờ xảy ra lệch trạng thái giữa Sổ Cái và Outbox.",
      "Trường `debitEntry.getAccountNo()` được lưu vào cột `aggregate_id` của bảng Outbox để tiến trình Relay/Debezium dùng nó làm **Kafka Partition Key**, đồng thời `traceId` giúp nối liền cây Distributed Tracing từ API gốc sang tận Consumer.",
      "Câu lệnh SQL `INSERT INTO inbox_events(...) ON CONFLICT DO NOTHING` bên trong `@Transactional` của Consumer đóng vai trò cả bộ lọc khử trùng lẫn khóa đồng thời ở mức dòng DB: nếu giao dịch nghiệp vụ `awardCashbackPoints` bên dưới ném lỗi Rollback, dòng `inbox_events` cũng tự động được Rollback theo để lần Retry sau vẫn được phép chạy lại bình thường!",
      "`@RetryableTopic` loại trừ `IllegalArgumentException.class` (lỗi dữ liệu sai định dạng không thể cứu vãn) để đẩy thẳng về `@DltHandler` cô lập vào bảng `dlt_quarantine` chờ vận hành kiểm tra mà không lãng phí 4 lượt retry vô ích."
    ],
    labGuide: {
      goal: "Chứng minh mô hình Outbox + Inbox chống mất sự kiện khi sập mạng Kafka và chống cộng đúp tiền thưởng khi sự kiện bị phát lặp 5 lần.",
      steps: [
        "Bước 1: Tạo bảng `ledger_entries`, `outbox_events` (có index trên `(status, id) WHERE status = 'NEW'`) và `inbox_events` trên PostgreSQL.",
        "Bước 2: Tạm dừng toàn bộ container Kafka (`docker stop kafka`), sau đó gọi API chuyển tiền 10 lần liên tiếp. Kiểm tra DB xác nhận cả 10 bút toán và 10 dòng `outbox_events` đều được ghi nhận an toàn với `status = 'NEW'`.",
        "Bước 3: Bật lại container Kafka (`docker start kafka`); quan sát Worker quét Outbox (`SELECT ... FOR UPDATE SKIP LOCKED`) tự động đẩy toàn bộ 10 sự kiện lên Kafka và cập nhật trạng thái thành `'PUBLISHED'`.",
        "Bước 4: Cố tình reset `status = 'NEW'` cho 5 dòng trong `outbox_events` để giả lập kịch bản Relay phát trùng lần hai, sau đó kiểm tra số điểm thưởng của khách hàng ở dịch vụ Loyalty."
      ],
      expectedOutput: "Không mất bất kỳ sự kiện nào dù Kafka sập hẳn trong lúc khách giao dịch; khi cố tình phát lặp lại 5 sự kiện cũ, lệnh `ON CONFLICT DO NOTHING` trên bảng `inbox_events` trả về `0` nên khách hàng chỉ được cộng điểm đúng 1 lần duy nhất cho mỗi giao dịch."
    },
    examTips: [
      "Trong vòng phỏng vấn System Design Ngân hàng, hễ bạn vẽ một microservice vừa ghi Database vừa bắn sự kiện Kafka, hãy **chủ động nói luôn câu**: 'Em dùng Transactional Outbox trong cùng DB Transaction kết hợp Inbox Deduplication ở phía Consumer để triệt tiêu lỗi Dual-Write' — hội đồng chấm điểm cộng mức Senior ngay lập tức!",
      "Khi viết Worker quét bảng Outbox chạy trên nhiều Pod Kubernetes cùng lúc, bắt buộc dùng mệnh đề `FOR UPDATE SKIP LOCKED` trên PostgreSQL/Oracle để 4 Pods không bốc trùng cùng một lô bản ghi Outbox.",
      "Cẩn trọng thứ tự khi dùng Non-blocking `@RetryableTopic`: chỉ dùng cho tác vụ không phụ thuộc thứ tự chéo, hoặc đảm bảo logic phía nhận kiểm tra `version` mới hơn thì bỏ qua bản ghi cũ đến muộn."
    ],
    summaryTakeaways: [
      "Dual-Write trực tiếp giữa DB và Kafka luôn tiềm ẩn nguy cơ mất sự kiện hoặc phát sự kiện ma; tuyệt đối không dùng cho luồng nghiệp vụ tài chính.",
      "Transactional Outbox biến thao tác phát sự kiện thành một lệnh INSERT cục bộ chung giao dịch ACID với dữ liệu gốc, sau đó chuyển tiếp qua Polling `SKIP LOCKED` hoặc Debezium WAL CDC.",
      "Outbox chỉ đảm bảo At-Least-Once; bắt buộc ghép đôi với bảng chống trùng `inbox_events` nằm chung giao dịch DB của Consumer để đạt Effective Exactly-Once.",
      "Phân tách rõ lỗi tạm thời (Retry có Backoff) và lỗi dữ liệu cố định (đẩy ngay sang Dead Letter Topic kèm cảnh báo và công cụ Replay an toàn)."
    ],
    lessonQuestions: [
      {
        question: "Một kỹ sư đề xuất sửa lỗi mất sự kiện Kafka bằng cách đảo thứ tự trong hàm `@Transactional`: gọi `kafkaTemplate.send(event).get()` chờ Kafka ghi đĩa thành công TRƯỚC, rồi mới gọi `accountRepository.debit(...)` và commit Database. Đánh giá nào sau đây chỉ ra đúng rủi ro nghiêm trọng nhất của thiết kế này?",
        options: [
          "Thiết kế này hoàn hảo 100%, không còn bất kỳ khả năng lệch dữ liệu nào giữa Database và Kafka.",
          "Nếu Kafka ghi nhận sự kiện thành công nhưng ngay bước sau câu lệnh `debit(...)` hoặc lệnh `COMMIT` của PostgreSQL thất bại và bị Rollback (do không đủ số dư khi đụng độ đồng thời, vi phạm ràng buộc hoặc đứt kết nối DB), một 'sự kiện ma' đã được phát đi thật khiến các dịch vụ phía sau chuyển tiền/gạch nợ khống dù tài khoản khách chưa hề bị trừ tiền; ngoài ra giữ `@Transactional` chờ mạng Kafka còn làm cạn kiệt HikariCP Pool.",
          "Chỉ bị chậm hơn khoảng 1ms nhưng dữ liệu luôn nhất quán tuyệt đối trong mọi kịch bản lỗi.",
          "PostgreSQL sẽ tự động gọi API sang Kafka để xóa sự kiện vừa gửi nếu giao dịch Database bị Rollback."
        ],
        answer: 1,
        explanation: "Đảo lệnh gửi Kafka lên trước lệnh Commit DB không hề giải quyết được bài toán Dual-Write mà biến rủi ro 'mất sự kiện' thành rủi ro còn đáng sợ hơn trong ngân hàng là 'phát sự kiện khống khi DB Rollback', đồng thời giữ kết nối DB mở trong lúc chờ I/O mạng làm nghẽn Connection Pool. Chỉ có Transactional Outbox mới gắn kết cả hai vào chung một lệnh Commit nguyên tử.",
        wrongReasons: [
          "Hoàn toàn sai vì Kafka không nằm chung giao dịch cục bộ của PostgreSQL nên không thể quay lui khi DB Rollback.",
          "",
          "Không hề nhất quán khi xảy ra lỗi ràng buộc dữ liệu, hết hạn mức đồng thời hoặc rớt kết nối DB ngay thời điểm commit.",
          "PostgreSQL hoàn toàn không biết sự tồn tại của Kafka và bản chất Commit Log của Kafka cũng là bất biến, không có chuyện DB tự gọi xóa bản ghi trên Kafka."
        ]
      },
      {
        question: "Ngân hàng triển khai Outbox Relay gồm 3 Pods chạy song song quét bảng `outbox_events` trên PostgreSQL mỗi 200ms để đẩy lên Kafka, và dịch vụ nhận đã cài đặt bảng `inbox_events (event_id PRIMARY KEY)`. Câu truy vấn quét Outbox nào tối ưu nhất để 3 Pods chia tải mượt mà không khóa chéo nhau?",
        options: [
          "`LOCK TABLE outbox_events IN ACCESS EXCLUSIVE MODE;` trước mỗi lần đọc để khóa cứng cả bảng giao dịch.",
          "`SELECT * FROM outbox_events WHERE status = 'NEW' ORDER BY id ASC LIMIT 200 FOR UPDATE SKIP LOCKED;` đi kèm Partial Index trên `(id) WHERE status = 'NEW'`.",
          "`SELECT * FROM outbox_events;` đọc toàn bộ 20 triệu dòng lịch sử lên RAM của cả 3 Pods rồi lọc bằng Java Stream.",
          "Không đánh bất kỳ Index nào trên bảng `outbox_events` và để 3 Pods chạy cùng câu `SELECT` thường không khóa để cùng gửi mọi sự kiện lặp lại 3 lần."
        ],
        answer: 1,
        explanation: "`FOR UPDATE SKIP LOCKED` cho phép Pod 1 khóa lô 200 dòng đầu tiên trong khi Pod 2 chạy ngay mili-giây sau tự động nhảy qua 200 dòng đang khóa đó để bốc ngay 200 dòng tiếp theo (201..400) mà không phải đứng chờ khóa, kết hợp Partial Index `WHERE status = 'NEW'` giúp câu truy vấn luôn cực nhẹ dù bảng có hàng chục triệu dòng lịch sử.",
        wrongReasons: [
          "`ACCESS EXCLUSIVE MODE` khóa cứng toàn bộ bảng, chặn đứng cả luồng khách hàng đang chuyển tiền cần `INSERT` vào `outbox_events`!",
          "",
          "Đọc toàn bộ 20 triệu dòng lên RAM mỗi 200ms sẽ đánh sập cả Database lẫn gây `OutOfMemoryError` trên cả 3 Pods ngay lập tức.",
          "Thiếu Index gây Full Table Scan liên tục và việc cố tình để 3 Pods luôn gửi trùng gấp 3 lần mọi bản tin gây lãng phí băng thông mạng cũng như tài nguyên không cần thiết."
        ]
      }
    ]
  },

  M4: {
    duration: "70 phút",
    difficulty: "Senior / Principal Architect",
    codeLang: "java",
    teacherIntro: "Chào bạn, hãy đặt mình vào ghế Kiến trúc sư trưởng thiết kế luồng **Thanh toán Hóa đơn Điện lực / Nạp tiền Chứng khoán** đi qua 3 hệ thống độc lập: `Core-Ledger` (giữ tiền khách hàng), `Partner-Gateway` (gọi sang tổng công ty Điện lực gạch nợ mã khách hàng `PD12008899`), và `Notification/Loyalty`. Nếu làm kiểu cũ một cục Monolith thì chỉ một `@Transactional` là xong, nhưng giờ đây Điện lực là đối tác bên ngoài ngân hàng, còn `Core-Ledger` và `Partner-Gateway` là hai microservices chạy trên hai Database tách rời! Hồi mới làm nghề, từng có đội kỹ thuật cứ trừ thẳng tiền tài khoản khách hàng trước, sau đó gọi sang nhà cung cấp hóa đơn bị trả về lỗi 'Mã hóa đơn đã thanh toán ở kênh khác'; lúc code hàm hoàn tiền lại gặp lỗi mạng nên tiền khách bị trừ mất mà hóa đơn không gạch, sinh ra hàng trăm biên bản tra soát tay mỗi tuần! Tệ hơn nữa, có bạn lập trình viên hiểu nhầm 'Bù trừ (Compensation)' nghĩa là chạy câu lệnh `DELETE FROM ledger_entries WHERE txn_id = ...` xóa thẳng dòng bút toán cũ trong sổ cái — vi phạm điều cấm kỵ số 1 của Luật Kế toán Ngân hàng! Trong bài M4 hôm nay, anh sẽ hướng dẫn bạn thiết kế **Saga Orchestrator State Machine**, kỹ thuật **Semantic Lock (Khoanh giữ tiền HOLD)** và nguyên tắc sinh **Bút toán Bù trừ Đảo chiều bất biến** chuẩn Core Banking.",
    analogy: {
      title: "Người Quản gia Điều phối Đặt Chuyến Công tác Quốc tế (Orchestration vs Choreography)",
      body: "Giả sử bạn cần đặt trọn gói một chuyến công tác gồm: (1) Khoanh hạn mức thẻ ngân hàng, (2) Xuất vé máy bay khứ hồi, và (3) Đặt phòng khách sạn 5 sao; nếu một khâu hỏng phải hủy gọn gàng cả chuyến. Nếu làm theo kiểu **Choreography (Vũ đạo tự phát không nhạc trưởng)**: phòng vé máy bay đặt xong tự nhắn cho khách sạn, khách sạn hết phòng lại phải biết đường nhắn ngược về phòng vé, phòng vé lại nhắn về ngân hàng... khi quy trình lên tới 6–7 bước, cả đám rối tung như mạng nhện không ai biết hồ sơ của bạn đang kẹt ở đâu! Ngược lại, **Orchestration (Nhạc trưởng / Quản gia chuyên trách)** cử ra một người Quản gia cầm cuốn Sổ Theo Dõi Trạng Thái (`saga_instances`): Bước 1 quản gia yêu cầu ngân hàng 'Khoanh giữ tạm 20 triệu' (Semantic Lock / Hold — tiền chưa bay khỏi tài khoản nhưng khách không tiêu trùng được); Bước 2 gọi hãng bay; Bước 3 gọi khách sạn. Nếu khách sạn báo hết phòng, người Quản gia nhìn vào sổ biết chính xác phải phát lệnh hủy vé máy bay rồi phát lệnh 'Giải tỏa khoản giữ 20 triệu' với đầy đủ chứng từ đối chiếu từ đầu đến cuối!"
    },
    objectives: [
      "Giải thích thuyết phục vì sao kiến trúc ngân hàng hiện đại loại bỏ giao thức khóa 2 pha (2PC/XA) để chuyển sang Saga Pattern, và lựa chọn chính xác giữa Choreography với Orchestration.",
      "Áp dụng kỹ thuật Semantic Lock (`HOLD` / Khoanh giữ số dư khả dụng) để khắc phục điểm yếu thiếu tính Cô lập (Isolation) của Saga, ngăn chặn triệt để lỗi rút/tiêu trùng tiền khi giao dịch đang bay.",
      "Thiết kế Máy trạng thái Saga bền vững (`Saga Orchestrator`) phân biệt rạch ròi 3 nhánh kết cục: Thành công tất toán (`CAPTURE`), Thất bại rõ ràng sinh bút toán đảo chiều (`COMPENSATE`), và Chưa rõ trạng thái treo đối soát (`SUSPENSE`)."
    ],
    flow: [
      {
        step: "1. Saga Initialization & Semantic Lock (Tạo Saga & Khoanh giữ tiền HOLD)",
        detail: "Orchestrator khởi tạo bản ghi `saga_instances` ở trạng thái `STARTED`, gửi lệnh sang `Core-Ledger` khoanh giữ (`HOLD`) số tiền thanh toán — giảm ngay `available_balance` của khách trong khi `ledger_balance` chưa chuyển đi."
      },
      {
        step: "2. Pivot External Execution (Thực thi Bước Bản lề tại Đối tác)",
        detail: "Sau khi `HOLD` thành công (chuyển sang `FUNDS_HELD`), Orchestrator gọi `Partner-Gateway` kèm `idempotencyKey = sagaId` để gạch nợ hóa đơn bên nhà cung cấp dịch vụ."
      },
      {
        step: "3A. Forward Completion - Capture Hold (Tất toán Cắt tiền thật)",
        detail: "Nếu đối tác phản hồi gạch nợ THÀNH CÔNG (`00`), Orchestrator chuyển sang `CAPTURING` và lệnh cho `Core-Ledger` cắt khoản `HOLD` hạch toán Nợ tài khoản khách / Có tài khoản trung gian thanh toán đối tác -> `COMPLETED`."
      },
      {
        step: "3B/3C. Compensation vs Suspense (Giải tỏa Hoàn giữ hoặc Treo Đối soát)",
        detail: "Nếu đối tác trả mã TỪ CHỐI RÕ RÀNG (mã hóa đơn sai, hết hạn), Orchestrator chạy nhánh bù trừ `COMPENSATING` phát bút toán giải tỏa `HOLD` trả lại `available_balance` ngay lập tức; nhưng nếu bị `ReadTimeout` chưa rõ đối tác đã gạch nợ hay chưa, bắt buộc chuyển sang `PENDING_RECONCILIATION`!"
      }
    ],
    sections: [
      {
        heading: "1. Vì sao Từ bỏ 2PC/XA và Cuộc đối đầu giữa Choreography vs Orchestration",
        paragraphs: [
          "Trong sách giáo khoa cơ sở dữ liệu cổ điển, giao dịch phân tán dùng giao thức **Two-Phase Commit (2PC / XA)**: pha 1 Coordinator hỏi tất cả các nút `PREPARE` (khóa chặt các dòng dữ liệu liên quan), pha 2 mới gửi lệnh `COMMIT`. Trong thực tế ngân hàng hiện đại có tải hàng nghìn TPS và tích hợp đối tác bên ngoài, 2PC chết yểu vì 3 lý do chí mạng: (1) Đối tác bên ngoài (NAPAS, Điện lực, Visa) giao tiếp qua REST/ISO 8583 không bao giờ mở khóa DB nội bộ của họ cho ngân hàng bạn điều khiển qua XA; (2) Khóa dòng dữ liệu phải giữ nguyên trong suốt thời gian chờ mạng qua nhiều dịch vụ khiến tài khoản tổng (GL Account) của ngân hàng bị nghẽn cứng hoàn toàn; và (3) Nếu Coordinator sập đúng giữa pha 1 và pha 2, các bản ghi rơi vào trạng thái khóa treo lơ lửng (`In-doubt Transaction`). Vì vậy, toàn ngành tài chính chuyển sang **Saga Pattern**: chuỗi các giao dịch cục bộ ngắn gọn (Local ACID Transactions), mỗi bước commit xong giải phóng khóa DB ngay trong vài mili-giây, nếu bước sau thất bại thì chạy các **Giao dịch Bù trừ (Compensating Transactions)** theo chiều ngược lại.",
          "Khi triển khai Saga, nhiều đội mới làm chọn **Choreography** (dịch vụ A phát sự kiện X, B nghe X làm việc rồi phát sự kiện Y, C nghe Y...) vì thấy không phải viết dịch vụ điều phối trung tâm. Choreography chỉ đẹp khi luồng có đúng 2 bước đơn giản (ví dụ: Chuyển tiền xong -> Gửi thông báo). Khi luồng thanh toán có từ 3–6 bước kèm rẽ nhánh điều kiện và bù trừ ngược, Choreography biến thành mê cung sự kiện vòng tròn (Cyclic Dependency), cực kỳ khó trả lời câu hỏi của vận hành: 'Đang có bao nhiêu giao dịch bị kẹt ở bước gọi Điện lực quá 30 giây?'. Trong Core Payment Ngân hàng, **Saga Orchestration (Điều phối tập trung qua State Machine lưu bền vững trong DB)** luôn là lựa chọn chuẩn mực: toàn bộ luồng nghiệp vụ nằm rõ ràng ở một chỗ, truy vấn bảng `saga_instances` một câu SQL là thấy ngay bức tranh toàn cảnh từng giao dịch đang ở bước nào và tự động có Worker quét các Saga bị kẹt quá hạn để đẩy tiếp (Recovery)."
        ],
        bullets: [
          "Orchestrator KHÔNG có nghĩa là điểm nghẽn đồng bộ: Một Saga Orchestrator chuẩn sử dụng giao tiếp bất đồng bộ qua Kafka (gửi Command topic -> nhận Reply topic qua Outbox) hoặc thực thi từng bước ngắn và lưu trạng thái xuống DB sau mỗi chặng.",
          "Tránh nhồi logic chi tiết của miền con vào Orchestrator: Orchestrator chỉ biết quy trình điều phối ('Bước 1 giữ tiền -> Bước 2 gạch nợ -> Bước 3 cắt tiền'), còn quy tắc kế toán chi tiết Nợ/Có tài khoản nào vẫn thuộc trọn vẹn quyền tự chủ của `Core-Ledger`.",
          "Mọi bước trong Saga đều phải gắn `sagaId` + `stepName` làm `Idempotency-Key` để khi Orchestrator khởi động lại sau sự cố và gửi lại lệnh đang dở không bao giờ gây trừ tiền hay gạch nợ hai lần."
        ]
      },
      {
        heading: "2. Lỗ hổng Thiếu tính Cô lập (ACD mà thiếu I) trong Saga & Vũ khí Semantic Lock (HOLD)",
        paragraphs: [
          "Điểm khác biệt sâu sắc nhất giữa ACID truyền thống và Saga mà mọi Senior Architect phải nắm rõ là: **Saga chỉ đảm bảo A-C-D (Atomicity qua bù trừ, Consistency cuối cùng, Durability), nhưng KHÔNG có tính Isolation (Cô lập) tự nhiên!** Vì mỗi bước con của Saga đều `COMMIT` ngay xuống cơ sở dữ liệu cục bộ trước khi toàn bộ Saga kết thúc, các giao dịch khác chạy song song hoàn toàn nhìn thấy ngay kết quả trung gian chưa chốt đó — sinh ra 3 dị thường kinh điển là *Lost Updates*, *Dirty Reads* và *Fuzzy Reads*. Hãy xem thảm họa nếu không có biện pháp phòng vệ: khách có 10 triệu, bấm hoàn hủy một giao dịch mua vé 10 triệu chưa rõ kết quả; nếu bước 1 bạn cộng trả ngay 10 triệu thật vào số dư, 1 giây sau khách rút sạch 10 triệu đó ở cây ATM, rồi bước 2 hãng vé báo 'Vé đã bay rồi, từ chối hủy!' -> lúc bạn quay lại đòi bù trừ trừ lại 10 triệu thì tài khoản khách đã bằng `0`!",
          "Để tự tạo lại lớp vỏ Cô lập an toàn về mặt nghiệp vụ trong ngân hàng, chúng ta sử dụng đối sách **Semantic Lock (Khóa ngữ nghĩa nghiệp vụ)**, biểu hiện cụ thể nhất ở Sổ Cái là cơ chế **Tách bạch Số dư Sổ cái (`ledger_balance`) và Số dư Khả dụng (`available_balance`) thông qua khoản Phong tỏa tạm (`held_amount`)**. Khi bắt đầu Saga thanh toán hóa đơn 5 triệu trên tài khoản đang có 12 triệu: Bước 1 (`HOLD_FUNDS`) chưa hề chuyển 5 triệu đi đâu cả (`ledger_balance` vẫn là 12 triệu), nhưng tăng `held_amount` thêm 5 triệu làm `available_balance` giảm ngay xuống 7 triệu kèm bản ghi `account_holds(hold_id, saga_id, amount, status='ACTIVE')`. Nếu khách cố tình mở tab thứ hai rút 10 triệu tại ATM, hệ thống kiểm tra `available_balance (7M) < 10M` sẽ chặn đứng ngay lập tức! Đến khi đối tác gạch nợ thành công mới chuyển `HOLD -> CAPTURED` (trừ `ledger_balance` thật); nếu đối tác từ chối rõ ràng thì chuyển `HOLD -> RELEASED` khôi phục `available_balance` an toàn 100%."
        ],
        bullets: [
          "Luôn đặt thời hạn hết hạn kiểm soát (`expires_at`) cho khoản `HOLD` kèm Job rà soát: Ngăn chặn trường hợp lỗi luồng hiếm gặp làm một khoản tiền của khách bị khoanh giữ treo vĩnh viễn không được đối soát giải tỏa.",
          "Trạng thái trung gian tường minh trên giao diện: Hiển thị rõ cho khách hàng 'Giao dịch đang xử lý - Số tiền đang tạm giữ: 5.000.000đ' để minh bạch trải nghiệm và tránh khách bấm thực hiện lại lệnh mới.",
          "Thứ tự sắp xếp các bước trong Saga (Risk Ordering): Luôn đặt các bước kiểm tra điều kiện và khóa tài nguyên dễ thất bại/dễ hoàn trả nhất (như kiểm tra hạn mức, khoanh giữ tiền nội bộ ngân hàng) LÊN TRƯỚC bước gọi ra đối tác bên ngoài khó đảo ngược (Pivot Step)."
        ]
      },
      {
        heading: "3. Ba Quy luật Bất biến khi Thiết kế Giao dịch Bù trừ (Compensating Transaction) Ngành Ngân hàng",
        paragraphs: [
          "Trong bài kiểm tra thiết kế hệ thống ngân hàng, bất kỳ ai viết câu lệnh `DELETE FROM ledger_entries` hoặc `UPDATE ledger_entries SET amount = 0` trong hàm bù trừ Saga đều bị đánh trượt thẳng tay! Quy luật số 1: **Sổ cái ngân hàng là Bất biến (Append-only Immutable Ledger)**; giao dịch bù trừ về mặt kỹ thuật là một giao dịch tiến về phía trước mới (Forward Accounting Entry) mang dấu ngược lại — ví dụ giao dịch gốc ghi `Nợ TK Khách 5M / Có TK Trung gian 5M` với mã `TXN-100`, thì khi bù trừ phải sinh bản ghi mới `Nợ TK Trung gian 5M / Có TK Khách 5M` có cột `reversal_of_txn_id = 'TXN-100'` và lý do `'REVERSAL_PARTNER_REJECTED'`. Cả dấu vết trừ lẫn dấu vết hoàn đều phải hiển thị minh bạch cho kiểm toán nội bộ và Ngân hàng Nhà nước đối chiếu.",
          "Quy luật số 2: **Bước bù trừ và Bước sau điểm bản lề (Post-Pivot Steps) không được phép bỏ cuộc giữa chừng!** Nếu đối tác đã từ chối hóa đơn và Saga chuyển sang trạng thái `COMPENSATING` để giải tỏa tiền cho khách mà đúng lúc đó `Core-Ledger` đang bảo trì 10 giây, Orchestrator phải lưu trạng thái `COMPENSATING` và tự động thử lại (Forward Retry) cho đến khi giải tỏa thành công (hoặc đẩy cảnh báo mức P1 lên màn hình vận hành nếu vượt ngưỡng). Quy luật số 3 — sống còn nhất để không mất tiền ngân hàng: **Chỉ được tự động chạy nhánh Bù trừ Hoàn tiền khi nhận được kết quả THẤT BẠI XÁC ĐỊNH (Definite Negative Response)** từ đối tác (ví dụ đối tác phản hồi HTTP 200/422 kèm mã nghiệp vụ `BILL_NOT_FOUND`, `INVALID_ACCOUNT`). Nếu lời gọi sang đối tác bị `ReadTimeout` / đứt kết nối giữa chừng (trạng thái **UNKNOWN** — có thể đối tác đã gạch nợ điện xong rồi chỉ rớt gói trả về!), tuyệt đối KHÔNG tự động giải tỏa tiền ngay mà phải chuyển Saga sang `SUSPENSE_PENDING_INQUIRY` để gọi API tra vấn trạng thái (`Status Inquiry`) hoặc chờ phiên Đối soát T+0/T+1 quyết định!"
        ],
        bullets: [
          "Phân loại 3 nhóm bước của một Saga: (1) *Compensatable Transactions* (nằm trước bước bản lề, có hàm đảo chiều rõ ràng như `HoldFunds`), (2) *Pivot Transaction* (bước quyết định thành bại của toàn Saga như `PayPartnerBill`), và (3) *Retriable Transactions* (nằm sau bước bản lề, chắc chắn phải chạy tới đích như `CaptureHold`, `SendReceipt`).",
          "Xử lý gói tin Bù trừ đến trước gói tin Gốc (Out-of-order Reversal): Trong môi trường mạng phân tán hoặc chuẩn thẻ ISO 8583 (`0420 Reversal` đến trước `0200` bị nghẽn), dịch vụ Ledger cần ghi nhận trước lệnh hủy/đảo vào bảng đánh dấu để nếu gói tin gốc đến muộn ngay sau đó sẽ bị từ chối ngay tại cửa.",
          "Audit đầy đủ lịch sử chuyển trạng thái Saga (`saga_step_logs`): Lưu lại thời điểm, đầu vào, đầu ra và mã lỗi của từng bước để đội Vận hành tra cứu trong tích tắc."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Chiến lược Điều phối Giao dịch Liên Dịch vụ trong Hệ thống Tài chính",
      headers: ["Chiến lược Giao dịch", "Cơ chế Khóa & Nhất quán", "Khả năng Quan sát & Phục hồi lỗi", "Ứng dụng Thực tế trong Ngân hàng"],
      rows: [
        [
          "2PC / XA Distributed Transaction",
          "Nhất quán tức thì (Strong Consistency); giữ khóa vật lý DB qua mạng cho tới khi tất cả cùng Commit",
          "Dễ treo khóa toàn cục nếu Coordinator sập; không tích hợp được đối tác REST bên ngoài",
          "Hầu như đã loại bỏ khỏi các hệ thống Microservices thanh toán trực tuyến tải cao"
        ],
        [
          "Saga Choreography (Chuỗi sự kiện nối đuôi)",
          "Nhất quán cuối cùng (Eventual); không có bộ điều phối trung tâm",
          "Khó theo dõi luồng dài > 3 bước; dễ phát sinh phụ thuộc vòng tròn giữa các nhóm phát triển",
          "Phù hợp luồng 2 chặng đơn giản một chiều: Giao dịch thành công -> Gửi SMS / Cộng điểm thưởng"
        ],
        [
          "Saga Orchestration (State Machine tập trung)",
          "Nhất quán cuối cùng có kiểm soát chặt chẽ từng bước qua bảng `saga_instances`",
          "Rất cao: biết chính xác từng giao dịch đang ở bước nào, dễ viết Worker phục hồi giao dịch treo",
          "Chuẩn mực cho Chuyển tiền liên ngân hàng, Thanh toán hóa đơn, Giải ngân khoản vay số, Mở thẻ"
        ],
        [
          "Saga Orchestration + Semantic Lock (`HOLD / CAPTURE / RELEASE`)",
          "Bổ sung lớp Cô lập nghiệp vụ chống tiêu trùng số dư ngay trong lúc Saga đang chạy",
          "An toàn tài chính tuyệt đối; tách bạch rõ nhánh Hoàn giữ tự động và nhánh Treo tra soát Timeout",
          "Mô hình vàng của Core Payment Hub & Ví điện tử chuẩn Production hiện nay"
        ]
      ]
    },
    codeTitle: "Saga Orchestrator Thanh toán Hóa đơn: Hold Tiền -> Gọi Đối tác -> Capture / Compensate / Suspense",
    code: [
      "package vn.finbank.payment.saga;",
      "import org.springframework.stereotype.Service;",
      "import java.math.BigDecimal;",
      "import java.util.UUID;",
      "",
      "@Service",
      "public class BillPaymentSagaOrchestrator {",
      "    private final SagaRepository sagaRepo;",
      "    private final LedgerGrpcClient ledgerClient;",
      "    private final BillPartnerClient partnerClient;",
      "",
      "    public BillPaymentSagaOrchestrator(SagaRepository s, LedgerGrpcClient l, BillPartnerClient p) {",
      "        this.sagaRepo = s; this.ledgerClient = l; this.partnerClient = p;",
      "    }",
      "",
      "    public SagaResult executeBillPayment(String accountNo, String billCode, BigDecimal amount) {",
      "        UUID sagaId = UUID.randomUUID();",
      "        SagaInstance saga = sagaRepo.save(SagaInstance.start(sagaId, accountNo, billCode, amount));",
      "        // BƯỚC 1 (Compensatable): Semantic Lock - Khoanh giữ số dư khả dụng trên Sổ cái",
      "        HoldReceipt hold = ledgerClient.placeHold(sagaId.toString(), accountNo, amount);",
      "        if (!hold.accepted()) return sagaRepo.markFailed(saga, \"INSUFFICIENT_AVAILABLE_BALANCE\");",
      "        saga = sagaRepo.advance(saga, SagaState.FUNDS_HELD, hold.holdId());",
      "",
      "        // BƯỚC 2 (Pivot Step): Gọi nhà cung cấp gạch nợ hóa đơn (ngoài @Transactional DB!)",
      "        PartnerOutcome outcome = partnerClient.settleBill(sagaId.toString(), billCode, amount);",
      "",
      "        // BƯỚC 3: Rẽ nhánh nghiêm ngặt theo 3 trạng thái kết cục tài chính",
      "        return switch (outcome.status()) {",
      "            case SUCCESS -> {",
      "                ledgerClient.captureHoldToPartnerGl(sagaId + \":CAPTURE\", hold.holdId(), outcome.ref());",
      "                yield sagaRepo.markCompleted(saga, outcome.ref());",
      "            }",
      "            case DEFINITE_REJECT -> { // Đối tác xác nhận CHƯA gạch nợ -> Bù trừ giải tỏa Hold!",
      "                sagaRepo.advance(saga, SagaState.COMPENSATING, hold.holdId());",
      "                ledgerClient.releaseHoldCompensate(sagaId + \":RELEASE\", hold.holdId(), outcome.errorCode());",
      "                yield sagaRepo.markCompensated(saga, outcome.errorCode());",
      "            }",
      "            case UNKNOWN_TIMEOUT -> // ReadTimeout! CẤM tự giải tỏa tiền, treo chờ Tra vấn / Đối soát!",
      "                sagaRepo.markPendingReconciliation(saga, \"PARTNER_READ_TIMEOUT_SUSPENSE\");",
      "        };",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Hàm `executeBillPayment` cố ý KHÔNG bọc `@Transactional` ở tầng ngoài cùng vì bên trong có các lời gọi mạng `ledgerClient` và `partnerClient`; mỗi lệnh `sagaRepo.save/advance/mark...` tự commit một giao dịch DB cục bộ cực ngắn (1–2ms) để ghi bền vững dấu mốc trạng thái trước và sau mỗi chặng.",
      "Mỗi lệnh gọi sang `Core-Ledger` và `BillPartnerClient` đều truyền khóa lũy đẳng dẫn xuất từ `sagaId` (`sagaId.toString()`, `sagaId + \":CAPTURE\"`, `sagaId + \":RELEASE\"`) để nếu tiến trình Recovery chạy lại bước đang dở cũng không bao giờ giữ tiền đúp hay cắt tiền đúp.",
      "Điểm ăn tiền Senior nhất nằm ở `switch (outcome.status())` tách biệt 3 nhánh: `SUCCESS` (cắt tiền thật sang tài khoản GL đối tác), `DEFINITE_REJECT` (sinh bút toán đảo giải tỏa khoản Hold trả ngay số dư khả dụng cho khách), và `UNKNOWN_TIMEOUT` (giữ nguyên khoản Hold/chuyển Suspense chờ Job `Status Inquiry` hỏi lại đối tác).",
      "Bên trong `ledgerClient.releaseHoldCompensate(...)`, Core Ledger không xóa dòng Hold cũ mà cập nhật trạng thái Hold sang `RELEASED` đồng thời ghi thêm dòng nhật ký giải tỏa bất biến phục vụ kiểm toán."
    ],
    labGuide: {
      goal: "Xây dựng và kiểm thử đủ 3 kịch bản kết cục của `BillPaymentSagaOrchestrator` (Thành công, Đối tác từ chối rõ ràng, và Đối tác ReadTimeout) cùng 1 Worker phục hồi giao dịch treo.",
      steps: [
        "Bước 1: Tạo bảng `accounts(account_no, ledger_balance, held_amount)` với ràng buộc `CHECK (ledger_balance - held_amount >= 0)` và bảng `saga_instances` lưu tiến trình State Machine.",
        "Bước 2: Giả lập dịch vụ Nhà cung cấp Điện lực bằng WireMock với 3 mã hóa đơn test: `EVN-OK` (trả 200 thành công), `EVN-PAID` (trả 422 hóa đơn đã gạch trước đó), và `EVN-SLOW` (delay 10 giây gây ReadTimeout sau 3s).",
        "Bước 3: Gọi API thanh toán lần lượt cho 3 mã hóa đơn trên một tài khoản có `ledger_balance = 10.000.000đ` (mỗi hóa đơn `3.000.000đ`), kiểm tra biến động của `ledger_balance` và `held_amount` sau từng lần gọi.",
        "Bước 4: Viết một Scheduled Recovery Job quét các Saga có trạng thái `PENDING_RECONCILIATION`, gọi API tra vấn trạng thái giao dịch (`GET /partner/txns/{sagaId}`) để tự động chốt về `COMPLETED` hoặc `COMPENSATED`."
      ],
      expectedOutput: "Với `EVN-OK`: `ledger_balance` giảm 3M, `held_amount = 0`, Saga `COMPLETED`. Với `EVN-PAID`: `held_amount` tăng lên 3M rồi lập tức được giải tỏa về `0`, khách lấy lại đủ tiền khả dụng ngay tức thì, Saga `COMPENSATED`. Với `EVN-SLOW`: 3M vẫn được giữ an toàn trong `held_amount`, Saga ở `PENDING_RECONCILIATION` cho đến khi Job tra vấn xác nhận kết quả thật từ đối tác."
    },
    examTips: [
      "Khi hội đồng phỏng vấn hỏi 'Bù trừ (Compensation) trong Saga khác gì Rollback trong ACID Database?', hãy nhấn mạnh 3 ý: (1) Rollback quay ngược thời gian như chưa từng có gì xảy ra, còn Compensation xảy ra SAU KHI dữ liệu bước trước đã hiển thị ra ngoài (thiếu Isolation); (2) Compensation là một bút toán nghiệp vụ đảo chiều mới (Append-only), không xóa lịch sử cũ; và (3) Phải dùng Semantic Lock (`HOLD`) để chặn người khác tiêu mất tiền trong khoảng thời gian ở giữa.",
      "Tuyệt đối không đặt bước 'Không thể đảo ngược' (như phát lệnh chuyển tiền liên ngân hàng thật ra khỏi cổng NAPAS hoặc in tiền mặt ở cây ATM) ở Bước 1 của Saga trước khi hoàn tất kiểm tra và giữ tiền nội bộ!",
      "Với quy trình có > 3 dịch vụ tham gia hoặc có rẽ nhánh lỗi phức tạp trong ngân hàng, luôn chọn **Saga Orchestration** thay vì Choreography để đảm bảo khả năng kiểm toán và vận hành sự cố."
    ],
    summaryTakeaways: [
      "Saga thay thế khóa 2 pha (2PC/XA) bằng chuỗi các giao dịch cục bộ tốc độ cao đi kèm các giao dịch bù trừ ngược chiều khi phát sinh lỗi nghiệp vụ.",
      "Saga Orchestration lưu vết rõ ràng từng bước trên bảng trạng thái tập trung, vượt trội hoàn toàn so với Choreography về khả năng giám sát, gỡ lỗi và phục hồi tự động trong ngân hàng.",
      "Sử dụng Semantic Lock (`HOLD` trừ vào `available_balance`) là chìa khóa vàng tái lập tính Cô lập nghiệp vụ, chặn đứng lỗi tiêu trùng tiền khi giao dịch phân tán đang xử lý.",
      "Bù trừ kế toán luôn là bút toán đảo chiều mới bất biến (không bao giờ `DELETE`), và chỉ được tự động kích hoạt khi có phản hồi thất bại xác định — còn `Timeout` phải chuyển sang luồng Tra vấn / Đối soát."
    ],
    lessonQuestions: [
      {
        question: "Trong luồng Saga chuyển tiền liên ngân hàng, Bước 1 đã khoanh giữ/trừ tạm 50 triệu VNĐ của khách hàng A thành công, Bước 2 gửi yêu cầu hạch toán sang cổng chuyển mạch liên ngân hàng nhưng bị lỗi `SocketTimeoutException` sau 15 giây chờ phản hồi. Hành động xử lý nào của Saga Orchestrator là ĐÚNG CHUẨN an toàn ngân hàng?",
        options: [
          "Lập tức chạy ngay giao dịch bù trừ cộng hoàn lại 50 triệu VNĐ khả dụng cho khách hàng A để khách rút tiền tiêu ngay cho hài lòng.",
          "Chạy lệnh `DELETE` xóa bỏ cả bản ghi Saga lẫn bản ghi giữ tiền khỏi cơ sở dữ liệu rồi báo hệ thống bận.",
          "Giữ nguyên khoản khoanh giữ/treo ở tài khoản trung gian (Suspense), chuyển trạng thái Saga sang `PENDING_INQUIRY / PENDING_RECONCILIATION`, thông báo cho khách 'Giao dịch đang chờ ngân hàng thụ hưởng xác nhận' và kích hoạt tiến trình Tra vấn trạng thái giao dịch / Đối soát trước khi quyết định tất toán hay hoàn tiền.",
          "Tự động gửi lặp lại lệnh chuyển tiền mới với một mã `transactionId` ngẫu nhiên hoàn toàn mới thêm 5 lần nữa."
        ],
        answer: 2,
        explanation: "Lỗi `SocketTimeoutException` (Read Timeout) mang ý nghĩa trạng thái **UNKNOWN**: gói tin yêu cầu rất có thể đã đi qua cổng chuyển mạch và ngân hàng bạn ĐÃ cộng 50 triệu cho người nhận, chỉ có gói phản hồi quay về bị đứt mạng! Nếu tự ý hoàn ngay 50 triệu cho người gửi, kẻ gian/khách hàng rút sạch tiền trong khi đầu bên kia cũng nhận được 50 triệu -> ngân hàng mất trắng 50 triệu. Bắt buộc treo giao dịch và chạy nghiệp vụ Tra vấn (Status Inquiry) hoặc Đối soát T+0/T+1.",
        wrongReasons: [
          "Tự động hoàn tiền ngay khi gặp ReadTimeout là lỗi nghiệp vụ nghiêm trọng bậc nhất gây thất thoát tiền kép (Double-spend / Loss of funds) cho ngân hàng.",
          "Xóa dấu vết giao dịch đang lơ lửng làm mất hoàn toàn căn cứ đối soát và vi phạm nghiêm trọng nguyên tắc toàn vẹn sổ cái.",
          "",
          "Sinh mã `transactionId` mới tinh để gửi lại một giao dịch có thể đã thành công ở lần đầu sẽ khiến người nhận được cộng tiền gấp 5–6 lần!"
        ]
      },
      {
        question: "Khi triển khai giao dịch bù trừ (Compensating Transaction) cho một bút toán đã hạch toán `Nợ TK Khách hàng 10.000.000đ / Có TK Trung gian 10.000.000đ` do đối tác báo hủy đơn hàng hợp lệ, hệ thống Sổ cái (`Core-Ledger`) phải thực hiện thao tác dữ liệu nào?",
        options: [
          "Chạy câu lệnh `DELETE FROM ledger_postings WHERE journal_id = :originalId` để dọn sạch sổ như chưa từng giao dịch.",
          "Chạy câu lệnh `UPDATE ledger_postings SET amount = 0 WHERE journal_id = :originalId`.",
          "Giữ nguyên bất biến bút toán gốc và ghi thêm một bút toán đảo chiều mới (`Nợ TK Trung gian 10.000.000đ / Có TK Khách hàng 10.000.000đ`) có trường tham chiếu `reversal_of_journal_id = :originalId` kèm khóa chống trùng lặp cho lệnh bù trừ.",
          "Chỉ sửa trực tiếp con số trong cột `accounts.balance` cộng thêm 10 triệu mà không cần ghi vào bảng bút toán sổ cái."
        ],
        answer: 2,
        explanation: "Theo nguyên chuẩn Kế toán Kép Ngân hàng (Double-Entry Immutable Ledger), mọi bút toán đã ghi sổ không bao giờ được sửa hoặc xóa. Việc hoàn/hủy bắt buộc phải được thực hiện thông qua một bút toán đảo chiều mới cân bằng Nợ = Có và liên kết chặt chẽ tới mã chứng từ gốc để đảm bảo tính minh bạch kiểm toán (Audit Trail).",
        wrongReasons: [
          "Xóa bút toán đã hạch toán phá hủy lịch sử kiểm toán, làm lệch số thứ tự chứng từ và vi phạm quy định kế toán ngân hàng.",
          "Cập nhật đè số tiền về 0 làm sai lệch lịch sử biến động theo thời điểm và hủy hoại tính bất biến của sổ cái.",
          "",
          "Sửa thẳng cột `balance` mà không sinh dòng bút toán tương ứng sẽ làm tổng cộng các bút toán lịch sử không khớp với số dư hiện tại (Lệch sổ cái nghiêm trọng)."
        ]
      }
    ]
  },

  M5: {
    duration: "65 phút",
    difficulty: "Senior / Reliability Engineering",
    codeLang: "java",
    teacherIntro: "Chào bạn, trong ngành Ngân hàng Số, câu hỏi không phải là 'Đối tác bên ngoài có bao giờ bị treo không?', mà là '**Khi đối tác bị treo lúc 10 giờ sáng, App Ngân hàng của bạn sống khỏe hay chết chùm theo họ?**'. Anh từng chứng kiến một sự cố kinh điển: ứng dụng Mobile Banking tích hợp 18 đối tác tiện ích (mua bảo hiểm, nạp tiền điện thoại, đặt vé tàu, nộp tiền chứng khoán...). Sáng hôm đó, hệ thống DB của một đối tác Bảo hiểm nhỏ (chỉ chiếm chưa tới 0,5% doanh thu giao dịch!) bị khóa bảng khiến API của họ không chết hẳn mà trả lời chậm rề rề mất 35 giây mỗi request. Vì đội phát triển dùng chung một Tomcat Thread Pool 200 luồng và chung một `HttpClient` không có vách ngăn cô lập, chỉ trong vòng đúng 22 giây, 200 khách hàng bấm xem phí bảo hiểm đã chiếm gọn cả 200 luồng của dịch vụ cổng! Hậu quả: 99,5% khách hàng còn lại vào Xem số dư, Chuyển tiền VietQR, Mở tiết kiệm đều bị quay vòng tròn trắng màn hình — **một tính năng phụ 0,5% kéo sập hoàn toàn 100% ngân hàng (Cascading Failure)!** Hôm nay, chúng ta sẽ làm chủ bộ giáp chống đạn **Resilience4j** gồm **Bulkhead, Circuit Breaker, TimeLimiter và Retry**, đặc biệt là những ranh giới an toàn tiền tệ khác hẳn sách vở thông thường.",
    analogy: {
      title: "Vách ngăn Kín nước trên Tàu Titanic (Bulkhead) & Cầu dao Tự động Chống Cháy Nổ (Circuit Breaker)",
      body: "Tại sao những con tàu viễn dương hiện đại bị thủng một lỗ ở mũi tàu vẫn không chìm? Vì thân tàu được chia thành nhiều khoang độc lập bằng các **Vách ngăn thép kín nước (Bulkhead)**: nếu khoang hàng số 9 (đối tác Bảo hiểm) bị bục nước tràn ngập, cánh cửa vách ngăn khóa chặt chỉ cho phép nước chiếm tối đa đúng khoang số 9 đó (giới hạn tối đa 10 luồng đồng thời), còn 190 luồng ở buồng máy chính và khoang hành khách hạng nhất (Chuyển tiền NAPAS, Xem số dư) vẫn khô ráo chạy hết tốc lực! Bên cạnh đó, trên bảng điện của khoang số 9 còn gắn một **Cầu dao tự động (Circuit Breaker)**: khi phát hiện mạch điện khoang 9 bị chập hoặc quá tải chậm liên tục trên 50% số lần thử, cầu dao lập tức nhảy sang trạng thái NGẮT (`OPEN`) trong 30 giây — ai bấm công tắc khoang 9 sẽ nhận thông báo 'Dịch vụ bảo hiểm đang bảo trì tạm thời' ngay trong 1 mili-giây (Fail-Fast) thay vì đứng chờ 35 giây đốt cháy đường dây, sau 30 giây cầu dao mới hé mở thử nghiệm vài bóng đèn (`HALF_OPEN`) thấy ổn mới đóng điện trở lại (`CLOSED`)."
    },
    objectives: [
      "Triệt tiêu hiện tượng Sập dây chuyền (Cascading Failure) bằng cách cô lập tài nguyên từng đối tác thông qua `Bulkhead` (phân biệt rõ Semaphore Bulkhead và FixedThreadPool Bulkhead).",
      "Cấu hình chính xác máy trạng thái `Circuit Breaker` của Resilience4j (`CLOSED -> OPEN -> HALF_OPEN`), đặc biệt là bẫy **Slow Call Rate** cực kỳ phổ biến ở các cổng đối tác tài chính.",
      "Nắm vững thứ tự bọc Decorator của Resilience4j và kỷ luật thép về Timeout, Retry (chỉ trên lỗi kết nối/idempotent) và Fallback an toàn không bao giờ gây hoàn tiền nhầm khi `ReadTimeout`."
    ],
    flow: [
      {
        step: "1. Bulkhead Admission Control (Kiểm soát hạn ngạch đồng thời tại cửa khoang)",
        detail: "Trước khi chạm tới mạng, lời gọi đi qua `Bulkhead` riêng của đối tác đó (ví dụ `maxConcurrentCalls = 15`); nếu đã đủ 15 luồng đang chờ đối tác này, luồng thứ 16 bị từ chối tức thì (`BulkheadFullException`) để bảo vệ tài nguyên chung của toàn JVM."
      },
      {
        step: "2. Circuit Breaker State Gate (Cầu dao kiểm tra sức khỏe đối tác)",
        detail: "Nếu cầu dao đang `OPEN` (đối tác vừa sập hoặc quá chậm vượt ngưỡng), Resilience4j chặn ngay lập tức trong < 1ms với `CallNotPermittedException` mà không tốn dù chỉ 1 gói TCP SYN ra ngoài mạng."
      },
      {
        step: "3. Strict Timeout & Controlled Execution (Giới hạn thời gian thực thi khắt khe)",
        detail: "Cuộc gọi HTTP/gRPC thực thi với tách biệt rõ `connectTimeout` ngắn (1–2s) và `responseTimeout / TimeLimiter` hợp lý (3–5s), ghi nhận kết quả thành công, lỗi hoặc cuộc gọi chậm (`slowCallDurationThreshold`) vào cửa sổ trượt (`Sliding Window`)."
      },
      {
        step: "4. Safe Retry & Context-Aware Fallback (Thử lại có chọn lọc & Hạ cánh an toàn)",
        detail: "Chỉ tự động `Retry` với thao tác đọc (`GET`) hoặc lỗi chưa mở được kết nối TCP (`ConnectTimeoutException`); với lỗi đã gửi lệnh trừ/chuyển tiền mà quá hạn đọc (`SocketTimeoutException`), chuyển giao an toàn sang trạng thái chờ đối soát thay vì retry mù quáng hay hoàn tiền bừa."
      }
    ],
    sections: [
      {
        heading: "1. Bulkhead Pattern: Tuyến phòng thủ số 1 chống Cạn kiệt Tài nguyên (Semaphore vs ThreadPool)",
        paragraphs: [
          "Nhiều lập trình viên nghĩ chỉ cần gắn `@CircuitBreaker` là đủ bảo vệ hệ thống, nhưng thực tế trên Production chứng minh: **nếu không có Bulkhead, hệ thống của bạn có thể chết trước khi Circuit Breaker kịp nhảy sang OPEN!** Tại sao vậy? Giả sử bạn cấu hình Circuit Breaker mở khi có ít nhất 50 cuộc gọi trong cửa sổ trượt bị lỗi hoặc chậm quá 10 giây; vào giờ cao điểm có 300 người dùng cùng bấm gọi sang đối tác bị treo đúng trong giây đầu tiên -> cả 300 luồng của ứng dụng lao vào đứng chờ 10 giây làm cạn sạch 100% Thread Pool của toàn server ngay ở giây thứ 2, trước cả khi cuộc gọi đầu tiên kịp hết 10 giây để báo cho Circuit Breaker biết mà ngắt mạch! Bulkhead chặn đứng kịch bản này ngay từ cửa: bạn cấp riêng cho Đối tác Bảo hiểm tối đa 15 khe (`maxConcurrentCalls=15`), Đối tác Chứng khoán 25 khe, còn lại hơn 160 luồng luôn rảnh rỗi phục vụ các nghiệp vụ cốt lõi của ngân hàng.",
          "Resilience4j cung cấp hai loại Bulkhead mà bạn cần chọn đúng theo mô hình luồng của ứng dụng. Loại thứ nhất là **`SemaphoreBulkhead` (mặc định)**: sử dụng biến đếm `java.util.concurrent.Semaphore` ngay trên luồng gọi hiện tại (không tốn chi phí chuyển ngữ cảnh luồng - Context Switch), cực kỳ nhẹ, chạy tương thích hoàn hảo với cả Spring MVC truyền thống, Reactive WebFlux lẫn **Java 21 Virtual Threads**! Loại thứ hai là **`FixedThreadPoolBulkhead`**: tách hẳn một nhóm luồng riêng kèm hàng đợi hữu hạn (`queueCapacity`), yêu cầu phương thức trả về `CompletableFuture<T>` — rất hữu ích khi bạn cần dùng chung với `@TimeLimiter` để chủ động cắt đứt thời gian chờ của một thư viện SDK bên thứ ba cũ kỹ không hỗ trợ cấu hình socket timeout chuẩn."
        ],
        bullets: [
          "Tách riêng Connection Pool ở tầng HTTP Client cho từng nhóm đối tác: Bên cạnh Semaphore Bulkhead của Resilience4j, hãy cấu hình `maxConnectionsPerRoute` trên Apache HttpClient 5 / Reactor Netty để một đối tác chậm không chiếm hết toàn bộ kết nối của HTTP Client dùng chung.",
          "Cẩn trọng với `maxWaitDuration` trong SemaphoreBulkhead: Trên luồng API người dùng tương tác trực tiếp, nên đặt `maxWaitDuration = 0` (hoặc rất nhỏ 50–100ms) để hết chỗ là báo bận ngay (Fail-Fast), tránh xếp hàng chờ dây chuyền làm nghẽn ngược lên Tomcat/Gateway.",
          "Trên Java 21 Virtual Threads: Virtual Threads có thể tạo hàng vạn luồng nhẹ không lo hết Platform Threads, NHƯNG bạn **vẫn bắt buộc cần SemaphoreBulkhead** để không dội 50.000 request đồng thời đánh sập Database nội bộ hoặc vượt hạn mức kết nối của cổng đối tác!"
        ]
      },
      {
        heading: "2. Giải phẫu Circuit Breaker: Cửa sổ trượt (Sliding Window) và Sát thủ thầm lặng Slow Call Rate",
        paragraphs: [
          "Cầu dao `CircuitBreaker` trong Resilience4j vận hành qua 3 trạng thái chính: **`CLOSED`** (đóng mạch bình thường, cho lưu lượng đi qua và thống kê tỷ lệ lỗi/chậm trong cửa sổ trượt `COUNT_BASED` N cuộc gọi gần nhất hoặc `TIME_BASED` N giây gần nhất), **`OPEN`** (ngắt mạch hoàn toàn trong khoảng `waitDurationInOpenState`, ví dụ 30 giây, từ chối tức thời mọi cuộc gọi mới bằng `CallNotPermittedException`), và **`HALF_OPEN`** (sau 30 giây, hé mở cho đúng một số lượng nhỏ `permittedNumberOfCallsInHalfOpenState`, ví dụ 5 cuộc gọi thăm dò đi qua: nếu tỷ lệ lỗi của 5 cuộc thăm dò này thấp dưới ngưỡng thì đóng mạch về `CLOSED` phục hồi hoàn toàn, nếu vẫn lỗi thì dập ngược lại về `OPEN` thêm 30 giây nữa để đối tác có thời gian thở).",
          "Bí quyết cấu hình thực chiến phân biệt người từng trực chiến ngân hàng với người chỉ đọc lý thuyết nằm ở bộ tham số **`slowCallDurationThreshold` và `slowCallRateThreshold`**. Trong thực tế tích hợp liên ngân hàng, rất hiếm khi máy chủ đối tác tắt phụp nguồn trả về `Connection Refused` hay `HTTP 500` gọn gàng; 85% các vụ sự cố bắt đầu bằng việc Database của đối tác bị khóa hoặc đầy CPU khiến họ trả về... `HTTP 200 OK` nhưng mất tới **8–12 giây** thay vì 150ms như ngày thường! Nếu bạn chỉ cấu hình ngắt mạch theo tỷ lệ lỗi (`failureRateThreshold=50%`), Circuit Breaker sẽ thấy đối tác vẫn trả `200 OK` (0% lỗi!) nên cứ giữ khư khư ở trạng thái `CLOSED` cho đến khi hệ thống nghẽn chết! Do đó, luôn cấu hình song kiếm hợp bích: ngắt cầu dao ngay khi tỷ lệ lỗi >= 50% **HOẶC** tỷ lệ cuộc gọi chậm quá `2.5s` (`slowCallDurationThreshold`) vượt ngưỡng `50%` (`slowCallRateThreshold`)."
        ],
        bullets: [
          "Đừng quên tham số `minimumNumberOfCalls` (ví dụ đặt bằng `10` hoặc `20`): Nếu để quá nhỏ (như `2`) trên một đối tác ít giao dịch ban đêm, chỉ cần 1 khách hàng truyền sai tham số hoặc mạng rớt nhẹ 1 nhịp là cầu dao nhảy `OPEN` khóa oan cả dịch vụ!",
          "Loại trừ các ngoại lệ lỗi nghiệp vụ khỏi bộ đếm sập cầu dao (`ignoreExceptions`): Nếu khách hàng nhập sai mã hóa đơn (`InvalidBillCodeException` / HTTP 400/404), đó là lỗi dữ liệu đầu vào của người dùng chứ hệ thống điện lực vẫn sống khỏe 100% — tuyệt đối phải đưa vào `ignoreExceptions` để không làm nhảy cầu dao oan!",
          "Xuất Metrics trạng thái cầu dao ra Prometheus (`resilience4j_circuitbreaker_state`): Khi bất kỳ cầu dao đối tác trọng yếu nào nhảy sang `OPEN (1)`, hệ thống giám sát phải bắn cảnh báo ngay cho đội Vận hành liên hệ đầu mối kỹ thuật phía đối tác."
        ]
      },
      {
        heading: "3. Thứ tự Decorator, Bẫy Retry Nhân Bão Lỗi & Nghệ thuật Fallback An toàn Tiền tệ",
        paragraphs: [
          "Khi bạn gắn nhiều Annotation của Resilience4j lên cùng một phương thức Spring Boot, thứ tự thực thi mặc định từ ngoài vào trong (Aspect Order) là: **`Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( Hàm gốc ) ) ) ) )`**. Hãy hiểu rõ ý nghĩa của thứ tự này: `Bulkhead` nằm sát hàm gốc nhất để mỗi lần thử đều được kiểm soát luồng đồng thời; `CircuitBreaker` nằm bên trong `Retry` để nếu lần gọi 1 và lần gọi retry thứ 2 đều lỗi sẽ được tính đủ vào cửa sổ thống kê giúp cầu dao ngắt sớm, và một khi cầu dao đã `OPEN` trả về `CallNotPermittedException`, lớp `Retry` bên ngoài (nếu cấu hình không retry ngoại lệ `CallNotPermittedException`) sẽ dừng ngay không thử lại vô ích. Đặc biệt cẩn thận với **Hiệu ứng Khuếch đại Bão Retry (Retry Amplification)**: nếu Dịch vụ A retry 3 lần gọi Dịch vụ B, và Dịch vụ B lại retry 3 lần gọi Đối tác C -> 1 cú bấm của người dùng biến thành `3 x 3 = 9` đòn tấn công dồn dập vào một đối tác đang hấp hối! Quy tắc vàng: **chỉ đặt Retry tại duy nhất một tầng sát biên gọi ra ngoài nhất**, với số lần nhỏ (`maxAttempts = 2` hoặc `3`) kèm Jitter ngẫu nhiên.",
          "Cuối cùng, hãy khắc sâu quy tắc sống còn về **Retry và Fallback trong giao dịch ghi/chuyển tiền**: Bạn chỉ được phép tự động Retry khi chắc chắn 100% yêu cầu trước đó **chưa chạm tới logic xử lý của đối tác** (ví dụ `ConnectTimeoutException`, `UnknownHostException`, hoặc đối tác hỗ trợ `Idempotency-Key` chuẩn mực cho phép gửi lại cùng mã). Nếu gặp `SocketTimeoutException` (`ReadTimeout`) trên một lệnh thanh toán không rõ tính lũy đẳng phía đối tác, **CẤM tự động Retry sinh giao dịch mới** và trong hàm `fallbackMethod` **CẤM TUYỆT ĐỐI trả về kết quả 'Giao dịch thất bại' để kích hoạt hoàn tiền tự động**! Hàm Fallback lúc này phải phân nhánh theo loại Exception: nếu là `CallNotPermittedException` hoặc `BulkheadFullException` hoặc `ConnectTimeoutException` (chắc chắn 100% chưa gửi gói tin ra khỏi nhà mình!) -> an toàn tuyệt đối để báo từ chối và giải tỏa tiền giữ ngay lập tức cho khách; ngược lại nếu là `SocketTimeoutException` -> phải trả về trạng thái `PENDING_VERIFICATION` để giữ an toàn tiền chờ tra soát."
        ],
        bullets: [
          "Phân biệt 2 loại Timeout ở tầng Socket: `ConnectTimeout` (bắt tay TCP 3 bước chưa thành công -> chưa có 1 byte nghiệp vụ nào đi sang đối tác -> an toàn hoàn tiền ngay) vs `ReadTimeout / ResponseTimeout` (đã gửi HTTP POST body xong nhưng chờ phản hồi quá giờ -> trạng thái nghi vấn UNKNOWN!).",
          "Chữ ký hàm `fallbackMethod` trong Resilience4j: Phải có cùng kiểu trả về, cùng danh sách tham số gốc của phương thức chính cộng thêm tham số cuối cùng là kiểu `Throwable` (hoặc các lớp con cụ thể để nạp chồng nhiều nhánh Fallback rõ ràng).",
          "Graceful Degradation cho API Đọc (Read Path): Với các API không biến đổi tiền tệ như lấy danh sách điểm thưởng hay tỷ giá tham khảo trên màn hình Dashboard, hàm Fallback có thể trả về dữ liệu Cache gần nhất kèm cờ `staleData: true` để ứng dụng mượt mà tuyệt đối."
        ]
      }
    ],
    comparison: {
      title: "Bảng Chiến thuật Phòng thủ Resilience4j cho Cổng Tích hợp Đối tác Ngân hàng",
      headers: ["Lớp phòng thủ", "Mục tiêu cốt lõi", "Cấu hình chuẩn Production tham khảo", "Quy tắc an toàn đặc thù Tài chính"],
      rows: [
        [
          "Bulkhead (`Semaphore` / `ThreadPool`)",
          "Cô lập tài nguyên, ngăn 1 đối tác chậm chiếm sạch luồng của toàn ngân hàng",
          "`maxConcurrentCalls: 15`, `maxWaitDuration: 50ms` (tách riêng tên cho từng đối tác)",
          "Bắt buộc tách riêng từng đối tác; đối tác hạng phụ (bảo hiểm, vé xem phim) cấp quota nhỏ hơn lõi thanh toán"
        ],
        [
          "TimeLimiter / Socket Timeout",
          "Cắt đứt cuộc gọi treo quá SLA thay vì đứng đợi vô hạn",
          "`connectTimeout: 1500ms`, `responseTimeout: 4000ms`",
          "Tách riêng xử lý `ConnectTimeout` (chưa gửi lệnh -> hủy an toàn) và `ReadTimeout` (chưa rõ kết quả -> treo tra soát)"
        ],
        [
          "Circuit Breaker",
          "Ngắt mạch nhanh (`Fail-Fast`) khi đối tác đang sập hoặc phản hồi quá chậm diện rộng",
          "`slidingWindowSize: 20`, `failureRate: 50%`, `slowCallDuration: 2500ms`, `slowCallRate: 50%`, `waitOpen: 30s`",
          "Đưa toàn bộ lỗi nghiệp vụ người dùng (`400`, sai mã hóa đơn, hết tiền) vào `ignoreExceptions` để không nhảy cầu dao oan"
        ],
        [
          "Retry & Fallback",
          "Vượt qua chập chờn mạng thoáng qua & hạ cánh mềm khi cầu dao ngắt",
          "`maxAttempts: 2`, `waitDuration: 300ms` + Jitter, chỉ retry trên `ConnectTimeoutException` cho lệnh ghi",
          "CẤM fallback tự hoàn tiền khi `ReadTimeout`; CHỈ giải tỏa tiền ngay khi lỗi là `CallNotPermitted`, `BulkheadFull` hoặc `ConnectTimeout`"
        ]
      ]
    },
    codeTitle: "Bọc Cổng Thanh toán Đối tác bằng Bulkhead + Circuit Breaker & Fallback Phân nhánh An toàn Tiền tệ",
    code: [
      "package vn.finbank.partner.adapter;",
      "import io.github.resilience4j.bulkhead.BulkheadFullException;",
      "import io.github.resilience4j.bulkhead.annotation.Bulkhead;",
      "import io.github.resilience4j.circuitbreaker.CallNotPermittedException;",
      "import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;",
      "import org.apache.hc.client5.http.ConnectTimeoutException;",
      "import org.slf4j.*;",
      "import org.springframework.stereotype.Component;",
      "import java.math.BigDecimal;",
      "import java.net.SocketTimeoutException;",
      "",
      "@Component",
      "public class InsurancePartnerGatewayAdapter {",
      "    private static final Logger log = LoggerFactory.getLogger(InsurancePartnerGatewayAdapter.class);",
      "    private final PartnerRestClient restClient;",
      "    public InsurancePartnerGatewayAdapter(PartnerRestClient restClient) { this.restClient = restClient; }",
      "    @Bulkhead(name = \"insurancePartner\", type = Bulkhead.Type.SEMAPHORE)",
      "    @CircuitBreaker(name = \"insurancePartner\", fallbackMethod = \"safeFinancialFallback\")",
      "    public PartnerOutcome payInsurancePremium(String idemKey, String policyNo, BigDecimal amount) {",
      "        return restClient.postPayment(idemKey, policyNo, amount);",
      "    }",
      "    private PartnerOutcome safeFinancialFallback(",
      "            String idemKey, String policyNo, BigDecimal amount, Throwable ex) {",
      "        Throwable root = unwrapRootCause(ex);",
      "        if (ex instanceof CallNotPermittedException || ex instanceof BulkheadFullException",
      "                || root instanceof ConnectTimeoutException) {",
      "            log.warn(\"Chặn sớm an toàn trước khi gửi gói tin [idemKey={}]: {}\", idemKey, ex.toString());",
      "            return PartnerOutcome.definiteReject(\"PARTNER_UNAVAILABLE_BEFORE_SEND\"); // An toàn giải tỏa Hold!",
      "        }",
      "        if (root instanceof SocketTimeoutException) {",
      "            log.error(\"NGHI VẤN READ_TIMEOUT [idemKey={}] - Cấm tự hoàn tiền, chuyển tra soát!\", idemKey);",
      "            return PartnerOutcome.unknownTimeout(); // Treo chờ Status Inquiry / Đối soát T+0",
      "        }",
      "        log.error(\"Lỗi không xác định từ cổng đối tác [idemKey={}]\", idemKey, ex);",
      "        return PartnerOutcome.unknownTimeout();",
      "    }",
      "    private Throwable unwrapRootCause(Throwable t) {",
      "        while (t.getCause() != null && t.getCause() != t) t = t.getCause();",
      "        return t;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "`@Bulkhead` và `@CircuitBreaker` đặt tên định danh riêng `\"insurancePartner\"`: dù đối tác Bảo hiểm này có sập hoàn toàn làm đầy 15 khe Semaphore và mở cầu dao `OPEN`, các luồng gọi sang đối tác Điện lực (`\"evnPartner\"`) hay Chuyển tiền NAPAS hoàn toàn không bị ảnh hưởng một mảy may.",
      "Hàm `safeFinancialFallback` minh họa tư duy chuẩn mực nhất nối tiếp trực tiếp vào `BillPaymentSagaOrchestrator` ở bài M4: khi gặp `CallNotPermittedException` (cầu dao đang ngắt), `BulkheadFullException` (hết khe đồng thời) hoặc `ConnectTimeoutException` (chưa bắt tay TCP được), ta biết chắc chắn 100% đối tác **chưa hề nhận được bất kỳ byte dữ liệu nào** -> trả về `definiteReject` để Saga giải tỏa khoản tiền `HOLD` trả ngay lại cho khách trong 5ms!",
      "Ngược lại, khi nguyên nhân gốc (`unwrapRootCause`) là `SocketTimeoutException` (hoặc lỗi mạng không rõ sau khi đã mở socket ghi dữ liệu), Adapter trả về `unknownTimeout()` — giữ nguyên khóa an toàn để luồng Tra vấn tự động vào xác minh thay vì liều lĩnh hoàn tiền gây thất thoát.",
      "Trong file `application.yml` đi kèm, nhớ cấu hình `ignoreExceptions: [vn.finbank.partner.InvalidPolicyNumberException]` để lỗi khách gõ sai số hợp đồng bảo hiểm không làm tăng tỷ lệ lỗi của `CircuitBreaker`."
    ],
    labGuide: {
      goal: "Mô phỏng cuộc tấn công làm chậm đối tác (Latency Injection) bằng WireMock / Toxiproxy và chứng minh API Xem số dư cốt lõi vẫn đạt P99 < 30ms nhờ Bulkhead + Circuit Breaker.",
      steps: [
        "Bước 1: Cấu hình Tomcat server với giới hạn nhỏ `server.tomcat.threads.max=30` để dễ tái hiện nghẽn luồng, tạo 2 API: `/api/core/balance` (trả lời trong 10ms) và `/api/partner/insurance` (gọi WireMock bị cấu hình delay cứng `15.000ms`).",
        "Bước 2: Lần chạy 1 (Chưa bật Bulkhead): Dùng công cụ `k6` hoặc `ab` bắn đồng thời 35 requests vào `/api/partner/insurance`, ngay lúc đó gọi `/api/core/balance` -> Quan sát API Xem số dư bị treo theo suốt 15 giây!",
        "Bước 3: Lần chạy 2 (Bật `@Bulkhead(maxConcurrentCalls=5, maxWaitDuration=0)` và `@CircuitBreaker(slowCallDurationThreshold=2s, slowCallRateThreshold=50%, minimumNumberOfCalls=6)`): Lặp lại bài bắn tải 35 requests vào API bảo hiểm.",
        "Bước 4: Đo thời gian phản hồi của `/api/core/balance` ngay giữa tâm bão và quan sát trạng thái cầu dao chuyển từ `CLOSED` sang `OPEN` trên `/actuator/circuitbreakers`."
      ],
      expectedOutput: "Ngay giữa lúc 35 luồng bắn dồn dập vào đối tác bảo hiểm đang treo, tối đa chỉ 5 luồng được vào khoang bảo hiểm (30 luồng thừa bị trả về thông báo bảo trì trong 2ms), sau 6 cuộc gọi chậm cầu dao nhảy sang `OPEN` ngắt tức thì, và API cốt lõi `/api/core/balance` vẫn phản hồi ổn định dưới 15ms không rớt một nhịp nào!"
    },
    examTips: [
      "Câu hỏi tình huống phỏng vấn cực hay gặp: 'Đối tác vẫn trả HTTP 200 OK nhưng thời gian phản hồi kéo dài từ 100ms lên 12s làm sập cổng của em dù đã cài Circuit Breaker với `failureRateThreshold=50%`, vì sao?' -> Trả lời ngay: Vì HTTP 200 không tính là Failure! Phải bổ sung cấu hình **`slowCallDurationThreshold` + `slowCallRateThreshold`** kết hợp **Bulkhead**.",
      "Bẫy `ignoreExceptions`: Nếu không loại trừ các lỗi `4xx` nghiệp vụ của khách hàng khỏi Circuit Breaker, kẻ xấu chỉ cần viết script gửi 20 mã hóa đơn rác không tồn tại là đánh sập cầu dao làm tê liệt kênh thanh toán của toàn bộ khách hàng thật!",
      "Luôn kiểm tra kỹ sự khác biệt giữa `ConnectTimeout` (an toàn để hủy/thử lại) và `ReadTimeout` (trạng thái bất định UNKNOWN đối với các API làm thay đổi tiền tệ)."
    ],
    summaryTakeaways: [
      "Bulkhead là vách ngăn sống còn cô lập hạn ngạch đồng thời của từng đối tác phụ, đảm bảo sự cố bên ngoài không bao giờ rút cạn luồng xử lý của dịch vụ ngân hàng lõi.",
      "Circuit Breaker cần được cấu hình theo dõi cả tỷ lệ lỗi (`failureRateThreshold`) lẫn tỷ lệ phản hồi chậm (`slowCallRateThreshold`), đồng thời bỏ qua các ngoại lệ sai dữ liệu đầu vào của người dùng.",
      "Chỉ đặt Retry ở một tầng duy nhất với số lần tối thiểu kèm Jitter cho các thao tác lũy đẳng hoặc lỗi chưa kết nối được mạng để tránh gây bão khuếch đại lưu lượng.",
      "Fallback của giao dịch thanh toán phải phân nhánh nghiêm ngặt: chỉ giải tỏa tiền ngay khi chắc chắn gói tin chưa ra khỏi cổng (`CallNotPermitted`, `BulkheadFull`, `ConnectTimeout`), và bắt buộc treo đối soát khi gặp `ReadTimeout`."
    ],
    lessonQuestions: [
      {
        question: "Ứng dụng Ngân hàng Số dùng chung một Tomcat Pool 200 luồng cho cả API Chuyển tiền Nội bộ và API Mua vé xem phim qua đối tác X. Đội kỹ thuật đã gắn `@CircuitBreaker(failureRateThreshold = 50, slidingWindowSize = 20)` cho đối tác X nhưng KHÔNG dùng Bulkhead và chưa cấu hình Slow Call. Đúng tối thứ Sáu, máy chủ đối tác X bị quá tải nên mọi request vẫn trả về `HTTP 200 OK` nhưng mất tới 25 giây mới xong. Hiện tượng gì sẽ xảy ra?",
        options: [
          "Circuit Breaker lập tức nhảy sang `OPEN` sau 1 giây đầu tiên và bảo vệ hoàn toàn API Chuyển tiền Nội bộ.",
          "Vì đối tác X vẫn trả về `HTTP 200 OK` (tỷ lệ lỗi = 0%) nên Circuit Breaker vẫn giữ trạng thái `CLOSED`; đồng thời do không có Bulkhead giới hạn số cuộc gọi đồng thời, hàng trăm khách đặt vé xem phim sẽ nhanh chóng chiếm sạch cả 200 luồng của Tomcat trong 25 giây, làm tê liệt luôn cả API Chuyển tiền Nội bộ (Cascading Failure).",
          "Tomcat sẽ tự động sinh thêm 50.000 luồng miễn phí mà không tốn RAM nên không có chuyện gì xảy ra.",
          "PostgreSQL của ngân hàng sẽ tự động ngắt kết nối mạng tới đối tác X."
        ],
        answer: 1,
        explanation: "Đây là kịch bản sập dây chuyền kinh điển trên Production: (1) thiếu cấu hình `slowCallDurationThreshold` / `slowCallRateThreshold` khiến cầu dao coi các phản hồi `200 OK` chậm 25 giây là thành công bình thường nên không ngắt mạch; và (2) thiếu `Bulkhead` khiến dịch vụ phụ được phép nuốt trọn toàn bộ 200 luồng của máy chủ ứng dụng.",
        wrongReasons: [
          "Circuit Breaker chỉ theo dõi `failureRate` sẽ không bao giờ nhảy sang `OPEN` khi đối tác vẫn trả về mã thành công chậm chạp.",
          "",
          "Tomcat giới hạn cứng bởi `server.tomcat.threads.max` (mặc định 200); các request đến sau khi hết luồng sẽ bị dồn ứ vào hàng đợi nhận kết nối và timeout hàng loạt.",
          "PostgreSQL không liên quan và không có cơ chế kiểm soát kết nối HTTP gọi ra đối tác bên ngoài."
        ]
      },
      {
        question: "Trong hàm `fallbackMethod` của Resilience4j bọc quanh lời gọi thanh toán nạp tiền chứng khoán, trường hợp ngoại lệ nào dưới đây CHO PHÉP hệ thống khẳng định chắc chắn 100% lệnh nạp tiền chưa hề tới được phía đối tác và có thể an toàn giải tỏa khoản tiền khoanh giữ (`HOLD`) ngay lập tức cho khách hàng?",
        options: [
          "`java.net.SocketTimeoutException: Read timed out` xảy ra sau khi đã gửi toàn bộ HTTP POST payload sang máy chủ đối tác.",
          "`io.github.resilience4j.circuitbreaker.CallNotPermittedException` (cầu dao đang `OPEN` chặn tại chỗ) hoặc `io.github.resilience4j.bulkhead.BulkheadFullException` (vách ngăn đầy chặn tại chỗ).",
          "Lỗi đứt kết nối mạng xảy ra ở giây thứ 8 trong lúc đang đọc dở dòng HTTP Response Status từ đối tác trả về.",
          "Mọi loại `Exception` bất kỳ cứ rơi vào `fallbackMethod` đều có thể tự động hoàn tiền ngay 100% không cần phân biệt."
        ],
        answer: 1,
        explanation: "`CallNotPermittedException` và `BulkheadFullException` đều là các ngoại lệ phát sinh ngay trong bộ nhớ JVM của chính ngân hàng TRƯỚC KHI thực hiện bất kỳ lời gọi mạng nào ra bên ngoài. Vì chưa một byte nào được truyền sang đối tác chứng khoán, ngân hàng biết chắc chắn 100% giao dịch chưa thực thi bên kia và có thể giải tỏa tiền giữ cho khách ngay lập tức một cách an toàn tuyệt đối.",
        wrongReasons: [
          "`Read timed out` sau khi đã gửi HTTP POST nghĩa là đối tác rất có thể đã nhận lệnh và cộng tiền vào tài khoản chứng khoán cho khách rồi; tự giải tỏa tiền lúc này sẽ gây mất tiền cho ngân hàng.",
          "",
          "Đứt kết nối lúc đang đọc phản hồi cũng mang trạng thái bất định (UNKNOWN) y hệt Read Timeout vì phía đối tác đã xử lý xong yêu cầu trước khi gửi phản hồi.",
          "Gộp chung mọi Exception để hoàn tiền tự động trong hàm Fallback là sai lầm chí mạng gây thất thoát tài chính khi gặp sự cố mạng chiều về."
        ]
      }
    ]
  },

  M6: {
    duration: "65 phút",
    difficulty: "Senior / Core Banking Batch EOD",
    codeLang: "java",
    teacherIntro: "Chào bạn, ban ngày Ngân hàng Số đua nhau từng mili-giây trên các API trực tuyến (OLTP), nhưng cứ đúng **23h45 mỗi đêm**, một trận chiến khổng lồ khác âm thầm bắt đầu mang tên **EOD (End-Of-Day Batch Processing — Chạy khóa sổ cuối ngày)**: tính lãi dự thu không kỳ hạn (CASA Accrual) cho 5 triệu tài khoản thanh toán, tất toán sổ tiết kiệm đến hạn, quét thu nợ gốc/lãi khoản vay tự động, xuất 500.000 bản sao kê định kỳ và chạy đối soát liên ngân hàng trước giờ mở cửa sáng hôm sau! Anh từng thấy một bạn lập trình viên bê nguyên tư duy viết API sang viết Batch: đặt một hàm `@Scheduled(cron = \"0 55 23 * * *\")`, mở `@Transactional`, gọi `List<Account> all = accountRepo.findAll()` lôi tuốt luột 5 triệu dòng tài khoản lên RAM để chạy vòng lặp `for` tính lãi! Đúng 23h57, Pod bắn thẳng lỗi `java.lang.OutOfMemoryError: Java heap space` chết gục! Chưa hết, khi bạn ấy sửa lại đọc từng khúc nhỏ tự chế nhưng không có quản lý điểm dừng, chạy được 3,8 triệu tài khoản thì máy chủ DB chuyển đổi dự phòng làm đứt kết nối 2 giây — cả Job dừng lại lơ lửng: chạy lại từ đầu thì 3,8 triệu người đầu tiên được **cộng lãi 2 lần trong một đêm**, mà bỏ đi thì 1,2 triệu người cuối **mất lãi**! Đó là lý do mọi hệ thống Core Banking viết bằng Java trên thế giới đều sử dụng **Spring Batch**. Trong bài khép lại Học phần M này, chúng ta sẽ thiết kế một Batch Job xử lý 5 triệu tài khoản trong dưới 6 phút, cúp điện giữa chừng bật lên chạy tiếp mượt mà không lệch 1 xu.",
    analogy: {
      title: "16 Bàn Kiểm Ngân Đóng Gói Theo Từng Khay 1.000 Tờ Có Sổ Niêm Phong Tiến Độ",
      body: "Hãy hình dung Kho quỹ Trung ương cần kiểm đếm và đóng dấu tiền lãi cho 5 triệu phong bì tài khoản trước 5 giờ sáng. Nếu bạn đổ ập cả 5 triệu phong bì lên một cái bàn gỗ duy nhất (dùng `findAll()` trong 1 `@Transactional`), cái bàn sẽ sập gãy ngay lập tức (`OutOfMemoryError`) và nếu đang đếm đến phong bì triệu thứ 4 mà mất điện thì toàn bộ đống phong bì trên bàn xáo trộn không biết cái nào đếm rồi! Cách làm của **Spring Batch** chuyên nghiệp như sau: Trưởng kho (`Partitioner`) chia 5 triệu phong bì theo dải mã số từ nhỏ đến lớn thành 16 chồng độc lập không trùng nhau giao cho **16 Bàn kiểm ngân làm song song (`Partitioned Workers`)**. Tại mỗi bàn, nhân viên không ôm cả chồng mà rút từng **Khay 1.000 phong bì (`Chunk = 1000`)**: rút từng cái (`ItemReader`), bấm máy tính lãi chính xác (`ItemProcessor`), gom đủ 1.000 cái thì đóng dấu cất gọn vào két sắt một thể (`JdbcBatchItemWriter` + Commit 1 micro-transaction) đồng thời ghi ngay vào **Cuốn Sổ Tiến Độ Chống Cháy (`BATCH_STEP_EXECUTION_CONTEXT`)** rằng 'Bàn số 3 đã chốt xong tới mã số #1.452.000'. Lỡ mất điện lúc 2 giờ sáng? Khi có điện lại lúc 2h05, Bàn số 3 mở sổ tiến độ ra đọc và bốc tiếp ngay từ mã `#1.452.001`!"
    },
    objectives: [
      "Làm chủ kiến trúc **Chunk-Oriented Processing** (`ItemReader -> ItemProcessor -> ItemWriter`) và cơ chế lưu vết trạng thái để tự động chạy tiếp từ điểm dừng (**Restartability**) của Spring Batch 5.",
      "Triệt tiêu nút thắt hiệu năng đọc/ghi lô lớn: dùng **Keyset / Paging Cursor theo khóa chính** (thay cho `OFFSET` chậm dần cấp số nhân) kết hợp **Range Partitioning** chạy đa luồng an toàn và **JDBC Batch Insert**.",
      "Thiết kế Batch Job đạt chuẩn Kế toán Ngân hàng: chống cộng lãi kép bằng **Idempotent Posting Key (`account_id + accrual_date`)**, cấu hình `Skip/Retry` cách ly bản ghi bẩn ra bảng treo mà không làm gãy cả lô 5 triệu tài khoản."
    ],
    flow: [
      {
        step: "1. Snapshot Cut-off & Range Partitioning (Chốt số dư cuối ngày & Chia mảnh theo ID)",
        detail: "Job EOD xác định ngày hạch toán (`accrualDate`), sau đó `Manager Step` chạy `AccountRangePartitioner` chia khoảng `MIN(id)..MAX(id)` của 5 triệu tài khoản thành 16 phân đoạn độc lập (`minId..maxId`) giao cho 16 luồng Worker."
      },
      {
        step: "2. Keyset Paging Read (Đọc luồng từng trang 1.000 bản ghi không tràn RAM)",
        detail: "Mỗi Worker dùng `JdbcPagingItemReader` truy vấn theo khóa chính `WHERE id >= :minId AND id <= :maxId AND id > :lastPageKey ORDER BY id ASC LIMIT 1000`, giữ tốc độ đọc trang thứ 5.000 nhanh y hệt trang đầu tiên (< 3ms)."
      },
      {
        step: "3. Pure Domain Calculation (Tính lãi chính xác từng đồng bằng BigDecimal)",
        detail: "`ItemProcessor` nhận từng tài khoản đủ điều kiện, tính lãi ngày theo công thức `Số dư tính lãi * Lãi suất năm / 365` với `BigDecimal` và quy tắc làm tròn chuẩn ngân hàng (`HALF_EVEN`), không thực hiện truy vấn N+1 bên trong Processor."
      },
      {
        step: "4. Idempotent Batch Write & Checkpoint Commit (Ghi lô nguyên tử & Lưu điểm dừng)",
        detail: "Cứ đủ `chunk(1000)` bản ghi, `JdbcBatchItemWriter` đẩy 1 gói lệnh SQL duy nhất (`rewriteBatchedStatements` + `ON CONFLICT DO NOTHING`) xuống DB và cập nhật con trỏ tiến độ vào `BATCH_STEP_EXECUTION_CONTEXT` trong cùng một Transaction."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Chunk-Oriented Processing & Phép màu Phục hồi Điểm dừng (Restartability)",
        paragraphs: [
          "Trái tim của Spring Batch nằm ở mô hình xử lý theo từng khúc (**Chunk-Oriented Processing**). Thay vì giữ một giao dịch Database khổng lồ kéo dài suốt 40 phút làm phình lốp không gian Undo/WAL của PostgreSQL/Oracle và khóa chặt các bảng giao dịch trực tuyến ban đêm, một `Step` với cấu hình `.chunk(1000, transactionManager)` chia 5 triệu bản ghi thành 5.000 giao dịch vi mô (Micro-transactions) ngắn ngủi chỉ 40–80ms mỗi giao dịch! Trong một chu kỳ Chunk: `ItemReader` đọc lần lượt từng bản ghi truyền qua `ItemProcessor` để biến đổi/tính toán và gom kết quả vào một danh sách tạm trong bộ nhớ có kích thước tối đa đúng 1.000 phần tử; ngay khi đủ 1.000 phần tử, Spring Batch mở hoặc chốt giao dịch gọi `ItemWriter.write(Chunk<O>)` ghi cả 1.000 dòng xuống DB trong một lượt mẻ lưới duy nhất rồi giải phóng sạch bộ nhớ cho khúc tiếp theo — nhờ vậy mức sử dụng RAM Heap phẳng lặng như mặt hồ dù bạn chạy 5 triệu hay 500 triệu tài khoản!",
          "Cơ chế thứ hai giúp Spring Batch trở thành tiêu chuẩn vàng trong ngân hàng là hệ thống bảng siêu dữ liệu trạng thái (`BATCH_JOB_INSTANCE`, `BATCH_JOB_EXECUTION`, `BATCH_STEP_EXECUTION` và `BATCH_STEP_EXECUTION_CONTEXT`). Mỗi `JobInstance` được định danh duy nhất bởi `JobName + Identifying JobParameters` (ví dụ `eodCasaInterestJob` + tham số `accrualDate=2026-11-24`): nếu đêm nay Job đã chạy `COMPLETED` cho ngày `2026-11-24`, lỡ ca trực bấm nhầm chạy lại lần nữa với cùng ngày đó, Spring Batch sẽ chặn ngay lập tức với `JobInstanceAlreadyCompleteException`! Ngược lại, nếu đang chạy đến khúc thứ 3.400 (3,4 triệu tài khoản) mà Pod bị sập nguồn chuyển sang trạng thái `FAILED/STOPPED`, mỗi cuối Chunk trước đó `ItemStream` của Reader đã kịp lưu vị trí trang cuối cùng vào bảng `BATCH_STEP_EXECUTION_CONTEXT` trong CÙNG giao dịch DB với dữ liệu đã ghi; khi khởi động lại Job với cùng tham số `accrualDate=2026-11-24`, Spring Batch tự động nạp lại con trỏ đó và chạy tiếp chính xác từ bản ghi 3.400.001!"
        ],
        bullets: [
          "Cẩn trọng với Hibernate First-Level Cache khi dùng `JpaPagingItemReader` / `JpaItemWriter`: Nếu lạm dụng JPA Entity nặng nề hoặc cấu hình sai khiến PersistenceContext giữ tham chiếu tích lũy, tốc độ sẽ chậm dần và tốn GC; trong Batch tài chính quy mô triệu dòng, **`JdbcPagingItemReader` / `JdbcCursorItemReader` + Java `record` nhẹ + `JdbcBatchItemWriter`** nhanh hơn gấp 5–10 lần so với JPA!",
          "Chọn kích thước Chunk (`chunkSize`) bao nhiêu là tối ưu?: Quá nhỏ (`chunk=10`) làm tốn chi phí commit mạng lặp lại 500.000 lần; quá lớn (`chunk=50.000`) làm giữ khóa giao dịch lâu và tốn RAM mỗi lô. Khoảng vàng thực tế trên PostgreSQL/Oracle là **`500` đến `2.000` bản ghi/chunk**.",
          "Bật cờ `reWriteBatchedInserts=true` trên chuỗi kết nối JDBC PostgreSQL: Nếu quên tham số này trên URL JDBC (`jdbc:postgresql://.../core?reWriteBatchedInserts=true`), lệnh `JdbcBatchItemWriter` vẫn gửi từng gói INSERT riêng lẻ thay vì gộp thành câu multi-values INSERT siêu tốc!"
        ]
      },
      {
        heading: "2. Tăng tốc Tuyến tính với Range Partitioning & Cái bẫy Chết đứng ở Trang thứ 4.000 của OFFSET",
        paragraphs: [
          "Có hai sai lầm kỹ thuật làm một Job EOD lẽ ra chạy 5 phút lại kéo dài tới 4 tiếng đồng hồ (vượt qua cả giờ mở cửa giao dịch 6h00 sáng hôm sau!). Sai lầm thứ nhất là phân trang bằng `LIMIT 1000 OFFSET N`: ở những trang đầu (`OFFSET 0`), PostgreSQL trả lời trong 2ms; nhưng khi đọc tới tài khoản thứ 4 triệu (`OFFSET 4000000 LIMIT 1000`), PostgreSQL buộc phải quét qua và vứt bỏ 4.000.000 dòng đầu tiên trên đĩa mới lấy được 1.000 dòng tiếp theo — thời gian mỗi trang vọt lên 3–5 giây, tạo thành độ phức tạp $O(N^2)$ làm Job gần như đứng im ở nửa cuối! `JdbcPagingItemReader` của Spring Batch giải quyết triệt để vấn đề này bằng **Keyset Pagination (Seek Method)**: dựa vào `sortKeys` là khóa chính tăng dần `account_id`, nó tự động sinh câu truy vấn `SELECT ... FROM accounts WHERE account_id > :_account_id ORDER BY account_id ASC LIMIT 1000`, nhảy thẳng vào lá B-Tree Index trong 1–2ms bất kể đang ở dòng thứ 1.000 hay dòng thứ 50 triệu!",
          "Sai lầm thứ hai xảy ra khi muốn chạy đa luồng cho nhanh: nhiều bạn chỉ đơn giản gắn `.taskExecutor(multiThreadExecutor)` vào một Step thường dùng chung 1 `ItemReader`. Khi 16 luồng cùng tranh nhau rút dữ liệu từ một `ItemReader` dùng chung, con trỏ tiến độ không còn tuần tự tuyến tính nữa nên **Spring Batch buộc phải tắt tính năng lưu điểm dừng Restartability (`saveState=false`)** — nghĩa là sập giữa chừng là mất khả năng chạy tiếp chuẩn xác! Kiến trúc đúng chuẩn Senior để vừa chạy 16 luồng song song (thậm chí phân tán ra 16 Pods qua Remote Partitioning) vừa **bảo toàn 100% Restartability** là sử dụng **Partitioned Step**: `Partitioner` chia không gian khóa chính thành 16 đoạn rời nhau hoàn toàn (`[1..312500]`, `[312501..625000]`, ...); mỗi Worker sở hữu riêng một `StepExecution` độc lập và một `JdbcPagingItemReader` có `saveState=true` của riêng đoạn mình phụ trách. Nếu luồng số 7 bị lỗi sập mà 15 luồng kia đã `COMPLETED`, lần chạy lại Spring Batch **chỉ chạy lại duy nhất phần còn dở của luồng số 7**!"
        ],
        bullets: [
          "Bẫy kinh điển 'Vừa phân trang vừa cập nhật cột điều kiện lọc' (Mutating Filter Column Trap): Giả sử Reader đọc `WHERE interest_calculated = false` bằng `OFFSET`, rồi Writer cập nhật `SET interest_calculated = true`; trang 1 cập nhật xong làm 1.000 dòng đầu biến mất khỏi tập kết quả khiến trang 2 với `OFFSET 1000` nhảy cóc bỏ sót mất đúng 1.000 khách hàng tiếp theo! Dùng Keyset Pagination theo `account_id` bất biến sẽ miễn nhiễm hoàn toàn với lỗi nhảy cóc này.",
          "Xử lý phân bố ID bị thưa không đều (Data Skew): Nếu dải ID có khoảng trống lớn (do lịch sử migrate dữ liệu cũ), thay vì chỉ lấy `(maxId - minId) / gridSize`, có thể dùng câu truy vấn phân vị `NTILE` hoặc chia theo mã chi nhánh / chữ số cuối định danh để 16 luồng nhận khối lượng cân bằng nhau.",
          "Đảm bảo HikariCP Connection Pool đủ cho số luồng Partition: Nếu chạy 16 luồng Worker song song trên 1 Pod Batch, `maximum-pool-size` của Batch App phải lớn hơn `16 + 4` (tối thiểu 20–24 kết nối) để các luồng Worker và `JobRepository` không khóa chờ kết nối của nhau (Connection Pool Deadlock)."
        ]
      },
      {
        heading: "3. Kỷ luật Kế toán trong Batch: Idempotent Writer, Chính sách Skip/Retry & Chốt Số dư Cut-off",
        paragraphs: [
          "Dù Spring Batch đã có cơ chế lưu điểm dừng trên từng Chunk, một Principal Architect ngân hàng luôn đặt câu hỏi phòng thủ chiều sâu: *'Điều gì xảy ra nếu một ca trực vận hành lỡ tay chạy Job với một tên tham số ép chạy lại, hoặc sự cố mạng hiểm hóc đúng pha Commit khiến một Chunk bị thực thi lại lần hai?'*. Vì vậy, ở tầng `ItemWriter` và thiết kế bảng Database, chúng ta luôn khóa thêm lớp bảo hiểm cuối cùng mang tên **Idempotent Batch Writing**: bảng bút toán dự thu lãi `daily_interest_accruals` bắt buộc có khóa duy nhất `UNIQUE (account_id, accrual_date)` và câu lệnh SQL trong `JdbcBatchItemWriter` sử dụng `INSERT INTO daily_interest_accruals (...) VALUES (...) ON CONFLICT (account_id, accrual_date) DO NOTHING` (hoặc `MERGE` trên Oracle). Bằng cách này, ngay cả khi bạn cố tình chạy đè lại cả Job 10 lần cho cùng ngày `2026-11-24`, tuyệt đối không bao giờ có một khách hàng nào bị cộng lãi 2 lần!",
          "Một thực tế nữa trong EOD 5 triệu tài khoản là **Dữ liệu bẩn di sản (Dirty Legacy Data)**: có thể tồn tại 3 tài khoản được migrate từ hệ thống 15 năm trước bị thiếu mã biểu lãi suất sản phẩm gây lỗi `MissingRateConfigException`. Nếu không cấu hình chịu lỗi (`faultTolerant()`), chỉ 1 bản ghi lỗi ở dòng thứ 4.999.999 sẽ đánh gãy toàn bộ Step và chặn giờ mở cửa sáng của toàn ngân hàng! Với Spring Batch, ta phân định rõ: (1) gặp lỗi khóa DB tạm thời (`DeadlockLoserDataAccessException`, `TransientDataAccessException`) -> cho tự động `retry(3)` ngay trên Chunk đó; (2) gặp lỗi dữ liệu nghiệp vụ cá biệt (`InvalidAccountDataException`) -> cho phép `skip(...)` với hạn mức an toàn nhỏ (ví dụ `skipLimit(200)`) kèm đăng ký **`SkipListener`** tự động ghi toàn bộ chi tiết tài khoản bị bỏ qua vào bảng `eod_suspense_exceptions` để ban ngày bộ phận Vận hành Core tra soát xử lý tay, còn 4.999.997 tài khoản lành lặn vẫn nhận lãi đúng giờ 100%!"
        ],
        bullets: [
          "Chốt số dư tính lãi theo thời điểm Cut-off (`Value Date Balance`) thay vì đọc cột số dư biến động trực tiếp: Vì Ngân hàng Số hoạt động 24/7 (lúc 0h15 sáng Job đang chạy thì khách vẫn đang chuyển tiền VietQR ầm ầm!), việc tính lãi cuối ngày ngày `D` phải dựa trên số dư chốt tại thời điểm `23:59:59` của ngày `D` (hoặc tổng hợp từ sổ cái theo `booking_date <= D`), tuyệt đối không lấy bừa số dư thời gian thực lúc 01:30 sáng ngày `D+1`!",
          "Xử lý làm tròn tiền lãi dự thu lẻ hàng ngày (Accrual vs Capitalization): Hàng đêm ngân hàng tính *lãi dự thu* lưu độ chính xác cao (ví dụ 4–6 chữ số thập phân như `1245.6789 VNĐ`), đến ngày cuối tháng nhập lãi vào gốc (*Capitalization*) mới làm tròn `HALF_EVEN` về đơn vị đồng nguyên để khách không bị thiệt tiền lẻ tích lũy suốt 30 ngày.",
          "Tách riêng Pod / JVM chuyên chạy Batch khỏi Pod phục vụ API Online: Không bao giờ nhét các Job EOD nặng về CPU/RAM chạy chung bên trong cùng JVM với dịch vụ API chuyển tiền trực tuyến để tránh tranh chấp CPU và GC Pause làm giật lag giao dịch khách hàng ban đêm."
        ]
      }
    ],
    comparison: {
      title: "So sánh Hiệu năng & Độ an toàn các Phương án Chạy Lãi Cuối Ngày cho 5 Triệu Tài khoản",
      headers: ["Phương án triển khai", "Bộ nhớ JVM & Tải Database", "Khả năng Phục hồi khi Sập giữa chừng", "Thời gian hoàn thành thực tế"],
      rows: [
        [
          "`@Scheduled` + `JPA findAll()` trong 1 `@Transactional`",
          "Nổ `OutOfMemoryError` trên JVM; giữ khóa Undo/WAL khổng lồ làm treo cả DB",
          "Bằng 0 — sập là mất trắng hoặc hỏng giao dịch không kiểm soát được",
          "Thất bại (Crash ngay ở vài trăm nghìn dòng đầu tiên)"
        ],
        [
          "Vòng lặp tự viết dùng `LIMIT 1000 OFFSET N` một luồng",
          "RAM ổn định nhưng CPU Database tăng vọt ở nửa cuối do quét bỏ hàng triệu dòng mỗi trang",
          "Rất kém — không có quản lý trạng thái chuẩn, dễ sót dòng hoặc cộng đúp khi chạy lại",
          "~2,5 đến 4 giờ (tốc độ tụt thảm hại từ dòng thứ 2 triệu trở đi)"
        ],
        [
          "Spring Batch 1 luồng: `Chunk(1000)` + Keyset Paging + JDBC Batch",
          "RAM phẳng nhẹ (< 512MB), truy vấn Index 2ms đều đặn từ đầu đến cuối",
          "Chạy tiếp chính xác từ Chunk dừng nhờ `BATCH_STEP_EXECUTION_CONTEXT`",
          "~35 đến 45 phút (tuyến tính ổn định nhưng chưa tận dụng hết đa nhân)"
        ],
        [
          "Spring Batch `Partitioned (16 luồng)` + Keyset + Idempotent JDBC Batch",
          "RAM kiểm soát chặt theo 16 khay nhỏ; tận dụng tối đa I/O song song của DB",
          "Phục hồi độc lập từng phân đoạn lỗi + chống cộng lãi kép 100% ở tầng DB Constraint",
          "~3 đến 6 phút hoàn tất trọn vẹn 5.000.000 tài khoản!"
        ]
      ]
    },
    codeTitle: "Cấu hình Spring Batch 5 Tính Lãi Cuối Ngày (EOD): Range Partitioning, Keyset Reader & Idempotent Writer",
    code: [
      "package vn.finbank.batch.eod;",
      "import org.springframework.batch.core.configuration.annotation.StepScope;",
      "import org.springframework.batch.item.ItemProcessor;",
      "import org.springframework.batch.item.database.*;",
      "import org.springframework.batch.item.database.builder.*;",
      "import org.springframework.batch.item.database.support.PostgresPagingQueryProvider;",
      "import org.springframework.beans.factory.annotation.Value;",
      "import org.springframework.context.annotation.*;",
      "import javax.sql.DataSource;",
      "import java.math.*;",
      "import java.time.LocalDate;",
      "import java.util.Map;",
      "@Configuration",
      "public class EodCasaInterestBatchConfig {",
      "    @Bean @StepScope",
      "    public JdbcPagingItemReader<AccountSnapshot> sliceReader(DataSource ds,",
      "            @Value(\"#{stepExecutionContext['minId']}\") Long minId,",
      "            @Value(\"#{stepExecutionContext['maxId']}\") Long maxId,",
      "            @Value(\"#{jobParameters['accrualDate']}\") LocalDate accrualDate) {",
      "        var q = new PostgresPagingQueryProvider();",
      "        q.setSelectClause(\"SELECT account_id, eod_balance, annual_rate\");",
      "        q.setFromClause(\"FROM casa_daily_snapshots\");",
      "        q.setWhereClause(\"snapshot_date = :accrualDate AND account_id BETWEEN :minId AND :maxId\");",
      "        q.setSortKeys(Map.of(\"account_id\", Order.ASCENDING)); // Keyset seek cực nhanh, KHÔNG dùng OFFSET!",
      "        return new JdbcPagingItemReaderBuilder<AccountSnapshot>().name(\"casaSliceReader\")",
      "            .dataSource(ds).queryProvider(q).pageSize(1000).saveState(true)",
      "            .parameterValues(Map.of(\"accrualDate\", accrualDate, \"minId\", minId, \"maxId\", maxId))",
      "            .rowMapper((rs, i) -> new AccountSnapshot(rs.getLong(1), rs.getBigDecimal(2), rs.getBigDecimal(3))).build();",
      "    }",
      "    @Bean @StepScope",
      "    public ItemProcessor<AccountSnapshot, InterestAccrualRow> interestProcessor(",
      "            @Value(\"#{jobParameters['accrualDate']}\") LocalDate accrualDate) {",
      "        return acc -> acc.eodBalance().compareTo(BigDecimal.ZERO) <= 0 ? null : new InterestAccrualRow(",
      "            acc.accountId(), accrualDate, acc.eodBalance().multiply(acc.annualRate()).divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_EVEN));",
      "    }",
      "    @Bean",
      "    public JdbcBatchItemWriter<InterestAccrualRow> idempotentAccrualWriter(DataSource ds) {",
      "        return new JdbcBatchItemWriterBuilder<InterestAccrualRow>().dataSource(ds).beanMapped().assertUpdates(false)",
      "            .sql(\"INSERT INTO daily_interest_accruals(account_id, accrual_date, interest_amt) \" +",
      "                 \"VALUES (:accountId, :accrualDate, :interestAmt) ON CONFLICT (account_id, accrual_date) DO NOTHING\").build();",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "`@StepScope` bắt buộc gắn trên `sliceReader` và `interestProcessor` để Spring Batch khởi tạo riêng một instance mới cho từng phân vùng Worker vào thời điểm chạy (Late Binding), cho phép tiêm động `minId`, `maxId` từ `stepExecutionContext` và `accrualDate` từ `jobParameters` mà hoàn toàn an toàn đa luồng (Thread-safe).",
      "`PostgresPagingQueryProvider` đi kèm `sortKeys(Map.of(\"account_id\", Order.ASCENDING))` tự động sinh câu lệnh phân trang dựa trên giá trị khóa lớn nhất của trang trước (`WHERE ... AND account_id > :_account_id`) thay vì dùng `OFFSET`, giữ độ trễ đọc ổn định 1–3ms suốt 5 triệu dòng.",
      "Trong `interestProcessor`, trả về `null` là quy ước chuẩn của Spring Batch để báo hiệu 'lọc bỏ bản ghi này không đưa xuống Writer' (ví dụ các tài khoản có số dư bằng 0 không phát sinh lãi), đồng thời phép tính lãi dự thu ngày giữ `scale = 4` với `RoundingMode.HALF_EVEN`.",
      "Trên `idempotentAccrualWriter`, mệnh đề `ON CONFLICT (account_id, accrual_date) DO NOTHING` kết hợp `.assertUpdates(false)` (không ném lỗi nếu có dòng bị bỏ qua do đã ghi từ lần chạy dở trước) tạo thành lá chắn thép chống cộng lãi kép 100% trong mọi kịch bản phục hồi sự cố."
    ],
    labGuide: {
      goal: "Chạy thực tế Job tính lãi EOD trên 500.000 dòng dữ liệu giả lập trong PostgreSQL với 8 phân vùng song song, cưỡng bức giết tiến trình (`kill -9`) ở giữa chừng rồi khởi động lại để kiểm chứng tính năng chạy tiếp không lệch 1 đồng.",
      steps: [
        "Bước 1: Tạo bảng `casa_daily_snapshots` và sinh nhanh 500.000 tài khoản mẫu bằng câu lệnh `INSERT INTO casa_daily_snapshots SELECT generate_series(1, 500000), ...` trên PostgreSQL, kèm bảng kết quả `daily_interest_accruals` có `UNIQUE(account_id, accrual_date)`.",
        "Bước 2: Hoàn thiện `Manager Step` ghép nối `AccountRangePartitioner` (`gridSize = 8`), `ThreadPoolTaskExecutor` 8 luồng và `Worker Step` cấu hình `.chunk(1000, txManager)` sử dụng bộ 3 Reader/Processor/Writer ở trên.",
        "Bước 3: Khởi chạy Job cho ngày `accrualDate=2026-11-24`, khi log in ra tiến độ khoảng ~250.000 dòng thì bấm dừng đột ngột tiến trình JVM. Kiểm tra bảng `BATCH_STEP_EXECUTION` thấy một số phân vùng `COMPLETED` và các phân vùng còn lại dừng dở.",
        "Bước 4: Khởi động lại ứng dụng chạy tiếp cùng tham số `accrualDate=2026-11-24`, sau đó đối chiếu `COUNT(*)` và `SUM(interest_amt)` trên bảng `daily_interest_accruals` với câu truy vấn SQL tính tổng kiểm chứng độc lập."
      ],
      expectedOutput: "Ở lần chạy lại, các phân vùng đã xong được bỏ qua ngay lập tức, các phân vùng dở đọc tiếp từ đúng `account_id` đã lưu trong `BATCH_STEP_EXECUTION_CONTEXT`; kết thúc có đúng `500.000` bản ghi lãi được ghi nhận, không thiếu 1 tài khoản, không trùng 1 dòng và tổng tiền lãi khớp chính xác tới chữ số thập phân thứ 4."
    },
    examTips: [
      "Nếu câu hỏi phỏng vấn nêu: 'Batch Job chạy 1 triệu dòng đầu mất 2 phút nhưng 1 triệu dòng cuối mất 2 tiếng', nguyên nhân 99% là dùng phân trang **`OFFSET` lớn dần** hoặc tích lũy đối tượng trong **Hibernate PersistenceContext (1st-level cache)** chưa giải phóng — hãy trả lời ngay giải pháp **Keyset Pagination (`JdbcPagingItemReader`) + `JdbcBatchItemWriter`**.",
      "Đừng nhầm lẫn giữa **Multi-threaded Step** (nhiều luồng chung 1 Reader -> mất tính năng `saveState` Restartability chuẩn) và **Partitioned Step** (chia dải khóa chính độc lập cho từng Reader con -> vừa song song cực nhanh vừa giữ trọn Restartability).",
      "Luôn kiểm tra tính Lũy đẳng (Idempotency) ở tầng Database của `ItemWriter`: trong tài chính, không bao giờ chỉ tin vào con trỏ bộ nhớ của framework mà thiếu `UNIQUE` constraint chặn ghi đúp bút toán cùng kỳ!"
    ],
    summaryTakeaways: [
      "Spring Batch giải quyết bài toán dữ liệu quy mô triệu dòng bằng Chunk-Oriented Processing: đọc từng luồng nhỏ, tính toán trong bộ nhớ giới hạn và ghi theo lô giao dịch vi mô giúp JVM không bao giờ tràn RAM.",
      "Sử dụng `Partitioned Step` chia theo dải khóa chính kết hợp `JdbcPagingItemReader` (Keyset Seek, không dùng `OFFSET`) giúp tăng tốc tuyến tính theo số nhân CPU/Pod mà vẫn giữ nguyên khả năng chạy tiếp từ điểm dừng khi cúp điện.",
      "Luôn kết hợp bảng siêu dữ liệu trạng thái của Spring Batch với ràng buộc khóa duy nhất chống trùng (`ON CONFLICT DO NOTHING`) tại bảng đích để triệt tiêu 100% rủi ro hạch toán lãi/phí hai lần.",
      "Áp dụng chính sách `Skip/Retry` có kiểm soát kèm `SkipListener` ghi bảng treo kiểm toán để vài bản ghi dữ liệu bẩn lịch sử không thể làm đình trệ phiên khóa sổ cuối ngày của toàn ngân hàng."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên viết Batch Job quét các tài khoản chưa thu phí quản lý tháng bằng câu lệnh phân trang `SELECT * FROM accounts WHERE fee_collected = false ORDER BY id LIMIT 1000 OFFSET :pageOffset` (trang 0: offset 0, trang 1: offset 1000...), và trong `ItemWriter` cập nhật `UPDATE accounts SET fee_collected = true`. Sau khi Job báo hoàn thành thành công không có lỗi nào, kiểm toán phát hiện đúng một nửa số tài khoản trong ngân hàng bị BỎ SÓT chưa thu phí! Nguyên nhân do đâu?",
        options: [
          "Do PostgreSQL bị lỗi phần cứng ổ đĩa chỉ lưu được số chẵn.",
          "Do lỗi kinh điển 'vừa phân trang bằng OFFSET vừa sửa trực tiếp cột nằm trong điều kiện lọc `WHERE`': sau khi trang 0 (dòng 1..1000) được cập nhật `fee_collected = true`, 1.000 dòng tiếp theo (1001..2000) dồn lên vị trí đầu tập kết quả mới (vị trí 0..999), nên khi trang 1 truy vấn với `OFFSET 1000` nó đã nhảy vọt qua bỏ rơi luôn 1.000 dòng đó!",
          "Do kích thước `LIMIT 1000` là số chẵn nên tự động bỏ qua các trang lẻ.",
          "Do Java `BigDecimal` không chạy được bên trong câu lệnh `UPDATE`."
        ],
        answer: 1,
        explanation: "Khi tập dữ liệu nguồn bị thu hẹp ngay trong quá trình đang dịch chuyển `OFFSET` tăng dần, cửa sổ trượt sẽ nhảy cóc qua đúng một lượng bản ghi bằng kích thước trang ở mỗi bước! Giải pháp đúng chuẩn là phân trang Keyset theo khóa chính bất biến (`WHERE id > :lastSeenId AND fee_collected = false ORDER BY id ASC LIMIT 1000`, luôn không dùng `OFFSET`) hoặc dùng bảng lịch sử thu phí tách biệt theo kỳ tháng (`account_id, fee_month`).",
        wrongReasons: [
          "Lỗi này là lỗi thuật toán truy vấn phần mềm 100% tái hiện được trên mọi hệ quản trị CSDL, không phải lỗi phần cứng.",
          "",
          "Số chẵn lẻ của `LIMIT` hoàn toàn không liên quan; dù đặt `LIMIT 999` thì mỗi bước `OFFSET` vẫn nhảy cóc bỏ sót đúng 999 dòng.",
          "`BigDecimal` tương thích hoàn toàn chuẩn mực với JDBC và không gây ra hiện tượng bỏ sót dòng phân trang."
        ]
      },
      {
        question: "Ngân hàng cần tối ưu Job tính lãi cuối ngày cho 8 triệu tài khoản sao cho vừa chạy song song trên 16 luồng đạt tốc độ cao nhất, vừa đảm bảo nếu Pod bị tắt đột ngột ở phút thứ 3 thì khi bật lại Job tự động chạy tiếp chính xác phần còn dở mà không cộng lãi trùng. Kiến trúc Spring Batch nào đáp ứng trọn vẹn cả hai yêu cầu?",
        options: [
          "Dùng một `@Scheduled` gọi `parallelStream()` trên kết quả của `accountRepository.findAll()` trong một `@Transactional` duy nhất.",
          "Dùng một Step đơn gắn `ThreadPoolTaskExecutor` đọc chung một `JdbcCursorItemReader` không đồng bộ và tắt `saveState`.",
          "Dùng **Partitioned Step** chia 8 triệu tài khoản thành 16 dải khóa chính độc lập (`minId..maxId`), mỗi Worker sở hữu riêng `JdbcPagingItemReader` (`saveState = true`) đọc từ bảng chốt số dư Cut-off cuối ngày, xử lý theo `chunk(1000)` và ghi bằng `JdbcBatchItemWriter` có ràng buộc `UNIQUE(account_id, accrual_date) ON CONFLICT DO NOTHING`.",
          "Tạo 8 triệu luồng `new Thread()` mỗi luồng mở 1 kết nối JDBC riêng xuống Database cùng một lúc."
        ],
        answer: 2,
        explanation: "Partitioned Step theo dải khóa chính giúp 16 luồng hoàn toàn không tranh chấp con trỏ nên mỗi phân vùng lưu được tiến độ riêng biệt (`BATCH_STEP_EXECUTION_CONTEXT`) để chạy tiếp chính xác khi khởi động lại; kết hợp đọc theo Keyset Paging từ bản chụp Cut-off cuối ngày và ghi lô lũy đẳng có ràng buộc `UNIQUE` đảm bảo tốc độ vài phút và an toàn kế toán tuyệt đối.",
        wrongReasons: [
          "`findAll()` 8 triệu dòng gây nổ `OutOfMemoryError` tức thì và `parallelStream()` cũng không chia sẻ được ngữ cảnh giao dịch DB an toàn hay lưu điểm dừng.",
          "`JdbcCursorItemReader` mặc định không thread-safe khi chia sẻ bừa cho nhiều luồng và việc tắt `saveState` làm mất khả năng phục hồi từ điểm dừng chuẩn xác.",
          "",
          "Mở 8 triệu kết nối JDBC đồng thời sẽ làm sập cả JVM lẫn máy chủ Database ngay từ vài nghìn luồng đầu tiên."
        ]
      }
    ]
  }
});
