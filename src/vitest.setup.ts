// Configure React 19's act() environment for testing
// This must be set before any React imports
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
