// Loads every content collection once (at build time on the server) and shares it with all components.
type Doc<K extends string> = NonNullable<Awaited<ReturnType<ReturnType<typeof queryCollection<K>>['first']>>>

export interface Site {
  profile: Doc<'profile'>
  folder: Doc<'folder'>
  journey: Doc<'journey'>
  toolkit: Doc<'toolkit'>
  keyboard: Doc<'keyboard'>
  process: Doc<'process'>
  about: Doc<'about'>
  options: Doc<'options'>
  seo: Doc<'seo'>
  header: Doc<'header'>
  footer: Doc<'footer'>
  contact: Doc<'contact'>
  caseStudiesPage: Doc<'caseStudiesPage'>
}

export async function loadSite() {
  const site = useState<Site | null>('site', () => null)
  if (!site.value) {
    const [profile, folder, journey, toolkit, keyboard, process, about, options, seo, header, footer, contact, caseStudiesPage] = await Promise.all([
      queryCollection('profile').first(),
      queryCollection('folder').first(),
      queryCollection('journey').first(),
      queryCollection('toolkit').first(),
      queryCollection('keyboard').first(),
      queryCollection('process').first(),
      queryCollection('about').first(),
      queryCollection('options').first(),
      queryCollection('seo').first(),
      queryCollection('header').first(),
      queryCollection('footer').first(),
      queryCollection('contact').first(),
      queryCollection('caseStudiesPage').first()
    ])
    if (!profile || !folder || !journey || !toolkit || !keyboard || !process || !about || !options || !seo || !header || !footer || !contact || !caseStudiesPage) throw createError({ statusCode: 500, message: 'Missing content in /content' })
    site.value = { profile, folder, journey, toolkit, keyboard, process, about, options, seo, header, footer, contact, caseStudiesPage }
  }
  return site
}

// Components below app.vue read the already-loaded content.
export const useSite = () => useState<Site>('site').value

// The display name for an id from one of the choice lists in content/options.json.
export function optionName(list: 'articleCategories' | 'toolLevels' | 'toolGroups', id: string) {
  return useSite().options[list].find(o => o.id === id)?.name ?? id
}
