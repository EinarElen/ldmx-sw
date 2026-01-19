/**
 * @file LinkDef.h
 * @brief ROOT dictionary definitions for Bertini cascade history classes
 */

#ifdef __CINT__

#pragma link off all globals;
#pragma link off all classes;
#pragma link off all functions;

#pragma link C++ nestedclass;
#pragma link C++ nestedtypedef;

#pragma link C++ namespace ldmx;

// Cascade step data class
#pragma link C++ class ldmx::CascadeStep + ;
#pragma link C++ class std::vector < ldmx::CascadeStep> + ;

// Cascade history container
#pragma link C++ class ldmx::CascadeHistory + ;

// Map for storing histories keyed by track ID
#pragma link C++ class std::map < int, ldmx::CascadeHistory> + ;

#endif
