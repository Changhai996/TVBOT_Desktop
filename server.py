from flask import Flask, send_from_directory, request, jsonify, render_template_string, send_file, Response
from flask_cors import CORS
import os
import json
import time
import secrets
import logging
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
        project_id = data.get('projectId', 'default')
        if project_id is None:
            project_id = 'default'
        project_id_str = str(project_id).strip()
        if project_id_str.lower() in ['default', 'default project', '']:
            project_id = 'default'
        else:
            project_id = project_id_str
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
    # Return a mock project list so the built-in UI works
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
                    # Add trees from default folder to default project
                    for f in os.listdir(entry.path):
                        if f.endswith('.json'):
                            trees.append({"treeName": f.replace('.json', ''), "projectId": "default"})
                    continue
                
                # Add this directory as a project
                projects.append({"projectId": project_name, "projectName": project_name, "username": "local-user"})
                
                # Scan trees in this project folder
                for f in os.listdir(entry.path):
                    if f.endswith('.json'):
                        trees.append({"treeName": f.replace('.json', ''), "projectId": project_name})
            elif entry.is_file() and entry.name.endswith('.json'):
                # Files directly in DATA_DIR go into 'default'
                trees.append({"treeName": entry.name.replace('.json', ''), "projectId": "default"})
            
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
        <title>Workspace | Tree Beautify</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
        <script src="/static/js/jspdf.umd.min.js"></script>
        <script src="/static/js/svg2pdf.umd.min.js"></script>
        <style>
            :root {
                --primary-color: #10b981;
                --primary-hover: #059669;
                --bg-color: #f8fafc;
                --text-dark: #0f172a;
                --text-muted: #64748b;
            }
            body { 
                background-color: var(--bg-color); 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: var(--text-dark);
                padding-top: 80px;
                padding-bottom: 40px;
            }
            .navbar {
                background: rgba(255, 255, 255, 0.8) !important;
                backdrop-filter: blur(12px);
                border-bottom: 1px solid rgba(0,0,0,0.05);
            }
            .navbar-brand {
                font-weight: 700;
                color: var(--text-dark) !important;
            }
            .navbar-brand i { color: var(--primary-color); }
            
            .container-main { 
                max-width: 1200px; 
                margin: 0 auto; 
            }
            .page-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            .page-title {
                font-weight: 800;
                font-size: 2rem;
                margin: 0;
            }
            .action-bar {
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .btn-custom-primary {
                background-color: var(--primary-color);
                color: white;
                font-weight: 500;
                border-radius: 8px;
                border: none;
                transition: all 0.2s;
            }
            .btn-custom-primary:hover { background-color: var(--primary-hover); color: white; transform: translateY(-1px); }
            
            .project-card { 
                background: white;
                border-radius: 12px; 
                border: 1px solid #e2e8f0;
                margin-bottom: 1.5rem;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            }
            .project-header { 
                background: #f8fafc; 
                padding: 1rem 1.5rem; 
                border-bottom: 1px solid #e2e8f0; 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                cursor: pointer; 
                transition: background 0.2s;
            }
            .project-header:hover { background: #f1f5f9; }
            .project-title { font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;}
            .project-title i { color: #f59e0b; }
            
            .tree-item { 
                padding: 0.5rem 1rem; 
                border-bottom: 1px solid #f1f5f9; 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                transition: background 0.2s; 
            }
            .tree-item:hover { background-color: #f8fafc; }
            .tree-item:last-child { border-bottom: none; }
            .tree-name { font-weight: 600; color: #1e293b; font-size: 1.05rem; }
            .tree-meta { font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; display: flex; gap: 15px; }
            
            .btn-action {
                padding: 0.35rem 0.75rem;
                font-size: 0.875rem;
                border-radius: 6px;
                font-weight: 500;
            }
            .empty-state {
                text-align: center;
                padding: 4rem 2rem;
                background: white;
                border-radius: 12px;
                border: 1px dashed #e2e8f0;
            }
            .empty-state i { font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; display: block; }
            #batch-status { position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; background: #1e293b; color: white; border-radius: 8px; display: none; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        </style>
    </head>
    <body>
        <nav class="navbar navbar-expand-lg fixed-top">
            <div class="container">
                <a class="navbar-brand" href="/tvbot.html">
                    <i class="bi bi-diagram-3-fill me-2"></i>Tree Beautify
                </a>
                <div class="d-flex">
                    <a href="/tvbot.html" class="btn btn-outline-secondary btn-sm rounded-pill px-3">Home</a>
                </div>
            </div>
        </nav>

        <div class="container-main px-3">
            <div class="page-header">
                <h1 class="page-title">My Workspace</h1>
                <button onclick="createNewProject()" class="btn btn-custom-primary px-4">
                    <i class="bi bi-folder-plus me-2"></i> New Project
                </button>
            </div>

            <div class="action-bar flex-wrap gap-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" id="selectAll" class="form-check-input mt-0" onchange="toggleSelectAll()">
                        <label for="selectAll" class="fw-semibold text-muted small mb-0">Select All</label>
                    </div>
                    <div class="vr mx-1"></div>
                    <select id="sortSelect" class="form-select form-select-sm w-auto fw-medium" onchange="sortAllFiles()">
                        <option value="timeDesc" selected>Newest First</option>
                        <option value="timeAsc">Oldest First</option>
                        <option value="nameAsc">Name (A-Z)</option>
                        <option value="nameDesc">Name (Z-A)</option>
                    </select>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                    <select id="moveTargetProject" class="form-select form-select-sm w-auto">
                        <option value="" selected>Move selected to...</option>
                        {% for p in project_names %}
                            <option value="{{ p }}">{{ 'Default Project' if p == 'default' else p }}</option>
                        {% endfor %}
                    </select>
                    <button onclick="batchMove()" class="btn btn-outline-secondary btn-sm fw-medium">
                        Move
                    </button>
                    <button onclick="batchExport()" class="btn btn-dark btn-sm fw-medium ms-2">
                        <i class="bi bi-file-earmark-pdf me-1"></i> Batch Export PDF
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
                                {{ 'Default Project' if project_name == 'default' else project_name }}
                                <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill fw-normal ms-2">{{ trees|length }}</span>
                            </div>
                            <div class="d-flex align-items-center gap-3" onclick="event.stopPropagation()">
                                <a href="/normalTree.html?projectId={{ project_name }}&autoUpload=1" class="btn btn-sm btn-outline-primary py-0 px-2 text-decoration-none" title="Import Tree" style="font-size: 0.75rem;">
                                    <i class="bi bi-upload"></i> Import Tree
                                </a>
                                {% if project_name.lower() != 'default' %}
                                <button onclick="renameProject('{{ project_name }}')" class="btn btn-link text-muted p-0 text-decoration-none hover-primary" title="Rename">
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
                                <div class="list-group list-group-flush border-top">
                                    <div class="list-group-item bg-light text-muted small fw-semibold d-flex align-items-center py-2" style="font-size: 0.8rem; letter-spacing: 0.5px;">
                                        <div style="width: 40px;" class="text-center">
                                            <input type="checkbox" class="form-check-input mt-0 folder-select-all" data-target="{{ project_name }}" onchange="toggleFolderSelect(this, '{{ project_name }}')">
                                        </div>
                                        <div class="flex-grow-1 cursor-pointer" onclick="sortFolder('{{ project_name }}', 'name')" style="cursor: pointer; user-select: none;">Name <i class="bi bi-arrow-down-up ms-1 opacity-50"></i></div>
                                        <div style="width: 180px;" class="cursor-pointer" onclick="sortFolder('{{ project_name }}', 'time')" style="cursor: pointer; user-select: none;">Date Modified <i class="bi bi-arrow-down-up ms-1 opacity-50"></i></div>
                                        <div style="width: 120px;">Layout Type</div>
                                        <div style="width: 260px;" class="text-center">Actions</div>
                                    </div>
                                    <div class="folder-items-container" id="items-{{ project_name }}">
                                        {% for file in trees %}
                                        <div class="list-group-item tree-item d-flex align-items-center py-2 border-bottom" data-name="{{ file.name }}" data-time="{{ file.mtime }}" data-html="{{ file.html }}" style="transition: background 0.15s; font-size: 0.9rem;">
                                            <div style="width: 40px;" class="text-center">
                                                <input type="checkbox" class="form-check-input tree-checkbox mt-0" data-project="{{ project_name }}" value="{{ file.rel_path }}">
                                            </div>
                                            <div class="flex-grow-1 text-truncate pe-3">
                                                <i class="bi bi-file-earmark-text text-primary me-2"></i>
                                                <span class="tree-name fw-medium text-dark">{{ file.name.replace('.json', '') }}</span>
                                            </div>
                                            <div style="width: 180px;" class="text-muted small">
                                                {{ file.time_str }}
                                            </div>
                                            <div style="width: 120px;" class="text-muted small">
                                                <span class="badge bg-light text-dark border">{{ file.html.replace('.html', '') }}</span>
                                            </div>
                                            <div style="width: 260px;" class="d-flex gap-1 justify-content-end">
                                                <a href="/{{ file.html }}?originalJsonDataUri=/api/get_tree/{{ file.encoded_rel_path }}&projectId={{ project_name }}&treeTitle={{ file.name.replace('.json', '') }}" class="btn btn-sm btn-custom-primary btn-action py-1 px-2" style="font-size: 0.8rem;">Open</a>
                                                <button onclick="renameTree('{{ file.rel_path }}')" class="btn btn-sm btn-light btn-action border py-1 px-2" style="font-size: 0.8rem;">Rename</button>
                                                <button onclick="copyTree('{{ file.rel_path }}','{{ project_name }}','{{ file.name.replace('.json', '') }}')" class="btn btn-sm btn-light btn-action border py-1 px-2" style="font-size: 0.8rem;">Copy</button>
                                                <div class="dropdown">
                                                    <button class="btn btn-sm btn-light btn-action border py-1 px-2 dropdown-toggle" type="button" data-bs-toggle="dropdown" style="font-size: 0.8rem;">Move</button>
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
                                <div class="p-4 text-center text-muted small bg-light">Folder is empty.</div>
                            {% endif %}
                        </div>
                    </div>
                    {% endfor %}
                {% else %}
                    <div class="empty-state">
                        <i class="bi bi-folder2-open"></i>
                        <h4 class="fw-bold text-dark">No projects yet</h4>
                        <p class="text-muted">Create a new tree from the home page and save it to see it here.</p>
                        <a href="/tvbot.html#create-tree" class="btn btn-custom-primary mt-2 text-decoration-none">Create Tree</a>
                    </div>
                {% endif %}
            </div>
        </div>

        <div id="batch-status">Processing...</div>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            async function createNewProject() {
                const name = prompt("Enter new project name:");
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
                if (confirm(`Delete entire project "${name}" and all its trees?`)) {
                    try {
                        const res = await fetch('/api/delete_project/' + name, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) location.reload(); else alert("Error: " + data.error);
                    } catch (err) { alert("Failed: " + err.message); }
                }
            }

            async function renameProject(oldName) {
                const newName = prompt(`Rename project "${oldName}" to:`, oldName);
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
                    icon.className = 'bi bi-chevron-down text-muted ms-2';
                } else {
                    body.style.display = 'none';
                    icon.className = 'bi bi-chevron-right text-muted ms-2';
                }
            }

            function toggleFolderSelect(checkbox, projectName) {
                const checked = checkbox.checked;
                // Use attribute selector to handle project names with spaces
                document.querySelectorAll(`.tree-checkbox[data-project="${projectName}"]`).forEach(cb => cb.checked = checked);
            }

            let sortState = {};
            function sortFolder(projectName, criterion) {
                if (!sortState[projectName]) sortState[projectName] = { name: 1, time: 1 };
                
                const container = document.getElementById('items-' + projectName);
                if (!container) return;
                
                const items = Array.from(container.getElementsByClassName('tree-item'));
                if (!items.length) return;

                const direction = sortState[projectName][criterion] || 1;
                
                items.sort((a, b) => {
                    if (criterion === 'name') {
                        const nameA = a.getAttribute('data-name').toLowerCase();
                        const nameB = b.getAttribute('data-name').toLowerCase();
                        return direction * nameA.localeCompare(nameB);
                    } else {
                        const timeA = parseFloat(a.getAttribute('data-time'));
                        const timeB = parseFloat(b.getAttribute('data-time'));
                        return direction * (timeB - timeA); // default is newest first
                    }
                });
                
                // Toggle direction for next click
                sortState[projectName][criterion] *= -1;
                
                items.forEach(item => container.appendChild(item));
            }

            function toggleSelectAll() {
                const checked = document.getElementById('selectAll').checked;
                document.querySelectorAll('.tree-checkbox').forEach(cb => cb.checked = checked);
            }

            async function batchExport() {
                const selected = Array.from(document.querySelectorAll('.tree-checkbox:checked')).map(cb => cb.closest('.tree-item'));
                if (selected.length === 0) return alert("Select at least one tree.");
                if (!confirm(`Export ${selected.length} trees to PDF?`)) return;

                const statusBox = document.getElementById('batch-status');
                statusBox.style.display = 'block';
                for (let i = 0; i < selected.length; i++) {
                    const item = selected[i];
                    const relPath = item.querySelector('.tree-checkbox').value;
                    const encodedRelPath = encodeURIComponent(relPath).replace(/%2F/g, '/');
                    const fileName = item.getAttribute('data-name');
                    const treeName = fileName.replace('.json', '');
                    const htmlFile = item.getAttribute('data-html');
                    
                    statusBox.innerText = `Exporting (${i+1}/${selected.length}): ${treeName}...`;
                    try { await exportSingleTree(encodedRelPath, treeName, htmlFile); } 
                    catch (err) { console.error(`Failed:`, err); }
                }
                statusBox.innerText = "Export complete!";
                setTimeout(() => statusBox.style.display = 'none', 3000);
            }

            async function batchMove() {
                const target = document.getElementById('moveTargetProject').value;
                if (!target) return alert('Choose target project.');
                const selected = Array.from(document.querySelectorAll('.tree-checkbox:checked')).map(cb => cb.value);
                if (selected.length === 0) return alert('Select at least one tree.');
                if (!confirm(`Move ${selected.length} trees to "${target}"?`)) return;
                try {
                    const res = await fetch('/api/move_trees', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ files: selected, toProject: target })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert('Error: ' + data.error);
                } catch (err) { alert('Failed: ' + err.message); }
            }

            async function exportSingleTree(encodedRelPath, treeName, htmlFile) {
                return new Promise((resolve, reject) => {
                    const iframe = document.createElement('iframe');
                    iframe.src = `/${htmlFile}?originalJsonDataUri=/api/get_tree/${encodedRelPath}&autoExportPDF=true&exportName=${treeName}`;
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                    const timeout = setTimeout(() => { document.body.removeChild(iframe); reject("Timeout"); }, 30000);
                    window.addEventListener('message', function handleExportMsg(event) {
                        if (event.data === 'export_complete_' + treeName) {
                            clearTimeout(timeout); window.removeEventListener('message', handleExportMsg);
                            setTimeout(() => { document.body.removeChild(iframe); resolve(); }, 1000);
                        }
                    });
                });
            }

            function sortAllFiles() {
                const sortVal = document.getElementById('sortSelect').value;
                document.querySelectorAll('.project-body').forEach(list => {
                    const items = Array.from(list.getElementsByClassName('tree-item'));
                    if (!items.length) return;
                    items.sort((a, b) => {
                        const nameA = a.getAttribute('data-name').toLowerCase();
                        const nameB = b.getAttribute('data-name').toLowerCase();
                        const timeA = parseFloat(a.getAttribute('data-time'));
                        const timeB = parseFloat(b.getAttribute('data-time'));
                        if (sortVal === 'nameAsc') return nameA.localeCompare(nameB);
                        if (sortVal === 'nameDesc') return nameB.localeCompare(nameA);
                        if (sortVal === 'timeAsc') return timeA - timeB;
                        if (sortVal === 'timeDesc') return timeB - timeA;
                        return 0;
                    });
                    items.forEach(item => list.appendChild(item));
                });
            }

            function deleteTree(relPath) {
                if (confirm('Delete ' + relPath + '?')) {
                    fetch('/api/delete_tree/' + encodeURIComponent(relPath).replace(/%2F/g, '/'), { method: 'DELETE' })
                        .then(res => res.json()).then(data => { if (data.success) location.reload(); else alert('Error: ' + data.error); });
                }
            }

            async function renameTree(relPath) {
                const base = relPath.split('/').pop() || relPath;
                const oldStem = base.replace(/\\.json$/i, '');
                const newStem = prompt(`Rename "${oldStem}" to:`, oldStem);
                if (!newStem || newStem === oldStem) return;
                try {
                    const res = await fetch('/api/rename_tree', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: relPath, newName: newStem })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert('Error: ' + data.error);
                } catch (err) { alert('Failed: ' + err.message); }
            }

            async function copyTree(relPath, projectId, baseName) {
                const defName = String(baseName || 'tree').trim().replace(/[\\/:*?"<>|]/g, '_') + '_copy';
                const newStem = prompt('Copy as:', defName);
                if (!newStem) return;
                const treeName = newStem.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\\.json$/i, '');
                try {
                    const srcRes = await fetch('/api/get_tree/' + encodeURIComponent(relPath).replace(/%2F/g, '/'));
                    const srcJson = await srcRes.json();
                    if (!srcRes.ok || srcJson.error) throw new Error(srcJson.error || 'Failed to load source');
                    const res = await fetch('/tvbot/saveOriginalJsonData', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ treeName: treeName, projectId: projectId, jsonData: srcJson })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert('Copy failed: ' + data.error);
                } catch (err) { alert('Copy failed: ' + err.message); }
            }

            async function moveTree(relPath, target) {
                if (!target) return;
                try {
                    const res = await fetch('/api/move_tree', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ from: relPath, toProject: target })
                    });
                    const data = await res.json();
                    if (data.success) location.reload(); else alert('Error: ' + data.error);
                } catch (err) { alert('Failed: ' + err.message); }
            }
            
            // Run initial sort
            sortAllFiles();
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
