---
title: "Designing a Reason to Come Back"
shelf: work
summary: "Review apps are easy to abandon. For a licensure exam review app, I designed tiers, leaderboards and a decaying score multiplier so learners keep studying."
order: 18
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/gamified-review-app.webp"
---

**Role:** Lead Designer\
**Work:** Self-paced mobile app for a licensure exam review, with video classes, quizzes and a game system\
**Under NDA:** Education, no client names or figures

Someone preparing for a licensure exam studies alone, usually after work, for months. The first week is easy. By the sixth week many people stop opening the app. The content can be perfect and it still does not help if the learner never comes back.

## The design problem is motivation

The app had video classes and three kinds of quiz: short, long and mock exams. The content was already there. So the question was simple: what gives a tired learner a reason to open the app again tomorrow?

It helps to start from the learner's calendar and not from the screens. Lay out what a learner does from day one to exam day, mark the weeks where people are likely to drop off, and ask what should be waiting for them in those weeks.

## Reward the study habit, not the luck

A game system can reward the wrong thing. If points come from tapping fast or repeating an easy quiz, the score goes up and the learner learns nothing. So every rule is tied to something that helps a person pass:

1. **Getting it right.** Points follow correct answers and mastery.
2. **Trying again, with limits.** A retry should help the learner, not become a way to farm points.
3. **Fixing mistakes.** A missed question is a second chance, not a mark against the learner.
4. **Showing up often.** Small, regular sessions beat one long night before the exam.

> A game rule is only worth having if it matches something a good student already does.

## Tools, and what each one answers

Tiers, badges and leaderboards were used together because each one answers a different question.

| Piece | The learner's question | What it does |
| --- | --- | --- |
| Tiers | How far have I come? | Shows progress over months |
| Badges | Did I do something well today? | Marks small wins |
| Leaderboards | Where do I stand? | Shows rank among other learners |

Tiers lean on the goal-gradient effect. People work harder when they can see the finish getting closer ([Laws of UX](https://lawsofux.com/goal-gradient-effect/)). Unfinished work also stays in the mind more than finished work, which is the Zeigarnik effect ([Laws of UX](https://lawsofux.com/zeigarnik-effect/)). That is one reason a clear next step on the home screen, like a half-done set of questions, works well.

## Trade-offs

Every one of these ideas has a cost.

- **A score multiplier that decays with each retry.**
  - It rewards a strong first attempt and stops easy grinding.
  - It can feel unfair. The rule has to be visible before the learner retries, so a lower score reads as a rule and not as a bug.
- **Bringing missed questions back later.**
  - The weakest topics get the most practice without the learner hunting for them.
  - Too many repeats feel like punishment, so the app should keep them light.
- **Leaderboards.**
  - They motivate some learners and discourage others.
  - Showing ranks close to the learner, or ranks inside a tier, is kinder than one long global list.

## Make the rules easy to read

A game only works if the learner can see why a score changed. After each quiz, a short and plain breakdown helps: points earned, any multiplier, and what the next tier needs. Rules written in the interface, in simple words, beat a help page nobody opens.

The tone should stay serious enough for an exam. Confetti on a failed mock test would feel wrong. The game layer should feel like a coach, not an arcade.

## What to check next

- Watch learners in the sixth week, not only the first, since that is where people leave.
- Test whether the decay rule is understood before the first retry.
- Ask whether any part feels too much like a game for a serious exam.

Gamification is easy to do badly: points and confetti on top of a boring product. It works best when every rule ties to a real study habit.

## Sources

- Laws of UX, "Goal-Gradient Effect": https://lawsofux.com/goal-gradient-effect/
- Laws of UX, "Zeigarnik Effect": https://lawsofux.com/zeigarnik-effect/
