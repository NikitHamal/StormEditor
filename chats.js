// Load chat history from localStorage
function loadChatHistory() {
    try {
        const savedChats = localStorage.getItem('stormEditorChatHistory');
        if (savedChats) {
            chatHistory = JSON.parse(savedChats);
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

// Render chat history in the sidebar
function renderChatHistory() {
    const chatHistoryContainer = document.getElementById('chat-history');
    if (!chatHistoryContainer) return;
    
    chatHistoryContainer.innerHTML = '';
    
    if (chatHistory.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-chat-history';
        emptyMessage.textContent = 'No chat history';
        chatHistoryContainer.appendChild(emptyMessage);
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
        });
        
        chatHistoryContainer.appendChild(chatItem);
    });
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
    }
    
    // Save chat history
    try {
        localStorage.setItem('stormEditorChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
    
    // Update UI
    renderChatHistory();
    
    return true;
}

// Load a specific chat
function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return false;
    
    currentChatId = chatId;
    
    // Clear chat messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        
        // Add messages
        chat.messages.forEach(message => {
            appendMessage(message.content, message.sender, false);
        });
    }
    
    // Update UI
    renderChatHistory();
    
    return true;
}

// Delete a chat
function deleteChat(chatId) {
    if (!chatId) return false;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this chat?')) {
        return false;
    }
    
    // Remove from chat history
    chatHistory = chatHistory.filter(chat => chat.id !== chatId);
    
    // If the deleted chat was the current one, load another chat or create a new one
    if (chatId === currentChatId) {
        if (chatHistory.length > 0) {
            loadChat(chatHistory[0].id);
        } else {
            createNewChat();
        }
    }
    
    // Save chat history
    try {
        localStorage.setItem('stormEditorChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
    
    // Update UI
    renderChatHistory();
    
    return true;
}

// Create a new chat
function createNewChat() {
    // Clear chat messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Create a new chat session
    const newChat = {
        id: 'chat_' + Date.now(),
        title: 'New Chat',
        created: new Date().toISOString(),
        messages: []
    };
    
    // Add to chat history
    chatHistory.unshift(newChat);
    currentChatId = newChat.id;
    
    // Save to localStorage
    try {
        localStorage.setItem('stormEditorChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
    
    // Update UI
    renderChatHistory();
    
    return newChat;
}

// Save selected model to localStorage
function saveSelectedModel() {
    try {
        localStorage.setItem('stormEditorSelectedModel', modelSelector.value);
    } catch (error) {
        console.error('Error saving selected model:', error);
    }
}

// Load selected model from localStorage
function loadSelectedModel() {
    try {
        const savedModel = localStorage.getItem('stormEditorSelectedModel');
        if (savedModel && document.querySelector(`#model-selector option[value="${savedModel}"]`)) {
            modelSelector.value = savedModel;
        }
    } catch (error) {
        console.error('Error loading selected model:', error);
    }
}

// Load API keys from localStorage
function loadApiKeys() {
    try {
        const geminiKey = localStorage.getItem('apiKey_gemini');
        const openrouterKey = localStorage.getItem('apiKey_openrouter');
        const openrouterModel = localStorage.getItem('openrouterModel');
        
        if (geminiKey) {
            document.getElementById('gemini-key').value = geminiKey;
            apiKeys.gemini = geminiKey;
        }
        
        if (openrouterKey) {
            document.getElementById('openrouter-key').value = openrouterKey;
            apiKeys.openrouter = openrouterKey;
        }
        
        if (openrouterModel) {
            document.getElementById('openrouter-model').value = openrouterModel;
        }
        
        // Add event listeners for API key toggles
        const toggleBtns = document.querySelectorAll('.toggle-visibility-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const inputId = btn.dataset.for;
                const input = document.getElementById(inputId);
                
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    btn.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        });
        
        // Add event listener for saving API keys
        const saveKeysBtn = document.getElementById('save-api-keys');
        saveKeysBtn.addEventListener('click', saveApiKeys);
        
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Save API keys to localStorage
function saveApiKeys() {
    try {
        const geminiKey = document.getElementById('gemini-key').value.trim();
        const openrouterKey = document.getElementById('openrouter-key').value.trim();
        const openrouterModel = document.getElementById('openrouter-model').value;
        
        if (geminiKey) {
            localStorage.setItem('apiKey_gemini', geminiKey);
            apiKeys.gemini = geminiKey;
        } else {
            localStorage.removeItem('apiKey_gemini');
            apiKeys.gemini = '';
        }
        
        if (openrouterKey) {
            localStorage.setItem('apiKey_openrouter', openrouterKey);
            apiKeys.openrouter = openrouterKey;
        } else {
            localStorage.removeItem('apiKey_openrouter');
            apiKeys.openrouter = '';
        }
        
        if (openrouterModel) {
            localStorage.setItem('openrouterModel', openrouterModel);
        }
        
        appendMessage('API keys saved successfully', 'system');
        updateModelSelector();
        
    } catch (error) {
        console.error('Error saving API keys:', error);
        appendMessage('Failed to save API keys', 'system');
    }
}

// Check if API key is available for the selected model
function checkApiKey(model) {
    const keyMapping = {
        'gemini': 'gemini',
        'openrouter': 'openrouter'
    };
    
    // Paxsenix models don't need API keys
    if (model.startsWith('paxsenix')) {
        return true;
    }
    
    const keyName = keyMapping[model];
    if (!keyName) return true; // If no mapping, assume no key needed
    
    if (!apiKeys[keyName]) {
        appendMessage(`Please set your ${model} API key in the settings panel.`, 'system');
        document.getElementById('settings-tab').click();
        return false;
    }
    
    return true;
}

let editor;
require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: '// Start coding here...',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
            enabled: true
        }
    });

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
});

