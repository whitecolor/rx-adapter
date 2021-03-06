(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
"use strict";

var Rx = typeof window !== "undefined" ? window['Rx'] : typeof global !== "undefined" ? global['Rx'] : null;
var Hot = require('rx-hot');
var RxJSHotAdapter = {
    adapt: function adapt(originStream, originStreamSubscribe) {
        if (this.isValidStream(originStream)) {
            return originStream;
        }
        return Hot.create(function (destinationObserver) {
            var originObserver = {
                next: function next(x) {
                    return destinationObserver.onNext(x);
                },
                error: function error(e) {
                    return destinationObserver.onError(e);
                },
                complete: function complete() {
                    return destinationObserver.onCompleted();
                }
            };
            var dispose = originStreamSubscribe(originStream, originObserver);
            return function () {
                if (typeof dispose === 'function') {
                    dispose.call(null);
                }
            };
        });
    },
    remember: function remember(observable) {
        return observable.shareReplay(1);
    },
    makeSubject: function makeSubject() {
        var stream = new Rx.Subject();
        var observer = {
            next: function next(x) {
                stream.onNext(x);
            },
            error: function error(err) {
                stream.onError(err);
            },
            complete: function complete(x) {
                stream.onCompleted();
            }
        };
        return { stream: stream, observer: observer };
    },
    isValidStream: function isValidStream(stream) {
        return typeof stream.subscribeOnNext === 'function' && typeof stream.onValue !== 'function';
    },
    streamSubscribe: function streamSubscribe(stream, observer) {
        var subscription = stream.subscribe(function (x) {
            return observer.next(x);
        }, function (e) {
            return observer.error(e);
        }, function (x) {
            return observer.complete(x);
        });
        return function () {
            subscription.dispose();
        };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RxJSHotAdapter;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"rx-hot":2}],2:[function(require,module,exports){
var Observable = require('rx').Observable
var _Proxy

if (typeof Proxy === 'function'){
  _Proxy = Proxy
} else {
  _Proxy = function (target, handler) {
    this.__target = target
    this.__handler = handler
    this.isHot = true
  }
  _Proxy.prototype = Object.keys(Observable.prototype)
    .filter(function (key) {
      return typeof Observable.prototype[key] === 'function'
    })
    .reduce(function (proto, key) {
      proto[key] = function() {
        return this.__handler.get(this.__target, key).apply(this, arguments)
      }
      return proto
    }, {})
}

function makeHot(stream) {
  if (Observable.isObservable(stream)) {
    return new _Proxy(stream, {
      get: function (stream, method) {
        if (method === 'isHot'){
          return true
        }
        return function () {
          if ((method === 'subscribe' || method === 'forEach')) {
            if (!stream.___shared){
              stream.___shared = stream.share()
            }
            stream = stream.___shared
          }
          return makeHot(stream[method].apply(stream, arguments))
        }
      }
    })
  }
  return stream
}

var shared = Object.keys(Observable).filter(function (key) {
  return typeof Observable[key] === 'function'
}).reduce(function (shared, method) {
  shared[method] = function () {
    return makeHot(Observable[method].apply(Observable, arguments))
  }
  return shared
}, {})

shared.combineLatestObj = function (obj) {
  var sources = [];
  var keys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key.replace(/\$$/, ''));
      sources.push(obj[key]);
    }
  }
  return shared.combineLatest(sources, function () {
    var argsLength = arguments.length;
    var combination = {};
    for (var i = argsLength - 1; i >= 0; i--) {
      combination[keys[i]] = arguments[i];
    }
    return combination;
  })
}

shared.combine = function (obj) {
  if (arguments.length === 1 && obj.constructor === Object) {
    return shared.combineLatestObj(obj)
  }
  return shared.combineLatest.apply(null, arguments)
}

shared.makeHot = makeHot
module.exports = shared
},{"rx":undefined}]},{},[1]);
