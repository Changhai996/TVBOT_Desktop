import re

with open('/Users/duanchanghai/Downloads/tools/TVBOT/server.py', 'r') as f:
    content = f.read()

new_html = '''    html = """
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
                padding: 1rem 1.5rem; 
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
                                {% if project_name.lower() != 'default' %}
                                <button onclick="renameProject('{{ project_name }}')" class="btn btn-link text-muted p-0 text-decoration-none hover-primary" title="Rename">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button onclick="deleteProject('{{ project_name }}')" class="btn btn-link text-danger p-0 text-decoration-none" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                                {% endif %}
                                <i class="bi bi-chevron-down text-muted ms-2" id="icon-{{ project_name }}"></i>
                            </div>
                        </div>
                        <div class="project-body" id="body-{{ project_name }}">
                            {% if trees %}
                                {% for file in trees %}
                                <div class="tree-item" data-name="{{ file.name }}" data-time="{{ file.mtime }}" data-html="{{ file.html }}">
                                    <div class="d-flex align-items-center gap-3">
                                        <input type="checkbox" class="form-check-input tree-checkbox mt-0" value="{{ file.rel_path }}">
                                        <div>
                                            <div class="tree-name">{{ file.name.replace('.json', '') }}</div>
                                            <div class="tree-meta">
                                                <span><i class="bi bi-clock"></i> {{ file.time_str }}</span>
                                                <span><i class="bi bi-layout-wtf"></i> {{ file.html.replace('.html', '') }}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="d-flex gap-2 align-items-center">
                                        <a href="/{{ file.html }}?originalJsonDataUri=/api/get_tree/{{ file.encoded_rel_path }}&projectId={{ project_name }}&treeTitle={{ file.name.replace('.json', '') }}" class="btn btn-custom-primary btn-action text-decoration-none">Open</a>
                                        <button onclick="renameTree('{{ file.rel_path }}')" class="btn btn-light btn-action border">Rename</button>
                                        <button onclick="copyTree('{{ file.rel_path }}','{{ project_name }}','{{ file.name.replace('.json', '') }}')" class="btn btn-light btn-action border">Copy</button>
                                        <div class="dropdown">
                                            <button class="btn btn-light btn-action border dropdown-toggle" type="button" data-bs-toggle="dropdown">Move</button>
                                            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                                {% for p in project_names %}
                                                    {% if p != project_name %}
                                                        <li><a class="dropdown-item small" href="#" onclick="moveTree('{{ file.rel_path }}', '{{ p }}')">{{ 'Default Project' if p == 'default' else p }}</a></li>
                                                    {% endif %}
                                                {% endfor %}
                                            </ul>
                                        </div>
                                        <button onclick="deleteTree('{{ file.rel_path }}')" class="btn btn-outline-danger btn-action ms-1"><i class="bi bi-trash"></i></button>
                                    </div>
                                </div>
                                {% endfor %}
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
                const defName = String(baseName || 'tree').trim().replace(/[\\\/:*?"<>|]/g, '_') + '_copy';
                const newStem = prompt('Copy as:', defName);
                if (!newStem) return;
                const treeName = newStem.trim().replace(/[\\\/:*?"<>|]/g, '_').replace(/\\.json$/i, '');
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
    """'''

pattern = re.compile(r'    html = """\n    <!DOCTYPE html>.*?    </html>\n    """', re.DOTALL)
new_content = pattern.sub(new_html, content)

with open('/Users/duanchanghai/Downloads/tools/TVBOT/server.py', 'w') as f:
    f.write(new_content)
