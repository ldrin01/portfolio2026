---
title: "Three Fonts Are Greedy, Two Is Too Much, One Maybe"
shelf: opinion
summary: "An argument for typographic restraint: start with one good family, make a second font earn its place, and treat a third as a red flag for both design and performance."
order: 14
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/three-fonts.webp"
---

Open the type styles of a long-running project and you can find four families in it: a serif for headings, a geometric sans for body text, a script for the hero, and a monospace added for one pricing table that stayed. Nobody planned that. It piled up one small decision at a time.

My argument is that **fonts are easy to add and expensive to keep.** Three is greedy. Two is usually more than the project needs. One good family, used with discipline, is enough more often than designers like to admit. The title is dramatic on purpose, but I mean it.

## Typography writers also stop at two

Matthew Butterick wrote *Practical Typography*, a reference many working designers use. On mixing fonts he says: "Most documents can tolerate a second font. Few can tolerate a third." He adds that mixing fonts is never a requirement. It is an option ([Practical Typography](https://practicaltypography.com/mixing-fonts.html)).

Look at the word he picked. A second font is something a document tolerates. He also says font mixing works best when each font has a consistent role in the document.

That is a good test. If you cannot say in one sentence what job the second font does that the first cannot, it has no job.

> A second font is something a design tolerates. A third is something it survives.

## One family already gives you a system

The usual objection is "I need contrast." A single well-built family gives a lot of it:

- **Weight:** light to black, with several steps between
- **Size:** a real type scale, with big jumps for display and small steps for UI
- **Width and optical size,** in families that support them
- **Case and tracking:** uppercase labels, tighter headlines, looser captions
- **Italic** for emphasis and quotes
- **Color and opacity** for hierarchy without changing the face

Variable fonts help here. One file covers a range of weights and widths, and every step keeps the same voice.

When a page feels flat, the scale, the weight rules and the spacing are the first places to look, before reaching for a new typeface.

## Every font costs load time

Fonts feel free because they are free to pick in Figma. The browser still has to download each one. The HTTP Archive's Web Almanac found that about 87% of websites used web fonts in 2024, so this cost is on most pages ([Web Almanac 2024](https://almanac.httparchive.org/en/2024/fonts)).

Each weight and style is another file unless the font is variable. Three families at three weights each is nine files competing for bandwidth on a phone, before the hero image starts loading.

Fonts also touch Core Web Vitals. Browsers can hold back text until a web font loads, which can hurt how fast the first content appears. When the web font swaps in for a fallback with different metrics, the layout can shift. Preloading every font does not fix this, because web.dev warns that preload competes with other resources for bandwidth ([web.dev](https://web.dev/articles/font-best-practices)).

## When a second font is fine

Some people say one font is boring and a brand needs personality. Sometimes that is right. A second font is easy to defend in these cases:

1. **A display face for headlines** with a quiet font for body and UI. This is the classic pairing, and it works when the display font is used only for display.
2. **Monospace for real code or data,** where alignment and clear characters matter.
3. **Multi-script products.** If the main family does not cover a language you support, adding a matching family is access, not greed.

Fonts from the same designer also tend to work together. A superfamily with matched sans and serif versions gives you two fonts that behave like one system.

Some reasons that do not hold up: "the client liked it on a mood board," "it was trending on a font site," or "we needed something for the testimonial section."

Icon fonts count too. They are a font download like any other, so they belong in the font budget, and SVG icons are usually the lighter choice.

## A checklist for any team

Start with one. Earn the second. Treat the third as a warning sign.

1. **Pick one family with range,** ideally a variable font with the weights and widths you need.
2. **Build hierarchy with scale, weight and spacing** before you consider another face.
3. **Give any second font one written job,** for example "headlines over 32px only," and enforce it in the design system.
4. **Count weights, not just families.** Two families at five weights each is ten files.
5. **Ship WOFF2.** web.dev says it compresses about 30% better than WOFF.
6. **Subset** to the characters and languages you use.
7. **Match your fallback metrics.** web.dev recommends `size-adjust` on the fallback font so the swap does not shift the layout.
8. **Audit every quarter.** Fonts creep in through one-off sections. Delete the ones with no job.

One font used well looks confident. Four fonts used everywhere look like a team that never agreed.

## Sources

- Matthew Butterick, *Practical Typography*, "Mixing fonts": https://practicaltypography.com/mixing-fonts.html
- HTTP Archive, Web Almanac 2024, Fonts chapter: https://almanac.httparchive.org/en/2024/fonts
- web.dev, Best practices for fonts: https://web.dev/articles/font-best-practices
