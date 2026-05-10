// @ts-nocheck

console.log("Tanglegram iframe comparison module loaded.");

const selectedTrees = { 1: null, 2: null };
const localBlobUrls = { 1: null, 2: null };
let connections = [];
let pendingSelection = null;
let overlayTimer = null;
let selectedConnectionIndex = null;
let manualConnectMode = false;
let boxDeleteMode = false;
let canvasPanLocked = false;
let combinedZoomInitialized = false;
let combinedZoomBehavior = null;
let combinedZoomTransform = d3.zoomIdentity.translate(20, 20).scale(1);
const layoutState = {
    rightX: 0,
    rightY: 0
};
const defaultConnectionStyle = {
    color: '#2563eb',
    width: 2,
    opacity: 0.7
};

function getWorkspaceModal() {
    return document.getElementById('workspaceModal');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizePlotType(plotType) {
    const type = String(plotType || 'normalTree');
    if (type === 'circleTree' || type === 'unrootedTree' || type === 'normalTree') return type;
    return 'normalTree';
}

function getTreeFrame(treeNum) {
    return document.getElementById(`tree-frame-${treeNum}`);
}

function getTitleText(treeNum) {
    return treeNum === 1 ? '左侧树' : '右侧树';
}

function setStatus(message) {
    document.getElementById('selection-status').textContent = message;
}

function getStyleInputs() {
    return {
        color: document.getElementById('line-color'),
        width: document.getElementById('line-width'),
        opacity: document.getElementById('line-opacity'),
        widthValue: document.getElementById('line-width-value'),
        opacityValue: document.getElementById('line-opacity-value'),
        hint: document.getElementById('style-hint')
    };
}

function getLayoutInputs() {
    return {
        rightX: document.getElementById('layout-right-x'),
        rightY: document.getElementById('layout-right-y'),
        rightXValue: document.getElementById('layout-right-x-value'),
        rightYValue: document.getElementById('layout-right-y-value')
    };
}

function updateStyleHint() {
    const inputs = getStyleInputs();
    if (selectedConnectionIndex === null) {
        inputs.hint.textContent = '未选中具体连线时，这些参数会作为新连线默认样式。';
    } else {
        inputs.hint.textContent = `当前正在编辑第 ${selectedConnectionIndex + 1} 条连线样式。`;
    }
}

function updateManualModeButton() {
    const button = document.getElementById('btn-manual-mode');
    button.className = manualConnectMode ? 'btn btn-success' : 'btn btn-outline-success';
    button.innerHTML = manualConnectMode
        ? '关闭手动连线模式'
        : '开启手动连线模式';
}

function updateBoxDeleteModeButton() {
    const button = document.getElementById('btn-box-delete-mode');
    button.className = boxDeleteMode ? 'btn btn-danger' : 'btn btn-outline-danger';
    button.textContent = boxDeleteMode ? '关闭框选删线' : '开启框选删线';
}

function updatePanLockButton() {
    const button = document.getElementById('btn-toggle-pan');
    button.className = canvasPanLocked ? 'btn btn-info' : 'btn btn-outline-info';
    button.textContent = canvasPanLocked ? '解锁画布移动' : '锁定画布移动';
}

function refreshStyleControlLabels() {
    const inputs = getStyleInputs();
    inputs.widthValue.textContent = String(inputs.width.value);
    inputs.opacityValue.textContent = String(inputs.opacity.value);
}

function refreshLayoutControlLabels() {
    const inputs = getLayoutInputs();
    inputs.rightXValue.textContent = String(layoutState.rightX);
    inputs.rightYValue.textContent = String(layoutState.rightY);
}

function syncLayoutInputsFromState() {
    const inputs = getLayoutInputs();
    inputs.rightX.value = String(layoutState.rightX);
    inputs.rightY.value = String(layoutState.rightY);
    refreshLayoutControlLabels();
}

function syncStyleControlsFromSelection() {
    const inputs = getStyleInputs();
    const style = selectedConnectionIndex !== null && connections[selectedConnectionIndex]
        ? connections[selectedConnectionIndex].style
        : defaultConnectionStyle;

    inputs.color.value = style.color;
    inputs.width.value = style.width;
    inputs.opacity.value = style.opacity;
    refreshStyleControlLabels();
    updateStyleHint();
}

function readCurrentStyleInputs() {
    const inputs = getStyleInputs();
    return {
        color: inputs.color.value,
        width: Number(inputs.width.value),
        opacity: Number(inputs.opacity.value)
    };
}

function revokeLocalBlob(treeNum) {
    if (localBlobUrls[treeNum]) {
        URL.revokeObjectURL(localBlobUrls[treeNum]);
        localBlobUrls[treeNum] = null;
    }
}

function updateTreeSummary(treeNum) {
    const tree = selectedTrees[treeNum];
    document.getElementById(`label-tree${treeNum}`).textContent = tree ? `[${tree.treeName}]` : '';
    document.getElementById(`tree-title-${treeNum}`).textContent = tree ? tree.treeName : getTitleText(treeNum);
    document.getElementById(`tree-source-${treeNum}`).textContent = tree
        ? `${tree.sourceLabel} | ${tree.plotType}`
        : '尚未加载';

    const openBtn = document.getElementById(`open-tree-${treeNum}`);
    openBtn.disabled = !tree;
}

function buildRenderUrl(config) {
    const params = new URLSearchParams({
        originalJsonDataUri: config.dataUrl,
        projectId: config.projectId || 'default',
        treeTitle: config.treeName,
        embed: '1'
    });
    return `/${config.plotType}.html?${params.toString()}`;
}

function setSelectedTree(treeNum, config) {
    revokeLocalBlob(treeNum);
    if (config.localBlobUrl) localBlobUrls[treeNum] = config.localBlobUrl;
    selectedTrees[treeNum] = {
        ...config,
        renderUrl: buildRenderUrl(config)
    };
    updateTreeSummary(treeNum);
    setStatus(`已选择${getTitleText(treeNum)}：${config.treeName}`);
}

async function fetchTreePayload(projectId, treeName) {
    const dataUrl = `/api/get_tree/${encodeURIComponent(projectId)}/${encodeURIComponent(treeName)}.json`;
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const payload = await res.json();
    return { payload, dataUrl };
}

function attachFrameChrome(treeNum) {
    const tree = selectedTrees[treeNum];
    const openBtn = document.getElementById(`open-tree-${treeNum}`);
    openBtn.onclick = function() {
        if (tree && tree.renderUrl) window.open(tree.renderUrl, '_blank');
    };
}

function prepareEmbeddedFrame(frame) {
    try {
        const doc = frame.contentDocument;
        if (!doc) return;

        if (!doc.getElementById('tanglegram-embed-style')) {
            const style = doc.createElement('style');
            style.id = 'tanglegram-embed-style';
            style.textContent = `
                html, body { margin: 0 !important; height: 100% !important; overflow: auto !important; background: #f8fbff !important; }
                #project-manager-app, #qrcode-app { display: none !important; }
                #svg-div { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; height: auto !important; min-height: 100% !important; overflow: auto !important; background: transparent !important; padding: 12px !important; box-sizing: border-box !important; }
                #svg { margin: 0 auto !important; display: block !important; box-shadow: none !important; border-radius: 0 !important; }
                .tanglegram-clickable { cursor: pointer !important; }
            `;
            doc.head.appendChild(style);
        }
    } catch (err) {
        console.error('Failed to prepare embedded frame:', err);
    }
}

function waitForTreeRender(treeNum, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const frame = getTreeFrame(treeNum);
        const startedAt = Date.now();

        const poll = () => {
            try {
                const doc = frame.contentDocument;
                if (!doc) {
                    if (Date.now() - startedAt > timeoutMs) {
                        reject(new Error('iframe document is not accessible.'));
                        return;
                    }
                    window.setTimeout(poll, 200);
                    return;
                }

                const maingroup = doc.getElementById('maingroup');
                const hasTreeNodes = !!maingroup && maingroup.querySelectorAll('*').length > 0;

                if (hasTreeNodes) {
                    const loadingBox = doc.getElementById('page-loading-box');
                    if (loadingBox) loadingBox.style.display = 'none';
                    resolve();
                    return;
                }

                if (Date.now() - startedAt > timeoutMs) {
                    reject(new Error('tree render timed out.'));
                    return;
                }
            } catch (err) {
                if (Date.now() - startedAt > timeoutMs) {
                    reject(err);
                    return;
                }
            }

            window.setTimeout(poll, 200);
        };

        poll();
    });
}

