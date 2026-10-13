import { render } from "@testing-library/react";
import { CoverContentIcon } from "./CoverContentIcon";
import { PushContentIcon } from "./PushContentIcon";

describe("content layout icons", () => {
  test("defaults the cover-content icon to the right edge", () => {
    const { container } = render(<CoverContentIcon size={16} />);

    expect(container.querySelector("path")?.getAttribute("d")).toContain("M9 4h6v8");
  });

  test("defaults the push-content icon to the left edge", () => {
    const { container } = render(<PushContentIcon size={16} />);

    expect(container.querySelector("path")?.getAttribute("d")).toContain("M1 2h14v12");
  });
});
