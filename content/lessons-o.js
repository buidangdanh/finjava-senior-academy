window.LESSON_DETAILS = window.LESSON_DETAILS || {};

Object.assign(window.LESSON_DETAILS, {
  O1: {
    duration: "55 phút",
    difficulty: "Chuyên sâu (Cloud-Native JVM & Container)",
    codeLang: "dockerfile",
    teacherIntro: "Chào em, bước sang Học phần O, anh muốn mở đầu bằng một vết sẹo thực chiến mà gần như mọi đội vận hành Core Payment khi mới lên Kubernetes/OpenShift đều từng trả giá. Năm đó, team anh đóng gói dịch vụ chuyển tiền liên ngân hàng bằng Java chạy trong Pod giới hạn cứng `memory.limits = 2Gi`, và một bạn lập trình viên cẩn thận truyền cờ `-Xmx2048m` vì nghĩ 'Pod có 2GB thì cho Java dùng hết 2GB cho khỏe!'. Hệ thống chạy êm ru suốt buổi sáng, nhưng đúng 09:15 ngày mùng 5 trả lương, hàng loạt Pod đột ngột biến mất rồi khởi động lại liên hoàn. Lạ kỳ nhất là lục tung Kibana/OpenSearch không hề thấy một dòng `java.lang.OutOfMemoryError` nào! Thủ phạm chính là Linux Kernel `OOMKiller` đã nổ súng bắn chết tiến trình Java từ bên ngoài (`Exit Code 137`) ngay khoảnh khắc tổng bộ nhớ vật lý vượt trần 2Gi. Hôm nay, anh em mình sẽ làm chủ nghệ thuật đóng gói Layered Docker cho Java 21 / Spring Boot 3 và công thức chia ngân sách bộ nhớ chống `OOMKilled` tuyệt đối trên Production.",
    analogy: {
      title: "Chiếc xe bọc thép chở tiền qua cây cầu giới hạn tải trọng 2 tấn",
      body: "Em hãy hình dung Pod Kubernetes có `memory limit = 2Gi` giống hệt một cây cầu thép gắn cảm biến tự động hất văng mọi phương tiện nặng quá 2.000 kg. Vùng nhớ `Heap (-Xmx)` chỉ là trọng lượng số bao tải tiền mặt xếp trong thùng xe. Nếu em chất đủ 2.000 kg tiền mặt (`-Xmx2g`), em đã quên mất bản thân vỏ thép chống đạn (`Metaspace` & `JVM CodeCache`), ghế ngồi của đội cảnh vệ (`Thread Stacks` cho hàng trăm luồng), bộ đệm cửa thủy lực (`Direct ByteBuffer` của Netty/NIO) và động cơ xe (`GC Native Overhead`) đã nặng thêm 600 kg nữa! Tổng trọng lượng vọt lên 2.600 kg và cây cầu lập tức sập bẫy (`OOMKilled 137`) mà tài xế bên trong xe (JVM) chưa kịp bấm còi báo động một tiếng nào. Còn `Spring Boot Layered JAR` giống như chia thùng xe thành 4 ngăn kéo độc lập: mỗi lần sửa một dòng code nghiệp vụ, em chỉ thay đúng ngăn kéo mỏng 3MB trên cùng thay vì phải đúc lại cả chiếc xe 400MB!"
    },
    objectives: [
      "Thiết kế được Multi-stage Dockerfile chuẩn bảo mật Ngân hàng (PCI-DSS / CIS Benchmark): tách 4 tầng `Layered JAR` của Spring Boot 3, kết hợp AppCDS tăng tốc khởi động và chạy quyền `non-root` bất biến.",
      "Tính toán chính xác Công thức Ngân sách Bộ nhớ Container (`Heap + Metaspace + Direct Memory + Thread Stacks + Native/GC`) để triệt tiêu hoàn toàn lỗi `OOMKilled (Exit Code 137)`.",
      "Phân biệt và áp dụng chuẩn xác các cờ JVM hiện đại trên Linux `cgroups v2` (`-XX:+UseContainerSupport`, `-XX:MaxRAMPercentage`, `MALLOC_ARENA_MAX=2`, `-XX:+ExitOnOutOfMemoryError`)."
    ],
    flow: [
      {
        step: "1. Build & Extract Layers (Tách lớp thư viện và nghiệp vụ)",
        detail: "Stage `extractor` dùng JDK 21 biên dịch/giải nén fat JAR qua `-Djarmode=tools extract --layers` thành 4 thư mục riêng theo tần suất thay đổi."
      },
      {
        step: "2. Hardened Minimal Runtime (Đóng gói JRE tối giản & Non-root)",
        detail: "Stage `runtime` chỉ dùng bản `JRE` sạch (không chứa trình biên dịch `javac` hay công cụ tấn công), khóa quyền thực thi dưới UID cố định `10001`."
      },
      {
        step: "3. Container Memory Budgeting (Khoanh vùng ngân sách RAM)",
        detail: "Cấu hình `MaxRAMPercentage=65.0` kết hợp giới hạn cứng `MaxMetaspaceSize`, `MaxDirectMemorySize` và `MALLOC_ARENA_MAX=2` để tổng RSS luôn nằm dưới trần Pod."
      },
      {
        step: "4. Fail-Fast & Forensic Dump (Thoát an toàn kèm lưu bằng chứng)",
        detail: "Bật `-XX:+HeapDumpOnOutOfMemoryError` ghi ra volume `/dumps` tách biệt và dùng `exec java` làm `PID 1` để nhận tín hiệu dừng `SIGTERM` chuẩn xác từ K8s."
      }
    ],
    sections: [
      {
        heading: "1. Giải phẫu Công thức Bộ nhớ JVM trong Container & Bản chất lỗi OOMKilled (Exit 137)",
        paragraphs: [
          "Sai lầm phổ biến nhất của lập trình viên Java khi chuyển từ máy chủ vật lý sang Docker/Kubernetes là đánh đồng 'Bộ nhớ của tiến trình Java' với 'Vùng nhớ Heap'. Thực tế trên hệ điều hành Linux, bộ kiểm soát tài nguyên `cgroups v2` của Kubernetes theo dõi chỉ số **Working Set / RSS (Resident Set Size)** của toàn bộ tiến trình. Khi chỉ số RSS chạm ngưỡng `resources.limits.memory`, nhân Linux lập tức gửi tín hiệu `SIGKILL (9)` không thể bắt giữ hay trì hoãn, tạo ra mã thoát `128 + 9 = 137` (`OOMKilled`). Vì đây là nhát chém từ tầng Hệ điều hành chứ không phải ngoại lệ bên trong JVM, ứng dụng chết tức tưởi ngay giữa lúc đang hạch toán giao dịch mà không ghi lại bất kỳ dòng stacktrace nào.",
          "Để tính toán chuẩn xác cho một dịch vụ Payment chạy trên Pod giới hạn `2048 MB (2Gi)`, một Senior Architect luôn lập bảng dự toán **JVM Total Memory = Heap + Metaspace + Direct Memory + CodeCache + Thread Stacks + GC/Native Overhead**. Cụ thể trên tải thực tế ngân hàng: nếu dành `65%` cho Heap (`~1.330 MB`), ta còn `~718 MB` cho phần Non-Heap gồm: `Metaspace` (nạp hàng chục nghìn class của Spring Boot, Hibernate, Jackson, Kafka, OpenTelemetry tốn khoảng `180–256 MB`), `Direct Memory` (bộ đệm ngoài Heap của Netty/WebClient/Kafka NIO khoảng `64–128 MB`), `Thread Stacks` (`200 platform threads × 1 MB = 200 MB`, hoặc giảm mạnh nếu dùng Java 21 Virtual Threads), `JIT CodeCache` (`~64–128 MB`) và vùng quản lý trang nhớ của `ZGC/G1GC` cùng thư viện C `glibc malloc`."
        ],
        bullets: [
          "Quy tắc vàng `MaxRAMPercentage`: Với Pod `1Gi–2Gi`, chỉ nên đặt `-XX:MaxRAMPercentage=60.0` đến `65.0`; với Pod lớn `4Gi–8Gi` (tỷ lệ Non-Heap chiếm phần trăm nhỏ hơn), có thể nâng lên `70.0` đến `75.0`. Tuyệt đối không đặt `85%–100%`!",
          "Đặt `InitialRAMPercentage` bằng `MaxRAMPercentage`: Trong dịch vụ tài chính độ trễ thấp, nên cấp phát sẵn vùng Heap cố định ngay lúc khởi động (tương đương `-Xms = -Xmx`) để tránh việc JVM phải xin thêm RAM và co giãn Heap gây khựng GC giữa giờ cao điểm.",
          "Khóa trần Non-Heap tường minh: Luôn đính kèm `-XX:MaxMetaspaceSize=256m` và `-XX:MaxDirectMemorySize=128m` để nếu có lỗi rò rỉ classloader hay Netty `ByteBuf`, JVM sẽ ném `OutOfMemoryError` có log rõ ràng và xuất `HeapDump` thay vì âm thầm phình to cho đến khi bị Linux `SIGKILL`.",
          "Bẫy `glibc` Native Memory Fragmentation: Trên Linux đa nhân, thư viện `glibc` mặc định tạo tới `8 × số nhân CPU` vùng nhớ (`malloc arenas`) làm RSS phình thêm hàng trăm MB vô ích; đặt biến môi trường `MALLOC_ARENA_MAX=2` giúp tiết kiệm ngay 150–300 MB RAM thực tế cho mỗi Pod!"
        ]
      },
      {
        heading: "2. Multi-stage Build, Spring Boot 3.3 Layered JAR & Tăng tốc khởi động với AppCDS",
        paragraphs: [
          "Trong truyền thống cũ, mỗi microservice Spring Boot đóng gói thành một cục 'Fat JAR' nặng `120 MB – 250 MB` nhồi chung cả thư viện bên thứ ba lẫn code nghiệp vụ. Nếu Dockerfile viết ngây thơ một dòng `COPY target/app.jar /app.jar`, thì chỉ cần em sửa một câu thông báo lỗi 10 byte trong Controller, toàn bộ layer Docker 250 MB bị mất hiệu lực cache (`Cache Miss`). Khi 30 microservices ngân hàng cùng build và đẩy ảnh qua mạng nội bộ vào Harbor Registry lúc vá lỗi khẩn cấp, băng thông mạng và ổ cứng Worker Node bị nghẽn cổ chai nghiêm trọng.",
          "Từ Spring Boot 3.3+, cơ chế `-Djarmode=tools` tách chiếc Fat JAR thành 4 tầng chuẩn mực dựa trên tần suất biến đổi: (1) `dependencies` (thư viện phát hành chính thức như Spring, PostgreSQL Driver, Jackson — chiếm 98% dung lượng nhưng cả tháng mới đổi 1 lần), (2) `spring-boot-loader`, (3) `snapshot-dependencies` (thư viện nội bộ dùng chung của ngân hàng), và (4) `application` (bytecode nghiệp vụ của chính team em — chỉ nặng `1–3 MB`). Nhờ thứ tự `COPY` từ tầng tĩnh nhất đến tầng động nhất, mọi bản build CI/CD hàng ngày tái sử dụng 100% layer thư viện và chỉ đẩy đúng 2 MB phần chênh lệch trong chưa đầy 1 giây!"
        ],
        bullets: [
          "Tăng tốc khởi động với AppCDS (Class Data Sharing): Kết hợp Java 21 `-XX:ArchiveClassesAtExit=application.jsa` ở bước huấn luyện ngắn lúc build Docker giúp nạp sẵn siêu dữ liệu class vào bộ nhớ chia sẻ, rút ngắn thời gian khởi động Pod Spring Boot từ `16 giây` xuống chỉ còn `4–5 giây`.",
          "Tách biệt hoàn toàn `JDK` và `JRE`: Stage build bắt buộc dùng `JDK` (hoặc `Maven/Gradle`), nhưng Stage chạy Production chỉ được phép copy thành phẩm sang base image `JRE` tối giản (hoặc tự cắt bằng `jlink`), giảm một nửa bề mặt tấn công bảo mật.",
          "Sử dụng `JarLauncher` chuẩn Spring Boot 3.2+: Lưu ý ở Spring Boot 3.2/3.3 trở đi, đường dẫn class khởi chạy đã đổi từ `org.springframework.boot.loader.JarLauncher` sang `org.springframework.boot.loader.launch.JarLauncher` — đây là chi tiết nâng cấp thực tế rất hay gặp lỗi khi migrate."
        ]
      },
      {
        heading: "3. Chuẩn Bảo mật Container Ngân hàng (PCI-DSS 4.0, OpenShift SCC & PID 1 Signal)",
        paragraphs: [
          "Khi kiểm toán bảo mật PCI-DSS 4.0 hoặc triển khai trên nền tảng Red Hat OpenShift Enterprise (nền tảng container phổ biến số 1 tại các ngân hàng lớn ở Việt Nam), một container chạy dưới quyền `root (UID 0)` sẽ bị chặn đứng ngay từ cửa `SecurityContextConstraints (SCC)` không cho phép khởi chạy. Lý do rất rõ ràng: nếu ứng dụng dính lỗ hổng thực thi mã từ xa (RCE) kết hợp lỗ hổng thoát container (`Container Escape`), tiến trình `root` bên trong container chính là `root` trên máy chủ vật lý chứa hàng chục dịch vụ thanh toán khác!",
          "Bên cạnh quyền `non-root`, hệ thống tệp gốc của container cần được khóa cứng ở chế độ chỉ đọc (`readOnlyRootFilesystem: true`) để kẻ tấn công không thể tải mã độc hay sửa đổi file `.class` lúc đang chạy. Đồng thời, cách viết dòng `ENTRYPOINT` quyết định sống còn tới khả năng tắt máy êm ái: nếu dùng dạng Shell `ENTRYPOINT java -jar ...`, `/bin/sh` sẽ chiếm giữ `PID 1` và nuốt mất tín hiệu `SIGTERM` từ Kubernetes khiến ứng dụng không thể đóng kết nối Database đàng hoàng."
        ],
        bullets: [
          "Cố định UID số học `USER 10001:10001`: Luôn khai báo UID bằng con số cụ thể (`> 10000`) thay vì chỉ ghi tên chữ `USER bankapp`, giúp Kubernetes kiểm chứng chính sách `runAsNonRoot: true` ngay từ metadata ảnh mà không cần tra cứu `/etc/passwd`.",
          "Thiết kế điểm gắn Volume ghi tạm (`emptyDir`): Khi bật `readOnlyRootFilesystem: true`, Tomcat/Spring vẫn cần thư mục tạm `/tmp` để giải nén multipart upload và `/dumps` để xuất file Heap Dump; hãy tạo sẵn quyền sở hữu và gắn `emptyDir` có giới hạn `sizeLimit` cho hai đường dẫn này.",
          "Cú pháp Exec Form cho `PID 1`: Bắt buộc viết `ENTRYPOINT [\"java\", \"org.springframework.boot.loader.launch.JarLauncher\"]` (mảng JSON) để tiến trình `java` trực tiếp làm `PID 1` nhận tín hiệu `SIGTERM`, đồng thời đọc cờ cấu hình linh hoạt qua biến môi trường chuẩn `JAVA_TOOL_OPTIONS`."
        ]
      }
    ],
    comparison: {
      title: "Bảng so sánh các phương pháp đóng gói & cấu hình bộ nhớ Java Container",
      headers: ["Tiêu chí đánh giá", "Fat JAR truyền thống + `-Xmx` cứng", "Multi-stage Layered JAR + `MaxRAMPercentage`", "GraalVM Native Image (AOT)"],
      rows: [
        [
          "Tốc độ Build & Đẩy ảnh CI/CD",
          "Chậm; sửa 1 dòng code phải tải lại nguyên khối layer 150–300 MB",
          "Rất nhanh; tận dụng Docker Cache tối đa, chỉ đẩy layer nghiệp vụ 1–3 MB",
          "Rất chậm lúc biên dịch (tốn 5–12 phút và ngốn 6–8 GB RAM trên máy CI)"
        ],
        [
          "An toàn bộ nhớ & Thích ứng Pod Limit",
          "Rủi ro cao; đổi YAML Pod Limit nhưng quên sửa `-Xmx` gây `OOMKilled 137` hoặc lãng phí RAM",
          "Tự động co giãn cân đối theo `cgroups v2` nhờ `MaxRAMPercentage=65%` + khóa trần Non-Heap",
          "Mức tiêu thụ RAM tĩnh cực thấp (~80–150 MB), không tốn Metaspace JIT"
        ],
        [
          "Khả năng tương thích & Chẩn đoán lỗi",
          "Tương thích 100% thư viện Java, hỗ trợ đầy đủ JFR/HeapDump",
          "Tương thích 100% hệ sinh thái Spring/Hibernate/Reflection, hỗ trợ trọn vẹn JFR, MAT & ZGC",
          "Hạn chế với Reflection động phức tạp, khó lấy Thread/Heap Dump chuẩn truyền thống"
        ],
        [
          "Khuyến nghị dùng trong Ngân hàng",
          "Không khuyến nghị cho Production hiện đại",
          "Chuẩn mực Vàng (Gold Standard) cho 95% dịch vụ Core Banking, Payment Hub & Microservices",
          "Phù hợp cho Serverless, CLI Job ngắn hạn hoặc cổng Edge siêu nhẹ cần scale-to-zero"
        ]
      ]
    },
    codeTitle: "Dockerfile Production chuẩn Ngân hàng: Java 21 + Spring Boot 3.3 Layered + Non-root + Memory Budget",
    code: [
      "# syntax=docker/dockerfile:1.7",
      "# Stage 1: Giải nén Spring Boot 3.3 Layered JAR để tối ưu tuyệt đối Docker Cache",
      "FROM eclipse-temurin:21.0.4_7-jdk-jammy AS extractor",
      "WORKDIR /workspace",
      "ARG JAR_FILE=target/core-payment-service.jar",
      "COPY ${JAR_FILE} application.jar",
      "RUN java -Djarmode=tools -jar application.jar extract --layers --destination extracted",
      "",
      "# Stage 2: Runtime JRE tối giản đạt chuẩn PCI-DSS 4.0 & CIS Docker Benchmark",
      "FROM eclipse-temurin:21.0.4_7-jre-jammy AS runtime",
      "ENV TZ=Asia/Ho_Chi_Minh \\",
      "    LANG=C.UTF-8 \\",
      "    MALLOC_ARENA_MAX=2",
      "",
      "# Tạo tài khoản hệ thống non-root cố định UID 10001 (không cấp shell đăng nhập)",
      "RUN groupadd -g 10001 bankapp && \\",
      "    useradd -u 10001 -g bankapp -s /sbin/nologin -M bankapp && \\",
      "    mkdir -p /app /dumps /tmp && \\",
      "    chown -R 10001:10001 /app /dumps /tmp",
      "",
      "WORKDIR /app",
      "# Sao chép 4 tầng theo đúng thứ tự: ít biến động nhất nằm dưới, code mới nằm trên cùng",
      "COPY --from=extractor --chown=10001:10001 /workspace/extracted/dependencies/ ./",
      "COPY --from=extractor --chown=10001:10001 /workspace/extracted/spring-boot-loader/ ./",
      "COPY --from=extractor --chown=10001:10001 /workspace/extracted/snapshot-dependencies/ ./",
      "COPY --from=extractor --chown=10001:10001 /workspace/extracted/application/ ./",
      "",
      "# Ngân sách bộ nhớ cho Pod limit 2Gi: Heap 65% (~1.33GB) + khóa cứng Metaspace & Direct",
      "ENV JAVA_TOOL_OPTIONS=\"-XX:+UseContainerSupport \\",
      "  -XX:InitialRAMPercentage=65.0 -XX:MaxRAMPercentage=65.0 \\",
      "  -XX:MaxMetaspaceSize=256m -XX:MaxDirectMemorySize=128m \\",
      "  -XX:+UseZGC -XX:+ZGenerational \\",
      "  -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError \\",
      "  -XX:HeapDumpPath=/dumps/oom-dump.hprof\"",
      "",
      "USER 10001:10001",
      "EXPOSE 8080 8081",
      "ENTRYPOINT [\"java\", \"org.springframework.boot.loader.launch.JarLauncher\"]"
    ].join("\n"),
    codeNotes: [
      "Lệnh `-Djarmode=tools ... extract --layers`: Cú pháp chuẩn mới của Spring Boot 3.3 giúp bóc tách trật tự 4 lớp thư mục và giữ nguyên manifest khởi chạy cho `JarLauncher`.",
      "Biến `MALLOC_ARENA_MAX=2` & `MaxRAMPercentage=65.0`: Cặp bài trùng ngăn chặn cả sự phình to của vùng Heap Java lẫn hiện tượng phân mảnh bộ nhớ C Native của `glibc` trên các máy chủ K8s 32–64 nhân CPU.",
      "Cờ `-XX:+ExitOnOutOfMemoryError` đi kèm `HeapDumpPath=/dumps/...`: Khi Heap thật sự cạn kiệt, JVM ghi nhanh file `.hprof` ra ổ đĩa gắn ngoài rồi thoát dứt khoát để K8s thay Pod mới sạch sẽ, tránh tình trạng Pod 'sống thực vật' trả lỗi ngẫu nhiên cho giao dịch chuyển tiền.",
      "Khai báo `USER 10001:10001` và `ENTRYPOINT` dạng mảng JSON: Vừa vượt qua kiểm tra `runAsNonRoot: true` của cổng kiểm soát bảo mật K8s, vừa đảm bảo `java` nhận trực tiếp `SIGTERM` ở `PID 1`."
    ],
    labGuide: {
      goal: "Đóng gói dịch vụ Spring Boot 3.3 bằng Multi-stage Layered Dockerfile, kiểm chứng hiệu quả cache layer và thực nghiệm tái hiện — sau đó hóa giải — lỗi `OOMKilled (Exit 137)` dưới giới hạn cứng `512m`.",
      steps: [
        "Bước 1: Tạo ứng dụng Spring Boot 3.3 (Java 21) có endpoint `/api/v1/stress-alloc` cấp phát mảng byte và Netty `ByteBuffer.allocateDirect`, biên dịch ra file JAR rồi viết `Dockerfile` tách 4 layer như mẫu trên.",
        "Bước 2: Chạy `docker build -t finbank/payment:1.0 .`, sau đó sửa 1 chuỗi log trong Controller, biên dịch lại và chạy `docker build -t finbank/payment:1.1 .` — quan sát dòng `CACHED` ở tầng `dependencies` và đo dung lượng layer mới bằng `docker history`.",
        "Bước 3: Chạy thử kịch bản sai lầm: `docker run --rm -m 512m --memory-swap 512m -e JAVA_TOOL_OPTIONS='-Xmx512m' finbank/payment:1.1`, gọi API tạo tải và kiểm tra `docker inspect` thấy `OOMKilled: true, ExitCode: 137`.",
        "Bước 4: Chạy lại container cùng giới hạn `-m 512m` nhưng áp dụng cấu hình chuẩn `MaxRAMPercentage=60.0 -XX:MaxMetaspaceSize=128m -XX:MaxDirectMemorySize=48m`, xác nhận `id` bên trong container là `uid=10001` và tiến trình ổn định không bị Kernel bắn hạ."
      ],
      expectedOutput: "Bản build `1.1` hoàn tất trong dưới 2 giây với layer `application` chỉ nặng ~1.5 MB; `docker exec ... id` trả về `uid=10001(bankapp)`; container vượt qua bài test chịu tải bộ nhớ dưới trần cgroup mà không còn dính `Exit Code 137`."
    },
    examTips: [
      "Triệu chứng Pod tự khởi động lại kèm `Exit Code 137` nhưng không có log Exception trong Java: Kết luận ngay 100% là Linux `OOMKiller` do tổng `Heap + Non-Heap` vượt quá `resources.limits.memory` (cần hạ `MaxRAMPercentage` xuống `65%–70%` và giới hạn `Metaspace`/`DirectMemory`).",
      "Câu hỏi về tối ưu thời gian CI/CD và băng thông Registry cho Spring Boot: Chọn `Multi-stage Dockerfile` kết hợp `Spring Boot Layered JAR` (`dependencies` đặt ở layer dưới, `application` đặt ở layer trên cùng).",
      "Bẫy `JAVA_OPTS` vs `JAVA_TOOL_OPTIONS`: JVM không tự động hiểu biến `JAVA_OPTS` nếu không truyền thủ công trong lệnh shell; ngược lại `JAVA_TOOL_OPTIONS` được chính JVM tự động đọc ở mọi môi trường ngay cả khi dùng `ENTRYPOINT` dạng mảng Exec!"
    ],
    summaryTakeaways: [
      "Tổng RAM thực tế của container Java luôn bằng `Heap + Metaspace + Direct Memory + Thread Stacks + CodeCache + Native/GC`; không bao giờ đặt `-Xmx` ngang bằng giới hạn RAM của Pod.",
      "Sử dụng `-XX:+UseContainerSupport` và `-XX:InitialRAMPercentage=65.0 -XX:MaxRAMPercentage=65.0` kèm `MALLOC_ARENA_MAX=2` là công thức an toàn nhất cho Pod 2GB trong ngân hàng.",
      "Tách 4 tầng `Layered JAR` trong Multi-stage Dockerfile giúp giảm 95% dung lượng đẩy ảnh mỗi lần phát hành bản vá nóng.",
      "Luôn chạy container bằng `JRE` tối giản, người dùng số học `non-root (UID 10001)` và cú pháp `ENTRYPOINT` mảng JSON để bảo toàn tín hiệu dừng `SIGTERM`."
    ],
    lessonQuestions: [
      {
        question: "Một dịch vụ xử lý thẻ chạy trên Kubernetes có `resources.limits.memory: 2Gi` và được cấu hình `JAVA_TOOL_OPTIONS=\"-Xmx1900m\"`. Vào giờ cao điểm, các Pod liên tục bị khởi động lại với trạng thái `OOMKilled (Exit Code 137)` dù biểu đồ Grafana cho thấy vùng nhớ Heap mới dùng đến 1.550 MB và không hề có log `OutOfMemoryError`. Nguyên nhân gốc rễ và cách khắc phục chuẩn nhất là gì?",
        options: [
          "Do Garbage Collector không chịu chạy khi chưa đầy 1.900 MB; cần gọi `System.gc()` sau mỗi giao dịch thẻ.",
          "Do tổng bộ nhớ vật lý (RSS) gồm Heap đang cấp phát cộng với Metaspace, Thread Stacks, Direct ByteBuffer và vùng nhớ Native đã vượt ngưỡng 2Gi khiến Linux Kernel bắn `SIGKILL`; cần chuyển sang `-XX:MaxRAMPercentage=65.0` và khóa trần `MaxMetaspaceSize` / `MaxDirectMemorySize`.",
          "Do Kubernetes bị lỗi cảm biến RAM; cần tắt hoàn toàn `resources.limits.memory` trên cụm Production để Pod dùng RAM tự do.",
          "Do thiếu cờ `-Xms2048m`; chỉ cần tăng `-Xmx` lên `2500m` cao hơn giới hạn Pod để JVM đè quyền của Linux."
        ],
        answer: 1,
        explanation: "Linux cgroup giám sát tổng bộ nhớ vật lý RSS của cả tiến trình chứ không riêng vùng Heap. Khi Heap chiếm ~1.55–1.9 GB cộng thêm ~400–600 MB của Metaspace, hàng trăm Thread Stacks, Netty Direct Memory và GC overhead, tổng RSS vượt mốc 2Gi nên Kernel giết tiến trình ngay lập tức bằng `SIGKILL (128 + 9 = 137)` trước khi JVM kịp ném ngoại lệ.",
        wrongReasons: [
          "Gọi `System.gc()` liên tục gây Stop-The-World nghiêm trọng làm treo toàn bộ giao dịch thẻ và cũng không thu hồi được vùng nhớ Metaspace hay Thread Stack.",
          "",
          "Bỏ giới hạn `limits.memory` trên Production vi phạm kỷ luật quản trị cụm ngân hàng: một Pod rò rỉ bộ nhớ sẽ nuốt sạch RAM của Worker Node và kéo sập hàng chục dịch vụ khác chung máy chủ.",
          "Đặt `-Xmx2500m` bên trong Pod giới hạn `2Gi` càng khiến JVM tự tin mở rộng Heap vượt ngưỡng 2Gi sớm hơn và bị `OOMKilled` nhanh hơn nữa."
        ]
      },
      {
        question: "Khi rà soát bảo mật Dockerfile cho hệ thống Core Banking triển khai trên OpenShift theo chuẩn PCI-DSS 4.0, Kiến trúc sư trưởng yêu cầu sửa dòng `FROM eclipse-temurin:21-jdk` và `CMD java -jar app.jar`. Tổ hợp thay đổi nào sau đây giải quyết triệt để cả rủi ro bảo mật, hiệu năng cache lẫn lỗi mất tín hiệu tắt Pod?",
        options: [
          "Giữ nguyên ảnh `jdk` để tiện vào container sửa code nóng, chỉ cần thêm `USER root` cho đủ quyền ghi log.",
          "Dùng Multi-stage build: giải nén `Layered JAR` ở stage build, copy 4 tầng sang ảnh `jre` ở stage runtime, thiết lập `USER 10001:10001` non-root và khởi chạy bằng Exec form `ENTRYPOINT [\"java\", \"org.springframework.boot.loader.launch.JarLauncher\"]`.",
          "Nén toàn bộ mã nguồn `.java` vào trong container rồi dùng lệnh `mvnw spring-boot:run` mỗi khi Pod khởi động.",
          "Chuyển sang chạy lệnh `nohup java -jar app.jar &` bên trong một vòng lặp `while true; do sleep 60; done` để Pod không bao giờ tắt."
        ],
        answer: 1,
        explanation: "Kiến trúc Multi-stage tách `Layered JAR` sang base image `JRE` giúp loại bỏ công cụ biên dịch thừa, tận dụng tối đa Docker layer cache, tuân thủ bắt buộc quyền non-root (`UID 10001`) của OpenShift/PCI-DSS và đảm bảo `java` chạy ở `PID 1` nhận trực tiếp `SIGTERM` khi Graceful Shutdown.",
        wrongReasons: [
          "Chạy quyền `root` và để sẵn bộ công cụ `JDK` trên Production tạo bề mặt tấn công cực kỳ nguy hiểm và sẽ bị OpenShift SCC từ chối triển khai.",
          "",
          "Biên dịch mã nguồn lúc khởi động Pod làm thời gian scale-up kéo dài hàng phút, cần kết nối tải thư viện và rò rỉ mã nguồn gốc lên môi trường chạy thật.",
          "Chạy ngầm tiến trình sau vòng lặp `sleep` khiến Kubernetes không biết khi nào ứng dụng sập thật sự và làm vô hiệu hóa hoàn toàn cơ chế tự phục hồi cũng như Graceful Shutdown."
        ]
      }
    ]
  },

  O2: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Kubernetes / OpenShift Banking HA)",
    codeLang: "yaml",
    teacherIntro: "Chào em, nếu ở bài O1 chúng ta giúp chiếc Pod không bị chết bất đắc kỳ tử vì tràn RAM, thì ở bài O2 hôm nay, anh sẽ chỉ cho em hai cái bẫy từng đánh sập cả cụm chuyển tiền 24/7 ngay giữa ban ngày. Cái bẫy thứ nhất xảy ra lúc 10:30 sáng khi team release một bản cập nhật nhỏ: dù dùng `RollingUpdate`, khách hàng vẫn bị rớt gần 50 giao dịch báo lỗi `502 Bad Gateway` khiến tiền bị khoanh giữ lơ lửng chờ đối soát. Cái bẫy thứ hai còn kinh hoàng hơn: một chiều mưa bão, đường truyền sang đối tác chuyển mạch bị chập chờn 8 giây; đáng lẽ hệ thống chỉ chậm đi một chút rồi tự hồi phục, nhưng vì lập trình viên gộp kiểm tra kết nối đối tác vào chung endpoint của `livenessProbe`, Kubernetes tưởng toàn bộ 20 Pod bị treo nên ra tay giết sạch và khởi động lại đồng loạt (`Cascading Restart Storm`), biến một pha lag mạng 8 giây thành thảm họa sập ngân hàng 25 phút! Cùng anh mổ xẻ cách cấu hình Kubernetes/OpenShift chuẩn Zero-Downtime 100% nhé.",
    analogy: {
      title: "Đổi ca tại quầy giao dịch tiền mặt và phân biệt 'Bắt mạch sống' với 'Treo biển tạm ngưng nhận khách'",
      body: "Em hãy tưởng tượng một phòng giao dịch ngân hàng có 10 quầy thu ngân. `livenessProbe` giống như y tá đi kiểm tra xem giao dịch viên có bị ngất xỉu tại ghế hay không — nếu ngất thật thì mới phải gọi cấp cứu thay người mới (Restart Pod). Còn nếu két sắt tổng dưới tầng hầm đang kẹt khóa 10 giây (Database/Đối tác tạm thời chậm), giao dịch viên hoàn toàn tỉnh táo! Lúc đó chỉ cần bật đèn đỏ 'Tạm ngưng nhận khách mới' (`readinessProbe = FAIL`) để bảo vệ sảnh không xếp thêm người vào quầy đó, đợi két mở là làm tiếp ngay — chứ nếu thấy két kẹt mà đuổi việc đồng loạt cả 10 giao dịch viên rồi tuyển 10 người mới vào học việc từ đầu thì cả chi nhánh vỡ trận! Và khi đến giờ đổi ca (`RollingUpdate`), giao dịch viên phải đặt biển 'Ngưng nhận khách xếp hàng thêm' (`preStop` + tắt `Readiness`) trước vài giây, giải quyết trọn vẹn cho vị khách đang đếm tiền dở tại quầy (`server.shutdown=graceful`), đóng sổ xong xuôi rồi mới đứng dậy nhường ghế."
    },
    objectives: [
      "Phân tách rạch ròi vai trò và cấu hình của bộ ba `startupProbe`, `readinessProbe` và `livenessProbe` cùng Spring Boot Actuator Health Groups để không bao giờ gây bão khởi động lại dây chuyền.",
      "Giải quyết triệt để bài toán Race Condition bất đồng bộ giữa `EndpointSlice` / Ingress và `SIGTERM` trên Kubernetes bằng tổ hợp `preStop sleep`, `server.shutdown=graceful` và `terminationGracePeriodSeconds`.",
      "Thiết kế kiến trúc chịu lỗi cấp độ Cụm với `PodDisruptionBudget (PDB)`, `topologySpreadConstraints` đa vùng và cơ chế tự động co giãn `HPA/KEDA` dựa trên độ trễ hàng đợi `Kafka Consumer Lag`."
    ],
    flow: [
      {
        step: "1. Pod Termination Triggered (Bắt đầu rút Pod cũ khi Rollout)",
        detail: "Kubernetes chuyển Pod sang trạng thái `Terminating`, đồng thời chạy hai luồng song song: xóa IP Pod khỏi `EndpointSlice` (báo cho Ingress/Service) VÀ gọi `preStop` hook của container."
      },
      {
        step: "2. PreStop Propagation Buffer (Đệm chờ đồng bộ bảng định tuyến)",
        detail: "Lệnh `preStop: sleep 10` giữ ứng dụng tiếp tục phục vụ thêm 10 giây cho tới khi `kube-proxy`, Istio/Envoy và Nginx Ingress cập nhật xong danh sách IP mới và ngưng hẳn việc bắn request mới tới Pod này."
      },
      {
        step: "3. Graceful Drain on SIGTERM (Rút cạn giao dịch đang chạy dở)",
        detail: "Hết `preStop`, K8s gửi `SIGTERM` vào `PID 1`; Spring Boot (`server.shutdown=graceful`) khóa cổng nhận kết nối mới nhưng kiên nhẫn chờ tối đa `35s` để các giao dịch chuyển tiền & batch Kafka hiện hữu commit an toàn."
      },
      {
        step: "4. Clean Exit Before SIGKILL (Đóng kết nối sạch trước hạn chót)",
        detail: "Toàn bộ kết nối HikariCP, Kafka Producer được đóng gọn gàng và JVM thoát với mã `0` trước cột mốc `terminationGracePeriodSeconds: 60`."
      }
    ],
    sections: [
      {
        heading: "1. Bộ ba Probes (`Startup`, `Readiness`, `Liveness`) & Cái bẫy Sập Dây Chuyền (Cascading Restart)",
        paragraphs: [
          "Trên môi trường Kubernetes/OpenShift, sai lầm kiến trúc nguy hiểm bậc nhất là trỏ cả `livenessProbe` lẫn `readinessProbe` vào cùng một đường dẫn mặc định `/actuator/health`. Mặc định, Spring Boot Actuator sẽ gom tất cả các `HealthIndicator` (gồm PostgreSQL, Redis, Kafka, RabbitMQ, DiskSpace và cả các Custom Indicator kiểm tra cổng đối tác) vào chung `/actuator/health`. Hãy hình dung chuyện gì xảy ra lúc 11:00 trưa khi cụm Redis hoặc Database chuyển đổi dự phòng mất 12 giây: `/actuator/health` trả về `HTTP 503 DOWN`. Ngay lập tức `livenessProbe` kết luận tất cả 15 Pod của dịch vụ Thanh toán đã 'chết lâm sàng' và ra lệnh giết đồng loạt cả 15 Pod! Khi 15 Pod mới cùng lúc bật dậy, chúng đồng thời mở hàng trăm kết nối JDBC, nạp cache, biên dịch JIT gây nghẽn CPU (`CPU Throttling`) và dội một cơn sóng thần kết nối đập chết luôn Database vừa mới hồi phục!",
          "Nguyên tắc bất di bất dịch trong SRE Ngân hàng: **`livenessProbe` CHỈ kiểm tra sức khỏe nội tại của chính tiến trình JVM đó** (ứng dụng còn phản hồi vòng lặp HTTP cơ bản, không bị treo cứng toàn cục) và tuyệt đối KHÔNG kiểm tra bất kỳ phụ thuộc mạng bên ngoài nào! Ngược lại, `readinessProbe` mới là nơi kiểm tra xem Pod hiện tại có đủ điều kiện nhận giao dịch mới hay không (ví dụ: Pool kết nối cốt lõi đã sẵn sàng, ứng dụng không đang trong trạng thái `OUT_OF_SERVICE`). Và đối với các dịch vụ Core Banking nặng cần 25–60 giây để khởi tạo Hibernate/Flyway lúc mới bật, ta dùng `startupProbe` để che chắn giai đoạn khởi động mà không cần kéo giãn `periodSeconds` của `livenessProbe`."
        ],
        bullets: [
          "Cấu hình tách nhóm chuẩn trong Spring Boot 3: Bật `management.endpoint.health.probes.enabled=true` trên cổng quản trị nội bộ `management.server.port=8081` (không phơi bày ra Internet!) để tách bạch `/actuator/health/liveness` và `/actuator/health/readiness`.",
          "Thận trọng ngay cả với `readinessProbe`: Chỉ đưa các hạ tầng nội bộ thiết yếu (như DB chính của service đó) vào nhóm `readiness` nếu muốn ngắt tải khi Pod mất kết nối cục bộ; tuyệt đối KHÔNG đưa API của một đối tác phụ (như nhà cung cấp nạp thẻ điện thoại) vào `readinessProbe`, vì đối tác phụ lỗi sẽ làm K8s rút sạch toàn bộ Pod khiến cả tính năng chuyển khoản chính cũng chết theo!",
          "Công thức `startupProbe`: Đặt `failureThreshold: 30` × `periodSeconds: 3` giúp cho phép Pod có tối đa `90 giây` khởi động lần đầu; ngay giây thứ 12 khi Pod lên xong, `startupProbe` bàn giao quyền giám sát sang `livenessProbe` cực nhạy."
        ]
      },
      {
        heading: "2. Giải phẫu Zero-Downtime Deployment: Tại sao chỉ bật `server.shutdown=graceful` vẫn rớt giao dịch?",
        paragraphs: [
          "Rất nhiều bạn Senior đi phỏng vấn trả lời rằng: 'Để deploy không rớt request trên K8s, em chỉ cần thêm `server.shutdown=graceful` vào `application.yml` là đủ!'. Thực tế trên tải cao 2.000 TPS, nếu chỉ có cấu hình đó, mỗi lần rollout em vẫn bị rớt hàng chục giao dịch báo lỗi `502 Bad Gateway / Connection Refused`. Lý do nằm ở kiến trúc phân tán bất đồng bộ của Kubernetes: khi K8s quyết định xóa một Pod cũ, `kubelet` trên máy chủ đó bắn tín hiệu `SIGTERM` vào container **CÙNG LÚC** với việc Control Plane phát thông báo gỡ địa chỉ IP của Pod ra khỏi `EndpointSlice`.",
          "Vấn đề là tín hiệu `SIGTERM` truyền nội bộ trên máy chủ tốn chưa tới `1 mili-giây` — nếu Spring Boot nhận `SIGTERM` và lập tức đóng cổng lắng nghe `8080`, thì ở chiều bên kia, bộ điều khiển Ingress Controller (Nginx/HAProxy/F5) hoặc `kube-proxy` `iptables/IPVS` mất từ `2 đến 5 giây` mới cập nhật xong danh sách IP mới! Trong khoảng mù 3 giây đó, Load Balancer vẫn hồn nhiên đẩy hàng trăm lệnh chuyển tiền mới vào địa chỉ IP của chiếc Pod vừa khóa cửa! Lời giải hoàn hảo bắt buộc phải phối hợp nhịp nhàng cả hai phía: dùng `lifecycle.preStop` cho container ngủ chờ `10 giây` để bảng định tuyến mạng bên ngoài cắt sạch lưu lượng mới trước, sau đó mới cho phép `SIGTERM` chạm vào Spring Boot để rút cạn (`drain`) các giao dịch cũ đang xử lý dở."
        ],
        bullets: [
          "Bất đẳng thức thời gian sống còn: `terminationGracePeriodSeconds` của Pod BẮT BUỘC phải lớn hơn tổng `preStop sleep` + `spring.lifecycle.timeout-per-shutdown-phase` + `5–10s dự phòng` (Ví dụ: `60s > 10s + 35s + 15s`). Nếu để mặc định `30s`, K8s sẽ bắn `SIGKILL` cắt ngang giao dịch ở giây thứ 30!",
          "Chiến lược `RollingUpdate` không hụt năng lực: Cấu hình `maxUnavailable: 0` và `maxSurge: 25%` để Kubernetes bắt buộc phải dựng Pod phiên bản mới lên xanh `Ready` hoàn toàn trước khi được phép rút dù chỉ 1 Pod phiên bản cũ.",
          "Đóng êm ái cả luồng bất đồng bộ Kafka & Scheduler: Với Spring Kafka, đảm bảo ` KafkaListenerEndpointRegistry` dừng kéo lô bản tin mới khi nhận sự kiện đóng Context và hoàn tất commit `ack` cho lô đang xử lý trong khung thời gian `35s`."
        ]
      },
      {
        heading: "3. Quản trị Tính Sẵn Sàng Cao (HA): PodDisruptionBudget, Anti-Affinity & Scale theo Kafka Lag",
        paragraphs: [
          "Vận hành ngân hàng 24/7 không chỉ có chuyện deploy code mới, mà hàng tuần đội Hạ tầng Hệ thống còn phải vá lỗi nhân Linux hoặc bảo trì máy chủ vật lý bằng lệnh `kubectl drain node`. Nếu cả 4 Pod của dịch vụ Xác thực Smart OTP vô tình nằm chung trên một máy chủ vật lý, hoặc công cụ tự động rút cùng lúc 4 Pod để dọn node, dịch vụ sẽ gián đoạn tức thì. Đó là lúc hai lá chắn `PodDisruptionBudget (PDB)` và `topologySpreadConstraints` phát huy sức mạnh.",
          "Hơn thế nữa, đối với các dịch vụ Worker xử lý hạch toán hoặc gửi biến động số dư qua Kafka, việc cấu hình `HorizontalPodAutoscaler (HPA)` chỉ dựa trên `% CPU` là một sai lầm kinh điển: khi I/O Database hoặc cổng SMS hơi chậm, các luồng Worker chủ yếu nằm chờ mạng nên CPU chỉ báo `15%`, trong khi hàng đợi Kafka đã ùn ứ lên tới `500.000 bản tin` khiến khách hàng nhận thông báo trừ tiền trễ 20 phút! Hệ thống chuẩn ngân hàng luôn kết hợp KEDA hoặc Custom Metrics Adapter để tự động nhân bản số lượng Pod dựa trực tiếp trên chỉ số `kafka_consumergroup_lag` (lưu ý tổng số Pod tối đa không vượt quá số `Partitions` của Topic)."
        ],
        bullets: [
          "Bảo hiểm rút Pod với `PodDisruptionBudget`: Khai báo `minAvailable: 80%` (hoặc ít nhất `minAvailable: 2` với dịch vụ nhỏ) để K8s API từ chối mọi thao tác bảo trì tự nguyện làm tụt số Pod khỏe mạnh xuống dưới ngưỡng an toàn.",
          "Rải đều Pod chống chết chùm máy chủ (`Zone/Node Anti-Affinity`): Bắt buộc cấu hình `topologySpreadConstraints` rải đều các bản sao Pod trên nhiều Rack / Availability Zone khác nhau để sập 1 tủ rack điện không làm mất dịch vụ.",
          "Cấp chất lượng `Guaranteed QoS` cho Core Services: Với các dịch vụ lõi nhạy cảm độ trễ, đặt `requests.memory == limits.memory` để Pod được xếp hạng ưu tiên cao nhất, không bị K8s trục xuất (`Evicted`) khi máy chủ thiếu RAM."
        ]
      }
    ],
    comparison: {
      title: "Bảng phân định chuẩn mực 3 loại Kubernetes Probes cho Microservices Ngân hàng",
      headers: ["Loại Probe", "Câu hỏi cốt lõi", "Hành động của K8s khi FAIL", "Quy tắc cấu hình chuẩn Ngân hàng"],
      rows: [
        [
          "`startupProbe`",
          "Ứng dụng đã hoàn tất quá trình khởi động ban đầu chưa?",
          "Chờ tới hết `failureThreshold × periodSeconds`; nếu vẫn chưa lên mới giết và khởi động lại Pod",
          "Trỏ vào `/actuator/health/liveness`; đặt ngưỡng rộng (`30 × 3s = 90s`) để bảo vệ ứng dụng khi CPU bận lúc boot"
        ],
        [
          "`readinessProbe`",
          "Pod này hiện tại có sẵn sàng nhận thêm giao dịch mới không?",
          "Gỡ IP của Pod khỏi `Service / EndpointSlice` (ngắt chia tải tạm thời, KHÔNG giết Pod!)",
          "Trỏ vào `/actuator/health/readiness`; chỉ kiểm tra trạng thái sẵn sàng nội bộ và tài nguyên cốt lõi trực tiếp"
        ],
        [
          "`livenessProbe`",
          "Tiến trình JVM có bị treo cứng không thể tự phục hồi không?",
          "Giết tiến trình và khởi động lại container (`Restart`) ngay khi vượt ngưỡng lỗi",
          "Trỏ vào `/actuator/health/liveness`; CẤM TUYỆT ĐỐI kiểm tra Database, Redis, Kafka hay API đối tác bên ngoài!"
        ],
        [
          "`preStop` + `Graceful`",
          "Làm sao rút Pod êm ái không cắt ngang giao dịch đang chạy?",
          "Đợi `preStop` chạy xong mới gửi `SIGTERM`, sau đó chờ tới trần `terminationGracePeriodSeconds`",
          "`preStop: sleep 10` + `server.shutdown=graceful (35s)` + `terminationGracePeriodSeconds: 60`"
        ]
      ]
    },
    codeTitle: "Manifest Kubernetes Deployment Chuẩn Zero-Downtime cho Dịch vụ Chuyển tiền Nhanh 24/7",
    code: [
      "apiVersion: apps/v1",
      "kind: Deployment",
      "metadata:",
      "  name: napas-ibft-service",
      "  namespace: payment-prod",
      "spec:",
      "  replicas: 6",
      "  strategy:",
      "    type: RollingUpdate",
      "    rollingUpdate: { maxSurge: 2, maxUnavailable: 0 }",
      "  selector:",
      "    matchLabels: { app: napas-ibft-service }",
      "  template:",
      "    metadata:",
      "      labels: { app: napas-ibft-service }",
      "    spec:",
      "      terminationGracePeriodSeconds: 60",
      "      containers:",
      "        - name: app",
      "          image: harbor.finbank.vn/payment/napas-ibft:2.4.1",
      "          env:",
      "            - { name: SERVER_SHUTDOWN, value: \"graceful\" }",
      "            - { name: SPRING_LIFECYCLE_TIMEOUT_PER_SHUTDOWN_PHASE, value: \"35s\" }",
      "          resources:",
      "            requests: { cpu: \"1000m\", memory: \"2Gi\" }",
      "            limits:   { cpu: \"2000m\", memory: \"2Gi\" }",
      "          startupProbe:",
      "            httpGet: { path: /actuator/health/liveness, port: 8081 }",
      "            failureThreshold: 30",
      "            periodSeconds: 3",
      "          readinessProbe:",
      "            httpGet: { path: /actuator/health/readiness, port: 8081 }",
      "            periodSeconds: 5",
      "            failureThreshold: 2",
      "          livenessProbe:",
      "            httpGet: { path: /actuator/health/liveness, port: 8081 }",
      "            periodSeconds: 10",
      "            failureThreshold: 3",
      "          lifecycle:",
      "            preStop:",
      "              exec: { command: [\"sh\", \"-c\", \"sleep 10\"] }"
    ].join("\n"),
    codeNotes: [
      "Cấu hình `maxSurge: 2, maxUnavailable: 0`: Bắt buộc K8s khởi tạo thêm 2 Pod mới và vượt qua `readinessProbe` trước khi được phép hạ 2 Pod cũ, đảm bảo dung lượng chịu tải không bao giờ tụt dưới 6 Pod trong giờ cao điểm.",
      "Tách cổng nội bộ `port: 8081` cho Actuator Probes: Ngăn chặn triệt để việc người dùng bên ngoài qua API Gateway có thể truy cập các đường dẫn `/actuator/*` của hệ thống thanh toán.",
      "Chuỗi khớp thời gian `10s (preStop) + 35s (Spring graceful drain) = 45s < 60s (terminationGracePeriodSeconds)`: Đảm bảo Ingress ngừng hẳn bắn gói tin mới rồi mới đóng cổng Tomcat, và chờ trọn vẹn các giao dịch chuyển tiền tối đa 30s hoàn tất trước khi hết hạn 60s.",
      "Phân tách `/actuator/health/liveness` và `/actuator/health/readiness`: Ngăn chặn hoàn toàn thảm họa `Cascading Restart` nếu mạng Database hay cổng đối tác chập chờn ngắn hạn."
    ],
    labGuide: {
      goal: "Kiểm chứng thực tế sự khác biệt một trời một vực giữa Deployment mặc định (rớt hàng loạt request 502) và Deployment chuẩn Zero-Downtime khi bắn tải liên tục 200 RPS trong lúc cập nhật phiên bản mới.",
      steps: [
        "Bước 1: Dựng cụm cục bộ (`kind` hoặc `minikube` kèm Ingress Nginx) và tạo API mô phỏng chuyển tiền `/api/v1/transfers` có thời gian xử lý `1.5 giây` (giả lập chờ xác nhận liên ngân hàng).",
        "Bước 2: Triển khai bản cấu hình ngây thơ (không có `preStop`, `server.shutdown=immediate` mặc định), dùng công cụ `k6` hoặc `hey` bắn liên tục 200 request/giây rồi chạy `kubectl set image` cập nhật bản mới — ghi nhận số lượng lỗi `502/Connection reset`.",
        "Bước 3: Áp dụng đầy đủ cấu hình chuẩn (`management.endpoint.health.probes.enabled=true`, `SERVER_SHUTDOWN=graceful`, `preStop: sleep 10`, `terminationGracePeriodSeconds: 60`, `maxUnavailable: 0`) và tạo thêm `PodDisruptionBudget` (`minAvailable: 4`).",
        "Bước 4: Lặp lại bài bắn tải `k6` 200 RPS ngay trong lúc chạy `RollingUpdate` lên bản `2.4.2` và kiểm tra báo cáo tỷ lệ lỗi cuối cùng."
      ],
      expectedOutput: "Báo cáo `k6` ghi nhận `http_req_failed: 0.00%` (không rớt dù chỉ 1 giao dịch trong suốt quá trình thay thế toàn bộ 6 Pod); log của Pod cũ hiển thị rõ dòng `Commencing graceful shutdown. Waiting for active requests to complete` rồi mới `Graceful shutdown complete`."
    },
    examTips: [
      "Tình huống đề bài / phỏng vấn nêu 'khi Database hoặc đối tác lag vài giây, toàn bộ Pod tự động restart hàng loạt': Thủ phạm 100% là cấu hình nhầm kiểm tra phụ thuộc ngoài vào `livenessProbe` — phải gỡ ngay khỏi `liveness`!",
      "Đã bật `server.shutdown=graceful` nhưng lúc deploy trên K8s vẫn thỉnh thoảng dính lỗi `502 Bad Gateway`: Nguyên nhân do độ trễ lan truyền `EndpointSlice` tới Ingress/kube-proxy; cách chữa là thêm `lifecycle.preStop: sleep 10` và nâng `terminationGracePeriodSeconds` tương ứng.",
      "Khi scale Kafka Consumer Pod bằng HPA trên K8s: Chỉ số chuẩn cần đo là `Consumer Group Lag` (qua KEDA/Prometheus Adapter), và số `maxReplicas` không cần đặt lớn hơn tổng số `Partitions` của Kafka Topic vì các Pod dư thừa sẽ ngồi chơi (`Idle`)."
    ],
    summaryTakeaways: [
      "`livenessProbe` chỉ bắt mạch sống của chính JVM; tuyệt đối không buộc số phận của toàn bộ cụm Pod vào kết nối mạng của Database hay đối tác bên ngoài.",
      "Zero-Downtime thực thụ đòi hỏi bộ tứ đồng bộ: `maxUnavailable: 0` + `preStop sleep` + `server.shutdown=graceful` + `terminationGracePeriodSeconds` đủ rộng.",
      "Luôn bảo vệ các dịch vụ thanh toán trọng yếu bằng `PodDisruptionBudget` và phân tán Pod trên nhiều Node/Zone vật lý (`topologySpreadConstraints`).",
      "Tách riêng cổng quản trị `management.server.port=8081` cho các đường dẫn Actuator để bảo mật bề mặt API đối ngoại."
    ],
    lessonQuestions: [
      {
        question: "Một ngân hàng triển khai 16 Pod `card-authorization-service` trên OpenShift. Cả `livenessProbe` và `readinessProbe` đều trỏ chung vào `/actuator/health` (bao gồm kiểm tra kết nối tới cổng HSM và Database). Lúc 14:00, thiết bị chuyển mạch mạng nội bộ chuyển luồng gây gián đoạn kết nối DB trong 9 giây rồi thông suốt trở lại, nhưng hệ thống thẻ lại bị tê liệt hoàn toàn suốt 18 phút sau đó vì cả 16 Pod liên tục bị giết và khởi động lại trùng lúc. Giải pháp kiến trúc nào xử lý tận gốc vấn đề này?",
        options: [
          "Xóa bỏ hoàn toàn cả `livenessProbe`, `readinessProbe` và `startupProbe` trên mọi dịch vụ Production.",
          "Tách riêng Health Groups của Spring Boot Actuator: cấu hình `livenessProbe` vào `/actuator/health/liveness` chỉ kiểm tra trạng thái sống nội tại của JVM, chuyển kiểm tra sẵn sàng cục bộ sang `readinessProbe` và bổ sung `startupProbe` bảo vệ pha khởi động.",
          "Giữ nguyên cấu hình chung `/actuator/health` nhưng giảm `periodSeconds` của `livenessProbe` xuống 1 giây và `failureThreshold: 1` để K8s giết Pod nhanh hơn nữa.",
          "Tăng số lượng Pod từ 16 lên 100 Pod để khi 16 Pod bị giết vẫn còn 84 Pod khác chờ đến lượt bị giết tiếp."
        ],
        answer: 1,
        explanation: "Việc đưa kiểm tra DB/HSM vào `livenessProbe` biến một sự cố mạng thoáng qua 9 giây thành bão khởi động lại toàn cục (`Cascading Restart Storm`). Tách `livenessProbe` chỉ kiểm tra nội tại JVM đảm bảo các Pod vẫn sống nguyên vẹn và tự động khôi phục xử lý ngay giây thứ 10 khi mạng thông trở lại.",
        wrongReasons: [
          "Xóa hết Probes khiến Kubernetes gửi thẳng giao dịch của khách hàng vào các Pod chưa khởi động xong hoặc đã bị treo cứng, gây lỗi diện rộng thường trực.",
          "",
          "Giảm ngưỡng `livenessProbe` xuống 1 giây càng làm hệ thống nhạy cảm cực đoan, chỉ cần một nhịp GC hơi dài hoặc mạng nháy nhẹ 1 giây là toàn bộ cụm tự sát ngay lập tức.",
          "Tăng lên 100 Pod cùng trỏ vào DB đang chập chờn thì cả 100 Pod đều fail `livenessProbe` cùng lúc và khi bật lại sẽ tạo bão kết nối đánh sập luôn cả Database."
        ]
      },
      {
        question: "Đội nền tảng đã bật `server.shutdown=graceful` với `timeout-per-shutdown-phase=30s` cho dịch vụ Chuyển khoản, nhưng giữ nguyên `terminationGracePeriodSeconds: 30` mặc định của Kubernetes và thêm `preStop: sleep 10`. Điều gì sẽ xảy ra với một giao dịch chuyển tiền liên ngân hàng đang chờ đối tác phản hồi mất 25 giây đúng lúc Pod nhận lệnh rút lui?",
        options: [
          "Giao dịch vẫn hoàn tất an toàn ở giây thứ 35 vì K8s tự động cộng dồn thời gian `preStop` vào ngoài quỹ `terminationGracePeriodSeconds`.",
          "Giao dịch bị cắt đứt thô bạo ở giây thứ 30 bởi `SIGKILL`: vì đồng hồ đếm ngược `terminationGracePeriodSeconds (30s)` bắt đầu chạy ngay từ lúc gọi `preStop (mất 10s)`, nên Spring Boot chỉ còn đúng 20s trước khi bị cưỡng bức tắt máy.",
          "Kubernetes sẽ hủy bỏ đợt triển khai phiên bản mới và giữ nguyên Pod cũ chạy vĩnh viễn.",
          "Lệnh `preStop` sẽ tự động bị bỏ qua nếu có giao dịch đang chạy."
        ],
        answer: 1,
        explanation: "Trong Kubernetes, quỹ thời gian `terminationGracePeriodSeconds` bao trùm CẢ thời gian thực thi `preStop` hook lẫn thời gian chạy sau `SIGTERM`. Nếu `preStop` đã tiêu tốn 10s thì trên quỹ 30s chỉ còn lại 20s — giao dịch cần 25s sẽ bị `SIGKILL` chặt đứt ở mốc 30s. Bắt buộc phải nâng `terminationGracePeriodSeconds` lên tối thiểu `55–60s` (`> 10s + 30s + buffer`).",
        wrongReasons: [
          "Kubernetes KHÔNG cộng thêm thời gian `preStop` ra ngoài `terminationGracePeriodSeconds`; cả hai dùng chung một đồng hồ đếm ngược duy nhất.",
          "",
          "Kubernetes luôn cưỡng chế thu hồi Pod bằng `SIGKILL` khi hết thời gian ân hạn chứ không tự hủy đợt Rollout vì một request dài.",
          "K8s luôn thực thi `preStop` trước khi phát `SIGTERM` bất kể bên trong ứng dụng đang có bao nhiêu request."
        ]
      }
    ]
  },

  O3: {
    duration: "55 phút",
    difficulty: "Chuyên sâu (Banking DevSecOps & Zero-Trust Secrets)",
    codeLang: "yaml",
    teacherIntro: "Chào em, trong lĩnh vực phần mềm thông thường, bảo mật đôi khi chỉ được nhớ tới ở tuần cuối cùng trước ngày Go-live khi đội An toàn thông tin gửi về một file Excel dài dằng dặc các lỗ hổng bắt sửa gấp. Nhưng trong Ngân hàng chịu sự giám sát chặt chẽ của Ngân hàng Nhà nước (Thông tư 09/2020/TT-NHNN) và tiêu chuẩn thẻ quốc tế PCI-DSS 4.0, chỉ một mật khẩu Database môi trường UAT/Prod bị ai đó vô tình commit lên Git rồi xóa đi ở commit sau, hoặc một thư viện phụ thuộc cấp 3 dính lỗ hổng thực thi mã từ xa như `Log4Shell` lọt lên Production cũng đủ khiến đợt kiểm toán thất bại nặng nề! Hôm nay, anh sẽ hướng dẫn em xây dựng đường ống **DevSecOps 6 chốt chặn tự động** và kiến trúc **HashiCorp Vault Dynamic Secrets** — nơi ngay cả chính anh hay trưởng nhóm DevOps cũng không ai biết mật khẩu Database Production là gì, vì mật khẩu đó tự sinh riêng cho từng Pod và tự hủy sau mỗi 24 giờ!",
    analogy: {
      title: "Dây chuyền kiểm định an ninh sân bay và Thẻ từ kho tiền tự hủy sau mỗi ca trực",
      body: "Em hãy hình dung mỗi lần lập trình viên bấm tạo `Merge Request` giống như đưa một kiện hàng giá trị cao vào khoang máy bay chở tiền. Thay vì đợi máy bay cất cánh rồi mới kiểm tra, kiện hàng phải đi qua 4 máy soi chiếu tự động ngay trên băng chuyền (`Shift-Left DevSecOps`): Máy soi 1 (`Gitleaks`) tìm xem có ai bỏ quên chìa khóa két sắt trong túi áo không; Máy soi 2 (`SonarQube / Semgrep`) kiểm tra kết cấu hàn của thùng hàng có đúng quy chuẩn chống cạy phá không; Máy soi 3 (`Trivy SCA`) đối chiếu từng con ốc nhập khẩu từ nhà cung cấp phụ trợ xem có nằm trong danh sách triệu hồi lỗi toàn cầu (`CVE`) không; và cuối cùng đóng dấu sáp niêm phong điện tử (`Cosign`) để không ai tráo hàng dọc đường tới sân đỗ K8s. Đặc biệt nhất, khi nhân viên bước vào kho tiền Database, họ không bao giờ dùng một chiếc chìa khóa đồng cố định truyền tay nhau cả năm (Static Secret), mà quầy an ninh trung tâm (`HashiCorp Vault`) cấp tại chỗ một thẻ từ dùng một lần có hiệu lực đúng 24 tiếng rồi tự xóa sạch khỏi ổ khóa Database!"
    },
    objectives: [
      "Thiết kế được đường ống CI/CD DevSecOps 6 chặng tự động chặn đứng Merge Request khi vi phạm Quality Gate: rò rỉ khóa bí mật, lỗi bảo mật mã nguồn (SAST), thư viện dính CVE nghiêm trọng (SCA) và ảnh container chưa ký số.",
      "Hiểu rõ tại sao `Kubernetes Secret` mặc định (Base64) không phải là mã hóa an toàn và nắm vững cơ chế xác thực `Kubernetes ServiceAccount Auth` với HashiCorp Vault.",
      "Triển khai được mô hình **Dynamic Database Credentials** (tài khoản PostgreSQL/Oracle sinh động theo thời gian thực và xoay vòng tự động không cần khởi động lại ứng dụng)."
    ],
    flow: [
      {
        step: "1. Secret & SAST Gate (Quét khóa lộ & Phân tích mã nguồn tĩnh)",
        detail: "Ngay khi đẩy nhánh code, `Gitleaks` quét lịch sử commit chặn mật khẩu/private key, tiếp theo `SonarQube + Semgrep` kiểm tra lỗi bảo mật OWASP, SQLi và quy tắc tiền tệ `BigDecimal`."
      },
      {
        step: "2. SCA, SBOM & Hardened Build (Kiểm định chuỗi cung ứng thư viện)",
        detail: "Xuất danh mục linh kiện phần mềm `CycloneDX SBOM`, dùng `Trivy` quét cả thư viện Maven lẫn gói hệ điều hành trong Docker Image; chặn đứng nếu có lỗi `CRITICAL / HIGH`."
      },
      {
        step: "3. Image Signing & GitOps Admission (Ký số và Kiểm duyệt cửa cụm)",
        detail: "Ký mật mã lên mã băm `Image Digest (@sha256:...)` bằng `Cosign`; trên cụm K8s, `Kyverno` kết hợp `ArgoCD` chỉ cho phép chạy các Image đã có chữ ký hợp lệ của ngân hàng."
      },
      {
        step: "4. Runtime Vault Dynamic Secrets (Cấp phát tài khoản DB tự hủy)",
        detail: "Khi Pod khởi chạy, `Vault Agent` dùng danh tính K8s xin Vault tạo nóng một cặp `username/password` PostgreSQL có thời hạn 24h và tự động gia hạn/xoay vòng ngầm."
      }
    ],
    sections: [
      {
        heading: "1. Kiến trúc Đường ống DevSecOps 6 Chặng & Kỷ luật Phân tách Nhiệm vụ (SoD) trong Ngân hàng",
        paragraphs: [
          "Triết lý cốt lõi của DevSecOps hiện đại là **Shift-Left Security**: đưa toàn bộ rào chắn bảo mật dịch chuyển về phía trái — ngay tại bàn phím lập trình viên và lúc mở Merge Request — khi chi phí sửa một lỗi bảo mật chỉ tốn 5 phút thay vì tốn hàng trăm triệu đồng khắc phục sự cố trên Production. Trong môi trường tài chính, các chốt chặn này không được cấu hình ở chế độ 'cảnh báo cho vui' (`allow_failure: true`), mà bắt buộc đóng vai trò **Hard Quality Gate** trả mã thoát khác `0` để khóa cứng nút Merge nếu vi phạm.",
          "Ngoài các công cụ quét phổ quát như `SonarQube` và `Trivy`, những đội ngũ Kiến trúc Ngân hàng xuất sắc còn viết bộ luật **Custom Semgrep Rules** riêng cho tổ chức mình: ví dụ tự động báo đỏ pipeline nếu phát hiện bất kỳ ai gọi `new BigDecimal(double)`, thiếu `@Transactional(rollbackFor = Exception.class)` ở tầng Ledger, dùng `Logger` in trực tiếp đối tượng `CardRequest` chưa qua Masking, hoặc mở `@CrossOrigin(\"*\")` trên Controller! Đồng thời, để tuân thủ nghiêm ngặt nguyên tắc **Separation of Duties (Phân tách nhiệm vụ)** của kiểm toán NHNN và PCI-DSS, người viết code tuyệt đối không có quyền tự bấm nút triển khai thẳng lên Production; mọi bản phát hành đều đi qua kho cấu hình GitOps độc lập với phê duyệt kép và truy vết đầy đủ."
        ],
        bullets: [
          "Chặn rò rỉ Secret từ trong trứng nước (`Gitleaks`): Quét toàn bộ biểu thức chính quy và độ hỗn loạn chuỗi (`Entropy`) trên lịch sử Git diff để bắt giữ API Key, JWT Secret, RSA Private Key trước khi lọt vào nhánh chính; nhớ rằng nếu đã lỡ đẩy khóa thật lên Git, xóa ở commit sau là VÔ NGHĨA — bắt buộc phải thu hồi và xoay khóa mới (`Revoke & Rotate`) ngay lập tức!",
          "Quản trị chuỗi cung ứng phần mềm (`Nexus Firewall + SBOM`): Máy chủ build CI trong ngân hàng không bao giờ kéo thư viện trực tiếp từ Internet công cộng mà phải đi qua kho nội bộ `Nexus / Artifactory` đã duyệt an toàn, đồng thời sinh hồ sơ `SBOM (Software Bill of Materials)` để khi thế giới công bố lỗ hổng Zero-day mới, ngân hàng biết chính xác trong 30 giây những dịch vụ nào đang chứa thư viện đó.",
          "Triển khai bất biến theo `Image Digest` và Ký số `Cosign`: Tuyệt đối cấm dùng nhãn `:latest` hay ghi đè lại tag cũ (`1.0.0`); Production chỉ tham chiếu tới định danh bất biến `image@sha256:...` đã được ký số mật mã bởi pipeline chính chủ."
        ]
      },
      {
        heading: "2. Sự thật về Kubernetes Secret (Base64) & Sức mạnh của HashiCorp Vault",
        paragraphs: [
          "Một hiểu lầm chết người mà nhiều bạn mới làm K8s hay mắc phải là nghĩ rằng đối tượng `kind: Secret` của Kubernetes đã được mã hóa an toàn nên cứ vô tư lưu file `secret-prod.yaml` lên kho Git! Sự thật là chuỗi giá trị trong K8s Secret chỉ được mã hóa định dạng **Base64** — tức là bất kỳ ai chạy lệnh `echo '...' | base64 -d` trong 1 giây đều đọc rõ mồn một mật khẩu gốc! Ngay cả khi quản trị viên bật thêm `Encryption at Rest` cho cơ sở dữ liệu `etcd` của cụm K8s, việc quản lý hàng trăm mật khẩu tĩnh nằm rải rác và phải đổi mật khẩu định kỳ 90 ngày bằng tay cho 80 microservices vẫn là cơn ác mộng vận hành dễ gây sập hệ thống nhất.",
          "Giải pháp chuẩn mực tại các ngân hàng lớn là tích hợp **HashiCorp Vault**. Thay vì phát mật khẩu chung cho con người cầm, mỗi dịch vụ trên K8s được gán một tài khoản định danh riêng (`ServiceAccount`, ví dụ `core-ledger-sa`). Khi Pod khởi động, nó gửi chiếc JWT ngắn hạn của `ServiceAccount` đó sang Vault qua kênh TLS; Vault hỏi ngược lại Kubernetes `TokenReview API` để xác minh 'Đúng là Pod `core-ledger` đang chạy ở namespace `payment-prod` thật không?'. Sau khi xác thực danh tính không cần mật khẩu mồi (`Zero Secret Zero`), Vault chỉ cấp quyền đọc đúng nhánh bí mật mà dịch vụ đó được phép chạm tới."
        ],
        bullets: [
          "Hai mô hình tích hợp phổ biến nhất: (1) **Vault Agent Injector (Sidecar/Init)** tự động kết xuất bí mật vào ổ đĩa RAM (`tmpfs` trong bộ nhớ, không bao giờ chạm xuống ổ cứng vật lý!) dưới dạng file cấu hình để ứng dụng đọc hoàn toàn trong suốt; hoặc (2) **Spring Cloud Vault** giao tiếp trực tiếp từ tầng ứng dụng.",
          "Kiểm toán truy cập tập trung (`Vault Audit Log`): Mọi hành vi Pod nào xin đọc khóa nào vào mili-giây nào đều được Vault ghi vào nhật ký kiểm toán bất biến phục vụ đoàn thanh tra an ninh.",
          "Thu hồi khẩn cấp (`Lease Revocation`): Nếu phát hiện một cụm Pod thuộc vùng DMZ có dấu hiệu bị xâm nhập, đội SOC chỉ cần 1 lệnh thu hồi toàn bộ `Lease` của nhóm dịch vụ đó trên Vault để vô hiệu hóa quyền truy cập Database ngay tức khắc."
        ]
      },
      {
        heading: "3. Dynamic Database Secrets & Xoay vòng Mật khẩu Nóng Không Gián đoạn (Zero-Downtime Rotation)",
        paragraphs: [
          "Đỉnh cao thực sự của HashiCorp Vault không chỉ là cất giữ mật khẩu tĩnh hộ em, mà là cơ chế **Database Secrets Engine (Dynamic Secrets)**. Với mật khẩu tĩnh truyền thống, cả 10 Pod của một dịch vụ dùng chung 1 tài khoản `ledger_user` suốt cả năm — nếu lộ thông tin hoặc một cựu nhân viên nhớ mật khẩu, rủi ro kéo dài dai dẳng; mà mỗi lần đổi mật khẩu trên DB thì phải nín thở căn giờ khởi động lại ứng dụng kẻo lỗi `Authentication Failed` hàng loạt.",
          "Với Dynamic Secrets, không hề tồn tại một mật khẩu cố định nào trước đó! Mỗi khi Pod số 1 của `core-ledger` bật lên, Vault kết nối vào PostgreSQL/Oracle bằng quyền quản trị bảo mật của riêng Vault và chạy câu lệnh tạo mới tức thì một tài khoản độc nhất: `CREATE ROLE \"v-k8s-ledger-a9f3x\" WITH LOGIN PASSWORD '...' VALID UNTIL '2026-11-25 02:00:00' IN ROLE ledger_rw_group;`. Pod số 2 bật lên sẽ nhận một tài khoản hoàn toàn khác `v-k8s-ledger-b7k2m`! Khi thời gian thuê (`Lease TTL`) sắp hết hạn hoặc đạt ngưỡng xoay vòng 24 giờ, cơ chế làm mới sẽ xin tài khoản mới và nạp nóng vào `HikariConfigMXBean` cho các kết nối mở mới trên HikariCP mà không làm đứt bất kỳ giao dịch nào đang chạy!"
        ],
        bullets: [
          "Truy vết tận gốc từng Pod trên Database (`Per-Pod Attribution`): Khi DBA thấy một câu truy vấn bất thường trên `pg_stat_activity`, nhìn vào tên user `v-k8s-ledger-a9f3x` là đối chiếu ra ngay chính xác Pod nào trên Node nào đã phát sinh kết nối đó!",
          "Tự động dọn dẹp (`Auto-Cleanup`): Ngay khi Pod bị xóa trong lúc scale-down hoặc hết hạn `max_ttl`, Vault tự động chạy `DROP ROLE` thu hồi sạch sẽ tài khoản tạm trên Database, đạt chuẩn **Zero Standing Privileges**.",
          "Cấu hình `maxLifetime` của HikariCP ngắn hơn `Lease TTL`: Luôn đặt `spring.datasource.hikari.max-lifetime` (ví dụ `25 phút`) nhỏ hơn đáng kể so với thời hạn sống của tài khoản Vault để các kết nối cũ trong Pool được thay thế tuần tự êm ái trước thời điểm tài khoản cũ hết hiệu lực."
        ]
      }
    ],
    comparison: {
      title: "Bảng so sánh các phương thức quản trị Bí mật (Secrets Management) trên Kubernetes",
      headers: ["Phương thức lưu trữ", "Mức độ an toàn thực tế", "Khả năng Xoay vòng (Rotation)", "Đánh giá chuẩn Ngân hàng / PCI-DSS"],
      rows: [
        [
          "File `application-prod.yml` hoặc biến cứng trong Git",
          "Cực kỳ nguy hiểm; lộ vĩnh viễn trong lịch sử Git cho mọi tài khoản đọc repo",
          "Thủ công, phải build và deploy lại toàn bộ ứng dụng khi đổi mật khẩu",
          "CẤM TUYỆT ĐỐI — Vi phạm nghiêm trọng kiểm toán an ninh"
        ],
        [
          "Kubernetes `Secret` thuần túy (YAML Base64)",
          "Thấp; Base64 chỉ là mã hóa ký tự hiển thị, không phải mã hóa mật mã học",
          "Thủ công, dễ lệch pha giữa thời điểm đổi mật khẩu trên DB và cập nhật Pod",
          "Không đạt chuẩn nếu đẩy YAML thô lên Git hoặc không bật KMS Encryption cho `etcd`"
        ],
        [
          "SealedSecrets / External Secrets Operator (Static)",
          "Tốt; bản mã hóa bất đối xứng lưu Git an toàn, chỉ cụm K8s đích giải mã được",
          "Bán tự động hoặc theo chu kỳ của kho khóa đám mây, vẫn dùng chung mật khẩu tĩnh",
          "Phù hợp cho khóa API đối tác cố định hoặc chứng chỉ TLS"
        ],
        [
          "HashiCorp Vault Dynamic Secrets (`tmpfs` / Hot Reload)",
          "Tối đa (Zero-Trust); mật khẩu chỉ nằm trên RAM, riêng biệt từng Pod và tự hủy ngắn hạn",
          "Tự động hoàn toàn 100% theo giờ/ngày không gây gián đoạn dịch vụ",
          "Chuẩn mực cao nhất cho Database Core Banking, Payment Hub & hệ thống vùng CDE"
        ]
      ]
    },
    codeTitle: "Pipeline GitLab DevSecOps Quality Gate & Cấu hình Vault Dynamic PostgreSQL Secrets",
    code: [
      "# Phần 1: GitLab CI/CD chặn tự động lộ khóa, lỗi SAST & thư viện CVE cao",
      "stages: [secret-scan, verify-sast, container-sca, sign-release]",
      "",
      "gitleaks_gate:",
      "  stage: secret-scan",
      "  image: zricethezav/gitleaks:v8.18.4",
      "  script: [\"gitleaks detect --source . --verbose --redact --exit-code 1\"]",
      "",
      "sonarqube_quality_gate:",
      "  stage: verify-sast",
      "  image: eclipse-temurin:21-jdk-jammy",
      "  script:",
      "    - ./mvnw verify sonar:sonar -Dsonar.qualitygate.wait=true",
      "",
      "trivy_scan_and_cosign:",
      "  stage: container-sca",
      "  image: aquasec/trivy:0.53.0",
      "  script:",
      "    - trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 $IMAGE_DIGEST",
      "    - cosign sign --yes --key env://COSIGN_PRIVATE_KEY $IMAGE_DIGEST",
      "",
      "# Phần 2: Kubernetes Pod Annotations tiêm tài khoản DB động từ HashiCorp Vault",
      "# (Kết xuất trực tiếp lên RAM /vault/secrets/db.properties, tự xoay vòng không lộ khóa tĩnh)",
      "podAnnotations:",
      "  vault.hashicorp.com/agent-inject: \"true\"",
      "  vault.hashicorp.com/role: \"core-ledger-prod-role\"",
      "  vault.hashicorp.com/agent-inject-secret-db.properties: \"database/creds/ledger-rw\"",
      "  vault.hashicorp.com/agent-inject-template-db.properties: |",
      "    {{- with secret \"database/creds/ledger-rw\" -}}",
      "    spring.datasource.username={{ .Data.username }}",
      "    spring.datasource.password={{ .Data.password }}",
      "    {{- end -}}"
    ].join("\n"),
    codeNotes: [
      "Tham số `--redact --exit-code 1` trong `gitleaks`: Vừa chặn đứng pipeline khi phát hiện chuỗi khóa nhạy cảm, vừa che mờ chính chuỗi khóa đó trên màn hình console CI để mật khẩu không bị lộ ngược qua log của GitLab!",
      "Cờ `-Dsonar.qualitygate.wait=true`: Bắt buộc tiến trình Maven chờ máy chủ SonarQube phân tích xong và trả kết quả Quality Gate; nếu có lỗi bảo mật mới phát sinh trên phần code vừa sửa (`New Code`), pipeline tự động báo đỏ.",
      "Lệnh `trivy image ... --exit-code 1 $IMAGE_DIGEST` & `cosign sign`: Đảm bảo đúng bản ảnh nhị phân chuẩn bị lên Production sạch bóng CVE nghiêm trọng rồi mới đóng dấu chữ ký số mật mã.",
      "Nhánh `database/creds/ledger-rw` của Vault Agent: Điểm kỳ diệu nằm ở chỗ mỗi lần đọc đường dẫn này, Vault sinh nóng một cặp tài khoản PostgreSQL tạm thời gắn riêng cho Pod đó và lưu trên ổ đĩa bộ nhớ `tmpfs` `/vault/secrets/`."
    ],
    labGuide: {
      goal: "Thiết lập chốt chặn quét khóa bí mật + quét lỗ hổng ảnh bằng `Gitleaks` & `Trivy`, đồng thời chạy thử HashiCorp Vault cấp tài khoản PostgreSQL tự hủy cho dịch vụ Spring Boot.",
      steps: [
        "Bước 1: Khởi tạo một nhánh Git thử nghiệm, cố tình đặt biến giả lập khóa riêng tư RSA hoặc mật khẩu kết nối vào file cấu hình rồi chạy `docker run --rm -v ${PWD}:/repo zricethezav/gitleaks:v8.18.4 detect --source /repo --redact` để quan sát pipeline chặn lại.",
        "Bước 2: Chạy lệnh `trivy image --severity HIGH,CRITICAL finbank/payment:1.1` trên ảnh Docker đã đóng gói ở bài O1, xuất báo cáo `CycloneDX SBOM` ra file JSON để kiểm tra danh mục thư viện phụ thuộc.",
        "Bước 3: Khởi chạy `vault server -dev` cùng `postgres:16-alpine` bằng Docker Compose, kích hoạt `vault secrets enable database` và cấu hình role `ledger-rw` có `default_ttl=\"1h\"`, `max_ttl=\"24h\"`.",
        "Bước 4: Gọi `vault read database/creds/ledger-rw` hai lần liên tiếp, kiểm tra bảng `pg_roles` trong PostgreSQL để tận mắt thấy hai tài khoản độc lập vừa được tạo kèm thời điểm hết hạn `rolvaliduntil`."
      ],
      expectedOutput: "`Gitleaks` trả về `exit code 1` với giá trị nhạy cảm đã được che `REDACTED`; `Trivy` xuất danh sách kiểm định CVE rõ ràng; PostgreSQL ghi nhận các tài khoản động `v-token-ledger-rw-...` hoạt động hoàn hảo và tự động bị xóa sạch ngay khi thu hồi Lease trên Vault."
    },
    examTips: [
      "Bẫy xử lý sự cố lộ Secret trên Git: Nếu một lập trình viên lỡ commit mật khẩu DB hoặc Private Key lên kho Git nội bộ, việc `git revert` hay xóa dòng đó ở commit tiếp theo KHÔNG an toàn vì lịch sử `.git` và bản sao trên máy người khác vẫn giữ nguyên — đáp án đúng LUÔN phải bắt đầu bằng việc **Thu hồi & Xoay khóa mới (Revoke & Rotate) ngay lập tức**!",
      "Câu hỏi về loại bỏ hoàn toàn mật khẩu DB tĩnh dài hạn và truy vết từng Pod kết nối vào CSDL: Chọn ngay **HashiCorp Vault Database Secrets Engine (Dynamic Secrets)** kết hợp `Kubernetes ServiceAccount Auth`.",
      "Đừng nhầm lẫn giữa SAST và SCA: **SAST** (`SonarQube`, `Semgrep`) soi lỗi trong mã nguồn do chính đội bạn viết ra; còn **SCA** (`Trivy`, `OWASP Dependency-Check`) soi lỗ hổng `CVE` nằm trong các thư viện mã nguồn mở bên thứ ba mà bạn kéo vào `pom.xml`."
    ],
    summaryTakeaways: [
      "Bảo mật ngân hàng phải được tự động hóa từ sớm (`Shift-Left`) với các Quality Gate cứng chặn đứng lộ khóa, lỗi SAST và CVE nghiêm trọng trước khi code được gộp nhánh.",
      "Đối tượng `Secret` mặc định của Kubernetes chỉ mã hóa Base64 chứ không phải mã hóa mật mã; tuyệt đối không lưu YAML Secret dạng thô lên Git.",
      "HashiCorp Vault Dynamic Secrets triệt tiêu rủi ro lộ mật khẩu tĩnh bằng cách sinh tài khoản Database riêng cho từng Pod và tự động thu hồi sau vài giờ.",
      "Kết hợp ký số ảnh `Cosign` theo mã băm `@sha256` cùng quy trình phê duyệt GitOps độc lập đảm bảo tính toàn vẹn tuyệt đối của chuỗi cung ứng phần mềm tài chính."
    ],
    lessonQuestions: [
      {
        question: "Trong lúc rà soát Merge Request lúc 16:00, Tech Lead phát hiện một lập trình viên vừa đẩy nhầm file `partner-napas-prod.properties` chứa khóa bí mật ký HMAC thật của môi trường Production lên nhánh tính năng trên GitLab cách đó 20 phút. Quy trình ứng phó chuẩn mực nhất theo kỷ luật An toàn thông tin Ngân hàng là gì?",
        options: [
          "Bảo lập trình viên tạo thêm một commit mới xóa file đó đi rồi bấm Merge bình thường vì nhánh tính năng chưa gộp vào `main`.",
          "Coi khóa bí mật đó đã bị lộ hoàn toàn (`Compromised`): lập tức phối hợp đội Vận hành/An ninh xoay sang khóa mới và thu hồi khóa cũ trên cổng Production, sau đó xóa sạch lịch sử commit chứa khóa trên Git và bổ sung cổng chặn `Gitleaks` pre-receive/CI.",
          "Đổi tên file thành `.hidden-secret` và mã hóa nội dung sang chuỗi Base64 để không ai đọc được bằng mắt thường.",
          "Giữ nguyên khóa đó dùng tiếp đến hết quý rồi mới đổi theo lịch định kỳ để đỡ tốn công phối hợp đối tác."
        ],
        answer: 1,
        explanation: "Một khi thông tin mật đã chạm tới máy chủ Git từ xa (dù chỉ ở nhánh phụ trong 20 phút), nó đã có thể bị sao chép qua `git fetch`, lưu trong cache CI runner hoặc hệ thống backup log. Quy tắc bất di bất dịch là phải coi khóa đã lộ 100%, thực hiện Xoay & Thu hồi khóa ngay lập tức trước khi dọn lịch sử Git.",
        wrongReasons: [
          "Tạo commit xóa file chỉ ẩn file ở trạng thái `HEAD` mới nhất, bất kỳ ai gõ `git log -p` đều xem lại được nguyên vẹn toàn bộ khóa bí mật ở commit trước.",
          "",
          "Base64 không phải là mã hóa bảo mật (giải mã tốn chưa tới 1 giây) và việc khóa cũ đã từng xuất hiện dạng rõ trước đó vẫn không hề được khắc phục.",
          "Chần chừ giữ lại khóa ký giao dịch đã lộ trên môi trường thanh toán thực tế mở toang cánh cửa cho tấn công giả mạo bản tin gây thiệt hại tài chính cực lớn."
        ]
      },
      {
        question: "Khi sử dụng HashiCorp Vault Dynamic Secrets cấp tài khoản PostgreSQL có thời hạn sống (`Lease TTL`) là 2 giờ cho dịch vụ `core-ledger` dùng HikariCP, thông số nào của HikariCP cần được cấu hình phối hợp chặt chẽ để tránh lỗi rớt giao dịch khi tài khoản cũ hết hạn và bị Vault xóa khỏi Database?",
        options: [
          "Đặt `spring.datasource.hikari.max-lifetime=0` (giữ kết nối sống vĩnh viễn suốt nhiều tháng).",
          "Đặt `spring.datasource.hikari.maximum-pool-size=5000` để dự trữ thật nhiều kết nối cũ.",
          "Đảm bảo Vault Agent/Spring Cloud Vault gia hạn hoặc nạp cặp thông tin đăng nhập mới trước hạn và đặt `hikari.max-lifetime` ngắn hơn đáng kể so với `TTL` còn lại (ví dụ `20–30 phút`), kết hợp xoay thông tin trên `HikariConfigMXBean` để các kết nối trong Pool được thay mới êm ái.",
          "Tắt kiểm tra mật khẩu trên PostgreSQL (`trust authentication`) cho toàn bộ dải mạng nội bộ."
        ],
        answer: 2,
        explanation: "Để xoay vòng mật khẩu không gián đoạn (Zero-Downtime Rotation), cặp thông tin xác thực mới phải được cập nhật vào cấu hình HikariCP trước khi Lease cũ hết hạn, đồng thời `max-lifetime` ngắn giúp HikariCP chủ động nghỉ hưu tuần tự các kết nối cũ (lúc không bận giao dịch) và mở kết nối mới bằng tài khoản mới.",
        wrongReasons: [
          "Giữ kết nối sống vĩnh viễn khiến ứng dụng không chuyển sang tài khoản mới được và gặp rắc rối lớn ngay khi Database thu hồi quyền của role tạm thời đã hết hạn.",
          "Tăng pool size lên 5000 làm sập PostgreSQL do cạn kiệt tài nguyên bộ nhớ và Context Switching chứ hoàn toàn không giải quyết bài toán hết hạn tài khoản.",
          "",
          "Bật `trust` không mật khẩu trên Database Production vi phạm nghiêm trọng mọi tiêu chuẩn bảo mật ngân hàng và nguyên tắc Zero-Trust."
        ]
      }
    ]
  },

  O4: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Distributed Observability & Banking SLA)",
    codeLang: "java",
    teacherIntro: "Chào em, hãy thử đặt mình vào ca trực tối thứ Sáu lúc 20:15: tổng đài Chăm sóc khách hàng gọi dồn dập báo hàng trăm khách VIP chuyển tiền đi ngân hàng bạn bị quay vòng chờ mãi rồi báo lỗi, nhưng khi em mở màn hình giám sát máy chủ truyền thống lên thì CPU chỉ 22%, RAM 48%, ổ cứng xanh mướt, và thậm chí chỉ số **Độ trễ trung bình (Average Latency)** toàn hệ thống vẫn chỉ `95 ms`! Tại sao mọi đèn máy chủ đều xanh mà khách hàng lại đang gào thét ngoài đời thực? Bởi vì 'Monitoring phần cứng' không phải là **Observability (Khả năng quan sát thấu suốt dòng chảy nghiệp vụ)**, và con số trung bình cộng `Average` là kẻ nói dối nguy hiểm nhất trong thống kê! Trong bài học này, anh sẽ truyền lại cho em cách dựng vững chắc **3 Trụ cột Observability chuẩn Ngân hàng**: JSON Logging tự động che mờ dữ liệu nhạy cảm, Micrometer Histogram bắt tận tay độ trễ đuôi `P99`, và OpenTelemetry nối liền một sợi chỉ đỏ `traceId` xuyên suốt từ HTTP Gateway qua Kafka tới tận câu lệnh SQL trong PostgreSQL.",
    analogy: {
      title: "Phòng Hồi sức Tích cực hiện đại và Giọt thuốc cản quang phát sáng đi xuyên mạch máu",
      body: "Em hãy hình dung hệ thống 50 microservices ngân hàng giống như cơ thể con người đang vận động cường độ cao. **Metrics (Prometheus/Micrometer)** là màn hình điện tâm đồ gắn đầu giường đo nhịp tim, huyết áp `P99` theo từng giây để hú còi báo động ngay khi chỉ số vọt ngưỡng nguy hiểm — siêu nhẹ và cực nhanh nhưng chưa chỉ ra chính xác cục máu đông nằm ở nhánh tĩnh mạch nào. Khi còi hú, bác sĩ dùng **Distributed Tracing (OpenTelemetry)** — giống hệt tiêm một giọt thuốc cản quang gắn mã số định danh `traceId` vào dòng máu của đúng bệnh nhân đó, chụp chiếu thấy ngay giọt máu đi qua Tim (API Gateway) mất `4ms`, qua Phổi (Fraud Check) mất `12ms`, đẩy vào ống dẫn Kafka mất `5ms`, nhưng bị tắc nghẽn đứng im `14.800ms` ngay tại cửa Gan (Adapter gọi đối tác ngân hàng X)! Cuối cùng, bác sĩ bấm thẳng vào điểm tắc nghẽn đó để đọc **Structured Logs (JSON + MDC)** — tức hồ sơ bệnh án chi tiết từng dòng xét nghiệm của đúng mã `traceId` ấy, với số CCCD và số thẻ của bệnh nhân đã được dán băng đen bảo mật kín kẽ!"
    },
    objectives: [
      "Thiết lập hệ thống **Structured JSON Logging** gắn tự động ngữ cảnh `traceId` / `spanId` qua MDC, chạy bất đồng bộ không chặn luồng thanh toán và che mờ 100% thông tin định danh/thẻ (`PAN`, `CVV`, `OTP`, `CCCD`).",
      "Làm chủ phương pháp đo lường **RED Metrics** trên Micrometer/Prometheus, sử dụng `Percentile Histogram (P95 / P99)` thay cho số trung bình và phòng tránh triệt để thảm họa nổ bộ nhớ **High-Cardinality Tags**.",
      "Triển khai **OpenTelemetry Context Propagation** chuẩn `W3C TraceContext` nối mạch không đứt đoạn qua lời gọi HTTP, Java 21 Virtual Threads và cả luồng bất đồng bộ **Transactional Outbox → Apache Kafka**."
    ],
    flow: [
      {
        step: "1. Ingress Trace Initiation (Khởi tạo hoặc kế thừa W3C TraceContext)",
        detail: "Tại API Gateway, yêu cầu chuyển tiền được gán mã `traceparent (00-traceId-spanId-01)` chuẩn W3C và tự động đẩy vào `SLF4J MDC` của mọi luồng xử lý."
      },
      {
        step: "2. Business RED Metrics & SLO Histogram (Đo lường nghiệp vụ thời gian thực)",
        detail: "Micrometer ghi nhận bộ đếm thành công/thất bại và phân phối thời gian phản hồi vào các rổ `SLO Buckets` để Grafana tính chính xác độ trễ `P95 / P99` theo từng mã ngân hàng đích."
      },
      {
        step: "3. Async & Kafka Trace Propagation (Truyền ngữ cảnh xuyên qua hàng đợi)",
        detail: "Khi lưu `Outbox Event` hoặc bắn bản tin lên Kafka, header `traceparent` được đính kèm theo gói tin để dịch vụ Consumer phía sau nối tiếp vào cùng một cây Trace duy nhất."
      },
      {
        step: "4. Masked JSON Correlation & Tail Sampling (Tương quan Log-Metric-Trace)",
        detail: "Log xuất chuẩn JSON đã che mờ PII kèm `traceId`; OTel Collector giữ lại 100% các Trace bị lỗi hoặc chậm quá 2 giây để đội SRE bấm từ biểu đồ Grafana nhảy thẳng sang dòng Log gốc trong 2 giây."
      }
    ],
    sections: [
      {
        heading: "1. Trụ cột 1 — Structured JSON Logging, Async Appender & Kỷ luật Che mờ PII/PCI",
        paragraphs: [
          "Trên máy cá nhân của lập trình viên, những dòng log văn bản tự do nhiều dòng kiểu `2026-11-24 INFO Chuyen tien thanh cong cho TK 1903888999 so tien 5000000` trông rất thuận mắt. Nhưng trên Production quy mô 100 Pod đổ về cụm OpenSearch / Elasticsearch hàng tỷ dòng mỗi ngày, log văn bản thô là cơn ác mộng: một ngoại lệ Java dài 60 dòng bị cắt vụn thành 60 bản ghi rời rạc, còn việc viết biểu thức chính quy (`Grok Regex`) để bóc tách số tiền hay mã ngân hàng vừa ngốn sạch CPU của cụm Log vừa gãy vụn ngay khi ai đó sửa một dấu phẩy trong câu thông báo!",
          "Chuẩn mực bắt buộc trong ngân hàng là xuất thẳng định dạng **Structured JSON** ngay từ tầng ứng dụng bằng `LogstashEncoder` (hoặc `JsonWriter` tích hợp sẵn trên Spring Boot 3.4+). Mỗi sự kiện log là một đối tượng JSON phẳng trên đúng 1 dòng, tự động mang theo `@timestamp`, `service.name`, `traceId`, `spanId`, `txnRef`, `destBankBin` và toàn bộ `stack_trace` gom gọn trong một trường chuỗi duy nhất. Đồng thời, để việc ghi log giờ cao điểm không bao giờ làm khựng luồng hạch toán khi ổ đĩa container bị nghẽn, ta bọc luồng xuất bằng `AsyncAppender` với hàng đợi bộ nhớ đệm an toàn."
        ],
        bullets: [
          "Che mờ dữ liệu nhạy cảm tự động ở tầng Encoder (`MaskingJsonGeneratorDecorator`): Không bao giờ tin tưởng 100% vào trí nhớ của lập trình viên; hãy cài đặt bộ lọc tự động nhận diện số thẻ 16 số (`PAN` chỉ giữ 6 đầu – 4 cuối `970422******1234`), xóa trắng hoàn toàn `cvv`, `pin`, `otp`, `password`, `Authorization` header ngay trước khi JSON được ghi ra `stdout`.",
          "Ghi ra `stdout` thay vì file nội bộ trong Container: Theo triết lý 12-Factor trên Kubernetes, ứng dụng chỉ xuất JSON ra luồng chuẩn `Console (stdout)` để DaemonSet `Fluent Bit / Vector` trên từng Node thu thập tập trung mà không làm đầy ổ cứng của Pod.",
          "Phân cấp mức độ Log thông minh: Môi trường Production mặc định để mức `INFO` cho các cột mốc trạng thái giao dịch (Nhận lệnh → Đặt Hold → Gọi đối tác → Kết quả cuối), tuyệt đối không bật `DEBUG` của Hibernate SQL hay HTTP Wire toàn cục gây lộ dữ liệu và nghẽn I/O."
        ]
      },
      {
        heading: "2. Trụ cột 2 — Micrometer Metrics: Cái bẫy 'Độ trễ Trung bình' & Thảm họa High-Cardinality",
        paragraphs: [
          "Hãy làm một phép toán đơn giản để thấy tại sao **Average Latency** lại đánh lừa cả phòng vận hành: giả sử trong 1 giây có `99` khách hàng truy vấn số dư siêu nhanh chỉ mất `10 ms`, nhưng có `1` vị Giám đốc doanh nghiệp thực hiện chuyển khoản lô lương bị kẹt khóa chờ tới `10.000 ms (10 giây)`. Nếu tính trung bình cộng: `(99 × 10 + 10.000) / 100 = 109.9 ms` — con số `110 ms` nhìn quá đẹp trên Dashboard khiến không một ai mảy may nghi ngờ rằng cứ 100 giao dịch lại có 1 giao dịch tệ hại tới mức khách sắp đập điện thoại! Đó là lý do SRE Ngân hàng luôn cam kết SLA trên **Phân vị thứ 95 và 99 (`P95` / `P99` Latency)** — ví dụ: `99% giao dịch chuyển tiền nội bộ phải hoàn tất dưới 300ms`.",
          "Tuy nhiên, khi gắn nhãn (`Tags / Labels`) cho các bộ đếm `Counter` và đồng hồ `Timer` của Micrometer để xuất sang Prometheus, có một quả bom hẹn giờ mang tên **High-Cardinality Explosion (Bùng nổ số lượng chuỗi thời gian)**. Trong Prometheus, mỗi tổ hợp giá trị khác nhau của các nhãn sẽ sinh ra một chuỗi thời gian (`Time-Series`) riêng biệt nằm thường trực trên RAM của máy chủ Prometheus. Nếu lập trình viên ngây thơ gắn nhãn `.tag(\"accountId\", req.accountNo())` hay `.tag(\"txnId\", req.txnId())` cho 5 triệu khách hàng, hệ thống sẽ đẻ ra hàng chục triệu Time-Series làm nổ tung bộ nhớ `OutOfMemory` của cụm Prometheus chỉ sau chưa đầy 30 phút!"
        ],
        bullets: [
          "Quy tắc sắt về Nhãn (`Low-Cardinality Only`): CHỈ gắn nhãn cho các tập hợp hữu hạn ít phần tử (dưới vài chục giá trị) như `channel` (`MOBILE`, `WEB`, `COUNTER`), `destBankBin` (~50 mã ngân hàng), `status` (`SUCCESS`, `FAILED`, `TIMEOUT`) và `errorCode` chuẩn hóa (`INSUFFICIENT_FUNDS`, `PARTNER_TIMEOUT`). Mọi định danh chi tiết như `accountId`, `cif`, `txnId` phải để dành cho **Log** và **Span Attributes** của Tracing!",
          "Bật `publishPercentileHistogram()` và `serviceLevelObjectives(...)`: Giúp Prometheus dùng hàm `histogram_quantile(0.99, sum(rate(..._bucket[5m])) by (le))` để gộp và tính chính xác `P99` xuyên suốt hàng chục Pod cùng chạy song song (điều mà Client-side Percentiles không bao giờ cộng gộp toán học đúng được!).",
          "Giám sát cả chỉ số Nghiệp vụ song hành cùng Kỹ thuật: Đừng chỉ đo HTTP 200/500 — hãy đếm số tiền/số lượng giao dịch rơi vào trạng thái nghi vấn `PENDING_RECONCILIATION` để phát hiện sớm lỗi đối tác trước khi khách hàng kịp gọi tổng đài."
        ]
      },
      {
        heading: "3. Trụ cột 3 — OpenTelemetry nối vết Đầu-Cuối (`HTTP → Outbox → Kafka → DB`) & Tail Sampling",
        paragraphs: [
          "Với Spring Boot 3 kết hợp `Micrometer Tracing Bridge OpenTelemetry` (hoặc `OpenTelemetry Java Agent`), các lời gọi đồng bộ như `RestClient`, `WebClient`, `Spring MVC` và `JDBC` được tự động đính kèm header chuẩn quốc tế `traceparent: 00-<32-hex-traceId>-<16-hex-spanId>-01`. Nhờ vậy, khi yêu cầu đi qua 4 microservices liên tiếp, cả 4 dịch vụ dùng chung một `traceId` duy nhất. Nhưng điểm gãy phổ biến nhất trong kiến trúc Ngân hàng lại nằm ở **Transactional Outbox Pattern**: dịch vụ A lưu bản ghi vào bảng `outbox_events` rồi kết thúc HTTP request; vài chục mili-giây sau, tiến trình Relay hoặc Debezium mới đọc bảng đó đẩy sang Kafka cho dịch vụ B xử lý!",
          "Nếu bảng `outbox_events` không lưu lại ngữ cảnh Trace lúc ghi DB, dịch vụ B phía sau sẽ tạo ra một `traceId` mới hoàn toàn tách rời, làm đứt đôi bức tranh điều tra sự cố! Kiến trúc sư dày dạn luôn thêm cột `traceparent` (hoặc `headers jsonb`) ngay trong bảng `outbox_events` để lúc đẩy ra Kafka Header, OpenTelemetry Consumer ở đầu bên kia khôi phục lại ngữ cảnh cha (`Parent Span / Link`) liền mạch 100% từ lúc khách bấm nút trên điện thoại cho tới lúc tin nhắn biến động số dư được gửi đi."
        ],
        bullets: [
          "Bối cảnh với Java 21 Virtual Threads & Executor tùy chỉnh: Khi tự tạo `ExecutorService` tách luồng tính toán song song, nhớ bọc bằng `ContextExecutorService.wrap(...)` của Micrometer Context Propagation để `MDC` và `traceId` không bị rớt mất khi nhảy sang luồng con.",
          "Chiến lược Lấy mẫu Thông minh ở Đuôi (`Tail-Based Sampling` tại OTel Collector): Ở tải 10.000 TPS, lưu 100% mọi Trace thành công rất tốn dung lượng lưu trữ Tempo/Jaeger; cấu hình `Tail Sampling` trên tầng Collector giúp giữ lại **100% các Trace bị lỗi hoặc có độ trễ > 2.000ms**, trong khi chỉ lưu mẫu đại diện `5%–10%` các giao dịch bình thường nhanh gọn.",
          "Liên kết `Exemplars` từ Metric sang Trace: Micrometer tự động gắn mẫu `traceId` tiêu biểu ngay vào cột Histogram vượt ngưỡng `P99`, cho phép kỹ sư trực ca bấm chuột thẳng vào đỉnh nhọn trên đồ thị Prometheus/Grafana để mở ngay cây Trace của chính giao dịch bị chậm đó!"
        ]
      }
    ],
    comparison: {
      title: "Bảng phân vai 3 Trụ cột Observability & Giới hạn Dữ liệu trong Hệ thống Ngân hàng",
      headers: ["Trụ cột", "Trả lời câu hỏi gì?", "Dữ liệu ĐƯỢC PHÉP gắn vào", "Dữ liệu CẤM gắn vào (Bẫy nghiêm trọng)"],
      rows: [
        [
          "Metrics (Micrometer / Prometheus)",
          "Hệ thống có đang khỏe và đạt SLA không? Tỷ lệ lỗi hay độ trễ `P99` đang vọt lên ở đâu?",
          "Nhãn hữu hạn ít giá trị (`destBank`, `channel`, `status`, `errorCode`), bộ đếm & `Histogram` buckets",
          "CẤM gắn `accountId`, `userId`, `txnId`, `IP` vào Tag vì gây nổ RAM `High-Cardinality` sập Prometheus!"
        ],
        [
          "Distributed Tracing (OpenTelemetry / Tempo)",
          "Một giao dịch cụ thể đã đi qua những dịch vụ nào và bị nghẽn chính xác bao nhiêu ms ở chặng nào?",
          "`traceId`, `spanId`, tên API/Topic/SQL chuẩn hóa, mã tham chiếu giao dịch `banking.txn.ref`",
          "CẤM gắn số thẻ `PAN`, `CVV`, `PIN`, `OTP` hoặc nội dung JSON body nhạy cảm chưa che mờ vào Span"
        ],
        [
          "Structured Logs (JSON + MDC / OpenSearch)",
          "Chi tiết sự kiện nghiệp vụ và nguyên nhân ngoại lệ cụ thể tại thời điểm lỗi là gì?",
          "JSON 1 dòng kèm `traceId`, mã lỗi nghiệp vụ, số thẻ đã che `970422******1234`, stacktrace đầy đủ",
          "CẤM in log văn bản tự do rối rắm không có `traceId` hoặc lộ thông tin định danh cá nhân (PII) dạng rõ"
        ],
        [
          "Sự kết hợp (Correlation & Exemplars)",
          "Làm sao tìm ra căn nguyên sự cố trong dưới 60 giây thay vì mò kim đáy bể?",
          "Cảnh báo nổ từ Metric `P99` → Bấm `Exemplar` mở `Trace` thấy điểm nghẽn → Lọc toàn bộ `JSON Log` theo `traceId`",
          "Xây 3 công cụ rời rạc không dùng chung `traceId` khiến lúc sự cố vẫn phải ngồi đoán mò theo giờ giấc"
        ]
      ]
    },
    codeTitle: "Đo lường Giao dịch Chuyển tiền Chuẩn Ngân hàng với Micrometer P99 Histogram, OTel Span & Masked MDC",
    code: [
      "package vn.finbank.payment.telemetry;",
      "import io.micrometer.core.instrument.*;",
      "import io.micrometer.tracing.*;",
      "import org.slf4j.*;",
      "import org.springframework.stereotype.Component;",
      "import java.time.Duration;",
      "import java.util.function.Supplier;",
      "",
      "@Component",
      "public class NapasTransferTelemetry {",
      "    private static final Logger log = LoggerFactory.getLogger(NapasTransferTelemetry.class);",
      "    private final MeterRegistry registry;",
      "    private final Tracer tracer;",
      "",
      "    public NapasTransferTelemetry(MeterRegistry registry, Tracer tracer) {",
      "        this.registry = registry;",
      "        this.tracer = tracer;",
      "    }",
      "",
      "    public <T> T observeTransfer(String txnRef, String destBankBin, String channel, Supplier<T> action) {",
      "        Timer.Sample sample = Timer.start(registry);",
      "        String outcome = \"SUCCESS\";",
      "        Span span = tracer.currentSpan();",
      "        if (span != null) span.tag(\"banking.txn.ref\", txnRef).tag(\"banking.dest_bin\", destBankBin);",
      "        try (MDC.MDCCloseable ignored = MDC.putCloseable(\"txnRef\", txnRef)) {",
      "            return action.get();",
      "        } catch (RuntimeException ex) {",
      "            outcome = ex.getClass().getSimpleName();",
      "            if (span != null) span.error(ex);",
      "            log.error(\"NAPAS transfer failed destBin={} channel={}\", destBankBin, channel, ex);",
      "            throw ex;",
      "        } finally {",
      "            sample.stop(Timer.builder(\"banking.napas.transfer.duration\")",
      "                .tag(\"dest_bank\", destBankBin).tag(\"channel\", channel).tag(\"outcome\", outcome)",
      "                .publishPercentileHistogram()",
      "                .serviceLevelObjectives(Duration.ofMillis(200), Duration.ofMillis(800), Duration.ofSeconds(3))",
      "                .register(registry));",
      "        }",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Tách bạch nơi đặt dữ liệu định danh cao (`txnRef`): `txnRef` tuyệt đối KHÔNG được đưa vào `.tag(...)` của `Timer.builder` (để bảo vệ Prometheus khỏi High-Cardinality), mà được gắn vào `span.tag(\"banking.txn.ref\", txnRef)` và `MDC.putCloseable` phục vụ tra cứu Trace/Log!",
      "Cấu hình `.publishPercentileHistogram()` kèm `.serviceLevelObjectives(200ms, 800ms, 3s)`: Tạo sẵn các mốc rổ thời gian sát với SLA thực tế của chuyển tiền nhanh 24/7 giúp tính chuẩn xác tỷ lệ giao dịch đạt cam kết (`Apdex / SLO Burn Rate`) và phân vị `P99` xuyên nhiều Pod.",
      "Sử dụng `MDC.putCloseable(\"txnRef\", txnRef)` trong khối `try-with-resources`: Tự động dọn sạch khóa `txnRef` khỏi biến luồng ngay khi hàm kết thúc, ngăn chặn triệt để lỗi rò rỉ thông tin giao dịch cũ sang request tiếp theo khi tái sử dụng luồng trong Thread Pool.",
      "Đặt `sample.stop(...)` trong khối `finally`: Đảm bảo cả giao dịch thành công lẫn giao dịch ném ngoại lệ Timeout đều được đo đếm trọn vẹn thời gian thực thi và phân loại theo nhãn `outcome`."
    ],
    labGuide: {
      goal: "Dựng bộ quan sát toàn trình cho dịch vụ Chuyển tiền với JSON Log + Prometheus Histogram `P99` + OpenTelemetry nối vết từ REST API sang Kafka Consumer và viết luật cảnh báo tức thì khi lỗi vượt ngưỡng.",
      steps: [
        "Bước 1: Cấu hình `logstash-logback-encoder` xuất log JSON ra Console tự động đính kèm `traceId`, `spanId` từ MDC, đồng thời cài đặt bộ lọc Regex che mờ chuỗi 16 chữ số thẻ thành dạng `6 đầu ****** 4 cuối`.",
        "Bước 2: Tích hợp `NapasTransferTelemetry` bọc quanh API chuyển tiền, giả lập kịch bản cứ 20 giao dịch nhanh (`40ms`) lại có 1 giao dịch tới mã ngân hàng `970499` bị chậm `4.500ms`.",
        "Bước 3: Mở giao diện Prometheus/Grafana so sánh hai công thức: độ trễ trung bình `rate(_sum)/rate(_count)` (~260ms trông rất bình thường) so với `histogram_quantile(0.99, ...)` (vọt thẳng lên ~4.5s bóc trần ngay sự cố!).",
        "Bước 4: Đẩy sự kiện giao dịch qua Kafka sang dịch vụ `notification-worker`, kiểm tra trên Jaeger / Grafana Tempo thấy cả Span HTTP đầu vào lẫn Span Kafka Consumer phía sau nằm gọn trên cùng một cây `traceId` duy nhất."
      ],
      expectedOutput: "Log Console xuất chuẩn JSON 1 dòng không lộ số thẻ thật; biểu đồ Grafana hiển thị rõ sự phân kỳ giữa `Avg` và `P99` theo từng `dest_bank`; cây Trace trên Tempo nối liền mạch `POST /transfers` → `Kafka publish` → `Kafka consume`."
    },
    examTips: [
      "Khi gặp bài toán 'Dashboard báo Average Latency rất thấp (80ms) nhưng khách hàng phàn nàn ứng dụng thường xuyên quay vòng 10–15 giây': Đáp án chuẩn luôn là chuyển sang theo dõi và cảnh báo theo **Tail Latency Percentiles (`P95`, `P99`, `P99.9`)** bằng `Histogram`!",
      "Bẫy phỏng vấn kinh điển về Prometheus: Nếu thấy đoạn code gắn `.tag(\"userId\", id)` hoặc `.tag(\"transactionId\", txId)` vào Micrometer Metric, hãy chỉ ra ngay lỗi **High-Cardinality Explosion** làm cạn sạch RAM của hệ thống giám sát.",
      "Muốn nối vết OpenTelemetry không bị đứt đoạn khi áp dụng **Transactional Outbox Pattern**: Bắt buộc phải lưu kèm chuỗi ngữ cảnh `traceparent` vào bản ghi Outbox trong CSDL và đính lại vào Kafka Record Header lúc phát bản tin đi."
    ],
    summaryTakeaways: [
      "Observability chuẩn ngân hàng đứng vững trên 3 chân kiềng gắn kết chặt chẽ bằng `traceId`: Metrics phát hiện triệu chứng tức thời, Tracing khoanh vùng chính xác điểm nghẽn và JSON Logs giải thích nguyên nhân gốc rễ.",
      "Luôn đo cam kết chất lượng dịch vụ (SLA/SLO) bằng phân vị `P95 / P99` qua `Histogram` thay vì tin vào con số trung bình cộng `Average` đầy cạm bẫy.",
      "Chỉ đưa các thuộc tính ít giá trị biến thiên (`Low-Cardinality`) vào nhãn Prometheus; mọi mã định danh giao dịch hay tài khoản phải đặt ở Span và MDC Log (sau khi đã che mờ PII/PCI).",
      "Sử dụng `Tail-Based Sampling` tại tầng Collector giúp giữ lại 100% bằng chứng của mọi giao dịch lỗi/chậm mà vẫn tiết kiệm 90% chi phí hạ tầng lưu trữ Trace."
    ],
    lessonQuestions: [
      {
        question: "Một lập trình viên muốn thống kê thời gian xử lý chuyển tiền cho từng khách hàng nên đã viết code Micrometer: `registry.timer(\"transfer.time\", \"accountNo\", req.getFromAccount(), \"txnId\", req.getTxnId()).record(duration);` rồi triển khai lên cụm Production phục vụ 3 triệu khách hàng hoạt động mỗi ngày. Hậu quả nghiêm trọng nào sẽ xảy ra đầu tiên?",
        options: [
          "Prometheus tự động tối ưu hóa và vẽ được biểu đồ riêng cực đẹp cho cả 3 triệu tài khoản mà không tốn thêm tài nguyên.",
          "Xảy ra thảm họa bùng nổ chuỗi thời gian (`High-Cardinality Explosion`): mỗi giao dịch mới tạo ra một Time-Series riêng biệt trên bộ nhớ của cả JVM lẫn máy chủ Prometheus, làm tràn RAM gây sập hệ thống giám sát và tăng tải GC dữ dội trên ứng dụng.",
          "Câu lệnh SQL trong PostgreSQL bị khóa bảng `accounts`.",
          "Micrometer tự động xóa hết tất cả các nhãn có độ dài trên 5 ký tự."
        ],
        answer: 1,
        explanation: "Trong hệ thống Metric dạng Time-Series như Micrometer/Prometheus, mỗi tổ hợp nhãn độc nhất được duy trì như một đối tượng Meter riêng trong bộ nhớ. Đưa `accountNo` và đặc biệt là `txnId` (mỗi giao dịch một mã mới không bao giờ lặp lại) vào Tag sẽ sinh ra hàng chục triệu Time-Series làm nổ tung bộ nhớ của cả App lẫn Prometheus Server.",
        wrongReasons: [
          "Cơ sở dữ liệu chuỗi thời gian (TSDB) được thiết kế để tổng hợp theo chiều phân loại nhỏ, hoàn toàn không thể gánh hàng chục triệu nhãn rời rạc mà không cạn kiệt RAM.",
          "",
          "Việc ghi nhận Metric trên bộ nhớ Micrometer không trực tiếp phát sinh khóa bảng trong PostgreSQL.",
          "Micrometer không hề tự động cắt xóa nhãn theo độ dài ký tự trừ khi quản trị viên chủ động cấu hình `MeterFilter.maximumAllowableTags` để phòng vệ."
        ]
      },
      {
        question: "Trong hệ thống Core Payment áp dụng Transactional Outbox Pattern (API chuyển tiền ghi bút toán và sự kiện vào bảng `outbox_events` trong PostgreSQL, sau đó một tiến trình Relay riêng đọc bảng này đẩy lên Kafka cho dịch vụ Đối soát và Thông báo tiêu thụ), làm thế nào để giữ nguyên một `traceId` xuyên suốt từ lúc khách bấm nút trên App tới lúc dịch vụ tiêu thụ Kafka xử lý xong?",
        options: [
          "Không thể nối vết qua bảng Database trung gian được, bắt buộc phải bỏ Outbox Pattern và gọi đồng bộ REST trực tiếp.",
          "Trích xuất ngữ cảnh `W3C traceparent` hiện hành lúc ghi giao dịch lưu kèm vào cột metadata của bảng `outbox_events`, sau đó tiến trình Relay đính kèm lại `traceparent` đó vào Kafka Record Header để OpenTelemetry phía Consumer khôi phục đúng Trace gốc.",
          "Đặt cố định một chuỗi `traceId = \"0000000000000001\"` giống hệt nhau cho toàn bộ mọi giao dịch trong ngày.",
          "Dùng thời gian đồng hồ hệ thống làm khóa nối vết duy nhất giữa các dịch vụ."
        ],
        answer: 1,
        explanation: "Chuẩn `W3C TraceContext` cho phép tuần tự hóa ngữ cảnh định danh vết (`traceId` + `spanId` + cờ lấy mẫu) thành chuỗi văn bản ngắn gọn `traceparent`. Lưu chuỗi này cùng bản ghi Outbox và truyền tiếp qua Kafka Header là kiến trúc chuẩn mực giúp nối liền mạch luồng đồng bộ và bất đồng bộ.",
        wrongReasons: [
          "Bỏ Outbox Pattern để quay về gọi đồng bộ nối tiếp hoặc Dual-Write sẽ làm giảm độ tin cậy và gây nguy cơ mất sự kiện hạch toán nghiêm trọng.",
          "",
          "Dùng chung một `traceId` cố định cho mọi giao dịch khiến hàng triệu yêu cầu trộn lẫn vào nhau, làm hỏng hoàn toàn khả năng điều tra từng giao dịch riêng lẻ.",
          "Ở quy mô hàng nghìn giao dịch mỗi giây, hàng trăm giao dịch có cùng mili-giây đồng hồ (chưa kể lệch nhịp NTP giữa các máy chủ) nên không thể phân biệt chính xác giao dịch nào của ai."
        ]
      }
    ]
  },

  O5: {
    duration: "60 phút",
    difficulty: "Chuyên sâu (Production Forensics, Profiling & SRE)",
    codeLang: "bash",
    teacherIntro: "Chào em, có một khoảnh khắc phân định cực kỳ rõ ràng đẳng cấp giữa một lập trình viên Junior/Mid-level và một Senior Principal thực thụ: đó là lúc 11:45 trưa ngày cao điểm, 2 trên 10 Pod của dịch vụ Tài khoản bỗng dưng vọt **CPU 100%** hoặc đơ cứng toàn bộ các luồng HTTP không trả lời nữa! Phản xạ bản năng của người non kinh nghiệm là hoảng hốt gõ ngay `kubectl delete pod` để khởi động lại cho nhanh. Pod mới bật lên xanh trở lại, cả nhóm thở phào nhẹ nhõm — nhưng chỉ 35 phút sau, không phải 2 Pod mà cả 6 Pod tiếp tục treo cứng lặp lại y hệt, và đau đớn nhất là **toàn bộ hiện trường vụ án ở lần đầu đã bị chính tay mình xóa sạch dấu vết!** Hôm nay, anh sẽ trao cho em quy trình điều tra pháp y Production chuẩn SRE Ngân hàng: cách **Cô lập Pod khỏi bộ chia tải trong 3 giây** để cứu khách hàng ngay lập tức mà vẫn giữ sống 'nghi phạm', rồi dùng `jcmd`, bộ 3 ảnh chụp `Thread Dump`, `Eclipse MAT` và vũ khí tối thượng `Java Flight Recorder (JFR)` để bắt sống tận dòng code gây treo hoặc rò rỉ bộ nhớ!",
    analogy: {
      title: "Cảnh sát giao thông phân luồng vòng tránh và Đội pháp y thu hộp đen trước khi cẩu xe tai nạn",
      body: "Em hãy hình dung trên cao tốc 10 làn xe (10 Pods), chiếc xe ở làn số 3 bỗng dưng bốc khói chết máy đứng im giữa đường. Nếu em lập tức cho máy ủi nghiền nát chiếc xe đó đẩy xuống vực (`kubectl delete pod`) mà không kiểm tra gì, lát nữa 9 chiếc xe còn lại cùng lô sản xuất cũng sẽ nổ lốp y hệt! Ngược lại, nếu em cứ để mặc làn số 3 mở cửa chặn dòng xe phía sau để ngồi săm soi động cơ suốt nửa tiếng thì cả cao tốc kẹt cứng (khách hàng lỗi giao dịch). Quy trình chuẩn của bậc thầy điều hành là: **Bước 1 (trong 3 giây)** — Đặt chóp nón chuyển hướng toàn bộ xe sang 9 làn đang thông suốt (`kubectl label pod ...` rút Pod bệnh khỏi `Service` chia tải, khách hàng hết lỗi ngay tức thì!). **Bước 2 (trong 60 giây)** — Khi chiếc xe hỏng vẫn đang nổ máy tại khu cách ly an toàn, đội pháp y cắm máy đọc hộp đen (`JFR` + 3 tấm ảnh `Thread Dump` cách nhau 5 giây) để biết chính xác bánh răng nào bị kẹt. **Bước 3** — Thu thập đủ bằng chứng không thể chối cãi rồi mới cho xe cẩu dọn đi (`delete pod`) và vá dứt điểm lỗi thiết kế!"
    },
    objectives: [
      "Thực thi thành thạo quy trình **Isolate-Capture-Recover** trên Kubernetes: tách Pod lỗi khỏi `Service` Load Balancer ngay lập tức để bảo vệ SLA khách hàng trước khi trích xuất dữ liệu chẩn đoán.",
      "Đọc vị chính xác **Thread Dump** (3 bản chụp cách nhau 5 giây + đối chiếu mã Hex `nid=0x...` từ Linux `top -H`) để phân biệt lỗi vòng lặp CPU 100%, Deadlock, Lock Convoy và nghẽn cạn kiệt `HikariCP Pool`.",
      "Sử dụng an toàn **Java Flight Recorder (JFR)** độ phủ nhẹ `< 1.5% CPU` và **Eclipse MAT (`Dominator Tree`)** để săn lùng rò rỉ bộ nhớ hay lỗi `Virtual Thread Pinning` mà không làm sập hệ thống."
    ],
    flow: [
      {
        step: "1. Traffic Isolation (Cô lập Pod bệnh khỏi luồng giao dịch khách hàng)",
        detail: "Đổi nhãn định tuyến của Pod lỗi (ví dụ `kubectl label pod <name> app=isolated --overwrite`) để `Service` lập tức ngừng đẩy request mới vào Pod này và tự động bù Pod khỏe nếu cần."
      },
      {
        step: "2. Native-to-Java Thread Mapping (Ánh xạ luồng OS sang luồng JVM)",
        detail: "Lấy mã luồng Linux `TID` ngốn CPU cao nhất từ `top -H -p 1`, đổi sang hệ thập lục phân chữ thường (`0x1a4`) để dò trúng tên luồng và dòng code Java tại trường `nid=0x1a4`."
      },
      {
        step: "3. Multi-Snapshot Thread Dump & JFR (Thu thập chuỗi ảnh động & Hộp đen)",
        detail: "Chụp 3 bản `jcmd 1 Thread.print -l` cách nhau 5 giây để phân biệt luồng đang chạy lướt qua với luồng bị kẹt cứng thật sự, kèm 60 giây ghi hình `JFR`."
      },
      {
        step: "4. Root-Cause Analysis & Safe Recycle (Giải phẫu MAT/JMC & Dọn dẹp)",
        detail: "Đưa file `.jfr` / `.hprof` (bảo mật nghiêm ngặt theo chuẩn dữ liệu PCI) vào JDK Mission Control / Eclipse MAT tìm thủ phạm gốc, sau đó mới xóa Pod cách ly."
      }
    ],
    sections: [
      {
        heading: "1. Nghệ thuật Đọc vị Thread Dump: Quy tắc '3 Ảnh chụp 5 Giây' & Truy tìm Thủ phạm CPU 100%",
        paragraphs: [
          "Khi ứng dụng bị đơ hoặc CPU vọt kịch trần, một tấm ảnh `Thread Dump` đơn lẻ chỉ cho em thấy khoảnh khắc tĩnh tại `1 mili-giây` đó — em không thể biết một luồng đang ở trạng thái `RUNNABLE` tại hàm `JsonParser.parse()` là vì nó vừa tình cờ chạy ngang qua đó rất nhanh, hay nó đã mắc kẹt trong một vòng lặp `while` vô tận / biểu thức Regex thảm họa (`Catastrophic Backtracking ReDoS`) suốt 10 phút nay! Vì vậy, kỷ luật vàng của SRE là luôn chụp **tối thiểu 3 bản Thread Dump liên tiếp cách nhau đúng 5 giây (`t=0s, t=5s, t=10s`)**. Nếu cùng một luồng `http-nio-8080-exec-42` ở cả 3 bức ảnh đều đứng nguyên một chỗ ở dòng `ReconciliationUtil.matchRegex(line 184)` với trạng thái `RUNNABLE`, em đã bắt sống chính xác 100% dòng code đốt cháy CPU!",
          "Còn với kịch bản điển hình nhất trong Ngân hàng — **CPU rất thấp (5%) nhưng toàn bộ API quay vòng Timeout treo cứng** — khi mở Thread Dump lên, em sẽ thấy một bức tranh kinh điển: `195 luồng` xử lý request đứng xếp hàng dài dằng dặc ở trạng thái `WAITING (parking)` tại dòng `com.zaxxer.hikari.pool.HikariPool.getConnection()`. Đừng vội đổ lỗi cho Database chết! Hãy tìm ngay xem **20 luồng đang nắm giữ 20 kết nối DB kia hiện đang làm gì**: chín phần mười em sẽ bắt gặp cả 20 luồng đó đang nằm `RUNNABLE` tại `SocketInputStream.socketRead0` gọi HTTP sang một đối tác bảo hiểm/chuyển mạch chậm chạp **ngay bên trong một hàm gắn `@Transactional` chưa kết thúc** — giữ khư khư kết nối DB không nhả ra khiến toàn bộ ngân hàng tắc nghẽn dây chuyền!"
        ],
        bullets: [
          "Công thức bắt luồng ngốn CPU 100% trong 15 giây: Xem `TID` thập phân ngốn CPU nhất qua `ps -Lp 1 -o tid,pcpu` (hoặc `top -H -p 1`), đổi sang mã Hex chữ thường bằng `printf \"0x%x\\n\" <TID>`, rồi `grep` mã `nid=0x...` đó ngay trong kết quả `jcmd 1 Thread.print -l`!",
          "Phân biệt `BLOCKED` vs `WAITING`: `BLOCKED (on object monitor)` là hàng chục luồng đang đập đầu tranh giành vào một khối `synchronized` (hiện tượng **Lock Convoy**, ví dụ dùng chung một đối tượng khóa toàn cục); trong khi `WAITING` thường là luồng đang ngủ chờ tài nguyên từ Pool (HikariCP, Redis, Semaphore) hoặc chờ phản hồi `Future.get()`.",
          "Phát hiện Deadlock Java tự động: Lệnh `jcmd <pid> Thread.print -l` (cờ `-l` ghi thêm thông tin `java.util.concurrent` locks) sẽ tự động in rõ mục `Found one Java-level deadlock:` ở cuối bản dump nếu hai luồng khóa chéo nhau."
        ]
      },
      {
        heading: "2. Chẩn đoán Rò rỉ Bộ nhớ (Memory Leak) với `GC.class_histogram`, Heap Dump & Eclipse MAT",
        paragraphs: [
          "Khác với sự cố tăng tải đột biến, bệnh rò rỉ bộ nhớ (`Memory Leak`) diễn biến âm ỉ như biểu đồ hình răng cưa leo dốc: sau mỗi đợt `Major GC`, đáy biểu đồ vùng `Old Gen` không hạ về mức nền cũ mà cứ cao dần lên từng giờ cho tới khi GC chạy điên cuồng chiếm 90% CPU mà mỗi lần chỉ dọn được vài MB rồi sập! Trước khi quyết định xuất toàn bộ `Heap Dump (.hprof)`, em PHẢI nhớ một cảnh báo sống còn trên Production: lệnh `jcmd 1 GC.heap_dump` (đặc biệt khi thu gom chỉ các đối tượng còn sống `live`) sẽ gây ra một pha **Stop-The-World (STW) đóng băng toàn bộ JVM từ vài giây tới cả chục giây** trên vùng Heap 4GB–8GB!",
          "Chính vì vậy: **Bước 1**, tuyệt đối chỉ lấy Heap Dump trên chiếc Pod ĐÃ ĐƯỢC CÔ LẬP khỏi luồng giao dịch của khách hàng! **Bước 2**, nếu chỉ muốn kiểm tra nhanh lớp đối tượng nào đang chiếm nhiều bản ghi nhất mà tốn rất ít thời gian dừng, hãy dùng `jcmd 1 GC.class_histogram` trước. **Bước 3**, khi mở file `.hprof` bằng công cụ **Eclipse Memory Analyzer (MAT)**, đừng bị đánh lừa bởi cột `Shallow Heap` (dung lượng bản thân vỏ đối tượng như `ConcurrentHashMap` chỉ nặng 64 bytes), mà hãy mở ngay bảng **Dominator Tree** sắp xếp giảm dần theo **Retained Heap** (tổng dung lượng bộ nhớ sẽ được giải phóng nếu cắt bỏ nút gốc đó) rồi bấm chuột phải chọn `Path to GC Roots -> exclude all phantom/weak/soft etc. references` để thấy tận mắt biến `static` hay `ThreadLocal` nào đang găm giữ hàng triệu bản ghi!"
        ],
        bullets: [
          "Bảo mật tối mật cho file Heap Dump (Quy định PCI-DSS): File `.hprof` là bản chụp nguyên vẹn toàn bộ RAM của ứng dụng — bên trong nó chứa đầy dữ liệu nhạy cảm dạng rõ vừa đi qua bộ nhớ (thông tin khách hàng, chuỗi kết nối, token phiên)! Tuyệt đối cấm tải bừa bãi file Heap Dump Production về laptop cá nhân không kiểm soát; chỉ phân tích trên máy trạm bảo mật cách ly (`Jumpbox / Bastion`) và xóa sạch ngay sau khi kết thúc điều tra.",
          "3 thủ phạm gây Memory Leak phổ biến nhất trong Java Banking: (1) Bộ nhớ đệm tự chế bằng `static HashMap / ConcurrentHashMap` quên cài ngưỡng giới hạn kích thước và `TTL` (nên thay bằng thư viện `Caffeine`); (2) Gắn dữ liệu ngữ cảnh vào `ThreadLocal` nhưng quên gọi `.remove()` trong khối `finally`; (3) Lỗi đọc báo cáo sao kê lớn bằng `findAll()` nạp hàng triệu Entity vào Hibernate First-Level Cache (`PersistenceContext`).",
          "Đảm bảo đủ ổ đĩa cho `/dumps`: File Heap Dump có kích thước xấp xỉ dung lượng Heap đang sử dụng; luôn cấu hình volume tách riêng cho `/dumps` để khi ghi dump không làm tràn ổ đĩa gốc của Worker Node."
        ]
      },
      {
        heading: "3. Vũ khí Tối thượng Java Flight Recorder (JFR) & Săn lỗi Virtual Thread Pinning",
        paragraphs: [
          "Nếu phải chọn ra một công cụ duy nhất xứng đáng gọi là 'Hộp đen máy bay chuẩn quân sự' tích hợp sẵn ngay trong nhân OpenJDK 21 mà không cần cài thêm bất kỳ thư viện ngoài nào, đó chính là **Java Flight Recorder (JFR)**. Điều kỳ diệu của JFR là ở chế độ thu thập chuẩn, nó lấy mẫu trực tiếp từ cấu trúc nội bộ của JVM với chi phí hiệu năng siêu nhỏ (**dưới 1% – 2% CPU**), hoàn toàn an toàn để bật ghi hình trực tiếp 60–120 giây ngay trên môi trường Production đang chạy tải thực tế mà không gây đóng băng hệ thống!",
          "Chỉ với một file `prod-incident.jfr` nặng vài chục MB mở trên **JDK Mission Control (JMC)** hoặc xuất ra biểu đồ ngọn lửa **FlameGraph**, một Senior Architect nhìn thấu toàn bộ nội tạng ứng dụng trong cùng một trục thời gian: hàm nào tiêu tốn nhiều chu kỳ CPU nhất, hàm nào cấp phát rác (`Allocation Pressure / TLAB`) điên cuồng nhất làm khổ GC, câu truy vấn Socket I/O nào chờ lâu nhất, ổ khóa `Monitor` nào gây tranh chấp nhiều nhất, và đặc biệt trên **Java 21**: bắt tận tay sự kiện `jdk.VirtualThreadPinned` — chỉ ra chính xác dòng code `synchronized` nào đang ghim cứng Virtual Thread vào luồng hệ điều hành (`Carrier Thread`) gây sụt giảm thông lượng!"
        ],
        bullets: [
          "Công cụ có sẵn trong JRE hay cần Ephemeral Debug Container?: Nếu ảnh runtime JRE tối giản trên Production đã lược bỏ `jcmd`, Kubernetes hiện đại hỗ trợ lệnh `kubectl debug -it <pod> --image=eclipse-temurin:21-jdk-jammy --target=app` để gắn tạm một container công cụ dùng chung không gian tiến trình (`shareProcessNamespace`) vào chẩn đoán xong rồi gỡ ra, vừa giữ ảnh gốc siêu sạch vừa đủ đồ nghề pháp y!",
          "Đọc biểu đồ ngọn lửa (`FlameGraph`): Đừng nhìn vào chiều cao của ngọn tháp (đó chỉ là độ sâu ngăn xếp lời gọi hàm); hãy tìm những **đỉnh bằng phẳng trải rộng theo chiều ngang (`Wide Plateaus`)** ở tầng trên cùng — bề ngang càng rộng chính là nơi CPU hoặc bộ cấp phát RAM đang bị đốt nhiều thời gian nhất!",
          "Bật sẵn Continuous JFR Ring Buffer cho dịch vụ lõi: Có thể cấu hình bộ đệm vòng JFR nhẹ trong RAM (`maxage=15m, maxsize=250m`) để ngay khi xảy ra sự cố thoáng qua chỉ kéo dài 10 giây, kỹ sư vẫn trích xuất ngược lại được đúng 15 phút lịch sử vừa trôi qua bằng `JFR.dump`!"
        ]
      }
    ],
    comparison: {
      title: "Bảng chọn Công cụ Pháp y JVM trên Production theo từng Triệu chứng Sự cố",
      headers: ["Công cụ chẩn đoán", "Triệu chứng sự cố điển hình", "Tác động hiệu năng (Overhead)", "Quy tắc vận hành an toàn"],
      rows: [
        [
          "`jcmd <pid> Thread.print -l` (3 lần × 5s)",
          "API treo cứng Timeout dù CPU thấp, nghi ngờ Deadlock, kẹt HikariCP Pool hoặc 1 luồng đốt CPU 100%",
          "Rất thấp (chỉ khựng vài chục mili-giây tại SafePoint)",
          "Luôn chụp 3 bản cách nhau 5 giây và đối chiếu mã Hex `nid` từ danh sách luồng hệ điều hành"
        ],
        [
          "`jcmd <pid> JFR.start` (Java Flight Recorder)",
          "Độ trễ `P99` giật cục, GC chạy dày bất thường, nghẽn khóa ngầm hoặc nghi bị `Virtual Thread Pinning`",
          "Thấp (`~1%–2%` CPU với cấu hình `profile` trong 60 giây)",
          "Vũ khí ưu tiên số 1 trên Production Java 21 vì thu được bức tranh động toàn diện mà không gây treo dài"
        ],
        [
          "`jcmd <pid> GC.class_histogram`",
          "RAM tăng dần bất thường, cần xem nhanh Top 30 class đang chiếm nhiều bộ nhớ nhất",
          "Trung bình (nhẹ và nhanh hơn rất nhiều so với xuất toàn bộ Heap Dump)",
          "Chạy kiểm tra sơ bộ trước khi quyết định có cần lấy file Heap Dump nặng hay không"
        ],
        [
          "`jcmd <pid> GC.heap_dump` + Eclipse MAT",
          "Xác định chắc chắn bị Memory Leak, cần tìm chính xác đường dẫn `Path to GC Roots` giữ đối tượng",
          "RẤT NẶNG — Đóng băng toàn bộ JVM (STW) từ vài giây tới vài chục giây và tốn hàng GB ổ đĩa!",
          "BẮT BUỘC phải cô lập Pod khỏi `Service` chia tải trước khi chụp, và bảo mật file `.hprof` theo chuẩn PCI-DSS!"
        ]
      ]
    },
    codeTitle: "Playbook Bash Thực chiến: Cô lập Pod Lỗi khỏi Chia tải & Thu thập Trọn bộ Bằng chứng JVM trong 65 Giây",
    code: [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "",
      "POD_NAME=\"${1:?Usage: ./banking-jvm-triage.sh <pod-name> [namespace]}\"",
      "NAMESPACE=\"${2:-payment-prod}\"",
      "TS=$(date +%Y%m%d_%H%M%S)",
      "DUMP_DIR=\"/dumps/triage_${TS}\"",
      "",
      "echo \"[1/4] Cô lập Pod ${POD_NAME} khỏi K8s Service để bảo vệ giao dịch khách hàng ngay lập tức...\"",
      "kubectl label pod \"${POD_NAME}\" -n \"${NAMESPACE}\" app=isolated-forensics --overwrite",
      "sleep 3",
      "",
      "echo \"[2/4] Thu thập Top luồng OS ngốn CPU (đổi sẵn TID sang mã Hex nid=0x...) và 3 bản Thread Dump...\"",
      "kubectl exec -n \"${NAMESPACE}\" \"${POD_NAME}\" -- sh -c \"",
      "  mkdir -p ${DUMP_DIR} &&",
      "  ps -Lp 1 -o pid,tid,pcpu,comm | sort -k3 -nr | head -n 20 |",
      "    awk 'NR==1{print;next} {printf \\\"%s nid=0x%x\\\\n\\\", \\$0, \\$2}' > ${DUMP_DIR}/top_threads_hex.txt &&",
      "  for i in 1 2 3; do",
      "    jcmd 1 Thread.print -l > ${DUMP_DIR}/threaddump_\\${i}.txt;",
      "    [ \\$i -lt 3 ] && sleep 5;",
      "  done",
      "\"",
      "",
      "echo \"[3/4] Ghi hộp đen Java Flight Recorder (JFR) trong 60s & chụp bảng thống kê Class Histogram...\"",
      "kubectl exec -n \"${NAMESPACE}\" \"${POD_NAME}\" -- sh -c \"",
      "  jcmd 1 GC.class_histogram > ${DUMP_DIR}/class_histogram.txt &&",
      "  jcmd 1 JFR.start name=ProdTriage settings=profile duration=60s filename=${DUMP_DIR}/flight.jfr",
      "\"",
      "sleep 62",
      "",
      "echo \"[4/4] Hoàn tất thu thập pháp y tại ${DUMP_DIR}! Kiểm tra file trước khi thu hồi Pod cách ly.\""
    ].join("\n"),
    codeNotes: [
      "Lệnh `kubectl label pod ... app=isolated-forensics --overwrite` ở Bước 1: Thao tác cứu nguy đắt giá nhất của SRE! Vì `Service` của K8s chọn Pod theo nhãn `app: napas-ibft-service`, việc đổi nhãn giúp rút Pod bệnh ra khỏi danh sách chia tải tức thì (Deployment Controller thậm chí tự dựng thêm 1 Pod mới khỏe mạnh bù vào cho đủ `replicas: 6`!), trong khi tiến trình `PID 1` bên trong Pod bệnh vẫn giữ nguyên trạng để ta thong thả mổ xẻ.",
      "Đoạn `ps -Lp 1 ... awk '{printf ... nid=0x%x}'`: Tự động lấy 20 luồng con của tiến trình Java (`PID 1`), sắp xếp giảm dần theo `%CPU` và tính sẵn mã Hex `nid=0x...` để khớp 1-1 với tệp `threaddump_1..3.txt` mà không phải bấm máy tính tay lúc nửa đêm.",
      "Vòng lặp `for i in 1 2 3` chụp 3 lần `jcmd 1 Thread.print -l` cách nhau `5 giây`: Cung cấp chuỗi thời gian đủ rõ để phân biệt luồng bị treo cứng thật sự với luồng đang hoạt động bình thường.",
      "Kết hợp `GC.class_histogram` và `JFR.start settings=profile duration=60s`: Thu thập đầy đủ cả phân bố đối tượng bộ nhớ lẫn hồ sơ CPU/Lock/VirtualThreadPinning với tác động cực nhẹ mà chưa cần gây đóng băng STW nặng nề như full Heap Dump."
    ],
    labGuide: {
      goal: "Tự tay tái hiện sự cố cạn kiệt HikariCP Pool + 1 luồng ngốn CPU 100%, thực hành cô lập Pod và đọc Thread Dump / JFR tìm ra chính xác tên class cùng số dòng code gây lỗi.",
      steps: [
        "Bước 1: Dựng một ứng dụng Spring Boot nhỏ có HikariCP `maximum-pool-size=5` và viết một endpoint lỗi `/api/v1/buggy-report` mở `@Transactional` rồi gọi `Thread.sleep(60000)` (giả lập gọi đối tác treo mạng bên trong giao dịch DB), kèm một endpoint `/api/v1/cpu-burn` chạy vòng lặp tính toán Regex nặng.",
        "Bước 2: Bắn đồng thời 30 request vào `/api/v1/buggy-report` và 1 request vào `/api/v1/cpu-burn`, xác nhận các API tra cứu số dư thông thường khác lập tức bị treo chờ không phản hồi.",
        "Bước 3: Chạy quy trình lấy `ps/top` đổi TID sang mã Hex và chụp 3 bản `jcmd <pid> Thread.print -l` cách nhau 5 giây cùng 30 giây `JFR`.",
        "Bước 4: Mở 3 file Thread Dump tìm dòng `nid=0x...` khớp với luồng CPU cao nhất, đồng thời đếm số luồng `WAITING` tại `HikariPool.getConnection` và chỉ ra chính xác 5 luồng đang chiếm giữ kết nối DB ở dòng code nào."
      ],
      expectedOutput: "Xác định chính xác 100% số dòng code của hàm `cpuBurn` qua mã `nid=0x...` xuất hiện không đổi suốt cả 3 bản Thread Dump, đồng thời chỉ đích danh 5 luồng đang găm kết nối tại `BuggyReportController` gây nghẽn toàn bộ 25 luồng phía sau."
    },
    examTips: [
      "Câu hỏi tình huống '1 hoặc 2 Pod trên Production bị treo / CPU 100%, hành động ĐẦU TIÊN chuẩn SRE là gì?': Tuyệt đối KHÔNG chọn `Restart/Delete Pod ngay lập tức` (mất sạch bằng chứng) và cũng KHÔNG chọn `Để nguyên Pod đang nhận tải của khách rồi ngồi chụp Heap Dump 30 giây` — đáp án xuất sắc nhất luôn là **Cô lập Pod khỏi bộ chia tải (đổi label / cắt traffic), sau đó thu thập Thread Dump + JFR rồi mới thu hồi Pod**!",
      "Khi đọc Eclipse MAT điều tra Memory Leak: Luôn nhìn vào **Dominator Tree -> Retained Heap** và truy ngược **Path to GC Roots (loại trừ Weak/Soft References)** chứ không nhìn vào `Shallow Heap` đơn thuần.",
      "Để kiểm tra ứng dụng Java 21 dùng Virtual Threads có bị suy giảm hiệu năng do khối `synchronized` bọc quanh I/O hay không: Bật ghi hình **Java Flight Recorder (JFR)** và lọc sự kiện `jdk.VirtualThreadPinned`."
    ],
    summaryTakeaways: [
      "Quy tắc vàng khi xử lý Pod treo trên Production: Cô lập lưu lượng khách hàng trước (3 giây) → Thu thập hộp đen pháp y sau (60 giây) → Khởi động lại / Thu hồi cuối cùng.",
      "Không bao giờ kết luận từ 1 bản Thread Dump đơn lẻ; luôn chụp tối thiểu 3 bản cách nhau 5 giây và đối chiếu mã Hex `nid=0x...` với luồng hệ điều hành.",
      "Lệnh chụp toàn bộ `Heap Dump` gây đóng băng Stop-The-World rất nặng và chứa dữ liệu nhạy cảm trong RAM; chỉ thực hiện trên Pod đã ngắt tải và quản lý file nghiêm ngặt theo chuẩn PCI-DSS.",
      "`Java Flight Recorder (JFR)` là công cụ chẩn đoán Production mạnh mẽ và an toàn nhất trên Java 21 với chi phí dưới 2% CPU."
    ],
    lessonQuestions: [
      {
        question: "Vào lúc 10:15 sáng, cảnh báo báo hiệu 1 trong 8 Pod của dịch vụ `loan-disbursement` tăng vọt CPU lên 100% và độ trễ các yêu cầu rơi vào Pod này vọt quá 15 giây, trong khi 7 Pod còn lại vẫn hoạt động bình thường ở mức CPU 20%. Thứ tự xử lý nào sau đây thể hiện đúng nhất bản lĩnh của một Senior SRE Ngân hàng?",
        options: [
          "Chạy ngay lệnh `kubectl delete pod` trong 1 giây để xóa Pod lỗi đi cho đẹp biểu đồ, không cần lưu log hay dump gì thêm.",
          "Giữ nguyên Pod đó tiếp tục nhận 1/8 lưu lượng giải ngân của khách hàng và chạy lệnh `jcmd 1 GC.heap_dump` nặng 6GB mất 25 giây đóng băng.",
          "Lập tức đổi label của Pod lỗi để gỡ nó khỏi `Service` chia tải (7 Pod khỏe gánh toàn bộ lưu lượng khách hàng không bị lỗi nữa), sau đó trên Pod đã cách ly tiến hành lấy bảng luồng Hex + 3 bản `Thread Dump` cách nhau 5 giây + `JFR` để tìm nguyên nhân gốc trước khi xóa Pod.",
          "Khởi động lại toàn bộ cả cụm Database PostgreSQL của ngân hàng."
        ],
        answer: 2,
        explanation: "Cô lập Pod bằng cách gỡ nhãn selector giúp ngắt ngay lập tức thiệt hại cho khách hàng (RTO vài giây nhờ 7 Pod khỏe còn lại), đồng thời giữ nguyên hiện trường sống của tiến trình lỗi để trích xuất Thread Dump và JFR tìm ra dòng code gây vòng lặp vô tận, ngăn sự cố tái diễn trên toàn cụm.",
        wrongReasons: [
          "Xóa ngay Pod làm bay hơi toàn bộ trạng thái bộ nhớ và ngăn xếp luồng đang bị kẹt, khiến đội phát triển mù thông tin và sự cố chắc chắn sẽ nổ lại không báo trước.",
          "Chụp Heap Dump trực tiếp khi Pod vẫn đang nhận giao dịch của khách hàng gây đóng băng STW làm hỏng toàn bộ các lệnh giải ngân rơi vào Pod đó, hơn nữa sự cố CPU 100% cần ưu tiên xem Thread Dump + JFR trước.",
          "",
          "Khởi động lại Database khi 7/8 Pod ứng dụng vẫn đang chạy tốt là quyết định tai hại làm gián đoạn toàn bộ ngân hàng mà sai hoàn toàn nguyên nhân."
        ]
      },
      {
        question: "Khi phân tích 3 bản Thread Dump của một dịch vụ Thanh toán đang bị tê liệt (CPU chỉ 4% nhưng mọi API đều Timeout sau 30s), em thấy 180 luồng Tomcat đều dừng ở trạng thái `WAITING` tại `HikariPool.getConnection()`, còn đúng 20 luồng (bằng kích thước tối đa của HikariCP Pool) đều nằm ở trạng thái `RUNNABLE` tại `sun.nio.ch.Net.poll` bên trong hàm `PartnerHttpClient.verifyBill()` được gọi từ một phương thức Service có gắn `@Transactional`. Kết luận và hướng xử lý đúng nhất là gì?",
        options: [
          "Database bị hỏng ổ cứng nên không trả được kết nối; cần mua máy chủ Database lớn gấp 10 lần.",
          "Tăng `hikari.maximum-pool-size` từ 20 lên 2.000 để cả 180 luồng đều lấy được kết nối DB ngồi chờ đối tác chung cho vui.",
          "Lỗi thiết kế ranh giới giao dịch (`Transaction Boundary Anti-pattern`): việc gọi HTTP sang đối tác chậm bên trong `@Transactional` đã chiếm giữ toàn bộ 20 kết nối DB suốt thời gian chờ mạng; cần tách lời gọi HTTP ra ngoài phạm vi `@Transactional` và áp đặt Timeout + Bulkhead nghiêm ngặt cho `PartnerHttpClient`.",
          "Xóa hết từ khóa `@Transactional` khỏi toàn bộ hệ thống sổ cái của ngân hàng."
        ],
        answer: 2,
        explanation: "Đây là mẫu sự cố kinh điển bậc nhất trong hệ thống tài chính: kết nối CSDL là tài nguyên cực kỳ khan hiếm chỉ nên mượn trong vài mili-giây thực thi SQL. Gọi mạng sang đối tác ngoài bên trong `@Transactional` làm 20 kết nối bị giam cầm vô ích suốt hàng chục giây chờ socket, kéo sập toàn bộ các API khác trong cùng dịch vụ.",
        wrongReasons: [
          "Database hoàn toàn rảnh rỗi (không hề chạy câu SQL nặng nào), thủ phạm thực sự là ứng dụng mượn kết nối DB rồi đi chờ mạng đối tác không chịu trả về Pool.",
          "Tăng HikariCP Pool lên 2.000 cho mỗi Pod sẽ làm nổ tung giới hạn `max_connections` và bộ nhớ của PostgreSQL/Oracle ngay lập tức.",
          "",
          "Xóa bừa bãi `@Transactional` ở tầng ghi sổ cái làm mất tính nguyên tử ACID, gây lệch tiền nghiêm trọng khi xảy ra lỗi giữa chừng."
        ]
      }
    ]
  },

  O6: {
    duration: "60 phút",
    difficulty: "Kiến trúc sư Trưởng (Multi-DC HA, DR Drill & Kill-Switch)",
    codeLang: "java",
    teacherIntro: "Chào em, chúng ta đã đi tới bài học cuối cùng khép lại Học phần O — nơi em không còn nhìn hệ thống ở tầm một chiếc container hay một cụm Kubernetes đơn lẻ nữa, mà phóng tầm mắt lên **bản đồ sinh tồn của cả một Ngân hàng thương mại quy mô hàng chục triệu khách hàng**. Hãy tự hỏi: chuyện gì xảy ra nếu 14:00 chiều nay, một chiếc máy xúc công trình cắt đứt đồng thời hai tuyến cáp quang trục chính dẫn vào Trung tâm dữ liệu số 1 (DC1), hoặc hệ thống làm lạnh trung tâm của cả tòa nhà Data Center gặp sự cố khẩn cấp buộc phải sập nguồn? Với một website tin tức, nghỉ bảo trì 4 tiếng có thể chỉ mất chút quảng cáo; nhưng với Core Banking và chuyển tiền NAPAS 24/7, mất trắng dữ liệu giao dịch 15 phút gần nhất hay tê liệt nửa ngày đồng nghĩa với khủng hoảng niềm tin diện rộng và chế tài nghiêm khắc từ cơ quan quản lý! Hôm nay, anh sẽ cùng em thiết kế kiến trúc **Multi-DC (RPO ≈ 0, RTO < 15 phút)**, kịch bản **Diễn tập Chuyển đổi Dự phòng (DR Drill)** chống não chẻ đôi (`Split-Brain`), và chốt chặn sinh tử **Feature Kill-Switch** giúp ngắt khẩn cấp tính năng lỗi trên toàn ngân hàng trong dưới **5 giây** mà không cần build hay deploy lại một dòng code nào!",
    analogy: {
      title: "Máy bay thân rộng hai động cơ vượt đại dương và Dàn cầu dao ngắt khẩn cấp trong buồng lái",
      body: "Em hãy hình dung hệ thống công nghệ của một ngân hàng giống như chiếc máy bay chở 300 hành khách đang bay giữa Thái Bình Dương. Nó không bao giờ chỉ có 1 động cơ rồi cất thêm 1 động cơ dự phòng dưới khoang hành lý đợi rơi mới lôi ra lắp (`Cold Backup`), mà cả hai động cơ trái – phải (`DC1` và `DC2`) đều phải được kiểm tra nổ máy gánh tải thật sự và nối với nhau bằng van tiếp nhiên liệu chéo (`Synchronous Replication` đảm bảo không rớt một giọt dữ liệu `RPO ≈ 0`). Quan trọng nhất, định kỳ hàng quý phi hành đoàn phải thực hiện bài tập giả lập tắt thử một bên động cơ để chứng minh động cơ còn lại đủ sức nâng 100% trọng lượng máy bay bay tiếp an toàn (`DR Drill`). Và ngay trên trần buồng lái của cơ trưởng luôn có hàng công tắc cầu dao đỏ (`Feature Kill-Switch`): nếu hệ thống màn hình giải trí ở ghế hành khách bị chập điện bốc khói (một tính năng phụ như Vay nhanh tự động hay Tích điểm đổi quà bị lỗi/bị tấn công), cơ trưởng chỉ gạt nhẹ công tắc trong 1 giây để ngắt phăng điện khu giải trí, dồn 100% nguồn điện sạch bảo vệ hệ thống lái và dưỡng khí sống còn (`Core Chuyển tiền & Rút thẻ`)!"
    },
    objectives: [
      "Tính toán và phân biệt sắc bén bộ chỉ số sống còn **SLA (99.99% = tối đa 52.6 phút gián đoạn/năm)**, **RPO (Recovery Point Objective — lượng dữ liệu chấp nhận mất ≈ 0)** và **RTO (Recovery Time Objective — thời gian khôi phục dịch vụ < 15 phút)**.",
      "Thiết kế được kiến trúc **2 Trung tâm Dữ liệu (Multi-DC)** cho Ngân hàng: tầng Stateless Microservices chạy `Active-Active` gánh tải song song, kết hợp tầng Stateful Core Ledger Database sao chép đồng bộ (`Synchronous Quorum`) chống tuyệt đối thảm họa `Split-Brain`.",
      "Cài đặt cơ chế **Runtime Feature Kill-Switch** phản ứng dưới 5 giây kèm khả năng hạ cấp dịch vụ êm ái (`Graceful Degradation`) và tổ chức quy trình **Blameless Post-Mortem** chuẩn SRE."
    ],
    flow: [
      {
        step: "1. Dual-DC Active Traffic & Sync Replication (Vận hành kép & Sao chép RPO = 0)",
        detail: "GSLB / F5 GTM chia tải lưu lượng vào cả cụm K8s tại DC1 và DC2; mọi giao dịch ghi vào DB Primary tại DC1 đều bắt buộc xác nhận ghi WAL đồng bộ sang Standby tại DC2 trước khi báo `COMMIT`."
      },
      {
        step: "2. Runtime Kill-Switch Guard (Chốt ngắt khẩn cấp tính năng trong < 5 giây)",
        detail: "Khi phát hiện một luồng nghiệp vụ mới hoặc đối tác gặp sự cố nghiêm trọng, vận hành viên bật cờ `KILL_SWITCH` phát qua Redis PubSub / Config Bus khóa ngay tính năng đó trên RAM của mọi Pod."
      },
      {
        step: "3. Automated Fencing & DC Failover (Cô lập chống Split-Brain & Chuyển hướng DC2)",
        detail: "Nếu DC1 mất kết nối diện rộng, Trọng tài thứ 3 (`Quorum Witness`) khóa quyền ghi của DC1 (`STONITH/Fencing`), thăng cấp DB tại DC2 lên Primary và GSLB/BGP bẻ 100% lưu lượng khách + đường truyền NAPAS sang DC2."
      },
      {
        step: "4. Reconciliation & Blameless Post-Mortem (Đối soát hậu kiểm & Cải tiến hệ thống)",
        detail: "Sau khi khôi phục, chạy đối soát kiểm chứng không lệch một bút toán nào và họp mổ xẻ 5-Whys không đổ lỗi cá nhân để bổ sung rào chắn kỹ thuật tự động."
      }
    ],
    sections: [
      {
        heading: "1. Giải mã RPO ≈ 0, RTO < 15 Phút & Kiến trúc Multi-DC Không Bị 'Não Chẻ Đôi' (Split-Brain)",
        paragraphs: [
          "Trong phỏng vấn vị trí Kiến trúc sư Ngân hàng, rất nhiều ứng viên nhầm lẫn giữa **RPO** và **RTO** hoặc tuyên bố hồn nhiên 'Em sẽ cho cả hai Database ở Hà Nội và TP.HCM cùng ghi song song Active-Active không cần khóa gì cả!'. Trước hết hãy nắm thật chắc hai trục thời gian quanh thời điểm thảm họa: **RPO (Recovery Point Objective)** nhìn ngược về quá khứ — *'Ngân hàng chấp nhận mất tối đa bao nhiêu giây dữ liệu đã giao dịch?'*. Với sổ cái tiền tệ Core Banking, câu trả lời bắt buộc là **`RPO = 0`** (một khi đã trả biên lai báo chuyển tiền thành công trên màn hình điện thoại khách hàng thì dù cả trung tâm dữ liệu DC1 sập điện ngay mili-giây sau đó, giao dịch ấy VẪN PHẢI CÒN NGUYÊN VẸN ở DC2!). Còn **RTO (Recovery Time Objective)** nhìn về tương lai — *'Mất bao nhiêu phút từ lúc DC1 sập cho tới khi khách hàng giao dịch bình thường trở lại trên DC2?'* (thường cam kết `< 5 đến 15 phút`).",
          "Để đạt `RPO = 0` mà không phá vỡ định luật vật lý về tốc độ ánh sáng trong cáp quang, kiến trúc chuẩn của các ngân hàng Tier-1 bố trí hai Trung tâm dữ liệu chính – dự phòng nóng (`DC1` và `DC2` cách nhau khoảng `20–50 km`, độ trễ vòng mạng `RTT < 2 ms`). Ở tầng **Stateless App & API Gateway**, cả hai DC cùng mở cửa chạy **Active-Active** (mỗi bên nhận 50% lưu lượng, và mỗi DC đều được đầu tư dư dả công suất tối thiểu `65%–70%` tải đỉnh để khi 1 DC tắt thở, DC còn lại gánh trọn 100% tải mà không bị sập dây chuyền vì quá tải!). Còn ở tầng **Database Sổ cái (PostgreSQL Patroni / Oracle Data Guard)**, dữ liệu ghi vào một nhánh Primary duy nhất kèm cơ chế **Synchronous Commit** sang Standby ở DC bên kia, và BẮT BUỘC phải đặt nút trọng tài thứ 3 (**Quorum Witness / Arbiter** tại một địa điểm độc lập thứ ba) để phán xử!"
        ],
        bullets: [
          "Thảm họa `Split-Brain` nếu chỉ có 2 điểm mà thiếu Trọng tài thứ 3: Khi sợi cáp nối giữa DC1 và DC2 bị đứt nhưng cả hai tòa nhà vẫn còn điện và có Internet riêng, DC2 tưởng DC1 chết nên tự phong mình làm Primary mới trong khi DC1 vẫn đang nhận lệnh trừ tiền! Kết quả là cùng 1 số dư khách hàng bị rút làm đôi ở cả 2 bên không thể nào gộp lại được! Có nút `Witness` thứ 3 tạo thế bỏ phiếu đa số `2/3`: bên nào mất liên lạc với đa số phải tự động khóa quyền ghi ngay lập tức (`Fencing`)!",
          "Kiến trúc 3-Site chuẩn cấp cao (Metro Sync + Far DR Async): Nhiều ngân hàng lớn kết hợp `DC1` và `DC2` đồng bộ `RPO = 0` trong bán kính 40km (chống sập tòa nhà/mất điện khu vực) cộng thêm `DC3` cách xa `1.000+ km` sao chép bất đồng bộ (chống thiên tai vùng miền rộng lớn).",
          "Con số thực tế của cam kết `SLA 99.99%` ('Four Nines'): Cả một năm 365 ngày chỉ được phép gián đoạn tổng cộng vỏn vẹn **52 phút 36 giây** (tương đương chưa tới 4.4 phút mỗi tháng) — không thể đạt nổi nếu vẫn phụ thuộc vào thao tác khôi phục thủ công chậm chạp!"
        ]
      },
      {
        heading: "2. Diễn tập Chuyển đổi Dự phòng (DR Drill): Tại sao Kế hoạch trên Giấy luôn Thất bại?",
        paragraphs: [
          "Trong giới SRE có một câu châm ngôn xương máu: *'Một hệ thống Disaster Recovery chưa từng được diễn tập cắt tải thật thì coi như hệ thống đó không hề tồn tại!'*. Trên thực tế, rất nhiều tổ chức bỏ hàng triệu đô mua máy chủ dựng cụm DC2 hoành tráng, nhưng 2 năm không dám chuyển tải thật sang chạy thử một lần nào. Đến ngày DC1 gặp sự cố thật, khi bẻ lưu lượng sang DC2 thì một loạt 'quả mìn ẩn' phát nổ cùng lúc: tường lửa đối tác chuyển mạch NAPAS / Nhà mạng SMS chỉ mở whitelist cho dải IP kênh thuê riêng của DC1 mà quên chưa khai báo dải IP của DC2; thời gian lưu đệm `DNS TTL` đang đặt `86400 giây (1 ngày)` khiến ứng dụng Mobile của hàng triệu khách hàng cứ đập mãi vào IP chết của DC1; hay công cụ đồng bộ Kafka `MirrorMaker 2` giữa hai DC chưa ánh xạ lại `Consumer Group Offset` làm Worker ở DC2 đọc lặp lại hàng vạn bản tin cũ!",
          "Vì vậy, định kỳ hàng quý hoặc 6 tháng/lần (và bắt buộc theo quy định an toàn hoạt động liên tục của NHNN), ngân hàng phải tổ chức **Diễn tập DR Thực chiến (`Live Switchover / Failover Drill`)**: chủ động chuyển toàn bộ 100% giao dịch thật sang vận hành trên DC2 trong ít nhất vài giờ hoặc vài ngày làm việc để kiểm chứng trọn vẹn từ hạ tầng mạng, HSM phần cứng, kênh đối tác ngoại vi cho tới quy trình quay về (`Failback`) không rớt một đồng tiền nào."
        ],
        bullets: [
          "4 hạng mục bắt buộc rà soát trước mọi đợt DR Drill: (1) Độ trễ sao chép Database `Replication Lag = 0 bytes`; (2) Toàn bộ kết nối kênh riêng (`Leased Line`), chứng chỉ `mTLS` và thiết bị ký số phần cứng `HSM` tại DC2 đều đang thông suốt ở trạng thái `Warm/Active`; (3) `DNS TTL` tại GSLB đặt ngắn (`30–60 giây`); (4) Mọi Consumer xử lý Kafka ở DC2 đều có bảng chống trùng lặp **Idempotent Inbox** để dù đọc gối đầu vài giây offset cũng không bao giờ hạch toán kép!",
          "Tự động hóa Runbook thay vì gõ tay 50 câu lệnh lúc hoảng loạn: Mọi bước chuyển đổi dự phòng phải được đóng gói thành kịch bản tự động có bước kiểm tra tiền điều kiện (`Pre-flight Checks`) để tránh lỗi gõ nhầm của con người lúc 2 giờ sáng.",
          "Kiểm thử hỗn loạn có kiểm soát (`Chaos Engineering` trên môi trường Staging/Pre-Prod): Chủ động giả lập ngắt kết nối 1 Broker Kafka, đánh sập 1 Node K8s hoặc tạo độ trễ mạng 3 giây sang đối tác để xác nhận Circuit Breaker và Failover hoạt động đúng thiết kế."
        ]
      },
      {
        heading: "3. Công tắc Ngắt Khẩn cấp (Feature Kill-Switch < 5s) & Văn hóa Blameless Post-Mortem",
        paragraphs: [
          "Không phải sự cố nghiêm trọng nào cũng đến từ đứt cáp quang hay cháy phòng máy — thực tế hơn 70% sự cố Production đến từ chính những tính năng phần mềm mới vừa ra mắt hoặc sự thay đổi bất ngờ từ đối tác liên kết! Hãy tưởng tượng ngân hàng vừa tung ra tính năng 'Chấm điểm & Giải ngân Vay thấu chi siêu tốc trong 10 giây'; lúc 23:00 đêm, hệ thống phát hiện một kẽ hở logic trong công thức tính hạn mức khiến nhóm đối tượng gian lận đang ồ ạt rút tiền, hoặc một truy vấn khuyến mãi mới làm CPU Database vọt lên 98% đe dọa kéo sập luôn luồng Chuyển khoản và Quẹt thẻ cốt lõi! Nếu lúc đó em phải mở IDE sửa code, đợi pipeline CI/CD quét bảo mật 15 phút rồi `RollingUpdate` mất thêm 10 phút nữa, ngân hàng đã thiệt hại hàng tỷ đồng trong 25 phút chờ đợi!",
          "Đó là lý do trong danh mục nghiệm thu kiến trúc (`Production Readiness Checklist`) của anh, **MỌI tính năng tài chính mới hoặc tích hợp phụ trợ đều bắt buộc phải đi kèm một công tắc ngắt nóng `Feature Kill-Switch`**. Khi vận hành viên gạt công tắc trên trang quản trị (lưu trạng thái trên Redis/Unleash và bắn thông báo tức thì qua `Redis Pub/Sub` hoặc `Spring Cloud Bus`), toàn bộ 50 Pod cập nhật biến cờ trong bộ nhớ đệm cục bộ (`AtomicReference / ConcurrentHashMap`) trong **dưới 1–5 giây**! Ngay lập tức tính năng rủi ro bị khóa lại trả về phản hồi bảo trì lịch sự chuẩn `RFC 7807 (HTTP 503 + Retry-After)`, giải phóng 100% tài nguyên cho các nghiệp vụ sống còn mà không cần khởi động lại bất kỳ Pod nào."
        ],
        bullets: [
          "Nguyên tắc thiết kế Kill-Switch siêu bền (`Zero-Latency & Fail-Safe`): Hàm kiểm tra `killSwitch.isBlocked(...)` chạy trên mọi giao dịch nên TUYỆT ĐỐI KHÔNG gọi mạng sang Redis trên từng request! Nó phải đọc trực tiếp từ bộ nhớ RAM cục bộ của JVM (`0.001 ms`), còn việc đồng bộ thay đổi từ Redis/Config Server diễn ra bất đồng bộ qua luồng lắng nghe sự kiện hoặc làm mới ngầm mỗi 3 giây — nhờ vậy dù chính cụm Redis bị sập, ứng dụng vẫn giữ nguyên trạng thái an toàn cuối cùng mà không bị vạ lây!",
          "Phân tầng Hạ cấp Dịch vụ Êm ái (`Graceful Degradation Tiers`): Chia các chức năng thành `Tier-0` (Đăng nhập, Xem số dư, Chuyển tiền nội bộ/NAPAS, Khóa thẻ khẩn cấp — bảo vệ bằng mọi giá), `Tier-1` (Mở tiết kiệm, Thanh toán hóa đơn) và `Tier-2` (Biểu đồ phân tích chi tiêu, Tích điểm đổi quà, Gợi ý sản phẩm) — khi tải vượt ngưỡng nguy hiểm, tự động cắt bỏ `Tier-2` để cứu `Tier-0`.",
          "Văn hóa Họp rút kinh nghiệm Không Đổ Lỗi (`Blameless Post-Mortem`): Sau mỗi sự cố `SEV-1 / SEV-2`, mục tiêu duy nhất của buổi họp là truy tìm 5 tầng nguyên nhân hệ thống (`5 Whys`) — *'Tại sao rào chắn kỹ thuật của chúng ta lại cho phép một thao tác nhầm của con người gây ra hậu quả lớn đến vậy?'* — từ đó đẻ ra các Action Items tự động hóa cụ thể, khuyến khích kỹ sư báo cáo sự cố trung thực và sớm nhất thay vì giấu lỗi vì sợ bị phạt."
        ]
      }
    ],
    comparison: {
      title: "Bảng so sánh các Mô hình Dự phòng Thảm họa (Disaster Recovery Topologies) trong Ngân hàng",
      headers: ["Mô hình kiến trúc", "Mục tiêu RPO & RTO thực tế", "Chi phí & Độ phức tạp", "Phù hợp cho hệ thống nào?"],
      rows: [
        [
          "Backup & Restore (Sao lưu băng từ / Object Storage)",
          "`RPO: 4–24 giờ` · `RTO: 6–24 giờ`",
          "Chi phí rất thấp, quy trình khôi phục thủ công tốn nhiều giờ dựng lại hạ tầng",
          "Hệ thống lưu trữ kho dữ liệu lịch sử dài hạn, môi trường phát triển nội bộ không trọng yếu"
        ],
        [
          "Pilot Light / Warm Standby (DC2 chạy tối thiểu chờ kích hoạt)",
          "`RPO: vài giây – vài phút` · `RTO: 15–60 phút`",
          "Chi phí trung bình; khi chuyển sang DC2 phải chờ scale-up số lượng Pod/Node nên dễ nghẽn lúc đầu",
          "Cổng Back-Office nội bộ, hệ thống quản trị nhân sự, báo cáo quản trị cuối ngày (MIS/BI)"
        ],
        [
          "Multi-DC Active-Active App + Sync Quorum DB (`Witness` thứ 3)",
          "`RPO = 0` (không mất giao dịch) · `RTO < 5–15 phút`",
          "Chi phí cao (cần đường truyền quang độ trễ `< 2ms` và dự phòng công suất `>= 65%` mỗi DC)",
          "Chuẩn mực Vàng cho **Core Banking Ledger, Cổng Chuyển tiền 24/7, Thẻ & Xác thực Smart OTP**"
        ],
        [
          "Multi-Region Active-Active Sharded (Phân mảnh theo vùng/tài khoản)",
          "`RPO ≈ 0` · `RTO ~ vài giây` cho các phân mảnh không bị ảnh hưởng",
          "Độ phức tạp phần mềm rất cao (giao dịch xuyên phân mảnh cần Saga/2PC đặc biệt)",
          "Nền tảng Ví điện tử siêu lớn hàng chục triệu người dùng hoặc cổng đọc dữ liệu phân tán toàn cầu"
        ]
      ]
    },
    codeTitle: "Cài đặt Công tắc Ngắt Khẩn cấp (Runtime Kill-Switch < 5s) Đọc RAM Siêu Nhanh & Bền vững trên Java 21",
    code: [
      "package vn.finbank.sre.guard;",
      "import org.slf4j.*;",
      "import org.springframework.data.redis.core.StringRedisTemplate;",
      "import org.springframework.http.*;",
      "import org.springframework.scheduling.annotation.Scheduled;",
      "import org.springframework.stereotype.Service;",
      "import java.util.Set;",
      "import java.util.concurrent.atomic.AtomicReference;",
      "",
      "@Service",
      "public class FeatureKillSwitchGuard {",
      "    private static final Logger log = LoggerFactory.getLogger(FeatureKillSwitchGuard.class);",
      "    private static final String REDIS_KEY = \"sre:kill_switches:active\";",
      "    private final StringRedisTemplate redis;",
      "    // Đọc không khóa (Lock-free 0.001ms) trực tiếp trên RAM, an toàn tuyệt đối khi đa luồng",
      "    private final AtomicReference<Set<String>> blockedFeatures = new AtomicReference<>(Set.of());",
      "",
      "    public FeatureKillSwitchGuard(StringRedisTemplate redis) { this.redis = redis; }",
      "",
      "    @Scheduled(fixedDelay = 3000)",
      "    public void refreshKillSwitchesSafely() {",
      "        try {",
      "            Set<String> latest = redis.opsForSet().members(REDIS_KEY);",
      "            if (latest != null && !latest.equals(blockedFeatures.get())) {",
      "                blockedFeatures.set(Set.copyOf(latest));",
      "                log.warn(\"SRE KILL-SWITCH UPDATED activeBlockedFeatures={}\", latest);",
      "            }",
      "        } catch (Exception ex) {",
      "            log.error(\"Redis unreachable while syncing kill-switches, keeping cached state\", ex);",
      "        }",
      "    }",
      "",
      "    public ProblemDetail checkOrReject(String featureCode) {",
      "        if (!blockedFeatures.get().contains(featureCode)) return null;",
      "        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,",
      "            \"Tính năng tạm ngưng khẩn cấp để bảo vệ an toàn giao dịch. Vui lòng thử lại sau.\");",
      "        pd.setProperty(\"errorCode\", \"FEATURE_TEMPORARILY_DISABLED\");",
      "        pd.setProperty(\"feature\", featureCode);",
      "        return pd;",
      "    }",
      "}"
    ].join("\n"),
    codeNotes: [
      "Sử dụng `AtomicReference<Set<String>>` với `Set.copyOf(latest)` bất biến: Cho phép 10.000 request/giây kiểm tra `blockedFeatures.get().contains(...)` trong `0.001 mili-giây` hoàn toàn không tốn khóa đồng bộ (`Lock-free`) và không tạo thêm bất kỳ vòng mạng nào sang Redis trên luồng giao dịch chính!",
      "Đồng bộ ngầm mỗi 3 giây (`@Scheduled(fixedDelay = 3000)` — hoặc kết hợp thêm `RedisMessageListenerContainer` Pub/Sub để xuống dưới 100ms): Đảm bảo chỉ vài giây sau khi trực ca SRE gõ `SADD sre:kill_switches:active FAST_OVERDRAFT_LOAN`, toàn bộ cụm 30 Pod đồng loạt khóa cổng tính năng đó không cần redeploy.",
      "Cơ chế `Fail-safe` trong khối `catch`: Rất nhiều hệ thống viết lỗi tới mức khi Redis chập chờn thì hàm kiểm tra Feature Flag văng ngoại lệ làm chết luôn cả dịch vụ chính! Ở đây, nếu Redis mất kết nối giữa lúc chuyển đổi DC, ứng dụng ghi log cảnh báo và tiếp tục dùng bản sao an toàn gần nhất trên RAM.",
      "Phản hồi chuẩn `RFC 7807 ProblemDetail` (`503 Service Unavailable` + `FEATURE_TEMPORARILY_DISABLED`): Giúp ứng dụng Mobile/Web Banking hiển thị thông báo bảo trì riêng cho đúng tính năng phụ đó trong khi màn hình Chuyển khoản chính vẫn mượt mà 100%."
    ],
    labGuide: {
      goal: "Thực hành kích hoạt công tắc ngắt khẩn cấp `Feature Kill-Switch` cắt tính năng lỗi trên cụm đang chịu tải cao trong dưới 5 giây và mô phỏng kịch bản kiểm tra chuyển đổi dự phòng `DR Switchover` không mất giao dịch.",
      steps: [
        "Bước 1: Tích hợp `FeatureKillSwitchGuard` vào hai API: `/api/v1/core-transfer` (`Tier-0`) và `/api/v1/fast-loan/apply` (`Tier-1`, được bọc bởi mã cờ `KILL_FAST_LOAN`).",
        "Bước 2: Chạy bài bắn tải đồng thời vào cả hai API, sau đó vào `redis-cli` gõ lệnh `SADD sre:kill_switches:active KILL_FAST_LOAN` và bấm đồng hồ đo thời gian cho tới khi API vay nhanh trả về `HTTP 503 ProblemDetail` trong khi API chuyển khoản vẫn đạt `100% HTTP 200`.",
        "Bước 3: Thử tắt nóng container `Redis` (`docker stop redis`) ngay lúc cờ đang bật, gọi lại cả hai API để xác minh ứng dụng không hề bị văng lỗi `500` mà vẫn giữ nguyên trạng thái khóa an toàn trên bộ nhớ RAM cục bộ.",
        "Bước 4: Lập bảng Checklist 6 bước cho buổi diễn tập DR Drill giả lập ngắt mạng DC1 (Kiểm tra `Replication Lag = 0` → Cô lập/Fence DC1 Primary → Thăng cấp DC2 Standby → Chuyển hướng Load Balancer → Kiểm tra kênh đối tác → Đối soát tổng số dư Nợ/Có)."
      ],
      expectedOutput: "Tính năng `KILL_FAST_LOAN` bị ngắt hoàn toàn trên mọi bản sao ứng dụng chỉ sau `< 3 giây` mà không cần khởi động lại Pod; khi tắt Redis, hệ thống vẫn vận hành bền bỉ nhờ bộ đệm `AtomicReference`; tổng tiền trước và sau bài tập chuyển đổi dự phòng bảo toàn tuyệt đối `100% (RPO = 0)`."
    },
    examTips: [
      "Phân biệt nhanh `RPO` và `RTO` trong đề thi & phỏng vấn System Design: Thấy chữ **Data Loss / mất bao nhiêu dữ liệu** -> đó là **RPO** (Core Banking bắt buộc `RPO = 0` dùng Synchronous Replication); thấy chữ **Downtime / mất bao lâu để hệ thống chạy lại** -> đó là **RTO**.",
      "Câu hỏi về ngăn chặn thảm họa `Split-Brain` khi kết nối giữa 2 Trung tâm dữ liệu (`DC1` và `DC2`) bị đứt: Bắt buộc phải có **Trọng tài thứ 3 (`Quorum Witness / Arbiter`) đặt ở vị trí mạng độc lập thứ 3** kết hợp cơ chế cô lập quyền ghi (`Fencing / STONITH`) cho phía thiểu số!",
      "Khi được hỏi cách giảm thiểu rủi ro khi phát hành tính năng tài chính mới lên Production: Đáp án chuẩn Senior luôn kết hợp **Canary Release** (mở cho 1% nhân viên/khách hàng trước) đi kèm **Runtime Feature Kill-Switch** đọc từ bộ nhớ cục bộ có thể ngắt tức thì trong vài giây không cần redeploy."
    ],
    summaryTakeaways: [
      "Hệ thống ngân hàng trọng yếu đòi hỏi `RPO = 0` (không mất dù 1 giao dịch đã xác nhận) và `RTO < 15 phút` thông qua kiến trúc Multi-DC kết hợp sao chép đồng bộ có trọng tài chống `Split-Brain`.",
      "Mỗi Trung tâm dữ liệu trong mô hình Active-Active phải luôn giữ khoảng đệm công suất dự phòng để một mình gánh nổi 100% tải đỉnh khi DC còn lại gặp sự cố.",
      "Kế hoạch DR chỉ có giá trị khi được kiểm chứng định kỳ bằng các buổi diễn tập cắt tải thật (`DR Drill`) bao phủ cả Database, Kafka, HSM và đường truyền đối tác.",
      "Mọi tính năng mới lên Production đều phải trang bị công tắc ngắt khẩn cấp `Feature Kill-Switch` (< 5 giây, không khóa luồng, bền vững ngay cả khi sập Redis) cùng văn hóa mổ xẻ sự cố `Blameless Post-Mortem`."
    ],
    lessonQuestions: [
      {
        question: "Một ngân hàng thiết kế 2 Trung tâm dữ liệu `DC1` và `DC2` cách nhau 35 km cho hệ thống Sổ cái Core Banking với mục tiêu `RPO = 0` và `RTO < 10 phút`. Nếu đội hạ tầng chỉ nối trực tiếp 1 máy chủ PostgreSQL Primary ở DC1 với 1 máy chủ Standby ở DC2 có bật tự động thăng cấp (`Auto-Failover`), mà KHÔNG thiết lập nút trọng tài thứ 3 (`Quorum Witness`) hay cơ chế khóa cô lập (`Fencing`), thảm họa nào sẽ xảy ra khi tuyến cáp quang nối giữa DC1 và DC2 bị đứt nhưng cả hai trung tâm vẫn còn điện và kết nối mạng ngoài?",
        options: [
          "Hệ thống tự động chạy nhanh gấp đôi vì không còn tốn thời gian đồng bộ sang nhau.",
          "Xảy ra thảm họa Não chẻ đôi (`Split-Brain`): DC2 không thấy nhịp tim của DC1 nên tự phong mình làm Primary mới nhận giao dịch, trong khi DC1 cũ vẫn tưởng mình là Primary hợp lệ tiếp tục trừ/cộng tiền độc lập — dẫn đến chi tiêu kép và xung đột dữ liệu sổ cái không thể hòa giải!",
          "Cả hai trung tâm dữ liệu tự động xóa sạch toàn bộ bảng dữ liệu để bảo mật.",
          "Chỉ bị mất một vài file CSS giao diện nhưng số dư tài khoản vẫn tự động đồng bộ qua sóng vệ tinh miễn phí."
        ],
        answer: 1,
        explanation: "Trong hệ thống phân tán chẵn nút (2 DC nối trực tiếp không có trọng tài thứ 3), khi đường truyền liên kết giữa hai bên bị đứt (`Network Partition`), không bên nào phân biệt được 'bên kia bị sập nguồn' hay 'chỉ đứt dây mạng ở giữa'. Tự động thăng cấp không có Quorum 2/3 và Fencing chắc chắn gây ra 2 Primary cùng ghi song song (`Split-Brain`), phá hủy tính toàn vẹn tiền tệ.",
        wrongReasons: [
          "Mất liên lạc đồng bộ không bao giờ là trạng thái tối ưu tốc độ hợp lệ cho hệ thống yêu cầu `RPO = 0`.",
          "",
          "Cơ sở dữ liệu không bao giờ tự ý xóa trắng bảng khi mất kết nối mạng.",
          "Không hề có cơ chế tự đồng bộ sổ cái ma thuật nào nếu hai nhánh Database độc lập cùng sửa đổi số dư của một tài khoản theo hai hướng trái ngược nhau."
        ]
      },
      {
        question: "Khi thiết kế cơ chế `Feature Kill-Switch` cho phép đội Vận hành tắt khẩn cấp tính năng 'Hoàn tiền tự động sau giao dịch' trong vòng 5 giây trên cụm 40 Pod Payment, cách cài đặt nào sau đây đạt chuẩn hiệu năng cao và an toàn nhất (Resilient Design)?",
        options: [
          "Mỗi khi xử lý 1 giao dịch thanh toán, ứng dụng thực hiện một câu lệnh `SELECT status FROM feature_flags WHERE code = 'CASHBACK'` trực tiếp xuống Database Core Sổ cái và nếu lỗi kết nối thì văng HTTP 500 dừng luôn cả giao dịch thanh toán gốc.",
          "Lưu trạng thái cờ cứng trong file `application.yml` đóng gói trong Docker Image; khi cần tắt thì sửa Git, chạy lại toàn bộ CI/CD build ảnh và `RollingUpdate` 40 Pod.",
          "Lưu trạng thái điều khiển tập trung trên Redis/Config Server nhưng đồng bộ bất đồng bộ (qua Pub/Sub hoặc lịch nền mỗi 2–3 giây) vào biến `AtomicReference` trên RAM cục bộ của từng Pod; luồng giao dịch đọc từ RAM trong `0.001ms` và giữ nguyên trạng thái an toàn cuối cùng nếu Redis tạm thời mất kết nối.",
          "Bắt khách hàng phải cập nhật phiên bản ứng dụng mới trên App Store / Google Play mỗi khi ngân hàng muốn tạm ngưng một tính năng."
        ],
        answer: 2,
        explanation: "Đọc từ bộ nhớ cục bộ `AtomicReference` giúp loại bỏ hoàn toàn độ trễ mạng và tải dư thừa trên từng giao dịch, vẫn đảm bảo thời gian phản ứng dưới 5 giây trên toàn cụm 40 Pod nhờ đồng bộ ngầm, đồng thời cơ chế Fail-safe bảo vệ luồng thanh toán chính không bị chết chùm ngay cả khi máy chủ lưu cờ cấu hình gặp sự cố.",
        wrongReasons: [
          "Bắn thêm hàng nghìn câu SQL mỗi giây vào Core DB chỉ để hỏi một biến cờ tĩnh gây lãng phí tài nguyên nghiêm trọng và tạo điểm lỗi đơn (`Single Point of Failure`) kéo chết luôn giao dịch chính.",
          "Quy trình sửa Git -> chờ CI/CD quét bảo mật -> `RollingUpdate` 40 Pod mất từ 15 đến 30 phút, hoàn toàn bất lực trước các cuộc tấn công gian lận hoặc bão lỗi cần cắt máu trong vài giây.",
          "",
          "Phê duyệt ứng dụng trên chợ di động mất hàng ngày và không thể ép buộc 100% người dùng nâng cấp ngay lập tức, kẻ gian vẫn có thể gọi thẳng vào API cũ."
        ]
      }
    ]
  }
});
