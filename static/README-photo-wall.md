# Sean Tucker 风格照片墙实现

这个项目包含了三种实现方式，用于创建类似 Sean Tucker 街头摄影风格的照片墙。

## 文件说明

### 1. `photo-wall-example.html` - 纯 HTML/CSS/JS 实现
- **位置**: `static/photo-wall-example.html`
- **特点**: 
  - 完全独立的 HTML 文件
  - 无需任何构建工具
  - 可直接在浏览器中打开
  - 包含完整的 lightbox 功能

**使用方法**:
```html
<!-- 直接在浏览器中打开 static/photo-wall-example.html -->
<!-- 或将其内容嵌入到你的页面中 -->
```

### 2. `PhotoWall.jsx` + `PhotoWall.css` - React 组件
- **位置**: `static/PhotoWall.jsx`, `static/PhotoWall.css`
- **特点**:
  - React 函数组件
  - 响应式设计
  - 支持 props 配置
  - 包含完整的 TypeScript 类型定义（可扩展）

**使用方法**:
```jsx
import PhotoWall from './PhotoWall';
import './PhotoWall.css';

const photos = [
  { src: '/path/to/image1.jpg', alt: 'Description 1' },
  { src: '/path/to/image2.jpg', alt: 'Description 2' },
  // ...
];

function App() {
  return (
    <PhotoWall
      photos={photos}
      title="STREET"
      description="When the day job gets technical..."
    />
  );
}
```

### 3. `layouts/shortcodes/photo_wall_masonry.html` - Hugo Shortcode
- **位置**: `layouts/shortcodes/photo_wall_masonry.html`
- **特点**:
  - 专为 Hugo/Wowchemy 设计
  - 可在 Markdown 中使用
  - 自动处理图片路径

**使用方法** (在 Hugo Markdown 中):
```markdown
{{< photo_wall_masonry images="photography" >}}
```

## 核心特性

### ✅ 不规则网格布局 (Masonry)
- 使用 CSS Grid 实现
- 保持图片原始比例，不裁剪
- 自动适应不同屏幕尺寸

### ✅ 响应式设计
- **手机** (< 768px): 1 列
- **平板** (768px - 1023px): 2 列
- **桌面** (1024px - 1399px): 3 列
- **大屏** (≥ 1400px): 4 列

### ✅ 视觉效果
- 淡入动画（staggered animation）
- 悬停时轻微上移和阴影
- 图片轻微缩放效果
- 简洁的圆角设计

### ✅ Lightbox 功能
- 点击图片查看大图
- 键盘导航（左右箭头、ESC）
- 平滑的过渡动画
- 响应式设计

### ✅ 性能优化
- 图片懒加载（lazy loading）
- 动画性能优化（使用 transform）
- 响应式调整节流

## 自定义配置

### 修改图片数据

**HTML 版本** (`photo-wall-example.html`):
```javascript
const photos = [
  { src: '/path/to/your/image1.jpg', alt: 'Description' },
  // 添加更多图片...
];
```

**React 版本**:
```jsx
const photos = [
  { src: '/path/to/your/image1.jpg', alt: 'Description' },
  // 添加更多图片...
];

<PhotoWall photos={photos} />
```

### 修改样式

所有样式都在对应的 CSS 文件中：
- HTML 版本: 在 `<style>` 标签中
- React 版本: `PhotoWall.css`
- Hugo 版本: 在 shortcode 的 `<style>` 标签中

### 调整布局参数

**间距**:
```css
.photo-wall-grid {
  gap: 1rem; /* 调整这个值 */
}
```

**列数**:
```css
@media (min-width: 1400px) {
  .photo-wall-grid {
    grid-template-columns: repeat(4, 1fr); /* 修改列数 */
  }
}
```

**悬停效果**:
```css
.photo-item:hover {
  transform: translateY(-4px); /* 调整上移距离 */
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15); /* 调整阴影 */
}
```

## 浏览器支持

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 完全支持
- IE11: ⚠️ 部分支持（需要 polyfill）

## 注意事项

1. **图片路径**: 确保图片路径正确，相对路径或绝对路径都可以
2. **图片尺寸**: 建议使用高质量图片，系统会自动保持原始比例
3. **性能**: 大量图片时建议使用 CDN 和图片优化
4. **SEO**: 记得为每张图片添加有意义的 `alt` 文本

## 示例数据

```javascript
const examplePhotos = [
  { src: '/media/albums/photography/1.JPG', alt: 'Street scene with dramatic lighting' },
  { src: '/media/albums/photography/2.jpg', alt: 'Urban architecture and shadows' },
  { src: '/media/albums/photography/3.jpg', alt: 'City life moments' },
  // ... 更多图片
];
```

## 许可证

MIT License - 可自由使用和修改

