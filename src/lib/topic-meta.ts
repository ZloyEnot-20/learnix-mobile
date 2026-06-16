import type { TopicMeta } from "../types/vocabulary"

export function topicMetaKey(meta: Pick<TopicMeta, "topic" | "slug">): string {
  return meta.topic ?? meta.slug ?? ""
}

export function findTopicMeta(metas: TopicMeta[], key: string): TopicMeta | undefined {
  return metas.find((m) => topicMetaKey(m) === key)
}

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function topicDisplayTitle(metas: TopicMeta[], key: string): string {
  return findTopicMeta(metas, key)?.title ?? humanizeSlug(key)
}
