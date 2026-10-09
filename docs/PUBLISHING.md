# 发布 SkillSeal 到 GitHub

独立项目根目录是 `skillseal/`。在这个目录内初始化和发布仓库，避免把上一级输出目录、旧项目或其他资料上传。

建议仓库名：`skillseal`。项目简介可直接使用：

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

## 创建远程仓库

完成源码许可选择后，可在 GitHub 创建一个空的 `skillseal` 仓库，保留本项目已有的 README 和忽略规则。以下命令需在项目根目录运行，把地址替换为实际账号：

交付的本地目录已初始化 `main`。源码 ZIP 不含 `.git`，从 ZIP 解压时先运行 `git init -b main`。

```sh
# 本地已经初始化 main 分支；先确认 git status 中只有预期文件。
git add .
git commit -m "Initial SkillSeal MVP"
git remote add origin https://github.com/YOUR_ACCOUNT/skillseal.git
git push -u origin main
```

如选择 GitHub CLI，也可使用 `gh repo create` 创建实际仓库，但应先核对登录账号和可见性。此交付没有执行创建远程仓库或 push。

仓库创建后，把真实仓库、演示视频和部署证据链接填入 `docs/HACKATHON.md`。不要添加不存在的部署链接或“CI 已通过”徽章。

## 参加黑客松

准备好的 [项目介绍](HACKATHON.md) 与 [演示步骤](DEMO.md) 可作为报名和视频素材。你选择比赛后，再按其要求调整字段和时长。尤其要核对既有项目、开发时间范围和公开代码要求；这里不预设项目满足某场比赛资格。

公开 Devnet 部署仍是下一项技术验收：获得测试 SOL、部署、两位作者批准、真实测试 USDC 购买、恢复与退款。详细状态见 `VALIDATION.md`。

## Final submission restriction

未经所有者明确确认，不得最终提交 Colosseum 项目。提交前须核对并选择用户指定的 `solar` 社区推荐方；它与 Solana 链选项不同。Telegram 仍未提供，不可填写虚构联系账号。
