// Global variables
let isPeriodic = false;
let isDeviceOn = false;
let isMqttConnected = false;
let isFirebaseConnected = false;
let frameRate = 1; // Hz
let temperatureData = [];
let humidityData = [];
let statusQueue = [];
let maxDataPoints = 50; // Increased for better history
let maxStatusItems = 5;
let mqttClient = null;
let firebaseDb = null;

// Current values for display (updated only from MQTT)
let currentTemp = 0.0;
let currentHumi = 0.0;

// Firebase Configuration
let FIREBASE_CONFIG = {
    apiKey: "AIzaSyAxEhTb1cNHTwmVWh4vbpA5MZSF0Vf0l0U",
    databaseURL: "https://datalogger-8c5d5-default-rtdb.firebaseio.com/",
    projectId: "datalogger-8c5d5"
};

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

// Enhanced Chart configurations with beautiful styling
const chartTempConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Temperature (°C)',
            data: [],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            borderWidth: 3,
            fill: true,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointHoverBorderColor: 'white',
            pointHoverBorderWidth: 3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#2c3e50',
                    font: { size: 12, weight: 'bold' },
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 99, 132, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(255, 99, 132, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#2c3e50',
                    font: { size: 11, weight: 'bold' },
                    callback: function(value) {
                        return value.toFixed(1) + '°C';
                    }
                },
                title: {
                    display: true,
                    text: 'Temperature (°C)',
                    color: '#2c3e50',
                    font: { size: 12, weight: 'bold' }
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 99, 132, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#2c3e50',
                    font: { size: 10 },
                    maxTicksLimit: 8
                },
                title: {
                    display: true,
                    text: 'Time',
                    color: '#2c3e50',
                    font: { size: 12, weight: 'bold' }
                }
            }
        },
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
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
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            borderWidth: 3,
            fill: true,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointHoverBorderColor: 'white',
            pointHoverBorderWidth: 3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#2c3e50',
                    font: { size: 12, weight: 'bold' },
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(54, 162, 235, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        return `Humidity: ${context.parsed.y.toFixed(1)}%`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(54, 162, 235, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#2c3e50',
                    font: { size: 11, weight: 'bold' },
                    callback: function(value) {
                        return value.toFixed(1) + '%';
                    }
                },
                title: {
                    display: true,
                    text: 'Humidity (%)',
                    color: '#2c3e50',
                    font: { size: 12, weight: 'bold' }
                }
            },
            x: {
                grid: {
                    color: 'rgba(54, 162, 235, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#2c3e50',
                    font: { size: 10 },
                    maxTicksLimit: 8
                },
                title: {
                    display: true,
                    text: 'Time',
                    color: '#2c3e50',
                    font: { size: 12, weight: 'bold' }
                }
            }
        },
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        }
    }
};

// Initialize charts
let chart1, chart2;

// Firebase Functions
function initializeFirebase() {
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.databaseURL || !FIREBASE_CONFIG.projectId) {
        addStatus('[WARNING] Firebase configuration incomplete', 'WARNING');
        return false;
    }

    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        firebaseDb = firebase.database();
        
        // Test connection and write permissions
        firebaseDb.ref('.info/connected').on('value', function(snapshot) {
            if (snapshot.val() === true) {
                // Test write permission with a simple test
                firebaseDb.ref('test/connection').set({
                    timestamp: Date.now(),
                    message: 'Connection test'
                }).then(() => {
                    updateFirebaseStatus(true);
                    addStatus('Firebase write permissions verified', 'FIREBASE');
                    // Clean up test data
                    firebaseDb.ref('test').remove();
                }).catch((error) => {
                    updateFirebaseStatus(false);
                    addStatus(`Firebase permission error: ${error.code}`, 'ERROR');
                    addStatus('Please update Firebase database rules', 'WARNING');
                });
            } else {
                updateFirebaseStatus(false);
            }
        });
        
        return true;
    } catch (error) {
        addStatus(`Firebase init error: ${error.message}`, 'ERROR');
        return false;
    }
}

