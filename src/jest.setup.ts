// Configure React 19's act() environment for testing
// This must be set before any React imports
(global as typeof globalThis).IS_REACT_ACT_ENVIRONMENT = true;
