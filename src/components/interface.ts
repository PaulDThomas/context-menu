export interface MenuItem {
  label: string | JSX.Element;
  disabled?: boolean;
  action?: (target?: Range | null, reactEvent?: React.MouseEvent) => Promise<void> | void;
  group?: MenuItem[];
}

export type Effect = "fadeIn" | "fadeOut";
