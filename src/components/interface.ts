export interface iMenuItem {
  label: string;
  disabled?: boolean;
  action?: (target?: Range | null) => void;
  group?: iMenuItem[];
}
