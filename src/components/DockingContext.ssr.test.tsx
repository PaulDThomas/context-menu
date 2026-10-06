/** @jest-environment node */

import { renderToString } from "react-dom/server";
import { DockingProvider } from "./DockingContext";

test("renders with default panel settings when no browser window is available", () => {
  expect(() =>
    renderToString(
      <DockingProvider>
        <div />
      </DockingProvider>,
    ),
  ).not.toThrow();
});
