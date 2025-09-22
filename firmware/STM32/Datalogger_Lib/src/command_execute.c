/**
 * @file command_execute.c
 */
/* INCLUDES ------------------------------------------------------------------*/
#include "command_execute.h"
#include "cmd_func.h"
#include "cmd_parser.h"
#include <string.h>
#include <stdint.h>

/* VARIABLES -----------------------------------------------------------------*/
extern command_function_t cmdTable[];

/* STATIC FUNCTIONS ----------------------------------------------------------*/
/*
 * @brief
 *
 * @note
 *
 * @param *str
 * @param **argv
 * @param max_tokens
 *
 * @return
 */
static uint8_t tokenize_string(char *str, char **argv, uint8_t max_tokens)
{
	uint8_t argc = 0;
	char *token = strtok(str, " \t\r\n");

	while (token != NULL && argc < max_tokens)
	{
		argv[argc++] = token;
		token = strtok(NULL, " \t\r\n");
	}

	return argc;
}

/*
 * @brief
 *
 * @note
 *
 * @param *cmd
 *
 * @return
 */
static command_function_t* find_command(char *cmd)
{
	for (uint8_t i = 0; cmdTable[i].cmdString != NULL; i++) {
		if (!strcmp(cmdTable[i].cmdString , cmd))
		{
			return &cmdTable[i];
		}
	}
	return NULL;
}

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
void COMMAND_EXECUTE(char *commandBuffer)
{
    if (commandBuffer == NULL)
        return;

    char buffer[256];
    strncpy(buffer, commandBuffer, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';

    char *argv[10];
    uint8_t argc = tokenize_string(buffer, argv, 10);

    if (argc == 0)
        return;

    char cmdString[256] = {0};
    for (uint8_t i = 0; i < argc; i++) {
        strcat(cmdString, argv[i]);
        if (i < argc - 1) strcat(cmdString, " ");
    }

    command_function_t *command = find_command(cmdString);

    if (command == NULL) {
        Cmd_Default(argc, argv);
    } else {
        command->func(argc, argv);
    }
}
