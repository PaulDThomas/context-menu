import { render } from "@testing-library/react";
import { DockZoneIndicator } from "./DockZoneIndicator";
import type { DockEdge } from "./interface";

describe("DockZoneIndicator", () => {
  test("renders nothing when not dragging or when there is no target edge", () => {
    const { container, rerender } = render(
      <DockZoneIndicator
        targetEdge="left"
        isDragging={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <DockZoneIndicator
        targetEdge={null}
        isDragging={true}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test.each(["top", "bottom", "left", "right"] as const)(
    "highlights the %s edge while dragging",
    (edge) => {
      const { container } = render(
        <DockZoneIndicator
          targetEdge={edge}
          isDragging={true}
        />,
      );
      const indicator = container.firstElementChild as HTMLElement;

      expect(indicator.className).toBe(`dockZoneIndicator ${edge}`);
      expect(indicator).toHaveAttribute("data-dock-edge", edge);
    },
  );

  test("renders nothing for an unknown edge", () => {
    const { container } = render(
      <DockZoneIndicator
        targetEdge={"middle" as DockEdge}
        isDragging={true}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
