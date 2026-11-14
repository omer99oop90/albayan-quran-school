/* ====================================================
   STUDENT EXAM SYNC & SUBMISSION ENGINE
   الاتصال السحابي، بنك الأسئلة المدمج، التصحيح الفوري، وعرض النتيجة
==================================================== */

window.diagnosticsState = {
  firebaseStatus: "checking",
  source: "instant_local",
  count: 0,
  examId: "exams_3",
  student: ""
};

window.isSubmitted = false;
window.lastSubmissionData = null;

function updateDiagnosticsUI() {
  const pill = document.getElementById("cloudStatusPill");
  const icon = document.getElementById("cloudStatusIcon");
  const text = document.getElementById("cloudStatusText");
  const diagFb = document.getElementById("diagFirebaseStatus");
  const diagSrc = document.getElementById("diagQuestionsSource");
  const diagCnt = document.getElementById("diagQuestionsCount");
  const diagStd = document.getElementById("diagStudentName");
  const diagExam = document.getElementById("diagExamId");

  if (window.diagnosticsState.firebaseStatus === "online") {
    if (text) text.textContent = "فايربيس متصل";
    if (icon) {
      icon.setAttribute("data-lucide", "cloud");
      icon.style.color = "#16a34a";
    }
    if (diagFb) {
      diagFb.textContent = "🟢 متصل بنجاح";
      diagFb.style.color = "#16a34a";
    }
  } else if (window.diagnosticsState.firebaseStatus === "offline") {
    if (text) text.textContent = "وضع محلي";
    if (icon) {
      icon.setAttribute("data-lucide", "cloud-off");
      icon.style.color = "#d97706";
    }
    if (diagFb) {
      diagFb.textContent = "🟡 وضع محلي بدون إنترنت";
      diagFb.style.color = "#d97706";
    }
  }

  if (diagSrc) {
    diagSrc.textContent = window.diagnosticsState.source === "firebase" ? "سحابي (Firebase RTDB)" : "بنك الأسئلة المدمج (محلي)";
    diagSrc.style.color = window.diagnosticsState.source === "firebase" ? "#16a34a" : "#2563eb";
  }
  if (diagCnt) diagCnt.textContent = `${(window.questions || []).length} أسئلة`;
  if (diagStd) diagStd.textContent = window.activeExamStudentName || "لم يُدخل بعد";
  if (diagExam) diagExam.textContent = window.diagnosticsState.examId || "exams_3";

  if (window.lucide) {
    if (pill) window.lucide.createIcons({ root: pill });
    const modal = document.getElementById("diagnosticsModal");
    if (modal) window.lucide.createIcons({ root: modal });
  }
}

function toggleDiagnosticsModal() {
  const modal = document.getElementById("diagnosticsModal");
  if (!modal) return;
  if (modal.style.display === "flex") {
    modal.style.display = "none";
  } else {
    updateDiagnosticsUI();
    modal.style.display = "flex";
    if (window.lucide) window.lucide.createIcons({ root: modal });
  }
}

async function reloadExamQuestions(force = false) {
  const data = await fetchExamQuestionsWithFallback();
  if (Array.isArray(data) && data.length > 0) {
    if (typeof window.buildQuestions === "function") {
      window.buildQuestions(data);
    }
    updateDiagnosticsUI();
    const modal = document.getElementById("diagnosticsModal");
    if (modal) modal.style.display = "none";
  }
}

