// Initialize Supabase client (loaded from CDN script tag)
const { createClient } = supabase;
const supabaseClient = createClient(
  'https://wrhlkisiglmhncwqykac.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaGxraXNpZ2xtaG5jd3F5a2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjU2NTYsImV4cCI6MjA3NjQ0MTY1Nn0.UmAXq7_Yyik3l7L6VTOyb34bSBkYe8z1z6H3e0HlXB8'
);

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const signupBtn = document.getElementById('signupBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  // Handle form submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    
    // Get form values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      showError('Please fill in all required fields');
      return;
    }
    
    if (fullName.length < 3) {
      showError('Full name must be at least 3 characters long');
      return;
    }
    
    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    // Disable button and show loading
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    
    try {
      // Sign up user
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

      // Wait for auth session
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Insert user data into users table
      if (authData.user) {
        const { error: dbError } = await supabaseClient
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
          console.warn('User table insert warning:', dbError);
        }
      }
      
      // Show success message
      showSuccess('Account created successfully! Logging you in...');
      showToast('Account created successfully!', 'success');
      
      // Wait a moment then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
      
    } catch (error) {
      console.error('Signup error:', error);
      showError(error.message || 'Failed to create account. Please try again.');
      signupBtn.disabled = false;
      signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  });
  
  // Handle Google Sign Up
  googleSignupBtn.addEventListener('click', async () => {
    googleSignupBtn.disabled = true;
    googleSignupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
    
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard.html'
        }
      });
      
      if (error) throw error;
    } catch (error) {
      showError(error.message || 'Failed to sign up with Google');
      googleSignupBtn.disabled = false;
      googleSignupBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
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
