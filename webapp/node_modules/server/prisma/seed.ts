import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);
  const now = new Date();
  const farFuture = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);

  // --- Users ---
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { role: "ADMIN", name: "Admin User", email: "admin@example.com", passwordHash },
  });

  const tcAlpha = await prisma.user.upsert({
    where: { email: "tc.alpha@example.com" },
    update: {},
    create: { role: "STUDY_CENTER", name: "Alpha Test Center", email: "tc.alpha@example.com", passwordHash },
  });

  const tcBeta = await prisma.user.upsert({
    where: { email: "tc.beta@example.com" },
    update: {},
    create: { role: "STUDY_CENTER", name: "Beta Test Center", email: "tc.beta@example.com", passwordHash },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      role: "STUDENT",
      name: "Sample Student",
      email: "student@example.com",
      passwordHash,
      city: "Springfield",
    },
  });

  // --- Subjects: one global (admin), one each for the two test conductors ---
  const generalKnowledge = await prisma.subject.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "General Knowledge", ownerId: null },
  });

  const alphaSubject = await prisma.subject.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "Programming Fundamentals", ownerId: tcAlpha.id },
  });

  const betaSubject = await prisma.subject.upsert({
    where: { id: 3 },
    update: {},
    create: { name: "Basic Science", ownerId: tcBeta.id },
  });

  // --- Practice test: global, admin-owned, unified engine (isPractice flag) ---
  const practiceTest = await prisma.test.upsert({
    where: { code: "PRACTICE01" },
    update: {},
    create: {
      name: "Practice Test — General Knowledge",
      description: "A short, ungraded warm-up so you can get familiar with the exam interface.",
      code: "PRACTICE01",
      subjectId: generalKnowledge.id,
      ownerId: null,
      durationMin: 5,
      availableFrom: now,
      availableTo: farFuture,
      isPractice: true,
      isPublished: true,
    },
  });

  const q1 = await prisma.question.upsert({
    where: { id: 1 },
    update: {},
    create: {
      ownerId: null,
      type: "SINGLE_CHOICE",
      text: "What is the capital of Spain?",
      marks: 1,
      options: {
        create: [
          { text: "Lisbon", order: 1 },
          { text: "Madrid", order: 2, isCorrect: true },
          { text: "Barcelona", order: 3 },
          { text: "Seville", order: 4 },
        ],
      },
    },
  });

  const q2 = await prisma.question.upsert({
    where: { id: 2 },
    update: {},
    create: {
      ownerId: null,
      type: "TRUE_FALSE",
      text: "Dennis Ritchie created the C programming language. True or False?",
      marks: 1,
      options: {
        create: [
          { text: "True", order: 1, isCorrect: true },
          { text: "False", order: 2 },
        ],
      },
    },
  });

  await prisma.testQuestion.upsert({
    where: { testId_questionId: { testId: practiceTest.id, questionId: q1.id } },
    update: {},
    create: { testId: practiceTest.id, questionId: q1.id, order: 1 },
  });
  await prisma.testQuestion.upsert({
    where: { testId_questionId: { testId: practiceTest.id, questionId: q2.id } },
    update: {},
    create: { testId: practiceTest.id, questionId: q2.id, order: 2 },
  });

  // --- Alpha Test Center's own test: Programming Fundamentals Quiz ---
  const alphaTest = await prisma.test.upsert({
    where: { code: "PROG101" },
    update: {},
    create: {
      name: "Programming Fundamentals — Quiz 1",
      description: "Covers basic syntax, data types, control flow, and web security basics.",
      code: "PROG101",
      subjectId: alphaSubject.id,
      ownerId: tcAlpha.id,
      durationMin: 20,
      availableFrom: now,
      availableTo: farFuture,
      isPractice: false,
      isPublished: true,
    },
  });

  const q3 = await prisma.question.upsert({
    where: { id: 3 },
    update: {},
    create: {
      ownerId: tcAlpha.id,
      type: "SINGLE_CHOICE",
      text: "Which of these is not a primitive data type in most languages?",
      marks: 2,
      negativeMarks: 1,
      options: {
        create: [
          { text: "Integer", order: 1 },
          { text: "Boolean", order: 2 },
          { text: "Array", order: 3, isCorrect: true },
          { text: "String", order: 4 },
        ],
      },
    },
  });

  const q4 = await prisma.question.upsert({
    where: { id: 4 },
    update: {},
    create: {
      ownerId: tcAlpha.id,
      type: "MULTI_SELECT",
      text: "Which of these are valid HTTP methods? (select all that apply)",
      marks: 3,
      allowPartialCredit: true,
      options: {
        create: [
          { text: "GET", order: 1, isCorrect: true },
          { text: "POST", order: 2, isCorrect: true },
          { text: "FETCH", order: 3 },
          { text: "DELETE", order: 4, isCorrect: true },
        ],
      },
    },
  });

  const q5 = await prisma.question.upsert({
    where: { id: 5 },
    update: {},
    create: {
      ownerId: tcAlpha.id,
      type: "SHORT_ANSWER",
      text: "In one sentence, explain what IDOR (Insecure Direct Object Reference) means.",
      marks: 3,
    },
  });

  for (const [q, order] of [
    [q3, 1],
    [q4, 2],
    [q5, 3],
  ] as const) {
    await prisma.testQuestion.upsert({
      where: { testId_questionId: { testId: alphaTest.id, questionId: q.id } },
      update: {},
      create: { testId: alphaTest.id, questionId: q.id, order },
    });
  }

  // --- Beta Test Center's own test: Basic Science Quiz (pooled + shuffled, to seed randomization) ---
  const betaTest = await prisma.test.upsert({
    where: { code: "SCI101" },
    update: {},
    create: {
      name: "Basic Science — Quiz 1",
      description: "A pooled, shuffled quiz drawing 2 of 3 questions per attempt.",
      code: "SCI101",
      subjectId: betaSubject.id,
      ownerId: tcBeta.id,
      durationMin: 10,
      availableFrom: now,
      availableTo: farFuture,
      isPractice: false,
      isPublished: true,
      shuffleQuestions: true,
      poolSize: 2,
    },
  });

  const q6 = await prisma.question.upsert({
    where: { id: 6 },
    update: {},
    create: {
      ownerId: tcBeta.id,
      type: "SINGLE_CHOICE",
      text: "What is the chemical symbol for water?",
      marks: 1,
      options: {
        create: [
          { text: "H2O", order: 1, isCorrect: true },
          { text: "CO2", order: 2 },
          { text: "O2", order: 3 },
        ],
      },
    },
  });

  const q7 = await prisma.question.upsert({
    where: { id: 7 },
    update: {},
    create: {
      ownerId: tcBeta.id,
      type: "TRUE_FALSE",
      text: "The Earth revolves around the Sun. True or False?",
      marks: 1,
      options: {
        create: [
          { text: "True", order: 1, isCorrect: true },
          { text: "False", order: 2 },
        ],
      },
    },
  });

  const q8 = await prisma.question.upsert({
    where: { id: 8 },
    update: {},
    create: {
      ownerId: tcBeta.id,
      type: "SINGLE_CHOICE",
      text: "Which planet is known as the Red Planet?",
      marks: 1,
      options: {
        create: [
          { text: "Venus", order: 1 },
          { text: "Mars", order: 2, isCorrect: true },
          { text: "Jupiter", order: 3 },
        ],
      },
    },
  });

  for (const [q, order] of [
    [q6, 1],
    [q7, 2],
    [q8, 3],
  ] as const) {
    await prisma.testQuestion.upsert({
      where: { testId_questionId: { testId: betaTest.id, questionId: q.id } },
      update: {},
      create: { testId: betaTest.id, questionId: q.id, order },
    });
  }

  console.log({
    admin: admin.email,
    testConductors: [tcAlpha.email, tcBeta.email],
    student: student.email,
    subjects: [generalKnowledge.name, alphaSubject.name, betaSubject.name],
    tests: [practiceTest.name, alphaTest.name, betaTest.name],
  });
  console.log("Seed complete. All seeded accounts use password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
