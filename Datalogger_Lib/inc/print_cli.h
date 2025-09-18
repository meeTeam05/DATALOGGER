/**
 * @file print_cli.h
 */
#ifndef PRINT_CLI_H
#define PRINT_CLI_H

/* INCLUDES ------------------------------------------------------------------*/
#include "stm32f1xx_hal.h"
#include <stdint.h>

/* DEFINES -------------------------------------------------------------------*/
#define BUFFER_PRINT 128

/* VARIABLES -----------------------------------------------------------------*/
extern UART_HandleTypeDef huart1;

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
/*
 * @brief
 *
 * @note
 *
 * @param *fmt
 */
void PRINT_CLI(char *fmt, ...);

#endif /* PRINT_CLI_H */