function resizeFrameToContent(treeNum) {
    try {
        const frame = getTreeFrame(treeNum);
        const doc = frame.contentDocument;
        if (!doc) return;

        const svg = doc.getElementById('svg');
        const svgHeight = svg ? Math.max(svg.getBoundingClientRect().height, Number(svg.getAttribute('height')) || 0) : 0;
        const bodyHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, svgHeight);
        frame.style.height = `${Math.max(780, Math.ceil(bodyHeight) + 24)}px`;
    } catch (err) {
        console.error('Failed to resize frame:', err);
    }
}

function isValidTargetName(name) {
    if (!name) return false;
    const trimmed = String(name).trim();
    if (!trimmed) return false;
    return true;
}

function normalizeFoldedCladeName(name) {
    return String(name || '').trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function getAutoMatchKey(record) {
    const raw = String(record.name || '').trim();
    if (record.kind === 'folded-clade') return normalizeFoldedCladeName(raw);
    return raw;
}

function makeExportBaseName() {
    const left = selectedTrees[1]?.treeName || 'left';
    const right = selectedTrees[2]?.treeName || 'right';
    return `${left}_vs_${right}`.replace(/[\\/:*?"<>|]+/g, '_');
}

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === '1') {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = '1';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

async function ensurePdfLibraries() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        await loadScriptOnce('/static/js/jspdf.umd.min.js');
    }
    const probe = new window.jspdf.jsPDF();
    if (typeof probe.svg !== 'function') {
        await loadScriptOnce('/static/js/svg2pdf.umd.min.js');
    }
}

function getTargetTypeLabel(record) {
    if (record.kind === 'folded-clade') return '折叠 clade';
    return '叶节点';
}

function buildTargetRecord(treeNum, datum, element, kindHint) {
    if (!datum) return null;

    if (datum.data) {
        const data = datum.data;
        const name = data.name || data.nodeIndex || data.uniformNodeId;
        if (!isValidTargetName(name)) return null;
        const inferredKind = data.collapsedLeavesCount || data.isCollapse
            ? 'folded-clade'
            : (!data.children || data.children.length === 0 ? 'leaf' : 'node');
        const kind = kindHint === 'leaf' && inferredKind === 'folded-clade'
            ? 'folded-clade'
            : (kindHint || inferredKind);
        return {
            treeNum,
            kind,
            key: `${kind}:${data.nodeIndex || data.uniformNodeId || name}`,
            name: String(name),
            nodeId: data.nodeIndex || data.uniformNodeId || name,
            explicitName: Boolean(data.name && String(data.name).trim()),
            elementTag: element.tagName,
            element
        };
    }

    return null;
}

function getCombinedSvg() {
    return document.getElementById('combined-svg');
}

function getCombinedLayer(layerId) {
    return document.getElementById(layerId);
}

function ensureCombinedZoom() {
    const svg = d3.select(getCombinedSvg());
    const viewport = d3.select('#tg-viewport-layer');
    if (svg.empty() || viewport.empty()) return;

    if (!combinedZoomBehavior) {
        combinedZoomBehavior = d3.zoom()
            .scaleExtent([0.4, 4])
            .filter((event) => {
                if (canvasPanLocked) return false;
                if (event.type === 'wheel') return true;
                return !event.ctrlKey && !event.button;
            })
            .on('zoom', (event) => {
                combinedZoomTransform = event.transform;
                d3.select('#tg-viewport-layer').attr('transform', event.transform);
            });
    }

    svg.call(combinedZoomBehavior);
    viewport.attr('transform', combinedZoomTransform);
    svg.call(combinedZoomBehavior.transform, combinedZoomTransform);
    combinedZoomInitialized = true;
}

function annotateSourceTargets(treeNum) {
    const frame = getTreeFrame(treeNum);
    const doc = frame.contentDocument;
    if (!doc) return;

    Array.from(doc.querySelectorAll('#maingroup g')).forEach((element) => {
        const record = buildTargetRecord(treeNum, element.__data__, element);
        if (!record || !record.explicitName) return;
        if (record.kind !== 'leaf' && record.kind !== 'folded-clade') return;

        Array.from(element.querySelectorAll('text')).forEach((textEl) => {
            textEl.setAttribute('data-tg-role', 'label');
            textEl.setAttribute('data-tg-tree', String(treeNum));
            textEl.setAttribute('data-tg-kind', record.kind);
            textEl.setAttribute('data-tg-key', record.key);
            textEl.setAttribute('data-tg-name', record.name);
            textEl.setAttribute('data-tg-node-id', String(record.nodeId));
        });
    });
}

function getCombinedTargets(treeNum) {
    const svg = getCombinedSvg();
    if (!svg) return [];
    return Array.from(svg.querySelectorAll(`[data-tg-role="label"][data-tg-tree="${treeNum}"]`)).map((element) => ({
        treeNum,
        kind: element.getAttribute('data-tg-kind'),
        key: element.getAttribute('data-tg-key'),
        name: element.getAttribute('data-tg-name'),
        nodeId: element.getAttribute('data-tg-node-id'),
        explicitName: true,
        element
    }));
}

function findTargetElement(treeNum, key) {
    return getCombinedTargets(treeNum).find((record) => record.key === key)?.element || null;
}

function getAnchorElement(treeNum, key) {
    return findTargetElement(treeNum, key);
}

function getOverlayRect() {
    return getCombinedSvg().getBoundingClientRect();
}

function getViewportLocalPointFromElement(element, treeNum) {
    const svg = getCombinedSvg();
    const viewport = getCombinedLayer('tg-viewport-layer');
    if (!svg || !viewport || !element || typeof element.getBBox !== 'function' || typeof element.getCTM !== 'function') return null;

    const bbox = element.getBBox();
    const elementMatrix = element.getCTM();
    const viewportMatrix = viewport.getCTM();
    if (!bbox || !elementMatrix || !viewportMatrix) return null;

    const point = svg.createSVGPoint();
    point.x = treeNum === 1 ? bbox.x + bbox.width : bbox.x;
    point.y = bbox.y + bbox.height / 2;

    const rootPoint = point.matrixTransform(elementMatrix);
    const localPoint = rootPoint.matrixTransform(viewportMatrix.inverse());
    return { x: localPoint.x, y: localPoint.y };
}

function getTargetPoint(treeNum, key) {
    const element = getAnchorElement(treeNum, key);
    if (!element) return null;

    const svgPoint = getViewportLocalPointFromElement(element, treeNum);
    if (svgPoint) return svgPoint;

    const overlayRect = getOverlayRect();
    if (!overlayRect) return null;
    const rect = element.getBoundingClientRect();
    return {
        x: treeNum === 1 ? rect.right - overlayRect.left : rect.left - overlayRect.left,
        y: rect.top + rect.height / 2 - overlayRect.top
    };
}

function syncOverlaySize() {
    const overlay = getCombinedSvg();
    const shell = document.getElementById('stage-shell');
    const width = Math.max(shell.clientWidth - 40, 1200);
    const height = Math.max(shell.clientHeight - 80, 800);
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    overlay.setAttribute('width', width);
    overlay.setAttribute('height', height);
}

function removeConnectionAt(index) {
    if (index < 0 || index >= connections.length) return;
    const removed = connections[index];
    connections.splice(index, 1);
    if (selectedConnectionIndex === index) {
        selectedConnectionIndex = null;
    } else if (selectedConnectionIndex !== null && selectedConnectionIndex > index) {
        selectedConnectionIndex -= 1;
    }
    updateConnectionList();
    drawConnections();
    syncStyleControlsFromSelection();
    setStatus(`已删除连线：${removed.left.name} ↔ ${removed.right.name}`);
}

function cloneSvgWithComputedStyles(svgElement) {
    const exportSvg = svgElement.cloneNode(true);
    if (!exportSvg.getAttribute('xmlns')) exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    exportSvg.setAttribute('xml:space', 'preserve');
    const originalNodes = Array.from(svgElement.querySelectorAll('*'));
    const cloneNodes = Array.from(exportSvg.querySelectorAll('*'));

    for (let i = 0; i < originalNodes.length; i++) {
        const orig = originalNodes[i];
        const clone = cloneNodes[i];
        const cs = window.getComputedStyle(orig);
        if (!cs) continue;
        const tag = orig.tagName.toLowerCase();
        if (tag === 'text' || tag === 'tspan') {
            if (!clone.getAttribute('font-family')) clone.setAttribute('font-family', cs.fontFamily);
            if (!clone.getAttribute('font-size')) clone.setAttribute('font-size', cs.fontSize);
            if (!clone.getAttribute('font-weight')) clone.setAttribute('font-weight', cs.fontWeight);
            if (!clone.getAttribute('font-style')) clone.setAttribute('font-style', cs.fontStyle);
            if (!clone.getAttribute('fill')) clone.setAttribute('fill', cs.fill);
            if (!clone.getAttribute('text-anchor')) clone.setAttribute('text-anchor', cs.textAnchor || orig.getAttribute('text-anchor'));
        } else if (tag === 'path' || tag === 'line' || tag === 'rect' || tag === 'circle' || tag === 'polygon' || tag === 'polyline') {
            if (!clone.getAttribute('fill')) clone.setAttribute('fill', cs.fill);
            if (!clone.getAttribute('stroke')) clone.setAttribute('stroke', cs.stroke);
            if (!clone.getAttribute('stroke-width')) clone.setAttribute('stroke-width', cs.strokeWidth);
            if (!clone.getAttribute('stroke-dasharray') && cs.strokeDasharray !== 'none') clone.setAttribute('stroke-dasharray', cs.strokeDasharray);
        }
        if (!clone.getAttribute('opacity') && cs.opacity !== '1') clone.setAttribute('opacity', cs.opacity);
    }
    return exportSvg;
}

function exportCombinedSvg() {
    const svgElement = getCombinedSvg();
    if (!svgElement || !svgElement.querySelector('*')) {
        alert('请先加载双树后再导出。');
        return;
    }
    const exportSvg = cloneSvgWithComputedStyles(svgElement);
    const serializer = new XMLSerializer();
    const blob = new Blob([serializer.serializeToString(exportSvg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${makeExportBaseName()}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('已导出当前双树比较图为 SVG。');
}

async function exportCombinedPdf() {
    const svgElement = getCombinedSvg();
    if (!svgElement || !svgElement.querySelector('*')) {
        alert('请先加载双树后再导出。');
        return;
    }
    try {
        await ensurePdfLibraries();
        const { jsPDF } = window.jspdf;
        const width = Number(svgElement.getAttribute('width')) || 1600;
        const height = Number(svgElement.getAttribute('height')) || 900;
        const doc = new jsPDF(width > height ? 'l' : 'p', 'pt', [width, height]);
        const exportSvg = cloneSvgWithComputedStyles(svgElement);
        // svg2pdf may tighten transformed right-side labels; nudge right-side labels outward in PDF only.
        exportSvg.querySelectorAll('#tg-tree-2 text').forEach((textEl) => {
            const anchor = textEl.getAttribute('text-anchor') || '';
            const baseX = getNumericSvgAttr(textEl, 'x', 0);
            const dx = getNumericSvgAttr(textEl, 'dx', 0);
            const baseShift = anchor === 'end' ? -8 : 8;
            textEl.setAttribute('x', String(baseX + dx + baseShift));
            textEl.setAttribute('dx', '0');
        });
        await doc.svg(exportSvg, { width, height });
        doc.save(`${makeExportBaseName()}.pdf`);
        setStatus('已导出当前双树比较图为 PDF。');
    } catch (err) {
        console.error(err);
        alert(`PDF 导出失败：${err.message}`);
    }
}

function drawConnections() {
    const lineLayer = d3.select(getCombinedLayer('tg-connection-layer'));
    const endpointLayer = d3.select(getCombinedLayer('tg-endpoint-layer'));
    if (lineLayer.empty() || endpointLayer.empty()) return;

    lineLayer.selectAll('*').remove();
    endpointLayer.selectAll('*').remove();

    connections.forEach((connection, index) => {
        const source = getTargetPoint(1, connection.left.key);
        const target = getTargetPoint(2, connection.right.key);
        if (!source || !target) return;

        const sourceDotX = source.x + 12;
        const targetDotX = target.x - 12;
        const midX = (sourceDotX + targetDotX) / 2;
        const path = `M${sourceDotX},${source.y} C${midX},${source.y} ${midX},${target.y} ${targetDotX},${target.y}`;

        const bindLineEvents = (selection) => selection
            .attr('data-connection-index', index)
            .attr('cursor', 'pointer')
            .on('click', function() {
                selectedConnectionIndex = index;
                updateConnectionList();
                syncStyleControlsFromSelection();
                setStatus(`已选中连线：${connection.left.name} ↔ ${connection.right.name}。双击该连线可直接删除。`);
            })
            .on('dblclick', function(event) {
                event.preventDefault();
                removeConnectionAt(index);
            });

        bindLineEvents(lineLayer.append('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', Math.max(connection.style.width + 10, 14))
            .attr('stroke-linecap', 'round'));

        bindLineEvents(lineLayer.append('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', connection.style.color)
            .attr('stroke-width', connection.style.width)
            .attr('stroke-opacity', connection.style.opacity)
            .attr('stroke-linecap', 'round'));

        endpointLayer.append('circle')
            .attr('cx', sourceDotX)
            .attr('cy', source.y)
            .attr('r', 5.2)
            .attr('fill', '#2563eb')
            .attr('fill-opacity', Math.min(connection.style.opacity + 0.18, 1))
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.4);

        endpointLayer.append('circle')
            .attr('cx', targetDotX)
            .attr('cy', target.y)
            .attr('r', 5.2)
            .attr('fill', '#ef4444')
            .attr('fill-opacity', Math.min(connection.style.opacity + 0.18, 1))
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.4);
    });
}

function getSourceSvgMetrics(treeNum) {
    const frame = getTreeFrame(treeNum);
    const doc = frame.contentDocument;
    const svg = doc ? doc.getElementById('svg') : null;
    if (!svg) return { width: 1000, height: 800 };
    return {
        width: Math.max(Number(svg.getAttribute('width')) || 0, svg.getBoundingClientRect().width || 0, 1000),
        height: Math.max(Number(svg.getAttribute('height')) || 0, svg.getBoundingClientRect().height || 0, 800)
    };
}

function prefixCloneIds(node, prefix) {
    if (!(node instanceof Element)) return;
    if (node.id) node.id = `${prefix}${node.id}`;
    node.querySelectorAll('[id]').forEach((el) => {
        el.id = `${prefix}${el.id}`;
    });
}

function getNumericSvgAttr(element, attrName, fallbackValue = 0) {
    const raw = element.getAttribute(attrName);
    if (!raw) return fallbackValue;
    const first = String(raw).trim().split(/[\s,]+/)[0];
    const value = Number(first);
    return Number.isFinite(value) ? value : fallbackValue;
}

function normalizeMirroredRightTreeLabels(wrapper) {
    wrapper.querySelectorAll('text').forEach((textEl) => {
        const x = getNumericSvgAttr(textEl, 'x', 0);
        const existingTransform = textEl.getAttribute('transform');
        const mirrorTransform = `translate(${2 * x},0) scale(-1,1)`;
        textEl.setAttribute('transform', existingTransform ? `${mirrorTransform} ${existingTransform}` : mirrorTransform);

        const anchor = textEl.getAttribute('text-anchor') || '';
        if (anchor === 'start') {
            textEl.setAttribute('text-anchor', 'end');
        } else if (anchor === 'end') {
            textEl.setAttribute('text-anchor', 'start');
        }

        const dx = getNumericSvgAttr(textEl, 'dx', 0);
        textEl.setAttribute('dx', String(-dx - 2));
        textEl.style.transform = '';
        textEl.style.transformOrigin = '';
        textEl.style.transformBox = '';
    });
}

function renderSingleCanvas() {
    const svg = d3.select(getCombinedSvg());
    svg.selectAll('*').remove();

    [1, 2].forEach((treeNum) => annotateSourceTargets(treeNum));

    const leftMetrics = getSourceSvgMetrics(1);
    const rightMetrics = getSourceSvgMetrics(2);
    const paddingX = 40;
    const paddingY = 58;
    const baseGap = 20;
    const minYOffset = Math.min(0, layoutState.rightY);
    const maxYOffset = Math.max(0, layoutState.rightY);
    const leftTreeX = paddingX;
    const rightTreeX = paddingX + leftMetrics.width + baseGap + layoutState.rightX;
    const viewportMinY = minYOffset - 30;
    const totalWidth = Math.max(
        paddingX * 2 + leftMetrics.width,
        rightTreeX + rightMetrics.width + paddingX
    );
    const totalHeight = paddingY * 2 + Math.max(leftMetrics.height, rightMetrics.height) + Math.abs(minYOffset) + maxYOffset;

    svg.attr('viewBox', `0 ${viewportMinY} ${totalWidth} ${totalHeight}`)
        .attr('width', totalWidth)
        .attr('height', totalHeight);

    const viewport = svg.append('g').attr('id', 'tg-viewport-layer');
    viewport.append('g').attr('id', 'tg-title-layer');
    viewport.append('g').attr('id', 'tg-tree-layer');
    viewport.append('g').attr('id', 'tg-connection-layer');
    viewport.append('g').attr('id', 'tg-endpoint-layer');
    viewport.append('g').attr('id', 'tg-interaction-layer');

    const positions = {
        1: {
            x: leftTreeX,
            y: paddingY
        },
        2: {
            x: rightTreeX,
            y: paddingY + layoutState.rightY
        }
    };

    const titleLayer = d3.select(getCombinedLayer('tg-title-layer'));
    const leftTitleX = positions[1].x + leftMetrics.width / 2;
    const rightTitleX = positions[2].x + rightMetrics.width / 2;
    const titleY = Math.max(24 + viewportMinY, positions[1].y - 18);
    const subtitleY = titleY + 16;

    [
        { x: leftTitleX, title: selectedTrees[1]?.treeName || '左侧树', subtitle: selectedTrees[1]?.sourceLabel || '' },
        { x: rightTitleX, title: selectedTrees[2]?.treeName || '右侧树', subtitle: selectedTrees[2]?.sourceLabel || '' }
    ].forEach((item) => {
        titleLayer.append('text')
            .attr('x', item.x)
            .attr('y', titleY)
            .attr('text-anchor', 'middle')
            .attr('font-size', 16)
            .attr('font-weight', 700)
            .attr('fill', '#1f2937')
            .text(item.title);
        titleLayer.append('text')
            .attr('x', item.x)
            .attr('y', subtitleY)
            .attr('text-anchor', 'middle')
            .attr('font-size', 11)
            .attr('fill', '#64748b')
            .text(item.subtitle);
    });

    [1, 2].forEach((treeNum) => {
        const frame = getTreeFrame(treeNum);
        const doc = frame.contentDocument;
        const sourceSvg = doc ? doc.getElementById('svg') : null;
        if (!sourceSvg) return;

        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapper.setAttribute('id', `tg-tree-${treeNum}`);
        if (treeNum === 2) {
            wrapper.setAttribute('transform', `translate(${positions[treeNum].x + rightMetrics.width},${positions[treeNum].y}) scale(-1,1)`);
        } else {
            wrapper.setAttribute('transform', `translate(${positions[treeNum].x},${positions[treeNum].y})`);
        }

        Array.from(sourceSvg.childNodes).forEach((node) => {
            const cloned = node.cloneNode(true);
            prefixCloneIds(cloned, `tg${treeNum}-`);
            wrapper.appendChild(cloned);
        });

        getCombinedLayer('tg-tree-layer').appendChild(wrapper);

        if (treeNum === 2) {
            normalizeMirroredRightTreeLabels(wrapper);
        }
    });

    ensureCombinedZoom();
}

function redrawCombinedCanvas() {
    if (!ensureFramesReady()) return;
    renderSingleCanvas();
    attachInteractiveHandlers(1);
    attachInteractiveHandlers(2);
    setupBoxDeleteInteraction();
    drawConnections();
}

function getViewportPointFromClient(clientX, clientY) {
    const svg = getCombinedSvg();
    const viewport = getCombinedLayer('tg-viewport-layer');
    if (!svg || !viewport) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const screenToSvg = pt.matrixTransform(svg.getScreenCTM().inverse());
    const local = screenToSvg.matrixTransform(viewport.getCTM().inverse());
    return { x: local.x, y: local.y };
}

function getConnectionBounds(connection) {
    const source = getTargetPoint(1, connection.left.key);
    const target = getTargetPoint(2, connection.right.key);
    if (!source || !target) return null;
    const midX = (source.x + target.x) / 2;
    return {
        minX: Math.min(source.x, target.x, midX),
        maxX: Math.max(source.x, target.x, midX),
        minY: Math.min(source.y, target.y),
        maxY: Math.max(source.y, target.y)
    };
}

function removeConnectionsInBox(box) {
    const before = connections.length;
    connections = connections.filter((connection) => {
        const bounds = getConnectionBounds(connection);
        if (!bounds) return false;
        const intersects = !(bounds.maxX < box.minX || bounds.minX > box.maxX || bounds.maxY < box.minY || bounds.minY > box.maxY);
        return !intersects;
    });
    const removed = before - connections.length;
    if (selectedConnectionIndex !== null && selectedConnectionIndex >= connections.length) {
        selectedConnectionIndex = connections.length > 0 ? connections.length - 1 : null;
    }
    updateConnectionList();
    drawConnections();
    syncStyleControlsFromSelection();
    setStatus(removed > 0 ? `框选删除完成：已删除 ${removed} 条连线。` : '框选区域内没有命中连线。');
}

function setupBoxDeleteInteraction() {
    const svg = d3.select(getCombinedSvg());
    const layer = d3.select(getCombinedLayer('tg-interaction-layer'));
    if (svg.empty() || layer.empty()) return;

    svg.on('.boxdelete', null);
    svg.style('cursor', boxDeleteMode ? 'crosshair' : null);
    layer.selectAll('*').remove();
    if (!boxDeleteMode) return;

    let startPoint = null;
    let rect = null;

    const updateRect = (start, curr) => {
        const x = Math.min(start.x, curr.x);
        const y = Math.min(start.y, curr.y);
        const w = Math.abs(curr.x - start.x);
        const h = Math.abs(curr.y - start.y);
        rect.attr('x', x).attr('y', y).attr('width', w).attr('height', h);
    };

    svg.on('mousedown.boxdelete', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startPoint = getViewportPointFromClient(event.clientX, event.clientY);
        if (!startPoint) return;
        rect = layer.append('rect')
            .attr('fill', 'rgba(239, 68, 68, 0.12)')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4,3');
        updateRect(startPoint, startPoint);
    });

    svg.on('mousemove.boxdelete', (event) => {
        if (!startPoint || !rect) return;
        const curr = getViewportPointFromClient(event.clientX, event.clientY);
        if (!curr) return;
        updateRect(startPoint, curr);
    });

    const finishSelection = (event) => {
        if (!startPoint || !rect) return;
        const endPoint = getViewportPointFromClient(event.clientX, event.clientY) || startPoint;
        const box = {
            minX: Math.min(startPoint.x, endPoint.x),
            maxX: Math.max(startPoint.x, endPoint.x),
            minY: Math.min(startPoint.y, endPoint.y),
            maxY: Math.max(startPoint.y, endPoint.y)
        };
        rect.remove();
        rect = null;
        startPoint = null;
        if (box.maxX - box.minX < 6 || box.maxY - box.minY < 6) return;
        removeConnectionsInBox(box);
    };

    svg.on('mouseup.boxdelete', finishSelection);
    svg.on('mouseleave.boxdelete', finishSelection);
}

function updateConnectionList() {
    const list = document.getElementById('connection-list');
    if (connections.length === 0) {
        list.innerHTML = '<div class="text-muted small">暂无连线</div>';
        return;
    }

    list.innerHTML = '';
    connections.forEach((connection, index) => {
        const row = document.createElement('div');
        row.className = `connection-item d-flex justify-content-between align-items-center border-bottom py-1 gap-2 ${selectedConnectionIndex === index ? 'bg-light' : ''}`;
        row.innerHTML = `
            <span class="text-truncate" title="${escapeHtml(connection.left.name)} ↔ ${escapeHtml(connection.right.name)}">
                ${escapeHtml(connection.left.name)} ↔ ${escapeHtml(connection.right.name)}
                <span class="text-muted">(${getTargetTypeLabel(connection.left)} / ${getTargetTypeLabel(connection.right)})</span>
            </span>
            <div class="d-flex align-items-center gap-2">
                <span style="width: 16px; height: 16px; border-radius: 999px; background: ${escapeHtml(connection.style.color)}; opacity: ${connection.style.opacity}; display: inline-block;"></span>
            </div>
        `;
        row.dataset.idx = String(index);
        row.dataset.role = 'connection-row';
        list.appendChild(row);
    });
}

function connectionExists(leftKey, rightKey) {
    return connections.some((item) => item.left.key === leftKey && item.right.key === rightKey);
}

function handleLeafClick(treeNum, record) {
    if (!pendingSelection) {
        pendingSelection = record;
        setStatus(`已选中 ${getTitleText(treeNum)}${getTargetTypeLabel(record)}：${record.name}，请点击另一侧树的目标完成连线。`);
        return;
    }

    if (pendingSelection.treeNum === treeNum) {
        pendingSelection = record;
        setStatus(`已改为选中 ${getTitleText(treeNum)}${getTargetTypeLabel(record)}：${record.name}，请点击另一侧树的目标完成连线。`);
        return;
    }

    const left = pendingSelection.treeNum === 1 ? pendingSelection : record;
    const right = pendingSelection.treeNum === 2 ? pendingSelection : record;

    if (!connectionExists(left.key, right.key)) {
        connections.push({ left, right, style: { ...defaultConnectionStyle } });
        selectedConnectionIndex = connections.length - 1;
        updateConnectionList();
        drawConnections();
        syncStyleControlsFromSelection();
    }

    setStatus(`已连线：${left.name} ↔ ${right.name}`);
    pendingSelection = null;
}

function attachInteractiveHandlers(treeNum) {
    getCombinedTargets(treeNum).forEach((record) => {
        const element = record.element;
        element.style.cursor = 'pointer';
        if (element.dataset.tanglegramBound === '1') return;
        element.dataset.tanglegramBound = '1';
        element.addEventListener('click', function(event) {
            if (!manualConnectMode) return;
            event.preventDefault();
            event.stopPropagation();
            handleLeafClick(treeNum, {
                treeNum,
                kind: record.kind,
                key: record.key,
                name: record.name,
                nodeId: record.nodeId,
                explicitName: true,
                element
            });
        }, true);
    });
}

function startOverlaySync() {
    if (overlayTimer) return;
    overlayTimer = window.setInterval(drawConnections, 400);
}

function ensureFramesReady() {
    return selectedTrees[1] && selectedTrees[2];
}

function loadTreeIntoFrame(treeNum) {
    return new Promise((resolve, reject) => {
        const frame = getTreeFrame(treeNum);
        const tree = selectedTrees[treeNum];
        if (!frame || !tree) {
            resolve();
            return;
        }

        frame.onload = async function() {
            try {
                prepareEmbeddedFrame(frame);
                await waitForTreeRender(treeNum);
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        frame.src = tree.renderUrl;
        attachFrameChrome(treeNum);
    });
}

async function loadSelectedTrees() {
    if (!selectedTrees[1] || !selectedTrees[2]) {
        const missing = [];
        if (!selectedTrees[1]) missing.push('左侧树');
        if (!selectedTrees[2]) missing.push('右侧树');
        alert(`请先选择两棵树。缺少：${missing.join('、')}`);
        return;
    }

    connections = [];
    pendingSelection = null;
    selectedConnectionIndex = null;
    updateConnectionList();
    drawConnections();
    syncStyleControlsFromSelection();
    setStatus('正在加载左右树图...');

    try {
        await Promise.all([loadTreeIntoFrame(1), loadTreeIntoFrame(2)]);
        redrawCombinedCanvas();
        startOverlaySync();
        setStatus('双树已加载到同一张画布。右侧树已镜像，可用鼠标滚轮缩放、拖动画布平移；也可用左侧滑杆调节右树位置。');
    } catch (err) {
        console.error(err);
        setStatus(`树图加载失败：${err.message}`);
        alert(`双树画布没有完成渲染：${err.message}`);
    }
}

function getTargetsByName(treeNum) {
    const map = new Map();
    getCombinedTargets(treeNum).forEach((record) => {
        if (!record || !isValidTargetName(record.name)) return;
        if (!record.explicitName) return;
        if (record.kind !== 'leaf' && record.kind !== 'folded-clade') return;
        const matchKey = getAutoMatchKey(record);
        if (!matchKey) return;
        if (!map.has(matchKey)) map.set(matchKey, []);
        map.get(matchKey).push(record);
    });
    return map;
}

function autoConnectByName() {
    if (!ensureFramesReady()) {
        alert('请先加载左右双树。');
        return;
    }

    const leftMap = getTargetsByName(1);
    const rightMap = getTargetsByName(2);
    let added = 0;

    leftMap.forEach((leftItems, name) => {
        const rightItems = rightMap.get(name) || [];
        const pairCount = Math.min(leftItems.length, rightItems.length);
        for (let i = 0; i < pairCount; i++) {
            if (!connectionExists(leftItems[i].key, rightItems[i].key)) {
                connections.push({ left: leftItems[i], right: rightItems[i], style: { ...defaultConnectionStyle } });
                added++;
            }
        }
    });

    if (connections.length > 0 && selectedConnectionIndex === null) {
        selectedConnectionIndex = 0;
    }
    updateConnectionList();
    drawConnections();
    syncStyleControlsFromSelection();
    setStatus(added > 0 ? `已自动添加 ${added} 条同名目标连线。` : '没有找到可自动匹配的同名叶节点或折叠 clade。');
}

function parseLocalJsonFile(fileText) {
    const payload = JSON.parse(fileText);
    return normalizePlotType(payload && payload.plotType);
}

function setWorkspaceSelection(treeNum, projectId, treeName, payload) {
    const plotType = normalizePlotType(payload && payload.plotType);
    const dataUrl = `/api/get_tree/${encodeURIComponent(projectId)}/${encodeURIComponent(treeName)}.json`;

    setSelectedTree(treeNum, {
        treeName,
        projectId,
        plotType,
        dataUrl,
        sourceLabel: `Workspace / ${projectId}`
    });
}

window.openWorkspaceModal = function(treeNum) {
    const modalEl = getWorkspaceModal();
    modalEl.dataset.targetTree = String(treeNum);
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    fetch('/tvbot/getTreeList')
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then((data) => {
            const container = document.getElementById('workspaceAccordion');
            container.innerHTML = '';

            const allTrees = Array.isArray(data.treeList) ? data.treeList : [];
            const projects = Array.isArray(data.projectList) ? data.projectList : [];

            if (projects.length === 0) {
                container.innerHTML = '<div class="p-3 text-center text-muted">No projects found in workspace.</div>';
                return;
            }

            projects.forEach((project, index) => {
                const projectName = project.projectId;
                const trees = allTrees.filter((item) => item.projectId === projectName);
                const expanded = '';
                const collapsedBtn = 'collapsed';

                let bodyHtml = '<div class="list-group list-group-flush">';
                if (trees.length === 0) {
                    bodyHtml += '<div class="list-group-item text-muted small py-2">Empty project</div>';
                } else {
                    // Header for columns
                    bodyHtml += `
                        <div class="list-group-item bg-light text-muted small fw-semibold d-flex align-items-center py-2" style="font-size: 0.8rem;">
                            <div class="flex-grow-1">Name</div>
                            <div style="width: 140px;">Date Modified</div>
                            <div style="width: 80px;">Layout</div>
                        </div>
                    `;
                    
                    // Sort trees by mtime descending by default
                    trees.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
                    
                    trees.forEach((tree) => {
                        bodyHtml += `
                            <button type="button" class="list-group-item list-group-item-action d-flex align-items-center py-2"
                                data-project-id="${escapeHtml(projectName)}"
                                data-tree-name="${escapeHtml(tree.treeName)}">
                                <div class="flex-grow-1 text-truncate pe-2" title="${escapeHtml(tree.treeName)}">
                                    <i class="bi bi-file-earmark-text text-primary me-2"></i>${escapeHtml(tree.treeName)}
                                </div>
                                <div style="width: 140px;" class="text-muted small text-truncate">${escapeHtml(tree.time_str || '')}</div>
                                <div style="width: 80px;" class="text-muted small">
                                    <span class="badge bg-secondary bg-opacity-25 text-light">${escapeHtml((tree.plotType || 'normal').replace('Tree', ''))}</span>
                                </div>
                            </button>
                        `;
                    });
                }
                bodyHtml += '</div>';

                container.insertAdjacentHTML('beforeend', `
                    <div class="accordion-item" style="border-color: rgba(255,255,255,0.1); background: var(--surface);">
                        <h2 class="accordion-header" id="heading-${index}">
                            <button class="accordion-button py-2 ${collapsedBtn}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}" style="background: rgba(255,255,255,0.02); color: var(--text-main);">
                                <i class="bi bi-folder-fill text-warning me-2"></i>
                                <span class="fw-bold">${escapeHtml(project.projectName || projectName)}</span>
                                <span class="badge bg-secondary ms-2 rounded-pill">${trees.length}</span>
                            </button>
                        </h2>
                        <div id="collapse-${index}" class="accordion-collapse collapse ${expanded}" data-bs-parent="#workspaceAccordion">
                            <div class="accordion-body p-0">${bodyHtml}</div>
                        </div>
                    </div>
                `);
            });
        })
        .catch((err) => {
            document.getElementById('workspaceAccordion').innerHTML = `<div class="p-3 text-center text-danger">Failed to load workspace data: ${escapeHtml(err.message)}</div>`;
        });
};

window.selectWorkspaceTree = async function(dataObj) {
    const { projectId, treeName } = dataObj;
    const modalEl = getWorkspaceModal();
    const treeNum = Number(modalEl.dataset.targetTree || '1');

    try {
        const { payload } = await fetchTreePayload(projectId, treeName);
        setWorkspaceSelection(treeNum, projectId, treeName, payload);
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    } catch (err) {
        alert(`Failed to load tree from workspace: ${err.message}`);
    }
};

document.getElementById('workspaceAccordion').addEventListener('click', function(event) {
    const button = event.target.closest('button[data-project-id][data-tree-name]');
    if (!button) return;

    window.selectWorkspaceTree({
        projectId: button.dataset.projectId,
        treeName: button.dataset.treeName
    });
});

document.getElementById('file1').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const plotType = parseLocalJsonFile(text);
        const blob = new Blob([text], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);

        setSelectedTree(1, {
            treeName: file.name.replace(/\.json$/i, ''),
            projectId: 'local',
            plotType,
            dataUrl: blobUrl,
            sourceLabel: 'Local JSON',
            localBlobUrl: blobUrl
        });
    } catch (err) {
        alert(`左侧 JSON 读取失败：${err.message}`);
    }
});

