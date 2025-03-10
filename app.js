// Import HuggingFace Inference
const { HfInference } = window;

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

// API keys storage
const apiKeys = {
    gemini: '',
    openrouter: '',
};

// Supported languages for the editor
const supportedLanguages = [
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'json', name: 'JSON' },
    { id: 'python', name: 'Python' },
    { id: 'csharp', name: 'C#' },
    { id: 'java', name: 'Java' },
    { id: 'php', name: 'PHP' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'markdown', name: 'Markdown' },
    { id: 'plaintext', name: 'Plain Text' }
];

// Current editor language
let currentEditorLanguage = 'html';

// File system storage
let fileSystem = {
    files: [],
    folders: []
};

// Open files/tabs management
let openFiles = [];
let activeFileId = null;

// Default file templates
const fileTemplates = {
    'html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>New Page</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>',
    'css': '/* Add your styles here */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}',
    'javascript': '// Add your JavaScript code here\nconsole.log("Hello World!");\n\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}',
    'typescript': '// Add your TypeScript code here\ninterface Person {\n    name: string;\n    age: number;\n}\n\nfunction greet(person: Person): string {\n    return `Hello, ${person.name}!`;\n}',
    'python': '# Add your Python code here\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))',
    'json': '{\n    "name": "Project",\n    "version": "1.0.0",\n    "description": "A sample project"\n}',
    'plaintext': 'Add your text here...'
};

// Chat history management
let chatHistory = [];
let currentChatId = null;

// File system management

// Create a new file
function createFile(name, parentFolderId = null, content = '', language = 'plaintext') {
    if (!name) return null;
    
    const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    const languageId = getLanguageFromExtension(extension) || language;
    
    const newFile = {
        id: 'file_' + Date.now(),
        name: name,
        content: content || getTemplateForLanguage(languageId),
        language: languageId,
        parentFolderId: parentFolderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (parentFolderId) {
        // Add to folder
        const folder = findFolderById(parentFolderId);
        if (folder) {
            if (!folder.files) folder.files = [];
            folder.files.push(newFile.id);
        }
    }
    
    // Add to files array
    fileSystem.files.push(newFile);
    
    saveFileSystem();
    renderFileTree();
    return newFile;
}

// Create a new folder
function createFolder(name, parentFolderId = null) {
    if (!name) return null;
    
    const newFolder = {
        id: 'folder_' + Date.now(),
        name: name,
        files: [],
        folders: [],
        parentFolderId: parentFolderId,
        createdAt: new Date().toISOString()
    };
    
    if (parentFolderId) {
        // Add to parent folder
        const folder = findFolderById(parentFolderId);
        if (folder) {
            if (!folder.folders) folder.folders = [];
            folder.folders.push(newFolder.id);
        }
    }
    
    // Add to folders array
    fileSystem.folders.push(newFolder);
    
    saveFileSystem();
    renderFileTree();
    return newFolder;
}

// Find file by ID
function findFileById(fileId) {
    return fileSystem.files.find(file => file.id === fileId);
}

// Find folder by ID
function findFolderById(folderId) {
    return fileSystem.folders.find(folder => folder.id === folderId);
}

// Delete file
function deleteFile(fileId) {
    const file = findFileById(fileId);
    if (!file) return false;
    
    // Remove from open files if open
    closeFile(fileId);
    
    // Remove from parent folder if in a folder
    if (file.parentFolderId) {
        const folder = findFolderById(file.parentFolderId);
        if (folder && folder.files) {
            folder.files = folder.files.filter(id => id !== fileId);
        }
    }
    
    // Remove from files array
    fileSystem.files = fileSystem.files.filter(f => f.id !== fileId);
    
    saveFileSystem();
    renderFileTree();
    return true;
}

// Delete folder and all contents
function deleteFolder(folderId) {
    const folder = findFolderById(folderId);
    if (!folder) return false;
    
    // Recursively delete all files and subfolders
    if (folder.files) {
        folder.files.forEach(fileId => {
            deleteFile(fileId);
        });
    }
    
    if (folder.folders) {
        folder.folders.forEach(subFolderId => {
            deleteFolder(subFolderId);
        });
    }
    
    // Remove from parent folder if in a folder
    if (folder.parentFolderId) {
        const parentFolder = findFolderById(folder.parentFolderId);
        if (parentFolder) {
            parentFolder.folders = parentFolder.folders.filter(id => id !== folderId);
        }
    }
    
    // Remove from folders array
    fileSystem.folders = fileSystem.folders.filter(f => f.id !== folderId);
    
    saveFileSystem();
    renderFileTree();
    return true;
}

// Rename file
function renameFile(fileId, newName) {
    const file = findFileById(fileId);
    if (!file) return false;
    
    file.name = newName;
    
    // Update extension and language if name changed
    const extension = newName.includes('.') ? newName.split('.').pop().toLowerCase() : '';
    const languageId = getLanguageFromExtension(extension);
    if (languageId) {
        file.language = languageId;
    }
    
    // Update open tab if file is open
    const openFileIndex = openFiles.findIndex(f => f.id === fileId);
    if (openFileIndex >= 0) {
        openFiles[openFileIndex].name = newName;
        renderTabs();
    }
    
    file.updatedAt = new Date().toISOString();
    saveFileSystem();
    renderFileTree();
    return true;
}

// Rename folder
function renameFolder(folderId, newName) {
    const folder = findFolderById(folderId);
    if (!folder) return false;
    
    folder.name = newName;
    saveFileSystem();
    renderFileTree();
    return true;
}

// Save file content
function saveFile(fileId, content) {
    const file = findFileById(fileId);
    if (!file) return false;
    
    file.content = content;
    file.updatedAt = new Date().toISOString();
    
    saveFileSystem();
    return true;
}

// Export file to user's computer
function exportFile(fileId) {
    const file = findFileById(fileId);
    if (!file) return false;
    
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    return true;
}

// Import file from user's computer
async function importFile(file, parentFolderId = null) {
    try {
        const content = await file.text();
        const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        const languageId = getLanguageFromExtension(extension) || 'plaintext';
        
        const newFile = createFile(file.name, parentFolderId, content, languageId);
        if (newFile) {
            openFile(newFile.id);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error importing file:', error);
        return false;
    }
}

// Open file in editor
function openFile(fileId) {
    const file = findFileById(fileId);
    if (!file) return false;
    
    // Check if file is already open
    const existingIndex = openFiles.findIndex(f => f.id === fileId);
    if (existingIndex >= 0) {
        activeFileId = fileId;
        renderTabs();
        loadFileContent(fileId);
    } else {
    // Add to open files
    openFiles.push({
        id: file.id,
        name: file.name,
        language: file.language
    });
    
    activeFileId = fileId;
    renderTabs();
    loadFileContent(fileId);
    }
    
    return true;
}

// Close file tab
function closeFile(fileId) {
    const index = openFiles.findIndex(f => f.id === fileId);
    if (index < 0) return false;
    
    openFiles.splice(index, 1);
    
    // If the active file was closed, activate the next available tab
    if (activeFileId === fileId) {
        if (openFiles.length > 0) {
            activeFileId = openFiles[Math.min(index, openFiles.length - 1)].id;
            loadFileContent(activeFileId);
        } else {
            activeFileId = null;
            // Clear editor if no files are open
            if (editor) {
                editor.setValue('');
            }
        }
    }
    
    renderTabs();
    return true;
}

// Load file content into editor
function loadFileContent(fileId) {
    const file = findFileById(fileId);
    if (!file || !editor) return false;
    
    // Change editor language
    changeEditorLanguage(file.language);
    
    // Set content
    editor.setValue(file.content);
    
    // Update active file UI
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === fileId) {
            item.classList.add('active');
        }
    });
    
    return true;
}

