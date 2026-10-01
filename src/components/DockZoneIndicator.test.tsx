import { render } from "@testing-library/react";
import { DockZoneIndicator } from "./DockZoneIndicator";
import type { DockEdge } from "./interface";

const getIndicator = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe("DockZoneIndicator", () => {
  test("is hidden when not dragging or when there is no target edge", () => {
    const { container, rerender } = render(
      <DockZoneIndicator
        targetEdge="left"
        isDragging={false}
      />,
    );
    expect(getIndicator(container).style.display).toBe("none");

    rerender(
      <DockZoneIndicator
        targetEdge={null}
        isDragging={true}
      />,
    );
    expect(getIndicator(container).style.display).toBe("none");
  });

  test.each([
    ["top", { top: "0px", left: "0px", right: "0px", height: "60px" }, "borderBottom"],
    ["bottom", { bottom: "0px", left: "0px", right: "0px", height: "60px" }, "borderTop"],
    ["left", { left: "0px", top: "0px", bottom: "0px", width: "60px" }, "borderRight"],
    ["right", { right: "0px", top: "0px", bottom: "0px", width: "60px" }, "borderLeft"],
  ] as const)("highlights the %s edge while dragging", (edge, expected, innerBorder) => {
    const { container } = render(
      <DockZoneIndicator
        targetEdge={edge}
        isDragging={true}
      />,
    );
    const indicator = getIndicator(container);

    expect(indicator.style.position).toBe("fixed");
    expect(indicator.style.pointerEvents).toBe("none");
    expect(indicator.style.display).toBe("");
    for (const [property, value] of Object.entries(expected)) {
      expect(indicator.style.getPropertyValue(property)).toBe(value);
    }
    // The solid border marks the inner side of the drop zone
    expect(indicator.style[innerBorder]).toContain("3px solid");
  });

  test("is hidden for an unknown edge", () => {
    const { container } = render(
      <DockZoneIndicator
        targetEdge={"middle" as DockEdge}
        isDragging={true}
      />,
    );
    expect(getIndicator(container).style.display).toBe("none");
  });
});
