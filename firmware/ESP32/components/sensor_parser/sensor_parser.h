/**
 * @file sensor_parser.h
 * @brief SHT3X Sensor Data Parser Library
 */
#ifndef SENSOR_PARSER_H
#define SENSOR_PARSER_H

/* INCLUDES ------------------------------------------------------------------*/
#include <stdint.h>
#include <stdbool.h>

/* DEFINES -------------------------------------------------------------------*/
#define SENSOR_MODE_SINGLE      "SINGLE"
#define SENSOR_MODE_PERIODIC    "PERIODIC"

/* TYPEDEFS ------------------------------------------------------------------*/
typedef enum {
    SENSOR_TYPE_UNKNOWN = 0,
    SENSOR_TYPE_SINGLE,
    SENSOR_TYPE_PERIODIC
} sensor_type_t;

typedef struct {
    sensor_type_t type;
    float temperature;
    float humidity;
    bool valid;
} sensor_data_t;

typedef void (*sensor_data_callback_t)(const sensor_data_t* data);

typedef struct {
    sensor_data_callback_t single_callback;
    sensor_data_callback_t periodic_callback;
} sensor_parser_t;

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/

/**
 * @brief Initialize sensor parser
 * 
 * @param parser Sensor parser structure
 * @param single_callback Callback for single measurements
 * @param periodic_callback Callback for periodic measurements
 * 
 * @return true if successful
 */
bool SensorParser_Init(sensor_parser_t *parser, 
                       sensor_data_callback_t single_callback,
                       sensor_data_callback_t periodic_callback);

/**
 * @brief Parse sensor data line
 * 
 * @param parser Sensor parser structure
 * @param line Data line from STM32 (e.g., "SINGLE 27.85 85.69")
 * 
 * @return Parsed sensor data structure
 */
sensor_data_t SensorParser_ParseLine(sensor_parser_t *parser, const char* line);

/**
 * @brief Process sensor data line with callbacks
 * 
 * @param parser Sensor parser structure
 * @param line Data line from STM32
 * 
 * @return true if line was successfully parsed and processed
 */
bool SensorParser_ProcessLine(sensor_parser_t *parser, const char* line);

/**
 * @brief Get sensor type from string
 * 
 * @param type_str Type string ("SINGLE" or "PERIODIC")
 * 
 * @return Sensor type enum
 */
sensor_type_t SensorParser_GetType(const char* type_str);

/**
 * @brief Get sensor type string
 * 
 * @param type Sensor type enum
 * 
 * @return Type string
 */
const char* SensorParser_GetTypeString(sensor_type_t type);

/**
 * @brief Validate sensor data
 * 
 * @param data Sensor data structure
 * 
 * @return true if data is valid
 */
bool SensorParser_IsValid(const sensor_data_t* data);

#endif /* SENSOR_PARSER_H */