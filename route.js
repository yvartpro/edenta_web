import { loadComponent, initMobileMenu, loadArticles } from './component/script.js';
import { resolveFileUrl, API_BASE_URL } from './utils.js';

const init = async () => {
    // Load components
    await Promise.all([
        loadComponent("#header", "./header.html"),
        loadComponent("#footer", "./footer.html"),
    ]);

    // Fetch hero image dynamic from API if needed, or use a default
    try {
        const resp = await fetch(`${API_BASE_URL}/article?status=published&limit=1`);
        const json = await resp.json();
        const articles = json.data || json;
        if (articles && articles.length > 0) {
            const heroImage = document.getElementById("hero-image");
            if (heroImage && articles[0].heroImageId) {
                heroImage.src = resolveFileUrl(articles[0].heroImageId);
            }
        }
    } catch (e) {
        console.warn("Could not load dynamic hero image", e);
    }

    // Load articles for the homepage
    await loadArticles("#posts", 6);

    // Initialize UI interactions
    initMobileMenu();
};

init();
