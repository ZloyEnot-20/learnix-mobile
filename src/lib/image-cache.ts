import { Image } from "expo-image"

export async function prefetchRemoteImages(
  urls: (string | null | undefined)[],
): Promise<void> {
  const remote = urls.filter(
    (url): url is string => !!url && /^https?:\/\//i.test(url),
  )
  if (remote.length === 0) return
  await Promise.allSettled(
    remote.map((url) => Image.prefetch(url, { cachePolicy: "disk" })),
  )
}

export async function clearImageCache(): Promise<void> {
  await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()])
}