// Save active file content
function saveActiveFile() {
    if (!activeFileId || !editor) return false;
    
    const content = editor.getValue();
    return saveFile(activeFileId, content);
}

// Get language ID from file extension
function getLanguageFromExtension(extension) {
    if (!extension) return 'plaintext';
    
    const extensionMap = {
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'js': 'javascript',
        'ts': 'typescript',
        'json': 'json',
        'py': 'python',
        'cs': 'csharp',
        'java': 'java',
        'php': 'php',
        'rb': 'ruby',
        'md': 'markdown',
        'txt': 'plaintext'
    };
    
    return extensionMap[extension] || 'plaintext';
}

// Get template for a specific language
function getTemplateForLanguage(languageId) {
    return fileTemplates[languageId] || '';
}

// Save file system to localStorage
function saveFileSystem() {
    try {
        localStorage.setItem('stormEditorFileSystem', JSON.stringify(fileSystem));
    } catch (error) {
        console.error('Error saving file system:', error);
    }
}

// Load file system from localStorage
function loadFileSystem() {
    try {
        const savedData = localStorage.getItem('stormEditorFileSystem');
        if (savedData) {
            fileSystem = JSON.parse(savedData);
            renderFileTree();
        } else {
            // Create default files for first-time users
            createDefaultFiles();
        }
    } catch (error) {
        console.error('Error loading file system:', error);
        // Create default files if there was an error
        createDefaultFiles();
    }
}

// Create default files for first-time users
function createDefaultFiles() {
    createFile('index.html', null, fileTemplates.html, 'html');
    createFile('styles.css', null, fileTemplates.css, 'css');
    createFile('script.js', null, fileTemplates.javascript, 'javascript');
}

