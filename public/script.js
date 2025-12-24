// ===== KONFIGURASI APLIKASI =====
const CONFIG = {
  maxPhotos: 5,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxMessageLength: 1000,
  apiEndpoints: {
    send: '/api/send',
    stats: '/api/stats'
  },
  sounds: {
    click: 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
    success: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
    error: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'
  },
  emojis: ['😊', '😂', '🥰', '😍', '🤔', '😎', '👍', '❤️', '🎉', '🔥', '✨', '🌟', '💫', '⭐', '💖', '💯', '👏', '🙏', '🤗', '😇', '🥳', '😘', '😉', '🤩', '😜']
};

// ===== STATE APLIKASI =====
let state = {
  currentStep: 1,
  files: [],
  isSending: false,
  stats: {
    totalMessages: 0,
    totalPhotos: 0,
    todayMessages: 0,
    recentActivity: []
  },
  theme: localStorage.getItem('theme') || 'dark'
};

// ===== DOM ELEMENTS =====
const elements = {
  // Steps
  steps: document.querySelectorAll('.form-step'),
  stepIndicators: document.querySelectorAll('.step'),
  
  // Form inputs
  username: document.getElementById('username'),
  message: document.getElementById('message'),
  charCount: document.getElementById('charCount'),
  photoInput: document.getElementById('photoInput'),
  
  // Buttons
  sendBtn: document.getElementById('sendBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  themeToggle: document.getElementById('themeToggle'),
  
  // UI Components
  uploadArea: document.getElementById('uploadArea'),
  previewContainer: document.getElementById('previewContainer'),
  previewGrid: document.getElementById('previewGrid'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  successModal: document.getElementById('successModal'),
  toastContainer: document.getElementById('toastContainer'),
  emojiPicker: document.getElementById('emojiPicker'),
  
  // Review elements
  reviewName: document.getElementById('reviewName'),
  reviewMessage: document.getElementById('reviewMessage'),
  reviewPhotos: document.getElementById('reviewPhotos'),
  
  // Stats elements
  totalMessages: document.getElementById('totalMessages'),
  totalPhotos: document.getElementById('totalPhotos'),
  todayMessages: document.getElementById('todayMessages'),
  activityList: document.getElementById('activityList'),
  
  // Progress
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  loadingMessage: document.getElementById('loadingMessage'),
  
  // Sounds
  soundClick: document.getElementById('soundClick'),
  soundSuccess: document.getElementById('soundSuccess'),
  soundError: document.getElementById('soundError')
};

// ===== INISIALISASI APLIKASI =====
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Set tema
  setTheme(state.theme);
  
  // Setup event listeners
  setupEventListeners();
  
  // Load statistik awal
  loadStats();
  
  // Setup emoji picker
  setupEmojiPicker();
  
  // Fokus ke input nama
  elements.username.focus();
  
  // Tampilkan notifikasi selamat datang
  showToast('Selamat datang di To-Kizhoo!', 'info');
}

function setupEventListeners() {
  // Input events
  elements.username.addEventListener('input', validateUsername);
  elements.message.addEventListener('input', updateCharCount);
  
  // Upload area events
  elements.uploadArea.addEventListener('click', () => elements.photoInput.click());
  elements.uploadArea.addEventListener('dragover', handleDragOver);
  elements.uploadArea.addEventListener('dragleave', handleDragLeave);
  elements.uploadArea.addEventListener('drop', handleDrop);
  
  // File input events
  elements.photoInput.addEventListener('change', handleFileSelect);
  
  // Button events
  elements.clearAllBtn.addEventListener('click', clearAllFiles);
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Form submission
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.currentStep === 4 && !state.isSending) {
      sendMessage();
    }
  });
}

function setTheme(theme) {
  state.theme = theme;
  document.body.classList.toggle('light', theme === 'light');
  localStorage.setItem('theme', theme);
  
  // Update toggle button state
  const moonIcon = elements.themeToggle.querySelector('.fa-moon');
  const sunIcon = elements.themeToggle.querySelector('.fa-sun');
  
  if (theme === 'dark') {
    moonIcon.style.opacity = '1';
    moonIcon.style.transform = 'scale(1)';
    sunIcon.style.opacity = '0';
    sunIcon.style.transform = 'scale(0)';
  } else {
    moonIcon.style.opacity = '0';
    moonIcon.style.transform = 'scale(0)';
    sunIcon.style.opacity = '1';
    sunIcon.style.transform = 'scale(1)';
  }
}

function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  playSound('click');
}

// ===== NAVIGASI FORM STEP =====
function nextStep(step) {
  if (validateStep(state.currentStep)) {
    changeStep(step);
    playSound('click');
  }
}