function updateFirebaseStatus(connected) {
    isFirebaseConnected = connected;
    const firebaseDot = document.getElementById('firebaseDot');
    const firebaseText = document.getElementById('firebaseText');
    
    if (connected) {
        firebaseDot.className = 'status-dot connected';
        firebaseText.textContent = 'Firebase Connected';
        addStatus('Firebase database connected', 'FIREBASE');
    } else {
        firebaseDot.className = 'status-dot disconnected';
        firebaseText.textContent = 'Firebase Disconnected';
        addStatus('Firebase database disconnected', 'FIREBASE');
    }
}

function saveToFirebase(type, value, timestamp) {
    if (!isFirebaseConnected || !firebaseDb) return;
    
    const data = {
        value: value,
        timestamp: timestamp,
        date: new Date(timestamp).toISOString(),
        source: isPeriodic ? 'periodic' : 'single'
    };
    
    firebaseDb.ref(`sht31/${type}/${timestamp}`).set(data)
        .then(() => {
            console.log(`Saved ${type}: ${value} to Firebase`);
        })
        .catch((error) => {
            addStatus(`Firebase save error: ${error.message}`, 'ERROR');
        });
}

function loadHistoricalData() {
    if (!isFirebaseConnected || !firebaseDb) {
        addStatus('Firebase not connected', 'ERROR');
        return;
    }
    
    addStatus('Loading historical data...', 'FIREBASE');
    
    // Load last 50 temperature readings
    firebaseDb.ref('sht31/temperature').limitToLast(maxDataPoints).once('value', (snapshot) => {
        const tempData = snapshot.val();
        if (tempData) {
            const tempArray = Object.values(tempData);
            tempArray.forEach(item => {
                const timestamp = new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                if (chart1) {
                    chart1.data.labels.push(timestamp);
                    chart1.data.datasets[0].data.push(item.value);
                }
                temperatureData.push(item.value);
            });
            
            if (chart1) {
                chart1.update('none');
                updateTempStats();
            }
        }
    });
    
    // Load last 50 humidity readings
    firebaseDb.ref('sht31/humidity').limitToLast(maxDataPoints).once('value', (snapshot) => {
        const humiData = snapshot.val();
        if (humiData) {
            const humiArray = Object.values(humiData);
            humiArray.forEach(item => {
                const timestamp = new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                if (chart2) {
                    chart2.data.labels.push(timestamp);
                    chart2.data.datasets[0].data.push(item.value);
                }
                humidityData.push(item.value);
            });
            
            if (chart2) {
                chart2.update('none');
                updateHumiStats();
            }
        }
        addStatus('Historical data loaded successfully', 'FIREBASE');
    });
}

function clearChartData() {
    if (chart1) {
        chart1.data.labels = [];
        chart1.data.datasets[0].data = [];
        chart1.update('none');
    }
    
    if (chart2) {
        chart2.data.labels = [];
        chart2.data.datasets[0].data = [];
        chart2.update('none');
    }
    
    temperatureData = [];
    humidityData = [];
    
    updateTempStats();
    updateHumiStats();
    addStatus('Chart data cleared', 'INFO');
}

// Statistics calculation functions
function updateTempStats() {
    const tempStats = document.getElementById('tempStats');
    if (temperatureData.length > 0) {
        const min = Math.min(...temperatureData).toFixed(1);
        const max = Math.max(...temperatureData).toFixed(1);
        const avg = (temperatureData.reduce((a, b) => a + b, 0) / temperatureData.length).toFixed(1);
        tempStats.textContent = `Min: ${min}°C | Max: ${max}°C | Avg: ${avg}°C`;
    } else {
        tempStats.textContent = 'Min: -- | Max: -- | Avg: --';
    }
}

