/** Joins the truthy class names with spaces */
export const classNames = (...names: (string | false | null | undefined)[]): string =>
  names.filter((name) => name).join(" ");
