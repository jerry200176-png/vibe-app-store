(async function () {
  try {
    const res = await fetch('/api/site/contact');
    if (!res.ok) return;
    const { email } = await res.json();
    if (!email) return;
    document.querySelectorAll('[data-contact-email]').forEach((el) => {
      const link = document.createElement('a');
      link.href = 'mailto:' + email;
      link.textContent = email;
      el.textContent = '';
      el.appendChild(link);
    });
  } catch (_) {}
})();
