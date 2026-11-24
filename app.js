/* FinJava Senior Academy — Core Application Engine */
const KEY = 'finjava-senior-v1';

const defaultState = () => ({
  done: {},
  checks: {},
  notes: {},
  quiz: {},
  lessonQuizAnswers: {},
  mistakes: {},
  bookmarks: {},
  savedExamples: {}, // exId -> { at, note }
  interviewMastery: {}, // id -> 'learning' | 'ok' | 'mastered'
  codeReviewScores: {}, // id -> percent
  careerChecks: {},
  history: [],
  studyMinutes: 0,
  dailyGoal: 90,
  exam: [],
  theme: 'light',
  start: new Date().toISOString().slice(0, 10)
});

let state = load();
let page = 'home';
let selected = (window.LESSONS.find(x => !state.done[x.id]) || window.LESSONS[0]).id;
let filter = '';
let stageFilter = 'all';
let moduleFilter = 'all';
let statusFilter = 'all';
let bookmarkedOnly = false;
let lessonQuizGraded = {};
let mobileMenuOpen = false;
let searchModalOpen = false;
let quickSearchQuery = '';

// Examples & Saved Examples Vault state
let lessonExTypeFilter = 'all';
let exHubMode = 'saved'; // 'saved' | 'all'
let exHubSearch = '';
let exHubModule = 'all';
let exHubType = 'all';
let exNoteEditing = {};
let toastMsg = '';
let toastTimer = null;

// Pomodoro timer
let timer = null;
let timerPreset = 25;
let timerSeconds = 25 * 60;
let timerOn = false;

// Simulator state
let simTab = 'concurrency'; // 'concurrency' | 'ledger' | 'codereview'
let simLockMode = 'pessimistic'; // 'none' | 'optimistic' | 'pessimistic' | 'atomic'
let simInitBalance = 10000000;
let simTxA = 8000000;
let simTxB = 7000000;
let simConcurrencyResult = null;

let ledgerAmount = 5000000;
let ledgerFee = 1100; // gồm 1000 phí + 100 VAT
let ledgerScenario = 'success'; // 'success' | 'rejected' | 'timeout'
let ledgerReconciled = null; // null | 'partner_paid' | 'partner_unpaid'

let activeCrId = 'CR-01';
let crSelections = {};
let crGraded = {};

// Interview state
let ivCategory = 'all';
let ivFilter = '';
let ivRevealed = {};

// Mock Exam state
let examView = 'hub'; // 'hub' | 'session' | 'review'
let examCertFilter = 'all';
let activeExam = null;
let examRunMode = 'timed'; // 'timed' | 'practice'
let examSingleMode = false;
let examCurrentIdx = 0;
let examAnswers = {};
let examFlags = {};
let examRevealed = {};
let examTimer = null;
let examSecondsLeft = 0;
let examStartedAt = 0;
let examElapsedSeconds = 0;
let reviewFilter = 'all';
let reviewDomain = 'all';

// PWA Install Prompt
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      ...defaultState(),
      ...raw,
      done: raw.done || {},
      checks: raw.checks || {},
      notes: raw.notes || {},
      quiz: raw.quiz || {},
      lessonQuizAnswers: raw.lessonQuizAnswers || {},
      mistakes: raw.mistakes || {},
      bookmarks: raw.bookmarks || {},
      savedExamples: raw.savedExamples || {},
      interviewMastery: raw.interviewMastery || {},
      codeReviewScores: raw.codeReviewScores || {},
      careerChecks: raw.careerChecks || {},
      history: Array.isArray(raw.history) ? raw.history : [],
      exam: Array.isArray(raw.exam) ? raw.exam : []
    };
  } catch (_) {
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Không thể lưu localStorage:', e);
  }
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light');
}
applyTheme();

