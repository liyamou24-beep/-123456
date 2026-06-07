# AIMEDINTL 国际远程医疗站点

基于 **Vite + React + TypeScript** 的单页应用（SPA）。生产环境只需 **Nginx（或其它静态 Web 服务器）** 托管构建产物 `dist` 目录，无需长期运行 Node 进程。

本文重点说明：**如何把项目部署到宝塔 Linux 面板**。

### 本站点计划使用的域名

- **正式访问域名**：`https://www.aimedintl.com`
- **DNS**：在域名注册商或阿里云 DNS 中，为 **`www`** 主机记录配置 **A 记录**，指向你 **阿里云 ECS 的公网 IP**（解析生效通常几分钟到几小时不等）。
- **宝塔里添加站点时**：域名填写 `www.aimedintl.com`，网站根目录一般为：

  ```text
  /www/wwwroot/www.aimedintl.com
  ```

  下文凡出现该路径，均表示你的站点根目录；若你在宝塔里改成了别的路径，请以面板显示为准。

- **裸域 `aimedintl.com`（不带 www）**：若也希望访问，可再加一条 **A 记录**（主机记录 `@`）指向同一 IP，并在宝塔 **同一站点**里把域名加上 `aimedintl.com`，或在「重定向」里把裸域 **301** 到 `https://www.aimedintl.com`（二选一策略，避免 SEO 重复内容）。

---

## 新手小白从这里开始

如果你是第一次部署或刚改完代码要上宝塔，**先看这一段**，再按需翻到后面章节看细节。

### 本地预览（不要用 Live Server）

本项目是 **Vite + React**，不能用 VS Code「Open with Live Server」直接打开根目录的 `index.html`，否则会 **白屏**。

在电脑上打开 **终端**（PowerShell / CMD 均可），进入项目目录（有 `package.json` 的那一层），执行：

```bash
npm install
npm run dev
```

浏览器访问终端里显示的地址（一般为 `http://localhost:3000`）。以后改样式、改文案都在这边预览。

### 改代码后如何在宝塔更新上线

线上跑的不是源码，而是 **打包后的静态文件**。每次更新步骤固定三步：

1. 在项目目录执行：**`npm run build`**
2. 电脑上会出现 **`dist`** 文件夹；打开它，**全选里面的所有内容**（`index.html`、`assets` 文件夹等）
3. 登录 **宝塔 → 文件**，进入你的网站根目录（例如 `/www/wwwroot/www.aimedintl.com`），**删除旧的 `index.html` 和 `assets`**（或整体覆盖），把刚才 **`dist` 里的内容** 上传进去

然后浏览器 **强制刷新**（Windows 常用 **Ctrl+F5**）或清空缓存再看；若用了 CDN，要在 CDN 控制台刷新缓存。

**注意**：上传的是 **`dist` 里面的文件**，不要整颗上传一个叫 `dist` 的文件夹套在外面（否则路径多一层，容易白屏）。目录对错示意图见下文小节 **「『对』和『错』的目录结构（一眼看懂）」**。

### 第一次部署到宝塔（最短步骤）

按顺序做即可，详细图解与排错在后面章节。

| 步骤 | 做什么 |
|------|--------|
| 1 | 电脑上：`npm install`，再 `npm run build`，确认生成了 `dist` |
| 2 | 宝塔 **网站 → 添加站点**，填域名，记下 **网站根目录** 路径 |
| 3 | 把 **`dist` 里的全部文件** 上传到该根目录 |
| 4 | 宝塔该站点 **设置 → 配置文件**：在 **`location /`** 里加上 **`try_files $uri $uri/ /index.html;`**（避免刷新子页面 404），保存后 **重载 Nginx** |
| 5 | （推荐）**SSL** 里申请证书并开启 HTTPS |

**必看详解**：下文 **「Nginx 配置要点（必看：避免刷新 404）」**、**「常见问题」**。

### 注册验证码说明（可选）

注册页的验证码：**默认是演示模式**（验证码会在页面上提示，不会真的发到手机/邮箱）。若要接入真实短信或邮件，需要你自己提供后端接口，并在打包前配置环境变量 **`VITE_VERIFICATION_API_URL`**，具体约定见源码 **`src/services/verification.ts`** 文件顶部注释；改完后务必重新 **`npm run build`** 再上传 `dist`。

---

## 目录

