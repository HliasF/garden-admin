// script.js (MODULE) — works with Supabase + keeps your UI features

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Requires config.js loaded BEFORE this script:
// <script src="/config.js"></script>
// <script type="module" src="/script.js"></script>

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const BUCKET = "admin_view_photos"; // ⚠️ βάλε ακριβώς το bucket name σου

// ====== Footer year ======
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ====== Mobile menu ======
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");

if (burger && mobileMenu) {
  function openMenu() {
    mobileMenu.hidden = false;
    mobileMenu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    mobileMenu.classList.add("open");
    const first = mobileMenu.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onDocClick);
    window.addEventListener("resize", onResize);
  }

  function closeMenu(returnFocus = true) {
    mobileMenu.hidden = true;
    mobileMenu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    mobileMenu.classList.remove("open");
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("click", onDocClick);
    window.removeEventListener("resize", onResize);
    if (returnFocus) burger.focus();
  }

  function toggleMenu() {
    const isOpen = burger.getAttribute("aria-expanded") === "true" && !mobileMenu.hidden;
    if (isOpen) closeMenu();
    else openMenu();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closeMenu();
    if (e.key === "Tab" && !mobileMenu.hidden) {
      const focusable = Array.from(
        mobileMenu.querySelectorAll('a, button, input, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((n) => !n.hasAttribute("disabled"));

      if (focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);

      if (e.shiftKey && idx === 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && idx === focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  }

  function onDocClick(e) {
    if (!mobileMenu.contains(e.target) && e.target !== burger) closeMenu();
  }

  function onResize() {
    if (window.innerWidth > 980 && !mobileMenu.hidden) closeMenu(false);
  }

  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  mobileMenu.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) closeMenu();
  });

  if (!mobileMenu.hasAttribute("aria-hidden")) mobileMenu.setAttribute("aria-hidden", String(mobileMenu.hidden));
  if (!burger.hasAttribute("aria-expanded")) burger.setAttribute("aria-expanded", "false");
}

// ====== File preview (garden images) ======
const fileInput = document.getElementById("gardenFiles");
const filePreview = document.getElementById("filePreview");

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

fileInput?.addEventListener("change", (ev) => {
  const files = Array.from(ev.target.files || []);
  if (!filePreview) return;
  filePreview.innerHTML = "";

  if (files.length === 0) return;

  const maxFiles = 12;
  const maxSize = 10 * 1024 * 1024; // 10MB per file

  if (files.length > maxFiles) {
    filePreview.textContent = `Επέλεξες ${files.length} αρχεία — επιτρέπονται έως ${maxFiles}.`;
    return;
  }

  files.forEach((file) => {
    if (file.size > maxSize) {
      const el = document.createElement("div");
      el.className = "file-item";
      el.textContent = `${file.name} — πολύ μεγάλο (${formatSize(file.size)})`;
      filePreview.appendChild(el);
      return;
    }

    const item = document.createElement("div");
    item.className = "thumb";

    const info = document.createElement("div");
    info.className = "thumb-info";
    info.textContent = `${file.name} · ${formatSize(file.size)}`;

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.alt = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
      item.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.className = "file-icon";
      icon.textContent = "📄";
      item.appendChild(icon);
    }

    item.appendChild(info);
    filePreview.appendChild(item);
  });
});

// ====== Toast helper ======
function showToast(text, timeout = 4200) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => {
    t.classList.remove("in");
    setTimeout(() => t.remove(), 300);
  }, timeout);
}

// ====== Smooth scroll for internal anchors ======
(function () {
  function getScrollOffset() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--scroll-offset") || "";
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 96;
  }

  function smoothScrollToTarget(target) {
    if (!target) return;
    const offset = getScrollOffset();
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: "smooth" });

    const id = target.id;
    if (id) setTimeout(() => history.replaceState(null, "", "#" + id), 520);
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        smoothScrollToTarget(target);
      }
    });
  });
})();

