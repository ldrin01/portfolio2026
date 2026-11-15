---
title: "Nothing Slips Through"
shelf: work
summary: "A news publishing portal where writers, photographers, checkers and vetters all touch one story. I designed the editorial workflow and the ticketing behind it."
order: 21
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/editorial-workflow-system.webp"
---

**Role:** Lead Designer and Lead System Analyst\
**Work:** Publishing portal for a news agency, with an editorial review and scheduling workflow and article ticketing (in progress)\
**Under NDA:** Media industry only, no client names

A news story passes through many hands before a reader sees it. A writer submits it. A photographer adds images. A checker verifies the facts. A vetter reviews it. Then someone decides if it goes live now, stays a draft or waits for a set time.

This project is still in progress, so this piece is about the thinking behind it and not about results. Most of the work so far is not pages. It is the rules that decide who does what, and when.

## Where stories get lost

When the path is not clear, the same things go wrong in any newsroom:

- A story sits in someone's queue and nobody knows.
- A story goes live before the checker has seen it.
- A story is edited after it was approved.
- A request for a photo or a correction lives in a chat message, and then it is forgotten.

None of these are people problems. They are what happens when the system does not say whose turn it is. That is why the roles and steps came first, and the screens came later.

## How it was approached

This was both design and analysis. As the designer and the system analyst, the rules were part of the design from the start. The order was:

1. **List the roles and what each can do.** Writers, photographers, checkers and vetters all work on the same story, but they need different permissions.
2. **Map the life of a story.** Draft, submitted, reviewed, approved, then published or scheduled. Every state has one clear owner.
3. **Design a workspace for each role.** Each person lands on their own queue first, not a list of everything.
4. **Add ticketing.** Requests and issues are tracked in the system, so nothing depends on a chat message or someone's memory.

## Decisions and what they cost

### Design around the role

A story is one record, but each role looks at it for a different reason. A checker needs the claims. A photographer needs the captions and image slots. One big editor that everyone shares would show all of it to all of them.

> A shared editor is easy to build. A workspace that shows each person only what they can act on is easier to use.

The cost is more screens to design, build and test. It is worth it, because it keeps every person focused on their own job.

### One owner at a time

At each stage the story belongs to one role. That is the rule that answers "whose turn is it?" without anyone sending a message. The cost is that handing a story back needs a clear action and a reason, so sending back is a real step and not an exception.

### Make the last step deliberate

Publish, save as draft and schedule are the final choices. For a newsroom, going live by accident is a serious mistake. So the final step is a clear, explicit choice with the three options side by side, and not a toggle hidden in a settings panel.

### Tickets for anything outside the flow

Some things do not fit the normal path: a photo request, a fact in doubt, a correction after publishing. A ticket gives each of these an owner, a status and a history. The cost is a little more admin for staff, so tickets have to be quick to open from the story itself.

## Comparing the options

| Choice | What it gives | What it costs |
| --- | --- | --- |
| One shared editor | Less to build | Every role sees everything |
| A workspace per role | Clear, focused screens | More screens to design and maintain |
| Chat for requests | No new tool to learn | Requests get lost |
| Tickets in the system | A trail for every request | A few extra clicks |

## How to judge it once it is in use

Two signals show whether it works: how often stories wait without an owner, and whether anything changes after approval without a record. Those are the two things the design is built to prevent.

## Why this kind of project matters

Most design work is visible: pages, apps, interactions. This kind is mostly invisible. The work is in the rules that let a team get through its day without confusion. A background in information systems helps here, because it makes it easier to think about the process and the screen together.

If people always know whose turn it is, most of the screen design gets simpler.
