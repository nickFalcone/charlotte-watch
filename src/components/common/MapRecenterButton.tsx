import type { ButtonHTMLAttributes } from 'react';
import { MapRecenterButtonBase, MapRecenterButtonIcon } from './MapRecenterButton.styles';
import resetIcon from '../../assets/icons/reset.svg';

export interface MapRecenterButtonProps extends Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'title'
> {
  /** Accessible label for the button (default: "Recenter") */
  'aria-label'?: string;
}

export function MapRecenterButton({
  onClick,
  title = 'Recenter',
  'aria-label': ariaLabel = 'Recenter',
}: MapRecenterButtonProps) {
  return (
    <MapRecenterButtonBase onClick={onClick} title={title} aria-label={ariaLabel} type="button">
      <MapRecenterButtonIcon src={resetIcon} alt="" aria-hidden />
    </MapRecenterButtonBase>
  );
}
