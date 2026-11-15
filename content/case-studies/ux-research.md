---
title: "UX Research"
shelf: craft
summary: "How I pick the right research method on agency timelines, and turn interviews, surveys and tests into decisions on the screen."
order: 11
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/ux-research.webp"
---

At an agency, research rarely looks like the textbook version. There is often no research team, the timeline was agreed before anyone asked what users need, and the budget is tight. Skipping research does not save time. The cost just moves to the end, when the client sees the build and says "this is not how our customers work."

So research has to fit the project. Here is how that can work.

## Start with the question, then pick the method

The most common mistake is choosing a method first. "Let's do a survey" comes before anyone has said what the team wants to learn.

Nielsen Norman Group (NN/g) sorts methods along three dimensions ([Nielsen Norman Group](https://www.nngroup.com/articles/which-ux-research-methods/)):

- **Attitudinal or behavioral:** what people say versus what people do.
- **Qualitative or quantitative:** qualitative answers "why" and "how to fix." Quantitative answers "how many" and "how much."
- **Context of use:** whether people use the product naturally, follow a script, see a limited version, or do not use it at all.

It also ties methods to the stage of the project:

| Stage | Goal | Methods |
| --- | --- | --- |
| Early | Find direction | Interviews, field studies, diary studies, surveys, concept testing |
| During design | Improve it | Card sorting, tree testing, usability testing |
| After launch | Measure it | Benchmarking, analytics, A/B tests, surveys |

A simple habit is to write down the two or three questions that need answers and check which stage the project is in. The method is usually clear after that.

## Stakeholder interviews come first

On most projects, research starts with the client. Requirement gathering with stakeholders and system analysts gives the business goals, the constraints and who the users are supposed to be.

It also shows the assumptions. A team may be sure that students care most about program listings, or that bank customers want more features in the app. Those are the things to test with real users.

## Talking to users

When users can be reached, interviews are the main tool. A few rules of thumb:

- **Ask about specific past events.** NN/g advises prompting memory with particular incidents instead of general processes ([Nielsen Norman Group](https://www.nngroup.com/articles/user-interviews/)). "Tell me about the last time you booked a hotel room" works better than "How do you usually book hotels?" The second question gets an idealized answer.
- **Do not lead.** People will form an opinion about almost anything if you ask. Pushing for answers creates opinions they did not have.
- **Do not ask them to design.** Interviews are poor for choices like menu types or button colors. They are also poor for predicting whether people would use a feature that does not exist yet.

> Listen to what users say about their lives. Watch what they do with the design. Keep the two apart.

When an app has more than one kind of user, like a trucking app with customers and drivers, each group should be interviewed separately. Their goals and context are different, and one group cannot speak for the other.

## Surveys

Surveys are cheap and give numbers, which makes them easy to overuse. A few rules:

1. Use them for "how many," not "why." Interviews explain. Surveys measure.
2. Keep them short. Every extra question lowers completion and quality.
3. Ask about behavior and facts where possible, not hypothetical preferences.
4. Try the survey on two or three people before sending it. Confusing questions show up fast.

## Testing the design

Usability testing is where research turns into design changes. NN/g's well-known advice is that five users in a qualitative test find most of the usability problems, and that adding more gives less and less. Quantitative studies need far more people, and NN/g recommends at least 20 ([Nielsen Norman Group](https://www.nngroup.com/articles/how-many-test-users/)).

That advice assumes you test, fix and test again. Several small rounds beat one big round. If there are different user groups, each group needs its own participants.

A version that fits an agency timeline is simple: a few people, a clickable Figma prototype, three to five realistic tasks, and a quick round of fixes before the next review.

## Making sense of the notes

Raw notes do not change a design. Synthesis does. Affinity diagramming, usually in FigJam, is a good way to do it:

1. Everyone writes notes alone first, one observation or quote per sticky. Working alone first reduces groupthink.
2. Cluster related notes and give each cluster a clear theme.
3. Keep the small clusters. An outlier can be the most interesting finding.
4. Decide what to do with each theme: a design change, an open question, more research, or no action. Give each one an owner.

Having the developers in the room for the clustering helps them see why a decision was made.

## From findings to screens

This is the step that gets lost most often. A deck full of insights that nobody acts on is wasted effort. So each finding should be tied to something concrete:

- A **user journey document** that shows where problems happen.
- **Design principles** for the project, written from the findings.
- **Screen changes**, with the finding noted in the Figma file next to the design.

When a client pushes back on a decision, pointing to what users did is stronger than arguing from opinion.

## Where AI helps

I build Claude Skills for UX research and for user journey documents. They help get a first draft faster, which matters on agency schedules. Everything still needs to be checked against the source notes. A summary that sounds right but misquotes a user is worse than no summary.

## Common mistakes

- Running research after the design is approved.
- Treating stakeholder opinions as user research.
- Recruiting only friendly or internal users.
- Reporting findings without recommendations.
- Testing once and calling it validated.

Good research on a small budget is mostly a matter of asking a clear question and acting on the answer.

## Sources

- Nielsen Norman Group, "When to Use Which User-Experience Research Methods": https://www.nngroup.com/articles/which-ux-research-methods/
- Nielsen Norman Group, "User Interviews 101": https://www.nngroup.com/articles/user-interviews/
- Nielsen Norman Group, "How Many Test Users in a Usability Study?": https://www.nngroup.com/articles/how-many-test-users/
