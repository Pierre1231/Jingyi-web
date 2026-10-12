# Liquid Glass 分类导航动效研究

研究时间：2026-09-25。资料仅采用 Apple 官方设计说明、开发文档与 WWDC 视频。以下区分 Apple 明确描述的行为与本站的实现推断；Apple 未公开 Liquid Glass 内部渲染算法或这个悬停效果的精确弹簧参数。

## 苹果明确描述的行为

- Liquid Glass 是覆盖内容的控件与导航层。它在交互时弯曲、聚光、反射并改变形状；状态变化时保持连续的空间关系。[Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)，[Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- 对鼠标或触控板而言，指针本身直接跟随输入。悬停在一组玻璃按钮时，会有一块浮在按钮上方的玻璃高光指示即将按下的目标；目标变化时，这块高光会快速追上指针。它不是指针形状变化。[Elevate the design of your iPad app，Pointer 章节](https://developer.apple.com/videos/play/wwdc2025/208/)
- 苹果的指针设计示例中，高亮圆角矩形会随着指针在标签间移动而滑过去。[Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices)
- 分段控件的选中项在交互时会变化；玻璃材质的加入、移除与形状变化可以通过共享容器和几何匹配来获得连续过渡。Apple 的 `GlassEffectContainer`、`glassEffectID` 和 `matchedGeometry` 是 SwiftUI 中提供此类过渡的 API。[Adopting Liquid Glass，Controls](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)，[Applying Liquid Glass to custom views，Morphing](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views)
- SwiftUI 的持久弹簧在动画目标改变时会保留速度，避免重新开始时动作断裂。[Animation.spring](https://developer.apple.com/documentation/swiftui/animation/spring)
- Liquid Glass 会随输入方式调整动效强度；触控板反馈比直接触摸克制。降低动态效果或透明度的系统设置也会影响视觉呈现。[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)，[Adopting Liquid Glass，Accessibility](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)

## 对本站的具体推断

当前 `js/gallery-nav.js` 只在点击或滚动使分类成为当前分区时移动 `.gallery-nav-lens`。`pointermove` 只把 `--glass-light-x` 直接改成鼠标的横坐标，因此跨越分类时，看得到亮斑跳到新位置，却看不到玻璃片滑过去。这解释了用户看到的现象。

可以保留代表实际浏览分区的选中层和 `aria-current`，另设一块只供鼠标悬停的玻璃高光。指针进入分类时，以该链接的几何位置和宽度作为动画目标；从当前位置与速度继续运动到新目标。快速扫过多个分类时直接重定目标，不重置到起点。离开整组控件时淡出悬停层；键盘焦点仍应有可见反馈。减少动态效果时直接定位。上述 DOM 与动画结构是对 Apple 所描述行为的 Web 近似实现，不等同于 Apple 的私有渲染系统。

不应将悬停立即写入选中状态：苹果说明这层高光表示**即将按下**的目标，而真正选中的分区仍由点击或页面滚动决定。[Elevate the design of your iPad app，Pointer 章节](https://developer.apple.com/videos/play/wwdc2025/208/)

Apple 文档没有给出这个指针高光的具体毫秒数、弹簧刚度、阻尼或拉伸幅度。本站应根据按钮尺寸及用户实际浏览器观感调节这些值，不能称某一组数字为“苹果官方参数”。