document.getElementById('file2').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const plotType = parseLocalJsonFile(text);
        const blob = new Blob([text], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);

        setSelectedTree(2, {
            treeName: file.name.replace(/\.json$/i, ''),
            projectId: 'local',
            plotType,
            dataUrl: blobUrl,
            sourceLabel: 'Local JSON',
            localBlobUrl: blobUrl
        });
    } catch (err) {
        alert(`右侧 JSON 读取失败：${err.message}`);
    }
});

document.getElementById('btn-draw').addEventListener('click', loadSelectedTrees);
document.getElementById('btn-manual-mode').addEventListener('click', function() {
    manualConnectMode = !manualConnectMode;
    pendingSelection = null;
    updateManualModeButton();
    if (manualConnectMode) {
        setStatus('手动连线模式已开启。请先点左侧或右侧树上的 leaf / folded clade 标签，再点另一侧对应标签完成连线。');
    } else {
        setStatus('手动连线模式已关闭。当前统一画布支持平移/缩放和连线；单击连线可选中，双击连线可删除。');
    }
});
document.getElementById('btn-box-delete-mode').addEventListener('click', function() {
    boxDeleteMode = !boxDeleteMode;
    updateBoxDeleteModeButton();
    setupBoxDeleteInteraction();
    if (boxDeleteMode) {
        setStatus('框选删线模式已开启。按住鼠标左键在画布中拖出矩形，可批量删除命中的连线。');
    } else {
        setStatus('框选删线模式已关闭。');
    }
});
document.getElementById('btn-toggle-pan').addEventListener('click', function() {
    canvasPanLocked = !canvasPanLocked;
    updatePanLockButton();
    ensureCombinedZoom();
    if (canvasPanLocked) {
        setStatus('画布移动已锁定。你仍可进行连线、框选删线和导出操作。');
    } else {
        setStatus('画布移动已解锁。可继续拖动画布与滚轮缩放。');
    }
});
document.getElementById('btn-auto-connect').addEventListener('click', autoConnectByName);
document.getElementById('btn-clear-connections').addEventListener('click', function() {
    connections = [];
    pendingSelection = null;
    selectedConnectionIndex = null;
    updateConnectionList();
    drawConnections();
    syncStyleControlsFromSelection();
    setStatus('已清空所有连线。');
});
document.getElementById('btn-export-svg').addEventListener('click', exportCombinedSvg);
document.getElementById('btn-export-pdf').addEventListener('click', exportCombinedPdf);

