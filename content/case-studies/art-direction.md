---
title: "Art Direction"
shelf: craft
summary: "How I set a visual direction for a project, get the client to agree to it, and keep a team on it through to launch."
order: 10
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/art-direction.webp"
---

People sometimes think art direction is about taste. Taste helps, but on agency projects the job is mostly about decisions: picking a direction, explaining it well enough that a client agrees, and then making sure five different people produce work that looks like it came from one hand.

In traditional advertising, the art director owns the visual side of a campaign, usually paired with a copywriter who owns the words, with a creative director overseeing both. In my role as Assistant Creative Director at a digital agency, the shape is similar. I set the visual direction for websites and apps, review the team's work against it, and help the creative lead keep projects consistent.

## What art direction covers on a digital project

On a website or app, the direction has to answer more than "what does it look like." I try to pin down:

- **Mood**: how should it feel? Calm and trustworthy for a bank. Warm and appetizing for a café. Premium and quiet for a hotel.
- **Color**: primary palette, accent, neutrals, and how much of each.
- **Type**: headline and body faces, scale, and how expressive the headlines get.
- **Imagery**: photography style, crop, lighting, whether people appear, illustration or 3D.
- **Shape and space**: corner radius, density, how much whitespace.
- **Motion**: how things enter, how fast, how playful.

Every one of these ends up as a design decision in Figma. That's why I think of art direction as the step before the design system, not something separate from it.

## Step one: words before pictures

Before collecting a single image, I agree on a short list of mood words with the client and the team. Nielsen Norman Group suggests picking four or five words that capture the vibe, and using synonyms to sharpen them. I find that's the right size. Fewer is vague, more starts contradicting itself.

The words come from the brief, from stakeholder interviews, and from whatever research we've done. "Modern" and "clean" don't count. Everyone says those. I push for words that would actually rule something out, like "unhurried", "clinical" or "playful".

## Step two: mood boards

Mood boards are how I make the words visible. NN/g describes them as collages that show the feelings or values a product should evoke, which is exactly why they work with clients. You don't need design training to react to a board.

How I build them:

1. **Review what exists.** Brand guidelines, previous campaigns, the current site. I'm not throwing away equity the client already has.
2. **Collect widely.** Photography, packaging, interiors, editorial layouts, film stills. Not just other websites.
3. **Arrange with hierarchy.** One or two hero images, grouped supporting pieces, room to breathe.
4. **Make more than one.** Usually two or three boards, each a clear and different direction.
5. **Annotate.** A line or two per board on what it's saying and why.

I usually build these in Figma or FigJam so they sit next to the design file and the team can comment directly.

> A mood board isn't a feature list. If it's full of competitor screenshots, it's a reference board, and it'll pull the conversation toward features instead of feeling.

That point comes straight from NN/g's guidance, and it's the most common mistake I see from junior designers. The other two: mixing contradictory moods on one board, and boards with no hierarchy, where every image is the same size and nothing leads.

## Step three: style tiles and a sample screen

Once the client picks a direction, I translate it into something closer to the product. Usually that's a style tile (colors, type, buttons, a card, an image treatment) and then one key screen, like the homepage hero or the main app dashboard.

This is where direction meets reality. A palette that felt great on a board might fail contrast checks on a button. A headline face that looked elegant might fall apart at mobile sizes. Better to find out on one screen than on forty.

## Step four: turn the direction into rules

Direction that only lives in my head doesn't scale. So once the key screen is approved, the direction becomes:

- **Variables** for color, spacing and radius, so the palette is applied the same way everywhere.
- **Text styles** for the type scale.
- **Components** that carry the shape language.
- **A short do/don't page** in the file for imagery, with examples of good and bad crops.

This is the bridge between art direction and design systems, and it's where my Figma work pays off. A designer who joins the project halfway through can open the file and see what "on direction" means.

## Keeping a team on direction

Most of my art direction time isn't spent creating the direction. It's spent reviewing work against it. A few habits that help:

- **Review early, not only at the end.** A quick look at a half-finished screen is easier to correct than a polished one.
- **Point to the rule, not my preference.** "This image is too busy for the calm direction we agreed" lands better than "I don't like it."
- **Keep the board visible.** I pin the approved board at the top of the design file.
- **Allow evolution, on purpose.** Directions do change once real content arrives. When that happens, I update the rules so everyone moves together.

## Where 3D and AI fit in

I also work in Blender, and 3D has become a useful part of the direction on some projects: product renders, hero visuals, or a consistent object style that photography can't give you. The same rules apply. The lighting and materials have to match the mood words.

I've also built a Claude Skill for art direction that helps me generate mood word options, critique a board against a brief, and draft the rationale for a client deck. It speeds up the writing and the exploration. The decisions are still mine and the team's.

## Common mistakes

- **Presenting one direction.** The client has nothing to compare it to, so feedback becomes vague.
- **Too many directions.** More than three, and the meeting turns into picking favorite images.
- **Skipping the rationale.** A board without the "why" gets judged on personal taste.
- **Not checking against real content.** Directions built on stock photography break when the client's actual photos arrive.

## Sources

- Nielsen Norman Group, "Mood Boards in UX": https://www.nngroup.com/articles/mood-boards/
- Wikipedia, "Art director": https://en.wikipedia.org/wiki/Art_director
- Figma Best Practices, "Components, styles, and shared libraries": https://www.figma.com/best-practices/components-styles-and-shared-libraries/
