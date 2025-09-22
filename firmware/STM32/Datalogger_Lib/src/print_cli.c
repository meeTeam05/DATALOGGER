/**
 * @file print_cli.c
 */
/* INCLUDES ------------------------------------------------------------------*/
#include "print_cli.h"
#include <stdarg.h>
#include <stdio.h>

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
void PRINT_CLI(char *fmt, ...)
{
	char stringBuffer [BUFFER_PRINT];
	va_list args;
	va_start(args, fmt);
	uint8_t len_str = vsprintf(stringBuffer, fmt, args);
	va_end(args);

	if (len_str > 0)
	{
		HAL_UART_Transmit(&huart1, (uint8_t*) stringBuffer, len_str, 100);
	}
}
