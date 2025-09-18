/**
 * @file cmd_parser.h
 */
#ifndef CMD_PARSER_H
#define CMD_PARSER_H

/* INCLUDES ------------------------------------------------------------------*/
#include <stdint.h>

/* GLOBAL FUNCTIONS ----------------------------------------------------------*/
/*
 * @brief
 *
 * @note
 *
 * @param argc
 * @param **argv
 */
void Cmd_Default(uint8_t argc, char **argv);

/*
 * @brief
 *
 * @note
 *
 * @param argc
 * @param **argv
 */
void SHT3X_Heater_Parser(uint8_t argc, char **argv);

/*
 * @brief
 *
 * @note
 *
 * @param argc
 * @param **argv
 */
void SHT3X_Single_Parser(uint8_t argc, char **argv);

/*
 * @brief
 *
 * @note
 *
 * @param argc
 * @param **argv
 */
void SHT3X_Periodic_Parser(uint8_t argc, char **argv);

/*
 * @brief
 *
 * @note
 *
 * @param argc
 * @param **argv
 */
void SHT3X_ART_Parser(uint8_t argc, char **argv);

/*
 * @brief
 *
 * @note
 *
 * @param argc
 * @param **argv
 */
void SHT3X_Stop_Periodic_Parser(uint8_t argc, char **argv);

#endif /* CMD_PARSER_H */
