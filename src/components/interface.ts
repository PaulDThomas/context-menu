export interface iMenuItem {
  label: string | JSX.Element;
  disabled?: boolean;
  action?: (target?: Range | null) => void;
  group?: iMenuItem[];
}
