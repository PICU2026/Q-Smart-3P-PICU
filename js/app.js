import { render } from 'https://cdn.jsdelivr.net/npm/preact@10.23.1/+esm';
import { html, useState, useEffect, Toaster, Spinner, go } from './ui.js';
import * as ui from './ui.js';
import { store } from './store.js';
import { devStatus } from './logic.js';
import { Login, Forgot } from './screens/login.js';
import { Home } from './screens/home.js';
import { Start } from './screens/start.js';
import { Assess } from './screens/assess.js';
import { Result, Parts } from './screens/result.js';
import { Devices } from './screens/devices.js';
import { Alerts } from './screens/alerts.js';
import { Report } from './screens/report.js';
import { Dashboard } from './screens/dashboard.js';
import { Patients, Admit } from './screens/patients.js';

function parseHash() {
  const raw = ui.currentPath || '/';
  const [path, qs] = raw.split('?');
  const query = {}; new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
  const parts = path.split('/').filter(Boolean);
  return { path: '/' + (parts[0] || ''), id: parts[1], query };
}

function App() {
  const [route, setRoute] = useState(parseHash());
  const [user, setUser] = useState(undefined);
  const [alerts, setAlerts] = useState(0);
  useEffect(() => { const f = () => { setRoute(parseHash()); scrollTo(0, 0); }; addEventListener('picu-route', f); return () => removeEventListener('picu-route', f); }, []);
  useEffect(() => { store.session().then((u) => setUser(u || null)).catch(() => setUser(null)); }, []);
  const refreshAlerts = () => store.listActiveDevices().then((ds) => setAlerts(ds.filter((d) => ['soon', 'exp'].includes(devStatus(d))).length)).catch(() => {});
  useEffect(() => { if (user) refreshAlerts(); }, [user, route.path]);

  if (user === undefined) return html`<${Spinner} />`;
  if (route.path === '/forgot') return html`<${Forgot} />`;
  if (!user) return html`<${Login} onLogin=${setUser} />`;
  const logout = async () => { await store.signOut(); setUser(null); go('/', true); };
  const props = { user, alerts, query: route.query, params: { id: route.id }, onLogout: logout, onChanged: refreshAlerts };
  const screens = {
    '/': Home, '/login': Home, '/start': Start, '/assess': Assess, '/result': Result, '/parts': Parts, '/devices': Devices,
    '/alerts': Alerts, '/report': Report, '/dashboard': Dashboard, '/patients': Patients, '/admit': Admit
  };
  const Screen = screens[route.path] || Home;
  return html`<${Screen} key=${route.path + (route.id || '') + JSON.stringify(route.query)} ...${props} /><${Toaster} />`;
}

render(html`<${App} />`, document.getElementById('app'));
