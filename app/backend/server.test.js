import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from './server.js';
import Product from './models/productModel.js';
import User from './models/userModel.js';
import fs from 'fs';
import path from 'path';
import { MAX_UPLOAD_SIZE } from './routes/uploadRoutes.js';

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

describe('Upload d\'images (T6)', () => {
  const PNG_BYTES = Buffer.from('89504e470d0a1a0a', 'hex');
  const uploadedFiles = [];

  // Register a user and return its JWT cookie; optionally promote it to admin
  const getCookie = async (isAdmin) => {
    const email = isAdmin ? 'admin@test.com' : 'user@test.com';
    const res = await supertest(app)
      .post('/api/v1/users')
      .send({ name: 'Test', email, password: 'password123' });
    if (isAdmin) {
      await User.updateOne({ email }, { isAdmin: true });
    }
    return res.headers['set-cookie'];
  };

  const trackUpload = (res) => {
    if (res.body.imageUrl) {
      uploadedFiles.push(path.join('uploads', path.basename(res.body.imageUrl)));
    }
  };

  beforeAll(() => {
    fs.mkdirSync('uploads', { recursive: true });
  });

  afterAll(() => {
    uploadedFiles.forEach((file) => fs.rmSync(file, { force: true }));
  });

  it('9. Upload sans cookie renvoie 401', async () => {
    await supertest(app)
      .post('/api/v1/upload')
      .attach('image', PNG_BYTES, { filename: 'a.png', contentType: 'image/png' })
      .expect(401);
  });

  it('10. Upload par un utilisateur non admin renvoie 401', async () => {
    const cookie = await getCookie(false);
    await supertest(app)
      .post('/api/v1/upload')
      .set('Cookie', cookie)
      .attach('image', PNG_BYTES, { filename: 'a.png', contentType: 'image/png' })
      .expect(401);
  });

  it('11. Upload admin d\'un type non image renvoie 400', async () => {
    const cookie = await getCookie(true);
    const res = await supertest(app)
      .post('/api/v1/upload')
      .set('Cookie', cookie)
      .attach('image', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(400);

    expect(res.body.message).toContain('Images only');
  });

  it('12. Upload admin d\'un fichier trop gros renvoie 413', async () => {
    const cookie = await getCookie(true);
    await supertest(app)
      .post('/api/v1/upload')
      .set('Cookie', cookie)
      .attach('image', Buffer.alloc(MAX_UPLOAD_SIZE + 1), { filename: 'big.png', contentType: 'image/png' })
      .expect(413);
  });

  it('13. Upload admin d\'un PNG renvoie 201 avec un nom généré par le serveur', async () => {
    const cookie = await getCookie(true);
    const res = await supertest(app)
      .post('/api/v1/upload')
      .set('Cookie', cookie)
      .attach('image', PNG_BYTES, { filename: 'photo-originale.png', contentType: 'image/png' })
      .expect(201);
    trackUpload(res);

    expect(res.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(res.body.imageUrl).not.toContain('photo-originale');
  });

  it('14. Un .html déclaré image/png est stocké en .png (pas de stored XSS)', async () => {
    const cookie = await getCookie(true);
    const res = await supertest(app)
      .post('/api/v1/upload')
      .set('Cookie', cookie)
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.html', contentType: 'image/png' })
      .expect(201);
    trackUpload(res);

    expect(res.body.imageUrl).toMatch(/\.png$/);

    const served = await supertest(app).get(res.body.imageUrl).expect(200);
    expect(served.headers['content-type']).toBe('image/png');
  });
});
