# Web Dashboard

A minimal web dashboard via MQTT over WebSocket. Includes live charts, current readings and a relay toggle.

---

## Files

* **index.html** – Self‑contained dashboard (UI, logic). Loads **Chart.js** and **mqtt.js** from CDNs and contains inline CSS/JS.
* **script.js** – Optional demo logic that generates fake data (no MQTT) for quick UI testing.
* **style.css** – Optional CSS for the demo setup.

> Use `index.html` for the real MQTT dashboard. `script.js`/`style.css` are for a standalone demo and are not imported by `index.html` by default.

---

## Quick Start

1. **Configure MQTT** in `index.html` (look for the config block):

   * `broker`: WebSocket URL of your broker (e.g., `ws://<host>:8083/mqtt` or `wss://...` on HTTPS)
   * `username`, `password`
   * topics (see below)
2. **Serve the page** with any static server (recommended):

   ```bash
   python -m http.server 8080
   # then open http://localhost:8080/index.html
   ```
3. Ensure your broker exposes **WebSocket** and CORS is allowed for your site.

---

## MQTT Topics (defaults used by the dashboard)

* **Publish (commands)**

  * `esp32/sensor/sht3x/command` – send SHT3X commands
  * `esp32/control/relay` – control the relay
* **Subscribe (data)**

  * `esp32/sensor/sht3x/periodic/temperature`
  * `esp32/sensor/sht3x/periodic/humidity`
  * `esp32/sensor/sht3x/single/temperature`
  * `esp32/sensor/sht3x/single/humidity`

---

## Commands sent from the UI

* **Periodic measurements**

  * `SHT3X PERIODIC <0.5|1|2|4|10> <HIGH|MEDIUM|LOW>`
  * Stop periodic: `SHT3X PERIODIC STOP`
* **Single measurement**

  * `SHT3X SINGLE <HIGH|MEDIUM|LOW>`
* **Relay control**

  * `RELAY ON` / `RELAY OFF`

---

## UI Controls

* **Frame Rate (Hz):** sampling rate for periodic mode
* **Periodic / Stop:** start/stop periodic streaming and live chart updates
* **Single Read:** one‑shot measurement
* **Relay ON/OFF:** toggle and display current relay state
* **Live Charts & Current Values:** temperature and humidity in real time

---

## Demo Mode (optional)

If you need a no‑MQTT demo:

* Create a simple HTML page that includes `script.js` and `style.css`, and the required DOM elements (charts, buttons, status labels) expected by the script.
* This simulates data to validate the UI and charts without a broker.

---

## Notes / Troubleshooting

* Use **`wss://`** when your site is served over HTTPS (avoid mixed content).
* The dashboard auto‑reconnects to MQTT and updates subscriptions on connect.
* If charts don’t update, verify: WebSocket port (e.g., 8083), broker path (`/mqtt` if used), credentials, and topic names.
