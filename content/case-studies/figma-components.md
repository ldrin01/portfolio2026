---
title: "Figma Components"
shelf: craft
summary: "How I build components and variants that stay flexible as a product grows, without turning the library into a maze."
order: 8
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/figma-components.webp"
---

Components are where a design file stops being a set of pictures and starts being a system. Figma defines them as elements you can reuse across your designs. Edit the main component and every instance updates.

That part is easy. The hard part is building components that the rest of the team can actually use without detaching them, and that still make sense six months later when the client asks for a new feature. This is how I approach it.

## Why I care so much about this

At an agency, I'm rarely designing one product for years. I'm designing a hotel booking site, then a university portal, then a mobile app for a review center, sometimes in the same quarter. Each one needs its own component set, and each one gets handed to developers and often to other designers on the team.

A good component library means a junior designer can build a new page that looks right on the first try. A bad one means every page is slightly different, and QA turns into a hunt for inconsistent buttons.

## Start small, then nest

Figma's own best practices recommend building small "atom" components and nesting them inside larger ones, so a shared change only happens once. I follow that closely:

1. **Base pieces first**: icon, avatar, badge, input field, button.
2. **Composed pieces next**: a search bar is an input plus a button. A list item is an avatar, text and a badge.
3. **Patterns last**: cards, navigation, modals, table rows.

Every component is built on auto layout, so it resizes with its content. If a component only looks right at one width, it's not done.

I also turn repeated elements into components early, even at wireframe stage. If a card shows up on three screens, it becomes a component before I make the fourth.

## Choosing the right property

As of 2026, Figma has five types of component property, and picking the right one is most of the skill:

- **Variant**: for things that change the form of the component. State (default, hover, pressed, disabled), size, type.
- **Boolean**: for showing or hiding a layer. Booleans only control visibility.
- **Instance swap**: for nested instances people can swap, like the icon inside a button.
- **Text**: for text content people can edit straight from the properties panel.
- **Slot**: for flexible areas where people can add and arrange their own content inside an instance without detaching it.

The rule I give the team is the same one in Figma's docs: use a boolean for an optional element instead of making a variant for every combination. A button with or without an icon is one boolean, not double the variants.

Figma also recommends separate variant properties for separate changes, like `Type` and `Size`, instead of one property that changes several things at once. That keeps the variant grid readable and makes it obvious which combinations exist.

> Every variant you add is a variant someone has to maintain. Add properties for real differences, not for every screen you've drawn.

## Slots changed how I build containers

Before slots, flexible components were a workaround. You'd make a card with a placeholder instance and hope people swapped it correctly, or they'd just detach it.

Slots let me define an open area inside a component, such as a modal body or the content area of a card, where designers can add and arrange whatever they need. A few details from Figma's docs that matter in practice:

- You can convert an existing frame in a main component into a slot.
- You can set a **minimum and maximum layer count**. These are guidance, not hard limits. Going over shows a warning, but the designer can keep working.
- You can set **preferred instances** so the slot suggests the right components first, and optionally restrict it to only those.
- You can't change a slot's position, auto layout flow or constraints from an instance. That's set in the main component.
- Removing a slot property from the main component resets modified instances, which can delete content people added. I treat that as a breaking change.

For repeating content, like a list of form fields or menu items, a slot is now usually cleaner than a variant for "3 items", "4 items" and "5 items".

## Make the library easy to use

A component is only as good as the person using it can understand it. Things I do every time:

- **Expose nested instances**, so people can change a nested button's properties from the top-level instance without deep-selecting.
- **Set preferred instances** on swap properties, so the icon picker shows the icon set, not the whole library.
- **Write descriptions.** They show up as tooltips in the assets panel and help people pick between similar components.
- **Name text layers consistently** across related components, so text overrides carry over when someone swaps instances.
- **Hide internal pieces.** Prefixing a component with `_` or `.` keeps it out of the published library.
- **Organize by page and frame.** Pages become top-level groups, frames become subgroups.

## Common mistakes

**The variant explosion.** A button with five types, three sizes, four states and an icon toggle built as pure variants is 120 frames. Most of that should be booleans and instance swaps.

**Detaching as a habit.** When designers detach often, it's feedback about the component, not the designer. I ask what they needed and fix the main component.

**Building for the mockup, not the product.** A component that only handles the copy on today's screen will break the moment real content comes in. Test with long text, missing images and empty states.

**No owner.** On every project, one person owns the library. Changes go through them. Otherwise two designers fix the same thing two different ways.

## How it plays out on projects

On a typical agency engagement, the component library starts small in wireframes and gets richer through UI design. By handoff, developers should be able to look at a screen, see which components and properties are used, and map them to their own components.

That's also where I see the payoff of all the setup. When a client asks for a new page late in a project, the team can assemble it from existing pieces instead of designing from scratch, and it already matches everything else.

## Sources

- Figma Learn, "Explore component properties": https://help.figma.com/hc/en-us/articles/5579474826519
- Figma Learn, "Create and use variants": https://help.figma.com/hc/en-us/articles/39636737843735
- Figma Learn, "Use slots to build flexible components in Figma": https://help.figma.com/hc/en-us/articles/38231200344599
- Figma Best Practices, "Components, styles, and shared libraries": https://www.figma.com/best-practices/components-styles-and-shared-libraries/
