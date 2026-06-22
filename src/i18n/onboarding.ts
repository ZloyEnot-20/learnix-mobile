export type AppLocale = "uz" | "ru" | "en"

export const onboardingTexts = {
  uz: {
    title: "Learnix ga xush kelibsiz",
    desc: "Ingliz tilini zamonaviy usulda o'rganing — darslar, uy vazifalari va o'yinlar bir joyda.",
    login: "Kirish",
    guest: "Mehmon sifatida",
  },
  ru: {
    title: "Добро пожаловать в Learnix",
    desc: "Изучайте английский современно — уроки, домашние задания и игры в одном приложении.",
    login: "Войти",
    guest: "Войти как гость",
  },
  en: {
    title: "Welcome to Learnix",
    desc: "Learn English the modern way — lessons, homework, and games in one app.",
    login: "Log in",
    guest: "Continue as guest",
  },
} as const
