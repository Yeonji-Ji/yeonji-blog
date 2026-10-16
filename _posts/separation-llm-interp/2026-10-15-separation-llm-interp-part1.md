---
layout: post
title: "Inside a Fine-Tuned LLM for Solvent Extraction – Part 1"
date: 2026-10-15
series: Inside a Fine-Tuned LLM for Solvent Extraction
series_index: 1
---

## Probing and Patching

As models advance and begin to play a real role in scientific discovery, applying mechanistic interpretability (MI) to science is becoming more important. However, most research on understanding model internals has focused on general-purpose AI, and relatively little has been done in scientific domains.

When a model makes a scientific finding, MI in science can help determine, through internal analysis, whether that finding rests on verifiable scientific reasoning rather than on hallucination or memorized data. Science is also especially sensitive to errors, and MI may offer a chance to detect and prevent those risks in advance.

## Main Goal of the Project

In this project, we set out to see how a language model actually interprets scientific data and arrives at its answers.<br> 
Because the focus is on **mechanistic interpretability**, we fine-tuned a small model on real chemistry data and analyzed its internals in several stages.

In brief: <br>
we first used probes to check what information each layer of the fine-tuned model contains, and then used a sparse autoencoder (SAE) to take a closer look at the activations of a layer that the probe analysis flagged as notable. Going beyond whether the information is present, we also modified conditions in the input (here, the experimental conditions) and used other interventions to test whether the model actually uses that information to produce its answer.<br>
**Part 1** covers probing and patching and [**Part 2**]({{ site.baseurl }}/posts/2026/10/15/separation-llm-interp-part2/) covers the SAE.

