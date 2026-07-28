import AsyncStorage from "@react-native-async-storage/async-storage"
import { ASSIGN_FOLDERS, type AssignFolder } from "../theme/teacher-tokens"
import {
  ASSIGN_LEVEL_ORDER,
  countMaterialsByLevel,
  filterMaterialsByLevel,
  loadTeacherMaterials,
  type TeacherMaterialOption,
} from "./teacher-materials"

const STORAGE_KEY = "learnix_teacher_materials_v1"
const TTL_MS = 24 * 60 * 60 * 1000

type CacheSnapshot = {
  folders: Partial<Record<AssignFolder, TeacherMaterialOption[]>>
  cachedAt: number
}

let memory: Partial<Record<AssignFolder, TeacherMaterialOption[]>> = {}
const filteredMemory = new Map<string, TeacherMaterialOption[]>()
const levelCountsMemory: Partial<
  Record<AssignFolder, Partial<Record<string, number>>>
> = {}

let hydrated = false
let hydratePromise: Promise<void> | null = null
let preloadPromise: Promise<void> | null = null
const loadingFolders = new Set<AssignFolder>()
const listeners = new Set<() => void>()

function filterCacheKey(folder: AssignFolder, level: string): string {
  return `${folder}:${level}`
}

function rebuildFolderDerived(folder: AssignFolder, items: TeacherMaterialOption[]): void {
  for (const key of filteredMemory.keys()) {
    if (key.startsWith(`${folder}:`)) filteredMemory.delete(key)
  }

  levelCountsMemory[folder] = countMaterialsByLevel(items)

  for (const lvl of ASSIGN_LEVEL_ORDER) {
    filteredMemory.set(filterCacheKey(folder, lvl), filterMaterialsByLevel(items, lvl))
  }
}

function rebuildAllDerived(): void {
  filteredMemory.clear()
  for (const folder of ASSIGN_FOLDERS) {
    const items = memory[folder]
    if (items !== undefined) rebuildFolderDerived(folder, items)
  }
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeTeacherMaterialsCache(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Undefined = not loaded yet; array = loaded (may be empty). */
export function getCachedFolderMaterials(folder: AssignFolder): TeacherMaterialOption[] | undefined {
  return memory[folder]
}

/** Cached level filter — instant when folder is loaded. */
export function getCachedFilteredMaterials(
  folder: AssignFolder,
  level: string,
): TeacherMaterialOption[] | undefined {
  const all = memory[folder]
  if (all === undefined) return undefined

  const key = filterCacheKey(folder, level)
  const cached = filteredMemory.get(key)
  if (cached !== undefined) return cached

  const filtered = filterMaterialsByLevel(all, level)
  filteredMemory.set(key, filtered)
  return filtered
}

export function getCachedLevelCounts(
  folder: AssignFolder,
): Partial<Record<string, number>> | undefined {
  if (memory[folder] === undefined) return undefined
  return levelCountsMemory[folder] ?? countMaterialsByLevel(memory[folder]!)
}

export function isFolderMaterialsLoading(folder: AssignFolder): boolean {
  return loadingFolders.has(folder)
}

async function persist(): Promise<void> {
  const snapshot: CacheSnapshot = { folders: memory, cachedAt: Date.now() }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

async function hydrateFromDisk(): Promise<void> {
  if (hydrated) return
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as CacheSnapshot
        if (Date.parse(String(parsed.cachedAt)) && Date.now() - parsed.cachedAt <= TTL_MS) {
          memory = { ...(parsed.folders ?? {}) }
          rebuildAllDerived()
          notify()
        }
      }
    } catch {
      /* ignore corrupt cache */
    } finally {
      hydrated = true
    }
  })()

  return hydratePromise
}

async function loadFolder(folder: AssignFolder, force = false): Promise<TeacherMaterialOption[]> {
  if (!force && memory[folder] !== undefined) {
    return memory[folder]!
  }

  loadingFolders.add(folder)
  notify()

  try {
    const items = await loadTeacherMaterials(folder)
    memory = { ...memory, [folder]: items }
    rebuildFolderDerived(folder, items)
    notify()
    void persist()
    return items
  } catch {
    if (memory[folder] === undefined) {
      memory = { ...memory, [folder]: [] }
      rebuildFolderDerived(folder, [])
      notify()
    }
    return memory[folder] ?? []
  } finally {
    loadingFolders.delete(folder)
    notify()
  }
}

/** Warm memory from disk, then fetch all folders in parallel (stale-while-revalidate). */
export async function preloadTeacherMaterials(opts?: { force?: boolean }): Promise<void> {
  await hydrateFromDisk()

  if (opts?.force) {
    preloadPromise = null
  }

  if (preloadPromise) return preloadPromise

  preloadPromise = Promise.all(
    ASSIGN_FOLDERS.map((folder) => loadFolder(folder, opts?.force)),
  ).then(() => undefined)

  return preloadPromise
}

export async function ensureTeacherMaterials(folder: AssignFolder): Promise<TeacherMaterialOption[]> {
  await hydrateFromDisk()
  if (memory[folder] !== undefined) return memory[folder]!
  return loadFolder(folder)
}

/** Background refresh without blocking UI when cache exists. */
export function refreshTeacherMaterials(folder: AssignFolder): void {
  void loadFolder(folder, true)
}
