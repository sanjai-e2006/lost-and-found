import { auth, items, blockchain, notifications, claims, utils, supabase } from './supabase-client-fixed.js';

// Global state
let currentUser = null;
let allItems = [];
let allNotifications = [];
let allBlocks = [];
let googleMap = null;
let directionsService = null;
let directionsRenderer = null;
let trafficLayer = null;
let searchBox = null;
let currentMarker = null;

// ============================================
// GLOBAL FUNCTIONS (must be before DOMContentLoaded)
// ============================================

// Handle claim approve/reject
window.handleClaim = async function(notificationId, decision) {
  const notification = allNotifications.find(n => n.id === notificationId);
  if (!notification) {
    console.error('Notification not found:', notificationId);
    return;
  }
  
  console.log('🎯 handleClaim called:', { notificationId, decision, notification });
  
  try {
    if (decision === 'approve') {
      console.log('✅ Opening approve modal...');
      window.openApproveModal(notificationId);
    } else {
      console.log('❌ Opening reject modal...');
      window.openRejectModal(notificationId);
    }
  } catch (error) {
    console.error('Error in handleClaim:', error);
    utils.showToast(error.message || 'Failed to process claim', 'error');
  }
}

// Approve modal functions
window.openApproveModal = function(notificationId) {
  const modal = document.getElementById('approveModal');
  document.getElementById('approveNotificationId').value = notificationId;
  modal.style.display = 'block';
}

window.closeApproveModal = function() {
  const modal = document.getElementById('approveModal');
  modal.style.display = 'none';
  document.getElementById('approveMessage').value = '';
  document.getElementById('approveFile').value = '';
}

// Reject modal functions
window.openRejectModal = function(notificationId) {
  const modal = document.getElementById('rejectModal');
  document.getElementById('rejectNotificationId').value = notificationId;
  modal.style.display = 'block';
}

window.closeRejectModal = function() {
  const modal = document.getElementById('rejectModal');
  modal.style.display = 'none';
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectDetails').value = '';
}

// Mark notification as read
window.markNotificationRead = async function(notificationId) {
  await notifications.markAsRead(notificationId);
  await loadNotifications();
}

// Delete lost item (only owner can delete)
window.deleteLostItem = async function(itemId, itemName) {
  const confirmed = confirm(`Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`);
  if (!confirmed) return;
  
  try {
    console.log('🗑️ Deleting lost item:', itemId);
    showLoading('Deleting item...');
    
    const { error } = await items.deleteItem(itemId);
    
    if (error) {
      console.error('❌ Delete failed:', error);
      throw new Error(error);
    }
    
    console.log('✅ Item deleted successfully');
    utils.showToast('Item deleted successfully!', 'success');
    
    // Reload items
    await loadItems();
  } catch (error) {
    console.error('Error deleting item:', error);
    utils.showToast(error.message || 'Failed to delete item', 'error');
  } finally {
    hideLoading();
  }
}

// Show message modal for lost items
window.showMessageModal = function(itemId, ownerId, itemName) {
  document.getElementById('messageItemId').value = itemId;
  document.getElementById('messageOwnerId').value = ownerId;
  document.getElementById('messageItemName').textContent = itemName;
  document.getElementById('messageText').value = '';
  
  const modal = document.getElementById('messageModal');
  modal.style.display = 'block';
}

// Close message modal
window.closeMessageModal = function() {
  const modal = document.getElementById('messageModal');
  modal.style.display = 'none';
  document.getElementById('messageText').value = '';
}

// Show item detail (used by map markers)
window.showItemDetail = function(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;
  
  // Switch to items view and filter to show this item
  switchView('items');
  document.getElementById('searchInput').value = item.name;
  applyFilters();
  
  // Scroll to the item card
  setTimeout(() => {
    const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemCard) {
      itemCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      itemCard.style.animation = 'pulse 1s ease-in-out';
    }
  }, 300);
}

// ============================================
// END GLOBAL FUNCTIONS
// ============================================

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const isAuth = await utils.checkAuthAndRedirect(true);
  if (!isAuth) return;

  // Get current user
  const { user, error } = await auth.getCurrentUser();
  if (error || !user) {
    console.error('Failed to get user:', error);
    
    // If user doesn't exist in database but is authenticated (OAuth case)
    // Try to get auth user and create database entry
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      console.log('Creating user record for OAuth user:', authUser.email);
      
      // Create user in database
      const { error: insertError } = await supabase
        .from('users')
        .upsert([
          {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
            phone: authUser.user_metadata?.phone || null
          }
        ], {
          onConflict: 'id'
        });
      
      if (insertError) {
        console.error('Failed to create user record:', insertError);
      } else {
        // Reload to get the user
        window.location.reload();
        return;
      }
    }
    
    window.location.href = '/login.html';
    return;
  }

  currentUser = user;
  
  // Initialize UI
  initializeUI();
  loadDashboardData();
  setupEventListeners();
});

// Initialize UI with user data
function initializeUI() {
  document.getElementById('userName').textContent = currentUser.full_name || 'User';
  document.getElementById('profileName').textContent = currentUser.full_name || 'User';
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profilePhone').textContent = currentUser.phone || 'Not provided';
  document.getElementById('profileId').textContent = currentUser.id.substring(0, 8) + '...';
  
  const date = new Date(currentUser.created_at);
  document.getElementById('profileDate').textContent = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Show/hide loading overlay
function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = overlay.querySelector('p');
  text.textContent = message;
  overlay.classList.add('show');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('show');
}

// Load all dashboard data
async function loadDashboardData() {
  showLoading('Loading dashboard data...');
  
  try {
    await Promise.all([
      loadItems(),
      loadNotifications(),
      loadBlockchain()
    ]);
    
    updateStats();
  } catch (error) {
    utils.showToast('Failed to load dashboard data', 'error');
  } finally {
    hideLoading();
  }
}

// Load items
async function loadItems() {
  const { data, error } = await items.getAllItems();
  
  if (error) {
    utils.showToast('Failed to load items', 'error');
    return;
  }
  
  allItems = data || [];
  renderItems();
  renderRecentItems();
}

// Load notifications
async function loadNotifications() {
  console.log('🔄 Loading notifications for user:', currentUser?.id);
  
  const { data, error } = await notifications.getUserNotifications();
  
  if (error) {
    console.error('❌ Failed to load notifications:', error);
    utils.showToast('Failed to load notifications', 'error');
    return;
  }
  
  allNotifications = data || [];
  
  // DEBUG: Log notifications to check metadata
  console.log('📢 Loaded', allNotifications.length, 'notifications:', allNotifications);
  allNotifications.forEach(notif => {
    console.log('📨 Notification:', {
      id: notif.id,
      type: notif.type,
      recipient_id: notif.recipient_id,
      sender_id: notif.sender_id,
      status: notif.status,
      message: notif.message.substring(0, 50) + '...',
      metadata: notif.metadata
    });
  });
  
  renderNotifications();
  updateNotificationCount();
}

// Load blockchain
async function loadBlockchain() {
  const { data, error } = await blockchain.getAllBlocks();
  
  if (error) {
    utils.showToast('Failed to load blockchain', 'error');
    return;
  }
  
  allBlocks = data || [];
  renderBlockchain();
}

