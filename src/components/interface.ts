export interface IMenuItem {
  label: string | React.ReactElement;
  disabled?: boolean;
  action?: (target?: Range | null, reactEvent?: React.MouseEvent) => Promise<void> | void;
  group?: IMenuItem[];
}

export type Effect = "fadeIn" | "fadeOut";
