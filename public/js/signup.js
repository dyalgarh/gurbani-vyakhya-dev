async function submitSignup(payload) {
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!data.success) {
      alert(data.message || 'Something went wrong message')
      return
    }
    else{
        signupForm.reset();
        if (data.success && data.checkout_url) {
            // Redirect user to Stripe Checkout
            window.location.href = data.checkout_url;
          } else{

            alert(data.message)
          }
    }
    
  } catch (e) {
    alert('Network error')
  }
}
const signupForm = document.getElementById("signupForm");
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const action = e.submitter.dataset.action;
  submitSignup({
    path_id: signupForm.path?.value || '',
    name: signupForm.name?.value || '',
    email: signupForm.email?.value || null,
    phone: signupForm.phone?.value || null,
    delivery_method: document.querySelector('input[name="delivery"]:checked')?.value || 'email',
    subscription_type: action === 'paid' ? 'paid' : 'free',
  });
  
});
