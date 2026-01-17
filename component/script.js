import { formatDate, resolveFileUrl, API_BASE_URL, parseContent } from "/edenta_web/utils.js";

/**
 * Calculates estimated reading time
 */
const getReadingTime = (content) => {
  const wordsPerMinute = 225;
  let text = "";
  content?.sections?.forEach(section => {
    if (section.title) text += section.title + " ";
    section.blocks?.forEach(block => {
      if (block.type === 'text' || block.type === 'list') {
        text += (block.value || "") + " ";
      }
    });
  });
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

/**
 * Loads an HTML component into a container
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
      // Execute scripts
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
      // Call initializers if any
      if (window.__edenta_initHeader) window.__edenta_initHeader();
    }
  } catch (err) {
    console.error("Error loading component:", err.message);
  }
};

/**
 * Initializes mobile menu
 */
export const initMobileMenu = () => {
  const menuBtn = document.querySelector("#mobile-menu-btn");
  const closeBtn = document.querySelector("#mobile-menu-close");
  const mobileMenu = document.querySelector("#mobile-menu");
  const overlay = document.querySelector("#mobile-menu-overlay");

  if (!menuBtn || !mobileMenu || !overlay || !closeBtn) return;

  const openMenu = () => {
    overlay.classList.remove("hidden");
    mobileMenu.classList.remove("hidden");
    setTimeout(() => {
      overlay.classList.remove("opacity-0");
      overlay.classList.add("opacity-100");
      mobileMenu.classList.remove("translate-x-full");
      mobileMenu.classList.add("translate-x-0");
    }, 10);
    document.body.style.overflow = "hidden";
  };

  const closeMenu = () => {
    overlay.classList.add("opacity-0");
    overlay.classList.remove("opacity-100");
    mobileMenu.classList.add("translate-x-full");
    mobileMenu.classList.remove("translate-x-0");
    setTimeout(() => {
      overlay.classList.add("hidden");
      mobileMenu.classList.add("hidden");
    }, 500);
    document.body.style.overflow = "";
  };

  menuBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);
};

/**
 * Sets SEO tags dynamically
 */
export const setSEO = (data) => {
  if (!data) return;
  if (data.title) document.title = `${data.title} | Auguste Edenta`;

  const description = data.summary || data.subtitle || "";

  // Social Meta Tags
  const updateMeta = (name, content, property = false) => {
    let selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (property) el.setAttribute('property', name);
      else el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };

  updateMeta("description", description);
  updateMeta("og:title", data.title, true);
  updateMeta("og:description", description, true);
  updateMeta("og:image", resolveFileUrl(data.heroImage || data.heroImageId), true);
  updateMeta("og:type", "article", true);
  updateMeta("twitter:card", "summary_large_image");
  updateMeta("twitter:title", data.title);
  updateMeta("twitter:description", description);
  updateMeta("twitter:image", resolveFileUrl(data.heroImage || data.heroImageId));

  // Canonical Link
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = window.location.href;

  // JSON-LD for Article
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) existingScript.remove();

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": data.title,
    "description": description,
    "image": resolveFileUrl(data.heroImage || data.heroImageId),
    "datePublished": data.createdAt,
    "author": {
      "@type": "Person",
      "name": "Auguste Edenta",
      "url": window.location.origin + "/about/"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Auguste Edenta",
      "logo": {
        "@type": "ImageObject",
        "url": window.location.origin + "/public/apple-touch-icon.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    }
  };
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
};

/**
 * Loads and renders articles
 */
