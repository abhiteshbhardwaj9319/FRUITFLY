// preload.mjs — the only bridge between the main process and the two renderers.
// The renderers get exactly the channels they need and nothing else.

import { contextBridge, ipcRenderer } from 'electron';

const on = (channel) => (fn) => {
  ipcRenderer.on(channel, (_e, payload) => fn(payload));
};

contextBridge.exposeInMainWorld('flyAPI', {
  getBrainData: () => ipcRenderer.invoke('brain-data'),
  getRuntimeMode: () => ipcRenderer.invoke('runtime-mode'),

  // overlay renderer
  onAmbient: on('ambient'),
  onTerrain: on('terrain'),
  onTap: on('tap'),
  onCommand: on('cmd'),
  onRetarget: on('retarget'),
  onStimulate: on('stimulate'),
  sendSpikes: (list) => ipcRenderer.send('spikes', list),
  sendTelemetry: (snapshot) => ipcRenderer.send('telemetry', snapshot),

  // brain renderer
  onSpikes: on('spikes'),
  stimulate: (req) => ipcRenderer.send('stimulate', req),

  // connected recording dashboard
  onTelemetry: on('telemetry'),
  sendDashboardCommand: (command) => ipcRenderer.send('dashboard-command', command),
});
