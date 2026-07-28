import { parse } from "csv-parse/sync";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/asyncHandler";

const MAX_OPTIONS = 6;
const VALID_TYPES = ["SINGLE_CHOICE", "MULTI_SELECT", "TRUE_FALSE", "SHORT_ANSWER"];

interface CsvRow {
  text: string;
  type?: string;
  marks?: string;
  negativeMarks?: string;
  allowPartialCredit?: string;
  correctOptions?: string;
  tags?: string;
  [key: string]: string | undefined;
}

interface ParsedQuestion {
  text: string;
  type: "SINGLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE" | "SHORT_ANSWER";
  marks: number;
  negativeMarks: number;
  allowPartialCredit: boolean;
  tags: string[];
  options: { text: string; isCorrect: boolean; order: number }[];
}

/**
 * Expected columns: text, type, marks, negativeMarks, allowPartialCredit,
 * option1..option6, correctOptions (1-based, ";"-separated for MULTI_SELECT),
 * tags (";"-separated). All-or-nothing: one bad row fails the whole import.
 */
export function parseQuestionsCsv(buffer: Buffer): ParsedQuestion[] {
  let rows: CsvRow[];
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    throw new HttpError(400, `Could not parse CSV: ${(err as Error).message}`);
  }
  if (rows.length === 0) throw new HttpError(400, "CSV file has no data rows");

  const errors: { row: number; message: string }[] = [];
  const parsed: ParsedQuestion[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // account for header row, 1-indexed
    const text = row.text?.trim();
    if (!text) {
      errors.push({ row: rowNum, message: "Missing question text" });
      return;
    }
    const type = (row.type?.trim().toUpperCase() || "SINGLE_CHOICE") as ParsedQuestion["type"];
    if (!VALID_TYPES.includes(type)) {
      errors.push({ row: rowNum, message: `Invalid type "${row.type}"` });
      return;
    }
    const marks = row.marks ? Number(row.marks) : 1;
    if (!Number.isFinite(marks) || marks <= 0) {
      errors.push({ row: rowNum, message: `Invalid marks "${row.marks}"` });
      return;
    }

    const options: { text: string; isCorrect: boolean; order: number }[] = [];
    if (type !== "SHORT_ANSWER") {
      for (let optNum = 1; optNum <= MAX_OPTIONS; optNum++) {
        const value = row[`option${optNum}`]?.trim();
        if (value) options.push({ text: value, isCorrect: false, order: options.length + 1 });
      }
      if (options.length < 2) {
        errors.push({ row: rowNum, message: "Needs at least 2 options (option1, option2, ...)" });
        return;
      }
      const correctIndices = (row.correctOptions ?? "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number);
      if (correctIndices.length === 0 || correctIndices.some((n) => !Number.isInteger(n) || n < 1 || n > options.length)) {
        errors.push({ row: rowNum, message: `correctOptions must reference valid option numbers (1-${options.length})` });
        return;
      }
      if (type !== "MULTI_SELECT" && correctIndices.length > 1) {
        errors.push({ row: rowNum, message: "Only MULTI_SELECT questions may have more than one correct option" });
        return;
      }
      for (const idx of correctIndices) options[idx - 1].isCorrect = true;
    }

    parsed.push({
      text,
      type,
      marks,
      negativeMarks: row.negativeMarks ? Number(row.negativeMarks) : 0,
      allowPartialCredit: (row.allowPartialCredit ?? "").trim().toLowerCase() === "true",
      tags: (row.tags ?? "").split(";").map((t) => t.trim()).filter(Boolean),
      options,
    });
  });

  if (errors.length > 0) {
    throw new HttpError(400, "CSV import failed validation: " + JSON.stringify(errors));
  }
  return parsed;
}

export async function importQuestions(parsed: ParsedQuestion[], ownerId: number | null) {
  return prisma.$transaction(async (tx) => {
    const created = [];
    for (const q of parsed) {
      const question = await tx.question.create({
        data: {
          ownerId,
          type: q.type,
          text: q.text,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          allowPartialCredit: q.allowPartialCredit,
          tags: q.tags.length
            ? { connectOrCreate: q.tags.map((name) => ({ where: { name }, create: { name } })) }
            : undefined,
          options: q.options.length ? { create: q.options } : undefined,
        },
      });
      created.push(question);
    }
    return created;
  });
}
