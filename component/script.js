import { formatDate } from "../utils.js";

/**
 * Loads an HTML component into a container
 * @param {string} selector - CSS selector for the container
 * @param {string} filePath - Path to the HTML file to load
 */
export const loadComponent = async (selector, filePath) => {
  try {
    const url = filePath.startsWith('/') ? filePath : new URL(filePath, import.meta.url).href;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const html = await response.text();
    const container = document.querySelector(selector);
    if (container) {
      container.innerHTML = html;

      // Execute scripts from the injected HTML (both external and inline)
      try {
        const scripts = Array.from(container.querySelectorAll('script'));
        for (const oldScript of scripts) {
          const newScript = document.createElement('script');
          if (oldScript.src) {
            newScript.src = oldScript.src;
            if (oldScript.type) newScript.type = oldScript.type;
            document.head.appendChild(newScript);
          } else {
            newScript.textContent = oldScript.textContent;
            document.head.appendChild(newScript);
          }
          oldScript.remove();
        }
      } catch (e) {
        // ignore
      }

      // If header initializer is available, call it
      try { if (window.__cci_initHeader) window.__cci_initHeader(); } catch (e) { }
    }
  } catch (err) {
    console.error("Error loading component:", err.message);
  }
};

/**
 * Initializes the mobile menu toggle functionality
 */
export const initMobileMenu = () => {
  const menuBtn = document.querySelector("#mobile-menu-btn");
  const closeBtn = document.querySelector("#mobile-menu-close");
  const mobileMenu = document.querySelector("#mobile-menu");
  const overlay = document.querySelector("#mobile-menu-overlay");

  if (!menuBtn || !mobileMenu || !overlay || !closeBtn) return;

  const openMenu = () => {
    // Force overlay/menu to be fixed and on top of all stacking contexts
    try {
      // set styles with important priority to overcome any page stacking contexts
      overlay.style.setProperty('position', 'fixed', 'important');
      overlay.style.setProperty('top', '0', 'important');
      overlay.style.setProperty('left', '0', 'important');
      overlay.style.setProperty('width', '100%', 'important');
      overlay.style.setProperty('height', '100%', 'important');
      overlay.style.setProperty('z-index', '2147483647', 'important');
      overlay.style.setProperty('pointer-events', 'auto', 'important');

      mobileMenu.style.setProperty('position', 'fixed', 'important');
      mobileMenu.style.setProperty('top', '0', 'important');
      mobileMenu.style.setProperty('right', '0', 'important');
      mobileMenu.style.setProperty('height', '100%', 'important');
      mobileMenu.style.setProperty('z-index', '2147483647', 'important');
    } catch (e) {
      console.error('Error applying mobile overlay styles', e);
    }

    // Remove hidden first to allow transitions
    overlay.classList.remove("hidden");
    mobileMenu.classList.remove("hidden");

    // Small delay to trigger CSS transitions
    setTimeout(() => {
      overlay.classList.remove("opacity-0");
      overlay.classList.add("opacity-100");
      mobileMenu.classList.remove("translate-x-full");
      mobileMenu.classList.add("translate-x-0");
    }, 10);

    // Lock scroll on both html and body
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
  };

  const closeMenu = () => {
    overlay.classList.remove("opacity-100");
    overlay.classList.add("opacity-0");
    mobileMenu.classList.remove("translate-x-0");
    mobileMenu.classList.add("translate-x-full");

    // Add hidden after transition completes
    setTimeout(() => {
      overlay.classList.add("hidden");
      mobileMenu.classList.add("hidden");
    }, 500); // Match duration-500

    // Unlock scroll
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    // Optionally reset inline styles so they don't persist if other logic changes
    try {
      overlay.style.pointerEvents = '';
      // keep position fixed during close to allow transition out; remove zIndex after hidden
      setTimeout(() => {
        overlay.style.zIndex = '';
        mobileMenu.style.zIndex = '';
      }, 600);
    } catch (e) {
      // swallow
    }
  };

  menuBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);

  // Prevent any scroll or interaction on overlay, only close
  overlay.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
  });

  // Prevent scroll on overlay
  overlay.addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });

  overlay.addEventListener("wheel", (e) => {
    e.preventDefault();
  }, { passive: false });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });
};

/**
 * Loads and renders blog posts
 * @param {string} selector - CSS selector for the posts container
 * @param {Array} posts - Array of post objects to display
 * @param {number} limit - Maximum number of posts to display (default: 6)
 */
export const loadPosts = async (selector, posts, limit = 6) => {
  if (!selector || !posts) return;
  const postsContainer = document.querySelector(selector);

  if (!postsContainer) {
    console.error("Posts container not found:", selector);
    return;
  }

  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }

  const slicedPosts = posts.slice(0, limit);

  postsContainer.innerHTML = slicedPosts.map(post => `
    <article class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-slate-100 flex flex-col h-full group">
      <div class="relative h-64 overflow-hidden">
        <img src="${post.hero_url}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
        <div class="absolute top-4 left-4">
          <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur text-blue-700 shadow-sm">
            ${post.category}
          </span>
        </div>
      </div>
      <div class="p-8 flex-grow">
        <div class="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
          ${formatDate(post.createdAt)} | ${post.views_count} views
        </div>
        <h3 class="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight mb-4">
          ${post.title}
        </h3>
      </div>
      <div class="px-8 pb-8 pt-4">
        <a href="post-detail/?id=${post.id}" class="inline-flex items-center text-xs font-black uppercase tracking-widest text-blue-600 hover:text-emerald-600 transition-colors">
          Lire la suite →
        </a>
      </div>
    </article>
  `).join("");
};
