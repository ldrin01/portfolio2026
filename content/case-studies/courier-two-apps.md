---
title: "Two Apps, One Trip"
shelf: work
summary: "A courier customer wants to book and track. A driver wants big buttons and few steps. I designed two mobile apps for the same trip, with different priorities."
order: 20
draft: true
seoTitle: ""
seoDescription: ""
cover: "/covers/courier-two-apps.webp"
---

| | |
| --- | --- |
| **Industry** | Logistics: trucking and courier |
| **My role** | Lead Designer |
| **Scope** | Two mobile apps (customer and driver), trip-stage flows |
| **Tools** | Figma |
| **Team** | TODO: size and roles |
| **Timeline** | TODO: months and phases |

## The problem

One delivery has two very different people involved. The customer wants to book a courier with several stops, watch it move on a map and decide who pays. The driver is working: following a route, collecting payments and documents, logging the odometer reading for fuel tracking, and taking progress photos at every stage of the trip.

A single app would have to serve both and would serve neither well.

## My role

I designed both apps end to end. TODO: add anything about who else was involved (for example, system analysts, backend developers) and what you decided versus what the client decided.

## Process

1. **Two sets of users, two sets of notes.** I wrote down what each person is doing, where they are and what they can see. A customer is usually at a desk or on a couch. A driver is in a vehicle.
2. **Driver app: stage by stage.** A trip has stages, and the app shows only what's needed for the current stage. The driver isn't asked to choose from a long menu while driving.
3. **Customer app: multi-stop booking and live tracking.** Several stops, a map, and a clear choice of whether the sender or the receiver pays.
4. **One visual language** so both apps feel like the same company.

TODO: add anything you tested or reviewed with real drivers or the client.

## Key decisions

### 1. Two separate apps, not one with two modes

Drivers and customers share almost no screens. Splitting them let each app be simple and let me design for the right context: large touch targets and short flows for the driver, richer booking and tracking for the customer.

**Trade-off:** two apps mean two builds and two sets of maintenance. The client's developers accepted that because the alternative was a crowded single app.

### 2. Guided trip stages for the driver

The driver has required inputs at each stage: the odometer reading, payments, documents and photos. Instead of one long checklist, I tied each input to the stage where it naturally happens. Required actions are clear, and nothing is asked twice.

**Why it matters:** if required steps are easy to skip, the business loses its records. If they're hard to do, drivers skip them anyway.

### 3. "Who pays" as a first-class choice

Sender-pays and receiver-pays change the whole flow, so the choice is made when booking, not discovered at the door.

TODO: add the real story behind one decision, such as a driver-feedback moment, a rule that changed late, or something that didn't survive.

## Outcome

- Delivered two mobile apps: a customer app for multi-stop booking and tracking, and a driver app with guided trip stages
- TODO: live? Date? Number of drivers or trips if known
- TODO: a real quote or result

## What I'd do differently

TODO: your answer. Prompts: Would you test with drivers in a vehicle? What would you simplify in the driver flow?

## Why this project matters to me

It showed me that "the user" is often more than one person. The same business can have users with opposite needs on the same day, and a good design respects both without forcing them into one interface.

## Sources

- Laws of UX, "Doherty Threshold": https://lawsofux.com/doherty-threshold/
- Laws of UX, "Hick's Law": https://lawsofux.com/hicks-law/
