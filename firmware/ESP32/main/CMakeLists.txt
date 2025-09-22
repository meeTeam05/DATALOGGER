# main/CMakeLists.txt

idf_component_register(
    SRCS
        "app_main.c"
    INCLUDE_DIRS "."
    REQUIRES
        stm32_uart
        mqtt_handler
        relay_control
        sensor_parser
        esp_wifi
        esp_netif
        nvs_flash
        protocol_examples_common
)

target_compile_options(${COMPONENT_LIB} PRIVATE -Wno-format)