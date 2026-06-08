import React from "react"
import { useAuth } from "../../src/context/AuthContext"
import { StudentHomeworkList } from "../../src/components/StudentHomeworkList"

export default function HomeworkScreen() {
  const { user } = useAuth()
  if (!user) return null

  return <StudentHomeworkList studentId={user.id} />
}
