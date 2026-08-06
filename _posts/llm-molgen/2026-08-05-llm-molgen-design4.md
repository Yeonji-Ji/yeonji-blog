---
layout: post
title: "I asked four chat AIs to design f-block extractants"
date: 2026-08-05
---

Most of us now use chat AI for small things: drafting an email, looking something up. I wanted to see what happens when you point the same tools at a real research task. So I gave four of them one prompt and asked each for ten new molecules.

All 40 came back as valid structures, and almost all of them respected the constraints I set. But five were compounds that had already been published, and the novelty constraint I had written into the prompt caught only two of them. Sorting out what was designed from what was recalled turned out to be the interesting part.

## The task

I used the "Design 4" prompt from our group's paper, [Zhang et al.](https://doi.org/10.1021/jacs.5c19738) It targets extractant ligands that separate europium from americium — a real problem in nuclear fuel reprocessing, where you need a molecule that grabs one f-block metal and not its near-twin.

The prompt gives the model nine experimental ligands as examples and asks for ten new SMILES strings that:

- resemble bis-triazinyl bipyridines (BTBPs) structurally, but with modifications
- stay between 0.25 and 0.85 Tanimoto similarity to the examples
- partition into the organic phase (logP > 3)
- are reasonably easy to synthesize and stable to strong acid and radiolysis

The paper's threshold table defines those cutoffs:

![Threshold table from the paper]({{ site.baseurl }}/assets/img/llm-molgen/design4/paper-threshold-table.png)

I ran it once each on Claude Opus 5, Claude Science, Gemini 3.1 Pro, and ChatGPT GPT-5.6 Sol.

One thing shaped the whole analysis. Without being asked, Claude Science returned not just SMILES but 2D structures, a design rationale for each candidate, similarity and synthetic-accessibility scores, and the RDKit code it used to compute them.

![Claude Science output]({{ site.baseurl }}/assets/img/llm-molgen/design4/claude-science-output.png)

That output format became my evaluation scheme. I computed the same quantities for the other three models so everything could be compared on equal terms.

