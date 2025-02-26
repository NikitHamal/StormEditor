// Preview manager for different file types
const PreviewManager = {
    // Preview window references
    previewWindows: {},
    
    // Terminal window for code output
    terminalWindow: null,
    
    // Preview HTML files
    previewHTML(file, content) {
        const previewWindow = this.createPreviewWindow(file);
        
        // Get associated files
        const cssFiles = fileSystem.files.filter(f => 
            f.name.endsWith('.css') && 
            f.parentFolderId === file.parentFolderId
        );
        
        const jsFiles = fileSystem.files.filter(f => 
            f.name.endsWith('.js') && 
            f.parentFolderId === file.parentFolderId && 
            f.name !== 'app.js' && 
            f.name !== 'preview.js'
        );

        // Build HTML content
        let htmlContent = content;
        if (!htmlContent.includes('<head>')) {
            htmlContent = `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Preview - ${file.name}</title>
                    ${cssFiles.map(f => `<style>${f.content || ''}</style>`).join('\n')}
                </head>
                <body>
                    ${htmlContent}
                    ${jsFiles.map(f => `<script>${f.content || ''}</script>`).join('\n')}
                </body>
                </html>`;
        } else {
            // If HTML has head, inject styles and scripts before closing tags
            if (cssFiles.length > 0) {
                const headEnd = htmlContent.indexOf('</head>');
                if (headEnd !== -1) {
                    htmlContent = htmlContent.slice(0, headEnd) + 
                        cssFiles.map(f => `<style>${f.content || ''}</style>`).join('\n') +
                        htmlContent.slice(headEnd);
                }
            }
            if (jsFiles.length > 0) {
                const bodyEnd = htmlContent.indexOf('</body>');
                if (bodyEnd !== -1) {
                    htmlContent = htmlContent.slice(0, bodyEnd) +
                        jsFiles.map(f => `<script>${f.content || ''}</script>`).join('\n') +
                        htmlContent.slice(bodyEnd);
                }
            }
        }
        
        previewWindow.document.open();
        previewWindow.document.write(htmlContent);
        previewWindow.document.close();
    },

    // Preview React applications
    previewReact(file, content) {
        const previewWindow = this.createPreviewWindow(file);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>React Preview - ${file.name}</title>
                <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    ${content}
                    
                    // Render the app
                    ReactDOM.render(
                        <App />,
                        document.getElementById('root')
                    );
                </script>
            </body>
            </html>
        `;
        
        previewWindow.document.open();
        previewWindow.document.write(html);
        previewWindow.document.close();
    },

    // Preview Flutter web applications
    previewFlutter(file, content) {
        // This would require a more complex setup with Flutter web compilation
        alert('Flutter preview requires Flutter SDK and web compilation. Please use Flutter CLI for preview.');
    },

    // Show terminal output for code execution
    showTerminalOutput(file, content) {
        if (this.terminalWindow && !this.terminalWindow.closed) {
            this.terminalWindow.close();
        }

        this.terminalWindow = window.open('', 'terminal_output', 'width=800,height=600');
        const terminalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Terminal Output - ${file.name}</title>
                <style>
                    body {
                        background: #1e1e1e;
                        color: #fff;
                        font-family: monospace;
                        padding: 20px;
                        margin: 0;
                    }
                    #terminal {
                        background: #000;
                        padding: 15px;
                        border-radius: 4px;
                        white-space: pre-wrap;
                        overflow-y: auto;
                        height: calc(100vh - 100px);
                    }
                    .error { color: #ff5555; }
                    .success { color: #50fa7b; }
                    .info { color: #8be9fd; }
                </style>
            </head>
            <body>
                <div id="terminal"></div>
                <script>
                    const terminal = document.getElementById('terminal');
                    
                    // Override console methods
                    const originalConsole = {
                        log: console.log,
                        error: console.error,
                        info: console.info
                    };

                    function appendToTerminal(type, ...args) {
                        const line = document.createElement('div');
                        line.className = type;
                        line.textContent = args.join(' ');
                        terminal.appendChild(line);
                        terminal.scrollTop = terminal.scrollHeight;
                    }

                    console.log = (...args) => {
                        appendToTerminal('success', ...args);
                        originalConsole.log(...args);
                    };

                    console.error = (...args) => {
                        appendToTerminal('error', ...args);
                        originalConsole.error(...args);
                    };

                    console.info = (...args) => {
                        appendToTerminal('info', ...args);
                        originalConsole.info(...args);
                    };

                    // Execute the code
                    try {
                        ${this.getExecutionCode(file, content)}
                    } catch (error) {
                        console.error('Error:', error.message);
                    }
                </script>
            </body>
            </html>
        `;

        this.terminalWindow.document.open();
        this.terminalWindow.document.write(terminalHtml);
        this.terminalWindow.document.close();
    },

    // Get code execution wrapper based on file type
    getExecutionCode(file, content) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'py':
                // For Python, we'd need a Python runtime (like Pyodide)
                return `
                    console.info('Loading Python runtime...');
                    // This is a placeholder - implement actual Python execution
                    console.error('Python execution requires backend support');
                `;
            
            case 'js':
                return `
                    console.info('Executing JavaScript...');
                    ${content}
                `;
            
            default:
                return `console.error('Execution not supported for this file type');`;
        }
    },

    // Create or focus preview window
    createPreviewWindow(file) {
        if (this.previewWindows[file.id] && !this.previewWindows[file.id].closed) {
            this.previewWindows[file.id].focus();
            return this.previewWindows[file.id];
        }

        this.previewWindows[file.id] = window.open('', `preview_${file.id}`, 'width=800,height=600');
        return this.previewWindows[file.id];
    },

    // Helper function to find associated files (CSS/JS) for HTML preview
    findAssociatedFiles(file, extension) {
        const associatedFiles = [];
        const baseName = file.name.split('.')[0];
        const fileDir = file.parentFolderId;

        // Get the folder contents if file is in a folder
        let filesToSearch = [];
        if (fileDir) {
            const folder = findFolderById(fileDir);
            if (folder && folder.files) {
                filesToSearch = folder.files.map(id => findFileById(id)).filter(f => f);
            }
        } else {
            // If file is in root, get all root files
            filesToSearch = fileSystem.files.filter(f => !f.parentFolderId);
        }

        // Search through the relevant files
        filesToSearch.forEach(f => {
            if (f.name.endsWith(`.${extension}`) && (
                f.name.startsWith(baseName) || 
                f.name === `styles.${extension}` || 
                f.name === `style.${extension}` || 
                f.name === `script.${extension}` || 
                f.name === `main.${extension}`
            )) {
                associatedFiles.push(f);
            }
        });

        return associatedFiles;
    },

    // Main preview function
    preview(file) {
        if (!file || !editor) return;

        const content = editor.getValue();
        const extension = file.name.split('.').pop().toLowerCase();

        switch (extension) {
            case 'html':
                this.previewHTML(file, content);
                break;
            
            case 'jsx':
            case 'tsx':
                this.previewReact(file, content);
                break;
            
            case 'dart':
                this.previewFlutter(file, content);
                break;
            
            case 'py':
            case 'js':
            case 'ts':
                this.showTerminalOutput(file, content);
                break;
            
            default:
                alert('Preview not supported for this file type');
        }
    }
};

// Export for use in other files
window.PreviewManager = PreviewManager; 


// Event listeners
// ... existing code ...

// After adding other event listeners, add language and preview functionality
document.addEventListener('DOMContentLoaded', () => {
    // Language selector change event
    const languageSelector = document.getElementById('editor-language-selector');
    if (languageSelector) {
        languageSelector.addEventListener('change', (e) => {
            changeEditorLanguage(e.target.value);
        });
    }
    
    // Preview button click event
    const previewButton = document.getElementById('preview-code');
    if (previewButton) {
        previewButton.addEventListener('click', () => {
            if (currentEditorLanguage === 'html') {
                previewHTML();
        } else {
                appendMessage('Preview is only available for HTML content.', 'system');
            }
        });
    }
});