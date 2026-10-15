import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from './server.js';
import Product from './models/productModel.js';

// Use MongoDB from docker-compose (local) or service container (CI)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
}, 30000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}, 10000);

describe('Inscription et Authentification', () => {
  it('1. Inscription - POST /api/v1/users renvoie 201 et les infos utilisateur', async () => {
    const res = await supertest(app)
      .post('/api/v1/users')
      .send({ name: 'Jean Test', email: 'jean@test.com', password: 'password123' })
      .expect(201);

    expect(res.body).toMatchObject({
      message: 'Registration successful. Welcome!',
      name: 'Jean Test',
      email: 'jean@test.com',
    });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('isAdmin');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('2. Connexion - POST /api/v1/users/login renvoie 200 + cookie JWT', async () => {
    await supertest(app)
      .post('/api/v1/users')
      .send({ name: 'Jean Test', email: 'jean@test.com', password: 'password123' });

    const res = await supertest(app)
      .post('/api/v1/users/login')
      .send({ email: 'jean@test.com', password: 'password123' })
      .expect(200);

    expect(res.body).toMatchObject({
      message: 'Login successful.',
      name: 'Jean Test',
      email: 'jean@test.com',
    });
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('jwt=');
  });

  it('3. Échec login - mauvais mot de passe renvoie 401', async () => {
    await supertest(app)
      .post('/api/v1/users')
      .send({ name: 'Jean Test', email: 'jean@test.com', password: 'password123' });

    const res = await supertest(app)
      .post('/api/v1/users/login')
      .send({ email: 'jean@test.com', password: 'wrongpassword' })
      .expect(401);

    expect(res.body.message).toContain('Invalid password');
  });
});

describe('Produits', () => {
  it('4. GET /api/v1/products retourne les produits avec pagination', async () => {
    const userId = new mongoose.Types.ObjectId();

    await Product.insertMany([
      {
        user: userId,
        name: 'Produit A',
        image: '/images/a.jpg',
        description: 'Description A',
        brand: 'Brand A',
        category: 'Cat A',
        price: 29.99,
        countInStock: 10,
      },
      {
        user: userId,
        name: 'Produit B',
        image: '/images/b.jpg',
        description: 'Description B',
        brand: 'Brand B',
        category: 'Cat B',
        price: 49.99,
        countInStock: 5,
      },
    ]);

    const res = await supertest(app)
      .get('/api/v1/products')
      .expect(200);

    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('total', 2);
    expect(res.body.products).toHaveLength(2);
    expect(res.body.products[0]).toHaveProperty('name');
    expect(res.body.products[0]).toHaveProperty('price');
  });

  it('5. GET /api/v1/products retourne 404 quand vide', async () => {
    const res = await supertest(app)
      .get('/api/v1/products')
      .expect(404);

    expect(res.body.message).toContain('Products not found');
  });
});

describe('Middleware et routes', () => {
  it('6. GET /healthz retourne ok', async () => {
    const res = await supertest(app)
      .get('/healthz')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('7. GET / retourne Hello World en dev', async () => {
    const res = await supertest(app)
      .get('/')
      .expect(200);

    expect(res.text).toBe('Hello, World!');
  });

  it('8. Route inexistante retourne 404', async () => {
    const res = await supertest(app)
      .get('/api/v1/inexistant')
      .expect(404);

    expect(res.body.message).toContain('Not Found');
  });
});
