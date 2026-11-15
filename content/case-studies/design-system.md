---
title: "Design System"
shelf: work
summary: "How I built and maintain one system of tokens and components that designers and developers share, re-themed for each client project."
order: 5
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/design-system.webp"
---

**Role:** Senior UI/UX Designer\
**Work:** A shared design system of tokens and components, used across agency projects and re-themed per client\
**Under NDA:** Industry only, no client names

Most design system case studies come from product companies with one brand, one product and a dedicated team. I work at an agency. In one quarter we can design for a university, a hotel group, a restaurant chain and a logistics company, and each has its own brand and deadline. So the goal is not one perfect brand system. It is a shared base that every project can start from.

## Starting from a blank file costs time

Without a shared system, each project starts from a blank file or a copy of the last project. Designers rebuild the same buttons, form fields and cards. Developers get files where one grey has five slightly different values. Handover turns into a debate about which spacing is "right."

That happens when a small team moves fast across many clients. It still means time goes to parts that should be solved once, and less to what makes each project different.

Nielsen Norman Group defines a design system as a complete set of standards for managing design at scale, built from reusable components and patterns ([NN/g](https://www.nngroup.com/articles/design-systems-101/)). Figma ran its own experiment and reported that designers with a design system finished a task 34% faster than without one. Figma points out that the system in the test was directly relevant to the task, so 34% is a best case, and it comes from a company that sells design tools ([Figma](https://www.figma.com/blog/measuring-the-value-of-design-systems/)).

## Separate what changes from what stays

A system takes time and people to build and maintain, and the payoff comes later. For an agency the real question is how to build one system when every client looks different. The answer is to split the two lists.

| Changes per client | Stays the same |
| --- | --- |
| Colour | How a form field behaves |
| Typography | Component states |
| Corner radius | Spacing logic |
| Imagery | Accessibility rules |
| Tone of voice | How a modal or navigation drawer works |

If the second column is solid, the first column is just a theme.

## Tokens come first

The system is built on design tokens: named values for colour, type, spacing, radius and elevation. A common way to set them up is in layers:

1. **Primitives.** The raw palette and scales, like `blue-500`, `space-4` and `radius-md`. These change completely per client.
2. **Semantic tokens.** Named by role, like `color-background`, `color-text-muted` and `color-action-primary`. Components only use these.
3. **Component tokens.** Used sparingly, for the few cases where one component needs its own value.

IBM's Carbon design system follows the same idea. It documents its colour tokens by role, so a designer picks "text primary" and not a hex code ([Carbon](https://carbondesignsystem.com/elements/color/tokens/)).

> A button should never know it's blue. It should only know it's the primary action.

In Figma this maps well to variables and modes. Primitives sit in one collection and the semantic tokens point to them. Moving a project to a new client means remapping the semantic layer to a new palette, and no component changes. A dark theme works the same way, as another mode on the semantic layer.

## One set of names for design and code

A token only helps if developers use the same name. Agreeing the names with the front-end team before anything goes into Figma means design files and CSS variables use one convention.

The standard for this has caught up. On 28 October 2025 the W3C Design Tokens Community Group published the first stable version of its specification, 2025.10. It is a vendor-neutral format for sharing design decisions between tools, and many tools and organisations are already implementing it ([W3C Design Tokens Community Group](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)). It is a community group specification, not a W3C Standard. For an agency, tokens in an open format are not tied to one tool or one client's stack.

## Components and documentation

On top of the tokens sit the components. A useful grouping:

- Buttons, links and icon buttons
- Form fields, selects, checkboxes, radios and validation states
- Cards, lists and tables
- Navigation: header, footer, mobile menu, tabs, breadcrumbs
- Feedback: alerts, toasts, modals, empty and loading states

Every component needs all its states designed: default, hover, focus, active, disabled, error and loading. Missing states are where most handover questions come from. Checking focus states and contrast at the token level helps too, because a client palette that fails contrast shows up before it reaches a screen.

Documentation works best when it stays short: when to use a component, when not to, and a do and don't pair. I mentor junior designers, and short guidelines help there, because new people learn the standards by using them.

## Where AI fits

I build custom Claude Skills for design work, and one of them is for the design system. The repetitive part of maintenance is a good fit for AI, since keeping documentation, naming and tokens in sync is usually the first thing to fall behind on a busy team. Design decisions stay with people.

## Trade-offs

| Choice | What it gives | What it costs |
| --- | --- | --- |
| Allow project-level components | Room for client needs | A risk of one-off parts. If the same need shows up twice, it belongs in the shared system |
| Share a base across projects | Speed on the parts that should match | Projects can start to look alike. Layout, imagery and art direction still need fresh work for each brand |
| Keep the system maintained | Design and code stay in step | Real, ongoing work. It needs an owner and a regular review |

## Where it can go next

- **Use the open token format end to end,** so tokens move from Figma to code through a pipeline and not by hand.
- **Track usage,** to see which components get used, detached or overridden, and fix the ones people keep working around.
- **Add page templates** for common project types like booking flows, listing pages and dashboards.

For an agency, a design system is a way to solve the same problems once, so there is more time for what makes each client different.

## Sources

- Nielsen Norman Group, Design Systems 101: https://www.nngroup.com/articles/design-systems-101/
- Figma, Measuring the value of design systems: https://www.figma.com/blog/measuring-the-value-of-design-systems/
- IBM Carbon Design System, Color tokens: https://carbondesignsystem.com/elements/color/tokens/
- W3C Design Tokens Community Group, Design Tokens specification reaches first stable version: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
