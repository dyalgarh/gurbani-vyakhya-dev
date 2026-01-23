// /public/thank-you/thank-you.js
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  if (!sessionId) {
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
      document.getElementById("paidSection").classList.remove("hidden");
    } else {
      alert("Payment confirmation failed.");
    }
  } catch (err) {
    console.error(err);
    alert("An error occurred. Try again later.");
  }
});
