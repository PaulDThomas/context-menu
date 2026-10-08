import { render } from "@testing-library/react";
import { DockIcon } from "./DockIcon";

test("defaults to the right-edge docking icon", () => {
  const { container } = render(<DockIcon size={14} />);

  expect(container.querySelector("path")).toHaveAttribute(
    "d",
    "M1 2h14v12H1V2zm1 1v10h8V3H2zm9 0v10h3V3h-3zM3 7.5h3v-2L9 8l-3 2.5v-2H3v-1z",
  );
});
