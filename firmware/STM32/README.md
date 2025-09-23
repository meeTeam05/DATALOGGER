# STM32 FIRMWARE

Folder Layout
```
STM32/
├── Core/
├── Datalogger_Lib/
│ ├── inc/
│ │ ├── uart.h
│ │ ├── ring_buffer.h
│ │ ├── print_cli.h
│ │ ├── cmd_func.h
│ │ ├── cmd_parser.h
│ │ └── sht3x.h
│ └── src/
│ ├── uart.c
│ ├── ring_buffer.c
│ ├── print_cli.c
│ ├── cmd_func.c
│ ├── cmd_parser.c
│ ├── command_execute.c
│ └── sht3x.c
```

---

## `main.c` — Runtime Flow

**Globals**

* `sht3x_handle_t g_sht3x;`
* `static float outT, outRH;`
* `static uint32_t next_fetch_ms;`
* `#define timeData 5000` (ms per periodic fetch)

**Init path**

1. `HAL_Init()` → `SystemClock_Config()` → `MX_GPIO/I2C1/USART1_Init()`.
2. `UART_Init(&huart1);`
3. `SHT3X_Init(&g_sht3x, &hi2c1, SHT3X_I2C_ADDR_GND);`

**Main loop**

* `UART_Handle();`
* If `SHT3X_IS_PERIODIC_STATE(g_sht3x.currentState)`:

  * `now = HAL_GetTick();`
  * When `now ≥ next_fetch_ms`: `SHT3X_FetchData(&g_sht3x, &outT, &outRH);` then `next_fetch_ms += timeData;`
* `__WFI();` (idle until IRQ)

**Notes**

* After switching to periodic mode, first fetch happens immediately (since `next_fetch_ms` starts at 0).

---

## UART/CLI Layer

### `Datalogger_Lib/inc/uart.h`

* `#define BUFFER_UART 128` — one line buffer.
* Extern: `UART_HandleTypeDef huart1;`
* API: `void UART_Init(UART_HandleTypeDef *huart);`
* ISR hook: `void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart);`
* Pump: `void UART_Handle(void);`

### `Datalogger_Lib/src/uart.c`

**File‑scope state**

* `uint8_t buff[BUFFER_UART];` — assembled line.
* `uint8_t data_rx;` — byte for IRQ receive.
* `uint8_t index_uart, Flag_UART;`
* `ring_buffer_t uart_rx_rb;`

**`UART_Init(UART_HandleTypeDef *huart)`**

* Clears line state, `RingBuffer_Init(&uart_rx_rb);`
* Starts IRQ reception: `HAL_UART_Receive_IT(huart, &data_rx, 1);`

**`HAL_UART_RxCpltCallback(huart)`** *(ISR)*

* If `huart->Instance == huart1.Instance`: `RingBuffer_Put(&uart_rx_rb, data_rx);`
* Re‑arm `HAL_UART_Receive_IT(&huart1, &data_rx, 1);`

**`UART_Handle(void)`** *(polled from main loop)*

* While bytes available: append to `buff` (up to `BUFFER_UART-1`).
* On `\n` or `\r` **or** buffer full: NUL‑terminate, set `Flag_UART`.
* When `Flag_UART`: `COMMAND_EXECUTE((char*)buff);` then clear buffer/flags.

**Gotchas**

* Over‑length input lines are truncated and dispatched (may cause `Unknown command`).
* TX is synchronous elsewhere (see `print_cli.c`).

---

## Ring Buffer

### `Datalogger_Lib/inc/ring_buffer.h`

* `#define RING_BUFFER_SIZE 256`
* `typedef struct { uint16_t head, tail; uint8_t buffer[RING_BUFFER_SIZE]; } ring_buffer_t;`
* API:

  * `void RingBuffer_Init(ring_buffer_t *rb);`
  * `bool RingBuffer_Put(ring_buffer_t *rb, uint8_t data);` — **false if full**.
  * `bool RingBuffer_Get(ring_buffer_t *rb, uint8_t *data);` — **false if empty**.
  * `uint16_t RingBuffer_Available(ring_buffer_t *rb);`
  * `uint16_t RingBuffer_Free(ring_buffer_t *rb);`

### `Datalogger_Lib/src/ring_buffer.c`

* Single‑producer (ISR) / single‑consumer (main) queue.
* Full condition: `(head + 1) % SIZE == tail` → drop (returns false).

---

## CLI Dispatch

### `Datalogger_Lib/inc/cmd_func.h`

* `typedef void (*CmdHandlerFunc)(uint8_t argc, char **argv);`
* `typedef struct { const char *cmdString; CmdHandlerFunc func; } command_function_t;`

