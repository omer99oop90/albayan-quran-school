/**
 * MYMARK - Student Exclusive Portal Engine (Mobile-First Native App UX)
 * مدرسة البيان لتعليم القرآن الكريم
 */

let studentDataState = null;
let currentExamFilter = "all";
let currentSearchQuery = "";

// Fetch all student data on load (Instant SWR: Local Cache 0ms -> Silent Background Sync)
async function loadStudentPortalData() {
  const loadingOverlay = document.getElementById("portalLoading");

  // 1. Immediately read and display locally cached results if present (0ms offline speed)
  let localCache = null;
  try {
    localCache = JSON.parse(localStorage.getItem('albayan_student_portal_cache') || 'null');
    if (localCache && typeof localCache === "object") {
      studentDataState = localCache;
      renderPortalUI(localCache);
      // Immediately hide overlay so the user never waits or sees full-screen reload!
      if (loadingOverlay) loadingOverlay.style.display = "none";
    }
  } catch(e) {}

  // If no cache at all, only then show overlay while initial fetching
  if (!studentDataState && loadingOverlay) {
    loadingOverlay.style.display = "flex";
  }

  let cachedUser = {};
  try {
    cachedUser = JSON.parse(localStorage.getItem('albayan_logged_user') || '{}');
  } catch(e) {}
  const studentName = (cachedUser.student_name || cachedUser.username || "طالب البيان").trim();

  let fetchedData = null;

  // 2. Try fetching from server endpoint (skip or fast-timeout on mobile/serverless)
  const isMobileApp = !!(window.Capacitor || window.location.protocol === 'file:');
  if (!isMobileApp) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch("/api/student/my-marks", {
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          fetchedData = data;
        }
      } else if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }
    } catch (err) {}
  }

  // 3. Fallback / Direct Firebase Realtime Database fetch
  if (!fetchedData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const fbRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/results.json", {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (fbRes.ok) {
        const fbRaw = await fbRes.json();
        if (fbRaw && typeof fbRaw === "object") {
          let list = [];
          if (Array.isArray(fbRaw)) {
            list = fbRaw.filter(Boolean);
          } else {
            list = Object.entries(fbRaw).map(([k, v]) => ({ cloud_id: k, ...(v || {}) }));
          }

          // Filter for current student
          const matched = list.filter(r => {
            const rName = r.student_name || r.student || "";
            return isNameMatch(rName, studentName);
          });

          if (matched.length > 0) {
            // Sort newest first
            matched.sort((a, b) => {
              const da = new Date(a.created_at || a.timestamp || 0).getTime();
              const db = new Date(b.created_at || b.timestamp || 0).getTime();
              return db - da;
            });

            const standardizedResults = matched.map((r, idx) => ({
              result_id: r.result_id || r.id || r.cloud_id || (Date.now() - idx),
              id: r.result_id || r.id || r.cloud_id || (Date.now() - idx),
              exam_id: r.exam_id || 1,
              exam_title: r.exam_title || r.title || "اختبار مدرسة البيان لتعليم القرآن الكريم",
              student_name: r.student_name || studentName,
              score: Number(r.score != null ? r.score : 0),
              total_questions: Number(r.total_questions || r.total || 1),
              percentage: Number(r.percentage != null ? r.percentage : Math.round(((r.score || 0) / (r.total_questions || 1)) * 100)),
              passed: (r.passed === 1 || r.passed === true || (r.percentage >= 50)) ? 1 : 0,
              created_at: r.created_at || r.timestamp || new Date().toISOString(),
              duration_minutes: r.duration_minutes || 20,
              answers: r.answers || r.details || []
            }));

            // Merge with local results if any
            const existingLocalResults = (localCache && (localCache.results || localCache.exams)) || [];
            existingLocalResults.forEach(lr => {
              const isDup = standardizedResults.some(sr => 
                (sr.created_at && lr.created_at && sr.created_at === lr.created_at) ||
                (sr.result_id && lr.result_id && String(sr.result_id) === String(lr.result_id))
              );
              if (!isDup) {
                standardizedResults.push(lr);
              }
            });

            fetchedData = {
              success: true,
              student: {
                name: studentName,
                circle_name: (localCache && localCache.student && localCache.student.circle_name) || "حلقة مدرسة البيان",
                teacher_name: (localCache && localCache.student && localCache.student.teacher_name) || "كادر التحفيظ"
              },
              results: standardizedResults,
              exams: standardizedResults
            };
          }
        }
      }
    } catch(e) {
      console.warn("Direct Firebase results fetch note:", e);
    }
  }

  // 4. If we got new data from server or Firebase, update state and cache
  if (fetchedData) {
    const resultsList = fetchedData.results || fetchedData.exams || [];
    const totalExams = resultsList.length;
    const passedExams = resultsList.filter(r => r.passed === 1 || r.percentage >= 50).length;
    const totalScore = resultsList.reduce((acc, r) => acc + (r.score || 0), 0);
    const totalQuestionsAll = resultsList.reduce((acc, r) => acc + (r.total_questions || 0), 0);
    const avgPercentage = totalExams > 0 ? Math.round(resultsList.reduce((acc, r) => acc + (r.percentage || 0), 0) / totalExams) : 0;

    fetchedData.stats = {
      total_exams: totalExams,
      passed_exams: passedExams,
      failed_exams: totalExams - passedExams,
      avg_percentage: avgPercentage,
      total_score: totalScore,
      total_questions_all: totalQuestionsAll
    };
    fetchedData.results = resultsList;
    fetchedData.exams = resultsList;

    studentDataState = fetchedData;
    try {
      localStorage.setItem('albayan_student_portal_cache', JSON.stringify(fetchedData));
    } catch(e) {}
    renderPortalUI(fetchedData);
  } else if (!studentDataState) {
    // 5. If no network and no cache was found, provide safe state
    const initialData = {
      success: true,
      student: {
        name: studentName,
        circle_name: "حلقة مدرسة البيان",
        teacher_name: "كادر التحفيظ"
      },
      stats: {
        total_exams: 0,
        passed_exams: 0,
        avg_percentage: 0,
        total_score: 0,
        total_questions_all: 0
      },
      results: [],
      exams: []
    };
    studentDataState = initialData;
    renderPortalUI(initialData);
  }

  if (loadingOverlay) loadingOverlay.style.display = "none";
}

