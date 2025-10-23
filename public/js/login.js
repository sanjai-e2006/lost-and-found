import { auth, utils } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is already logged in
  await utils.checkAuthAndRedirect(false);

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
      // Sign in user - this will automatically check the database
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        throw new Error(error);
      }
      
      if (!data || !data.user) {
        throw new Error('User not found. Please sign up first.');
      }
      
      // Show success message
      showSuccess('Login successful! Redirecting...');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
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
      const { error } = await auth.signInWithGoogle();
      if (error) {
        throw new Error(error);
      }
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
    utils.showToast(message, 'error');
  }
  
  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    utils.showToast(message, 'success');
  }
});
