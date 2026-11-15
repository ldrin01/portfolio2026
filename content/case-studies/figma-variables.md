---
title: "Figma Variables"
shelf: craft
summary: "How I use Figma variables to drive color, spacing and light/dark modes, so one change updates the whole design."
order: 9
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/figma-variables.webp"
---

Variables are the closest Figma gets to the way developers think. Instead of picking a hex code every time, you pick a named value like `surface/primary` or `space/md`. That name can have a different value depending on context.

Figma's own definition is that [variables store reusable values that can change depending on the context of a design](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes). Light and dark mode is the usual example, but it is only the start.

## Why variables are worth using

Agency projects span industries like education, banking, hospitality and retail. Some need dark mode. Some need more than one brand look. Almost every project has a color change at some point after the client sees the first designs.

Before variables, a palette change meant updating styles and checking every screen. Theming meant duplicating frames. With variables, a value changes once and every layer using it updates. Switching a frame between light and dark is one setting.

Handoff gets easier too. When a developer inspects a layer and sees `color/text/primary` instead of `#1A1A1A`, they know which token to use.

## The building blocks

Figma has six variable types:

- **Color:** solid fills, with optional opacity.
- **Number:** spacing, radius, sizes, font sizes.
- **String:** text content, such as labels in different languages.
- **Boolean:** true or false, useful for showing and hiding layers.
- **Timing:** durations, for prototype animation.
- **Easing:** easing curves or springs.

Variables live in **collections**, and each collection can have **modes**. A mode holds one value for every variable in that collection. A `Theme` collection can have `Light` and `Dark` modes, and every color in it has a value for each. Modes are available on Figma's paid plans, and how many you get depends on the plan.

Inside a collection, **groups** keep things tidy.

## Two layers: primitives and semantics

This is a good structure to start with on almost any project, and the one thing worth telling anyone new to variables.

1. **Primitives:** raw values with no meaning attached, like `blue/500`, `gray/100` and `space/16`. One collection, one mode.
2. **Semantic tokens:** names based on purpose, pointing to primitives, like `color/surface/default`, `color/text/muted` and `color/border/focus`. This collection has the modes.

**Aliasing** means a variable points to another variable of the same type. So `color/surface/default` can point to `gray/0` in Light mode and `gray/900` in Dark mode. Designers apply only the semantic tokens, and the primitives can be hidden from publishing so nobody picks `blue/500` directly.

> Name a variable for what it does, not what it looks like. `text/muted` survives a rebrand. `gray-dark` does not.

## Settings worth filling in for every variable

These are in the [edit variable panel](https://help.figma.com/hc/articles/15145852043927). They make a library much easier to use.

- **Scoping:** limits which properties a variable shows up for. Spacing numbers appear for gap and padding, and not for opacity or font size.
  - It works for number, color and string variables.
  - It only filters the pickers in Figma's UI. It does not stop someone from binding the variable somewhere else.
- **Code syntax:** sets the name developers see in Dev Mode snippets, with a field for Web, Android and iOS.
- **Descriptions:** one line on when to use the token.
- **Hide from publishing:** for primitives and internal helpers.

## How modes behave

This part confuses people at first. By default, layers with variables are set to **Auto**, which means they take the mode of their parent. If the parent is also Auto, Figma keeps checking up the tree. If nothing sets a mode, it uses the collection's default. The full rules are in Figma's page on [modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383).

So the mode can be set once on the page or top-level frame, and everything inside follows. To show a dark version of a screen, duplicate the frame and switch its mode. There are no duplicated components and no second set of styles.

Prototypes can switch modes too, with the **Set variable mode** action, which makes a working light and dark toggle possible for client reviews.

## Multi-brand projects

Some clients have several sub-brands or properties, like a hotel group. Figma has [extended collections](https://help.figma.com/hc/en-us/articles/36346281624471) for this: a parent collection that each brand extends, overriding only the values that differ. The extensions stay linked to the parent.

Where extended collections are not available, the brands can live as modes in the semantic collection. It is less neat, but it works for most agency-sized projects.

## Common mistakes

| Mistake | What goes wrong | What helps |
| --- | --- | --- |
| Skipping the semantic layer | Dark mode needs a full rework later | Apply only semantic tokens to designs |
| Too many tokens too early | A 400-token system for a five-page site is overhead nobody will maintain | Start with the tokens the design uses, add more when patterns repeat |
| Inconsistent naming | Developers use these names in code, so a messy structure spreads | Pick one structure, like `category/role/state`, and keep to it |
| Not binding spacing | Colors get variables but gaps and padding stay raw numbers, so the scale drifts | Bind auto layout gap and padding to number variables from the start |
| Forgetting to check both modes | Problems show up after publishing | Review every new component in light and dark first |

## A good order of work when a project needs dark mode

Primitives first. Then semantic tokens with Light and Dark modes. Then components built only with semantic tokens. By the time screens are designed, switching modes is mostly a check. The edge cases to look for are images and illustrations, because variables do not change those.

This is why variables are worth the setup. They move the hard decisions to the start of a project, when they are cheap, and away from the end, when they are not.

## Sources

- Figma Learn, "Overview of variables, collections, and modes": https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes
- Figma Learn, "Create and manage variables": https://help.figma.com/hc/articles/15145852043927
- Figma Learn, "Modes for variables": https://help.figma.com/hc/en-us/articles/15343816063383
- Figma Learn, "Extended collections": https://help.figma.com/hc/en-us/articles/36346281624471
