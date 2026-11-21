# 视觉与交互设计

三维沙盘是首页的主要内容。米白保留页面空白，森林绿用于主要操作和景点标记，琥珀色提示山顶和当前路线。标题使用中文宋体衬线，说明采用系统黑体，英文副题使用 Georgia。地图边框与点阵借鉴纸质地图，柔和光照保留山脊、林冠与底座的层次。

手机先读标题再操作沙盘，双手可缩放，单手可点定位、筛选和复位。地图两侧与页面不同区块留出纵向滚动空间。桌面将标题置左，给沙盘更宽的视域。摄影和游览内容从全山视角逐步缩小到景点与可走路径。

两种地图共用筛选、收藏、选中景点、当前线路和地理定位。景点从紧凑抽屉展开为完整详情，支持向上滑动及按钮操作。动态状态和按钮提供中文辅助技术标签，支持键盘操作及系统减少动画偏好。定位仅在点击后请求，用于设备内的定位、附近地点和距离计算。

## 开源项目与实现参考

| 项目 | 采用的思路 |
| --- | --- |
| [monolith-terrain](https://github.com/kaolti/monolith-terrain) | 由 Terrarium 解码真实海拔，借助 Three.js 绘制地形。 |
| [open-3d-terrain-map](https://github.com/kosteck/open-3d-terrain-map) | 将海拔、晕渲与 OSM 信息分层，保持切换时的空间上下文。 |
| [three-map-terrain](https://github.com/whidrubeld/three-map-terrain) | 经纬度共享场景坐标，按设备限制网格密度和覆盖物。 |
| [geoblender](https://github.com/MartinPuli/geoblender) | 在制作层保存地形数据源和比例，导出端保留场景地理范围。 |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | 研究 GeoJSON 路线、道路及地标的图层组织。 |
| [Three.js](https://github.com/mrdoob/three.js) | 使用正交相机、OrbitControls、BufferGeometry 和 InstancedMesh。 |
| [Leaflet](https://leafletjs.com/) | 使用同源晕渲图、Canvas 线矢量和图层管理，保证 WebGL 不可用时二维地图仍可交互。 |

以整块地形、低面数微缩建筑、批次化林冠及按需重绘支撑移动端。常规操作停止后结束动画帧，离屏或页面隐藏时暂停。建筑由小面数几何体构造，地形使用精简的高程数据，因此无需下载 GLB。照片按需加载两档 WebP，运行时地图数据、纹理和照片均从本站加载。
