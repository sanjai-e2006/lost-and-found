// Supabase Client - Universal compatibility wrapper
// Works with both script tag and ES module imports

const SUPABASE_URL = 'https://wrhlkisiglmhncwqykac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaGxraXNpZ2xtaG5jd3F5a2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjU2NTYsImV4cCI6MjA3NjQ0MTY1Nn0.UmAXq7_Yyik3l7L6VTOyb34bSBkYe8z1z6H3e0HlXB8';

// Check if Supabase is loaded from script tag (global)
let supabaseClient;

if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
  // Loaded from script tag
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase loaded from global script tag');
} else {
  console.warn('⚠️ Supabase not found in global scope, dashboard may not work');
}

// Export for ES modules
export const supabase = supabaseClient;

// Auth functions
export const auth = {
  async signUp(email, password, fullName, phone) {
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (authError) throw authError;
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (authData.user) {
        const { error: dbError } = await supabaseClient
          .from('users')
          .upsert([{
            id: authData.user.id,
            email: email,
            full_name: fullName,
            phone: phone || null
          }], { onConflict: 'id' });

        if (dbError) console.warn('User table insert warning:', dbError);
      }

      return { data: authData, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) console.warn('User not in users table');
      return { data: { ...data, userData }, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async signInWithGoogle() {
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async signOut() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error) throw error;

      if (user) {
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        return { user: userData, error: null };
      }

      return { user: null, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  async isAuthenticated() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      return session !== null;
    } catch (error) {
      return false;
    }
  }
};

// Items functions
export const items = {
  async createItem(itemData) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseClient
        .from('items')
        .insert([{ ...itemData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getAllItems(filters = {}) {
    try {
      let query = supabaseClient
        .from('items')
        .select(`*, users (full_name, email, phone)`)
        .order('created_at', { ascending: false });

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.itemType) query = query.eq('item_type', filters.itemType);
      if (filters.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getUserItems() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async updateItem(itemId, updates) {
    try {
      const { data, error } = await supabaseClient
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async deleteItem(itemId) {
    try {
      const { error } = await supabaseClient.from('items').delete().eq('id', itemId);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  async uploadImage(file, itemId) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('item-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('item-images')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error) {
      return { url: null, error: error.message };
    }
  }
};

// Notifications functions
export const notifications = {
  async createNotification(recipientId, senderId, itemId, message, type, metadata = {}) {
    try {
      const { data, error } = await supabaseClient
        .from('notifications')
        .insert([{
          recipient_id: recipientId,
          sender_id: senderId,
          item_id: itemId,
          message: message,
          type: type,
          metadata: metadata,
          status: 'unread'
        }])
        .select();

      if (error) return { data: null, error: error.message };
      return { data: data && data.length > 0 ? data[0] : { success: true }, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getUserNotifications() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseClient
        .from('notifications')
        .select(`
          *,
          sender:sender_id (full_name, email),
          item:item_id (item_name, category, image_url)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async markAsRead(notificationId) {
    try {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Blockchain functions
export const blockchain = {
  async createHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async getLastBlock() {
    try {
      const { data, error } = await supabaseClient
        .from('blockchain')
        .select('*')
        .order('block_index', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async createBlock(itemId, claimId, finderId, loserId, productName, location, category, claimMessage = null, proofFileUrl = null) {
    try {
      const { data: lastBlock } = await this.getLastBlock();
      const blockIndex = lastBlock ? lastBlock.block_index + 1 : 1;
      const previousHash = lastBlock ? lastBlock.block_hash : '0000000000000000000000000000000000000000000000000000000000000000';

      const { data: finder } = await supabaseClient.from('users').select('email, full_name, phone').eq('id', finderId).single();
      const { data: loser } = await supabaseClient.from('users').select('email, full_name, phone').eq('id', loserId).single();

      if (!finder || !loser) throw new Error('Could not fetch user details');

      const difficulty = 2;
      let nonce = 0;
      let blockHash = '';
      
      while (true) {
        const blockData = {
          block_index: blockIndex,
          previous_hash: previousHash,
          timestamp: new Date().toISOString(),
          item_id: itemId,
          claim_id: claimId,
          finder_id: finderId,
          loser_id: loserId,
          finder_email: finder.email,
          loser_email: loser.email,
          finder_name: finder.full_name,
          loser_name: loser.full_name,
          product_name: productName,
          location: location,
          category: category,
          claim_message: claimMessage,
          proof_file_url: proofFileUrl,
          nonce: nonce
        };

        blockHash = await this.createHash(blockData);
        if (blockHash.startsWith('0'.repeat(difficulty))) break;
        nonce++;
        if (nonce > 10000) break;
      }

      const { data, error } = await supabaseClient
        .from('blockchain')
        .insert([{
          block_index: blockIndex,
          block_hash: blockHash,
          previous_hash: previousHash,
          timestamp: new Date().toISOString(),
          nonce: nonce,
          difficulty: difficulty,
          item_id: itemId,
          claim_id: claimId,
          finder_id: finderId,
          loser_id: loserId,
          finder_email: finder.email,
          loser_email: loser.email,
          finder_name: finder.full_name,
          loser_name: loser.full_name,
          product_name: productName,
          location: location,
          category: category,
          claim_message: claimMessage,
          proof_file_url: proofFileUrl,
          finder_address: finder.phone || 'N/A',
          loser_address: loser.phone || 'N/A',
          verification_status: 'verified'
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getAllBlocks(filters = {}) {
    try {
      const { data, error } = await supabaseClient
        .from('blockchain')
        .select('*')
        .order('block_index', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }
};

// Claims functions
export const claims = {
  async uploadProofFile(file, userId) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabaseClient.storage
        .from('claim-proofs')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('claim-proofs')
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (error) {
      return { url: null, error: error.message };
    }
  },

  async createClaim(itemId, ownerId, claimMessage, proofFileUrl = null) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseClient
        .from('claims')
        .insert([{
          item_id: itemId,
          claimant_id: user.id,
          owner_id: ownerId,
          claim_message: claimMessage,
          proof_file_url: proofFileUrl
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async updateClaimStatus(claimId, status) {
    try {
      const { data, error } = await supabaseClient
        .from('claims')
        .update({ status })
        .eq('id', claimId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  async getUserClaims() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseClient
        .from('claims')
        .select(`
          *,
          item:item_id (*),
          claimant:claimant_id (full_name, email),
          owner:owner_id (full_name, email)
        `)
        .or(`claimant_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }
};

// Utility functions
export const utils = {
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
      color: white;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.style.opacity = '1', 100);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  async checkAuthAndRedirect(requireAuth = true) {
    if (!requireAuth) return true;
    
    const isAuth = await auth.isAuthenticated();
    if (!isAuth) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }
};
