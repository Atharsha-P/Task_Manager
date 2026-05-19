import { useEffect, useMemo, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const STATUSES = ['Planned', 'In Progress', 'Complete'];
const STORAGE_KEY = 'task-manager-auth';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiPath(path) {
  return `${API_BASE_URL}${path}`;
}

const defaultForm = {
  title: '',
  description: '',
  dueDate: '',
  status: 'Planned',
};

function loadAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function statusIndex(status) {
  return STATUSES.indexOf(status);
}

function nextStatus(currentStatus) {
  const index = statusIndex(currentStatus);
  return STATUSES[Math.min(index + 1, STATUSES.length - 1)];
}

function formatDate(value) {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'No due date'
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function App({ googleClientId }) {
  const [auth, setAuth] = useState(() => loadAuth());
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(Boolean(auth?.token));
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!auth?.token) {
      return;
    }

    let ignore = false;

    async function restoreSession() {
      try {
        const response = await fetch(apiPath('/api/auth/me'), {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const payload = await response.json();
        if (ignore) {
          return;
        }

        setAuth((current) => ({ ...current, user: payload.user }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: auth.token, user: payload.user }));
        await loadTasks(auth.token);
      } catch {
        if (!ignore) {
          signOut();
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      ignore = true;
    };
  }, []);

  async function loadTasks(token) {
    const response = await fetch(apiPath('/api/tasks'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Unable to load tasks');
    }

    const payload = await response.json();
    setTasks(payload.tasks || []);
  }

  // Helper to safely parse JSON responses (returns null for empty bodies)
  async function safeParseJson(response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  const summary = useMemo(() => {
    const counts = STATUSES.reduce(
      (accumulator, status) => ({ ...accumulator, [status]: tasks.filter((task) => task.status === status).length }),
      {},
    );

    return {
      total: tasks.length,
      planned: counts['Planned'] || 0,
      inProgress: counts['In Progress'] || 0,
      complete: counts['Complete'] || 0,
      completionRate: tasks.length ? Math.round(((counts['Complete'] || 0) / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (filter === 'All') {
      return tasks;
    }

    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  function persistAuth(nextAuth) {
    setAuth(nextAuth);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
  }

  function signOut() {
    setAuth(null);
    setTasks([]);
    setForm(defaultForm);
    setFilter('All');
    localStorage.removeItem(STORAGE_KEY);
    setMessage('Signed out');
  }

  async function handleGoogleSuccess(credentialResponse) {
    if (!credentialResponse?.credential) {
      setMessage('Google sign-in did not return a credential');
      return;
    }

    setBusy(true);
    setMessage('Signing you in...');

    try {
      const response = await fetch(apiPath('/api/auth/google'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const payload = await safeParseJson(response);

      if (!response.ok) {
        throw new Error(payload?.message || response.statusText || 'Google sign-in failed');
      }

      const nextAuth = {
        token: payload?.token,
        user: payload?.user,
      };

      persistAuth(nextAuth);
      await loadTasks(nextAuth.token);
      setMessage(`Welcome back, ${payload.user.name}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setMessage('Google rejected this origin. In Google Cloud Console, add http://localhost:5173 to Authorized JavaScript origins for this client ID, then restart the frontend.');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!auth?.token) {
      setMessage('Please sign in first');
      return;
    }

    if (!form.title.trim()) {
      setMessage('Task title is required');
      return;
    }

    setBusy(true);
    setMessage('Creating task...');

    try {
      const response = await fetch(apiPath('/api/tasks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await safeParseJson(response);

      if (!response.ok) {
        throw new Error(payload?.message || response.statusText || 'Task creation failed');
      }

      setTasks((current) => [payload?.task, ...current]);
      setForm(defaultForm);
      setFilter('All');
      setMessage('Task created');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(taskId, status) {
    if (!auth?.token) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(apiPath(`/api/tasks/${taskId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ status }),
      });
      const payload = await safeParseJson(response);

      if (!response.ok) {
        throw new Error(payload?.message || response.statusText || 'Could not update task');
      }

      setTasks((current) => current.map((task) => (task._id === payload?.task?._id ? payload.task : task)));
      setMessage(`Task moved to ${status}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && auth?.token) {
    return (
      <div className="shell center-stage">
        <div className="loader-card">
          <span className="eyebrow">Loading workspace</span>
          <h1>Reconnecting your task board</h1>
          <p>Restoring your session and pulling the latest cards.</p>
        </div>
      </div>
    );
  }

  if (!auth?.token) {
    return (
      <div className="shell auth-shell">
        <div className="backdrop backdrop-one" />
        <div className="backdrop backdrop-two" />

        <main className="auth-layout">
          <section className="hero-card">
            <span className="eyebrow">Task command center</span>
            <h1>Plan less. Move faster. Keep every task visible.</h1>
            <p>
              Sign in with Google and use a fast, interactive task board to create work, track progress, and finish
              with clarity.
            </p>

            <div className="feature-grid">
              <article>
                <strong>Live task flow</strong>
                <span>Move tasks between planned, active, and complete states.</span>
              </article>
              <article>
                <strong>Clean focus</strong>
                <span>Filter the board instantly and keep only what matters in view.</span>
              </article>
              <article>
                <strong>Google sign-in</strong>
                <span>Authenticate quickly without creating a separate account.</span>
              </article>
            </div>
          </section>

          <section className="login-card">
            <span className="eyebrow">Get started</span>
            <h2>Sign in to unlock your task dashboard</h2>
            <p>Use the same Google client ID on the frontend and backend.</p>

            {googleClientId ? (
              <div className="login-button-wrap">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>
            ) : (
              <div className="config-warning">
                Add VITE_GOOGLE_CLIENT_ID to the client environment to enable login.
              </div>
            )}

            <div className="config-warning">
              If you see invalid_client or no registered origin, the Google OAuth client needs http://localhost:5173 in Authorized JavaScript origins.
            </div>

            {message ? <div className="status-banner">{message}</div> : null}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="shell app-shell">
      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />

      <header className="topbar">
        <div>
          <span className="eyebrow">Task dashboard</span>
          <h1>Welcome, {auth.user?.name || 'builder'}</h1>
          <p>Track the work that matters and keep your backlog moving.</p>
        </div>

        <div className="user-chip">
          {auth.user?.picture ? <img src={auth.user.picture} alt="User avatar" /> : null}
          <div>
            <strong>{auth.user?.name}</strong>
            <span>{auth.user?.email}</span>
          </div>
          <button type="button" className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="stats-grid">
          <article className="stat-card">
            <span>Total tasks</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="stat-card">
            <span>Planned</span>
            <strong>{summary.planned}</strong>
          </article>
          <article className="stat-card">
            <span>In progress</span>
            <strong>{summary.inProgress}</strong>
          </article>
          <article className="stat-card accent-card">
            <span>Completion rate</span>
            <strong>{summary.completionRate}%</strong>
          </article>
        </section>

        <section className="content-grid">
          <form className="panel task-form" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Create task</span>
                <h2>Capture new work instantly</h2>
              </div>
              <button type="submit" className="primary-button" disabled={busy}>
                Add task
              </button>
            </div>

            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Launch the marketing sprint"
              />
            </label>

            <label>
              Notes
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add context, blockers, or a short checklist"
                rows="5"
              />
            </label>

            <div className="split-grid">
              <label>
                Due date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>

              <label>
                Starting status
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {message ? <div className="status-banner">{message}</div> : null}
          </form>

          <section className="panel task-board">
            <div className="panel-heading board-heading">
              <div>
                <span className="eyebrow">Task list</span>
                <h2>Move work forward</h2>
              </div>

              <div className="filter-row">
                {['All', ...STATUSES].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`filter-chip ${filter === status ? 'active' : ''}`}
                    onClick={() => setFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="task-list">
              {visibleTasks.length ? (
                visibleTasks.map((task) => {
                  const currentIndex = statusIndex(task.status);
                  const progress = Math.round(((currentIndex + 1) / STATUSES.length) * 100);
                  const isDone = task.status === 'Complete';

                  return (
                    <article key={task._id} className={`task-card ${isDone ? 'done' : ''}`}>
                      <div className="task-card-top">
                        <div>
                          <span className={`status-pill status-${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {task.status}
                          </span>
                          <h3>{task.title}</h3>
                        </div>

                        <select value={task.status} onChange={(event) => updateStatus(task._id, event.target.value)}>
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      {task.description ? <p>{task.description}</p> : <p className="muted">No notes added yet.</p>}

                      <div className="task-meta">
                        <span>Due {formatDate(task.dueDate)}</span>
                        <span>{progress}% complete</span>
                      </div>

                      <div className="progress-track" aria-hidden="true">
                        <span style={{ width: `${progress}%` }} />
                      </div>

                      <button type="button" className="secondary-button" onClick={() => updateStatus(task._id, nextStatus(task.status))}>
                        {task.status === 'Complete' ? 'Already complete' : `Mark as ${nextStatus(task.status)}`}
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">
                  <h3>No tasks in this view</h3>
                  <p>Create a new card or change the filter to see other work.</p>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;