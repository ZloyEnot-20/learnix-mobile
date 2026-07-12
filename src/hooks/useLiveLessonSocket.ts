import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { getAccessToken } from "../lib/api-client"
import { getBackendOrigin } from "../lib/live-lesson-api"
import type { LiveLessonState } from "../lib/books/types"

type PresencePatch = {
  sessionId: string
  studentId: string
  status: string
  lastSeenAt?: string
}

type Handlers = {
  onState?: (state: LiveLessonState) => void
  onPresence?: (patch: PresencePatch) => void
  onError?: (message: string) => void
}

/** Student Socket.IO room — joins by sessionId (group membership already verified via REST). */
export function useLiveLessonSocket(sessionId: string | null, handlers: Handlers = {}) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let socket: Socket | null = null

    void (async () => {
      const token = await getAccessToken()
      if (!token || cancelled) return

      socket = io(getBackendOrigin(), {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
      })
      socketRef.current = socket

      socket.on("connect", () => {
        setConnected(true)
        socket?.emit("lesson:join", { sessionId })
      })
      socket.on("disconnect", () => setConnected(false))
      socket.on("lesson:state", (state: LiveLessonState) => {
        handlersRef.current.onState?.(state)
      })
      socket.on("lesson:presence", (patch: PresencePatch) => {
        handlersRef.current.onPresence?.(patch)
      })
      socket.on("lesson:error", (payload: { message?: string }) => {
        handlersRef.current.onError?.(payload?.message ?? "Live lesson error")
      })
    })()

    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [sessionId])

  const emit = useCallback((event: string, payload?: unknown) => {
    socketRef.current?.emit(event, payload)
  }, [])

  return { connected, emit }
}
