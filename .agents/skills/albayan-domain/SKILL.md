---
name: albayan-domain
description: "Core business domain intelligence for Albayan Quran School (مدرسة البيان لتعليم القرآن الكريم). Covers grading rubrics (Memorization 40, Revision 30, Attendance 30 with 0.5 per absent day deduction, Activity 20, Accompanying Sciences 20 each, Total 200), Quran page calculations across the 604-page Medina Mushaf, Hijri calendar filtering, and role-based app separation (Staff/Admin vs Student Portal)."
---

# Albayan Quran School Domain Engine Skill

Domain logic, academic rules, Quran calculation formulas, and grading structures for the Albayan Quran School platform.

---

## 0. Visual Design Standard: Zero Shadows Project-Wide
All UI components in the Albayan ecosystem strictly adhere to a **zero-shadow design system** (`box-shadow: none !important; filter: none !important;`). Buttons, cards, modals, popovers, and inputs must never use shadows. Clarity is maintained via borders and high-contrast styling. All inputs must enforce instantaneous typing and Backspace response (`autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"`).

---

## 1. Academic Grading Rubric (نظام الدرجات المعتمد)

The total evaluation mark for any student in any period is calculated **out of 200 points**:

| Component | Subject / Metric | Arabic Name | Max Mark | Calculation Rule |
| :--- | :--- | :--- | :--- | :--- |
| **1** | New Memorization | مقدار الحفظ الجديد | **40** | Stored in `memo_grade`. Numeric (0–40) or qualitative. |
| **2** | Revision & Sard | مقدار المراجعة والتثبيت | **30** | Stored in `rev_grade`. Numeric (0–30) or qualitative. |
| **3** | Attendance & Discipline | الحضور والانضباط | **30** | `attendance = Math.max(0, 30 - (absent_days * 0.5))` |
| **4** | Activity & Participation | النشاط والتفاعل | **20** | Stored in `activity_mark` (0–20). |
| **5** | Jurisprudence | الفقه الإسلامي | **20** | Stored in `fiqh` (0–20). |
| **6** | Quranic Exegesis | تفسير القرآن | **20** | Stored in `tafsir` (0–20). |
| **7** | Supplications & Remembrance | الأذكار اليومية | **20** | Stored in `adhkar` (0–20). |
| **8** | Prophetic Biography | السيرة النبوية | **20** | Stored in `seerah` (0–20). |
| **TOTAL** | **المجموع النهائي** | **إجمالي الدرجات** | **200** | Sum of above components. |
| **PCT** | **النسبة المئوية** | **نسبة الإنجاز** | **100%** | `(total / 200) * 100` rounded to 1 decimal place. |

### Grade Classification Badges
- **90% – 100%**: ممتاز (Excellent - Emerald badge)
- **80% – 89.9%**: جيد جداً (Very Good - Blue badge)
- **65% – 79.9%**: جيد (Good - Amber badge)
- **50% – 64.9%**: مقبول (Acceptable - Orange badge)
- **< 50%**: يحتاج متابعة (Needs Follow-up - Rose/Danger badge)

---

## 2. Quran Mushaf Page Calculation Engine

Calculates exact pages completed between two Quranic checkpoints based on the **604-page King Fahd Medina Mushaf**:

```javascript
function calcQuranPages(fromSurah, fromAyah, toSurah, toAyah) {
  if (!fromSurah || !toSurah) return 0;
  let fromIdx = QURAN_SURAHS.findIndex(s => s.name === fromSurah.trim());
  let toIdx = QURAN_SURAHS.findIndex(s => s.name === toSurah.trim());
  if (fromIdx === -1 || toIdx === -1) return 0;

  let fa = parseInt(fromAyah, 10) || 1;
  let ta = parseInt(toAyah, 10) || 1;
  if (fromIdx > toIdx || (fromIdx === toIdx && fa > ta)) {
    [fromIdx, toIdx] = [toIdx, fromIdx];
    [fa, ta] = [ta, fa];
  }

  const getPage = (idx, ayah) => {
    const startP = SURAH_START_PAGES[idx];
    const endP = (idx + 1 < SURAH_START_PAGES.length) ? SURAH_START_PAGES[idx + 1] : 604;
    const ayahsCount = QURAN_SURAHS[idx]?.ayahs || 1;
    if (endP <= startP) return startP;
    const fraction = (Math.max(1, ayah) - 1) / Math.max(1, ayahsCount);
    const offset = Math.floor(fraction * (endP - startP + 1));
    return Math.min(endP, startP + offset);
  };

  const pFrom = getPage(fromIdx, fa);
  const pTo = getPage(toIdx, ta);
  return Math.max(1, pTo - pFrom + 1);
}
```

---

## 3. Academic Calendar & Period Filtering

- Hijri Months: `محرم، صفر، ربيع الأول، ربيع الآخر، جمادى الأولى، جمادى الآخرة، رجب، شعبان، رمضان، شوال، ذو القعدة، ذو الحجة`.
- Cumulative Yearly View (`سجل نهاية السنة` / `المحصلة السنوية`):
  - A special non-editable summary view that automatically aggregates all monthly records into year-to-date totals, averages, and comprehensive percentages.

---

## 4. Role Architecture & Application Layouts

1. **Staff Portal** (`static/` -> `android/app/`):
   - Users: `admin`, `supervisor`, `teacher`.
   - Primary Views:
     - `circles.html`: Grid of Quranic circles, circle creation, student counters.
     - `roster.html`: High-performance full-width table roster for teachers to input marks, Quran checkpoints, and absences.
     - `admin.html`: Quiz & exam builder, question banks.
     - `analytics.html`: Advanced school-wide charts and KPIs.
     - `users.html`: Teacher & user account management.

2. **Student Portal** (`student_app/www/`):
   - Users: `student`.
   - Primary Views:
     - `mymark.html` (درجاتي): Student's personal grade card, exam results, and progress indicators.
     - `about_me.html` (سجلي): Comprehensive timeline feed of the student's monthly Quran memorization, revision, and accompanying subjects.
     - `exam.html`: Live interactive examination engine with auto-sync and sound effects.
     - `student_settings.html`: Personal student settings.
