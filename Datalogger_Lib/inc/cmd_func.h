/**
 * @file cmd_func.h
 */

#ifndef CMD_FUNC_H
#define CMD_FUNC_H

/* INCLUDES ------------------------------------------------------------------*/
#include <stdint.h>

/* TYPEDEFS ------------------------------------------------------------------*/
/*
 * @brief
 */
typedef void (*CmdHandlerFunc)(uint8_t argc, char **argv);

/*
 * @brief
 */
typedef struct
{
	const char *cmdString;
	CmdHandlerFunc func;
} command_function_t;

#endif /* CMD_FUNC_H */
