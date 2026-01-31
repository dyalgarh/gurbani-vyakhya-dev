const form = document.getElementById("donateForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: form.name.value,
    email: form.email.value,
    amount: Number(form.amount.value),
    is_anonymous: form.is_anonymous.checked
  };

  const res = await fetch("/api/create-donation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const { url } = await res.json();
  window.location.href = url; // redirect to Stripe Checkout
});