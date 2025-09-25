# IoT Sensor Datalogger

**Complete IoT data logging system with STM32 sensor interface, ESP32 MQTT bridge, and real-time web dashboard**

```
SHT3X Sensor ←→ STM32 ←→ ESP32 ←→ Web Dashboard
                                        ↓
                                  Relay Control
```

## Overview

A production-ready IoT system for remote monitoring and control of SHT3X temperature/humidity sensors. Features web-based control, real-time data visualization, MQTT communication, and device automation through relay control.

## Key Features

- **Real-time sensor monitoring** - Temperature and humidity with 0.5-10Hz sampling rates
- **Web-based control** - Remote sensor commands and device switching via MQTT
- **Data persistence** - MQTT broker with authentication and historical storage
- **Modular architecture** - Scalable design supporting multiple sensor nodes
- **Production ready** - Complete with authentication, logging, and error recovery

## Quick Start

### 1. MQTT Broker Setup
```bash
# Create directories and user credentials
mkdir -p broker/{config/auth,data,log}
docker run --rm -v "$PWD/broker/config/auth:/work" eclipse-mosquitto:2 \
  mosquitto_passwd -c /work/passwd.txt DataLogger

# Run broker (MQTT:1883, WebSocket:8083)
docker run -d --name mqtt-broker \
  -p 1883:1883 -p 8083:8083 \
  -v "$PWD/broker/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  -v "$PWD/broker/config/auth:/mosquitto/config/auth" \
  -v "$PWD/broker/data:/mosquitto/data" \
  -v "$PWD/broker/log:/mosquitto/log" \
  eclipse-mosquitto:2
```

### 2. Hardware Setup

| Component | Connection | Pin | Purpose |
|-----------|------------|-----|---------|
| **STM32 + SHT3X** | SHT3X SCL | PB6 | I2C Clock |
|                   | SHT3X SDA | PB7 | I2C Data |
|                   | SHT3X VCC | 3.3V | Power |
|                   | SHT3X GND | GND | Ground |
|                   | UART TX | PA9 | Serial output to ESP32 |
|                   | UART RX | PA10 | Serial input from ESP32 |
| **ESP32** | To STM32 TX | GPIO16 | UART receive from STM32 |
|           | To STM32 RX | GPIO17 | UART transmit to STM32 |
|           | Common GND | GND | Ground connection |
|           | Relay control | GPIO4 | Optional relay module |

### 3. Firmware Installation
```bash
# STM32: Build with STM32CubeMX + GCC ARM, flash via ST-Link

# ESP32: Configure and flash
cd firmware/ESP32/
idf.py menuconfig  # Set WiFi, MQTT broker, UART pins
idf.py build flash monitor
```

### 4. Web Dashboard
```bash
cd web/
python -m http.server 8080
# Access at http://localhost:8080, configure MQTT connection in settings
```

## Project Structure

```
DATALOGGER/
├── broker/                    # Mosquitto MQTT broker
│   ├── mosquitto.conf         # Main configuration with auth & persistence
│   └── config/auth/           # User credentials (bcrypt hashed)
├── firmware/
│   ├── STM32/                 # Sensor interface with CLI
│   │   └── Datalogger_Lib/    # Ring buffer, command parser, SHT3X driver
│   └── ESP32/                 # MQTT bridge firmware
│       ├── main/              # Main application logic
│       └── components/        # UART, MQTT, parsing, relay modules
└── web/                       # Real-time dashboard with Firebase integration
    ├── index.html             # Responsive UI with live charts
    ├── script.js              # MQTT WebSocket client
    └── style.css              # Responsive styling and animations
```

## Communication Protocol

### Core MQTT Topics
| Topic | Direction | Purpose |
|-------|-----------|---------|
| `esp32/sensor/sht3x/command` | Web → Device | Sensor control (`SHT3X SINGLE HIGH`) |
| `esp32/sensor/sht3x/periodic/temperature` | Device → Web | Live temperature data |
| `esp32/control/relay` | Web → Device | Device switching (`ON`/`OFF`) |

### Example Usage
```bash
# Start continuous monitoring
mosquitto_pub -t "esp32/sensor/sht3x/command" -m "SHT3X PERIODIC 1 HIGH"

# Monitor live data
mosquitto_sub -t "esp32/sensor/+/+"

# Control devices
mosquitto_pub -t "esp32/control/relay" -m "ON"
```

## System Specifications

- **Performance:** <150ms end-to-end response, up to 10Hz sampling
- **Accuracy:** ±0.2°C temperature, ±2% RH humidity  
- **Communication:** UART 115200 baud, I2C 100kHz, MQTT5 with WebSocket
- **Power:** <300mA total system consumption

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MQTT connection failed | Check broker IP, port 8083 open, valid credentials |
| No sensor data | Verify I2C wiring (SDA/SCL), sensor address 0x44 |
| Web dashboard offline | Confirm WebSocket connection, MQTT topic subscriptions |

```bash
# Debug commands
mosquitto_sub -v -t "esp32/+/+/+"  # Monitor all traffic
docker logs mqtt-broker             # Check broker logs
idf.py monitor                      # ESP32 serial output
```

## Documentation

**Component Details:**
- [MQTT Broker Setup](broker.md) - Docker deployment, authentication, persistence
- [STM32 Firmware](STM32.md) - SHT3X driver, UART CLI, command reference
- [ESP32 Firmware](ESP32.md) - MQTT bridge, modular components, configuration  
- [Web Dashboard](Web.md) - Real-time UI, Firebase integration, deployment

**Development:**
- Each component supports independent modification and testing
- Modular design allows adding new sensors and control devices
- Production considerations include TLS, authentication, and monitoring

## License

MIT License - See LICENSE file for details.