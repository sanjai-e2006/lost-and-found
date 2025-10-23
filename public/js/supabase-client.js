// Supabase Client Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://wrhlkisiglmhncwqykac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaGxraXNpZ2xtaG5jd3F5a2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjU2NTYsImV4cCI6MjA3NjQ0MTY1Nn0.UmAXq7_Yyik3l7L6VTOyb34bSBkYe8z1z6H3e0HlXB8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication Helper Functions
export const auth = {
  // Sign Up
  async signUp(email, password, fullName, phone) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
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

      // Wait a moment for auth session to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Insert user data into users table
      if (authData.user) {
        const { error: dbError } = await supabase
          .from('users')
          .upsert([
            {
              id: authData.user.id,
              email: email,
              full_name: fullName,
              phone: phone || null
            }
          ], {
            onConflict: 'id'
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          // Don't throw error - user is created in auth, just log it
          // They can still login, we'll handle user table insert on first login
        }
      }

      return { data: authData, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Sign In
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Verify user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) throw userError;

      return { data: { ...data, userData }, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Sign In with Google
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Sign Out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Get Current User
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      if (user) {
        // Get full user data from users table
        const { data: userData, error: userError } = await supabase
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

  // Check if user is authenticated
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  }
};

// Items Helper Functions
export const items = {
  // Create Item
  async createItem(itemData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('items')
        .insert([
          {
            ...itemData,
            user_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Get All Items
  async getAllItems(filters = {}) {
    try {
      let query = supabase
        .from('items')
        .select(`
          *,
          users (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.itemType) {
        query = query.eq('item_type', filters.itemType);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Get User Items
  async getUserItems() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
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

  // Update Item
  async updateItem(itemId, updates) {
    try {
      const { data, error } = await supabase
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

  // Delete Item
  async deleteItem(itemId) {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Upload Image
  async uploadImage(file, itemId) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error) {
      return { url: null, error: error.message };
    }
  }
};

// Notifications Helper Functions
export const notifications = {
  // Create Notification
  async createNotification(recipientId, senderId, itemId, message, type, metadata = {}) {
    try {
      console.log('📨 [NOTIFICATION] Starting creation...');
      console.log('📨 [NOTIFICATION] Recipient ID:', recipientId);
      console.log('📨 [NOTIFICATION] Sender ID:', senderId);
      console.log('📨 [NOTIFICATION] Item ID:', itemId);
      console.log('📨 [NOTIFICATION] Message:', message);
      console.log('📨 [NOTIFICATION] Type:', type);
      console.log('📨 [NOTIFICATION] Metadata:', JSON.stringify(metadata));

      const insertData = {
        recipient_id: recipientId,
        sender_id: senderId,
        item_id: itemId,
        message: message,
        type: type,
        metadata: metadata,
        status: 'unread'
      };

      console.log('📨 [NOTIFICATION] Insert data:', insertData);

      const { data, error } = await supabase
        .from('notifications')
        .insert([insertData])
        .select();

      console.log('📨 [NOTIFICATION] Supabase response - data:', data);
      console.log('📨 [NOTIFICATION] Supabase response - error:', error);

      // Get the first notification from the array (if any)
      const notification = data && data.length > 0 ? data[0] : null;

      if (error) {
        console.error('❌ [NOTIFICATION] Insert failed!');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        return { data: null, error: error.message };
      }
      
      // RLS disabled edge case: INSERT succeeded but SELECT returned empty array
      if (!notification) {
        console.warn('⚠️ [NOTIFICATION] Notification created but no data returned (RLS edge case)');
        // Return success because there was no error
        return { 
          data: { 
            success: true,
            message: 'Notification created successfully' 
          }, 
          error: null 
        };
      }

      console.log('✅ [NOTIFICATION] Successfully created:', notification.id);
      return { data: notification, error: null };
    } catch (error) {
      console.error('❌ [NOTIFICATION] Exception caught:', error);
      console.error('Exception name:', error.name);
      console.error('Exception message:', error.message);
      console.error('Exception stack:', error.stack);
      return { data: null, error: error.message };
    }
  },

  // Get User Notifications
  async getUserNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id (full_name, email),
          item:item_id (item_name, category, image_url)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // DEBUG: Log fetched notifications
      console.log('📥 Fetched notifications from DB:', data);
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Mark as Read
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
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

// Blockchain Helper Functions
export const blockchain = {
  // Create SHA-256 Hash
  async createHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  // Get Last Block
  async getLastBlock() {
    try {
      const { data, error } = await supabase
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

  // Create Block with Proof of Work (like land record system)
  async createBlock(itemId, claimId, finderId, loserId, productName, location, category, claimMessage = null, proofFileUrl = null) {
    try {
      // Get last block
      const { data: lastBlock } = await this.getLastBlock();
      const blockIndex = lastBlock ? lastBlock.block_index + 1 : 1;
      const previousHash = lastBlock ? lastBlock.block_hash : '0000000000000000000000000000000000000000000000000000000000000000';

      // Get user details
      const { data: finder } = await supabase
        .from('users')
        .select('email, full_name, phone')
        .eq('id', finderId)
        .single();

      const { data: loser } = await supabase
        .from('users')
        .select('email, full_name, phone')
        .eq('id', loserId)
        .single();

      if (!finder || !loser) {
        throw new Error('Could not fetch user details');
      }

      const difficulty = 2; // Require hash to start with "00"
      let nonce = 0;
      let blockHash = '';
      
      // Proof of Work mining
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
        
        // Check if hash meets difficulty requirement
        if (blockHash.startsWith('0'.repeat(difficulty))) {
          console.log(`✅ Block mined! Nonce: ${nonce}, Hash: ${blockHash}`);
          break;
        }
        
        nonce++;
        
        // Prevent infinite loop (max 10000 attempts)
        if (nonce > 10000) {
          console.warn('⚠️ Mining took too long, using current hash');
          break;
        }
      }

      // Insert into blockchain
      const { data, error } = await supabase
        .from('blockchain')
        .insert([
          {
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
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Blockchain insert error:', error);
        throw error;
      }
      
      console.log('✅ Blockchain block created:', data);
      return { data, error: null };
    } catch (error) {
      console.error('❌ createBlock error:', error);
      return { data: null, error: error.message };
    }
  },

  // Get All Blocks
  async getAllBlocks(filters = {}) {
    try {
      let query = supabase
        .from('blockchain')
        .select('*')
        .order('block_index', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  }
};

// Claims Helper Functions
export const claims = {
  // Upload Proof File
  async uploadProofFile(file, userId) {
    try {
      console.log('📤 [UPLOAD] Starting file upload...');
      console.log('📤 [UPLOAD] File name:', file.name);
      console.log('📤 [UPLOAD] File size:', file.size, 'bytes');
      console.log('📤 [UPLOAD] File type:', file.type);
      console.log('📤 [UPLOAD] User ID:', userId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      console.log('📤 [UPLOAD] Upload path:', fileName);
      console.log('📤 [UPLOAD] Target bucket: claim-proofs');

      // Set a timeout for upload (30 seconds max)
      const uploadPromise = supabase.storage
        .from('claim-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      );

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

      if (error) {
        console.error('❌ [UPLOAD] Upload failed!');
        console.error('Error code:', error.statusCode);
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        throw error;
      }

      console.log('✅ [UPLOAD] File uploaded successfully:', data.path);
      console.log('📤 [UPLOAD] Getting public URL...');

      const { data: { publicUrl } } = supabase.storage
        .from('claim-proofs')
        .getPublicUrl(fileName);

      console.log('✅ [UPLOAD] Public URL:', publicUrl);

      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('❌ [UPLOAD] Exception:', error.message);
      
      // Check if bucket exists
      if (error.message?.includes('not found') || error.statusCode === 404) {
        return { url: null, error: 'Storage bucket "claim-proofs" not found. Please create it in Supabase Dashboard → Storage.' };
      }
      
      if (error.message?.includes('timeout')) {
        return { url: null, error: 'Upload timed out. File might be too large or network is slow.' };
      }
      
      return { url: null, error: error.message };
    }
  },

  // Create Claim
  async createClaim(itemId, ownerId, claimMessage, proofFileUrl = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('📝 Creating claim with data:', {
        item_id: itemId,
        claimant_id: user.id,
        owner_id: ownerId,
        claim_message: claimMessage,
        proof_file_url: proofFileUrl
      });

      const { data, error } = await supabase
        .from('claims')
        .insert([
          {
            item_id: itemId,
            claimant_id: user.id,
            owner_id: ownerId,
            claim_message: claimMessage,
            proof_file_url: proofFileUrl
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase claims insert error:', error);
        throw error;
      }
      
      console.log('✅ Claim created successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('❌ createClaim exception:', error);
      return { data: null, error: error.message };
    }
  },

  // Update Claim Status
  async updateClaimStatus(claimId, status) {
    try {
      const { data, error } = await supabase
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

  // Get User Claims
  async getUserClaims() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
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

// Utility Functions
export const utils = {
  // Show Toast Notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  },

  // Format Date
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Check Auth and Redirect
  async checkAuthAndRedirect(requireAuth = true) {
    const isAuth = await auth.isAuthenticated();
    
    if (requireAuth && !isAuth) {
      window.location.href = '/login';
      return false;
    }
    
    if (!requireAuth && isAuth) {
      window.location.href = '/dashboard';
      return false;
    }
    
    return true;
  }
};
