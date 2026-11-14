/* ====================================================
   STUDENT EXAM QUESTIONS ENGINE
   بناء الأسئلة، التحقق من الاسم الثلاثي، ونظام المتابعة والتنقل
==================================================== */

window.questions = [];
window.answeredCount = 0;
window.activeExamStudentName = "";
window.matchingEngines = {};

let nameInputDebounceTimer = null;
let studentCheckTimeout = null;

function validateArabicTripleName(name) {
  if (!name || name.trim().length < 2) {
    return { valid: false, message: "⚠️ يرجى إدخال اسم الطالب (حرفين على الأقل)." };
  }

  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(w => w.length >= 1);
  if (words.length >= 3) {
    return { valid: true, message: "✓ الاسم الثلاثي مكتمل ومعتمد" };
  } else {
    return { valid: true, message: "✓ تم قبول اسم الطالب" };
  }
}

async function checkStudentAlreadyTaken(studentName, inputElem, feedbackElem, lockElem, qAreaElem, btnElem) {
  if (window.IS_CAPACITOR_APP) return;
  if (studentCheckTimeout) clearTimeout(studentCheckTimeout);
  studentCheckTimeout = setTimeout(async () => {
    try {
      const res = await fetch("/api/check-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: studentName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.already_taken) {
          if (btnElem) btnElem.disabled = true;
          if (lockElem) {
            lockElem.classList.add("visible");
            lockElem.style.display = "flex";
          }
          if (qAreaElem) qAreaElem.classList.add("locked", "disabled-area");
          if (feedbackElem) {
            feedbackElem.style.display = "flex";
            feedbackElem.textContent = "🚫 هذا الاسم مسجل مسبقاً في هذا الاختبار وتم رصد درجاته.";
            feedbackElem.className = "input-feedback invalid invalid-msg";
          }
          if (typeof window.showDuplicateSessionModal === "function") {
            window.showDuplicateSessionModal(studentName, data.message || "عذراً، هذا الاسم مسجل مسبقاً في هذه الجلسة.");
          }
        }
      }
    } catch (e) {}
  }, 350);
}

function resetExamAnswers(resetTimer = true) {
  // 1. Uncheck and clear all radio inputs
  document.querySelectorAll('input[type="radio"]').forEach(r => {
    r.checked = false;
    const optLabel = r.closest('.opt-label') || r.closest('.option');
    if (optLabel) optLabel.classList.remove('checked', 'wrong', 'correct');
  });

  // 2. Uncheck and clear all true/false checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    const tfLabel = cb.closest('.tf-label');
    if (tfLabel) tfLabel.classList.remove('checked');
    const row = cb.closest('.truefalse-row');
    if (row) {
      row.querySelectorAll('.opt-label').forEach(l => l.classList.remove('checked', 'wrong', 'correct'));
    }
  });

  // 3. Reset all matching questions
  if (window.matchingEngines) {
    Object.values(window.matchingEngines).forEach(engine => {
      if (engine && typeof engine.reset === "function") {
        engine.reset();
      }
    });
  }

  // 4. Reset progress indicators
  window.answeredCount = 0;
  updateProgress();

  // 5. Reset timer if requested
  if (resetTimer && typeof window.resetTimerUI === "function") {
    window.resetTimerUI();
  }
}

function onNameInput(immediate = false) {
  if (nameInputDebounceTimer) {
    clearTimeout(nameInputDebounceTimer);
    nameInputDebounceTimer = null;
  }

  if (immediate === true) {
    executeNameValidation();
  } else {
    nameInputDebounceTimer = setTimeout(executeNameValidation, 200);
  }
}

