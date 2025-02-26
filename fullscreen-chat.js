// Chat history and current chat state
let chatHistory = [];
let currentChatId = null;
const MAX_CONVERSATIONS = 10;

// API Keys and model configuration
let apiKeys = {
    gemini: '',
    openrouter: '',
    paxsenix: ''
};

// Conversation histories for different models
const geminiConversationHistory = [];
const MAX_GEMINI_CONVERSATION_HISTORY = 20;
const openRouterConversationHistory = [];
const MAX_OPENROUTER_CONVERSATION_HISTORY = 15;
const paxsenixClaudeConversationHistory = [];
const MAX_PAXSENIX_CLAUDE_CONVERSATION_HISTORY = 10;
const paxsenixGPT4OConversationHistory = [];
const MAX_PAXSENIX_GPT4O_CONVERSATION_HISTORY = 10;

// DOM Elements
const chatMessagesContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const newChatButton = document.getElementById('new-chat-btn');
const toggleHistoryButton = document.getElementById('toggle-history-btn');
const backToEditorButton = document.getElementById('back-to-editor-btn');
const chatSidebar = document.getElementById('chat-sidebar');
const closeSidebarButton = document.getElementById('close-sidebar-btn');
const chatHistoryList = document.getElementById('chat-history-list');

// Default model to use
const DEFAULT_MODEL = 'gemini';

// Initialize the chat
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    loadApiKeys();
    loadSelectedModel();
    setupEventListeners();
    
    // Add debug button in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugBtn = document.createElement('button');
        debugBtn.className = 'fullscreen-btn';
        debugBtn.title = 'Debug';
        debugBtn.innerHTML = '<i class="fas fa-bug"></i>';
        debugBtn.addEventListener('click', () => {
            const debugInfo = {
                apiKeys: {
                    gemini: apiKeys.gemini ? 'Set' : 'Not set',
                    openrouter: apiKeys.openrouter ? 'Set' : 'Not set',
                    paxsenix: apiKeys.paxsenix ? 'Set' : 'Not set'
                },
                selectedModel: DEFAULT_MODEL,
                conversationHistories: {
                    gemini: geminiConversationHistory.length,
                    openRouter: openRouterConversationHistory.length,
                    claude: paxsenixClaudeConversationHistory.length,
                    gpt4o: paxsenixGPT4OConversationHistory.length
                }
            };
            console.log('Debug Info:', debugInfo);
            appendMessage(`Debug Info: ${JSON.stringify(debugInfo, null, 2)}`, 'system');
        });
        document.querySelector('.fullscreen-actions').prepend(debugBtn);
    }
});

// Setup event listeners
function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Create new chat
    newChatButton.addEventListener('click', createNewChat);
    
    // Toggle chat history sidebar
    toggleHistoryButton.addEventListener('click', () => {
        chatSidebar.classList.toggle('visible');
    });
    
    // Close sidebar
    closeSidebarButton.addEventListener('click', () => {
        chatSidebar.classList.remove('visible');
    });
    
    // Back to editor
    backToEditorButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Handle mobile touch events for better mobile experience
    setupMobileEvents();
}

// Setup mobile-specific events
function setupMobileEvents() {
    // Add touch event handling for mobile swipe to show/hide sidebar
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const swipeThreshold = 100;
        if (touchEndX - touchStartX > swipeThreshold) {
            // Swipe right - show sidebar
            chatSidebar.classList.add('visible');
        } else if (touchStartX - touchEndX > swipeThreshold) {
            // Swipe left - hide sidebar
            chatSidebar.classList.remove('visible');
        }
    }
    
    // Adjust textarea height on mobile
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });
}

