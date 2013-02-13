/*
 * http-test.js: Tests for basic HTTP server(s).
 *
 * (C) 2011, Nodejitsu Inc.
 * MIT LICENSE
 *
 */

var assert = require('assert'),
    http = require('http'),
    vows = require('vows'),
    request = require('request'),
    director = require('../../../lib/director'),
    helpers = require('../helpers'),
    handlers = helpers.handlers,
    macros = helpers.macros;

function assertBark(uri) {
  return macros.assertGet(
    9090,
    uri,
    'hello from (bark)'
  );
}

vows.describe('director/http').addBatch({
  "An instance of director.http.Router": {
    "instantiated with a Routing table": {
      topic: new director.http.Router({
        '/hello': {
          get: handlers.respondWithId
        }
      }),
      "should have the correct routes defined": function (router) {
        assert.isObject(router.routes.hello);
        assert.isFunction(router.routes.hello.get);
      },
      "the dispatch() method": {
        "/hello": function(router) {
          var req = { method: 'GET', headers: {}, url: '/hello' };
          var writeHeadCalled, endCalled;
          var res = {
            writeHead: function(statusCode, headers) {
              writeHeadCalled = true;
              assert.equal(statusCode, 200);
              assert.deepEqual(headers, { 'Content-Type': 'text/plain' });
            },
            end: function() {
              endCalled = true;
            }
          };
          assert.isTrue(router.dispatch(req, res));
          assert.isTrue(writeHeadCalled);
          assert.isTrue(endCalled);
        },
        "not found": function(router) {
          var req = { method: 'GET', url: '/404' };
          var res = {};
          assert.isTrue(router.dispatch(req, res));
        }
      },
      "when passed to an http.Server instance": {
        topic: function (router) {
          router.get(/foo\/bar\/(\w+)/, handlers.respondWithId);
          router.get(/foo\/update\/(\w+)/, handlers.respondWithId);
          router.path(/bar\/bazz\//, function () {
            this.get(/(\w+)/, handlers.respondWithId);
          });
          router.get(/\/foo\/wild\/(.*)/, handlers.respondWithId);
          router.get(/(\/v2)?\/somepath/, handlers.respondWithId);

          helpers.createServer(router)
            .listen(9090, this.callback);
        },
        "a request to foo/bar/bark": assertBark('foo/bar/bark'),
        "a request to foo/update/bark": assertBark('foo/update/bark'),
        "a request to bar/bazz/bark": assertBark('bar/bazz/bark'),
        "a request to foo/bar/bark?test=test": assertBark('foo/bar/bark?test=test'),
        "a request to foo/wild/bark": assertBark('foo/wild/bark'),
        "a request to foo/%RT": macros.assert404(9090, 'foo/%RT'),
        "a request to /v2/somepath": macros.assertGet(
          9090,
          '/v2/somepath',
          'hello from (/v2)'
        )
      }
    }
  }
}).export(module);
