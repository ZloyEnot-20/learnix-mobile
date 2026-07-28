import type { Subject } from "./staff"

export interface AdminDashboardStats {
  totalStudents: number
  totalTeachers: number
  activeUsersToday: number
  usersOnlineNow: number
  pendingHomeworkReview: number
  newRegistrationsToday: number
}

export interface AdminTeacherOverview {
  id: string
  name: string
  avatarUrl: string | null
  studentCount: number
  pendingReview: number
  lastActivityAt: string | null
  isOnline: boolean
  groupIds: string[]
  groupNames: string[]
}

export interface HomeworkReviewItem {
  id: string
  studentId: string
  studentName: string
  groupId: string | null
  homeworkId: string
  homeworkTitle: string
  subject: Subject
  submittedAt: string
  status: string
}

export interface AdminBroadcastRecord {
  id: string
  sentById: string
  sentByName: string
  audience: "all" | "group" | "student"
  audienceId: string | null
  audienceLabel: string | null
  title: string
  message: string
  recipientCount: number
  createdAt: string
}

export type AdminAlertType =
  | "registration"
  | "homework"
  | "complaint"
  | "payment"
  | "review_delay"
  | "system"

export interface AdminAlert {
  id: string
  type: AdminAlertType
  title: string
  message: string
  createdAt: string
  read: boolean
  data: Record<string, unknown>
}

export const ADMIN_SECTION_TITLES: Record<string, string> = {
  index: "Dashboard",
  users: "Users",
  teachers: "Teachers",
  homework: "Homework review",
  push: "Push notifications",
  alerts: "Notifications",
}