// Render complete portal UI
function renderPortalUI(data) {
  try {
    const student = data.student || {};
    const results = data.results || data.exams || [];
    const stats = data.stats || {};

    // 1. Header & Hero Info
    const studentName = student.name || "الطالب";
    const headerNameEl = document.getElementById("headerStudentName");
    if (headerNameEl) headerNameEl.textContent = studentName;
    
    const heroNameEl = document.getElementById("heroStudentName");
    if (heroNameEl) heroNameEl.textContent = studentName;
    
    // Student initials for avatar
    const parts = studentName.trim().split(" ");
    const initials = parts.length >= 2 ? (parts[0][0] + " " + parts[1][0]) : studentName.substring(0, 2);
    const avatarEl = document.getElementById("studentAvatarInitials");
    if (avatarEl) avatarEl.textContent = initials;

    // Badges in Hero
    const circleEl = document.getElementById("heroCircleName");
    if (circleEl) circleEl.textContent = student.circle_name && student.circle_name !== "غير محدد" ? `حلقة ${student.circle_name}` : "حلقة قرآنية";
    
    const teacherEl = document.getElementById("heroTeacherName");
    if (teacherEl) teacherEl.textContent = student.teacher_name && student.teacher_name !== "غير محدد" ? `الشيخ ${student.teacher_name}` : "كادر التحفيظ";

    // 2. Stats Cards (dynamic calculation fallback)
    const totalExams = stats.total_exams != null ? stats.total_exams : results.length;
    const passedCount = stats.passed_exams != null ? stats.passed_exams : results.filter(r => r.passed === 1 || r.percentage >= 50).length;
    const avg = stats.avg_percentage != null ? stats.avg_percentage : (totalExams > 0 ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / totalExams) : 0);
    const totalScore = stats.total_score != null ? stats.total_score : results.reduce((a, r) => a + (r.score || 0), 0);
    const totalQuestions = stats.total_questions_all != null ? stats.total_questions_all : results.reduce((a, r) => a + (r.total_questions || 0), 0);
    const passRate = totalExams > 0 ? Math.round((passedCount / totalExams) * 100) : 0;

    const totalExamsEl = document.getElementById("statTotalExams");
    if (totalExamsEl) totalExamsEl.textContent = totalExams;
    
    const avgScoreEl = document.getElementById("statAvgScore");
    if (avgScoreEl) avgScoreEl.textContent = `${avg}%`;
    
    const passedRateEl = document.getElementById("statPassedRate");
    if (passedRateEl) passedRateEl.textContent = `${passRate}%`;
    
    const passedSubEl = document.getElementById("statPassedSub");
    if (passedSubEl) passedSubEl.textContent = `${passedCount} من ${totalExams} مجتازة`;

    const totalPointsEl = document.getElementById("statTotalPoints");
    if (totalPointsEl) totalPointsEl.textContent = `${totalScore} / ${totalQuestions}`;

    // Performance Tier in Hero
    const heroRankPill = document.getElementById("heroRankPill");
    if (heroRankPill) {
      if (avg >= 90 && totalExams > 0) {
        heroRankPill.innerHTML = `<i data-lucide="award" style="width:13px; height:13px;"></i><span>المستوى المتقدم</span>`;
      } else if (avg >= 80 && totalExams > 0) {
        heroRankPill.innerHTML = `<i data-lucide="award" style="width:13px; height:13px;"></i><span>مستوى جيد جداً</span>`;
      } else if (avg >= 65 && totalExams > 0) {
        heroRankPill.innerHTML = `<i data-lucide="award" style="width:13px; height:13px;"></i><span>مستوى جيد</span>`;
      } else {
        heroRankPill.innerHTML = `<i data-lucide="award" style="width:13px; height:13px;"></i><span>مسار التقدم</span>`;
      }
    }

    // 3. Render Exams List
    renderExamsList();

    // Update icons
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Error rendering portal UI:", err);
  }
}

