import React, { useState } from 'react';
import { useAppDispatch } from '../../../../store/hooks';
import { setLanguage } from '../../../../store';
import Select, { type SelectOption } from '../../../Select';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

interface LanguageSettingProps {
  onSelectOpenChange?: (isOpen: boolean) => void;
}

const LanguageSetting: React.FC<LanguageSettingProps> = ({ onSelectOpenChange }) => {
  const dispatch = useAppDispatch();
  const { t, language } = useI18n();
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // 语言选项
  const languageOptions: SelectOption[] = [
    { value: 'zh-CN', label: t('settings_languageZhCN') },
    { value: 'en-US', label: t('settings_languageEnUS') },
    { value: 'ja-JP', label: t('settings_languageJaJP') },
  ];

  const handleLanguageChange = (lang: string) => {
    dispatch(setLanguage(lang));
  };

  const handleSelectOpenChange = (isOpen: boolean) => {
    setIsSelectOpen(isOpen);
    onSelectOpenChange?.(isOpen);
  };

  // 获取当前语言的显示名称
  const currentLanguageLabel =
    languageOptions.find((opt) => opt.value === language)?.label || language;

  return (
    <div className={`${styles.settingItem} ${styles.settingItemWithSelect} ${isSelectOpen ? styles.selectOpen : ''}`}>
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('settings_language')}</span>
        <span className={styles.settingDescription}>{currentLanguageLabel}</span>
      </label>
      <Select
        value={language}
        onChange={handleLanguageChange}
        options={languageOptions}
        ariaLabel={t('settings_selectLanguage')}
        onOpenChange={handleSelectOpenChange}
      />
    </div>
  );
};

export default LanguageSetting;
