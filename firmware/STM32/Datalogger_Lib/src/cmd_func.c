/**
 * @file cmd_func.c
 */
/* INCLUDES ------------------------------------------------------------------*/
#include "cmd_func.h"
#include "cmd_parser.h"
#include <stddef.h>

/* VARIABLES -----------------------------------------------------------------*/
/*
 * @brief
 */
command_function_t cmdTable[] = {

		{.cmdString = "SHT3X HEATER ENABLE",
		.func = SHT3X_Heater_Parser},

		{.cmdString = "SHT3X HEATER DISABLE",
		.func = SHT3X_Heater_Parser},

		{.cmdString = "SHT3X SINGLE HIGH",
		.func = SHT3X_Single_Parser},

		{.cmdString = "SHT3X SINGLE MEDIUM",
		.func = SHT3X_Single_Parser},

		{.cmdString = "SHT3X SINGLE LOW",
		.func = SHT3X_Single_Parser},

		{.cmdString = "SHT3X PERIODIC 0.5 HIGH",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 0.5 MEDIUM",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 0.5 LOW",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 1 HIGH",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 1 MEDIUM",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 1 LOW",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 2 HIGH",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 2 MEDIUM",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 2 LOW",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 4 HIGH",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 4 MEDIUM",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 4 LOW",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 10 HIGH",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 10 MEDIUM",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X PERIODIC 10 LOW",
		.func = SHT3X_Periodic_Parser},

		{.cmdString = "SHT3X ART",
		.func = SHT3X_ART_Parser},

		{.cmdString = "SHT3X PERIODIC STOP",
		.func = SHT3X_Stop_Periodic_Parser},

		{NULL, NULL}

};
