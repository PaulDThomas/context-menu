declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// React 19 act() environment support
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
