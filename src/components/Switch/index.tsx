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

  // 确保 checked 始终是布尔值（防止字符串 "true"/"false"）
  const normalizedChecked = typeof checked === 'boolean' 
    ? checked 
    : checked === 'true' || checked === true;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={styles.switch} aria-label={ariaLabel}>
      <input
        type="checkbox"
        checked={normalizedChecked}
        onChange={handleChange}
      />
      <span
        className={styles.slider}
        style={
          normalizedChecked && themeColor
            ? { backgroundColor: themeColor }
            : undefined
        }
      />
    </label>
  );
};

export default Switch;