document.getElementById('connection-list').addEventListener('click', function(event) {
    const row = event.target.closest('[data-role="connection-row"]');
    if (!row) return;
    selectedConnectionIndex = Number(row.dataset.idx);
    updateConnectionList();
    syncStyleControlsFromSelection();
});

document.getElementById('line-color').addEventListener('input', function() {
    const style = readCurrentStyleInputs();
    defaultConnectionStyle.color = style.color;
    if (selectedConnectionIndex !== null && connections[selectedConnectionIndex]) {
        connections[selectedConnectionIndex].style.color = style.color;
        drawConnections();
        updateConnectionList();
    }
    refreshStyleControlLabels();
    updateStyleHint();
});

document.getElementById('line-width').addEventListener('input', function() {
    const style = readCurrentStyleInputs();
    defaultConnectionStyle.width = style.width;
    if (selectedConnectionIndex !== null && connections[selectedConnectionIndex]) {
        connections[selectedConnectionIndex].style.width = style.width;
        drawConnections();
        updateConnectionList();
    }
    refreshStyleControlLabels();
    updateStyleHint();
});

document.getElementById('line-opacity').addEventListener('input', function() {
    const style = readCurrentStyleInputs();
    defaultConnectionStyle.opacity = style.opacity;
    if (selectedConnectionIndex !== null && connections[selectedConnectionIndex]) {
        connections[selectedConnectionIndex].style.opacity = style.opacity;
        drawConnections();
        updateConnectionList();
    }
    refreshStyleControlLabels();
    updateStyleHint();
});

