---
title: "SEO Maxxing"
shelf: opinion
summary: "Most SEO maxxing on a small site is polish for a robot. Google's own docs say what actually moves results, and it's mostly being useful, findable and fast enough."
order: 16
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/seo-maxxing.webp"
---

A lot of SEO advice reads like a gym routine for your website. Hit 2,000 words. Put the keyword in the URL, the H1, the first paragraph and the alt text. Add five kinds of schema. Get a perfect Lighthouse score. Write an llms.txt. Do it all again next week.

People call this SEO maxxing. It means polishing every visible part of the site and hoping the algorithm notices. My view is that on a small site most of this effort is wasted. A few plain things matter: make pages worth finding, make them easy to crawl, make them comfortable to use, then wait.

This is not only my opinion, because Google has written most of it down.

## Google already says which tips to skip

Google's SEO Starter Guide and related documentation cover several things that sound important and mostly are not ([Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)):

- **Meta keywords:** Google Search does not use the keywords meta tag.
- **Keywords in the domain or URL:** they have very little effect on ranking.
- **Word count:** there is no ideal length. Length alone is not a ranking factor.
- **Heading order and number:** there is no magic number of headings, and using them out of order is not a ranking problem.
- **Duplicate content:** it can waste crawling resources, but it is not a violation of Google's spam policies.
- **E-E-A-T as a ranking factor:** E-E-A-T (experience, expertise, authoritativeness, trust) describes what good content looks like. It is not a score you can raise by adding an author bio widget.

> If your SEO plan is mostly things Google has said it ignores, you have a ritual, not a plan.

## What Google asks for instead

The helpful content guidance frames everything as **Who, How and Why** ([Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)):

1. **Who** made this? Is the author clear, with a byline that leads somewhere real?
2. **How** was it made? Google asks you to be open about how automation or AI was used to create content.
3. **Why** does it exist? This is the most important one. Is the page there to help people, or mainly to attract visits from search engines?

The self-check questions are direct. Does the page give original information, reporting, research or analysis? Is it something a reader would bookmark, share with a friend or recommend? Is it written to hit a word count because someone heard Google likes one?

For a portfolio or a small business site, this is good news. You have something big content farms lack: first-hand experience. A case study written by the person who did the project fits the guidance well.

## Speed counts, but only up to a point

Core Web Vitals are real, and Google says its ranking systems use them. The targets, per web.dev, are measured at the 75th percentile of real visits, on mobile and desktop separately ([web.dev](https://web.dev/articles/vitals)):

| Metric | What it measures | Good score |
| --- | --- | --- |
| LCP | Loading | 2.5 seconds or less |
| INP | Responsiveness | 200 milliseconds or less |
| CLS | Visual stability | 0.1 or less |

Good scores do not guarantee top rankings. Google says Search always tries to show the most relevant content, even when the page experience is not great, and that page experience helps most when many pages are equally helpful for a query. It also advises against chasing perfect scores just for SEO.

So fix the 6-second hero image. Don't spend a week taking Lighthouse from 94 to 100 on a site nobody can find yet.

## Publishing more pages with AI is the new trap

The newest kind of maxxing is volume: fifty location pages, a blog post every day, meta descriptions generated in bulk.

Google has a name for it, **scaled content abuse**: generating many pages mainly to manipulate search rankings. Its spam policy names using generative AI tools to produce many pages without adding value for users as one way this happens ([Google Search Central](https://developers.google.com/search/docs/essentials/spam-policies)).

I use AI tools in my own work to draft, outline and edit, so the tool is fine. The problem starts when pages exist only because they were cheap to make.

On AI Overviews and AI Mode, Google says there are no extra requirements to appear and no special optimizations needed ([Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)). That means no special markup and no AI-specific text files. The usual basics apply: crawlable, indexed, internally linked, with the content in real text.

## Technical SEO is the floor

Schema, sitemaps and metadata do matter. Structured data can make a page eligible for rich results, and it gives Google clues about what a page means ([Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)). A clear title and description affect whether people click. A broken robots.txt or a page that only works with JavaScript can hide a whole site.

But the word is eligible, and it is not a promise. These things let good content get found. They can't replace it. Small sites often get the ratio backwards: twenty hours on plugins, two on the actual words.

## A checklist for a small site

Google says some changes show results in hours and others can take months, so patience is part of the job. It is better to do fewer things and do them well.

1. **Write pages only you could write.** Real projects, real process, real decisions.
2. **Show who wrote it.** A name, a role, and an about page that is actually about you.
3. **Set up the basics once.** Unique titles, honest descriptions, clean internal links, a sitemap, nothing important hidden behind JavaScript.
4. **Fix the slow parts people feel.** Hero images, layout shift, laggy taps. Aim for "good" at the 75th percentile, not 100.
5. **Add structured data where it matches the page.** Treat rich results as a bonus.
6. **Use AI to improve a page.** Don't use it to make more pages.
7. **Skip the rituals.** Meta keywords, stuffed URLs, word-count targets, "E-E-A-T scores."
8. **Be patient.** Ship, check Search Console, wait a few weeks, then adjust.

The best SEO move is also the dullest: make something worth linking to, then stay out of its way.

## Sources

- Google Search Central, SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central, Creating helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- web.dev, Web Vitals: https://web.dev/articles/vitals
- Google Search Central, Spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google Search Central, AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central, Intro to structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
