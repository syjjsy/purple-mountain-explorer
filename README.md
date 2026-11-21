# 紫金山 · 掌上山野

[打开 Purple Mountain Explorer](https://syjjsy.github.io/purple-mountain-explorer/)

面向手机的南京紫金山互动旅行图册。用真实 DEM 浏览山脊和景点，在二维地图查看道路、入口和三条步行线路。底部详情提供照片、收藏、步行入口和高德地图链接。

## 本地开发

需要 Node.js 22 或兼容版本。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

构建产物在 `dist/`。Vite 使用相对 base，资源可从 GitHub Pages 仓库子路径和本地预览加载。站内导航使用锚点。

## 数据与设计

- [地形、景点与路线数据](docs/data.md)
- [视觉设计与交互](docs/design.md)
- [照片与数据版权](docs/credits.md)
- [维护、浏览器测试与部署](docs/maintenance.md)

景点地标取自 OpenStreetMap。门票价格、开放安排和临时调整请查看管理局公告。地形和步行时间由数据估算，现场通行以景区标识为准。
