# 发布流程（svelte-ui-utils）

本仓库通过 git tag 触发 GitHub Actions 的 npm Trusted Publishing（OIDC）发布到公共 npm registry（`registry.npmjs.org`）。以下是 2026-09-23 发布 0.5.0 时实际走通的完整流程。

## 前置条件

- `package.json` 的 `version` 已更新为目标版本（如 `0.5.0`）。
- 破坏性变更已按 `AGENTS.md` 的规则记入 `COMPATIBILITY.md`（release 号、旧行为、新行为、迁移路径四要素）。
- 变更已合入 `main`，且本地 `npm run check`、`npm test`、`npm run package` 全部通过。

## 发布步骤

1. 合并功能分支到 `main`（保持 fast-forward 可追溯）：

   ```bash
   git checkout main
   git merge --ff-only <feature-branch>
   git push origin main
   ```

2. 打带注释的版本 tag 并推送（tag 名必须等于 `v` + `package.json` 的 `version`，CI 会校验，不匹配直接失败）：

   ```bash
   git tag -a v<version> -m "<version>: <一句话摘要（详见 COMPATIBILITY.md）>"
   git push origin v<version>
   ```

3. tag push 触发 `.github/workflows/npm-publish.yml`：`npm ci` → `svelte-check` → `vitest` → 校验 tag 与版本一致 → `prepublishOnly`（svelte-package 构建 dist）→ `npm publish --access public`。发布凭据只来自 runner 的 OIDC 身份（`id-token: write`），仓库与环境**不配置** npm token；npmjs 端按 workflow 文件名 `npm-publish.yml` 配置 Trusted Publishing。

4. 用 `gh run list --limit 3` 或 GitHub Actions 页面确认 `npm publish` run 成功；`gh run view <id> --log` 中应看到 `Publishing to https://registry.npmjs.org with tag latest and public access` 与 `+ @ibobbyts/svelte-ui-utils@<version>`。

## 发布后验证（消费者侧）

- npmjs 传播有数分钟延迟：`npm view @ibobbyts/svelte-ui-utils dist-tags` 出现新版本后才可安装。
- **bun 的包 metadata 缓存不感知新版本**：安装新发布版本若报 `No version matching "<version>" found`，先清缓存再装（`bun pm cache rm` 后重试），与发布本身无关。
- 可选：手动触发 `.github/workflows/bun-consumer-check.yml`（输入刚发布的版本号），在全新 Bun 消费者项目里验证安装。

## 本地联调（未发布验证）

发布前需要用消费方验证未发布改动时，使用 lmdo-website 的 local-ui 联调环境（symlink 本仓库 dist，不升级消费方锁定依赖）：

```bash
npm run package                # 本仓库重建 dist
cd /Users/ibobby/Projects/lmdo-website
docker-compose stop web && scripts/local-ui.sh up   # 联调服务占用 1013
# 验证完成后：scripts/local-ui.sh down && docker-compose up -d web
```

联调只建立验证环境，**不算发布授权**；发布必须走上面的 tag 流程，且一次用户授权对应一次发布。
