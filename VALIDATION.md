# 验证记录

验证日期：2026-10-09。没有使用主网或真实资金。

## SkillSeal 独立项目验证

项目从原实现整理为独立 `skillseal/` 目录；页面、CLI 和 session 下载名称统一为 SkillSeal。运行时配置和密钥没有复制到新项目。

- 从新项目目录使用锁文件独立安装依赖，无需原项目路径。
- 新目录的格式检查、严格类型检查、18 项 TypeScript 测试、独立 70/30 演示和无 `.env.local` 的 Next.js 生产构建通过。
- 新目录的 Rust 格式检查、`cargo check --locked --lib` 和两项编译后 SBF 集成测试通过。合约及集成测试源码与此前已构建的 SBF 实现逐字节相同，本次复用了该 SBF 测试产物。
- 从新源码建立隔离运行副本，初始化、发布示例、HTTP API + CLI 安装、同一买家再次安装通过；新页面品牌与本地模拟标记已在浏览器核对，截图保存为 `docs/assets/marketplace.jpg`。
- 两次 HTTP/CLI 安装后，作者模拟余额仍为 700000/300000；指标为两次完成、一次付款，没有重复分账。新源码压缩包在干净目录解压后，独立依赖安装和无配置演示通过。
- 本地 Git 仓库初始化为 `main`，未创建远程仓库或提交；GitHub CI 配置中的检查命令已在本机执行，远程 Actions 尚未运行。

下面记录的是同一 MVP 的功能验证与公开网络状态，不能将本地验证等同于公开 Devnet 验收。

## 已通过

- TypeScript 严格类型检查。
- 18 项 TypeScript 自动测试：加密认证、sealed box、路径安全、身份签名、未付款拒绝、所有作者批准、不可变版本、恢复与退款、协议账户校验、交易篡改拒绝和费用去重。
- Next.js 生产构建。
- Anchor/Rust 编译及实际 SBF 字节码构建。
- 两项 Solana ProgramTest 集成测试，加载实际 SBF 合约及官方 SPL 程序字节码：
  - 错误发行者、错误分账接收账户被拒绝；第二位作者账户冻结导致第二次 CPI 失败时，第一笔转账和授权状态均回滚；1,000,001 最小单位按 70/30 分为 700,000 和 300,001；永久授权和分账原子提交；重复结算拒绝。
  - 错误 USDC mint、未批准作者、重复发布拒绝；所有作者批准后才允许付款；不足固定价格的付款原子失败；重复付款拒绝；未满 600 秒和非原买家退款拒绝；满 600 秒退款成功。
- 完整本地 HTTP API + CLI 演示：密文先下载、钱包签名、模拟付款、70/30 分账、领取、解密安装；同一钱包重新安装无需再次付款或分账。
- 网页下载包含密文和独立 X25519 私钥的私有 session 文件；付款前领取返回 HTTP 402；模拟结算后，CLI 从该文件成功解密安装，购买页同步显示“授权已生效”。
- 安装后的 `SKILL.md` 可直接本地读取；安装过程没有执行脚本，没有运行时授权回调。
- 源码压缩包在干净目录解压后，初始化和 70/30 示例发布成功；生成的新程序地址与 Rust、Anchor 配置一致。
- 密钥、钱包和数据目录不进入源码压缩包；检查 7 份 Next.js 文件追踪清单，均未包含运行时私有文件。

## 公开 Devnet 状态

公共 RPC 返回正确 Devnet genesis：`EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`。

对项目临时发行者钱包申请免费测试 SOL 时，公共空投接口返回失败，提示可能触发限流。发行者没有可部署的测试 SOL，因此没有部署到公开 Devnet，也没有执行公开 Devnet USDC 的实际购买。浏览器钱包扩展签署真实 Devnet 交易、远程 RPC 最终确认延迟和真实交易费用采集仍需要测试币后验收。

当前预览是明确标注的本地模拟账本，不能将模拟指标视为链上支付完成率或真实费用。README 提供独立干净副本的 Devnet 初始化、部署、作者签名和测试购买命令。合约执行语义已在本机 SBF 集成测试中验证，公开网络端到端验收仍未完成。

## 工具与已知限制

Node.js 24.19.0、pnpm 11.25.0、Next.js 16.4.0、Anchor 0.32.2、Agave 2.3.13、SBF platform-tools 1.53、主机 Rust 1.99.0。JS 依赖和 Rust 依赖均有锁文件。

可选 bigint 原生加速未启用，使用已通过测试的纯 JavaScript 实现。Anchor 旧宏对新 Rust 的 cfg 检查会产生提示，未影响 SBF 执行。程序为 Devnet 内测代码，尚未经过独立合约安全审计。付款后的复制防护、按本地调用计费与主网商业验证不属于本次交付。

## Crypto World's Fair preparation — 2026-10-09

This follow-up distinguishes newly executed checks from the earlier validation record above.

