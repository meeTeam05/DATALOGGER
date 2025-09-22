/**
 * @file sht3x.c
 */
/* INCLUDES ------------------------------------------------------------------*/
#include "sht3x.h"
#include "print_cli.h"
#include <assert.h>

#ifndef SHT3X_I2C_TIMEOUT
#define SHT3X_I2C_TIMEOUT	100
#endif

/*  SHT3x STATUS REGISTER BITS -----------------------------------------------*/
/* Bit positions */
#define SHT3X_STATUS_ALERT_PENDING_Pos	15u
#define SHT3X_STATUS_HEATER_Pos			13u
#define SHT3X_STATUS_RH_ALERT_Pos		11u
#define SHT3X_STATUS_T_ALERT_Pos		10u
#define SHT3X_STATUS_SYS_RESET_Pos		4u
#define SHT3X_STATUS_CMD_STATUS_Pos		1u
#define SHT3X_STATUS_WRITE_CRC_Pos		0u

/* Bit masks */
#define SHT3X_STATUS_ALERT_PENDING	(1u << SHT3X_STATUS_ALERT_PENDING_Pos)	/* 1: at least one pending alert */
#define SHT3X_STATUS_HEATER			(1u << SHT3X_STATUS_HEATER_Pos)			/* 1: heater ON */
#define SHT3X_STATUS_RH_ALERT		(1u << SHT3X_STATUS_RH_ALERT_Pos)		/* 1: RH tracking alert */
#define SHT3X_STATUS_T_ALERT		(1u << SHT3X_STATUS_T_ALERT_Pos)		/* 1: T tracking alert */
#define SHT3X_STATUS_SYS_RESET		(1u << SHT3X_STATUS_SYS_RESET_Pos)		/* 1: reset detected since last clear */
#define SHT3X_STATUS_CMD_STATUS		(1u << SHT3X_STATUS_CMD_STATUS_Pos)		/* 1: last command NOT executed (invalid/CRC fail) */
#define SHT3X_STATUS_WRITE_CRC		(1u << SHT3X_STATUS_WRITE_CRC_Pos)		/* 1: checksum of last write transfer failed */

/* Reserved bits */
#define SHT3X_STATUS_RESERVED1		(1u << 14)
#define SHT3X_STATUS_RESERVED12		(1u << 12)
#define SHT3X_STATUS_RESERVED_9_5	(0x03E0u)   /* bits [9:5] */
#define SHT3X_STATUS_RESERVED_3_2	(0x000Cu)   /* bits [3:2] */
#define SHT3X_STATUS_RESERVED_MASK	(SHT3X_STATUS_RESERVED14 | SHT3X_STATUS_RESERVED12 | \
									SHT3X_STATUS_RESERVED_9_5 | SHT3X_STATUS_RESERVED_3_2)

/* Macro function status */
#define SHT3X_STATUS_IS_HEATER_ON(x)	(((x) & SHT3X_STATUS_HEATER) != 0u)
#define SHT3X_STATUS_CMD_FAILED(x)		(((x) & SHT3X_STATUS_CMD_STATUS) != 0u)
#define SHT3X_STATUS_WRITE_CRC_FAIL(x)	(((x) & SHT3X_STATUS_WRITE_CRC) != 0u)
#define SHT3X_STATUS_RESET_DETECTED(x)	(((x) & SHT3X_STATUS_SYS_RESET) != 0u)
#define SHT3X_STATUS_ALERT_ANY			(SHT3X_STATUS_ALERT_PENDING | \
										 SHT3X_STATUS_RH_ALERT		| \
										 SHT3X_STATUS_T_ALERT)

/*  SHT3x COMMAND SET---------------------------------------------------------*/
/* Reset */
#define SHT3X_COMMAND_SOFT_RESET					0x30A2

/* Status */
#define SHT3X_COMMAND_READ_STATUS					0xF32D
#define SHT3X_COMMAND_CLEAR_STATUS					0x3041

