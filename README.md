# DataLogger

End-to-end data‑logging using **STM32 (sensor + UART CLI)** ↔ **ESP32 (MQTT bridge + relay control)** ↔ **Mosquitto broker**.

---

## Stack (high level)

* **STM32 firmware**
  I2C driver for SHT3x, UART line‑based CLI, command dispatcher, periodic fetch loop. Prints lines like `SINGLE <T> <RH>` and `PERIODIC <T> <RH>`.

* **ESP32 firmware**
  Bridges UART↔MQTT, parses STM32 lines, exposes MQTT topics for commands, sensor data, relay control, and status.

* **MQTT broker (Mosquitto)**
  TCP (1883) and WebSockets (8083), password‑protected, with persistence & logs.

---

## Repository layout

```
DATALOGGER/
├── .vscode						# Fix for include lib ESP32
├── broker/						# Mosquitto config, auth/, data/, log/
├── fireware/
│   ├── ESP32						# ESP-IDF project (MQTT bridge + relay)
│   │   ├── main/
│   │   ├── components/
│   │   │   └── ring_buffer/
│   │   │   └── stm32_uart/
│   │   │   └── mqtt_handler/
│   │   │   └── relay_control/
│   │   │   └── sensor_parser/
│   ├── STM32
│   │   ├── Core/
│   │   ├── Datalogger_Lib/
│   │   │   └── inc/				# uart.h, ring_buffer.h, print_cli.h, cmd_*.h, sht3x.h
│   │   │   └── src/				# uart.c, ring_buffer.c, print_cli.c, cmd_*.c, sht3x.c
├── web/
├── README.md/		# Project documentation              
```

---

## End‑to‑end flow

```
Web App ⇄ MQTT Broker ⇄ ESP32 ⇄ UART ⇄ STM32 ⇄ SHT3x (I2C)
            ▲            │
            └─ Relay ctrl┘
```

* Web app sends **SHT3x commands** via MQTT → ESP32 forwards over UART → STM32 executes and prints results.
* STM32 prints **SINGLE / PERIODIC** lines → ESP32 parses and republishes sensor values to MQTT.
* Web app toggles relay via MQTT → ESP32 drives GPIO and publishes status.

---

## Quick start

### 1) Run the MQTT broker (Docker)

```bash
# one-time
mkdir -p broker/{auth,data,log}

# run
docker run -d --name datalogger-broker \
  -p 1883:1883 -p 8083:8083 \
  -v "$PWD/broker/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  -v "$PWD/broker/auth:/mosquitto/config/auth" \
  -v "$PWD/broker/data:/mosquitto/data" \
  -v "$PWD/broker/log:/mosquitto/log" \
  eclipse-mosquitto:2
```

Notes:

* MQTT (TCP) on **1883**; WebSockets on **8083**.
* Disable anonymous access in `mosquitto.conf` and create users with `mosquitto_passwd`.

### 2) Build & flash the STM32

* Init order: HAL → GPIO → **I2C1** → **USART1** → `SHT3X_Init(...)`.
* Default UART: **115200 8N1**.
* Periodic fetch cadence controlled by `#define timeData 5000` (ms). First fetch happens right after enabling periodic mode.
* CLI is line‑buffered (128 B) and dispatches on `\r`/`\n`.

### 3) Build & flash the ESP32 (ESP‑IDF)

```bash
idf.py menuconfig   # set Wi‑Fi, MQTT broker URL, UART pins/baud, relay GPIO
idf.py build
idf.py flash monitor
```

The bridge reads STM32 lines, parses values, and publishes formatted MQTT messages.

---

## MQTT topics

### Commands → STM32 SHT3x

* Topic: `esp32/sensor/sht3x/command`
* Payloads (exact strings):

```
SHT3X HEATER ENABLE
SHT3X HEATER DISABLE
SHT3X SINGLE HIGH
SHT3X SINGLE MEDIUM
SHT3X SINGLE LOW
SHT3X PERIODIC 0.5 HIGH
SHT3X PERIODIC 0.5 MEDIUM
SHT3X PERIODIC 0.5 LOW
SHT3X PERIODIC 1 HIGH
SHT3X PERIODIC 1 MEDIUM
SHT3X PERIODIC 1 LOW
SHT3X PERIODIC 2 HIGH
SHT3X PERIODIC 2 MEDIUM
SHT3X PERIODIC 2 LOW
SHT3X PERIODIC 4 HIGH
SHT3X PERIODIC 4 MEDIUM
SHT3X PERIODIC 4 LOW
SHT3X PERIODIC 10 HIGH
SHT3X PERIODIC 10 MEDIUM
SHT3X PERIODIC 10 LOW
SHT3X ART
SHT3X PERIODIC STOP
```

### Sensor data (from STM32 via ESP32)

* Single‑shot:
  `esp32/sensor/sht3x/single/temperature`, `esp32/sensor/sht3x/single/humidity`
* Periodic:
  `esp32/sensor/sht3x/periodic/temperature`, `esp32/sensor/sht3x/periodic/humidity`

### Relay control

* Topic: `esp32/control/relay`
* Payloads: `ON`, `OFF`, `1`, `0`, `true`, `false`

### System status

* Topic: `esp32/status` (connectivity, relay state, overall status)

---

## STM32 UART CLI behavior

* **Input**: line‑buffered (128 B). Over‑length lines are truncated and dispatched.
* **Dispatch**: tokens are joined back to a case‑sensitive string and matched to a static command table; unknown → `Unknown command`.
* **Output**: driver prints results:
  `SINGLE <T> <RH>` (after one‑shot) and `PERIODIC <T> <RH>` (on each fetch).

---

## Hardware notes (ESP32 ↔ STM32 + relay)

* UART: ESP32 TXD → STM32 RXD, ESP32 RXD ← STM32 TXD, common GND.
* Relay: drive GPIO (default e.g. GPIO18) from ESP32; status is published.
* Configure pins in ESP‑IDF `menuconfig`.

---

## Troubleshooting

* **Broker auth failed** → ensure `auth/passwd` exists and `allow_anonymous false`.
* **Web client can’t connect** → open port **8083** (WebSockets).
* **No sensor data** → check ESP32↔STM32 wiring/baud; ensure STM32 is in periodic/single mode; watch serial monitor.
* **Unknown command** → verify exact, case‑sensitive strings (spaces as shown above).

---

## Implementation details (quick facts)

* UART RX buffer: **128 B**; print buffer: **128 B**.
* Ring buffer size: **256 B**.
* UART baud: **115200**.
* SHT3x I²C address: **0x44** (GND) or **0x45** (VDD).
* Periodic print format: `PERIODIC <temperature_C> <humidity_%RH>` with two decimals.

---

## License

Provided AS‑IS unless a LICENSE file is present.
