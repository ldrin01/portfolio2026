---
title: "UX Research"
shelf: craft
summary: "How I pick the right research method on agency timelines, and turn interviews, surveys and tests into decisions on the screen."
order: 11
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/ux-research.webp"
---

At an agency, research rarely looks like it does in textbooks. There's no dedicated research team, the timeline was agreed before anyone asked what users need, and the budget is usually tight. But skipping research doesn't save time. It just moves the cost to the end of the project, when a client sees the build and says "this isn't how our customers work."

So I treat research as something that has to fit the project, not something to skip. Here's how I approach it.

## Start with the question, not the method

The most common mistake I see is picking a method first. "Let's do a survey" before anyone has said what we're trying to learn.

Nielsen Norman Group has a useful framework for this. They map methods along three dimensions:

- **Attitudinal vs. behavioral**: what people say versus what people do.
- **Qualitative vs. quantitative**: qualitative methods are better for "why" and "how to fix" questions, quantitative for "how many" and "how much."
- **Context of use**: whether people use the product naturally, follow a script, see a limited version, or don't use it at all.

They also tie methods to project stages. Early, to find direction: interviews, field studies, diary studies, surveys, concept testing. During design, to improve it: card sorting, tree testing, usability testing. After launch, to measure it: benchmarking, analytics, A/B tests, surveys.

That's how I plan. I write down the two or three questions we need answered, figure out the stage we're in, and the method usually picks itself.

## Stakeholder interviews come first

On almost every project, research starts with the client. Requirement gathering with stakeholders and our system analysts tells me the business goals, the constraints and who the users are supposed to be.

It also tells me the assumptions. A university team might be sure students care most about program listings. A bank might assume customers want more features in the app. Those assumptions are what I want to test with real users.

## Talking to users

When I can get access to users, interviews are my main tool. NN/g's guidance shaped how I run them:

- **Ask about specific past events.** "Tell me about the last time you booked a hotel room" beats "How do you usually book hotels?" The second gets you an idealized version.
- **Ask for extremes.** Particularly frustrating or particularly smooth experiences are vivid, so people remember details.
- **Don't lead.** People will form an opinion about almost anything when asked. Pushing for answers creates opinions they didn't really have.
- **Don't ask them to design.** Interviews are bad for specific UI decisions, like menu types or button colors, and for predicting whether people would use a feature that doesn't exist yet.

> Listen to what users say about their lives. Watch what they do with the design. Don't confuse the two.

For mobile apps with more than one kind of user, like a logistics app with customers and drivers, I talk to both groups separately. Their goals and context are completely different, and one group's needs can't stand in for the other's.

## Surveys, carefully

Surveys are tempting because they're cheap and give you numbers. They're also easy to get wrong. A few rules I follow:

- Use them for "how many", not "why." Interviews explain. Surveys measure.
- Keep them short. Every extra question lowers completion and quality.
- Ask about behavior and facts where possible, not hypothetical preferences.
- Pilot with two or three people before sending it out. Confusing questions show up immediately.

## Testing the design

Usability testing is where research turns directly into design changes. NN/g's well-known guidance is that five users in a qualitative test find most of the usability problems you'd find with many more, and that the return drops quickly after that.

The important part of that advice is often skipped: it assumes you test, fix and test again. Several small rounds beat one big one. And if you have distinct user groups, each one needs its own participants. For quantitative studies with statistics, you need far more people, at least 20 according to NN/g.

On agency timelines, my version is simple: a few people, a clickable Figma prototype, three to five realistic tasks, and a quick round of fixes before the next review.

## Making sense of it

Raw notes don't change a design. Synthesis does. My go-to is affinity diagramming, usually in FigJam:

1. **Everyone writes notes alone first.** One observation or quote per sticky. Working alone first reduces groupthink.
2. **Cluster by content.** Group related notes, then label each group with a clear theme.
3. **Don't throw away small clusters.** Outliers can be the most interesting finding.
4. **Decide what to do.** For each theme: design change, open question, more research, or no action. Each gets an owner.

NN/g makes the point that the conversation while clustering matters more than the final diagram. That matches my experience, especially with developers in the room.

## From findings to screens

This is the step that gets lost most often. A research deck full of insights that nobody acts on is wasted effort. So I connect each finding to something concrete:

- A **user journey document** that shows where problems happen.
- **Design principles** for the project, written from the findings.
- **Specific screen changes**, with the finding noted in the Figma file next to the design.

When a client pushes back on a decision, being able to point to what users actually did is far more convincing than my opinion.

## Where AI helps

I've built Claude Skills for UX research and user journey documents. They help me draft interview guides, spot leading questions, summarize transcripts and turn clustered notes into a first draft of findings. That saves real time on agency schedules. I still review everything against the source notes, because a summary that sounds right but misquotes a user is worse than no summary.

## Common mistakes

- Running research after the design is already approved.
- Treating stakeholder opinions as user research.
- Recruiting only friendly or internal users.
- Reporting findings without recommendations.
- Testing once and calling it validated.

## Sources

- Nielsen Norman Group, "When to Use Which User-Experience Research Methods": https://www.nngroup.com/articles/which-ux-research-methods/
- Nielsen Norman Group, "Interviewing Users": https://www.nngroup.com/articles/interviewing-users/
- Nielsen Norman Group, "How Many Test Users in a Usability Study?": https://www.nngroup.com/articles/how-many-test-users/
- Nielsen Norman Group, "Affinity Diagramming": https://www.nngroup.com/articles/affinity-diagram/