function prevStep(step) {
  changeStep(step);
  playSound('click');
}

function changeStep(step) {
  // Validasi step
  if (step < 1 || step > 4) return;
  
  // Update state
  state.currentStep = step;
  
  // Update step indicators
  elements.stepIndicators.forEach((indicator, index) => {
    if (index + 1 <= step) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });
  
  // Show/hide steps
  elements.steps.forEach((stepElement, index) => {
    if (index + 1 === step) {
      stepElement.classList.add('active');
    } else {
      stepElement.classList.remove('active');
    }
  });
  
  // Update review jika di step 4
  if (step === 4) {
    updateReview();
  }
  
  // Scroll ke atas
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
  switch (step) {
    case 1:
      return validateUsername();
    case 2:
      return validateMessage();
    case 3:
      return true; // Foto opsional
    default:
      return true;
  }
}

// ===== VALIDASI INPUT =====
function validateUsername() {
  const username = elements.username.value.trim();
  const isValid = username.length >= 2 && username.length <= 50;
  
  if (isValid) {
    elements.username.style.borderColor = '';
  } else {
    elements.username.style.borderColor = '#ef4444';
  }
  
  return isValid;
}

function validateMessage() {
  const message = elements.message.value.trim();
  const isValid = message.length >= 5 && message.length <= CONFIG.maxMessageLength;
  
  if (isValid) {
    elements.message.style.borderColor = '';
  } else {
    elements.message.style.borderColor = '#ef4444';
  }
  
  return isValid;
}

function updateCharCount() {
  const count = elements.message.value.length;
  elements.charCount.textContent = count;
  
  if (count > CONFIG.maxMessageLength * 0.9) {
    elements.charCount.style.color = '#ef4444';
  } else if (count > CONFIG.maxMessageLength * 0.75) {
    elements.charCount.style.color = '#f59e0b';
  } else {
    elements.charCount.style.color = '';
  }
}

// ===== HANDLING FILE UPLOAD =====
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.uploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFiles(files);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFiles(files);
  }
}

function handleFiles(fileList) {
  const newFiles = Array.from(fileList).filter(file => {
    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      showToast(`File ${file.name} bukan gambar`, 'error');
      return false;
    }
    
    // Validasi ukuran file
    if (file.size > CONFIG.maxFileSize) {
      showToast(`File ${file.name} terlalu besar (max 5MB)`, 'error');
      return false;
    }
    
    return true;
  });
  
  // Cek batas maksimal file
  const availableSlots = CONFIG.maxPhotos - state.files.length;
  if (newFiles.length > availableSlots) {
    showToast(`Maksimal ${CONFIG.maxPhotos} foto yang dapat diunggah`, 'warning');
    newFiles.length = availableSlots;
  }
  
  // Tambahkan file ke state
  state.files.push(...newFiles);
  
  // Update preview
  updatePreview();
  
  // Update UI
  if (state.files.length > 0) {
    elements.previewContainer.classList.add('show');
  }
  
  // Update input file
  const dataTransfer = new DataTransfer();
  state.files.forEach(file => dataTransfer.items.add(file));
  elements.photoInput.files = dataTransfer.files;
  
  // Tampilkan notifikasi
  if (newFiles.length > 0) {
    showToast(`Berhasil menambahkan ${newFiles.length} foto`, 'success');
  }
}

function updatePreview() {
  elements.previewGrid.innerHTML = '';
  
  state.files.forEach((file, index) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = `Preview ${index + 1}`;
      img.loading = 'lazy';
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.title = 'Hapus foto';
      removeBtn.addEventListener('click', () => removeFile(index));
      
      previewItem.appendChild(img);
      previewItem.appendChild(removeBtn);
      elements.previewGrid.appendChild(previewItem);
    };
    
    reader.readAsDataURL(file);
  });
}

function removeFile(index) {
  state.files.splice(index, 1);
  
  // Update preview
  updatePreview();
  
  // Update input file
  const dataTransfer = new DataTransfer();
  state.files.forEach(file => dataTransfer.items.add(file));
  elements.photoInput.files = dataTransfer.files;
  
  // Hide preview jika tidak ada file
  if (state.files.length === 0) {
    elements.previewContainer.classList.remove('show');
  }
  
  playSound('click');
}

function clearAllFiles() {
  state.files = [];
  elements.photoInput.value = '';
  elements.previewContainer.classList.remove('show');
  elements.previewGrid.innerHTML = '';
  playSound('click');
}

// ===== UPDATE REVIEW =====
function updateReview() {
  elements.reviewName.textContent = elements.username.value.trim() || '-';
  elements.reviewMessage.textContent = elements.message.value.trim() || '-';
  elements.reviewPhotos.textContent = state.files.length > 0 ? `${state.files.length} foto` : 'Tidak ada foto';
}

