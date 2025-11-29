export interface MenuItem {
  label: string | React.ReactElement;
  disabled?: boolean;
  action?: (target?: Range | null, reactEvent?: React.MouseEvent) => Promise<void> | void;
  group?: MenuItem[];
}

export type Effect = "fadeIn" | "fadeOut";
