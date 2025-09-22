/**
 * @file sensor_parser.c
 */
#include "sensor_parser.h"
#include "esp_log.h"
#include <string.h>
#include <stdio.h>

static const char *TAG = "SENSOR_PARSER";

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
bool SensorParser_Init(sensor_parser_t *parser, 
                       sensor_data_callback_t single_callback,
                       sensor_data_callback_t periodic_callback)
{
    if (!parser) {
        return false;
    }
    
    parser->single_callback = single_callback;
    parser->periodic_callback = periodic_callback;
    
    ESP_LOGI(TAG, "Sensor parser initialized");
    return true;
}

sensor_data_t SensorParser_ParseLine(sensor_parser_t *parser, const char* line)
{
    sensor_data_t data = {0};
    data.valid = false;
    
    if (!line) {
        return data;
    }
    
    char mode[16];
    float temp, hum;
    
    // Parse format: "MODE TEMPERATURE HUMIDITY"
    // Example: "PERIODIC 27.82 85.65" or "SINGLE 27.85 85.69"
    int parsed = sscanf(line, "%15s %f %f", mode, &temp, &hum);
    
    if (parsed == 3) {
        // Determine sensor type
        if (strcmp(mode, SENSOR_MODE_SINGLE) == 0) {
            data.type = SENSOR_TYPE_SINGLE;
        } else if (strcmp(mode, SENSOR_MODE_PERIODIC) == 0) {
            data.type = SENSOR_TYPE_PERIODIC;
        } else {
            data.type = SENSOR_TYPE_UNKNOWN;
            ESP_LOGW(TAG, "Unknown sensor mode: %s", mode);
            return data;
        }
        
        // Validate temperature range (-40 to 125°C for SHT3X)
        if (temp < -40.0f || temp > 125.0f) {
            ESP_LOGW(TAG, "Temperature out of range: %.2f°C", temp);
            return data;
        }
        
        // Validate humidity range (0 to 100% for SHT3X)
        if (hum < 0.0f || hum > 100.0f) {
            ESP_LOGW(TAG, "Humidity out of range: %.2f%%", hum);
            return data;
        }
        
        data.temperature = temp;
        data.humidity = hum;
        data.valid = true;
        
        ESP_LOGI(TAG, "Parsed %s: T=%.2f°C, H=%.2f%%", 
                 SensorParser_GetTypeString(data.type), temp, hum);
    } else {
        ESP_LOGW(TAG, "Failed to parse sensor data: %s", line);
    }
    
    return data;
}

bool SensorParser_ProcessLine(sensor_parser_t *parser, const char* line)
{
    if (!parser) {
        return false;
    }
    
    sensor_data_t data = SensorParser_ParseLine(parser, line);
    
    if (!data.valid) {
        return false;
    }
    
    // Call appropriate callback
    switch (data.type) {
    case SENSOR_TYPE_SINGLE:
        if (parser->single_callback) {
            parser->single_callback(&data);
        }
        break;
        
    case SENSOR_TYPE_PERIODIC:
        if (parser->periodic_callback) {
            parser->periodic_callback(&data);
        }
        break;
        
    default:
        ESP_LOGW(TAG, "No callback for sensor type: %d", data.type);
        return false;
    }
    
    return true;
}

sensor_type_t SensorParser_GetType(const char* type_str)
{
    if (!type_str) {
        return SENSOR_TYPE_UNKNOWN;
    }
    
    if (strcmp(type_str, SENSOR_MODE_SINGLE) == 0) {
        return SENSOR_TYPE_SINGLE;
    } else if (strcmp(type_str, SENSOR_MODE_PERIODIC) == 0) {
        return SENSOR_TYPE_PERIODIC;
    }
    
    return SENSOR_TYPE_UNKNOWN;
}

const char* SensorParser_GetTypeString(sensor_type_t type)
{
    switch (type) {
    case SENSOR_TYPE_SINGLE:
        return SENSOR_MODE_SINGLE;
    case SENSOR_TYPE_PERIODIC:
        return SENSOR_MODE_PERIODIC;
    default:
        return "UNKNOWN";
    }
}

bool SensorParser_IsValid(const sensor_data_t* data)
{
    if (!data) {
        return false;
    }
    
    return data->valid && 
           (data->type == SENSOR_TYPE_SINGLE || data->type == SENSOR_TYPE_PERIODIC) &&
           (data->temperature >= -40.0f && data->temperature <= 125.0f) &&
           (data->humidity >= 0.0f && data->humidity <= 100.0f);
}