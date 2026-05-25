const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Url = require('../src/models/Url');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Url.deleteMany({});
});

describe('URL Shortener API', () => {
  it('should create a short URL for a valid original URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.google.com' });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('originalUrl', 'https://www.google.com');
    expect(res.body).toHaveProperty('shortUrl');
    expect(res.body).toHaveProperty('clicks', 0);
  });

  it('should return 400 for an invalid URL', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'invalid-url' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return the existing short URL if the same URL is submitted twice', async () => {
    const firstRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.example.com' });

    const secondRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.example.com' });

    expect(firstRes.statusCode).toEqual(201);
    expect(secondRes.statusCode).toEqual(200);
    expect(firstRes.body.shortUrl).toEqual(secondRes.body.shortUrl);
  });

  it('should redirect to the original URL and increment clicks', async () => {
    // 1. Create a short URL
    const createRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.github.com' });
    const shortUrl = createRes.body.shortUrl;

    // 2. Access the short URL (expect redirect)
    const redirectRes = await request(app).get(`/${shortUrl}`);
    expect(redirectRes.statusCode).toEqual(302);
    expect(redirectRes.headers.location).toEqual('https://www.github.com');

    // 3. Verify clicks incremented
    const statsRes = await request(app).get(`/api/stats/${shortUrl}`);
    expect(statsRes.statusCode).toEqual(200);
    expect(statsRes.body.clicks).toEqual(1);
  });

  it('should return 404 for a non-existent short URL', async () => {
    const res = await request(app).get('/nonexistent123');
    expect(res.statusCode).toEqual(404);
  });
});