// Chat functionality
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const modelSelector = document.getElementById('model-selector');

// Sidebar and Settings Controls
document.getElementById('toggle-sidebar').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
});

// Tab switching functionality
document.getElementById('chat-tab').addEventListener('click', () => {
    document.getElementById('chat-tab').classList.add('active');
    document.getElementById('settings-tab').classList.remove('active');
    document.getElementById('chat-panel').style.display = 'flex';
    document.getElementById('settings-panel').classList.add('hidden');
});

document.getElementById('settings-tab').addEventListener('click', () => {
    document.getElementById('settings-tab').classList.add('active');
    document.getElementById('chat-tab').classList.remove('active');
    document.getElementById('chat-panel').style.display = 'none';
    document.getElementById('settings-panel').classList.remove('hidden');
});

document.getElementById('toggle-settings').addEventListener('click', () => {
    // Switch to settings tab when settings button is clicked
    document.getElementById('settings-tab').click();
});

document.getElementById('sidebar-width').addEventListener('input', (e) => {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.width = e.target.value + 'px';
});

// Create new chat button
document.getElementById('new-chat-btn').addEventListener('click', createNewChat);

// Password visibility toggle
document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const inputId = btn.getAttribute('data-for');
        const input = document.getElementById(inputId);
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.querySelector('i').className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            btn.querySelector('i').className = 'fas fa-eye';
        }
    });
});

// Save API keys button
document.getElementById('save-api-keys').addEventListener('click', saveApiKeys);

// Add model selector change event to save selected model
modelSelector.addEventListener('change', saveSelectedModel);

// Gemini conversation history
const geminiConversationHistory = [];
const MAX_GEMINI_CONVERSATION_HISTORY = 20;

