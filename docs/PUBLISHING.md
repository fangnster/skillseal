# 发布 SkillSeal 到 GitHub

独立项目根目录是 `skillseal/`。在这个目录内初始化和发布仓库，避免把上一级输出目录、旧项目或其他资料上传。

公开仓库：[fangnster/skillseal](https://github.com/fangnster/skillseal)。项目简介：

> Encrypted Agent Skill delivery with Solana escrow, permanent version licenses and transparent creator payouts.

建议 topics：`solana`, `anchor`, `agent-skills`, `usdc`, `encryption`, `developer-tools`。这些是项目标签，不代表与相关组织有官方合作。

## 当前仓库准备情况

- 独立源码、JS/Rust 锁文件和 `.env.example`。
- 英文入口 README、中文完整运行手册、架构图和演示脚本。
- 黑客松英文项目描述、演讲结构和待填写材料清单。
- GitHub Actions 配置、贡献指南、安全说明、Bug 和 PR 模板。
- `.gitignore` 排除配置、密钥库、钱包、会话、安装输出和构建产物。
- 用户已授权上传到 `fangnster/skillseal` 公开仓库；源码采用 MIT，赛事为 Crypto World's Fair 2026。

平台源码和仓库内的公开演示示例采用 MIT 许可证；`LICENSE` 已添加。创作者另行发布的付费 Skill 可使用独立的版本许可，公开 MIT 示例不能被宣称为禁止分发。

## 上传前检查

```sh
git status --short
git ls-files
pnpm run format:check
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run demo
```

不要上传 `.env.local`、`.data/`、`*-keypair.json`、下载的 `*-session.json`、钱包导出文件或解密安装后的付费内容。私钥以任意文件名保存时仍需自行检查；`.gitignore` 不能识别所有秘密。公共地址和程序源码里的公钥不是私钥。

GitHub CI 不使用钱包或网络测试币：执行格式检查、TypeScript 测试、独立模拟演示和生产构建，并检查 Rust 格式与库编译。SBF 集成测试的复现命令在中文运行手册中；CI 本身不声称执行公开 Devnet 验收。

## 已发布仓库

2026 年 10 月 9 日，完整源码已上传至 `fangnster/skillseal`。70 个文件的 Git blob 哈希与本地源码逐一核对一致。平台源码和公开示例为 MIT 许可；创始人的照片、简历和视频素材没有上传到代码仓库。

首次完整源码的 [GitHub CI](https://github.com/fangnster/skillseal/actions/runs/37903979497) 已通过：应用格式、类型、测试、独立模拟演示、生产构建，以及 Anchor Rust 格式和库编译。它不等于公开 Devnet 验收。

```sh
git clone https://github.com/fangnster/skillseal.git
cd skillseal
pnpm install --frozen-lockfile
pnpm run demo
```

仓库材料更新后，重新检查 CI 和公开访问。不要添加不存在的部署链接。后续提交不得包含运行时密钥、会话、个人照片或简历。

## 参加黑客松

准备好的 [项目介绍](HACKATHON.md) 与 [演示步骤](DEMO.md) 可作为报名和视频素材。当前赛事是 Crypto World’s Fair 2026。报名草稿已保存英文项目说明、China、Solana、公开仓库链接和标志；尚未最终提交。[新版产品视频](https://youtu.be/fCNz1DUwwtM) 和 [创始人视频](https://youtu.be/R40MxhZ26mo) 已上传 YouTube，均为 Unlisted，可通过链接观看。创始人必填资料仍需补齐。既有工作与开发时间范围须在最终确认时核对。

公开 Devnet 部署仍是下一项技术验收：获得测试 SOL、部署、两位作者批准、真实测试 USDC 购买、恢复与退款。详细状态见 `VALIDATION.md`。

## Final submission restriction

未经所有者明确确认，不得最终提交 Colosseum 项目。提交前须核对并选择用户指定的 `solar` 社区推荐方；它与 Solana 链选项不同。Telegram 仍未提供，不可填写虚构联系账号。

## 网站与独立安装包已发布

公开地址为 [https://fangnster.github.io/skillseal/](https://fangnster.github.io/skillseal/)。GitHub Actions 在应用、发行包安装和合约检查通过后发布 `site-dist` 到 GitHub Pages。0.1.1 安装包包含编译后的 JavaScript 客户端；公开 MIT 示例通过固定 SHA-256 验证。真实 HTTPS 下载、npm 安装、重复安装、防覆盖和本地读取已验证。Render 因要求账户付款信息未创建服务；网站发布没有创建付费资源。持久化付费 API 与公开 Devnet 验收仍待完成。
