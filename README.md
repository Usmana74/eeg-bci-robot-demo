# Brain → Robot: EEG motor-imagery decoder with a virtual robot

Final Year Project 2026 · PMAS-AAUR Rawalpindi · Supervisor: Prof. Dr. Yaser Hafeez

**Live demo:** see the repository's GitHub Pages link (About → Website).

A leakage-free test of an EEGNet decoder on EEG motor imagery (left hand, right hand, feet), shown with a
virtual humanoid robot. The decoder runs **inside the browser** in plain JavaScript. No server, no internet needed.

> **Honest status:** the demo replays *recorded* public EEG data. It is **not** a live headset. Live EEG (Phase 2) and a
> physical robotic arm (Phase 3) are planned, not built.

## What was tested

- Data: BCI Competition IV 2a, 9 subjects, 2 sessions on different days. 8 sensors (FC3, FC1, FCz, FC2, FC4, C3, Cz, C4), 3 classes, 250 Hz, 4 s trials, 8–30 Hz band-pass.
- Protocol: **leave-one-subject-out** (train on 8 people, test on the 9th), tested on **session 2** (a different day). 216 test trials per subject, 3 training seeds. Chance = 33%; the binomial significance line for 216 trials is 38.4%.
- Decoder: EEGNet (F1=8, D=2, F2=16, K=125). Euclidean alignment from 48 unlabelled setup trials.

## Results (`results/results_full.csv`, mean over 9 subjects)

| Method | Labelled trials from the new person | Mean accuracy | 95% interval |
|---|---|---|---|
| EEGNet + Euclidean alignment | 0 | **58.1%** | 48.0 – 69.0 |
| EEGNet, no alignment | 0 | 55.9% | 46.5 – 65.8 |
| EEGNet + alignment, fine-tuned | 40 | 60.2% | 50.3 – 70.4 |
| CSP+LDA, trained on that person | 5 / 20 / 40 | 49.6% / 58.8% / 61.0% | 42.7 – 56.6 / 49.3 – 68.2 / 51.2 – 70.4 |

Per subject (EEGNet + alignment, 0 labelled trials): S1 82.9, S2 42.7, S3 81.3, S4 53.4, S5 40.0, S6 47.4, S7 41.0, S8 70.4, S9 63.6.

**What this means, and what it does not.**
- With zero labelled trials the decoder is comparable to a within-subject CSP+LDA baseline trained on about 20 labelled trials (Wilcoxon, n = 9, p = 0.65). It is not shown to be better.
- Alignment gave +2.2 points on average (7 of 9 subjects improved, p = 0.36, not significant). Fine-tuning with 40 trials gave +2.1 points (p = 0.15) under a deliberately simple setting (100 steps, lr 1e-4); a stronger fine-tuning setup was not tested.
- Differences between people (40% to 83%) are far larger than differences between methods. The people who are hard for one method are hard for the other (Spearman 0.67).
- Only 9 subjects: small effects cannot be detected. One dataset, one task. No claim of a new method or state of the art.

The demo shows one trained model (seed 0): 85.2% for Subject 1 and 42.1% for Subject 2 on all 216 trials. The study table above averages 3 training runs, so the numbers differ slightly.

## Run it

```bash
# just open it
python3 -m http.server 8000 --directory docs     # then open http://localhost:8000

# rebuild the bundle
npm install
npm run build
```

Keys: Space = next trial, 1 / 2 = subject, H = help, F = full screen.

## Files

- `docs/` the built site (served by GitHub Pages)
- `src/eegnet.js` EEGNet forward pass in plain JavaScript, checked against PyTorch (max difference about 2e-6, identical predictions on all 48 demo trials)
- `src/main.js` scene, robot, interface
- `src/data_s*.js` exported weights and 24 recorded trials for two subjects
- `notebooks/BCI_Calibration_Study.ipynb` the study (Colab); `notebooks/BCI_Demo_Export.ipynb` exports weights and trials for the demo
- `results/results_full.csv` all study runs

## Credits

- Data: Brunner C., Leeb R., Müller-Putz G.R., Schlögl A., Pfurtscheller G. (2008). *BCI Competition 2008 – Graz data set A.* Graz University of Technology. A small subset of trials is embedded in the demo for research and education.
- Decoder: Lawhern V.J. et al. (2018). *EEGNet: a compact convolutional neural network for EEG-based brain–computer interfaces.* J. Neural Eng. 15(5):056013.
- Alignment: He H., Wu D. (2020). *Transfer learning for brain–computer interfaces: a Euclidean space data alignment approach.* IEEE TBME 67(2):399–410.
- 3D robot: "Xbot" from the three.js examples (Mixamo / Adobe). It keeps its own terms of use; it is not covered by this repository's licence.
- Rendering: [three.js](https://threejs.org) (MIT).

Code: MIT (see `LICENSE`), except third-party material listed above.
