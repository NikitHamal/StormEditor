// Create stylesheet for dynamic styles
const styleSheet = document.createElement('style');
document.head.appendChild(styleSheet);

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
    palm: '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',
    deepseek: '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',
    kimi: 'sk-jsLYee8PWVogUZS2Wb2HYqSa715Wyp1R3p6jTdz9aWWg6sfi',
    phi3: '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',
    paxsenixClaude: 'YOUR_PAXSENIX_API_KEY',
    paxsenixFlux: 'YOUR_PAXSENIX_FLUX_API_KEY'
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

async function sendMessagePaLM(userMessage, editorContent) {
    const apiKey = apiKeys.palm.startsWith('Bearer ') ? apiKeys.palm : `Bearer ${apiKeys.palm}`;
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/palm-2-codechat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert coding assistant specialized in writing and reviewing code. You help users write, understand, and debug code with detailed explanations.'
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
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`PaLM API request failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
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
            'Authorization': `Bearer ${apiKeys.phi3}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Storm Editor'
        };
        console.log('Request headers:', { ...headers, Authorization: '[REDACTED]' });

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

// Phi-3 conversation history
const phi3ConversationHistory = [];
const MAX_PHI3_CONVERSATION_HISTORY = 10;

// Paxsenix Claude Sonnet conversation history
const paxsenixClaudeConversationHistory = [];
const MAX_PAXSENIX_CLAUDE_CONVERSATION_HISTORY = 10;

// Kimi AI conversation history and configuration
const kimiConversationHistory = [];
const MAX_CONVERSATION_HISTORY = 10;

// Update model selector to include Flux Pro
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

    // Add Flux Pro option
    const fluxProOption = document.createElement('option');
    fluxProOption.value = 'paxsenixFluxPro';
    fluxProOption.textContent = 'Flux Pro (Paxsenix)';
    modelSelector.appendChild(fluxProOption);
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', updateModelSelector);

