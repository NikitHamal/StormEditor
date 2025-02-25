// Import HuggingFace Inference
const { HfInference } = window;

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

// API keys storage
const apiKeys = {
    gemini: '',
    kimi: '',
    paxsenixFlux: '',
    paxsenixClaude: '',
    paxsenixGPT4O: '',
    phi: ''
};

// Load API keys from localStorage
function loadApiKeys() {
    try {
        const savedKeys = localStorage.getItem('stormEditorApiKeys');
        if (savedKeys) {
            const parsedKeys = JSON.parse(savedKeys);
            Object.assign(apiKeys, parsedKeys);
            console.log('API keys loaded from localStorage');
            
            // Update input fields with saved values
            document.getElementById('gemini-key').value = apiKeys.gemini || '';
            document.getElementById('kimi-key').value = apiKeys.kimi || '';
            document.getElementById('paxsenix-flux-key').value = apiKeys.paxsenixFlux || '';
            document.getElementById('paxsenix-claude-key').value = apiKeys.paxsenixClaude || '';
            document.getElementById('paxsenix-gpt4o-key').value = apiKeys.paxsenixGPT4O || '';
            document.getElementById('phi-key').value = apiKeys.phi || '';
        }
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Save API keys to localStorage
function saveApiKeys() {
    try {
        // Get values from input fields
        apiKeys.gemini = document.getElementById('gemini-key').value.trim();
        apiKeys.kimi = document.getElementById('kimi-key').value.trim();
        apiKeys.paxsenixFlux = document.getElementById('paxsenix-flux-key').value.trim();
        apiKeys.paxsenixClaude = document.getElementById('paxsenix-claude-key').value.trim();
        apiKeys.paxsenixGPT4O = document.getElementById('paxsenix-gpt4o-key').value.trim();
        apiKeys.phi = document.getElementById('phi-key').value.trim();
        
        localStorage.setItem('stormEditorApiKeys', JSON.stringify(apiKeys));
        console.log('API keys saved to localStorage');
        
        // Show success message
        appendMessage('API keys saved successfully', 'system');
        // Switch back to chat tab
        document.getElementById('chat-tab').click();
    } catch (error) {
        console.error('Error saving API keys:', error);
        appendMessage('Error saving API keys: ' + error.message, 'system');
    }
}

// Check if API key is available for the selected model
function checkApiKey(model) {
    const keyMapping = {
        'gemini': 'gemini',
        'kimi': 'kimi',
        'phi': 'phi',
        'paxsenixFluxPro': 'paxsenixFlux',
        'paxsenixClaude': 'paxsenixClaude',
        'paxsenixGPT4O': 'paxsenixGPT4O'
    };
    
    const keyName = keyMapping[model];
    if (!keyName) return false;
    
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
        // You can add functionality here to track changes
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

// Password visibility toggle
document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const inputId = btn.getAttribute('data-for');
        const input = document.getElementById(inputId);
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🔒';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    });
});

// Save API keys button
document.getElementById('save-api-keys').addEventListener('click', saveApiKeys);

// Model-specific API calls
async function sendMessageGemini(userMessage, editorContent) {
    if (!checkApiKey('gemini')) {
        throw new Error('Gemini API key not set');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKeys.gemini}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `You are a helpful AI coding assistant. Please help with the following:
                    
Current code in editor:
${editorContent}

User question:
${userMessage}`
                }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Kimi AI conversation history and configuration
const kimiConversationHistory = [];
const MAX_CONVERSATION_HISTORY = 10;

async function sendMessageKimi(userMessage, editorContent) {
    if (!checkApiKey('kimi')) {
        throw new Error('Kimi API key not set');
    }

    try {
        console.log('Preparing request to Moonshot Kimi API...');
        
        // Manage conversation history
        const messagePayload = {
            role: 'user',
            content: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
        };
        
        kimiConversationHistory.push(messagePayload);
        
        // Truncate conversation history if it exceeds max length
        if (kimiConversationHistory.length > MAX_CONVERSATION_HISTORY) {
            kimiConversationHistory.shift();
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.kimi}`
        };
        console.log('Request headers:', { ...headers, Authorization: '[REDACTED]' });

        const requestBody = {
            model: 'moonshot-v1-8k',  // Supports 8k context
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...kimiConversationHistory
            ],
            temperature: 0.3,  // More focused responses
            max_tokens: 4000,  // Limit response length
            stream: false  // Non-streaming response
        };

        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error?.message || 'Unknown error';
            } catch {
                errorMessage = responseText || response.statusText;
            }
            throw new Error(`Kimi API request failed: ${errorMessage}`);
        }

        const data = JSON.parse(responseText);
        console.log('Parsed response data:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected response format:', data);
            throw new Error('Invalid response format from Kimi API');
        }

        const aiResponse = data.choices[0].message.content;
        
        // Add AI response to conversation history
        kimiConversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });

        return aiResponse;
    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Paxsenix Claude Sonnet conversation history
const paxsenixClaudeConversationHistory = [];
const MAX_PAXSENIX_CLAUDE_CONVERSATION_HISTORY = 10;

async function sendMessagePaxsenixClaude(userMessage, editorContent) {
    if (!checkApiKey('paxsenixClaude')) {
        throw new Error('Paxsenix Claude API key not set');
    }

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
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.paxsenixClaude}`
        };
        console.log('Request headers:', { ...headers, Authorization: '[REDACTED]' });

        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...paxsenixClaudeConversationHistory
            ]
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.paxsenix.biz.id/ai/claudeSonnet', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Unparseable response text:', responseText);
            throw new Error('Could not parse API response');
        }

        console.log('Parsed response data:', JSON.stringify(data, null, 2));

        // Flexible response parsing
        let aiResponse;
        if (data.content) {
            // Direct content
            aiResponse = data.content;
        } else if (data.choices && data.choices[0] && data.choices[0].message) {
            // OpenAI-like format
            aiResponse = data.choices[0].message.content;
        } else if (data.message) {
            // Alternative format
            aiResponse = data.message;
        } else {
            console.error('Unexpected response format. Full response:', data);
            throw new Error('Invalid response format from Paxsenix Claude Sonnet API');
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
    if (!checkApiKey('paxsenixGPT4O')) {
        throw new Error('Paxsenix GPT-4O API key not set');
    }

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
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.paxsenixGPT4O}`
        };
        console.log('Request headers:', { ...headers, Authorization: '[REDACTED]' });

        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...paxsenixGPT4OConversationHistory
            ]
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.paxsenix.biz.id/ai/gpt4o', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Unparseable response text:', responseText);
            throw new Error('Could not parse API response');
        }

        console.log('Parsed response data:', JSON.stringify(data, null, 2));

        // Flexible response parsing
        let aiResponse;
        if (data.content) {
            aiResponse = data.content;
        } else if (data.choices && data.choices[0] && data.choices[0].message) {
            aiResponse = data.choices[0].message.content;
        } else if (data.message) {
            aiResponse = data.message;
        } else {
            console.error('Unexpected response format. Full response:', data);
            throw new Error('Invalid response format from Paxsenix GPT-4O API');
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
    if (!checkApiKey('phi')) {
        throw new Error('Phi API key not set');
    }

    try {
        console.log('Preparing request to Paxsenix Phi API...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.phi}`
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
            ]
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.paxsenix.biz.id/ai/phi', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Unparseable response text:', responseText);
            throw new Error('Could not parse API response');
        }

        console.log('Parsed response data:', JSON.stringify(data, null, 2));

        // Flexible response parsing
        let aiResponse;
        if (data.content) {
            aiResponse = data.content;
        } else if (data.choices && data.choices[0] && data.choices[0].message) {
            aiResponse = data.choices[0].message.content;
        } else {
            console.error('Unexpected response format. Full response:', data);
            throw new Error('Invalid response format from Paxsenix Phi API');
        }

        return aiResponse;
    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Flux image generation function