/* Heater Control */
#define SHT3X_COMMAND_HEATER_ENABLE					0x306D
#define SHT3X_COMMAND_HEATER_DISABLE				0x3066

/* ART Mode*/
#define SHT3X_COMMAND_ART							0x2B32

/* Periodic Data Flow */
#define SHT3X_COMMAND_FETCH_DATA					0xE000
#define SHT3X_COMMAND_STOP_PERIODIC_MEAS			0x3093

/*  SHT3x STATIC VARIABLES ---------------------------------------------------*/
static const uint16_t SHT3X_MEASURE_CMD[6][3] = {
			{0x2400, 0x240b, 0x2416},	// [SINGLE_SHOT][H,M,L] without clock stretching
			{0x2032, 0x2024, 0x202f},	// [PERIODIC_05][H,M,L]
			{0x2130, 0x2126, 0x212d},	// [PERIODIC_1 ][H,M,L]
			{0x2236, 0x2220, 0x222b},	// [PERIODIC_2 ][H,M,L]
			{0x2334, 0x2322, 0x2329},	// [PERIODIC_4 ][H,M,L]
			{0x2737, 0x2721, 0x272a}	// [PERIODIC_10][H,M,L]
};

static const uint8_t SHT3X_MEAS_DURATION_MS[3] = {
	15,	/* HIGH */
	6,	/* MEDIUM */
	4	/* LOW */
};

/* STATIC FUNCTIONs ----------------------------------------------------------*/
static inline uint16_t uint8_to_uint16(uint8_t msb, uint8_t lsb)
{
	return (uint16_t)(((uint16_t)msb << 8) | (uint16_t)lsb);
}

static inline uint8_t SHT3X_CRC(const uint8_t *data, size_t len)
{
	uint8_t crc = 0xFF;

    for (size_t i = 0; i < len; ++i)
    {
        crc ^= data[i];
        for (int b = 0; b < 8; ++b)
        {
            uint8_t msb = crc & 0x80;
            crc <<= 1U;
            if (msb)
            {
            	crc ^= 0x31;
            }
        }
    }
    return crc;
}

static HAL_StatusTypeDef SHT3X_Send_Command(const sht3x_handle_t *handle, uint16_t command)
{
    if (!handle || !handle->i2c_handle)
    {
    	return HAL_ERROR;
    }

    uint8_t command_buffer[2] = {(uint8_t)((command >> 8) & 0xFF), (uint8_t)(command & 0xFF)};

    if (HAL_I2C_Master_Transmit(handle->i2c_handle,
    							(uint16_t)(handle->device_address << 1U),
								command_buffer,sizeof(command_buffer),
								SHT3X_I2C_TIMEOUT) != HAL_OK)
    {
    	return HAL_ERROR;
    }

    return HAL_OK;
}

static SHT3X_StatusTypeDef SHT3X_ParseFrame(const uint8_t frame[SHT3X_RAW_DATA_SIZE], float *tC, float *rh)
{
    /* CRC check for T and RH words */
    if (SHT3X_CRC(&frame[0], 2) != frame[2])
    {
    	return SHT3X_ERROR;
    }

    if (SHT3X_CRC(&frame[3], 2) != frame[5])
    {
    	return SHT3X_ERROR;
    }

    uint16_t rawT  = uint8_to_uint16(frame[0], frame[1]);
    uint16_t rawRH = uint8_to_uint16(frame[3], frame[4]);

    /* Convert per datasheet */
    if (tC)  *tC  = -45.0f + (175.0f * (float)rawT  / 65535.0f);
    if (rh)  *rh  = 100.0f * (float)rawRH / 65535.0f;

    return SHT3X_OK;
}

