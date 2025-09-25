Mosquitto MQTT Broker

A minimal, copy‑friendly guide to run the broker for your datalogger.

---

## Structure

```
broker/
├─ mosquitto.conf             # broker configuration
├─ config/
│   ├── mosquitto.conf  
│   ├── auth/
│   └── └── passwd.txt        # username/password file (bcrypt)       
├─ data/
│   └── mosquitto.db          # persistence (mosquitto.db)
├─ log/                       # logs (mosquitto.log)
└── └── mosquitto.db          # persistence (mosquitto.db)
```

> Tip: keep `data/` and `log/` out of git.

---

## mosquitto.conf (what it enables)

```conf
# MQTT (TCP) + WebSockets listeners
listener 1883 0.0.0.0
protocol mqtt
listener 8083 0.0.0.0
protocol websockets

# Security
allow_anonymous false
password_file /mosquitto/config/auth/passwd.txt

# Persistence
persistence true
persistence_location /mosquitto/data

# Logging
log_type all
log_dest stdout
log_dest file /mosquitto/log/mosquitto.log

# Flow limits
max_connections -1
max_inflight_messages 20
max_queued_messages 1000
```

---

## Quick start (Docker)

Create folders once:

```bash
mkdir -p broker/{auth,data,log}
```

Run the broker:

```bash
docker run -d --name datalogger-broker \
  -p 1883:1883 -p 8083:8083 \
  -v "$PWD/broker/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  -v "$PWD/broker/auth:/mosquitto/config/auth" \
  -v "$PWD/broker/data:/mosquitto/data" \
  -v "$PWD/broker/log:/mosquitto/log" \
  eclipse-mosquitto:2
```

**docker-compose.yml** (optional):

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: datalogger-broker
    ports: ["1883:1883", "8083:8083"]
    volumes:
      - ./broker/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./broker/auth:/mosquitto/config/auth
      - ./broker/data:/mosquitto/data
      - ./broker/log:/mosquitto/log
    restart: unless-stopped
```

---

## Users & passwords

Create the password file (first user):

```bash
docker run --rm -v "$PWD/broker/auth:/work" eclipse-mosquitto:2 \
  mosquitto_passwd -c /work/passwd.txt your_user
```

Add or change another user (no `-c`):

```bash
docker run --rm -v "$PWD/broker/auth:/work" eclipse-mosquitto:2 \
  mosquitto_passwd /work/passwd.txt another_user
```

---

## Test

Subscribe (terminal 1):

```bash
mosquitto_sub -h localhost -p 1883 -u your_user -P your_pass -t "demo/topic" -v
```

Publish (terminal 2):

```bash
mosquitto_pub -h localhost -p 1883 -u your_user -P your_pass -t "demo/topic" -m "hello"
```

Web clients connect via WebSockets to:

```
ws://<host>:8083
```

---

## Runtime files

* **Persistence DB** → `broker/data/`
* **Logs** → `broker/log/mosquitto.log` and container stdout

---

## Troubleshooting

* **Auth failed** → ensure `auth/passwd.txt` exists & credentials are correct (anonymous disabled)
* **No file logs** → confirm `broker/log/` is mounted to `/mosquitto/log`
* **Web UI can’t connect** → open port `8083` (WebSockets)

---

## One‑liner cleanup

```bash
docker rm -f datalogger-broker 2>/dev/null || true && \
rm -rf broker/data/* broker/log/*
```
## License

MIT (or update as required).