// Model-specific API calls
async function sendMessageGemini(userMessage, editorContent) {
    if (!checkApiKey('gemini')) {
        throw new Error('Gemini API key not set');
    }

    // Manage conversation history
    const userMessagePayload = {
        role: 'user',
        parts: [{
            text: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
        }]
    };
    
    // Add context from previous messages if available
    let contents = [];
    
    // First add system message
    contents.push({
        role: 'system',
        parts: [{
            text: 'You are a helpful AI coding assistant. Provide clear, concise help with code issues and programming questions.'
        }]
    });
    
    // Then add conversation history
    if (geminiConversationHistory.length > 0) {
        contents = contents.concat(geminiConversationHistory);
    }
    
    // Finally add the current user message
    contents.push(userMessagePayload);
    
    // Keep history within limits
    if (contents.length > MAX_GEMINI_CONVERSATION_HISTORY) {
        // Keep system message (index 0) and remove older messages
        contents = [
            contents[0], 
            ...contents.slice(contents.length - MAX_GEMINI_CONVERSATION_HISTORY + 1)
        ];
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKeys.gemini}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents })
    });

    if (!response.ok) {
        throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Add user message and AI response to conversation history
    geminiConversationHistory.push(userMessagePayload);
    geminiConversationHistory.push({
        role: 'model',
        parts: [{ text: aiResponse }]
    });
    
    // Truncate history if it exceeds max length
    while (geminiConversationHistory.length > MAX_GEMINI_CONVERSATION_HISTORY) {
        geminiConversationHistory.shift();
    }
    
    return aiResponse;
}

