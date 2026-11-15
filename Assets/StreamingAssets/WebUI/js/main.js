import {guardCampaignStorage,installStorageStatus} from './unity/storageStatus.js';
import { sanitizeDesign } from './designSanitizer.js';
import { loadCutscenes } from './media/cutscene.js';
import { loadData } from './data.js';
import { loadCharacters } from './characters.js';
import { getState, setDesign, loadProgress, markTutorialDone, saveProgress } from './state.js';
import { initRouter, showScreen } from './ui/router.js';
import '../presentation/orbital-ui.js';

async function bootstrap() {
  const app = document.getElementById('app');
  if (!app) return;

  try {
    const [data] = await Promise.all([loadData(), loadCharacters()]);
    installStorageStatus();
    if(!guardCampaignStorage(app,loadProgress))return;
    const restored=getState();
    setDesign(sanitizeDesign(restored.currentDesign,data,Object.keys(restored.completedMissions)));

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('skipTutorial') === '1') {
      markTutorialDone();
      saveProgress();
    }

    app.innerHTML='<div class="loading-screen"><h1>Preparing mission control</h1><progress id="load-progress" value="0" max="1"></progress></div>';
    // The menu needs only the globe. Load spacecraft lazily when requested;
    // expensive launch models must never block a player's first interaction.
    loadCutscenes().catch(()=>{});
    initRouter(app, data);

    const screenParam = urlParams.get('screen') || 'menu';
    showScreen(screenParam);
  } catch (error) {
    app.innerHTML = `
      <div class="panel-critical-error">
        <h2>TELEMETRY OFFLINE</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

bootstrap();
