import React, { useRef, useEffect, useState } from 'react';
import styles from './index.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
  disabled = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  // 通知父组件打开状态变化
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          onChange(options[nextIndex].value);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          onChange(options[prevIndex].value);
        }
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={selectRef}
      className={`${styles.selectWrapper} ${className} ${disabled ? styles.disabled : ''} ${isOpen ? styles.isOpen : ''}`}
      aria-label={ariaLabel}>
      <div
        className={`${styles.select} ${isOpen ? styles.open : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}>
        <span className={styles.selectValue}>{selectedOption?.label || value}</span>
        <svg
          className={`${styles.selectIcon} ${isOpen ? styles.iconRotate : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true">
          <path
            d="M6 9L1 4H11L6 9Z"
            fill="currentColor"
            fillOpacity="0.6"
          />
        </svg>
      </div>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.option} ${
                option.value === value ? styles.selected : ''
              }`}
              onClick={() => handleOptionClick(option.value)}
              role="option"
              aria-selected={option.value === value}>
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
