import { useState } from 'react';
import { menuItems } from '../../src/__mocks__/mockMenu';
import { ContextMenuHandler } from '../../src/main';

export const ColourDiv = ({ text }: { text: string }) => {
  const [colour, setColour] = useState<string>('white');

  return (
    <div style={{ margin: '2rem' }}>
      <ContextMenuHandler menuItems={menuItems(setColour)}>
        <div
          style={{
            backgroundColor: colour,
            textAlign: 'center',
            verticalAlign: 'center',
            height: '200px',
            width: '200px',
          }}
        >
          {text}
        </div>
      </ContextMenuHandler>
    </div>
  );
};
