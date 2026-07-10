import { Asset } from "expo-asset"

import { LISTENING_FULL_AUDIO } from "./listening-audio-registry.generated"

function catalogIdFromTest(test: { catalogId?: string; book?: number; test?: number }): string | null {
  if (test.catalogId?.trim()) return test.catalogId.trim()
  if (typeof test.book === "number" && typeof test.test === "number") {
    return `cambridge-ielts-${test.book}-listening-test-${test.test}`
  }
  return null
}

export function getListeningCatalogId(
  test: { catalogId?: string; book?: number; test?: number },
  routeId?: string,
): string | null {
  return routeId?.trim() || catalogIdFromTest(test)
}

export async function resolveListeningFullAudioUri(
  test: { catalogId?: string; book?: number; test?: number; fullAudioUrl?: string },
  routeId?: string,
): Promise<string> {
  const catalogId = getListeningCatalogId(test, routeId)
  const bundledModule = catalogId ? LISTENING_FULL_AUDIO[catalogId] : undefined

  if (bundledModule != null) {
    const asset = Asset.fromModule(bundledModule)
    if (!asset.downloaded) {
      await asset.downloadAsync()
    }
    const uri = asset.localUri ?? asset.uri
    if (uri) return uri
  }

  const remote = test.fullAudioUrl?.trim()
  if (remote && /^https?:\/\//i.test(remote)) {
    return remote
  }

  throw new Error("LISTENING_AUDIO_NOT_FOUND")
}
