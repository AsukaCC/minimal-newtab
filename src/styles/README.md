# 样式规范文档

## 公共样式库 (`common.css`)

公共样式库提取了项目中重复使用的样式，统一管理，便于维护和复用。

### 命名规范

#### 1. 前缀规范
- `common-` 前缀：表示公共样式类，可在全局使用
- 组件内部样式：使用组件名作为前缀（如 `.modal`, `.button` 等）

#### 2. 按钮样式分类

##### 功能按钮（Action Buttons）
- `.common-button-primary` - 主要功能按钮（确认、提交等）
- `.common-button-danger` - 危险操作按钮（删除、清空等）
- `.common-button-info` - 信息操作按钮（导出、导入等）
- `.common-button-secondary` - 次要功能按钮

##### 特殊按钮（Special Buttons）
- `.common-button-icon` - 图标按钮（仅显示图标）
- `.common-button-close` - 关闭按钮（带旋转动画）
- `.common-button-refresh` - 刷新按钮（带旋转动画）

##### 按钮尺寸（Button Sizes）
- `.common-button-size-small` - 小尺寸（32px 高）
- `.common-button-size-medium` - 中等尺寸（36px 高，默认）
- `.common-button-size-large` - 大尺寸（44px 高）

#### 3. 弹窗样式（Modal）
- `.common-overlay` - 遮罩层
- `.common-overlay-light` - 浅色遮罩层
- `.common-overlay-dark` - 深色遮罩层
- `.common-modal` - 弹窗容器
- `.common-modal-header` - 弹窗头部
- `.common-modal-title` - 弹窗标题
- `.common-modal-content` - 弹窗内容区域

#### 4. 加载状态（Loading）
- `.common-spinner` - 基础加载动画
- `.common-spinner-small` - 小尺寸 Spinner
- `.common-spinner-large` - 大尺寸 Spinner
- `.common-spinner-danger` - 危险按钮的 Spinner
- `.common-spinner-info` - 信息按钮的 Spinner

#### 5. 动画（Animations）
- `@keyframes fadeIn` - 淡入动画
- `@keyframes slideIn` - 滑入动画（从下往上）
- `@keyframes slideDown` - 滑下动画（从上往下）
- `@keyframes spin` - 旋转动画（用于 Spinner）

### 使用示例

#### 在组件中使用公共样式

```tsx
// 方式1：直接在 className 中使用全局类名
<button className="common-button-base common-button-primary common-button-size-medium">
  主要按钮
</button>

// 方式2：使用 Button 组件（推荐）
import Button from '../Button';
<Button variant="primary" size="medium">主要按钮</Button>
```

#### 在 CSS Modules 中引用

```css
/* 组件样式文件中 */
.myButton {
  /* 扩展公共样式 */
  composes: common-button-base from '../../styles/common.css';
  /* 或添加特定样式 */
  /* 自定义样式 */
}
```

### 样式迁移指南

#### 已迁移到 Button 组件的按钮样式
以下按钮样式已统一使用 `Button` 组件，旧样式保留用于向后兼容：

- `syncButton` → `Button variant="primary" size="small"`
- `restoreButton` → `Button variant="primary" size="small"`
- `deleteButton` → `Button variant="danger" size="small"`
- `exportButton` / `importButton` → `Button variant="info" size="small"`
- `clearButton` → `Button variant="danger" size="small"`
- `refreshButton` → `Button variant="primary" iconOnly size="small" className="refreshButton"`
- `closeButton` → `Button variant="primary" iconOnly className="closeButton"`
- `syncHistoryButton` → `Button variant="primary"`

### 响应式设计

所有公共样式都包含响应式设计，在 `@media screen and (max-width: 768px)` 下自动适配移动端。

### 注意事项

1. **CSS 变量**：所有颜色、间距、圆角等都使用 CSS 变量，支持主题切换
2. **动画性能**：使用 `transform` 和 `opacity` 实现动画，避免触发重排
3. **可访问性**：所有交互元素都包含 `:focus-visible` 样式，支持键盘导航
4. **向后兼容**：旧样式保留但标记为已迁移，建议逐步替换为 Button 组件
