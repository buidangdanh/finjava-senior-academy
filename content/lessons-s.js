window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  S1: {
    duration: "55 phút",
    difficulty: "Trung cấp → Senior Thực chiến",
    codeLang: "java",
    teacherIntro: "Chào bạn, chào mừng bạn bước vào Học phần S — trái tim thực thi của gần như mọi hệ thống Core Payment và Digital Banking viết bằng Java hiện nay! Tôi vẫn nhớ mãi ca trực đêm mùng 5 Tết âm lịch cách đây vài năm tại một ngân hàng thương mại cổ phần: đội dự án vừa đưa tính năng Chi lương theo lô (Payroll Batch Transfer) lên Production. Lập trình viên viết hàm `processCompanyPayroll()` không gắn `@Transactional` để tránh giữ khóa lâu, rồi bên trong vòng lặp gọi `this.executeSingleSalaryTransfer(item)` — hàm này được gắn rất đầy đủ cả `@Transactional` lẫn custom annotation `@AuditBankingAction`. Thế nhưng đúng 23h30, một tài khoản nhân viên bị phong tỏa khiến bước ghi Có ném ngoại lệ sau khi đã trừ tiền tài khoản doanh nghiệp; điều kinh hoàng là số tiền bị trừ KHÔNG HỀ được rollback, còn bảng `security_audit_logs` phục vụ kiểm toán nội bộ thì trống trơn không có lấy một dòng! Thủ phạm chính là cái bẫy kinh điển mang tên **Self-Invocation**: lời gọi qua con trỏ `this.` đã đi vòng qua lưng lớp vỏ CGLIB Proxy của Spring. Hiểu tận gốc IoC Container, vòng đời Bean và cơ chế dệt Proxy hôm nay sẽ giúp bạn miễn nhiễm vĩnh viễn với những tai nạn âm thầm kiểu đó.",
    analogy: {
      title: "Cổng an ninh Hội sở Ngân hàng và cuộc gọi nội bộ cùng phòng",
      body: "Bạn hãy hình dung đối tượng nghiệp vụ `TransferService` thật sự giống như phòng làm việc của Giám đốc Khối Thanh toán nằm sâu bên trong tòa nhà Hội sở, còn **Spring AOP Proxy (CGLIB)** chính là Cổng an ninh kèm bàn Thư ký đứng chắn ngay ngoài cửa phòng. Bất kỳ ai từ phòng ban khác (`RestController` hay `Scheduler`) muốn gặp Giám đốc đều bắt buộc phải bước qua Cổng an ninh này: tại đây bảo vệ quét thẻ phân quyền (`@PreAuthorize`), bấm đồng hồ ghi sổ nhật ký kiểm toán (`@AuditBankingAction`), mở két giao dịch tạm thời (`@Transactional Begin`), rồi mới mở cửa mời vào gặp Giám đốc (`Target Object`). Thế nhưng, khi vị Giám đốc đã ngồi sẵn bên trong phòng rồi tự mình bước sang chiếc bàn phụ ngay cạnh đó để ký tờ giấy thứ hai (`this.saveAudit()` hoặc `this.transferSingle()`), ông ấy chẳng hề bước chân ra khỏi cửa phòng nên Cổng an ninh bên ngoài hoàn toàn mù thông tin — không ghi sổ, không mở giao dịch mới, cũng chẳng bắt lỗi hoàn trả!"
    },
    objectives: [
      "Giải phẫu tường tận kiến trúc Spring IoC Container: phân biệt rõ BeanFactory với ApplicationContext, nắm trọn chu trình khởi tạo Bean và vai trò quyết định của BeanPostProcessor trong việc sinh Proxy.",
      "Hiểu sâu sự khác biệt ở mức Bytecode giữa JDK Dynamic Proxy và CGLIB Subclassing trong Spring Boot 3, nhận diện ngay các trường hợp làm tê liệt Proxy như hàm private hay từ khóa final.",
      "Hóa giải triệt để bẫy Self-Invocation theo chuẩn kiến trúc sạch (Clean Design) và tự tay xây dựng Custom AOP Annotation @AuditBankingAction tự động ghi vết giao dịch tài chính."
    ],
    flow: [
      {
        step: "1. Quét Metadata & Đăng ký BeanDefinition",
        detail: "Khi ứng dụng khởi động, ApplicationContext đọc các cấu hình (@Configuration, @Service, @Component) để tạo bản thiết kế BeanDefinition chứ chưa khởi tạo ngay đối tượng nghiệp vụ."
      },
      {
        step: "2. Khởi tạo Instance & Tiêm phụ thuộc bất biến",
        detail: "IoC Container gọi Constructor của class để tạo đối tượng gốc (Target Bean) trên bộ nhớ Heap và tiêm đầy đủ các dependency bắt buộc được khai báo kiểu private final."
      },
      {
        step: "3. Hậu xử lý tại BeanPostProcessor & Quấn vỏ CGLIB",
        detail: "Tại pha postProcessAfterInitialization, AnnotationAwareAspectJAutoProxyCreator phát hiện bean có gắn @Transactional/@Aspect nên sinh ra lớp con CGLIB Proxy bọc bên ngoài Target Bean rồi đưa Proxy vào Container."
      },
      {
        step: "4. Thực thi Chuỗi MethodInterceptor lúc Runtime",
        detail: "Mỗi khi bean khác gọi vào Proxy, lời gọi đi xuyên qua chuỗi Interceptor theo thứ tự @Order (Bảo mật -> Audit Log -> Mở Transaction -> Gọi hàm thật trên Target -> Commit/Rollback)."
      }
    ],
    sections: [
      {
        heading: "1. Bên dưới nắp capo IoC Container: Từ BeanDefinition đến BeanPostProcessor",
        paragraphs: [
          "Nhiều lập trình viên dùng Spring hàng ngày nhưng chỉ coi `@Autowired` hay `@Service` như phép màu tự động. Ở góc nhìn của một Senior Architect, bạn cần nhìn thấy rõ hai tầng cốt lõi: `BeanFactory` là trái tim quản lý vòng đời cơ bản theo cơ chế khởi tạo lười (lazy-loading), còn `ApplicationContext` là bộ khung doanh nghiệp hoàn chỉnh bọc bên ngoài — mặc định khởi tạo sẵn toàn bộ Singleton Beans ngay lúc khởi động (eager initialization) để nếu thiếu cấu hình kết nối HSM hay sai chữ ký hàm thì Pod từ chối nhận tải ngay lập tức thay vì đợi khách hàng đầu tiên bấm chuyển tiền mới nổ lỗi! Toàn bộ thông tin cấu hình ban đầu được chuẩn hóa thành các đối tượng `BeanDefinition` lưu trong registry trước khi bất kỳ instance Java nào được cấp phát.",
          "Điểm móc quan trọng bậc nhất trong toàn bộ vòng đời khởi tạo của Spring chính là giao diện `BeanPostProcessor` với hai phương thức `postProcessBeforeInitialization` và `postProcessAfterInitialization`. Bạn hãy nhớ kỹ chi tiết này khi đi phỏng vấn: mọi phép thuật phi xâm lấn của Spring từ `@Transactional`, `@Async`, `@Cacheable`, `@Retryable` của Resilience4j cho đến Custom AOP của riêng ngân hàng đều được dệt vào Bean tại bước `postProcessAfterInitialization`. Lúc đó, đối tượng gốc (`Target`) đã được tiêm đủ phụ thuộc, và bộ tạo Proxy của Spring sẽ quyết định trả về một đối tượng **Proxy** thay thế hoàn toàn đối tượng gốc trong `ApplicationContext`."
        ],
        bullets: [
          "Ưu tiên tuyệt đối Constructor Injection với trường final: Khai báo `private final LedgerRepository ledgerRepo;` kèm một constructor duy nhất giúp đối tượng bất biến (immutable), không bao giờ bị `NullPointerException` khi viết Unit Test thuần không cần bật Spring, và giúp phát hiện ngay lỗi thiết kế phụ thuộc vòng (Circular Dependency — vốn đã bị Spring Boot cấm mặc định từ bản 2.6+).",
          "Singleton của Spring không đồng nghĩa với Thread-safe: Mỗi `@Service` mặc định chỉ có duy nhất 1 instance phục vụ chung cho hàng nghìn luồng giao dịch đồng thời; nếu bạn vô tình khai báo một biến thành viên kiểu `private BigDecimal currentFee;` trong Service, khách hàng A sẽ cộng nhầm phí của khách hàng B ngay giờ cao điểm!",
          "Vòng đời dọn dẹp an toàn khi tắt Pod: Các tài nguyên giữ kết nối vật lý (Socket tới cổng thẻ ISO 8583, ThreadPool nội bộ) cần được đóng gọn gàng trong pha `@PreDestroy` hoặc `DisposableBean` phối hợp cùng Graceful Shutdown để không làm đứt ngang lệnh thanh toán."
        ]
      },
      {
        heading: "2. JDK Dynamic Proxy vs CGLIB Subclassing trong Spring Boot 3",
        paragraphs: [
          "Trong lịch sử phát triển của Spring tồn tại hai cơ chế tạo Proxy lúc runtime. **JDK Dynamic Proxy** là cơ chế có sẵn của thư viện chuẩn Java (`java.lang.reflect.Proxy`), hoạt động bằng cách tạo ra một class mới cài đặt (implement) cùng danh sách Interface với Bean gốc; nếu class của bạn không có Interface, JDK Proxy hoàn toàn bó tay. Ngược lại, **CGLIB Proxy** (được Spring tích hợp trực tiếp vào `spring-core` qua thao tác mã máy Bytecode) hoạt động bằng cách **kế thừa trực tiếp class gốc** — ví dụ sinh ra lớp con `TransferService$$SpringCGLIB$$0 extends TransferService` và ghi đè (override) các phương thức để chèn logic kiểm soát trước/sau khi ủy quyền về đối tượng thật.",
          "Kể từ Spring Boot 2.0 và tiếp nối xuyên suốt trên **Spring Boot 3.x**, thuộc tính `spring.aop.proxy-target-class=true` đã trở thành mặc định toàn cục (luôn dùng CGLIB ngay cả khi Bean có implement interface) nhằm mang lại trải nghiệm nhất quán và tránh lỗi ép kiểu `BeanNotOfRequiredTypeException`. Tuy nhiên, chính vì CGLIB vận hành dựa trên cơ chế kế thừa lớp và ghi đè phương thức trong ngôn ngữ Java, nó mang trong mình những giới hạn vật lý không thể vượt qua: nếu bạn đánh dấu class là `final`, hoặc đặt `@Transactional` / `@AuditBankingAction` lên một phương thức `private`, `static` hay `final`, lớp con CGLIB không thể override phương thức đó nên toàn bộ logic AOP sẽ bị phớt lờ âm thầm mà không hề báo lỗi lúc biên dịch!"
        ],
        bullets: [
          "Bẫy phương thức private và final: Đặt `@Transactional` trên hàm `private void deductBalance()` là lỗi kinh điển lúc Code Review — ứng dụng vẫn chạy êm ru nhưng không hề có giao dịch cơ sở dữ liệu nào được mở hay bảo vệ bởi Proxy.",
          "Kiểm soát thứ tự thực thi các Aspect bằng @Order: Khi một hàm chuyển khoản vừa có `@AuditBankingAction`, vừa có `@Retryable`, vừa có `@Transactional`, bạn bắt buộc phải quy hoạch thứ tự `@Order` rõ ràng (ví dụ: Audit và Retry phải bọc bên ngoài Transaction để mỗi lần thử lại được mở một giao dịch DB hoàn toàn mới!).",
          "Tương thích Spring Boot 3 AOT & GraalVM Native: Trên kiến trúc Cloud-native cần khởi động dưới 100ms, cơ chế Ahead-Of-Time (AOT) của Spring Boot 3 sẽ phân tích và sinh sẵn mã nguồn Proxy ngay lúc đóng gói Maven/Gradle thay vì đợi lúc JVM chạy mới sinh động."
        ]
      },
      {
        heading: "3. Bẫy Self-Invocation kinh điển và 3 mẫu thiết kế hóa giải chuẩn Production",
        paragraphs: [
          "Hãy nhìn thẳng vào sơ đồ bộ nhớ JVM để thấy vì sao bẫy **Self-Invocation** lại nguy hiểm đến vậy. Khi `TransferController` gọi `payrollService.processBatch()`, biến `payrollService` được tiêm vào Controller thực chất là tham chiếu trỏ tới vỏ bọc `PayrollService$$SpringCGLIB$$0`. Nhưng ngay khi luồng thực thi đã bước vào bên trong thân hàm `processBatch()` của đối tượng gốc `Target`, từ khóa `this` của ngôn ngữ Java luôn luôn trỏ trực tiếp tới chính bản thân đối tượng `PayrollService` trần trụi đó, chứ không bao giờ quay ngược ra vỏ bọc Proxy bên ngoài! Do đó, lời gọi `this.executeSingleTransfer(emp)` chỉ là một lệnh nhảy hàm nội bộ thông thường trên JVM (`invokevirtual`), làm vô hiệu hóa sạch trơn `@Transactional(propagation = REQUIRES_NEW)`, `@Async`, `@Cacheable` lẫn `@AuditBankingAction`.",
          "Trong các hệ thống Core Banking chuẩn mực, chúng tôi xếp hạng 3 phương pháp hóa giải theo thứ tự ưu tiên kiến trúc rõ rệt. **Giải pháp số 1 (Chuẩn Kiến trúc — Khuyên dùng 95% trường hợp)**: Tách hàm con ra một Collaborator Bean chuyên biệt theo đúng nguyên lý Đơn trách nhiệm SRP — ví dụ `PayrollBatchOrchestrator` chỉ điều phối vòng lặp và gọi sang `SingleSalaryTransferExecutor`; lời gọi giữa hai Bean khác nhau chắc chắn đi qua Proxy 100%, đồng thời rất dễ viết Unit Test độc lập. **Giải pháp số 2 (Khi bảo trì hệ thống Legacy lớn chưa thể tách class ngay)**: Tiêm `ObjectProvider<PayrollService>` (hoặc tự inject bean qua `@Lazy`) rồi gọi `selfProvider.getObject().executeSingleTransfer(emp)` — cách này sạch hơn và ít phụ thuộc cấu hình `exposeProxy = true` hơn hẳn lối cũ `AopContext.currentProxy()`. **Giải pháp số 3 (Cho các tác vụ phụ trợ như gửi thông báo / ghi log bất đồng bộ)**: Phát sự kiện qua `ApplicationEventPublisher` để tách rời hoàn toàn luồng chính và luồng phụ."
        ],
        bullets: [
          "Tuyệt đối tránh lạm dụng AopContext.currentProxy(): Cách ép kiểu `((PayrollService) AopContext.currentProxy())` vừa làm ô nhiễm code nghiệp vụ bởi thư viện khung, vừa nổ ngay `IllegalStateException` nếu ai đó quên bật cờ `@EnableAspectJAutoProxy(exposeProxy = true)`.",
          "Thiết kế Custom @AuditBankingAction phi xâm lấn: Thay vì lặp lại 15 dòng code lấy `SecurityContext`, đo thời gian chạy và ghi bảng `audit_logs` ở đầu/cuối 200 API tài chính, việc gom chung vào một `@Around` Aspect giúp code nghiệp vụ sạch bóng mà vẫn đáp ứng 100% tiêu chuẩn kiểm toán NHNN và PCI-DSS.",
          "Đảm bảo khối finally trong Aspect không nuốt ngoại lệ gốc: Khi viết `@Around`, sau khi bắt lỗi để đánh dấu trạng thái giao dịch kiểm toán là `FAILED`, bạn bắt buộc phải `throw ex;` trở lại để tầng `@Transactional` và `@RestControllerAdvice` xử lý chuẩn xác."
        ]
      }
    ],
    comparison: {
      title: "So sánh JDK Dynamic Proxy, CGLIB Proxy và AspectJ Weaving trong Hệ thống Ngân hàng",
      headers: ["Tiêu chí kỹ thuật", "JDK Dynamic Proxy", "CGLIB Proxy (Mặc định Spring Boot 3)", "AspectJ Bytecode Weaving (CTW/LTW)"],
      rows: [
        ["Cơ chế hoạt động cốt lõi", "Dùng Reflection tạo class cài đặt chung Interface tại thời điểm chạy", "Sinh lớp con (Subclass) kế thừa trực tiếp từ Target Class ở mức Bytecode", "Chỉnh sửa trực tiếp file .class lúc biên dịch (Compile-time) hoặc lúc nạp lớp"],
        ["Yêu cầu với Class & Method", "Bắt buộc Bean phải có ít nhất 1 Interface; chỉ chặn hàm trên Interface", "Class không được là final; phương thức chặn không được là private/final/static", "Chặn được cả hàm private, constructor và truy cập field trực tiếp"],
        ["Có dính bẫy Self-Invocation (this.)?", "CÓ — gọi this. nội bộ đi vòng qua Proxy", "CÓ — gọi this. nội bộ đi vòng qua Proxy", "KHÔNG — vì mã lệnh đã được dệt thẳng vào bên trong thân hàm gốc"],
        ["Mức độ áp dụng thực tế tại Ngân hàng", "Gặp ở các thư viện chuẩn dựa trên Interface như Spring Data Repository", "Tiêu chuẩn mặc định cho 99% @Service, @Component trong Spring Boot 3", "Chỉ dùng ở trường hợp cực đặc thù do tăng độ phức tạp cấu hình build/agent"]
      ]
    },
    codeTitle: "Triển khai Custom AOP @AuditBankingAction & Tách Collaborator Bean triệt tiêu bẫy Self-Invocation",
    code: [
      "@Target(ElementType.METHOD)",
      "@Retention(RetentionPolicy.RUNTIME)",
      "public @interface AuditBankingAction {",
      "    String actionCode(); // VD: PAYROLL_SINGLE_TRANSFER, LIMIT_CHANGE",
      "}",
      "",
      "@Aspect",
      "@Component",
      "@Order(1) // Chạy bên ngoài @Transactional (mặc định Order thấp nhất) để đo trọn thời gian commit",
      "public class BankingAuditAspect {",
      "    private static final Logger log = LoggerFactory.getLogger(BankingAuditAspect.class);",
      "    private final AuditTrailService auditTrailService;",
      "",
      "    public BankingAuditAspect(AuditTrailService auditTrailService) {",
      "        this.auditTrailService = auditTrailService;",
      "    }",
      "",
      "    @Around(\"@annotation(auditAction)\")",
      "    public Object traceBankingOperation(ProceedingJoinPoint pjp, AuditBankingAction auditAction) throws Throwable {",
      "        long startNanos = System.nanoTime();",
      "        String actor = Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())",
      "                .map(Principal::getName).orElse(\"SYSTEM_BATCH\");",
      "        String traceId = Optional.ofNullable(MDC.get(\"traceId\")).orElse(\"N/A\");",
      "        String outcome = \"SUCCESS\";",
      "        try {",
      "            return pjp.proceed(); // Chuyển tiếp vào chuỗi Interceptor kế tiếp (@Transactional -> Target)",
      "        } catch (Throwable ex) {",
      "            outcome = \"FAILED:\" + ex.getClass().getSimpleName();",
      "            throw ex; // BẮT BUỘC ném lại ngoại lệ để Transaction rollback đúng thiết kế!",
      "        } finally {",
      "            long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);",
      "            auditTrailService.recordAsync(auditAction.actionCode(), actor, traceId, outcome, elapsedMs);",
      "            log.info(\"[AUDIT] action={} actor={} traceId={} outcome={} tookMs={}\",",
      "                    auditAction.actionCode(), actor, traceId, outcome, elapsedMs);",
      "        }",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Annotation @Order(1) đặt trên BankingAuditAspect đảm bảo lớp vỏ Audit nằm ở vòng ngoài cùng trước khi chạm tới TransactionInterceptor: nhờ vậy ngay cả khi quá trình commit xuống PostgreSQL gặp lỗi ràng buộc khóa ngoại ở mili-giây cuối cùng, khối catch/finally của Aspect vẫn bắt gọn và ghi nhận đúng trạng thái FAILED.",
      "Bên trong khối catch (Throwable ex), việc gán lại nhãn lỗi rồi thực hiện `throw ex;` ngay lập tức là kỷ luật sống còn: nếu vô tình nuốt ngoại lệ tại Aspect, phía Caller sẽ tưởng giao dịch thành công hoặc làm sai lệch cơ chế rollback của các tầng bên trong.",
      "Sử dụng `System.nanoTime()` thay vì `System.currentTimeMillis()` để đo thời lượng giao dịch (`elapsedMs`) giúp phép đo đơn điệu (monotonic), miễn nhiễm hoàn toàn với hiện tượng đồng hồ hệ điều hành bị giật lùi vài mili-giây khi đồng bộ giờ NTP.",
      "Để gọi hàm có gắn `@AuditBankingAction` và `@Transactional` cho từng nhân viên trong lô lương, tầng điều phối `PayrollBatchOrchestrator` sẽ tiêm riêng `SingleSalaryTransferExecutor` qua Constructor thay vì gọi `this.`, đảm bảo 100% lượt gọi đều xuyên qua `BankingAuditAspect`."
    ],
    labGuide: {
      goal: "Tái hiện tận mắt lỗi Self-Invocation làm mất cả @Transactional lẫn @AuditBankingAction, sau đó refactor sang Collaborator Bean và kiểm chứng bằng Integration Test.",
      steps: [
        "Bước 1: Tạo annotation @AuditBankingAction và class BankingAuditAspect như mẫu code (nhớ thêm dependency spring-boot-starter-aop vào pom.xml).",
        "Bước 2: Tạo class PayrollService có hàm processBatch() gọi trực tiếp `this.transferOne(emp)` (gắn @AuditBankingAction và @Transactional); chạy thử với 2 phần tử trong đó phần tử 2 ném RuntimeException để quan sát console KHÔNG hề in dòng [AUDIT] và phần tử 1 không rollback.",
        "Bước 3: Tách hàm `transferOne(emp)` sang một Spring Bean độc lập tên `SinglePayrollExecutor`, tiêm vào `PayrollService` thông qua Constructor Injection (`private final SinglePayrollExecutor executor;`).",
        "Bước 4: Chạy lại kịch bản lỗi và kiểm tra `AopUtils.isCglibProxy(executor)` trả về `true`, đồng thời xác nhận log `[AUDIT]` xuất hiện đầy đủ cho từng giao dịch thành công lẫn thất bại."
      ],
      expectedOutput: "Console in rõ `AopUtils.isCglibProxy = true` và xuất hiện đủ các dòng `[AUDIT] action=PAYROLL_SINGLE_TRANSFER actor=... outcome=SUCCESS` cho nhân viên 1 và `outcome=FAILED:InsufficientFundsException` kèm rollback sạch sẽ cho nhân viên 2."
    },
    examTips: [
      "Mẹo phỏng vấn Senior: Khi hội đồng hỏi 'Tại sao đặt @Transactional hoặc @Async lên một hàm mà nó không chạy?', hãy trả lời ngay bộ 3 nguyên nhân theo thứ tự xác suất cao nhất: (1) Lỗi Self-Invocation gọi qua `this.` trong cùng class, (2) Phương thức khai báo `private` hoặc `final` nên CGLIB không override được, (3) Ngoại lệ ném ra là Checked Exception mà quên khai báo `rollbackFor = Exception.class`.",
      "Bẫy thiết kế đa luồng: Nếu đề bài Code Review đưa ra một `@Service` có biến thành viên `private SimpleDateFormat sdf` hoặc `private int retryCount = 0`, hãy chỉ thẳng ra đây là lỗi Race Condition nghiêm trọng trên Singleton Bean của Spring!",
      "Câu hỏi kiến trúc sâu: 'Làm sao để Audit Log chắc chắn đo được cả thời gian DB commit?' -> Phải đặt `@Order` của Audit Aspect có giá trị số nhỏ hơn (độ ưu tiên cao hơn, bọc vòng ngoài) so với `@EnableTransactionManagement`."
    ],
    summaryTakeaways: [
      "Spring AOP trong Spring Boot 3 mặc định vận hành qua cơ chế kế thừa Bytecode của CGLIB được dệt tại bước BeanPostProcessor.postProcessAfterInitialization.",
      "Mọi lời gọi nội bộ qua con trỏ `this.` (Self-Invocation) hoặc gọi vào hàm `private` / `final` đều đi vòng qua Proxy, làm vô hiệu hóa hoàn toàn @Transactional, @Async, @Cacheable và Custom Aspect.",
      "Giải pháp chuẩn kiến trúc để hóa giải Self-Invocation là tách trách nhiệm sang một Collaborator Bean độc lập kết hợp Constructor Injection bất biến.",
      "Singleton Bean chỉ được khởi tạo một lần duy nhất trong ApplicationContext nên bắt buộc phải thiết kế phi trạng thái (Stateless) để an toàn tuyệt đối khi xử lý hàng nghìn giao dịch đồng thời."
    ],
    lessonQuestions: [
      {
        question: "Trong dịch vụ Chuyển tiền Lô của ngân hàng (Spring Boot 3), class `BatchTransferService` có phương thức `public void runBatch(List<Cmd> cmds)` gọi vòng lặp `this.executeSingle(cmd)`. Phương thức `executeSingle` được khai báo `public` và gắn cả `@Transactional(propagation = Propagation.REQUIRES_NEW)` lẫn `@AuditBankingAction`. Khi chạy thực tế, chuyện gì xảy ra?",
        options: [
          "Spring tự động sinh giao dịch độc lập REQUIRES_NEW và ghi log kiểm toán bình thường cho từng phần tử trong danh sách",
          "Ứng dụng báo lỗi biên dịch hoặc ném BeanCreationException ngay lúc khởi động vì không cho phép gọi hàm nội bộ",
          "Cả @Transactional(REQUIRES_NEW) lẫn @AuditBankingAction trên executeSingle đều bị bỏ qua hoàn toàn vì lời gọi qua con trỏ this đi thẳng vào Target Object mà không qua CGLIB Proxy",
          "Chỉ có @AuditBankingAction bị bỏ qua, còn @Transactional vẫn hoạt động nhờ kết nối thẳng xuống JDBC Driver"
        ],
        answer: 2,
        explanation: "Khi luồng thực thi đã nằm bên trong thân hàm `runBatch` của đối tượng gốc (`Target`), con trỏ `this` trỏ trực tiếp vào chính instance `BatchTransferService` gốc thay vì lớp vỏ `BatchTransferService$$SpringCGLIB$$0`. Do đó mọi interceptor gắn trên `executeSingle` (bao gồm cả TransactionInterceptor và Audit Aspect) đều không bao giờ được kích hoạt.",
        wrongReasons: [
          "CGLIB Proxy chỉ chặn được các lời gọi đi từ bên ngoài xuyên qua biến tham chiếu Proxy, không thể tự chặn lời gọi `this.` nội bộ.",
          "Đây mới chính là điểm nguy hiểm nhất của Self-Invocation: trình biên dịch Java và Spring lúc khởi động hoàn toàn hợp lệ, không hề cảnh báo lỗi, khiến bug lọt thẳng lên Production.",
          "",
          "`@Transactional` trong Spring mặc định cũng dựa hoàn toàn trên cơ chế AOP Proxy (`TransactionInterceptor`), chứ JDBC Driver không hề biết sự tồn tại của annotation Spring."
        ]
      },
      {
        question: "Khi review code của một đồng nghiệp mới trong dự án Core Fee Engine, bạn thấy class `FeeCalculatorService` (mặc định Singleton) khai báo trường `private BigDecimal accumulatedTax = BigDecimal.ZERO;` để cộng dồn thuế trong hàm tính phí, đồng thời đặt `@Cacheable(\"feeTable\")` trên phương thức `private FeeRule loadRule(String code)`. Nhận định nào sau đây chỉ ra ĐẦY ĐỦ và CHÍNH XÁC nhất các lỗi nghiêm trọng?",
        options: [
          "Code hoàn toàn chuẩn xác vì mỗi HTTP Request trong Spring Boot được tự động cấp một bản sao FeeCalculatorService riêng biệt",
          "Có 2 lỗi chí mạng: (1) Biến trạng thái `accumulatedTax` nằm trên Singleton Bean sẽ bị ghi đè chéo dữ liệu (Race Condition) khi nhiều khách hàng giao dịch cùng lúc; (2) `@Cacheable` đặt trên hàm `private` sẽ hoàn toàn vô tác dụng do CGLIB không thể override phương thức private",
          "Chỉ cần thêm từ khóa `volatile` vào trước `accumulatedTax` là giải quyết được cả lỗi cộng dồn lẫn lỗi bộ nhớ đệm `@Cacheable`",
          "Chỉ cần đổi class `FeeCalculatorService` thành `public final class` để bảo mật và tối ưu tốc độ CGLIB Proxy"
        ],
        answer: 1,
        explanation: "Bean mặc định trong Spring có scope `singleton` — toàn bộ các luồng xử lý request dùng chung duy nhất một vùng nhớ instance của `FeeCalculatorService`, nên biến `accumulatedTax` sẽ làm rò rỉ và cộng nhầm số tiền giữa các khách hàng khác nhau. Đồng thời, CGLIB Proxy hoạt động bằng cách sinh lớp con kế thừa nên không thể ghi đè hàm `private loadRule()`, làm tính năng cache chết hẳn.",
        wrongReasons: [
          "Mặc định `@Service` là Singleton cho toàn ApplicationContext chứ không phải Request-scoped; dùng biến instance lưu dữ liệu từng giao dịch là thảm họa tiền tệ.",
          "",
          "`volatile` không đảm bảo tính nguyên tử cho phép cộng cũng không tách biệt trạng thái riêng của từng khách hàng, và hoàn toàn không liên quan đến việc CGLIB không override được hàm `private`.",
          "Thêm từ khóa `final` vào class sẽ khiến CGLIB không thể kế thừa để tạo Proxy, dẫn tới lỗi `BeanCreationException` ngay khi khởi động ứng dụng!"
        ]
      }
    ]
  },

  S2: {
    duration: "60 phút",
    difficulty: "Trung cấp → Senior Thực chiến",
    codeLang: "java",
    teacherIntro: "Chào bạn! Nếu bài S1 giúp chúng ta giữ kỷ luật bên trong nội tạng ứng dụng, thì bài S2 hôm nay là bộ mặt danh dự và lá chắn pháp lý của cả ngân hàng khi giao tiếp với Mobile App hay hàng trăm đối tác Open Banking bên ngoài. Tôi từng trực tiếp tham gia xử lý một sự cố đối soát nhớ đời: một dịch vụ Thanh toán Hóa đơn Điện/Nước do đội cũ viết có thói quen... bất kể giao dịch thành công hay tài khoản hết tiền đều trả về HTTP `200 OK`, kèm cục JSON `{\"status\": \"FAIL\", \"errCode\": \"51\"}`! Phía đối tác trung gian cấu hình kịch bản trên cổng tích hợp kiểm tra `if (httpResponse.status == 200)` để tự động mở cước gạch nợ tức thì. Kết quả là chỉ trong một buổi sáng đầu tháng, hơn 1.400 khách hàng không đủ số dư vẫn được đối tác gạch nợ thành công khống, kéo theo cả tuần lễ tra soát căng thẳng giữa hai ban giám đốc! Chưa dừng lại ở đó, ở màn hình Sao kê tài khoản doanh nghiệp, câu truy vấn phân trang kiểu `OFFSET 200000 LIMIT 20` đã kéo sập CPU cơ sở dữ liệu ngay kỳ quyết toán thuế. Hôm nay, chúng ta sẽ thiết lập lại chuẩn mực thiết kế RESTful API cấp độ Ngân hàng với **RFC 7807 ProblemDetail**, **Idempotency-Key** và **Keyset Pagination**.",
    analogy: {
      title: "Đèn tín hiệu Cửa khẩu Quốc tế và Mẫu biên bản chuẩn Hải quan",
      body: "Bạn hãy tưởng tượng mỗi lời gọi API đi qua hệ thống mạng ngân hàng giống như hành khách bước qua cổng kiểm soát tự động tại sân bay quốc tế. **HTTP Status Code** chính là cột đèn tín hiệu Xanh (`2xx`), Vàng (`4xx` — khách quên giấy tờ) và Đỏ (`5xx` — máy soi chiếu hỏng) gắn trên nóc cổng: toàn bộ hệ thống camera an ninh (API Gateway, WAF, Prometheus, Grafana, Circuit Breaker) chỉ nhìn vào màu đèn này để đếm tỷ lệ sự cố và ngắt mạch bảo vệ chứ không hề bóc hành lý của khách ra đọc! Nếu khách cầm hộ chiếu giả mà cổng vẫn bật đèn Xanh `200 OK` rồi nhét mảnh giấy viết tay 'Từ chối nhập cảnh' vào túi áo, cả sân bay đều tưởng mọi thứ an toàn tuyệt đối. Còn chuẩn quốc tế **RFC 7807 / RFC 9457 (`ProblemDetail`)** chính là tờ biên bản in sẵn đúng các ô tiêu chuẩn (`type`, `title`, `status`, `detail`, `instance` kèm `errorCode` nghiệp vụ) giúp mọi hãng bay và đối tác trên thế giới lập trình đọc hiểu tự động mà không phải đoán mò từng chữ."
    },
    objectives: [
      "Chuẩn hóa toàn bộ phản hồi lỗi API theo đặc tả quốc tế RFC 7807 / RFC 9457 bằng lớp ProblemDetail có sẵn trong Spring Boot 3, kết hợp nguyên tắc Zero-Leak chống lộ cấu trúc SQL/hạ tầng.",
      "Thiết kế hoàn chỉnh hợp đồng API Chuyển khoản Ngân hàng với cơ chế chống bấm đúp Idempotency-Key, thẩm định dữ liệu tiền tệ bằng Jakarta Bean Validation và chiến lược API Versioning an toàn.",
      "Thay thế phân trang truyền thống OFFSET/LIMIT bằng kỹ thuật Keyset (Cursor/Seek) Pagination đạt tốc độ truy vấn hằng số O(1) cho bảng sao kê hàng chục triệu bản ghi."
    ],
    flow: [
      {
        step: "1. Kiểm soát Cửa ngõ: Versioning, Rate Limit & Idempotency-Key",
        detail: "API Gateway và Filter xác định phiên bản (/api/v1), kiểm tra hạn ngạch tốc độ theo mã CIF khách hàng, và đối chiếu header Idempotency-Key để chặn ngay các gói tin trùng lặp do mạng lag."
      },
      {
        step: "2. Thẩm định Đầu vào: Jakarta Validation & Ràng buộc Tiền tệ",
        detail: "Trước khi chạm tới tầng Service, Request DTO được kiểm tra nghiêm ngặt: số tài khoản đúng định dạng, số tiền dương, không có phần thập phân lẻ bất hợp lệ với VNĐ và nội dung chuyển khoản sạch ký tự lạ."
      },
      {
        step: "3. Thực thi Nghiệp vụ & Gán HTTP Status đúng ngữ nghĩa",
        detail: "Hệ thống trả 201 Created cho giao dịch hoàn tất tức thời, 202 Accepted cho lệnh xử lý bất đồng bộ, 409 Conflict khi trùng khóa đang chạy, hoặc 422 Unprocessable Entity khi vi phạm hạn mức/số dư."
      },
      {
        step: "4. Chuẩn hóa Ngoại lệ Tập trung tại @RestControllerAdvice",
        detail: "Mọi ngoại lệ nghiệp vụ và kỹ thuật đều quy tụ về một GlobalExceptionHandler duy nhất để đóng gói thành JSON chuẩn application/problem+json kèm mã traceId phục vụ tra cứu tức thì."
      }
    ],
    sections: [
      {
        heading: "1. Chuẩn hóa Phản hồi Lỗi với RFC 7807 / 9457 ProblemDetail trong Spring Boot 3",
        paragraphs: [
          "Trong suốt nhiều năm, mỗi dự án Java lại tự sáng tác một cấu trúc JSON báo lỗi riêng: chỗ thì trả `{\"error_msg\": ...}`, chỗ lại bọc `{\"meta\": {\"code\": 1001}}`, thậm chí tệ hại nhất là trả HTTP `200 OK` cho mọi thất bại! Hậu quả của `200 OK` giả hiệu là làm mù hoàn toàn hệ thống giám sát SRE (Prometheus/Micrometer nhìn thấy tỷ lệ thành công 100% trong khi khách hàng không chuyển được đồng nào), đồng thời vô hiệu hóa luôn cơ chế tự ngắt mạch (Circuit Breaker) của Resilience4j hay Istio Service Mesh. Bắt đầu từ Spring Framework 6 / Spring Boot 3, bạn không cần tự chế class `ErrorResponse` thủ công nữa vì nền tảng đã tích hợp sẵn lớp chuẩn quốc tế `org.springframework.http.ProblemDetail` tuân thủ đặc tả **RFC 7807 / RFC 9457** với Media Type chuẩn `application/problem+json`.",
          "Một bản tin `ProblemDetail` chuẩn ngân hàng bao gồm 5 trường gốc (`type` là URI định danh loại lỗi, `title` tóm tắt ngắn, `status` mã HTTP số nguyên, `detail` mô tả thân thiện cho người dùng, `instance` đường dẫn API gặp sự cố) cùng khả năng gắn thêm các thuộc tính mở rộng đặc thù tài chính thông qua `setProperty(\"errorCode\", \"TXN_DAILY_LIMIT_EXCEEDED\")` và `setProperty(\"traceId\", mdcTraceId)`. Đặc biệt, Senior Backend phải phân định cực kỳ sắc nét mã trạng thái: dùng `400 Bad Request` khi JSON vỡ cú pháp hoặc sai kiểu dữ liệu; dùng `422 Unprocessable Entity` khi cú pháp hoàn toàn đúng nhưng vi phạm quy tắc nghiệp vụ (không đủ số dư `INSUFFICIENT_FUNDS`, vượt hạn mức ngày, tài khoản nhận bị đóng); dùng `409 Conflict` khi đụng độ trạng thái đồng thời; và tuyệt đối trong nhánh bắt `Exception.class` cuối cùng chỉ trả thông báo tổng quát kèm `traceId` — cấm tiệt việc trả `ex.getMessage()` thô làm lộ tên bảng PostgreSQL ra ngoài trình duyệt!"
        ],
        bullets: [
          "Phân biệt rạch ròi 400 vs 422 vs 409: `400` là gửi sai hình thức gói tin; `422` là gói tin chuẩn nhưng sổ cái/hạn mức từ chối thực hiện; `409` là xung đột trạng thái (ví dụ cùng một `Idempotency-Key` đang được một luồng khác xử lý dở).",
          "Mã lỗi nghiệp vụ máy đọc được (Machine-readable errorCode): Tuyệt đối không để Mobile App phải dùng `if (detail.contains(\"hạn mức\"))` vì câu chữ tiếng Việt/Anh có thể đổi bất cứ lúc nào; App chỉ được rẽ nhánh giao diện dựa trên hằng số bất biến như `TXN_INSUFFICIENT_FUNDS` hay `OTP_EXPIRED`.",
          "Bảo mật Zero-Leak theo chuẩn OWASP API: Mọi ngoại lệ `DataAccessException`, `NullPointerException` hay lỗi kết nối nội bộ phải được ghi đầy đủ stacktrace vào hệ thống Log tập trung kèm `traceId`, nhưng phía Client chỉ nhận đúng mã `500` với thông điệp an toàn: 'Hệ thống đang bận xử lý, mã tra cứu: <traceId>'."
        ]
      },
      {
        heading: "2. Idempotency-Key, API Versioning và Rate Limiting bảo vệ Core Banking",
        paragraphs: [
          "Khi khách hàng đứng trong thang máy bấm nút 'Xác nhận chuyển 100.000.000 VNĐ', gói tin `POST /api/v1/transfers` rất dễ rơi vào vùng mù mạng 4G: lệnh đã tới Server và hạch toán xong nhưng phản hồi quay về bị đứt, khiến Mobile App hoặc người dùng bấm gửi lại lần hai. Để biến thao tác `POST` vốn không lũy đẳng thành **lũy đẳng tuyệt đối (Idempotent)**, mọi API tạo biến động tiền tệ trong ngân hàng đều bắt buộc nhận header `Idempotency-Key` (chuỗi UUID v4 được App sinh cố định ngay khi mở màn hình xác nhận giao dịch). Tại phía Backend, hệ thống lưu bản ghi khóa này kèm mã băm SHA-256 của Request Payload (`requestHash`): nếu gặp lại đúng khóa đang ở trạng thái `PROCESSING` thì trả ngay `409 Conflict`; nếu đã `COMPLETED` thì trả lại nguyên vẹn biên lai cũ mà không trừ tiền lần hai; còn nếu trùng `Idempotency-Key` nhưng số tiền hoặc tài khoản nhận bị sửa khác đi thì lập tức chặn bằng lỗi `422 IDEMPOTENCY_PAYLOAD_MISMATCH`!",
          "Bên cạnh tính lũy đẳng, việc quản trị vòng đời tiến hóa của API (**API Versioning**) trên môi trường ngân hàng đòi hỏi kỷ luật thép vì bạn không bao giờ ép được 3 triệu khách hàng dùng iOS/Android cập nhật ứng dụng trong cùng một đêm. Thực tế các ngân hàng ưu tiên **URI Path Versioning** (`/api/v1/transfers`, `/api/v2/transfers`) nhờ tính minh bạch tuyệt đối khi cấu hình định tuyến, phân tách hạn ngạch trên API Gateway và đọc log truy vết. Khi cần nâng cấp thay đổi cấu trúc phá vỡ tương thích ngược (Breaking Change), hãy duy trì song song `v1` và `v2` tối thiểu 6 tháng, đồng thời gắn response headers chuẩn quốc tế `Deprecation: true` và `Sunset: Wed, 31 Dec 2026 23:59:59 GMT` để cảnh báo đối tác tích hợp. Kết hợp thêm tầng **Rate Limiting** theo thuật toán Token Bucket định danh theo `CIF` khách hàng (hoặc `Client-ID` đối tác BaaS) thay vì chỉ chặn theo địa chỉ IP NAT chung của tòa nhà văn phòng!"
        ],
        bullets: [
          "Tại sao không chặn Rate Limit đơn thuần theo IP?: Hàng nghìn nhân viên trong cùng một tòa nhà cao ốc hoặc dùng chung trạm phát sóng 4G của nhà mạng đi ra Internet qua cùng một địa chỉ Public IP (CGNAT); chặn theo IP sẽ khóa nhầm hàng loạt khách hàng vô tội, do đó phải ưu tiên khóa hạn ngạch theo `authenticatedCif`.",
          "Trả về đầy đủ Header điều tiết khi chạm ngưỡng 429: Mỗi khi từ chối bằng HTTP `429 Too Many Requests`, API chuẩn phải đính kèm header `Retry-After` (số giây cần đợi) và `X-RateLimit-Remaining` để App đối tác chủ động giảm nhịp gọi một cách văn minh.",
          "Validation tiền tệ chặt chẽ ngay từ cổng DTO: Với giao dịch nội địa VNĐ, DTO bắt buộc dùng kiểu `BigDecimal` đi kèm `@Digits(integer = 15, fraction = 0)` và `@DecimalMin(\"1000\")` để chặn đứng các trò truyền số âm `-50000` hoặc truyền lẻ `0.000001` thử lỗ hổng làm tròn."
        ]
      },
      {
        heading: "3. Keyset (Cursor/Seek) Pagination cho Sao kê Giao dịch thay thế Offset/Limit",
        paragraphs: [
          "Một trong những quả bom hẹn giờ phổ biến nhất ở các bài kiểm tra năng lực Senior là viết API xem sao kê bằng `Pageable` mặc định của Spring Data: `GET /accounts/123/transactions?page=5000&size=20`. Dưới tầng PostgreSQL hoặc Oracle, câu lệnh `OFFSET 100000 LIMIT 20` buộc cơ sở dữ liệu phải lôi toàn bộ **100.020 dòng** lên quét qua chỉ mục, sắp xếp rồi thẳng tay vứt sọt rác 100.000 dòng đầu tiên chỉ để lấy 20 dòng cuối — khách hàng càng lật về các trang lịch sử sâu hoặc xuất báo cáo cuối năm, thời gian chạy càng tăng tuyến tính từ 5ms vọt lên 15 giây! Tệ hơn nữa, đối tượng `Page<T>` của Spring mặc định còn tự động bắn kèm câu lệnh phụ `SELECT COUNT(*)` quét toàn bộ hàng triệu bút toán của tài khoản thu hộ doanh nghiệp, và nếu đúng lúc khách đang lật từ trang 1 sang trang 2 mà có một khoản chuyển tiền mới bay vào tài khoản, toàn bộ danh sách bị đẩy tụt xuống 1 nấc làm dòng cuối trang 1 xuất hiện lặp lại ở đầu trang 2 (**Page Drift**).",
          "Giải pháp chuẩn mực của mọi kiến trúc Core Banking hiện đại là **Keyset Pagination (còn gọi là Cursor hoặc Seek Method)**. Thay vì truyền số thứ tự trang vô nghĩa, phản hồi trang đầu tiên trả về một chuỗi con trỏ `nextCursor` (mã hóa Base64 của cặp giá trị neo bất biến thuộc bản ghi cuối cùng vừa đọc, ví dụ `2026-11-20T09:15:30.125Z|9845120`). Khi tải trang kế tiếp, câu truy vấn nhảy thẳng vào đúng nhánh lá của B-Tree Index thông qua điều kiện so sánh bộ đôi: `WHERE account_id = :accId AND (booking_time, entry_id) < (:cursorTime, :cursorId) ORDER BY booking_time DESC, entry_id DESC LIMIT 21`. Mẹo lấy dư 1 phần tử (`size + 1 = 21`) giúp Backend biết chính xác còn trang tiếp theo hay không (`hasMore = results.size() > 20`) rồi cắt trả đúng 20 dòng mà **triệt tiêu 100% câu lệnh `COUNT(*)` đắt đỏ**, giữ tốc độ truy vấn phẳng lỳ 2–3 mili-giây dù sao kê dài 10 dòng hay 50 triệu dòng!"
        ],
        bullets: [
          "Bắt buộc dùng khóa neo kép (Composite Tie-breaker Cursor): Trong hệ thống thanh toán lô hoặc quét QR cao điểm, hoàn toàn có thể có 5 bút toán cùng khớp chính xác tới từng micro-giây `booking_time`; nếu chỉ lọc `booking_time < :lastTime` sẽ làm rơi mất giao dịch, do đó bắt buộc ghép cặp `(booking_time, entry_id)` kết hợp Composite Index tương ứng.",
          "Mẹo LIMIT N + 1 xóa sổ lệnh COUNT(*): Khách hàng lướt sao kê trên điện thoại theo kiểu cuộn vô tận (Infinite Scroll) hoàn toàn không cần biết tổng cộng 5 năm qua mình có chính xác 482.193 giao dịch; chỉ cần cờ `hasMore: true/false` và `nextCursor` là đủ.",
          "Mã hóa Cursor dạng Opaque Token: Nên đóng gói cặp `timestamp|id` thành chuỗi Base64 URL-safe (có thể kèm chữ ký HMAC nhẹ hoặc kiểm tra thuộc đúng tài khoản hiện tại) để Client coi như một thẻ đánh dấu trang trong suốt, không tự ý đoán mò cấu trúc khóa chính nội bộ."
        ]
      }
    ],
    comparison: {
      title: "So sánh Thiết kế API Nghiệp dư và Chuẩn Enterprise Banking (Spring Boot 3)",
      headers: ["Khía cạnh thiết kế", "Cách làm nghiệp dư (Anti-pattern)", "Hậu quả thực tế trên Production", "Chuẩn Enterprise Ngân hàng"],
      rows: [
        ["Phản hồi lỗi nghiệp vụ", "Trả HTTP 200 OK kèm `{\"status\":\"FAIL\"}` hoặc ném thẳng Exception mặc định", "Đối tác gạch nợ nhầm, làm mù cảnh báo Grafana/Circuit Breaker, lộ tên bảng SQL", "Trả đúng HTTP 400/409/422/429 theo chuẩn RFC 7807 `ProblemDetail` kèm `errorCode` & `traceId`"],
        ["Chống nhân bản khi mạng lag", "Chỉ chặn nút bấm ở Frontend (disable button) mà Backend không kiểm soát", "Hacker hoặc cổng mạng retry tự động sẽ trừ tiền khách hàng 2–3 lần liên tiếp", "Bắt buộc header `Idempotency-Key` đối chiếu nguyên tử cùng mã băm SHA-256 của Payload"],
        ["Phân trang sao kê tài khoản", "Dùng `OFFSET page*size LIMIT size` kèm `Page<T>` chạy `SELECT COUNT(*)`", "Trang càng sâu DB càng treo cứng, bị lặp/mất dòng giao dịch khi có tiền mới vào", "Keyset Pagination neo theo cặp `(booking_time, id)` kết hợp mẹo đọc `LIMIT size + 1`"],
        ["Kiểm tra kiểu dữ liệu tiền tệ", "Nhận `double amount` trong DTO và không giới hạn số chữ số thập phân", "Sai số dấu phẩy động IEEE 754, nhận số âm hoặc số lẻ thập phân phá hỏng sổ cái VNĐ", "Dùng `BigDecimal` kết hợp `@NotNull`, `@DecimalMin(\"1000\")`, `@Digits(integer=15, fraction=0)`"]
      ]
    },
    codeTitle: "Controller Chuyển khoản Chuẩn Ngân hàng & GlobalExceptionHandler trả RFC 7807 ProblemDetail",
    code: [
      "public record TransferRequest(",
      "    @NotBlank @Pattern(regexp = \"^[0-9]{10,14}$\") String sourceAccountNo,",
      "    @NotBlank @Pattern(regexp = \"^[0-9]{8,19}$\") String beneficiaryAccountNo,",
      "    @NotNull @DecimalMin(\"1000\") @Digits(integer = 15, fraction = 0) BigDecimal amountVnd,",
      "    @NotBlank @Size(max = 140) String narrative) {}",
      "",
      "@RestController @RequestMapping(\"/api/v1/transfers\")",
      "public class TransferController {",
      "    private final TransferUseCase transferUseCase;",
      "    public TransferController(TransferUseCase transferUseCase) { this.transferUseCase = transferUseCase; }",
      "    @PostMapping",
      "    public ResponseEntity<TransferReceiptDto> initiateTransfer(",
      "            @RequestHeader(\"Idempotency-Key\") UUID idempotencyKey, @Valid @RequestBody TransferRequest req) {",
      "        return ResponseEntity.status(HttpStatus.CREATED).body(transferUseCase.executeIdempotent(idempotencyKey, req));",
      "    }",
      "}",
      "",
      "@RestControllerAdvice",
      "public class BankingProblemExceptionHandler extends ResponseEntityExceptionHandler {",
      "    private static final Logger log = LoggerFactory.getLogger(BankingProblemExceptionHandler.class);",
      "    @ExceptionHandler(BankingBusinessException.class)",
      "    public ProblemDetail handleBusinessRule(BankingBusinessException ex, HttpServletRequest req) {",
      "        ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getHttpStatus(), ex.getSafeUserMessage());",
      "        pd.setTitle(ex.getTitle());",
      "        pd.setType(URI.create(\"https://api.finbank.vn/problems/\" + ex.getErrorCode().toLowerCase()));",
      "        pd.setInstance(URI.create(req.getRequestURI()));",
      "        pd.setProperty(\"errorCode\", ex.getErrorCode()); // VD: TXN_INSUFFICIENT_FUNDS",
      "        pd.setProperty(\"traceId\", Optional.ofNullable(MDC.get(\"traceId\")).orElse(\"N/A\"));",
      "        return pd;",
      "    }",
      "    @ExceptionHandler(Exception.class)",
      "    public ProblemDetail handleUnexpectedSystemFault(Exception ex, HttpServletRequest req) {",
      "        String traceId = Optional.ofNullable(MDC.get(\"traceId\")).orElse(\"N/A\");",
      "        log.error(\"[UNHANDLED_FAULT] traceId={} uri={}\", traceId, req.getRequestURI(), ex);",
      "        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, \"Mã tra cứu lỗi: \" + traceId);",
      "        pd.setProperty(\"errorCode\", \"SYS_INTERNAL_ERROR\"); pd.setProperty(\"traceId\", traceId);",
      "        return pd;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Record `TransferRequest` khóa chặt quy tắc tiền tệ VNĐ ngay tại biên hệ thống: `@DecimalMin(\"1000\")` chặn giao dịch âm hoặc 0 đồng, còn `@Digits(integer = 15, fraction = 0)` từ chối thẳng thừng các số thập phân lẻ kiểu `10000.55` trước khi vào tới logic tính toán.",
      "Header `Idempotency-Key` được ép kiểu trực tiếp sang `UUID` ngay trên chữ ký hàm Controller: nếu Client bỏ trống hoặc gửi chuỗi rác không chuẩn UUID, Spring sẽ chặn ngay từ tầng Web mà chưa tốn bất kỳ truy vấn Database nào.",
      "Kế thừa `ResponseEntityExceptionHandler` trong Spring Boot 3 giúp tự động chuyển đổi cả các lỗi chuẩn của framework (như `MethodArgumentNotValidException` khi vi phạm `@Valid`) về đúng định dạng RFC 7807 `application/problem+json` đồng nhất.",
      "Nhánh `@ExceptionHandler(Exception.class)` đóng vai trò lưới bảo hiểm cuối cùng (Zero-Leak): toàn bộ stacktrace nhạy cảm chỉ được ghi vào file log nội bộ qua `log.error(..., ex)`, còn người dùng bên ngoài chỉ nhận câu thông báo sạch kèm `traceId` để gọi tổng đài hỗ trợ."
    ],
    labGuide: {
      goal: "Xây dựng và kiểm chứng bộ API Chuyển khoản chuẩn hóa lỗi RFC 7807 ProblemDetail kết hợp phân trang sao kê Keyset Pagination không dùng COUNT(*).",
      steps: [
        "Bước 1: Khởi tạo dự án Spring Boot 3.x với `spring-boot-starter-web` và `spring-boot-starter-validation`; bật cờ `spring.mvc.problemdetails.enabled=true` trong `application.yml`.",
        "Bước 2: Cài đặt `TransferController` và `BankingProblemExceptionHandler` như mẫu; tạo enum mã lỗi gồm `TXN_INSUFFICIENT_FUNDS` (HTTP 422), `TXN_DAILY_LIMIT_EXCEEDED` (HTTP 422) và `TXN_DUPLICATE_IN_PROGRESS` (HTTP 409).",
        "Bước 3: Dùng curl/Postman gửi thử một payload có `amountVnd: -5000` (xác nhận nhận HTTP 400 ProblemDetail) và một payload vượt hạn mức 500 triệu (xác nhận nhận HTTP 422 kèm `Content-Type: application/problem+json` và trường `errorCode`).",
        "Bước 4: Viết thêm endpoint `GET /api/v1/accounts/{accNo}/entries?cursor=...&limit=20` truy vấn lấy `limit + 1` dòng theo điều kiện `(booking_time, id) < (:cTime, :cId)` và kiểm chứng trên SQL log tuyệt đối không xuất hiện câu lệnh `SELECT count(...)`."
      ],
      expectedOutput: "Postman hiển thị Header `Content-Type: application/problem+json`, HTTP Status `422 Unprocessable Entity` với JSON chuẩn RFC 7807 chứa `type`, `title`, `status: 422`, `detail`, `errorCode: \"TXN_DAILY_LIMIT_EXCEEDED\"` và `traceId`, không lộ bất kỳ dòng stacktrace Java nào."
    },
    examTips: [
      "Mẹo phỏng vấn thiết kế API: Khi người phỏng vấn hỏi 'Khách chuyển tiền nhưng không đủ số dư, bạn trả HTTP 200, 400 hay mã nào?', hãy trả lời dứt khoát: Tuyệt đối không trả 200 OK; chuẩn mực nhất theo REST hiện đại là `422 Unprocessable Entity` (cú pháp JSON đúng nhưng nghiệp vụ không thể thực thi) đóng gói trong RFC 7807 `ProblemDetail` có `errorCode` tường minh.",
      "Bẫy Keyset Pagination: Nếu đề yêu cầu tối ưu API sao kê 50 triệu dòng bị chậm ở các trang cuối, đừng chỉ trả lời 'đánh thêm Index'! Ngay cả khi có Index, `OFFSET 1000000` vẫn phải duyệt qua 1 triệu nút lá trên Index; đáp án đạt điểm Senior phải là chuyển sang **Seek / Keyset Pagination** theo cặp khóa neo `(created_at, id)`.",
      "Tình huống bảo mật Idempotency: Nhớ nêu rõ kịch bản kẻ tấn công hoặc bug client gửi lại cùng `Idempotency-Key` cũ nhưng tráo đổi số tiền từ `10.000` lên `90.000.000` — Server bắt buộc phải kiểm tra mã băm payload (`request_hash`) và từ chối ngay!"
    ],
    summaryTakeaways: [
      "Luôn sử dụng chuẩn quốc tế RFC 7807 / RFC 9457 (`ProblemDetail`) để chuẩn hóa phản hồi lỗi và tuyệt đối xóa bỏ thói quen trả HTTP 200 OK kèm thông báo thất bại bên trong body.",
      "Không bao giờ để rò rỉ thông điệp ngoại lệ thô của Database/Framework ra ngoài Client; luôn quy chiếu qua `traceId` tại tầng `@RestControllerAdvice`.",
      "Mọi API tạo bút toán hoặc thay đổi trạng thái tiền tệ qua giao thức HTTP POST đều phải bắt buộc kiểm soát `Idempotency-Key` kèm đối chiếu dấu vân tay nội dung gói tin.",
      "Sử dụng Keyset Pagination với khóa neo kép `(timestamp, id)` và kỹ thuật lấy `limit + 1` để đảm bảo hiệu năng tra cứu sao kê luôn cố định vài mili-giây ở mọi độ sâu dữ liệu."
    ],
    lessonQuestions: [
      {
        question: "Một đối tác Fintech tích hợp vào API Chuyển khoản của ngân hàng bạn. Khách hàng gửi JSON hoàn toàn đúng định dạng và đủ trường bắt buộc, nhưng số tiền yêu cầu là 200.000.000 VNĐ vượt quá hạn mức giao dịch còn lại trong ngày của khách. Cách phản hồi HTTP nào dưới đây tuân thủ chuẩn thiết kế RESTful Ngân hàng hiện đại nhất?",
        options: [
          "Trả về HTTP 200 OK kèm JSON `{\"success\": false, \"message\": \"Vượt hạn mức ngày\"}` để ứng dụng đối tác không bị văng ngoại lệ HTTP",
          "Trả về HTTP 500 Internal Server Error kèm nguyên văn ngoại lệ `DailyLimitExceededException` để lập trình viên đối tác dễ đọc stacktrace",
          "Trả về HTTP 422 Unprocessable Entity theo định dạng `application/problem+json` (RFC 7807 `ProblemDetail`) có chứa hằng số `errorCode: \"TXN_DAILY_LIMIT_EXCEEDED\"` và `traceId`",
          "Trả về HTTP 401 Unauthorized để bắt buộc người dùng phải đăng nhập lại rồi hạ số tiền xuống"
        ],
        answer: 2,
        explanation: "Gói tin có cú pháp JSON và kiểu dữ liệu hoàn toàn hợp lệ (nên không phải lỗi cú pháp 400), người dùng đã xác thực hợp lệ (không phải 401), và hệ thống ngân hàng vận hành bình thường (không phải lỗi máy chủ 500). Mã `422 Unprocessable Entity` kết hợp cấu trúc chuẩn RFC 7807 `ProblemDetail` kèm `errorCode` định danh cố định giúp cả hệ thống giám sát hạ tầng lẫn code đối tác xử lý chuẩn xác 100%.",
        wrongReasons: [
          "Trả HTTP 200 OK cho giao dịch thất bại là anti-pattern nguy hiểm bậc nhất: dễ làm đối tác gạch nợ nhầm và làm tê liệt hoàn toàn các bộ đếm tỷ lệ lỗi trên API Gateway/Grafana.",
          "Lỗi vượt hạn mức của khách không phải lỗi sập máy chủ (`500`); nếu trả `500`, hệ thống cảnh báo SRE sẽ báo động giả lúc nửa đêm và Circuit Breaker có thể tự ngắt nhầm toàn bộ kênh thanh toán!",
          "",
          "`401 Unauthorized` chỉ dùng khi thiếu hoặc hết hạn thông tin xác thực (như Access Token hết hạn), dùng sai mã này sẽ khiến App đối tác tự động kích hoạt luồng Refresh Token hoặc đá người dùng văng khỏi phiên đăng nhập."
        ]
      },
      {
        question: "Khi thiết kế API xem lịch sử biến động số dư cho tài khoản thu hộ siêu thị (có trung bình 50.000 giao dịch mỗi ngày, nhiều giao dịch nổ cùng một mili-giây), giải pháp phân trang nào vừa triệt tiêu độ trễ khi cuộn sâu vừa đảm bảo KHÔNG bị rơi sót hay lặp lại bất kỳ bút toán nào?",
        options: [
          "Sử dụng `PageRequest.of(page, 20)` mặc định của Spring Data JPA để tận dụng câu lệnh `OFFSET ... LIMIT 20` và `SELECT COUNT(*)`",
          "Sử dụng Keyset Pagination chỉ dựa trên một cột duy nhất là `WHERE booking_time < :lastBookingTime ORDER BY booking_time DESC LIMIT 20`",
          "Sử dụng Keyset Pagination với cặp khóa neo kép `WHERE (booking_time, entry_id) < (:lastTime, :lastId) ORDER BY booking_time DESC, entry_id DESC LIMIT 21` đi kèm Composite Index tương ứng",
          "Tải toàn bộ 50.000 giao dịch trong ngày lên bộ nhớ RAM của Spring Boot rồi dùng `List.subList()` cắt từng trang trả cho khách"
        ],
        answer: 2,
        explanation: "Keyset Pagination giúp B-Tree Index nhảy thẳng vào vị trí cần đọc với chi phí $O(\\log N)$ thay vì quét bỏ hàng trăm nghìn dòng như `OFFSET`. Việc kết hợp khóa phụ duy nhất `entry_id` cùng `booking_time` giải quyết triệt để bài toán các giao dịch trùng mili-giây, còn `LIMIT 21` (cho trang 20 dòng) giúp xác định cờ `hasMore` mà không cần chạy `COUNT(*)`.",
        wrongReasons: [
          "`OFFSET` sâu cộng với câu lệnh `COUNT(*)` trên bảng hàng chục triệu dòng sẽ gây tải nặng I/O và gặp lỗi nhảy/lặp dòng (Page Drift) khi có giao dịch mới chèn vào liên tục.",
          "Nếu có 5 giao dịch phát sinh ở cùng đúng một thời điểm `:lastBookingTime` và trang trước vừa cắt ngang ở giao dịch thứ 2, điều kiện nghiêm ngặt `booking_time < :lastBookingTime` ở trang sau sẽ bỏ sót vĩnh viễn 3 giao dịch còn lại!",
          "",
          "Kéo 50.000 bản ghi vào Heap mỗi lần khách mở màn hình sao kê sẽ nhanh chóng đánh sập Pod dịch vụ vì `OutOfMemoryError` chỉ với vài chục người dùng đồng thời."
        ]
      }
    ]
  },

  S3: {
    duration: "65 phút",
    difficulty: "Trọng tâm → Kiến trúc Ngân hàng",
    codeLang: "java",
    teacherIntro: "Chào bạn! Trong suốt hơn 12 năm làm kiến trúc hệ thống thanh toán tại các ngân hàng, nếu bạn hỏi tôi annotation nào vừa quyền năng nhất nhưng cũng từng gây ra nhiều vụ sập hệ thống diện rộng nhất, câu trả lời không chút đắn đo chính là **`@Transactional`**! Tôi từng chứng kiến một sự cố tê liệt toàn bộ kênh Chuyển tiền Nhanh 24/7 vào đúng 10h15 sáng mùng 10 hàng tháng — giờ vàng trả lương toàn quốc. Một lập trình viên đã vô tư gắn `@Transactional` lên đầu hàm `transferInterbank()` dài gần trăm dòng: Bước 1 trừ tiền tài khoản khách trong PostgreSQL, Bước 2 gọi thẳng HTTP sang cổng chuyển mạch liên ngân hàng, Bước 3 cập nhật mã chuẩn chi. Ngày thường cổng ngoài phản hồi trong 100ms nên hệ thống chạy êm ru. Nhưng sáng hôm đó một ngân hàng bạn bị nghẽn mạng làm thời gian chờ vọt lên 25 giây! Chỉ trong chớp mắt 2 giây, đúng 30 luồng chuyển tiền tới ngân hàng kia đã ngậm chặt toàn bộ **30/30 kết nối vật lý của HikariCP** trong trạng thái nằm không chờ mạng (`idle in transaction`). Bi kịch là ngay cả 10.000 khách hàng khác chỉ vào xem số dư hay chuyển khoản nội bộ cũng bị từ chối sạch trơn vì bể kết nối đã cạn khô! Hôm nay, chúng ta sẽ mổ xẻ tận chân tơ kẽ tóc `@Transactional` để không bao giờ lặp lại vết xe đổ đắt giá đó.",
    analogy: {
      title: "Chiếm quầy thu ngân duy nhất của siêu thị để đứng buôn điện thoại 30 giây",
      body: "Bạn hãy hình dung bể kết nối **HikariCP** có `maximum-pool-size = 20` giống như siêu thị chỉ có đúng 20 quầy thu ngân đang mở. Hành động bước vào một hàm gắn `@Transactional` tương đương với việc bạn đẩy xe hàng chiếm trọn 1 quầy thu ngân và yêu cầu nhân viên khóa quầy phục vụ riêng mình cho tới khi thanh toán xong. Nếu bạn chỉ quẹt thẻ lấy hóa đơn trong **4 mili-giây** rồi bước ra trả lại quầy ngay, chỉ 20 quầy nhỏ bé đó dư sức phục vụ tới **5.000 lượt khách mỗi giây** mượt mà! Thế nhưng, nếu vừa đặt giỏ hàng lên bàn thu ngân xong, bạn lại rút điện thoại gọi sang hỏi ý kiến người nhà ở tỉnh khác và đứng nghe nhạc chờ suốt **30 giây** (chính là gọi REST/SOAP sang đối tác bên ngoài khi đang mở `@Transactional`), cô thu ngân (Database) dù chẳng có việc gì làm vẫn bị bạn khóa cứng không thể tiếp người kế tiếp. Chỉ cần 20 vị khách làm y hệt như vậy cùng lúc, cả siêu thị hàng nghìn người sẽ tắc nghẽn hoàn toàn từ quầy thu ngân tràn ra tận cổng chính!"
    },
    objectives: [
      "Nắm rõ cơ chế gắn kết nối vật lý vào ThreadLocal của PlatformTransactionManager, hóa giải bẫy Checked Exception không tự rollback và lỗi UnexpectedRollbackException.",
      "Phân tích sắc bén 7 mức Propagation (đặc biệt sự đánh đổi giữa REQUIRED và REQUIRES_NEW kèm nguy cơ Deadlock bể kết nối) và chọn đúng Isolation Level trên PostgreSQL/Oracle.",
      "Thiết kế thành thạo kiến trúc Split-Phase Transaction (Giao dịch tách pha) với TransactionTemplate để giải phóng kết nối HikariCP về 0 trước khi gọi mạng sang đối tác NAPAS/Ngân hàng bạn."
    ],
    flow: [
      {
        step: "1. Pha 1 (TX1 ~ 4ms): Kiểm tra Lũy đẳng, Trừ tạm giữ & Commit ngay",
        detail: "Mở giao dịch DB cực ngắn để kiểm tra Idempotency-Key, trừ số dư khả dụng tài khoản nguồn sang trạng thái PENDING (hoặc tài khoản treo trung gian Suspense), commit ngay để trả kết nối về HikariCP."
      },
      {
        step: "2. Pha 2 (Ngoài TX — Giữ 0 DB Connection): Gọi HTTP Đối tác",
        detail: "Luồng thực thi đứng hoàn toàn bên ngoài phạm vi @Transactional để gửi bản tin sang cổng chuyển mạch NAPAS 24/7; dù mạng đối tác lag 15 giây thì HikariCP của Core App vẫn rảnh rang 100%."
      },
      {
        step: "3. Pha 3a (TX2 ~ 3ms): Chốt Sổ cái hoặc Bút toán Đảo hoàn tiền",
        detail: "Nếu đối tác xác nhận thành công (mã 00), mở TX2 cực ngắn cập nhật trạng thái SETTLED; nếu đối tác trả mã từ chối nghiệp vụ rõ ràng (như sai số tài khoản), sinh bút toán đảo chiều hoàn trả tiền cho khách."
      },
      {
        step: "4. Pha 3b (Xử lý Timeout mù trạng thái): Treo chờ Đối soát",
        detail: "Nếu gặp ReadTimeout hoặc lỗi mạng 504 chưa rõ bên kia đã nhận được lệnh hay chưa, mở TX2 đánh dấu UNKNOWN_PENDING (tuyệt đối KHÔNG hoàn tiền vội) để tiến trình Tra soát / Đối soát T+0 xác minh."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu @Transactional: Connection Binding, Checked Exception Trap & ReadOnly",
        paragraphs: [
          "Để kiểm soát giao dịch như một bậc thầy, bạn phải thấy rõ những gì diễn ra dưới lớp màn nhung của Spring. Khi luồng gọi đi vào phương thức `@Transactional`, `TransactionInterceptor` yêu cầu `PlatformTransactionManager` (như `JpaTransactionManager` hoặc `DataSourceTransactionManager`) mượn **1 kết nối TCP vật lý** từ bể HikariCP, chuyển `connection.setAutoCommit(false)`, rồi cất giữ kết nối đó vào biến `ThreadLocal` thuộc `TransactionSynchronizationManager`. Xuyên suốt từ dòng code đầu tiên đến dòng code cuối cùng của hàm đó — dù bạn đang tính toán vòng lặp trên CPU, chờ đọc file hay đợi mạng — kết nối DB quý giá kia vẫn bị găm chặt vào luồng hiện tại, không một request nào khác mượn dùng được cho tới khi hàm thoát ra để gọi `commit()` hoặc `rollback()` và trả về bể!",
          "Bên cạnh thời gian giữ kết nối, có hai cái bẫy chết người trong quy tắc rollback mà mọi kỹ sư ngân hàng phải khắc cốt ghi tâm. **Thứ nhất**: Theo thiết kế lịch sử từ thời EJB, mặc định `@Transactional` của Spring **CHỈ tự động rollback đối với Unchecked Exceptions (`RuntimeException` và `Error`)**; nếu hàm của bạn trừ tiền tài khoản nguồn xong rồi ném ra một **Checked Exception** (ví dụ `throws Iso8583FormatException`, `IOException` hay `GeneralSecurityException` khi ký số lỗi), Spring coi đó là ngoại lệ nghiệp vụ dự kiến và vẫn thản nhiên gọi lệnh **`COMMIT`** ghi cứng việc trừ tiền xuống ổ đĩa! Vì vậy, quy ước bắt buộc trong mọi dự án tài chính là luôn khai báo tường minh `@Transactional(rollbackFor = Exception.class)`. **Thứ hai**: Nếu hàm cha A gọi hàm con B (cùng dùng chung giao dịch `REQUIRED`), hàm B ném `RuntimeException` sẽ đánh dấu cờ `rollbackOnly = true` lên giao dịch vật lý chung; dù hàm cha A có bọc `try-catch` nuốt gọn ngoại lệ của B để định chạy tiếp, đến cuối hàm A khi Spring cố commit vẫn sẽ nổ tung ngoại lệ `UnexpectedRollbackException`!"
        ],
        bullets: [
          "Quy tắc sắt đá rollbackFor = Exception.class: Đừng bao giờ để tài sản khách hàng phụ thuộc vào việc một ngoại lệ kế thừa từ `Exception` hay `RuntimeException`; hãy khóa chặt quy tắc hoàn tác cho mọi loại lỗi ngay trên chữ ký annotation.",
          "Lợi ích kép của @Transactional(readOnly = true): Với các hàm chỉ đọc số dư hoặc tra cứu chi tiết giao dịch, bật `readOnly = true` giúp Hibernate bỏ qua hoàn toàn việc tạo bản chụp Dirty Checking (tiết kiệm 40–50% RAM trên mỗi request) và cho phép tầng Driver/Proxy định tuyến truy vấn sang máy chủ Read Replica.",
          "Phát sự kiện an toàn sau khi Commit: Không bao giờ bắn thông báo SMS biến động số dư ngay giữa thân hàm `@Transactional` vì nếu bước commit ngay sau đó thất bại, khách đã nhận tin nhắn cộng tiền giả! Hãy dùng `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` (hoặc Outbox Pattern ở Học phần M)."
        ]
      },
      {
        heading: "2. Ma trận Propagation (REQUIRED vs REQUIRES_NEW) và rủi ro Deadlock cạn Pool",
        paragraphs: [
          "Spring cung cấp 7 mức lan truyền giao dịch (`Propagation`), nhưng trong 98% bài toán thực tế tại ngân hàng, cuộc chiến xoay quanh việc phân định giữa `REQUIRED` (mặc định) và `REQUIRES_NEW`. Với **`REQUIRED`**, nếu luồng gọi đã có sẵn một giao dịch đang mở, phương thức con sẽ gia nhập chung vào đúng giao dịch vật lý đó (dùng chung 1 kết nối DB): thành công thì cùng sống, thất bại ở bất kỳ mắt xích nào thì toàn bộ cùng hủy bỏ. Ngược lại, **`REQUIRES_NEW`** ra lệnh cho Transaction Manager tạm đóng băng (`suspend`) giao dịch cha trên `ThreadLocal`, chạy ra HikariCP **mượn thêm kết nối vật lý thứ 2** để mở một giao dịch hoàn toàn độc lập, thực thi và `COMMIT` dứt điểm kết nối thứ 2 đó xuống đĩa trước khi đánh thức giao dịch cha chạy tiếp! Đây là chìa khóa cho các nghiệp vụ bắt buộc giữ vết ngay cả khi giao dịch chính bị hủy: ghi lịch sử từ chối thanh toán, lưu nhật ký kiểm toán bảo mật, hoặc cộng tăng bộ đếm nhập sai mã PIN thẻ (`pin_fail_count`) để khóa thẻ sau 5 lần sai.",
          "Thế nhưng, một Senior khác biệt hoàn toàn với Junior ở chỗ nhìn thấu **cái bẫy Deadlock cạn kiệt Pool (Connection Pool Starvation Deadlock)** khi lạm dụng `REQUIRES_NEW`! Hãy làm một phép tính đơn giản: giả sử Pod dịch vụ cấu hình `hikari.maximum-pool-size = 10`. Đúng đỉnh cao điểm khuyến mãi, có 10 request bay vào cùng lúc, mỗi luồng chiếm gọn 1 kết nối cho giao dịch cha `TX1` (bể HikariCP lúc này còn `0` kết nối rảnh). Ngay dòng tiếp theo, cả 10 luồng đồng loạt bước vào hàm ghi log gắn `REQUIRES_NEW` và đứng xếp hàng xin mượn kết nối thứ 2 (`TX2`): nhưng không một luồng nào nhả được `TX1` nếu chưa chạy xong `TX2`, trong khi `TX2` lại không thể lấy được kết nối vì cả 10 kết nối đang bị `TX1` ôm cứng! Toàn bộ hệ thống rơi vào thế khóa chết tự bóp cổ mình cho tới khi nổ `ConnectionTimeout`. Do đó, chỉ dùng `REQUIRES_NEW` cho thao tác ghi cực chớp nhoáng (1–2ms), tính toán dư địa kích thước Pool theo công thức an toàn, hoặc đẩy việc ghi log không trọng yếu sang luồng bất đồng bộ riêng."
        ],
        bullets: [
          "Cẩn trọng xung đột khóa dòng giữa TX cha và TX con REQUIRES_NEW: Nếu giao dịch cha `TX1` vừa cập nhật dòng `Account(id=99)` (đang giữ Exclusive Row Lock trên PostgreSQL chưa commit) rồi gọi ngay hàm con `REQUIRES_NEW` cũng cố `UPDATE` vào đúng dòng `Account(id=99)` đó, luồng thực thi sẽ tự khóa chính mình đến chết vì `TX2` đứng đợi khóa của `TX1` đang bị treo!",
          "Hiểu đúng Isolation Level thực chiến: Mặc định của PostgreSQL và Oracle là `READ_COMMITTED` (chống đọc dữ liệu bẩn Dirty Read nhưng vẫn có thể gặp Non-repeatable Read hoặc Lost Update nếu hai luồng cùng đọc rồi ghi đè số dư). Thay vì bật `@Transactional(isolation = Isolation.SERIALIZABLE)` làm giảm mạnh thông lượng và gây bão lỗi retry, các hệ thống ngân hàng giữ nguyên `READ_COMMITTED` kết hợp khóa dòng chủ động (`SELECT ... FOR UPDATE` hoặc `@Version` ở Học phần D).",
          "Vai trò của MANDATORY trong tầng Core Domain: Bạn có thể gắn `Propagation.MANDATORY` lên các hàm ghi bút toán cấp thấp để ép buộc mọi lời gọi từ bên ngoài bắt buộc phải mở sẵn giao dịch hợp lệ trước khi đi vào, nếu gọi trần trụi sẽ bị từ chối ngay lập tức."
        ]
      },
      {
        heading: "3. Thiết kế Split-Phase Transaction & TransactionTemplate giải phóng HikariCP",
        paragraphs: [
          "Quay trở lại thảm kịch nghẽn HikariCP khi gọi cổng NAPAS ở phần mở đầu, quy tắc vàng bất khả xâm phạm trong kiến trúc Microservices Tài chính là: **Tuyệt đối không thực hiện bất kỳ lời gọi mạng đồng bộ nào (HTTP REST, SOAP, gRPC, tải file S3/SFTP, gửi Email/SMS) bên trong phạm vi một `@Transactional` đang mở**. Thay vì lười biếng quăng một chữ `@Transactional` lên đầu phương thức điều phối tổng, chúng ta áp dụng mẫu kiến trúc **Split-Phase Transaction (Giao dịch tách pha — kết hợp Sổ cái Trạng thái trung gian)**: chia nhỏ quy trình thành các giao dịch cơ sở dữ liệu hạt mịn chỉ kéo dài **2 đến 5 mili-giây**, xen giữa là pha gọi đối tác hoàn toàn không giữ kết nối DB!",
          "Trong thực tế lập trình Spring Boot 3, bạn có hai cách triển khai Split-Phase cực kỳ thanh lịch: hoặc tạo một lớp điều phối `InterbankTransferOrchestrator` (KHÔNG gắn `@Transactional`) lần lượt gọi vào các phương thức ngắn của `LedgerTransactionService`, hoặc tiêm trực tiếp công cụ lập trình **`TransactionTemplate`** để khoanh vùng chính xác từng khối lệnh SQL cần tính nguyên tử ngay trong code. Hãy nhìn luồng chuẩn ngân hàng vận hành: **Pha 1** (mở TX1 ~4ms) kiểm tra `Idempotency-Key`, trừ số dư khả dụng của khách và ghi bút toán trạng thái `PENDING` vào tài khoản treo trung gian, commit và trả kết nối về HikariCP ngay lập tức. **Pha 2** (0 kết nối DB) gọi `restClient` sang NAPAS với timeout chặt chẽ. **Pha 3** (mở TX2 ~3ms) nhận kết quả: nếu mã `00` thành công thì chuyển bút toán sang `SETTLED`; nếu nhận mã từ chối xác định từ ngân hàng bạn (như `14` số tài khoản không tồn tại) thì sinh bút toán đảo chiều trả lại tiền cho khách; còn nếu gặp `ResourceAccessException` / `ReadTimeoutException` thì giữ trạng thái `UNKNOWN_TIMEOUT` để hệ thống tra soát tự động kiểm tra với NAPAS chứ tuyệt đối không hoàn tiền mù quáng!"
        ],
        bullets: [
          "Sức mạnh của TransactionTemplate: Giúp bạn nhìn thấy ranh giới bắt đầu và kết thúc giao dịch rõ mồn một ngay trong thân hàm, loại bỏ hoàn toàn nguy cơ dính bẫy Self-Invocation khi tách nhỏ nhiều pha giao dịch trong cùng một dịch vụ.",
          "Hiệu quả nhân bội sức chịu tải HikariCP: Khi rút thời gian giữ kết nối DB của mỗi lệnh chuyển tiền từ `1.500ms` (do gánh cả HTTP ngoài) xuống còn `4ms + 3ms = 7ms`, cùng một bể HikariCP 20 kết nối sẽ tăng thông lượng phục vụ từ **13 TPS vọt lên hơn 2.800 TPS** — gấp hơn 200 lần mà không tốn thêm một đồng nâng cấp phần cứng!",
          "Kỷ luật sinh mệnh khi gặp ReadTimeout liên ngân hàng: Mất kết nối lúc đọc phản hồi KHÔNG đồng nghĩa giao dịch thất bại (rất có thể ngân hàng đích đã cộng tiền cho người nhận rồi!); nếu code tự động rollback hoàn tiền ngay lúc timeout, kẻ gian sẽ rút sạch tiền ở cả hai đầu ngân hàng."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Chiến lược Quản lý Transaction trong Dịch vụ Thanh toán Liên Ngân hàng",
      headers: ["Chiến lược thiết kế", "Số DB Connection giữ mỗi luồng", "Thời gian ngậm kết nối trung bình", "Đánh giá độ an toàn Production"],
      rows: [
        ["Một @Transactional ôm trọn cả lời gọi HTTP đối tác", "1 kết nối bị khóa cứng suốt cuộc gọi mạng", "300ms → 30.000ms (khi đối tác lag)", "CỰC KỲ NGUY HIỂM — Đối tác chậm 10 giây sẽ kéo sập toàn bộ HikariCP của ngân hàng"],
        ["Giao dịch REQUIRED lồng REQUIRES_NEW để ghi Audit", "2 kết nối đồng thời trên cùng 1 luồng tại điểm lồng", "5ms → 15ms (nếu chỉ ghi SQL nội bộ)", "Tốt nếu hàm con cực nhanh, nhưng phải tính dư Pool Size để tránh Pool Starvation Deadlock"],
        ["Split-Phase Transaction (Tách 2 pha ngắn bằng TransactionTemplate)", "1 kết nối lúc ghi DB, 0 kết nối lúc gọi HTTP ngoài", "Chỉ ~4ms ở Pha 1 và ~3ms ở Pha 3", "CHUẨN MỰC CORE BANKING — Cô lập hoàn toàn độ trễ mạng ngoài khỏi Database nội bộ"],
        ["@Transactional(readOnly = true) cho API Tra cứu / Sao kê", "1 kết nối ngắn (hỗ trợ trỏ sang Read Replica)", "2ms → 10ms, tắt tốn kém Dirty Checking", "Tối ưu RAM và giảm tải cho cụm Primary Database ở giờ cao điểm"]
      ]
    },
    codeTitle: "Kiến trúc Split-Phase Interbank Transfer: Giải phóng DB Connection trước khi gọi NAPAS & Ghi Audit độc lập",
    code: [
      "@Service",
      "public class InterbankTransferOrchestrator {",
      "    private final TransactionTemplate txTemplate;",
      "    private final LedgerGateway ledgerGateway;",
      "    private final NapasIbftClient napasClient;",
      "    private final TransferAuditService auditService;",
      "    public InterbankTransferOrchestrator(PlatformTransactionManager txManager,",
      "            LedgerGateway ledgerGateway, NapasIbftClient napasClient, TransferAuditService auditService) {",
      "        this.txTemplate = new TransactionTemplate(txManager);",
      "        this.ledgerGateway = ledgerGateway;",
      "        this.napasClient = napasClient;",
      "        this.auditService = auditService;",
      "    }",
      "    // TUYỆT ĐỐI KHÔNG gắn @Transactional ở hàm điều phối tổng này!",
      "    public TransferResult processIbft247(InterbankTransferCmd cmd) {",
      "        // PHA 1 (~4ms): Trừ tiền khả dụng & tạo bút toán PENDING, commit trả ngay DB Connection về HikariCP",
      "        Long journalId = txTemplate.execute(status -> ledgerGateway.debitAndHoldSuspense(cmd));",
      "        // PHA 2 (0 DB Connection): Gọi mạng sang NAPAS — đối tác có lag 15s cũng không tốn 1 kết nối DB nào!",
      "        NapasResponse napasResp;",
      "        try {",
      "            napasResp = napasClient.sendTransfer247(journalId, cmd);",
      "        } catch (ResourceAccessException timeoutEx) {",
      "            // Mất kết nối / ReadTimeout: KHÔNG ĐƯỢC hoàn tiền mù quáng, giữ treo chờ tra soát!",
      "            txTemplate.executeWithoutResult(s -> ledgerGateway.markUnknownForReconciliation(journalId));",
      "            auditService.saveIncidentInNewTx(journalId, \"NAPAS_READ_TIMEOUT\");",
      "            return TransferResult.pendingVerification(journalId);",
      "        }",
      "        // PHA 3 (~3ms): Mở giao dịch ngắn thứ hai chốt sổ hoặc sinh bút toán đảo chiều hoàn tiền",
      "        return txTemplate.execute(status -> {",
      "            if (napasResp.isApproved00()) {",
      "                return ledgerGateway.settleSuccess(journalId, napasResp.rrn());",
      "            }",
      "            auditService.saveIncidentInNewTx(journalId, \"DECLINED_\" + napasResp.responseCode());",
      "            return ledgerGateway.compensateDefinitiveDecline(journalId, napasResp.responseCode());",
      "        });",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Hàm `processIbft247` chủ đích KHÔNG gắn `@Transactional`: kết nối vật lý từ HikariCP chỉ được mượn đúng vài mili-giây bên trong khối lambda `txTemplate.execute(...)` của Pha 1 rồi được commit và trả về bể ngay lập tức trước khi chạm tới dòng `napasClient.sendTransfer247(...)`.",
      "Sử dụng `TransactionTemplate` giúp ranh giới giao dịch hiển hiện tường minh ngay trong thân hàm, miễn nhiễm 100% với bẫy Self-Invocation mà không bắt buộc phải đẻ thêm quá nhiều class trung gian nhỏ lẻ.",
      "Nhánh `catch (ResourceAccessException timeoutEx)` minh họa kỷ luật vàng của kỹ sư thanh toán: khi gặp lỗi mạng chưa rõ đối tác đã hạch toán hay chưa, hệ thống chuyển trạng thái sang `PENDING_RECONCILIATION` thay vì ném ngoại lệ rollback hay tự ý hoàn tiền.",
      "Phương thức `auditService.saveIncidentInNewTx(...)` ở Bean bên cạnh được cấu hình `@Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)` để đảm bảo mọi mã lỗi từ chối từ cổng NAPAS luôn được lưu vết phục vụ vận hành bất kể kết quả giao dịch ngoài."
    ],
    labGuide: {
      goal: "Chứng minh thực nghiệm sự sụp đổ của HikariCP khi gọi HTTP chậm bên trong @Transactional và kiểm chứng sức chịu tải vượt trội sau khi chuyển sang Split-Phase Transaction.",
      steps: [
        "Bước 1: Cấu hình `spring.datasource.hikari.maximum-pool-size=5` và `connection-timeout=2000` trong `application.yml` để dễ quan sát giới hạn bể kết nối trên máy cá nhân.",
        "Bước 2: Viết phiên bản lỗi: gắn `@Transactional` lên hàm chuyển tiền có chứa lệnh giả lập đối tác lag `Thread.sleep(3000)` (tượng trưng gọi HTTP NAPAS chậm 3s), sau đó bắn đồng thời 10 request chuyển tiền kèm 1 request `GET /health/db` chỉ đọc số dư.",
        "Bước 3: Quan sát request đọc số dư bị chết đứng với lỗi `SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 2000ms` vì cả 5 kết nối đã bị hàm ngủ chờ mạng chiếm sạch!",
        "Bước 4: Refactor hàm chuyển tiền sang mẫu `InterbankTransferOrchestrator` dùng `TransactionTemplate` tách làm Pha 1 và Pha 3 quanh lời gọi `sleep(3000)`, chạy lại đúng bài tải 10 luồng song song và xác nhận API đọc số dư phản hồi tức thì dưới 5ms!"
      ],
      expectedOutput: "Ở phiên bản cũ, từ request thứ 6 trở đi nổ lỗi cạn kiệt HikariCP hàng loạt sau 2 giây; sau khi tách pha bằng `TransactionTemplate`, cả 10 luồng gọi đối tác chậm lẫn hàng trăm lượt truy vấn số dư chạy song song thành công 100% với `HikariPool active connections` chỉ nhấp nháy 0–1."
    },
    examTips: [
      "Câu hỏi tủ vòng System Design / Code Review Ngân hàng: Hễ thấy đề bài cho đoạn code `@Transactional` bên trong có `restTemplate.postForEntity(...)`, `webClient.block()`, `feignClient` hoặc `kafkaTemplate.send().get()`, hãy khoanh vùng báo động đỏ ngay lập tức về rủi ro **cạn kiệt HikariCP Connection Pool** và đề xuất mẫu **Split-Phase Transaction** (hoặc Outbox cho Kafka)!",
      "Bẫy phỏng vấn lý thuyết sâu: 'Nếu hàm `@Transactional` ném `new IOException(\"Lỗi đọc file chứng thư\")` thì dữ liệu vừa `save()` trước đó được Commit hay Rollback?' -> Đáp án: **Bị COMMIT**! Vì `IOException` là Checked Exception, trừ khi đã khai báo rõ `rollbackFor = Exception.class`.",
      "Bẫy lồng giao dịch: 'Hàm A (`REQUIRED`) gọi hàm B (`REQUIRED` ở bean khác). B ném `RuntimeException`, A dùng `try-catch` bắt hết lỗi rồi return bình thường. Kết quả cuối cùng?' -> Nổ **`UnexpectedRollbackException`** lúc thoát hàm A vì giao dịch chung đã bị đánh dấu `rollbackOnly`!"
    ],
    summaryTakeaways: [
      "Mỗi phương thức mở `@Transactional` sẽ chiếm giữ độc quyền 1 kết nối vật lý từ HikariCP trên `ThreadLocal` xuyên suốt từ lúc bắt đầu cho tới khi hàm kết thúc.",
      "Luôn khai báo tường minh `@Transactional(rollbackFor = Exception.class)` cho các giao dịch ghi dữ liệu tài chính và dùng `@Transactional(readOnly = true)` cho các truy vấn đọc.",
      "Tuyệt đối không đặt lời gọi mạng sang hệ thống bên ngoài bên trong phạm vi giao dịch DB; hãy tách thành các pha giao dịch ngắn vài mili-giây bằng `TransactionTemplate`.",
      "Sử dụng `Propagation.REQUIRES_NEW` có chọn lọc cho tác vụ ghi vết độc lập cực ngắn và luôn tính toán kích thước HikariCP đủ dư địa để phòng ngừa Pool Starvation Deadlock."
    ],
    lessonQuestions: [
      {
        question: "Trong dịch vụ Chuyển tiền Nhanh 24/7 của ngân hàng, phương thức `transfer()` đang được gắn `@Transactional(rollbackFor = Exception.class)` bao trùm cả 3 bước: (1) Trừ số dư tài khoản nguồn trong PostgreSQL, (2) Gọi REST API sang cổng NAPAS (timeout cấu hình 30 giây), (3) Lưu mã tham chiếu giao dịch. Điều gì xảy ra khi cổng đối tác bị nghẽn mạng phản hồi mất 28 giây và đồng thời có một số request bị `ReadTimeoutException` ở giây thứ 30?",
        options: [
          "Hệ thống hoàn toàn an toàn vì Spring sẽ tự động trả kết nối DB về HikariCP trong lúc chờ HTTP, và khi gặp ReadTimeout thì tự động rollback hoàn tiền chính xác cho khách",
          "Xảy ra thảm họa kép: (1) Các luồng chờ HTTP ngậm cứng kết nối làm cạn sạch HikariCP gây sập toàn bộ microservice; (2) Khi nổ ReadTimeout, việc Spring tự động rollback hoàn tiền ngay lập tức có nguy cơ làm ngân hàng mất trắng tiền nếu thực tế đối tác đã nhận được lệnh và cộng tiền cho người thụ hưởng!",
          "Chỉ làm tăng nhẹ dung lượng RAM của JVM chứ không ảnh hưởng tới các API đọc số dư dùng chung Database",
          "PostgreSQL sẽ tự động phát hiện lời gọi HTTP để hủy bản tin bên phía cổng NAPAS thông qua giao thức Two-Phase Commit"
        ],
        answer: 1,
        explanation: "Đây là lỗi thiết kế nghiêm trọng bậc nhất trong ngành thanh toán: thứ nhất, kết nối vật lý bị trói chặt vào `ThreadLocal` suốt 28–30 giây chờ mạng khiến bể HikariCP cạn khô chỉ sau vài chục request đồng thời; thứ hai, `ReadTimeout` là trạng thái mù thông tin (ngân hàng đích có thể đã hạch toán Có thành công), nếu để `@Transactional` tự rollback xóa dấu vết trừ tiền ngay lập tức sẽ gây thất thoát tiền tệ nghiêm trọng thay vì treo ở trạng thái `PENDING` chờ tra soát.",
        wrongReasons: [
          "Spring KHÔNG BAO GIỜ tự động nhả kết nối DB giữa chừng khi giao dịch chưa commit/rollback, và tự động hoàn tiền khi chưa rõ kết quả phía đối tác là tối kỵ trong nghiệp vụ ngân hàng.",
          "",
          "Mọi API đọc số dư đi chung qua `DataSource` (HikariCP) của microservice đó đều sẽ bị chặn đứng và văng lỗi `Connection is not available` khi bể kết nối bị ngậm hết.",
          "PostgreSQL nội bộ hoàn toàn không có giao thức 2PC nào nối sang REST API của đối tác liên ngân hàng bên ngoài."
        ]
      },
      {
        question: "Phương thức `changeCardPin()` của `CardService` được gắn `@Transactional(rollbackFor = Exception.class)`. Khi khách nhập sai mã PIN cũ, nó gọi `securityLogService.incrementWrongPinAttempt(cardId)` (ở một Bean khác) rồi ném `InvalidPinException` để hủy thao tác đổi PIN. Yêu cầu nghiệp vụ bắt buộc bộ đếm nhập sai PIN vẫn phải tăng lên và lưu bền vững xuống DB để khóa thẻ nếu sai 5 lần, đồng thời tránh nguy cơ Deadlock bể kết nối. Cấu hình và thiết kế nào cho `incrementWrongPinAttempt` là đúng chuẩn?",
        options: [
          "Giữ nguyên mặc định `@Transactional(propagation = Propagation.REQUIRED)` và bọc `try-catch` trong `CardService`",
          "Đặt `@Transactional(propagation = Propagation.SUPPORTS)` để chạy không cần giao dịch",
          "Đặt `@Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)` trên hàm `incrementWrongPinAttempt` thực thi câu lệnh UPDATE cực gọn (không cập nhật trùng dòng đang bị giao dịch cha khóa độc quyền) và đảm bảo HikariCP được tính toán đủ kết nối",
          "Chuyển phương thức `incrementWrongPinAttempt` thành `private` trong cùng class `CardService` để chạy tách biệt"
        ],
        answer: 2,
        explanation: "`Propagation.REQUIRES_NEW` tạm treo giao dịch cha, mượn một kết nối mới để cập nhật bảng đếm sai PIN và commit ngay lập tức xuống đĩa cứng; nhờ đó khi hàm cha ném `InvalidPinException` gây rollback giao dịch đổi PIN, số lần nhập sai vẫn được bảo toàn 100%. Lưu ý thực thi gọn trên bảng/dòng tách biệt với dòng đang bị giao dịch cha giữ khóa độc quyền và tính toán Pool hợp lý.",
        wrongReasons: [
          "Với `REQUIRED`, cả hai hàm dùng chung một giao dịch vật lý nên khi `changeCardPin()` ném ngoại lệ rollback, việc tăng bộ đếm nhập sai PIN cũng bị hủy sạch khiến kẻ gian thử mật khẩu vô hạn lần không bao giờ bị khóa thẻ!",
          "`SUPPORTS` khi được gọi từ một hàm đang có sẵn giao dịch (`changeCardPin`) sẽ tự động gia nhập luôn vào giao dịch đang mở đó, nên khi cha rollback thì dữ liệu cũng mất sạch y hệt `REQUIRED`.",
          "",
          "Gọi hàm `private` trong cùng một class vừa dính bẫy Self-Invocation vừa bị CGLIB bỏ qua hoàn toàn annotation, nên nó chạy chung kết nối giao dịch đang mở của hàm cha và bị rollback theo."
        ]
      }
    ]
  },

  S4: {
    duration: "60 phút",
    difficulty: "Nâng cao → Senior Thực chiến",
    codeLang: "java",
    teacherIntro: "Chào bạn! Nếu có một gót chân Achilles khiến các ứng dụng viết bằng Spring Data JPA chạy mượt như nhung trên máy lập trình viên (chỉ có 5 bản ghi mẫu) nhưng vừa lên Production của ngân hàng đã bốc cháy CPU Database lên 99%, thì đó chính là **bão truy vấn N+1 của Hibernate** và cấu hình khóa chính sai lầm! Tôi từng trực tiếp giải cứu cổng Ngân hàng Số Doanh nghiệp (Corporate Banking) vào sáng đầu quý: mỗi lần Giám đốc Tài chính của một tập đoàn đăng nhập mở màn hình Tổng quan 250 tài khoản chi nhánh kèm danh sách ví ngoại tệ và chi nhánh quản lý, màn hình xoay tròn suốt 14 giây rồi đứt kết nối. Khi bật thống kê Hibernate lên, cả phòng nín thở: chỉ **1 lời gọi API duy nhất** của 1 khách hàng đã âm thầm nã tới **501 câu lệnh SQL** rời rạc xuống PostgreSQL Primary! Chưa hết, đến tối chạy lô hạch toán lương 20.000 dòng bằng `saveAll()`, thời gian kéo dài lê thê 22 phút chỉ vì entity trót gắn `GenerationType.IDENTITY` làm tắt ngấm tính năng JDBC Batch Insert! Hôm nay, chúng ta sẽ làm chủ nội tạng Hibernate để biến 501 câu SQL thành đúng 1 câu duy nhất và đẩy tốc độ ghi lô nhanh gấp 25 lần.",
    analogy: {
      title: "Đi siêu thị mua 100 món đồ bằng 100 chuyến xe máy rời rạc",
      body: "Bạn hãy hình dung lỗi **N+1 Query** giống hệt cách đi chợ kỳ quặc này: chuyến thứ nhất bạn phóng xe từ nhà ra siêu thị chỉ để xin tờ danh sách 100 món hàng cần mua (`1 câu lệnh SELECT cha lấy 100 tài khoản`). Sau đó, thay vì đẩy xe gom luôn một lượt, cứ đọc tới từng dòng trên giấy bạn lại nổ máy chạy về nhà rồi vòng lại siêu thị nhặt đúng 1 hộp sữa mang về (`100 câu lệnh SELECT con lẻ tẻ khi vòng lặp Java gọi account.getWallets()`)! Tiền xăng và thời gian đóng mở cửa cổng mạng (Network Round-trip) đắt gấp hàng trăm lần giá trị món đồ. Ngược lại, **`JOIN FETCH` / `@EntityGraph`** là đẩy chiếc xe hàng lớn gom trọn mọi thứ trong đúng 1 vòng đi duy nhất; còn **DTO Projection** là chỉ nhặt gọn những nguyên liệu thực sự cần dùng tối nay thay vì khuân cả dãy kệ siêu thị về chất chật cứng căn bếp (`Heap Memory`) của bạn!"
    },
    objectives: [
      "Hiểu sâu cơ chế vận hành của Persistence Context (First-level Cache), cơ chế tự động phát hiện thay đổi Dirty Checking và lý do sống còn phải tắt spring.jpa.open-in-view.",
      "Triệt tiêu hoàn toàn lỗi N+1 Query bằng JOIN FETCH, @EntityGraph, Java Record DTO Projection và hóa giải bẫy tràn bộ nhớ HHH90003004 khi kết hợp Fetch Join với Phân trang.",
      "Kích hoạt thành công cơ chế gom lô JDBC Batch Insert tốc độ cao trên PostgreSQL/Oracle bằng chiến lược sinh khóa SEQUENCE kết hợp thuật toán pooled-lo và xả bộ nhớ định kỳ."
    ],
    flow: [
      {
        step: "1. Khóa van rò rỉ kết nối: Tắt Open-Session-In-View & Mặc định LAZY",
        detail: "Đặt spring.jpa.open-in-view=false ngay ngày đầu dự án và ép toàn bộ quan hệ (@ManyToOne, @OneToOne, @OneToMany) sang FetchType.LAZY để ngăn Hibernate tự ý bắn SQL ngầm."
      },
      {
        step: "2. Phân tách Luồng Đọc & Luồng Ghi ngay tại Repository",
        detail: "Với 85% API chỉ tra cứu hiển thị sao kê/danh sách, trả thẳng ra Java Record DTO Projection nhẹ tênh; chỉ nạp đầy đủ JPA Entity khi thực sự cần kiểm tra quy tắc và cập nhật trạng thái."
      },
      {
        step: "3. Diệt N+1 an toàn bằng JOIN FETCH hoặc Truy vấn 2 Bước khi Phân trang",
        detail: "Khi cần nạp cha kèm tập hợp con (@OneToMany) có phân trang, bước 1 truy vấn lấy danh sách ID theo trang, bước 2 dùng WHERE id IN (:ids) kèm LEFT JOIN FETCH để không bao giờ phân trang trong RAM."
      },
      {
        step: "4. Gom lô bút toán với SEQUENCE + JDBC Batching + flush/clear",
        detail: "Chuyển khóa chính sang GenerationType.SEQUENCE (allocationSize=50), bật hibernate.jdbc.batch_size=50 cùng reWriteBatchedInserts=true để đẩy 50 dòng bút toán chỉ trong 1 gói tin mạng."
      }
    ],
    sections: [
      {
        heading: "1. Persistence Context, Dirty Checking & Cái bẫy ngầm Open-In-View",
        paragraphs: [
          "Mỗi khi bạn gọi một phương thức truy vấn trả về `@Entity` bên trong một giao dịch đang mở, đối tượng `EntityManager` (chính là **Persistence Context** hay **First-level Cache** gắn liền với phiên giao dịch đó) không chỉ giữ tham chiếu tới đối tượng Java của bạn, mà còn âm thầm tạo thêm một bản sao mảng dữ liệu gốc (**Loaded State Snapshot**) nằm ngay trên bộ nhớ Heap. Ngay trước thời điểm commit giao dịch (`flush`), Hibernate thực hiện cơ chế **Dirty Checking**: duyệt qua toàn bộ các entity đang được quản lý trong Persistence Context, đem từng thuộc tính hiện tại so sánh đối chiếu với bản chụp gốc ban đầu. Nếu một lập trình viên vô tình gọi `account.setAccountTitle(account.getAccountTitle().toUpperCase())` trên đối tượng Entity chỉ với ý định làm đẹp chữ trước khi trả về giao diện mà quên mất hàm đó không phải `readOnly`, Hibernate sẽ tự động phát sinh câu lệnh `UPDATE accounts SET ...` ghi đè xuống Database thật!",
          "Nguy hiểm gấp bội là tính năng lịch sử mang tên **Open-Session-In-View (`spring.jpa.open-in-view=true` — đáng tiếc vẫn bật mặc định để chiều lòng người mới học trong Spring Boot)**. Khi cờ này bật, `EntityManager` không hề đóng lại khi thoát khỏi tầng `@Service` kết thúc `@Transactional`, mà tiếp tục sống dai dẳng sang tận tầng `@RestController` trong lúc thư viện Jackson đang tuần tự hóa đối tượng sang chuỗi JSON! Hãy hình dung tai họa kép trên hệ thống ngân hàng: thứ nhất, khi Jackson duyệt qua các getter quan hệ lười (`getWallets()`, `getCustomer()`), nó âm thầm kích hoạt hàng trăm câu SQL lẻ tẻ chạy bên ngoài giao dịch nhất quán; thứ hai, kết nối cơ sở dữ liệu HikariCP bị giữ khư khư trong suốt thời gian máy chủ nén JSON và truyền dữ liệu qua mạng 3G yếu ớt về điện thoại khách hàng! Vì vậy, tiêu chuẩn bắt buộc tại mọi dự án Enterprise Banking là đặt ngay `spring.jpa.open-in-view=false` trong `application.yml`."
        ],
        bullets: [
          "Cẩn trọng mặc định EAGER của @ManyToOne và @OneToOne: Nhiều bạn lầm tưởng mọi quan hệ trong JPA mặc định đều tải lười, nhưng thực tế theo đặc tả chuẩn JPA, `@OneToMany` và `@ManyToMany` mặc định là `LAZY`, còn **`@ManyToOne` và `@OneToOne` mặc định lại là `EAGER`**! Hãy luôn ghi tường minh `fetch = FetchType.LAZY` trên mọi quan hệ.",
          "Tuyệt đối không phơi bày @Entity trực tiếp ra tầng Controller: Việc trả thẳng Entity ra JSON vừa gây lỗi vòng lặp vô tận (`StackOverflowError` do quan hệ hai chiều), vừa kích hoạt N+1 ngầm, lại có nguy cơ lộ các cột nhạy cảm nội bộ (như `internalRiskScore`, `version`).",
          "Giải phóng gánh nặng Dirty Checking cho luồng đọc: Đánh dấu `@Transactional(readOnly = true)` kết hợp trả về DTO Projection giúp Hibernate không phải lưu trữ mảng Snapshot gốc, cắt giảm một nửa lượng rác cấp phát trên vùng nhớ Eden của JVM."
        ]
      },
      {
        heading: "2. Diệt tận gốc N+1 Query, Bẫy Phân trang trong RAM (HHH90003004) & DTO Projection",
        paragraphs: [
          "Để tiêu diệt triệt để bệnh dịch N+1 khi thực sự cần lấy đối tượng gốc kèm danh sách quan hệ con (ví dụ tải `Account` cùng danh sách `AccountWallet`), vũ khí sắc bén nhất là câu lệnh JPQL **`LEFT JOIN FETCH`** hoặc chú thích **`@EntityGraph(attributePaths = {\"wallets\"})`** để gộp toàn bộ thành đúng 1 câu lệnh SQL `LEFT JOIN` duy nhất xuống Database. Thế nhưng, ngay tại khúc cua này ẩn chứa một cái bẫy chết người mà 8/10 ứng viên phỏng vấn Senior sập hầm: **kết hợp `JOIN FETCH` trên quan hệ một-nhiều (`@OneToMany`) cùng với đối tượng phân trang `Pageable`**! Khi thực hiện `JOIN` một tài khoản cha với 5 ví con ở mức SQL, số dòng kết quả bị nhân bản lên gấp 5 lần; nếu gắn `LIMIT 20` trực tiếp vào SQL thì có thể cắt cụt mất ví thứ 4, thứ 5 của tài khoản cuối trang. Để giữ đúng số lượng 20 tài khoản cha, Hibernate đành in ra dòng cảnh báo khét tiếng **`HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory`** — tức là bỏ hoàn toàn `LIMIT` dưới SQL, **hút cạn toàn bộ 1 triệu dòng của cả bảng lên bộ nhớ RAM của Java rồi mới cắt lấy 20 phần tử đầu tiên**, làm sập Pod ngay lập tức vì `OutOfMemoryError`!",
          "Cách giải quyết chuẩn mực của các kiến trúc sư lão luyện cho bài toán 'Phân trang + Tải kèm danh sách con' là **Kỹ thuật Truy vấn 2 Bước (Two-Step ID Fetching)**: ở Bước 1, chạy câu truy vấn có `Pageable` cực nhẹ chỉ lấy đúng danh sách khóa chính `List<Long> ids` của 20 tài khoản thuộc trang hiện tại (`LIMIT 20` chạy chuẩn 100% dưới Database); ở Bước 2 (nếu danh sách không rỗng), chạy câu truy vấn thứ hai `SELECT DISTINCT a FROM Account a LEFT JOIN FETCH a.wallets WHERE a.id IN :ids` — tổng cộng luôn cố định đúng **2 câu SQL siêu tốc** bất kể trang có 20 hay 200 tài khoản mà không tốn một giọt RAM thừa nào! Còn đối với các màn hình chỉ hiển thị bảng số liệu phẳng (như danh sách giao dịch hay sao kê rút gọn), hãy dùng thẳng **Constructor Expression với Java 21 `record`** (`SELECT new vn.finbank.dto.AccountSummaryView(a.accountNo, a.currency, a.availableBalance)`) để chỉ kéo đúng 3 cột cần thiết qua đường truyền mạng."
        ],
        bullets: [
          "Phòng chống MultipleBagFetchException: Khi bạn cố `JOIN FETCH` đồng thời từ 2 danh sách kiểu `List` trở lên trong cùng một câu JPQL, Hibernate sẽ ném ngay `MultipleBagFetchException` do tích Đề-các nhân bản dữ liệu; hãy đổi kiểu tập hợp sang `Set` hoặc dùng `@BatchSize(size = 50)` nạp theo từng cụm nhỏ.",
          "Java 21 Record Projection nhanh và sạch hơn Interface Proxy: Khởi tạo trực tiếp `record` trong câu `@Query` không cần Spring sinh Dynamic Proxy bọc quanh `Tuple` kết quả, vừa an toàn kiểu dữ liệu lúc biên dịch vừa đạt hiệu năng tối đa.",
          "Bật bộ dò N+1 tự động trong lúc chạy Test: Trong môi trường Integration Test, bạn có thể tích hợp thư viện `datasource-proxy` hoặc `QuickPerf` đặt ngưỡng cứng `assertSqlCountLessThanOrEqualTo(2)` để chặn đứng mọi lỗi N+1 ngay từ cổng Merge Request!"
        ]
      },
      {
        heading: "3. Mở khóa tốc độ JDBC Batch Insert trên PostgreSQL/Oracle với SEQUENCE",
        paragraphs: [
          "Rất nhiều đội phát triển cấu hình đầy đủ `spring.jpa.properties.hibernate.jdbc.batch_size=50` trong file cấu hình, hào hứng gọi `postingRepository.saveAll(tenThousandPostings)` cho nghiệp vụ kết chuyển lãi cuối ngày, nhưng khi mở log mạng lên xem thì tá hỏa thấy Hibernate vẫn gửi đi lẻ tẻ **10.000 gói tin `INSERT` đơn lẻ**! Nguyên nhân gốc rễ nằm ở dòng khai báo tưởng chừng vô hại trên khóa chính Entity: `@GeneratedValue(strategy = GenerationType.IDENTITY)`. Khi dùng cột tự tăng `IDENTITY`, giá trị khóa chính chỉ được sinh ra sau khi câu lệnh `INSERT` thực sự chạm tới Database; mà quy tắc bất biến của Persistence Context lại đòi hỏi mọi Entity ngay khoảnh khắc gọi `persist()` phải có ngay ID định danh trong bộ nhớ đệm. Do đó, Hibernate buộc phải **tắt ngầm hoàn toàn cơ chế gom lô Batch Insert** và bắn lệnh `INSERT` ngay lập tức ở từng vòng lặp một!",
          "Trên nền tảng cơ sở dữ liệu chuẩn ngân hàng như **PostgreSQL** và **Oracle**, chìa khóa vàng để mở khóa tốc độ ghi hàng chục nghìn bút toán mỗi giây là chuyển sang **`GenerationType.SEQUENCE`** đi kèm `@SequenceGenerator(name = \"posting_seq\", sequenceName = \"ledger_posting_seq\", allocationSize = 50)` (lưu ý câu lệnh DDL tạo Sequence trong Flyway cũng phải khớp `INCREMENT BY 50`). Với thuật toán tối ưu `pooled-lo` mặc định trong Hibernate 6 (Spring Boot 3), ứng dụng chỉ cần hỏi Database hàm `nextval` đúng **1 lần duy nhất để xin trước trọn gói 50 mã ID kế tiếp** cất trong RAM, sau đó gom đủ 50 bản ghi bút toán đóng thành 1 mẻ Batch đẩy đi cùng lúc! Đặc biệt trên PostgreSQL, đừng quên gắn thêm tham số vàng `reWriteBatchedInserts=true` vào chuỗi JDBC URL để trình điều khiển tự động viết gộp 50 câu lệnh rời thành một câu lệnh đa giá trị duy nhất `INSERT INTO ledger_postings (...) VALUES (...), (...), (...)`, giúp rút ngắn thời gian ghi 20.000 bút toán từ vài phút xuống chỉ còn dưới 1 giây!"
        ],
        bullets: [
          "Bật sắp xếp thứ tự gom lô chống Deadlock: Luôn cấu hình thêm cặp thuộc tính `hibernate.order_inserts=true` và `hibernate.order_updates=true` để khi một giao dịch ghi xen kẽ cả `Account` lẫn `LedgerPosting`, Hibernate tự gom nhóm cùng bảng lại với nhau và sắp xếp theo ID, vừa gộp được Batch tối đa vừa ngăn chặn khóa chéo Deadlock.",
          "Xả bộ nhớ đệm định kỳ khi xử lý lô lớn: Nếu vòng lặp ghi liền một mạch 100.000 bút toán trong một giao dịch mà không giải phóng, First-level Cache sẽ phình to nuốt trọn vài GB Heap; cứ mỗi chặng 500 bản ghi hãy chủ động gọi `entityManager.flush(); entityManager.clear();`.",
          "Đối với tải siêu khổng lồ triệu dòng: Nếu viết Job đối soát hoặc kết chuyển cuối ngày không cần qua vòng đời Entity, sử dụng trực tiếp `JdbcClient` / `JdbcTemplate.batchUpdate()` hoặc lệnh `COPY` của PostgreSQL sẽ đạt tốc độ trần vật lý của ổ cứng NVMe."
        ]
      }
    ],
    comparison: {
      title: "So sánh các Chiến lược Truy vấn & Ghi Dữ liệu trong Spring Data JPA / Hibernate 6",
      headers: ["Chiến lược kỹ thuật", "Số câu lệnh SQL (với N=100 cha)", "Chi phí bộ nhớ Heap (Persistence Context)", "Kịch bản áp dụng chuẩn Ngân hàng"],
      rows: [
        ["Lazy Loading mặc định thiếu kiểm soát", "101 câu SQL (1 câu cha + 100 câu con N+1)", "Cao (lưu toàn bộ Entity + Snapshot gốc)", "ANTI-PATTERN — Gây nghẽn mạng DB và tăng vọt độ trễ P99"],
        ["2-Step ID Query + LEFT JOIN FETCH", "Đúng 2 câu SQL cố định (an toàn với Pageable)", "Trung bình (chỉ nạp đúng 20 Aggregate cần sửa)", "Khi API vừa cần phân trang vừa cần nạp đầy đủ Aggregate cha-con"],
        ["Java 21 Record DTO Projection", "Đúng 1 câu SQL gọn nhẹ chỉ chọn cột cần thiết", "Cực thấp (0% Snapshot, 0% Dirty Checking)", "Chuẩn mực cho 85% API chỉ đọc: Danh sách tài khoản, Sao kê, Báo cáo"],
        ["SEQUENCE (allocationSize=50) + Batching", "Giảm 50 lần số vòng mạng (1 gói/50 dòng)", "Thấp và ổn định khi kết hợp flush() + clear()", "Hạch toán lô lương, phân bổ phí/lãi định kỳ, ghi sổ cái khối lượng lớn"]
      ]
    },
    codeTitle: "Tối ưu JPA Chuẩn Ngân hàng: SEQUENCE Pooled-Lo Batching, Record Projection & 2-Step FetchJoin",
    code: [
      "@Entity",
      "@Table(name = \"ledger_postings\")",
      "public class LedgerPosting {",
      "    @Id",
      "    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = \"posting_seq_gen\")",
      "    @SequenceGenerator(name = \"posting_seq_gen\", sequenceName = \"ledger_posting_seq\", allocationSize = 50)",
      "    private Long id;",
      "",
      "    @ManyToOne(fetch = FetchType.LAZY, optional = false) // Bắt buộc tường minh LAZY!",
      "    @JoinColumn(name = \"account_id\", nullable = false)",
      "    private Account account;",
      "",
      "    @Column(nullable = false, precision = 19, scale = 0)",
      "    private BigDecimal amountVnd;",
      "}",
      "",
      "public record AccountSummaryView(String accountNo, String currency, BigDecimal availableBalance) {}",
      "",
      "public interface AccountRepository extends JpaRepository<Account, Long> {",
      "    // 1. Luồng Đọc thuần túy: Dùng Record Projection nhẹ tênh, 0% chi phí Dirty Checking",
      "    @Query(\"SELECT new com.finbank.ledger.AccountSummaryView(a.accountNo, a.currency, a.availableBalance) \" +",
      "           \"FROM Account a WHERE a.ownerCif = :cif\")",
      "    List<AccountSummaryView> findSummariesByCif(@Param(\"cif\") String cif);",
      "",
      "    // 2. Phân trang an toàn chống lỗi OOM HHH90003004: Bước 1 lấy trang ID -> Bước 2 JOIN FETCH",
      "    @Query(\"SELECT a.id FROM Account a WHERE a.corporateId = :corpId ORDER BY a.id ASC\")",
      "    Slice<Long> findAccountIdsSlice(@Param(\"corpId\") Long corpId, Pageable pageable);",
      "",
      "    @Query(\"SELECT DISTINCT a FROM Account a LEFT JOIN FETCH a.wallets WHERE a.id IN :ids\")",
      "    List<Account> findAllWithWalletsByIds(@Param(\"ids\") Collection<Long> ids);",
      "}"
    ].join("\n"),
    codeNotes: [
      "Trên `LedgerPosting`, việc khai báo `GenerationType.SEQUENCE` với `allocationSize = 50` cho phép Hibernate cấp phát trước lô 50 khóa chính trong bộ nhớ, mở khóa hoàn toàn sức mạnh của `hibernate.jdbc.batch_size=50` thay vì bị khóa cứng như `IDENTITY`.",
      "Quan hệ `@ManyToOne` tới `Account` được chỉ định rõ `fetch = FetchType.LAZY` để xóa bỏ hành vi mặc định `EAGER` của đặc tả JPA — nhờ vậy khi đọc danh sách bút toán, Hibernate không tự động join hoặc bắn thêm câu lệnh tải thừa thông tin chủ tài khoản.",
      "Phương thức `findSummariesByCif` khởi tạo trực tiếp `record AccountSummaryView` ngay trong câu truy vấn JPQL: dữ liệu đi thẳng từ JDBC ResultSet vào đối tượng bất biến trả ra ngoài mà hoàn toàn không bước chân vào vùng quản lý tốn kém của Persistence Context.",
      "Cặp phương thức `findAccountIdsSlice` (dùng `Slice` thay vì `Page` để bỏ luôn câu `COUNT(*)`) và `findAllWithWalletsByIds` giải quyết gọn ghẽ bài toán kinh điển vừa phân trang vừa nạp danh sách con `@OneToMany` chỉ với đúng 2 câu SQL cố định."
    ],
    labGuide: {
      goal: "Bắt tận tay lỗi N+1 và cảnh báo HHH90003004 trên log SQL thực tế, sau đó tối ưu về đúng 1–2 câu truy vấn và kích hoạt JDBC Batch Insert tốc độ cao trên PostgreSQL.",
      steps: [
        "Bước 1: Cấu hình `spring.jpa.open-in-view=false`, `spring.jpa.properties.hibernate.generate_statistics=true`, `hibernate.jdbc.batch_size=50` và `hibernate.order_inserts=true` trong `application.yml`.",
        "Bước 2: Nạp thử 50 `Account` (mỗi tài khoản có 3 `Wallet`), viết API gọi `findAll()` rồi lặp lấy `a.getWallets().size()` — đọc bảng `Session Metrics` cuối log để thấy tận mắt `51 JDBC statements` được thực thi.",
        "Bước 3: Áp dụng kỹ thuật 2 bước (`findAccountIdsSlice` + `findAllWithWalletsByIds` với `PageRequest.of(0, 20)`) và kiểm tra lại `Session Metrics` để xác nhận số câu SQL tụt từ 51 xuống đúng **2 câu duy nhất** và không hề xuất hiện cảnh báo `HHH90003004`.",
        "Bước 4: Tạo sequence `CREATE SEQUENCE ledger_posting_seq START WITH 1 INCREMENT BY 50;` trên PostgreSQL (kèm `reWriteBatchedInserts=true`), gọi `saveAll()` lưu 500 dòng `LedgerPosting` và xác nhận trong `Session Metrics` chỉ tốn đúng **10 JDBC batches**!"
      ],
      expectedOutput: "Bảng `Session Metrics` của Hibernate in ra rõ ràng: `2 JDBC statements` cho API phân trang kèm ví con (thay vì 51 câu), và `10 JDBC batches` thực thi trong < 40ms khi chèn 500 dòng bút toán sổ cái."
    },
    examTips: [
      "Câu hỏi bẫy số 1 vòng phỏng vấn JPA Senior: 'Tôi dùng `JOIN FETCH` trên quan hệ `@OneToMany` kết hợp truyền `Pageable` vào Repository, có vấn đề gì không?' -> Phải trả lời ngay cảnh báo **`HHH90003004`**: Hibernate sẽ bỏ `LIMIT` dưới DB và kéo toàn bộ bảng lên RAM để phân trang gây `OutOfMemoryError`! Cách sửa chuẩn là tách 2 bước: lấy trang `List<ID>` trước rồi `JOIN FETCH WHERE id IN (:ids)`.",
      "Câu hỏi bẫy số 2: 'Tôi đã đặt `hibernate.jdbc.batch_size=100` nhưng `saveAll()` vẫn chạy từng câu INSERT một?' -> Chỉ thẳng thủ phạm là khóa chính đang dùng `GenerationType.IDENTITY`; phải đổi sang `GenerationType.SEQUENCE` kèm `allocationSize` khớp với bước nhảy `INCREMENT BY` của DB.",
      "Thói quen ăn điểm tuyệt đối khi thiết kế dự án mới: Luôn chủ động nhắc hội đồng phỏng vấn 2 cấu hình bạn đặt ngay phút đầu tiên là `spring.jpa.open-in-view=false` và `spring.jpa.hibernate.ddl-auto=validate` (giao toàn quyền tạo bảng cho Flyway)."
    ],
    summaryTakeaways: [
      "Luôn tắt `spring.jpa.open-in-view=false` và khai báo tường minh `FetchType.LAZY` trên mọi mối quan hệ Entity để ngăn chặn rò rỉ kết nối DB và truy vấn ngầm ngoài ý muốn.",
      "Ưu tiên Java 21 Record DTO Projection cùng `@Transactional(readOnly = true)` cho toàn bộ các luồng tra cứu để triệt tiêu chi phí bộ nhớ của Dirty Checking.",
      "Không bao giờ kết hợp trực tiếp `JOIN FETCH` tập hợp nhiều phần tử với `Pageable` trong cùng một câu truy vấn; hãy áp dụng mẫu Truy vấn 2 Bước theo danh sách khóa chính.",
      "Sử dụng `GenerationType.SEQUENCE` kết hợp `allocationSize` hợp lý, `order_inserts=true` và `reWriteBatchedInserts=true` để đạt hiệu năng ghi lô bút toán tối đa trên PostgreSQL/Oracle."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên viết phương thức Repository: `@Query(\"SELECT c FROM Customer c LEFT JOIN FETCH c.accounts\") Page<Customer> findAllWithAccounts(Pageable pageable);` trên bảng có 500.000 khách hàng và 1.500.000 tài khoản. Khi khách gọi API lấy trang đầu tiên (`size = 20`), hiện tượng gì sẽ xảy ra trên môi trường Production?",
        options: [
          "PostgreSQL thực thi mượt mà câu lệnh kèm `LIMIT 20` và chỉ trả về đúng 20 dòng dữ liệu qua mạng",
          "Hibernate phát cảnh báo `HHH90003004`, không gắn `LIMIT` vào câu SQL mà kéo toàn bộ 1.500.000 dòng kết quả JOIN lên bộ nhớ Heap của JVM để tự cắt phân trang trong RAM, dẫn tới nguy cơ nổ `OutOfMemoryError` sập dịch vụ!",
          "Spring Data JPA từ chối khởi động ứng dụng và ném lỗi cú pháp JPQL ngay lúc biên dịch",
          "Hibernate tự động chuyển sang chạy 20 câu lệnh riêng lẻ cho từng khách hàng mà không ảnh hưởng tới RAM"
        ],
        answer: 1,
        explanation: "Vì phép `JOIN` giữa 1 `Customer` và nhiều `Account` làm nhân bản số dòng bản ghi kết quả, Hibernate biết rằng nếu gắn `LIMIT 20` xuống SQL sẽ làm cắt cụt danh sách tài khoản của khách hàng. Do đó nó âm thầm tải toàn bộ tập kết quả khổng lồ vào bộ nhớ ứng dụng để gộp đối tượng rồi mới phân trang! Giải pháp chuẩn là truy vấn phân trang lấy 20 `customerId` ở bước 1, sau đó `LEFT JOIN FETCH` với điều kiện `WHERE c.id IN :ids` ở bước 2.",
        wrongReasons: [
          "Hibernate cố tình bỏ qua mệnh đề `LIMIT/OFFSET` ở tầng SQL trong trường hợp collection fetch join để tránh làm thiếu phần tử trong tập hợp con `c.accounts`.",
          "",
          "Ứng dụng vẫn khởi động hoàn toàn bình thường (chỉ in một dòng cảnh báo `WARN HHH90003004` dễ bị trôi mất trong log), khiến cái bẫy này càng nguy hiểm khi gặp dữ liệu lớn thật.",
          "Hibernate không tự động viết lại câu `JOIN FETCH` thành truy vấn lô theo ID nếu bạn không chủ động tách bước hoặc cấu hình `@BatchSize` thay cho `JOIN FETCH`."
        ]
      },
      {
        question: "Đội phát triển dịch vụ Sổ cái (chạy PostgreSQL 16) đã cấu hình `hibernate.jdbc.batch_size=50` và `order_inserts=true`, nhưng khi gọi `ledgerRepository.saveAll(entries)` cho 5.000 bút toán cuối ngày, hệ thống vẫn bắn 5.000 câu `INSERT` đơn lẻ rất chậm. Đâu là nguyên nhân gốc rễ và cách khắc phục chuẩn xác nhất?",
        options: [
          "Do `saveAll()` của Spring Data JPA không mở giao dịch nên không gom lô được; chỉ cần đổi sang vòng lặp `for` gọi `save()` từng dòng là tự gom lô",
          "Do Entity đang dùng `@GeneratedValue(strategy = GenerationType.IDENTITY)` buộc Hibernate phải bắn `INSERT` ngay lập tức để lấy ID; cần đổi sang `GenerationType.SEQUENCE` (với `allocationSize = 50` khớp Sequence DB) kết hợp `reWriteBatchedInserts=true` trên JDBC URL",
          "Do PostgreSQL không hỗ trợ tính năng JDBC Batching của ngôn ngữ Java",
          "Do chưa bật cờ `spring.jpa.open-in-view=true` trong file cấu hình"
        ],
        answer: 1,
        explanation: "Với chiến lược `IDENTITY`, Hibernate không thể biết khóa chính trước khi câu lệnh `INSERT` thực thi dưới DB, dẫn đến việc vô hiệu hóa hoàn toàn hàng đợi Batch của ActionQueue. Chuyển sang `SEQUENCE` với `allocationSize = 50` giúp Hibernate xin trước dải 50 ID trong 1 lần gọi sequence, gom trọn 50 bản ghi đẩy đi trong 1 batch và được PostgreSQL Driver gộp thành câu multi-row `INSERT` siêu tốc.",
        wrongReasons: [
          "Bản thân hàm `SimpleJpaRepository.saveAll()` mặc định đã gắn sẵn `@Transactional`; ngược lại nếu gọi `save()` lẻ tẻ từ bên ngoài chưa có `@Transactional` thì mỗi dòng còn tốn thêm 1 lần mở/đóng giao dịch rời rạc chậm hơn nữa!",
          "",
          "PostgreSQL hỗ trợ cực tốt JDBC Batching và đặc biệt mạnh mẽ khi bật cờ `reWriteBatchedInserts=true` của trình điều khiển `pgjdbc`.",
          "`open-in-view` hoàn toàn không liên quan tới cơ chế gom lô ghi dữ liệu mà còn gây hại giữ kết nối lâu ở tầng Web."
        ]
      }
    ]
  },

  S5: {
    duration: "60 phút",
    difficulty: "Nâng cao → Kiến trúc Fintech",
    codeLang: "java",
    teacherIntro: "Chào bạn! Hôm nay chúng ta sẽ bước vào một trong những cuộc tranh luận kiến trúc nóng bỏng nhất tại mọi hội đồng tuyển dụng Tech Lead / Principal Java giai đoạn 2024–2026: **Spring WebFlux (Reactive Non-blocking) đối đầu với Spring MVC + Java 21 Virtual Threads**! Tôi từng trực tiếp xử lý một vụ 'đóng băng toàn tập' tại một Ngân hàng Số phục vụ hàng triệu khách hàng trẻ: dịch vụ BFF Trang chủ được viết bằng **Spring WebFlux trên Netty** vốn chạy cực kỳ ấn tượng, gánh 5.000 request/giây mà chỉ tốn 512MB RAM. Thế nhưng sau một bản vá nhỏ chiều thứ Sáu, cả 5.000 người dùng cùng bị treo trắng màn hình dù biểu đồ CPU của Pod chỉ vỏn vẹn... **4%**! Khi xuất Thread Dump ra xem, cả 4 luồng cốt tử `reactor-http-epoll-1..4` (tương ứng Pod 2 vCPU) đều đang đứng chết trân chờ một hàm `jdbcTemplate.queryForObject()` và đọc file chứng thư số đồng bộ mà một bạn mới vào nghề vô tình nhét thẳng vào bên trong toán tử `.map(...)`! Bài học hôm nay sẽ giúp bạn thấu suốt bản chất Event-loop, làm chủ kỹ thuật hợp nhất dữ liệu song song dưới 150ms và biết chính xác khi nào nên chọn WebFlux, khi nào nên chọn Virtual Threads cho ngân hàng của mình.",
    analogy: {
      title: "4 Siêu đầu bếp đảo 1.000 chảo (Event-loop) vs Đội quân phân thân siêu nhẹ (Virtual Threads)",
      body: "Bạn hãy hình dung nhà hàng Ngân hàng Số đón 5.000 thực khách cùng lúc. Cách truyền thống **Spring MVC cũ (Platform Threads)** giống như tuyển 200 anh bồi bàn to khỏe (mỗi anh ngốn 1MB RAM hệ điều hành): hễ khách đang ngồi đọc thực đơn hay chờ bếp hầm xương 5 phút, anh bồi bàn cứ đứng chôn chân cạnh bàn đó không làm được việc gì khác — khách thứ 201 tới đành đứng ngoài nắng! **Spring WebFlux (Netty Event-loop)** thay thế hoàn toàn bằng đúng **4 siêu đầu bếp** chạy thoăn thoắt không nghỉ tay quanh 5.000 chiếc bếp từ: hễ nồi nào đang đun nước chưa sôi (Non-blocking I/O), đầu bếp gắn chuông báo rồi lập tức xoay sang đảo chảo kế tiếp; NHƯNG nếu 1 đầu bếp tự nhiên đứng thẫn thờ nhìn chằm chằm vào ấm nước chờ sôi suốt 3 phút (`Blocking JDBC / Thread.sleep`), cả ngàn chiếc chảo sau lưng anh ta sẽ cháy đen tức khắc! Còn **Java 21 Virtual Threads** lại giống như phép phân thân tạo ra hàng vạn nhân viên phục vụ tí hon (chỉ nặng vài KB trên Heap): hễ khách đang suy nghĩ chọn món (chờ mạng/DB), nhân viên ảo tự động nhấc mình khỏi chiếc ghế vật lý (`Carrier Thread`) nhường ghế cho người khác làm việc rồi quay lại đúng tích tắc món ăn bưng ra — nhờ vậy code viết thẳng một mạch từ trên xuống dưới cực dễ hiểu mà vẫn phục vụ vạn khách êm ru!"
    },
    objectives: [
      "Hiểu tận gốc cơ chế vận hành của Netty Event-loop trong Spring WebFlux, nắm chắc luật bất biến Non-blocking, cơ chế điều tiết ngược Backpressure và cách cô lập tác vụ đồng bộ cũ bằng boundedElastic.",
      "Xây dựng thành thạo bộ tổng hợp dữ liệu tài chính song song (API Aggregator) kết hợp Mono.zip, Timeout hạt mịn và Fallback cô lập lỗi từng nhánh để đảm bảo SLA dưới 150ms.",
      "Đánh giá chuẩn xác ưu nhược điểm giữa Spring WebFlux và Spring MVC + Java 21 Virtual Threads (kèm bẫy Carrier Thread Pinning và giới hạn bể kết nối hạ tầng) để ra quyết định kiến trúc đúng đắn."
    ],
    flow: [
      {
        step: "1. Tiếp nhận Kết nối Phi chặn tại Cổng vào",
        detail: "Yêu cầu mở màn hình Trang chủ Mobile Banking đi vào luồng Netty Event-loop (hoặc Virtual Thread) mà không phải xếp hàng chờ cấp phát Platform Thread nặng nề của hệ điều hành."
      },
      {
        step: "2. Phát tán Song song (Parallel Fan-out) tới Đa Dịch vụ",
        detail: "Thay vì gọi nối tiếp tuần tự mất 120ms + 110ms + 100ms = 330ms, hệ thống bắn đồng thời cả 3 lời gọi sang dịch vụ Tài khoản CASA, Thẻ tín dụng và Khoản vay ngay cùng một mili-giây."
      },
      {
        step: "3. Rào chắn Timeout độc lập & Giáng cấp Mềm dẻo (Graceful Degradation)",
        detail: "Mỗi nhánh phụ (Thẻ, Khoản vay) đều được bọc .timeout(120ms) kèm .onErrorResume trả về trạng thái tạm ẩn nhẹ nhàng để nếu hệ thống Thẻ bảo trì thì khách vẫn xem được số dư CASA và chuyển tiền bình thường!"
      },
      {
        step: "4. Hợp nhất Phản hồi (< 150ms tổng thể) & Giải phóng Tài nguyên",
        detail: "Toán tử Mono.zip gom kết quả của cả 3 luồng ngay khi nhánh chậm nhất hoàn thành (tối đa ~120ms) để đóng gói DTO tổng hợp trả về điện thoại khách hàng."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Netty Event-Loop, Luật Bất Biến Non-Blocking & Backpressure",
        paragraphs: [
          "Khi bạn khởi chạy một ứng dụng **Spring WebFlux**, máy chủ mặc định bên dưới không còn là Servlet Container Tomcat với bể 200 luồng quen thuộc nữa, mà là **Netty** vận hành dựa trên mô hình vòng lặp sự kiện (**Event-loop**) với số lượng luồng vật lý cực ít — thường chỉ bằng đúng số nhân CPU của container (ví dụ 4 hoặc 8 luồng mang tên `reactor-http-epoll-*`). Bí quyết giúp 4 luồng nhỏ bé này xử lý hàng chục nghìn kết nối mạng đồng thời nằm ở nguyên tắc sắt đá: **không một hàm nào chạy trên Event-loop được phép đứng chờ I/O đồng bộ**! Mọi thao tác từ đọc HTTP qua `WebClient`, truy vấn Redis Reactive cho tới R2DBC đều đăng ký hàm gọi lại (Callback / Epoll event) với nhân Linux rồi trả luồng về ngay lập tức trong vài micro-giây. Nếu bất kỳ ai vô tình đặt `Thread.sleep()`, `.block()`, gọi JPA/JDBC truyền thống hay đọc file đồng bộ trên Event-loop, bạn đã đóng đinh chặt luồng điều phối chung của hàng nghìn người dùng khác!",
          "Bên cạnh luật cấm chặn luồng, lập trình Reactive với `Mono` (0..1 phần tử) và `Flux` (0..N phần tử) đòi hỏi bạn thay đổi hoàn toàn tư duy luồng điều khiển theo câu châm ngôn bất hủ: **'Nothing happens until you subscribe()'** (Không có gì thực thi cho tới khi chuỗi được đăng ký tiêu thụ). Một lỗi cực kỳ phổ biến khi chuyển từ MVC sang WebFlux là viết dòng lệnh rời rạc `auditReactiveRepo.save(logEntry);` nằm lơ lửng giữa hàm rồi `return responseMono;` — vì `Mono` trả về từ hàm `save()` không hề được nối vào chuỗi chính qua `.then()` hay `.flatMap()`, bản ghi kiểm toán đó **không bao giờ được gửi xuống Database** mà chẳng hề báo một dòng lỗi nào! Ngoài ra, khi xử lý luồng dữ liệu lớn (như stream biến động tỷ giá hoặc xuất dữ liệu liên dịch vụ), chuẩn Reactive Streams cung cấp cơ chế **Backpressure** cho phép phía tiêu thụ chậm chủ động báo ngược lên phía phát ('tôi chỉ nhận thêm 50 bản tin một lúc thôi') thông qua `limitRate()` hoặc `onBackpressureBuffer()`, ngăn chặn triệt để nguy cơ tràn bộ nhớ RAM."
        ],
        bullets: [
          "Cách bọc thư viện đồng bộ cũ an toàn bằng boundedElastic: Nếu bắt buộc phải gọi một SDK ký số HSM hoặc thư viện SOAP cũ chưa hỗ trợ non-blocking trong dự án WebFlux, hãy gói nó bằng `Mono.fromCallable(() -> legacySdk.call()).subscribeOn(Schedulers.boundedElastic())` để đẩy việc chờ sang bể luồng co giãn riêng biệt, giữ sạch tuyệt đối cho Netty Event-loop.",
          "Cài đặt máy dò mìn BlockHound trong bộ Test: Thêm thư viện `BlockHound` của Reactor vào chu trình chạy JUnit 5; hễ có bất kỳ lập trình viên nào vô tình gọi hàm blocking trên luồng `nonBlocking`, bài test sẽ lập tức ném lỗi chỉ thẳng đúng dòng code vi phạm trước khi kịp lên Production!",
          "Truyền ngữ cảnh MDC TraceId trong thế giới Reactive: Vì một request trong WebFlux có thể nhảy qua nhiều luồng khác nhau ở từng bước `.flatMap()`, `ThreadLocal` truyền thống sẽ làm rơi mất mã `traceId` trong log; bạn cần bật `Hooks.enableAutomaticContextPropagation()` kết hợp Micrometer Tracing trên Spring Boot 3."
        ]
      },
      {
        heading: "2. Spring Boot 3.2+ với Java 21 Virtual Threads: Cuộc cách mạng cho Core Banking",
        paragraphs: [
          "Suốt nhiều năm, cái giá phải trả để đổi lấy hiệu năng non-blocking của WebFlux là độ phức tạp nhận thức rất cao: code giăng mắc hàng chục tầng `.flatMap()`, `.switchIfEmpty()`, stacktrace khi nổ lỗi dài hàng trăm dòng khó lần dấu vết, và đau đầu nhất là **không thể dùng chung với hệ sinh thái vàng Spring Data JPA / Hibernate** vốn được thiết kế dựa trên JDBC đồng bộ. Bước ngoặt lịch sử xuất hiện trên **Java 21 LTS (Project Loom)** kết hợp **Spring Boot 3.2+**: chỉ cần thêm duy nhất dòng cấu hình `spring.threads.virtual.enabled=true`, toàn bộ máy chủ Tomcat và các tác vụ `@Async` sẽ chuyển sang cấp phát một **Virtual Thread** siêu nhẹ (chỉ tốn vài trăm byte tới vài KB trên Heap thay vì 1MB Stack cố định) cho mỗi request đi vào!",
          "Điều kỳ diệu nằm ở bên trong máy ảo JVM: bạn vẫn viết code Java tuần tự từ trên xuống dưới, dùng vòng lặp `for`, khối `try-catch` rõ ràng, dùng nguyên vẹn `RestClient`, `JdbcTemplate`, `JPA` và `@Transactional`, nhưng ngay khoảnh khắc luồng gọi chạm tới lệnh chờ đọc Socket mạng (gọi đối tác NAPAS hay chờ phản hồi PostgreSQL), JVM tự động **tháo (unmount)** Virtual Thread đó ra khỏi luồng hệ điều hành thật (`Carrier Thread`) để nhường CPU phục vụ ngay cho hàng nghìn khách hàng khác! Tuy nhiên, ở đẳng cấp Senior Architect, bạn không được phép thần thánh hóa mù quáng mà phải nắm chắc **2 giới hạn kỹ thuật sống còn trên Java 21**: (1) **Hiện tượng Ghim luồng (Carrier Thread Pinning)**: trên JDK 21, nếu một Virtual Thread thực hiện lời gọi I/O chặn khi đang nằm bên trong khối `synchronized` (hoặc gọi hàm JNI native), nó bị ghim chặt cứng vào Carrier Thread không thể tháo ra được — do đó cần thay `synchronized` bọc quanh I/O bằng `ReentrantLock` và dùng bản JDBC Driver mới nhất; (2) **Hiệu ứng Thắt cổ chai Hạ tầng đích**: Virtual Threads giúp tầng App tạo ra 50.000 luồng chờ nhẹ nhàng, nhưng Database PostgreSQL phía sau vẫn chỉ có 30 kết nối HikariCP — nếu không bọc **Bulkhead / Semaphore** giới hạn mức độ đồng thời khi gọi tài nguyên khan hiếm, 50.000 luồng ảo ập vào cùng lúc sẽ xếp hàng làm nổ tung timeout!"
        ],
        bullets: [
          "Đừng bao giờ tạo Pool cho Virtual Threads: Virtual Threads được sinh ra để dùng một lần rồi bỏ (`newVirtualThreadPerTaskExecutor`); việc gom chúng vào một `FixedThreadPool(16)` là sai lầm ngớ ngẩn tự bóp nghẹt khả năng mở rộng. Để giới hạn số lượng truy cập đồng thời vào đối tác/DB, hãy dùng `java.util.concurrent.Semaphore` hoặc `@Bulkhead` của Resilience4j!",
          "Cẩn trọng với ThreadLocal dung lượng lớn: Dù Virtual Threads hỗ trợ đầy đủ `ThreadLocal` (giúp `@Transactional` và `SecurityContext` chạy ngon lành), việc lưu các bộ đệm nặng (như mảng byte lớn hay `ObjectMapper` tự tạo) vào `ThreadLocal` nhân với 100.000 Virtual Threads sẽ gây ngốn RAM khủng khiếp.",
          "Kết hợp StructuredTaskScope / CompletableFuture trên Virtual Threads: Khi cần gọi song song 3 dịch vụ bên trong Spring MVC + Virtual Threads, mở `Executors.newVirtualThreadPerTaskExecutor()` bắn 3 tác vụ chạy đồng thời vừa dễ đọc vừa đạt tốc độ ngang ngửa `Mono.zip` của WebFlux!"
        ]
      },
      {
        heading: "3. Ma trận Quyết định: Khi nào chọn WebFlux, khi nào chọn MVC + Virtual Threads?",
        paragraphs: [
          "Trong các buổi bảo vệ kiến trúc tại ngân hàng lớn hay phỏng vấn vị trí Principal/Architect, câu trả lời ghi điểm tuyệt đối không bao giờ là 'công nghệ A đập chết công nghệ B', mà là phân ranh giới sử dụng sắc sảo theo đặc thù từng miền nghiệp vụ (**Bounded Context**). Hãy chọn **Spring WebFlux** ở những nơi nó là ông vua không đối thủ: tầng cổng vào **Spring Cloud Gateway** điều phối lưu lượng toàn hệ thống, các dịch vụ **Streaming thời gian thực** giữ hàng trăm nghìn kết nối mở dài hạn (SSE đẩy thông báo biến động số dư, bảng giá khớp lệnh chứng khoán, luồng đối thoại AI Chatbot từng chữ), hoặc các đường ống điều phối bất đồng bộ thuần túy có nhu cầu kiểm soát nhịp độ `Backpressure`, gom cửa sổ sự kiện `Flux.bufferTimeout` tinh vi.",
          "Ngược lại, đối với **85–90% các dịch vụ nghiệp vụ lõi của Ngân hàng** — bao gồm Core Ledger (Sổ cái), Loan Origination (Khởi tạo khoản vay), Card Management, Limit & Fee Engine, Reconciliation — lựa chọn chiến lược an toàn, hiệu quả và bền vững nhất hiện nay chính là **Spring Boot 3.2+ chạy Spring MVC kết hợp Java 21 Virtual Threads**! Kiến trúc này mang lại điểm cân bằng hoàn hảo: giữ trọn vẹn sức mạnh giao dịch ACID của JPA/Hibernate/JDBC, giữ nguyên Stacktrace tuần tự giúp kỹ sư trực đêm bắt bệnh sự cố tiền tệ trong 3 phút, không có nguy cơ cả cụm sập cứng chỉ vì một lập trình viên lỡ tay viết 1 dòng code đồng bộ như trên Event-loop, đồng thời vẫn giải quyết xuất sắc bài toán chịu tải I/O cao khi giao tiếp liên dịch vụ."
        ],
        bullets: [
          "Tuyệt đối không trộn chung starter-web và starter-webflux một cách vô thức: Nếu thêm `spring-boot-starter-webflux` vào một dự án đang có sẵn `spring-boot-starter-web` chỉ để lấy công cụ `WebClient`, Spring Boot vẫn chạy trên **Tomcat** (MVC) hoàn toàn hợp lệ; nhưng với dự án mới trên Spring Boot 3.2+ dùng Virtual Threads, bạn có thể dùng ngay **`RestClient`** hiện đại gọn nhẹ mà chẳng cần kéo cả bộ thư viện Reactor vào dự án!",
          "Thiết kế Graceful Degradation cho màn hình Tổng hợp: Ở màn hình Trang chủ Ngân hàng, thông tin Số dư Tài khoản thanh toán (CASA) là sống còn (Critical), còn Điểm thưởng tích lũy hay Gợi ý thẻ tín dụng là phụ trợ (Non-critical) — hãy luôn bọc nhánh phụ bằng `.timeout(...)` ngắn kèm dữ liệu mặc định an toàn để lỗi của một dịch vụ vệ tinh không bao giờ kéo sập màn hình chính.",
          "Giám sát độ trễ ghim luồng bằng Java Flight Recorder (JFR): Trên môi trường Production chạy Java 21 Virtual Threads, bật sự kiện JFR `jdk.VirtualThreadPinned` giúp đội SRE phát hiện tức thì nếu có thư viện bên thứ ba nào đang âm thầm giữ khóa `synchronized` quá 20ms."
        ]
      }
    ],
    comparison: {
      title: "Đặt lên bàn cân: Spring MVC Truyền thống vs Spring WebFlux vs Spring MVC + Java 21 Virtual Threads",
      headers: ["Tiêu chí Kiến trúc", "Spring MVC (Platform Threads)", "Spring WebFlux (Reactive Netty)", "Spring MVC + Virtual Threads (Java 21)"],
      rows: [
        ["Mô hình luồng & Tiêu thụ RAM", "1 OS Thread / Request (~1MB Stack/luồng), giới hạn cứng ~200–400 luồng", "4–8 Event-loop Threads cố định, cực kỳ tiết kiệm RAM cho hàng vạn kết nối chờ", "1 Virtual Thread / Request (~vài KB Heap), mở rộng hàng chục nghìn luồng chờ I/O"],
        ["Tương thích JPA / JDBC / @Transactional", "Tương thích 100% chuẩn truyền thống", "KHÔNG tương thích trực tiếp (phải đổi sang R2DBC hạn chế hơn nhiều so với JPA)", "Tương thích 100% nguyên bản với toàn bộ JPA, Hibernate, JDBC, RestClient"],
        ["Độ dễ đọc Code & Điều tra lỗi (Debug)", "Dễ đọc tuần tự, Stacktrace rõ ràng từ đầu đến cuối", "Khó đọc chuỗi toán tử lồng nhau, Stacktrace đứt đoạn, sai 1 dòng blocking là treo cả cụm", "Dễ đọc tuần tự y hệt truyền thống, bảo trì dễ dàng cho đội ngũ lớn"],
        ["Bài toán Ngân hàng phù hợp nhất", "Hệ thống nội bộ tải vừa, ít gọi mạng ra ngoài", "API Gateway (Spring Cloud Gateway), Streaming SSE tỷ giá/số dư, BFF thuần I/O", "90% Core Services Ngân hàng: Sổ cái, Chuyển tiền, Tín dụng, Thẻ, Thanh toán"]
      ]
    },
    codeTitle: "Xây dựng Financial Dashboard Aggregator dưới 150ms với WebClient Non-blocking, Timeout & Fallback cô lập",
    code: [
      "@Service",
      "public class CustomerPortfolioAggregator {",
      "    private static final Logger log = LoggerFactory.getLogger(CustomerPortfolioAggregator.class);",
      "    private final WebClient casaClient;",
      "    private final WebClient cardClient;",
      "    private final WebClient loanClient;",
      "    public CustomerPortfolioAggregator(WebClient.Builder builder) {",
      "        this.casaClient = builder.baseUrl(\"http://core-casa-svc:8080\").build();",
      "        this.cardClient = builder.baseUrl(\"http://card-summary-svc:8080\").build();",
      "        this.loanClient = builder.baseUrl(\"http://loan-ledger-svc:8080\").build();",
      "    }",
      "    public Mono<PortfolioDashboardDto> fetchHomeDashboard(String cif) {",
      "        // Nhánh trọng yếu (CASA): giới hạn SLA 120ms",
      "        Mono<CasaSummary> casaMono = casaClient.get()",
      "                .uri(\"/internal/v1/accounts/{cif}/summary\", cif)",
      "                .retrieve().bodyToMono(CasaSummary.class)",
      "                .timeout(Duration.ofMillis(120));",
      "        // Nhánh phụ 1 (Thẻ tín dụng): nếu quá 110ms hoặc lỗi 5xx -> giáng cấp an toàn, không làm sập trang chủ!",
      "        Mono<CardSummary> cardMono = cardClient.get()",
      "                .uri(\"/internal/v1/cards/{cif}/summary\", cif)",
      "                .retrieve().bodyToMono(CardSummary.class)",
      "                .timeout(Duration.ofMillis(110))",
      "                .onErrorResume(ex -> {",
      "                    log.warn(\"[DEGRADED] Card service slow/failed for cif={}: {}\", cif, ex.toString());",
      "                    return Mono.just(CardSummary.unavailableFallback());",
      "                });",
      "        // Nhánh phụ 2 (Khoản vay): chạy song song hoàn toàn cùng 2 nhánh trên",
      "        Mono<LoanSummary> loanMono = loanClient.get()",
      "                .uri(\"/internal/v1/loans/{cif}/outstanding\", cif)",
      "                .retrieve().bodyToMono(LoanSummary.class)",
      "                .timeout(Duration.ofMillis(110))",
      "                .onErrorReturn(LoanSummary.unavailableFallback());",
      "        return Mono.zip(casaMono, cardMono, loanMono)",
      "                .map(tuple -> new PortfolioDashboardDto(cif, tuple.getT1(), tuple.getT2(), tuple.getT3()));",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Toán tử `Mono.zip(casaMono, cardMono, loanMono)` kích hoạt đồng thời cả 3 cuộc gọi HTTP ngay tại thời điểm đăng ký (`subscribe`): tổng thời gian phản hồi bằng `max(t_casa, t_card, t_loan)` (~120ms) thay vì cộng dồn tuần tự `120 + 110 + 110 = 340ms`.",
      "Nhánh `cardMono` và `loanMono` áp dụng mẫu thiết kế **Graceful Degradation (Giáng cấp mềm dẻo)**: bọc `.timeout(Duration.ofMillis(110))` riêng biệt đi kèm `.onErrorResume` / `.onErrorReturn` trả về đối tượng đánh dấu `PARTIAL_UNAVAILABLE`, đảm bảo dịch vụ Thẻ có bảo trì thì khách hàng vẫn vào App xem số dư và chuyển khoản mượt mà.",
      "Toàn bộ luồng dữ liệu từ lúc gửi gói tin tới lúc ghép `PortfolioDashboardDto` hoàn toàn phi chặn (100% Non-blocking), tuyệt đối không chứa `.block()` hay lời gọi JDBC đồng bộ nào trên luồng Event-loop của Netty.",
      "Nếu dịch vụ này chuyển sang viết trên Spring MVC + Java 21 Virtual Threads (`spring.threads.virtual.enabled=true`), bạn có thể đạt hiệu năng tương đương bằng cách dùng `RestClient` bên trong `CompletableFuture` hoặc `StructuredTaskScope` chạy trên `Executors.newVirtualThreadPerTaskExecutor()`."
    ],
    labGuide: {
      goal: "Đo kiểm tốc độ gộp song song dưới 150ms của Aggregator khi có một dịch vụ con bị treo chậm, đồng thời thực hành dùng BlockHound bắt sống lỗi gọi hàm blocking trên Event-loop.",
      steps: [
        "Bước 1: Dựng 3 endpoint giả lập (hoặc dùng WireMock): CASA phản hồi sau `60ms`, Loan phản hồi sau `80ms`, còn Card cố tình cấu hình bị lag `3.000ms`.",
        "Bước 2: Gọi hàm `fetchHomeDashboard(\"CIF8899\")` bằng `StepVerifier` (từ `reactor-test`) và bấm giờ đo tổng thời gian thực thi toàn cục.",
        "Bước 3: Xác nhận hàm hoàn tất trong khoảng **~115–130ms** (không phải chờ hết 3 giây của Card!), trong đó dữ liệu CASA và Loan đầy đủ còn trường Card nhận đúng trạng thái `unavailableFallback()`.",
        "Bước 4: Thử cố tình nhét lệnh `Thread.sleep(50)` vào bên trong hàm `.map(...)` cuối cùng, kích hoạt `BlockHound.install()` trong hàm `@BeforeAll` của JUnit 5 và quan sát BlockHound lập tức làm đỏ bài test với thông báo `BlockingOperationError`!"
      ],
      expectedOutput: "`StepVerifier` báo xanh trong ~120ms tổng thời gian kèm log cảnh báo `[DEGRADED] Card service slow/failed... TimeoutException`; khi cố tình nhét `Thread.sleep` vào chuỗi Reactive, `BlockHound` chặn đứng ngay lập tức với chỉ dẫn dòng code vi phạm."
    },
    examTips: [
      "Câu hỏi kiến trúc đinh của năm: 'Dự án Core Banking mới chạy Java 21 và Spring Boot 3.3, dùng PostgreSQL với nhiều giao dịch ACID phức tạp, bạn chọn WebFlux hay Spring MVC + Virtual Threads?' -> Hãy trả lời rõ ràng: Chọn **Spring MVC + Virtual Threads** để giữ trọn sức mạnh của JPA/JDBC/`@Transactional` và khả năng debug dễ dàng, dành WebFlux cho tầng Spring Cloud Gateway hoặc Streaming SSE!",
      "Bẫy phỏng vấn WebFlux: Nếu đề đưa đoạn code trong Controller WebFlux gọi `notificationService.sendReactiveEmail(user);` (trả về `Mono<Void>`) mà không nối `.then()` hoặc `.subscribe()`, hãy kết luận ngay: **Email sẽ không bao giờ được gửi đi** vì luồng Reactive hoàn toàn lười (lazy) khi không có subscriber!",
      "Bẫy phỏng vấn Java 21 Virtual Threads: Luôn nhớ nêu 2 lưu ý chuyên sâu để chứng tỏ kinh nghiệm thực chiến là **Carrier Thread Pinning** khi gặp khối `synchronized` bọc I/O (dùng `ReentrantLock` thay thế) và nguy cơ **làm ngập HikariCP / đối tác** nếu thiếu Semaphore/Bulkhead giới hạn đồng thời."
    ],
    summaryTakeaways: [
      "Trong Spring WebFlux, tuyệt đối không thực hiện bất kỳ lời gọi chặn luồng nào (JDBC, `.block()`, đọc file đồng bộ, `Thread.sleep`) trên các luồng Netty Event-loop ít ỏi.",
      "Mọi toán tử trả về `Mono`/`Flux` đều không tự chạy nếu không được nối vào chuỗi phản hồi chính; nếu bắt buộc gọi thư viện đồng bộ cũ, phải đẩy sang `Schedulers.boundedElastic()`.",
      "Sử dụng `Mono.zip` kết hợp `.timeout()` và `.onErrorResume()` riêng cho từng nhánh giúp xây dựng các API tổng hợp siêu nhanh và chống lỗi lan truyền dây chuyền.",
      "Trên Java 21 + Spring Boot 3.2+, Spring MVC bật Virtual Threads là lựa chọn tối ưu cho phần lớn dịch vụ nghiệp vụ ngân hàng dùng JPA/SQL, trong khi WebFlux tỏa sáng ở tầng Gateway và Streaming."
    ],
    lessonQuestions: [
      {
        question: "Một microservice BFF viết bằng Spring WebFlux (chạy trên Pod 2 vCPU có 4 luồng Netty Event-loop) bỗng nhiên bị treo cứng toàn bộ các request mới và báo Timeout hàng loạt ở giờ cao điểm, mặc dù mức sử dụng CPU của Pod chỉ khoảng 5% và RAM còn trống 70%. Nguyên nhân kỹ thuật nào có khả năng cao nhất gây ra hiện tượng này?",
        options: [
          "Do toán tử `Mono.zip` tiêu thụ quá nhiều nhân CPU khi ghép nối 3 đối tượng JSON",
          "Do ai đó đã vô tình thực hiện lời gọi I/O đồng bộ chặn luồng (như gọi JDBC/JPA truyền thống, đọc file đồng bộ hoặc gọi `.block()`) trực tiếp trên luồng `reactor-http-epoll`, làm khóa cứng cả 4 luồng Event-loop khiến máy chủ không thể tiếp nhận thêm sự kiện mạng nào",
          "Do Netty tự động giảm số luồng xuống 0 để tiết kiệm điện năng khi RAM còn trống nhiều",
          "Do WebClient mặc định dùng giao thức UDP nên bị tường lửa ngân hàng giữ lại gói tin"
        ],
        answer: 1,
        explanation: "Triệu chứng kinh điển 'hệ thống treo đơ toàn tập nhưng CPU cực thấp (~3–5%)' trên ứng dụng Reactive chính là dấu hiệu các luồng Event-loop đã bị chặn đứng chờ I/O đồng bộ (`WAITING`/`BLOCKED`). Vì chỉ có 4 luồng Event-loop gánh toàn bộ việc bắt tay và đọc/ghi socket cho hàng nghìn kết nối, chỉ cần 4 request đồng thời đi vào đoạn code blocking là toàn bộ máy chủ tê liệt!",
        wrongReasons: [
          "Nếu nghẽn do tính toán ghép JSON tốn CPU thì biểu đồ CPU của Pod phải vọt lên sát ngưỡng 100% chứ không thể nằm ở mức 5%.",
          "",
          "Netty giữ cố định vòng lặp Event-loop luôn sẵn sàng suốt vòng đời ứng dụng, không bao giờ có chuyện tự tắt luồng về 0.",
          "WebClient thực hiện giao thức HTTP trên nền TCP chuẩn xác chứ không dùng UDP mặc định."
        ]
      },
      {
        question: "Đội kiến trúc quyết định bật `spring.threads.virtual.enabled=true` (Java 21 + Spring Boot 3.3) cho dịch vụ Khởi tạo Khoản vay dùng Spring MVC + PostgreSQL (HikariCP `maximum-pool-size = 20`) và gọi sang một thư viện chấm điểm tín dụng nội bộ. Hai rủi ro kỹ thuật nào cần được kiểm soát chặt chẽ nhất?",
        options: [
          "Phải viết lại toàn bộ code sang `Mono`/`Flux` và gỡ bỏ hoàn toàn `@Transactional` vì Virtual Threads không hỗ trợ `ThreadLocal`",
          "Cần gom các Virtual Threads vào một `Executors.newFixedThreadPool(10)` cố định để tái sử dụng luồng ảo nhằm tiết kiệm bộ nhớ",
          "Cần kiểm tra tránh hiện tượng Carrier Thread Pinning (nếu có khối `synchronized` bọc quanh thao tác chờ mạng/socket nên thay bằng `ReentrantLock`) và dùng Semaphore/Bulkhead giới hạn tải đồng thời để hàng nghìn Virtual Threads không đồng loạt tranh chấp làm nổ timeout bể 20 kết nối HikariCP",
          "Phải tăng `hikari.maximum-pool-size` lên 10.000 kết nối cho bằng với số lượng Virtual Threads"
        ],
        answer: 2,
        explanation: "Trên JDK 21, Virtual Thread bị chặn I/O bên trong khối `synchronized` sẽ ghim chặt Carrier Thread làm suy giảm khả năng co giãn (nên chuyển sang `ReentrantLock`). Đồng thời, dù tầng App tạo được 10.000 Virtual Threads cực nhẹ, tầng Database vẫn bị giới hạn bởi số kết nối vật lý tối ưu của HikariCP (20 kết nối), do đó cần cơ chế điều tiết tải hợp lý và giữ giao dịch DB thật ngắn.",
        wrongReasons: [
          "Ưu điểm lớn nhất của Virtual Threads chính là giữ nguyên mô hình lập trình tuần tự và hỗ trợ đầy đủ `ThreadLocal`, nên `@Transactional` và JPA hoạt động hoàn toàn bình thường mà không cần viết lại sang Reactive.",
          "Tuyệt đối KHÔNG bao giờ pool Virtual Threads! Chúng được thiết kế siêu nhẹ để tạo mới cho từng tác vụ rồi hủy bỏ; nhốt chúng vào `FixedThreadPool(10)` sẽ triệt tiêu toàn bộ lợi ích của Project Loom.",
          "",
          "Đặt HikariCP lên 10.000 kết nối vật lý sẽ đánh sập ngay máy chủ PostgreSQL vì chi phí RAM mỗi tiến trình kết nối và bão chuyển ngữ cảnh (Context Switching) trên Database!"
        ]
      }
    ]
  },

  S6: {
    duration: "60 phút",
    difficulty: "Trung cấp → Senior Thực chiến",
    codeLang: "java",
    teacherIntro: "Chào bạn, chúng ta đã đi tới mảnh ghép cuối cùng và cũng là tấm khiên bảo vệ giấc ngủ ngon lành của mọi kỹ sư ngân hàng trong Học phần S: **Chiến lược Kiểm thử Tự động Chuẩn Tài chính**! Tôi vẫn nhớ như in buổi họp kiểm điểm sự cố (Post-mortem) đầy căng thẳng tại một công ty Fintech thanh toán: trước ngày golive tính năng Rút tiền Ví điện tử nhanh, đội dự án tự tin trình chiếu báo cáo CI/CD xanh mướt — 420 bài test chạy trên **H2 In-Memory Database** (bật cờ giả lập `MODE=PostgreSQL`) vượt qua 100% chỉ trong 8 giây! Thế nhưng chỉ 30 phút sau khi mở tải thật trên Production (dùng PostgreSQL 16), hai tai họa ập đến cùng lúc: câu truy vấn khóa hàng đợi `SELECT ... FOR UPDATE SKIP LOCKED` kèm toán tử `JSONB` hành xử khác hẳn so với bản giả lập H2, và nghiêm trọng hơn, một khách hàng dùng công cụ bắn 20 request rút tiền cùng một mili-giây đã rút lọt lưới làm **số dư ví bị âm -6.000.000 VNĐ**! Bài kiểm thử tuần tự đơn luồng trên H2 đã tạo ra một cảm giác an toàn giả tạo chết người. Hôm nay, bạn sẽ học cách dựng hệ thống phòng tuyến bất khả xâm phạm bằng **Testcontainers chạy PostgreSQL thật**, bài kiểm thử đa luồng **CountDownLatch**, **WireMock** giả lập bão mạng NAPAS và **ArchUnit** canh gác kiến trúc tự động!",
    analogy: {
      title: "Tập hạ cánh máy bay trên trò chơi điện tử cầm tay so với Buồng lái mô phỏng chuẩn hãng bay",
      body: "Bạn hãy hình dung việc mang một hệ thống giữ tiền tỷ ra kiểm thử câu lệnh SQL và khóa đồng thời trên cơ sở dữ liệu giả lập **H2 trong bộ nhớ** giống hệt việc phi công tập hạ cánh máy bay thân rộng dưới trời giông bão bằng... một trò chơi điện tử trên điện thoại! Trong trò chơi đơn giản hóa đó, gió tạt ngang bị bỏ qua, đường băng phẳng lỳ nên lần nào phi công cũng đạt điểm tuyệt đối 100/100; nhưng vừa bước lên buồng lái thật gặp gió giật thực tế (`MVCC Tuple Versioning`, `Row-level Exclusive Lock`, `Deadlock Detection`, ràng buộc `Flyway DDL` đặc thù của PostgreSQL 16), chiếc máy bay lập tức chao đảo! **Testcontainers** chính là buồng lái mô phỏng chuyên nghiệp nhấc nguyên động cơ PostgreSQL 16, Redis và Kafka thật đặt vào thùng Docker cô lập ngay trong lúc chạy JUnit 5; **WireMock** là cỗ máy tạo sấm sét nhân tạo giả lập đối tác đứt cáp quang giữa chừng; còn **ArchUnit** là vị giám sát viên trưởng tự động tuýt còi ngay giây phút có ai đó đặt sai một viên gạch kiến trúc!"
    },
    objectives: [
      "Thiết lập chuẩn mực Tháp Kiểm thử (Test Pyramid) ngành Ngân hàng: kết hợp tốc độ mili-giây của Domain Unit Test với độ trung thực tuyệt đối của Testcontainers (@ServiceConnection) thay thế hoàn toàn H2.",
      "Viết thành thạo bài kiểm thử đồng thời đa luồng (Concurrency Invariant Test với CountDownLatch) trên PostgreSQL Container thật để chứng minh toán học định luật 'Số dư không bao giờ âm'.",
      "Sử dụng WireMock giả lập kịch bản ReadTimeout / HTTP 502 của cổng đối tác và viết luật ArchUnit tự động chặn đứng các vi phạm kiến trúc (như dùng kiểu double cho tiền tệ hay tầng Domain phụ thuộc ngược tầng Web)."
    ],
    flow: [
      {
        step: "1. Tầng Đáy (< 3s): Unit Test Thuần Domain & Quy tắc Tiền tệ",
        detail: "Kiểm thử tức thì hàng trăm ca biên làm tròn BigDecimal, tính phí bậc thang, kiểm tra hạn mức bằng JUnit 5 + AssertJ thuần túy không khởi tạo Spring Context để phản hồi trong tích tắc."
      },
      {
        step: "2. Tầng Kỷ luật (< 2s): Kiểm định Kiến trúc Tự động bằng ArchUnit",
        detail: "Quét trực tiếp Bytecode đã biên dịch để cấm tuyệt đối kiểu float/double trong các lớp tiền tệ, cấm Controller gọi thẳng Repository và giữ sạch tầng Core Domain khỏi thư viện hạ tầng."
      },
      {
        step: "3. Tầng Giao tiếp (~ 15s): Kiểm thử Chịu lỗi Đối tác với WireMock",
        detail: "Dựng máy chủ HTTP giả lập cổng NAPAS/Ngân hàng bạn trả về độ trễ 5 giây (ReadTimeout), kết nối đứt gãy hoặc HTTP 429/504 để xác minh hệ thống giữ đúng trạng thái treo an toàn."
      },
      {
        step: "4. Tầng Sống còn (~ 25s): Concurrency & Persistence Test với Testcontainers",
        detail: "Khởi chạy Singleton Container PostgreSQL 16 thật, chạy nguyên bản toàn bộ script Flyway Production và bắn 20 luồng đồng thời qua CountDownLatch để chứng minh không thể rút âm tiền hay lặp bút toán."
      }
    ],
    sections: [
      {
        heading: "1. Tại sao H2 In-Memory là cái bẫy nguy hiểm cho Ngân hàng & Sức mạnh Testcontainers",
        paragraphs: [
          "Trong các bài hướng dẫn cơ bản trên mạng, người ta rất hay thêm thư viện `com.h2database:h2` vào scope `test` vì sự tiện lợi không cần cài đặt. Nhưng trong môi trường Core Banking & Fintech, H2 là nguồn cơn của vô số lỗi lọt lưới lên Production vì 4 khoảng cách không thể san lấp: (1) Dù bật `MODE=PostgreSQL`, bộ máy thực thi bên dưới của H2 có cơ chế quản lý đa phiên bản (**MVCC**) và khóa dòng (`FOR UPDATE NOWAIT`, `SKIP LOCKED`) khác biệt sâu sắc so với PostgreSQL hay Oracle thật; (2) Các tính năng sống còn của ngân hàng như phân vùng bảng theo tháng (`PARTITION BY RANGE`), cột `JSONB` kèm chỉ mục GIN, câu lệnh chống trùng nguyên tử `INSERT ... ON CONFLICT DO NOTHING` hoặc hàm cửa sổ phức tạp thường nổ lỗi cú pháp trên H2; (3) H2 khiến đội dự án không thể kiểm thử trực tiếp chính bộ kịch bản **Flyway Migration (`src/main/resources/db/migration/V*.sql`)** sẽ chạy thật lúc nâng cấp Production; (4) Tệ nhất là nó tạo ra 'ảo giác xanh' khi các bài test giao dịch đồng thời vượt qua dễ dàng trên H2 nhưng thất bại thảm hại trên Postgres!",
          "Kể từ **Spring Boot 3.1+**, việc tích hợp **Testcontainers** đã trở nên thanh lịch đến mức tối giản nhờ chú thích **`@ServiceConnection`**. Bạn chỉ cần khai báo một trường `static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(\"postgres:16-alpine\")` gắn `@ServiceConnection`: Spring Boot tự động kéo container Docker đúng phiên bản PostgreSQL 16 y hệt Production, tự động nối toàn bộ cấu hình `url`, `username`, `password` vào HikariCP và kích hoạt Flyway xây dựng bảng biểu thật 100% mà không tốn một dòng `@DynamicPropertySource` rườm rà nào! Đặc biệt, hãy áp dụng bí quyết **Singleton Container Pattern** của các Senior: tạo một lớp cơ sở `AbstractBankingIntegrationTest` khởi động container ở khối `static { postgres.start(); }` **đúng một lần duy nhất** và tái sử dụng xuyên suốt cho cả 50 class Integration Test — giúp toàn bộ pipeline trên GitLab CI/GitHub Actions chạy vèo xong chỉ trong 25–30 giây thay vì khởi động lại Docker 50 lần!"
        ],
        bullets: [
          "Kiểm chứng luôn cả kịch bản Flyway ngay lúc Build: Khi Testcontainers chạy trên ảnh `postgres:16-alpine` trống trơn, mọi tập tin `V1__init_ledger.sql`, `V2__add_indexes.sql` đều được chạy thử lửa thật sự; nếu ai viết sai cú pháp SQL hoặc thiếu ràng buộc khóa ngoại, pipeline chặn đứng ngay lập tức.",
          "Cẩn trọng với @Transactional đặt trên chính hàm @Test: Khi bạn gắn `@Transactional` lên hàm test JUnit, toàn bộ lệnh chuẩn bị dữ liệu lẫn lời gọi Service có thể bị gom chung vào 1 Persistence Context duy nhất và không bao giờ chạy lệnh `COMMIT` thật (nên các ràng buộc `DEFERRABLE` hay lỗi `LazyInitializationException` bị che giấu mất!). Với bài test đa luồng hoặc E2E qua HTTP/RestTestClient, tuyệt đối KHÔNG gắn `@Transactional` lên hàm `@Test`!",
          "Làm sạch dữ liệu nhanh giữa các bài test: Thay vì tắt bật lại container, hãy dùng câu lệnh `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` hoặc tạo dữ liệu định danh riêng biệt (`UUID` / mã tài khoản ngẫu nhiên) cho từng ca kiểm thử để các test độc lập tuyệt đối."
        ]
      },
      {
        heading: "2. Kiểm thử Đa luồng Chống Trừ Tiền Âm (Concurrency Test) & Giả lập Bão mạng với WireMock",
        paragraphs: [
          "Làm sao bạn dám ký biên bản nghiệm thu khẳng định trước Giám đốc Khối Công nghệ rằng hàm `withdraw()` hoặc `transfer()` của mình không bao giờ bị rút đúp âm tiền khi 20 thiết bị bắn lệnh cùng một mili-giây? Một bài Unit Test dùng `Mockito.when(...)` hay một bài Integration Test gọi tuần tự từng lệnh một **hoàn toàn vô giá trị** trước lỗi Race Condition! Vũ khí bắt buộc phải có trong kho mã nguồn của mọi Senior Java Ngân hàng là **Bài kiểm thử Bất biến Đồng thời (Concurrency Invariant Test)** sử dụng bộ ba `ExecutorService` + hai chốt chặn **`CountDownLatch`** (`readyGate` và `startGate`). Cơ chế hoạt động sắc như dao cạo: đầu tiên nạp vào tài khoản thực trên PostgreSQL đúng `10.000.000 VNĐ`; sau đó dựng 20 luồng công nhân, mỗi luồng tiến sát vạch xuất phát báo `readyGate.countDown()` rồi đứng im chờ hiệu lệnh tại `startGate.await()`. Khi cả 20 luồng đã vào tư thế sẵn sàng 100%, luồng chính phất cờ duy nhất `startGate.countDown()` — ép toàn bộ **20 câu lệnh rút `1.000.000 VNĐ` lao thẳng vào PostgreSQL trong cùng một micro-giây**!",
          "Sau khi cả 20 luồng hoàn tất (`doneGate.await()`), bài kiểm thử đối chiếu 3 định luật bất biến không được phép sai lệch dù chỉ 1 đồng: (1) Số luồng rút thành công phải bằng đúng **`10`**; (2) Số luồng bị từ chối với mã `INSUFFICIENT_FUNDS` phải bằng đúng **`10`**; (3) Truy vấn lại số dư tài khoản dưới PostgreSQL phải bằng đúng **`0 VNĐ`** và tổng phát sinh Nợ trên bảng `ledger_postings` khớp chính xác `10.000.000 VNĐ`! Nếu ai đó lỡ xóa mất khóa `SELECT ... FOR UPDATE` hoặc điều kiện cập nhật nguyên tử trong code, bài test này sẽ lập tức bắt quả tang số luồng thành công vọt lên 14–18 và số dư tụt âm ngay tại vòng CI! Song song với kiểm thử đồng thời nội bộ, bạn kết hợp **WireMock** giả lập cổng đối tác bên ngoài với cấu hình `aResponse().withFixedDelay(4000)` (cao hơn ReadTimeout 2.000ms của ứng dụng) hoặc `withFault(Fault.CONNECTION_RESET_BY_PEER)` để chứng minh rằng khi mạng liên ngân hàng đứt gãy, dịch vụ của bạn lưu đúng trạng thái `PENDING_RECONCILIATION` chứ không ném lỗi 500 làm mất dấu giao dịch."
        ],
        bullets: [
          "Tại sao phải dùng cặp chốt chặn readyGate + startGate?: Nếu chỉ thả vòng lặp `for` gọi `executor.submit(...)` thông thường, luồng số 1 có thể đã chạy xong xuôi và commit mất rồi trước khi luồng số 15 kịp khởi tạo xong, làm mất đi tính chất va chạm đồng thời khốc liệt ở mức micro-giây!",
          "Không bao giờ dùng Mockito để mock chính quy tắc khóa dữ liệu: Mockito chỉ nên dùng ở tầng Unit Test để cô lập các cổng ngoại vi phức tạp; còn đối với câu truy vấn Repository có khóa bi quan/lạc quan, bắt buộc phải test xuyên thấu xuống PostgreSQL thật qua Testcontainers.",
          "Kiểm chứng tính lũy đẳng đa luồng: Dùng chính khung `CountDownLatch` trên nhưng cho cả 20 luồng gửi **cùng một mã `Idempotency-Key` duy nhất** — hệ thống đạt chuẩn khi chỉ có đúng **1 giao dịch** trừ tiền thực sự, các luồng còn lại nhận phản hồi lũy đẳng hoặc `409 Conflict`!"
        ]
      },
      {
        heading: "3. Canh gác Kiến trúc Tự động bằng ArchUnit — Chặn đứng suy thoái mã nguồn",
        paragraphs: [
          "Bất kỳ kiến trúc sư nào từng dẫn dắt dự án ngân hàng kéo dài 3–5 năm với hàng chục lập trình viên ra vào đều thấm thía nỗi đau mang tên **Suy thoái Kiến trúc (Architectural Erosion)**. Ngày khởi đầu dự án, sơ đồ Hexagonal / Clean Architecture vẽ trên tài liệu đẹp như tranh: tầng `domain` thuần khiết không dính dáng framework, tầng `web` chỉ giao tiếp qua UseCase và DTO. Thế nhưng chỉ sau vài đợt chạy đua tiến độ căng thẳng, một lập trình viên mới vì tiện tay đã tiêm thẳng `AccountJpaRepository` vào `TransferController`, một người khác import `@JsonProperty` và `HttpServletRequest` chui tọt vào sâu trong `domain.model`, thậm chí nguy hiểm nhất là khai báo `private double interestRate;` trong một class tính lãi! Sức người của Tech Lead khi ngồi đọc Merge Request lúc 7 giờ tối hoàn toàn có thể bỏ sót những vết nứt âm ỉ đó.",
          "**ArchUnit** giải quyết bài toán này một cách triệt để bằng cách biến toàn bộ quy chế kiến trúc của ngân hàng thành **các bài kiểm thử JUnit 5 chạy tự động trong dưới 2 giây**! ArchUnit đọc thẳng mã máy Bytecode trong thư mục `target/classes` để thực thi các luật thép không khoan nhượng: (1) Luật phân tầng: không một class nào trong gói `..domain..` được phép phụ thuộc vào `..infrastructure..`, `..web..` hay `jakarta.persistence..`; (2) Luật an toàn tiền tệ: không bất kỳ trường dữ liệu (field) hay tham số hàm nào trong các gói `..ledger..`, `..payment..`, `..interest..` được phép mang kiểu `double`, `Double`, `float` hoặc `Float`; (3) Luật bảo mật tầng biên: các phương thức `public` trong `@RestController` không bao giờ được trả về kiểu dữ liệu gắn `@Entity`! Kể từ giây phút đưa ArchUnit vào CI, quy chuẩn kiến trúc trở thành hàng rào tự động bảo vệ dự án bền vững suốt nhiều năm."
        ],
        bullets: [
          "Luật cấm gọi hàm ngày giờ hệ thống trực tiếp không qua Clock: Bạn thậm chí có thể dùng ArchUnit cấm gọi trực tiếp `LocalDateTime.now()` trong tầng nghiệp vụ tính lãi qua đêm, ép mọi Service phải tiêm `java.time.Clock` vào Constructor để khi viết Unit Test có thể tua nhanh thời gian sang 23:59:59 ngày 29/02 năm nhuận dễ dàng!",
          "Tốc độ cực nhanh và chi phí bảo trì gần bằng 0: Một file `BankingArchitectureTest.java` dài 40 dòng chạy mất chưa tới 1,5 giây nhưng tự động kiểm tra cho cả 2.000 class mới sinh thêm trong tương lai mà không cần viết đi viết lại.",
          "Cân đối Tháp Kiểm thử chuẩn 70-20-10: Khoảng 70% số lượng bài test là Domain Unit Test + ArchUnit siêu tốc (< 5s tổng cộng), 20% là Integration Test với Testcontainers + WireMock kiểm chứng SQL/Locking/Timeout, và 10% là kịch bản End-to-End luồng nghiệp vụ trọng yếu."
        ]
      }
    ],
    comparison: {
      title: "Chiến lược Tháp Kiểm thử (Test Pyramid) Chuẩn Hệ thống Tài chính - Ngân hàng",
      headers: ["Tầng kiểm thử", "Công cụ chủ lực", "Thời gian chạy tiêu biểu", "Rủi ro cốt lõi được triệt tiêu"],
      rows: [
        ["1. Domain Unit Test (70%)", "JUnit 5, AssertJ, Clock giả lập (0% Spring)", "10ms – 2.000ms cho hàng trăm ca", "Sai số làm tròn BigDecimal, sai công thức tính phí/lãi bậc thang, vi phạm hạn mức"],
        ["2. Architecture Guard (Tức thì)", "ArchUnit chạy trên JUnit 5", "< 1.500ms cho toàn bộ dự án", "Dùng nhầm kiểu float/double cho tiền tệ, Controller lộ @Entity, phá vỡ kiến trúc Hexagonal"],
        ["3. External Fault & Contract Test", "WireMock + Spring RestClient/WebClient Test", "5s – 15s", "Ứng dụng xử lý sai khi cổng NAPAS bị ReadTimeout, HTTP 429/502/504 hoặc sai chữ ký JSON"],
        ["4. Persistence & Concurrency Test", "Testcontainers (PostgreSQL 16 + Redis/Kafka thật)", "15s – 30s (Singleton Container)", "Race Condition rút âm tiền đa luồng, lỗi khóa dòng FOR UPDATE, sai cú pháp Flyway SQL thật"]
      ]
    },
    codeTitle: "Integration Test Đa luồng Chống Rút Tiền Âm trên PostgreSQL 16 Testcontainers & Luật ArchUnit",
    code: [
      "@SpringBootTest",
      "class ConcurrentWithdrawalIntegrationTest {",
      "    @ServiceConnection // Spring Boot 3.1+ tự động cấu hình DataSource & chạy Flyway trên Postgres 16 thật!",
      "    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(\"postgres:16-alpine\");",
      "    static { POSTGRES.start(); }",
      "",
      "    @Autowired private WithdrawalUseCase withdrawalUseCase;",
      "    @Autowired private AccountRepository accountRepository;",
      "",
      "    @Test // LƯU Ý: Tuyệt đối KHÔNG gắn @Transactional lên hàm test đa luồng này!",
      "    void twentyConcurrentWithdrawals_mustNeverOverdrawBalance() throws InterruptedException {",
      "        String accNo = accountRepository.createWithInitialBalance(\"9900112233\", new BigDecimal(\"10000000\"));",
      "        int threads = 20;",
      "        CountDownLatch readyGate = new CountDownLatch(threads);",
      "        CountDownLatch startGate = new CountDownLatch(1);",
      "        AtomicInteger successCount = new AtomicInteger(0);",
      "        AtomicInteger rejectedCount = new AtomicInteger(0);",
      "",
      "        try (ExecutorService pool = Executors.newFixedThreadPool(threads)) {",
      "            for (int i = 0; i < threads; i++) {",
      "                final UUID idemKey = UUID.randomUUID();",
      "                pool.submit(() -> {",
      "                    readyGate.countDown();",
      "                    try {",
      "                        startGate.await(); // Chờ đủ 20 luồng cùng đập vào Postgres trong cùng 1 micro-giây!",
      "                        withdrawalUseCase.withdraw(idemKey, accNo, new BigDecimal(\"1000000\"));",
      "                        successCount.incrementAndGet();",
      "                    } catch (InsufficientFundsException ex) {",
      "                        rejectedCount.incrementAndGet();",
      "                    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }",
      "                });",
      "            }",
      "            readyGate.await();",
      "            startGate.countDown(); // Phất cờ xuất phát đồng loạt!",
      "        }",
      "        assertThat(successCount.get()).isEqualTo(10);",
      "        assertThat(rejectedCount.get()).isEqualTo(10);",
      "        assertThat(accountRepository.getBalance(accNo)).isEqualByComparingTo(BigDecimal.ZERO);",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Khối `static { POSTGRES.start(); }` kết hợp `@ServiceConnection` hiện thực hóa mẫu **Singleton Container Pattern**: Docker container `postgres:16-alpine` khởi chạy một lần duy nhất và tự động tiêm cấu hình vào Spring Boot mà không cần dùng H2 giả lập đầy rủi ro.",
      "Hàm test chủ đích KHÔNG gắn `@Transactional`: nhờ đó mỗi luồng bên trong `ExecutorService` mở và commit giao dịch vật lý thực sự xuống PostgreSQL, tái hiện chính xác 100% sự tranh chấp khóa dòng như giờ cao điểm trên Production.",
      "Cặp chốt `readyGate` và `startGate` đảm bảo toàn bộ 20 luồng không chạy lệch pha nhau lúc khởi tạo mà cùng dồn lực bắn lệnh rút `1.000.000 VNĐ` vào đúng khoảnh khắc `startGate.countDown()` mở cổng.",
      "Phép kiểm chứng cuối cùng sử dụng `isEqualByComparingTo(BigDecimal.ZERO)` của AssertJ (dựa trên `compareTo() == 0` thay vì `equals()` nhạy cảm với scale) để khẳng định định luật bảo toàn tiền tệ: đúng 10 lệnh thành công, 10 lệnh từ chối và số dư về đúng 0 đồng!"
    ],
    labGuide: {
      goal: "Tự tay dựng bài Concurrency Test trên PostgreSQL 16 Testcontainers để làm lộ nguyên hình lỗi rút âm tiền rồi sửa lại cho xanh 100%, kèm 1 luật ArchUnit cấm dùng kiểu double.",
      steps: [
        "Bước 1: Đảm bảo Docker Desktop đang chạy trên máy; thêm dependencies `spring-boot-testcontainers`, `org.testcontainers:postgresql` và `com.tngtech.archunit:archunit-junit5` vào dự án.",
        "Bước 2: Viết một hàm `withdraw()` cố tình mắc lỗi ngây thơ: đọc `if (acc.getBalance().compareTo(amt) >= 0)` mà KHÔNG có khóa `SELECT ... FOR UPDATE` hay câu lệnh `UPDATE ... WHERE balance >= :amt`, rồi chạy `ConcurrentWithdrawalIntegrationTest`.",
        "Bước 3: Quan sát bài test lập tức **ĐỎ RỰC**: `successCount` vọt lên 15–20 thay vì 10 và `getBalance(accNo)` bị âm tiền thực sự ngay trên màn hình console! Sau đó bổ sung khóa dòng bi quan trên PostgreSQL và chạy lại để thấy cả 3 lệnh `assertThat` xanh tuyệt đối.",
        "Bước 4: Tạo thêm class `ArchitectureGuardTest` với luật `noFields().that().areDeclaredInClassesThat().resideInAPackage(\"..ledger..\").should().haveRawType(double.class)` rồi thử thêm biến `double fee;` vào `LedgerPosting` để xem ArchUnit tuýt còi ngay trong 1 giây!"
      ],
      expectedOutput: "Ở bước chưa có khóa, bài test đa luồng bắt sống lỗi Lost Update (`expected: 10 but was: 17`, số dư âm); sau khi thêm khóa chuẩn trên PostgreSQL 16 Container, đúng 10 luồng rút thành công, 10 luồng bị chặn `InsufficientFundsException` và số dư cuối = `0`."
    },
    examTips: [
      "Điểm cộng cực lớn khi nộp bài tập về nhà / Capstone ứng tuyển Senior: Hãy viết sẵn ít nhất **1 bài Concurrency Test dùng Testcontainers + CountDownLatch** chứng minh không âm tiền và **1 class ArchUnit** giữ kỷ luật kiến trúc trong repo GitHub — 95% ứng viên khác chỉ viết vài Unit Test đơn giản nên bạn sẽ nổi bật ngay lập tức trước mắt Hội đồng Kỹ thuật!",
      "Câu hỏi phỏng vấn thực tế: 'Làm sao giữ tốc độ chạy CI/CD nhanh khi dùng Testcontainers?' -> Nêu rõ **Singleton Container Pattern** (khởi tạo `static` dùng chung container giữa các test class thay vì `@Testcontainers` khởi động lại liên tục) và phân tầng chạy Unit Test trước, Integration Test sau.",
      "Bẫy kiểm thử tích hợp đối tác: Khi phỏng vấn hỏi cách test luồng gọi cổng NAPAS/VietQR, đừng chỉ test kịch bản trả HTTP 200 thành công; hãy chủ động nêu việc dùng **WireMock** bắn `withFixedDelay` vượt ngưỡng ReadTimeout để chứng minh hệ thống không tự động hoàn tiền sai!"
    ],
    summaryTakeaways: [
      "Tuyệt đối không dựa dẫm vào H2 In-Memory để kiểm chứng câu lệnh khóa đồng thời, JSONB hay kịch bản Flyway của hệ thống ngân hàng; hãy dùng Testcontainers (`@ServiceConnection`) với đúng phiên bản PostgreSQL Production.",
      "Mọi nghiệp vụ trừ số dư, giữ hạn mức hoặc kiểm tra `Idempotency-Key` bắt buộc phải được chứng minh bằng bài kiểm thử đồng thời đa luồng với `CountDownLatch`.",
      "Kết hợp WireMock để kiểm định khả năng chịu lỗi mạng mù trạng thái (`ReadTimeout`, đứt kết nối giữa chừng) khi giao tiếp với các cổng thanh toán liên ngân hàng.",
      "Đưa ArchUnit vào Pipeline CI/CD để tự động khóa chặt ranh giới kiến trúc Hexagonal/DDD và cấm tiệt kiểu số thực dấu phẩy động trong miền dữ liệu tiền tệ."
    ],
    lessonQuestions: [
      {
        question: "Đội phát triển của bạn viết hàm rút tiền sử dụng câu lệnh `SELECT * FROM accounts WHERE id = :id FOR UPDATE NOWAIT` và kiểm thử bằng H2 In-Memory (`MODE=PostgreSQL`) với một hàm `@Test @Transactional` gọi `withdraw()` tuần tự 2 lần, kết quả báo Pass 100%. Vì sao cách kiểm thử này vẫn tiềm ẩn rủi ro nghiêm trọng khi đưa lên Production?",
        options: [
          "Vì H2 chạy quá nhanh làm tốn CPU của máy chủ GitLab CI",
          "Vì hai lỗ hổng lớn: (1) H2 chỉ mô phỏng bề nổi cú pháp chứ cơ chế MVCC và khóa dòng `FOR UPDATE NOWAIT` khác biệt với PostgreSQL thật; (2) Việc gọi tuần tự đơn luồng bên trong `@Test @Transactional` hoàn toàn không tạo ra sự tranh chấp đồng thời giữa nhiều kết nối vật lý và còn rollback mất bước kiểm tra commit thực tế!",
          "Vì JUnit 5 không hỗ trợ kiểm thử các số liệu kiểu `BigDecimal`",
          "Vì Testcontainers chỉ dùng được cho ngôn ngữ Python chứ không hỗ trợ Spring Boot 3"
        ],
        answer: 1,
        explanation: "Kiểm thử cơ chế khóa chống âm tiền đòi hỏi hai điều kiện bắt buộc: phải chạy trên đúng động cơ cơ sở dữ liệu thật (PostgreSQL qua Testcontainers) để cơ chế Row Lock/MVCC vận hành trung thực 100%, và hàm `@Test` không được bọc `@Transactional` chung mà phải dùng nhiều luồng độc lập (`ExecutorService` + `CountDownLatch`) mở các kết nối riêng biệt lao vào tranh chấp cùng lúc.",
        wrongReasons: [
          "H2 chạy trong RAM rất nhẹ, vấn đề cốt tử của nó không phải là tốn CPU mà là sự sai khác hành vi khóa và SQL so với Database thật trên Production.",
          "",
          "JUnit 5 kết hợp AssertJ (`isEqualByComparingTo`) hỗ trợ kiểm chứng `BigDecimal` cực kỳ chính xác và tường minh.",
          "Testcontainers có nguồn gốc mạnh mẽ nhất trên hệ sinh thái Java và được tích hợp chính chủ hạng nhất (`@ServiceConnection`) ngay trong Spring Boot 3.1+."
        ]
      },
      {
        question: "Trong một dự án Core Banking có 35 lập trình viên cùng phát triển, Kiến trúc sư trưởng muốn đảm bảo tự động trên CI/CD rằng: (1) Không bất kỳ ai vô tình dùng kiểu `double`/`float` trong gói `..ledger..` và (2) Không class nào trong tầng `..domain..` được phép import thư viện `org.springframework.web..` hay `jakarta.persistence..`. Giải pháp nào hiệu quả, nhanh và đáng tin cậy nhất?",
        options: [
          "Gửi email nhắc nhở hàng tuần cho cả 35 lập trình viên và nhờ QA kiểm tra bằng mắt từng file code",
          "Viết bộ quy tắc kiểm thử kiến trúc tự động bằng thư viện **ArchUnit** chạy cùng JUnit 5 trong vài giây ngay ở bước Build của mọi Merge Request",
          "Dùng WireMock để chặn các gói tin mạng có chứa số thập phân",
          "Tắt trình biên dịch kiểm tra kiểu dữ liệu của Java 21"
        ],
        answer: 1,
        explanation: "ArchUnit phân tích trực tiếp Bytecode của toàn bộ các class trong dự án để kiểm tra sự phụ thuộc giữa các package, kiểu dữ liệu của các trường/tham số và các annotation được phép sử dụng. Bất kỳ dòng code mới nào vi phạm quy tắc Hexagonal hoặc dùng `double` cho tiền tệ sẽ lập tức làm đỏ bước kiểm thử tự động trong chưa đầy 2 giây.",
        wrongReasons: [
          "Kiểm tra thủ công bằng con người chắc chắn sẽ bỏ sót khi áp lực tiến độ tăng cao và quy mô mã nguồn lên tới hàng nghìn file.",
          "",
          "WireMock là công cụ giả lập máy chủ HTTP bên ngoài phục vụ kiểm thử tích hợp mạng, hoàn toàn không dùng để kiểm tra cấu trúc class nội bộ hay kiểu biến Java.",
          "Java là ngôn ngữ định kiểu tĩnh chặt chẽ và không thể cũng như không bao giờ được tắt kiểm tra kiểu biên dịch."
        ]
      }
    ]
  }
});