static SHT3X_StatusTypeDef SHT3X_ReadStatus(sht3x_handle_t *handle, uint16_t *state_word)
{
	if (!handle || !handle->i2c_handle)
	{
		return SHT3X_ERROR;
	}

	uint8_t read_buffer[3]; // [0]=MSB, [1]=LSB, [2]=CRC

	if (HAL_I2C_Mem_Read(handle->i2c_handle,
						(uint16_t)(handle->device_address << 1U),	// 7-bit addr <<1
						SHT3X_COMMAND_READ_STATUS,					// 0xF32D
						I2C_MEMADD_SIZE_16BIT,						// send [MSB:LSB]
						read_buffer, sizeof(read_buffer),
						SHT3X_I2C_TIMEOUT) != HAL_OK)
	{
		return SHT3X_ERROR;
	}

	if (SHT3X_CRC(read_buffer, 2) != read_buffer[2])
	{
		return SHT3X_ERROR;
	}

	*state_word = (uint16_t)((read_buffer[0] << 8) |read_buffer[1]);	// MSB-first -> little-endian

	return SHT3X_OK;
}

/* GLOBAL FUNCTIONs ----------------------------------------------------------*/
void SHT3X_Init(sht3x_handle_t *handle, I2C_HandleTypeDef *hi2c, uint8_t addr7bit)
{

	if (handle == NULL || hi2c == NULL)
	{
		return;
	}

	if (addr7bit != SHT3X_I2C_ADDR_GND && addr7bit != SHT3X_I2C_ADDR_VDD)
	{
		return;	// invalid 7-bit address
	}

	assert(hi2c->Init.NoStretchMode == I2C_NOSTRETCH_DISABLE);
	if (hi2c->Init.NoStretchMode != I2C_NOSTRETCH_DISABLE)
	{
		return;
	}

	if (hi2c->Init.AddressingMode != I2C_ADDRESSINGMODE_7BIT)
	{
		return;
	}

	handle->i2c_handle	= hi2c;
	handle->device_address	= addr7bit;
	handle->temperature = 0.0f;
	handle->humidity = 0.0f;
	handle->currentState = SHT3X_IDLE;
	handle->modeRepeat = SHT3X_HIGH;

	if (HAL_I2C_IsDeviceReady(hi2c, (uint16_t)(addr7bit << 1U),
							3, SHT3X_I2C_TIMEOUT) != HAL_OK)
	{

		return;
	}

	if (SHT3X_Send_Command(handle, SHT3X_COMMAND_SOFT_RESET) != HAL_OK)
	{
		return;
	}
	HAL_Delay(2);

	if (SHT3X_Send_Command(handle, SHT3X_COMMAND_CLEAR_STATUS) != HAL_OK)
	{
		return;
	}
	HAL_Delay(1);
}

void SHT3X_DeInit(sht3x_handle_t *handle)
{
	if (handle == NULL || handle->i2c_handle == NULL)
	{
		return;
	}

	if (HAL_I2C_IsDeviceReady(handle->i2c_handle,
							(uint16_t)(handle->device_address << 1U),
							3, SHT3X_I2C_TIMEOUT) != HAL_OK)
	{
		return;
	}

	if (SHT3X_IS_PERIODIC_STATE(handle->currentState))
	{
		if (SHT3X_Send_Command(handle, SHT3X_COMMAND_STOP_PERIODIC_MEAS) != HAL_OK)
		{
			return;
		}
		HAL_Delay(1);

		if (SHT3X_Send_Command(handle, SHT3X_COMMAND_CLEAR_STATUS) != HAL_OK)
		{
			return;
		}
		HAL_Delay(1);

		if (SHT3X_Send_Command(handle, SHT3X_COMMAND_SOFT_RESET) != HAL_OK)
		{
			return;
		}
		HAL_Delay(2);
	}

	handle->i2c_handle = NULL;
	handle->device_address = 0;
	handle->temperature = 0.0f;
	handle->humidity = 0.0f;
	handle->currentState = SHT3X_IDLE;
	handle->modeRepeat = SHT3X_HIGH;
}

