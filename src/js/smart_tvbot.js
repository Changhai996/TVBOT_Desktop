
// TVBOT Bootstrap Defaults: Text, size 3, x -3, y -3
(function() {
    console.log("TVBOT Bootstrap Defaults & Safety features loaded");

    // Prevent accidental page closing
    window.addEventListener('beforeunload', function (e) {
        try {
            if (window.__tvbot_skip_beforeunload) return;
            const once = sessionStorage.getItem('tvbot_skip_beforeunload_once');
            if (once === '1') {
                sessionStorage.removeItem('tvbot_skip_beforeunload_once');
                return;
            }
        } catch (err) {}
        // Most modern browsers will show a standard confirmation message
        // and ignore the custom string, but we set it for compatibility.
        var confirmationMessage = 'It looks like you have been editing something. '
                                + 'If you leave before saving, your changes will be lost.';

        (e || window.event).returnValue = confirmationMessage; // Gecko + SD
        return confirmationMessage; // Gecko + Webkit, Safari, Chrome etc.
    });

    // Add a back button and project selector for easier navigation
    function addTopUI() {
        // Clean up redundant buttons from other scripts
        const redundantBtns = document.querySelectorAll('button');
        redundantBtns.forEach(b => {
            if (b.innerText.includes('Save to Local')) b.remove();
        });

        const container = document.createElement('div');
        container.id = 'tvbot-top-ui';
        container.style.cssText = `
            position: fixed;
            top: 12px;
            left: 12px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: Arial, sans-serif;
            background: rgba(255,255,255,0.9);
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 6px 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        `;

        const saved = localStorage.getItem('tvbotTopUI');
        let uiState = { left: 12, top: 12, collapsed: false };
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (typeof p.left === 'number') uiState.left = p.left;
                if (typeof p.top === 'number') uiState.top = p.top;
                if (typeof p.collapsed === 'boolean') uiState.collapsed = p.collapsed;
            } catch (e) {}
        }
        container.style.left = uiState.left + 'px';
        container.style.top = uiState.top + 'px';

        const dragHandle = document.createElement('div');
        dragHandle.style.cssText = `
            width: 12px;
            height: 24px;
            margin-right: 6px;
            background: repeating-linear-gradient(90deg,#cbd5e1 0,#cbd5e1 2px,transparent 2px,transparent 4px);
            cursor: move;
            border-radius: 2px;
        `;

        const backBtn = document.createElement('div');
        backBtn.id = 'tvbot-back-btn';
        backBtn.innerHTML = '<i class="bi bi-arrow-left-circle"></i> Back';
        backBtn.style.cssText = `
            background: rgba(66, 185, 131, 0.9);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s;
        `;
        backBtn.onmouseover = () => backBtn.style.background = '#3aa876';
        backBtn.onmouseout = () => backBtn.style.background = 'rgba(66, 185, 131, 0.9)';
        backBtn.onclick = () => {
            if (confirm('Go back to My Trees? Any unsaved changes will be lost.')) {
                window.location.href = '/myTrees.html';
            }
        };

        const collapseBtn = document.createElement('button');
        collapseBtn.id = 'tvbot-collapse';
        collapseBtn.className = 'btn btn-sm btn-outline-secondary';
        collapseBtn.innerText = uiState.collapsed ? 'Expand' : 'Collapse';
        collapseBtn.style.height = '30px';

        // Project Selector
        const projectWrapper = document.createElement('div');
        projectWrapper.style.cssText = `
            background: white;
            padding: 5px 15px;
            border-radius: 20px;
            border: 2px solid #42b983;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        const label = document.createElement('span');
        label.innerText = "Project:";
        label.style.fontSize = "12px";
        label.style.color = "#666";
        label.style.fontWeight = "bold";

        const select = document.createElement('select');
        select.id = 'global-project-select';
        select.className = 'form-select form-select-sm';
        select.style.border = "none";
        select.style.padding = "0 25px 0 5px";
        select.style.fontSize = "14px";
        select.style.fontWeight = "bold";
        select.style.background = "transparent";
        select.style.outline = "none";
        select.style.cursor = "pointer";

        select.onchange = (e) => {
            const val = e.target.value;
            // Sync to native Project Manager if it exists
            const el = document.getElementById('project-manager-box');
            if (el && (el.__vue_app__ || el.__vue__)) {
                const app = el.__vue_app__ ? el.__vue_app__._instance.proxy : el.__vue__;
                if (app && app.projectList) {
                    const idx = app.projectList.findIndex(p => p.projectId === val);
                    if (idx !== -1) app.currentProjectIndex = idx;
                }
            }
        };

        // Populate projects
        window.axios.get('/tvbot/getTreeList').then(res => {
            const projects = res.data.projectList || [];
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.projectId;
                opt.innerText = p.projectName === 'Default Project' ? 'Default Project' : p.projectName;
                select.appendChild(opt);
            });
            
            // Sync with current selection
            const urlParams = new URLSearchParams(window.location.search);
            const urlPid = urlParams.get('projectId');
            if (urlPid) {
                select.value = urlPid.toLowerCase() === 'default' ? 'default' : urlPid;
            } else {
                select.value = 'default';
            }
        });

        // Add "New" button to selector
        const addBtn = document.createElement('i');
        addBtn.className = 'bi bi-plus-circle-fill';
        addBtn.style.color = '#42b983';
        addBtn.style.cursor = 'pointer';
        addBtn.title = "New Project";
        addBtn.onclick = async () => {
            const name = prompt("Enter new project name:");
            if (!name) return;
            const res = await window.axios.post('/api/create_project', { projectName: name });
            if (res.data.success) location.reload();
        };

        projectWrapper.appendChild(label);
        projectWrapper.appendChild(select);
        projectWrapper.appendChild(addBtn);

        const layoutWrapper = document.createElement('div');
        layoutWrapper.style.cssText = `
            background: white;
            padding: 5px 15px;
            border-radius: 20px;
            border: 2px solid #42b983;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;

        const layoutLabel = document.createElement('span');
        layoutLabel.innerText = "Layout:";
        layoutLabel.style.fontSize = "12px";
        layoutLabel.style.color = "#666";
        layoutLabel.style.fontWeight = "bold";

        const layoutSelect = document.createElement('select');
        layoutSelect.id = 'global-layout-select';
        layoutSelect.className = 'form-select form-select-sm';
        layoutSelect.style.border = "none";
        layoutSelect.style.padding = "0 25px 0 5px";
        layoutSelect.style.fontSize = "14px";
        layoutSelect.style.fontWeight = "bold";
        layoutSelect.style.background = "transparent";
        layoutSelect.style.outline = "none";
        layoutSelect.style.cursor = "pointer";

        const layoutOptions = [
            { value: 'normalTree', label: 'Normal' },
            { value: 'circleTree', label: 'Circular' },
            { value: 'unrootedTree', label: 'Unrooted' }
        ];
        layoutOptions.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.innerText = o.label;
            layoutSelect.appendChild(opt);
        });

        const currentPath = (window.location.pathname || '').toLowerCase();
        if (currentPath.includes('circletree')) layoutSelect.value = 'circleTree';
        else if (currentPath.includes('unrootedtree')) layoutSelect.value = 'unrootedTree';
        else layoutSelect.value = 'normalTree';

        layoutSelect.onchange = async (e) => {
            const targetType = e.target.value;
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (!app || typeof app.exportOriginalJsonData !== 'function' || typeof app.onLoadNewFile !== 'function') {
                alert('Tree is not ready yet.');
                return;
            }
            try {
                const payload = app.exportOriginalJsonData(true);
                if (!payload || typeof payload !== 'object') {
                    alert('Failed to export current state for switching layout.');
                    return;
                }
                payload.plotType = targetType;
                const res = await fetch('/api/layout_state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (!json || !json.success || !json.token) {
                    alert('Failed to prepare layout switch: ' + (json && json.error ? json.error : 'unknown error'));
                    return;
                }

                const pmEl = document.getElementById('project-manager-box');
                const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                    ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                    : null;
                const projectId = pmApp && pmApp.projectList && pmApp.currentProjectIndex !== undefined
                    ? (pmApp.projectList[pmApp.currentProjectIndex] && pmApp.projectList[pmApp.currentProjectIndex].projectId)
                    : (document.getElementById('global-project-select') ? document.getElementById('global-project-select').value : 'default');
                const treeTitle = pmApp && pmApp.treeTitle ? pmApp.treeTitle : 'tree';

                const targetHtml = targetType === 'circleTree' ? 'circleTree.html' : (targetType === 'unrootedTree' ? 'unrootedTree.html' : 'normalTree.html');
                const originalJsonDataUri = `/api/layout_state/${encodeURIComponent(json.token)}`;
                const url = `/${targetHtml}?originalJsonDataUri=${encodeURIComponent(originalJsonDataUri)}&projectId=${encodeURIComponent(projectId || 'default')}&treeTitle=${encodeURIComponent(treeTitle)}&layoutSwitch=1`;
                try {
                    window.__tvbot_skip_beforeunload = true;
                    sessionStorage.setItem('tvbot_skip_beforeunload_once', '1');
                } catch (e) {}
                window.location.href = url;
            } catch (err) {
                alert('Layout switch failed: ' + err.message);
            }
        };

        layoutWrapper.appendChild(layoutLabel);
        layoutWrapper.appendChild(layoutSelect);

        const annotWrapper = document.createElement('div');
        annotWrapper.style.cssText = `
            background: white;
            padding: 5px 15px;
            border-radius: 20px;
            border: 2px solid #42b983;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;

        const annotBtn = document.createElement('button');
        annotBtn.id = 'tvbot-annotate-toggle';
        annotBtn.className = 'btn btn-sm btn-outline-success';
        annotBtn.innerText = 'Annotate';
        annotBtn.style.height = '30px';

        const toolSelect = document.createElement('select');
        toolSelect.id = 'tvbot-annotate-tool';
        toolSelect.className = 'form-select form-select-sm';
        toolSelect.style.border = 'none';
        toolSelect.style.padding = '0 25px 0 5px';
        toolSelect.style.fontSize = '14px';
        toolSelect.style.fontWeight = 'bold';
        toolSelect.style.background = 'transparent';
        toolSelect.style.outline = 'none';
        toolSelect.style.cursor = 'pointer';
        [
            { v: 'pen', t: 'Pen' },
            { v: 'line', t: 'Line' },
            { v: 'rect', t: 'Rect' },
            { v: 'circle', t: 'Circle' },
            { v: 'text', t: 'Text' }
        ].forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.v;
            opt.innerText = o.t;
            toolSelect.appendChild(opt);
        });

        const colorInput = document.createElement('input');
        colorInput.id = 'tvbot-annotate-color';
        colorInput.type = 'color';
        colorInput.value = '#ff3b30';
        colorInput.style.width = '34px';
        colorInput.style.height = '30px';
        colorInput.style.border = 'none';
        colorInput.style.padding = '0';
        colorInput.style.background = 'transparent';

        const widthInput = document.createElement('input');
        widthInput.id = 'tvbot-annotate-width';
        widthInput.type = 'number';
        widthInput.min = '1';
        widthInput.max = '20';
        widthInput.value = '2';
        widthInput.style.width = '52px';
        widthInput.style.height = '30px';

        const fontInput = document.createElement('input');
        fontInput.id = 'tvbot-annotate-font';
        fontInput.type = 'number';
        fontInput.min = '8';
        fontInput.max = '96';
        fontInput.value = '16';
        fontInput.style.width = '56px';
        fontInput.style.height = '30px';

        const undoBtn = document.createElement('button');
        undoBtn.id = 'tvbot-annotate-undo';
        undoBtn.className = 'btn btn-sm btn-outline-secondary';
        undoBtn.innerText = 'Undo';
        undoBtn.style.height = '30px';

        const italicLabel = document.createElement('label');
        italicLabel.style.display = 'flex';
        italicLabel.style.alignItems = 'center';
        italicLabel.style.gap = '6px';
        italicLabel.style.margin = '0';
        italicLabel.style.fontSize = '12px';
        italicLabel.style.color = '#666';
        italicLabel.style.fontWeight = 'bold';
        italicLabel.style.userSelect = 'none';

        const italicCb = document.createElement('input');
        italicCb.id = 'tvbot-annotate-italic';
        italicCb.type = 'checkbox';

        const italicTxt = document.createElement('span');
        italicTxt.innerText = 'Italic';

        italicLabel.appendChild(italicCb);
        italicLabel.appendChild(italicTxt);

        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'tvbot-annotate-delete';
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerText = 'Delete';
        deleteBtn.style.height = '30px';

        const deselectBtn = document.createElement('button');
        deselectBtn.id = 'tvbot-annotate-deselect';
        deselectBtn.className = 'btn btn-sm btn-outline-secondary';
        deselectBtn.innerText = 'Deselect';
        deselectBtn.style.height = '30px';

        const clearBtn = document.createElement('button');
        clearBtn.id = 'tvbot-annotate-clear';
        clearBtn.className = 'btn btn-sm btn-outline-danger';
        clearBtn.innerText = 'Clear';
        clearBtn.style.height = '30px';

        const exportLabel = document.createElement('label');
        exportLabel.style.display = 'flex';
        exportLabel.style.alignItems = 'center';
        exportLabel.style.gap = '6px';
        exportLabel.style.margin = '0';
        exportLabel.style.fontSize = '12px';
        exportLabel.style.color = '#666';
        exportLabel.style.fontWeight = 'bold';
        exportLabel.style.userSelect = 'none';

        const exportCb = document.createElement('input');
        exportCb.id = 'tvbot-annotate-export';
        exportCb.type = 'checkbox';
        exportCb.checked = true;

        const exportTxt = document.createElement('span');
        exportTxt.innerText = 'Export';

        exportLabel.appendChild(exportCb);
        exportLabel.appendChild(exportTxt);

        // exportLabel already exists (Include manual annotations on export)

        annotWrapper.appendChild(annotBtn);
        annotWrapper.appendChild(toolSelect);
        annotWrapper.appendChild(colorInput);
        annotWrapper.appendChild(widthInput);
        annotWrapper.appendChild(fontInput);
        annotWrapper.appendChild(italicLabel);
        annotWrapper.appendChild(undoBtn);
        annotWrapper.appendChild(deleteBtn);
        annotWrapper.appendChild(deselectBtn);
        annotWrapper.appendChild(clearBtn);
        annotWrapper.appendChild(exportLabel);

        const treeOpsWrapper = document.createElement('div');
        treeOpsWrapper.style.cssText = `
            background: white;
            padding: 5px 15px;
            border-radius: 20px;
            border: 2px solid #42b983;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;

        const treeUndoBtn = document.createElement('button');
        treeUndoBtn.id = 'tvbot-tree-undo';
        treeUndoBtn.className = 'btn btn-sm btn-outline-secondary';
        treeUndoBtn.innerText = 'Undo Clade';
        treeUndoBtn.style.height = '30px';
        treeUndoBtn.onclick = (e) => {
            e.preventDefault();
            if (window.__tvbot_treeUndo && typeof window.__tvbot_treeUndo.undo === 'function') {
                window.__tvbot_treeUndo.undo();
            } else {
                alert('Undo is not ready yet.');
            }
        };

        const leafBtn = document.createElement('button');
        leafBtn.id = 'tvbot-export-pruned-leaf-ids';
        leafBtn.className = 'btn btn-sm btn-outline-primary';
        leafBtn.innerText = 'Leaf IDs';
        leafBtn.style.height = '30px';
        leafBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof window.__tvbot_exportPrunedLeafIds === 'function') {
                window.__tvbot_exportPrunedLeafIds();
            } else {
                alert('Leaf export is not ready yet.');
            }
        };

        treeOpsWrapper.appendChild(treeUndoBtn);
        treeOpsWrapper.appendChild(leafBtn);

        container.appendChild(dragHandle);
        container.appendChild(backBtn);
        container.appendChild(collapseBtn);
        container.appendChild(projectWrapper);
        container.appendChild(layoutWrapper);
        container.appendChild(treeOpsWrapper);
        container.appendChild(annotWrapper);
        
        // Ensure bootstrap icons are available
        if (!document.querySelector('link[href*="bootstrap-icons"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css';
            document.head.appendChild(link);
        }
        
        document.body.appendChild(container);

        const applyCollapsed = () => {
            const hidden = uiState.collapsed;
            projectWrapper.style.display = hidden ? 'none' : 'flex';
            layoutWrapper.style.display = hidden ? 'none' : 'flex';
            treeOpsWrapper.style.display = hidden ? 'none' : 'flex';
            annotWrapper.style.display = hidden ? 'none' : 'flex';
            collapseBtn.innerText = hidden ? 'Expand' : 'Collapse';
        };
        applyCollapsed();
        collapseBtn.onclick = (e) => {
            e.preventDefault();
            uiState.collapsed = !uiState.collapsed;
            applyCollapsed();
            localStorage.setItem('tvbotTopUI', JSON.stringify(uiState));
        };

        let dragging = false;
        let start = { x: 0, y: 0 };
        let origin = { x: uiState.left, y: uiState.top };
        const onMove = (e) => {
            if (!dragging) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const nx = Math.max(0, origin.x + dx);
            const ny = Math.max(0, origin.y + dy);
            container.style.left = nx + 'px';
            container.style.top = ny + 'px';
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            uiState.left = parseInt(container.style.left, 10) || 12;
            uiState.top = parseInt(container.style.top, 10) || 12;
            localStorage.setItem('tvbotTopUI', JSON.stringify(uiState));
            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onUp, true);
        };
        dragHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            dragging = true;
            start = { x: e.clientX, y: e.clientY };
            origin = { x: parseInt(container.style.left, 10) || 12, y: parseInt(container.style.top, 10) || 12 };
            document.addEventListener('pointermove', onMove, true);
            document.addEventListener('pointerup', onUp, true);
        }, true);

        const refreshTreeOpsState = () => {
            const btn = document.getElementById('tvbot-tree-undo');
            if (!btn) return;
            const size = window.__tvbot_treeUndo && Array.isArray(window.__tvbot_treeUndo.stack) ? window.__tvbot_treeUndo.stack.length : 0;
            btn.disabled = size <= 0;
            btn.title = size > 0 ? `Undo last clade deletion (${size})` : 'No undo history';
        };
        refreshTreeOpsState();
        setInterval(refreshTreeOpsState, 600);
    }

    function injectMainUIStyles() {
        if (document.getElementById('tvbot-ui-style')) return;
        const style = document.createElement('style');
        style.id = 'tvbot-ui-style';
        style.textContent = `
#app input, #app select {
  min-height: 30px !important;
  height: 30px !important;
  line-height: 30px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
#app input[type="text"], #app input[type="number"] {
  font-size: 14px !important;
}
#project-manager-box input, #project-manager-box select {
  min-height: 30px !important;
  height: 30px !important;
  line-height: 30px !important;
}
`;
        document.head.appendChild(style);
    }

    function getManualAnnotState() {
        if (!window.__tvbot_manual_annot) {
            window.__tvbot_manual_annot = {
                enabled: false,
                tool: 'pen',
                color: '#ff3b30',
                width: 2,
                fontSize: 16,
                italic: false,
                includeInExport: true,
                drawing: false,
                dragging: false,
                draggingEl: null,
                dragStart: null,
                dragOrigin: null,
                currentEl: null,
                start: null,
                pathD: '',
                selected: [],
                undo: []
            };
        }
        return window.__tvbot_manual_annot;
    }

    function getAnnotTarget(svg) {
        const mg = document.getElementById('maingroup');
        if (mg) return mg;
        const zg = svg.querySelector('g');
        return zg || svg;
    }

    function ensureManualAnnotLayer() {
        const svg = document.querySelector('svg#svg');
        if (!svg) return null;
        let g = document.getElementById('tvbot-manual-annot-layer');
        if (!g) {
            g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'tvbot-manual-annot-layer');
            g.setAttribute('pointer-events', 'none');
            const target = getAnnotTarget(svg);
            target.appendChild(g);
        }
        return g;
    }

    function getLocalPoint(svg, target, evt) {
        const pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        const ctm = target.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }

    function setupManualAnnot() {
        const state = getManualAnnotState();
        const svg = document.querySelector('svg#svg');
        if (!svg || svg._tvbotAnnot) return;
        svg._tvbotAnnot = true;

        const isAnnotEl = (el) => {
            return !!(el && el.getAttribute && el.getAttribute('data-tvbot-annot') === '1');
        };

        const getSelection = () => state.selected || [];

        const clearSelection = () => {
            const arr = getSelection();
            arr.forEach(el => {
                if (!el || !el.getAttribute) return;
                const prev = el.getAttribute('data-tvbot-prev-filter');
                if (prev !== null) {
                    if (prev === '') el.removeAttribute('filter');
                    else el.setAttribute('filter', prev);
                    el.removeAttribute('data-tvbot-prev-filter');
                }
                el.removeAttribute('data-tvbot-selected');
            });
            state.selected = [];
            updateAnnotControlUI();
        };

        const setSelected = (els) => {
            clearSelection();
            const unique = [];
            (els || []).forEach(el => {
                if (!el || !isAnnotEl(el)) return;
                if (unique.includes(el)) return;
                unique.push(el);
            });
            unique.forEach(el => {
                const currentFilter = el.getAttribute('filter');
                el.setAttribute('data-tvbot-prev-filter', currentFilter == null ? '' : currentFilter);
                el.setAttribute('filter', 'drop-shadow(0 0 2px #42b983)');
                el.setAttribute('data-tvbot-selected', '1');
            });
            state.selected = unique;
            updateAnnotControlUI();
        };

        const toggleSelected = (el) => {
            if (!el || !isAnnotEl(el)) return;
            const arr = getSelection().slice();
            const idx = arr.indexOf(el);
            if (idx !== -1) {
                const prev = el.getAttribute('data-tvbot-prev-filter');
                if (prev !== null) {
                    if (prev === '') el.removeAttribute('filter');
                    else el.setAttribute('filter', prev);
                    el.removeAttribute('data-tvbot-prev-filter');
                }
                el.removeAttribute('data-tvbot-selected');
                arr.splice(idx, 1);
            } else {
                const currentFilter = el.getAttribute('filter');
                el.setAttribute('data-tvbot-prev-filter', currentFilter == null ? '' : currentFilter);
                el.setAttribute('filter', 'drop-shadow(0 0 2px #42b983)');
                el.setAttribute('data-tvbot-selected', '1');
                arr.push(el);
            }
            state.selected = arr;
            updateAnnotControlUI();
        };

        const applyStyleToSelection = (opts) => {
            const arr = getSelection();
            if (!arr.length) return;
            arr.forEach(el => {
                const tag = (el.tagName || '').toLowerCase();
                if (opts.color) {
                    if (tag === 'text') el.setAttribute('fill', opts.color);
                    else el.setAttribute('stroke', opts.color);
                }
                if (opts.width != null && tag !== 'text') {
                    el.setAttribute('stroke-width', String(opts.width));
                }
                if (opts.fontSize != null && tag === 'text') {
                    el.setAttribute('font-size', String(opts.fontSize));
                }
                if (opts.italic != null && tag === 'text') {
                    el.setAttribute('font-style', opts.italic ? 'italic' : 'normal');
                }
            });
        };

        const getTranslate = (el) => {
            const t = el.getAttribute('transform') || '';
            const m = t.match(/translate\(\s*([-\d.]+)[ ,]([-\d.]+)\s*\)/);
            if (!m) return { x: 0, y: 0 };
            return { x: Number(m[1]) || 0, y: Number(m[2]) || 0 };
        };

        const setTranslate = (el, x, y) => {
            el.setAttribute('transform', `translate(${x},${y})`);
        };

        const stop = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const pointerDown = (e) => {
            if (!state.enabled) return;
            stop(e);
            const layer = ensureManualAnnotLayer();
            if (!layer) return;
            const target = getAnnotTarget(svg);
            const p = getLocalPoint(svg, target, e);

            if (e.target && e.target !== layer && layer.contains(e.target) && isAnnotEl(e.target)) {
                if (e.shiftKey) {
                    toggleSelected(e.target);
                } else {
                    setSelected([e.target]);
                }
                state.dragging = true;
                state.draggingEl = e.target;
                state.dragStart = p;
                state.dragOrigin = getTranslate(e.target);
                state.drawing = false;
                state.currentEl = null;
                state.pathD = '';
                return;
            }

            if (!e.shiftKey) clearSelection();
            state.start = p;
            state.drawing = true;

            if (state.tool === 'text') {
                const text = prompt('Text:');
                state.drawing = false;
                if (!text) return;
                const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                t.setAttribute('x', String(p.x));
                t.setAttribute('y', String(p.y));
                t.setAttribute('fill', state.color);
                t.setAttribute('font-size', String(state.fontSize));
                t.setAttribute('font-family', 'Arial, sans-serif');
                t.setAttribute('font-style', state.italic ? 'italic' : 'normal');
                t.setAttribute('data-tvbot-annot', '1');
                t.textContent = text;
                layer.appendChild(t);
                state.undo.push(t);
                setSelected([t]);
                return;
            }

            if (state.tool === 'pen') {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                state.pathD = `M ${p.x} ${p.y}`;
                path.setAttribute('d', state.pathD);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', state.color);
                path.setAttribute('stroke-width', String(state.width));
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('data-tvbot-annot', '1');
                layer.appendChild(path);
                state.currentEl = path;
                return;
            }

            if (state.tool === 'line') {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', String(p.x));
                line.setAttribute('y1', String(p.y));
                line.setAttribute('x2', String(p.x));
                line.setAttribute('y2', String(p.y));
                line.setAttribute('stroke', state.color);
                line.setAttribute('stroke-width', String(state.width));
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('data-tvbot-annot', '1');
                layer.appendChild(line);
                state.currentEl = line;
                return;
            }

            if (state.tool === 'rect') {
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('x', String(p.x));
                r.setAttribute('y', String(p.y));
                r.setAttribute('width', '0');
                r.setAttribute('height', '0');
                r.setAttribute('fill', 'none');
                r.setAttribute('stroke', state.color);
                r.setAttribute('stroke-width', String(state.width));
                r.setAttribute('data-tvbot-annot', '1');
                layer.appendChild(r);
                state.currentEl = r;
                return;
            }

            if (state.tool === 'circle') {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', String(p.x));
                c.setAttribute('cy', String(p.y));
                c.setAttribute('r', '0');
                c.setAttribute('fill', 'none');
                c.setAttribute('stroke', state.color);
                c.setAttribute('stroke-width', String(state.width));
                c.setAttribute('data-tvbot-annot', '1');
                layer.appendChild(c);
                state.currentEl = c;
                return;
            }
        };

        const pointerMove = (e) => {
            if (!state.enabled) return;
            stop(e);
            const target = getAnnotTarget(svg);
            const p = getLocalPoint(svg, target, e);

            if (state.dragging && state.draggingEl && state.dragStart && state.dragOrigin) {
                const dx = p.x - state.dragStart.x;
                const dy = p.y - state.dragStart.y;
                setTranslate(state.draggingEl, state.dragOrigin.x + dx, state.dragOrigin.y + dy);
                return;
            }

            if (!state.drawing || !state.currentEl) return;

            if (state.tool === 'pen') {
                state.pathD += ` L ${p.x} ${p.y}`;
                state.currentEl.setAttribute('d', state.pathD);
                return;
            }

            if (state.tool === 'line') {
                state.currentEl.setAttribute('x2', String(p.x));
                state.currentEl.setAttribute('y2', String(p.y));
                return;
            }

            if (state.tool === 'rect') {
                const x = Math.min(state.start.x, p.x);
                const y = Math.min(state.start.y, p.y);
                const w = Math.abs(p.x - state.start.x);
                const h = Math.abs(p.y - state.start.y);
                state.currentEl.setAttribute('x', String(x));
                state.currentEl.setAttribute('y', String(y));
                state.currentEl.setAttribute('width', String(w));
                state.currentEl.setAttribute('height', String(h));
                return;
            }

            if (state.tool === 'circle') {
                const dx = p.x - state.start.x;
                const dy = p.y - state.start.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                state.currentEl.setAttribute('r', String(r));
            }
        };

        const pointerUp = (e) => {
            if (!state.enabled) return;
            stop(e);
            if (state.dragging) {
                state.dragging = false;
                state.draggingEl = null;
                state.dragStart = null;
                state.dragOrigin = null;
                return;
            }
            if (!state.drawing) return;
            state.drawing = false;
            if (state.currentEl) {
                state.undo.push(state.currentEl);
                setSelected([state.currentEl]);
                state.currentEl = null;
                state.pathD = '';
            }
        };

        svg.addEventListener('pointerdown', pointerDown, true);
        svg.addEventListener('pointermove', pointerMove, true);
        svg.addEventListener('pointerup', pointerUp, true);
        svg.addEventListener('pointercancel', pointerUp, true);

        const hookControls = () => {
            const btn = document.getElementById('tvbot-annotate-toggle');
            const tool = document.getElementById('tvbot-annotate-tool');
            const color = document.getElementById('tvbot-annotate-color');
            const w = document.getElementById('tvbot-annotate-width');
            const f = document.getElementById('tvbot-annotate-font');
            const italic = document.getElementById('tvbot-annotate-italic');
            const del = document.getElementById('tvbot-annotate-delete');
            const deselect = document.getElementById('tvbot-annotate-deselect');
            const undo = document.getElementById('tvbot-annotate-undo');
            const clear = document.getElementById('tvbot-annotate-clear');
            const ex = document.getElementById('tvbot-annotate-export');
            if (!btn || btn._tvbotHooked) return false;
            btn._tvbotHooked = true;

            const updateBtn = () => {
                btn.className = state.enabled ? 'btn btn-sm btn-success' : 'btn btn-sm btn-outline-success';
                svg.style.cursor = state.enabled ? 'crosshair' : '';
                const layer = ensureManualAnnotLayer();
                if (layer) layer.setAttribute('pointer-events', state.enabled ? 'visiblePainted' : 'none');
                if (!state.enabled) {
                    state.drawing = false;
                    state.currentEl = null;
                    state.pathD = '';
                    state.dragging = false;
                    state.draggingEl = null;
                    state.dragStart = null;
                    state.dragOrigin = null;
                    clearSelection();
                }
            };

            btn.onclick = (e) => {
                e.preventDefault();
                state.enabled = !state.enabled;
                updateBtn();
            };

            tool.onchange = () => { state.tool = tool.value; };
            color.onchange = () => {
                state.color = color.value;
                applyStyleToSelection({ color: state.color });
            };
            w.onchange = () => {
                state.width = Math.max(1, Math.min(50, Number(w.value) || 2));
                w.value = String(state.width);
                applyStyleToSelection({ width: state.width });
            };
            f.onchange = () => {
                state.fontSize = Math.max(8, Math.min(200, Number(f.value) || 16));
                f.value = String(state.fontSize);
                applyStyleToSelection({ fontSize: state.fontSize });
            };
            if (italic) {
                italic.onchange = () => {
                    state.italic = !!italic.checked;
                    applyStyleToSelection({ italic: state.italic });
                };
            }
            ex.onchange = () => { state.includeInExport = !!ex.checked; };

            if (del) {
                del.onclick = (e) => {
                    e.preventDefault();
                    const arr = getSelection().slice();
                    if (!arr.length) return;
                    arr.forEach(el => {
                        if (el && el.parentNode) el.parentNode.removeChild(el);
                    });
                    clearSelection();
                };
            }

            if (deselect) {
                deselect.onclick = (e) => {
                    e.preventDefault();
                    clearSelection();
                };
            }

            undo.onclick = (e) => {
                e.preventDefault();
                const el = state.undo.pop();
                if (el && el.parentNode) el.parentNode.removeChild(el);
            };

            clear.onclick = (e) => {
                e.preventDefault();
                const layer = ensureManualAnnotLayer();
                if (!layer) return;
                while (layer.firstChild) layer.removeChild(layer.firstChild);
                state.undo = [];
            };

            tool.value = state.tool;
            color.value = state.color;
            w.value = String(state.width);
            f.value = String(state.fontSize);
            if (italic) italic.checked = !!state.italic;
            ex.checked = !!state.includeInExport;
            updateBtn();
            updateAnnotControlUI();
            return true;
        };

        const updateAnnotControlUI = () => {
            const italic = document.getElementById('tvbot-annotate-italic');
            const del = document.getElementById('tvbot-annotate-delete');
            const deselect = document.getElementById('tvbot-annotate-deselect');
            const selectedCount = getSelection().length;
            if (del) del.disabled = selectedCount === 0;
            if (deselect) deselect.disabled = selectedCount === 0;
            if (italic) {
                const hasText = getSelection().some(el => (el.tagName || '').toLowerCase() === 'text');
                italic.disabled = !hasText;
            }
        };

        state._updateUI = updateAnnotControlUI;

        const ctlTimer = setInterval(() => {
            if (hookControls()) clearInterval(ctlTimer);
        }, 200);
    }

    // Intercept axios.post to handle PDF/PNG export and native Save locally
    function setupExportIntercept() {
        if (!window.axios) return;
        
        const originalPost = window.axios.post;
        window.axios.post = function(url, data, config) {
            // 1. Handle PDF/PNG Export
            if (url.includes('/svg2others')) {
                const urlParams = new URLSearchParams(url.split('?')[1]);
                const format = urlParams.get('format') || 'pdf';
                const plotType = urlParams.get('plotType') || 'tree';
                
                return handleLocalExport(format, data, plotType);
            }

            // 2. Handle Native Save Button
            if (url.includes('/tvbot/saveOriginalJsonData')) {
                console.log("Intercepted native save request");
                try {
                    const postData = typeof data === 'string' ? JSON.parse(data) : (data || {});
                    const jsonData = typeof postData.jsonData === 'string' ? JSON.parse(postData.jsonData) : postData.jsonData;

                    const normalizeProjectId = (pid) => {
                        if (!pid) return 'default';
                        const s = String(pid).trim();
                        if (!s) return 'default';
                        if (s.toLowerCase() === 'default' || s.toLowerCase() === 'default project') return 'default';
                        return s;
                    };

                    const pmEl = document.getElementById('project-manager-box');
                    const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                        ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                        : null;

                    let pmProjectId = null;
                    if (pmApp && pmApp.projectList && pmApp.currentProjectIndex !== undefined) {
                        const current = pmApp.projectList[pmApp.currentProjectIndex];
                        if (current && current.projectId) pmProjectId = current.projectId;
                    }

                    let globalProjectId = null;
                    const globalSelect = document.getElementById('global-project-select');
                    if (globalSelect && globalSelect.value) globalProjectId = globalSelect.value;

                    const payloadProjectId = postData.projectId || postData.projectID || postData.project || null;
                    const resolvedProjectId = normalizeProjectId(pmProjectId || globalProjectId || payloadProjectId);

                    const treeName = postData.treeName || (pmApp && pmApp.treeTitle) || lastLoadedFilename || 'unnamed_tree';
                    
                    // Forward to our local stable API with project support
                    return originalPost('/tvbot/saveOriginalJsonData', {
                        treeName: treeName,
                        projectId: resolvedProjectId,
                        jsonData: jsonData
                    }).then(res => {
                        console.log("Local save successful via interception to project:", resolvedProjectId);
                        const app = window.normalTree || window.circleTree || window.unrootedTree;
                        if (app && app.showMessageBox) {
                            app.showMessageBox("cuIcon-check", "Saved successfully to project: " + resolvedProjectId, "success");
                        }
                        return res;
                    }).catch(err => {
                        console.error("Local save failed:", err);
                        alert("Save failed: " + err.message);
                        throw err;
                    });
                } catch (e) {
                    console.error("Error parsing save data:", e);
                }
            }

            return originalPost.apply(this, arguments);
        };
    }

    async function handleLocalExport(format, svgString, plotType) {
        console.log("Intercepted export request for format:", format);
        
        const svgElement = document.querySelector('svg#svg');
        if (!svgElement) {
            alert("Error: SVG element not found.");
            return Promise.reject("SVG not found");
        }

        let fileName = "plot_" + new Date().getTime();
        const app = window.normalTree || window.circleTree || window.unrootedTree;
        if (app && app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
            const appFileName = app.figureData.export["Save figure"].fileName.value;
            if (appFileName) fileName = appFileName;
        }

        const state = getManualAnnotState();
        const layer = document.querySelector('#tvbot-manual-annot-layer');
        const prevDisplay = layer ? layer.style.display : '';
        const shouldHide = layer && state && state.includeInExport === false;
        if (shouldHide) layer.style.display = 'none';
        try {
            if (format === 'pdf') {
                return await exportToPDF(svgElement, fileName);
            }
            if (format === 'png' || format === 'transparent png') {
                return await exportToPNG(svgElement, fileName, format === 'transparent png');
            }
            alert("Format " + format + " is not yet supported in local mode.");
            return Promise.reject("Format not supported");
        } catch (err) {
            console.error("Export error:", err);
            alert("Failed to export: " + err.message);
            return Promise.reject(err);
        } finally {
            if (shouldHide) layer.style.display = prevDisplay;
        }
    }

    async function exportToPDF(svgElement, fileName, widthOverride, heightOverride) {
        await ensurePdfLibraries();
        const { jsPDF } = window.jspdf;

        const bbox = svgElement.getBBox();
        const width = widthOverride || svgElement.width.baseVal.value || bbox.width;
        const height = heightOverride || svgElement.height.baseVal.value || bbox.height;

        const doc = new jsPDF(width > height ? 'l' : 'p', 'pt', [width, height]);
        if (typeof doc.svg !== 'function') {
            throw new Error('PDF export engine is not ready (svg2pdf not loaded). Please refresh and try again.');
        }

        const svgNS = 'http://www.w3.org/2000/svg';
        const ensureEmbeddedFonts = async () => {
            if (doc.__tvbot_fonts_ready) return;
            doc.__tvbot_fonts_ready = true;
            if (!window.__tvbot_pdf_font_cache) window.__tvbot_pdf_font_cache = {};
            const cache = window.__tvbot_pdf_font_cache;

            const toB64 = (buf) => {
                const bytes = new Uint8Array(buf);
                const chunk = 0x8000;
                let binary = '';
                for (let i = 0; i < bytes.length; i += chunk) {
                    const slice = bytes.subarray(i, i + chunk);
                    binary += String.fromCharCode.apply(null, slice);
                }
                return btoa(binary);
            };

            const loadFont = async (key, url) => {
                if (cache[key]) return cache[key];
                const lsKey = `tvbot_pdf_font_${key}_v1`;
                try {
                    const saved = localStorage.getItem(lsKey);
                    if (saved && saved.length > 1000) {
                        cache[key] = saved;
                        return saved;
                    }
                } catch (e) {}

                const res = await fetch(url);
                if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
                const buf = await res.arrayBuffer();
                const b64 = toB64(buf);
                cache[key] = b64;
                try {
                    localStorage.setItem(lsKey, b64);
                } catch (e) {}
                return b64;
            };

            const family = 'Lato';
            const fonts = [
                { key: 'Lato-Regular', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf', style: 'normal' },
                { key: 'Lato-Italic', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Italic.ttf', style: 'italic' },
                { key: 'Lato-Bold', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Bold.ttf', style: 'bold' },
                { key: 'Lato-BoldItalic', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-BoldItalic.ttf', style: 'bolditalic' }
            ];

            try {
                const list = doc.getFontList ? doc.getFontList() : {};
                if (list[family]) {
                    doc.__tvbot_embedFontFamily = family;
                    return;
                }
                for (let i = 0; i < fonts.length; i++) {
                    const f = fonts[i];
                    const b64 = await loadFont(f.key, f.url);
                    const file = `${f.key}.ttf`;
                    doc.addFileToVFS(file, b64);
                    doc.addFont(file, family, f.style);
                }
                doc.__tvbot_embedFontFamily = family;
            } catch (e) {
                doc.__tvbot_embedFontFamily = null;
            }
        };
        const parseFirstNumber = (v) => {
            if (v == null) return 0;
            const s = String(v).trim();
            if (!s) return 0;
            const parts = s.split(/[\s,]+/);
            const n = parseFloat(parts[0]);
            return Number.isFinite(n) ? n : 0;
        };
        const parseColor = (c) => {
            if (!c) return null;
            const s = String(c).trim().toLowerCase();
            if (s === 'none' || s === 'transparent') return null;
            const rgb = s.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
            if (rgb) return { r: Math.round(parseFloat(rgb[1])), g: Math.round(parseFloat(rgb[2])), b: Math.round(parseFloat(rgb[3])) };
            const rgba = s.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
            if (rgba) {
                const a = parseFloat(rgba[4]);
                if (!Number.isFinite(a) || a <= 0) return null;
                return { r: Math.round(parseFloat(rgba[1])), g: Math.round(parseFloat(rgba[2])), b: Math.round(parseFloat(rgba[3])) };
            }
            const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (hex) {
                let h = hex[1];
                if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
                return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
            }
            return null;
        };
        const getUnitsPerPx = () => {
            const ctm = svgElement.getScreenCTM && svgElement.getScreenCTM();
            if (!ctm || !ctm.inverse) return 1;
            const inv = ctm.inverse();
            const p0 = svgElement.createSVGPoint();
            p0.x = 0; p0.y = 0;
            const p1 = svgElement.createSVGPoint();
            p1.x = 1; p1.y = 0;
            const p2 = svgElement.createSVGPoint();
            p2.x = 0; p2.y = 1;
            const u0 = p0.matrixTransform(inv);
            const u1 = p1.matrixTransform(inv);
            const u2 = p2.matrixTransform(inv);
            const dx = Math.abs(u1.x - u0.x);
            const dy = Math.abs(u2.y - u0.y);
            return { x: dx > 0 ? dx : 1, y: dy > 0 ? dy : 1 };
        };
        const unitsPerPx = getUnitsPerPx();
        const getUserPoint = (textEl) => {
            const svgCTM = svgElement.getScreenCTM && svgElement.getScreenCTM();
            const nodeCTM = textEl.getScreenCTM && textEl.getScreenCTM();
            if (!svgCTM || !nodeCTM || !svgCTM.inverse) return null;
            const inv = svgCTM.inverse();
            const x0 = parseFirstNumber(textEl.getAttribute('x')) + parseFirstNumber(textEl.getAttribute('dx'));
            const y0 = parseFirstNumber(textEl.getAttribute('y')) + parseFirstNumber(textEl.getAttribute('dy'));
            const p = svgElement.createSVGPoint();
            p.x = x0;
            p.y = y0;
            const pScreen = p.matrixTransform(nodeCTM);
            const pUser = pScreen.matrixTransform(inv);
            return { x: pUser.x, y: pUser.y };
        };
        const getFontSizeUserUnits = (textEl) => {
            const attr = textEl.getAttribute('font-size');
            if (attr) {
                const n = parseFloat(attr);
                if (Number.isFinite(n)) return n;
            }
            const styleAttr = textEl.getAttribute('style') || '';
            const m = styleAttr.match(/font-size\s*:\s*([^;]+)/i);
            if (m && m[1]) {
                const raw = m[1].trim();
                const n = parseFloat(raw);
                if (!Number.isFinite(n)) return 12;
                if (/[a-z%]+$/i.test(raw)) return n * unitsPerPx.y;
                return n;
            }
            const cs = window.getComputedStyle ? window.getComputedStyle(textEl) : null;
            const px = cs && cs.fontSize ? parseFloat(cs.fontSize) : NaN;
            return Number.isFinite(px) ? px * unitsPerPx.y : 12;
        };
        const getTextPaint = (textEl) => {
            const cs = window.getComputedStyle ? window.getComputedStyle(textEl) : null;
            const fill = cs ? cs.fill : (textEl.getAttribute('fill') || '');
            const c = parseColor(fill);
            const opacity = cs && cs.opacity ? parseFloat(cs.opacity) : NaN;
            if (Number.isFinite(opacity) && opacity <= 0) return null;
            const vis = cs ? cs.visibility : '';
            const disp = cs ? cs.display : '';
            if (vis === 'hidden' || disp === 'none') return null;
            return {
                color: c || { r: 0, g: 0, b: 0 },
                fontStyle: cs ? cs.fontStyle : '',
                fontWeight: cs ? cs.fontWeight : '',
                fontFamily: cs ? cs.fontFamily : '',
                textAnchor: cs ? cs.textAnchor : (textEl.getAttribute('text-anchor') || '')
            };
        };
        const getDesiredTextWidthUserUnits = (textEl) => {
            if (textEl.getBoundingClientRect) {
                const r = textEl.getBoundingClientRect();
                if (r && Number.isFinite(r.width) && r.width > 0) return r.width * unitsPerPx.x;
            }
            return null;
        };
        const mapToPdfFont = (fontFamily) => {
            const s = String(fontFamily || '').toLowerCase();
            if (!s) return 'helvetica';
            if (s.includes('courier') || s.includes('monospace') || s.includes('consolas') || s.includes('menlo')) return 'courier';
            if (s.includes('times') || s.includes('serif')) return 'times';
            if (s.includes('arial') || s.includes('helvetica') || s.includes('sans')) return 'helvetica';
            return 'helvetica';
        };

        const allTexts = Array.from(svgElement.querySelectorAll('text'));
        const textDrawOps = [];
        allTexts.forEach(t => {
            const txt = t.textContent != null ? String(t.textContent) : '';
            if (!txt.trim()) return;
            const paint = getTextPaint(t);
            if (!paint) return;
            const pos = getUserPoint(t);
            if (!pos) return;
            const fs = getFontSizeUserUnits(t);
            const desiredWidth = getDesiredTextWidthUserUnits(t);
            const alignRaw = String(paint.textAnchor || '').toLowerCase();
            const align = alignRaw === 'middle' ? 'center' : (alignRaw === 'end' ? 'right' : 'left');
            textDrawOps.push({
                text: txt,
                x: pos.x,
                y: pos.y,
                fontSize: fs,
                color: paint.color,
                fontStyle: paint.fontStyle,
                fontWeight: paint.fontWeight,
                fontFamily: paint.fontFamily,
                desiredWidth: desiredWidth,
                align: align
            });
        });

        const exportSvg = svgElement.cloneNode(true);
        if (!exportSvg.getAttribute('xmlns')) exportSvg.setAttribute('xmlns', svgNS);
        const textInClone = exportSvg.querySelectorAll('text');
        textInClone.forEach(t => t.setAttribute('display', 'none'));

        await ensureEmbeddedFonts();
        return doc.svg(exportSvg, { width: width, height: height }).then(() => {
            const fontList = doc.getFontList ? doc.getFontList() : {};
            textDrawOps.forEach(op => {
                doc.setTextColor(op.color.r, op.color.g, op.color.b);
                let style = 'normal';
                const w = String(op.fontWeight || '').toLowerCase();
                const isBold = w === 'bold' || parseInt(w) >= 700;
                const isItalic = String(op.fontStyle || '').toLowerCase().includes('italic');
                if (isBold && isItalic) style = 'bolditalic';
                else if (isBold) style = 'bold';
                else if (isItalic) style = 'italic';
                const preferred = doc.__tvbot_embedFontFamily || null;
                const baseFont = preferred || mapToPdfFont(op.fontFamily);
                const hasFont = !!fontList[baseFont];
                try {
                    doc.setFont(hasFont ? baseFont : 'helvetica', style);
                } catch (e) {
                    doc.setFont(hasFont ? baseFont : 'helvetica', 'normal');
                }
                doc.setFontSize(op.fontSize);
                if (typeof doc.setCharSpace === 'function') {
                    doc.setCharSpace(0);
                    const glyphCount = Array.from(op.text).length;
                    if (glyphCount > 1 && Number.isFinite(op.desiredWidth) && op.desiredWidth > 0) {
                        const currentW = doc.getTextWidth(op.text);
                        const diff = op.desiredWidth - currentW;
                        if (diff > 0.2) {
                            const cs = diff / (glyphCount - 1);
                            if (Number.isFinite(cs) && cs > 0) doc.setCharSpace(cs);
                        }
                    }
                }
                doc.text(op.text, op.x, op.y, { align: op.align });
                if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0);
            });
            doc.save(fileName + ".pdf");
            return { data: { success: true } };
        });
    }

    async function exportToPNG(svgElement, fileName, transparent, widthOverride, heightOverride) {
        return new Promise((resolve, reject) => {
            const waitFonts = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve();
            const bbox = svgElement.getBBox();
            const width = widthOverride || svgElement.width.baseVal.value || bbox.width;
            const height = heightOverride || svgElement.height.baseVal.value || bbox.height;
            
            const canvas = document.createElement('canvas');
            canvas.width = width * 2; // High resolution
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            
            if (!transparent) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                
                const link = document.createElement('a');
                link.download = fileName + ".png";
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                resolve({ data: { success: true } });
            };
            img.onerror = reject;
            waitFonts.finally(() => { img.src = url; });
        });
    }

    // Load PDF libraries
    function loadPDFLibraries() {
        ensurePdfLibraries().catch(() => {});
    }

    function loadScriptOnce(src) {
        if (!window.__tvbot_script_promises) window.__tvbot_script_promises = {};
        const cache = window.__tvbot_script_promises;
        if (cache[src]) return cache[src];
        cache[src] = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing && existing.getAttribute('data-tvbot-loaded') === '1') {
                resolve();
                return;
            }
            const script = existing || document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                script.setAttribute('data-tvbot-loaded', '1');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load: ' + src));
            if (!existing) document.head.appendChild(script);
        });
        return cache[src];
    }

    async function ensurePdfLibraries() {
        if (window.__tvbot_pdf_ready) return;
        await loadScriptOnce('/static/js/jspdf.umd.min.js');
        try {
            await loadScriptOnce('https://unpkg.com/svg2pdf.js@2.2.0/dist/svg2pdf.umd.min.js');
        } catch (e) {
            await loadScriptOnce('/static/js/svg2pdf.umd.min.js');
        }
        if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF not available');
        const test = new window.jspdf.jsPDF();
        if (typeof test.svg !== 'function') {
            try {
                await loadScriptOnce('https://unpkg.com/svg2pdf.js@2.2.0/dist/svg2pdf.umd.min.js?reload=1');
            } catch (e) {
                await loadScriptOnce('/static/js/svg2pdf.umd.min.js?reload=1');
            }
        }
        const test2 = new window.jspdf.jsPDF();
        if (typeof test2.svg !== 'function') throw new Error('svg2pdf not available');
        window.__tvbot_pdf_ready = true;
    }

    let lastLoadedFilename = "";

    function setupTreeUndo(app) {
        if (!app || typeof app.exportOriginalJsonData !== 'function') return;
        if (window.__tvbot_treeUndo && window.__tvbot_treeUndo._app === app) return;

        const persistUndoKey = 'tvbot_tree_undo_tokens';
        const persistRedoKey = 'tvbot_tree_redo_tokens';
        const loadTokens = (key) => {
            try {
                const raw = sessionStorage.getItem(key);
                if (!raw) return [];
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
            } catch (e) {
                return [];
            }
        };
        const saveTokens = (key, arr) => {
            try {
                sessionStorage.setItem(key, JSON.stringify(arr));
            } catch (e) {}
        };

        const deepClone = (obj) => {
            try {
                return JSON.parse(JSON.stringify(obj));
            } catch (e) {
                return null;
            }
        };

        const getLeaves = () => {
            const h = app.treeHierarchy;
            if (!h) return [];
            if (typeof h.leaves === 'function') return h.leaves() || [];
            if (typeof h.descendants === 'function') return (h.descendants() || []).filter(n => !n.children || n.children.length === 0);
            return [];
        };
        const getProjectId = () => {
            const pmEl = document.getElementById('project-manager-box');
            const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                : null;
            if (pmApp && pmApp.projectList && pmApp.currentProjectIndex !== undefined) {
                const current = pmApp.projectList[pmApp.currentProjectIndex];
                if (current && current.projectId) return String(current.projectId);
            }
            const params = new URLSearchParams(window.location.search);
            const urlPid = params.get('projectId');
            if (urlPid) return String(urlPid);
            return 'default';
        };
        const getTreeTitle = () => {
            const pmEl = document.getElementById('project-manager-box');
            const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                : null;
            if (pmApp && pmApp.treeTitle) return String(pmApp.treeTitle);
            if (app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
                const v = app.figureData.export["Save figure"].fileName.value;
                if (v) return String(v);
            }
            return 'tree';
        };
        const getCurrentHtml = () => {
            const p = (window.location.pathname || '').toLowerCase();
            if (p.includes('circletree')) return 'circleTree.html';
            if (p.includes('unrootedtree')) return 'unrootedTree.html';
            return 'normalTree.html';
        };

        const saveUndoToken = async (snapshot) => {
            if (!snapshot || typeof snapshot !== 'object') return null;
            if (!snapshot.plotType) {
                const html = getCurrentHtml();
                snapshot.plotType = html.includes('circle') ? 'circleTree' : (html.includes('unrooted') ? 'unrootedTree' : 'normalTree');
            }
            const res = await fetch('/api/layout_state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshot)
            });
            const json = await res.json();
            if (!json || !json.success || !json.token) return null;
            return String(json.token);
        };

        const ensureDeleteListHook = (state) => {
            if (!app.styleData) return;
            const list = app.styleData.deleteWholeCladeList;
            if (!Array.isArray(list)) return;
            if (list.__tvbot_delete_list_hooked) return;

            const wrap = (name, shouldCapture) => {
                const orig = list[name];
                if (typeof orig !== 'function') return;
                list[name] = function() {
                    const args = arguments;
                    const captureNow = () => {
                        if (state.inProgress || state.suspendCapture) return;
                        if (!shouldCapture(args, list)) return;
                        try {
                            const snap = app.exportOriginalJsonData(true);
                            state.enqueueSnapshot(snap);
                        } catch (e) {}
                    };
                    captureNow();
                    return orig.apply(list, args);
                };
            };

            wrap('push', (args) => args && args.length > 0);
            wrap('unshift', (args) => args && args.length > 0);
            wrap('splice', (args) => args && args.length > 2);

            Object.defineProperty(list, '__tvbot_delete_list_hooked', { value: true, configurable: true });
        };

        const state = {
            _app: app,
            stack: loadTokens(persistUndoKey),
            redo: loadTokens(persistRedoKey),
            max: 20,
            inProgress: false,
            intervalId: null,
            suspendCapture: false,
            _queue: Promise.resolve(),
            reset(clearHistory = false) {
                if (clearHistory) {
                    this.stack = [];
                    this.redo = [];
                    saveTokens(persistUndoKey, this.stack);
                    saveTokens(persistRedoKey, this.redo);
                }
            },
            enqueueSnapshot(snapshot) {
                const snap = deepClone(snapshot);
                if (!snap) return;
                this._queue = this._queue
                    .then(() => saveUndoToken(snap))
                    .then((token) => {
                        if (!token) return;
                        this.stack.push(token);
                        if (this.stack.length > this.max) this.stack.shift();
                        saveTokens(persistUndoKey, this.stack);
                        this.redo = [];
                        saveTokens(persistRedoKey, this.redo);
                    })
                    .catch(() => {});
            },
            async undo() {
                if (this.inProgress) return;
                const token = this.stack.pop();
                saveTokens(persistUndoKey, this.stack);
                if (!token) return;
                this.inProgress = true;
                try {
                    const current = deepClone(app.exportOriginalJsonData(true));
                    const redoToken = await saveUndoToken(current);
                    if (redoToken) {
                        this.redo.push(redoToken);
                        if (this.redo.length > this.max) this.redo.shift();
                        saveTokens(persistRedoKey, this.redo);
                    }
                } catch (e) {}

                const projectId = getProjectId();
                const treeTitle = getTreeTitle();
                const targetHtml = getCurrentHtml();
                const originalJsonDataUri = `/api/layout_state/${encodeURIComponent(token)}`;
                const url = `/${targetHtml}?originalJsonDataUri=${encodeURIComponent(originalJsonDataUri)}&projectId=${encodeURIComponent(projectId || 'default')}&treeTitle=${encodeURIComponent(treeTitle)}&undo=1`;
                try {
                    window.__tvbot_skip_beforeunload = true;
                    sessionStorage.setItem('tvbot_skip_beforeunload_once', '1');
                } catch (e) {}
                window.location.href = url;
            }
            ,
            async redoOnce() {
                if (this.inProgress) return;
                const token = this.redo.pop();
                saveTokens(persistRedoKey, this.redo);
                if (!token) return;
                this.inProgress = true;
                try {
                    const current = deepClone(app.exportOriginalJsonData(true));
                    const undoToken = await saveUndoToken(current);
                    if (undoToken) {
                        this.stack.push(undoToken);
                        if (this.stack.length > this.max) this.stack.shift();
                        saveTokens(persistUndoKey, this.stack);
                    }
                } catch (e) {}

                const projectId = getProjectId();
                const treeTitle = getTreeTitle();
                const targetHtml = getCurrentHtml();
                const originalJsonDataUri = `/api/layout_state/${encodeURIComponent(token)}`;
                const url = `/${targetHtml}?originalJsonDataUri=${encodeURIComponent(originalJsonDataUri)}&projectId=${encodeURIComponent(projectId || 'default')}&treeTitle=${encodeURIComponent(treeTitle)}&redo=1`;
                try {
                    window.__tvbot_skip_beforeunload = true;
                    sessionStorage.setItem('tvbot_skip_beforeunload_once', '1');
                } catch (e) {}
                window.location.href = url;
            }
        };

        state.reset(false);
        try {
            const params = new URLSearchParams(window.location.search);
            state.suspendCapture = params.get('undo') === '1' || params.get('redo') === '1';
            if (state.suspendCapture) setTimeout(() => { state.suspendCapture = false; }, 1800);
        } catch (e) {}
        ensureDeleteListHook(state);
        state.intervalId = setInterval(() => {
            if (state.inProgress) return;
            ensureDeleteListHook(state);
        }, 800);

        window.__tvbot_treeUndo = state;

        if (!window.__tvbot_treeUndo_keybind) {
            window.__tvbot_treeUndo_keybind = true;
            window.addEventListener('keydown', (e) => {
                const isMac = navigator.platform && /mac/i.test(navigator.platform);
                const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
                if (!cmdOrCtrl || e.shiftKey || e.altKey) return;
                if (String(e.key || '').toLowerCase() !== 'z') return;
                const t = e.target;
                const tag = t && t.tagName ? String(t.tagName).toLowerCase() : '';
                if (tag === 'input' || tag === 'textarea' || (t && t.isContentEditable)) return;
                if (window.__tvbot_treeUndo && typeof window.__tvbot_treeUndo.undo === 'function') {
                    e.preventDefault();
                    window.__tvbot_treeUndo.undo();
                }
            }, true);
        }
    }

    function exportPrunedLeafIds() {
        const app = window.normalTree || window.circleTree || window.unrootedTree;
        if (!app) {
            alert('Tree is not ready yet.');
            return;
        }
        const h = app.treeHierarchy;
        if (!h) {
            alert('Tree is not ready yet.');
            return;
        }
        const softDeletedArr = app.styleData && Array.isArray(app.styleData.tvbotSoftDeletedLeafIds) ? app.styleData.tvbotSoftDeletedLeafIds : [];
        const softDeleted = new Set(softDeletedArr.map(s => String(s || '').trim()).filter(Boolean));
        const leaves = typeof h.leaves === 'function'
            ? (h.leaves() || [])
            : (typeof h.descendants === 'function' ? (h.descendants() || []).filter(n => !n.children || n.children.length === 0) : []);

        const pickId = (node) => {
            const d = node && node.data !== undefined ? node.data : node;
            if (typeof d === 'string') return d;
            if (d && typeof d === 'object') {
                return d.name || d.id || d.leafName || d.leaf || d.label || d.taxon || d.text || (d.data && (d.data.name || d.data.id)) || '';
            }
            return '';
        };

        const ids = leaves.map(pickId).map(s => String(s || '').trim()).filter(Boolean).filter(id => !softDeleted.has(id));
        if (ids.length === 0) {
            alert('No leaf IDs found.');
            return;
        }

        const sorted = leaves.every(n => Number.isFinite(n.y) || Number.isFinite(n.x))
            ? leaves.slice().sort((a, b) => (Number.isFinite(a.y) ? a.y : a.x) - (Number.isFinite(b.y) ? b.y : b.x)).map(pickId).map(s => String(s || '').trim()).filter(Boolean).filter(id => !softDeleted.has(id))
            : ids;
        const finalIds = sorted;

        let base = 'pruned_leaf_ids';
        if (app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
            const v = app.figureData.export["Save figure"].fileName.value;
            if (v) base = v + '_pruned_leaf_ids';
        }
        const content = finalIds.join('\n') + '\n';
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = base + '.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    window.__tvbot_exportPrunedLeafIds = exportPrunedLeafIds;

    function ensureSoftDeleteOverlay() {
        const svg = document.querySelector('svg#svg');
        if (!svg) return null;
        const target = document.getElementById('maingroup') || svg.querySelector('g') || svg;
        let g = document.getElementById('tvbot-soft-delete-layer');
        if (!g) {
            g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'tvbot-soft-delete-layer');
            g.setAttribute('pointer-events', 'none');
            target.appendChild(g);
        }
        return g;
    }

    function applySoftDeleteMarks(app) {
        const svg = document.querySelector('svg#svg');
        if (!svg || !app || !app.styleData) return;
        const deletedArr = Array.isArray(app.styleData.tvbotSoftDeletedLeafIds) ? app.styleData.tvbotSoftDeletedLeafIds : [];
        const deleted = new Set(deletedArr.map(s => String(s || '').trim()).filter(Boolean));
        const overlay = ensureSoftDeleteOverlay();
        if (!overlay) return;
        while (overlay.firstChild) overlay.removeChild(overlay.firstChild);

        const toGroupPoint = (targetG, clientX, clientY) => {
            const pt = svg.createSVGPoint();
            pt.x = clientX;
            pt.y = clientY;
            const ctm = targetG.getScreenCTM();
            if (!ctm) return null;
            const p = pt.matrixTransform(ctm.inverse());
            return { x: p.x, y: p.y };
        };
        const targetG = overlay.parentNode && overlay.parentNode.getScreenCTM ? overlay.parentNode : (document.getElementById('maingroup') || svg);

        const texts = Array.from(svg.querySelectorAll('text'));
        texts.forEach(t => {
            const raw = (t.textContent != null) ? String(t.textContent) : '';
            const trimmed = raw.trim();
            const tokens = trimmed ? trimmed.split(/[\s,;|]+/).map(x => x.trim()).filter(Boolean) : [];
            const matchedId = (trimmed && deleted.has(trimmed))
                ? trimmed
                : (tokens.find(tok => deleted.has(tok)) || '');
            if (!matchedId) {
                if (t.getAttribute('data-tvbot-soft-deleted') === '1') {
                    t.removeAttribute('data-tvbot-soft-deleted');
                    t.style.removeProperty('text-decoration');
                    t.style.removeProperty('opacity');
                }
                return;
            }

            t.setAttribute('data-tvbot-soft-deleted', '1');
            t.style.setProperty('text-decoration', 'line-through');
            t.style.setProperty('opacity', '0.65');

            const rect = t.getBoundingClientRect ? t.getBoundingClientRect() : null;
            if (!rect || rect.width <= 0 || rect.height <= 0) return;

            const p1 = toGroupPoint(targetG, rect.left, rect.top + rect.height / 2);
            const p2 = toGroupPoint(targetG, rect.right, rect.top + rect.height / 2);
            if (!p1 || !p2) return;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(p1.x));
            line.setAttribute('y1', String(p1.y));
            line.setAttribute('x2', String(p2.x));
            line.setAttribute('y2', String(p2.y));
            line.setAttribute('stroke', '#ef4444');
            line.setAttribute('stroke-width', '0.6');
            line.setAttribute('stroke-opacity', '0.75');
            line.setAttribute('stroke-linecap', 'round');
            overlay.appendChild(line);
        });
    }

    function getSoftPruneEnabled() {
        const v = localStorage.getItem('tvbotSoftPruneEnabled');
        if (v === null) return true;
        return v !== '0';
    }

    function setSoftPruneEnabled(on) {
        localStorage.setItem('tvbotSoftPruneEnabled', on ? '1' : '0');
    }

    function setupSoftPrune(app) {
        if (!app || !app.styleData) return;
        if (!Array.isArray(app.styleData.tvbotSoftDeletedLeafIds)) app.styleData.tvbotSoftDeletedLeafIds = [];
        if (!Array.isArray(app.styleData.tvbotSoftUndo)) app.styleData.tvbotSoftUndo = [];
        if (!Array.isArray(app.styleData.tvbotSoftRedo)) app.styleData.tvbotSoftRedo = [];
        if (app.__tvbot_soft_prune_ready) return;
        app.__tvbot_soft_prune_ready = true;

        const getNodeByIndex = (idx) => {
            const h = app.treeHierarchy;
            if (!h || typeof h.descendants !== 'function') return null;
            const nodes = h.descendants() || [];
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (!n || !n.data) continue;
                const ni = n.data.nodeIndex;
                if (ni == null) continue;
                if (String(ni) === String(idx)) return n;
            }
            return null;
        };
        const pickId = (node) => {
            const d = node && node.data ? node.data : node;
            if (typeof d === 'string') return d;
            if (d && typeof d === 'object') return d.name || d.id || d.label || d.taxon || '';
            return '';
        };
        const toggleDeleteForCurrent = () => {
            if (!getSoftPruneEnabled()) return false;
            const idx = app.styleData ? app.styleData.currentNodeIndex : null;
            if (idx == null) return false;
            const node = getNodeByIndex(idx);
            if (!node) return false;
            const leafNodes = typeof node.leaves === 'function' ? node.leaves() : (typeof node.descendants === 'function' ? node.descendants().filter(n => !n.children || n.children.length === 0) : []);
            const ids = leafNodes.map(pickId).map(s => String(s || '').trim()).filter(Boolean);
            if (ids.length === 0) return false;

            const current = new Set((app.styleData.tvbotSoftDeletedLeafIds || []).map(s => String(s || '').trim()).filter(Boolean));
            const prevArr = Array.from(current);
            app.styleData.tvbotSoftUndo.push(prevArr);
            if (app.styleData.tvbotSoftUndo.length > 50) app.styleData.tvbotSoftUndo.shift();
            app.styleData.tvbotSoftRedo = [];

            const hasAnyNotDeleted = ids.some(id => !current.has(id));
            if (hasAnyNotDeleted) ids.forEach(id => current.add(id));
            else ids.forEach(id => current.delete(id));
            app.styleData.tvbotSoftDeletedLeafIds = Array.from(current);

            applySoftDeleteMarks(app);
            return true;
        };

        const softUndo = () => {
            const u = app.styleData.tvbotSoftUndo;
            if (!u || !u.length) return false;
            const current = Array.isArray(app.styleData.tvbotSoftDeletedLeafIds) ? app.styleData.tvbotSoftDeletedLeafIds.slice() : [];
            const prev = u.pop();
            app.styleData.tvbotSoftRedo.push(current);
            app.styleData.tvbotSoftDeletedLeafIds = Array.isArray(prev) ? prev : [];
            applySoftDeleteMarks(app);
            return true;
        };
        const softRedo = () => {
            const r = app.styleData.tvbotSoftRedo;
            if (!r || !r.length) return false;
            const current = Array.isArray(app.styleData.tvbotSoftDeletedLeafIds) ? app.styleData.tvbotSoftDeletedLeafIds.slice() : [];
            const next = r.pop();
            app.styleData.tvbotSoftUndo.push(current);
            app.styleData.tvbotSoftDeletedLeafIds = Array.isArray(next) ? next : [];
            applySoftDeleteMarks(app);
            return true;
        };

        if (!window.__tvbot_soft_prune_api) window.__tvbot_soft_prune_api = {};
        window.__tvbot_soft_prune_api.toggleDeleteForCurrent = toggleDeleteForCurrent;
        window.__tvbot_soft_prune_api.undo = softUndo;
        window.__tvbot_soft_prune_api.redo = softRedo;

        const hookHardDeleteList = () => {
            const list = app.styleData && app.styleData.deleteWholeCladeList;
            if (!Array.isArray(list)) return;
            if (list.__tvbot_soft_hooked) return;
            const wrap = (name) => {
                const orig = list[name];
                if (typeof orig !== 'function') return;
                list[name] = function() {
                    if (getSoftPruneEnabled() && !app.__tvbot_soft_internal) {
                        app.__tvbot_soft_internal = true;
                        try {
                            const ok = toggleDeleteForCurrent();
                            if (ok) return list.length;
                        } finally {
                            app.__tvbot_soft_internal = false;
                        }
                    }
                    return orig.apply(list, arguments);
                };
            };
            wrap('push');
            wrap('unshift');
            wrap('splice');
            Object.defineProperty(list, '__tvbot_soft_hooked', { value: true, configurable: true });
        };

        setInterval(() => {
            hookHardDeleteList();
            applySoftDeleteMarks(app);
        }, 900);
    }

    function getTreeNodeByIndex(app, idx) {
        const h = app && app.treeHierarchy;
        if (!h || typeof h.descendants !== 'function' || idx == null) return null;
        const nodes = h.descendants() || [];
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (!n || !n.data) continue;
            const ni = n.data.nodeIndex;
            if (ni == null) continue;
            if (String(ni) === String(idx)) return n;
        }
        return null;
    }

    function pickTreeNodeLabel(node) {
        const d = node && node.data !== undefined ? node.data : node;
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object') {
            return d.name || d.id || d.leafName || d.leaf || d.label || d.taxon || d.text || '';
        }
        return '';
    }

    function ensureNodeStyleOverlay() {
        const svg = document.querySelector('svg#svg');
        if (!svg) return null;
        const target = document.getElementById('maingroup') || svg;
        let g = document.getElementById('tvbot-node-style-layer');
        if (!g) {
            g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('id', 'tvbot-node-style-layer');
            g.setAttribute('pointer-events', 'none');
            target.appendChild(g);
        }
        return g;
    }

    function getTreeSvgRoot(svg) {
        if (!svg) return null;
        return document.getElementById('maingroup') || svg;
    }

    function normalizeStyleColor(value, fallback) {
        const v = String(value || '').trim();
        return v || fallback;
    }

    function normalizeStyleWidth(value, fallback) {
        const n = typeof value === 'number' ? value : parseFloat(value);
        if (!Number.isFinite(n) || n <= 0) return fallback;
        return Math.max(0.8, Math.min(10, n));
    }

    function isManagedOverlayElement(el) {
        if (!el || !el.getAttribute) return false;
        const id = el.id || '';
        if (id === 'tvbot-node-style-layer' || id === 'tvbot-soft-delete-layer' || id === 'tvbot-manual-annot-layer') return true;
        if (el.getAttribute('data-tvbot-annot') === '1') return true;
        if (el.getAttribute('data-tvbot-node-style') === '1') return true;
        const parent = el.parentNode;
        if (parent && parent.getAttribute) {
            const pid = parent.id || '';
            if (pid === 'tvbot-node-style-layer' || pid === 'tvbot-soft-delete-layer' || pid === 'tvbot-manual-annot-layer') return true;
        }
        return false;
    }

    function isBranchSvgElement(el) {
        if (!el || !el.tagName || isManagedOverlayElement(el)) return false;
        const tag = String(el.tagName).toLowerCase();
        if (!['path', 'line', 'polyline', 'polygon'].includes(tag)) return false;
        const stroke = el.getAttribute('stroke') || (el.style && el.style.stroke) || '';
        const fill = el.getAttribute('fill') || (el.style && el.style.fill) || '';
        if (tag === 'polygon' && fill && fill !== 'none') return false;
        if (stroke === 'none' && (!fill || fill === 'none')) return false;
        return true;
    }

    function isLeafTextElement(el) {
        return !!(el && el.tagName && String(el.tagName).toLowerCase() === 'text' && !isManagedOverlayElement(el));
    }

    function resetStyledBranches(root) {
        if (!root) return;
        const styled = Array.from(root.querySelectorAll('[data-tvbot-branch-styled="1"]'));
        styled.forEach(el => {
            if (!el || !el.setAttribute) return;
            const origStroke = el.getAttribute('data-tvbot-orig-stroke');
            const origStrokeWidth = el.getAttribute('data-tvbot-orig-stroke-width');
            const origStrokeOpacity = el.getAttribute('data-tvbot-orig-stroke-opacity');
            const origLinecap = el.getAttribute('data-tvbot-orig-stroke-linecap');
            const origLinejoin = el.getAttribute('data-tvbot-orig-stroke-linejoin');

            if (origStroke == null || origStroke === '__TVBOT_NULL__') el.removeAttribute('stroke');
            else el.setAttribute('stroke', origStroke);

            if (origStrokeWidth == null || origStrokeWidth === '__TVBOT_NULL__') el.removeAttribute('stroke-width');
            else el.setAttribute('stroke-width', origStrokeWidth);

            if (origStrokeOpacity == null || origStrokeOpacity === '__TVBOT_NULL__') el.removeAttribute('stroke-opacity');
            else el.setAttribute('stroke-opacity', origStrokeOpacity);

            if (origLinecap == null || origLinecap === '__TVBOT_NULL__') el.removeAttribute('stroke-linecap');
            else el.setAttribute('stroke-linecap', origLinecap);

            if (origLinejoin == null || origLinejoin === '__TVBOT_NULL__') el.removeAttribute('stroke-linejoin');
            else el.setAttribute('stroke-linejoin', origLinejoin);

            el.removeAttribute('data-tvbot-branch-styled');
            el.removeAttribute('data-tvbot-orig-stroke');
            el.removeAttribute('data-tvbot-orig-stroke-width');
            el.removeAttribute('data-tvbot-orig-stroke-opacity');
            el.removeAttribute('data-tvbot-orig-stroke-linecap');
            el.removeAttribute('data-tvbot-orig-stroke-linejoin');
        });
    }

    function applyBranchStyleToElement(el, item) {
        if (!el || !item || !el.setAttribute) return false;
        if (el.getAttribute('data-tvbot-branch-styled') !== '1') {
            el.setAttribute('data-tvbot-orig-stroke', el.getAttribute('stroke') != null ? el.getAttribute('stroke') : '__TVBOT_NULL__');
            el.setAttribute('data-tvbot-orig-stroke-width', el.getAttribute('stroke-width') != null ? el.getAttribute('stroke-width') : '__TVBOT_NULL__');
            el.setAttribute('data-tvbot-orig-stroke-opacity', el.getAttribute('stroke-opacity') != null ? el.getAttribute('stroke-opacity') : '__TVBOT_NULL__');
            el.setAttribute('data-tvbot-orig-stroke-linecap', el.getAttribute('stroke-linecap') != null ? el.getAttribute('stroke-linecap') : '__TVBOT_NULL__');
            el.setAttribute('data-tvbot-orig-stroke-linejoin', el.getAttribute('stroke-linejoin') != null ? el.getAttribute('stroke-linejoin') : '__TVBOT_NULL__');
        }
        el.setAttribute('stroke', normalizeStyleColor(item.color, '#f97316'));
        el.setAttribute('stroke-width', String(normalizeStyleWidth(item.width, 3)));
        el.setAttribute('stroke-opacity', '0.95');
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
        el.setAttribute('data-tvbot-branch-styled', '1');
        return true;
    }

    function getSvgUserPoint(svg, clientX, clientY) {
        if (!svg || !svg.createSVGPoint) return null;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM && svg.getScreenCTM();
        if (!ctm || !ctm.inverse) return null;
        const p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }

    function distanceToRect(x, y, rect) {
        if (!rect) return Number.POSITIVE_INFINITY;
        const dx = x < rect.left ? (rect.left - x) : (x > rect.right ? (x - rect.right) : 0);
        const dy = y < rect.top ? (rect.top - y) : (y > rect.bottom ? (y - rect.bottom) : 0);
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getElementSignature(el) {
        if (!el || !el.tagName) return '';
        const tag = String(el.tagName).toLowerCase();
        if (tag === 'path') return `path:${el.getAttribute('d') || ''}`;
        if (tag === 'line') return `line:${el.getAttribute('x1') || ''},${el.getAttribute('y1') || ''},${el.getAttribute('x2') || ''},${el.getAttribute('y2') || ''}`;
        if (tag === 'polyline' || tag === 'polygon') return `${tag}:${el.getAttribute('points') || ''}`;
        if (tag === 'text') return `text:${(el.textContent || '').trim()}`;
        return `${tag}:${el.getAttribute('class') || ''}`;
    }

    function findNearestBranchElement(svg, clientX, clientY) {
        if (!svg) return null;
        const root = getTreeSvgRoot(svg) || svg;
        if (typeof document.elementsFromPoint === 'function') {
            const hits = document.elementsFromPoint(clientX, clientY) || [];
            const hit = hits.find(el => isBranchSvgElement(el) && root.contains(el));
            if (hit) return hit;
        }
        const candidates = Array.from(root.querySelectorAll('path,line,polyline,polygon')).filter(isBranchSvgElement);
        let best = null;
        let bestDist = Number.POSITIVE_INFINITY;
        candidates.forEach(el => {
            const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
            const dist = distanceToRect(clientX, clientY, rect);
            if (dist < bestDist) {
                bestDist = dist;
                best = el;
            }
        });
        return bestDist <= 18 ? best : null;
    }

    function findBranchElementFromStyle(svg, item) {
        if (!svg || !item) return null;
        const root = getTreeSvgRoot(svg) || svg;
        const candidates = Array.from(root.querySelectorAll('path,line,polyline,polygon')).filter(isBranchSvgElement);
        if (item.sig) {
            const exact = candidates.find(el => getElementSignature(el) === item.sig);
            if (exact) return exact;
        }
        if (Number.isFinite(item.clientX) && Number.isFinite(item.clientY)) {
            return findNearestBranchElement(svg, item.clientX, item.clientY);
        }
        return null;
    }

    function getBranchElementEndpointsInRoot(el) {
        if (!el) return null;
        const tag = String(el.tagName).toLowerCase();
        let pts = [];
        if (tag === 'path') {
            const d = el.getAttribute('d') || '';
            const matches = d.match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
            if (matches && matches.length >= 2) {
                pts.push({ x: Number(matches[0]), y: Number(matches[1]) });
                if (matches.length >= 4) {
                    pts.push({ x: Number(matches[matches.length - 2]), y: Number(matches[matches.length - 1]) });
                }
            }
        } else if (tag === 'line') {
            pts.push({ x: Number(el.getAttribute('x1')), y: Number(el.getAttribute('y1')) });
            pts.push({ x: Number(el.getAttribute('x2')), y: Number(el.getAttribute('y2')) });
        } else if (tag === 'polyline' || tag === 'polygon') {
            const points = (el.getAttribute('points') || '').trim().split(/[\s,]+/);
            if (points.length >= 2) {
                pts.push({ x: Number(points[0]), y: Number(points[1]) });
                if (points.length >= 4) {
                    pts.push({ x: Number(points[points.length - 2]), y: Number(points[points.length - 1]) });
                }
            }
        }
        return pts.length > 0 ? pts : null;
    }

    function buildBranchElementMap(app, svg) {
        const root = getTreeSvgRoot(svg) || svg;
        const h = app && app.treeHierarchy;
        if (!root || !h || typeof h.descendants !== 'function') return new Map();
        const nodes = (h.descendants() || []).filter(node => node && node.parent);
        const candidates = Array.from(root.querySelectorAll('path,line,polyline,polygon')).filter(isBranchSvgElement);
        if (!nodes.length || !candidates.length) return new Map();

        const nodeToEl = new Map();

        // 1. D3 data binding matching (most stable if available)
        let usedEl = new Set();
        candidates.forEach((el, idx) => {
            const d = el.__data__;
            if (d && d.target && d.target.data && d.target.data.nodeIndex != null) {
                nodeToEl.set(String(d.target.data.nodeIndex), el);
                usedEl.add(idx);
            } else if (d && d.data && d.data.nodeIndex != null) {
                nodeToEl.set(String(d.data.nodeIndex), el);
                usedEl.add(idx);
            }
        });

        if (nodeToEl.size > 0) return nodeToEl;

        // 2. Internal geometric matching (zoom-independent)
        const pairs = [];
        nodes.forEach(node => {
            const nodeIndex = String(node.data && node.data.nodeIndex != null ? node.data.nodeIndex : '');
            if (!nodeIndex) return;
            const parent = node.parent;
            if (!parent) return;
            
            const nx = Number(node.x), ny = Number(node.y);
            const px = Number(parent.x), py = Number(parent.y);
            if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(px) || !Number.isFinite(py)) return;
            
            // Check both standard and inverted coordinate layouts
            const layout1 = { cx: ny, cy: nx, px: py, py: px }; // Left-to-right (common)
            const layout2 = { cx: nx, cy: ny, px: px, py: py }; // Top-to-bottom

            candidates.forEach((el, idx) => {
                if (usedEl.has(idx)) return;
                const pts = getBranchElementEndpointsInRoot(el);
                if (!pts || !pts.length) return;

                let bestDist = Number.POSITIVE_INFINITY;
                pts.forEach(pt => {
                    const d1c = pointDistance(pt, { x: layout1.cx, y: layout1.cy });
                    const d1p = pointDistance(pt, { x: layout1.px, y: layout1.py });
                    const d2c = pointDistance(pt, { x: layout2.cx, y: layout2.cy });
                    const d2p = pointDistance(pt, { x: layout2.px, y: layout2.py });
                    bestDist = Math.min(bestDist, d1c, d1p, d2c, d2p);
                });

                if (!Number.isFinite(bestDist)) return;
                pairs.push({ nodeIndex, elIndex: idx, dist: bestDist });
            });
        });

        pairs.sort((a, b) => a.dist - b.dist);
        usedEl.clear();
        pairs.forEach(pair => {
            if (nodeToEl.has(pair.nodeIndex) || usedEl.has(pair.elIndex)) return;
            if (pair.dist > 15) return; // Must be close to an endpoint
            nodeToEl.set(pair.nodeIndex, candidates[pair.elIndex]);
            usedEl.add(pair.elIndex);
        });

        return nodeToEl;
    }

    function getBranchProbeClientPoint(node) {
        if (!node || !node.parent) return null;
        const parentPt = getNodeClientPoint(node.parent);
        const childPt = getNodeClientPoint(node);
        if (!parentPt || !childPt) return null;
        const currentPath = String(window.location.pathname || '').toLowerCase();
        if (currentPath.includes('circletree') || currentPath.includes('unrootedtree')) {
            return {
                x: (parentPt.x + childPt.x) / 2,
                y: (parentPt.y + childPt.y) / 2
            };
        }
        const elbow = { x: parentPt.x, y: childPt.y };
        const horizontal = {
            x: (elbow.x + childPt.x) / 2,
            y: childPt.y
        };
        const vertical = {
            x: parentPt.x,
            y: (parentPt.y + elbow.y) / 2
        };
        return Math.abs(childPt.x - elbow.x) >= 4 ? horizontal : vertical;
    }

    function getNodeClientPoint(node) {
        const svg = document.querySelector('svg#svg');
        if (!svg || !node) return null;
        const target = document.getElementById('maingroup') || svg;
        const x = Number(node.y);
        const y = Number(node.x);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !svg.createSVGPoint) return null;
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const ctm = target.getScreenCTM && target.getScreenCTM();
        if (!ctm) return null;
        const p = pt.matrixTransform(ctm);
        return { x: p.x, y: p.y };
    }

    function pointDistance(a, b) {
        if (!a || !b) return Number.POSITIVE_INFINITY;
        const dx = Number(a.x) - Number(b.x);
        const dy = Number(a.y) - Number(b.y);
        return Math.sqrt(dx * dx + dy * dy);
    }

    function distancePointToSegment(point, a, b) {
        if (!point || !a || !b) return Number.POSITIVE_INFINITY;
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = point.x - a.x;
        const apy = point.y - a.y;
        const ab2 = abx * abx + aby * aby;
        if (!ab2) return pointDistance(point, a);
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
        const cx = a.x + abx * t;
        const cy = a.y + aby * t;
        return pointDistance(point, { x: cx, y: cy });
    }

    function getBranchClientDistance(node, clientPoint) {
        if (!node || !node.parent || !clientPoint) return Number.POSITIVE_INFINITY;
        const parentPt = getNodeClientPoint(node.parent);
        const childPt = getNodeClientPoint(node);
        if (!parentPt || !childPt) return Number.POSITIVE_INFINITY;
        const currentPath = String(window.location.pathname || '').toLowerCase();
        if (currentPath.includes('circletree') || currentPath.includes('unrootedtree')) {
            return distancePointToSegment(clientPoint, parentPt, childPt);
        }
        const elbow = { x: parentPt.x, y: childPt.y };
        return Math.min(
            distancePointToSegment(clientPoint, parentPt, elbow),
            distancePointToSegment(clientPoint, elbow, childPt)
        );
    }

    function findNearestTreeBranchNode(app, clientX, clientY) {
        const h = app && app.treeHierarchy;
        if (!h || typeof h.descendants !== 'function') return null;
        const clientPoint = { x: clientX, y: clientY };
        const nodes = (h.descendants() || []).filter(node => node && node.parent);
        let best = null;
        let bestDist = Number.POSITIVE_INFINITY;
        nodes.forEach(node => {
            const dist = getBranchClientDistance(node, clientPoint);
            if (dist < bestDist) {
                bestDist = dist;
                best = node;
            }
        });
        return bestDist <= 18 ? best : null;
    }

    function findLeafTreeNodeByText(app, text) {
        const h = app && app.treeHierarchy;
        const key = String(text || '').trim();
        if (!h || typeof h.descendants !== 'function' || !key) return null;
        const nodes = h.descendants() || [];
        let tokenHit = null;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node || (node.children && node.children.length)) continue;
            const label = String(pickTreeNodeLabel(node) || '').trim();
            if (!label) continue;
            if (label === key) return node;
            const tokens = label.split(/[\s,;|]+/).map(x => x.trim()).filter(Boolean);
            if (!tokenHit && tokens.includes(key)) tokenHit = node;
        }
        return tokenHit;
    }

    function captureCurrentContextTarget(app, evt) {
        const svg = document.querySelector('svg#svg');
        if (!svg || !evt) return;
        const branchEl = findNearestBranchElement(svg, evt.clientX, evt.clientY);
        const branchNode = findNearestTreeBranchNode(app, evt.clientX, evt.clientY);
        let leafEl = null;
        if (isLeafTextElement(evt.target)) {
            leafEl = evt.target;
        } else if (typeof document.elementsFromPoint === 'function') {
            const hits = document.elementsFromPoint(evt.clientX, evt.clientY) || [];
            leafEl = hits.find(isLeafTextElement) || null;
        }
        const leafNode = leafEl ? findLeafTreeNodeByText(app, leafEl.textContent || '') : null;
        app.__tvbot_lastContextTarget = {
            clientX: evt.clientX,
            clientY: evt.clientY,
            svgPoint: getSvgUserPoint(svg, evt.clientX, evt.clientY),
            branchSig: getElementSignature(branchEl),
            branchNodeIndex: branchNode && branchNode.data && branchNode.data.nodeIndex != null ? String(branchNode.data.nodeIndex) : '',
            leafNodeIndex: leafNode && leafNode.data && leafNode.data.nodeIndex != null ? String(leafNode.data.nodeIndex) : '',
            leafSig: getElementSignature(leafEl),
            leafText: leafEl ? String(leafEl.textContent || '').trim() : '',
            targetTag: evt.target && evt.target.tagName ? String(evt.target.tagName).toLowerCase() : ''
        };
    }

    function syncSelectedNodeFromEvent(app, evt) {
        if (!app || !evt) return null;
        captureCurrentContextTarget(app, evt);
        const state = app.__tvbot_lastContextTarget || null;
        if (state && state.leafNodeIndex) {
            const leafNode = getTreeNodeByIndex(app, state.leafNodeIndex);
            if (leafNode) {
                app.__tvbot_selected_branch_node_index = '';
                if (app.styleData) app.styleData.currentNodeIndex = state.leafNodeIndex;
                return leafNode;
            }
        }
        let branchNode = findNearestTreeBranchNode(app, evt.clientX, evt.clientY);
        if (!branchNode) {
            const currentIdx = app.styleData ? app.styleData.currentNodeIndex : null;
            const currentNode = getTreeNodeByIndex(app, currentIdx);
            if (currentNode && currentNode.parent) branchNode = currentNode;
        }
        if (!branchNode || !branchNode.parent) return null;
        app.__tvbot_selected_branch_node_index = String(branchNode.data && branchNode.data.nodeIndex != null ? branchNode.data.nodeIndex : '');
        if (app.styleData) app.styleData.currentNodeIndex = app.__tvbot_selected_branch_node_index;
        return branchNode;
    }

    function applyNodeStyleMarks(app) {
        const svg = document.querySelector('svg#svg');
        if (!svg || !app || !app.styleData) return;
        const treeRoot = getTreeSvgRoot(svg) || svg;
        const branchElMap = buildBranchElementMap(app, svg);

        const branchArr = Array.isArray(app.styleData.tvbotBranchStyles) ? app.styleData.tvbotBranchStyles : [];
        const leafArr = Array.isArray(app.styleData.tvbotLeafStyles) ? app.styleData.tvbotLeafStyles : [];

        const overlay = ensureNodeStyleOverlay();
        if (overlay) {
            while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
        }
        resetStyledBranches(treeRoot);

        const leafMap = new Map();
        leafArr.forEach(item => {
            if (!item) return;
            const key = String(item.leafId || '').trim();
            if (!key) return;
            leafMap.set(key, {
                color: normalizeStyleColor(item.color, '#dc2626'),
                bold: !!item.bold
            });
        });

        const texts = Array.from(treeRoot.querySelectorAll('text'));
        texts.forEach(t => {
            if (t.getAttribute('data-tvbot-leaf-styled') === '1') {
                t.removeAttribute('data-tvbot-leaf-styled');
                t.style.removeProperty('fill');
                t.style.removeProperty('font-weight');
            }
            const raw = (t.textContent != null) ? String(t.textContent) : '';
            const trimmed = raw.trim();
            const tokens = trimmed ? trimmed.split(/[\s,;|]+/).map(x => x.trim()).filter(Boolean) : [];
            const matchedId = (trimmed && leafMap.has(trimmed))
                ? trimmed
                : (tokens.find(tok => leafMap.has(tok)) || '');
            if (!matchedId) return;
            const style = leafMap.get(matchedId);
            if (!style) return;
            t.setAttribute('data-tvbot-leaf-styled', '1');
            t.style.setProperty('fill', style.color);
            t.style.setProperty('font-weight', style.bold ? '700' : '400');
        });

        branchArr.forEach(item => {
            if (!item) return;
            const node = getTreeNodeByIndex(app, item.nodeIndex);
            let realItem = item;
            if ((!realItem.sig || !Number.isFinite(realItem.clientX) || !Number.isFinite(realItem.clientY)) && node) {
                const probe = getBranchProbeClientPoint(node);
                realItem = Object.assign({}, item, {
                    clientX: probe && Number.isFinite(probe.x) ? probe.x : item.clientX,
                    clientY: probe && Number.isFinite(probe.y) ? probe.y : item.clientY
                });
            }
            const el = findBranchElementFromStyle(svg, realItem) || branchElMap.get(String(item.nodeIndex));
            if (!el) return;
            applyBranchStyleToElement(el, item);
        });
    }

    function setupNodeStyling(app) {
        if (!app || !app.styleData) return;
        if (!Array.isArray(app.styleData.tvbotBranchStyles)) app.styleData.tvbotBranchStyles = [];
        if (!Array.isArray(app.styleData.tvbotLeafStyles)) app.styleData.tvbotLeafStyles = [];
        if (app.__tvbot_node_styling_ready) return;
        app.__tvbot_node_styling_ready = true;

        const upsertByKey = (list, key, item) => {
            const idx = list.findIndex(x => x && String(key(x)) === String(key(item)));
            if (idx >= 0) list[idx] = item;
            else list.push(item);
        };

        const getCurrentNodeInfo = () => {
            const state = getCurrentContextState();
            const branchIdx = app.__tvbot_selected_branch_node_index != null ? app.__tvbot_selected_branch_node_index : null;
            const idx = state && state.leafNodeIndex
                ? state.leafNodeIndex
                : (branchIdx != null && branchIdx !== '' ? branchIdx : (app.styleData ? app.styleData.currentNodeIndex : null));
            const node = getTreeNodeByIndex(app, idx);
            if (!node) return null;
            const leafId = String(pickTreeNodeLabel(node) || '').trim();
            return {
                nodeIndex: String(node.data && node.data.nodeIndex != null ? node.data.nodeIndex : idx),
                isLeaf: !node.children || node.children.length === 0,
                hasParent: !!node.parent,
                leafId: leafId
            };
        };

        const getCurrentContextState = () => app.__tvbot_lastContextTarget || null;

        const getCurrentBranchRootNode = () => {
            const state = getCurrentContextState();
            const idx = state && state.branchNodeIndex != null && state.branchNodeIndex !== ''
                ? state.branchNodeIndex
                : app.__tvbot_selected_branch_node_index;
            let node = getTreeNodeByIndex(app, idx);
            if (node) return node;
            const currentIdx = app.styleData ? app.styleData.currentNodeIndex : null;
            node = getTreeNodeByIndex(app, currentIdx);
            if (node && node.parent) return node;
            return null;
        };

        const getCurrentBranchSubtreeNodes = () => {
            const node = getCurrentBranchRootNode();
            if (!node || typeof node.descendants !== 'function') return [];
            return (node.descendants() || []).filter(x => x && x.parent);
        };

        const styleCurrentBranchSubtree = (opts = {}) => {
            const rootNode = getCurrentBranchRootNode();
            if (!rootNode || !rootNode.parent) return false;
            const nodes = getCurrentBranchSubtreeNodes();
            if (!nodes.length) return false;
            const state = getCurrentContextState();
            const svg = document.querySelector('svg#svg');
            const branchElMap = svg ? buildBranchElementMap(app, svg) : new Map();
            nodes.forEach((node, idx) => {
                const nodeIndex = String(node.data && node.data.nodeIndex != null ? node.data.nodeIndex : '');
                if (!nodeIndex) return;
                const current = app.styleData.tvbotBranchStyles.find(x => x && String(x.nodeIndex) === nodeIndex) || {};
                const probe = getBranchProbeClientPoint(node);
                const matchedEl = branchElMap.get(nodeIndex);
                const item = {
                    nodeIndex,
                    sig: idx === 0 && state
                        ? state.branchSig || (matchedEl ? getElementSignature(matchedEl) : '') || current.sig || ''
                        : ((matchedEl ? getElementSignature(matchedEl) : '') || current.sig || ''),
                    clientX: probe && Number.isFinite(probe.x) ? probe.x : current.clientX,
                    clientY: probe && Number.isFinite(probe.y) ? probe.y : current.clientY,
                    color: normalizeStyleColor(opts.color != null ? opts.color : current.color, '#f97316'),
                    width: normalizeStyleWidth(opts.width != null ? opts.width : current.width, opts.bold ? 3.6 : 2.4)
                };
                upsertByKey(app.styleData.tvbotBranchStyles, x => x.nodeIndex, item);
            });
            applyNodeStyleMarks(app);
            return true;
        };

        const styleCurrentBranch = (opts = {}) => {
            return styleCurrentBranchSubtree(opts);
        };

        const clearCurrentBranchStyle = () => {
            const nodes = getCurrentBranchSubtreeNodes();
            if (!nodes.length) return false;
            const nodeIndexSet = new Set(nodes.map(node => String(node && node.data && node.data.nodeIndex != null ? node.data.nodeIndex : '')).filter(Boolean));
            app.styleData.tvbotBranchStyles = app.styleData.tvbotBranchStyles.filter(x => !x || !nodeIndexSet.has(String(x.nodeIndex)));
            applyNodeStyleMarks(app);
            return true;
        };

        const styleCurrentLeaf = (opts = {}) => {
            const info = getCurrentNodeInfo();
            if (!info || !info.isLeaf || !info.leafId) return false;
            const current = app.styleData.tvbotLeafStyles.find(x => x && String(x.leafId) === info.leafId) || {};
            const item = {
                leafId: info.leafId,
                nodeIndex: info.nodeIndex,
                color: normalizeStyleColor(opts.color != null ? opts.color : current.color, '#dc2626'),
                bold: opts.bold != null ? !!opts.bold : !!current.bold
            };
            upsertByKey(app.styleData.tvbotLeafStyles, x => x.leafId, item);
            applyNodeStyleMarks(app);
            return true;
        };

        const clearCurrentLeafStyle = () => {
            const info = getCurrentNodeInfo();
            if (!info || !info.leafId) return false;
            app.styleData.tvbotLeafStyles = app.styleData.tvbotLeafStyles.filter(x => !x || String(x.leafId) !== info.leafId);
            applyNodeStyleMarks(app);
            return true;
        };

        window.__tvbot_node_style_api = {
            getCurrentNodeInfo,
            getCurrentContextState,
            getCurrentBranchRootNode,
            getCurrentBranchSubtreeNodes,
            styleCurrentBranch,
            styleCurrentBranchSubtree,
            clearCurrentBranchStyle,
            styleCurrentLeaf,
            clearCurrentLeafStyle,
            apply: () => applyNodeStyleMarks(app)
        };

        const svg = document.querySelector('svg#svg');
        if (svg && !svg.__tvbot_context_capture_ready) {
            svg.addEventListener('contextmenu', (evt) => {
                captureCurrentContextTarget(app, evt);
            }, true);
            svg.__tvbot_context_capture_ready = true;
        }

        if (svg && !svg.__tvbot_branch_click_style_ready) {
            svg.addEventListener('click', (evt) => {
                if (!evt || evt.button !== 0) return;
                if (isManagedOverlayElement(evt.target)) return;
                setTimeout(() => {
                    syncSelectedNodeFromEvent(app, evt);
                }, 60);
            }, true);
            svg.__tvbot_branch_click_style_ready = true;
        }

        setInterval(() => {
            applyNodeStyleMarks(app);
        }, 900);
    }

    function hideTreeContextMenu() {
        const root = document.getElementById('layout_phylotree_context_menu_app');
        if (root && (root.__vue_app__ || root.__vue__)) {
            const vm = root.__vue_app__ ? root.__vue_app__._instance.proxy : root.__vue__;
            if (vm && typeof vm.isShowMenu !== 'undefined') {
                vm.isShowMenu = false;
                return;
            }
        }
        const menu = document.getElementById('tree-structure-change-btn-box');
        if (menu) menu.style.display = 'none';
    }

    function injectContextMenuStyling() {
        const menu = document.getElementById('tree-structure-change-btn-box');
        if (!menu || menu.querySelector('#tvbot-context-style-tools')) return;

        const api = window.__tvbot_node_style_api;
        if (!api) return;

        const mkItem = (id, icon, text, onClick) => {
            const item = document.createElement('div');
            item.id = id;
            item.className = 'tree-structure-change-btn-item';
            item.style.cursor = 'pointer';

            const iconDiv = document.createElement('div');
            iconDiv.className = icon;
            iconDiv.style.cssText = 'color:#42b983;font-size:20px;';

            const labelDiv = document.createElement('div');
            labelDiv.className = 'btn-click—box';
            labelDiv.innerText = text;

            item.appendChild(iconDiv);
            item.appendChild(labelDiv);
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            });
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }, { passive: false });
            return item;
        };

        const wrap = document.createElement('section');
        wrap.id = 'tvbot-context-style-tools';

        const branchColorItem = mkItem('tvbot-ctx-branch-color', 'cuIcon-colorlens', 'Color branch', () => {
            const info = api.getCurrentNodeInfo();
            if (!info || !info.hasParent) {
                alert('Please left-click a node or branch first.');
                return;
            }
            const color = prompt('Branch color (#hex or CSS color):', '#f97316');
            if (color == null) return;
            if (api.styleCurrentBranch({ color })) hideTreeContextMenu();
            else alert('Please left-click a node or branch first, then try again.');
        });

        const branchBoldItem = mkItem('tvbot-ctx-branch-bold', 'cuIcon-pullup', 'Bold branch', () => {
            const info = api.getCurrentNodeInfo();
            if (!info || !info.hasParent) {
                alert('Please left-click a node or branch first.');
                return;
            }
            const width = prompt('Branch width:', '3.6');
            if (width == null) return;
            if (api.styleCurrentBranch({ width, bold: true })) hideTreeContextMenu();
            else alert('Please left-click a node or branch first, then try again.');
        });

        const branchClearItem = mkItem('tvbot-ctx-branch-clear', 'cuIcon-refresh', 'Reset branch style', () => {
            if (api.clearCurrentBranchStyle()) hideTreeContextMenu();
        });

        const leafColorItem = mkItem('tvbot-ctx-leaf-color', 'cuIcon-colorlens', 'Color leaf', () => {
            const info = api.getCurrentNodeInfo();
            if (!info || !info.isLeaf) {
                alert('Please left-click or right-click a leaf node first.');
                return;
            }
            const color = prompt('Leaf label color (#hex or CSS color):', '#dc2626');
            if (color == null) return;
            if (api.styleCurrentLeaf({ color })) hideTreeContextMenu();
        });

        const leafBoldItem = mkItem('tvbot-ctx-leaf-bold', 'cuIcon-textbold', 'Bold leaf', () => {
            const info = api.getCurrentNodeInfo();
            if (!info || !info.isLeaf) {
                alert('Please left-click or right-click a leaf node first.');
                return;
            }
            if (api.styleCurrentLeaf({ bold: true })) hideTreeContextMenu();
        });

        const leafClearItem = mkItem('tvbot-ctx-leaf-clear', 'cuIcon-refresh', 'Reset leaf style', () => {
            if (api.clearCurrentLeafStyle()) hideTreeContextMenu();
        });

        wrap.appendChild(branchColorItem);
        wrap.appendChild(branchBoldItem);
        wrap.appendChild(branchClearItem);
        wrap.appendChild(leafColorItem);
        wrap.appendChild(leafBoldItem);
        wrap.appendChild(leafClearItem);
        menu.appendChild(wrap);

        const refreshMenu = () => {
            const info = api.getCurrentNodeInfo ? api.getCurrentNodeInfo() : null;
            const canBranch = !!(info && info.hasParent);
            const canLeaf = !!(info && info.isLeaf);
            branchColorItem.style.display = canBranch ? '' : 'none';
            branchBoldItem.style.display = canBranch ? '' : 'none';
            branchClearItem.style.display = canBranch ? '' : 'none';
            leafColorItem.style.display = canLeaf ? '' : 'none';
            leafBoldItem.style.display = canLeaf ? '' : 'none';
            leafClearItem.style.display = canLeaf ? '' : 'none';
        };
        refreshMenu();
        setInterval(refreshMenu, 250);
    }

    function exportPrunedTreeAndLayerRows() {
        const app = window.normalTree || window.circleTree || window.unrootedTree;
        if (!app) {
            alert('Tree is not ready yet.');
            return;
        }
        const h = app.treeHierarchy;
        if (!h) {
            alert('Tree is not ready yet.');
            return;
        }

        const leaves = typeof h.leaves === 'function'
            ? (h.leaves() || [])
            : (typeof h.descendants === 'function' ? (h.descendants() || []).filter(n => !n.children || n.children.length === 0) : []);

        const pickId = (node) => {
            const d = node && node.data !== undefined ? node.data : node;
            if (typeof d === 'string') return d;
            if (d && typeof d === 'object') {
                return d.name || d.id || d.leafName || d.leaf || d.label || d.taxon || d.text || (d.data && (d.data.name || d.data.id)) || '';
            }
            return '';
        };

        const softDeletedArr = app.styleData && Array.isArray(app.styleData.tvbotSoftDeletedLeafIds) ? app.styleData.tvbotSoftDeletedLeafIds : [];
        const softDeleted = new Set(softDeletedArr.map(s => String(s || '').trim()).filter(Boolean));
        const leafIds = new Set(leaves.map(pickId).map(s => String(s || '').trim()).filter(Boolean).filter(id => !softDeleted.has(id)));
        if (leafIds.size === 0) {
            alert('No leaf IDs found.');
            return;
        }

        const getBaseName = () => {
            if (app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
                const v = app.figureData.export["Save figure"].fileName.value;
                if (v) return String(v);
            }
            return 'pruned_export';
        };
        const base = getBaseName();

        const escapeNewickLabel = (s) => {
            const v = String(s || '');
            if (!v) return '';
            if (/[\s\(\)\[\]\:,;']/g.test(v)) return `'${v.replace(/'/g, "''")}'`;
            return v;
        };
        const formatLen = (v) => {
            const n = typeof v === 'number' ? v : parseFloat(v);
            if (!Number.isFinite(n)) return '';
            return ':' + String(n);
        };
        const nodeName = (node) => {
            const d = node && node.data ? node.data : {};
            return String(d.name || d.id || d.label || d.taxon || '').trim();
        };
        const nodeLen = (node) => {
            const d = node && node.data ? node.data : {};
            const n = typeof d.length === 'number' ? d.length : parseFloat(d.length);
            return Number.isFinite(n) ? n : null;
        };
        const prune = (node) => {
            if (!node) return null;
            const children = node.children || [];
            if (!children.length) {
                const nm = nodeName(node);
                if (nm && softDeleted.has(nm)) return null;
                return { name: nm, length: nodeLen(node), children: null };
            }
            const kept = [];
            for (let i = 0; i < children.length; i++) {
                const c = prune(children[i]);
                if (c) kept.push(c);
            }
            if (kept.length === 0) return null;
            if (kept.length === 1) {
                const l0 = nodeLen(node);
                const l1 = kept[0].length;
                if (l0 != null) kept[0].length = (l1 != null ? l1 : 0) + l0;
                return kept[0];
            }
            return { name: nodeName(node), length: nodeLen(node), children: kept };
        };
        const toNewick = (node) => {
            if (!node) return '';
            const name = escapeNewickLabel(node.name || '');
            const len = node.length != null ? (':' + String(node.length)) : '';
            if (node.children && node.children.length) {
                return '(' + node.children.map(toNewick).join(',') + ')' + name + len;
            }
            return escapeNewickLabel(node.name || '') + len;
        };

        let nwk = '';
        try {
            const pruned = prune(h);
            if (pruned) nwk = toNewick(pruned) + ';';
        } catch (e) {
            nwk = '';
        }

        if (nwk) {
            const blob = new Blob([nwk + '\n'], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = base + '_pruned.nwk';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } else {
            alert('Failed to build pruned Newick (tree export).');
        }

        const payload = (typeof app.exportOriginalJsonData === 'function') ? app.exportOriginalJsonData(true) : null;
        const mainArr = payload && payload.originalData && Array.isArray(payload.originalData.mainDataArr) ? payload.originalData.mainDataArr : [];
        const layerFiles = mainArr.filter(x => x && typeof x === 'object' && x.type === 'tsvStr' && typeof x.fileData === 'string');

        if (layerFiles.length === 0) {
            alert('No layer data files found in this project.');
            return;
        }

        const linesOut = [];
        layerFiles.forEach(fileObj => {
            const fileName = fileObj.fileName || 'layer';
            const tsv = fileObj.fileData || '';
            if (!tsv.trim()) return;

            let rows = [];
            let columns = [];
            try {
                rows = (window.d3 && typeof window.d3.tsvParse === 'function') ? window.d3.tsvParse(tsv) : [];
                columns = rows && rows.columns ? rows.columns : (rows[0] ? Object.keys(rows[0]) : []);
            } catch (e) {
                rows = [];
            }
            if (!rows || rows.length === 0) return;

            const col =
                columns.includes('sample_id') ? 'sample_id' :
                columns.includes('id') ? 'id' :
                columns.includes('name') ? 'name' :
                (columns[0] || null);
            if (!col) return;

            const matched = [];
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const id = String((r && r[col]) != null ? r[col] : '').trim();
                if (leafIds.has(id)) matched.push({ idx: i, row: r });
            }

            linesOut.push(`### ${fileName}`);
            linesOut.push(`id_column\t${col}`);
            linesOut.push(`matched\t${matched.length}/${rows.length}`);
            linesOut.push(`line_no\t${columns.join('\t')}`);
            matched.forEach(m => {
                const lineNo = m.idx + 2;
                const vals = columns.map(k => {
                    const v = m.row[k];
                    return (v == null) ? '' : String(v).replace(/\r?\n/g, ' ');
                });
                linesOut.push(`${lineNo}\t${vals.join('\t')}`);
            });
            linesOut.push('');

            const filteredTsvLines = [];
            filteredTsvLines.push(columns.join('\t'));
            matched.forEach(m => {
                const vals = columns.map(k => {
                    const v = m.row[k];
                    return (v == null) ? '' : String(v).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
                });
                filteredTsvLines.push(vals.join('\t'));
            });
            const filteredBlob = new Blob([filteredTsvLines.join('\n') + '\n'], { type: 'text/tab-separated-values;charset=utf-8' });
            const fUrl = URL.createObjectURL(filteredBlob);
            const fa = document.createElement('a');
            fa.href = fUrl;
            fa.download = `${base}_${fileName}_filtered.tsv`;
            document.body.appendChild(fa);
            fa.click();
            fa.remove();
            setTimeout(() => URL.revokeObjectURL(fUrl), 2000);
        });

        const outBlob = new Blob([linesOut.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
        const outUrl = URL.createObjectURL(outBlob);
        const oa = document.createElement('a');
        oa.href = outUrl;
        oa.download = base + '_layer_rows_for_pruned_leaf_ids.txt';
        document.body.appendChild(oa);
        oa.click();
        oa.remove();
        setTimeout(() => URL.revokeObjectURL(outUrl), 2000);
    }
    window.__tvbot_exportPrunedTreeAndLayerRows = exportPrunedTreeAndLayerRows;

    function injectNativeToolsPanel() {
        if (document.getElementById('tvbot-native-tools')) return;
        const top = document.getElementById('tvbot-top-ui');
        if (top) top.remove();

        const vertical = document.getElementById('VerticalBox');
        const controlContainer = document.getElementById('control-container');
        if (!vertical || !controlContainer) return;

        const box = document.createElement('div');
        box.id = 'tvbot-native-tools';
        box.style.cssText = 'padding:8px; border-bottom:1px solid #e5e7eb; background:#fff;';

        const title = document.createElement('div');
        title.innerText = 'TVBOT Tools';
        title.style.cssText = 'font-weight:700; font-size:12px; color:#374151; margin-bottom:6px;';

        const row1 = document.createElement('div');
        row1.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;';

        const layoutLabel = document.createElement('span');
        layoutLabel.innerText = 'Layout';
        layoutLabel.style.cssText = 'font-size:12px; color:#6b7280; font-weight:700;';

        const layoutSelect = document.createElement('select');
        layoutSelect.id = 'tvbot-native-layout-select';
        layoutSelect.className = 'form-select form-select-sm';
        layoutSelect.style.cssText = 'width:120px;';
        [
            { value: 'normalTree', label: 'Normal' },
            { value: 'circleTree', label: 'Circular' },
            { value: 'unrootedTree', label: 'Unrooted' }
        ].forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.innerText = o.label;
            layoutSelect.appendChild(opt);
        });
        const currentPath = (window.location.pathname || '').toLowerCase();
        if (currentPath.includes('circletree')) layoutSelect.value = 'circleTree';
        else if (currentPath.includes('unrootedtree')) layoutSelect.value = 'unrootedTree';
        else layoutSelect.value = 'normalTree';

        layoutSelect.onchange = async (e) => {
            const targetType = e.target.value;
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (!app || typeof app.exportOriginalJsonData !== 'function') {
                alert('Tree is not ready yet.');
                return;
            }
            try {
                const payload = app.exportOriginalJsonData(true);
                if (!payload || typeof payload !== 'object') {
                    alert('Failed to export current state for switching layout.');
                    return;
                }
                payload.plotType = targetType;
                const res = await fetch('/api/layout_state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (!json || !json.success || !json.token) {
                    alert('Failed to prepare layout switch.');
                    return;
                }

                const pmEl = document.getElementById('project-manager-box');
                const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                    ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                    : null;
                const projectId = pmApp && pmApp.projectList && pmApp.currentProjectIndex !== undefined
                    ? (pmApp.projectList[pmApp.currentProjectIndex] && pmApp.projectList[pmApp.currentProjectIndex].projectId)
                    : (new URLSearchParams(window.location.search).get('projectId') || 'default');
                const treeTitle = pmApp && pmApp.treeTitle ? pmApp.treeTitle : 'tree';

                const targetHtml = targetType === 'circleTree' ? 'circleTree.html' : (targetType === 'unrootedTree' ? 'unrootedTree.html' : 'normalTree.html');
                const originalJsonDataUri = `/api/layout_state/${encodeURIComponent(json.token)}`;
                const url = `/${targetHtml}?originalJsonDataUri=${encodeURIComponent(originalJsonDataUri)}&projectId=${encodeURIComponent(projectId || 'default')}&treeTitle=${encodeURIComponent(treeTitle)}&layoutSwitch=1`;
                window.location.href = url;
            } catch (err) {
                alert('Layout switch failed: ' + err.message);
            }
        };

        row1.appendChild(layoutLabel);
        row1.appendChild(layoutSelect);

        const row2 = document.createElement('div');
        row2.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;';

        const treeUndoBtn = document.createElement('button');
        treeUndoBtn.id = 'tvbot-tree-undo';
        treeUndoBtn.className = 'btn btn-sm btn-outline-secondary';
        treeUndoBtn.innerText = 'Undo Clade';
        treeUndoBtn.style.height = '30px';
        treeUndoBtn.onclick = (e) => {
            e.preventDefault();
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (app && getSoftPruneEnabled() && window.__tvbot_soft_prune_api && typeof window.__tvbot_soft_prune_api.undo === 'function') {
                if (window.__tvbot_soft_prune_api.undo()) return;
            }
            if (window.__tvbot_treeUndo && typeof window.__tvbot_treeUndo.undo === 'function') {
                window.__tvbot_treeUndo.undo();
            }
        };

        const treeRedoBtn = document.createElement('button');
        treeRedoBtn.id = 'tvbot-tree-redo';
        treeRedoBtn.className = 'btn btn-sm btn-outline-secondary';
        treeRedoBtn.innerText = 'Redo';
        treeRedoBtn.style.height = '30px';
        treeRedoBtn.onclick = (e) => {
            e.preventDefault();
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (app && getSoftPruneEnabled() && window.__tvbot_soft_prune_api && typeof window.__tvbot_soft_prune_api.redo === 'function') {
                if (window.__tvbot_soft_prune_api.redo()) return;
            }
            if (window.__tvbot_treeUndo && typeof window.__tvbot_treeUndo.redoOnce === 'function') {
                window.__tvbot_treeUndo.redoOnce();
            }
        };

        const softLabel = document.createElement('label');
        softLabel.style.cssText = 'display:flex; align-items:center; gap:6px; margin:0; font-size:12px; color:#666; font-weight:700; user-select:none;';
        const softCb = document.createElement('input');
        softCb.id = 'tvbot-soft-prune-toggle';
        softCb.type = 'checkbox';
        softCb.checked = getSoftPruneEnabled();
        const softTxt = document.createElement('span');
        softTxt.innerText = 'Soft prune';
        softLabel.appendChild(softCb);
        softLabel.appendChild(softTxt);
        softCb.onchange = () => {
            setSoftPruneEnabled(!!softCb.checked);
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (app) {
                setupSoftPrune(app);
                applySoftDeleteMarks(app);
            }
        };

        const exportPrunedBtn = document.createElement('button');
        exportPrunedBtn.id = 'tvbot-export-pruned-bundle';
        exportPrunedBtn.className = 'btn btn-sm btn-outline-primary';
        exportPrunedBtn.innerText = 'Export Pruned';
        exportPrunedBtn.style.height = '30px';
        exportPrunedBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof window.__tvbot_exportPrunedTreeAndLayerRows === 'function') {
                window.__tvbot_exportPrunedTreeAndLayerRows();
            }
        };

        const leafBtn = document.createElement('button');
        leafBtn.id = 'tvbot-export-pruned-leaf-ids';
        leafBtn.className = 'btn btn-sm btn-outline-primary';
        leafBtn.innerText = 'Leaf IDs';
        leafBtn.style.height = '30px';
        leafBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof window.__tvbot_exportPrunedLeafIds === 'function') {
                window.__tvbot_exportPrunedLeafIds();
            }
        };

        row2.appendChild(treeUndoBtn);
        row2.appendChild(treeRedoBtn);
        row2.appendChild(softLabel);
        row2.appendChild(exportPrunedBtn);
        row2.appendChild(leafBtn);

        const rowCheckpoint = document.createElement('div');
        rowCheckpoint.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;';

        const cpLabel = document.createElement('span');
        cpLabel.innerText = 'Checkpoint';
        cpLabel.style.cssText = 'font-size:12px; color:#6b7280; font-weight:700;';

        const cpSelect = document.createElement('select');
        cpSelect.id = 'tvbot-checkpoint-select';
        cpSelect.className = 'form-select form-select-sm';
        cpSelect.style.cssText = 'width:220px;';
        const cpPlaceholder = document.createElement('option');
        cpPlaceholder.value = '';
        cpPlaceholder.innerText = 'Select...';
        cpSelect.appendChild(cpPlaceholder);

        const resolveProjectId = () => {
            const pmEl = document.getElementById('project-manager-box');
            const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                : null;
            if (pmApp && pmApp.projectList && pmApp.currentProjectIndex !== undefined) {
                const current = pmApp.projectList[pmApp.currentProjectIndex];
                if (current && current.projectId) return String(current.projectId);
            }
            const params = new URLSearchParams(window.location.search);
            return String(params.get('projectId') || 'default');
        };
        const resolveTreeTitle = () => {
            const pmEl = document.getElementById('project-manager-box');
            const pmApp = (pmEl && (pmEl.__vue_app__ || pmEl.__vue__))
                ? (pmEl.__vue_app__ ? pmEl.__vue_app__._instance.proxy : pmEl.__vue__)
                : null;
            if (pmApp && pmApp.treeTitle) return String(pmApp.treeTitle);
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (app && app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
                const v = app.figureData.export["Save figure"].fileName.value;
                if (v) return String(v);
            }
            return 'tree';
        };
        const resolveHtml = () => {
            const p = (window.location.pathname || '').toLowerCase();
            if (p.includes('circletree')) return 'circleTree.html';
            if (p.includes('unrootedtree')) return 'unrootedTree.html';
            return 'normalTree.html';
        };

        const sanitizeFileStem = (s) => String(s || '').trim().replace(/[\\\/:*?"<>|]/g, '_');
        const cpPrefix = () => `${sanitizeFileStem(resolveTreeTitle())}__checkpoint__`;
        const refreshCheckpoints = async () => {
            const projectId = resolveProjectId();
            const prefix = cpPrefix();
            const res = await fetch('/tvbot/getTreeList');
            const json = await res.json();
            const list = Array.isArray(json && json.treeList) ? json.treeList : [];
            const cps = list
                .filter(t => t && String(t.projectId) === String(projectId) && typeof t.treeName === 'string' && t.treeName.startsWith(prefix))
                .map(t => t.treeName)
                .sort();

            while (cpSelect.options.length > 1) cpSelect.remove(1);
            cps.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name.replace(prefix, '');
                cpSelect.appendChild(opt);
            });
        };

        const cpRefreshBtn = document.createElement('button');
        cpRefreshBtn.className = 'btn btn-sm btn-outline-secondary';
        cpRefreshBtn.innerText = 'Refresh';
        cpRefreshBtn.style.height = '30px';
        cpRefreshBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                await refreshCheckpoints();
            } catch (err) {
                alert('Failed to refresh checkpoints: ' + err.message);
            }
        };

        const cpSaveBtn = document.createElement('button');
        cpSaveBtn.className = 'btn btn-sm btn-outline-primary';
        cpSaveBtn.innerText = 'Save';
        cpSaveBtn.style.height = '30px';
        cpSaveBtn.onclick = async (e) => {
            e.preventDefault();
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (!app || typeof app.exportOriginalJsonData !== 'function') {
                alert('Tree is not ready yet.');
                return;
            }
            const name = prompt('Checkpoint name?', new Date().toISOString().replace(/[:.]/g, '-'));
            if (!name) return;
            const safe = String(name).trim().replace(/[\\\/:*?"<>|]/g, '_');
            if (!safe) return;
            const treeName = cpPrefix() + safe;
            const projectId = resolveProjectId();
            const payload = app.exportOriginalJsonData(true);
            try {
                const res = await fetch('/tvbot/saveOriginalJsonData', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ treeName, projectId, jsonData: payload })
                });
                const json = await res.json();
                if (!json || !json.success) throw new Error((json && json.error) || 'save failed');
                await refreshCheckpoints();
                cpSelect.value = treeName;
            } catch (err) {
                alert('Checkpoint save failed: ' + err.message);
            }
        };

        const cpGoBtn = document.createElement('button');
        cpGoBtn.className = 'btn btn-sm btn-outline-success';
        cpGoBtn.innerText = 'Go';
        cpGoBtn.style.height = '30px';
        cpGoBtn.onclick = (e) => {
            e.preventDefault();
            const treeName = cpSelect.value;
            if (!treeName) return;
            const projectId = resolveProjectId();
            const html = resolveHtml();
            const originalJsonDataUri = `/api/get_tree/${encodeURIComponent(projectId)}/${encodeURIComponent(treeName)}.json`;
            const url = `/${html}?originalJsonDataUri=${encodeURIComponent(originalJsonDataUri)}&projectId=${encodeURIComponent(projectId)}&treeTitle=${encodeURIComponent(resolveTreeTitle())}&checkpoint=1`;
            try {
                window.__tvbot_skip_beforeunload = true;
                sessionStorage.setItem('tvbot_skip_beforeunload_once', '1');
            } catch (e2) {}
            window.location.href = url;
        };

        const cpCopyBtn = document.createElement('button');
        cpCopyBtn.className = 'btn btn-sm btn-outline-primary';
        cpCopyBtn.innerText = 'Copy Tree';
        cpCopyBtn.style.height = '30px';
        cpCopyBtn.onclick = async (e) => {
            e.preventDefault();
            const app = window.normalTree || window.circleTree || window.unrootedTree;
            if (!app || typeof app.exportOriginalJsonData !== 'function') {
                alert('Tree is not ready yet.');
                return;
            }
            const base = sanitizeFileStem(resolveTreeTitle());
            const def = `${base}_copy_${new Date().toISOString().replace(/[:.]/g, '-')}`;
            const name = prompt('New tree file name?', def);
            if (!name) return;
            const safe = sanitizeFileStem(String(name));
            if (!safe) return;
            const treeName = safe.replace(/\.json$/i, '');
            const projectId = resolveProjectId();
            const payload = app.exportOriginalJsonData(true);
            try {
                const res = await fetch('/tvbot/saveOriginalJsonData', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ treeName, projectId, jsonData: payload })
                });
                const json = await res.json();
                if (!json || !json.success) throw new Error((json && json.error) || 'copy failed');
                alert('Copied: ' + treeName);
            } catch (err) {
                alert('Copy failed: ' + err.message);
            }
        };

        rowCheckpoint.appendChild(cpLabel);
        rowCheckpoint.appendChild(cpSelect);
        rowCheckpoint.appendChild(cpRefreshBtn);
        rowCheckpoint.appendChild(cpSaveBtn);
        rowCheckpoint.appendChild(cpCopyBtn);
        rowCheckpoint.appendChild(cpGoBtn);

        const row3 = document.createElement('div');
        row3.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;';

        const annotBtn = document.createElement('button');
        annotBtn.id = 'tvbot-annotate-toggle';
        annotBtn.className = 'btn btn-sm btn-outline-success';
        annotBtn.innerText = 'Annotate';
        annotBtn.style.height = '30px';

        const toolSelect = document.createElement('select');
        toolSelect.id = 'tvbot-annotate-tool';
        toolSelect.className = 'form-select form-select-sm';
        toolSelect.style.cssText = 'width:110px;';
        [
            { v: 'pen', t: 'Pen' },
            { v: 'line', t: 'Line' },
            { v: 'rect', t: 'Rect' },
            { v: 'circle', t: 'Circle' },
            { v: 'text', t: 'Text' }
        ].forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.v;
            opt.innerText = o.t;
            toolSelect.appendChild(opt);
        });

        const colorInput = document.createElement('input');
        colorInput.id = 'tvbot-annotate-color';
        colorInput.type = 'color';
        colorInput.value = '#ff3b30';
        colorInput.style.width = '34px';
        colorInput.style.height = '30px';
        colorInput.style.border = 'none';
        colorInput.style.padding = '0';
        colorInput.style.background = 'transparent';

        const widthInput = document.createElement('input');
        widthInput.id = 'tvbot-annotate-width';
        widthInput.type = 'number';
        widthInput.min = '1';
        widthInput.max = '20';
        widthInput.value = '2';
        widthInput.className = 'form-control form-control-sm';
        widthInput.style.cssText = 'width:56px; height:30px;';

        const fontInput = document.createElement('input');
        fontInput.id = 'tvbot-annotate-font';
        fontInput.type = 'number';
        fontInput.min = '8';
        fontInput.max = '96';
        fontInput.value = '16';
        fontInput.className = 'form-control form-control-sm';
        fontInput.style.cssText = 'width:56px; height:30px;';

        const italicLabel = document.createElement('label');
        italicLabel.style.cssText = 'display:flex; align-items:center; gap:6px; margin:0; font-size:12px; color:#666; font-weight:700; user-select:none;';
        const italicCb = document.createElement('input');
        italicCb.id = 'tvbot-annotate-italic';
        italicCb.type = 'checkbox';
        const italicTxt = document.createElement('span');
        italicTxt.innerText = 'Italic';
        italicLabel.appendChild(italicCb);
        italicLabel.appendChild(italicTxt);

        const undoBtn = document.createElement('button');
        undoBtn.id = 'tvbot-annotate-undo';
        undoBtn.className = 'btn btn-sm btn-outline-secondary';
        undoBtn.innerText = 'Undo';
        undoBtn.style.height = '30px';

        const delBtn = document.createElement('button');
        delBtn.id = 'tvbot-annotate-delete';
        delBtn.className = 'btn btn-sm btn-outline-danger';
        delBtn.innerText = 'Delete';
        delBtn.style.height = '30px';

        const deselectBtn = document.createElement('button');
        deselectBtn.id = 'tvbot-annotate-deselect';
        deselectBtn.className = 'btn btn-sm btn-outline-secondary';
        deselectBtn.innerText = 'Deselect';
        deselectBtn.style.height = '30px';

        const clearBtn = document.createElement('button');
        clearBtn.id = 'tvbot-annotate-clear';
        clearBtn.className = 'btn btn-sm btn-outline-danger';
        clearBtn.innerText = 'Clear';
        clearBtn.style.height = '30px';

        const rowStyle = document.createElement('div');
        rowStyle.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;';

        const styleLabel = document.createElement('span');
        styleLabel.innerText = 'Node Style';
        styleLabel.style.cssText = 'font-size:12px; color:#6b7280; font-weight:700;';

        const styleHint = document.createElement('span');
        styleHint.innerText = 'Left-click node/branch, then use toolbar';
        styleHint.style.cssText = 'font-size:12px; color:#9ca3af;';

        const branchColorBtn = document.createElement('button');
        branchColorBtn.className = 'btn btn-sm btn-outline-warning';
        branchColorBtn.innerText = 'Branch Color';
        branchColorBtn.style.height = '30px';
        branchColorBtn.onclick = () => {
            const api = window.__tvbot_node_style_api;
            const info = api && api.getCurrentNodeInfo ? api.getCurrentNodeInfo() : null;
            if (!info || !info.hasParent) {
                alert('Please left-click a node or branch first.');
                return;
            }
            const color = prompt('Branch color (#hex or CSS color):', '#f97316');
            if (color == null) return;
            if (!api.styleCurrentBranch({ color })) {
                alert('Please left-click a node or branch first.');
            }
        };

        const branchBoldBtn = document.createElement('button');
        branchBoldBtn.className = 'btn btn-sm btn-outline-warning';
        branchBoldBtn.innerText = 'Branch Bold';
        branchBoldBtn.style.height = '30px';
        branchBoldBtn.onclick = () => {
            const api = window.__tvbot_node_style_api;
            const info = api && api.getCurrentNodeInfo ? api.getCurrentNodeInfo() : null;
            if (!info || !info.hasParent) {
                alert('Please left-click a node or branch first.');
                return;
            }
            const width = prompt('Branch width:', '3.6');
            if (width == null) return;
            if (!api.styleCurrentBranch({ width, bold: true })) {
                alert('Please left-click a node or branch first.');
            }
        };

        const leafColorBtn = document.createElement('button');
        leafColorBtn.className = 'btn btn-sm btn-outline-danger';
        leafColorBtn.innerText = 'Leaf Color';
        leafColorBtn.style.height = '30px';
        leafColorBtn.onclick = () => {
            const api = window.__tvbot_node_style_api;
            const info = api && api.getCurrentNodeInfo ? api.getCurrentNodeInfo() : null;
            if (!info || !info.isLeaf) {
                alert('Please left-click a leaf node first.');
                return;
            }
            const color = prompt('Leaf label color (#hex or CSS color):', '#dc2626');
            if (color == null) return;
            api.styleCurrentLeaf({ color });
        };

        const leafBoldBtn = document.createElement('button');
        leafBoldBtn.className = 'btn btn-sm btn-outline-danger';
        leafBoldBtn.innerText = 'Leaf Bold';
        leafBoldBtn.style.height = '30px';
        leafBoldBtn.onclick = () => {
            const api = window.__tvbot_node_style_api;
            const info = api && api.getCurrentNodeInfo ? api.getCurrentNodeInfo() : null;
            if (!info || !info.isLeaf) {
                alert('Please left-click a leaf node first.');
                return;
            }
            api.styleCurrentLeaf({ bold: true });
        };

        const clearNodeStyleBtn = document.createElement('button');
        clearNodeStyleBtn.className = 'btn btn-sm btn-outline-secondary';
        clearNodeStyleBtn.innerText = 'Reset Style';
        clearNodeStyleBtn.style.height = '30px';
        clearNodeStyleBtn.onclick = () => {
            const api = window.__tvbot_node_style_api;
            if (!api) return;
            const info = api.getCurrentNodeInfo ? api.getCurrentNodeInfo() : null;
            if (!info) {
                alert('Please select a node first.');
                return;
            }
            if (info.hasParent) api.clearCurrentBranchStyle();
            if (info.isLeaf) api.clearCurrentLeafStyle();
        };

        const exportLabel = document.createElement('label');
        exportLabel.style.cssText = 'display:flex; align-items:center; gap:6px; margin:0; font-size:12px; color:#666; font-weight:700; user-select:none;';
        const exportCb = document.createElement('input');
        exportCb.id = 'tvbot-annotate-export';
        exportCb.type = 'checkbox';
        exportCb.checked = true;
        const exportTxt = document.createElement('span');
        exportTxt.innerText = 'Export';
        exportLabel.appendChild(exportCb);
        exportLabel.appendChild(exportTxt);

        row3.appendChild(annotBtn);
        row3.appendChild(toolSelect);
        row3.appendChild(colorInput);
        row3.appendChild(widthInput);
        row3.appendChild(fontInput);
        row3.appendChild(italicLabel);
        row3.appendChild(undoBtn);
        row3.appendChild(delBtn);
        row3.appendChild(deselectBtn);
        row3.appendChild(clearBtn);
        row3.appendChild(exportLabel);

        rowStyle.appendChild(styleLabel);
        rowStyle.appendChild(styleHint);
        rowStyle.appendChild(branchColorBtn);
        rowStyle.appendChild(branchBoldBtn);
        rowStyle.appendChild(leafColorBtn);
        rowStyle.appendChild(leafBoldBtn);
        rowStyle.appendChild(clearNodeStyleBtn);

        box.appendChild(title);
        box.appendChild(row1);
        box.appendChild(row2);
        box.appendChild(rowCheckpoint);
        box.appendChild(rowStyle);
        box.appendChild(row3);

        vertical.insertBefore(box, vertical.firstChild);
        refreshCheckpoints().catch(() => {});

        const refreshTreeOpsState = () => {
            const btn = document.getElementById('tvbot-tree-undo');
            const redoBtn = document.getElementById('tvbot-tree-redo');
            if (!btn) return;
            const size = window.__tvbot_treeUndo && Array.isArray(window.__tvbot_treeUndo.stack) ? window.__tvbot_treeUndo.stack.length : 0;
            btn.disabled = size <= 0;
            btn.title = size > 0 ? `Undo last clade deletion (${size})` : 'No undo history';
            if (redoBtn) {
                const rsize = window.__tvbot_treeUndo && Array.isArray(window.__tvbot_treeUndo.redo) ? window.__tvbot_treeUndo.redo.length : 0;
                redoBtn.disabled = rsize <= 0;
                redoBtn.title = rsize > 0 ? `Redo (${rsize})` : 'No redo history';
            }
        };
        refreshTreeOpsState();
        setInterval(refreshTreeOpsState, 600);
    }

    // Fix interactive features like dragging and auto-scaling
    function patchTreeInstance(app) {
        if (!app || app._patched) return;
        console.log("Patching tree instance for better interactivity and filename recognition");

        // 0. Intercept onLoadNewFile to capture filename
        const originalOnLoad = app.onLoadNewFile;
        app.onLoadNewFile = function(data, source, labels) {
            const loadingBox = document.getElementById('page-loading-box');
            const loadingText = loadingBox ? loadingBox.querySelector('span') : null;
            const startTs = (window.performance && performance.now) ? performance.now() : Date.now();
            const showLoading = (msg) => {
                if (!loadingBox) return;
                loadingBox.style.display = 'flex';
                if (loadingText) loadingText.innerText = msg || 'Loading...';
            };
            const hideLoading = () => {
                if (!loadingBox) return;
                loadingBox.style.display = 'none';
            };
            const elapsedSec = () => {
                const now = (window.performance && performance.now) ? performance.now() : Date.now();
                return Math.max(0, (now - startTs) / 1000).toFixed(1);
            };

            showLoading('Loading tree...');

            const looksLikeTreeImport = (payload) => {
                if (typeof payload === 'string') return true;
                if (payload && typeof payload === 'object') {
                    if (Array.isArray(payload)) {
                        if (payload.length === 0) return false;
                        if (typeof payload[0] === 'string') return true;
                        if (payload[0] && typeof payload[0] === 'object' && payload[0].columns) return false;
                        return false;
                    }
                    if (payload.plotType) return true;
                    if (payload.originalData && payload.originalData.mainDataArr) return true;
                    if (payload.mainDataArr) return true;
                    if (payload.columns) return false;
                }
                return false;
            };

            if (labels && looksLikeTreeImport(data)) {
                lastLoadedFilename = Array.isArray(labels) ? labels[0] : labels;
                // Remove extension if present
                lastLoadedFilename = lastLoadedFilename.replace(/\.[^/.]+$/, "");
                console.log("Captured filename:", lastLoadedFilename);
                if (window.__tvbot_treeUndo && typeof window.__tvbot_treeUndo.reset === 'function') {
                    const params = new URLSearchParams(window.location.search);
                    const isHistoryReload = params.get('undo') === '1' || params.get('redo') === '1';
                    window.__tvbot_treeUndo.reset(!isHistoryReload);
                    if (!isHistoryReload && app && app.styleData) {
                        app.__tvbot_selected_branch_node_index = null;
                        if (Array.isArray(app.styleData.deleteWholeCladeList)) app.styleData.deleteWholeCladeList = [];
                        if (Array.isArray(app.styleData.collapseCladeList)) app.styleData.collapseCladeList = [];
                        if (Array.isArray(app.styleData.reverseChildrenList)) app.styleData.reverseChildrenList = [];
                        if (Array.isArray(app.styleData.tvbotSoftDeletedLeafIds)) app.styleData.tvbotSoftDeletedLeafIds = [];
                        if (Array.isArray(app.styleData.tvbotSoftUndo)) app.styleData.tvbotSoftUndo = [];
                        if (Array.isArray(app.styleData.tvbotSoftRedo)) app.styleData.tvbotSoftRedo = [];
                        if (Array.isArray(app.styleData.tvbotBranchStyles)) app.styleData.tvbotBranchStyles = [];
                        if (Array.isArray(app.styleData.tvbotLeafStyles)) app.styleData.tvbotLeafStyles = [];
                    }
                }
                
                // 1. Sync to project manager immediately
                const el = document.getElementById('project-manager-box');
                if (el && (el.__vue_app__ || el.__vue__)) {
                    const vueApp = el.__vue_app__ ? el.__vue_app__._instance.proxy : el.__vue__;
                    if (vueApp) {
                        vueApp.treeTitle = lastLoadedFilename;
                        console.log("Synced treeTitle to Vue:", lastLoadedFilename);
                        
                        // Force Vue to update and propagate the change
                        if (vueApp.$forceUpdate) vueApp.$forceUpdate();
                    }
                }

                // 2. Sync to figureData export name if available
                if (app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
                    app.figureData.export["Save figure"].fileName.value = lastLoadedFilename;
                    console.log("Synced export filename to figureData:", lastLoadedFilename);
                    
                    // Force update control plane if it exists
                    if (app.Vue && app.Vue.$refs && app.Vue.$refs.controlPlane) {
                        app.Vue.$refs.controlPlane.$forceUpdate();
                    }
                }

                // Clear it after a short delay so the syncInterval picks it up but doesn't overwrite future changes
                setTimeout(() => { lastLoadedFilename = ""; }, 5000);
            }
            let result;
            try {
                result = originalOnLoad.apply(this, arguments);
            } catch (err) {
                hideLoading();
                const appInst = window.normalTree || window.circleTree || window.unrootedTree;
                if (appInst && appInst.showMessageBox) {
                    appInst.showMessageBox("cuIcon-roundclose", "Import failed: " + (err && err.message ? err.message : String(err)), "error");
                } else {
                    alert("Import failed: " + (err && err.message ? err.message : String(err)));
                }
                throw err;
            }

            let tries = 0;
            const readyCheck = setInterval(() => {
                tries += 1;
                const svg = document.querySelector('svg#svg');
                const hasSvg = svg && svg.childNodes && svg.childNodes.length > 0;
                const appNow = window.normalTree || window.circleTree || window.unrootedTree;
                const hasTree = appNow && appNow.treeHierarchy;
                if (loadingText) {
                    loadingText.innerText = `Loading... ${elapsedSec()}s`;
                }
                if (hasSvg && hasTree) {
                    clearInterval(readyCheck);
                    setupSoftPrune(appNow);
                    setupNodeStyling(appNow);
                    applySoftDeleteMarks(appNow);
                    applyNodeStyleMarks(appNow);
                    injectContextMenuStyling(appNow);
                    hideLoading();
                    return;
                }
                if (tries > 120) {
                    clearInterval(readyCheck);
                    hideLoading();
                }
            }, 250);

            return result;
        };

        if (!app._appendSpacingPatched) {
            app._appendSpacingPatched = true;
            let lastSignature = '';
            setInterval(() => {
                try {
                    const lc = app.layerComponent;
                    if (!lc || !lc.layerStatistic) return;
                    const stat = lc.layerStatistic;
                    const sig = Object.keys(stat).map(k => `${k}:${Array.isArray(stat[k]) ? stat[k].length : 0}`).join('|');
                    if (sig === lastSignature) return;
                    lastSignature = sig;

                    let changed = false;
                    Object.keys(stat).forEach(k => {
                        if (!k || !String(k).toLowerCase().includes('append')) return;
                        const arr = stat[k];
                        if (!Array.isArray(arr)) return;
                        arr.forEach(item => {
                            const spacing = item && item.controlData && item.controlData.Layout && item.controlData.Layout.spacing;
                            if (spacing && typeof spacing.value === 'number' && spacing.value >= 15) {
                                spacing.value = 6;
                                changed = true;
                            }
                        });
                    });

                    if (changed && typeof app.init === 'function') {
                        app.init('attrChanged');
                        if (app.Vue && app.Vue.$refs && app.Vue.$refs.controlPlane) {
                            app.Vue.$refs.controlPlane.$forceUpdate();
                        }
                    }
                } catch (e) {
                }
            }, 800);
        }

        // 1. Fix the drag behavior
        const originalDrag = app.drag;
        if (originalDrag) {
            app.drag = function(options = {}) {
                const { enableX = true, enableY = true, updateElementArr } = options;
                return d3.drag()
                    .on("start", function() { d3.select(this).raise().classed("stroke-orange", true); })
                    .on("drag", function(event, d) {
                        const e = (event && event.x !== undefined) ? event : (window.d3 && window.d3.event);
                        if (!e) return;
                        let datum = d;
                        if (!(event && event.x !== undefined)) datum = event;
                        if (!datum || typeof datum !== 'object') {
                            datum = d3.select(this).datum();
                            if (!datum || typeof datum !== 'object') {
                                if (!this._dragState) this._dragState = { x: 0, y: 0 };
                                datum = this._dragState;
                            }
                        }
                        let x = datum.x || 0, y = datum.y || 0;
                        if (enableX) x = e.x;
                        if (enableY) y = e.y;
                        datum.x = x; datum.y = y;
                        d3.select(this).attr("transform", `translate(${x},${y})`);
                        if (updateElementArr) {
                            updateElementArr.forEach(item => {
                                for (let attr in item.updateAttrs) d3.selectAll(`.${item.elementClass}`).attr(attr, item.updateAttrs[attr]);
                            });
                        }
                    })
                    .on("end", function() { d3.select(this).classed("stroke-orange", false); });
            };
        }

        // 2. Fix auto-scaling
        const originalAddAxis = app.addAxis;
        if (originalAddAxis) {
            app.addAxis = function(a, t, e, l = "axisTop", options = {}) {
                if (e && typeof e.nice === 'function') e.nice();
                return originalAddAxis.call(this, a, t, e, l, options);
            };
        }

        // Initial sync if treeTitle is in URL
        const params = new URLSearchParams(window.location.search);
        const urlTitle = params.get('treeTitle');
        if (urlTitle) {
            if (app.figureData && app.figureData.export && app.figureData.export["Save figure"]) {
                app.figureData.export["Save figure"].fileName.value = urlTitle;
            }
        }

        setupTreeUndo(app);
        setupSoftPrune(app);
        setupNodeStyling(app);
        injectContextMenuStyling(app);
        app._patched = true;
    }

    function checkAndPatch() {
        const app = window.normalTree || window.circleTree || window.unrootedTree;
        if (app) {
            patchTreeInstance(app);
        } else {
            setTimeout(checkAndPatch, 500);
        }
    }

    // Patch the native Project Manager UI
    function patchProjectManager() {
        const checkVue = setInterval(() => {
            const el = document.getElementById('project-manager-box');
            // Check for Vue 3 app or Vue 2 instance
            if (el && (el.__vue_app__ || el.__vue__)) {
                clearInterval(checkVue);
                console.log("Patching native project manager UI");
                
                // 1. Add "New Project" and "Delete Project" buttons
                const projectSelect = el.querySelector('select');
                if (projectSelect && !document.getElementById('local-project-controls')) {
                    const btnContainer = document.createElement('div');
                    btnContainer.id = 'local-project-controls';
                    btnContainer.className = 'd-flex align-items-center ms-1 gap-1';
                    
                    // New Project Button
                    const newBtn = document.createElement('button');
                    newBtn.id = 'local-new-project-btn';
                    newBtn.className = 'btn btn-sm btn-outline-primary';
                    newBtn.innerHTML = '<i class="bi bi-plus-lg"></i>';
                    newBtn.title = "Create New Project Folder";
                    newBtn.style.height = "30px";
                    newBtn.style.padding = "0 8px";
                    newBtn.onclick = async (e) => {
                        e.preventDefault();
                        const name = prompt("Enter new project/folder name:");
                        if (!name) return;
                        try {
                            const res = await window.axios.post('/api/create_project', { projectName: name });
                            if (res.data.success) {
                                alert("Project created successfully!");
                                location.reload(); 
                            } else {
                                alert("Error: " + res.data.error);
                            }
                        } catch (err) {
                            alert("Failed to create project: " + err.message);
                        }
                    };

                    const renameBtn = document.createElement('button');
                    renameBtn.id = 'local-rename-project-btn';
                    renameBtn.className = 'btn btn-sm btn-outline-secondary';
                    renameBtn.innerHTML = '<i class="bi bi-pencil-square"></i>';
                    renameBtn.title = "Rename Selected Project Folder";
                    renameBtn.style.height = "30px";
                    renameBtn.style.padding = "0 8px";
                    renameBtn.onclick = async (e) => {
                        e.preventDefault();
                        const app = el.__vue_app__ ? el.__vue_app__._instance.proxy : el.__vue__;
                        if (!app || !app.projectList || app.currentProjectIndex === undefined) return;
                        const project = app.projectList[app.currentProjectIndex];
                        const oldName = project && project.projectId ? project.projectId : '';
                        if (!oldName) return;
                        if (String(oldName).toLowerCase() === 'default') {
                            alert("Cannot rename the Default project.");
                            return;
                        }
                        const newName = prompt("Enter new folder name:", oldName);
                        if (!newName) return;
                        try {
                            const res = await window.axios.post('/api/rename_project', { oldName, newName });
                            if (res.data.success) {
                                alert("Project renamed successfully!");
                                location.reload();
                            } else {
                                alert("Error: " + res.data.error);
                            }
                        } catch (err) {
                            alert("Failed to rename project: " + err.message);
                        }
                    };

                    // Delete Project Button
                    const delBtn = document.createElement('button');
                    delBtn.id = 'local-delete-project-btn';
                    delBtn.className = 'btn btn-sm btn-outline-danger';
                    delBtn.innerHTML = '<i class="bi bi-trash"></i>';
                    delBtn.title = "Delete Selected Project Folder";
                    delBtn.style.height = "30px";
                    delBtn.style.padding = "0 8px";
                    delBtn.onclick = async (e) => {
                        e.preventDefault();
                        const app = el.__vue_app__ ? el.__vue_app__._instance.proxy : el.__vue__;
                        if (!app || !app.projectList || app.currentProjectIndex === undefined) return;
                        
                        const project = app.projectList[app.currentProjectIndex];
                        const projectName = project.projectId;
                        
                        if (projectName === 'default' || projectName === 'Default') {
                            alert("Cannot delete the Default project.");
                            return;
                        }
                        
                        if (confirm(`Are you sure you want to delete the entire project folder "${projectName}"? ALL trees inside will be lost.`)) {
                            try {
                                const res = await window.axios.delete('/api/delete_project/' + projectName);
                                if (res.data.success) {
                                    alert("Project deleted successfully!");
                                    location.reload();
                                } else {
                                    alert("Error: " + res.data.error);
                                }
                            } catch (err) {
                                alert("Failed to delete project: " + err.message);
                            }
                        }
                    };
                    
                    btnContainer.appendChild(newBtn);
                    btnContainer.appendChild(renameBtn);
                    btnContainer.appendChild(delBtn);
                    
                    projectSelect.parentNode.style.display = "flex";
                    projectSelect.parentNode.style.alignItems = "center";
                    projectSelect.parentNode.appendChild(btnContainer);
                }

                // 2. Try to sync current project and title
                const params = new URLSearchParams(window.location.search);
                const urlProjectId = params.get('projectId');
                const urlTreeTitle = params.get('treeTitle');
                
                // Periodically check and sync until it takes effect
                let syncCount = 0;
                const syncInterval = setInterval(() => {
                    const app = el.__vue_app__ ? el.__vue_app__._instance.proxy : el.__vue__;
                    if (app) {
                        let changed = false;
                        // Sync Project
                        if (urlProjectId && app.projectList) {
                            const idx = app.projectList.findIndex(p => p.projectId === urlProjectId);
                            if (idx !== -1 && app.currentProjectIndex !== idx) {
                                app.currentProjectIndex = idx;
                                changed = true;
                            }
                        }
                        
                        // Sync Title
                        if (urlTreeTitle) {
                            if (app.treeTitle !== urlTreeTitle) {
                                app.treeTitle = urlTreeTitle;
                                changed = true;
                            }
                        } else if (lastLoadedFilename) {
                            // If we just imported a file, FORCE the title
                            app.treeTitle = lastLoadedFilename;
                            changed = true;
                            // DO NOT clear it here, clear it in onLoadNewFile after a small delay
                        }
                        
                        // Sync to figureData export name if changed
                        const treeApp = window.normalTree || window.circleTree || window.unrootedTree;
                        if (treeApp && treeApp.figureData && treeApp.figureData.export && treeApp.figureData.export["Save figure"]) {
                            if (treeApp.figureData.export["Save figure"].fileName.value !== app.treeTitle) {
                                treeApp.figureData.export["Save figure"].fileName.value = app.treeTitle;
                                changed = true;
                            }
                        }
                        
                        if (changed) console.log("Synced project manager state");
                    }
                    if (++syncCount > 20) clearInterval(syncInterval);
                }, 1000);
            }
        }, 1000);
    }

    // Initialize UI features
    window.addEventListener('load', () => {
        injectMainUIStyles();
        const tryInject = setInterval(() => {
            injectNativeToolsPanel();
            if (document.getElementById('tvbot-native-tools')) clearInterval(tryInject);
        }, 400);
        loadPDFLibraries();
        setupExportIntercept();
        handleAutoExport();
        const initAnnot = setInterval(() => {
            const svg = document.querySelector('svg#svg');
            if (svg) {
                clearInterval(initAnnot);
                ensureManualAnnotLayer();
                setupManualAnnot();
            }
        }, 300);
        checkAndPatch();
        patchProjectManager();
    });

    // Handle automatic export if requested via URL params
    async function handleAutoExport() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autoExportPDF') === 'true') {
            const exportName = params.get('exportName') || 'exported_tree';
            console.log("Auto-export triggered for:", exportName);
            
            // Wait for tree to be fully loaded and rendered
            // We'll check for treeHierarchy and app instance
            const checkReady = setInterval(() => {
                const app = window.normalTree || window.circleTree || window.unrootedTree;
                if (app && app.treeHierarchy) {
                    clearInterval(checkReady);
                    
                    // Give extra time for D3 rendering to finish
                    setTimeout(async () => {
                        const svgElement = document.querySelector('svg#svg');
                        if (svgElement) {
                            try {
                                await exportToPDF(svgElement, exportName);
                                // Signal back to parent window
                                if (window.parent) {
                                    window.parent.postMessage('export_complete_' + exportName, '*');
                                }
                            } catch (err) {
                                console.error("Auto-export failed:", err);
                            }
                        }
                    }, 3000); // 3 second delay for complex trees
                }
            }, 1000);
        }
    }

    function applyBootstrapDefaults(app) {
        if (!app.treeHierarchy) return;

        // Check if any internal node has a non-empty name (usually bootstrap values)
        const hasBootstraps = app.treeHierarchy.descendants().some(d => 
            d.children && d.data.name && !isNaN(parseFloat(d.data.name)) && parseFloat(d.data.name) > 0
        );

        if (hasBootstraps) {
            console.log("Detected bootstraps in tree, applying bootstrap display defaults.");
            
            // 1. Enable Bootstraps display
            app.figureData.branches.Bootstraps.switch.value = true;
            
            // 2. Set default type to "text" (value 0)
            app.figureData.branches.Bootstraps.type.value = 0;
            
            // 3. Apply bootstrap font and position settings
            app.figureData.branches.Bootstraps["font-size"].value = 3;
            app.figureData.branches.Bootstraps.x.value = -3;
            app.figureData.branches.Bootstraps.y.value = -3;
            
            // 4. Set decimal places to 0
            app.figureData.branches.Bootstraps["round-decimals"].value = 0;

            // Trigger a re-render to show them immediately
            app.init();
            
            // Update the Vue control panel if it exists
            if (app.Vue && app.Vue.$refs && app.Vue.$refs.controlPlane) {
                app.Vue.$refs.controlPlane.$forceUpdate();
            }
        }
    }

    // Check for app instance periodically
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        const app = window.normalTree || window.circleTree || window.unrootedTree;
        checkCount++;
        
        if (app && app.onLoadNewFile && !app._bootstrapPatched) {
            console.log("Patching onLoadNewFile for bootstrap defaults");
            const oldOnLoad = app.onLoadNewFile;
            
            app.onLoadNewFile = function(data, source, labels) {
                const result = oldOnLoad.apply(this, arguments);
                
                // Only run for NEW local files
                if (source === 'local') {
                    requestAnimationFrame(() => {
                        setTimeout(() => applyBootstrapDefaults(this), 200);
                    });
                }
                return result;
            };
            app._bootstrapPatched = true;
            
            // Apply to already loaded tree (initial load)
            if (app.treeHierarchy) {
                applyBootstrapDefaults(app);
            }
            clearInterval(checkInterval);
        }
        
        if (checkCount > 20) clearInterval(checkInterval); 
    }, 1000);
})();