// Load chat history from localStorage
function loadChatHistory() {
    try {
        const savedChats = localStorage.getItem('stormEditorChatHistory');
        if (savedChats) {
            chatHistory = JSON.parse(savedChats);
            
            // Limit to MAX_CONVERSATIONS
            if (chatHistory.length > MAX_CONVERSATIONS) {
                chatHistory = chatHistory.slice(0, MAX_CONVERSATIONS);
                saveChatHistory();
            }
            
            renderChatHistory();
            
            // Load the most recent chat if available
            if (chatHistory.length > 0) {
                loadChat(chatHistory[0].id);
            } else {
                createNewChat();
            }
        } else {
            createNewChat();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        createNewChat();
    }
}

// Save chat history to localStorage
function saveChatHistory() {
    try {
        localStorage.setItem('stormEditorChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Render chat history in the sidebar
function renderChatHistory() {
    chatHistoryList.innerHTML = '';
    
    if (chatHistory.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-chat-history';
        emptyMessage.textContent = 'No chat history';
        chatHistoryList.appendChild(emptyMessage);
        return;
    }
    
    chatHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-history-item';
        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        
        const chatTitle = document.createElement('div');
        chatTitle.className = 'chat-history-title';
        chatTitle.textContent = chat.title || 'Untitled Chat';
        
        const chatActions = document.createElement('div');
        chatActions.className = 'chat-history-actions';
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'chat-history-action delete-chat';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Delete chat';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        chatActions.appendChild(deleteButton);
        chatItem.appendChild(chatTitle);
        chatItem.appendChild(chatActions);
        
        chatItem.addEventListener('click', () => {
            loadChat(chat.id);
            chatSidebar.classList.remove('visible');
        });
        
        chatHistoryList.appendChild(chatItem);
    });
}

// Load a specific chat
function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    chatMessagesContainer.innerHTML = '';
    
    // Display all messages in the chat
    chat.messages.forEach(message => {
        appendMessage(message.content, message.sender, false);
    });
    
    // Scroll to the bottom of the chat
    scrollToBottom();
    
    // Update active state in chat history
    renderChatHistory();
}

// Delete a chat
function deleteChat(chatId) {
    const confirmDelete = confirm('Are you sure you want to delete this chat?');
    if (!confirmDelete) return;
    
    const chatIndex = chatHistory.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return;
    
    chatHistory.splice(chatIndex, 1);
    saveChatHistory();
    
    // If the current chat was deleted, load another chat or create a new one
    if (currentChatId === chatId) {
        if (chatHistory.length > 0) {
            loadChat(chatHistory[0].id);
        } else {
            createNewChat();
        }
    } else {
        renderChatHistory();
    }
}

// Initialize conversation history with a system message
function initializeConversationHistory() {
    // Clear existing conversation histories
    clearConversationHistories();
    
    // Add system message to each conversation history
    geminiConversationHistory.push({
        role: 'model',
        parts: [{ text: 'Hello! I\'m Gemini, your AI assistant. How can I help you today?' }]
    });
    
    openRouterConversationHistory.push({
        role: 'system',
        content: 'You are a helpful AI assistant.'
    });
    
    openRouterConversationHistory.push({
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. How can I help you today?'
    });
    
    paxsenixClaudeConversationHistory.push({
        role: 'system',
        content: 'You are Claude, a helpful AI assistant.'
    });
    
    paxsenixClaudeConversationHistory.push({
        role: 'assistant',
        content: 'Hello! I\'m Claude, your AI assistant. How can I help you today?'
    });
    
    paxsenixGPT4OConversationHistory.push({
        role: 'system',
        content: 'You are GPT-4o, a helpful AI assistant.'
    });
    
    paxsenixGPT4OConversationHistory.push({
        role: 'assistant',
        content: 'Hello! I\'m GPT-4o, your AI assistant. How can I help you today?'
    });
}

// Create a new chat
function createNewChat() {
    // Clear chat messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Initialize conversation history with system message
    initializeConversationHistory();
    
    // Create a new chat session
    const newChat = {
        id: 'chat_' + Date.now(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString()
    };
    
    // Add welcome message
    newChat.messages.push({
        id: Date.now().toString() + '-welcome',
        content: 'Hello! I\'m your AI assistant. How can I help you today?',
        sender: 'ai',
        timestamp: new Date().toISOString()
    });
    
    // Add the new chat to the beginning of the history
    chatHistory.unshift(newChat);
    currentChatId = newChat.id;
    
    // Limit to MAX_CONVERSATIONS
    if (chatHistory.length > MAX_CONVERSATIONS) {
        chatHistory = chatHistory.slice(0, MAX_CONVERSATIONS);
    }
    
    // Save to localStorage
    saveChatHistory();
    
    // Load the new chat
    loadChat(newChat.id);
    
    // Close sidebar if open
    chatSidebar.classList.remove('visible');
    
    return newChat;
}

// Add a message to the current chat
function addMessageToCurrentChat(content, sender) {
    if (!currentChatId) return false;
    
    const chat = chatHistory.find(c => c.id === currentChatId);
    if (!chat) return false;
    
    chat.messages.push({
        id: Date.now().toString(),
        content,
        sender,
        timestamp: new Date().toISOString()
    });
    
    // Update chat title based on the first user message
    if (sender === 'user' && chat.messages.filter(m => m.sender === 'user').length === 1) {
        // Use the first 30 characters of the first user message as the title
        chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        renderChatHistory();
    }
    
    // Save chat history
    saveChatHistory();
    
    return true;
}

// Check if API key is available for the selected model
function checkApiKey(model) {
    const keyMapping = {
        'gemini': 'gemini',
        'openrouter': 'openrouter'
        // Paxsenix models don't need API keys
    };
    
    // If this is a Paxsenix model, no API key is needed
    if (['claude', 'gpt4o', 'phi3'].includes(model)) {
        return true;
    }
    
    const keyName = keyMapping[model];
    if (!keyName) return true; // No API key needed for this model
    
    if (!apiKeys[keyName] || apiKeys[keyName].trim() === '') {
        alert(`Please set your ${keyName.toUpperCase()} API key before using this model.`);
        return false;
    }
    
    return true;
}

// Clear conversation histories when switching models
function clearConversationHistories() {
    geminiConversationHistory.length = 0;
    openRouterConversationHistory.length = 0;
    paxsenixClaudeConversationHistory.length = 0;
    paxsenixGPT4OConversationHistory.length = 0;
}

// Load selected model from localStorage
function loadSelectedModel() {
    try {
        // Initialize conversation histories with system messages
        initializeConversationHistory();
    } catch (error) {
        console.error('Error loading selected model:', error);
    }
}

// Load API keys from localStorage
function loadApiKeys() {
    try {
        const geminiKey = localStorage.getItem('apiKey_gemini');
        const openrouterKey = localStorage.getItem('apiKey_openrouter');
        
        if (geminiKey) {
            apiKeys.gemini = geminiKey;
        }
        
        if (openrouterKey) {
            apiKeys.openrouter = openrouterKey;
        }
        
        // Paxsenix models don't need API keys
        localStorage.removeItem('apiKey_paxsenix');
        apiKeys.paxsenix = '';
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Save API keys to localStorage
function saveApiKeys() {
    try {
        // No UI elements to save from, just use existing values
        if (apiKeys.gemini) {
            localStorage.setItem('apiKey_gemini', apiKeys.gemini);
        } else {
            localStorage.removeItem('apiKey_gemini');
        }
        
        if (apiKeys.openrouter) {
            localStorage.setItem('apiKey_openrouter', apiKeys.openrouter);
        } else {
            localStorage.removeItem('apiKey_openrouter');
        }
        
        // Paxsenix models don't need API keys
        localStorage.removeItem('apiKey_paxsenix');
        apiKeys.paxsenix = '';
    } catch (error) {
        console.error('Error saving API keys:', error);
    }
}

// Send a message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Add user message to UI
    appendMessage(message, 'user');
    
    // Add user message to chat history
    addMessageToCurrentChat(message, 'user');
    
    // Show thinking indicator
    showThinking();
    
    try {
        // Use default model
        const selectedModel = DEFAULT_MODEL;
        
        // Check if API key is available
        if (!checkApiKey(selectedModel)) {
            removeThinking();
            return;
        }
        
        let response;
        
        switch (selectedModel) {
            case 'gemini':
                response = await sendMessageToGemini(message);
                break;
            case 'openrouter':
                response = await sendMessageToOpenRouter(message);
                break;
            case 'claude':
                response = await sendMessageToPaxsenixClaude(message);
                break;
            case 'gpt4o':
                response = await sendMessageToPaxsenixGPT4O(message);
                break;
            case 'phi3':
                response = await sendMessageToPaxsenixPhi(message);
                break;
            default:
                response = "Model not supported. Please select a different model.";
        }
        
        // Remove thinking indicator
        removeThinking();
        
        // Add AI response to UI
        appendMessage(response, 'ai');
        
        // Add AI response to chat history
        addMessageToCurrentChat(response, 'ai');
    } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Remove thinking indicator
        removeThinking();
        
        // Show error message
        appendMessage('Sorry, I encountered an error. Please try again.', 'system');
    }
}

// Send message to Google's Gemini API
async function sendMessageToGemini(message) {
    try {
        // Add to conversation history
        geminiConversationHistory.push({
            role: 'user',
            parts: [{ text: message }]
        });
        
        // Limit conversation history
        if (geminiConversationHistory.length > MAX_GEMINI_CONVERSATION_HISTORY) {
            geminiConversationHistory.shift();
        }
        
        // Prepare request payload
        const userMessagePayload = {
            contents: geminiConversationHistory,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };
        
        console.log('Gemini request:', JSON.stringify(userMessagePayload, null, 2));
        
        // Send request to Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKeys.gemini}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userMessagePayload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error response:', errorText);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Gemini response:', JSON.stringify(data, null, 2));
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error('Invalid Gemini response structure:', data);
            throw new Error('Invalid response from Gemini API');
        }
        
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Add AI response to conversation history
        geminiConversationHistory.push({
            role: 'model',
            parts: [{ text: aiResponse }]
        });
        
        return aiResponse;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

// Send message to OpenRouter API
async function sendMessageToOpenRouter(message) {
    try {
        // Initialize conversation history if needed
        if (!openRouterConversationHistory.length) {
            // Get previous messages from chat history
            const chat = chatHistory.find(c => c.id === currentChatId);
            if (chat && chat.messages.length > 0) {
                const previousMessages = chat.messages.slice(-MAX_OPENROUTER_CONVERSATION_HISTORY);
                
                for (const msg of previousMessages) {
                    openRouterConversationHistory.push({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.content
                    });
                }
            }
        }
        
        // Add current message to history
        openRouterConversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Limit conversation history
        if (openRouterConversationHistory.length > MAX_OPENROUTER_CONVERSATION_HISTORY) {
            openRouterConversationHistory.shift();
        }
        
        // Use default OpenRouter model
        const selectedModel = 'meta-llama/llama-3-8b-instruct';
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.openrouter}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Storm Editor'
        };
        
        // Prepare request body
        const requestBody = {
            model: selectedModel,
            messages: openRouterConversationHistory,
            temperature: 0.7,
            max_tokens: 2048
        };
        
        console.log('OpenRouter request:', JSON.stringify(requestBody, null, 2));
        
        // Send request to OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error response:', errorText);
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('OpenRouter response:', JSON.stringify(responseData, null, 2));
        
        if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
            const aiResponse = responseData.choices[0].message.content;
            
            // Add AI response to conversation history
            openRouterConversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            return aiResponse;
        } else {
            console.error('Invalid OpenRouter response structure:', responseData);
            throw new Error('Invalid response structure from OpenRouter API');
        }
    } catch (error) {
        console.error('OpenRouter API error:', error);
        throw error;
    }
}

