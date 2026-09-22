import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { NoteStore } from '../src/store.js';

// Integration tests exercise the real routes against a real file on disk.
// Slower than the unit tests, which is why CI runs them afterwards.
let dir: string;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'notes-'));
  app = createApp(new NoteStore(join(dir, 'notes.json')));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('the notes API', () => {
  it('reports healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('starts with no notes', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates makes the notes', async () => {
    const created = await request(app)
      .post('/api/notes')
      .send({ title: 'first', body: 'hello' });
    expect(created.status).toBe(201);

    const list = await request(app).get('/api/notes');
    expect(list.body).toHaveLength(1);

    const one = await request(app).get(`/api/notes/${created.body.id}`);
    expect(one.body.title).toBe('first');
  });

  it('refuses a note with no title', async () => {
    const res = await request(app).post('/api/notes').send({ body: 'orphan' });
    expect(res.status).toBe(400);
  });

  it('deletes a note', async () => {
    const created = await request(app).post('/api/notes').send({ title: 'bye' });
    expect((await request(app).delete(`/api/notes/${created.body.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/notes/${created.body.id}`)).status).toBe(404);
  });

  it('404s an unknown note', async () => {
    expect((await request(app).get('/api/notes/does-not-exist')).status).toBe(404);
  });
});
