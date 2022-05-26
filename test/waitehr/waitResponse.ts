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
