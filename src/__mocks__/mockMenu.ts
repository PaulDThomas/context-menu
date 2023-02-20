import { iMenuItem } from '../components/interface';

export const menuItems = (setColour: (colour: string) => void): iMenuItem[] => {
  return [
    {
      label: 'All the reds, click this for Red',
      action: () => setColour('red'),
      group: [
        { label: 'Light red', action: () => setColour('lightred') },
        { label: 'Pink', action: () => setColour('Pink') },
        { label: 'Russet', action: () => setColour('russet') },
        { label: 'Black', action: () => setColour('black') },
      ],
    },
    { label: 'Green', action: () => setColour('green') },
    {
      label: 'Blue',
      action: () => setColour('blue'),
      group: [
        { label: 'Light blue', action: () => setColour('lightblue') },
        { label: 'Cyan', action: () => setColour('cyan') },
        { label: 'Dark blue', action: () => setColour('darkblue') },
      ],
    },
    { label: 'Yellow', action: () => setColour('yellow') },
  ];
};
