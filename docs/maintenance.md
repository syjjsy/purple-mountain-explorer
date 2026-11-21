# 维护与部署

## 更新内容

1. 在 `src/data.ts` 修改景点文案、开放资料或路线说明。
2. 在 `scripts/prepare-map.py` 登记已核验的 OSM 要素和点位角色。大型景区请分别核验展示位置、游客入口与地图导航目的地。
3. 有新路线时，先核验官方开放路径及现场长期管控，再在脚本中添加道路顺序与 OSM 节点切片。运行生成过程并查看 3D 和 2D 叠加效果。
4. 在 `scripts/prepare-photos.py` 登记授权明确的 Commons 文件。运行脚本会生成大、小两版 WebP，并保留作者、原文件网址与许可。
5. 在 `src/data.ts` 更新查阅日期前，复核管理局旅游公告、索道与接驳指南。

## 可重复的数据准备

使用带 Pillow 的 Python 3。OSM XML 保存在工作目录外的临时位置，地图数据可以用公开 OSM API 重新提取。大型或多次提取请采用 OSM 的区域导出方式。

```sh
python3 scripts/prepare-terrain.py
curl -fL 'https://api.openstreetmap.org/api/0.6/map?bbox=118.798,32.036,118.883,32.085' -o /tmp/purple-mountain.osm
python3 scripts/prepare-map.py /tmp/purple-mountain.osm
python3 scripts/prepare-photos.py
```

如果更新 DEM 范围，同步修改 `src/geo.ts` 的边界、采样参考纬度和地图初始范围。栅格读取端检查元数据与文件长度。原 OSM 要素可能被重新编号或拆分，脚本中断时请通过原始地图核对路段再更新编号，不用直线补齐断开的路段。

## 浏览器检查

先启动 `npm run dev -- --port 4182`。用已安装的 Chrome 运行以下命令，或先运行 `npx playwright install chromium` 再使用 Playwright 的 Chromium。

```sh
ATLAS_BROWSER_CHANNEL=chrome npm run test:browser
```

测试覆盖 375×812、390×844、430×932、768×1024 和 1440×900，包含触控旋转与缩放、收藏持久化、地图筛选与切换、路线联动、定位授权和无 WebGL 回退。截图保存到 `qa/`。使用 `ATLAS_TEST_URL` 指定 Pages 地址时，测试直接覆盖生产构建。浏览器模拟和真实设备网络条件可能不同。

## 发布

仓库 Settings → Pages → Source 选择 **GitHub Actions**。推送到 `main` 后，`.github/workflows/pages.yml` 会安装锁定的依赖、检查 TypeScript、构建 Vite 并部署 `dist/`。Actions 中的部署任务包含最终站点地址。

回滚时可将有问题的提交 revert 并推送，Actions 会重新发布。修改仓库名后 Vite 的相对 base 仍指向正确目录。配套资源随 `public/` 发布。
