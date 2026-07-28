import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { role: "ADMIN", name: "Admin User", email: "admin@example.com", passwordHash },
  });

  const studyCenter = await prisma.user.upsert({
    where: { email: "studycenter@example.com" },
    update: {},
    create: { role: "STUDY_CENTER", name: "Downtown Study Center", email: "studycenter@example.com", passwordHash },
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

  const generalKnowledge = await prisma.subject.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "General Knowledge" },
  });

  const programming = await prisma.subject.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "Programming Fundamentals" },
  });

  const now = new Date();
  const farFuture = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);

  const practiceTest = await prisma.test.upsert({
    where: { code: "PRACTICE01" },
    update: {},
    create: {
      name: "Practice Test — General Knowledge",
      description: "A short, ungraded warm-up so you can get familiar with the exam interface.",
      code: "PRACTICE01",
      subjectId: generalKnowledge.id,
      durationMin: 5,
      availableFrom: now,
      availableTo: farFuture,
      isPractice: true,
      isPublished: true,
      questions: {
        create: [
          {
            text: "What is the capital of Spain?",
            marks: 1,
            order: 1,
            options: {
              create: [
                { text: "Lisbon", order: 1 },
                { text: "Madrid", order: 2, isCorrect: true },
                { text: "Barcelona", order: 3 },
                { text: "Seville", order: 4 },
              ],
            },
          },
          {
            text: "Who created the C programming language?",
            marks: 1,
            order: 2,
            options: {
              create: [
                { text: "Dennis Ritchie", order: 1, isCorrect: true },
                { text: "James Gosling", order: 2 },
                { text: "Guido van Rossum", order: 3 },
                { text: "Bjarne Stroustrup", order: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  const realTest = await prisma.test.upsert({
    where: { code: "PROG101" },
    update: {},
    create: {
      name: "Programming Fundamentals — Quiz 1",
      description: "Covers basic syntax, data types, and control flow.",
      code: "PROG101",
      subjectId: programming.id,
      durationMin: 20,
      availableFrom: now,
      availableTo: farFuture,
      isPractice: false,
      isPublished: true,
      questions: {
        create: [
          {
            text: "Which of these is not a primitive data type in most languages?",
            marks: 2,
            order: 1,
            options: {
              create: [
                { text: "Integer", order: 1 },
                { text: "Boolean", order: 2 },
                { text: "Array", order: 3, isCorrect: true },
                { text: "String", order: 4 },
              ],
            },
          },
          {
            text: "What does 'IDOR' stand for in web security?",
            marks: 3,
            order: 2,
            options: {
              create: [
                { text: "Insecure Direct Object Reference", order: 1, isCorrect: true },
                { text: "Internal Data Object Router", order: 2 },
                { text: "Indexed Database Object Record", order: 3 },
              ],
            },
          },
          {
            text: "Which HTTP status code means 'Forbidden'?",
            marks: 1,
            order: 3,
            options: {
              create: [
                { text: "401", order: 1 },
                { text: "403", order: 2, isCorrect: true },
                { text: "404", order: 3 },
                { text: "500", order: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log({
    admin: admin.email,
    studyCenter: studyCenter.email,
    student: student.email,
    subjects: [generalKnowledge.name, programming.name],
    tests: [practiceTest.name, realTest.name],
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
