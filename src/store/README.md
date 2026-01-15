# Redux 配置管理系统（持久化版本）

这个目录包含了使用 Redux Toolkit 和 redux-persist 实现的配置管理系统，支持自动持久化存储。

## 文件结构

- `store.ts` - Redux store 配置（包含持久化配置）
- `configSlice.ts` - 配置状态管理 slice
- `chromeStorage.ts` - Chrome Storage 适配器，用于 redux-persist
- `initConfig.ts` - 初始化配置（已废弃，redux-persist 自动处理）
- `hooks.ts` - 类型化的 Redux hooks

## 持久化存储

使用 `redux-persist` 实现自动持久化：

- **存储引擎**: `chrome.storage.local`（Chrome Extension 环境）
- **降级方案**: `localStorage`（非 Chrome 环境）
- **自动同步**: 配置修改后自动保存到存储
- **自动恢复**: 应用启动时自动从存储中恢复配置

## 使用方法

### 1. 在组件中使用配置

```tsx
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setTheme } from '../store/configSlice';
import dayjs from 'dayjs';

function MyComponent() {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.config.theme);
  const updatedAt = useAppSelector((state) => state.config.updatedAt);

  const toggleTheme = () => {
    dispatch(setTheme(!isDarkMode));
    // updatedAt 会自动更新，配置会自动保存
  };

  return (
    <div>
      <button onClick={toggleTheme}>
        {isDarkMode ? '切换到亮色' : '切换到暗色'}
      </button>
      <p>最后修改: {dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
    </div>
  );
}
```

### 2. 添加新的配置项

在 `configSlice.ts` 中添加新的配置项：

```typescript
import dayjs from 'dayjs';

export interface ConfigState {
  theme: boolean;
  updatedAt: string; // 配置最后修改日期（ISO 8601 格式）
  language: string; // 新增配置项
  fontSize: number; // 新增配置项
}

const initialState: ConfigState = {
  theme: false,
  updatedAt: dayjs().toISOString(),
  language: 'zh-CN', // 默认值
  fontSize: 14, // 默认值
};

// 添加对应的 reducer
const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.theme = action.payload;
      state.updatedAt = dayjs().toISOString(); // 自动更新修改日期
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      state.updatedAt = dayjs().toISOString(); // 自动更新修改日期
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
      state.updatedAt = dayjs().toISOString(); // 自动更新修改日期
    },
    loadConfig: (state, action: PayloadAction<Partial<ConfigState>>) => {
      return { ...state, ...action.payload };
    },
  },
});
```

**注意**：添加新配置项后，redux-persist 会自动处理持久化，无需额外配置。

### 3. 清除持久化数据

```tsx
import { useAppDispatch } from '../store/hooks';
import { persistor } from '../store/store';

function ClearConfigButton() {
  const dispatch = useAppDispatch();

  const handleClear = () => {
    // 清除所有持久化数据
    persistor.purge();
  };

  return <button onClick={handleClear}>清除配置</button>;
}
```

## 工作原理

1. **初始化**：
   - Redux store 创建时，redux-persist 会自动从 `chrome.storage.local` 加载配置
   - `PersistGate` 组件会等待数据加载完成后再渲染子组件

2. **状态更新**：
   - 当配置通过 Redux action 更新时，redux-persist 会自动保存到存储
   - 无需手动调用存储 API

3. **存储结构**：
   - redux-persist 会将整个 state 序列化为 JSON 存储在 `persist:root` 键下
   - 格式：`{ _persist: { version, rehydrated }, config: { theme, updatedAt } }`

4. **双重存储**：
   - `chrome.storage.local`：主要存储（Chrome Extension 环境）
   - `localStorage`：降级方案（非 Chrome 环境）

## 配置字段说明

### updatedAt（修改日期）

- **类型**: `string` (ISO 8601 格式)
- **说明**: 记录配置最后修改的时间
- **自动更新**: 当任何配置项修改时，`updatedAt` 会自动更新为当前时间
- **使用示例**:
  ```tsx
  import dayjs from 'dayjs';
  const updatedAt = useAppSelector((state) => state.config.updatedAt);
  const formattedDate = dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss');
  ```

## 优势

- ✅ 自动持久化：无需手动管理存储
- ✅ 自动恢复：应用启动时自动加载配置
- ✅ 类型安全：完整的 TypeScript 类型支持
- ✅ 易于扩展：添加新配置项无需修改持久化逻辑
- ✅ 零闪烁：HTML 初始化脚本确保主题立即应用
- ✅ Chrome Storage 支持：专为 Chrome Extension 优化
- ✅ 降级方案：非 Chrome 环境自动使用 localStorage

## 迁移说明

如果你之前使用了 `initConfig` 和 `storageMiddleware`：

- ✅ **已移除**: `storageMiddleware`（redux-persist 自动处理）
- ✅ **已移除**: `initConfig` 调用（PersistGate 自动处理）
- ✅ **保留**: HTML 初始化脚本（用于避免白色闪烁）

## 调试

查看持久化数据：

```javascript
// 在 Chrome DevTools Console 中
chrome.storage.local.get('persist:root', (data) => {
  console.log(JSON.parse(data['persist:root']));
});
```
