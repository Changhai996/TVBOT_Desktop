from flask import Flask, send_from_directory, request, jsonify, render_template_string, send_file, Response
from flask_cors import CORS
import os
import json
import time
import secrets
from datetime import datetime

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
                projects[project_name].append({
                    'name': filename, 
                    'rel_path': os.path.join(project_name, filename) if project_name.lower() != 'default' else filename,
                    'html': html_file, 
                    'mtime': mtime, 
                    'time_str': formatted_time
                })
        except:
            projects[project_name].append({
                'name': filename, 
                'rel_path': os.path.join(project_name, filename) if project_name.lower() != 'default' else filename,
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
        <title>My Local Trees</title>
        <link href="/static/css/bootstrap.min.css" rel="stylesheet">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
        <script src="/static/js/jspdf.umd.min.js"></script>
        <script src="/static/js/svg2pdf.umd.min.js"></script>
        <style>
            body { padding: 20px; background-color: #f8f9fa; font-family: 'Arial', sans-serif; }
            .container { max-width: 1100px; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header-box { border-bottom: 2px solid #42b983; margin-bottom: 30px; padding-bottom: 10px; }
            .project-section { margin-bottom: 40px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
            .project-header { background: #f8f9fa; padding: 12px 20px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
            .project-header:hover { background: #f1f3f5; }
            .project-title { font-weight: 700; color: #495057; font-size: 1.1rem; flex-grow: 1; }
            .tree-item { padding: 12px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
            .tree-item:hover { background-color: #f9f9f9; }
            .tree-item:last-child { border-bottom: none; }
            .tree-name { font-weight: 600; color: #333; }
            .btn-xiaochi { background-color: #42b983; color: white; border-radius: 20px; padding: 4px 15px; font-weight: 500; font-size: 0.85rem; }
            .btn-xiaochi:hover { background-color: #3aa876; color: white; transform: translateY(-1px); }
            .btn-batch { background-color: #3498db; color: white; border-radius: 20px; padding: 6px 20px; font-weight: 500; border: none; }
            .btn-batch:hover { background-color: #2980b9; color: white; }
            .btn-danger-outline { color: #dc3545; border: 1px solid #dc3545; background: white; border-radius: 20px; padding: 4px 15px; font-size: 0.85rem; transition: all 0.2s; }
            .btn-danger-outline:hover { background: #dc3545; color: white; }
            .empty-project-body { padding: 20px; text-align: center; color: #adb5bd; font-style: italic; background: #fff; }
            .sort-controls { margin-bottom: 20px; background: #f1f3f5; padding: 10px 20px; border-radius: 8px; }
            .checkbox-col { width: 30px; }
            #batch-status { position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; background: #333; color: white; border-radius: 8px; display: none; z-index: 9999; }
            .bi-folder-fill { color: #ffca28; margin-right: 10px; }
            .project-name-display { color: #2c3e50; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-box d-flex justify-content-between align-items-center">
                <h2 class="m-0" style="color: #42b983;">My Local Trees</h2>
                <div class="d-flex align-items-center gap-3">
                    <button onclick="createNewProject()" class="btn btn-outline-success btn-sm">
                        <i class="bi bi-folder-plus"></i> New Project
                    </button>
                    <select id="moveTargetProject" class="form-select form-select-sm" style="width: 180px;">
                        <option value="" selected>Move selected to...</option>
                        {% for p in project_names %}
                            <option value="{{ p }}">{{ 'Default Project' if p == 'default' else p }}</option>
                        {% endfor %}
                    </select>
                    <button onclick="batchMove()" class="btn btn-outline-secondary btn-sm">
                        Move
                    </button>
                    <button onclick="batchExport()" class="btn btn-batch btn-sm">
                        <i class="bi bi-file-earmark-pdf"></i> Batch Export PDF
                    </button>
                </div>
            </div>

            <div class="sort-controls d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-3">
                    <span class="text-muted small fw-bold">SORT BY:</span>
                    <select id="sortSelect" class="form-select form-select-sm" style="width: auto;" onchange="sortAllFiles()">
                        <option value="nameAsc" selected>Name (A-Z)</option>
                        <option value="nameDesc">Name (Z-A)</option>
                        <option value="timeDesc">Date (Newest First)</option>
                        <option value="timeAsc">Date (Oldest First)</option>
                    </select>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                    <label for="selectAll" class="small text-muted fw-bold">Select All</label>
                </div>
            </div>
            
            <div id="project-list">
                {% if projects %}
                    {% for project_name, trees in projects.items() %}
                    <div class="project-section" data-project="{{ project_name }}">
                        <div class="project-header">
                            <div class="project-title" onclick="toggleProject('{{ project_name }}')">
                                <i class="bi bi-folder-fill"></i>
                                <span class="project-name-display">{{ 'Default Project' if project_name == 'default' else project_name }}</span>
                                <span class="badge bg-light text-dark ms-2" style="font-weight: normal; font-size: 0.75rem;">{{ trees|length }} items</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                {% if project_name.lower() != 'default' %}
                                <button onclick="renameProject('{{ project_name }}')" class="btn btn-link text-secondary p-0 me-2" title="Rename project folder">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button onclick="deleteProject('{{ project_name }}')" class="btn btn-link text-danger p-0 me-3" title="Delete entire project folder">
                                    <i class="bi bi-trash"></i>
                                </button>
                                {% endif %}
                                <i class="bi bi-chevron-right" id="icon-{{ project_name }}" onclick="toggleProject('{{ project_name }}')"></i>
                            </div>
                        </div>
                        <div class="project-body" id="body-{{ project_name }}" style="display: none;">
                            {% if trees %}
                                {% for file in trees %}
                                <div class="tree-item" data-name="{{ file.name }}" data-time="{{ file.mtime }}" data-html="{{ file.html }}">
                                    <div class="d-flex align-items-center gap-3">
                                        <div class="checkbox-col">
                                            <input type="checkbox" class="tree-checkbox" value="{{ file.rel_path }}">
                                        </div>
                                        <div>
                                            <div class="tree-name">{{ file.name }}</div>
                                            <div class="small text-muted">
                                                <i class="bi bi-clock"></i> {{ file.time_str }} | 
                                                <i class="bi bi-diagram-3"></i> {{ file.html.replace('.html', '') }}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <a href="/{{ file.html }}?originalJsonDataUri=/api/get_tree/{{ file.rel_path }}&projectId={{ project_name }}&treeTitle={{ file.name.replace('.json', '') }}" class="btn btn-sm btn-xiaochi">Open</a>
                                        <button onclick="renameTree('{{ file.rel_path }}')" class="btn btn-sm btn-outline-secondary ms-2">Rename</button>
                                        <button onclick="copyTree('{{ file.rel_path }}','{{ project_name }}','{{ file.name.replace('.json', '') }}')" class="btn btn-sm btn-outline-primary ms-2">Copy</button>
                                        <select class="form-select form-select-sm d-inline-block ms-2" style="width: 160px;" onchange="this._moveTarget=this.value;">
                                            <option value="" selected>Move to...</option>
                                            {% for p in project_names %}
                                                {% if p != project_name %}
                                                    <option value="{{ p }}">{{ 'Default Project' if p == 'default' else p }}</option>
                                                {% endif %}
                                            {% endfor %}
                                        </select>
                                        <button onclick="moveTree('{{ file.rel_path }}', this)" class="btn btn-sm btn-outline-secondary ms-1">Move</button>
                                        <button onclick="deleteTree('{{ file.rel_path }}')" class="btn btn-sm btn-outline-danger ms-2">Delete</button>
                                    </div>
                                </div>
                                {% endfor %}
                            {% else %}
                                <div class="empty-project-body">
                                    This project folder is empty.
                                </div>
                            {% endif %}
                        </div>
                    </div>
                    {% endfor %}
                {% else %}
                    <div class="empty-state">
                        <i class="bi bi-folder2-open" style="font-size: 3rem; display: block; margin-bottom: 10px;"></i>
                        <p>No local tree projects found.</p>
                        <p><small>Save your work using the "Save" button in the tree editor.</small></p>
                    </div>
                {% endif %}
            </div>
            <div class="mt-5 pt-3 border-top d-flex justify-content-between">
                <a href="/tvbot.html" class="btn btn-outline-secondary">Back to Home</a>
                <p class="text-muted small">TVBOT Local Version</p>
            </div>
        </div>

        <div id="batch-status">Processing...</div>

        <script>
            async function createNewProject() {
                const name = prompt("Enter new project name:");
                if (!name) return;
                
                try {
                    const res = await fetch('/api/create_project', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectName: name })
                    });
                    const data = await res.json();
                    if (data.success) {
                        location.reload();
                    } else {
                        alert("Error: " + data.error);
                    }
                } catch (err) {
                    alert("Failed to create project: " + err.message);
                }
            }

            async function deleteProject(name) {
                if (confirm(`Are you sure you want to delete the entire project folder "${name}"? This will delete ALL trees inside it.`)) {
                    try {
                        const res = await fetch('/api/delete_project/' + name, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            location.reload();
                        } else {
                            alert("Error: " + data.error);
                        }
                    } catch (err) {
                        alert("Failed to delete project: " + err.message);
                    }
                }
            }

            async function renameProject(oldName) {
                const newName = prompt(`Rename project folder "${oldName}" to:`, oldName);
                if (!newName) return;
                if (newName === oldName) return;
                try {
                    const res = await fetch('/api/rename_project', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ oldName, newName })
                    });
                    const data = await res.json();
                    if (data.success) {
                        location.reload();
                    } else {
                        alert("Error: " + data.error);
                    }
                } catch (err) {
                    alert("Failed to rename project: " + err.message);
                }
            }

            function toggleProject(name) {
                const body = document.getElementById('body-' + name);
                const icon = document.getElementById('icon-' + name);
                if (body.style.display === 'none') {
                    body.style.display = 'block';
                    icon.className = 'bi bi-chevron-down';
                } else {
                    body.style.display = 'none';
                    icon.className = 'bi bi-chevron-right';
                }
            }

            function toggleSelectAll() {
                const checked = document.getElementById('selectAll').checked;
                document.querySelectorAll('.tree-checkbox').forEach(cb => cb.checked = checked);
            }

            async function batchExport() {
                const selected = Array.from(document.querySelectorAll('.tree-checkbox:checked')).map(cb => cb.closest('.tree-item'));
                if (selected.length === 0) {
                    alert("Please select at least one tree to export.");
                    return;
                }

                if (!confirm(`Export ${selected.length} trees to PDF?`)) return;

                const statusBox = document.getElementById('batch-status');
                statusBox.style.display = 'block';

                for (let i = 0; i < selected.length; i++) {
                    const item = selected[i];
                    const relPath = item.querySelector('.tree-checkbox').value;
                    const fileName = item.getAttribute('data-name');
                    const treeName = fileName.replace('.json', '');
                    const htmlFile = item.getAttribute('data-html');
                    
                    statusBox.innerText = `Exporting (${i+1}/${selected.length}): ${treeName}...`;
                    
                    try {
                        await exportSingleTree(relPath, treeName, htmlFile);
                    } catch (err) {
                        console.error(`Failed to export ${treeName}:`, err);
                    }
                }

                statusBox.innerText = "Batch export complete!";
                setTimeout(() => statusBox.style.display = 'none', 3000);
            }

            async function batchMove() {
                const target = document.getElementById('moveTargetProject').value;
                if (!target) {
                    alert('Please choose a target project.');
                    return;
                }
                const selected = Array.from(document.querySelectorAll('.tree-checkbox:checked')).map(cb => cb.value);
                if (selected.length === 0) {
                    alert('Please select at least one tree to move.');
                    return;
                }
                if (!confirm(`Move ${selected.length} selected trees to "${target}"?`)) return;
                try {
                    const res = await fetch('/api/move_trees', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ files: selected, toProject: target })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        alert('Error: ' + data.error);
                        return;
                    }
                    if (data.failed && data.failed.length) {
                        const msg = data.failed.slice(0, 10).map(x => `${x.file}: ${x.error}`).join('\\n');
                        alert(`Moved: ${(data.moved || []).length}\\nFailed: ${data.failed.length}\\n\\n${msg}`);
                    }
                    location.reload();
                } catch (err) {
                    alert('Failed to move: ' + err.message);
                }
            }

            async function exportSingleTree(relPath, treeName, htmlFile) {
                return new Promise((resolve, reject) => {
                    const iframe = document.createElement('iframe');
                    iframe.src = `/${htmlFile}?originalJsonDataUri=/api/get_tree/${relPath}&autoExportPDF=true&exportName=${treeName}`;
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                    
                    const timeout = setTimeout(() => {
                        document.body.removeChild(iframe);
                        reject("Timeout during export");
                    }, 30000);

                    window.addEventListener('message', function handleExportMsg(event) {
                        if (event.data === 'export_complete_' + treeName) {
                            clearTimeout(timeout);
                            window.removeEventListener('message', handleExportMsg);
                            setTimeout(() => {
                                document.body.removeChild(iframe);
                                resolve();
                            }, 1000);
                        }
                    });
                });
            }

            function sortAllFiles() {
                const sortVal = document.getElementById('sortSelect').value;
                document.querySelectorAll('.project-body').forEach(list => {
                    const items = Array.from(list.getElementsByClassName('tree-item'));
                    if (items.length === 0) return;
                    
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
                if (confirm('Are you sure you want to delete ' + relPath + '?')) {
                    fetch('/api/delete_tree/' + relPath, { method: 'DELETE' })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) location.reload();
                            else alert('Error: ' + data.error);
                        });
                }
            }

            async function renameTree(relPath) {
                const base = relPath.split('/').pop() || relPath;
                const oldStem = base.replace(/\\.json$/i, '');
                const newStem = prompt(`Rename tree file "${oldStem}" to:`, oldStem);
                if (!newStem) return;
                if (newStem === oldStem) return;
                try {
                    const res = await fetch('/api/rename_tree', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: relPath, newName: newStem })
                    });
                    const data = await res.json();
                    if (data.success) location.reload();
                    else alert('Error: ' + data.error);
                } catch (err) {
                    alert('Failed to rename: ' + err.message);
                }
            }

            function _sanitizeTreeStem(name) {
                return String(name || '').trim().replace(/[\\\/:*?"<>|]/g, '_');
            }

            async function copyTree(relPath, projectId, baseName) {
                const defName = _sanitizeTreeStem(String(baseName || 'tree') + '_copy');
                const newStem = prompt('Copy tree file as:', defName);
                if (!newStem) return;
                const treeName = _sanitizeTreeStem(newStem).replace(/\\.json$/i, '');
                if (!treeName) return;

                try {
                    const srcRes = await fetch('/api/get_tree/' + relPath);
                    const srcJson = await srcRes.json();
                    if (!srcRes.ok || !srcJson || (srcJson.success === false && srcJson.error)) {
                        throw new Error((srcJson && srcJson.error) ? srcJson.error : 'Failed to load source tree');
                    }

                    const res = await fetch('/tvbot/saveOriginalJsonData', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ treeName: treeName, projectId: projectId, jsonData: srcJson })
                    });
                    const data = await res.json();
                    if (data && data.success) location.reload();
                    else alert('Copy failed: ' + ((data && data.error) ? data.error : 'Unknown error'));
                } catch (err) {
                    alert('Copy failed: ' + err.message);
                }
            }

            async function moveTree(relPath, btn) {
                const select = btn.previousElementSibling;
                const target = select && select.value ? select.value : '';
                if (!target) {
                    alert('Please choose a target project.');
                    return;
                }
                if (!confirm(`Move ${relPath} to project "${target}"?`)) return;
                try {
                    const res = await fetch('/api/move_tree', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ from: relPath, toProject: target })
                    });
                    const data = await res.json();
                    if (data.success) location.reload();
                    else alert('Error: ' + data.error);
                } catch (err) {
                    alert('Failed to move: ' + err.message);
                }
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
    print("TVBOT Local Server running at http://localhost:8000")
    app.run(debug=True, port=8000)
