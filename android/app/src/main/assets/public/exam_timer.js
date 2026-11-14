/* ====================================================
   STUDENT EXAM TIMER ENGINE
   محرك العداد الزمني والتنبيهات البصرية لقرب انتهاء الوقت
==================================================== */

window.examTimer = null;
window.EXAM_DURATION_MINUTES = 20;
window.timeLeft = window.EXAM_DURATION_MINUTES * 60;
window.totalDurationSeconds = window.EXAM_DURATION_MINUTES * 60;
window.hasWarningTriggered = false;
window.warningDimTimer = null;

function startTimer() {
  const timerDisplay = document.getElementById("timerDisplay");
  const timerPill = document.getElementById("timerPill");
  const floatingWidget = document.getElementById("floatingTimerWidget");
  const floatingTime = document.getElementById("floatingTimerTime");
  const dimOverlay = document.getElementById("warningDimOverlay");

  if (window.examTimer) {
    clearInterval(window.examTimer);
    window.examTimer = null;
  }

  window.examTimer = setInterval(() => {
    if (window.timeLeft <= 0) {
      clearInterval(window.examTimer);
      window.examTimer = null;
      if (floatingWidget) floatingWidget.style.display = "none";
      if (dimOverlay) dimOverlay.style.display = "none";
      if (typeof window.submitExam === "function") {
        window.submitExam(true);
      }
      return;
    }

    window.timeLeft--;
    const minutes = Math.floor(window.timeLeft / 60);
    const seconds = window.timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (timerDisplay) timerDisplay.textContent = timeStr;

    // نبض عاجل عندما يتبقى أقل من 3 دقائق
    if (window.timeLeft < 180 && timerPill) {
      timerPill.classList.add("urgent");
    }

    // تنبيه بصري لطيف عند بلوغ ربع الوقت المتبقي
    const limit = (window.totalDurationSeconds || (20 * 60)) / 4;
    if (window.timeLeft <= limit) {
      if (floatingWidget) {
        floatingWidget.style.display = "flex";
      }
      if (floatingTime) {
        floatingTime.textContent = timeStr;
      }
      if (dimOverlay) {
        dimOverlay.style.display = "block";
        if (!window.hasWarningTriggered) {
          window.hasWarningTriggered = true;
          dimOverlay.classList.remove("dim-relaxed");
          dimOverlay.classList.add("dim-active");
          // بعد ثانيتين يتم تخفيف التعتيم إلى 95% شفافية
          if (window.warningDimTimer) clearTimeout(window.warningDimTimer);
          window.warningDimTimer = setTimeout(() => {
            if (dimOverlay) {
              dimOverlay.classList.remove("dim-active");
              dimOverlay.classList.add("dim-relaxed");
            }
          }, 2000);
        }
      }
    } else {
      window.hasWarningTriggered = false;
      if (window.warningDimTimer) clearTimeout(window.warningDimTimer);
      if (floatingWidget) {
        floatingWidget.style.display = "none";
      }
      if (dimOverlay) {
        dimOverlay.style.display = "none";
        dimOverlay.classList.remove("dim-active", "dim-relaxed");
      }
    }
  }, 1000);
}

function stopTimer() {
  if (window.examTimer) {
    clearInterval(window.examTimer);
    window.examTimer = null;
  }
}

function resetTimerUI(customSeconds = null) {
  stopTimer();
  window.timeLeft = customSeconds || window.totalDurationSeconds || (window.EXAM_DURATION_MINUTES * 60);
  
  const timerDisplay = document.getElementById("timerDisplay");
  if (timerDisplay) {
    const minutes = Math.floor(window.timeLeft / 60);
    const seconds = window.timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  const timerPill = document.getElementById("timerPill");
  if (timerPill) timerPill.classList.remove("urgent");

  const dimOverlay = document.getElementById("warningDimOverlay");
  const floatingWidget = document.getElementById("floatingTimerWidget");
  if (dimOverlay) {
    dimOverlay.style.display = "none";
    dimOverlay.classList.remove("dim-active", "dim-relaxed");
  }
  if (floatingWidget) floatingWidget.style.display = "none";
  window.hasWarningTriggered = false;
}

window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.resetTimerUI = resetTimerUI;
