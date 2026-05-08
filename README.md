# TVBOT Desktop / Local (本地化进化树美化与展示工具)

> A blazing-fast, fully-featured local application for phylogenetic tree visualization, annotation, and publication-ready rendering.
> 
> TVBOT 桌面本地版，专为对数据隐私、渲染性能、以及大容量树文件有极高要求的科研工作者打造。告别网页端的上传限制、渲染卡顿和繁琐的操作体验。

## 🌟 核心特色与更新 (Key Features)

### 1. 无限容量与无限保存 (Unlimited Capacity & Persistent Storage)
- **突破上传限制**：本地运行，轻松秒开包含成千上万个叶子节点（leaves）的超大进化树，无惧服务器超时。
- **无限本地保存**：支持将当前的绘制状态和图层数据完整保存为本地 `.json` 文件。随时随地恢复工作区，不再受限于云端存储空间。
- **100% 数据隐私**：所有数据的解析、渲染和导出均在本地设备完成，未发表的科研数据绝不外泄。

### 2. 真正的画布级手动标注体验 (True Canvas Annotation)
- **自由交互式画板**：不仅仅是一个进化树查看器，更是一个真正的绘图画布。你可以像使用设计软件一样，手动对节点、分支和 clade 进行拖拽、标注和自定义修改，指哪打哪。
- **完美的矢量导出**：底层渲染引擎深度重构，确保复杂旋转文本、自定义形状和 bootstrap 图例都能以 100% 的精准度导出为 PDF/SVG 矢量图，直接满足顶级期刊的出版要求。

### 3. 海量小细节与痛点优化 (Detail Optimizations)
- **🔄 多图层/布局间的无缝转换**：支持在不同的树形布局（如 Circle Tree 到 Normal Tree / Unrooted Tree）之间一键自由切换，且**不会丢失**已有的 Layer 数据和自定义标注。
- **🧬 智能 Taxon 自动聚类与折叠**：支持基于导入的分类信息文件（如 Phylum / Family），对相同的 taxon 进行智能识别与自动聚类折叠（Auto-fold）。折叠后的三角形比例加入对数缩放算法，根据 clade 内包含的叶子数量动态调整大小，防止出现大面积重叠覆盖。折叠后还会智能在名字旁显示包含的 branch 数量（例如 `CladeA (42)`）。
- **📊 完美兼容 IQ-TREE 双 Bootstrap 支持率**：彻底修正了 IQ-TREE 输出文件中包含多个支持率（如 `98/100`）时的解析与展示问题。现在系统能精准分离并同时展示 **SH-aLRT support (%)** 与 **ultrafast bootstrap support (%)**，且完美生成图例。
- **🔍 根节点 ID 与复制逻辑修正**：修复了因定根（re-root）操作导致的重复 ID 问题，现在你可以一键精准复制任意分支或节点下的所有 leaf ID。
- **🏷️ ID 智能对齐**：优化了 Newick 树文件与上传表格之间的 ID 匹配逻辑，智能处理隐藏引号、下划线与空格差异。

---

## 🚀 极简跨平台安装与使用 (Installation & Usage)

得益于轻量化的架构设计，本工具无需编译庞大的 Electron 桌面应用外壳，彻底免除操作系统的兼容性烦恼。自带一键启动脚本，自动管理隔离的 Python 运行环境（Venv/Conda），绝不污染系统环境。

**前提条件：** 电脑已安装 `Python 3` 或 `Conda`。

### 方式一：标准启动 (推荐，使用 `venv` + `pip`)

**对于 Mac / Linux 用户:**
1. 在当前文件夹打开终端 (Terminal)。
2. 运行一键启动脚本：
   ```bash
   ./start_mac_linux.sh
   ```

**对于 Windows 用户:**
1. 直接双击运行 `start_windows.bat`。

### 方式二：Conda 环境启动 (适合 Anaconda/Miniconda 用户)
如果在脚本后加上 `--conda` 参数，系统会自动为你创建一个名为 `tvbot-local` 的专属 Conda 环境。

**Mac / Linux:**
```bash
./start_mac_linux.sh --conda
```

**Windows:**
在当前目录打开命令提示符 (CMD) 或 PowerShell，运行：
```cmd
start_windows.bat --conda
```

> **🎉 提示：** 启动成功后，程序会自动在你的默认浏览器中打开 TVBOT 的本地操作界面，即开即用！

---

## 📖 引用与致谢 (Citation)

如果您在研究中使用了本工具，请引用原始 TVBOT 渲染引擎的文章：
*Xie et al., (2023) Nucleic Acids Res doi: 10.1093/nar/gkad359*