// Update statistics
function updateStats() {
  const totalItems = allItems.length;
  const foundItems = allItems.filter(item => item.item_type === 'found').length;
  const lostItems = allItems.filter(item => item.item_type === 'lost').length;
  const matchedItems = allItems.filter(item => item.status === 'matched').length;
  
  document.getElementById('totalItems').textContent = totalItems;
  document.getElementById('foundItems').textContent = foundItems;
  document.getElementById('lostItems').textContent = lostItems;
  document.getElementById('matchedItems').textContent = matchedItems;
  
  document.getElementById('totalBlocks').textContent = allBlocks.length;
  document.getElementById('verifiedTransactions').textContent = allBlocks.filter(b => b.verification_status === 'verified').length;
}

// Render items
function renderItems() {
  const grid = document.getElementById('itemsGrid');
  
  // Filter out matched items (already claimed and approved)
  const availableItems = allItems.filter(item => item.status !== 'matched');
  
  if (availableItems.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No available items. Matched items can be viewed in Blockchain Records.</p></div>';
    return;
  }
  
  grid.innerHTML = availableItems.map(item => `
    <div class="item-card" onclick="showItemDetail('${item.id}')">
      <div class="item-image">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.item_name}">` : `<i class="fas fa-box"></i>`}
      </div>
      <div class="item-content">
        <div class="item-header">
          <h3 class="item-title">${item.item_name}</h3>
          <span class="item-badge badge-${item.item_type}">${item.item_type === 'found' ? '🟢 Found' : '🔵 Lost'}</span>
        </div>
        <p class="item-description">${item.description}</p>
        <div class="item-meta">
          <div><i class="fas fa-tag"></i> ${item.category}</div>
          <div><i class="fas fa-map-marker-alt"></i> ${item.location}</div>
          <div><i class="fas fa-calendar"></i> ${new Date(item.date_found_lost).toLocaleDateString()}</div>
          <div><i class="fas fa-user"></i> ${item.users?.full_name || 'Unknown'}</div>
        </div>
        ${item.item_type === 'found' && item.user_id !== currentUser.id ? `
          <div class="item-actions">
            <button class="btn-primary" onclick="event.stopPropagation(); showClaimModal('${item.id}', '${item.user_id}')">
              <i class="fas fa-hand-paper"></i> Claim Item
            </button>
          </div>
        ` : ''}
        ${item.item_type === 'lost' ? `
          <div class="item-actions" style="display: flex; gap: 0.5rem;">
            ${item.user_id === currentUser.id ? `
              <button class="btn-danger" onclick="event.stopPropagation(); deleteLostItem('${item.id}', '${item.item_name}')" style="flex: 1;">
                <i class="fas fa-trash"></i> Delete
              </button>
            ` : `
              <button class="btn-primary" onclick="event.stopPropagation(); showMessageModal('${item.id}', '${item.user_id}', '${item.item_name}')" style="flex: 1;">
                <i class="fas fa-envelope"></i> Message
              </button>
            `}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Render recent items
function renderRecentItems() {
  const container = document.getElementById('recentItemsList');
  
  // Show only available items (exclude matched items)
  const availableItems = allItems.filter(item => item.status !== 'matched');
  const recentItems = availableItems.slice(0, 5);
  
  if (recentItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>';
    return;
  }
  
  container.innerHTML = recentItems.map(item => `
    <div class="item-card" onclick="showItemDetail('${item.id}')" style="cursor: pointer;">
      <div class="item-content">
        <div class="item-header">
          <h3 class="item-title">${item.item_name}</h3>
          <span class="item-badge badge-${item.item_type}">${item.item_type === 'found' ? 'Found' : 'Lost'}</span>
        </div>
        <div class="item-meta">
          <div><i class="fas fa-map-marker-alt"></i> ${item.location}</div>
          <div><i class="fas fa-calendar"></i> ${utils.formatDate(item.created_at)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Render notifications
function renderNotifications() {
  const container = document.getElementById('notificationsList');
  
  if (allNotifications.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><p>No notifications</p></div>';
    return;
  }
  
  container.innerHTML = allNotifications.map(notif => `
    <div class="notification-card ${notif.status === 'unread' ? 'unread' : ''}">
      <div class="notification-header">
        <span class="notification-type">${notif.type.replace('_', ' ').toUpperCase()}</span>
        <span class="notification-time">${utils.formatDate(notif.created_at)}</span>
      </div>
      <div class="notification-message" style="white-space: pre-line;">${notif.message}</div>
      
      ${notif.metadata && notif.metadata.proof_file_url ? `
        <div style="margin-top:10px; padding:10px; background:rgba(99, 102, 241, 0.15); border-radius:5px; border:1px solid rgba(99, 102, 241, 0.3);">
          <i class="fas fa-paperclip" style="color:#818cf8;"></i> 
          <a href="${notif.metadata.proof_file_url}" target="_blank" style="color:#818cf8; text-decoration:underline;">
            View Proof Document
          </a>
        </div>
      ` : ''}
      
      ${notif.type === 'claim_approved' && notif.metadata ? `
        <div style="margin-top:10px; padding:15px; background:rgba(5, 150, 105, 0.15); border-radius:5px; border-left:4px solid #10b981; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);">
          <h4 style="margin:0 0 10px 0; color:#10b981;"><i class="fas fa-check-circle"></i> Claim Approved!</h4>
          ${notif.metadata.collection_location ? `
            <p style="margin:5px 0; color:#e2e8f0;"><strong>📍 Collection Location:</strong> ${notif.metadata.collection_location}</p>
          ` : ''}
          ${notif.metadata.item_contact ? `
            <p style="margin:5px 0; color:#e2e8f0;"><strong>📞 Contact:</strong> ${notif.metadata.item_contact}</p>
          ` : ''}
          ${notif.metadata.response_file_url ? `
            <p style="margin:10px 0 5px 0; color:#e2e8f0;">
              <i class="fas fa-file-upload"></i>
              <a href="${notif.metadata.response_file_url}" target="_blank" style="color:#10b981; text-decoration:underline;">
                View Founder's Response File
              </a>
            </p>
          ` : ''}
        </div>
      ` : ''}
      
      ${notif.type === 'claim_rejected' && notif.metadata ? `
        <div style="margin-top:10px; padding:15px; background:rgba(239, 68, 68, 0.15); border-radius:5px; border-left:4px solid #ef4444; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);">
          <h4 style="margin:0 0 10px 0; color:#ef4444;"><i class="fas fa-times-circle"></i> Claim Rejected</h4>
          ${notif.metadata.rejection_reason ? `
            <p style="margin:5px 0; color:#e2e8f0;"><strong>Reason:</strong> ${notif.metadata.rejection_reason}</p>
          ` : ''}
          ${notif.metadata.rejection_details ? `
            <p style="margin:5px 0; color:#e2e8f0;"><strong>Details:</strong> ${notif.metadata.rejection_details}</p>
          ` : ''}
          <p style="margin:10px 0 0 0; font-size:0.9em; color:#cbd5e1;">
            <i class="fas fa-info-circle"></i> You can resubmit your claim with additional proof if you believe this is your item.
          </p>
        </div>
      ` : ''}
      
      ${notif.type === 'lost_item_message' && notif.metadata ? `
        <div style="margin-top:10px; padding:15px; background:rgba(99, 102, 241, 0.15); border-radius:5px; border-left:4px solid #6366f1; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);">
          <h4 style="margin:0 0 10px 0; color:#818cf8;"><i class="fas fa-envelope"></i> Message About Your Lost Item</h4>
          <p style="margin:5px 0; color:#e2e8f0;"><strong>📦 Item:</strong> ${notif.metadata.item_name || 'N/A'}</p>
          <p style="margin:5px 0; color:#e2e8f0;"><strong>👤 From:</strong> ${notif.metadata.sender_name || 'Unknown'}</p>
          <p style="margin:5px 0; color:#e2e8f0;"><strong>📧 Email:</strong> ${notif.metadata.sender_email || 'N/A'}</p>
          <div style="margin-top:10px; padding:10px; background:rgba(15, 23, 42, 0.6); border-radius:4px; border:1px solid rgba(99, 102, 241, 0.3);">
            <strong style="color:#818cf8;">💬 Message:</strong>
            <p style="margin:5px 0 0 0; white-space: pre-wrap; color:#e2e8f0;">${notif.metadata.message_text || 'No message'}</p>
          </div>
          <p style="margin:10px 0 0 0; font-size:0.9em; color:#94a3b8;">
            <i class="fas fa-info-circle"></i> Contact them at ${notif.metadata.sender_email} to follow up!
          </p>
        </div>
      ` : ''}
      
      <div class="notification-actions">
        ${notif.type === 'claim_request' && notif.status === 'unread' ? `
          <button class="btn-success" onclick="handleClaim('${notif.id}', 'approve')">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="btn-danger" onclick="handleClaim('${notif.id}', 'reject')">
            <i class="fas fa-times"></i> Reject
          </button>
        ` : ''}
        ${notif.status === 'unread' ? `
          <button class="btn-secondary" onclick="markNotificationRead('${notif.id}')">
            <i class="fas fa-check"></i> Mark as Read
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Render blockchain
function renderBlockchain() {
  const container = document.getElementById('blockchainChain');
  
  if (allBlocks.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-link"></i><p>No blockchain records yet. Approve a claim to create the first block!</p></div>';
    return;
  }
  
  // Update blockchain stats
  document.getElementById('totalBlocks').textContent = allBlocks.length;
  document.getElementById('verifiedTransactions').textContent = allBlocks.filter(b => b.verification_status === 'verified').length;
  
  container.innerHTML = allBlocks.map((block, index) => `
    <div class="block-card">
      <div class="block-header">
        <span class="block-index">Block #${block.block_index}</span>
        <span class="block-verified">
          <i class="fas fa-check-circle"></i> ${block.verification_status}
        </span>
      </div>
      <div class="block-content">
        <div class="block-field">
          <label>Product Name</label>
          <span>${block.product_name || 'N/A'}</span>
        </div>
        <div class="block-field">
          <label>Category</label>
          <span>${block.category || 'N/A'}</span>
        </div>
        <div class="block-field">
          <label>Location</label>
          <span>${block.location || 'N/A'}</span>
        </div>
        <div class="block-field">
          <label>Finder (Owner)</label>
          <span>${block.finder_name || block.finder_email || 'N/A'}</span>
        </div>
        <div class="block-field">
          <label>Loser (Claimer)</label>
          <span>${block.loser_name || block.loser_email || 'N/A'}</span>
        </div>
        <div class="block-field">
          <label>Claim Message</label>
          <span style="font-style: italic;">"${block.claim_message || 'No message provided'}"</span>
        </div>
        ${block.proof_file_url ? `
        <div class="block-field">
          <label>Proof File</label>
          <a href="${block.proof_file_url}" target="_blank" style="color: var(--primary); text-decoration: underline;">
            <i class="fas fa-file"></i> View Proof
          </a>
        </div>
        ` : ''}
        <div class="block-field">
          <label>Nonce (Mining)</label>
          <span>${block.nonce || 0}</span>
        </div>
        <div class="block-field">
          <label>Difficulty</label>
          <span>${block.difficulty || 2}</span>
        </div>
        <div class="block-field">
          <label>Timestamp</label>
          <span>${utils.formatDate(block.timestamp)}</span>
        </div>
      </div>
      <div class="block-hash">
        <label style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">Block Hash:</label>
        <code style="color: #00d084; font-weight: bold;">${block.block_hash}</code>
      </div>
      <div class="block-hash">
        <label style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">Previous Hash:</label>
        <code>${block.previous_hash}</code>
      </div>
    </div>
    ${index < allBlocks.length - 1 ? '<div class="chain-link"><i class="fas fa-link"></i></div>' : ''}
  `).join('');
}

// ============================================
// GOOGLE MAPS FUNCTIONS
// ============================================

// Initialize Google Map with full functionality
function initializeGoogleMap() {
  // Load Google Maps API dynamically
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&libraries=places';
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  } else {
    initMap();
  }
}

function initMap() {
  const mapElement = document.getElementById('googleMap');
  if (!mapElement) {
    console.error('Map element not found');
    return;
  }

  // VIT Vellore Campus Center
  const defaultCenter = { lat: 12.9692, lng: 79.1559 };

  // Initialize map
  googleMap = new google.maps.Map(mapElement, {
    zoom: 16,
    center: defaultCenter,
    mapTypeId: 'roadmap',
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    },
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    },
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  });

  // Initialize services
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: googleMap,
    panel: document.getElementById('directionsResult')
  });
  
  trafficLayer = new google.maps.TrafficLayer();

  // Initialize search box
  const searchInput = document.getElementById('mapSearchBox');
  searchBox = new google.maps.places.SearchBox(searchInput);

  // Bias the SearchBox results towards current map's viewport
  googleMap.addListener('bounds_changed', () => {
    searchBox.setBounds(googleMap.getBounds());
  });

  // VIT Vellore Campus Buildings/Blocks (Accurate Locations)
  const vitBuildings = [
    { name: 'Main Building', lat: 12.96916, lng: 79.15544, type: 'Academic' },
    { name: 'Technology Tower (TT)', lat: 12.96975, lng: 79.15647, type: 'Academic' },
    { name: 'Silver Jubilee Tower (SJT)', lat: 12.97018, lng: 79.15702, type: 'Academic' },
    { name: 'Golden Jubilee Block (GDN)', lat: 12.97092, lng: 79.15589, type: 'Academic' },
    { name: 'Main Gate', lat: 12.97155, lng: 79.15912, type: 'Entrance' },
    { name: 'Anna Auditorium', lat: 12.96852, lng: 79.15498, type: 'Auditorium' },
    { name: 'Library', lat: 12.96978, lng: 79.15572, type: 'Library' },
    { name: 'SMV Hostel', lat: 12.96734, lng: 79.15812, type: 'Hostel' },
    { name: 'MGB Hostel', lat: 12.96802, lng: 79.15947, type: 'Hostel' },
    { name: 'Mens Hostel A Block', lat: 12.96625, lng: 79.15723, type: 'Hostel' },
    { name: 'Mens Hostel B Block', lat: 12.96688, lng: 79.15654, type: 'Hostel' },
    { name: 'Mens Hostel C Block', lat: 12.96745, lng: 79.15598, type: 'Hostel' },
    { name: 'Ladies Hostel', lat: 12.97245, lng: 79.15842, type: 'Hostel' },
    { name: 'Academic Block', lat: 12.96892, lng: 79.15698, type: 'Academic' },
    { name: 'CBSE Block', lat: 12.96845, lng: 79.15612, type: 'Academic' },
    { name: 'Food Court', lat: 12.96812, lng: 79.15765, type: 'Dining' },
    { name: 'Sports Complex', lat: 12.96545, lng: 79.15587, type: 'Sports' },
    { name: 'Medical Center', lat: 12.97012, lng: 79.15823, type: 'Medical' },
    { name: 'PG Block', lat: 12.97134, lng: 79.15689, type: 'Academic' },
    { name: 'Bakery', lat: 12.96778, lng: 79.15698, type: 'Dining' }
  ];

  // Store buildings globally for search
  window.vitBuildingsData = vitBuildings;

  // Add markers for VIT buildings
  vitBuildings.forEach(building => {
    const marker = new google.maps.Marker({
      position: { lat: building.lat, lng: building.lng },
      map: googleMap,
      title: building.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: building.type === 'Academic' ? '#6366f1' : 
                   building.type === 'Hostel' ? '#10b981' : 
                   building.type === 'Dining' ? '#f59e0b' : '#8b5cf6',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; min-width: 150px;">
          <h3 style="margin: 0 0 5px 0; color: #1e293b; font-size: 1rem;">${building.name}</h3>
          <p style="margin: 0; color: #64748b; font-size: 0.9rem;"><strong>Type:</strong> ${building.type}</p>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">VIT Vellore Campus</p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(googleMap, marker);
    });
  });

  // Listen for search box place selection
  searchBox.addListener('places_changed', () => {
    const places = searchBox.getPlaces();
    if (places.length === 0) return;

    // Clear previous marker
    if (currentMarker) {
      currentMarker.setMap(null);
    }

    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    // Create marker
    currentMarker = new google.maps.Marker({
      map: googleMap,
      title: place.name,
      position: place.geometry.location,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px;">
          <h3 style="margin: 0 0 5px 0; color: #1e293b;">${place.name}</h3>
          <p style="margin: 0; color: #64748b;">${place.formatted_address || 'VIT Vellore Campus'}</p>
        </div>
      `
    });

    currentMarker.addListener('click', () => {
      infoWindow.open(googleMap, currentMarker);
    });

    // Zoom to place
    if (place.geometry.viewport) {
      googleMap.fitBounds(place.geometry.viewport);
    } else {
      googleMap.setCenter(place.geometry.location);
      googleMap.setZoom(17);
    }

    utils.showToast(`Found: ${place.name}`, 'success');
  });

  utils.showToast('Map loaded! VIT Vellore campus buildings are marked. Search for locations or get directions.', 'success');
}

// Get current location
function getCurrentLocation() {
  if (!googleMap) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Clear previous marker
        if (currentMarker) {
          currentMarker.setMap(null);
        }

        // Add marker at current location
        currentMarker = new google.maps.Marker({
          position: pos,
          map: googleMap,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          },
          animation: google.maps.Animation.BOUNCE
        });

        setTimeout(() => {
          currentMarker.setAnimation(null);
        }, 2000);

        googleMap.setCenter(pos);
        googleMap.setZoom(15);
        
        utils.showToast('Found your location!', 'success');
      },
      () => {
        utils.showToast('Unable to get your location. Please enable location services.', 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  } else {
    utils.showToast('Geolocation is not supported by your browser', 'error');
  }
}

// Toggle traffic layer
function toggleTraffic() {
  if (!googleMap || !trafficLayer) return;

  const btn = document.getElementById('showTrafficBtn');
  
  if (trafficLayer.getMap()) {
    trafficLayer.setMap(null);
    btn.classList.remove('active');
    utils.showToast('Traffic layer hidden', 'info');
  } else {
    trafficLayer.setMap(googleMap);
    btn.classList.add('active');
    utils.showToast('Traffic layer shown', 'success');
  }
}

// Toggle map type (roadmap/satellite)
function toggleMapTypeView() {
  if (!googleMap) return;

  const currentType = googleMap.getMapTypeId();
  const btn = document.getElementById('toggleMapTypeBtn');
  
  if (currentType === 'roadmap') {
    googleMap.setMapTypeId('satellite');
    btn.classList.add('active');
    btn.querySelector('span').textContent = 'Roadmap';
    utils.showToast('Switched to satellite view', 'success');
  } else {
    googleMap.setMapTypeId('roadmap');
    btn.classList.remove('active');
    btn.querySelector('span').textContent = 'Satellite';
    utils.showToast('Switched to roadmap view', 'success');
  }
}

// Show directions panel
function showDirectionsPanel() {
  const panel = document.getElementById('directionsPanel');
  panel.style.display = 'block';
  utils.showToast('Enter start and end locations to get directions', 'info');
}

// Close directions panel
function closeDirectionsPanel() {
  const panel = document.getElementById('directionsPanel');
  panel.style.display = 'none';
  
  // Clear directions
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
  }
  
  // Clear result
  const result = document.getElementById('directionsResult');
  result.classList.remove('show');
  result.innerHTML = '';
}

// Use current location for start point
function useCurrentLocationForStart() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = `${position.coords.latitude}, ${position.coords.longitude}`;
        document.getElementById('directionStart').value = pos;
        utils.showToast('Current location set as starting point', 'success');
      },
      () => {
        utils.showToast('Unable to get your location', 'error');
      }
    );
  }
}

// Swap start and end locations
function swapDirections() {
  const start = document.getElementById('directionStart');
  const end = document.getElementById('directionEnd');
  
  const temp = start.value;
  start.value = end.value;
  end.value = temp;
  
  utils.showToast('Locations swapped', 'success');
}

// Calculate route
function calculateRoute() {
  if (!directionsService || !directionsRenderer) {
    utils.showToast('Directions service not available', 'error');
    return;
  }

  const start = document.getElementById('directionStart').value.trim();
  const end = document.getElementById('directionEnd').value.trim();

  if (!start || !end) {
    utils.showToast('Please enter both start and end locations', 'error');
    return;
  }

  const travelMode = document.querySelector('.travel-mode.active').dataset.mode;

  showLoading('Calculating route...');

  const request = {
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode[travelMode]
  };

  directionsService.route(request, (result, status) => {
    hideLoading();

    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      
      // Display route info
      const route = result.routes[0];
      const leg = route.legs[0];
      
      const resultDiv = document.getElementById('directionsResult');
      resultDiv.innerHTML = `
        <h4><i class="fas fa-route"></i> Route Information</h4>
        <p><strong>Distance:</strong> ${leg.distance.text}</p>
        <p><strong>Duration:</strong> ${leg.duration.text}</p>
        <p><strong>From:</strong> ${leg.start_address}</p>
        <p><strong>To:</strong> ${leg.end_address}</p>
        <div style="margin-top: 1rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Steps:</h4>
          ${leg.steps.map((step, index) => `
            <div class="route-step">
              <strong>${index + 1}.</strong> ${step.instructions} (${step.distance.text})
            </div>
          `).join('')}
        </div>
      `;
      resultDiv.classList.add('show');
      
      utils.showToast('Route calculated successfully!', 'success');
    } else {
      utils.showToast('Could not calculate route: ' + status, 'error');
    }
  });
}

// Handle quick navigation from dropdowns
function handleQuickNavigation() {
  if (!directionsService || !directionsRenderer) {
    utils.showToast('Directions service not available. Please wait for map to load.', 'error');
    return;
  }

  const fromSelect = document.getElementById('quickNavFrom');
  const toSelect = document.getElementById('quickNavTo');
  const fromValue = fromSelect.value;
  const toValue = toSelect.value;

  if (!toValue) {
    utils.showToast('Please select a destination', 'error');
    return;
  }

  let startLocation;

  if (!fromValue) {
    // Use current location
    if (navigator.geolocation) {
      showLoading('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          const [toLat, toLng] = toValue.split(',').map(Number);
          const destination = new google.maps.LatLng(toLat, toLng);
          calculateQuickRoute(currentPos, destination, toSelect.options[toSelect.selectedIndex].text);
        },
        () => {
          hideLoading();
          utils.showToast('Unable to get your location. Please select a starting point.', 'error');
        }
      );
    } else {
      utils.showToast('Geolocation not supported. Please select a starting point.', 'error');
    }
  } else {
    // Use selected location
    const [fromLat, fromLng] = fromValue.split(',').map(Number);
    const [toLat, toLng] = toValue.split(',').map(Number);
    const start = new google.maps.LatLng(fromLat, fromLng);
    const destination = new google.maps.LatLng(toLat, toLng);
    const fromName = fromSelect.options[fromSelect.selectedIndex].text;
    const toName = toSelect.options[toSelect.selectedIndex].text;
    calculateQuickRoute(start, destination, toName, fromName);
  }
}

function calculateQuickRoute(start, destination, destName, startName = 'Your Location') {
  if (!directionsService || !directionsRenderer) {
    utils.showToast('Directions service not initialized. Please wait for map to load.', 'error');
    return;
  }

  showLoading('Calculating route...');

  // Set a timeout to prevent infinite loading
  const timeout = setTimeout(() => {
    hideLoading();
    utils.showToast('Request timed out. Please try again.', 'error');
  }, 10000); // 10 seconds timeout

  const request = {
    origin: start,
    destination: destination,
    travelMode: google.maps.TravelMode.WALKING // Default to walking for campus
  };

  directionsService.route(request, (result, status) => {
    clearTimeout(timeout); // Clear the timeout
    hideLoading();

    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      
      const route = result.routes[0];
      const leg = route.legs[0];
      
      // Show success message with route info
      utils.showToast(`Route found! ${leg.distance.text}, ~${leg.duration.text}`, 'success');
      
      // Scroll to map
      const mapElement = document.getElementById('googleMap');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Show route info
      const infoDiv = document.createElement('div');
      infoDiv.className = 'quick-route-info';
      infoDiv.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.95); padding: 1.5rem; border-radius: 16px; margin-top: 1rem; border: 1px solid rgba(99, 102, 241, 0.3);">
          <h4 style="color: #818cf8; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-route"></i> Route Information
          </h4>
          <div style="color: #e2e8f0; line-height: 1.8;">
            <p><strong>From:</strong> ${startName}</p>
            <p><strong>To:</strong> ${destName}</p>
            <p><strong>Distance:</strong> ${leg.distance.text}</p>
            <p><strong>Walking Time:</strong> ${leg.duration.text}</p>
          </div>
        </div>
      `;
      
      const mapContainer = document.getElementById('googleMap');
      if (mapContainer) {
        const existingInfo = document.querySelector('.quick-route-info');
        if (existingInfo) existingInfo.remove();
        mapContainer.parentNode.insertBefore(infoDiv, mapContainer.nextSibling);
      }
      
    } else {
      console.error('Directions request failed:', status);
      utils.showToast(`Could not calculate route: ${status}. Please try again.`, 'error');
    }
  });
}

// Measure distance (simple version)
let measureMarkers = [];
let measureLine = null;

function measureDistance() {
  if (!googleMap) return;

  const btn = document.getElementById('measureDistanceBtn');
  
  if (btn.classList.contains('active')) {
    // Stop measuring
    measureMarkers.forEach(marker => marker.setMap(null));
    measureMarkers = [];
    if (measureLine) measureLine.setMap(null);
    btn.classList.remove('active');
    google.maps.event.clearListeners(googleMap, 'click');
    utils.showToast('Measurement cancelled', 'info');
    return;
  }

  btn.classList.add('active');
  utils.showToast('Click on map to measure distance. Click button again to stop.', 'info');

  googleMap.addListener('click', (event) => {
    if (!btn.classList.contains('active')) return;

    const marker = new google.maps.Marker({
      position: event.latLng,
      map: googleMap,
      label: (measureMarkers.length + 1).toString()
    });

    measureMarkers.push(marker);

    if (measureMarkers.length >= 2) {
      if (measureLine) measureLine.setMap(null);

      const path = measureMarkers.map(m => m.getPosition());
      measureLine = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#6366f1',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: googleMap
      });

      // Calculate distance
      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
          path[i],
          path[i + 1]
        );
      }

      const distanceKm = (totalDistance / 1000).toFixed(2);
      utils.showToast(`Distance: ${distanceKm} km`, 'success');
    }
  });
}

