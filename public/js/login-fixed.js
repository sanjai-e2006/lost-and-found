// Initialize Supabase client (loaded from CDN script tag)
const { createClient } = supabase;
const supabaseClient = createClient(
  'https://wrhlkisiglmhncwqykac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaGxraXNpZ2xtaG5jd3F5a2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjU2NTYsImV4cCI6MjA3NjQ0MTY1Nn0.UmAXq7_Yyik3l7L6VTOyb34bSBkYe8z1z6H3e0HlXB8'
);

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  // Handle form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    
    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Validation
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data || !data.user) {
        throw new Error('User not found. Please sign up first.');
      }
      
      // Show success message
      showSuccess('Login successful! Redirecting...');
      showToast('Login successful!', 'success');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
      
    } catch (error) {
      let errorMsg = 'Invalid email or password';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMsg = 'Invalid email or password. Please check your credentials.';
      } else if (error.message.includes('not found')) {
        errorMsg = 'Account not found. Please sign up first.';
      } else {
        errorMsg = error.message;
      }
      
      showError(errorMsg);
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  });
  
  // Handle Google Login
  googleLoginBtn.addEventListener('click', async () => {
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
    
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard.html'
        }
      });
      
      if (error) throw error;
    } catch (error) {
      showError(error.message || 'Failed to login with Google');
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
    }
  });
  
  // Helper functions
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    showToast(message, 'error');
  }
  
  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
  }
  
  function showToast(message, type = 'info') {
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
  }
});