function executeNameValidation() {
  const studentInputElem = document.getElementById("studentInput") || document.getElementById("student");
  if (!studentInputElem) return;

  const rawInput = studentInputElem.value || "";
  const trimmed = rawInput.trim();

  const lockedOverlay = document.getElementById("lockedOverlay") || document.getElementById("examOverlay");
  const questionsArea = document.getElementById("questionsArea") || document.getElementById("questions");
  const submitBtn = document.getElementById("submitBtn");
  const feedback = document.getElementById("nameFeedback") || document.getElementById("studentHelperMsg");

  // Keep questionsArea accessible and questions visible
  if (questionsArea) questionsArea.classList.remove("locked", "disabled-area");
  if (lockedOverlay) {
    lockedOverlay.classList.remove("visible");
    lockedOverlay.style.display = "none";
  }

  if (trimmed.length === 0) {
    window.activeExamStudentName = "";

    studentInputElem.classList.remove("invalid", "valid", "input-invalid", "input-valid");
    if (feedback) {
      feedback.style.display = "flex";
      feedback.textContent = "💡 أدخل اسمك لتفعيل زر إرسال الإجابات";
      feedback.className = "input-feedback";
    }
    if (submitBtn) submitBtn.disabled = true;
    if (typeof window.stopTimer === "function") {
      window.stopTimer();
    }
    if (typeof window.updateDiagnosticsUI === "function") {
      window.updateDiagnosticsUI();
    }
    return;
  }

  const validation = validateArabicTripleName(trimmed);

  if (validation.valid) {
    studentInputElem.classList.remove("invalid", "input-invalid");
    studentInputElem.classList.add("valid", "input-valid");
    if (feedback) {
      feedback.style.display = "flex";
      feedback.textContent = validation.message;
      feedback.className = "input-feedback valid valid-msg";
    }
    if (submitBtn) submitBtn.disabled = false;

    window.activeExamStudentName = trimmed;

    // Check duplicate student only when name has 3 or more words with smooth 600ms debounce
    const words = trimmed.split(/\s+/).filter(w => w.length >= 1);
    if (words.length >= 3) {
      checkStudentAlreadyTaken(trimmed, studentInputElem, feedback, null, null, submitBtn);
    }

    if (!window.examTimer && !window.isSubmitted && typeof window.startTimer === "function") {
      window.startTimer();
    }
  } else {
    studentInputElem.classList.add("invalid", "input-invalid");
    studentInputElem.classList.remove("valid", "input-valid");
    if (feedback) {
      feedback.style.display = "flex";
      feedback.textContent = validation.message;
      feedback.className = "input-feedback invalid invalid-msg";
    }
    if (submitBtn) submitBtn.disabled = true;
  }

  if (typeof window.updateDiagnosticsUI === "function") {
    window.updateDiagnosticsUI();
  }
}

function checkStudentName() {
  onNameInput(true);
}

