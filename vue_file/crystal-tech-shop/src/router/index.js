import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/shop',
    name: 'shop',
    component: () => import('@/views/ShopView.vue'),
  },
  {
    path: '/category/:category',
    name: 'category',
    component: () => import('@/views/ShopView.vue'),
  },
  {
    path: '/product/:id',
    name: 'product',
    component: () => import('@/views/ProductView.vue'),
    props: true,
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('@/views/SupportView.vue'),
  },
  {
    path: '/deals/:slug?',
    name: 'deals',
    component: () => import('@/views/ShopView.vue'),
  },
  {
    path: '/brands',
    name: 'brands',
    component: () => import('@/views/ShopView.vue'),
  },
  {
    path: '/wishlist',
    name: 'wishlist',
    component: () => import('@/views/ShopView.vue'), // TODO: replace with WishlistView.vue
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/views/ShopView.vue'), // TODO: replace with AccountView.vue
  },
  {
    path: '/track-order',
    name: 'track-order',
    component: () => import('@/views/SupportView.vue'), // TODO: replace with TrackOrderView.vue
  },
  {
    path: '/policies/:page',
    name: 'policy',
    component: () => import('@/views/SupportView.vue'), // TODO: replace with PolicyView.vue
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/HomeView.vue'), // TODO: replace with NotFoundView.vue
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

export default router
