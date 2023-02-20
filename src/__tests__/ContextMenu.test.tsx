import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextMenuHandler } from '../components/ContextMenuHandler';
import { menuItems } from '../__mocks__/mockMenu';

describe('Context menu', () => {
  const a = jest.fn();
  const user = userEvent.setup();
  test('Empty render, click expan', async () => {
    render(
      <ContextMenuHandler menuItems={[{ label: 'Hello', action: a }]}>
        <div data-testid='inside-div' />
      </ContextMenuHandler>,
    );
    const testDiv = screen.getByTestId('inside-div');
    fireEvent.contextMenu(testDiv);
    expect(screen.queryByText('Hello')).toBeInTheDocument();
    const h = screen.getByText('Hello');
    await user.click(h);
    expect(a).toHaveBeenCalled();
  });

  test('Move the mouse', async () => {
    const user = userEvent.setup();
    const setColour = jest.fn();
    render(
      <ContextMenuHandler menuItems={menuItems(setColour)}>
        <div data-testid='inside-div'>Inside</div>
        <div data-testid='another-div'>Outside</div>
      </ContextMenuHandler>,
    );
    const testDiv = screen.getByTestId('inside-div');
    // Show content menu
    fireEvent.contextMenu(testDiv);
    expect(screen.queryByText('Blue')).toBeInTheDocument();

    // Mouse over & leave
    const blueItem = screen.getByText('Blue') as HTMLSpanElement;
    const blueCaret = (blueItem.parentElement as HTMLDivElement).querySelector('svg') as SVGElement;
    const blueSubMenu = (blueItem.parentElement as HTMLDivElement).querySelector(
      'div.context-menu',
    ) as HTMLDivElement;
    expect(blueSubMenu.className).toEqual('context-menu');
    fireEvent.mouseOver(blueCaret);
    expect(blueSubMenu.className).toEqual('context-menu visible');
    fireEvent.mouseLeave(blueCaret);
    expect(blueSubMenu.className).toEqual('context-menu');

    // Click off menu
    const notDiv = screen.getByTestId('another-div');
    await user.click(notDiv);
    expect(screen.queryByText('Blue')).not.toBeInTheDocument();

    // Content menu click & close
    fireEvent.contextMenu(testDiv);
    const greenItem = screen.getByText('Green');
    await user.click(greenItem);
    expect(setColour).toHaveBeenCalledTimes(1);
    expect(setColour).toHaveBeenCalledWith('green');
    expect(greenItem).not.toBeInTheDocument();
  });
});
