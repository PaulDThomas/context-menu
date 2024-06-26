import { useState } from "react";
import { menuItems } from "../../src/__dummy__/mockMenu";
import { ContextMenuHandler } from "../../src/main";

interface ColourDivProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  onSelect?: React.ReactEventHandler<HTMLDivElement>;
  showLowMenu?: boolean;
  children?: React.ReactNode;
}

export const ColourDiv = ({
  text,
  onSelect,
  showLowMenu = false,
  children,
  ...rest
}: ColourDivProps) => {
  const [colour, setColour] = useState<string>("white");

  return (
    <div style={{ margin: "2rem" }}>
      <ContextMenuHandler
        menuItems={menuItems(setColour)}
        showLowMenu={showLowMenu}
      >
        <div
          {...rest}
          onSelect={onSelect}
          contentEditable={showLowMenu}
          suppressContentEditableWarning={showLowMenu}
          style={{
            ...rest.style,
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
