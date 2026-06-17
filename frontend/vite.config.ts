import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function forceExitPlugin(): Plugin {
  let buildDone = false;
  return {
    name: 'force-exit',
    closeBundle() {
      if (buildDone) return;
      buildDone = true;
      setTimeout(() => process.exit(0), 500);
    },
  };
}

export default defineConfig({
  plugins: [react(), forceExitPlugin()],
});
