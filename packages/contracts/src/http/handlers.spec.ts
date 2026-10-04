import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { identity } from './access.js';
import { routeBuilder } from './builder.js';
import { defineErrorModel } from './errors.js';
import type { Endpoints, HandlerInput, HandlerOutput, RoutePrincipal } from './handlers.js';

const model = defineErrorModel<string>({
  standard: {},
  envelopeOf: (code) => z.object({ error: z.object({ code: z.literal(code) }) }),
});
const viewer = identity('viewer', {
  schemes: { read: [{ session: [] }], write: [{ session: [] }] },
  principal: z.object({ accountId: z.string() }),
});
const id = { name: 'id', in: 'path', required: true, schema: z.string() } as const;
const note = { name: 'note', in: 'query', required: false, schema: z.string() } as const;
const base = routeBuilder(model).version(1);

const find = base.identity(viewer).defineRoute({
  method: 'get',
  path: '/things/{id}',
  operationId: 'findThing',
  parameters: [id, note],
  responses: {
    200: {
      description: 'The thing.',
      content: { 'application/json': { schema: z.object({ name: z.string() }) } },
    },
  },
});

const rename = base
  .identity(viewer)
  .optionalAuth()
  .defineRoute({
    method: 'put',
    path: '/things/{id}',
    operationId: 'renameThing',
    parameters: [id],
    requestBody: { content: { 'application/json': { schema: z.object({ name: z.string() }) } } },
    responses: {
      200: {
        description: 'Renamed.',
        content: { 'application/json': { schema: z.object({ name: z.string() }) } },
      },
      202: { description: 'Accepted.' },
    },
  });

const open = base.public().defineRoute({
  method: 'get',
  path: '/ping',
  operationId: 'ping',
  responses: { 204: { description: 'Pong.' } },
});

describe('what a handler receives and owes', () => {
  it('types the input from the declaration, principal included', () => {
    type Input = HandlerInput<typeof find>;
    expectTypeOf<Input['params']>().toEqualTypeOf<{ readonly id: string }>();
    expectTypeOf<Input['query']>().toEqualTypeOf<{ readonly note?: string }>();
    expectTypeOf<Input['body']>().toEqualTypeOf<undefined>();
    expectTypeOf<Input['principal']>().toEqualTypeOf<{ accountId: string }>();
    expectTypeOf<RoutePrincipal<typeof rename>>().toEqualTypeOf<{ accountId: string } | null>();
    expectTypeOf<RoutePrincipal<typeof open>>().toEqualTypeOf<undefined>();
    expect(open.method).toBe('get');
    expect(find.access.kind).toBe('identified');
  });

  it('owes the body of a single success, and { status, body } for several', () => {
    expectTypeOf<HandlerOutput<typeof find>>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<HandlerOutput<typeof rename>>().toEqualTypeOf<
      | { readonly status: 200; readonly body: { name: string } }
      | { readonly status: 202; readonly body: undefined }
    >();
    expectTypeOf<HandlerOutput<typeof open>>().toEqualTypeOf<undefined>();
    expect(rename.responses[202].description).toBe('Accepted.');
  });
});

describe('Endpoints', () => {
  interface Block {
    readonly findThing: typeof find;
    readonly ping: typeof open;
  }

  it('asks for one method per operation id, and names the one that is missing', () => {
    class Complete implements Endpoints<Block> {
      public readonly findThing = (): Promise<{ name: string }> => Promise.resolve({ name: 'x' });

      public readonly ping = (): Promise<undefined> => Promise.resolve(undefined);
    }
    // @ts-expect-error `ping` is declared and not implemented
    class Missing implements Endpoints<Block> {
      public readonly findThing = (): Promise<{ name: string }> => Promise.resolve({ name: 'x' });
    }

    expect(new Complete().findThing).toBeTypeOf('function');
    expect(new Missing().findThing).toBeTypeOf('function');
  });

  it('refuses a wrong return', () => {
    class Wrong implements Endpoints<Block> {
      // @ts-expect-error the body of findThing is { name: string }
      public readonly findThing = (): Promise<{ wrong: number }> => Promise.resolve({ wrong: 1 });

      public readonly ping = (): Promise<undefined> => Promise.resolve(undefined);
    }

    expect(new Wrong().ping).toBeTypeOf('function');
  });
});
