# Web Monitor

## Application Overview
Your SHT31 monitoring dashboard is a client-side web application that:
- Connects to MQTT brokers via WebSocket (default: ws://127.0.0.1:8083/mqtt)
- Displays real-time temperature/humidity data with Chart.js
- Controls ESP32-based sensor devices
- Requires no server-side processing (pure static web app)

## 🚀 Deployment Strategy Options

### 1. Local Network Deployment (Recommended for IoT)

**Best for:** Home automation, office monitoring, local IoT networks

**Deployment Steps:**
- **Simple HTTP Server:** Use Python's built-in server or Node.js `http-server`
  ```bash
  # Python approach
  python -m http.server 8080
  
  # Node.js approach  
  npx http-server -p 8080
  ```
- **Apache/Nginx:** Deploy on local web server
- **Access:** `http://[local-ip]:8080`

**Pros:** Direct MQTT access, no firewall issues, fast local communication
**Cons:** Limited to local network access

### 2. Cloud Static Hosting

**Best for:** Remote monitoring, multiple location access, professional deployments

#### Option A: GitHub Pages
```bash
1. Create GitHub repository
2. Upload files to repo
3. Enable GitHub Pages in Settings
4. Access via https://yourusername.github.io/repo-name
```

#### Option B: Netlify
- Drag & drop deployment
- Automatic SSL certificates
- Custom domain support
- Deploy via: https://app.netlify.com/drop

#### Option C: Vercel
```bash
npx vercel --prod
```

#### Option D: AWS S3 + CloudFront
- S3 bucket for static hosting
- CloudFront for CDN distribution
- Route 53 for custom domains

**Cloud Hosting Considerations:**
- MQTT broker must have public WebSocket endpoint
- Configure CORS for MQTT broker
- Update MQTT_CONFIG in script.js for public IP

### 3. Enterprise/Production Deployment

**Best for:** Industrial monitoring, mission-critical applications

#### Containerized Deployment
```dockerfile
# Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

```bash
# Build and run
docker build -t sht31-monitor .
docker run -p 8080:80 sht31-monitor
```

#### Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sht31-monitor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sht31-monitor
  template:
    metadata:
      labels:
        app: sht31-monitor
    spec:
      containers:
      - name: sht31-monitor
        image: sht31-monitor:latest
        ports:
        - containerPort: 80
```

### 4. Mobile-First PWA Deployment

**Convert to Progressive Web App:**

1. **Add manifest.json:**
```json
{
  "name": "SHT31 Temperature Monitor",
  "short_name": "SHT31Monitor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

2. **Add service worker for offline support**
3. **Deploy with HTTPS requirement**

## 🔧 Configuration Management

### Environment-Based Configuration

**Development:**
```javascript
const MQTT_CONFIG = {
    host: '127.0.0.1',
    port: 8083,
    path: '/mqtt',
    username: 'DataLogger',
    password: 'development'
};
```

**Production:**
```javascript
const MQTT_CONFIG = {
    host: 'your-mqtt-broker.com',
    port: 443,
    path: '/mqtt',
    username: 'ProductionUser',
    password: process.env.MQTT_PASSWORD // Use environment variables
};
```

### Dynamic Configuration
Create a `config.js` that loads different settings based on hostname:

```javascript
function getMQTTConfig() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return { host: '127.0.0.1', port: 8083, path: '/mqtt' };
    } else if (hostname.includes('staging')) {
        return { host: 'staging-mqtt.yourdomain.com', port: 443, path: '/mqtt' };
    } else {
        return { host: 'prod-mqtt.yourdomain.com', port: 443, path: '/mqtt' };
    }
}
```

## 🔐 Security Considerations

### MQTT Security
- **TLS/SSL:** Use `wss://` instead of `ws://` for production
- **Authentication:** Configure strong MQTT broker credentials
- **ACL:** Restrict topic access per user/device
- **VPN:** Consider VPN access for sensitive deployments

### Web Application Security
- **HTTPS Only:** Force SSL for production deployments
- **CSP Headers:** Implement Content Security Policy
- **CORS:** Configure proper CORS settings on MQTT broker
- **Input Validation:** Validate all MQTT message inputs

## 🌐 Network Architecture Options

### Option 1: Direct MQTT Connection
```
[Web App] ←→ [MQTT Broker] ←→ [ESP32 Devices]
```

### Option 2: API Gateway Pattern
```
[Web App] ←→ [API Gateway] ←→ [MQTT Broker] ←→ [ESP32 Devices]
```

### Option 3: Cloud IoT Platform
```
[Web App] ←→ [AWS IoT/Azure IoT] ←→ [ESP32 Devices]
```

## 📊 Monitoring & Analytics

### Application Monitoring
- **Error Tracking:** Implement error logging for MQTT failures
- **Performance:** Monitor chart rendering performance
- **Uptime:** Track MQTT connection reliability

### Usage Analytics
```javascript
// Add to script.js
function trackEvent(action, label) {
    // Google Analytics or custom analytics
    gtag('event', action, {
        'event_category': 'SHT31Monitor',
        'event_label': label
    });
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy SHT31 Monitor
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v1.2
      with:
        publish-dir: './dist'
        production-branch: main
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 🚨 Troubleshooting Deployment Issues

### Common Issues & Solutions

1. **MQTT Connection Failed**
   - Check WebSocket port is open (8083)
   - Verify MQTT broker supports WebSockets
   - Confirm credentials match broker configuration

2. **CORS Errors**
   - Configure MQTT broker to allow web origin
   - Use same protocol (http/https) for web app and broker

3. **Chart Not Loading**
   - Verify Chart.js CDN is accessible
   - Check browser console for JavaScript errors
   - Ensure canvas elements exist before chart initialization

4. **Mobile Display Issues**
   - Test responsive CSS media queries
   - Verify touch interactions work
   - Check viewport meta tag is present

## 📱 Mobile App Alternative

Consider converting to a mobile app using:
- **Cordova/PhoneGap:** Wrap existing web app
- **React Native:** Rebuild with native MQTT libraries
- **Flutter:** Cross-platform native development
- **Ionic:** Hybrid mobile framework

## 🎯 Recommended Deployment Path

**For Development:**
1. Local HTTP server with local MQTT broker

**For Production:**
1. **Small Scale:** Netlify + cloud MQTT service
2. **Enterprise:** Docker + Kubernetes + managed IoT platform
3. **Mobile-First:** PWA deployment with offline support

**Next Steps:**
1. Choose your deployment target
2. Configure MQTT broker for your environment
3. Update MQTT_CONFIG in script.js
4. Test end-to-end functionality
5. Implement monitoring and security measures

## License

MIT (or update as required).