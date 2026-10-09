/** @jest-environment node */

import { renderToString } from "react-dom/server";
import { getBodyZIndexLimits } from "../functions/getBodyZIndexLimits";
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
