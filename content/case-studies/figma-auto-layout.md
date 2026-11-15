---
title: "Figma Auto Layout"
shelf: craft
summary: "How I set up auto layout so frames resize themselves, and why it's the first thing I check when a file starts falling apart."
order: 7
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/figma-auto-layout.webp"
---

Auto layout is one of the Figma features I rely on most, and it is the first thing worth checking when you open a file from someone else.

Figma describes it as a way to arrange objects inside a frame so their positions update as you add, remove or reorder them ([Figma](https://help.figma.com/hc/articles/31289464393751)). A simple way to think about it is turning a drawing into a set of rules. Once the rules are right, the design stays tidy by itself.

## Content changes, so the layout has to cope

Websites and apps for different industries share one problem: the content keeps changing. A hotel adds a room type. A university renames a program and the title gets twice as long. A legal team rewrites a disclaimer the day before a review.

Without auto layout, each change means manual cleanup. With it, you edit the text and the card, the section and the page adjust. That time goes back into design decisions.

It also helps at handoff. Auto layout is close to how developers build layouts in CSS. Gap, padding, direction and alignment are words a front-end team already uses. When frames behave like flexbox, the build matches the design more closely and there are fewer "why is this 13px here?" questions.

## The properties that do most of the work

An auto layout frame has three flows:

- **Vertical** stacks children on the y-axis: lists, feeds, form fields, page sections.
- **Horizontal** places children on the x-axis: button rows, nav bars, icon and label pairs.
- **Grid** gives columns and rows, and children can span cells. It suits galleries and bento layouts.

Horizontal and vertical flows can also **wrap**. Children move to a new row when space runs out, which suits tag and chip groups.

Inside each flow, a few controls matter most:

1. **Gap** is a fixed number or **Auto**. Auto spreads the children out across the frame, like CSS `space-between`.
2. **Padding** can be uniform, per axis or per side.
3. **Resizing** is set on each child: **Hug contents**, **Fill container** or **Fixed**. Hug wraps around the content. Fill takes the space the parent gives it.
4. **Min and max width or height** is the one people skip. A card can fill its container but stop at a readable width. A button can hug its label but never get smaller than a tap target.
5. **Ignore auto layout** keeps a layer in the frame but takes it out of the flow. It is useful for pinning a badge to a corner or placing a close icon.

Two smaller settings are worth knowing: whether strokes count in the layout, and the stacking order when children overlap.

## Building a component from the inside out

Take a product card for a retail site.

1. Start with text. Title and price go in a vertical auto layout with a small gap. The title fills the width, so a long name wraps and does not stretch the card.
2. Put the text block and the add-to-cart button in another vertical frame with padding. This is the card body.
3. Put the image and the body in the outer card frame. The image fills the width and keeps a fixed aspect ratio.
4. Set the card to fill its container, with a min and max width.

Then stress test it. Paste in the longest product name you can find, delete the price, swap in a tall image, and drag the frame narrow and wide. If something breaks, the rule is wrong. The content is fine.

> If a layout only works with the placeholder text, it doesn't work.

## Mistakes that show up often

- **One giant frame.** Selecting a whole screen and pressing `Shift+A` works, but you get one flat stack that is hard to control. Nest small frames inside bigger ones, each with one job.
- **Mixing up hug and fill.** If a parent hugs and its child fills, neither knows who sets the size. Decide which layer owns the width, then build outward from there.
- **Spacer rectangles.** An invisible 24px box between two elements means the gap or padding is not set up. It also confuses developers reading the layer tree.
- **Hiding layers to keep space.** Hidden layers leave the flow. Setting opacity to 0% holds the space, but usually the gap needs another look.
- **Strokes.** If spacing looks slightly off in nested frames, check whether each frame includes strokes in the layout. The setting is per frame.
- **Detaching instances to reorder things.** You can't reorder children inside an instance. If you keep needing to, the main component needs a different structure, or a slot.

## A short checklist for reviewing a file

When reviewing a teammate's file, a few questions catch most problems:

- Can the frame be resized without anything overlapping?
- Does spacing come from gap and padding, and not from manual positioning?
- Do the values come from the spacing scale, ideally bound to variables?
- Do the frames have real names, like `card/body`, and not `Frame 427`?

For teaching, handing someone a component that breaks when the content changes and asking them to fix it works better than explaining every property first. Fixing something sticks better than reading a list of settings.

## It sits under the rest of the Figma work

Components only work well when they are built on solid auto layout. Variables only pay off when gap and padding are bound to spacing tokens. Prototypes feel more real when frames reflow as the content changes.

If you could teach one Figma feature to someone new on the team, this would be a strong pick.

## Sources

- Figma Learn, "Guide to auto layout": https://help.figma.com/hc/articles/31289464393751
- Figma Learn, "Explore auto layout properties": https://help.figma.com/hc/en-us/articles/360040451373