async function submitExam(isAutoSubmit = false, forceSubmit = false) {
  if (window.isSubmitted) return;

  const studentElem = document.getElementById("studentInput") || document.getElementById("student");
  const student = studentElem ? studentElem.value.trim() : "";
  const btn = document.getElementById("submitBtn");

  if (!student) {
    if (window.AlbayanDialog && window.AlbayanDialog.alert) {
      AlbayanDialog.alert("الرجاء كتابة اسم الطالب أولًا قبل الإرسال.", "تنبيه", "warning");
    } else {
      alert("الرجاء كتابة اسم الطالب أولًا قبل الإرسال.");
    }
    return;
  }

  // Pre-submission check for unanswered questions on manual submission
  if (!isAutoSubmit && !forceSubmit && typeof window.getUnansweredQuestions === "function") {
    const unanswered = window.getUnansweredQuestions();
    if (unanswered.length > 0) {
      if (typeof window.showPreSubmitModal === "function") {
        window.showPreSubmitModal(unanswered);
      }
      return;
    }
  }

  const questionsList = window.questions || [];
  const answers = questionsList.map((q, i) => {
    if (q.type === "matching") {
      const engine = window.matchingEngines ? window.matchingEngines[i] : null;
      return engine ? engine.getAnswers() : [];
    }

    const checked = document.querySelector(`input[name="q${i}"]:checked`);
    return checked ? parseInt(checked.value, 10) : -1;
  });

  if (btn) btn.disabled = true;

  let data = null;

  // 1. Try server submission if server is reachable (skip in Capacitor serverless mode)
  if (!window.IS_CAPACITOR_APP) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student, answers }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const serverData = await res.json();
        if (serverData && serverData.success) {
          data = serverData;
        } else if (serverData && serverData.message && (serverData.message.includes("مسجل مسبقاً") || serverData.message.includes("الجلسة"))) {
          if (btn) btn.disabled = false;
          showDuplicateSessionModal(student, serverData.message);
          return;
        }
      }
    } catch (e) {
      // Standalone or offline fallback
    }
  }

  // 2. Standalone & Offline Local Evaluation Engine
  if (!data) {
    let score = 0;
    const details = [];

    questionsList.forEach((q, i) => {
      const userAns = answers[i];
      if (q.type === "matching") {
        const engine = window.matchingEngines ? window.matchingEngines[i] : null;
        let matchScore = 0;
        const totalPairs = (q.leftItems || []).length || 4;
        if (Array.isArray(userAns) && q.correctPairs) {
          userAns.forEach(pair => {
            const isMatch = q.correctPairs.some(cp => cp.leftId === pair.leftId && cp.rightId === pair.rightId);
            if (isMatch) matchScore++;
          });
        }
        score += matchScore;
        details.push({
          type: "matching",
          score: matchScore,
          total: totalPairs,
          selected: userAns,
          correct: q.correctPairs || q.answer
        });
      } else if (q.type === "true_false") {
        const correctVal = (q.answer === true || q.answer === 1 || q.answer === "1") ? 1 : 0;
        const isCorrect = userAns === correctVal;
        if (isCorrect) score += 1;
        details.push({
          type: "true_false",
          selected: userAns,
          correct: correctVal,
          is_correct: isCorrect
        });
      } else {
        const correctVal = typeof q.answer === "number" ? q.answer : 0;
        const isCorrect = userAns === correctVal;
        if (isCorrect) score += 1;
        details.push({
          type: "choice",
          selected: userAns,
          correct: correctVal,
          is_correct: isCorrect
        });
      }
    });

    const totalQuestions = questionsList.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    data = {
      success: true,
      score: score,
      total: totalQuestions,
      percentage: percentage,
      details: details,
      student: student
    };

    // Build formatted answers breakdown for student portal
    const formattedAnswers = questionsList.map((q, i) => {
      const userAns = answers[i];
      let selectedText = "لم تتم الإجابة";
      let correctText = "—";
      let isCorrect = false;

      if (q.type === "matching") {
        const totalPairs = (q.leftItems || []).length || 4;
        let matchScore = 0;
        if (Array.isArray(userAns) && q.correctPairs) {
          userAns.forEach(pair => {
            if (q.correctPairs.some(cp => cp.leftId === pair.leftId && cp.rightId === pair.rightId)) {
              matchScore++;
            }
          });
        }
        isCorrect = matchScore === totalPairs && totalPairs > 0;
        selectedText = `${matchScore} من ${totalPairs} أزواج صحيحة`;
        correctText = "توصيل صحيح لكافة الأزواج";
      } else if (q.type === "true_false") {
        const correctVal = (q.answer === true || q.answer === 1 || q.answer === "1") ? 1 : 0;
        isCorrect = userAns === correctVal;
        selectedText = userAns === 1 ? "صح" : (userAns === 0 ? "خطأ" : "لم يُجب");
        correctText = correctVal === 1 ? "صح" : "خطأ";
      } else {
        const correctVal = typeof q.answer === "number" ? q.answer : 0;
        isCorrect = userAns === correctVal;
        if (q.options && typeof userAns === "number" && q.options[userAns]) {
          selectedText = q.options[userAns];
        }
        if (q.options && typeof correctVal === "number" && q.options[correctVal]) {
          correctText = q.options[correctVal];
        }
      }

      return {
        question_index: i + 1,
        question_text: q.question || `السؤال ${i + 1}`,
        question_type: q.type || "choice",
        selected_text: selectedText,
        correct_text: correctText,
        is_correct: isCorrect ? 1 : 0
      };
    });

    const nowIso = new Date().toISOString();
    const currentExamTitle = (window.currentActiveExamMeta && window.currentActiveExamMeta.title)
      || (document.getElementById("examTitleDisplay") ? document.getElementById("examTitleDisplay").textContent.trim() : "")
      || "اختبار مدرسة البيان لتعليم القرآن الكريم";
    const currentExamId = (window.currentActiveExamMeta && window.currentActiveExamMeta.id) || 1;
    const resultScore = data.score != null ? data.score : score;
    const resultTotal = data.total || totalQuestions || 1;
    const resultPercentage = data.percentage != null ? data.percentage : percentage;
    const resultPassed = resultPercentage >= 50 ? 1 : 0;
    const resultId = Date.now();

    const resultEntry = {
      result_id: resultId,
      id: resultId,
      exam_id: currentExamId,
      exam_title: currentExamTitle,
      student_name: student,
      score: resultScore,
      total_questions: resultTotal,
      percentage: resultPercentage,
      passed: resultPassed,
      created_at: nowIso,
      date: new Date().toLocaleDateString("ar-SA"),
      duration_minutes: window.totalDurationSeconds ? Math.round(window.totalDurationSeconds / 60) : 20,
      answers: formattedAnswers
    };

    // Store in local storage for student portal "درجاتي" (both results & exams keys)
    try {
      let portalCache = null;
      try {
        portalCache = JSON.parse(localStorage.getItem('albayan_student_portal_cache') || 'null');
      } catch(e) {}

      if (!portalCache || typeof portalCache !== "object") {
        portalCache = {
          success: true,
          student: {
            name: student,
            circle_name: "حلقة مدرسة البيان",
            teacher_name: "كادر التحفيظ"
          },
          stats: {},
          results: [],
          exams: []
        };
      }

      if (!Array.isArray(portalCache.results)) portalCache.results = [];
      if (!Array.isArray(portalCache.exams)) portalCache.exams = [];

      portalCache.results.unshift(resultEntry);
      portalCache.exams.unshift(resultEntry);

      // Recalculate stats
      const totalExams = portalCache.results.length;
      const passedExams = portalCache.results.filter(r => r.passed === 1 || r.percentage >= 50).length;
      const totalScore = portalCache.results.reduce((acc, r) => acc + (r.score || 0), 0);
      const totalQuestionsAll = portalCache.results.reduce((acc, r) => acc + (r.total_questions || 0), 0);
      const avgPercentage = totalExams > 0 ? Math.round(portalCache.results.reduce((acc, r) => acc + (r.percentage || 0), 0) / totalExams) : 0;

      portalCache.stats = {
        total_exams: totalExams,
        passed_exams: passedExams,
        failed_exams: totalExams - passedExams,
        avg_percentage: avgPercentage,
        total_score: totalScore,
        total_questions_all: totalQuestionsAll
      };

      localStorage.setItem('albayan_student_portal_cache', JSON.stringify(portalCache));
    } catch(e) {
      console.warn("Error caching result in student portal cache:", e);
    }

    // Push result to Firebase Realtime Database in background
    try {
      fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/results.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: currentExamId,
          exam_title: currentExamTitle,
          student_name: student,
          score: resultScore,
          total_questions: resultTotal,
          percentage: resultPercentage,
          passed: resultPassed,
          created_at: nowIso.replace('T', ' ').substring(0, 19),
          timestamp: nowIso,
          answers: formattedAnswers
        })
      }).catch(() => {});
    } catch(e) {}
  }

  window.isSubmitted = true;
  if (typeof window.stopTimer === "function") {
    window.stopTimer();
  }

  const dimOverlay = document.getElementById("warningDimOverlay");
  const floatingWidget = document.getElementById("floatingTimerWidget");
  if (dimOverlay) dimOverlay.style.display = "none";
  if (floatingWidget) floatingWidget.style.display = "none";

  if (studentElem) studentElem.disabled = true;
  document.querySelectorAll("input[type='radio'], input[type='checkbox'], select").forEach(inp => inp.disabled = true);

  // Apply results & color coding
  data.details.forEach((resDetail, i) => {
    const selectedOpt = resDetail.selected;
    const correctOpt = resDetail.correct;
    const q = questionsList[i];

    if (q && q.type === "matching") {
      const engine = window.matchingEngines ? window.matchingEngines[i] : null;
      if (engine && typeof engine.applyGrading === "function") {
        engine.applyGrading(resDetail);
      }
    } else {
      const markWrong = (sel) => {
        const wrongLabel = document.getElementById(`opt-${i}-${sel}`);
        if (wrongLabel) wrongLabel.classList.add("wrong");
      };

      const markCorrect = (idx) => {
        const correctLabel = document.getElementById(`opt-${i}-${idx}`);
        if (correctLabel) correctLabel.classList.add("correct");
      };

      if (Array.isArray(selectedOpt)) {
        selectedOpt.forEach((sel) => {
          if (!Array.isArray(correctOpt) || !correctOpt.includes(sel)) {
            markWrong(sel);
          }
        });
      } else if (selectedOpt !== -1 && selectedOpt !== correctOpt) {
        markWrong(selectedOpt);
      }

      if (Array.isArray(correctOpt)) {
        correctOpt.forEach(markCorrect);
      } else {
        markCorrect(correctOpt);
      }
    }
  });

  // Hide Submit Area
  const submitArea = document.getElementById("submitArea");
  if (submitArea) submitArea.style.display = "none";

  // 2-Second Modern Submission Toast Modal
  const toastModal = document.getElementById("submitToastModal");
  const toastTitle = document.getElementById("submitToastTitle");
  const toastDesc = document.getElementById("submitToastDesc");
  const toastIconWrap = document.getElementById("submitToastIconWrap");
  const toastBarFill = document.getElementById("submitToastBarFill");

  if (toastModal) {
    if (isAutoSubmit) {
      if (toastTitle) toastTitle.textContent = "⏰ انتهى وقت الاختبار!";
      if (toastDesc) toastDesc.textContent = "تم إرسال إجاباتك بنجاح وجارٍ إعداد بطاقة النتيجة...";
      if (toastIconWrap) toastIconWrap.classList.add("timeout");
    } else {
      if (toastTitle) toastTitle.textContent = "تم تسليم الإجابات بنجاح!";
      if (toastDesc) toastDesc.textContent = "جارٍ معالجة التقييم وإعداد بطاقة النتيجة...";
      if (toastIconWrap) toastIconWrap.classList.remove("timeout");
    }

    if (toastBarFill) {
      toastBarFill.style.width = "0%";
    }

    toastModal.classList.add("active");
    if (window.lucide) window.lucide.createIcons({ root: toastModal });

    setTimeout(() => {
      if (toastBarFill) toastBarFill.style.width = "100%";
    }, 50);

    setTimeout(() => {
      toastModal.classList.remove("active");
      showResultScreen(data);
    }, 2000);
  } else {
    showResultScreen(data);
  }
}

