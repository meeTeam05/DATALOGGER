# Mosquitto MQTT Broker Setup

A production-ready MQTT broker configuration for IoT data logging with ESP32 devices and web dashboards.

## 🏗️ Project Structure

```
broker/
├── mosquitto.conf           # Main broker configuration
├── config/
│   └── auth/
│       └── passwd.txt       # User credentials (bcrypt hashed)
├── data/
│   └── mosquitto.db         # Persistence database
└── log/
    └── mosquitto.log        # Broker logs
```

> **Note:** Keep `data/` and `log/` directories out of version control

## ⚡ Quick Start

### Prerequisites
- Docker installed on your system
- Basic understanding of MQTT protocol

### 1. Setup Directory Structure
```bash
mkdir -p broker/{config/auth,data,log}
```

### 2. Create User Credentials
```bash
# Create first user (replace 'DataLogger' with your username)
docker run --rm -v "$PWD/broker/config/auth:/work" eclipse-mosquitto:2 \
  mosquitto_passwd -c /work/passwd.txt DataLogger

# Add additional users (omit -c flag)
docker run --rm -v "$PWD/broker/config/auth:/work" eclipse-mosquitto:2 \
  mosquitto_passwd /work/passwd.txt another_user
```

### 3. Run with Docker
```bash
docker run -d --name mqtt-broker \
  -p 1883:1883 -p 8083:8083 \
  -v "$PWD/broker/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  -v "$PWD/broker/config/auth:/mosquitto/config/auth" \
  -v "$PWD/broker/data:/mosquitto/data" \
  -v "$PWD/broker/log:/mosquitto/log" \
  eclipse-mosquitto:2
```

### 4. Or Use Docker Compose
```yaml
version: '3.8'
services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mqtt-broker
    ports:
      - "1883:1883"  # MQTT
      - "8083:8083"  # WebSockets
    volumes:
      - ./broker/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./broker/config/auth:/mosquitto/config/auth
      - ./broker/data:/mosquitto/data
      - ./broker/log:/mosquitto/log
    restart: unless-stopped
```

```bash
docker-compose up -d
```

## 🔧 Configuration Features

The broker is configured with the following capabilities:

| Feature | Configuration | Description |
|---------|---------------|-------------|
| **MQTT Protocol** | Port 1883 | Standard MQTT for ESP32 and IoT devices |
| **WebSockets** | Port 8083 | Web dashboard connectivity |
| **Authentication** | Required | No anonymous connections allowed |
| **Persistence** | Enabled | Messages survive broker restarts |
| **Logging** | Dual output | Console + file logging |
| **Connection Limits** | Unlimited | Configurable message queues |

## 🧪 Testing the Setup

### Terminal Testing
**Subscribe to messages** (Terminal 1):
```bash
mosquitto_sub -h localhost -p 1883 -u DataLogger -P your_password -t "sensors/temperature" -v
```

**Publish test message** (Terminal 2):
```bash
mosquitto_pub -h localhost -p 1883 -u DataLogger -P your_password -t "sensors/temperature" -m "23.5"
```

### Web Client Connection
Connect your web dashboard to WebSockets endpoint:
```
ws://localhost:8083
```
or for remote access:
```
ws://your-server-ip:8083
```

## 📊 Monitoring & Logs

### View Live Logs
```bash
# Container logs
docker logs -f mqtt-broker

# File logs
tail -f broker/log/mosquitto.log
```

### Check Broker Status
```bash
# Container status
docker ps | grep mqtt-broker

# Test connectivity
mosquitto_pub -h localhost -p 1883 -u DataLogger -P your_password -t "test/ping" -m "alive"
```

## 🔒 Security Features

- **No Anonymous Access**: All connections require valid credentials
- **Bcrypt Password Hashing**: Secure password storage
- **Connection Limits**: Configurable to prevent DoS attacks
- **Message Queue Limits**: Prevents memory exhaustion

## 🛠️ Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| **Connection Refused** | Broker not running | Check `docker ps` and restart if needed |
| **Auth Failed** | Invalid credentials | Verify username/password in `passwd.txt` |
| **WebSocket Connection Failed** | Port 8083 blocked | Check firewall settings |
| **No Persistence** | Volume mount issue | Verify `data/` directory permissions |
| **Missing Logs** | Log volume not mounted | Check `log/` directory mount |

### Common Commands
```bash
# Restart broker
docker restart mqtt-broker

# Clean restart (removes persistence)
docker rm -f mqtt-broker && rm -rf broker/data/* broker/log/*

# View configuration
docker exec mqtt-broker cat /mosquitto/config/mosquitto.conf
```

## 📁 Runtime Data

- **Persistence Database**: `broker/data/mosquitto.db`
- **Authentication File**: `broker/config/auth/passwd.txt`
- **Log Files**: `broker/log/mosquitto.log`
- **Configuration**: `broker/mosquitto.conf`

## 🚀 Production Considerations

### Performance Tuning
- Adjust `max_inflight_messages` based on client load
- Monitor `max_queued_messages` for memory usage
- Enable compression for high-traffic scenarios

### Security Hardening
- Use TLS/SSL certificates for encrypted connections
- Implement topic-based access control (ACL)
- Regular password rotation policy
- Network-level security (VPN, firewall rules)

### Backup Strategy
```bash
# Backup persistence data
cp broker/data/mosquitto.db backups/mosquitto_$(date +%Y%m%d).db

# Backup user credentials
cp broker/config/auth/passwd.txt backups/passwd_$(date +%Y%m%d).txt
```

## 📚 Integration Examples

### ESP32 Connection
```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* mqtt_server = "your-server-ip";
const int mqtt_port = 1883;
const char* mqtt_user = "DataLogger";
const char* mqtt_password = "your_password";
```

### Web Dashboard Connection
```javascript
const client = mqtt.connect('ws://your-server-ip:8083', {
  username: 'DataLogger',
  password: 'your_password'
});
```

## License

MIT License - see project root for details.