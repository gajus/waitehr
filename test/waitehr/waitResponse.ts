import {
  setTimeout as delay,
} from 'node:timers/promises';
import test from 'ava';
import fastify from 'fastify';
import * as sinon from 'sinon';
import {
  waitResponse,
} from '../../src/waitResponse';

test('waits for expected response', async (t) => {
  const app = fastify();

  app.get('/', (request, reply) => {
    void reply.send('OK');
  });

  const address = await app.listen(0);

  t.true(await waitResponse(address, {
    statusCodes: [
      200,
    ],
  }));
});

test('fails if unexpected status code', async (t) => {
  const app = fastify();

  app.get('/', (request, reply) => {
    void reply.send('OK');
  });

  const address = await app.listen(0);

  t.false(await waitResponse(address, {
    interval: 1_000,
    statusCodes: [
      404,
    ],
    timeout: 1_000,
  }));
});

test('retries when expectation fails', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    void reply.send('OK');
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  t.false(await waitResponse(address, {
    interval: 100,
    statusCodes: [
      404,
    ],
    timeout: 300,
  }));

  t.true(responseHandler.callCount > 2);
});

test('fails if timeout', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    setTimeout(() => {
      void reply.send('OK');
    }, 2_000);
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  t.false(await waitResponse(address, {
    timeout: 1_000,
  }));
});

test('delays first request', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    void reply.send('OK');
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  const responsePromise = waitResponse(address, {
    initialDelay: 200,
  });

  await delay(100);

  t.false(responseHandler.called);

  t.true(await responsePromise);
});

test('does not follow redirect', async (t) => {
  const app = fastify();

  app.get('/', (request, reply) => {
    void reply.redirect(303, '/bar');
  });

  const responseHandler = sinon.spy((request, reply) => {
    void reply.send('OK');
  });

  app.get('/bar', responseHandler);

  const address = await app.listen(0);

  await waitResponse(address, {
    followRedirect: false,
    timeout: 100,
  });

  t.false(responseHandler.called);
});

test('follows redirects', async (t) => {
  const app = fastify();

  app.get('/', (request, reply) => {
    void reply.redirect(303, '/bar');
  });

  const responseHandler = sinon.spy((request, reply) => {
    void reply.send('OK');
  });

  app.get('/bar', responseHandler);

  const address = await app.listen(0);

  t.true(await waitResponse(address, {
    followRedirect: true,
  }));

  t.true(responseHandler.called);
});

test('follows at most maxRedirects', async (t) => {
  const app = fastify();

  app.get('/', (request, reply) => {
    void reply.redirect(303, '/bar');
  });

  app.get('/bar', (request, reply) => {
    void reply.redirect(303, '/baz');
  });

  app.get('/baz', (request, reply) => {
    void reply.send('OK');
  });

  const address = await app.listen(0);

  t.false(await waitResponse(address, {
    followRedirect: true,
    maxRedirects: 1,
    timeout: 100,
  }));
});

test('waits for expected response to hit the success threshold', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    void reply.send('OK');
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  t.true(await waitResponse(address, {
    interval: 50,
    successThreshold: 10,
  }));

  t.is(responseHandler.callCount, 10);
});

test('waits at most requestTimeout', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    setTimeout(() => {
      reply.send('OK');
    }, 200);
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  t.false(await waitResponse(address, {
    interval: 50,
    requestTimeout: 100,
    timeout: 500,
  }));

  t.is(responseHandler.callCount, 5);
});

test('includes headers in request', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    t.is(request.headers['x-foo'], 'bar');

    void reply.send('OK');
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  t.true(await waitResponse(address, {
    headers: [
      'x-foo: bar',
    ],
  }));
});

test('sends waitehr user-agent header', async (t) => {
  const app = fastify();

  const responseHandler = sinon.spy((request, reply) => {
    t.is(request.headers['user-agent'], 'waitehr');

    void reply.send('OK');
  });

  app.get('/', responseHandler);

  const address = await app.listen(0);

  t.true(await waitResponse(address, {}));
});
