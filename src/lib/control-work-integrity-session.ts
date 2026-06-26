/** Tracks which progress-test screen owns integrity monitoring (only one at a time). */
let activeControlWorkId: string | null = null

export function claimControlWorkIntegritySession(controlWorkId: string): () => void {
  activeControlWorkId = controlWorkId
  return () => {
    if (activeControlWorkId === controlWorkId) activeControlWorkId = null
  }
}

export function isActiveControlWorkIntegritySession(controlWorkId: string): boolean {
  return activeControlWorkId === controlWorkId
}
