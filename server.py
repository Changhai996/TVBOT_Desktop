from flask import Flask, send_from_directory, request, jsonify, render_template_string, send_file, Response
from flask_cors import CORS
import os
import json
import time
import secrets
import logging
import re
from datetime import datetime
import urllib.parse

# Suppress the Flask development server warning
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
import sys
try:
    import flask.cli
    flask.cli.show_server_banner = lambda *args, **kwargs: None
except Exception:
    pass

app = Flask(__name__, static_folder='src')
CORS(app)

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

LAYOUT_STATE_STORE = {}
LAYOUT_STATE_TTL_SECONDS = 60 * 60
PLOT_TYPE_RE = re.compile(r'"plotType"\s*:\s*"([^"]+)"')

@app.after_request
def _no_cache_local_dev(resp):
    try:
        p = request.path or ""
        if p.endswith(".html") or p.endswith(".js") or p.endswith(".css"):
            resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
    except Exception:
        pass
    return resp

def _cleanup_layout_states(now_ts=None):
    now_ts = now_ts if now_ts is not None else time.time()
    to_delete = []
    for token, entry in LAYOUT_STATE_STORE.items():
        ts = entry.get('ts', 0)
        if now_ts - ts > LAYOUT_STATE_TTL_SECONDS:
            to_delete.append(token)
    for token in to_delete:
        LAYOUT_STATE_STORE.pop(token, None)

def _normalize_project_name(name):
    if name is None:
        return None
    s = str(name).strip()
    if s.lower() in ['default', 'default project']:
        return 'default'
    return s

def _is_valid_project_name(name):
    if name is None:
        return False
    s = str(name).strip()
    if not s:
        return False
    if s in ['.', '..']:
        return False
    if s.startswith('.'):
        return False
    if '/' in s or '\\' in s:
        return False
    if '..' in s:
        return False
    if os.path.basename(s) != s:
        return False
    return True

