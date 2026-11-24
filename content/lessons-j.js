/* FinJava Senior Academy — Học phần J: Java Core Chuyên Sâu, JVM Internals & Concurrency Ngân Hàng */
window.LESSON_DETAILS = window.LESSON_DETAILS || {};
Object.assign(window.LESSON_DETAILS, {
  J1: {
    duration: "55 phút",
    difficulty: "Nền tảng sống còn → Senior",
    codeLang: "java",
    teacherIntro: "Chào em, anh vẫn nhớ như in đêm 31/12 cách đây bảy năm khi cả phòng Core Banking thức trắng chờ chạy Batch khóa sổ cuối năm (EOD). Đúng 01:15 sáng, màn hình giám sát đỏ rực vì tổng tài khoản trung gian thu phí chuyển tiền liên ngân hàng bị lệch đúng 342 đồng so với sổ cái tổng hợp (General Ledger) sau hơn 1,8 triệu giao dịch trong ngày. Nguyên nhân hóa ra đến từ một đoạn code trông cực kỳ vô hại của bạn dev mới: dùng kiểu double nhân tỷ lệ chiết khấu phí rồi truyền thẳng vào new BigDecimal(feeDouble) trước khi lưu xuống Database. Trong ngân hàng, lệch 10 tỷ rất dễ bắt vì chạm trần cảnh báo tức thì, nhưng lệch 1 đồng rải rác do sai số dấu phẩy động mới là cơn ác mộng khiến kế toán trưởng không thể ký báo cáo tài chính. Hôm nay anh em mình sẽ đóng đinh tư duy xử lý tiền tệ chuẩn tuyệt đối ngay từ bài học đầu tiên này.",
    analogy: {
      title: "Máy đếm tiền mệnh giá nguyên vs Chiếc cân lò xo ngoài chợ",
      body: "Hãy hình dung tại quầy giao dịch ngân hàng, nếu dùng kiểu float hay double để tính tiền thì chẳng khác nào giao dịch viên bỏ cọc tiền lên một chiếc cân lò xo để ước lượng giá trị: lò xo bị giãn nhẹ theo nhiệt độ nên 100.000 đồng lúc cân ra 99.999,99998 đồng, lúc lại thành 100.000,00004 đồng. Ngược lại, BigDecimal kết hợp cùng Value Object Money giống hệt chiếc máy đếm tiền chuyên dụng của kho quỹ trung ương: nó đếm chính xác từng con số nguyên vẹn trên mặt tờ tiền (unscaledValue), đóng dấu rõ ràng vị trí hàng thập phân theo loại ngoại tệ (scale) và áp dụng quy chế làm tròn thống nhất của Ngân hàng Nhà nước ở bước chốt sổ cuối cùng."
    },
    objectives: [
      "Giải thích tận gốc vì sao chuẩn nhị phân IEEE 754 (float/double) gây sai số tất yếu với phân số thập phân và nắm vững cấu trúc nội tại (intCompact, intVal, scale, precision) của BigDecimal.",
      "Triệt tiêu 3 lỗi chí mạng trong code tài chính: khởi tạo new BigDecimal(double), so sánh giá trị bằng equals() thay vì compareTo(), và chia không truyền RoundingMode gây nổ ArithmeticException.",
      "Thiết kế thành thạo Value Object Money bất biến (Immutable) trên Java 21 áp dụng Banker's Rounding (HALF_EVEN) và thuật toán phân bổ phần dư (Penny Allocation) đảm bảo tổng chia kỳ không lệch 1 xu."
    ],
    flow: [
      {
        step: "1. Tiếp nhận chuỗi thập phân nguyên bản (String / Long)",
        detail: "API nhận số tiền dưới dạng chuỗi chuẩn hóa (ví dụ \"1500000.50\") hoặc số nguyên đơn vị nhỏ nhất, tuyệt đối không deserialize JSON qua kiểu trung gian double/float gây nhiễm sai số nhị phân."
      },
      {
        step: "2. Đóng gói vào Value Object Money bất biến kèm ISO Currency",
        detail: "Kiểm tra mã tiền tệ chuẩn ISO-4217 (VND có scale = 0, USD có scale = 2, JPY có scale = 0), chuẩn hóa scale hợp lệ và khóa bất biến đối tượng để an toàn tuyệt đối khi đi qua nhiều luồng."
      },
      {
        step: "3. Tính toán trung gian với độ chính xác mở rộng (MathContext)",
        detail: "Khi nhân lãi suất năm chia 365 ngày hoặc quy đổi tỷ giá chéo, giữ độ chính xác cao (ví dụ DECIMAL128 — 34 chữ số có nghĩa) ở các bước trung gian, tránh cắt cụt làm tròn quá sớm ở từng phép tính con."
      },
      {
        step: "4. Làm tròn chốt sổ (HALF_EVEN) & Phân bổ phần dư bảo toàn tổng",
        detail: "Áp dụng RoundingMode.HALF_EVEN tại điểm hạch toán cuối cùng; nếu chia một khoản tiền thành N kỳ trả góp hoặc N tài khoản thụ hưởng, rải từng đơn vị tiền lẻ dư vào các phần đầu để tổng sau chia khớp 100% số gốc."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu chuẩn IEEE 754 và cấu trúc nội tại của BigDecimal",
        paragraphs: [
          "Nhiều lập trình viên nghĩ rằng 0.1 + 0.2 ra 0.30000000000000004 là một 'lỗi của Java', nhưng thực chất mọi ngôn ngữ dùng phần cứng CPU chuẩn IEEE 754 (C++, Python, JavaScript, Go) đều gặp hiện tượng này. Máy tính lưu số thực dưới hệ nhị phân (lũy thừa cơ số 2: 1/2, 1/4, 1/8, 1/16...). Cũng giống như phân số 1/3 trong hệ thập phân viết thành 0.333333... vô hạn tuần hoàn, phân số thập phân 1/10 (0.1) khi đổi sang hệ nhị phân trở thành chuỗi vô hạn 0.00011001100110011... Khi ép chuỗi vô hạn này vào đúng 53 bit phần định trị (mantissa) của kiểu double 64-bit, phần cứng buộc phải cắt cụt và làm tròn nhị phân ngay tại thời điểm gán biến.",
          "Để giải quyết triệt để bài toán thập phân, java.math.BigDecimal không dùng hệ cơ số 2 cho phần lẻ mà biểu diễn mọi con số theo công thức toán học chính xác: Giá trị = unscaledValue × 10^(-scale). Điểm thú vị ở tầng JVM Internals mà ít ứng viên biết khi phỏng vấn Senior là: BigDecimal không phải lúc nào cũng bọc đối tượng BigInteger nặng nề trên Heap. Nếu con số có từ 18 chữ số có nghĩa trở xuống (nằm gọn trong giới hạn Long.MAX_VALUE ≈ 9.22 × 10^18), JDK tự động lưu thẳng phần nguyên vào trường nguyên thủy 'private final transient long intCompact' giúp tốc độ cộng trừ nhanh gấp nhiều lần và giảm áp lực cho Garbage Collector."
        ],
        bullets: [
          "Precision (Độ chính xác) vs Scale (Bậc thập phân): Với số 12345.67, precision bằng 7 (tổng chữ số có nghĩa) còn scale bằng 2 (số chữ số sau dấu chấm). Với số 100000 VND, scale chuẩn bằng 0.",
          "Tuyệt đối cấm new BigDecimal(0.1): Vì hằng số 0.1 kiểu double đã mang giá trị thực tế là 0.1000000000000000055511151231257827021181583404541015625 trước khi hàm khởi tạo chạy, nên BigDecimal trung thực giữ nguyên toàn bộ 55 chữ số rác đó! Hãy luôn dùng new BigDecimal(\"0.1\") hoặc BigDecimal.valueOf(0.1) (bên trong gọi Double.toString(val) để khôi phục chuỗi thập phân sạch).",
          "Tính bất biến (Immutability): Mọi hàm add(), subtract(), multiply(), setScale() của BigDecimal KHÔNG BAO GIỜ sửa đối tượng gốc mà luôn trả về một thực thể BigDecimal mới. Bỏ quên gán lại biến (ví dụ viết balance.add(amount); trơ trọi) là lỗi ngớ ngẩn nhưng từng xuất hiện trên code review thực tế."
        ]
      },
      {
        heading: "2. Ba cái bẫy sinh tử: So sánh equals(), Khác biệt Scale và Chia Vô Hạn",
        paragraphs: [
          "Cái bẫy phổ biến thứ hai chỉ đứng sau double là dùng a.equals(b) để kiểm tra hai số tiền bằng nhau. Trong thiết kế của JDK, BigDecimal.equals() kiểm tra đồng thời cả giá trị toán học lẫn scale: tức là new BigDecimal(\"100.00\").equals(new BigDecimal(\"100\")) sẽ trả về FALSE! Trong hệ thống thực tế, một con số đọc từ cột NUMERIC(19,2) của PostgreSQL có scale = 2, trong khi hằng số kiểm tra hạn mức đọc từ cấu hình JSON có thể mang scale = 0. Nếu dùng equals(), điều kiện kiểm tra khớp số tiền thanh toán VietQR sẽ báo sai lệch dù cả hai đều là đúng một trăm nghìn đồng.",
          "Tương tự, khi đưa BigDecimal làm khóa (Key) trong HashMap hoặc phần tử trong HashSet, vì hashCode() đi đôi với equals(), hai số 100.0 và 100.00 sẽ sinh ra hai mã băm khác nhau và nằm ở hai ô khác nhau. Ngược lại, nếu đưa vào TreeSet hoặc TreeMap (dùng compareTo), chúng lại bị coi là trùng nhau! Cách phòng vệ chuẩn kiến trúc sư là không bao giờ để BigDecimal trần trụi trôi nổi khắp các tầng Service, mà phải gói vào Value Object Money và cưỡng bức chuẩn hóa scale ngay tại phễu khởi tạo (Compact Constructor). Ngoài ra, phép chia a.divide(b) không có tham số làm tròn sẽ ném ngay ngoại lệ Runtime ArithmeticException: Non-terminating decimal expansion nếu gặp thương số vô hạn như 1 chia 3 hoặc 100 chia 365."
        ],
        bullets: [
          "Quy tắc vàng khi so sánh: Luôn dùng a.compareTo(b) == 0 để kiểm tra bằng nhau về mặt giá trị tiền tệ, a.compareTo(b) > 0 để kiểm tra lớn hơn, và BigDecimal.ZERO.compareTo(amount) < 0 để xác nhận số tiền dương.",
          "Chuẩn hóa theo ISO-4217: Mỗi đồng tiền có số chữ số thập phân mặc định khác nhau (VND: 0, JPY: 0, USD: 2, EUR: 2, BHD/KWD đồng Dinar Trung Đông: 3). Không bao giờ hardcode setScale(2) cứng nhắc nếu hệ thống ngân hàng hỗ trợ đa tiền tệ (Multi-currency Core).",
          "Kiểm soát tràn chuỗi khi ghi Log/JSON: Luôn dùng amount.toPlainString() thay vì toString() khi tạo chuỗi ký số JWS, mã QR EMVCo hoặc thông điệp ISO 20022, bởi toString() có thể xuất ra ký pháp khoa học '1E+7' làm vỡ bộ parser của ngân hàng đối tác!"
        ]
      },
      {
        heading: "3. Làm tròn chuẩn Ngân hàng (HALF_EVEN) & Phân bổ Tiền lẻ (Penny Allocation)",
        paragraphs: [
          "Hồi đi học phổ thông chúng ta quen với làm tròn HALF_UP (cứ đuôi .5 là làm tròn lên). Nhưng hãy đặt mình vào vị trí Giám đốc Khối Nguồn vốn của ngân hàng có 10 triệu tài khoản CASA chạy tính lãi mỗi đêm: trong các phần thập phân từ .1 đến .9, các đuôi (.1, .2, .3, .4) gồm 4 trường hợp làm tròn xuống, các đuôi (.6, .7, .8, .9) gồm 4 trường hợp làm tròn lên đã tự triệt tiêu nhau; riêng đuôi chính giữa .5 nếu lúc nào cũng đẩy lên (HALF_UP) sẽ tạo ra độ lệch dương có hệ thống (Systematic Upward Bias). Sau hàng tỷ bút toán tính lãi, phí, quy đổi ngoại tệ, ngân hàng sẽ bị lệch hàng trăm triệu đồng so với kỳ vọng xác suất.",
          "Đó là lý do chuẩn IEEE 754 và giới tài chính quốc tế sử dụng Banker's Rounding — RoundingMode.HALF_EVEN: khi phần bỏ đi nằm đúng chính giữa (.5), hệ thống sẽ làm tròn về phía chữ số CHẴN gần nhất (ví dụ 2.5 thành 2, còn 3.5 thành 4). Vì xác suất chữ số đứng trước là chẵn hay lẻ xấp xỉ 50/50, sai số tích lũy trên tập dữ liệu lớn tiệm cận về 0. Tuy nhiên, ngay cả HALF_EVEN cũng chưa giải quyết hết bài toán chia gói tiền (Foemmel's Conundrum): chia hóa đơn 100.000 VND thành 3 kỳ trả góp không lãi suất, mỗi kỳ 33.333 VND cộng lại mới được 99.999 VND — vậy 1 đồng còn lại đi đâu? Ta bắt buộc phải dùng thuật toán phân bổ phần dư để rải từng đơn vị nhỏ nhất (1 đồng hoặc 0.01 USD) vào các phần đầu tiên: [33.334, 33.333, 33.333]."
        ],
        bullets: [
          "Khi nào dùng HALF_EVEN vs HALF_UP vs FLOOR: Lãi suất tích lũy nội bộ, định giá trái phiếu và phí liên ngân hàng ưu tiên HALF_EVEN; thuế GTGT (VAT) hoặc biểu phí niêm yết cho khách hàng cá nhân cần tuân thủ đúng văn bản quy định sản phẩm (nhiều biểu phí VN quy định làm tròn đến hàng đồng theo HALF_UP).",
          "Không làm tròn nhiều chặng (Double Rounding Trap): Nếu tính lãi = Số dư × Lãi năm / 365, hãy nhân trước rồi chia kèm làm tròn ở bước cuối: principal.multiply(annualRate).divide(DAYS_IN_YEAR, scale, RoundingMode.HALF_EVEN), không chia tỷ lệ lãi ngày làm tròn thấp trước rồi mới nhân số dư.",
          "Bất biến bảo toàn tổng (Conservation of Money): Mọi hàm chia tách giao dịch (chia hoa hồng đại lý, chia kỳ trả góp, phân bổ chiết khấu hóa đơn nhiều mặt hàng) đều phải có assertion kiểm chứng sum(allocatedParts) == originalTotal trước khi ghi sổ cái."
        ]
      }
    ],
    comparison: {
      title: "So sánh 4 phương pháp biểu diễn tiền tệ trong hệ thống Backend Tài chính",
      headers: ["Tiêu chí đánh giá", "double / float (IEEE 754)", "long (Đơn vị nhỏ nhất: xu/đồng)", "BigDecimal thô rải rác", "Value Object Money (Chuẩn DDD)"],
      rows: [
        ["Độ chính xác thập phân", "Sai lệch nhị phân ngay từ 0.1 + 0.2 (CẤM TUYỆT ĐỐI)", "Chính xác với cộng/trừ đơn giản, dễ tràn số khi nhân tỷ giá lớn", "Chính xác tuyệt đối nếu khởi tạo từ String / valueOf", "Chính xác tuyệt đối + cưỡng bức chuẩn scale tự động"],
        ["An toàn đa tiền tệ (VND/USD)", "Không có ngữ cảnh tiền tệ, dễ cộng nhầm USD vào VND", "Rất nguy hiểm khi trộn VND (scale 0) với USD (100 cents) hay KWD (1000 fils)", "Dễ lỗi equals() khác scale và quên kiểm tra cùng loại tiền", "Chặn đứng cộng khác loại tiền ngay lập tức, tự tra scale theo Currency"],
        ["Hiệu năng & Bộ nhớ JVM", "Nhanh nhất (8 bytes primitive), nhưng vô nghĩa vì sai tiền", "Cực nhanh (8 bytes primitive), phù hợp khớp lệnh HFT chứng khoán nội tệ", "Tốt nhờ tối ưu intCompact 64-bit cho số <= 18 chữ số", "Tốt, Java 21 Record gọn nhẹ và tái sử dụng an toàn đa luồng"],
        ["Khuyến nghị sử dụng", "Chỉ dùng cho tọa độ bản đồ ATM, thống kê xấp xỉ phi tài chính", "Hệ thống khớp lệnh siêu trễ thấp cố định 1 đơn vị tiền", "Tầng tính toán công thức nội bộ cấp thấp", "Chuẩn bắt buộc cho Core Banking, Payment Hub, Ledger & E-Wallet"]
      ]
    },
    codeTitle: "Money.java — Value Object Tiền tệ Bất biến Chuẩn Core Banking & Phân bổ Không Lệch 1 Đồng",
    code: [
      "package vn.finjava.core.domain.vo;",
      "",
      "import java.math.BigDecimal;",
      "import java.math.RoundingMode;",
      "import java.util.ArrayList;",
      "import java.util.Currency;",
      "import java.util.List;",
      "import java.util.Objects;",
      "",
      "public record Money(BigDecimal amount, Currency currency) implements Comparable<Money> {",
      "",
      "    public Money {",
      "        Objects.requireNonNull(amount, \"Số tiền không được phép null\");",
      "        Objects.requireNonNull(currency, \"Mã tiền tệ ISO-4217 không được null\");",
      "        int scale = Math.max(currency.getDefaultFractionDigits(), 0);",
      "        amount = amount.setScale(scale, RoundingMode.HALF_EVEN);",
      "    }",
      "",
      "    public static Money of(String exactAmount, String currencyCode) {",
      "        return new Money(new BigDecimal(exactAmount.trim()), Currency.getInstance(currencyCode));",
      "    }",
      "",
      "    public Money add(Money other) {",
      "        assertSameCurrency(other);",
      "        return new Money(this.amount.add(other.amount), this.currency);",
      "    }",
      "",
      "    public Money accrueDailyInterest(BigDecimal annualRate, int daysInYear) {",
      "        BigDecimal raw = this.amount.multiply(annualRate)",
      "                .divide(BigDecimal.valueOf(daysInYear), currency.getDefaultFractionDigits(), RoundingMode.HALF_EVEN);",
      "        return new Money(raw, this.currency);",
      "    }",
      "",
      "    public List<Money> allocateEqually(int parts) {",
      "        if (parts <= 0) throw new IllegalArgumentException(\"Số phần chia phải > 0\");",
      "        int scale = currency.getDefaultFractionDigits();",
      "        BigDecimal unit = BigDecimal.ONE.scaleByPowerOfTen(-scale); // 1 VND hoặc 0.01 USD",
      "        BigDecimal base = this.amount.divide(BigDecimal.valueOf(parts), scale, RoundingMode.DOWN);",
      "        int remainderUnits = this.amount.subtract(base.multiply(BigDecimal.valueOf(parts))).divide(unit).intValueExact();",
      "        List<Money> result = new ArrayList<>(parts);",
      "        for (int i = 0; i < parts; i++) {",
      "            result.add(new Money(i < remainderUnits ? base.add(unit) : base, this.currency));",
      "        }",
      "        return List.copyOf(result);",
      "    }",
      "",
      "    private void assertSameCurrency(Money other) {",
      "        if (!this.currency.equals(other.currency)) {",
      "            throw new IllegalArgumentException(\"Không thể cộng/trừ khác loại tiền: \" + currency + \" vs \" + other.currency);",
      "        }",
      "    }",
      "",
      "    @Override public int compareTo(Money other) { assertSameCurrency(other); return this.amount.compareTo(other.amount); }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Compact Constructor của Java 21 Record (dòng 12–17) chuẩn hóa ngay lập tức scale của amount theo đúng chuẩn ISO-4217 của Currency (VND -> 0, USD -> 2). Nhờ mọi đối tượng Money cùng loại tiền luôn có cùng scale chuẩn, thậm chí phép equals() tự sinh của Record cũng trở nên an toàn tuyệt đối!",
      "Factory method Money.of(String, String) ép buộc tầng gọi truyền chuỗi thập phân chính xác, chặn ngay từ gốc thói quen truyền double gây nhiễm sai số IEEE 754.",
      "Phương thức accrueDailyInterest() thực hiện phép nhân principal * annualRate trước rồi mới divide() kèm RoundingMode.HALF_EVEN ở bước cuối cùng, triệt tiêu sai số làm tròn trung gian.",
      "Thuật toán allocateEqually() dùng RoundingMode.DOWN lấy phần nguyên cơ sở, tính chính xác số đơn vị nhỏ nhất còn dư (1 VND hoặc 0.01 USD nhờ scaleByPowerOfTen(-scale)) rồi cộng bù lần lượt cho các phần tử đầu, trả về List.copyOf() bất biến không thể bị sửa đổi bên ngoài."
    ],
    labGuide: {
      goal: "Chứng minh sai số thực tế của double khi cộng dồn 100.000 phí giao dịch và kiểm chứng thuật toán chia trả góp 100.000 VND làm 3 kỳ bằng class Money không lệch 1 đồng.",
      steps: [
        "Bước 1: Tạo dự án Maven/Gradle Java 21, copy record Money vào package vn.finjava.core.domain.vo.",
        "Bước 2: Trong hàm main hoặc JUnit 5 test, chạy vòng lặp cộng 100.000 lần số 0.1 bằng kiểu double và in kết quả (bạn sẽ thấy kết quả lệch thành 9999.999999986032 thay vì 10000.0).",
        "Bước 3: Khởi tạo Money total = Money.of(\"100000\", \"VND\") và gọi List<Money> installments = total.allocateEqually(3); in ra danh sách 3 kỳ trả góp.",
        "Bước 4: Dùng Stream reduce cộng ngược lại cả 3 phần tử trong installments và assert rằng sum.compareTo(total) == 0, đồng thời thử cộng Money VND với Money USD để kiểm chứng ngoại lệ bảo vệ."
      ],
      expectedOutput: "Danh sách 3 kỳ trả góp in ra chính xác: [33334 VND, 33333 VND, 33333 VND]. Tổng cộng ngược bằng đúng 100000 VND (lệch = 0). Thử cộng 100 VND + 10 USD ném ngay IllegalArgumentException rõ ràng."
    },
    examTips: [
      "Câu hỏi bẫy kinh điển: 'new BigDecimal(\"10.00\").equals(new BigDecimal(\"10\")) trả về gì?' — Trả lời dứt khoát là FALSE vì equals() so sánh cả scale (2 != 0), còn compareTo() trả về 0. Ghi điểm thêm bằng cách nêu giải pháp chuẩn hóa scale ngay trong Value Object Money.",
      "Khi hội đồng hỏi về cấu hình Jackson JSON cho API Ngân hàng: Hãy chủ động nhắc tới cờ DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS và viết Serializer xuất BigDecimal dạng chuỗi toPlainString() để tránh JavaScript phía Frontend mất độ chính xác với số nguyên lớn hơn Number.MAX_SAFE_INTEGER (2^53 - 1).",
      "Đừng quên bài toán chia tiền lẻ (Penny Allocation): Khi thiết kế tính năng chia hóa đơn (Split Bill), trả góp hay phân bổ khuyến mãi giỏ hàng, chủ động nêu thuật toán phân bổ phần dư sẽ khiến Tech Lead nhận ra ngay bạn đã từng làm hệ thống thanh toán thật."
    ],
    summaryTakeaways: [
      "Cấm tuyệt đối float/double và new BigDecimal(double) cho tiền tệ, phí, lãi suất, tỷ giá; luôn khởi tạo qua String hoặc BigDecimal.valueOf().",
      "Dùng compareTo() == 0 thay cho equals() khi so sánh BigDecimal rời rạc, và dùng toPlainString() khi tuần tự hóa sang chuỗi ký số/giao thức liên ngân hàng.",
      "Luôn chỉ định rõ scale và RoundingMode (ưu tiên HALF_EVEN cho tính lãi/hạch toán quy mô lớn) trong mọi phép divide() để tránh ArithmeticException.",
      "Bọc BigDecimal + Currency vào Value Object Money bất biến kèm thuật toán phân bổ phần dư để bảo toàn tuyệt đối tổng tiền trên sổ cái."
    ],
    lessonQuestions: [
      {
        question: "Trong dịch vụ đối soát thanh toán VietQR, lập trình viên kiểm tra số tiền khách chuyển (đọc từ cột NUMERIC(19,2) trong PostgreSQL có giá trị 500000.00) với số tiền đơn hàng từ Redis cache (khởi tạo từ chuỗi \"500000\") bằng lệnh if (!paidAmount.equals(orderAmount)). Chuyện gì sẽ xảy ra trên Production?",
        options: [
          "Giao dịch khớp thành công bình thường vì cả hai đều bằng năm trăm nghìn",
          "Hệ thống ném lỗi NullPointerException khi so sánh khác scale",
          "Điều kiện báo KHÔNG KHỚP oan uổng vì equals() của BigDecimal so sánh cả scale (scale 2 khác scale 0), khiến đơn hàng hợp lệ bị treo đối soát",
          "JVM tự động làm tròn paidAmount về scale 0 trước khi chạy equals()"
        ],
        answer: 2,
        explanation: "Phương thức equals() của BigDecimal yêu cầu cả giá trị toán học (unscaledValue quy đổi) LẪN scale phải giống hệt nhau. 500000.00 (scale=2) so với 500000 (scale=0) bằng equals() sẽ trả về false. Trong thực tế phải dùng paidAmount.compareTo(orderAmount) == 0 hoặc chuẩn hóa qua Value Object Money theo Currency.",
        wrongReasons: [
          "Sai vì BigDecimal.equals() không chỉ so giá trị đại số mà còn kiểm tra trường scale; 2 != 0 nên trả về false.",
          "Sai vì cả hai đối tượng đều khác null, khác scale hoàn toàn không gây ra NullPointerException.",
          "",
          "Sai vì BigDecimal là bất biến và JVM tuyệt đối không tự ý thay đổi scale của đối tượng trong hàm equals()."
        ]
      },
      {
        question: "Ngân hàng triển khai chương trình chia đều khoản hoàn tiền (Cashback) tổng cộng 1.000.000 VND cho nhóm 3 khách hàng cùng mở thẻ chung. Cách xử lý nào dưới đây đảm bảo chuẩn kế toán sổ cái kép?",
        options: [
          "Dùng BigDecimal chia với RoundingMode.HALF_EVEN để mỗi người nhận 333.333 VND và bỏ qua 1 VND lẻ vì giá trị quá nhỏ",
          "Dùng kiểu double lấy 1000000.0 / 3.0 rồi ép kiểu về long khi cộng vào số dư từng khách hàng",
          "Làm tròn lên RoundingMode.CEILING để mỗi người nhận 333.334 VND cho khách hàng vui vẻ",
          "Tính mức cơ sở bằng RoundingMode.DOWN (333.333 VND) và phân bổ phần dư 1 VND cho phần tử đầu tiên theo quy tắc xác định ([333.334, 333.333, 333.333]) để tổng Có bằng đúng tổng Nợ 1.000.000 VND"
        ],
        answer: 3,
        explanation: "Trong kế toán kép (Double-Entry Bookkeeping), tổng ghi Nợ tài khoản chi phí Marketing (1.000.000 VND) bắt buộc phải bằng chính xác 100% tổng ghi Có vào tài khoản các khách hàng. Thuật toán phân bổ phần dư (Penny Allocation) đảm bảo 333.334 + 333.333 + 333.333 = 1.000.000 VND không thừa, không thiếu 1 đồng.",
        wrongReasons: [
          "Sai nghiêm trọng vì làm bốc hơi 1 VND khiến bút toán Nợ (1.000.000) != Có (999.999), làm gãy cân bằng sổ cái EOD.",
          "Sai vì vừa vi phạm nguyên tắc cấm dùng double cho tiền tệ, vừa ép kiểu long cắt cụt thành 333.333 × 3 = 999.999 VND vẫn mất 1 đồng.",
          "Sai vì tổng chi thực tế thành 1.000.002 VND, vượt ngân sách phê duyệt của bút toán gốc và gây âm tài khoản treo khuyến mãi.",
          ""
        ]
      }
    ]
  },

  J2: {
    duration: "60 phút",
    difficulty: "Chuyên sâu JVM → Senior",
    codeLang: "java",
    teacherIntro: "Chào em, mùng 5 hàng tháng luôn là 'ngày bão táp' của mọi kỹ sư vận hành cổng thanh toán ngân hàng vì hàng nghìn doanh nghiệp đồng loạt đổ lương kết hợp khách cá nhân chuyển khoản trả tiền nhà. Anh từng trực chiến một ca mà đúng 09:45 sáng, khi lưu lượng chạm 4.200 TPS, tổng đài báo khách bị trừ tiền tạm giữ nhưng chuyển mạch NAPAS trả mã 68 (Response Received Too Late — quá hạn 2 giây) theo từng đợt sóng lặp lại mỗi 12 phút. Kiểm tra đường truyền专线 leased-line xanh mượt, PostgreSQL CPU mới 25%, anh mở GC Log của cụm Payment Hub chạy Heap 32GB lên thì thấy thủ phạm hiện nguyên hình: các chuỗi XML/JSON đối soát lớn gây Humongous Allocation làm G1GC rơi vào Evacuation Failure, đóng băng toàn bộ JVM (Stop-The-World) suốt 3,4 giây! Hiểu sâu bộ nhớ JVM và chọn đúng Garbage Collector trên Java 21 chính là ranh giới giữa một hệ thống thanh toán chạy êm ru 99.99% và một hệ thống cứ cao điểm là rớt lệnh.",
    analogy: {
      title: "Sảnh giao dịch bị thổi còi đứng hình vs Đội robot vệ sinh tàng hình",
      body: "Hãy tưởng tượng bộ nhớ Heap là mặt bàn làm việc của các giao dịch viên, còn rác bộ nhớ là hàng núi giấy nháp tính toán sau mỗi lượt khách. Với các bộ thu gom rác đời cũ hoặc khi xảy ra Full GC (Stop-The-World), bác bảo vệ sẽ thổi còi bắt TẤT CẢ giao dịch viên đang đếm tiền dở phải đứng bất động khoanh tay suốt mấy giây liền để đội lao công vào gom giấy nháp và xếp lại ngăn bàn — khách đứng ngoài cửa chờ quá 2 giây là bỏ đi (Timeout!). Ngược lại, Generational ZGC trên Java 21 giống như đội robot tàng hình dọn giấy nháp ngay trong lúc giao dịch viên vẫn đang thoăn thoắt đếm tiền; nhờ những 'nhãn màu thông minh' dán trên kẹp hồ sơ (Colored Pointers), nếu robot vừa dời kẹp hồ sơ sang ngăn mới chưa đầy tích tắc trước, tay giao dịch viên chạm vào sẽ tự động trỏ đúng sang ngăn mới chỉ mất dưới 0,5 mili-giây."
    },
    objectives: [
      "Bóc tách chính xác từng phân vùng bộ nhớ JVM (Eden/TLAB, Survivor, Old Gen, Metaspace, CodeCache, Direct Memory, Thread Stack) để tính toán ngân sách RAM chuẩn trên Kubernetes không bao giờ bị OOMKilled.",
      "Hiểu sâu sự khác biệt kiến trúc giữa G1GC (Region + Remembered Sets + nguy cơ Humongous Object) và Java 21 Generational ZGC (Colored Pointers + Load Barriers đạt độ trễ STW dưới 1 mili-giây).",
      "Thiết lập bộ cờ khởi động JVM chuẩn Production cho dịch vụ Core/Payment, đọc hiểu tín hiệu SafePoint / GC Log và khoanh vùng nhanh rò rỉ bộ nhớ (Memory Leak) qua Heap Dump."
    ],
    flow: [
      {
        step: "1. Cấp phát tốc độ ánh sáng trên TLAB (Eden Space)",
        detail: "Mỗi luồng xử lý giao dịch sở hữu một vùng đệm riêng TLAB (Thread-Local Allocation Buffer) trong Eden; việc new DTO/BigDecimal chỉ là dịch con trỏ bộ nhớ (bump-the-pointer) tốn vài nano-giây mà không cần khóa tranh chấp giữa các luồng."
      },
      {
        step: "2. Thu gom thế hệ trẻ (Young / Minor GC) diệt 98% đối tượng ngắn hạn",
        detail: "Hầu hết đối tượng Request, JSON node, chuỗi tạm trong một giao dịch chuyển tiền chỉ sống vài chục mili-giây rồi chết ngay tại Eden (Weak Generational Hypothesis), được dọn cực nhanh mà không chạm tới toàn bộ Heap."
      },
      {
        step: "3. Thăng cấp (Promotion) sang Old Generation cho dữ liệu sống dai",
        detail: "Các đối tượng tồn tại qua nhiều chu kỳ Young GC (như HikariCP Connection, bảng cấu hình ngân hàng, FX Rate Cache, Spring Singleton Beans) được chuyển sang vùng Old Gen để tránh phải sao chép qua lại nhiều lần."
      },
      {
        step: "4. Đánh dấu & Di dời đồng thời bằng Load Barrier (Generational ZGC)",
        detail: "ZGC quét đánh dấu và nén vùng nhớ song song cùng luồng nghiệp vụ; khi luồng Java đọc một tham chiếu cũ vừa được dời chỗ, Load Barrier tự chữa lành địa chỉ con trỏ ngay tức khắc (Self-healing), giữ thời gian tạm dừng STW < 1ms."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Toàn diện Bộ nhớ JVM: Sai lầm chết người khi tưởng JVM RAM = -Xmx",
        paragraphs: [
          "Một trong những sự cố phổ biến nhất khi ngân hàng đưa Microservices lên OpenShift/Kubernetes là đặt giới hạn Pod memory limit = 4Gi rồi cấu hình luôn -Xmx4g cho Java. Chỉ vài tiếng sau giờ mở cửa giao dịch, Pod đột ngột biến mất không để lại bất kỳ dòng Exception nào trong log ứng dụng, chỉ có mã thoát Exit Code 137 (SIGKILL từ Linux Kernel OOM Killer). Lý do là -Xmx chỉ giới hạn duy nhất vùng HEAP (nơi chứa các object khởi tạo bằng từ khóa new), trong khi tiến trình JVM còn tiêu thụ hàng trăm MB đến cả GB vùng nhớ NON-HEAP (Native Memory) nằm ngoài tầm kiểm soát của -Xmx!",
          "Cụ thể, tổng dung lượng RAM thực tế (RSS) của một tiến trình Java bao gồm: Heap (Young + Old) + Metaspace (lưu cấu trúc Class, Annotation, hàng nghìn class CGLIB Proxy do Spring AOP/Hibernate sinh ra) + CodeCache (chứa mã máy native đã được trình biên dịch JIT C1/C2 tối ưu hóa) + Direct Memory / Off-Heap (bộ đệm ByteBuffer.allocateDirect dùng cực nhiều bởi Netty, Spring WebFlux, Kafka Client và gRPC để truyền mạng Zero-copy) + Thread Stacks (mặc định mỗi Platform Thread ngốn 1MB stack riêng: 300 luồng Tomcat + Kafka + HikariCP đã ngốn đứt ~300MB) + bộ nhớ quản trị nội bộ của chính Garbage Collector (Remembered Sets / Page Tables)."
        ],
        bullets: [
          "Công thức cấp phát RAM an toàn trên Container: Trong Pod giới hạn 4GB RAM, chỉ nên cấp Heap khoảng 65%–70% (-Xms2800m -Xmx2800m hoặc -XX:MaxRAMPercentage=70.0), dành tối thiểu 1.2GB cho Metaspace, Direct Memory, Thread Stacks và overhead của GC.",
          "Luôn đặt -Xms bằng đúng -Xmx cho dịch vụ Core/Payment: Tránh việc JVM khởi động với Heap nhỏ rồi phải xin hệ điều hành cấp phát thêm trang nhớ và co giãn vùng Heap ngay giữa đỉnh tải giao dịch gây giật độ trễ (Latency Spike).",
          "Giới hạn Metaspace và Direct Memory tường minh: Bổ sung -XX:MaxMetaspaceSize=512m và -XX:MaxDirectMemorySize=512m để nếu có lỗi sinh class động vô tận hoặc rò rỉ Netty ByteBuf, JVM sẽ ném lỗi rõ ràng kèm stacktrace thay vì âm thầm ăn sạch RAM của node vật lý."
        ]
      },
      {
        heading: "2. G1GC vs Generational ZGC (Java 21): Cuộc cách mạng Độ trễ Dưới 1 Mili-giây",
        paragraphs: [
          "Từ Java 9 đến Java 21, G1GC (Garbage-First) là bộ thu gom rác mặc định cân bằng khá tốt giữa thông lượng (Throughput) và độ trễ mục tiêu (-XX:MaxGCPauseMillis=200). G1GC chia Heap thành khoảng 2.048 vùng nhỏ bằng nhau (Regions kích thước từ 1MB đến 32MB). Tuy nhiên, điểm yếu chí tử của G1GC trong hệ thống ngân hàng lộ ra ở hai kịch bản: thứ nhất là Humongous Objects — bất kỳ mảng byte[] hoặc char[] nào có kích thước lớn hơn 50% một Region (ví dụ parse chuỗi JSON lô sao kê 6MB trên Region 8MB) sẽ bị đẩy thẳng vào các Region liên tiếp nhau trong Old Gen, gây phân mảnh nghiêm trọng và kích hoạt STW kéo dài; thứ hai là khi Heap phình lên 16GB–64GB, thời gian quét và sơ tán đối tượng trong đợt Mixed GC vẫn có thể vọt lên 300ms–1.500ms ở phân vị P99.9.",
          "Bước sang Java 21 LTS, Generational ZGC (-XX:+UseZGC -XX:+ZGenerational) trở thành vũ khí tối thượng cho các hệ thống Payment Gateway, Core Ledger, Fraud Engine và Chứng khoán thời gian thực. Thay vì dừng toàn bộ luồng ứng dụng để di chuyển đối tượng và cập nhật lại hàng triệu con trỏ tham chiếu như G1GC, ZGC nhúng các bit trạng thái trực tiếp vào con trỏ 64-bit (Colored Pointers) kết hợp với rào chắn đọc (Load Barrier) được JIT chèn ở mức mã máy. Ngay cả khi một vùng nhớ đang được nén dọn, luồng giao dịch vẫn chạy song song; khoảnh khắc Stop-The-World của ZGC chỉ dùng để quét gốc ngăn xếp (Thread Roots) nên giữ cố định dưới 1 mili-giây (thường chỉ 0.1ms – 0.4ms) bất kể Heap là 4GB hay 128GB! Bản nâng cấp 'Generational' trên Java 21 tách riêng thế hệ Trẻ và Già giúp ZGC giảm tới 75% overhead bộ nhớ và tốn ít CPU hơn hẳn ZGC thế hệ đơn của Java 17."
        ],
        bullets: [
          "Sự đánh đổi thực chiến (Trade-off) cần nhớ rõ: Generational ZGC chiến thắng tuyệt đối về độ trễ đuôi P99.9 (< 1ms), đổi lại tiêu tốn thêm khoảng 5%–10% chu kỳ CPU cho Load Barriers và cần khoảng trống Heap dư (headroom ~20–25%) để tốc độ thu gom (Collection Rate) luôn kịp tốc độ xả rác (Allocation Rate).",
          "Khi nào chọn G1GC, khi nào chọn Generational ZGC: Chọn Generational ZGC cho mọi Online API nhạy cảm độ trễ (NAPAS 24/7, VietQR, Thẻ ISO 8583, Chống gian lận < 30ms) có Heap >= 4GB. Chọn G1GC hoặc ParallelGC cho các tiến trình Spring Batch chạy đêm (tính lãi EOD, xuất báo cáo) nơi tổng thời gian hoàn thành lô quan trọng hơn việc khựng vài trăm mili-giây.",
          "Tuyệt đối không gọi System.gc() trong code và thêm cờ -XX:+DisableExplicitGC để ngăn các thư viện bên thứ ba (như RMI cũ) vô tình kích hoạt đợt thu gom toàn cục ngoài ý muốn."
        ]
      },
      {
        heading: "3. Bẫy SafePoint (TTSP) và Quy trình Săn Lỗi Rò Rỉ Bộ Nhớ Chuẩn SRE Ngân hàng",
        paragraphs: [
          "Có một bí mật khiến nhiều Senior cũng bối rối: đôi khi GC Log ghi thời gian thu gom rác chỉ tốn 15ms, nhưng khách hàng và APM vẫn ghi nhận toàn bộ JVM bị đơ 2,8 giây! Thủ phạm mang tên Time-To-SafePoint (TTSP). Để bắt đầu pha tạm dừng ngắn, JVM phát tín hiệu yêu cầu mọi luồng đang chạy phải bước tới 'điểm dừng an toàn' (SafePoint — thường nằm ở cuối lời gọi hàm hoặc cuối vòng lặp không đếm). Nếu có 99 luồng đã đứng chờ ngoan ngoãn ở SafePoint, nhưng chỉ 1 luồng duy nhất đang mải chạy một vòng lặp int lớn (Counted Loop cũ), copy mảng khổng lồ hoặc bị kẹt I/O trang nhớ từ MappedByteBuffer trên ổ đĩa chậm, cả 99 luồng kia sẽ bị treo cứng chờ luồng cuối cùng đó tới điểm hẹn! Bật log -Xlog:safepoint sẽ vạch trần ngay khoảng trễ ẩn giấu này.",
          "Bên cạnh độ trễ GC, rò rỉ bộ nhớ (Memory Leak) trong Java không phải là quên giải phóng con trỏ như C++, mà là 'Unintentional Object Retention' — đối tượng đã hết giá trị nghiệp vụ nhưng vẫn bị giữ tham chiếu từ một GC Root khiến không bộ GC nào dám xóa. Dấu hiệu nhận diện kinh điển trên biểu đồ Grafana là hình răng cưa có đáy sau mỗi lần GC ngày càng dâng cao dần đều cho tới khi chạm trần 100% Heap. Khi đó, cờ -XX:+HeapDumpOnOutOfMemoryError sẽ là hộp đen máy bay vô giá giúp bạn mở file .hprof bằng Eclipse MAT, xem bảng Dominator Tree và chỉ đích danh biến nào đang nuốt trọn hàng triệu đối tượng."
        ],
        bullets: [
          "4 thủ phạm gây Memory Leak hàng đầu tại ngân hàng: (1) Dùng ThreadLocal lưu thông tin phiên/chữ ký trên luồng Tomcat/ThreadPool mà quên gọi threadLocal.remove() trong khối finally; (2) Cache tự chế bằng HashMap/ConcurrentHashMap tĩnh không có giới hạn kích thước tối đa (maxSize) và TTL như Caffeine; (3) Đọc toàn bộ kết quả truy vấn sao kê lớn bằng findAll() thay vì phân trang/Stream; (4) Đăng ký Listener/Callback hoặc mở InputStream/HttpClient mà không đóng bằng try-with-resources.",
          "Bộ cờ chẩn đoán bắt buộc trên Production: Luôn cấu hình ghi vòng xoay GC Log (-Xlog:gc*,safepoint:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=5,filesize=20m) — chi phí hiệu năng gần như bằng 0 (< 0.1%) nhưng cứu mạng khi điều tra sự cố.",
          "Kỷ luật vận hành trên K8s: Kết hợp -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps/heap.hprof (gắn vào volume lưu trữ riêng) kèm -XX:+ExitOnOutOfMemoryError để tiến trình lỗi thoát sạch sẽ cho K8s khởi tạo Pod khỏe mạnh mới thay vì sống thực vật treo nửa vời."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Garbage Collector trên Java 21 cho Hệ thống Tài chính - Ngân hàng",
      headers: ["Tiêu chí", "Parallel GC", "G1GC (Mặc định Java 21)", "ZGC Đơn thế hệ (Java 17)", "Generational ZGC (Java 21+)"],
      rows: [
        ["Thời gian dừng STW điển hình", "Hàng trăm ms đến vài giây (tăng tỷ lệ thuận kích thước Heap)", "20ms – 250ms (có thể vọt > 1s nếu dính Humongous / Full GC)", "Dưới 1ms (không phụ thuộc kích thước Heap)", "Dưới 1ms (thường 0.1ms – 0.4ms, ổn định cực cao)"],
        ["Chi phí CPU & Bộ nhớ phụ", "Thấp nhất, tối ưu hóa thông lượng xử lý thuần túy", "Trung bình (~5–8% RAM cho Remembered Sets, nhạy cảm vật thể lớn)", "Tốn khá nhiều RAM đệm và CPU vì phải quét chung cả đối tượng già/trẻ", "Giảm mạnh CPU & tiết kiệm tới 75% overhead bộ nhớ so với ZGC cũ"],
        ["Cờ kích hoạt chuẩn", "-XX:+UseParallelGC", "-XX:+UseG1GC -XX:MaxGCPauseMillis=100", "-XX:+UseZGC (trên JDK 17)", "-XX:+UseZGC -XX:+ZGenerational"],
        ["Bài toán Ngân hàng phù hợp nhất", "Spring Batch cuối ngày (EOD), kết xuất sao kê PDF/CSV ngoại tuyến", "Microservices nội bộ tải vừa, Back-office quản trị, Pod RAM nhỏ < 2GB", "Hệ thống cũ đang kẹt ở JDK 17 cần độ trễ thấp trên Heap lớn", "Core Payment 24/7, NAPAS/VietQR, ISO 8583, Fraud Engine SLA mili-giây"]
      ]
    },
    codeTitle: "JvmGcSlaWatchdog.java — Giám sát Sự kiện GC Pause Thời gian thực & Cảnh báo Nguy cơ Timeout NAPAS",
    code: [
      "package vn.finjava.core.observability;",
      "",
      "import com.sun.management.GarbageCollectionNotificationInfo;",
      "import java.lang.management.GarbageCollectorMXBean;",
      "import java.lang.management.ManagementFactory;",
      "import java.lang.management.MemoryMXBean;",
      "import java.lang.management.MemoryUsage;",
      "import javax.management.NotificationEmitter;",
      "import javax.management.openmbean.CompositeData;",
      "import org.slf4j.Logger;",
      "import org.slf4j.LoggerFactory;",
      "",
      "/*",
      " * Khuyến nghị JVM Flags Production (Pod K8s 6GB RAM chạy Core Payment Java 21):",
      " * java -XX:+UseZGC -XX:+ZGenerational -Xms4g -Xmx4g -XX:MaxMetaspaceSize=512m",
      " *      -XX:MaxDirectMemorySize=512m -XX:+DisableExplicitGC",
      " *      -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/dumps/payment.hprof",
      " *      -XX:+ExitOnOutOfMemoryError -Xlog:gc*,safepoint:file=/var/log/gc.log:time,uptime,tags:filecount=5,filesize=20m",
      " *      -jar core-payment-service.jar",
      " */",
      "public final class JvmGcSlaWatchdog {",
      "    private static final Logger log = LoggerFactory.getLogger(JvmGcSlaWatchdog.class);",
      "    private static final long SLA_PAUSE_WARN_MS = 150L; // Cảnh báo sớm trước ngưỡng 2000ms của NAPAS",
      "",
      "    public static void registerGcPauseListener() {",
      "        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();",
      "        for (GarbageCollectorMXBean gcBean : ManagementFactory.getGarbageCollectorMXBeans()) {",
      "            if (gcBean instanceof NotificationEmitter emitter) {",
      "                emitter.addNotificationListener((notification, handback) -> {",
      "                    if (!GarbageCollectionNotificationInfo.GARBAGE_COLLECTION_NOTIFICATION.equals(notification.getType())) return;",
      "                    var info = GarbageCollectionNotificationInfo.from((CompositeData) notification.getUserData());",
      "                    long durationMs = info.getGcInfo().getDuration();",
      "                    if (durationMs >= SLA_PAUSE_WARN_MS) {",
      "                        MemoryUsage heap = memoryBean.getHeapMemoryUsage();",
      "                        MemoryUsage nonHeap = memoryBean.getNonHeapMemoryUsage();",
      "                        log.warn(\"[GC-SLA-BREACH] Collector={} Action={} Cause='{}' Duration={}ms HeapUsed={}MB/{}MB NonHeapUsed={}MB\",",
      "                                info.getGcName(), info.getGcAction(), info.getGcCause(), durationMs,",
      "                                heap.getUsed() >> 20, heap.getMax() >> 20, nonHeap.getUsed() >> 20);",
      "                    }",
      "                }, null, null);",
      "            }",
      "        }",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Khối comment đầu file cung cấp nguyên bộ công thức JVM Flags thực chiến cho Pod 6GB RAM: khóa cứng -Xms4g = -Xmx4g với Generational ZGC, chừa đúng 2GB cho Metaspace (512MB) + DirectMemory (512MB) + OS/Thread Stacks/ZGC Page Table để triệt tiêu 100% lỗi K8s OOMKilled Exit 137.",
      "Sử dụng JMX NotificationEmitter lắng nghe trực tiếp sự kiện từ các GarbageCollectorMXBean theo cơ chế bất đồng bộ (Event-driven), không hề tốn vòng lặp polling định kỳ gây tốn CPU.",
      "Khi phát hiện đợt thu gom vượt ngưỡng cảnh báo sớm 150ms, hệ thống lập tức ghi log cấu trúc đầy đủ GcCause (ví dụ Allocation Stall / Humongous / Metadata GC Threshold) kèm cả dung lượng Heap lẫn Non-Heap quy đổi sang MB bằng phép dịch bit >> 20 siêu nhẹ.",
      "Pattern Matching cho instanceof trên Java 21 (if (gcBean instanceof NotificationEmitter emitter)) giúp code ngắn gọn, an toàn kiểu và loại bỏ ép kiểu thủ công rườm rà."
    ],
    labGuide: {
      goal: "So sánh trực tiếp thời gian dừng Stop-The-World giữa G1GC và Java 21 Generational ZGC dưới áp lực cấp phát mảng byte đối soát lớn liên tục.",
      steps: [
        "Bước 1: Nhúng class JvmGcSlaWatchdog và gọi JvmGcSlaWatchdog.registerGcPauseListener() ở đầu hàm main(), hạ tạm SLA_PAUSE_WARN_MS xuống 5ms để quan sát rõ sự khác biệt.",
        "Bước 2: Viết vòng lặp mô phỏng tải thanh toán: tạo liên tục các mảng byte[3 * 1024 * 1024] (3MB — kích hoạt Humongous Object trên Heap nhỏ) kết hợp giữ lại 20% trong một Ring Buffer 200 phần tử.",
        "Bước 3: Chạy chương trình lần 1 với cờ: java -XX:+UseG1GC -Xms512m -Xmx512m -Xlog:gc -cp ... Main và đếm số dòng cảnh báo [GC-SLA-BREACH] cùng thời gian pause cao nhất.",
        "Bước 4: Chạy lại chính chương trình đó lần 2 với cờ: java -XX:+UseZGC -XX:+ZGenerational -Xms512m -Xmx512m -Xlog:gc -cp ... Main và đối chiếu độ trễ STW trong GC Log."
      ],
      expectedOutput: "Ở lần chạy G1GC, xuất hiện nhiều đợt Humongous / Young Evacuation Pause kéo dài 15ms–80ms kích hoạt log [GC-SLA-BREACH]. Ở lần chạy Generational ZGC, các pha Pause Mark Start / Pause Relocate Start trong log đều giữ dưới 0.5ms, không một lần vi phạm ngưỡng cảnh báo!"
    },
    examTips: [
      "Khi được hỏi 'Pod Kubernetes giới hạn 4GB RAM mà dịch vụ Java không có log OutOfMemoryError nhưng cứ tự restart với Exit Code 137, tại sao?': Hãy trả lời ngay đây là Linux OOM Killer giết tiến trình vì tổng Heap (-Xmx) + Non-Heap (Metaspace, Direct ByteBuffer của Netty/Kafka, Thread Stacks, Native GC) vượt quá cgroup limit 4GB!",
      "Đừng trả lời máy móc 'ZGC luôn tốt hơn G1GC trong mọi trường hợp': Senior ghi điểm khi phân tích rõ đánh đổi — Generational ZGC đổi ~5-10% thông lượng CPU để mua lấy độ trễ đuôi P99.9 < 1ms cho Online Payment, còn Batch Job chạy đêm cần vắt kiệt CPU tính toán thì G1GC/ParallelGC vẫn kinh tế hơn.",
      "Nếu người phỏng vấn hỏi cách xử lý khi Production đang bị Memory Leak dâng RAM tới 92%: Trả lời chuẩn quy trình SRE — ngắt định tuyến tải mới khỏi Pod đó trên Load Balancer/Readiness, dùng jcmd <pid> GC.heap_dump lấy mẫu điều tra (nếu chưa có auto dump), tuyệt đối không xóa dấu vết hiện trường trước khi có ít nhất 1 bản chụp chẩn đoán."
    ],
    summaryTakeaways: [
      "Tổng RAM thực tế của JVM = Heap (-Xmx) + Metaspace + Direct Off-Heap + Thread Stacks + CodeCache + GC Overhead; trên container chỉ đặt Heap tối đa 65%–70% RAM Pod.",
      "Java 21 Generational ZGC (-XX:+UseZGC -XX:+ZGenerational) dùng Colored Pointers và Load Barriers giúp giữ thời gian dừng STW dưới 1ms bất chấp Heap lớn.",
      "Luôn đặt -Xms bằng -Xmx, bật xoay vòng GC + SafePoint log và cấu hình tự động xuất Heap Dump + ExitOnOutOfMemoryError cho dịch vụ thanh toán.",
      "Cảnh giác với 3 sát thủ gây sập bộ nhớ ngân hàng: đối tượng JSON/XML khổng lồ (Humongous), quên gọi ThreadLocal.remove(), và tải toàn bộ sao kê vào List trên RAM."
    ],
    lessonQuestions: [
      {
        question: "Một microservice Payment Gateway chạy trên Pod Kubernetes có resources.limits.memory = 4Gi. Kỹ sư cấu hình JAVA_TOOL_OPTIONS=\"-Xms4g -Xmx4g -XX:+UseG1GC\". Vào giờ cao điểm, Pod liên tục bị khởi động lại với trạng thái OOMKilled (Exit Code 137) dù trong log Java hoàn toàn KHÔNG xuất hiện java.lang.OutOfMemoryError. Nguyên nhân gốc rễ chính xác nhất là gì?",
        options: [
          "Do G1GC trên Java 21 không tương thích với Linux Container nên tự thoát tiến trình",
          "Do đặt -Xms bằng -Xmx làm JVM không thể thu gom rác vùng Eden",
          "Do ngoài 4GB Heap (-Xmx4g), tiến trình JVM còn cần thêm hàng trăm MB vùng nhớ Native/Non-Heap (Metaspace, Thread Stacks, Netty Direct Buffers, GC estruturas) làm tổng RSS vượt trần 4Gi của cgroup nên bị Linux Kernel bắn tín hiệu SIGKILL",
          "Do thiếu cờ -XX:+DisableExplicitGC nên hệ điều hành tự gọi System.gc() làm sập Pod"
        ],
        answer: 2,
        explanation: "Exit Code 137 (128 + 9 SIGKILL) là dấu hiệu đặc trưng của Linux Kernel OOM Killer ở tầng hệ điều hành/container, không phải ngoại lệ bên trong JVM. Khi cấp trọn 4GB cho riêng Heap (-Xmx4g) trong chiếc hộp chỉ rộng đúng 4Gi, ngay khi Metaspace, ngăn xếp của hàng trăm luồng và bộ đệm mạng Direct Memory phát sinh thêm dung lượng, tổng bộ nhớ vượt 4Gi và Kernel tiêu diệt tiến trình ngay lập tức trước khi JVM kịp ném OutOfMemoryError.",
        wrongReasons: [
          "Sai vì G1GC hoàn toàn tương thích tốt và nhận diện đầy đủ Container cgroup v1/v2 trên Java hiện đại.",
          "Sai vì đặt -Xms bằng -Xmx là thực hành tốt giúp cố định vùng Heap tránh co giãn động, không hề ngăn cản Young GC thu gom vùng Eden.",
          "",
          "Sai vì thiếu DisableExplicitGC chỉ cho phép gọi Full GC gây tốn CPU/độ trễ chứ không khiến Kernel giết tiến trình với mã 137."
        ]
      },
      {
        question: "Dịch vụ xử lý thẻ ISO 8583 trên Java 21 sử dụng Heap 24GB có yêu cầu SLA nghiêm ngặt: mọi giao dịch ở phân vị P99.9 phải phản hồi dưới 150ms, không chấp nhận các đợt giật cục Stop-The-World kéo dài vài trăm mili-giây. Cấu hình Garbage Collector nào phù hợp nhất?",
        options: [
          "-XX:+UseSerialGC vì đơn luồng không tốn chi phí đồng bộ hóa",
          "-XX:+UseParallelGC -XX:ParallelGCThreads=16 để tối đa hóa thông lượng CPU",
          "-XX:+UseZGC -XX:+ZGenerational để tận dụng thu gom đồng thời phân thế hệ với thời gian dừng STW dưới 1 mili-giây",
          "Tăng -XX:MaxGCPauseMillis=2000 trên G1GC để gom rác ít lần hơn"
        ],
        answer: 2,
        explanation: "Trên Heap lớn 24GB với yêu cầu P99.9 < 150ms nghiêm ngặt của giao thức thẻ ISO 8583, Generational ZGC (-XX:+UseZGC -XX:+ZGenerational) trên Java 21 thực hiện đánh dấu và di dời đối tượng đồng thời cùng luồng ứng dụng thông qua Colored Pointers và Load Barriers, giữ thời gian STW luôn dưới 1ms và xử lý cực kỳ hiệu quả các đối tượng ngắn hạn ở thế hệ trẻ.",
        wrongReasons: [
          "Sai vì SerialGC dừng toàn bộ ứng dụng và dọn Heap 24GB chỉ bằng 1 luồng duy nhất, gây treo hệ thống hàng chục giây.",
          "Sai vì ParallelGC ưu tiên Throughput nhưng thực hiện Stop-The-World toàn phần khi dọn Old Gen 24GB, dễ gây khựng từ vài trăm ms tới hàng giây làm vi phạm SLA 150ms.",
          "",
          "Sai vì đặt mục tiêu pause lên tới 2000ms (2 giây) cho phép G1GC dừng ứng dụng vượt xa tới hơn 13 lần ngưỡng SLA tổng 150ms của toàn giao dịch."
        ]
      }
    ]
  },

  J3: {
    duration: "55 phút",
    difficulty: "Cốt lõi Chịu tải cao → Senior",
    codeLang: "java",
    teacherIntro: "Chào em, có một câu nói xương máu trong giới kiến trúc sư ngân hàng: 'Đối tác bên ngoài chậm là chuyện bình thường, nhưng để đối tác chậm kéo sập luôn Core của mình thì lỗi 100% thuộc về mình'. Anh từng chứng kiến một sự cố lúc 11:30 trưa khi nhà mạng đối tác gửi SMS thông báo biến động số dư bị nghẽn cáp, thời gian phản hồi HTTP vọt từ 80ms lên 30 giây. Chỉ 7 phút sau, toàn bộ dịch vụ Payment Orchestrator sập trắng vì OutOfMemoryError kéo theo ngừng trệ cả tính năng chuyển tiền nội bộ! Khi mổ xẻ code, hóa ra tác giả tạo một Executors.newFixedThreadPool(32) dùng chung cho mọi tác vụ bất đồng bộ: 32 luồng nhanh chóng bị treo cứng chờ SMS, còn hàng trăm nghìn tác vụ mới tràn vào LinkedBlockingQueue không giới hạn (mặc định 2,14 tỷ phần tử) nuốt sạch Heap. Bài học hôm nay sẽ giúp em làm chủ từ tầng vi mô bộ nhớ CPU (JMM, CAS) cho tới nghệ thuật thiết kế Thread Pool cách ly chống đứt gãy dây chuyền.",
    analogy: {
      title: "Tổ chức sảnh giao dịch thông minh: Quầy chính, Ghế chờ hữu hạn và Vách ngăn khu vực",
      body: "Một ThreadPoolExecutor chuẩn ngân hàng hoạt động giống hệt cách Giám đốc Chi nhánh điều phối sảnh giao dịch: corePoolSize là 8 giao dịch viên biên chế ngồi trực thường xuyên; ArrayBlockingQueue(100) là đúng 100 chiếc ghế chờ có đánh số trong sảnh máy lạnh; maximumPoolSize(16) là 8 quầy tăng cường chỉ được mở thêm KHI VÀ CHỈ KHI cả 100 ghế chờ đã chật kín người; và RejectedExecutionHandler là bác điều phối viên đứng ngay cửa lịch sự thông báo 'Quầy đang quá tải, mời quý khách thử lại sau ít giây' thay vì cho 50.000 người chen cứng làm sập trần tòa nhà. Quan trọng hơn cả, quầy Chuyển tiền nhanh và quầy Đăng ký thông báo SMS được ngăn thành hai phòng độc lập (Bulkhead) để bên SMS kẹt giấy tờ không bao giờ lấy mất nhân sự của quầy Chuyển tiền."
    },
    objectives: [
      "Hiểu thấu Java Memory Model (JMM): cơ chế bộ nhớ đệm CPU L1/L2, quy tắc happens-before của volatile, sự khác biệt giữa khóa bi quan (ReentrantLock/synchronized) và nguyên tử không khóa CAS (AtomicLong vs LongAdder).",
      "Thuộc lòng cơ chế vận hành chính xác của 7 tham số trong ThreadPoolExecutor và lý giải vì sao các hàm tiện ích của lớp Executors mặc định bị cấm trong quy chuẩn code ngân hàng.",
      "Thiết kế kiến trúc Thread Pool cách ly theo miền đối tác (ThreadPool Bulkhead) kết hợp CompletableFuture có kiểm soát Timeout và tự động truyền ngữ cảnh định danh giao dịch (MDC traceId)."
    ],
    flow: [
      {
        step: "1. Kiểm tra số luồng biên chế (Running Threads < corePoolSize)",
        detail: "Khi một tác vụ mới được gửi vào execute(), nếu số luồng hiện có chưa đạt mức corePoolSize, Pool lập tức khởi tạo một luồng cốt lõi mới để xử lý ngay (kể cả đang có luồng core khác rảnh rỗi lúc mới khởi động)."
      },
      {
        step: "2. Xếp vào hàng đợi hữu hạn (Bounded BlockingQueue)",
        detail: "Khi đã đủ corePoolSize luồng đang hoạt động, tác vụ mới KHÔNG làm sinh thêm luồng ngay mà được đưa vào hàng đợi hữu hạn (ví dụ ArrayBlockingQueue 200 chỗ) chờ luồng core lấy ra xử lý tuần tự."
      },
      {
        step: "3. Mở rộng luồng dự phòng (Scale up tới maximumPoolSize)",
        detail: "CHỈ KHI hàng đợi hữu hạn đã đầy 100% công suất, ThreadPoolExecutor mới cấp phát thêm các luồng thời vụ cho tới trần maximumPoolSize; các luồng phụ này sẽ tự thu hồi sau khoảng thời gian rảnh keepAliveTime."
      },
      {
        step: "4. Kích hoạt chính sách từ chối có kiểm soát (RejectedExecutionHandler)",
        detail: "Khi cả hàng đợi đã đầy VÀ số luồng chạm trần maximumPoolSize, chính sách từ chối sẽ can thiệp (ghi nhận metric cảnh báo, trả mã lỗi 429/503 nhanh để bảo vệ hệ thống thay vì làm treo luồng gọi hoặc nổ RAM)."
      }
    ],
    sections: [
      {
        heading: "1. Java Memory Model (JMM), volatile và Cuộc đua CAS: AtomicLong vs LongAdder",
        paragraphs: [
          "Trên máy chủ ngân hàng 32–64 nhân CPU hiện đại, các luồng không đọc/ghi trực tiếp vào thanh RAM vật lý chậm chạp ở mỗi câu lệnh, mà thao tác trên bản sao dữ liệu nằm trong thanh ghi và bộ nhớ đệm L1/L2 riêng của từng nhân CPU, cộng thêm việc trình biên dịch JIT và phần cứng CPU tự động đảo thứ tự lệnh (Instruction Reordering) để tối ưu đường ống thực thi. Nếu Luồng Quản trị đổi cờ 'boolean maintenanceMode = true' để tạm ngắt cổng thanh toán khẩn cấp mà biến đó thiếu từ khóa volatile, các luồng xử lý giao dịch chạy trên nhân CPU khác có thể tiếp tục nhìn thấy giá trị cũ 'false' trong L1 Cache suốt một thời gian dài! Từ khóa volatile chèn rào chắn bộ nhớ (Memory Barrier — cụ thể là lệnh khóa phần cứng StoreLoad) ép buộc mọi phép ghi phải đẩy thẳng xuống bộ nhớ chung và vô hiệu hóa dòng cache cũ trên các nhân khác, đồng thời thiết lập quan hệ happens-before chống đảo lệnh.",
          "Tuy nhiên, volatile CHỈ đảm bảo tính nhìn thấy (Visibility) chứ KHÔNG đảm bảo tính nguyên tử (Atomicity) cho thao tác đọc-sửa-ghi như count++. Để cộng đếm hoặc cập nhật trạng thái an toàn không cần khóa nặng nề, Java cung cấp cơ chế CAS (Compare-And-Swap) dựa trên tập lệnh nguyên tử phần cứng CPU (như LOCK CMPXCHG trên x86). Lớp AtomicLong hoạt động cực nhanh ở mức tranh chấp thấp đến trung bình; nhưng khi có 64 luồng đồng thời cập nhật bộ đếm tổng TPS toàn cổng thanh toán mỗi mili-giây, 63 luồng thất bại CAS sẽ phải quay vòng thử lại liên tục (Spin-loop) gây bão đồng bộ dòng cache CPU (Cache Line Ping-Pong). Từ Java 8+, LongAdder giải quyết xuất sắc bài toán này bằng kỹ thuật 'Striped Cells': khi phát hiện tranh chấp, nó tách biến đếm thành một mảng các ô Cell[] độc lập có đệm chống False Sharing (@Contended) để các luồng cộng rải rác không đụng nhau, và chỉ cộng gộp tổng các ô khi gọi sum() — tăng thông lượng ghi lên gấp 5–10 lần!"
        ],
        bullets: [
          "Khi nào dùng AtomicLong, khi nào dùng LongAdder: Dùng LongAdder cho các bộ đếm thống kê tần suất cao (đếm TPS, đếm lỗi Prometheus/Micrometer). Bắt buộc dùng AtomicLong khi cần giá trị tuần tự chính xác tuyệt đối tại từng thời điểm (ví dụ sinh số thứ tự STAN/Sequence nội bộ bằng incrementAndGet()).",
          "synchronized vs ReentrantLock: Khối synchronized gọn gàng và tự nhả khóa khi thoát khối, nhưng ReentrantLock vượt trội trong hệ thống ngân hàng nhờ 3 vũ khí: tryLock(timeout) giúp từ bỏ sớm không bị treo vô tận khi tắc nghẽn, lockInterruptibly() cho phép hủy luồng, và tương thích hoàn hảo với Java 21 Virtual Threads không gây Pinning.",
          "Tuyệt đối không dùng tiền mặt/số dư tài khoản chỉ bằng biến RAM dù có khóa luồng: Khóa trong JVM (ReentrantLock/Atomic) chỉ có tác dụng trong phạm vi 1 Pod duy nhất; khi chạy cụm 10 Pod Kubernetes, bảo toàn số dư bắt buộc phải dựa vào khóa dòng Database / câu lệnh UPDATE nguyên tử hoặc Distributed Lock!"
        ]
      },
      {
        heading: "2. Giải phẫu 7 Tham số ThreadPoolExecutor & Lý do Cấm Tiệt Lớp Tiện ích Executors",
        paragraphs: [
          "Trong 10 buổi phỏng vấn Senior Java do anh ngồi hội đồng thì có tới 6 ứng viên trả lời nhầm câu hỏi: 'Pool có core=10, max=20, queue=100; khi gửi đồng thời 15 task vào lúc đầu tiên thì có bao nhiêu luồng đang chạy?'. Câu trả lời đúng là CHỈ CÓ 10 LUỒNG, còn 5 task nằm chờ trong Queue! Hãy khắc cốt ghi tâm quy tắc thiết kế của Doug Lea: ThreadPoolExecutor luôn ưu tiên lấp đầy corePoolSize trước -> sau đó nhét vào BlockingQueue -> và CHỈ KHI BlockingQueue báo đầy (offer() trả về false) nó mới cắn răng mở rộng thêm luồng mới lên tới maximumPoolSize. Chính vì quy tắc này, nếu bạn truyền vào một hàng đợi không giới hạn (Unbounded Queue như new LinkedBlockingQueue() mặc định có sức chứa Integer.MAX_VALUE ≈ 2,14 tỷ phần tử), hàng đợi sẽ KHÔNG BAO GIỜ đầy, nghĩa là tham số maximumPoolSize trở nên vô dụng 100% và mọi đợt nghẽn tải đều tích tụ thẳng thành thảm họa OutOfMemoryError!",
          "Đó là lý do bộ quy chuẩn lập trình an toàn (Secure & Resilient Coding Standard) của Alibaba và các ngân hàng lớn cấm sử dụng cả 4 hàm tạo nhanh trong java.util.concurrent.Executors: newFixedThreadPool và newSingleThreadExecutor ẩn giấu LinkedBlockingQueue không giới hạn gây nổ Heap; còn newCachedThreadPool và newScheduledThreadPool lại đặt maximumPoolSize = Integer.MAX_VALUE dùng SynchronousQueue, khiến một cơn bão request bất ngờ có thể đẻ ra 20.000 Platform Threads đánh sập hệ điều hành vì cạn kiệt bộ nhớ Stack và nghẽn Context Switching. Luôn khởi tạo new ThreadPoolExecutor(...) tường minh cả 7 tham số kèm ThreadFactory đặt tên luồng rõ nghĩa (ví dụ 'napas-io-worker-3') để khi đọc Thread Dump lúc 2 giờ sáng, bạn biết chính xác cụm nào đang nghẽn chỉ trong 5 giây."
        ],
        bullets: [
          "Cẩn trọng bẫy CallerRunsPolicy trên luồng Web Server: Nhiều sách khuyên dùng CallerRunsPolicy để không mất task khi đầy tải. Nhưng trong Payment API, nếu luồng gọi là luồng Tomcat HTTP chính và task đó đang gọi đối tác bị timeout 15 giây, CallerRunsPolicy sẽ bắt chính luồng Tomcat đứng chạy cái task chậm đó! Chỉ sau vài chục request, toàn bộ 200 luồng Tomcat bị khóa sạch, làm chết cứng cả API health-check lẫn các API nhẹ khác. Với Online API, ưu tiên AbortPolicy (hoặc Custom Handler trả lỗi quá tải nhanh / đẩy sang Kafka lưu trữ bền vững).",
          "Định cỡ Thread Pool thực chiến: Với tác vụ thuần tính toán CPU (ký số RSA, băm mật mã, đối soát trên RAM), đặt số luồng xấp xỉ N_cores + 1. Với tác vụ chờ mạng/DB truyền thống (Platform Thread I/O-bound), ước lượng ban đầu theo công thức Little/Goetz: N_threads = N_cores × Target_CPU × (1 + WaitTime / ComputeTime), sau đó tinh chỉnh bằng Load Test k6/JMeter dựa trên giới hạn HikariCP và hạn mức kết nối đối tác.",
          "Tách biệt hoàn toàn các miền rủi ro (Bulkhead Pattern): Tuyệt đối không dùng chung một Thread Pool cho luồng Thanh toán cốt lõi, luồng gửi SMS/Email và luồng đẩy Analytics."
        ]
      },
      {
        heading: "3. Bẫy CompletableFuture ngầm định, Kiểm soát Timeout & Đứt gãy MDC TraceId",
        paragraphs: [
          "CompletableFuture là công cụ tuyệt vời để gom dữ liệu song song (ví dụ gọi đồng thời dịch vụ Thông tin Tài khoản, Hạn mức Ngày và Điểm Tín dụng để giảm tổng thời gian phản hồi từ 300ms xuống 110ms). Nhưng vết trượt ngầm nguy hiểm nhất nằm ở chỗ gọi CompletableFuture.supplyAsync(() -> callPartner()) mà quên truyền tham số thứ hai là Executor chuyên biệt! Khi đó, toàn bộ các lời gọi mạng chặn (blocking I/O) sẽ mặc định chui vào ForkJoinPool.commonPool() — một bể luồng dùng chung cho TOÀN BỘ JVM chỉ có kích thước mặc định bằng (Số nhân CPU - 1, ví dụ Pod 4 vCPU chỉ có đúng 3 luồng worker!). Chỉ cần 3 request gọi đối tác chậm là toàn bộ parallelStream() và mọi CompletableFuture khác trong toàn ứng dụng đứng hình theo.",
          "Hai mảnh ghép bắt buộc còn lại để đưa code bất đồng bộ lên Production ngân hàng là Timeout và Truy vết phân tán (Context Propagation). Không bao giờ gọi future.join() hay future.get() trần trụi không giới hạn thời gian; từ Java 9–21, hãy luôn gắn .orTimeout(2500, TimeUnit.MILLISECONDS) hoặc .completeOnTimeout(fallbackValue, ...) ngay trên chuỗi bất đồng bộ. Đồng thời, vì SLF4J MDC (lưu trữ traceId, correlationId, maskedCif để xâu chuỗi log của một giao dịch) sử dụng ThreadLocal gắn theo từng luồng, khi nhảy từ luồng HTTP sang luồng Worker của Pool, toàn bộ MDC sẽ bị trắng trơn nếu bạn không viết hàm bọc (Task Wrapper / Spring TaskDecorator) sao chép bản đồ MDC từ luồng cha sang luồng con và dọn dẹp sạch trong khối finally."
        ],
        bullets: [
          "Quy tắc 3 Bắt Buộc với CompletableFuture: (1) Luôn truyền tường minh customExecutor; (2) Luôn khai báo .orTimeout(...) hoặc .completeOnTimeout(...); (3) Luôn xử lý ngoại lệ rõ ràng qua .exceptionally(...) hoặc .handle(...).",
          "Bảo vệ chống rò rỉ dữ liệu chéo khách hàng trong MDC: Khi tái sử dụng luồng trong ThreadPool, nếu luồng con copy MDC của Giao dịch A nhưng quên gọi MDC.clear() trong khối finally sau khi chạy xong, lúc luồng đó rảnh và xử lý một tác vụ hệ thống không gắn MDC mới, log của hệ thống sẽ bị đóng dấu nhầm traceId/CIF của Khách hàng A!",
          "Đóng Pool êm ái khi tắt ứng dụng (Graceful Shutdown): Cấu hình shutdown() kèm awaitTermination(30, TimeUnit.SECONDS) khi nhận tín hiệu SIGTERM để các giao dịch đang dở dang kịp hoàn tất trước khi Pod dừng hẳn."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Chiến lược Khởi tạo Thread Pool trong Dịch vụ Ngân hàng Chịu tải cao",
      headers: ["Loại Thread Pool", "Cấu hình Queue & Max Threads", "Nguy cơ thực tế giờ cao điểm", "Phán quyết Kiến trúc Ngân hàng"],
      rows: [
        ["Executors.newFixedThreadPool(n)", "LinkedBlockingQueue(Integer.MAX_VALUE), max = n", "Tích tụ hàng triệu task khi đối tác chậm gây nổ OutOfMemoryError toàn JVM", "CẤM SỬ DỤNG trên Production"],
        ["Executors.newCachedThreadPool()", "SynchronousQueue (0 chỗ), max = Integer.MAX_VALUE", "Đẻ hàng chục nghìn OS Threads trong vài giây gây tràn Stack RAM & treo CPU Context Switch", "CẤM SỬ DỤNG trên Production"],
        ["ThreadPoolExecutor + CallerRunsPolicy", "Queue hữu hạn, tràn tải thì chạy trên luồng gọi", "An toàn cho Batch nội bộ, nhưng nếu đặt ở tầng Web API sẽ làm tắc nghẽn toàn bộ luồng Tomcat chính", "CHỈ DÙNG cho Worker/Batch nền để tự hãm tốc độ đọc"],
        ["ThreadPoolExecutor Hữu hạn + Bulkhead Fail-fast", "ArrayBlockingQueue hữu hạn, đặt tên luồng, truyền MDC, Reject có metric", "Chặn đứng lây lan lỗi chỉ trong phạm vi 1 đối tác chậm, bảo toàn tuyệt đối RAM và luồng chính", "CHUẨN BẮT BUỘC cho Payment & Core API"]
      ]
    },
    codeTitle: "PartnerGatewayExecutorFactory.java — ThreadPool Tường Minh Kèm MDC Trace & Chống Nghẽn Dây Chuyền",
    code: [
      "package vn.finjava.core.concurrency;",
      "",
      "import java.util.Map;",
      "import java.util.concurrent.*;",
      "import java.util.concurrent.atomic.AtomicInteger;",
      "import java.util.concurrent.atomic.LongAdder;",
      "import java.util.function.Supplier;",
      "import org.slf4j.Logger;",
      "import org.slf4j.LoggerFactory;",
      "import org.slf4j.MDC;",
      "",
      "public final class PartnerGatewayExecutorFactory {",
      "    private static final Logger log = LoggerFactory.getLogger(PartnerGatewayExecutorFactory.class);",
      "    private final LongAdder rejectedCounter = new LongAdder(); // Đếm cao tải không nghẽn CAS",
      "",
      "    public ThreadPoolExecutor createIsolatedPool(String partnerName, int coreSize, int maxSize, int queueCapacity) {",
      "        AtomicInteger seq = new AtomicInteger(1);",
      "        ThreadFactory namedFactory = runnable -> {",
      "            Thread t = new Thread(wrapWithMdc(runnable), partnerName + \"-io-\" + seq.getAndIncrement());",
      "            t.setDaemon(false);",
      "            return t;",
      "        };",
      "        RejectedExecutionHandler failFastHandler = (task, pool) -> {",
      "            rejectedCounter.increment();",
      "            log.error(\"[BULKHEAD-FULL] Partner={} Active={}/{} Queue={} TotalRejected={}\",",
      "                    partnerName, pool.getActiveCount(), pool.getMaximumPoolSize(),",
      "                    pool.getQueue().size(), rejectedCounter.sum());",
      "            throw new RejectedExecutionException(\"Cổng đối tác \" + partnerName + \" đang quá tải tạm thời\");",
      "        };",
      "        return new ThreadPoolExecutor(",
      "                coreSize, maxSize, 60L, TimeUnit.SECONDS,",
      "                new ArrayBlockingQueue<>(queueCapacity), namedFactory, failFastHandler)",
      "        {",
      "            @Override public void execute(Runnable command) { super.execute(wrapWithMdc(command)); }",
      "        };",
      "    }",
      "",
      "    public <T> CompletableFuture<T> submitWithSla(Executor pool, Supplier<T> call, long timeoutMs) {",
      "        return CompletableFuture.supplyAsync(call, pool).orTimeout(timeoutMs, TimeUnit.MILLISECONDS);",
      "    }",
      "",
      "    private static Runnable wrapWithMdc(Runnable task) {",
      "        Map<String, String> callerContext = MDC.getCopyOfContextMap();",
      "        return () -> {",
      "            Map<String, String> previous = MDC.getCopyOfContextMap();",
      "            if (callerContext != null) MDC.setContextMap(callerContext); else MDC.clear();",
      "            try { task.run(); }",
      "            finally { if (previous != null) MDC.setContextMap(previous); else MDC.clear(); }",
      "        };",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Khởi tạo ThreadPoolExecutor tường minh đủ 7 tham số với ArrayBlockingQueue hữu hạn, triệt tiêu hoàn toàn nguy cơ tràn bộ nhớ OutOfMemoryError khi đối tác bên ngoài bị đơ mạng.",
      "Sử dụng LongAdder thay vì AtomicLong cho bộ đếm lỗi từ chối rejectedCounter: trong kịch bản bão lỗi hàng nghìn request/giây cùng đập vào RejectedExecutionHandler, LongAdder phân tán ghi vào mảng Cell[] không gây nghẽn CPU.",
      "Ghi đè execute() kết hợp hàm wrapWithMdc() chụp nhanh MDC.getCopyOfContextMap() từ luồng gọi (chứa traceId, transactionId) gắn sang luồng worker và khôi phục/dọn sạch tuyệt đối trong khối finally, chống rò rỉ thông tin định danh sang giao dịch kế tiếp.",
      "Hàm submitWithSla() cưỡng bức truyền tường minh Executor cách ly (không bao giờ rơi vào ForkJoinPool.commonPool()) kèm mốc cắt thời gian .orTimeout() bảo vệ SLA đầu-cuối."
    ],
    labGuide: {
      goal: "Kiểm chứng thứ tự kích hoạt Core -> Queue -> Max -> Reject của ThreadPoolExecutor và xác nhận traceId trong MDC được truyền nguyên vẹn qua luồng bất đồng bộ.",
      steps: [
        "Bước 1: Khởi tạo PartnerGatewayExecutorFactory và tạo một pool nhỏ để dễ quan sát: createIsolatedPool(\"sms-vendor\", 2, 4, 3) (core=2, max=4, queue=3 => tổng sức chứa đồng thời tối đa đúng 7 tác vụ).",
        "Bước 2: Gắn MDC.put(\"traceId\", \"TXN-2026-9999\") ở luồng main, sau đó bắn liên tiếp 9 tác vụ mô phỏng gọi đối tác mất 1.000ms bằng submitWithSla(pool, ..., 5000).",
        "Bước 3: Quan sát log in ra tên luồng thực thi (sms-vendor-io-1..4), giá trị MDC.get(\"traceId\") bên trong từng tác vụ, và thông báo lỗi [BULKHEAD-FULL] cho tác vụ thứ 8 và thứ 9.",
        "Bước 4: Thử tăng thời gian giả lập ngủ của đối tác lên 2.000ms trong khi đặt timeoutMs = 500ms ở submitWithSla() để kiểm chứng CompletableFuture tự động cắt lỗi TimeoutException đúng hạn 500ms."
      ],
      expectedOutput: "Tác vụ 1–2 chạy ngay trên luồng core 1–2; tác vụ 3–5 vào hàng đợi; tác vụ 6–7 kích hoạt mở thêm luồng phụ 3–4; tác vụ 8–9 bị chặn tức thì với log [BULKHEAD-FULL] TotalRejected=2 mà RAM hoàn toàn ổn định. Mọi log bên trong luồng con đều giữ nguyên traceId=TXN-2026-9999."
    },
    examTips: [
      "Nếu hội đồng hỏi câu kinh điển: 'Cho ThreadPoolExecutor(core=5, max=10, queue=50), gửi 20 task vào cùng lúc thì có mấy thread được tạo?', hãy trả lời dứt khoát: 'Đúng 5 thread! 15 task còn lại nằm trong queue vì queue sức chứa 50 chưa đầy nên chưa mở thêm luồng lên max'. Câu trả lời này loại ngay 60% đối thủ.",
      "Khi bàn về bộ đếm đồng thời cao (High-contention Counter), hãy so sánh cơ chế spin-loop trên 1 biến volatile duy nhất của AtomicLong với cơ chế Striped Cells của LongAdder, đồng thời nhấn mạnh LongAdder.sum() là nhất quán cuối cùng (eventual) nên dùng cho metrics chứ không dùng cấp số thứ tự giao dịch.",
      "Nhớ chỉ ra điểm mù của CompletableFuture.supplyAsync(fn) 1 tham số: trên container K8s cấu hình limits.cpu = 1 hoặc 2 cores, ForkJoinPool.commonPool() có parallelism = 1! Nghĩa là mọi lời gọi async dùng mặc định thực chất xếp hàng chạy tuần tự từng cái một!"
    ],
    summaryTakeaways: [
      "volatile đảm bảo tính nhìn thấy xuyên cache CPU và chống đảo lệnh (happens-before), nhưng KHÔNG đảm bảo tính nguyên tử cho phép tăng giảm cộng dồn; hãy dùng AtomicLong hoặc LongAdder.",
      "Thứ tự sắt đá của ThreadPoolExecutor: Lấp đầy corePoolSize -> Đẩy vào BlockingQueue hữu hạn -> Đầy Queue mới sinh thêm luồng tới maximumPoolSize -> Chạm cả hai trần thì gọi RejectedExecutionHandler.",
      "Cấm dùng các hàm mặc định của Executors trên Production; luôn tách riêng Thread Pool cho từng đối tác ngoài (Bulkhead) với hàng đợi giới hạn và đặt tên luồng rõ ràng.",
      "Với CompletableFuture: luôn chỉ định custom Executor, luôn đặt .orTimeout(), và luôn đóng gói truyền + xóa sạch MDC trong khối finally."
    ],
    lessonQuestions: [
      {
        question: "Kỹ sư cấu hình một ThreadPoolExecutor phục vụ gửi hóa đơn điện tử với: corePoolSize = 8, maximumPoolSize = 20, queue = new ArrayBlockingQueue<>(100). Tại giây đầu tiên khi hệ thống vừa khởi động, có đúng 40 tác vụ gửi đồng thời vào Pool (mỗi tác vụ mất 2 giây để hoàn thành). Ngay tại thời điểm đó, Pool đã tạo ra bao nhiêu luồng và còn bao nhiêu tác vụ nằm trong hàng đợi?",
        options: [
          "20 luồng đang chạy và 20 tác vụ nằm trong hàng đợi",
          "8 luồng đang chạy và 32 tác vụ nằm trong hàng đợi",
          "40 luồng đang chạy và 0 tác vụ nằm trong hàng đợi",
          "8 luồng đang chạy, 20 tác vụ trong hàng đợi và 12 tác vụ bị từ chối"
        ],
        answer: 1,
        explanation: "Theo thiết kế chuẩn của ThreadPoolExecutor, 8 tác vụ đầu tiên sẽ khởi tạo đủ 8 luồng corePoolSize. Từ tác vụ thứ 9 đến thứ 40 (gồm 32 tác vụ), Pool đẩy vào ArrayBlockingQueue(100). Vì 32 < 100 nên hàng đợi chưa đầy, do đó Pool CHƯA tạo thêm bất kỳ luồng phụ nào vượt quá mức corePoolSize = 8.",
        wrongReasons: [
          "Sai vì Pool chỉ mở rộng từ core (8) lên max (20) sau khi ArrayBlockingQueue(100) đã bị lấp đầy hoàn toàn 100 phần tử.",
          "",
          "Sai vì số luồng không bao giờ được phép vượt quá maximumPoolSize = 20.",
          "Sai vì hàng đợi sức chứa 100 hoàn toàn đủ chỗ chứa 32 tác vụ còn lại nên không có tác vụ nào bị từ chối."
        ]
      },
      {
        question: "Trên Pod Kubernetes được cấp phát 2 vCPU, lập trình viên viết hàm tổng hợp số dư tài khoản khách hàng bằng cách gọi CompletableFuture.supplyAsync(() -> callCardSystem()) không truyền tham số Executor thứ hai. Hậu quả nguy hiểm nhất khi cổng Thẻ bị phản hồi chậm 10 giây là gì?",
        options: [
          "Java 21 không cho phép biên dịch hàm supplyAsync nếu thiếu tham số Executor",
          "Tác vụ tự động chuyển sang dùng luồng của HikariCP Database Pool làm hết kết nối DB",
          "Tác vụ bị đưa vào ForkJoinPool.commonPool() dùng chung toàn JVM (trên máy 2 vCPU chỉ có đúng 1 worker thread), làm tê liệt toàn bộ các CompletableFuture mặc định và parallelStream() khác trong toàn ứng dụng",
          "Tác vụ chạy trực tiếp trên luồng Garbage Collector làm dừng thu gom rác"
        ],
        answer: 2,
        explanation: "Khi gọi CompletableFuture.supplyAsync(supplier) một tham số, JDK sử dụng bể luồng chung ForkJoinPool.commonPool() có độ song song mặc định là Runtime.getRuntime().availableProcessors() - 1. Trên Pod 2 vCPU, độ song song bằng 2 - 1 = 1 luồng worker! Chỉ cần 1 lời gọi blocking HTTP bị kẹt 10 giây là khóa nghẽn hoàn toàn commonPool của cả tiến trình JVM.",
        wrongReasons: [
          "Sai vì supplyAsync(Supplier<U>) 1 tham số là API hợp lệ hoàn toàn trong JDK từ Java 8 đến Java 21.",
          "Sai vì HikariCP chỉ quản lý các kết nối JDBC chứ không phải là bể luồng thực thi CompletableFuture.",
          "",
          "Sai vì luồng của Garbage Collector thuộc tầng quản trị nội bộ JVM, hoàn toàn tách biệt không bao giờ chạy code nghiệp vụ CompletableFuture."
        ]
      }
    ]
  },


  J4: {
    duration: "55 phút",
    difficulty: "Java 21 Hiện đại → Senior",
    codeLang: "java",
    teacherIntro: "Chào em, năm ngoái đội anh thực hiện dự án nâng cấp cổng Mở Tài Khoản Trực Tuyến (Digital Onboarding — mỗi hồ sơ phải gọi song song 4 hệ thống: xác thực chip CCCD C06, quét danh sách đen rửa tiền AML, tra cứu điểm tín dụng CIC và kiểm tra vân tay thiết bị) từ Java 11 lên Java 21 Virtual Threads. Khi chạy thử tải trên UAT, lượng RAM dành cho Thread Stack giảm một mạch 78% và thông lượng vọt lên gấp 4 lần, cả nhóm mừng rơn. Thế nhưng vừa mở tải Production sáng thứ Hai được 20 phút, toàn bộ API đăng ký mở tài khoản đứng hình Timeout hàng loạt trong khi biểu đồ CPU của Pod 8 nhân chỉ chạy lờ đờ ở mức 6%! Anh lập tức bật cờ -Djdk.tracePinnedThreads=short thì bắt quả tang: một thư viện SDK nội bộ đời cũ dùng khối synchronized bọc thẳng lời gọi HTTP lấy Access Token mất 3 giây, làm 'ghim chết' (Pinning) cả 8 Carrier Threads của JVM! Hôm nay anh em mình sẽ làm chủ trọn bộ vũ khí hiện đại nhất của Java 21 LTS và tránh sạch những vết xe đổ ngầm này.",
    analogy: {
      title: "8 Chiếc ghế xoay thông minh phục vụ 50.000 hồ sơ vs Còng tay tự khóa vào thành ghế",
      body: "Với Platform Threads truyền thống (mô hình 1:1 gắn chặt luồng hệ điều hành), mỗi khách nộp hồ sơ là ngân hàng phải bố trí 1 nhân viên ngồi chiếm trọn 1 bàn làm việc riêng (tốn cứng ~1MB RAM Stack); trong lúc chờ cục C06 trả kết quả 2 giây, nhân viên đó cứ ngồi khoanh tay chiếm bàn, hết 200 bàn là khách thứ 201 bị từ chối ở cửa. Sang Java 21 Virtual Threads (Project Loom), ngân hàng chỉ cần đúng 8 chiếc ghế làm việc thật (Carrier Threads bằng số nhân CPU) nhưng tiếp nhận mượt mà 50.000 hồ sơ cùng lúc: hễ hồ sơ A phải chờ phản hồi qua mạng, nhân viên lập tức gấp tờ hồ sơ siêu mỏng vài KB cất lên kệ (unmount Continuation sang Heap) rồi lấy ngay hồ sơ B xuống xử lý tiếp! Còn lỗi Carrier Thread Pinning do từ khóa synchronized chính là việc nhân viên lỡ tự khóa còng tay mình dính chặt vào thành ghế trước khi gọi điện thoại — khiến 49.999 hồ sơ khác đứng nhìn chiếc ghế bị chiếm vô ích."
    },
    objectives: [
      "Hiểu sâu cơ chế lịch biểu M:N của Project Loom trên Java 21: cách Virtual Threads thực hiện mount/unmount Continuation trên ForkJoinPool Carrier Threads khi gặp thao tác chặn I/O (Socket, JDBC, REST).",
      "Phát hiện và triệt tiêu 2 cái bẫy lớn nhất của Virtual Threads trên Production: lỗi Carrier Thread Pinning (thay synchronized bằng ReentrantLock) và sai lầm nhét Virtual Threads vào Thread Pool cố định (thay bằng Semaphore giới hạn đồng thời).",
      "Kết hợp nhuần nhuyễn bộ ba ngôn ngữ hiện đại Java 17–21 gồm Record, Sealed Interface và Exhaustive Pattern Matching switch để thiết kế mô hình trạng thái giao dịch ngân hàng an toàn tuyệt đối ngay từ lúc biên dịch."
    ],
    flow: [
      {
        step: "1. Khởi tạo Virtual Thread siêu nhẹ trên vùng nhớ Heap",
        detail: "Mỗi tác vụ nghiệp vụ được cấp mới một Virtual Thread chỉ nặng vài trăm bytes metadata ban đầu thay vì xin hệ điều hành cấp phát Kernel Thread nặng 1MB Stack tốn kém."
      },
      {
        step: "2. Mount lên Carrier Thread để chạy các chỉ thị CPU",
        detail: "Bộ điều phối nội bộ của JVM gắn (mount) Virtual Thread lên một Platform Thread nền (Carrier Thread trong ForkJoinPool có kích thước mặc định bằng số nhân CPU) để thực thi logic tuần tự dễ đọc."
      },
      {
        step: "3. Tự động Unmount khi chạm lệnh Blocking I/O",
        detail: "Ngay khi code gọi HttpClient.send(), Socket.read() hoặc JDBC truy vấn DB, JDK tự động tháo (unmount) ngăn xếp Continuation của Virtual Thread cất gọn vào Heap, trả lại Carrier Thread rảnh rỗi ngay lập tức cho giao dịch khác."
      },
      {
        step: "4. Đánh thức qua OS Event Poller và Mount trở lại",
        detail: "Khi hệ điều hành (epoll trên Linux / kqueue / IOCP) báo gói tin mạng từ đối tác đã về tới card mạng, JVM đưa Virtual Thread vào hàng đợi sẵn sàng và gắn lên bất kỳ Carrier Thread nào đang trống để chạy nốt dòng code tiếp theo."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Virtual Threads: Thông lượng ngang Reactive nhưng Giữ Nguyên Code Dễ Hiểu",
        paragraphs: [
          "Suốt một thập kỷ trước Java 21, các kiến trúc sư ngân hàng luôn đứng trước thế tiến thoái lưỡng nan (Sophie's Choice): nếu dùng Spring MVC truyền thống (Thread-per-request), code rất tường minh, dễ debug từng dòng và gắn kết tự nhiên với JDBC/@Transactional, nhưng bị chặn trần ở khoảng vài trăm đến vài nghìn luồng vì mỗi Platform Thread ngốn 1MB bộ nhớ Stack và làm hệ điều hành kiệt sức vì chuyển ngữ cảnh (Kernel Context Switch tốn hàng micro-giây). Ngược lại, nếu chuyển sang Spring WebFlux (Reactive Mono/Flux), hệ thống chịu tải I/O cực cao chỉ với vài luồng Event-loop, nhưng cái giá phải trả là toàn bộ đội ngũ phải viết chuỗi callback phức tạp, stacktrace khi nổ lỗi dài hàng trăm dòng vô nghĩa không tìm ra nguồn cơn, mất ngữ cảnh ThreadLocal và chỉ cần 1 lập trình viên lỡ gọi hàm đọc file/JDBC đồng bộ là treo cứng toàn server.",
          "Project Loom trên Java 21 LTS xóa bỏ hoàn toàn sự đánh đổi đau đớn đó bằng cách đưa cơ chế lập lịch luồng ảo về tầng JVM. Bằng cách tái cấu trúc toàn bộ thư viện lõi của JDK (java.net.Socket, HttpClient, ReentrantLock, Thread.sleep...), mỗi khi một Virtual Thread gọi hàm I/O chặn truyền thống, bên dưới lớp vỏ đồng bộ đó JVM thực chất chuyển đổi thành thao tác bất đồng bộ không chặn! Bạn vẫn viết code tuần tự từ trên xuống dưới, dùng try-catch tự nhiên, xem Thread Dump và Step-into Debugger mượt mà như cũ, nhưng một Pod 4GB RAM giờ đây có thể duy trì đồng thời 50.000 – 100.000 kết nối chờ cổng đối tác mà không hề đổ mồ hôi. Tuy nhiên, hãy luôn nhớ nguyên lý vật lý: Virtual Threads giúp TĂNG THÔNG LƯỢNG chờ I/O (Throughput), chứ KHÔNG làm một phép tính băm mật mã CPU-bound chạy nhanh hơn!"
        ],
        bullets: [
          "Khi nào Virtual Threads phát huy sức mạnh 10x: Các dịch vụ Payment Hub, API Aggregator, Digital Onboarding, Webhook Dispatcher — nơi 90% thời gian sống của request là đứng chờ phản hồi từ Database, Redis, Kafka và HTTP đối tác.",
          "Khi nào KHÔNG dùng Virtual Threads: Các tác vụ thuần đốt CPU kéo dài liên tục không có điểm nhường I/O như ký/giải mã hàng loạt RSA-4096, nén file sao kê ZIP lớn, chạy mô hình AI chấm điểm tín dụng trên RAM — những việc này vẫn nên chạy trên ForkJoinPool hoặc Platform Thread Pool cố định bằng số nhân CPU.",
          "Kích hoạt trên Spring Boot 3.2+: Chỉ cần bật cờ spring.threads.virtual.enabled=true, cả Tomcat/Jetty lẫn @Async sẽ tự động xử lý mỗi request bằng một Virtual Thread mới tinh."
        ]
      },
      {
        heading: "2. Hai Cái Bẫy Sống Còn Trên Java 21: Carrier Thread Pinning & Cấm Pool Virtual Threads",
        paragraphs: [
          "Cái bẫy chí mạng đầu tiên như anh đã kể ở đầu bài chính là Carrier Thread Pinning. Trong kiến trúc Java 21 (trước khi JEP 491 ở các bản JDK mới hơn cải tiến monitor), khi một Virtual Thread bước vào bên trong khối 'synchronized' hoặc đang thực thi thông qua khung hàm bản địa C/C++ (JNI / Foreign Function), khung ngăn xếp của nó bị neo cứng với OS Thread bên dưới. Nếu bên trong khối synchronized chỉ là vài phép gán biến trên RAM mất 50 nano-giây thì hoàn toàn vô hại; nhưng nếu bên trong synchronized lại chứa lời gọi mạng, đọc file hoặc truy vấn JDBC mất vài trăm mili-giây, JVM KHÔNG THỂ unmount luồng ảo đó ra được! Carrier Thread bị bắt làm con tin đứng chờ I/O, và nếu cả 8 Carrier Threads trên máy 8 vCPU cùng bị ghim, toàn bộ hàng vạn Virtual Threads khác rơi vào cảnh chết đói (Starvation). Cách phòng chống triệt để trên Java 21 là thay thế toàn bộ synchronized bọc quanh thao tác I/O bằng java.util.concurrent.locks.ReentrantLock.",
          "Cái bẫy thứ hai đến từ thói quen cũ: rất nhiều lập trình viên chuyển sang Java 21 nhưng lại viết 'Executors.newFixedThreadPool(20, Thread.ofVirtual().factory())'! Làm vậy là vô nghĩa hoàn toàn, bởi Virtual Threads sinh ra với triết lý 'dùng một lần rồi bỏ như đối tượng String ngắn hạn' — chi phí tạo mới gần như bằng 0 nên TUYỆT ĐỐI KHÔNG BAO GIỜ POOL VIRTUAL THREADS, hãy luôn dùng Executors.newVirtualThreadPerTaskExecutor(). Thế nhưng, nếu không giới hạn số lượng Virtual Threads thì làm sao bảo vệ Database chỉ có 30 kết nối HikariCP hoặc cổng đối tác CIC chỉ cho phép tối đa 50 kết nối đồng thời? Câu trả lời chuẩn Senior là tách rời khái niệm 'Quản lý luồng' khỏi 'Giới hạn tài nguyên': cứ để mỗi tác vụ chạy trên 1 Virtual Thread riêng, và đặt một java.util.concurrent.Semaphore(50) chặn ngay trước cổng gọi đối tác — khi luồng thứ 51 gọi semaphore.acquire(), Virtual Thread đó sẽ tự động unmount nhẹ nhàng trên Heap không tốn một giọt tài nguyên OS nào!"
        ],
        bullets: [
          "Kiểm toán thư viện bên thứ ba trước khi lên Production: Chạy bài kiểm thử tải với cờ JVM -Djdk.tracePinnedThreads=full để phát hiện sớm các phiên bản cũ của JDBC Driver (như MySQL Connector/J cũ) hoặc SDK nội bộ còn dùng synchronized quanh Socket I/O.",
          "Cẩn trọng với ThreadLocal trên hàng triệu Virtual Threads: Dù Virtual Threads hỗ trợ đầy đủ ThreadLocal, nhưng nếu bạn lưu các bộ đệm nặng (như ObjectMapper riêng, SimpleDateFormat hay mảng byte[] lớn) vào ThreadLocal của 100.000 Virtual Threads thì 100.000 bản sao đó sẽ làm nổ tung vùng Heap! Hãy dùng hằng số bất biến dùng chung (như DateTimeFormatter, JsonMapper thread-safe).",
          "Sử dụng Semaphore thay cho ThreadPool Bulkhead: Trong kỷ nguyên Virtual Threads, Semaphore chính là công cụ điều tiết đồng thời (Concurrency Limiter) chuẩn mực, rẻ và chính xác nhất."
        ]
      },
      {
        heading: "3. Thiết kế Miền Nghiệp vụ Bất khả Xâm phạm: Record, Sealed Interface & Pattern Matching",
        paragraphs: [
          "Song hành cùng Virtual Threads, cuộc cách mạng về mô hình hóa dữ liệu từ Java 17 đến Java 21 giúp code ngân hàng loại bỏ hàng loạt lỗi NullPointerException và trạng thái mâu thuẫn logic. Trước đây, kết quả trả về từ dịch vụ Thẩm định Mở Tài khoản thường được viết thành một class DTO duy nhất chứa đầy trường tùy chọn: boolean approved, String cifNumber, String rejectionCode, String manualReviewTicketId... Hậu quả là lập trình viên bên ngoài rất dễ tạo ra một đối tượng quái thai vừa có approved = true lại vừa có rejectionCode = \"AML_BLACKLIST\", hoặc quên kiểm tra trường hợp hồ sơ bị chuyển sang duyệt tay!",
          "Triết lý thiết kế hiện đại trong Tài chính là 'Make Illegal States Unrepresentable' (Làm cho các trạng thái phi pháp không thể nào biểu diễn được trong code). Bằng cách kết hợp 'sealed interface' (khóa chặt danh sách các kiểu con được phép kế thừa thông qua từ khóa permits) với 'record' (lớp dữ liệu bất biến thuần khiết), ta định nghĩa chính xác từng kết cục độc lập: Approved chỉ mang cifNumber và hạn mức được cấp; ManualReview bắt buộc mang ticketId và mức rủi ro; Rejected bắt buộc mang mã lý do từ chối. Đỉnh cao nằm ở biểu thức switch đối sánh mẫu (Record Pattern Matching trên Java 21): bạn có thể giải rã trực tiếp các trường bên trong từng record ngay tại nhãn case mà KHÔNG cần nhánh default! Nếu 6 tháng sau Ngân hàng Nhà nước yêu cầu bổ sung trạng thái thứ tư 'RequireNfcBiometric' vào danh sách permits, trình biên dịch Java 21 sẽ lập tức BÁO LỖI ĐỎ tại tất cả các câu lệnh switch trong toàn dự án chưa xử lý trạng thái mới này — chặn đứng 100% lỗi bỏ sót nghiệp vụ trước cả khi chạy test!"
        ],
        bullets: [
          "Java Record không phải là JPA @Entity: Record có mọi trường là private final nên sinh ra hoàn hảo cho Value Objects (Money, AccountId), Commands, Domain Events, API Request/Response DTOs và kết quả truy vấn Projection; không dùng Record cho Hibernate Entity vốn đòi hỏi constructor rỗng và trạng thái khả biến.",
          "Bảo vệ tính bất biến sâu (Deep Immutability) trong Record: Nếu một Record chứa trường kiểu List hoặc Map, hãy luôn bọc List.copyOf() trong Compact Constructor để người gọi không thể sửa mảng bên dưới sau khi khởi tạo.",
          "Exhaustive Switch không dùng default bừa bãi: Tránh thói quen viết 'default -> throw ...' khi switch trên Sealed Interface hoặc Enum nghiệp vụ, vì nhánh default sẽ che mờ cảnh báo của trình biên dịch khi có thêm loại giao dịch mới."
        ]
      }
    ],
    comparison: {
      title: "So sánh 4 Mô hình Xử lý Đồng thời I/O cho Dịch vụ Ngân hàng Hiện đại",
      headers: ["Tiêu chí", "Platform Thread Pool (MVC cũ)", "Spring WebFlux (Reactive Netty)", "Java 21 Virtual Threads (Chuẩn)", "Virtual Threads dính Pinning / Pooling"],
      rows: [
        ["Chi phí RAM mỗi luồng chờ I/O", "Rất nặng (~1MB Native Stack cố định/luồng)", "Rất nhẹ (chỉ lưu state machine vài KB trên Heap)", "Rất nhẹ (vài trăm bytes đến vài KB Continuation trên Heap)", "Nhẹ trên Heap nhưng kẹt cứng Carrier OS Thread gây nghẽn toàn cục"],
        ["Độ phức tạp đọc hiểu & Debug", "Dễ nhất, tuần tự, Stacktrace rõ ràng", "Khó cao, chuỗi Mono/Flux phức tạp, Stacktrace đứt đoạn", "Dễ nhất, giữ nguyên code tuần tự và Debugger chuẩn", "Cực kỳ khó hiểu nếu không bật cờ tracePinnedThreads"],
        ["Khả năng tương thích JDBC / JPA", "Tương thích tự nhiên 100%", "Kém (R2DBC hạn chế tính năng hơn hẳn JPA/Hibernate)", "Tương thích tự nhiên 100% (unmount ngay tại tầng Socket của Driver mới)", "Dễ treo nếu dùng JDBC Driver quá cũ còn khóa synchronized"],
        ["Cách giới hạn tải xuống đối tác", "Giới hạn bằng kích thước Thread Pool", "Giới hạn bằng toán tử flatMap(fn, concurrency) / Bulkhead", "Tạo Virtual Thread tự do + chặn bằng Semaphore ở đầu cổng ra", "Sai lầm khi nhét vào FixedThreadPool làm mất sạch lợi thế Loom"]
      ]
    },
    codeTitle: "OnboardingKycOrchestrator.java — Thẩm định Song song bằng Virtual Threads + ReentrantLock & Sealed Domain",
    code: [
      "package vn.finjava.core.onboarding;",
      "",
      "import java.time.Instant;",
      "import java.util.concurrent.*;",
      "import java.util.concurrent.locks.ReentrantLock;",
      "",
      "public final class OnboardingKycOrchestrator {",
      "    public sealed interface KycVerdict permits KycVerdict.Approved, KycVerdict.ManualReview, KycVerdict.Rejected {",
      "        record Approved(String cif, long dailyLimitVnd) implements KycVerdict {}",
      "        record ManualReview(String ticketId, String reason) implements KycVerdict {}",
      "        record Rejected(String amlCode) implements KycVerdict {}",
      "    }",
      "",
      "    private final Semaphore c06RateGate = new Semaphore(50); // Giới hạn 50 kết nối đồng thời sang C06",
      "    private final ReentrantLock tokenLock = new ReentrantLock(); // Thay synchronized chống Pinning!",
      "    private volatile String cachedPartnerToken = \"INIT_TOKEN\";",
      "    private volatile Instant tokenExpiry = Instant.MIN;",
      "",
      "    public String evaluateApplication(String cccdNo, ClientGateway gateway) throws Exception {",
      "        String token = ensureValidTokenWithoutPinning(gateway);",
      "        try (ExecutorService vExec = Executors.newVirtualThreadPerTaskExecutor()) {",
      "            Future<Boolean> nfcFuture = vExec.submit(() -> verifyChipWithBackpressure(cccdNo, token, gateway));",
      "            Future<String> amlFuture = vExec.submit(() -> gateway.checkAmlSanction(cccdNo, token));",
      "",
      "            boolean chipMatched = nfcFuture.get(3, TimeUnit.SECONDS);",
      "            String amlHit = amlFuture.get(3, TimeUnit.SECONDS);",
      "            KycVerdict verdict = !\"CLEAR\".equals(amlHit) ? new KycVerdict.Rejected(amlHit)",
      "                    : chipMatched ? new KycVerdict.Approved(\"CIF-\" + cccdNo.substring(6), 100_000_000L)",
      "                    : new KycVerdict.ManualReview(\"TKT-\" + System.nanoTime(), \"NFC_SCORE_BORDERLINE\");",
      "",
      "            return switch (verdict) { // Exhaustive Pattern Matching Java 21: không cần default!",
      "                case KycVerdict.Approved(var cif, var limit) -> \"OPEN_ACTIVE:\" + cif + \":LIMIT=\" + limit;",
      "                case KycVerdict.ManualReview(var ticket, var why) -> \"HOLD_BACKOFFICE:\" + ticket + \":\" + why;",
      "                case KycVerdict.Rejected(var code) -> \"BLOCK_COMPLIANCE:\" + code;",
      "            };",
      "        }",
      "    }",
      "",
      "    private boolean verifyChipWithBackpressure(String cccd, String token, ClientGateway gw) throws InterruptedException {",
      "        c06RateGate.acquire(); // Virtual Thread tự động unmount nhẹ nhàng nếu đã đủ 50 lượt đang gọi",
      "        try { return gw.verifyNfcRarity(cccd, token); } finally { c06RateGate.release(); }",
      "    }",
      "",
      "    private String ensureValidTokenWithoutPinning(ClientGateway gw) {",
      "        if (Instant.now().isBefore(tokenExpiry)) return cachedPartnerToken;",
      "        tokenLock.lock();",
      "        try {",
      "            if (Instant.now().isBefore(tokenExpiry)) return cachedPartnerToken;",
      "            cachedPartnerToken = gw.fetchOAuthTokenBlocking(); // Không ghim Carrier Thread nhờ ReentrantLock",
      "            tokenExpiry = Instant.now().plusSeconds(300);",
      "            return cachedPartnerToken;",
      "        } finally { tokenLock.unlock(); }",
      "    }",
      "",
      "    public interface ClientGateway {",
      "        boolean verifyNfcRarity(String cccd, String token);",
      "        String checkAmlSanction(String cccd, String token);",
      "        String fetchOAuthTokenBlocking();",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Khối try-with-resources bọc quanh Executors.newVirtualThreadPerTaskExecutor() tận dụng tính năng AutoCloseable trên Java 21: khối try chỉ kết thúc sau khi toàn bộ các Virtual Threads con bên trong đã hoàn thành sạch sẽ (tư duy Structured Concurrency chống rò rỉ luồng mồ côi).",
      "Phương thức ensureValidTokenWithoutPinning() áp dụng Double-Checked Locking với biến volatile kết hợp ReentrantLock thay cho synchronized: khi 1 Virtual Thread đang chờ mạng lấy OAuth Token mới, cả nó lẫn các Virtual Threads xếp hàng chờ khóa đều được JVM unmount khỏi Carrier Thread hoàn toàn êm ái.",
      "Sử dụng Semaphore(50) trong verifyChipWithBackpressure() để bảo vệ hạn ngạch kết nối sang cổng RAR/C06 bên ngoài mà không bao giờ phải bó hẹp Virtual Threads vào một FixedThreadPool.",
      "Sealed Interface KycVerdict đi kèm Record Pattern Matching trong biểu thức switch (dòng 31–35) giải rã trực tiếp các biến (var cif, var limit) và đảm bảo kiểm tra vét cạn ngay từ lúc biên dịch."
    ],
    labGuide: {
      goal: "Chứng minh khả năng chạy đồng thời 10.000 hồ sơ thẩm định I/O chỉ mất ~1 giây trên Java 21 Virtual Threads và quan sát trực tiếp cảnh báo Pinning khi cố tình đổi ReentrantLock thành synchronized.",
      steps: [
        "Bước 1: Cài đặt một lớp MockClientGateway thực thi ClientGateway dùng Thread.sleep(200) cho mỗi hàm verifyNfcRarity, checkAmlSanction và fetchOAuthTokenBlocking để mô phỏng độ trễ mạng 200ms.",
        "Bước 2: Nâng Semaphore lên 2000 và dùng một VirtualThreadPerTaskExecutor ngoài hàm main để bắn đồng thời 2.000 lượt gọi evaluateApplication(); đo tổng thời gian hoàn thành và lượng RAM sử dụng.",
        "Bước 3: Tạm sửa hàm ensureValidTokenWithoutPinning sang dùng 'synchronized (this)' thay cho tokenLock, ép tokenExpiry luôn hết hạn, rồi chạy lại với cờ JVM: -Djdk.tracePinnedThreads=short.",
        "Bước 4: Đổi ngược lại về ReentrantLock và xác nhận cảnh báo Pinning biến mất hoàn toàn trên console đồng thời thời gian hoàn thành giảm vọt trở lại!"
      ],
      expectedOutput: "Với ReentrantLock + Virtual Threads, 2.000 hồ sơ (tương đương 4.000 lời gọi I/O song song) hoàn tất trong chưa đầy 500ms với mức tiêu thụ RAM cực thấp. Khi cố tình đổi sang synchronized bọc lời gọi mạng, console in ngay stacktrace cảnh báo '<== monitors:1' vạch trần điểm nghẽn Pinning."
    },
    examTips: [
      "Câu hỏi phân loại Senior Java 21: 'Có nên thay thế các bể kết nối hoặc Thread Pool giới hạn bằng cách tạo một Pool gồm 100 Virtual Threads không?' — Trả lời dứt khoát: 'KHÔNG BAO GIỜ pool Virtual Threads! Virtual Threads rất rẻ nên tạo mới cho từng tác vụ; để giới hạn tải xuống Database hay đối tác, ta dùng Semaphore hoặc giới hạn của HikariCP'.",
      "Nếu được hỏi 'Virtual Threads có làm giải thuật mã hóa chữ ký số chạy nhanh hơn không?': Khẳng định rõ Virtual Threads chỉ tối ưu hóa thời gian chờ (Waiting time) cho bài toán I/O-bound, hoàn toàn không tăng tốc CPU-bound và không làm giảm độ trễ của một request đơn lẻ khi hệ thống đang rảnh.",
      "Hãy nhắc tới cờ -Djdk.tracePinnedThreads=short và sự chuyển đổi từ synchronized sang ReentrantLock quanh các điểm I/O (như làm mới Token, khởi tạo lười Cache, JDBC Driver cũ) — đây là minh chứng rõ nhất bạn đã vận hành Java 21 thực tế trên Production."
    ],
    summaryTakeaways: [
      "Java 21 Virtual Threads ánh xạ M:N lên Carrier Threads giúp chịu tải hàng chục nghìn kết nối chờ I/O với code tuần tự dễ đọc và dễ debug.",
      "Tuyệt đối không dùng synchronized bọc lời gọi mạng/DB kéo dài trên Java 21 để tránh Carrier Thread Pinning; hãy thay thế bằng ReentrantLock.",
      "Không bao giờ đưa Virtual Threads vào Thread Pool cố định; hãy dùng newVirtualThreadPerTaskExecutor() kết hợp Semaphore để điều tiết tải đích.",
      "Kết hợp Record bất biến + Sealed Interface + Exhaustive Pattern Matching switch để khóa chặt miền trạng thái giao dịch ngân hàng ngay ở bước biên dịch."
    ],
    lessonQuestions: [
      {
        question: "Khi chuyển đổi dịch vụ Thanh toán Hóa đơn sang Java 21 Virtual Threads, một lập trình viên muốn giới hạn tối đa chỉ có 30 yêu cầu được gọi đồng thời sang cổng Điện lực EVN nên đã viết: ExecutorService pool = Executors.newFixedThreadPool(30, Thread.ofVirtual().factory()); Đánh giá nào sau đây của Kiến trúc sư là chuẩn xác nhất?",
        options: [
          "Đây là thiết kế tối ưu nhất vì vừa tiết kiệm bộ nhớ vừa tái sử dụng được 30 Virtual Threads",
          "Code này không biên dịch được vì Thread.ofVirtual() không có phương thức factory()",
          "Đây là anti-pattern kinh điển: Virtual Threads được thiết kế dùng một lần cho mỗi tác vụ chứ không tái sử dụng qua Pool; cách đúng là dùng Executors.newVirtualThreadPerTaskExecutor() kết hợp Semaphore(30) chặn ở đầu hàm gọi cổng EVN",
          "Nên đổi sang Executors.newCachedThreadPool() với Platform Threads để chạy nhanh hơn"
        ],
        answer: 2,
        explanation: "Tài liệu chính thức của Oracle Java 21 (JEP 444) nhấn mạnh: không bao giờ pool Virtual Threads vì chúng cực nhẹ và không giữ tài nguyên hệ điều hành đắt đỏ cần tái sử dụng. Để giới hạn mức độ truy cập đồng thời vào một tài nguyên hữu hạn (như cổng đối tác EVN cho phép 30 kết nối), mẫu thiết kế chuẩn là cấp phát mới Virtual Thread cho mỗi tác vụ và dùng Semaphore(30) để kiểm soát luồng vào.",
        wrongReasons: [
          "Sai vì tái sử dụng Virtual Threads trong một bể nhỏ kèm hàng đợi làm phung phí kiến trúc nhẹ của Loom và có nguy cơ tích tụ hàng đợi không giới hạn của newFixedThreadPool.",
          "Sai vì Thread.ofVirtual().factory() hoàn toàn hợp lệ về mặt cú pháp API trong Java 21.",
          "",
          "Sai vì newCachedThreadPool() với Platform Threads có thể đẻ ra hàng vạn OS Threads gây cạn kiệt bộ nhớ Stack khi tải tăng đột biến."
        ]
      },
      {
        question: "Dịch vụ tra cứu thông tin thẻ bật Java 21 Virtual Threads bị hiện tượng treo cứng tất cả request trong 10 giây dù CPU của máy chủ 8 nhân chỉ ở mức 5%. Khi kiểm tra thấy có một hàm đọc dữ liệu từ HSM qua mạng nội bộ nằm bên trong khối 'public synchronized byte[] decryptPinBlock(...)'. Nguyên nhân kỹ thuật sâu xa là gì?",
        options: [
          "Từ khóa synchronized tự động tắt hoàn toàn tính năng Virtual Threads của toàn bộ JVM vĩnh viễn",
          "Hiện tượng Carrier Thread Pinning: khi Virtual Thread thực hiện thao tác chặn mạng bên trong khối synchronized trên Java 21, JVM không thể tháo (unmount) nó khỏi Carrier Thread, khiến cả 8 Carrier Threads lần lượt bị chiếm giữ đứng chờ mạng làm tê liệt toàn bộ các Virtual Threads khác",
          "Do HSM chỉ giao tiếp được với ngôn ngữ C++ chứ không phản hồi cho Java 21",
          "Do khối synchronized làm tràn bộ nhớ Metaspace tức thời"
        ],
        answer: 1,
        explanation: "Trên Java 21, khung thực thi của khối monitor synchronized ghim chặt Virtual Thread vào Platform Thread vật lý bên dưới (Carrier Thread). Khi lời gọi mạng tới HSM bên trong khối synchronized bị chậm hoặc xếp hàng, toàn bộ 8 Carrier Threads (tương ứng 8 nhân CPU) bị giữ làm con tin đứng chờ I/O dù không tốn CPU (nên CPU chỉ 5%), khiến không còn Carrier Thread nào rảnh để phục vụ hàng nghìn Virtual Threads khác. Đổi sang ReentrantLock sẽ giải quyết dứt điểm.",
        wrongReasons: [
          "Sai vì synchronized không tắt tính năng Virtual Threads toàn cục của JVM mà chỉ gây ghim cục bộ trong phạm vi khối khóa đó.",
          "",
          "Sai vì giao tiếp mạng TCP/TLS hay PKCS#11 sang HSM hoàn toàn hoạt động bình thường trên Java 21.",
          "Sai vì synchronized thao tác trên Object Monitor Header, hoàn toàn không cấp phát thêm class metadata làm tràn Metaspace."
        ]
      }
    ]
  },

  J5: {
    duration: "50 phút",
    difficulty: "Cấu trúc Dữ liệu & Đa luồng → Senior",
    codeLang: "java",
    teacherIntro: "Chào em, anh từng tham gia cứu hộ một sự cố định giá ngoại hối (FX) xảy ra đúng sáng thứ Năm khi Cục Dự trữ Liên bang Mỹ (FED) công bố lãi suất mới làm bảng tỷ giá USD/VND nhảy múa từng giây. Dịch vụ quy đổi ngoại tệ lưu bảng tỷ giá trong một biến static Map<String, FxRate> CACHE = new HashMap<>() để các luồng HTTP đọc cho nhanh, còn một luồng Kafka Consumer âm thầm gọi CACHE.put() mỗi khi có giá mới từ Hội sở. Đúng 09:15 sáng khi ngân hàng bổ sung thêm các cặp tỷ giá chéo mới làm HashMap chạm ngưỡng tự động nhân đôi mảng (resize), hai luồng va chạm làm hỏng mắt xích bảng băm: hàng loạt lệnh mua bán USD của doanh nghiệp đột nhiên nhận về giá trị null dù cặp USD_VND đã nạp từ đầu ngày, còn trên một node cũ thậm chí rơi vào vòng lặp vô tận đốt cháy 100% CPU! Chọn sai Collection trong môi trường đa luồng tài chính chính là cài bom hẹn giờ ngay giữa két sắt ngân hàng.",
    analogy: {
      title: "Bảng điện tử LED ma trận từng ô độc lập vs Đóng cửa cả phòng để sửa bảng phấn",
      body: "Hãy hình dung bảng niêm yết tỷ giá ngoại tệ tại Hội sở ngân hàng: dùng HashMap thường trong đa luồng giống như anh nhân viên tỷ giá vừa giật tung cả tấm bảng gỗ xuống đất để đóng khung bảng to hơn, vừa có 200 giao dịch viên lao vào đọc số khiến các thẻ chữ số rơi loạn xạ xuống sàn. Dùng Hashtable hay Collections.synchronizedMap thì giống như khóa trái cửa cả sảnh lớn, mỗi lần chỉ cho đúng 1 người bước vào nhìn hoặc sửa chữ (199 người kia đứng xếp hàng ngoài hành lang). Còn ConcurrentHashMap kết hợp đối tượng tỷ giá bất biến giống hệt bảng điện tử LED ma trận hiện đại: 5.000 giao dịch viên ngước nhìn đọc tỷ giá cùng lúc hoàn toàn tự do không ai cản ai (Lock-free volatile read); khi Hội sở cập nhật giá EUR/VND, mạch điện chỉ khóa vi mô đúng 1 ô EUR/VND trong vài phần triệu giây, còn ô USD/VND và JPY/VND kế bên vẫn cập nhật song song mượt mà!"
    },
    objectives: [
      "Giải phẫu nội tại HashMap từ Java 8 đến 21: phép trộn bit hash, công thức định vị ô bằng toán tử bit (n - 1) & hash, ngưỡng chuyển đổi sang Cây Đỏ-Đen (Treeification) và lý do cấu trúc này vỡ vụn khi ghi đa luồng.",
      "Làm chủ cơ chế đồng thời của ConcurrentHashMap (CAS + khóa mức Node đầu bucket), hiểu vì sao nó cấm tuyệt đối null và tránh được 2 bẫy lớn: lỗi Check-Then-Act rời rạc cùng lỗi Deadlock khi gọi đệ quy computeIfAbsent.",
      "Áp dụng kỷ luật Bất biến hóa (Immutability), Sao chép phòng vệ (Defensive Copy) và cài đặt hợp đồng equals()/hashCode() chuẩn xác cho cả Value Object lẫn Entity trong hệ thống ngân hàng."
    ],
    flow: [
      {
        step: "1. Trộn mã băm chống tập trung đụng độ (Bit Spreading)",
        detail: "ConcurrentHashMap lấy key.hashCode() XOR với 16 bit cao dịch phải (h ^ (h >>> 16)) và bật mặt nạ dương để phân bố đều khóa vào mảng lũy thừa 2 thông qua phép AND siêu tốc (n - 1) & hash."
      },
      {
        step: "2. Truy xuất đọc hoàn toàn không khóa (Lock-Free Volatile Read)",
        detail: "Mọi thao tác get(key) đọc thẳng từ mảng Node có ngữ nghĩa volatile (tabAt) mà không giữ bất kỳ monitor khóa nào, giúp hàng nghìn luồng giao dịch tra cứu danh mục mã ngân hàng/tỷ giá đạt độ trễ nano-giây."
      },
      {
        step: "3. Chèn ô trống bằng CAS hoặc Khóa hạt mịn trên Node đầu ô",
        detail: "Khi ghi dữ liệu, nếu ô băm đang trống (null), luồng dùng lệnh phần cứng CAS (casTabAt) đặt Node mới ngay không cần khóa; nếu ô đã có phần tử, nó chỉ khóa synchronized đúng trên Node đầu tiên của riêng ô đó."
      },
      {
        step: "4. Cây hóa chống HashDoS & Mở rộng bảng hợp tác đa luồng",
        detail: "Nếu một ô băm có từ 8 phần tử trở lên VÀ tổng kích thước mảng >= 64, chuỗi liên kết O(n) tự nâng cấp thành Cây Đỏ-Đen O(log n); khi bảng đầy quá 75%, nhiều luồng có thể cùng chung tay copy dữ liệu sang mảng mới qua ForwardingNode."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu HashMap: Phép toán Bit lũy thừa 2, Treeification và Tử địa Đa luồng",
        paragraphs: [
          "Để hiểu vì sao HashMap nhanh đến thế trong đơn luồng, hãy nhìn vào cách nó tìm vị trí ô nhớ (bucket index). Phép chia lấy phần dư 'hash % capacity' trên CPU tốn nhiều chu kỳ xung nhịp hơn hẳn phép toán bit. Vì vậy, HashMap cưỡng bức dung lượng mảng nội bộ (capacity — mặc định 16, hệ số tải loadFactor = 0.75) LUÔN LUÔN là một lũy thừa của 2 (16, 32, 64, 128...). Khi n là lũy thừa của 2, giá trị nhị phân của (n - 1) là một dãy toàn các bit 1 ở phần thấp (ví dụ 16 - 1 = 15 = 00001111), nhờ đó phép chia lấy dư biến thành phép AND bit cực nhanh: index = (n - 1) & hash! Và để tránh việc chỉ dùng các bit thấp làm các mã băm khác nhau ở phần cao bị rơi trùng vào một ô, HashMap thực hiện trộn 16 bit cao xuống 16 bit thấp bằng phép XOR: (h = key.hashCode()) ^ (h >>> 16).",
          "Trước Java 8, nếu kẻ tấn công cố tình gửi hàng vạn tham số JSON có cùng mã băm (tấn công từ chối dịch vụ HashDoS), toàn bộ phần tử sẽ dồn vào 1 bucket tạo thành danh sách liên kết dài lê thê làm độ phức tạp tra cứu suy biến từ O(1) xuống O(n) treo cứng CPU. Từ Java 8+, khi chiều dài chuỗi tại 1 ô chạm ngưỡng TREEIFY_THRESHOLD = 8 VÀ dung lượng mảng đạt tối thiểu MIN_TREEIFY_CAPACITY = 64 (nếu mảng nhỏ hơn 64 nó sẽ ưu tiên resize nhân đôi mảng trước thay vì cây hóa!), danh sách liên kết tự động chuyển thành Cây Đỏ-Đen cân bằng (Red-Black Tree) giữ tốc độ tra cứu ở mức O(log n) — với 1 triệu phần tử đụng độ cũng chỉ mất tối đa ~20 bước so sánh! Tuy nhiên, toàn bộ sự tinh xảo này hoàn toàn KHÔNG có rào chắn đa luồng: chỉ cần 2 luồng cùng gọi put() lúc đang mở rộng mảng là ghi đè làm mất phần tử của nhau (Silent Data Loss) hoặc làm gãy con trỏ cây."
        ],
        bullets: [
          "Khởi tạo sẵn kích thước khi biết trước số phần tử: Nếu cần nạp 1.000 mã chi nhánh ngân hàng vào HashMap để xử lý trong hàm cục bộ, đừng gọi new HashMap<>(1000) vì 1000 > 1024 × 0.75 (768) nên nó vẫn bị resize giữa chừng! Từ Java 19/21, hãy dùng hàm chuẩn HashMap.newHashMap(1000) — JDK tự chia sẵn cho 0.75 để cấp đúng mảng đủ chứa không cần resize lần nào.",
          "Khi nào HashMap hoàn toàn an toàn: Khi và chỉ khi nó là biến cục bộ nằm trọn trong phạm vi 1 luồng xử lý, hoặc được nạp dữ liệu xong xuôi 100% lúc khởi động rồi bọc bất biến bằng Map.copyOf() trước khi chia sẻ cho các luồng đọc.",
          "Tuyệt đối cấm đặt đối tượng khả biến (Mutable Object) làm Key của Map: Nếu dùng một đối tượng có setter làm Key, sau khi put(k, v) xong mà ai đó gọi k.setCode(\"NEW\") làm thay đổi hashCode(), bạn sẽ không bao giờ tìm lại hay xóa được phần tử đó nữa — gây rò rỉ dữ liệu ngầm trên RAM."
        ]
      },
      {
        heading: "2. ConcurrentHashMap Chuyên sâu: Tại sao Cấm Null, Bẫy Check-Then-Act & Deadlock Đệ quy",
        paragraphs: [
          "Một câu hỏi phỏng vấn Senior cực hay là: 'HashMap cho phép cả key và value bằng null, tại sao ConcurrentHashMap lại ném thẳng NullPointerException?'. Tác giả Doug Lea giải thích lý do nằm ở sự mơ hồ chết người trong môi trường đa luồng (Ambiguity in Concurrency). Với HashMap đơn luồng, nếu map.get(k) trả về null, bạn có thể gọi tiếp map.containsKey(k) để phân biệt xem khóa k chưa hề tồn tại hay khóa k có tồn tại với giá trị null. Nhưng trong ConcurrentHashMap đa luồng, giữa khoảnh khắc dòng 1 gọi get(k) và dòng 2 gọi containsKey(k), một luồng khác hoàn toàn có thể vừa thêm hoặc vừa xóa khóa k! Vì không thể kiểm chứng nhất quán trạng thái 2 bước mà không khóa toàn bảng, ConcurrentHashMap cấm tiệt null để đảm bảo quy ước sắt đá: get(k) == null đồng nghĩa 100% là tại tích tắc đọc đó, khóa k không có trong bảng.",
          "Sai lầm thực tế nguy hiểm nhất khi dùng ConcurrentHashMap là lầm tưởng 'cứ khai báo kiểu dữ liệu ConcurrentHashMap là mọi đoạn code xung quanh nó tự khắc nguyên tử'. Rất nhiều dev viết tổ hợp rời rạc: if (!cache.containsKey(pair)) { cache.put(pair, loadRate()); } hoặc lấy số cộng dồn cache.put(acc, cache.get(acc).add(delta)). Trong giờ cao điểm, hai luồng cùng vượt qua lệnh if và ghi đè lên nhau làm mất trắng bản cập nhật trước (Lost Update)! Bạn BẮT BUỘC phải gom toàn bộ logic đọc-tính-ghi vào bên trong các phương thức nguyên tử cấp ô của ConcurrentHashMap như compute(), computeIfAbsent(), computeIfPresent() hoặc merge()."
        ],
        bullets: [
          "Cảnh báo đỏ — Lỗi Deadlock thực tế của computeIfAbsent: Do computeIfAbsent giữ khóa monitor trên bucket băm của key hiện tại trong suốt lúc chạy hàm lambda, nếu bên trong lambda của map.computeIfAbsent(keyA, k -> ... map.computeIfAbsent(keyB, ...)) mà keyA và keyB tình cờ rơi vào CÙNG MỘT BUCKET (hoặc hai luồng gọi chéo hai bucket), luồng sẽ bị treo cứng vĩnh viễn (Deadlock / IllegalStateException: Recursive update)! Tuyệt đối giữ hàm bên trong compute() ngắn gọn và không gọi lồng lại chính Map đó.",
          "Hiểu đúng về size() và isEmpty() trên ConcurrentHashMap: Tương tự LongAdder, ConcurrentHashMap duy trì kích thước phân tán qua baseCount và mảng CounterCell[] nên size() chỉ mang tính ước lượng tại thời điểm đang có biến động ghi đồng thời; đừng dùng size() làm điều kiện quyết định hạn ngạch tiền tệ chính xác.",
          "Khi nào dùng CopyOnWriteArrayList: Phù hợp hoàn hảo cho danh sách Listener sự kiện hoặc danh sách IP Whitelist ngân hàng đối tác (chỉ có 20–100 phần tử, đọc 100.000 lần/giây nhưng cả ngày mới cập nhật 1 lần); tuyệt đối KHÔNG dùng cho danh sách ghi liên tục vì mỗi lần add() nó phải sao chép toàn bộ mảng mới tốn RAM kinh khủng."
        ]
      },
      {
        heading: "3. Kỷ luật Bất biến (Immutability), Defensive Copy & Hợp đồng equals/hashCode Ngân hàng",
        paragraphs: [
          "Dù bạn đã dùng ConcurrentHashMap chuẩn chỉ để lưu đối tượng FxQuote, nhưng nếu bản thân lớp FxQuote lại có phương thức công khai setBuyRate(...) cho phép luồng A đang sửa giá mua rồi mới sửa tiếp giá bán trong khi luồng B vừa đọc tham chiếu FxQuote đó ra tính tiền cho khách, thì khách hàng sẽ bị khớp lệnh trên một bản ghi 'nửa cũ nửa mới' (Torn Read — Giá mua của giờ mới nhưng Giá bán vẫn của giờ cũ, thậm chí Giá mua cao hơn Giá bán làm ngân hàng lỗ ngược ngay tức khắc!). Bí quyết giữ an toàn dữ liệu đa luồng đơn giản và mạnh mẽ nhất chính là: kết hợp ConcurrentHashMap với các Value Object BẤT BIẾN 100% (Java Record). Khi có tỷ giá mới, ta thay thế trọn vẹn cả tham chiếu Record cũ bằng một Record mới tinh nguyên tử.",
          "Mảnh ghép cuối cùng của một Senior chắc tay là Sao chép phòng vệ (Defensive Copy) và Hợp đồng equals/hashCode. Khi một Aggregate như JournalEntry (Bút toán sổ cái) giữ danh sách các dòng hạch toán List<Posting>, nếu hàm getPostings() trả thẳng danh sách nội bộ ra ngoài, code ở tầng khác vô tình gọi journal.getPostings().clear() hoặc .add(...) sẽ phá nát sự cân bằng Nợ = Có mà không hề đi qua hàm kiểm tra! Luôn trả về List.copyOf(postings) hoặc Collections.unmodifiableList(). Đồng thời, luôn tuân thủ quy ước sinh tử: hai đối tượng bằng nhau qua equals() BẮT BUỘC phải trả về cùng một hashCode(); với Value Object dùng tất cả các trường giá trị (hoặc Java Record tự sinh), còn với JPA @Entity chỉ dựa trên Business Key bất biến hoặc ID đã gắn bền vững kèm kiểm tra null an toàn."
        ],
        bullets: [
          "Ưu tiên List.of(), Set.of(), Map.of() và List.copyOf() của Java hiện đại: Các bộ sưu tập bất biến này không chỉ chặn mọi lệnh sửa đổi (ném UnsupportedOperationException), cấm phần tử null, mà còn tiết kiệm bộ nhớ Heap hơn tới 30%–50% so với ArrayList/HashMap truyền thống.",
          "Bảo vệ kiểu Date/byte[] khả biến cổ điển: Tuyệt đối dùng java.time.Instant, LocalDate, ZonedDateTime (bất biến và thread-safe 100%) thay thế hoàn toàn cho java.util.Date, Calendar và SimpleDateFormat vốn cực kỳ nguy hiểm khi chia sẻ đa luồng.",
          "Tránh rò rỉ tham chiếu ngay từ Constructor: Nếu nhận một mảng hoặc List từ bên ngoài truyền vào constructor, hãy sao chép bằng List.copyOf(input) trước khi gán vào trường nội bộ để người gọi không giữ được 'dây diều' thay đổi dữ liệu ngầm từ phía sau."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Cấu trúc Dữ liệu Lưu trữ Bộ nhớ Đệm Nội bộ trong Dịch vụ Ngân hàng",
      headers: ["Cấu trúc dữ liệu", "Cơ chế đồng bộ hóa", "Hiệu năng Đọc / Ghi đa luồng", "Trường hợp sử dụng chuẩn trong Ngân hàng"],
      rows: [
        ["HashMap<K, V>", "Không đồng bộ (Not thread-safe)", "Nhanh nhất ở đơn luồng; hỏng cấu trúc & mất dữ liệu nếu ghi đa luồng", "Biến tạm cục bộ trong 1 hàm hoặc tạo xong đóng băng bằng Map.copyOf()"],
        ["Collections.synchronizedMap", "Khóa mutex toàn cục cả bảng cho mọi thao tác", "Rất kém dưới tải cao vì mọi luồng đọc get() cũng phải xếp hàng chờ nhau", "Hệ thống kế thừa quá cũ hầu như không có tải đồng thời (Không khuyến khích)"],
        ["ConcurrentHashMap<K, V>", "Đọc volatile không khóa; ghi bằng CAS + khóa mức từng Node đầu ô", "Đọc siêu nhanh ngang HashMap; ghi song song trên các ô khác nhau cực mượt", "Bộ nhớ đệm bảng tỷ giá FX, cấu hình mã BIN ngân hàng, Registry kết nối"],
        ["CopyOnWriteArrayList<E>", "Đọc không khóa trên mảng bất biến; ghi tạo bản sao mảng mới", "Đọc cực nhanh; ghi rất đắt nếu mảng lớn hoặc cập nhật liên tục", "Danh sách Rule kiểm duyệt cố định, danh sách IP đối tác đọc nhiều ít sửa"]
      ]
    },
    codeTitle: "AtomicFxRateCache.java — Bộ nhớ Đệm Tỷ giá Ngoại hối Đọc Không Khóa & Cập nhật Nguyên tử Chuẩn Hội Sở",
    code: [
      "package vn.finjava.core.fx;",
      "",
      "import java.math.BigDecimal;",
      "import java.math.RoundingMode;",
      "import java.time.Instant;",
      "import java.util.Map;",
      "import java.util.Objects;",
      "import java.util.Optional;",
      "import java.util.concurrent.ConcurrentHashMap;",
      "",
      "public final class AtomicFxRateCache {",
      "    public record FxQuote(String pair, BigDecimal bidRate, BigDecimal askRate, long version, Instant updatedAt) {",
      "        public FxQuote {",
      "            Objects.requireNonNull(pair); Objects.requireNonNull(bidRate); Objects.requireNonNull(askRate);",
      "            if (bidRate.signum() <= 0 || askRate.compareTo(bidRate) < 0) {",
      "                throw new IllegalArgumentException(\"Tỷ giá phi lý (Giá bán < Giá mua): \" + pair);",
      "            }",
      "        }",
      "    }",
      "",
      "    private static final BigDecimal MAX_TICK_SWING = new BigDecimal(\"0.05\"); // Ngắt mạch nếu nhảy quá ±5%/nhịp",
      "    private final ConcurrentHashMap<String, FxQuote> quotes = new ConcurrentHashMap<>(32);",
      "",
      "    public Optional<FxQuote> getQuoteLockFree(String currencyPair) {",
      "        return Optional.ofNullable(quotes.get(currencyPair)); // Volatile read 0-lock, an toàn tuyệt đối",
      "    }",
      "",
      "    public FxQuote upsertRateAtomically(String pair, BigDecimal newBid, BigDecimal newAsk, long incomingVer) {",
      "        return quotes.compute(pair, (k, current) -> {",
      "            if (current != null) {",
      "                if (incomingVer <= current.version()) return current; // Bỏ qua gói tin Kafka đến trễ (Out-of-order)",
      "                BigDecimal deltaRatio = newAsk.subtract(current.askRate()).abs()",
      "                        .divide(current.askRate(), 6, RoundingMode.HALF_EVEN);",
      "                if (deltaRatio.compareTo(MAX_TICK_SWING) > 0) {",
      "                    throw new IllegalStateException(\"Biến động tỷ giá bất thường vượt biên độ 5% cho \" + k);",
      "                }",
      "            }",
      "            return new FxQuote(k, newBid, newAsk, incomingVer, Instant.now());",
      "        });",
      "    }",
      "",
      "    public Map<String, FxQuote> snapshotBoard() {",
      "        return Map.copyOf(quotes); // Bản chụp phòng vệ bất biến phục vụ API niêm yết toàn bảng",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Record FxQuote bất biến kiểm chứng ngay tại phễu khởi tạo bất biến kinh doanh cốt lõi của ngoại hối: tỷ giá phải dương và Giá ngân hàng bán ra (askRate) không bao giờ được nhỏ hơn Giá ngân hàng mua vào (bidRate), triệt tiêu lỗi Torn Read khiến ngân hàng lỗ chênh lệch tỷ giá.",
      "Phương thức getQuoteLockFree() tận dụng volatile read không khóa của ConcurrentHashMap kết hợp Optional, đảm bảo hàng chục nghìn luồng tra cứu tỷ giá cùng lúc không bị nghẽn và không bao giờ dính NullPointerException.",
      "Phương thức upsertRateAtomically() gói trọn 3 bước kiểm tra nghiệp vụ vào bên trong hàm nguyên tử quotes.compute(pair, ...): (1) Chống ghi đè lùi bởi bản tin Kafka đến trễ qua incomingVer <= current.version(); (2) Chặn lỗi nguồn dữ liệu rác nhảy vọt quá ±5% (Circuit Breaker biên độ giá); (3) Tráo nguyên khối Record mới mà chỉ khóa hạt mịn đúng ô của cặp tiền đó.",
      "Hàm snapshotBoard() trả về Map.copyOf(quotes) (Defensive Copy bất biến), ngăn chặn tuyệt đối việc tầng Controller hay Serializer bên ngoài vô tình thay đổi bảng tỷ giá gốc."
    ],
    labGuide: {
      goal: "Kiểm thử chịu tải đa luồng trên AtomicFxRateCache chứng minh không bao giờ xảy ra ghi đè lùi phiên bản cũ và chặn đứng tỷ giá lỗi biên độ.",
      steps: [
        "Bước 1: Khởi tạo AtomicFxRateCache và nạp giá mở cửa buổi sáng cho cặp \"USD_VND\" với bid = 25100, ask = 25450, version = 1.",
        "Bước 2: Tạo 20 luồng cập nhật ngẫu nhiên các phiên bản từ 2 đến 100 (cố tình trộn lộn xộn thứ tự version để giả lập mạng Kafka trễ) song song với 50 luồng đọc liên tục getQuoteLockFree(\"USD_VND\") kiểm tra bất biến askRate >= bidRate.",
        "Bước 3: Sau khi tất cả các luồng kết thúc, kiểm tra version cuối cùng trong cache bắt buộc phải bằng đúng 100 (không bị bản tin trễ version thấp ghi đè lùi).",
        "Bước 4: Thử gọi upsertRateAtomically(\"USD_VND\", new BigDecimal(\"25100\"), new BigDecimal(\"29000\"), 101) (nhảy vọt > 5%) và xác nhận hệ thống ném IllegalStateException giữ nguyên bản ghi version 100 an toàn."
      ],
      expectedOutput: "100% lượt đọc từ 50 luồng song song đều nhận được FxQuote hợp lệ nhất quán; phiên bản cuối cùng chốt chính xác ở version = 100; bản tin giá rác 29.000 VND bị chặn đứng tức khắc mà không làm hỏng dữ liệu hiện hành."
    },
    examTips: [
      "Khi được hỏi 'Tại sao đã dùng ConcurrentHashMap mà dữ liệu bộ đếm / cache vẫn bị sai lệch dưới tải cao?': Hãy chỉ ngay vào lỗi kinh điển 'Check-Then-Act' (gọi get() rồi mới gọi put() tách làm 2 câu lệnh rời nhau) và đưa ra giải pháp chuẩn dùng compute(), merge() hoặc computeIfAbsent().",
      "Ghi điểm tuyệt đối bằng chi tiết sâu của JDK: nhắc tới việc không bao giờ viết lời gọi mạng chậm hoặc gọi đệ quy lại chính ConcurrentHashMap bên trong lambda của computeIfAbsent() vì khóa monitor đang giữ trên đầu bucket sẽ làm nghẽn các khóa cùng mã băm hoặc gây Deadlock!",
      "Nếu hội đồng hỏi về SimpleDateFormat trên biến static trong Service: chỉ rõ SimpleDateFormat lưu trạng thái lịch trung gian trên trường instance không đồng bộ nên khi 2 luồng format ngày sinh/ngày hiệu lực giao dịch cùng lúc sẽ trộn râu ông nọ cắm cằm bà kia — bắt buộc dùng java.time.format.DateTimeFormatter bất biến."
    ],
    summaryTakeaways: [
      "HashMap định vị ô bằng phép bit (n - 1) & hash và cây hóa sang Red-Black Tree khi chuỗi >= 8 (mảng >= 64), nhưng tuyệt đối cấm chia sẻ ghi đa luồng.",
      "ConcurrentHashMap đọc hoàn toàn không khóa, ghi bằng CAS + khóa hạt mịn đầu ô và cấm null để loại bỏ sự nhập nhằng trạng thái đa luồng.",
      "Mọi thao tác đọc-kiểm-tra-cập-nhật trên ConcurrentHashMap phải gom vào một hàm nguyên tử duy nhất như compute() hoặc merge(), không tách rời get() rồi put().",
      "Luôn lưu các đối tượng bất biến (Java Record, java.time.*) bên trong cache đa luồng và dùng List.copyOf() / Map.copyOf() để sao chép phòng vệ khi trả dữ liệu ra ngoài."
    ],
    lessonQuestions: [
      {
        question: "Trong một Spring @Service (mặc định là Singleton dùng chung cho mọi request HTTP), lập trình viên khai báo biến thành viên 'private final Map<String, BankInfo> bankCache = new HashMap<>();' và viết hàm kiểm tra: nếu bankCache.get(bin) == null thì đọc từ DB rồi gọi bankCache.put(bin, info). Rủi ro nghiêm trọng nhất khi dịch vụ vừa khởi động lại đúng giờ cao điểm 2.000 request/giây là gì?",
        options: [
          "Spring Boot tự động chuyển đổi mọi trường kiểu HashMap trong @Service thành ConcurrentHashMap lúc khởi động nên hoàn toàn an toàn",
          "Nhiều luồng HTTP gọi bankCache.put() đồng thời ngay lúc HashMap thực hiện mở rộng mảng (resize) làm hỏng cấu trúc con trỏ Node nội bộ, dẫn tới mất dữ liệu ngầm, trả về null sai lệch hoặc treo CPU",
          "HashMap không cho phép lưu đối tượng tùy biến BankInfo làm giá trị",
          "Hàm get() của HashMap sẽ tự động khóa toàn bộ bảng làm chậm hệ thống"
        ],
        answer: 1,
        explanation: "Spring Bean mặc định có phạm vi Singleton (một thực thể duy nhất phục vụ đồng thời hàng trăm luồng HTTP). Việc nhiều luồng cùng ghi put() và kích hoạt resize() trên một HashMap không đồng bộ gây ra Race Condition trực tiếp trên mảng Node[] nội bộ, làm đứt gãy liên kết phần tử, mất bản ghi vừa chèn hoặc làm hỏng cây băm.",
        wrongReasons: [
          "Sai hoàn toàn vì Spring IoC Container không bao giờ tự ý tráo đổi kiểu thực thi cấu trúc dữ liệu của trường private bên trong class.",
          "",
          "Sai vì HashMap lưu trữ được bất kỳ kiểu đối tượng Java nào làm Value.",
          "Sai vì HashMap hoàn toàn không có bất kỳ cơ chế khóa đồng bộ nào bên trong hàm get() hay put()."
        ]
      },
      {
        question: "Để cộng dồn tổng số tiền giao dịch trong phút theo từng mã đối tác trên bộ nhớ, kỹ sư dùng 'ConcurrentHashMap<String, BigDecimal> volumeMap' và viết: BigDecimal old = volumeMap.getOrDefault(partnerId, BigDecimal.ZERO); volumeMap.put(partnerId, old.add(amount)); Nhận định nào sau đây là ĐÚNG?",
        options: [
          "Đoạn code chính xác tuyệt đối 100% vì cả getOrDefault(), BigDecimal.add() và put() đều là các hàm an toàn đa luồng",
          "Đoạn code sẽ ném lỗi NullPointerException vì BigDecimal.ZERO có giá trị bằng 0",
          "Đoạn code bị lỗi Race Condition (Lost Update): hai luồng cùng đọc một giá trị old như nhau rồi lần lượt gọi put() ghi đè lên nhau làm thiếu hụt tổng tiền; phải sửa thành volumeMap.merge(partnerId, amount, BigDecimal::add)",
          "ConcurrentHashMap không cho phép dùng kiểu bất biến BigDecimal làm Value"
        ],
        answer: 2,
        explanation: "Mặc dù từng lời gọi riêng lẻ getOrDefault() và put() đều thread-safe, nhưng tổ hợp hai bước đọc rồi mới ghi lại KHÔNG nguyên tử. Nếu tổng hiện tại là 100, Luồng A (+50) và Luồng B (+30) cùng đọc ra old = 100, Luồng A ghi 150 rồi Luồng B ghi đè 130 => mất trắng 50! Sử dụng volumeMap.merge(partnerId, amount, BigDecimal::add) khóa nguyên tử đúng ô của partnerId để cộng dồn chính xác tuyệt đối 180.",
        wrongReasons: [
          "Sai vì ghép nối hai thao tác an toàn đa luồng độc lập không tạo ra một giao dịch hợp thành nguyên tử (Compound Action Trap).",
          "Sai vì BigDecimal.ZERO là một thực thể đối tượng hợp lệ khác null hoàn toàn.",
          "",
          "Sai vì lưu trữ đối tượng bất biến như BigDecimal trong ConcurrentHashMap không những được phép mà còn là thực hành chuẩn mực nhất."
        ]
      }
    ]
  },

  J6: {
    duration: "60 phút",
    difficulty: "Kiến trúc Hệ thống → Principal/Senior",
    codeLang: "java",
    teacherIntro: "Chào em, để khép lại Học phần J nền tảng, anh muốn kể cho em nghe bài học đắt giá nhất trong sự nghiệp thiết kế Core Banking của mình. Cách đây sáu năm, anh tiếp quản một hệ thống tài khoản mà class AccountEntity chỉ là một cái túi chứa dữ liệu rỗng tuếch gồm 45 trường kèm một dàn public getter/setter (Anemic Domain Model), còn toàn bộ logic nghiệp vụ bị rải khắp 8 class *ServiceImpl dài gần 3.000 dòng nhồi nhét chung cả câu lệnh SQL, @Transactional, gọi HTTP đối tác lẫn bắn Kafka. Thảm họa nổ ra khi đội Thẻ viết thêm tính năng 'Trích nợ tự động cuối kỳ': bạn dev lấy AccountEntity từ DB lên, gọi thẳng account.setBalance(account.getBalance().subtract(cardDebt)) rồi save() — hoàn toàn bỏ sót quy tắc 'Cấm trích nợ tài khoản đang có Lệnh Phong Tỏa của Cơ quan Thi hành án' vốn nằm khuất ở dòng thứ 1.420 bên trong TransferServiceImpl! Một tuần sau, ngân hàng nhận công văn khiếu nại khẩn cấp. Từ sau vết sẹo đó, mọi dịch vụ lõi anh xây dựng đều tuân thủ nghiêm ngặt Kiến trúc Hexagonal (Ports & Adapters) kết hợp Rich Domain Model của DDD.",
    analogy: {
      title: "Két sắt Trung tâm tự kiểm tra niêm phong vs Chiếc rổ nhựa ai đi ngang cũng bốc tiền được",
      body: "Mô hình nghèo nàn (Anemic Domain Model) mở toang hàm setBalance() chẳng khác nào để tiền của khách hàng trong những chiếc rổ nhựa đặt giữa hành lang: anh nhân viên Quầy giao dịch, chị nhân viên Thu nợ thẻ hay cậu thực tập sinh Khuyến mãi đi ngang qua đều có thể tự thò tay bốc tiền ra sửa con số trên mảnh giấy dán ngoài rổ — chỉ cần một người quên đọc tờ thông báo phong tỏa dán trên tường là xảy ra tai họa! Ngược lại, Rich Domain Model đặt trong Kiến trúc Hexagonal giống như Khu Kho Tiền Trung Tâm kiên cố: toàn bộ quy tắc niêm phong, hạn mức, khoanh giữ đều nằm ngay trong bộ não của Tổ trưởng Kho tiền (Aggregate Root Account). Dù yêu cầu đến từ ứng dụng Mobile, quầy Teller hay lô chạy đêm (Driving Adapters), tất cả đều phải nộp phiếu chuẩn qua Cửa Giao Tiếp (Inbound Port), và chỉ duy nhất Tổ trưởng Kho tiền mới có quyền kiểm tra đủ điều kiện rồi tự tay cập nhật số dư bên trong két!"
    },
    objectives: [
      "Nhận diện triệt để tác hại của Anemic Domain Model (God Service 3.000 dòng) và chuyển hóa thành Rich Domain Model nơi Aggregate Root đóng kín trạng thái, tự bảo vệ 100% bất biến tài chính (Invariants).",
      "Làm chủ Kiến trúc Lục giác — Hexagonal Architecture (Ports & Adapters) và Nguyên lý Đảo ngược Phụ thuộc (DIP): tách rời hoàn toàn tầng Domain cốt lõi khỏi Spring Framework, Hibernate/JPA, Kafka và giao thức đối tác.",
      "Tổ chức cấu trúc package chuẩn Production phân tách rõ Bounded Context, Inbound/Outbound Ports, Domain Events và viết bài kiểm chứng kiến trúc tự động bằng ArchUnit trên CI/CD."
    ],
    flow: [
      {
        step: "1. Driving Adapter tiếp nhận tín hiệu ngoại vi (REST / Kafka / gRPC)",
        detail: "Controller ở vành ngoài giải mã JSON/HTTP, xác thực định dạng cơ bản rồi đóng gói thành đối tượng bất biến TransferCommand gửi vào giao diện cổng vào (Inbound Port / UseCase)."
      },
      {
        step: "2. Application Service điều phối luồng & mở ranh giới giao dịch",
        detail: "Lớp thực thi UseCase không tự tính toán nghiệp vụ chi tiết mà đóng vai nhạc trưởng: kiểm tra khóa lũy đẳng (Idempotency), gọi Outbound Port tải Aggregate Account từ kho lưu trữ theo thứ tự chống Deadlock."
      },
      {
        step: "3. Rich Domain Aggregate thực thi quy tắc cốt lõi & sinh Domain Event",
        detail: "Đối tượng miền Account.debit(amount) và Account.credit(amount) tự kiểm tra trạng thái phong tỏa, số dư khả dụng (trừ khoản tạm giữ Hold), hạn mức giao dịch, cập nhật trạng thái nội tại và phát sinh bút toán bất biến."
      },
      {
        step: "4. Driven Adapter ánh xạ lưu trữ bền vững (PostgreSQL JPA / Outbox)",
        detail: "Cổng ra do Infrastructure cài đặt chuyển đổi Domain Aggregate sang JPA Entity lưu xuống PostgreSQL và ghi sự kiện vào bảng Outbox trong cùng một giao dịch cơ sở dữ liệu nguyên tử."
      }
    ],
    sections: [
      {
        heading: "1. Anemic Domain Model vs Rich Domain Model: Chấm dứt Căn bệnh 'God Service' 3.000 Dòng",
        paragraphs: [
          "Martin Fowler từng gọi Anemic Domain Model là một 'Anti-pattern đội lốt hướng đối tượng'. Trong rất nhiều dự án Java doanh nghiệp viết vội, các class mang tên mỹ miều như Account, LoanContract, LedgerJournal thực chất chỉ là các cấu trúc dữ liệu thụ động kiểu ngôn ngữ C từ thập niên 1980 (chỉ có biến private và một loạt hàm get/set tự sinh bằng Lombok @Data), không có nổi một dòng hành vi nghiệp vụ nào! Toàn bộ tri thức ngân hàng bị dồn hết ra các lớp *Service, biến chúng thành những kịch bản thủ tục khổng lồ (Transaction Scripts). Khi hệ thống lớn lên với 20 luồng nghiệp vụ cùng chạm vào tài khoản, logic kiểm tra 'Số dư khả dụng = Số dư sổ cái - Khoản khoanh giữ >= Số tiền rút' bị copy-paste ra 12 chỗ khác nhau, mỗi chỗ biến tướng một kiểu và không tài nào viết Unit Test nhanh được vì muốn test 1 dòng công thức phải mock tới 14 cái Repository/Client!",
          "Trong Domain-Driven Design (DDD) thực chiến cho Core Banking, chúng ta đảo ngược hoàn toàn cách làm đó bằng Rich Domain Model và Aggregate Root. Lớp Account trong tầng Domain TUYỆT ĐỐI KHÔNG CÓ setBalance() hay setStatus() công khai! Thay vào đó, nó cung cấp các phương thức phản ánh đúng Ngôn ngữ Chung của chuyên gia nghiệp vụ ngân hàng (Ubiquitous Language): debit(Money, String ref), credit(Money, String ref), placeHold(Money), releaseHold(Money), freezeForLegalOrder(String docNo). Mọi bất biến sống còn (Invariants — ví dụ: tài khoản FROZEN/CLOSED cấm ghi Nợ; số tiền rút phải dương và cùng loại tiền tệ với tài khoản; số dư khả dụng sau rút không bao giờ âm trừ khi có hạn mức thấu chi được cấp) được chốt chặn ngay bên trong các phương thức này. Nhờ vậy, bất kể ai gọi từ đâu cũng KHÔNG THỂ phá vỡ luật kế toán của ngân hàng!"
        ],
        bullets: [
          "Tạm biệt Lombok @Data / @Setter bừa bãi trên Domain & Entity: @Setter mở toang cánh cửa phá vỡ đóng gói (Encapsulation), còn equals/hashCode tự sinh của @Data trên JPA Entity có quan hệ hai chiều sẽ gây lỗi tràn ngăn xếp StackOverflowError hoặc kích hoạt truy vấn Lazy Loading ngầm ngoài ý muốn.",
          "Quy tắc thiết kế Aggregate gọn nhẹ (Vernon's Rule): Đừng nhét List<Transaction> gồm 500.000 lịch sử giao dịch 5 năm vào bên trong Aggregate Account! Account chỉ giữ trạng thái hiện hành cần thiết để bảo vệ bất biến (số dư, tổng tiền khoanh giữ, trạng thái, phiên bản khóa), còn từng bút toán phát sinh là thực thể/sự kiện độc lập được thêm mới (Append-only).",
          "Test nghiệp vụ tốc độ tên lửa: Vì Rich Domain Account là class Java thuần 100% không dính bất kỳ framework nào, bạn có thể chạy 500 bài JUnit kiểm tra đủ mọi góc khuất phong tỏa, thấu chi, tiền lẻ chỉ trong chưa đầy 150 mili-giây!"
        ]
      },
      {
        heading: "2. Kiến trúc Hexagonal (Ports & Adapters) & Nguyên lý Đảo ngược Phụ thuộc (DIP)",
        paragraphs: [
          "Câu hỏi lớn tiếp theo mà các bạn Mid-level lên Senior hay vướng mắc là: 'Nếu tách Domain ra khỏi Database và Framework, vậy Domain gọi xuống PostgreSQL và Kafka bằng cách nào?'. Bí mật nằm ở chữ D trong SOLID — Dependency Inversion Principle (Nguyên lý Đảo ngược Phụ thuộc), hạt nhân của cả Clean Architecture (Uncle Bob) lẫn Hexagonal Architecture (Alistair Cockburn). Trong kiến trúc 3 tầng truyền thống (Controller -> Service -> JpaRepository), mũi tên phụ thuộc cắm thẳng từ trên xuống dưới tầng Database: nghĩa là thiết kế bảng CSDL và các annotation @Entity, @Column, @OneToMany của Hibernate chi phối ngược lại toàn bộ cấu trúc code nghiệp vụ của bạn.",
          "Kiến trúc Hexagonal vẽ lại hệ thống như các vòng tròn đồng tâm hướng vào trong: Tầng trong cùng là Domain (Entities, Aggregates, Value Objects, Domain Exceptions — hoàn toàn thuần Java SE, không một dòng import org.springframework hay jakarta.persistence). Bao quanh Domain là tầng Application chứa các Inbound Ports (interface định nghĩa UseCase như TransferMoneyUseCase), các lớp thực thi UseCase điều phối luồng, và các Outbound Ports (interface định nghĩa nhu cầu giao tiếp bên ngoài như AccountRepositoryPort, FraudCheckPort — lưu ý cực kỳ quan trọng: các interface Port này nằm ở phía lõi Application/Domain định nghĩa!). Vòng ngoài cùng là tầng Adapters / Infrastructure: phía bên trái (Driving Adapters) gồm REST Controller, Kafka Consumer gọi vào Inbound Port; phía bên phải (Driven Adapters) gồm JpaAccountPersistenceAdapter, NapasHttpClientAdapter thực thi (implements) các Outbound Ports đó. Nhờ mũi tên mã nguồn của mọi tầng ngoài đều hướng ngược vào trong lõi, trái tim Core Banking trở nên bất tử trước mọi thay đổi công nghệ!"
        ],
        bullets: [
          "Có bắt buộc phải tách riêng Domain Model Account và JpaAccountEntity không?: Với các CRUD đơn giản (quản lý danh mục tỉnh thành, cấu hình banner quảng cáo), dùng chung JPA Entity là hợp lý để tránh boilerplate dư thừa (Pragmatic Engineering!). Nhưng với miền lõi phức tạp (Core Ledger, Khoản vay, Thẻ, Thanh toán Saga), tách riêng Domain Model và Persistence Entity kèm Mapper mỏng giúp bảo vệ Domain tuyệt đối khỏi giới hạn của ORM.",
          "Đặt @Transactional ở đâu khi Application/Domain không phụ thuộc Spring?: Bạn có thể gắn @Transactional trên một lớp Decorator/Configuration ở tầng Adapter/Bootstrap bọc quanh UseCase, hoặc cho phép duy nhất tầng Application dùng annotation giao dịch nhẹ trong khi giữ tầng Domain trong sạch 100%.",
          "Dễ dàng thay thế Adapter khi kiểm thử & tích hợp: Khi chạy Unit Test cho UseCase, bạn chỉ cần truyền một InMemoryAccountAdapter viết bằng ConcurrentHashMap 15 dòng thay cho PostgreSQL; khi chuyển đổi cổng SMS hay đổi từ REST sang gRPC gọi đối tác, không một dòng code nào trong Domain hay UseCase phải sửa đổi!"
        ]
      },
      {
        heading: "3. Bounded Contexts trong Ngân hàng & Bảo vệ Kiến trúc Tự động bằng ArchUnit",
        paragraphs: [
          "Ở cấp độ chiến lược (Strategic DDD), sai lầm từng làm thất bại nhiều dự án chuyển đổi số ngân hàng là cố gắng xây dựng một 'Canonical Data Model' duy nhất dùng chung một class Customer và một class Account cho toàn bộ 40 phòng ban! Thực tế, từ 'Account' trong phòng Kế toán Sổ cái (Ledger Bounded Context) chỉ mang ý nghĩa số hiệu tài khoản, loại tiền, số dư Nợ/Có và trạng thái phong tỏa; trong phòng Thẩm định Rủi ro (Risk/AML Bounded Context) nó lại là hồ sơ điểm hành vi, hạn mức luồng tiền bất thường; còn trong phòng Chăm sóc Khách hàng (CRM Bounded Context) nó là gói tài khoản ưu tiên Priority và ngày sinh nhật tặng quà. Tách hệ thống thành các Bounded Context rõ ranh giới, giao tiếp với nhau qua Hợp đồng API / Sự kiện Bất biến và có Lớp Chống Tham Nhũng (Anti-Corruption Layer — ACL) dịch dữ liệu xấu từ hệ thống cũ (Legacy Core AS/400) sang ngôn ngữ sạch của miền mới chính là chìa khóa giúp 20 đội phát triển làm việc độc lập không giẫm chân nhau.",
          "Cuối cùng, một kiến trúc dù được vẽ đẹp đến mấy trên Confluence cũng sẽ mục nát chỉ sau 6 tháng nếu thiếu cơ chế cưỡng chế tự động. Trong thực tế áp lực deadline dự án, một lập trình viên mới vào team rất dễ bấm phím tắt IDE auto-import nhầm một class JpaEntity hoặc HttpServletRequest thẳng vào trong package domain! Thay vì tốn sức soi từng dòng khi Review Merge Request, các đội Senior Java Ngân hàng viết đúng 1 file JUnit sử dụng thư viện ArchUnit: định nghĩa luật 'Không bất kỳ class nào trong ..domain.. được phụ thuộc vào ..adapter.., org.springframework.. hay jakarta.persistence..'. Hễ ai vi phạm ranh giới kiến trúc, pipeline GitLab CI/Jenkins sẽ báo đỏ chặn đứng bản build ngay lập tức!"
        ],
        bullets: [
          "Cấu trúc Package theo Tính năng & Lục giác (Package by Feature + Hexagonal): Ưu tiên chia theo miền nghiệp vụ trước (vn.finjava.ledger.domain, vn.finjava.ledger.application, vn.finjava.ledger.adapter.in.web, vn.finjava.ledger.adapter.out.persistence) thay vì gom chung một cục controller/service/entity khổng lồ của cả dự án.",
          "Anti-Corruption Layer (ACL) khi tích hợp Core cũ hoặc đối tác NAPAS: Không bao giờ để các mã trường khó hiểu kiểu 'DE39', 'MTI_0210' hay tên cột viết tắt 'AC_BAL_AMT_01' của hệ thống ngoài tràn vào bên trong Domain của bạn; hãy dịch toàn bộ tại lớp Adapter ngoài biên.",
          "Biết chọn đúng vũ khí cho đúng bài toán: Áp dụng trọn vẹn Hexagonal + Rich DDD cho 20% phân hệ cốt lõi mang rủi ro tiền tệ & quy tắc phức tạp nhất (Core Domain), và dùng kiến trúc đơn giản gọn nhẹ cho 80% phân hệ phụ trợ (Supporting/Generic Subdomains)."
        ]
      }
    ],
    comparison: {
      title: "So sánh Kiến trúc Phân tầng Truyền thống (Anemic) vs Kiến trúc Hexagonal + Rich DDD",
      headers: ["Tiêu chí so sánh", "3-Tier Truyền thống + Anemic Model", "Hexagonal + Rich DDD (Chuẩn Core Banking)", "CRUD / Transaction Script Tối giản"],
      rows: [
        ["Vị trí chứa quy tắc nghiệp vụ", "Phân tán lộn xộn trong các lớp *ServiceImpl dài hàng nghìn dòng", "Tập trung đóng gói chặt bên trong Rich Domain Aggregates & Value Objects", "Nằm trực tiếp trong Service mỏng hoặc truy vấn DB"],
        ["Sự phụ thuộc vào Framework/DB", "Nghiệp vụ dính chặt chặt chẽ với JPA @Entity, Spring, SQL", "Domain cốt lõi độc lập 100% khỏi Spring, Hibernate, Kafka, HTTP", "Phụ thuộc trực tiếp để tối ưu tốc độ viết code ban đầu"],
        ["Tốc độ & Độ tin cậy Unit Test", "Chậm và giòn (phải bật Spring Context hoặc mock hàng chục dependency)", "Siêu nhanh (< 1ms/test Java thuần), kiểm chứng trọn vẹn mọi bất biến tiền tệ", "Chủ yếu kiểm thử tích hợp mức API + Database"],
        ["Bài toán Ngân hàng phù hợp", "Dễ phát sinh nợ kỹ thuật và lọt lỗi nghiệp vụ khi quy mô lớn", "Core Ledger, Payment Orchestrator, Tín dụng, Quản lý Hạn mức & Phong tỏa", "Dịch vụ tra cứu danh mục tĩnh, CMS nội bộ, quản lý cấu hình đơn giản"]
      ]
    },
    codeTitle: "Account.java & TransferMoneyService.java — Rich Domain Aggregate & Hexagonal Ports Thuần Java 21",
    code: [
      "package vn.finjava.ledger.core;",
      "",
      "import vn.finjava.core.domain.vo.Money;",
      "import java.util.Objects;",
      "",
      "// === 1. RICH DOMAIN AGGREGATE ROOT (0% phụ thuộc Spring / JPA / Jackson!) ===",
      "public final class Account {",
      "    public enum Status { ACTIVE, FROZEN_BY_LEGAL, CLOSED }",
      "",
      "    private final String accountNo;",
      "    private Money ledgerBalance;",
      "    private Money holdAmount;",
      "    private Status status;",
      "    private final long version; // Phục vụ Optimistic Locking khi ánh xạ xuống DB",
      "",
      "    public Account(String accountNo, Money ledgerBalance, Money holdAmount, Status status, long version) {",
      "        this.accountNo = Objects.requireNonNull(accountNo);",
      "        this.ledgerBalance = Objects.requireNonNull(ledgerBalance);",
      "        this.holdAmount = Objects.requireNonNull(holdAmount);",
      "        this.status = Objects.requireNonNull(status);",
      "        this.version = version;",
      "    }",
      "",
      "    public void debit(Money amount) {",
      "        if (status != Status.ACTIVE) throw new IllegalStateException(\"Tài khoản không hoạt động/bị phong tỏa: \" + status);",
      "        if (amount.amount().signum() <= 0) throw new IllegalArgumentException(\"Số tiền ghi Nợ phải > 0\");",
      "        Money available = new Money(ledgerBalance.amount().subtract(holdAmount.amount()), ledgerBalance.currency());",
      "        if (available.compareTo(amount) < 0) throw new IllegalStateException(\"Số dư khả dụng không đủ (đã trừ khoản tạm giữ)\");",
      "        this.ledgerBalance = new Money(ledgerBalance.amount().subtract(amount.amount()), ledgerBalance.currency());",
      "    }",
      "",
      "    public void credit(Money amount) {",
      "        if (status == Status.CLOSED) throw new IllegalStateException(\"Không thể ghi Có vào tài khoản đã đóng\");",
      "        if (amount.amount().signum() <= 0) throw new IllegalArgumentException(\"Số tiền ghi Có phải > 0\");",
      "        this.ledgerBalance = this.ledgerBalance.add(amount);",
      "    }",
      "",
      "    public String accountNo() { return accountNo; }",
      "    public Money ledgerBalance() { return ledgerBalance; }",
      "    public long version() { return version; }",
      "}",
      "",
      "// === 2. HEXAGONAL PORTS & APPLICATION USE CASE ===",
      "record TransferCommand(String fromAcc, String toAcc, Money amount, String idempotencyKey) {}",
      "interface TransferMoneyUseCase { void transfer(TransferCommand cmd); } // Inbound Port",
      "interface AccountPort { Account loadForUpdate(String accNo); void save(Account acc); } // Outbound Port",
      "",
      "final class TransferMoneyService implements TransferMoneyUseCase {",
      "    private final AccountPort accountPort;",
      "    TransferMoneyService(AccountPort accountPort) { this.accountPort = accountPort; }",
      "",
      "    @Override public void transfer(TransferCommand cmd) {",
      "        String firstNo = cmd.fromAcc().compareTo(cmd.toAcc()) < 0 ? cmd.fromAcc() : cmd.toAcc();",
      "        String secondNo = cmd.fromAcc().compareTo(cmd.toAcc()) < 0 ? cmd.toAcc() : cmd.fromAcc();",
      "        Account first = accountPort.loadForUpdate(firstNo);   // Khóa theo thứ tự từ điển chống Deadlock!",
      "        Account second = accountPort.loadForUpdate(secondNo);",
      "        Account source = cmd.fromAcc().equals(firstNo) ? first : second;",
      "        Account target = cmd.fromAcc().equals(firstNo) ? second : first;",
      "        source.debit(cmd.amount());   // Mọi luật phong tỏa & số dư khả dụng do chính Domain tự bảo vệ",
      "        target.credit(cmd.amount());",
      "        accountPort.save(source); accountPort.save(target);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Lớp Account hoàn toàn KHÔNG có phương thức setBalance() hay setStatus() công khai; cách duy nhất để làm giảm tiền là đi qua hành vi nghiệp vụ debit(amount), nơi tự động kiểm tra trạng thái FROZEN_BY_LEGAL và tính chính xác Số dư khả dụng = ledgerBalance - holdAmount.",
      "Phân biệt tinh tế nghiệp vụ ngân hàng ngay trong Domain: tài khoản bị phong tỏa pháp lý (FROZEN_BY_LEGAL) bị chặn tuyệt đối lệnh rút tiền debit(), nhưng VẪN cho phép nhận tiền chuyển đến qua credit() (chỉ cấm credit khi tài khoản đã CLOSED hoàn toàn) — quy tắc chuẩn thực tế tại các ngân hàng!",
      "Toàn bộ Domain và UseCase không hề import bất kỳ thư viện ngoài nào (0% Spring, 0% Hibernate); giao tiếp với Database thông qua Outbound Port (interface AccountPort) tuân thủ trọn vẹn Dependency Inversion Principle.",
      "Trong TransferMoneyService.transfer(), tài khoản nguồn và đích được sắp xếp khóa theo thứ tự mã tài khoản tăng dần (firstNo < secondNo) trước khi gọi loadForUpdate(), triệt tiêu 100% nguy cơ Deadlock chéo khi A chuyển cho B đồng thời B chuyển ngược lại cho A!"
    ],
    labGuide: {
      goal: "Viết bộ kiểm thử JUnit 5 thuần Java (không cần bật Spring Boot hay Database) kiểm chứng toàn bộ quy tắc bảo vệ tài khoản phong tỏa, khoản khoanh giữ (Hold) và chuyển tiền hai chiều trên kiến trúc Hexagonal.",
      steps: [
        "Bước 1: Tạo một lớp giả lập InMemoryAccountAdapter implements AccountPort chỉ dài 12 dòng dùng Map<String, Account> lưu trên RAM.",
        "Bước 2: Tạo Tài khoản A có ledgerBalance = 10.000.000 VND nhưng đang bị tạm giữ holdAmount = 4.000.000 VND (số dư khả dụng thực tế chỉ còn 6.000.000 VND), và Tài khoản B có 0 VND.",
        "Bước 3: Gọi TransferMoneyService.transfer() chuyển 7.000.000 VND từ A sang B -> xác nhận ném ngay IllegalStateException vì vượt số dư khả dụng (dù số dư sổ cái 10 triệu > 7 triệu!).",
        "Bước 4: Thử đặt trạng thái Tài khoản A sang Status.FROZEN_BY_LEGAL rồi rút 1.000.000 VND (xác nhận bị chặn đứng), sau đó thử chuyển 2.000.000 VND từ B vào A (xác nhận ghi Có vẫn thành công hợp lệ) và đo thời gian chạy toàn bộ test suite."
      ],
      expectedOutput: "Toàn bộ 4 kịch bản nghiệp vụ hóc búa chạy xanh 100% chỉ trong ~12 mili-giây mà không cần khởi động bất kỳ container hay cơ sở dữ liệu nào; tổng số dư A + B trước và sau mọi giao dịch hợp lệ luôn được bảo toàn tuyệt đối."
    },
    examTips: [
      "Khi hội đồng phỏng vấn hỏi 'Làm thế nào để ngăn đội ngũ 30 lập trình viên không phá vỡ kiến trúc Clean/Hexagonal theo thời gian?': Hãy nêu ngay giải pháp dùng ArchUnit viết bài kiểm tra tự động trong pipeline CI/CD cấm package domain phụ thuộc vào infrastructure/framework, kết hợp đóng kín setter trên Domain Aggregate.",
      "Đừng tỏ ra giáo điều (Over-engineering): Chủ động nói với người phỏng vấn rằng bạn áp dụng Hexagonal + Rich DDD cho các Bounded Context lõi phức tạp (Core Ledger, Payment, Loan), còn với các microservice CRUD cấu hình đơn giản thì kiến trúc 3 tầng gọn gàng vẫn hiệu quả về chi phí phát triển.",
      "Ghi nhớ công thức phân biệt Ledger Balance (Số dư sổ cái) và Available Balance (Số dư khả dụng = Ledger Balance - Hold Amount + Overdraft Limit) khi thiết kế phương thức debit() trên bảng trắng vòng System Design / OOP Design."
    ],
    summaryTakeaways: [
      "Loại bỏ Anemic Domain Model mở toang setter ở các phân hệ tiền tệ; hãy đóng gói mọi bất biến (phong tỏa, số dư khả dụng, hạn mức) vào bên trong Rich Domain Aggregate Root.",
      "Kiến trúc Hexagonal dùng Inbound Ports (UseCase) và Outbound Ports (Repository/Gateway interfaces nằm ở lõi) để đảo ngược sự phụ thuộc, giữ cho Domain thuần Java 100%.",
      "Mỗi Bounded Context trong ngân hàng (Sổ cái, Thẻ, Rủi ro, CRM) sở hữu mô hình miền riêng biệt và giao tiếp qua hợp đồng rõ ràng kèm lớp dịch Anti-Corruption Layer.",
      "Sử dụng ArchUnit trong CI/CD để tự động hóa việc kiểm soát ranh giới kiến trúc và kết hợp sắp xếp thứ tự khóa tài khoản trong UseCase để triệt tiêu Deadlock."
    ],
    lessonQuestions: [
      {
        question: "Trong buổi Review kiến trúc dịch vụ Sổ cái Core Banking theo mô hình Hexagonal (Ports & Adapters), một lập trình viên đặt annotation @Entity, @Table của Jakarta Persistence (JPA) và inject trực tiếp KafkaTemplate vào bên trong class miền cốt lõi vn.bank.ledger.domain.Account. Vi phạm kiến trúc nghiêm trọng nhất ở đây là gì?",
        options: [
          "Làm cho câu lệnh biên dịch javac chạy chậm hơn 10%",
          "Phá vỡ Nguyên lý Đảo ngược Phụ thuộc (DIP) và tính độc lập của Domain Core: biến trái tim nghiệp vụ thành con tin của cơ sở dữ liệu quan hệ và hạ tầng Kafka, khiến không thể viết Unit Test thuần túy nhanh gọn và rò rỉ chi tiết kỹ thuật hạ tầng vào quy tắc kế toán",
          "Java 21 không cho phép dùng @Entity cùng với các phương thức nghiệp vụ debit() và credit()",
          "KafkaTemplate bắt buộc chỉ được phép đặt trong tầng Controller"
        ],
        answer: 1,
        explanation: "Quy tắc tối thượng của Clean / Hexagonal Architecture là các vòng bên trong (Domain) không được biết bất cứ điều gì về các vòng bên ngoài (Database ORM, Message Broker, Web Framework). Việc gắn chặt JPA và KafkaTemplate trực tiếp vào class Domain Account phá hỏng ranh giới cách ly, buộc mọi bài kiểm thử nghiệp vụ nhỏ nhất cũng phải kéo theo hạ tầng nặng nề. Giao tiếp với DB và Kafka phải thực hiện ở tầng Driven Adapter thông qua Outbound Ports.",
        wrongReasons: [
          "Sai vì vấn đề cốt lõi nằm ở sự phụ thuộc kiến trúc, khả năng kiểm thử và bảo trì dài hạn chứ không phải tốc độ chạy javac.",
          "",
          "Sai vì về mặt cú pháp Java/JPA hoàn toàn cho phép viết thêm phương thức nghiệp vụ trong class @Entity, nhưng trộn cả hạ tầng Kafka vào Domain là vi phạm nặng nguyên tắc Hexagonal.",
          "Sai vì đặt KafkaTemplate thẳng trong tầng Web Controller còn sai lệch trách nhiệm nghiêm trọng hơn; nó phải nằm ở tầng Outbound Messaging Adapter (hoặc Outbox Relay)."
        ]
      },
      {
        question: "Tại sao trong thiết kế Rich Domain Model cho Tài khoản Ngân hàng (Account Aggregate), các Kiến trúc sư cấm tuyệt đối việc mở phương thức public void setBalance(BigDecimal newBalance) mà bắt buộc mọi luồng phải gọi qua các hành vi như debit(Money), credit(Money), placeHold(Money)?",
        options: [
          "Vì từ khóa set trong Java tốn nhiều bộ nhớ Heap hơn các tên hàm khác",
          "Để trình biên dịch JIT tự động song song hóa các phép trừ tiền trên nhiều nhân CPU",
          "Để bảo vệ tính đóng gói và các bất biến tài chính (Invariants): đảm bảo không một dịch vụ nào bên ngoài có thể đi đường tắt sửa trực tiếp số dư mà bỏ qua các chốt kiểm tra bắt buộc như trạng thái phong tỏa pháp lý, cùng loại tiền tệ và kiểm tra số dư khả dụng sau khi trừ khoản khoanh giữ",
          "Vì cơ sở dữ liệu PostgreSQL không cập nhật được cột số dư nếu class Java có hàm setBalance"
        ],
        answer: 2,
        explanation: "Nếu tồn tại hàm setBalance() công khai, bất kỳ lập trình viên nào ở các tầng Service/Batch/Consumer khác nhau cũng có thể tự tính số dư mới bên ngoài rồi gán đè vào đối tượng, dẫn tới việc quên kiểm tra tài khoản đang bị phong tỏa, quên trừ khoản tiền đang khoanh giữ chờ thanh toán (Hold) hoặc cộng nhầm ngoại tệ. Đóng kín trạng thái và chỉ mở các phương thức hành vi nghiệp vụ trên Aggregate Root đảm bảo 100% quy tắc ngân hàng luôn được thực thi nhất quán ở một nơi duy nhất.",
        wrongReasons: [
          "Sai hoàn toàn vì tên gọi phương thức không làm tăng dung lượng bộ nhớ đối tượng trên Heap.",
          "Sai vì trình biên dịch JIT không hề tự động song song hóa nghiệp vụ dựa trên tên hàm debit/credit.",
          "",
          "Sai vì cơ chế lưu trữ xuống PostgreSQL hoàn toàn độc lập với việc class Domain có mở public setter hay không."
        ]
      }
    ]
  }
});
