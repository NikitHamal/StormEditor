// Import HuggingFace Inference
const { HfInference } = window;

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

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
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyButton = document.getElementById('save-key');

// API Keys storage
let apiKeys = {
    gemini: 'AIzaSyChpeOa4gwBVR6ZcOa8KGQezB8iL7hJuI8',
    deepseek: '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',
    kimi: 'sk-jsLYee8PWVogUZS2Wb2HYqSa715Wyp1R3p6jTdz9aWWg6sfi',
    phi3: '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',
    paxsenixClaude: 'YOUR_PAXSENIX_API_KEY',
    paxsenixFlux: 'YOUR_PAXSENIX_FLUX_API_KEY',
    qwen: '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',
    phi: '' // Add Qwen key
};

// Load saved API keys from localStorage
function loadApiKeys() {
    const savedKeys = localStorage.getItem('storm_editor_api_keys');
    if (savedKeys) {
        apiKeys = { ...apiKeys, ...JSON.parse(savedKeys) };
    }
    // Update placeholder with current model
    updateApiKeyPlaceholder();
}

// Save API key
function saveApiKey() {
    const selectedModel = modelSelector.value;
    const apiKey = apiKeyInput.value.trim();
    
    if (apiKey) {
        apiKeys[selectedModel] = apiKey;
        localStorage.setItem('storm_editor_api_keys', JSON.stringify(apiKeys));
        apiKeyInput.value = '';
        appendMessage(`API key for ${selectedModel} has been saved.`, 'system');
    }
}

function updateApiKeyPlaceholder() {
    const selectedModel = modelSelector.value;
    apiKeyInput.placeholder = `Enter ${selectedModel.toUpperCase()} API Key`;
}

// Model-specific API calls
async function sendMessageGemini(userMessage, editorContent) {
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

async function sendMessageDeepSeek(userMessage, editorContent) {
    // Validate API key format
    if (!apiKeys.deepseek.startsWith('sk-or-')) {
        throw new Error('Invalid OpenRouter API key format. Key should start with "sk-or-"');
    }

    try {
        console.log('Preparing request to OpenRouter API...');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.deepseek}`
        };
        console.log('Request headers:', { ...headers, Authorization: '[REDACTED]' });

        const requestBody = {
            model: 'deepseek/deepseek-r1-distill-llama-70b:free',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant with deep knowledge of software development.'
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

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            throw new Error(`DeepSeek API request failed: ${errorMessage}`);
        }

        const data = JSON.parse(responseText);
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Add Monaco Editor error handling
let monacoEditorLoaded = false;
let monacoLoadingPromise = null;
let lastEditorContent = ''; // Cache for editor content

// Update getEditorContent to handle cancellation
function getEditorContent() {
    try {
        if (!window.editor) {
            console.warn('Editor not initialized, returning cached content');
            return lastEditorContent;
        }
        lastEditorContent = window.editor.getValue();
        return lastEditorContent;
    } catch (error) {
        console.warn('Error getting editor content:', error);
        return lastEditorContent;
    }
}

// Update Phi message handling with better error handling and retries
async function sendMessagePhi(userMessage, editorContent) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            console.log(`Preparing request to Phi API (attempt ${attempt + 1}/${maxRetries})...`);

            // Ensure we have content to send
            const safeEditorContent = editorContent || lastEditorContent || '// No code available';
            
            // Construct the message with proper formatting and length limit
            const message = `You are an expert coding assistant. Help users write, understand, and debug code.

Current code:
\`\`\`
${safeEditorContent}
\`\`\`

User question: ${userMessage}

Please provide a clear and detailed response.`.trim();

            // Construct the API URL with encoded parameters
            const apiUrl = new URL('https://api.paxsenix.biz.id/ai/phi3');
            apiUrl.searchParams.append('text', message);

            console.log('Making request to Phi API with:', {
                attempt: attempt + 1,
                messageLength: message.length,
                userQuestion: userMessage,
                hasCode: Boolean(safeEditorContent)
            });

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // Handle different response types
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });

                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || 'Unknown error';
                } catch {
                    errorMessage = errorText || response.statusText;
                }

                // If it's a rate limit or temporary error, retry
                if (response.status === 429 || response.status >= 500) {
                    attempt++;
                    if (attempt < maxRetries) {
                        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                        console.log(`Retrying after ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }

                throw new Error(`Phi API request failed: ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data || (!data.response && !data.message)) {
                throw new Error('Invalid response format from Phi API');
            }

            console.log('Phi API response received successfully');
            return data.response || data.message;

        } catch (error) {
            console.error('Request error:', error);
            
            // On last attempt, throw the error
            if (attempt === maxRetries - 1) {
                throw error;
            }
            
            attempt++;
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(`Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error('Maximum retry attempts reached');
}

// Update Monaco Editor initialization
function initializeMonacoEditor() {
    if (monacoLoadingPromise) {
        return monacoLoadingPromise;
    }

    monacoLoadingPromise = new Promise((resolve, reject) => {
        try {
            // ... existing Monaco initialization code ...

            // Add error handling for editor operations
            window.editor.onDidChangeModelContent(() => {
                try {
                    lastEditorContent = window.editor.getValue();
                } catch (error) {
                    console.warn('Error caching editor content:', error);
                }
            });

        } catch (error) {
            console.error('Monaco Editor initialization error:', error);
            reject(error);
        }
    });

    return monacoLoadingPromise;
}

// Phi-3 conversation history
const phi3ConversationHistory = [];
const MAX_PHI3_CONVERSATION_HISTORY = 10;

async function sendMessagePhi3(userMessage, editorContent) {
    try {
        console.log('Preparing request to OpenRouter Phi-3 API...');
        
        // Manage conversation history
        const messagePayload = {
            role: 'user',
            content: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
        };
        
        phi3ConversationHistory.push(messagePayload);
        
        // Truncate conversation history if it exceeds max length
        if (phi3ConversationHistory.length > MAX_PHI3_CONVERSATION_HISTORY) {
            phi3ConversationHistory.shift();
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer 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`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Storm Editor'
        };

        const requestBody = {
            model: 'microsoft/phi-3-medium-128k-instruct:free',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert coding assistant. Help users write, understand, and debug code with clear explanations and best practices.'
                },
                ...phi3ConversationHistory
            ],
            temperature: 0.3,  // More focused responses
            max_tokens: 4000,  // Limit response length
            stream: false  // Non-streaming response
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            throw new Error(`Phi-3 API request failed: ${errorMessage}`);
        }

        const data = JSON.parse(responseText);
        console.log('Parsed response data:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected response format:', data);
            throw new Error('Invalid response format from Phi-3 API');
        }

        const aiResponse = data.choices[0].message.content;
        
        // Add AI response to conversation history
        phi3ConversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });

        return aiResponse;
    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Kimi AI conversation history and configuration