def _read_plot_type_fast(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as fh:
            head = fh.read(32768)
        match = PLOT_TYPE_RE.search(head)
        if match:
            return match.group(1)
    except Exception:
        pass
    return 'normalTree'

def _build_tree_entry(file_path, project_id, tree_name):
    mtime = os.path.getmtime(file_path)
    formatted_time = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
    return {
        "treeName": tree_name,
        "projectId": project_id,
        "mtime": mtime,
        "time_str": formatted_time,
        "plotType": _read_plot_type_fast(file_path)
    }

@app.route('/ChiPlot/countUserVisit')
def count_user_visit():
    return jsonify({"success": True})

@app.route('/ChiPlot/uploadUserData', methods=['POST'])
def upload_user_data():
    return jsonify({"success": True})

@app.route('/tvbot/saveOriginalJsonData', methods=['POST'])
def save_original_json_data():
    try:
        data = request.json
        tree_name = data.get('treeName', 'unnamed_tree')
        project_id = _normalize_project_name(data.get('projectId', 'default'))
        if project_id is None:
            project_id = 'default'
        if not _is_valid_project_name(project_id):
            return jsonify({"success": False, "error": "Invalid project name"}), 400
        tree_name = os.path.basename(str(tree_name).strip())
        if not tree_name or tree_name in ['.', '..'] or tree_name.startswith('.'):
            return jsonify({"success": False, "error": "Invalid file name"}), 400
        json_data_raw = data.get('jsonData')
        
        # Determine the target folder (project)
        project_dir = os.path.join(DATA_DIR, project_id)
        if not os.path.exists(project_dir):
            os.makedirs(project_dir)
            
        # In case jsonData is double-encoded
        if isinstance(json_data_raw, str):
            try:
                json_data = json.loads(json_data_raw)
            except:
                json_data = json_data_raw
        else:
            json_data = json_data_raw
            
        if not tree_name.endswith('.json'):
            filename = tree_name + '.json'
        else:
            filename = tree_name
            
        file_path = os.path.join(project_dir, filename)
        
        with open(file_path, 'w') as f:
            json.dump(json_data, f, indent=2)
        
        return jsonify({"success": True, "message": "Saved successfully", "treeName": tree_name, "projectId": project_id})
    except Exception as e:
        print(f"Error saving tree: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/tvbot/getTVBOTToken')
def get_tvbot_token():
    return jsonify({"token": "local-token", "username": "local-user"})

@app.route('/tvbot/getTreeList')
def get_tree_list():
    projects = []
    trees = []
    
    # Always include a 'default' project
    projects.append({"projectId": "default", "projectName": "Default Project", "username": "local-user"})
    
    if os.path.exists(DATA_DIR):
        # Scan subdirectories for projects
        for entry in os.scandir(DATA_DIR):
            if entry.is_dir():
                project_name = entry.name
                if project_name.lower() == 'default':
                    for f in os.listdir(entry.path):
                        if f.endswith('.json'):
                            full_path = os.path.join(entry.path, f)
                            trees.append(
                                _build_tree_entry(
                                    full_path,
                                    "default",
                                    f.replace('.json', '')
                                )
                            )
                    continue
                
                projects.append({"projectId": project_name, "projectName": project_name, "username": "local-user"})
                
                for f in os.listdir(entry.path):
                    if f.endswith('.json'):
                        full_path = os.path.join(entry.path, f)
                        trees.append(
                            _build_tree_entry(
                                full_path,
                                project_name,
                                f.replace('.json', '')
                            )
                        )
            elif entry.is_file() and entry.name.endswith('.json'):
                full_path = entry.path
                trees.append(
                    _build_tree_entry(
                        full_path,
                        "default",
                        entry.name.replace('.json', '')
                    )
                )
            
    return jsonify({
        "projectList": projects,
        "treeList": trees
    })

@app.route('/ChiPlot/getUserFigureData')
def get_user_figure_data():
    return jsonify({})

# Serve static files from 'src'
@app.route('/static/<path:filename>')
def serve_static(filename):
    # Mapping logic for various static file structures
    
    # 1. Handle /static/xiaochiPlot/minJS/ -> src/js/
    if filename.startswith('xiaochiPlot/minJS/'):
        return send_from_directory(os.path.join(app.static_folder, 'js'), filename.replace('xiaochiPlot/minJS/', ''))
    
    # 2. Handle /static/xiaochiPlot/js/ -> src/js/
    if filename == 'xiaochiPlot/js/hull/hull.js':
        wrapper = "import '/static/js/hull.js';\nexport const hull = globalThis.hull;\n"
        return Response(wrapper, mimetype='application/javascript')
    if filename.startswith('xiaochiPlot/js/'):
        return send_from_directory(os.path.join(app.static_folder, 'js'), filename.replace('xiaochiPlot/js/', ''))
        
    # 3. Handle /static/css/ -> src/css/
    if filename.startswith('css/'):
        return send_from_directory(os.path.join(app.static_folder, 'css'), filename.replace('css/', ''))
        
    # 4. Handle /static/js/ -> src/js/
    if filename.startswith('js/'):
        return send_from_directory(os.path.join(app.static_folder, 'js'), filename.replace('js/', ''))
        
    # 5. Handle /static/xiaochiPlot/ -> src/ (for icons, etc.)
    if filename.startswith('xiaochiPlot/'):
        return send_from_directory(app.static_folder, filename.replace('xiaochiPlot/', ''))

    # 6. Default: try to serve directly from src/
    if os.path.exists(os.path.join(app.static_folder, filename)):
        return send_from_directory(app.static_folder, filename)

    return "File not found", 404

# Serve HTML files from 'src' root
@app.route('/')
@app.route('/<path:filename>')
def serve_html(filename='tvbot.html'):
    if not filename.endswith('.html'):
        # If it's not an HTML file, try to serve it as a static file from src
        return send_from_directory(app.static_folder, filename)
        
    # Check if the file exists in src/
    if os.path.exists(os.path.join(app.static_folder, filename)):
        try:
            html_path = os.path.join(app.static_folder, filename)
            with open(html_path, 'r', encoding='utf-8') as f:
                html = f.read()
            stamp = 0
            try:
                js_path = os.path.join(app.static_folder, 'dist', 'js', 'smart_tvbot.js')
                if os.path.exists(js_path):
                    stamp = int(os.path.getmtime(js_path))
            except Exception:
                stamp = 0
            if stamp:
                import re
                def _add_v(m):
                    url = m.group(1)
                    quote = m.group(2)
                    if '?' in url:
                        return m.group(0)
                    return f'{url}?v={stamp}{quote}'
                html = re.sub(r'(/static/dist/[^"\']+\.(?:js|css))([\'"])', _add_v, html)
            return Response(html, mimetype='text/html')
        except Exception:
            return send_from_directory(app.static_folder, filename)
    
    # Special case for myTrees.html (we'll provide a local version)
    if filename == 'myTrees.html':
        return render_local_my_trees()
        
    return "File not found", 404

def render_local_my_trees():
    # Group files by project (folder)
    projects = {}
    
    def add_file_to_project(project_name, filename, full_path):
        if project_name not in projects:
            projects[project_name] = []
        
        mtime = os.path.getmtime(full_path)
        formatted_time = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
        
        try:
            with open(full_path, 'r') as jf:
                data = json.load(jf)
                plot_type = data.get('plotType', 'normalTree')
                html_file = f"{plot_type}.html"
                rel_path = os.path.join(project_name, filename) if project_name.lower() != 'default' else filename
                projects[project_name].append({
                    'name': filename, 
                    'rel_path': rel_path,
                    'encoded_rel_path': urllib.parse.quote(rel_path),
                    'html': html_file, 
                    'mtime': mtime, 
                    'time_str': formatted_time
                })
        except:
            rel_path = os.path.join(project_name, filename) if project_name.lower() != 'default' else filename
            projects[project_name].append({
                'name': filename, 
                'rel_path': rel_path,
                'encoded_rel_path': urllib.parse.quote(rel_path),
                'html': 'normalTree.html', 
                'mtime': mtime, 
                'time_str': formatted_time
            })

    # Scan DATA_DIR for ALL folders
    if os.path.exists(DATA_DIR):
        # Always include default project
        projects['default'] = []
        
        # Scan subdirectories
        for entry in os.scandir(DATA_DIR):
            if entry.is_dir():
                project_name = entry.name
                if project_name.lower() == 'default':
                    # Trees in 'default' folder
                    for f in os.listdir(entry.path):
                        if f.endswith('.json'):
                            add_file_to_project('default', f, os.path.join(entry.path, f))
                    continue
                
                if project_name not in projects:
                    projects[project_name] = []
                
                # Scan trees in this project folder
                for f in os.listdir(entry.path):
                    if f.endswith('.json'):
                        add_file_to_project(project_name, f, os.path.join(entry.path, f))
            elif entry.is_file() and entry.name.endswith('.json'):
                # Files directly in DATA_DIR go into 'default'
                add_file_to_project('default', entry.name, entry.path)

    # Sort files within projects
    for p in projects:
        projects[p].sort(key=lambda x: x['name'].lower())

    # Order projects: 'default' first, then others alphabetically
    sorted_project_names = ['default'] + sorted([p for p in projects if p.lower() != 'default'], key=lambda x: x.lower())
    ordered_projects = {p: projects[p] for p in sorted_project_names if p in projects}
    project_names = list(ordered_projects.keys())

    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace | TVBOT_Desktop</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
        <script src="/static/js/jspdf.umd.min.js"></script>
        <script src="/static/js/svg2pdf.umd.min.js"></script>
        <style>
            :root {
                --bg-color: #0b0f19;
                --surface: #141a27;
                --surface-hover: #1c2436;
                --primary: #3b82f6;
                --primary-glow: rgba(59, 130, 246, 0.5);
                --secondary: #10b981;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --border: rgba(255, 255, 255, 0.08);
            }
            body { 
                background-color: var(--bg-color); 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: var(--text-main);
                padding-top: 80px;
                padding-bottom: 40px;
                min-height: 100vh;
            }
            /* Background Glow Effects */
            .bg-glow { position: fixed; top: -20%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%); z-index: -1; pointer-events: none; }
            .bg-glow-right { position: fixed; bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(0,0,0,0) 70%); z-index: -1; pointer-events: none; }
            
            .navbar {
                background: rgba(11, 15, 25, 0.8) !important;
                backdrop-filter: blur(16px);
                border-bottom: 1px solid var(--border);
            }
            .navbar-brand { font-weight: 800; color: #fff !important; }
            .navbar-brand i { color: var(--primary); text-shadow: 0 0 10px var(--primary-glow); }
            .nav-link { color: var(--text-muted) !important; cursor: pointer; transition: color 0.2s; }
            .nav-link:hover { color: #fff !important; }
            
            .container-main { max-width: 1200px; margin: 0 auto; }
            .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
            .page-title { font-weight: 800; font-size: 2rem; margin: 0; background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            
            .action-bar {
                background: var(--surface);
                padding: 1rem 1.5rem;
                border-radius: 16px;
                border: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            
            .btn-custom-primary { background-color: var(--primary); color: white; border: none; }
            .btn-custom-primary:hover { background-color: #2563eb; color: white; box-shadow: 0 0 15px var(--primary-glow); }
            
            .project-card { 
                background: var(--surface);
                border-radius: 16px; 
                border: 1px solid var(--border);
                margin-bottom: 1.5rem;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: transform 0.2s, border-color 0.2s;
            }
            .project-card:hover { border-color: rgba(255,255,255,0.15); }
            .project-header { 
                background: rgba(255,255,255,0.02); 
                padding: 1.2rem 1.5rem; 
                border-bottom: 1px solid var(--border); 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                cursor: pointer; 
                transition: background 0.2s;
            }
            .project-header:hover { background: rgba(255,255,255,0.04); }
            .project-title { font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 10px; color: var(--text-main); }
            .project-title i { color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
            
            .tree-item { 
                padding: 0.8rem 1.5rem; 
                border-bottom: 1px solid rgba(255,255,255,0.03); 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                transition: background 0.2s;
                background: transparent;
                color: var(--text-main);
            }
            .tree-item:hover { background-color: rgba(255,255,255,0.02); }
            .tree-item:last-child { border-bottom: none; }
            .tree-name { font-weight: 600; font-size: 1.05rem; }
            
            .btn-action { padding: 0.35rem 0.75rem; font-size: 0.875rem; border-radius: 6px; font-weight: 500; }
            .btn-action.btn-light { background: rgba(255,255,255,0.05); color: var(--text-main); border: 1px solid var(--border); }
            .btn-action.btn-light:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }
            
            .empty-state { text-align: center; padding: 4rem 2rem; background: var(--surface); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.15); }
            .empty-state i { font-size: 3.5rem; color: var(--text-muted); margin-bottom: 1rem; display: block; }
            
            /* Customizing inputs and selects for dark mode */
            .form-select, .form-control { background-color: rgba(0,0,0,0.2); border: 1px solid var(--border); color: var(--text-main); }
            .form-select:focus, .form-control:focus { background-color: rgba(0,0,0,0.3); border-color: var(--primary); color: #fff; box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.25); }
            .dropdown-menu { background-color: var(--surface-hover); border: 1px solid var(--border); }
            .dropdown-item { color: var(--text-main); }
            .dropdown-item:hover { background-color: var(--primary); color: #fff; }
            
            .text-dark { color: var(--text-main) !important; }
            .bg-light { background-color: rgba(255,255,255,0.03) !important; }
            .badge.bg-light { background-color: rgba(255,255,255,0.1) !important; color: #fff !important; border-color: rgba(255,255,255,0.1) !important; }
            .list-group-item { background: transparent; border-color: var(--border); color: var(--text-muted); }
            
            #batch-status { position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; background: var(--primary); color: white; border-radius: 8px; display: none; z-index: 9999; box-shadow: 0 10px 25px var(--primary-glow); }
        </style>
    </head>
    <body>
        <div class="bg-glow"></div>
        <div class="bg-glow-right"></div>

        <nav class="navbar navbar-expand-lg fixed-top">
            <div class="container">
                <a class="navbar-brand" href="/">
                    <i class="bi bi-diagram-3-fill me-2"></i>TVBOT_Desktop
                </a>
                <div class="d-flex align-items-center gap-3">
                    <a href="/" class="nav-link"><i class="bi bi-house-door me-1"></i><span data-i18n="nav_home">Home</span></a>
                    <a class="nav-link" id="lang-toggle" title="Switch Language">
                        <i class="bi bi-translate fs-5"></i> <span id="lang-label" class="ms-1" style="font-size: 0.9rem;">中文</span>
                    </a>
                </div>
            </div>
        </nav>

        <div class="container-main px-3">
            <div class="page-header">
                <h1 class="page-title" data-i18n="ws_title">My Workspace</h1>
                <button onclick="createNewProject()" class="btn btn-custom-primary px-4">
                    <i class="bi bi-folder-plus me-2"></i> <span data-i18n="ws_new_proj">New Project</span>
                </button>
            </div>

            <div class="action-bar flex-wrap gap-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="selectAll" class="form-check-input mt-0" onchange="toggleSelectAll()">
                        <label for="selectAll" class="fw-semibold text-muted small mb-0" data-i18n="ws_select_all">Select All</label>
                    </div>
                    <div class="vr mx-1" style="background-color: var(--border);"></div>
                    <select id="sortSelect" class="form-select form-select-sm w-auto fw-medium" onchange="sortAllFiles()">
                        <option value="timeDesc" selected data-i18n="ws_sort_newest">Newest First</option>
                        <option value="timeAsc" data-i18n="ws_sort_oldest">Oldest First</option>
                        <option value="nameAsc" data-i18n="ws_sort_az">Name (A-Z)</option>
                        <option value="nameDesc" data-i18n="ws_sort_za">Name (Z-A)</option>
                    </select>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                    <select id="moveTargetProject" class="form-select form-select-sm w-auto">
                        <option value="" selected data-i18n="ws_move_target">Move selected to...</option>
                        {% for p in project_names %}
                            <option value="{{ p }}">{{ 'Default Project' if p == 'default' else p }}</option>
                        {% endfor %}
                    </select>
                    <button onclick="batchMove()" class="btn btn-outline-secondary btn-sm fw-medium text-white border-secondary">
                        <span data-i18n="ws_move_btn">Move</span>
                    </button>
                    <button onclick="batchExport()" class="btn btn-primary btn-sm fw-medium ms-2">
                        <i class="bi bi-file-earmark-pdf me-1"></i> <span data-i18n="ws_export_btn">Batch Export PDF</span>
                    </button>
                </div>
            </div>
            
            <div id="project-list">
                {% if projects %}
                    {% for project_name, trees in projects.items() %}
                    <div class="project-card" data-project="{{ project_name }}">
                        <div class="project-header" onclick="toggleProject('{{ project_name }}')">
                            <div class="project-title">
                                <i class="bi bi-folder-fill"></i>
                                <span class="proj-name-display" data-raw="{{ project_name }}">{{ 'Default Project' if project_name == 'default' else project_name }}</span>
                                <span class="badge bg-secondary bg-opacity-25 text-light rounded-pill fw-normal ms-2">{{ trees|length }}</span>
                            </div>
                            <div class="d-flex align-items-center gap-3" onclick="event.stopPropagation()">
                                <a href="/normalTree.html?projectId={{ project_name }}&autoUpload=1" class="btn btn-sm btn-outline-primary py-0 px-2 text-decoration-none" style="font-size: 0.75rem;">
                                    <i class="bi bi-upload"></i> <span data-i18n="ws_import_tree">Import Tree</span>
                                </a>
                                {% if project_name.lower() != 'default' %}
                                <button onclick="renameProject('{{ project_name }}')" class="btn btn-link text-muted p-0 text-decoration-none" title="Rename">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button onclick="deleteProject('{{ project_name }}')" class="btn btn-link text-danger p-0 text-decoration-none" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                                {% endif %}
                                <i class="bi bi-chevron-right text-muted ms-2" id="icon-{{ project_name }}"></i>
                            </div>
                        </div>
                        <div class="project-body" id="body-{{ project_name }}" style="display: none;">
                            {% if trees %}
                                <div class="list-group list-group-flush border-top border-secondary">
                                    <div class="list-group-item bg-light text-muted small fw-semibold d-flex align-items-center py-2 border-bottom border-secondary" style="font-size: 0.8rem; letter-spacing: 0.5px;">
                                        <div style="width: 40px;" class="text-center">
                                            <input type="checkbox" class="form-check-input mt-0 folder-select-all" data-target="{{ project_name }}" onchange="toggleFolderSelect(this, '{{ project_name }}')">
                                        </div>
                                        <div class="flex-grow-1 cursor-pointer" onclick="sortFolder('{{ project_name }}', 'name')" style="cursor: pointer; user-select: none;"><span data-i18n="ws_col_name">Name</span> <i class="bi bi-arrow-down-up ms-1 opacity-50"></i></div>
                                        <div style="width: 180px;" class="cursor-pointer" onclick="sortFolder('{{ project_name }}', 'time')" style="cursor: pointer; user-select: none;"><span data-i18n="ws_col_date">Date Modified</span> <i class="bi bi-arrow-down-up ms-1 opacity-50"></i></div>
                                        <div style="width: 120px;" class="cursor-pointer" onclick="sortFolder('{{ project_name }}', 'layout')" style="cursor: pointer; user-select: none;"><span data-i18n="ws_col_layout">Layout</span> <i class="bi bi-arrow-down-up ms-1 opacity-50"></i></div>
                                        <div style="width: 260px;" class="text-center" data-i18n="ws_col_actions">Actions</div>
                                    </div>
                                    <div class="folder-items-container" id="items-{{ project_name }}">
                                        {% for file in trees %}
                                        <div class="list-group-item tree-item d-flex align-items-center py-2" data-name="{{ file.name }}" data-time="{{ file.mtime }}" data-html="{{ file.html }}" style="font-size: 0.9rem;">
                                            <div style="width: 40px;" class="text-center">
                                                <input type="checkbox" class="form-check-input tree-checkbox mt-0" data-project="{{ project_name }}" value="{{ file.rel_path }}">
                                            </div>
                                            <div class="flex-grow-1 text-truncate pe-3">
                                                <i class="bi bi-file-earmark-text text-primary me-2"></i>
                                                <span class="tree-name">{{ file.name.replace('.json', '') }}</span>
                                            </div>
                                            <div style="width: 180px;" class="text-muted small">
                                                {{ file.time_str }}
                                            </div>
                                            <div style="width: 120px;" class="text-muted small">
                                                <span class="badge bg-light text-light">{{ file.html.replace('.html', '') }}</span>
                                            </div>
                                            <div style="width: 260px;" class="d-flex gap-1 justify-content-end">
                                                <a href="/{{ file.html }}?originalJsonDataUri=/api/get_tree/{{ file.encoded_rel_path }}&projectId={{ project_name }}&treeTitle={{ file.name.replace('.json', '') }}" class="btn btn-sm btn-custom-primary btn-action py-1 px-2" style="font-size: 0.8rem;" data-i18n="ws_act_open">Open</a>
                                                <button onclick="renameTree('{{ file.rel_path }}')" class="btn btn-sm btn-light btn-action py-1 px-2" style="font-size: 0.8rem;" data-i18n="ws_act_rename">Rename</button>
                                                <button onclick="copyTree('{{ file.rel_path }}','{{ project_name }}','{{ file.name.replace('.json', '') }}')" class="btn btn-sm btn-light btn-action py-1 px-2" style="font-size: 0.8rem;" data-i18n="ws_act_copy">Copy</button>
                                                <div class="dropdown">
                                                    <button class="btn btn-sm btn-light btn-action py-1 px-2 dropdown-toggle" type="button" data-bs-toggle="dropdown" style="font-size: 0.8rem;" data-i18n="ws_act_move">Move</button>
                                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                                        {% for p in project_names %}
                                                            {% if p != project_name %}
                                                                <li><a class="dropdown-item small" href="#" onclick="moveTree('{{ file.rel_path }}', '{{ p }}')">{{ 'Default Project' if p == 'default' else p }}</a></li>
                                                            {% endif %}
                                                        {% endfor %}
                                                    </ul>
                                                </div>
                                                <button onclick="deleteTree('{{ file.rel_path }}')" class="btn btn-sm btn-outline-danger btn-action ms-1 py-1 px-2" style="font-size: 0.8rem;"><i class="bi bi-trash"></i></button>
                                            </div>
                                        </div>
                                        {% endfor %}
                                    </div>
                                </div>
                            {% else %}
                                <div class="p-4 text-center text-muted small bg-light" data-i18n="ws_empty_folder">Folder is empty.</div>
                            {% endif %}
                        </div>
                    </div>
                    {% endfor %}
                {% else %}
                    <div class="empty-state">
                        <i class="bi bi-folder2-open"></i>
                        <h4 class="fw-bold text-main" data-i18n="ws_no_proj">No projects yet</h4>
                        <p class="text-muted" data-i18n="ws_no_proj_desc">Create a new tree from the home page and save it to see it here.</p>
                        <a href="/" class="btn btn-custom-primary mt-2 text-decoration-none" data-i18n="ws_create_tree">Create Tree</a>
                    </div>
                {% endif %}
            </div>
        </div>

        <div id="batch-status">Processing...</div>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        
        <!-- i18n Logic -->
        <script>
            const translations = {
                en: {
                    nav_home: "Home",
                    ws_title: "My Workspace",
                    ws_new_proj: "New Project",
                    ws_select_all: "Select All",
                    ws_sort_newest: "Newest First",
                    ws_sort_oldest: "Oldest First",
                    ws_sort_az: "Name (A-Z)",
                    ws_sort_za: "Name (Z-A)",
                    ws_move_target: "Move selected to...",
                    ws_move_btn: "Move",
                    ws_export_btn: "Batch Export PDF",
                    ws_import_tree: "Import Tree",
                    ws_col_name: "Name",
                    ws_col_date: "Date Modified",
                    ws_col_layout: "Layout Type",
                    ws_col_actions: "Actions",
                    ws_act_open: "Open",
                    ws_act_rename: "Rename",
                    ws_act_copy: "Copy",
                    ws_act_move: "Move",
                    ws_empty_folder: "Folder is empty.",
                    ws_no_proj: "No projects yet",
                    ws_no_proj_desc: "Create a new tree from the home page and save it to see it here.",
                    ws_create_tree: "Create Tree",
                    default_proj: "Default Project"
                },
                zh: {
                    nav_home: "主页",
                    ws_title: "我的工作区",
                    ws_new_proj: "新建项目",
                    ws_select_all: "全选",
                    ws_sort_newest: "最新修改",
                    ws_sort_oldest: "最早修改",
                    ws_sort_az: "名称 (A-Z)",
                    ws_sort_za: "名称 (Z-A)",
                    ws_move_target: "移动选中到...",
                    ws_move_btn: "移动",
                    ws_export_btn: "批量导出 PDF",
                    ws_import_tree: "导入树文件",
                    ws_col_name: "文件名称",
                    ws_col_date: "修改日期",
                    ws_col_layout: "布局类型",
                    ws_col_actions: "操作",
                    ws_act_open: "打开",
                    ws_act_rename: "重命名",
                    ws_act_copy: "复制",
                    ws_act_move: "移动",
                    ws_empty_folder: "文件夹为空。",
                    ws_no_proj: "暂无项目",
                    ws_no_proj_desc: "从主页创建并保存进化树后将显示在这里。",
                    ws_create_tree: "去创建树",
                    default_proj: "默认项目"
                }
            };

            let currentLang = localStorage.getItem('tvbot_lang') || 'en';

            function applyLanguage(lang) {
                document.documentElement.lang = lang;
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[lang] && translations[lang][key]) {
                        el.innerHTML = translations[lang][key];
                    }
                });
                
                document.querySelectorAll('.proj-name-display').forEach(el => {
                    if(el.getAttribute('data-raw') === 'default') {
                        el.innerText = translations[lang]['default_proj'];
                    }
                });

                document.getElementById('lang-label').innerText = lang === 'en' ? '中文' : 'English';
            }

            document.getElementById('lang-toggle').addEventListener('click', () => {
                currentLang = currentLang === 'en' ? 'zh' : 'en';
                localStorage.setItem('tvbot_lang', currentLang);
                applyLanguage(currentLang);
            });

            applyLanguage(currentLang);
        </script>

        <!-- Existing Workspace Logic -->
        <script>
            async function createNewProject() {
                const name = prompt(currentLang === 'en' ? "Enter new project name:" : "请输入新项目名称:");
                if (!name) return;
                try {
                    const res = await fetch('/api/create_project', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectName: name })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert("Error: " + data.error);
                } catch (err) { alert("Failed: " + err.message); }
            }

            async function deleteProject(name) {
                const msg = currentLang === 'en' ? `Delete entire project "${name}" and all its trees?` : `是否删除整个项目 "${name}" 以及其中的所有树文件？`;
                if (confirm(msg)) {
                    try {
                        const res = await fetch('/api/delete_project/' + name, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) location.reload(); else alert("Error: " + data.error);
                    } catch (err) { alert("Failed: " + err.message); }
                }
            }

            async function renameProject(oldName) {
                const promptMsg = currentLang === 'en' ? `Rename project "${oldName}" to:` : `将项目 "${oldName}" 重命名为:`;
                const newName = prompt(promptMsg, oldName);
                if (!newName || newName === oldName) return;
                try {
                    const res = await fetch('/api/rename_project', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ oldName, newName })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert("Error: " + data.error);
                } catch (err) { alert("Failed: " + err.message); }
            }

            function toggleProject(name) {
                const body = document.getElementById('body-' + name);
                const icon = document.getElementById('icon-' + name);
                if (body.style.display === 'none') {
                    body.style.display = 'block';
                    icon.classList.remove('bi-chevron-right');
                    icon.classList.add('bi-chevron-down');
                } else {
                    body.style.display = 'none';
                    icon.classList.remove('bi-chevron-down');
                    icon.classList.add('bi-chevron-right');
                }
            }

            function toggleSelectAll() {
                const isChecked = document.getElementById('selectAll').checked;
                document.querySelectorAll('.tree-checkbox').forEach(cb => { cb.checked = isChecked; });
                document.querySelectorAll('.folder-select-all').forEach(cb => { cb.checked = isChecked; });
            }

            function toggleFolderSelect(checkbox, proj) {
                document.querySelectorAll(`.tree-checkbox[data-project="${proj}"]`).forEach(cb => { cb.checked = checkbox.checked; });
            }

            function getSelectedPaths() {
                const paths = [];
                document.querySelectorAll('.tree-checkbox:checked').forEach(cb => { paths.push(cb.value); });
                return paths;
            }

            async function batchMove() {
                const paths = getSelectedPaths();
                const target = document.getElementById('moveTargetProject').value;
                if (!paths.length) return alert(currentLang === 'en' ? "Select files first" : "请先选择文件");
                if (!target) return alert(currentLang === 'en' ? "Select target project" : "请选择目标项目");
                
                try {
                    const res = await fetch('/api/batch_move', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paths, targetProject: target })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert("Error: " + data.error);
                } catch (err) { alert("Failed: " + err.message); }
            }

            async function renameTree(relPath) {
                const baseName = relPath.split('/').pop().replace('.json', '');
                const promptMsg = currentLang === 'en' ? `Rename "${baseName}" to:` : `将 "${baseName}" 重命名为:`;
                const newName = prompt(promptMsg, baseName);
                if (!newName || newName === baseName) return;
                try {
                    const res = await fetch('/api/rename_tree', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: relPath, newName })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert("Error: " + data.error);
                } catch (err) { alert("Failed: " + err.message); }
            }

            async function copyTree(relPath, project, baseName) {
                const newName = baseName + '_copy';
                try {
                    const res = await fetch('/api/copy_tree', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: relPath, newName, targetProject: project })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert("Error: " + data.error);
                } catch (err) { alert("Failed: " + err.message); }
            }

            async function deleteTree(relPath) {
                const msg = currentLang === 'en' ? `Delete tree file?` : `确认删除该树文件吗？`;
                if (confirm(msg)) {
                    try {
                        const res = await fetch('/api/delete_tree', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paths: [relPath] })
                        });
                        const data = await res.json();
                        if (data.success) location.reload(); else alert("Error: " + data.error);
                    } catch (err) { alert("Failed: " + err.message); }
                }
            }

            async function moveTree(relPath, targetProject) {
                try {
                    const res = await fetch('/api/batch_move', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paths: [relPath], targetProject })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert("Error: " + data.error);
                } catch (err) { alert("Failed: " + err.message); }
            }

            function sortAllFiles() {
                const val = document.getElementById('sortSelect').value;
                document.querySelectorAll('.project-body').forEach(body => {
                    const proj = body.id.replace('body-', '');
                    let field = 'time'; let dir = 'desc';
                    if (val === 'timeAsc') dir = 'asc';
                    else if (val === 'nameAsc') { field = 'name'; dir = 'asc'; }
                    else if (val === 'nameDesc') { field = 'name'; dir = 'desc'; }
                    
                    const container = document.getElementById('items-' + proj);
                    if(!container) return;
                    const items = Array.from(container.children);
                    items.sort((a, b) => {
                        let aVal = a.getAttribute('data-' + field);
                        let bVal = b.getAttribute('data-' + field);
                        if(field === 'time') { aVal = parseFloat(aVal); bVal = parseFloat(bVal); }
                        else { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
                        if (aVal < bVal) return dir === 'asc' ? -1 : 1;
                        if (aVal > bVal) return dir === 'asc' ? 1 : -1;
                        return 0;
                    });
                    items.forEach(item => container.appendChild(item));
                });
            }

            let folderSortDirs = {};
            function sortFolder(proj, field) {
                const container = document.getElementById('items-' + proj);
                if (!container) return;
                const key = proj + '-' + field;
                folderSortDirs[key] = folderSortDirs[key] === 'asc' ? 'desc' : 'asc';
                const dir = folderSortDirs[key];
                
                const items = Array.from(container.children);
                items.sort((a, b) => {
                    let aVal = a.getAttribute('data-' + field);
                    let bVal = b.getAttribute('data-' + field);
                    if(field === 'time') { aVal = parseFloat(aVal); bVal = parseFloat(bVal); }
                    else { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
                    if (aVal < bVal) return dir === 'asc' ? -1 : 1;
                    if (aVal > bVal) return dir === 'asc' ? 1 : -1;
                    return 0;
                });
                items.forEach(item => container.appendChild(item));
            }

            async function batchExport() {
                const paths = getSelectedPaths();
                if (!paths.length) return alert(currentLang === 'en' ? "Select files to export" : "请先选择需要导出的文件");
                
                const statusEl = document.getElementById('batch-status');
                statusEl.style.display = 'block';
                statusEl.innerText = currentLang === 'en' ? `Exporting 0 / ${paths.length}...` : `正在导出 0 / ${paths.length}...`;
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
                let firstPage = true;
                
                for (let i=0; i<paths.length; i++) {
                    statusEl.innerText = currentLang === 'en' ? `Exporting ${i+1} / ${paths.length}...` : `正在导出 ${i+1} / ${paths.length}...`;
                    try {
                        const res = await fetch('/api/get_tree/' + encodeURIComponent(paths[i]));
                        const data = await res.json();
                        const svgStr = data.svgData;
                        if (svgStr) {
                            const parser = new DOMParser();
                            const svgDoc = parser.parseFromString(svgStr, "image/svg+xml");
                            const svgElement = svgDoc.documentElement;
                            if (!firstPage) doc.addPage();
                            
                            const width = parseFloat(svgElement.getAttribute("width")) || 842;
                            const height = parseFloat(svgElement.getAttribute("height")) || 595;
                            doc.setPage(i+1);
                            doc.internal.pageSize.setWidth(width);
                            doc.internal.pageSize.setHeight(height);
                            
                            await doc.svg(svgElement, { x: 0, y: 0, width, height });
                            firstPage = false;
                        }
                    } catch(e) {
                        console.error("Export failed for", paths[i], e);
                    }
                }
                
                if (!firstPage) {
                    doc.save("Batch_Exported_Trees.pdf");
                    statusEl.innerText = currentLang === 'en' ? "Export Complete!" : "导出完成！";
                } else {
                    statusEl.innerText = currentLang === 'en' ? "No valid SVG found." : "未找到有效的SVG图形。";
                }
                setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
            }
        </script>
    </body>
    </html>
    """

    return render_template_string(html, projects=ordered_projects, project_names=project_names)

# API for local data storage
@app.route('/api/create_project', methods=['POST'])
def create_project():
    try:
        data = request.json
        project_name = _normalize_project_name(data.get('projectName') if data else None)
        if not _is_valid_project_name(project_name):
            return jsonify({"success": False, "error": "Project name is required"}), 400
        if project_name == 'default':
            return jsonify({"success": False, "error": "Cannot create the Default project"}), 400
            
        project_dir = os.path.join(DATA_DIR, project_name)
        if os.path.exists(project_dir):
            return jsonify({"success": False, "error": "Project already exists"}), 400
            
        os.makedirs(project_dir)
        return jsonify({"success": True, "message": f"Project '{project_name}' created"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/delete_project/<project_name>', methods=['DELETE'])
def delete_project(project_name):
    try:
        import shutil
        project_name = _normalize_project_name(project_name)
        if not _is_valid_project_name(project_name):
            return jsonify({"success": False, "error": "Invalid project name"}), 400
        if project_name == 'default':
            return jsonify({"success": False, "error": "Cannot delete the Default project"}), 400
        project_dir = os.path.join(DATA_DIR, project_name)
        if os.path.exists(project_dir) and os.path.isdir(project_dir):
            shutil.rmtree(project_dir)
            return jsonify({"success": True, "message": f"Project '{project_name}' deleted"})
        return jsonify({"success": False, "error": "Project not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/rename_project', methods=['POST'])
def rename_project():
    try:
        data = request.json or {}
        old_name = _normalize_project_name(data.get('oldName'))
        new_name = _normalize_project_name(data.get('newName'))
        if not _is_valid_project_name(old_name) or not _is_valid_project_name(new_name):
            return jsonify({"success": False, "error": "Invalid project name"}), 400
        if old_name == 'default' or new_name == 'default':
            return jsonify({"success": False, "error": "Cannot rename the Default project"}), 400
        if old_name == new_name:
            return jsonify({"success": True}), 200

        src_dir = os.path.join(DATA_DIR, old_name)
        dst_dir = os.path.join(DATA_DIR, new_name)
        if not os.path.exists(src_dir) or not os.path.isdir(src_dir):
            return jsonify({"success": False, "error": "Project not found"}), 404
        if os.path.exists(dst_dir):
            return jsonify({"success": False, "error": "Target project already exists"}), 409

        os.rename(src_dir, dst_dir)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/layout_state', methods=['POST'])
def create_layout_state():
    try:
        _cleanup_layout_states()
        payload = request.json
        if payload is None or not isinstance(payload, dict):
            return jsonify({"success": False, "error": "Invalid payload"}), 400
        token = secrets.token_urlsafe(16)
        LAYOUT_STATE_STORE[token] = {"ts": time.time(), "data": payload}
        return jsonify({"success": True, "token": token})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/layout_state/<token>', methods=['GET'])
def get_layout_state(token):
    try:
        _cleanup_layout_states()
        entry = LAYOUT_STATE_STORE.pop(token, None)
        if not entry:
            return jsonify({"success": False, "error": "Not found"}), 404
        data = entry.get('data')
        if data is None:
            return jsonify({"success": False, "error": "Not found"}), 404
        return jsonify(data)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/save_tree', methods=['POST'])
def save_tree():
    try:
        data = request.json
        filename = data.get('filename', 'tree_' + str(int(os.path.getmtime(DATA_DIR))) + '.json')
        if not filename.endswith('.json'):
            filename += '.json'
        
        with open(os.path.join(DATA_DIR, filename), 'w') as f:
            json.dump(data.get('content'), f)
        
        return jsonify({"success": True, "filename": filename})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/get_tree/<path:filename>')
def get_tree(filename):
    try:
        if '/' in filename:
            path = os.path.join(DATA_DIR, filename)
        else:
            path = os.path.join(DATA_DIR, filename)
            if not os.path.exists(path):
                default_path = os.path.join(DATA_DIR, 'default', filename)
                if os.path.exists(default_path):
                    path = default_path
                else:
                    for entry in os.scandir(DATA_DIR):
                        if entry.is_dir():
                            p = os.path.join(entry.path, filename)
                            if os.path.exists(p):
                                path = p
                                break
            
        if not os.path.exists(path):
            return jsonify({"success": False, "error": f"File not found: {filename}"}), 404
            
        with open(path, 'r') as f:
            content = json.load(f)
        
        return jsonify(content)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/delete_tree/<path:filename>', methods=['DELETE'])
def delete_tree(filename):
    try:
        if '/' in filename:
            path = os.path.join(DATA_DIR, filename)
        else:
            path = os.path.join(DATA_DIR, filename)
            if not os.path.exists(path):
                default_path = os.path.join(DATA_DIR, 'default', filename)
                if os.path.exists(default_path):
                    path = default_path
                else:
                    for entry in os.scandir(DATA_DIR):
                        if entry.is_dir():
                            p = os.path.join(entry.path, filename)
                            if os.path.exists(p):
                                path = p
                                break

        if os.path.exists(path):
            os.remove(path)
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "File not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/rename_tree', methods=['POST'])
def rename_tree():
    try:
        data = request.json or {}
        rel_path = data.get('path')
        new_name = data.get('newName')
        if not rel_path or not new_name:
            return jsonify({"success": False, "error": "path and newName are required"}), 400

        new_name_str = str(new_name).strip()
        if not new_name_str:
            return jsonify({"success": False, "error": "Invalid newName"}), 400
        if '/' in new_name_str or '\\' in new_name_str or '..' in new_name_str:
            return jsonify({"success": False, "error": "Invalid newName"}), 400
        if not new_name_str.endswith('.json'):
            new_name_str = new_name_str + '.json'

        if '/' in rel_path:
            src_path = os.path.join(DATA_DIR, rel_path)
        else:
            src_path = os.path.join(DATA_DIR, rel_path)
            if not os.path.exists(src_path):
                default_path = os.path.join(DATA_DIR, 'default', rel_path)
                if os.path.exists(default_path):
                    src_path = default_path
                else:
                    for entry in os.scandir(DATA_DIR):
                        if entry.is_dir():
                            p = os.path.join(entry.path, rel_path)
                            if os.path.exists(p):
                                src_path = p
                                break

        if not os.path.exists(src_path):
            return jsonify({"success": False, "error": "Source file not found"}), 404

        folder = os.path.dirname(src_path)
        dst_path = os.path.join(folder, new_name_str)
        if os.path.exists(dst_path):
            return jsonify({"success": False, "error": "Target filename already exists"}), 409

        os.rename(src_path, dst_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/move_tree', methods=['POST'])
def move_tree():
    try:
        data = request.json or {}
        src = data.get('from')
        to_project = data.get('toProject')
        if not src or not to_project:
            return jsonify({"success": False, "error": "from and toProject are required"}), 400

        to_project_str = _normalize_project_name(to_project)
        if to_project_str is None:
            return jsonify({"success": False, "error": "Invalid target project"}), 400
        if not _is_valid_project_name(to_project_str):
            return jsonify({"success": False, "error": "Invalid target project"}), 400
        if to_project_str.lower() in ['']:
            to_project_str = 'default'

        if '/' in src:
            src_path = os.path.join(DATA_DIR, src)
        else:
            src_path = os.path.join(DATA_DIR, src)
            if not os.path.exists(src_path):
                default_path = os.path.join(DATA_DIR, 'default', src)
                if os.path.exists(default_path):
                    src_path = default_path
                else:
                    for entry in os.scandir(DATA_DIR):
                        if entry.is_dir():
                            p = os.path.join(entry.path, src)
                            if os.path.exists(p):
                                src_path = p
                                break

        if not os.path.exists(src_path):
            return jsonify({"success": False, "error": "Source file not found"}), 404

        filename = os.path.basename(src_path)
        dest_dir = os.path.join(DATA_DIR, to_project_str)
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)

        dest_path = os.path.join(dest_dir, filename)
        if os.path.exists(dest_path):
            return jsonify({"success": False, "error": f"Target already has {filename}"}), 409

        os.replace(src_path, dest_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/move_trees', methods=['POST'])
def move_trees():
    try:
        data = request.json or {}
        files = data.get('files')
        to_project = data.get('toProject')
        if not isinstance(files, list) or not files or not to_project:
            return jsonify({"success": False, "error": "files and toProject are required"}), 400

        to_project_str = _normalize_project_name(to_project)
        if to_project_str is None or not _is_valid_project_name(to_project_str):
            return jsonify({"success": False, "error": "Invalid target project"}), 400
        if to_project_str.strip() == '':
            to_project_str = 'default'

        dest_dir = os.path.join(DATA_DIR, to_project_str)
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)

        moved = []
        failed = []

        for rel in files:
            try:
                if not rel:
                    continue
                rel_path = str(rel)
                if '/' in rel_path:
                    src_path = os.path.join(DATA_DIR, rel_path)
                else:
                    src_path = os.path.join(DATA_DIR, rel_path)
                    if not os.path.exists(src_path):
                        default_path = os.path.join(DATA_DIR, 'default', rel_path)
                        if os.path.exists(default_path):
                            src_path = default_path
                        else:
                            for entry in os.scandir(DATA_DIR):
                                if entry.is_dir():
                                    p = os.path.join(entry.path, rel_path)
                                    if os.path.exists(p):
                                        src_path = p
                                        break

                if not os.path.exists(src_path):
                    failed.append({"file": rel_path, "error": "Source file not found"})
                    continue

                filename = os.path.basename(src_path)
                dest_path = os.path.join(dest_dir, filename)
                if os.path.exists(dest_path):
                    failed.append({"file": rel_path, "error": f"Target already has {filename}"})
                    continue

                os.replace(src_path, dest_path)
                moved.append(rel_path)
            except Exception as e:
                failed.append({"file": rel, "error": str(e)})

        return jsonify({"success": True, "moved": moved, "failed": failed})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/svg2others', methods=['POST'])
def svg2others():
    # This endpoint is now handled client-side by smart_tvbot.js for better local support.
    return "Local export handled client-side.", 501

if __name__ == '__main__':
    import webbrowser
    import threading
    
    port = 8000
    url = f"http://127.0.0.1:{port}/"
    print(f"TVBOT Local Server starting at {url}")
    
    # Open the browser automatically after a short delay
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    
    app.run(debug=True, port=port, use_reloader=False)
