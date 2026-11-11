/**
 * MatchingQuestionEngine - محرك تفاعلي متقدم لأسئلة توصيل الكلمات بين العمودين
 * يدعم:
 * 1. الخلط العشوائي المستقل للعمودين مع حفظ المعرفات الفريدة (IDs).
 * 2. التوصيل بالنقر المباشر (Click/Tap) والسحب والإفلات (Drag and Drop / Touch Drag).
 * 3. رسم خطوط SVG منحنية وديناميكية (Bézier Curves) بين نقاط التوصيل.
 * 4. إدارة حالة التوصيل (1-to-1 constraint) وإلغاء التوصيل الفردي أو الكلي.
 * 5. واجهة عصرية ومتجاوبة بالكامل للهواتف الذكية وأجهزة الكمبيوتر.
 * 6. وضع المراجعة والتصحيح (Review Mode) مع تمييز الإجابات الصحيحة والخاطئة.
 */

class MatchingQuestionEngine {
  constructor(options) {
    this.container = typeof options.container === 'string' ? document.querySelector(options.container) : options.container;
    this.rawQuestion = options.question || {};
    this.questionIndex = options.questionIndex !== undefined ? options.questionIndex : 0;
    this.isReadOnly = options.readOnly || false;
    this.onChange = options.onChange || function() {};
    
    // Palette for distinct, high-contrast, non-overlapping connection lines (Zero Red, Zero similar shades)
    this.colors = [
      { border: '#2563eb', bg: '#eff6ff', line: '#2563eb', text: '#1d4ed8' }, // 0: Royal Blue (أزرق ملكي)
      { border: '#16a34a', bg: '#f0fdf4', line: '#16a34a', text: '#15803d' }, // 1: Emerald Green (أخضر زمردي)
      { border: '#9333ea', bg: '#faf5ff', line: '#9333ea', text: '#7e22ce' }, // 2: Royal Purple / Violet (بنفسجي أرجواني)
      { border: '#d97706', bg: '#fffbeb', line: '#d97706', text: '#b45309' }, // 3: Warm Amber Gold (أصفر كهرماني ذهبي)
      { border: '#0891b2', bg: '#ecfeff', line: '#06b6d4', text: '#0e7490' }, // 4: Electric Cyan / Turquoise (سماوي تركواز)
      { border: '#334155', bg: '#f8fafc', line: '#475569', text: '#1e293b' }, // 5: Charcoal Slate (رمادي فحمي فولاذي)
      { border: '#854d0e', bg: '#fefce8', line: '#854d0e', text: '#713f12' }, // 6: Bronze Brown (بني برونزي دافئ)
      { border: '#c026d3', bg: '#fdf4ff', line: '#c026d3', text: '#a21caf' }  // 7: Orchid Magenta (ماجنتي زهري بنفسجي)
    ];

    // Normalize Data Structure
    this.normalizeData();

    // Internal State
    this.selectedLeftId = null;
    this.selectedRightId = null;
    // userPairs: Map of leftId => rightId
    this.userPairs = new Map();
    // Color assignment map: leftId => color index
    this.pairColors = new Map();

    // Drag tracking
    this.activeDragFrom = null; // { side: 'left'|'right', id: '...' }

    // Init UI
    this.init();
  }

