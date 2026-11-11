/**
 * Hijri Date Core Engine - مدرسة البيان لتعليم القرآن الكريم
 * نظام التاريخ الهجري المعتمد كأساس رئيسي مع التاريخ الميلادي الفرعي
 */

(function(window) {
  'use strict';

  const HIJRI_MONTHS = [
    "محرم",
    "صفر",
    "ربيع الأول",
    "ربيع الآخر",
    "جمادى الأولى",
    "جمادى الآخرة",
    "رجب",
    "شعبان",
    "رمضان",
    "شوال",
    "ذو القعدة",
    "ذو الحجة"
  ];

  const GREGORIAN_MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const WEEKDAYS_AR = [
    "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"
  ];

  function formatDualDate(dateInput, formatType = 'full') {
    let d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) {
      if (typeof dateInput === 'string' && dateInput.includes(' ')) {
        d = new Date(dateInput.replace(' ', 'T'));
      }
      if (isNaN(d.getTime())) d = new Date();
    }

    let hijriFormatted = "";
    try {
      const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      let formatted = hijriFormatter.format(d);
      formatted = formatted.replace(/هـ/g, '').trim() + " هـ";
      hijriFormatted = formatted;
    } catch (e) {
      let raw = d.toLocaleDateString('ar-SA');
      raw = raw.replace(/هـ/g, '').trim() + " هـ";
      hijriFormatted = raw;
    }

    let gregFormatted = "";
    try {
      const gregFormatter = new Intl.DateTimeFormat('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      gregFormatted = gregFormatter.format(d) + " م";
    } catch (e) {
      const gDay = d.getDate();
      const gMonth = GREGORIAN_MONTHS[d.getMonth()] || "";
      const gYear = d.getFullYear();
      gregFormatted = `${gDay} ${gMonth} ${gYear} م`;
    }

    const weekday = WEEKDAYS_AR[d.getDay()] || "";

    return {
      hijri: hijriFormatted,
      gregorian: gregFormatted,
      weekday: weekday,
      combined: `${hijriFormatted} (${gregFormatted})`,
      html: `<span class="hijri-primary">${hijriFormatted}</span> <span class="gregorian-secondary">(${gregFormatted})</span>`
    };
  }

  function getCurrentHijriYear() {
    try {
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).formatToParts(new Date());
      const yearPart = parts.find(p => p.type === 'year');
      return yearPart ? parseInt(yearPart.value, 10) : 1448;
    } catch (e) {
      return 1448;
    }
  }

  function getCurrentHijriMonth() {
    try {
      const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long' }).formatToParts(new Date());
      const monthPart = parts.find(p => p.type === 'month');
      return monthPart ? monthPart.value : "صفر";
    } catch (e) {
      return "صفر";
    }
  }

  function normalizeArabicPeriod(month, year, periodType = 'monthly') {
    let m = String(month || '').trim();
    m = m.replace(/[\u064B-\u065F\u0670]/g, ''); // Strip diacritics
    m = m.replace(/[أإآٱ]/g, 'ا'); // Normalize Alefs
    m = m.replace(/ة/g, 'ه');      // Normalize Taa Marbuta
    m = m.replace(/ى/g, 'ي');      // Normalize Yaa
    m = m.replace(/\s+/g, ' ').trim();

    const MONTH_MAP = {
      'محرم': 'محرم',
      'صفر': 'صفر',
      'ربيع الاول': 'ربيع الاول',
      'ربيع الثاني': 'ربيع الثاني',
      'ربيع الاخر': 'ربيع الثاني',
      'جمادي الاولي': 'جمادي الاولي',
      'جمادي الثانيه': 'جمادي الاخره',
      'جمادي الاخره': 'جمادي الاخره',
      'رجب': 'رجب',
      'شعبان': 'شعبان',
      'رمضان': 'رمضان',
      'شوال': 'شوال',
      'ذو القعده': 'ذو القعده',
      'ذوالقعده': 'ذو القعده',
      'ذو الحجه': 'ذو الحجه',
      'ذوالحجه': 'ذو الحجه'
    };
    if (MONTH_MAP[m]) {
      m = MONTH_MAP[m];
    }

    const y = String(year || '1448').replace(/\D/g, '') || '1448';
    const pt = String(periodType || 'monthly').trim().toLowerCase();

    return {
      normMonth: m,
      normYear: y,
      normPeriodType: pt,
      canonicalRecordKey: `${pt}_${y}_${m}`
    };
  }

  function initPageDates() {}

  window.normalizeArabicPeriod = normalizeArabicPeriod;
  window.HijriDate = {
    HIJRI_MONTHS,
    GREGORIAN_MONTHS,
    WEEKDAYS_AR,
    formatDualDate,
    getCurrentHijriYear,
    getCurrentHijriMonth,
    normalizeArabicPeriod,
    initPageDates
  };
})(window);