// OpenRouter API integration
async function sendMessageOpenRouter(userMessage, editorContent) {
    if (!checkApiKey('openrouter')) {
        throw new Error('OpenRouter API key not set');
    }

    try {
        console.log('Preparing request to OpenRouter API...');
        
        // OpenRouter conversation history
        const openRouterConversationHistory = [];
        const MAX_OPENROUTER_CONVERSATION_HISTORY = 15;
        
        // Get the selected model from the dropdown
        const selectedModel = document.getElementById('openrouter-model').value;
        console.log('Using OpenRouter model:', selectedModel);

        // Check if the model URL starts with @ and remove it
        const modelId = selectedModel.startsWith('@') ? selectedModel.substring(1) : selectedModel;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.openrouter}`,
            'HTTP-Referer': window.location.href, // Required by OpenRouter
            'X-Title': 'Storm Editor',
            'User-Agent': 'Storm Editor/1.0'
        };
        console.log('Request headers:', { ...headers, Authorization: '[REDACTED]' });

        // Get current chat to build conversation history
        let messages = [];
        
        if (currentChatId) {
            const chat = chatHistory.find(c => c.id === currentChatId);
            if (chat && chat.messages.length > 0) {
                // Add previous messages as context, up to the limit
                const previousMessages = chat.messages.slice(-MAX_OPENROUTER_CONVERSATION_HISTORY);
                
                for (const msg of previousMessages) {
                    messages.push({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.content
                    });
                }
            }
        }
        
        // Add system message at the beginning
        messages.unshift({
                    role: 'system',
            content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices. You have access to the current code in the editor and can provide specific guidance based on it.'
        });
        
        // Add the current user message
        messages.push({
                    role: 'user',
                    content: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
        });

        const requestBody = {
            model: modelId, // Use the selected model from the dropdown
            messages: messages,
            temperature: 0.3,
            max_tokens: 4000,  // Reasonable limit for response length
            top_p: 0.9,        // Standard setting for creative but focused responses
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        // Use the standard OpenRouter API endpoint
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response text length:', responseText.length);
        console.log('Raw response text preview:', responseText.substring(0, 500) + '...');

        if (!response.ok) {
            // Handle specific error codes
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (response.status === 401) {
                throw new Error('Invalid API key. Please check your OpenRouter API key.');
            } else if (response.status === 404) {
                throw new Error(`Model not found: ${selectedModel}. Please check the model ID.`);
            }
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Unparseable response text:', responseText);
            
            // Try to extract content using regex if JSON parsing fails
            const contentMatch = responseText.match(/"content"\s*:\s*"((?:\\"|[^"])*?)"/);
            if (contentMatch && contentMatch[1]) {
                return contentMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
            
            throw new Error('Could not parse API response');
        }

        console.log('Parsed response data:', JSON.stringify(data, null, 2));

        // Extract response content
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else if (data.message) {
            return data.message;
        } else if (data.content) {
            return data.content;
        } else {
            throw new Error('Unexpected response format from OpenRouter API');
        }
    } catch (error) {
        console.error('Full error details:', error);
        
        // Check for network errors
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Network error: Unable to connect to OpenRouter API. Please check your internet connection.');
        }
        
        throw error;
    }
}

// Paxsenix Claude Sonnet conversation history
const paxsenixClaudeConversationHistory = [];
const MAX_PAXSENIX_CLAUDE_CONVERSATION_HISTORY = 10;

async function sendMessagePaxsenixClaude(userMessage, editorContent) {
    try {
        console.log('Preparing request to Paxsenix Claude Sonnet API...');
        
        // Manage conversation history
        const messagePayload = {
            role: 'user',
            content: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
        };
        
        paxsenixClaudeConversationHistory.push(messagePayload);
        
        // Truncate conversation history if it exceeds max length
        if (paxsenixClaudeConversationHistory.length > MAX_PAXSENIX_CLAUDE_CONVERSATION_HISTORY) {
            paxsenixClaudeConversationHistory.shift();
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...paxsenixClaudeConversationHistory
            ],
            stream: false // Explicitly request non-streaming response
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        // First try with fetch with the full=true parameter to get the complete response
        const response = await fetch('https://api.paxsenix.biz.id/ai/claudeSonnet?full=true', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the full response text
        const responseText = await response.text();
        console.log('Raw response text length:', responseText.length);
        console.log('Raw response text preview:', responseText.substring(0, 500) + '...');

        // Try to parse the response as JSON
        let data;
        let aiResponse;
        
        try {
            data = JSON.parse(responseText);
            
            // Extract message from parsed JSON
            if (data && data.message) {
                aiResponse = data.message;
            } else if (data && data.content) {
                aiResponse = data.content;
            } else if (data && data.choices && data.choices[0] && data.choices[0].message) {
                aiResponse = data.choices[0].message.content;
            }
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            
            // If JSON parsing fails, try to extract the message using regex
            const messageMatch = responseText.match(/"message"\s*:\s*"((?:\\"|[^"])*?)(?:"|\\\\")(,|\}|$)/);
            if (messageMatch && messageMatch[1]) {
                aiResponse = messageMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                console.log('Extracted message from raw response using regex');
            } else {
                throw new Error('Could not parse API response or extract message');
            }
        }
        
        if (!aiResponse) {
            throw new Error('Could not find message content in API response');
        }
            
            // Add AI response to conversation history
            paxsenixClaudeConversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            return aiResponse;
    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Paxsenix GPT-4O conversation history
const paxsenixGPT4OConversationHistory = [];
const MAX_PAXSENIX_GPT4O_CONVERSATION_HISTORY = 10;

async function sendMessagePaxsenixGPT4O(userMessage, editorContent) {
    try {
        console.log('Preparing request to Paxsenix GPT-4O API...');
        
        // Manage conversation history
        const messagePayload = {
            role: 'user',
            content: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
        };
        
        paxsenixGPT4OConversationHistory.push(messagePayload);
        
        // Truncate conversation history if it exceeds max length
        if (paxsenixGPT4OConversationHistory.length > MAX_PAXSENIX_GPT4O_CONVERSATION_HISTORY) {
            paxsenixGPT4OConversationHistory.shift();
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...paxsenixGPT4OConversationHistory
            ],
            stream: false // Explicitly request non-streaming response
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        // First try with fetch with the full=true parameter to get the complete response
        const response = await fetch('https://api.paxsenix.biz.id/ai/gpt4o?full=true', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the full response text
        const responseText = await response.text();
        console.log('Raw response text length:', responseText.length);
        console.log('Raw response text preview:', responseText.substring(0, 500) + '...');

        // Try to parse the response as JSON
        let data;
        let aiResponse;
        
        try {
            data = JSON.parse(responseText);

            // Extract message from parsed JSON
        if (data && data.message) {
                aiResponse = data.message;
            } else if (data && data.content) {
                aiResponse = data.content;
            } else if (data && data.choices && data.choices[0] && data.choices[0].message) {
                aiResponse = data.choices[0].message.content;
            }
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            
            // If JSON parsing fails, try to extract the message using regex
            const messageMatch = responseText.match(/"message"\s*:\s*"((?:\\"|[^"])*?)(?:"|\\\\")(,|\}|$)/);
            if (messageMatch && messageMatch[1]) {
                aiResponse = messageMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                console.log('Extracted message from raw response using regex');
        } else {
                throw new Error('Could not parse API response or extract message');
            }
        }
        
        if (!aiResponse) {
            throw new Error('Could not find message content in API response');
        }

        // Add AI response to conversation history
        paxsenixGPT4OConversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });

        return aiResponse;
    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Implement sendMessagePhi function
async function sendMessagePhi(userMessage, editorContent) {
    try {
        console.log('Preparing request to Paxsenix Phi API...');
        
        const headers = {
            'Content-Type': 'application/json'
        };

        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                {
                    role: 'user',
                    content: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
                }
            ],
            stream: false
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        // Use the full=true parameter to get the complete response
        const response = await fetch('https://api.paxsenix.biz.id/ai/phi?full=true', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the full response text
        const responseText = await response.text();
        console.log('Raw response text length:', responseText.length);
        console.log('Raw response text preview:', responseText.substring(0, 500) + '...');

        // Try to parse the response as JSON
        let data;
        let aiResponse;
        
        try {
            data = JSON.parse(responseText);

            // Extract message from parsed JSON
        if (data && data.message) {
                aiResponse = data.message;
            } else if (data && data.content) {
            aiResponse = data.content;
            } else if (data && data.choices && data.choices[0] && data.choices[0].message) {
            aiResponse = data.choices[0].message.content;
            }
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            
            // If JSON parsing fails, try to extract the message using regex
            const messageMatch = responseText.match(/"message"\s*:\s*"((?:\\"|[^"])*?)(?:"|\\\\")(,|\}|$)/);
            if (messageMatch && messageMatch[1]) {
                aiResponse = messageMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                console.log('Extracted message from raw response using regex');
                } else {
                throw new Error('Could not parse API response or extract message');
            }
        }
        
        if (!aiResponse) {
            throw new Error('Could not find message content in API response');
        }

        return aiResponse;
                } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Process code blocks in messages
function processCodeBlocks(text) {
    // Match ```language\ncode``` blocks
    const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g;
    
    return text.replace(codeBlockRegex, (match, language, code) => {
        // Clean up the language identifier
        language = language.trim().toLowerCase();
        if (!language) {
            language = 'plaintext';
        }
        
        // Create the code block HTML
        return `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-language">${language}</span>
                    <div class="code-actions">
                        <button class="code-action-btn copy-btn" onclick="copyCodeToClipboard(this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        ${language !== 'plaintext' ? `
                            <button class="code-action-btn implement-btn" onclick="implementCode(this)">
                                <i class="fas fa-code"></i> Implement
                            </button>
                        ` : ''}
                    </div>
                </div>
                <pre><code class="${language}">${escapeHtml(code)}</code></pre>
            </div>
        `;
    });
}