async function sendMessageToAI(message) {
    const selectedModel = modelSelector.value;
    let response;

    switch (selectedModel) {
        case 'gemini':
            response = await sendMessageGemini(message, editor.getValue());
            break;
        case 'palm':
            response = await sendMessagePaLM(message, editor.getValue());
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
        case 'paxsenixFlux':
            response = await generateImageWithFlux(message);
            break;
        case 'paxsenixFluxPro':
            response = await generateImageWithFluxPro(message);
            break;
        default:
            throw new Error(`Model ${selectedModel} is not yet implemented`);
    }

    return response;
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

// Update the chat input initialization with event listeners
function updateChatInput() {
    const chatInputContainer = document.querySelector('.chat-input-container');
    chatInputContainer.innerHTML = `
        <div class="chat-input-wrapper">
            <div class="chat-input-tools">
                <button class="chat-tool-btn web-search-btn" title="Toggle Web Search">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <path d="M11 8a3 3 0 0 1 0 6"/>
                    </svg>
                </button>
            </div>
            <textarea id="chat-input" placeholder="Ask me anything about your code..."></textarea>
            <button id="send-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
            </button>
        </div>
    `;

    // Get references to elements
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const webSearchBtn = document.querySelector('.web-search-btn');

    // Add send button click handler
    sendButton.addEventListener('click', () => {
        sendMessage();
    });

    // Add enter key handler for textarea
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Add web search toggle functionality
    webSearchBtn.addEventListener('click', () => {
        webSearchBtn.classList.toggle('active');
        chatInput.placeholder = webSearchBtn.classList.contains('active') 
            ? 'Ask anything (with web search enabled)...' 
            : 'Ask me anything about your code...';
    });
}

// Update sendMessage function to get chatInput element when needed
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    const imageModelSelector = document.getElementById('image-model-selector');
    const isWebSearchEnabled = document.querySelector('.web-search-btn').classList.contains('active');
    
    if (!message) return;

    // Disable input while processing
    const inputContainer = document.querySelector('.chat-input-container');
    inputContainer.classList.add('disabled');
    chatInput.value = '';

    // Show thinking animation
    const thinkingDiv = showThinking();

    try {
        let response;
        
        if (isWebSearchEnabled) {
            response = await performWebSearch(message);
            appendMessage(message, 'user');
            appendMessage(response, 'ai', true);
        } else if (imageModelSelector && imageModelSelector.value === 'midjourney') {
            response = await generateImageWithMidjourney(message);
            appendMessage(message, 'user');
            appendMessage(response, 'ai', false, true);
        } else if (imageModelSelector && imageModelSelector.value === 'paxsenixFluxPro') {
            response = await generateImageWithFluxPro(message);
            appendMessage(message, 'user');
            appendMessage(response, 'ai', false, true);
        } else {
            response = await sendMessageToAI(message);
            appendMessage(message, 'user');
            appendMessage(response, 'ai');
        }

    } catch (error) {
        appendMessage('Error: ' + error.message, 'system');
    } finally {
        thinkingDiv.remove();
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
            'Authorization': `Bearer ${apiKeys.paxsenixFlux}`,
            'accept': 'application/json'
        };

        // Build query parameters with correct parameter names
        const queryParams = new URLSearchParams({
            text: prompt, // Changed from 'prompt' to 'text'
            style: options.style || 'Surreal Escape' // Added style parameter
        });

        console.log('Flux Image Generation Query Params:', queryParams.toString());

        // Updated to correct endpoint
        const response = await fetch(`https://api.paxsenix.biz.id/ai-image/flux?${queryParams}`, {
            method: 'GET',
            headers
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

        // Check if we got a job ID and task URL
        if (!data.jobId || !data.task_url) {
            throw new Error('No job ID or task URL in response');
        }

        // Poll the task URL until the image is ready
        const taskResult = await pollTaskStatus(data.task_url);
        
        // Create a message with the image
        const imageMessage = `Generated image:\n![Generated Image](${taskResult.imageUrl})`;
        return imageMessage;

    } catch (error) {
        console.error('Flux Image Generation Error:', error);
        throw error;
    }
}

// Update polling function to handle the correct response format
async function pollTaskStatus(taskUrl, maxAttempts = 30, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(taskUrl, {
            headers: {
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Task status check failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Task status response:', data);
        
        // Check if the task is complete and has a URL
        if (data.status === 'done' && data.url) {
            return {
                imageUrl: data.url // Return the URL from the response
            };
        }

        // If not complete, wait before next attempt
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Task timed out waiting for image generation');
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

// Add Flux Pro image generation function
async function generateImageWithFluxPro(prompt, options = {}) {
    try {
        console.log('Preparing request to Paxsenix Flux Pro Image Generation API...');
        
        const headers = {
            'Authorization': `Bearer ${apiKeys.paxsenixFlux}`,
            'accept': 'application/json'
        };

        // Build query parameters with correct parameter names for Flux Pro
        const queryParams = new URLSearchParams({
            text: prompt,
            style: options.style || 'Surreal Escape',
            model: options.model || 'sdxl',  // SDXL is default for Flux Pro
            sampler: options.sampler || 'DPM++ 2M Karras',
            steps: options.steps || '30',
            cfg_scale: options.cfg_scale || '7',
            width: options.width || '1024',
            height: options.height || '1024',
            negative_prompt: options.negative_prompt || 'low quality, blurry'
        });

        console.log('Flux Pro Image Generation Query Params:', queryParams.toString());

        const response = await fetch(`https://api.paxsenix.biz.id/ai-image/fluxPro?${queryParams}`, {
            method: 'GET',
            headers
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

        // Check if we got a job ID and task URL
        if (!data.jobId || !data.task_url) {
            throw new Error('No job ID or task URL in response');
        }

        // Poll the task URL until the image is ready
        const taskResult = await pollTaskStatus(data.task_url);
        
        // Update the message format to include describe button
        const imageMessage = `
<div class="generated-image-container">
    <img src="${taskResult.imageUrl}" alt="Generated Image" class="generated-image">
    <div class="image-actions">
        <button class="image-action-btn download-btn" data-url="${taskResult.imageUrl}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 12l-4-4h2.5V3h3v5H12L8 12z"/>
                <path d="M3 13v1h10v-1H3z"/>
            </svg>
            Download
        </button>
        <button class="image-action-btn share-btn" data-url="${taskResult.imageUrl}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12 3c-1.1 0-2 .9-2 2 0 .2 0 .4.1.5L5.7 8.1C5.4 7.5 4.7 7 4 7c-1.1 0-2 .9-2 2s.9 2 2 2c.7 0 1.4-.5 1.7-1.1l4.4 2.6c-.1.2-.1.4-.1.5 0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2c-.7 0-1.4.5-1.7 1.1L5.9 9.5c.1-.2.1-.4.1-.5s0-.4-.1-.5l4.4-2.6c.3.6 1 1.1 1.7 1.1 1.1 0 2-.9 2-2s-.9-2-2-2z"/>
            </svg>
            Share URL
        </button>
        <button class="image-action-btn describe-btn" data-url="${taskResult.imageUrl}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
                <path d="M7 7h2v5H7V7zm0-3h2v2H7V4z"/>
            </svg>
            Describe
        </button>
    </div>
    <div class="image-description" style="display: none;"></div>
</div>`;

        return imageMessage;

    } catch (error) {
        console.error('Flux Pro Image Generation Error:', error);
        throw error;
    }
}

// Add image description function
async function describeImage(imageUrl) {
    try {
        console.log('Preparing request to Image Description API...');
        
        const headers = {
            'Authorization': `Bearer ${apiKeys.paxsenixFlux}`,
            'accept': 'application/json'
        };

        // Build query parameters
        const queryParams = new URLSearchParams({
            url: imageUrl
        });

        const response = await fetch(`https://api.paxsenix.biz.id/tools/describe?${queryParams}`, {
            method: 'GET',
            headers
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }

        const data = await response.json();
        return data.description || 'No description available.';

    } catch (error) {
        console.error('Image Description Error:', error);
        throw error;
    }
}

// Update event listeners to include describe button
document.addEventListener('click', async (e) => {
    // Handle download button click
    if (e.target.closest('.download-btn')) {
        const url = e.target.closest('.download-btn').dataset.url;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'generated-image.png';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (error) {
            console.error('Download failed:', error);
        }
    }
    
    // Handle share button click
    if (e.target.closest('.share-btn')) {
        const url = e.target.closest('.share-btn').dataset.url;
        try {
            await navigator.clipboard.writeText(url);
            // Show temporary success message
            const btn = e.target.closest('.share-btn');
            const originalContent = btn.innerHTML;
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                </svg>
                Copied!
            `;
            btn.style.backgroundColor = '#238636';
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.backgroundColor = '';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
        }
    }

    // Handle describe button click
    if (e.target.closest('.describe-btn')) {
        const btn = e.target.closest('.describe-btn');
        const url = btn.dataset.url;
        const container = btn.closest('.generated-image-container');
        const descriptionDiv = container.querySelector('.image-description');

        try {
            // Show loading state
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="spinner" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5"></circle>
                </svg>
                Analyzing...
            `;

            const description = await describeImage(url);

            // Show description
            descriptionDiv.innerHTML = `
                <div class="description-content">
                    <h4>Image Description:</h4>
                    <p>${description}</p>
                </div>
            `;
            descriptionDiv.style.display = 'block';

            // Reset button
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
                    <path d="M7 7h2v5H7V7zm0-3h2v2H7V4z"/>
                </svg>
                Describe
            `;
            btn.disabled = false;

        } catch (error) {
            console.error('Failed to get image description:', error);
            descriptionDiv.innerHTML = `<div class="description-error">Failed to analyze image: ${error.message}</div>`;
            descriptionDiv.style.display = 'block';
        }
    }
});

// Add additional styles
const additionalStyles = `
.describe-btn {
    background: #0078d4;
}

.describe-btn:hover {
    background: #006cbd;
}

.spinner {
    animation: spin 1s linear infinite;
    width: 16px;
    height: 16px;
}

@keyframes spin {
    100% { transform: rotate(360deg); }
}

.image-description {
    padding: 1rem;
    background: #1e1e1e;
    border-top: 1px solid #333;
}

.description-content {
    color: #e6edf3;
}

.description-content h4 {
    margin-bottom: 0.5rem;
    color: #58a6ff;
}

.description-error {
    color: #f85149;
    padding: 0.5rem;
    border-left: 3px solid #f85149;
}

.describe-btn:disabled {
    opacity: 0.7;
    cursor: wait;
}
`;

// Update the styles
styleSheet.textContent += additionalStyles;

// Update the model selector container styling and structure
function updateModelSelectors() {
    const modelSelectorContainer = document.querySelector('.model-selector-container');
    modelSelectorContainer.innerHTML = `
        <div class="model-type-tabs">
            <button class="model-tab active" data-type="${MODEL_TYPES.TEXT}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Text
            </button>
            <button class="model-tab" data-type="${MODEL_TYPES.IMAGE}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                Image
            </button>
        </div>
        
        <div class="model-content">
            <div class="text-models active">
                <div class="model-select-wrapper">
                    <select id="model-selector" class="model-dropdown">
                        <option value="gemini">Gemini 2.0 Flash</option>
                        <option value="palm">PaLM 2 Codechat</option>
                        <option value="deepseek">DeepSeek R1 Distill</option>
                    </select>
                    <svg class="select-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
            </div>
            
            <div class="image-models">
                <div class="model-select-wrapper">
                    <select id="image-model-selector" class="model-dropdown">
                        <option value="paxsenixFluxPro">Flux Pro (SDXL)</option>
                        <option value="midjourney">Midjourney AI</option>
                        <option value="imageDescribe">Image Description</option>
                    </select>
                    <svg class="select-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
                
                <div class="image-upload-area">
                    <input type="file" id="image-upload" accept="image/*">
                    <label for="image-upload" class="upload-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span>Drop image here or click to upload</span>
                    </label>
                    <div id="selected-file-info" class="file-info"></div>
                </div>
            </div>
        </div>

        <div class="api-key-section">
            <div class="api-key-input-wrapper">
                <input type="password" id="api-key-input" placeholder="Enter API Key">
                <button id="save-key" class="save-key-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save Key
                </button>
            </div>
        </div>
    `;
}

// Add new styles for the updated model selector
const modelSelectorStyles = `
.model-selector-container {
    background: #2d2d2d;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.model-type-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem;
    background: #252525;
    border-radius: 8px;
}

.model-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #888;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.model-tab svg {
    width: 1.2rem;
    height: 1.2rem;
}

.model-tab.active {
    background: #3a3a3a;
    color: #fff;
}

.model-content > div {
    display: none;
}

.model-content > div.active {
    display: block;
}

.model-select-wrapper {
    position: relative;
    margin-bottom: 1rem;
}

.model-dropdown {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 2.5rem;
    background: #363636;
    border: 1px solid #404040;
    border-radius: 8px;
    color: #fff;
    font-size: 0.95rem;
    appearance: none;
    cursor: pointer;
    transition: border-color 0.2s ease;
}

.model-dropdown:hover {
    border-color: #4a4a4a;
}

.model-dropdown:focus {
    outline: none;
    border-color: #0078d4;
}

.select-arrow {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    pointer-events: none;
    stroke-width: 2;
}

.image-upload-area {
    border: 2px dashed #404040;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    transition: all 0.2s ease;
}

.image-upload-area:hover {
    border-color: #0078d4;
    background: rgba(0, 120, 212, 0.1);
}

.upload-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
}

.upload-label svg {
    width: 2rem;
    height: 2rem;
    stroke: #888;
}

.upload-label span {
    color: #888;
    font-size: 0.95rem;
}

#image-upload {
    display: none;
}

.file-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #363636;
    border-radius: 6px;
    font-size: 0.9rem;
    display: none;
}

.file-info.active {
    display: block;
}

.api-key-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #404040;
}

.api-key-input-wrapper {
    display: flex;
    gap: 0.5rem;
}

#api-key-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: #363636;
    border: 1px solid #404040;
    border-radius: 8px;
    color: #fff;
    font-size: 0.95rem;
    transition: border-color 0.2s ease;
}

#api-key-input:focus {
    outline: none;
    border-color: #0078d4;
}

.save-key-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #0078d4;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.save-key-btn:hover {
    background: #006cbd;
}

.save-key-btn svg {
    width: 1.2rem;
    height: 1.2rem;
}
`;

// Add the new styles
styleSheet.textContent += modelSelectorStyles;

// Add styles for web search
const webSearchStyles = `
.chat-input-wrapper {
    position: relative;
    display: flex;
    gap: 0.5rem;
}

.chat-input-tools {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0;
}

.chat-tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #363636;
    border: 1px solid #404040;
    border-radius: 6px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
}

.chat-tool-btn:hover {
    background: #404040;
    color: #fff;
}

.chat-tool-btn.active {
    background: #0078d4;
    border-color: #0078d4;
    color: #fff;
}

.chat-tool-btn svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
}

#chat-input {
    flex: 1;
    min-height: 40px;
    max-height: 200px;
    padding: 0.75rem;
    background: #363636;
    border: 1px solid #404040;
    border-radius: 8px;
    color: #fff;
    font-size: 0.95rem;
    resize: vertical;
    transition: border-color 0.2s ease;
}

#chat-input:focus {
    outline: none;
    border-color: #0078d4;
}