// Render Mobile Exams Feed with Filters
function renderExamsList() {
  if (!studentDataState) return;
  const results = studentDataState.results || studentDataState.exams || [];
  const container = document.getElementById("examsListContainer");
  if (!container) return;

  // Filter & Search
  let filtered = results.filter(r => {
    // Search query filter
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      const titleMatch = (r.exam_title || r.title || "").toLowerCase().includes(q);
      const scoreMatch = `${r.score}/${r.total_questions}`.includes(q);
      if (!titleMatch && !scoreMatch) return false;
    }
    // Chip filter
    const pct = r.percentage != null ? r.percentage : 0;
    if (currentExamFilter === "excellent") return pct >= 90;
    if (currentExamFilter === "verygood") return pct >= 80 && pct < 90;
    if (currentExamFilter === "passed") return r.passed === 1 || pct >= 50;
    if (currentExamFilter === "review") return pct < 50;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="portal-empty-state">
        <div class="empty-icon-wrap">
          <i data-lucide="file-question" style="width:32px; height:32px;"></i>
        </div>
        <h4>لا توجد نتائج اختبارات</h4>
        <p>${results.length === 0 ? "لم يتم رصد أي درجات اختبارات إلكترونية لك بعد." : "جرّب تغيير كلمات البحث أو خيارات التصفية."}</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map((r, idx) => {
    const pct = r.percentage != null ? r.percentage : 0;
    let gradeClass = "grade-excellent";
    let gradeText = "ممتاز";
    if (pct < 50) {
      gradeClass = "grade-fail";
      gradeText = "يحتاج مراجعة";
    } else if (pct < 65) {
      gradeClass = "grade-pass";
      gradeText = "مقبول";
    } else if (pct < 80) {
      gradeClass = "grade-good";
      gradeText = "جيد";
    } else if (pct < 90) {
      gradeClass = "grade-verygood";
      gradeText = "جيد جداً";
    }

    const examTitle = r.exam_title || r.title || "اختبار مادة القرآن والتربية الإسلامية";
    const dateFormatted = (r.created_at || r.timestamp || r.date) ? getFormattedDualDate(r.created_at || r.timestamp || r.date) : "تاريخ حديث";
    const iconName = pct >= 90 ? "award" : (pct >= 80 ? "sparkles" : (pct >= 65 ? "check-circle-2" : (pct >= 50 ? "bookmark-check" : "alert-circle")));
    const cardId = r.result_id || r.id || idx;

    return `
      <div class="exam-card-item ${gradeClass}" onclick="openExamDetailsModal('${cardId}')">
        <div class="exam-card-header">
          <div class="exam-header-content">
            <div class="exam-icon-wrap">
              <i data-lucide="${iconName}"></i>
            </div>
            <div class="exam-title-group">
              <h3 class="exam-title-text">${examTitle}</h3>
              <div class="exam-meta-row">
                <span class="exam-meta-pill">
                  <i data-lucide="calendar"></i>
                  <span>${dateFormatted}</span>
                </span>
                <span class="exam-meta-pill">
                  <i data-lucide="help-circle"></i>
                  <span>${r.total_questions} أسئلة</span>
                </span>
                <span class="exam-meta-pill">
                  <i data-lucide="clock"></i>
                  <span>${r.duration_minutes || 20} د</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="exam-card-score-section">
          <div class="exam-score-header">
            <div class="exam-score-lead">
              <span class="score-caption">الدرجة المحققة</span>
              <div class="score-display">
                <strong class="score-val">${r.score}</strong>
                <span class="score-slash">/</span>
                <span class="score-total">${r.total_questions}</span>
              </div>
            </div>
            <div class="percentage-badge ${gradeClass}">
              <span>${pct}%</span>
              <span>${gradeText}</span>
            </div>
          </div>

          <div class="exam-mini-progress">
            <div class="exam-progress-bar ${gradeClass}" style="width: ${Math.max(4, Math.min(100, pct))}%;"></div>
          </div>
        </div>

        <div class="exam-card-bottom-row">
          <span class="exam-details-text-link">
            <span>تفاصيل الإجابات</span>
            <i data-lucide="chevron-left"></i>
          </span>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// Filter handling
function setExamFilter(filterKey, element) {
  currentExamFilter = filterKey;
  document.querySelectorAll(".filter-chip").forEach(btn => btn.classList.remove("active"));
  if (element) element.classList.add("active");
  renderExamsList();
}

function handleSearchExams(e) {
  currentSearchQuery = e.target.value.trim();
  renderExamsList();
}

// Open Detailed Answers Breakdown Bottom Sheet
function openExamDetailsModal(resultId) {
  if (!studentDataState) return;
  const list = studentDataState.results || studentDataState.exams || [];
  const exam = list.find(r => String(r.result_id) === String(resultId) || String(r.id) === String(resultId));
  if (!exam) return;

  const modal = document.getElementById("answersBreakdownModal");
  const titleEl = document.getElementById("modalExamTitle");
  const scoreBadgeEl = document.getElementById("modalExamScoreBadge");
  const listEl = document.getElementById("modalAnswersList");

  titleEl.textContent = exam.exam_title || exam.title || "تفاصيل الإجابات والأسئلة";
  scoreBadgeEl.textContent = `الدرجة: ${exam.score} من ${exam.total_questions} (${exam.percentage}%)`;

  const answers = exam.answers || exam.details || [];
  if (answers.length === 0) {
    listEl.innerHTML = `
      <div class="portal-empty-state">
        <p style="font-weight:700; color:var(--portal-text-main);">الدرجة المسجلة: ${exam.score} من ${exam.total_questions} (${exam.percentage}%)</p>
        <p style="font-size:12px; color:var(--portal-text-muted); margin-top:6px;">تم حفظ النتيجة واعتمادها في سجلك الدراسي بنجاح.</p>
      </div>
    `;
  } else {
    listEl.innerHTML = answers.map((a, i) => {
      const isOk = a.is_correct === 1 || a.is_correct === true;
      return `
        <div class="question-breakdown-item ${isOk ? 'correct' : 'wrong'}">
          <div class="q-header-row">
            <span class="q-title-text">س ${a.question_index || (i + 1)}: ${a.question_text || `السؤال ${i + 1}`}</span>
            <span class="q-result-badge ${isOk ? 'correct' : 'wrong'}">
              <i data-lucide="${isOk ? 'check-circle-2' : 'x-circle'}" style="width:13px; height:13px;"></i>
              <span>${isOk ? 'صحيحة' : 'خاطئة'}</span>
            </span>
          </div>

          <div class="q-answers-comparison">
            <div class="student-choice-box">
              <div style="font-size:10.5px; font-weight:700; color:var(--portal-text-muted); margin-bottom:2px;">إجابتك:</div>
              <div style="font-weight:800; color:${isOk ? 'var(--student-primary)' : '#ef4444'};">${a.selected_text || 'لم تتم الإجابة'}</div>
            </div>
            <div class="correct-choice-box">
              <div style="font-size:10.5px; font-weight:700; color:var(--portal-text-muted); margin-bottom:2px;">الإجابة الصحيحة:</div>
              <div style="font-weight:800;">${a.correct_text || '—'}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  modal.style.display = "flex";
  if (window.lucide) lucide.createIcons();
}

function closeAnswersModal() {
  const modal = document.getElementById("answersBreakdownModal");
  if (modal) modal.style.display = "none";
}

// Print Exam Certificate / Card
function printExamCertificate(resultId) {
  if (!studentDataState) return;
  const list = studentDataState.results || studentDataState.exams || [];
  const exam = list.find(r => String(r.result_id) === String(resultId) || String(r.id) === String(resultId));
  if (!exam) return;

  const stName = (studentDataState.student && studentDataState.student.name) || "الطالب";
  const circleName = (studentDataState.student && studentDataState.student.circle_name) || "مدرسة البيان لتعليم القرآن";
  const dateStr = (exam.created_at || exam.timestamp || exam.date) ? getFormattedDualDate(exam.created_at || exam.timestamp || exam.date) : new Date().toLocaleDateString('ar-SA');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>شهادة نتيجة اختبار - ${stName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 40px;
          color: #0f172a;
          direction: rtl;
        }
        .cert-card {
          border: 3px solid #1d4ed8;
          border-radius: 24px;
          padding: 40px;
          text-align: center;
          position: relative;
          background: #ffffff;
        }
        .cert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .cert-title {
          font-size: 28px;
          color: #1e40af;
          font-weight: 800;
          margin: 0 0 10px;
        }
        .cert-student {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 20px 0;
        }
        .score-box {
          display: inline-block;
          background: #eff6ff;
          border: 2px solid #2563eb;
          border-radius: 16px;
          padding: 16px 36px;
          margin: 20px 0;
        }
        .score-val {
          font-size: 36px;
          font-weight: 900;
          color: #1d4ed8;
        }
        .cert-footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          border-top: 2px solid #e2e8f0;
          padding-top: 20px;
          font-size: 15px;
        }
      </style>
    </head>
    <body>
      <div class="cert-card">
        <div class="cert-header">
          <div>
            <h2 style="margin:0; font-size:18px;">مدرسة البيان لتعليم القرآن الكريم</h2>
            <small>${circleName}</small>
          </div>
          <div>
            <span>التاريخ: ${dateStr}</span>
          </div>
        </div>

        <div class="cert-title">بطاقة نتيجة اختبار إلكتروني</div>
        <p style="font-size:16px;">تشهد إدارة المدرسة بأن الطالب المتميز:</p>
        
        <div class="cert-student">${stName}</div>
        
        <p style="font-size:16px;">قد أتم اختبار: <strong>${exam.exam_title || exam.title || 'مادة القرآن الكريم'}</strong> وحصل على التقدير التالي:</p>

        <div class="score-box">
          <div class="score-val">${exam.score} / ${exam.total_questions}</div>
          <div style="font-size:18px; font-weight:700; color:#1e40af; margin-top:4px;">النسبة المئوية: ${exam.percentage}% (${exam.percentage >= 90 ? 'ممتاز' : exam.percentage >= 80 ? 'جيد جداً' : 'ناجح'})</div>
        </div>

        <p style="font-size:14px; color:#64748b; font-style:italic;">﴿ وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ ﴾</p>

        <div class="cert-footer">
          <div>ختم وتوقيع المحفظ: <strong>${(studentDataState.student && studentDataState.student.teacher_name) || 'إدارة المدرسة'}</strong></div>
          <div>مع تمنياتنا بالتوفيق والنجاح الدائم</div>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadStudentPortalData();
});
