# ESP32-STM32 MQTT Bridge

## Tổng quan
Hệ thống này tạo ra một cầu nối MQTT giữa Web và STM32 thông qua ESP32. Mô hình hoạt động:

```
Web Application <---> MQTT Broker <---> ESP32 <---> STM32 (SHT3X Sensor)
```

## Chức năng chính

### 1. Điều khiển SHT3X Sensor qua MQTT
- **Topic nhận lệnh**: `esp32/sensor/sht3x/command`
- **Các lệnh hỗ trợ**:
  - `SHT3X SINGLE HIGH` - Đo một lần với độ chính xác cao
  - `SHT3X PERIODIC 0.5 HIGH` - Đo liên tục 0.5Hz
  - `SHT3X PERIODIC 1 HIGH` - Đo liên tục 1Hz  
  - `SHT3X PERIODIC 2 HIGH` - Đo liên tục 2Hz
  - `SHT3X PERIODIC 4 HIGH` - Đo liên tục 4Hz
  - `SHT3X PERIODIC 10 HIGH` - Đo liên tục 10Hz
  - `SHT3X ART` - Accelerated Response Time
  - `SHT3X PERIODIC STOP` - Dừng đo liên tục
  - `SHT3X HEATER ENABLE` - Bật heater
  - `SHT3X HEATER DISABLE` - Tắt heater

### 2. Nhận dữ liệu sensor từ STM32
STM32 gửi dữ liệu với format: `[MODE] [TEMPERATURE] [HUMIDITY]`

Ví dụ:
```
PERIODIC 27.82 85.65
SINGLE 27.85 85.69
```

ESP32 sẽ parse và publish lên các topic tương ứng:
- **Single mode**: 
  - `esp32/sensor/sht3x/single/temperature`
  - `esp32/sensor/sht3x/single/humidity`
- **Periodic mode**:
  - `esp32/sensor/sht3x/periodic/temperature` 
  - `esp32/sensor/sht3x/periodic/humidity`

### 3. Điều khiển Relay
- **Topic**: `esp32/control/relay`
- **Lệnh hỗ trợ**: `ON`, `OFF`, `1`, `0`, `true`, `false`
- ESP32 sẽ điều khiển GPIO để đóng/mở relay

### 4. Trạng thái hệ thống
- **Topic**: `esp32/status`
- Publish trạng thái kết nối, relay, và tình trạng hệ thống

## Cấu hình phần cứng

### Kết nối UART với STM32
```
ESP32          STM32
TXD (GPIO17) → RXD
RXD (GPIO16) ← TXD
GND          → GND
```

### Kết nối Relay
```
ESP32 GPIO18 → Relay Module IN
ESP32 GND    → Relay Module GND
ESP32 VCC    → Relay Module VCC (3.3V hoặc 5V)
```

## Cấu hình phần mềm

### 1. Cấu hình MQTT Broker
```bash
idf.py menuconfig
```
→ ESP32 MQTT5 Bridge Configuration → MQTT Broker Settings
- Broker URL: `mqtt://your-broker-url`
- Username: `your-username`
- Password: `your-password`
- Client ID: `ESP32_STM32_Bridge`

### 2. Cấu hình UART
→ ESP32 MQTT5 Bridge Configuration → STM32 Communication UART Configuration
- Port: UART2 (default)
- Baud Rate: 115200
- TXD Pin: GPIO17
- RXD Pin: GPIO16

### 3. Cấu hình GPIO Relay
→ ESP32 MQTT5 Bridge Configuration → Hardware Control Configuration
- Relay GPIO: GPIO18 (default)

### 4. Cấu hình WiFi
→ ESP32 MQTT5 Bridge Configuration → WiFi Connection Configuration
- SSID: `your-wifi-ssid`
- Password: `your-wifi-password`

## Biên dịch và nạp code

```bash
# Cấu hình project
idf.py menuconfig

# Biên dịch
idf.py build

# Nạp code
idf.py flash

# Monitor serial output
idf.py monitor
```

## Luồng hoạt động

### 1. Gửi lệnh SHT3X
```
Web App → MQTT Publish "esp32/sensor/sht3x/command" → "SHT3X SINGLE HIGH"
↓
ESP32 nhận MQTT message
↓
ESP32 gửi qua UART → "SHT3X SINGLE HIGH\n"
↓
STM32 nhận và xử lý lệnh
```

### 2. Nhận dữ liệu sensor
```
STM32 đo sensor → gửi qua UART → "SINGLE 27.85 85.69\n"
↓
ESP32 nhận và parse dữ liệu
↓
ESP32 publish MQTT:
- Topic: "esp32/sensor/sht3x/single/temperature" → "27.85"
- Topic: "esp32/sensor/sht3x/single/humidity" → "85.69"
↓
Web App nhận dữ liệu qua MQTT Subscribe
```

### 3. Điều khiển Relay
```
Web App → MQTT Publish "esp32/control/relay" → "ON"
↓
ESP32 nhận lệnh
↓
ESP32 set GPIO18 = HIGH
↓
ESP32 publish status → "esp32/status" → "relay:ON,status:ok"
```

## Debugging

### Log levels
Code đã cấu hình log verbose cho MQTT debugging. Để thay đổi:
```c
esp_log_level_set("ESP32_MQTT5_BRIDGE", ESP_LOG_DEBUG);
```

### Serial Monitor
Sử dụng `idf.py monitor` để xem log real-time:
- Kết nối MQTT
- Nhận/gửi MQTT messages  
- Giao tiếp UART với STM32
- Trạng thái GPIO relay

### Kiểm tra UART
Có thể sử dụng USB-TTL adapter kết nối với UART pins để monitor giao tiếp với STM32.

## Troubleshooting

### 1. ESP32 không kết nối WiFi
- Kiểm tra SSID/Password trong menuconfig
- Kiểm tra tín hiệu WiFi
- Reset ESP32

### 2. MQTT không kết nối
- Kiểm tra broker URL, username, password
- Kiểm tra network connectivity
- Kiểm tra firewall settings

### 3. Không nhận được dữ liệu từ STM32  
- Kiểm tra kết nối UART (TX-RX cross-connect)
- Kiểm tra baud rate match giữa ESP32 và STM32
- Kiểm tra format dữ liệu từ STM32

### 4. Relay không hoạt động
- Kiểm tra GPIO pin configuration
- Kiểm tra nguồn cấp cho relay module
- Đo voltage tại GPIO pin khi ON/OFF

## Mở rộng

### Thêm sensor khác
Có thể mở rộng để hỗ trợ thêm sensors bằng cách:
1. Thêm topics mới trong code
2. Cập nhật parser cho format dữ liệu mới
3. Subscribe thêm command topics

### Bảo mật
Để tăng cường bảo mật:
1. Sử dụng MQTT over TLS (mqtts://)
2. Implement authentication với certificates
3. Encrypt sensitive data

### Performance
Để tối ưu performance:
1. Điều chỉnh MQTT keepalive và QoS
2. Tối ưu buffer sizes
3. Sử dụng FreeRTOS task priorities phù hợp