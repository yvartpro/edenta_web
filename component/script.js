import { formatDate, resolveFileUrl, API_BASE_URL, parseContent } from "/utils.js";

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
      const postUrl = `/blog/post?slug=${slug}`;

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

  console.log(`[renderArticle] Initializing for slug: "${slug}"`);

  try {
    const url = `${API_BASE_URL}/article/slug/${encodeURIComponent(slug)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Article fetch failed: ${response.status} ${response.statusText} at ${url}`);
      throw new Error("Article not found");
    }
    const article = await response.json();
    article.content = parseContent(article.content);

    console.log(`[renderArticle] Successfully fetched article: "${article.title}"`);
    setSEO(article);

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
                    <figure class="mb-14 -mx-6 md:-mx-24 lg:-mx-32">
                        <img src="${resolveFileUrl(article.heroImage || article.heroImageId)}" alt="${article.title}" class="w-full h-auto shadow-sm">
                        ${article.title ? `<figcaption class="mt-4 text-center text-sm text-slate-400 italic font-sans">${article.title}</figcaption>` : ''}
                    </figure>
                ` : `
                    <div class="mb-14 h-1 w-20 bg-pink-100 rounded-full"></div>
                `}

                <div class="prose prose-pink max-w-none text-[1.2rem] md:text-[1.3rem] leading-[1.6] text-[#292929]">
                    ${article.content?.sections?.map(section => `
                        <div class="mb-12">
                            ${section.title ? `<h2 class="text-3xl font-bold text-slate-900 mt-14 mb-6 leading-tight">${section.title}</h2>` : ''}
                            ${section.blocks?.map(block => {
      if (block.type === 'text') {
        return `<div class="mb-8 font-serif">${block.value}</div>`;
      } else if (block.type === 'image') {
        // Find URL in contentFiles if block.fileId is present, or use block.value if it's a URL
        let imageUrl = block.value;
        if (block.fileId && article.contentFiles) {
          const file = article.contentFiles.find(f => f.id == block.fileId);
          if (file) imageUrl = file.url;
        }
        if (!imageUrl && block.fileId) imageUrl = resolveFileUrl(block.fileId);

        return `
                                        <figure class="my-14 -mx-6 md:-mx-12 group">
                                            <img src="${imageUrl}" alt="${block.caption || ''}" class="w-full h-auto">
                                            ${block.caption ? `<figcaption class="mt-4 text-center text-sm text-slate-400 italic font-sans">${block.caption}</figcaption>` : ''}
                                        </figure>
                                    `;
      } else if (block.type === 'list') {
        return `<div class="mb-6 flex gap-3 font-serif">
                    <span class="text-pink-500 font-bold">•</span>
                    <span>${block.value}</span>
                </div>`;
      }
      return '';
    }).join('')}
                        </div>
                    `).join('')}
                </div>
            </article>
        `;

    container.innerHTML = html;

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
