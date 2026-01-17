
import { posts as allPosts } from './data/posts-data.js'
import { loadPosts, loadComponent, initMobileMenu } from './component/script.js'
import { getFiles } from './data/posts-data.js'

export const API_BASE_URL = 'http://127.0.0.1:4000/edenta/api/'

export const files = await getFiles()
const hero_image = files.find(f => f.use_as === 'hero')

const heroImage = document.getElementById("hero-image")
if (heroImage && hero_image?.url) heroImage.src = hero_image.url

const init = async () => {
  await Promise.all([
    loadComponent("#header", "./header.html"),
    loadComponent("#footer", "./footer.html"),
  ])

  await loadPosts("#posts", allPosts, 6)
  initMobileMenu()
}

init()