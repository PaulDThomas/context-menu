export interface iMenuItem {
  label: string;
  disabled?: boolean;
  action?: () => void;
  group?: iMenuItem[];
}
