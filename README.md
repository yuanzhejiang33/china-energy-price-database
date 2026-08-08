# 中国 LNG 与汽柴油价格数字数据库

面向小规模查询的静态网站：展示上海石油天然气交易中心（SHPGX）发布的全国 LNG 出厂价格、汽油批发价格和柴油批发价格。

## GitHub Pages 发布

将本目录推送至公开仓库 `yuanzhejiang33/china-energy-price-database`，并在仓库 **Settings → Pages** 中把 Source 设为 **GitHub Actions**。发布后网址为：

`https://yuanzhejiang33.github.io/china-energy-price-database/`

`deploy-pages.yml` 会在 `main` 分支更新后构建纯静态站点并发布。站点没有服务端接口或浏览器端密钥。

## 每日自动更新

`update-prices.yml` 会在北京时间 11:00、15:00、19:00 从 SHPGX 的公开接口抓取最新价格，将新增观测写入 `public/data/updates.json`，提交到仓库后重新发布页面。历史数据只在官方实际发布日追加；不会用旧价格填补未发布的日期。

初始历史数据覆盖当前可验证的公开发布日。网页先显示已验证的初始数据，再合并 `updates.json` 中自动积累的数据。

## 数据来源与使用限制

- [中国 LNG 出厂价格（全国）](https://www.shpgx.com/html/qgjg.html)
- [中国汽柴油批发价格](https://www.shpgx.com/html/ChnPetrolPrice.html)

请在公开发布或商业使用前确认 SHPGX 对数据转载和展示的授权范围。

## 本地验证

```bash
pnpm install --frozen-lockfile
GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/china-energy-price-database pnpm build
```

静态输出位于 `out/`。
