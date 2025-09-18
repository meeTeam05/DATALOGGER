/**
 * @file cmd_parser.c
 */
/* INCLUDES ------------------------------------------------------------------*/
#include "cmd_parser.h"
#include "print_cli.h"
#include "sht3x.h"
#include <string.h>

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
void Cmd_Default(uint8_t argc, char **argv)
{
    PRINT_CLI("Unknown command\r\n");
}

void SHT3X_Heater_Parser(uint8_t argc, char **argv)
{
	if (argc == 3 && strcmp(argv[2], "ENABLE") == 0)
	{
		sht3x_heater_mode_t modeHeater = SHT3X_HEATER_ENABLE;
		if (SHT3X_Heater(&g_sht3x, &modeHeater) == SHT3X_OK)
		{
			PRINT_CLI("Heater enable succeeded\r\n");
		}
		else
		{
			PRINT_CLI("Heater enable failed\r\n");
		}
	}

	else if (argc == 3 && strcmp(argv[2], "DISABLE") == 0)
	{
		sht3x_heater_mode_t modeHeater = SHT3X_HEATER_DISABLE;
		if (SHT3X_Heater(&g_sht3x, &modeHeater) == SHT3X_OK)
		{
			PRINT_CLI("Heater disable succeeded\r\n");
		}
		else
		{
			PRINT_CLI("Heater disable failed\r\n");
		}
	}
}

void SHT3X_Single_Parser(uint8_t argc, char **argv)
{
	if (argc < 3) return;

	sht3x_repeat_t modeRepeat;

	if (strcmp(argv[2], "HIGH") == 0)
	{
		modeRepeat = SHT3X_HIGH;
	}
	else if (strcmp(argv[2], "MEDIUM") == 0)
	{
		modeRepeat = SHT3X_MEDIUM;
	}
	else if (strcmp(argv[2], "LOW") == 0)
	{
		modeRepeat = SHT3X_LOW;
	}
	else
	{
		return;
	}

	if(SHT3X_Single(&g_sht3x, &modeRepeat) == SHT3X_OK)
	{
		PRINT_CLI("Single mode succeeded\r\n");
	}
	else
	{
		PRINT_CLI("Single mode failed\r\n");
	}
}

void SHT3X_Periodic_Parser(uint8_t argc, char **argv)
{

	if (argc < 4) return;

	sht3x_mode_t modePeriodic;
	if (strcmp(argv[2], "0.5") == 0)
	{
		modePeriodic = SHT3X_PERIODIC_05MPS;
	}
	else if (strcmp(argv[2], "1") == 0)
	{
		modePeriodic = SHT3X_PERIODIC_1MPS;
	}
    else if (strcmp(argv[2], "2") == 0)
    {
    	modePeriodic = SHT3X_PERIODIC_2MPS;
    }
    else if (strcmp(argv[2], "4") == 0)
    {
    	modePeriodic = SHT3X_PERIODIC_4MPS;
    }
    else if (strcmp(argv[2], "10") == 0)
    {
    	modePeriodic = SHT3X_PERIODIC_10MPS;
    }
    else
    {
    	return;
    }

	sht3x_repeat_t modeRepeat;
    if (strcmp(argv[3], "HIGH") == 0)
    {
    	modeRepeat = SHT3X_HIGH;
    }
    else if (strcmp(argv[3], "MEDIUM") == 0)
    {
    	modeRepeat = SHT3X_MEDIUM;
    }
    else if (strcmp(argv[3], "LOW") == 0)
    {
    	modeRepeat = SHT3X_LOW;
    }
    else
    {
    	return;
    }

    if(SHT3X_Periodic(&g_sht3x, &modePeriodic, &modeRepeat) == SHT3X_OK)
    {
    	PRINT_CLI("Periodic mode succeeded\r\n");
    }
    else
    {
    	PRINT_CLI("Periodic mode failed\r\n");
    }
}

void SHT3X_ART_Parser(uint8_t argc, char **argv)
{
    if (SHT3X_ART(&g_sht3x) == SHT3X_OK)
    {
    	PRINT_CLI("ART mode succeeded\r\n");
    }
    else
    {
    	PRINT_CLI("ART mode failed\r\n");
    }

}

void SHT3X_Stop_Periodic_Parser(uint8_t argc, char **argv)
{
    if(SHT3X_Stop_Periodic(&g_sht3x) == SHT3X_OK)
    {
    	PRINT_CLI("Stop periodic succeeded\r\n");
    }
    else
    {
    	PRINT_CLI("Stop periodic failed\r\n");
    }
}
