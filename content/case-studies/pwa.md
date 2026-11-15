---
title: "PWA"
shelf: work
summary: "What it takes to turn a website into an installable app people keep on their home screen, without the cost of building native apps."
order: 3
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/pwa.webp"
---

**Role:** Senior UI/UX Designer\
**Work:** Design thinking behind Progressive Web Apps (PWAs) for client websites, across education, food and beverage, and retail\
**Under NDA:** Industries only, no client names or figures

"Do we need an app?" is a common question at the start of a project. Often the client wants something simpler than a native app: an icon on the home screen, a site that opens fast, and a reason for customers to come back.

That is where a PWA fits. This piece covers the design decisions that matter more than the technology.

## A native app is a big ask here

Most of our audience in the Philippines is on their phones. DataReportal counted 86.98 million internet users at the start of 2024, with a median mobile connection speed of 27.75 Mbps against 92.19 Mbps on fixed lines. It helps to picture a mid-range Android phone on mobile data that drops in and out.

A native app has to be found in a store, downloaded, updated and given storage space. For the client it means two codebases, store reviews and a bigger maintenance budget. Many clients already have a good website, so the better starting point is the site they have, and the question of how to make it feel like an app.

## The technology is the easy part

MDN describes a PWA as an app built with web technologies that gives an experience like a platform-specific app. Like one, it can be installed, work offline and run in the background. That part is well documented. The design side is where projects go wrong.

Three gaps show up often in a site that is about to become a PWA:

1. **No install story.** Nobody has decided when or why a visitor would want to install it.
2. **No offline story.** The site either works or shows the browser's dinosaur. Nothing in between.
3. **No app shell.** Launched from the home screen, there is no browser bar. Any page that relied on the back button or the URL bar feels broken.

So the work is not "add a manifest." It is designing those three moments.

## Ask for the install after the person got something

Chrome offers installation only when a site meets some criteria: HTTPS, a web app manifest with a name, a start URL, a display mode and icons at 192px and 512px, plus some engagement. According to [web.dev](https://web.dev/articles/install-criteria), the engagement part means at least one click or tap and 30 seconds on the page. These are developer requirements, but they affect design. The icon, the short name and the splash colours sit on someone's home screen next to their banking and messaging apps, so they are brand assets.

Timing is the bigger question. [web.dev's guidance](https://web.dev/articles/promote-install) says to avoid prompting too early, keep promotions out of the flow of the user journey, let people dismiss them, and remember that choice. It points to conversion moments like a purchase, a booking or a sign-up as a good time to ask.

> An install prompt on page load asks for commitment before it has been earned. It is better to ask right after someone gets value.

In practice, the prompt belongs to a moment of success:

- **Booking flow:** the confirmation screen.
- **Content site:** after a few return visits.
- **E-commerce:** after checkout, placed away from the next steps so it does not block them.

The copy works best when it names a real benefit, like "Get your order updates in one tap," and avoids words like "Install our PWA."

iOS needs its own design. Safari does not fire the same install event, so people use the Share menu and "Add to Home Screen." The [Rakuten 24 case study](https://web.dev/case-studies/rakuten-24) shows one way to handle it. The team built a custom install prompt and checked whether the app was already installed on Android or iOS. People who dismissed or missed the banner could open a guide with manual install steps for both platforms. A short, branded, illustrated guide like that is worth planning for in any PWA.

## Plan for the network to fail

The [offline UX guidelines on web.dev](https://web.dev/articles/offline-ux-design-guidelines) read almost like a checklist for the team:

- Tell people about a change in state as soon as it happens.
- Let them keep browsing what is cached. Pricing and a Buy button are examples of things that can be disabled offline.
- Show when content was last updated.
- Avoid loading dialogs that cover the whole screen, and do not rely on colour alone to show state.
- Skip the jargon. Say "save for later," not "service worker."

In the design file, this means each key screen gets more states than "loaded" and "error":

| State | What the screen does |
| --- | --- |
| Loading | Skeletons, not a blank page |
| Offline, content cached | Cached content with a small banner under the header |
| Offline, nothing cached | A branded fallback page with something useful, like contact details |
| Back online | The banner goes away on its own |

The banner works best with an icon and text together. The words matter too. "You're offline. You can still browse saved items. We'll send your message when you're back online." is three short sentences, and it does more than any illustration.

## Design for no browser bar

In standalone mode the site loses the address bar and, on some devices, an obvious back button. Every flow needs a check for that:

- A persistent header or bottom navigation, so nobody gets stuck on a page.
- Visible back actions on deep pages.
- A share button wherever someone might have copied a URL before.
- Safe-area padding for notches and gesture bars, and a splash and theme colour that match the brand.

When this is done well, people forget they are on a website.

## Trade-offs

A PWA is not always the answer, and it is better to say so early.

| Concern | What to tell the client |
| --- | --- |
| Platform gaps | iOS support has improved, but install and some device features still differ from Android. If the product needs deep device integration, native may be right. |
| Store presence | Some clients want the App Store for credibility or marketing. A PWA does not give that by default. |
| Caching | Offline support means deciding what to cache and for how long. Stale prices or schedules are worse than no data, so "last updated" labels matter. |

The upside shows up in web.dev's case studies. Rakuten 24 reported a 310% increase in visit frequency per user and a 450% increase in retention, both for people who installed the PWA, compared with web users and with its earlier mobile web flow. [OpenSooq](https://web.dev/case-studies/opensooq-case-study) saw page visits per session rise 48% and average session duration rise 28% for installed users. These numbers come from the companies themselves and were measured in different ways. They still point the same direction: people who install come back.

## Next steps after launch

- **Measure installs from day one.** Track prompt impressions, dismissals and installs, so timing and copy can be tested.
- **Treat notifications like the install prompt.** Push is the next permission ask, and the same rule applies: ask after value, not on arrival.
- **Put offline states in the design system,** so each new screen ships with them and they are not added at QA.

The technology for PWAs has been ready for years. What makes one feel like an app is deciding when to ask, what to show when the network drops, and how people get around without a browser bar.

## Sources

- MDN Web Docs, Progressive web apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- web.dev, Installation criteria: https://web.dev/articles/install-criteria
- web.dev, Patterns for promoting PWA installation: https://web.dev/articles/promote-install
- web.dev, Offline UX design guidelines: https://web.dev/articles/offline-ux-design-guidelines
- web.dev, Rakuten 24 case study: https://web.dev/case-studies/rakuten-24
- web.dev, OpenSooq case study: https://web.dev/case-studies/opensooq-case-study
- DataReportal, Digital 2024: The Philippines: https://datareportal.com/reports/digital-2024-philippines
