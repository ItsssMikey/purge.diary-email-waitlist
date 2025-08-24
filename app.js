// ——— Configuration ———
// If you have a backend endpoint, put it here. It will receive JSON.
// For a quick no-backend setup, leave blank and entries are saved to localStorage.
const ENDPOINT_URL = "/api/waitlist"; 

// ——— Utilities ———
const $ = (sel, root = document) => root.querySelector(sel);
const emailRe = /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-])+)*@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/;

function setKpis() {
  // Fun placeholders; replace with real metrics if you have them.
  const testers = 128 + Math.floor(Math.random() * 42);
  const countries = 18 + Math.floor(Math.random() * 6);
  const spots = 40 + Math.floor(Math.random() * 10);
  $('#kpi1').textContent = testers.toLocaleString();
  $('#kpi2').textContent = countries;
  $('#kpi3').textContent = spots;
}

function getUTMs() {
  const p = new URLSearchParams(location.search);
  const fields = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref'];
  const out = {}; fields.forEach(k => { const v = p.get(k); if (v) out[k] = v; });
  return out;
}

function celebrate() {
  const root = $('#confetti');
  root.innerHTML = '';
  const count = 80;
  const W = window.innerWidth; const H = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    piece.style.left = Math.random() * W + 'px';
    piece.style.top = '-10px';
    piece.style.opacity = 0.8;
    piece.style.transform = `translateY(-20px) rotate(${Math.random()*180}deg)`;
    piece.style.transition = `transform ${2 + Math.random()*1.5}s cubic-bezier(.22,1,.36,1), opacity .6s`;
    root.appendChild(piece);
    requestAnimationFrame(() => {
      piece.style.transform = `translateY(${H + Math.random()*200}px) rotate(${180 + Math.random()*360}deg)`;
    });
    setTimeout(() => piece.style.opacity = 0, 2500);
    setTimeout(() => piece.remove(), 3600);
  }
}

function showModal(title, html) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modal').showModal();
}

function toJSON(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.website; // honeypot
  return {
    ...data,
    email: data.email?.trim(),
    name: data.name?.trim() || null,
    note: data.note?.trim() || null,
    consent: !!data.consent,
    utm: getUTMs(),
    meta: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ts: new Date().toISOString(), ua: navigator.userAgent }
  };
}

async function submitWaitlist(payload) {
  if (!ENDPOINT_URL) {
    const key = 'purge-waitlist';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(payload);
    localStorage.setItem(key, JSON.stringify(arr));
    // Simulate network latency
    await new Promise(r => setTimeout(r, 700));
    return { ok: true };
  }
  const res = await fetch(ENDPOINT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(text || 'Request failed');
  return { ok: true };
}

function validate(form) {
  let ok = true;
  const email = $('#email');
  const consent = $('#consent');
  const emailError = $('#emailError');
  const consentError = $('#consentError');

  email.setAttribute('aria-invalid', 'false');
  consent.setCustomValidity('');
  emailError.textContent = '';
  consentError.textContent = '';

  if (!email.value.trim() || !emailRe.test(email.value.trim())) {
    email.setAttribute('aria-invalid', 'true');
    emailError.textContent = 'Please enter a valid email.';
    ok = false;
  }
  if (!consent.checked) {
    consentError.textContent = 'Please agree so we can contact you about the beta.';
    ok = false;
  }
  return ok;
}

function attachEvents() {
  const form = $('#waitlistForm');
  const submitBtn = $('#submitBtn');
  const modal = $('#modal');
  const privacyLink = $('#privacyLink');
  const betaBtn = $('#betaTermsBtn');
  const modalClose = $('#modalClose');
  const year = $('#year');

  year.textContent = new Date().getFullYear();

  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Privacy Note', `
      <p><strong>Your data, your choice.</strong> We only collect what you give us here (name, email, optional note), plus basic metadata (time, browser) to run the waitlist. We use it solely to manage beta access and send product updates. No ads. No third-party resale. You can opt out anytime by replying “unsubscribe”.</p>
      <p>When the beta ends, we’ll clean up any data that’s no longer needed. For questions, email <a href="mailto:hello@purge.diary">hello@purge.diary</a>.</p>
    `);
  });

  betaBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Beta Terms', `
      <ul style="line-height:1.7; padding-left: 18px;">
        <li>Early software changes quickly — features may move or break.</li>
        <li>Please keep screenshots and details private unless we say otherwise.</li>
        <li>We’ll email 1–3×/month about invites and product updates.</li>
        <li>Your feedback helps shape the app (thank you!).</li>
        <li>You can leave the beta at any time.</li>
      </ul>
    `);
  });

  modalClose.addEventListener('click', () => modal.close());

  // Accessibility: close modal on Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.open) modal.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate(form)) return;
    // Honeypot
    if (form.website && form.website.value) return; // bot

    const payload = toJSON(form);
    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = 'Submitting…';

    try {
      await submitWaitlist(payload);
      $('#waitlistForm').style.display = 'none';
      $('#successBox').style.display = 'block';
      const share = new URL(location.href);
      share.searchParams.set('ref', payload.email.split('@')[0]);
      $('#shareLink').href = share.toString();
      celebrate();
    } catch (err) {
      const msg = (err && err.message) ? err.message : 'Something went wrong. Please try again.';
      showModal('Oops', `<p style="color:#fca5a5">${msg}</p><p>If this keeps happening, email <a href="mailto:hello@purge.diary">hello@purge.diary</a> and we’ll add you manually.</p>`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setKpis();
  attachEvents();
});