0. [新手小白从这里开始](#新手小白从这里开始)（本文新增，建议首读）
1. [部署前你需要知道的事](#部署前你需要知道的事)
2. [方案一：在自己电脑打包后上传（推荐新手）](#方案一在自己电脑打包后上传推荐新手)
3. [方案二：在服务器上用 Node 打包](#方案二在服务器上用-node-打包)
4. [宝塔面板操作步骤（图文逻辑）](#宝塔面板操作步骤图文逻辑)
5. [Nginx 配置要点（必看：避免刷新 404）](#nginx-配置要点必看避免刷新-404)
6. [HTTPS 与域名](#https-与域名)
7. [环境变量与 AI 功能](#环境变量与-ai-功能)
8. [常见问题](#常见问题)
9. [本地开发（可选）](#本地开发可选)

---

## 部署前你需要知道的事

| 项目 | 说明 |
|------|------|
| 服务器系统 | 宝塔多装在 **Linux**（如 CentOS、Ubuntu、Debian）。以下步骤以 Linux + Nginx 为准。 |
| 不需要 | 生产环境 **不必** 安装 PM2 常驻 `npm run dev`；那是开发用的。 |
| 需要 | 最终让网站根目录指向 **`dist` 里的静态文件**（`index.html`、`assets/` 等）。 |
| 路由 | 使用 `react-router-dom`，直接访问或刷新子路径（如 `/admin`）时，必须由 Nginx 回退到 `index.html`，否则会 **404**。 |

---

## 方案一：在自己电脑打包后上传（推荐新手）

适合：本机已能 `npm install` 且 `npm run build` 成功。

### 1. 本地安装依赖并构建

在项目根目录（含 `package.json` 的目录）打开终端：

```bash
npm install
npm run build
```

成功后会出现 **`dist`** 文件夹，里面有 `index.html` 和 `assets` 等。

### 2. 上传到服务器

下面分 **宝塔网页里上传**（最常用）、**压缩包上传**、**FTP** 三种讲清楚。共同点：**最终要让网站根目录里直接出现 `index.html` 和 `assets` 文件夹**，而不是多一层叫 `dist` 的壳子。

#### 先确认：上传到哪里？

1. 浏览器登录 **宝塔面板**（地址一般是 `http://服务器IP:8888` 这类，以你实际为准）。
2. 左侧点 **「网站」**，找到站点 **`www.aimedintl.com`**，点 **「根目录」** 或 **「文件」** 一类按钮，会打开文件管理并停在 **网站根目录**。
3. 路径一般是 **`/www/wwwroot/www.aimedintl.com`**。后面说的「站点根目录」就是指这里。

#### 方式 A：用宝塔「文件」逐文件上传（适合文件不多）

1. 在你 **自己的电脑** 上打开文件夹：`E:\国际远程医疗网站\AIMEDINTL\dist`（路径按你项目实际为准）。
2. 打开 **`dist` 文件夹**，你应该能看到至少：
   - 一个 **`index.html`** 文件  
   - 一个 **`assets`** 文件夹（里面是 `.js`、`.css` 等）
3. 在宝塔 **文件** 里，进入 **`/www/wwwroot/www.aimedintl.com`**。若里面有旧的 `index.html` 或旧 `assets`，可先 **全选删除**（或先备份），避免新旧文件混在一起。
4. **上传 `dist` 里面的内容**，有两种常见操作：
   - **多选上传**：在电脑 `dist` 里按 `Ctrl+A` 全选 **`index.html` 和 `assets` 等所有项**，拖到宝塔网页的文件列表空白处；或点宝塔上方的 **「上传」**，在弹窗里选择这些文件/文件夹。
   - 注意：选中的是 **`dist` 里面的项**，不要选外层的 **`dist` 这个文件夹本身** 再整个上传（见下方「错误示例」）。
5. 等待上传完成。刷新宝塔文件列表，确认 **`index.html` 和 `assets` 与 `www.aimedintl.com` 这一层目录直接并列**，中间没有多一层 `dist`。

#### 方式 B：打成 zip 再上传（文件多、更省事）

1. 在电脑上进入 **`dist` 文件夹内部**（能看到 `index.html` 和 `assets` 的那一层）。
2. **全选** 当前目录下所有内容（`index.html`、`assets` 等），右键 **「发送到」→「压缩(zipped)文件夹」**（Windows），得到例如 **`deploy.zip`**。  
   - 也可以全选后右键用 WinRAR / 7-Zip **「添加到压缩包」**。  
   - 要点：**zip 解压后第一层就是 `index.html` 和 `assets`**，不要在外面再套一层空文件夹名也可以，但解压后结构要对。
3. 宝塔 **文件** → 进入 **`/www/wwwroot/www.aimedintl.com`** → 点 **「上传」**，选 **`deploy.zip`**，上传完成。
4. 在宝塔里对 **`deploy.zip` 右键 → 「解压」**，解压到 **当前目录**（站点根目录）。解压完后 **删除 zip** 省空间。
5. 检查：站点根目录下 **直接** 有 `index.html` 和 `assets`。

#### 方式 C：用 FTP / SFTP（FileZilla、WinSCP 等）

1. 在 FTP 软件里连接到服务器（主机、端口、用户名、密码在宝塔 **「FTP」** 或 **「SFTP」** 说明里查看或自行开通）。
2. 远程路径进入 **`/www/wwwroot/www.aimedintl.com`**（与宝塔网站根目录一致）。
3. 本地侧打开你电脑上的 **`dist` 文件夹内部**，把 **`index.html`** 和 **`assets`**（以及 `dist` 里其它若有的小文件）**全部拖到远程** 该目录。  
   同样：**不要**只拖一个名叫 `dist` 的文件夹过去，除非你愿意改 Nginx 根目录到 `.../dist`（一般不推荐）。

#### 「对」和「错」的目录结构（一眼看懂）

**正确**（用户访问 `https://www.aimedintl.com/` 能打开）：

```text
/www/wwwroot/www.aimedintl.com/
  ├── index.html
  └── assets/
        ├── index-xxxxx.js
        └── index-xxxxx.css
```

**错误**（常见：多了一层 `dist`，网站往往白屏或 404）：

```text
/www/wwwroot/www.aimedintl.com/
  └── dist/
        ├── index.html
        └── assets/
```

若已经误传成上面这种，要么把 **`dist` 里的内容剪切出来** 挪到 `www.aimedintl.com` 这一层，要么在宝塔里把 **网站根目录** 改成 `.../www.aimedintl.com/dist`（不如挪文件干净，一般不推荐改根目录到 `dist`）。

#### 其它方式

- **Git**：代码推到仓库，在服务器上克隆后执行方案二里的 `npm run build`，就不必从本地上传 `dist`。

### 3. 与宝塔网站目录对应关系（重要）

在宝塔里「添加站点」时，会指定一个 **网站根目录**，例如：

```text
/www/wwwroot/www.aimedintl.com
```

你要保证该目录下 **直接** 能看到：

```text
index.html
assets/
```

也就是说：**把 `dist` 解压/上传后的内容与该根目录对齐**。

---

## 方案二：在服务器上用 Node 打包

适合：希望服务器拉代码、一键构建更新。

### 1. 在宝塔安装 Node.js 版本管理器

1. 打开宝塔面板 → **「软件商店」**。
2. 搜索 **「Node 版本管理器」** 或 **「PM2 管理器」**（不同版本宝塔名称可能略有差异）。
3. 安装后，在管理器里安装 **Node.js 18 LTS 或 20 LTS**（与本地开发尽量一致，避免构建差异）。

或在 SSH 终端用 [nvm](https://github.com/nvm-sh/nvm) 自行安装 Node，不在此赘述。

### 2. SSH 进入服务器项目目录

```bash
cd /www/wwwroot/www.aimedintl.com   # 若你把源码放在站点子目录，则 cd 到实际路径
```

建议目录结构示例（二选一思路即可）：

- **A**：源码在 `/www/wwwroot/www.aimedintl.com/src`，构建输出仍到同目录下 `dist`，Nginx 根目录指向 `dist`。
- **B**：源码在 `/www/wwwroot/aimedintl-src`，构建后把 `dist` 内文件 **复制** 到站点根目录。

### 3. 安装依赖并构建

```bash
npm install
npm run build
```

若 `dist` 不在站点根目录，复制：

```bash
# 示例：构建在子目录，再同步到站点根（请按实际路径修改）
cp -r dist/* /www/wwwroot/www.aimedintl.com/
```

之后可在宝塔「计划任务」里写脚本定期 `git pull && npm install && npm run build && cp -r dist/* ...` 实现半自动更新。

---

## 宝塔面板操作步骤（图文逻辑）

以下按典型流程描述，不同版本宝塔菜单位置可能略有不同，但名称类似。

### 1. 安装运行环境

1. **软件商店** → 安装 **Nginx**（若未装）。
2. （可选）若采用方案二，安装 **Node 版本管理器** 并安装 Node。

### 2. 添加网站

1. **网站** → **添加站点**。
2. 填写 **域名**：`www.aimedintl.com`（测试阶段也可临时加服务器公网 IP）。
3. **根目录** 默认多为 `/www/wwwroot/www.aimedintl.com` —— 记住此路径，后面 Nginx 与上传文件都围绕它。
4. **PHP 版本** 选「纯静态」或任意均可（本项目不依赖 PHP）；若只有「静态」站点类型也可选静态。

### 3. 上传或生成 `dist` 内容

按上文 **方案一** 或 **方案二** 使网站根目录下存在 `index.html` 与 `assets`。

### 4. 修改 Nginx（下一步单独讲）

在站点设置里找到 **配置文件**，加入 SPA 所需的 `try_files`。

### 5. 重载 Nginx

保存配置后，在宝塔 **软件商店 → Nginx → 设置** 里 **重载配置**，或在 SSH 执行：

```bash
nginx -t && nginx -s reload
```

---

## Nginx 配置要点（必看：避免刷新 404）

单页应用所有路由都由前端处理，Nginx 必须把「不存在的路径」交给 `index.html`。

在宝塔：**网站** → 你的站点 → **设置** → **配置文件**，你会看到 **一个** `server { ... }` 里有很多 **`location`**，这是正常现象，不必删掉其它块。

### 为什么有很多 `location`？

宝塔生成的配置里，除了 **`location /`**，通常还会有例如：

| 常见块 | 作用 | 你要不要动？ |
|--------|------|----------------|
| `location /` | 网站根路径下的默认请求 | **只改这一块**（或只在这一块里加一行） |
| `location ~ \.php$` | 把 `.php` 交给 PHP 解析 | **不动**（纯静态站点可保留，不影响本前端） |
| `location ~* \.(js|css|...)` | 静态资源缓存等 | **一般不动**；若改坏了可恢复默认 |
| `location ^~ /.well-known/` | SSL 证书校验目录 | **不要删**，否则证书续期可能失败 |
| `location ~ /\.` | 禁止访问隐藏文件 | **不要动** |

其它 `location /api/`、`location /upload/` 等是别的用途；**没有就不用管**。

### 你只需要改哪一个？

在 **`server { ... }`** 里找到 **恰好是「根路径」** 的这一种写法（注意是 **`/`** 后面直接是空格或大括号）：

```nginx
location / {
```

- **要改的是**：上面这个 **`location / { ... }`** 整块里面的内容。  
- **不要**再新建第二个 `location / {`，否则 Nginx 会报 **重复 location** 或行为异常。  
- 形如 **`location /abc/`**、`location ^~ /xxx`、`location ~ \.php$` 的块都不是「根路径主块」，**不要**把它们改成下面的 `try_files` 写法，除非你明确知道在做什么。

### 具体怎么改（两种常见宝塔样式）

**样式 ①：`root` 写在 `location /` 里面**（你 README里的示例属于这种）

把 **`location /`** 这一块改成（`root` 改成你面板里的网站目录）：

```nginx
location / {
    root /www/wwwroot/www.aimedintl.com;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

**样式 ②：`root` 写在 `server` 里**，`location /` 只有几行

若文件上方已有：

```nginx
root /www/wwwroot/www.aimedintl.com;
```

则 **`location /`** 里往往不需要重复写 `root`，只保证 **有** 下面这一行即可（可保留宝塔原有的 `index` 等，把原来的 `try_files` 改掉或补上）：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

若原来类似 **`try_files $uri $uri/ /404.html;`**，请把 **`/404.html`** 改成 **`/index.html`**。

### 必须满足的一行

无论周围有多少个 `location`，**处理浏览器访问页面路径**的那一段 **`location /`** 里，最终要生效的是：

```nginx
try_files $uri $uri/ /index.html;
```

含义：先找真实文件（如 `/assets/xxx.js`），没有则返回 **`index.html`**，交给 React Router。

### 保存前检查

1. 全文搜索 **`location /`**：应只有 **一个** 前缀形式的 **`location / {`**（带正则的 `location ~` 不算）。  
2. SSH 执行 **`nginx -t`**，显示 `syntax is ok` 再 **重载 Nginx**。若报错，把报错行号附近贴出来对照修改（常见是括号不配对或多写了一个 `location /`）。

---

## HTTPS 与域名

1. **网站** → 站点 **设置** → **SSL**。
2. 选择 **Let's Encrypt** 免费证书，勾选域名，申请并开启 **强制 HTTPS**（可选但推荐）。
3. 确保 **`www.aimedintl.com` 的 DNS A 记录** 已指向该服务器公网 IP，且本机可解析（例如在电脑终端执行 `nslookup www.aimedintl.com` 查看是否已是目标 IP），否则 Let's Encrypt 校验会失败。

---

## 环境变量与 AI 功能

本项目在 `vite.config.ts` 里把 **`GEMINI_API_KEY`** 在**构建时**写入前端（`define`）。这意味着：

- 若以后代码里使用 Gemini：**必须在执行 `npm run build` 的环境中** 设置密钥，例如在项目根目录创建 **`.env.production`**：

  ```env
  GEMINI_API_KEY=你的密钥
  ```

  然后再 `npm run build`。不要把密钥提交到 Git 公开仓库。

- **当前若未使用 AI 接口**：可以不配置，站点照常静态访问。

**安全提示**：任何打进前端 JS 的密钥都可能被访问者从网络面板里看到。正式商用 AI 建议走 **自建后端代理**，密钥只放在服务器环境变量中，不要写进浏览器可见的 bundle。

---

## 常见问题

### 1. 首页能打开，一点某个菜单或刷新就变成 404

**原因**：未配置 `try_files` 回退到 `index.html`。  
**处理**：按上文 [Nginx 配置要点](#nginx-配置要点必看避免刷新-404) 修改并重载 Nginx。

### 2. 页面白屏，控制台 404（JS/CSS 加载失败）

**原因**：常见是站点部署在 **子路径**（如 `https://域名.com/aimedintl/`），但 Vite 默认 `base` 为 `/`，资源会从根路径 `/assets/...` 请求。  
**处理**：

1. 在 `vite.config.ts` 的 `defineConfig` 里增加：`base: '/aimedintl/'`（与真实子路径一致，末尾保留 `/`）。
2. 重新 `npm run build`，再上传新的 `dist`。
3. React Router 若使用 `BrowserRouter`，可能还需设置 `basename="/aimedintl"`（需改代码，此处仅作提醒）。

若站点在 **域名根路径**（如 `https://www.aimedintl.com/`），则保持默认 `base: '/'` 即可。

### 3. `npm run build` 报错

在本地或服务器执行：

```bash
npm run lint
```

根据 TypeScript 报错修改代码；或把完整报错贴到 issue / 询问开发者。

### 4. 宝塔「网站」里误开了「防跨站」导致异常

部分面板有 **防跨站攻击（open_basedir）** 等选项，纯静态站点一般可关闭或与运维确认；若仅静态文件仍异常，可检查 Nginx 错误日志：**网站 → 日志**。

### 5. Windows 上 `npm run clean` 失败

`package.json` 里 `clean` 使用 `rm -rf`，在 Windows CMD 中可能不可用。可直接手动删除 `dist` 文件夹，或在 Git Bash 中执行 `npm run clean`。

### 6. 我已经改了代码并上传，网站上还是旧的样子

1. 确认本地执行过 **`npm run build`**，且上传的是 **新生成的 `dist` 里的文件**。  
2. 浏览器 **强制刷新** 或换无痕窗口试一次。  
3. 若服务器前面还有 **CDN / 对象存储**，要到对应控制台 **刷新预热缓存**。

### 7. 用 Live Server 打开 `index.html` 一片空白

参见文档最上方 **「新手小白从这里开始」** 里的 **「本地预览（不要用 Live Server）」**。

---

## 本地开发（可选）

**环境**：安装 [Node.js](https://nodejs.org/)（建议 18+ 或 20+）。

```bash
npm install
npm run dev
```

浏览器访问终端提示的地址（默认可为 `http://localhost:3000`）。  
可选：复制 `.env.example` 为 `.env.local`，填入 `GEMINI_API_KEY`（仅在使用相关功能时需要）。

常用命令：

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 本地预览构建结果（模拟生产） |
| `npm run lint` | TypeScript 检查（不生成文件） |

---

## 项目结构（简要）

| 路径 | 说明 |
|------|------|
| `src/App.tsx` | 主应用与路由、页面主体 |
| `src/data/` | 导航与多语言文案 |
| `src/context/` | 语言与会诊等上下文 |
| `vite.config.ts` | Vite 与构建期环境变量 |
| `dist/` | **`npm run build` 后生成，部署只依赖此目录内容** |

---

## 小结

1. 执行 **`npm run build`** 得到 **`dist`**。  
2. 把 **`dist` 内文件** 放到宝塔站点 **网站根目录**。  
3. 配置 Nginx **`try_files`** 指向 **`/index.html`**，避免前端路由 404。  
4. 在宝塔申请 **SSL**，使用 **HTTPS** 访问。  

按以上步骤即可在宝塔上完成部署。域名已定为 **www.aimedintl.com** 时，重点核对：**DNS → 宝塔站点域名与根目录 → Nginx `try_files` → SSL 勾选域名一致**。