// Escape HTML entities
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show "AI is thinking" indicator
function showThinking() {
    appendMessage('AI is thinking...', 'system', false);
}

async function sendMessageToAI(message) {
    const selectedModel = modelSelector.value;
    const editorContent = editor.getValue();
    let response;

    try {
    switch (selectedModel) {
        case 'gemini':
                response = await sendMessageGemini(message, editorContent);
            break;
            case 'openrouter':
                response = await sendMessageOpenRouter(message, editorContent);
            break;
        case 'phi':
                // Return a helpful error message since this model is no longer available
                throw new Error('The Phi model is no longer available. Please select a different model.');
            break;
        case 'paxsenixClaude':
                response = await sendMessagePaxsenixClaude(message, editorContent);
            break;
        case 'paxsenixGPT4O':
                response = await sendMessagePaxsenixGPT4O(message, editorContent);
            break;
        default:
                throw new Error(`Model ${selectedModel} is not supported. Please select a different model.`);
    }
    
    // Final check if response is still a JSON string containing message property
    if (typeof response === 'string') {
        try {
            // Try to parse it as JSON if it looks like JSON
            if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
                const parsedResponse = JSON.parse(response);
                if (parsedResponse.message) {
                    return parsedResponse.message;
                }
            }
        } catch (e) {
            // If parsing fails, just return the original response
            console.warn('Failed to parse response as JSON in final check:', e);
        }
    }
    
    return response;
    } catch (error) {
        console.error(`Error with ${selectedModel} API:`, error);
        
        // Check if it's a 404 Not Found error
        if (error.message && error.message.includes('404')) {
            throw new Error(`The ${selectedModel} API endpoint is not available. Please select a different model.`);
        }
        
        throw new Error(`${selectedModel} API error: ${error.message}`);
    }
}

