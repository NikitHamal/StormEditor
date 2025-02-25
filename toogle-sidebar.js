// Toggle sidebar visibility
document.addEventListener('DOMContentLoaded', () => {
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
            if (sidebar) {
    sidebar.classList.toggle('hidden');
            }
        });
    }
    
    // Tab switching in sidebar
    const chatTab = document.getElementById('chat-tab');
    const settingsTab = document.getElementById('settings-tab');
    const chatPanel = document.getElementById('chat-panel');
    const settingsPanel = document.getElementById('settings-panel');

    if (chatTab && settingsTab && chatPanel && settingsPanel) {
        chatTab.addEventListener('click', () => {
            chatTab.classList.add('active');
            settingsTab.classList.remove('active');
            chatPanel.classList.remove('hidden');
            settingsPanel.classList.add('hidden');
        });
        
        settingsTab.addEventListener('click', () => {
            settingsTab.classList.add('active');
            chatTab.classList.remove('active');
            settingsPanel.classList.remove('hidden');
            chatPanel.classList.add('hidden');
        });
    }
});