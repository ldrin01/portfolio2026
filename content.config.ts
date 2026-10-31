import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// All site text lives in /content as JSON or Markdown. Components only render it.
const link = z.object({ label: z.string(), href: z.string() })

export default defineContentConfig({
  collections: {
    profile: defineCollection({
      type: 'data',
      source: 'profile.json',
      schema: z.object({
        name: z.string(),
        roles: z.array(z.string()),
        role: z.string(),
        tagline: z.string(),
        about: z.array(z.string()),
        skills: z.array(z.string()),
        contactHeading: z.array(z.string()),
        email: z.string(),
        links: z.array(link)
      })
    }),
    folder: defineCollection({
      type: 'data',
      source: 'folder.json',
      schema: z.object({
        eyebrow: z.string(),
        heading: z.string(),
        // category: an articleCategories id; blurb: shown on the paper while the case study's write-up is still a stub
        items: z.array(z.object({ title: z.string(), blurb: z.string(), category: z.string(), to: z.string() })),
        more: z.object({ label: z.string(), to: z.string() }) // the last paper in the folder, at the back behind the stories
      })
    }),
    journey: defineCollection({
      type: 'data',
      source: 'journey.json',
      schema: z.object({
        heading: z.string(),
        entries: z.array(z.object({
          period: z.string(),
          role: z.string(),
          org: z.string(),
          blurb: z.string(),
          tags: z.array(z.string())
        }))
      })
    }),
    toolkit: defineCollection({
      type: 'data',
      source: 'toolkit.json',
      schema: z.object({
        heading: z.string(),
        tools: z.array(z.object({
          name: z.string(),
          use: z.string(),
          color: z.string(),
          path: z.string(),
          level: z.string(), // a toolLevels id
          group: z.string() // a toolGroups id
        })),
        codeHeading: z.string(),
        code: z.array(z.object({ name: z.string(), level: z.string(), icons: z.array(z.object({ path: z.string(), color: z.string() })) }))
      })
    }),
    caseStudies: defineCollection({
      type: 'page',
      source: 'case-studies/*.md',
      schema: z.object({
        title: z.string(),
        shelf: z.string(), // an articleCategories id
        summary: z.string(),
        order: z.number(),
        draft: z.boolean().default(true), // true until the real write-up replaces the stub
        seoTitle: z.string().default(''), // empty: "<title> — <site name>"
        seoDescription: z.string().default(''), // empty: the summary
        cover: z.string().default('') // a picture path, e.g. /covers/<slug>.webp; empty = no cover
      })
    }),
    // Header (logo and menu), footer, and the text of the fixed pages
    header: defineCollection({
      type: 'data',
      source: 'header.json',
      schema: z.object({ logo: z.string(), links: z.array(z.object({ label: z.string(), to: z.string() })) })
    }),
    footer: defineCollection({
      type: 'data',
      source: 'footer.json',
      schema: z.object({
        label: z.string(),
        legalLink: z.string(),
        exploreLabel: z.string(),
        writingLabel: z.string(),
        socialLabel: z.string(),
        wordmark: z.string(), // the big faded word that sinks off the bottom of the page
        writing: z.array(z.object({ label: z.string(), to: z.string() }))
      })
    }),
    contact: defineCollection({
      type: 'data',
      source: 'contact.json',
      schema: z.object({ eyebrow: z.string(), heading: z.string(), lead: z.string(), note: z.string() })
    }),
    caseStudiesPage: defineCollection({
      type: 'data',
      source: 'case-studies-page.json',
      schema: z.object({ heading: z.string() })
    }),
    legal: defineCollection({
      type: 'page',
      source: 'legal.md',
      schema: z.object({ eyebrow: z.string(), title: z.string() })
    }),
    // The choice lists the rest of the content picks from (edited in the local editor under Settings).
    options: defineCollection({
      type: 'data',
      source: 'options.json',
      schema: z.object({
        articleCategories: z.array(z.object({ id: z.string(), name: z.string(), heading: z.string(), blurb: z.string() })),
        toolLevels: z.array(z.object({ id: z.string(), name: z.string() })),
        toolGroups: z.array(z.object({ id: z.string(), name: z.string(), tag: z.string() }))
      })
    }),
    // Search and sharing: page titles and descriptions, the site name and the share image (edited under SEO).
    seo: defineCollection({
      type: 'data',
      source: 'seo.json',
      schema: z.object({
        siteName: z.string(),
        defaultDescription: z.string(),
        shareImage: z.string(),
        pages: z.array(z.object({ id: z.string(), name: z.string(), path: z.string(), title: z.string(), description: z.string() }))
      })
    }),
    process: defineCollection({
      type: 'data',
      source: 'process.json',
      schema: z.object({
        eyebrow: z.string(),
        heading: z.string(),
        sub: z.string(),
        steps: z.array(z.object({
          title: z.string(),
          blurb: z.string(),
          icon: z.enum(['brief', 'map', 'research', 'journey']),
          outputs: z.array(z.string()) // what the step hands over
        }))
      })
    }),
    about: defineCollection({
      type: 'data',
      source: 'about.json',
      schema: z.object({
        eyebrow: z.string(),
        title: z.string(), // the big words on the left
        titleAccent: z.string(), // its last line, in orange
        heading: z.string(),
        body: z.array(z.string()), // **words** between double asterisks show in orange
        cta: z.object({ label: z.string(), to: z.string() })
      })
    }),
    // The "More About Me" page: stages of the story, in order
    aboutPage: defineCollection({
      type: 'data',
      source: 'about-page.json',
      schema: z.object({
        title: z.string(),
        intro: z.string(),
        lenticular: z.array(z.object({ image: z.string(), alt: z.string() })), // two or more pictures the lenticular card flips through
        work: z.object({
          title: z.string(), body: z.array(z.string()),
          card: z.object({ photo: z.string(), company: z.string(), name: z.string(), role: z.string(), role2: z.string(), idNo: z.string(), since: z.string() })
        }),
        talk: z.object({ title: z.string(), body: z.array(z.string()), photos: z.array(z.object({ image: z.string(), caption: z.string() })) }),
        more: z.object({
          title: z.string(), body: z.array(z.string()),
          tools: z.array(z.object({ kind: z.string(), before: z.string(), name: z.string(), body: z.string() })), // kind: corel | premiere (which 3D logo sits in the line)
          stories: z.array(z.object({ title: z.string(), body: z.string() })),
          hobbies: z.object({ title: z.string(), body: z.string(), routes: z.array(z.object({ image: z.string(), kind: z.string(), name: z.string().optional(), km: z.number().optional(), date: z.string().optional(), stats: z.array(z.object({ label: z.string(), value: z.string() })).optional() })) }) // routes: transparent PNGs of the line; kind: run | ride
        }),
        evenMore: z.object({
          title: z.string(), body: z.array(z.string()),
          encarta: z.object({ title: z.string(), body: z.string() }), paint: z.object({ title: z.string(), body: z.string() }), gameboy: z.object({ title: z.string(), body: z.string() }), volcano: z.object({ title: z.string(), body: z.string() }),
          paintings: z.object({ title: z.string(), items: z.array(z.object({ image: z.string(), caption: z.string() })) }),
          sketches: z.object({ title: z.string(), items: z.array(z.object({ image: z.string(), caption: z.string() })) })
        }),
        tooFar: z.object({ title: z.string(), photo: z.string(), alt: z.string(), body: z.array(z.string()) }),
        next: z.object({ title: z.string(), plans: z.array(z.object({ title: z.string(), body: z.string() })) })
      })
    }),
    keyboard: defineCollection({
      type: 'data',
      source: 'keyboard.json',
      schema: z.object({
        typed: z.string(),
        tilt: z.string()
      })
    })
  }
})
