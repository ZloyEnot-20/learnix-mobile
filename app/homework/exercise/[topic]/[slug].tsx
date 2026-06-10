import React, { useCallback, useEffect, useState } from "react"

import { StyleSheet, Text, View } from "react-native"

import { Stack, useLocalSearchParams } from "expo-router"

import { SafeAreaView } from "react-native-safe-area-context"

import { useAuth } from "../../../../src/context/AuthContext"

import { exercisesApi, homeworkApi, peekStale } from "../../../../src/lib/api"

import { cacheKey } from "../../../../src/lib/api-cache"

import { ExerciseRunner } from "../../../../src/components/exercise/ExerciseRunner"

import { HomeworkCheatingFailed } from "../../../../src/components/homework/HomeworkCheatingFailed"

import { HomeworkGrammarReview } from "../../../../src/components/homework/HomeworkGrammarReview"

import { HomeworkSessionShell } from "../../../../src/components/homework/HomeworkSessionShell"

import { ExerciseScreenSkeleton } from "../../../../src/components/skeletons/Layouts"

import { isCompletedSubmission } from "../../../../src/lib/homework-review"
import { recordHomeworkExercise } from "../../../../src/lib/record-activity"
import {
  isHomeworkEntryFailed,
  useHomeworkEntryOnFocus,
} from "../../../../src/hooks/useHomeworkEntryOnFocus"

import type { HomeworkSubmission, Subject } from "../../../../src/types/domain"

import type { GrammarExercise } from "../../../../src/types/grammar"

import { colors } from "../../../../src/theme/colors"



export default function HomeworkExerciseScreen() {

  const { topic, slug, hw } = useLocalSearchParams<{

    topic: string

    slug: string

    hw: string

  }>()

  const { user } = useAuth()

  const homeworkId = hw

  const studentId = user?.type === "student" ? user.id : undefined



  const exerciseKey = slug ? cacheKey("GET", `/exercises/${slug}`) : ""

  const submissionKey = homeworkId ? cacheKey("POST", `/homework/start:${homeworkId}`) : ""



  const [exercise, setExercise] = useState<GrammarExercise | null>(() =>

    slug ? peekStale<GrammarExercise>(exerciseKey) : null,

  )

  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>()

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)

  const [pauseUsed, setPauseUsed] = useState(false)

  const [reviewSubmission, setReviewSubmission] = useState<HomeworkSubmission | null>(() => {

    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null

    return sub && isCompletedSubmission(sub.status, sub.attempt) ? sub : null

  })

  const [homeworkSubject, setHomeworkSubject] = useState<Subject>("grammar")

  const [completedAt, setCompletedAt] = useState<string | undefined>(() => {

    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null

    return sub?.submittedAt ?? undefined

  })

  const [loading, setLoading] = useState(() => exercise === null && reviewSubmission === null)

  const [error, setError] = useState(false)

  const [alreadyFailed, setAlreadyFailed] = useState(false)

  const handleEntryResult = useCallback((sub: HomeworkSubmission | null) => {
    if (isHomeworkEntryFailed(sub)) setAlreadyFailed(true)
  }, [])

  useHomeworkEntryOnFocus(homeworkId, !!studentId, handleEntryResult)

  useEffect(() => {

    if (!slug || !homeworkId) return

    let cancelled = false



    const hasCachedView = exercise !== null || reviewSubmission !== null

    async function load() {
      if (!hasCachedView) setLoading(true)



      try {

        const [ex, hwData, sub] = await Promise.all([

          exercisesApi.get(slug),

          homeworkApi.get(homeworkId).catch(() => null),

          studentId ? homeworkApi.start(homeworkId, { force: true, skipEntryCount: true }).catch(() => null) : Promise.resolve(null),

        ])

        if (cancelled) return



        if (!ex) {

          setError(true)

          return

        }

        setExercise(ex)

        setTimeLimitMinutes(hwData?.timeLimitMinutes)

        if (hwData?.subject) setHomeworkSubject(hwData.subject)



        if (!studentId) {

          setSessionStartedAt(Date.now())

          return

        }



        if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {

          setAlreadyFailed(true)

          return

        }



        if (isCompletedSubmission(sub?.status, sub?.attempt)) {

          setReviewSubmission(sub)

          setCompletedAt(sub?.submittedAt ?? undefined)

          return

        }



        setElapsedSeconds(sub?.elapsedSeconds ?? 0)

        setPauseUsed(sub?.pauseUsed ?? false)

        setSessionStartedAt(

          sub?.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),

        )

        recordHomeworkExercise(studentId, ex, homeworkId, hwData?.subject ?? "grammar")

      } catch {

        if (!cancelled) setError(true)

      } finally {

        if (!cancelled) setLoading(false)

      }

    }



    void load()

    return () => {

      cancelled = true

    }

  }, [slug, homeworkId, studentId])



  const sessionReady =

    !loading && !error && exercise != null && sessionStartedAt != null && !reviewSubmission



  return (

    <>

      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

        {loading ? (

          <ExerciseScreenSkeleton />

        ) : alreadyFailed ? (

          <HomeworkCheatingFailed />

        ) : error || !exercise ? (

          <View style={styles.center}>

            <Text style={styles.errorText}>Exercise not found</Text>

          </View>

        ) : reviewSubmission?.attempt ? (

          <HomeworkGrammarReview

            exercise={exercise}

            attempt={reviewSubmission.attempt}

            title={exercise.title}

            subject={homeworkSubject}

            completedAt={completedAt}

          />

        ) : sessionStartedAt == null ? (

          <ExerciseScreenSkeleton />

        ) : (

          <HomeworkSessionShell

            homeworkId={homeworkId}

            active={sessionReady && !alreadyFailed}

            pauseUsed={pauseUsed}

            title={exercise.title}

          >

            <ExerciseRunner

              exercise={exercise}

              homeworkId={homeworkId}

              studentId={studentId}

              timeLimitMinutes={timeLimitMinutes}

              elapsedSeconds={elapsedSeconds}

              sessionStartedAt={sessionStartedAt}

              lockNavigation

            />

          </HomeworkSessionShell>

        )}

      </SafeAreaView>

    </>

  )

}



const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  errorText: { fontSize: 16, fontWeight: "600", color: colors.text },

})


