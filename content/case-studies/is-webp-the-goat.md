---
title: "Is WebP the GOAT?"
shelf: opinion
summary: "WebP is the safest default image format on the web, but it isn't the greatest of all time, and the format matters less than the habits around it."
order: 15
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/is-webp-the-goat.webp"
---

When a design with a big hero image goes to development, the message is often the same: "can you export this as WebP?" Somewhere along the way WebP became the answer to every image question. Convert everything, ship it, done.

So is it the greatest of all time? My answer is that WebP is the best default, and it is not the best format. You can pick it without thinking and almost never regret it. AVIF often beats it on photos, JPEG XL is back in the conversation, and the biggest wins on most pages have little to do with the file extension.

## Why WebP earns the default spot

- **Smaller than JPEG.** Google's own compression study found that WebP gives 25 to 34% additional compression over JPEG at equal or slightly better SSIM quality ([Google](https://developers.google.com/speed/webp/docs/webp_study)). Independent tests against better JPEG encoders like MozJPEG show a smaller gap, so treat that range as the best case.
- **Smaller than PNG.** Lossless WebP is typically smaller than PNG.
- **Transparency without the PNG size.** WebP supports an alpha channel in its lossy mode, so cutouts, shadows and soft-edged UI images do not need a heavy PNG. For UI work this is the feature that matters most.
- **It works almost everywhere.** Estimates of global browser support for WebP sit around 95 to 97%.

> WebP is the format you reach for when you don't have time to think. That is a compliment, and it is also the ceiling.

## The challengers

### AVIF compresses better but is harder to use well

Jake Archibald's AVIF comparison is still the clearest demo around. At acceptable quality on his test photo, WebP came out at roughly half the size of the JPEG, and AVIF at under half the size of the WebP, around 18 kB ([Jake Archibald](https://jakearchibald.com/2020/avif-has-landed/)). He also notes the JPEG in that comparison was not a perfectly like-for-like quality match, so the exact gap is debatable. Browser support is no longer the main problem, with estimates around 93 to 95%.

The usual trade-offs are:

- Encoding is slow, especially at high effort settings.
- There is no progressive rendering. An AVIF arrives all at once, while a JPEG renders in passes.
- Lossless mode is not its strength.
- Quality depends on the encoder settings, so a badly tuned AVIF can be a bad image.

### JPEG XL is coming back

Chrome removed JPEG XL in 2022 and many people wrote it off. On October 6, 2026 the Chrome team announced that Chrome 155 decodes JPEG XL, using a memory-safe Rust decoder called jxl-rs. The post describes it as offering roughly 30 to 50% better compression than JPEG, along with lossless support and HDR ([Chrome for Developers](https://developer.chrome.com/blog/jpeg-xl-in-chrome)).

It is not a default yet. Support across browsers is still uneven, and it is worth watching more than building a launch on.

## The format is rarely the bottleneck

Moving to a better format reduces file size. It does not fix how and when the image loads. These things usually hurt more:

1. **Lazy-loading the hero image.** The main image on a page should load as early as possible. Native lazy-loading tells the browser to wait, which is the opposite of what the largest image needs.
2. **Images being the Largest Contentful Paint (LCP) element.** On many pages the biggest element is an image, so that one image is the most important file on the page.
3. **One giant size for every screen.** A well-compressed WebP at 3000 px wide is still a 3000 px image on a phone.
4. **Too much high priority.** Giving high fetch priority to many images makes the setting useless. It works when it is saved for one or two.

A 400 kB JPEG at the right size, loaded early, can beat a 150 kB WebP that is lazy-loaded behind three scripts. Google's guide to optimizing LCP covers these load-order problems in detail ([web.dev](https://web.dev/articles/optimize-lcp)).

## When AVIF should be the default

The fair counter-argument is "just use AVIF everywhere, it's 2026." For photo-heavy sites like e-commerce, editorial or travel, that is a good call. A `picture` element with AVIF first and WebP as the fallback is a sensible setup, and the savings on hero photography are real.

The catch is that many teams do not control their pipeline. A CMS, an image CDN or a plugin sets the encoder. If the stack can do AVIF well, use it. If it can only do one format reliably, WebP is the safer pick.

## A handoff checklist

1. Default to WebP for UI images, cutouts and anything with transparency.
2. Add AVIF first for large photographic heroes when the pipeline supports it, with WebP as the fallback.
3. Keep SVG for icons and logos. No raster format beats a clean vector for flat shapes.
4. Size before you compress. Export the sizes the layout uses and serve them responsively.
5. Never lazy-load the LCP image, and give it priority. Only that one.
6. Check the output and not the extension. Compare real file sizes and zoom in. A badly encoded AVIF is still a bad image.
7. Look at JPEG XL again once more browsers support it.

The habit that matters most is asking what an image costs the page before you export it.

## Sources

- Google, WebP compression study: https://developers.google.com/speed/webp/docs/webp_study
- Jake Archibald, "AVIF has landed": https://jakearchibald.com/2020/avif-has-landed/
- Chrome for Developers, "Shipping JPEG XL in Chrome": https://developer.chrome.com/blog/jpeg-xl-in-chrome
- web.dev, Optimize Largest Contentful Paint: https://web.dev/articles/optimize-lcp