function updateProgress() {
  if (window.isSubmitted) return;
  const total = (window.questions && window.questions.length) ? window.questions.length : 1;
  window.answeredCount = 0;

  (window.questions || []).forEach((q, i) => {
    let isAns = false;
    if (q.type === "matching") {
      const engine = window.matchingEngines ? window.matchingEngines[i] : null;
      if (engine && typeof engine.isComplete === "function" && engine.isComplete()) {
        isAns = true;
      }
    } else {
      const checked = document.querySelector(`input[name="q${i}"]:checked`);
      if (checked) isAns = true;
    }

    if (isAns) window.answeredCount += 1;

    const navBtn = document.getElementById(`nav-btn-${i}`);
    if (navBtn) {
      if (isAns) navBtn.classList.add("answered");
      else navBtn.classList.remove("answered");
    }
  });

  const percent = Math.round((window.answeredCount / total) * 100);
  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${window.answeredCount} / ${total} (${percent}%)`;

  const notice = document.getElementById("unansweredNotice");
  if (notice) {
    if (window.answeredCount < total && window.answeredCount > 0) {
      notice.style.display = "block";
    } else {
      notice.style.display = "none";
    }
  }
}

function scrollToQuestion(index) {
  const card = document.getElementById(`q-card-${index}`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelectorAll(".q-nav-btn").forEach(btn => btn.classList.remove("current"));
    const btn = document.getElementById(`nav-btn-${index}`);
    if (btn) btn.classList.add("current");
  }
}

function selectTfOption(input) {
  const row = input.closest('.truefalse-row');
  if (row) {
    row.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb !== input) cb.checked = false;
    });
    row.querySelectorAll('.tf-label').forEach(opt => opt.classList.remove('checked'));
    if (input.checked) {
      input.closest('.tf-label').classList.add('checked');
    }
  }
}

function buildQuestions(data) {
  if (!Array.isArray(data)) return;
  window.questions = data;
  window.matchingEngines = {};

  const countElem = document.getElementById("questionCount");
  if (countElem) countElem.textContent = data.length;

  const container = document.getElementById("questionsContainer") || document.getElementById("questions");
  if (!container) return;
  container.innerHTML = "";

  const navContainer = document.getElementById("qNavigator");
  if (navContainer) navContainer.style.display = "none";

  const progressCard = document.getElementById("progressCard");
  if (progressCard) progressCard.style.display = "block";

  const submitArea = document.getElementById("submitArea");
  if (submitArea) submitArea.style.display = "block";

  // Build true/false grouping card if needed
  let tfCardCreated = false;
  let tfBodyElem = null;

  data.forEach((q, i) => {
    if (q.type === "true_false") {
      if (!tfCardCreated) {
        tfCardCreated = true;
        const tfCard = document.createElement("article");
        tfCard.className = "question-card truefalse-card";
        tfCard.innerHTML = `
          <div class="question-head truefalse-card-head">
            <div class="q-num-badge tf-head-badge">
              <i data-lucide="check-square" style="width:16px;height:16px;"></i>
            </div>
            <h3 class="q-text tf-head-title">أسئلة الصح والخطأ</h3>
          </div>
          <div class="truefalse-table-wrapper">
            <div class="truefalse-table-header">
              <div class="tf-col-title">الفقرة / السؤال</div>
              <div class="tf-col-head tf-col-true">🟢 صح</div>
              <div class="tf-col-head tf-col-false">🔴 خطأ</div>
            </div>
            <div class="truefalse-table-body" id="tfTableBody"></div>
          </div>
        `;
        container.appendChild(tfCard);
        tfBodyElem = tfCard.querySelector("#tfTableBody");
      }

      const row = document.createElement("div");
      row.className = "truefalse-row";
      row.id = `q-card-${i}`;
      row.innerHTML = `
        <div class="truefalse-question">
          <span class="q-num-badge">${i + 1}</span>
          <span class="truefalse-text">${q.question}</span>
        </div>
        <label class="tf-label tf-true opt-label" id="opt-${i}-1" title="صح">
          <input type="checkbox" name="q${i}" value="1" onchange="selectTfOption(this); updateProgress();" class="custom-tf-box true-box">
        </label>
        <label class="tf-label tf-false opt-label" id="opt-${i}-0" title="خطأ">
          <input type="checkbox" name="q${i}" value="0" onchange="selectTfOption(this); updateProgress();" class="custom-tf-box false-box">
        </label>
      `;
      tfBodyElem.appendChild(row);
    } else if (q.type === "matching") {
      const card = document.createElement("article");
      card.className = "question-card";
      card.id = `q-card-${i}`;
      card.innerHTML = `
        <div class="question-head">
          <div class="q-num-badge">${i + 1}</div>
          <h3 class="q-text">${q.question || q.title || "توصيل الكلمات بين العمودين"}</h3>
        </div>
        <div class="options">
          <div id="matching-host-${i}"></div>
        </div>
      `;
      container.appendChild(card);

      const hostElem = card.querySelector(`#matching-host-${i}`);
      if (typeof MatchingQuestionEngine !== "undefined") {
        const engine = new MatchingQuestionEngine({
          container: hostElem,
          question: q,
          questionIndex: i,
          onChange: () => updateProgress()
        });
        window.matchingEngines[i] = engine;
      }
    } else {
      const card = document.createElement("article");
      card.className = "question-card";
      card.id = `q-card-${i}`;

      const optionsHtml = (q.options || []).map((o, j) => `
        <label class="opt-label option" id="opt-${i}-${j}">
          <input type="radio" name="q${i}" value="${j}" onchange="updateProgress();">
          <span class="opt-radio-circle"></span>
          <span>${o}</span>
        </label>
      `).join("");

      card.innerHTML = `
        <div class="question-head">
          <div class="q-num-badge">${i + 1}</div>
          <h3 class="q-text">${q.question}</h3>
        </div>
        <div class="options">${optionsHtml}</div>
      `;
      container.appendChild(card);
    }
  });

  const lockedOverlay = document.getElementById("lockedOverlay");
  const questionsArea = document.getElementById("questionsArea");
  if (questionsArea) {
    questionsArea.classList.remove("locked", "disabled-area");
  }
  if (lockedOverlay) {
    lockedOverlay.classList.remove("visible");
    lockedOverlay.style.display = "none";
  }

  updateProgress();
  if (typeof window.updateDiagnosticsUI === "function") {
    window.updateDiagnosticsUI();
  }
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getUnansweredQuestions() {
  const unanswered = [];
  (window.questions || []).forEach((q, i) => {
    let isAns = false;
    if (q.type === "matching") {
      const engine = window.matchingEngines ? window.matchingEngines[i] : null;
      if (engine && typeof engine.isComplete === "function" && engine.isComplete()) {
        isAns = true;
      }
    } else {
      const checked = document.querySelector(`input[name="q${i}"]:checked`);
      if (checked) isAns = true;
    }
    if (!isAns) {
      let typeLabel = "اختيار من متعدد";
      if (q.type === "true_false") typeLabel = "صح أو خطأ";
      else if (q.type === "matching") typeLabel = "صل الكلمات";

      unanswered.push({
        index: i,
        num: i + 1,
        type: q.type || "choice",
        typeLabel: typeLabel,
        questionText: q.question || q.title || `السؤال رقم ${i + 1}`
      });
    }
  });
  return unanswered;
}

