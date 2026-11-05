/** @vitest-environment node */

import { renderToString } from "react-dom/server";
import { getBodyZIndexLimits } from "../functions/getBodyZIndexLimits";
import { ContextWindow } from "./ContextWindow";
import { DockingProvider } from "./DockingContext";

test("renders with default panel settings when no browser window is available", () => {
  expect(getBodyZIndexLimits()).toEqual({ min: 3000, max: 3100 });
  expect(() =>
    renderToString(
      <DockingProvider>
        <div />
      </DockingProvider>,
    ),
  ).not.toThrow();
});

test("renders a visible window inline when no browser document is available", () => {
  const markup = renderToString(
    <ContextWindow
      id="server-window"
      title="Server window"
      visible
    >
      Server-rendered content
    </ContextWindow>,
  );

  expect(markup).toContain('id="server-window"');
  expect(markup).toContain("Server-rendered content");
});

test("omits a hidden window when no browser document is available", () => {
  const markup = renderToString(
    <ContextWindow
      id="hidden-server-window"
      title="Hidden server window"
      visible={false}
    >
      Hidden content
    </ContextWindow>,
  );

  expect(markup).not.toContain('id="hidden-server-window"');
  expect(markup).not.toContain("Hidden content");
});
