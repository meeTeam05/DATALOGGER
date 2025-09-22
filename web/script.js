// Global variables
let isPeriodic = false;
let isSTM32On = false;
let frameRate = 1; // Hz
let intervalId = null;
let temperatureData = [];
let humidityData = [];
let statusQueue = [];
let maxDataPoints = 15;
let maxStatusItems = 5;

// Current values for display (updated by both single and periodic)
let currentTemp = 24.5;
let currentHumi = 50.0;

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
            duration: 200 // Faster animations
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

// Helper functions for MQTT data
function pushTemperature(newTemp) {
    currentTemp = newTemp;
    updateCurrentDisplay();
    
    // Only update chart if in periodic mode
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
}

function pushHumidity(newHumi) {
    currentHumi = newHumi;
    updateCurrentDisplay();
    
    // Only update chart if in periodic mode
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
}

// Update combined display
function updateCurrentDisplay() {
    const el = document.getElementById('currentDisplay');
    if (el) {
        el.textContent = `Current: ${currentTemp}°C & ${currentHumi}% RH`;
        el.classList.add('pulse');
        setTimeout(() => el.classList.remove('pulse'), 1000);
    }
}

// Simulate sensor readings with more realistic data
function generateTemperature() {
    const baseTemp = 24.5;
    const variation = (Math.random() - 0.5) * 1.5; // Reduced variation
    const trend = Math.sin(Date.now() / 30000) * 2; // Slower trend
    const noise = (Math.random() - 0.5) * 0.3; // Small noise
    return Math.round((baseTemp + variation + trend + noise) * 10) / 10;
}

function generateHumidity() {
    const baseHumi = 50.0;
    const variation = (Math.random() - 0.5) * 3;
    const trend = Math.sin(Date.now() / 45000) * 8;
    const noise = (Math.random() - 0.5) * 0.5;
    return Math.round((baseHumi + variation + trend + noise) * 10) / 10;
}

// Status management with better performance
function addStatus(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const statusItem = `[${type}] ${timestamp}: ${message}`;
    
    statusQueue.push(statusItem);
    if (statusQueue.length > maxStatusItems) {
        statusQueue.shift();
    }
    
    // Throttled update
    if (!addStatus.throttled) {
        addStatus.throttled = true;
        requestAnimationFrame(() => {
            updateStatusDisplay();
            addStatus.throttled = false;
        });
    }
}

function updateStatusDisplay() {
    const statusDisplay = document.getElementById('statusDisplay');
    if (statusDisplay) {
        statusDisplay.innerHTML = statusQueue.map(item => 
            `<div class="status-item">${item}</div>`
        ).join('');
        statusDisplay.scrollTop = statusDisplay.scrollHeight;
    }
}

// Data update function (for periodic mode)
function updateDataPeriodic() {
    const newTemp = generateTemperature();
    const newHumi = generateHumidity();
    const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Update current values and display
    currentTemp = newTemp;
    currentHumi = newHumi;
    updateCurrentDisplay();

    // Update data arrays
    temperatureData.push(newTemp);
    if (temperatureData.length > maxDataPoints) {
        temperatureData.shift();
    }
    
    humidityData.push(newHumi);
    if (humidityData.length > maxDataPoints) {
        humidityData.shift();
    }

    // Update charts (only in periodic mode)
    if (chart1) {
        chart1.data.labels.push(timestamp);
        chart1.data.datasets[0].data.push(newTemp);
        if (chart1.data.labels.length > maxDataPoints) {
            chart1.data.labels.shift();
            chart1.data.datasets[0].data.shift();
        }
        chart1.update('none');
    }

    if (chart2) {
        chart2.data.labels.push(timestamp);
        chart2.data.datasets[0].data.push(newHumi);
        if (chart2.data.labels.length > maxDataPoints) {
            chart2.data.labels.shift();
            chart2.data.datasets[0].data.shift();
        }
        chart2.update('none');
    }

    // Random status messages (reduced frequency)
    if (Math.random() < 0.08) {
        const messages = [
            `T: ${newTemp}°C, H: ${newHumi}%`,
            'SHT31 OK',
            'Data stable',
            `${frameRate}Hz active`
        ];
        addStatus(messages[Math.floor(Math.random() * messages.length)]);
    }
}

