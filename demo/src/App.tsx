import { useState } from 'react';
import { ContextMenuHandler, iMenuItem } from '../../src/main';

export const ColourDiv = ({ text }: { text: string }) => {
  const colours = ['red', 'blue', 'green', 'yellow'];
  const [colour, setColour] = useState<string>('white');
  const menuItems: iMenuItem[] = colours.map((c) => {
    return { label: c, action: () => setColour(c) };
  });

  return (
    <div style={{ margin: '2rem' }}>
      <ContextMenuHandler menuItems={menuItems}>
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

export default () => {
  return (
    <div className='app-holder'>
      <div className='app-border'>
        <div className='app-inner'>
          <ColourDiv text='Div 1' />
          <ColourDiv text='Div 2' />
          <ColourDiv text='Div 3' />
        </div>
      </div>
    </div>
  );
};
