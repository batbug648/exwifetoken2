// Countdown to Aug 22, 2025 00:00:00
const countDownDate = new Date("Aug 22, 2025 00:00:00").getTime();

// Update every 1 second
const x = setInterval(function () {
  const now = new Date().getTime();
  const distance = countDownDate - now;

  // Time calculations
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((distance % (1000 * 60)) / 1000);

  // Update HTML
  document.getElementById("cd-days").innerText = days >= 0 ? days : 0;
  document.getElementById("cd-hours").innerText = hours >= 0 ? hours : 0;
  document.getElementById("cd-mins").innerText = mins >= 0 ? mins : 0;
  document.getElementById("cd-secs").innerText = secs >= 0 ? secs : 0;

  // Status
  const status = document.getElementById("cd-status");
  if (distance > 0) {
    status.innerText = "Presale begins in…";
  } else {
    status.innerText = "Presale is LIVE!";
    clearInterval(x);
  }
}, 1000);

