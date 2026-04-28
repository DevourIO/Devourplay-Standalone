import {AppSettings} from "../utils/appSettings";

// Get initial settings when page loads
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // @ts-ignore
    const settings: AppSettings = await window.settings.getInitialSettings();
    // @ts-ignore
    document.getElementById('auto-start-on-login').checked = settings.autoStartOnLogin;
  } catch (error) {
    console.error('Failed to load initial settings:', error);
  }
});

const autoStartLoginBtn = document.querySelector('#auto-start-on-login') as HTMLButtonElement;
autoStartLoginBtn.addEventListener('change', async function(e) {
  console.log("autostart login");
  try {
    // @ts-ignore
    await window.settings.toggleAutoStart();
  } catch (error) {
    console.error('toggle auto start error');
  }
});

