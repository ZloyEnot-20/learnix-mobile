import React, { useEffect, useState } from "react"

import { StyleSheet, Text, View } from "react-native"

import { Stack, useLocalSearchParams } from "expo-router"

import { SafeAreaView } from "react-native-safe-area-context"

import { useAuth } from "../../../src/context/AuthContext"

import { exercisesApi, homeworkApi, peekStale } from "../../../src/lib/api"

import { cacheKey } from "../../../src/lib/api-cache"

import { VocabularyScreen } from "../../../src/components/VocabularyScreen"

import { HomeworkCheatingFailed } from "../../../src/components/homework/HomeworkCheatingFailed"

import { HomeworkSessionShell } from "../../../src/components/homework/HomeworkSessionShell"

import { HomeworkVocabReview } from "../../../src/components/homework/HomeworkVocabReview"

import { VocabScreenSkeleton } from "../../../src/components/skeletons/Layouts"

import { isCompletedSubmission } from "../../../src/lib/homework-review"
import { recordHomeworkVocabulary } from "../../../src/lib/record-activity"

import type { HomeworkSubmission, Subject } from "../../../src/types/domain"

import type { VocabDeck } from "../../../src/types/vocabulary"

import { colors } from "../../../src/theme/colors"



export default function HomeworkVocabularyScreen() {

  const { deck: deckSlug, hw } = useLocalSearchParams<{ deck: string; hw: string }>()

  const { user } = useAuth()

  const homeworkId = hw

  const isStudent = user?.type === "student"



  const deckKey = deckSlug ? cacheKey("GET", `/exercises/vocab/${deckSlug}`) : ""

  const submissionKey = homeworkId ? cacheKey("POST", `/homework/start:${homeworkId}`) : ""



  const [deck, setDeck] = useState<VocabDeck | null>(() =>

    deckSlug ? peekStale<VocabDeck>(deckKey) : null,

  )

  const [loading, setLoading] = useState(() => {

    const cachedSub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null

    const hasReview =

      cachedSub != null && isCompletedSubmission(cachedSub.status, cachedSub.attempt)

    return deck === null && !hasReview

  })

  const [pauseUsed, setPauseUsed] = useState(false)

  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)

  const [reviewSubmission, setReviewSubmission] = useState<HomeworkSubmission | null>(() => {

    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null

    return sub && isCompletedSubmission(sub.status, sub.attempt) ? sub : null

  })

  const [homeworkSubject, setHomeworkSubject] = useState<Subject>("vocabulary")

  const [completedAt, setCompletedAt] = useState<string | undefined>(() => {

    const sub = submissionKey ? peekStale<HomeworkSubmission>(submissionKey) : null

    return sub?.submittedAt ?? undefined

  })

  const [alreadyFailed, setAlreadyFailed] = useState(false)

  const [quizActive, setQuizActive] = useState(false)



  useEffect(() => {

    if (!deckSlug || !homeworkId) return

    let cancelled = false



    const hasCachedView = deck !== null || reviewSubmission !== null

    async function load() {
      if (!hasCachedView) setLoading(true)



      try {

        const [d, sub, hwData] = await Promise.all([

          exercisesApi.vocabDeck(deckSlug),

          isStudent ? homeworkApi.start(homeworkId, { force: true }).catch(() => null) : Promise.resolve(null),

          isStudent ? homeworkApi.get(homeworkId).catch(() => null) : Promise.resolve(null),

        ])

        if (cancelled) return



        setDeck(d ?? null)

        if (hwData?.subject) setHomeworkSubject(hwData.subject)



        if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {

          setAlreadyFailed(true)

          return

        }



        if (isCompletedSubmission(sub?.status, sub?.attempt)) {

          setReviewSubmission(sub)

          setCompletedAt(sub?.submittedAt ?? undefined)

        } else if (d && isStudent && user?.id) {

          recordHomeworkVocabulary(user.id, d, deckSlug, homeworkId)

        }

      } catch {

        if (!cancelled) setDeck(null)

      } finally {

        if (!cancelled) setLoading(false)

      }

    }



    void load()

    return () => {

      cancelled = true

    }

  }, [deckSlug, homeworkId, isStudent])



  useEffect(() => {

    if (

      reviewSubmission ||

      !quizActive ||

      !isStudent ||

      !homeworkId ||

      sessionStartedAt != null

    ) {

      return

    }

    let cancelled = false



    async function beginSession() {

      const sub = await homeworkApi.start(homeworkId, { force: true }).catch(() => null)

      if (cancelled) return



      if (sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating) {

        setAlreadyFailed(true)

        return

      }



      if (isCompletedSubmission(sub?.status, sub?.attempt)) {

        setReviewSubmission(sub)

        return

      }



      setPauseUsed(sub?.pauseUsed ?? false)

      setSessionStartedAt(

        sub?.sessionStartedAt ? new Date(sub.sessionStartedAt).getTime() : Date.now(),

      )

      if (deck && user?.id) {

        recordHomeworkVocabulary(user.id, deck, deckSlug, homeworkId)

      }

    }



    void beginSession()

    return () => {

      cancelled = true

    }

  }, [quizActive, isStudent, homeworkId, sessionStartedAt, reviewSubmission])



  const sessionReady =
    !loading && deck != null && !reviewSubmission && quizActive && sessionStartedAt != null



  return (

    <>

      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

        {loading ? (

          <VocabScreenSkeleton />

        ) : alreadyFailed ? (

          <HomeworkCheatingFailed />

        ) : !deck ? (

          <View style={styles.center}>

            <Text style={styles.errorText}>Deck not found</Text>

          </View>

        ) : reviewSubmission?.attempt ? (

          <HomeworkVocabReview

            deck={deck}

            attempt={reviewSubmission.attempt}

            title={deck.title}

            subject={homeworkSubject}

            completedAt={completedAt}

          />

        ) : (

          <HomeworkSessionShell

            homeworkId={homeworkId}

            active={sessionReady && !alreadyFailed}

            pauseUsed={pauseUsed}

            title={deck.title}

          >

            <VocabularyScreen

              deck={deck}

              homeworkId={homeworkId}

              isStudent={isStudent}

              studentId={isStudent ? user?.id : undefined}

              homeworkMode

              onQuizActiveChange={setQuizActive}

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


