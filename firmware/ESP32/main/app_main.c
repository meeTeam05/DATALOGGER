#include <stdio.h>
#include <string.h>
#include "esp_system.h"
#include "nvs_flash.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "protocol_examples_common.h"
#include "esp_log.h"

// Include custom libraries
#include "stm32_uart.h"
#include "mqtt_handler.h"
#include "relay_control.h"
#include "sensor_parser.h"

static const char *TAG = "MQTT_BRIDGE_APP";

// MQTT Topics
#define TOPIC_SHT3X_COMMAND                     "esp32/sensor/sht3x/command"
#define TOPIC_SHT3X_SINGLE_TEMPERATURE          "esp32/sensor/sht3x/single/temperature"
#define TOPIC_SHT3X_SINGLE_HUMIDITY             "esp32/sensor/sht3x/single/humidity"
#define TOPIC_SHT3X_PERIODIC_TEMPERATURE        "esp32/sensor/sht3x/periodic/temperature"
#define TOPIC_SHT3X_PERIODIC_HUMIDITY           "esp32/sensor/sht3x/periodic/humidity"
#define TOPIC_CONTROL_RELAY                     "esp32/control/relay"
#define TOPIC_STATUS                            "esp32/status"

// Global components
static stm32_uart_t stm32_uart;
static mqtt_handler_t mqtt_handler;
static relay_control_t relay_control;
static sensor_parser_t sensor_parser;

/* CALLBACK FUNCTIONS --------------------------------------------------------*/

/**
 * @brief Callback when single sensor data is received
 */
static void on_single_sensor_data(const sensor_data_t* data)
{
    if (!SensorParser_IsValid(data) || !MQTT_Handler_IsConnected(&mqtt_handler))
    {
        return;
    }
    
    char temp_str[16], hum_str[16];
    snprintf(temp_str, sizeof(temp_str), "%.2f", data->temperature);
    snprintf(hum_str, sizeof(hum_str), "%.2f", data->humidity);
    
    MQTT_Handler_Publish(&mqtt_handler, TOPIC_SHT3X_SINGLE_TEMPERATURE, temp_str, 0, 0, 0);
    MQTT_Handler_Publish(&mqtt_handler, TOPIC_SHT3X_SINGLE_HUMIDITY, hum_str, 0, 0, 0);
    
    ESP_LOGI(TAG, "Published SINGLE data: T=%.2f°C, H=%.2f%%", 
             data->temperature, data->humidity);
}

/**
 * @brief Callback when periodic sensor data is received
 */
static void on_periodic_sensor_data(const sensor_data_t* data)
{
    if (!SensorParser_IsValid(data) || !MQTT_Handler_IsConnected(&mqtt_handler))
    {
        return;
    }
    
    char temp_str[16], hum_str[16];
    snprintf(temp_str, sizeof(temp_str), "%.2f", data->temperature);
    snprintf(hum_str, sizeof(hum_str), "%.2f", data->humidity);
    
    MQTT_Handler_Publish(&mqtt_handler, TOPIC_SHT3X_PERIODIC_TEMPERATURE, temp_str, 0, 0, 0);
    MQTT_Handler_Publish(&mqtt_handler, TOPIC_SHT3X_PERIODIC_HUMIDITY, hum_str, 0, 0, 0);
    
    ESP_LOGI(TAG, "Published PERIODIC data: T=%.2f°C, H=%.2f%%", 
             data->temperature, data->humidity);
}

/**
 * @brief Callback when data is received from STM32
 */
static void on_stm32_data_received(const char* line)
{
    ESP_LOGI(TAG, "<- STM32: %s", line);
    
    // Parse and process sensor data
    SensorParser_ProcessLine(&sensor_parser, line);
}

/**
 * @brief Callback when relay state changes
 */
static void on_relay_state_changed(bool state)
{
    if (!MQTT_Handler_IsConnected(&mqtt_handler))
    {
        return;
    }
    
    // Publish relay status
    char status[64];
    snprintf(status, sizeof(status), "relay:%s", state ? "ON" : "OFF");
    MQTT_Handler_Publish(&mqtt_handler, TOPIC_STATUS, status, 0, 1, 0);
    
    ESP_LOGI(TAG, "Relay state changed: %s", state ? "ON" : "OFF");
}

