// @ts-nocheck

// Local storage handler to save and load data from local Flask server
(function() {
    const LOCAL_API_SAVE = '/api/save_tree';
    
    function addSaveButton() {
        // Disabled in favor of native Save button
        return;
        const btn = document.createElement('button');
        btn.innerText = 'Save to Local';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '9999';
        btn.style.padding = '10px 20px';
        btn.style.backgroundColor = '#42b983';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '20px';
        btn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        btn.style.cursor = 'pointer';
        
        btn.onclick = function() {
            saveCurrentState();
        };
        
        document.body.appendChild(btn);
    }

    function saveCurrentState() {
        let projectData = null;
        
        // Try to get data from the app instance
        if (window.normalTree && typeof window.normalTree.exportOriginalJsonData === 'function') {
            projectData = window.normalTree.exportOriginalJsonData(true);
        }

        if (!projectData) {
            // Fallback to localStorage if app instance not found
            const keys = Object.keys(localStorage);
            projectData = {};
            keys.forEach(key => {
                try {
                    projectData[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    projectData[key] = localStorage.getItem(key);
                }
            });
        }

        if (!projectData || Object.keys(projectData).length === 0) {
            alert('No data found to save.');
            return;
        }

        const filename = prompt('Enter a name for this tree project:', 'tree_' + new Date().getTime());
        if (!filename) return;

        fetch(LOCAL_API_SAVE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                content: projectData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Project saved successfully to local data folder as ' + data.filename);
            } else {
                alert('Error saving project: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save to local server. Make sure server.py is running.');
        });
    }

    // Check if we need to load local data from URL parameter
    function checkUrlForLocalData() {
        const urlParams = new URLSearchParams(window.location.search);
        const localDataFile = urlParams.get('localData');
        
        if (localDataFile) {
            fetch('/api/get_tree/' + localDataFile)
                .then(response => response.json())
                .then(data => {
                    // Restore data to localStorage
                    Object.keys(data).forEach(key => {
                        const val = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
                        localStorage.setItem(key, val);
                    });
                    
                    // Reload the page without the localData parameter to let the app initialize with the restored data
                    const newUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({}, '', newUrl);
                    location.reload();
                })
                .catch(error => {
                    console.error('Error loading local data:', error);
                });
        }
    }

    // Initialize
    window.addEventListener('load', () => {
        addSaveButton();
        checkUrlForLocalData();
    });
})();