function formatUnansweredArabicMessage(unanswered) {
  const count = unanswered.length;
  const numbersList = unanswered.map(u => u.num);

  if (count === 1) {
    return {
      heading: `تنبيه: لديك سؤال واحد لم تجب عليه (السؤال ${numbersList[0]})!`,
      subtext: `هل ترغب في العودة لحل السؤال ${numbersList[0]} والحصول على الدرجة كاملة، أم تسليم الإجابات كما هي؟`
    };
  } else if (count === 2) {
    return {
      heading: `تنبيه: لديك سؤالان لم تجب عنهما (السؤال ${numbersList[0]} و ${numbersList[1]})!`,
      subtext: `هل ترغب في العودة لإكمالهما والحصول على الدرجة كاملة، أم تسليم الإجابات كما هي؟`
    };
  } else if (count <= 10) {
    const listStr = numbersList.slice(0, 5).join(" و ") + (numbersList.length > 5 ? "..." : "");
    return {
      heading: `تنبيه: لديك ${count} أسئلة لم تجب عليها (الأسئلة ${listStr})!`,
      subtext: `هل ترغب في العودة لإكمال هذه الأسئلة الشاغرة والحصول على أفضل تقييم، أم تسليم الإجابات كما هي؟`
    };
  } else {
    return {
      heading: `تنبيه: لديك ${count} سؤالاً لم تجب عليها بعد!`,
      subtext: `هل ترغب في العودة لإكمال أسئلة الاختبار المتبقية، أم تسليم الإجابات كما هي؟`
    };
  }
}

function showPreSubmitModal(unansweredList) {
  const modal = document.getElementById("preSubmitModal");
  if (!modal) return;

  const msg = formatUnansweredArabicMessage(unansweredList);
  const headingElem = document.getElementById("preSubmitAlertHeading");
  const subtextElem = document.getElementById("preSubmitAlertSubtext");
  const chipsGrid = document.getElementById("preSubmitChipsGrid");

  if (headingElem) headingElem.textContent = msg.heading;
  if (subtextElem) subtextElem.textContent = msg.subtext;

  if (chipsGrid) {
    chipsGrid.innerHTML = unansweredList.map(u => `
      <div class="presubmit-q-chip" onclick="jumpToUnansweredQuestion(${u.index})" title="انتقل إلى السؤال ${u.num}">
        <span class="chip-num">${u.num}</span>
        <span>السؤال ${u.num} (${u.typeLabel})</span>
      </div>
    `).join("");
  }

  modal.classList.add("active");
  if (window.lucide) {
    window.lucide.createIcons({ root: modal });
  }
}

function closePreSubmitModal() {
  const modal = document.getElementById("preSubmitModal");
  if (modal) modal.classList.remove("active");
}

function jumpToUnansweredQuestion(index) {
  closePreSubmitModal();
  const card = document.getElementById(`q-card-${index}`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("target-unanswered-pulse");
    void card.offsetWidth; // force reflow
    card.classList.add("target-unanswered-pulse");
    setTimeout(() => {
      card.classList.remove("target-unanswered-pulse");
    }, 2000);
  }
}

function jumpToFirstUnanswered() {
  const unanswered = getUnansweredQuestions();
  if (unanswered.length > 0) {
    jumpToUnansweredQuestion(unanswered[0].index);
  } else {
    closePreSubmitModal();
  }
}

function confirmForceSubmit() {
  closePreSubmitModal();
  if (typeof window.submitExam === "function") {
    window.submitExam(false, true);
  }
}

// Window exports
window.validateArabicTripleName = validateArabicTripleName;
window.resetExamAnswers = resetExamAnswers;
window.onNameInput = onNameInput;
window.executeNameValidation = executeNameValidation;
window.checkStudentName = checkStudentName;
window.updateProgress = updateProgress;
window.scrollToQuestion = scrollToQuestion;
window.selectTfOption = selectTfOption;
window.buildQuestions = buildQuestions;
window.getUnansweredQuestions = getUnansweredQuestions;
window.showPreSubmitModal = showPreSubmitModal;
window.closePreSubmitModal = closePreSubmitModal;
window.jumpToUnansweredQuestion = jumpToUnansweredQuestion;
window.jumpToFirstUnanswered = jumpToFirstUnanswered;
window.confirmForceSubmit = confirmForceSubmit;