/**
 * @brief Callback when MQTT data is received
 */
static void on_mqtt_data_received(const char* topic, const char* data, int data_len)
{
    ESP_LOGI(TAG, "<- MQTT: %s = %.*s", topic, data_len, data);
    
    // Handle SHT3X commands
    if (strcmp(topic, TOPIC_SHT3X_COMMAND) == 0)
    {
        if (STM32_UART_SendCommand(&stm32_uart, data))
        {
            ESP_LOGI(TAG, "Command forwarded to STM32: %s", data);
        } else
        {
            ESP_LOGE(TAG, "Failed to send command to STM32: %s", data);
        }
    }
    // Handle relay commands
    else if (strcmp(topic, TOPIC_CONTROL_RELAY) == 0)
    {
        if (Relay_ProcessCommand(&relay_control, data))
        {
            ESP_LOGI(TAG, "Relay command processed: %s", data);
        } else {
            ESP_LOGW(TAG, "Unknown relay command: %s", data);
        }
    }
}

/* INITIALIZATION FUNCTIONS --------------------------------------------------*/

/**
 * @brief Initialize all components
 */
static bool initialize_components(void)
{
    bool success = true;
    
    // Initialize STM32 UART
    if (!STM32_UART_Init(&stm32_uart, 
                         CONFIG_MQTT_UART_PORT_NUM,
                         CONFIG_MQTT_UART_BAUD_RATE,
                         CONFIG_MQTT_UART_TXD,
                         CONFIG_MQTT_UART_RXD,
                         on_stm32_data_received)) {
        ESP_LOGE(TAG, "Failed to initialize STM32 UART");
        success = false;
    }
    
    // Initialize MQTT Handler
    if (!MQTT_Handler_Init(&mqtt_handler,
                           CONFIG_BROKER_URL,
                           CONFIG_MQTT_USERNAME,
                           CONFIG_MQTT_PASSWORD,
                           on_mqtt_data_received)) {
        ESP_LOGE(TAG, "Failed to initialize MQTT Handler");
        success = false;
    }
    
    // Initialize Relay Control
    if (!Relay_Init(&relay_control, CONFIG_RELAY_GPIO_NUM, on_relay_state_changed)) {
        ESP_LOGE(TAG, "Failed to initialize Relay Control");
        success = false;
    }
    
    // Initialize Sensor Parser
    if (!SensorParser_Init(&sensor_parser, on_single_sensor_data, on_periodic_sensor_data))
    {
        ESP_LOGE(TAG, "Failed to initialize Sensor Parser");
        success = false;
    }
    
    return success;
}

/**
 * @brief Start all services
 */
static bool start_services(void)
{
    bool success = true;
    
    // Start STM32 UART task
    if (!STM32_UART_StartTask(&stm32_uart))
    {
        ESP_LOGE(TAG, "Failed to start STM32 UART task");
        success = false;
    }
    
    // Start MQTT client
    if (!MQTT_Handler_Start(&mqtt_handler))
    {
        ESP_LOGE(TAG, "Failed to start MQTT client");
        success = false;
    }
    
    return success;
}

/**
 * @brief Subscribe to MQTT topics
 */
static void subscribe_mqtt_topics(void)
{
    // Wait for MQTT connection
    int retry_count = 0;
    while (!MQTT_Handler_IsConnected(&mqtt_handler) && retry_count < 30)
    {
        vTaskDelay(pdMS_TO_TICKS(1000));
        retry_count++;
    }
    
    if (!MQTT_Handler_IsConnected(&mqtt_handler))
    {
        ESP_LOGE(TAG, "MQTT connection timeout, cannot subscribe to topics");
        return;
    }
    
    // Subscribe to command topics
    MQTT_Handler_Subscribe(&mqtt_handler, TOPIC_SHT3X_COMMAND, 1);
    MQTT_Handler_Subscribe(&mqtt_handler, TOPIC_CONTROL_RELAY, 1);
    
    // Publish initial status
    MQTT_Handler_Publish(&mqtt_handler, TOPIC_STATUS, "status:connected,bridge:ready", 0, 1, 0);
    
    ESP_LOGI(TAG, "MQTT topics subscribed and initial status published");
}