[
    ['layout-right-x', 'rightX'],
    ['layout-right-y', 'rightY']
].forEach(([elementId, stateKey]) => {
    document.getElementById(elementId).addEventListener('input', function(event) {
        layoutState[stateKey] = Number(event.target.value);
        refreshLayoutControlLabels();
        redrawCombinedCanvas();
        if (ensureFramesReady()) {
            setStatus('已更新双树布局。你可以继续调节右树的左右/上下偏移，让 leaf-to-leaf 连线更贴近。');
        }
    });
});

window.addEventListener('resize', drawConnections);
updateConnectionList();
syncStyleControlsFromSelection();
syncLayoutInputsFromState();
updateManualModeButton();
updateBoxDeleteModeButton();
updatePanLockButton();
setStatus('先分别选择左侧和右侧的 Workspace JSON 文件，再加载双树。当前是同一张合成画布；支持平移/缩放，连线端点圆点会直接显示。');

// ---------------------------
// Save & Load Tanglegram logic
// ---------------------------

async function saveTanglegram() {
    if (!selectedTrees[1] || !selectedTrees[2]) {
        alert(currentLang === 'en' ? 'Please load both trees first.' : '请先加载双树。');
        return;
    }
    
    if (selectedTrees[1].projectId === 'local' || selectedTrees[2].projectId === 'local') {
        alert(currentLang === 'en' ? 'Cannot save local files. Please import trees from Workspace.' : '包含本地文件，无法保存到 Workspace。请从 Workspace 导入树。');
        return;
    }

    const treeName = prompt(currentLang === 'en' ? 'Enter a name to save this comparison:' : '请输入保存的文件名：', 'my_comparison');
    if (!treeName) return;

    const payload = {
        plotType: 'tanglegramTree',
        leftTree: {
            projectId: selectedTrees[1].projectId,
            treeName: selectedTrees[1].treeName
        },
        rightTree: {
            projectId: selectedTrees[2].projectId,
            treeName: selectedTrees[2].treeName
        },
        connections: connections.map(c => ({
            leftKey: c.left.key,
            rightKey: c.right.key,
            style: { ...c.style }
        })),
        layoutState: { ...layoutState },
        defaultConnectionStyle: { ...defaultConnectionStyle }
    };

    try {
        // Find default project logic: TVBOT saves to current projectId from URL or 'default'
        const urlParams = new URLSearchParams(window.location.search);
        let saveProject = urlParams.get('projectId') || 'default';
        if (saveProject === 'local') saveProject = 'default';

        const res = await fetch('/api/save_tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: saveProject,
                treeName: treeName,
                jsonData: JSON.stringify(payload)
            })
        });
        const data = await res.json();
        if (data.success) {
            alert(currentLang === 'en' ? 'Saved successfully!' : '保存成功！');
            // update URL so reload works
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('originalJsonDataUri', `/api/get_tree/${encodeURIComponent(saveProject)}/${encodeURIComponent(treeName)}.json`);
            newUrl.searchParams.set('projectId', saveProject);
            newUrl.searchParams.set('treeTitle', treeName);
            window.history.replaceState({}, '', newUrl.toString());
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        alert('Failed to save: ' + err.message);
    }
}

