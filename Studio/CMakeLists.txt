cmake_minimum_required(VERSION 3.24)
project(LdmxStudio VERSION 0.1.0 LANGUAGES CXX)

# Deliberately standalone: Qt runs on the host; LDMX runs through denv.
find_package(Qt6 6.8 REQUIRED COMPONENTS Quick QuickControls2 Quick3D)
qt_standard_project_setup(REQUIRES 6.8)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

qt_add_executable(ldmx-studio src/main.cpp)
qt_add_qml_module(ldmx-studio
  URI LdmxStudio
  VERSION 1.0
  DEPENDENCIES QtQuick QtQuick3D
  QML_FILES Main.qml DetectorView.qml HooksEditor.qml
            RecipeEditor.qml AnalysisWorkspace.qml DetectorPanel.qml DetectorPlot.qml
            StudyPage.qml RunPage.qml Inspector.qml
            SegmentedChoice.qml OutcomeChoice.qml RecipeScene.qml HcalSectionMap.qml
  SOURCES src/StudioController.h src/StudioController.cpp
          src/HitInstances.h src/HitInstances.cpp
          src/RunConfig.h src/RunConfig.cpp
          src/StudyStore.h src/StudyStore.cpp
  RESOURCES ViewMath.js bridge/event_bridge.py bridge/supervise.py assets/ldmx.svg
)
target_include_directories(ldmx-studio PRIVATE src)
target_link_libraries(ldmx-studio PRIVATE
  Qt6::Quick Qt6::QuickControls2 Qt6::Quick3D)
install(TARGETS ldmx-studio BUNDLE DESTINATION . RUNTIME DESTINATION bin)

include(CTest)
if(BUILD_TESTING)
  target_compile_definitions(ldmx-studio PRIVATE STUDIO_BUILD_TESTING)
  find_package(Qt6 REQUIRED COMPONENTS Test)
  target_link_libraries(ldmx-studio PRIVATE Qt6::Test)
  find_package(Python3 REQUIRED COMPONENTS Interpreter)
  qt_add_executable(studio-config-test tests/ConfigTest.cpp src/RunConfig.cpp)
  target_include_directories(studio-config-test PRIVATE src)
  target_compile_definitions(studio-config-test PRIVATE
    STUDIO_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
    STUDIO_PYTHON="${Python3_EXECUTABLE}")
  target_link_libraries(studio-config-test PRIVATE Qt6::Test)
  add_test(NAME StudioConfig COMMAND studio-config-test)
  qt_add_executable(studio-study-test tests/StudyTest.cpp src/StudyStore.cpp
    src/StudyStore.h src/RunConfig.cpp)
  target_include_directories(studio-study-test PRIVATE src)
  target_link_libraries(studio-study-test PRIVATE Qt6::Test Qt6::Qml)
  add_test(NAME StudioStudy COMMAND studio-study-test)
  add_test(NAME StudioWorkbench COMMAND ldmx-studio --check-workbench)
  set_tests_properties(StudioWorkbench PROPERTIES TIMEOUT 30)
  add_test(NAME StudioBridge
    COMMAND ${Python3_EXECUTABLE} -B -m unittest discover -s tests -p test_bridge.py
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})
  # Explicit opt-in: this runs real denv jobs and is not part of ordinary ctest.
  qt_add_executable(studio-integration tests/Integration.cpp
    src/StudioController.cpp src/StudioController.h src/RunConfig.cpp)
  target_include_directories(studio-integration PRIVATE src)
  target_link_libraries(studio-integration PRIVATE Qt6::Gui Qt6::Qml)
  qt_add_resources(studio-integration integration_bridge
    PREFIX "/qt/qml/LdmxStudio"
    FILES bridge/event_bridge.py bridge/supervise.py)
endif()
