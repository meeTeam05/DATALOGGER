/**
 * @file uart.h
 */
#ifndef UART_H
#define UART_H

/* INCLUDES ------------------------------------------------------------------*/
#include "stm32f1xx_hal.h"
#include <stdint.h>

/* DEFINES -------------------------------------------------------------------*/
#define BUFFER_UART 128

/* VARIABLES -----------------------------------------------------------------*/
extern UART_HandleTypeDef huart1;

extern uint8_t data_rx;
extern uint8_t buff[BUFFER_UART];
extern uint8_t index_uart;
extern uint8_t Flag_UART;

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
/*
 * @brief
 *
 * @note
 *
 * @param *huart
 */
void UART_Init(UART_HandleTypeDef *huart);

/*
 * @brief
 *
 * @note
 *
 * @param *huart
 */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart);

/*
 * @brief
 *
 * @note
 */
void UART_Handle(void);

#endif /* UART_H */
