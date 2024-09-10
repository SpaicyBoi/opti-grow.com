import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, updateProfile, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// Replace with your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3zv_wC_XeZxd_EVpJuhxLCYOmzdiG2ng",
  authDomain: "swift-guard.firebaseapp.com",
  projectId: "swift-guard",
  storageBucket: "swift-guard.appspot.com",
  messagingSenderId: "72696694336",
  appId: "1:72696694336:web:27613e8861bf16f3da41a5",
  measurementId: "G-RJYSQJ38WM"
};


const app = initializeApp(firebaseConfig);
console.log('App initialized:', app);

const auth = getAuth(app);
console.log('Auth initialized:', auth);

const db = getFirestore(app);
console.log('Firestore initialized:', db);

const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Get input values from the form
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const passwordInput = document.querySelector('input[type="password"]');
  const confirmPasswordInput = document.querySelector('input[type="password"][placeholder="Confirm Password"]');
  //const authMethodSelect = document.getElementById('authMethod');
  //if (!authMethodSelect) {
   // console.error('Auth method select not found');
    //return;
  //}

  // Basic input validation
  if (!nameInput.value.trim()) {
    alert('Please enter your name');
    return;
  }

  if (!emailInput.value.trim()) {
    alert('Please enter an email address');
    return;
  }
  
  // Create a new Firebase user
  createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(error => {
      if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address');
      } else {
        alert('Error creating user: ' + error.message);
      }
    });

    function isValidPhoneNumber(phoneNumber) {
      const phoneRegex = /^\+254\d{9}$/;
      return phoneRegex.test(phoneNumber);
    }
  
  if (!phoneNumberInput.value.trim() || !isValidPhoneNumber(phoneNumberInput.value)) {
  alert('Please enter a valid phone number');
  return;
  }

  if (passwordInput.value !== confirmPasswordInput.value) {
    alert('Passwords do not match');
    return;
  }

  // ... other input validations

  try {
    showLoadingIndicator();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim();
    const password = passwordInput.value;
    const authMethod = authMethodSelect.value;

    if (authMethod === 'emailPassword') {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name }); // Update user profile with name
      await sendEmailVerification(user);

      // Implement 2FA setup (e.g., prompt user to enable 2FA)
      // ...

      // Store additional user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        phoneNumber,
        passwordInput
        // Add other fields as needed
      });
    } else if (authMethod === 'phoneNumber') {
      const appVerifier = new RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved
        }
      }, auth);

      const phoneNumber = document.getElementById('phoneNumber').value;

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);

      // Handle code input, resends, and timeouts
      let codeResends = 2; // Allow two code resends
      let codeExpireTime = Date.now() + 120000; // Code expires in 2 minutes

      const codeInput = document.getElementById('verificationCode');
      codeInput.addEventListener('keyup', async (event) => {
        if (event.key === 'Enter') {
          try {
            const code = codeInput.value;
            const userCredential = await confirmationResult.confirm(code);
            const user = userCredential.user;

            // Store additional user data in Firestore
            await setDoc(doc(db, 'users', user.uid), {
              name,
              email,
              phoneNumber,
              // Add other fields as needed
            });
            // ... rest of the code for successful signup
          } catch (error) {
            // Handle code verification error
          }
        }
      });

      const resendButton = document.getElementById('resendButton');
      resendButton.addEventListener('click', async () => {
        if (codeResends > 0) {
          // Resend verification code
          codeResends--;
          // Update UI to reflect remaining resends
          // ...
        } else {
          // Handle no more resends
          // ...
        }
      });

      // ...
    } else {
      // Handle invalid authentication method
      console.error('Invalid authentication method');
      // Provide feedback to the user
    }

    hideLoadingIndicator();
    showSuccessMessage();
  } catch (error) {
    console.error('Error creating user:', error);
    hideLoadingIndicator();
    
  }
});

// Helper functions for loading indicators, error messages, and success messages
/*function showLoadingIndicator() {
  // Implement logic to display a loading indicator
  // Example: show a spinner or overlay
}

function hideLoadingIndicator() {
  // Implement logic to hide the loading indicator
  // Example: remove the spinner or overlay
}

function showErrorMessage(message) {
  // Implement logic to display an error message
  // Example: show an alert or display the message in a designated element
}

function showSuccessMessage() {
  // Implement logic to display a success message
  // Example: show a confirmation message or redirect to a success page
}*/

// Additional functions for input validation
function isValidEmail(email) {
  // Implement email validation logic
}

function isValidPhoneNumber(phoneNumber) {
  // Implement phone number validation logic
}

// ... your existing JavaScript code ...

// Helper functions for loading indicators, error messages, and success messages
function showLoadingIndicator() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  loadingIndicator.style.display = 'block';
  loadingIndicator.textContent = 'Loading...';
}

function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  loadingIndicator.style.display = 'none';
}

function showErrorMessage() {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.style.display = 'block';
  errorMessage.textContent = 'Signup Failed';
}

function showSuccessMessage() {
  const successMessage = document.getElementById('successMessage');
  successMessage.style.display = 'block';
  successMessage.textContent = 'Signup successful!';
}