#send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: #0078d4;
    border: none;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

#send-button:hover {
    background: #006cbd;
}

#send-button svg {
    width: 18px;
    height: 18px;
    stroke-width: 2;
}

.web-search-result {
    border-left: 3px solid #0078d4;
    background: rgba(0, 120, 212, 0.1);
}
`;

// Add the web search styles
styleSheet.textContent += webSearchStyles;

// Initialize chat input when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateChatInput();
});

// Update performWebSearch function with correct endpoint and response handling
async function performWebSearch(query) {
    try {
        const headers = {
            'Authorization': `Bearer ${apiKeys.paxsenixFlux}`,
            'accept': 'application/json'
        };

        const queryParams = new URLSearchParams({
            text: query,
            system: 'system' // Optional system parameter
        });

        // Updated endpoint from /tools/searchgpt to /ai/searchgpt
        const response = await fetch(`https://api.paxsenix.biz.id/ai/searchgpt?${queryParams}`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Search API Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Web search failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Search API Response:', data);

        if (!data.ok) {
            throw new Error(data.message || 'Search failed');
        }

        return data.message;

    } catch (error) {
        console.error('Web search error:', error);
        throw error;
    }
}

// Add Midjourney to image model options
function updateModelSelectors() {
    // ... existing code ...

    // Update image model selector options
    const imageModelSelector = document.getElementById('image-model-selector');
    imageModelSelector.innerHTML = `
        <option value="paxsenixFluxPro">Flux Pro (SDXL)</option>
        <option value="midjourney">Midjourney AI</option>
        <option value="imageDescribe">Image Description</option>
    `;
}

