import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      open: false, // Set to true to auto-open after build
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ],
  
  server: {
    host: 'localhost',
    strictPort: false,
    fs: {
      strict: false
    }
  },
  
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2015',
    
    // Disable source maps in production (saves ~1MB)
    sourcemap: false,
    
    // Increase chunk size warning limit to 1000kb
    chunkSizeWarningLimit: 1000,
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs in production
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        // Remove comments
        comments: false
      }
    },
    
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core libraries
          'react-vendor': [
            'react',
            'react-dom',
            'react/jsx-runtime'
          ],
          
          // Supabase client
          'supabase': [
            '@supabase/supabase-js'
          ],
          
          // UI component libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-tooltip'
          ],
          
          // Lucide React icons
          'icons': [
            'lucide-react'
          ],
          
          // Chart libraries (if you're using them)
          'charts': [
            'recharts',
            'chart.js',
            'react-chartjs-2'
          ],
          
          // Date/time utilities (if you're using them)
          'date-utils': [
            'date-fns',
            'dayjs',
            'moment'
          ],
          
          // Report components (heavy, rarely changed)
          'reports': [
            './src/components/reports/DailyReport',
            './src/components/reports/WeeklyReport',
            './src/components/reports/MonthlyReport',
            './src/components/reports/CustomReport'
          ],
          
          // Analytics components
          'analytics': [
            './src/components/analytics/Analytics'
          ],
          
          // Settings components
          'settings': [
            './src/components/settings/Settings'
          ]
        },
        
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').slice(-1)[0] : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        
        // Asset file naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    
    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@supabase/supabase-js',
      'lucide-react'
    ],
    exclude: [
      // Exclude heavy dependencies that should be lazy loaded
    ]
  },
  
  // Preview server configuration (for testing production build)
  preview: {
    port: 4173,
    strictPort: false,
    host: 'localhost'
  }
})