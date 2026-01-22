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

    alert('You will start receiving reflections from tomorrow.')
  } catch (e) {
    alert('Network error')
  }
}

function onSignUpClick() {
    const form = document.forms['signupForm']
  submitSignup({
    path_id: form.path?.value || '',
    name: form.name?.value || '',
    email: form.email?.value || null,
    phone: form.phone?.value || null,
    delivery_method: document.querySelector('input[name="delivery"]:checked')?.value || 'email',
    payment_type: 'free'
  });
}

function onPaidSignUpClick() {
    const form = document.forms['signupForm']
  submitSignup({
    path_id: form.path?.value || '',
    name: form.name?.value || '',
    email: form.email?.value || null,
    phone: form.phone?.value || null,
    delivery_method: document.querySelector('input[name="delivery"]:checked')?.value || 'email',
    payment_type: 'paid'
  });
}
