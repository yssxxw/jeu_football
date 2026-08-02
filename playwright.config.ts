import { defineConfig } from '@playwright/test';

// CHROMIUM_EXECUTABLE : chemin d'un Chromium déjà installé, pour les
// environnements où `playwright install` n'est pas possible.
const executablePath = process.env.CHROMIUM_EXECUTABLE;

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	use: executablePath ? { launchOptions: { executablePath } } : {}
});
