/**
 * UserInfo Store 统一导出入口
 */

export {
  setChecking,
  setLoggedIn,
  setUserEmail,
  setUserName,
  setUserAvatar,
  resetUserInfo,
  setLoadingHistories,
  setHistories,
  addHistory,
  removeHistory,
  updateHistory,
  clearHistories,
} from './userInfoSlice';
export type { UserInfoState } from './userInfoSlice';
export { default as userInfoReducer } from './userInfoSlice';
