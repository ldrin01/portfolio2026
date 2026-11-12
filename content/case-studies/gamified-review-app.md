---
title: "Designing a Reason to Come Back"
shelf: work
summary: "Review apps are easy to abandon. For a licensure exam review app, I designed tiers, leaderboards and a decaying score multiplier so learners keep studying."
order: 18
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/gamified-review-app.webp"
---

| | |
| --- | --- |
| **Industry** | Education: exam review center |
| **My role** | Lead Designer |
| **Scope** | Mobile app, gamification system, quiz flows |
| **Tools** | Figma, Photoshop |
| **Team** | TODO: size and roles |
| **Timeline** | TODO: months and phases |

## The problem

Someone preparing for a licensure exam is studying alone, usually after work, for months. The first week is easy. The sixth week is where people stop opening the app.

The app had video classes and three kinds of quiz: short, long and mock exams. The content was there. The design problem was motivation: how do you give a tired learner a reason to open it again tomorrow?

## My role

I designed the whole app: the quiz flows, the video class screens, and the gamification system. TODO: add whether you also wrote the rules for tiers and scoring, or received them from the client.

## Process

1. **Map the learner's weeks.** I laid out what a learner does from day one to exam day, and marked where I expected them to drop off.
2. **Define what is rewarded.** The system had to reward effort and mastery, not only luck.
3. **Design the loop.** Take a quiz, earn points, move up a tier, see where you stand, and come back to the questions you got wrong.
4. **Make the rules legible.** A game system only works if a learner can see why their score changed.

TODO: add what you tested, with whom, and what you changed.

## Key decisions

### 1. A score multiplier that decays with each retry

Passers earn a multiplier on their score, but it shrinks every time they retry the same quiz. This rewards getting it right, and it keeps learners from grinding one quiz for easy points.

**Trade-off:** decay can feel punishing. I had to make the rule visible before the learner retried, so a lower score felt fair and not like a bug.

### 2. Bring back what you missed

Questions a learner got wrong come back later. Spaced repetition of mistakes is one of the most reliable ways to study, and it turns a failed question into a second chance.

**Why it matters:** the learner's weakest topics get the most practice without them having to hunt for it.

### 3. Tiers, badges and leaderboards together

Each one answers a different question. Tiers show progress over months. Badges mark small wins. Leaderboards show where you stand among others.

**Trade-off:** leaderboards motivate some learners and discourage others. TODO: how did you handle this (for example, showing nearby ranks, or tiers instead of one global list)?

## Outcome

- Delivered a mobile app with three quiz types, a tier system, badges, leaderboards and missed-question review
- TODO: live? Pass rate or retention change if the client shared one
- TODO: a real learner or client quote, if you have one

## What I'd do differently

TODO: your answer. Prompts: Which rule was hardest to explain on screen? Did any part of the game feel too much like a game for a serious exam?

## Why this project matters to me

Gamification is easy to do badly: points and confetti stuck on top of a boring product. What I like about this project is that every game rule is tied to a real study behavior, like retrying, reviewing mistakes and staying consistent.

## Sources

- Laws of UX, "Goal-Gradient Effect": https://lawsofux.com/goal-gradient-effect/
- Laws of UX, "Zeigarnik Effect": https://lawsofux.com/zeigarnik-effect/