function esc(x) {
  return String(x ?? '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

function richText(x) {
  return esc(x).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

function fmtBullet(x) {
  const s = String(x ?? '');
  const idx = s.indexOf(':');
  if (idx > 0 && idx < 72) {
    return `<b>${richText(s.slice(0, idx + 1))}</b>${richText(s.slice(idx + 1))}`;
  }
  return richText(s);
}

function highlightCode(rawCode, withLineNumbers = true) {
  const lines = String(rawCode ?? '').split('\n');
  const kwRe = /\b(public|private|protected|class|interface|record|sealed|permits|enum|extends|implements|static|final|void|return|if|else|switch|case|default|for|while|try|catch|finally|throw|throws|new|import|package|var|synchronized|volatile|boolean|int|long|double|SELECT|FROM|WHERE|AND|OR|JOIN|LEFT|INNER|ORDER|BY|LIMIT|INSERT|INTO|VALUES|UPDATE|SET|CREATE|TABLE|INDEX|CONCURRENTLY|PARTITION|RANGE|INCLUDE|FOR|NOWAIT|CHECK|UNIQUE|BEGIN|COMMIT|ROLLBACK|const|let|async|await|function|export|type|FROM|RUN|ENV|COPY|ENTRYPOINT|USER)\b/g;
  const typRe = /\b(BigDecimal|RoundingMode|String|Long|Integer|UUID|Instant|LocalDate|LocalDateTime|Duration|CompletableFuture|ThreadPoolExecutor|ReentrantLock|Executors|List|Map|Set|Optional|ConcurrentHashMap|ProblemDetail|HttpStatus|Mono|Flux|SseEmitter|ResponseCookie|Account|Money|TransferCommand|OutboxEvent)\b/g;

  return lines
    .map((line, idx) => {
      const trimmed = line.trim();
      let html = esc(line);
      if (trimmed.startsWith('//') || trimmed.startsWith('--') || trimmed.startsWith('#')) {
        html = `<span class="tok-cmt">${html}</span>`;
      } else {
        // Split inline comment if safe
        let codePart = html;
        let cmtPart = '';
        const cmtIdx = codePart.indexOf(' // ');
        if (cmtIdx >= 0) {
          cmtPart = `<span class="tok-cmt">${codePart.slice(cmtIdx)}</span>`;
          codePart = codePart.slice(0, cmtIdx);
        }
        // Tokenize strings & annotations & keywords safely via single-pass regex
        codePart = codePart.replace(
          /(&quot;.*?&quot;|&#39;.*?&#39;)|(@[A-Za-z0-9_]+)|\b(\d+(?:_\d+)*(?:\.\d+)?[Lfd]?)\b/g,
          (m, strTok, annTok, numTok) => {
            if (strTok) return `<span class="tok-str">${strTok}</span>`;
            if (annTok) return `<span class="tok-ann">${annTok}</span>`;
            if (numTok) return `<span class="tok-num">${numTok}</span>`;
            return m;
          }
        );
        // Highlight keywords outside HTML tags
        codePart = codePart
          .split(/(<[^>]+>)/g)
          .map(seg => {
            if (seg.startsWith('<')) return seg;
            return seg
              .replace(kwRe, '<span class="tok-kw">$1</span>')
              .replace(typRe, '<span class="tok-typ">$1</span>');
          })
          .join('');
        html = codePart + cmtPart;
      }
      const numPrefix = withLineNumbers ? `<span class="code-line-num">${idx + 1}</span>` : '';
      return numPrefix + html;
    })
    .join('\n');
}

function vnd(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' ₫';
}

function pct(a, b) {
  return b ? Math.round((100 * a) / b) : 0;
}

function scaledScore(correct, total) {
  if (!total) return 100;
  return Math.round(100 + 900 * (correct / total));
}

function completed() {
  return LESSONS.filter(x => state.done[x.id]).length;
}

function moduleDone(m) {
  return LESSONS.filter(x => x.module === m.id && state.done[x.id]).length;
}

function current() {
  return LESSONS.find(l => l.id === selected) || LESSONS[0];
}

function eachStage(s) {
  return LESSONS.filter(l => l.stage === s);
}

function dateKey(d) {
  return d.toLocaleDateString('en-CA');
}

function record(type, lesson) {
  state.history.push({ type, lesson: lesson || '', at: new Date().toISOString() });
  save();
}

function studiedDays() {
  return new Set(state.history.map(h => h.at.slice(0, 10))).size;
}

function streak() {
  const set = new Set(state.history.map(h => h.at.slice(0, 10)));
  const d = new Date();
  let count = 0;
  if (!set.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function progress(p, colorClass = '') {
  return `<div class="progress ${colorClass}"><b style="width:${Math.max(0, Math.min(100, p))}%"></b></div>`;
}

function notice(x, type = 'info') {
  const cls = type === true || type === 'warning' ? 'warning' : type === 'success' ? 'success' : '';
  return `<div class="notice ${cls}">${x}</div>`;
}

function link(label, url) {
  return `<a target="_blank" rel="noopener noreferrer" href="${esc(url)}">${esc(label)} ↗</a>`;
}

function timeFmt(s) {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function getAllExamSets() {
  const customSets = Array.isArray(window.EXAM_SETS) ? window.EXAM_SETS : [];
  const mapWarmupQuestion = (q, idx, prefix) => {
    const mod = q[4];
    const modLesson = LESSONS.find(l => l.module === mod) || LESSONS[0];
    const modObj = MODULES.find(m => m.id === mod);
    return {
      id: `${prefix}-${String(idx + 1).padStart(2, '0')}`,
      domain: modObj ? `${modObj.id}. ${modObj.title}` : 'Kiến thức cốt lõi',
      lessonId: modLesson.id,
      difficulty: 'Phản xạ nhanh',
      caseStudy: null,
      question: q[0],
      options: q[1],
      answer: q[2],
      walkthrough: {
        keyword: q[0],
        whyCorrect: q[3],
        whyWrong: q[1].map((opt, oi) =>
          oi === q[2]
            ? ''
            : `Phương án "${opt}" vi phạm nguyên tắc an toàn tiền tệ, đồng thời hoặc chuẩn kiến trúc hệ thống ngân hàng.`
        ),
        tip: `Ôn kỹ Học phần ${modObj ? modObj.id + ' — ' + modObj.title : mod} để nắm chắc bản chất.`
      }
    };
  };

  const qBackend = QUESTIONS.filter(q => ['J', 'S', 'D', 'M'].includes(q[4]));
  const qBankFull = QUESTIONS.filter(q => ['B', 'K', 'F', 'O', 'A', 'C'].includes(q[4]));

  const warmupSets = [
    {
      id: 'warmup-backend-core',
      cert: 'Khởi động · Phản xạ',
      title: 'Đề Phản Xạ Nhanh #1 — Java Core, JVM, Spring, Database & Kafka',
      subtitle: `${qBackend.length} câu hỏi tốc độ rà soát lỗi kinh điển về BigDecimal, ZGC, @Transactional, Deadlock & Outbox`,
      durationMinutes: 20,
      passingScore: 700,
      isWarmup: true,
      questions: qBackend.map((q, i) => mapWarmupQuestion(q, i, 'wb1'))
    },
    {
      id: 'warmup-banking-fullstack',
      cert: 'Khởi động · Phản xạ',
      title: 'Đề Phản Xạ Nhanh #2 — Core Banking, Bảo mật PCI-DSS, Frontend, K8s & System Design',
      subtitle: `${qBankFull.length} câu hỏi tốc độ rà soát Sổ cái kép, ISO 8583, VietQR, mTLS, BOLA, React/Angular BFF & Hot Account`,
      durationMinutes: 20,
      passingScore: 700,
      isWarmup: true,
      questions: qBankFull.map((q, i) => mapWarmupQuestion(q, i, 'wb2'))
    }
  ];

  return [...customSets, ...warmupSets];
}

function getInterviewQuestions() {
  if (Array.isArray(window.INTERVIEW_QUESTIONS) && window.INTERVIEW_QUESTIONS.length) {
    return window.INTERVIEW_QUESTIONS;
  }
  return [
    {
      id: 'IV-FALLBACK-1',
      category: 'Nghiệp vụ Core Banking & Thanh toán',
      level: 'Senior',
      lessonId: 'B1',
      question: 'Tại sao hệ thống ngân hàng không dùng một cột balance duy nhất cập nhật cộng/trừ mà bắt buộc dùng Sổ cái Kế toán Kép (Double-Entry Ledger)?',
      interviewerIntent: 'Kiểm tra tư duy bất biến dữ liệu tài chính và khả năng đối soát.',
      modelAnswer: 'Cập nhật đè lên một cột balance duy nhất sẽ làm mất dấu vết nguồn tiền và không thể phát hiện lỗi tự sinh/mất tiền khi có bug. Kế toán kép yêu cầu mọi giao dịch sinh ít nhất 2 dòng bút toán bất biến (Debit và Credit) có tổng bằng 0, tách bạch Ledger Balance và Available Balance (Hold), giúp truy vết kiểm toán 100% và đối soát T+0 chính xác tuyệt đối.',
      keyPoints: ['Bất biến Append-only', 'Tổng Debit = Tổng Credit trên từng Journal', 'Tách biệt Available Balance (trừ khoản Hold) và Ledger Balance'],
      redFlag: 'Trả lời rằng chỉ cần UPDATE accounts SET balance = balance - amount và ghi file text log là đủ.'
    }
  ];
}

function getCodeReviewChallenges() {
  if (Array.isArray(window.CODE_REVIEW_CHALLENGES) && window.CODE_REVIEW_CHALLENGES.length) {
    return window.CODE_REVIEW_CHALLENGES;
  }
  return [
    {
      id: 'CR-01',
      title: 'Review hàm Chuyển tiền Liên Ngân Hàng của Junior',
      scenario: 'Một lập trình viên mới đẩy Merge Request hàm chuyển tiền dưới đây. Hãy tích chọn ĐÚNG các lỗi nghiêm trọng thực sự tồn tại trong code!',
      lang: 'java',
      code: [
        '@Transactional',
        'public boolean transferExternal(Long fromId, String destBankAcc, double amount) {',
        '    Account acc = accountRepo.findById(fromId).orElseThrow();',
        '    if (acc.getBalance().doubleValue() >= amount) {',
        '        acc.setBalance(acc.getBalance().subtract(new BigDecimal(amount)));',
        '        accountRepo.save(acc);',
        '        for (int i = 0; i < 3; i++) {',
        '            String idemKey = UUID.randomUUID().toString();',
        '            if (napasRestClient.send(destBankAcc, amount, idemKey)) return true;',
        '        }',
        '    }',
        '    return false;',
        '}'
      ].join('\n'),
      issues: [
        { id: 'i1', text: 'Dùng kiểu double và new BigDecimal(amount) gây sai số nhị phân làm lệch tiền khách hàng.', isBug: true, explain: 'Chính xác! Phải truyền BigDecimal từ DTO và khởi tạo từ chuỗi hoặc BigDecimal.valueOf.' },
        { id: 'i2', text: 'Đọc findById thường rồi kiểm tra số dư trong Java mà không có khóa đồng thời dẫn đến Race Condition rút âm tiền.', isBug: true, explain: 'Chính xác! Hai luồng vào cùng lúc đều thấy đủ tiền và trừ kép.' },
        { id: 'i3', text: 'Bọc lời gọi mạng napasRestClient.send() bên trong @Transactional làm ngâm kết nối DB và cạn sạch HikariCP.', isBug: true, explain: 'Chính xác! Không bao giờ giữ DB Transaction mở trong lúc chờ HTTP đối tác bên ngoài.' },
        { id: 'i4', text: 'Sinh mới UUID.randomUUID() bên trong vòng lặp for retry khiến Idempotency-Key mất sạch tác dụng chống chuyển tiền 2 lần.', isBug: true, explain: 'Chính xác! Idempotency-Key phải cố định gắn với giao dịch gốc bên ngoài vòng lặp.' },
        { id: 'i5', text: 'Dùng phương thức orElseThrow() là sai cú pháp trong Java 21.', isBug: false, explain: 'Nhận định này SAI (bẫy): Optional.orElseThrow() không tham số đã hợp lệ chuẩn từ Java 10+.' }
      ]
    }
  ];
}

function findQuestionById(qid) {
  for (const s of getAllExamSets()) {
    const found = s.questions.find(q => q.id === qid);
    if (found) return { question: found, exam: s };
  }
  return null;
}

function getMistakeQuestions() {
  const list = [];
  for (const qid of Object.keys(state.mistakes || {})) {
    const found = findQuestionById(qid);
    if (found) list.push({ ...found.question, _meta: state.mistakes[qid], _examTitle: found.exam.title });
  }
  return list;
}

function getLessonQuestions(l) {
  const d = window.LESSON_DETAILS && window.LESSON_DETAILS[l.id];
  if (d && Array.isArray(d.lessonQuestions) && d.lessonQuestions.length) {
    return d.lessonQuestions;
  }
  const q = QUESTIONS.filter(x => x[4] === l.module);
  const picked = q[l.index % Math.max(1, q.length)] || QUESTIONS[0];
  return [
    {
      question: picked[0],
      options: picked[1],
      answer: picked[2],
      explanation: picked[3],
      wrongReasons: picked[1].map((_, i) => (i === picked[2] ? '' : 'Chưa đảm bảo tính an toàn tiền tệ, đồng thời hoặc chuẩn kiến trúc ngân hàng.'))
    }
  ];
}

function getLessonPracticalExamples(l) {
  const map = window.LESSON_EXAMPLES || {};
  const list = Array.isArray(map[l.id]) ? map[l.id] : [];
  return list.map((ex, i) => ({
    ...ex,
    id: ex.id || `${l.id}-EX${i + 1}`,
    lessonId: l.id,
    module: l.module,
    lessonTitle: l.title
  }));
}

function buildLessonAllExamples(l) {
  const d = (window.LESSON_DETAILS && window.LESSON_DETAILS[l.id]) || null;
  const items = [];
  if (d && d.analogy) {
    items.push({
      id: `${l.id}-ANALOGY`,
      lessonId: l.id,
      module: l.module,
      lessonTitle: l.title,
      type: 'Liên hệ Đời thường',
      title: d.analogy.title,
      scenario: `Ví dụ ẩn dụ đời thường giúp nhớ ngay bản chất bài ${l.id} (${l.title})`,
      story: d.analogy.body,
      lang: 'text',
      code: '',
      takeaway: l.caution
    });
  }
  items.push(...getLessonPracticalExamples(l));
  if (d && d.code) {
    items.push({
      id: `${l.id}-PRODCODE`,
      lessonId: l.id,
      module: l.module,
      lessonTitle: l.title,
      type: 'Code Production',
      title: d.codeTitle || `Mẫu triển khai chuẩn Production bài ${l.id}`,
      scenario: `Triển khai thực chiến cho chủ đề: ${l.concepts}`,
      story: (d.codeNotes || []).join(' • '),
      lang: d.codeLang || 'java',
      code: d.code,
      takeaway: (d.summaryTakeaways && d.summaryTakeaways[0]) || l.caution
    });
  }
  return items;
}

function getAllExamplesCatalog() {
  return LESSONS.flatMap(l => buildLessonAllExamples(l));
}

function findExampleById(exId) {
  return getAllExamplesCatalog().find(x => x.id === exId) || null;
}

function savedExamplesCount() {
  return Object.keys(state.savedExamples || {}).length;
}

function showToast(msg) {
  toastMsg = msg;
  if (toastTimer) clearTimeout(toastTimer);
  const existing = document.getElementById('live-toast');
  if (existing) {
    existing.querySelector('span').textContent = msg;
  }
  toastTimer = setTimeout(() => {
    toastMsg = '';
    const el = document.getElementById('live-toast');
    if (el) el.remove();
  }, 3200);
}

function renderToast() {
  if (!toastMsg) return '';
  return `
    <div class="toast-pop" id="live-toast">
      <span>${esc(toastMsg)}</span>
      <button class="btn sm" data-page="examples" style="padding:4px 10px;font-size:12px">Mở Sổ tay →</button>
    </div>
  `;
}

function exTypeTagClass(type) {
  if (type === 'Sai vs Đúng') return 'orange';
  if (type === 'Kịch bản Ngân hàng') return 'green';
  if (type === 'Sự cố & Edge Case') return 'red';
  if (type === 'Thực chiến Tích hợp') return 'purple';
  if (type === 'Liên hệ Đời thường') return 'orange';
  return '';
}

function exTypeIcon(type) {
  if (type === 'Sai vs Đúng') return '⚖️';
  if (type === 'Kịch bản Ngân hàng') return '🏦';
  if (type === 'Sự cố & Edge Case') return '🚨';
  if (type === 'Thực chiến Tích hợp') return '🔗';
  if (type === 'Liên hệ Đời thường') return '💡';
  return '💻';
}

function renderExampleCard(ex, opts = {}) {
  const savedInfo = state.savedExamples && state.savedExamples[ex.id];
  const isSaved = !!savedInfo;
  const showNoteInput = !!exNoteEditing[ex.id] || !!(savedInfo && savedInfo.note);
  const hasAnyCode = !!(ex.badCode || ex.goodCode || ex.code);

  return `
    <div class="example-card ${isSaved ? 'is-saved' : ''}" id="excard-${esc(ex.id)}">
      <div class="row" style="margin-bottom:8px">
        <div class="actions">
          ${opts.idxLabel ? `<span class="tag gray">${esc(opts.idxLabel)}</span>` : ''}
          <span class="tag ${exTypeTagClass(ex.type)}">${exTypeIcon(ex.type)} ${esc(ex.type || 'Ví dụ thực tế')}</span>
          ${opts.showLessonLink ? `<span class="tag gray">Bài ${esc(ex.lessonId)}</span>` : ''}
        </div>
        <div class="actions">
          ${hasAnyCode ? `<button class="btn alt sm" data-copy-ex="${esc(ex.id)}">📋 Copy code</button>` : ''}
          <button class="btn alt sm" data-note-toggle="${esc(ex.id)}">📝 ${savedInfo?.note ? 'Sửa ghi chú' : 'Ghi chú'}</button>
          <button class="save-ex-btn ${isSaved ? 'saved' : ''}" data-save-ex="${esc(ex.id)}">
            ${isSaved ? '★ Đã lưu vào Sổ tay' : '🔖 Lưu ví dụ hay'}
          </button>
        </div>
      </div>

      <h3 style="font-size:16.8px;margin:6px 0 8px">${esc(ex.title)}</h3>

      ${ex.scenario ? `<div class="example-scenario"><b>🎯 Bối cảnh thực tế:</b> ${richText(ex.scenario)}</div>` : ''}

      ${ex.story ? `<p style="margin:8px 0 12px;font-size:14.6px">${richText(ex.story)}</p>` : ''}

      ${
        ex.badCode && ex.goodCode
          ? `
        <div class="bad-good-grid">
          <div class="code-pane">
            <div class="pane-head bad"><span>❌ Cách viết dễ gây lỗi / mất tiền</span><span>${esc((ex.lang || 'java').toUpperCase())}</span></div>
            <pre class="code">${highlightCode(ex.badCode, true)}</pre>
          </div>
          <div class="code-pane">
            <div class="pane-head good"><span>✅ Cách viết chuẩn Senior Ngân hàng</span><span>${esc((ex.lang || 'java').toUpperCase())}</span></div>
            <pre class="code">${highlightCode(ex.goodCode, true)}</pre>
          </div>
        </div>`
          : ex.code
            ? `
        <div class="code-header">
          <span>Minh họa chi tiết (${esc((ex.lang || 'java').toUpperCase())})</span>
          <small style="color:#9db4d6">${esc(ex.id)}</small>
        </div>
        <pre class="code">${highlightCode(ex.code, true)}</pre>`
            : ''
      }

      ${ex.takeaway ? `<div class="takeaway-banner"><b>💡 Bí kíp nhớ nhanh:</b> ${richText(ex.takeaway)}</div>` : ''}

      ${
        opts.showLessonLink
          ? `<div class="actions" style="margin-top:11px">
               <button class="btn alt sm" data-lesson="${esc(ex.lessonId)}">📖 Mở Bài gốc ${esc(ex.lessonId)}: ${esc(ex.lessonTitle)} →</button>
               ${savedInfo?.at ? `<small>Đã lưu lúc ${esc(savedInfo.at.slice(0, 16).replace('T', ' '))}</small>` : ''}
             </div>`
          : ''
      }

      ${
        showNoteInput
          ? `
        <div class="ex-note-box">
          <label class="metric-label" style="display:block;margin-bottom:5px">📝 Ghi chú cá nhân cho ví dụ này (tự động lưu kèm vào Sổ tay Ví dụ hay):</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input class="field" id="exnote-${esc(ex.id)}" style="flex:1;min-width:220px" placeholder="VD: Đem ví dụ này giải thích khi phỏng vấn vòng Technical..." value="${esc(savedInfo?.note || '')}">
            <button class="btn sm" data-save-ex-note="${esc(ex.id)}">💾 Lưu ghi chú & Ghim ví dụ</button>
          </div>
        </div>`
          : ''
      }
    </div>
  `;
}

function renderSearchModal() {
  if (!searchModalOpen) return '';
  const q = quickSearchQuery.trim().toLowerCase();
  const matchedLessons = LESSONS.filter(l => {
    if (!q) return l.global < 6;
    const d = window.LESSON_DETAILS && window.LESSON_DETAILS[l.id];
    return (
      l.id.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q) ||
      l.concepts.toLowerCase().includes(q) ||
      (d?.analogy?.title || '').toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const matchedExamples = q
    ? getAllExamplesCatalog()
        .filter(
          ex =>
            ex.title.toLowerCase().includes(q) ||
            (ex.scenario || '').toLowerCase().includes(q) ||
            (ex.takeaway || '').toLowerCase().includes(q)
        )
        .slice(0, 6)
    : [];

  return `
    <div class="modal-overlay" id="search-overlay">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center">
          <span>🔍</span>
          <input id="quick-search-input" class="field" style="flex:1;border:0;padding:6px 4px;font-size:15px" placeholder="Tìm nhanh bài giảng hoặc ví dụ thực tế (VD: BigDecimal, Deadlock, VietQR, Saga, BOLA)..." value="${esc(quickSearchQuery)}">
          <button class="btn alt sm" id="close-search-modal">Đóng (Esc)</button>
        </div>
        <div style="padding:10px 16px;overflow-y:auto">
          ${
            matchedLessons.length
              ? `<div class="metric-label" style="margin:4px 0">📖 Bài giảng (${matchedLessons.length})</div>` +
                matchedLessons
                  .map(
                    l => `
                <div class="lesson-row" style="padding:10px 0">
                  <div>
                    <span class="tag">${esc(l.id)}</span>
                    <b style="margin-left:6px">${esc(l.title)}</b>
                    <div><small>${esc(l.concepts)}</small></div>
                  </div>
                  <button class="btn sm" data-lesson="${esc(l.id)}">Mở bài →</button>
                </div>`
                  )
                  .join('')
              : ''
          }
          ${
            matchedExamples.length
              ? `<div class="metric-label" style="margin:12px 0 4px">📚 Ví dụ minh họa khớp từ khóa (${matchedExamples.length})</div>` +
                matchedExamples
                  .map(
                    ex => `
                <div class="lesson-row" style="padding:10px 0">
                  <div>
                    <span class="tag ${exTypeTagClass(ex.type)}">${exTypeIcon(ex.type)} ${esc(ex.type)}</span>
                    <b style="margin-left:6px">[${esc(ex.lessonId)}] ${esc(ex.title)}</b>
                    <div><small>${esc(ex.scenario || ex.takeaway || '')}</small></div>
                  </div>
                  <button class="btn alt sm" data-lesson="${esc(ex.lessonId)}">Xem ở ${esc(ex.lessonId)} →</button>
                </div>`
                  )
                  .join('')
              : ''
          }
          ${!matchedLessons.length && !matchedExamples.length ? '<div class="empty">Không tìm thấy bài học hoặc ví dụ khớp từ khóa.</div>' : ''}
        </div>
      </div>
    </div>
  `;
}

function shell(inner) {
  const c = completed();
  const mistakeCount = getMistakeQuestions().length;
  const ivList = getInterviewQuestions();
  const ivMastered = ivList.filter(q => state.interviewMastery[q.id] === 'mastered').length;
  const savedExCnt = savedExamplesCount();

  document.getElementById('root').innerHTML = `
    <div class="mobile-bar">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn sm alt" id="open-mobile-nav" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.22)">☰ Menu</button>
        <strong>🏦 FinJava Senior</strong>
      </div>
      <div class="actions">
        <button class="btn sm alt" data-page="examples" style="background:rgba(255,255,255,0.12);color:#fde68a;border-color:rgba(255,255,255,0.22)">🔖 ${savedExCnt}</button>
        <button class="btn sm alt" id="open-search-mobile" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.22)">🔍</button>
        <span style="font-size:12px;color:#9ee6c9;font-weight:800">${c}/60 bài</span>
      </div>
    </div>
    <div class="mobile-backdrop ${mobileMenuOpen ? 'open' : ''}" id="mobile-backdrop"></div>

    <div class="app">
      <aside class="sidebar ${mobileMenuOpen ? 'open' : ''}">
        <div class="logo">
          <span class="logo-mark">FJ</span>
          <div>FinJava Senior</div>
        </div>
        <div class="sub">JAVA BACKEND SENIOR · TÀI CHÍNH NGÂN HÀNG<br>Backend · Frontend · Core Banking · Thi thử</div>

        <div class="side-progress">
          <div class="row" style="margin-bottom:6px">
            <span>Tiến độ thành thạo</span>
            <strong style="color:#6ee7b7">${pct(c, LESSONS.length)}% (${c}/60)</strong>
          </div>
          ${progress(pct(c, LESSONS.length), 'green')}
        </div>

        <button class="theme-switch" id="open-quick-search" style="margin-bottom:8px">
          <span>🔍 Tìm nhanh toàn khóa</span>
          <kbd style="opacity:0.75;font-size:11px">Ctrl+K</kbd>
        </button>

        <nav class="nav">
          ${[
            ['home', '▦', 'Tổng quan & Lộ trình', ''],
            ['curriculum', '📖', 'Giáo trình 60 bài', `<span class="nav-badge emerald">${c}/60</span>`],
            ['examples', '🔖', 'Sổ tay Ví dụ hay', `<span class="nav-badge ${savedExCnt ? '' : 'emerald'}" style="${savedExCnt ? 'background:#d97706' : ''}">${savedExCnt || '360+'}</span>`],
            ['simulator', '🏦', 'Mô phỏng Core Banking', ''],
            ['quiz', '✦', 'Thi thử & Chấm chữa', mistakeCount ? `<span class="nav-badge" title="Câu sai cần ôn">${mistakeCount}</span>` : ''],
            ['interview', '🎤', 'Phỏng vấn Vấn đáp Senior', ivMastered ? `<span class="nav-badge emerald">${ivMastered}/${ivList.length}</span>` : ''],
            ['today', '◷', 'Kế hoạch & Lịch học', ''],
            ['project', '🚀', 'Đồ án Core Banking', ''],
            ['settings', '☁️', 'Đồng bộ & Đẩy Online', '']
          ]
            .map(
              ([k, ic, v, badge]) =>
                `<button class="${page === k || (page === 'lesson' && k === 'curriculum') ? 'active' : ''}" data-page="${k}"><span>${ic}</span><span>${v}</span>${badge}</button>`
            )
            .join('')}
        </nav>

        <div class="side-foot">
          <button class="theme-switch" id="toggle-theme">
            <span>${state.theme === 'dark' ? '🌙 Giao diện Tối (Đang bật)' : '☀️ Giao diện Sáng (Đang bật)'}</span>
            <span>Đổi</span>
          </button>
          Học mọi lúc mọi nơi trên Máy tính & Điện thoại (PWA Offline + Đồng bộ mã nhanh).
        </div>
      </aside>

      <main class="main">
        ${inner}
        <div class="footer">
          <b>FinJava Senior Academy</b> · Hệ thống huấn luyện thực chiến từ góc nhìn Senior Java Backend Architect cho lĩnh vực Tài chính - Ngân hàng - Fintech (Core Java 21, Spring Boot 3, PostgreSQL, Redis, Kafka, Ledger, ISO 8583/20022, NAPAS/VietQR, PCI-DSS, React/Angular/BFF, K8s & System Design).
        </div>
      </main>
    </div>
    ${renderSearchModal()}
    ${renderToast()}
  `;
}

function heading(tag, title, extra = '') {
  return `<div class="top"><div><div class="eyebrow">${tag}</div><h1>${title}</h1></div><div class="actions">${extra}</div></div>`;
}

function stopTimers() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    timerOn = false;
  }
  if (examTimer && page !== 'quiz') {
    clearInterval(examTimer);
    examTimer = null;
  }
}

function go(p) {
  if (page === 'quiz' && examView === 'session' && p !== 'quiz') {
    if (!confirm('Bạn đang trong phòng thi thử bấm giờ. Rời trang sẽ hủy lượt làm dở hiện tại. Tiếp tục rời đi?')) return;
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
    }
    examView = 'hub';
  }
  mobileMenuOpen = false;
  searchModalOpen = false;
  page = p;
  render();
  window.scrollTo(0, 0);
}

function openLesson(id) {
  if (page === 'quiz' && examView === 'session') {
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
    }
    examView = 'hub';
  }
  mobileMenuOpen = false;
  searchModalOpen = false;
  lessonExTypeFilter = 'all';
  selected = id;
  page = 'lesson';
  render();
  window.scrollTo(0, 0);
}

function nextLesson() {
  return LESSONS.find(l => !state.done[l.id]) || LESSONS[LESSONS.length - 1];
}

/* ================= 1. HOME DASHBOARD ================= */

const CAREER_CHECKLIST = [
  ['c1', 'Nắm chắc Java 21 (BigDecimal, ZGC, Virtual Threads, Concurrency) & Spring Boot 3 (@Transactional, JPA N+1)'],
  ['c2', 'Giải quyết triệt để Race Condition trừ tiền âm, Deadlock chuyển khoản chéo & tối ưu PostgreSQL/Redis triệu dòng'],
  ['c3', 'Thiết kế thành thạo Kafka chuẩn tài chính, Transactional Outbox Pattern, Saga bù trừ & Spring Batch EOD'],
  ['c4', 'Hiểu sâu nghiệp vụ Ngân hàng: Kế toán Kép (Double-Entry Ledger), ISO 8583/20022, NAPAS 24/7, VietQR & Đối soát T+0'],
  ['c5', 'Triển khai bảo mật chuẩn PCI-DSS 4.0, mTLS 2 chiều, chữ ký số JWS, HSM/AES-GCM, Smart OTP & chống OWASP BOLA'],
  ['c6', 'Làm chủ cả Frontend & BFF Ngân hàng (CORS/HttpOnly Cookie, TypeScript, React TanStack Query, Angular Teller RxJS)'],
  ['c7', 'Tự tin trả lời System Design 10.000 TPS (Hot Account, Flash-Sale) & có Đồ án Core Banking chạy Docker/K8s trên CV']
];

function home() {
  const c = completed();
  const l = nextLesson();
  const ld = window.LESSON_DETAILS && window.LESSON_DETAILS[l.id];
  const examSets = getAllExamSets();
  const totalMockQuestions = examSets.reduce((s, e) => s + e.questions.length, 0);
  const bestScore = state.exam.length ? Math.max(...state.exam.map(e => e.score1000 || scaledScore(e.percent, 100))) : null;

  return `
    ${heading(
      'Lộ trình Huấn luyện Thực chiến · Senior Java Architect',
      'Trở thành Java Backend Senior Ngành Tài Chính - Ngân Hàng',
      `<span class="pill">🏦 60 Bài giảng chuyên sâu · Bộ mô phỏng Ledger/Locking · ${examSets.length} Đề thi tuyển</span>`
    )}

    <div class="hero">
      <div>
        <div class="eyebrow">TỪ BACKEND, FRONTEND ĐẾN TRÁI TIM CORE BANKING & SYSTEM DESIGN</div>
        <h1>Học sâu từ bản chất.<br>Tự tin chinh phục mọi Ngân hàng & Fintech.</h1>
        <p>Giáo trình được đúc kết từ thực tế xây dựng Core Banking, Cổng thanh toán 24/7 và Ngân hàng số: mỗi bài đều có <b>câu chuyện sự cố thật, liên hệ đời thường cực dễ hiểu, sơ đồ kiến trúc, code Production phân tích từng dòng, bài Lab cầm tay chỉ việc và đề thi thử chấm điểm tự động</b>.</p>
        <div class="actions">
          <button class="btn" data-lesson="${esc(l.id)}">▶ ${c ? 'Học tiếp bài ' + esc(l.id) : 'Bắt đầu Bài J1 ngay'}</button>
          <button class="btn alt" data-page="examples">🔖 Kho 360+ Ví Dụ & Sổ Tay (${savedExamplesCount()} đã lưu)</button>
          <button class="btn alt" data-page="simulator">🏦 Mở Phòng Mô Phỏng Core Banking</button>
          <button class="btn alt" data-page="quiz">✦ Thi Thử & Chấm Điểm</button>
        </div>
      </div>
      <div class="hero-stat">
        <div>Tiến độ chinh phục lộ trình Senior</div>
        <div><strong>${pct(c, LESSONS.length)}%</strong> <small style="color:#d6f5ec">· ${c}/${LESSONS.length} bài hoàn thành</small></div>
        ${progress(pct(c, LESSONS.length))}
        <p style="font-size:12.5px;margin:10px 0 0;color:#d6f5ec">
          ✓ 120+ câu hỏi cuối bài · ${totalMockQuestions}+ câu thi tuyển có chữa 4 bước · 30+ câu phỏng vấn vấn đáp
        </p>
      </div>
    </div>

    <div class="metrics">
      <div class="card">
        <div class="metric-label">Bài giảng đã làm chủ</div>
        <div class="metric-num">${c}<small> / 60</small></div>
        ${progress(pct(c, 60), 'green')}
      </div>
      <div class="card">
        <div class="metric-label">Điểm thi thử cao nhất</div>
        <div class="metric-num">${bestScore !== null ? bestScore : '—'}<small>${bestScore !== null ? ' / 1000' : ''}</small></div>
        <small>${state.exam.length ? `${state.exam.length} lượt thi · Chuẩn Senior ≥ 700` : 'Chưa làm đề thi tuyển'}</small>
      </div>
      <div class="card">
        <div class="metric-label">Câu hỏi phỏng vấn đã thuộc</div>
        <div class="metric-num">${Object.values(state.interviewMastery).filter(v => v === 'mastered').length}<small> / ${getInterviewQuestions().length}</small></div>
        <small>Vấn đáp hội đồng kỹ thuật</small>
      </div>
      <div class="card">
        <div class="metric-label">Kỷ luật học tập</div>
        <div class="metric-num">${streak()} <small>ngày</small></div>
        <small>${Math.round((state.studyMinutes / 60) * 10) / 10} giờ tập trung Pomodoro</small>
      </div>
    </div>

    <div class="two">
      <section class="card">
        <div class="row">
          <h2>Bài học tiếp theo dành cho bạn</h2>
          <span class="tag orange">Trọng tâm hôm nay</span>
        </div>
        <h3 style="font-size:18px;margin-top:8px">[${esc(l.id)}] ${esc(l.title)}</h3>
        <p class="muted">${esc(ld?.teacherIntro ? ld.teacherIntro.slice(0, 210) + '…' : l.lab)}</p>
        <div class="actions">
          <span class="tag">${esc(l.stage)}</span>
          <span class="tag gray">Bài ${l.global + 1}/60 · ${esc(ld?.duration || '50 phút')}</span>
          <button class="btn" data-lesson="${esc(l.id)}">Vào lớp học bài này →</button>
        </div>

        <hr class="divider">
        <h3>Bản đồ 4 Giai đoạn Năng lực Senior Ngân hàng</h3>
        <div class="domain-bars" style="margin-top:10px">
          ${STAGES.map(st => {
            const stLessons = eachStage(st.id);
            const doneCount = stLessons.filter(x => state.done[x.id]).length;
            const p = pct(doneCount, stLessons.length);
            return `
              <div>
                <div class="row" style="margin-bottom:5px;font-size:13.5px">
                  <b>${esc(st.label)} (${st.modules.join(', ')})</b>
                  <span>${doneCount}/${stLessons.length} bài (${p}%)</span>
                </div>
                ${progress(p, p === 100 ? 'green' : '')}
              </div>`;
          }).join('')}
        </div>
      </section>

      <section class="card">
        <div class="row">
          <h2>Checklist Tự tin Ứng tuyển Ngân hàng & Fintech</h2>
          <span class="tag green">${Object.values(state.careerChecks).filter(Boolean).length}/${CAREER_CHECKLIST.length} đạt</span>
        </div>
        <p class="muted" style="font-size:13.5px;margin-bottom:10px">Tích vào từng năng lực khi bạn đã học xong các học phần tương ứng và sẵn sàng bảo vệ trước Tech Lead / Solution Architect:</p>
        <div class="checklist">
          ${CAREER_CHECKLIST.map(
            ([cid, label]) => `
            <label class="checkline" style="padding:8px 11px;font-size:13.3px">
              <input type="checkbox" data-career-check="${cid}" ${state.careerChecks[cid] ? 'checked' : ''}>
              <span>${esc(label)}</span>
            </label>`
          ).join('')}
        </div>
      </section>
    </div>

    <section class="section">
      <div class="row" style="margin-bottom:14px">
        <h2>10 Học phần Toàn diện (Backend · Nghiệp vụ Ngân hàng · Bảo mật · Frontend · Cloud · System Design)</h2>
        <button class="btn alt" data-page="curriculum">Xem toàn bộ 60 bài giảng →</button>
      </div>
      <div class="module-grid">${MODULES.map(m => moduleCard(m)).join('')}</div>
    </section>
  `;
}

function moduleCard(m) {
  const d = moduleDone(m);
  const tagCls =
    m.stage === 'Distributed & Banking'
      ? 'green'
      : m.stage === 'Fullstack & Cloud'
        ? 'purple'
        : m.stage === 'Architect & Career'
          ? 'orange'
          : '';
  return `
    <div class="card module" data-module="${esc(m.id)}" role="button" tabindex="0">
      <div class="row">
        <div class="mark">${m.icon || ''} ${esc(m.id)}</div>
        <span class="tag ${tagCls}">${esc(m.stage)}</span>
      </div>
      <h3 style="margin-top:14px">${esc(m.id)}. ${esc(m.title)}</h3>
      <p>${esc(m.desc)}</p>
      <div class="row" style="margin-bottom:6px">
        <small>${d}/6 bài hoàn thành</small>
        <strong>${pct(d, 6)}%</strong>
      </div>
      ${progress(pct(d, 6), d === 6 ? 'green' : '')}
    </div>
  `;
}

/* ================= 2. CURRICULUM LIST ================= */

function getFilteredLessons() {
  const q = filter.trim().toLowerCase();
  return LESSONS.filter(l => {
    const d = window.LESSON_DETAILS && window.LESSON_DETAILS[l.id];
    const matchText =
      !q ||
      l.id.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q) ||
      l.concepts.toLowerCase().includes(q) ||
      (d && d.analogy && d.analogy.title.toLowerCase().includes(q));
    const matchStage = stageFilter === 'all' || l.stage === stageFilter;
    const matchMod = moduleFilter === 'all' || l.module === moduleFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'todo' && !state.done[l.id]) ||
      (statusFilter === 'done' && !!state.done[l.id]);
    const matchBookmark = !bookmarkedOnly || !!state.bookmarks[l.id];
    return matchText && matchStage && matchMod && matchStatus && matchBookmark;
  });
}

function curriculum() {
  const rows = getFilteredLessons();
  return `
    ${heading(
      'Giáo trình Thực chiến từ Senior Java Architect',
      'Lộ trình 60 Bài Giảng Chuyên Sâu',
      `<span class="pill">10 Học phần · 60 Bài học · 120+ Câu hỏi kiểm tra</span>`
    )}
    ${notice('Mỗi bài giảng được thiết kế <b>9 phần dễ học mà cực sâu</b>: Câu chuyện sự cố thực tế tại Ngân hàng → Liên hệ đời thường dễ hiểu → Sơ đồ kiến trúc 4 bước → Lý thuyết bản chất & đánh đổi → Bảng quy tắc chọn giải pháp → Code Production tô màu cú pháp & phân tích từng dòng → Bài Lab thực hành → Mẹo phỏng vấn Senior → Bài kiểm tra chấm chữa tự động.')}

    <div class="section toolbar">
      <input class="field" id="filter" placeholder="Tìm bài học, công nghệ (VD: BigDecimal, Locking, Kafka, ISO 8583, VietQR, PCI-DSS, React, Angular, K8s)..." value="${esc(filter)}">
      <select class="field" id="mod-filter">
        <option value="all">Tất cả 10 Học phần</option>
        ${MODULES.map(m => `<option value="${esc(m.id)}" ${moduleFilter === m.id ? 'selected' : ''}>Học phần ${esc(m.id)}: ${esc(m.title.slice(0, 38))}…</option>`).join('')}
      </select>
      <select class="field" id="stage">
        <option value="all">Mọi giai đoạn</option>
        ${STAGES.map(s => `<option value="${esc(s.id)}" ${stageFilter === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>
      <select class="field" id="status-filter">
        <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Mọi trạng thái</option>
        <option value="todo" ${statusFilter === 'todo' ? 'selected' : ''}>Chưa hoàn thành</option>
        <option value="done" ${statusFilter === 'done' ? 'selected' : ''}>Đã hoàn thành</option>
      </select>
      <button class="btn ${bookmarkedOnly ? 'warn' : 'alt'}" id="toggle-bookmark-filter">★ Trọng tâm (${Object.keys(state.bookmarks).filter(k => state.bookmarks[k]).length})</button>
      <button class="btn alt" id="reset-filter">Xóa lọc</button>
    </div>

    <div class="card" id="results">${lessonList(rows)}</div>
  `;
}

function lessonList(rows) {
  if (!rows.length) return '<div class="empty">Không tìm thấy bài giảng khớp bộ lọc hiện tại.</div>';
  return rows
    .map(l => {
      const d = window.LESSON_DETAILS && window.LESSON_DETAILS[l.id];
      const starred = state.bookmarks[l.id] ? ' <span title="Đã đánh dấu trọng tâm" style="color:#f59e0b">★</span>' : '';
      const mod = MODULES.find(m => m.id === l.module);
      return `
        <div class="lesson-row">
          <div style="max-width:820px">
            <div>
              <span class="tag ${l.stage === 'Distributed & Banking' ? 'green' : l.stage === 'Fullstack & Cloud' ? 'purple' : l.stage === 'Architect & Career' ? 'orange' : ''}">${esc(mod?.icon || '')} Học phần ${esc(l.module)}</span>
              <small> &nbsp;Bài ${l.global + 1}/60 · Mã <b>${esc(l.id)}</b> · ${esc(d?.duration || '50 phút')} · ${esc(d?.difficulty || 'Senior Thực chiến')}${starred}</small>
            </div>
            <div style="font-weight:750;font-size:16.2px;margin:7px 0 4px">${esc(l.id)}. ${esc(l.title)}</div>
            <small>${esc(l.concepts)}</small>
            ${d?.analogy ? `<div style="font-size:12.8px;color:var(--primary);margin-top:5px">💡 <i>Ví dụ dễ hiểu: ${esc(d.analogy.title)}</i></div>` : ''}
          </div>
          <div class="actions">
            <span class="tag ${state.done[l.id] ? 'green' : 'gray'}">${state.done[l.id] ? '✓ Đã hoàn thành' : 'Chưa học'}</span>
            <button class="btn ${state.done[l.id] ? 'alt' : ''}" data-lesson="${esc(l.id)}">${state.done[l.id] ? 'Ôn lại →' : 'Vào học →'}</button>
          </div>
        </div>`;
    })
    .join('');
}

/* ================= 3. DEEP LESSON READER ================= */

function lesson() {
  const l = current();
  const m = MODULES.find(x => x.id === l.module);
  const d = (window.LESSON_DETAILS && window.LESSON_DETAILS[l.id]) || null;
  const practicalExs = getLessonPracticalExamples(l);
  const visibleExs =
    lessonExTypeFilter === 'all'
      ? practicalExs
      : practicalExs.filter(ex => ex.type === lessonExTypeFilter);
  const analogyId = `${l.id}-ANALOGY`;
  const prodCodeId = `${l.id}-PRODCODE`;
  const isAnalogySaved = !!(state.savedExamples && state.savedExamples[analogyId]);
  const isProdCodeSaved = !!(state.savedExamples && state.savedExamples[prodCodeId]);
  const checks = state.checks[l.id] || [];
  const qList = getLessonQuestions(l);
  const savedAns = state.lessonQuizAnswers[l.id] || {};
  const quizState = state.quiz[l.id];
  const showGraded = !!lessonQuizGraded[l.id] || !!quizState;
  const prevL = LESSONS[l.global - 1] || null;
  const nextL = LESSONS[l.global + 1] || null;
  const starred = !!state.bookmarks[l.id];

  return `
    ${heading(
      `${esc(l.stage)} · Học phần ${esc(l.module)}: ${esc(m.title)}`,
      `${esc(l.id)}. ${esc(l.title)}`,
      `<button class="btn alt" data-page="examples">🔖 Sổ tay Ví dụ (${savedExamplesCount()})</button>
       <button class="btn ${starred ? 'warn' : 'alt'}" id="bookmark-lesson">${starred ? '★ Đã lưu bài này' : '☆ Lưu bài trọng tâm'}</button>
       <button class="btn alt" id="back-curriculum">← Danh sách 60 bài</button>`
    )}

    <div class="breadcrumb">
      <span>Học phần <b>${esc(l.module)}</b> (Bài ${l.index}/6) · Toàn khóa <b>${l.global + 1}/60</b> · Thời lượng: <b>${esc(d?.duration || '50 phút')}</b> · Ví dụ minh họa: <b>${practicalExs.length + 2} ví dụ thực tế</b></span>
      <div class="actions">
        <button class="btn alt sm" id="prev-top" ${prevL ? '' : 'disabled'}>← Bài trước</button>
        <button class="btn alt sm" id="next-top" ${nextL ? '' : 'disabled'}>Bài tiếp →</button>
      </div>
    </div>

    <div class="content-grid">
      <div>
        <section class="card reading">
          <div class="jump-bar">
            <a href="#sec-intro">👨‍🏫 Đặt vấn đề</a>
            <a href="#sec-flow">🗺️ Sơ đồ luồng</a>
            <a href="#sec-lecture">📖 Bài giảng sâu</a>
            <a href="#sec-examples">📚 Kho ví dụ (${practicalExs.length})</a>
            <a href="#sec-compare">⚖️ Bảng so sánh</a>
            <a href="#sec-code">💻 Code Production</a>
            <a href="#sec-lab">🧪 Bài Lab</a>
            <a href="#lesson-quiz-section">✍️ Chấm bài</a>
          </div>

          ${
            d
              ? `
            <div class="teacher-box" id="sec-intro">
              <div class="teacher-header">
                <div class="teacher-avatar">👨‍💻</div>
                <div>Chia sẻ từ Senior Java Backend Ngân Hàng · Bài toán thực tế trên Production</div>
              </div>
              <p style="margin:0">${richText(d.teacherIntro)}</p>
            </div>

            ${
              d.analogy
                ? `
              <div class="analogy-box">
                <div class="row" style="margin-bottom:6px">
                  <div class="analogy-title" style="margin:0">💡 Liên hệ đời thường cực dễ hiểu: ${esc(d.analogy.title)}</div>
                  <button class="save-ex-btn ${isAnalogySaved ? 'saved' : ''}" data-save-ex="${esc(analogyId)}">
                    ${isAnalogySaved ? '★ Đã lưu ví dụ này' : '🔖 Lưu ví dụ đời thường'}
                  </button>
                </div>
                <p style="margin:0">${richText(d.analogy.body)}</p>
              </div>`
                : ''
            }

            ${
              d.objectives?.length
                ? `
              <div class="objectives-box">
                <strong>🎯 Sau bài học này, bạn hoàn toàn làm chủ:</strong>
                <ul>
                  ${d.objectives.map(o => `<li>${richText(o)}</li>`).join('')}
                </ul>
              </div>`
                : ''
            }

            ${
              d.flow?.length
                ? `
              <h3 id="sec-flow">🗺️ Sơ đồ kiến trúc & Luồng hoạt động bên dưới</h3>
              <div class="flow-grid">
                ${d.flow
                  .map(
                    f => `
                  <div class="flow-step">
                    <strong>${esc(f.step)}</strong>
                    <span>${richText(f.detail)}</span>
                  </div>`
                  )
                  .join('')}
              </div>`
                : ''
            }

            <div class="row" id="sec-lecture" style="margin-top:22px">
              <h2>📖 Bài giảng chuyên sâu từ gốc rễ</h2>
              <span class="tag">${esc(l.concepts)}</span>
            </div>

            ${(d.sections || [])
              .map(
                sec => `
              <div class="lecture-section">
                <h3>${esc(sec.heading)}</h3>
                ${(sec.paragraphs || []).map(p => `<p>${richText(p)}</p>`).join('')}
                ${sec.bullets?.length ? `<ul>${sec.bullets.map(b => `<li>${fmtBullet(b)}</li>`).join('')}</ul>` : ''}
              </div>`
              )
              .join('')}

            ${
              practicalExs.length
                ? `
              <div class="examples-showcase" id="sec-examples">
                <div class="row">
                  <div>
                    <div class="eyebrow">HỌC QUA TÌNH HUỐNG CỤ THỂ · HIỂU THẤU TRONG 5 PHÚT</div>
                    <h2 style="margin:4px 0 4px">📚 Kho Ví Dụ Minh Họa Đa Chiều (${practicalExs.length} góc nhìn thực tế)</h2>
                    <small>Bấm <b>"🔖 Lưu ví dụ hay"</b> ở bất kỳ ví dụ nào bạn tâm đắc để gom vào Sổ tay cá nhân xem lại trước giờ phỏng vấn!</small>
                  </div>
                </div>

                <div class="toolbar" style="margin:12px 0 4px">
                  ${[
                    ['all', `Tất cả (${practicalExs.length})`],
                    ['Sai vs Đúng', '⚖️ Sai vs Đúng'],
                    ['Kịch bản Ngân hàng', '🏦 Kịch bản Ngân hàng'],
                    ['Sự cố & Edge Case', '🚨 Sự cố & Edge Case'],
                    ['Thực chiến Tích hợp', '🔗 Thực chiến Tích hợp']
                  ]
                    .map(
                      ([val, lbl]) =>
                        `<button class="btn sm ${lessonExTypeFilter === val ? '' : 'alt'}" data-lesson-ex-filter="${esc(val)}">${lbl}</button>`
                    )
                    .join('')}
                </div>

                ${
                  visibleExs.length
                    ? visibleExs
                        .map((ex, idx) =>
                          renderExampleCard(ex, {
                            showLessonLink: false,
                            idxLabel: `Ví dụ ${idx + 1}/${visibleExs.length}`
                          })
                        )
                        .join('')
                    : '<div class="empty">Không có ví dụ thuộc nhóm lọc này.</div>'
                }
              </div>`
                : ''
            }

            ${
              d.comparison?.rows?.length
                ? `
              <h3 id="sec-compare">⚖️ ${esc(d.comparison.title || 'Bảng so sánh & Quy tắc chọn giải pháp kiến trúc')}</h3>
              <div class="table-wrap">
                <table class="comp-table">
                  <thead>
                    <tr>${d.comparison.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
                  </thead>
                  <tbody>
                    ${d.comparison.rows
                      .map(r => `<tr>${r.map((cell, ci) => `<td>${ci === 0 ? `<b>${richText(cell)}</b>` : richText(cell)}</td>`).join('')}</tr>`)
                      .join('')}
                  </tbody>
                </table>
              </div>`
                : ''
            }

            <h3 id="sec-code">💻 Ví dụ Code Chuẩn Production (${esc((d.codeLang || 'java').toUpperCase())})</h3>
            <div class="code-header">
              <span>${esc(d.codeTitle || 'Triển khai mẫu chuẩn hệ thống Ngân hàng')}</span>
              <div class="actions">
                <button class="btn sm alt" data-save-ex="${esc(prodCodeId)}" style="background:${isProdCodeSaved ? '#f59e0b' : 'rgba(255,255,255,0.12)'};color:${isProdCodeSaved ? '#091d34' : '#fff'};border-color:rgba(255,255,255,0.25)">
                  ${isProdCodeSaved ? '★ Đã lưu mẫu code' : '🔖 Lưu mẫu code'}
                </button>
                <button class="btn sm alt" id="copy-code" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.25)">📋 Sao chép code</button>
              </div>
            </div>
            <pre class="code">${highlightCode(d.code || l.sample, true)}</pre>

            ${
              d.codeNotes?.length
                ? `
              <div class="code-notes">
                <strong style="color:var(--blue-text)">🔍 Senior phân tích từng dòng code "ăn điểm" khi Review & Phỏng vấn:</strong>
                <ul>${d.codeNotes.map(n => `<li>${fmtBullet(n)}</li>`).join('')}</ul>
              </div>`
                : ''
            }

            <hr class="divider">
            <h2 id="sec-lab">🧪 Bài Lab thực hành cầm tay chỉ việc</h2>
            <p><b>Mục tiêu bài Lab:</b> ${richText(d.labGuide?.goal || l.lab)}</p>
            ${
              d.labGuide?.steps?.length
                ? `<div class="lab-step-list">${d.labGuide.steps.map(st => `<div class="lab-step">${fmtBullet(st)}</div>`).join('')}</div>`
                : ''
            }
            ${
              d.labGuide?.expectedOutput
                ? `<div class="expected-box"><b>✓ Kết quả nghiệm thu cần đạt:</b> ${richText(d.labGuide.expectedOutput)}</div>`
                : ''
            }

            <h3>Checklist tự kiểm tra hoàn thành Lab (3 bước)</h3>
            <div class="checklist">
              ${l.steps
                .map(
                  (x, i) => `
                <label class="checkline">
                  <input type="checkbox" data-check="${i}" ${checks.includes(i) ? 'checked' : ''}>
                  <span>${esc(x)}</span>
                </label>`
                )
                .join('')}
            </div>

            <hr class="divider">
            <div class="exam-tip-box" id="sec-tips">
              <h3>🎤 Góc Phỏng Vấn Ngân Hàng & Bẫy Chết Người Trên Production</h3>
              <ul>
                ${(d.examTips || []).map(t => `<li>${fmtBullet(t)}</li>`).join('')}
              </ul>
              ${notice(`<b>⚠️ Bẫy kỹ sư rất hay mắc phải:</b> ${richText(l.caution)}`, 'warning')}
            </div>

            ${
              d.summaryTakeaways?.length
                ? `
              <h3>📌 Tóm tắt cốt lõi nhớ ngay trong 30 giây</h3>
              <div class="takeaway-grid">
                ${d.summaryTakeaways.map(tk => `<div class="takeaway-item"><span>✓</span><span>${richText(tk)}</span></div>`).join('')}
              </div>`
                : ''
            }
          `
              : `
            <p><b>Khái niệm trọng tâm:</b> ${esc(l.concepts)}.</p>
            ${notice(`<b>Lưu ý sống còn:</b> ${esc(l.caution)}`, 'warning')}
            <pre class="code standalone">${highlightCode(l.sample, true)}</pre>
            <h3>Bài Lab thực hành</h3>
            <p>${esc(l.lab)}</p>
            <div class="checklist">
              ${l.steps
                .map(
                  (x, i) => `
                <label class="checkline">
                  <input type="checkbox" data-check="${i}" ${checks.includes(i) ? 'checked' : ''}>
                  <span>${esc(x)}</span>
                </label>`
                )
                .join('')}
            </div>
          `
          }

          <hr class="divider">
          <h3>📝 Ghi chú cá nhân / Link GitHub bài Lab của bạn</h3>
          <textarea class="field" id="lesson-note" placeholder="Ghi lại ý hiểu cốt lõi, câu trả lời phỏng vấn của riêng bạn hoặc link repo thực hành...">${esc(state.notes[l.id] || '')}</textarea>
          <div class="actions" style="margin-top:9px">
            <button class="btn alt" id="save-note">💾 Lưu ghi chú</button>
            <small>Tự động lưu trên trình duyệt & đồng bộ được qua Mã Đồng Bộ</small>
          </div>

          <h3 style="margin-top:20px">🔗 Tài liệu đặc tả chính thức</h3>
          <p>
            ${link('Tài liệu chuẩn học phần ' + m.id, SOURCES[l.source] || SOURCES.springBoot)} &nbsp;·&nbsp;
            ${link('OWASP API Security', SOURCES.owaspApi)} &nbsp;·&nbsp;
            ${link('Spring Security Reference', SOURCES.springSecurity)}
          </p>
        </section>

        <section class="card section" id="lesson-quiz-section">
          <div class="row">
            <h2>✍️ Kiểm tra hiểu bài & Chấm chữa chi tiết</h2>
            <span class="tag purple">${qList.length} câu hỏi tình huống thực tế</span>
          </div>
          <p class="muted" style="margin-top:0">Chọn đáp án cho các tình huống dưới đây rồi bấm Chấm bài. Hệ thống sẽ phân tích rõ vì sao phương án chuẩn đúng và mổ xẻ từng đáp án nhiễu.</p>

          ${qList
            .map((q, qi) => {
              const chosen = savedAns[qi];
              const isChosen = chosen !== undefined && chosen !== null;
              const isRight = isChosen && Number(chosen) === q.answer;
              return `
                <div class="question">
                  <strong>Câu ${qi + 1}. ${richText(q.question)}</strong>
                  <div style="margin-top:8px">
                    ${q.options
                      .map((opt, oi) => {
                        let optCls = '';
                        if (showGraded && isChosen) {
                          if (oi === q.answer) optCls = 'opt-correct';
                          else if (Number(chosen) === oi) optCls = 'opt-wrong';
                        }
                        return `
                          <label class="quiz-option ${optCls}">
                            <input type="radio" name="lquiz_${qi}" value="${oi}" ${isChosen && Number(chosen) === oi ? 'checked' : ''}>
                            <span><b>${String.fromCharCode(65 + oi)}.</b> ${richText(opt)}</span>
                          </label>`;
                      })
                      .join('')}
                  </div>
                  ${
                    showGraded && isChosen
                      ? `
                    <div class="walkthrough-box">
                      <div class="wt-step">
                        <span class="wt-label ${isRight ? 'ok' : 'err'}">${isRight ? '✓ Chính xác! Tư duy chuẩn Senior.' : `✕ Chưa đúng · Đáp án chuẩn là ${String.fromCharCode(65 + q.answer)}`}</span>
                        <div>${richText(q.explanation)}</div>
                      </div>
                      ${
                        !isRight && q.wrongReasons && q.wrongReasons[Number(chosen)]
                          ? `
                        <div class="wt-step">
                          <span class="wt-label err">🔍 Vì sao phương án ${String.fromCharCode(65 + Number(chosen))} bạn chọn lại nguy hiểm?</span>
                          <div>${richText(q.wrongReasons[Number(chosen)])}</div>
                        </div>`
                          : ''
                      }
                      ${
                        q.wrongReasons && q.wrongReasons.some((r, ri) => ri !== q.answer && ri !== Number(chosen) && r)
                          ? `
                        <div class="wt-step">
                          <span class="wt-label tip">💡 Phân tích các phương án nhiễu còn lại:</span>
                          <ul style="margin:6px 0 0;padding-left:18px">
                            ${q.wrongReasons
                              .map((r, ri) => (ri !== q.answer && r ? `<li><b>Phương án ${String.fromCharCode(65 + ri)}:</b> ${richText(r)}</li>` : ''))
                              .join('')}
                          </ul>
                        </div>`
                          : ''
                      }
                    </div>`
                      : ''
                  }
                </div>`;
            })
            .join('')}

          <div class="actions" style="margin-top:12px">
            <button class="btn" id="grade-one">👨‍💻 Chấm bài & Xem phân tích chi tiết</button>
            ${
              quizState?.ok
                ? `<span class="tag green">✓ Đã vượt qua (${quizState.score || qList.length}/${qList.length} câu đúng)</span>`
                : quizState
                  ? `<span class="tag orange">Đúng ${quizState.score || 0}/${qList.length} câu — Hãy chọn lại câu sai rồi chấm lại!</span>`
                  : ''
            }
          </div>
        </section>
      </div>

      <aside>
        <div class="card" style="position:sticky;top:20px">
          <h3>Tiến độ bài ${esc(l.id)}</h3>
          ${progress(pct(checks.length + (quizState?.ok ? 1 : 0), 4), state.done[l.id] || (checks.length === 3 && quizState?.ok) ? 'green' : '')}
          <p style="margin-top:10px">
            <small>
              • Checklist Lab: <b>${checks.length}/3</b><br>
              • Bài kiểm tra tình huống: <b>${quizState?.ok ? '✓ Đạt (' + qList.length + '/' + qList.length + ')' : 'Chưa đạt'}</b>
            </small>
          </p>
          <button class="btn ${state.done[l.id] ? 'success' : ''}" id="complete" style="width:100%" ${checks.length === 3 && quizState?.ok ? '' : 'disabled'}>
            ${state.done[l.id] ? '✓ Đã hoàn thành bài này' : '✓ Hoàn thành & Sang bài mới'}
          </button>
          ${
            !state.done[l.id]
              ? `<button class="btn alt sm" id="fast-complete" style="width:100%;margin-top:8px" title="Dành cho chủ đề bạn đã làm thực tế nhiều năm">⚡ Đánh dấu đã nắm vững nhanh</button>`
              : `<button class="btn alt sm" id="unmark-complete" style="width:100%;margin-top:8px">↺ Bỏ đánh dấu hoàn thành</button>`
          }
          <p class="help">Khuyến khích làm đủ 3 bước Lab và vượt qua bài kiểm tra tình huống để nhớ sâu kiến trúc.</p>

          <hr class="divider">
          <h3>Điều hướng nhanh</h3>
          ${prevL ? `<p style="margin:4px 0"><small>Bài trước:</small><br><b>${esc(prevL.id)}. ${esc(prevL.title)}</b></p><button class="btn alt sm" id="prev-side" style="width:100%;margin-bottom:10px">← Mở bài ${esc(prevL.id)}</button>` : ''}
          <p style="margin:4px 0"><small>Bài kế tiếp:</small><br><b>${nextL ? `${esc(nextL.id)}. ${esc(nextL.title)}` : 'Đã tới cuối chương trình!'}</b></p>
          <button class="btn alt sm" id="next" style="width:100%" ${!nextL ? 'disabled' : ''}>Bài tiếp theo →</button>

          <hr class="divider">
          <button class="btn alt sm" style="width:100%;margin-bottom:7px" data-page="simulator">🏦 Thử nghiệm trên Bộ Mô Phỏng</button>
          <button class="btn alt sm" style="width:100%" data-page="quiz">✦ Vào Phòng Thi Tuyển</button>
        </div>
      </aside>
    </div>
  `;
}

/* ================= 4. INTERACTIVE CORE BANKING SIMULATOR ================= */

function computeConcurrencySim() {
  const init = Math.max(1000000, Number(simInitBalance) || 10000000);
  const a = Math.max(500000, Number(simTxA) || 8000000);
  const b = Math.max(500000, Number(simTxB) || 7000000);

  if (simLockMode === 'none') {
    const afterA = init - a;
    const afterB = init - b; // Lost update or negative overdraft!
    return {
      verdict: 'THẢM HỌA THẤT THOÁT TIỀN (Race Condition & Lost Update)!',
      ok: false,
      finalBalance: afterB,
      bankDisbursed: a + b,
      loss: a + b - (init - afterB),
      events: [
        ['00.001s', 'Luồng ATM (A)', `SELECT balance FROM accounts WHERE id = 101 → Đọc thấy ${vnd(init)} (>= ${vnd(a)}: Hợp lệ!)`, ''],
        ['00.002s', 'Mobile App (B)', `SELECT balance FROM accounts WHERE id = 101 → Cũng đọc thấy ${vnd(init)} (>= ${vnd(b)}: Hợp lệ!)`, 'warn'],
        ['00.015s', 'Luồng ATM (A)', `UPDATE accounts SET balance = ${vnd(afterA)} → Nhả tiền mặt ${vnd(a)} cho khách tại cây ATM!`, 'warn'],
        ['00.018s', 'Mobile App (B)', `UPDATE accounts SET balance = ${vnd(afterB)} → Ghi đè mất sạch kết quả trừ tiền của Luồng A và chuyển đi ${vnd(b)}!`, 'bad'],
        ['Kết cục', 'Kiểm toán Core', `Khách chỉ có ${vnd(init)} nhưng rút + chuyển trót lọt ${vnd(a + b)}, tài khoản còn lại ${vnd(afterB)} → Ngân hàng mất trắng ${vnd(a)}!`, 'bad']
      ]
    };
  }

  if (simLockMode === 'optimistic') {
    const canA = init >= a;
    const balAfterA = canA ? init - a : init;
    const canBRetry = balAfterA >= b;
    return {
      verdict: 'AN TOÀN — Optimistic Locking (@Version) phát hiện xung đột & chặn rút lố!',
      ok: true,
      finalBalance: canBRetry ? balAfterA - b : balAfterA,
      bankDisbursed: (canA ? a : 0) + (canBRetry ? b : 0),
      loss: 0,
      events: [
        ['00.001s', 'Luồng ATM (A)', `SELECT balance, version FROM accounts → balance=${vnd(init)}, version=5`, ''],
        ['00.002s', 'Mobile App (B)', `SELECT balance, version FROM accounts → balance=${vnd(init)}, version=5`, ''],
        ['00.012s', 'Luồng ATM (A)', `UPDATE accounts SET balance=${vnd(balAfterA)}, version=6 WHERE id=101 AND version=5 → Thành công (1 row updated)!`, 'good'],
        ['00.015s', 'Mobile App (B)', `UPDATE accounts SET balance=${vnd(init - b)}, version=6 WHERE id=101 AND version=5 → 0 row updated! Ném ObjectOptimisticLockingFailureException!`, 'warn'],
        ['00.022s', 'Mobile App (B)', canBRetry ? `Retry đọc lại version=6 (số dư ${vnd(balAfterA)} >= ${vnd(b)}) → Trừ tiếp thành công, còn ${vnd(balAfterA - b)}.` : `Retry đọc lại version=6 thấy số dư chỉ còn ${vnd(balAfterA)} < ${vnd(b)} → Từ chối chuẩn xác với mã INSUFFICIENT_FUNDS!`, 'good']
      ]
    };
  }

  if (simLockMode === 'pessimistic') {
    const canA = init >= a;
    const balAfterA = canA ? init - a : init;
    const canB = balAfterA >= b;
    return {
      verdict: 'AN TOÀN TUYỆT ĐỐI — Pessimistic Write Lock (SELECT ... FOR UPDATE) tuần tự hóa giao dịch!',
      ok: true,
      finalBalance: canB ? balAfterA - b : balAfterA,
      bankDisbursed: (canA ? a : 0) + (canB ? b : 0),
      loss: 0,
      events: [
        ['00.001s', 'Luồng ATM (A)', `SELECT * FROM accounts WHERE id=101 FOR UPDATE → Chiếm khóa Row-level Exclusive Lock trên dòng 101!`, 'good'],
        ['00.002s', 'Mobile App (B)', `SELECT * FROM accounts WHERE id=101 FOR UPDATE → Bị PostgreSQL bắt đứng chờ khóa (Row Lock Wait)...`, 'warn'],
        ['00.010s', 'Luồng ATM (A)', `Kiểm tra ${vnd(init)} >= ${vnd(a)}, cập nhật balance = ${vnd(balAfterA)} và COMMIT → Nhả khóa dòng 101!`, 'good'],
        ['00.011s', 'Mobile App (B)', `Nhận được khóa dòng 101 với dữ liệu mới nhất sau COMMIT: balance = ${vnd(balAfterA)}`, ''],
        ['00.014s', 'Mobile App (B)', canB ? `Đủ số dư → Trừ tiếp ${vnd(b)}, còn ${vnd(balAfterA - b)} và COMMIT.` : `Số dư còn ${vnd(balAfterA)} < ${vnd(b)} → ROLLBACK & trả lỗi INSUFFICIENT_FUNDS ngay lập tức, không mất 1 đồng!`, 'good']
      ]
    };
  }

  // atomic SQL
  const canA = init >= a;
  const balAfterA = canA ? init - a : init;
  const canB = balAfterA >= b;
  return {
    verdict: 'SIÊU TỐC & AN TOÀN — Atomic Conditional UPDATE ngay tại tầng Engine CSDL!',
    ok: true,
    finalBalance: canB ? balAfterA - b : balAfterA,
    bankDisbursed: (canA ? a : 0) + (canB ? b : 0),
    loss: 0,
    events: [
      ['00.001s', 'Luồng ATM (A)', `UPDATE accounts SET balance = balance - ${a} WHERE id=101 AND balance >= ${a} RETURNING balance → Còn ${vnd(balAfterA)}!`, 'good'],
      ['00.003s', 'Mobile App (B)', `UPDATE accounts SET balance = balance - ${b} WHERE id=101 AND balance >= ${b} RETURNING balance → ${canB ? 'Còn ' + vnd(balAfterA - b) : 'Trả về 0 dòng cập nhật do không đủ điều kiện balance >= ' + vnd(b)}!`, canB ? 'good' : 'warn'],
      ['Tổng kết', 'Kiến trúc sư', `Không cần đọc lên Java trước khi trừ, giữ khóa dòng ngắn nhất tính bằng micro-giây, thông lượng cao nhất cho Ví điện tử!`, 'good']
    ]
  };
}

function renderSimulator() {
  const sim = simConcurrencyResult || computeConcurrencySim();
  const amt = Math.max(10000, Number(ledgerAmount) || 5000000);
  const feeTotal = Math.max(0, Number(ledgerFee) || 1100);
  const vat = Math.round(feeTotal / 11);
  const netFee = feeTotal - vat;
  const totalCustomerDebit = amt + feeTotal;

  // Build Double-Entry postings
  const journals = [
    {
      title: 'Bước 1 (T+0 ms): Khoanh giữ tiền khách hàng (Hold / Phong tỏa tạm thời trước khi gọi NAPAS)',
      note: 'Số dư thực tế (Ledger Balance) chưa trừ, nhưng Số dư khả dụng (Available Balance) giảm ngay lập tức để chống khách rút tiền ở kênh khác.',
      entries: [
        ['JRN-01', 'CASA-KH-100998 (TK Thanh toán Khách hàng)', vnd(totalCustomerDebit), '0 ₫', 'Tạm giữ gốc + phí chuyển nhanh 24/7'],
        ['JRN-01', 'GL-2101-HOLD (TK Trung gian Tạm giữ Outbound)', '0 ₫', vnd(totalCustomerDebit), 'Ghi Có đối ứng khoản đang chờ NAPAS']
      ],
      sumD: totalCustomerDebit,
      sumC: totalCustomerDebit
    }
  ];

  if (ledgerScenario === 'success') {
    journals.push({
      title: 'Bước 2 (T+180 ms): NAPAS trả mã DE39 = "00" (Thành công) → Giải tỏa Hold & Quyết toán Sổ Cái',
      note: 'Tất toán khoản Hold sang Tài khoản Quyết toán Liên ngân hàng NAPAS, đồng thời tách rõ doanh thu phí và thuế GTGT.',
      entries: [
        ['JRN-02', 'GL-2101-HOLD (TK Trung gian Tạm giữ Outbound)', vnd(totalCustomerDebit), '0 ₫', 'Giải tỏa khoản tạm giữ Bước 1'],
        ['JRN-02', 'NOSTRO-NAPAS-3801 (TK Quyết toán Liên NH NAPAS)', '0 ₫', vnd(amt), 'Phải trả gốc chuyển tiền cho NH thụ hưởng'],
        ['JRN-02', 'REV-7101-FEE (TK Thu nhập Phí Dịch vụ Thanh toán)', '0 ₫', vnd(netFee), 'Hạch toán doanh thu phí thuần'],
        ['JRN-02', 'TAX-3331-VAT (TK Thuế GTGT Phải nộp 10%)', '0 ₫', vnd(vat), 'Tách thuế VAT đầu ra tự động']
      ],
      sumD: totalCustomerDebit,
      sumC: amt + netFee + vat
    });
  } else if (ledgerScenario === 'rejected') {
    journals.push({
      title: 'Bước 2 (T+140 ms): Ngân hàng đích từ chối tường minh (DE39 = "05" / Tài khoản đóng) → Saga Bù trừ Đảo Bút Toán!',
      note: 'Tuyệt đối KHÔNG dùng lệnh DELETE xóa JRN-01! Hệ thống sinh chứng từ đảo chiều JRN-02-REV hoàn trả 100% số dư khả dụng cho khách.',
      entries: [
        ['JRN-02-REV', 'GL-2101-HOLD (TK Trung gian Tạm giữ Outbound)', vnd(totalCustomerDebit), '0 ₫', 'Đảo Nợ giải phóng khoản tạm giữ'],
        ['JRN-02-REV', 'CASA-KH-100998 (TK Thanh toán Khách hàng)', '0 ₫', vnd(totalCustomerDebit), 'Hoàn trả nguyên vẹn gốc + phí cho khách hàng']
      ],
      sumD: totalCustomerDebit,
      sumC: totalCustomerDebit
    });
  } else {
    journals.push({
      title: 'Bước 2 (T+30.000 ms): Đứt kết nối / ReadTimeout (Mã 68) — CẤM tự động hoàn tiền ngay! Chuyển sang TK Treo Chờ Đối Soát',
      note: 'Khi Timeout, ta không biết ngân hàng bạn đã cộng tiền cho người nhận hay chưa. Nếu tự hoàn tiền ngay mà bên kia cũng đã cộng tiền thì ngân hàng mất trắng!',
      entries: [
        ['JRN-02-SUS', 'GL-2101-HOLD (TK Trung gian Tạm giữ Outbound)', vnd(totalCustomerDebit), '0 ₫', 'Chuyển từ Hold ngắn hạn sang Treo tra soát'],
        ['JRN-02-SUS', 'GL-3999-SUSPENSE (TK Treo Chờ Đối Soát Liên NH)', '0 ₫', vnd(totalCustomerDebit), 'Treo chờ Job Đối soát T+0/T+1 với file chuẩn NAPAS']
      ],
      sumD: totalCustomerDebit,
      sumC: totalCustomerDebit
    });
    if (ledgerReconciled === 'partner_paid') {
      journals.push({
        title: 'Bước 3 (Đối soát T+0): File sao kê NAPAS xác nhận ĐÃ CỘNG TIỀN thành công cho người nhận → Tất toán từ TK Treo!',
        note: 'Job Spring Batch tự động khớp mã RRN/STAN, giải phóng TK Treo sang quyết toán NAPAS và gửi thông báo hoàn tất cho khách.',
        entries: [
          ['JRN-03-REC', 'GL-3999-SUSPENSE (TK Treo Chờ Đối Soát Liên NH)', vnd(totalCustomerDebit), '0 ₫', 'Tất toán khoản treo nghi vấn'],
          ['JRN-03-REC', 'NOSTRO-NAPAS-3801 (TK Quyết toán Liên NH NAPAS)', '0 ₫', vnd(amt), 'Quyết toán gốc với NAPAS'],
          ['JRN-03-REC', 'REV-7101-FEE & TAX-3331-VAT (Phí + Thuế)', '0 ₫', vnd(feeTotal), 'Ghi nhận phí dịch vụ & thuế']
        ],
        sumD: totalCustomerDebit,
        sumC: amt + feeTotal
      });
    } else if (ledgerReconciled === 'partner_unpaid') {
      journals.push({
        title: 'Bước 3 (Đối soát T+0): File sao kê NAPAS xác nhận giao dịch THẤT BẠI (chưa ghi Có bên nhận) → Tự động Hoàn tiền khách!',
        note: 'Chỉ khi đối soát xác nhận chắc chắn đối tác chưa nhận, hệ thống mới sinh bút toán hoàn trả tự động từ TK Treo về CASA khách hàng.',
        entries: [
          ['JRN-03-REF', 'GL-3999-SUSPENSE (TK Treo Chờ Đối Soát Liên NH)', vnd(totalCustomerDebit), '0 ₫', 'Giải phóng khoản treo sau đối soát'],
          ['JRN-03-REF', 'CASA-KH-100998 (TK Thanh toán Khách hàng)', '0 ₫', vnd(totalCustomerDebit), 'Hoàn tiền tự động T+0 cho khách hàng']
        ],
        sumD: totalCustomerDebit,
        sumC: totalCustomerDebit
      });
    }
  }

  const challenges = getCodeReviewChallenges();
  const activeCr = challenges.find(c => c.id === activeCrId) || challenges[0];
  const selMap = crSelections[activeCr.id] || {};
  const isCrGraded = !!crGraded[activeCr.id];

  return `
    ${heading(
      'Phòng Thí Nghiệm Trực Quan · Hiểu Sâu Trong 5 Phút',
      'Mô Phỏng Core Banking & Chấm Điểm Code Review',
      `<span class="pill">🏦 Học qua thực nghiệm trực tiếp</span>`
    )}

    <div class="toolbar">
      <button class="btn ${simTab === 'concurrency' ? '' : 'alt'}" data-sim-tab="concurrency">⚡ 1. Mô phỏng Race Condition & Locking</button>
      <button class="btn ${simTab === 'ledger' ? '' : 'alt'}" data-sim-tab="ledger">📒 2. Mô phỏng Sổ Cái Kép & Đối soát NAPAS</button>
      <button class="btn ${simTab === 'codereview' ? '' : 'alt'}" data-sim-tab="codereview">🔍 3. Thử thách Senior Code Review (${challenges.length} bài)</button>
    </div>

    ${
      simTab === 'concurrency'
        ? `
      <div class="card">
        <h2>⚡ Mô phỏng 2 Luồng Rút & Chuyển Tiền Cùng Mili-Giây trên 1 Tài Khoản</h2>
        <p class="muted">Thử thay đổi cơ chế khóa bên dưới để thấy tận mắt vì sao hệ thống thiếu khóa bị rút lố âm tiền và cách <code>@Version</code>, <code>SELECT FOR UPDATE</code> hay <code>Atomic SQL</code> bảo vệ từng đồng của ngân hàng.</p>

        <div class="three" style="margin:16px 0">
          <div>
            <label class="metric-label">Số dư ban đầu (VNĐ)</label>
            <input type="number" class="field" id="sim-init" style="width:100%;margin-top:6px" step="1000000" value="${simInitBalance}">
          </div>
          <div>
            <label class="metric-label">Luồng 1: Rút tại cây ATM (VNĐ)</label>
            <input type="number" class="field" id="sim-txa" style="width:100%;margin-top:6px" step="1000000" value="${simTxA}">
          </div>
          <div>
            <label class="metric-label">Luồng 2: Chuyển trên Mobile App (VNĐ)</label>
            <input type="number" class="field" id="sim-txb" style="width:100%;margin-top:6px" step="1000000" value="${simTxB}">
          </div>
        </div>

        <div class="toolbar">
          <span style="font-weight:700;font-size:13.8px">Chọn cơ chế kiểm soát đồng thời:</span>
          <button class="btn sm ${simLockMode === 'none' ? 'danger' : 'alt'}" data-lock-mode="none">❌ Không khóa (Code ngây thơ)</button>
          <button class="btn sm ${simLockMode === 'optimistic' ? '' : 'alt'}" data-lock-mode="optimistic">🛡️ Optimistic Lock (@Version)</button>
          <button class="btn sm ${simLockMode === 'pessimistic' ? '' : 'alt'}" data-lock-mode="pessimistic">🔒 Pessimistic Lock (SELECT FOR UPDATE)</button>
          <button class="btn sm ${simLockMode === 'atomic' ? '' : 'alt'}" data-lock-mode="atomic">⚡ Atomic Conditional SQL</button>
        </div>

        ${notice(`<b>Kết quả thực thi:</b> ${esc(sim.verdict)}<br>Tổng tiền giải ngân: <b>${vnd(sim.bankDisbursed)}</b> · Số dư cuối trên DB: <b>${vnd(sim.finalBalance)}</b> · Thất thoát ngân hàng: <b>${vnd(sim.loss)}</b>`, sim.ok ? 'success' : 'warning')}

        <h3 style="margin-top:16px">Timeline thực thi từng mili-giây trên Database & JVM</h3>
        <div class="sim-timeline">
          ${sim.events
            .map(
              ([t, actor, msg, cls]) => `
            <div class="sim-event ${cls}">
              <code style="font-weight:800">${esc(t)}</code>
              <span class="tag ${cls === 'bad' ? 'red' : cls === 'good' ? 'green' : 'gray'}">${esc(actor)}</span>
              <div>${esc(msg)}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>`
        : simTab === 'ledger'
          ? `
      <div class="card">
        <h2>📒 Mô phỏng Hạch toán Sổ Cái Kế Toán Kép (Double-Entry) & Luồng Liên Ngân Hàng NAPAS 24/7</h2>
        <p class="muted">Mọi giao dịch chuyển tiền chuẩn Core Banking đều phải tuân thủ phương trình bất biến <b>Tổng Phát Sinh Nợ (Debit) = Tổng Phát Sinh Có (Credit)</b> ở mọi bước chuyển trạng thái.</p>

        <div class="three" style="margin:16px 0">
          <div>
            <label class="metric-label">Số tiền chuyển khoản gốc (VNĐ)</label>
            <input type="number" class="field" id="led-amt" style="width:100%;margin-top:6px" step="500000" value="${ledgerAmount}">
          </div>
          <div>
            <label class="metric-label">Phí dịch vụ đã gồm 10% VAT (VNĐ)</label>
            <input type="number" class="field" id="led-fee" style="width:100%;margin-top:6px" step="1100" value="${ledgerFee}">
          </div>
          <div>
            <label class="metric-label">Kịch bản phản hồi từ cổng NAPAS</label>
            <select class="field" id="led-scenario" style="width:100%;margin-top:6px">
              <option value="success" ${ledgerScenario === 'success' ? 'selected' : ''}>✅ Thành công tức thì (Mã 00)</option>
              <option value="rejected" ${ledgerScenario === 'rejected' ? 'selected' : ''}>❌ Ngân hàng đích từ chối tường minh (Mã 05 → Saga Đảo bút toán)</option>
              <option value="timeout" ${ledgerScenario === 'timeout' ? 'selected' : ''}>⏱️ ReadTimeout mạng chưa rõ kết quả (Mã 68 → Treo chờ Đối soát)</option>
            </select>
          </div>
        </div>

        ${
          ledgerScenario === 'timeout'
            ? `
          <div class="notice warning">
            <b>⚠️ Tình huống sống còn khi phỏng vấn Ngân hàng:</b> Giao dịch bị ReadTimeout (Mã 68) đang treo tại <code>GL-3999-SUSPENSE</code>. Hãy đóng vai hệ thống <b>Đối soát tự động cuối ngày (T+0)</b> đọc file chuẩn từ NAPAS để xử lý dứt điểm:
            <div class="actions" style="margin-top:10px">
              <button class="btn sm success" data-rec="partner_paid">🔄 Đối soát thấy NAPAS ĐÃ CỘNG TIỀN bên nhận → Tất toán</button>
              <button class="btn sm warn" data-rec="partner_unpaid">🔄 Đối soát thấy NAPAS CHƯA GHI NHẬN → Hoàn tiền về CASA khách</button>
            </div>
          </div>`
            : ''
        }

        ${journals
          .map(
            j => `
          <div style="margin-top:18px">
            <h3>${esc(j.title)}</h3>
            <p class="muted" style="font-size:13.5px;margin-bottom:8px">${esc(j.note)}</p>
            <div class="table-wrap" style="margin-bottom:10px">
              <table class="comp-table">
                <thead>
                  <tr>
                    <th>Mã Chứng Từ</th>
                    <th>Tài khoản Kế toán (GL / CASA)</th>
                    <th>Phát sinh NỢ (Debit)</th>
                    <th>Phát sinh CÓ (Credit)</th>
                    <th>Diễn giải bút toán</th>
                  </tr>
                </thead>
                <tbody>
                  ${j.entries
                    .map(
                      r => `
                    <tr>
                      <td><code>${esc(r[0])}</code></td>
                      <td><b>${esc(r[1])}</b></td>
                      <td style="color:var(--danger);font-weight:700">${esc(r[2])}</td>
                      <td style="color:var(--emerald);font-weight:700">${esc(r[3])}</td>
                      <td>${esc(r[4])}</td>
                    </tr>`
                    )
                    .join('')}
                  <tr style="background:var(--surface-3)">
                    <td colspan="2"><b>TỔNG CÂN ĐỐI CHỨNG TỪ (∑ Debit == ∑ Credit)</b></td>
                    <td><b>${vnd(j.sumD)}</b></td>
                    <td><b>${vnd(j.sumC)}</b></td>
                    <td><span class="tag green">✓ Cân bằng tuyệt đối (Chênh lệch = 0 ₫)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>`
          )
          .join('')}
      </div>`
          : `
      <div class="card">
        <div class="row">
          <h2>🔍 Thử thách Senior Code Review Thực Chiến</h2>
          <div class="actions">
            ${challenges
              .map(
                (c, i) =>
                  `<button class="btn sm ${c.id === activeCr.id ? '' : 'alt'}" data-cr-pick="${esc(c.id)}">Bài #${i + 1}${state.codeReviewScores[c.id] !== undefined ? ` (${state.codeReviewScores[c.id]}%)` : ''}</button>`
              )
              .join('')}
          </div>
        </div>
        <h3 style="margin-top:12px">${esc(activeCr.title)}</h3>
        <p class="muted">${esc(activeCr.scenario)}</p>

        <div class="code-header">
          <span>Merge Request cần bạn Review (${esc((activeCr.lang || 'java').toUpperCase())})</span>
          <span>Hãy tích chọn tất cả các lỗi thực sự bên dưới (cẩn thận bẫy nhận định sai!)</span>
        </div>
        <pre class="code">${highlightCode(activeCr.code, true)}</pre>

        <h3>Danh sách nhận định Review — Đâu là lỗi chí mạng thật sự?</h3>
        <div class="checklist">
          ${activeCr.issues
            .map(iss => {
              const checked = !!selMap[iss.id];
              let borderStyle = '';
              if (isCrGraded) {
                const correctDecision = checked === !!iss.isBug;
                borderStyle = correctDecision
                  ? 'border-color:#10b981;background:var(--emerald-bg)'
                  : 'border-color:#ef4444;background:var(--danger-bg)';
              }
              return `
                <label class="checkline" style="${borderStyle}">
                  <input type="checkbox" data-cr-check="${esc(iss.id)}" ${checked ? 'checked' : ''}>
                  <div>
                    <div><b>${esc(iss.text)}</b></div>
                    ${
                      isCrGraded
                        ? `<div style="margin-top:5px;font-size:13.2px">
                             <span class="tag ${iss.isBug ? 'red' : 'gray'}">${iss.isBug ? 'Lỗi thật trong code' : 'Nhận định bẫy (Code gốc không bị lỗi này)'}</span>
                             &nbsp;${richText(iss.explain)}
                           </div>`
                        : ''
                    }
                  </div>
                </label>`;
            })
            .join('')}
        </div>

        <div class="actions" style="margin-top:14px">
          <button class="btn" id="grade-cr">👨‍💻 Chấm điểm bản Code Review này</button>
          <button class="btn alt" id="reset-cr">Làm lại bài này</button>
          ${
            isCrGraded
              ? `<span class="tag ${state.codeReviewScores[activeCr.id] >= 80 ? 'green' : 'orange'}">Điểm Review của bạn: ${state.codeReviewScores[activeCr.id]}%</span>`
              : ''
          }
        </div>
      </div>`
    }
  `;
}

/* ================= 5. ORAL INTERVIEW PREP HUB ================= */

function renderInterview() {
  const all = getInterviewQuestions();
  const categories = ['all', ...Array.from(new Set(all.map(x => x.category)))];
  const qText = ivFilter.trim().toLowerCase();
  const filtered = all.filter(item => {
    const matchCat = ivCategory === 'all' || item.category === ivCategory;
    const matchQ =
      !qText ||
      item.question.toLowerCase().includes(qText) ||
      item.modelAnswer.toLowerCase().includes(qText) ||
      item.category.toLowerCase().includes(qText);
    return matchCat && matchQ;
  });
  const masteredCount = all.filter(x => state.interviewMastery[x.id] === 'mastered').length;

  return `
    ${heading(
      'Luyện Phản Xạ Vòng Hội Đồng Kỹ Thuật (Tech Lead / Architect)',
      'Ngân Hàng Phỏng Vấn Vấn Đáp Senior Java Ngân Hàng',
      `<span class="pill">🎤 Đã tự tin ${masteredCount}/${all.length} câu hỏi</span>`
    )}
    ${notice('Cách luyện hiệu quả nhất: <b>Đọc câu hỏi → Tự nói to câu trả lời trong 90 giây như đang ngồi trước hội đồng phỏng vấn → Bấm mở Đáp án mẫu chuẩn Senior & Điểm đỏ cần tránh</b> để đối chiếu và tự chấm mức độ tự tin.')}

    <div class="toolbar section">
      <input class="field" id="iv-search" placeholder="Tìm câu hỏi phỏng vấn (VD: Deadlock, Saga, BigDecimal, ISO 8583, BOLA, Virtual Thread)..." value="${esc(ivFilter)}">
      <select class="field" id="iv-cat">
        ${categories.map(c => `<option value="${esc(c)}" ${ivCategory === c ? 'selected' : ''}>${c === 'all' ? 'Tất cả 6 Vòng Phỏng Vấn (' + all.length + ' câu)' : esc(c)}</option>`).join('')}
      </select>
    </div>

    <div>
      ${
        filtered.length
          ? filtered
              .map((item, idx) => {
                const open = !!ivRevealed[item.id];
                const mastery = state.interviewMastery[item.id] || '';
                const linked = LESSONS.find(l => l.id === item.lessonId);
                return `
                  <div class="question-card">
                    <div class="row" style="margin-bottom:8px">
                      <div class="actions">
                        <span class="tag">${esc(item.id)}</span>
                        <span class="tag purple">${esc(item.category)}</span>
                        <span class="tag gray">${esc(item.level || 'Senior')}</span>
                      </div>
                      <div class="actions">
                        <button class="btn sm ${mastery === 'learning' ? 'danger' : 'alt'}" data-iv-rate="${esc(item.id)}" data-rate="learning">🔴 Cần ôn thêm</button>
                        <button class="btn sm ${mastery === 'ok' ? 'warn' : 'alt'}" data-iv-rate="${esc(item.id)}" data-rate="ok">🟡 Tạm ổn</button>
                        <button class="btn sm ${mastery === 'mastered' ? 'success' : 'alt'}" data-iv-rate="${esc(item.id)}" data-rate="mastered">🟢 Tự tin 100%</button>
                      </div>
                    </div>

                    <h3 style="font-size:16.5px;margin:8px 0">${idx + 1}. ${richText(item.question)}</h3>
                    ${item.interviewerIntent ? `<p class="muted" style="font-size:13.4px;margin-bottom:10px">🎯 <i>Ý đồ nhà tuyển dụng: ${richText(item.interviewerIntent)}</i></p>` : ''}

                    <div class="actions">
                      <button class="btn sm ${open ? 'alt' : ''}" data-iv-toggle="${esc(item.id)}">
                        ${open ? 'Ẩn đáp án mẫu' : '👁️ Mở Đáp Án Mẫu Chuẩn Senior & Bẫy Rớt Điểm'}
                      </button>
                      ${linked ? `<button class="btn sm alt" data-lesson="${esc(linked.id)}">📖 Học sâu ở Bài ${esc(linked.id)}</button>` : ''}
                    </div>

                    ${
                      open
                        ? `
                      <div class="walkthrough-box">
                        <div class="wt-step">
                          <span class="wt-label ok">✅ Khung trả lời ghi điểm tuyệt đối (Senior Answer):</span>
                          <div>${richText(item.modelAnswer)}</div>
                        </div>
                        ${
                          item.keyPoints?.length
                            ? `
                          <div class="wt-step">
                            <span class="wt-label kw">🔑 Từ khóa bắt buộc phải nhắc tới:</span>
                            <ul style="margin:6px 0 0;padding-left:18px">
                              ${item.keyPoints.map(kp => `<li>${richText(kp)}</li>`).join('')}
                            </ul>
                          </div>`
                            : ''
                        }
                        ${
                          item.redFlag
                            ? `
                          <div class="wt-step">
                            <span class="wt-label err">🚩 Điểm trừ nặng (Red Flag cần tuyệt đối tránh):</span>
                            <div>${richText(item.redFlag)}</div>
                          </div>`
                            : ''
                        }
                      </div>`
                        : ''
                    }
                  </div>`;
              })
              .join('')
          : '<div class="card empty">Không tìm thấy câu hỏi phỏng vấn khớp bộ lọc.</div>'
      }
    </div>
  `;
}

/* ================= 6. TODAY PLANNER + POMODORO + CALENDAR ================= */

function today() {
  const todo = LESSONS.filter(l => !state.done[l.id]).slice(0, 3);
  const rev = LESSONS.filter(
    l =>
      state.done[l.id] &&
      state.history
        .filter(h => h.lesson === l.id && h.type === 'completed')
        .some(h => Date.now() - new Date(h.at).getTime() > 3 * 86400000)
  ).slice(0, 3);
  const mistakes = getMistakeQuestions();

  const now = new Date();
  const y = now.getFullYear();
  const mon = now.getMonth();
  const first = new Date(y, mon, 1);
  const days = new Date(y, mon + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const counts = {};
  state.history.forEach(h => {
    const d = h.at.slice(0, 10);
    counts[d] = (counts[d] || 0) + 1;
  });
  const cells = Array.from({ length: offset }, () => '<div></div>');
  for (let i = 1; i <= days; i++) {
    const d = `${y}-${String(mon + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const n = counts[d] || 0;
    cells.push(
      `<div class="day ${n ? 'active-day' : ''} ${i === now.getDate() ? 'today' : ''}"><small>${i}</small>${n ? `<b style="color:var(--emerald);font-size:12px">✓ ${n}</b>` : '<small>—</small>'}</div>`
    );
  }

  return `
    ${heading('Kế Hoạch Học Tập & Kỷ Luật Hàng Ngày', 'Nhiệm Vụ Hôm Nay & Lịch Học Tập', `<span class="pill">Mục tiêu ${state.dailyGoal} phút/ngày</span>`)}
    <div class="two">
      <section class="card">
        <h2>3 Bài học ưu tiên tiếp theo</h2>
        ${
          todo.length
            ? todo
                .map(
                  (l, i) => `
              <div class="task-row">
                <div>
                  <b>${i + 1}. [${esc(l.id)}] ${esc(l.title)}</b><br>
                  <small>${esc(l.lab)}</small>
                </div>
                <button class="btn alt sm" data-lesson="${esc(l.id)}">Vào học →</button>
              </div>`
                )
                .join('')
            : notice('Xuất sắc! Bạn đã hoàn thành trọn vẹn 60/60 bài giảng. Hãy luyện thật kỹ 4 đề thi tuyển Senior và hoàn thiện Đồ án Core Banking!', 'success')
        }

        <h3 style="margin-top:20px">Ôn tập ngắt quãng (Spaced Repetition ≥ 3 ngày)</h3>
        ${
          rev.length
            ? rev
                .map(
                  l => `
              <div class="task-row">
                <span><b>${esc(l.id)}.</b> ${esc(l.title)}</span>
                <button class="btn alt sm" data-lesson="${esc(l.id)}">Ôn lại</button>
              </div>`
                )
                .join('')
            : '<p class="muted">Chưa có bài đã học quá 3 ngày cần nhắc ôn.</p>'
        }

        <h3 style="margin-top:20px">Sổ tay câu sai cần phục thù</h3>
        ${
          mistakes.length
            ? `<p>Bạn đang có <b>${mistakes.length} câu hỏi</b> từng làm sai trong các đề thi thử.</p>
               <button class="btn warn" id="go-mistakes-today">📕 Mở Sổ tay câu sai & Làm đề Phục thù</button>`
            : '<p class="muted">Sổ tay câu sai đang trống — phong độ rất vững!</p>'
        }
      </section>

      <section class="card">
        <h2>Đồng hồ tập trung Deep Work (Pomodoro)</h2>
        <div class="actions" style="justify-content:center;margin-top:8px">
          <button class="btn sm ${timerPreset === 25 ? '' : 'alt'}" data-pomo="25">25 phút</button>
          <button class="btn sm ${timerPreset === 50 ? '' : 'alt'}" data-pomo="50">50 phút</button>
        </div>
        <div class="metric-num" id="timer" style="font-size:50px;letter-spacing:2px;text-align:center;margin:16px 0">${timeFmt(timerSeconds)}</div>
        <div class="actions" style="justify-content:center">
          <button class="btn" id="timer-start">${timerOn ? 'Tạm dừng' : '▶ Bắt đầu tập trung'}</button>
          <button class="btn alt" id="timer-reset">Đặt lại</button>
        </div>
        <hr class="divider">
        <label class="metric-label">Mục tiêu thời gian học mỗi ngày</label>
        <select id="goal" class="field" style="width:100%;margin-top:6px">
          ${[30, 60, 90, 120, 180].map(n => `<option value="${n}" ${n === state.dailyGoal ? 'selected' : ''}>${n} phút / ngày</option>`).join('')}
        </select>
      </section>
    </div>

    <section class="card section">
      <div class="row" style="margin-bottom:12px">
        <h2>Lịch kỷ luật tháng ${mon + 1}/${y}</h2>
        <div class="kpi" style="margin:0">
          <span>${studiedDays()} ngày hoạt động</span>
          <span>${streak()} ngày liên tiếp</span>
          <span>${state.studyMinutes} phút Deep Work</span>
        </div>
      </div>
      <div class="calendar" style="margin-bottom:8px">
        ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(x => `<b style="text-align:center;color:var(--text-muted);font-size:12px">${x}</b>`).join('')}
      </div>
      <div class="calendar">${cells.join('')}</div>
    </section>
  `;
}

/* ================= 7. CAPSTONE CORE BANKING PROJECT ================= */

function project() {
  const cap = LESSONS.filter(l => l.module === 'C');
  const cvText = [
    '• Thiết kế & phát triển hệ thống Mini Digital Core Banking (Java 21, Spring Boot 3, PostgreSQL 16, Redis, Apache Kafka, React/TypeScript) theo kiến trúc Hexagonal & DDD.',
    '• Cài đặt động cơ Sổ cái Kế toán Kép (Double-Entry Immutable Ledger) kết hợp khóa chống Deadlock theo thứ tự tài khoản và Idempotency-Key, vượt qua kiểm thử tải 50 luồng rút/chuyển đồng thời không lệch số dư.',
    '• Triển khai luồng Chuyển tiền Liên ngân hàng 24/7 & sinh mã động VietQR (CRC-16 EMVCo), xử lý giao dịch phân tán bằng Saga Orchestrator + Transactional Outbox Pattern và Job Spring Batch Đối soát tự động T+0.',
    '• Bảo vệ hệ thống theo chuẩn ngân hàng với OAuth2/JWT RS256, BFF HttpOnly Cookie, Smart OTP ký gắn ngữ cảnh giao dịch (OCRA), che mờ PII tự động và giám sát toàn trình qua OpenTelemetry + Prometheus + Grafana.'
  ].join('\n');

  return `
    ${heading(
      'Đồ Án Thực Chiến Đưa Thẳng Vào CV Ứng Tuyển',
      'Capstone: Xây dựng Hệ thống Mini Digital Core Banking Full-Stack',
      `<span class="pill">🚀 6 Cột mốc từ CSDL Sổ cái đến React UI & K8s</span>`
    )}
    ${notice('<b>Tại sao đồ án này giúp CV của bạn vượt qua 95% ứng viên khác?</b> Thay vì các web CRUD bán hàng quen thuộc, bạn sở hữu một hệ thống <b>Ngân hàng số thu nhỏ</b> có đầy đủ Sổ cái Kép bất biến, chống Race Condition đa luồng, tích hợp chuyển mạch VietQR/NAPAS giả lập có kịch bản Timeout, Saga hoàn tiền, Batch đối soát T+0 và giao diện Internet Banking báo biến động số dư tức thời qua SSE!')}

    <div class="two section">
      <div class="card">
        <h2>6 Cột mốc triển khai cầm tay chỉ việc</h2>
        ${cap
          .map(
            (l, i) => `
          <div class="lesson-row">
            <div>
              <span class="tag ${state.done[l.id] ? 'green' : ''}">Milestone ${i + 1} · ${esc(l.id)}</span>
              <h3 style="margin:7px 0 4px">${esc(l.title)}</h3>
              <small>${esc(l.lab)}</small>
            </div>
            <button class="btn ${state.done[l.id] ? 'alt' : ''} sm" data-lesson="${esc(l.id)}">${state.done[l.id] ? 'Xem lại' : 'Mở hướng dẫn →'}</button>
          </div>`
          )
          .join('')}
      </div>

      <div>
        <div class="card">
          <h2>Tiêu chuẩn Nghiệm thu Chuẩn Senior Ngân Hàng</h2>
          <ul class="reading" style="margin-top:6px">
            <li>Mọi số tiền dùng <code>BigDecimal</code> (Scale chuẩn) và hạch toán qua <code>journals</code> + <code>postings</code> cân bằng tổng Nợ = Có.</li>
            <li>Chống tuyệt đối trừ tiền hai lần bằng <code>Idempotency-Key</code> và chống Deadlock khi A↔B chuyển chéo.</li>
            <li>Không giữ <code>@Transactional</code> khi gọi cổng liên ngân hàng; dùng <code>Transactional Outbox</code> đẩy sự kiện lên Kafka.</li>
            <li>Khi gặp Timeout cổng ngoài, giao dịch vào tài khoản treo <code>Suspense</code> và được Job <code>Spring Batch</code> đối soát giải quyết.</li>
            <li>Frontend <code>React + TypeScript + TanStack Query</code> kết nối qua lớp <code>BFF</code> an toàn, nhận thông báo cộng tiền thời gian thực bằng <code>SSE</code>.</li>
            <li>Chạy trọn bộ bằng 1 lệnh <code>docker compose up -d</code> kèm bộ Integration Test <code>Testcontainers</code> xanh 100%.</li>
          </ul>
        </div>

        <div class="card section">
          <div class="row">
            <h3>📄 Mẫu mô tả Dự án chuẩn Senior cho CV / LinkedIn</h3>
            <button class="btn sm alt" id="copy-cv">📋 Copy đưa vào CV</button>
          </div>
          <pre class="code standalone" style="margin-top:10px;white-space:pre-wrap">${esc(cvText)}</pre>
        </div>
      </div>
    </div>
  `;
}

/* ================= 8. MOCK EXAM & 4-STEP WALKTHROUGH CENTER ================= */

function startExamSession(examObj, mode) {
  page = 'quiz';
  activeExam = examObj;
  examRunMode = mode;
  examView = 'session';
  examCurrentIdx = 0;
  examAnswers = {};
  examFlags = {};
  examRevealed = {};
  examStartedAt = Date.now();
  examSecondsLeft = (examObj.durationMinutes || 45) * 60;
  if (examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
  render();
  window.scrollTo(0, 0);
}

function submitActiveExam(autoExpired = false) {
  if (!activeExam) return;
  const qs = activeExam.questions;
  const answeredCount = Object.keys(examAnswers).length;
  if (!autoExpired && answeredCount < qs.length) {
    if (!confirm(`Bạn mới trả lời ${answeredCount}/${qs.length} câu hỏi. Vẫn nộp bài ngay để chấm điểm và xem giải thích 4 bước?`)) {
      return;
    }
  }
  if (examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
  examElapsedSeconds = Math.max(1, Math.round((Date.now() - examStartedAt) / 1000));

  let correct = 0;
  const domainMap = {};
  qs.forEach((q, i) => {
    const dom = q.domain || 'Tổng hợp';
    if (!domainMap[dom]) domainMap[dom] = { correct: 0, total: 0 };
    domainMap[dom].total++;
    const userChoice = examAnswers[i];
    const ok = userChoice !== undefined && Number(userChoice) === q.answer;
    if (ok) {
      correct++;
      domainMap[dom].correct++;
      if (activeExam.isMistakeDrill && state.mistakes[q.id]) {
        delete state.mistakes[q.id];
      }
    } else if (!activeExam.isWarmup) {
      const prev = state.mistakes[q.id] || { count: 0 };
      state.mistakes[q.id] = {
        count: prev.count + 1,
        lastChoice: userChoice !== undefined ? Number(userChoice) : null,
        at: new Date().toISOString(),
        cert: activeExam.cert
      };
    }
  });

  const s1000 = scaledScore(correct, qs.length);
  const p = pct(correct, qs.length);
  state.exam.push({
    mode: activeExam.cert,
    examId: activeExam.id,
    examTitle: activeExam.title,
    runMode: examRunMode,
    score1000: s1000,
    percent: p,
    correct,
    total: qs.length,
    elapsedSeconds: examElapsedSeconds,
    domainStats: domainMap,
    at: new Date().toISOString()
  });
  record('exam', activeExam.id);
  reviewFilter = 'all';
  reviewDomain = 'all';
  examView = 'review';
  render();
  window.scrollTo(0, 0);
}

function renderWalkthroughBlock(q, userChoice, showChoiceVerdict = true) {
  const wt = q.walkthrough || {};
  const hasChosen = userChoice !== undefined && userChoice !== null;
  const isRight = hasChosen && Number(userChoice) === q.answer;
  const linkedLesson = LESSONS.find(l => l.id === q.lessonId);

  return `
    <div class="walkthrough-box">
      <div class="row" style="margin-bottom:6px">
        <strong style="color:var(--blue-text);font-size:14.8px">👨‍💻 Senior chữa chi tiết 4 bước</strong>
        ${
          showChoiceVerdict
            ? `<span class="tag ${isRight ? 'green' : 'red'}">${
                isRight
                  ? '✓ Bạn chọn đúng (' + String.fromCharCode(65 + q.answer) + ')'
                  : hasChosen
                    ? '✕ Bạn chọn ' + String.fromCharCode(65 + Number(userChoice)) + ' · Đáp án đúng: ' + String.fromCharCode(65 + q.answer)
                    : '⚠️ Bỏ trống · Đáp án đúng: ' + String.fromCharCode(65 + q.answer)
              }</span>`
            : `<span class="tag green">Đáp án chuẩn: ${String.fromCharCode(65 + q.answer)}</span>`
        }
      </div>

      ${
        wt.keyword
          ? `
        <div class="wt-step">
          <span class="wt-label kw">🎯 Bước 1 — Dấu hiệu & Từ khóa cốt lõi trong đề:</span>
          <div>${richText(wt.keyword)}</div>
        </div>`
          : ''
      }

      <div class="wt-step">
        <span class="wt-label ok">✅ Bước 2 — Bản chất kỹ thuật (Vì sao ${String.fromCharCode(65 + q.answer)} ĐÚNG?):</span>
        <div>${richText(wt.whyCorrect || '')}</div>
      </div>

      ${
        Array.isArray(wt.whyWrong) && wt.whyWrong.some((w, wi) => wi !== q.answer && w)
          ? `
        <div class="wt-step">
          <span class="wt-label err">❌ Bước 3 — Mổ xẻ phương án bẫy (Vì sao các câu kia gây sự cố?):</span>
          <ul style="margin:6px 0 0;padding-left:19px">
            ${wt.whyWrong
              .map((reason, wi) =>
                wi !== q.answer && reason
                  ? `<li style="margin-bottom:5px"><b>Phương án ${String.fromCharCode(65 + wi)}${hasChosen && Number(userChoice) === wi ? ' (Lựa chọn của bạn)' : ''}:</b> ${richText(reason)}</li>`
                  : ''
              )
              .join('')}
          </ul>
        </div>`
          : ''
      }

      <div class="wt-step">
        <span class="wt-label tip">💡 Bước 4 — Phản xạ nhanh khi thi tuyển & Bài học gốc:</span>
        <div>${richText(wt.tip || '')}</div>
        ${
          linkedLesson
            ? `<div style="margin-top:9px">
                 <button class="btn alt sm" data-lesson="${esc(linkedLesson.id)}">📖 Ôn lại Bài ${esc(linkedLesson.id)}: ${esc(linkedLesson.title)} →</button>
               </div>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderExamHub() {
  const allSets = getAllExamSets();
  const mistakes = getMistakeQuestions();
  const certs = Array.from(new Set(allSets.map(s => s.cert)));
  const filteredSets = allSets.filter(s => examCertFilter === 'all' || s.cert === examCertFilter);

  return `
    ${heading(
      'Mô Phỏng Bài Test Kỹ Thuật Tuyển Dụng Ngân Hàng & Fintech',
      'Phòng Thi Thử Bấm Giờ & Chấm Chữa 4 Bước',
      `<span class="pill">Thang điểm 100–1000 · Đạt chuẩn Senior ≥ 700</span>`
    )}
    ${notice('Mỗi bộ đề thi tuyển gồm <b>Case Study hệ thống Ngân hàng số thực tế + 25 câu hỏi tình huống phân loại ứng viên Senior</b>. Bạn có thể chọn <b>⏱️ Thi thử bấm giờ</b> (áp lực thời gian thật) hoặc <b>👨‍💻 Luyện đề & Xem chữa ngay</b> sau từng câu.')}

    <div class="section toolbar">
      <button class="btn ${examCertFilter === 'all' ? '' : 'alt'}" data-cert-tab="all">Tất cả bộ đề (${allSets.length})</button>
      ${certs.map(c => `<button class="btn ${examCertFilter === c ? '' : 'alt'}" data-cert-tab="${esc(c)}">${esc(c)}</button>`).join('')}
      <button class="btn ${examCertFilter === 'mistakes' ? 'warn' : 'alt'}" data-cert-tab="mistakes">📕 Sổ tay câu sai (${mistakes.length})</button>
      <button class="btn ${examCertFilter === 'history' ? '' : 'alt'}" data-cert-tab="history">📊 Lịch sử điểm (${state.exam.length})</button>
    </div>

    ${
      examCertFilter === 'mistakes'
        ? `
      <div class="card">
        <div class="row">
          <div>
            <h2>📕 Sổ tay câu sai tự động (${mistakes.length} câu)</h2>
            <p class="muted" style="margin:4px 0 0">Mọi câu làm sai trong các đề thi tuyển đều được gom vào đây. Khi bạn làm Đề Phục Thù và trả lời đúng, câu đó sẽ tự động được xóa khỏi sổ!</p>
          </div>
          ${
            mistakes.length
              ? `<div class="actions">
                   <button class="btn" id="start-mistake-drill">▶ Làm Đề Phục Thù (${mistakes.length} câu)</button>
                   <button class="btn danger sm" id="clear-all-mistakes">Xóa sạch sổ</button>
                 </div>`
              : ''
          }
        </div>
        <hr class="divider">
        ${
          mistakes.length
            ? mistakes
                .map(
                  (q, idx) => `
              <div class="question-card">
                <div class="row" style="margin-bottom:8px">
                  <div class="actions">
                    <span class="tag">${esc(q._meta?.cert || '')}</span>
                    <span class="tag gray">${esc(q.domain)}</span>
                    <span class="tag red">Sai ${q._meta?.count || 1} lần</span>
                  </div>
                  <button class="btn alt sm" data-remove-mistake="${esc(q.id)}">✓ Đã thuộc — Xóa câu này</button>
                </div>
                ${q.caseStudy ? `<details class="case-study-box"><summary>📋 Bối cảnh ${esc(q.caseStudy.title)}</summary><p style="margin:8px 0 0">${richText(q.caseStudy.context)}</p></details>` : ''}
                <p style="font-weight:700;margin:8px 0">${idx + 1}. ${richText(q.question)}</p>
                ${q.options
                  .map(
                    (opt, oi) => `
                  <div class="quiz-option ${oi === q.answer ? 'opt-correct' : q._meta?.lastChoice === oi ? 'opt-wrong' : ''}" style="cursor:default">
                    <span><b>${String.fromCharCode(65 + oi)}.</b> ${richText(opt)}</span>
                  </div>`
                  )
                  .join('')}
                ${renderWalkthroughBlock(q, q._meta?.lastChoice, true)}
              </div>`
                )
                .join('')
            : '<div class="empty">Sổ tay câu sai đang trống. Hãy thử sức với Đề Thi Tuyển Số 1 nhé!</div>'
        }
      </div>`
        : examCertFilter === 'history'
          ? `
      <div class="card">
        <h2>📊 Lịch sử các lần nộp bài thi thử (${state.exam.length} lượt)</h2>
        ${
          state.exam.length
            ? `
          <div class="table-wrap">
            <table class="comp-table">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Bộ đề</th>
                  <th>Chế độ</th>
                  <th>Số câu đúng</th>
                  <th>Điểm quy đổi</th>
                  <th>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                ${[...state.exam]
                  .reverse()
                  .map(h => {
                    const sc = h.score1000 || scaledScore(h.percent, 100);
                    const pass = sc >= 700;
                    return `
                      <tr>
                        <td>${esc(h.at.slice(0, 16).replace('T', ' '))}</td>
                        <td><b>${esc(h.examTitle || h.mode)}</b></td>
                        <td>${h.runMode === 'practice' ? 'Luyện & chữa ngay' : 'Thi bấm giờ'}</td>
                        <td>${h.correct}/${h.total} (${h.percent}%)</td>
                        <td><b style="color:${pass ? 'var(--emerald)' : 'var(--danger)'}">${sc} / 1000</b></td>
                        <td><span class="tag ${pass ? 'green' : 'red'}">${pass ? '✓ ĐẠT CHUẨN SENIOR' : 'CẦN ÔN THÊM'}</span></td>
                      </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>`
            : '<div class="empty">Chưa có lượt thi nào được ghi nhận.</div>'
        }
      </div>`
          : `
      <div class="exam-grid">
        ${filteredSets
          .map(ex => {
            const attempts = state.exam.filter(h => h.examId === ex.id);
            const best = attempts.length ? Math.max(...attempts.map(a => a.score1000 || scaledScore(a.percent, 100))) : null;
            const hasCaseStudy = ex.questions.some(q => q.caseStudy);
            return `
              <div class="card exam-card">
                <div>
                  <div class="row">
                    <div class="actions">
                      <span class="tag ${ex.isWarmup ? 'gray' : 'green'}">${esc(ex.cert)}</span>
                      ${hasCaseStudy ? '<span class="tag purple">📋 Case Study Ngân hàng</span>' : ''}
                      <span class="tag gray">${ex.questions.length} câu · ${ex.durationMinutes} phút</span>
                    </div>
                    ${
                      best !== null
                        ? `<span class="tag ${best >= 700 ? 'green' : 'orange'}">Cao nhất: ${best}/1000</span>`
                        : '<span class="tag gray">Chưa làm</span>'
                    }
                  </div>
                  <h3 style="font-size:18px;margin:12px 0 6px">${esc(ex.title)}</h3>
                  <p class="muted" style="margin:0;font-size:14px">${esc(ex.subtitle || '')}</p>
                </div>
                <div>
                  <hr class="divider" style="margin:14px 0">
                  <div class="actions">
                    <button class="btn" data-start-exam="${esc(ex.id)}" data-mode="timed">⏱️ Thi thử bấm giờ</button>
                    <button class="btn alt" data-start-exam="${esc(ex.id)}" data-mode="practice">👨‍💻 Vừa làm vừa xem chữa</button>
                  </div>
                </div>
              </div>`;
          })
          .join('')}
      </div>`
    }
  `;
}

function renderSingleQuestionCard(q, idx, total) {
  const chosen = examAnswers[idx];
  const hasChosen = chosen !== undefined && chosen !== null;
  const isFlagged = !!examFlags[idx];
  const isRevealed = examRunMode === 'practice' && !!examRevealed[idx];

  return `
    ${
      q.caseStudy
        ? `
      <details class="case-study-box" ${idx === 0 || examSingleMode ? 'open' : ''}>
        <summary>📋 ${esc(q.caseStudy.title)} (Bấm để thu gọn / mở rộng bối cảnh kiến trúc)</summary>
        <p style="margin:10px 0 0">${richText(q.caseStudy.context)}</p>
      </details>`
        : ''
    }
    <div class="question-card ${isFlagged ? 'flagged' : ''}" id="qcard-${idx}">
      <div class="row" style="margin-bottom:10px">
        <div class="actions">
          <span class="tag">Câu ${idx + 1} / ${total}</span>
          <span class="tag gray">${esc(q.domain || '')}</span>
          ${q.difficulty ? `<span class="tag ${q.difficulty.includes('Khó') ? 'orange' : 'purple'}">${esc(q.difficulty)}</span>` : ''}
        </div>
        <button class="btn sm ${isFlagged ? 'warn' : 'alt'}" data-flag="${idx}">
          ${isFlagged ? '🚩 Đã đánh dấu xem lại' : '🏳️ Đánh dấu phân vân'}
        </button>
      </div>

      <p style="font-weight:700;font-size:15.8px;margin:8px 0 12px">${richText(q.question)}</p>

      <div>
        ${q.options
          .map((opt, oi) => {
            let cls = '';
            if (isRevealed) {
              if (oi === q.answer) cls = 'opt-correct';
              else if (hasChosen && Number(chosen) === oi) cls = 'opt-wrong';
            }
            const cleanOpt = String(opt).replace(/^[A-D]\.\s*/, '');
            return `
              <label class="quiz-option ${cls}">
                <input type="radio" name="exam_q_${idx}" value="${oi}" ${hasChosen && Number(chosen) === oi ? 'checked' : ''}>
                <span><b>${String.fromCharCode(65 + oi)}.</b> ${richText(cleanOpt)}</span>
              </label>`;
          })
          .join('')}
      </div>

      ${
        examRunMode === 'practice'
          ? `
        <div class="actions" style="margin-top:12px">
          <button class="btn sm ${isRevealed ? 'alt' : ''}" data-reveal="${idx}">
            ${isRevealed ? 'Ẩn lời giải' : '👨‍💻 Xem chữa chi tiết câu này ngay'}
          </button>
        </div>
        ${isRevealed ? renderWalkthroughBlock(q, chosen, hasChosen) : ''}`
          : ''
      }
    </div>
  `;
}

function renderExamSession() {
  if (!activeExam) {
    examView = 'hub';
    return renderExamHub();
  }
  const qs = activeExam.questions;
  const answeredCount = Object.keys(examAnswers).length;
  const flagCount = Object.keys(examFlags).filter(k => examFlags[k]).length;

  return `
    ${heading(
      `${esc(activeExam.cert)} · ${examRunMode === 'timed' ? '⏱️ Phòng thi bấm giờ' : '👨‍💻 Luyện đề & Chữa trực tiếp'}`,
      esc(activeExam.title),
      `<button class="btn alt sm" id="toggle-exam-layout">${examSingleMode ? '▤ Xem toàn bộ trên 1 trang' : '▢ Chế độ từng câu'}</button>
       <button class="btn danger sm" id="exit-exam">Thoát đề</button>`
    )}

    <div class="exam-runner">
      <div>
        ${
          examSingleMode
            ? `
          ${renderSingleQuestionCard(qs[examCurrentIdx], examCurrentIdx, qs.length)}
          <div class="row card" style="padding:14px 18px">
            <button class="btn alt" id="exam-prev" ${examCurrentIdx === 0 ? 'disabled' : ''}>← Câu trước</button>
            <span>Câu <b>${examCurrentIdx + 1}</b> / ${qs.length}</span>
            ${
              examCurrentIdx < qs.length - 1
                ? `<button class="btn" id="exam-next">Câu tiếp theo →</button>`
                : `<button class="btn success" id="submit-exam-bottom">✓ Nộp bài & Chấm điểm</button>`
            }
          </div>`
            : qs.map((q, i) => renderSingleQuestionCard(q, i, qs.length)).join('')
        }
      </div>

      <aside>
        <div class="card" style="position:sticky;top:20px">
          ${
            examRunMode === 'timed'
              ? `
            <div class="metric-label">Thời gian còn lại</div>
            <div class="metric-num" id="exam-clock" style="font-size:36px;color:${examSecondsLeft < 300 ? 'var(--danger)' : 'var(--text)'}">${timeFmt(examSecondsLeft)}</div>`
              : `
            <div class="metric-label">Chế độ luyện đề mở</div>
            <div style="font-weight:800;color:var(--primary);margin:6px 0 10px">Không giới hạn thời gian</div>`
          }
          ${progress(pct(answeredCount, qs.length), 'green')}
          <p style="margin:8px 0 10px">
            <small>Đã chọn: <b>${answeredCount}/${qs.length}</b> · Phân vân: <b>${flagCount}</b></small>
          </p>

          <div class="palette-grid">
            ${qs
              .map((q, i) => {
                const ans = examAnswers[i] !== undefined;
                const flg = !!examFlags[i];
                const cur = examSingleMode && examCurrentIdx === i;
                let stateCls = ans ? 'answered' : '';
                if (examRunMode === 'practice' && examRevealed[i] && ans) {
                  stateCls = Number(examAnswers[i]) === q.answer ? 'right' : 'wrong';
                }
                return `<button class="p-btn ${stateCls} ${flg ? 'flagged' : ''} ${cur ? 'current' : ''}" data-jump="${i}">${i + 1}</button>`;
              })
              .join('')}
          </div>

          <button class="btn success" id="submit-exam" style="width:100%;margin-top:8px">
            ✓ Nộp bài & Chấm điểm tự động
          </button>
        </div>
      </aside>
    </div>
  `;
}

function renderExamReview() {
  if (!activeExam) {
    examView = 'hub';
    return renderExamHub();
  }
  const qs = activeExam.questions;
  let correctCount = 0;
  const domainStats = {};
  qs.forEach((q, i) => {
    const dom = q.domain || 'Tổng hợp';
    if (!domainStats[dom]) domainStats[dom] = { correct: 0, total: 0 };
    domainStats[dom].total++;
    if (examAnswers[i] !== undefined && Number(examAnswers[i]) === q.answer) {
      correctCount++;
      domainStats[dom].correct++;
    }
  });

  const s1000 = scaledScore(correctCount, qs.length);
  const passed = s1000 >= (activeExam.passingScore || 700);
  const wrongCount = qs.length - correctCount;
  const flagCount = Object.keys(examFlags).filter(k => examFlags[k]).length;
  const domains = Object.keys(domainStats);
  const weakDomains = domains.filter(d => pct(domainStats[d].correct, domainStats[d].total) < 70);

  const visibleQuestions = qs
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => {
      const isRight = examAnswers[idx] !== undefined && Number(examAnswers[idx]) === q.answer;
      if (reviewFilter === 'wrong' && isRight) return false;
      if (reviewFilter === 'correct' && !isRight) return false;
      if (reviewFilter === 'flagged' && !examFlags[idx]) return false;
      if (reviewDomain !== 'all' && q.domain !== reviewDomain) return false;
      return true;
    });

  return `
    ${heading(
      `Kết Quả Chấm Điểm & Phân Tích Năng Lực · ${esc(activeExam.cert)}`,
      esc(activeExam.title),
      `<button class="btn alt" id="retry-this-exam">↻ Thi lại đề này</button>
       <button class="btn" id="back-exam-hub">← Danh sách bộ đề</button>`
    )}

    <div class="score-banner ${passed ? 'pass' : ''}">
      <div class="score-circle">
        <small style="color:rgba(255,255,255,0.85)">Điểm quy đổi</small>
        <strong>${s1000}</strong>
        <small style="color:rgba(255,255,255,0.9)">/ 1000</small>
      </div>
      <div>
        <div class="eyebrow" style="color:rgba(255,255,255,0.88)">${passed ? '✓ ĐẠT NGƯỠNG SENIOR TUYỂN DỤNG (≥ 700/1000)' : '⚠️ CHƯA ĐẠT NGƯỠNG 700 — CẦN LẤP LỖ HỔNG KIẾN THỨC'}</div>
        <h2 style="color:#fff;margin:6px 0 8px">
          Đúng ${correctCount} / ${qs.length} câu (${pct(correctCount, qs.length)}%) · Thời gian: ${timeFmt(examElapsedSeconds)}
        </h2>
        <p style="margin:0;color:rgba(255,255,255,0.92)">
          ${
            passed
              ? 'Nền tảng kỹ thuật của bạn rất chắc chắn! Hãy đọc lướt lại phần phân tích phương án nhiễu bên dưới để nắm trọn cách lập luận trước hội đồng phỏng vấn.'
              : `Toàn bộ câu chưa đúng đã được lưu tự động vào <b>Sổ tay câu sai</b>.${weakDomains.length ? ` Hãy ưu tiên ôn kỹ miền: <b>${esc(weakDomains.join(', '))}</b>.` : ''}`
          }
        </p>
      </div>
    </div>

    <div class="card section">
      <h2>📊 Biểu đồ năng lực theo từng Miền kỹ thuật</h2>
      <div class="domain-bars">
        ${domains
          .map(dom => {
            const st = domainStats[dom];
            const dp = pct(st.correct, st.total);
            const barColor = dp >= 75 ? 'green' : dp >= 50 ? 'orange' : 'red';
            return `
              <div>
                <div class="row" style="margin-bottom:5px">
                  <strong>${esc(dom)}</strong>
                  <span><b>${st.correct}/${st.total}</b> (${dp}%) · <b style="color:${dp < 70 ? 'var(--danger)' : 'var(--emerald)'}">${dp < 70 ? 'Cần củng cố' : 'Vững vàng'}</b></span>
                </div>
                ${progress(dp, barColor)}
              </div>`;
          })
          .join('')}
      </div>
    </div>

    <div class="section toolbar">
      <button class="btn ${reviewFilter === 'all' ? '' : 'alt'}" data-rev-filter="all">Tất cả (${qs.length})</button>
      <button class="btn ${reviewFilter === 'wrong' ? 'danger' : 'alt'}" data-rev-filter="wrong">✕ Câu sai / Bỏ trống (${wrongCount})</button>
      <button class="btn ${reviewFilter === 'flagged' ? 'warn' : 'alt'}" data-rev-filter="flagged">🚩 Câu phân vân (${flagCount})</button>
      <button class="btn ${reviewFilter === 'correct' ? 'success' : 'alt'}" data-rev-filter="correct">✓ Câu đúng (${correctCount})</button>
      <select class="field" id="review-domain-select">
        <option value="all">Tất cả miền kỹ thuật</option>
        ${domains.map(dom => `<option value="${esc(dom)}" ${reviewDomain === dom ? 'selected' : ''}>${esc(dom)}</option>`).join('')}
      </select>
    </div>

    <div>
      ${
        visibleQuestions.length
          ? visibleQuestions
              .map(({ q, idx }) => {
                const userChoice = examAnswers[idx];
                const hasChosen = userChoice !== undefined && userChoice !== null;
                return `
                  <div class="question-card">
                    <div class="row" style="margin-bottom:8px">
                      <div class="actions">
                        <span class="tag">Câu ${idx + 1}</span>
                        <span class="tag gray">${esc(q.domain || '')}</span>
                        ${examFlags[idx] ? '<span class="tag orange">🚩 Đánh dấu phân vân</span>' : ''}
                      </div>
                      <span class="tag gray">${esc(q.id)}</span>
                    </div>
                    ${q.caseStudy ? `<details class="case-study-box"><summary>📋 Bối cảnh ${esc(q.caseStudy.title)}</summary><p style="margin:8px 0 0">${richText(q.caseStudy.context)}</p></details>` : ''}
                    <p style="font-weight:700;font-size:15.8px;margin:8px 0 12px">${richText(q.question)}</p>
                    <div>
                      ${q.options
                        .map((opt, oi) => {
                          const cleanOpt = String(opt).replace(/^[A-D]\.\s*/, '');
                          const cls = oi === q.answer ? 'opt-correct' : hasChosen && Number(userChoice) === oi ? 'opt-wrong' : '';
                          return `
                            <div class="quiz-option ${cls}" style="cursor:default">
                              <span>
                                <b>${String.fromCharCode(65 + oi)}.</b> ${richText(cleanOpt)}
                                ${oi === q.answer ? ' &nbsp;<b>(✓ Đáp án đúng)</b>' : ''}
                                ${hasChosen && Number(userChoice) === oi && oi !== q.answer ? ' &nbsp;<b>(✕ Lựa chọn của bạn)</b>' : ''}
                              </span>
                            </div>`;
                        })
                        .join('')}
                    </div>
                    ${renderWalkthroughBlock(q, userChoice, true)}
                  </div>`;
              })
              .join('')
          : '<div class="card empty">Không có câu hỏi nào khớp bộ lọc.</div>'
      }
    </div>
  `;
}

function quiz() {
  if (examView === 'session') return renderExamSession();
  if (examView === 'review') return renderExamReview();
  return renderExamHub();
}

/* ================= 8B. SAVED EXAMPLES VAULT & 360+ EXAMPLES EXPLORER ================= */

function exportSavedExamplesMarkdown() {
  const catalog = getAllExamplesCatalog();
  const savedList = catalog.filter(ex => state.savedExamples && state.savedExamples[ex.id]);
  if (!savedList.length) {
    alert('Bạn chưa lưu ví dụ nào vào Sổ tay. Hãy bấm "🔖 Lưu ví dụ hay" ở các ví dụ bạn tâm đắc trước nhé!');
    return;
  }
  const lines = [
    '# 🔖 Sổ Tay Ví Dụ Hay — FinJava Senior Academy',
    `> Xuất ngày: ${new Date().toLocaleString('vi-VN')} · Tổng cộng: ${savedList.length} ví dụ tâm đắc`,
    ''
  ];
  savedList.forEach((ex, i) => {
    const note = state.savedExamples[ex.id]?.note;
    lines.push(`## ${i + 1}. [${ex.lessonId}] ${ex.title} (${ex.type})`);
    lines.push(`- **Bài học gốc:** ${ex.lessonId} — ${ex.lessonTitle}`);
    if (ex.scenario) lines.push(`- **Bối cảnh:** ${ex.scenario}`);
    if (note) lines.push(`- **📝 Ghi chú của tôi:** ${note}`);
    lines.push('');
    if (ex.story) lines.push(ex.story, '');
    if (ex.badCode && ex.goodCode) {
      lines.push('### ❌ Cách viết dễ gây lỗi:', '```' + (ex.lang || 'java'), ex.badCode, '```', '');
      lines.push('### ✅ Cách viết chuẩn Senior Ngân hàng:', '```' + (ex.lang || 'java'), ex.goodCode, '```', '');
    } else if (ex.code) {
      lines.push('```' + (ex.lang || 'java'), ex.code, '```', '');
    }
    if (ex.takeaway) lines.push(`> 💡 **Bí kíp nhớ nhanh:** ${ex.takeaway}`, '');
    lines.push('---', '');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'so-tay-vi-du-finjava-' + dateKey(new Date()) + '.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderExamplesHub() {
  const catalog = getAllExamplesCatalog();
  const savedIds = Object.keys(state.savedExamples || {});
  const baseList =
    exHubMode === 'saved'
      ? catalog.filter(ex => state.savedExamples && state.savedExamples[ex.id])
      : catalog;

  const q = exHubSearch.trim().toLowerCase();
  const filtered = baseList.filter(ex => {
    const note = (state.savedExamples?.[ex.id]?.note || '').toLowerCase();
    const matchQ =
      !q ||
      ex.title.toLowerCase().includes(q) ||
      (ex.scenario || '').toLowerCase().includes(q) ||
      (ex.story || '').toLowerCase().includes(q) ||
      (ex.takeaway || '').toLowerCase().includes(q) ||
      ex.lessonId.toLowerCase().includes(q) ||
      note.includes(q);
    const matchMod = exHubModule === 'all' || ex.module === exHubModule;
    const matchType = exHubType === 'all' || ex.type === exHubType;
    return matchQ && matchMod && matchType;
  });

  const shown = filtered.slice(0, 80);

  return `
    ${heading(
      'Kho Tình Huống Thực Chiến & Sổ Tay Cá Nhân Hóa',
      'Sổ Tay Ví Dụ Hay & Kho 360+ Ví Dụ Ngân Hàng',
      `<div class="actions">
         <button class="btn alt sm" id="export-ex-md">⬇ Xuất Sổ tay ra Markdown (.md)</button>
         <span class="pill">🔖 Đã lưu ${savedIds.length} / ${catalog.length} ví dụ</span>
       </div>`
    )}

    ${notice('Mỗi bài học đều đi kèm <b>6 ví dụ đa chiều</b> (Ví dụ liên hệ đời thường + 4 Ví dụ tình huống thực tế <i>Sai vs Đúng / Kịch bản Ngân hàng / Sự cố Edge Case / Thực chiến Tích hợp</i> + Ví dụ Code Production). Mọi ví dụ bạn bấm <b>"🔖 Lưu ví dụ hay"</b> đều nằm tại đây kèm ghi chú cá nhân để đọc lướt cực nhanh trước giờ phỏng vấn!')}

    <div class="toolbar section">
      <button class="btn ${exHubMode === 'saved' ? 'warn' : 'alt'}" data-ex-mode="saved">★ Ví dụ tôi đã lưu (${savedIds.length})</button>
      <button class="btn ${exHubMode === 'all' ? '' : 'alt'}" data-ex-mode="all">📚 Khám phá toàn bộ Kho Ví Dụ (${catalog.length})</button>
      ${
        exHubMode === 'saved' && savedIds.length
          ? `<button class="btn danger sm" id="clear-saved-ex" style="margin-left:auto">Xóa danh sách đã lưu</button>`
          : ''
      }
    </div>

    <div class="toolbar">
      <input class="field" id="ex-hub-search" placeholder="Tìm ví dụ theo tình huống, code, ghi chú (VD: BigDecimal, Deadlock, VietQR, Timeout, BOLA, React, ZGC)..." value="${esc(exHubSearch)}">
      <select class="field" id="ex-hub-mod">
        <option value="all">Tất cả 10 Học phần</option>
        ${MODULES.map(m => `<option value="${esc(m.id)}" ${exHubModule === m.id ? 'selected' : ''}>Học phần ${esc(m.id)}: ${esc(m.title.slice(0, 34))}…</option>`).join('')}
      </select>
      <select class="field" id="ex-hub-type">
        <option value="all" ${exHubType === 'all' ? 'selected' : ''}>Mọi loại ví dụ</option>
        <option value="Sai vs Đúng" ${exHubType === 'Sai vs Đúng' ? 'selected' : ''}>⚖️ So sánh Sai vs Đúng</option>
        <option value="Kịch bản Ngân hàng" ${exHubType === 'Kịch bản Ngân hàng' ? 'selected' : ''}>🏦 Kịch bản Ngân hàng</option>
        <option value="Sự cố & Edge Case" ${exHubType === 'Sự cố & Edge Case' ? 'selected' : ''}>🚨 Sự cố & Edge Case</option>
        <option value="Thực chiến Tích hợp" ${exHubType === 'Thực chiến Tích hợp' ? 'selected' : ''}>🔗 Thực chiến Tích hợp</option>
        <option value="Liên hệ Đời thường" ${exHubType === 'Liên hệ Đời thường' ? 'selected' : ''}>💡 Liên hệ Đời thường</option>
        <option value="Code Production" ${exHubType === 'Code Production' ? 'selected' : ''}>💻 Code Production</option>
      </select>
    </div>

    ${
      filtered.length
        ? `
      <p class="muted" style="font-size:13.3px">Đang hiển thị <b>${shown.length}</b> / <b>${filtered.length}</b> ví dụ khớp bộ lọc:</p>
      <div>
        ${shown.map((ex, i) => renderExampleCard(ex, { showLessonLink: true, idxLabel: `#${i + 1}` })).join('')}
      </div>
      ${
        filtered.length > shown.length
          ? `<div class="notice" style="margin-top:16px">Đang hiển thị 80 ví dụ đầu tiên để trang mượt nhất — hãy gõ từ khóa hoặc chọn Học phần ở thanh công cụ phía trên để lọc sâu hơn!</div>`
          : ''
      }`
        : exHubMode === 'saved'
          ? `
      <div class="card empty">
        <h3 style="margin-bottom:8px">Sổ tay Ví dụ hay của bạn đang trống</h3>
        <p class="muted">Trong lúc đọc bất kỳ bài giảng nào, hãy bấm nút <b>"🔖 Lưu ví dụ hay"</b> ở những ví dụ bạn tâm đắc, hoặc chuyển sang tab <b>Khám phá toàn bộ Kho Ví Dụ (${catalog.length})</b> ngay bên dưới để chọn lưu!</p>
        <div class="actions" style="justify-content:center;margin-top:14px">
          <button class="btn" data-ex-mode="all">📚 Mở Kho ${catalog.length} Ví Dụ Toàn Khóa</button>
          <button class="btn alt" data-lesson="${esc(selected)}">📖 Quay lại bài đang học (${esc(selected)})</button>
        </div>
      </div>`
          : '<div class="card empty">Không tìm thấy ví dụ nào khớp với từ khóa tìm kiếm hiện tại.</div>'
    }
  `;
}

/* ================= 9. CLOUD SYNC, DEPLOY & SETTINGS ================= */

function encodeSyncToken() {
  const compact = {
    v: 1,
    d: state.done,
    c: state.checks,
    q: state.quiz,
    m: state.mistakes,
    b: state.bookmarks,
    x: state.savedExamples,
    i: state.interviewMastery,
    r: state.codeReviewScores,
    k: state.careerChecks,
    s: state.studyMinutes,
    e: state.exam.slice(-20)
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return 'FJS1:' + btoa(bin);
}

function decodeSyncToken(tokenStr) {
  const clean = String(tokenStr || '').trim();
  if (!clean.startsWith('FJS1:')) throw new Error('Mã đồng bộ phải bắt đầu bằng FJS1:');
  const bin = atob(clean.slice(5));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const obj = JSON.parse(new TextDecoder().decode(bytes));
  return {
    ...state,
    done: obj.d || {},
    checks: obj.c || {},
    quiz: obj.q || {},
    mistakes: obj.m || {},
    bookmarks: obj.b || {},
    savedExamples: obj.x || state.savedExamples || {},
    interviewMastery: obj.i || {},
    codeReviewScores: obj.r || {},
    careerChecks: obj.k || {},
    studyMinutes: Number(obj.s) || 0,
    exam: Array.isArray(obj.e) ? obj.e : state.exam
  };
}

function settings() {
  return `
    ${heading('Học Mọi Lúc Mọi Nơi · Điện Thoại, Máy Tính Bảng & Laptop', 'Đồng Bộ Đa Thiết Bị & Đẩy Online')}

    <div class="two">
      <section class="card">
        <h2>📲 Đồng bộ tiến độ siêu tốc giữa Máy tính & Điện thoại</h2>
        <p>Khi bạn mở website online trên iPhone/Android hoặc laptop công ty, chỉ cần bấm <b>Copy Mã Đồng Bộ</b> ở máy cũ rồi dán vào máy mới — toàn bộ bài đã học, điểm thi và sổ tay câu sai sẽ đồng bộ ngay lập tức mà không cần tạo tài khoản!</p>
        <div class="actions" style="margin-bottom:10px">
          <button class="btn" id="copy-sync-code">📋 Copy Mã Đồng Bộ hiện tại</button>
          ${deferredInstallPrompt ? `<button class="btn success" id="install-pwa">📲 Cài đặt như App lên máy</button>` : ''}
        </div>
        <textarea class="field" id="sync-input" placeholder="Dán Mã Đồng Bộ (bắt đầu bằng FJS1:...) từ thiết bị khác vào đây để khôi phục tiến độ..."></textarea>
        <div class="actions" style="margin-top:9px">
          <button class="btn alt" id="apply-sync-code">🔄 Nạp Mã Đồng Bộ vào máy này</button>
        </div>

        <hr class="divider">
        <h3>Sao lưu toàn phần ra File JSON (Gồm cả Ghi chú dài)</h3>
        <div class="actions">
          <button class="btn alt" id="export">⬇ Xuất file Backup (.json)</button>
          <label class="btn alt" for="import-file" style="cursor:pointer">⬆ Nhập file Backup (.json)</label>
          <input type="file" id="import-file" accept="application/json,.json" style="display:none">
        </div>
      </section>

      <section class="card">
        <h2>🌐 Đẩy Website Lên Online Miễn Phí (Truy Cập Mọi Nơi)</h2>
        <p>Dự án đã được cấu hình sẵn chuẩn <b>Static PWA + CDN</b> (có sẵn <code>vercel.json</code>, <code>netlify.toml</code>, <code>.github/workflows/deploy.yml</code> và <code>deploy-online.bat</code>). Bạn có thể đẩy online vĩnh viễn chỉ trong 30 giây bằng 1 trong 3 cách:</p>
        <div class="lab-step-list">
          <div class="lab-step"><b>Cách 1 (Nhanh nhất — Kéo thả 10 giây không cần gõ lệnh):</b> Mở trang <code>https://app.netlify.com/drop</code> hoặc <code>https://pages.cloudflare.com</code>, kéo nguyên thư mục <code>java-banking-academy</code> thả vào trình duyệt → Có ngay link HTTPS vĩnh viễn mở trên mọi điện thoại!</div>
          <div class="lab-step"><b>Cách 2 (Bằng 1 lệnh CLI tự động):</b> Nhấp đúp file <code>deploy-online.bat</code> trong thư mục dự án (hoặc chạy <code>npx vercel --prod</code> / <code>npx surge .</code>) để xuất bản thẳng lên tên miền đám mây.</div>
          <div class="lab-step"><b>Cách 3 (GitHub Pages CI/CD tự động):</b> Push thư mục lên GitHub repository — file GitHub Actions có sẵn sẽ tự động build và xuất bản lên GitHub Pages miễn phí trọn đời.</div>
        </div>
        <hr class="divider">
        <div class="row">
          <div>
            <b>Giao diện hiển thị</b><br>
            <small>Chuyển đổi Sáng / Tối bảo vệ mắt khi cày đêm</small>
          </div>
          <button class="btn alt" id="settings-theme-btn">${state.theme === 'dark' ? '☀️ Chuyển sang Sáng' : '🌙 Chuyển sang Tối'}</button>
        </div>
        <hr class="divider">
        <button class="btn danger sm" id="wipe">Xóa toàn bộ dữ liệu học tập trên trình duyệt này</button>
      </section>
    </div>
  `;
}

/* ================= RENDER & EVENT WIRING ================= */

function render() {
  stopTimers();
  applyTheme();
  switch (page) {
    case 'home':
      shell(home());
      break;
    case 'curriculum':
      shell(curriculum());
      break;
    case 'examples':
      shell(renderExamplesHub());
      break;
    case 'lesson':
      shell(lesson());
      break;
    case 'simulator':
      shell(renderSimulator());
      break;
    case 'interview':
      shell(renderInterview());
      break;
    case 'today':
      shell(today());
      break;
    case 'project':
      shell(project());
      break;
    case 'quiz':
      shell(quiz());
      break;
    case 'settings':
      shell(settings());
      break;
    default:
      shell(home());
  }
  wire();
}

function wire() {
  document.querySelectorAll('[data-page]').forEach(b => (b.onclick = () => go(b.dataset.page)));
  document.querySelectorAll('[data-lesson]').forEach(b => (b.onclick = () => openLesson(b.dataset.lesson)));
  document.querySelectorAll('[data-module]').forEach(
    b =>
      (b.onclick = () => {
        moduleFilter = b.dataset.module;
        filter = '';
        stageFilter = 'all';
        statusFilter = 'all';
        bookmarkedOnly = false;
        go('curriculum');
      })
  );

  // Global Example Save / Copy / Personal Note handlers (work inside Lessons & inside Saved Examples Hub)
  document.querySelectorAll('[data-save-ex]').forEach(btn => {
    btn.onclick = () => {
      const exId = btn.dataset.saveEx;
      if (!state.savedExamples) state.savedExamples = {};
      if (state.savedExamples[exId]) {
        delete state.savedExamples[exId];
        save();
        showToast('Đã gỡ ví dụ khỏi Sổ tay Ví dụ hay');
      } else {
        const existingInput = document.getElementById('exnote-' + exId);
        state.savedExamples[exId] = {
          at: new Date().toISOString(),
          note: existingInput ? existingInput.value.trim() : ''
        };
        record('save_example', exId);
        showToast('★ Đã lưu vào Sổ tay Ví dụ hay! Bạn có thể mở xem lại bất cứ lúc nào.');
      }
      const y = window.scrollY;
      render();
      window.scrollTo({ top: y, behavior: 'instant' });
    };
  });

  document.querySelectorAll('[data-copy-ex]').forEach(btn => {
    btn.onclick = async () => {
      const ex = findExampleById(btn.dataset.copyEx);
      if (!ex) return;
      const text = ex.badCode && ex.goodCode
        ? `// ❌ SAI:\n${ex.badCode}\n\n// ✅ CHUẨN SENIOR:\n${ex.goodCode}`
        : ex.code || ex.story || '';
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✓ Đã copy!';
        setTimeout(() => (btn.textContent = '📋 Copy code'), 1600);
      } catch (_) {}
    };
  });

  document.querySelectorAll('[data-note-toggle]').forEach(btn => {
    btn.onclick = () => {
      const exId = btn.dataset.noteToggle;
      exNoteEditing[exId] = !exNoteEditing[exId];
      const y = window.scrollY;
      render();
      window.scrollTo({ top: y, behavior: 'instant' });
      if (exNoteEditing[exId]) {
        setTimeout(() => document.getElementById('exnote-' + exId)?.focus(), 20);
      }
    };
  });

  document.querySelectorAll('[data-save-ex-note]').forEach(btn => {
    btn.onclick = () => {
      const exId = btn.dataset.saveExNote;
      const input = document.getElementById('exnote-' + exId);
      const noteText = input ? input.value.trim() : '';
      if (!state.savedExamples) state.savedExamples = {};
      state.savedExamples[exId] = {
        at: state.savedExamples[exId]?.at || new Date().toISOString(),
        note: noteText
      };
      exNoteEditing[exId] = false;
      save();
      showToast('💾 Đã lưu ví dụ kèm ghi chú cá nhân vào Sổ tay!');
      const y = window.scrollY;
      render();
      window.scrollTo({ top: y, behavior: 'instant' });
    };
  });

  document.querySelectorAll('[data-lesson-ex-filter]').forEach(btn => {
    btn.onclick = () => {
      lessonExTypeFilter = btn.dataset.lessonExFilter;
      const y = window.scrollY;
      render();
      window.scrollTo({ top: y, behavior: 'instant' });
    };
  });

  if (page === 'examples') {
    document.querySelectorAll('[data-ex-mode]').forEach(btn => {
      btn.onclick = () => {
        exHubMode = btn.dataset.exMode;
        render();
      };
    });
    const searchEl = document.getElementById('ex-hub-search');
    if (searchEl) {
      searchEl.oninput = e => {
        exHubSearch = e.target.value;
        const pos = searchEl.selectionStart;
        render();
        const nextEl = document.getElementById('ex-hub-search');
        if (nextEl) {
          nextEl.focus();
          nextEl.setSelectionRange(pos, pos);
        }
      };
    }
    const modEl = document.getElementById('ex-hub-mod');
    if (modEl) {
      modEl.onchange = e => {
        exHubModule = e.target.value;
        render();
      };
    }
    const typeEl = document.getElementById('ex-hub-type');
    if (typeEl) {
      typeEl.onchange = e => {
        exHubType = e.target.value;
        render();
      };
    }
    const exportMdBtn = document.getElementById('export-ex-md');
    if (exportMdBtn) exportMdBtn.onclick = exportSavedExamplesMarkdown;
    const clearExBtn = document.getElementById('clear-saved-ex');
    if (clearExBtn) {
      clearExBtn.onclick = () => {
        if (confirm('Bỏ lưu toàn bộ các ví dụ trong Sổ tay Ví dụ hay?')) {
          state.savedExamples = {};
          save();
          render();
        }
      };
    }
  }

  // Mobile nav & Theme & Quick search
  const openMobile = document.getElementById('open-mobile-nav');
  if (openMobile) {
    openMobile.onclick = () => {
      mobileMenuOpen = !mobileMenuOpen;
      render();
    };
  }
  const backdrop = document.getElementById('mobile-backdrop');
  if (backdrop) {
    backdrop.onclick = () => {
      mobileMenuOpen = false;
      render();
    };
  }
  const toggleThemeBtn = document.getElementById('toggle-theme');
  if (toggleThemeBtn) {
    toggleThemeBtn.onclick = () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      render();
    };
  }

  const openSearch = () => {
    searchModalOpen = true;
    render();
    setTimeout(() => document.getElementById('quick-search-input')?.focus(), 20);
  };
  if (document.getElementById('open-quick-search')) document.getElementById('open-quick-search').onclick = openSearch;
  if (document.getElementById('open-search-mobile')) document.getElementById('open-search-mobile').onclick = openSearch;
  if (document.getElementById('close-search-modal')) {
    document.getElementById('close-search-modal').onclick = () => {
      searchModalOpen = false;
      render();
    };
  }
  if (document.getElementById('search-overlay')) {
    document.getElementById('search-overlay').onclick = () => {
      searchModalOpen = false;
      render();
    };
  }
  const qsInput = document.getElementById('quick-search-input');
  if (qsInput) {
    qsInput.oninput = e => {
      quickSearchQuery = e.target.value;
      const pos = qsInput.selectionStart;
      render();
      const nextInput = document.getElementById('quick-search-input');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(pos, pos);
      }
    };
  }

  if (page === 'home') {
    document.querySelectorAll('[data-career-check]').forEach(chk => {
      chk.onchange = () => {
        state.careerChecks[chk.dataset.careerCheck] = chk.checked;
        save();
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
    });
  }

  if (page === 'curriculum') {
    const input = document.getElementById('filter');
    input.oninput = () => {
      filter = input.value;
      document.getElementById('results').innerHTML = lessonList(getFilteredLessons());
      document.querySelectorAll('[data-lesson]').forEach(b => (b.onclick = () => openLesson(b.dataset.lesson)));
    };
    document.getElementById('mod-filter').onchange = e => {
      moduleFilter = e.target.value;
      go('curriculum');
    };
    document.getElementById('stage').onchange = e => {
      stageFilter = e.target.value;
      go('curriculum');
    };
    document.getElementById('status-filter').onchange = e => {
      statusFilter = e.target.value;
      go('curriculum');
    };
    document.getElementById('toggle-bookmark-filter').onclick = () => {
      bookmarkedOnly = !bookmarkedOnly;
      go('curriculum');
    };
    document.getElementById('reset-filter').onclick = () => {
      filter = '';
      stageFilter = 'all';
      moduleFilter = 'all';
      statusFilter = 'all';
      bookmarkedOnly = false;
      go('curriculum');
    };
  }

  if (page === 'lesson') {
    const l = current();
    const d = window.LESSON_DETAILS && window.LESSON_DETAILS[l.id];
    const qList = getLessonQuestions(l);

    document.getElementById('back-curriculum').onclick = () => go('curriculum');
    document.getElementById('bookmark-lesson').onclick = () => {
      state.bookmarks[l.id] = !state.bookmarks[l.id];
      if (!state.bookmarks[l.id]) delete state.bookmarks[l.id];
      save();
      render();
    };

    const prevHandler = () => {
      const p = LESSONS[l.global - 1];
      if (p) openLesson(p.id);
    };
    const nextHandler = () => {
      const n = LESSONS[l.global + 1];
      if (n) openLesson(n.id);
    };
    if (document.getElementById('prev-top')) document.getElementById('prev-top').onclick = prevHandler;
    if (document.getElementById('next-top')) document.getElementById('next-top').onclick = nextHandler;
    if (document.getElementById('prev-side')) document.getElementById('prev-side').onclick = prevHandler;
    if (document.getElementById('next')) document.getElementById('next').onclick = nextHandler;

    const copyBtn = document.getElementById('copy-code');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(d?.code || l.sample);
          copyBtn.textContent = '✓ Đã sao chép!';
          setTimeout(() => (copyBtn.textContent = '📋 Sao chép code'), 1800);
        } catch (_) {
          alert('Hãy bôi đen đoạn code và bấm Ctrl+C.');
        }
      };
    }

    document.querySelectorAll('[data-check]').forEach(b => {
      b.onchange = () => {
        const arr = Array.from(document.querySelectorAll('[data-check]:checked')).map(x => +x.dataset.check);
        state.checks[l.id] = arr;
        state.notes[l.id] = document.getElementById('lesson-note').value;
        save();
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
    });

    document.getElementById('save-note').onclick = () => {
      state.notes[l.id] = document.getElementById('lesson-note').value;
      record('notes', l.id);
      alert('Đã lưu ghi chú bài học!');
    };

    document.querySelectorAll('input[name^="lquiz_"]').forEach(el => {
      el.onchange = () => {
        const qi = +el.name.replace('lquiz_', '');
        if (!state.lessonQuizAnswers[l.id]) state.lessonQuizAnswers[l.id] = {};
        state.lessonQuizAnswers[l.id][qi] = +el.value;
        save();
      };
    });

    document.getElementById('grade-one').onclick = () => {
      const ansObj = state.lessonQuizAnswers[l.id] || {};
      if (Object.keys(ansObj).length < qList.length) {
        alert(`Hãy chọn đáp án cho đủ cả ${qList.length} câu hỏi trước khi bấm chấm nhé!`);
        return;
      }
      let right = 0;
      qList.forEach((q, qi) => {
        if (Number(ansObj[qi]) === q.answer) right++;
      });
      const ok = right === qList.length;
      state.quiz[l.id] = { ok, score: right, total: qList.length, at: new Date().toISOString() };
      lessonQuizGraded[l.id] = true;
      state.notes[l.id] = document.getElementById('lesson-note').value;
      record('quiz', l.id);
      const scrollY = window.scrollY;
      render();
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };

    document.getElementById('complete').onclick = () => {
      if ((state.checks[l.id] || []).length !== 3 || !state.quiz[l.id]?.ok) return;
      if (!state.done[l.id]) {
        state.done[l.id] = new Date().toISOString();
        record('completed', l.id);
      }
      openLesson(LESSONS[l.global + 1]?.id || l.id);
    };

    const fastBtn = document.getElementById('fast-complete');
    if (fastBtn) {
      fastBtn.onclick = () => {
        state.checks[l.id] = [0, 1, 2];
        state.done[l.id] = new Date().toISOString();
        record('completed', l.id);
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
    }

    const unmarkBtn = document.getElementById('unmark-complete');
    if (unmarkBtn) {
      unmarkBtn.onclick = () => {
        delete state.done[l.id];
        save();
        render();
      };
    }
  }

  if (page === 'simulator') {
    document.querySelectorAll('[data-sim-tab]').forEach(btn => {
      btn.onclick = () => {
        simTab = btn.dataset.simTab;
        render();
      };
    });

    if (simTab === 'concurrency') {
      const updateSim = () => {
        simInitBalance = +document.getElementById('sim-init').value || 10000000;
        simTxA = +document.getElementById('sim-txa').value || 8000000;
        simTxB = +document.getElementById('sim-txb').value || 7000000;
        simConcurrencyResult = computeConcurrencySim();
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
      ['sim-init', 'sim-txa', 'sim-txb'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = updateSim;
      });
      document.querySelectorAll('[data-lock-mode]').forEach(btn => {
        btn.onclick = () => {
          simLockMode = btn.dataset.lockMode;
          simConcurrencyResult = computeConcurrencySim();
          const y = window.scrollY;
          render();
          window.scrollTo({ top: y, behavior: 'instant' });
        };
      });
    } else if (simTab === 'ledger') {
      const updateLed = () => {
        ledgerAmount = +document.getElementById('led-amt').value || 5000000;
        ledgerFee = +document.getElementById('led-fee').value || 1100;
        ledgerScenario = document.getElementById('led-scenario').value;
        if (ledgerScenario !== 'timeout') ledgerReconciled = null;
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
      ['led-amt', 'led-fee', 'led-scenario'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = updateLed;
      });
      document.querySelectorAll('[data-rec]').forEach(btn => {
        btn.onclick = () => {
          ledgerReconciled = btn.dataset.rec;
          const y = window.scrollY;
          render();
          window.scrollTo({ top: y, behavior: 'instant' });
        };
      });
    } else if (simTab === 'codereview') {
      const challenges = getCodeReviewChallenges();
      const activeCr = challenges.find(c => c.id === activeCrId) || challenges[0];
      document.querySelectorAll('[data-cr-pick]').forEach(btn => {
        btn.onclick = () => {
          activeCrId = btn.dataset.crPick;
          render();
        };
      });
      document.querySelectorAll('[data-cr-check]').forEach(chk => {
        chk.onchange = () => {
          if (!crSelections[activeCr.id]) crSelections[activeCr.id] = {};
          crSelections[activeCr.id][chk.dataset.crCheck] = chk.checked;
        };
      });
      document.getElementById('grade-cr').onclick = () => {
        const sel = crSelections[activeCr.id] || {};
        let right = 0;
        activeCr.issues.forEach(iss => {
          if (!!sel[iss.id] === !!iss.isBug) right++;
        });
        state.codeReviewScores[activeCr.id] = pct(right, activeCr.issues.length);
        crGraded[activeCr.id] = true;
        record('codereview', activeCr.id);
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
      document.getElementById('reset-cr').onclick = () => {
        crSelections[activeCr.id] = {};
        crGraded[activeCr.id] = false;
        render();
      };
    }
  }

  if (page === 'interview') {
    const ivSearch = document.getElementById('iv-search');
    if (ivSearch) {
      ivSearch.oninput = e => {
        ivFilter = e.target.value;
        const pos = ivSearch.selectionStart;
        render();
        const el = document.getElementById('iv-search');
        if (el) {
          el.focus();
          el.setSelectionRange(pos, pos);
        }
      };
    }
    const ivCat = document.getElementById('iv-cat');
    if (ivCat) {
      ivCat.onchange = e => {
        ivCategory = e.target.value;
        render();
      };
    }
    document.querySelectorAll('[data-iv-toggle]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.ivToggle;
        ivRevealed[id] = !ivRevealed[id];
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
    });
    document.querySelectorAll('[data-iv-rate]').forEach(btn => {
      btn.onclick = () => {
        state.interviewMastery[btn.dataset.ivRate] = btn.dataset.rate;
        record('interview', btn.dataset.ivRate);
        const y = window.scrollY;
        render();
        window.scrollTo({ top: y, behavior: 'instant' });
      };
    });
  }

  if (page === 'today') {
    document.getElementById('goal').onchange = e => {
      state.dailyGoal = +e.target.value;
      save();
      go('today');
    };
    document.querySelectorAll('[data-pomo]').forEach(btn => {
      btn.onclick = () => {
        timerPreset = +btn.dataset.pomo;
        timerSeconds = timerPreset * 60;
        go('today');
      };
    });
    const goMistakes = document.getElementById('go-mistakes-today');
    if (goMistakes) {
      goMistakes.onclick = () => {
        examView = 'hub';
        examCertFilter = 'mistakes';
        go('quiz');
      };
    }
    document.getElementById('timer-start').onclick = () => {
      if (timerOn) {
        clearInterval(timer);
        timer = null;
        timerOn = false;
        document.getElementById('timer-start').textContent = '▶ Tiếp tục';
        return;
      }
      timerOn = true;
      document.getElementById('timer-start').textContent = '⏸ Tạm dừng';
      timer = setInterval(() => {
        timerSeconds--;
        const el = document.getElementById('timer');
        if (el) el.textContent = timeFmt(timerSeconds);
        if (timerSeconds <= 0) {
          clearInterval(timer);
          timer = null;
          timerOn = false;
          state.studyMinutes += timerPreset;
          record('pomodoro', '');
          alert(`Tuyệt vời! Bạn vừa hoàn thành một phiên học tập trung ${timerPreset} phút.`);
          timerSeconds = timerPreset * 60;
          go('today');
        }
      }, 1000);
    };
    document.getElementById('timer-reset').onclick = () => {
      timerSeconds = timerPreset * 60;
      go('today');
    };
  }

  if (page === 'project') {
    const copyCv = document.getElementById('copy-cv');
    if (copyCv) {
      copyCv.onclick = async () => {
        const pre = copyCv.closest('.card').querySelector('pre');
        try {
          await navigator.clipboard.writeText(pre.textContent);
          copyCv.textContent = '✓ Đã copy!';
          setTimeout(() => (copyCv.textContent = '📋 Copy đưa vào CV'), 1800);
        } catch (_) {}
      };
    }
  }

  if (page === 'quiz') {
    if (examView === 'hub') {
      document.querySelectorAll('[data-cert-tab]').forEach(btn => {
        btn.onclick = () => {
          examCertFilter = btn.dataset.certTab;
          render();
        };
      });
      document.querySelectorAll('[data-start-exam]').forEach(btn => {
        btn.onclick = () => {
          const ex = getAllExamSets().find(x => x.id === btn.dataset.startExam);
          if (ex) startExamSession(ex, btn.dataset.mode || 'timed');
        };
      });
      const drillBtn = document.getElementById('start-mistake-drill');
      if (drillBtn) {
        drillBtn.onclick = () => {
          const mq = getMistakeQuestions();
          if (!mq.length) return;
          startExamSession(
            {
              id: 'mistake-drill',
              cert: 'Phục thù câu sai',
              title: 'Đề Phục Thù — Chinh phục lại các câu từng làm sai',
              durationMinutes: Math.max(15, mq.length * 2),
              passingScore: 700,
              isMistakeDrill: true,
              questions: mq
            },
            'practice'
          );
        };
      }
      const clearMistakes = document.getElementById('clear-all-mistakes');
      if (clearMistakes) {
        clearMistakes.onclick = () => {
          if (confirm('Xóa toàn bộ câu hỏi trong Sổ tay câu sai?')) {
            state.mistakes = {};
            save();
            render();
          }
        };
      }
      document.querySelectorAll('[data-remove-mistake]').forEach(btn => {
        btn.onclick = () => {
          delete state.mistakes[btn.dataset.removeMistake];
          save();
          render();
        };
      });
    } else if (examView === 'session') {
      if (examRunMode === 'timed' && !examTimer) {
        examTimer = setInterval(() => {
          examSecondsLeft--;
          const clock = document.getElementById('exam-clock');
          if (clock) {
            clock.textContent = timeFmt(examSecondsLeft);
            if (examSecondsLeft < 300) clock.style.color = 'var(--danger)';
          }
          if (examSecondsLeft <= 0) {
            clearInterval(examTimer);
            examTimer = null;
            alert('Hết thời gian làm bài! Hệ thống tự động nộp bài và chấm điểm.');
            submitActiveExam(true);
          }
        }, 1000);
      }

      document.getElementById('toggle-exam-layout').onclick = () => {
        examSingleMode = !examSingleMode;
        render();
      };
      document.getElementById('exit-exam').onclick = () => {
        if (confirm('Thoát khỏi phòng thi hiện tại?')) {
          if (examTimer) {
            clearInterval(examTimer);
            examTimer = null;
          }
          examView = 'hub';
          render();
          window.scrollTo(0, 0);
        }
      };

      document.querySelectorAll('input[name^="exam_q_"]').forEach(el => {
        el.onchange = () => {
          const idx = +el.name.replace('exam_q_', '');
          examAnswers[idx] = +el.value;
          const scrollPos = window.scrollY;
          render();
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
        };
      });

      document.querySelectorAll('[data-flag]').forEach(btn => {
        btn.onclick = () => {
          const idx = +btn.dataset.flag;
          examFlags[idx] = !examFlags[idx];
          const scrollPos = window.scrollY;
          render();
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
        };
      });

      document.querySelectorAll('[data-reveal]').forEach(btn => {
        btn.onclick = () => {
          const idx = +btn.dataset.reveal;
          examRevealed[idx] = !examRevealed[idx];
          const scrollPos = window.scrollY;
          render();
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
        };
      });

      document.querySelectorAll('[data-jump]').forEach(btn => {
        btn.onclick = () => {
          const idx = +btn.dataset.jump;
          if (examSingleMode) {
            examCurrentIdx = idx;
            render();
            window.scrollTo(0, 0);
          } else {
            const card = document.getElementById('qcard-' + idx);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };
      });

      if (document.getElementById('exam-prev')) {
        document.getElementById('exam-prev').onclick = () => {
          if (examCurrentIdx > 0) {
            examCurrentIdx--;
            render();
            window.scrollTo(0, 0);
          }
        };
      }
      if (document.getElementById('exam-next')) {
        document.getElementById('exam-next').onclick = () => {
          if (examCurrentIdx < activeExam.questions.length - 1) {
            examCurrentIdx++;
            render();
            window.scrollTo(0, 0);
          }
        };
      }
      if (document.getElementById('submit-exam-bottom')) {
        document.getElementById('submit-exam-bottom').onclick = () => submitActiveExam(false);
      }
      document.getElementById('submit-exam').onclick = () => submitActiveExam(false);
    } else if (examView === 'review') {
      document.getElementById('back-exam-hub').onclick = () => {
        examView = 'hub';
        render();
        window.scrollTo(0, 0);
      };
      document.getElementById('retry-this-exam').onclick = () => {
        startExamSession(activeExam, examRunMode);
      };
      document.querySelectorAll('[data-rev-filter]').forEach(btn => {
        btn.onclick = () => {
          reviewFilter = btn.dataset.revFilter;
          const scrollPos = window.scrollY;
          render();
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
        };
      });
      const domSel = document.getElementById('review-domain-select');
      if (domSel) {
        domSel.onchange = e => {
          reviewDomain = e.target.value;
          const scrollPos = window.scrollY;
          render();
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
        };
      }
    }
  }

  if (page === 'settings') {
    document.getElementById('copy-sync-code').onclick = async () => {
      const code = encodeSyncToken();
      document.getElementById('sync-input').value = code;
      try {
        await navigator.clipboard.writeText(code);
        alert('Đã copy Mã Đồng Bộ vào Clipboard! Bạn có thể gửi qua Zalo/Telegram/Email sang điện thoại và dán vào ô đồng bộ.');
      } catch (_) {
        alert('Mã Đồng Bộ đã hiện trong ô bên dưới — hãy copy toàn bộ chuỗi đó!');
      }
    };

    document.getElementById('apply-sync-code').onclick = () => {
      const val = document.getElementById('sync-input').value.trim();
      if (!val) return alert('Hãy dán Mã Đồng Bộ (bắt đầu bằng FJS1:) vào ô trước nhé.');
      try {
        const nextState = decodeSyncToken(val);
        if (!confirm('Nạp Mã Đồng Bộ này sẽ cập nhật tiến độ học tập trên máy hiện tại. Tiếp tục?')) return;
        state = nextState;
        save();
        alert('Đồng bộ tiến độ thành công!');
        go('home');
      } catch (err) {
        alert('Mã đồng bộ không hợp lệ: ' + err.message);
      }
    };

    const installBtn = document.getElementById('install-pwa');
    if (installBtn && deferredInstallPrompt) {
      installBtn.onclick = async () => {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        render();
      };
    }

    document.getElementById('settings-theme-btn').onclick = () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      render();
    };

    document.getElementById('export').onclick = () => {
      const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), progress: state }, null, 2)], {
        type: 'application/json'
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'finjava-senior-progress-' + dateKey(new Date()) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    document.getElementById('import-file').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || typeof data.progress !== 'object' || !data.progress.done) {
          throw new Error('Sai định dạng file backup JSON');
        }
        if (!confirm('Nhập file này sẽ ghi đè tiến độ hiện tại. Tiếp tục?')) return;
        state = { ...defaultState(), ...data.progress };
        save();
        go('settings');
      } catch (err) {
        alert('Không thể nhập file: ' + err.message);
      }
    };

    document.getElementById('wipe').onclick = () => {
      if (confirm('Xóa toàn bộ tiến độ, ghi chú, lịch sử thi và sổ tay câu sai trên trình duyệt này?')) {
        state = defaultState();
        save();
        go('home');
      }
    };
  }
}

// Global keyboard shortcuts (Ctrl+K search, Esc close modal)
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchModalOpen = !searchModalOpen;
    render();
    if (searchModalOpen) setTimeout(() => document.getElementById('quick-search-input')?.focus(), 20);
  } else if (e.key === 'Escape' && searchModalOpen) {
    searchModalOpen = false;
    render();
  }
});

// Register Service Worker when served over http/https
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
