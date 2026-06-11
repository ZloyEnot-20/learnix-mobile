import React from "react"
import { Image, type ImageProps } from "expo-image"

type CachedImageProps = Omit<ImageProps, "cachePolicy"> & {
  uri: string
}

export function CachedImage({ uri, ...props }: CachedImageProps) {
  return (
    <Image
      {...props}
      source={{ uri }}
      cachePolicy="disk"
      recyclingKey={uri}
    />
  )
}
