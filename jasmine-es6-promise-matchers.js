/**
 * Matcher helpers for tests involving Promises.
 *
 * <p>Note that this library depends on the ES6Promise polyfill library.
 * @see https://github.com/jakearchibald/es6-promise
 *
 * @example
 * expect(promise).toBeRejected();
 * expect(promise).toBeRejectedWith(someValue);
 * expect(promise).toBeResolved();
 * expect(promise).toBeResolvedWith(someValue);
 */

(typeof window === 'undefined' ? global : window).JasminePromiseMatchers = new function() {

  var windowOrGlobal = typeof window === 'undefined' ? global : window;
  var OriginalPromise;

  /**
   * Install the JasminePromiseMatchers library.
   */
  this.install = function() {
    OriginalPromise = windowOrGlobal.Promise;

    // Polyfill if necessary for browsers like Phantom JS.
    windowOrGlobal.Promise = windowOrGlobal.Promise || ES6Promise.Promise;
  };

  /**
   * Uninstall the JasminePromiseMatchers library.
   */
  this.uninstall = function() {
    windowOrGlobal.Promise = OriginalPromise;
  };

  var PROMISE_STATE = {
    REJECTED: 'rejected',
    RESOLVED: 'resolved',
  };

  function isError(value) {
    return value instanceof Error;
  }

  function isAsymmetric(value) {
    return value.asymmetricMatch instanceof Function;
  }

  var verifyData = function(actualData, expectedData, isNegative) {
    if (expectedData === undefined) {
      return { pass: true };
    }

    if (isError(actualData) && isError(expectedData)) {
        actualData = String(actualData);
        expectedData = String(expectedData);
    }

    var state;

    if (isAsymmetric(expectedData)) {
      state = {
        pass: expectedData.asymmetricMatch(actualData),
        message: 'Expected "' + actualData + '"' + (isNegative ? ' not' : '') + ' to contain "' + expectedData + '"'
      };
    } else {
      state = {
        pass: actualData === expectedData,
        message: 'Expected "' + actualData + '"' + (isNegative ? ' not' : '') + ' to be "' + expectedData + '"'
      };
    }

    if (isNegative) {
      state.pass = !state.pass;
    }

    return state;
  };

  var verifyState = function(actualState, expectedState, isNegative) {
    const state = {
      pass: actualState === expectedState,
      message: 'Expected promise ' + (isNegative ? 'not ' : '') + 'to be ' + expectedState
    };

    if (isNegative) {
      state.pass = !state.pass;
    }

    return state;
  };

  var noop = function() {};
  noop.fail = function () {
    throw new Error('Failed');
  };

  // Helper method to verify expectations and return a Jasmine-friendly info-object
  var verifyPromiseExpectations = function(done, promise, expectedState, expectedData, isNegative) {
    done = done || noop;
    function verify(promiseState) {
      return function(data) {
        var testData;
        var testState = verifyState(promiseState, expectedState, isNegative);

        var failed;
        var message;

        if (!testState.pass) {
          failed = true;
          message = testState.message;
        } else {
          testData = verifyData(data, expectedData, isNegative);
          failed = !testData.pass && !isNegative;
          message = testData.message;
        }

        if (failed) {
          done.fail(message);
          return;
        }

        done();
      }
    }

    promise.then(
      verify(PROMISE_STATE.RESOLVED),
      verify(PROMISE_STATE.REJECTED)
    );

    return { pass: true };
  };

  // Install the matchers
  beforeEach(function() {
    function createMatcher(state, compareData) {
      function matcher(isNegative) {
        if (compareData) {
          return function (promise, expectedData, done) {
            return verifyPromiseExpectations(done, promise, state, expectedData, isNegative);
          }
        }

        return function (promise, done) {
          return verifyPromiseExpectations(done, promise, state, undefined, isNegative);
        }
      }

      var positive = matcher(false);
      var negative = matcher(true);

      return {
        compare: positive,
        negativeCompare: negative
      };
    }

    jasmine.addMatchers({
      toBeRejected: function() {
        return createMatcher(PROMISE_STATE.REJECTED);
      },
      toBeRejectedWith: function() {
        return createMatcher(PROMISE_STATE.REJECTED, true);
      },
      toBeResolved: function() {
        return createMatcher(PROMISE_STATE.RESOLVED);
      },
      toBeResolvedWith: function() {
        return createMatcher(PROMISE_STATE.RESOLVED, true);
      },
    });
  });
}();