/**
 * @brief MQTT subscribe task - FIXED VERSION
 */
static void mqtt_subscribe_task(void* param)
{
    subscribe_mqtt_topics();
    vTaskDelete(NULL);
}

/* MAIN APPLICATION ----------------------------------------------------------*/

void app_main(void)
{
    ESP_LOGI(TAG, "=== ESP32-STM32 MQTT Bridge Starting ===");
    ESP_LOGI(TAG, "Free heap: %lu bytes", esp_get_free_heap_size());
    ESP_LOGI(TAG, "IDF version: %s", esp_get_idf_version());
    
    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    ESP_LOGI(TAG, "NVS initialized");
    
    // Initialize network
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    ESP_LOGI(TAG, "Network interface initialized");
    
    // Connect to WiFi
    ESP_ERROR_CHECK(example_connect());
    ESP_LOGI(TAG, "WiFi connected successfully");
    
    // Initialize all components
    if (!initialize_components()) {
        ESP_LOGE(TAG, "Failed to initialize components, restarting...");
        esp_restart();
    }
    ESP_LOGI(TAG, "All components initialized successfully");
    
    // Start all services
    if (!start_services()) {
        ESP_LOGE(TAG, "Failed to start services, restarting...");
        esp_restart();
    }
    ESP_LOGI(TAG, "All services started successfully");
    
    // Subscribe to MQTT topics (runs in background) - FIXED
    xTaskCreate(mqtt_subscribe_task, "mqtt_subscribe", 2048, NULL, 3, NULL);
    
    // Main loop - monitor system status
    ESP_LOGI(TAG, "=== System Ready ===");
    ESP_LOGI(TAG, "Configuration:");
    ESP_LOGI(TAG, "  STM32 UART: Port %d, TXD=%d, RXD=%d, Baud=%d", 
             CONFIG_MQTT_UART_PORT_NUM, CONFIG_MQTT_UART_TXD, 
             CONFIG_MQTT_UART_RXD, CONFIG_MQTT_UART_BAUD_RATE);
    ESP_LOGI(TAG, "  Relay GPIO: %d", CONFIG_RELAY_GPIO_NUM);
    ESP_LOGI(TAG, "  MQTT Broker: %s", CONFIG_BROKER_URL);
    ESP_LOGI(TAG, "Topics:");
    ESP_LOGI(TAG, "  Commands: %s", TOPIC_SHT3X_COMMAND);
    ESP_LOGI(TAG, "  Relay: %s", TOPIC_CONTROL_RELAY);
    ESP_LOGI(TAG, "  Status: %s", TOPIC_STATUS);
    ESP_LOGI(TAG, "  Single T: %s", TOPIC_SHT3X_SINGLE_TEMPERATURE);
    ESP_LOGI(TAG, "  Single H: %s", TOPIC_SHT3X_SINGLE_HUMIDITY);
    ESP_LOGI(TAG, "  Periodic T: %s", TOPIC_SHT3X_PERIODIC_TEMPERATURE);
    ESP_LOGI(TAG, "  Periodic H: %s", TOPIC_SHT3X_PERIODIC_HUMIDITY);
    
    // First Status
    bool last_relay = Relay_GetState(&relay_control);
    bool last_mqtt  = MQTT_Handler_IsConnected(&mqtt_handler);

    ESP_LOGI(TAG, "MQTT=%s, Relay=%s",
             last_mqtt ? "Connected" : "Disconnected",
             last_relay ? "ON" : "OFF");

    // Main monitoring loop
    while (1)
    {

        bool relay_now = Relay_GetState(&relay_control);
        bool mqtt_now  = MQTT_Handler_IsConnected(&mqtt_handler);

        if (relay_now != last_relay || mqtt_now != last_mqtt)
        {
            ESP_LOGI(TAG, "System Status: MQTT=%s, Relay=%s, Free Heap=%lu", 
                     MQTT_Handler_IsConnected(&mqtt_handler) ? "Connected" : "Disconnected",
                     Relay_GetState(&relay_control) ? "ON" : "OFF",
                     esp_get_free_heap_size());
        }

        last_relay = relay_now;
        last_mqtt  = mqtt_now;
        
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}