async function generateImageWithFlux(prompt, options = {}) {
    if (!checkApiKey('paxsenixFluxPro')) {
        throw new Error('Paxsenix Flux API key not set');
    }

    try {
        console.log('Preparing request to Paxsenix Flux Image Generation API...');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.paxsenixFlux}`
        };

        const requestBody = {
            prompt: prompt,
            model: options.model || 'flux-diffusion-v1',
            width: options.width || 1024,
            height: options.height || 1024,
            num_images: options.num_images || 1,
            steps: options.steps || 50,
            cfg_scale: options.cfg_scale || 7.5,
            negative_prompt: options.negative_prompt || 'low quality, blurry, ugly'
        };

        console.log('Flux Image Generation Request Body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.paxsenix.biz.id/ai/flux', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            console.error('Unparseable response text:', responseText);
            throw new Error('Could not parse API response');
        }

        console.log('Parsed response data:', JSON.stringify(data, null, 2));

        // Flexible image URL extraction
        let imageUrls;
        if (Array.isArray(data.images)) {
            imageUrls = data.images;
        } else if (data.data && Array.isArray(data.data.images)) {
            imageUrls = data.data.images;
        } else if (data.urls && Array.isArray(data.urls)) {
            imageUrls = data.urls;
        } else {
            console.error('Unexpected response format. Full response:', data);
            throw new Error('Invalid response format from Paxsenix Flux API');
        }

        // Format response for chat display
        const imageHtml = imageUrls.map(url => `![Generated Image](${url})`).join('\n\n');
        return `### Generated Image(s)\n\n${imageHtml}\n\n*Images generated based on prompt: "${prompt}"*`;
    } catch (error) {
        console.error('Flux Image Generation Error:', error);
        throw error;
    }
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
            case 'kimi':
                response = await sendMessageKimi(message, editorContent);
                break;
            case 'phi':
                response = await sendMessagePhi(message, editorContent);
                break;
            case 'paxsenixFluxPro':
                response = await generateImageWithFlux(message);
                break;
            case 'paxsenixClaude':
                response = await sendMessagePaxsenixClaude(message, editorContent);
                break;
            case 'paxsenixGPT4O':
                response = await sendMessagePaxsenixGPT4O(message, editorContent);
                break;
            default:
                throw new Error(`Model ${selectedModel} is not yet implemented`);
        }
        return response;
    } catch (error) {
        console.error(`Error with ${selectedModel} API:`, error);
        throw new Error(`${selectedModel} API error: ${error.message}`);
    }
}

