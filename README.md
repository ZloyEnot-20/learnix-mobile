# IELTS Student — React Native App

Мобильное приложение для студентов на **Expo + React Native**. Использует тот же backend API, что и веб-приложение.

## Запуск

1. Убедитесь, что backend запущен (`http://localhost:4000`):

```bash
cd backend && npm run dev
```

2. Установите зависимости и запустите приложение:

```bash
cd mobile
npm install
cp .env.example .env
npm start
```

3. Откройте в Expo Go (iOS/Android) или эмуляторе (`i` / `a` в терминале).

## Настройка API

В `.env` укажите URL backend:

```
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```

> На физическом устройстве замените `localhost` на IP вашего компьютера в локальной сети.

## Структура

| Экран | Описание |
|-------|----------|
| **Home** | Уровень, прогресс, последние результаты тестов |
| **Homework** | Карточки домашних заданий (Active / History) |
| **Game** | Game Station — уровни A1–C2, vocab + grammar |
| **Profile** | Профиль, группа, преподаватель, результаты |

- 🔔 Колокольчик уведомлений — в шапке всех вкладок
- Решение ДЗ — grammar (8 типов упражнений) и vocabulary (flashcards + quiz)

## Типы упражнений (grammar)

- Fill in the blank
- Multiple choice
- True / False
- Matching
- Word formation
- Sentence transformation
- Error correction
- Word order
