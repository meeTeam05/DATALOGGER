// FIXED: Global variables with better state management
let isPeriodic = false;
let isDeviceOn = false;
let isMqttConnected = false;
let isFirebaseConnected = false;
let frameRate = 1; // Hz
let temperatureData = [];
let humidityData = [];
let statusQueue = [];
let maxDataPoints = 50;
let maxStatusItems = 5;
let mqttClient = null;
let firebaseDb = null;

// Current values for display
let currentTemp = null;
let currentHumi = null;

// FIXED: Enhanced state management
let stateSync = {
    lastKnownState: null,
    syncInProgress: false,
    syncRetryCount: 0,
    maxSyncRetries: 3,
    deviceOffLock: false,
    deviceOffLockTimeout: null,
    lastSyncMessage: '' // Track duplicate messages
};

// Firebase Configuration
let FIREBASE_CONFIG = {
    apiKey: "AIzaSyAxEhTb1cNHTwmVWh4vbpA5MZSF0Vf0l0U",
    databaseURL: "https://datalogger-8c5d5-default-rtdb.firebaseio.com/",
    projectId: "datalogger-8c5d5"
};

// FIXED: Enhanced MQTT Configuration
const MQTT_CONFIG = {
    host: '127.0.0.1',
    port: 8083,
    path: '/mqtt',
    username: 'DataLogger',
    password: 'datalogger',
    url: 'ws://127.0.0.1:8083/mqtt',
    topics: {
        command: "esp32/sensor/sht3x/command",
        deviceControl: "esp32/control/relay",
        periodicTemp: "esp32/sensor/sht3x/periodic/temperature",
        periodicHumi: "esp32/sensor/sht3x/periodic/humidity",
        singleTemp: "esp32/sensor/sht3x/single/temperature",
        singleHumi: "esp32/sensor/sht3x/single/humidity",
        stateSync: "esp32/state"
    }
};

