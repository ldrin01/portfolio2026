---
title: "PWA"
shelf: work
summary: "How I approach turning a website into an installable app people keep on their home screen, without the cost of building native apps."
order: 3
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/pwa.webp"
---

"Do we need an app?" is one of the most common questions I hear in client kickoffs. It comes up with education clients, with food and beverage brands, with retail. Usually what the client actually wants is simpler than a native app: a home-screen icon, something that opens fast, and a reason for customers to come back.

That is where a Progressive Web App (PWA) fits. This piece covers how I design one, and the decisions that matter more than the technology.

## Context

At an agency, I work with clients across very different industries, but the audience in the Philippines has one thing in common: they are on their phones. DataReportal counted 86.98 million internet users in the Philippines at the start of 2024, with a median mobile connection speed of 27.75 Mbps against 92.19 Mbps on fixed lines. In practice, that means a lot of people browsing on mid-range Android phones over mobile data that drops in and out.

A native app is a big ask for that audience. It has to be found in a store, downloaded, kept updated and given storage space. For the client, it means two codebases, store reviews and a bigger maintenance budget. Many of our clients already have a good website. The question is how to make that website feel like an app.

## The problem

MDN describes a PWA as an app built with web technologies that can, like a native app, "be installed on the device, operate offline and in the background." The technical side is well documented. The design side is where projects usually go wrong.

When I look at a site before it becomes a PWA, I usually find three gaps:

- **No install story.** Nobody has decided when or why a visitor would want to install it.
- **No offline story.** The site either works or shows the browser's dinosaur. There is nothing in between.
- **No app shell.** Once launched from the home screen, the site has no browser bar, so any page that relied on the back button or the URL bar suddenly feels broken.

So the work isn't "add a manifest." It's designing those three moments.

## Designing the install moment

Chrome only offers installation once a site meets certain criteria: HTTPS, a web app manifest with a name, 192px and 512px icons, a start URL and a standalone-style display mode, plus some user engagement. According to web.dev, that means at least one click or tap and at least 30 seconds on the page. Those are developer requirements, but they shape design work too. The icon, the short name under it and the splash colours are now brand assets that sit on someone's home screen next to their banking and messaging apps.

The bigger design question is timing. web.dev's guidance on promoting installation is clear: avoid prompting on first load, keep promotions out of the main flow, always let people dismiss them, and remember that choice. It suggests showing a promotion after a meaningful action, like a purchase, a booking or a sign-up.

> An install prompt on page load is asking for commitment before you've earned it. I'd rather ask right after someone gets value.

So my rule is to tie the install prompt to a moment of success. For a booking flow, that is the confirmation screen. For a content site, it's after a few return visits. For an e-commerce site, it's after checkout, placed away from the next steps so it doesn't block them. Then I write the prompt around a specific benefit ("Get your order updates in one tap") rather than the technology ("Install our PWA").

iOS needs its own design. Safari doesn't fire the same install event, so people have to use the Share menu and "Add to Home Screen." The web.dev case study on Rakuten 24 is a good example: the team built a custom install prompt, detected whether the app was already installed on Android or iOS, and sent users who didn't install from the banner to a step-by-step guide for each platform. I now design that guide as a standard part of the PWA kit: a short, illustrated sheet that matches the client's brand.

## Designing for offline and bad connections

web.dev's offline UX guidelines read almost like a checklist I work through with the team:

- Tell users the app's state as soon as it changes, and whether the problem is on their side or ours.
- Let people keep browsing what's cached and disable only what really needs a connection, like checkout.
- Show when content was last updated.
- Avoid full-screen blocking modals, and don't rely on colour alone to signal state.
- Avoid jargon. Say "download" or "save for later," never "service worker."

In design files, this means every key screen gets extra states beyond "loaded" and "error": loading with skeletons, offline with cached content, offline with nothing cached, and back online. I design a small connection banner that sits under the header, uses an icon and text together, and goes away on its own when the connection returns. I also design an offline fallback page that still looks like the brand and offers something useful, such as saved items, contact details or the last content the person viewed.

Writing matters here. "You're offline. You can still browse saved items. We'll send your message when you're back online." is three short sentences, and it does more than any illustration.

## Designing the app shell

Once installed in standalone mode, the site loses the browser's address bar and, on some devices, an obvious back button. I check every flow for that:

- A persistent header or bottom navigation, so people never get stuck on a page.
- Visible back actions on deep pages, instead of relying on the browser.
- A share button wherever someone might have copied a URL before.
- Safe-area padding for notches and gesture bars, and a splash and theme colour that match the brand.

This is the part clients notice first. When it's done well, people forget they're on a website.

## Trade-offs

A PWA isn't always the answer, and I say so in kickoffs.

- **Platform gaps.** iOS support has improved, but install and some device features still behave differently than on Android. If a product needs deep device integration, native may still be right.
- **Store presence.** Some clients want to be in the App Store for credibility or marketing. A PWA doesn't give you that by default.
- **Caching takes discipline.** Offline support means deciding what to cache and for how long. Stale prices or schedules are worse than no data, which is why "last updated" labels matter.

What makes PWAs worth pitching is that the upside is well documented. In web.dev's case studies, Rakuten 24 reported a 310% increase in visit frequency per user and a 450% increase in retention among users who installed the PWA. OpenSooq saw page visits per session rise 48% and average session duration rise 28% for installed users. Those are vendor-reported numbers measured in different ways, but they all point the same way: people who install come back.

## What I'd do next

If I were extending the PWA kit, I'd focus on three things:

- **Measure installs properly from day one.** Track prompt impressions, dismissals and installs, so we can test timing and copy instead of guessing.
- **Design notifications as carefully as the install prompt.** Push notifications are the next permission ask, and the same rule applies: ask after value, not on arrival.
- **Make offline states part of the design system,** so every new screen ships with them instead of having them added at QA.

The technology for PWAs has been ready for years. What makes one feel like an app is design: deciding when to ask, what to show when the network drops, and how people get around without a browser bar.

## Sources

- MDN Web Docs, Progressive web apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- web.dev, Installation criteria: https://web.dev/articles/install-criteria
- web.dev, Patterns for promoting PWA installation: https://web.dev/articles/promote-install
- web.dev, Offline UX design guidelines: https://web.dev/articles/offline-ux-design-guidelines
- web.dev, Rakuten 24 case study: https://web.dev/case-studies/rakuten-24
- web.dev, OpenSooq case study: https://web.dev/case-studies/opensooq-case-study
- DataReportal, Digital 2024: The Philippines: https://datareportal.com/reports/digital-2024-philippines
