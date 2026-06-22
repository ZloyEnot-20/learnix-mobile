import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { onboardingTexts, type AppLocale } from "../i18n/onboarding"

const LOCALE_KEY = "learnix_locale"

interface LocaleContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: keyof typeof onboardingTexts.en) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("uz")

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((stored) => {
      if (stored === "uz" || stored === "ru" || stored === "en") {
        setLocaleState(stored)
      }
    })
  }, [])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    void AsyncStorage.setItem(LOCALE_KEY, next)
  }, [])

  const t = useCallback(
    (key: keyof typeof onboardingTexts.en) => onboardingTexts[locale][key],
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}