// Render file tree in the explorer
function renderFileTree() {
    const fileTree = document.getElementById('file-tree');
    if (!fileTree) return;
    
    fileTree.innerHTML = '';
    
    // Check if file system is empty
    if (fileSystem.files.length === 0 && fileSystem.folders.length === 0) {
        fileTree.innerHTML = '<div class="empty-explorer-message">No files yet. Create or upload a file to get started.</div>';
        return;
    }
    
    // Render root folders
    fileSystem.folders
        .filter(folder => !folder.parentFolderId)
        .forEach(folder => {
            fileTree.appendChild(createFolderElement(folder));
        });
    
    // Render root files
    fileSystem.files
        .filter(file => !file.parentFolderId)
        .forEach(file => {
            fileTree.appendChild(createFileElement(file));
        });
}

// Create folder element for the file tree
function createFolderElement(folder) {
    const folderElement = document.createElement('div');
    folderElement.className = 'folder-item';
    folderElement.dataset.id = folder.id;
    folderElement.style.display = 'flex';
    folderElement.style.flexDirection = 'column';
    
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';
    folderHeader.style.display = 'flex';
    folderHeader.style.alignItems = 'center';
    folderHeader.style.padding = '2px 8px';
    folderHeader.style.cursor = 'pointer';
    folderHeader.style.width = '100%';
    
    const chevron = document.createElement('i');
    chevron.className = 'fas fa-chevron-right';
    chevron.style.width = '16px';
    chevron.style.fontSize = '10px';
    chevron.style.transition = 'transform 0.15s';
    chevron.style.color = '#cccccc';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-folder';
    icon.style.width = '16px';
    icon.style.marginRight = '4px';
    icon.style.color = '#dcb67a';  // VS Code folder color
    
    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = folder.name;
    name.style.fontSize = '13px';
    name.style.color = '#cccccc';  // VS Code text color
    
    const actions = document.createElement('div');
    actions.className = 'folder-actions';
    actions.style.display = 'none';
    actions.style.marginLeft = 'auto';
    
    // Create New File button
    const newFileBtn = document.createElement('button');
    newFileBtn.className = 'explorer-action-btn';
    newFileBtn.title = 'New File';
    newFileBtn.innerHTML = '<i class="fas fa-file-circle-plus"></i>';
    newFileBtn.style.background = 'none';
    newFileBtn.style.border = 'none';
    newFileBtn.style.color = '#cccccc';
    newFileBtn.style.padding = '2px 4px';
    newFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        promptNewFile(folder.id);
    });
    
    // Create New Folder button
    const newFolderBtn = document.createElement('button');
    newFolderBtn.className = 'folder-action-btn';
    newFolderBtn.title = 'New Folder';
    newFolderBtn.innerHTML = '<i class="fas fa-folder-plus"></i>';
    newFolderBtn.style.background = 'none';
    newFolderBtn.style.border = 'none';
    newFolderBtn.style.color = '#cccccc';
    newFolderBtn.style.padding = '2px 4px';
    newFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        promptNewFolder(folder.id);
    });
    
    actions.appendChild(newFileBtn);
    actions.appendChild(newFolderBtn);
    
    folderHeader.appendChild(chevron);
    folderHeader.appendChild(icon);
    folderHeader.appendChild(name);
    folderHeader.appendChild(actions);
    
    folderElement.appendChild(folderHeader);
    
    // Create container for folder contents
    const contentsElement = document.createElement('div');
    contentsElement.className = 'folder-contents';
    contentsElement.style.display = 'none';
    contentsElement.style.marginLeft = '16px';
    contentsElement.style.width = '100%';
    contentsElement.style.flexDirection = 'column';
    
    // Add subfolders and files
    if (folder.folders && Array.isArray(folder.folders)) {
        folder.folders.forEach(subFolderId => {
            const subFolder = findFolderById(subFolderId);
            if (subFolder) {
                contentsElement.appendChild(createFolderElement(subFolder));
            }
        });
    }
    
    if (folder.files && Array.isArray(folder.files)) {
        folder.files.forEach(fileId => {
            const file = findFileById(fileId);
            if (file) {
                contentsElement.appendChild(createFileElement(file));
            }
        });
    }
    
    folderElement.appendChild(contentsElement);
    
    // Toggle folder expand/collapse
    folderHeader.addEventListener('click', () => {
        folderElement.classList.toggle('expanded');
        contentsElement.style.display = contentsElement.style.display === 'none' ? 'block' : 'none';
        if (folderElement.classList.contains('expanded')) {
            chevron.style.transform = 'rotate(90deg)';
            icon.className = 'fas fa-folder-open';
        } else {
            chevron.style.transform = 'rotate(0deg)';
            icon.className = 'fas fa-folder';
        }
    });
    
    // Show/hide actions on hover
    folderHeader.addEventListener('mouseenter', () => {
        actions.style.display = 'flex';
    });
    
    folderHeader.addEventListener('mouseleave', () => {
        actions.style.display = 'none';
    });
    
    return folderElement;
}

