/* FinJava Senior Academy — Học phần K: Bảo mật Cấp độ Ngân hàng, Mật mã học, HSM & Tuân thủ PCI-DSS */
window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  K1: {
    duration: "65 phút",
    difficulty: "Chuyên sâu (Senior / Security Architect)",
    codeLang: "java",
    teacherIntro: "Chào em, chào mừng em bước vào Học phần K — học phần mà ở mọi ngân hàng hay công ty Fintech lớn, chỉ một dòng cấu hình hớ hênh cũng đủ biến thành sự cố chấn động mặt báo và án phạt hàng chục tỷ đồng từ cơ quan quản lý. Khi đi phỏng vấn Senior Java cho mảng Digital Banking, rất nhiều bạn trả lời vanh vách 'Em dùng JWT để xác thực cho nhanh vì không cần hỏi Database'. Ngay lập tức Hội đồng Kiến trúc sẽ hỏi vặn lại 3 câu chí mạng: 'Một là, khách hàng vừa gọi tổng đài báo bị giật điện thoại đang mở sẵn App, làm sao em khóa chết Access Token đó trong 1 giây nếu JWT là stateless? Hai là, xoay vòng khóa ký RSA/ECDSA định kỳ hàng tháng thế nào để 500.000 người đang giao dịch không bị văng lỗi 401 đồng loạt? Ba là, kẻ gian viết app độc hại bắt trộm Authorization Code trên Mobile Deep Link thì sao?'. Bài K1 hôm nay sẽ giúp em làm chủ trọn vẹn chuẩn OAuth 2.1, OpenID Connect (OIDC), Keycloak và kiến trúc quản trị vòng đời Token cấp độ ngân hàng.",
    analogy: {
      title: "Thẻ từ thang máy khách sạn 5 sao kết hợp bộ đàm khóa khẩn cấp ở từng tầng",
      body: "Em hãy hình dung quầy Lễ tân trung tâm chính là Authorization Server (Keycloak), còn các cửa phòng, thang máy VIP và két sắt là các Microservices (Account, Transfer, Card). Thay vì buộc nhân viên bảo vệ ở từng cửa phải chạy bộ xuống sảnh hỏi lễ tân mỗi lần khách quẹt thẻ (Stateful Session tốn tải), lễ tân phát cho khách chiếc thẻ từ có chữ ký điện tử chống làm giả chỉ có hiệu lực đúng 5 phút (Short-lived JWT Access Token ký bằng ES256/RS256) kèm một phiếu đổi thẻ mới chỉ dùng được đúng một lần (Refresh Token Rotation). Nếu thẻ hết 5 phút, ứng dụng âm thầm đổi thẻ mới. Nhưng nếu khách báo mất ví khẩn cấp, lễ tân vừa hủy phiếu đổi thẻ gốc, vừa phát mã số seri thẻ (`jti`) qua bộ đàm tốc độ cao (Redis Denylist) tới toàn bộ cửa phòng để chặn đứng chiếc thẻ đó ngay giây tiếp theo mà không cần chờ hết 5 phút!"
    },
    objectives: [
      "Nắm vững luồng OAuth 2.1 Authorization Code + PKCE (`S256`), phân biệt rạch ròi vai trò của `ID Token` (OIDC) và `Access Token` kèm kiểm tra `aud` (Audience) chống tấn công Confused Deputy.",
      "Thiết kế cơ chế ký bất đối xứng `ES256`/`RS256` và quy trình xoay vòng cặp khóa không gián đoạn (Zero-Downtime JWK Rotation) thông qua định danh `kid` và endpoint JWKS.",
      "Triển khai chiến lược bảo vệ kép vòng đời phiên: Refresh Token Rotation có phát hiện tái sử dụng (Reuse Detection) kết hợp thu hồi tức thời Access Token bằng Redis `jti` Denylist trên Spring Security 6."
    ],
    flow: [
      {
        step: "1. Khởi tạo PKCE & Xác thực Đa nhân tố tại IdP",
        detail: "Mobile/Web sinh ngẫu nhiên `code_verifier`, băm `SHA-256` tạo `code_challenge` gửi lên Keycloak. Sau khi khách đăng nhập sinh trắc học/mật khẩu, Keycloak gắn `code_challenge` vào Authorization Code tạm thời (hiệu lực 30–60 giây)."
      },
      {
        step: "2. Đổi Token kèm Chứng minh PKCE & Cấp Cặp Token Chuẩn",
        detail: "Client/BFF gửi Authorization Code kèm `code_verifier` gốc lên `/token`. Keycloak băm kiểm chứng khớp `S256` mới cấp `Access Token` ngắn hạn (3–5 phút, ký `ES256`, có `kid`, `aud`, `jti`, `cif`) và `Refresh Token` xoay vòng một lần."
      },
      {
        step: "3. Xác thực Phi trạng thái + Kiểm tra Denylist tại Resource Server",
        detail: "Spring Security 6 tải bộ khóa công khai từ JWKS (cache theo `kid`), kiểm tra chữ ký số, hạn `exp`, nguồn phát `iss`, đích nhận `aud` và tra nhanh `EXISTS auth:denylist:jti:<jti>` trên Redis (< 1ms) trước khi cho phép vào Controller."
      },
      {
        step: "4. Xoay vòng Refresh Token & Phong tỏa Khẩn cấp khi Phát hiện Bất thường",
        detail: "Mỗi lần xin cấp mới, Refresh Token cũ bị đánh dấu đã dùng ngay lập tức. Nếu kẻ tấn công (hoặc thiết bị gốc) mang Refresh Token cũ gọi lại lần 2, Keycloak phát hiện hành vi đánh cắp và thu hồi toàn bộ chuỗi phiên (`Token Family`) tức khắc."
      }
    ],
    sections: [
      {
        heading: "1. Chuẩn OAuth 2.1, PKCE bắt buộc và bức tường ngăn chặn Confused Deputy qua Audience",
        paragraphs: [
          "Trong thế giới ngân hàng hiện đại, đặc tả OAuth 2.1 đã chính thức khai tử hai luồng cũ đầy rủi ro của OAuth 2.0 là Implicit Flow (trả thẳng Access Token trên thanh địa chỉ URL dễ lộ qua lịch sử trình duyệt, Referer header) và Resource Owner Password Credentials - ROPC (cho phép ứng dụng thứ ba thu thập trực tiếp username/password gốc của khách hàng). Mọi ứng dụng từ Mobile Banking (iOS/Android), Single Page App (React/Angular) cho tới đối tác Open Banking đều bắt buộc hội tụ về một luồng chuẩn duy nhất: Authorization Code kết hợp PKCE (`Proof Key for Code Exchange` - RFC 7636) sử dụng phương thức băm `S256`.",
          "Tại sao đã có HTTPS mà Mobile App vẫn sống chết phải dùng PKCE? Trên điện thoại, sau khi xác thực tại trình duyệt hệ thống, máy chủ ủy quyền chuyển hướng về App thông qua Custom URI Scheme (ví dụ `finbank://callback?code=xyz`) hoặc Universal Link. Một ứng dụng độc hại cài trên cùng thiết bị có thể đăng ký trùng URI Scheme để 'hớt tay trên' `Authorization Code`. Nhờ PKCE, lúc bắt đầu luồng đăng nhập, App thật đã giữ kín chuỗi ngẫu nhiên `code_verifier` (dài 43–128 ký tự entropy cao) trong RAM và chỉ gửi bản băm một chiều `code_challenge = BASE64URL(SHA256(code_verifier))` lên Keycloak. Kẻ cắp dù bắt được `code` cũng không thể đào đâu ra `code_verifier` gốc để đổi lấy Token!",
          "Một sai lầm nghiêm trọng khác mà 70% dự án Microservices mắc phải là nhầm lẫn giữa `ID Token` và `Access Token`, cũng như bỏ quên kiểm tra trường `aud` (Audience). Hãy khắc cốt ghi tâm: `ID Token` của OpenID Connect là 'giấy chứng minh nhân dân' dành riêng cho phía Client/Frontend đọc tên tuổi hiển thị giao diện — tuyệt đối không mang `ID Token` đi gọi API chuyển tiền. Ngược lại, `Access Token` phải chứa claim `aud` chỉ định rõ dịch vụ đích (ví dụ `core-payment-service`). Nếu không kiểm tra `aud`, một dịch vụ phụ kém quan trọng như `loyalty-survey-service` khi bị lộ có thể lấy nguyên JWT hợp lệ của khách mang sang gọi thẳng `core-payment-service` để rút tiền — lỗ hổng này gọi là `Confused Deputy`."
        ],
        bullets: [
          "Cấm tuyệt đối phương thức PKCE `plain`: Bắt buộc ép cấu hình Keycloak/Authorization Server chỉ chấp nhận `code_challenge_method = S256` thông qua chính sách Client Policy chuẩn FAPI.",
          "Phân tách Scope và Claim nghiệp vụ: Đưa mã khách hàng chuẩn `cif` (Customer Information File) và mức độ xác thực phiên `acr` (ví dụ `urn:finbank:loa:biometric`) vào Access Token được ký số, không bao giờ đọc `cif` từ HTTP Header tự gõ ngoài client.",
          "Thời gian sống thực chiến chuẩn Ngân hàng: Access Token chỉ đặt `180s – 300s` (3 đến 5 phút); Idle Session Timeout của Refresh Token trên kênh Internet/Mobile Banking thường giới hạn `10 – 15 phút` không tương tác."
        ]
      },
      {
        heading: "2. Chữ ký bất đối xứng ES256/RS256 và nghệ thuật xoay vòng khóa JWK không rớt 1 giao dịch",
        paragraphs: [
          "Khi kiểm toán kiến trúc cho các startup Fintech mới lớn, thầy vẫn thỉnh thoảng bắt gặp hệ thống ký JWT bằng thuật toán đối xứng `HS256` (HMAC-SHA256) dùng chung một chuỗi `jwt.secret` cấu hình giống hệt nhau ở cả 25 microservices. Trong môi trường ngân hàng, đây là 'quả bom nổ chậm' hạng nặng: với `HS256`, bất kỳ ai có khóa để kiểm tra chữ ký (Verify) thì cũng có toàn quyền tự tạo ra chữ ký mới (Sign)! Nghĩa là nếu một microservice vệ tinh chuyên gửi email khuyến mãi bị lộ biến môi trường, kẻ tấn công có thể tự đúc ra hàng vạn Access Token quyền `SUPER_ADMIN` hoặc mạo danh bất kỳ tỷ phú nào để gọi vào Core Ledger.",
          "Chuẩn bắt buộc của hệ thống tài chính là mật mã bất đối xứng: `RS256` (RSA-2048/3072) hoặc tối ưu hơn là `ES256` (ECDSA trên đường cong P-256 — cho kích thước chữ ký ngắn bằng 1/4 RSA và tốc độ xác thực cực nhanh, giảm đáng kể băng thông Header mỗi request). Chỉ duy nhất cụm Authorization Server (Keycloak gắn HSM/Vault) nắm giữ `Private Key` để ký phát hành Token; toàn bộ API Gateway và hàng chục Resource Server phía sau chỉ tải `Public Key` dạng chuẩn `JWK Set` (`/.well-known/jwks.json`) về bộ nhớ đệm để xác thực chữ ký.",
          "Vậy khi đến kỳ xoay vòng khóa định kỳ (Key Rotation mỗi 30–90 ngày theo chuẩn tuân thủ) hoặc khi nghi ngờ cần thay khóa mới giữa trưa cao điểm 5.000 TPS, làm sao hệ thống không làm rớt phiên của hàng trăm nghìn khách? Bí quyết nằm ở trường `kid` (`Key ID`) trên phần JOSE Header của JWT và quy trình xoay 3 pha: Pha 1 (Pre-publish) — Sinh cặp khóa mới `key-2026-11` trên Keycloak ở trạng thái `PASSIVE`, đẩy Public Key mới lên tập JWKS cùng lúc với khóa cũ `key-2026-10` để các Resource Server kịp cập nhật cache; Pha 2 (Switch Active Signer) — Chuyển `key-2026-11` sang trạng thái `ACTIVE` để ký mọi Token mới, trong khi `key-2026-10` lùi về chế độ chỉ xác thực (`VERIFY-ONLY`) cho các Token cũ còn sống nốt 5 phút cuối; Pha 3 (Retire) — Sau khi vượt quá thời hạn sống tối đa của các Token cũ, mới gỡ hoàn toàn `key-2026-10` khỏi JWKS."
        ],
        bullets: [
          "Chống tấn công Algorithm Confusion (`alg: none` hoặc ép `RS256 -> HS256`): Trong `NimbusJwtDecoder` của Spring Security 6, luôn khóa cứng thuật toán mong đợi bằng `.jwsAlgorithm(SignatureAlgorithm.ES256)` thay vì tin tưởng mù quáng trường `alg` do kẻ tấn công gửi lên.",
          "Bảo vệ JWKS Endpoint trước Cache Stampede: Cấu hình thời gian cache JWK Set hợp lý (ví dụ TTL 15–60 phút kèm cơ chế làm mới có giới hạn tốc độ khi gặp `kid` lạ) để tránh kẻ tấn công bắn hàng vạn JWT gắn `kid` rác ép Resource Server gọi DDoS sập chính Keycloak nội bộ!",
          "Không nhét dữ liệu nhạy cảm hoặc quá lớn vào JWT Payload: JWT chỉ được Base64URL encode (ai cũng giải mã đọc được bằng mắt thường nếu cầm token), không phải mã hóa ẩn nội dung; tuyệt đối không nhét số CCCD đầy đủ, số thẻ hay danh sách 500 quyền chi tiết làm nổ giới hạn 8KB HTTP Header của Nginx/Envoy."
        ]
      },
      {
        heading: "3. Giải bài toán Thu hồi tức thời: Refresh Token Rotation + Redis JTI Denylist",
        paragraphs: [
          "Điểm yếu cố hữu của kiến trúc JWT thuần túy là một khi đã ký phát hành ra ngoài, Token tự mang theo hạn sử dụng (`exp`) nên mặc định Resource Server cứ thấy chữ ký đúng và chưa hết hạn là cho qua. Trong mạng xã hội, chờ 15 phút cho Token tự chết có thể chấp nhận được; nhưng trong ngân hàng, khi hệ thống Fraud Detection phát hiện tài khoản khách vừa đăng nhập từ thiết bị lạ và đang chuẩn bị vét sạch 2 tỷ tiền tiết kiệm, hoặc khi khách bấm nút 'Đăng xuất khỏi mọi thiết bị / Khóa kênh điện tử khẩn cấp', 5 phút chờ đợi là quá đủ để tiền bốc hơi qua chuyển khoản nhanh 24/7!",
          "Kiến trúc chuẩn Ngân hàng giải quyết triệt để mâu thuẫn giữa 'Tốc độ cao của Stateless JWT' và 'Khả năng cắt quyền tức thì của Stateful Session' bằng mô hình lai `Hybrid Stateless + Denylist Revocation`. Mỗi Access Token khi sinh ra bắt buộc mang mã định danh duy nhất toàn cục `jti` (UUIDv4/v7) và mã phiên `sid`. Ở trạng thái bình thường (99,99% giao dịch), Redis hoàn toàn trống nhẹ; Resource Server chỉ thực hiện một lệnh kiểm tra sự tồn tại siêu tốc `EXISTS auth:denylist:jti:<jti>` (hoặc `auth:revoked_user_before:<cif>`) tốn chưa tới 0,3ms trên Redis Cluster nội bộ. Khi có lệnh khóa khẩn cấp hoặc Logout, Identity Service đẩy `jti` (hoặc mốc thời gian thu hồi của `cif`) vào Redis với `TTL` tự hủy bằng đúng số giây còn lại của Access Token (`exp - currentEpoch`). Nhờ vậy, bộ nhớ Redis luôn cực kỳ nhỏ gọn mà vẫn chặn chết Token bị thu hồi trong dưới 50 mili-giây trên toàn hệ thống!",
          "Song song đó, đối với `Refresh Token` có vòng đời dài hơn, bắt buộc bật cơ chế `Refresh Token Rotation` kèm `Reuse Detection`. Mỗi lần dùng `RT_1` để lấy Access Token mới, máy chủ lập tức vô hiệu hóa `RT_1` và trả về `RT_2` mới (cùng thuộc họ `family_id = F1`). Giả sử kẻ gian đã kịp đánh cắp `RT_1`: nếu kẻ gian dùng `RT_1` trước, khi điện thoại thật của khách tự động mang `RT_1` đi làm mới phiên vài phút sau, Keycloak thấy một Refresh Token đã đóng dấu `USED` lại xuất hiện lần nữa! Hệ thống lập tức kết luận phiên `F1` đã bị rò rỉ, tự động xóa sổ toàn bộ `RT_2` đang nằm trong tay kẻ gian và bắn sự kiện sang Redis khóa luôn các `jti` liên quan, buộc chủ tài khoản xác thực lại từ đầu bằng sinh trắc học."
        ],
        bullets: [
          "Chính sách Fail-Closed cho API Tiền tệ: Nếu cụm Redis Denylist gặp sự cố mất kết nối hoàn toàn (dù đã có Sentinel/Cluster), các API truy vấn số dư có thể cân nhắc chế độ đọc hạn chế, nhưng các API chuyển tiền/rút tiết kiệm bắt buộc ưu tiên an toàn (`Fail-Closed`) hoặc yêu cầu xác thực giao dịch bổ sung.",
          "Thu hồi cấp độ Toàn tài khoản (`Revoke All Sessions by CIF`): Bên cạnh khóa lẻ từng `jti`, hãy lưu thêm khóa `auth:min_iat:<cif> = timestamp_khoa_khan_cap`; bất kỳ JWT nào của khách đó có `iat < min_iat` đều bị từ chối sạch chỉ bằng 1 bản ghi Redis duy nhất!",
          "Kết hợp BFF trên kênh Web: Với Internet Banking trên trình duyệt, không trả Access/Refresh Token xuống JavaScript `localStorage` mà giữ chúng an toàn trong tầng Backend-for-Frontend (BFF), chỉ giao tiếp với trình duyệt bằng `HttpOnly + Secure + SameSite=Strict` Session Cookie."
        ]
      }
    ],
    comparison: {
      title: "Bảng đối chiếu 4 kiến trúc xác thực Token trong Hệ thống Tài chính - Ngân hàng",
      headers: ["Mô hình Token", "Cơ chế xác thực tại API", "Ưu điểm nổi bật", "Rủi ro / Bài toán khi áp dụng Ngân hàng"],
      rows: [
        [
          "JWT Đối xứng (`HS256`)",
          "Dùng chung 1 khóa bí mật `Secret` để cả ký và kiểm tra ở mọi dịch vụ",
          "Cài đặt đơn giản nhất, tốc độ băm HMAC rất nhanh",
          "Cực kỳ nguy hiểm cho Microservices: lộ 1 dịch vụ vệ tinh là hacker tự ký giả được JWT toàn hệ thống"
        ],
        [
          "JWT Bất đối xứng thuần túy (`RS256` / `ES256`)",
          "IdP giữ Private Key ký; các dịch vụ dùng Public Key (JWKS) tự kiểm tra cục bộ",
          "Chịu tải rất cao, không tạo nút thắt cổ chai lên máy chủ IdP trung tâm",
          "Không thể thu hồi tức thời các Access Token vẫn còn hạn `exp` nếu thiếu tầng Denylist phụ trợ"
        ],
        [
          "Opaque Token + Introspection (`RFC 7662`)",
          "Token là chuỗi ngẫu nhiên vô nghĩa; mỗi request API phải gọi về IdP hỏi trạng thái",
          "Thu hồi tức thời 100%, không lộ bất kỳ thông tin claim nào ra ngoài biên mạng",
          "Tạo tải mạng nội bộ khổng lồ và điểm nghẽn đơn (SPOF) lên IdP ở quy mô hàng nghìn TPS"
        ],
        [
          "Short-lived `ES256` JWT + JWK Rotation + Redis `jti` Denylist",
          "Kiểm tra chữ ký cục bộ qua JWKS kết hợp tra bảng đen `jti`/`min_iat` trên Redis in-memory",
          "Đạt cả hai đích: hiệu năng xử lý dưới 1ms ở 10.000 TPS và khóa khẩn cấp tức thì trong < 50ms",
          "Chuẩn vàng thực chiến của các Ngân hàng số hiện nay; cần vận hành cụm Redis HA chuẩn chỉnh"
        ]
      ]
    },
    codeTitle: "Cấu hình Spring Security 6 Resource Server chuẩn Ngân hàng: ES256 JWKS, Audience & Redis JTI Denylist",
    code: [
      "@Configuration",
      "@EnableMethodSecurity",
      "public class BankingResourceServerConfig {",
      "",
      "    @Bean",
      "    SecurityFilterChain apiSecurity(HttpSecurity http, JwtDecoder bankingJwtDecoder) throws Exception {",
      "        return http",
      "            .csrf(AbstractHttpConfigurer::disable)",
      "            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))",
      "            .authorizeHttpRequests(auth -> auth",
      "                .requestMatchers(\"/actuator/health/liveness\", \"/actuator/health/readiness\").permitAll()",
      "                .requestMatchers(\"/api/v1/transfers/**\").hasAuthority(\"SCOPE_transfer:write\")",
      "                .anyRequest().authenticated())",
      "            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(bankingJwtDecoder)))",
      "            .build();",
      "    }",
      "",
      "    @Bean",
      "    JwtDecoder bankingJwtDecoder(OAuth2ResourceServerProperties props, StringRedisTemplate redis) {",
      "        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(props.getJwt().getJwkSetUri())",
      "            .jwsAlgorithm(SignatureAlgorithm.ES256)",
      "            .build();",
      "        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(props.getJwt().getIssuerUri());",
      "        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(",
      "            JwtClaimNames.AUD, aud -> aud != null && aud.contains(\"core-payment-service\"));",
      "        OAuth2TokenValidator<Jwt> redisRevocationValidator = jwt -> {",
      "            String jti = jwt.getId();",
      "            boolean revoked = jti == null || Boolean.TRUE.equals(redis.hasKey(\"auth:denylist:jti:\" + jti));",
      "            return revoked",
      "                ? OAuth2TokenValidatorResult.failure(new OAuth2Error(\"token_revoked\", \"JWT revoked or missing jti\", null))",
      "                : OAuth2TokenValidatorResult.success();",
      "        };",
      "        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator, redisRevocationValidator));",
      "        return decoder;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Khóa chặt thuật toán `.jwsAlgorithm(SignatureAlgorithm.ES256)` trên `NimbusJwtDecoder`: Ngăn chặn hoàn toàn lỗ hổng hạ cấp thuật toán ký, đồng thời tự động ánh xạ đúng Public Key theo trường `kid` khi Keycloak xoay vòng khóa trên `jwkSetUri`.",
      "Bộ kiểm tra `audienceValidator` trên claim `aud`: Đảm bảo chỉ những Access Token được cấp phát đích danh cho `core-payment-service` mới được chấp nhận, triệt tiêu rủi ro mang Token của dịch vụ vệ tinh khác sang gọi trái phép.",
      "Chốt chặn `redisRevocationValidator` kết hợp kiểm tra `jti == null`: Bắt buộc mọi Token hợp lệ phải có định danh `jti` và chưa từng nằm trong danh sách đen thu hồi khẩn cấp trên Redis; nếu bị thu hồi, Spring Security tự động trả `401 Unauthorized` chuẩn RFC 6750.",
      "Chỉ mở `permitAll()` đúng 2 đường dẫn `/actuator/health/liveness` và `/readiness` cho Kubernetes Probe, tránh mở toang `/actuator/**` làm lộ `/actuator/env` hoặc `/actuator/heapdump`."
    ],
    labGuide: {
      goal: "Dựng luồng xác thực chuẩn OAuth 2.1 PKCE với Keycloak, cấu hình Spring Security 6 kiểm tra chữ ký bất đối xứng + Audience và kiểm chứng thu hồi khẩn cấp JWT còn hạn trong dưới 1 giây bằng Redis.",
      steps: [
        "Bước 1: Khởi chạy `Keycloak` và `Redis` qua Docker Compose; tạo Realm `finbank`, cấu hình Client yêu cầu bắt buộc `PKCE Code Challenge Method = S256`, thời hạn Access Token `300 giây`, bật `Revoke Refresh Token` (Refresh Token Rotation) và thêm Audience Mapper `core-payment-service`.",
        "Bước 2: Viết script hoặc dùng Postman thực hiện luồng Authorization Code + PKCE (tạo `code_verifier` ngẫu nhiên và `code_challenge` SHA-256 Base64URL) để lấy cặp Access Token + Refresh Token hợp lệ, sau đó gọi thử `POST /api/v1/transfers` xác nhận trả về `200 OK`.",
        "Bước 3: Thử tạo một Token từ Client khác không có `aud = core-payment-service` (dù cùng Realm và chữ ký đúng) bắn vào API chuyển tiền để quan sát `audienceValidator` chặn đứng với mã lỗi `401 invalid_token`.",
        "Bước 4: Viết API nội bộ `/internal/security/revoke/{jti}` ghi khóa `auth:denylist:jti:<jti>` vào Redis với TTL bằng thời gian còn lại của Token; bắn lại ngay Access Token ở Bước 2 khi vẫn còn hạn 4 phút và kiểm chứng hệ thống lập tức từ chối với lỗi `token_revoked`."
      ],
      expectedOutput: "API chỉ cho phép giao dịch khi JWT thỏa mãn đồng thời 4 điều kiện: chữ ký `ES256` khớp JWKS hiện hành, đúng `iss`, chứa `aud = core-payment-service`, và `jti` chưa bị đưa vào Redis Denylist; khi kích hoạt khóa khẩn cấp, Token bị vô hiệu hóa tức thì mà không cần chờ hết hạn 5 phút."
    },
    examTips: [
      "Câu hỏi phỏng vấn kinh điển 'Làm sao xoay khóa ký JWT trên Production không làm khách hàng bị văng phiên?': Trả lời rõ quy trình 3 bước với `kid` trên JWKS — Công bố trước Public Key mới ở chế độ `PASSIVE` -> Chuyển khóa mới sang `ACTIVE` để ký mới trong khi giữ khóa cũ xác thực nốt -> Gỡ khóa cũ sau khi hết `max(AccessToken TTL)`.",
      "Dấu hiệu nhận diện bẫy thiết kế: Hễ thấy kiến trúc dùng `HS256` chia sẻ chung Secret giữa nhiều Microservices hoặc lưu `Refresh Token` dài hạn trong `window.localStorage` của trình duyệt -> Chỉ ra ngay rủi ro leo thang đặc quyền liên dịch vụ và đánh cắp phiên qua XSS.",
      "Khi bàn về Refresh Token bị đánh cắp trên Mobile: Nhấn mạnh cơ chế `Refresh Token Rotation + Reuse Detection` (phát hiện dùng lại token cũ đã xoay vòng để chặt đứt toàn bộ nhánh `Token Family`)."
    ],
    summaryTakeaways: [
      "OAuth 2.1 bắt buộc dùng Authorization Code + PKCE (`S256`) cho mọi loại client ứng dụng, loại bỏ hoàn toàn Implicit Flow và Password Grant cũ kỹ.",
      "Luôn ký JWT bằng khóa bất đối xứng (`ES256`/`RS256`), khóa cứng thuật toán ở tầng Decoder và kiểm tra chặt cả `iss` lẫn `aud` để chống Confused Deputy.",
      "Xoay vòng khóa không gián đoạn dựa trên định danh `kid` và giai đoạn duy trì song song khóa cũ (chỉ verify) - khóa mới (sign + verify) trên endpoint JWKS.",
      "Kết hợp Access Token ngắn hạn (3–5 phút), Refresh Token Rotation một lần và Redis `jti`/`min_iat` Denylist giúp đạt hiệu năng cao mà vẫn khóa khẩn cấp tức thời."
    ],
    lessonQuestions: [
      {
        question: "Ngân hàng số X sử dụng JWT Access Token (hạn 5 phút, ký ES256) cho 30 Microservices. Khi khách hàng gọi Hotline báo bị kẻ gian chiếm đoạt điện thoại đang đăng nhập sẵn, kiến trúc nào giúp chặn đứng mọi lệnh chuyển tiền từ phiên đó trong dưới 1 giây mà KHÔNG làm mất lợi thế chịu tải cao của Stateless JWT?",
        options: [
          "Đổi tất cả Microservices sang gọi trực tiếp Database Oracle của Keycloak kiểm tra bảng phiên đăng nhập trong mỗi request HTTP.",
          "Đổi khóa Private Key của toàn bộ Realm Keycloak ngay lập tức mỗi khi có một khách hàng báo mất máy.",
          "Ghi mã `jti` của Token (hoặc mốc thời gian khóa theo `cif`) vào Redis Denylist với TTL đúng bằng thời gian sống còn lại của Access Token, kết hợp hủy toàn bộ Refresh Token của khách hàng đó trên Keycloak.",
          "Giữ nguyên không làm gì vì 5 phút là đủ ngắn, chấp nhận cho kẻ gian giao dịch tối đa trong 5 phút rồi Token tự hết hạn."
        ],
        answer: 2,
        explanation: "Hủy Refresh Token chặn việc xin cấp mới, đồng thời đẩy `jti` (hoặc mốc `min_iat` của `cif`) vào Redis Denylist với TTL ngắn (<= 5 phút) giúp mọi Resource Server từ chối ngay lập tức các Access Token đang còn hạn chỉ với thao tác đọc RAM dưới 1ms, không gây quá tải DB trung tâm và không ảnh hưởng khách hàng khác.",
        wrongReasons: [
          "Truy vấn trực tiếp Database quan hệ của Keycloak trên từng request ở quy mô 30 Microservices sẽ gây nghẽn cổ chai kết nối và làm sập hệ thống giờ cao điểm.",
          "Đổi xóa khóa ký của cả Realm mỗi lần 1 khách mất máy sẽ làm rớt phiên oan uổng của hàng trăm nghìn khách hàng hợp lệ khác đang giao dịch.",
          "",
          "Trong chuyển khoản nhanh liên ngân hàng 24/7, kẻ gian dùng tool tự động chỉ mất 5–10 giây để tẩu tán sạch tiền trong tài khoản; chờ 5 phút là thảm họa mất tiền thật."
        ]
      },
      {
        question: "Trong quá trình tích hợp thêm dịch vụ `Notification-Preference-Service`, lập trình viên vô tình cấu hình dịch vụ `Core-Transfer-Service` chỉ kiểm tra chữ ký JWT và `issuer` của Keycloak mà bỏ qua kiểm tra claim `aud` (Audience). Rủi ro bảo mật thực tế nào sẽ phát sinh?",
        options: [
          "Không có rủi ro nào vì chữ ký số ES256 từ Keycloak đã chứng minh người dùng hoàn toàn hợp pháp.",
          "Dính lỗ hổng Confused Deputy: nếu dịch vụ vệ tinh kém bảo mật bị xâm nhập, kẻ tấn công có thể lấy Access Token vốn chỉ được cấp để đọc cài đặt thông báo mang sang gọi thẳng API của `Core-Transfer-Service`.",
          "Làm thuật toán ES256 tự động chuyển về dạng văn bản thuần không có chữ ký.",
          "Khiến Keycloak không thể thực hiện xoay vòng khóa JWKS định kỳ."
        ],
        answer: 1,
        explanation: "Chữ ký hợp lệ và đúng `iss` chỉ chứng minh Token do Keycloak phát hành, chưa chứng minh Token đó được phép dùng tại dịch vụ đích nào. Thiếu kiểm tra `aud` (Audience) kết hợp phân tách `scope` mở đường cho tấn công Confused Deputy (dùng thẻ ra vào nhà ăn để mở cửa kho tiền).",
        wrongReasons: [
          "Chữ ký đúng từ IdP là điều kiện cần nhưng chưa đủ trong kiến trúc Zero Trust đa dịch vụ nếu không ràng buộc đích nhận `aud` và phạm vi quyền `scope`.",
          "",
          "Việc thiếu kiểm tra claim `aud` ở tầng Validator không làm thay đổi thuật toán mật mã của phần chữ ký JWS.",
          "Cơ chế xoay vòng khóa JWKS hoạt động dựa trên header `kid` và cặp khóa công khai/bí mật, hoàn toàn độc lập với việc kiểm tra claim `aud`."
        ]
      }
    ]
  },

  K2: {
    duration: "65 phút",
    difficulty: "Chuyên sâu (Senior / Integration Architect)",
    codeLang: "java",
    teacherIntro: "Chào em, nếu ở bài K1 chúng ta bảo vệ kênh giao tiếp giữa Người dùng cuối (App/Web) với Ngân hàng, thì sang bài K2 thầy sẽ dẫn em vào chiến trường khốc liệt nhất của mảng Payment Hub: Kết nối Server-to-Server liên ngân hàng, chuyển mạch NAPAS, Ví điện tử và Đối tác Thu hộ/Chi hộ B2B lớn. Ở mặt trận này, một gói tin API đi qua không phải 500 nghìn đồng tiền cà phê, mà có thể là lô giải ngân 50 tỷ đồng! Rất nhiều kỹ sư mới sang mảng Tài chính thường thắc mắc với thầy: 'Thầy ơi, hai bên đã cấu hình kênh riêng hoặc bắt tay chứng chỉ mTLS hai chiều mã hóa kín bưng đường truyền rồi, sao Ngân hàng vẫn ép đối tác phải ký số RSA/ECDSA thêm một lần nữa lên cục JSON Payload (JWS) và gắn Nonce rườm rà thế ạ?'. Hôm nay chúng ta sẽ mổ xẻ tận gốc lý do kỹ thuật lẫn pháp lý đằng sau 'bộ giáp 3 lớp' bất khả xâm phạm này.",
    analogy: {
      title: "Xe bọc thép liên ngân hàng: Kiểm thẻ trạm gác 2 chiều + Thùng tiền kẹp chì niêm phong sáp + Phiếu xuất kho ghi giờ duy nhất",
      body: "Em hãy tưởng tượng việc chuyển 50 tỷ giữa Đối tác Fintech A và Ngân hàng B. Lớp thứ nhất là `mTLS hai chiều`: giống như trạm gác cổng kho bạc kiểm tra giấy thông hành có đóng dấu Bộ Công an của tài xế xe bọc thép A, đồng thời tài xế A cũng kiểm tra đúng phù hiệu kho bạc B mới chịu mở cửa xe — kẻ lạ ngoài đường tuyệt đối không lái xe chui vào cổng được. Nhưng khi thùng tiền đã qua cổng trạm gác (tức đi qua con Load Balancer / API Gateway bên ngoài), nó được chuyển lên băng chuyền nội bộ qua tay nhiều nhân viên kho. Làm sao chắc chắn không ai giữa đường tráo tờ lệnh chi bên trong, và sau này nếu đối tác A cãi 'Hôm qua tôi chỉ bảo chi 50 triệu chứ đâu phải 50 tỷ!' thì lấy bằng chứng đâu ra tòa? Đó chính là lớp thứ hai `Chữ ký số Payload (JWS)`: thùng tiền được chính Tổng giám đốc A đóng dấu sáp niêm phong riêng không ai làm giả được, giữ nguyên vẹn làm bằng chứng pháp lý 10 năm! Còn lớp thứ ba `Timestamp + Nonce` giống như số seri phiếu xuất kho kèm đồng hồ bấm giờ: ngăn kẻ gian chụp lén nguyên thùng tiền có dấu thật rồi nhân bản gửi lặp lại 5 chuyến liên tiếp!"
    },
    objectives: [
      "Hiểu sâu cơ chế bắt tay Mutual TLS (mTLS 1.3), kiểm tra chuỗi chứng thư số (`TrustStore`/`KeyStore`), đối chiếu định danh `CN/SAN` và quản lý thu hồi chứng chỉ đối tác (`CRL`/`OCSP`).",
      "Giải thích sắc bén tại sao có mTLS vẫn bắt buộc ký số Payload (`JWS` chuẩn RFC 7515 với `RSASSA-PSS` hoặc `ES256`) để bảo toàn tính toàn vẹn đầu-cuối và tính chống chối bỏ pháp lý (`Non-repudiation`).",
      "Xây dựng hoàn chỉnh bộ lọc xác thực chữ ký số kết hợp chống tấn công phát lại (`Anti-Replay Attack`) bằng cửa sổ thời gian `Timestamp` và khóa nguyên tử `Redis SETNX` cho `Nonce`."
    ],
    flow: [
      {
        step: "1. Bắt tay mTLS Hai chiều tại Biên mạng (Transport Layer)",
        detail: "API Gateway Ngân hàng trình Server Certificate và phát lệnh `CertificateRequest` buộc máy chủ Đối tác xuất trình Client Certificate hợp lệ nằm trong Private TrustStore, trích xuất `Subject DN / Thumbprint` gắn vào header nội bộ tin cậy."
      },
      {
        step: "2. Kiểm tra Cửa sổ Thời gian & Chặn Replay bằng Nonce Nguyên tử",
        detail: "Dịch vụ Payment Hub kiểm tra `|now - X-Timestamp| <= 180s` để loại bỏ gói tin quá hạn, sau đó chạy lệnh nguyên tử `SET replay:<partnerId>:<nonce> 1 NX EX 360` trên Redis; nếu trả về `false` (đã từng xuất hiện), lập tức chặn đứng."
      },
      {
        step: "3. Chuẩn hóa Dữ liệu & Xác thực Chữ ký Số Payload (Application Layer)",
        detail: "Ghép chuỗi chuẩn hóa gồm `partnerId | timestamp | nonce | HTTP Method | URI | rawRequestBody` và kiểm chứng chữ ký `X-JWS-Signature` bằng `Public Key` riêng của đối tác đó (thuật toán `RSASSA-PSS` hoặc `ECDSA P-256`)."
      },
      {
        step: "4. Lưu Bằng chứng Chống Chối bỏ & Ký Phản hồi Chiều về",
        detail: "Lưu nguyên vẹn `rawRequestBody` kèm chuỗi chữ ký `X-JWS-Signature` của đối tác vào bảng lưu trữ kiểm toán/đối soát dài hạn trước khi hạch toán, đồng thời ký số JWS bằng Private Key của Ngân hàng trên bản tin Response trả về."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Mutual TLS (mTLS): Chốt chặn danh tính cấp độ Kênh truyền",
        paragraphs: [
          "Trong giao thức HTTPS thông thường mà trình duyệt người dùng hay gọi, việc xác thực diễn ra một chiều: chỉ Client kiểm tra chứng chỉ số của Server ngân hàng, còn Server chấp nhận kết nối TCP/TLS từ bất kỳ máy tính nào trên Internet. Nhưng với cổng B2B/Open Banking kết nối trực tiếp hệ thống kế toán doanh nghiệp (ERP), đối tác ví điện tử hay chuyển mạch liên ngân hàng, chúng ta áp dụng `Mutual TLS (mTLS)` — nơi cả hai đầu kết nối đều phải chứng minh danh tính mật mã ngay ở tầng giao vận (Transport Layer) trước khi bất kỳ byte HTTP Header hay JSON nào kịp đi qua!",
          "Trong quá trình TLS Handshake (khuyến nghị khóa chặt từ `TLSv1.3` hoặc tối thiểu `TLSv1.2` với các bộ mã hóa Perfect Forward Secrecy như `TLS_AES_256_GCM_SHA384`), sau khi Server gửi chứng chỉ của mình, Server gửi tiếp thông điệp `CertificateRequest` chứa danh sách các tổ chức cấp phát (`Distinguished Names` của CA) mà ngân hàng tin tưởng. Máy chủ đối tác bắt buộc gửi trả chuỗi `Client Certificate` của mình kèm thông điệp `CertificateVerify` — một chữ ký số được ký trực tiếp bằng `Private Key` của đối tác lên bản băm toàn bộ lịch sử phiên bắt tay tính đến thời điểm đó. Nhờ vậy, kẻ nghe lén dù lấy trộm được file chứng chỉ công khai `.crt` của đối tác cũng hoàn toàn bất lực vì không có `Private Key` để sinh bản tin `CertificateVerify`.",
          "Một bẫy triển khai thực tế mà các Senior Java cần đặc biệt tỉnh táo là hiện tượng `Certificate Confusion` giữa các đối tác: Nếu `TrustStore` của ngân hàng tin tưởng chung một CA phát hành chứng chỉ cho 50 đối tác Fintech (Fintech A, Fintech B...), thì chỉ bật `client-auth=need` mới chứng minh được 'Người gọi là một trong 50 đối tác hợp lệ', chứ chưa ngăn được Fintech A có chứng chỉ thật nhưng cố tình truyền header `X-Partner-Id: FINTECH_B`! Do đó, tầng Gateway/Backend bắt buộc phải đối chiếu chéo trường `CN` / `SAN` hoặc mã băm chứng chỉ `SHA-256 Certificate Thumbprint` (chuẩn RFC 8705 Certificate-Bound Access Tokens) khớp 1-1 với `partnerId` khai báo trong hồ sơ đối tác."
        ],
        bullets: [
          "Tách biệt rạch ròi `KeyStore` và `TrustStore`: `KeyStore` (PKCS#12) giữ cặp khóa riêng và chứng chỉ của bản thân dịch vụ mình để đi xưng danh; `TrustStore` chỉ chứa các chứng chỉ Root/Intermediate CA công khai dùng để thẩm định đối phương.",
          "Giám sát hạn chứng chỉ & Thu hồi khẩn cấp: Đặt cảnh báo Prometheus tự động trước `30 ngày` khi chứng chỉ mTLS sắp hết hạn (rất nhiều vụ sập thanh toán liên ngân hàng nửa đêm chỉ vì quên gia hạn cert 1 năm!) và bật kiểm tra `CRL` / `OCSP` để cắt quyền ngay khi đối tác báo lộ khóa.",
          "Xử lý mTLS Termination tại DMZ Proxy: Trong thực tế ngân hàng, mTLS thường dừng tại F5/Kong/Envoy vùng DMZ để kiểm tra WAF; khi chuyển tiếp vào mạng trong, Proxy phải xóa sạch mọi header giả mạo từ ngoài rồi mới đính kèm `X-SSL-Client-Cert-Thumbprint` qua kênh nội bộ được bảo vệ nghiêm ngặt."
        ]
      },
      {
        heading: "2. Chữ ký số Payload (JWS Detached) và giá trị sống còn của Chống chối bỏ (Non-repudiation)",
        paragraphs: [
          "Quay lại câu hỏi phỏng vấn triệu đô ở đầu bài: 'Tại sao đã có mTLS mã hóa và xác thực hai chiều rồi mà mọi chuẩn liên ngân hàng (NAPAS 24/7, ISO 20022, VietQR Webhook, Open Banking FAPI) vẫn bắt buộc ký số lên bản thân nội dung bản tin (Application-level Digital Signature)?'. Câu trả lời nằm ở hai trụ cột mà mTLS hoàn toàn không thể gánh vác: Tính toàn vẹn đầu-cuối (`End-to-End Integrity`) và Tính chống chối bỏ về mặt pháp lý (`Non-repudiation`).",
          "Thứ nhất, mTLS là bảo mật điểm-tới-điểm (Point-to-Point) ở tầng mạng. Ngay khoảnh khắc gói tin bước qua thiết bị Load Balancer, WAF hay API Gateway đầu tiên ở vùng biên DMZ, lớp vỏ TLS bên ngoài đã được giải mã thành văn bản rõ để định tuyến qua hàng loạt thành phần trung gian (API Gateway -> Kafka Topic -> Payment Orchestrator -> Core Adapter). Nếu không có chữ ký số gắn chặt vào Payload, một lỗ hổng cấu hình trên Gateway, một script xử lý trung gian bị lỗi hoặc một quản trị viên hệ thống biến chất có quyền truy cập Kafka có thể sửa số tài khoản nhận trong gói JSON mà dịch vụ Core phía cuối không hề hay biết!",
          "Thứ hai — và quan trọng hơn cả trước pháp luật — mTLS chỉ tạo ra khóa phiên đối xứng tạm thời (`Ephemeral Session Key`) mà cả hai bên Client và Server đều cùng biết trong lúc truyền tin rồi xóa đi. Giả sử 3 tháng sau xảy ra tranh chấp kiện tụng giao dịch chi hộ 10 tỷ đồng: nếu ngân hàng chỉ trưng ra dòng text JSON lưu trong Database của mình, đối tác hoàn toàn có thể cãi trước Tòa rằng 'Dòng log JSON đó nằm trên ổ cứng của Ngân hàng, nhân viên Ngân hàng tự gõ thêm số 0 vào chứ chúng tôi không gửi!'. Nhưng khi đối tác bắt buộc ký bản tin bằng thuật toán bất đối xứng chuẩn `RSASSA-PSS` hoặc `ECDSA (ES256)` theo chuẩn `Detached JWS` (RFC 7515 Appendix F) — nơi `Private Key` chỉ một mình HSM của đối tác nắm giữ — thì chuỗi chữ ký số lưu kèm bản tin gốc chính là con dấu pháp lý sắc thép không thể chối cãi trước bất kỳ cơ quan giám định độc lập nào!"
        ],
        bullets: [
          "Cạm bẫy chết người khi đọc `HttpServletRequest.getInputStream()` trong Java: Luồng InputStream của Servlet chỉ đọc được đúng 1 lần duy nhất; nếu đọc ở Filter để kiểm tra chữ ký xong không bọc lại bằng `CachedBodyHttpServletRequest`, `@RequestBody` của Controller phía sau sẽ nhận chuỗi rỗng hoặc ném lỗi!",
          "Ký trên chuỗi byte gốc (`Raw Bytes`), không ký trên Object đã Parse rồi Serialize lại: Nếu đối tác gửi `{\"amount\":100.00,\"note\":\"A\"}` mà bên nhận parse sang `Map`/DTO rồi `ObjectMapper.writeValueAsString()` lại thành `{\"note\":\"A\",\"amount\":100.0}`, thứ tự trường hoặc số 0 thập phân thay đổi làm lệch hoàn toàn bản băm SHA-256 khiến chữ ký luôn báo sai!",
          "Ưu tiên chuẩn `Detached JWS` (`<base64UrlHeader>..<base64UrlSignature>` trong header `X-JWS-Signature`): Giúp giữ nguyên thân HTTP Body là JSON thuần sạch sẽ dễ đọc/routing, đồng thời ký gộp cả ngữ cảnh HTTP Method, đường dẫn URI, `Timestamp` và `Nonce` để chống cắt ghép chữ ký sang API khác."
        ]
      },
      {
        heading: "3. Phòng chống Tấn công Phát lại (Anti-Replay Attack) với Timestamp + Redis SETNX",
        paragraphs: [
          "Giả sử chữ ký số JWS của đối tác cực kỳ hoàn hảo, không ai sửa được dù chỉ 1 bit dữ liệu. Vậy chuyện gì xảy ra nếu có một thành phần độc hại trên đường mạng trung gian, hoặc một lỗi retry vô tận ở tầng proxy đối tác, chụp nguyên xi gói tin `POST /api/v1/payout` (gồm cả JSON gốc và chữ ký JWS hợp lệ 100%) rồi bắn lặp lại y hệt gói tin đó vào cổng Ngân hàng lần thứ 2, lần thứ 3? Nếu hệ thống chỉ kiểm tra chữ ký số, cả 3 lần chữ ký đều báo `VALID` và ngân hàng sẽ giải ngân 3 lần số tiền! Kịch bản tấn công kinh điển này gọi là `Replay Attack` (Tấn công phát lại).",
          "Nếu chỉ dùng mỗi `X-Request-Nonce` (mã ngẫu nhiên duy nhất cho từng gói tin) để chống Replay mà không có `X-Timestamp`, ngân hàng sẽ phải lưu danh sách hàng chục tỷ mã Nonce từ năm này qua năm khác trong bộ nhớ/CSDL để tra cứu — điều bất khả thi về dung lượng RAM! Ngược lại, nếu chỉ kiểm tra `X-Timestamp` nằm trong khoảng `±3 phút` mà không có `Nonce`, kẻ tấn công vẫn có dư dả 360 giây vàng ngọc để bắn lặp gói tin đó hàng chục nghìn lần liên tiếp!",
          "Vì vậy, chuẩn thiết kế bắt buộc trong hệ thống thanh toán là kết hợp chặt chẽ Cửa sổ Thời gian (`Timestamp Window`) và Khóa Nguyên tử `Nonce` có thời hạn (`Bounded Nonce Deduplication`). Khi gói tin tới: Bước 1 kiểm tra độ lệch đồng hồ `|serverNow - requestTimestamp| <= MAX_SKEW` (thường là 180 giây, yêu cầu máy chủ hai bên đồng bộ giờ chuẩn qua NTP); nếu gói tin cũ quá 3 phút hoặc đến từ tương lai quá 3 phút, loại bỏ ngay từ vòng gửi xe mà không tốn một byte Redis nào. Bước 2 thực hiện ghi nguyên tử lên Redis bằng lệnh `SET replay:<partnerId>:<nonce> 1 NX EX 360`. Quy tắc toán học sống còn mà rất nhiều kỹ sư làm sai khi đi phỏng vấn: Thời gian sống `TTL` của Nonce trên Redis BẮT BUỘC phải lớn hơn hoặc bằng `2 × MAX_SKEW` (ví dụ `MAX_SKEW = 180s` thì `TTL >= 360s`, bởi một gói tin gửi sớm `+179s` từ đồng hồ đối tác chạy nhanh vẫn còn nằm trong cửa sổ hợp lệ suốt gần 6 phút tính theo đồng hồ Server!)."
        ],
        bullets: [
          "Phân tách không gian tên Nonce theo đối tác (`replay:<partnerId>:<nonce>`): Không bao giờ lưu chung `replay:<nonce>` toàn cục để tránh việc Đối tác A vô tình hay cố ý sinh trùng chuỗi Nonce làm chặn nhầm giao dịch của Đối tác B.",
          "Phân biệt rạch ròi `Anti-Replay Nonce` (Bảo mật kênh gọi) và `Idempotency-Key` (Lũy đẳng nghiệp vụ): `Nonce` phải đổi mới ở mỗi lần gửi gói tin vật lý trên mạng (kể cả khi đối tác bấm Retry do ReadTimeout, lần Retry phải ký lại với `Timestamp` và `Nonce` mới, nhưng giữ nguyên `Idempotency-Key` cũ của giao dịch để Core trả về đúng kết quả ban đầu mà không trừ tiền hai lần!).",
          "Thứ tự kiểm tra tối ưu chống cạn kiệt CPU (DoS Protection): Kiểm tra định dạng Header & cửa sổ `Timestamp` (rẻ nhất, tốn vài nano-giây) -> Kiểm tra chữ ký RSA/ECDSA trước khi ghi `Nonce` vào Redis -> Cuối cùng mới đẩy vào xử lý nghiệp vụ và Database."
        ]
      }
    ],
    comparison: {
      title: "Bảng phân tích vai trò các lớp bảo mật tích hợp B2B / Liên ngân hàng",
      headers: ["Lớp bảo mật", "Mục tiêu bảo vệ chính", "Phạm vi hiệu lực", "Điều gì xảy ra nếu thiếu lớp này?"],
      rows: [
        [
          "TLS 1 chiều + API Key tĩnh",
          "Mã hóa đường truyền cơ bản và định danh sơ bộ ứng dụng gọi",
          "Chỉ từ Client tới Reverse Proxy đầu tiên",
          "Lộ API Key là bất kỳ máy chủ nào trên Internet cũng giả mạo gọi lệnh rút tiền được"
        ],
        [
          "Mutual TLS (`mTLS` 2 chiều)",
          "Xác thực mật mã song phương danh tính hai máy chủ ngay tầng kết nối TCP/TLS",
          "Điểm-tới-điểm (chấm dứt tại Load Balancer / API Gateway biên)",
          "Mở cổng API ra cho lưu lượng không được cấp chứng chỉ; nhưng đứng một mình vẫn thiếu bằng chứng chống chối bỏ sau Gateway"
        ],
        [
          "Chữ ký số Payload (`JWS` RSA-PSS / ES256)",
          "Đảm bảo toàn vẹn dữ liệu đầu-cuối và tính chống chối bỏ pháp lý (`Non-repudiation`)",
          "Xuyên suốt từ lúc tạo bản tin tới kho lưu trữ đối soát 10 năm",
          "Dữ liệu có thể bị sửa đổi ở tầng trung gian nội bộ và ngân hàng thua kiện khi tranh chấp nội dung lệnh gốc với đối tác"
        ],
        [
          "Cửa sổ `Timestamp` + `Nonce` (`Redis SETNX`)",
          "Chống tấn công thu thập và phát lại gói tin hợp lệ (`Anti-Replay Attack`)",
          "Khóa duy nhất từng lượt truyền vật lý trong khung thời gian trượt",
          "Gói tin có chữ ký thật bị kẻ nghe lén hoặc lỗi mạng phát lặp lại gây chi tiền trùng nhiều lần"
        ]
      ]
    },
    codeTitle: "Filter Xác thực Chữ ký Số RSASSA-PSS (Detached JWS) kết hợp Chống Replay qua Timestamp & Redis SETNX",
    code: [
      "@Component",
      "public class InterbankJwsAntiReplayFilter extends OncePerRequestFilter {",
      "    private static final Duration MAX_SKEW = Duration.ofMinutes(3);",
      "    private final StringRedisTemplate redis;",
      "    private final PartnerKeyRegistry keyRegistry;",
      "",
      "    public InterbankJwsAntiReplayFilter(StringRedisTemplate redis, PartnerKeyRegistry keyRegistry) {",
      "        this.redis = redis; this.keyRegistry = keyRegistry;",
      "    }",
      "",
      "    @Override",
      "    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)",
      "            throws ServletException, IOException {",
      "        CachedBodyHttpServletRequest cachedReq = new CachedBodyHttpServletRequest(req);",
      "        String partnerId = cachedReq.getHeader(\"X-Partner-Id\");",
      "        String nonce = cachedReq.getHeader(\"X-Request-Nonce\");",
      "        long epochSec = Long.parseLong(Objects.requireNonNull(cachedReq.getHeader(\"X-Timestamp\")));",
      "        if (Duration.between(Instant.ofEpochSecond(epochSec), Instant.now()).abs().compareTo(MAX_SKEW) > 0) {",
      "            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, \"Timestamp outside allowed skew window\"); return;",
      "        }",
      "        byte[] canonical = (partnerId + \"|\" + epochSec + \"|\" + nonce + \"|\" + cachedReq.getMethod()",
      "            + \"|\" + cachedReq.getRequestURI() + \"|\" + cachedReq.getBodyUtf8()).getBytes(StandardCharsets.UTF_8);",
      "        byte[] sigBytes = Base64.getUrlDecoder().decode(cachedReq.getHeader(\"X-JWS-Signature\"));",
      "        if (!verifyRsaPss(keyRegistry.resolvePublicKey(partnerId), canonical, sigBytes)) {",
      "            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, \"Invalid partner JWS payload signature\"); return;",
      "        }",
      "        String replayKey = \"replay:\" + partnerId + \":\" + nonce;",
      "        if (!Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(replayKey, \"1\", MAX_SKEW.multipliedBy(2)))) {",
      "            res.sendError(HttpServletResponse.SC_CONFLICT, \"Replay attack blocked for duplicate nonce\"); return;",
      "        }",
      "        chain.doFilter(cachedReq, res);",
      "    }",
      "",
      "    private boolean verifyRsaPss(PublicKey key, byte[] payload, byte[] sigBytes) {",
      "        try {",
      "            Signature verifier = Signature.getInstance(\"RSASSA-PSS\");",
      "            verifier.setParameter(new PSSParameterSpec(\"SHA-256\", \"MGF1\", MGF1ParameterSpec.SHA256, 32, 1));",
      "            verifier.initVerify(key); verifier.update(payload); return verifier.verify(sigBytes);",
      "        } catch (GeneralSecurityException ex) { return false; }",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Bọc `HttpServletRequest` bằng `CachedBodyHttpServletRequest`: Lưu mảng byte của Body vào bộ nhớ đệm một lần để vừa lấy chuỗi byte gốc kiểm tra chữ ký chính xác từng dấu cách, vừa cho phép `@RequestBody` ở Controller phía sau đọc lại JSON bình thường.",
      "Chuỗi ký chuẩn hóa (`canonical`) ghép đủ 6 thành phần `partnerId | timestamp | nonce | method | URI | rawBody`: Ngăn chặn hoàn toàn kiểu tấn công lấy chữ ký hợp lệ của API truy vấn hoặc của một mốc thời gian khác gắn sang API giải ngân.",
      "Kiểm chứng chữ ký `verifyRsaPss` TRƯỚC khi ghi `setIfAbsent` vào Redis, và đặt TTL bằng `MAX_SKEW.multipliedBy(2)` (6 phút cho độ lệch `±3 phút`): Giúp kẻ tấn công không có khóa ký không thể bắn rác làm tràn RAM Redis, đồng thời bít kín kẽ hở lệch đồng hồ ở hai biên cửa sổ thời gian.",
      "Sử dụng thuật toán `RSASSA-PSS` với `SHA-256` (chuẩn PKCS#1 v2.1 hiện đại thay cho PKCS#1 v1.5 cũ): Đây là chuẩn chữ ký RSA an toàn được khuyến nghị trong đặc tả Open Banking FAPI và kết nối tài chính thế hệ mới."
    ],
    labGuide: {
      goal: "Thiết lập kênh kết nối B2B có bắt tay mTLS hai chiều trên Spring Boot 3, kết hợp Filter ký/xác thực chữ ký số RSASSA-PSS và kiểm thử chặn đứng tấn công Replay cũng như sửa trộm số tiền.",
      steps: [
        "Bước 1: Dùng `keytool` hoặc `openssl` tạo 1 Root CA nội bộ, từ đó cấp phát 1 chứng chỉ cho `bank-server` và 1 chứng chỉ cho `fintech-partner`; bật cấu hình `server.ssl.client-auth=need` trên Spring Boot kèm `trust-store` chứa Root CA.",
        "Bước 2: Cài đặt lớp `CachedBodyHttpServletRequest` và `InterbankJwsAntiReplayFilter`; sinh cặp khóa ký Payload RSA-2048 riêng cho `fintech-partner` để ký thông điệp chuyển tiền chi hộ.",
        "Bước 3: Viết bài Integration Test gửi 1 giao dịch hợp lệ qua `RestClient` gắn SSL Bundle của đối tác -> Xác nhận trả về `200 OK`. Ngay lập tức bắn lại nguyên xi gói tin vừa gửi (cùng `Nonce` và `X-JWS-Signature`) -> Xác nhận bị chặn với mã `409 Conflict`.",
        "Bước 4: Thử tạo gói tin mới có `Nonce` mới nhưng sửa trường `amount` từ `100000` thành `900000` mà giữ nguyên chữ ký cũ (hoặc gửi `X-Timestamp` lùi về 10 phút trước) -> Xác nhận bị chặn đứng với mã `401 Unauthorized`."
      ],
      expectedOutput: "Kết nối không có Client Certificate bị từ chối ngay từ tầng bắt tay TLS; gói tin sửa dù chỉ 1 dấu cách trong JSON hoặc phát lại lần thứ 2 đều bị chặn 100% trước khi chạm tới tầng Service hạch toán."
    },
    examTips: [
      "Câu hỏi tủ vòng Kiến trúc sư: 'Đã có mTLS sao còn bắt ký JWS?' -> Phải nêu bật được 2 từ khóa vàng: `mTLS terminates at Edge/Gateway` (mất bảo vệ trên chặng nội bộ) và `Legal Non-repudiation` (chống chối bỏ pháp lý dài hạn khi đối soát tranh chấp).",
      "Bẫy công thức TTL của Nonce chống Replay: Nếu cửa sổ chấp nhận độ lệch đồng hồ là `±Δt` (ví dụ `±3 phút`), thì TTL lưu Nonce trên Redis tối thiểu phải là `2 × Δt` (`6 phút`), nếu đặt TTL chỉ `3 phút` thì gói tin gửi khống đồng hồ `+2 phút 50 giây` sẽ hết TTL trên Redis lúc vẫn còn hợp lệ thêm gần 3 phút nữa!",
      "Phân biệt câu hỏi về Retry khi Timeout: Khi mạng đứt chờ phản hồi, đối tác gọi lại phải sinh `Nonce` mới + `Timestamp` mới + ký `JWS` mới cho lần truyền đó, nhưng giữ nguyên `Idempotency-Key` trong nghiệp vụ để không bị chặn nhầm là Replay mà vẫn không bị trừ tiền đúp."
    ],
    summaryTakeaways: [
      "mTLS xác thực hai chiều danh tính máy chủ ở tầng kênh truyền mạng, cần đi kèm kiểm tra khớp `Certificate Thumbprint / CN` với mã đối tác để tránh mạo danh chéo.",
      "Chữ ký số Payload (`JWS` với `RSASSA-PSS` / `ES256`) đi theo dữ liệu từ đầu đến cuối và đóng vai trò bằng chứng pháp lý chống chối bỏ không thể thay thế bởi HTTPS/mTLS.",
      "Luôn xác thực chữ ký trên mảng byte nguyên bản (`Raw Request Body`) kết hợp `CachedBodyHttpServletRequest` và ràng buộc cả HTTP Method, URI, Timestamp, Nonce vào dữ liệu ký.",
      "Chống Replay chuẩn mực đòi hỏi kết hợp cả cửa sổ `Timestamp` hẹp (đồng bộ NTP) lẫn lưu vết nguyên tử `Redis SETNX` với `TTL >= 2 × MAX_SKEW`."
    ],
    lessonQuestions: [
      {
        question: "Trong kết nối API chi hộ tự động giữa Ngân hàng và Đối tác Chứng khoán, hệ thống đã triển khai mTLS hai chiều tại cụm Load Balancer F5 vùng DMZ. Tại sao Hội đồng Rủi ro Ngân hàng vẫn yêu cầu bắt buộc Đối tác phải ký số JWS (RSASSA-PSS) trên từng bản tin yêu cầu chi tiền?",
        options: [
          "Vì giao thức TLS 1.3 hoàn toàn không mã hóa phần thân HTTP Body khi đi qua cáp quang Internet.",
          "Vì mTLS kết thúc tại Load Balancer biên và dùng khóa phiên đối xứng tạm thời, nên không bảo vệ được tính toàn vẹn dữ liệu trên các chặng trung gian nội bộ cũng như không tạo ra bằng chứng chống chối bỏ (Non-repudiation) lưu trữ phục vụ tranh chấp pháp lý.",
          "Vì chữ ký số JWS giúp nén dung lượng gói tin JSON nhỏ đi 80% so với gửi văn bản thường.",
          "Vì Spring Boot 3 không hỗ trợ đọc dữ liệu từ các kết nối có bật chứng chỉ mTLS."
        ],
        answer: 1,
        explanation: "mTLS chỉ bảo vệ kênh truyền điểm-tới-điểm tới thiết bị chấm dứt TLS (Load Balancer/Gateway) và khóa phiên đối xứng cả hai bên đều biết. Chữ ký số bất đối xứng JWS gắn trực tiếp vào bản tin đảm bảo toàn vẹn xuyên suốt tới tận Core và là bằng chứng pháp lý chứng minh chỉ người giữ Private Key (Đối tác) mới tạo ra được lệnh chi tiền đó.",
        wrongReasons: [
          "TLS 1.3 mã hóa toàn bộ lưu lượng ứng dụng bao gồm URL path, HTTP Headers và HTTP Body trên đường truyền mạng.",
          "",
          "Chữ ký số JWS làm tăng thêm vài trăm byte Header chữ ký Base64URL chứ hoàn toàn không phải thuật toán nén dữ liệu.",
          "Spring Boot 3 hỗ trợ đầy đủ mTLS thông qua cấu hình SSL Bundles (`server.ssl.client-auth=need`) hoặc nhận thông tin chứng chỉ từ Reverse Proxy."
        ]
      },
      {
        question: "Một lập trình viên cài đặt bộ lọc chống Replay cho cổng thanh toán với quy tắc: chấp nhận gói tin có `|now - X-Timestamp| <= 5 phút`, và lưu mã `Nonce` vào Redis bằng lệnh `SETNX` với thời gian sống `TTL = 2 phút`. Lỗ hổng nghiêm trọng nào tồn tại trong thiết kế này?",
        options: [
          "Kẻ tấn công bắt được gói tin hợp lệ, chỉ cần chờ 2 phút 01 giây cho khóa `Nonce` tự xóa khỏi Redis rồi phát lại nguyên gói tin đó thì cả `Timestamp` (vẫn dưới 5 phút) lẫn chữ ký số đều hợp lệ, khiến ngân hàng thực hiện giao dịch trùng lặp!",
          "Redis không hỗ trợ đặt thời gian hết hạn TTL tính bằng phút cho lệnh `SETNX`.",
          "Cửa sổ thời gian 5 phút làm hàm băm SHA-256 tính ra kết quả ngẫu nhiên khác nhau mỗi giây.",
          "Lệnh `SETNX` trên Redis tự động khóa cứng toàn bộ bảng tài khoản trong PostgreSQL suốt 2 phút."
        ],
        answer: 0,
        explanation: "Để chặn triệt để Replay trong toàn bộ khung thời gian hợp lệ `±5 phút` (tổng bề rộng từ `-5 phút` đến `+5 phút` là `10 phút`), thời gian lưu giữ `Nonce` trong Redis bắt buộc phải tối thiểu `TTL >= 10 phút` (`2 × MAX_SKEW`). Đặt TTL ngắn hơn cửa sổ cho phép mở toang cánh cửa phát lại ngay khi khóa Redis vừa hết hạn.",
        wrongReasons: [
          "",
          "Lệnh `SET key val NX EX seconds` (tương ứng `setIfAbsent(key, val, Duration)`) hỗ trợ đặt TTL nguyên tử đến từng giây hoặc mili-giây.",
          "Hàm băm SHA-256 là hàm tất định (deterministic): cùng một chuỗi đầu vào luôn cho ra cùng một giá trị băm bất kể thời điểm chạy.",
          "Redis là bộ nhớ in-memory hoàn toàn độc lập, thao tác `SETNX` tốn dưới 1ms và không liên quan gì đến khóa bảng trong PostgreSQL."
        ]
      }
    ]
  },

  K3: {
    duration: "70 phút",
    difficulty: "Chuyên sâu (Principal / Cryptography & Data Security)",
    codeLang: "java",
    teacherIntro: "Chào em, hôm nay chúng ta đi vào một trong những bài giảng 'nặng đô' và đắt giá nhất của toàn khóa học: Mật mã học thực chiến, HSM/KMS, Envelope Encryption và kỹ thuật Blind Index. Đi làm dự án ngân hàng, chắc chắn em sẽ gặp yêu cầu từ khối An toàn thông tin (InfoSec) và Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân: 'Toàn bộ số CCCD, số hộ chiếu, số tài khoản liên kết và thu nhập của 15 triệu khách hàng trong bảng `customers` phải được mã hóa cấp độ ứng dụng (Application-level Encryption); ngay cả DBA có quyền mở file dữ liệu gốc cũng không được phép đọc thấy số CCCD thật!'. Nghe xong đề bài, nhiều bạn hăm hở lôi `AES` ra mã hóa rồi va ngay vào bức tường thép: một là dùng nhầm `AES/ECB` hoặc gắn cứng `IV = \"1234567890123456\"` làm hở toang khóa mật mã; hai là sau khi mã hóa chuẩn ngẫu nhiên xong thì câu lệnh `SELECT * FROM customers WHERE cccd = ?` chết đứng không tìm được khách hàng nữa! Bài K3 sẽ trao cho em lời giải chuẩn mực nhất mà các ngân hàng Tier-1 đang vận hành.",
    analogy: {
      title: "Chiếc chìa khóa mẹ đúc chết trong hầm bê tông (HSM) và danh bạ mật danh tìm hồ sơ không cần mở két",
      body: "Em hãy hình dung ngân hàng có 15 triệu bộ hồ sơ mật của khách hàng. Nếu dùng duy nhất 1 chiếc chìa khóa khổng lồ mang ra tận bàn làm việc của 100 nhân viên để mở từng phong bì, chiếc chìa khóa đó sớm muộn cũng bị chụp lén làm giả. Thay vào đó, ngân hàng đặt Chiếc chìa khóa Mẹ (`KEK` - Key Encryption Key) nằm vĩnh viễn bên trong một cỗ máy thép tự hủy nếu bị cạy phá dưới tầng hầm (`HSM`). Hằng tháng, ứng dụng tạo ra một Chìa khóa Con (`DEK` - Data Encryption Key) để khóa nhanh các phong bì hồ sơ bằng ổ khóa chống dò sửa (`AES-256-GCM`), rồi gửi Chìa khóa Con xuống hầm nhờ máy HSM bọc kín lại (`Envelope Encryption`) cất kèm hồ sơ. Thế còn khi khách đọc số CCCD tại quầy, làm sao tìm đúng phong bì của khách giữa 15 triệu phong bì đã khóa kín mà không phải mở tung cả 15 triệu cái ra xem? Nhân viên sẽ đưa số CCCD qua một cỗ máy đóng dấu mật danh bí mật (`HMAC-SHA256` giữ khóa riêng trong HSM) để ra mã nhãn dán ngoài bìa (ví dụ `#9F2A...` — `Blind Index`), tra mục lục chữ cái đúng 1 tích tắc là rút trúng phóc hồ sơ cần tìm!"
    },
    objectives: [
      "Làm chủ cơ chế `AES-256-GCM` (Authenticated Encryption with Associated Data - AEAD), hiểu rõ tại sao cấm tuyệt đối `AES/ECB` và tại sao trùng lặp `IV 12-byte` sẽ phá vỡ hoàn toàn tính bảo mật.",
      "Thiết kế kiến trúc quản trị khóa 2 tầng `Envelope Encryption` (`KEK` nằm bất biến trong phần cứng `HSM PKCS#11` / `Cloud KMS` bọc các khóa `DEK` có đánh phiên bản `v1`, `v2` để xoay vòng khóa êm ái).",
      "Giải quyết triệt để bài toán tìm kiếm chính xác tốc độ `O(log N)` trên cột dữ liệu đã mã hóa ngẫu nhiên bằng kỹ thuật `HMAC-SHA256 Blind Index` chống tấn công Rainbow Table."
    ],
    flow: [
      {
        step: "1. Khởi tạo & Mở phong bì Khóa Dữ liệu (Envelope Unwrap DEK)",
        detail: "Khi khởi động hoặc xoay khóa, dịch vụ gửi bản mã `Encrypted DEK` vào HSM/KMS (nơi giữ `Master Key / KEK` không bao giờ xuất ra ngoài) để giải bọc lấy `Active DEK` nạp an toàn vào bộ nhớ đệm hạn chế trên RAM."
      },
      {
        step: "2. Mã hóa Xác thực AES-256-GCM gắn Ngữ cảnh (AAD)",
        detail: "Với mỗi trường nhạy cảm (CCCD), sinh mới `12 bytes IV` từ `SecureRandom`, gắn `AAD` (ví dụ `customerId` + tên cột) để chống tráo đổi bản mã giữa các dòng, mã hóa sinh `Ciphertext + 16 bytes AuthTag` và đóng gói dạng `v1:<Base64(IV + Ciphertext + Tag)>`."
      },
      {
        step: "3. Sinh Chỉ mục Mù (HMAC Blind Index) cho Cột Tìm kiếm",
        detail: "Chuẩn hóa chuỗi CCCD (cắt khoảng trắng), đưa vào hàm `HMAC-SHA256` với một khóa bí mật `Pepper Key` tách biệt hoàn toàn với `DEK` để tạo giá trị tất định `cccd_bidx` có đánh `B-Tree UNIQUE INDEX` trong PostgreSQL/Oracle."
      },
      {
        step: "4. Truy vấn Tốc độ Cao & Kiểm chứng Toàn vẹn khi Giải mã",
        detail: "Khi tra cứu theo CCCD, ứng dụng tính `HMAC(input)` truy vấn thẳng `WHERE cccd_bidx = ?` mất < 1ms, đọc tiền tố phiên bản khóa (`v1:`), truyền đúng `AAD` để `AES-GCM` vừa kiểm tra Tag chống sửa đổi vừa giải mã trả về bản rõ."
      }
    ],
    sections: [
      {
        heading: "1. AES-256-GCM vs Bẫy chết người của AES/ECB và Lỗi tái sử dụng IV (Nonce Reuse)",
        paragraphs: [
          "Trong các buổi Code Review cho các dự án nâng cấp hệ thống cũ, lỗi mật mã học đáng sợ nhất mà thầy từng bắt gặp là dòng chữ quen thuộc `Cipher.getInstance(\"AES\")` trong Java! Ít ai để ý rằng trong SunJCE Provider mặc định của JDK, nếu em chỉ ghi cộc lốc `\"AES\"` mà không chỉ định Mode và Padding, Java sẽ âm thầm chọn `AES/ECB/PKCS5Padding`! Chế độ `ECB` (Electronic Codebook) cắt dữ liệu thành từng khối 16 bytes độc lập: hai khối bản rõ giống nhau sẽ cho ra hai khối bản mã giống hệt nhau. Nếu mã hóa danh sách khách hàng hay dữ liệu có cấu trúc lặp, kẻ trộm Database nhìn vào phân bố bản mã là đoán được mẫu dữ liệu ngay (hiệu ứng chim cánh cụt ECB kinh điển), hơn nữa kẻ tấn công có thể cắt ghép các khối 16 bytes mà không hề bị phát hiện!",
          "Chuẩn công nghiệp bắt buộc trong tài chính hiện nay là `AES-256-GCM` (`AES/GCM/NoPadding`) thuộc họ thuật toán `AEAD` (Authenticated Encryption with Associated Data). Khác với `AES-CBC` truyền thống chỉ biết mã hóa mà 'mù' về tính toàn vẹn (dễ dính tấn công Padding Oracle nếu lập trình viên quên ghép thêm HMAC chuẩn Encrypt-then-MAC), `AES-GCM` thực hiện đồng thời hai nhiệm vụ trong một lượt chạy phần cứng siêu nhanh (nhờ tập lệnh CPU `AES-NI` và `PCLMULQDQ`): vừa mã hóa dòng dữ liệu, vừa tính toán ra một mã xác thực toàn vẹn `Authentication Tag` dài 128-bit (16 bytes) đính kèm cuối bản mã. Chỉ cần 1 bit trong bản mã bị sửa trộm trên ổ cứng, hàm `cipher.doFinal()` lúc giải mã sẽ lập tức ném `AEADBadTagException` thay vì trả về dữ liệu rác sai lệch!",
          "Đặc biệt, một kỹ thuật đẳng cấp Senior của `AES-GCM` là `AAD` (`Additional Authenticated Data` qua hàm `cipher.updateAAD(...)`). Hãy tưởng tượng kẻ gian có quyền ghi DB lấy nguyên chuỗi mã hóa CCCD hợp lệ của ông Nguyễn Văn A chép đè sang cột CCCD của tài khoản lừa đảo B: vì bản mã và IV đều là đồ thật của cùng khóa DEK nên nếu không có AAD, hệ thống giải mã ở dòng B vẫn thành công! Nhưng khi ta truyền `aad = \"customers.cccd:\" + customerId` vào lúc mã hóa và giải mã, bản mã bị khóa cứng vào đúng `customerId` của dòng đó — chép sang dòng khác giải mã sẽ nổ lỗi `AEADBadTagException` ngay tức khắc! Và quy tắc sinh tử số 1 của `AES-GCM`: Vector khởi tạo `IV` dài đúng 12 bytes (96-bit) BẮT BUỘC phải sinh ngẫu nhiên mới bằng `SecureRandom` cho MỖI LẦN gọi hàm mã hóa — tuyệt đối cấm hardcode một mảng IV cố định!"
        ],
        bullets: [
          "Tại sao dùng lại cùng `(Key, IV)` trong AES-GCM là thảm họa diệt vong?: Bản chất mã hóa của GCM là chế độ đếm dòng (`CTR stream cipher`), tức lấy `Plaintext XOR Keystream(Key, IV)`. Nếu `Cipher1` và `Cipher2` dùng trùng `IV`, kẻ tấn công lấy `Cipher1 XOR Cipher2` sẽ triệt tiêu hoàn toàn khóa, lộ ngay `Plaintext1 XOR Plaintext2` và khôi phục được cả khóa xác thực đa thức `GHASH` để giả mạo mọi bản mã tiếp theo!",
          "Quy cách đóng gói bản mã chuẩn (Self-contained Ciphertext Format): Luôn lưu kèm phiên bản khóa ở đầu chuỗi theo dạng `v2:<Base64(12-byte IV || Ciphertext || 16-byte AuthTag)>`; đừng tách `IV` ra một cột phụ rời rạc gây rắc rối khi có bảng chứa 5 cột nhạy cảm.",
          "Dùng `java.security.SecureRandom` dùng chung (Thread-safe): Khởi tạo một thực thể `SecureRandom` tái sử dụng thay vì `new SecureRandom()` liên tục trong vòng lặp để tránh nghẽn nguồn entropy hệ điều hành, và tuyệt đối cấm dùng `java.util.Random`!"
        ]
      },
      {
        heading: "2. Phần cứng HSM (PKCS#11), Cloud KMS và kiến trúc Envelope Encryption xoay vòng khóa",
        paragraphs: [
          "Mã hóa dữ liệu bằng `AES-256-GCM` mạnh đến đâu cũng trở thành vô nghĩa nếu chiếc khóa `AES-256` được viết trần trụi dưới dạng Base64 ngay trong file `application-prod.yml` trên GitLab! Trong hệ thống Core Banking và Trung tâm Thẻ đạt chuẩn PCI-DSS / NHNN, toàn bộ khóa gốc của ngân hàng phải được bảo vệ bởi `HSM` (`Hardware Security Module` — ví dụ Thales Luna Network HSM, Utimaco đạt chứng nhận `FIPS 140-3 Level 3`) hoặc dịch vụ `Cloud KMS / HashiCorp Vault Transit Engine` tích hợp HSM phía sau.",
          "Điểm khác biệt cốt tử của thiết bị HSM chuyên dụng so với một máy chủ Linux thông thường nằm ở cơ chế bảo vệ vật lý chống xâm phạm (`Tamper-Resistant & Tamper-Responsive Hardware`): toàn bộ vi mạch sinh và lưu khóa nằm trong lớp vỏ epoxy cảm biến nhiệt độ, điện áp, tia X và mũi khoan vật lý. Chỉ cần ai đó cố tình cạy nắp thiết bị trong phòng máy chủ, mạch tự hủy sẽ xóa trắng toàn bộ vùng nhớ chứa khóa mật mã (`Zeroization`) trong vài nano-giây! Quan trọng hơn, khóa chủ (`Master Key / KEK`) được sinh ra ngay bên trong lòng HSM với cờ thuộc tính `CKA_EXTRACTABLE = FALSE` (chuẩn giao thức `PKCS#11`): không một câu lệnh API hay quản trị viên cấp cao nhất nào có thể đọc hay xuất giá trị byte của khóa đó ra ngoài — bạn chỉ có thể gửi dữ liệu nhỏ vào nhờ HSM ký/giải bọc rồi nhận kết quả đầu ra.",
          "Tuy nhiên, thiết bị HSM qua mạng nội bộ có giới hạn băng thông và số phép tính mỗi giây (ví dụ vài nghìn thao tác/giây và độ trễ mạng 1–3ms). Nếu bắt ứng dụng gửi 5 triệu bản ghi sao kê qua mạng sang HSM để mã hóa từng trường thì hệ thống sẽ nghẽn cứng! Đó là lúc kiến trúc `Envelope Encryption` (Mã hóa Phong bì 2 tầng khóa) phát huy sức mạnh: Ứng dụng dùng HSM/KMS để sinh và bảo vệ các Khóa dữ liệu `DEK` (`Data Encryption Key`) dưới sự bao bọc của Khóa chủ `KEK` (`Key Encryption Key`). Bản `Wrapped DEK` (đã bị khóa bởi KEK) được lưu ngay trong bảng cấu hình DB; khi ứng dụng khởi chạy, nó nhờ HSM mở phong bì (`Unwrap`) lấy `Plaintext DEK` giữ trong vùng nhớ bảo vệ của JVM để trực tiếp mã hóa/giải mã `AES-256-GCM` ở tốc độ hàng trăm nghìn phép tính/giây ngay trên CPU cục bộ!"
        ],
        bullets: [
          "Chiến lược Xoay vòng Khóa (`Key Rotation`) không khóa bảng: Khi đến kỳ xoay khóa năm 2027, ta tạo `DEK v2` để mã hóa mọi bản ghi mới sinh ra (`v2:...`), trong khi vẫn giữ `DEK v1` ở chế độ cho phép đọc giải mã các dòng cũ (`v1:...`) và chạy tiến trình nền (`Background Re-encryption Batch`) nâng cấp dần dòng cũ từ `v1` sang `v2` vào giờ thấp điểm.",
          "Nguyên tắc Phân quyền Tách biệt (`Split Knowledge & Dual Control`): Trong ngân hàng truyền thống, việc nạp khóa gốc (`Master Key Ceremony`) vào HSM đòi hỏi ít nhất 2–3 cán bộ quản lý khóa độc lập (Key Custodians), mỗi người giữ một thẻ thông minh chứa một phần mảnh khóa (Shamir's Secret Sharing), không một cá nhân đơn lẻ nào tự ý dựng lại được khóa chủ.",
          "Phân biệt TDE và Application-level Encryption: `TDE` (Transparent Data Encryption của Oracle/PostgreSQL/Disk) chỉ bảo vệ khi ai đó ăn cắp ổ cứng vật lý ở trung tâm dữ liệu; còn khi kết nối qua tài khoản DB/DBA hoặc dính SQL Injection, TDE tự động giải mã trả bản rõ — muốn che giấu cả với DBA thì bắt buộc phải mã hóa ở tầng Ứng dụng!"
        ]
      },
      {
        heading: "3. Kỹ thuật Blind Index (HMAC-SHA256): Tìm kiếm O(log N) trên cột CCCD đã mã hóa",
        paragraphs: [
          "Đây chính là câu hỏi phân loại đẳng cấp Principal/Architect trong các kỳ phỏng vấn thiết kế hệ thống Ngân hàng: 'Em vừa mã hóa cột `cccd` bằng `AES-256-GCM` với `IV` ngẫu nhiên 12 bytes đúng chuẩn bảo mật. Hôm sau quầy giao dịch cần tìm hồ sơ khách hàng theo số CCCD `001095012345`, hoặc hệ thống đăng ký eKYC cần chặn trùng 1 người mở 2 CIF bằng `UNIQUE CONSTRAINT` trên số CCCD. Vì mỗi lần mã hóa ra một chuỗi hoàn toàn khác nhau nên câu lệnh `WHERE cccd_enc = ?` vô tác dụng. Em giải quyết thế nào?'.",
          "Đừng bao giờ trả lời 'Em hạ cấp xuống bỏ IV ngẫu nhiên để mã hóa ra kết quả giống nhau' (vì sẽ dính ngay thảm họa lộ khóa Nonce Reuse ở Mục 1!), và cũng tuyệt đối đừng trả lời 'Em lưu thêm một cột `SHA-256(cccd)` thường để tìm kiếm'! Tại sao băm `SHA-256` không khóa (Unsalted Hash) đối với số CCCD hay Số điện thoại lại nguy hiểm chẳng kém gì lưu văn bản rõ? Bởi không gian giá trị (Keyspace) của số CCCD Việt Nam 12 chữ số thực chất cực kỳ hẹp: 3 số đầu là mã tỉnh/thành (chỉ khoảng 63 mã hợp lệ), 1 số giới tính/thế kỷ, 2 số năm sinh và 6 số ngẫu nhiên cuối — tổng cộng chỉ khoảng vài trăm triệu tổ hợp khả dĩ! Một card đồ họa GPU tiêu dùng hiện đại băm hàng chục tỷ phép `SHA-256` mỗi giây: kẻ trộm bảng DB chỉ mất chưa tới 20 giây chạy vòng lặp vét cạn là dịch ngược sạch toàn bộ cột `SHA-256(cccd)` của 15 triệu khách hàng về số CCCD thật 100%!",
          "Giải pháp chuẩn mực và thanh lịch nhất là kỹ thuật `Blind Index` (Chỉ mục mù) sử dụng `HMAC-SHA256` với Khóa Bí mật Riêng (`Blind-Index Pepper Key`) được bảo vệ bởi HSM/Vault. Bên cạnh cột `cccd_cipher` (lưu bản mã ngẫu nhiên `AES-256-GCM` để giải mã lấy lại giá trị gốc khi cần), ta thiết kế thêm cột `cccd_bidx` lưu kết quả của hàm tất định có khóa: `HMAC_SHA256(BlindIndexKey, normalize(cccd))`. Vì người không có `BlindIndexKey` (nằm trong HSM/Vault, tách rời hoàn toàn khỏi máy chủ Database) không thể tự tính thử hàm `HMAC` cho bất kỳ số CCCD nào, kẻ tấn công dù đánh cắp trọn bộ ổ cứng Database cũng mù tịt không thể chạy tấn công từ điển hay Rainbow Table! Trong khi đó, ứng dụng Backend hợp pháp chỉ mất vài micro-giây tính `HMAC` rồi chạy truy vấn `SELECT * FROM customers WHERE cccd_bidx = :bidx` đánh trúng `UNIQUE B-Tree Index` trong chưa đầy 1 mili-giây!"
        ],
        bullets: [
          "Bắt buộc tách riêng 2 khóa độc lập (`Key Separation Principle`): Khóa `DEK` dùng cho `AES-256-GCM` và khóa `Pepper Key` dùng cho `HMAC-SHA256 Blind Index` tuyệt đối không bao giờ được dùng chung một mảng byte khóa!",
          "Chuẩn hóa dữ liệu đầu vào (`Canonical Normalization`) trước khi tính Blind Index: Luôn `trim()`, chuyển chữ hoa thống nhất (với số Hộ chiếu `B1234567` vs `b1234567`) trước khi đưa vào `HMAC`, để khách gõ thường hay hoa vẫn ra đúng một mã chỉ mục duy nhất.",
          "Rút gọn Blind Index (`Truncated Blind Index`) cho trường hợp không cần ràng buộc UNIQUE: Nếu chỉ tìm kiếm lọc danh sách (chấp nhận một vài bản ghi va chạm băm rồi lọc chính xác lại trong Java sau khi giải mã `AES-GCM`), có thể chỉ lưu 32–64 bit đầu của `HMAC` để càng làm tăng tính mơ hồ toán học cho kẻ dò quét."
        ]
      }
    ],
    comparison: {
      title: "Bảng so sánh các phương án bảo vệ & tìm kiếm dữ liệu định danh (PII) trong Database",
      headers: ["Phương án kỹ thuật", "Khả năng bảo mật khi lộ DB Dump", "Khả năng tìm kiếm Index `WHERE =`", "Đánh giá kiến trúc Ngân hàng"],
      rows: [
        [
          "Băm `SHA-256` không khóa (Plain Hash)",
          "Rất yếu với CCCD/SĐT: GPU vét cạn (Brute-force) giải ngược 100% trong vài chục giây",
          "Tìm kiếm chính xác nhanh qua B-Tree Index",
          "CẤM DÙNG để che giấu dữ liệu có miền giá trị nhỏ như CCCD 12 số, SĐT 10 số, Số thẻ"
        ],
        [
          "`AES-ECB` hoặc `AES-GCM` cố định `IV`",
          "Thảm họa mật mã: lộ mẫu lặp và cho phép khôi phục bản rõ / khóa xác thực GHASH",
          "Tìm kiếm được vì bản mã tất định giống nhau",
          "VI PHẠM NGHIÊM TRỌNG chuẩn mật mã quốc tế NIST & PCI-DSS; loại bỏ ngay khi review code"
        ],
        [
          "Database `TDE` (Transparent Data Encryption)",
          "Bảo vệ tốt nếu mất trộm đĩa cứng vật lý, nhưng lộ sạch nếu bị SQLi hoặc lộ tài khoản DB",
          "Giữ nguyên 100% mọi truy vấn `LIKE`, `RANGE`, `JOIN`",
          "Là lớp nền bắt buộc ở tầng hạ tầng đĩa, nhưng KHÔNG ĐỦ thay thế mã hóa tầng ứng dụng cho PII nhạy cảm cao"
        ],
        [
          "`AES-256-GCM` (Random IV + AAD) + Envelope KMS/HSM + `HMAC Blind Index`",
          "An toàn tuyệt đối trước cả kẻ trộm DB lẫn DBA nội bộ (vì khóa DEK & khóa HMAC nằm ở HSM/KMS)",
          "Đạt tốc độ `O(log N)` (< 1ms) và hỗ trợ `UNIQUE Index` qua cột `cccd_bidx`",
          "CHUẨN VÀNG KIẾN TRÚC cho bảng Khách hàng, Định danh eKYC và Tài khoản thụ hưởng"
        ]
      ]
    },
    codeTitle: "Dịch vụ Mã hóa Phong bì AES-256-GCM (IV 12-byte ngẫu nhiên + AAD) kết hợp HMAC-SHA256 Blind Index",
    code: [
      "@Service",
      "public class PiiEnvelopeCryptoService {",
      "    private static final int GCM_IV_BYTES = 12;",
      "    private static final int GCM_TAG_BITS = 128;",
      "    private final SecureRandom secureRandom = new SecureRandom();",
      "    private final HsmEnvelopeKeyManager keyManager;",
      "",
      "    public PiiEnvelopeCryptoService(HsmEnvelopeKeyManager keyManager) {",
      "        this.keyManager = keyManager;",
      "    }",
      "",
      "    public String encryptPii(String plaintext, String aadContext) {",
      "        try {",
      "            VersionedSecretKey activeDek = keyManager.currentActiveDek(); // Unwrapped via HSM KEK",
      "            byte[] iv = new byte[GCM_IV_BYTES];",
      "            secureRandom.nextBytes(iv); // Unique 96-bit IV per encryption call!",
      "            Cipher cipher = Cipher.getInstance(\"AES/GCM/NoPadding\");",
      "            cipher.init(Cipher.ENCRYPT_MODE, activeDek.key(), new GCMParameterSpec(GCM_TAG_BITS, iv));",
      "            cipher.updateAAD(aadContext.getBytes(StandardCharsets.UTF_8));",
      "            byte[] cipherWithTag = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));",
      "            ByteBuffer packed = ByteBuffer.allocate(iv.length + cipherWithTag.length)",
      "                .put(iv).put(cipherWithTag);",
      "            return activeDek.version() + \":\" + Base64.getEncoder().encodeToString(packed.array());",
      "        } catch (GeneralSecurityException ex) {",
      "            throw new IllegalStateException(\"AES-256-GCM PII encryption failed\", ex);",
      "        }",
      "    }",
      "",
      "    public String computeBlindIndex(String rawIdentifier) {",
      "        try {",
      "            String normalized = rawIdentifier.trim().toUpperCase(Locale.ROOT);",
      "            Mac hmac = Mac.getInstance(\"HmacSHA256\");",
      "            hmac.init(keyManager.blindIndexPepperKey()); // Distinct key from DEK!",
      "            byte[] digest = hmac.doFinal(normalized.getBytes(StandardCharsets.UTF_8));",
      "            return HexFormat.of().formatHex(digest);",
      "        } catch (GeneralSecurityException ex) {",
      "            throw new IllegalStateException(\"Blind index HMAC computation failed\", ex);",
      "        }",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Sinh mới `byte[] iv = new byte[12]` bằng `SecureRandom` ngay bên trong thân hàm `encryptPii`: Đảm bảo hai lần mã hóa cùng một số CCCD luôn cho ra hai chuỗi bản mã khác hẳn nhau, triệt tiêu hoàn toàn nguy cơ trùng lặp cặp `(DEK, IV)`.",
      "Gắn ngữ cảnh xác thực `cipher.updateAAD(aadContext.getBytes(...))` (ví dụ truyền `\"customers.cccd:\" + cif`): Bắt buộc lúc giải mã cũng phải cung cấp đúng `cif` của bản ghi đó; nếu ai đó tráo bản mã CCCD sang dòng khách hàng khác, `AES-GCM` sẽ báo lỗi xác thực `AEADBadTagException` ngay.",
      "Đóng gói tiền tố phiên bản khóa `activeDek.version() + \":\" + Base64(IV + Ciphertext + Tag)`: Cho phép hệ thống đọc tiền tố (ví dụ `v1:` hay `v2:`) để chọn đúng khóa giải mã tương ứng khi ngân hàng thực hiện xoay vòng `DEK` định kỳ.",
      "Hàm `computeBlindIndex` chuẩn hóa chuỗi đầu vào (`trim().toUpperCase(Locale.ROOT)`) và dùng `keyManager.blindIndexPepperKey()` tách biệt hoàn toàn với `DEK`, xuất chuỗi Hex 64 ký tự bằng `HexFormat.of()` (Java 17/21) để lưu vào cột `cccd_bidx` có đánh `UNIQUE INDEX`."
    ],
    labGuide: {
      goal: "Cài đặt trọn vẹn cơ chế lưu trữ và truy vấn Khách hàng có mã hóa cột CCCD bằng AES-256-GCM (kèm AAD gắn mã CIF) và tìm kiếm dưới 1ms qua cột Blind Index HMAC-SHA256 trên PostgreSQL.",
      steps: [
        "Bước 1: Tạo bảng `customers(cif VARCHAR PRIMARY KEY, full_name VARCHAR, cccd_cipher TEXT NOT NULL, cccd_bidx CHAR(64) UNIQUE NOT NULL)` trên PostgreSQL; cấu hình `HsmEnvelopeKeyManager` giả lập cơ chế bọc/mở khóa `DEK` bằng khóa chủ `KEK`.",
        "Bước 2: Viết luồng tạo khách hàng mới với số CCCD `001095012345` cho hai môi trường thử nghiệm hoặc cập nhật 2 lần liên tiếp -> Mở DBeaver kiểm tra bảng `customers` để xác nhận cột `cccd_cipher` biến đổi ngẫu nhiên hoàn toàn và không thể đọc bằng mắt thường.",
        "Bước 3: Viết API tra cứu `GET /api/v1/customers/by-cccd/{cccd}` tính `bidx = crypto.computeBlindIndex(cccd)` rồi gọi `customerRepo.findByCccdBidx(bidx)` và chạy `EXPLAIN ANALYZE` trên PostgreSQL xác nhận kế hoạch thực thi sử dụng `Index Scan using customers_cccd_bidx_key`.",
        "Bước 4: Thử dùng câu lệnh `UPDATE` trực tiếp trong DB copy giá trị `cccd_cipher` của khách hàng `CIF001` dán đè sang dòng `CIF002` rồi gọi API đọc hồ sơ `CIF002` -> Xác nhận tầng giải mã chặn đứng hành vi tráo dữ liệu nhờ lệch `AAD`!"
      ],
      expectedOutput: "Truy vấn theo CCCD đạt thời gian thực thi < 1ms nhờ B-Tree Index trên `cccd_bidx`, ràng buộc `UNIQUE` chặn tự động đăng ký trùng CCCD, trong khi bản thân cột dữ liệu được bảo vệ toàn vẹn chống cả lộ bản rõ lẫn tráo đổi chéo bản ghi."
    },
    examTips: [
      "Câu hỏi bẫy kinh điển: 'Để tìm kiếm `WHERE cccd = ?` trên cột mã hóa AES-GCM, em tạo một hằng số `static final byte[] FIXED_IV` dùng chung được không?' -> Trả lời DỨT KHOÁT KHÔNG! Dùng chung IV trong AES-GCM làm lộ phép XOR giữa các bản rõ và làm sập khóa xác thực GHASH; phải dùng `IV ngẫu nhiên + cột phụ HMAC Blind Index`.",
      "Khi hội đồng hỏi 'Tại sao không để ứng dụng gọi thẳng HSM mã hóa từng dòng dữ liệu sao kê?': Giải thích ngay giới hạn thông lượng mạng/phần cứng của HSM và đưa ra kiến trúc `Envelope Encryption` (HSM giữ `KEK` không xuất ra ngoài để bọc/mở khóa `DEK`, còn `DEK` chạy `AES-NI` tốc độ cao tại RAM ứng dụng).",
      "Nếu đề bài yêu cầu chống DBA nội bộ copy bản mã số dư/số tài khoản từ dòng A sang dòng B: Từ khóa ăn điểm tuyệt đối là `AEAD Associated Data (AAD)` gắn khóa chính của dòng (`rowId`/`cif`) vào phép tính `GCM Authentication Tag`."
    ],
    summaryTakeaways: [
      "Luôn sử dụng `AES-256-GCM` (`AES/GCM/NoPadding`) với `IV 12 bytes` sinh mới bằng `SecureRandom` cho từng lần mã hóa và gắn `AAD` để bảo vệ cả tính bí mật lẫn tính toàn vẹn ngữ cảnh.",
      "Tuyệt đối cấm sử dụng chế độ `AES/ECB` (cẩn thận bẫy mặc định của `Cipher.getInstance(\"AES\")`!) và cấm tái sử dụng `IV` dưới cùng một khóa.",
      "Áp dụng kiến trúc `Envelope Encryption` kết hợp `HSM (PKCS#11)` hoặc `KMS`: khóa mẹ `KEK` không bao giờ rời khỏi phần cứng an toàn, còn bản mã luôn gắn tiền tố phiên bản `v1:` để hỗ trợ xoay khóa.",
      "Dùng cột phụ `HMAC-SHA256 Blind Index` (với khóa bí mật tách rời `DEK`) để giữ trọn tốc độ truy vấn B-Tree Index và ràng buộc `UNIQUE` mà vẫn chống triệt để tấn công vét cạn GPU."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên muốn vừa mã hóa cột Số căn cước công dân (`cccd`) bằng `AES-256-GCM`, vừa hỗ trợ truy vấn nhanh `SELECT * FROM customers WHERE cccd_encrypted = ?` nên đã khai báo một mảng hằng số `private static final byte[] CONSTANT_IV = new byte[12]` dùng chung cho mọi khách hàng. Hậu quả mật mã học của cách làm này là gì?",
        options: [
          "Hoàn toàn an toàn miễn là khóa AES dài đủ 256-bit và được cất trong HashiCorp Vault.",
          "Phá vỡ hoàn toàn tính an toàn của `AES-GCM`: tái sử dụng cùng cặp `(Key, IV)` biến dòng khóa CTR thành cố định, cho phép kẻ tấn công XOR hai bản mã để khôi phục bản rõ và tính ngược ra khóa xác thực GHASH để giả mạo dữ liệu tùy ý.",
          "Chỉ làm tốc độ câu lệnh `SELECT` trong PostgreSQL chạy chậm hơn 10%.",
          "Java 21 sẽ báo lỗi biên dịch (Compile Error) không cho phép truyền mảng hằng số vào `GCMParameterSpec`."
        ],
        answer: 1,
        explanation: "AES-GCM cực kỳ nhạy cảm với tính duy nhất của Nonce/IV (gọi là Nonce-misuse brittle). Chỉ cần hai bản tin được mã hóa dưới cùng một khóa và cùng một IV, luồng khóa `Keystream` giống hệt nhau bị triệt tiêu qua phép XOR (`C1 XOR C2 = P1 XOR P2`) và làm lộ cả khóa con xác thực đa thức GHASH. Để tìm kiếm được, bắt buộc giữ IV ngẫu nhiên và tách riêng cột `HMAC Blind Index`.",
        wrongReasons: [
          "Độ dài khóa 256-bit hay lưu trong Vault hoàn toàn vô tác dụng nếu vi phạm điều kiện tiên quyết về tính duy nhất của IV trong chế độ GCM.",
          "",
          "PostgreSQL chỉ so sánh chuỗi trên cột đã lưu nên không gây chậm 10%, vấn đề nằm ở lỗ hổng mật mã nghiêm trọng làm lộ toàn bộ dữ liệu.",
          "Trình biên dịch Java không hề kiểm tra nguồn gốc mảng byte truyền vào `GCMParameterSpec`; đây là lỗi logic bảo mật lúc chạy cực kỳ nguy hiểm."
        ]
      },
      {
        question: "Tại sao đối với cột CCCD 12 chữ số của khách hàng, việc lưu thêm cột phụ `SHA-256(cccd)` (băm thuần không có khóa bí mật) để làm chỉ mục tìm kiếm lại bị đội Kiểm toán An toàn thông tin Ngân hàng đánh trượt?",
        options: [
          "Vì thuật toán `SHA-256` sinh ra chuỗi có độ dài ngẫu nhiên không thể lưu vào cột `CHAR(64)`.",
          "Vì không gian giá trị thực tế của CCCD 12 số (theo quy tắc mã tỉnh + giới tính + năm sinh + 6 số cuối) rất nhỏ; nếu lộ bản sao Database, kẻ tấn công dùng GPU chạy vét cạn (Brute-force / Rainbow Table) chỉ mất vài chục giây là dịch ngược được toàn bộ mã băm về số CCCD thật.",
          "Vì PostgreSQL không cho phép tạo `UNIQUE INDEX` trên các cột lưu chuỗi Hex.",
          "Vì `SHA-256` chỉ chạy được trên hệ điều hành Windows mà không chạy được trên Linux Container."
        ],
        answer: 1,
        explanation: "Hàm băm mật mã công khai không khóa như `SHA-256` được thiết kế để chạy cực nhanh và ai cũng tự tính được. Với dữ liệu có cấu trúc ngắn và ít tổ hợp như CCCD 12 số hoặc SĐT 10 số, kẻ trộm DB dễ dàng băm thử toàn bộ dải số hợp lệ để tra ngược 100%. Bắt buộc phải dùng `HMAC-SHA256(SecretKey_In_HSM, cccd)` để kẻ không có khóa bí mật không thể tự tính băm dò thử.",
        wrongReasons: [
          "`SHA-256` luôn xuất ra đúng 256-bit (32 bytes, tương đương cố định 64 ký tự Hex).",
          "",
          "PostgreSQL hỗ trợ tạo `B-Tree UNIQUE INDEX` cực tốt trên cột `CHAR(64)` / `VARCHAR` / `BYTEA`.",
          "`SHA-256` là thuật toán chuẩn quốc tế có sẵn trong mọi bản phân phối JDK trên mọi hệ điều hành."
        ]
      }
    ]
  },

  K4: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Senior / Card & Payment Gateway Architect)",
    codeLang: "java",
    teacherIntro: "Chào em, nếu em từng làm việc hoặc ứng tuyển vào Trung tâm Thẻ, Cổng thanh toán (Payment Gateway) hay Ví điện tử có liên kết thẻ Quốc tế Visa / Mastercard / JCB, có một cụm từ quyền lực hơn mọi lời nói của Giám đốc Công nghệ: Tiêu chuẩn Bảo mật Dữ liệu Ngành Thẻ `PCI-DSS v4.0` (`Payment Card Industry Data Security Standard`). Thầy từng chứng kiến một công ty Fintech suýt bị tổ chức thẻ quốc tế cắt cổng thanh toán và phạt nặng chỉ vì một lập trình viên bật chế độ `logging.level.org.springframework.web=DEBUG` trên môi trường Production suốt 2 ngày cuối tuần — vô tình in nguyên số thẻ 16 số (`PAN`) kèm 3 số `CVV2` mặt sau thẻ của khách vào cụm Elasticsearch dùng chung cho 80 nhân viên kỹ thuật đọc! Trong bài K4 này, thầy sẽ truyền lại cho em trọn bộ nguyên tắc thiết kế vùng mạng cô lập `CDE`, dịch vụ `Card Vault Tokenization`, luật bất thành văn về `SAD` và cách dọn sạch bộ nhớ RAM trong Java để vượt qua kỳ kiểm toán QSA khắt khe nhất.",
    analogy: {
      title: "Khu hầm vàng biệt lập và chiếc phích nhựa đổi đồ ở quầy gửi túi siêu thị",
      body: "Em hãy hình dung số thẻ 16 số thật (`PAN`) của khách hàng giống như một thỏi vàng ròng có khắc tên chủ nhân. Nếu khách vừa bước vào trung tâm thương mại mà cầm khư khư thỏi vàng đó đi qua cả 40 gian hàng ăn uống, rạp phim, khu vui chơi (40 Microservices), thì cả tòa nhà 10 tầng đều phải lắp cửa thép chống đạn, thuê lính gác có vũ trang và soi chiếu toàn thân mọi nhân viên mỗi ngày — chi phí vận hành sẽ đè bẹp doanh nghiệp! Thay vào đó, ngay tại sảnh đón tiếp có một Phòng Hầm Vàng Biệt lập 4 bức tường thép (`Vùng mạng CDE - Cardholder Data Environment`). Thỏi vàng thật được cất ngay vào két sắt bên trong hầm (`Card Vault`), và quầy hầm vàng chỉ đưa ra ngoài một Chiếc thẻ nhựa màu xanh khắc mã số ngẫu nhiên `tok_pan_9a8f...` (`Payment Token`) kèm dòng chữ gợi nhớ `411111******1234` (`Masked PAN`). Từ giây phút đó, cả 40 gian hàng bên ngoài chỉ truyền tay nhau chiếc thẻ nhựa vô giá trị kia để tích điểm, lên đơn hay gia hạn thuê bao; dù kẻ trộm có cướp được chiếc thẻ nhựa ở quầy rạp phim thì mang ra chợ đen cũng chỉ là mảnh nhựa phế liệu!"
    },
    objectives: [
      "Phân biệt chính xác `Cardholder Data (CHD)` và `Sensitive Authentication Data (SAD)` theo chuẩn `PCI-DSS v4.0`, nắm vững quy tắc cấm lưu tuyệt đối `CVV2/CVC2/PIN` sau cấp phép và chuẩn che mờ `6 đầu - 4 cuối`.",
      "Thiết kế kiến trúc thu hẹp phạm vi kiểm toán (`PCI Scope Reduction`) bằng phân vùng mạng cô lập `CDE` và dịch vụ `Card Vault Tokenization` cho hệ sinh thái Microservices.",
      "Áp dụng kỹ thuật lập trình Java an toàn bộ nhớ trong vùng CDE: xử lý dữ liệu thẻ nhạy cảm trên mảng `char[]`/`byte[]` khả biến kèm xóa trắng tức thì (`Zeroization`) trong khối `finally`."
    ],
    flow: [
      {
        step: "1. Thu thập Dữ liệu Thẻ Cô lập ngay từ Biên (CDE Edge / Hosted iFrame)",
        detail: "Khách hàng nhập thông tin thẻ trực tiếp vào cổng tiếp nhận nằm trong vùng mạng `CDE` (hoặc qua Hosted Fields/SDK mã hóa đầu-cuối bằng khóa công khai của Vault) để số thẻ `PAN` và `CVV2` không bao giờ chạm vào các máy chủ Web/Order thông thường."
      },
      {
        step: "2. Cấp phép Xác thực Tức thời & Hủy ngay SAD (CVV2/PIN)",
        detail: "`Card Vault Service` chuyển tiếp `PAN` + `CVV2` trên bộ nhớ RAM sang cổng chuyển mạch thẻ (`0100 Authorization / Zero-dollar Verification`). Ngay khi nhận phản hồi cấp phép, mảng `CVV2` bị ghi đè về `\\0` và tuyệt đối không chạm xuống ổ đĩa hay log."
      },
      {
        step: "3. Mã hóa PAN bằng HSM & Cấp phát Card Token Phi giá trị",
        detail: "Dịch vụ Vault tính dấu vân tay `HMAC(PAN)` chống tạo trùng, mã hóa `PAN` bằng khóa bảo vệ trong HSM lưu vào CSDL biệt lập trong CDE, rồi sinh mã đại diện `tok_pan_<random>` kèm chuỗi hiển thị `411111******1234` trả ra ngoài."
      },
      {
        step: "4. Thanh toán Định kỳ / Một chạm qua Detokenization Nội bộ CDE",
        detail: "Ở các giao dịch lần sau, Order/Billing Service bên ngoài chỉ gửi `cardToken` + số tiền vào cổng CDE; `Card Vault` kiểm tra quyền sở hữu `cif` của Token, giải mã `PAN` ngay trong vùng CDE để gọi chuyển mạch thẻ rồi trả kết quả hạch toán."
      }
    ],
    sections: [
      {
        heading: "1. Luật sắt của PCI-DSS 4.0: Phân định ranh giới sống chết giữa CHD và SAD",
        paragraphs: [
          "Khi bước vào vòng phỏng vấn với Giám đốc Khối Thẻ hoặc Chuyên gia Kiểm toán Quốc tế QSA (`Qualified Security Assessor`), câu hỏi đầu tiên kiểm tra xem em có thực sự hiểu PCI-DSS hay không luôn là: 'Nếu ngân hàng em dùng thuật toán mạnh nhất thế giới `AES-256-GCM` với khóa giữ trong phần cứng `HSM FIPS 140-3` để mã hóa mã `CVV2` (3 số mặt sau thẻ) lưu vào bảng thẻ liên kết giúp khách thanh toán lần sau mượt hơn, thì có đạt chuẩn PCI-DSS không?'. Câu trả lời phải bật ra trong 1 giây không chút do dự: TRƯỢT NGAY LẬP TỨC VÀ VI PHẠM NGHIÊM TRỌNG!",
          "Tiêu chuẩn `PCI-DSS v4.0` (Yêu cầu số 3: Protect Stored Account Data) chia dữ liệu thẻ thành hai nhóm có số phận pháp lý hoàn toàn trái ngược nhau. Nhóm thứ nhất là `CHD` (`Cardholder Data` - Dữ liệu chủ thẻ) bao gồm Số thẻ chính `PAN` (Primary Account Number 16–19 chữ số), Tên chủ thẻ, Ngày hết hạn (`Expiry Date`) và `Service Code`. Ngân hàng ĐƯỢC PHÉP lưu trữ `PAN` nếu có nhu cầu nghiệp vụ chính đáng, nhưng bắt buộc phải biến `PAN` thành dạng không đọc được ở mọi nơi lưu trữ (bằng mã hóa mật mã mạnh, Tokenization hoặc băm một chiều có khóa), đồng thời khi hiển thị trên màn hình giao dịch viên hay sao kê khách hàng phải áp dụng `PAN Masking`: tối đa chỉ được lộ 6 chữ số đầu (`BIN/IIN`) và 4 chữ số cuối (ví dụ `457209******8821`), tuyệt đối không lộ quá mức này trừ các vai trò nghiệp vụ đặc biệt được phê duyệt chặt chẽ.",
          "Nhóm thứ hai là `SAD` (`Sensitive Authentication Data` - Dữ liệu xác thực nhạy cảm) bao gồm: Toàn bộ dữ liệu dải từ hoặc dữ liệu tương đương trên chip (`Full Track 1 / Track 2 Data`), mã kiểm tra thẻ `CAV2/CVC2/CVV2/CID` (3 số sau thẻ Visa/Master/JCB hoặc 4 số trước thẻ Amex), và mã `PIN / PIN Block`. Quy tắc tối thượng của PCI-DSS Yêu cầu 3.3 là: CẤM TUYỆT ĐỐI lưu trữ bất kỳ thành phần nào của SAD sau khi giao dịch được cấp phép (post-authorization), DƯỚI BẤT KỲ HÌNH THỨC NÀO, KỂ CẢ ĐÃ MÃ HÓA MẠNH BẰNG HSM! Lý do cốt lõi là CVV2 và Track Data chính là bằng chứng chứng minh chủ thẻ đang cầm thẻ thật lúc giao dịch (`Card-Present` / `Card-Not-Present first binding`); cho các lần thu tiền tự động tiếp theo, hệ thống chuyển mạch thẻ quốc tế đã cung cấp cờ giao dịch riêng (`CIT/MIT - Merchant Initiated Transaction` kèm `Network Transaction ID` hoặc `Network Token`) mà không hề cần lưu lại CVV2!"
        ],
        bullets: [
          "Những 'ổ chứa ngầm' làm rò rỉ PAN/SAD hay bị QSA bắt lỗi nhất: File log ứng dụng khi crash (`stacktrace` in tham số hàm), bảng lưu lịch sử request HTTP thô để debug, hàng đợi `Kafka Dead Letter Topic`, bộ nhớ đệm `Redis`, file backup/dump tạm của DBA và ảnh chụp màn hình công cụ hỗ trợ khách hàng!",
          "Kiểm tra thuật toán `Luhn Check (Mod 10)` trước khi gọi mạng: Mọi dải số thẻ PAN hợp lệ đều tuân theo tổng kiểm tra Luhn; kiểm tra Luhn ngay ở biên giúp loại bỏ 90% lỗi gõ nhầm chữ số của người dùng mà không tốn phí gọi cổng chuyển mạch.",
          "Yêu cầu mới gắt gao của `PCI-DSS v4.0`: Không chỉ cấm lưu SAD sau cấp phép, mà ngay cả trong giai đoạn chờ trước cấp phép nếu tạm giữ trong bộ nhớ cũng phải bảo vệ nghiêm ngặt, kèm kiểm soát chống kịch bản đọc trộm trên trang thanh toán trình duyệt (Yêu cầu 6.4.3 & 11.6.1 chống tấn công Magecart e-skimming)."
        ]
      },
      {
        heading: "2. Kiến trúc Vùng mạng CDE và Dịch vụ Card Vault Tokenization thu hẹp 95% phạm vi kiểm toán",
        paragraphs: [
          "Trong tiêu chuẩn PCI-DSS, tồn tại một quy luật gọi là 'Hiệu ứng lây lan phạm vi' (`Scope Contagion`): Bất kỳ máy chủ, container, cơ sở dữ liệu, hàng đợi Kafka, thiết bị mạng hay công cụ giám sát nào lưu trữ, xử lý hoặc truyền tải (`Store, Process, or Transmit`) số thẻ `PAN` dạng rõ hay dạng mã hóa đều tự động nằm trong `CDE` (`Cardholder Data Environment`), và bất kỳ hệ thống nào nối mạng thông phẳng không cách ly tường lửa với CDE cũng bị kéo luôn vào phạm vi kiểm toán! Việc vận hành một dịch vụ trong vùng CDE cực kỳ tốn kém: phải bật giám sát toàn vẹn tệp tin (`FIM`), quét lỗ hổng `ASV` hàng quý, kiểm thử xâm nhập (`Pentest`) định kỳ, lưu nhật ký kiểm toán tập trung tối thiểu 1 năm, cài chống mã độc và siết quyền truy cập đa nhân tố qua Bastion/Jump Host có ghi hình phiên làm việc.",
          "Hãy thử hình dung ngân hàng số hoặc siêu ứng dụng tài chính của em có 60 Microservices (Mua vé máy bay, Thanh toán điện nước, Trả góp, Hoàn tiền, Chăm sóc khách hàng, Phân tích dữ liệu BI...). Nếu để trường `cardNumber` chạy vòng vèo trong JSON sự kiện qua cả 60 dịch vụ đó, chi phí tuân thủ và rủi ro rò rỉ sẽ tăng theo cấp số nhân và làm tê liệt tốc độ phát triển tính năng (Agile Release)! Giải pháp kiến trúc bắt buộc là xây dựng Phân vùng mạng CDE siêu cô lập (`Strict Network Segmentation`) đặt duy nhất cụm `Card Vault & Acquiring Gateway` bên trong.",
          "Cơ chế hoạt động của `Card Vault Tokenization` diễn ra như một chiếc phễu một chiều: Khi khách hàng liên kết thẻ hoặc thanh toán lần đầu, luồng dữ liệu thẻ đi thẳng từ trình duyệt/Mobile SDK vào thẳng biên mạng CDE (không đi qua BFF hay Order Service thông thường). Tại đây, `Card Vault Service` sinh ra một `Card Token` ngẫu nhiên hoàn toàn phi toán học (ví dụ `tok_pan_4d82c910ef...` — không thể dùng bất kỳ công thức toán học nào tính ngược từ Token ra PAN mà bắt buộc phải tra bảng ánh xạ nằm khóa chặt trong hầm CDE!). Toàn bộ 59 Microservices bên ngoài, các topic Kafka và kho Data Warehouse chỉ nhận được `cardToken`, `maskedPan` (`411111******1234`), `cardBrand` (`VISA`) và `expiryYm`. Nhờ đó, 95% hạ tầng công nghệ của doanh nghiệp được đưa hoàn toàn ra ngoài vùng CDE (`Out-of-Scope`), vừa an toàn tuyệt đối vừa giúp đội phát triển sản phẩm chạy nước rút mà không lo vướng bẫy lưu nhầm số thẻ!"
        ],
        bullets: [
          "Vault Token vs Format-Preserving Encryption (`FPE - NIST SP 800-38G FF1`): Với hệ thống Microservices xây mới, luôn ưu tiên `Vault Random Token` dạng `tok_pan_...` để nhận diện rõ đó là Token; còn với các hệ thống Core Thẻ kế thừa (Legacy Mainframe/COBOL) vốn kiểm tra cứng cột số thẻ phải đúng 16 chữ số và qua được Luhn, người ta dùng `Format-Preserving Token` giữ nguyên 6 số đầu - 4 số cuối và thay 6 số giữa bằng dãy số ngẫu nhiên tránh trùng.",
          "Tích hợp `EMVCo Network Tokenization` (Visa Token Service / Mastercard MDES): Bước tiến cao hơn nữa là đổi thẳng `FPAN` (số thẻ in trên nhựa) lấy `DPAN` (Network Token do chính tổ chức thẻ phát hành gắn kèm mã động `Cryptogram` cho từng giao dịch), giúp tăng tỷ lệ duyệt giao dịch và tự động cập nhật khi khách đổi thẻ mới hết hạn!",
          "Ràng buộc chặt `Card Token` với chủ sở hữu `cif` (`Owner-bound Token`): Một `cardToken` không được phép dùng tự do bởi bất kỳ tài khoản nào; khi Order Service truyền `(cif, cardToken)` vào Vault để thanh toán, Vault bắt buộc đối chiếu `token.ownerCif == authenticatedCif` để chặn kẻ gian đoán hoặc đánh cắp chuỗi Token của người khác mang đi trừ tiền!"
        ]
      },
      {
        heading: "3. Vệ sinh Bộ nhớ JVM (Memory Hygiene) và Luồng Dịch mã PIN Block trong HSM",
        paragraphs: [
          "Ngay cả đối với đội ngũ kỹ sư tinh nhuệ được phép viết code cho `Card Vault Service` nằm bên trong vùng CDE, vẫn có một cái bẫy đặc thù của ngôn ngữ Java khiến rất nhiều ứng viên Senior sẩy chân khi phỏng vấn sâu: Vấn đề bất biến của lớp `java.lang.String` trên vùng nhớ JVM Heap. Trong Java, một khi em khai báo `String cvv = request.getCvv();` hay `String pan = \"4111222233334444\";`, mảng ký tự bên dưới đối tượng `String` là hoàn toàn bất biến (`Immutable`) — em không có cách nào xóa nội dung chuỗi đó khỏi RAM ngay sau khi gửi lệnh sang cổng thẻ! Ngay cả khi biến `cvv` đã ra khỏi phạm vi hàm (`out of scope`), chuỗi ký tự chứa số thẻ và CVV thật vẫn nằm trơ trơ trên vùng nhớ `Eden/Old Heap` cho đến một thời điểm bất định khi Garbage Collector quét qua ghi đè.",
          "Chuyện gì xảy ra nếu dịch vụ gặp tải đột biến hoặc rò rỉ bộ nhớ dẫn tới kích hoạt cờ `-XX:+HeapDumpOnOutOfMemoryError`, hoặc một kỹ sư SRE chạy lệnh lấy Heap Dump / Core Dump để chẩn đoán sự cố? Toàn bộ hàng chục nghìn số thẻ `PAN` và mã `CVV2` nằm rải rác trên Heap sẽ bị kết xuất nguyên dạng văn bản rõ ra một file `.hprof` nặng 4GB nằm trên ổ đĩa! Đối với đoàn kiểm toán PCI-DSS, điều này đồng nghĩa với việc hệ thống lưu trữ trái phép `SAD` dạng rõ xuống đĩa cứng!",
          "Để phòng vệ ở cấp độ cao nhất trong các module nhạy cảm (Card Vault, PIN Handler, Key Loader), chuẩn lập trình an toàn Java yêu cầu: (1) Tắt xuất tự động Heap Dump ra đĩa dùng chung không mã hóa đối với các Pod trong vùng CDE; (2) Biểu diễn dữ liệu cực nhạy cảm như `PAN`, `CVV2`, `Clear PIN` bằng mảng khả biến `char[]` hoặc `byte[]` (Jackson hỗ trợ deserialize thẳng chuỗi JSON vào trường `char[]`!), tuyệt đối không nối chuỗi bằng dấu `+` hay gọi `.toString()`, và bắt buộc đặt lệnh `Arrays.fill(transientCvv2, '\\0')` bên trong khối `finally` để xóa trắng từng ô nhớ về ký tự rỗng ngay khoảnh khắc vừa đẩy gói tin mạng đi xong! Riêng với mã PIN thẻ ATM/POS (chuẩn ISO 9564), quy tắc còn nghiêm ngặt hơn gấp bội: mã PIN KHÔNG BAO GIỜ được phép tồn tại dạng rõ dù chỉ trong `char[]` trên RAM của ứng dụng Java! Thiết bị POS/ATM hoặc WebCrypto mã hóa mã PIN ngay từ đầu cuối thành khối `Encrypted PIN Block` dưới khóa phiên `ZPK_Channel`; khi đi qua Payment Hub của ngân hàng, Java chỉ cầm chuỗi Hex `PIN Block` đã mã hóa đó gọi lệnh phần cứng `Translate PIN Block` vào HSM để HSM tự giải mã bằng `ZPK_Channel` và mã hóa lại ngay bằng `ZPK_Core / PVK` bên trong vi mạch kín trước khi gửi sang Core Thẻ!"
        ],
        bullets: [
          "Cẩn trọng với `@Valid` Bean Validation khi báo lỗi: Nếu gắn `@Pattern` lên trường chứa số thẻ/PIN mà Exception Handler toàn cục tự động trả về `fieldError.getRejectedValue()` trong JSON lỗi hoặc ghi vào log cảnh báo, hệ thống sẽ vô tình phơi bày nguyên giá trị nhạy cảm vừa bị từ chối!",
          "Tự bảo vệ DTO bằng cách ghi đè `toString()`: Mọi class/record bên trong vùng CDE nếu buộc phải giữ dữ liệu thẻ đều phải override `toString()` trả về chuỗi cố định `\"[PROTECTED_CDE_OBJECT]\"` để chặn đứng tai nạn `log.info(\"Payload: {}\", dto)`.",
          "Kiểm soát truy cập DB của Card Vault: Ngay cả bên trong CDE, dịch vụ chỉ gọi các API nghiệp vụ hẹp và mọi lần thực thi `detokenize` giải mã lấy lại `PAN` thật đều phải ghi nhận vào bảng Audit bất biến để phát hiện sớm nếu có hành vi giải mã hàng loạt bất thường (`Bulk Detokenization Anomaly`)."
        ]
      }
    ],
    comparison: {
      title: "Bảng quy tắc xử lý từng trường dữ liệu thẻ chuẩn tuân thủ PCI-DSS v4.0",
      headers: ["Trường dữ liệu thẻ", "Phân loại PCI-DSS", "Được phép lưu sau cấp phép?", "Cơ chế bảo vệ bắt buộc khi xử lý"],
      rows: [
        [
          "Số thẻ chính (`PAN` 16–19 số)",
          "`CHD` (Cardholder Data)",
          "CÓ — nhưng chỉ lưu trong vùng `CDE` khi có lý do nghiệp vụ",
          "Mã hóa mạnh (`AES-256-GCM` với khóa HSM) + Đổi sang `Card Token` cho ngoài CDE + Che mờ `6 đầu - 4 cuối` khi hiển thị"
        ],
        [
          "Tên chủ thẻ & Ngày hết hạn (`Expiry`)",
          "`CHD` (Cardholder Data)",
          "CÓ — nếu lưu tách rời hoàn toàn khỏi `PAN` thì giảm mức nhạy cảm",
          "Bảo vệ quyền truy cập chặt chẽ; không bao giờ log kèm số `PAN` đầy đủ trên cùng bản ghi"
        ],
        [
          "Mã bảo mật `CVV2 / CVC2 / CID`",
          "`SAD` (Sensitive Auth Data)",
          "CẤM TUYỆT ĐỐI 100% (kể cả đã mã hóa bằng HSM!)",
          "Chỉ giữ tạm thời trên mảng `char[]` trong RAM lúc gọi cấp phép `0100`, xóa trắng `Arrays.fill('\\0')` ngay trong khối `finally`"
        ],
        [
          "Dải từ `Full Track` & Mã `PIN / PIN Block`",
          "`SAD` (Sensitive Auth Data)",
          "CẤM TUYỆT ĐỐI 100% sau khi giao dịch cấp phép xong",
          "Mã `PIN` không bao giờ giải mã ra RAM ứng dụng Java; chỉ truyền dạng `Encrypted PIN Block` và dịch khóa bên trong phần cứng HSM"
        ]
      ]
    },
    codeTitle: "Dịch vụ Card Vault trong vùng CDE: Cấp phép Transient CVV2, Sinh Card Token & Xóa trắng RAM (Zeroization)",
    code: [
      "@Service",
      "public class PciCardVaultService {",
      "    private final CardVaultRepository vaultRepo;",
      "    private final HsmCryptoAdapter hsmCrypto;",
      "    private final AcquiringSwitchClient switchClient;",
      "",
      "    public PciCardVaultService(CardVaultRepository vaultRepo, HsmCryptoAdapter hsmCrypto, AcquiringSwitchClient switchClient) {",
      "        this.vaultRepo = vaultRepo;",
      "        this.hsmCrypto = hsmCrypto;",
      "        this.switchClient = switchClient;",
      "    }",
      "",
      "    @Transactional(rollbackFor = Exception.class)",
      "    public TokenizedCardResponse verifyAndTokenize(char[] rawPan, char[] transientCvv2, String expiryYm, String ownerCif) {",
      "        try {",
      "            SwitchAuthResult auth = switchClient.verifyAccountStatus0100(rawPan, transientCvv2, expiryYm);",
      "            if (!auth.isApproved()) {",
      "                throw new CardDeclinedException(auth.iso39ResponseCode());",
      "            }",
      "            String panFingerprint = hsmCrypto.hmacSha256Pan(rawPan);",
      "            return vaultRepo.findByPanFingerprintAndOwnerCif(panFingerprint, ownerCif)",
      "                .map(rec -> new TokenizedCardResponse(rec.getCardToken(), rec.getMaskedPan(), expiryYm))",
      "                .orElseGet(() -> {",
      "                    String token = \"tok_pan_\" + UUID.randomUUID().toString().replace(\"-\", \"\");",
      "                    String masked = maskSixFirstFourLast(rawPan);",
      "                    byte[] cipherBlob = hsmCrypto.encryptPanAesGcm(rawPan, ownerCif + \":\" + token);",
      "                    vaultRepo.save(new VaultCardEntity(token, ownerCif, panFingerprint, masked, expiryYm, cipherBlob));",
      "                    return new TokenizedCardResponse(token, masked, expiryYm);",
      "                });",
      "        } finally {",
      "            Arrays.fill(transientCvv2, '\\0'); // PCI-DSS Req 3.3: Wipe SAD immediately!",
      "            Arrays.fill(rawPan, '\\0');        // Wipe clear PAN from JVM Heap array!",
      "        }",
      "    }",
      "",
      "    private String maskSixFirstFourLast(char[] pan) {",
      "        return new String(pan, 0, 6) + \"*\".repeat(pan.length - 10) + new String(pan, pan.length - 4, 4);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Nhận đầu vào `char[] rawPan` và `char[] transientCvv2` thay vì kiểu bất biến `String`, kết hợp khối `finally` gọi `Arrays.fill(..., '\\0')`: Đảm bảo dù quá trình gọi chuyển mạch thành công hay ném ngoại lệ giữa chừng, toàn bộ ký tự số thẻ rõ và mã `CVV2` đều bị ghi đè xóa sạch khỏi mảng RAM ngay lập tức.",
      "`transientCvv2` chỉ được truyền duy nhất vào hàm xác thực thời gian thực `switchClient.verifyAccountStatus0100(...)` và hoàn toàn vắng mặt trong `VaultCardEntity`: Tuân thủ nghiêm ngặt điều khoản sống còn của PCI-DSS cấm lưu trữ `SAD` dưới mọi hình thức.",
      "Sử dụng `panFingerprint = hsmCrypto.hmacSha256Pan(rawPan)` kết hợp `ownerCif` để chống sinh trùng nhiều Token cho cùng một thẻ của khách, đồng thời truyền `ownerCif + \":\" + token` làm `AAD` khi mã hóa `PAN`.",
      "Hàm `maskSixFirstFourLast` chỉ trích xuất đúng 6 chữ số đầu (BIN nhận diện ngân hàng phát hành) và 4 chữ số cuối phục vụ hiển thị trên App, còn toàn bộ các Microservices ngoài vùng CDE chỉ nhận về `tok_pan_...` vô hại."
    ],
    labGuide: {
      goal: "Thiết kế và kiểm thử dịch vụ Card Vault tách biệt giả lập vùng CDE, chứng minh luồng thanh toán định kỳ bên ngoài hoạt động mượt mà chỉ bằng Card Token mà không lưu CVV2 hay lộ PAN ra log.",
      steps: [
        "Bước 1: Tạo hai module tách rời (hoặc 2 package kiểm soát bằng ArchUnit): `cde-card-vault` (có CSDL riêng lưu `VaultCardEntity`) và `payment-order-service` (chỉ có trường `cardToken` và `maskedPan`, tuyệt đối không có cột `pan` hay `cvv`).",
        "Bước 2: Viết DTO nhận yêu cầu liên kết thẻ với `char[] rawPan` và `char[] cvv2`, ghi đè `toString()` trả về `\"[REDACTED_CARD_INPUT]\"` và cài đặt hàm kiểm tra số thẻ hợp lệ theo thuật toán `Luhn Mod-10`.",
        "Bước 3: Chạy bài kiểm thử Unit/Integration Test gọi `verifyAndTokenize(...)`: đặt breakpoint hoặc viết assertion kiểm tra ngay sau khi hàm trả về kết quả thì mảng `rawPan` và `transientCvv2` truyền vào đã biến thành toàn ký tự `'\\0'`, còn bản ghi trong DB chỉ chứa `tok_pan_...`, `411111******1111` và mảng byte mã hóa.",
        "Bước 4: Viết bài test ArchUnit hoặc quét log đầu ra của quá trình chạy test xác nhận chuỗi số thẻ 16 số và mã CVV `789` hoàn toàn không xuất hiện ở bất kỳ dòng stdout/log nào."
      ],
      expectedOutput: "`payment-order-service` thực hiện thu tiền thành công thông qua `tok_pan_...` gắn đúng `ownerCif`; mảng bộ nhớ chứa `PAN`/`CVV2` được xóa trắng ngay sau xử lý và không tồn tại bất kỳ dấu vết `SAD` nào trên ổ đĩa hay log."
    },
    examTips: [
      "Câu hỏi bẫy số 1 mọi kỳ phỏng vấn Cổng thanh toán / Thẻ: 'Lưu CVV2 đã mã hóa bằng RSA-4096 hoặc AES-256 trong HSM có hợp lệ PCI-DSS không?' -> Trả lời dứt khoát: KHÔNG BAO GIỜ! PCI-DSS cấm lưu trữ `SAD` (`CVV2`, `Full Track`, `PIN`) sau cấp phép bất kể mã hóa mạnh cỡ nào.",
      "Khi được hỏi 'Làm thế nào giảm chi phí và thời gian đạt chứng nhận PCI-DSS cho hệ thống 50 Microservices?': Trình bày ngay chiến lược `Network Segmentation (tách vùng CDE hẹp)` kết hợp `Hosted Collect / Card Vault Tokenization` để đưa 49 dịch vụ còn lại ra khỏi phạm vi (`Out-of-Scope`).",
      "Điểm cộng đẳng cấp Senior Java: Chủ động nêu lý do dùng `char[]`/`byte[]` kèm `Arrays.fill('\\0')` trong `finally` và tắt Heap Dump không mã hóa trong vùng CDE để chống rò rỉ dữ liệu thẻ qua vùng nhớ bất biến `String` của JVM."
    ],
    summaryTakeaways: [
      "`PCI-DSS v4.0` cho phép lưu `PAN` nếu có nghiệp vụ và phải mã hóa mạnh + che mờ tối đa `6 số đầu - 4 số cuối`, nhưng CẤM TUYỆT ĐỐI lưu `CVV2`, `Full Track` và `PIN` sau cấp phép.",
      "Cô lập dịch vụ `Card Vault` vào vùng mạng `CDE` biệt lập và thay thế số thẻ thật bằng `Card Token` phi toán học giúp bảo vệ hệ sinh thái Microservices và thu hẹp tối đa phạm vi kiểm toán.",
      "Mọi `Card Token` đều phải gắn chặt và kiểm tra quyền sở hữu theo `ownerCif` trước khi thực hiện giải mã (`Detokenization`) gọi chuyển mạch thẻ.",
      "Trong vùng CDE trên Java, xử lý dữ liệu nhạy cảm qua `char[]`/`byte[]`, xóa trắng bằng `Arrays.fill` trong `finally`, và không bao giờ giải mã mã `PIN` thẻ ra ngoài phần cứng HSM."
    ],
    lessonQuestions: [
      {
        question: "Để rút ngắn thao tác thanh toán cho khách hàng VIP trên ứng dụng Ngân hàng số, Giám đốc Sản phẩm đề xuất lưu mã `CVV2` của thẻ tín dụng vào bảng `saved_cards`, với điều kiện phải mã hóa bằng `AES-256-GCM` sử dụng khóa đặt trong thiết bị HSM đạt chuẩn FIPS 140-3. Là Kiến trúc sư trưởng, em phản hồi thế nào?",
        options: [
          "Đồng ý triển khai ngay vì `AES-256-GCM` kết hợp HSM FIPS 140-3 đã đáp ứng mức mã hóa cao nhất của tiêu chuẩn PCI-DSS.",
          "Từ chối tuyệt đối việc lưu `CVV2` vì theo PCI-DSS v4.0 (Req 3.3), `CVV2` là Dữ liệu xác thực nhạy cảm (`SAD`) bị cấm lưu trữ sau cấp phép dưới bất kỳ hình thức nào kể cả đã mã hóa; thay vào đó sử dụng `Card Token` / `Network Token` kèm cờ giao dịch thẻ đã liên kết (`CIT/MIT`).",
          "Đề xuất chuyển sang băm `CVV2` bằng `BCrypt` lưu vào Redis với thời hạn 30 ngày.",
          "Cho phép lưu `CVV2` dạng mã hóa nhưng ẩn tên cột thành `meta_attr_09` để đoàn kiểm toán QSA không phát hiện ra."
        ],
        answer: 1,
        explanation: "Theo tiêu chuẩn bảo mật thẻ quốc tế PCI-DSS, `CVV2/CVC2` thuộc nhóm `SAD` (Sensitive Authentication Data) và bị cấm tuyệt đối việc lưu trữ sau khi giao dịch cấp phép hoàn tất, bất kể sử dụng thuật toán mã hóa hay thiết bị HSM mạnh đến đâu. Giải pháp chuẩn cho thanh toán một chạm là Tokenization kết hợp luồng giao dịch thẻ lưu trữ (`Credential-on-File / Network Token`).",
        wrongReasons: [
          "Mã hóa mạnh bằng HSM chỉ hợp lệ để bảo vệ `PAN` (Cardholder Data), hoàn toàn bị cấm áp dụng để hợp thức hóa việc lưu giữ `CVV2`.",
          "",
          "Cất vào Redis hay băm `BCrypt` (với chuỗi chỉ 3 chữ số từ `000`–`999` dò ra trong 1 mili-giây!) đều là hành vi lưu trữ `SAD` trái phép khiến ngân hàng trượt kiểm toán ngay lập tức.",
          "Cố tình che giấu dữ liệu vi phạm với kiểm toán viên QSA là gian lận tuân thủ nghiêm trọng, có thể dẫn tới phạt tiền triệu đô và tước quyền kết nối thanh toán thẻ quốc tế."
        ]
      },
      {
        question: "Vì sao trong code Java của dịch vụ `Card Vault` nằm trong vùng mạng `CDE`, các kỹ sư bảo mật luôn ưu tiên truyền số thẻ rõ và mã CVV tạm thời qua kiểu `char[]` rồi gọi `Arrays.fill(arr, '\\0')` trong khối `finally`, thay vì dùng kiểu `java.lang.String` thông thường?",
        options: [
          "Vì kiểu `char[]` chiếm ít hơn một nửa dung lượng bộ nhớ trên CPU 64-bit so với `String`.",
          "Vì `String` trong Java là bất biến (Immutable) nên không thể chủ động xóa ngay khỏi vùng nhớ JVM Heap sau khi dùng xong, dẫn tới nguy cơ tồn đọng dữ liệu nhạy cảm dạng rõ nếu tiến trình bị trích xuất bộ nhớ hoặc sinh file Heap Dump.",
          "Vì thư viện JDBC và HTTP Client của Java 21 không cho phép truyền tham số kiểu `String`.",
          "Vì dùng `char[]` giúp tự động mã hóa dữ liệu bằng thuật toán RSA mà không cần gọi thư viện mật mã."
        ],
        answer: 1,
        explanation: "Đối tượng `String` là bất biến trong JVM; em chỉ có thể gán biến tham chiếu bằng `null` chứ không xóa được nội dung các ký tự nằm trên vùng nhớ Heap cho tới khi Garbage Collector thu hồi và ghi đè ngẫu nhiên sau đó. Mảng khả biến `char[]` cho phép ghi đè toàn bộ phần tử về `'\\0'` ngay lập tức trong khối `finally`, rút ngắn cửa sổ phơi nhiễm trong RAM xuống tối thiểu (vài mili-giây).",
        wrongReasons: [
          "Từ Java 9 trở đi, Compact Strings dùng `byte[]` LATIN-1 bên trong nên thực tế tốn ít RAM hơn `char[]` UTF-16; lý do chọn `char[]` hoàn toàn nằm ở tính khả biến để xóa trắng (`Zeroization`), không phải để tiết kiệm RAM.",
          "",
          "Mọi thư viện chuẩn của Java đều hỗ trợ `String` bình thường.",
          "`char[]` chỉ là mảng ký tự thô trong bộ nhớ, hoàn toàn không tự thực hiện bất kỳ phép mã hóa nào."
        ]
      }
    ]
  },

  K5: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Senior / AppSec & API Governance)",
    codeLang: "java",
    teacherIntro: "Chào em, có một sự thật phũ phàng mà mọi báo cáo Pentest hàng năm của ngành Ngân hàng đều chỉ ra: những vụ lộ lọt hàng triệu bản ghi sao kê hay rút trộm tiền đình đám nhất hiếm khi bắt nguồn từ việc hacker bẻ gãy thuật toán mật mã RSA-2048, mà 90% đến từ những lỗ hổng logic cực kỳ đời thường nằm ngay trong danh sách OWASP API Security Top 10! Điển hình nhất là kịch bản này: kẻ tấn công mở một tài khoản ngân hàng hoàn toàn hợp pháp, đăng nhập tử tế có JWT chuẩn xịn, mở công cụ Burp Suite lên nhìn thấy API `GET /api/v1/accounts/1000200035/statements` trả về sao kê của mình; hắn thử đổi đuôi số `35` thành `36`, `37`, `38`... và ngỡ ngàng nhận ra hệ thống cứ thế ngoan ngoãn trả tuốt tuồn tuột sao kê lương, số dư và lịch sử giao dịch của tất cả khách hàng khác trong ngân hàng! Lỗ hổng chí mạng đó mang tên `API1:2023 - BOLA` (`Broken Object Level Authorization` / `IDOR`). Kết hợp với tai nạn rò rỉ CCCD/OTP ra hệ thống Log tập trung ELK, bài K5 hôm nay sẽ trang bị cho em lá chắn phòng thủ tầng ứng dụng vững chắc nhất.",
    analogy: {
      title: "Chiếc thẻ lên tàu sân bay hợp lệ không cho phép mở vali ghế bên cạnh, và tấm kính mờ che bàn phím rút tiền",
      body: "Em hãy hình dung việc bảo mật API giống như quy trình an ninh trên một chuyến bay thương mại. Bước kiểm tra `JWT Access Token` ở cổng API Gateway chính là việc nhân viên an ninh kiểm tra hộ chiếu và thẻ lên tàu hợp lệ (`Authentication` — Xác thực em đúng là hành khách thật trên chuyến bay). Nhưng khi đã bước vào khoang máy bay, việc em có vé hạng Phổ thông ghế `24A` hoàn toàn không cho phép em tự ý bước lên khoang Thương gia mở tủ lấy vali của hành khách ghế `02B` (`BOLA / IDOR`), càng không cho phép em đẩy cửa xông vào buồng lái của Cơ trưởng (`BFLA`), hay tự cầm bút xóa chữ `ECONOMY` trên vé viết đè thành `FIRST_CLASS` (`Mass Assignment / BOPLA`)! Và ngay cả khi camera an ninh trên hành lang ghi hình để phục vụ điều tra sự cố, ống kính thông minh phải tự động làm nhòe vùng bàn phím khi hành khách đang gõ mật khẩu điện thoại (`Automated PII Log Masking`) để chính nhân viên phòng trực camera cũng không nhìn trộm được bí mật của khách."
    },
    objectives: [
      "Triệt tiêu hoàn toàn lỗ hổng nguy hiểm số 1 ngân hàng `OWASP API1 (BOLA/IDOR)`, `API3 (Mass Assignment)` và `API5 (BFLA)` bằng cơ chế kiểm tra quyền sở hữu tài nguyên gắn chặt với `cif` trích xuất từ Token xác thực.",
      "Thiết lập hàng rào phòng thủ chiều sâu chống `SQL Injection` trên truy vấn động, chặn `SSRF` (Server-Side Request Forgery) trên luồng Webhook/eKYC và giới hạn tốc độ chống dò quét số tài khoản.",
      "Xây dựng bộ lọc che mờ dữ liệu nhạy cảm tự động (`PII/SAD Auto-Masking`) ở tầng hạ tầng `Logback Converter` để số thẻ, CCCD, OTP và mật khẩu không bao giờ lọt xuống ổ đĩa hay ELK/Splunk."
    ],
    flow: [
      {
        step: "1. Trích xuất Định danh Bất biến từ SecurityContext (Không tin Input Client)",
        detail: "Mọi API thao tác tài khoản/thẻ/giao dịch lấy trực tiếp `authenticatedCif` từ claims đã ký số của `JwtAuthenticationToken` trong `SecurityContextHolder`, tuyệt đối phớt lờ mọi tham số `cif`/`userId` gửi kèm trong JSON Body hoặc Header thường."
      },
      {
        step: "2. Kiểm tra Quyền Sở hữu Cấp độ Bản ghi (Object Ownership Guard)",
        detail: "Trước khi đọc sao kê hay lập lệnh trích nợ từ `accountNo`, biểu thức `@PreAuthorize(\"@ownershipGuard.canAccessAccount(authentication, #accountNo)\")` hoặc câu truy vấn `WHERE account_no = :acc AND owner_cif = :authCif` khóa chặt quyền truy cập."
      },
      {
        step: "3. Ràng buộc DTO Bất biến & Kiểm soát Biên Mạng Xuất (Input/Egress Hardening)",
        detail: "Ánh xạ dữ liệu đầu vào qua các `Java Record Request DTO` tường minh (chống Mass Assignment), whitelist cột sắp xếp SQL động và lọc chặn dải IP nội bộ (`10.x`, `127.x`, `169.254.169.254`) với mọi tính năng gọi URL ngoài chống SSRF."
      },
      {
        step: "4. Lọc Che mờ Tự động Cuối Nguồn trước khi Ghi Log (Logback Masking)",
        detail: "Mọi sự kiện `ILoggingEvent` đi qua `BankingPiiMaskingConverter` (biên dịch sẵn Regex tối ưu O(N)) tự động biến đổi mọi chuỗi khớp mẫu PAN, CCCD, OTP, CVV, Password, Bearer Token thành dạng `***REDACTED***` trước khi đẩy ra Console/JSON."
      }
    ],
    sections: [
      {
        heading: "1. Diệt tận gốc bộ ba sát thủ OWASP API: BOLA (API1), BOPLA/Mass Assignment (API3) & BFLA (API5)",
        paragraphs: [
          "Trong kiến trúc Microservices Ngân hàng, lý do khiến `OWASP API1:2023 - Broken Object Level Authorization (BOLA / IDOR)` xuất hiện dày đặc đến mức báo động là sự hiểu lầm tai hại về sự phân công trách nhiệm giữa API Gateway và Backend Service. Nhiều đội dự án nghĩ rằng: 'API Gateway ở ngoài cửa đã kiểm tra chữ ký JWT hợp lệ và kiểm tra khách có quyền `SCOPE_account:read` rồi, nên vào bên trong `Account-Service` chỉ việc chạy `accountRepository.findByAccountNo(accountNo)` trả kết quả cho lẹ!'. Hãy nhìn kỹ kẽ hở chết người ở đây: `SCOPE_account:read` chỉ nói rằng 'người này được phép xem tài khoản của chính họ', chứ hoàn toàn không kiểm chứng xem tham số `accountNo = 1903888999` trên đường dẫn URL kia có đúng là tài khoản thuộc sở hữu của `cif` đang cầm Token đó hay của ông hàng xóm! Thậm chí nguy hiểm hơn ở API chuyển tiền `POST /api/v1/transfers`: nếu Backend chỉ kiểm tra JWT hợp lệ rồi lấy `request.fromAccount()` đem đi trừ tiền mà quên kiểm tra `fromAccount.ownerCif == jwt.cif`, kẻ tấn công điền `fromAccount` của đại gia bất kỳ và `toAccount` của chính hắn là rút sạch tiền người khác!",
          "Để miễn nhiễm 100% với BOLA không phụ thuộc vào trí nhớ thất thường của từng lập trình viên, một Senior Architect luôn áp dụng hai chốt chặn đồng thời: Chốt chặn 1 là tầng `@PreAuthorize` dùng Bean chuyên trách (ví dụ `@ownershipGuard.canAccessAccount(authentication, #accountNo)`) hoặc kiểm tra quyền ủy quyền trên đối tượng đồng sở hữu/doanh nghiệp; Chốt chặn 2 — và chắc chắn nhất ở tầng dữ liệu — là thiết kế chữ ký phương thức Repository luôn bắt buộc truyền kèm `ownerCif` lấy từ Token: thay vì viết `findById(Long txnId)`, hãy quy ước chuẩn toàn team chỉ được viết `findByIdAndOwnerCif(Long txnId, String authenticatedCif)`! Khi biến điều kiện sở hữu thành một phần bắt buộc của mệnh đề `WHERE` trong SQL, dù lập trình viên có quên viết `if` ở trên thì câu truy vấn cũng trả về `Optional.empty()` -> ném `404 Not Found` (hoặc `403 Forbidden`) an toàn tuyệt đối!",
          "Bên cạnh BOLA, hai anh em ruột của nó là `API3 - Broken Object Property Level Authorization (BOPLA / Mass Assignment)` và `API5 - Broken Function Level Authorization (BFLA)` cũng thường xuyên gây họa. Lỗi Mass Assignment xảy ra khi lập trình viên lười tạo DTO riêng mà nhận thẳng `@RequestBody CustomerEntity customer` hoặc dùng `BeanUtils.copyProperties(reqMap, accountEntity)` không lọc trường: kẻ tấn công chỉ cần chèn thêm `\"kycTier\": 3, \"dailyLimit\": 5000000000, \"feeWaived\": true` vào cục JSON cập nhật địa chỉ email là tự nâng cấp tài khoản của mình lên VIP miễn phí! Trong Java 21, cách trị dứt điểm gọn gàng nhất là dùng `record` bất biến làm Request/Response DTO riêng biệt cho từng Use Case, chỉ khai báo đúng 2–3 trường khách được phép sửa. Còn với BFLA, mọi đường dẫn quản trị nội bộ như `/internal/**` hoặc `/admin/reconcile/**` ngoài việc kiểm tra Role `ROLE_BACKOFFICE_APPROVER` còn phải chặn cứng không cho đi lọt qua Ingress/API Gateway công cộng ngoài Internet."
        ],
        bullets: [
          "Chống lộ thông tin qua mã tuần tự (`Sequential ID Enumeration`): Không bao giờ dùng khóa chính tự tăng `1, 2, 3...` của bảng `transactions` hay `loan_applications` làm định danh trên URL API đối ngoại; hãy dùng `UUIDv7` hoặc mã giao dịch sinh ngẫu nhiên có kiểm soát để kẻ tấn công không thể viết vòng lặp `for (i = 1..1000000)` đoán mò tài nguyên.",
          "Cấm tuyệt đối đọc `X-User-Cif` từ Request ngoài biên chưa qua làm sạch: Nếu API Gateway giải mã JWT và gắn `X-Authenticated-Cif` truyền vào trong, Gateway BẮT BUỘC phải `strip/remove` sạch mọi header `X-Authenticated-*` do người dùng bên ngoài cố tình gửi lậu lên trước khi đính giá trị thật (hoặc tốt nhất truyền nguyên JWT vào trong để từng Microservice tự verify chữ ký theo tinh thần Zero Trust!).",
          "Áp dụng quy tắc `Deny by Default` ở cuối `SecurityFilterChain`: Luôn kết thúc cấu hình phân quyền bằng `.anyRequest().authenticated()` hoặc `.denyAll()`, tuyệt đối không để sót `.anyRequest().permitAll()` khi mở thêm endpoint mới."
        ]
      },
      {
        heading: "2. Chống SQL Injection ở Truy vấn Động, SSRF trên Cloud/K8s và Lạm dụng Luồng Nghiệp vụ",
        paragraphs: [
          "Nhiều bạn nghĩ dùng Spring Data JPA / Hibernate là không bao giờ dính `SQL Injection (SQLi)` nữa. Thực tế hoàn toàn không đơn giản vậy! Khi xây dựng màn hình tra cứu sao kê nâng cao trên cổng Ngân hàng Doanh nghiệp (Corporate Banking) có bộ lọc động và cho phép khách chọn cột sắp xếp (`?sortBy=bookingDate&dir=DESC`), rất nhiều lập trình viên nối thẳng chuỗi `\"SELECT * FROM ledger_entries WHERE account_id = :acc ORDER BY \" + sortBy + \" \" + dir` vì tham số tên cột không truyền qua dấu `?` của `PreparedStatement` được! Chỉ cần kẻ tấn công truyền `sortBy=(CASE WHEN (SELECT...) THEN booking_date ELSE amount END)`, hắn đã thực thi thành công `Blind SQL Injection` ngay trên Core Database! Quy tắc sắt đá: mọi tên cột sắp xếp hoặc toán tử động đều phải ánh xạ qua một `Enum` hoặc `Set.of(...)` Whitelist cố định trong Java trước khi ghép vào câu truy vấn.",
          "Một lỗ hổng hiện đại cực kỳ nguy hiểm khác trong `OWASP API7:2023` là `SSRF` (`Server-Side Request Forgery`). Trong hệ thống Fintech, có rất nhiều tính năng nhận một đường dẫn URL từ phía đối tác hoặc khách hàng rồi máy chủ Java tự mang `WebClient` / `RestClient` đi gọi tới URL đó: ví dụ cấu hình `Webhook Callback URL` báo kết quả thu hộ cho Merchant, tải ảnh hóa đơn từ link ngoài, hay import chứng từ XML. Nếu không kiểm tra nghiêm ngặt đích đến, kẻ tấn công sẽ đăng ký Webhook URL là `http://169.254.169.254/latest/meta-data/iam/security-credentials/` (địa chỉ Cloud Instance Metadata trên AWS/GCP/Azure) hoặc `http://internal-core-ledger.banking.svc.cluster.local:8080/actuator/env`! Ngay lập tức, chính Pod Java của ngân hàng trở thành 'tay trong' đọc hộ toàn bộ khóa IAM Cloud và cấu hình mật mạng nội bộ Kubernetes rồi gửi trả ra ngoài cho hacker!",
          "Cuối cùng là `API6 - Unrestricted Access to Sensitive Business Flows` (Lạm dụng luồng nghiệp vụ hợp lệ bằng bot tự động). Hãy xét API `POST /api/v1/napas/inquiry` dùng để hiển thị tên chủ tài khoản nhận khi khách gõ số tài khoản chuyển tiền 24/7: bản thân API này bắt buộc phải có để khách không chuyển nhầm tiền, nhưng nếu không giới hạn tốc độ chặt chẽ, các nhóm lừa đảo sẽ thuê 100 tài khoản chạy script vét cạn dải số tài khoản từ `0000000001` đến `9999999999` để lập danh bạ Họ tên + Số tài khoản toàn bộ người dân Việt Nam đem bán! Hệ thống ngân hàng bắt buộc phải áp dụng `Rate Limit & Anomaly Quota` theo `CIF` + `DeviceId` (ví dụ một khách cá nhân không có lý do gì tra cứu quá 15 số tài khoản lạ liên tiếp trong 1 phút mà không phát sinh giao dịch chuyển tiền thực tế; vượt ngưỡng lập tức khóa tạm tính năng tra cứu và bật cảnh báo Fraud)."
        ],
        bullets: [
          "Cách chống SSRF chuẩn (chống cả bẫy `DNS Rebinding`): Không chỉ kiểm tra chuỗi URL bằng Regex (vì hacker có thể trỏ tên miền `evil.com` phân giải ra `127.0.0.1` hoặc đổi bản ghi DNS ngay sát mili-giây kết nối!), mà phải viết Custom `DnsResolver` / `Socket` kiểm tra trực tiếp đối tượng `InetAddress` sau phân giải: cấm tuyệt đối `isLoopbackAddress()`, `isSiteLocalAddress()` (`10/8`, `172.16/12`, `192.168/16`), `isLinkLocalAddress()` (`169.254/16`) và chạy Worker gọi Webhook trong phân vùng mạng Egress DMZ hoàn toàn không có đường routing vào mạng Core nội bộ!",
          "Chặn XXE (`XML External Entity`) khi tích hợp SOAP / ISO 20022 XML: Luôn bật cờ `disallow-doctype-decl = true` và tắt `external-general-entities` trên mọi `DocumentBuilderFactory` / `SAXParserFactory` / `XMLInputFactory`.",
          "Giới hạn kích thước Payload & Độ sâu phân trang (`API4 - Unrestricted Resource Consumption`): Chặn `max-http-post-size` hợp lý (ví dụ 1MB cho API JSON thường) và ép trần `pageSize <= 100` để ngăn kẻ tấn công truyền `?size=2147483647` đánh sập JVM bằng `OutOfMemoryError`."
        ]
      },
      {
        heading: "3. Kiến trúc Che mờ Dữ liệu Nhạy cảm Tự động (Automated PII/SAD Masking) trong Logback",
        paragraphs: [
          "Em hãy thử hình dung luồng đường đi của một dòng `log.info(...)` trong kiến trúc ngân hàng hiện đại: Pod ứng dụng xuất JSON ra `stdout` -> FluentBit / Vector thu thập -> đẩy qua Kafka Logging -> đánh chỉ mục vào Elasticsearch / OpenSearch / Splunk -> lưu trữ 1 năm cho hàng trăm kỹ sư Dev, QA, L2 Support và Vận hành tra cứu sự cố. Nếu trong dòng log đó vô tình dính mật khẩu khách hàng, mã `OTP 6 số`, số thẻ `PAN 16 số`, số `CCCD` hay chuỗi `Authorization: Bearer eyJ...`, thì chỉ cần một nhân viên hỗ trợ tra log theo SĐT khách rồi copy mã OTP đang còn hiệu lực đọc cho đồng bọn (hoặc tài khoản Kibana bị lộ) là hậu quả khôn lường!",
          "Sai lầm phổ biến nhất là dựa dẫm hoàn toàn vào 'quy định miệng' bắt lập trình viên tự nhớ gọi hàm `MaskUtils.mask(cccd)` ở từng dòng `log.info`. Trong một dự án 300.000 dòng code với 40 lập trình viên ra vào liên tục, cộng thêm các thư viện bên thứ ba tự động log khi gặp lỗi parse JSON hay lỗi gọi HTTP đối tác, việc dựa vào trí nhớ con người chắc chắn sẽ thủng lỗ chỗ! Một Kiến trúc sư Bảo mật luôn thiết kế Phòng thủ 2 tầng tự động cho Logging: Tầng 1 ở lớp Mô hình dữ liệu (tạo Custom Jackson `@MaskSensitive` Serializer kết hợp override `toString()` trên các DTO nhạy cảm); và Tầng 2 — tấm lưới bảo hiểm cuối cùng bắt buộc phải có — là Bộ lọc biến đổi tự động ngay trong Engine ghi Log (`Logback ClassicConverter` hoặc `LogstashEncoder MaskingJsonGeneratorDecorator`).",
          "Khi tích hợp `BankingPiiMaskingConverter` vào cấu hình `logback-spring.xml` dùng chung trong thư viện nền tảng (`finbank-platform-starter`) của toàn ngân hàng, bất kể dòng log đó do Dev mới vào nghề viết cẩu thả hay do Exception của framework bắn ra, trước khi chạm xuống luồng xuất I/O nó đều bị quét qua các biểu thức chính quy đã biên dịch sẵn (`Pre-compiled Pattern`). Mọi chuỗi số khớp định dạng thẻ 16–19 chữ số đều tự biến thành `411111******1234`, CCCD 12 số thành `001******345`, và mọi cặp khóa-giá trị nhạy cảm (`otp`, `cvv`, `pin`, `password`, `secret`, `access_token`, `refresh_token`) đều bị thay thế sạch sẽ thành `***REDACTED***`!"
        ],
        bullets: [
          "Cảnh giác hiệu năng và lỗi `ReDoS` (`Regular Expression Denial of Service`) trong Log Masking: Bởi bộ lọc chạy trên MỌI dòng log của hệ thống 10.000 TPS, tuyệt đối phải `static final Pattern.compile(...)` một lần duy nhất lúc nạp class và viết biểu thức tuyến tính gọn gàng tránh lồng các dấu lặp `(a+)+` gây treo cứng 100% CPU khi gặp chuỗi log dài!",
          "Kiểm soát mức Log trên môi trường Production: Cấm bật `TRACE`/`DEBUG` cho các package mạng thấp như `reactor.netty.http.client`, `org.apache.hc.client5.http.wire` hay `org.hibernate.orm.jdbc.bind` trên Production vì chúng sẽ dump nguyên byte mảng mạng và tham số SQL thô ra log.",
          "Phân tách luồng `Security Audit Log` và `Application Debug Log`: Log phục vụ gỡ lỗi kỹ thuật được làm mờ tối đa và lưu ngắn ngày (14–30 ngày), trong khi nhật ký kiểm toán bảo mật ghi nhận hành động nghiệp vụ theo cấu trúc chuẩn được phân quyền đọc cực kỳ nghiêm ngặt riêng cho bộ phận SOC / Kiểm toán nội bộ."
        ]
      }
    ],
    comparison: {
      title: "Bảng nhận diện & Phác đồ khắc phục 4 lỗ hổng API nguy hiểm nhất ngành Ngân hàng",
      headers: ["Mã lỗ hổng OWASP API", "Kịch bản tấn công thực tế", "Nguyên nhân gốc trong Code Java", "Giải pháp kiến trúc triệt để"],
      rows: [
        [
          "`API1:2023` — BOLA / IDOR",
          "Đổi `accountNo` trên URL hoặc `fromAccount` trong JSON sang số tài khoản người khác để xem sao kê / rút tiền",
          "Chỉ kiểm tra đăng nhập (`isAuthenticated`), truy vấn DB theo `accountNo` mà quên đối chiếu `owner_cif` từ Token",
          "Dùng `@PreAuthorize` Ownership Guard + ép mọi hàm Repository nhận kèm `ownerCif` từ `SecurityContext`"
        ],
        [
          "`API3:2023` — BOPLA / Mass Assignment",
          "Chèn thêm trường `\"dailyLimit\": 9999999999` hoặc `\"role\": \"VIP\"` vào payload cập nhật thông tin cá nhân",
          "Nhận thẳng `@Entity` trong `@RequestBody` hoặc copy mù quáng mọi thuộc tính JSON vào đối tượng DB",
          "Tách bạch 100% các `Java Record Request/Response DTO` tối giản cho từng API cụ thể"
        ],
        [
          "`API5:2023` — BFLA (Quyền chức năng)",
          "Tài khoản khách hàng cá nhân gọi thẳng vào endpoint `/api/v1/admin/reversal` vốn dành cho kiểm soát viên",
          "Quên gắn `@PreAuthorize(\"hasRole(...)\")` trên Controller nội bộ và lộ route đó ra API Gateway công cộng",
          "Chặn route nội bộ ngay từ Ingress/Gateway biên + kiểm tra Role/Authority tường minh ở tầng Method Security"
        ],
        [
          "`API7:2023` — SSRF (Giả mạo gọi từ Server)",
          "Đăng ký URL nhận Webhook là `http://169.254.169.254/...` hoặc IP dịch vụ Core nội bộ để đọc trộm khóa hạ tầng",
          "Cho phép `WebClient`/`RestClient` kết nối tới URL bất kỳ do người dùng nhập mà không lọc địa chỉ IP sau phân giải DNS",
          "Kiểm tra chặn dải IP Private/Loopback/Link-local ở tầng Socket/DnsResolver + cô lập Worker gọi ngoài vào DMZ"
        ]
      ]
    },
    codeTitle: "Chốt chặn Chống BOLA (@PreAuthorize Ownership Guard) kết hợp Bộ lọc Logback Tự động Che mờ PII/SAD",
    code: [
      "@Component(\"ownershipGuard\")",
      "public class AccountOwnershipGuard {",
      "    private final AccountRepository accountRepo;",
      "",
      "    public AccountOwnershipGuard(AccountRepository accountRepo) {",
      "        this.accountRepo = accountRepo;",
      "    }",
      "",
      "    public boolean canAccessAccount(Authentication auth, String requestedAccountNo) {",
      "        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) return false;",
      "        String authenticatedCif = jwtAuth.getToken().getClaimAsString(\"cif\");",
      "        if (authenticatedCif == null || requestedAccountNo == null) return false;",
      "        return accountRepo.existsByAccountNoAndOwnerCifAndActiveTrue(requestedAccountNo, authenticatedCif);",
      "    }",
      "}",
      "",
      "// Controller usage: @PreAuthorize(\"@ownershipGuard.canAccessAccount(authentication, #accountNo)\")",
      "public class BankingPiiMaskingConverter extends ClassicConverter {",
      "    private static final Pattern PAN_REGEX = Pattern.compile(\"\\\\b(\\\\d{6})\\\\d{6,9}(\\\\d{4})\\\\b\");",
      "    private static final Pattern CCCD_REGEX = Pattern.compile(\"\\\\b(\\\\d{3})\\\\d{6}(\\\\d{3})\\\\b\");",
      "    private static final Pattern SECRET_KV_REGEX = Pattern.compile(",
      "        \"(?i)(otp|cvv2?|pin|password|access_token|refresh_token)(\\\"?\\\\s*[:=]\\\\s*\\\"?)([^\\\"&,\\\\s}]+)\");",
      "",
      "    @Override",
      "    public String convert(ILoggingEvent event) {",
      "        String raw = event.getFormattedMessage();",
      "        if (raw == null || raw.isEmpty()) return \"\";",
      "        String masked = PAN_REGEX.matcher(raw).replaceAll(\"$1******$2\");",
      "        masked = CCCD_REGEX.matcher(masked).replaceAll(\"$1******$2\");",
      "        return SECRET_KV_REGEX.matcher(masked).replaceAll(\"$1$2***REDACTED***\");",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "`AccountOwnershipGuard` trích xuất `authenticatedCif` trực tiếp từ `jwtAuth.getToken().getClaimAsString(\"cif\")` (dữ liệu đã được xác thực chữ ký mật mã), tuyệt đối không đọc `cif` từ tham số do Client tự khai báo.",
      "Gắn `@PreAuthorize(\"@ownershipGuard.canAccessAccount(authentication, #accountNo)\")` lên các API xem số dư, sao kê, trích nợ: Nếu khách hàng sửa `accountNo` trên URL sang tài khoản người khác, Spring Security chặn đứng với `403 Access Denied` ngay trước khi bước chân vào hàm nghiệp vụ.",
      "Trong `BankingPiiMaskingConverter`, cả 3 đối tượng `Pattern` đều được khai báo `private static final` biên dịch một lần duy nhất với biểu thức tuyến tính không đệ quy lùi sâu, đảm bảo tốc độ xử lý cực nhanh không gây `ReDoS` ở tải hàng nghìn log/giây.",
      "Cấu hình `<conversionRule conversionWord=\"maskedMsg\" converterClass=\"...BankingPiiMaskingConverter\"/>` trong `logback-spring.xml` giúp tự động che mờ mọi chuỗi số thẻ, CCCD và các trường `otp`/`cvv`/`pin`/`password`/`access_token` trong cả định dạng JSON lẫn Query String."
    ],
    labGuide: {
      goal: "Thực hành vá lỗ hổng BOLA trên API tra cứu sao kê & chuyển tiền bằng Spring Method Security + Repository Ownership Query, đồng thời tích hợp Logback Converter tự động che mờ mọi thông tin nhạy cảm trên console log.",
      steps: [
        "Bước 1: Tạo 2 khách hàng mẫu trong DB (`CIF_ALICE` sở hữu tài khoản `10001111` và `CIF_BOB` sở hữu tài khoản `10002222`); viết API `GET /api/v1/accounts/{accountNo}/statements` ban đầu chưa có kiểm tra sở hữu để trực tiếp tái hiện cách `CIF_ALICE` đọc trộm được sao kê của `CIF_BOB`.",
        "Bước 2: Bật `@EnableMethodSecurity`, đăng ký `AccountOwnershipGuard` gắn `@PreAuthorize` lên Controller VÀ sửa phương thức truy vấn sao kê thành `findStatementsByAccountNoAndOwnerCif(accountNo, currentCif)` để bảo vệ kép 2 lớp.",
        "Bước 3: Đăng ký `BankingPiiMaskingConverter` vào `src/main/resources/logback-spring.xml` thay thế `%msg` bằng `%maskedMsg`; thử viết lệnh `log.info(\"Debug payload: pan=4111222233334444, cccd=001095123456, {\"otp\":\"849201\"}\")`.",
        "Bước 4: Chạy bộ Integration Test `MockMvc`: chứng minh `CIF_ALICE` xem tài khoản `10001111` nhận `200 OK`, nhưng đổi sang `10002222` bị chặn `403 Forbidden`; đồng thời kiểm tra output console bằng `OutputCaptureExtension` của Spring Boot xác nhận dòng log in ra là `pan=411122******4444, cccd=001******456, {\"otp\":\"***REDACTED***\"}`."
      ],
      expectedOutput: "100% nỗ lực truy cập chéo tài khoản khác bị từ chối với `403 Forbidden`, và không một chuỗi số thẻ đầy đủ, CCCD hay mã OTP nào có thể xuất hiện dạng rõ trên luồng xuất log của ứng dụng."
    },
    examTips: [
      "Khi gặp bài Code Review vòng phỏng vấn Senior có API `transfer(@RequestBody TransferReq req)`: Việc ĐẦU TIÊN em phải soi ngay là `req.fromAccount()` có được kiểm tra thuộc quyền sở hữu của `cif` nằm trong `SecurityContext` hay không — bắt trúng lỗi BOLA này là ghi điểm tuyệt đối!",
      "Câu hỏi về SSRF trên môi trường Cloud/K8s: Luôn nhắc tới địa chỉ nhạy cảm bậc nhất `169.254.169.254` (Cloud Metadata Service) và giải pháp kiểm tra IP sau phân giải DNS (`InetAddress`) thay vì chỉ lọc chuỗi tên miền bằng `startsWith(\"http://localhost\")`.",
      "Khi thiết kế hệ thống Log Masking cho ngân hàng: Nhấn mạnh việc đóng gói `BankingPiiMaskingConverter` vào chung thư viện `spring-boot-starter` nội bộ để mọi microservice tự động thừa hưởng mà không phụ thuộc vào thao tác thủ công của từng lập trình viên."
    ],
    summaryTakeaways: [
      "Lỗ hổng số 1 của API ngân hàng là `BOLA (API1)`: có đăng nhập hợp lệ chưa đủ, bắt buộc đối chiếu chủ sở hữu tài nguyên trong DB khớp với `cif` trích xuất từ Token xác thực.",
      "Sử dụng `Java Record DTO` chuyên biệt cho từng thao tác thay vì bind thẳng vào `@Entity` để triệt tiêu hoàn toàn lỗ hổng `Mass Assignment (API3)`.",
      "Chặn `SQL Injection` trên tham số sắp xếp động bằng Whitelist cố định, và chặn `SSRF` bằng cách khóa cứng dải IP nội bộ / Link-local ở tầng kết nối mạng.",
      "Triển khai `Logback Masking Converter` với Regex biên dịch sẵn không đệ quy làm chốt chặn tự động cuối cùng ngăn rò rỉ PAN, CCCD, OTP, PIN ra hệ thống lưu trữ log."
    ],
    lessonQuestions: [
      {
        question: "API chuyển khoản nội bộ `POST /api/v1/transfers` nhận JSON gồm `{\"fromAccount\": \"102001\", \"toAccount\": \"109999\", \"amount\": 50000000}` và đã được gắn `@PreAuthorize(\"hasAuthority('SCOPE_transfer:write')\")`. Trong hàm Service, code khóa bản ghi `102001`, kiểm tra đủ số dư rồi thực hiện chuyển tiền ngay. Lỗ hổng chí mạng nào đang tồn tại?",
        options: [
          "Thiếu mã hóa Base64 cho trường `amount` trước khi truyền qua HTTPS.",
          "Dính lỗ hổng nghiêm trọng `OWASP API1 - BOLA`: kẻ tấn công có tài khoản hợp lệ (có `SCOPE_transfer:write`) chỉ cần điền `fromAccount` là số tài khoản của nạn nhân bất kỳ và `toAccount` là tài khoản của chính hắn để rút sạch tiền nạn nhân!",
          "Dính lỗi `Cross-Site Scripting (XSS)` trên bảng sổ cái PostgreSQL.",
          "Không có lỗ hổng nào vì API Gateway đã xác thực chữ ký JWT hợp lệ."
        ],
        answer: 1,
        explanation: "Kiểm tra `SCOPE_transfer:write` mới chỉ xác nhận người gọi được phép dùng tính năng chuyển tiền (Function-level), hoàn toàn chưa kiểm tra quyền sở hữu đối tượng tài khoản nguồn (`Object-level`). Hệ thống bắt buộc phải xác minh `fromAccount` thuộc sở hữu hợp pháp (hoặc ủy quyền trích nợ hợp lệ) của chính `cif` nằm trong JWT đang đăng nhập.",
        wrongReasons: [
          "Mã hóa Base64 không phải là cơ chế bảo mật hay phân quyền, và đường truyền đã có TLS.",
          "",
          "XSS là lỗ hổng thực thi mã JavaScript trên trình duyệt khi hiển thị dữ liệu không thoát ký tự, không phải bản chất lỗi chiếm quyền trích nợ ở đây.",
          "Chữ ký JWT hợp lệ chỉ chứng minh kẻ tấn công là một người dùng có đăng ký tài khoản thật, hoàn toàn không ngăn hắn truyền mã tài khoản của người khác vào `fromAccount`."
        ]
      },
      {
        question: "Cổng Thanh toán của Ngân hàng cho phép các đối tác thương mại điện tử tự cấu hình đường dẫn `webhookUrl` trên trang Portal để nhận thông báo gạch nợ đơn hàng tự động. Để phòng chống lỗ hổng `OWASP API7 - SSRF` (kẻ tấn công trỏ URL vào mạng nội bộ hoặc Cloud Metadata), biện pháp nào hiệu quả và chặt chẽ nhất?",
        options: [
          "Chỉ cần kiểm tra chuỗi `webhookUrl` không chứa từ khóa `\"localhost\"` và bắt đầu bằng `\"https://\"` hoặc `\"http://\"`.",
          "Phân giải tên miền ra đối tượng `InetAddress` ngay tại tầng kết nối mạng để từ chối mọi IP thuộc dải Loopback, Private (`10/8`, `172.16/12`, `192.168/16`), Link-local (`169.254.169.254`), tắt tự động theo dõi HTTP Redirect (`302`) và đặt Worker gửi Webhook trong phân vùng mạng Egress DMZ không có route vào mạng Core.",
          "Tăng thời gian ReadTimeout của `WebClient` lên 120 giây cho mọi Webhook.",
          "Gửi kèm JWT Admin nội bộ của Ngân hàng vào mọi lời gọi Webhook để đối tác tin tưởng."
        ],
        answer: 1,
        explanation: "Lọc chuỗi tên miền bề nổi rất dễ bị vượt qua bằng IP viết dạng thập phân/bát phân, HTTP `302 Redirect` sang IP nội bộ, hoặc tấn công `DNS Rebinding` (tên miền ngoài phân giải về `169.254.169.254` hoặc `10.0.x.x`). Kiểm tra trực tiếp địa chỉ IP đã phân giải ngay lúc mở kết nối + tắt Redirect + cô lập mạng Egress DMZ là kiến trúc phòng chống SSRF triệt để chuẩn ngân hàng.",
        wrongReasons: [
          "Kẻ tấn công dễ dàng trỏ bản ghi DNS `attacker.com -> 169.254.169.254` hoặc dùng `127.1` / `[::1]` để vượt qua bộ lọc chuỗi `\"localhost\"` đơn giản.",
          "",
          "Tăng Timeout không ngăn chặn SSRF mà còn làm cạn kiệt Thread/Connection Pool khi đối tác treo kết nối.",
          "Đính kèm JWT Admin nội bộ của ngân hàng gửi ra URL bên ngoài của đối tác sẽ làm lộ ngay khóa xác thực quản trị tối cao cho bên thứ ba!"
        ]
      }
    ]
  },

  K6: {
    duration: "65 phút",
    difficulty: "Chuyên sâu (Principal / Transaction Security & Audit)",
    codeLang: "java",
    teacherIntro: "Chào em, chúng ta đã đi tới bài khép lại Học phần Bảo mật Ngân hàng — bài K6 bàn về hai chốt chặn tối hậu bảo vệ tiền của khách hàng ở giây phút bấm nút 'Xác nhận chuyển tiền' và bảo vệ sự liêm chính của toàn bộ hệ thống trước nguy cơ gian lận nội gián: Smart OTP gắn ngữ cảnh giao dịch (`Transaction-bound OTP` chuẩn `OCRA RFC 6287` / `FIDO2` / Quyết định 2345 NHNN) và Nhật ký kiểm toán chuỗi băm bất biến (`Tamper-evident Hash Chain Audit Trail`). Em có bao giờ tự hỏi: tại sao suốt vài năm qua, các ngân hàng đồng loạt khai tử dần SMS OTP và cả mã OTP tĩnh 6 số đổi mỗi 30 giây kiểu Google Authenticator cho các giao dịch tiền lớn, để bắt buộc chuyển sang Smart OTP gắn giao dịch kết hợp Sinh trắc học? Câu trả lời nằm ở kịch bản lừa đảo tinh vi mang tên `Man-in-the-Browser` / `Real-time Phishing Proxy` — nơi khách hàng tự tay gõ đúng mã OTP thật 100% nhưng tiền lại chảy vào túi kẻ cướp! Hãy cùng thầy giải mã cơ chế mật mã đứng sau hai lá chắn cuối cùng này.",
    analogy: {
      title: "Tờ séc khắc chìm số tiền và tên người nhận không thể tẩy xóa, đi cùng cuốn sổ giáp lai đóng dấu nối trang",
      body: "Em hãy so sánh hai cách ký duyệt chi tiền của một Giám đốc. Cách cũ (`SMS OTP / TOTP thường`) giống như vị Giám đốc gọi điện đọc cho thư ký 6 con số mật khẩu dùng chung trong phút đó: thư ký đưa tờ trình mua văn phòng phẩm `500.000đ` cho Giám đốc xem trên màn hình, nhưng sau lưng lại lén tráo tờ giấy thật gửi xuống phòng Kế toán thành lệnh chuyển `5 tỷ đồng` sang tài khoản cá nhân — vì 6 con số mật khẩu kia chỉ gắn với đồng hồ thời gian chứ không hề dính dáng gì tới con số `500.000đ` nên phòng Kế toán vẫn thấy mật khẩu đúng và xuất tiền ngay! Ngược lại, Smart OTP gắn ngữ cảnh giao dịch (`Dynamic Linking`) giống như con dấu mật mã ép nhiệt trực tiếp lên dòng chữ `'Chi đúng 500.000đ cho Công ty A'`: nếu kẻ gian lén sửa thành `5 tỷ` hay đổi tên người nhận sang `Nguyễn Văn X`, con dấu kiểm tra dưới phòng Kế toán sẽ lệch hoàn toàn và hủy lệnh tức khắc! Còn `Hash Chain Audit Log` giống như cuốn sổ biên bản mà đầu trang 102 in chìm mã băm niêm phong của toàn bộ trang 101: bất kỳ ai xé trộm trang 101 hay sửa 1 con số ở trang 50 đều làm vỡ toang toàn bộ dây chuyền niêm phong của mọi trang phía sau!"
    },
    objectives: [
      "Hiểu sâu sự khác biệt bản chất giữa `TOTP` tĩnh (`RFC 6238`) và `Transaction-bound Smart OTP` (`OCRA RFC 6287` - Dynamic Linking), cũng như vai trò của `FIDO2/WebAuthn` và xác thực sinh trắc học theo ngưỡng rủi ro.",
      "Cài đặt chính xác thuật toán sinh & kiểm chứng mã Smart OTP gắn chặt với ngữ cảnh giao dịch (`txnId`, `toAccount`, `canonicalAmount`), sử dụng so sánh hằng thời gian chống Timing Attack và khóa chống vét cạn.",
      "Thiết kế hệ thống lưu vết kiểm toán chống sửa xóa (`Tamper-evident Cryptographic Hash Chain` kết hợp lưu trữ `WORM`) để phát hiện tức thì mọi hành vi can thiệp trái phép từ cả quản trị viên cấp cao (DBA/Root)."
    ],
    flow: [
      {
        step: "1. Khởi tạo Lệnh Chờ & Đóng băng Ngữ cảnh Giao dịch (Draft Transaction)",
        detail: "Khi khách lập lệnh chuyển `50.000.000đ` tới tài khoản `1903668899`, Backend lưu bản nháp bất biến gắn `txnId`, kiểm tra ngưỡng rủi ro (yêu cầu đối khớp khuôn mặt sinh trắc học nếu vượt ngưỡng quy định) và trả mã thử thách giao dịch về App."
      },
      {
        step: "2. Hiển thị Minh bạch (WYSIWYS) & Ký Mật mã Cục bộ trên Secure Enclave",
        detail: "App Mobile hiển thị rõ Số tiền + Tài khoản thụ hưởng cho khách xác nhận bằng FaceID/Vân tay để mở khóa `DeviceSeed` trong vùng phần cứng an toàn, tính `SmartOTP = Truncate6(HMAC_SHA256(Seed, txnId | toAccount | amount | timeWindow))`."
      },
      {
        step: "3. Kiểm chứng Ràng buộc Ngữ cảnh & Chống Dùng Lại Mã OTP",
        detail: "Server tự đọc lại `toAccount` và `amount` từ bản nháp gốc trong DB (không tin dữ liệu gửi lại từ ngoài), tính lại giá trị kỳ vọng, so sánh hằng thời gian `MessageDigest.isEqual(...)` và đánh dấu cửa sổ OTP đó đã tiêu thụ trên Redis."
      },
      {
        step: "4. Ghi Sổ Nhật ký Chuỗi Băm Nối tiếp & Chốt Mỏ neo WORM",
        detail: "Mọi sự kiện phê duyệt hạn mức, đổi khóa hay xác thực giao dịch lớn được ghi nối đuôi với `currHash = SHA256(seqNo | prevHash | actor | action | timestamp | payload)`, đồng thời định kỳ ký chốt mốc đẩy sang kho lưu trữ bất biến `WORM`."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao SMS OTP / TOTP thường thất thủ và sức mạnh của Smart OTP gắn giao dịch (OCRA)",
        paragraphs: [
          "Trong nhiều năm, `SMS OTP` và ứng dụng sinh mã `TOTP` (`Time-based One-Time Password` - RFC 6238) từng là tiêu chuẩn phổ biến để xác thực hai yếu tố (`2FA`). Tuy nhiên, trước làn sóng tội phạm công nghệ cao hiện đại, cả hai phương thức này đều bộc lộ tử huyệt chí mạng: thứ nhất, tin nhắn SMS truyền qua hạ tầng viễn thông `SS7` dễ bị chuyển hướng SIM (`SIM Swapping`), trạm phát sóng giả (`IMSI Catcher` / `SMS Blaster` phát tin nhắn mạo danh Brandname ngân hàng kèm link lừa đảo) hoặc mã độc Android đọc trộm tin nhắn; thứ hai — và sâu xa hơn về mặt mật mã học — cả SMS OTP lẫn TOTP truyền thống đều mù ngữ cảnh giao dịch (`Context-blind`)!",
          "Hãy phân tích công thức toán học của TOTP thường: `OTP = Truncate(HMAC-SHA1(SecretSeed, floor(UnixTime / 30)))`. Em thấy đấy, đầu vào của hàm băm chỉ có duy nhất `SecretSeed` của người dùng và `Thời gian hiện tại`, hoàn toàn vắng bóng `Số tiền` và `Tài khoản người nhận`! Trong kịch bản tấn công `Real-time Phishing Proxy (AiTM)` hoặc phần mềm độc hại chiếm quyền trợ năng màn hình (`Malware Overlay / Man-in-the-Browser`), kẻ gian dụ khách hàng thực hiện giao dịch nạp tiền điện thoại `50.000đ` hoặc đăng nhập xác minh tài khoản; cùng giây phút đó ở phía sau, máy chủ của kẻ gian lập một lệnh rút sạch `490.000.000đ` trên tài khoản thật của khách. Khi khách nhìn thấy màn hình đòi nhập 6 số OTP và gõ mã TOTP trên máy mình vào, kẻ gian chuyển tiếp 6 số đó sang lệnh chuyển `490 triệu` — và máy chủ ngân hàng nếu dùng TOTP thường sẽ gật đầu duyệt ngay vì mã 6 số hoàn toàn khớp với thời gian hiện tại!",
          "Để chặt đứt tận gốc kịch bản đánh tráo lệnh này, chuẩn bảo mật ngân hàng châu Âu (`PSD2 SCA - Dynamic Linking`), chuẩn quốc tế `OCRA` (`RFC 6287` - OATH Challenge-Response Algorithm) và quy định an toàn giao dịch trực tuyến của Ngân hàng Nhà nước Việt Nam (như Quyết định 2345/QĐ-NHNN) yêu cầu mã xác thực cho giao dịch giá trị cao phải ràng buộc mật mã trực tiếp với dữ liệu cốt lõi của giao dịch (`Transaction Signing / Dynamic Linking`). Cụ thể, chuỗi thử thách đưa vào hàm `HMAC-SHA256` bắt buộc kết hợp `txnId | beneficiaryAccount | canonicalAmount | currency | timeStep`. Lúc này, nguyên tắc `WYSIWYS` (`What You See Is What You Sign`) được thiết lập: khách nhìn thấy trên màn hình điện thoại đúng tên và số tài khoản người nhận nào, số tiền bao nhiêu để bấm ký sinh trắc học, thì mã Smart OTP sinh ra chỉ mở khóa được duy nhất tổ hợp số tiền và người nhận đó. Kẻ tấn công giữa đường dù sửa lệch đi `1 đồng` hay đổi `1 chữ số` tài khoản nhận, mã OTP lập tức biến thành dãy số sai hoàn toàn!"
        ],
        bullets: [
          "Chuẩn hóa biểu diễn số tiền (`Canonical BigDecimal Formatting`) cực kỳ quan trọng: Trong Java, `new BigDecimal(\"5000000.00\").toString()` ra `\"5000000.00\"`, trong khi Mobile App có thể gửi `\"5000000\"` hoặc `BigDecimal` có scale âm gọi `.toString()` ra dạng khoa học `\"5E+6\"`! Luôn thống nhất quy tắc `amount.stripTrailingZeros().toPlainString()` ở cả Mobile SDK lẫn Backend để không lệch chuỗi ký!",
          "Chống dùng lại mã trong cùng cửa sổ 30 giây (`One-Time Consumption`): Sau khi mã Smart OTP khớp thành công cho `txnId`, bắt buộc lưu vết đã sử dụng lên Redis và chuyển trạng thái `txnId` ngay lập tức để cùng mã đó không thể gửi lặp lần 2.",
          "Khóa cứng sau N lần nhập sai liên tiếp (`Brute-force Lockout`): Mã 6 chữ số chỉ có `1.000.000` khả năng; bắt buộc giới hạn tối đa sai 5 lần liên tiếp là hủy ngay lệnh giao dịch hiện tại và tạm khóa phương thức Smart OTP kèm gửi cảnh báo đẩy cho chủ tài khoản!"
        ]
      },
      {
        heading: "2. Bảo vệ Hạt giống Mật mã trên Thiết bị, Sinh trắc học QĐ 2345 & Chuẩn FIDO2/WebAuthn",
        paragraphs: [
          "Thuật toán Smart OTP gắn giao dịch dù chặt chẽ đến đâu cũng sẽ sụp đổ nếu hạt giống bí mật `DeviceSeed` lưu lỏng lẻo trong file `SharedPreferences` hay `SQLite` thông thường trên điện thoại khách hàng — nơi một phần mềm độc hại trên máy đã Root/Jailbreak có thể chép trộm mang về máy tính của hacker tự tính OTP thoải mái! Trong kiến trúc Mobile Banking chuẩn Production, quá trình kích hoạt Smart OTP (`Seed Provisioning`) sử dụng trao đổi khóa bất đối xứng (`ECDH P-256` kèm xác thực eKYC sinh trắc học khuôn mặt khớp dữ liệu chip NFC CCCD) để sinh và khóa chặt hạt giống ngay bên trong vi mạch bảo mật phần cứng của điện thoại (`iOS Secure Enclave` trên iPhone hoặc `Android Keystore / StrongBox` trên Android).",
          "Khóa bảo vệ hạt giống trong `Secure Enclave / StrongBox` được gắn cờ phần cứng `UserAuthenticationRequired = true` và `InvalidatedByBiometricEnrollment = true`: nghĩa là mỗi lần cần tính mã Smart OTP cho giao dịch chuyển tiền, chip bảo mật bắt buộc hệ điều hành xác thực thành công khuôn mặt/vân tay thật của chủ máy mới mở khóa cho phép ký; và nếu có ai đó biết mật khẩu mở khóa màn hình rồi lén đăng ký thêm một dấu vân tay mới vào điện thoại, phần cứng sẽ tự động hủy vĩnh viễn khóa Smart OTP, buộc phải định danh lại từ đầu!",
          "Đối với các giao dịch vượt ngưỡng rủi ro hoặc vượt hạn mức quy định (ví dụ chuyển tiền cá nhân > `10 triệu VNĐ/lần` hoặc tổng lũy kế trong ngày > `20 triệu VNĐ/ngày`, hay giao dịch lần đầu trên thiết bị mới theo Quyết định 2345/QĐ-NHNN), chỉ xác thực vân tay/FaceID cục bộ của hệ điều hành điện thoại vẫn chưa đủ (vì chủ điện thoại lừa đảo hoặc máy bị can thiệp có thể tự đăng ký mặt mình vào máy!). Khi đó, luồng `Step-up Authentication` yêu cầu thu nhận ảnh/video khuôn mặt thời gian thực kèm kiểm tra thực thể sống chống giả mạo ảnh chụp/video/Deepfake (`Active/Passive Liveness Detection` chuẩn ISO/IEC 30107-3) rồi đối khớp trực tuyến trên Server với mẫu khuôn mặt chuẩn đã xác thực từ chip CCCD của khách hàng. Song hành trên kênh Web và Mobile thế hệ mới là chuẩn `FIDO2 / WebAuthn (Passkeys)`: sử dụng cặp khóa bất đối xứng `ECDSA` mà phần thử thách ký luôn bao gồm tên miền gốc `rpId` (`Origin-bound` — ví dụ `ebank.finbank.vn`) ngay từ tầng trình duyệt/hệ điều hành, giúp miễn nhiễm 100% trước mọi trang web giả mạo tên miền gần giống kiểu `ebank-finbank-vn.com`!"
        ],
        bullets: [
          "So sánh hằng thời gian (`Constant-Time Comparison`) khi kiểm tra OTP/HMAC: Tuyệt đối không dùng `expectedOtp.equals(userOtp)` thông thường cho các chữ ký mật mã nhạy cảm (vì `String.equals` dừng ngay ở ký tự đầu tiên bị lệch, tạo kẽ hở đo thời gian phản hồi nano-giây); hãy luôn dùng `MessageDigest.isEqual(a, b)` kiểm tra hết toàn bộ mảng byte trong thời gian không đổi!",
          "Kiểm tra tính toàn vẹn môi trường ứng dụng (`RASP` / `Play Integrity` / `App Attest`): Trước khi cho phép kích hoạt hoặc ký Smart OTP giá trị lớn, SDK bảo mật kiểm tra thiết bị không bị Root/Jailbreak, không gắn công cụ dịch ngược động `Frida`/`Xposed` và không có ứng dụng điều khiển màn hình từ xa (`Accessibility Service` lạ đang bật).",
          "Thời gian chờ nguội sau kích hoạt thiết bị mới (`Cooling-off Period` / `Reduced Limit`): Khi khách hàng vừa đổi sang điện thoại mới và kích hoạt lại Smart OTP lần đầu, hệ thống quản trị rủi ro thường áp hạn mức trần thấp hơn trong 24 giờ đầu tiên để giảm thiểu thiệt hại nếu khách bị lừa cài đặt thiết bị từ xa."
        ]
      },
      {
        heading: "3. Nhật ký Kiểm toán Bất biến (Tamper-evident Hash Chain & WORM) chống Gian lận Nội gián",
        paragraphs: [
          "Sau khi đã chặn đứng mọi kẻ tấn công từ bên ngoài, câu hỏi cuối cùng mà Thanh tra Ngân hàng Nhà nước và Kiểm toán Độc lập luôn đặt lên bàn Kiến trúc sư trưởng là: 'Nếu một Quản trị viên Cơ sở dữ liệu (DBA) hoặc Kỹ sư Hạ tầng cao cấp có quyền truy cập vào máy chủ Production tự ý sửa lịch sử phê duyệt nâng hạn mức tín dụng, hoặc xóa dấu vết 1 dòng log tra cứu trái phép hồ sơ khách hàng VIP trong bảng `audit_logs`, hệ thống của anh phát hiện bằng cách nào?'. Nếu bảng `audit_logs` chỉ là một bảng SQL bình thường có `INSERT`, một câu lệnh `UPDATE audit_logs SET ...` hoặc `DELETE FROM audit_logs WHERE id = 9482` của người nắm quyền cao sẽ làm biến mất dấu vết êm ru như chưa từng tồn tại!",
          "Để biến bảng nhật ký kiểm toán thành một bằng chứng pháp lý không thể bị làm giả âm thầm (`Tamper-evident Audit Trail`), chúng ta áp dụng cấu trúc dữ liệu mật mã nền tảng của sổ cái phân tán: Chuỗi băm liên kết tuần tự (`Cryptographic Hash Chain`). Mỗi bản ghi kiểm toán thứ `N` không chỉ lưu người thao tác (`actor_cif`), hành động (`action`), thời gian (`created_at`) và chi tiết (`payload_json`), mà còn lưu hai cột mật mã bắt buộc: `prev_hash` (chép nguyên giá trị `curr_hash` của bản ghi ngay liền trước `N - 1`, với bản ghi gốc số 0 nối vào hằng số khởi nguyên `GENESIS_HASH`) và `curr_hash = SHA-256(seq_no | prev_hash | actor_cif | action | created_at | payload_json)`.",
          "Hãy quan sát sự kỳ diệu của mắt xích toán học này: Giả sử kẻ gian nội bộ sửa số tiền phê duyệt trong `payload_json` ở dòng thứ `5.000` -> lập tức `curr_hash` thực tế của dòng `5.000` thay đổi khác với cột `prev_hash` đang được neo giữ ở dòng `5.001`! Thế nếu kẻ gian ranh mãnh viết một đoạn script tính lại toàn bộ `curr_hash` và `prev_hash` dây chuyền từ dòng `5.000` cho tới dòng cuối cùng `100.000` trong Database thì sao? Để khóa chết luôn đường lui này, định kỳ mỗi 1–5 phút (hoặc mỗi 1.000 dòng), một tiến trình độc lập sẽ lấy `(latest_seq_no, latest_curr_hash)` đưa vào HSM ký số (`Checkpoint Anchor Signature`) rồi bắn ra một kho lưu trữ độc lập bật chế độ `WORM` (`Write-Once-Read-Many` — ví dụ AWS S3 Object Lock ở chế độ `Compliance Mode` hoặc máy chủ Syslog/ImmuDB đặt ở vùng quản trị của khối An ninh SOC hoàn toàn tách rời quyền quản trị của đội DBA/IT Infra). Ở chế độ S3 Object Lock Compliance, ngay cả tài khoản `Root` cao nhất của toàn tập đoàn cũng không thể sửa hay xóa file chốt mỏ neo đó trước thời hạn lưu trữ 5–10 năm! Nhờ vậy, bất kỳ sự sửa đổi hay xóa dòng nào trong Database cũng sẽ lệch với mỏ neo chữ ký WORM và làm nổ còi báo động an ninh cấp độ 1 ngay tức khắc!"
        ],
        bullets: [
          "Cấp quyền tài khoản DB tối thiểu cho ứng dụng (`Append-Only DB Role`): Tài khoản PostgreSQL/Oracle mà Microservice dùng để ghi vào bảng `audit_logs` chỉ được cấp đúng quyền `SELECT, INSERT` (tuyệt đối thu hồi quyền `UPDATE, DELETE, TRUNCATE`) kèm `TRIGGER BEFORE UPDATE OR DELETE` ném lỗi cứng ngay ở tầng Engine CSDL.",
          "Xử lý tuần tự hóa khi nối chuỗi băm tải cao: Để tránh khóa toàn bộ một dòng cuối duy nhất gây nghẽn ở quy mô cực lớn, có thể chia chuỗi băm theo phân vùng định danh (`Partitioned Hash Chains`, ví dụ 16 luồng chuỗi băm độc lập `shard_00..15` hoặc nối chuỗi theo từng `accountId`/`module`) mà vẫn bảo toàn tính phát hiện sửa xóa trên từng chuỗi!",
          "Tác vụ Kiểm định Tự động Định kỳ (`Continuous Integrity Verifier Job`): Chạy ngầm mỗi 15 phút đọc lại đoạn chuỗi băm mới phát sinh đối chiếu với các bản chốt mỏ neo trên kho `WORM`, gửi metric `audit_chain_integrity_ok = 1` lên Grafana/SIEM phục vụ báo cáo tuân thủ."
        ]
      }
    ],
    comparison: {
      title: "Bảng phân cấp các phương thức Xác thực Giao dịch Ngân hàng theo mức độ An toàn & Chống lừa đảo",
      headers: ["Phương thức xác thực", "Ràng buộc số tiền & người nhận?", "Chống Phishing / Tráo lệnh MitB?", "Phạm vi áp dụng thực tế Ngân hàng"],
      rows: [
        [
          "SMS OTP truyền thống",
          "KHÔNG (văn bản tin nhắn dễ bị kẻ gian lừa đọc hoặc chặn bắt qua mã độc/SS7)",
          "Rất yếu — dễ dính SIM Swap, trạm giả SMS Blaster và trang web lừa đảo thu thập OTP",
          "Chỉ còn giữ hạn chế cho giao dịch giá trị rất nhỏ hoặc kênh dự phòng mức rủi ro thấp"
        ],
        [
          "TOTP tĩnh 30 giây (`RFC 6238`)",
          "KHÔNG — mã 6 số chỉ phụ thuộc vào `Seed` và thời gian hiện tại",
          "Yếu trước Real-time Phishing Proxy và Malware sửa ngầm người nhận sau khi khách nhập OTP",
          "Phù hợp đăng nhập cổng nội bộ IT, KHÔNG ĐỦ an toàn cho giao dịch chuyển tiền giá trị cao"
        ],
        [
          "Smart OTP gắn giao dịch (`OCRA RFC 6287`)",
          "CÓ — hàm HMAC băm trực tiếp `txnId + toAccount + amount` vào công thức sinh OTP",
          "Rất mạnh chống tráo lệnh giữa đường: sửa lệch 1 đồng hay đổi tài khoản nhận là OTP vô hiệu ngay",
          "Chuẩn chủ lực của Mobile Banking hiện nay cho xác nhận giao dịch chuyển tiền / thanh toán"
        ],
        [
          "Smart OTP / `FIDO2` + Sinh trắc học Khuôn mặt (QĐ 2345)",
          "CÓ — kết hợp ký khóa phần cứng gắn tên miền (`rpId`) và đối khớp sinh trắc học sống (`Liveness`)",
          "Mức bảo vệ tối đa: chống cả Web giả mạo tên miền, tráo lệnh lẫn chiếm quyền điều khiển thiết bị từ xa",
          "Bắt buộc cho giao dịch vượt ngưỡng giá trị lớn (> 10tr/lần, > 20tr/ngày) và đổi thiết bị mới"
        ]
      ]
    },
    codeTitle: "Kiểm chứng Smart OTP gắn Ngữ cảnh Giao dịch (OCRA Dynamic Linking) & Ghi Audit Chuỗi Băm Bất biến",
    code: [
      "@Service",
      "public class SmartOtpAndAuditChainService {",
      "    private static final long STEP_SECONDS = 30L;",
      "    private final AuditTrailRepository auditRepo;",
      "",
      "    public SmartOtpAndAuditChainService(AuditTrailRepository auditRepo) {",
      "        this.auditRepo = auditRepo;",
      "    }",
      "",
      "    public boolean verifyTransactionSmartOtp(byte[] deviceSeed, String txnId, String toAccount,",
      "                                             BigDecimal amount, String submittedOtp) {",
      "        long currentStep = Instant.now().getEpochSecond() / STEP_SECONDS;",
      "        String canonicalAmt = amount.stripTrailingZeros().toPlainString();",
      "        for (long drift = -1; drift <= 0; drift++) { // Tolerate -30s network/clock lag",
      "            String challenge = txnId + \"|\" + toAccount + \"|\" + canonicalAmt + \"|\" + (currentStep + drift);",
      "            String expectedOtp = dynamicTruncate6(hmacSha256(deviceSeed, challenge));",
      "            if (MessageDigest.isEqual(expectedOtp.getBytes(StandardCharsets.UTF_8),",
      "                                      submittedOtp.getBytes(StandardCharsets.UTF_8))) {",
      "                return true;",
      "            }",
      "        }",
      "        return false;",
      "    }",
      "",
      "    @Transactional(rollbackFor = Exception.class)",
      "    public AuditLogEntry appendTamperEvidentAudit(String actorCif, String action, String payloadJson) {",
      "        AuditLogEntry prev = auditRepo.findTailForUpdate().orElseGet(AuditLogEntry::genesis);",
      "        Instant ts = Instant.now().truncatedTo(ChronoUnit.MILLIS);",
      "        String linkData = prev.seqNo() + \"|\" + prev.currHash() + \"|\" + actorCif + \"|\" + action + \"|\" + ts + \"|\" + payloadJson;",
      "        String currHash = HexFormat.of().formatHex(sha256(linkData));",
      "        return auditRepo.save(new AuditLogEntry(prev.seqNo() + 1, actorCif, action, payloadJson, ts, prev.currHash(), currHash));",
      "    }",
      "",
      "    private String dynamicTruncate6(byte[] hmac) {",
      "        int offset = hmac[hmac.length - 1] & 0x0F;",
      "        int binCode = ((hmac[offset] & 0x7F) << 24) | ((hmac[offset + 1] & 0xFF) << 16)",
      "                    | ((hmac[offset + 2] & 0xFF) << 8) | (hmac[offset + 3] & 0xFF);",
      "        return String.format(\"%06d\", binCode % 1_000_000);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Chuẩn hóa số tiền bằng `amount.stripTrailingZeros().toPlainString()` trước khi ghép chuỗi `challenge`: Tránh tuyệt đối lỗi lệch chữ ký do khác biệt `5000000` với `5000000.00` hoặc lỗi biểu diễn mũ khoa học `5E+6` của `BigDecimal.toString()`.",
      "Đưa cả `txnId`, `toAccount` và `canonicalAmt` (đọc từ bản nháp giao dịch lưu phía Server) vào `hmacSha256` kèm `MessageDigest.isEqual(...)`: Vừa khóa chặt mã OTP vào đúng người nhận & số tiền (chống tráo lệnh MitB), vừa so sánh hằng thời gian chống tấn công đo độ trễ.",
      "Hàm `dynamicTruncate6` cài đặt chuẩn rút gọn động `RFC 4226 / RFC 6287`: Lấy 4 bit cuối làm vị trí `offset` trích 31-bit nguyên dương và định dạng `\"%06d\"` để giữ nguyên các số `0` đứng đầu (ví dụ `\"048219\"`).",
      "Hàm `appendTamperEvidentAudit` làm tròn mốc thời gian `truncatedTo(ChronoUnit.MILLIS)` (tránh lệch độ phân giải nano-giây khi đọc lại từ cột `TIMESTAMPTZ` của PostgreSQL!) và băm nối `prev.currHash()` tạo thành mắt xích phát hiện mọi can thiệp sửa/xóa dòng."
    ],
    labGuide: {
      goal: "Cài đặt và kiểm thử trọn vẹn luồng ký giao dịch Smart OTP chống tráo đổi số tài khoản thụ hưởng, kết hợp trình kiểm định phát hiện ngay lập tức khi có ai đó sửa trộm bảng `audit_logs` trong Database.",
      steps: [
        "Bước 1: Cài đặt `SmartOtpAndAuditChainService` kèm hai hàm tiện ích `hmacSha256` và `sha256` dùng `javax.crypto.Mac` / `java.security.MessageDigest` chuẩn của JDK 21.",
        "Bước 2: Viết kịch bản kiểm thử tấn công `Man-in-the-Browser`: Khách hàng sinh mã Smart OTP trên thiết bị cho giao dịch chuyển `1.000.000đ` tới tài khoản `ACC_GOOD`; giả lập kẻ tấn công giữ nguyên mã OTP đó nhưng sửa tài khoản đích thành `ACC_HACKER` (hoặc sửa số tiền thành `90.000.000đ`) -> Xác nhận `verifyTransactionSmartOtp` trả về `false` 100%!",
        "Bước 3: Gọi liên tiếp 5 lần `appendTamperEvidentAudit(...)` để ghi 5 sự kiện phê duyệt giao dịch vào PostgreSQL; viết hàm `verifyAuditChainIntegrity()` duyệt từ dòng 1 đến dòng 5 tính lại `SHA-256` và kiểm tra `row[i].prevHash == row[i-1].currHash` -> Xác nhận chuỗi nguyên vẹn `VALID`.",
        "Bước 4: Đóng vai một DBA biến chất mở console SQL chạy lệnh `UPDATE audit_logs SET payload_json = '{\"amount\":1000}' WHERE seq_no = 3` (hoặc `DELETE` dòng số 3), sau đó chạy lại `verifyAuditChainIntegrity()` -> Xác nhận trình kiểm định phát hiện chính xác vị trí bị giả mạo tại `seq_no = 3 / 4`!"
      ],
      expectedOutput: "Giao dịch hợp lệ đúng ngữ cảnh được duyệt mượt mà, mọi nỗ lực tráo đổi số tiền hoặc người nhận đều làm vô hiệu mã Smart OTP ngay lập tức, và bất kỳ thao tác sửa/xóa trái phép nào trực tiếp trong bảng `audit_logs` đều bị phát hiện chính xác tới từng số thứ tự bản ghi."
    },
    examTips: [
      "Câu hỏi phỏng vấn phân loại Senior/Lead: 'Tại sao TOTP kiểu Google Authenticator không chống được tráo lệnh chuyển tiền?' -> Trả lời thẳng vào bản chất: TOTP chỉ băm `(Seed, Time)` nên mù ngữ cảnh giao dịch; bắt buộc nâng lên `Transaction-bound OTP (OCRA)` băm gộp `(Seed, TxnId, BeneficiaryAccount, CanonicalAmount, Time)`.",
      "Bẫy ngầm rất hay gặp khi tự cài đặt Hash Chain với Database: Kiểu `Instant.now()` trên Java 21 trên Linux có độ chính xác tới nano-giây (9 chữ số thập phân), trong khi cột `TIMESTAMP(3)` hoặc `TIMESTAMPTZ(6)` của DB tự làm tròn cắt bớt phần đuôi! Khi đọc lại từ DB để kiểm định chuỗi băm sẽ lệch toàn bộ timestamp nếu quên `.truncatedTo(ChronoUnit.MILLIS)` ngay từ lúc tạo!",
      "Khi hội đồng hỏi 'Nếu DBA sửa dòng 50 rồi viết script tính lại toàn bộ chuỗi băm từ dòng 50 đến dòng cuối thì sao?': Đưa ra ngay mảnh ghép quyết định là Chữ ký chốt mốc định kỳ (`Periodic HSM-signed Checkpoint Anchor`) đẩy sang kho lưu trữ bất biến `WORM` (như S3 Object Lock Compliance Mode) nằm ngoài quyền quản trị của DBA."
    ],
    summaryTakeaways: [
      "Smart OTP cấp độ ngân hàng (`OCRA RFC 6287`) khóa chặt mã xác thực vào đúng số tiền và tài khoản người nhận (`Dynamic Linking`), triệt tiêu hoàn toàn tấn công tráo lệnh giữa đường.",
      "Hạt giống `DeviceSeed` trên Mobile phải nằm trong phần cứng bảo mật (`Secure Enclave` / `StrongBox`), mở khóa bằng sinh trắc học và kết hợp đối khớp khuôn mặt sống (`Liveness`) cho giao dịch vượt ngưỡng.",
      "Luôn chuẩn hóa biểu diễn `BigDecimal` không số 0 thừa, so sánh mã xác thực bằng hằng thời gian `MessageDigest.isEqual`, chống dùng lại OTP trong cùng cửa sổ và khóa ngay sau 5 lần nhập sai.",
      "Nhật ký kiểm toán ngân hàng phải thiết kế theo mô hình `Append-only Cryptographic Hash Chain` kết hợp chốt chữ ký định kỳ lên kho lưu trữ `WORM` độc lập để chống sửa xóa bởi cả nội gián quyền cao nhất."
    ],
    lessonQuestions: [
      {
        question: "Khách hàng cài nhầm một ứng dụng giả mạo có chứa mã độc chiếm quyền hiển thị trên điện thoại. Khi khách lập lệnh chuyển `200.000đ` trả tiền cơm trưa cho đồng nghiệp `10008888`, mã độc âm thầm sửa gói tin mạng gửi về Server thành chuyển `300.000.000đ` tới tài khoản kẻ gian `99996666`, trong khi trên màn hình khách vẫn thấy hiện `200.000đ` để bấm xác nhận lấy mã OTP. Phương thức xác thực nào dưới đây sẽ CHẶN ĐỨNG được giao dịch gian lận này ngay tại phía Server?",
        options: [
          "Gửi mã SMS OTP 6 số qua tổng đài tin nhắn thương hiệu (Brandname) của nhà mạng.",
          "Sử dụng mã TOTP 6 số tiêu chuẩn RFC 6238 (đổi mã mỗi 30 giây chỉ dựa trên thời gian thực).",
          "Sử dụng Smart OTP gắn ngữ cảnh giao dịch (`OCRA` / `Dynamic Linking`) — nơi mã OTP sinh ra từ `HMAC(DeviceSeed, txnId | toAccount | amount | timeWindow)` dựa trên đúng số tiền và tài khoản hiển thị cho khách xác nhận, kết hợp kiểm tra sinh trắc học vượt ngưỡng.",
          "Yêu cầu khách hàng nhập lại mật khẩu đăng nhập tĩnh lần thứ hai."
        ],
        answer: 2,
        explanation: "Với Smart OTP gắn giao dịch (Dynamic Linking), thiết bị của khách hàng tính mã OTP dựa trên thông tin hiển thị là `(10008888, 200000)`, trong khi Server nhận gói tin bị tráo `(99996666, 300000000)` sẽ tính ra một mã OTP kỳ vọng hoàn toàn khác. Hai mã không khớp khiến giao dịch gian lận bị từ chối tức khắc; hơn nữa mức tiền 300 triệu còn kích hoạt bắt buộc đối khớp sinh trắc học khuôn mặt sống trên Server.",
        wrongReasons: [
          "SMS OTP không gắn mật mã với nội dung số tiền/người nhận ở tầng xác thực, hoặc mã độc chiếm quyền màn hình đọc trộm luôn nội dung tin nhắn gửi về để tự điền.",
          "TOTP chuẩn RFC 6238 chỉ phụ thuộc vào thời gian nên mã 6 số vẫn hợp lệ cho mọi số tiền và mọi tài khoản đích trong cùng khung 30 giây đó.",
          "",
          "Mật khẩu tĩnh không phụ thuộc giao dịch và càng dễ bị mã độc ghi lại bàn phím (Keylogger) để tái sử dụng vô hạn lần."
        ]
      },
      {
        question: "Hệ thống Core Banking đã cài đặt bảng `audit_logs` theo cấu trúc chuỗi băm liên kết (`curr_hash = SHA256(seq_no | prev_hash | payload)`). Một kẻ tấn công chiếm được quyền quản trị tối cao trên máy chủ PostgreSQL (`superuser`) định sửa dòng log thứ `500` rồi chạy một script tự tính toán và cập nhật lại toàn bộ cột `prev_hash` và `curr_hash` từ dòng `500` đến dòng cuối cùng `10.000`. Kiến trúc bổ sung nào giúp phát hiện ngay hành vi tái tính toán toàn bộ đuôi chuỗi này?",
        options: [
          "Đổi hàm băm từ `SHA-256` sang `MD5` để tính nhanh hơn.",
          "Định kỳ mỗi vài phút ký số cặp `(latest_seq_no, latest_curr_hash)` bằng khóa trong HSM (`Checkpoint Anchor Signature`) và đẩy sang kho lưu trữ bất biến `WORM` (như S3 Object Lock Compliance Mode hoặc SIEM độc lập) nơi tài khoản DBA PostgreSQL hoàn toàn không có quyền sửa xóa.",
          "Thêm một cột `updated_at` tự động cập nhật trong chính bảng PostgreSQL đó.",
          "Tăng kích thước cột `curr_hash` lên `VARCHAR(500)`."
        ],
        answer: 1,
        explanation: "Chuỗi băm thuần túy nằm trọn trong cùng một Database vẫn có thể bị người nắm quyền `superuser` của chính Database đó tính lại toàn bộ phần đuôi từ điểm sửa đến cuối bảng. Khi kết hợp neo chốt chữ ký HSM định kỳ đẩy sang kho lưu trữ bất biến `WORM` thuộc vùng quản trị tách biệt, giá trị `curr_hash` tại các mốc đã chốt không thể bị giả mạo hay xóa bỏ, khiến mọi nỗ lực tính lại chuỗi trong DB bị phát hiện ngay khi đối chiếu với mỏ neo WORM.",
        wrongReasons: [
          "`MD5` đã bị phá vỡ về mặt chống va chạm mật mã và vẫn bị kẻ có quyền superuser tính lại toàn bộ đuôi chuỗi bình thường.",
          "",
          "Người có quyền `superuser` trên PostgreSQL có thể tắt trigger và tự gán bất kỳ giá trị giả nào vào cột `updated_at`.",
          "Độ dài cột lưu trữ không ngăn cản được việc chạy script cập nhật lại chuỗi băm."
        ]
      }
    ]
  }
});
