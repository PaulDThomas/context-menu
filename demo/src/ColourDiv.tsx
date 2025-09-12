import { useState } from "react";
import { menuItems } from "../../__dummy__/mockMenu";
import { ContextMenuHandler } from "../../src/main";

interface ColourDivProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  onSelect?: React.ReactEventHandler<HTMLDivElement>;
  showLowMenu?: boolean;
  children?: React.ReactNode;
  height?: number;
  width?: number;
}

export const ColourDiv = ({
  text,
  onSelect,
  showLowMenu = false,
  children,
  height = 200,
  width = 200,
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
          contentEditable={showLowMenu || rest.contentEditable}
          suppressContentEditableWarning
          style={{
            ...rest.style,
            backgroundColor: colour,
            textAlign: "center",
            verticalAlign: "center",
            height: `${height}px`,
            width: `${width}px`,
          }}
        >
          {text}
          {children}
        </div>
      </ContextMenuHandler>
    </div>
  );
};
