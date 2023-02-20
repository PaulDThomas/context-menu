export interface iMenuItem {
  label: string;
  action?: () => void;
  group?: iMenuItem[];
}
