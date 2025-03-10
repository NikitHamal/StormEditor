// Keyboard Shortcuts for Storm Editor

// CSS classes for toggling visibility
const style = document.createElement('style');
style.textContent = `
.file-explorer-hidden {
    display: none !important;
}
`;
document.head.appendChild(style);

// Keep track of visibility state
let fileExplorerVisible = true;
let sidebarVisible = true;

document.addEventListener('keydown', function(event) {
    // Ctrl+B: Toggle File Explorer
    if (event.ctrlKey && event.key.toLowerCase() === 'b') {
        event.preventDefault(); // Prevent browser's default behavior
        const fileExplorer = document.querySelector('.file-explorer');
        if (fileExplorer) {
            fileExplorerVisible = !fileExplorerVisible;
            fileExplorer.classList.toggle('file-explorer-hidden');
        }
    }
    
    // Ctrl+Shift+L: Toggle Chat Container
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault(); // Prevent browser's default behavior
        console.log('Ctrl+Shift+L pressed'); // Debug log
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebarVisible = !sidebarVisible;
            sidebar.classList.toggle('hidden');
        }
    }
});