// Enhanced Chart configurations
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
            pointBorderWidth: 2
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
            pointBorderWidth: 2
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
        
        firebaseDb.ref('.info/connected').on('value', function(snapshot) {
            if (snapshot.val() === true) {
                firebaseDb.ref('test/connection').set({
                    timestamp: Date.now(),
                    message: 'Connection test'
                }).then(() => {
                    updateFirebaseStatus(true);
                    addStatus('Firebase write permissions verified', 'FIREBASE');
                    firebaseDb.ref('test').remove();
                }).catch((error) => {
                    updateFirebaseStatus(false);
                    addStatus(`Firebase permission error: ${error.code}`, 'ERROR');
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
    clearChartData();
    
    // Load temperature data
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
    
    // Load humidity data
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
    if (tempStats) {
        if (temperatureData.length > 0) {
            const min = Math.min(...temperatureData).toFixed(1);
            const max = Math.max(...temperatureData).toFixed(1);
            const avg = (temperatureData.reduce((a, b) => a + b, 0) / temperatureData.length).toFixed(1);
            tempStats.textContent = `Min: ${min}°C | Max: ${max}°C | Avg: ${avg}°C`;
        } else {
            tempStats.textContent = 'Min: -- | Max: -- | Avg: --';
        }
    }
}

function updateHumiStats() {
    const humiStats = document.getElementById('humiStats');
    if (humiStats) {
        if (humidityData.length > 0) {
            const min = Math.min(...humidityData).toFixed(1);
            const max = Math.max(...humidityData).toFixed(1);
            const avg = (humidityData.reduce((a, b) => a + b, 0) / humidityData.length).toFixed(1);
            humiStats.textContent = `Min: ${min}% | Max: ${max}% | Avg: ${avg}%`;
        } else {
            humiStats.textContent = 'Min: -- | Max: -- | Avg: --';
        }
    }
}

// FIXED: Enhanced device OFF lock management
function setDeviceOffLock(duration = 1500) {
    // Clear existing timeout if any
    if (stateSync.deviceOffLockTimeout) {
        clearTimeout(stateSync.deviceOffLockTimeout);
    }
    
    stateSync.deviceOffLock = true;
    addStatus(`Device OFF lock activated for ${duration}ms`, 'SYNC');
    
    stateSync.deviceOffLockTimeout = setTimeout(() => {
        stateSync.deviceOffLock = false;
        stateSync.deviceOffLockTimeout = null;
        addStatus('Device OFF lock released', 'SYNC');
    }, duration);
}

// State synchronization functions
function requestStateSync() {
    if (!isMqttConnected || stateSync.syncInProgress) {
        return;
    }
    
    if (stateSync.syncRetryCount >= stateSync.maxSyncRetries) {
        addStatus('Max sync retries reached, using default state', 'SYNC');
        return;
    }
    
    stateSync.syncInProgress = true;
    stateSync.syncRetryCount++;
    
    addStatus(`Requesting system state sync... (${stateSync.syncRetryCount}/${stateSync.maxSyncRetries})`, 'SYNC');
    
    // Request current state from ESP32
    publishMQTT(MQTT_CONFIG.topics.stateSync, 'REQUEST');
    
    // Reset sync state after timeout
    setTimeout(() => {
        if (stateSync.syncInProgress) {
            stateSync.syncInProgress = false;
            addStatus('State sync timeout', 'WARNING');
        }
    }, 3000);
}

function parseStateMessage(stateData) {
    try {
        // Parse JSON state message from ESP32
        const state = JSON.parse(stateData);
        
        return {
            device: state.device === 'ON',
            periodic: state.periodic === 'ON',
            rate: parseInt(state.rate) || 1,
            timestamp: state.timestamp || Date.now()
        };
    } catch (error) {
        console.log('Error parsing state message:', error, 'Data:', stateData);
        return null;
    }
}

// FIXED: Enhanced state synchronization with proper current value handling
function syncUIWithHardwareState(parsedState) {
    if (!parsedState) return;
    
    // Create a unique identifier for this sync message
    const syncId = `${parsedState.device?'ON':'OFF'}_${parsedState.periodic?'ON':'OFF'}_${parsedState.rate}`;
    
    // FIXED: Prevent duplicate sync messages from spamming
    if (stateSync.lastSyncMessage === syncId) {
        console.log('Duplicate sync message ignored:', syncId);
        return;
    }
    stateSync.lastSyncMessage = syncId;
    
    // FIXED: Only skip sync for device ON transitions when lock is active
    // Allow device OFF sync to proceed normally
    if (stateSync.deviceOffLock && parsedState.device && isDeviceOn !== parsedState.device) {
        addStatus('State sync skipped - device ON transition locked', 'SYNC');
        return;
    }
    
    const previousDeviceState = isDeviceOn;
    const previousPeriodicState = isPeriodic;
    let stateChanged = false;
    
    // CRITICAL: Handle device state change first
    if (isDeviceOn !== parsedState.device) {
        isDeviceOn = parsedState.device;
        const deviceBtn = document.getElementById('deviceBtn');
        if (deviceBtn) {
            deviceBtn.textContent = isDeviceOn ? 'DEVICE ON' : 'DEVICE OFF';
            deviceBtn.classList.toggle('on', isDeviceOn);
        }
        stateChanged = true;
        
        // FIXED: Reset current values immediately when device goes OFF via sync
        if (!isDeviceOn) {
            currentTemp = null;
            currentHumi = null;
            updateCurrentDisplay();
            addStatus('Current values reset (device OFF via sync)', 'SYNC');
        }
    }
    
    // Handle periodic mode - force OFF if device is OFF
    if (!isDeviceOn) {
        if (isPeriodic) {
            console.log('State sync: Device is OFF, forcing periodic mode OFF');
            isPeriodic = false;
            const periodicBtn = document.getElementById('periodicBtn');
            const stopBtn = document.getElementById('stopBtn');
            if (periodicBtn) periodicBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
            stateChanged = true;
            
            // Send stop command if needed
            if (previousPeriodicState) {
                publishMQTT(MQTT_CONFIG.topics.command, 'SHT3X PERIODIC STOP');
                addStatus('Periodic mode force-stopped (device OFF)', 'SYNC');
            }
        }
    } else {
        // Only sync periodic state if device is ON
        if (isPeriodic !== parsedState.periodic) {
            isPeriodic = parsedState.periodic;
            const periodicBtn = document.getElementById('periodicBtn');
            const stopBtn = document.getElementById('stopBtn');
            
            if (isPeriodic) {
                if (periodicBtn) periodicBtn.style.display = 'none';
                if (stopBtn) stopBtn.style.display = 'block';
            } else {
                if (periodicBtn) periodicBtn.style.display = 'block';
                if (stopBtn) stopBtn.style.display = 'none';
            }
            stateChanged = true;
        }
    }
    
    // Update frame rate
    if (frameRate !== parsedState.rate) {
        frameRate = parsedState.rate;
        // Update active frame rate button
        document.querySelectorAll('.frame-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.rate) === frameRate) {
                btn.classList.add('active');
            }
        });
        stateChanged = true;
    }
    
    // Only log if something actually changed
    if (stateChanged) {
        stateSync.lastKnownState = parsedState;
        addStatus(`State synchronized: Device=${parsedState.device?'ON':'OFF'}, Periodic=${isPeriodic?'ON':'OFF'}, Rate=${parsedState.rate}Hz`, 'SYNC');
        
        // FIXED: Auto-request current values when device is ON after sync (for web reload scenario)
        if (isDeviceOn && !isPeriodic && (currentTemp === null || currentHumi === null)) {
            setTimeout(() => {
                if (isDeviceOn && isMqttConnected && !isPeriodic) {
                    publishMQTT(MQTT_CONFIG.topics.command, 'SHT3X SINGLE HIGH');
                    addStatus('Auto-requesting current values after sync...', 'SYNC');
                }
            }, 1500); // Wait 1.5s for device to be ready
        }
    }
    
    stateSync.syncInProgress = false;
    stateSync.syncRetryCount = 0;
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
        
        // Request state sync after connection
        setTimeout(() => {
            requestStateSync();
        }, 1000);
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'MQTT Disconnected';
        addStatus('MQTT broker disconnected', 'MQTT');
        
        // Reset sync state
        stateSync.syncInProgress = false;
        stateSync.syncRetryCount = 0;
        stateSync.lastSyncMessage = '';
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
        }
        
        mqttClient = mqtt.connect(MQTT_CONFIG.url, connectOptions);

        mqttClient.on('connect', (connack) => {
            console.log('MQTT Connected:', connack);
            updateConnectionStatus(true);
            
            const topics = [
                MQTT_CONFIG.topics.periodicTemp,
                MQTT_CONFIG.topics.periodicHumi,
                MQTT_CONFIG.topics.singleTemp,
                MQTT_CONFIG.topics.singleHumi,
                MQTT_CONFIG.topics.deviceControl,
                MQTT_CONFIG.topics.stateSync
            ];
            
            mqttClient.subscribe(topics, { qos: 0 }, (err) => {
                if (err) {
                    addStatus('MQTT subscribe failed: ' + err.message, 'ERROR');
                } else {
                    addStatus('All topics subscribed successfully', 'MQTT');
                }
            });
        });

        mqttClient.on('reconnect', () => {
            addStatus('MQTT reconnecting...', 'MQTT');
        });

        mqttClient.on('error', (e) => {
            console.error('MQTT Error:', e);
            updateConnectionStatus(false);
            
            let errorMsg = 'Connection error';
            if (e.code === 5) {
                errorMsg = 'Not authorized - check credentials';
            } else if (e.code === 4) {
                errorMsg = 'Bad username or password';
            } else if (e.message) {
                errorMsg = e.message;
            }
            
            addStatus('MQTT error: ' + errorMsg, 'ERROR');
        });

        mqttClient.on('offline', () => {
            updateConnectionStatus(false);
        });

        mqttClient.on('close', () => {
            updateConnectionStatus(false);
        });

        mqttClient.on('message', (topic, payload) => {
            const text = payload.toString();
            console.log('MQTT Message:', topic, text);
            
            // FIXED: Handle state synchronization messages
            if (topic === MQTT_CONFIG.topics.stateSync) {
                const parsedState = parseStateMessage(text);
                if (parsedState) {
                    syncUIWithHardwareState(parsedState);
                }
                return;
            }
            
            // Handle sensor data
            let val = parseFloat(text);
            
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

// Enhanced helper functions with Firebase integration
function pushTemperature(newTemp, isPeriodicData = false, timestamp = Date.now()) {
    currentTemp = newTemp;
    updateCurrentDisplay();
    
    // Save to Firebase if enabled and is periodic data
    if (isFirebaseConnected && isPeriodicData) {
        saveToFirebase('temperature', newTemp, timestamp);
    }
    
    // Only update chart if in periodic mode AND the data is from periodic source
    if (isPeriodicData && isPeriodic && chart1) {
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
        
        // Store data for statistics
        temperatureData.push(newTemp);
        if (temperatureData.length > maxDataPoints) {
            temperatureData.shift();
        }
        updateTempStats();
    }
}

function pushHumidity(newHumi, isPeriodicData = false, timestamp = Date.now()) {
    currentHumi = newHumi;
    updateCurrentDisplay();
    
    // Save to Firebase if enabled and is periodic data
    if (isFirebaseConnected && isPeriodicData) {
        saveToFirebase('humidity', newHumi, timestamp);
    }
    
    // Only update chart if in periodic mode AND the data is from periodic source
    if (isPeriodicData && isPeriodic && chart2) {
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
        
        // Store data for statistics
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
        // Show -- when device is OFF or values are null
        if (!isDeviceOn || currentTemp === null || currentHumi === null) {
            el.textContent = `Current: --°C & --% RH`;
        } else {
            el.textContent = `Current: ${currentTemp.toFixed(1)}°C & ${currentHumi.toFixed(1)}% RH`;
        }
        el.classList.add('pulse');
        setTimeout(() => el.classList.remove('pulse'), 800);
    }
}

// Status management with enhanced performance
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

// Control Functions
function startPeriodicMode() {
    if (!validateDeviceState('periodic mode')) return;
    
    const command = `SHT3X PERIODIC ${frameRate} HIGH`;
    publishMQTT(MQTT_CONFIG.topics.command, command);
    
    // Update UI immediately (will be synced with hardware via state sync)
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
    
    // Update UI immediately (will be synced with hardware via state sync)
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
    const willBeDeviceOn = !isDeviceOn; // Store the future state
    
    publishMQTT(MQTT_CONFIG.topics.deviceControl, command);
    
    // Update UI state immediately
    isDeviceOn = willBeDeviceOn;
    const deviceBtn = document.getElementById('deviceBtn');
    if (deviceBtn) {
        deviceBtn.textContent = isDeviceOn ? 'DEVICE ON' : 'DEVICE OFF';
        deviceBtn.classList.toggle('on', isDeviceOn);
    }
    
    // CRITICAL: Handle periodic mode BEFORE any async operations
    // This ensures periodic mode is stopped immediately when device is turned off
    if (!isDeviceOn && isPeriodic) {
        console.log('Device turned OFF - stopping periodic mode immediately');
        isPeriodic = false; // Set flag immediately to prevent race conditions
        
        // Update UI immediately
        const periodicBtn = document.getElementById('periodicBtn');
        const stopBtn = document.getElementById('stopBtn');
        if (periodicBtn) periodicBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
        
        // Send MQTT command to stop periodic mode
        publishMQTT(MQTT_CONFIG.topics.command, 'SHT3X PERIODIC STOP');
        addStatus('Periodic mode stopped (device OFF)', 'STOP');
    }
    
    // Reset current values when device is turned off
    if (!isDeviceOn) {
        currentTemp = null;
        currentHumi = null;
        updateCurrentDisplay();
        addStatus('Device turned OFF - current values reset', 'POWER');
        
        // Prevent state sync from interfering during device OFF transition
        setDeviceOffLock(2000); // 2 second lock
    } else {
        // When device is turned ON, request a single read to get current values
        addStatus('Device turned ON - requesting current sensor values', 'POWER');
        setTimeout(() => {
            if (isDeviceOn && isMqttConnected) {
                publishMQTT(MQTT_CONFIG.topics.command, 'SHT3X SINGLE HIGH');
                addStatus('Requesting latest sensor readings...', 'SINGLE');
            }
        }, 1000); // Wait 1 second for device to be ready
    }
    
    addStatus(`Device command sent: ${command}`, 'POWER');
}

// Resize handler for charts
function handleResize() {
    if (chart1) chart1.resize();
    if (chart2) chart2.resize();
}

// Page initialization
function initializePage() {
    // Reset all states to default
    isPeriodic = false;
    isDeviceOn = false;
    currentTemp = null;
    currentHumi = null;
    stateSync.syncInProgress = false;
    stateSync.syncRetryCount = 0;
    stateSync.lastKnownState = null;
    stateSync.lastSyncMessage = '';
    stateSync.deviceOffLock = false;
    
    // Clear any existing timeouts
    if (stateSync.deviceOffLockTimeout) {
        clearTimeout(stateSync.deviceOffLockTimeout);
        stateSync.deviceOffLockTimeout = null;
    }
    
    // Reset UI to default state
    const deviceBtn = document.getElementById('deviceBtn');
    if (deviceBtn) {
        deviceBtn.textContent = 'DEVICE OFF';
        deviceBtn.classList.remove('on');
    }
    
    const periodicBtn = document.getElementById('periodicBtn');
    const stopBtn = document.getElementById('stopBtn');
    if (periodicBtn) periodicBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
    
    // Initialize current display
    updateCurrentDisplay();
    
    addStatus('System initialized - waiting for hardware sync...', 'INIT');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializePage();
    
    // Initialize charts
    const ctx1 = document.getElementById('tempChart1');
    const ctx2 = document.getElementById('tempChart2');
    
    if (ctx1) chart1 = new Chart(ctx1.getContext('2d'), chartTempConfig);
    if (ctx2) chart2 = new Chart(ctx2.getContext('2d'), chartHumiConfig);
    
    // Modal event listeners
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
            addStatus(`Frame rate: ${frameRate}Hz`, 'SETTING');
            
            // If periodic mode is active, restart with new rate
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
    
    // Initialize status
    setTimeout(() => {
        addStatus('SHT31 Monitor ready', 'INIT');
        addStatus('Configure MQTT broker to connect', 'INFO');
        addStatus('[WARNING] Firebase needed for data persistence', 'WARNING');
        updateConnectionStatus(false);
        updateFirebaseStatus(false);
    }, 500);
    
    // Auto-connect MQTT
    setTimeout(() => {
        connectMQTT();
    }, 1000);
});