// Send message to Paxsenix Claude API
async function sendMessageToPaxsenixClaude(message) {
    try {
        // Add to conversation history
        paxsenixClaudeConversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Limit conversation history
        if (paxsenixClaudeConversationHistory.length > MAX_PAXSENIX_CLAUDE_CONVERSATION_HISTORY) {
            paxsenixClaudeConversationHistory.shift();
        }
        
        // Prepare message payload
        const messagePayload = {
            model: 'claude-3-sonnet-20240229',
            messages: paxsenixClaudeConversationHistory,
            temperature: 0.7,
            max_tokens: 2048
        };
        
        console.log('Paxsenix Claude request:', JSON.stringify(messagePayload, null, 2));
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
            // No API key needed for Paxsenix models
        };
        
        // Prepare request body
        const requestBody = {
            message: JSON.stringify(messagePayload)
        };
        
        // Send request to Paxsenix API
        const response = await fetch('https://api.paxsenix.biz.id/ai/claudeSonnet?full=true', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Paxsenix Claude API error response:', errorText);
            throw new Error(`Paxsenix Claude API error: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Paxsenix Claude response:', JSON.stringify(responseData, null, 2));
        
        if (responseData.message) {
            const aiResponse = responseData.message;
            
            // Add AI response to conversation history
            paxsenixClaudeConversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            return aiResponse;
        } else {
            console.error('Invalid Paxsenix Claude response structure:', responseData);
            throw new Error('Invalid response structure from Paxsenix Claude API');
        }
    } catch (error) {
        console.error('Paxsenix Claude API error:', error);
        throw error;
    }
}

// Send message to Paxsenix GPT-4o API
async function sendMessageToPaxsenixGPT4O(message) {
    try {
        // Add to conversation history
        paxsenixGPT4OConversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Limit conversation history
        if (paxsenixGPT4OConversationHistory.length > MAX_PAXSENIX_GPT4O_CONVERSATION_HISTORY) {
            paxsenixGPT4OConversationHistory.shift();
        }
        
        // Prepare message payload
        const messagePayload = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...paxsenixGPT4OConversationHistory
            ],
            stream: false
        };
        
        console.log('Paxsenix GPT-4o request:', JSON.stringify(messagePayload, null, 2));
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
            // No API key needed for Paxsenix models
        };
        
        // Send request to Paxsenix API
        const response = await fetch('https://api.paxsenix.biz.id/ai/gpt4o?full=true', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(messagePayload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Paxsenix GPT-4o API error response:', errorText);
            throw new Error(`Paxsenix GPT-4o API error: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Paxsenix GPT-4o response:', JSON.stringify(responseData, null, 2));
        
        if (responseData.message) {
            const aiResponse = responseData.message;
            
            // Add AI response to conversation history
            paxsenixGPT4OConversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            return aiResponse;
        } else {
            console.error('Invalid Paxsenix GPT-4o response structure:', responseData);
            throw new Error('Invalid response structure from Paxsenix GPT-4o API');
        }
    } catch (error) {
        console.error('Paxsenix GPT-4o API error:', error);
        throw error;
    }
}

// Send message to Paxsenix Phi-3 API
async function sendMessageToPaxsenixPhi(message) {
    try {
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
            // No API key needed for Paxsenix models
        };
        
        // Prepare request body
        const requestBody = {
            message: message
        };
        
        console.log('Paxsenix Phi request:', JSON.stringify(requestBody, null, 2));
        
        // Send request to Paxsenix API
        const response = await fetch('https://api.paxsenix.biz.id/ai/phi?full=true', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Paxsenix Phi API error response:', errorText);
            throw new Error(`Paxsenix Phi API error: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Paxsenix Phi response:', JSON.stringify(responseData, null, 2));
        
        if (responseData.message) {
            return responseData.message;
        } else {
            console.error('Invalid Paxsenix Phi response structure:', responseData);
            throw new Error('Invalid response structure from Paxsenix Phi API');
        }
    } catch (error) {
        console.error('Paxsenix Phi API error:', error);
        throw error;
    }
}

// Show thinking indicator
function showThinking() {
    const thinkingElement = document.createElement('div');
    thinkingElement.className = 'chat-message ai-message thinking';
    thinkingElement.innerHTML = `
        <div class="thinking-dots">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
        </div>
    `;
    chatMessagesContainer.appendChild(thinkingElement);
    scrollToBottom();
}

// Remove thinking indicator
function removeThinking() {
    const thinkingElement = document.querySelector('.thinking');
    if (thinkingElement) {
        thinkingElement.remove();
    }
}

// Append a message to the chat UI
function appendMessage(content, sender, saveToHistory = true) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}-message`;
    
    // Process content for markdown and code blocks
    const processedContent = processContent(content);
    
    messageElement.innerHTML = processedContent;
    chatMessagesContainer.appendChild(messageElement);
    
    // Add syntax highlighting to code blocks
    highlightCodeBlocks();
    
    // Scroll to the bottom
    scrollToBottom();
}

// Process content for markdown and code blocks
function processContent(content) {
    // Escape HTML to prevent XSS
    let processedContent = escapeHtml(content);
    
    // Process code blocks
    processedContent = processCodeBlocks(processedContent);
    
    // Process markdown
    processedContent = processMarkdown(processedContent);
    
    return processedContent;
}

// Process code blocks in the message
function processCodeBlocks(text) {
    // Replace ```language\ncode\n``` with code blocks
    return text.replace(/```([a-zA-Z]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
        return `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-language">${language || 'plaintext'}</span>
                    <div class="code-actions">
                        <button class="code-action-btn copy-btn" title="Copy code">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                <pre><code class="language-${language || 'plaintext'}">${escapeHtml(code)}</code></pre>
            </div>
        `;
    });
}

// Process markdown in the message
function processMarkdown(text) {
    // Bold: **text** or __text__
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Italic: *text* or _text_
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Lists: - item or * item
    text = text.replace(/^([\s]*)[-*]\s+(.*?)$/gm, '$1<li>$2</li>');
    text = text.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    
    // Paragraphs: separate by new lines
    text = text.replace(/\n\n/g, '</p><p>');
    text = `<p>${text}</p>`;
    
    // Fix nested paragraphs in lists
    text = text.replace(/<li><p>(.*?)<\/p><\/li>/g, '<li>$1</li>');
    
    return text;
}

// Highlight code blocks
function highlightCodeBlocks() {
    document.querySelectorAll('.code-block pre code').forEach(block => {
        // Add copy functionality to code blocks
        const copyButton = block.parentElement.parentElement.querySelector('.copy-btn');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const code = block.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                });
            });
        }
    });
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Scroll to the bottom of the chat
function scrollToBottom() {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Debug function to help diagnose API issues
function debugApiRequest(api, request, response) {
    console.log(`${api} API Request:`, request);
    console.log(`${api} API Response:`, response);
    
    // Log to chat for easier debugging
    if (response && response.error) {
        appendMessage(`Debug - ${api} API Error: ${JSON.stringify(response.error)}`, 'system');
    }
} 