// Update notification count
function updateNotificationCount() {
  const unreadCount = allNotifications.filter(n => n.status === 'unread').length;
  const badge = document.getElementById('notificationCount');
  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? 'block' : 'none';
}

// Handle block to block search
function handleBlockSearch() {
  const fromBlock = document.getElementById('fromBlock').value.trim();
  const toBlock = document.getElementById('toBlock').value.trim();
  
  if (!fromBlock || !toBlock) {
    utils.showToast('Please enter both starting and destination blocks', 'error');
    return;
  }
  
  // Create Google Maps directions URL
  const baseUrl = 'https://www.google.com/maps/dir/';
  const origin = encodeURIComponent(fromBlock + ', VIT University, Vellore');
  const destination = encodeURIComponent(toBlock + ', VIT University, Vellore');
  const mapsUrl = `${baseUrl}${origin}/${destination}`;
  
  // Open in new tab
  window.open(mapsUrl, '_blank');
  
  utils.showToast(`Opening directions from ${fromBlock} to ${toBlock}`, 'success');
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });
  
  // Logout buttons
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('logoutBtn2').addEventListener('click', handleLogout);
  
  // Add item buttons
  document.getElementById('addItemBtn').addEventListener('click', () => showModal('addItemModal'));
  document.getElementById('addItemBtn2').addEventListener('click', () => showModal('addItemModal'));
  
  // Add item form
  document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
  
  // Claim form
  document.getElementById('claimForm').addEventListener('submit', handleSubmitClaim);
  
  // Modal close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
  
  // Filters
  document.getElementById('filterType').addEventListener('change', applyFilters);
  document.getElementById('filterCategory').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  document.getElementById('exportItems').addEventListener('click', exportItemsToCSV);
  
  // Blockchain filters
  document.getElementById('blockchainSearch').addEventListener('input', filterBlockchain);
  document.getElementById('blockchainSort').addEventListener('change', sortBlockchain);
  
  // Mark all read
  document.getElementById('markAllReadBtn').addEventListener('click', markAllRead);
  
  // Image preview
  document.getElementById('itemImage').addEventListener('change', handleImagePreview);
  
  // Map controls
  const getCurrentLocationBtn = document.getElementById('getCurrentLocationBtn');
  if (getCurrentLocationBtn) {
    getCurrentLocationBtn.addEventListener('click', getCurrentLocation);
  }
  
  const showTrafficBtn = document.getElementById('showTrafficBtn');
  if (showTrafficBtn) {
    showTrafficBtn.addEventListener('click', toggleTraffic);
  }
  
  const toggleMapTypeBtn = document.getElementById('toggleMapTypeBtn');
  if (toggleMapTypeBtn) {
    toggleMapTypeBtn.addEventListener('click', toggleMapTypeView);
  }
  
  const measureDistanceBtn = document.getElementById('measureDistanceBtn');
  if (measureDistanceBtn) {
    measureDistanceBtn.addEventListener('click', measureDistance);
  }
  
  const getDirectionsBtn = document.getElementById('getDirectionsBtn');
  if (getDirectionsBtn) {
    getDirectionsBtn.addEventListener('click', showDirectionsPanel);
  }
  
  const closeDirectionsBtn = document.getElementById('closeDirectionsBtn');
  if (closeDirectionsBtn) {
    closeDirectionsBtn.addEventListener('click', closeDirectionsPanel);
  }
  
  const useCurrentStart = document.getElementById('useCurrentStart');
  if (useCurrentStart) {
    useCurrentStart.addEventListener('click', useCurrentLocationForStart);
  }
  
  const swapLocations = document.getElementById('swapLocations');
  if (swapLocations) {
    swapLocations.addEventListener('click', swapDirections);
  }
  
  const calculateRouteBtn = document.getElementById('calculateRouteBtn');
  if (calculateRouteBtn) {
    calculateRouteBtn.addEventListener('click', calculateRoute);
  }
  
  // Travel mode buttons
  document.querySelectorAll('.travel-mode').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.travel-mode').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // Quick Navigation
  const quickNavigateBtn = document.getElementById('quickNavigateBtn');
  if (quickNavigateBtn) {
    quickNavigateBtn.addEventListener('click', handleQuickNavigation);
  }
  
  const swapQuickNav = document.getElementById('swapQuickNav');
  if (swapQuickNav) {
    swapQuickNav.addEventListener('click', () => {
      const from = document.getElementById('quickNavFrom');
      const to = document.getElementById('quickNavTo');
      const temp = from.value;
      from.value = to.value;
      to.value = temp;
    });
  }

  // Block to Block Search
  const searchBlockBtn = document.getElementById('searchBlockBtn');
  if (searchBlockBtn) {
    searchBlockBtn.addEventListener('click', handleBlockSearch);
  }
  
  // Initialize autocomplete for direction inputs (biased to VIT Vellore)
  if (typeof google !== 'undefined' && google.maps) {
    const startInput = document.getElementById('directionStart');
    const endInput = document.getElementById('directionEnd');
    
    // VIT Vellore bounds for autocomplete bias
    const vitBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(12.9650, 79.1540), // Southwest corner
      new google.maps.LatLng(12.9730, 79.1600)  // Northeast corner
    );
    
    if (startInput) {
      const startAutocomplete = new google.maps.places.Autocomplete(startInput, {
        bounds: vitBounds,
        strictBounds: false,
        componentRestrictions: { country: 'in' }
      });
    }
    if (endInput) {
      const endAutocomplete = new google.maps.places.Autocomplete(endInput, {
        bounds: vitBounds,
        strictBounds: false,
        componentRestrictions: { country: 'in' }
      });
    }
  }
  
  // ============================================
  // APPROVE AND REJECT FORM HANDLERS
  // ============================================
  
  // Reject form submit handler
  document.getElementById('rejectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const notificationId = document.getElementById('rejectNotificationId').value;
    const reason = document.getElementById('rejectReason').value;
    const details = document.getElementById('rejectDetails').value;

    const notification = allNotifications.find(n => n.id === notificationId);
    if (!notification) return utils.showToast('Notification not found', 'error');

    try {
      showLoading('Processing rejection...');

      // Get claim details
      const { data: claimsList } = await claims.getUserClaims();
      const claim = claimsList?.find(c => c.item_id === notification.item_id && c.claimant_id === notification.sender_id);

      if (!claim) throw new Error('Claim not found');

      // Update claim status to rejected
      await claims.updateClaimStatus(claim.id, 'rejected');

      // Get item name
      const item = allItems.find(i => i.id === notification.item_id);

      // Send rejection notification with reason and details
      const rejectionMessage = `Your claim for ${item.item_name} has been rejected.\n\nReason: ${reason}\n\n${details ? 'Additional details: ' + details : ''}`;
      
      const metadata = {
        claim_id: claim.id,
        rejection_reason: reason,
        rejection_details: details
      };

      await notifications.createNotification(
        notification.sender_id,
        currentUser.id,
        notification.item_id,
        rejectionMessage,
        'claim_rejected',
        metadata
      );

      // Mark original notification as read
      await notifications.markAsRead(notificationId);

      utils.showToast('Claim rejected and notification sent', 'info');
      window.closeRejectModal();
      await loadDashboardData();
    } catch (err) {
      console.error('❌ Rejection failed:', err);
      utils.showToast(err.message || 'Failed to reject claim', 'error');
    } finally {
      hideLoading();
    }
  });

  // Close reject modal when cancel or close clicked
  document.querySelectorAll('#rejectModal .modal-close, #rejectModal .modal-cancel').forEach(el => {
    el.addEventListener('click', window.closeRejectModal);
  });

  // Approve form submit handler
  document.getElementById('approveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🚀 Approve form submitted!');
    
    const notificationId = document.getElementById('approveNotificationId').value;
    const respMessage = document.getElementById('approveMessage').value;
    const respFile = document.getElementById('approveFile').files[0];

    console.log('📋 Form data:', { notificationId, respMessage, hasFile: !!respFile });

    const notification = allNotifications.find(n => n.id === notificationId);
    if (!notification) {
      console.error('❌ Notification not found!', notificationId);
      return utils.showToast('Notification not found', 'error');
    }

    console.log('✅ Found notification:', notification);

    try {
      showLoading('Processing approval...');

      console.log('1️⃣ Getting claim details...');
      const { data: claimsList } = await claims.getUserClaims();
      console.log('Claims list:', claimsList);
      
      const claim = claimsList?.find(c => c.item_id === notification.item_id && c.claimant_id === notification.sender_id);

      if (!claim) {
        console.error('❌ Claim not found!', { 
          item_id: notification.item_id, 
          claimant_id: notification.sender_id,
          available_claims: claimsList 
        });
        throw new Error('Claim not found');
      }

      console.log('✅ Found claim:', claim);

      let responseFileUrl = null;
      if (respFile) {
        console.log('2️⃣ Uploading response file...');
        const { url, error } = await claims.uploadProofFile(respFile, currentUser.id);
        if (error) {
          console.error('❌ File upload failed:', error);
          throw new Error('Failed to upload response file');
        }
        responseFileUrl = url;
        console.log('✅ File uploaded:', url);
      } else {
        console.log('2️⃣ No file to upload, skipping...');
      }

      console.log('3️⃣ Updating claim status to approved...');
      const claimUpdateResult = await claims.updateClaimStatus(claim.id, 'approved');
      console.log('✅ Claim status updated:', claimUpdateResult);

      console.log('4️⃣ Updating item status to matched...');
      const itemUpdateResult = await items.updateItem(notification.item_id, { status: 'matched' });
      console.log('✅ Item status updated:', itemUpdateResult);

      console.log('5️⃣ Creating blockchain block...');
      const item = allItems.find(i => i.id === notification.item_id);
      console.log('Item found:', item);
      
      const claimDetails = await claims.getUserClaims();
      const claimData = claimDetails.data?.find(c => c.id === claim.id);
      console.log('Claim data for blockchain:', claimData);
      
      const blockchainResult = await blockchain.createBlock(
        notification.item_id,
        claim.id,
        currentUser.id,
        notification.sender_id,
        item.item_name,
        item.location,
        item.category,
        claimData?.claim_message,
        claimData?.proof_file_url
      );
      console.log('✅ Blockchain block created:', blockchainResult);

      console.log('6️⃣ Sending approval notification to loser...');
      const approvalMessage = `✅ Your claim for ${item.item_name} has been APPROVED!\n\n📍 Collection Location: ${item.location}\n\n${respMessage ? '💬 Founder\'s message: ' + respMessage : ''}${responseFileUrl ? '\n\n📎 Founder has attached a response file - check below!' : ''}`;
      
      const metadata = {
        claim_id: claim.id,
        response_file_url: responseFileUrl,
        response_message: respMessage,
        collection_location: item.location,
        item_contact: item.contact_info
      };

      console.log('Message:', approvalMessage);
      console.log('Metadata:', metadata);

      const { data: notifData, error: notifError } = await notifications.createNotification(
        notification.sender_id,
        currentUser.id,
        notification.item_id,
        approvalMessage,
        'claim_approved',
        metadata
      );

      console.log('📨 Notification response:', { data: notifData, error: notifError });
      
      if (notifError) {
        console.error('❌ Failed to send approval notification:', notifError);
        throw new Error('Failed to send approval notification: ' + notifError);
      }
      
      if (!notifData) {
        console.warn('⚠️ Notification sent but no data returned');
      } else {
        console.log('✅ Approval notification sent successfully! ID:', notifData.id);
      }

      console.log('7️⃣ Marking original notification as read...');
      await notifications.markAsRead(notificationId);
      console.log('✅ Notification marked as read');

      console.log('✅✅✅ APPROVAL COMPLETE! All steps successful!');
      utils.showToast('Claim approved and response sent!', 'success');
      window.closeApproveModal();
      
      console.log('8️⃣ Reloading dashboard data...');
      await loadDashboardData();
      console.log('✅ Dashboard reloaded');
    } catch (err) {
      console.error('❌❌❌ APPROVAL FAILED:', err);
      console.error('Error stack:', err.stack);
      utils.showToast(err.message || 'Failed to approve claim', 'error');
    } finally {
      hideLoading();
    }
  });

  // Close approve modal when cancel or close clicked
  document.querySelectorAll('#approveModal .modal-close, #approveModal .modal-cancel').forEach(el => {
    el.addEventListener('click', window.closeApproveModal);
  });

  // ============================================
  // MESSAGE FORM HANDLER (for Lost Items)
  // ============================================
  
  document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemId = document.getElementById('messageItemId').value;
    const ownerId = document.getElementById('messageOwnerId').value;
    const messageText = document.getElementById('messageText').value;
    const itemName = document.getElementById('messageItemName').textContent;
    
    console.log('📧 ========= SENDING MESSAGE =========');
    console.log('📧 Item ID:', itemId);
    console.log('📧 Owner ID:', ownerId);
    console.log('📧 Current User ID:', currentUser.id);
    console.log('📧 Current User Name:', currentUser.full_name);
    console.log('📧 Message Text:', messageText);
    console.log('📧 Item Name:', itemName);
    
    try {
      showLoading('Sending message...');
      
      // Create notification for the owner of the lost item
      const notifMessage = `💬 ${currentUser.full_name} sent you a message about your lost item: ${itemName}\n\nMessage: ${messageText}`;
      
      const metadata = {
        item_id: itemId,
        sender_name: currentUser.full_name,
        sender_email: currentUser.email,
        message_text: messageText,
        item_name: itemName
      };
      
      console.log('📧 Notification message:', notifMessage);
      console.log('📧 Metadata:', metadata);
      console.log('📧 Calling createNotification...');
      
      const { data, error } = await notifications.createNotification(
        ownerId,
        currentUser.id,
        itemId,
        notifMessage,
        'lost_item_message',
        metadata
      );
      
      console.log('📧 Response received:', { data, error });
      
      if (error) {
        console.error('❌ Failed to send message:', error);
        throw new Error(error);
      }
      
      console.log('✅ Message sent successfully!');
      if (data && data.id) {
        console.log('✅ Notification ID:', data.id);
      } else {
        console.log('✅ Notification created (no ID returned due to RLS)');
      }
      
      utils.showToast('Message sent successfully!', 'success');
      window.closeMessageModal();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error stack:', error.stack);
      utils.showToast(error.message || 'Failed to send message', 'error');
    } finally {
      hideLoading();
    }
  });
  
  // Close message modal when cancel or close clicked
  document.querySelectorAll('#messageModal .modal-close').forEach(el => {
    el.addEventListener('click', window.closeMessageModal);
  });
}

