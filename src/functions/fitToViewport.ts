const DEFAULT_VIEWPORT_PADDING = 32;

export const fitToViewport = (
  element: HTMLElement | null,
  viewportPadding: number = DEFAULT_VIEWPORT_PADDING,
): void => {
  if (!element) {
    return;
  }

  const availableWidth = Math.max(0, window.innerWidth - viewportPadding);
  const availableHeight = Math.max(0, window.innerHeight - viewportPadding);
  const rect = element.getBoundingClientRect();
  const horizontalChrome = rect.width - element.clientWidth;
  const verticalChrome = rect.height - element.clientHeight;

  if (rect.width > availableWidth) {
    element.style.width = `${Math.max(0, availableWidth - horizontalChrome)}px`;
  }

  if (rect.height > availableHeight) {
    element.style.height = `${Math.max(0, availableHeight - verticalChrome)}px`;
  }
};