### `Datalogger_Lib/src/cmd_func.c` — Command Table

* Exact‑match strings → parsers:

  * `SHT3X HEATER ENABLE|DISABLE`
  * `SHT3X SINGLE HIGH|MEDIUM|LOW`
  * `SHT3X PERIODIC {0.5|1|2|4|10} {HIGH|MEDIUM|LOW}`
  * `SHT3X ART`
  * `SHT3X PERIODIC STOP`

### `Datalogger_Lib/inc/command_execute.h`

* `void COMMAND_EXECUTE(char *commandBuffer);`

### `Datalogger_Lib/src/command_execute.c`

**`static uint8_t tokenize_string(char *str, char **argv, uint8_t max_tokens)`**

* `strtok` over `" \t\r\n"`, returns `argc ≤ max_tokens` (modifies the buffer!).

**`static command_function_t* find_command(char *cmd)`**

* Linear scan of `cmdTable` using `strcmp` (case‑sensitive, full‑string match).

**`COMMAND_EXECUTE(char *commandBuffer)`**

* Copies input to local buffer (256 B), tokenizes to `argv[10]`.
* Rebuilds a canonical command string by joining tokens with single spaces.
* `find_command()` → if found, call handler; else `Cmd_Default()`.

**Implications**

* Multiple spaces/tabs in input are normalized away.
* Unknown/partial strings fall to `Cmd_Default` (prints `"Unknown command"`).

---

## Parsers (map CLI → driver)

### `Datalogger_Lib/inc/cmd_parser.h`

* Prototypes: `Cmd_Default`, `SHT3X_Heater_Parser`, `SHT3X_Single_Parser`, `SHT3X_Periodic_Parser`, `SHT3X_ART_Parser`, `SHT3X_Stop_Periodic_Parser`.

### `Datalogger_Lib/src/cmd_parser.c`

**`Cmd_Default(argc, argv)`**

* `PRINT_CLI("Unknown command\r\n");`

**`SHT3X_Heater_Parser(argc, argv)`**

* Accepts exactly `ENABLE` or `DISABLE` in `argv[2]`.
* Calls `SHT3X_Heater(&g_sht3x, &mode)`; prints `"Heater enable/disable succeeded|failed"`.

**`SHT3X_Single_Parser(argc, argv)`**

* `argv[2]` → `sht3x_repeat_t {HIGH|MEDIUM|LOW}`.
* Calls `SHT3X_Single(&g_sht3x, &modeRepeat)`; result line is printed inside the driver: `SINGLE <T> <RH>`.

**`SHT3X_Periodic_Parser(argc, argv)`**

* `argv[2]` → rate `{0.5|1|2|4|10}` → `sht3x_mode_t`.
* `argv[3]` → repeat `{HIGH|MEDIUM|LOW}`.
* Calls `SHT3X_Periodic(&g_sht3x, &modePeriodic, &modeRepeat)`; per‑sample output is printed by `SHT3X_FetchData()`.

**`SHT3X_ART_Parser(argc, argv)`**

* Calls `SHT3X_ART(&g_sht3x)`; no extra prints (driver sets state).

**`SHT3X_Stop_Periodic_Parser(argc, argv)`**

* Calls `SHT3X_Stop_Periodic(&g_sht3x)`; prints `"Stop periodic succeeded|failed"`.

---

## Driver: SHT3x (I2C)

### `Datalogger_Lib/inc/sht3x.h` (key types/macros)

* Addresses: `SHT3X_I2C_ADDR_GND=0x44`, `SHT3X_I2C_ADDR_VDD=0x45`.
* Macro: `SHT3X_IS_PERIODIC_STATE(s)` helper.
* Enums:

  * `SHT3X_StatusTypeDef { SHT3X_OK, SHT3X_ERROR }`
  * `sht3x_heater_mode_t { SHT3X_HEATER_ENABLE, SHT3X_HEATER_DISABLE }`
  * `sht3x_repeat_t { SHT3X_HIGH, SHT3X_MEDIUM, SHT3X_LOW }`
  * `sht3x_mode_t { SHT3X_IDLE, SHT3X_SINGLE_SHOT, SHT3X_PERIODIC_05MPS, ... , SHT3X_PERIODIC_10MPS }`
* Handle:

  * `I2C_HandleTypeDef *i2c_handle; uint8_t device_address;`
  * `float temperature, humidity;`
  * `sht3x_mode_t currentState; sht3x_repeat_t modeRepeat;`
