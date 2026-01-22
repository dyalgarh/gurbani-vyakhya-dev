// /public/thank-you/thank-you.js
document.addEventListener("DOMContentLoaded", async () => {
  const message = document.getElementById("message");
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  if (!sessionId) {
    message.textContent = "Invalid session. Please contact support.";
    return;
  }

  try {
    const res = await fetch("/api/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    });
    const data = await res.json();
    if (data.success) {
      message.textContent = "Your payment was successful! You are now a supporter 🙏";
    } else {
      message.textContent = data.message || "Payment confirmation failed.";
    }
  } catch (err) {
    console.error(err);
    message.textContent = "An error occurred. Try again later.";
  }
});
