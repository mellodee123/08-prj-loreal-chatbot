/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const chatWindowFrame = document.querySelector(".chat-window-frame");
const latestQuestion = document.getElementById("latestQuestion");

// Conversation history - tracks all messages for context
let conversationHistory = [];
let userName = null; // Will store user's name if provided
let currentQuestion = null; // Stores the latest user question
let pendingRequests = 0;

// System prompt for L'Oréal Product Advisor
const SYSTEM_PROMPT = `You are the L'Oréal Smart Product Advisor, a beauty consultant specializing exclusively in L'Oréal products and skincare routines.

CORE INSTRUCTIONS:
✅ ONLY answer questions about L'Oréal products, routines, and beauty recommendations
✅ Provide personalized skincare advice based on skin type and concerns
✅ Recommend specific L'Oréal products and product combinations
✅ Be friendly, expert, and helpful
✅ Remember context from previous messages in this conversation
✅ Use user's name if they provided it to personalize responses

❌ DO NOT answer about:
- Non-L'Oréal products or competing brands
- Medical conditions or dermatological diagnoses
- Topics unrelated to beauty and skincare
- Store locations or inventory details

RESPONSE STYLE:
- Keep responses concise (2-3 sentences per idea)
- Use clear line breaks between thoughts
- Include specific L'Oréal product names
- Be warm and conversational
- Ask clarifying questions when needed
- Reference previous messages to show you're listening

DEFLECTION EXAMPLE:
If asked "What's your favorite movie?" respond with:
"I'm specifically here to help with L'Oréal products and beauty! 
Is there anything about skincare, hair care, or makeup I can help you discover?"

Remember: You ONLY discuss L'Oréal products and beauty routines. 
Politely redirect any off-topic questions back to L'Oréal beauty advice.`;

// Initialize chat with welcome message
document.addEventListener("DOMContentLoaded", function () {
  resetChat();
});

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user message
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Extract user's name if they introduce themselves
  extractUserName(userMessage);

  // Display latest question above chat
  displayLatestQuestion(userMessage);

  // Display user message immediately
  addMessage(userMessage, "user");
  userInput.value = "";

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Show loading state
  pendingRequests++;
  chatWindowFrame.classList.add("is-loading");
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "msg ai";
  loadingMsg.textContent = "⏳ Thinking...";
  chatWindow.appendChild(loadingMsg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Build messages array with system prompt + full conversation history
    const messagesForAPI = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...conversationHistory,
    ];

    // Call the Cloudflare Worker proxy
    const response = await fetch(
      "https://lorealchatbox.mellodee321.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForAPI,
        }),
      },
    );

    const data = await response.json();

    // Remove loading message
    loadingMsg.remove();

    // Extract AI response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content;
      addMessage(aiResponse, "ai");

      // Add AI response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });
    } else if (data.error) {
      addMessage(
        `Error: ${data.error.message || "Unable to get response"}`,
        "ai",
      );
    } else {
      addMessage(
        "Sorry, I couldn't process that request. Please try again.",
        "ai",
      );
    }
  } catch (error) {
    // Show error message
    console.error("API Error:", error);
    addMessage(
      "Sorry, I'm having trouble connecting. Please check that the Cloudflare Worker URL is configured correctly in script.js and try again.",
      "ai",
    );
  } finally {
    // Keep the glow visible until every pending response has finished.
    loadingMsg.remove();
    pendingRequests--;
    if (pendingRequests === 0) chatWindowFrame.classList.remove("is-loading");
  }

  // Auto-scroll to latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

/* Helper function to add messages to chat */
function addMessage(text, sender) {
  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${sender}`;

  // Add text content
  messageDiv.textContent = text;

  // Append to chat window
  chatWindow.appendChild(messageDiv);

  // Auto-scroll to latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Helper function to extract user's name from messages */
function extractUserName(message) {
  // Look for patterns like "I'm [name]" or "My name is [name]"
  const namePatterns = [
    /i[\'m\s]+([a-zA-Z]+)/i,
    /my name is ([a-zA-Z]+)/i,
    /call me ([a-zA-Z]+)/i,
    /i[\'m\s]+([a-zA-Z]+),/i,
  ];

  for (let pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const extractedName =
        match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      // Only update if we don't already have a name
      if (!userName) {
        userName = extractedName;
        console.log(`Detected user name: ${userName}`);
      }
      break;
    }
  }
}

/* Clear conversation history and reset chat */
function resetChat() {
  conversationHistory = [];
  userName = null;
  currentQuestion = null;
  latestQuestion.textContent = "";
  latestQuestion.classList.remove("active");
  chatWindow.innerHTML = "";
  addMessage(
    "👋 Hello! I'm your L'Oréal Smart Product Advisor. Ask me about skincare, hair care, or makeup products tailored to your needs!",
    "ai",
  );
}

/* Display the latest user question above the chat */
function displayLatestQuestion(question) {
  currentQuestion = question;
  latestQuestion.textContent = question;
  latestQuestion.classList.add("active");

  // Scroll to show the question
  latestQuestion.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