// ====== Menu active link (scrollspy) ======
(function () {
  const menuLinks = Array.from(document.querySelectorAll(".menu a"));
  if (menuLinks.length === 0) return;

  const headerEl = document.querySelector(".nav") || document.querySelector(".header");
  function updateScrollOffset() {
    const h = headerEl ? Math.round(headerEl.getBoundingClientRect().height + 8) : 96;
    document.documentElement.style.setProperty("--scroll-offset", `${h}px`);
    return h;
  }

  let headerHeight = updateScrollOffset();
  window.addEventListener("resize", () => {
    headerHeight = updateScrollOffset();
  });

  const linkMap = new Map();
  menuLinks.forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (target) linkMap.set(href, { link: a, target });
  });

  function clear() {
    menuLinks.forEach((a) => a.classList.remove("active"));
  }

  menuLinks.forEach((a) =>
    a.addEventListener("click", () => {
      clear();
      a.classList.add("active");
    })
  );

  const entries = Array.from(linkMap.values());
  if (entries.length) {
    const observer = new IntersectionObserver(
      (obsEntries) => {
        const visible = obsEntries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) {
          const id = "#" + visible[0].target.id;
          const info = linkMap.get(id);
          if (info) {
            clear();
            info.link.classList.add("active");
          }
        }
      },
      { root: null, rootMargin: `-${headerHeight}px 0px -40% 0px`, threshold: [0.15, 0.45, 0.75] }
    );

    entries.forEach((e) => observer.observe(e.target));
  }

  const initial = location.hash || "#top";
  if (linkMap.has(initial)) {
    clear();
    linkMap.get(initial).link.classList.add("active");
  }
})();

// ========================
// SUPABASE: Contact + Photos
// ========================
async function getOrCreateCustomer(full_name, phone) {
  const { data: found, error: e1 } = await supabase.from("customers").select("id").eq("phone", phone).limit(1);
  if (e1) throw e1;
  if (found && found.length) return found[0].id;

  const { data: created, error: e2 } = await supabase
    .from("customers")
    .insert({ full_name, phone })
    .select("id")
    .single();

  if (e2) throw e2;
  return created.id;
}

async function uploadFiles(customer_id, files) {
  for (const file of files) {
    const safe = file.name.replace(/\s+/g, "_");
    const path = `${customer_id}/${Date.now()}_${safe}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) throw upErr;

    const { error: dbErr } = await supabase.from("garden_photos").insert({ customer_id, file_path: path });
    if (dbErr) throw dbErr;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contactForm");
  if (!contactForm) return;

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = contactForm.elements["name"].value.trim();
    const phone = contactForm.elements["phone"].value.trim();
    const body = contactForm.elements["message"].value.trim();
    const files = document.getElementById("gardenFiles")?.files || [];

    if (!full_name || !phone || !body) {
      alert("Συμπλήρωσε Ονοματεπώνυμο, Τηλέφωνο και Μήνυμα.");
      return;
    }

    const submitBtn = contactForm.querySelector('.btn[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const customer_id = await getOrCreateCustomer(full_name, phone);

      const { error: msgErr } = await supabase.from("messages").insert({ customer_id, body });
      if (msgErr) throw msgErr;

      if (files.length > 0) await uploadFiles(customer_id, files);

      contactForm.reset();
      if (filePreview) filePreview.innerHTML = "";
      showToast("Στάλθηκε ✅");
    } catch (err) {
      alert("Σφάλμα: " + (err?.message || err));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

// ========================
// SUPABASE: Reviews (pending approval)
// ========================
document.addEventListener("DOMContentLoaded", () => {
  const reviewForm = document.getElementById("reviewForm");
  if (!reviewForm) return;

  let ratingValue = 5;
  const stars = document.querySelectorAll(".star");

  // set initial stars
  stars.forEach((s, i) => (s.textContent = i < ratingValue ? "★" : "☆"));

  stars.forEach((btn) => {
    btn.addEventListener("click", () => {
      ratingValue = Number(btn.dataset.value || 5);
      stars.forEach((s, i) => (s.textContent = i < ratingValue ? "★" : "☆"));
    });
  });

  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = reviewForm.elements["rname"].value.trim();
    const text = reviewForm.elements["rtext"].value.trim();

    if (!name || !text || ratingValue < 1) {
      alert("Βάλε όνομα, κριτική και βαθμολογία.");
      return;
    }

    const btn = reviewForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const { error } = await supabase.from("reviews").insert({
        name,
        rating: ratingValue,
        text,
        approved: false,
      });

      if (error) throw error;

      reviewForm.reset();
      ratingValue = 5;
      stars.forEach((s, i) => (s.textContent = i < ratingValue ? "★" : "☆"));
      showToast("Η κριτική στάλθηκε ✅ (θα εμφανιστεί μετά από έγκριση)");
    } catch (err) {
      alert("Σφάλμα: " + (err?.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
});
