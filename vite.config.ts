import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Stub out figma:asset/* imports outside Figma Make. Must be a virtual module (\0 prefix)
// or Vite's asset pipeline tries to read `figma:asset/...` from disk and fails the build.
const FIGMA_ASSET_PREFIX = '\0figma:asset:'

function figmaAssetStubPlugin(): Plugin {
  return {
    name: 'figma-asset-stub',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) return FIGMA_ASSET_PREFIX + id.slice('figma:asset/'.length)
    },
    load(id) {
      if (id.startsWith(FIGMA_ASSET_PREFIX)) {
        // 1×1 transparent GIF — valid `src` for `<img>` when Figma exports are absent
        return `export default "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"`
      }
    },
  }
}

/**
 * @birdeye/elemental ships a global CSS reset (sass/global.scss.js) AND multiple
 * component-level .scss.js files that inject global rules like
 * `.hidden { display: none !important; visibility: hidden !important; }` via
 * style-inject. These conflict with Tailwind responsive utilities (e.g. lg:flex
 * can't override !important hidden).
 *
 * This plugin intercepts ALL .scss.js files from @birdeye/elemental and replaces
 * them with empty modules. The agent builder's own CSS uses proper CSS Modules
 * (.module.css), so suppressing elemental's scss.js files does not break it.
 */
function suppressElementalGlobalResetPlugin(): Plugin {
  const isElementalScss = (p: string) =>
    p.includes('@birdeye/elemental') && p.endsWith('.scss.js')

  const esbuildPlugin = {
    name: 'suppress-elemental-scss-esbuild',
    setup(build: any) {
      build.onLoad({ filter: /\.scss\.js$/ }, (args: any) => {
        if (isElementalScss(args.path)) {
          return { contents: 'export default ""', loader: 'js' }
        }
      })
    },
  }
  return {
    name: 'suppress-elemental-scss',
    // Rollup-phase: catches any non-pre-bundled import at runtime
    load(id) {
      if (isElementalScss(id)) {
        return 'export default "";'
      }
    },
    config() {
      return {
        optimizeDeps: {
          esbuildOptions: {
            plugins: [esbuildPlugin],
          },
        },
      }
    },
  }
}

export default defineConfig({
  // Base path for GitHub Pages: https://sampada-kudalkar.github.io/contenthub/
  base: '/contenthub/',
  // Use /tmp for vite's dep cache — avoids EPERM issues on macOS FUSE mounts
  cacheDir: '/tmp/vite-birdeyev2',
  plugins: [
    figmaAssetStubPlugin(),
    suppressElementalGlobalResetPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  optimizeDeps: {
    // These are unresolved peer deps inside @birdeye/elemental that are not used
    // by birdeyev2 directly. Exclude them so esbuild doesn't try to bundle them.
    exclude: ['react-onclickoutside', 'react-datepicker'],
    esbuildOptions: {
      plugins: [
        {
          name: 'suppress-elemental-scss-esbuild',
          setup(build: any) {
            build.onLoad({ filter: /\.scss\.js$/ }, (args: any) => {
              if (args.path.includes('@birdeye/elemental')) {
                return { contents: 'export default ""', loader: 'js' }
              }
            })
          },
        },
      ],
    },
  },

  build: {
    rollupOptions: {
      external: [
        'react-onclickoutside',
        'react-datepicker/dist/react-datepicker.css',
      ],
    },
  },
})
