# Web Dashboard

A lightweight, real‑time dashboard to monitor temperature and humidity from the SHT31 sensor. Ships with a data **simulator for demo** and **hooks for MQTT/WebSocket** when connecting to a live device.

## Structure

```
web/
├── index.html   # Single‑file app: UI + inline CSS + inline JS + CDN libs
├── style.css    # (Optional) External styles if you choose to extract from index.html
└── script.js    # (Optional) External JS if you choose to extract from index.html
```

> Note: `index.html` runs standalone. Use `style.css`/`script.js` only if you refactor to external files.

## Features

* Live readouts: `Current: <°C> & <RH>%`
* Two real‑time charts (Chart.js): Temperature 🌡️ and Humidity 💧
* Frame rate selector: `0.5 / 1 / 2 / 4 / 10 Hz`
* Modes: `Periodic / Stop / Single Read`
* `DEVICE ON/OFF` toggle (UI only by default)
* Compact Status log (FIFO style)

## Requirements

* Modern browser (Chrome/Edge/Firefox)
* Internet access for CDNs: Chart.js and MQTT (unpkg)
* (When using real data) A broker with **WebSocket** support, e.g. `ws://<host>:8083/mqtt`

## Quick Start (Demo / Simulator)

1. Open `web/index.html` directly in your browser.
2. Click **DEVICE ON** → choose **Periodic** to stream simulated data per selected frame rate.
3. **Single Read** updates the current value without adding to the charts.

## Connect to MQTT (Live Device)

MQTT wiring is prepared in JS (commented). To enable it:

1. Un‑comment and set the MQTT config:

   * `MQTT_URL = "ws://<broker>:<ws-port>/mqtt"`
   * `TOPIC_TEMP = "esp32/sht31/temperature"`
   * `TOPIC_HUMI = "esp32/sht31/humidity"`
2. Ensure the broker exposes a WebSocket listener (e.g., Mosquitto on `8083`).
3. Supported payloads (auto‑parsed):

   * Plain number string, e.g., `"26.4"`
   * JSON object, e.g., `{ "value": 26.4 }`

## Customization

* Max points kept on charts: `maxDataPoints = 15`
* Max status lines shown: `maxStatusItems = 5`
* Update cadence in **Periodic** mode = selected **frameRate (Hz)**
* Chart smoothing/appearance: adjust Chart.js dataset/axis options

## Real Device Controls

* Buttons `DEVICE ON/OFF`, `Periodic/Stop/Single` are **UI only** by default.
* To control hardware, map these actions to **MQTT publish** commands per your protocol (e.g., send `SHT3X PERIODIC 1 HIGH`, or a JSON control message).

## Build / Deploy

This is a **static site**:

* Open from file system, or serve via any static host (Nginx/Apache/GitHub Pages/Vercel).
* For local dev, **VS Code → Live Server** is convenient for auto‑reload.

## Notes

* For demos: keep the simulator enabled.
* For production: disable the simulator, enable MQTT, and review chart/log limits as needed.