function showResultScreen(data) {
  const resultScreen = document.getElementById("resultScreen");
  if (!resultScreen) return;

  window.lastSubmissionData = data;

  const percentage = Math.round(data.percentage !== undefined ? data.percentage : ((data.score / data.total) * 100));
  const isPassed = percentage >= 50;
  const wrongCount = Math.max(0, data.total - data.score);

  const studentInput = document.getElementById("studentInput");
  const studentName = (studentInput && studentInput.value.trim()) ? studentInput.value.trim() : "طالبنا العزيز";

  let appraisalText = "ممتاز";
  if (percentage >= 90) appraisalText = "ممتاز مرتفع 🌟";
  else if (percentage >= 80) appraisalText = "جيد جداً 🟢";
  else if (percentage >= 65) appraisalText = "جيد 🔵";
  else if (percentage >= 50) appraisalText = "مقبول 🟡";
  else appraisalText = "يحتاج إلى تحسين 🔴";

  const greetingElem = document.getElementById("resultGreeting");
  const iconWrapper = document.getElementById("resultIconWrapper");
  const iconBox = document.getElementById("resultIconBox");
  const scoreElem = document.getElementById("resultScore");
  const statusPill = document.getElementById("resultStatusPill");
  const gradeLabel = document.getElementById("resultGradeLabel");

  const statCorrect = document.getElementById("statCorrect");
  const statPercent = document.getElementById("statPercent");
  const statWrong = document.getElementById("statWrong");
  const statGrade = document.getElementById("statGrade");

  const wrongBtnText = document.getElementById("wrongReviewBtnText");
  const wrongCountPill = document.getElementById("wrongCountPill");

  if (greetingElem) {
    greetingElem.textContent = isPassed ? `مبارك يا ${studentName}!` : `معوض خيراً يا ${studentName}`;
  }

  if (resultScreen) {
    resultScreen.style.display = "block";
    resultScreen.className = `result-screen visible ${isPassed ? 'pass-theme' : 'fail-theme'}`;
  }

  if (iconWrapper) {
    iconWrapper.className = `result-icon-wrapper ${isPassed ? '' : 'fail-theme'}`;
  }

  if (iconBox) {
    iconBox.innerHTML = isPassed
      ? '<i data-lucide="trophy" class="result-lucide-icon"></i>'
      : '<i data-lucide="refresh-cw" class="result-lucide-icon"></i>';
  }

  if (scoreElem) {
    scoreElem.textContent = `${percentage}%`;
    scoreElem.className = `result-score-val ${isPassed ? '' : 'fail-val'}`;
  }

  if (statusPill && gradeLabel) {
    statusPill.className = `result-status-pill ${isPassed ? '' : 'fail'}`;
    gradeLabel.textContent = isPassed ? "تم اجتياز الاختبار بنجاح" : "لم يتم الاجتياز — نوصي بالمراجعة";
  }

  if (statCorrect) statCorrect.textContent = `${data.score} / ${data.total}`;
  if (statPercent) statPercent.textContent = `${percentage}%`;
  if (statWrong) statWrong.textContent = `${wrongCount}`;
  if (statGrade) statGrade.textContent = appraisalText;

  if (wrongBtnText && wrongCountPill) {
    if (wrongCount > 0) {
      wrongBtnText.textContent = "مراجعة الأسئلة الخاطئة والتصحيح";
      wrongCountPill.textContent = `${wrongCount} أسئلة خاطئة`;
      wrongCountPill.className = "wrong-count-pill";
    } else {
      wrongBtnText.textContent = "استعراض الإجابات النموذجية (الدرجة كاملة 🎉)";
      wrongCountPill.textContent = "العلامة الكاملة ✨";
      wrongCountPill.className = "wrong-count-pill perfect-score";
    }
  }

  resultScreen.classList.add("visible");
  if (window.lucide) {
    window.lucide.createIcons({ root: resultScreen });
  }

  resultScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openWrongAnswersModal() {
  const modal = document.getElementById("wrongAnswersModal");
  const body = document.getElementById("reviewModalBody");
  if (!modal || !body) return;

  const data = window.lastSubmissionData;
  if (!data || !data.details) return;

  const questionsList = window.questions || [];
  const total = data.total || questionsList.length;
  const score = data.score || 0;
  const wrongCount = Math.max(0, total - score);
  const percentage = Math.round(data.percentage !== undefined ? data.percentage : ((score / total) * 100));

  const modalWrongCount = document.getElementById("modalWrongCount");
  const modalCorrectCount = document.getElementById("modalCorrectCount");
  const modalPercent = document.getElementById("modalPercent");
  const iconBadge = document.getElementById("reviewModalIconBadge");

  if (modalWrongCount) modalWrongCount.textContent = `${wrongCount}`;
  if (modalCorrectCount) modalCorrectCount.textContent = `${score}`;
  if (modalPercent) modalPercent.textContent = `${percentage}%`;

  if (iconBadge) {
    if (wrongCount === 0) {
      iconBadge.className = "review-modal-icon-badge perfect";
      iconBadge.innerHTML = '<i data-lucide="trophy" style="width:24px;height:24px;"></i>';
    } else {
      iconBadge.className = "review-modal-icon-badge";
      iconBadge.innerHTML = '<i data-lucide="file-x-2" style="width:24px;height:24px;"></i>';
    }
  }

  if (wrongCount === 0) {
    body.innerHTML = `
      <div class="review-perfect-state">
        <div class="review-perfect-icon">🏆</div>
        <h4 class="review-perfect-title">ما شاء الله تبارك الله — تفوق استثنائي!</h4>
        <p class="review-perfect-desc">
          تهانينا! لقد أجبت على جميع أسئلة الاختبار بنجاح تام وحصلت على الدرجة الكاملة (${score}/${total}) دون أي أخطاء. نسأل الله لك دوام التوفيق والبركة في حفظ وفهم كتاب الله.
        </p>
      </div>
    `;
  } else {
    let html = "";
    data.details.forEach((resDetail, i) => {
      const q = questionsList[i] || {};
      const qType = q.type || "choice";
      const qText = q.question || q.text || `السؤال رقم ${i + 1}`;

      let isQuestionCorrect = false;
      let studentAnswerDisplay = "";
      let correctAnswerDisplay = "";
      let typeLabel = "اختيار من متعدد";

      if (qType === "choice") {
        typeLabel = "اختيار من متعدد";
        const selIdx = resDetail.selected;
        const corrIdx = resDetail.correct;
        isQuestionCorrect = (selIdx === corrIdx && selIdx !== -1 && selIdx !== undefined);
        const options = q.options || [];
        studentAnswerDisplay = (selIdx !== -1 && selIdx !== undefined && options[selIdx]) 
          ? options[selIdx] 
          : '<span style="color:#94a3b8; font-weight:600;">(لم يتم اختيار إجابة)</span>';
        correctAnswerDisplay = (corrIdx !== undefined && options[corrIdx]) 
          ? options[corrIdx] 
          : (resDetail.correct_text || "—");

      } else if (qType === "true_false") {
        typeLabel = "صح أو خطأ";
        const selVal = resDetail.selected;
        const corrVal = resDetail.correct;
        const expectedVal = corrVal ? 1 : 0;
        isQuestionCorrect = (selVal === expectedVal);
        studentAnswerDisplay = (selVal === 1) ? "صح (✓)" : (selVal === 0 ? "خطأ (✗)" : '<span style="color:#94a3b8; font-weight:600;">(لم يتم التحديد)</span>');
        correctAnswerDisplay = corrVal ? "صح (✓)" : "خطأ (✗)";

      } else if (qType === "matching") {
        typeLabel = "توصيل الكلمات بين العمودين";
        isQuestionCorrect = resDetail.is_correct || (resDetail.correct_count === resDetail.total_pairs && resDetail.total_pairs > 0);
      }

      if (!isQuestionCorrect) {
        if (qType === "matching") {
          const leftItems = q.leftItems || (q.left ? q.left.map((t, idx) => ({ id: `L_${idx}`, text: t })) : []);
          const rightItems = q.rightItems || (q.right ? q.right.map((t, idx) => ({ id: `R_${idx}`, text: t })) : []);
          const rightMap = {};
          rightItems.forEach(r => { rightMap[String(r.id)] = r.text; });

          const correctPairs = resDetail.correctPairs || resDetail.correct || [];
          const correctMap = {};
          correctPairs.forEach(p => { correctMap[String(p.leftId)] = String(p.rightId); });

          const studentPairs = resDetail.selected || [];
          const studentMap = {};
          studentPairs.forEach(p => { studentMap[String(p.leftId)] = String(p.rightId); });

          let pairsHtml = "";
          leftItems.forEach(l => {
            const lid = String(l.id);
            const sRid = studentMap[lid];
            const cRid = correctMap[lid];
            const sText = sRid ? (rightMap[sRid] || sRid) : "(لم يتم التوصيل)";
            const cText = cRid ? (rightMap[cRid] || cRid) : "—";
            const isPairMatch = (sRid && sRid === cRid);

            pairsHtml += `
              <div class="matching-pair-row ${isPairMatch ? 'is-correct' : 'is-wrong'}">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span>${isPairMatch ? '✔️' : '❌'}</span>
                  <strong>${l.text}</strong>
                </div>
                <div style="text-align:left; font-size:12.5px;">
                  ${!isPairMatch ? `<span style="color:#dc2626; text-decoration:line-through; margin-left:8px;">${sText}</span>` : ''}
                  <span style="color:#16a34a; font-weight:800;">← ${cText}</span>
                </div>
              </div>
            `;
          });

          html += `
            <div class="wrong-q-card">
              <div class="wrong-q-head">
                <span class="wrong-q-num">
                  <i data-lucide="help-circle" style="width:14px;height:14px;"></i>
                  السؤال رقم ${i + 1}
                </span>
                <span class="wrong-q-type-badge">${typeLabel}</span>
              </div>
              <h4 class="wrong-q-text">${qText}</h4>
              <div class="matching-review-container">
                ${pairsHtml}
              </div>
            </div>
          `;
        } else {
          html += `
            <div class="wrong-q-card">
              <div class="wrong-q-head">
                <span class="wrong-q-num">
                  <i data-lucide="help-circle" style="width:14px;height:14px;"></i>
                  السؤال رقم ${i + 1}
                </span>
                <span class="wrong-q-type-badge">${typeLabel}</span>
              </div>
              <h4 class="wrong-q-text">${qText}</h4>
              <div class="wrong-answers-compare-grid">
                <div class="compare-box student-answer-box">
                  <span class="compare-box-label">
                    <i data-lucide="x-circle" style="width:14px;height:14px;"></i>
                    إجابتك المسجلة (خاطئة)
                  </span>
                  <div class="compare-box-content">${studentAnswerDisplay}</div>
                </div>
                <div class="compare-box correct-answer-box">
                  <span class="compare-box-label">
                    <i data-lucide="check-circle" style="width:14px;height:14px;"></i>
                    الإجابة النموذجية الصحيحة
                  </span>
                  <div class="compare-box-content">${correctAnswerDisplay}</div>
                </div>
              </div>
            </div>
          `;
        }
      }
    });

    body.innerHTML = html;
  }

  modal.classList.add("active");
  if (window.lucide) {
    window.lucide.createIcons({ root: modal });
  }
}

function closeWrongAnswersModal() {
  const modal = document.getElementById("wrongAnswersModal");
  if (modal) modal.classList.remove("active");
}

function showDuplicateSessionModal(studentName, msg) {
  const modal = document.getElementById("duplicateSessionModal");
  const nameElem = document.getElementById("dupStudentName");
  if (nameElem) {
    nameElem.textContent = studentName || "الطالب";
  }
  if (modal) {
    modal.classList.add("active");
    if (window.lucide) {
      window.lucide.createIcons({ root: modal });
    }
  }
}

function closeDuplicateSessionModal() {
  const modal = document.getElementById("duplicateSessionModal");
  if (modal) modal.classList.remove("active");
  const studentInput = document.getElementById("studentInput");
  if (studentInput) {
    studentInput.disabled = false;
    studentInput.focus();
  }
}

/**
 * Resilient multi-tier exam questions loader
 */
async function fetchExamQuestionsWithFallback() {
  let questionsData = null;

  // Tier 1: Local server endpoint if reachable (skip in Capacitor serverless mode)
  if (!window.IS_CAPACITOR_APP) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch("/questions", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          questionsData = normalizeQuestionsPayload(data);
        }
      }
    } catch (e) {}
  }

  // Tier 2: Dedicated Firebase RTDB /active_exam.json (Ultra-fast & exact active exam for mobile)
  if (!questionsData || questionsData.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const fbActiveRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/active_exam.json", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (fbActiveRes.ok) {
        const activeExam = await fbActiveRes.json();
        if (activeExam && typeof activeExam === "object" && activeExam.questions) {
          const raw = typeof activeExam.questions === "string" ? JSON.parse(activeExam.questions) : activeExam.questions;
          if (Array.isArray(raw) && raw.length > 0) {
            questionsData = normalizeQuestionsPayload(raw);
            window.diagnosticsState.firebaseStatus = "online";
            window.diagnosticsState.source = "firebase";
            window.diagnosticsState.examId = activeExam.cloud_id || `exams_${activeExam.id || 1}`;
            updateDiagnosticsUI();

            if (activeExam.title) {
              const titleElem = document.getElementById("examTitleDisplay");
              if (titleElem) titleElem.textContent = activeExam.title;
            }
            window.currentActiveExamMeta = {
              id: activeExam.id || 1,
              title: activeExam.title || "اختبار مدرسة البيان لتعليم القرآن الكريم",
              duration_minutes: activeExam.duration_minutes || 20
            };
            if (activeExam.duration_minutes) {
              const dur = parseInt(activeExam.duration_minutes, 10);
              if (dur > 0 && !window.examTimer) {
                window.timeLeft = dur * 60;
                window.totalDurationSeconds = dur * 60;
                const timerDisplay = document.getElementById("timerDisplay");
                if (timerDisplay) {
                  const minutes = Math.floor(window.timeLeft / 60);
                  const seconds = window.timeLeft % 60;
                  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Firebase active_exam.json fetch fallback:", e);
    }
  }

  // Tier 3: Firebase RTDB active exam from exams.json
  if (!questionsData || questionsData.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const fbExamsRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/exams.json", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (fbExamsRes.ok) {
        const examsObj = await fbExamsRes.json();
        if (examsObj && typeof examsObj === "object") {
          let activeExam = Object.values(examsObj).find(ex => ex && (ex.is_active === 1 || ex.is_active === "1"));
          if (!activeExam) {
            activeExam = Object.values(examsObj).find(ex => ex && ex.questions && ex.is_active !== 0 && ex.is_active !== "0");
          }
          if (activeExam && activeExam.questions) {
            const raw = typeof activeExam.questions === "string" ? JSON.parse(activeExam.questions) : activeExam.questions;
            if (Array.isArray(raw) && raw.length > 0) {
              questionsData = normalizeQuestionsPayload(raw);
              window.diagnosticsState.firebaseStatus = "online";
              window.diagnosticsState.source = "firebase";
              window.diagnosticsState.examId = activeExam.cloud_id || `exams_${activeExam.id || 3}`;
              updateDiagnosticsUI();

              if (activeExam.title) {
                const titleElem = document.getElementById("examTitleDisplay");
                if (titleElem) titleElem.textContent = activeExam.title;
              }
              window.currentActiveExamMeta = {
                id: activeExam.id || 1,
                title: activeExam.title || "اختبار مدرسة البيان لتعليم القرآن الكريم",
                duration_minutes: activeExam.duration_minutes || 20
              };
              if (activeExam.duration_minutes) {
                const dur = parseInt(activeExam.duration_minutes, 10);
                if (dur > 0 && !window.examTimer) {
                  window.timeLeft = dur * 60;
                  window.totalDurationSeconds = dur * 60;
                  const timerDisplay = document.getElementById("timerDisplay");
                  if (timerDisplay) {
                    const minutes = Math.floor(window.timeLeft / 60);
                    const seconds = window.timeLeft % 60;
                    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Firebase exams fetch fallback:", e);
    }
  }

  // Tier 3: Firebase RTDB questions.json directly
  if (!questionsData || questionsData.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const fbRes = await fetch("https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app/questions.json", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (fbRes.ok) {
        const raw = await fbRes.json();
        if (raw && typeof raw === "object") {
          const list = Array.isArray(raw) ? raw : Object.values(raw);
          if (list.length > 0) {
            questionsData = normalizeQuestionsPayload(list);
          }
        }
      }
    } catch (e) {
      console.warn("Firebase questions.json fetch fallback:", e);
    }
  }

  // Tier 4: Bundled questions.json inside the app
  if (!questionsData || questionsData.length === 0) {
    try {
      const localRes = await fetch("questions.json");
      if (localRes.ok) {
        const localList = await localRes.json();
        if (Array.isArray(localList) && localList.length > 0) {
          questionsData = normalizeQuestionsPayload(localList);
        }
      }
    } catch (e) {
      console.warn("Local questions.json fetch fallback:", e);
    }
  }

  // Tier 5: Built-in curated Quran questions bank
  if (!questionsData || questionsData.length === 0) {
    questionsData = getCuratedDefaultQuestions();
  }

  return questionsData;
}

function normalizeQuestionsPayload(list) {
  if (!Array.isArray(list)) return [];
  return list.map((q, idx) => {
    if (!q || typeof q !== "object") return null;
    const item = {
      id: q.id || `q_${idx}`,
      file: q.file || "اسئلة",
      type: q.type || (q.leftItems || q.left ? "matching" : (typeof q.answer === "boolean" ? "true_false" : "choice")),
      question: q.question || q.title || `السؤال ${idx + 1}`
    };

    if (item.type === "choice") {
      item.options = Array.isArray(q.options) ? q.options : ["خيار 1", "خيار 2", "خيار 3", "خيار 4"];
      item.answer = typeof q.answer === "number" ? q.answer : 0;
    } else if (item.type === "true_false") {
      item.options = ["صح", "خطأ"];
      item.answer = q.answer === true || q.answer === 1 || q.answer === "1";
    } else if (item.type === "matching") {
      let leftItems = q.leftItems;
      let rightItems = q.rightItems;
      if (!leftItems && Array.isArray(q.left)) {
        leftItems = q.left.map((t, i) => ({ id: `L${i+1}`, text: String(t) }));
      }
      if (!rightItems && Array.isArray(q.right)) {
        rightItems = q.right.map((t, i) => ({ id: `R${i+1}`, text: String(t) }));
      }
      item.leftItems = leftItems || [];
      item.rightItems = rightItems || [];
      item.left = (leftItems || []).map(x => x.text);
      item.right = (rightItems || []).map(x => x.text);
      item.instructions = q.instructions || "اضغط على الكلمة في العمود الأول ثم اضغط على ما يناسبها في العمود الثاني للتوصيل بينهما.";
      item.correctPairs = q.correctPairs || [];
      item.answer = q.answer || [];
      item.points = q.points || (leftItems ? leftItems.length : 4);
    }
    return item;
  }).filter(Boolean);
}

function getCuratedDefaultQuestions() {
  return [
    {
      type: "choice",
      question: "ما هي السورة التي تُسمى بأم القرآن وأم الكتاب والسبع المثاني؟",
      options: ["سورة الفاتحة", "سورة البقرة", "سورة يس", "سورة الإخلاص"],
      answer: 0
    },
    {
      type: "choice",
      question: "كم عدد آيات سورة الفاتحة الكريمة؟",
      options: ["5 آيات", "6 آيات", "7 آيات", "8 آيات"],
      answer: 2
    },
    {
      type: "choice",
      question: "ما هي أطول سورة في القرآن الكريم؟",
      options: ["سورة النساء", "سورة آل عمران", "سورة البقرة", "سورة المائدة"],
      answer: 2
    },
    {
      type: "choice",
      question: "ما هي السورة التي تعدل ثلث القرآن في الأجر والفضل؟",
      options: ["سورة الكوثر", "سورة الفلق", "سورة الإخلاص", "سورة الناس"],
      answer: 2
    },
    {
      type: "choice",
      question: "كم عدد أجزاء القرآن الكريم؟",
      options: ["25 جزءاً", "30 جزءاً", "35 جزءاً", "40 جزءاً"],
      answer: 1
    },
    {
      type: "true_false",
      question: "سورة الإخلاص تعدل ثلث القرآن الكريم في الأجر والفضل.",
      answer: true
    },
    {
      type: "true_false",
      question: "القرآن الكريم نزل مفرقاً على النبي ﷺ خلال 23 عاماً.",
      answer: true
    },
    {
      type: "true_false",
      question: "عدد سور القرآن الكريم 110 سور فقط.",
      answer: false
    },
    {
      type: "true_false",
      question: "أول ما نزل من القرآن الكريم هي الآيات الأولى من سورة العلق (اقرأ باسم ربك).",
      answer: true
    },
    {
      type: "true_false",
      question: "سورة الكوثر هي أطول سورة في كتاب الله تعالى.",
      answer: false
    },
    {
      id: "match_q1",
      type: "matching",
      question: "صل بين السور القرآنية المباركة وعدد آياتها:",
      instructions: "اضغط على اسم السورة ثم اضغط على عدد آياتها لتوصيلهما معاً",
      left: ["سورة الفاتحة", "سورة الإخلاص", "سورة الفلق", "سورة الكوثر"],
      leftItems: [
        { id: "L1", text: "سورة الفاتحة" },
        { id: "L2", text: "سورة الإخلاص" },
        { id: "L3", text: "سورة الفلق" },
        { id: "L4", text: "سورة الكوثر" }
      ],
      right: ["4 آيات", "7 آيات", "3 آيات", "5 آيات"],
      rightItems: [
        { id: "R1", text: "4 آيات" },
        { id: "R2", text: "7 آيات" },
        { id: "R3", text: "3 آيات" },
        { id: "R4", text: "5 آيات" }
      ],
      correctPairs: [
        { leftId: "L1", rightId: "R2" },
        { leftId: "L2", rightId: "R1" },
        { leftId: "L3", rightId: "R4" },
        { leftId: "L4", rightId: "R3" }
      ],
      answer: [1, 0, 3, 2],
      points: 4
    }
  ];
}

// Window exports
window.submitExam = submitExam;
window.showResultScreen = showResultScreen;
window.openWrongAnswersModal = openWrongAnswersModal;
window.closeWrongAnswersModal = closeWrongAnswersModal;
window.showDuplicateSessionModal = showDuplicateSessionModal;
window.closeDuplicateSessionModal = closeDuplicateSessionModal;
window.updateDiagnosticsUI = updateDiagnosticsUI;
window.toggleDiagnosticsModal = toggleDiagnosticsModal;
window.reloadExamQuestions = reloadExamQuestions;
window.fetchExamQuestionsWithFallback = fetchExamQuestionsWithFallback;
window.normalizeQuestionsPayload = normalizeQuestionsPayload;
window.getCuratedDefaultQuestions = getCuratedDefaultQuestions;
