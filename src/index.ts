
import { Router } from '@vertx/web';

import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from '@effect-ts/core/Function';
import { HttpServer } from '@vertx/core';

const managedServer = (router: Router) => M.makeExit_(
  T.effectAsync<unknown, never, HttpServer>((cb) => {
    vertx
      .createHttpServer()
      .requestHandler(router)
      .listen(8080)
      .then((server) => {
        cb(T.succeed(server))
      })
  }),
  (server) => T.effectAsync<unknown, never, void>((cb) => {
    server.close().then(() => {
        cb(T.unit)
      })
  })
)

const server = M.gen(function * (_) {
  const { runFiber } = yield* _(T.runtime<T.DefaultEnv>())

  const router = Router.router(vertx);

  router.get("/json").handler(ctx => {
    pipe(
      T.succeedWith(() => {
        ctx.response()
          .putHeader("Content-Type", "application/json")
          .end(JSON.stringify({ message: 'Hello from effect running in Vert.x' }));
      }),
      runFiber
    )
  });

  return yield* _(managedServer(router))
})

const rootFiber = pipe(
  M.useForever(server),
  T.runFiber
)

process.on("undeploy", (done) => {
  T.runPromise(F.interrupt(rootFiber)).then(() =>{
    done.complete()
  })
})