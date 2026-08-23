---
layout: post
title: "Which part of a prompt moves which axis of a molecule?"
date: 2026-08-23
---

In [the last post]({{ site.baseurl }}/posts/2026/08/05/llm-molgen-design4/) I described an experiment: four models — Claude, Claude Science, Gemini and ChatGPT — were given a single prompt from Zhang et al. and asked to design molecules. The prompt supplied the task content and goal along with a specific design focus and a list of example molecules as context.

This time I added the paper's other three prompts, for four in total, and ran each five times. Each run asked for ten molecules, so **4 models × 4 prompts × 5 runs × 10 molecules = 800 candidates**. Only two things change between prompts: the **design focus** and the **evaluation table** of examples.

The short version:

- A looser design focus widened the search. But **even that widened search was narrow compared with the experimental library.**
- Growing the evaluation table from 9 molecules to 295 — a factor of 33 — barely moved the physicochemical properties. What it moved instead was **which chemical family the models picked** and **how often they suggested compounds that already exist.**
- The axes the prompt never specified, such as molecular size, lipophilicity and chain length, were **filled in by the model's own tendencies.**

---

## What was varied

The four design focuses:

- **D1** — binding ligands with 4 to 8 nitrogen atoms
- **D2, D3** — tri-dentate or tetra-dentate with a mix of N and O donor functional groups
- **D4** — structurally similar to bis-triazinyl bipyridines (BTBPs)

There were two evaluation tables. D1 and D2 received all 295 molecules; D3 and D4 (the prompt from the last post) received only 9. Those 9 were not an arbitrary sample — they are **every row in the 295-molecule table with `Target_metal = ORGANIC` and `Other_metal = AQUEOUS`**, i.e. the entire positive class, and they are also the first nine rows of the table. They make up 3.1% of it.

Note that **D2 and D3 share a design focus and differ only in the evaluation table.** That pair is a clean control for the effect of the examples.

