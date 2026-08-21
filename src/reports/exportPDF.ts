import { jsPDF } from "jspdf";
import type { DailyReport } from "@shared/types";

const LEVEL_COLORS: Record<string, [number, number, number]> = {
  calm: [63, 167, 150],
  steady: [231, 178, 58],
  elevated: [217, 112, 79],
  critical: [179, 65, 58]
};

/**
 * Builds a simple, print-friendly weekly/monthly summary PDF. Kept
 * intentionally plain (no charts) — the interactive dashboard is where
 * people explore data; this export is for sharing a static snapshot, e.g.
 * with a therapist or manager, per their own choice.
 */
export function buildReportPDF(reports: DailyReport[], rangeLabel: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Typing Stress Report", marginX, y);

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(rangeLabel, marginX, y);

  y += 30;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 548, y);
  y += 24;

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Date", marginX, y);
  doc.text("Sessions", marginX + 130, y);
  doc.text("Keystrokes", marginX + 210, y);
  doc.text("Avg score", marginX + 310, y);
  doc.text("Dominant level", marginX + 400, y);
  y += 14;
  doc.setDrawColor(235, 235, 235);
  doc.line(marginX, y, 548, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  for (const report of reports) {
    if (y > 760) {
      doc.addPage();
      y = 64;
    }

    const dominant = (Object.entries(report.levelCounts) as [string, number][]).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? "calm";
    const color = LEVEL_COLORS[dominant] ?? [90, 90, 90];

    doc.setTextColor(30, 30, 30);
    doc.text(report.date, marginX, y);
    doc.text(String(report.sessionCount), marginX + 130, y);
    doc.text(String(report.totalKeystrokes), marginX + 210, y);
    doc.text(report.avgScore.toFixed(2), marginX + 310, y);

    doc.setTextColor(...color);
    doc.text(dominant, marginX + 400, y);

    y += 18;
  }

  return doc;
}

export function downloadReportPDF(reports: DailyReport[], rangeLabel: string, filename: string): void {
  const doc = buildReportPDF(reports, rangeLabel);
  doc.save(filename);
}
