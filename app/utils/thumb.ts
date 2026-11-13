// The small picture for cards and search. An article may set its own (`thumb`); otherwise it is the one made
// automatically beside the main picture: /covers/x.webp -> /covers/x-thumb.webp (640 px wide, about 25 KB).
export const thumbOf = (c: { cover?: string; thumb?: string }) => c.thumb || (c.cover ? c.cover.replace(/\.webp$/, '-thumb.webp') : '')
