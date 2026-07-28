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
  ownerId: number | null;
  testCount?: number;
  questionCount?: number;
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
export type QuestionType = "SINGLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE" | "SHORT_ANSWER";
export type GradingStatus = "FULLY_GRADED" | "PENDING_REVIEW";

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
  type: QuestionType;
  text: string;
  marks: number;
  options: QuestionOption[];
  selectedOptionIds: number[];
  textResponse: string | null;
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
  gradingStatus: GradingStatus;
  startTime: string;
  endTime: string | null;
  score: number;
  totalMarks: number;
}

export interface ResultQuestion {
  questionId: number;
  type: QuestionType;
  text: string;
  marks: number;
  options: QuestionOption[];
  selectedOptionIds: number[];
  textResponse: string | null;
  state: AnswerState;
  awarded: number | null;
}

export interface ResultDetail {
  attemptId: number;
  testName: string;
  subjectName: string;
  status: AttemptStatus;
  gradingStatus: GradingStatus;
  score: number;
  totalMarks: number;
  questions: ResultQuestion[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface AdminQuestion {
  id: number;
  ownerId: number | null;
  type: QuestionType;
  text: string;
  marks: number;
  negativeMarks: number;
  allowPartialCredit: boolean;
  options: QuestionOption[];
  tags?: Tag[];
  createdAt?: string;
  testQuestionId?: number;
  order?: number;
}

export interface AdminTest extends TestSummary {
  code: string;
  isPublished: boolean;
  createdAt: string;
  ownerId: number | null;
  shuffleQuestions: boolean;
  poolSize: number | null;
}

export interface GradingQueueItem {
  attemptId: number;
  studentName: string;
  testId: number;
  testName: string;
  status: AttemptStatus;
  endTime: string | null;
}

export interface GradingAnswer {
  answerId: number;
  questionId: number;
  text: string;
  maxMarks: number;
  textResponse: string | null;
  awardedMarks: number | null;
}

export interface GradingAttemptDetail {
  attemptId: number;
  studentName: string;
  testName: string;
  answers: GradingAnswer[];
}

export interface ManagedUser {
  id: number;
  role: Role;
  name: string;
  email: string;
  contactNo: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  createdAt: string;
}

export interface ItemAnalysisRow {
  questionId: number;
  text: string;
  type: QuestionType;
  attemptsCount: number;
  pValue: number | null;
  avgTimeSpentSec: number;
}