All SMILES, scores, and scripts are in [molgen-llm-bench](https://github.com/Yeonji-Ji/molgen-llm-bench).

## What to compare against

Before looking at the candidates, I needed a reference point. The obvious one is the input itself: the nine experimental ligands I handed the models.

| Experimental set (n = 8) | MW | MolLogP | rot. bonds | Synthetic accessibility |
|---|---|---|---|---|
| mean | 510.1 | 6.57 | 5.9 | 3.81 |
| median | 532.7 | 6.37 | 3.0 | 3.47 |

One of the nine is a diglycolamide (DGA), a completely different class of extractant. With a logP of 12 and 34 rotatable bonds, it drags the average around on its own, so I left it out. Including it would move the mean to MW 530 and logP 7.18 — which would narrow the gaps I describe below, not create them.

## Did the models produce real molecules?

Yes, uniformly.

- All 40 SMILES parsed. No valence errors.
- No candidate duplicated an input molecule.
- Every model returned exactly ten.
- 38 of 40 kept the BTBP core: two triazine rings and two pyridine rings. The exceptions were one Claude candidate with a pyrazole substitution and one Claude Science candidate with a single pyridine.
- 36 contained only C, H, and N. Two ChatGPT candidates contained F; one Claude and one Gemini candidate contained O.

The prompt asked for stability to strong acid and radiolysis without specifying which kind of stability mattered, and fluorine is one reasonable reading of that. Only ChatGPT took it.

The scaffold result is boring on its face — everyone followed instructions. Read the other way, it says something sharper: **no model departed from the BTBP core at all.** Every bit of variation happened in the substituents.

## Constraint compliance

![Similarity to the experimental set]({{ site.baseurl }}/assets/img/llm-molgen/design4/similarity-to-experimental.png)

| Model | Within 0.25–0.85 | logP > 3 |
|---|---|---|
| ChatGPT | 10/10 | 10/10 |
| Claude | 10/10 | 10/10 |
| Claude Science | 10/10 | 10/10 |
| Gemini | 7/10 | 10/10 |

The logP threshold passed 40 out of 40, which means it did not distinguish anything. To say something useful about lipophilicity, I have to compare against the experimental distribution instead.

## Where the designs drifted

![Molecular weight versus MolLogP]({{ site.baseurl }}/assets/img/llm-molgen/design4/mw-vs-logp.png)

| Model | MW | MolLogP |
|---|---|---|
| Experimental | 510.1 | 6.57 |
| ChatGPT | 558.7 | 7.26 |
| Claude | 639.1 | 9.31 |
| Claude Science | 659.6 | 9.68 |
| Gemini | 638.9 | 9.21 |

Three of the four models moved the same way: heavier by about 130–150 g/mol and greasier by two to three log units. Molecular weight and logP correlate at r = 0.96 across all 40 candidates, which is really the point. Asked to make something partition into the organic phase, the models mostly made it bigger and hung alkyl chains off it.

Flexibility splits the same models in opposite directions:

![Rotatable bonds by model]({{ site.baseurl }}/assets/img/llm-molgen/design4/rotbonds-by-model.png)

| Model | min | median | max |
|---|---|---|---|
| Experimental | 2 | 3 | 19 |
| ChatGPT | 3 | 9 | 14 |
| Claude | 2 | 8 | 27 |
| Claude Science | 2 | 3.5 | 13 |
| Gemini | 3 | 17 | 27 |

Gemini's median of 17 shows this isn't one stray outlier — the whole set is floppy. That helps solubility in the organic diluent but costs entropy when the ligand wraps around a metal. Claude Science sits at the other end, close to the experimental set. But being rigid *and* having a logP near 9.7 means the lipophilicity comes from aromatic rings rather than chains, which brings its own problem: poor solubility in aliphatic diluents like dodecane, and a risk of third-phase formation. Neither end is simply better.

A note on what I dropped: topological polar surface area (TPSA) appears in most cheminformatics summaries, but here 36 of 40 candidates had exactly the same value. When the scaffold is fixed, the polar atoms are fixed too. The column carried no information, so I left it out, along with aromatic nitrogen count and hydrogen-bond donors for the same reason.

## What Tanimoto couldn't see

![Pairwise Tanimoto matrix]({{ site.baseurl }}/assets/img/llm-molgen/design4/tanimoto-matrix.png)

Four pairs of candidates came out at Tanimoto 1.000.

| Pair | Same SMILES? | |
|---|---|---|
| Claude 03 ↔ Claude Science *BisArTBu-BTBP* | yes | two interfaces, same molecule |
| Claude 07 ↔ Gemini 08 | yes | **two different companies' models, same molecule** |
| ChatGPT 05 ↔ Gemini 05 | no | cyclopentyl vs. cyclohexyl |
| Gemini 01 ↔ Gemini 04 | no | n-hexyl vs. n-heptyl |

The first two are the fun ones: independent models converging on identical structures.

The last two are the instructive ones. Those molecules are genuinely different — different formulas, different molecular weights — but ECFP4 fingerprints see them as the same. A fingerprint like this breaks a molecule into small substructure fragments and records which ones are present; Tanimoto then just compares the two lists. Fragments have a fixed radius, so a chain of six carbons and a chain of seven produce the same set of pieces. Chain length and ring size are invisible at this scale.

![Gemini's homologous series]({{ site.baseurl }}/assets/img/llm-molgen/design4/gemini-homologous-series.png)

That matters for Gemini specifically. Its three highest-similarity candidates are n-butyl, n-hexyl, and n-heptyl versions of the same ligand, and the input set already contained the n-propyl and n-pentyl versions. This isn't a lack of novelty so much as interpolation along a chain length — and the similarity metric the prompt used as a constraint cannot detect that kind of redundancy.

## Were they actually new?

I searched all 40 SMILES in PubChem. Five returned exact matches.

| Candidate | Model | Similarity to inputs | Inside 0.25–0.85? |
|---|---|---|---|
| Gemini 01 (n-hexyl BTBP) | Gemini | 0.969 | no |
| Gemini 09 (n-butyl BTBP) | Gemini | 0.906 | no |
| CyMe4-BTPhen | Claude Science | 0.686 | yes |
| Camphor-BTPhen | Claude Science | 0.762 | yes |
| CyMe4-BathoBTPhen | Claude Science | 0.558 | yes |

Unregistered rates: ChatGPT 10/10, Claude 10/10, Gemini 8/10, Claude Science 7/10.

**The similarity constraint was not a novelty filter.** The 0.25–0.85 window did the job it was written for — nothing copied the examples verbatim. But that number measures distance from the nine molecules I chose, not from the literature. With only nine reference points, a low score tells you nothing about whether a compound has been published. Three of the five known compounds sat comfortably inside the window; one scored 0.558, right in the middle.

The reverse doesn't hold either. Gemini's two hits scored high because my input list happened to be made of literature compounds, and homologues of a published ligand are usually published in the same paper. That's a property of my input, not of the metric. Novelty checking is a different job from generation constraints, and it needs a database.

**The names carried information.** Claude Science labeled all ten of its candidates. The three PubChem hits are exactly the three with real literature names — CyMe4-BTPhen is a well-known extractant. The other seven names are constructed from naming conventions and returned nothing. The model that recalled the most published compounds is also the only one that made that visible. The other three returned anonymous SMILES, where recall and design look identical until you run the search.

**One expectation was wrong.** ChatGPT stayed closest to the experimental distribution on size and lipophilicity, and had zero known compounds. Staying near the reference data and reproducing known molecules are separate axes.

And the fingerprint failure has a consequence here. Gemini 01 and Gemini 04 are identical at Tanimoto 1.000, but only 01 is in PubChem. Judging by the metric alone would have put them in the same bucket.

> PubChem absence is not proof of novelty. Coverage is incomplete and recent compounds are often not deposited. This was a single-source search; I did not check SciFinder or Reaxys. So "five known compounds" is a floor, not a ceiling.

## What this doesn't show

No physics. I ran no DFT, no complex stability calculations, no selectivity predictions. Whether any of these would actually separate Am from Eu is entirely unknown. Synthetic accessibility scores are a heuristic, not a route. And with ten molecules per model from a single run, with no control over temperature or sampling, I can't say how much of the difference between models would survive a second run.

What this does measure: whether the models follow stated constraints, whether they produce chemically plausible structures, and which direction they drift relative to the reference data. That's all.

## Next

The obvious follow-up is to loosen the constraints. The same paper has Designs 1 through 3, which give the model progressively more room, and I want to see what happens as the guardrails come off. This run gives me four numbers to compare against:

- BTBP core retained: 38/40
- Direction of drift in MW and logP relative to the experimental set
- Pairs at Tanimoto ≥ 0.95: 4
- Known compounds in PubChem: 5/40

I'll also add a scaffold-level measure, since Tanimoto demonstrably can't catch homologue redundancy, and make the database search a standard step rather than an afterthought.

All SMILES, scores, and scripts are in [molgen-llm-bench](https://github.com/Yeonji-Ji/molgen-llm-bench).

Zhang, B.; Summers, T. J.; Augustine, L. J.; Taylor, M. G.; Geist, A.; Li, R.; Batista, E. R.; Perez, D.; Yang, P.; Schrier, J. *Augmenting Large Language Models for Automated Discovery of F-Element Extractants.* J. Am. Chem. Soc. **2026**, 148 (5), 5520–5532. DOI: [10.1021/jacs.5c19738](https://doi.org/10.1021/jacs.5c19738)
