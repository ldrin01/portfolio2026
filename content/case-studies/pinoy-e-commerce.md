---
title: "Pinoy E-commerce Nowadays"
shelf: "work"
summary: "Designing online shops around how Filipinos actually buy: on the phone, often with cash on delivery, and usually after a quick chat with the seller."
order: 1
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/pinoy-e-commerce.webp"
---

Most e-commerce playbooks are written for a shopper who sits at a laptop, pays by credit card and never talks to anyone. That shopper exists here, but they aren't the majority. Over the last four years I've designed storefronts and shopping apps for retail and lifestyle brands in the Philippines, including a fashion retailer's website and customer mobile app. The biggest lesson from that work is simple. If you design for the Filipino shopper you imagine, you'll miss the one who actually shows up.

This piece covers what I've learned about that gap and how it changes the design.

## Context: a market that buys on the phone

The numbers explain a lot. The latest e-Conomy SEA report from Google, Temasek and Bain puts the Philippine digital economy at about $36 billion in gross merchandise value for 2025, up 16% year on year, with e-commerce as the largest slice. Video commerce grew 35% on its own ([BitPinas](https://bitpinas.com/fintech/ph-digital-economy-2025/)).

Reach is just as big. DataReportal counted 97.5 million internet users in the Philippines in January 2025 and 90.8 million social media user identities, about 78% of the population ([DataReportal](https://datareportal.com/reports/digital-2025-philippines)). Most of those people meet a brand first in a feed, on a phone, between other things.

So the starting point for every retail project I take on is the same. It's a phone, a mid-range one, on mobile data that isn't always fast. The customer probably found you through a post or a live selling video, not a search.

## The problem: three habits most templates ignore

Off-the-shelf storefront themes are good at the basics. Where they struggle is with three local habits.

**Cash on delivery is still a real payment method.** Xendit's Ecommerce Payments Momentum Report 2026 found that cash on delivery still makes up 23% of Philippine e-commerce transaction value on its platform, the highest of the six Southeast Asian markets it studied. Even more telling, 41% of Filipino shoppers who abandoned a purchase in the previous three months said their preferred payment method wasn't available ([Daily Tribune](https://tribune.net.ph/2026/10/20/cash-on-delivery-still-dominates-phl-online-shopping)).

**People want to ask before they buy.** "Available pa po?" is practically a national checkout step. Shoppers message the page to check sizes, stock, delivery areas and whether the photo matches the item.

**Surprise costs kill the sale.** This one is universal, but it hurts more when the budget is tight. Baymard's research puts the average documented cart abandonment rate at 70.22%. Among shoppers who abandon for reasons other than "just browsing", 40% blame extra costs like shipping and fees, and 12% say they couldn't see or work out the total up front ([Baymard Institute](https://baymard.com/lists/cart-abandonment-rate)).

> A Filipino shopper's checkout doesn't start at the cart. It starts in the chat window, and it ends when the rider hands over the parcel.

## The design approach

I treat the whole journey as the product: discovery, the chat, the cart, the payment and the delivery. Here are the decisions I keep coming back to.

### Mobile first, for real

"Mobile first" usually means the desktop layout squeezed down. I design the phone layout first and treat desktop as the expansion.

- Product cards are built for thumbs: big tap targets, the price in bold, and the main action within reach of the thumb.
- Images are cropped for portrait screens because that's where traffic comes from, especially from social links.
- Pages are kept light. Fewer heavy carousels, compressed images, and skeleton states so slow connections still feel responsive.

### Payment options as a trust signal

I put payment methods on the product page, not just at checkout. A small row saying COD, GCash, cards and bank transfer near the price answers the question before it turns into a reason to leave.

For cash on delivery, the design job is to set expectations:

- Show clearly whether COD is available for the shopper's area.
- Remind them to prepare the exact amount, and show it in big, plain numbers on the confirmation screen.
- Keep order tracking simple so the shopper knows when to expect the rider.

On the business side, COD carries risk, so I'll often design light friction for first-time COD orders, such as a confirmation message, rather than removing the option entirely.

### Messaging as part of the flow

Rather than fighting the urge to chat, I design for it. On the fashion app and site, that meant:

- A "Message us about this item" entry point on the product page that carries the product name, size and photo into the conversation, so the shopper doesn't have to describe it.
- Clear size guides and real-person photos to answer the most common questions before anyone types them.
- A visible store schedule for chat replies so silence doesn't read as "no stock."

### No surprises at the total

Given how often unexpected costs cause abandonment, I push for an estimated delivery fee as early as the product page, plus a running total in the cart that already includes shipping once a location is set. Vouchers and promos sit right next to the total so shoppers can see the effect immediately.

## Trade-offs

Not everything is a win.

- **COD versus operations.** Cash on delivery lifts reach but adds failed deliveries and reconciliation work. Design can ease this, but it's a business decision, and I present it to the client that way.
- **Chat versus self-service.** Every chat button adds load for a small support team. The goal is to make the page answer most questions so the chat handles only the real edge cases.
- **Speed versus brand richness.** Fashion clients love big visuals and motion. On a slow connection, those can stop the page from loading. We usually agreed on one hero moment per page and kept everything else lean.

## What came out of it

I can't share client numbers, but the pattern held. Once payment options and delivery fees were visible early, the team got fewer "how much is shipping?" messages and fewer carts left at the delivery step. The app also gave repeat buyers a faster path. Saved addresses and a preferred payment method made reordering a few taps instead of a full checkout.

## What I'd do next

- **Design for video commerce.** With video commerce growing fast, I'd want short product clips and live-selling replays on the product page itself, linked straight to the size and add-to-cart controls.
- **Test with real devices on real data.** I'd set up regular usability sessions on mid-range Android phones over mobile data, not office Wi-Fi.
- **Make COD smarter.** Use order history to offer COD confidently to trusted repeat customers while gently nudging new ones toward QR Ph or e-wallets.
- **Use Taglish where it fits.** Microcopy that sounds like the brand's chat replies feels more honest than stiff formal English, as long as it stays clear.

Filipino e-commerce isn't behind. It's different. Design for the phone, the chat and the cash, and the shop stops feeling like a foreign template.

## Sources

- BitPinas, "PH Digital Economy Posts 16% Increase" (e-Conomy SEA 2025 coverage): https://bitpinas.com/fintech/ph-digital-economy-2025/
- DataReportal, "Digital 2025: The Philippines": https://datareportal.com/reports/digital-2025-philippines
- Daily Tribune, "Cash on delivery still dominates PHL online shopping" (Xendit Ecommerce Payments Momentum Report 2026): https://tribune.net.ph/2026/10/20/cash-on-delivery-still-dominates-phl-online-shopping
- Baymard Institute, "Cart Abandonment Rate Statistics": https://baymard.com/lists/cart-abandonment-rate
