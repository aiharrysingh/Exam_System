export type Role = "STUDENT" | "ADMIN" | "STUDY_CENTER";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Subject {
  id: number;
  name: string;
}

export interface TestSummary {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  availableFrom: string;
  availableTo: string;
  isPractice: boolean;
  isPublished?: boolean;
  subject: Subject;
  totalQuestions: number;
}

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
export type AnswerState = "UNANSWERED" | "ANSWERED" | "MARKED_FOR_REVIEW";

export interface InProgressAttempt {
  attemptId: number;
  testId: number;
  testName: string;
  subjectName: string;
  startTime: string;
  deadline: string;
}

export interface ResumeInfo {
  attemptId: number;
  testId: number;
  testName: string;
  durationMin: number;
  deadline: string;
  serverNow: string;
  totalQuestions: number;
  resumeAtOrder: number;
}

export interface QuestionOption {
  id: number;
  text: string;
  order: number;
  isCorrect?: boolean;
}

export interface QuestionView {
  order: number;
  totalQuestions: number;
  questionId: number;
  text: string;
  marks: number;
  options: QuestionOption[];
  selectedOptionId: number | null;
  state: AnswerState;
  deadline: string;
  serverNow: string;
}

export interface SummaryItem {
  order: number;
  questionId: number;
  state: AnswerState;
}

export interface AttemptSummary {
  status: AttemptStatus;
  deadline: string;
  serverNow: string;
  questions: SummaryItem[];
}

export interface ResultListItem {
  attemptId: number;
  testName: string;
  subjectName: string;
  status: AttemptStatus;
  startTime: string;
  endTime: string | null;
  score: number;
  totalMarks: number;
}

export interface ResultQuestion {
  questionId: number;
  text: string;
  marks: number;
  options: QuestionOption[];
  selectedOptionId: number | null;
  state: AnswerState;
  awarded: number;
}

export interface ResultDetail {
  attemptId: number;
  testName: string;
  subjectName: string;
  status: AttemptStatus;
  score: number;
  totalMarks: number;
  questions: ResultQuestion[];
}

export interface AdminQuestion {
  id: number;
  testId: number;
  text: string;
  marks: number;
  order: number;
  options: QuestionOption[];
}

export interface AdminTest extends TestSummary {
  code: string;
  isPublished: boolean;
  createdAt: string;
}
