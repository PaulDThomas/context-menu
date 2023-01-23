import { useContext, useState } from 'react';
import { useShowMenu } from '../../src/components/useShowMenu';
import { ContextMenuHandler, iMenuItem, MenuContext } from '../../src/main';

export const ColourDiv = ({ text }: { text: string }) => {
  const colours = ['red', 'blue', 'green', 'yellow'];
  const [colour, setColour] = useState<string>('white');
  const menuContext = useContext(MenuContext);
  const menuItems: iMenuItem[] = colours.map((c) => {
    return { label: c, action: () => setColour(c) };
  });

  const showMenu = useShowMenu(menuContext, menuItems);

  return (
    <div
      style={{
        backgroundColor: colour,
        textAlign: 'center',
        verticalAlign: 'center',
        height: '200px',
        margin: '2rem',
        width: '200px',
      }}
      onContextMenu={showMenu}
    >
      {text}
    </div>
  );
};

export default () => {
  return (
    <ContextMenuHandler>
      <div className='app-holder'>
        <div className='app-border'>
          <div className='app-inner'>
            <ColourDiv text='Div 1' />
            <ColourDiv text='Div 2' />
            <ColourDiv text='Div 3' />
          </div>
        </div>
      </div>
    </ContextMenuHandler>
  );
};