// Single read function (only updates display, not charts)
function updateDataSingle() {
    const newTemp = generateTemperature();
    const newHumi = generateHumidity();
    
    // Update current values and display only
    currentTemp = newTemp;
    currentHumi = newHumi;
    updateCurrentDisplay();
    
    addStatus(`Single: ${newTemp}°C, ${newHumi}%`, 'SINGLE');
}

// Control functions
function startPeriodicMode() {
    if (intervalId) clearInterval(intervalId);
    
    if (isSTM32On) {
        isPeriodic = true;
        const intervalMs = 1000 / frameRate;
        intervalId = setInterval(updateDataPeriodic, intervalMs);
        addStatus(`Periodic ${frameRate}Hz started`, 'START');
        
        document.getElementById('stopBtn').style.display = 'block';
        document.getElementById('periodicBtn').style.display = 'none';
        
        updateDataPeriodic();
    } else {
        addStatus('STM32 must be ON', 'ERROR');
    }
}

function stopPeriodicMode() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        isPeriodic = false;
        addStatus('Periodic stopped', 'STOP');
    }
    
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('periodicBtn').style.display = 'block';
}

function singleRead() {
    if (isSTM32On) {
        updateDataSingle();
    } else {
        addStatus('STM32 must be ON', 'ERROR');
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
    
    // Frame rate selector
    document.querySelectorAll('.frame-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const activeBtn = document.querySelector('.frame-btn.active');
            if (activeBtn) activeBtn.classList.remove('active');
            this.classList.add('active');
            frameRate = parseFloat(this.dataset.rate);
            addStatus(`Frame rate: ${frameRate}Hz`);
            
            if (isPeriodic && isSTM32On) {
                startPeriodicMode();
            }
        });
    });
    
    // Control buttons
    const periodicBtn = document.getElementById('periodicBtn');
    const stopBtn = document.getElementById('stopBtn');
    const singleBtn = document.getElementById('singleBtn');
    const stm32Btn = document.getElementById('stm32Btn');
    
    if (periodicBtn) periodicBtn.addEventListener('click', startPeriodicMode);
    if (stopBtn) stopBtn.addEventListener('click', stopPeriodicMode);
    if (singleBtn) singleBtn.addEventListener('click', singleRead);
    
    // STM32 button
    if (stm32Btn) {
        stm32Btn.addEventListener('click', function() {
            isSTM32On = !isSTM32On;
            this.textContent = isSTM32On ? 'STM32 ON' : 'STM32 OFF';
            this.classList.toggle('on');
            
            if (isSTM32On) {
                addStatus('STM32 ON', 'POWER');
            } else {
                addStatus('STM32 OFF', 'POWER');
                stopPeriodicMode();
            }
        });
    }
    
    // Window resize handler
    window.addEventListener('resize', handleResize);
    
    // Initialize with demo data
    setTimeout(() => {
        addStatus('SHT31 initialized');
        addStatus('Calibration OK');
        addStatus('Ready for monitoring');
    }, 500);
});

// MQTT Configuration (uncomment and configure when ready)
/*
const MQTT_URL = "ws://localhost:8083/mqtt";
const TOPIC_TEMP = "esp32/sht31/temperature";
const TOPIC_HUMI = "esp32/sht31/humidity";

try {
    const client = mqtt.connect(MQTT_URL, {
        reconnectPeriod: 2000,
        clean: true
    });

    client.on('connect', () => {
        addStatus('MQTT connected', 'MQTT');
        client.subscribe([TOPIC_TEMP, TOPIC_HUMI], (err) => {
            if (err) addStatus('Subscribe failed', 'ERROR');
            else addStatus('MQTT subscribed', 'MQTT');
        });
    });

    client.on('reconnect', () => addStatus('MQTT reconnecting', 'MQTT'));
    client.on('error', (e) => addStatus('MQTT error: ' + e.message, 'ERROR'));

    client.on('message', (topic, payload) => {
        const text = payload.toString();
        let val = parseFloat(text);
        
        // Support JSON format {"value": 26.4}
        if (isNaN(val)) {
            try {
                const obj = JSON.parse(text);
                if (obj && typeof obj.value !== 'undefined') {
                    val = parseFloat(obj.value);
                }
            } catch (_) {}
        }
        
        if (!isNaN(val)) {
            if (topic === TOPIC_TEMP) pushTemperature(val);
            if (topic === TOPIC_HUMI) pushHumidity(val);
        }
    });
} catch (e) {
    addStatus('MQTT init failed: ' + e.message, 'ERROR');
}
*/