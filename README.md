# 武汉悟佳教育咨询有限公司官网

官网当前版本的静态网页源码、图片和产品视频。

线上地址：https://wujia-ai.g1304458637.chatgpt.site/

## 项目结构

- `dist/index.html`：页面正文与导航。
- `dist/styles.css`：样式与响应式布局。
- `dist/app.js`：下拉菜单、快速滚动、视频播放与版本切换。
- `dist/content.js`：产品链接与视频配置。
- `dist/assets/`：Logo、背景、视频封面及视频文件。

## 本地预览

这是纯静态网站，无需安装前端依赖或执行构建。

安装 Python 后，在仓库根目录运行：

```sh
python -m http.server 8000 --directory dist
```

然后打开 http://localhost:8000/ 。也可使用任意静态文件服务器预览 `dist` 目录。

## 部署

将 `dist` 目录作为静态网站的发布目录即可。此仓库用于保存与维护官网文件，推送到 GitHub 不会自动更新现有线上网站。

## 维护

修改文字与导航请编辑 `dist/index.html`；修改项目网址及视频信息请编辑 `dist/content.js`。替换图片或视频时，保持文件路径与页面引用一致。

品牌、图片、视频及其他内容的使用权归其各自权利人所有。
