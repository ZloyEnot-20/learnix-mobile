/** Tracks which homework screen owns integrity monitoring (only one at a time). */
let activeHomeworkId: string | null = null

export function claimHomeworkIntegritySession(homeworkId: string): () => void {
  activeHomeworkId = homeworkId
  return () => {
    if (activeHomeworkId === homeworkId) activeHomeworkId = null
  }
}

export function isActiveHomeworkIntegritySession(homeworkId: string): boolean {
  return activeHomeworkId === homeworkId
}
