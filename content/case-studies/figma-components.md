---
title: "Figma Components"
shelf: craft
summary: "How I build components and variants that stay flexible as a product grows, without turning the library into a maze."
order: 8
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/figma-components.webp"
---

Figma describes [components](https://help.figma.com/hc/en-us/articles/5579474826519) as elements you can reuse across your designs. Edit the main component and every instance updates. That part is easy.

The hard part is building components that the rest of the team can use without detaching them. They also need to still make sense six months later, when the client asks for a new feature.

## Why a good library matters

At an agency the products change a lot: hotels, universities, an exam review center app. Each one needs its own component set, and each one gets handed to developers and to other designers.

A good library means a new designer can build a page that looks right on the first try. A bad one means every page is a little different, and QA becomes a hunt for buttons that don't match.

## Start small, then nest

Small "atom" components nested inside bigger ones mean a shared change happens once. A simple build order:

1. **Base pieces:** icon, avatar, badge, input field, button.
2. **Composed pieces:** a search bar is an input plus a button. A list item is an avatar, text and a badge.
3. **Patterns:** cards, navigation, modals, table rows.

Everything uses auto layout, so it resizes with its content. If a component only looks right at one width, it is not finished.

It also helps to turn repeated elements into components early, even in wireframes. If a card shows up on three screens, it should be a component before the fourth is drawn.

## Pick the right property

Figma has five kinds of component property. Choosing between them is most of the skill.

| Property | Use it for |
| --- | --- |
| **Variant** | Things that change the form: state, size, type |
| **Boolean** | Showing or hiding a layer. It only controls visibility |
| **Instance swap** | A nested instance people can replace, like the icon in a button |
| **Text** | Text people can edit from the properties panel |
| **Slot** | A flexible area where people add their own content without detaching |

A boolean is the right tool for an optional element, instead of a variant for every combination. A button with or without an icon is one boolean. It does not double the variants.

It also helps to keep one variant property per kind of change, like `Type` and `Size`, instead of one property that changes several things. The variant grid stays readable, and it is clear which combinations exist.

> Every variant is something someone has to maintain. Add a property for a real difference, not for every screen you have drawn.

## Slots for flexible containers

Before slots, a flexible component was a workaround. You made a card with a placeholder instance and hoped people swapped it correctly. Often they just detached it.

A [slot](https://help.figma.com/hc/en-us/articles/38231200344599) is an open area inside a component, like a modal body or the content area of a card. Designers can add layers straight into the slot on an instance and arrange them as they need, and slots can be published to libraries with the rest of the component. Preferred instances can be set so the slot suggests the right components first. They are a hint, and the designer is not locked to them.

For repeating content, like a list of form fields or menu items, a slot is usually cleaner than separate variants for 3, 4 and 5 items.

## Make the library easy to use

A component is only as good as the next person's ability to understand it. A short checklist:

- **Expose nested instances,** so people can change a nested button from the top-level instance.
- **Set preferred instances** on swap properties. The icon picker then shows the icon set, not the whole library.
- **Write descriptions.** They help people pick between similar components.
- **Name text layers the same way** across related components. Text overrides then carry over when someone swaps an instance.
- **Hide internal pieces.** A `_` or `.` prefix keeps a component out of the published library.

## Common mistakes

**The variant explosion.** A button with five types, three sizes, four states and an icon toggle, built only as variants, is 120 frames. Most of that should be booleans and instance swaps.

**Detaching as a habit.** When designers detach often, the component is giving feedback. The better move is to ask what they needed and fix the main component.

**Building for the mockup.** A component that only handles today's copy breaks when real content arrives. Test with long text, missing images and empty states.

**No owner.** Each library should have one person who owns it, and changes go through that person. Otherwise two designers fix the same thing in two different ways.

## What good looks like at handoff

On a typical project the library starts small in wireframes and gets richer through UI design. By handoff, a developer should be able to look at a screen, see which components and properties it uses, and match them to their own components.

That is where the setup pays off. When a new page is requested late in a project, the team can build it from existing pieces, and it already matches the rest.

## Sources

- Figma Learn, "Explore component properties": https://help.figma.com/hc/en-us/articles/5579474826519
- Figma Learn, "Use slots to build flexible components in Figma": https://help.figma.com/hc/en-us/articles/38231200344599
