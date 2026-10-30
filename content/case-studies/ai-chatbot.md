---
title: "AI Chatbot"
shelf: work
summary: "Designing a support chatbot: what it answers, how it admits what it doesn't know, and when it hands over to a person."
order: 4
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/ai-chatbot.webp"
---

Over the past couple of years, "can we add an AI chatbot?" has become a standard line in client briefs. I hear it from education, hospitality, financial services and retail clients. The request is almost always framed as a feature. In practice, a support chatbot is a service design problem with a chat window on top.

This piece covers how I design one: what it should answer, how it behaves when it's wrong, and the handover to a human, which is the part that matters most.

## Context

Most clients who ask for a chatbot have the same pain. Their support team answers the same questions every day: opening hours, requirements, pricing, booking changes, "where is my order." They want those answered instantly, at any hour, without hiring more people.

That's a fair goal. The risk is that the chatbot becomes a wall between customers and the company. Gartner's 2024 survey of 5,728 customers found that 64% would prefer companies didn't use AI for customer service, and 53% would consider switching to a competitor if they found out a company was going to. The top concern was that AI would make it harder to reach a person.

So the brief I write back is different from the one I receive. It isn't "add a chatbot." It's "answer the easy questions faster, and make the hard ones easier to get to a human."

> People don't hate chatbots. They hate being stuck with one.

## The problem

Nielsen Norman Group's research on chatbots puts the core issue plainly: bots do fine when users follow the expected path, and struggle as soon as people deviate, skip steps or phrase things in unexpected ways. Recovery is often poor, so users end up starting over. The same research found that people saw bots as less helpful than humans, but faster, because there's no queue.

Large language models make the bot better at understanding messy phrasing, but they add a new failure mode: confident answers that are wrong. Google's People + AI Guidebook calls this out directly. Users judge errors against their expectations, and the stakes vary a lot. A wrong answer about a café's opening hours is annoying. A wrong answer about a loan requirement or a hotel cancellation policy can cost someone money.

## Designing the scope first

Before any chat UI, I run a scoping exercise with the client and their support team. We sort real questions into three buckets:

- **Answer.** Common, low-risk questions with a clear source of truth: hours, locations, requirements, how-to steps, order status.
- **Assist.** Questions where the bot can collect details and prepare the case, but a person decides: refunds, complaints, account changes.
- **Hand over immediately.** Anything sensitive, emotional or high-stakes: payment disputes, legal or medical topics, safety issues, or anyone who just says "agent."

That third list is the most important design artefact in the project. It's what stops the bot from improvising in areas where it shouldn't. NN/g's guidance points the same way: limit scope to simple, well-defined tasks, and say clearly what the bot can do.

## Designing the conversation

With the scope agreed, the conversation design follows a few rules I keep coming back to.

**Say it's a bot, and say what it does.** The opening message names the assistant as automated and lists a few things it can help with, as tappable suggestions. NN/g found that when users knew they were talking to a bot, they wrote more directly and in simpler terms, which actually worked better.

**Offer buttons and free text.** Suggested replies help people who don't know what to ask. Free text helps people who do. Every button has to look and behave like a button.

**Remember what people already said.** Asking for an order number twice is the fastest way to lose trust. If someone gave their booking reference three messages ago, the bot uses it.

**Admit when it doesn't know.** "I'm not sure about that one" with a next step is better than a confident guess. PAIR recommends explaining limitations specifically, suggesting alternatives and making it easy for users to take back control.

**Show the source.** For answers drawn from policies or help articles, I link the original page. It lets people check the answer, and it gives the client a way to spot outdated content.

## Designing the handover

This is where I spend the most time, because it's where most chatbots fail.

The rule is simple: a person should never have to fight the bot to reach a human. In practice, that means:

- **A visible "Talk to a person" option** in the chat header at all times, not hidden behind three failed attempts.
- **Automatic handover triggers:** repeated "I didn't understand" responses, negative sentiment, anything on the hand-over list, or a direct request.
- **No starting over.** The agent receives the full conversation and any details the bot collected. Gartner's recommendation is the same: tell customers when they'll be connected to a person, and let the agent pick up where the bot left off.
- **Honest wait expectations.** If no agent is online, say so, give the support hours and offer a callback, email or ticket, so the request doesn't disappear.

I design the agent's side too. A short summary card at the top of the handed-over chat (topic, details collected, what the bot already tried) saves the agent from reading the whole thread, and saves the customer from repeating themselves.

## Designing for failure

Every chatbot will get things wrong, so I design those states as deliberately as the happy path:

- A "Was this helpful?" control on answers, with a quick reason when someone says no. This feeds the content team, not just the model.
- A clear fallback message that offers rephrasing, related topics and a human.
- Guardrail responses for off-topic or abusive messages that stay polite, keep the brand voice and don't over-explain how the system works. PAIR describes this as making failure "safe and boring."

Microsoft's guidelines for human-AI interaction are organised the same way: what to do on first contact, during the interaction, when the AI is wrong, and over time. That framing is a useful checklist in design reviews.

## Trade-offs

- **Coverage vs. trust.** A bot that tries to answer everything will answer some things badly. A narrower bot that hands over well usually earns more trust.
- **Personality vs. clarity.** A friendly, branded voice is good, but it should never get in the way of a clear answer. If the bot has a personality, it has to stay consistent, including in error messages.
- **Deflection vs. resolution.** It's tempting to measure success by how many chats never reached an agent. I push clients to measure resolved questions instead, because a deflected but unresolved customer just comes back angrier, or doesn't come back.

## What I'd do next

- **Review real transcripts weekly in the first months.** The questions people actually ask are always different from the ones in the kickoff spreadsheet.
- **Treat the knowledge base as part of the product.** Most bad answers trace back to outdated or missing help content, so the content workflow needs an owner.
- **Test the handover with real support staff,** not just the customer side. If the agent experience is clumsy, the whole thing falls apart at the most important moment.

A good support chatbot isn't the one that never hands over. It's the one that knows exactly when to.

## Sources

- Nielsen Norman Group, The User Experience of Chatbots: https://www.nngroup.com/articles/chatbots/
- Gartner survey on AI in customer service (July 2024), as reported by Insurance-Canada.ca: https://insurance-canada.ca/2024/07/15/gartner-survey-ai-for-customer-service/
- Google People + AI Guidebook, Errors and Graceful Failure: https://pair.withgoogle.com/chapter/errors-failing/
- Microsoft HAX Toolkit, Guidelines for Human-AI Interaction: https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/
