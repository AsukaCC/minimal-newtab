/**
 * Redux Hooks
 * 
 * 使用类型化的 hooks，避免每次使用时都要指定类型
 */

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './types';

/**
 * 类型化的 dispatch hook
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * 类型化的 selector hook
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
