/* ============================================================
   Biomate — choosing a group photo

   Aufan, from the very first brief: *"for the swipe thingy is just
   like the group photo their favorite photo together"*. The photo on
   a card is not decoration — it is the thing people swipe on.

   Until now nothing could set one. Every hike used generated
   artwork, and the host screen said *"artwork is generated for you
   until someone adds a group photo"* — a sentence promising a
   feature that did not exist.

   ⚠️ RESIZE BEFORE UPLOADING. A photo straight off a phone is 3–6 MB
   and 4000px wide. It gets displayed at ~800px on the widest card
   here, so uploading the original would spend someone's mobile data
   on pixels no screen will ever show, and make the swipe deck wait on
   it. Downscaled to 1600px and re-encoded as JPEG it lands around
   200–400 KB with no visible difference at the sizes we draw.

   Canvas does the work — no library, consistent with the rest of the
   project having zero runtime dependencies.
   ============================================================ */

const MAX_EDGE = 1600;
const QUALITY = 0.82;
/* Anything past this is a misunderstanding rather than a photo, and
   reading it into memory to resize would be the expensive part. */
const REFUSE_OVER = 25 * 1024 * 1024;

export function isImage(file) {
  return Boolean(file && /^image\//.test(file.type));
}

/**
 * Read a File, downscale it, and hand back a JPEG blob plus a preview
 * URL. Throws with a sentence a person can act on.
 */
export async function prepare(file) {
  if (!isImage(file)) throw new Error("That doesn't look like an image.");
  if (file.size > REFUSE_OVER) throw new Error("That photo is enormous — try one under 25 MB.");

  const bitmap = await load(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  /* the browser's own smoothing beats anything hand-rolled here, and
     without it a 4000px photo downscaled in one step looks crunchy */
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
  if (!blob) throw new Error("Couldn't read that photo. Try a different one.");

  return {
    blob,
    previewUrl: canvas.toDataURL("image/jpeg", 0.7),
    width: w,
    height: h,
    bytes: blob.size,
    originalBytes: file.size,
  };
}

/* createImageBitmap honours EXIF orientation and decodes off the main
   thread; the <img> path is the fallback for browsers without it, and
   it must revoke its object URL or the blob leaks for the session. */
async function load(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* some builds reject the options bag rather than ignoring it */
      try { return await createImageBitmap(file); } catch { /* fall through */ }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("Couldn't read that photo. Try a different one."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A labelled picker with a live preview.
 *
 * @param {object} o
 *   label      what the control says before anything is chosen
 *   fallback   the generated artwork shown until a photo is picked
 *   onPick     ({blob, previewUrl}) => void — fires after resizing
 */
export function photoPicker({ el, label = "Add a group photo", fallback = "", onPick = () => {} }) {
  const input = el("input", {
    class: "sr-only",
    type: "file",
    id: "group-photo",
    accept: "image/*",
    /* no `capture` — on a phone that would force the camera and skip
       the library, and the brief asks for a favourite photo they
       already have together */
  });

  const img = el("img", { class: "photopick__img", alt: "", src: fallback });
  const note = el("p", { class: "tiny photopick__note", text: "Generated artwork for now. Add a photo of the group and this is what people swipe on." });
  const err = el("p", { class: "acct__err", role: "alert" });

  const button = el("label", {
    class: "photopick__btn",
    for: "group-photo",
    /* a <label for> is the accessible way to trigger a file input —
       clicking a button and calling input.click() loses the keyboard
       path in some browsers */
  }, [el("span", { text: label })]);

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    err.textContent = "";
    button.querySelector("span").textContent = "Reading…";
    try {
      const out = await prepare(file);
      img.src = out.previewUrl;
      img.alt = "The photo you chose";
      note.textContent = `${Math.round(out.bytes / 1024)} KB, ${out.width}×${out.height} — resized from ${Math.round(out.originalBytes / 1024)} KB so it loads quickly on a phone.`;
      button.querySelector("span").textContent = "Choose a different photo";
      onPick(out);
    } catch (e) {
      err.textContent = e.message;
      button.querySelector("span").textContent = label;
      input.value = "";
    }
  });

  return el("div", { class: "photopick" }, [img, button, input, note, err]);
}
