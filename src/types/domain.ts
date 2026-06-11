export type Subject =
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "grammar"
  | "vocabulary"

export type HomeworkStatus = "pending" | "in_progress" | "paused" | "submitted" | "graded"

export type IntegrityStatus = "ok" | "cheating_suspicion" | "cheating_detected"

export type ViolationReason = "app_background" | "network_lost" | "navigation" | "unknown"

export interface HomeworkAssignment {
  id: string
  title: string
  description: string
  subject: Subject
  groupId: string
  dueAt: string
  estimatedMinutes: number
  createdAt: string
  createdBy: string
  exerciseSlug?: string
  timeLimitMinutes?: number
}

export interface HomeworkMistake {
  questionId: number
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
  score?: number
  feedback?: string
  /** Auto-generated speech-to-text (Whisper). */
  transcription?: string
}

export interface HomeworkAttempt {
  totalQuestions: number
  correctCount: number
  durationSeconds?: number
  mistakes: HomeworkMistake[]
  timedOut?: boolean
  answeredCount?: number
  failedDueToCheating?: boolean
  cheatingReason?: string
}

export interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  topic?: string
  subject?: Subject
  homeworkTitle?: string
  assignedAt?: string
  lastEntryAt?: string
  entryCount?: number
  status: HomeworkStatus
  integrityStatus?: IntegrityStatus
  violationCount?: number
  elapsedSeconds?: number
  score?: number
  startedAt?: string
  sessionStartedAt?: string
  elapsedSeconds?: number
  pauseUsed?: boolean
  pausedAt?: string
  submittedAt?: string
  feedback?: string
  attempt?: HomeworkAttempt
}

export interface ViolationResponse {
  action: "warn" | "fail" | "already_done" | "pause" | "paused"
  violationCount?: number
  pauseUsed?: boolean
  integrityStatus?: IntegrityStatus
  message?: string
  submission?: HomeworkSubmission
}

export interface StudentHomeworkEntry {
  homework: HomeworkAssignment
  submission: HomeworkSubmission
}

export type ControlWorkSubject = "vocabulary" | "grammar" | "reading" | "listening" | "writing"

export interface ControlWorkStep {
  subject: ControlWorkSubject
  title: string
  exerciseSlug?: string
  deckSlug?: string
  testId?: string
  topic?: string
}

export interface ControlWork {
  id: string
  title: string
  description: string
  groupId: string
  dueAt: string
  timeLimitMinutes?: number
  createdBy: string
  createdAt: string
  steps: ControlWorkStep[]
}

export interface ControlWorkStepResult {
  stepIndex: number
  status: "pending" | "completed"
  attempt?: HomeworkAttempt
  submittedAt?: string
}

export interface ControlWorkSubmission {
  id: string
  controlWorkId: string
  studentId: string
  status: HomeworkStatus
  currentStep: number
  stepResults: ControlWorkStepResult[]
  score?: number
  startedAt?: string
  submittedAt?: string
  integrityStatus?: IntegrityStatus
  pauseUsed?: boolean
  pausedAt?: string
}

export interface StudentControlWorkEntry {
  controlWork: ControlWork
  submission: ControlWorkSubmission
}

export interface TestResult {
  id: string
  testType: "reading" | "listening" | "writing" | "speaking"
  date: string
  bandScore: number
  totalCorrect: number
  totalQuestions: number
  answers?: unknown
  parts?: unknown
}
