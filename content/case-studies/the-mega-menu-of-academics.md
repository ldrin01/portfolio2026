---
title: "The Mega Menu of Academics"
shelf: work
summary: "Making a university's hundreds of programs findable from one menu, and backing it up with a program finder that works on a phone."
order: 2
draft: false
seoTitle: ""
seoDescription: ""
cover: "/covers/the-mega-menu-of-academics.webp"
---

**Role:** Senior UI/UX Designer\
**Work:** Websites for two universities, including the main academic navigation and program finder\
**Under NDA:** Education, no client names or figures

University websites are some of the hardest navigation problems there are. A university is really dozens of organizations under one name: colleges, departments, graduate schools, admissions, research centers, student services and alumni offices. All of them want a spot in the top menu. On both university projects the main question was the same. How does a 17-year-old on a phone find the program they want?

## The program is the product

Nielsen Norman Group has studied university websites for years. Their University Websites report collects 152 design guidelines from usability research with high school students, transfer students, master's applicants and parents, in several countries ([Nielsen Norman Group](https://www.nngroup.com/reports/university/)). Elliance, writing about program finders, reports that almost half of prospective students (48%) did not realize a university offered the program they wanted, even when it did ([Elliance](https://aha.elliance.com/2024/06/27/academic-program-finders-best-practices-and-examples/)).

That number changes how you look at the whole site. If students cannot find the program, nothing else on the page matters.

## Most academic menus are an org chart

The usual academic navigation follows the internal structure:

1. Top level: colleges, named the way the university names them.
2. Second level: departments.
3. Third level, if the visitor gets that far: the degree programs.

This makes sense to staff. It does not make sense to a senior high student who knows they want "something with computers" and has no idea if that sits under engineering, science or business. A program listed under two colleges also makes people wonder if they are two different programs.

> Students do not browse a university by its org chart. They browse by what they want to study and whether they can get in.

## Why a mega menu fits

A mega menu suits this problem. NN/g says mega menus work well on large sites because users can "see rather than try to remember" their options, and the panel has room for grouping ([Nielsen Norman Group](https://www.nngroup.com/articles/mega-menus-work-well/)). A badly organized one is just a bigger mess. NN/g's examples of mega menus gone wrong include unclear structure, decorative images with no real content, and an organizing principle users cannot see ([Nielsen Norman Group](https://www.nngroup.com/articles/mega-menus-gone-wrong/)).

So the panel is the easy part. The structure under it is the real work.

## How to structure it

A good approach is to group programs by field of study, not by college, and to test the groups against the words students use when they describe what they want.

- **Fields of study** in plain words, like Business and Accountancy, Computing and IT, Health Sciences, Engineering, Education, and Arts and Communication.
- **Level** as a clear split: undergraduate, graduate and short courses.
- **One prominent link** to "View all programs", which opens the full program finder.

Colleges still get their own menu item and appear on each program page. Staff keep their view, and students do not have to start from it.

A few rules help:

- Each program appears once, with no duplicates across groups.
- Labels start with the most useful word. The menu says "Nursing", and the page carries the full degree name.
- No decorative imagery. A small slot for admissions deadlines is fine, because students look for that.

### Hover timing

Small timing details make a mega menu feel calm. NN/g recommends waiting half a second before a hover menu opens and keeping it open until the pointer has been outside it for half a second. It also notes that the best versions keep the panel open while the pointer moves diagonally toward it ([Nielsen Norman Group](https://www.nngroup.com/articles/mega-menus-work-well/)). These timings belong in the dev handover. Click and keyboard should open the panel too, so it does not depend on hover.

### Audience links

Universities like "For Students / For Parents / For Alumni" navigation. NN/g warns that it confuses people who belong to several groups or to none, and suggests using it as secondary navigation ([Nielsen Norman Group](https://www.nngroup.com/articles/audience-based-navigation/)). A cleaner split puts audience links in a small utility bar and keeps the main menu task-based: Academics, Admissions, Campus Life, Research, About.

## On a phone, the finder does the work

A mega menu does not carry over to a phone. On mobile, the Academics item can open a short list of fields, and each one leads to a filtered view of the program finder instead of another nested level.

The finder itself follows common best practice. Elliance recommends A to Z ordering, logical groupings by field of study, school, degree type or format, and filters on the same lines ([Elliance](https://aha.elliance.com/2024/06/27/academic-program-finders-best-practices-and-examples/)). A keyword search box at the top of the page helps too.

## Trade-offs

| Choice | What it gives | What it costs |
| --- | --- | --- |
| Group by field, not college | Students find programs faster | Some colleges lose their spot in the main bar |
| Show fields and top programs | A panel people can scan | The full list lives one click away |
| A program finder | Complete, filterable results | Program data has to stay accurate |

The college question is a political one. Every college wants top-level visibility. Teams usually get further by walking stakeholders through the site as a student would, step by step. For upkeep, simple CMS fields let staff update programs without touching the menu.

## What to do next

- **Tree testing first.** Check the field groupings with a tree test before any visual design.
- **Search terms.** Feed site search terms back into the labels. If students keep typing "IT", the label should probably say IT.
- **Career entry points.** Let students start from an outcome, like "I want to be a nurse", and land on the matching programs.
- **Program comparison.** A side-by-side of two or three programs, covering duration, requirements and fees, so students do not juggle browser tabs.

A mega menu is the doorway. Most of the design is in the room behind it.

## Sources

- Nielsen Norman Group, "University Websites" report: https://www.nngroup.com/reports/university/
- Nielsen Norman Group, "Mega Menus Work Well for Site Navigation": https://www.nngroup.com/articles/mega-menus-work-well/
- Nielsen Norman Group, "Mega-Menus Gone Wrong": https://www.nngroup.com/articles/mega-menus-gone-wrong/
- Nielsen Norman Group, "Audience-Based Navigation": https://www.nngroup.com/articles/audience-based-navigation/
- Elliance, "Academic Program Finders: Best Practices and Examples": https://aha.elliance.com/2024/06/27/academic-program-finders-best-practices-and-examples/
