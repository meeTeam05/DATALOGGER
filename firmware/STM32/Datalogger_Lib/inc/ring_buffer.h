/**
 * @file ring_buffer.h
 */
#ifndef RING_BUFFER_H
#define RING_BUFFER_H

/* INCLUDES ------------------------------------------------------------------*/
#include <stdint.h>
#include <stdbool.h>

/* DEFINES -------------------------------------------------------------------*/
#define RING_BUFFER_SIZE 256

/* TYPEDEFS ------------------------------------------------------------------*/
/*
 * @brief
 */
typedef struct {
	uint8_t buffer[RING_BUFFER_SIZE];
	volatile uint16_t head;
	volatile uint16_t tail;
} ring_buffer_t;

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
/*
 * @brief
 *
 * @note
 *
 * @param *rb
 */
void RingBuffer_Init(ring_buffer_t *rb);

/*
 * @brief
 *
 * @note
 *
 * @param *rb
 * @param data
 *
 * @return
 */
bool RingBuffer_Put(ring_buffer_t *rb, uint8_t data);

/*
 * @brief
 *
 * @note
 *
 * @param *rb
 * @param *data
 *
 * @return
 */
bool RingBuffer_Get(ring_buffer_t *rb, uint8_t *data);

/*
 * @brief
 *
 * @note
 *
 * @param *rb
 *
 * @return
 */
uint16_t RingBuffer_Available(ring_buffer_t *rb);

/*
 * @brief
 *
 * @note
 *
 * @param *rb
 *
 * @return
 */
uint16_t RingBuffer_Free(ring_buffer_t *rb);

#endif /* RING_BUFFER_H */