function showThinking() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.innerHTML = `
        <span>AI is thinking</span>
        <div class="thinking-dots">
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
            <div class="thinking-dot"></div>
        </div>
    `;
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return thinkingDiv;
}

function appendMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    if (sender === 'system') {
        messageDiv.classList.add('system-message');
        messageDiv.textContent = message;
    } else {
        // Convert markdown to HTML with enhanced formatting
        let formattedMessage = message
            // Code blocks with language
            .replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
                const displayLang = language || 'plaintext';
                return `<div class="code-block">
                    <div class="code-header">
                        <span class="code-language">${displayLang}</span>
                        <div class="code-actions">
                            <button class="code-action-btn copy-btn" title="Copy code">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4 4v10h10V4H4zm9 9H5V5h8v8z"/>
                                    <path d="M3 3v9h1V3h8V2H3v1z"/>
                                </svg>
                                Copy
                            </button>
                            <button class="code-action-btn implement-btn" title="Implement in editor">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4.5 3l4 4-4 4L3 9.5 5.5 7 3 4.5 4.5 3zm4 7h5v1h-5v-1z"/>
                                </svg>
                                Implement
                            </button>
                        </div>
                    </div>
                    <pre><code class="language-${displayLang}">${escapeHtml(code.trim())}</code></pre>
                </div>`;
            })
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Lists
            .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Numbered lists
            .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+?)(\n|$)/gm, '<p>$1</p>');

        messageDiv.innerHTML = formattedMessage;

        // Add event listeners for code block buttons
        messageDiv.querySelectorAll('.code-block').forEach(block => {
            const code = block.querySelector('code').textContent;
            
            // Copy button
            block.querySelector('.copy-btn').addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(code);
                    const btn = block.querySelector('.copy-btn');
                    const originalContent = btn.innerHTML;
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg> Copied!';
                    btn.style.backgroundColor = '#238636';
                    setTimeout(() => {
                        btn.innerHTML = originalContent;
                        btn.style.backgroundColor = '';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            });

            // Implement button
            block.querySelector('.implement-btn').addEventListener('click', () => {
                editor.setValue(code);
                editor.focus();
            });
        });
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Disable input while processing
    const inputContainer = document.querySelector('.chat-input-container');
    inputContainer.classList.add('disabled');
    chatInput.value = '';

    // Show user message
    appendMessage(message, 'user');

    // Show thinking animation
    const thinkingDiv = showThinking();

    try {
        const response = await sendMessageToAI(message);
        // Remove thinking animation
        thinkingDiv.remove();
        // Show AI response
        appendMessage(response, 'ai');
    } catch (error) {
        thinkingDiv.remove();
        appendMessage('Error: ' + error.message, 'system');
    } finally {
        // Re-enable input
        inputContainer.classList.remove('disabled');
        chatInput.focus();
    }
}

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

// Load saved API keys on startup
document.addEventListener('DOMContentLoaded', () => {
    loadApiKeys();
    updateModelSelector();
});

// Update model selector to include all available models
function updateModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    
    // Clear existing options
    modelSelector.innerHTML = '';

    // Add model options
    const models = [
        { value: 'gemini', text: 'Gemini 2.0 Flash' },
        { value: 'kimi', text: 'Kimi (Moonshot)' },
        { value: 'paxsenixFluxPro', text: 'Flux Pro (Paxsenix)' },
        { value: 'phi', text: 'Phi (Paxsenix)' },
        { value: 'paxsenixClaude', text: 'Claude Sonnet (Paxsenix)' },
        { value: 'paxsenixGPT4O', text: 'GPT-4O (Paxsenix)' }
    ];

    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.text;
        modelSelector.appendChild(option);
    });
}
