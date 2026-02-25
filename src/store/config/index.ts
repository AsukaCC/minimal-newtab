/**
 * 配置模块统一导出
 */

export { default as configReducer, generateConfigId } from './configSlice';
export {
  setTheme,
  setChooseEngine,
  setIsDirectLink,
  setThemeColor,
  setLanguage,
  setNavItems,
  setShowNavBar,
  setNavBarThemeColor,
  setNavBarItemGap,
  setNavBarIconSize,
  loadConfig,
  resetConfig,
} from './configSlice';
export type { ConfigState } from './configSlice';
