// =====================================================================
// uploads.js — tigers and lions send photos of their schoolwork
// The photo is shrunk on the phone, then waits online until a grown-up
// checks it on the grades page (Claude reads it only when they say so).
// Kittens don't see this: their grown-up sends schoolwork for them.
// =====================================================================

function showUploadCard() {
  const card = document.getElementById('uploadCard');
  if (!card) return;
  const canSend = typeof animal !== 'undefined' && animal.theme !== 'kitten' &&
                  typeof cloudLinked === 'function' && cloudLinked();
  card.style.display = canSend ? 'block' : 'none';
  if (!canSend) return;
  card.textContent = '';

  const title = document.createElement('div');
  title.className = 'uploadTitle';
  title.textContent = `📸 Send schoolwork to ${parentName()}`;
  title.appendChild(infoButton(`Snap a graded worksheet, quiz, test or report card. ${parentName()} checks it, ` +
    'and Claude adds it to your grades and finds what to practice. Photos are deleted once they are checked.'));

  const pick = document.createElement('input');
  pick.type = 'file';
  pick.accept = 'image/*';
  pick.setAttribute('capture', 'environment');      // opens the camera on phones
  pick.style.display = 'none';

  const snap = document.createElement('button');
  snap.textContent = '📷 Take a photo';
  snap.addEventListener('click', () => pick.click());

  const preview = document.createElement('img');
  preview.className = 'uploadPreview';
  preview.style.display = 'none';

  const note = document.createElement('input');
  note.placeholder = 'What is it? Like "Math quiz"';
  note.maxLength = 60;
  note.style.display = 'none';

  const send = document.createElement('button');
  send.textContent = '📤 Send';
  send.style.display = 'none';

  const status = document.createElement('div');
  status.className = 'uploadStatus';

  let photo = null;
  pick.addEventListener('change', async () => {
    const file = pick.files[0];
    if (!file) return;
    status.textContent = '⏳ Getting the photo ready...';
    try {
      photo = await shrinkForUpload(file);
      preview.src = 'data:image/jpeg;base64,' + photo;
      preview.style.display = note.style.display = send.style.display = 'block';
      snap.textContent = '📷 Take it again';
      status.textContent = 'Make sure the whole page is in the photo and easy to read.';
    } catch (err) {
      status.textContent = '⚠️ ' + err.message;
    }
  });

  send.addEventListener('click', async () => {
    if (!photo) return;
    send.disabled = true;
    status.textContent = '⏳ Sending...';
    const result = await cloudCall('kid_upload', { p_token: cloudGet(CLOUD.token), p_image: photo, p_note: note.value });
    send.disabled = false;
    if (!result.ok) { status.textContent = '⚠️ ' + result.error; return; }
    photo = null;
    pick.value = '';
    note.value = '';
    preview.style.display = note.style.display = send.style.display = 'none';
    snap.textContent = '📷 Send another';
    status.textContent = `✅ Sent! ${parentName()} will check it. (${result.waiting} waiting)`;
    if (typeof kidAlert === 'function') kidAlert('photo', note.value);         // alert the grown-ups
  });

  card.append(title, snap, pick, preview, note, send, status);
}

// Shrinks a photo to at most 1600 pixels on its long side, as a JPG
async function shrinkForUpload(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((ok, fail) => {
    img.onload = ok;
    img.onerror = () => fail(new Error("This phone can't open that photo. Try taking it again."));
    img.src = url;
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}
