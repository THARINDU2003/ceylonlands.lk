// AI Chatbot Logic
function toggleChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    // If it's hidden, remove hidden and add flex text-sm
    if (chatWindow.classList.contains('hidden')) {
        chatWindow.classList.remove('hidden');
        chatWindow.classList.add('flex');
    } else {
        chatWindow.classList.add('hidden');
        chatWindow.classList.remove('flex');
    }
}

async function sendAIMessage() {
    const inputField = document.getElementById('ai-chat-input');
    const message = inputField.value.trim();
    if (!message) return;

    // Clear input
    inputField.value = '';
    
    const messagesContainer = document.getElementById('ai-chat-messages');

    // Add User Message
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'bg-blue-600 text-white p-3 rounded-lg rounded-tr-none self-end max-w-[85%] shadow-sm whitespace-pre-wrap word-break';
    userMsgDiv.textContent = message;
    messagesContainer.appendChild(userMsgDiv);
    
    // Add Thinking... Message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'bg-gray-200 text-gray-600 p-3 rounded-lg rounded-tl-none self-start shadow-sm flex items-center gap-2 text-sm';
    loadingDiv.innerHTML = '<span class="animate-pulse font-medium">Terra is typing...</span>';
    messagesContainer.appendChild(loadingDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch(((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api') + '/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        // Remove loading state
        messagesContainer.removeChild(loadingDiv);

        if (!response.ok) {
            throw new Error(data.error || 'Failed to communicate with AI');
        }

        // Add AI Message
        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.className = 'bg-blue-100 text-blue-900 p-3 rounded-lg rounded-tl-none self-start max-w-[85%] shadow-sm';
        // Parse basic markdown text replacing **bold** and \n 
        aiMsgDiv.innerHTML = data.reply.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
        messagesContainer.appendChild(aiMsgDiv);

    } catch (err) {
        messagesContainer.removeChild(loadingDiv);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 text-red-700 p-2 rounded-lg self-center text-xs mt-2';
        errorDiv.textContent = 'Oops! ' + err.message;
        messagesContainer.appendChild(errorDiv);
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