// Create file element for the file tree
function createFileElement(file) {
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.dataset.id = file.id;
    fileElement.style.display = 'flex';
    fileElement.style.alignItems = 'center';
    fileElement.style.padding = '2px 8px';
    fileElement.style.cursor = 'pointer';
    fileElement.style.fontSize = '13px';
    fileElement.style.color = '#cccccc';
    fileElement.style.width = '100%';
    
    if (file.id === activeFileId) {
        fileElement.style.background = '#37373d';
    }
    
    // Choose icon based on file type
    const icon = document.createElement('i');
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    
    // Set specific icons and colors based on file extension
    switch(extension) {
        case 'html':
            icon.className = 'fab fa-html5';
            icon.style.color = '#e44d26';
            break;
        case 'css':
            icon.className = 'fab fa-css3-alt';
            icon.style.color = '#264de4';
            break;
        case 'js':
            icon.className = 'fab fa-js-square';
            icon.style.color = '#f7df1e';
            break;
        case 'ts':
            icon.className = 'fab fa-js';
            icon.style.color = '#007acc';
            break;
        case 'json':
            icon.className = 'fas fa-brackets-curly';
            icon.style.color = '#fac54b';
            break;
        case 'md':
            icon.className = 'fas fa-markdown';
            icon.style.color = '#519aba';
            break;
        default:
        icon.className = 'fas fa-file';
            icon.style.color = '#cccccc';
    }
    icon.style.width = '16px';
    icon.style.marginRight = '4px';
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    name.style.flex = '1';
    
    fileElement.appendChild(icon);
    fileElement.appendChild(name);
    
    // Hover effect
    fileElement.addEventListener('mouseenter', () => {
        if (file.id !== activeFileId) {
            fileElement.style.background = '#2a2d2e';
        }
    });
    
    fileElement.addEventListener('mouseleave', () => {
        if (file.id !== activeFileId) {
            fileElement.style.background = 'none';
        }
    });
    
    // Open file on click
    fileElement.addEventListener('click', () => {
        openFile(file.id);
    });
    
    return fileElement;
}

