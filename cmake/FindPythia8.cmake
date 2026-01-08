#
# FindPythia8.cmake
#
# Find an installation of Pythia8. Tuned to the installation
# of Pythia8 that is built into the ldmx/dev image.
#
# This will define the following variables
#
# Pythia8_FOUND        - boolean if we found Pythia8
# PYTHIA8_INCLUDE_DIR  - path to the headers
# PYTHIA8_INCLUDE_DIRS - alias for PYTHIA8_INCLUDE_DIR
# PYTHIA8_LIBRARIES    - CMake list of libraries to link to
# PYTHIA8_XMLDOC_DIR   - path to xmldoc directory
# PYTHIA8_VERSION      - Pythia8 version string
#
# and the following imported target
#
# Pythia8::Pythia8
#

if (Pythia8_FOUND)
  return()
endif()

set(PYTHIA8_ROOT_DIR "/usr/local" CACHE PATH "Pythia8 installation prefix")

# Find the include directory
find_path(PYTHIA8_INCLUDE_DIR
  NAMES Pythia8/Pythia.h
  HINTS ${PYTHIA8_ROOT_DIR}/include
  DOC "Pythia8 include directory"
)

# Find the library
find_library(PYTHIA8_LIBRARY
  NAMES pythia8 Pythia8
  HINTS ${PYTHIA8_ROOT_DIR}/lib ${PYTHIA8_ROOT_DIR}/lib64
  DOC "Pythia8 library"
)

# Find xmldoc directory (needed for Pythia8 data files)
find_path(PYTHIA8_XMLDOC_DIR
  NAMES Version.xml
  HINTS ${PYTHIA8_ROOT_DIR}/share/Pythia8/xmldoc
        ${PYTHIA8_ROOT_DIR}/share/pythia8-data/xmldoc
        ${PYTHIA8_ROOT_DIR}/xmldoc
  DOC "Pythia8 xmldoc directory"
)

# Extract version if possible
if(PYTHIA8_XMLDOC_DIR AND EXISTS "${PYTHIA8_XMLDOC_DIR}/Version.xml")
  file(READ "${PYTHIA8_XMLDOC_DIR}/Version.xml" _version_content)
  string(REGEX MATCH "versionNumber[^0-9]*([0-9]+\\.[0-9]+)" _version_match "${_version_content}")
  if(_version_match)
    set(PYTHIA8_VERSION "${CMAKE_MATCH_1}")
  endif()
endif()

# Set include dirs and libraries variables
set(PYTHIA8_INCLUDE_DIRS ${PYTHIA8_INCLUDE_DIR})
set(PYTHIA8_LIBRARIES ${PYTHIA8_LIBRARY})

# Standard find_package handling
include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Pythia8
  REQUIRED_VARS PYTHIA8_INCLUDE_DIR PYTHIA8_LIBRARY PYTHIA8_XMLDOC_DIR
  VERSION_VAR PYTHIA8_VERSION
)

# Create imported target
if(Pythia8_FOUND AND NOT TARGET Pythia8::Pythia8)
  add_library(Pythia8::Pythia8 SHARED IMPORTED)
  set_target_properties(Pythia8::Pythia8 PROPERTIES
    IMPORTED_LOCATION "${PYTHIA8_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${PYTHIA8_INCLUDE_DIR}"
  )
endif()

mark_as_advanced(PYTHIA8_INCLUDE_DIR PYTHIA8_LIBRARY PYTHIA8_XMLDOC_DIR)
