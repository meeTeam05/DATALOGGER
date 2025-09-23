// Global variables
let isPeriodic = false;
let isDeviceOn = false;
let isMqttConnected = false;
let frameRate = 1; // Hz
let temperatureData = [];
let humidityData = [];
let statusQueue = [];
let maxDataPoints = 15;
let maxStatusItems = 5;
let mqttClient = null;

// Current values for display (updated only from MQTT)
let currentTemp = 0.0;
let currentHumi = 0.0;

// MQTT Configuration - Set default credentials to match broker
const MQTT_CONFIG = {
    host: '127.0.0.1',
    port: 8083,
    path: '/mqtt',
    username: 'DataLogger',             // Same as ESP32 uses
    password: 'datalogger',             // Set password if needed
    url: 'ws://127.0.0.1:8083/mqtt',
    topics: {
        command: "esp32/sensor/sht3x/command",
        deviceControl: "esp32/control/relay",
        periodicTemp: "esp32/sensor/sht3x/periodic/temperature",
        periodicHumi: "esp32/sensor/sht3x/periodic/humidity",
        singleTemp: "esp32/sensor/sht3x/single/temperature",
        singleHumi: "esp32/sensor/sht3x/single/humidity"
    }
};

// Chart configurations
const chartTempConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Temperature (°C)',
            data: [],
            borderColor: 'rgb(102, 126, 234)',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: { 
                    color: 'rgba(102, 126, 234, 0.1)',
                    drawBorder: false
                },
                ticks: { 
                    color: '#2c3e50',
                    font: { size: 10 }
                }
            },
            x: {
                grid: { 
                    color: 'rgba(102, 126, 234, 0.1)',
                    drawBorder: false
                },
                ticks: { 
                    color: '#2c3e50',
                    font: { size: 10 },
                    maxTicksLimit: 8
                }
            }
        },
        plugins: {
            legend: { 
                labels: { 
                    color: '#2c3e50',
                    font: { size: 11 }
                }
            }
        },
        animation: { 
            duration: 200
        }
    }
};

const chartHumiConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Humidity (%)',
            data: [],
            borderColor: 'rgba(197, 102, 234, 1)',
            backgroundColor: 'rgba(197, 102, 234, 0.1)',
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: { 
                    color: 'rgba(197, 102, 234, 0.1)',
                    drawBorder: false
                },
                ticks: { 
                    color: '#2c3e50',
                    font: { size: 10 }
                }
            },
            x: {
                grid: { 
                    color: 'rgba(197, 102, 234, 0.1)',
                    drawBorder: false
                },
                ticks: { 
                    color: '#2c3e50',
                    font: { size: 10 },
                    maxTicksLimit: 8
                }
            }
        },
        plugins: {
            legend: { 
                labels: { 
                    color: '#2c3e50',
                    font: { size: 11 }
                }
            }
        },
        animation: { 
            duration: 200
        }
    }
};

// Initialize charts
let chart1, chart2;

// Device validation function
function validateDeviceState(operation) {
    if (!isDeviceOn) {
        addStatus(`[WARNING] Turn on device first`, 'WARNING');
        return false;
    }
    if (!isMqttConnected) {
        addStatus('MQTT not connected', 'ERROR');
        return false;
    }
    return true;
}

// MQTT Functions
function updateConnectionStatus(connected) {
    isMqttConnected = connected;
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'MQTT Connected';
        addStatus('MQTT broker connected', 'MQTT');
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'MQTT Disconnected';
        addStatus('MQTT broker disconnected', 'MQTT');
        // Stop periodic mode if MQTT disconnected
        if (isPeriodic) {
            stopPeriodicMode();
        }
    }
}

function publishMQTT(topic, message) {
    if (mqttClient && isMqttConnected) {
        mqttClient.publish(topic, message, (err) => {
            if (err) {
                addStatus(`Publish failed: ${err.message}`, 'ERROR');
            } else {
                console.log(`Published to ${topic}: ${message}`);
            }
        });
    } else {
        addStatus('Cannot publish: MQTT not connected', 'ERROR');
    }
}

