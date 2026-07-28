import PDFDocument from "pdfkit";
import { Response } from "express";

export function streamCertificate(
  res: Response,
  data: {
    studentName: string;
    testName: string;
    subjectName: string;
    score: number;
    totalMarks: number;
    date: Date;
    provisional: boolean;
  }
) {
  const doc = new PDFDocument({ size: "A4", margin: 72 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="certificate-${data.testName.replace(/\W+/g, "-")}.pdf"`);
  doc.pipe(res);

  const pct = data.totalMarks > 0 ? Math.round((data.score / data.totalMarks) * 100) : 0;

  doc.fontSize(10).fillColor("#8b5cf6").text("EXAMHUB", { align: "center" });
  doc.moveDown(1.5);
  doc.fontSize(24).fillColor("#0f172a").text("Certificate of Completion", { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(12).fillColor("#334155");
  doc.text("This certifies that", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(20).fillColor("#0f172a").text(data.studentName, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#334155").text("has completed", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(16).fillColor("#0f172a").text(data.testName, { align: "center" });
  doc.fontSize(11).fillColor("#64748b").text(data.subjectName, { align: "center" });
  doc.moveDown(1);

  doc.fontSize(14).fillColor("#0f172a").text(`Score: ${data.score} / ${data.totalMarks} (${pct}%)`, { align: "center" });
  if (data.provisional) {
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#b45309")
      .text("Provisional — some answers are still pending manual review.", { align: "center" });
  }
  doc.moveDown(1.5);
  doc.fontSize(10).fillColor("#64748b").text(`Issued ${data.date.toLocaleDateString()}`, { align: "center" });

  doc.end();
}
