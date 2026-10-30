---
title: "Design System"
shelf: work
summary: "How I built and maintain one system of tokens and components that designers and developers share, re-themed for each client project."
order: 5
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/design-system.webp"
---

Most design system case studies come from product companies: one brand, one product, a dedicated team. My situation is different. I work at an agency, and in any given quarter we might be designing for a university, a hotel group, a restaurant chain and a logistics company, each with its own brand and timeline.

This piece covers how I approach a design system in that setting, where the goal isn't one perfect brand system but a shared foundation that every project can start from.

## Context

Before we had a shared system, every project started from a blank file, or from a copy of the last project with someone else's colours still in it. Designers rebuilt the same buttons, form fields and cards over and over. Developers received files where the same grey had five slightly different values. Handover meetings turned into long conversations about which spacing was "right."

None of this was anyone's fault. It's what happens when a small team moves fast across many clients. But it meant we were spending time on the parts that should be solved once, instead of on the parts that make each project different.

Nielsen Norman Group describes this payoff well: with a design system, designers spend less time on basic visuals and more on complex problems like workflows, and shared terminology cuts miscommunication across teams. Figma's data science team ran a controlled study where designers with access to a design system finished a task 34% faster than without one. Figma notes that the system in the study was up to date and directly relevant, so they treat 34% as an upper bound. Still, it matched what I was seeing.

## The problem

NN/g also gives the honest warning: building and maintaining a system takes time and a dedicated team, and the payoff comes later. A custom system costs more as you customise it. For an agency, that raises a real question. How do you build one system when every client looks different?

My answer was to separate what changes between clients from what doesn't.

- **What changes:** colour, typography, corner radius, imagery, tone of voice.
- **What stays the same:** how a form field behaves, its states, its spacing logic, accessibility rules, how a modal or a navigation drawer works.

If the second list is solid, the first list is just a theme.

## Tokens first

The system is built on design tokens, named values for colour, type, spacing, radius and elevation, set up in layers.

- **Primitives.** The raw palette and scales: `blue-500`, `space-4`, `radius-md`. These change completely per client.
- **Semantic tokens.** Named by role, not appearance: `color-background`, `color-text-muted`, `color-action-primary`, `color-border-subtle`. Components only use these.
- **Component tokens,** used sparingly, for the few cases where one component needs its own value.

This mirrors how IBM's Carbon system organises colour. Carbon names tokens by the UI element and role they apply to, uses suffixes like `-hover`, `-active` and `-disabled` for states, and says component tokens should never be used outside their own component. I borrowed that discipline directly.

> A button should never know it's blue. It should only know it's the primary action.

In Figma, I set this up with variables and modes. Primitives live in one collection; semantic tokens point to them. Switching a project to a new client means remapping the semantic layer to a new palette, not touching a single component. Light and dark mode work the same way: a dark theme is another mode on the semantic layer, which is how I approached a website with dark mode for a content services client.

## Speaking the same language as developers

A token is only useful if developers use the same name. So I align token names with the front-end team before anything goes into Figma, and we keep one naming convention across design files and CSS variables.

The standard for this has caught up. In October 2025, the W3C Design Tokens Community Group released the first stable version of its specification (2025.10). It defines a vendor-neutral format for sharing design decisions between tools, with support for aliases, light and dark modes, brand themes and modern colour spaces. Tools like Style Dictionary, Tokens Studio and Terrazzo serve as reference implementations, and Figma, Penpot, Sketch and others support it or are working on it. For an agency, a shared format means our tokens don't have to be locked to one tool or one client's stack.

## Components and documentation

On top of tokens sit the components. I kept the first version deliberately small:

- Buttons, links and icon buttons
- Form fields, selects, checkboxes, radios and validation states
- Cards, lists and tables
- Navigation: header, footer, mobile menu, tabs, breadcrumbs
- Feedback: alerts, toasts, modals, empty and loading states

Every component has all its states designed (default, hover, focus, active, disabled, error, loading) because missing states are where handover questions come from. Focus states and contrast are checked at the token level, so a new client palette that fails contrast shows up before it reaches a screen.

Documentation is short and practical: when to use a component, when not to, and a do/don't pair. NN/g lists guidelines as a core part of a design system, both to onboard new people and to remind experienced ones. As the person who mentors our junior designers, I've found this is where the system pays off fastest. New team members learn our standards by using them.

## Where AI fits

I also use AI tools in maintaining the system. I've built custom Claude Skills for design system work, which help me draft component documentation, check naming consistency and turn a token set into a starting front-end theme. It doesn't replace design judgement, but it takes care of the repetitive parts of keeping docs and tokens in sync, which is usually the first thing that falls behind on a busy team.

## Trade-offs

- **Flexibility vs. consistency.** Some clients need something the system doesn't have. I allow project-level components, but if the same need shows up twice, it gets promoted into the shared system.
- **Speed vs. distinctiveness.** A shared base risks making every project look the same. Tokens handle the surface, but layout, imagery and art direction still have to be done fresh for each brand. The system speeds up the parts that should be the same, not the whole design.
- **Maintenance is real work.** A system that isn't updated drifts from the code within months. It needs an owner and a regular review, not just a launch.

## What I'd do next

- **Adopt the DTCG format end to end,** so tokens go from Figma to code through a pipeline instead of by hand.
- **Add usage tracking,** so we can see which components get used, detached or overridden, and fix the ones that keep getting worked around.
- **Grow the pattern library** beyond components: page templates for common project types like booking flows, listing pages and dashboards.

For an agency, a design system isn't about making every project look alike. It's about solving the same problems once, so the team has more time for what makes each client different.

## Sources

- Nielsen Norman Group, Design Systems 101: https://www.nngroup.com/articles/design-systems-101/
- Figma, Measuring the value of design systems: https://www.figma.com/blog/measuring-the-value-of-design-systems/
- IBM Carbon Design System, Color tokens: https://carbondesignsystem.com/elements/color/tokens/
- W3C Design Tokens Community Group, Design Tokens specification reaches first stable version: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Design Tokens Community Group: https://www.designtokens.org/