  /**
   * Normalizes the question data to ensure ID-based representation
   */
  normalizeData() {
    const q = this.rawQuestion;
    this.id = q.id || `q_match_${this.questionIndex}_${Date.now()}`;
    this.title = q.question || q.title || "صل الكلمات في العمودين";
    this.instructions = q.instructions || "اضغط على الكلمة في العمود الأول ثم اضغط على ما يناسبها في العمود الثاني للتوصيل بينهما.";
    this.points = q.points || 1;

    let leftList = [];
    let rightList = [];
    let correctPairsList = [];

    // Format 1: New ID-based schema { leftItems: [...], rightItems: [...], correctPairs: [...] }
    if (Array.isArray(q.leftItems) && Array.isArray(q.rightItems)) {
      leftList = q.leftItems.map((item, idx) => ({
        id: String(item.id !== undefined ? item.id : `L_${idx}`),
        text: item.text || String(item)
      }));

      rightList = q.rightItems.map((item, idx) => ({
        id: String(item.id !== undefined ? item.id : `R_${idx}`),
        text: item.text || String(item)
      }));

      if (Array.isArray(q.correctPairs)) {
        correctPairsList = q.correctPairs.map(p => ({
          leftId: String(p.leftId),
          rightId: String(p.rightId)
        }));
      }
    } 
    // Format 2: Legacy schema { left: [...], right: [...], answer: [...] or pairs: {...} }
    else if (Array.isArray(q.left) && Array.isArray(q.right)) {
      leftList = q.left.map((text, idx) => ({
        id: `L_${idx}`,
        text: String(text)
      }));

      rightList = q.right.map((text, idx) => ({
        id: `R_${idx}`,
        text: String(text)
      }));

      if (Array.isArray(q.answer)) {
        // q.answer is array of right item index corresponding to left item at index i
        q.answer.forEach((rIdx, lIdx) => {
          if (rIdx !== undefined && rIdx !== null && rIdx >= 0 && rIdx < rightList.length) {
            correctPairsList.push({
              leftId: `L_${lIdx}`,
              rightId: `R_${rIdx}`
            });
          }
        });
      } else if (q.pairs && typeof q.pairs === 'object') {
        Object.entries(q.pairs).forEach(([lIdx, rIdx]) => {
          correctPairsList.push({
            leftId: `L_${lIdx}`,
            rightId: `R_${rIdx}`
          });
        });
      }
    }

    this.originalLeftItems = leftList;
    this.originalRightItems = rightList;
    this.correctPairs = correctPairsList;

    // Independent Shuffling for Student View
    this.leftItems = this.shuffleArray([...leftList]);
    this.rightItems = this.shuffleArray([...rightList]);
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Initial DOM Construction
   */
  init() {
    if (!this.container) return;

    this.container.classList.add('matching-engine-root');
    this.container.innerHTML = `
      <div class="matching-container" id="match-wrapper-${this.questionIndex}">
        <!-- Instructions Header -->
        <div class="matching-header">
          <div class="matching-instructions">
            <i data-lucide="info" class="matching-info-icon"></i>
            <span>${this.instructions}</span>
          </div>
        </div>

        <!-- Matching Stage -->
        <div class="matching-stage" id="stage-${this.questionIndex}">
          <!-- SVG Overlay for dynamic Bézier lines -->
          <svg class="matching-svg-layer" id="svg-layer-${this.questionIndex}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow-${this.questionIndex}" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g class="lines-group" id="lines-group-${this.questionIndex}"></g>
          </svg>

          <!-- Column 1 (Right side in Arabic RTL - First items) -->
          <div class="matching-col col-first" id="col-first-${this.questionIndex}">
            <div class="matching-col-title">العمود الأول</div>
            <div class="matching-items-list" id="items-left-${this.questionIndex}">
              ${this.leftItems.map((item, idx) => `
                <div class="match-card match-left-card" 
                     data-id="${item.id}" 
                     data-side="left" 
                     id="card-left-${this.questionIndex}-${item.id}" 
                     tabindex="0"
                     draggable="false">
                  <span class="match-item-text">${item.text}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Column 2 (Left side in Arabic RTL - Target items) -->
          <div class="matching-col col-second" id="col-second-${this.questionIndex}">
            <div class="matching-col-title">العمود الثاني</div>
            <div class="matching-items-list" id="items-right-${this.questionIndex}">
              ${this.rightItems.map((item, idx) => `
                <div class="match-card match-right-card" 
                     data-id="${item.id}" 
                     data-side="right" 
                     id="card-right-${this.questionIndex}-${item.id}" 
                     tabindex="0"
                     draggable="false">
                  <span class="match-item-text">${item.text}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Status / Counter Bar -->
        <div class="matching-footer">
          <div class="matching-status-pill" id="status-pill-${this.questionIndex}">
            <span class="status-indicator"></span>
            <span class="status-text">تم توصيل 0 من ${this.leftItems.length}</span>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons({ root: this.container });
    }

    this.bindEvents();
    this.setupResizeObserver();
  }

  /**
   * Bind Click, Drag, Touch & Reset Events
   */
  bindEvents() {
    const stage = document.getElementById(`stage-${this.questionIndex}`);
    const resetBtn = document.getElementById(`btn-reset-${this.questionIndex}`);

    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetAllPairs();
      });
    }

    if (this.isReadOnly) return;

    // Pointer Drag & Click on Left Cards
    this.leftItems.forEach(item => {
      const card = document.getElementById(`card-left-${this.questionIndex}-${item.id}`);
      if (card) {
        card.addEventListener('pointerdown', (e) => {
          this.handlePointerDown('left', item.id, e);
        });
        card.addEventListener('click', (e) => {
          if (this.suppressClickUntil && Date.now() < this.suppressClickUntil) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          this.handleCardClick('left', item.id);
        });
      }
    });

    // Pointer Drag & Click on Right Cards
    this.rightItems.forEach(item => {
      const card = document.getElementById(`card-right-${this.questionIndex}-${item.id}`);
      if (card) {
        card.addEventListener('pointerdown', (e) => {
          this.handlePointerDown('right', item.id, e);
        });
        card.addEventListener('click', (e) => {
          if (this.suppressClickUntil && Date.now() < this.suppressClickUntil) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          this.handleCardClick('right', item.id);
        });
      }
    });

    // Window resize, orientationchange & scroll recalculation
    window.addEventListener('resize', () => this.drawLines());
    window.addEventListener('orientationchange', () => setTimeout(() => this.drawLines(), 150));
    window.addEventListener('scroll', () => this.drawLines(), { passive: true });
  }

  /**
   * Setup ResizeObserver for responsive redraws
   */
  setupResizeObserver() {
    const stage = document.getElementById(`stage-${this.questionIndex}`);
    if (!stage || !window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.drawLines());
    });
    this.resizeObserver.observe(stage);

    // Initial draw
    requestAnimationFrame(() => this.drawLines());
    setTimeout(() => this.drawLines(), 100);
  }

  /**
   * Card Click Handler (Click-to-connect / Tap-to-connect pattern)
   * Enforces 1-way connecting: Origin must always be Column 1 (Left side in logic)
   */
  handleCardClick(side, id) {
    if (this.isReadOnly) return;

    // Haptic feedback on tap
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(15); } catch (e) {}
    }

    if (side === 'left') {
      // If clicked on an already selected left item -> deselect it
      if (this.selectedLeftId === id) {
        this.selectedLeftId = null;
        this.updateCardVisualStates();
        return;
      }

      // If this left card is already paired, clicking it unpairs it
      if (this.userPairs.has(id)) {
        this.unpairByLeftId(id);
        this.selectedLeftId = null;
        this.updateCardVisualStates();
        this.drawLines();
        return;
      }

      // Select this left card
      this.selectedLeftId = id;
      this.updateCardVisualStates();

    } else if (side === 'right') {
      // If a left item was already selected from Column 1, connect them!
      if (this.selectedLeftId !== null) {
        this.connectPair(this.selectedLeftId, id);
        this.selectedLeftId = null;
        this.updateCardVisualStates();
        this.drawLines();
        return;
      }

      // If NO left item is selected, check if this right item is already paired -> unpair it
      const existingLeftId = this.getLeftIdByRightId(id);
      if (existingLeftId) {
        this.unpairByLeftId(existingLeftId);
        this.updateCardVisualStates();
        this.drawLines();
        return;
      }

      // Connecting cannot start from Column 2 -> show gentle hint on card
      const card = document.getElementById(`card-right-${this.questionIndex}-${id}`);
      if (card) {
        card.classList.remove('shake-hint');
        void card.offsetWidth;
        card.classList.add('shake-hint');
        setTimeout(() => card.classList.remove('shake-hint'), 450);
      }
    }
  }

  /**
   * Drag and Drop handlers
   */
  getCardEdgeCoordinates(card, stageRect, side) {
    if (!card || !stageRect) return { x: 0, y: 0 };
    const rect = card.getBoundingClientRect();
    const y = (rect.top + rect.height / 2) - stageRect.top;
    
    // In RTL: Column 1 (leftItems) is on the right side of the screen.
    // Inner edge facing center gap is the left border: rect.left
    // Column 2 (rightItems) is on the left side of the screen.
    // Inner edge facing center gap is the right border: rect.right
    let x = (rect.left + rect.width / 2) - stageRect.left;
    if (side === 'left') {
      x = rect.left - stageRect.left;
    } else if (side === 'right') {
      x = rect.right - stageRect.left;
    }
    return { x, y };
  }

  getAbsolutePortCoordinates(side, id) {
    const card = document.getElementById(`card-${side}-${this.questionIndex}-${id}`);
    if (!card) return null;
    const stage = document.getElementById(`stage-${this.questionIndex}`);
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    return this.getCardEdgeCoordinates(card, stageRect, side);
  }

  handlePointerDown(side, id, event) {
    if (this.isReadOnly) return;
    // Connecting cannot start from Column 2 (must start from Column 1 only)
    if (side !== 'left') return;
    // Allow touch / pen / mouse primary button only
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const startCoords = this.getAbsolutePortCoordinates(side, id);
    if (!startCoords) return;

    this.activeDrag = {
      side: side,
      id: id,
      startX: startCoords.x,
      startY: startCoords.y,
      clientX: event.clientX,
      clientY: event.clientY,
      color: this.colors[this.getNextColorIndex()].line
    };
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.isDraggingMotion = false;

    const card = document.getElementById(`card-${side}-${this.questionIndex}-${id}`);
    if (card) card.classList.add('is-dragging');

    // Remove any leftover listeners
    if (this.onPointerMoveBound) document.removeEventListener('pointermove', this.onPointerMoveBound);
    if (this.onPointerUpBound) document.removeEventListener('pointerup', this.onPointerUpBound);
    if (this.onPointerCancelBound) document.removeEventListener('pointercancel', this.onPointerCancelBound);

    this.onPointerMoveBound = (e) => this.handlePointerMove(e);
    this.onPointerUpBound = (e) => this.handlePointerUp(e);
    this.onPointerCancelBound = (e) => this.handlePointerUp(e);

    document.addEventListener('pointermove', this.onPointerMoveBound, { passive: false });
    document.addEventListener('pointerup', this.onPointerUpBound);
    document.addEventListener('pointercancel', this.onPointerCancelBound);
  }

  handlePointerMove(event) {
    if (!this.activeDrag) return;

    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;

    const stage = document.getElementById(`stage-${this.questionIndex}`);
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();

    const curX = event.clientX - stageRect.left;
    const curY = event.clientY - stageRect.top;

    const dist = Math.hypot(event.clientX - this.activeDrag.clientX, event.clientY - this.activeDrag.clientY);
    if (dist > 8) {
      this.isDraggingMotion = true;
      this.drawTempDragLine(this.activeDrag.startX, this.activeDrag.startY, curX, curY, this.activeDrag.color, this.activeDrag.side);

      // Highlight target card under touch/pointer
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      document.querySelectorAll(`#stage-${this.questionIndex} .match-card`).forEach(c => c.classList.remove('drag-hover'));
      for (const el of elements) {
        const matched = el.closest('.match-card');
        if (matched && matched.getAttribute('data-side') !== this.activeDrag.side) {
          matched.classList.add('drag-hover');
          break;
        }
      }
    }
  }

  drawTempDragLine(x1, y1, x2, y2, color, side) {
    const linesGroup = document.getElementById(`lines-group-${this.questionIndex}`);
    if (!linesGroup) return;

    let tempLine = document.getElementById(`temp-drag-line-${this.questionIndex}`);
    if (!tempLine) {
      tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempLine.id = `temp-drag-line-${this.questionIndex}`;
      tempLine.setAttribute('stroke-width', '4');
      tempLine.setAttribute('fill', 'none');
      tempLine.setAttribute('stroke-linecap', 'round');
      tempLine.setAttribute('stroke-dasharray', '6,6');
      tempLine.setAttribute('pointer-events', 'none');
      linesGroup.appendChild(tempLine);
    }

    const controlOffset = Math.max(20, Math.abs(x2 - x1) * 0.4);
    const cx1 = side === 'left' ? (x1 - controlOffset) : (x1 + controlOffset);
    const cx2 = side === 'left' ? (x2 + controlOffset) : (x2 - controlOffset);

    const pathD = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
    tempLine.setAttribute('d', pathD);
    tempLine.setAttribute('stroke', color);
  }

  handlePointerUp(event) {
    if (!this.activeDrag) return;

    const dragStart = this.activeDrag;
    const wasMotion = this.isDraggingMotion;
    this.activeDrag = null;
    this.isDraggingMotion = false;

    const tempLine = document.getElementById(`temp-drag-line-${this.questionIndex}`);
    if (tempLine) tempLine.remove();

    const card = document.getElementById(`card-${dragStart.side}-${this.questionIndex}-${dragStart.id}`);
    if (card) card.classList.remove('is-dragging');

    document.querySelectorAll(`#stage-${this.questionIndex} .match-card`).forEach(c => c.classList.remove('drag-hover'));

    if (this.onPointerMoveBound) document.removeEventListener('pointermove', this.onPointerMoveBound);
    if (this.onPointerUpBound) document.removeEventListener('pointerup', this.onPointerUpBound);
    if (this.onPointerCancelBound) document.removeEventListener('pointercancel', this.onPointerCancelBound);

    const targetX = event.clientX || this.lastClientX || dragStart.clientX;
    const targetY = event.clientY || this.lastClientY || dragStart.clientY;
    const distance = Math.hypot(targetX - dragStart.clientX, targetY - dragStart.clientY);

    // If it was a tap / click gesture
    if (!wasMotion || distance < 12) {
      this.suppressClickUntil = Date.now() + 350;
      this.handleCardClick(dragStart.side, dragStart.id);
      return;
    }

    // It was a drag gesture
    this.suppressClickUntil = Date.now() + 350;
    const elements = document.elementsFromPoint(targetX, targetY);
    let targetCard = null;
    for (const el of elements) {
      const matched = el.closest('.match-card');
      if (matched) {
        targetCard = matched;
        break;
      }
    }

    if (targetCard) {
      const targetSide = targetCard.getAttribute('data-side');
      const targetId = targetCard.getAttribute('data-id');

      if (targetSide && targetSide !== dragStart.side) {
        if (dragStart.side === 'left') {
          this.connectPair(dragStart.id, targetId);
        } else {
          this.connectPair(targetId, dragStart.id);
        }
        this.selectedLeftId = null;
        this.selectedRightId = null;
        this.updateCardVisualStates();
        this.drawLines();
      }
    }
  }

  /**
   * Connect a left item and right item with 1-to-1 constraint
   */
  connectPair(leftId, rightId) {
    // 1-to-1 constraint: Unlink any prior pairs for leftId or rightId
    if (this.userPairs.has(leftId)) {
      this.userPairs.delete(leftId);
      this.pairColors.delete(leftId);
    }

    const priorLeftId = this.getLeftIdByRightId(rightId);
    if (priorLeftId) {
      this.userPairs.delete(priorLeftId);
      this.pairColors.delete(priorLeftId);
    }

    // Assign color index
    const colorIndex = this.getNextColorIndex();
    this.userPairs.set(leftId, rightId);
    this.pairColors.set(leftId, colorIndex);

    // Audio/haptic feedback if supported
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(25); } catch (e) {}
    }



    this.updateFooterStatus();
    this.onChange(this.getAnswers(), this.isComplete());
  }

