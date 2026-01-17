import { formatDate, resolveFileUrl, API_BASE_URL } from "../utils.js";

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
  if (description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
  }

  // JSON-LD for Article
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) existingScript.remove();

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": data.title,
    "description": data.summary,
    "image": resolveFileUrl(data.heroImageId),
    "datePublished": data.createdAt,
    "author": {
      "@type": "Person",
      "name": "Auguste Edenta"
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

    container.innerHTML = articles.map(article => `
            <article class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-pink-50 flex flex-col h-full group">
                <div class="relative h-64 overflow-hidden">
                    <img src="${resolveFileUrl(article.heroImageId) || 'https://via.placeholder.com/800x600?text=No+Image'}" alt="${article.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    <div class="absolute top-4 left-4">
                        <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur text-pink-600 shadow-sm">
                            ${article.Category?.name || 'Uncategorized'}
                        </span>
                    </div>
                </div>
                <div class="p-8 flex-grow">
                    <div class="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
                        ${formatDate(article.createdAt)} | ${article.view_count} views
                    </div>
                    <h3 class="text-2xl font-bold text-slate-900 group-hover:text-pink-600 transition-colors leading-tight mb-4">
                        ${article.title}
                    </h3>
                    <p class="text-slate-500 text-sm line-clamp-3">${article.summary || ''}</p>
                </div>
                <div class="px-8 pb-8 pt-4">
                    <a href="blog/post.html?slug=${article.slug}" class="inline-flex items-center text-xs font-black uppercase tracking-widest text-pink-600 hover:text-pink-700 transition-colors">
                        Read More →
                    </a>
                </div>
            </article>
        `).join("");
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
    const response = await fetch(`${API_BASE_URL}/article/slug/${slug}`);
    if (!response.ok) throw new Error("Article not found");
    const article = await response.json();

    setSEO(article);

    let html = `
            <header class="mb-12">
                <div class="flex items-center gap-4 mb-6">
                    <span class="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-pink-100 text-pink-600">
                        ${article.Category?.name || 'Blog'}
                    </span>
                    <span class="text-slate-400 text-sm font-bold">${formatDate(article.createdAt)}</span>
                </div>
                <h1 class="text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
                    ${article.title}
                </h1>
                ${article.subtitle ? `<p class="text-xl text-slate-500 font-medium italic">${article.subtitle}</p>` : ''}
            </header>

            ${article.heroImageId ? `
                <div class="rounded-3xl overflow-hidden shadow-2xl mb-12">
                    <img src="${resolveFileUrl(article.heroImageId)}" alt="${article.title}" class="w-full h-auto">
                </div>
            ` : ''}

            <div class="prose prose-pink prose-xl max-w-none text-slate-700 leading-relaxed">
                ${article.content?.sections?.map(section => `
                    <section class="mb-12">
                        ${section.title ? `<h2 class="text-3xl font-bold text-slate-900 mt-12 mb-6">${section.title}</h2>` : ''}
                        ${section.blocks?.map(block => {
      if (block.type === 'text') {
        return `<div class="mb-6">${block.content}</div>`;
      } else if (block.type === 'image') {
        return `
                                    <figure class="my-10 group">
                                        <div class="rounded-2xl overflow-hidden bg-slate-100">
                                            <img src="${resolveFileUrl(block.fileId)}" alt="${block.caption || ''}" class="w-full h-auto">
                                        </div>
                                        ${block.caption ? `<figcaption class="mt-4 text-center text-sm text-slate-500 italic">${block.caption}</figcaption>` : ''}
                                    </figure>
                                `;
      } else if (block.type === 'gallery') {
        return `
                                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 my-10">
                                        ${block.images?.map(imgId => `
                                            <div class="aspect-square rounded-xl overflow-hidden bg-slate-100 group">
                                                <img src="${resolveFileUrl(imgId)}" alt="Gallery image" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
      }
      return '';
    }).join('')}
                    </section>
                `).join('')}
            </div>
        `;

    container.innerHTML = html;
  } catch (err) {
    console.error("Error rendering article:", err);
    container.innerHTML = `
            <div class="text-center py-24">
                <h1 class="text-4xl font-bold text-slate-900 mb-4">Post not found</h1>
                <p class="text-slate-500 mb-8">We couldn't find the article you're looking for.</p>
                <a href="blog/" class="text-pink-600 font-bold hover:underline">Back to Blog</a>
            </div>
        `;
  }
};
