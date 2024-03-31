import { useState } from "react";
import { menuItems } from "../../src/__mocks__/mockMenu";
import { ContextMenuHandler } from "../../src/main";

interface ColourDivProps {
  text: string;
  onSelect?: React.ReactEventHandler<HTMLDivElement>;
  showLowMenu?: boolean;
  lowMenuTarget?: Range | null;
  children?: React.ReactNode;
}

export const ColourDiv = ({
  text,
  onSelect,
  showLowMenu = false,
  lowMenuTarget = null,
  children,
}: ColourDivProps) => {
  const [colour, setColour] = useState<string>("white");

  return (
    <div style={{ margin: "2rem" }}>
      <ContextMenuHandler
        menuItems={menuItems(setColour)}
        showLowMenu={showLowMenu}
        lowMenuTarget={lowMenuTarget}
      >
        <div
          onSelect={onSelect}
          contentEditable={showLowMenu}
          suppressContentEditableWarning={showLowMenu}
          style={{
            backgroundColor: colour,
            textAlign: "center",
            verticalAlign: "center",
            minHeight: "200px",
            minWidth: "200px",
          }}
        >
          {text}
          {children}
        </div>
      </ContextMenuHandler>
    </div>
  );
};