* API (selected):

  * `void SHT3X_Init(sht3x_handle_t *handle, I2C_HandleTypeDef *hi2c, uint8_t addr7bit);`
  * `void SHT3X_DeInit(sht3x_handle_t *handle);`
  * `SHT3X_StatusTypeDef SHT3X_Heater(...);`
  * `SHT3X_StatusTypeDef SHT3X_Single(...);`
  * `SHT3X_StatusTypeDef SHT3X_Periodic(...);`
  * `SHT3X_StatusTypeDef SHT3X_ART(...);`
  * `SHT3X_StatusTypeDef SHT3X_Stop_Periodic(...);`
  * `void SHT3X_FetchData(...);`

### `Datalogger_Lib/src/sht3x.c` — behavior

**Constants**

* Commands:

  * `SOFT_RESET=0x30A2`, `READ_STATUS=0xF32D`, `CLEAR_STATUS=0x3041`.
  * `HEATER_ENABLE=0x306D`, `HEATER_DISABLE=0x3066`.
  * `ART=0x2B32`, `FETCH_DATA=0xE000`, `STOP_PERIODIC=0x3093`.
* `SHT3X_MEASURE_CMD[6][3]`:

  * Row 0: single‑shot; rows 1..5: periodic {0.5,1,2,4,10} mps × {HIGH,MEDIUM,LOW}.
* `SHT3X_MEAS_DURATION_MS[3]` = {15, 6, 4} for {HIGH, MEDIUM, LOW}.

**Static helpers**

* `uint8_to_uint16(msb, lsb)`.
* `SHT3X_CRC(data,len)` — poly 0x31, init 0xFF.
* `SHT3X_Send_Command(handle, cmd)` — I2C write 2 bytes.
* `SHT3X_ParseFrame(frame, &tC, &rh)` — CRC T & RH; convert:

  * `tC = -45 + 175 * rawT / 65535`
  * `rh = 100 * rawRH / 65535`

**`SHT3X_Init(handle, hi2c, addr7bit)`** *(void)*

* Validates `hi2c` config: No‑stretch **disabled**, 7‑bit addressing.
* Probes device with `HAL_I2C_IsDeviceReady`.
* Soft‑reset then clear status.
* Initializes handle fields: state `IDLE`, repeat `HIGH`.

**`SHT3X_DeInit(handle)`** *(void)*

* If periodic, sends `STOP_PERIODIC` then clears status.
* Resets handle fields to safe defaults.

**`SHT3X_ReadStatus(handle, &state_word)`**

* Reads 3 bytes, CRC check, returns packed status word.

**`SHT3X_Heater(handle, &mode)`**

* Sends `HEATER_ENABLE`/`HEATER_DISABLE`.
* Confirms by reading status and checking the heater bit changed accordingly.

**`SHT3X_Single(handle, &modeRepeat)`**

* If currently periodic: send `STOP_PERIODIC`, remember/restore previous periodic config.
* Issue single‑shot command per `modeRepeat`, delay per `MEAS_DURATION_MS`, read 6‑byte frame, CRC+convert.
* Updates `handle.temperature/humidity`; **prints** `SINGLE <T> <RH>` via `PRINT_CLI`.

**`SHT3X_Periodic(handle, &modePeriodic, &modeRepeat)`**

* If already periodic: stop first.
* Map `modePeriodic` to table row; send start command with chosen repeatability.
* Set `handle.currentState` + `modeRepeat`.

**`SHT3X_ART(handle)`**

* If periodic: stop.
* Send `ART` command; set state to `4 mps` with `HIGH` repeatability.

**`SHT3X_Stop_Periodic(handle)`**

* No‑op if not periodic; else send `STOP_PERIODIC`, set state `IDLE`.

**`SHT3X_FetchData(handle, &outT, &outRH)`** *(void)*

* Only acts if in periodic state.
* I2C `FETCH_DATA` (16‑bit register read), CRC+convert.
* Update outputs and **print** `PERIODIC <T> <RH>`.

**Failure modes**

* All API functions return `SHT3X_ERROR` on I2C error or CRC failure (where applicable). Some init/deinit helpers are `void` and just early‑return on error.

---

## Printing

### `Datalogger_Lib/src/print_cli.c`

* `void PRINT_CLI(char *fmt, ...)`

  * Formats into `BUFFER_PRINT` (128 B) using `vsprintf`.
  * Blocking TX: `HAL_UART_Transmit(&huart1, buf, len, 100)`.

**Notes**

* Not re‑entrant; don’t call from IRQ unless you know TX latency is acceptable.

---

## Command Summary (copy‑paste ready)

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

---

## Integration Tips

* If you paste scripts quickly and see truncation, raise `RING_BUFFER_SIZE` or `BUFFER_UART`.
* The dispatcher is **case‑sensitive** and requires exact token sequences (spaces normalized).
* Periodic sampling cadence is controlled in `main.c` via `timeData` and the `next_fetch_ms` accumulator.