// ===== KIRIM PESAN =====
async function sendMessage() {
  if (state.isSending) return;
  
  // Validasi akhir
  if (!validateUsername() || !validateMessage()) {
    showToast('Harap periksa kembali data Anda', 'error');
    return;
  }
  
  // Konfirmasi pengiriman
  if (!confirm('Kirim pesan ini ke Kizhoo?')) {
    return;
  }
  
  // Set state sending
  state.isSending = true;
  elements.sendBtn.disabled = true;
  elements.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
  
  // Tampilkan loading
  showLoading();
  updateProgress(0, 'Mempersiapkan pengiriman...');
  
  try {
    // Step 1: Siapkan data
    updateProgress(25, 'Menyiapkan data...');
    await sleep(500);
    
    const username = elements.username.value.trim();
    const message = elements.message.value.trim();
    
    // Step 2: Konversi file ke base64
    updateProgress(50, 'Mengonversi foto...');
    const photos = [];
    
    for (const file of state.files) {
      const base64 = await fileToBase64(file);
      photos.push(base64);
    }
    
    // Step 3: Kirim ke server
    updateProgress(75, 'Mengirim ke server...');
    const response = await fetch(CONFIG.apiEndpoints.send, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        message,
        photos
      })
    });
    
    // Step 4: Handle response
    updateProgress(100, 'Menyelesaikan...');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Gagal mengirim pesan');
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Berhasil
      hideLoading();
      showSuccessModal();
      playSound('success');
      
      // Reset form
      resetForm();
      
      // Update statistik
      loadStats();
      
    } else {
      throw new Error(result.error || 'Gagal mengirim pesan');
    }
    
  } catch (error) {
    // Error handling
    hideLoading();
    showToast(error.message, 'error');
    playSound('error');
    console.error('Send error:', error);
    
  } finally {
    // Reset state
    state.isSending = false;
    elements.sendBtn.disabled = false;
    elements.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Sekarang';
  }
}

// ===== LOADING & PROGRESS =====
function showLoading() {
  elements.loadingOverlay.classList.add('show');
  updateLoadingSteps(0);
}

function hideLoading() {
  elements.loadingOverlay.classList.remove('show');
}

function updateProgress(percentage, message = '') {
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressText.textContent = `${Math.round(percentage)}%`;
  
  if (message) {
    elements.loadingMessage.textContent = message;
  }
  
  // Update loading steps
  const stepIndex = Math.floor(percentage / 25);
  updateLoadingSteps(stepIndex);
}

