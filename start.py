#!/usr/bin/env python3
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
REQUIREMENTS = ROOT / "requirements.txt"
SERVER = ROOT / "server.py"
DIST_DIR = ROOT / "src" / "dist"
NODE_MODULES = ROOT / "node_modules"


def run(cmd, cwd=ROOT):
    print(f"[Run] {' '.join(cmd)}")
    subprocess.run(cmd, cwd=str(cwd), check=True)


def ensure_python_version():
    if sys.version_info < (3, 8):
        print("[Error] Python 3.8+ is required.")
        sys.exit(1)


def ensure_venv():
    if not VENV_DIR.exists():
        print("[Setup] Creating virtual environment (.venv)...")
        run([sys.executable, "-m", "venv", str(VENV_DIR)])


def venv_python():
    if platform.system().lower().startswith("win"):
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def ensure_python_deps(py_exec):
    print("[Setup] Installing Python dependencies...")
    run([str(py_exec), "-m", "pip", "install", "--upgrade", "pip"])
    run([str(py_exec), "-m", "pip", "install", "-r", str(REQUIREMENTS)])


def ensure_node_deps_and_build():
    npm = shutil.which("npm")
    if not npm:
        print("[Error] npm not found. Please install Node.js (includes npm).")
        sys.exit(1)

    if not NODE_MODULES.exists():
        print("[Setup] Installing Node.js dependencies...")
        run([npm, "install"])

    def newest_mtime(path: Path, exts=None):
        if not path.exists():
            return 0
        if path.is_file():
            return path.stat().st_mtime
        newest = 0
        for p in path.rglob("*"):
            if not p.is_file():
                continue
            if exts is not None and p.suffix.lower() not in exts:
                continue
            newest = max(newest, p.stat().st_mtime)
        return newest

    src_newest = max(
        newest_mtime(ROOT / "src" / "js", exts={".ts", ".js"}),
        newest_mtime(ROOT / "src" / "css", exts={".css"}),
        newest_mtime(ROOT / "src", exts={".html"}),
    )
    dist_newest = newest_mtime(DIST_DIR)
    need_build = (not DIST_DIR.exists()) or (src_newest > dist_newest)

    if need_build:
        print("[Build] Building frontend assets...")
        run([npm, "run", "build"])
    else:
        print("[Build] Frontend assets are up-to-date. (skip)")


def start_server(py_exec):
    if not SERVER.exists():
        print("[Error] server.py not found.")
        sys.exit(1)
    print("[Start] Launching TVBOT_Desktop at http://127.0.0.1:8000/")
    run([str(py_exec), str(SERVER)])


def main():
    os.chdir(ROOT)
    ensure_python_version()
    created = not VENV_DIR.exists()
    ensure_venv()
    py_exec = venv_python()
    if created:
        ensure_python_deps(py_exec)
    else:
        print("[Setup] Python environment exists. (skip pip install)")
    ensure_node_deps_and_build()
    start_server(py_exec)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        print(f"[Error] Command failed with exit code {exc.returncode}.")
        sys.exit(exc.returncode)