// Add Midjourney image generation function
async function generateImageWithMidjourney(prompt) {
    try {
        console.log('Preparing request to Midjourney Image Generation API...');
        
        const headers = {
            'Authorization': `Bearer ${apiKeys.paxsenixFlux}`,
            'accept': 'application/json'
        };

        const queryParams = new URLSearchParams({
            text: prompt
        });

        const response = await fetch(`https://api.paxsenix.biz.id/ai-image/midjourney?${queryParams}`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Midjourney API Response:', data);

        if (!data.ok || !data.jobId || !data.task_url) {
            throw new Error('Invalid response from Midjourney API');
        }

        // Poll for task completion
        const taskResult = await pollTaskStatus(data.task_url);
        
        // Create message with the image
        const imageMessage = `
<div class="generated-image-container">
    <img src="${taskResult.url}" alt="Generated Image" class="generated-image">
    <div class="image-info">
        <span class="image-model">Generated by Midjourney AI</span>
        <span class="image-prompt">${prompt}</span>
    </div>
    <div class="image-actions">
        <button class="image-action-btn download-btn" data-url="${taskResult.url}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
        </button>
        <button class="image-action-btn share-btn" data-url="${taskResult.url}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share URL
        </button>
        <button class="image-action-btn describe-btn" data-url="${taskResult.url}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <path d="M11 8a3 3 0 0 1 0 6"/>
            </svg>
            Describe
        </button>
    </div>
</div>`;

        return imageMessage;

    } catch (error) {
        console.error('Midjourney Image Generation Error:', error);
        throw error;
    }
}

// Add styles for Midjourney-specific elements
const midjourneyStyles = `
.image-info {
    padding: 0.75rem;
    background: #252526;
    border-bottom: 1px solid #333;
}

.image-model {
    display: block;
    color: #0078d4;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
}

.image-prompt {
    display: block;
    color: #8b949e;
    font-size: 0.85rem;
    font-style: italic;
}

.generated-image {
    max-width: 100%;
    height: auto;
    display: block;
}

.image-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #252526;
    border-top: 1px solid #333;
}
`;

// Add the Midjourney styles
styleSheet.textContent += midjourneyStyles;
