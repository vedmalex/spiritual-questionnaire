import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const basePath = import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL
  const router = createRouter({
    routeTree,
    context: {},
    basepath: basePath,

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