function showThinking() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.textContent = 'AI is thinking...';
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return thinkingDiv;
}

function appendMessage(message, sender, saveToHistory = true) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    
    if (sender === 'system') {
        messageElement.className = 'system-message';
        messageElement.textContent = message;
    } else {
        messageElement.className = `chat-message ${sender}-message`;
        
        // Process markdown-like syntax
        let processedContent = message;
        
        // Process code blocks
        processedContent = processCodeBlocks(processedContent);
        
        // Process horizontal rules (---)
        processedContent = processedContent.replace(/^---+$/gm, '<hr class="message-divider">');
        
        // Process headers
        processedContent = processedContent.replace(/^### (.+)$/gm, '<h3 class="message-heading">$1</h3>');
        processedContent = processedContent.replace(/^## (.+)$/gm, '<h2 class="message-heading">$1</h2>');
        processedContent = processedContent.replace(/^# (.+)$/gm, '<h1 class="message-heading">$1</h1>');
        
        // Process blockquotes
        processedContent = processedContent.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');
        
        // Combine adjacent blockquotes
        processedContent = processedContent.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');
        
        // Process bullet points
        processedContent = processedContent.replace(/^\s*- (.+)$/gm, '<li>$1</li>');
        
        // Process numbered lists
        processedContent = processedContent.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
        
        // Simplified list processing
        // First, wrap all consecutive <li> elements with a temporary marker
        processedContent = processedContent.replace(/(<li>[\s\S]*?<\/li>)(\s*<li>[\s\S]*?<\/li>)*/g, 
            '<list-group>$&</list-group>');
        
        // Then determine if each list-group should be <ol> or <ul> based on the original content
        // and replace list-group with the appropriate tag
        const listGroups = processedContent.match(/<list-group>[\s\S]*?<\/list-group>/g) || [];
        
        for (const listGroup of listGroups) {
            // Extract the text content of the list items
            const listItemsText = listGroup.match(/<li>([\s\S]*?)<\/li>/g)
                .map(li => li.replace(/<li>([\s\S]*?)<\/li>/, '$1'));
            
            // Find the corresponding section in the original message
            const firstItemText = listItemsText[0];
            const originalMessageIndex = message.indexOf(firstItemText);
            
            if (originalMessageIndex !== -1) {
                // Look at a few characters before this index to determine list type
                const prefix = message.substring(Math.max(0, originalMessageIndex - 10), originalMessageIndex);
                const isNumbered = /\d+\./.test(prefix);
                
                // Replace the list-group with appropriate list tag
                const listTag = isNumbered ? 'ol' : 'ul';
                processedContent = processedContent.replace(
                    listGroup, 
                    `<${listTag} class="message-list">${listGroup.replace(/<\/?list-group>/g, '')}</${listTag}>`
                );
            } else {
                // Default to unordered list if we can't determine
                processedContent = processedContent.replace(
                    listGroup, 
                    `<ul class="message-list">${listGroup.replace(/<\/?list-group>/g, '')}</ul>`
                );
            }
        }
        
        // Convert links
        processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Convert ** to bold
        processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Convert * to italics
        processedContent = processedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Convert line breaks to paragraphs, but avoid wrapping elements that should be block-level
        const paragraphs = processedContent.split('\n\n');
        processedContent = paragraphs.map(p => {
            // Skip wrapping if the paragraph starts with a block element
            if (p.trim().startsWith('<h') || 
                p.trim().startsWith('<ul') || 
                p.trim().startsWith('<ol') || 
                p.trim().startsWith('<hr') ||
                p.trim().startsWith('<div') ||
                p.trim().startsWith('<pre') ||
                p.trim().startsWith('<blockquote')) {
                return p;
            }
            return `<p>${p}</p>`;
        }).join('');
        
        // Replace single newlines with line breaks
        processedContent = processedContent.replace(/\n/g, '<br>');
        
        messageElement.innerHTML = processedContent;
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save to chat history if needed
    if (saveToHistory && sender !== 'system') {
        addMessageToCurrentChat(message, sender);
    }
}

async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;

    // Clear input
    chatInput.value = '';

    // Show user message
    appendMessage(message, 'user');

    // Show AI is thinking message
    showThinking();
    
    try {
        // Call the AI model with the message
        let aiResponse = await sendMessageToAI(message);
        
        // Final check for any JSON objects that might be returned directly
        if (typeof aiResponse === 'string' && aiResponse.trim().startsWith('{') && aiResponse.trim().endsWith('}')) {
            try {
                const jsonResponse = JSON.parse(aiResponse);
                if (jsonResponse.message) {
                    aiResponse = jsonResponse.message;
                }
            } catch (e) {
                // If parsing fails, keep the original response
                console.warn('Failed to parse response as JSON in final check:', e);
            }
        }
        
        // Remove thinking indicator
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer && messagesContainer.lastChild) {
            messagesContainer.removeChild(messagesContainer.lastChild);
        }
        
        // Show AI response
        appendMessage(aiResponse, 'ai');
    } catch (error) {
        // Remove thinking indicator
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer && messagesContainer.lastChild) {
            messagesContainer.removeChild(messagesContainer.lastChild);
        }
        
        // Show error message
        appendMessage(`Error: ${error.message}`, 'error');
        console.error('Error sending message to AI:', error);
    }
}

