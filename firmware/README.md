# ESP32–STM32 MQTT Bridge

## Overview

This system creates an MQTT bridge between a web application and an STM32 microcontroller via an ESP32. Architecture:

```
Web Application <--> MQTT Broker <--> ESP32 <--> STM32 (SHT3X Sensor)
```

## Key Features

### 1. Control the SHT3X Sensor via MQTT

* **Command topic:** `esp32/sensor/sht3x/command`
* **Supported commands:**

  * `SHT3X SINGLE HIGH` — One-shot measurement, high repeatability
  * `SHT3X PERIODIC 0.5 HIGH` — Continuous measurement at 0.5 Hz
  * `SHT3X PERIODIC 1 HIGH` — Continuous measurement at 1 Hz
  * `SHT3X PERIODIC 2 HIGH` — Continuous measurement at 2 Hz
  * `SHT3X PERIODIC 4 HIGH` — Continuous measurement at 4 Hz
  * `SHT3X PERIODIC 10 HIGH` — Continuous measurement at 10 Hz
  * `SHT3X ART` — Accelerated Response Time
  * `SHT3X PERIODIC STOP` — Stop periodic measurements
  * `SHT3X HEATER ENABLE` — Enable the on‑chip heater
  * `SHT3X HEATER DISABLE` — Disable the on‑chip heater

### 2. Receive sensor data from STM32

The STM32 sends lines in the format: `[MODE] [TEMPERATURE] [HUMIDITY]`

**Examples:**

```
PERIODIC 27.82 85.65
SINGLE 27.85 85.69
```

The ESP32 parses and publishes to the following topics:

* **Single mode**

  * `esp32/sensor/sht3x/single/temperature`
  * `esp32/sensor/sht3x/single/humidity`
* **Periodic mode**

  * `esp32/sensor/sht3x/periodic/temperature`
  * `esp32/sensor/sht3x/periodic/humidity`

### 3. Relay control

* **Topic:** `esp32/control/relay`
* **Accepted payloads:** `ON`, `OFF`, `1`, `0`, `true`, `false`
* The ESP32 toggles a GPIO pin to switch the relay.

### 4. System status

* **Topic:** `esp32/status`
* Publishes connectivity, relay state, and overall system status.

---

## Hardware Setup

### UART connection to STM32

```
ESP32          STM32
TXD (GPIO17) → RXD
RXD (GPIO16) ← TXD
GND          → GND
```

### Relay connection

```
ESP32 GPIO18 → Relay Module IN
ESP32 GND    → Relay Module GND
ESP32 VCC    → Relay Module VCC (3.3V or 5V)
```

---

## Software Configuration

### 1. Configure the MQTT broker

```bash
idf.py menuconfig
```

→ **ESP32 MQTT5 Bridge Configuration** → **MQTT Broker Settings**

* **Broker URL:** `mqtt://your-broker-url`
* **Username:** `your-username`
* **Password:** `your-password`
* **Client ID:** `ESP32_STM32_Bridge`

### 2. Configure UART

→ **ESP32 MQTT5 Bridge Configuration** → **STM32 Communication UART Configuration**

* **Port:** UART2 (default)
* **Baud Rate:** 115200
* **TXD Pin:** GPIO17
* **RXD Pin:** GPIO16

### 3. Configure the relay GPIO

→ **ESP32 MQTT5 Bridge Configuration** → **Hardware Control Configuration**

* **Relay GPIO:** GPIO18 (default)

### 4. Configure Wi‑Fi

→ **ESP32 MQTT5 Bridge Configuration** → **WiFi Connection Configuration**

* **SSID:** `your-wifi-ssid`
* **Password:** `your-wifi-password`

---

## Build and Flash

```bash
# Configure the project
idf.py menuconfig

# Build
idf.py build

# Flash
idf.py flash

# Monitor serial output
idf.py monitor
```

---

## Operation Flows

### 1. Send an SHT3X command

```
Web App → MQTT publish "esp32/sensor/sht3x/command" → "SHT3X SINGLE HIGH"
↓
ESP32 receives the MQTT message
↓
ESP32 sends over UART → "SHT3X SINGLE HIGH\n"
↓
STM32 receives and executes the command
```

### 2. Receive sensor data

```
STM32 measures the sensor → sends over UART → "SINGLE 27.85 85.69\n"
↓
ESP32 receives and parses the line
↓
ESP32 publishes MQTT:
- Topic: "esp32/sensor/sht3x/single/temperature" → "27.85"
- Topic: "esp32/sensor/sht3x/single/humidity"    → "85.69"
↓
Web App receives data via MQTT subscribe
```

### 3. Control the relay

```
Web App → MQTT publish "esp32/control/relay" → "ON"
↓
ESP32 receives the command
↓
ESP32 sets GPIO18 = HIGH
↓
ESP32 publishes status → "esp32/status" → "relay:ON,status:ok"
```

---

## Debugging

### Log levels

Verbose MQTT logging is enabled. To change:

```c
esp_log_level_set("ESP32_MQTT5_BRIDGE", ESP_LOG_DEBUG);
```

### Serial monitor

Use `idf.py monitor` to view real‑time logs:

* MQTT connection
* Incoming/outgoing MQTT messages
* UART communication with STM32
* Relay GPIO status

### Check UART

You can attach a USB‑TTL adapter to the UART pins to monitor STM32 communication.

---

## Troubleshooting

### 1. ESP32 does not connect to Wi‑Fi

* Verify SSID/password in **menuconfig**
* Check Wi‑Fi signal quality
* Reset/power‑cycle the ESP32

### 2. MQTT does not connect

* Verify broker URL, username, and password
* Check network connectivity
* Review firewall/NAT settings

### 3. No data received from STM32

* Verify UART cross‑connection (ESP32 TX → STM32 RX and ESP32 RX ← STM32 TX)
* Ensure both sides use the same baud rate
* Confirm the STM32 output format

### 4. Relay does not switch

* Check the GPIO pin configuration and direction
* Verify relay module power supply
* Measure GPIO voltage when toggled (ON/OFF)

---

## Extensions

### Add more sensors

1. Add new MQTT topics in the code
2. Extend the UART parser for the new data format
3. Subscribe to additional command topics as needed

### Security

1. Use MQTT over TLS (`mqtts://`)
2. Implement certificate‑based authentication
3. Encrypt sensitive payloads

### Performance

1. Tune MQTT keepalive and QoS
2. Optimize buffer sizes
3. Use appropriate FreeRTOS task priorities
