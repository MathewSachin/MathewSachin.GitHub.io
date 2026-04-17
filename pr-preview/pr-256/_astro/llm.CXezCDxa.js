import { pipeline, TextStreamer, env } from '@huggingface/transformers';

env.allowLocalModels = false;

// -- Constants ----------------------------------------------------------------
const PLACEHOLDER_HTML =
  '<p class="text-muted text-center small mt-5" id="chat-placeholder">' +
  '<i class="fas fa-robot me-1"></i>Model loaded \u2014 say something!</p>';

// -- State --------------------------------------------------------------------
let generator = null;
let generating = false;
let conversationHistory = []; // array of {role, content}
let modelDevice = '';

// -- DOM refs -----------------------------------------------------------------
const modelSelect = document.getElementById('model-select');
const loadBtn = document.getElementById('load-btn');
const loadProgress = document.getElementById('load-progress');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const chatSection = document.getElementById('chat-section');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const statusMsg = document.getElementById('status-msg');

// -- Helpers ------------------------------------------------------------------
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showStatus(html, type) {
  statusMsg.innerHTML = '<div class="alert alert-' + (type || 'info') + ' py-2 mb-0">' + html + '</div>';
  statusMsg.classList.remove('d-none');
}

function hideStatus() {
  statusMsg.classList.add('d-none');
}

function scrollChat() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function resetChatHistory() {
  conversationHistory = [];
  chatHistory.innerHTML = PLACEHOLDER_HTML;
}

/**
 * Append a message bubble and return the inner element so it can be updated
 * during streaming.
 */
function appendBubble(role, text, streaming) {
  const placeholder = document.getElementById('chat-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  const isUser = role === 'user';
  const wrapper = document.createElement('div');
  wrapper.className = 'd-flex mb-3 ' + (isUser ? 'justify-content-end' : 'justify-content-start');

  const bubble = document.createElement('div');
  bubble.className = 'px-3 py-2 ' + (isUser ? 'chat-bubble-user' : 'chat-bubble-assistant');
  bubble.style.cssText = 'max-width:80%;white-space:pre-wrap;word-break:break-word;font-size:.95rem;';
  bubble.innerHTML = escapeHtml(text) + (streaming ? '<span class="typing-cursor">\u258d</span>' : '');

  wrapper.appendChild(bubble);
  chatHistory.appendChild(wrapper);
  scrollChat();
  return bubble;
}

/**
 * Creates a pipeline instance using WebGPU when available and falls back to
 * WASM when WebGPU is unavailable or initialization fails.
 * @param {string} task
 * @param {string} modelId
 * @param {Record<string, unknown>} options
 * @returns {Promise<{generator: Function, device: 'webgpu' | 'wasm'}>}
 */
async function createGenerator(task, modelId, options) {
  const canUseWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

  if (canUseWebGPU) {
    try {
      return {
        generator: await pipeline(task, modelId, { ...options, device: 'webgpu' }),
        device: 'webgpu',
      };
    } catch (error) {
      console.warn('Falling back to WASM backend after WebGPU initialization failed.', error);
    }
  }

  return {
    generator: await pipeline(task, modelId, { ...options, device: 'wasm' }),
    device: 'wasm',
  };
}

// -- Model loading ------------------------------------------------------------
loadBtn.addEventListener('click', async function () {
  const selectedModel = modelSelect.selectedOptions[0];
  const modelId = selectedModel.value;
  const modelTask = selectedModel.dataset.task || 'text-generation';
  loadBtn.disabled = true;
  loadProgress.classList.remove('d-none');
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Connecting\u2026';
  hideStatus();

  // Track overall download progress per file
  const fileProgress = {};

  try {
    const model = await createGenerator(modelTask, modelId, {
      progress_callback: function (p) {
        if (p.status === 'initiate') {
          fileProgress[p.file] = 0;
        } else if (p.status === 'progress') {
          fileProgress[p.file] = p.progress || 0;
          const files = Object.values(fileProgress);
          const overall = files.length ? files.reduce((a, b) => a + b, 0) / files.length : 0;
          progressBar.style.width = overall.toFixed(1) + '%';
          progressBar.setAttribute('aria-valuenow', overall.toFixed(1));
          progressLabel.textContent = (p.name || p.file || 'Downloading') + ' \u2013 ' + overall.toFixed(1) + '%';
        } else if (p.status === 'done') {
          fileProgress[p.file] = 100;
        } else if (p.status === 'ready') {
          progressBar.style.width = '100%';
          progressLabel.textContent = 'Model ready!';
        }
      },
    });

    generator = model.generator;
    modelDevice = model.device;
    loadProgress.classList.add('d-none');
    chatSection.classList.remove('d-none');

    // Update load button
    loadBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Reload Model';
    loadBtn.disabled = false;

    // Reset conversation when switching model
    resetChatHistory();

    const backendLabel = modelDevice === 'webgpu' ? 'WebGPU' : 'WebAssembly';
    showStatus(
      '<i class="fas fa-check-circle me-2 text-success"></i>Model loaded successfully on <strong>' +
        backendLabel +
        '</strong>. Start chatting below.',
      'success',
    );
    setTimeout(hideStatus, 3500);
  } catch (err) {
    loadBtn.disabled = false;
    loadProgress.classList.add('d-none');
    showStatus('<i class="fas fa-exclamation-triangle me-2"></i>Failed to load model: ' + escapeHtml(err.message), 'danger');
  }
});

// -- Sending messages ---------------------------------------------------------
sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearBtn.addEventListener('click', resetChatHistory);

async function sendMessage() {
  if (!generator || generating) return;

  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  generating = true;
  sendBtn.disabled = true;

  // Show user bubble
  conversationHistory.push({ role: 'user', content: text });
  appendBubble('user', text, false);

  // Placeholder for the assistant reply (streaming)
  const assistantBubble = appendBubble('assistant', '', true);
  let assistantText = '';

  try {
    // Keep model abstraction in place for future multi-model setups.
    const isChatModel = modelSelect.selectedOptions[0].dataset.chat === 'true';

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: function (token) {
        assistantText += token;
        assistantBubble.innerHTML = escapeHtml(assistantText) + '<span class="typing-cursor">\u258d</span>';
        scrollChat();
      },
    });

    if (isChatModel) {
      // Pass full conversation with system prompt so the model stays on-topic
      const messages = [{ role: 'system', content: 'You are a helpful assistant.' }, ...conversationHistory];

      await generator(messages, {
        max_new_tokens: 512,
        do_sample: true,
        temperature: 0.7,
        repetition_penalty: 1.1,
        streamer: streamer,
      });
    } else {
      // Plain text-completion model path retained for future multi-model support.
      await generator(text, {
        max_new_tokens: 200,
        do_sample: true,
        temperature: 0.9,
        repetition_penalty: 1.2,
        streamer: streamer,
      });
    }

    // Finalise bubble (remove cursor)
    assistantBubble.innerHTML = escapeHtml(assistantText);
    conversationHistory.push({ role: 'assistant', content: assistantText });
  } catch (err) {
    assistantBubble.innerHTML =
      '<span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>' + escapeHtml(err.message) + '</span>';
  }

  generating = false;
  sendBtn.disabled = false;
  chatInput.focus();
}
