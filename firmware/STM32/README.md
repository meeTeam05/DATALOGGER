# STM32 SHT3X Sensor CLI Interface

A command-line interface for controlling SHT3X temperature and humidity sensors over I2C on STM32F1 microcontrollers.

## Architecture

```
UART RX → Ring Buffer → Line Assembly → Command Parser → Command Table
                                              ↓
                                       Function Dispatch
                                              ↓
                                       SHT3X Driver ←→ I2C ←→ Sensor
                                              ↓
                                       UART TX (Status/Data)

Main Loop Timer → SHT3X_FetchData() → I2C → Sensor → UART TX (Periodic Data)
```

## Project Structure

```
STM32/
├── Core/                    # STM32 HAL core files
│   └── src/ 
│      └── main.c               # Application entry + periodic loop
└── Datalogger_Lib/
    ├── inc/                 # Header files
    │   ├── uart.h           # UART + ring buffer management
    │   ├── ring_buffer.h    # Circular buffer implementation
    │   ├── print_cli.h      # UART output formatting
    │   ├── cmd_func.h       # Command table structure
    │   ├── cmd_parser.h     # Command parsing functions
    │   ├── command_execute.h # Command execution engine
    │   └── sht3x.h          # SHT3X sensor driver API
    └── src/                 # Implementation files
        ├── uart.c           # UART ISR + line assembly
        ├── ring_buffer.c    # Ring buffer operations
        ├── print_cli.c      # Printf-style UART output
        ├── cmd_func.c       # Command lookup table
        ├── cmd_parser.c     # Individual command handlers
        ├── command_execute.c # Tokenization + dispatch
        └── sht3x.c          # I2C sensor communication
```

## Key Features

- **Interrupt-Driven UART**: 256-byte ring buffer prevents data loss
- **Exact Command Matching**: Case-sensitive string-based command dispatch
- **Dual Output Modes**: Immediate single-shot + automatic periodic streaming
- **State Management**: Seamless mode switching with state preservation
- **Error Recovery**: Comprehensive I2C timeout and CRC validation
- **Low Latency**: Direct I2C communication without abstraction layers

## Quick Start

### Hardware Setup
- Connect SHT3X: SCL→PB6, SDA→PB7, ADDR→GND (0x44 address)
- UART: TX→PA9, RX→PA10
- Power: 3.3V to sensor

### Terminal Connection
```bash
# Connect at 115200 baud, 8N1
minicom -D /dev/ttyUSB0 -b 115200
# or
screen /dev/ttyUSB0 115200
```

### Basic Operation
```bash
# Single measurement
SHT3X SINGLE HIGH
> SINGLE 23.45 65.20

# Start continuous monitoring
SHT3X PERIODIC 1 MEDIUM
> PERIODIC 23.46 65.18  # Every 5 seconds

# Stop monitoring
SHT3X PERIODIC STOP
> Stop periodic succeeded
```

## Command Reference

### Measurement Commands
| Command | Function | Duration | Output |
|---------|----------|----------|---------|
| `SHT3X SINGLE HIGH` | Single shot, high precision | 15ms | `SINGLE 23.45 65.20` |
| `SHT3X SINGLE MEDIUM` | Single shot, medium precision | 6ms | `SINGLE 23.44 65.21` |
| `SHT3X SINGLE LOW` | Single shot, low precision | 4ms | `SINGLE 23.43 65.22` |

### Periodic Monitoring
| Command | Sample Rate | Precision | Use Case |
|---------|-------------|-----------|----------|
| `SHT3X PERIODIC 0.5 HIGH` | 0.5 Hz | High | Long-term logging |
| `SHT3X PERIODIC 1 MEDIUM` | 1 Hz | Medium | General monitoring |
| `SHT3X PERIODIC 2 LOW` | 2 Hz | Low | Fast response |
| `SHT3X PERIODIC 4 HIGH` | 4 Hz | High | Real-time control |
| `SHT3X PERIODIC 10 MEDIUM` | 10 Hz | Medium | High-speed sampling |