// Switch view
window.switchView = function(viewName) {
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`${viewName}-view`).classList.add('active');
  
  // No need to initialize map - using iframe embed now
}

// Show modal
function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('show');
  });
}

// Handle add item
async function handleAddItem(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const itemType = formData.get('itemType');
  const itemName = formData.get('itemName');
  const category = formData.get('category');
  const description = formData.get('description');
  const location = formData.get('location');
  const date = formData.get('date');
  const contactInfo = formData.get('contactInfo');
  const imageFile = formData.get('image');
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  try {
    let imageUrl = null;
    
    // Upload image if provided
    if (imageFile && imageFile.size > 0) {
      const tempId = Date.now().toString();
      const { url, error } = await items.uploadImage(imageFile, tempId);
      if (error) throw new Error('Failed to upload image');
      imageUrl = url;
    }
    
    // Create item
    const { data, error } = await items.createItem({
      item_name: itemName,
      category,
      description,
      location,
      date_found_lost: date,
      contact_info: contactInfo,
      image_url: imageUrl,
      item_type: itemType,
      status: 'active'
    });
    
    if (error) throw new Error(error);
    
    utils.showToast('Item added successfully!', 'success');
    closeAllModals();
    e.target.reset();
    await loadItems();
    updateStats();
    
  } catch (error) {
    utils.showToast(error.message || 'Failed to add item', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Item';
  }
}

// Show item detail
window.showItemDetail = function(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;
  
  const content = document.getElementById('itemDetailContent');
  content.innerHTML = `
    <div style="padding: 1.5rem;">
      ${item.image_url ? `<img src="${item.image_url}" style="width: 100%; border-radius: 12px; margin-bottom: 1.5rem;">` : ''}
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <h2>${item.item_name}</h2>
        <span class="item-badge badge-${item.item_type}">${item.item_type === 'found' ? '🟢 Found' : '🔵 Lost'}</span>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Category:</strong> ${item.category}
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Description:</strong><br>${item.description}
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Location:</strong> ${item.location}
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Date:</strong> ${new Date(item.date_found_lost).toLocaleDateString()}
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Contact:</strong> ${item.contact_info}
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Posted by:</strong> ${item.users?.full_name || 'Unknown'} (${item.users?.email || ''})
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Status:</strong> ${item.status}
      </div>
      ${item.user_id !== currentUser.id && item.item_type === 'found' ? `
        <button class="btn-primary" onclick="closeAllModals(); showClaimModal('${item.id}', '${item.user_id}')">
          <i class="fas fa-hand-paper"></i> Claim This Item
        </button>
      ` : ''}
    </div>
  `;
  
  showModal('itemDetailModal');
}

// Show claim modal
window.showClaimModal = function(itemId, ownerId) {
  document.getElementById('claimItemId').value = itemId;
  document.getElementById('claimOwnerId').value = ownerId;
  document.getElementById('claimMessage').value = '';
  showModal('claimModal');
}

// Handle submit claim
async function handleSubmitClaim(e) {
  e.preventDefault();
  
  const itemId = document.getElementById('claimItemId').value;
  const ownerId = document.getElementById('claimOwnerId').value;
  const message = document.getElementById('claimMessage').value;
  const proofFile = document.getElementById('claimProof').files[0];
  
  console.log('🚀 Starting claim submission:', { itemId, ownerId, hasFile: !!proofFile });
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  
  try {
    let proofFileUrl = null;
    
    // Upload proof file if provided
    if (proofFile) {
      console.log('📤 Uploading proof file:', proofFile.name, 'Size:', proofFile.size);
      showLoading('Uploading proof file...');
      
      try {
        const { url, error: uploadError } = await claims.uploadProofFile(proofFile, currentUser.id);
        
        if (uploadError) {
          console.error('❌ Upload failed:', uploadError);
          throw new Error(`File upload failed: ${uploadError}. Check if 'claim-proofs' bucket exists in Supabase Storage!`);
        }
        
        console.log('✅ File uploaded successfully:', url);
        proofFileUrl = url;
      } catch (uploadErr) {
        hideLoading();
        throw new Error(`File upload error: ${uploadErr.message}`);
      } finally {
        hideLoading();
      }
    }
    
    // Create claim with proof file URL
    console.log('💾 Creating claim record...');
    showLoading('Creating claim...');
    
    const { data: claimData, error: claimError } = await claims.createClaim(itemId, ownerId, message, proofFileUrl);
    
    if (claimError) {
      console.error('❌ Claim creation failed:', claimError);
      hideLoading();
      throw new Error(`Failed to create claim: ${claimError}. Check RLS policies!`);
    }
    
    console.log('✅ Claim created:', claimData);
    hideLoading();
    
    // Get item details
    const item = allItems.find(i => i.id === itemId);
    
    if (!item) {
      throw new Error('Item not found!');
    }
    
    // Create notification with proof file URL in metadata
    const notifMessage = `${currentUser.full_name} has claimed your found item: ${item.item_name}. Message: ${message}`;
    const metadata = {
      claim_id: claimData.id,
      proof_file_url: proofFileUrl,
      claim_message: message
    };
    
    // DEBUG: Log metadata being sent
    console.log('📤 Sending notification with metadata:', {
      recipientId: ownerId,
      senderId: currentUser.id,
      itemId,
      message: notifMessage,
      type: 'claim_request',
      metadata
    });
    
    showLoading('Sending notification...');
    
    const { data: notifData, error: notifError } = await notifications.createNotification(
      ownerId,
      currentUser.id,
      itemId,
      notifMessage,
      'claim_request',
      metadata
    );
    
    hideLoading();
    
    console.log('📨 Notification creation response:', { data: notifData, error: notifError });
    
    if (notifError) {
      console.error('❌ Notification creation failed!');
      console.error('Error details:', notifError);
      throw new Error(`Failed to send notification: ${notifError}`);
    }
    
    if (!notifData) {
      console.error('❌ Notification created but no data returned!');
      // Continue anyway - notification might be created but not returned due to RLS
      console.log('⚠️ Continuing - notification may have been created');
    }
    
    console.log('✅ Notification sent successfully!');
    if (notifData && notifData.id) {
      console.log('Notification ID:', notifData.id);
    }
    console.log('Recipient:', ownerId);
    
    // Show success notification in modal
    document.getElementById('claimSubmitNotification').style.display = 'block';
    document.getElementById('claimMessage').value = '';
    document.getElementById('claimProof').value = '';
    
    setTimeout(() => {
      document.getElementById('claimSubmitNotification').style.display = 'none';
      closeAllModals();
      utils.showToast('Claim submitted successfully! The finder will review your request.', 'success');
    }, 2000);
    
  } catch (error) {
    utils.showToast(error.message || 'Failed to submit claim', 'error');
  } finally {
    hideLoading();
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-hand-paper"></i> Submit Claim';
  }
}

// Mark all as read
async function markAllRead() {
  for (const notif of allNotifications) {
    if (notif.status === 'unread') {
      await notifications.markAsRead(notif.id);
    }
  }
  await loadNotifications();
}

// Apply filters
function applyFilters() {
  const typeFilter = document.getElementById('filterType').value;
  const categoryFilter = document.getElementById('filterCategory').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  
  let filtered = [...allItems];
  
  // Exclude matched items by default (unless user specifically filters for them)
  if (statusFilter !== 'matched') {
    filtered = filtered.filter(item => item.status !== 'matched');
  }
  
  if (typeFilter) {
    filtered = filtered.filter(item => item.item_type === typeFilter);
  }
  
  if (categoryFilter) {
    filtered = filtered.filter(item => item.category === categoryFilter);
  }
  
  if (statusFilter) {
    filtered = filtered.filter(item => item.status === statusFilter);
  }
  
  if (searchText) {
    filtered = filtered.filter(item => 
      item.item_name.toLowerCase().includes(searchText) ||
      item.location.toLowerCase().includes(searchText) ||
      item.description.toLowerCase().includes(searchText) ||
      item.category.toLowerCase().includes(searchText) ||
      item.contact_info.toLowerCase().includes(searchText)
    );
  }
  
  renderFilteredItems(filtered);
}

// Render filtered items
function renderFilteredItems(filteredItems) {
  const grid = document.getElementById('itemsGrid');
  
  if (filteredItems.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No items match your filters</p></div>';
    return;
  }
  
  // Use the same render logic as renderItems but with filtered data
  const tempItems = allItems;
  allItems = filteredItems;
  renderItems();
  allItems = tempItems;
}

// Clear filters
function clearFilters() {
  document.getElementById('filterType').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('searchInput').value = '';
  renderItems();
}

// Export items to CSV
function exportItemsToCSV() {
  if (allItems.length === 0) {
    utils.showToast('No items to export', 'warning');
    return;
  }
  
  // CSV headers
  const headers = ['Item Name', 'Type', 'Category', 'Status', 'Location', 'Date', 'Description', 'Contact', 'Posted By'];
  
  // CSV rows
  const rows = allItems.map(item => [
    item.item_name,
    item.item_type,
    item.category,
    item.status,
    item.location,
    new Date(item.date_found_lost).toLocaleDateString(),
    item.description.replace(/,/g, ';'), // Replace commas to avoid CSV issues
    item.contact_info,
    item.users?.full_name || 'Unknown'
  ]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `lost-and-found-items-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  utils.showToast('Items exported successfully!', 'success');
}

// Filter blockchain
function filterBlockchain() {
  const searchText = document.getElementById('blockchainSearch').value.toLowerCase();
  
  const filtered = allBlocks.filter(block =>
    block.product_name.toLowerCase().includes(searchText) ||
    block.location.toLowerCase().includes(searchText) ||
    block.finder_email.toLowerCase().includes(searchText) ||
    block.loser_email.toLowerCase().includes(searchText)
  );
  
  renderFilteredBlockchain(filtered);
}

// Sort blockchain
function sortBlockchain() {
  const sortBy = document.getElementById('blockchainSort').value;
  let sorted = [...allBlocks];
  
  switch (sortBy) {
    case 'date':
      sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      break;
    case 'date-asc':
      sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      break;
    case 'product':
      sorted.sort((a, b) => a.product_name.localeCompare(b.product_name));
      break;
    case 'location':
      sorted.sort((a, b) => a.location.localeCompare(b.location));
      break;
  }
  
  renderFilteredBlockchain(sorted);
}

// Render filtered blockchain
function renderFilteredBlockchain(filteredBlocks) {
  const container = document.getElementById('blockchainChain');
  
  if (filteredBlocks.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-link"></i><p>No blockchain records match your search</p></div>';
    return;
  }
  
  const tempBlocks = allBlocks;
  allBlocks = filteredBlocks;
  renderBlockchain();
  allBlocks = tempBlocks;
}

// Handle image preview
function handleImagePreview(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('imagePreview');
  
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
    preview.style.display = 'none';
  }
}

// REMOVED DUPLICATE EVENT LISTENERS (now in setupEventListeners)

// Handle logout
async function handleLogout() {
  const confirmed = confirm('Are you sure you want to logout?');
  if (!confirmed) return;
  
  const { error } = await auth.signOut();
  if (error) {
    utils.showToast('Failed to logout', 'error');
    return;
  }
  
  window.location.href = '/login';
}

// File ends here - all event listeners moved to setupEventListeners()