The full prompts and all tables are in [molgen-llm-bench](https://github.com/Yeonji-Ji/molgen-llm-bench).

---

## The design focus changes the molecule wholesale

**Table 1. Structural profile by design** (200 molecules each)

| | D1 (4–8 N) | D2 (N/O mix) | D3 (N/O mix) | D4 (BTBP-like) |
| --- | --- | --- | --- | --- |
| nN mean / SD | 7.00 / 1.02 | 4.17 / 1.31 | 4.57 / 1.63 | 7.92 / **0.42** |
| nO | 0.07 | 1.68 | 1.63 | 0.08 |
| arom_N | 6.96 | **2.65** | 3.18 | **7.92** |
| rings / aromatic rings | 4.0 / 3.5 | 2.7 / 2.0 | 2.8 / 2.2 | **4.6 / 4.1** |
| rot_bonds | 9.8 | 12.5 | 11.5 | 12.0 |
| TPSA | 87.8 | **65.4** | 70.3 | **102.9** |
| MW / logP | 531 / 7.71 | 550 / 8.61 | 536 / 8.10 | **610 / 8.70** |
| unique molecules / scaffolds | 163 / **90** | 163 / 55 | 148 / 52 | 128 / **43** |
| similarity 0.25–0.85 / > 0.85 | 185 / 15 | **197 / 3** | 182 / 18 | **167 / 33** |
| logP > 3 violations | 0 | 0 | 1 | 2 |

Design by design:

**D4** produced a nitrogen-count standard deviation of 0.42 — effectively a single value, eight. Told to follow BTBPs structurally, the models reproduced the triazine-2 + pyridine-2 skeleton exactly, and unique scaffolds fell to 43 of 200, the lowest of any design.

**D1** has a nitrogen and ring count not far from D4's, yet more than twice the scaffold count at 90. The loose condition "4 to 8 nitrogen atoms" widened the space the models explored. However, **26.5% of those 200 molecules** were found in PubChem, so a wider search is not the same thing as a new compound.

**D2 and D3** drop to 2.7–3.2 aromatic nitrogens and the lowest TPSA (65–70). A **two-triazine skeleton was replaced by one pyridine plus an amide.** The whole family shifted toward pyridine carboxamides, which the next section examines. And because the focus explicitly said "mix of N and O", oxygen appears here where it does not in D1 or D4. From this result, **without an instruction to include oxygen, these models barely use it when designing Am/Eu extractants** (D1 nO 0.07, D4 0.08).

![Distinct Murcko scaffolds per design, with the spread of nitrogen count overlaid]({{ site.baseurl }}/assets/img/llm-molgen/v1/fig1_specificity_vs_diversity.png)

*Figure 1. Bars: distinct Murcko scaffolds per design. Dashed line: spread of nitrogen count within each design.*

Molecules exceeding the 0.85 similarity ceiling were most common in D4, at 33. Asking for structures similar to BTBPs and getting known BTBPs is an unavoidable violation. Meanwhile **not a single one of the 800 molecules fell below the 0.25 floor.** That can be read as good instruction-following, but it also means violations only ever happened in the direction of greater familiarity.

### The widened search is narrow to begin with

Loosening the design focus does widen things. Set against the experimental library, though, the picture changes.

**Table 2. Property distributions**

| | MW mean / **SD** | logP mean / **SD** |
| --- | --- | --- |
| Experimental (n = 295) | 549 / **338** | 7.19 / **4.54** |
| Generated (n = 800) | 557 / **101** | 8.28 / **2.29** |

**The means land almost exactly on target while the standard deviations shrink to a third or a half.** The experimental library runs from a 199 Da dialkyl amide to a 2,780 Da calixarene, and from an EDTA derivative at logP −2.2 to a calixarene at 36.6. The generated set spans only 303–851 Da and −0.0 to 15.0. The models do not make the tails. It is more accurate to say the AI is **filling in the centre of a known space densely** than that it is expanding chemical space.

![Molecular weight and logP distributions for the experimental library and the generated set]({{ site.baseurl }}/assets/img/llm-molgen/v1/fig2_property_distributions.png)

*Figure 2. Dashed lines are means. The experimental library extends well beyond the plotted range.*

---

## Yet the models converge on the same families

Looking at which cores were built turns up something interesting. Fourteen ligand families were assigned by SMARTS substructure matching, and the patterns were validated against the 295 experimental molecules first.

**Table 3. Core prevalence** (%, counts in parentheses)

| Core | Experimental 295 | D1 | D2 | D3 | D4 | Generated 800 |
| --- | --- | --- | --- | --- | --- | --- |
| **BTBP** | 2.7 (8) | 13.0 (26) | 0.0 (0) | 3.0 (6) | **74.0 (148)** | **22.5 (180)** |
| **BTP** | 1.0 (3) | **29.0 (58)** | 1.5 (3) | 5.5 (11) | 4.5 (9) | 10.1 (81) |
| **BTPhen** | 0.3 (1) | 10.5 (21) | 0.0 (0) | 2.0 (4) | 15.5 (31) | 7.0 (56) |
| bipyridine (any) | 5.4 (16) | 24.5 (49) | 19.0 (38) | 15.5 (31) | **76.0 (152)** | 33.8 (270) |
| phenanthroline (any) | 10.5 (31) | 17.5 (35) | 20.0 (40) | 15.5 (31) | 15.5 (31) | 17.1 (137) |
| **picolinamide** | 12.2 (36) | 2.0 (4) | **74.5 (149)** | **59.5 (119)** | 0.0 (0) | 34.0 (272) |
| DPA | 2.4 (7) | 0.0 (0) | 11.0 (22) | 15.0 (30) | 0.0 (0) | 6.5 (52) |
| PDA | 4.1 (12) | 1.0 (2) | 12.0 (24) | 10.0 (20) | 0.0 (0) | 5.8 (46) |
| bis-triazolyl-py | 0.3 (1) | 2.5 (5) | 1.5 (3) | 3.5 (7) | 0.0 (0) | 1.9 (15) |
| bis-benzimidazolyl-py | 0.0 (0) | 3.5 (7) | 0.0 (0) | 1.5 (3) | 0.0 (0) | 1.2 (10) |
| **DGA** | **28.8 (85)** | 0.0 (0) | 1.0 (2) | 2.5 (5) | 0.0 (0) | **0.9 (7)** |
| **malonamide** | **14.9 (44)** | 0.0 (0) | 0.0 (0) | 1.0 (2) | 0.0 (0) | **0.2 (2)** |
| **CMPO** | 4.7 (14) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (0) | **0.0 (0)** |
| P=O (phosphoryl) | 12.5 (37) | 0.0 (0) | 7.0 (14) | 0.5 (1) | 0.0 (0) | 1.9 (15) |

*Denominators: 295 experimental, 200 per design, 800 generated. A molecule can match more than one core, so columns sum to over 100%.*

**The distribution is close to inverted.** Diglycolamide (DGA), the largest family in the evaluation table at 28.8%, drops to 0.9% (7 of 800) in the generated set; malonamide goes from 14.9% to 0.2% (2 molecules); CMPO from 4.7% to zero. In the other direction BTBP rises from 2.7% to 22.5% and BTP from 1.0% to 10.1%, roughly tenfold each.

In other words, the models **do not reproduce the distribution of the table they were shown.** They pile into the soft N-donor families that come to mind when you say "Am/Eu selectivity" — a response to the prompt's stated goal drawn from prior knowledge.

By design, D4 executed the instruction almost literally at 74% BTBP. D1 was never told to make BTBPs and still produced 52.5% BTP/BTBP/BTPhen combined. In D2 and D3 the picolinamide family dominates at 74.5% and 59.5%. That is the family shift referred to in the previous section. Notably, the nine chain-amide molecules (DGA and malonamide), the real workhorses of the experimental table, appear **only in D2 and D3**, the two conditions that explicitly asked for oxygen, and even there only nine of them.

Core preference also separates the models.

**Table 4. Core prevalence by model** (%, 200 each)

| Core | ChatGPT | Claude | Claude Science | Gemini |
| --- | --- | --- | --- | --- |
| BTP + BTBP | 32.5 | 23.0 | 26.5 | **48.5** |
| BTPhen | **0.0** | 12.0 | 13.5 | 2.5 |
| phenanthroline (any) | **1.0** | 27.0 | **29.5** | 11.0 |
| picolinamide | 25.0 | **41.0** | 39.5 | 30.5 |
| P=O (phosphoryl) | **6.0** | 0.5 | 1.0 | 0.0 |

Claude and Claude Science use phenanthroline-based ligands at 27–30%, far above the others. ChatGPT barely touches them (1%, BTPhen 0%) and is the only model to reach for phosphorus chemistry (6%). Gemini concentrates 48.5% of its output in BTP plus BTBP, the most stereotyped of the four, which lines up exactly with its bottom-ranked scaffold diversity below.

### They arrive at the same molecules over and over

Going below the family level to individual compounds makes it sharper. Of the 800 candidates, 528 are unique structures, and **55 of those already exist in PubChem** (136 rows, 17.0%).

They include dihexyl-BTBP, CyMe4-BTPhen and tetraoctyl-phenanthroline-2,9-diamide — the actual reference compounds of this field — and **18 of the 55 came from two or more models.** High agreement between models signals low novelty rather than high confidence.

And crucially, **47 of those 55 (85%) never appeared in the prompt's evaluation table.** They were not copied from what the models saw; they were recalled from what the models know.

---

## What the evaluation table changes, and what it doesn't

**Table 5. D2 vs D3** (identical design focus, table 295 vs 9)

| | D2 (295) | D3 (9) |
| --- | --- | --- |
| MW / logP | 549.6 / 8.61 | 536.4 / 8.10 (n.s.) |
| nN / nO | 4.17 / 1.68 | 4.57 / 1.63 |
| unique molecules / scaffolds | 163 / 55 | 148 / 52 |
| similarity vs. 295 | 0.547 | 0.574 (p = 0.31) |
| **molecules with no oxygen** | **1.0%** | **14.0%** |
| **already in PubChem** | **5.5%** | **17.5%** |

MW, logP, atom counts, uniqueness — barely any difference. **Cutting the examples by a factor of 33 left the physical properties of the molecules unchanged.**

Looking at the raw data the first time, D3's similarity came out at 0.385, and I thought fewer examples meant more novel molecules. But the `max_sim_exp` column in the source CSV **had been computed against different references for different designs.** D1 and D2 were compared against all 295 molecules; D3 and D4 only against the 9 in their prompt.

Recomputed on a common reference of all 295, D3 comes to 0.574, statistically indistinguishable from D2's 0.547. The same holds against the 9-molecule set and against the 286 remaining after removing those 9 (p = 0.18 and 0.96). The artefact does more than shift an average. ChatGPT's D3 pass rate for the 0.25–0.85 window is 48% as reported against each prompt's own table, and **100%** on the common reference.

The lesson is plain: with a similarity metric, **what you compared against matters more than the number itself.**

### What did change: chemical family and reproduction

Two things broke while the properties held steady.

**First, instruction violations.** Molecules with no oxygen rose from 1% to 14% — a direct breach of "mix N and O". Eight of the nine examples given to D3 are nitrogen heterocycles (BTP, BTBP, bis-pyrazolyl-pyridine) and only one is an oxygen-bearing amide; the models appear to have been pulled toward those eight.

**Second, reproduction of known compounds.** The PubChem match rate tripled, from 5.5% to 17.5%.

On top of that, 16 generated molecules match an entry in the 295-molecule table at the canonical-SMILES level, and **15 of those 16 are in D3 and D4, with zero in D1.**

### The noisier table was the wider one

**Table 6. By table size** (400 molecules each)

| | 295-molecule table (D1, D2) | 9-molecule table (D3, D4) |
| --- | --- | --- |
| unique molecules | **322** | 267 |
| unique scaffolds | **139** | 90 |
| similarity vs. 295 | **0.552** | 0.616 |

Most of the 295-molecule table is not the target label, and 43% of it is `UNTESTED`. It is the noisy option. And yet it produced the wider space — 139 unique scaffolds — and a lower similarity of 0.552, meaning its molecules sit further from known compounds. **That runs against the intuition that clean, unambiguous examples are better.**

One caveat. D1/D2 and D3/D4 differ in design focus as well as evaluation table. The only clean separation of the two effects is D2 versus D3.

---

## The axes the prompt sets, and the axes the model sets

**Table 7. Structural profile by model** (200 each)

| | ChatGPT | Claude | Claude Science | Gemini |
| --- | --- | --- | --- | --- |
| nN mean / SD | 5.60 / 2.07 | 5.98 / 1.84 | **6.20** / 1.86 | 5.87 / 2.08 |
| nO | 0.93 | 0.82 | 0.73 | 0.99 |
| arom_N | **4.86** | 5.24 | **5.49** | 5.10 |
| rings / aromatic rings | **2.97 / 2.80** | 3.94 / 3.40 | **4.55 / 3.55** | 3.24 / 2.92 |
| rot_bonds | **12.84** | 14.76 | 13.22 | **19.41** |
| TPSA | 79.8 | 80.8 | 82.8 | 83.0 |
| MW | **486** | 569 | 586 | 586 |
| MolLogP | **6.62** | 8.61 | 8.78 | **9.12** |
| SA_score | **2.98** | 3.34 | **3.55** | 3.08 |

Put Table 1 (by design) and Table 7 (by model) side by side and the contrast is obvious. **Across designs, arom_N spans 2.65–7.92 and TPSA 65–103; across models they span only 4.86–5.49 and 79.8–83.0.** MW does the reverse, spanning 486–586 across models.

Summarised as variance explained: a two-way ANOVA of `property ~ C(model) × C(design)` over all 800 molecules, with each term's share of the total sum of squares (η²).

**Table 8. Variance explained (η²)**

| Descriptor | design | model | interaction | residual |
| --- | --- | --- | --- | --- |
| arom_N | **0.69** | 0.01 | 0.01 | 0.29 |
| TPSA | **0.48** | 0.00 | 0.01 | 0.51 |
| rot_bonds | **0.23** | 0.11 | 0.05 | 0.61 |
| MolLogP | 0.03 | **0.18** | 0.05 | 0.74 |
| MW | 0.10 | **0.17** | 0.04 | 0.70 |
| SA_score | 0.07 | **0.13** | 0.01 | 0.78 |

**Donor atom count and polarity are set by the prompt; molecular size, lipophilicity and synthetic difficulty are set by the model.** Every interaction term is at or below 0.05, so no model behaves oddly under one particular design.

The arom_N result is somewhat circular because the design focus specified nitrogen counts directly. The interesting one is **logP.** The prompt did constrain it ("greater than 3"), yet the model effect dominates at 0.18. With 797 of 800 molecules clearing that bar, the constraint never bound, and the model filled the axis on its own.

![Heatmaps of aromatic nitrogen count and logP across model and design]({{ site.baseurl }}/assets/img/llm-molgen/v1/fig3_design_model_heatmap.png)

*Figure 3. Cell values are means. The visual translation of Table 8.*

### Model tendencies

**ChatGPT** had the lowest MW and logP in all four designs, and the lowest ring count, rotatable-bond count and SA_score as well.

**Gemini** stands out at 19.41 rotatable bonds. The strategy is long alkyl chains to raise hydrophobicity, and it explains the highest logP at 9.12.

**Claude Science** has the most rings (4.55), the most aromatic rings (3.55) and the most nitrogen. That can be read as the most faithful skeleton for the stated goal — but its **SA_score is also the highest at 3.55**, meaning the highest estimated synthetic difficulty. The two are two sides of the same fact.

### The diversity ranking flips when you change the metric

Here is the most counterintuitive result of the experiment.

**Table 9. Diversity by model** (200 each)

| | ChatGPT | Claude | Claude Science | Gemini |
| --- | --- | --- | --- | --- |
| unique molecules | **188** | 147 | 153 | 119 |
| unique Murcko scaffolds | 74 | 67 | **82** | **43** |
| scaffolds per response (of 10) | 5.45 | 8.95 | **9.30** | 5.20 |
| run-to-run Jaccard, molecules | **0.02** | 0.05 | 0.06 | **0.13** |
| run-to-run Jaccard, scaffolds | 0.19 | 0.29 | 0.24 | **0.32** |

**ChatGPT ranks first on unique molecules (188 of 200) and near-last on scaffolds per response at 5.45.** It is changing substituents on the same skeleton. Claude Science is the reverse: 153 unique molecules but 82 scaffolds and 9.3 per response, the most of any model. **ChatGPT varies the substituents; Claude Science varies the cores.** Gemini is last on both.

Run-to-run reproducibility shows the same structure. Scaffold-level Jaccard (0.19–0.32) runs 2.5 to 10 times higher than molecule-level Jaccard (0.02–0.13), depending on the model. Each run yields different molecules, but those molecules are recombinations from a largely unchanging pool of cores.

![Unique molecules against unique scaffolds for each model]({{ site.baseurl }}/assets/img/llm-molgen/v1/fig4_diversity_levels.png)

*Figure 4. Marker area is proportional to distinct scaffolds per 10-molecule response.*

### Constraint compliance

Measured against the constraints stated in the prompt, violations sit almost entirely with one model.

- **logP > 3**: ChatGPT, Claude and Claude Science pass 200/200; **only Gemini violates, 3 times**
- **similarity > 0.85**: **Gemini, 50 of 200**; Claude 10, ChatGPT 5, Claude Science 4
- **similarity < 0.25**: 0 of 800

---

## What this post does not show

Some points from the last post bear repeating.

**There is no physical validation.** Every metric is an RDKit calculation, and MolLogP and SA_score in particular are predictions from structure rather than measurements.

**Am/Eu selectivity itself was never measured.** What this post measures is which part of a prompt moves which axis of the output, not which molecule is better.

**The two effects are not fully separated.** The only clean read on the evaluation table is D2 versus D3; D1/D2 got the 295-molecule table and D3/D4 the 9-molecule one, so the table is confounded with the design focus elsewhere.

**Five runs are independent replicates, not iterations.** Generated molecules never entered the table for a later run. Whether each run was truly independent is not something I can confirm.

**Temperature, top-p and seed were neither recorded nor controlled.** So differences in diversity between models cannot be separated from differences in sampling settings.

**The scaffold metric has limits too.** Murcko scaffolds collapse all acyclic molecules into one group and treat substituent changes on a shared core as identical. The reversal in Table 9 comes out of exactly that limitation. Just as the last post flagged the limits of Tanimoto, this one is best read as using the scaffold metric without trusting it.

---

## What to try next

- **A second scaffold metric** — add a ring-system-level measure alongside Murcko to determine whether the Table 9 reversal is a metric artefact or a real effect.
- **A full 2 × 2 crossing** — two design focuses × two evaluation tables, filled in completely, to separate the effects. Right now only D2 vs D3 is clean.
- **Scale up sampling** — 50 to 100 molecules per run instead of 10, to see whether the variance shrinkage in Table 2 eases. That distinguishes a sampling problem from a model problem.
- **A temperature sweep** — to check whether the diversity differences between models reproduce or vanish with settings.

---

*All supplementary tables (1–17) and the full 800-candidate dataset are in [molgen-llm-bench](https://github.com/Yeonji-Ji/molgen-llm-bench). Similarities were recomputed with Morgan fingerprints (radius 2, 2048 bits) against the entire 295-molecule experimental library; the source CSV's `max_sim_exp` and `dup_of_exp` were not used, because their reference sets differ by design.*
