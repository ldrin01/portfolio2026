---
title: "AI Chatbot"
shelf: work
summary: "Designing a support chatbot: what it answers, how it admits what it doesn't know, and when it hands over to a person."
order: 4
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/ai-chatbot.webp"
---

**Role:** Senior UI/UX Designer\
**Focus:** Support chatbots: scope, conversation design and the handover to a person\
**Under NDA:** Client work is described by industry only, no names

"Can we add an AI chatbot?" is now a normal line in a project brief. It is usually asked as if it were one feature. It is closer to a service design problem with a chat window on top.

This piece is about three decisions that matter most: what the bot should answer, how it behaves when it is wrong, and how it hands over to a human.

## Clients want the easy questions answered fast

Most support teams answer the same questions every day: opening hours, requirements, prices, booking changes, "where is my order." Businesses want those answered at any hour without hiring more people.

That is a fair goal. The risk is that the bot becomes a wall between the customer and the company. Gartner surveyed 5,728 customers in late 2023. 64% said they would prefer that companies did not use AI for customer service, and 53% would consider switching to a competitor if they found out a company was going to. The most common worry, at 60%, was that it would get harder to reach a person ([Gartner](https://www.gartner.com/en/newsroom/press-releases/2024-07-09-gartner-survey-finds-64-percent-of-customers-would-prefer-that-companies-didnt-use-ai-for-customer-service)).

So the brief is better written as "answer the easy questions faster, and make the hard ones easier to bring to a human."

> A chatbot is fine until the customer cannot reach a person.

## Bots break when people go off the path

Nielsen Norman Group's research found that chatbots work smoothly when users follow the expected path, and run into trouble when people step off it ([Nielsen Norman Group](https://www.nngroup.com/articles/chatbots/)). Users also tend to see a bot as less helpful than a person, though it can feel quick because there is no queue.

Large language models handle messy phrasing better. They add a different problem: answers that sound sure and are wrong. Google's People + AI Guidebook says the stakes of an error change with the situation ([Google PAIR](https://pair.withgoogle.com/chapter/errors-failing/)). A wrong opening time for a café is annoying. A wrong loan requirement or hotel cancellation rule can cost someone money.

## Set the scope before any chat screen

A good start is to sit with the client and their support team and sort real questions into three groups:

1. **Answer.** Common, low-risk questions with one clear source of truth: hours, locations, requirements, how-to steps, order status.
2. **Assist.** The bot collects details and prepares the case, and a person decides: refunds, complaints, account changes.
3. **Hand over right away.** Payment disputes, legal or medical topics, safety issues, anything emotional, and anyone who types "agent."

The third list matters most. It stops the bot from guessing in areas where it should not. It also keeps the scope to simple, well-defined tasks, which is what the NN/g research points to.

## Rules for the conversation

- **Say it is a bot, and say what it does.** The first message names the assistant as automated and shows a few tappable examples. NN/g's guidance is to be upfront that the user is talking to a bot.
- **Offer buttons and free text.** Suggested replies help people who do not know what to ask. Free text helps people who do. A button must look and act like a button.
- **Remember what people said.** Asking for an order number twice loses trust fast. If the booking reference came three messages ago, the bot should use it.
- **Admit when it does not know.** "I'm not sure about that one" plus a next step beats a confident guess.
- **Show the source.** For answers from policies or help articles, link the original page. People can check it, and the client can spot old content.

## The handover is where most bots fail

Nobody should have to fight the bot to reach a person. In practice that means:

- A "Talk to a person" option in the chat header at all times, not hidden behind three failed tries.
- Automatic handover after repeated "I didn't understand" replies, after negative sentiment, on anything from the hand-over list, or when the user asks.
- No starting over. The agent gets the whole conversation and the details the bot collected.
- Honest wait times. If no agent is online, the bot says so, shows the support hours, and offers a callback, email or ticket so the request does not vanish.

The agent's side needs design too. A short summary card at the top of the handed-over chat (topic, details collected, what the bot already tried) saves the agent from reading the whole thread. It saves the customer from repeating themselves.

## Plan for the failures

Every chatbot gets things wrong, so those states deserve as much care as the happy path.

- A "Was this helpful?" control on answers, with a quick reason when the answer is no. It feeds the content team, not only the model.
- A fallback message that offers a rephrase, related topics and a human.
- Polite replies for off-topic or abusive messages, in the brand voice, without explaining how the system works.

Microsoft's guidelines for human-AI interaction are grouped by stage: at the start, during the interaction, when the AI is wrong, and over time ([Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)). They work well as a checklist in a design review.

## Trade-offs

| Choice | What it gives | What it costs |
| --- | --- | --- |
| Wide coverage | Fewer questions reach a person | Some answers will be bad |
| Narrow coverage with a good handover | More trust | More chats go to the team |
| Strong personality | A friendly brand voice | Risk of hiding a clear answer |

The narrow bot that hands over well is usually the safer choice. If the bot has a personality, it should stay the same in error messages too. It is also better to measure resolved questions than chats that never reached an agent. A customer who was deflected and not helped comes back angrier, or does not come back.

## Keep it healthy after launch

- **Read real transcripts every week in the first months.** The questions people ask are never quite the ones in the kickoff spreadsheet.
- **Treat the knowledge base as part of the product.** Most bad answers come from old or missing help content, so someone has to own it.
- **Test the handover with real support staff.** If the agent side is clumsy, it breaks at the most important moment.

A good support chatbot knows when to hand over.

## Sources

- Nielsen Norman Group, The User Experience of Chatbots: https://www.nngroup.com/articles/chatbots/
- Gartner, Survey Finds 64% of Customers Would Prefer That Companies Didn't Use AI For Customer Service (July 2024): https://www.gartner.com/en/newsroom/press-releases/2024-07-09-gartner-survey-finds-64-percent-of-customers-would-prefer-that-companies-didnt-use-ai-for-customer-service
- Google People + AI Guidebook, Errors and Graceful Failure: https://pair.withgoogle.com/chapter/errors-failing/
- Microsoft HAX Toolkit, Guidelines for Human-AI Interaction: https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/