  /**
   * Unpair a specific pair
   */
  unpairByLeftId(leftId) {
    this.userPairs.delete(leftId);
    this.pairColors.delete(leftId);

    this.updateFooterStatus();
    this.onChange(this.getAnswers(), this.isComplete());
  }

  /**
   * Reset all connections
   */
  resetAllPairs() {
    if (this.isReadOnly) return;
    this.userPairs.clear();
    this.pairColors.clear();
    this.selectedLeftId = null;
    this.selectedRightId = null;
    this.updateCardVisualStates();
    this.drawLines();
    this.updateFooterStatus();
    this.onChange(this.getAnswers(), false);
  }

  /**
   * Helper: Find which leftId is paired with a given rightId
   */
  getLeftIdByRightId(rightId) {
    for (const [lId, rId] of this.userPairs.entries()) {
      if (rId === rightId) return lId;
    }
    return null;
  }

  /**
   * Color index distributor
   */
  getNextColorIndex() {
    const usedIndices = new Set(this.pairColors.values());
    for (let i = 0; i < this.colors.length; i++) {
      if (!usedIndices.has(i)) return i;
    }
    return this.userPairs.size % this.colors.length;
  }

  /**
   * Update visual classes on cards (selected, paired, etc.)
   */
  updateCardVisualStates() {
    // Left cards
    this.leftItems.forEach(item => {
      const card = document.getElementById(`card-left-${this.questionIndex}-${item.id}`);
      if (!card) return;

      const isSelected = (this.selectedLeftId === item.id);
      const isPaired = this.userPairs.has(item.id);
      const colorIndex = this.pairColors.get(item.id);

      card.classList.toggle('is-selected', isSelected);
      card.classList.toggle('is-paired', isPaired);

      // Clean old color classes
      this.colors.forEach((_, idx) => card.classList.remove(`pair-color-${idx}`));
      if (isPaired && colorIndex !== undefined) {
        card.classList.add(`pair-color-${colorIndex}`);
      }
    });

    // Right cards
    this.rightItems.forEach(item => {
      const card = document.getElementById(`card-right-${this.questionIndex}-${item.id}`);
      if (!card) return;

      const isSelected = (this.selectedRightId === item.id);
      const pairedLeftId = this.getLeftIdByRightId(item.id);
      const isPaired = pairedLeftId !== null;
      const colorIndex = pairedLeftId ? this.pairColors.get(pairedLeftId) : undefined;

      card.classList.toggle('is-selected', isSelected);
      card.classList.toggle('is-paired', isPaired);

      this.colors.forEach((_, idx) => card.classList.remove(`pair-color-${idx}`));
      if (isPaired && colorIndex !== undefined) {
        card.classList.add(`pair-color-${colorIndex}`);
      }
    });
  }

