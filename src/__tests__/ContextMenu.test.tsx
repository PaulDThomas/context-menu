import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextMenu } from '../components/ContextMenu';
import { ContextMenuHandler } from '../components/ContextMenuHandler';

describe('Context menu', () => {
  const a = jest.fn();
  const user = userEvent.setup();
  test('Empty render, click expan', async () => {
    render(
      <ContextMenuHandler>
        <ContextMenu
          entries={[{ label: 'Hello', action: a }]}
          visible={true}
          xPos={0}
          yPos={0}
        />
      </ContextMenuHandler>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    const h = screen.getByText('Hello');
    await user.click(h);
    expect(a).toHaveBeenCalled();
  });

  test('Open menu', async () => {
    const a = jest.fn();
    const user = userEvent.setup();
    test('Empty render, click expan', async () => {
      render(
        <ContextMenuHandler>
          <div onContextMenu={() => {}} />
        </ContextMenuHandler>,
      );
      expect(screen.getByText('Hello')).toBeInTheDocument();
      const h = screen.getByText('Hello');
      await user.click(h);
      expect(a).toHaveBeenCalled();
    });
  });
});
