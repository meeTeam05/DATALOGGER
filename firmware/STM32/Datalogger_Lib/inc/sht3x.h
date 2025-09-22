/**
 * @file sht3x.h
 */
#ifndef SHT3X_H
#define SHT3X_H

/* INCLUDES ------------------------------------------------------------------*/
#include <stdint.h>
#include <stm32f1xx_hal.h>

/* DEFINES -------------------------------------------------------------------*/
/*
 * @brief
 */
#define SHT3X_I2C_ADDR_GND 0x44
#define SHT3X_I2C_ADDR_VDD 0x45

/*
 * @brief
 */
#define SHT3X_RAW_DATA_SIZE 6

/* MACROS --------------------------------------------------------------------*/
/*
 * @brief
 */
#define SHT3X_IS_PERIODIC_STATE(s)		((s)==SHT3X_PERIODIC_05MPS	|| \
										 (s)==SHT3X_PERIODIC_1MPS	|| \
										 (s)==SHT3X_PERIODIC_2MPS	|| \
										 (s)==SHT3X_PERIODIC_4MPS	|| \
										 (s)==SHT3X_PERIODIC_10MPS)

/* TYPEDEFS ------------------------------------------------------------------*/
/*
 * @brief
 */
typedef enum
{
    SHT3X_OK = 0,
	SHT3X_ERROR
} SHT3X_StatusTypeDef;

/*
 * @brief
 */
typedef enum
{
    SHT3X_HEATER_ENABLE = 0,
    SHT3X_HEATER_DISABLE
} sht3x_heater_mode_t;

/*
 * @brief
 */
typedef enum
{
    SHT3X_HIGH = 0,
    SHT3X_MEDIUM,
    SHT3X_LOW
} sht3x_repeat_t;

/*
 * @brief
 */
typedef enum
{
	SHT3X_IDLE = 0,			//!< initial state
	SHT3X_SINGLE_SHOT,		//!< one single measurement
	SHT3X_PERIODIC_05MPS,	//!< periodic with 0.5 measurements per second (mps)
    SHT3X_PERIODIC_1MPS,	//!< periodic with   1 measurements per second (mps)
    SHT3X_PERIODIC_2MPS,	//!< periodic with   2 measurements per second (mps)
    SHT3X_PERIODIC_4MPS,	//!< periodic with   4 measurements per second (mps)
    SHT3X_PERIODIC_10MPS	//!< periodic with  10 measurements per second (mps)
} sht3x_mode_t;

/*
 * @brief
 */
typedef struct
{
	/*
	 * @brief
	 */
	I2C_HandleTypeDef *i2c_handle;

	/*
	 * @brief
	 */
	uint8_t device_address;

	/*
	 * @brief
	 */
	float temperature, humidity;

	/*
	 * @brief
	 */
	sht3x_mode_t currentState;

	/*
	 * @brief
	 */
	sht3x_repeat_t modeRepeat;
} sht3x_handle_t;

/* VARIABLES -----------------------------------------------------------------*/
extern sht3x_handle_t g_sht3x;

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
/*
 * @brief
 *
 * @note
 *
 * @param *handle
 * @param *hi2c
 * @param addr7bit
 */
void SHT3X_Init(sht3x_handle_t *handle, I2C_HandleTypeDef *hi2c, uint8_t addr7bit);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 */
void SHT3X_DeInit(sht3x_handle_t *handle);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 * @param *modeHeater
 *
 * @return
 */
SHT3X_StatusTypeDef SHT3X_Heater(sht3x_handle_t *handle, const sht3x_heater_mode_t *modeHeater);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 * @param *modeRepeat
 *
 * @return
 */
SHT3X_StatusTypeDef SHT3X_Single(sht3x_handle_t *handle, sht3x_repeat_t *modeRepeat);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 * @param *modePeriodic
 * @param *modeRepeat
 *
 * @return
 */
SHT3X_StatusTypeDef SHT3X_Periodic(sht3x_handle_t *handle, sht3x_mode_t *modePeriodic, sht3x_repeat_t *modeRepeat);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 *
 * @return
 */
SHT3X_StatusTypeDef SHT3X_ART(sht3x_handle_t *handle);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 *
 * @return
 */
SHT3X_StatusTypeDef SHT3X_Stop_Periodic(sht3x_handle_t *handle);

/*
 * @brief
 *
 * @note
 *
 * @param *handle
 * @param *outT
 * @param *outRH
 */
void SHT3X_FetchData(sht3x_handle_t *handle, float *outT, float *outRH);

#endif /* SHT3X_H */
