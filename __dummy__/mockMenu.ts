import { IMenuItem } from "components/interface";

export const menuItems = (setColour: (colour: string) => void): IMenuItem[] => {
  return [
    {
      label: "All the reds, click this for Red",
      action: () => setColour("red"),
      group: [
        { label: "Light coral", action: () => setColour("lightcoral") },
        { label: "Pink", action: () => setColour("pink") },
        { label: "Russet", action: () => setColour("russet"), disabled: true },
        { label: "Black", action: () => setColour("black") },
      ],
    },
    { label: "Green", action: () => setColour("green") },
    {
      label: "Blue",
      action: () => setColour("blue"),
      group: [
        { label: "Light blue", action: () => setColour("lightblue") },
        { label: "Cyan", action: () => setColour("cyan") },
        { label: "Dark blue", action: () => setColour("darkblue") },
      ],
    },
    { label: "Yellow", action: () => setColour("yellow") },
    { label: "Tartan", disabled: true },
  ];
};
