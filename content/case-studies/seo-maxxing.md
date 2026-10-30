---
title: "SEO Maxxing"
shelf: opinion
summary: "Most SEO maxxing on a small site is looksmaxxing for a robot. Google's own docs say what actually moves results, and it's mostly being useful, findable and fast enough."
order: 16
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/seo-maxxing.webp"
---

There's a whole genre of SEO advice that reads like a gym routine for your website. Hit 2,000 words. Put the keyword in the URL, the H1, the first paragraph and the alt text. Add five kinds of schema. Get a perfect Lighthouse score. Write an llms.txt. Repeat daily.

That's SEO maxxing: optimizing every visible muscle and hoping the algorithm notices. My take, as a designer who builds and ships small sites: **most of it is mewing for a robot.** On a small site, what actually moves results is boring and short: make pages worth finding, make them easy to crawl, make them not painful to use, then wait.

And I don't need to rely on my opinion here, because Google has written most of it down.

## The myths Google already debunked

Google's own SEO Starter Guide has a list of things that sound important and mostly aren't. Straight from the docs:

- **Meta keywords:** "Google Search doesn't use the keywords meta tag."
- **Keywords in your domain or URL:** they "have hardly any effect" beyond showing up in breadcrumbs.
- **Word count:** "The length of the content alone doesn't matter for ranking purposes."
- **Heading order:** for Search, "it doesn't matter if you're using them out of order." There's no ideal number of headings either.
- **Duplicate content penalty:** inefficient, but "not something that will cause a manual action."
- **E-E-A-T as a ranking factor:** Google's answer to that question is literally "No, it's not."

That last one surprises people. E-E-A-T (experience, expertise, authoritativeness, trust) is a framework for what good content looks like, not a dial you can turn up with an author bio widget.

> If your SEO plan is mostly things Google has publicly said it ignores, you don't have an SEO plan. You have a ritual.

## What Google actually asks for

The helpful content guidance is where the real signal is. It frames everything around **Who, How and Why**:

- **Who** made this? Is authorship obvious, with bylines that lead somewhere real?
- **How** was it made? Google even asks whether you explain how "automation or AI-generation was used to create content."
- **Why** does it exist? This is the one Google calls the most important. Is it there to help people, or "primarily made to attract visits from search engines"?

Their self-assessment questions are uncomfortably direct. Does the page provide "original information, reporting, research, or analysis"? Is it something you'd "want to bookmark, share with a friend, or recommend"? And my favourite: are you writing to a word count because you heard Google likes one?

For a portfolio or a small business site, this is great news. You have something big content farms don't: first-hand experience. A case study about a real project, written by the person who did it, is exactly what the guidance describes.

## Speed matters, just not the way people think

Here's where designers and devs over-correct. Core Web Vitals are real. Google says plainly that "Core Web Vitals are used by our ranking systems." The targets, per web.dev, are:

- **LCP** (loading) at 2.5 seconds or less
- **INP** (responsiveness) at 200 milliseconds or less
- **CLS** (visual stability) at 0.1 or less

measured at the **75th percentile** of real visits, on mobile and desktop separately.

But read the next lines in the same doc. Good scores don't guarantee top rankings, and "Google Search always seeks to show the most relevant content, even if the page experience is sub-par." Page experience mostly helps when lots of pages are equally helpful for a query. Google also advises against chasing perfect scores just for SEO.

So yes, fix a 6-second hero image. No, don't burn a week shaving your Lighthouse score from 94 to 100 on a site nobody can find yet.

## The AI-era temptation

The newest flavour of maxxing is volume. Spin up fifty location pages, generate a blog post a day, let the model write the meta descriptions in bulk.

Google has a name for that: **scaled content abuse**, "when many pages are generated for the primary purpose of manipulating search rankings." Their spam policy literally uses "using generative AI tools or other similar tools to generate many pages without adding value for users" as an example.

The tool isn't the problem. I use AI every day to draft, outline and edit. The problem is pages that exist only because they were cheap to make.

What about optimizing for AI Overviews and AI Mode? Google's own answer is that there are "no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary." No special markup, no AI-specific text files. Just regular SEO fundamentals: crawlable, indexed, internally linked, content in actual text.

## The counter-argument, fairly

"Technical SEO matters. Schema, sitemaps and metadata are real." Absolutely, and I'm not saying skip them. Structured data can make a page *eligible* for rich results, and Google says it gives "explicit clues" about a page's meaning. A clear title and description affect whether people click. A broken robots.txt or a JavaScript-only page can make a site invisible.

But notice the wording: eligible, not guaranteed. Technical SEO is the floor that lets good content get found. It isn't a substitute for good content. Small sites tend to get the ratio backwards: twenty hours on plugins, two on the actual words.

## My verdict

SEO maxxing on a small site mostly means doing fewer, better things and waiting. Google itself says some changes take hours and others "could take several months," and suggests waiting a few weeks before judging a change.

My checklist:

1. **Write pages only you could write.** Real projects, real process, real decisions. That's the "original analysis" Google asks for.
2. **Make authorship obvious.** Name, role, an about page that's actually about you.
3. **Nail the basics once.** Unique titles, honest descriptions, clean internal links, a sitemap, nothing important hidden behind JavaScript.
4. **Fix the slow stuff that users feel.** Hero images, layout shift, laggy interactions. Aim for "good" at the 75th percentile, not 100.
5. **Add structured data where it matches the page,** and treat rich results as a bonus.
6. **Don't scale with AI for the sake of scale.** Use it to make a page better, not to make more pages.
7. **Skip the rituals.** Meta keywords, keyword-stuffed URLs, word-count targets, "E-E-A-T scores."
8. **Be patient.** Ship, measure in Search Console, wait weeks, then adjust.

The best SEO move I know is still the least exciting one: make something worth linking to and then don't get in its way.

## Sources

- Google Search Central, SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central, Creating helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central, Understanding page experience: https://developers.google.com/search/docs/appearance/page-experience
- web.dev, Web Vitals: https://web.dev/articles/vitals
- Google Search Central, Spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google Search Central, AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central, Intro to structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