SHT3X_StatusTypeDef SHT3X_Heater(sht3x_handle_t *handle, const sht3x_heater_mode_t *modeHeater)
{
	if (handle == NULL || handle->i2c_handle == NULL || modeHeater == NULL)
	{
		return SHT3X_ERROR;
	}

	uint16_t cmd;
	switch (*modeHeater)
	{
		case SHT3X_HEATER_ENABLE:
			cmd = SHT3X_COMMAND_HEATER_ENABLE;
			break;
		case SHT3X_HEATER_DISABLE:
			cmd = SHT3X_COMMAND_HEATER_DISABLE;
			break;
		default: return SHT3X_ERROR;
	}

	if (SHT3X_Send_Command(handle, cmd) != HAL_OK)
	{
		return SHT3X_ERROR;
	}

	HAL_Delay(1);

	uint16_t state_word = 0;
    if (SHT3X_ReadStatus(handle, &state_word) != SHT3X_OK)
    {
    	return SHT3X_ERROR;
    }

	if (SHT3X_STATUS_CMD_FAILED(state_word) || SHT3X_STATUS_WRITE_CRC_FAIL(state_word))
	{
		return SHT3X_ERROR;
	}

    if ((*modeHeater == SHT3X_HEATER_ENABLE  && !SHT3X_STATUS_IS_HEATER_ON(state_word)) ||
        (*modeHeater == SHT3X_HEATER_DISABLE && SHT3X_STATUS_IS_HEATER_ON(state_word)))
    {
        return SHT3X_ERROR;
    }

    return SHT3X_OK;
}

SHT3X_StatusTypeDef SHT3X_Single(sht3x_handle_t *handle, sht3x_repeat_t *modeRepeat)
{
	if (!handle || !handle->i2c_handle || !modeRepeat)
	{
		return SHT3X_ERROR;
	}

    sht3x_mode_t savedMode = handle->currentState;
    sht3x_repeat_t savedRepeat = handle->modeRepeat;

	if (SHT3X_IS_PERIODIC_STATE(handle->currentState))
	{
        if (SHT3X_Send_Command(handle, SHT3X_COMMAND_STOP_PERIODIC_MEAS) != HAL_OK)
        {
        	return SHT3X_ERROR;
        }
        HAL_Delay(1);
        handle->currentState = SHT3X_IDLE;
	}

	if (SHT3X_Send_Command(handle, SHT3X_MEASURE_CMD[0][*modeRepeat]) != HAL_OK)
	{
		return SHT3X_ERROR;
	}

	HAL_Delay(SHT3X_MEAS_DURATION_MS[*modeRepeat]);

	uint8_t frame[SHT3X_RAW_DATA_SIZE] = {0};
	if (HAL_I2C_Master_Receive(handle->i2c_handle,
								(uint16_t)(handle->device_address << 1U),
								frame, sizeof(frame), SHT3X_I2C_TIMEOUT) != HAL_OK)
	{
		return SHT3X_ERROR;
	}

	float tC = 0.0f, rh = 0.0f;
	if (SHT3X_ParseFrame(frame, &tC, &rh) != SHT3X_OK)
	{
		return SHT3X_ERROR;
	}

	handle->temperature = tC;
	handle->humidity = rh;

    PRINT_CLI("SINGLE %.2f %.2f\r\n\0", handle->temperature, handle->humidity);

	if (SHT3X_IS_PERIODIC_STATE(savedMode))
	{
		if (SHT3X_Periodic(handle, &savedMode, &savedRepeat) != SHT3X_OK)
		{
			return SHT3X_ERROR;
		}
		handle->currentState =  savedMode;
		handle->modeRepeat = savedRepeat;
//		PRINT_CLI("currentState: %d, modeRepeat: %d\r\n", handle->currentState, handle->modeRepeat);
	}
	else
	{
		handle->currentState = SHT3X_SINGLE_SHOT;
		handle->modeRepeat = *modeRepeat;
//		PRINT_CLI("currentState: %d, modeRepeat: %d\r\n", handle->currentState, handle->modeRepeat);
	}

	return SHT3X_OK;
}