function updateHumiStats() {
    const humiStats = document.getElementById('humiStats');
    if (humidityData.length > 0) {
        const min = Math.min(...humidityData).toFixed(1);
        const max = Math.max(...humidityData).toFixed(1);
        const avg = (humidityData.reduce((a, b) => a + b, 0) / humidityData.length).toFixed(1);
        humiStats.textContent = `Min: ${min}% | Max: ${max}% | Avg: ${avg}%`;
    } else {
        humiStats.textContent = 'Min: -- | Max: -- | Avg: --';
    }
}

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
                MQTT_CONFIG.topics.singleHumi,
                MQTT_CONFIG.topics.deviceControl  // Subscribe to relay status updates
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
            
            // Handle relay status messages
            if (topic === MQTT_CONFIG.topics.deviceControl) {
                handleRelayStatusMessage(text);
                return;
            }
            
            // Handle sensor data
            let val = parseFloat(text);
            
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
                const timestamp = Date.now();
                switch (topic) {
                    case MQTT_CONFIG.topics.periodicTemp:
                        addStatus(`Periodic temp: ${val}°C`, 'DATA');
                        pushTemperature(val, true, timestamp);
                        break;
                    case MQTT_CONFIG.topics.periodicHumi:
                        addStatus(`Periodic humi: ${val}%`, 'DATA');
                        pushHumidity(val, true, timestamp);
                        break;
                    case MQTT_CONFIG.topics.singleTemp:
                        addStatus(`Single temp: ${val}°C`, 'SINGLE');
                        pushTemperature(val, false, timestamp);
                        break;
                    case MQTT_CONFIG.topics.singleHumi:
                        addStatus(`Single humi: ${val}%`, 'SINGLE');
                        pushHumidity(val, false, timestamp);
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
    document.getElementById('firebaseUrl').value = FIREBASE_CONFIG.databaseURL;
    document.getElementById('firebaseApiKey').value = FIREBASE_CONFIG.apiKey;
    document.getElementById('firebaseProject').value = FIREBASE_CONFIG.projectId;
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
    
    const firebaseUrl = document.getElementById('firebaseUrl').value.trim();
    const firebaseApiKey = document.getElementById('firebaseApiKey').value.trim();
    const firebaseProject = document.getElementById('firebaseProject').value.trim();
    
    if (!ip || !port) {
        addStatus('Please enter valid IP and port', 'ERROR');
        return;
    }
    
    MQTT_CONFIG.host = ip;
    MQTT_CONFIG.port = port;
    MQTT_CONFIG.path = path || '/mqtt';
    MQTT_CONFIG.username = username;
    MQTT_CONFIG.password = password;
    
    FIREBASE_CONFIG.databaseURL = firebaseUrl;
    FIREBASE_CONFIG.apiKey = firebaseApiKey;
    FIREBASE_CONFIG.projectId = firebaseProject;
    
    closeModal();
    addStatus(`Connecting to ${ip}:${port}${MQTT_CONFIG.path}...`, 'MQTT');
    
    if (username) {
        addStatus(`Using authentication: ${username}`, 'MQTT');
    }
    
    connectMQTT();
    
    if (firebaseUrl && firebaseApiKey && firebaseProject) {
        addStatus('Initializing Firebase...', 'FIREBASE');
        initializeFirebase();
    }
}

// Enhanced helper functions with Firebase integration
function pushTemperature(newTemp, isPeriodic = false, timestamp = Date.now()) {
    currentTemp = newTemp;
    updateCurrentDisplay();
    
    // Save to Firebase if enabled
    if (isFirebaseConnected && isPeriodic) {
        saveToFirebase('temperature', newTemp, timestamp);
    }
    
    // Only update chart if in periodic mode AND the data is from periodic source
    if (isPeriodic && chart1) {
        const timeString = new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        chart1.data.labels.push(timeString);
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
        updateTempStats();
    }
}