function connectMQTT() {
    try {
        MQTT_CONFIG.url = `ws://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}${MQTT_CONFIG.path}`;
        
        if (mqttClient) {
            mqttClient.end(true);
            mqttClient = null;
        }
        
        addStatus('Connecting to MQTT...', 'MQTT');
        
        const connectOptions = {
            clientId: 'WebClient_' + Math.random().toString(16).substring(2, 8),
            reconnectPeriod: 2000,
            clean: true,
            connectTimeout: 10000,
            keepalive: 30,
            protocolVersion: 4,
            protocolId: 'MQTT'
        };
        
        // Always add username if configured (broker seems to require it)
        if (MQTT_CONFIG.username) {
            connectOptions.username = MQTT_CONFIG.username;
            if (MQTT_CONFIG.password) {
                connectOptions.password = MQTT_CONFIG.password;
            }
            console.log('Using credentials:', MQTT_CONFIG.username);
        }
        
        console.log('Connecting to:', MQTT_CONFIG.url);
        console.log('Options:', connectOptions);
        
        mqttClient = mqtt.connect(MQTT_CONFIG.url, connectOptions);

        mqttClient.on('connect', (connack) => {
            console.log('MQTT Connected:', connack);
            updateConnectionStatus(true);
            
            const topics = [
                MQTT_CONFIG.topics.periodicTemp,
                MQTT_CONFIG.topics.periodicHumi,
                MQTT_CONFIG.topics.singleTemp,
                MQTT_CONFIG.topics.singleHumi
            ];
            
            mqttClient.subscribe(topics, { qos: 0 }, (err) => {
                if (err) {
                    console.error('Subscribe error:', err);
                    addStatus('MQTT subscribe failed: ' + err.message, 'ERROR');
                } else {
                    console.log('Subscribed to topics:', topics);
                    addStatus('All topics subscribed successfully', 'MQTT');
                }
            });
        });

        mqttClient.on('reconnect', () => {
            console.log('MQTT Reconnecting...');
            addStatus('MQTT reconnecting...', 'MQTT');
        });

        mqttClient.on('error', (e) => {
            console.error('MQTT Error:', e);
            updateConnectionStatus(false);
            
            let errorMsg = 'Connection error';
            if (e.code === 5) {
                errorMsg = 'Not authorized - check broker settings';
            } else if (e.code === 4) {
                errorMsg = 'Bad username or password';
            } else if (e.code === 2) {
                errorMsg = 'Client identifier rejected';
            } else if (e.message) {
                errorMsg = e.message;
            }
            
            addStatus('MQTT error: ' + errorMsg, 'ERROR');
        });

        mqttClient.on('offline', () => {
            console.log('MQTT Offline');
            updateConnectionStatus(false);
            addStatus('MQTT broker offline', 'MQTT');
        });

        mqttClient.on('close', () => {
            console.log('MQTT Connection closed');
            updateConnectionStatus(false);
        });

        mqttClient.on('disconnect', (packet) => {
            console.log('MQTT Disconnected:', packet);
            updateConnectionStatus(false);
            addStatus('MQTT disconnected by broker', 'MQTT');
        });

        mqttClient.on('message', (topic, payload) => {
            console.log('MQTT Message:', topic, payload.toString());
            
            const text = payload.toString();
            let val = parseFloat(text);
            
            // Support JSON format {"value": 26.4, "unit": "C"}
            if (isNaN(val)) {
                try {
                    const obj = JSON.parse(text);
                    if (obj && typeof obj.value !== 'undefined') {
                        val = parseFloat(obj.value);
                    }
                } catch (e) {
                    console.log('Failed to parse JSON:', text);
                    return;
                }
            }
            
            if (!isNaN(val) && isFinite(val)) {
                switch (topic) {
                    case MQTT_CONFIG.topics.periodicTemp:
                        addStatus(`Periodic temp: ${val}°C`, 'DATA');
                        pushTemperature(val, true); // true indicates periodic data
                        break;
                    case MQTT_CONFIG.topics.periodicHumi:
                        addStatus(`Periodic humi: ${val}%`, 'DATA');
                        pushHumidity(val, true); // true indicates periodic data
                        break;
                    case MQTT_CONFIG.topics.singleTemp:
                        addStatus(`Single temp: ${val}°C`, 'SINGLE');
                        pushTemperature(val, false); // false indicates single reading
                        break;
                    case MQTT_CONFIG.topics.singleHumi:
                        addStatus(`Single humi: ${val}%`, 'SINGLE');
                        pushHumidity(val, false); // false indicates single reading
                        break;
                }
            } else {
                console.log('Invalid value received:', text);
            }
        });
        
    } catch (e) {
        console.error('MQTT Init Error:', e);
        updateConnectionStatus(false);
        addStatus('MQTT init failed: ' + e.message, 'ERROR');
    }
}