Code, notebooks, and results are in [separation-llm-interp](https://github.com/Yeonji-Ji/separation-llm-interp).

## Fine-Tuning

### Data

Source: monoamide extraction data compiled by L. Augustine ([ACS Sustainable Chem. Eng. 2024, 12, 16692](https://dx.doi.org/10.1021/acssuschemeng.4c06166)), as reprocessed in [SeparationLLM](https://github.com/jschrier/SeparationLLM/tree/main).<br>
The task is to predict the distribution coefficient of a liquid–liquid extraction from the target metal, the extractant SMILES, and several experimental conditions.

*Example (one line of the chat-format JSONL):*

```json
{"messages": [
  {"role": "system", "content": "You are an expert liquid-liquid extraction chemist.\nUse the provided experiment description to predict the extraction selectivity.\nReturn only VL, L, U, M, H."},
  {"role": "user", "content": "1 M of CCCCC(CC)CN(CC(CC)CCCC)C(=O)C(C)C in n-dodecane is used to extract 800 mM U(VI) from an aqueous solution of 3 M HNO3 and 3 M nitrate at 20 C. The contact time is 20 min and the radiolytic dosage is 0 kGy."},
  {"role": "assistant", "content": "U"}
]}
```

- Task: classify the distribution coefficient D into 5 classes
- Split: train 1602 / val 400 / test 501

| Class | Range | Share |
| --- | --- | --- |
| VL | D ≤ 0.01 | ~10% |
| L | D ≤ 0.3 | ~25% |
| U | 0.3 < D < 3 | ~35% |
| M | D < 10 | ~22% |
| H | D ≥ 10 | ~8% |

### Training setup

We performed a simple fine-tuning of Qwen3-1.7B:

- Used LoRA (r = 16, α = 32, attention projections q/k/v/o)
- Fine-tuned on the training set for 3 epochs (batch size 2 × 4 gradient-accumulation steps, learning rate 1e-4, loss on the answer tokens only)
- Validation loss was computed after each epoch, and the checkpoint with the lowest validation loss was kept.

After fine-tuning, test accuracy rose from 0.11 (base model) to 0.59. This is not a perfect fine-tune, but we figured the accuracy sufficient for mechanistic analysis and moved on to the next step.

![Base vs fine-tuned accuracy]({{ site.baseurl }}/assets/img/separation-llm-interp/fig1_base_vs_ft_accuracy.png)

## Starting Mechanistic Interpretability

### Probe: Layer Analysis

As outlined above, we began interpreting the fine-tuned model with simple methods. The first was to train a separate linear probe on each layer and check whether we could see inside the model at all.

- **What is a probe?**<br>
  A probe is a simple model, such as a linear model, used to analyze the internal workings and hidden information (representations, hidden states) of a large language model (LLM).
  It lets us check whether a specific piece of information can be read out linearly from a layer's vectors, and monitor at which layers a given concept in the data appears and changes.

We used simple linear models, logistic regression (D class, metal identity) and ridge regression, R² (HNO<sub>3</sub> concentration, molecular weight), trained separately on the last-token vectors of all 28 layers of both the base and fine-tuned models. To rule out the possibility that the model had memorized the training set, the probes were trained on the validation set and evaluated on the test set.

With these probes, we examined where information first appears and where it strengthens across the layers of the base and fine-tuned models. We probed for the answer the model must produce (D class) and for the input conditions (metal, HNO<sub>3</sub>, ligand molecular weight).

![Probe scores by layer for D class, metal identity, HNO₃ concentration, and molecular weight, base vs. fine-tuned]({{ site.baseurl }}/assets/img/separation-llm-interp/part1_fig2_probe_2x2.png)

- For the experimental conditions, the scores (accuracy and R²) were close to or above 0.9 from the very first layers, showing that the input information is already present to a good degree.
- For the D class, the scores changed clearly with depth. In the fine-tuned model in particular, accuracy rose from 0.52 to 0.62 after layers 16–17, opening a clear gap from the base model.
- We can read this as fine-tuning teaching the model to interpret the input conditions toward the answer in its later layers. However, this alone does not prove that the model actually uses that information. To test this, we examined the causal relationship further with **counterfactuals** (changing the input) and **patching** (swapping internal vectors).

### Counterfactual

We replaced the HNO<sub>3</sub> concentration in the input with a counterfactual value and checked whether the concentration information is actually used to predict D.

- **D-class score:** <br>
the expected class index (VL=0, L=1, U=2, M=3, H=4), computed by taking a softmax over the five label-token logits at the last position.

For one example, we compared predictions at 1 M and 6 M HNO<sub>3</sub>. The final prediction was U in both cases, but the D-class score showed the model leaning toward a higher class at 6 M. This matches the expected trend that the distribution coefficient increases at higher acid concentration.

|  | VL | L | U | M | H | D-class score |
| --- | --- | --- | --- | --- | --- | --- |
| 1 M | 0.05 | 0.43 | 0.46 | 0.05 | 0.01 | 1.53 |
| 6 M | 0.01 | 0.05 | 0.47 | 0.36 | 0.11 | 2.52 |

The cosine distance between the two activations rose sharply at layers 18–23, making this range a candidate for where concentration information is processed.

![Cosine distance between the 1 M and 6 M activations by layer]({{ site.baseurl }}/assets/img/separation-llm-interp/fig9_1M_vs_6M_activation_cos_dist_100_sample.png)

### Patching

![Patching schematic]({{ site.baseurl }}/assets/img/separation-llm-interp/part1_fig4_patching_schematic.png)

Next, going beyond changing the concentration value in the input, we swapped the internal last-token vector. We inserted the vector from the 6 M run into the 1 M run and used recovery to measure whether, and at which layer, the D prediction changes.

- Recovery = (D_<sub>patched</sub> − D_<sub>1M</sub>) / (D_<sub>16M</sub> − D_<sub>1M</sub>), i.e. how far the prediction moves from the 1 M run toward the 6 M run.

Recovery stayed close to 0 and then rose to nearly 1 around layers 18–19. This shows that although concentration information can be read out from early layers, the model starts to rely on the concentration information carried by the last token only from layers 18–19 onward.

![Recovery by layer, 50 samples]({{ site.baseurl }}/assets/img/separation-llm-interp/fig12_frac_recovery_50_sample.png)

This agrees with the counterfactual result, where the change occurred at layers 18–23, so we chose to focus on **layer 19**. As the next step, we trained a **sparse autoencoder** on the layer-19 activation vectors to examine which features use the concentration information, and to what extent. We will cover those results in [Part 2]({{ site.baseurl }}/posts/2026/10/15/separation-llm-interp-part2/).
