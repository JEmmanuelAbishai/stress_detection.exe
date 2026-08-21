"""
preprocess.py
Generates a synthetic labeled dataset of typing-session feature vectors and
writes it to data/typing_sessions.csv.

Column order here is the SOURCE OF TRUTH the JS side mirrors in
src/shared/types.ts (FEATURE_ORDER) and src/ml/featureSchema.ts. If you
reorder columns here, update both of those.

Real deployments should replace generate_synthetic_dataset() with a loader
for actual (consented, anonymized) keystroke-timing data collected via the
extension's opt-in research-mode export (see docs/privacy.md) — this
synthetic generator exists so the pipeline is runnable end-to-end without
any real user data.
"""

import numpy as np
import pandas as pd

FEATURE_ORDER = [
    "avgDwellTimeMs",
    "avgFlightTimeMs",
    "dwellTimeStdMs",
    "flightTimeStdMs",
    "backspaceRate",
    "typingSpeedCharsPerMin",
    "pauseRate",
    "errorBurstRate",
]

RNG_SEED = 42


def generate_synthetic_dataset(n_samples: int = 4000, seed: int = RNG_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # Sample a latent "stress" value in [0, 1] per synthetic session, then
    # generate features whose distributions shift with stress. This keeps
    # the relationship between features and label plausible rather than
    # arbitrary, without claiming to model real physiology.
    stress = rng.beta(2, 3, size=n_samples)  # skewed toward calmer sessions

    avg_dwell = rng.normal(110 - 25 * stress, 15)
    avg_flight = rng.normal(180 - 40 * stress, 25)
    dwell_std = rng.normal(35 + 20 * stress, 8)
    flight_std = rng.normal(60 + 35 * stress, 12)
    backspace_rate = np.clip(rng.normal(0.05 + 0.22 * stress, 0.03), 0, 1)
    typing_speed = rng.normal(240 - 90 * stress, 35)
    pause_rate = np.clip(rng.normal(0.03 + 0.12 * stress, 0.02), 0, 1)
    error_burst_rate = np.clip(rng.normal(0.5 + 4.5 * stress, 1.0), 0, None)

    df = pd.DataFrame(
        {
            "avgDwellTimeMs": np.clip(avg_dwell, 40, None),
            "avgFlightTimeMs": np.clip(avg_flight, 60, None),
            "dwellTimeStdMs": np.clip(dwell_std, 5, None),
            "flightTimeStdMs": np.clip(flight_std, 10, None),
            "backspaceRate": backspace_rate,
            "typingSpeedCharsPerMin": np.clip(typing_speed, 40, None),
            "pauseRate": pause_rate,
            "errorBurstRate": error_burst_rate,
        }
    )

    # Binary label: "elevated-or-above stress" vs "calm/steady", derived from
    # the same latent value plus noise so the classifier has real signal but
    # not a trivial 1.0 AUC.
    noisy_stress = np.clip(stress + rng.normal(0, 0.08, n_samples), 0, 1)
    df["label"] = (noisy_stress >= 0.55).astype(int)

    return df[FEATURE_ORDER + ["label"]]


if __name__ == "__main__":
    dataset = generate_synthetic_dataset()
    dataset.to_csv("data/typing_sessions.csv", index=False)
    print(f"Wrote {len(dataset)} rows to data/typing_sessions.csv")
    print(dataset["label"].value_counts(normalize=True))