export const loadArticles = async (selector, limit = 6) => {
  const container = document.querySelector(selector);
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/article?status=published&limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch articles");
    const json = await response.json();
    const articles = json.data || json;

    if (!Array.isArray(articles) || articles.length === 0) {
      container.innerHTML = "<p class='text-slate-500'>No articles found.</p>";
      return;
    }

    container.innerHTML = articles.map(article => {
      const slug = article.slug || '';
      const postUrl = `/edenta_web/blog/post?slug=${slug}`;

      return `
            <article class="flex flex-col border-b border-slate-100 pb-10 group hover:border-pink-200 transition-colors">
                <div class="grid md:grid-cols-[280px_1fr] gap-8 items-start">
                    ${(article.heroImage || article.heroImageId) ? `
                        <div class="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                            <img src="${resolveFileUrl(article.heroImage || article.heroImageId)}" alt="${article.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
                        </div>
                    ` : `
                        <div class="relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
                            <svg class="w-12 h-12 text-pink-200" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/>
                            </svg>
                        </div>
                    `}
                    <div class="flex flex-col h-full py-1">
                        <div class="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 mb-4">
                            <span>${article.category?.name || 'Perspective'}</span>
                            <span class="text-slate-300">|</span>
                            <span class="text-slate-400 font-bold">${formatDate(article.createdAt)}</span>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 group-hover:text-pink-600 transition-colors leading-tight mb-4 tracking-tight">
                            <a href="${postUrl}">${article.title}</a>
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6 font-medium">
                            ${article.summary || article.subtitle || ''}
                        </p>
                        <div class="mt-auto">
                            <a href="${postUrl}" class="text-[10px] font-black uppercase tracking-widest text-slate-900 border-b-2 border-pink-500 pb-1 hover:text-pink-600 hover:border-pink-600 transition-all">
                                Read the Article
                            </a>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");
  } catch (err) {
    console.error("Error loading articles:", err);
    container.innerHTML = "<p class='text-pink-500 font-bold'>Error loading articles.</p>";
  }
};

/**
 * Renders full article content from JSON
 */
export const renderArticle = async (selector, slug) => {
  const container = document.querySelector(selector);
  if (!container || !slug) return;

  try {
    const url = `${API_BASE_URL}/article/slug/${encodeURIComponent(slug)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Article fetch failed: ${response.status} ${response.statusText} at ${url}`);
      throw new Error("Article not found");
    }
    const article = await response.json();
    article.content = parseContent(article.content);

    setSEO(article);

    console.log(article);

    const readingTime = getReadingTime(article.content);

    let html = `
            <article class="article-content">
                <header class="mb-14">
                    <div class="flex items-center gap-3 mb-8">
                        <div class="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold border border-pink-200">
                            A
                        </div>
                        <div class="text-sm">
                            <div class="font-bold text-slate-900">Auguste Edenta</div>
                            <div class="text-slate-500 font-medium">
                                ${formatDate(article.createdAt)} · ${readingTime} min read
                            </div>
                        </div>
                    </div>

                    <h1 class="text-4xl md:text-5xl font-black text-slate-900 leading-[1.2] mb-6 tracking-tight">
                        ${article.title}
                    </h1>
                    ${article.subtitle ? `<p class="text-2xl text-slate-500 font-medium leading-[1.3] mb-8">${article.subtitle}</p>` : ''}
                    
                    <div class="flex items-center gap-4 py-6 border-y border-slate-100 mb-12">
                         <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                            ${article.category?.name || 'Editorial'}
                        </span>
                    </div>
                </header>

                ${(article.heroImage || article.heroImageId) ? `
                    <figure class="mb-14">
                        <img src="${resolveFileUrl(article.heroImage || article.heroImageId)}" alt="${article.title}" class="w-full h-auto">
                        ${article.title ? `<figcaption class="mt-4 text-center text-sm text-slate-400 italic">${article.title}</figcaption>` : ''}
                    </figure>
                ` : `
                    <div class="mb-14 h-1 w-20 bg-pink-100 rounded-full"></div>
                `}

                <div class="prose prose-pink max-w-none break-words overflow-hidden">
                    ${article.content?.sections?.map(section => `
                        <div>
                            ${section.title ? `<h2>${section.title}</h2>` : ''}
                            ${section.blocks?.map(block => {
      if (block.type === 'text') {
        return `<div>${block.value}</div>`;
      } else if (block.type === 'image') {
        // Find URL in contentFiles if block.fileId is present, or use block.value if it's a URL
        let imageUrl = block.value;
        if (block.fileId && article.contentFiles) {
          const file = article.contentFiles.find(f => f.id == block.fileId);
          if (file) imageUrl = file.url;
        }
        if (!imageUrl && block.fileId) imageUrl = resolveFileUrl(block.fileId);

        return `
            <figure>
                <img src="${imageUrl}" alt="${block.caption || ''}">
                ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
            </figure>
        `;
      } else if (block.type === 'list') {
        return `<div>${block.value}</div>`;
      } else if (block.type === 'gallery') {
        const layout = block.layout || 'grid';
        const images = block.images || [];

        const galleryImagesHtml = images.map(imgData => {
          let imgUrl = "";
          if (imgData.fileId && article.contentFiles) {
            const file = article.contentFiles.find(f => f.id == imgData.fileId);
            if (file) imgUrl = file.url;
          }
          if (!imgUrl && imgData.fileId) imgUrl = resolveFileUrl(imgData.fileId);

          if (!imgUrl) return "";

          return `
            <div class="break-inside-avoid mb-4">
              <img src="${imgUrl}" class="w-full h-auto rounded-xl shadow-sm hover:shadow-md transition-shadow">
            </div>
          `;
        }).join('');

        if (layout === 'masonry') {
          return `
            <div class="my-10 columns-2 md:columns-3 gap-4">
              ${galleryImagesHtml}
            </div>
          `;
        } else {
          // Default Grid
          return `
            <div class="my-10 grid grid-cols-2 md:grid-cols-3 gap-4">
              ${galleryImagesHtml}
            </div>
          `;
        }
      }
      return '';
    }).join('')}
                  </div>
              `).join('')}
          </div>
      </article>
    `;

    container.innerHTML = html;
    renderSidebar("#sidebar-content", article);

    // Initialize Reading Progress
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      const pb = document.getElementById("progress-bar");
      if (pb) pb.style.width = scrolled + "%";
    });
  } catch (err) {
    console.error("Error rendering article:", err);
    container.innerHTML = `
            <div class="text-center py-24">
                <h1 class="text-4xl font-bold text-slate-900 mb-4">Post not found</h1>
                <p class="text-slate-500 mb-8">We couldn't find the article you're looking for.</p>
                <a href="/blog/" class="text-pink-600 font-bold hover:underline">Back to Blog</a>
            </div>
        `;
  }
};

/**
 * Renders the article sidebar with author bio, related posts, and sharing
 */
export const renderSidebar = async (selector, currentArticle) => {
  const container = document.querySelector(selector);
  if (!container) return;

  // 1. Author Bio Section
  const authorHtml = `
        <div class="bg-white rounded-3xl border border-pink-100 p-8 mb-10 shadow-sm">
            <div class="w-16 h-16 rounded-2xl bg-pink-600 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg rotate-3">
                A
            </div>
            <h4 class="text-lg font-black text-slate-900 mb-2 tracking-tight">Auguste Edenta</h4>
            <div class="text-[9px] font-black uppercase tracking-widest text-pink-600 mb-4">Virtual Assistant & Content Strategist</div>
            <p class="text-[13px] text-slate-500 leading-relaxed font-medium mb-6">
                Helping individuals and businesses save time, stay organised, and achieve more through expert administrative support and content strategy.
            </p>
            <div class="flex gap-4">
                <a href="/contact/" class="text-[9px] font-black uppercase tracking-widest text-slate-900 border-b-2 border-pink-100 hover:border-pink-600 transition-all">Let's Talk</a>
            </div>
        </div>
    `;

  // 2. Share Section
  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(currentArticle.title);
  const shareHtml = `
        <div class="mb-10 px-4">
            <h5 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Share this story</h5>
            <div class="flex gap-3">
                <a href="https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}" target="_blank" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-pink-600 hover:text-white transition-all">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-pink-600 hover:text-white transition-all">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <button onclick="navigator.clipboard.writeText(window.location.href)" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-pink-600 hover:text-white transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                </button>
            </div>
        </div>
    `;

  // 3. Related Posts
  let relatedHtml = "";
  try {
    const categoryId = currentArticle.categoryId || "";
    const url = `${API_BASE_URL}/article?status=published&limit=5&categoryId=${categoryId}`;
    const resp = await fetch(url);
    const json = await resp.json();
    const articles = (json.data || json).filter(a => a.id !== currentArticle.id).slice(0, 3);

    if (articles.length > 0) {
      relatedHtml = `
        <div class="mt-12">
            <h5 class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 ml-4">Recommended</h5>
            <div class="space-y-8">
        ${articles.map(article => {
        const postUrl = `/blog/post?slug=${article.slug}`;
        return `
          <a href="${postUrl}" class="group block px-4 transition-all hover:translate-x-1">
              <h6 class="text-[13px] font-black text-slate-900 group-hover:text-pink-600 transition-colors leading-tight mb-2 line-clamp-2">${article.title}</h6>
              <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">${formatDate(article.createdAt)}</div>
          </a>
      `;
      }).join("")}
                    </div>
                </div>
            `;
    }
  } catch (e) {
    console.warn("Could not load related articles", e);
  }

  container.innerHTML = `
        <div class="flex flex-col">
            ${authorHtml}
            ${shareHtml}
            ${relatedHtml}
        </div>
    `;
};
