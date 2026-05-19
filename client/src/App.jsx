import { useEffect, useMemo, useState } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

const STATUSES = ['Planned', 'In Progress', 'Complete'];
const auth = getAuth();
const db = getFirestore();

const defaultForm = {
  title: '',
  description: '',
  dueDate: '',
  status: 'Planned',
};

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

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(defaultForm);

  // Listen to auth state and load tasks when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Load tasks for this user
          const tasksRef = collection(db, 'tasks');
          const q = query(tasksRef, where('userId', '==', firebaseUser.uid));

          const unsubscribeTasks = onSnapshot(
            q,
            (snapshot) => {
              const loadedTasks = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
              }));
              setTasks(loadedTasks);
            },
            (error) => {
              setMessage(`Error loading tasks: ${error.message}`);
            }
          );

          return unsubscribeTasks;
        } catch (error) {
          setMessage(`Error setting up tasks listener: ${error.message}`);
        }
      } else {
        setTasks([]);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const summary = useMemo(() => {
    const counts = STATUSES.reduce(
      (accumulator, status) => ({
        ...accumulator,
        [status]: tasks.filter((task) => task.status === status).length,
      }),
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

  async function signIn() {
    setBusy(true);
    setMessage('Signing you in...');

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setMessage('Signed in successfully');
    } catch (error) {
      setMessage(`Sign-in failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    firebaseSignOut(auth).catch((error) => {
      setMessage(`Sign out failed: ${error.message}`);
    });
    setForm(defaultForm);
    setFilter('All');
    setMessage('Signed out');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) {
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
      const tasksRef = collection(db, 'tasks');
      await addDoc(tasksRef, {
        ...form,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm(defaultForm);
      setFilter('All');
      setMessage('Task created');
    } catch (error) {
      setMessage(`Task creation failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(taskId, status) {
    if (!user) {
      return;
    }

    setBusy(true);

    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { status, updatedAt: serverTimestamp() });
      setMessage(`Task moved to ${status}`);
    } catch (error) {
      setMessage(`Update failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="shell center-stage">
        <div className="loader-card">
          <span className="eyebrow">Loading</span>
          <h1>Connecting to your task board</h1>
          <p>Setting up Firebase and loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (!user) {
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
                <strong>Firebase-powered</strong>
                <span>Your tasks are synced and secure with Firebase Firestore.</span>
              </article>
            </div>
          </section>

          <section className="login-card">
            <span className="eyebrow">Get started</span>
            <h2>Sign in to unlock your task dashboard</h2>

            <div className="login-button-wrap">
              <button type="button" className="primary-button" onClick={signIn} disabled={busy}>
                {busy ? 'Signing in...' : 'Sign in with Google'}
              </button>
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
          <h1>Welcome, {user.displayName || 'builder'}</h1>
          <p>Track the work that matters and keep your backlog moving.</p>
        </div>

        <div className="user-chip">
          {user.photoURL ? <img src={user.photoURL} alt="User avatar" /> : null}
          <div>
            <strong>{user.displayName || user.email}</strong>
            <span>{user.email}</span>
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
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
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
                    <article key={task.id} className={`task-card ${isDone ? 'done' : ''}`}>
                      <div className="task-card-top">
                        <div>
                          <span className={`status-pill status-${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {task.status}
                          </span>
                          <h3>{task.title}</h3>
                        </div>

                        <select
                          value={task.status}
                          onChange={(event) => updateStatus(task.id, event.target.value)}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      {task.description ? (
                        <p>{task.description}</p>
                      ) : (
                        <p className="muted">No notes added yet.</p>
                      )}

                      <div className="task-meta">
                        <span>Due {formatDate(task.dueDate)}</span>
                        <span>{progress}% complete</span>
                      </div>

                      <div className="progress-track" aria-hidden="true">
                        <span style={{ width: `${progress}%` }} />
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => updateStatus(task.id, nextStatus(task.status))}
                      >
                        {task.status === 'Complete'
                          ? 'Already complete'
                          : `Mark as ${nextStatus(task.status)}`}
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