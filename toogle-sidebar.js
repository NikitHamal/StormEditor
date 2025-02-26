// Since we removed the toggle buttons, we'll make the chat sidebar always visible
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const chatTab = document.getElementById('chat-tab');
    const settingsTab = document.getElementById('settings-tab');
    const chatPanel = document.getElementById('chat-panel');
    const settingsPanel = document.getElementById('settings-panel');
    
    // Make sure sidebar is visible
    sidebar.classList.remove('hidden');
    
    // Handle tab switching
    chatTab.addEventListener('click', function() {
        chatTab.classList.add('active');
        settingsTab.classList.remove('active');
        chatPanel.style.display = 'flex';
        settingsPanel.classList.add('hidden');
    });
    
    settingsTab.addEventListener('click', function() {
        settingsTab.classList.add('active');
        chatTab.classList.remove('active');
        chatPanel.style.display = 'none';
        settingsPanel.classList.remove('hidden');
    });
    
    // Handle sidebar width adjustment
    const sidebarWidthSlider = document.getElementById('sidebar-width');
    if (sidebarWidthSlider) {
        sidebarWidthSlider.addEventListener('input', function() {
            const width = this.value + 'px';
            sidebar.style.width = width;
            
            // Also update the editor container margin
            const editorContainer = document.querySelector('.editor-container');
            if (editorContainer) {
                editorContainer.style.marginRight = width;
            }
        });
        
        // Set initial width from slider
        const initialWidth = sidebarWidthSlider.value + 'px';
        sidebar.style.width = initialWidth;
        
        // Also update the editor container margin
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.style.marginRight = initialWidth;
        }
    }
});