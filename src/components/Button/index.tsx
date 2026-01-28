import React, { useMemo, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import styles from './index.module.css';

/**
 * 计算颜色的亮度（相对亮度）
 * 返回值范围：0-1，0 最暗，1 最亮
 */
function getLuminance(hex: string): number {
  // 移除 # 号
  const rgb = hex.replace('#', '');
  
  // 转换为 RGB
  const r = parseInt(rgb.substring(0, 2), 16) / 255;
  const g = parseInt(rgb.substring(2, 4), 16) / 255;
  const b = parseInt(rgb.substring(4, 6), 16) / 255;
  
  // 应用 gamma 校正
  const [rGamma, gGamma, bGamma] = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  // 计算相对亮度
  return 0.2126 * rGamma + 0.7152 * gGamma + 0.0722 * bGamma;
}

/**
 * 根据背景色计算对比度较高的文字颜色
 * 返回 '#ffffff' 或 '#000000'
 */
function getContrastColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor);
  // 如果背景较亮，使用黑色文字；如果背景较暗，使用白色文字
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * 调整颜色亮度（使用 HSL 方式，更自然）
 * @param hex 十六进制颜色值
 * @param amount 调整量，范围 -1 到 1，负数变暗，正数变亮
 */
function adjustBrightness(hex: string, amount: number): string {
  const rgb = hex.replace('#', '');
  const r = parseInt(rgb.substring(0, 2), 16) / 255;
  const g = parseInt(rgb.substring(2, 4), 16) / 255;
  const b = parseInt(rgb.substring(4, 6), 16) / 255;
  
  // 转换为 HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // 调整亮度（变化幅度很小）
  l = Math.max(0, Math.min(1, l + amount));
  
  // 转换回 RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let rNew = 0, gNew = 0, bNew = 0;
  if (h < 1/6) {
    rNew = c; gNew = x; bNew = 0;
  } else if (h < 2/6) {
    rNew = x; gNew = c; bNew = 0;
  } else if (h < 3/6) {
    rNew = 0; gNew = c; bNew = x;
  } else if (h < 4/6) {
    rNew = 0; gNew = x; bNew = c;
  } else if (h < 5/6) {
    rNew = x; gNew = 0; bNew = c;
  } else {
    rNew = c; gNew = 0; bNew = x;
  }
  
  const rFinal = Math.round((rNew + m) * 255);
  const gFinal = Math.round((gNew + m) * 255);
  const bFinal = Math.round((bNew + m) * 255);
  
  return `#${[rFinal, gFinal, bFinal].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮变体
   * - primary: 主要按钮，使用渐变背景
   * - danger: 危险按钮，红色主题
   * - info: 信息按钮，蓝色主题
   */
  variant?: 'primary' | 'danger' | 'info';
  /**
   * 按钮尺寸
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * 是否显示加载状态
   */
  loading?: boolean;
  /**
   * 是否全宽
   */
  fullWidth?: boolean;
  /**
   * 图标（ReactNode）
   */
  icon?: React.ReactNode;
  /**
   * 图标位置
   */
  iconPosition?: 'left' | 'right';
  /**
   * 是否为图标按钮（仅显示图标，圆形或方形）
   */
  iconOnly?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  className,
  children,
  disabled,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const themeColor = useAppSelector((state) => state.config.themeColor);

  // 将主题色和动态 hover 颜色设置为全局 CSS 变量
  useEffect(() => {
    if (themeColor) {
      const textColor = getContrastColor(themeColor);
      const luminance = getLuminance(themeColor);
      
      // 根据亮度动态调整 hover 效果，变化幅度 20%
      // 颜色较深（亮度 < 0.5）时变亮，颜色较浅（亮度 >= 0.5）时变暗
      let hoverColor: string;
      if (luminance < 0.5) {
        // 深色，变亮 20%
        hoverColor = adjustBrightness(themeColor, 0.2);
      } else {
        // 浅色，变暗 20%
        hoverColor = adjustBrightness(themeColor, -0.2);
      }
      
      const hoverTextColor = getContrastColor(hoverColor);
      
      // 计算阴影颜色（基于 themeColor，带透明度）
      const rgb = themeColor.replace('#', '');
      const r = parseInt(rgb.substring(0, 2), 16);
      const g = parseInt(rgb.substring(2, 4), 16);
      const b = parseInt(rgb.substring(4, 6), 16);
      const shadowColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
      const hoverShadowColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
      
      // 设置全局 CSS 变量
      document.documentElement.style.setProperty('--theme-color', themeColor);
      document.documentElement.style.setProperty('--button-primary-bg', themeColor);
      document.documentElement.style.setProperty('--button-primary-text', textColor);
      document.documentElement.style.setProperty('--button-primary-hover-bg', hoverColor);
      document.documentElement.style.setProperty('--button-primary-hover-text', hoverTextColor);
      document.documentElement.style.setProperty('--button-shadow', shadowColor);
      document.documentElement.style.setProperty('--button-hover-shadow', hoverShadowColor);
    }
  }, [themeColor]);

  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // 合并样式（primary 按钮使用 CSS 变量，不需要内联样式）
  const mergedStyle = style;

  // 计算 spinner 的样式（primary 按钮使用 themeColor）
  const spinnerStyle = useMemo(() => {
    if (variant === 'primary' && themeColor && loading) {
      const textColor = getContrastColor(themeColor);
      return {
        borderTopColor: textColor,
      } as React.CSSProperties;
    }
    return undefined;
  }, [variant, themeColor, loading]);

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <span className={styles.spinner} style={spinnerStyle}></span>
          {children && !iconOnly && <span>{children}</span>}
        </>
      );
    }

    // iconOnly 模式：只显示图标
    if (iconOnly) {
      return icon ? <span className={styles.icon}>{icon}</span> : children;
    }

    // 普通模式：显示图标和文字
    if (icon && children) {
      return (
        <>
          {iconPosition === 'left' && <span className={styles.icon}>{icon}</span>}
          {children}
          {iconPosition === 'right' && <span className={styles.icon}>{icon}</span>}
        </>
      );
    }

    if (icon) {
      return <span className={styles.icon}>{icon}</span>;
    }

    return children;
  };

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      style={mergedStyle}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
