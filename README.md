# Storm Editor - AI-Powered Code Editor

A modern, AI-powered code editor built with Monaco Editor and Gemini 1.5 Pro. Features a sleek UI similar to Windsurf and Cursor, with context-aware AI assistance.

## Features

- Monaco Editor integration for powerful code editing
- Context-aware AI assistance powered by Gemini 1.5 Pro and other models thanks to Alex for providing the Paxsenix API.
- Modern, responsive UI with split-pane layout
- Real-time AI code suggestions and explanations
- Dark theme optimized for long coding sessions

## Setup

1. Clone this repository
2. Get a Gemini API key from Google AI Studio
3. Add your API key to `app.js` (look for `GEMINI_API_KEY` constant)
4. Serve the files using a local server (e.g., Live Server in VS Code)

## Usage

- Left pane: Full-featured code editor
- Right pane: AI chat interface
- The AI assistant has context awareness of your code
- Type your questions in the chat input and press Enter or click Send

## Requirements

- Modern web browser
- Internet connection (for Monaco Editor CDN and Gemini API)
- Gemini API key

## Security Note

Make sure to never commit your API key to version control. In a production environment, you should handle the API key securely through environment variables or a backend service.
