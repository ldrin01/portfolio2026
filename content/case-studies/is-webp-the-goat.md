---
title: "Is WebP the GOAT?"
shelf: opinion
summary: "WebP is the safest default image format on the web, but it isn't the greatest of all time, and the format matters less than the habits around it."
order: 15
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/is-webp-the-goat.webp"
---

Every designer who has handed off a 4 MB hero PNG has been on the receiving end of the same dev message: "can you export this as WebP?" At some point WebP stopped being a format and became a personality. Convert everything, ship, feel fast.

So is it the GOAT? My take: **WebP is the GOAT of defaults, not the GOAT of formats.** It's the one you can pick without thinking and almost never regret. But AVIF often beats it on photos, JPEG XL is finally back in the conversation, and honestly the biggest wins on most pages have nothing to do with which file extension you chose.

## The case for the crown

WebP's résumé is genuinely strong.

- **Smaller than JPEG.** Google's own compression study found lossy WebP files are **25–34% smaller** than JPEGs at equivalent SSIM quality.
- **Smaller than PNG.** Google reports lossless WebP is **26% smaller** than PNG.
- **Transparency without the PNG tax.** Lossy WebP with an alpha channel is typically about **3× smaller** than the equivalent PNG, per Google's docs. For UI work, with product cutouts, shadows and soft-edged mockups, that's the killer feature.
- **It works basically everywhere.** caniuse puts WebP at about **97%** global support. Desktop Safari got full support in version 16, and iOS Safari in 14.

The real-world data backs it up. The HTTP Archive's 2024 Web Almanac measured median compression across the web and found WebP images at **1.3 bits per pixel**, against **2.0** for JPEG and **3.8** for PNG. On the actual internet, not just in a lab, WebP is the most compact format in common use.

> WebP is the format you reach for when you don't have time to think. That's a compliment, and it's also the ceiling.

## The challengers

GOAT debates need rivals, and WebP has two good ones.

### AVIF: the stronger player with a slower warm-up

Jake Archibald's well-known AVIF comparison is still the clearest demo I've seen. His F1 car photo at acceptable quality came out at **74.4 kB as JPEG, 43 kB as WebP and 18.2 kB as AVIF.** On a gradient-heavy illustration, AVIF hit 12.1 kB where lossy WebP needed 26.8 kB.

Support isn't a blocker anymore either. caniuse lists AVIF at roughly **96%** global support.

So why isn't AVIF automatically the champion? Archibald lists the trade-offs himself:

- **Encoding is slow.** At high effort settings it can take minutes per image in browser-based tools.
- **No progressive rendering.** AVIF arrives all at once. JPEG renders in passes and WebP renders top to bottom.
- **Lossless mode is weak.** In his flat illustration test, lossless AVIF was **41.7 kB** against **12.9 kB** for lossless WebP.

And here's the twist. That same Web Almanac data shows AVIF's real-world median at **1.4 bits per pixel**, slightly *higher* than WebP's 1.3, and up from about 1.0 two years earlier. Better codec on paper, not always better files in practice, because people encode it at whatever settings their pipeline defaults to.

### JPEG XL: the comeback story

JPEG XL got pulled from Chrome in 2022 and was written off. Then, in October 2026, the Chrome team announced that **Chrome 155 decodes JPEG XL**, using a memory-safe Rust decoder (jxl-rs) and citing "30–50% better compression than JPEG," lossless support and built-in HDR. They pointed to years of developer demand as the reason.

It's not a default yet. caniuse currently puts JPEG XL at roughly **60%** global support, with Safari still only partial. Watch it, but don't bet a launch on it.

## The uncomfortable truth: format is rarely your bottleneck

Here's where I get a little contrarian. Google's own guide to optimizing Largest Contentful Paint says switching to a better format such as AVIF or WebP reduces resource load time, but notes that **load duration "tends not to be a significant bottleneck for most sites."** The delay often just moves somewhere else.

What hurts more in practice:

- **Lazy-loading the hero.** web.dev is blunt: "Never lazy-load your LCP image." Yet the 2024 Web Almanac found **9.5%** of mobile LCP images still use native lazy-loading.
- **Images being the LCP at all.** **68%** of mobile pages have an image as their LCP element, which makes that one image the most important file on the page.
- **Shipping one giant size to every screen.** A perfectly compressed WebP at 3000 px wide is still a 3000 px image on a phone.
- **Priority confusion.** web.dev warns that giving high fetch priority to more than one or two images makes it useless.

A 400 kB JPEG at the right size, loaded early, can beat a 150 kB WebP that's lazy-loaded behind three scripts.

## The counter-argument, fairly

"Just use AVIF everywhere, it's 2026." Fair, and for photo-heavy sites like e-commerce, editorial or travel, a `picture` element with AVIF first and WebP as the fallback is the right call. The savings on hero photography are real, and the support is there.

But a lot of teams don't control their pipeline. A CMS, an image CDN or a plugin decides the encoder settings, and the Web Almanac numbers show what happens when nobody tunes them. If your stack can do AVIF well, use it. If it can only do one thing reliably, WebP is the one I'd pick.

## My verdict

WebP isn't the GOAT. It's the dependable veteran who shows up every game: great support, strong compression, good transparency, decent lossless. AVIF is the more talented player who needs the right coach. JPEG XL is the comeback kid we're watching from the bench.

My checklist for handoff and builds:

1. **Default to WebP** for UI images, cutouts and anything with transparency.
2. **Add AVIF first** for large photographic heroes when the pipeline supports it, with WebP as fallback.
3. **Keep SVG for icons and logos.** No raster format beats a clean vector for flat shapes.
4. **Size before you compress.** Export the sizes the layout actually uses and serve them responsively.
5. **Never lazy-load the LCP image,** and give it priority. Only that one.
6. **Check the output, not the extension.** Compare real file sizes and look at them zoomed in. A badly encoded AVIF is still a bad image.
7. **Revisit JPEG XL** once Safari and Edge catch up.

The GOAT isn't a file format. It's the habit of asking "what does this image cost the page?" before you export it.

## Sources

- Google, WebP overview: https://developers.google.com/speed/webp
- Google, WebP compression study: https://developers.google.com/speed/webp/docs/webp_study
- caniuse, WebP: https://caniuse.com/webp
- caniuse, AVIF: https://caniuse.com/avif
- caniuse, JPEG XL: https://caniuse.com/jpegxl
- HTTP Archive, Web Almanac 2024, Media chapter: https://almanac.httparchive.org/en/2024/media
- Jake Archibald, "AVIF has landed": https://jakearchibald.com/2020/avif-has-landed/
- Chrome for Developers, JPEG XL in Chrome: https://developer.chrome.com/blog/jpeg-xl-in-chrome
- web.dev, Optimize Largest Contentful Paint: https://web.dev/articles/optimize-lcp
