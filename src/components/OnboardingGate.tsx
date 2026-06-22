import React, { useEffect, useState } from "react"
import { isOnboardingDone } from "../lib/onboarding"
import { AppSplashScreen } from "./AppSplashScreen"
import { IntroScreen } from "./IntroScreen"

type OnboardingGateProps = {
  children: React.ReactNode
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const [done, setDone] = useState<boolean | null>(null)

  useEffect(() => {
    isOnboardingDone().then(setDone)
  }, [])

  if (done === null) {
    return <AppSplashScreen />
  }

  if (!done) {
    return <IntroScreen onDone={() => setDone(true)} />
  }

  return <>{children}</>
}
