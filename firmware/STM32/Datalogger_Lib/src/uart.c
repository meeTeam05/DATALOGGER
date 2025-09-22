/**
 * @file uart.c
 */
/* INCLUDES ------------------------------------------------------------------*/
#include "uart.h"
#include "command_execute.h"
#include "ring_buffer.h"
#include <string.h>

/* VARIABLES -----------------------------------------------------------------*/
/*
 * @brief
 */
uint8_t data_rx;

/*
 * @brief
 */
uint8_t buff[BUFFER_UART];

/*
 * @brief
 */
uint8_t index_uart = 0;

/*
 * @brief
 */
uint8_t Flag_UART = 0;

/*
 * @brief
 */
ring_buffer_t uart_rx_rb;	// Ring buffer

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
void UART_Init(UART_HandleTypeDef *huart)
{
	index_uart = 0;
	Flag_UART = 0;
	memset(buff, 0, sizeof(buff));

	RingBuffer_Init(&uart_rx_rb);

	HAL_UART_Receive_IT(huart, &data_rx, sizeof(data_rx));
}

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
	if (huart->Instance == huart1.Instance)
	{
		RingBuffer_Put(&uart_rx_rb, data_rx);

		HAL_UART_Receive_IT(&huart1, &data_rx, sizeof(data_rx));
	}
}

void UART_Handle(void)
{
	uint8_t received_byte;

	while (RingBuffer_Get(&uart_rx_rb, &received_byte))
	{
		if (index_uart < (BUFFER_UART - 1))
		{
			buff[index_uart++] = received_byte;
		}

		if (received_byte == '\n' || received_byte == '\r' || index_uart >= (BUFFER_UART - 1))
		{
			buff[index_uart] = '\0';
			Flag_UART = 1;
		}
	}

	if (Flag_UART)
	{
		COMMAND_EXECUTE((char*)buff);

		memset(buff, 0, sizeof(buff));
		index_uart = 0;
		Flag_UART = 0;
	}
}
