---
layout: post
title: "Do 3D descriptors give us more information?"
date: 2026-09-30
series: Adding 3D information
series_index: 1
---

In the [JACS paper (Zhang et al.)](https://doi.org/10.1021/jacs.5c19738), an XGBoost classifier was trained on ~8000 experimental rows covering 295 unique ligands to score newly generated molecules. In the dataset, each row had 1,860 features which included 2D ECFP fingerprints, RDKit descriptors, and experimental conditions and metal properties. These 2D features are identical for a given ligand regardless of the metal, and they carry no information about 3D binding geometry. 

So, we had a question here. Each row pairs a ligand with a specific metal. If we describe the actual 3D metal–ligand complex instead, can the model learn more?

Here is what we did in this experiment to test 3D descriptors:

- Built a 3D structure for each metal–ligand complex with g-xTB.
- Summarized the results with persistent homology (PD summary features and persistence images).
- Trained XGBoost with persistent homology results and compared 2D and 3D.
    - Scope: used 1,471 complexes, 7,053 of the 8,075 rows. 
    - 1,022 rows were left out because g-xTB could not give reliable structures for them, mostly uranyl-type (+5/+6) complexes.

In short, 3D descriptors did not improve on the 2D model. Unfortunately, we found their information largely overlaps with the 2D features. 

I want to share more details about the experiment.

You can also find the results: [3d-descriptor-xgb](https://github.com/Yeonji-Ji/3d-descriptor-xgb).

---

## Turning a 3D structure into features

Persistent homology describes the shape of a point cloud by watching how it connects as you "zoom out". Treat each atom as a point and grow a ball around every atom at the same rate. As the radius grows, balls start to touch, atoms join into clusters, and at some sizes they close into rings, which later fill in and disappear. Each of these events is recorded with the distance at which it appeared and disappeared.

Two kinds of events matter here:

- **H0 (connections):** two groups of atoms merge. Most of these correspond to bonds, and the distance is roughly the bond length.
- **H1 (loops):** a ring forms and later closes up. These are aromatic rings and the chelate rings a ligand forms around the metal.

![Growing a ball around each heavy atom of an Eu–BTBP complex. Bonds connect first, then the metal–donor contacts, and finally the chelate rings close.]({{ site.baseurl }}/assets/img/3d-descriptor/s1/fig1_filtration.png)

### What we fed in

We did not use the whole structure in one piece. Each complex was split into three atom sets:

- all heavy atoms (the full ligand shape),
- the metal plus N and O donors, and
- the same with S added, for sulfur ligands.

Events were then grouped by distance: covalent bonds (< 1.8 Å), metal–donor contacts (1.8–3.0 Å), and longer-range structure (3.0–8.0 Å). A donor counts as bound to the metal within 3.2 Å (3.3 Å for S). Loops were weighted by how long they persist because short-lived loops are mostly noise; anything lasting 0.5 Å or more gets full weight.

The result is a persistence diagram: one point per event, placed by when it appeared and how long it lasted.

![Persistence diagram of one complex. Blue: connections (mostly bonds and metal–donor contacts). Orange: rings. Shading marks the distance ranges used for the summary features.]({{ site.baseurl }}/assets/img/3d-descriptor/s1/fig2_persistence_diagram.png)


We used it in two ways to train the model. 

- A set of summary numbers (how many bonds, loops and metal contacts fall in each distance range, and how long they last).
- A persistence image, where each point is blurred onto a grid and the pixels become features.

---

## Results of training

To compare the effects, we built six feature sets, from the previous 2D-descriptors, PD summary only, PI only, and combinations. Here "2D" means the ECFP fingerprint. All six sets also include RDKit descriptors, experimental conditions and metal properties, so "PD summary only" means PD summary in place of ECFP. 

Denticity (fs2) was added as a control: if PD helped, we wanted to know whether it was more than just counting donor atoms.

| Feature set | n_features | CV acc (mean ± sd) | CV train acc | Test acc | Test F1 (macro) | Importance of added block |
| --- | --- | --- | --- | --- | --- | --- |
| fs1: 2D | 1860 | 0.660 ± 0.030 | 0.970 | 0.711 | 0.691 | – |
| fs2: 2D + denticity | 1861 | 0.665 ± 0.026 | 0.953 | 0.728 | 0.719 | 0.001 |
| fs3: PD summary | 258 | 0.646 ± 0.031 | 0.959 | 0.684 | 0.686 | 0.141 |
| fs4: PI | 1018 | 0.650 ± 0.040 | 0.973 | 0.682 | 0.648 | 0.366 |
| fs5: 2D + PD summary | 1929 | 0.642 ± 0.051 | 0.973 | 0.695 | 0.673 | 0.029 |
| fs6: 2D + PI | 2689 | 0.645 ± 0.055 | 0.970 | 0.659 | 0.643 | 0.165 |

*CV acc is accuracy on held-out ligands during cross-validation; CV train acc is accuracy on the training ligands (the gap shows overfitting). Importance is the share of the model's feature importance taken by the added 3D block.*

![Cross-validation accuracy of the six feature sets. All overlap within one standard deviation of the 2D baseline.]({{ site.baseurl }}/assets/img/3d-descriptor/s1/fig4_cv_accuracy.png)

What we could read from the results was:

1. CV accuracy was 0.642–0.665 for all six sets, with fold-to-fold sd of 0.03–0.055, so no set is distinguishable from 2D.
2. The 2D + denticity (fs2) scored highest (acc 0.728, F1 0.719) for the test acc, but denticity had near-zero importance (0.001) and the test set holds only 15 ligands, so this is not attributed to denticity.
3. PD summary alone (fs3, 258 features) reached ~0.68 test accuracy and F1, close to 2D (1860 features) but still lower, suggesting it carries much of the same information.
4. Adding PD summary or PI to 2D did not improve on 2D in CV or on the test set.
5. From the importance, PD summary and PI were used heavily on their own (0.14 and 0.37) but when 2D was present, the values decreased (0.03 and 0.17): their information overlaps with 2D.
6. All sets overfit strongly (train accuracy 0.95–0.97 vs CV ~0.65).

---

## What the 3D descriptors capture, and what we learned

Looking at the diagrams, most of the signal comes from two things: which atoms are bonded, and which rings exist. That is useful information, but it is also much of what ECFP already encodes. The feature importances show this directly: on their own, PD summary and PI were used heavily, but next to ECFP the model relied on them much less.

![Share of the model's feature importance taken by the 3D descriptors, on their own and alongside the 2D fingerprints.]({{ site.baseurl }}/assets/img/3d-descriptor/s1/fig5_importance_3d_block.png)

All six feature sets also overfit to the training ligands and stalled at a similar CV accuracy. That suggests the number of ligands (267 in trainVal), rather than the choice of descriptor, is the main bottleneck. In short, more geometry did not mean more information.

---

You can find the results: [3d-descriptor-xgb](https://github.com/Yeonji-Ji/3d-descriptor-xgb).

Zhang, B.; Summers, T. J.; Augustine, L. J.; Taylor, M. G.; Geist, A.; Li, R.; Batista, E. R.; Perez, D.; Yang, P.; Schrier, J. *Augmenting Large Language Models for Automated Discovery of F-Element Extractants.* J. Am. Chem. Soc. **2026**, 148 (5), 5520–5532. DOI: [10.1021/jacs.5c19738](https://doi.org/10.1021/jacs.5c19738)
