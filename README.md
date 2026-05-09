# TVBOT Desktop

A high-performance, local application for phylogenetic tree visualization, annotation, and publication-ready rendering. 

Designed for researchers who require data privacy, fast rendering of massive datasets, and advanced manual annotation capabilities without the constraints of web-based tools.

## Version

Current local release: **v1.0.0**

## Key Features

**Performance & Privacy**
- **Unlimited Capacity:** Render massive phylogenetic trees locally without server timeout restrictions.
- **Persistent Workspace:** Save drawing states and layer data as local `.json` files to resume work anytime.
- **100% Data Privacy:** All data parsing, rendering, and exporting remain completely offline on your device.

**Advanced Annotation Engine**
- **Interactive Canvas:** Manually drag, annotate, and customize nodes, branches, and clades freely.
- **Vector Export:** Deeply refactored rendering engine ensures that complex rotated text, custom shapes, and bootstrap legends are exported flawlessly as PDF/SVG for journal publication.

**Workflow Enhancements**
- **Seamless Layout Transitions:** Switch between Circular, Normal, and Unrooted layouts without losing layer data or annotations.
- **Smart Taxon Auto-folding:** Automatically cluster and fold identical taxa based on imported classification files (e.g., Phylum, Family). Triangle sizes scale logarithmically to prevent overlap, displaying branch counts dynamically (e.g., `CladeA (42)`).
- **IQ-TREE Dual Bootstrap Support:** Accurately separates and displays both `SH-aLRT` and `ultrafast bootstrap` support values with auto-generated legends.
- **Robust ID Alignment:** Intelligently matches Newick tree IDs with uploaded tables, handling hidden quotes, underscores, and spaces.

## Installation & Usage

TVBOT Desktop uses a lightweight architecture that requires no heavy Electron wrappers. It automatically manages its own Python environment (`venv` or `conda`) without polluting your system.

**Requirements:** `Python 3` or `Conda` installed on your machine.

### Quick Start (venv)

**Mac / Linux:**
```bash
./start_mac_linux.sh
```

**Windows:**
Double-click `start_windows.bat`.

### Conda Start (Optional)

If you prefer using Anaconda/Miniconda, you can append the `--conda` flag to create an isolated `tvbot-local` environment.

**Mac / Linux:**
```bash
./start_mac_linux.sh --conda
```

**Windows:**
Run in Command Prompt or PowerShell:
```cmd
start_windows.bat --conda
```

*The application will automatically launch in your default web browser.*

## Citation

If you use this tool in your research, please cite this repo as well as the original TVBOT rendering engine:
*Xie et al., (2023) Nucleic Acids Res doi: 10.1093/nar/gkad359*
