# Tạo file này ở thư mục gốc project (cùng cấp main/)
cmake_minimum_required(VERSION 3.16)

# Chỉ định thư mục chứa components
set(EXTRA_COMPONENT_DIRS "components")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_mqtt_bridge)