- The logged-in project page confirmed SkillSeal registration, project ID 16413, category AI Platforms / Agents, one team member, and final submission still pending. The project-detail form, media form and founder-profile requirements were read. No online answers were changed.
- The UI is now English, including environment badges, sample metadata and sample license text. `html lang` is `en`.
- Checkout distinguishes payment submission, escrow, grant and refund. It announces a license only for `granted`; funded, refunded and confirmation-pending orders cannot initiate another payment through the current page. Escrow orders retry synchronization; refund availability uses the observed chain expiry, with the server/contract still authoritative.
- **20/20 TypeScript tests passed**, including two new integration regressions: competing settlement leases cannot produce a premature grant message, and expired/refunded escrow cannot unlock or offer duplicate payment.
- Strict TypeScript checking passed. Preparation-copy production build using the supported Webpack option passed. The default **Turbopack production build in the actual SkillSeal project also passed** after applying the reviewed files; it completed compilation, TypeScript validation, static page generation and route optimization.
- The isolated one-command mock demo passed with author amounts 700000 and 300000 base units and zero failures.
- A source-only isolated web copy was initialized and seeded on loopback port 3173. HTTP API + CLI purchase and reinstall passed; the complete Research Brief package was installed without executing scripts. The English marketplace, granted checkout and expired escrow checkout were inspected in Chrome. The expired escrow showed “No license was granted” and the payment control was disabled. The new screenshot is `docs/assets/marketplace-en.png`. These are mock results, not public Devnet evidence.
- English form answers were checked against the observed 500/1000/600-character limits. Logo and separate product/pitch scripts were prepared. No video was recorded or uploaded. No GitHub repository was published.
- Public Devnet funding was retried with a newly generated dedicated test identity. The official RPC airdrop request failed (the CLI reported possible rate limiting); its SOL balance was verified as **0 SOL**. No public program deployment, real wallet-extension purchase or finalized public-chain acceptance is claimed.
- The example's interview notes and reference brief are fictional and hand-written. They are not customer traction, an actual Agent-run benchmark, or proof of willingness to pay.

## October 9 website and standalone installer update

**27/27 TypeScript tests, formatting and strict type checks passed.** The installer no longer requires the server environment file. The distribution build packs only client modules and creates a pinned MIT sample download. Additional tests cover secure origins and recovery files, unsafe order identifiers, size-limited downloads, redirect refusal, actual HTTP sample installation, overwrite refusal and tamper detection. Static project-path support is tested separately from strict paid API origins. Public paid Devnet deployment is still pending; the issuer test wallet has zero SOL and the public faucet again returned a rate limit.

A clean isolated installation of the standalone 0.1.1 package resolves its dependencies without the source checkout. Next.js production build includes the marketplace, installation/creator guides and health endpoint. The [public website](https://fangnster.github.io/skillseal/) is live. [GitHub CI and Pages deployment](https://github.com/fangnster/skillseal/actions/runs/37913825716) passed the application checks, clean packaged-CLI installation, production Next.js build and Anchor Rust checks. The updated [product video](https://youtu.be/fCNz1DUwwtM) shows the public website and HTTPS installation, with separate local-mock labels for payment.

## Public HTTPS acceptance — 2026-10-09T09:57:53.586Z

- Live website, installation commands and relative project-path assets checked in Chrome. Copy control reports success; the project URL is included in the command.
- Downloaded the actual public CLI archive and verified its SHA-256 against the published release metadata: `e5a8bcaafc3a492bc580eab2d67908337b7bbd69498d107c64745287e4f4c9e9`. This is the artifact observed at this acceptance time; later builds publish their own checksum in [release.json](https://fangnster.github.io/skillseal/downloads/release.json).
- Verified the pinned MIT sample hash: `a617bf3a049873a51a38d6620d98efa6a51afc8adeb4179108dbb85bc5e782a7`.
- Installed through standard npm global installation with `--ignore-scripts` and an isolated user-owned prefix. No source checkout or `.env.local` was present. The compiled JavaScript CLI launched successfully.
- Downloaded and installed the sample over public HTTPS into two fresh destinations. Refused an existing destination. Read `SKILL.md` and the four template/reference/example Markdown files locally without a network request.
- This free MIT distribution creates no paid license and requires no wallet. These checks do not imply public Devnet checkout acceptance.


## October 9 — Complete web platform (0.2)

Local source validation: 33 tests pass, including free release author/operator gating, authorized inspection, replay/expiry protection, disabled checkout isolation, signed content digest, storage quota, restart persistence, browser/server AES interoperability and ZIP structure. Existing 70/30 local-mock purchase/recovery/refund tests still pass. TypeScript and a complete Next production build pass.

Actual browser review on an isolated loopback server: restored a dedicated test creator, uploaded fictional SKILL.md, previewed and signed a release, restored the separate reviewer, inspected files, approved the listing, opened the exact version share URL, copied it, downloaded a ZIP and verified its contents. The standalone compiled CLI installed that same browser-published release without a wallet. A separate clean package installation verifies CLI help, MIT sample delivery and overwrite refusal. These are local product tests, not public Devnet or Alibaba Cloud production acceptance.

Alibaba Cloud deployment assets include persistent Docker hosting, Caddy HTTPS, free catalog startup, and optional prebuilt/shared-proxy modes. Compose syntax is validated locally. Local Docker daemon is unavailable; the Linux image, remote health, HTTPS, restart and backup restoration require acceptance on the selected host. Public GitHub/website synchronization and cloud rollout must be recorded separately when observed.