// Modal Functions
function openModal() {
    document.getElementById('mqttModal').style.display = 'flex';
    document.getElementById('mqttIp').value = MQTT_CONFIG.host;
    document.getElementById('mqttPort').value = MQTT_CONFIG.port;
    document.getElementById('mqttPath').value = MQTT_CONFIG.path;
    document.getElementById('mqttUser').value = MQTT_CONFIG.username;
    document.getElementById('mqttPass').value = MQTT_CONFIG.password;
}

function closeModal() {
    document.getElementById('mqttModal').style.display = 'none';
}

function saveAndConnect() {
    const ip = document.getElementById('mqttIp').value.trim();
    const port = document.getElementById('mqttPort').value.trim();
    const path = document.getElementById('mqttPath').value.trim();
    const username = document.getElementById('mqttUser').value.trim();
    const password = document.getElementById('mqttPass').value.trim();
    
    if (!ip || !port) {
        addStatus('Please enter valid IP and port', 'ERROR');
        return;
    }
    
    MQTT_CONFIG.host = ip;
    MQTT_CONFIG.port = port;
    MQTT_CONFIG.path = path || '/mqtt';
    MQTT_CONFIG.username = username;
    MQTT_CONFIG.password = password;
    
    closeModal();
    addStatus(`Connecting to ${ip}:${port}${MQTT_CONFIG.path}...`, 'MQTT');
    
    if (username) {
        addStatus(`Using authentication: ${username}`, 'MQTT');
    }
    
    connectMQTT();
}

// Helper functions for MQTT data - Fixed to handle periodic vs single data
function pushTemperature(newTemp, isPeriodic = false) {
    currentTemp = newTemp;
    updateCurrentDisplay();
    
    // Only update chart if in periodic mode AND the data is from periodic source
    if (isPeriodic && chart1) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        chart1.data.labels.push(timestamp);
        chart1.data.datasets[0].data.push(newTemp);
        
        if (chart1.data.labels.length > maxDataPoints) {
            chart1.data.labels.shift();
            chart1.data.datasets[0].data.shift();
        }
        chart1.update('none');
    }
    
    // Store data (for periodic only)
    if (isPeriodic) {
        temperatureData.push(newTemp);
        if (temperatureData.length > maxDataPoints) {
            temperatureData.shift();
        }
    }
}

function pushHumidity(newHumi, isPeriodic = false) {
    currentHumi = newHumi;
    updateCurrentDisplay();
    
    // Only update chart if in periodic mode AND the data is from periodic source
    if (isPeriodic && chart2) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        chart2.data.labels.push(timestamp);
        chart2.data.datasets[0].data.push(newHumi);
        
        if (chart2.data.labels.length > maxDataPoints) {
            chart2.data.labels.shift();
            chart2.data.datasets[0].data.shift();
        }
        chart2.update('none');
    }
    
    // Store data (for periodic only)
    if (isPeriodic) {
        humidityData.push(newHumi);
        if (humidityData.length > maxDataPoints) {
            humidityData.shift();
        }
    }
}

// Update combined display
function updateCurrentDisplay() {
    const el = document.getElementById('currentDisplay');
    if (el) {
        el.textContent = `Current: ${currentTemp}°C & ${currentHumi}% RH`;
        el.classList.add('pulse');
        setTimeout(() => el.classList.remove('pulse'), 800);
    }
}

// Status management with better performance and proper color coding
function addStatus(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const statusItem = {
        text: `[${type}] ${timestamp}: ${message}`,
        type: type
    };
    
    statusQueue.push(statusItem);
    if (statusQueue.length > maxStatusItems) {
        statusQueue.shift();
    }
    
    // Throttled update for performance
    requestAnimationFrame(updateStatusDisplay);
}

function updateStatusDisplay() {
    const statusDisplay = document.getElementById('statusDisplay');
    if (statusDisplay) {
        statusDisplay.innerHTML = statusQueue.map(item => {
            let className = 'status-item';
            if (item.type === 'WARNING') {
                className += ' status-warning';
            } else if (item.type === 'ERROR') {
                className += ' status-error';
            } else if (item.type === 'MQTT') {
                className += ' status-mqtt';
            }
            return `<div class="${className}">${item.text}</div>`;
        }).join('');
        statusDisplay.scrollTop = statusDisplay.scrollHeight;
    }
}

