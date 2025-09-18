################################################################################
# Automatically-generated file. Do not edit!
# Toolchain: GNU Tools for STM32 (13.3.rel1)
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/cmd_func.c \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/cmd_parser.c \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/command_execute.c \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/print_cli.c \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/ring_buffer.c \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/sht3x.c \
E:/STM32CubeIDE/mylib/Datalogger_Lib/src/uart.c 

OBJS += \
./Datalogger_Lib/src/cmd_func.o \
./Datalogger_Lib/src/cmd_parser.o \
./Datalogger_Lib/src/command_execute.o \
./Datalogger_Lib/src/print_cli.o \
./Datalogger_Lib/src/ring_buffer.o \
./Datalogger_Lib/src/sht3x.o \
./Datalogger_Lib/src/uart.o 

C_DEPS += \
./Datalogger_Lib/src/cmd_func.d \
./Datalogger_Lib/src/cmd_parser.d \
./Datalogger_Lib/src/command_execute.d \
./Datalogger_Lib/src/print_cli.d \
./Datalogger_Lib/src/ring_buffer.d \
./Datalogger_Lib/src/sht3x.d \
./Datalogger_Lib/src/uart.d 


# Each subdirectory must supply rules for building sources it contributes
Datalogger_Lib/src/cmd_func.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/cmd_func.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"
Datalogger_Lib/src/cmd_parser.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/cmd_parser.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"
Datalogger_Lib/src/command_execute.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/command_execute.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"
Datalogger_Lib/src/print_cli.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/print_cli.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"
Datalogger_Lib/src/ring_buffer.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/ring_buffer.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"
Datalogger_Lib/src/sht3x.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/sht3x.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"
Datalogger_Lib/src/uart.o: E:/STM32CubeIDE/mylib/Datalogger_Lib/src/uart.c Datalogger_Lib/src/subdir.mk
	arm-none-eabi-gcc "$<" -mcpu=cortex-m3 -std=gnu11 -g3 -DDEBUG -DUSE_HAL_DRIVER -DSTM32F103xB -c -I../Core/Inc -I../Drivers/STM32F1xx_HAL_Driver/Inc/Legacy -I../Drivers/STM32F1xx_HAL_Driver/Inc -I../Drivers/CMSIS/Device/ST/STM32F1xx/Include -I../Drivers/CMSIS/Include -I"E:/STM32CubeIDE/mylib/Datalogger_Lib/inc" -O0 -ffunction-sections -fdata-sections -Wall -fstack-usage -fcyclomatic-complexity -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" --specs=nano.specs -mfloat-abi=soft -mthumb -o "$@"

clean: clean-Datalogger_Lib-2f-src

clean-Datalogger_Lib-2f-src:
	-$(RM) ./Datalogger_Lib/src/cmd_func.cyclo ./Datalogger_Lib/src/cmd_func.d ./Datalogger_Lib/src/cmd_func.o ./Datalogger_Lib/src/cmd_func.su ./Datalogger_Lib/src/cmd_parser.cyclo ./Datalogger_Lib/src/cmd_parser.d ./Datalogger_Lib/src/cmd_parser.o ./Datalogger_Lib/src/cmd_parser.su ./Datalogger_Lib/src/command_execute.cyclo ./Datalogger_Lib/src/command_execute.d ./Datalogger_Lib/src/command_execute.o ./Datalogger_Lib/src/command_execute.su ./Datalogger_Lib/src/print_cli.cyclo ./Datalogger_Lib/src/print_cli.d ./Datalogger_Lib/src/print_cli.o ./Datalogger_Lib/src/print_cli.su ./Datalogger_Lib/src/ring_buffer.cyclo ./Datalogger_Lib/src/ring_buffer.d ./Datalogger_Lib/src/ring_buffer.o ./Datalogger_Lib/src/ring_buffer.su ./Datalogger_Lib/src/sht3x.cyclo ./Datalogger_Lib/src/sht3x.d ./Datalogger_Lib/src/sht3x.o ./Datalogger_Lib/src/sht3x.su ./Datalogger_Lib/src/uart.cyclo ./Datalogger_Lib/src/uart.d ./Datalogger_Lib/src/uart.o ./Datalogger_Lib/src/uart.su

.PHONY: clean-Datalogger_Lib-2f-src