const kimiConversationHistory = [];
const MAX_CONVERSATION_HISTORY = 10;

async function sendMessageKimi(userMessage, editorContent) {
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
        
        // Enhanced error logging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            if (error.stack) {
                console.error('Error stack:', error.stack);
            }
        }
        
        throw error;
    }
}

// Add Qwen message handling function
async function sendMessageQwen(userMessage, editorContent) {
    const key = apiKeys.qwen;
    console.log('Checking Qwen API key...', key ? 'Key exists' : 'No key found');
    
    if (!key) {
        throw new Error('Qwen API key not set. Please add your OpenRouter API key in the settings.');
    }

    try {
        console.log('Preparing request to Qwen API...');
        
        const cleanKey = key.trim().replace(/^Bearer\s+/i, '');
        if (!cleanKey.startsWith('sk-or-')) {
            throw new Error('Invalid OpenRouter API key format. Key should start with "sk-or-"');
        }

        const headers = {
            'Authorization': `Bearer ${cleanKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AI Code Assistant',
            'Content-Type': 'application/json'
        };

        // Support for both text and image content
        const messages = [{
            role: "system",
            content: "You are an expert coding assistant with visual understanding capabilities. Help users write, understand, and debug code with detailed explanations."
        }];

        // Add user message with code context
        messages.push({
            role: "user",
            content: [
                {
                    type: "text",
                    text: `Current code in editor:
\`\`\`
${editorContent}
\`\`\`

User question: ${userMessage}`
                }
            ]
        });

        const requestBody = {
            model: "qwen/qwen2.5-vl-72b-instruct:free",
            messages: messages,
            temperature: 0.3,
            max_tokens: 2000
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || 'Unknown error';
            } catch {
                errorMessage = errorText || response.statusText;
            }
            throw new Error(`Qwen API request failed: ${errorMessage}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('Full error details:', error);
        throw error;
    }
}

// Update model selector to include Kimi, Phi-3, and Paxsenix Claude Sonnet
function updateModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    
    // Add Kimi option if not already added
    if (!Array.from(modelSelector.options).some(option => option.value === 'kimi')) {
        const kimiOption = document.createElement('option');
        kimiOption.value = 'kimi';
        kimiOption.textContent = 'Kimi (Moonshot)';
        modelSelector.appendChild(kimiOption);
    }

    // Add Phi-3 option
    const phi3Option = document.createElement('option');
    phi3Option.value = 'phi3';
    phi3Option.textContent = 'Phi-3 Medium (Microsoft)';
    modelSelector.appendChild(phi3Option);

    // Add Paxsenix Claude Sonnet option
    const paxsenixClaudeOption = document.createElement('option');
    paxsenixClaudeOption.value = 'paxsenixClaude';
    paxsenixClaudeOption.textContent = 'Claude Sonnet (Paxsenix)';
    modelSelector.appendChild(paxsenixClaudeOption);
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', updateModelSelector);

async function sendMessageToAI(message) {
    const selectedModel = modelSelector.value;
    let response;

    try {
        switch (selectedModel) {
            case 'phi':
                response = await sendMessagePhi(message, editor.getValue());
                break;
            case 'qwen':
                response = await sendMessageQwen(message, editor.getValue());
                break;
            case 'gemini':
                response = await sendMessageGemini(message, editor.getValue());
                break;
            case 'deepseek':
                response = await sendMessageDeepSeek(message, editor.getValue());
                break;
            case 'kimi':
                response = await sendMessageKimi(message, editor.getValue());
                break;
            case 'phi3':
                response = await sendMessagePhi3(message, editor.getValue());
                break;
            case 'paxsenixClaude':
                response = await sendMessagePaxsenixClaude(message, editor.getValue());
                break;
            default:
                throw new Error(`Model ${selectedModel} is not yet implemented`);
        }
        return response;
    } catch (error) {
        console.error(`Error with ${selectedModel} API:`, error);
        throw error;
    }
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

function showThinking() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.innerHTML = `
        AI is thinking
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

saveKeyButton.addEventListener('click', saveApiKey);
modelSelector.addEventListener('change', updateApiKeyPlaceholder);

// Load saved API keys on startup
loadApiKeys();

// Flux image generation function
async function generateImageWithFlux(prompt, options = {}) {
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

        // Optional: Download and save images
        const downloadedImages = await Promise.all(
            imageUrls.map(async (url, index) => {
                try {
                    const imageResponse = await fetch(url);
                    const blob = await imageResponse.blob();
                    const fileName = `flux_image_${Date.now()}_${index}.png`;
                    
                    // Save to local filesystem (if supported)
                    if (window.showSaveFilePicker) {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{
                                description: 'PNG Image',
                                accept: {'image/png': ['.png']}
                            }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                    }

                    return URL.createObjectURL(blob);
                } catch (error) {
                    console.error(`Error downloading image ${index}:`, error);
                    return url;  // Fallback to original URL
                }
            })
        );

        return {
            originalUrls: imageUrls,
            localUrls: downloadedImages
        };
    } catch (error) {
        console.error('Flux Image Generation Error:', error);
        throw error;
    }
}

// Add Flux to image generation options
function updateImageGenerationOptions() {
    const imageModelSelector = document.getElementById('image-model-selector');
    if (!imageModelSelector) return;

    const fluxOption = document.createElement('option');
    fluxOption.value = 'paxsenixFlux';
    fluxOption.textContent = 'Flux (Paxsenix)';
    imageModelSelector.appendChild(fluxOption);
}

// Update image generation function to include Flux
async function generateImage(prompt, options = {}) {
    const selectedModel = document.getElementById('image-model-selector').value;

    switch (selectedModel) {
        case 'openai':
            return await generateImageWithOpenAI(prompt, options);
        case 'stability':
            return await generateImageWithStability(prompt, options);
        case 'paxsenixFlux':
            return await generateImageWithFlux(prompt, options);
        default:
            throw new Error(`Image generation model ${selectedModel} not supported`);
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', updateImageGenerationOptions);
