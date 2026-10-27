# Аудиоквесты по Кронштадту

Мобильное веб-приложение — платформа аудиоквестов по Кронштадту.
Ведущие — капитан Федот Селёдкин и чайка Клуша. На платформе будет несколько квестов.

Сейчас готов **этап 1 — каркас проекта**: одна главная страница с приветствием,
без функций квеста.

## Технологии

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Node.js 22
- Хостинг: Timeweb Cloud (App Platform), Next.js с SSR: `npm run build` + `npm start`
- Позже: база данных PostgreSQL и S3-хранилище для файлов (тоже в Timeweb Cloud)

## Как запустить на своём компьютере

1. Установите [Node.js 22](https://nodejs.org).
2. Скачайте проект и откройте его папку в терминале.
3. Установите зависимости (библиотеки, нужные проекту):

   ```bash
   npm install
   ```

4. Запустите режим разработки:

   ```bash
   npm run dev
   ```

5. Откройте в браузере http://localhost:3000

## Сборка для хостинга

Timeweb Cloud App Platform делает то же самое, что и эти команды:

```bash
npm install
npm run build
npm start
```

`npm start` запускает сервер Next.js (`next start`) с включённым SSR.
Порт берётся из переменной окружения `PORT`, по умолчанию — 3000.

## Картинки квеста

Оригиналы лежат в `assets-src/kronstadt-walk/images/` (их не меняем).
Готовые WebP для сайта делает скрипт — одной командой (нужен Python 3):

```bash
pip install -r scripts/requirements.txt
python3 scripts/process-images.py
```

Скрипт кладёт картинки в `public/quests/kronstadt-walk/images/` и обновляет таблицу
в `docs/assets-kronstadt-walk.md`. Чтобы добавить новую картинку, допишите её
в список `IMAGES` в начале скрипта.

## Секреты

Пароли и ключи хранятся только в переменных окружения: локально — в файле
`.env.local` (он не попадает в GitHub), на хостинге — в настройках Timeweb Cloud.
Образец списка переменных — в `.env.example`.

## Структура

```
src/app/layout.tsx   — общий каркас всех страниц (язык, тема)
src/app/page.tsx     — главная страница
src/app/globals.css  — стили, светлая и тёмная тема
next.config.ts       — настройки Next.js
docs/                — техническое задание (ТЗ) платформы и станций
CLAUDE.md            — правила проекта для Claude
```
