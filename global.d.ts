/// <reference types="@types/css-modules" />

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
