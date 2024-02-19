export interface MenuItem {
  label: string | JSX.Element;
  disabled?: boolean;
  action?: (target?: Range | null) => void;
  group?: MenuItem[];
}
