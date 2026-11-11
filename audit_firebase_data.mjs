/**
 * Albayan Quran School - Read-Only Firebase Cloud Audit Engine
 * 
 * فحص سحابي وقراءة تحليلية دقيقة وشاملة لقاعدة بيانات Firebase Realtime Database
 * (ممنوع الكتابة أو التعديل - قراءة فقط READ-ONLY بنسبة 100%)
 */

import fs from 'fs';
import path from 'path';

const FB_BASE = "https://bayan-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";

async function fetchNode(nodeName) {
  try {
    const res = await fetch(`${FB_BASE}/${nodeName}.json`);
    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${res.statusText}` };
    }
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

function normalizePeriod(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
  s = s.replace(/[أإآٱ]/g, "ا").replace(/[ةه]/g, "ه").replace(/[ىي]/g, "ي");
  const months = ["محرم", "صفر", "ربيع الاول", "ربيع الثاني", "جمادى الاولى", "جمادى الاخره", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  for (const m of months) {
    if (s.includes(m)) return m;
  }
  return s;
}

async function runAudit() {
  console.log("=================================================================");
  console.log("  فحص وتدقيق بيانات مدرسة البيان (Firebase RTDB Read-Only Audit)");
  console.log("  قراءة تحليلية فقط - لن يتم إجراء أي تعديل على قاعدة البيانات الحية");
  console.log("=================================================================\n");

  const report = {
    timestamp: new Date().toISOString(),
    nodes_checked: {},
    duplicates_detected: {
      exams: [],
      circles: [],
      students: [],
      student_records_multicandidate: []
    },
    period_inconsistencies: [],
    summary: {}
  };

  // 1. Audit Exams
  console.log("1. فحص جدول الاختبارات (/exams)...");
  const exams = await fetchNode("exams");
  if (exams && !exams.error) {
    const keys = Object.keys(exams);
    report.nodes_checked.exams = keys.length;
    const seen = new Map();
    for (const k of keys) {
      const item = exams[k];
      const cleanId = String(k).replace(/^exams_/, '');
      if (seen.has(cleanId)) {
        report.duplicates_detected.exams.push({
          normalized_id: cleanId,
          keys_found: [seen.get(cleanId), k],
          sample_titles: [exams[seen.get(cleanId)]?.title, item?.title]
        });
      } else {
        seen.set(cleanId, k);
      }
    }
  }

  // 2. Audit Circles
  console.log("2. فحص جدول الحلقات (/circles)...");
  const circles = await fetchNode("circles");
  if (circles && !circles.error) {
    const keys = Object.keys(circles);
    report.nodes_checked.circles = keys.length;
    const seen = new Map();
    for (const k of keys) {
      const item = circles[k];
      const cleanId = String(k).replace(/^circles_/, '');
      if (seen.has(cleanId)) {
        report.duplicates_detected.circles.push({
          normalized_id: cleanId,
          keys_found: [seen.get(cleanId), k],
          sample_names: [circles[seen.get(cleanId)]?.name, item?.name]
        });
      } else {
        seen.set(cleanId, k);
      }
    }
  }

  // 3. Audit Students
  console.log("3. فحص جدول الطلاب (/students)...");
  const students = await fetchNode("students");
  if (students && !students.error) {
    const keys = Object.keys(students);
    report.nodes_checked.students = keys.length;
    const nameMap = new Map();
    for (const k of keys) {
      const s = students[k];
      if (!s) continue;
      const cleanName = (s.name || "").trim().toLowerCase();
      if (cleanName) {
        if (!nameMap.has(cleanName)) nameMap.set(cleanName, []);
        nameMap.get(cleanName).push({ key: k, circle_id: s.circle_id });
      }
    }
    for (const [name, occurrences] of nameMap.entries()) {
      if (occurrences.length > 1) {
        report.duplicates_detected.students.push({
          name: name,
          count: occurrences.length,
          occurrences: occurrences
        });
      }
    }
  }

  // 4. Audit Student Records (Multi-candidate records per student and month)
  console.log("4. فحص سجلات الدرجات والحضور (/student_records)...");
  const records = await fetchNode("student_records");
  if (records && !records.error) {
    const keys = Object.keys(records);
    report.nodes_checked.student_records = keys.length;
    const recordGroups = new Map();

    for (const k of keys) {
      const rec = records[k];
      if (!rec) continue;
      const stId = rec.student_id || rec.id;
      const rawMonth = rec.month || rec.period || "";
      const normMonth = normalizePeriod(rawMonth);
      const year = rec.year || rec.hijri_year || "";

      if (rawMonth && rawMonth !== normMonth) {
        report.period_inconsistencies.push({
          record_key: k,
          student_id: stId,
          raw_month: rawMonth,
          normalized_month: normMonth
        });
      }

      if (stId) {
        const groupKey = `${stId}_${normMonth}_${year}`;
        if (!recordGroups.has(groupKey)) recordGroups.set(groupKey, []);
        recordGroups.get(groupKey).push({ key: k, data: rec });
      }
    }

    for (const [groupKey, items] of recordGroups.entries()) {
      if (items.length > 1) {
        report.duplicates_detected.student_records_multicandidate.push({
          group_key: groupKey,
          candidate_count: items.length,
          keys: items.map(i => i.key),
          timestamps: items.map(i => i.data.updated_at || i.data.timestamp || "unknown")
        });
      }
    }
  }

  report.summary = {
    total_exams_nodes: report.nodes_checked.exams || 0,
    duplicate_exams_keys: report.duplicates_detected.exams.length,
    total_circles_nodes: report.nodes_checked.circles || 0,
    duplicate_circles_keys: report.duplicates_detected.circles.length,
    total_students_nodes: report.nodes_checked.students || 0,
    duplicate_student_names: report.duplicates_detected.students.length,
    total_records_nodes: report.nodes_checked.student_records || 0,
    multicandidate_records: report.duplicates_detected.student_records_multicandidate.length,
    period_inconsistencies_count: report.period_inconsistencies.length
  };

  const outputPath = path.join(process.cwd(), "firebase_audit_report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=================================================================");
  console.log("                     نتائج الفحص والتدقيق");
  console.log("=================================================================");
  console.log(`- إجمالي الاختبارات: ${report.summary.total_exams_nodes} (المفاتيح المزدوجة: ${report.summary.duplicate_exams_keys})`);
  console.log(`- إجمالي الحلقات: ${report.summary.total_circles_nodes} (المفاتيح المزدوجة: ${report.summary.duplicate_circles_keys})`);
  console.log(`- إجمالي الطلاب: ${report.summary.total_students_nodes} (الأسماء المتطابقة: ${report.summary.duplicate_student_names})`);
  console.log(`- إجمالي سجلات الدرجات: ${report.summary.total_records_nodes}`);
  console.log(`- السجلات ذات المرشحات المتعددة لنفس الطالب والشهر: ${report.summary.multicandidate_records}`);
  console.log(`- تفاوت أسماء الشهور/الفترات: ${report.summary.period_inconsistencies_count}`);
  console.log("=================================================================");
  console.log(`[✓] تم حفظ التقرير التفصيلي الكامل في الملف:`);
  console.log(`    ${outputPath}`);
  console.log("=================================================================\n");
}

runAudit();
