# Farouk's Coach

A personal training, meal-prep and progress app that installs on an iPhone home screen. It works offline, and all data stays on the phone.

## What it does
- **Today**: today's session, today's meals, a cook-tonight / shopping-day reminder, and the daily log (weight, steps, sleep, creatine, posture, football, meals out). You can fill in past days.
- **Train**: a 12-week upper/lower plan (intro, build, deload, push, test weeks), then a new block. Logs sets, shows last time's numbers, suggests when to add weight, flags lifts that stall, offers swaps when a machine is busy, and has a rest timer. You can pause a week when sick or travelling.
- **Food**: a 2-week meal rotation scaled to the calorie target, with two cook nights a week (one batch each, plus no-cook dinners). Shows quantities per cook session, recipes with steps, one shopping list per 2 weeks, prices and budget. New plans avoid repeating the last 2 weeks.
- **Progress**: weekly adaptive check-in. It looks at 3 weeks of weight, waist, sessions, food, steps, sleep and lifts. It fixes consistency, steps or sleep first and only changes calories (±150) on a real plateau or when losing too fast; meals rescale automatically. Also InBody history (with body-part breakdown), run tests, lifts and progress photos.
- **Coach**: "Copy my status" puts a full summary plus your question on the clipboard, ready to paste into Claude. Claude can also send back recipes that the app imports.
- **Settings**: targets, home, cook and shop days, gym equipment, calendar reminders (.ics), backup and restore.

## Install on iPhone
1. Open the GitHub Pages link in **Safari**.
2. Tap Share → **Add to Home Screen**.
3. Open it from the home screen. Back up from Settings every couple of weeks.

## Develop
No build step: plain HTML, CSS and ES modules.
```
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # logic tests (Node 20+)
```
Pushing to `main` deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions).