function pushHumidity(newHumi, isPeriodic = false, timestamp = Date.now()) {
    currentHumi = newHumi;
    updateCurrentDisplay();
    
    // Save to Firebase if enabled
    if (isFirebaseConnected && isPeriodic) {
        saveToFirebase('humidity', newHumi, timestamp);
    }
    
    // Only update chart if in periodic mode AND the data is from periodic source
    if (isPeriodic && chart2) {
        const timeString = new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        chart2.data.labels.push(timeString);
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
        updateHumiStats();
    }
}

// Update combined display
function updateCurrentDisplay() {
    const el = document.getElementById('currentDisplay');
    if (el) {
        el.textContent = `Current: ${currentTemp.toFixed(1)}°C & ${currentHumi.toFixed(1)}% RH`;
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
            } else if (item.type === 'FIREBASE') {
                className += ' status-firebase';
            } else if (item.type === 'SYNC') {
                className += ' status-sync';
            }
            return `<div class="${className}">${item.text}</div>`;
        }).join('');
        statusDisplay.scrollTop = statusDisplay.scrollHeight;
    }
}

// Handle relay status synchronization from ESP32
function handleRelayStatusMessage(message) {
    console.log('Relay status message:', message);
    
    let newRelayState = false;
    
    // Parse different relay status formats from ESP32
    if (message.includes('RELAY ON') || message.includes('relay:ON')) {
        newRelayState = true;
    } else if (message.includes('RELAY OFF') || message.includes('relay:OFF')) {
        newRelayState = false;
    } else {
        // Try to parse as simple ON/OFF
        const upperMessage = message.toUpperCase().trim();
        if (upperMessage === 'ON' || upperMessage === 'RELAY ON') {
            newRelayState = true;
        } else if (upperMessage === 'OFF' || upperMessage === 'RELAY OFF') {
            newRelayState = false;
        } else {
            console.log('Unknown relay status format:', message);
            return;
        }
    }
    
    // Only update if state actually changed
    if (newRelayState !== isDeviceOn) {
        isDeviceOn = newRelayState;
        const deviceBtn = document.getElementById('deviceBtn');
        if (deviceBtn) {
            deviceBtn.textContent = isDeviceOn ? 'DEVICE ON' : 'DEVICE OFF';
            if (isDeviceOn) {
                deviceBtn.classList.add('on');
            } else {
                deviceBtn.classList.remove('on');
            }
        }
        
        addStatus(`Device state synced from ESP32: ${isDeviceOn ? 'ON' : 'OFF'}`, 'SYNC');
        
        // If relay turned off, stop periodic mode
        if (!isDeviceOn && isPeriodic) {
            stopPeriodicMode();
        }
    }
}
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

function toggleDevice() {
    if (!isMqttConnected) {
        addStatus('MQTT not connected', 'ERROR');
        return;
    }
    
    const command = isDeviceOn ? 'RELAY OFF' : 'RELAY ON';
    publishMQTT(MQTT_CONFIG.topics.deviceControl, command);
    addStatus(`Device command sent: ${command}`, 'POWER');
    
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
    const loadDataBtn = document.getElementById('loadDataBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    if (periodicBtn) periodicBtn.addEventListener('click', startPeriodicMode);
    if (stopBtn) stopBtn.addEventListener('click', stopPeriodicMode);
    if (singleBtn) singleBtn.addEventListener('click', singleRead);
    if (deviceBtn) deviceBtn.addEventListener('click', toggleDevice);
    if (loadDataBtn) loadDataBtn.addEventListener('click', loadHistoricalData);
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearChartData);
    
    // Window resize handler
    window.addEventListener('resize', handleResize);
    
    // Initialize with demo data
    setTimeout(() => {
        addStatus('SHT31 initialized');
        addStatus('System ready');
        addStatus('[WARNING] Configure Firebase for data persistence', 'WARNING');
        updateConnectionStatus(false);
        updateFirebaseStatus(false);
    }, 500);
    
    // Try to connect MQTT on load
    setTimeout(() => {
        connectMQTT();
    }, 1000);
});