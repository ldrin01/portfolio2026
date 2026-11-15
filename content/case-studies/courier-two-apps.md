---
title: "Two Apps, One Trip"
shelf: work
summary: "A courier customer wants to book and track. A driver wants big buttons and few steps. I designed two mobile apps for the same trip, with different priorities."
order: 20
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/courier-two-apps.webp"
---

**Role:** Lead Designer\
**Work:** Two mobile apps for a trucking and courier business, one for customers and one for drivers, with route tracking and multi-stop booking\
**Under NDA:** Logistics, no client names or figures

One delivery involves two people who want very different things. The customer wants to book a courier, add several stops, watch the trip on a map and decide who pays. The driver is working. They follow a planned route, collect payments and documents, log the odometer reading for fuel tracking, and take progress photos at each stage of the trip.

It helps to picture both people at the same moment. The customer is usually at a desk or on a couch, with time to read. The driver is in or next to a vehicle, with one free hand and not much attention to spare. One app for both would fit neither of them.

> The customer app is about choosing. The driver app is about finishing.

## Two apps, because the users share almost no screens

These are two separate apps, not one app with two modes. Look at what each person needs:

| | Customer app | Driver app |
| --- | --- | --- |
| Main job | Book and track | Drive and report |
| Context | Desk or couch | Vehicle, on the move |
| Screens | Multi-stop booking, live map, payment choice | Trip stages, photos, odometer, payments, documents |
| Design focus | Clear choices, rich tracking | Large touch targets, short flows |

Two apps mean two builds and two sets of maintenance. That is a real cost, and it is worth explaining to a client up front. The other option is one crowded app, which is usually the worse deal.

## The driver app follows the trip stage by stage

A trip has stages, and each stage has things the driver must record: the odometer reading, payments, documents and photos. Instead of one long checklist, each input is tied to the stage where it naturally happens, and the app shows only what that stage needs.

- The driver does not scroll through a long menu while working.
- Nothing is asked twice.
- Required steps are clear, so they are hard to skip by accident.

This matters to the business as well. If required steps are easy to skip, the records have gaps. If they are hard to do, drivers skip them anyway. The goal is to make the right action the easiest one.

Two rules from Laws of UX shaped these screens. Hick's Law says more choices mean a longer time to decide, so each stage shows few options ([Laws of UX](https://lawsofux.com/hicks-law/)). The Doherty Threshold says people stay productive when the system responds fast, so every tap should give feedback right away ([Laws of UX](https://lawsofux.com/doherty-threshold/)).

## The customer app handles several stops and one big question

A customer may send a parcel to more than one place, so booking has to handle multiple stops without turning into a long form. Adding a stop, reordering stops and seeing the whole route before confirming are the parts that need the most care. After booking, a live map shows where the trip is.

### Who pays is a choice made at booking

Sender pays and receiver pays change the whole flow. Putting this choice into booking means nobody finds out about it at the door. The point is to settle payment before the trip starts.

## One visual language

The two apps do different jobs, but they come from the same company. One set of colors, type and components makes both feel like the same service. Only the density changes: the customer app has more room, and the driver app has bigger targets.

## What to check next

- **Test with drivers in a vehicle.** A flow that works at a desk can fail with gloves, glare or a bumpy road. Watching real drivers use it before the layout is final shows what a desk test misses.
- **Simplify the driver flow further.** Every extra field at the end of a stage is a chance to skip it. It helps to keep asking which inputs the app can fill in from data it already has.

The same business can have users with opposite needs on the same day. A good design respects both and does not force them onto one screen.

## Sources

- Laws of UX, "Hick's Law": https://lawsofux.com/hicks-law/
- Laws of UX, "Doherty Threshold": https://lawsofux.com/doherty-threshold/