  /**
   * Update footer status counter
   */
  updateFooterStatus() {
    const statusPill = document.getElementById(`status-pill-${this.questionIndex}`);
    if (!statusPill) return;

    const count = this.userPairs.size;
    const total = this.leftItems.length;
    const isAll = (count === total);

    statusPill.className = `matching-status-pill ${isAll ? 'complete' : ''}`;
    statusPill.innerHTML = `
      <span class="status-indicator"></span>
      <span class="status-text">${isAll ? '✓ اكتملت جميع التوصيلات' : `تم توصيل ${count} من ${total}`}</span>
    `;
  }

  /**
   * Draw Bézier Curves between connected cards
   */
  drawLines() {
    const stage = document.getElementById(`stage-${this.questionIndex}`);
    const svgLayer = document.getElementById(`svg-layer-${this.questionIndex}`);
    const linesGroup = document.getElementById(`lines-group-${this.questionIndex}`);
    if (!stage || !svgLayer || !linesGroup) return;

    // Adjust SVG coordinate dimensions to match stage exactly
    const stageRect = stage.getBoundingClientRect();
    svgLayer.setAttribute('width', stageRect.width);
    svgLayer.setAttribute('height', stageRect.height);
    svgLayer.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);

    linesGroup.innerHTML = '';

    // Draw user connections
    for (const [leftId, rightId] of this.userPairs.entries()) {
      const leftCard = document.getElementById(`card-left-${this.questionIndex}-${leftId}`);
      const rightCard = document.getElementById(`card-right-${this.questionIndex}-${rightId}`);
      if (!leftCard || !rightCard) continue;

      const p1 = this.getCardEdgeCoordinates(leftCard, stageRect, 'left');
      const p2 = this.getCardEdgeCoordinates(rightCard, stageRect, 'right');

      const colorIndex = this.pairColors.get(leftId) || 0;
      const colorObj = this.colors[colorIndex % this.colors.length];

      // Generate smooth cubic Bézier curve between p1 and p2
      const dx = Math.abs(p2.x - p1.x) * 0.45;
      const pathData = `M ${p1.x} ${p1.y} C ${p1.x - dx} ${p1.y}, ${p2.x + dx} ${p2.y}, ${p2.x} ${p2.y}`;

      // 1. Draw a white underlay halo so crossing/intertwined lines never merge visually
      const haloElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      haloElem.setAttribute('d', pathData);
      haloElem.setAttribute('class', 'matching-line-halo');
      haloElem.setAttribute('stroke', '#ffffff');
      haloElem.setAttribute('stroke-width', '7.5');
      haloElem.setAttribute('fill', 'none');
      haloElem.setAttribute('stroke-linecap', 'round');
      haloElem.setAttribute('stroke-linejoin', 'round');
      linesGroup.appendChild(haloElem);

      // 2. Main distinct colored connection line
      const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElem.setAttribute('d', pathData);
      pathElem.setAttribute('class', 'matching-line');
      pathElem.setAttribute('stroke', colorObj.line);
      pathElem.setAttribute('stroke-width', '4.5');
      pathElem.setAttribute('fill', 'none');
      pathElem.setAttribute('stroke-linecap', 'round');
      pathElem.setAttribute('stroke-linejoin', 'round');
      pathElem.setAttribute('data-left-id', leftId);
      pathElem.setAttribute('data-right-id', rightId);

      if (!this.isReadOnly) {
        pathElem.addEventListener('click', (e) => {
          e.stopPropagation();
          this.unpairByLeftId(leftId);
          this.updateCardVisualStates();
          this.drawLines();
        });
      }

      linesGroup.appendChild(pathElem);
    }
  }

  /**
   * Get current answers in standard array format
   */
  getAnswers() {
    const pairs = [];
    for (const [leftId, rightId] of this.userPairs.entries()) {
      pairs.push({ leftId, rightId });
    }
    return pairs;
  }

  /**
   * Check if all items are paired
   */
  isComplete() {
    return this.userPairs.size >= this.leftItems.length;
  }

  /**
   * Reset all pairs and states
   */
  reset() {
    this.userPairs.clear();
    this.pairColors.clear();
    this.selectedLeftId = null;
    this.selectedRightId = null;
    this.activeDragFrom = null;
    this.isReadOnly = false;
    const stage = document.getElementById(`stage-${this.questionIndex}`);
    if (stage) {
      stage.classList.remove('is-readonly', 'is-graded');
    }
    this.updateCardVisualStates();
    this.drawLines();
    this.updateFooterStatus();
    this.onChange(this.getAnswers(), false);
  }

  /**
   * Set Read-Only Mode
   */
  setReadOnly(readOnly = true) {
    this.isReadOnly = readOnly;
    const stage = document.getElementById(`stage-${this.questionIndex}`);
    if (stage) stage.classList.toggle('is-readonly', readOnly);
  }

  /**
   * Apply Grading / Review Mode
   * @param {Object} result - Contains correctPairs, userPairs, isCorrect, score, etc.
   */
  applyGrading(result) {
    this.setReadOnly(true);

    const stage = document.getElementById(`stage-${this.questionIndex}`);
    const linesGroup = document.getElementById(`lines-group-${this.questionIndex}`);
    if (!stage || !linesGroup) return;

    stage.classList.add('is-graded');
    const stageRect = stage.getBoundingClientRect();

    linesGroup.innerHTML = '';

    // Map correct pairs for lookup
    const correctMap = new Map();
    const correctList = result.correctPairs || this.correctPairs || [];
    correctList.forEach(p => {
      correctMap.set(String(p.leftId), String(p.rightId));
    });

    let correctMatchesCount = 0;
    const totalPairsCount = this.leftItems.length;

    // Grade each user pair
    for (const [leftId, rightId] of this.userPairs.entries()) {
      const isPairCorrect = (correctMap.get(leftId) === rightId);
      if (isPairCorrect) correctMatchesCount++;

      const leftCard = document.getElementById(`card-left-${this.questionIndex}-${leftId}`);
      const rightCard = document.getElementById(`card-right-${this.questionIndex}-${rightId}`);
      if (!leftCard || !rightCard) continue;

      leftCard.classList.add(isPairCorrect ? 'grade-correct' : 'grade-wrong');
      rightCard.classList.add(isPairCorrect ? 'grade-correct' : 'grade-wrong');

      const p1 = this.getCardEdgeCoordinates(leftCard, stageRect, 'left');
      const p2 = this.getCardEdgeCoordinates(rightCard, stageRect, 'right');

      const dx = Math.abs(p2.x - p1.x) * 0.45;
      const pathData = `M ${p1.x} ${p1.y} C ${p1.x - dx} ${p1.y}, ${p2.x + dx} ${p2.y}, ${p2.x} ${p2.y}`;

      // Halo for review line
      const haloElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      haloElem.setAttribute('d', pathData);
      haloElem.setAttribute('class', 'matching-line-halo');
      haloElem.setAttribute('stroke', '#ffffff');
      haloElem.setAttribute('stroke-width', '7.5');
      haloElem.setAttribute('fill', 'none');
      haloElem.setAttribute('stroke-linecap', 'round');
      haloElem.setAttribute('stroke-linejoin', 'round');
      linesGroup.appendChild(haloElem);

      const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElem.setAttribute('d', pathData);
      pathElem.setAttribute('class', `matching-line ${isPairCorrect ? 'line-correct' : 'line-wrong'}`);
      pathElem.setAttribute('stroke', isPairCorrect ? '#16a34a' : '#dc2626');
      pathElem.setAttribute('stroke-width', '4.5');
      pathElem.setAttribute('fill', 'none');
      pathElem.setAttribute('stroke-linecap', 'round');
      pathElem.setAttribute('stroke-linejoin', 'round');
      if (!isPairCorrect) {
        pathElem.setAttribute('stroke-dasharray', '6 4');
      }

      linesGroup.appendChild(pathElem);
    }

    // Display correct answers guide for wrong or uncompleted pairs
    const footer = this.container.querySelector('.matching-footer');
    if (footer) {
      footer.innerHTML = `
        <div class="matching-grade-summary">
          <div class="grade-solutions-list">
            <strong>الإجابات النموذجية الصحيحة:</strong>
            <div class="solutions-chips">
              ${this.originalLeftItems.map(leftItem => {
                const targetRightId = correctMap.get(leftItem.id);
                const targetRight = this.originalRightItems.find(r => r.id === targetRightId);
                const userRightId = this.userPairs.get(leftItem.id);
                const isUserRight = (userRightId === targetRightId);

                return `
                  <div class="sol-chip ${isUserRight ? 'chip-ok' : 'chip-bad'}">
                    <span class="sol-left">${leftItem.text}</span>
                    <span class="sol-arrow">←</span>
                    <span class="sol-right">${targetRight ? targetRight.text : '—'}</span>
                    <span class="sol-mark">${isUserRight ? '✓' : '✗'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }
  }
}

// Export to global scope
window.MatchingQuestionEngine = MatchingQuestionEngine;