### Control Commands
| Command | Function | Response |
|---------|----------|----------|
| `SHT3X PERIODIC STOP` | Stop periodic mode | `Stop periodic succeeded` |
| `SHT3X ART` | Accelerated Response Time | Sets 4Hz high-precision mode |
| `SHT3X HEATER ENABLE` | Enable built-in heater | `Heater enable succeeded` |
| `SHT3X HEATER DISABLE` | Disable built-in heater | `Heater disable succeeded` |

## Data Output Formats

### Single-Shot Response
```
SINGLE 23.45 65.20
```
Format: `SINGLE <temperature_°C> <humidity_%RH>`

### Periodic Response  
```
PERIODIC 23.45 65.20
```
- Automatically outputs every 5 seconds during periodic mode
- Format: `PERIODIC <temperature_°C> <humidity_%RH>`

### Status Messages
```
Heater enable succeeded
Stop periodic failed
Unknown command
```

## System Behavior

### Command Processing Flow
1. **UART Reception**: Characters received via interrupt into ring buffer
2. **Line Assembly**: Main loop assembles complete lines (terminated by `\r` or `\n`)
3. **Tokenization**: Line split on whitespace, normalized to single spaces
4. **Command Lookup**: Exact string match against predefined command table
5. **Function Dispatch**: Matching command calls corresponding parser function
6. **Driver Execution**: Parser validates parameters and calls SHT3X driver
7. **Response Output**: Results formatted and transmitted via UART

### State Management
- **Single-Shot Mode**: Temporarily interrupts periodic mode, then resumes
- **Periodic Mode**: Runs independently of command processing
- **State Persistence**: Previous periodic settings restored after single-shot
- **Error Recovery**: Failed commands don't affect current operational state

### Timing Characteristics
- **Command Response**: <100ms for most operations
- **Measurement Duration**: 4-15ms depending on precision setting
- **Periodic Interval**: 5000ms between automatic data outputs
- **I2C Timeout**: 100ms per transaction

## Technical Specifications

### Communication Parameters
| Parameter | Value | Notes |
|-----------|-------|-------|
| UART Baud | 115200 | 8N1, interrupt-driven RX |
| I2C Speed | 100 kHz | Standard mode, clock stretch disabled |
| Ring Buffer | 256 bytes | Circular, single producer/consumer |
| Line Buffer | 128 bytes | Command assembly buffer |
| I2C Timeout | 100ms | Per transaction timeout |

### Memory Usage
| Component | RAM Usage | Flash Usage |
|-----------|-----------|-------------|
| Ring Buffer | 256 bytes | - |
| Command Table | ~200 bytes | ~800 bytes |
| SHT3X Driver | 24 bytes | ~2KB |
| Total Overhead | <1KB | <3KB |

### Error Handling
- **I2C Errors**: Bus timeout, NACK, arbitration loss
- **CRC Validation**: All sensor data verified with polynomial 0x31
- **Buffer Overflow**: Ring buffer full condition handled gracefully  
- **Invalid Commands**: Unknown strings return "Unknown command"
- **State Conflicts**: Automatic resolution with mode preservation

## Integration Guide

### Adding Custom Commands
1. Add command string to `cmdTable[]` in `cmd_func.c`
2. Implement parser function in `cmd_parser.c`
3. Add function prototype to `cmd_parser.h`

### Modifying Periodic Timing
Change `timeData` constant in `main.c`:
```c
#define timeData 1000  // 1 second interval
```

### Supporting Multiple Sensors
Modify `SHT3X_Init()` call in `main.c`:
```c
SHT3X_Init(&g_sht3x, &hi2c1, SHT3X_I2C_ADDR_VDD);  // Use 0x45 address
```

---

**Hardware Requirements:**
- STM32F1xx microcontroller (tested on STM32F103)
- SHT3X temperature/humidity sensor
- I2C pull-up resistors (4.7kΩ recommended)
- UART connection for CLI interface

**Software Dependencies:**
- STM32 HAL library
- STM32CubeMX generated code
- GCC ARM toolchain
- Standard C library (string.h, stdio.h)

## License

MIT License - see project root for details.