SHT3X_StatusTypeDef SHT3X_Periodic(sht3x_handle_t *handle, sht3x_mode_t *modePeriodic, sht3x_repeat_t *modeRepeat)
{
	if (!handle || !handle->i2c_handle || !modePeriodic || !modeRepeat)
	{
		return SHT3X_ERROR;
	}

	if (SHT3X_IS_PERIODIC_STATE(handle->currentState))
	{
		if (SHT3X_Send_Command(handle, SHT3X_COMMAND_STOP_PERIODIC_MEAS) != HAL_OK)
		{
			return SHT3X_ERROR;
		}
		HAL_Delay(1);
    }

	uint8_t row;
	switch (*modePeriodic) {
		case SHT3X_PERIODIC_05MPS:
			row = 1; break;
		case SHT3X_PERIODIC_1MPS:
			row = 2; break;
		case SHT3X_PERIODIC_2MPS:
			row = 3; break;
		case SHT3X_PERIODIC_4MPS:
			row = 4; break;
		case SHT3X_PERIODIC_10MPS:
			row = 5; break;
		default: return HAL_ERROR;
    }

	if (SHT3X_Send_Command(handle, SHT3X_MEASURE_CMD[row][*modeRepeat]) != HAL_OK)
	{
		return SHT3X_ERROR;
	}

    handle->currentState = *modePeriodic;
    handle->modeRepeat = *modeRepeat;

	return SHT3X_OK;
}


SHT3X_StatusTypeDef SHT3X_ART(sht3x_handle_t *handle)
{
	if (!handle || !handle->i2c_handle)
	{
		return SHT3X_ERROR;
	}

	if (SHT3X_IS_PERIODIC_STATE(handle->currentState))
	{
		if (SHT3X_Send_Command(handle, SHT3X_COMMAND_STOP_PERIODIC_MEAS) != HAL_OK)
		{
			return SHT3X_ERROR;
		}
		HAL_Delay(1);
	}

	if (SHT3X_Send_Command(handle, SHT3X_COMMAND_ART) != HAL_OK)
	{
		return SHT3X_ERROR;
	}

	handle->currentState = SHT3X_PERIODIC_4MPS;
    handle->modeRepeat = SHT3X_HIGH;

	return SHT3X_OK;
}

SHT3X_StatusTypeDef SHT3X_Stop_Periodic(sht3x_handle_t *handle)
{
	if (!handle || !handle->i2c_handle)
	{
		return SHT3X_ERROR;
	}
	if (!SHT3X_IS_PERIODIC_STATE(handle->currentState)) {
        handle->currentState = SHT3X_IDLE;
        return SHT3X_OK;	/* nothing to stop */
    }

	if (SHT3X_Send_Command(handle, SHT3X_COMMAND_STOP_PERIODIC_MEAS) != HAL_OK)
	{
		return SHT3X_ERROR;
	}
    HAL_Delay(1);

    handle->currentState = SHT3X_IDLE;

	return SHT3X_OK;
}

void SHT3X_FetchData(sht3x_handle_t *handle, float *outT, float *outRH)
{
	if (!handle || !handle->i2c_handle)
	{
		return;
	}

	if (!SHT3X_IS_PERIODIC_STATE(handle->currentState))
	{
		return;
	}

	uint8_t frame[SHT3X_RAW_DATA_SIZE] = {0};
	if (HAL_I2C_Mem_Read(handle->i2c_handle,
						(uint16_t)(handle->device_address << 1U),
						SHT3X_COMMAND_FETCH_DATA, I2C_MEMADD_SIZE_16BIT,
						frame, sizeof(frame), SHT3X_I2C_TIMEOUT) != HAL_OK)
    {
        return;
    }

    float tC = 0.0f, rh = 0.0f;
    if(SHT3X_ParseFrame(frame, &tC, &rh) != SHT3X_OK)
    {
    	return;
    }

    handle->temperature = tC;
    handle->humidity    = rh;

    if (outT)
    {
    	*outT  = tC;
    }
    if (outRH)
    {
    	*outRH = rh;
    }

    PRINT_CLI("PERIODIC %.2f %.2f\r\n\0", handle->temperature, handle->humidity);
}
