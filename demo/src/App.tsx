import { useState } from 'react';
import { ContextMenuHandler } from '../../src/main';
import { menuItems } from '../../src/__mocks__/mockMenu';

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

export const App = () => {
  return (
    <div className='app-holder'>
      <div className='app-border'>
        <div className='app-inner'>
          <ColourDiv text='Div 1' />
          <ColourDiv text='Div 2' />
          <ColourDiv text='Div 3' />
          <ContextMenuHandler
            style={{ width: '100%', height: '100%', backgroundColor: 'magenta' }}
            menuItems={[
              {
                label: 'Target to console',
                action: (target?: Range | null) => {
                  console.log(target);
                  if (target) {
                    const frag = target.cloneContents();
                    const div = document.createElement('div');
                    div.append(frag);
                    console.log(div.innerHTML);
                  }
                },
              },
            ]}
          >
            <span style={{ backgroundColor: 'white' }}>Hello</span>
            <span style={{ backgroundColor: 'green' }}> Green </span>
            <span style={{ backgroundColor: 'lightblue' }}>Grass</span>
          </ContextMenuHandler>
        </div>
      </div>
    </div>
  );
};

export default App;
