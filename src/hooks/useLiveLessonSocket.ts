import React, { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
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

/**
 * Student Socket.IO room. Connection is best-effort — REST polling is the source of truth.
 */
export function useLiveLessonSocket(sessionId: string | null, handlers: Handlers = {}) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  useEffect(() => {
    if (!sessionId) {
      setConnected(false)
      return
    }

    let cancelled = false
    let socket: Socket | null = null

    void (async () => {
      const token = await getAccessToken()
      if (!token || cancelled) return

      socket = io(getBackendOrigin(), {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 12000,
      })
      socketRef.current = socket

      const joinRoom = () => {
        const id = sessionIdRef.current
        if (!id || !socket) return
        socket.emit("lesson:join", { sessionId: id }, (ack?: { ok?: boolean; error?: string }) => {
          if (ack && ack.ok === false) {
            handlersRef.current.onError?.(ack.error ?? "Could not join live room")
          }
        })
      }

      socket.on("connect", () => {
        setConnected(true)
        joinRoom()
      })
      socket.on("disconnect", () => setConnected(false))
      socket.on("connect_error", () => setConnected(false))
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

    const onAppState = (next: AppStateStatus) => {
      if (next === "active" && socketRef.current?.disconnected) {
        socketRef.current.connect()
      }
    }
    const sub = AppState.addEventListener("change", onAppState)

    return () => {
      cancelled = true
      sub.remove()
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
