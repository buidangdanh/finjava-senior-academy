window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  B1: {
    duration: "65 phút",
    difficulty: "Senior / Core Banking Domain",
    codeLang: "java",
    teacherIntro: "Chào em, chào mừng em bước vào Học phần B — phần kiến thức mà anh luôn gọi là 'vũ khí bí mật' phân định ranh giới giữa một lập trình viên CRUD thông thường và một Senior Software Engineer thực thụ trong ngành Ngân hàng - Fintech. Rất nhiều bạn giỏi Java, thuộc lòng Spring Boot nhưng khi vào vòng phỏng vấn Core Banking lại trượt ngay ở câu hỏi đầu tiên: 'Em thiết kế bảng chuyển tiền thế nào?'. Nếu em trả lời 'Em chạy 2 câu lệnh `UPDATE accounts SET balance = balance - 100` và `balance = balance + 100`', hội đồng phỏng vấn sẽ lắc đầu ngay lập tức! Trong thế giới ngân hàng hơn 500 năm qua kể từ thời Luca Pacioli ở Venice, tiền không tự sinh ra cũng không tự mất đi, và tuyệt đối không ai được phép xóa hay sửa đè lịch sử số dư. Hôm nay, anh sẽ truyền lại cho em toàn bộ tư duy thiết kế Sổ Cái Kế Toán Kép (`Double-Entry Bookkeeping Ledger`), hệ thống tài khoản `GL/CASA` và cơ chế khoanh giữ tiền `Hold / Available Balance` đúng chuẩn Core Banking T24/Flexcube và Digital Core hiện đại.",
    analogy: {
      title: "Cuốn sổ mực tàu niêm phong của Thầy Đồ giữ kho ngân khố",
      body: "Em hãy hình dung kho bạc triều đình có một vị Thầy Đồ giữ sổ cái viết bằng mực tàu không thể tẩy xóa. Mỗi khi xuất 100 lượng bạc từ Kho Tổng phát lương cho Quan Huyện, Thầy Đồ không bao giờ lấy cục tẩy xóa con số cũ của Kho Tổng đi viết số mới. Thay vào đó, ông lập một Chứng từ (`Journal Entry`) đóng dấu đỏ gồm ít nhất hai dòng đối ứng: một dòng ghi 'Kho Tổng xuất ra 100 lượng', một dòng ghi 'Túi Quan Huyện nhận vào 100 lượng'. Nếu lỡ tay ghi nhầm 100 thành 1.000, ông cũng tuyệt đối không xé trang giấy đó (vì xé giấy là tội tham ô!), mà phải viết tiếp một Chứng từ Đảo (`Reversal Journal`) ngược chiều 1.000 lượng rồi lập chứng từ đúng 100 lượng. Và nếu Hoàng Thượng mới ký chiếu chỉ 'tạm phong tỏa 30 lượng trong túi Quan Huyện chờ xét xử', thì trên sổ sách Quan Huyện vẫn có 100 lượng (`Ledger Balance`), nhưng số bạc ông ấy thực sự được rút ra tiêu xài lúc này chỉ còn 70 lượng (`Available Balance`)."
    },
    objectives: [
      "Hiểu tận gốc nguyên lý Kế toán Kép (`Double-Entry Bookkeeping`), bản chất ngược chiều thú vị của tài khoản `CASA` (Nợ phải trả của Ngân hàng) so với tài khoản Tài sản (`Asset GL`) và bất biến `Tổng Nợ (Debit) = Tổng Có (Credit)`.",
      "Thiết kế được mô hình cơ sở dữ liệu Sổ cái bất biến (`Append-Only Immutable Ledger`) gồm `accounts`, `journal_entries`, `ledger_postings` và `balance_holds` xử lý trọn vẹn giao dịch chuyển tiền có thu phí + thuế VAT.",
      "Phân biệt rạch ròi 3 khái niệm số dư sống còn: `Ledger Balance` (Số dư sổ cái), `Available Balance` (Số dư khả dụng) và `Held/Blocked Amount` (Số tiền khoanh giữ) trong các luồng thanh toán bất đồng bộ."
    ],
    flow: [
      {
        step: "1. Authorization & Hold (Kiểm tra khả dụng & Khoanh giữ tiền)",
        detail: "Trước khi gọi ra ngoài hoặc chờ duyệt, hệ thống khóa dòng tài khoản nguồn, kiểm tra `Available Balance >= Tổng tiền + Phí + VAT`, sau đó tạo bản ghi `balance_holds` để trừ ngay `Available Balance` trong khi `Ledger Balance` chưa đổi."
      },
      {
        step: "2. Balanced Journal Construction (Lập Chứng từ Kế toán Kép)",
        detail: "Domain Service gom toàn bộ các chân hạch toán (`Posting Lines`): trích tiền gốc + phí + VAT từ CASA người gửi, ghi nhận tiền gốc cho người nhận (hoặc tài khoản Thanh toán Liên ngân hàng `Nostro/Clearing GL`), ghi nhận Doanh thu phí và Thuế VAT phải nộp."
      },
      {
        step: "3. Invariant Verification & Append-Only Commit (Kiểm chứng bất biến & Ghi sổ)",
        detail: "Kiểm tra nghiêm ngặt `SUM(DEBIT) == SUM(CREDIT)` theo từng loại tiền tệ (`currency`), chỉ cho phép `INSERT` vào `journal_entries` + `ledger_postings` và giải tỏa `Hold` thành quyết toán chính thức trong cùng một DB Transaction."
      },
      {
        step: "4. Snapshot & Reconciliation Audit (Cập nhật số dư tức thời & Kiểm toán)",
        detail: "Cập nhật `ledger_balance` trên bảng `accounts` kèm `balance_after` trên từng dòng posting để vừa đọc sao kê dưới 5ms vừa đảm bảo đối chiếu lại từ đầu kỳ `SUM(postings) == current_balance` khớp 100% đến từng đồng."
      }
    ],
    sections: [
      {
        heading: "1. Giải mã Hệ thống Tài khoản Ngân hàng (Chart of Accounts: GL vs CASA) & Cú lừa Debit/Credit",
        paragraphs: [
          "Điều đầu tiên khiến 90% lập trình viên mới bước chân vào ngân hàng bị 'xoắn não' chính là chiều tăng giảm của `Debit` (Ghi Nợ) và `Credit` (Ghi Có). Khi em nhận lương và điện thoại báo 'Tài khoản vừa được Ghi Có +25.000.000 VNĐ' (Credit Advice), tại sao cộng tiền lại gọi là Ghi Có còn trừ tiền thẻ ghi nợ lại gọi là `Debit Card`? Câu trả lời nằm ở góc nhìn của Bảng Cân Đối Kế Toán Ngân Hàng (`Bank Balance Sheet`): Sổ cái Core Banking là sổ kế toán CỦA NGÂN HÀNG, không phải sổ cá nhân của khách! Tiền khách hàng gửi vào tài khoản thanh toán không kỳ hạn (`CASA - Current Account Savings Account`) thực chất là khoản **Nợ Phải Trả (`Liability`)** mà ngân hàng đang nợ khách hàng và phải trả lại bất cứ lúc nào khách rút.",
          "Theo phương trình kế toán gốc `Tài sản (Assets) + Chi phí (Expenses) = Nợ phải trả (Liabilities) + Vốn chủ sở hữu (Equity) + Doanh thu (Revenue)`, hai vế của phương trình vận động ngược chiều nhau. Với nhóm bên trái (`Asset / Expense` — ví dụ: Tiền mặt tại quỹ `Cash Vault GL`, Tiền gửi của ngân hàng ta tại NHNN `Nostro GL`, Khoản cho vay khách hàng `Loan Receivable`), **Ghi Nợ (`DEBIT`) là TĂNG, Ghi Có (`CREDIT`) là GIẢM**. Ngược lại hoàn toàn, với nhóm bên phải (`Liability / Equity / Revenue` — ví dụ: Tài khoản khách hàng `CASA`, Tài khoản Thuế VAT phải nộp, Tài khoản Thu phí dịch vụ `Fee Income GL`), **Ghi Có (`CREDIT`) là TĂNG số dư, còn Ghi Nợ (`DEBIT`) là GIẢM số dư**!",
          "Nhờ quy luật đối xứng tuyệt đẹp này, mọi nghiệp vụ tài chính phức tạp đến đâu cũng quy về một tập các dòng `Posting` mà tổng `DEBIT` luôn bằng tổng `CREDIT` không lệch một xu. Ví dụ: Khách hàng A nộp 10.000.000đ tiền mặt tại quầy vào tài khoản CASA của mình -> Ngân hàng `DEBIT Cash Vault GL` 10.000.000đ (Tài sản tiền mặt trong két ngân hàng tăng lên) và `CREDIT Customer A CASA` 10.000.000đ (Nghĩa vụ nợ của ngân hàng với khách A tăng lên). Còn khi Khách A chuyển nội bộ 1.000.000đ cho Khách B, chịu phí 1.000đ và VAT 100đ -> `DEBIT CASA A` 1.001.100đ (giảm số dư A), đối ứng với 3 dòng: `CREDIT CASA B` 1.000.000đ, `CREDIT Fee Income GL` 1.000đ, và `CREDIT VAT Payable GL` 100đ. Tổng Nợ = 1.001.100đ, Tổng Có = 1.001.100đ — cân bằng tuyệt đối!"
        ],
        bullets: [
          "CASA Account (Sub-ledger): Tài khoản chi tiết của từng khách hàng cá nhân/doanh nghiệp, mang bản chất `LIABILITY` (dư Có bình thường; chỉ dư Nợ khi khách được cấp hạn mức Thấu chi `Overdraft`).",
          "General Ledger (GL - Sổ cái tổng hợp): Các tài khoản nội bộ cấp ngân hàng quản lý két tiền mặt, tài khoản thanh toán liên ngân hàng, doanh thu phí, dự phòng rủi ro, chi phí trả lãi; cuối ngày toàn bộ biến động CASA đều được kết chuyển tổng hợp lên GL.",
          "Multi-Currency Isolation: Bất biến `SUM(DEBIT) == SUM(CREDIT)` bắt buộc phải cân bằng riêng rẽ trên từng loại tiền tệ (`VND`, `USD`, `EUR`); nếu giao dịch mua bán ngoại tệ (`FX Spot`), hệ thống phải đi qua cặp tài khoản trung gian Vị thế Ngoại tệ (`FX Position GL`) cho từng đồng tiền."
        ]
      },
      {
        heading: "2. Thiết kế Schema Sổ cái Bất biến (Immutable Append-Only Ledger) Chịu Kiểm toán Độc lập",
        paragraphs: [
          "Trong kiến trúc Core Banking chuẩn mực, bảng lưu bút toán tuyệt đối tuân theo triết lý `Append-Only` (chỉ thêm mới, cấm sửa, cấm xóa). Trên PostgreSQL hoặc Oracle Production, tài khoản database của ứng dụng (`app_core_user`) thậm chí chỉ được cấp quyền `SELECT, INSERT` trên hai bảng `journal_entries` và `ledger_postings`, hoàn toàn bị thu hồi quyền `UPDATE` và `DELETE`! Bất kỳ lập trình viên nào viết code sửa số tiền của một giao dịch hôm qua đều sẽ bị Database từ chối thẳng thừng ngay ở tầng phân quyền.",
          "Mô hình chuẩn luôn tách làm 2 tầng gắn kết chặt chẽ: Bảng cha `journal_entries` (Chứng từ/Nhật ký chung) lưu ngữ cảnh nghiệp vụ như `journal_id`, `idempotency_key` (chống hạch toán trùng), `txn_type` (`IBFT_OUT`, `INTERNAL_TRANSFER`, `REVERSAL`), `reference_journal_id` (trỏ về chứng từ gốc nếu là bút toán đảo), `booking_date` (ngày hạch toán kế toán) và `value_date` (ngày tính lãi). Bảng con `ledger_postings` lưu từng chân Nợ/Có nguyên tử gồm `posting_id`, `journal_id`, `account_id`, `entry_side` (`DEBIT`/`CREDIT`), `amount` (luôn lưu số dương `> 0` kiểu `NUMERIC(19, 4)`), và `balance_after` (số dư lũy kế của tài khoản đó ngay sau khoảnh khắc hạch toán).",
          "Một câu hỏi phỏng vấn Senior cực hay: 'Nếu đã có `ledger_postings` thì có nên bỏ luôn cột `ledger_balance` trên bảng `accounts` và mỗi lần khách mở app thì chạy `SELECT SUM(...)` không?'. Tuyệt đối KHÔNG! Một tài khoản doanh nghiệp thu hộ siêu thị có thể phát sinh 5 triệu dòng posting mỗi tháng; chạy `SUM()` mỗi lần mở app sẽ đánh sập CPU Database ngay. Thiết kế chuẩn Production là **Hybrid Materialized Balance**: bảng `accounts` vẫn giữ cột `ledger_balance`, `held_amount` và `version` để kiểm tra số dư và khóa dòng trong 0.5ms, nhưng MỌI thao tác thay đổi `ledger_balance` chỉ được phép đi qua hàm cốt lõi duy nhất `postJournal()` vừa chèn `ledger_postings` vừa cộng/trừ `ledger_balance` nguyên tử trong một `@Transactional`."
        ],
        bullets: [
          "Booking Date vs Value Date: Giao dịch thực hiện lúc 23:55 sau giờ Cut-off kế toán có thể mang `created_at` ngày hôm nay, `booking_date` sang ngày làm việc kế tiếp, còn `value_date` quyết định ngày bắt đầu tính lãi tiền gửi/tiền vay.",
          "Reversal vs Adjustment: Khi hủy giao dịch lỗi, hệ thống sinh một `Journal` mới có `reference_journal_id` trỏ về `Journal` cũ và đảo ngược toàn bộ chiều `DEBIT <-> CREDIT` với đúng số tiền cũ để dấu vết kiểm toán minh bạch 100%.",
          "Database Check Constraints: Luôn cài đặt chốt chặn cứng dưới DB như `CHECK (amount > 0)` trên `ledger_postings` và `CHECK (ledger_balance - held_amount >= -overdraft_limit)` trên `accounts` làm lưới bảo vệ cuối cùng."
        ]
      },
      {
        heading: "3. Ledger Balance vs Available Balance: Nghệ thuật Khoanh giữ tiền (Hold / Earmark / Capture / Release)",
        paragraphs: [
          "Giả sử khách hàng có 5.000.000đ trong tài khoản, quẹt thẻ thanh toán phòng khách sạn hoặc chuyển khoản liên ngân hàng 2.000.000đ nhưng cổng đối tác đang xử lý mất 8 giây (hoặc khách sạn chỉ tạm khóa cọc thẻ 3 ngày). Nếu em trừ thẳng `Ledger Balance` ngay khi chưa chắc chắn giao dịch thành công, nhỡ đối tác từ chối em lại phải sinh bút toán hoàn tiền làm bẩn sao kê của khách và lệch báo cáo kế toán cuối ngày. Nhưng nếu em KHÔNG trừ gì cả mà đợi đối tác trả lời mới trừ, trong 8 giây đó kẻ gian sẽ mở 5 tab rút tiền ATM hoặc chuyển khoản sạch 5.000.000đ đi nơi khác — dẫn đến thảm họa chi vượt số dư (`Double Spending`)!",
          "Giải pháp tiêu chuẩn của mọi Core Banking toàn cầu là tách bạch `Ledger Balance` (Số dư thực tế đang nằm trong sổ kế toán) và `Available Balance` (Số dư khả dụng khách được phép tiêu), nối với nhau qua công thức vàng: `Available Balance = Ledger Balance + Overdraft Limit - Held Amount - Minimum Balance`. Khi bắt đầu một giao dịch nhiều bước (như Saga chuyển tiền liên ngân hàng, đặt lệnh mua chứng khoán, pre-auth thẻ), bước 1 hệ thống chỉ tạo một lệnh **Khoanh giữ (`Hold` / `Earmark`)** trị giá 2.000.000đ gắn `hold_id` và thời hạn hết hạn `expires_at`.",
          "Ngay lập tức, `Held Amount` tăng thêm 2.000.000đ khiến `Available Balance` tụt từ 5.000.000đ xuống 3.000.000đ — chặn đứng mọi nỗ lực rút đúp ở các kênh khác, trong khi `Ledger Balance` vẫn nguyên vẹn 5.000.000đ để tính lãi cuối ngày bình thường. Khi đối tác xác nhận thành công, hệ thống thực hiện **Capture (`Settle Hold`)**: chuyển trạng thái `Hold` sang `CAPTURED`, giảm `Held Amount` 2.000.000đ đồng thời ghi bút toán `DEBIT CASA` giảm `Ledger Balance` xuống 3.000.000đ (`Available Balance` giữ nguyên 3.000.000đ không bị giật cục). Nếu đối tác báo từ chối rõ ràng, hệ thống thực hiện **Release (`Void Hold`)**: chuyển `Hold` sang `RELEASED`, trả lại ngay 2.000.000đ vào `Available Balance` êm ái mà không làm phát sinh dòng rác nào trên sao kê khách hàng!"
        ],
        bullets: [
          "Idempotent Hold Lifecycle: Bảng `balance_holds` quản lý máy trạng thái chặt chẽ `ACTIVE -> CAPTURED | RELEASED | EXPIRED`; một `hold_id` đã `CAPTURED` hoặc `RELEASED` tuyệt đối không thể bị giải tỏa lần hai (tránh lỗi cộng trả thừa `Available Balance`!).",
          "Partial Capture (Thu một phần): Trong nghiệp vụ thẻ khách sạn/xăng dầu tự động, khách có thể bị `Hold` 2.000.000đ nhưng lúc trả phòng chỉ `Capture` thực tế 1.650.000đ và tự động `Release` 350.000đ còn dư.",
          "Orphan Hold Sweeper: Mọi bản ghi `Hold` thanh toán nhanh đều phải có `expires_at` để tiến trình đối soát kiểm tra trước khi tự động giải tỏa, tránh treo vốn của khách hàng vô thời hạn nếu một microservice chết giữa chừng."
        ]
      }
    ],
    comparison: {
      title: "Đối chiếu Thiết kế Ví Nghiệp dư vs Sổ Cái Kế Toán Kép Core Banking Chuẩn Production",
      headers: ["Tiêu chí kiến trúc", "Mô hình Cột Balance Đơn giản (Anti-pattern)", "Sổ Cái Đơn (Single-Entry Log)", "Sổ Cái Kế Toán Kép + Hold (Core Banking)"],
      rows: [
        [
          "Cách thay đổi số dư",
          "Chạy `UPDATE accounts SET balance = ?` ghi đè trực tiếp giá trị cũ",
          "Ghi lịch sử cộng/trừ từng tài khoản rời rạc, không có tài khoản đối ứng bắt buộc",
          "Mọi biến động phải đi qua `Journal` có >= 2 dòng `Postings` đảm bảo `SUM(Debit) == SUM(Credit)`"
        ],
        [
          "Khả năng phát hiện lỗi rò rỉ tiền",
          "Bằng 0 — nếu bug code cộng thừa 1 phía, không có phương trình nào tự phát hiện",
          "Thấp — khó biết tiền đi từ đâu về đâu khi hạch toán phí, thuế, tỷ giá phức tạp",
          "Tuyệt đối — bảng cân đối thử (`Trial Balance`) lệch dù 1 đồng sẽ báo động đỏ tức thì"
        ],
        [
          "Xử lý giao dịch chờ kết quả đối tác",
          "Hoặc trừ thật sớm (dễ phải hoàn rác sao kê), hoặc trừ muộn (bị rút âm tiền)",
          "Thường dùng cột `status = PENDING` chắp vá, rất dễ sai số dư khi hủy lệnh",
          "Cơ chế `Hold / Available Balance` tách biệt hoàn toàn khoanh giữ tạm thời và quyết toán sổ cái"
        ],
        [
          "Đáp ứng kiểm toán NHNN & Big4",
          "Trượt ngay lập tức vì vi phạm tính bất biến và khả năng truy vết kế toán",
          "Chỉ tạm chấp nhận cho điểm thưởng tích lũy (Loyalty Points) nội bộ nhỏ lẻ",
          "Tiêu chuẩn bắt buộc cho Core Banking, Ví điện tử, Cổng thanh toán và Sàn giao dịch tài sản"
        ]
      ]
    },
    codeTitle: "Java 21 Core Ledger Domain: Kiểm chứng Bất biến Kế toán Kép (Phí + VAT) & Available Balance",
    code: [
      "package vn.finjava.core.ledger;",
      "",
      "import java.math.BigDecimal;",
      "import java.util.List;",
      "import java.util.Objects;",
      "",
      "public final class DoubleEntryLedgerEngine {",
      "    public enum EntrySide { DEBIT, CREDIT }",
      "    public enum AccountNature { ASSET_EXPENSE, LIABILITY_EQUITY_REVENUE }",
      "",
      "    public record PostingLine(String accountNo, AccountNature nature, EntrySide side, BigDecimal amount) {",
      "        public PostingLine {",
      "            Objects.requireNonNull(accountNo, \"accountNo must not be null\");",
      "            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {",
      "                throw new IllegalArgumentException(\"Posting amount must be strictly positive: \" + amount);",
      "            }",
      "        }",
      "        public BigDecimal signedDelta() {",
      "            boolean isIncrease = (nature == AccountNature.ASSET_EXPENSE && side == EntrySide.DEBIT)",
      "                    || (nature == AccountNature.LIABILITY_EQUITY_REVENUE && side == EntrySide.CREDIT);",
      "            return isIncrease ? amount : amount.negate();",
      "        }",
      "    }",
      "",
      "    public record JournalVoucher(String journalId, String idempotencyKey, String currency, List<PostingLine> lines) {",
      "        public JournalVoucher {",
      "            lines = List.copyOf(lines);",
      "            if (lines.size() < 2) throw new IllegalStateException(\"Double-entry requires at least 2 lines\");",
      "            BigDecimal totalDebit = sumSide(lines, EntrySide.DEBIT);",
      "            BigDecimal totalCredit = sumSide(lines, EntrySide.CREDIT);",
      "            if (totalDebit.compareTo(totalCredit) != 0) {",
      "                throw new IllegalStateException(\"Unbalanced journal \" + journalId",
      "                        + \": debit=\" + totalDebit + \" != credit=\" + totalCredit);",
      "            }",
      "        }",
      "        private static BigDecimal sumSide(List<PostingLine> lines, EntrySide target) {",
      "            return lines.stream().filter(l -> l.side() == target)",
      "                    .map(PostingLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);",
      "        }",
      "    }",
      "",
      "    public static BigDecimal availableBalance(BigDecimal ledgerBal, BigDecimal heldAmt, BigDecimal minBal) {",
      "        return ledgerBal.subtract(heldAmt).subtract(minBal);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Compact Constructor của Java 21 `record JournalVoucher`: Đóng vai trò hàng rào bảo vệ Domain Invariant ngay lúc khởi tạo đối tượng — dùng `List.copyOf(lines)` để bất biến hóa danh sách và dùng `compareTo(...) != 0` (thay vì `equals`) để đảm bảo `1000.00` cân bằng chuẩn xác với `1000`.",
      "Hàm `signedDelta()` thể hiện đúng bản chất kế toán ngân hàng: Cùng là lệnh `DEBIT`, nếu đánh vào tài khoản `ASSET_EXPENSE` (như két tiền mặt, tài khoản Nostro) thì số dư tăng (`+amount`), nhưng nếu đánh vào `LIABILITY_EQUITY_REVENUE` (như tài khoản `CASA` của khách hàng) thì số dư giảm (`-amount`).",
      "Ràng buộc `amount > 0` trên mọi `PostingLine`: Trong Core Banking, tuyệt đối không lưu số âm trong cột `amount` của bảng sổ cái; chiều tăng/giảm phải do sự kết hợp giữa `EntrySide` (`DEBIT`/`CREDIT`) và `AccountNature` quyết định nhằm tránh nhầm lẫn dấu kép (`-(-100)`).",
      "Công thức `availableBalance`: Luôn trừ đi cả `heldAmt` (tiền đang khoanh giữ chờ đối tác quyết toán) lẫn `minBal` (số dư tối thiểu duy trì tài khoản nếu có) trước khi quyết định duyệt giao dịch mới."
    ],
    labGuide: {
      goal: "Tự tay cài đặt mô hình Sổ cái Kế toán Kép trên Java 21 + PostgreSQL, thực hiện trọn vẹn kịch bản Hold -> Capture chuyển tiền có thu phí 1.000đ + VAT 100đ và chứng minh tổng tiền toàn hệ thống bất biến dưới tải đa luồng.",
      steps: [
        "Bước 1: Tạo 4 bảng chuẩn trên PostgreSQL bằng Flyway: `accounts` (gồm `account_no`, `nature`, `ledger_balance`, `held_amount`, `min_balance`, `version`), `balance_holds`, `journal_entries` (có `UNIQUE(idempotency_key)`) và `ledger_postings`.",
        "Bước 2: Mở 4 tài khoản mẫu: `CASA_ALICE` (Liability, số dư 5.000.000đ), `CASA_BOB` (Liability, 0đ), `GL_FEE_INCOME` (Revenue, 0đ), `GL_VAT_PAYABLE` (Liability, 0đ).",
        "Bước 3: Viết hàm `placeHold(accountNo, holdId, 1_001_100)` khóa `SELECT ... FOR UPDATE` dòng `CASA_ALICE`, xác nhận `availableBalance` giảm ngay xuống `3.998.900đ` trong khi `ledger_balance` vẫn là `5.000.000đ`.",
        "Bước 4: Viết hàm `captureHoldAndPostJournal` giải tỏa đúng `holdId` đó và ghi `JournalVoucher` 4 dòng (`DEBIT CASA_ALICE 1.001.100`, `CREDIT CASA_BOB 1.000.000`, `CREDIT GL_FEE_INCOME 1.000`, `CREDIT GL_VAT_PAYABLE 100`), sau đó viết JUnit kiểm tra tổng `DEBIT` toàn bảng `ledger_postings` bằng khít tổng `CREDIT`."
      ],
      expectedOutput: "Sau giao dịch, `CASA_ALICE` còn 3.998.900đ (held = 0), `CASA_BOB` có 1.000.000đ, `GL_FEE_INCOME` có 1.000đ, `GL_VAT_PAYABLE` có 100đ. Thử cố tình truyền lệch 1 đồng vào `JournalVoucher` lập tức ném `IllegalStateException: Unbalanced journal` và rollback 100%."
    },
    examTips: [
      "Câu hỏi phỏng vấn kinh điển 'Tài khoản tiền gửi thanh toán CASA của khách hàng ghi tăng ở bên Nợ hay bên Có?': Trả lời dứt khoát là **bên Có (`CREDIT`)**, vì trên bảng cân đối kế toán của ngân hàng, tiền gửi khách hàng là khoản **Nợ phải trả (`Liability`)** của ngân hàng đối với khách.",
      "Bẫy thiết kế khi hủy giao dịch đã hạch toán: Tuyệt đối KHÔNG trả lời 'Xóa dòng trong bảng postings' hay 'Sửa cột amount về 0'; đáp án chuẩn Senior luôn là **sinh một Chứng từ Đảo (`Reversal Journal`)** đối ứng ngược chiều `DEBIT <-> CREDIT` có tham chiếu tới `journal_id` gốc.",
      "Bẫy Double-Release Hold: Khi viết API `releaseHold(holdId)` do lỗi đối tác, bắt buộc cập nhật có điều kiện `UPDATE balance_holds SET status = 'RELEASED' WHERE hold_id = ? AND status = 'ACTIVE'`; chỉ khi số dòng cập nhật `== 1` mới được giảm `held_amount` trên bảng `accounts`!"
    ],
    summaryTakeaways: [
      "Kế toán Kép (`Double-Entry`) đảm bảo mọi đồng tiền dịch chuyển đều có nguồn và đích rõ ràng với bất biến vàng `SUM(DEBIT) == SUM(CREDIT)` theo từng loại tiền tệ.",
      "Tài khoản `CASA` của khách hàng mang bản chất `Liability` trên sổ ngân hàng: Ghi Có (`CREDIT`) làm tăng số dư khách, Ghi Nợ (`DEBIT`) làm giảm số dư khách.",
      "Sổ cái chuẩn kiểm toán phải tuân thủ nghiêm ngặt nguyên tắc `Append-Only` — sửa sai bằng bút toán đảo chiều (`Reversal`), không bao giờ `UPDATE/DELETE` lịch sử.",
      "Tách biệt `Ledger Balance` và `Available Balance` thông qua cơ chế `Hold -> Capture / Release` là chìa khóa chống chi vượt số dư trong mọi giao dịch phân tán."
    ],
    lessonQuestions: [
      {
        question: "Khách hàng X chuyển khoản 2.000.000 VNĐ từ tài khoản thanh toán (CASA) của mình sang tài khoản CASA của khách hàng Y cùng ngân hàng, chịu phí chuyển tiền 2.000 VNĐ và thuế GTGT (VAT) 200 VNĐ (phí ngoài). Bộ bút toán Kế toán Kép nào dưới đây được Core Banking sinh ra là CHÍNH XÁC nhất?",
        options: [
          "CREDIT CASA X: 2.002.200đ | DEBIT CASA Y: 2.000.000đ | DEBIT GL Doanh thu phí: 2.000đ | DEBIT GL Thuế VAT phải nộp: 200đ.",
          "DEBIT CASA X: 2.002.200đ | CREDIT CASA Y: 2.000.000đ | CREDIT GL Doanh thu phí: 2.000đ | CREDIT GL Thuế VAT phải nộp: 200đ.",
          "UPDATE trực tiếp balance của X giảm 2.002.200đ, balance của Y tăng 2.000.000đ, còn 2.200đ phí lưu vào file log cuối tháng mới cộng tổng.",
          "DEBIT CASA X: 2.000.000đ | CREDIT CASA Y: 1.997.800đ mà không cần hạch toán vào tài khoản GL doanh thu và thuế."
        ],
        answer: 1,
        explanation: "Trên sổ kế toán ngân hàng, CASA khách hàng (Liability), Doanh thu phí (Revenue) và Thuế VAT phải nộp nhà nước (Liability) đều thuộc nhóm tăng bên Có (CREDIT) và giảm bên Nợ (DEBIT). Do đó, trích tiền từ X là DEBIT CASA X 2.002.200đ; đối ứng tăng tiền cho Y (CREDIT 2.000.000đ), ghi nhận doanh thu phí (CREDIT 2.000đ) và nghĩa vụ thuế VAT (CREDIT 200đ). Tổng Debit = Tổng Credit = 2.002.200đ.",
        wrongReasons: [
          "Bị ngược chiều hoàn toàn bản chất tài khoản ngân hàng: CREDIT vào CASA X sẽ làm TĂNG tiền của người gửi thay vì trừ tiền!",
          "",
          "Vi phạm nghiêm trọng nguyên tắc bất biến của sổ cái và làm lệch bảng cân đối kế toán ngay trong ngày 2.200đ không có tài khoản đối ứng.",
          "Sai nghiệp vụ phí ngoài, thiếu bút toán ghi nhận doanh thu phí và thuế phải nộp, đồng thời Tổng Nợ (2.000.000đ) không bằng Tổng Có (1.997.800đ)."
        ]
      },
      {
        question: "Một tài khoản CASA đang có `Ledger Balance = 10.000.000đ`, `Minimum Balance = 50.000đ` và đang có một giao dịch thanh toán liên ngân hàng chờ kết quả đã khoanh giữ `Held Amount = 3.000.000đ`. Ngay lúc đó, khách hàng bấm rút 8.000.000đ tại cây ATM. Hệ thống xử lý đúng chuẩn sẽ phản ứng thế nào?",
        options: [
          "Cho phép rút thành công 8.000.000đ vì `Ledger Balance` hiện tại vẫn đang là 10.000.000đ lớn hơn 8.000.000đ.",
          "Tự động hủy luôn khoản khoanh giữ 3.000.000đ đang chờ kết quả liên ngân hàng để ưu tiên cho khách rút tiền mặt tại ATM.",
          "Từ chối giao dịch rút ATM với mã lỗi Không đủ số dư khả dụng (`Insufficient Available Funds`) vì `Available Balance` lúc này chỉ còn 6.950.000đ.",
          "Cho rút 8.000.000đ rồi để số dư tài khoản âm -1.050.000đ dù khách hàng không được cấp hạn mức thấu chi."
        ],
        answer: 2,
        explanation: "Số dư khả dụng được tính bằng `Ledger Balance (10.000.000) - Held Amount (3.000.000) - Minimum Balance (50.000) = 6.950.000đ`. Vì 6.950.000đ < 8.000.000đ yêu cầu rút, hệ thống bắt buộc từ chối để bảo vệ khoản 3.000.000đ đang chờ quyết toán liên ngân hàng, ngăn chặn triệt để rủi ro chi vượt số dư.",
        wrongReasons: [
          "Nếu duyệt theo Ledger Balance mà bỏ qua Held Amount, khi giao dịch liên ngân hàng 3 triệu báo thành công, tài khoản sẽ bị chi lố 1.050.000đ (mất tiền ngân hàng).",
          "Giao dịch liên ngân hàng đã gửi lệnh ra ngoài mạng chuyển mạch, tự ý hủy Hold nội bộ khi đối tác vẫn hạch toán thành công sẽ gây thất thoát tiền trực tiếp.",
          "",
          "Tài khoản thanh toán CASA không có hạn mức thấu chi tuyệt đối không được phép chi âm khả dụng."
        ]
      }
    ]
  },

  B2: {
    duration: "65 phút",
    difficulty: "Senior / Payment Switching & Messaging",
    codeLang: "java",
    teacherIntro: "Chào em, nếu em từng quẹt thẻ Visa/Mastercard/NAPAS tại máy POS siêu thị hay rút tiền ở cây ATM khác ngân hàng và thấy kết quả trả về chỉ trong chưa đầy 1,5 giây, thì đằng sau khoảnh khắc ấy không phải là JSON RESTful quen thuộc đâu, mà là một 'huyền thoại sống' của ngành tài chính thế giới: giao thức nhị phân `ISO 8583`! Ra đời từ năm 1987 thời đường truyền dial-up chỉ tính bằng từng byte, đến tận hôm nay `ISO 8583` vẫn đang gánh hàng chục tỷ giao dịch thẻ và chuyển mạch ATM/POS/IBFT mỗi ngày. Song song đó, làn sóng hiện đại hóa thanh toán xuyên biên giới (SWIFT CBPR+, FedNow, SEPA và định hướng chuẩn hóa liên ngân hàng mới) đang chuyển dịch mạnh mẽ sang `ISO 20022` giàu ngữ nghĩa. Một Senior Java làm Payment Hub hoặc Card System nắm vững cả cấu trúc Bitmap `ISO 8583`, luồng đảo tự động `0420 Reversal` lẫn cấu trúc `pacs.008 / camt.053` của `ISO 20022` luôn được săn đón với mức đãi ngộ hàng đầu thị trường!",
    analogy: {
      title: "Bức điện tín mật mã thời chiến so với Bộ hồ sơ hải quan điện tử chi tiết",
      body: "Em hãy tưởng tượng `ISO 8583` giống như bức điện tín quân sự siêu gọn thời xưa, nơi mỗi chữ cái đều tốn vàng: người gửi không hề viết chữ `'Số thẻ:'`, `'Số tiền:'` giống JSON vì quá tốn băng thông! Thay vào đó, đầu bức điện đính kèm một dải 64 bóng đèn bật/tắt (`Bitmap` 64-bit): nếu bóng đèn số 2, số 4 và số 11 sáng lên, người nhận tự khắc hiểu ngay sau dải đèn sẽ lần lượt là Số thẻ (`DE2`), Số tiền (`DE4`) và Số tra cứu (`DE11`) nối sát sạt vào nhau không thừa một dấu cách! Ngược lại, `ISO 20022` giống như bộ tờ khai hải quan điện tử chuẩn quốc tế hiện đại (XML/JSON Schema): dài hơn nhiều nhưng tách bạch rõ từng trường Địa chỉ người chuyển, Mã định danh pháp nhân `LEI`, Mục đích chuyển tiền chống rửa tiền mà bức điện tín chật chội năm 1987 không thể nhét vừa."
    },
    objectives: [
      "Giải phẫu chính xác cấu trúc gói tin `ISO 8583`: 4 chữ số `MTI` (`0100`, `0200`, `0210`, `0420`, `0800`), cơ chế giải mã `Primary & Secondary Bitmap` nhị phân (128 Data Elements) và các trường cốt tử `DE2`, `DE3`, `DE4`, `DE11 STAN`, `DE37 RRN`, `DE39`, `DE90`.",
      "Thiết kế được máy trạng thái xử lý lỗi Timeout (mã `DE39 = 68`) và cơ chế phát lệnh Đảo giao dịch tự động `0420 Reversal Advice` theo chuẩn `SAF (Store-and-Forward)` không bao giờ làm hụt tiền khách hàng.",
      "Hiểu rõ kiến trúc phân nhóm bản tin chuẩn `ISO 20022` (`pain.001`, `pacs.008`, `pacs.002`, `pacs.004`, `camt.053`) và chiến lược xây dựng tầng `Translation / Coexistence Layer` tránh mất mát dữ liệu (`Truncation`) khi chuyển đổi."
    ],
    flow: [
      {
        step: "1. Acquiring & ISO 8583 Packing (Đóng gói bản tin Tài chính 0200)",
        detail: "Máy ATM/POS hoặc Ngân hàng phát lệnh (`Acquirer`) sinh số `STAN (DE11)` và `RRN (DE37)`, mã hóa PIN bằng HSM vào `DE52`, bật các bit tương ứng trên `Bitmap` và gửi gói tin TCP persistent socket `MTI 0200` sang Tổ chức Chuyển mạch (`Switch` như NAPAS/Visa)."
      },
      {
        step: "2. Switching & Issuer Authorization (Định tuyến BIN & Phê duyệt 0210)",
        detail: "Tổ chức Chuyển mạch đọc 6–8 số đầu `BIN` của thẻ/tài khoản đích định tuyến gói tin tới Ngân hàng phát hành (`Issuer`). Core của Issuer kiểm tra hạn mức/PIN, hạch toán và trả lời gói `MTI 0210` kèm mã phản hồi `DE39` (`00` thành công, `51` thiếu tiền, `55` sai PIN)."
      },
      {
        step: "3. Timeout Detection & Auto-Reversal 0420 (Xử lý quá hạn & Đảo lệnh SAF)",
        detail: "Nếu quá SLA (ví dụ 15–30 giây) Acquirer không nhận được `0210` hoặc Switch trả `DE39 = 68` (Response received too late) hay máy ATM kẹt không nhả được tiền mặt, Acquirer đẩy bản tin `0420 Reversal Advice` (gắn `DE90` chứa thông tin lệnh gốc) vào hàng đợi `SAF` phát lại cho tới khi nhận `0430` xác nhận."
      },
      {
        step: "4. ISO 20022 Rich Clearing & Reporting (Thanh quyết toán & Sao kê chuẩn mới)",
        detail: "Với kênh thanh toán giá trị cao / doanh nghiệp / xuyên biên giới hiện đại, Payment Hub khởi tạo `pacs.008` (chuyển tiền liên ngân hàng), nhận trạng thái `pacs.002` và xuất sổ phụ cuối ngày `camt.053` cho hệ thống ERP đối soát tự động."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu chi tiết Gói tin ISO 8583: MTI, Binary Bitmap và các Data Elements Sống còn",
        paragraphs: [
          "Một gói tin `ISO 8583` truyền qua kết nối TCP Socket thường trực (`Persistent Socket` có gắn 2 byte độ dài `Big-Endian Length Header` ở đầu gói) gồm 3 phần nối liền nhau: `MTI (Message Type Indicator)` dài đúng 4 chữ số, `Bitmap` (8 hoặc 16 bytes nhị phân), và chuỗi `Data Elements (DE)` nối tiếp. Chỉ nhìn vào 4 chữ số `MTI`, một kỹ sư thẻ lão luyện đọc ra ngay toàn bộ ý nghĩa bản tin: Chữ số thứ 1 là Phiên bản chuẩn (`0` = ISO 8583:1987 phổ biến nhất, `1` = 1993, `2` = 2003); Chữ số thứ 2 là Nhóm bản tin (`1` = Authorization chỉ xin cấp phép khoanh giữ tiền như quẹt thẻ khách sạn, `2` = Financial trừ tiền thật ngay như rút ATM/IBFT, `4` = Reversal đảo giao dịch, `8` = Network Management kiểm tra đường truyền Echo/Sign-on); Chữ số thứ 3 là Chức năng (`0` = Request, `1` = Response, `2` = Advice thông báo bắt buộc nhận, `3` = Advice Response); Chữ số thứ 4 là Nguồn phát (`0` = Acquirer, `1` = Acquirer Repeat gửi lặp lại).",
          "Ngay sau `MTI` là trái tim của giao thức: `Primary Bitmap` gồm 8 bytes (64 bits, đánh số từ Bit 1 ngoài cùng bên trái `MSB` đến Bit 64). Quy tắc cực kỳ thông minh: **Bit thứ 1** không mang dữ liệu nghiệp vụ, mà là cờ báo hiệu sự tồn tại của `Secondary Bitmap`! Nếu Bit 1 = `0`, gói tin chỉ dùng các trường từ `DE2` đến `DE64`; nếu Bit 1 = `1`, ngay sau 8 bytes đầu sẽ có thêm 8 bytes `Secondary Bitmap` mở rộng tầm phủ lên từ `DE65` đến `DE128` (ví dụ `DE90 Original Data Elements`, `DE102/DE103 From/To Account` trong chuyển khoản IBFT, `DE128 MAC` kiểm tra toàn vẹn gói tin).",
          "Khi đọc từng `Data Element`, trình phân tích (`Packager` như thư viện `jPOS` nổi tiếng trong Java) phải nắm chính xác định dạng độ dài của từng trường theo tài liệu đặc tả của mạng chuyển mạch: trường độ dài cố định (`Fixed`, ví dụ `DE3` 6 ký tự, `DE4` 12 chữ số thêm số 0 ở đầu không có dấu chấm thập phân, `DE11` 6 số, `DE39` 2 ký tự) hay trường độ dài biến thiên có tiền tố báo độ dài (`LLVAR` 2 chữ số độ dài tối đa 99 ký tự như `DE2 PAN` số thẻ `164532...`, `LLLVAR` 3 chữ số độ dài tối đa 999 ký tự như `DE48` dữ liệu bổ sung). Chỉ cần lệch cấu hình 1 byte giữa `Fixed` và `LLVAR` ở `DE32`, toàn bộ các trường phía sau sẽ bị đọc trượt vị trí (`Offset Shift`) hỏng sạch gói tin!"
        ],
        bullets: [
          "Bộ tứ định danh duy nhất một giao dịch thẻ: Trong thực tế vận hành, `DE11 (STAN - Systems Trace Audit Number)` chỉ có 6 chữ số (000001..999999) nên sẽ quay vòng rất nhanh ở hệ thống lớn; khóa đối chiếu duy nhất luôn phải ghép tổ hợp `Acquirer BIN (DE32) + Terminal ID (DE41) + Transmission DateTime (DE7) + STAN (DE11)` hoặc dùng `DE37 (RRN - 12 ký tự)`.",
          "Bảng mã DE39 phải thuộc nằm lòng: `00` = Thành công; `05` = Do not honor (Từ chối chung); `14` = Số thẻ/tài khoản không hợp lệ; `51` = Không đủ số dư; `54` = Thẻ hết hạn; `55` = Sai mã PIN; `61` = Vượt hạn mức rút tiền; `68` = Phản hồi quá trễ (Timeout); `91` = Ngân hàng phát hành đang ngắt kết nối (`Issuer inoperative`); `96` = Lỗi hệ thống.",
          "Duy trì đường truyền 0800/0810: Cổng kết nối `ISO 8583` luôn có luồng chạy ngầm định kỳ mỗi 30–60 giây bắn gói `MTI 0800` (`DE70 = 301` Echo Test, `001` Sign-on, `002` Sign-off); nếu lỡ 3 nhịp không thấy `0810`, hệ thống tự động đánh dấu kênh `DOWN` và chuyển tải sang kết nối dự phòng."
        ]
      },
      {
        heading: "2. Luồng Đảo giao dịch 0420/0421 (Auto-Reversal & Store-and-Forward) — Chốt chặn sinh tử tại ATM/POS",
        paragraphs: [
          "Hãy xét một tình huống thực tế xảy ra hàng ngày trên toàn quốc: Khách hàng đút thẻ ngân hàng B vào cây ATM của ngân hàng A rút 5.000.000đ. ATM gửi `0200` qua chuyển mạch sang ngân hàng B; ngân hàng B đã trừ 5.000.000đ của khách và gửi trả `0210 (DE39=00)`, NHƯNG đúng giây thứ 29 đường cáp quang chập chờn khiến gói `0210` về tới ATM quá muộn (hoặc tệ hơn: `0210` về kịp nhưng hộc đếm tiền cơ khí của cây ATM bị kẹt tờ tiền rách nên không mở cửa nhả tiền cho khách!). Khách hàng tay trắng đứng nhìn màn hình báo lỗi mà điện thoại lại ting ting trừ 5.000.000đ!",
          "Trong giao thức thẻ `ISO 8583` rút tiền mặt ATM và mua hàng POS, chuẩn quốc tế quy định cơ chế tự chữa lành tức thì bằng bản tin **`0420` (Acquirer Financial Transaction Reversal Advice)**. Ngay khi Acquirer (ngân hàng chủ quản ATM/POS) xác định giao dịch không hoàn tất ở đầu cuối thiết bị (do Timeout nhận kết quả hoặc lỗi phần cứng `Cash Dispense Failure`), Acquirer lập tức khởi tạo bản tin `0420` giữ nguyên `DE2`, `DE3`, `DE4` (hoặc số tiền kẹt một phần ở `DE95 Replacement Amounts`), đặc biệt đính kèm trường **`DE90 (Original Data Elements)`** dài 42 chữ số ghép từ `Original MTI (0200) + Original STAN (DE11) + Original DateTime (DE7) + Original Acquiring BIN + Forwarding BIN` để ngân hàng phát hành tìm chính xác bút toán gốc mà hoàn tiền.",
          "Điểm tinh tế bậc thầy của kiến trúc này nằm ở hàng đợi **`SAF (Store-and-Forward)`**: Nếu lúc gửi `0420` mà mạng sang ngân hàng phát hành vẫn đang đứt thì sao? Acquirer lưu bền vững lệnh đảo đó xuống đĩa/DB và phát lặp lại với `MTI 0421` (`Reversal Advice Repeat` — chú ý số cuối là `1` báo hiệu bản tin gửi lặp để bên nhận xử lý lũy đẳng `Idempotent` không bao giờ hoàn tiền 2 lần!) theo chu kỳ Backoff cho đến khi nhận được `0430` xác nhận. Tuy nhiên, anh đặc biệt lưu ý một quy tắc nghiệp vụ cực kỳ quan trọng tại Việt Nam: Với **Rút tiền ATM / Quẹt thẻ POS** thì dùng `0420 Reversal` tự động, nhưng với **Chuyển tiền nhanh liên ngân hàng NAPAS 24/7 (`IBFT`)** khi chiều hạch toán `0200` bị Timeout (`DE39=68`), ngân hàng chuyển TUYỆT ĐỐI KHÔNG tự ý hoàn tiền ngay hay bắn đảo mù quáng vì người nhận ở ngân hàng đích có thể đã rút sạch tiền mặt đó ra tiêu rồi! Với IBFT bị Timeout, giao dịch phải đưa vào trạng thái nghi vấn (`Suspense/Pending`), truy vấn trạng thái hoặc chờ phiên đối soát liên ngân hàng xác nhận."
        ],
        bullets: [
          "Idempotent 0420/0421 tại phía Issuer: Khi viết code nhận `0420` hoặc `0421` cho Core Ngân hàng phát hành, bắt buộc kiểm tra theo `DE90`: nếu giao dịch gốc chưa từng vào hệ thống (do gói `0200` rớt trước khi tới Issuer) thì ghi nhận `Tombstone` để chặn nếu `0200` đến trễ sau đó, đồng thời vẫn trả `0430 (DE39=00)` êm đẹp; nếu đã đảo rồi thì trả `0430 (DE39=00)` ngay không đảo lần hai!",
          "Partial Reversal (Đảo một phần): Nếu khách rút 5.000.000đ nhưng khay tiền ATM chỉ đếm nhả ra được 2.000.000đ rồi kẹt, ATM gửi `0420` với `DE4 = 5.000.000` và `DE95 (Replacement Amount) = 2.000.000` để Issuer chỉ hoàn lại đúng 3.000.000đ khách chưa nhận được.",
          "Bảo mật MAC (DE64 / DE128): Mọi gói tin `0200/0210/0420` đi qua kênh liên ngân hàng đều phải tính mã xác thực thông điệp `MAC` bên trong thiết bị phần cứng `HSM` để chống sửa trộm số tiền hoặc mã phản hồi `DE39` trên đường truyền."
        ]
      },
      {
        heading: "3. Thế hệ Kế tiếp ISO 20022: Cấu trúc MX (`pacs.008`, `camt.053`) và Thách thức Chuyển đổi",
        paragraphs: [
          "Vì sao cả thế giới tài chính từ SWIFT (thay thế hoàn toàn chuẩn `MT103/MT202` cũ), châu Âu (`SEPA`), Mỹ (`FedNow`) đến châu Á đều chi hàng tỷ USD để chuyển dịch lên **`ISO 20022`**? Bởi vì trong `ISO 8583` hay `SWIFT MT` cũ, trường thông tin người gửi/người nhận và nội dung chuyển tiền bị bó hẹp trong vài chục ký tự không có cấu trúc rõ ràng. Khi tên công ty dài hoặc địa chỉ có dấu tiếng Việt/tiếng Nhật ghép chung vào một dòng chữ bị cắt cụt (`Truncation`), bộ máy Chống rửa tiền (`AML Sanction Screening`) sinh ra hàng núi cảnh báo giả (`False Positives`) bắt nhân viên ngân hàng phải duyệt tay hàng giờ đồng hồ!",
          "`ISO 20022` không phải là một định dạng dây dẫn đơn lẻ mà là một **Từ điển Dữ liệu Nghiệp vụ Chuẩn hóa (`Business Data Dictionary`)** biểu diễn phổ biến nhất qua `XML Schema (XSD)` chặt chẽ (và hỗ trợ cả `JSON`). Tên bản tin `ISO 20022` gồm 4 phần cực dễ nhớ `area.type.variant.version`: Nhóm `pain` (`Payments Initiation` — giao tiếp giữa Doanh nghiệp/Khách hàng và Ngân hàng, như `pain.001` lệnh chi lương lô); Nhóm `pacs` (`Payments Clearing and Settlement` — giao tiếp giữa Ngân hàng với Ngân hàng/Trung tâm thanh toán bù trừ, tiêu biểu nhất là **`pacs.008`** `FIToFICustomerCreditTransfer` chuyển tiền khách hàng liên ngân hàng, **`pacs.002`** báo cáo trạng thái chấp nhận/từ chối, **`pacs.004`** hoàn trả tiền `PaymentReturn`); và Nhóm `camt` (`Cash Management` — quản lý dòng tiền và đối soát, tiêu biểu là **`camt.053`** sao kê tài khoản cuối ngày chuẩn hóa và **`camt.054`** thông báo Ghi Nợ/Ghi Có tức thời).",
          "Khi xây dựng Payment Hub bằng Java 21 xử lý `ISO 20022`, mỗi giao dịch mang theo một mã định danh xuyên suốt toàn cầu dạng UUIDv4 gọi là **`UETR` (`Unique End-to-end Transaction Reference`)** giống hệt mã vận đơn chuyển phát nhanh DHL — giúp ngân hàng gửi tra cứu chính xác tiền đang nằm ở ngân hàng trung gian nào theo thời gian thực. Thách thức kỹ thuật lớn nhất với kiến trúc sư Java là thiết kế **Canonical Payment Domain Model** ở lõi Payment Hub đủ rộng để chứa trọn vẹn các thẻ giàu ngữ nghĩa của `pacs.008` (`Dbtr` Người chuyển, `DbtrAcct`, `DbtrAgt` BICFI, `Cdtr` Người nhận, `Structured PostalAddress`, `RmtInf` thông tin hóa đơn đối chiếu), tránh việc chuyển qua lại `ISO 20022 -> Legacy Core -> ISO 20022` làm rớt mất dữ liệu bắt buộc!"
        ],
        bullets: [
          "pacs.008 vs pain.001: Nhớ kỹ quy tắc phân vai — Khách hàng doanh nghiệp gửi lệnh thanh toán lên ngân hàng mình bằng `pain.001`; Ngân hàng người gửi kiểm tra và khoanh tiền xong mới đóng gói `pacs.008` gửi sang hệ thống Bù trừ / Ngân hàng người nhận.",
          "camt.053 thay thế file CSV tự chế: Thay vì mỗi ngân hàng xuất một kiểu file Excel/CSV sao kê khác nhau khiến kế toán doanh nghiệp khổ sở viết 20 bộ đọc file, chuẩn `camt.053` thống nhất toàn bộ cấu trúc số dư đầu kỳ (`OPBD`), cuối kỳ (`CLBD`) và chi tiết từng bút toán (`Ntry`).",
          "Hiệu năng xử lý XML lớn trên Java: Tuyệt đối không dùng DOM Parser đọc toàn bộ file `camt.053` cuối ngày nặng 500MB vào bộ nhớ Heap (sẽ nổ `OutOfMemoryError`); hãy bắt buộc dùng `StAX Streaming Parser` (`XMLStreamReader`) kết hợp xác thực XSD chống tấn công `XXE` (`disallow-doctype-decl`)."
        ]
      }
    ],
    comparison: {
      title: "So sánh Toàn diện hai Chuẩn Giao thức Trụ cột Ngành Ngân hàng: ISO 8583 vs ISO 20022",
      headers: ["Tiêu chí kỹ thuật", "ISO 8583 (Card & Fast Retail Switch)", "ISO 20022 (Modern Clearing & Corporate/Cross-border)", "Góc nhìn Kiến trúc sư Java"],
      rows: [
        [
          "Định dạng đóng gói & Kích thước",
          "Nhị phân / ASCII nén chặt theo `Bitmap` 64/128-bit; gói tin siêu nhỏ chỉ ~150–400 bytes",
          "Tài liệu có cấu trúc phân cấp sâu theo `XML XSD` (hoặc JSON); gói `pacs.008` khoảng 3KB–15KB",
          "ISO 8583 dùng Netty TCP Persistent Socket; ISO 20022 thường đi qua MQ / HTTPS mTLS / Kafka"
        ],
        [
          "Độ giàu ngữ nghĩa dữ liệu",
          "Hạn chế — ghép nhiều thông tin phụ vào các trường tự do như `DE48`, `DE62` tùy biến riêng từng mạng",
          "Cực kỳ chi tiết & chuẩn hóa toàn cầu: tách riêng phố, thành phố, mã quốc gia, mã số thuế, hóa đơn, `UETR`",
          "ISO 20022 giảm mạnh cảnh báo giả AML và cho phép tự động gạch nợ hóa đơn (`Straight-Through Processing`)"
        ],
        [
          "Ứng dụng thực tế chủ đạo",
          "Quẹt thẻ POS, Rút tiền ATM, Visa/Mastercard/JCB, Chuyển mạch nhanh bán lẻ NAPAS 24/7 hiện hữu",
          "Thanh toán quốc tế SWIFT CBPR+, Hệ thống thanh toán giá trị cao RTGS, Kết nối Host-to-Host ERP (`pain/camt`)",
          "Một Payment Hub ngân hàng hiện đại bắt buộc có Adapter hỗ trợ song song cả hai chuẩn này"
        ],
        [
          "Cơ chế xử lý đảo / hoàn trả",
          "Bản tin `0420/0421 Reversal Advice` gắn `DE90` cho sự cố kỹ thuật tức thời tại đầu cuối",
          "Luồng nghiệp vụ rõ ràng bằng `pacs.004` (`PaymentReturn`) hoặc `camt.056` yêu cầu hủy lệnh thanh toán",
          "Không trộn lẫn Reversal kỹ thuật của ATM với quy trình tra soát hoàn trả của chuyển tiền tài khoản"
        ]
      ]
    },
    codeTitle: "Java 21 ISO 8583 Binary Bitmap Decoder & Bộ Quyết định Auto-Reversal 0420 An toàn",
    code: [
      "package vn.finjava.payment.iso8583;",
      "",
      "import java.util.ArrayList;",
      "import java.util.HexFormat;",
      "import java.util.List;",
      "",
      "public final class Iso8583BitmapEngine {",
      "    public enum SwitchAction { COMPLETE_SUCCESS, BUSINESS_DECLINE, ENQUEUE_SAF_REVERSAL_0420, HOLD_PENDING_RECON }",
      "    public enum ChannelType { ATM_POS_CARD, IBFT_ACCOUNT_TRANSFER }",
      "",
      "    public record ParsedHeader(String mti, boolean hasSecondaryBitmap, List<Integer> presentDataElements) {}",
      "",
      "    public static ParsedHeader decodeHeader(String mti, String hexBitmap) {",
      "        if (mti == null || !mti.matches(\"\\\\d{4}\")) throw new IllegalArgumentException(\"Invalid MTI: \" + mti);",
      "        byte[] primary = HexFormat.of().parseHex(hexBitmap.substring(0, 16));",
      "        boolean secondary = (primary[0] & 0x80) != 0;",
      "        byte[] fullBitmap = HexFormat.of().parseHex(hexBitmap.substring(0, secondary ? 32 : 16));",
      "",
      "        List<Integer> fields = new ArrayList<>();",
      "        for (int de = 2; de <= fullBitmap.length * 8; de++) {",
      "            int byteIdx = (de - 1) / 8;",
      "            int bitMask = 1 << (7 - ((de - 1) % 8));",
      "            if ((fullBitmap[byteIdx] & bitMask) != 0) {",
      "                fields.add(de);",
      "            }",
      "        }",
      "        return new ParsedHeader(mti, secondary, List.copyOf(fields));",
      "    }",
      "",
      "    public static SwitchAction decideOutcome(ChannelType channel, String de39, boolean readTimedOut) {",
      "        if (!readTimedOut && \"00\".equals(de39)) return SwitchAction.COMPLETE_SUCCESS;",
      "        if (readTimedOut || \"68\".equals(de39)) {",
      "            return channel == ChannelType.ATM_POS_CARD",
      "                    ? SwitchAction.ENQUEUE_SAF_REVERSAL_0420",
      "                    : SwitchAction.HOLD_PENDING_RECON;",
      "        }",
      "        return SwitchAction.BUSINESS_DECLINE;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "`HexFormat.of().parseHex(...)` (tiện ích chuẩn mới từ Java 17/21): Chuyển đổi chuỗi Hex Bitmap thành mảng `byte[]` cực nhanh và an toàn mà không cần cài thêm thư viện ngoài như Apache Commons Codec.",
      "Phép toán dịch bit `(primary[0] & 0x80) != 0`: Kiểm tra chính xác Bit số 1 (Most Significant Bit của byte đầu tiên); nếu bật lên `1`, hàm tự động đọc đủ 32 ký tự Hex (16 bytes = 128 Data Elements) thay vì 16 ký tự Hex (8 bytes = 64 Data Elements).",
      "Công thức ánh xạ `byteIdx = (de - 1) / 8` và `bitMask = 1 << (7 - ((de - 1) % 8))`: Trái tim của mọi trình đọc `ISO 8583` — do thứ tự bit trong chuẩn ISO đánh từ trái sang phải (1..8), ta lấy `7 - phần dư` để dịch bit chuẩn xác tuyệt đối.",
      "Hàm `decideOutcome` thể hiện tư duy nghiệp vụ cực sắc bén: Cùng gặp Timeout hoặc `DE39 = 68`, kênh rút tiền thẻ `ATM_POS_CARD` kích hoạt `ENQUEUE_SAF_REVERSAL_0420`, trong khi kênh chuyển khoản `IBFT_ACCOUNT_TRANSFER` bắt buộc giữ trạng thái `HOLD_PENDING_RECON` chờ tra soát/đối soát để tránh rủi ro mất tiền hai đầu!"
    ],
    labGuide: {
      goal: "Viết bộ giải mã Bitmap ISO 8583 chuẩn xác cho cả Primary & Secondary Bitmap và mô phỏng kịch bản xử lý mã lỗi 68 (Timeout) giữa Acquirer và Issuer.",
      steps: [
        "Bước 1: Chạy thử `Iso8583BitmapEngine.decodeHeader(\"0200\", \"702000000A000000\")` và kiểm chứng danh sách trường trả về chính xác là `[2, 3, 4, 11, 37, 39]` (`hasSecondaryBitmap = false`).",
        "Bước 2: Đổi byte đầu từ `70` (`01110000`) sang `F0` (`11110000`) kèm 16 ký tự Hex Secondary Bitmap kích hoạt `DE90` và `DE102`, kiểm tra hàm tự động mở rộng lên 128 bit và bắt trúng `[2, 3, 4, 11, 37, 39, 90, 102]`.",
        "Bước 3: Xây dựng bảng `saf_reversal_queue` và một hàm phía Issuer giả lập nhận bản tin `0420` / `0421` tra cứu theo khóa `de90_original_key` đảm bảo gọi lặp 5 lần cũng chỉ hoàn tiền vào sổ cái đúng 1 lần duy nhất.",
        "Bước 4: Thử đọc một mẫu XML `pacs.008.001.08` bằng `XMLStreamReader` của Java 21 (bật cờ chống XXE) trích xuất `UETR`, `IntrBkSttlmAmt`, `Dbtr/Nm` và `CdtrAcct/Id`."
      ],
      expectedOutput: "Unit Test xanh 100% cho các mẫu Bitmap 64-bit và 128-bit; kịch bản gửi lặp 5 gói `0421 Reversal Repeat` chỉ sinh đúng 1 `Reversal Journal` trên sổ cái và 4 lần sau trả về ngay `0430 (DE39=00)`."
    },
    examTips: [
      "Mẹo tính nhẩm Bitmap nhanh khi đi thi hoặc phỏng vấn kỹ thuật: Mỗi ký tự Hex tương ứng đúng 4 Data Elements! Ví dụ ký tự đầu tiên là `7` (`0111` nhị phân) nghĩa là Bit 1 = `0` (không có Secondary Bitmap) và các trường `DE2`, `DE3`, `DE4` đều có mặt!",
      "Câu hỏi bẫy về `DE4 (Amount, Transaction)`: Trong `ISO 8583`, trường `DE4` dài 12 chữ số KHÔNG chứa dấu phẩy thập phân (ngầm hiểu 2 chữ số cuối là đơn vị xu/minor unit với ngoại tệ như USD `000000010050` = `$100.50`, hoặc nhân 100 theo quy ước từng mạng chuyển mạch) — quên chia/nhân hệ số minor unit của mạng sẽ làm giao dịch lệch gấp 100 lần!",
      "Phân biệt nhanh họ bản tin `ISO 20022`: Hễ thấy `pain.*` là Khách hàng <-> Ngân hàng; thấy `pacs.*` là Liên ngân hàng / Thanh toán bù trừ (`pacs.008` chuyển tiền, `pacs.002` kết quả, `pacs.004` trả tiền); thấy `camt.*` là Quản lý tiền mặt & Sao kê đối soát (`camt.053` sao kê cuối ngày)."
    ],
    summaryTakeaways: [
      "`ISO 8583` tối ưu băng thông tối đa bằng `MTI` + `Bitmap` 64/128-bit (Bit 1 bật tắt Secondary Bitmap), sử dụng kết nối TCP Socket thường trực kèm nhịp tim `0800/0810`.",
      "Tổ hợp `DE11 (STAN)`, `DE37 (RRN)`, `DE39 (Response Code)` và `DE90 (Original Data Elements)` là xương sống để định danh, phản hồi và đảo giao dịch thẻ.",
      "Lỗi Timeout (`DE39=68`) ở ATM/POS dùng cơ chế `0420/0421 SAF Auto-Reversal` lũy đẳng, nhưng ở chuyển tiền tài khoản `IBFT` phải treo trạng thái chờ tra soát/đối soát.",
      "`ISO 20022` (`pacs.008`, `camt.053`) mang cấu trúc dữ liệu giàu ngữ nghĩa cùng mã `UETR` xuyên suốt, giải quyết triệt để bài toán cắt cụt dữ liệu (`Truncation`) và tự động hóa AML/Đối soát."
    ],
    lessonQuestions: [
      {
        question: "Một bộ phân tích gói tin `ISO 8583` nhận được bản tin có `MTI = 0200` và 4 ký tự Hex đầu tiên của Primary Bitmap là `F230...`. Kết luận nào sau đây là CHÍNH XÁC nhất về cấu trúc bản tin này?",
        options: [
          "Bản tin này là phản hồi tra cứu số dư, không có Secondary Bitmap và không có trường Số thẻ `DE2`.",
          "Bản tin này là yêu cầu giao dịch tài chính (`Financial Request`), CÓ chứa Secondary Bitmap (16 bytes tổng cộng) vì Bit 1 = 1 (`F` = `1111` nhị phân), đồng thời có mặt `DE2`, `DE3`, `DE4`.",
          "Bản tin này là lệnh đảo giao dịch tự động `Reversal Advice` do máy ATM bị kẹt tiền phát ra.",
          "Ký tự `F` đầu tiên báo lỗi định dạng gói tin vì Primary Bitmap không bao giờ được bắt đầu bằng chữ cái."
        ],
        answer: 1,
        explanation: "`MTI = 0200` là Financial Transaction Request. Ký tự Hex đầu tiên của Bitmap là `F`, đổi sang nhị phân 4-bit là `1111`, tương ứng với Bit 1 = 1 (báo hiệu có mặt Secondary Bitmap mở rộng lên DE65..DE128), Bit 2 = 1 (`DE2` PAN), Bit 3 = 1 (`DE3` Processing Code) và Bit 4 = 1 (`DE4` Amount).",
        wrongReasons: [
          "`0210` mới là phản hồi, và `F` = `1111` nên cả Bit 1 (Secondary Bitmap) lẫn Bit 2 (`DE2`) đều bằng 1.",
          "",
          "Lệnh đảo giao dịch tự động phải mang `MTI = 0420` (hoặc `0421` khi gửi lặp), không phải `0200`.",
          "Bitmap biểu diễn dưới dạng Hexadecimal (`0-9`, `A-F`) là hoàn toàn tiêu chuẩn để ánh xạ từng cụm 4 bits."
        ]
      },
      {
        question: "Một tập đoàn bán lẻ kết nối hệ thống ERP trực tiếp (Host-to-Host) với Ngân hàng theo chuẩn `ISO 20022` để tự động phát lệnh chi trả nhà cung cấp trong ngày và cuối mỗi đêm tải sổ phụ sao kê chuẩn hóa về gạch nợ tự động. Cặp bản tin `ISO 20022` nào phù hợp nhất cho hai chiều giao tiếp giữa ERP Doanh nghiệp và Ngân hàng của họ?",
        options: [
          "`MTI 0800` để phát lệnh chi trả và `MTI 0420` để lấy sao kê cuối ngày.",
          "`pacs.008` do ERP gửi thẳng sang Ngân hàng Nhà nước và `DE39` để nhận sổ phụ.",
          "`pain.001` (`CustomerCreditTransferInitiation`) để khởi tạo lệnh thanh toán từ khách hàng lên ngân hàng, và `camt.053` (`BankToCustomerStatement`) để nhận sao kê cuối ngày.",
          "Chỉ dùng duy nhất bản tin `pacs.004` cho cả chiều chi lương lẫn chiều lấy sao kê."
        ],
        answer: 2,
        explanation: "Trong chuẩn ISO 20022, nhóm `pain.*` (Payments Initiation) phục vụ giao tiếp Khách hàng -> Ngân hàng (`pain.001` gửi lệnh chuyển tiền), sau đó ngân hàng mới dùng `pacs.008` đi thanh toán liên ngân hàng. Chiều báo cáo sao kê chốt sổ cuối ngày từ Ngân hàng -> Khách hàng sử dụng bản tin chuẩn `camt.053`.",
        wrongReasons: [
          "`0800` và `0420` là các MTI quản trị mạng và đảo lệnh của chuẩn thẻ `ISO 8583`, không phải `ISO 20022`.",
          "`pacs.008` là bản tin thanh toán bù trừ giữa các Tổ chức Tài chính (FI-to-FI), không phải bản tin khởi tạo từ ERP doanh nghiệp gửi ngân hàng phục vụ mình.",
          "",
          "`pacs.004` là bản tin hoàn trả khoản thanh toán (`PaymentReturn`) liên ngân hàng, hoàn toàn không dùng để phát lệnh chi hay xuất sao kê."
        ]
      }
    ]
  },

  B3: {
    duration: "65 phút",
    difficulty: "Senior / Instant Payment & VietQR",
    codeLang: "java",
    teacherIntro: "Chào em, mỗi ngày đi uống cà phê, ăn phở hay mua hàng thương mại điện tử, chắc chắn em đã giơ điện thoại quét mã `VietQR` và thấy tiền nổi bên tài khoản chủ quán kèm loa đọc số tiền chỉ trong vòng 2 giây, kể cả 12 giờ đêm mùng 1 Tết! Đằng sau trải nghiệm mượt mà khiến cả du khách quốc tế phải trầm trồ đó chính là sự kết hợp hoàn hảo giữa dịch vụ **Chuyển tiền nhanh liên ngân hàng NAPAS 24/7 (`IBFT 2.0`)**, tiêu chuẩn mã hóa chuỗi **EMVCo Merchant-Presented QR (`TLV + CRC-16`)** và kiến trúc **Payment Webhook** bất đồng bộ. Trong các buổi phỏng vấn vị trí Senior Java tại ngân hàng số, ví điện tử hay cổng thanh toán (Payment Gateway), đề bài 'Hãy giải thích chuỗi ký tự bên trong mã VietQR và thiết kế luồng gạch nợ đơn hàng tự động không bị giả mạo' xuất hiện với tần suất dày đặc. Hôm nay anh em mình sẽ mổ xẻ đến tận từng bit của nó!",
    analogy: {
      title: "Hỏi đúng tên chủ nhà qua chuông cửa rồi mới trao tận tay phong bì tiền",
      body: "Em hãy hình dung chuyển tiền thường thời xưa (CITAD liên ngân hàng theo phiên) giống như viết địa chỉ người nhận ra phong bì gửi bưu điện: nếu em lỡ ghi sai 1 chữ số tài khoản, phong bì cứ thế chạy đi mất 1 ngày rồi mới bị trả lại hoặc tệ hơn là rơi nhầm nhà rất khó đòi! Còn chuyển tiền nhanh `NAPAS 24/7 (IBFT)` hoạt động theo quy trình 2 bước cực kỳ an toàn: **Bước 1 (`Account Inquiry`)** — ngay khi em gõ xong số tài khoản hoặc quét mã `VietQR`, app ngân hàng của em bấm chuông cửa hỏi ngân hàng bên kia 'Nhà số `0123456789` có phải của anh `NGUYEN VAN AN` không?' và hiện ngay tên thật lên màn hình trong 300ms để mắt em xác nhận. Chỉ sau khi em gật đầu nhập OTP, **Bước 2 (`Fund Transfer`)** mới thực sự chuyển tiền tức thời. Và bản thân tờ mã `VietQR` dán ở quầy thu ngân chính là mảnh giấy ghi sẵn Mã ngân hàng + Số tài khoản + Số tiền + Mã hóa đơn, được khóa ở góc dưới cùng bằng một con tem chống rách 4 ký tự (`CRC-16`) — chỉ cần kẻ gian lấy bút sửa trộm 1 con số trên chuỗi QR là con tem `CRC-16` lệch ngay, mọi app ngân hàng từ chối quét lập tức!"
    },
    objectives: [
      "Nắm vững kiến trúc 2 pha của Chuyển tiền nhanh `NAPAS 24/7 (IBFT)`: Pha truy vấn tên thụ hưởng (`Account/Card Inquiry`) và Pha hạch toán chuyển tiền (`Fund Transfer`) cùng quy tắc xử lý giao dịch treo.",
      "Giải mã và tự tay xây dựng bộ sinh chuỗi `VietQR` động chuẩn `EMVCo TLV` (Tag `00`, `01`, `38` GUID `A000000727`, `53`, `54`, `58`, `62`, `63`) kèm thuật toán tính mã kiểm tra `CRC-16/CCITT-FALSE` chính xác từng bit.",
      "Thiết kế được hệ thống thu hộ bằng Tài khoản Định danh (`Virtual Account - VA`) và cổng nhận `Payment Webhook` bảo mật cao (kiểm tra chữ ký HMAC/RSA, chống Replay, Idempotency và kiểm chứng chéo số tiền)."
    ],
    flow: [
      {
        step: "1. Dynamic VietQR & Virtual Account Generation (Tạo mã QR động theo đơn hàng)",
        detail: "Khi khách bấm Thanh toán đơn hàng `#ORD-8899` trị giá `250.000đ`, Backend Merchant sinh mã Tài khoản ảo (`VA`) riêng cho đơn hàng (hoặc gắn mã đơn vào Tag `62.08`), đóng gói chuỗi `EMVCo TLV` (`01=12` Dynamic QR) và tính `CRC-16/CCITT-FALSE` ở 4 ký tự cuối sau `" + "`6304`" + "`."
      },
      {
        step: "2. Step 1 — NAPAS IBFT Account Inquiry (Tra vấn thông tin thụ hưởng)",
        detail: "App ngân hàng người mua quét QR, giải mã lấy `BIN` ngân hàng đích + Số tài khoản `VA`, gửi lệnh `Inquiry` (`DE3 = 43xxxx` trong ISO 8583 hoặc API IBFT) qua NAPAS sang Ngân hàng thụ hưởng để kiểm tra đơn hàng còn hiệu lực và lấy tên hiển thị `SHOP ABC - ORD8899`."
      },
      {
        step: "3. Step 2 — Biometric/OTP & IBFT Fund Transfer (Khấu trừ & Chuyển tiền 24/7)",
        detail: "Người mua xác nhận chuyển tiền: Ngân hàng chuyển (`Sending Bank`) trừ tiền/khoanh tiền CASA người mua, gửi lệnh `Transfer` (`DE3 = 91xxxx`) qua NAPAS; Ngân hàng nhận (`Receiving Bank`) ghi Có tức thì vào tài khoản thực của Merchant và trả `DE39 = 00`."
      },
      {
        step: "4. Signed Webhook Notification & Idempotent Order Fulfillment (Báo Có & Gạch nợ)",
        detail: "Ngân hàng nhận bắn `Webhook` ký số (kèm `transactionId`, `vaAccount`, `actualAmount`, `timestamp`) về Backend Merchant; hệ thống xác thực chữ ký, đối chiếu `actualAmount >= orderAmount`, khóa lũy đẳng theo `transactionId` rồi mới chuyển đơn sang `PAID`."
      }
    ],
    sections: [
      {
        heading: "1. Luồng Chuyển tiền Nhanh NAPAS 24/7 (IBFT): Tách bạch Inquiry & Transfer và Nghệ thuật Virtual Account",
        paragraphs: [
          "Trong kiến trúc chuyển mạch liên ngân hàng 24/7 kết nối hơn 60 ngân hàng và công ty tài chính tại Việt Nam, một giao dịch chuyển tiền của người dùng luôn đi qua 3 chủ thể chính: **Ngân hàng Phát lệnh (`Sending Bank / Acquirer`)**, **Tổ chức Chuyển mạch Quốc gia (`NAPAS`)**, và **Ngân hàng Thụ hưởng (`Receiving Bank / Issuer`)**. Điểm thiết kế sống còn mà mọi kiến trúc sư Backend cần nắm là sự tách rời hoàn toàn giữa **Pha 1: `Inquiry` (Tra vấn thụ hưởng)** và **Pha 2: `Fund Transfer` (Chuyển tiền hạch toán)**. Ở Pha 1, tuyệt đối chưa có bất kỳ bút toán tiền tệ nào xảy ra: Sending Bank định tuyến theo mã `BIN` 6 chữ số của ngân hàng đích (ví dụ `970436` Vietcombank, `970422` MB, `970407` Techcombank, `970415` VietinBank) để hỏi tên chủ tài khoản và trạng thái tài khoản có nhận tiền được không.",
          "Cơ chế 2 bước này mở ra một 'siêu vũ khí' cho thương mại điện tử và thu hộ học phí/điện nước gọi là **Tài khoản Định danh (`Virtual Account - VA`)**! Nếu Shop bán hàng dùng tài khoản thường nhận chuyển khoản thủ công, khách hàng rất hay tự ý xóa nội dung chuyển tiền hoặc gõ sai mã đơn hàng khiến kế toán không biết khoản 250.000đ vừa vào là của ai. Khi dùng `Dynamic VA`, mỗi đơn hàng được cấp một số tài khoản ảo duy nhất (ví dụ đầu số định danh đối tác `9688` + mã đơn `000889912`). Khi người mua quét QR, ngay ở bước `Inquiry`, Ngân hàng thụ hưởng gọi vào hệ thống quản lý VA: nếu đơn hàng đã hết hạn 15 phút hoặc đã thanh toán rồi, ngân hàng trả lỗi từ chối ngay từ bước `Inquiry` khiến khách KHÔNG THỂ chuyển nhầm hay chuyển đúp! Còn ở bước `Transfer`, ngân hàng kiểm tra tiếp nếu khách cố tình sửa số tiền chuyển khác `250.000đ` (với loại `VA cố định số tiền - Exact Amount VA`), ngân hàng từ chối nhận luôn ngay tại cửa!",
          "Về mặt hạch toán tại Sending Bank khi thực hiện Pha 2 `Fund Transfer`: trước khi bắn gói tin mạng ra kênh NAPAS, Sending Bank bắt buộc phải ghi Nợ (hoặc Hold chặt) tài khoản CASA của người gửi đối ứng vào **Tài khoản Trung gian Thanh toán Liên ngân hàng đi (`IBFT Outward Clearing / Suspense GL`)**. Khi NAPAS trả về mã thành công `00`, bút toán được tất toán sang **Tài khoản Quyết toán NAPAS (`NAPAS Settlement Nostro GL`)**. Ngược lại, nếu gặp lỗi `ReadTimeout` hoặc mã nghi vấn `68` (chưa biết tiền đã sang tới Receiving Bank hay chưa), giao dịch phải giữ nguyên ở `Suspense GL` và trả thông báo cho khách 'Giao dịch đang được xử lý kết quả liên ngân hàng', sau đó chạy luồng truy vấn trạng thái giao dịch (`Transaction Status Inquiry`) hoặc chờ phiên quyết toán đối soát."
        ],
        bullets: [
          "Cache thông minh ở bước Inquiry: Tuyệt đối KHÔNG cache cứng vĩnh viễn kết quả `Account Inquiry` cho các đầu số `Virtual Account (VA)` động, vì mỗi mã VA gắn với trạng thái sống/hết hạn của từng đơn hàng theo từng phút!",
          "Phân biệt chuyển qua Số tài khoản (`QRIBFTTA`) và Số thẻ (`QRIBFTTC`): NAPAS hỗ trợ cả chuyển nhanh qua số tài khoản CASA lẫn qua số thẻ nội địa 16/19 số bắt đầu bằng `9704`; trường mã dịch vụ trong VietQR sẽ chỉ rõ đích đến là `Account` hay `Card`.",
          "Quản trị hạn mức ròng (`Net Debit Cap`) tại NAPAS: Mỗi ngân hàng thành viên ký quỹ một hạn mức đảm bảo thanh toán tại chuyển mạch; đội vận hành Payment Hub luôn phải giám sát cảnh báo hạn mức ròng liên ngân hàng 24/7 dịp cao điểm cận Tết."
        ]
      },
      {
        heading: "2. Giải phẫu Chuỗi VietQR Chuẩn EMVCo TLV & Thuật toán CRC-16/CCITT-FALSE",
        paragraphs: [
          "Rất nhiều bạn nghĩ mã `VietQR` chứa một tấm ảnh hay đường link web bí mật nào đó, nhưng khi em dùng camera thường quét thử một mã VietQR bất kỳ, em sẽ thấy nó chỉ là một chuỗi văn bản thuần túy dài khoảng 100–180 ký tự dạng: `00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA530370454062500005802VN62120808DH9988116304XXXX`. Toàn bộ chuỗi này tuân thủ nghiêm ngặt cấu trúc **`TLV (Tag - Length - Value)`** của chuẩn quốc tế **EMVCo Merchant-Presented QR**: cứ 2 chữ số đầu là `Tag ID` (`00`..`99`), 2 chữ số tiếp theo là `Length` (độ dài tính bằng số ký tự của phần `Value`, ví dụ `10` nghĩa là đọc tiếp đúng 10 ký tự), tiếp theo là `Value` (bên trong `Value` của một số Tag gốc như `38` và `62` lại lồng tiếp các cặp `Sub-TLV` con!).",
          "Hãy cùng anh đọc thông suốt từng mắt xích của một chuỗi `VietQR` chuẩn NAPAS: **`000201`** -> Tag `00` (Payload Format Indicator) dài `02`, giá trị `01`; **`010212`** -> Tag `01` (Point of Initiation Method) dài `02`, giá trị **`11` là QR Tĩnh** (dán cố định ở quán bún chả, dùng nhiều lần, khách tự nhập tiền) còn **`12` là QR Động** (sinh riêng cho 1 hóa đơn kèm sẵn số tiền); **Tag `38`** -> Định danh tài khoản thụ hưởng mạng NAPAS, bên trong gồm 3 Sub-tag: Sub-tag `00` mang GUID định danh duy nhất của NAPAS là **`A000000727`**, Sub-tag `01` lồng tiếp Mã BIN ngân hàng (`0006970436`) + Số tài khoản/thẻ (`01100123456789`), và Sub-tag `02` mang mã dịch vụ **`QRIBFTTA`** (chuyển tới Tài khoản) hoặc **`QRIBFTTC`** (chuyển tới Thẻ); **`5303704`** -> Tag `53` mã tiền tệ ISO 4217 của VNĐ là `704`; **Tag `54`** -> Số tiền giao dịch (ví dụ `5406250000` = 250.000đ); **`5802VN`** -> Mã quốc gia Việt Nam; **Tag `62`** -> Thông tin bổ sung, trong đó Sub-tag `08` chứa nội dung chuyển khoản / mã đơn hàng.",
          "Và mắt xích cuối cùng cực kỳ quan trọng để làm bài test Live Coding: **Tag `63` (Cyclic Redundancy Check)**. Chuỗi dữ liệu trước khi tính mã kiểm tra BẮT BUỘC phải nối sẵn 4 ký tự cố định **`\"6304\"`** vào cuối cùng (Tag `63`, độ dài `04`), sau đó đưa toàn bộ mảng bytes US-ASCII/UTF-8 từ ký tự đầu tiên đến hết chữ `\"6304\"` đi qua thuật toán **`CRC-16/CCITT-FALSE`** với đúng bộ tham số chuẩn EMVCo: Đa thức sinh **`Polynomial = 0x1021`**, Giá trị khởi tạo **`Initial Value = 0xFFFF`** (cực nhiều bạn chép nhầm code CRC-16 XMODEM trên mạng dùng `0x0000` khiến sinh ra mã VietQR không một ngân hàng nào quét được!), không đảo bit đầu vào/đầu ra (`RefIn = false`, `RefOut = false`), `XorOut = 0x0000`, và xuất ra đúng 4 ký tự Hex viết hoa (`%04X`)."
        ],
        bullets: [
          "Lỗi kinh điển số 1 khi code VietQR: Quên nối chuỗi `\"6304\"` vào cuối payload TRƯỚC khi truyền vào hàm tính `CRC-16` — theo chuẩn EMVCo, chính bản thân Tag ID `63` và Length `04` cũng nằm trong phạm vi dữ liệu được tính CRC!",
          "Lỗi kinh điển số 2 về độ dài UTF-8 vs Ký tự: Nội dung chuyển khoản trong Sub-tag `62.08` của VietQR nên chuẩn hóa sang bảng chữ cái ASCII không dấu (`A-Z`, `0-9`, khoảng trắng, gạch ngang); nếu vô tình truyền tiếng Việt có dấu rồi tính `Length` sai giữa số byte và số ký tự sẽ làm gãy cấu trúc TLV ở các app ngân hàng khác nhau.",
          "Static QR (`01=11`) vs Dynamic QR (`01=12`): Tuyệt đối không gắn cứng số tiền đơn hàng thương mại điện tử vào QR Tĩnh cho nhiều khách cùng quét vì không thể phân biệt đơn nào đã trả tiền nếu 2 khách cùng mua món hàng 199.000đ cùng một phút!"
        ]
      },
      {
        heading: "3. Kiến trúc Cổng Thanh toán & Xác thực Payment Webhook Chống Giả mạo Tuyệt đối",
        paragraphs: [
          "Quét được `VietQR` mới xong chiều khách hàng trả tiền; chiều nguy hiểm nhất đối với lập trình viên Backend phía doanh nghiệp/ví điện tử là **nhận thông báo kết quả thanh toán (`IPN / Payment Webhook`) để tự động giao hàng hoặc cộng số dư ví**! Anh từng chứng kiến không ít startup mất hàng trăm triệu đồng chỉ trong một đêm vì lập trình viên viết API `/api/webhooks/payment-callback` chỉ kiểm tra `if (\"SUCCESS\".equals(req.getStatus())) markOrderPaid(req.getOrderId());` mà không có bất kỳ cơ chế xác thực mật mã nào — hacker chỉ cần mở Postman đoán URL callback rồi bắn một cục JSON giả mạo `{\"orderId\": \"ORD-999\", \"status\": \"SUCCESS\"}` là mua sạch thẻ cào điện thoại không tốn 1 xu!",
          "Một kiến trúc nhận `Payment Webhook` đạt chuẩn ngân hàng bắt buộc phải có **5 lớp khiên bảo vệ đồng thời**: (1) **Xác thực kênh & chữ ký số (`mTLS` hoặc `HMAC-SHA256 / RSA-SHA256 Signature`)**: Cổng thanh toán/Ngân hàng luôn ký lên chuỗi dữ liệu chuẩn hóa (hoặc raw request body + timestamp) và đặt chữ ký vào Header (ví dụ `X-Webhook-Signature`); ở phía nhận, bạn phải đọc nguyên bản `rawBody` byte-for-byte và dùng `MessageDigest.isEqual(...)` (so sánh thời gian hằng số `Constant-Time Comparison` chống Timing Attack) để kiểm chứng chữ ký; (2) **Chống phát lại (`Anti-Replay`)**: Kiểm tra `X-Webhook-Timestamp` không lệch quá `±300 giây` so với giờ chuẩn NTP của server kết hợp lưu vết `nonce / eventId`.",
          "Lớp khiên thứ (3) là **Kiểm chứng chéo số tiền & tiền tệ (`Amount & Currency Reconciliation`)**: Tuyệt đối không chỉ nhìn thấy chữ `SUCCESS` gắn với `orderId` là gạch nợ ngay! Kẻ gian có thể lấy mã QR tĩnh hoặc sửa số tiền chuyển chỉ `1.000đ` cho đơn hàng iPhone trị giá `30.000.000đ` nhưng điền đúng nội dung `ORD-999`! Code của bạn bắt buộc phải kiểm tra `webhook.paidAmount().compareTo(order.expectedAmount()) == 0` (hoặc xử lý luồng thanh toán thiếu/thừa vào ví chờ hoàn). Lớp thứ (4) là **Lũy đẳng (`Idempotency`)**: Ngân hàng có cơ chế tự động bắn lại Webhook (`Retry`) nếu lần đầu mạng timeout, nên bảng `processed_webhook_events` phải có `UNIQUE(provider_txn_id)` để nếu nhận lại gói tin cũ thì trả ngay `HTTP 200 OK` mà không bao giờ cộng tiền/xuất kho lần hai! Và lớp thứ (5): Phản hồi nhanh cho ngân hàng trong `< 2 giây` bằng cách ghi bền vững vào DB/Outbox trước rồi đẩy tác vụ xuất hóa đơn điện tử, gửi email nặng nề sang Worker bất đồng bộ."
        ],
        bullets: [
          "Cạm bẫy đọc Raw Body trong Spring Boot: Nếu bạn parse JSON sang Java DTO rồi serialize ngược lại thành chuỗi JSON để tính HMAC, thứ tự key hoặc khoảng trắng sẽ khác đi làm trượt chữ ký! Phải tính chữ ký trực tiếp trên `byte[] rawPayload` gốc nhận từ HTTP Request.",
          "Đối phó tình huống rớt Webhook (Reconciliation Fallback): Mạng Internet luôn có thể đứt đúng lúc ngân hàng bắn Webhook; vì vậy luôn phải có Job chạy ngầm mỗi 2–3 phút quét các đơn hàng `PENDING` quá 3 phút để chủ động gọi API `Query Transaction Status` sang ngân hàng hỏi kết quả.",
          "Xử lý khách chuyển thiếu / chuyển thừa vào QR: Nếu khách tự gõ nhầm chuyển 200.000đ cho đơn 250.000đ, hệ thống ghi nhận khoản tiền thực nhận vào sổ phụ đơn hàng (`PARTIALLY_PAID` hoặc `OVERPAID_SUSPENSE`) thay vì nuốt im lặng của khách."
        ]
      }
    ],
    comparison: {
      title: "Ma trận Lựa chọn Phương thức Thu hộ QR & Chuyển khoản cho Hệ thống Thanh toán",
      headers: ["Mô hình triển khai", "Cơ chế định danh đơn hàng", "Ưu điểm nổi bật", "Rủi ro & Lưu ý kỹ thuật"],
      rows: [
        [
          "VietQR Tĩnh (`01=11`) + Quét nội dung",
          "Dùng chung 1 số tài khoản thật, dựa vào khách giữ nguyên nội dung chuyển khoản `ORD123`",
          "Triển khai cực dễ, không cần hợp đồng Virtual Account chuyên sâu với ngân hàng",
          "Khách dễ sửa nhầm nội dung hoặc chuyển sai số tiền; tốn nhân sự tra soát tay các ca lệch"
        ],
        [
          "VietQR Động (`01=12`) trên Tài khoản Thường",
          "Sinh QR mới mỗi đơn chứa sẵn số tiền `Tag 54` và mã đơn `Tag 62.08`",
          "App ngân hàng tự điền sẵn số tiền và nội dung chính xác cho người mua",
          "Một số app vẫn cho người dùng mở khóa sửa lại số tiền/nội dung nếu không dùng VA khóa cứng"
        ],
        [
          "VietQR Động + Dynamic Virtual Account (VA)",
          "Mỗi đơn hàng được cấp 1 số tài khoản ảo riêng biệt gắn số tiền cố định & hạn sử dụng",
          "Chuẩn mực Enterprise: chặn chuyển sai số tiền/đơn hết hạn ngay từ bước `Inquiry` NAPAS!",
          "Cần tích hợp bộ API Cấp phát VA / Inquiry Callback / Credit Webhook với Ngân hàng thu hộ"
        ],
        [
          "NAPAS IBFT Chi hộ (Disbursement / Payout)",
          "Hệ thống doanh nghiệp chủ động gọi API `Inquiry -> Transfer` đẩy tiền ra 24/7",
          "Giải ngân khoản vay, hoàn tiền, rút ví về tài khoản ngân hàng bất kỳ trong 3 giây",
          "Bắt buộc có `Idempotency-Key`, ký số `RSA/JWS` và không tự ý hoàn tiền khi gặp lỗi Timeout"
        ]
      ]
    },
    codeTitle: "Java 21: Bộ Sinh Chuỗi VietQR Động Chuẩn EMVCo (CRC-16/CCITT-FALSE) & Xác thực Webhook HMAC",
    code: [
      "package vn.finjava.payment.vietqr;",
      "",
      "import javax.crypto.Mac;",
      "import javax.crypto.spec.SecretKeySpec;",
      "import java.nio.charset.StandardCharsets;",
      "import java.security.MessageDigest;",
      "import java.util.HexFormat;",
      "",
      "public final class VietQrAndWebhookSecurity {",
      "    private static String tlv(String tag, String value) {",
      "        return (value == null || value.isEmpty()) ? \"\" : tag + String.format(\"%02d\", value.length()) + value;",
      "    }",
      "",
      "    public static String buildDynamicVietQr(String bankBin, String accountNo, long amountVnd, String orderRef) {",
      "        String beneficiary = tlv(\"00\", bankBin) + tlv(\"01\", accountNo);",
      "        String merchantAccInfo = tlv(\"00\", \"A000000727\") + tlv(\"01\", beneficiary) + tlv(\"02\", \"QRIBFTTA\");",
      "        String payloadWithoutCrc = tlv(\"00\", \"01\") + tlv(\"01\", \"12\") + tlv(\"38\", merchantAccInfo)",
      "                + tlv(\"53\", \"704\") + tlv(\"54\", Long.toString(amountVnd))",
      "                + tlv(\"58\", \"VN\") + tlv(\"62\", tlv(\"08\", orderRef)) + \"6304\";",
      "        return payloadWithoutCrc + calcCrc16CcittFalse(payloadWithoutCrc);",
      "    }",
      "",
      "    public static String calcCrc16CcittFalse(String asciiInput) {",
      "        int crc = 0xFFFF;",
      "        for (byte b : asciiInput.getBytes(StandardCharsets.US_ASCII)) {",
      "            crc ^= (b & 0xFF) << 8;",
      "            for (int bit = 0; bit < 8; bit++) {",
      "                crc = ((crc & 0x8000) != 0) ? ((crc << 1) ^ 0x1021) : (crc << 1);",
      "            }",
      "        }",
      "        return String.format(\"%04X\", crc & 0xFFFF);",
      "    }",
      "",
      "    public static boolean verifyWebhookHmac(byte[] rawBody, String timestamp, String hexSig, byte[] secret) throws Exception {",
      "        Mac mac = Mac.getInstance(\"HmacSHA256\");",
      "        mac.init(new SecretKeySpec(secret, \"HmacSHA256\"));",
      "        mac.update((timestamp + \".\").getBytes(StandardCharsets.UTF_8));",
      "        return MessageDigest.isEqual(mac.doFinal(rawBody), HexFormat.of().parseHex(hexSig));",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Cấu trúc lồng 3 cấp tại `Tag 38`: Ghép chuẩn xác GUID quốc gia của NAPAS `A000000727` (`Sub-tag 00`), cặp `bankBin + accountNo` (`Sub-tag 01`) và mã dịch vụ chuyển nhanh tới tài khoản `QRIBFTTA` (`Sub-tag 02`) kèm `Tag 01 = 12` (Dynamic QR).",
      "Thuật toán `calcCrc16CcittFalse`: Khởi tạo chuẩn `crc = 0xFFFF`, dịch bit XOR với đa thức `0x1021` trên toàn bộ chuỗi ĐÃ BAO GỒM hậu tố `\"6304\"` ở cuối — chuỗi sinh ra quét hợp lệ 100% trên mọi ứng dụng Mobile Banking tại Việt Nam!",
      "Hàm `verifyWebhookHmac`: Ký gộp cả `timestamp + '.' + rawBody` (ngăn kẻ gian lấy lại gói body cũ phát lại) và bắt buộc so sánh hai mảng byte bằng `MessageDigest.isEqual(...)` chạy trong thời gian hằng số để triệt tiêu lỗ hổng đoán chữ ký qua độ trễ (`Timing Side-Channel Attack`)."
    ],
    labGuide: {
      goal: "Viết dịch vụ sinh mã VietQR động thật quét thử được bằng điện thoại và xây dựng API nhận Payment Webhook chống giả mạo chữ ký, chống phát lại và chống cộng tiền đúp.",
      steps: [
        "Bước 1: Gọi `VietQrAndWebhookSecurity.buildDynamicVietQr(\"970436\", \"0123456789\", 50000L, \"ORD2026A1\")`, dùng thư viện `ZXing` vẽ chuỗi kết quả ra ảnh PNG (hoặc dán vào trình tạo QR offline) rồi mở thử chức năng quét QR trên app ngân hàng của em kiểm tra máy nhận diện đúng Vietcombank, số tiền 50.000đ và nội dung `ORD2026A1` (dừng lại ở màn hình Inquiry, không bấm chuyển thật).",
        "Bước 2: Thử sửa 1 chữ số trong số tiền từ `50000` thành `10000` mà giữ nguyên 4 ký tự CRC cuối, sau đó quét lại để thấy tận mắt app ngân hàng báo lỗi 'Mã QR không hợp lệ' ngay tức khắc.",
        "Bước 3: Dựng REST Endpoint `POST /webhooks/napas-va-credit` đọc `byte[] rawBody`, kiểm tra lệch giờ `X-Timestamp <= 300s`, xác thực `verifyWebhookHmac` và đối chiếu `paidAmount == order.amount`.",
        "Bước 4: Dùng JMeter hoặc `CompletableFuture` bắn đồng thời 10 Webhook giống hệt nhau (cùng chữ ký hợp lệ và cùng `providerTxnId`) vào Endpoint vừa viết để kiểm chứng chỉ có đúng 1 luồng cập nhật đơn hàng sang `PAID` và 9 luồng còn lại trả `200 OK` an toàn."
      ],
      expectedOutput: "Ảnh QR quét lên đúng tên ngân hàng, số tiền và mã đơn hàng trên app Mobile Banking; mọi Webhook sai chữ ký hoặc quá hạn 5 phút bị chặn với `401 Unauthorized`; gửi trùng 10 lần cùng một giao dịch không bị cộng tiền gấp 10 lần."
    },
    examTips: [
      "Câu hỏi kỹ thuật rất hay gặp khi phỏng vấn Payment Gateway: 'Tham số khởi tạo của CRC-16 trong chuẩn VietQR / EMVCo là gì?' — Nhớ nằm lòng: **CRC-16/CCITT-FALSE, Polynomial `0x1021`, Initial Value `0xFFFF`**, tính trên toàn bộ chuỗi kết thúc bằng `\"6304\"`.",
      "Bẫy nghiệp vụ Webhook kinh điển: Nhận Webhook có chữ ký số hợp lệ 100% từ ngân hàng thật, đúng mã đơn hàng `ORD-100`, trạng thái `SUCCESS`, thế là code cho giao hàng luôn mà QUÊN kiểm tra trường `amount`! Kẻ gian tự chuyển khoản `2.000đ` kèm nội dung `ORD-100` cũng sinh ra Webhook thật có chữ ký thật của ngân hàng!",
      "Tại sao NAPAS 24/7 bắt buộc chia làm 2 bước `Inquiry` rồi mới `Transfer`? Vừa để người chuyển nhìn thấy tên thật chủ tài khoản đích chống chuyển nhầm, vừa cho phép ngân hàng thụ hưởng kiểm tra tài khoản đóng/phong tỏa/VA hết hạn trước khi bất kỳ dòng tiền nào bị dịch chuyển."
    ],
    summaryTakeaways: [
      "Chuyển tiền nhanh `NAPAS 24/7 (IBFT)` vận hành qua 2 pha tách biệt: `Account Inquiry` (xác thực tên & hiệu lực thụ hưởng/VA) -> `Fund Transfer` (hạch toán tức thời).",
      "`VietQR` mã hóa dữ liệu theo chuẩn `EMVCo TLV` với GUID NAPAS `A000000727`, mã tiền tệ `704` (VNĐ) và khóa toàn vẹn ở cuối bằng `6304` + `CRC-16/CCITT-FALSE (0xFFFF, 0x1021)`.",
      "Kết hợp `Dynamic VietQR (01=12)` với `Virtual Account (VA)` theo từng đơn hàng là giải pháp chuẩn mực nhất để tự động hóa thu hộ 100% không sợ khách sửa số tiền hay nội dung.",
      "Endpoint nhận `Payment Webhook` bắt buộc hội đủ 5 chốt chặn: Chữ ký số trên raw body (`Constant-time compare`), Chống Replay (`Timestamp`), Kiểm tra khớp số tiền thực nhận, Khóa lũy đẳng (`providerTxnId`), và Cơ chế chủ động truy vấn bù khi rớt Webhook."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên viết hàm tạo chuỗi `VietQR` động theo chuẩn `EMVCo`, đã ghép đúng các thẻ `00`, `01`, `38` (`A000000727`), `53` (`704`), `54`, `58` (`VN`), `62`, rồi truyền chuỗi đó vào hàm `CRC-16` (khởi tạo `0x0000`), sau đó mới nối `\"6304\" + crcHex` vào cuối. Khi đưa lên Production, toàn bộ ứng dụng ngân hàng đều báo 'Mã QR không hợp lệ'. Đâu là hai lỗi kỹ thuật trực tiếp gây ra sự cố này?",
        options: [
          "Thiếu tiền tố `https://vietqr.vn/` ở đầu chuỗi và mã tiền tệ VNĐ phải là `840` thay vì `704`.",
          "Chưa nối hậu tố `\"6304\"` vào dữ liệu đầu vào TRƯỚC khi tính CRC-16, và dùng sai giá trị khởi tạo `0x0000` thay vì chuẩn `CRC-16/CCITT-FALSE` (`Initial Value = 0xFFFF`, `Polynomial = 0x1021`).",
          "Mã VietQR bắt buộc phải mã hóa toàn bộ chuỗi bằng thuật toán AES-256 trước khi in ra ảnh.",
          "Tag `01` của QR động bắt buộc phải mang giá trị `99` thay vì `12`."
        ],
        answer: 1,
        explanation: "Theo đặc tả EMVCo Merchant-Presented QR Code mà NAPAS VietQR áp dụng, phép tính CRC-16 phải bao trùm tất cả các byte dữ liệu KỂ CẢ Tag ID và Length của chính trường CRC (tức phải nối `\"6304\"` vào chuỗi trước khi bấm hàm tính CRC), đồng thời bắt buộc dùng chuẩn CRC-16/CCITT-FALSE với giá trị khởi tạo `0xFFFF` và đa thức `0x1021`.",
        wrongReasons: [
          "Chuỗi VietQR chuẩn EMVCo bắt đầu trực tiếp bằng `000201` (không phải URL web), và `840` là mã ISO 4217 của đồng USD (`704` mới đúng là VNĐ).",
          "",
          "Chuỗi EMVCo QR là dữ liệu văn bản cấu trúc TLV rõ để mọi ứng dụng ngân hàng thành viên đều giải mã trực tiếp được mà không dùng khóa đối xứng riêng.",
          "Trong chuẩn EMVCo, Tag `01` chỉ dùng `11` cho QR Tĩnh và `12` cho QR Động."
        ]
      },
      {
        question: "Sàn thương mại điện tử T tích hợp thu hộ chuyển khoản qua cổng thanh toán ngân hàng. Sau khi kiểm tra chữ ký `HMAC-SHA256` của Webhook hợp lệ và kiểm tra `orderId` tồn tại ở trạng thái `PENDING`, lập trình viên viết code chuyển thẳng đơn hàng sang `PAID` và tự động gửi mã thẻ game trị giá 5.000.000đ cho khách. Lỗ hổng nghiệp vụ chí mạng nào vẫn đang tồn tại trong đoạn logic này?",
        options: [
          "Dùng thuật toán `HMAC-SHA256` quá yếu so với `MD5`.",
          "Không kiểm tra đối chiếu số tiền thực nhận (`paidAmount`) và loại tiền tệ trong Webhook với số tiền phải thu của đơn hàng, dẫn đến kẻ gian chuyển khoản chỉ 5.000đ kèm đúng nội dung `orderId` vẫn nhận được thẻ game 5.000.000đ (kèm rủi ro xử lý trùng nếu chưa khóa `providerTxnId`).",
          "Webhook ngân hàng không bao giờ gửi kèm số tiền thực nhận nên không thể kiểm tra được.",
          "Phải đợi T+3 ngày làm việc sau khi nhận Webhook mới được giao mã thẻ game."
        ],
        answer: 1,
        explanation: "Chữ ký số hợp lệ chỉ chứng minh gói tin Webhook thực sự do ngân hàng phát ra (tức khách có phát sinh một giao dịch thật vào tài khoản), nhưng KHÔNG chứng minh khách đã chuyển ĐỦ số tiền của đơn hàng nếu dùng tài khoản thường hoặc VA mở số tiền! Luôn bắt buộc kiểm tra `paidAmount == expectedOrderAmount`, `currency == VND` và chống trùng lặp theo `providerTxnId`.",
        wrongReasons: [
          "`MD5` đã bị phá vỡ về mặt mật mã học và bị cấm dùng cho chữ ký bảo mật; `HMAC-SHA256` hoặc `RSA-SHA256` mới là chuẩn an toàn.",
          "",
          "Mọi Webhook báo Có chuẩn của ngân hàng/cổng thanh toán đều cung cấp chính xác số tiền thực hạch toán (`amount`) và mã giao dịch tham chiếu duy nhất.",
          "Điểm mạnh cốt lõi của thanh toán tức thời 24/7 là giao hàng số ngay lập tức sau khi xác thực đầy đủ chữ ký, số tiền và tính lũy đẳng."
        ]
      }
    ]
  },

  B4: {
    duration: "60 phút",
    difficulty: "Senior / Financial Reconciliation & Settlement",
    codeLang: "java",
    teacherIntro: "Chào em, trong suốt hơn 12 năm làm nghề xây dựng Core Banking và Payment Hub, có một chân lý xương máu mà anh luôn nhắc các anh em kỹ sư trong đội trước mỗi đợt Go-live: **'Hệ thống thanh toán thời gian thực giỏi đến đâu cũng chỉ mới quyết định 99,9% cuộc chơi; 0,1% các ca rớt mạng, nghẽn cáp quang, lệch trạng thái còn lại chính là nơi Ngân hàng mất hàng tỷ đồng hoặc bị Thanh tra phạt nặng nếu không có Hệ thống Đối soát Tự động (`Automated Reconciliation`) vững như bàn thạch!'** Đi phỏng vấn Senior ở các ngân hàng lớn hay siêu ứng dụng ví điện tử, khi người phỏng vấn hỏi: 'Em làm gì với các giao dịch bị Timeout chưa rõ thành bại lúc 23:59 đêm?', câu trả lời về **Đối soát 3 bên (`3-Way Reconciliation`)**, **Tài khoản treo trung gian (`Suspense Account GL`)** và **Quy trình xử lý lệch `T+0 / T+1`** sẽ chứng minh ngay em là người đã từng lăn lộn với tiền thật trên Production!",
    analogy: {
      title: "Buổi kiểm quỹ khóa sổ ba bên cuối ca của Thu ngân, Bếp và Quản lý giao hàng",
      body: "Em hãy tưởng tượng một nhà hàng lớn đông nghịt khách vào tối thứ Bảy có 3 cuốn sổ độc lập: Sổ 1 của **Thu ngân** (tương ứng `Core Banking Ledger` — nơi giữ két tiền thật của khách), Sổ 2 của **Điều phối quầy lễ tân** (tương ứng `Payment Hub` — nơi nhận đơn và bấm chuông gọi đối tác), và Sổ 3 của **Đối tác giao đồ ăn** (tương ứng `NAPAS / Visa / Partner`). Trong giờ cao điểm ồn ào, có những đơn Thu ngân đã tạm cất tiền khách vào phong bì treo riêng (`Suspense Account`) rồi gọi sang Đối tác nhưng điện thoại rớt sóng không nghe rõ Đối tác có giao món đó không! Đúng 24:00 đóng cửa (`Cut-off Time`), cả ba mang sổ ra khớp từng mã đơn một: nếu Đối tác xác nhận 'Tôi đã giao thành công cho khách nhận rồi!', Thu ngân mở phong bì treo chuyển tiền sang trả cho Đối tác (`Auto-Settle`). Còn nếu trên sổ Đối tác hoàn toàn không có đơn đó ('Tôi chưa hề nhận được cuộc gọi nào!'), Thu ngân mở phong bì treo trả lại nguyên vẹn tiền cho vị khách kia (`Auto-Refund`) sáng sớm hôm sau!"
    },
    objectives: [
      "Hiểu sâu kiến trúc **Đối soát 3 bên (`3-Way Reconciliation`)** giữa `Core Banking Ledger` <-> `Payment Hub` <-> `Switching/Partner (NAPAS, Visa, Telco)` và ý nghĩa sống còn của giờ khóa sổ **`Cut-off Time`**.",
      "Nắm vững cơ chế hạch toán qua **Tài khoản Treo Trung gian (`Suspense / Clearing GL`)** và bộ quy tắc tự động xử lý 4 nhóm sai lệch kinh điển (`Missing in Partner`, `Missing in Core`, `Status Mismatch`, `Amount Mismatch`).",
      "Thiết kế được thuật toán đối soát luồng dữ liệu lớn (`Streaming / Hash-Partitioned Reconciliation`) xử lý hàng triệu giao dịch mỗi phiên dưới 30 giây mà không gây tràn bộ nhớ `OutOfMemoryError`."
    ],
    flow: [
      {
        step: "1. Cut-off Window & File Ingestion (Chốt phiên kế toán & Thu thập sao kê)",
        detail: "Đúng mốc giờ Cut-off quy ước (ví dụ `23:00:00` hoặc `23:59:59` theo phiên NAPAS), hệ thống tải file đối soát chuẩn từ đối tác qua SFTP/mTLS (kiểm tra chữ ký PGP/Checksum và dòng tổng `Trailer Control Sum`), đồng thời trích xuất dữ liệu cùng kỳ từ `Payment Hub` và `Core Ledger`."
      },
      {
        step: "2. Normalization & Rolling Carry-Over (Chuẩn hóa khóa & Gộp giao dịch giáp ranh)",
        detail: "Chuẩn hóa mọi bản ghi về định dạng chung theo khóa đối chiếu duy nhất (`RRN / Trace + Date + Acquirer BIN`), đồng thời nạp thêm danh sách các giao dịch sát giờ Cut-off phiên hôm trước (`Carry-over Pool`) để tránh báo lệch giả do lệch vài giây đồng hồ."
      },
      {
        step: "3. 3-Way Streaming Matching Engine (Khớp 3 chiều tốc độ cao)",
        detail: "Đối chiếu trạng thái và số tiền trên cả 3 nguồn dữ liệu theo từng phân vùng băm (`Hash Bucket`), phân loại từng giao dịch vào các rổ: `MATCHED`, `SUSPENSE_TO_SETTLE`, `SUSPENSE_TO_REFUND`, `AMOUNT_MISMATCH`, hoặc `CRITICAL_UNFUNDED_LOSS`."
      },
      {
        step: "4. Automated Adjustment & Dispute Workflow (Sinh bút toán tất toán/hoàn & Tra soát)",
        detail: "Tự động sinh `Journal Voucher` giải tỏa tài khoản `Suspense GL` (tất toán cho đối tác hoặc hoàn trả CASA khách hàng kèm thông báo biến động số dư), xuất báo cáo chênh lệch cho bộ phận Vận hành mở hồ sơ tra soát (`Dispute / Chargeback`) các ca bất thường."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao Đối soát 2 bên là chưa đủ? Sức mạnh của Đối soát 3 bên (3-Way Reconciliation) & Cut-off Time",
        paragraphs: [
          "Ở các công ty nhỏ, người ta thường chỉ làm đối soát 2 bên: lấy bảng `transactions` của microservice Thanh toán (`Payment Hub`) so với file CSV của đối tác cổng thanh toán. Nhưng trong kiến trúc ngân hàng thực thụ, microservice `Payment Hub` và `Core Banking Ledger` là hai hệ thống tách biệt nhau qua mạng nội bộ! Điều gì xảy ra nếu `Core Ledger` đã trừ tiền khách hàng xong nhưng phản hồi nội bộ về `Payment Hub` bị rớt khiến `Payment Hub` ghi nhầm là `FAILED` (không gọi sang NAPAS), hoặc ngược lại lỗi bug trong `Payment Hub` bắn lệnh sang NAPAS thành công nhưng chưa hề ghi bút toán vào `Core Ledger`? Nếu chỉ so 2 bên `Payment Hub <-> NAPAS`, bạn sẽ bỏ lọt những khoản lệch ngầm ngay bên trong lòng ngân hàng!",
          "Đó là lý do chuẩn mực vàng của ngành tài chính luôn là **Đối soát 3 bên (`3-Way Reconciliation`)**: đối chiếu tam giác khép kín giữa **(1) `Core Banking Ledger`** (Sự thật kế toán nội bộ — tiền thực tế đã trích từ CASA hay đang nằm ở Suspense GL), **(2) `Payment Hub / Switch`** (Nhật ký điều phối giao dịch, mã lỗi kỹ thuật, lịch sử retry), và **(3) `External Settlement File`** (File quyết toán chính thức có giá trị pháp lý từ NAPAS / Tổ chức thẻ quốc tế / Nhà mạng). Chỉ khi một giao dịch khớp cả sự tồn tại, chiều giao dịch, mã tiền tệ và số tiền trên cả 3 đỉnh tam giác này thì mới được đóng dấu `RECONCILED_OK`!",
          "Một bài toán hóc búa luôn đi kèm với mọi hệ thống đối soát 24/7 là **Bẫy Giáp ranh Giờ Khóa sổ (`Cut-off Boundary Trap`)**. Giả sử phiên đối soát ngày `T` của đối tác chốt sổ đúng lúc `23:00:00.000`. Một khách hàng bấm chuyển tiền lúc `22:59:59.700`: Core của bạn ghi nhận giao dịch vào ngày `T` (trước 23h), nhưng gói tin chạy qua mạng mất 400ms nên sang tới máy chủ NAPAS lúc `23:00:00.100` — tức rơi sang file đối soát của ngày `T+1`! Nếu thuật toán đối soát của bạn ngây thơ kết luận ngay vào đêm ngày `T` là 'NAPAS không có giao dịch này -> Hoàn tiền ngay cho khách!', thì sáng hôm sau khi file ngày `T+1` của NAPAS đổ về báo đã trả tiền cho người nhận, ngân hàng bạn mất trắng khoản tiền đó! Quy tắc bắt buộc: Giao dịch nằm trong **cửa sổ đệm giáp ranh (`Grace Window`, ví dụ `±5 đến 15 phút` quanh mốc Cut-off)** nếu thiếu 1 phía sẽ được đánh dấu `CARRY_OVER_NEXT_CYCLE` chờ khớp tiếp với phiên kế tiếp trước khi kết luận lệch thật."
        ],
        bullets: [
          "T+0 Intra-day Mini-Recon vs T+1 Official Settlement: Các ngân hàng hiện đại không còn đợi đến sáng hôm sau (`T+1`) mới biết lệch; họ chạy thêm các phiên đối soát nhanh trong ngày (`T+0` mỗi 1–2 giờ hoặc gần thời gian thực qua API/Stream) để giải tỏa sớm giao dịch treo cho khách, nhưng bút toán quyết toán pháp lý cuối cùng vẫn chốt trên file chuẩn `T+1`.",
          "Kiểm tra toàn vẹn File Đối soát trước khi đọc: File đối soát chuẩn của NAPAS/Visa luôn có dòng `Header` (ngày phiên, mã ngân hàng nhận) và dòng `Trailer` (tổng số dòng `Record Count` + tổng số tiền `Total Amount` + chữ ký số/PGP); nếu truyền file SFTP bị đứt ngang thiếu dòng cuối, bộ đọc phải từ chối chạy ngay thay vì tưởng nhầm hàng vạn giao dịch bị thiếu!",
          "Định danh khóa đối chiếu (`Reconciliation Key`): Không bao giờ đối chiếu chỉ bằng `Số tiền + Số tài khoản` (vì khách có thể chuyển 2 lệnh cùng 500.000đ trong 1 phút!); luôn khớp theo khóa chuẩn liên ngân hàng như `RRN (DE37)` hoặc tổ hợp `Acquirer BIN + Date + STAN (DE11)`."
        ]
      },
      {
        heading: "2. Tài khoản Treo (Suspense Account GL) & Bảng Luật Xử lý Chênh lệch Tự động",
        paragraphs: [
          "Để hiểu cách hệ thống tự động chữa lành các giao dịch nghi vấn mà không bao giờ làm lệch Sổ Cái Kế Toán Kép (đã học ở Bài B1), em cần nắm chắc vai trò của **Tài khoản Treo Trung gian (`Suspense Account / Outward Clearing GL`)**. Hãy nhớ lại: khi khách hàng A chuyển khoản 5.000.000đ đi liên ngân hàng và gặp lỗi `Timeout` chưa rõ kết quả, tiền của khách A đã đi đâu? Core Banking đã thực hiện bút toán: `DEBIT CASA A: 5.000.000đ` đối ứng `CREDIT Outward Suspense GL: 5.000.000đ`. Nghĩa là 5.000.000đ đã rời khỏi ví khách A (để khách A không tiêu đúp được), nhưng cũng chưa ghi vào tài khoản quyết toán trả cho ngân hàng bạn, mà nằm yên vị tại tài khoản `Suspense GL` chờ phán quyết của Đối soát!",
          "Khi bộ máy Đối soát đọc file quyết toán chính thức của NAPAS về, có **4 kịch bản chênh lệch thực tế** được xử lý theo ma trận luật nghiêm ngặt: **Kịch bản 1 (`Core = SUSPENSE_HELD`, `NAPAS = SETTLED_SUCCESS`, khớp đúng 5.000.000đ)**: Hóa ra gói tin hôm qua đã sang tới ngân hàng đích thành công chỉ là đường về bị đứt mạng! Hệ thống tự động sinh bút toán tất toán: `DEBIT Outward Suspense GL: 5.000.000đ` / `CREDIT NAPAS Settlement Nostro GL: 5.000.000đ`, đồng thời cập nhật trạng thái giao dịch trên app khách hàng A sang `THÀNH CÔNG`. Khách A không bị trừ thêm đồng nào, ngân hàng bạn quyết toán sòng phẳng với NAPAS!",
          "**Kịch bản 2 (`Core = SUSPENSE_HELD`, `NAPAS = NOT_FOUND / REJECTED` — và đã qua cửa sổ giáp ranh Cut-off)**: Gói tin hôm qua rớt trước khi tới đích, người nhận chưa hề nhận được tiền. Hệ thống tự động sinh bút toán hoàn trả: `DEBIT Outward Suspense GL: 5.000.000đ` / `CREDIT CASA A: 5.000.000đ` (kèm hoàn phí/VAT nếu thu), cập nhật giao dịch sang `HOÀN TIỀN DO LỖI MẠNG` và đẩy thông báo biến động số dư `+5.000.000đ` cho khách A yên tâm. **Kịch bản 3 (`Core = SUCCESS`, `NAPAS = NOT_FOUND`)**: Báo động bất thường! Hệ thống nội bộ tưởng thành công nhưng đối tác không ghi nhận -> Giữ tiền lại kiểm tra khẩn cấp xem gói phản hồi có bị map sai mã lỗi không. Và **Kịch bản 4 Nguy hiểm nhất (`Core = FAILED / NOT_FOUND` — chưa hề trừ tiền khách A!, nhưng `NAPAS = SETTLED_SUCCESS` — đối tác đã trả tiền cho người nhận!)**: Đây là thảm họa lỗi code (ví dụ Retry bắn lệnh sang NAPAS sau khi DB nội bộ đã Rollback!) gây thiệt hại trực tiếp cho ngân hàng -> Tuyệt đối KHÔNG tự động trừ trộm tài khoản khách A âm tiền, mà phải bắn cảnh báo P1 tức thì (`CRITICAL_LOSS_ALERT`), hạch toán vào tài khoản Phải thu chờ xử lý tra soát (`Dispute Receivable GL`) để đội Vận hành và Pháp chế thu hồi!"
        ],
        bullets: [
          "Giám sát tuổi nợ Tài khoản Treo (`Suspense Aging Report`): Cuối mỗi ngày sau khi chạy Đối soát xong, số dư còn tồn đọng trên tài khoản `Suspense GL` lý tưởng phải tiến về `0` (chỉ còn các giao dịch vừa phát sinh sau giờ Cut-off); bất kỳ khoản treo nào quá `48 giờ` chưa được giải tỏa phải nổi cảnh báo đỏ cho Kế toán trưởng.",
          "Lũy đẳng trong Bút toán Điều chỉnh Đối soát: Nếu vận hành viên bấm chạy lại (`Re-run`) Job đối soát của ngày `2026-11-23` lần thứ hai, hệ thống bắt buộc gắn `idempotencyKey = \"RECON_ADJ_\" + cycleDate + \"_\" + rrn` để không bao giờ hoàn tiền 2 lần cho cùng một giao dịch treo!",
          "Xử lý lệch số tiền (`Amount Mismatch`): Mọi trường hợp `coreAmount != partnerAmount` (ví dụ do lỗi quy đổi tỷ giá hoặc sai biểu phí) đều phải đẩy vào hàng đợi duyệt tay `Maker-Checker` trên cổng Back-Office thay vì tự động gạch bừa."
        ]
      },
      {
        heading: "3. Kỹ thuật Xử lý File Đối soát Hàng Triệu Dòng Dưới 30 Giây trên Java 21",
        paragraphs: [
          "Hãy bước sang góc độ hiệu năng hệ thống: Ở một ngân hàng bán lẻ top đầu hoặc ví điện tử lớn, một ngày có từ **3 triệu đến 15 triệu giao dịch**. Nếu bạn viết Job đối soát bằng cách gọi `coreRepo.findAllByDate(date)` nạp 5 triệu Entity Hibernate vào một `ArrayList`, rồi với mỗi dòng trong file CSV của đối tác lại chạy vòng lặp tìm kiếm (độ phức tạp `O(N^2)`) hoặc bắn 5 triệu câu `SELECT ... WHERE rrn = ?` đơn lẻ qua mạng vào PostgreSQL, thì Job đối soát của bạn hoặc sẽ nổ tung `java.lang.OutOfMemoryError: Java heap space` sau 2 phút, hoặc chạy mất 9 tiếng đồng hồ chưa xong phiên sáng!",
          "Trong thực chiến Production, có **2 mẫu kiến trúc tốc độ cao** mà Senior Java thường xuyên áp dụng: **Cách 1 — `Sort-Merge Streaming Reconciliation` (Tốn cực ít RAM ~128MB cho cả chục triệu dòng)**: Nạp file đối tác theo từng lô `JDBC Batch / COPY` vào bảng tạm phân vùng theo ngày `recon_partner_staging`, sau đó tận dụng Index hoặc sắp xếp cả hai nguồn `core_txns` và `recon_partner_staging` theo thứ tự tăng dần của khóa `rrn`, rồi mở 2 con trỏ đọc tuần tự (`Server-side Cursor / Stream`) trượt song song từ đầu đến cuối chỉ trong đúng 1 lượt duyệt `O(N + M)`!",
          "**Cách 2 — `Hash-Bucket Partitioned In-Memory Matching` với `Spring Batch`**: Chia không gian giao dịch thành 16 hoặc 32 phân vùng độc lập dựa trên ký tự cuối của `RRN` (`hash(rrn) % 32`). Mỗi luồng Worker chỉ tải đúng 1 phân vùng (khoảng 150.000 bản ghi rút gọn dưới dạng Java `record` gọn nhẹ hoặc kiểu nguyên thủy, hoàn toàn không dùng Hibernate Entity nặng nề) vào `HashMap<String, CompactTxn>`, đối chiếu trong tích tắc ở tốc độ RAM rồi ghi kết quả lô (`Batch Insert` kích thước `1.000 dòng/chunk`). Kết hợp cả hai kỹ thuật này, việc đối soát trọn vẹn 2–5 triệu giao dịch hoàn tất gọn gàng trong **12–25 giây** với mức tiêu thụ bộ nhớ phẳng lặng!"
        ],
        bullets: [
          "Tuyệt đối tránh JPA Entity + First-Level Cache khi chạy Đối soát: Hibernate giữ tham chiếu mọi Entity đọc ra trong `PersistenceContext` gây phình RAM liên tục; hãy dùng `JdbcClient` / `JdbcTemplate` đọc ra Java `record` bất biến kết hợp `fetchSize = 2000`.",
          "Restartability (Chạy tiếp từ điểm gãy): Thiết kế bảng trạng thái lô đối soát theo từng `bucket_id` để nếu Pod K8s bị khởi động lại ở phân vùng thứ 20/32, Job chạy lại chỉ xử lý nốt 12 phân vùng còn lại mà không làm lại từ đầu.",
          "Báo cáo Đối soát chuẩn Kiểm toán: Lưu trữ bất biến file gốc của đối tác trên Object Storage (`S3 / MinIO` bật chế độ `WORM - Object Lock`) tối thiểu 5–10 năm theo quy định lưu trữ chứng từ kế toán điện tử."
        ]
      }
    ],
    comparison: {
      title: "Bảng Quy tắc Xử lý Các Trạng thái Lệch trong Đối soát 3 Bên (Core - Hub - NAPAS)",
      headers: ["Trạng thái Core & Hub", "Trạng thái File NAPAS / Đối tác", "Bản chất Nghiệp vụ", "Hành động Xử lý Chuẩn Production"],
      rows: [
        [
          "`SUCCESS` (Đã trích tiền)",
          "`SETTLED` (Khớp đúng số tiền)",
          "Giao dịch hoàn hảo thông suốt cả 2 đầu",
          "Đánh dấu `MATCHED`; kết chuyển tổng số dư thanh toán ròng cuối phiên"
        ],
        [
          "`SUSPENSE_HELD` (Đang treo do Timeout)",
          "`SETTLED` (Đối tác đã ghi Có người nhận)",
          "Gói phản hồi `0210` bị rớt mạng chiều về dù lệnh đi đã thành công",
          "Tự động `AUTO_SETTLE`: Ghi Nợ `Suspense GL` / Ghi Có `NAPAS Settlement GL`, báo thành công cho khách"
        ],
        [
          "`SUSPENSE_HELD` (Đã qua Grace Window)",
          "`MISSING` hoặc `REJECTED`",
          "Lệnh rớt mạng chiều đi hoặc bị đối tác từ chối, người nhận chưa có tiền",
          "Tự động `AUTO_REFUND`: Ghi Nợ `Suspense GL` / Ghi Có hoàn trả `CASA` khách hàng (kèm mã lũy đẳng)"
        ],
        [
          "`FAILED / MISSING` (Chưa trừ tiền khách)",
          "`SETTLED` (Đối tác báo đã chi tiền!)",
          "Sự cố nghiêm trọng (lỗi Retry sau Rollback hoặc lệch khóa giao dịch)",
          "Cảnh báo khẩn P1 `CRITICAL_LOSS_ALERT`, treo vào phải thu tra soát, trình `Maker-Checker` và mở Dispute"
        ]
      ]
    },
    codeTitle: "Java 21: Bộ Máy Đối Soát Phân Loại Lệch 3 Chiều & Quyết định Giải Tỏa Tài Khoản Treo",
    code: [
      "package vn.finjava.payment.recon;",
      "",
      "import java.math.BigDecimal;",
      "import java.time.Duration;",
      "import java.time.Instant;",
      "",
      "public final class ThreeWayReconciliationEngine {",
      "    public enum CoreState { SUCCESS, SUSPENSE_HELD, FAILED }",
      "    public enum PartnerState { SETTLED, REJECTED }",
      "    public enum ReconAction {",
      "        MATCHED, CARRY_OVER_CUTOFF_WINDOW, AUTO_SETTLE_FROM_SUSPENSE,",
      "        AUTO_REFUND_TO_CUSTOMER, AMOUNT_MISMATCH_REVIEW, CRITICAL_LOSS_ESCALATION",
      "    }",
      "",
      "    public record CoreRecord(String rrn, CoreState state, BigDecimal amount, Instant txnTime) {}",
      "    public record PartnerRecord(String rrn, PartnerState state, BigDecimal amount) {}",
      "",
      "    public static ReconAction evaluateOne(CoreRecord core, PartnerRecord partner, Instant cutoffTime, Duration grace) {",
      "        boolean nearCutoff = core != null && Duration.between(core.txnTime(), cutoffTime).abs().compareTo(grace) <= 0;",
      "        if (core != null && partner == null) {",
      "            if (nearCutoff) return ReconAction.CARRY_OVER_CUTOFF_WINDOW;",
      "            return switch (core.state()) {",
      "                case SUSPENSE_HELD -> ReconAction.AUTO_REFUND_TO_CUSTOMER;",
      "                case FAILED -> ReconAction.MATCHED;",
      "                case SUCCESS -> ReconAction.CRITICAL_LOSS_ESCALATION;",
      "            };",
      "        }",
      "        if (core == null || core.state() == CoreState.FAILED) {",
      "            return partner.state() == PartnerState.SETTLED ? ReconAction.CRITICAL_LOSS_ESCALATION : ReconAction.MATCHED;",
      "        }",
      "        if (partner.state() == PartnerState.SETTLED && core.amount().compareTo(partner.amount()) != 0) {",
      "            return ReconAction.AMOUNT_MISMATCH_REVIEW;",
      "        }",
      "        if (core.state() == CoreState.SUSPENSE_HELD) {",
      "            return partner.state() == PartnerState.SETTLED",
      "                    ? ReconAction.AUTO_SETTLE_FROM_SUSPENSE : ReconAction.AUTO_REFUND_TO_CUSTOMER;",
      "        }",
      "        return partner.state() == PartnerState.SETTLED ? ReconAction.MATCHED : ReconAction.AUTO_REFUND_TO_CUSTOMER;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Kiểm tra `nearCutoff` ngay đầu hàm: Bảo vệ hệ thống khỏi bẫy hoàn tiền nhầm cho các giao dịch phát sinh sát giờ khóa sổ (ví dụ lúc `22:59:58`) khi bản ghi phía đối tác bị đẩy sang file đối soát ngày kế tiếp (`CARRY_OVER_CUTOFF_WINDOW`).",
      "Xử lý chuẩn xác trạng thái `SUSPENSE_HELD`: Khi đối tác xác nhận `SETTLED` (và khớp số tiền bằng `compareTo == 0`) thì trả về `AUTO_SETTLE_FROM_SUSPENSE`; khi đối tác vắng mặt (ngoài vùng Cut-off) hoặc `REJECTED` thì trả về `AUTO_REFUND_TO_CUSTOMER`.",
      "Phát hiện tức thì rủi ro mất vốn (`CRITICAL_LOSS_ESCALATION`): Bất kỳ trường hợp nào phía Core không thu được tiền khách (`core == null` hoặc `FAILED`) mà đối tác lại ghi nhận `SETTLED` đều bị tách riêng lên mức cảnh báo khẩn cấp nhất.",
      "Sử dụng `switch` expression hiện đại của Java 21 kết hợp `record` bất biến giúp bộ máy đối soát chạy trên hàng triệu phần tử mỗi giây với chi phí cấp phát bộ nhớ cực thấp."
    ],
    labGuide: {
      goal: "Xây dựng module Đối soát T+1 hoàn chỉnh xử lý 500.000 bản ghi giả lập trong dưới 5 giây, bao gồm đầy đủ các ca khớp, giáp ranh Cut-off, treo tất toán, treo hoàn tiền và lệch số tiền.",
      steps: [
        "Bước 1: Viết trình sinh dữ liệu mẫu tạo ra 500.000 giao dịch trong bảng `core_recon_view` và 1 file CSV chuẩn đối tác (có dòng `HEADER` và dòng `TRAILER|500000|<totalAmount>`), trong đó cố tình cài cắm 50 ca `SUSPENSE_HELD` có trong file đối tác, 30 ca `SUSPENSE_HELD` vắng mặt ngoài giờ Cut-off, 10 ca phát sinh lúc `22:59:59` sát giờ Cut-off `23:00:00`, 5 ca lệch số tiền và 2 ca đối tác thừa.",
        "Bước 2: Viết hàm đọc kiểm tra dòng `TRAILER` trước khi nạp; thử xóa bớt 1 dòng trong CSV để xác nhận trình đọc chặn đứng ngay lập tức với lỗi `CorruptedSettlementFileException`.",
        "Bước 3: Áp dụng phân vùng 16 buckets theo ký tự Hex cuối của `RRN` và gọi `ThreeWayReconciliationEngine.evaluateOne(...)` để phân loại toàn bộ 500.000 dòng, đo thời gian thực thi và lượng Heap sử dụng.",
        "Bước 4: Với 30 ca `AUTO_REFUND_TO_CUSTOMER` và 50 ca `AUTO_SETTLE_FROM_SUSPENSE`, gọi sang `DoubleEntryLedgerEngine` (Bài B1) kèm `idempotencyKey` để giải tỏa tài khoản `Suspense GL`, sau đó chạy lại Job lần 2 để chứng minh không có đồng nào bị hoàn đúp."
      ],
      expectedOutput: "Toàn bộ 500.000 giao dịch đối soát xong trong < 5 giây; 10 ca lúc 22:59:59 được đưa an toàn vào `CARRY_OVER_CUTOFF_WINDOW` không bị hoàn nhầm; tài khoản `Suspense GL` giảm đúng bằng tổng 80 ca đã giải tỏa; chạy lại Job lần 2 sinh 0 bút toán mới."
    },
    examTips: [
      "Câu hỏi tình huống phỏng vấn cực kỳ phổ biến: 'Giao dịch chuyển tiền liên ngân hàng bị ReadTimeout lúc 22:59:59 ngay sát giờ Cut-off 23:00:00, đến 01:00 sáng chạy file đối soát ngày T không thấy giao dịch đó trong file NAPAS, em có tự động hoàn tiền ngay không?' — Đáp án ăn điểm tuyệt đối: **KHÔNG hoàn ngay!** Phải đưa vào `Carry-over` chờ kiểm tra thêm file ngày `T+1` (hoặc gọi API truy vấn trạng thái trực tiếp) vì độ trễ mạng có thể đẩy giao dịch sang đầu phiên hôm sau.",
      "Vai trò của `Suspense Account GL`: Nhớ kỹ mọi giao dịch chưa rõ kết quả đều phải hạch toán treo vào `Suspense GL` ngay lúc khởi tạo; không bao giờ để tiền nằm lơ lửng không hạch toán hoặc để nguyên trong `Available Balance` của khách.",
      "Về mặt kỹ thuật Java khi xử lý file đối soát lớn: Luôn nêu rõ 3 từ khóa **kiểm tra `Header/Trailer Checksum`**, **tránh dùng Hibernate `findAll()` gây OOM**, và dùng **`Sort-Merge Streaming` hoặc `Hash-Bucket Partitioning` kèm `Idempotency Key` khi sinh bút toán điều chỉnh**."
    ],
    summaryTakeaways: [
      "Đối soát 3 bên (`Core Ledger <-> Payment Hub <-> Partner File`) là tấm lưới an toàn cuối cùng bảo vệ từng đồng vốn của ngân hàng trước mọi sự cố mạng phân tán.",
      "Tài khoản treo (`Suspense GL`) giữ vai trò vùng đệm kế toán chuẩn mực cho các giao dịch nghi vấn chờ phiên đối soát quyết định `Auto-Settle` hay `Auto-Refund`.",
      "Cửa sổ đệm giáp ranh (`Cut-off Grace Window`) ngăn chặn triệt để thảm họa hoàn tiền nhầm cho các giao dịch vắt ngang qua mốc khóa sổ kế toán nửa đêm.",
      "Thuật toán đối soát quy mô triệu dòng phải kiểm tra toàn vẹn `Trailer`, đọc dạng luồng (`Streaming / Hash Bucketing`) không qua JPA Cache và đảm bảo tính lũy đẳng tuyệt đối khi hạch toán bù."
    ],
    lessonQuestions: [
      {
        question: "Ngân hàng quy định giờ khóa sổ đối soát (`Cut-off Time`) hàng ngày với đối tác chuyển mạch là `23:00:00`. Lúc `22:59:59.600` ngày 10/11, khách hàng thực hiện chuyển tiền 20.000.000đ nhưng gặp lỗi Timeout nên giao dịch đang treo ở `Suspense GL`. Khi chạy Job đối soát file ngày 10/11 vào lúc `00:30` sáng 11/11, hệ thống KHÔNG tìm thấy mã `RRN` của giao dịch này trong file đối tác. Cách xử lý tự động nào là AN TOÀN và ĐÚNG CHUẨN nhất?",
        options: [
          "Tự động hoàn trả ngay lập tức 20.000.000đ từ `Suspense GL` về tài khoản khách hàng vì không có trong file ngày 10/11 nghĩa là chắc chắn giao dịch đã thất bại.",
          "Đánh dấu giao dịch thuộc diện giáp ranh giờ khóa sổ (`CARRY_OVER_CUTOFF_WINDOW`), giữ nguyên tiền trong `Suspense GL` để truy vấn trạng thái trực tiếp hoặc đối chiếu tiếp với file phiên ngày 11/11 trước khi quyết định hoàn tiền.",
          "Tự động ghi nhận doanh thu bất thường 20.000.000đ cho ngân hàng và đóng giao dịch.",
          "Xóa bản ghi giao dịch khỏi `Core Ledger` để hai bên khớp nhau."
        ],
        answer: 1,
        explanation: "Giao dịch phát sinh chỉ cách mốc Cut-off 400ms rất dễ được máy chủ đối tác ghi nhận lúc `23:00:00.150` và xếp vào file quyết toán của phiên ngày 11/11. Nếu vội vàng hoàn tiền ngay trong đêm 10/11, đến phiên 11/11 đối tác thu quyết toán 20 triệu từ ngân hàng thì ngân hàng sẽ mất trắng do người nhận cũng đã rút tiền.",
        wrongReasons: [
          "Rơi thẳng vào bẫy giáp ranh giờ khóa sổ (`Cut-off Boundary Trap`), gây rủi ro thất thoát tiền kép khi giao dịch nằm ở đầu file ngày hôm sau.",
          "",
          "Chiếm giữ tiền hợp pháp của khách hàng vào doanh thu là vi phạm pháp luật và nguyên tắc kế toán ngân hàng.",
          "Sổ cái kế toán bất biến tuyệt đối nghiêm cấm xóa lịch sử giao dịch."
        ]
      },
      {
        question: "Trong quá trình chạy đối soát 3 bên, hệ thống phát hiện một giao dịch trị giá 15.000.000đ có trạng thái tại `Core Banking Ledger` là `FAILED` (chưa hề trích tiền tài khoản khách hàng và cũng không có tiền trong `Suspense GL`), nhưng trong file quyết toán chính thức của đối tác chuyển mạch lại có trạng thái `SETTLED` (đối tác đã trả 15.000.000đ cho ngân hàng thụ hưởng). Hệ thống nên phản ứng thế nào?",
        options: [
          "Âm thầm chạy lệnh trừ cưỡng bức 15.000.000đ vào tài khoản khách hàng kể cả làm số dư của khách bị âm -14.000.000đ mà không cần kiểm tra nguyên nhân.",
          "Bỏ qua không xử lý vì ở phía Core của mình giao dịch đã `FAILED` rồi.",
          "Kích hoạt cảnh báo sự cố nghiêm trọng mức P1 (`CRITICAL_LOSS_ESCALATION`), ghi nhận vào danh sách chênh lệch khẩn cấp chờ tra soát/phê duyệt `Maker-Checker` để điều tra nguyên nhân kỹ thuật và thực hiện quy trình thu hồi/tra soát liên ngân hàng hợp pháp.",
          "Sửa lại file quyết toán của đối tác từ `SETTLED` thành `FAILED` rồi lưu vào kho kiểm toán."
        ],
        answer: 2,
        explanation: "Đây là ca lệch nguy hiểm nhất (đối tác đã chi tiền thực tế dựa trên lệnh từ ngân hàng phát đi, nhưng nội bộ ngân hàng lại Rollback/Failed không thu được nguồn tiền đối ứng). Hệ thống phải báo động P1 tức khắc, khoanh vùng hạch toán phải thu chờ xử lý và kích hoạt quy trình tra soát/thu hồi đúng pháp규 thay vì tự ý trừ âm tài khoản khách hoặc làm ngơ.",
        wrongReasons: [
          "Tự động ghi âm tài khoản CASA không có hạn mức thấu chi mà chưa xác minh lỗi hệ thống sẽ gây khủng hoảng pháp lý và sai phạm quy định quản lý tài khoản.",
          "Làm ngơ sẽ khiến tài khoản Nostro quyết toán tại NHNN/NAPAS bị hụt thật 15.000.000đ không rõ nguyên nhân.",
          "",
          "Sửa dữ liệu file gốc có chữ ký của đối tác chuyển mạch là hành vi gian lận chứng từ kiểm toán nghiêm trọng."
        ]
      }
    ]
  },

  B5: {
    duration: "65 phút",
    difficulty: "Senior / eKYC, Biometrics & Real-Time Fraud/AML",
    codeLang: "java",
    teacherIntro: "Chào em, vài năm trở lại đây, cuộc chiến công nghệ khốc liệt nhất trong các ngân hàng Việt Nam không chỉ còn là cuộc đua xem ai mở tài khoản nhanh hơn, mà là cuộc chiến cân não từng mili-giây chống lại tội phạm công nghệ cao dùng video `Deepfake`, đánh cắp thiết bị qua mã độc Android APK và rửa tiền xuyên biên giới qua hàng loạt tài khoản đi thuê (`Mule Accounts`)! Đặc biệt kể từ khi Ngân hàng Nhà nước ban hành **Quyết định 2345/QĐ-NHNN** và **Thông tư 50/2024/TT-NHNN**, các khái niệm như đọc dữ liệu chip **`NFC CCCD` xác thực chữ ký số Bộ Công An (`RAR/C06`)**, **`Passive Liveness Detection`** chống giả mạo khuôn mặt, và **`Real-Time Fraud / AML Rule Engine`** phản hồi dưới `30ms` đã trở thành xương sống bắt buộc của mọi hệ thống Digital Banking. Hiểu sâu kiến trúc luồng này giúp em tự tin thiết kế những chốt chặn bảo vệ hàng triệu người dùng mà không làm nghẽn cổ chai hiệu năng thanh toán!",
    analogy: {
      title: "Cổng kiểm soát an ninh sân bay tự động E-Gate kết hợp Radar cảnh giới 24/7",
      body: "Em hãy hình dung hệ thống `eKYC` và `Anti-Fraud` của ngân hàng giống hệt cửa xuất nhập cảnh tự động `Autogate` ở sân bay quốc tế: Bước 1 (`OCR`) là máy quét dòng chữ in trên mặt thẻ hộ chiếu để điền nhanh họ tên; nhưng chữ in trên nhựa thì kẻ làm giả khéo tay có thể in nhái được! Vì thế phải có Bước 2 quyết định (`NFC Chip Verification`): đặt thẻ lên đầu đọc sóng ngắn đọc trực tiếp con chip mật mã bên trong thẻ và kiểm tra con dấu chữ ký số của Bộ Công An — thẻ giả đứt bóng 100% ở cửa này! Bước 3 (`Liveness & Face Match`): camera 3D/AI soi xem người đứng trước ống kính có phải người thật bằng xương bằng thịt đang thở không (hay là kẻ gian giơ màn hình iPad phát video Deepfake!) và khớp mặt đó với ảnh gốc lấy từ trong con chip NFC. Sau khi qua cửa vào bên trong rồi, hệ thống `Real-time Fraud Radar` vẫn âm thầm quan sát dưới 30ms ở mỗi giao dịch: nếu bình thường bác nông dân chỉ chuyển 500.000đ ban ngày trên chiếc Samsung cũ, tự dưng 2 giờ sáng đăng nhập trên một máy lạ ở biên giới bấm rút sạch 499 triệu đồng trong 12 giây — Radar lập tức kéo phanh khẩn cấp yêu cầu quét lại khuôn mặt hoặc khóa tạm thời trước khi tiền bốc hơi!"
    },
    objectives: [
      "Làm chủ kiến trúc **Định danh điện tử `eKYC` 4 tầng chuẩn NHNN**: `OCR` -> `NFC Chip Reading (ICAO 9303 Passive/Active Auth & đối chiếu C06/RAR)` -> `AI Liveness Detection` -> `1:1 Face Matching` với ảnh gốc trong chip.",
      "Hiểu nguyên lý vận hành của hệ thống **Chấm điểm Tín dụng (`Credit Scoring` — CIC, Alternative Data, Explainable Scorecard)** và **Sàng lọc Chống rửa tiền (`AML Sanction & PEP Screening`)**.",
      "Thiết kế được **Real-Time Fraud Rule Engine** nằm ngay trên đường găng thanh toán đạt độ trễ `P99 < 30ms` (dùng Java 21 Virtual Threads + Redis Sliding Window Velocity) kèm chính sách **Fail-safe phân tầng theo rủi ro**."
    ],
    flow: [
      {
        step: "1. Multi-Layer eKYC Onboarding (Định danh mở tài khoản chống giả mạo)",
        detail: "Thu thập ảnh CCCD (`OCR`), đọc dữ liệu gốc `DG1/DG2/SOD` từ chip `NFC CCCD` bằng khóa `BAC/PACE`, xác thực chữ ký số chuỗi chứng thư gốc `CSCA/DS` của Bộ Công An (hoặc qua cổng đối chiếu `RAR/C06`), kiểm tra `Liveness` chống Deepfake và so khớp khuôn mặt trực tiếp với ảnh chân dung `DG2` trong chip."
      },
      {
        step: "2. Sanction / Blacklist & Device Fingerprinting (Sàng lọc danh sách đen & Định danh thiết bị)",
        detail: "Đối chiếu họ tên, số CCCD, ngày sinh với danh sách cấm vận/khủng bố/rửa tiền (`OFAC, UN, Danh sách đen Bộ Công An & NHNN`), gắn khóa thiết bị phần cứng (`Device Binding`) trước khi kích hoạt quyền giao dịch tài chính."
      },
      {
        step: "3. Sub-30ms Real-Time Transaction Risk Scoring (Chấm điểm rủi ro giao dịch tức thời)",
        detail: "Mỗi lệnh chuyển tiền đi qua `Fraud Engine` chạy song song trong `< 30ms`: kiểm tra ngưỡng sinh trắc học pháp lý (`> 10 triệu/lần` hoặc `> 20 triệu/ngày`), tần suất bất thường trên Redis (`Velocity Check`), thiết bị mới, tài khoản nhận nằm trong danh sách nghi ngờ lừa đảo."
      },
      {
        step: "4. Adaptive Verdict & Continuous AML Monitoring (Phán quyết thích ứng & Giám sát sau giao dịch)",
        detail: "Trả về 1 trong 4 phán quyết: `ALLOW` (cho đi thẳng), `STEP_UP_BIOMETRIC` (bắt xác thực khuôn mặt khớp dữ liệu chip), `HOLD_FOR_MANUAL_REVIEW` (treo chờ nhân viên gọi xác nhận), hoặc `BLOCK`; đồng thời đẩy sự kiện lên Kafka cho hệ thống `AML Graph` phân tích mạng lưới gom/tán tiền rửa tiền."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu eKYC Chuẩn Ngân hàng: Từ OCR, Liveness chống Deepfake đến Xác thực Chip NFC CCCD",
        paragraphs: [
          "Giai đoạn 2020–2022, nhiều hệ thống `eKYC` thế hệ đầu chỉ chụp ảnh 2 mặt CMND/CCCD (`OCR`) rồi so khớp với ảnh selfie. Kẻ gian nhanh chóng vượt qua bằng cách ghép ảnh thẻ Photoshop chất lượng cao hoặc dùng phần mềm giả lập camera ảo (`Virtual Camera Injection`) bơm video `Deepfake` dựng sẵn vào luồng WebRTC/SDK trên điện thoại đã bị Root/Jailbreak! Để bịt kín hoàn toàn lỗ hổng này, kiến trúc `eKYC` ngân hàng hiện đại bắt buộc kết hợp chặt chẽ **Xác thực Sinh trắc học Sống (`Presentation Attack Detection - PAD / Liveness`)** và **Xác thực Mật mã học Chip NFC CCCD theo chuẩn hộ chiếu điện tử quốc tế `ICAO Doc 9303`**.",
          "Khi điện thoại khách hàng chạm vào con chip NFC sau mặt thẻ CCCD gắn chip (sử dụng chuỗi 12 số CCCD + Ngày sinh + Ngày hết hạn để mở khóa truy cập cơ bản `BAC / PACE`), ứng dụng đọc ra các nhóm dữ liệu chuẩn hóa: `DG1` (thông tin nhân thân MRZ), **`DG2` (ảnh chân dung gốc độ phân giải cao do cơ quan Công an chụp)**, `DG13` (thông tin đặc thù công dân Việt Nam như quê quán, số CMND 9 số cũ) và đặc biệt nhất là đối tượng bảo mật **`SOD (Document Security Object - PKCS#7/CMS)`**. Khi đẩy gói dữ liệu này về Backend Java, bạn TUYỆT ĐỐI KHÔNG bao giờ tin kết quả kiểm tra từ phía Mobile App gửi lên! Backend Java bắt buộc phải thực hiện **`Passive Authentication (PA)`**: tính lại mã băm SHA-256 của `DG1, DG2, DG13` xem có khớp với bảng băm trong `SOD` không, rồi kiểm tra chữ ký số trên `SOD` bằng chuỗi chứng thư số gốc quốc gia (`CSCA -> Document Signer Certificate`) của Bộ Công An và đối chiếu trực tuyến qua dịch vụ xác thực của Trung tâm `RAR (C06)` để chắc chắn thẻ không bị thu hồi hay chỉnh sửa dù chỉ 1 bit!",
          "Song song đó, ở tầng chống giả mạo khuôn mặt (`Liveness` đạt chứng chỉ quốc tế `ISO/IEC 30107-3 Level 2`), hệ thống kết hợp kiểm tra môi trường thiết bị (chặn máy ảo `Emulator`, chặn `Hook/Frida`, ký số khung hình ngay từ Camera SDK phần cứng để chống bơm video giả vào API) với mô hình AI phân tích kết cấu da vi mô, phản xạ ánh sáng màn hình (`Flash/Color Challenge`) rồi lấy vector khuôn mặt thật đó so khớp `1:1` trực tiếp với **ảnh gốc `DG2` lấy từ chip NFC** (chứ không so với ảnh chụp mặt ngoài thẻ nhòe mờ). Đúng theo quy định hiện hành của NHNN, vector sinh trắc học chuẩn này còn được dùng để **xác thực bắt buộc ở tầng giao dịch (`Transaction Biometric Step-up`)** khi chuyển tiền vượt ngưỡng `10.000.000 VNĐ/lần`, tổng lũy kế trong ngày vượt `20.000.000 VNĐ`, hoặc lần đầu kích hoạt ứng dụng trên thiết bị di động mới!"
        ],
        bullets: [
          "Server-Side Verification là bất di bất dịch: Mọi bước xác thực chữ ký `SOD` của chip NFC và chấm điểm `Liveness / Face Similarity` đều phải thực thi tại vùng mạng an toàn phía Backend; Client chỉ đóng vai trò thu thập dữ liệu thô đã mã hóa.",
          "Bảo vệ dữ liệu sinh trắc học nhạy cảm: Theo Nghị định bảo vệ dữ liệu cá nhân (`PDPD`), ảnh khuôn mặt và dữ liệu `CCCD` là dữ liệu cá nhân nhạy cảm bậc nhất — bắt buộc mã hóa `AES-256-GCM` khi lưu trữ, che mờ trong mọi log và phân quyền truy cập tối thiểu.",
          "Chống trùng lặp khuôn mặt (`1:N Face Deduplication`): Ngoài khớp `1:1` với chip CCCD, nhiều ngân hàng chạy thêm tìm kiếm vector `1:N` để phát hiện một đối tượng dùng 1 khuôn mặt đăng ký kèm nhiều hồ sơ giấy tờ khác nhau (tội phạm mở tài khoản rác hàng loạt)."
        ]
      },
      {
        heading: "2. Chấm điểm Tín dụng Số (Digital Credit Scoring) & Sàng lọc Chống Rửa tiền (AML Screening)",
        paragraphs: [
          "Sau khi định danh xong khách hàng là ai (`Know Your Customer`), bài toán lớn tiếp theo của ngân hàng số là quyết định cấp hạn mức thẻ tín dụng / khoản vay tiêu dùng online trong 3 phút (`Digital Lending`) và đảm bảo dòng tiền không dính líu tới tội phạm rửa tiền (`AML - Anti-Money Laundering`). Hệ thống **Chấm điểm Tín dụng (`Credit Scoring Engine`)** của ngân hàng kết hợp 3 nguồn dữ liệu chính: (1) Lịch sử tín dụng chính thống từ **Trung tâm Thông tin Tín dụng Quốc gia (`CIC`)** — kiểm tra khách có đang nợ xấu nhóm 2..5 ở tổ chức tín dụng khác không; (2) Dữ liệu giao dịch nội bộ (`CASA Cashflow`, lịch sử nhận lương đều đặn hàng tháng, thanh toán hóa đơn đúng hạn); và (3) Thẻ điểm mô hình định lượng (`Scorecard / XGBoost` quy đổi về thang điểm chuẩn `PD - Probability of Default`). Điểm cốt lõi trong ngành ngân hàng khác hẳn quảng cáo mạng xã hội là **Tính giải thích được (`Explainability` & Quản trị rủi ro mô hình)**: bạn không thể dùng một mô hình hộp đen không ai hiểu lý do từ chối khách; hệ thống luôn phải lưu lại rõ **Mã lý do từ chối (`Reason Codes`)** và đóng băng bản chụp dữ liệu đầu vào (`Feature Snapshot`) phục vụ kiểm toán tín dụng!",
          "Ở mặt trận **Chống rửa tiền (`AML`)**, pháp luật Việt Nam (Luật Phòng, chống rửa tiền) và chuẩn quốc tế `FATF` đặt ra hai lớp rào chắn rõ rệt: Lớp thứ nhất chạy **Đồng bộ (`Synchronous Pre-Transaction Screening`)** là quét danh sách trừng phạt, khủng bố và cá nhân có ảnh hưởng chính trị (`Sanction Lists: OFAC, UN, EU, Danh sách đen Bộ Công An & Danh sách cảnh báo tài khoản gian lận của NHNN`). Vì tên người Việt hoặc tên phiên âm quốc tế có thể viết đảo thứ tự họ/tên đệm hoặc sai 1 ký tự chính tả (`NGUYEN VAN NAM` vs `NAM VAN NGUYEN`), bộ máy sàng lọc không thể chỉ dùng `String.equals()`, mà phải nạp sẵn cây chỉ mục vào RAM dùng thuật toán khớp mờ (`Fuzzy Token-Sort Ratio / Jaro-Winkler + Ngày sinh + Quốc tịch`) để bắt trúng đối tượng trong vài mili-giây!",
          "Lớp thứ hai chạy **Bất đồng bộ gần thời gian thực (`Near Real-Time Post-Transaction AML`)** qua luồng sự kiện Kafka để bắt các hành vi rửa tiền tinh vi mà nhìn từng giao dịch lẻ không thấy được: điển hình là hành vi **Chia nhỏ giao dịch né ngưỡng báo cáo (`Structuring / Smurfing`)** — ví dụ 30 tài khoản khác nhau liên tục chuyển các khoản `9.900.000đ` (sát dưới ngưỡng kiểm tra sinh trắc học 10 triệu hoặc sát ngưỡng báo cáo giao dịch giá trị lớn) dồn về 1 tài khoản phễu rồi rút ra tiền mặt/mua tài sản số ngay trong vòng 15 phút (`Pass-through Mule Account`)!"
        ],
        bullets: [
          "Tách luồng Gọi CIC chậm khỏi DB Transaction: Truy vấn báo cáo `CIC` bên ngoài có thể mất từ 2 đến 15 giây; tuyệt đối thực hiện qua kiến trúc bất đồng bộ (`Job/Workflow`) có lưu Cache kết quả theo thời hạn quy định, không bao giờ giữ kết nối DB chờ CIC.",
          "Báo cáo Giao dịch Đáng ngờ (`STR - Suspicious Transaction Report`): Khi bộ máy AML phát hiện mô hình luân chuyển tiền lòng vòng (`Circular/Funnel Flow`), hệ thống tự động gom đồ thị giao dịch đẩy lên màn hình Chuyên viên Tuân thủ (`Compliance Officer`) lập hồ sơ báo cáo Cục Phòng, chống rửa tiền.",
          "Danh sách tài khoản nghi ngờ gian lận lừa đảo: Tích hợp danh sách cảnh báo tài khoản nhận tiền đáng ngờ để ngay ở màn hình `Inquiry` bước 1 chuyển tiền, app hiện băng rôn màu đỏ cảnh báo khách hàng dừng tay trước khi bị lừa chuyển khoản!"
        ]
      },
      {
        heading: "3. Kiến trúc Real-Time Fraud Rule Engine Đạt SLA < 30ms & Chính sách Fail-Safe Sống còn",
        paragraphs: [
          "Đây là bài toán thiết kế hệ thống cực hay trong vòng phỏng vấn System Design Ngân hàng: 'Bộ máy `Fraud Rule Engine` được đặt chặn ngay trước khi tiền rời khỏi ngân hàng trên luồng chuyển tiền nhanh 24/7 chịu tải `3.000 TPS`. Làm sao để chạy 25 quy tắc kiểm tra gian lận mà tổng thời gian tăng thêm không vượt quá `30 mili-giây` (`P99 < 30ms`), và nếu cụm Fraud Engine bị sập hoặc quá tải thì giao dịch thanh toán của toàn ngân hàng có dừng hẳn không?'.",
          "Để đạt ngưỡng **`< 30ms`**, bạn phải áp dụng triệt để nguyên tắc **`Zero Disk-DB Query on Hot Path` (Không chạm ổ cứng SQL chậm chạp trên luồng nóng!)**: (1) Toàn bộ tập quy tắc động (`Dynamic Rules` do chuyên gia Quản trị Rủi ro cấu hình trên giao diện không cần redeploy code) được đồng bộ sẵn vào **In-Memory Local Cache (`Caffeine`)** của từng Pod thông qua Kafka/Redis PubSub; (2) Các chỉ số thống kê hành vi theo cửa sổ trượt thời gian (`Sliding Window Velocity Features` — như: số lần chuyển tiền trong 60 giây qua, tổng tiền đã chuyển trong 24 giờ qua, số tài khoản đích mới lạ vừa thêm trong 10 phút qua, thời gian kể từ lúc vừa đổi mật khẩu/đổi thiết bị) được cập nhật và đọc nguyên tử trên **Redis Cluster** trong `1–2ms`; (3) Dùng **Java 21 `Virtual Threads`** chạy song song việc kiểm tra Danh sách đen trên RAM + đọc Feature từ Redis + chấm điểm tập luật có giới hạn thời gian cứng `25ms`!",
          "Và câu hỏi 'ăn điểm' cấp độ Principal Architect nằm ở **Chính sách `Fail-Safe` (Xử lý khi Fraud Service lỗi/Timeout)**: Nếu trả lời 'Em cấu hình `Fail-Open` (cho qua hết) để khách không bị gián đoạn' -> Kẻ tấn công chỉ cần DDoS làm lag Fraud Service rồi ung dung rút sạch hàng chục tỷ đồng! Nhưng nếu trả lời 'Em cấu hình `Fail-Closed` (chặn chết 100%)' -> Chỉ vì 1 cụm Redis rủi ro bảo trì mà hàng triệu người dân không trả được bát phở 40.000đ sáng thứ Hai! Kiến trúc chuẩn ngân hàng là **`Tiered Risk-Based Fail-Safe` (Dự phòng phân tầng theo mức độ rủi ro tĩnh)**: Khi Fraud Engine không phản hồi kịp `25ms`, hệ thống tự động chuyển sang bộ luật tĩnh cục bộ ngay trên Pod thanh toán: Với giao dịch giá trị nhỏ (ví dụ `< 2.000.000đ`), trên thiết bị quen thuộc đã gắn kết lâu năm và hạn mức ngày còn thấp -> cho phép đi tiếp (`Fallback ALLOW` kèm gắn cờ kiểm tra hậu kiểm tức thì); nhưng với giao dịch giá trị lớn (`>= 10.000.000đ`), hoặc thiết bị mới kích hoạt dưới 24h, hoặc chuyển ra nước ngoài -> bắt buộc **`Fallback STEP_UP_BIOMETRIC` hoặc `BLOCK`** để bảo toàn tuyệt đối an toàn tài sản!"
        ],
        bullets: [
          "Shadow Mode (Chạy thử luật ngầm trước khi bật chặn thật): Mỗi khi đội Rủi ro viết một luật mới (ví dụ chặn chuyển tiền lúc 1h–4h sáng nếu vừa cài app lạ), hệ thống luôn có cờ `SHADOW_ONLY` để chạy chấm điểm thật trên luồng Production và ghi log thống kê xem luật đó có chặn nhầm khách thật (`False Positive Rate`) không, trước khi chuyển sang `ENFORCE`!",
          "Combo Kịch bản Chiếm đoạt Tài khoản (`ATO - Account Takeover`) kinh điển cần chặn: `Đổi thiết bị mới + Tắt/Đổi phương thức OTP + Rút trước hạn sổ tiết kiệm online + Chuyển hết hạn mức ra ngoài trong < 5 phút` -> Phải kích hoạt khóa khẩn cấp `HOLD / BLOCK` ngay lập tức.",
          "Audit đầy đủ Phiên bản Bộ luật (`RuleSet Version`): Mọi giao dịch đều lưu lại `ruleSetVersion` và danh sách các mã luật đã kích hoạt (`triggeredRules`) để giải trình rõ ràng khi khách hàng thắc mắc vì sao giao dịch bị yêu cầu quét mặt."
        ]
      }
    ],
    comparison: {
      title: "Phân tầng Các Lớp Phòng thủ Rủi ro trong Hệ thống Ngân hàng Số Hiện đại",
      headers: ["Lớp phòng thủ", "Thời điểm kích hoạt & SLA", "Kỹ thuật cốt lõi", "Hành động khi phát hiện rủi ro"],
      rows: [
        [
          "eKYC & NFC Chip Verification",
          "Lúc mở tài khoản / Đổi thiết bị / Cấp lại Smart OTP (`SLA 1–3 giây`)",
          "Đọc chip `NFC CCCD (DG2/SOD)`, kiểm chứng chữ ký số `CSCA/RAR C06`, `AI Liveness ISO 30107-3`",
          "Từ chối kích hoạt hồ sơ giả mạo/Deepfake ngay từ cửa ngõ; lưu vector khuôn mặt gốc chuẩn"
        ],
        [
          "Pre-Txn Sanction & Blacklist",
          "Đồng bộ ngay trước khi hạch toán (`SLA < 5ms` trên RAM)",
          "Cây tìm kiếm trong bộ nhớ + Khớp mờ `Fuzzy Matching` trên danh sách `OFAC/UN/BCA/Tài khoản lừa đảo`",
          "Chặn cứng giao dịch cấm vận (`BLOCK_AML`) hoặc bật cảnh báo đỏ trên màn hình khách hàng"
        ],
        [
          "Real-Time Fraud Rule Engine",
          "Đồng bộ trên luồng thanh toán (`SLA P99 < 30ms`)",
          "In-memory Rule Engine + Redis `Sliding Window Velocity` + Ngưỡng sinh trắc học `10tr / 20tr VNĐ`",
          "Phán quyết thích ứng: `ALLOW`, `STEP_UP_NFC_BIOMETRIC`, `HOLD_FOR_CALL` hoặc `BLOCK`"
        ],
        [
          "Post-Txn AML Graph Analytics",
          "Bất đồng bộ qua Kafka Stream (`SLA giây – phút`)",
          "Phân tích đồ thị dòng tiền gom/tán (`Mule Network`, `Smurfing` chia nhỏ tiền né ngưỡng)",
          "Khoanh vùng tài khoản đáng ngờ, tạo hồ sơ điều tra cho bộ phận Tuân thủ lập báo cáo `STR`"
        ]
      ]
    },
    codeTitle: "Java 21: Real-Time Fraud & Biometric Step-Up Engine (< 30ms SLA + Tiered Fail-Safe)",
    code: [
      "package vn.finjava.risk.fraud;",
      "",
      "import java.math.BigDecimal;",
      "import java.util.concurrent.*;",
      "",
      "public final class RealTimeFraudEngine {",
      "    private static final BigDecimal SINGLE_BIO_LIMIT = new BigDecimal(\"10000000\");",
      "    private static final BigDecimal DAILY_BIO_LIMIT = new BigDecimal(\"20000000\");",
      "    private static final BigDecimal LOW_RISK_FALLBACK_MAX = new BigDecimal(\"2000000\");",
      "",
      "    public enum Verdict { ALLOW, STEP_UP_NFC_BIOMETRIC, HOLD_FOR_REVIEW, BLOCK_AML_OR_ATO }",
      "    public record TxnRiskContext(String cif, String destAccount, BigDecimal amount, BigDecimal dailyTotalBefore,",
      "                                 boolean trustedDevice, boolean biometricVerified, int txnsLast60Sec, int hourOfDay) {}",
      "",
      "    public static Verdict evaluateWithSla(TxnRiskContext ctx, Callable<Boolean> sanctionCheck, Callable<Boolean> muleCheck) {",
      "        if (!ctx.biometricVerified() && (ctx.amount().compareTo(SINGLE_BIO_LIMIT) > 0",
      "                || ctx.dailyTotalBefore().add(ctx.amount()).compareTo(DAILY_BIO_LIMIT) > 0)) {",
      "            return Verdict.STEP_UP_NFC_BIOMETRIC;",
      "        }",
      "        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {",
      "            Future<Boolean> sanctionHit = exec.submit(sanctionCheck);",
      "            Future<Boolean> muleHit = exec.submit(muleCheck);",
      "            if (Boolean.TRUE.equals(sanctionHit.get(25, TimeUnit.MILLISECONDS))) return Verdict.BLOCK_AML_OR_ATO;",
      "            int riskScore = calcBehaviorScore(ctx, Boolean.TRUE.equals(muleHit.get(10, TimeUnit.MILLISECONDS)));",
      "            if (riskScore >= 90) return Verdict.BLOCK_AML_OR_ATO;",
      "            if (riskScore >= 60) return Verdict.HOLD_FOR_REVIEW;",
      "            return riskScore >= 35 && !ctx.biometricVerified() ? Verdict.STEP_UP_NFC_BIOMETRIC : Verdict.ALLOW;",
      "        } catch (Exception timeoutOrInfraErr) {",
      "            return (ctx.trustedDevice() && ctx.amount().compareTo(LOW_RISK_FALLBACK_MAX) <= 0)",
      "                    ? Verdict.ALLOW : Verdict.STEP_UP_NFC_BIOMETRIC;",
      "        }",
      "    }",
      "",
      "    private static int calcBehaviorScore(TxnRiskContext ctx, boolean isSuspectMuleDest) {",
      "        int score = (isSuspectMuleDest ? 70 : 0) + (!ctx.trustedDevice() ? 40 : 0) + (ctx.txnsLast60Sec() >= 5 ? 35 : 0);",
      "        if (ctx.hourOfDay() >= 1 && ctx.hourOfDay() <= 4 && ctx.amount().compareTo(LOW_RISK_FALLBACK_MAX) > 0) score += 25;",
      "        return score;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Chốt chặn pháp lý cứng ngay đầu hàm (`SINGLE_BIO_LIMIT = 10.000.000đ` và `DAILY_BIO_LIMIT = 20.000.000đ`): Áp dụng đúng chuẩn xác thực sinh trắc học theo quy định NHNN — nếu vượt ngưỡng mà cờ `biometricVerified` chưa bật thì lập tức trả `STEP_UP_NFC_BIOMETRIC` không cần tốn tài nguyên gọi mạng.",
      "`Executors.newVirtualThreadPerTaskExecutor()` của Java 21: Thực thi song song việc kiểm tra danh sách trừng phạt (`sanctionCheck`) và kiểm tra tài khoản đích nghi ngờ lừa đảo (`muleDestCheck`) dưới ngưỡng cắt cứng `25ms` để bảo vệ tuyệt đối SLA của luồng chuyển tiền.",
      "Khối `catch` triển khai **`Tiered Risk-Based Fail-Safe`**: Nếu dịch vụ rủi ro bên dưới bị Timeout quá `25ms`, hệ thống chỉ cho phép `ALLOW` với giao dịch nhỏ (`<= 2.000.000đ`) trên thiết bị tin cậy (`trustedDevice == true`), còn mọi trường hợp khác đều nâng mức bảo vệ lên `STEP_UP_NFC_BIOMETRIC` thay vì mở toang cửa cho hacker!"
    ],
    labGuide: {
      goal: "Cài đặt và kiểm thử bộ máy chấm điểm rủi ro giao dịch dưới 30ms trên Java 21, kiểm chứng đầy đủ các kịch bản ngưỡng sinh trắc học 10tr/20tr, kịch bản chiếm đoạt tài khoản lúc 2h sáng và cơ chế Fail-safe khi Redis bị chậm.",
      steps: [
        "Bước 1: Viết bộ JUnit 5 kiểm tra 3 kịch bản ngưỡng pháp lý: chuyển 8.000.000đ lần đầu trong ngày trên máy quen (`ALLOW`), chuyển tiếp lệnh thứ hai 13.000.000đ làm tổng ngày lên 21.000.000đ khi chưa quét mặt (`STEP_UP_NFC_BIOMETRIC`), và thử lại lệnh đó sau khi `biometricVerified = true` (`ALLOW`).",
        "Bước 2: Giả lập kịch bản `Account Takeover (ATO)`: `trustedDevice = false` (+40 điểm), lúc 2 giờ sáng `hourOfDay = 2` với số tiền 9.500.000đ (+25 điểm) và bắn dồn dập `txnsLast60Sec = 6` (+35 điểm) -> Tổng `100 điểm >= 90` bị chặn đứng ngay với `BLOCK_AML_OR_ATO`.",
        "Bước 3: Giả lập lỗi mạng `Thread.sleep(100)` bên trong `sanctionCheck` để vượt ngưỡng SLA `25ms`, kiểm chứng giao dịch 500.000đ trên thiết bị quen vẫn `ALLOW` mượt mà nhưng giao dịch 9.000.000đ hoặc trên thiết bị lạ lập tức tự động kích hoạt `STEP_UP_NFC_BIOMETRIC`.",
        "Bước 4: Chạy benchmark 10.000 lượt đánh giá đồng thời với Virtual Threads để xác nhận thời gian xử lý `P99` nằm gọn dưới `30ms`."
      ],
      expectedOutput: "Toàn bộ kịch bản vượt ngưỡng 10tr/lần hoặc 20tr/ngày, kịch bản ATO ban đêm và kịch bản Timeout hạ tầng đều trả về phán quyết đúng thiết kế 100% với độ trễ P99 < 30ms."
    },
    examTips: [
      "Câu hỏi thực tế hay gặp nhất tại các ngân hàng Việt Nam hiện nay: 'Tại sao chỉ chụp ảnh mặt thẻ CCCD (OCR) không chống được giả mạo mà phải đọc chip NFC?' — Vì dữ liệu bên trong chip NFC (`DG1, DG2`) được bảo vệ bởi chữ ký số mật mã học trong `SOD` của Bộ Công An (`CSCA/RAR C06`); Backend kiểm chứng chữ ký số đó sẽ phát hiện ngay mọi thẻ nhựa làm giả, đồng thời lấy được ảnh chân dung gốc chất lượng cao trong `DG2` để khớp với khuôn mặt sống.",
      "Bẫy thiết kế hiệu năng AML/Fraud: Đừng bao giờ thiết kế luồng thanh toán gọi trực tiếp câu lệnh `SELECT COUNT(*), SUM(amount) FROM ledger_postings WHERE account_id = ? AND created_at > now() - interval '24 hours'` trên bảng sổ cái tỷ dòng cho MỌI giao dịch chuyển tiền! Hãy tính toán sẵn các biến `Velocity` này trên Redis (dùng Lua Script / Atomic Counter).",
      "Khi trả lời câu hỏi 'Fraud Engine sập thì chặn hết hay cho qua hết?': Luôn ghi điểm tuyệt đối bằng cụm từ **`Tiered Risk-Based Fail-Safe`** (cho qua có kiểm soát hậu kiểm với giao dịch nhỏ trên thiết bị quen, bắt buộc Step-up sinh trắc học hoặc chặn tạm với giao dịch lớn / thiết bị lạ)."
    ],
    summaryTakeaways: [
      "`eKYC` chuẩn ngân hàng phải kết hợp `NFC Chip Authentication` (xác thực chữ ký số `SOD` phía Server + đối chiếu `RAR/C06`) với `AI Liveness Detection` chống Deepfake và khớp mặt `1:1` với ảnh gốc `DG2`.",
      "Mọi giao dịch chuyển tiền vượt ngưỡng pháp lý (`> 10 triệu/lần` hoặc lũy kế `> 20 triệu/ngày`) hoặc đổi thiết bị mới đều bắt buộc nâng cấp xác thực sinh trắc học khớp dữ liệu gốc trong chip CCCD.",
      "`Real-Time Fraud Engine` đạt SLA `< 30ms` nhờ lưu bộ luật trên RAM (`Caffeine`), đọc chỉ số hành vi trượt trên `Redis` và chạy song song bằng Java 21 `Virtual Threads` kèm chế độ thử nghiệm `Shadow Mode`.",
      "Hệ thống phòng chống rửa tiền kết hợp 2 tầng: sàng lọc danh sách đen đồng bộ trước giao dịch (`Fuzzy Sanction Screening`) và phân tích đồ thị dòng tiền gom/tán bất đồng bộ qua Kafka (`Post-Txn AML`)."
    ],
    lessonQuestions: [
      {
        question: "Một kẻ tấn công mua bản ghi video khuôn mặt của nạn nhân rồi dùng phần mềm bẻ khóa trên điện thoại Rooted bơm trực tiếp kết quả JSON `{\"nfcVerified\": true, \"faceMatchScore\": 0.99}` từ phía Client lên API mở tài khoản của ngân hàng. Thiết kế kiến trúc Backend nào dưới đây chặn đứng hoàn toàn cuộc tấn công này?",
        options: [
          "Mã hóa chuỗi JSON đó bằng Base64 ở phía Mobile App trước khi gửi lên Server.",
          "Backend tuyệt đối không tin cờ boolean từ Client; yêu cầu gửi dữ liệu thô `DG1, DG2, SOD` đọc từ chip NFC để Server tự xác thực chữ ký số chuỗi chứng thư gốc Bộ Công An (`Passive Authentication` / đối chiếu `RAR C06`), kết hợp xác thực luồng ảnh Liveness ký số từ SDK chống giả mạo phía Server rồi mới tự so khớp khuôn mặt với ảnh gốc `DG2`.",
          "Tăng thời gian hết hạn của JWT Access Token lên 30 ngày.",
          "Chỉ cần kiểm tra họ tên gõ tay trên form trùng với họ tên trong JSON gửi lên là đủ."
        ],
        answer: 1,
        explanation: "Nguyên tắc Zero Trust trong eKYC quy định mọi kết quả thẩm định từ phía thiết bị đầu cuối đều có thể bị giả mạo nếu máy bị Root/Hook. Chỉ khi Backend trực tiếp kiểm chứng chữ ký mật mã PKCS#7 trong đối tượng `SOD` của chip NFC (chứng minh dữ liệu `DG1/DG2` thực sự do Bộ Công An ký phát hành), đối chiếu qua cổng RAR/C06 và tự chạy kiểm chứng Liveness + khớp mặt với ảnh `DG2` ngay trên Server thì mới đảm bảo chống giả mạo 100%.",
        wrongReasons: [
          "Base64 chỉ là bảng mã biểu diễn văn bản chứ không phải mã hóa bảo mật; kẻ tấn công dễ dàng tạo chuỗi Base64 giả trong 1 giây.",
          "",
          "Tăng thời hạn Token không liên quan đến xác thực danh tính gốc và còn làm tăng nguy cơ lộ lọt phiên đăng nhập.",
          "Kẻ tấn công đang chủ động tạo ra cả form lẫn gói JSON giả nên việc hai chuỗi tự điền trùng nhau hoàn toàn vô nghĩa."
        ]
      },
      {
        question: "Trên hệ thống Chuyển tiền nhanh 24/7 chịu tải 2.500 TPS, cụm máy chủ `Fraud Rule Engine` đột ngột gặp sự cố mạng khiến thời gian phản hồi vọt lên 4.000ms (vượt xa SLA 30ms). Chiến lược dự phòng (`Fallback`) nào của Payment Service vừa bảo vệ trải nghiệm người dùng phổ thông vừa ngăn chặn kẻ gian lợi dụng sự cố rút sạch tiền?",
        options: [
          "Cấu hình `Fail-Open` tuyệt đối: tự động duyệt `ALLOW` tất cả mọi giao dịch kể cả lệnh rút 500 triệu đồng trên thiết bị lạ vừa đăng nhập.",
          "Đợi đủ 60 giây cho mỗi giao dịch trên kết nối đồng bộ để giữ nguyên DB Transaction.",
          "Áp dụng `Tiered Risk-Based Fail-Safe` với ngắt mạch nhanh (`25–30ms Timeout`): chỉ cho phép giao dịch giá trị nhỏ trên thiết bị đã định danh tin cậy (kèm đẩy sự kiện hậu kiểm ngay), còn các giao dịch giá trị cao hoặc từ thiết bị mới bắt buộc yêu cầu xác thực sinh trắc học (`STEP_UP_BIOMETRIC`) hoặc tạm giữ an toàn.",
          "Tắt kiểm tra số dư khả dụng của Core Banking để bù lại thời gian bị trễ."
        ],
        answer: 2,
        explanation: "Chính sách dự phòng phân tầng theo rủi ro (`Tiered Risk-Based Fail-Safe`) cân bằng tối ưu giữa tính sẵn sàng và an toàn tài sản: hàng triệu giao dịch mua sắm nhỏ lẻ hàng ngày trên máy chính chủ không bị tê liệt khi dịch vụ phụ trợ chập chờn, đồng thời khóa chặt các giao dịch rủi ro cao/giá trị lớn bằng lớp sinh trắc học hoặc tạm giữ.",
        wrongReasons: [
          "`Fail-Open` mù quáng cho cả giao dịch lớn trên thiết bị lạ sẽ biến sự cố hạ tầng thành cơ hội vàng cho tội phạm rút cạn tài khoản.",
          "Giữ luồng và DB Connection suốt 60s ở mức tải 2.500 TPS sẽ làm cạn sạch Connection Pool và đánh sập dây chuyền toàn bộ Core Banking trong vài giây.",
          "",
          "Không bao giờ được phép bỏ qua bước kiểm tra số dư khả dụng vì sẽ gây rút âm tiền trực tiếp trên sổ cái."
        ]
      }
    ]
  },

  B6: {
    duration: "60 phút",
    difficulty: "Senior / Open Banking, BaaS & FAPI 2.0",
    codeLang: "java",
    teacherIntro: "Chào em, chúng ta đã đi tới mảnh ghép cuối cùng nhưng cũng mang tầm nhìn tương lai rộng mở nhất của Học phần B: **Ngân hàng Mở (`Open Banking`) và `Banking-as-a-Service (BaaS)`**! Nếu như 10 năm trước ngân hàng giống như một pháo đài đóng kín cửa chỉ giao dịch qua quầy hoặc ứng dụng riêng của mình, thì hôm nay các dịch vụ tài chính đang hiện diện mượt mà ngay bên trong phần mềm kế toán ERP doanh nghiệp, siêu ứng dụng gọi xe, sàn thương mại điện tử và nền tảng quản lý tài chính cá nhân. Tại Việt Nam, việc Ngân hàng Nhà nước ban hành **Thông tư 64/2024/TT-NHNN quy định về triển khai giao diện lập trình ứng dụng mở (`Open API`) trong ngành Ngân hàng** đã chính thức thổi bùng làn sóng tuyển dụng các kiến trúc sư Java am hiểu sâu về **Quản trị sự đồng ý của khách hàng (`Fine-Grained Consent Management`)**, chuẩn bảo mật cấp độ tài chính **`FAPI 2.0`** (`mTLS Sender-Constrained Tokens`, `PAR`, `JWS`) và kiến trúc **`Multi-Tenant Partner Sandbox`**. Nắm chắc bài B6 này, em đã sẵn sàng ngồi vào bàn thiết kế nền tảng API chiến lược cho bất kỳ ngân hàng nào!",
    analogy: {
      title: "Chiếc thẻ từ Valet Parking chỉ mở được vô-lăng trong 2 tiếng, khóa chặt cốp xe chứa vàng",
      body: "Em hãy hình dung khách hàng giao xe hơi sang trọng của mình cho nhân viên đỗ xe khách sạn (`TPP - Third-Party Provider`, ví dụ phần mềm kế toán MISA hay ứng dụng quản lý chi tiêu). Thời chưa có `Open Banking` chuẩn mực, nhiều ứng dụng đòi khách hàng nhập thẳng Tên đăng nhập và Mật khẩu Internet Banking của mình vào app bên thứ ba (`Screen Scraping`) — chẳng khác nào đưa luôn chùm chìa khóa gốc mở cả nhà lẫn két sắt cho người lạ! Còn với `Open Banking & Consent Management`, ngân hàng phát hành một chiếc **Thẻ từ Phụ Giới hạn (`Scoped Consent + Sender-Constrained Token`)** có 4 ràng buộc sắt đá: (1) Chỉ cấp cho đúng nhân viên khách sạn mang thẻ định danh đã đăng ký (`mTLS Bound Certificate`); (2) Chỉ cho phép xem đồng hồ công-tơ-mét của đúng chiếc xe biển số `30A-123.45` (`Account-level Consent`: khách có 5 tài khoản tiết kiệm tỷ đồng khác ở cùng ngân hàng thì bên thứ ba hoàn toàn mù tịt không thấy!); (3) Chỉ đọc được lịch sử chạy xe chứ không được bấm chuyển tiền (`Granular Scope`); và (4) Tự động hết hiệu lực sau đúng 90 ngày hoặc bất cứ giây nào chủ xe bấm nút 'Thu hồi quyền' ngay trên app ngân hàng!"
    },
    objectives: [
      "Phân biệt rõ mô hình kinh doanh & kỹ thuật của **`Open Banking`** (chia sẻ dữ liệu/khởi tạo thanh toán theo sự cho phép của khách hàng qua `TPP`) với **`BaaS (Banking-as-a-Service)`** (nhúng trọn vẹn sản phẩm tài khoản/thẻ/vay của ngân hàng vào nền tảng đối tác).",
      "Thiết kế được hệ thống **Quản trị Consent Chi tiết (`Fine-Grained Consent Engine`)** gắn chặt từng `tppClientId` + danh sách `accountNumbers` được phép + `permissions` + hạn mức + thời hạn hiệu lực + cơ chế thu hồi tức thời (`Instant Revocation`).",
      "Áp dụng thành thạo bộ tiêu chuẩn bảo mật cấp độ tài chính **`FAPI 2.0` (`Financial-grade API`)**: `PAR (Pushed Authorization Requests)`, `PKCE`, `Mutual TLS Certificate-Bound Access Tokens (RFC 8705 cnf.x5t#S256)` và môi trường **`Partner Developer Sandbox`** tách biệt tuyệt đối khỏi Production."
    ],
    flow: [
      {
        step: "1. TPP Onboarding & PAR Consent Initiation (Đăng ký Đối tác & Đẩy yêu cầu Ủy quyền)",
        detail: "Đối tác thứ ba (`TPP`) đã được thẩm định cấp chứng chỉ `mTLS` gọi kênh hậu trường `POST /par` (ký `private_key_jwt`) gửi chi tiết phạm vi quyền muốn xin (`READ_BALANCE`, thời hạn 90 ngày) lên Ngân hàng và nhận về một `request_uri` ngắn hạn chống lộ tham số trên trình duyệt."
      },
      {
        step: "2. Customer Strong Authentication & Account Selection (Khách hàng chọn Tài khoản cấp quyền)",
        detail: "Khách hàng được chuyển sang giao diện chính chủ của Ngân hàng, xác thực mạnh (`SCA / Biometrics`), tự tay tích chọn ĐÚNG 1 trong 4 tài khoản CASA muốn chia sẻ cho `TPP` đó; Ngân hàng lưu bản ghi `Consent` trạng thái `ACTIVE` gắn chữ ký kiểm toán."
      },
      {
        step: "3. Sender-Constrained Token Issuance (Cấp Access Token Khóa chặt Chứng chỉ mTLS)",
        detail: "Khi `TPP` đổi `authorization_code` qua kết nối `mTLS`, Ngân hàng nhúng mã băm SHA-256 của chứng chỉ X.509 của `TPP` vào trường `cnf.x5t#S256` bên trong Access Token kèm `consent_id`."
      },
      {
        step: "4. Multi-Gate Enforcement & Instant Revocation (Kiểm chứng 4 lớp & Thu hồi tức thời)",
        detail: "Mỗi lượt gọi Open API đi qua Gateway & Consent Guard kiểm tra: chứng chỉ mTLS khớp `cnf.x5t#S256`, `Consent` chưa bị khách bấm hủy trên Redis/DB, đúng `Scope` và đúng `accountNo` nằm trong danh sách tài khoản đã ủy quyền."
      }
    ],
    sections: [
      {
        heading: "1. Open Banking vs Banking-as-a-Service (BaaS) & Thiết kế Hệ thống Quản trị Consent Chuẩn mực",
        paragraphs: [
          "Trong các buổi thảo luận kiến trúc cấp cao, rất nhiều ứng viên đánh đồng `Open Banking` và `BaaS` là một, nhưng thực tế hai mô hình này giải quyết hai bài toán khác nhau trên cùng nền tảng API: **`Open Banking`** (theo khung pháp lý như PSD2 châu Âu hay Thông tư 64/2024/TT-NHNN tại Việt Nam) tập trung vào quyền làm chủ dữ liệu của khách hàng — cho phép khách hàng ủy quyền an toàn cho các **Tổ chức Cung cấp Dịch vụ Thứ ba (`TPP`)** truy cập thông tin tài khoản (`AIS - Account Information Service`, ví dụ đồng bộ sổ phụ thời gian thực về phần mềm ERP doanh nghiệp) hoặc khởi tạo lệnh thanh toán (`PIS - Payment Initiation Service`). Trong khi đó, **`Banking-as-a-Service (BaaS) / Embedded Finance`** là mô hình ngân hàng đóng gói toàn bộ năng lực lõi được cấp phép của mình (mở tài khoản định danh, phát hành thẻ đồng thương hiệu, ví trả sau, giải ngân vi mô) thành bộ API đa thuê bao (`Multi-Tenant BaaS Platform`) để các tập đoàn bán lẻ, hãng hàng không hay nền tảng thương mại điện tử nhúng thẳng dịch vụ ngân hàng vào bên trong hành trình mua sắm của họ.",
          "Trái tim nghiệp vụ của Open Banking chính là **Mô hình Dữ liệu `Consent` (Sự chấp thuận của khách hàng)**. Sai lầm chí mạng nhất của các lập trình viên chỉ quen làm OAuth2 cơ bản là nghĩ rằng: 'Chỉ cần kiểm tra JWT Access Token có `scope = account:read` và lấy `sub = cif_khach_hang` là cho đọc bất kỳ tài khoản nào của khách hàng đó!'. Trong ngân hàng, cách làm đó là **lỗ hổng rò rỉ dữ liệu nghiêm trọng**! Một giám đốc doanh nghiệp hoặc khách hàng cá nhân có thể sở hữu 4 tài khoản tại cùng một ngân hàng: 1 tài khoản chi tiêu vặt hàng ngày, 1 tài khoản nhận lương, và 2 sổ tiết kiệm tích sản 10 tỷ đồng. Khi họ liên kết ứng dụng ghi chép chi tiêu, họ CHỈ ĐỒNG Ý chia sẻ duy nhất tài khoản chi tiêu vặt!",
          "Do đó, thực thể `Consent` trong Database của bạn bắt buộc phải quản lý độc lập với phiên đăng nhập OAuth2 và lưu đầy đủ 6 chiều thông tin: (1) `consent_id` duy nhất; (2) Định danh đối tác `tpp_client_id` và chủ sở hữu `customer_cif`; (3) **Danh sách tường minh các số tài khoản được phép (`authorized_account_nos`)**; (4) Danh sách quyền chi tiết trên từng tài khoản (`READ_BALANCE`, `READ_TRANSACTIONS`, `INITIATE_PAYMENT`) cùng giới hạn dữ liệu (ví dụ chỉ cho đọc lịch sử sao kê tối đa 90 ngày gần nhất, hoặc hạn mức khởi tạo thanh toán tối đa `5.000.000đ/ngày`); (5) Thời điểm hết hạn `expires_at` (thường tối đa 90–180 ngày phải gia hạn xác thực lại); và (6) Máy trạng thái vòng đời `AWAITING_AUTHORISATION -> ACTIVE -> REVOKED | EXPIRED` kèm màn hình **Trung tâm Quản lý Kết nối (`Consent Dashboard`)** ngay trên Mobile Banking để khách hàng bấm 1 nút là ngắt kết nối tức thì với bất kỳ đối tác nào!"
        ],
        bullets: [
          "AIS Consent vs PIS Consent: Quyền xem thông tin (`AIS`) thường có hiệu lực dài hạn có điều kiện (ví dụ 90 ngày cho ERP đọc sao kê tự động), trong khi quyền khởi tạo thanh toán (`PIS`) mặc định là **Ủy quyền Đơn chiếc (`Single-Use Payment Consent`)** gắn chặt với đúng số tiền + tài khoản thụ hưởng và tiêu hủy ngay sau 1 lần thực thi (trừ loại thanh toán định kỳ có hạn mức trần `VRP`).",
          "Thu hồi tức thời (`Zero-Latency Revocation`): Ngay giây phút khách hàng bấm 'Hủy ủy quyền' trên app ngân hàng, hệ thống phải vừa cập nhật DB vừa đẩy `consent_id` vào Redis Denylist / PubSub để mọi API Call từ `TPP` bị chặn đứng với `HTTP 403 CONSENT_REVOKED` ngay lập tức, không chờ Access Token hết hạn!",
          "Lưu vết truy cập dữ liệu (`Data Access Audit Log`): Mọi lượt `TPP` đọc số dư hay sao kê của khách đều phải ghi nhận bất biến `Ai (TPP nào) - Đọc tài khoản nào - Theo Consent nào - Lúc mấy giờ` để minh bạch với khách hàng và cơ quan thanh tra."
        ]
      },
      {
        heading: "2. Tại sao OAuth2 Thường Không Đủ cho Ngân hàng? Chuẩn Bảo mật FAPI 2.0 (Financial-grade API)",
        paragraphs: [
          "OAuth 2.0 thông thường trên các mạng xã hội dùng **`Bearer Token`** — chữ `Bearer` trong tiếng Anh tài chính có nghĩa là 'người cầm phiếu vô danh': giống như tờ tiền giấy, bất kỳ ai nhặt được hoặc đánh cắp được chuỗi Access Token đó từ log máy chủ của đối tác đều có thể mang đi gọi API ngân hàng y như thật! Chưa hết, ở luồng OAuth2 truyền thống, các tham số nhạy cảm như `scope`, số tiền thanh toán được truyền lộ liễu trên thanh địa chỉ URL trình duyệt (`GET /authorize?client_id=...&amount=5000000`) rất dễ bị mã độc trên trình duyệt sửa trộm hoặc rò rỉ qua `Referer Header`.",
          "Để khắc phục triệt để các điểm yếu này, Tổ chức `OpenID Foundation` đã ban hành bộ đặc tả **`FAPI 2.0` (`Financial-grade API Security Profile`)** — tiêu chuẩn bảo mật khắt khe nhất thế giới dành riêng cho Open Banking! Trụ cột thứ nhất của FAPI 2.0 là **`Sender-Constrained Access Tokens` (Token khóa chặt vào người gửi)** thông qua chuẩn **`RFC 8705 (OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens)`** hoặc `DPoP`: Khi Ngân hàng cấp Access Token cho đối tác `TPP`, máy chủ Ủy quyền tính mã băm SHA-256 của chứng chỉ số X.509 mà `TPP` dùng bắt tay `mTLS` và đóng dấu mã băm đó vào claim **`cnf: {\"x5t#S256\": \"...\"}`** bên trong JWT. Sau đó, mỗi khi `TPP` gọi API đọc số dư hay chuyển tiền, API Gateway của Ngân hàng trích xuất chứng chỉ `mTLS` thực tế của kết nối TLS hiện tại, băm lại SHA-256 và so sánh với `cnf.x5t#S256` trong Token! Nhờ vậy, kể cả hacker có đột nhập vào server của đối tác chép trộm được nguyên chuỗi Access Token nhưng không lấy được khóa riêng (`Private Key`) nằm trong HSM của đối tác để bắt tay `mTLS`, chiếc Token ăn cắp đó hoàn toàn vô giá trị!",
          "Trụ cột thứ hai là **`PAR` (`Pushed Authorization Requests - RFC 9126`)** kết hợp xác thực Client bằng chữ ký **`private_key_jwt`** (cấm tiệt việc truyền `client_secret` tĩnh dạng chuỗi dễ lộ!) và **`PKCE (S256)`** bắt buộc: Thay vì nhồi tham số lên URL trình duyệt, Backend của `TPP` gửi trực tiếp toàn bộ yêu cầu khởi tạo Consent đã ký số sang Backend Ngân hàng qua kênh `mTLS` hậu trường, nhận về một mã tham chiếu dùng một lần dạng `urn:ietf:params:oauth:request_uri:6esc_11ACC...` có tuổi thọ chỉ 60 giây, rồi mới chuyển hướng trình duyệt của khách hàng kèm mã tham chiếu ngắn gọn đó. Cộng thêm lớp ký số nội dung bản tin **`JWS Detached Signature`** cho mọi lệnh thanh toán khởi tạo qua kênh BaaS/PIS, ngân hàng đạt được cả tính bảo mật kênh truyền, chống đánh cắp Token lẫn **tính chống chối bỏ pháp lý (`Non-Repudiation`)**!"
        ],
        bullets: [
          "Cấm tuyệt đối Implicit Flow & Resource Owner Password Credentials (ROPC): Trong FAPI 2.0 và chuẩn Ngân hàng Mở, việc nhận mật khẩu khách hàng qua API (`grant_type=password`) bị cấm hoàn toàn; bắt buộc dùng `Authorization Code + PKCE (S256) + PAR`.",
          "Quản lý vòng đời Chứng chỉ Đối tác (`TPP Directory & QWAC/OBWAC`): API Gateway phải kiểm tra trạng thái thu hồi chứng chỉ (`CRL / OCSP`) và đối chiếu `Subject DN / Organization ID` của chứng chỉ mTLS khớp với hồ sơ đối tác đã ký hợp đồng.",
          "Chống tấn công BOLA chéo đối tác (`Cross-Tenant Isolation` trong BaaS): Trong nền tảng BaaS đa đối tác, mọi câu truy vấn DB bắt buộc gắn bộ lọc kép `WHERE tenant_partner_id = :authenticatedTppId AND account_no = :accountNo`."
        ]
      },
      {
        heading: "3. Kiến trúc Open API Portal, Multi-Tier Rate Limiting & Partner Developer Sandbox",
        paragraphs: [
          "Xây dựng nền tảng Open Banking thành công không chỉ có bảo mật chặt mà còn phải có khả năng tự phục vụ (`Developer Experience`) và khả năng tự vệ trước lưu lượng bất thường từ bên ngoài. Khác với kênh Mobile App nội bộ do chính đội ngũ ngân hàng viết code và kiểm soát tần suất gọi, kênh `Open API` mở cửa cho hàng trăm đội kỹ thuật của các đối tác bên ngoài tích hợp — chỉ cần một lập trình viên phía đối tác viết nhầm vòng lặp `while(true)` đồng bộ sao kê không có `sleep` vào sáng đầu tháng tính lương là có thể bắn 50.000 request/giây đập thẳng vào Core Banking của bạn!",
          "Vì vậy, tầng `Open Banking Gateway` luôn phải thiết kế **Quản trị Lưu lượng Đa tầng (`Multi-Tier Quota & Rate Limiting`)** hoàn toàn tách biệt hạ tầng (`Bulkhead Isolation` — cụm Pod và Connection Pool riêng) khỏi kênh Mobile/Internet Banking của khách hàng cá nhân: giới hạn đồng thời theo từng cấp gói hợp đồng của `TPP` (ví dụ `200 RPS / TPP`), giới hạn theo từng khách hàng/tài khoản (`10 lần đọc sao kê / giờ / account` chống cào dữ liệu ồ ạt), và có cầu dao ngắt khẩn cấp (`Partner Kill-Switch`) cho phép trung tâm vận hành SOC khóa riêng 1 đối tác bị nghi ngờ lộ hệ thống trong vòng 3 giây mà 99 đối tác còn lại vẫn chạy êm ru!",
          "Cuối cùng, theo đúng tinh thần chuẩn hóa Open API ngành ngân hàng, bạn bắt buộc phải xây dựng môi trường **`Partner Developer Sandbox`** cách ly vật lý và mạng hoàn toàn khỏi môi trường Production (**Zero Production PII/Data in Sandbox!**): cung cấp tài liệu đặc tả `OpenAPI 3.1`, công cụ cấp chứng chỉ `mTLS` thử nghiệm tự động, bộ tài khoản giả lập đa kịch bản (ví dụ: chuyển khoản vào số tài khoản đuôi `...0000` giả lập thành công tức thì, đuôi `...0051` giả lập thiếu số dư, đuôi `...0068` giả lập Timeout liên ngân hàng, đuôi `...9999` giả lập kích hoạt Webhook báo Có sau 3 giây) để đối tác kiểm thử trọn vẹn mọi nhánh xử lý lỗi trước khi được cấp chứng chỉ lên Production!"
        ],
        bullets: [
          "Deterministic Test Accounts trong Sandbox (Magic Numbers): Thiết kế các số tài khoản/số tiền quy ước kích hoạt từng mã lỗi nghiệp vụ giúp đội QA của đối tác tự test hết 15 kịch bản lỗi (kể cả Timeout và Consent Revoked) mà không cần nhắn tin nhờ kỹ sư ngân hàng chỉnh tay DB.",
          "API Versioning & Deprecation Governance: Đối tác doanh nghiệp ERP không thể sửa code cập nhật theo tuần như app nội bộ; Open API phải tuân thủ chính sách phiên bản rõ ràng (`/open-banking/v1/...`), giữ tương thích ngược (`Backward Compatibility`) và báo trước lộ trình ngừng hỗ trợ (`Sunset Header`) tối thiểu 6 tháng.",
          "Data Minimization (Tối thiểu hóa dữ liệu trả về): DTO của Open API chỉ trả về đúng những trường nằm trong phạm vi `Consent` (ví dụ quyền `ACCOUNT_BASIC_READ` chỉ trả số tài khoản & loại tiền, tuyệt đối không đính kèm số CCCD, địa chỉ nhà riêng hay hạn mức tín dụng nội bộ của khách!)."
        ]
      }
    ],
    comparison: {
      title: "Đối chiếu Tích hợp Cũ, OAuth2 Phổ thông và Chuẩn Ngân hàng Mở FAPI 2.0",
      headers: ["Tiêu chí đánh giá", "Screen Scraping / API Key Tĩnh (Cấm kỵ)", "OAuth 2.0 Cơ bản (Web/Social)", "Open Banking Chuẩn FAPI 2.0 + Consent Engine"],
      rows: [
        [
          "Xác thực Đối tác & Bảo vệ Token",
          "Dùng chung mật khẩu khách hàng hoặc `API-Key` chuỗi tĩnh gửi qua Header",
          "`client_secret` tĩnh + `Bearer Token` (ai trộm được chuỗi Token đều dùng được)",
          "`mTLS + private_key_jwt` + `Certificate-Bound Token (cnf.x5t#S256)` chống dùng trộm Token 100%"
        ],
        [
          "Độ chi tiết Phân quyền (Authorization)",
          "Toàn quyền trên mọi tài khoản của khách — lộ 1 lần là mất trắng cả sổ tiết kiệm",
          "Chỉ phân quyền thô theo `scope` (`read`, `write`), không khóa theo từng số tài khoản lẻ",
          "Khóa 4 chiều: `TPP Client` + `Consent hiệu lực` + `Từng số tài khoản cụ thể` + `Quyền/Hạn mức`"
        ],
        [
          "Bảo vệ tham số lúc khởi tạo Ủy quyền",
          "Không có luồng ủy quyền chuẩn mực",
          "Truyền tham số trực tiếp trên Query URL trình duyệt dễ bị chỉnh sửa/rò rỉ",
          "Bắt buộc đẩy qua kênh hậu trường ký số `PAR (Pushed Authorization Request)` lấy `request_uri`"
        ],
        [
          "Khả năng Thu hồi quyền của Khách hàng",
          "Khách buộc phải đổi mật khẩu ngân hàng mới cắt được quyền truy cập của bên thứ ba",
          "Thường phải chờ JWT Access Token tự hết hạn nếu không kiểm tra trạng thái tập trung",
          "Khách bấm 1 chạm trên `Consent Dashboard` ngắt quyền tức thì (`Instant Revocation`) kèm Audit đầy đủ"
        ]
      ]
    },
    codeTitle: "Java 21: Bộ Kiểm chứng FAPI 2.0 Certificate-Bound Token (RFC 8705) & Fine-Grained Consent Guard",
    code: [
      "package vn.finjava.openbanking.security;",
      "",
      "import java.security.MessageDigest;",
      "import java.security.cert.X509Certificate;",
      "import java.time.Instant;",
      "import java.util.Base64;",
      "import java.util.Set;",
      "",
      "public final class OpenBankingConsentGuard {",
      "    public enum Permission { ACCOUNT_BALANCE_READ, ACCOUNT_TXN_READ, PAYMENT_INITIATION }",
      "    public enum ConsentStatus { AWAITING_AUTH, ACTIVE, REVOKED, EXPIRED }",
      "",
      "    public record ConsentRecord(String consentId, String tppClientId, String customerCif, ConsentStatus status,",
      "                                Instant expiresAt, Set<String> authorizedAccounts, Set<Permission> permissions) {}",
      "",
      "    public record FapiTokenClaims(String tppClientId, String consentId, String certThumbprintS256) {}",
      "",
      "    public static void assertAuthorized(X509Certificate mtlsClientCert, FapiTokenClaims token,",
      "                                        ConsentRecord consent, String targetAccountNo, Permission requiredPerm) throws Exception {",
      "        if (mtlsClientCert == null || !verifyCertThumbprint(mtlsClientCert, token.certThumbprintS256())) {",
      "            throw new SecurityException(\"FAPI_MTLS_BINDING_MISMATCH: Sender certificate does not match token cnf.x5t#S256\");",
      "        }",
      "        if (consent == null || !consent.consentId().equals(token.consentId())",
      "                || !consent.tppClientId().equals(token.tppClientId())) {",
      "            throw new SecurityException(\"CONSENT_BINDING_INVALID: Token and consent client mismatch\");",
      "        }",
      "        if (consent.status() != ConsentStatus.ACTIVE || !Instant.now().isBefore(consent.expiresAt())) {",
      "            throw new SecurityException(\"CONSENT_INACTIVE_OR_EXPIRED: status=\" + consent.status());",
      "        }",
      "        if (!consent.permissions().contains(requiredPerm)) {",
      "            throw new SecurityException(\"CONSENT_SCOPE_DENIED: missing \" + requiredPerm);",
      "        }",
      "        if (!consent.authorizedAccounts().contains(targetAccountNo)) {",
      "            throw new SecurityException(\"CONSENT_ACCOUNT_BOLA_BLOCKED: account not granted in consent\");",
      "        }",
      "    }",
      "",
      "    private static boolean verifyCertThumbprint(X509Certificate cert, String expectedBase64UrlSha256) throws Exception {",
      "        byte[] actualSha256 = MessageDigest.getInstance(\"SHA-256\").digest(cert.getEncoded());",
      "        String actualB64Url = Base64.getUrlEncoder().withoutPadding().encodeToString(actualSha256);",
      "        return MessageDigest.isEqual(actualB64Url.getBytes(), expectedBase64UrlSha256.getBytes());",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Hàm `verifyCertThumbprint` cài đặt chuẩn đặc tả **`RFC 8705 (cnf.x5t#S256)`**: Băm `SHA-256` trên mảng byte DER (`cert.getEncoded()`) của chứng chỉ X.509 đang bắt tay `mTLS` thực tế, mã hóa `Base64URL withoutPadding` và so sánh thời gian hằng số với claim trong Token — biến Access Token thành thẻ khóa chặt vào chứng chỉ gốc của đối tác!",
      "Kiểm tra chéo ba định danh `token.tppClientId() == consent.tppClientId()` và `token.consentId() == consent.consentId()`: Ngăn chặn đối tác A dùng Token của mình nhưng truyền mã `consentId` thuộc về đối tác B.",
      "Chốt chặn thứ 5 `consent.authorizedAccounts().contains(targetAccountNo)`: Đánh chặn triệt để lỗ hổng `BOLA` đặc thù trong Open Banking — dù khách hàng có 5 tài khoản dưới cùng `customerCif`, đối tác chỉ đọc được đúng số tài khoản mà khách đã tích chọn trong `ConsentRecord` đó!"
    ],
    labGuide: {
      goal: "Xây dựng bộ Middleware bảo vệ Open Banking API chuẩn FAPI 2.0 bằng Java 21, kiểm thử thực tế việc chặn Token bị đánh cắp sang máy khác chứng chỉ mTLS, chặn truy cập tài khoản ngoài danh sách Consent và thu hồi Consent tức thời.",
      steps: [
        "Bước 1: Dùng `keytool` (hoặc `KeyPairGenerator` trong JUnit) sinh 2 chứng chỉ X.509 giả lập cho `TPP_ERP_GOOD` và `TPP_ATTACKER`; tính mã `x5t#S256` của `TPP_ERP_GOOD` gắn vào `FapiTokenClaims`.",
        "Bước 2: Tạo `ConsentRecord` của khách hàng `CIF001` chỉ cấp quyền `ACCOUNT_BALANCE_READ` cho duy nhất tài khoản `10001` (khách còn tài khoản tiết kiệm `10002` không tích chọn), hiệu lực 90 ngày.",
        "Bước 3: Chạy 4 kịch bản test với `OpenBankingConsentGuard.assertAuthorized(...)`: (a) Đúng chứng chỉ `TPP_ERP_GOOD` + đọc tài khoản `10001` -> Thành công; (b) Kẻ gian chép được nguyên `FapiTokenClaims` nhưng trình chứng chỉ `TPP_ATTACKER` -> Bị chặn ngay bởi `FAPI_MTLS_BINDING_MISMATCH`; (c) `TPP_ERP_GOOD` cố đọc lén tài khoản `10002` hoặc đòi `PAYMENT_INITIATION` -> Bị chặn bởi `CONSENT_ACCOUNT_BOLA_BLOCKED / CONSENT_SCOPE_DENIED`; (d) Khách bấm hủy chuyển trạng thái sang `REVOKED` -> Bị chặn ngay tức khắc.",
        "Bước 4: Thiết kế thêm một Controller Sandbox giả lập quy ước số tài khoản Magic Number (`...0000` thành công, `...0051` thiếu tiền, `...0068` timeout) trả lỗi chuẩn `RFC 7807 ProblemDetail`."
      ],
      expectedOutput: "Cả 4 kịch bản kiểm thử bảo mật FAPI 2.0 & Fine-Grained Consent đều vượt qua chính xác 100%; Token bị đánh cắp khỏi hạ tầng mTLS gốc bị vô hiệu hóa hoàn toàn."
    },
    examTips: [
      "Câu hỏi đinh khi phỏng vấn Kiến trúc sư Open Banking: 'Làm sao để nếu hacker vào được server của đối tác thứ ba (TPP) lấy cắp được OAuth2 Access Token thì vẫn không gọi được API của ngân hàng?' — Trả lời ngay chuẩn **`FAPI 2.0 Sender-Constrained Token` bằng `mTLS Certificate-Bound Access Token (RFC 8705 cnf.x5t#S256)`** (hoặc `DPoP`)!",
      "Bẫy phân quyền cực kỳ phổ biến: Kiểm tra JWT hợp lệ + kiểm tra tài khoản `10002` đúng là của khách hàng `CIF001` là CHƯA ĐỦ trong Open Banking! Bắt buộc phải kiểm tra khách hàng `CIF001` có cấp `Consent` cho đối tác `TPP` đó truy cập vào ĐÚNG tài khoản `10002` hay không!",
      "Nhớ quy tắc cô lập hạ tầng kênh đối ngoại: Luôn tách riêng cụm `Open Banking Gateway` + `Bulkhead / Multi-Tier Rate Limit` khỏi đường truyền của Mobile Banking nội bộ, và tuyệt đối không bao giờ copy dữ liệu thật của khách hàng Production xuống môi trường `Partner Sandbox`!"
    ],
    summaryTakeaways: [
      "`Open Banking` trao quyền cho khách hàng chia sẻ dữ liệu/khởi tạo giao dịch an toàn qua đối tác `TPP`, còn `BaaS` đóng gói sản phẩm lõi ngân hàng thành nền tảng đa thuê bao nhúng vào hệ sinh thái đối tác.",
      "Quản trị `Consent` chuẩn ngân hàng phải khóa chặt theo 4 chiều: `Đối tác TPP` + `Danh sách số tài khoản cụ thể` + `Quyền/Hạn mức chi tiết` + `Thời hạn & Thu hồi tức thời`.",
      "Chuẩn bảo mật `FAPI 2.0` nâng cấp toàn diện OAuth2 bằng `PAR` (ẩn tham số khởi tạo), `private_key_jwt` và `Certificate-Bound Access Token (cnf.x5t#S256)` chống đánh cắp Bearer Token.",
      "Nền tảng Open API bền vững đòi hỏi cách ly tải (`Bulkhead` + `Multi-Tier Rate Limit`), có công tắc ngắt khẩn cấp theo từng đối tác và môi trường `Sandbox` dữ liệu giả lập định sẵn."
    ],
    lessonQuestions: [
      {
        question: "Khách hàng M có 2 tài khoản tại ngân hàng: Tài khoản thanh toán `ACC-01` (số dư 5 triệu) và Tài khoản tích lũy `ACC-02` (số dư 3 tỷ). Khách hàng M thực hiện cấp quyền Open Banking (`Consent`) cho ứng dụng quản lý tài chính X chỉ được đọc số dư của riêng `ACC-01`. Tuy nhiên, khi ứng dụng X dùng Access Token đó gọi `GET /open-banking/v1/accounts/ACC-02/balance`, hệ thống vẫn trả về số dư 3 tỷ! Nguyên nhân gốc rễ nằm ở thiếu sót nào của Backend?",
        options: [
          "Do chưa bật nén GZIP trên API Gateway.",
          "Backend chỉ kiểm tra Access Token hợp lệ và kiểm tra `ACC-02` thuộc sở hữu của khách hàng M (`sub`), mà quên kiểm tra `ACC-02` có nằm trong danh sách `authorizedAccounts` của bản ghi `Consent` cụ thể đã cấp cho đối tác X hay không.",
          "Do chứng chỉ TLS của ngân hàng dùng thuật toán RSA-2048 thay vì RSA-4096.",
          "Trong Open Banking không thể phân quyền theo từng tài khoản lẻ của cùng một khách hàng."
        ],
        answer: 1,
        explanation: "Đây là lỗi phân quyền kinh điển nhất khi xây dựng Open Banking: kiểm tra quyền sở hữu của khách hàng là chưa đủ, vì khách hàng không giao toàn bộ tài sản của mình cho đối tác thứ ba. Middleware bắt buộc phải đối chiếu `targetAccountNo` có nằm trong tập `authorizedAccounts` của `Consent` đang `ACTIVE` gắn với `tppClientId` đó hay không.",
        wrongReasons: [
          "Nén GZIP là tối ưu băng thông HTTP, hoàn toàn không liên quan tới kiểm soát truy cập dữ liệu.",
          "",
          "Độ dài khóa TLS không phải nguyên nhân cho phép truy cập sai phạm vi tài khoản ủy quyền.",
          "Phân quyền chi tiết tới từng số tài khoản (`Account-specific Fine-Grained Consent`) là yêu cầu cốt lõi bắt buộc của mọi chuẩn Open Banking."
        ]
      },
      {
        question: "Theo tiêu chuẩn bảo mật cấp độ tài chính `FAPI 2.0` áp dụng cho Open Banking, cơ chế nào đảm bảo rằng nếu kẻ tấn công đánh cắp được chuỗi `OAuth2 Access Token` từ file log bị lộ của đối tác thứ ba (`TPP`), kẻ tấn công vẫn KHÔNG THỂ mang Token đó từ máy của hắn gọi trực tiếp vào Open API của Ngân hàng?",
        options: [
          "Đặt tên đường dẫn API thật dài và khó đoán.",
          "Mã hóa Base64 chuỗi Access Token trước khi lưu vào file log.",
          "Áp dụng `Sender-Constrained Access Token` theo `RFC 8705`: nhúng mã băm chứng chỉ `mTLS` của đối tác vào claim `cnf.x5t#S256` trong Token và buộc API Gateway kiểm chứng khớp chứng chỉ `mTLS` thực tế trên từng lượt gọi API.",
          "Yêu cầu đối tác gửi kèm tên thương hiệu công ty trong `User-Agent` Header."
        ],
        answer: 2,
        explanation: "Với Certificate-Bound Access Token (RFC 8705), Access Token không còn là Bearer Token dùng tự do nữa mà bị ràng buộc mật mã học vào đúng chứng chỉ X.509 của đối tác. Khi hacker gọi từ máy ngoài mà không có Private Key nằm trong HSM của đối tác để hoàn tất bắt tay mTLS trùng khớp mã băm `cnf.x5t#S256`, API Gateway sẽ từ chối ngay lập tức.",
        wrongReasons: [
          "Bảo mật dựa trên sự che giấu URL (`Security through Obscurity`) hoàn toàn vô tác dụng trước kẻ tấn công đã đọc được log request.",
          "Base64 giải mã ngược tự do không cần khóa và cũng không ngăn được việc mang nguyên Token đi gọi lại.",
          "",
          "`User-Agent` Header chỉ là chuỗi văn bản thông thường, ai cũng có thể giả mạo bằng một dòng lệnh `curl -H`."
        ]
      }
    ]
  }
});
