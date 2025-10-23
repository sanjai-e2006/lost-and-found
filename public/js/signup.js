import { auth, utils } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
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
      const { data, error } = await auth.signUp(email, password, fullName, phone);
      
      if (error) {
        throw new Error(error);
      }
      
      // Show success message
      showSuccess('Account created successfully! Logging you in...');
      
      // Wait a moment then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
      
    } catch (error) {
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
      const { error } = await auth.signInWithGoogle();
      if (error) {
        throw new Error(error);
      }
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
    utils.showToast(message, 'error');
  }
  
  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    utils.showToast(message, 'success');
  }
});
