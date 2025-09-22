/**
 * @file stm32_uart.h
 * @brief STM32 UART Communication Library for ESP32
 */
#ifndef STM32_UART_H
#define STM32_UART_H

#include <stdint.h>
#include <stdbool.h>
#include "ring_buffer.h"

/* DEFINES -------------------------------------------------------------------*/
#define STM32_UART_MAX_LINE_LENGTH  128

/* TYPEDEFS ------------------------------------------------------------------*/
typedef void (*stm32_data_callback_t)(const char* line);

typedef struct {
    int uart_num;
    int baud_rate;
    int tx_pin;
    int rx_pin;
    ring_buffer_t rx_buffer;
    stm32_data_callback_t data_callback;
    bool initialized;
} stm32_uart_t;

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/

/**
 * @brief Initialize STM32 UART communication
 * 
 * @param uart STM32 UART structure
 * @param uart_num UART port number
 * @param baud_rate Baud rate
 * @param tx_pin TX GPIO pin
 * @param rx_pin RX GPIO pin
 * @param callback Data received callback function
 * @return true if successful
 */
bool STM32_UART_Init(stm32_uart_t *uart, int uart_num, int baud_rate, 
                     int tx_pin, int rx_pin, stm32_data_callback_t callback);

/**
 * @brief Send command to STM32
 * 
 * @param uart STM32 UART structure
 * @param command Command string to send
 * @return true if successful
 */
bool STM32_UART_SendCommand(stm32_uart_t *uart, const char* command);

/**
 * @brief Process received data (call from task)
 * 
 * @param uart STM32 UART structure
 */
void STM32_UART_ProcessData(stm32_uart_t *uart);

/**
 * @brief Start STM32 UART processing task
 * 
 * @param uart STM32 UART structure
 * @return true if successful
 */
bool STM32_UART_StartTask(stm32_uart_t *uart);

/**
 * @brief Deinitialize STM32 UART
 * 
 * @param uart STM32 UART structure
 */
void STM32_UART_Deinit(stm32_uart_t *uart);

#endif /* STM32_UART_H */