// Render tabs for open files
function renderTabs() {
    const tabsContainer = document.getElementById('editor-tabs-container');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    openFiles.forEach(file => {
        const tabElement = document.createElement('div');
        tabElement.className = 'editor-tab';
        tabElement.dataset.id = file.id;
        
        if (file.id === activeFileId) {
            tabElement.classList.add('active');
        }
        
        // Choose icon based on file type
        const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        let iconClass = 'fas fa-file';
        
        // Set specific icons based on file extension
        switch(extension) {
            case 'html':
                iconClass = 'fab fa-html5';
                break;
            case 'css':
                iconClass = 'fab fa-css3-alt';
                break;
            case 'js':
                iconClass = 'fab fa-js-square';
                break;
            case 'ts':
                iconClass = 'fab fa-js';
                break;
            case 'json':
                iconClass = 'fas fa-brackets-curly';
                break;
            case 'py':
                iconClass = 'fab fa-python';
                break;
            case 'java':
                iconClass = 'fab fa-java';
                break;
            case 'php':
                iconClass = 'fab fa-php';
                break;
            case 'cs':
                iconClass = 'fas fa-hashtag';
                break;
            case 'rb':
                iconClass = 'fas fa-gem';
                break;
            case 'md':
                iconClass = 'fas fa-markdown';
                break;
            case 'txt':
            iconClass = 'fas fa-file-alt';
                break;
            case 'svg':
                iconClass = 'fas fa-bezier-curve';
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
                iconClass = 'fas fa-file-image';
                break;
            case 'pdf':
                iconClass = 'fas fa-file-pdf';
                break;
            case 'zip':
            case 'rar':
            case 'tar':
            case 'gz':
                iconClass = 'fas fa-file-archive';
                break;
            case 'mp3':
            case 'wav':
            case 'ogg':
                iconClass = 'fas fa-file-audio';
                break;
            case 'mp4':
            case 'avi':
            case 'mov':
            case 'webm':
                iconClass = 'fas fa-file-video';
                break;
            case 'doc':
            case 'docx':
                iconClass = 'fas fa-file-word';
                break;
            case 'xls':
            case 'xlsx':
                iconClass = 'fas fa-file-excel';
                break;
            case 'ppt':
            case 'pptx':
                iconClass = 'fas fa-file-powerpoint';
                break;
            default:
                iconClass = 'fas fa-file';
        }
        
        tabElement.innerHTML = `
            <i class="${iconClass}"></i>
            <span class="tab-title">${file.name}</span>
            <button class="tab-close-btn" title="Close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Handle tab click (activate)
        tabElement.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-close-btn')) {
                activeFileId = file.id;
                renderTabs();
                loadFileContent(file.id);
            }
        });
        
        // Handle tab close button
        tabElement.querySelector('.tab-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            closeFile(file.id);
        });
        
        tabsContainer.appendChild(tabElement);
    });
}

// Prompt user to create new file
function promptNewFile(parentFolderId = null) {
    // Create a modal dialog for file creation
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create New File</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="file-name">File Name:</label>
                    <input type="text" id="file-name" placeholder="Enter file name">
                </div>
                <div class="form-group">
                    <label for="file-type">File Type:</label>
                    <select id="file-type">
                        <option value="html">HTML (.html)</option>
                        <option value="css">CSS (.css)</option>
                        <option value="javascript">JavaScript (.js)</option>
                        <option value="typescript">TypeScript (.ts)</option>
                        <option value="json">JSON (.json)</option>
                        <option value="python">Python (.py)</option>
                        <option value="java">Java (.java)</option>
                        <option value="csharp">C# (.cs)</option>
                        <option value="php">PHP (.php)</option>
                        <option value="ruby">Ruby (.rb)</option>
                        <option value="markdown">Markdown (.md)</option>
                        <option value="plaintext">Plain Text (.txt)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="file-location">Location:</label>
                    <select id="file-location">
                        <option value="root">Root Directory</option>
                        ${parentFolderId ? '<option value="current" selected>Current Folder</option>' : ''}
                        <option value="custom">Custom Location...</option>
                    </select>
                </div>
                <div id="folder-tree-container" class="form-group" style="display: none;">
                    <label>Select Folder:</label>
                    <div id="folder-tree" class="folder-tree-select"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="create-file-btn" class="primary-btn">Create</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
    
    // Handle close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
        closeModal();
    });
    
    // Handle cancel button
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        closeModal();
    });
    
    // Handle location change
    const locationSelect = modal.querySelector('#file-location');
    const folderTreeContainer = modal.querySelector('#folder-tree-container');
    
    locationSelect.addEventListener('change', () => {
        if (locationSelect.value === 'custom') {
            folderTreeContainer.style.display = 'block';
            renderFolderTree();
        } else {
            folderTreeContainer.style.display = 'none';
        }
    });
    
    // Render folder tree for selection
    function renderFolderTree() {
        const folderTree = modal.querySelector('#folder-tree');
        folderTree.innerHTML = '';
        
        // Add root option
        const rootOption = document.createElement('div');
        rootOption.className = 'folder-option';
        rootOption.innerHTML = '<i class="fas fa-folder"></i> Root Directory';
        rootOption.dataset.id = 'root';
        rootOption.addEventListener('click', () => {
            selectFolder(rootOption, null);
        });
        folderTree.appendChild(rootOption);
        
        // Add all folders
        fileSystem.folders.forEach(folder => {
            const folderOption = document.createElement('div');
            folderOption.className = 'folder-option';
            folderOption.innerHTML = `<i class="fas fa-folder"></i> ${folder.name}`;
            folderOption.dataset.id = folder.id;
            folderOption.addEventListener('click', () => {
                selectFolder(folderOption, folder.id);
            });
            folderTree.appendChild(folderOption);
        });
    }
    
    // Handle folder selection
    let selectedFolderId = parentFolderId;
    function selectFolder(element, folderId) {
        // Remove active class from all options
        modal.querySelectorAll('.folder-option').forEach(opt => {
            opt.classList.remove('active');
        });
        
        // Add active class to selected option
        element.classList.add('active');
        selectedFolderId = folderId;
    }
    
    // Handle create button
    modal.querySelector('#create-file-btn').addEventListener('click', () => {
        const fileName = modal.querySelector('#file-name').value.trim();
        const fileType = modal.querySelector('#file-type').value;
        const location = modal.querySelector('#file-location').value;
        
        if (!fileName) {
            alert('Please enter a file name');
            return;
        }
        
        // Add extension if not present
        let finalFileName = fileName;
        const extensionMap = {
            'html': '.html',
            'css': '.css',
            'javascript': '.js',
            'typescript': '.ts',
            'json': '.json',
            'python': '.py',
            'java': '.java',
            'csharp': '.cs',
            'php': '.php',
            'ruby': '.rb',
            'markdown': '.md',
            'plaintext': '.txt'
        };
        
        const extension = extensionMap[fileType];
        if (extension && !finalFileName.endsWith(extension)) {
            finalFileName += extension;
        }
        
        // Determine parent folder ID based on location
        let finalParentFolderId = null;
        if (location === 'current' && parentFolderId) {
            finalParentFolderId = parentFolderId;
        } else if (location === 'custom' && selectedFolderId && selectedFolderId !== 'root') {
            finalParentFolderId = selectedFolderId;
        }
        
        // Create the file
        const newFile = createFile(finalFileName, finalParentFolderId, '', fileType);
        if (newFile) {
            openFile(newFile.id);
            closeModal();
        }
    });
    
    // Close modal function
    function closeModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
    
    // Focus on file name input
    setTimeout(() => {
        modal.querySelector('#file-name').focus();
    }, 100);
}

// Prompt user to create new folder
function promptNewFolder(parentFolderId = null) {
    // Create a modal dialog for folder creation
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create New Folder</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="folder-name">Folder Name:</label>
                    <input type="text" id="folder-name" placeholder="Enter folder name">
                </div>
                <div class="form-group">
                    <label for="folder-location">Location:</label>
                    <select id="folder-location">
                        <option value="root">Root Directory</option>
                        ${parentFolderId ? '<option value="current" selected>Current Folder</option>' : ''}
                        <option value="custom">Custom Location...</option>
                    </select>
                </div>
                <div id="parent-folder-tree-container" class="form-group" style="display: none;">
                    <label>Select Parent Folder:</label>
                    <div id="parent-folder-tree" class="folder-tree-select"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="create-folder-btn" class="primary-btn">Create</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
    
    // Handle close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
        closeModal();
    });
    
    // Handle cancel button
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        closeModal();
    });
    
    // Handle location change
    const locationSelect = modal.querySelector('#folder-location');
    const folderTreeContainer = modal.querySelector('#parent-folder-tree-container');
    
    locationSelect.addEventListener('change', () => {
        if (locationSelect.value === 'custom') {
            folderTreeContainer.style.display = 'block';
            renderFolderTree();
        } else {
            folderTreeContainer.style.display = 'none';
        }
    });
    
    // Render folder tree for selection
    function renderFolderTree() {
        const folderTree = modal.querySelector('#parent-folder-tree');
        folderTree.innerHTML = '';
        
        // Add root option
        const rootOption = document.createElement('div');
        rootOption.className = 'folder-option';
        rootOption.innerHTML = '<i class="fas fa-folder"></i> Root Directory';
        rootOption.dataset.id = 'root';
        rootOption.addEventListener('click', () => {
            selectFolder(rootOption, null);
        });
        folderTree.appendChild(rootOption);
        
        // Add all folders
        fileSystem.folders.forEach(folder => {
            // Skip the current folder to prevent circular references
            if (folder.id === parentFolderId) return;
            
            const folderOption = document.createElement('div');
            folderOption.className = 'folder-option';
            folderOption.innerHTML = `<i class="fas fa-folder"></i> ${folder.name}`;
            folderOption.dataset.id = folder.id;
            folderOption.addEventListener('click', () => {
                selectFolder(folderOption, folder.id);
            });
            folderTree.appendChild(folderOption);
        });
    }
    
    // Handle folder selection
    let selectedFolderId = parentFolderId;
    function selectFolder(element, folderId) {
        // Remove active class from all options
        modal.querySelectorAll('.folder-option').forEach(opt => {
            opt.classList.remove('active');
        });
        
        // Add active class to selected option
        element.classList.add('active');
        selectedFolderId = folderId;
    }
    
    // Handle create button
    modal.querySelector('#create-folder-btn').addEventListener('click', () => {
        const folderName = modal.querySelector('#folder-name').value.trim();
        const location = modal.querySelector('#folder-location').value;
        
        if (!folderName) {
            alert('Please enter a folder name');
            return;
        }
        
        // Determine parent folder ID based on location
        let finalParentFolderId = null;
        if (location === 'current' && parentFolderId) {
            finalParentFolderId = parentFolderId;
        } else if (location === 'custom' && selectedFolderId && selectedFolderId !== 'root') {
            finalParentFolderId = selectedFolderId;
        }
        
        // Create the folder
        createFolder(folderName, finalParentFolderId);
        closeModal();
    });
    
    // Close modal function
    function closeModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
    
    // Focus on folder name input
    setTimeout(() => {
        modal.querySelector('#folder-name').focus();
    }, 100);
}

// Prompt user to rename file
function promptRenameFile(fileId) {
    const file = findFileById(fileId);
    if (!file) return;
    
    const newName = prompt('Enter new file name:', file.name);
    if (newName) {
        renameFile(fileId, newName);
    }
}

// Prompt user to rename folder
function promptRenameFolder(folderId) {
    const folder = findFolderById(folderId);
    if (!folder) return;
    
    const newName = prompt('Enter new folder name:', folder.name);
    if (newName) {
        renameFolder(folderId, newName);
    }
}

// Confirm file deletion
function confirmDeleteFile(fileId) {
    const file = findFileById(fileId);
    if (!file) return;
    
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
        deleteFile(fileId);
    }
}

// Confirm folder deletion
function confirmDeleteFolder(folderId) {
    const folder = findFolderById(folderId);
    if (!folder) return false;
    
    if (confirm(`Are you sure you want to delete "${folder.name}" and all its contents?`)) {
        deleteFolder(folderId);
    }
}

// Setup file management listeners
function setupFileManagementListeners() {
    // New file button
    document.getElementById('new-file-btn').addEventListener('click', () => {
        promptNewFile();
    });
    
    // New folder button
    document.getElementById('new-folder-btn').addEventListener('click', () => {
        promptNewFolder();
    });
    
    // Add tab button
    document.getElementById('add-tab-btn').addEventListener('click', () => {
        promptNewFile();
    });
    
    // Save file button
    document.getElementById('save-file').addEventListener('click', () => {
        if (saveActiveFile()) {
            appendMessage('File saved successfully', 'system');
            
            // Update tab to remove unsaved indicator
            const tab = document.querySelector(`.editor-tab[data-id="${activeFileId}"]`);
            if (tab) {
                tab.classList.remove('unsaved');
                const title = tab.querySelector('.tab-title');
                if (title && title.textContent.endsWith('*')) {
                    title.textContent = title.textContent.slice(0, -1);
                }
            }
        } else {
            if (!activeFileId) {
                appendMessage('No file is open to save', 'system');
            } else {
                appendMessage('Failed to save file', 'system');
            }
        }
    });
    
    // Upload file button
    document.getElementById('upload-file-btn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        
        input.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    await importFile(files[i]);
                }
                appendMessage(`Imported ${files.length} file(s) successfully`, 'system');
            }
        });
        
        input.click();
    });
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            
            if (saveActiveFile()) {
                appendMessage('File saved successfully', 'system');
                
                // Update tab to remove unsaved indicator
                const tab = document.querySelector(`.editor-tab[data-id="${activeFileId}"]`);
                if (tab) {
                    tab.classList.remove('unsaved');
                    const title = tab.querySelector('.tab-title');
                    if (title && title.textContent.endsWith('*')) {
                        title.textContent = title.textContent.slice(0, -1);
                    }
                }
            }
        }
    });
}

// Populate language selector dropdown
function populateLanguageSelector() {
    const languageSelector = document.getElementById('editor-language-selector');
    if (!languageSelector) return;
    
    // Clear existing options
    languageSelector.innerHTML = '';
    
    // Add options for each supported language
    supportedLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.id;
        option.textContent = lang.name;
        languageSelector.appendChild(option);
    });
    
    // Set current language
    languageSelector.value = currentEditorLanguage;
    
    // Update language label
    updateLanguageLabel();
}

// Update the language label in the editor header
function updateLanguageLabel() {
    const languageLabel = document.querySelector('.editor-language');
    if (!languageLabel) return;
    
    const selectedLanguage = supportedLanguages.find(lang => lang.id === currentEditorLanguage);
    if (selectedLanguage) {
        languageLabel.textContent = selectedLanguage.name;
    }
}

// Change editor language
function changeEditorLanguage(languageId) {
    if (!languageId || !editor) return;
    
    // Update current language
    currentEditorLanguage = languageId;
    
    // Change Monaco editor model language
    const model = editor.getModel();
    if (model) {
        monaco.editor.setModelLanguage(model, languageId);
    }
    
    // Update UI
    updateLanguageLabel();
    
    // If there's an active file, update its language
    if (activeFileId) {
        const file = findFileById(activeFileId);
        if (file) {
            file.language = languageId;
            saveFileSystem();
        }
    }
}

// Update model selector to include all available models
function updateModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    
    // Clear existing options
    modelSelector.innerHTML = '';

    // Add model options
    const models = [
        { value: 'gemini', text: 'Gemini 2.0 Flash' },
        { value: 'openrouter', text: 'OpenRouter API' },
        { value: 'paxsenixClaude', text: 'Claude 3.5 Sonnet' },
        { value: 'paxsenixGPT4O', text: 'GPT-4o' }
    ];

    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.text;
        modelSelector.appendChild(option);
    });

    // Add event listener for model selection
    modelSelector.addEventListener('change', function() {
        saveSelectedModel(this.value);
    });

    // Load saved model selection
    loadSelectedModel();
}

// Document initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Monaco Editor
    require(['vs/editor/editor.main'], function () {
        try {
            // Get original container
            const originalContainer = document.getElementById('monaco-editor');
            if (!originalContainer) {
                console.error('Monaco editor container not found');
                return;
            }
            
            // Dispose of any existing editor instance before creating a new one
            if (window.editor) {
                window.editor.dispose();
            }
            
            // Completely replace the container to avoid context attribute conflicts
            const parentElement = originalContainer.parentElement;
            const newContainer = document.createElement('div');
            newContainer.id = 'monaco-editor';
            
            // Remove the old container and add the new one
            parentElement.removeChild(originalContainer);
            parentElement.appendChild(newContainer);
            
            // Create editor with options to avoid context key issues
            editor = monaco.editor.create(newContainer, {
                value: '',
                language: currentEditorLanguage,
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: {
                    enabled: true
                },
                ariaLabel: 'Code Editor',
                // Add options to help prevent context attribute issues
                overviewRulerLanes: 0,
                overviewRulerBorder: false,
                contextmenu: false,
                // Add additional options to prevent context conflicts
                renderWhitespace: 'none',
                renderControlCharacters: false,
                renderIndentGuides: false,
                renderValidationDecorations: 'editable',
                renderLineHighlight: 'none',
                // Additional options to reduce "Canceled" errors
                quickSuggestions: false,
                parameterHints: { enabled: false },
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: "off",
                tabCompletion: "off",
                wordBasedSuggestions: false,
                folding: false,
                find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: "never",
                    seedSearchStringFromSelection: false
                }
            });
            
            // Store editor instance globally for proper disposal later
            window.editor = editor;
            
            // Set up event listener for editor content changes
            editor.onDidChangeModelContent(() => {
                // If there's an active file, mark its content as changed
                if (activeFileId) {
                    const tab = document.querySelector(`.editor-tab[data-id="${activeFileId}"]`);
                    if (tab && !tab.classList.contains('unsaved')) {
                        tab.classList.add('unsaved');
                        const title = tab.querySelector('.tab-title');
                        if (title && !title.textContent.endsWith('*')) {
                            title.textContent += '*';
                        }
                    }
                }
            });
            
            // Filter out canceled operation errors from console
            const originalConsoleError = console.error;
            console.error = function(...args) {
                // Filter context key errors more aggressively
                if (args[0] && typeof args[0] === 'string' && 
                    (args[0].includes('Canceled') || 
                     args[0].includes('context attribute') ||
                     args[0].includes('contextKeyService'))) {
                    return; // Silently ignore Monaco errors
                }
                originalConsoleError.apply(console, args);
            };
            
            // Also filter out canceled errors from console.log
            const originalConsoleLog = console.log;
            console.log = function(...args) {
                // Filter canceled errors from log as well
                if (args[0] && typeof args[0] === 'string' && args[0].includes('Canceled')) {
                    return; // Silently ignore Monaco canceled errors
                }
                originalConsoleLog.apply(console, args);
            };
            
            console.log('Monaco editor initialized successfully');
            
    } catch (error) {
            console.error('Error initializing Monaco editor:', error);
        }
    });
    
    // Setup all functionality
    setupApplicationFeatures();
});

// Setup all application functionality
function setupApplicationFeatures() {
    // Load settings and configurations
    loadApiKeys();
    loadFileSystem();
    loadChatHistory();
    updateModelSelector();
    loadSelectedModel();
    
    // Setup file management listeners
    setupFileManagementListeners();
    
    // Setup language selector
    setupLanguageSelector();
    
    // Set up language selector events
    const languageSelector = document.getElementById('editor-language-selector');
    if (languageSelector) {
        languageSelector.addEventListener('change', (e) => {
            changeEditorLanguage(e.target.value);
        });
    }
    
    // Setup save button
    const saveButton = document.getElementById('save-file');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            if (saveActiveFile()) {
                appendMessage('File saved successfully', 'system');
            }
        });
    }
    
    // Setup API key saving
    const saveApiKeysButton = document.getElementById('save-api-keys');
    if (saveApiKeysButton) {
        saveApiKeysButton.addEventListener('click', () => {
            saveApiKeys();
            appendMessage('API keys saved successfully', 'system');
        });
    }
    
    // Setup API key visibility toggles
    document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.getAttribute('data-for');
            const input = document.getElementById(inputId);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    btn.innerHTML = '<i class="fas fa-eye"></i>';
                }
            }
        });
    });
}

// Setup language selector
function setupLanguageSelector() {
    const languageSelector = document.getElementById('editor-language-selector');
    if (!languageSelector) return;
    
    // Clear existing options
    languageSelector.innerHTML = '';
    
    // Add options for each supported language
    supportedLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.id;
        option.textContent = lang.name;
        languageSelector.appendChild(option);
    });
    
    // Set current language
    languageSelector.value = currentEditorLanguage;
    
    // Update language label
    updateLanguageLabel();
}

// Save selected model to localStorage
function saveSelectedModel(modelId) {
    localStorage.setItem('selectedModel', modelId);
}

// Load selected model from localStorage
function loadSelectedModel() {
    const modelSelector = document.getElementById('model-selector');
    if (!modelSelector) return;
    
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
        modelSelector.value = savedModel;
    }
}