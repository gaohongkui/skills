# 发布前检查清单 / Pre-publish checklist

> **Applies to every push, every release, every marketplace publish — not just the first one.**
> 每一次 push、发版、上架前都要执行，不只是第一次。

This repository is public and its contents are redistributed far beyond GitHub: the
skills CLI mirrors `SKILL.md`, skills.sh snapshots and audits every file, and agents
paste repo contents into other models' context. **There is no draft state.** Once pushed:

- search engines and vendor mirrors may have cached it within minutes,
- skills.sh stores a content snapshot for audit and diffing,
- forks and clones you do not control already exist,
- `git push --force` deletes your copy, not theirs.

So the check is a gate, not a cleanup step.

```bash
npm run privacy    # automated scan — must exit 0
npm run ci         # validate + generated-files-in-sync + privacy
git diff --cached  # read every added line yourself
git status         # no stray local files
```

The scanner is a safety net for the obvious cases. **It cannot recognize a colleague's
name, an unreleased project codename, or your company's internal wiki URL.** That part is
a human read of the diff, every time.

---

## 1. 个人信息 / Personal data

Check for:

- [ ] 真实姓名（除 LICENSE 的版权署名外）— real names beyond the copyright holder
- [ ] 家庭住址、常用地址、精确位置、通勤路线
- [ ] 个人邮箱、私人手机号、微信/QQ/Telegram 等账号
- [ ] 身份证号、护照号、工号、学号、社保/银行卡号
- [ ] 客户名单、同事姓名、组织架构、花名、OKR 个人部分
- [ ] 聊天记录截图、会议纪要、日历、工单/审批流导出
- [ ] 照片中的面容、工牌、车牌、屏幕内容、门禁二维码
- [ ] 浏览器书签/历史、shell 历史、命令 aliases 中的私人路径
- [ ] 设备指纹：绝对家目录路径（`/Users/<name>/…`、`/home/<name>/`）、主机名、内网 IP、设备 ID

Rule of thumb: if a stranger could use the line to identify, locate, or contact a real
person, it does not go in.

## 2. 密钥与凭据 / Secrets & credentials

- [ ] API keys, access tokens, refresh tokens, OAuth client secrets
- [ ] 密码、口令、PIN、恢复码、MFA 种子
- [ ] 私钥文件（`*.pem`, `*.key`, `id_rsa`, `*.p12`）、证书私钥
- [ ] `.env` 及任何环境变量导出
- [ ] Cookie / session / JWT / 带签名的 URL（S3 presigned、临时下载链接）
- [ ] 数据库连接串、含密码的 DSN、内网 Redis/MQ 地址
- [ ] CI 变量名连同样例值、kubeconfig、云厂商 AK/SK

The scanner masks matches it reports, but do not paste a real key into your terminal
history, an issue, or a chat either. Use `<REDACTED>` in examples, always.

## 3. 内部信息 / Internal-only material

- [ ] 雇主内网域名、主机名、内部服务的 URL、内网文档/wiki 链接
- [ ] 未公开的项目代号、架构图、路线图、未发布的指标或营收数据
- [ ] 内部代码片段、内部仓库路径、内部流程与人名绑定的操作手册
- [ ] 真实环境 ID、租户 ID、业务方名称、线上配置
- [ ] 内部 IM 频道、群名、机器人 token

Test: **would this line look out of place in a competitor's onboarding doc?** If it only
makes sense inside one company, it does not belong in a public repo. Reproduce the
technique, not the internal context.

## 4. 第三方内容 / Third-party material

- [ ] Copied code, docs, images, datasets — license permits redistribution?
- [ ] Screenshots of proprietary UI or paid products
- [ ] Anything marked confidential, internal, or "do not distribute"
- [ ] Fonts, icons, stock images with restrictive licenses

## 5. 仓库卫生 / Repo hygiene

- [ ] `git status` clean of scratch files, local notes, `.env`, `node_modules`
- [ ] No `.DS_Store`, editor configs with personal paths, IDE workspace files
- [ ] No large binaries or datasets (Git history is forever and clones get heavy)
- [ ] Generated files regenerated and committed (`npm run build`)
- [ ] Example data is synthetic, or anonymized beyond re-identification

---

## Running the scan

```bash
npm run privacy              # whole repo
node scripts/check-sensitive.mjs --staged   # only what is staged (pre-commit style)
node scripts/check-sensitive.mjs path/to/dir
```

Exit code `0` means no findings. Exit code `1` lists `file:line:col  rule  masked-match`
and a remediation hint.

### Triage a false positive

Do **not** weaken the rule and do **not** paste the offending string into the allowlist.
Allowlist by *rule and path*, which reveals nothing:

```gitignore
# .privacyignore — one entry per line, "#" comments
rule=home-path  path=docs/examples/**       # illustrative docs path
rule=email      path=skills/*/evals/**      # synthetic fixtures
```

Add extra patterns for your own environment (internal domains, project codenames) in
`.privacy.local.json` — it is gitignored, so the patterns never go public:

```json
{
  "patterns": [
    { "id": "internal-domain", "re": "\b[a-z0-9-]+\\.corp\\.[a-z]+\\b", "why": "internal hosts" }
  ]
}
```

## If something sensitive already slipped through

Order matters. Do not "fix" it by deleting the file in a new commit.

1. **Revoke first.** Rotate the key, expire the token, kill the session. Assume compromise
   the moment it was pushed to a public remote — public repos are scraped within minutes.
2. **Stop the bleed.** Make the repo private if it is not already.
3. **Clean history, not just HEAD.**
   ```bash
   git filter-repo --path path/to/leaky-file.inline --invert-paths
   # or, for a string across history:
   git filter-repo --replace-text <(echo 'literal:SECRET==>REMOVED')
   ```
4. **Force-push and tell collaborators to re-clone** — rewriting history breaks their
   clones, and their old copies still contain the secret.
5. **Record it.** Note the incident, the credential, and the rotation in your own private
   notes — not in this repo.

Rewriting history removes the bytes from *your* remote. It does not un-publish them:
mirrors, forks, caches, and the skills.sh audit snapshot may retain the content.

## If you are not sure

Ask before pushing. One question costs a minute; a leaked credential or a colleague's
name in a public repo costs far more and cannot be taken back.
