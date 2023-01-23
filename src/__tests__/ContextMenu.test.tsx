import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextMenuHandler } from '../components/ContextMenuHandler';

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

  test('Click off menu', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenuHandler menuItems={[{ label: 'Hello' }]}>
        <div data-testid='inside-div'>Inside</div>
        <div data-testid='another-div'>Outside</div>
      </ContextMenuHandler>,
    );
    const testDiv = screen.getByTestId('inside-div');
    fireEvent.contextMenu(testDiv);
    expect(screen.queryByText('Hello')).toBeInTheDocument();
    const notDiv = screen.getByTestId('another-div');
    await user.click(notDiv);
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});
