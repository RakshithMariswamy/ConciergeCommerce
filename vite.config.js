import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deploying to GitLab Pages as a project page the app is served from
// https://<user>.gitlab.io/<repo-name>/ — Vite needs to know the sub-path.
// Set VITE_BASE_PATH in your CI environment variable (or .gitlab-ci.yml) to
// override.  Defaults to '/' for local dev and user-page deployments.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 3000,
  },
});