// Control functions (MQTT commands only, no simulation)
function startPeriodicMode() {
    if (!validateDeviceState('periodic mode')) return;
    
    const command = `SHT3X PERIODIC ${frameRate} HIGH`;
    publishMQTT(MQTT_CONFIG.topics.command, command);
    
    isPeriodic = true;
    document.getElementById('stopBtn').style.display = 'block';
    document.getElementById('periodicBtn').style.display = 'none';
    
    addStatus(`Started periodic mode at ${frameRate} Hz`, 'START');
}

function stopPeriodicMode() {
    if (!isMqttConnected) {
        addStatus('MQTT not connected', 'ERROR');
        return;
    }
    
    publishMQTT(MQTT_CONFIG.topics.command, 'SHT3X PERIODIC STOP');
    
    isPeriodic = false;
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('periodicBtn').style.display = 'block';
    
    addStatus('Stopped periodic mode', 'STOP');
}

function singleRead() {
    if (!validateDeviceState('single read')) return;
    
    publishMQTT(MQTT_CONFIG.topics.command, 'SHT3X SINGLE HIGH');
    addStatus('Single read command sent', 'SINGLE');
}

// Fixed device control function
function toggleDevice() {
    if (!isMqttConnected) {
        addStatus('MQTT not connected', 'ERROR');
        return;
    }
    
    // Send the appropriate command based on current state
    const command = isDeviceOn ? 'RELAY OFF' : 'RELAY ON';
    publishMQTT(MQTT_CONFIG.topics.deviceControl, command);
    addStatus(`Device command sent: ${command}`, 'POWER');
    
    // Toggle the state
    isDeviceOn = !isDeviceOn;
    const deviceBtn = document.getElementById('deviceBtn');
    if (deviceBtn) {
        deviceBtn.textContent = isDeviceOn ? 'DEVICE ON' : 'DEVICE OFF';
        deviceBtn.classList.toggle('on');
    }
    
    if (isDeviceOn) {
        addStatus('Device control: ON', 'POWER');
    } else {
        addStatus('Device control: OFF', 'POWER');
        if (isPeriodic) {
            stopPeriodicMode();
        }
    }
}

// Resize handler for charts
function handleResize() {
    if (chart1) chart1.resize();
    if (chart2) chart2.resize();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts after DOM is loaded
    const ctx1 = document.getElementById('tempChart1');
    const ctx2 = document.getElementById('tempChart2');
    
    if (ctx1) chart1 = new Chart(ctx1.getContext('2d'), chartTempConfig);
    if (ctx2) chart2 = new Chart(ctx2.getContext('2d'), chartHumiConfig);
    
    // MQTT Modal event listeners
    document.getElementById('settingsBtn').addEventListener('click', openModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('saveBtn').addEventListener('click', saveAndConnect);
    
    // Close modal when clicking outside
    document.getElementById('mqttModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // Frame rate selector
    document.querySelectorAll('.frame-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const activeBtn = document.querySelector('.frame-btn.active');
            if (activeBtn) activeBtn.classList.remove('active');
            this.classList.add('active');
            frameRate = parseFloat(this.dataset.rate);
            addStatus(`Frame rate: ${frameRate}Hz`);
            
            if (isPeriodic && isDeviceOn) {
                startPeriodicMode();
            }
        });
    });
    
    // Control buttons
    const periodicBtn = document.getElementById('periodicBtn');
    const stopBtn = document.getElementById('stopBtn');
    const singleBtn = document.getElementById('singleBtn');
    const deviceBtn = document.getElementById('deviceBtn');
    
    if (periodicBtn) periodicBtn.addEventListener('click', startPeriodicMode);
    if (stopBtn) stopBtn.addEventListener('click', stopPeriodicMode);
    if (singleBtn) singleBtn.addEventListener('click', singleRead);
    if (deviceBtn) deviceBtn.addEventListener('click', toggleDevice);
    
    // Window resize handler
    window.addEventListener('resize', handleResize);
    
    // Initialize with demo data
    setTimeout(() => {
        addStatus('SHT31 initialized');
        addStatus('System ready');
        addStatus('[WARNING] Turn on device first', 'WARNING');
        updateConnectionStatus(false);
    }, 500);
    
    // Try to connect MQTT on load
    setTimeout(() => {
        connectMQTT();
    }, 1000);
});