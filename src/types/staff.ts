import type { HomeworkAssignment, HomeworkSubmission, Subject } from "./domain"

export type { Subject }

export interface Group {
  id: string
  name: string
  description?: string
  teacherId?: string
  studentIds: string[]
  monthlyFee?: number
  /** JS weekday indices: 0 = Sun … 6 = Sat */
  lessonWeekdays?: number[]
  lessonStartTime?: string
  lessonEndTime?: string
  createdAt: string
  orgId?: string
}

export interface StaffStudent {
  id: string
  login: string
  name: string
  email?: string
  phone?: string
  groupId?: string
  joinedAt: string
  groupJoinedAt?: string
  monthlyFee?: number
  notes?: string
  targetBand?: number | null
  targetExamDate?: string | null
  isActive?: boolean
  deletedAt?: string | null
  lastLoginAt?: string | null
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused"

export interface AttendanceRecord {
  studentId: string
  status?: AttendanceStatus
  notes?: string
}

export interface LessonSession {
  id: string
  groupId: string
  date: string
  topic?: string
  notes?: string
  fromSchedule?: boolean
  canceled?: boolean
  cancelReason?: string
  attendanceMarked?: boolean
  attendance: AttendanceRecord[]
  createdAt: string
  updatedAt: string
}

export interface HomeworkCheckResponse {
  assignments: HomeworkAssignment[]
  records: HomeworkSubmission[]
}

export interface HomeworkDetailsResponse {
  homework: HomeworkAssignment
  group: Group | null
  students: StaffStudent[]
  submissions: HomeworkSubmission[]
}

export interface CreateHomeworkInput {
  title: string
  description?: string
  subject: Subject
  groupId: string
  dueAt: string
  estimatedMinutes?: number
  createdBy?: string
  exerciseSlug?: string
  timeLimitMinutes?: number
}

export function studentsInGroup(students: StaffStudent[], groupId: string): StaffStudent[] {
  const id = String(groupId)
  return students.filter((s) => s.groupId != null && String(s.groupId) === id && !s.deletedAt)
}

export function groupMemberCount(students: StaffStudent[], groupId: string): number {
  return studentsInGroup(students, groupId).length
}