function updateLoadingSteps(activeIndex) {
  const steps = document.querySelectorAll('.loading-steps .step');
  steps.forEach((step, index) => {
    if (index <= activeIndex) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}

// ===== MODAL & TOAST =====
function showSuccessModal() {
  elements.successModal.classList.add('show');
}

function closeModal() {
  elements.successModal.classList.remove('show');
  playSound('click');
}

function resetForm() {
  // Reset form inputs
  elements.username.value = '';
  elements.message.value = '';
  elements.photoInput.value = '';
  
  // Reset state
  state.files = [];
  state.currentStep = 1;
  
  // Reset UI
  elements.previewContainer.classList.remove('show');
  elements.previewGrid.innerHTML = '';
  updateCharCount();
  
  // Reset steps
  changeStep(1);
  
  // Fokus ke input nama
  elements.username.focus();
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Add show class after a tick
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ===== STATISTIK =====
async function loadStats() {
  try {
    const response = await fetch(CONFIG.apiEndpoints.stats);
    
    if (!response.ok) {
      throw new Error('Failed to load stats');
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Update state
      state.stats = {
        totalMessages: result.stats.total.messages,
        totalPhotos: result.stats.total.photos,
        todayMessages: result.stats.today.messages,
        recentActivity: result.stats.recent || []
      };
      
      // Update UI
      updateStatsUI();
      updateActivityList();
    }
    
  } catch (error) {
    console.error('Failed to load stats:', error);
    // Tetap update dengan data default
    updateStatsUI();
  }
}

function updateStatsUI() {
  elements.totalMessages.textContent = state.stats.totalMessages.toLocaleString();
  elements.totalPhotos.textContent = state.stats.totalPhotos.toLocaleString();
  elements.todayMessages.textContent = state.stats.todayMessages.toLocaleString();
}

function updateActivityList() {
  elements.activityList.innerHTML = '';
  
  if (state.stats.recentActivity.length === 0) {
    elements.activityList.innerHTML = `
      <div class="activity-placeholder">
        <i class="fas fa-inbox"></i>
        <p>Belum ada aktivitas</p>
      </div>
    `;
    return;
  }
  
  state.stats.recentActivity.forEach(activity => {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const avatarLetter = activity.sender_name.charAt(0).toUpperCase();
    const messagePreview = activity.message_text.length > 50 
      ? activity.message_text.substring(0, 50) + '...' 
      : activity.message_text;
    
    const timeAgo = formatTimeAgo(new Date(activity.created_at));
    
    activityItem.innerHTML = `
      <div class="activity-avatar">${avatarLetter}</div>
      <div class="activity-content">
        <div class="activity-name">${escapeHtml(activity.sender_name)}</div>
        <div class="activity-message">${escapeHtml(messagePreview)}</div>
        <div class="activity-meta">
          ${activity.photo_count > 0 ? `
            <span class="activity-photo">
              <i class="fas fa-image"></i> ${activity.photo_count}
            </span>
          ` : ''}
          <span class="activity-time">${timeAgo}</span>
        </div>
      </div>
    `;
    
    elements.activityList.appendChild(activityItem);
  });
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) return `${diffDay} hari lalu`;
  if (diffHour > 0) return `${diffHour} jam lalu`;
  if (diffMin > 0) return `${diffMin} menit lalu`;
  return 'Baru saja';
}

// ===== EMOJI PICKER =====
function setupEmojiPicker() {
  const emojiGrid = elements.emojiPicker.querySelector('.emoji-grid');
  emojiGrid.innerHTML = '';
  
  CONFIG.emojis.forEach(emoji => {
    const emojiItem = document.createElement('div');
    emojiItem.className = 'emoji-item';
    emojiItem.textContent = emoji;
    emojiItem.addEventListener('click', () => insertEmoji(emoji));
    emojiGrid.appendChild(emojiItem);
  });
}

function insertEmoji(emoji) {
  const messageInput = elements.message;
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const text = messageInput.value;
  
  messageInput.value = text.substring(0, start) + emoji + text.substring(end);
  messageInput.focus();
  messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
  
  updateCharCount();
  closeEmojiPicker();
  playSound('click');
}

function formatText(format) {
  const messageInput = elements.message;
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const selectedText = messageInput.value.substring(start, end);
  
  let formattedText = '';
  
  switch (format) {
    case 'bold':
      formattedText = `**${selectedText}**`;
      break;
    case 'italic':
      formattedText = `*${selectedText}*`;
      break;
    default:
      formattedText = selectedText;
  }
  
  messageInput.value = messageInput.value.substring(0, start) + 
                      formattedText + 
                      messageInput.value.substring(end);
  
  messageInput.focus();
  messageInput.selectionStart = start;
  messageInput.selectionEnd = start + formattedText.length;
  
  updateCharCount();
  playSound('click');
}

function showEmojiPicker() {
  elements.emojiPicker.classList.add('show');
}

function closeEmojiPicker() {
  elements.emojiPicker.classList.remove('show');
}

// ===== KEYBOARD SHORTCUTS =====
function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + Enter untuk kirim
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && state.currentStep === 4) {
    e.preventDefault();
    sendMessage();
  }
  
  // Esc untuk close modal/emoji picker
  if (e.key === 'Escape') {
    if (elements.successModal.classList.contains('show')) {
      closeModal();
    }
    if (elements.emojiPicker.classList.contains('show')) {
      closeEmojiPicker();
    }
  }
  
  // Ctrl/Cmd + B untuk bold
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    formatText('bold');
  }
  
  // Ctrl/Cmd + I untuk italic
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
    e.preventDefault();
    formatText('italic');
  }
  
  // Ctrl/Cmd + E untuk emoji picker
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    showEmojiPicker();
  }
}

// ===== HELPER FUNCTIONS =====
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function playSound(type) {
  if (!elements[`sound${type.charAt(0).toUpperCase() + type.slice(1)}`]) return;
  
  try {
    const sound = elements[`sound${type.charAt(0).toUpperCase() + type.slice(1)}`];
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Audio error:', e));
  } catch (error) {
    console.log('Sound playback error:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== EXPORT FUNCTIONS UNTUK HTML =====
window.nextStep = nextStep;
window.prevStep = prevStep;
window.sendMessage = sendMessage;
window.resetForm = resetForm;
window.closeModal = closeModal;
window.formatText = formatText;
window.insertEmoji = insertEmoji;
window.showEmojiPicker = showEmojiPicker;
window.closeEmojiPicker = closeEmojiPicker;
window.loadStats = loadStats;

// Auto-refresh stats setiap 30 detik
setInterval(loadStats, 30000);

// Initial stats load
loadStats();