// Initialize event listeners for chat
document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-button');
    const chatInput = document.getElementById('chat-input');
    
    if (sendButton && chatInput) {
        // Send message on button click
        sendButton.addEventListener('click', sendMessage);
        
        // Send message on Enter (but not with Shift+Enter)
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto resize textarea as user types
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        });
    }
});

// Helper function to escape HTML special characters
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Load saved API keys and chat history on startup
document.addEventListener('DOMContentLoaded', () => {
    // Add Markdown styles
    addMarkdownStyles();
    
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
                renderLineHighlight: 'none'
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
            
            console.log('Monaco editor initialized successfully');
            
            // Populate language selector
            populateLanguageSelector();
            
            // Initialize file system
            loadFileSystem();
            
            // Setup event listeners for file management
            setupFileManagementListeners();
            
        } catch (error) {
            console.error('Error initializing Monaco editor:', error);
        }
    });
    
    loadApiKeys();
    loadChatHistory();
    updateModelSelector();
    loadSelectedModel(); // Load the previously selected model
    
    // Check if currently selected model is still valid
    const currentModel = modelSelector.value;
    const validModelValues = Array.from(modelSelector.options).map(opt => opt.value);
    
    if (!validModelValues.includes(currentModel)) {
        // If current model is invalid (like phi), switch to a default
        modelSelector.value = 'gemini';
        saveSelectedModel();
    }
});

// Add Markdown-specific styles dynamically to the page
function addMarkdownStyles() {
    // Check if styles already exist
    if (document.getElementById('markdown-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'markdown-styles';
    
    // Define CSS
    styleElement.textContent = `
        .message-divider {
            border: 0;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 15px 0;
        }
        
        .message-heading {
            margin: 15px 0 10px 0;
            font-weight: 600;
            color: #f0f0f0;
        }
        
        h1.message-heading {
            font-size: 1.7em;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 5px;
        }
        
        h2.message-heading {
            font-size: 1.4em;
        }
        
        h3.message-heading {
            font-size: 1.2em;
        }
        
        .message-list {
            margin: 10px 0 10px 20px;
            padding-left: 15px;
        }
        
        .message-list li {
            margin-bottom: 5px;
        }
        
        .ai-message p {
            margin: 8px 0;
        }
        
        .chat-message a {
            color: #64B5F6;
            text-decoration: none;
        }
        
        .chat-message a:hover {
            text-decoration: underline;
        }
        
        .chat-message blockquote {
            border-left: 4px solid #64B5F6;
            padding: 4px 0 4px 15px;
            margin: 10px 0;
            background-color: rgba(100, 181, 246, 0.1);
            border-radius: 0 4px 4px 0;
        }
    `;
    
    // Add to document
    document.head.appendChild(styleElement);
}
