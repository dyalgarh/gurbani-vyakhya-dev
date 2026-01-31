async function submitSignup(payload, buttonText) {
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!data.success) {
      errorContainer.textContent = data.message || "An error occurred.";
      errorContainer.classList.remove("hidden");

      // Re-enable button and restore text
      submitButton.disabled = false;
      submitButton.textContent = buttonText;
      return
    }
    else{
        signupForm.reset();
        if (data.success && data.checkout_url) {
            // Redirect user to Stripe Checkout
            window.location.href = data.checkout_url;
          } else{

            window.location.href = "/thank-you";
          }
    }
    
  } catch (e) {
    alert('Network error')
  }
}
const signupForm = document.getElementById("signupForm");
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  errorContainer.classList.add("hidden");
  errorContainer.textContent = "";
  const submitButton = e.submitter; // button clicked
  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Processing...";

  const action = e.submitter.dataset.action;
  let deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value || 'email';
  // Set email or phone to null based on delivery method
  let emailValue = signupForm.email?.value || null;
  let phoneValue = signupForm.phone?.value || null;

  if (deliveryMethod === 'email') {
    phoneValue = null;
  } else if (deliveryMethod === 'sms') {
    emailValue = null;
  }
  
  submitSignup({
    path_id: signupForm.path?.value || '',
    name: signupForm.name?.value || '',
    email: emailValue,
    phone: phoneValue,
    delivery_method: deliveryMethod,
    subscription_type: action === 'paid' ? 'paid' : 'free',
  },originalText);
});


function toggleFaq(button) {
        const faqItem = button.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all other FAQs
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Toggle current FAQ
        if (!isActive) {
            faqItem.classList.add('active');
        }
    }