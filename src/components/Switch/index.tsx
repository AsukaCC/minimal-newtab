import React from 'react';
import { useAppSelector } from '../../store/hooks';
import styles from './index.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, ariaLabel }) => {
  const themeColor = useAppSelector((state) => state.config.themeColor);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={styles.switch} aria-label={ariaLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
      />
      <span
        className={styles.slider}
        style={
          checked && themeColor
            ? { backgroundColor: themeColor }
            : undefined
        }
      />
    </label>
  );
};

export default Switch;