if (document.getElementById('btn-save-workspace')) {
    document.getElementById('btn-save-workspace').addEventListener('click', saveTanglegram);
}

// Check if we need to load an existing tanglegram JSON
async function initTanglegramFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataUri = urlParams.get('originalJsonDataUri');
    if (!dataUri) return;

    try {
        const res = await fetch(dataUri);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        
        if (payload.plotType !== 'tanglegramTree') {
            console.warn('Loaded JSON is not a tanglegramTree');
            return;
        }

        // Restore trees
        const [leftRes, rightRes] = await Promise.all([
            fetchTreePayload(payload.leftTree.projectId, payload.leftTree.treeName).catch(e => null),
            fetchTreePayload(payload.rightTree.projectId, payload.rightTree.treeName).catch(e => null)
        ]);

        if (leftRes) {
            setWorkspaceSelection(1, payload.leftTree.projectId, payload.leftTree.treeName, leftRes.payload);
        }
        if (rightRes) {
            setWorkspaceSelection(2, payload.rightTree.projectId, payload.rightTree.treeName, rightRes.payload);
        }

        if (payload.layoutState) {
            Object.assign(layoutState, payload.layoutState);
            syncLayoutInputsFromState();
        }
        if (payload.defaultConnectionStyle) {
            Object.assign(defaultConnectionStyle, payload.defaultConnectionStyle);
        }

        if (leftRes && rightRes) {
            await loadSelectedTrees();
            
            // After loading, restore connections
            if (payload.connections && payload.connections.length > 0) {
                const leftMap = new Map();
                getCombinedTargets(1).forEach(r => leftMap.set(r.key, r));
                const rightMap = new Map();
                getCombinedTargets(2).forEach(r => rightMap.set(r.key, r));

                connections = [];
                payload.connections.forEach(c => {
                    const left = leftMap.get(c.leftKey);
                    const right = rightMap.get(c.rightKey);
                    if (left && right) {
                        connections.push({ left, right, style: c.style });
                    }
                });
                
                if (connections.length > 0) {
                    selectedConnectionIndex = 0;
                }
                updateConnectionList();
                drawConnections();
                syncStyleControlsFromSelection();
            }
        }
    } catch (err) {
        console.error('Failed to init from URL:', err);
    }
}

// Call init on load
initTanglegramFromUrl();

