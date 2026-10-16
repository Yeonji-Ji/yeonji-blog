---
layout: post
title: "Inside a Fine-Tuned LLM for Solvent Extraction – Part 2"
date: 2026-10-15
series: Inside a Fine-Tuned LLM for Solvent Extraction
series_index: 2
---

## Sparse Autoencoder

In [Part 1]({{ site.baseurl }}/posts/2026/10/15/separation-llm-interp-part1/), we used probes to find what information is represented in each layer of the fine-tuned model, and then changed the input conditions and swapped internal vectors to test whether that information (here, HNO<sub>3</sub> concentration) causally affects the final prediction. This identified layer 19 as the point where concentration information is gathered for the final prediction. In Part 2, we use a sparse autoencoder (SAE) to decompose the layer-19 vector into components and examine which features it contains and what each one means or does.

Code, notebooks, and results are in [separation-llm-interp](https://github.com/Yeonji-Ji/separation-llm-interp).

## What is a sparse autoencoder?

An SAE is a specialized neural network widely used in mechanistic interpretability. Activation vectors inside an LLM usually do not represent a single concept cleanly. Because they hold more concepts than they have dimensions, a single neuron can represent several unrelated concepts. The SAE encoder maps the activation vector into a higher-dimensional latent space, giving distinct concepts enough room to be represented separately. In that expanded space, only the features that clearly stand out are kept, and, as the name "sparse" suggests, the rest stay at zero. The decoder then reconstructs the original vector from this small subset of active features. With this design, an SAE decomposes tangled internal activations into components that are easier for humans to interpret.

## SAE on Layer 19

We used a Top-K SAE with K = 64. The SAE encodes the layer-19 last-token vector into 2048 feature values, keeps only the 64 largest, and sets the rest to zero. It then decodes these 64 features back into a vector of the original size and is trained to minimize the difference between the reconstructed and original vectors (MSE loss). Training used the vectors extracted from the training and validation sets (2002 in total).

![SAE schematic: layer-19 vector to 2048 features, top 64 kept, then reconstruction]({{ site.baseurl }}/assets/img/separation-llm-interp/part2_fig1_sae_schema.jpg)

We then passed the layer-19 vectors of the validation samples through the trained SAE to obtain per-sample feature values, computed the correlation of each feature with the [D-class score]({{ site.baseurl }}/posts/2026/10/15/separation-llm-interp-part1/#counterfactual), and selected the top 10 high-D and top 10 low-D features.
The correlations were similar on the validation and test sets, so we focused on these 20 features, split into high-D and low-D groups.

**Top 3 of each group (top 10 in the notebook)**

| Feature | Direction | val corr | test corr |
| --- | --- | --- | --- |
| 1208 | High-D | +0.568 | +0.576 |
| 380 | High-D | +0.522 | +0.543 |
| 1205 | High-D | +0.521 | +0.524 |
| 827 | Low-D | −0.538 | −0.541 |
| 1615 | Low-D | −0.522 | −0.536 |
| 245 | Low-D | −0.508 | −0.527 |

## The 20 Features

### Metal

To check whether these features are related to the metal, we split the samples by metal and recomputed the correlations. The correlations largely held for Pu and U but almost disappeared for Th and Np. Because the feature–D correlation was not consistent across metals, it is hard to say that these features directly encode metal identity.

### HNO<sub>3</sub> concentration

We ran several experiments on concentration. First, as in the counterfactual analysis in Part 1, we raised the HNO<sub>3</sub> concentration from 1 M to 6 M and looked at how the feature values changed. Consistent with the expectation that D increases with acid concentration, the high-D features increased and the low-D features decreased.

![Change in the 20 feature values from 1 M to 6 M HNO₃]({{ site.baseurl }}/assets/img/separation-llm-interp/part2_fig2_feature_change_1M_6M.png)

Similarly, when we raised the concentration stepwise from 0.5 M to 8 M, the high-D features tended to increase and the low-D features tended to decrease, confirming that these 20 features respond to changes in HNO<sub>3</sub> concentration.

![Mean SAE activation of the high-D and low-D features across HNO₃ concentrations]({{ site.baseurl }}/assets/img/separation-llm-interp/fig13_high_low_D_features.png)

Next, we checked whether these features still correlate with D with the fixed concentration. We took one high-D and one low-D feature (1208 and 245), grouped samples with the same HNO<sub>3</sub> concentration, and computed the correlation between each feature and D within each concentration. If these features responded only to concentration, the correlation should be close to zero at a fixed concentration. Instead, 1208 still showed a positive correlation and 245 a negative one, suggesting that both features carry information beyond acid concentration.

## Were These Features There From the Start?

To check whether these prominent features emerged through fine-tuning, we fed the same 1 M / 6 M HNO<sub>3</sub> prompt pairs from many samples into both the base and fine-tuned models, extracted the layer-19 vectors, and compared their SAE feature values.
The SAE reconstruction quality differed markedly (0.976 vs. 0.438), and only the fine-tuned model's D prediction responded to the concentration change. The high-D and low-D features were also active only in the fine-tuned model.
In other words, at least in terms of these SAE features, the base model's layer 19 did not respond to HNO<sub>3</sub>, and these features emerged after fine-tuning.

## Intervening on Features

Beyond observing changes in feature values, we wanted to see how the model actually uses these features. To do so, we modified the features, reconstructed the layer-19 vector with the SAE, patched it into the fine-tuned model, and ran the prediction.

### Setting feature values directly: one sample

First, we picked one clear example and looked at how the prediction changes when we modify its features. We chose a sample at 1 M HNO<sub>3</sub> in which, when run through the fine-tuned model, feature 1208 was zero and only 245 was active. Using the D-class score at 6 M as the reference, we set features 1208 and 245 to various values and observed how the score changed.

Raising 1208 from zero to its median value increased the D-class score by 0.10, from 1.18 to 1.28. Raising it further to its 95th-percentile value increased the score by 0.46, to 1.64. Keeping 1208 at zero and turning 245 off lowered the score by only 0.01, and setting 1208 to its median on top of that brought the score back to 1.28 regardless of 245. So increasing 1208 raised the predicted D-class score, while turning 245 off had almost no effect.

Sample used:

> 1 M of CCCCC(CC)CN(CC(CC)CCCC)C(=O)CCC in TPH is used to extract 0.3 mM Pu(IV) from an aqueous solution of 1 M HNO3 and 1 M nitrate at about 20 C. The contact time is 10 min and the radiolytic dosage is 0 kGy.

Results:

| Condition | D-class score | Δ vs. 1 M |
| --- | --- | --- |
| Real 1 M prediction | 1.18 | — |
| Real 6 M prediction (target) | 3.62 | +2.44 |
| No change (check) | 1.18 | +0.00 |
| 1208 → median | 1.28 | +0.10 |
| 1208 → 95th percentile | 1.64 | +0.46 |
| 245 → 0 (turned off) | 1.17 | −0.01 |
| 1208 → median + 245 → 0 | 1.28 | +0.10 |

### Patching in 6 M feature values: one sample

Next, we replaced the features of the same sample with their values from the 6 M run. Replacing only 1208 gave a recovery of 9%, and replacing all 20 D-correlated features (10 high-D + 10 low-D) gave 44%.

We then replaced features with their 6 M values in order of how much they changed between 1 M and 6 M. In this sample, 100 features changed between 1 M and 6 M, and replacing only the 20 most-changed ones already brought recovery to about 81%. So, at least in this sample, the HNO<sub>3</sub> effect is spread over multiple features but concentrated in a relatively small number of them.

### Patching in 6 M feature values: many samples

Finally, we extended the same experiment to many samples. To make the effect clear, we used only samples whose D-class score differed by at least 0.3 between 1 M and 6 M, leaving 401 samples. In each sample, we replaced the top 1, 5, 10, 20, and 50 features (ranked by how much they changed from 1 M to 6 M) with their 6 M values, computed the recovery for each sample, and compared the medians.

Results:

| Features patched (6 M → 1 M) | Median recovery |
| --- | --- |
| Top 1 most-changed | 13% |
| Top 5 | 40% |
| Top 10 | 60% |
| Top 20 | 76% |
| Top 50 | 89% |
| 20 random features | 15% |
| 20 D-correlated features | 39% |

![Median recovery vs. number of patched features, with random and D-correlated baselines]({{ site.baseurl }}/assets/img/separation-llm-interp/part2_fig4_recovery_vs_features.png)

- Feature 1208, which we had been following, responded in 320 of the 401 samples, and its median rank by change size was 3, making it one of the main features that carry the HNO<sub>3</sub> effect.
- Replacing the top 20 features gave about 76% recovery. Although these 20 features differ from sample to sample, this means that out of 2048 features, about 20 per sample carry roughly three quarters of the HNO<sub>3</sub> effect. With 20 random features giving only 15%, these are not just any 20 features but ones that carry concentration information.
- Interestingly, replacing the 20 D-correlated features selected at the start gave only about 39% recovery, and these 20 overlapped with each sample's top 20 by only 4 features on average.
- Considering that, chemically, acid dependence differs from ligand to ligand and different factors determine the distribution coefficient, it may be quite natural that the features most responsive to acid concentration vary across samples and do not overlap much with the features most correlated with the D-class score.
- In addition, as the fixed-concentration experiment showed, the D-correlated features, including 1208, carry information beyond acid concentration, suggesting a structure in which this information is combined later to predict D.

## Conclusion

Through these SAE experiments, we identified features in layer 19 that are related to D prediction and examined how these features, as well as others, change the D prediction when the acid concentration changes.

Taken together, the results show that a feature being highly correlated with D does not mean the model directly uses it. Rather than each feature holding a single piece of information, the D-correlated features carry information from several factors besides acid concentration, and the model may combine this information in later layers to produce its output. In particular, feature 1208 is both a D-correlated feature and frequently among the top 20 features most responsive to acid concentration, suggesting it may act as a point where these different kinds of information come together. However, this analysis trained a single SAE on layer 19 alone and examined only the last-token vector, so extending these experiments is left for future work.
