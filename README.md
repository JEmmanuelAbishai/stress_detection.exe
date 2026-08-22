<div align="center">

# Typing Stress Detector

**AI-powered stress monitoring for browsers using real-time typing dynamics & local ML inference**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![ONNX Runtime](https://img.shields.io/badge/ONNX-Runtime-black?logo=onnx&logoColor=white)](https://onnxruntime.ai)
[![License](https://img.shields.io/github/license/JEmmanuelAbishai/stress-detection-crx)](https://github.com/JEmmanuelAbishai/stress-detection-crx/blob/develop/LICENSE)

</div>

## Overview

A privacy-first Chrome Extension that estimates typing-behavior stress signals (dwell time, flight time, backspace rate, pauses) entirely **on-device**. By running a lightweight logistic regression model locally via `onnxruntime-web`, the extension provides private, real-time stress trends without external data transmission.

**Domain:** Human-Computer Interaction & Applied ML  
**Framework:** Chrome Extension Manifest V3, React, ONNX Runtime  
**Status:** Active Development

---

## System Architecture

The architecture bridges web-based user interaction with local machine learning inference, ensuring full data privacy.

```mermaid
classDiagram
    class ContentScript {
        +KeyStrokeListener listener
        +FeatureExtractor extractor
        +sendMetrics()
    }
    class BackgroundService {
        +MessageRouter router
        +AlarmManager alarms
    }
    class InferenceEngine {
        +ModelLoader loader
        +runInference(features)
    }
    class Storage {
        +IndexedDB db
        +saveSession()
        +getAnalytics()
    }

    ContentScript ..> BackgroundService : sends metrics
    BackgroundService --> InferenceEngine : triggers
    BackgroundService --> Storage : persists
```

---

## ML Pipeline

The model is trained in a standalone Python environment and exported to ONNX for browser execution.

```mermaid
graph LR
    A[Data Collection] --> B[preprocess.py]
    B --> C[train.py]
    C --> D[export_to_onnx.py]
    D --> E[src/ml/model/stress_model.onnx]
  
```

---

## Features

- **Privacy First**: All inference runs locally in the browser via WASM; no data leaves your machine.
- **Real-time Analytics**: Built-in Dashboard with `Chart.js` visualization of stress trends.
- **Flexible Reporting**: Export daily session data to CSV or PDF for personal record-keeping.
- **Explainability**: Dashboard shows top contributing features, helping users understand *why* the model detected stress.

## Getting Started

```bash
# Install dependencies
npm install

# Build the extension
npm run build
```

1. Open Chrome → `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `/dist` folder generated from the build.

## Authors & Contributors

| Name | Role | Key Contribution |
| :--- | :--- | :--- |
| [JEmmanuelAbishai](https://github.com/JEmmanuelAbishai) | Lead Developer / UI Designer | Core architecture, ML engine integration, and project oversight. |
| [saipradeep368](https://github.com/saipradeep368) | Fullstack Engineer | Connected all the modules with background routing logic. |
| [Arvind-Parsapuram](https://github.com/Arvind-Parsapuram) | ML Engineer | 	Trained the stress-classification model and converted it to run efficiently in-browser. |
| [vedavyasa30](https://github.com/vedavyasa30) | Typing Engine Developer | Built the core keystroke-capture system, listening for typing activity. |
| [chembetimuniteja](https://github.com/chembetimuniteja) | Reporting Engineer | Documentation and support maintenance. |
```
