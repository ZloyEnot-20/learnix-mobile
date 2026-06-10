import { useEffect, useState } from "react"
import { Keyboard, Platform, type KeyboardEvent } from "react-native"

export function useKeyboardHeight() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates.height)
    const onHide = () => setHeight(0)

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

    const showSub = Keyboard.addListener(showEvent, onShow)
    const hideSub = Keyboard.addListener(hideEvent, onHide)
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return height
}
