# 🐱 Kiddy Kat

A family routine app that helps kids own their mornings, after-school time and bedtimes, with a parent dashboard and a career mode for grown-ups. Built and tested by APS Legacy Group.

![Tests](https://github.com/seanm1chael/kiddy-kat/actions/workflows/tests.yml/badge.svg)

## What it does

- **Daily lists** for school mornings, after school, bedtime, weekends and no-school nights, with weather-based outfit tips
- **Grows with the kid:** 🐱 kitten (7–9), 🐯 tiger (10–13), 🦁 lion (14–21), 🦅 eagle (grown-ups, career mode)
- **Motivation:** stars, a pet or project that levels up, morning streaks, a family league and team goal
- **Learning:** math, spelling (with definitions), grammar, interview prep for grown-ups
- **🕹️ Arcade:** Code Quest (beginner coding), Daily Word, Memory Match, and tic-tac-toe / Connect Four against family
- **Parent dashboard:** messages, special days, a shopping list from the kids' supplies, earn-back goals, reward approvals
- **Alerts:** morning countdown, bedtime, bill reminders, grocery day, "your turn" in family games
- **Grown-up tools:** career goals and a private tracker, a bill tracker with reminders

## How it's built

| Part | Tech |
| --- | --- |
| App | Plain HTML, CSS and JavaScript, installable on a phone's home screen (PWA) |
| Hosting | GitHub Pages |
| Server | Supabase: Postgres with row-level security, login checked in database functions |
| Cloud functions | Supabase Edge Functions (Deno): AI coach, push alerts, scheduled alerts |
| Tests | Playwright on GitHub Actions, in Safari's engine (WebKit) and Chrome, on every change |

## Privacy

Real names, photos and bill amounts stay on the family's own phones. Only nicknames go online. See [privacy.html](privacy.html).

## Quality

Every change goes through a pull request. It merges only when the automatic tests pass, then a release checklist and a check on real phones. Each bug fixed gets a test that keeps it from coming back.
